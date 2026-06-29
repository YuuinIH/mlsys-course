# 10. LLM Serving

> 状态：占位草稿。

## 在 MLSys 地图中的位置

- 生命周期位置：推理系统，尤其是在线 LLM 服务。
- 系统层次：serving runtime、KV cache 管理、调度和多卡推理。
- 主要资源：显存、内存带宽、decode 吞吐、队列、P95/P99 延迟。
- 典型症状：长上下文显存爆、batch 上去后延迟变差、decode 吞吐低、KV cache 挤占可用显存。
- 关联模块：模块 3 的显存构成，模块 8 的并行策略，模块 9 的推理服务基础，模块 15 的成本和 SLO。

## 核心问题

prefill、decode、KV cache、batching 在解决什么？

## 这篇文章要补什么

- 以 vLLM 为主要观察对象，记录 prefill / decode 的延迟差异。
- 观察 KV cache、continuous batching、并发和显存之间的关系。
- 把其他 serving engine 放到对比和扩展阅读里。
- 对比训练显存和推理显存：训练里 activation/optimizer 重要，推理里 KV cache 变成一等资源。

## 预期产出

- LLM serving 现象分析
- KV cache 和 batching 思维模型

## 脚注与参考索引

> 待补：本章参考资料、论文和工程文档。
