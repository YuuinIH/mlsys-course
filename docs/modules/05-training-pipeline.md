# 5. 深度学习训练流水线

> 状态：占位草稿。

## 核心问题

一个 training step 的时间花在哪里？

## 这篇文章要补什么

- 用现成 PyTorch / Hugging Face 训练脚本拆解 DataLoader、forward、backward、optimizer。
- 观察 batch size、DataLoader worker、AMP 对吞吐和显存的影响。
- 训练学生用 profiler 解释训练慢在哪里。

## 预期产出

- training step profiling 报告
- 训练瓶颈排查清单
