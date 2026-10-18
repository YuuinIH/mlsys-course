---
title: "前缀缓存与计算复用"
level: L2
status: outline
topics: ["推理系统", "性能与测量"]
---

# 4. 前缀缓存与计算复用

> 提纲，正文尚未开始。

从反复出现的系统提示词或多轮对话切入，介绍 Prefix Caching 能节省什么，以及缓存命中为什么取决于真实请求。必要时比较 vLLM、SGLang 的配置入口和使用条件。

区分减少 Prefill 重复工作与提升 Decode 速度；不深入 Radix Tree、Hash 表等缓存实现。

[返回本章目录](./index.md)
