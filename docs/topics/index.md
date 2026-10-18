# 主题地图 · Topics

这是一张按**系统问题**组织的知识地图，而非课程课时表。下列「候选问题」并不表示文章已经存在，也不是必须逐项填空的 TODO。每篇文章可以跨多个主题，实际覆盖请看右侧「当前文章」。**左侧导航中的主题链接指向规划地图，缩进的 L1/L2 文章才代表已有可读正文。**

## I · 认识系统 {#stage-systems}

| 主题 | 核心问题 | 当前可读文章 |
| --- | --- | --- |
| <span id="topic-workloads"></span>**工作负载与系统思维** | 模型之外，系统真正承担什么？不同 ML 工作负载为什么需要不同设计？ | [为啥需要 MLSys？](/modules/00-systems-thinking) |
| <span id="topic-execution"></span>**执行路径与硬件约束** | 框架如何把张量表达映射到 CPU、GPU、显存与网络？ | 暂无独立文章 |
| <span id="topic-measurement"></span>**通用测量方法与实验设计** | 如何选择测量对象、校准实验条件、避免基准测试陷阱？如何理解吞吐、延迟、利用率与扩展效率的一般意义？ | 暂无独立文章 |

## II · 让模型训练 {#stage-training}

| 主题 | 核心问题 | 当前可读文章 |
| --- | --- | --- |
| <span id="topic-single-training"></span>**单机训练与数据供给** | 一个 Step 在计算什么，数据流水线和显存怎样阻碍训练？ | 暂无独立文章 |
| <span id="topic-distributed-training"></span>**分布式训练与通信** | 并行为什么不等于线性加速，通信与网络拓扑怎样改变设计？ | [规模效应：算力、能力与成本](/modules/0X-scaling)（扩展与成本视角） |
| <span id="topic-post-training"></span>**后训练与模型迭代** | SFT、偏好优化与 RL 等流程在 Rollout、训练、评估和版本协调上有什么系统代价？ | 暂无独立文章 |

## III · 让模型服务 {#stage-serving}

| 主题 | 核心问题 | 当前可读文章 |
| --- | --- | --- |
| <span id="topic-inference"></span>**推理引擎与请求调度** | 推理怎样变成多用户服务，Batching 与 Prefill/Decode 怎样改变资源需求？ | [为什么需要专门的 LLM 推理引擎？](/essays/serving-tuning/00-why-inference-engines) |
| <span id="topic-serving-performance"></span>**推理性能与调优** | 如何测量 TTFT、TPOT、吞吐、Goodput 与尾延迟？怎样据此调整并发、显存预算和工作负载配置？ | [推理服务性能测量](/essays/serving-tuning/01-what-is-fast)；[推理服务调优系列](/essays/serving-tuning/)（其余章节编写中） |
| <span id="topic-state"></span>**缓存、状态与数据移动** | 哪些状态值得保留，KV Cache 何时复用、迁移或失效？ | [推理引擎导论](/essays/serving-tuning/00-why-inference-engines)（部分涉及），尚无独立文章 |

## IV · 让平台运行 {#stage-platform}

| 主题 | 核心问题 | 当前可读文章 |
| --- | --- | --- |
| <span id="topic-orchestration"></span>**部署、编排与调度** | 从本地进程到容器和集群，如何提供隔离、资源调度与可维护的控制面？ | [为啥需要 MLSys？](/modules/00-systems-thinking)（导论案例） |
| <span id="topic-reliability"></span>**可靠性、可观测性与安全** | 如何发现故障、控制尾延迟、处理版本与状态恢复、兑现服务承诺？ | 暂无独立文章 |

## V · 让工程可持续 {#stage-engineering}

| 主题 | 核心问题 | 当前可读文章 |
| --- | --- | --- |
| <span id="topic-cost"></span>**容量、成本与架构决策** | 如何将 SLO、GPU/内存/网络开销、利用率与美元成本放在一起决策？ | [规模效应：算力、能力与成本](/modules/0X-scaling) |
| <span id="topic-organization"></span>**软件工程与组织协作** | 系统怎样交付与长期维护，谁决定资源优先级，团队责任如何反过来改变技术方案？ | 暂无独立文章 |

## 几个重要边界

**通用测量**关注实验方法和证据的可迁移性；**推理性能**属于模型服务场景，TTFT/TPOT、Goodput 等指标及调优在 III 中讨论。**后训练**讨论系统工作负载与协同，不重复机器学习优化算法课；**状态一等资源**是一种值得检验的设计视角，而不是预设正确的结论；**组织协作**关注激励、责任、交付和工程现实，而非职场应酬技巧。

以上归类的「当前文章」只表示**涉及**相应问题，不代表已经覆盖全主题。本站目前共有 **4 篇可读初稿**，其余历史编号文件主要是占位规划，不计入完成数量。有关候选文章及五段式理解主线，参见[课程设计大纲](https://github.com/YuuinIH/mlsys-course/blob/main/COURSE_OUTLINE.md)。

从已有内容开始请访问[专题文章](/essays/)；按建议顺序读请访问[学习路径](/paths/)。
