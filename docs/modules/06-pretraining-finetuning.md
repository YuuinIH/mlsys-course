# 6. 预训练与微调系统

> 状态：占位草稿。

## 核心问题

tokens/sec、batch、序列长度、显存之间怎么权衡？

## 这篇文章要补什么

- 用现成训练栈上的缩减 workload 观察 pretraining / fine-tuning 的系统变量。
- 讨论 tokenizer、packing、checkpoint、loss curve、tokens/sec 和显存。
- 强调不是教大家从零训大模型，而是看懂训练系统在忙什么。

## 预期产出

- pretraining / fine-tuning 分析笔记
- 训练成本和资源权衡表
