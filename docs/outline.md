# MLSys Course 课程设计

本课程追踪一个 ML workload 从代码走向生产系统的全过程。站内学习请从[学习地图](/guide/learning-map)开始；仓库根目录的 `COURSE_OUTLINE.md` 保存完整的课程设计、学习目标和章节说明。

> 站内页面避免复制维护第二份完整大纲。以下是课程结构摘要。

## 核心循环

```text
问题 -> 观察 -> 测量 -> 建立思维模型 -> 理解机制 -> 实验 -> 评估取舍 -> 决策
```

## 七个部分

1. **Systems Thinking for ML**：工作负载、测量、瓶颈与性能推理。
2. **Understanding ML Workloads**：理解计算、内存和 training step 的资源构成。
3. **From One GPU to Distributed Training**：显存权衡、并行、通信与扩展效率。
4. **From Training Script to Cluster**：容器、调度、资源管理与故障恢复。
5. **From Model to Production Service**：延迟、吞吐、排队、KV cache 和服务优化。
6. **Operating ML Systems**：可观测性、SLO、成本与容量规划。
7. **Design an ML System**：基于证据做设计并为取舍辩护。

## 课程边界

技术不会以孤立工具教程的形式出现。Kubernetes、NCCL、vLLM 或 Prometheus 只有在它们帮助解释或解决具体问题时才进入章节；易变的操作步骤归入 Cookbook，可选的底层细节归入 Deep Dive。

实验可以小，但现象必须具有真实系统的形状：能观察到资源竞争、通信、排队、失败、长尾或成本取舍，并明确说明规模限制。
