# 2. 性能指标、Profiler 与 Benchmark

> 状态：占位草稿。

## 在 MLSys 地图中的位置

- 生命周期位置：待补。
- 系统层次：待补。
- 主要资源：待补。
- 典型症状：待补。
- 关联模块：待补。

## 核心问题

怎么知道慢在哪里，测得准不准？

## 这篇文章要补什么

- 区分 latency、throughput、P95/P99、GPU utilization、显存峰值等指标。
- 讲清 warmup、同步、缓存、输入分布、batch size、并发数为什么会影响 benchmark。
- 用 `torch.profiler` 或服务指标读一次真实 trace。

## 预期产出

- 指标速查
- benchmark 模板
- profiler 解读笔记

## 脚注与参考索引

> 待补：本章参考资料、论文和工程文档。
