# 14. 系统看起来正常，为什么 SLO 仍然失守？

> 状态：占位。Part 5 · Operating ML Systems

## Incident / Problem

CPU 和 GPU dashboard 没有明显异常，但用户错误率与 P99 延迟已经超标。资源指标不能完整代表用户体验。

## Workload Characterization

明确用户旅程、同步 / 异步边界、多阶段依赖、模型版本、输入分布和需要保护的 SLI / SLO。

## Mental Model

从待回答的问题选择 metrics、logs 与 traces；用 RED / USE、error budget 和观测开销建立最小可用信号集。

## System Mechanism

解释指标聚合、label cardinality、结构化日志、trace context、采样、告警窗口与控制回路。

## Hands-on Experiment

给小服务注入慢请求和错误依赖，比较只有平均资源指标与加入请求指标、日志关联和 trace 后的诊断路径。

## Engineering Trade-offs

更多 telemetry 提高可解释性，也增加成本、噪声和隐私风险；更灵敏告警缩短发现时间，却提高误报。

## Decision Record

产出 SLI / SLO、最小 dashboard、告警规则和 incident 调查顺序。

## 作业与参考

> 待补：故障观测实验、工具 Cookbook 和 observability / SRE 资料。
