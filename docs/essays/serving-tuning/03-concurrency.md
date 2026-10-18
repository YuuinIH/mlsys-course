---
title: "一个人用挺快，为什么人一多就卡？"
level: L2
status: outline
topics: ["推理系统", "性能与测量"]
---

# 3. 一个人用挺快，为什么人一多就卡？

> 提纲，正文尚未开始。

读者已经能发请求了，接着模拟几个人同时调用：为什么请求会排队，推理引擎又怎样把不同请求放到同一轮计算里？介绍 Continuous Batching、调度预算、并发数和 Chunked Prefill 的使用语境。

说明“更大 Batch”不等于“每个人都更快”；不深入 Scheduler 源码或 CUDA Kernel。

[返回本章目录](./index.md)
