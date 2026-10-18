---
title: "推理服务性能测量"
level: L2
status: draft
topics: ["推理系统", "性能与测量", "成本与系统决策"]
---

# 1. 推理服务性能测量

> **L2 · Engineering** · **初稿** · 推理系统 / 性能与测量。本文关注如何评价推理服务的表现；具体的瓶颈定位和参数选择不在这里展开。

上一篇文章谈到了 Orca、vLLM 和 SGLang。我们已经知道，能调用模型和能把模型作为服务提供给别人，是两回事。

假设实验室有一台 GPU 服务器，我们在上面部署了 vLLM。模型成功加载，HTTP 接口也通了。起初只有几个人使用，没遇到什么问题。后来用的人多了，抱怨也跟着来了。

> “为什么每次都要等好久才能开始回答？”
>
> “我这里还好啊，就是回答到一半经常卡一下。”
>
> “你们这个服务只能给几个人用吗？人多一点就不行了？”

三个人都觉得服务慢，但说的不是一回事：有人等首字，有人嫌输出断断续续，还有人觉得服务器带不动那么多用户。

这时打开 `nvidia-smi`，就算看到 GPU 利用率达到 100%，也不能拿它当作问题已经解决的证据。GPU 很忙，只说明它很忙。

在动手调参之前，我们得先弄清楚：**推理服务的“快”，究竟指什么？**

## 用户究竟在等待什么？

先看只有一个用户的情况。用户发送问题，模型开始生成回答。使用流式输出（Streaming）时，客户端会陆续收到内容，不必等整段回答完成。请求大致经历这样的过程：

![流式推理请求的时间线，依次展示 TTFT、ITL、TPOT 和端到端延迟。](/images/essays/serving-tuning/serving-request-timeline.svg)

<small>图 1 · 从客户端观察请求的时间线。阶段长度仅作示意，不对应实际耗时。</small>

自回归模型通常逐个生成 Token。Prefill 阶段处理输入 Prompt，计算相应的中间状态；Decode 阶段利用已有状态继续生成。图中的排队和网络传输并不属于这两个计算阶段，却同样会让用户等待。

沿着这条时间线，可以分别观察首 Token 的等待、后续输出的停顿，以及整个回答的耗时。

### 第一个 Token 什么时候出现？

从客户端发出请求，到收到第一个有效输出 Token，这段时间叫 **Time to First Token（TTFT）**。它决定了聊天界面在用户按下发送键后，要多久才开始出现回答。

TTFT 容易被误当成 Prefill 耗时。其实它还可能包含网络传输、请求处理和服务端排队。一个很长的 Prompt 需要较多计算，可能让首 Token 来得晚；服务器忙时，请求排在队列里，也会让首 Token 来得晚。用户看到的都是“半天没动静”，排查方向却完全不同。

### 为什么回答到一半会卡顿？

首 Token 出来了，后面的内容也未必顺畅。流式输出时，相邻 Token 到达客户端的时间间隔叫 **Inter-Token Latency（ITL）**。如果这些间隔忽长忽短，用户就可能看到文本写到一半突然停住。

要描述一次回答的平均生成速度，可以用 **Time Per Output Token（TPOT）**。常见算法是用首 Token 到最后一个 Token 的耗时，除以首 Token 之后生成的 Token 数量：

$$
TPOT=\frac{T_{\text{total}}-TTFT}{N_{\text{output}}-1}
$$

这里，$T_{\text{total}}$ 是整个请求的端到端延迟，$N_{\text{output}}$ 是输出 Token 数量；公式假设至少生成了两个 Token。

也就是把后续生成耗时平均到每个 Token 上。比如某次回答在首 Token 之后，相邻 Token 的到达间隔为：

```text
50ms → 50ms → 250ms → 50ms
```

这次请求的 TPOT 是 100ms，但中间那次 250ms 的停顿并没有消失。TPOT 能说明平均生成速度，ITL 的分布则能让我们看见这些波动。

