# MLSys Course 课程设计

## 一句话定位

这门课讲述一个 ML workload 如何从一段代码演化为可扩展、可观测、可在生产环境中运行的系统。

它训练学生调查、理解和设计 ML 系统，而不是背诵现代 AI 基础设施的工具名。

## 学习目标

完成课程后，学生应该能够：

1. 描述训练与推理 workload 的资源需求和性能目标。
2. 设计可信的测量，区分症状、瓶颈与根因。
3. 用最小必要理论估算计算、显存、通信、排队和容量。
4. 解释单机、多卡、集群和在线服务中的关键系统机制。
5. 通过实验比较方案，并明确表达收益、代价与适用边界。
6. 为一个 ML 系统设计收集证据、做出决策并进行答辩。

## 读者与前置知识

课程面向具备本科计算机科学背景的读者，默认熟悉 Linux、Python、基本机器学习、计算机体系结构、操作系统、计算机网络以及基本概率统计。

这些知识不会被完整重讲。正文只在需要时插入 **CS Refresher**，帮助学生把缓存、虚拟内存、网络、控制回路或排队等概念用于当前 MLSys 决策。

## 核心调查循环

```text
Problem
  -> Observe
  -> Measure
  -> Build a mental model
  -> Understand the mechanism
  -> Experiment
  -> Evaluate trade-offs
  -> Decide
```

这条循环贯穿所有章节和最终项目。工具只能作为观察或干预系统的手段，不能替代问题、证据和推理。

## 课程结构

### Part 0 — Systems Thinking for ML

目标：先学会如何调查系统，再进入具体技术。

- **第 0 章：为啥需要 MLSys？** 以一个模型从本地运行走向真实服务的故事，建立 workload、指标、瓶颈、机制与取舍的共同语言。
- **插入章 X：规模效应：从单卡到多卡，从单机到多机。** 从四路 Titan 和 SLI 的非线性扩展出发，建立规模、扩展效率、训练投入与成本的数量级直觉。
- **第 1 章：这个 benchmark 可信吗？** 处理 warmup、异步执行、输入分布、百分位数与可复现性。

### Part 1 — Understanding ML Workloads

目标：看懂系统究竟在执行什么，以及资源花在哪里。

- **第 2 章：训练和推理为什么给系统不同压力？** 比较 pretraining、post-training、在线推理、离线推理与多模态 pipeline。
- **第 3 章：算子很忙，GPU 为什么仍然喂不饱？** 建立计算、内存层次、数据移动与 Roofline 直觉。
- **第 4 章：一个 training step 的时间和显存去了哪里？** 拆解数据加载、前向、反向、优化器和状态。

### Part 2 — From One GPU to Distributed Training

目标：从单卡约束走向多卡扩展，并理解扩展效率为何下降。

- **第 5 章：模型或 batch 装不下时，应该交换什么？** 比较混合精度、梯度累积、activation checkpointing 与状态分片。
- **第 6 章：增加 GPU 为什么没有线性加速？** 用并行策略、collective、通信成本和网络拓扑解释 scaling efficiency。

### Part 3 — From Training Script to Cluster

目标：理解程序如何获得可移植运行环境、资源和故障恢复能力。

- **第 7 章：为什么“在我机器上能跑”还不够？** 从环境漂移和资源边界引出容器。
- **第 8 章：集群有空闲 GPU，任务为什么仍然 pending？** 从资源请求、放置约束和控制循环引出调度。
- **第 9 章：长训练任务失败后，系统如何继续？** 讨论故障域、checkpoint、重试、幂等性与可恢复性。

### Part 4 — From Model to Production Service

目标：从一次函数调用走向面对并发、排队和长尾的服务。

- **第 10 章：平均延迟很好，用户为什么仍然抱怨？** 建立 latency、throughput、queue 与 tail latency 的服务模型。
- **第 11 章：LLM 服务为什么分成 prefill 和 decode？** 解释 KV cache、continuous batching 与调度。
- **第 12 章：多模态和生成式 pipeline 为什么难以稳定服务？** 拆解阶段不均衡、数据变形和端到端背压。
- **第 13 章：量化、batching 和 autoscaling 应该先做哪个？** 通过瓶颈证据选择优化，而不是列举技术。

### Part 5 — Operating ML Systems

目标：让系统的健康、可靠性、容量和成本变得可观察、可管理。

- **第 14 章：系统看起来正常，为什么 SLO 仍然失守？** 从问题出发选择 metrics、logs、traces 和告警。
- **第 15 章：云账单为什么突然上升？** 联结 SLO、容量规划、利用率、单位经济性与风险余量。

### Part 6 — Design an ML System

- **第 16 章：设计并为一个 ML 系统辩护。** 学生提交 workload、测量、估算、实验、架构、故障分析和取舍记录，并接受设计答辩。

## 统一章节结构

除作为课程入口的第 0 章外，正文各章使用同一条叙事顺序。第 0 章以连续故事介绍课程问题与调查方法，并在结尾进入第 1 章的测量主线。

1. Incident / Problem
2. Workload Characterization
3. Mental Model
4. System Mechanism
5. Hands-on Experiment
6. Engineering Trade-offs
7. Decision Record

理论只在能够带来估算能力、直觉或 sanity check 时进入主线。CLI 命令、框架 API 和安装步骤进入 Cookbook；复杂内核与协议细节进入 Deep Dive。

## 实验原则

实验必须 **toy-scale, production-shaped**：

- 一个实验主要验证一个问题。
- 明确环境、输入、warmup、重复次数和统计方法。
- 先记录观察，再提出解释。
- 同时提供低算力核心路径和必要时的 GPU / 集群选做路径。
- 产出至少包含假设、原始指标摘要、瓶颈判断、机制解释和决策。

课程不会把小实验包装成大规模生产经验。Reality Check 必须说明哪些现象可以迁移，哪些结论受规模与环境限制。

## 内容边界

课程不是 Kubernetes、CUDA、LLM serving 或 MLOps 的独立教程，也不是框架与论文百科。

技术进入正文前必须回答：

- 它解决了什么可观察问题？
- 它依赖哪些假设？
- 它改变了哪些指标？
- 它引入了什么代价和新故障模式？
- 在什么条件下不应该使用？

工具会过时；调查未知系统的方法不应随工具一起过时。
