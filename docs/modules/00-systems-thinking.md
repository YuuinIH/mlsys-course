# 0. GPU 利用率只有 30% 时，先问什么？

> 状态：占位。Part 0 · Systems Thinking for ML

## Incident / Problem

训练任务比预期慢一倍，监控显示 GPU utilization 约为 30%。团队立刻提出“换更快 GPU”，但还没有人定义慢的是哪个目标，也没有证据说明 GPU 是根因。

## Workload Characterization

- 生命周期：训练；长运行、迭代式 workload。
- 目标：缩短 time-to-train，同时守住正确性和预算。
- 候选约束：数据输入、CPU、GPU 计算、显存、同步与测量误差。

## Mental Model

区分 **症状、指标、瓶颈、机制、干预和决策**。系统性能由最紧的约束决定；单个 utilization 数字不能独立定位它。

## System Mechanism

建立 ML 系统资源链路：数据进入框架运行时，经 CPU 准备和设备传输，触发算子与通信，最终形成用户可见的吞吐、延迟、成本和可靠性。

## Hands-on Experiment

运行一个小型成熟 workload，分别记录 wall time、样本吞吐、CPU、内存和设备活动。一次只改变一个因素，用证据写出两个竞争性假设。

## Engineering Trade-offs

比较“先测量”“直接扩容”“先改代码”的信息收益、时间成本和误判风险。Reality Check 需说明本地 utilization 与共享生产集群指标的差异。

## Decision Record

产出一页调查画布：目标、现象、证据、假设、下一项最便宜的验证实验和停止条件。

## 作业与参考

> 待补：一个低算力观察实验，以及支持性能调查方法的参考资料。
