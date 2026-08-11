# 12. 多模态和生成式 pipeline 为什么难以稳定服务？

> 状态：占位。Part 4 · From Model to Production Service

## Incident / Problem

单独测试每个模型阶段都满足延迟目标，组合成图像、文本或 diffusion pipeline 后端到端延迟却波动明显。

## Workload Characterization

记录解码、预处理、encoder、denoiser / decoder、后处理等阶段的输入变形、资源类型、状态与并发能力。

## Mental Model

使用 stage service time、最慢阶段、pipeline parallelism、buffer、backpressure 和端到端 critical path 分析系统。

## System Mechanism

解释跨阶段序列化、CPU / GPU 切换、数据复制、不同 batch 需求和迭代采样如何形成气泡与队列。

## Hands-on Experiment

构造三阶段 toy pipeline 或缩减成熟 pipeline，分别 profile 阶段与端到端延迟，再制造一个阶段变慢观察背压传播。

## Engineering Trade-offs

拆分服务提高独立扩缩与故障隔离，却增加网络传输、序列化和版本协调；合并阶段减少开销但耦合资源。

## Decision Record

产出阶段耗时图、数据边界、瓶颈阶段和合并 / 拆分决策。

## 作业与参考

> 待补：toy pipeline、diffusers / multimodal 选做 Cookbook 与流水线资料。
