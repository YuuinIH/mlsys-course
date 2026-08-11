# 2. 训练和推理为什么给系统不同压力？

> 状态：占位。Part 1 · Understanding ML Workloads

## Incident / Problem

同一个模型在离线评测中运行良好，换成训练或在线服务后却分别遇到 OOM 和长尾延迟。模型相同不代表 workload 相同。

## Workload Characterization

比较 pretraining、post-training、离线推理、在线推理、LLM decode、diffusion 与多模态 pipeline 的计算、状态、同步、输入分布和服务目标。

## Mental Model

用工作集、算术强度、并行性、状态生命周期、到达模式和 deadline 描述 workload，而不是先用框架名分类。

## System Mechanism

解释反向传播、优化器状态、autoregressive decode、采样迭代和多阶段数据变形如何产生不同的系统压力。

## Hands-on Experiment

在统一记录表中观察至少两个小型 workload，控制输入规模并记录 latency、throughput、峰值内存和阶段耗时。

## Engineering Trade-offs

讨论优化目标为何不能直接迁移：训练偏向整体吞吐，在线 serving 受 deadline 与长尾约束，多阶段 pipeline 还会受最慢阶段和背压影响。

## Decision Record

产出一张 workload characterization 表，并据此选择后续测量指标。

## 作业与参考

> 待补：工作负载对比实验，以及训练、生成式推理和在线服务的机制资料。
