---
title: "为什么需要专门的 LLM 推理引擎？"
level: L2
status: draft
topics: ["推理系统", "计算与执行", "数据、存储与状态"]
---

# 0. 为什么需要专门的 LLM 推理引擎？

> **L2 · Engineering** · **初稿** · 推理系统 / 技术发展史。本文介绍 vLLM 与 SGLang 为什么出现；具体参数和实验留给后续小节。


上篇[《为啥需要 MLSys？》](/modules/00-systems-thinking)里，我们用 Hugging Face Transformers 加载模型，再套上一层 FastAPI。一个人调用的时候很正常，同事们一起来试，服务却开始排队。领导听完只回了一句：

> “不就是让更多人一起用吗？你们搞技术的优化一下嘛。”

`model.generate(...)` 可以生成一次回答，却不负责其他用户什么时候开始、并发请求的缓存放在哪里，或者已经算过的上下文该不该留下。

vLLM 和 SGLang 要处理的正是这些问题。理解它们之前，先看看推理请求到底给机器添了什么麻烦。

## 从模型调用到服务：多出来的是什么？

单次模型调用很规矩：输入一段文字，得到一段输出。换成线上服务，请求就不会排着整齐的队伍来了。

有人只输入一句“你好”，有人贴上几千个 Token 的文档；有人要简短回答，有人希望模型接着写几千个 Token。生成长度往往事先无法确定。自回归语言模型通常每轮生成一个 Token，同时保留历史 Token 对应的 Key 和 Value，供后续计算复用。这部分状态叫 KV Cache，会随着上下文增长。

假设 A 正在生成长文，B 和 C 刚刚到达。调度器要决定能不能让它们加入现有 Batch；显存管理器得为新增的 KV Cache 腾地方；如果 B 和 C 使用了同一段 System Prompt，运行时还可以考虑复用前缀计算。

任务调度、内存分配和缓存复用都是熟悉的系统问题。但 LLM 请求的状态会在生成过程中不断变化，执行时间和资源用量也无法预先确定。推理服务必须一边运行，一边调整安排。

## Orca：为什么一个 Batch 不该从头等到尾？

在 ChatGPT 发布之前，研究人员就已经开始研究生成式 Transformer 的在线服务。

