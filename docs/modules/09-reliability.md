# 9. 长训练任务失败后，系统如何继续？

> 状态：占位。Part 3 · From Training Script to Cluster

## Incident / Problem

运行数小时的分布式训练因单节点故障退出。自动重试从头开始，浪费了此前全部计算。

## Workload Characterization

明确任务时长、状态大小、故障率、同步参与者、可重复输入和恢复时间目标。

## Mental Model

用故障域、MTTF / MTTR、checkpoint interval、幂等性和 wasted work 权衡恢复成本。

## System Mechanism

解释进程、节点、网络和存储故障如何传播；checkpoint、重试、租约、健康检查和 elastic membership 如何改变恢复路径。

## Hands-on Experiment

对带状态的小任务注入终止、损坏 checkpoint 或重复执行，比较无恢复、定期 checkpoint 和幂等重试。

## Engineering Trade-offs

更频繁 checkpoint 减少丢失工作，但增加 I/O 与存储成本；自动重试提高可用性，也可能放大确定性错误。

## Decision Record

产出故障域表、恢复目标、checkpoint 策略和禁止自动重试的错误类型。

## 作业与参考

> 待补：故障注入实验、checkpoint Cookbook 和可靠性资料。
