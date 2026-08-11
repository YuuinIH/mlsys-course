# 15. 云账单为什么突然上升？

> 状态：占位。Part 5 · Operating ML Systems

## Incident / Problem

流量仅增长 20%，月度 GPU 账单却增长 80%。系统仍满足平均延迟，但闲置副本、重试和低效 batch 正在放大成本。

## Workload Characterization

记录需求曲线、输入 / 输出分布、峰谷、服务等级、设备类型、利用率、失败与重试，以及每单位工作的资源消耗。

## Mental Model

联结单位成本、容量、headroom、利用率、排队与 error budget；用数量级估算而非虚假精度进行容量规划。

## System Mechanism

解释 autoscaling signal / lag、bin packing、预留与弹性容量、冷启动、重试放大和多租户隔离如何影响账单与 SLO。

## Hands-on Experiment

基于一份合成流量和 benchmark 数据，比较固定容量、阈值扩缩与带 headroom 的计划，模拟需求突增和设备故障。

## Engineering Trade-offs

更高利用率降低单位成本，却减少故障和突发余量；更强隔离提高可预测性，却降低资源共享；低价容量可能带来中断风险。

## Decision Record

产出容量计划、单位经济性、风险余量和成本异常调查表。

## 作业与参考

> 待补：表格化容量实验、云定价 Reality Check 和容量 / SLO 资料。
