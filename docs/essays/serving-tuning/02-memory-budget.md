---
title: "显存预算与模型配置"
level: L2
status: draft
topics: ["推理系统", "性能与测量"]
---

<script setup>
import KvCacheWalkthrough from '../../.vitepress/components/KvCacheWalkthrough.vue'
</script>

# 2. 显存预算与模型配置

> **L2 · Engineering** · **初稿** · 推理系统 / 性能与测量。本文从显存预算出发，解释模型配置、上下文长度与服务容量之间的关系。

上一节里，我们讨论了怎样测量实验室 vLLM 服务的延迟和吞吐量。现在，大家想让它处理更长的文档，再多接几个人的请求。

管理员改完配置，重启服务，终端却报了 CUDA Out of Memory（OOM）。把配置调小，服务能启动了。可几个人同时提交长文档时，又有人迟迟等不到回答。

> “模型不是已经加载成功了吗？怎么还有显存不够的问题？”

模型权重是训练后保存下来的参数。通常的推理过程使用这些参数进行计算，同一个模型实例可以让多个请求共用一份权重。多出来的请求却各自带着需要保存的状态，计算时的临时数据、执行图和运行时缓冲区，也要占用这张 GPU 的显存。要判断还能接多少请求，得先把这些占用算进去。

文本交给模型前，会经过 Tokenizer（分词器）编码成 Token ID 序列。Token 是模型处理文本的基本单位，可以对应一个词、词的一部分、标点或其他片段，具体划分取决于分词器。下文用 Token 数描述长度。<sup>[[1]](#ref-tokenization)</sup> 一次请求送入模型的输入通常称为 Prompt，生成时作为依据的输入和已有输出共同构成上下文。

KV Cache 保存各请求已处理 Token 的一部分计算结果，供后续生成复用。长文档一进来就需要较多状态空间，长回答则会在生成过程中继续占用空间。

## 从操作系统的内存管理看这个问题

进程的虚拟地址空间，是进程可以使用的虚拟地址集合；物理内存则提供实际保存数据的存储空间。分页把虚拟地址空间划成固定大小的页（Page），把物理内存划成相应大小的页框（Page Frame）。页表记录虚拟页到物理页框的映射，因此相邻虚拟页可以放在不相邻的页框里。<sup>[[2]](#ref-os-paging)</sup>

推理引擎借用了这种管理思路：把用于保存 KV 的显存集中管理，称为 KV 缓存池，再把池划成固定大小的 Block（缓存块）。请求陆续到达，每条请求需要的空间不同，引擎负责分配、扩展和回收这些块。这里的“按需分配”，是请求随着状态增长从池中取得更多块。

[![操作系统分页与 KV Block 管理对照：左侧虚拟页 0、1 映射到物理页框 3、1；右侧逻辑 Block 0、1 映射到预分配 KV 池的 P3、P1。未使用的逻辑范围尚未取得物理空间，尾页或尾块的剩余空间与池内空闲块分开显示；需求增长时按需分配，释放后回收复用。](/images/essays/serving-tuning/os-kv-memory-mapping.svg)](/images/essays/serving-tuning/os-kv-memory-mapping.svg)

<small>图 1 · 从操作系统分页到 KV Block（缓存块）管理。右侧物理块来自预分配的 KV 池，图中只展示局部。点击图片可查看原图。</small>

请求内的逻辑 Block 按 Token 顺序编号，物理位置可以分散在池中。请求增长时按需取得新块，释放的块可以回到池中复用。分配以整块为单位，尾块未填满的部分就是内部碎片；它与池中尚可分配的空闲块不同。

这里借用的是操作系统的管理思路。KV 的 Block 映射由推理引擎维护，映射的是请求中的数据块与池内存储块；操作系统页表处理的则是虚拟地址到物理地址的转换，两者的映射对象和粒度不同。

服务设置的上下文长度上限，也可以类比为允许使用的地址范围：上限给得大，实际占用仍要看请求已经保存了多少状态。各请求共享同一片有限的缓存池，因此还要区分单请求的长度上限、当前占用，以及全服务的总容量。

## KV Cache 保存的到底是什么？

我们讨论的自回归模型，用已有的 Token 序列预测下一个 Token，再把选出的 Token 接到序列后面，继续预测。常见的 Decoder-only Transformer 由多层计算串联而成，每层的因果自注意力让当前位置利用已有上下文的信息。“因果”表示当前位置只使用自己和之前位置的信息。

在一层注意力计算中，Token 的中间表示会变换成 Query（Q）、Key（K）和 Value（V）向量。当前位置的 Query 与已有位置的 Key 比较，决定怎样汇总对应的 Value。它们都是数值向量；按层、Token 位置等维度组织起来，就形成多维数组，也就是张量（Tensor）。

在模型参数不变的因果自注意力中，历史 Token 的 K、V 不会因后续 Token 到来而改变。引擎可以保留各层已经算出的 K、V，这就是 KV Cache。后续 Token 使用自己的 Query 访问这些历史状态，从而省去重复计算历史 K、V 的工作。<sup>[[3]](#ref-cache-basics)</sup>

下面用四个输入 Token 和后续输出观察这个过程。点击“播放”可以连续演示，也可以逐步查看 K、V 何时写入缓存、已有状态怎样被复用。

<KvCacheWalkthrough />

<small>图 2 · 一层、一个 KV Head 的状态变化。Q 参与本步计算，K、V 跨步骤保留；新输出的 Token 在下一步被处理时才产生对应的 KV。</small>

### Prefill 和 Decode 怎样改变缓存？

Prefill（预填充）处理输入 Prompt，建立相应的 KV，并得到预测第一个输出 Token 所需的结果。Decode（解码）阶段继续处理新生成的 Token，复用已有 KV，同时把新算出的 K、V 加入缓存。

以普通的逐 Token 生成为例，假设输入只有四个 Token，记作 $x_1,x_2,x_3,x_4$，输出记作 $y_1,y_2,\ldots$：

| 阶段 | 这一步处理的 Token | 处理后保留哪些位置的 KV | 这一步产生的输出 |
| --- | --- | --- | --- |
| Prefill | $x_1,x_2,x_3,x_4$ | $x_1,x_2,x_3,x_4$ | $y_1$ |
| 第一轮 Decode | $y_1$ | 输入的四个位置，加上 $y_1$ | $y_2$ |
| 第二轮 Decode | $y_2$ | 输入的四个位置，加上 $y_1,y_2$ | $y_3$ |

表中，刚选出的输出 Token 在下一步才被模型处理、产生对应的 KV。后文说“已计算并需要保留的 Token 数”，指的就是这些已有缓存的位置。用输入加最大输出长度规划容量，则是在为整段生成过程留出空间。

输入长，Prefill 就要建立较多状态；输出长，Decode 期间状态会继续增长。请求共用权重，各自上下文产生的 KV 则通常需要分别保存。前缀共享会改变这部分占用，第 4 节再讨论。

## 模型加载之后，显存还要留给谁？

下载模型后，文件大小可以帮助我们粗略判断权重是否放得下。服务运行起来，还要考虑这些显存用途：

| 用途 | 保存什么 | 什么时候变化 |
| --- | --- | --- |
| 模型权重 | 各层的参数 | 模型加载后通常相对稳定 |
| KV Cache | 各请求历史 Token 对应的 Key、Value 等状态 | 随请求进入、生成和结束而变化 |
| 计算工作区 | 激活、算子需要的临时空间等 | 随执行批次、输入长度和实现变化 |
| 运行时开销 | CUDA Context（设备执行上下文）、CUDA Graph（可重放执行图）相关内存、其他缓冲区等 | 与引擎、执行方式和配置有关 |

激活（Activations）是模型针对本次输入算出的中间张量；算子（Operator）是矩阵乘法等计算操作，执行时也可能需要临时工作区。KV 属于特意跨生成步骤保留的中间结果，其他临时数据则可以在相应用途结束后释放或复用。

运行时还要保留管理设备执行所需的状态。例如，CUDA Graph 把一组 GPU 操作预先记录下来，供后续重放，以减少重复提交操作的开销；执行图及相关缓冲区也会占用显存。<sup>[[4]](#ref-runtime-memory)</sup>

把后两项合并为 $M_{\text{other}}$，就有了这份 Memory Budget（显存预算）：

$$
M_{\text{weights}}+M_{\text{KV pool}}+M_{\text{other}}+M_{\text{margin}}
\leq M_{\text{GPU}}
$$

其中，$M_{\text{margin}}$ 是主动留下的安全余量，$M_{\text{KV pool}}$ 是分给 KV Cache 的容量。工作区按预期负载下的峰值估算。与引擎统计对照时，各项应采用相同的统计口径。

### 先给 24 GiB 的卡分一下账

假设实验室有一张 24 GiB GPU，我们给它安排如下预算：

| 项目 | 预算 |
| --- | ---: |
| 模型权重 | 14 GiB |
| 工作区与运行时开销 | 2 GiB |
| 安全余量 | 2 GiB |
| KV Cache 池 | 6 GiB |
| 合计 | 24 GiB |

表中的数值为教学算例设定。后文统一使用二进制单位：$1\,\mathrm{GiB}=2^{30}$ Bytes，$1\,\mathrm{MiB}=2^{20}$ Bytes，$1\,\mathrm{KiB}=2^{10}$ Bytes；模型名称里的“7B”通常表示约 70 亿个参数，GiB 则计量存储容量。

加载 14 GiB 的权重后，还剩 10 GiB。这 10 GiB 中要留出工作区、运行时开销和安全余量，能交给 KV Cache 的只有 6 GiB。用“24 减去权重”估算缓存容量，会把这些开销漏掉。

## 一个 Token 的 KV Cache 有多大？

要算出 6 GiB 能放下多少请求，先得知道每个 Token 的状态占多少显存。

这里会用到三个模型配置：层数、KV Head 数和 Head 维度。每层都产生自己的 KV；注意力按 Head（注意力头）组织计算，KV Head 数表示该层要保存几组 K、V 向量，Head 维度则是每个向量包含的数值元素数量。因此，“8 个 KV Heads、维度 128”意味着每层、每个 Token 的 K 和 V 各有 $8\times128$ 个元素。

每个元素占多少字节，由数据类型决定。例如 FP16 和 BF16 都采用 16 bit 浮点表示，每个元素占 2 Bytes。后文的 $b$ 指这个字节数。

先看教学模型：32 层、每层 8 个 KV Heads、Head 维度 128，KV 使用每元素 2 Bytes 的精度。对一个 Token，每层都要保存一份 Key 和一份 Value，把所有层加起来就是：

$$
2\times32\times8\times128\times2
=131072\,\mathrm{Bytes}=128\,\mathrm{KiB/Token}
$$

一条请求保留 8192 个 Token 的状态，就需要约 1 GiB KV Cache。两条相同长度、独立保存状态的请求，大致需要 2 GiB。

对各层结构相同、使用完整历史注意力的普通 Decoder-only Transformer，可以用下面的式子估算：

$$
m_{\text{KV/token}}=2\times L\times H_{\text{KV}}\times D_{\text{head}}\times b
$$

其中，$L$ 是层数，$H_{\text{KV}}$ 是每层的 KV Head 数，$D_{\text{head}}$ 是每个 Head 的维度，$b$ 是每个缓存元素的字节数。前面的 2 来自 Key 和 Value 两份状态。这里假设两者维度相同，并在一张 GPU 上保存所有层的 KV。

采用 GQA（Grouped-query Attention）时，多个 Query Heads 可以共享一组 KV Heads，所以式子里要填 KV Head 数。同为“7B”的模型，也会因 KV 结构不同而产生不同的缓存开销。

Hugging Face 的 KV Cache 量化文章以 Llama-2-7B 为例：32 层、32 个 KV Heads、Head 维度 128。<sup>[[5]](#ref-hf-kv)</sup> 同样按每个缓存元素 2 Bytes 计算，可以与教学配置作个对照：

| 配置 | 每层 KV Heads | 每 Token 的 KV 状态 | 保留 4096 Tokens 的 KV 状态 |
| --- | ---: | ---: | ---: |
| 本文教学配置 | 8 | 128 KiB | 0.5 GiB |
| Llama-2-7B | 32 | 512 KiB | 2 GiB |

其余三项相同，KV Head 数相差四倍，每 Token 的缓存开销也相差四倍。KV Head 数由模型架构决定，部署时应从模型配置中读取。

换一种模型结构，缓存的内容和保留方式也会变。MLA（Multi-head Latent Attention）可能缓存压缩后的潜在表示；滑动窗口注意力可以只保留相应窗口内的状态，混合模型的各层还可能采用不同的保留规则。缓存量化会引入元数据，多 GPU 部署则要考虑各卡怎样分片或复制。遇到这些情况，需要结合模型配置和引擎的缓存实现重新核算，可以参考 vLLM 的 Hybrid KV Cache Manager 文档中对不同注意力类型的讨论。<sup>[[6]](#ref-hybrid-kv)</sup>

后续算例沿用完整历史、单 GPU 模型，按 KV 状态本身估算容量，忽略缓存元数据和对齐等额外开销。部署时用启动日志和实际负载下的测量核对容量。

## 为什么还要把 KV Cache 分成 Block？

每条请求最多允许 8192 Tokens，按前面的估算，可以先为每条请求留出 1 GiB。但请求若只用了 500 Tokens 就结束，大部分空间从头到尾都没有用上。若改成随着生成扩展一段连续空间，又得处理后面的地址已经被其他请求占用的问题。

第 0 节介绍过 Paged KV Cache：把缓存按固定数量的 Token 分成 Block，再用映射记录它们的物理位置，就能更灵活地分配和扩容。<sup>[[7]](#ref-pagedattention)</sup>

### 逻辑顺序与物理位置

假设每个 Block 容纳 16 个 Token，一条已经计算了 35 个 Token 的请求，需要三个逻辑 Block：

[![一条请求的三个逻辑 Block 依次映射到物理池中的 P3、P6 和 P1。前两块各保存 16 个 Token，最后一块保存 3 个 Token，留下 13 个空位；物理池中的其他空闲块可以分给其他请求。](/images/essays/serving-tuning/kv-block-allocation.svg)](/images/essays/serving-tuning/kv-block-allocation.svg)

<small>图 3 · 35 个 Token 取得三个物理块。块内空位与池内空闲块是两种不同的剩余空间。点击图片可查看原图。</small>

逻辑 Block 描述请求内 Token 的顺序；物理 Block 是缓存池中实际提供存储的块。P3、P6、P1 可以分散在池里的不同位置，映射保证引擎能找到对应状态。这里把一个 Token 在所有层的缓存一起计账，实际存储还会按层、张量或缓存组组织。

接下来的 Token 继续填入最后一块，三块能容纳到 48 个 Token。等到需要保存第 49 个 Token 的状态，再分配第四块。8192 个位置是请求的长度上限，Block 则随实际需要逐步分配。

这里的“页”借用了虚拟内存的思路，分配单位由缓存块决定，与操作系统的 4 KiB 页不同。分页本身也不会让 GPU 自动把缓存换到 CPU 内存。请求按需从 KV 池中取得 Block，而池本身的显存可以在启动时就准备好。

### 分页之后还有浪费吗？

按连续空间分配时，空闲空间可能被分散成许多小段，总量足够却找不到所需大小的连续区域，这叫外部碎片。分页让请求可以取得分散的物理块，减少了对大段连续空间的要求。

分配以整块为单位时，块内部还可能有用不上的空间，这叫**内部碎片**，在本例中也称块内碎片。35 个 Token 用了三块，相当于取得 48 个位置，最后一块有 13 个位置暂时闲置。在不共享 Block 的简化模型里，保存 $T_i$ 个 Token 的请求需要：

$$
B_i=\left\lceil\frac{T_i}{S}\right\rceil
$$

其中 $S$ 是每块的 Token 数，$\lceil\cdot\rceil$ 表示向上取整。若每个 Token 花 128 KiB、每块 16 Tokens，一个 Block 对应的状态存储就是 2 MiB；35 个 Token 占用的三块一共要 6 MiB。

块越小，尾部闲置通常越少，但需要管理的块和映射也更多；块越大，管理粒度较粗，尾部浪费可能增加。块大小还受注意力后端和硬件约束，本例选用 16 Tokens 作为教学粒度。

## “上下文有多长”，到底在问哪一个量？

“能不能支持 8192 Tokens”，得分别看模型支持多长、接口允许多长，以及整台服务的缓存能放多少。

### 模型能处理多长的上下文？

模型配置通常会给出上下文长度限制，具体取决于模型结构、训练及上下文扩展方法。假设教学模型支持 32768 Tokens，这给出了模型这一侧的长度限制。实验室的显存是否够用、模型在长文档上的回答质量如何，还得分别检查。

部署时可以把服务长度上限设小一些，例如 8192。要使用超出模型原有支持范围的长度，需要模型与上下文扩展方案共同支持。

### 一条请求要给输出留多少空间？

服务长度上限约束的是**输入加输出**。如果服务限制为 8192 Tokens，输入已经有 6144 Tokens，最多只能再为输出安排 2048 Tokens：

$$
T_{\text{input}}+T_{\text{output,max}}\leq8192
$$

这里的输入按模型 Tokenizer 和聊天模板处理后的完整 Token 序列计数，包括 System Prompt、历史对话、检索文档以及模板加入的 Token。用户最新发来的文字只是其中一部分，汉字数与 Token 数也使用不同的计量单位。

请求遇到结束标记或停止条件，可能在到达输出上限之前就结束。规划容量时，可以按输出上限保守估算；观察当前占用时，统计已经计算、需要保留的缓存。

### 全服务一共能保留多少状态？

按前面的估算，6 GiB 的 KV 池能容纳的 Token 位置为：

$$
C_{\text{tokens}}=\frac{6\,\mathrm{GiB}}{128\,\mathrm{KiB}}=49152
$$

按每 Block 2 MiB 分配，则共有：

$$
C_{\text{blocks}}=\left\lfloor\frac{6\,\mathrm{GiB}}{2\,\mathrm{MiB}}\right\rfloor=3072
$$

这里的 $\lfloor\cdot\rfloor$ 是向下取整：剩余空间不足一整块时，不能再分配一个 Block。

这 49152 个位置由所有请求共同使用，单条请求仍受自身的长度上限约束。教学配置中的几个量分别是：

| 量 | 教学配置中的数值 | 回答的问题 |
| --- | ---: | --- |
| 模型支持的上下文长度 | 32768 Tokens | 模型这一侧支持多长的序列？ |
| 服务设置的单请求长度上限 | 8192 Tokens | 接口允许输入加输出合计多长？ |
| 一条请求的长度安排 | 输入 6144 + 最多输出 2048 Tokens | 这次请求给回答留了多少空间？ |
| 服务的 KV 总容量 | 49152 个位置，即 3072 Blocks | 所有请求的缓存合起来能占多少？ |

### 那到底能同时放下几条请求？

如果所有请求长度相同，且没有共享缓存，只按 KV 容量计算，可以得到：

| 每条请求需要保留的 Token 数 | 每条需要的 Blocks | 池中最多放下的同长度请求数 |
| ---: | ---: | ---: |
| 2048 | 128 | 24 |
| 4096 | 256 | 12 |
| 8192 | 512 | 6 |

表中统计的是能同时保留状态的驻留请求，给出的是 KV 容量上界。实际执行的并发数还受 CPU、GPU 计算和调度限制，并要满足上一节讨论的延迟目标。客户端的其他未完成请求还可以在队列中等待。

请求继续生成时，KV 需求随保留长度增长，分别在图中的交点达到池容量：

[![6、12、24 条同长度请求的 KV 需求随保留长度线性增长，分别在每条 8192、4096、2048 Tokens 时达到 6 GiB 池容量。超过这些交点，池便无法同时保留全部请求的状态。](/images/essays/serving-tuning/kv-capacity-boundary.svg)](/images/essays/serving-tuning/kv-capacity-boundary.svg)

<small>图 4 · 按每 Token 128 KiB 绘制的容量边界。横轴为每条请求保留的长度，纵轴为所有请求合计的 KV 需求；曲线按连续长度示意，实际按整 Block 分配。</small>

例如，12 条请求各保留 2048 Tokens 时，只需 3 GiB；各增长到 4096 Tokens，就碰到 6 GiB 的边界。再往右的曲线表示仍想保留全部状态所需的容量，引擎必须先等请求结束、释放缓存，或调整执行安排。

真实请求长度不整齐时，应逐条向上取整，然后相加：

$$
\sum_{i\in\text{驻留请求}}\left\lceil\frac{T_i(t)}{S}\right\rceil
\leq C_{\text{blocks}}
$$

$T_i(t)$ 表示时刻 $t$ 已计算并需要保留 KV 的 Token 数。这个式子适用于请求独占缓存、没有保留缓存或额外预留的单池模型。共享前缀时，按实际物理块去重计数；第 4 节会进一步讨论。混合注意力模型则按各类缓存的保留规则核算。

不妨做个练习：8 条请求各保留 2048 Tokens，另有 4 条各保留 8192 Tokens，能否放下？

它们一共需要 $8\times128+4\times512=3072$ Blocks，刚好占满教学缓存池。4 条长请求已经到达服务长度上限；8 条短请求虽然还没到上限，当前块却都已填满，继续保存下一个 Token 就需要新块。它们要等其他请求结束释放块，或由引擎调整执行安排。

## 量化能为请求腾出多少空间？

有人提议：“把模型换成 INT4，不就省下来了吗？”

量化把原来较高精度的数值映射到较低位宽的数值表示。INT4 表示使用 4 bit 整数编码；将量化编码还原为计算所需的数值时，通常还需要缩放系数等信息。

权重量化改变的是 $M_{\text{weights}}$。同样数量的参数，从每个 16 bit 改为 4 bit，原始存储量降为四分之一。估算实际占用时，还要加上缩放系数、未量化的部分和实现所需的数据。

假设换成量化模型后，权重实际占用从 14 GiB 降到了 4 GiB，其他预算不变，就可以把省下来的显存交给 KV 池，让它从 6 GiB 增至 16 GiB。如果每条请求仍保留 8192 Tokens、KV 精度不变，刚才的容量上界会这样变化：

| 配置 | 权重占用 | KV 池预算 | 可驻留的同长度请求数上界 |
| --- | ---: | ---: | ---: |
| 原配置 | 14 GiB | 6 GiB | 6 |
| 更换量化权重后 | 4 GiB | 16 GiB | 16 |

权重量化与 KV Cache 量化要分开看。只量化权重，每个 Token 的 KV 状态不会跟着压缩四倍。缓存可以单独采用较低精度，例如 vLLM 支持的 FP8 KV Cache，使用 8 bit 浮点表示缓存元素。这样可以改变缓存的存储开销，但还得检查硬件支持、缩放系数与输出质量。<sup>[[8]](#ref-kv-quant)</sup>

怎样选择量化模型、判断速度收益和检查质量变化，留到[《模型量化与精度选择》](./06-quantization.md)。缓存容量增加后，计算或访存可能先成为瓶颈，吞吐量未必按相同比例增长。

## 为什么 `nvidia-smi` 看不出这些变化？

管理员打开监控，发现服务刚启动、一个请求都没有，显存就占了很多。几个请求结束以后，占用也没有明显下降。

vLLM 可以先从 GPU 取得一片显存作为 KV 池，再按需把池内的 Block 分给请求。请求结束后，释放的 Block 可以交给下一个请求，整片池仍可保留在进程中。池内空闲容量增加时，进程显存占用可以保持不变。<sup>[[9]](#ref-vllm-cache)</sup>

[![同一个 6 GiB KV 池的四种占用状态：空闲时使用 0 Blocks，12 条各保留 2048 Tokens 的请求使用 1536 Blocks，各增长到 4096 Tokens 时使用全部 3072 Blocks，请求结束后回到 0 Blocks。池的容量始终为 6 GiB。](/images/essays/serving-tuning/kv-pool-occupancy.svg)](/images/essays/serving-tuning/kv-pool-occupancy.svg)

<small>图 5 · 池的分配容量与请求使用的块数分别变化。按本文教学参数绘制，关闭前缀缓存且请求独占各自的 Block。</small>

`nvidia-smi` 看到的是进程显存占用，引擎内部还要统计哪些缓存块正被请求使用。进程占用很高时，池内仍可能有许多空闲块；请求占用的块不断增加时，进程占用也可能几乎不动。

框架还可能有另一层分配器统计。以 PyTorch 的缓存分配器为例，allocated 统计张量正在占用的显存，reserved 统计分配器管理的总显存，其中可以包含可复用的空闲部分。<sup>[[10]](#ref-pytorch-memory)</sup> 如果整个 KV 池已经作为张量建立，池内暂时没有请求使用的部分仍可能计入 allocated；判断还能接多少请求，要看引擎的块使用情况。

如果启用了前缀缓存，已结束请求的部分状态还可能留在池中，供后续请求复用。这些缓存可以回收，与活跃请求必须占用的块要分开统计，具体口径以当前版本的指标定义为准。初次观察预分配时，可以先关闭前缀缓存，减少这项干扰。

### 缓存不够，为什么未必报 CUDA OOM？

CUDA OOM 表示某次设备内存分配无法满足。KV 池耗尽则表示引擎分不出更多空闲 Block。

池满时，整片池可能仍然完整地占着显存。引擎可以让新请求等待，也可以抢占部分请求，释放其缓存，之后再重新计算。vLLM 0.10.2 的 V1 调优文档介绍了这种处理方式。等待和重计算会增加延迟，过程中未必发生 CUDA OOM。<sup>[[11]](#ref-preemption)</sup>

回到实验室的故障，可以先按发生阶段核对预算：

| 观察到的现象 | 优先核对什么 |
| --- | --- |
| 权重尚未加载完就报 CUDA OOM | 权重实际占用、加载过程的额外内存，以及同卡其他进程占用 |
| 权重加载完，准备执行图或处理请求时报 CUDA OOM | 工作区、运行时与激活的峰值；对照出错时的执行批次和输入长度 |
| 启动时提示最大序列长度所需缓存超过容量 | 配置的单请求长度与池容量，整池是否足以容纳一条最长请求 |
| 请求变多后排队或出现抢占，但没有 CUDA OOM | KV 块的使用率和抢占记录，并结合计算负载、TTFT 与 TPOT 判断 |

若失败来自临时计算的峰值，继续扩大 KV 池会挤压留给计算的空间；若活跃缓存已接近池容量，则要在请求长度、驻留数量与池预算之间重新分配。

## 把预算对应到 vLLM 配置

在 vLLM 0.10.2 中，可以用下面这些参数设置相应的预算和限制，后面的观察步骤也使用这一版本。<sup>[[12]](#ref-cli)</sup>

| 配置 | 对应的预算或限制 |
| --- | --- |
| `--gpu-memory-utilization` | 规划当前实例模型执行器使用的 GPU 总显存比例，包含权重等用途；不是单独给 KV 的比例，也不是 GPU 计算利用率 |
| `--max-model-len` | 服务使用的单请求上下文长度上限，包含输入与输出 |
| `--max-num-seqs` | 单轮处理的序列数上限；不等于 KV 池保证能容纳的长请求数 |
| `--block-size` | 每个缓存块容纳的 Token 数，不是字节数 |
| `--kv-cache-dtype` | KV 存储精度，与权重量化方式分别配置 |

该版本的 `--gpu-memory-utilization` 默认值为 0.9；`--max-model-len` 未指定时从模型配置推导，`--block-size` 与 `--max-num-seqs` 的有效默认值则按平台或使用场景确定。`--kv-cache-dtype auto` 使用模型的数据类型。<sup>[[9]](#ref-vllm-cache)</sup><sup>[[12]](#ref-cli)</sup>

例如，比例设为 0.9，24 GiB 卡对应的执行器预算约为 21.6 GiB。自动估算 KV 容量时，要从中扣除权重及其他开销，余下的才归缓存使用。前面的 24 GiB 教学账按表中各项单独设定预算。

把 `--max-model-len` 从 8192 改成 4096，会收紧单条请求的长度，但 KV 池未必随之缩成一半。引擎启动时会通过 profiling（试运行并测量资源开销）估算可交给 KV 的空间，实际容量还取决于执行配置。调大 `--max-num-seqs` 也是一样：它放宽了调度限制，物理缓存却没有因此增加。

下一节还会遇到 `--max-num-batched-tokens`，它约束单轮处理多少 Token。历史 Token 的 KV 可以跨许多轮保留，因此单轮的计算预算和整个服务的缓存容量也要分开。<sup>[[12]](#ref-cli)</sup>

### 可选观察：空闲时占着的显存

下面用小模型观察进程显存占用与池内使用率。运行环境为符合 vLLM 0.10.2 要求的 NVIDIA GPU，小模型的容量以启动日志为准。以下步骤待实际验证。

先确认安装版本：

```bash
python -c 'import vllm; print(vllm.__version__)'
```

在专用测试 GPU 上启动服务：

```bash
vllm serve Qwen/Qwen2.5-0.5B-Instruct \
  --host 127.0.0.1 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.8 \
  --max-num-seqs 8 \
  --block-size 16 \
  --kv-cache-dtype auto \
  --no-enable-prefix-caching
```

本次观察将显存预算比例设为 0.8，服务能否启动取决于设备容量和其他进程占用。关闭前缀缓存可以减少请求结束后保留缓存带来的干扰。

先记下 GPU 型号、驱动、vLLM 版本、模型 revision（仓库中的具体版本）、实际执行后端和启动日志中的 KV 容量，再依次观察空闲、处理请求和请求结束三个时刻：

1. 空闲时，用 `nvidia-smi` 记录进程显存占用，同时查看引擎的缓存使用率。
2. 沿用上一节的请求或压测方式，在输入加输出不超过 4096 的前提下，逐步增加请求长度和重叠数量，观察缓存使用率、等待请求数及延迟。
3. 停止发送，等所有请求完成，再比较这两层占用是否同步下降。

vLLM 提供 `/metrics` 端点，字段含义可查该版本的 Production Metrics 文档，并核对服务实际输出。<sup>[[13]](#ref-metrics)</sup> 请求很短时，持续采样有助于捕捉占用变化。缓存压力较小时，请求可以在没有等待或抢占的情况下执行。

比较这些记录：请求结束后，池内使用率是否下降，而进程仍保留整片显存？如果结果不同，先检查请求是否真正结束、前缀缓存是否关闭，以及指标的统计口径。

## 回到实验室：先决定要服务怎样的请求

现在管理员可以把“多接几个人”说得更具体了。在原来的 6 GiB KV 预算下，如果每条请求最多保留 4096 Tokens，缓存容量允许最多 12 条这样的请求驻留；如果要处理输入 6144、最多输出 2048 Tokens 的长文档请求，就要保留 8192 的单请求长度上限，此时最多容纳 6 条同长度请求的状态。

前一种安排给每条请求的长度较短，后一种安排能处理长文档，但同时驻留的请求更少。选择取决于大家实际提交什么请求，以及能接受多久的等待。缓存容量算过以后，还要用上一节的 TTFT、TPOT 和 Goodput 检查服务表现。

请求的长度也在不断变化。如果服务保留 8192 的长度上限，按当前占用接纳了 12 条各保留 2048 Tokens 的请求，一共只用掉 1536 Blocks，缓存池还有一半空闲。如果它们最终都增长到 8192 Tokens，就需要 6144 Blocks，是池容量的两倍。

按当前占用接纳请求，可以提高空间利用率，代价是后续增长可能带来缓存压力。如果按每条请求的最大长度提前保留，许多短回答又用不上那些容量。调度器得一边运行一边安排：哪些请求先执行，哪些快结束了、能释放块，新来的长 Prompt 又需要多少计算和状态。这些选择会改变上一节测到的等待时间与输出间隔。

下一节继续讨论[《并发处理与请求调度》](./03-concurrency.md)：在这些资源约束下，Continuous Batching 怎样让不同请求进入和离开执行批次。

## 文献与项目参考

1. <span id="ref-tokenization"></span>Hugging Face，*Tokenization algorithms*。[Token 与分词方式](https://huggingface.co/docs/transformers/en/tokenizer_summary)。
2. <span id="ref-os-paging"></span>*Operating Systems: Three Easy Pieces*，第 18 章，*Paging: Introduction*。[虚拟页、页框与页表](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf)。
3. <span id="ref-cache-basics"></span>Hugging Face，*How caching works*。[因果注意力与逐层 KV 复用](https://huggingface.co/docs/transformers/en/cache_explanation)。
4. <span id="ref-runtime-memory"></span>vLLM 0.10.2，*Conserving Memory*。[执行图等运行时显存开销](https://docs.vllm.ai/en/v0.10.2/configuration/conserving_memory.html)。
5. <span id="ref-hf-kv"></span>Hugging Face，*Unlocking Longer Generation with Key-Value Cache Quantization*，2024。[Llama-2-7B 的 KV 状态估算示例](https://huggingface.co/blog/kv-cache-quantization)。
6. <span id="ref-hybrid-kv"></span>vLLM 0.10.2，*Hybrid KV Cache Manager*。[不同注意力类型的缓存需求](https://docs.vllm.ai/en/v0.10.2/design/hybrid_kv_cache_manager.html)。
7. <span id="ref-pagedattention"></span>Kwon et al., *Efficient Memory Management for Large Language Model Serving with PagedAttention*, SOSP 2023。[论文](https://arxiv.org/abs/2309.06180)。
8. <span id="ref-kv-quant"></span>vLLM 0.10.2，*Quantized KV Cache*。[FP8 KV Cache 与精度说明](https://docs.vllm.ai/en/v0.10.2/features/quantization/quantized_kvcache.html)。
9. <span id="ref-vllm-cache"></span>vLLM 0.10.2，*CacheConfig*。[缓存配置与容量预算](https://docs.vllm.ai/en/v0.10.2/api/vllm/config/cache.html)。
10. <span id="ref-pytorch-memory"></span>PyTorch 2.8，*CUDA semantics*。[缓存分配器与显存统计](https://docs.pytorch.org/docs/2.8/notes/cuda.html#cuda-memory-management)。
11. <span id="ref-preemption"></span>vLLM 0.10.2，*Optimization and Tuning*。[V1 抢占与重计算](https://docs.vllm.ai/en/v0.10.2/configuration/optimization.html#preemption)。
12. <span id="ref-cli"></span>vLLM 0.10.2，*vllm serve*。[CLI 参数与该版本默认值](https://docs.vllm.ai/en/v0.10.2/cli/serve.html)。
13. <span id="ref-metrics"></span>vLLM 0.10.2，*Production Metrics*。[指标与 `/metrics` 端点](https://docs.vllm.ai/en/v0.10.2/usage/metrics.html)。

[返回本章目录](./index.md)
