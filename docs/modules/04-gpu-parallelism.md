# 4. GPU 与并行直觉

> 状态：占位草稿。

## 在 MLSys 地图中的位置

- 生命周期位置：训练和推理的单机加速层。
- 系统层次：GPU 执行模型、kernel 调度、单机 GPU 拓扑。
- 主要资源：GPU 计算、显存带宽、PCIe、NVLink、kernel launch 时间。
- 典型症状：GPU utilization 看起来高但吞吐低、GPU idle、host 到 device 搬运慢、单机多卡带宽不符合预期。
- 关联模块：模块 3 的内存构成，模块 8 的多卡通信，模块 13 的编译和推理加速。

## 核心问题

GPU 为什么快，又为什么经常利用不好？

## 这篇文章要补什么

- 从 PyTorch 或 serving workload 的 GPU 利用率现象入手。
- 解释 GPU 并行、kernel launch、数据搬运、idle gap 等概念。
- 区分 GPU utilization 高和系统真的快之间的差别。
- 引入单机拓扑：PCIe、NVLink、NVSwitch 这些名字分别在解决什么问题。

## 预期产出

- CPU/GPU 对比实验
- GPU 利用率误区笔记

## 脚注与参考索引

> 待补：本章参考资料、论文和工程文档。
