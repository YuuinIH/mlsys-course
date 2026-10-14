---
level: L2
status: draft
topics:
  - training-systems
  - cost-and-tradeoffs
---

# 规模效应：算力、能力与成本

> **L2 · Engineering** · **初稿** · 训练系统 / 成本与系统决策。本文从性能扩展的历史案例出发，建立规模、效率与成本的直觉。

<!-- 用词约定：“四路泰坦”是社区 meme 的固定写法；只有说明具体型号或测试数据时才使用 Titan X 等完整型号。 -->

大约十年前，笔者还经常混迹于显卡吧。

那个年代，卡吧流传着一段不断被改编的打油诗：三千预算进卡吧，一路加钱，最后四路泰坦抱回家。预算已经不重要了，四张旗舰显卡先插满再说。配置单豪华到一定程度，楼下还会有人打趣：拿来刷扫雷，能不能稳定六十帧？

这些梗有现实原型。当时真的有人把两张、三张甚至四张 Titan X 装进同一台电脑，用 NVIDIA 的 SLI（Scalable Link Interface）让多张显卡共同渲染游戏。“四路泰坦”后来成了中文硬件社区里顶配电脑的代名词。<sup>[[1]](#ref-sli-meme)</sup>

SLI 名字里的 Scalable，意思是系统可以随着资源增加而扩展。一张 Titan X 已经很快，四张卡都装进机器，也都在工作，帧率似乎就应该接近四倍。配置单看起来很有道理，跑起来却是另一回事。

2015 年，PC Gamer 测试 Maxwell 版 Titan X 时，《中土世界：暗影魔多》（Middle-earth: Shadow of Mordor）在 4K 最高画质下的平均帧率是：<sup>[[2]](#ref-titan-x-sli)</sup>

| GPU 数量 | 平均帧率 |
| --- | ---: |
| 1 张 Titan X | 44 FPS |
| 2 张 Titan X | 75 FPS |
| 3 张 Titan X | 89 FPS |

第二张卡把 44 FPS 提高到 75 FPS，提升很明显。第三张卡又花掉一张 Titan X 的钱，只换来 14 FPS。换一款游戏，结果还会不同。同一组测试中，《地铁：最后的曙光》（Metro: Last Light）甚至没有识别第三张 GPU。评测者原本准备继续看三卡、四卡，先遇到了 CPU 瓶颈、驱动支持和游戏兼容性。卡数增加了，性能没有按相同倍数增长。

## 买了几份硬件，换回了几份性能

假设同一个任务使用一张 GPU 需要时间 $T_1$，使用 $N$ 张 GPU 需要时间 $T_N$。加速比（speedup）写作：

$$
S(N)=\frac{T_1}{T_N}
$$

如果观察的是游戏帧率或训练吞吐，也可以用 $N$ 张 GPU 的吞吐除以单卡吞吐。理想情况下，八张卡把时间缩短到八分之一，或把吞吐提高到八倍，此时 $S(8)=8$。

再把加速比除以设备数量，可以得到扩展效率（scaling efficiency）：

$$
E(N)=\frac{S(N)}{N}
$$

回到刚才的游戏。双卡的加速比约为 $75/44=1.70$，扩展效率约为 85%。三卡的加速比约为 $89/44=2.02$，扩展效率已经降到 67%。

扩展效率把“没有跑满”换算成了资源。家用电脑扩展得不好，结果可能只是多买了一张没有充分发挥作用的显卡。训练持续几天或几周时，这部分损失会以 GPU-hours 和电费结算。假如完成同一个任务时扩展效率只有 50%，这批设备消耗的总 GPU-hours 大约是理想情况的两倍。

“使用了 1024 张 GPU”还不足以说明系统扩展得好。我们还要知道这些卡有多少时间在完成有效计算，有多少时间花在移动数据和相互等待上。

## 一点不能并行的工作，会怎样长大

1967 年，Gene Amdahl 讨论大型计算机时提出了一个后来被称为 Amdahl 定律的观察。假设一个任务中有比例 $p$ 的工作可以理想地并行，剩下的部分仍然要串行执行，那么：<sup>[[3]](#ref-amdahl)</sup>

$$
S(N)=\frac{1}{(1-p)+\frac{p}{N}}
$$

这条公式在这里用来做数量级检查。分母里的 $1-p$ 决定了加速的上限：如果一个任务有 95% 可以并行，剩下 5% 不能，那么无论增加多少计算设备，加速比都不会超过 20。

现实中的多 GPU 程序还会产生原来没有的工作。设备之间需要交换信息，先完成的设备可能要等待，任务也很难每次都恰好分成一样大的几份。若按**关键路径上实际暴露的时间**记账，可以先粗略写成：

$
T_{\text{step}}
\approx T_{\text{compute}}
+T_{\text{comm, exposed}}
+T_{\text{sync, exposed}}
+T_{\text{idle}}
$

这里的通信、同步指没有被其他计算掩盖的部分，而不是把 GPU 时间线上的所有活动时长直接相加。真实系统里计算、传输与同步可能重叠，不能重复计时。卡数增加后，计算部分可能缩短，暴露出来的通信和等待却未必跟着缩短。某个小开销到了几百张卡上，可能让大量设备一起等待。

## GPU 进入深度学习

SLI 后来逐渐退出了主流游戏电脑，多 GPU 计算却在另一个领域迅速变得重要。

2012 年，AlexNet 在 120 万张 ImageNet 图片上训练。作者用了两张各有 3 GB 显存的 GTX 580，整个训练花了五到六天。论文直接写道，网络规模主要受可用显存和可接受训练时间限制，因此把网络分到两张 GPU 上。<sup>[[4]](#ref-alexnet)</sup>

AlexNet 使用的是面向神经网络的双 GPU 拆分，workload 和软件路径都与游戏 SLI 不同，但两者面对同一个资源问题：

> 一张 GPU 放不下，或者算得太久，增加 GPU 以后能得到多少有效工作？

单卡首先会撞上容量边界，模型和训练过程需要的状态可能超过显存。即使放得下，训练也可能慢到无法接受。在线推理还有另一种压力：一张卡能回答一个人，却无法同时服务不断到来的请求。

这些边界都会把系统推向更多 GPU。可我们已经从 SLI 见过，每多一张卡，扩展效率都可能再损失一些。机器学习为什么还在继续增加算力？

## 模型侧：规模本身就是方法

前面几节关心的都是同一件事：固定的计算任务，分到更多设备上，能快多少。Amdahl 定律给出了上限，扩展效率告诉我们离上限还有多远。这套问法有一个前提，任务本身不变。

2020 年以后，机器学习把任务本身也做大了，而且做大是有回报的。

2020 年 1 月，Kaplan 等人发表了语言模型 scaling laws 的工作。他们观察到，测试损失与模型规模、数据量和训练计算量之间呈现相当规律的幂律关系，其中一些趋势跨越了七个数量级。<sup>[[5]](#ref-scaling-laws)</sup>

![Kaplan 等人的论文图 1：语言模型测试损失分别随训练计算量、数据量和参数量增加而平滑下降](/images/modules/0X/scaling-laws-figure-1.png)

*图 1：Kaplan 等人的论文图 1。三幅图都使用对数横轴；点和拟合线在很大的尺度范围内仍然贴得很近。纵轴是测试损失，越低越好。*

这张图当时最有诱惑力的地方，是曲线没有很快撞上一堵墙。增加参数、数据或训练计算量，测试损失仍在下降。幂律同时意味着边际收益会变小：为了再换来一点下降，投入往往要按倍数增加。

同年 5 月，GPT-3 论文公布。最大的模型有 1750 亿参数，是此前非稀疏语言模型参数量的十倍。论文还训练了从 1.25 亿到 130 亿参数的一系列较小模型，用来观察能力如何随规模变化。在许多任务上，zero-shot、one-shot 和 few-shot 表现随着模型变大而提高，虽然也有一些任务仍然表现很差。<sup>[[6]](#ref-gpt3)</sup>

![GPT-3 论文图 1.2：三种模型在一个字符操作任务上的准确率随上下文示例数量变化](/images/modules/0X/gpt3-in-context-scaling.png)

*图 2：GPT-3 论文图 1.2。横轴是上下文里提供的示例数量，纵轴是一个字符操作任务的准确率。1750 亿参数模型从示例中获益明显，13 亿参数模型几乎没有学会这个任务。这只是一项具体实验，不能当作通用的“智能曲线”。*

这些结果给继续增加模型、数据和训练计算提供了实验依据。游戏玩家那里有些奢侈的“再加一张卡”，在机器学习研究里可以换来明确的收益。研究者开始用更大的机器训练以前放不下、也算不完的模型。

![GPT-3 论文图 2.2：BERT、T5 和 GPT-3 系列模型训练计算量的对数柱状图](/images/modules/0X/gpt3-training-compute.png)

*图 3：GPT-3 论文图 2.2。纵轴是训练使用的 petaflop/s-days，并采用对数刻度。模型系列向右变大时，训练计算量也跨过多个数量级。*

这里有两种 scaling，名字相同，方向不同：

```text
系统侧：固定一个计算任务，增加 GPU 和机器，能换来多少有效计算？
模型侧：增加模型参数、数据和训练计算量，能换来多少模型性能的改善？
```

Amdahl 定律和扩展效率属于第一行，关心系统效率；Scaling laws 属于第二行，关心学习效果。**两种增长不遵循同一条收益曲线。** 对固定任务增加 GPU，额外的通信与同步通常会损耗加速收益；但模型能力跨过某项任务的**可用性门槛**时，实际价值可能从「基本做不了」跃升为「可以交给它完成」。模型表现的渐进改善，不一定带来渐进的使用体验。

2022 年底 ChatGPT 带来的震撼，可以看作这种使用体验变化的例子。不过，它来自 GPT-3.5 系列模型与指令微调、RLHF、对话交互等多方面的结合，不能简单说是参数规模突破了某个临界点。研究者把部分突现的任务表现称为 *emergent abilities*，但它是否对应模型内部的突然相变仍有争议：有些跃迁可能来自评价指标本身。<sup>[[16]](#ref-emergence-debate)</sup><sup>[[17]](#ref-chatgpt-launch)</sup>

到 2026 年，这种变化已经有了更具体的工程案例。OpenAI 展示的 **GPT-6 Astra** 可以在 KiCad 中根据电路原理图进行 PCB 布局布线，也能操作图形界面完成网站前端测试。<sup>[[18]](#ref-astra-capabilities)</sup> Anthropic 公布的 **Claude Opus 5.5** 早期测试里，有人借助它在一天内完成约 **68 万行代码迁移**、在三小时内审计并修复约 **20 万行代码**；另一次内部测试将 HAProxy 从 C 迁移到 Rust，重写版本通过了几乎全部原项目的回归测试。<sup>[[19]](#ref-opus55-capabilities)</sup> 这些仍是厂商演示或特定测试，不能等同于普遍可靠的无人值守能力；但它们让「可用性门槛」有了具体含义。

这就构成了一种有趣的不对称：系统为了扩大计算规模付出的代价，可能随着规模增加而变大；模型跨过任务门槛产生的收益，却未必按相同的比例变化。两者都需要衡量，不能互相替代。

这些工作也改变了“更多算力拿来做什么”的答案。新增的 GPU 可以用来缩短原来那次训练，也可以承载更大的模型和数据。后一种选择不会让 wall-clock time 明显下降，却能完成过去做不到的工作。并行计算很早就为这两种目标起了不同的名字。

## 同一道题做快一点，还是去做更大的题

并行计算通常区分 strong scaling 和 weak scaling：<sup>[[7]](#ref-llnl-scaling)</sup>

| 观察方式 | 问题规模 | 想知道什么 |
| --- | --- | --- |
| Strong scaling | 固定 | 增加设备后，同一个任务能快多少 |
| Weak scaling | 随设备数量增长 | 每张设备承担近似相同的工作时，总系统能处理多大的任务 |

四路泰坦跑同一个游戏基准测试，或者八张 GPU 训练同一个模型，属于 strong scaling 的问题。任务没有变，目标是尽快完成。随着每张设备分到的计算越来越少，固定开销和设备间协作会越来越显眼。

John Gustafson 在 1988 年重新讨论 Amdahl 定律时指出，现实中获得更大的机器以后，人们经常会扩大问题，而不是永远拿它计算原来那道小题。<sup>[[8]](#ref-gustafson)</sup> 我们购买更多计算资源，可能是为了使用更精细的模拟、更大的数据集，或过去根本跑不动的模型。Weak scaling 描述的就是这种视角。

假设昨天用一张 GPU 训练一个小模型需要一天，今天有了八张 GPU，我们可以把同一个模型缩短到三小时，也可以增加参数量、喂入更多数据，把训练时间仍然维持在一天。后一种情况下，wall-clock time 没有下降，完成的工作却变多了。

GPT-3 与标准 weak-scaling 实验的控制条件不同。它的模型规模、数据量、训练配置和每张 GPU 承担的工作都可能一起变化。这里借它说明的是 Gustafson 所描述的规模视角：得到更多计算资源以后，人们往往会去做以前做不了的大问题。

此时只看 speedup 很容易误判。更多硬件的价值，有时表现为更快，有时表现为原来做不到的规模。

![Strong scaling 与 weak scaling：固定总工作量或固定每张 GPU 的工作量](/images/modules/0X/strong-weak-scaling.svg)

*示意：Strong scaling 把同一份工作分给更多设备；Weak scaling 在单卡工作量大致不变时扩大任务总量。真实加速情况还取决于通信与同步开销。*

## 同样的训练计算，应该给大模型还是给大数据

Scaling laws 说投入更多训练计算量，测试损失会下降。它没有说的是，同一份计算量应该花在更大的模型上，还是花在更多的数据上。

2022 年，DeepMind 训练了 Chinchilla，用来回答这个分配问题。他们固定训练计算预算，系统地改变模型参数量和训练 token 数的比例，结果发现在当时的训练方式下，很多大模型明显训练不足：参数太多，见过的数据太少。Chinchilla 用 700 亿参数和 1.4 万亿 token 训练，参数量只有 Gopher 的四分之一，用到的训练计算量相同，在多数下游任务上却更好。<sup>[[9]](#ref-chinchilla)</sup>

论文在其模型族、数据与训练设定下给出的经验比例大约是每个参数配 20 个训练 token。700 亿参数乘上 20，正好对应 1.4 万亿 token。它描述的是**固定预训练计算预算下的经验最优配置**，并非所有模型的普适常数。

![Gopher 与 Chinchilla 如何重新分配模型参数和训练 token](/images/modules/0X/chinchilla-allocation.svg)

*示意：训练计算预算相近时，Chinchilla 把投入从更大的参数规模转向了更多训练数据。参数与 token 使用各自的比例尺。*

比具体比例更重要的是，模型侧的 scaling 本身也存在分配问题。进一步考虑模型训练完以后还要被调用多少次时，较小模型节省的推理成本可能改变整体最优解。**训练计算最优，不一定等于训练加推理的生命周期成本最优。**

于是“增加算力能换来什么”又多了一层。模型侧的 scaling law 说加大投入仍有回报，Chinchilla 说投入内部的比例也会改变回报，这两件事都发生在系统侧扩展效率的约束之下。一次大规模训练要同时回答三道题：买多少机器，训多大的模型，喂多少数据。

## 从一张卡走出一台机器

单卡程序的世界相对安静。计算和显存都在一张设备上，失败通常也只影响一个进程。

到了单机多卡，每张 GPU 有自己的显存和执行进度。只要任务需要共同完成，数据就会在设备之间移动，设备也可能彼此等待。机器里的 GPU 位置不同，走过的数据路径也可能不同。某一张卡慢几毫秒，只有八张卡时也许不算严重；如果其余设备每一步都在等它，这几毫秒会反复进入整场训练。

通信不是工程师忘记优化才出现的意外。只要一个训练算法要求多个设备交换梯度、参数或中间状态，数据就必须沿着某条路径传输。假设有 $M$ 字节必须通过有效带宽为 $B$ 的瓶颈链路，仅数据传输的时间尺度就至少是 $M/B$；实际还可能有启动延迟、网络争用与同步等待。

更一般地，通信复杂度研究的是参与者共同完成计算时，需要交换多少信息。<sup>[[10]](#ref-communication-complexity)</sup> 但这一理论不能直接替代某个 AllReduce 算法、网络拓扑或训练执行图的性能分析。通过分片、压缩和计算—通信重叠，我们可以减少需要传输或暴露在关键路径上的时间，却不能假定跨设备数据交换免费。卡越多，每张卡分到的计算可能越少，通信和等待的相对占比反而上升。

一台服务器能安装的 GPU 数量、提供的功率和容纳的显存都有物理上限。规模继续增加，GPU 只能分布到多台机器：

```text
1 GPU
  ↓
8 GPUs in one server
  ↓
8 servers
  ↓
128 servers
  ↓
thousands of GPUs
```

跨出机箱以后，网络进入执行路径。机器之间的数据交换要经过网卡、交换机和更长的链路。带宽会被分享，延迟不能再忽略，任何一段拥塞都可能让昂贵的 GPU 等待。

机器数量还改变了故障的含义。一台电脑稳定运行几天并不稀奇。许多机器共同运行很久时，某张卡、某条链路或某台服务器出问题就不能继续按极小概率处理。

负载不均也会变贵。八张卡里有一张慢，七张卡可能在等。上千张卡里有一个参与者晚到，等待的资源就不再是桌面电脑上的几个空闲核心。Scaling efficiency 每下降一个百分点，背后都可能是大量 GPU-hours。

规模一路增加时，系统会逐步遇到这些问题：

- 计算并不能全部同时进行；
- 设备之间交换信息需要时间；
- 同步会把局部的慢变成整体的等待；
- 工作很难永远平均分配；
- 一台机器装不下时，网络会成为系统的一部分；
- 参与的设备越多，遇到故障的机会越多。

这里先记录问题出现的顺序。具体的并行策略、通信与调度机制可以在相关专题中继续探索。

## 四条增长曲线，到底在增长什么？

“AI 增长得快”至少涉及四件事：计算投入、训练成本、算法效率，以及模型能完成多复杂的任务。Epoch AI 汇总的前沿语言模型趋势中，前三项每年的变化约为 **5×、3.5×、3×**。<sup>[[11]](#ref-epoch-trends)</sup>

能力则很难折成统一的倍数。这里选用 METR 的 **Agent Task-Completion Time Horizon**：以人类专家完成任务所需的时间表示任务难度，估计 Agent 在 **50% 成功率**下能够完成多长的任务。其前沿模型自 2023 年以来约**每 131 天翻倍**，折算成年增长约 **7×**。<sup>[[15]](#ref-metr-horizon)</sup>

![四条增长趋势共用倍率纵轴：Agent 任务时长约 7 倍，训练计算量约 5 倍，训练成本约 3.5 倍，预训练计算效率约 3 倍](/images/modules/0X/scale-efficiency-cost-rates.svg)

*图 4：四条趋势均从 1× 出发。紫线是特定技术任务的 Agent 时间跨度，不是“综合智能增长 7 倍”；各项数据的时间窗口和统计口径不同，仅用于比较数量级。*

算法效率的提升还有更长的历史：达到 AlexNet 的 ImageNet 表现，2019 年所需训练计算量约为 2012 年的 $1/44$；更新的语言模型研究则估计，达到固定能力所需的计算量约每 8 个月减半。比较这类效率时，**必须固定要完成的目标**。<sup>[[12]](#ref-algorithmic-efficiency)</sup><sup>[[13]](#ref-epoch-algo-efficiency)</sup>

而图片生成、视频生成、Computer Use 等能力的出现，扩大的是**能做哪些事**，未必能用一个倍率概括。效率改善也不必然降低行业总投入：单位任务变便宜后，人们可能转而训练更大的模型。这与经济学中的**反弹效应**相似，但总体增长还受到需求、融资和硬件进步等因素影响，不能仅凭图中曲线断定因果。<sup>[[14]](#ref-jevons)</sup>

## 成本是三种 scaling 的交汇点

系统侧、模型侧和经济学侧的 scaling 最终在一张账单上相遇。一次训练的 GPU 租用成本可以先粗略写成：

$
C(N)=N\,T_N\,r
$

其中 $N$ 是 GPU 数量，$T_N$ 是完成训练的时间，$r$ 是每张 GPU 的单位时间价格。这还只是计算设备的直接租用成本，不包含网络、存储、故障恢复和维护等其他开支。

现在回想文章开头的定义：$S(N)=T_1/T_N$，$E(N)=S(N)/N$。将它们代入，就得到：

$
\boxed{C(N)=\frac{T_1r}{E(N)}}
$

这一步有明确前提：**比较同一份训练工作量，使用同型号 GPU，且单位时间价格不变。** 在这些假设下，完成任务需要的 GPU-hours 与扩展效率成反比。如果 $E(N)=80\%$，租用成本是理想基准的 $1.25$ 倍；如果只有 $50\%$，就要付约两倍的 GPU-hours。

![固定训练工作量时，扩展效率与相对 GPU 租用成本成反比](/images/modules/0X/efficiency-cost.svg)

*示意：曲线根据 $1/E(N)$ 直接绘制，不是实测集群数据。成本增加不等于增加 GPU 永远不划算——更短的交付时间、不同机器的单价与故障风险仍会改变决策。*

这里还有一个经常被忽略的区别：训练计算最优配置决定你**想完成多少工作**；系统扩展效率影响你**为完成这些工作多付出多少资源**。扩大 GPU 数量不一定节省 GPU-hours，却可能是按期完成训练的必要条件。更重要的是，如果更多训练投入让模型跨过了某项任务的可用性门槛，新增能力的价值也不能直接从 $E(N)$ 或 GPU-hours 中读出来。

所以真正要问的，很少只是“1024 张 GPU 能让程序快多少”。更值得追问的是：在给定的时间和预算下，选择多大模型、多少数据、哪种并行策略，最后能换回什么价值？

## 对规模保留一个问号

从四路泰坦到大模型训练，硬件数量已经跨过几个数量级。这篇文章从计算机体系结构里的 scaling 讲起，经过机器学习里的 scaling，最后落到工程经济学里的 scaling。三者说的不是同一件事，现代 AI 的发展却由它们共同决定。

以后看到一张漂亮的扩展曲线，先弄清它固定的是问题规模，还是每张 GPU 的工作量。横轴增加十倍以后，通信、同步和等待分别占了多少时间？多出来的设备是在计算还是在等？从 8 张卡走到 1000 张卡，原来的结论是否仍然成立？

ML 不断给我们扩大模型、数据和算力的理由，系统规模也会把原本可以忽略的成本带进来。一张卡上的一次数据移动、几毫秒等待或一次偶发故障，到了大集群里都可能进入总训练时间和成本。

更多 GPU 不保证等比例加速，更多训练计算也不保证等比例提升模型能力。但有时值得投入的，恰恰是让模型第一次跨过某项任务的可用性门槛。

## 图像与文献参考

1. <span id="ref-sli-meme"></span>36氪，*消费级显卡不再支持 SLI，对玩家来说是好是坏？*，2022。[文章](https://www.36kr.com/p/1933488983214470)。文章回顾了“四路泰坦战大作”从高配游戏方案变成中文硬件社区梗的过程。
2. <span id="ref-titan-x-sli"></span>Maximum PC Staff，*Nvidia GeForce GTX Titan X SLI Benchmarks*，PC Gamer，2015。[测试与原始表格](https://www.pcgamer.com/nvidia-geforce-gtx-titan-x-sli-benchmarks-2015/)；Dave James，*Benchmarks: GTX Titan X in SLI*，PC Gamer，2015。[三卡与四卡讨论](https://www.pcgamer.com/benchmarks-gtx-titan-x-in-sli/)。前者给出单卡、双卡和三卡在 4K 游戏中的帧率，并记录不同游戏的扩展差异与第三张 GPU 未被识别的情况；后者讨论继续增加到三卡和四卡后的边际收益。
3. <span id="ref-amdahl"></span>Gene M. Amdahl，*Validity of the Single Processor Approach to Achieving Large Scale Computing Capabilities*，AFIPS Spring Joint Computer Conference，1967。[ACM DOI](https://doi.org/10.1145/1465482.1465560)。
4. <span id="ref-alexnet"></span>Alex Krizhevsky、Ilya Sutskever、Geoffrey E. Hinton，*ImageNet Classification with Deep Convolutional Neural Networks*，NeurIPS，2012。[论文页面](https://proceedings.neurips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html)。
5. <span id="ref-scaling-laws"></span>Jared Kaplan et al.，*Scaling Laws for Neural Language Models*，2020。[OpenAI 论文介绍](https://openai.com/index/scaling-laws-for-neural-language-models/)；[arXiv:2001.08361](https://arxiv.org/abs/2001.08361)。图 1 截自论文图 1。
6. <span id="ref-gpt3"></span>Tom B. Brown et al.，*Language Models are Few-Shot Learners*，2020。[arXiv:2005.14165](https://arxiv.org/abs/2005.14165)。图 2 与图 3 分别截自论文图 1.2 和图 2.2。
7. <span id="ref-llnl-scaling"></span>Lawrence Livermore National Laboratory，*Introduction to Parallel Computing Tutorial*。[Strong and weak scaling](https://hpc.llnl.gov/documentation/tutorials/introduction-parallel-computing-tutorial)。
8. <span id="ref-gustafson"></span>John L. Gustafson，*Reevaluating Amdahl's Law*，Communications of the ACM 31(5)，1988。[ACM DOI](https://doi.org/10.1145/42411.42415)。
9. <span id="ref-chinchilla"></span>Jordan Hoffmann et al.，*Training Compute-Optimal Large Language Models*，2022。[arXiv:2203.15556](https://arxiv.org/abs/2203.15556)。论文固定训练计算预算、改变模型参数与训练 token 的比例，提出 70B 参数与 1.4 万亿 token 的 Chinchilla 配置，并给出约每参数 20 token 的经验比例。
10. <span id="ref-communication-complexity"></span>Andrew Chi-Chih Yao，*Some Complexity Questions Related to Distributive Computing*，STOC，1979。[ACM DOI](https://doi.org/10.1145/800135.804414)。这里仅借用通信复杂度的基本视角——协作计算有信息交换需求；本文并不据此推导具体集合通信算法的时间下界。
11. <span id="ref-epoch-trends"></span>Epoch AI，*Trends in Artificial Intelligence*，2026 年 9 月访问。[趋势汇总](https://epoch.ai/trends)；[Epoch Capabilities Index 说明](https://epoch.ai/eci)。训练计算量、预训练计算效率与训练成本采用该页面给出的前沿语言模型趋势；ECI 是由五十多个基准测试组合出的能力代理指标，其绝对点数没有独立含义。
12. <span id="ref-algorithmic-efficiency"></span>Danny Hernandez、Tom B. Brown，*Measuring the Algorithmic Efficiency of Neural Networks*，2020。[arXiv:2005.04305](https://arxiv.org/abs/2005.04305)。论文以达到 AlexNet 在 ImageNet 上的表现为固定目标，估计 2012 至 2019 年所需训练计算量减少 44 倍。
13. <span id="ref-epoch-algo-efficiency"></span>Epoch AI，*Algorithmic progress in language models*，2024。[文章](https://epoch.ai/blog/algorithmic-progress-in-language-models)。该文汇总语言模型算法效率的多种估计，其中达到固定能力水平所需训练计算量的下降速度约为每 8 个月减半；不同估计的区间较宽，本章只引用其数量级。
14. <span id="ref-jevons"></span>William Stanley Jevons，*The Coal Question*，1865；反弹效应综述见 Harry D. Saunders，*The Khazzoom-Brookes Postulate and Neoclassical Growth*，The Energy Journal，1992。[Jevons 悖论条目](https://en.wikipedia.org/wiki/Jevons_paradox)。本文借用效率提高反而增加总消耗的观察，说明算法效率的收益常被重新投入更大规模的训练。
15. <span id="ref-metr-horizon"></span>METR，*Time Horizon 1.1*，2026-01-29。[更新说明](https://metr.org/blog/2026-1-29-time-horizon-1-1/)；[任务时长指标与方法](https://metr.org/time-horizons/)。新评估套件中，2023 年以来前沿模型 50% 成功率任务时长的拟合翻倍周期约 131 天；按 $2^{365/131}$ 折算的一年约 $6.9\times$ 是**趋势换算值**。任务主要为软件工程、ML 和网络安全，不能据此外推全部智能表现。
16. <span id="ref-emergence-debate"></span>Jason Wei et al.，*Emergent Abilities of Large Language Models*，TMLR，2022。[论文](https://arxiv.org/abs/2206.07682)；Rylan Schaeffer et al.，*Are Emergent Abilities of Large Language Models a Mirage?*，NeurIPS，2023。[论文](https://papers.neurips.cc/paper_files/paper/2023/hash/adc98a266f45005c403b8311ca7e8bd7-Abstract-Conference.html)。前者讨论规模增加时观察到的任务能力跃迁，后者指出部分跳变可能来自评价指标，并不必然说明模型内部出现相变。
17. <span id="ref-chatgpt-launch"></span>OpenAI，*Introducing ChatGPT*，2022-11-30。[官方介绍](https://openai.com/index/chatgpt/)。介绍了 GPT-3.5 系列基础、监督微调、RLHF 与对话交互方式。
18. <span id="ref-astra-capabilities"></span>OpenAI，*GPT-6 Astra: A New Generation of Intelligence*，2026-09-03。[发布介绍与演示](https://openai.com/index/gpt-6-astra/)。包括在 KiCad 中进行 PCB 布局布线、前端质量检查和复杂的计算机操作工作流；这些是公开演示和评测案例。
19. <span id="ref-opus55-capabilities"></span>Anthropic，*Introducing Claude Opus 5.5*，2026-09-22。[发布介绍与测试案例](https://www.anthropic.com/claude-opus-5-5)。包括早期测试者的大规模代码迁移与审计、HAProxy 的 C-to-Rust 重写实验；测试条件不等同于一般生产部署。
