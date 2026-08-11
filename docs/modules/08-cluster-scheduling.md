# 8. 集群有空闲 GPU，任务为什么仍然 pending？

> 状态：占位。Part 3 · From Training Script to Cluster

## Incident / Problem

监控显示集群还有 GPU，但一个多卡任务长时间 pending。空闲总量不等于存在满足约束的可行放置。

## Workload Characterization

训练任务通常长运行、gang-like、设备稀缺且对本地存储、网络拓扑或节点标签敏感。

## Mental Model

把调度理解为在资源请求、放置约束、公平性和碎片之间寻找可行解；把控制系统理解为 desired state 与 observed state 的持续收敛。

## System Mechanism

从 pending 事件引出 Pod、资源 requests / limits、scheduler filter / score、quota、taint / affinity 与 reconciliation，而不是孤立讲 Kubernetes 对象。

## Hands-on Experiment

在本地小集群或调度模拟器中制造不可满足请求、资源碎片和放置冲突，读取事件并提出最小修正。

## Engineering Trade-offs

更严格放置提高局部性能和隔离，却降低整体利用率与调度成功率；preemption 提高优先级保障，也会浪费已完成工作。

## Decision Record

产出 pending 诊断树、修正后的资源请求和对公平性 / 利用率的影响说明。

## 作业与参考

> 待补：调度模拟核心路径、Kubernetes Cookbook 与资源管理资料。
