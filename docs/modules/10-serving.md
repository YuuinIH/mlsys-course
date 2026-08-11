# 10. 平均延迟很好，用户为什么仍然抱怨？

> 状态：占位。Part 4 · From Model to Production Service

## Incident / Problem

服务平均延迟满足目标，但高峰期请求频繁超时。平均值掩盖了排队和长尾。

## Workload Characterization

描述请求到达过程、输入分布、service time、并发、deadline、可批处理性和冷启动。

## Mental Model

区分 queueing time 与 service time，建立 utilization、throughput、P50 / P95 / P99 和 Little's Law 直觉。

## System Mechanism

解释请求队列、worker、batcher、模型加载、backpressure 与 timeout 如何构成端到端延迟。

## Hands-on Experiment

用可控 service time 的小服务改变并发与 batch，记录吞吐、排队时间和 percentile，观察饱和点前后的变化。

## Engineering Trade-offs

batching 提高吞吐但增加等待；更多副本降低排队却增加成本和冷启动；限流保护系统但会拒绝工作。

## Decision Record

产出压测报告、SLO 边界、最大安全并发与过载策略。

## 作业与参考

> 待补：CPU 队列实验、真实模型选做路径和 serving / queueing 资料。
