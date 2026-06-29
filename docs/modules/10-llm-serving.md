# 10. LLM Serving

> 状态：占位草稿。

## 核心问题

prefill、decode、KV cache、batching 在解决什么？

## 这篇文章要补什么

- 以 vLLM 为主要观察对象，记录 prefill / decode 的延迟差异。
- 观察 KV cache、continuous batching、并发和显存之间的关系。
- 把其他 serving engine 放到对比和扩展阅读里。

## 预期产出

- LLM serving 现象分析
- KV cache 和 batching 思维模型
