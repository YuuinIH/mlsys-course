# 学习地图

课程不是工具目录，而是一条连续的工程旅程：

```text
代码 -> 理解 workload -> 单卡测量 -> 分布式训练
     -> 集群任务 -> 生产服务 -> 持续运维 -> 系统设计
```

状态说明：

- **占位**：问题、实验和产出已定义，正文尚不能独立学习。
- **初稿**：已有可读正文，仍缺实验结果、图表或参考证据。
- **待实验验证**：解释已形成，但关键实验尚未复现或复查。
- **可学习**：正文、实验、边界与参考资料均已达到学习要求。

当前 17 章均为 **占位**。页面用于约束后续写作方向，不代表课程内容已经完成。

## Part 0 — Systems Thinking for ML

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 0 | [GPU 利用率只有 30% 时，先问什么？](/modules/00-systems-thinking) | 调查画布与第一份证据记录 | 占位 |
| 1 | [这个 benchmark 可信吗？](/modules/01-measurement) | 可复现 benchmark 与测量审计 | 占位 |

## Part 1 — Understanding ML Workloads

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 2 | [训练和推理为什么给系统不同压力？](/modules/02-workloads) | workload characterization 表 | 占位 |
| 3 | [算子很忙，GPU 为什么仍然喂不饱？](/modules/03-gpu-foundations) | Roofline / 数据移动判断 | 占位 |
| 4 | [一个 training step 的时间和显存去了哪里？](/modules/04-training-anatomy) | step timeline 与显存账本 | 占位 |

## Part 2 — From One GPU to Distributed Training

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 5 | [模型或 batch 装不下时，应该交换什么？](/modules/05-training-memory) | 显存—计算—吞吐对比 | 占位 |
| 6 | [增加 GPU 为什么没有线性加速？](/modules/06-distributed-training) | scaling efficiency 与通信估算 | 占位 |

## Part 3 — From Training Script to Cluster

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 7 | [为什么“在我机器上能跑”还不够？](/modules/07-containers) | 可移植 workload 契约 | 占位 |
| 8 | [集群有空闲 GPU，任务为什么仍然 pending？](/modules/08-cluster-scheduling) | 调度诊断与资源请求修正 | 占位 |
| 9 | [长训练任务失败后，系统如何继续？](/modules/09-reliability) | 故障域与恢复策略 | 占位 |

## Part 4 — From Model to Production Service

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 10 | [平均延迟很好，用户为什么仍然抱怨？](/modules/10-serving) | 并发压测与长尾分析 | 占位 |
| 11 | [LLM 服务为什么分成 prefill 和 decode？](/modules/11-llm-serving) | KV cache / batching 取舍 | 占位 |
| 12 | [多模态和生成式 pipeline 为什么难以稳定服务？](/modules/12-multimodal-serving) | 端到端 stage profile | 占位 |
| 13 | [量化、batching 和 autoscaling 应该先做哪个？](/modules/13-serving-optimization) | 基于瓶颈的优化决策 | 占位 |

## Part 5 — Operating ML Systems

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 14 | [系统看起来正常，为什么 SLO 仍然失守？](/modules/14-observability) | 指标、日志、追踪与告警设计 | 占位 |
| 15 | [云账单为什么突然上升？](/modules/15-cost-capacity-slo) | 容量计划与单位成本模型 | 占位 |

## Part 6 — Design an ML System

| 章 | 事件 / 问题 | 关键产出 | 状态 |
| --- | --- | --- | --- |
| 16 | [设计并为一个 ML 系统辩护](/modules/16-final-project) | 设计报告、实验附件与答辩 | 占位 |

## 内容类型

每章主线之外只使用四种标记：**CS Refresher**、**Cookbook**、**Deep Dive** 和 **Reality Check**。它们帮助读者区分稳定原理、易变操作、选修细节和真实规模约束。
