# 7. 为什么“在我机器上能跑”还不够？

> 状态：占位。Part 3 · From Training Script to Cluster

## Incident / Problem

训练脚本在开发机正常运行，换到另一台 GPU 节点后因驱动、系统库、依赖和路径差异失败。

## Workload Characterization

区分代码、用户态依赖、模型与数据、运行参数、设备能力、内核 / 驱动以及外部存储。

## Mental Model

把容器视为 workload 契约和隔离边界，而不是轻量虚拟机；明确镜像负责什么、宿主机仍负责什么。

## System Mechanism

用 namespace、cgroup、分层镜像、mount 和 GPU device / runtime 解释可移植性与资源边界。

## Hands-on Experiment

把一个小型训练脚本放入容器，固定依赖与入口；故意制造缺失 mount、错误资源限制或不兼容运行环境并诊断。

## Engineering Trade-offs

更强隔离提高可重复性和安全性，但镜像体积、构建时间、缓存、数据访问和驱动兼容性会增加复杂度。

## Decision Record

产出可移植 workload 契约：镜像、命令、资源、数据、输出与兼容性假设。

## 作业与参考

> 待补：CPU 核心实验、GPU runtime 选做 Cookbook 和容器机制资料。
