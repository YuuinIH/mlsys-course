# 6. 增加 GPU 为什么没有线性加速？

> 状态：占位。Part 2 · From One GPU to Distributed Training

## Incident / Problem

训练从 1 张 GPU 扩到 8 张后，吞吐只提高了 3 倍；继续增加 GPU 的收益越来越小。

## Workload Characterization

说明模型能否单卡容纳、计算与通信比例、同步频率、global batch 约束和网络拓扑。

## Mental Model

使用 speedup、scaling efficiency、critical path 和简化通信成本模型估算扩展上界。

## System Mechanism

从数据并行出发，解释 all-reduce、bucket、overlap、tensor / pipeline / state parallelism，以及 NCCL 如何利用拓扑完成 collective。

## Hands-on Experiment

在多进程 CPU、单机多卡或模拟器上改变 worker 数量、消息大小和同步频率，绘制吞吐与效率曲线。

## Engineering Trade-offs

更多设备增加容量，也增加通信、同步、故障面和成本；更复杂的并行策略会增加气泡与调试难度。

## Decision Record

产出并行策略、通信估算、拓扑假设以及“何时停止扩容”的条件。

## 作业与参考

> 待补：toy collective 实验、GPU 集群选做路径和分布式训练资料。