2022 年，首尔大学与 FriendliAI 的研究人员在 OSDI 发表 *Orca: A Distributed Serving System for Transformer-Based Generative Models*。论文关注了一个实际限制：如果一个 Batch 的成员只能等整批请求执行完才能更新，长请求就可能拖住后面等待的请求。<sup>[[1]](#ref-orca)</sup>

假设一个 Batch 有三个请求：

| 请求 | 还需要生成的 Token |
| --- | ---: |
| A | 10 |
| B | 100 |
| C | 500 |

A 只剩 10 个 Token，很快就能结束；C 还要生成很久。如果请求集合始终固定，新来的 D 便无法及时接替 A。

Orca 提出了 **Iteration-level Scheduling（迭代级调度）**。每轮生成完成后，系统可以移走已结束的请求，并在资源容量允许时加入新请求。

![固定 Batch 与 Orca 迭代级调度对比：固定 Batch 要等本批次完成才接纳新请求；迭代级调度允许移除完成请求并在容量允许时加入新请求。](/images/essays/serving-tuning/orca-iteration-scheduling.svg)

<small>图 1 · 调度粒度的变化。示例只展示请求集合如何变化，不对应真实的 Token 数量或迭代耗时。</small>

论文还提出 Selective Batching：Transformer 的不同操作不一定适合同一种批处理方式。Orca 的迭代级调度与后来广泛采用的 Continuous Batching（连续批处理）有直接的技术关联。

不过，调度器愿意让 D 进来，显存也未必装得下它。每个请求都带着逐渐增长的 KV Cache，能容纳多少请求还取决于这些缓存怎么分配。

## vLLM：原来 KV Cache 也需要“分页”

2023 年，UC Berkeley 的研究人员在为 LMSYS 的 Vicuna Demo 和 Chatbot Arena 提供推理服务。访问量增加后，早期基于 Hugging Face Transformers 的后端逐渐成为瓶颈。研究团队的 GPU 数量有限，增加机器又要花钱。

同年 6 月，他们公开发布了 vLLM。它最初最有代表性的设计是 **PagedAttention**，思路借鉴了操作系统的虚拟内存；相关论文后来发表于 SOSP 2023。<sup>[[2]](#ref-vllm-blog)</sup><sup>[[3]](#ref-vllm-paper)</sup>

模型权重载入后，占用的显存相对稳定。KV Cache 不一样：每个请求的输入长度不同，生成长度又很难提前准确预测。如果为每个请求预留一大块连续空间，没用上的部分会浪费；如果只分配眼前需要的空间，又要处理扩容和碎片。

PagedAttention 把 KV Cache 划分成固定大小的 Block，再记录逻辑 Block 到物理 Block 的映射。请求 A 的缓存在逻辑上有顺序，在物理显存中却不必挨着存放。

![PagedAttention 的逻辑 KV Block 和物理显存 Block：请求 A 的 A0、A1、A2、A3 在逻辑上连续，在显存中分别映射到不连续的 P3、P6、P1、P5。](/images/essays/serving-tuning/vllm-paged-kv-cache.svg)

<small>图 2 · KV Cache 的逻辑顺序不等于物理布局。实际实现还包含 Block 分配、映射、共享和回收等机制。</small>

这和虚拟内存分页很像：多了一层映射，物理空间的安排就灵活得多。vLLM 还通过共享 Block、引用计数和 Copy-on-Write，在适用场景下减少 KV Cache 的重复存储。

早期论文在特定模型、工作负载和延迟条件下，报告了相比 Orca、FasterTransformer 等系统 **2～4 倍的吞吐量改善**。这个数字不等于单个 GPU Kernel 快了 2～4 倍。内存管理做得更好，GPU 才能容纳更多正在执行的请求，系统也更容易组织有效的 Batch。<sup>[[3]](#ref-vllm-paper)</sup>

Block 映射和管理有自己的开销。并发请求变多后，计算资源也可能成为新瓶颈；吞吐提高时，单个请求的延迟未必会下降。这些都是后面调优时还要面对的问题。

## SGLang：为什么相同的 Prompt 要再算一遍？

再看另一种浪费：重复的 Prefill 计算。

假设我们给编程助手写了一段很长的 System Prompt，两名学生使用它问不同的问题：

```text
请求 A：
  [相同的 System Prompt，约 2000 Tokens]
  请解释 Python 的 GIL。

请求 B：
  [相同的 System Prompt，约 2000 Tokens]
  请解释 Python 的装饰器。
```

如果把两个请求完全独立地执行，前面约 2000 个相同的 Token 就可能被重复计算。对应的 KV Cache 本来有机会复用。

2023 年 12 月，UC Berkeley、Stanford 等机构的研究人员发布了 SGLang 论文预印本；成果发表于 NeurIPS 2024，题为 *SGLang: Efficient Execution of Structured Language Model Programs*。SGLang 与 vLLM 的早期研究团队有人员交集，但最初的切入点有所不同。<sup>[[4]](#ref-sglang)</sup>

SGLang 原本想解决的是语言模型**程序**如何表达和执行。一个任务可能涉及多次模型调用、条件分支、并行生成候选答案，或者生成符合格式要求的 JSON。调用之间常有共享上下文，应用如果只是一遍遍请求独立的模型 API，就很难把这些关系交给推理引擎利用。

早期 SGLang 提供了 Frontend Language 和 Runtime。前者描述生成操作、控制流与并行，后者负责执行，同时处理缓存复用和结构化生成加速。

其中的 **RadixAttention** 用 Radix Tree（基数树）管理 KV Cache 的共享前缀。Token 前缀完全匹配、相关缓存又仍然有效时，后续请求可以跳过重复的 Prefill 计算。

![RadixAttention 前缀复用示意：两条请求共享相同的角色设定、任务规则、输出格式前缀；随后分别计算 GIL 与装饰器问题的后缀。](/images/essays/serving-tuning/sglang-radix-prefix-cache.svg)

<small>图 3 · 相同 Token 前缀可以复用已计算的 KV Cache；不同后缀仍需要独立计算。示意图不代表具体的 Radix Tree 节点布局。</small>

两个请求共享的是前缀的计算状态，各自的后缀和最终回答仍须独立生成。实际收益取决于前缀是否匹配、缓存是否保留，以及当前显存压力。SGLang 的早期工作还使用压缩有限状态机等技术加速结构化输出。<sup>[[4]](#ref-sglang)</sup>

这里说的是项目**最初研究的问题**。今天 vLLM 也支持 Prefix Caching，SGLang 同样要处理分页 KV Cache、批处理和 GPU 执行。用“vLLM 管显存，SGLang 管前缀”概括现在的两个框架，会漏掉很多东西。

## 只有这两个项目吗？

vLLM、SGLang 之外也有其他选择，只是面向的场景不同。

| 项目 | 背景或主要定位 | 帮助我们看到的系统问题 |
| --- | --- | --- |
| **Hugging Face Transformers** | 通用模型开发与执行库 | “能调用模型”与“能持续提供服务”不是同一层问题 |
| **Orca** | OSDI 2022，生成式 Transformer 服务研究 | 生成长度不同，为什么需要更细粒度的调度 |
| **NVIDIA FasterTransformer** | 针对 Transformer 的高性能推理实现 | 算子、执行引擎与硬件优化 |
| **Hugging Face TGI** | 开源模型的生产部署与服务 | Batching、Streaming 与部署接口 |
| **vLLM** | UC Berkeley / LMSYS，2023 | 显存管理如何限制并发和吞吐 |
| **SGLang** | UC Berkeley、Stanford 等，2023—2024 | 程序结构与共享前缀如何帮助复用计算 |
| **TensorRT-LLM** | NVIDIA 推理软件栈 | 如何结合特定硬件和运行时优化推理 |
| **llama.cpp** | 轻量化、本地模型推理生态 | 量化、低依赖与不同硬件平台之间的取舍 |

这些项目并不都处于同一层抽象。Hugging Face Transformers 首先是模型开发与执行库，Orca 是系统研究工作；其他项目则从不同方向提供推理执行或服务能力。

例如，TensorRT-LLM 与 NVIDIA GPU 的软件栈结合得更紧密，讨论的是怎样利用特定硬件优化推理。llama.cpp 更重视量化、低依赖和硬件兼容性。如果目标是在笔记本上跑一个量化模型，关心的问题自然不同于多 GPU 在线服务。<sup>[[6]](#ref-llamacpp)</sup>

Hugging Face 的 Text Generation Inference（TGI）曾是开源模型生产部署的重要选择，提供 Batching、Streaming 等能力。Hugging Face 已在 2025 年末将它转入维护模式，并在 Inference Endpoints 文档中推荐 vLLM、SGLang 等替代方案。<sup>[[5]](#ref-tgi)</sup>

不同项目的功能也在不断重合。没有脱离模型、硬件和请求负载的统一性能排名；实际选型还得看并发量、延迟要求以及部署成本。

## 不同的起点，逐渐汇合的问题

把 Orca、vLLM 和 SGLang 放在一起，可以看到三个不同的研究切入点。

![Orca、vLLM 与 SGLang 三个项目的研究问题对照：Orca 讨论迭代级调度，vLLM 讨论 KV Cache 分页管理，SGLang 讨论语言模型程序执行与前缀复用。](/images/essays/serving-tuning/inference-engine-research-map.svg)

<small>图 4 · 不同研究切入点，共同面对在线推理的资源约束；这不是项目继承关系或完整功能对比。</small>

Orca 关注请求长短不一时怎么调度；vLLM 关注动态增长的 KV Cache 怎样占用有限显存；SGLang 从语言模型程序及共享前缀里寻找可以省掉的计算。

图中对照的是研究问题，没有表达项目代码的继承关系。如今这些框架的功能已经大量重合，调度、显存管理和缓存复用也会相互影响。

例如，增加并发数量可能提高吞吐，却也会让请求争用计算资源。保留共享前缀能够减少 Prefill，但那些 KV Cache 还得占着显存。PagedAttention 降低了内存管理中的浪费，却不能保证每个请求都更快。

所以，推理引擎里的参数很难有一套通用最优值。输入输出长度、并发量或硬件一变，同一项优化的效果就可能不同。

## 接下来：先判断“快”是什么意思

后面七个小节，我们会以 vLLM 和 SGLang 为主要案例，依次研究性能测量、显存预算、并发调度、前缀缓存、投机解码、量化和按工作负载调参。具体实现和配置会放到相关小节再讲。

回到办公室里那台只有一张 GPU 的电脑。我们可以换成 vLLM 或 SGLang，启动一个兼容 OpenAI API 的推理服务。可是领导再次说“这玩意儿怎么还是慢”的时候，该查哪个指标？

第一个 Token 等了多久？后续 Token 输出得是否流畅？多人同时用时，系统的总吞吐量又变了多少？它们描述的是不同的性能现象，有时甚至会朝相反的方向变化。

下一节先把这些指标弄清楚，再讨论怎么调。

[**推理服务性能测量**](./01-what-is-fast.md)。

## 文献与项目参考

1. <span id="ref-orca"></span>Yu et al., *Orca: A Distributed Serving System for Transformer-Based Generative Models*, OSDI 2022。[论文与会议页面](https://www.usenix.org/conference/osdi22/presentation/yu)。
2. <span id="ref-vllm-blog"></span>Kwon et al., *vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention*, 2023-06-20。[vLLM 发布博客](https://vllm.ai/blog/2023-06-20-vllm)。
3. <span id="ref-vllm-paper"></span>Kwon et al., *Efficient Memory Management for Large Language Model Serving with PagedAttention*, SOSP 2023。[论文](https://arxiv.org/abs/2309.06180)。
4. <span id="ref-sglang"></span>Zheng et al., *SGLang: Efficient Execution of Structured Language Model Programs*, arXiv 预印本 2023-12、NeurIPS 2024。[论文](https://arxiv.org/abs/2312.07104)；[NeurIPS 会议页面](https://proceedings.neurips.cc/paper_files/paper/2024/hash/724be4472168f31ba1c9ac630f15dec8-Abstract-Conference.html)。
5. <span id="ref-tgi"></span>Hugging Face，*Text Generation Inference*。[官方文档与维护状态说明](https://huggingface.co/docs/inference-endpoints/engines/tgi)。
6. <span id="ref-llamacpp"></span>ggml-org，[llama.cpp 项目仓库](https://github.com/ggml-org/llama.cpp)。
7. NVIDIA，[TensorRT-LLM 文档](https://nvidia.github.io/TensorRT-LLM/)。
8. 本文四张机制示意图为 Hello MLSys 原创 SVG，依据对应论文中的设计思想绘制；不复用论文插图。
