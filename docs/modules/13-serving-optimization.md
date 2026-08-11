# 13. 量化、batching 和 autoscaling 应该先做哪个？

> 状态：占位。Part 4 · From Model to Production Service

## Incident / Problem

服务没有达到 SLO，团队同时提出量化、编译、缓存、batching 和扩容。缺少瓶颈证据时，优化清单不能形成决策顺序。

## Workload Characterization

先确定是计算、内存容量、内存带宽、排队、冷启动还是副本容量限制，并记录质量与成本约束。

## Mental Model

把每项优化映射到它改变的资源、指标和瓶颈；只有缩短 critical path 或解除当前约束的优化才可能改善目标。

## System Mechanism

按问题解释量化、编译 / fusion、缓存、batching、replication 和 autoscaling，明确各自假设与新故障模式。

## Hands-on Experiment

为同一服务选择两项优化，固定 workload 比较目标指标、质量、资源与成本，验证“局部更快”是否改善端到端 SLO。

## Engineering Trade-offs

量化可能改变质量和硬件兼容性；batching 交换延迟；autoscaling 受观测滞后与冷启动限制；编译提高峰值性能却增加构建复杂度。

## Decision Record

产出按证据排序的优化 backlog，以及每项优化的成功指标和回滚条件。

## 作业与参考

> 待补：至少一个可复现实验，以及按瓶颈组织的优化参考资料。
