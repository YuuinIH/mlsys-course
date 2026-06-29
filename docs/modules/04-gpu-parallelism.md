# 4. GPU 与并行直觉

> 状态：占位草稿。

## 核心问题

GPU 为什么快，又为什么经常利用不好？

## 这篇文章要补什么

- 从 PyTorch 或 serving workload 的 GPU 利用率现象入手。
- 解释 GPU 并行、kernel launch、数据搬运、idle gap 等概念。
- 区分 GPU utilization 高和系统真的快之间的差别。

## 预期产出

- CPU/GPU 对比实验
- GPU 利用率误区笔记
