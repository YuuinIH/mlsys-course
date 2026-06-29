# 8. 并行策略、通信与拓扑

> 状态：占位草稿。

## 在 MLSys 地图中的位置

- 生命周期位置：主要在训练系统，也会影响大模型推理服务。
- 系统层次：单机多卡、多机多卡、通信库、集群网络和拓扑感知调度。
- 主要资源：显存、GPU 计算、GPU 间带宽、节点间网络、通信调度。
- 典型症状：模型装不下、多卡加速不线性、GPU idle、all-reduce 慢、NCCL hang、跨机吞吐下降。
- 关联模块：模块 3 的显存构成，模块 4 的 GPU 拓扑，模块 7 的训练优化，模块 10 的 LLM Serving，模块 15 的成本和 SLO。

## 核心问题

模型装不下、跑不快以后，系统如何把计算、参数和通信摊到多卡/多机上？

## 这篇文章要补什么

- 用单机多卡或模拟实验观察加速比、通信开销和显存变化。
- 解释 DDP、FSDP、ZeRO 的动机，而不是一开始讲框架 API。
- 讨论学生没有大集群时，如何用缩小实验理解大规模问题。
- 解释 DP、TP、PP、SP、EP、CP 这些并行策略分别切什么、通信什么、适合什么场景。
- 引入 collective：all-reduce、all-gather、reduce-scatter、all-to-all、point-to-point。
- 把拓扑接进来：intra-node / inter-node、PCIe、NVLink、NVSwitch、Ethernet/TCP、InfiniBand、RDMA/RoCE、NCCL。

## 预期产出

- 并行策略、collective 和拓扑关系图
- DDP/FSDP/ZeRO/TP/PP/SP/EP/CP 动机总结
- 可选通信和 scaling 现象记录

## 脚注与参考索引

> 待补：本章参考资料、论文和工程文档。
