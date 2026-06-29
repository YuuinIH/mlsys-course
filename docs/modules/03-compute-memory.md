# 3. 计算、内存与矩阵乘

> 状态：占位草稿。

## 核心问题

profiler 里看到的算子瓶颈从哪里来？

## 这篇文章要补什么

- 从成熟 workload 的 profiler 结果里挑一个 tensor op 或 matmul 现象。
- 解释计算量、内存访问、带宽、算子形态和实际耗时之间的关系。
- 避免一上来手写 kernel，把矩阵乘作为理解瓶颈的显微镜。

## 预期产出

- tensor op 性能观察
- compute-bound / memory-bound 判断笔记
