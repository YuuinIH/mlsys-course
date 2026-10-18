---
title: "为什么需要专门的 LLM 推理引擎？"
level: L2
status: draft
topics: ["推理系统", "计算与执行", "数据、存储与状态"]
---

# 0. 为什么需要专门的 LLM 推理引擎？

> **L2 · Engineering** · **初稿** · 推理系统 / 技术发展史。本文介绍 vLLM 与 SGLang 为什么出现；具体参数和实验留给后续小节。

在[《为啥需要 MLSys？》](/modules/00-systems-thinking)里，我们已经试着用 Hugging Face Transformers 加载模型，再用 FastAPI 包装一个 HTTP 接口。一个人用的时候，模型回答得好好的；同事们一起点下发送，服务却开始排队。领导的要求并没有变复杂：

> “不就是让更多人一起用吗？你们搞技术的优化一下嘛。”

如果只需要让模型回答问题，我们已经有了 \`model.generate(...)\`。为什么还需要 vLLM 和 SGLang？它们到底替我们做了什么？

## 从模型调用到服务：多出来的是什么？

单次模型调用的目标很明确：给定输入，生成输出。但推理**服务**需要持续处理一批不断到达、彼此不同的请求。

有的人只输入一句“你好”，有的人贴来几千个 Token 的文档；有人生成几十个 Token 就结束，有人希望模型连续输出几千个 Token。请求的开始和结束时间并不同步。

对自回归语言模型而言，生成过程还具有一个特殊性质：模型通常每次生成下一个 Token，再进行下一轮计算。与此同时，它会保存历史 Token 对应的 Key、Value，以免重复计算。这部分状态就是 **KV Cache**，而且会随着上下文增长。

所以，服务端至少要回答三个问题：

- **调度：**谁先执行？哪些请求能一起组成 Batch？新的请求何时加入？
- **容量：**模型权重之外，如何让有限的显存容纳更多动态变化的 KV Cache？
- **复用：**多个请求包含相同的上下文时，之前算过的结果能否继续使用？

这听起来很像操作系统：有等待执行的任务、有有限的内存、也有需要管理生命周期的状态。大语言模型不是凭空发明了这些系统问题，而是用新的工作负载把它们重新摆在了我们面前。

## Orca：为什么一个 Batch 不该从头等到尾？

在 ChatGPT 发布之前，学术界就已经开始研究生成式 Transformer 的在线服务。

2022 年，首尔大学与 FriendliAI 的研究人员在 OSDI 发表了 **Orca: A Distributed Serving System for Transformer-Based Generative Models**。它指出，传统以完整请求为单位组织批处理的方式，不适合生成长度不确定的模型。<sup>[[1]](#ref-orca)</sup>

假设一个 Batch 里有三个请求：

| 请求 | 还需要生成的 Token |
| --- | ---: |
| A | 10 |
| B | 100 |
| C | 500 |

如果这个 Batch 的请求集合在执行期间不能改变，那么 A 早早结束之后，新来的 D 也可能必须等 C 结束才能加入下一批。

Orca 提出了 **Iteration-level Scheduling（迭代级调度）**：将一次生成迭代作为调度边界。在迭代之间，系统可以移走完成的请求，并在容量允许时加入新请求。

\`\`\`text
固定的请求级 Batch：
  [A, B, C] ──────────────── 等待这一批执行完 ──> [D, E, ...]

迭代级调度（简化示意）：
  第 1 轮  [A, B, C]
  第 N 轮  [B, C, D]   ← A 已结束，D 加入
  第 M 轮  [C, D, E]   ← B 已结束，E 加入
\`\`\`

Orca 还提出 **Selective Batching**，因为 Transformer 中不同操作适合的批处理方式并不相同。它的意义不只是“让 Batch 更大”，而是让调度能够适应请求的动态变化。后来常说的 **Continuous Batching（连续批处理）**，便与这条研究路线密切相关。

不过，能把新请求放进调度队列，不等于显存一定装得下它。每个请求还要存放自己的 KV Cache，而这部分内存的增长很难在请求到达时准确预测。

于是，下一个问题出现了：**GPU 还有计算能力，为什么系统却可能因为显存管理而无法接收更多请求？**

## vLLM：原来 KV Cache 也需要“分页”

2023 年，UC Berkeley 的研究人员正在帮助 LMSYS 为 Vicuna Demo 和 Chatbot Arena 提供推理服务。在线演示的访问量增加后，早期基于 Hugging Face Transformers 的后端成了瓶颈；对于 GPU 资源有限的研究团队，简单地增加服务器并不是一个轻松的选择。

2023 年 6 月，研究团队公开发布了 **vLLM**。它最初最具代表性的技术，是受到操作系统虚拟内存启发的 **PagedAttention**；相关论文随后发表于 SOSP 2023。<sup>[[2]](#ref-vllm-blog)</sup><sup>[[3]](#ref-vllm-paper)</sup>

为什么“分页”能帮到模型推理？

模型权重载入后，大小通常相对稳定；而请求的 KV Cache 不一样。输入长度不同，生成长度又可能提前不知道，运行过程中还会不断追加新的 Token。

一种朴素的做法是为请求预留足够大的连续显存，但这样容易发生浪费；如果动态扩展连续空间，又会遇到分配与碎片管理问题。

PagedAttention 的思路是把 KV Cache 分成固定大小的 **Block**，通过逻辑 Block 到物理 Block 的映射，避免要求每个请求的缓存都连续摆放在物理显存里。

\`\`\`text
Request A 的逻辑 KV Cache：
  [A0] → [A1] → [A2] → [A3]

实际物理 Block（示意）：
  [B1] [A2] [空] [A0] [C0] [A3] [A1]
        ↑         ↑              ↑    ↑
        └─────────┴──────────────┴────┘
                 属于 Request A
\`\`\`

对学过操作系统的读者，这个想法并不陌生：**用一层地址映射，换取更灵活的物理内存管理。** vLLM 还利用共享 Block、引用计数和 Copy-on-Write 等机制，减少某些场景下重复保存 KV Cache 的开销。

早期 vLLM 论文在特定模型、负载与延迟条件下，报告了相对 Orca、FasterTransformer 等系统 **2～4 倍的吞吐量改善**。这个结论并不是“每个 Kernel 快了 2～4 倍”，而是更高效的内存管理使系统可以组织更多有效工作。<sup>[[3]](#ref-vllm-paper)</sup>

当然，PagedAttention 也不是免费的魔法。Block 映射本身有管理成本；允许更多请求并发执行后，系统仍可能遇到计算争用和延迟上升。

vLLM 最初给出的重要启示是：**推理性能不仅取决于我们算得多快，也取决于我们如何存放正在计算的状态。**

## SGLang：为什么相同的 Prompt 要再算一遍？

还有一种浪费，既不是请求排队，也不是显存碎片。

假设我们为一个编程助手写了很长的 System Prompt，里面包括角色、规则和输出格式。两名学生分别提问：

\`\`\`text
请求 A：
  [相同的 System Prompt，约 2000 Tokens]
  请解释 Python 的 GIL。

请求 B：
  [相同的 System Prompt，约 2000 Tokens]
  请解释 Python 的装饰器。
\`\`\`

如果系统完全独立地处理两个请求，就可能把前面约 2000 个相同的 Token 重复计算两遍。但它们对应的 **KV Cache 前缀**本来就具有复用机会。

2023 年 12 月，来自 UC Berkeley、Stanford 等机构的研究人员发布了 **SGLang** 的论文预印本，成果发表于 NeurIPS 2024。论文标题是 **SGLang: Efficient Execution of Structured Language Model Programs**。早期研究团队与 vLLM 存在人员交集，但 SGLang 的问题意识并不完全相同。<sup>[[4]](#ref-sglang)</sup>

最初的 SGLang 想解决的，不只是一次 Prompt 的生成速度，而是**如何表达并高效执行复杂的语言模型程序**。

现实应用可能会连续调用模型、根据输出进入不同分支、并行生成候选答案，或要求生成符合特定格式的 JSON。多次调用之间常常存在共享上下文，却未必会被普通的 API 调用方式利用。

因此，SGLang 最初将系统分为两部分：

- **Frontend Language**：描述生成操作、控制流、并行等程序结构。
- **Runtime**：实际执行这些操作，并利用缓存复用、结构化生成加速等机制减少开销。

其中很有代表性的一项技术是 **RadixAttention**：用 Radix Tree（基数树）组织 KV Cache 的共享前缀，以便后续请求尽可能复用已有的计算结果。

\`\`\`text
                相同的 System Prompt
                        │
                   可复用的前缀
                        │
                 ┌──────┴──────┐
                 ▼             ▼
              问题 A         问题 B
                 │             │
              生成 A         生成 B
\`\`\`

前缀复用并不意味着两个请求共享最终回答；它只是在前缀 Token 和相应计算状态可复用时，省去重复的 Prefill 计算。缓存是否命中，还受到 Token 是否完全一致、缓存是否保留以及显存压力等条件影响。

SGLang 早期也利用压缩有限状态机等方法优化结构化输出，这提醒我们：**如果运行时知道一个模型程序接下来要做什么，就可能找到仅靠独立请求无法发现的优化机会。**<sup>[[4]](#ref-sglang)</sup>

需要强调的是，**“vLLM 管显存、SGLang 管前缀”只是帮助理解它们早期研究切入点的说法，不是今天的功能边界。** vLLM 也支持前缀缓存，SGLang 也需要分页 KV Cache 管理、批处理和 GPU 执行优化。

## 只有这两个项目吗？

当然不是。在 vLLM 和 SGLang 之外，LLM 推理生态还沿着其他需求发展。

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

这些项目并不处于完全相同的抽象层次。Transformers 首先是模型开发与执行库；Orca 是系统研究工作；其他项目则提供不同侧重点的推理执行或服务能力。我们也不能仅凭这张表判断它们在某台机器上谁更快。

TGI 曾是开源模型服务的重要项目；Hugging Face 已在 2025 年末将其转入维护模式，并在其 Inference Endpoints 文档中推荐 vLLM、SGLang 等替代选择。<sup>[[5]](#ref-tgi)</sup>

llama.cpp 则说明了另一种需求：如果主要目标是在笔记本电脑或资源有限的设备上运行量化模型，低依赖和硬件兼容性可能比面向大型 GPU 集群的极致吞吐更重要。<sup>[[6]](#ref-llamacpp)</sup>

这些系统未必有相同的最优解，因为它们需要优化的 **workload** 和约束条件并不相同。

## 不同的起点，逐渐汇合的问题

把 Orca、vLLM 和 SGLang 放在一起看，会发现一条很有意思的研究线索：

\`\`\`text
生成式模型需要多轮执行
          │
          ├── 请求长短不同、到达时间不同
          │      └── Orca：重新思考调度粒度
          │
          ├── KV Cache 动态增长、显存有限
          │      └── vLLM：重新思考缓存的物理布局
          │
          └── 多次调用有共享的输入与程序结构
                 └── SGLang：重新思考计算的复用方式
\`\`\`

这张图描述的是**研究问题之间的联系，不是项目代码的继承关系**。

三个项目分别从调度、内存、程序执行切入；随着工程需求的发展，现代推理引擎逐渐都需要处理这些相互关联的问题。vLLM 与 SGLang 今天的能力已经有大量交集，不能简单凭 PagedAttention 或 RadixAttention 两个名词给它们划定阵营。

更值得留意的是它们采用的系统思想：

- Orca 把粗粒度请求调度变成更细粒度的迭代调度；
- vLLM 用类似虚拟内存的映射，降低动态 KV Cache 的管理浪费；
- SGLang 使用经典的树结构与程序运行时优化，寻找跨请求的计算复用机会。

它们并没有改变语言模型要完成什么任务，而是改变了**计算机怎样组织完成任务所需的工作**。

但这三条路线也不是越激进越好。更大的 Batch 可能损害单用户的响应体验；更多并发请求可能增加计算争用；保留前缀缓存有收益，也会占用可以分给其他请求的显存。

因此，推理服务不存在脱离 workload 的万能优化配置。

## 接下来：先判断“快”是什么意思

在本专题后面的七个小节里，我们将使用 **vLLM 和 SGLang** 作为主要的工程案例，依次讨论性能测量、显存预算、并发调度、前缀缓存、投机解码、量化，以及如何根据实际请求负载选择配置。

使用成熟推理引擎是为了观察真实系统，而不是学习一套需要背诵的参数表。同一项机制在不同模型、输入输出长度、GPU 和并发条件下，可能得到完全不同的结果。

回到办公室那台只有一张 GPU 的电脑。我们可以安装 vLLM，也可以安装 SGLang；启动一个兼容 OpenAI API 的服务并不困难。

可是服务启动之后，仍然有一个问题没有回答：

> **到底什么叫“快”？**

是第一个 Token 出来得快？是后面的 Token 连续输出得快？还是单位时间能够处理更多人的请求？

如果没有先定义测量方法，我们连自己的优化有没有成功都无法判断。

下一节，从[**推理服务性能测量**](./01-what-is-fast.md)开始。

## 文献与项目参考

1. <span id="ref-orca"></span>Yu et al., *Orca: A Distributed Serving System for Transformer-Based Generative Models*, OSDI 2022。[论文与会议页面](https://www.usenix.org/conference/osdi22/presentation/yu)。
2. <span id="ref-vllm-blog"></span>Kwon et al., *vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention*, 2023-06-20。[vLLM 发布博客](https://vllm.ai/blog/2023-06-20-vllm)。
3. <span id="ref-vllm-paper"></span>Kwon et al., *Efficient Memory Management for Large Language Model Serving with PagedAttention*, SOSP 2023。[论文](https://arxiv.org/abs/2309.06180)。
4. <span id="ref-sglang"></span>Zheng et al., *SGLang: Efficient Execution of Structured Language Model Programs*, arXiv 预印本 2023-12、NeurIPS 2024。[论文](https://arxiv.org/abs/2312.07104)；[NeurIPS 会议页面](https://proceedings.neurips.cc/paper_files/paper/2024/hash/724be4472168f31ba1c9ac630f15dec8-Abstract-Conference.html)。
5. <span id="ref-tgi"></span>Hugging Face，*Text Generation Inference*。[官方文档与维护状态说明](https://huggingface.co/docs/inference-endpoints/engines/tgi)。
6. <span id="ref-llamacpp"></span>ggml-org，[llama.cpp 项目仓库](https://github.com/ggml-org/llama.cpp)。
7. NVIDIA，[TensorRT-LLM 文档](https://nvidia.github.io/TensorRT-LLM/)。
