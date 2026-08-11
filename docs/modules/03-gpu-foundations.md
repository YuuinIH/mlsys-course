# 3. 算子很忙，GPU 为什么仍然喂不饱？

> 状态：占位。Part 1 · Understanding ML Workloads

## Incident / Problem

profiler 显示算子持续执行，但性能仍远低于硬件标称峰值。增加计算单元没有解决数据供给问题。

## Workload Characterization

描述算子形状、dtype、batch、数据复用、访问连续性，以及计算量与数据移动量。

## Mental Model

用 latency、bandwidth、算术强度和 Roofline 直觉判断 workload 更像 compute-bound 还是 memory-bound，并进行数量级 sanity check。

## System Mechanism

解释 GPU 执行与内存层次、HBM、cache、host-device transfer 和 kernel launch，只保留能说明观测结果的部分。

## Hands-on Experiment

改变矩阵形状、batch 或数据复用，测量吞吐与传输开销；将观测结果与简单 Roofline 上界比较。

## Engineering Trade-offs

算子融合、缓存和更大 batch 可能提高复用，但会增加内存、延迟或实现复杂度。

## Decision Record

产出“计算还是数据移动”判断及下一项 profiler 证据需求。

## 作业与参考

> 待补：可在 CPU 复现的数据局部性实验、GPU 选做实验和体系结构资料。
