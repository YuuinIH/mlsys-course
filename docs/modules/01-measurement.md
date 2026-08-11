# 1. 这个 benchmark 可信吗？

> 状态：占位。Part 0 · Systems Thinking for ML

## Incident / Problem

两位同学测试同一项优化，分别得到 25% 加速和 5% 变慢。两份结果都缺少 warmup、同步和输入分布记录。

## Workload Characterization

明确被测对象、稳态与冷启动、同步与异步执行、输入长度分布、并发水平，以及指标要代表的真实请求或训练阶段。

## Mental Model

区分 latency、throughput、utilization、service time、queueing time 与 tail percentile；用重复测量和方差表达不确定性。

## System Mechanism

解释缓存、JIT、异步设备执行、动态频率、内存分配和排队如何污染测量。

## Hands-on Experiment

故意制作一个错误 benchmark，再逐项加入 warmup、设备同步、固定环境、重复试验和 percentile 统计，比较结论如何变化。

## Engineering Trade-offs

测量越严格，成本越高；关键是让精度匹配决策风险。Reality Check 需说明 microbenchmark 不能自动代表端到端系统。

## Decision Record

产出 benchmark 模板、实验清单和一份对旧结果的测量审计。

## 作业与参考

> 待补：CPU 必做路径、GPU 异步计时选做路径与 benchmark 方法资料。
