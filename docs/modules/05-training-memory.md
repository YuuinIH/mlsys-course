# 5. 模型或 batch 装不下时，应该交换什么？

> 状态：占位。Part 2 · From One GPU to Distributed Training

## Incident / Problem

目标 batch 或序列长度触发 OOM。团队提出混合精度、梯度累积、activation checkpointing 和状态分片，但没有先判断哪部分显存占主导。

## Workload Characterization

记录模型规模、序列长度、microbatch、目标 global batch、dtype、激活形状和优化器状态。

## Mental Model

把显存、额外计算、通信、数值风险和吞吐看作可交换资源；先用账本估算，再用测量校正。

## System Mechanism

解释 AMP、gradient accumulation、activation recomputation 与 optimizer/state sharding 分别改变了哪个生命周期和数据量。

## Hands-on Experiment

选择两个手段，固定有效 batch，比较峰值显存、step time、吞吐与数值行为。

## Engineering Trade-offs

省显存不等于加速：重计算会增加 FLOPs，累积会降低更新频率，分片会引入通信，低精度会改变数值边界。

## Decision Record

根据显存账本选择最小干预，并记录重新评估条件。

## 作业与参考

> 待补：低算力模拟、GPU 对比实验和训练内存优化资料。
