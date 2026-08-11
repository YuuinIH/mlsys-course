# 4. 一个 training step 的时间和显存去了哪里？

> 状态：占位。Part 1 · Understanding ML Workloads

## Incident / Problem

模型参数看起来能装进显存，但训练一开始就 OOM；即使不 OOM，GPU 也周期性空闲。

## Workload Characterization

训练是长运行、重复迭代且包含前向、反向、优化器和数据输入的 workload；目标通常是 samples/sec、tokens/sec 或 time-to-train。

## Mental Model

建立 step time 分解和显存账本：参数、梯度、优化器状态、激活、临时 buffer 与碎片。

## System Mechanism

解释 autograd 生命周期、数据加载、host-device copy、同步点和优化器更新如何形成 timeline 与峰值显存。

## Hands-on Experiment

profile 一个小型 training step，标注数据等待、forward、backward、optimizer，并估算与测量各类显存。

## Engineering Trade-offs

prefetch、更多 worker 和 pinned memory 可能减少等待，但增加 CPU、内存和数据管线复杂度。

## Decision Record

产出 step timeline、显存账本和首要瓶颈判断。

## 作业与参考

> 待补：单机 training step 实验和训练运行时资料。
