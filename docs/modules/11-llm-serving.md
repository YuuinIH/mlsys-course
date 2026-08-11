# 11. LLM 服务为什么分成 prefill 和 decode？

> 状态：占位。Part 4 · From Model to Production Service

## Incident / Problem

短 prompt 请求被长 prompt 或长输出请求拖慢；GPU 仍有计算活动，但交互体验不稳定。

## Workload Characterization

LLM 请求具有不同 prompt / output 长度，prefill 更易形成大规模并行计算，decode 逐 token 推进并持有会增长的状态。

## Mental Model

使用 time-to-first-token、inter-token latency、tokens/sec、KV cache bytes/token 和调度公平性描述服务。

## System Mechanism

解释 autoregressive execution、KV cache、paged memory、continuous batching 和 request scheduling 如何影响吞吐与长尾；vLLM 作为观察载体而不是课程目标。

## Hands-on Experiment

改变 prompt 长度、输出长度与并发，分别记录 TTFT、ITL、tokens/sec 和 cache 压力，并解释阶段差异。

## Engineering Trade-offs

更激进 batching 提高吞吐但可能损害交互延迟；更大 cache 提高并发但挤占模型与工作空间；公平调度可能降低总吞吐。

## Decision Record

产出面向目标 workload 的 batch、cache 与调度策略，并标明过载行为。

## 作业与参考

> 待补：模拟核心路径、vLLM Cookbook 和 LLM serving 论文 / 文档。