还要留意测试工具的统计方式。流式接口的一次返回事件未必只包含一个 Token，因而不能不加区分地把事件间隔当作 Token 间隔。<sup>[[1]](#ref-vllm-benchmark)</sup>

### 整个回答需要多久？

如果用户要等到整段回答生成完毕，关心的就是 **End-to-End Latency（端到端延迟）**：从发出请求到收到完整回答的时间。按上面的流式测量口径，有：

$$
T_{\text{total}}=TTFT+(N_{\text{output}}-1)\times TPOT
$$

回答“你好”只要几个 Token，写一篇长报告可能要生成几千个 Token。即使用同一个模型，二者的完成时间也很难放在一起比较。报告延迟时，输入和输出长度不能省略。

以上指标主要按流式输出解释。如果服务直到生成结束才一次性返回内容，客户端的首次响应时间也就不再等于模型生成首 Token 的时间。

## 一个人很快，不代表服务器很快

假设这台 GPU 只服务一个人时，每秒能生成 50 个 Token。如果十个人一起发来请求呢？

服务器可以依次处理：正在生成的那个请求可能很流畅，后面九个人却得排队。也可以把多个请求放在一起执行，争取让 GPU 在相同时间内完成更多工作，只是单个用户分到的计算资源可能随之变化。

到这里，单请求生成速度已经不够用了。

### 机器每秒完成多少工作？

所谓 **Throughput（吞吐量）**，就是单位时间内完成的工作量。普通 HTTP 服务经常用每秒完成请求数（Requests Per Second，RPS）描述它。

推理服务也能统计 RPS。不过，一句“你好”和几千 Token 的论文分析，都只算一个请求，实际消耗的计算资源却差得很远。所以我们还会统计输入 Token 吞吐量、输出 Token 吞吐量。两者涉及不同的计算过程，不能只写一个笼统的 tokens/s。

即使只看输出，也有两种不同的速度：单个请求的生成速度，以及整台服务器的总输出吞吐量。假设同一台服务器有下面两组结果：

| 测试场景 | 单请求生成速度 | 服务器总输出吞吐量 |
| --- | ---: | ---: |
| 只有 1 个请求 | 50 tokens/s | 50 tokens/s |
| 同时处理 8 个请求 | 15 tokens/s | 120 tokens/s |

*这是为了说明指标差异而编造的教学数据，并非真实 Benchmark；第二行假设八个请求的生成过程充分重叠。*

八个请求同时执行时，单个用户的速度从 50 降到 15 tokens/s，但服务器总输出吞吐量从 50 升到了 120 tokens/s。

如果用户最在乎自己回答得快不快，这次改变不算改善；如果目标是让有限的 GPU 服务更多人，这组结果可能反而更合适。两种判断都成立，前提是先说清楚要优化什么。

现代推理引擎需要在 GPU 利用率、总吞吐和请求等待时间之间作取舍。因此，看到一个很高的 tokens/s 数字，最好先问清它统计的是谁的速度，以及对应的输入输出长度和负载条件。<sup>[[2]](#ref-nvidia-benchmark)</sup>

## 为什么平均性能不能代表用户体验？

假设我们测了 100 个请求的 TTFT：其中 90 个是 100ms，另外 10 个却长达 5 秒。

算一下平均值：

$$
\frac{90\times0.1+10\times5}{100}=0.59\,\mathrm{s}
$$

平均 TTFT 只有 590ms。这个数字既不能代表那 90 个很快收到回答的用户，也不能代表另外 10 个等了 5 秒的用户。如果只看平均值，后面这批慢请求很容易被忽略。

在线服务很早就遇到过同样的问题。

### 一个来自互联网时代的老问题

2013 年，Google 的 Jeffrey Dean 和 Luiz André Barroso 在 *The Tail at Scale* 中讨论了大规模在线服务的尾延迟问题。<sup>[[3]](#ref-tail-at-scale)</sup>

搜索引擎的一次查询可能同时访问许多服务器，再汇总结果。绝大多数服务器及时返回还不够，只要有一个关键子任务拖得太久，整次查询就可能跟着变慢。

可以用一个简化的概率例子感受这种规模效应：一次查询需要等待 100 个相互独立的子任务，每个子任务有 95% 的概率按时完成，那么所有子任务都按时完成的概率是

$$
0.95^{100}\approx0.59\%
$$

真实系统的子任务未必相互独立，也不一定必须等所有任务完成。这个模型只说明：单个节点上不常见的慢请求，在大规模系统中可能变成日常麻烦。

延迟分布里那些特别慢的请求，通常被称作 **Tail Latency（尾延迟）**。要描述这部分请求，可以借用统计学里的百分位数。

### 为什么工程师关心 P95？

统计学中的 **Percentile（百分位数）**，做法很直接：把请求按延迟从小到大排列。P95 延迟为 1 秒，可以理解为大约 95% 的请求在 1 秒内完成。P50 对应中位数，P99 则看得更靠近最慢的那一端。

前面的 100 个请求，平均 TTFT 是 590ms，P95 TTFT 却是 5 秒。两个数字都没算错，只是回答了不同的问题。

![100 个请求按 TTFT 排序：前 90 个为 0.1 秒，后 10 个为 5 秒；平均值为 0.59 秒，P95 为 5 秒。](/images/essays/serving-tuning/tail-latency-percentiles.svg)

<small>图 2 · 平均值与 P95 描述了同一批请求的不同侧面。数据为教学示例，柱高不按耗时等比例绘制。</small>

P95 不是 SRE 发明的，它本来就是统计学概念。大型互联网服务的性能监控经常使用百分位数，Google 的 Site Reliability Engineering（SRE，站点可靠性工程）实践也强调过平均延迟掩盖尾部问题的风险。<sup>[[4]](#ref-sre-monitoring)</sup>

P95 也有局限：它不告诉我们最慢的 5% 到底有多慢，更不解释延迟为什么发生。样本很少时，P95、P99 这样的高百分位数还可能不稳定。

在 LLM 推理服务里，请求的差异尤其明显。有人只发一句问候，有人粘贴整篇论文；有人一到就能执行，有人得等其他请求释放资源。输入长度、排队和资源竞争，都可能让少数请求慢得格外突出。

所以，平均 TTFT 下降，不代表每个用户都更早看到首 Token；平均 TPOT 改善，也不代表生成过程不会卡顿。

如果一种配置平均延迟较低，却在高负载下出现明显长尾；另一种配置平均延迟略高，但绝大多数请求比较稳定，我们该选哪个？光看测试指标还不够，得先知道用户能接受什么水平的服务。

## 更快，还是足够快？

比如，实验室准备长期开放这个接口，可以提出这样一个要求：

> 在预期的使用负载下，至少 95% 的请求应该在 2 秒内收到第一个 Token。

这种可以检验的服务目标，叫 **Service Level Objective（SLO，服务等级目标）**。<sup>[[5]](#ref-sre-slo)</sup> 这里的 2 秒和 95% 只是教学示例，不是行业统一标准。

聊天机器人可能特别在意首 Token 到达时间和后续输出是否流畅；夜间批量处理文档，则可能更关心用现有 GPU 处理完多少任务。两种场景对“足够快”的要求本来就不同。

有了 SLO，便可以进一步比较：在满足这些要求时，服务器还能承担多少请求？

## 吞吐量越高，服务能力就越强吗？

假设两台服务器运行相同模型，接受相同的工作负载。各测一分钟，结果如下：

| 指标 | 服务器 A | 服务器 B |
| --- | ---: | ---: |
| 完成请求数 | 1200 | 900 |
| 满足延迟要求的请求数 | 600 | 855 |
| 请求吞吐量 | 20 req/s | 15 req/s |
| 满足要求的请求比例 | 50% | 95% |

*以上是教学用的假设数据，并非真实 Benchmark。*

A 每秒完成 20 个请求，比 B 的 15 个更多。不过，A 只有一半请求满足延迟要求；B 虽然完成得少，达标的请求反倒更多。

如果只统计满足要求的已完成请求，得到的就是一种 **Goodput（有效吞吐量）**。在这个例子里，可以直接用达标请求数除以测试时间：

$$
\mathrm{Goodput}=\frac{\text{满足延迟要求的完成请求数}}{\text{测量时间}}
$$

算出来，A 的 Goodput 是 10 req/s，B 是 14.25 req/s。按照这份服务目标，B 的有效吞吐量反而更高。

![A 每分钟完成 1200 个请求、其中 600 个达标；B 完成 900 个、其中 855 个达标。B 的有效吞吐量更高。](/images/essays/serving-tuning/throughput-vs-goodput.svg)

<small>图 3 · 总吞吐量与达标请求吞吐量的区别。两台服务器假设采用相同的 SLO 和工作负载，并非实测结果。</small>

Goodput 并非 LLM 独有的概念。在计算机网络中，它也用来区分真正有效交付的工作和原始传输量。

2024 年发表于 OSDI 的 **DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving**，将 Goodput 作为 LLM 推理服务的重要优化目标。<sup>[[6]](#ref-distserve)</sup>

DistServe 的评估口径更严格：在规定比例的请求同时满足 TTFT 和 TPOT 约束时，寻找系统能够持续承受的最大请求到达速率，并按 GPU 数量归一化比较资源效率。

它和上面按一分钟统计达标请求数的例子不是同一个定义，但关心的都是有限资源下的有效服务能力。

比较 Goodput 时必须使用相同的服务目标。把延迟要求放宽，自然会有更多请求算作达标；即使延迟合格，也不代表回答正确、完整或有用。模型质量、失败率和资源成本仍需另行衡量。

## 怎样证明我们的服务真的变快了？

读到这里，再遇到“某推理引擎比另一款快 50%”的说法，就应该多问一句：它是在什么条件下测出来的？

数字本身可能没错，只是测试负载未必像我们平时遇到的请求。

### 我们到底在测试什么？

同一台 GPU、同一个模型，处理的请求却可能差别很大：

- 简单问答：输入一句话，生成几十个 Token。
- 长文档总结：输入几千个 Token，生成一段长篇摘要。

两者都算一个请求，计算量却不同。请求是陆续到达还是突然涌入、不同请求是否共享上下文，也会影响结果。

这组输入、输出和请求到达方式，构成了我们所说的 **Workload（工作负载）**。评价 LLM 服务时，至少要交代输入长度、输出长度和请求到达方式。如果很多请求共享前缀，还要注意 Prefix Cache 可能带来的差异。单独一个跑分，说明不了这些条件。

### 并发数不等于请求到达速率

“并发 16”也经常被误读。服务器同时处理 16 个请求，不等于每秒收到 16 个请求，更不等于每秒完成 16 个请求。

这里有三个不同的量：

- **请求到达速率（Request Rate）**：客户端尝试以多快的速度发送请求。
- **并发数（Concurrency）**：某一时刻有多少请求尚未完成。
- **请求吞吐量（Request Throughput）**：服务器单位时间内实际完成多少请求。

假设请求持续以 10 req/s 到达，服务器却只能完成 8 req/s。没有拒绝或限流的话，未完成的请求会越积越多，排队时间也可能把 TTFT 拖长。反过来，请求来得太稀疏，即使 GPU 还有余力，测试也未必能测出它的处理上限。

压测时，请求到达速率和完成吞吐量都得记录。

### 做一次小型 Benchmark

vLLM 和 SGLang 都有在线服务 Benchmark 工具，可以模拟请求并记录吞吐量、TTFT、TPOT 等指标。<sup>[[1]](#ref-vllm-benchmark)</sup><sup>[[7]](#ref-sglang-benchmark)</sup>

我们做一个小实验：模型、硬件和服务配置保持不变，只改变请求到达速率。先在符合运行条件的 GPU 服务器上启动 vLLM：

```bash
vllm serve Qwen/Qwen2.5-0.5B-Instruct
```

在另一个终端运行：

```bash
vllm bench serve \
  --backend openai \
  --base-url http://127.0.0.1:8000 \
  --model Qwen/Qwen2.5-0.5B-Instruct \
  --dataset-name random \
  --random-input-len 512 \
  --random-output-len 128 \
  --num-prompts 100 \
  --request-rate 1 \
  --percentile-metrics ttft,tpot,itl \
  --metric-percentiles 50,95,99
```

这组参数参考了 vLLM 官方 Benchmark CLI。各版本参数可能变化，运行前应查看 `vllm bench serve --help`。它构造目标输入长度 512 Tokens、目标输出长度 128 Tokens 的随机请求，按平均每秒一个请求的速率发送。

注意，`--request-rate 1` 约束的是请求**到达**速率，实际到达间隔可能不均匀，也不保证服务器每秒完成一个请求。模型还可能提前停止生成，所以要检查实际输出长度。

把 `--request-rate` 依次换成 0.5、2、4，观察完成请求吞吐量、TTFT 和 TPOT 如何变化。这些只是示例档位，不代表服务器真实的处理上限。

运行前可以猜一猜：

> 随着请求到达速率增加，服务器吞吐量会一直线性增长吗？用户看到第一个 Token 的等待时间又会怎样变化？

负载较轻时，增加请求可能让 GPU 工作得更充分；负载继续增加，瓶颈出现后，总吞吐量未必还能同比例增长，等待时间反倒可能拉长。但拐点在哪里，得实测才知道。

这里总共只有 100 个请求，适合初步观察趋势，不适合稳定估计 P99。有限次压测也不能直接当作生产环境的长期容量结论；要判断稳态表现，还需要更多样本和重复实验。

如果想统计满足延迟要求的请求，vLLM Benchmark 还提供 `--goodput` 参数，可以设置 TTFT、TPOT 等约束。SLO 要在测试前定好，不能看完结果再改标准。<sup>[[1]](#ref-vllm-benchmark)</sup>

### 什么样的比较才公平？

调优前后跑出了两组数字，至少要核对模型、硬件、输入输出长度分布、请求到达方式和缓存命中情况。还要分清测的是引擎内部执行时间，还是包含 HTTP 服务开销的客户端响应时间。

测试并不一定要复现生产环境的所有细节。为了研究输入长度对 TTFT 的影响，就可以固定其他条件，只改变输入长度。这样的实验能回答一个明确的问题，但不能凭它推断系统在所有负载下的表现。

Benchmark 的作用是提供证据。结论能说到哪一步，取决于实验到底测了什么。

## 回到那台 GPU

回到实验室里那三个抱怨。等首 Token 太久，先看 TTFT，分清是长 Prompt、排队还是别的开销；回答写到一半卡住，检查输出 Token 的间隔，别只看平均 TPOT；人一多就慢，则要把请求到达速率、完成吞吐量和延迟放在一起看。

如果接口要长期供人使用，还应该给出明确的服务目标。否则，即使调出了更高的吞吐量，也不清楚用户究竟有没有得到改善。

测量不会自动告诉我们该调哪个参数。它至少能让大家在争论“优化成功没有”时，拿出同一组可比较的数据，而不是各凭感觉。

## 文献与项目参考

1. <span id="ref-vllm-benchmark"></span>vLLM，*Benchmark CLI*。[官方 Benchmark 指南](https://docs.vllm.ai/en/latest/benchmarking/cli/)；[`vllm bench serve` 参数参考](https://docs.vllm.ai/en/latest/cli/bench/serve.html)。
2. <span id="ref-nvidia-benchmark"></span>NVIDIA，*LLM Inference Benchmarking: Fundamental Concepts*。[技术博客](https://developer.nvidia.com/blog/llm-benchmarking-fundamental-concepts/)。
3. <span id="ref-tail-at-scale"></span>Dean, J., & Barroso, L. A., *The Tail at Scale*, Communications of the ACM, 2013。[Google Research](https://research.google/pubs/the-tail-at-scale/)。
4. <span id="ref-sre-monitoring"></span>Google，*Site Reliability Engineering: Monitoring Distributed Systems*。[在线阅读](https://sre.google/sre-book/monitoring-distributed-systems/)。
5. <span id="ref-sre-slo"></span>Google，*Site Reliability Engineering: Service Level Objectives*。[在线阅读](https://sre.google/sre-book/service-level-objectives/)。
6. <span id="ref-distserve"></span>Zhong et al., *DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving*, OSDI 2024。[USENIX 会议页面](https://www.usenix.org/conference/osdi24/presentation/zhong-yinmin)；[论文](https://arxiv.org/abs/2401.09670)。
7. <span id="ref-sglang-benchmark"></span>SGLang，*Bench Serving Guide*。[官方文档](https://docs.sglang.ai/developer_guide/bench_serving)。

本文三张性能指标示意图为 Hello MLSys 原创 SVG，根据文中的教学数据绘制，不代表任何引擎的实际测试结果。

[返回本章目录](./index.md)
