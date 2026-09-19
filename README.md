# MLSys Course

这是一门以工程问题为主线的机器学习系统课程，目前处于 **Alpha 阶段**。

课程追踪一个 ML workload 的完整演化过程：它如何从一段能运行的代码，逐步成为可扩展、可观测、可在生产环境中运行的系统。

```text
问题 -> 观察 -> 测量 -> 建立思维模型 -> 理解机制 -> 实验 -> 评估取舍 -> 做出决策
```

## 课程定位

这门课训练的是调查、理解和设计 ML 系统的能力，而不是记忆今天流行的 AI Infra 工具。

每项技术都应由问题引出。例如，不单独开一章罗列 Kubernetes 概念，而是先问：为什么集群明明有 GPU，任务却一直处于 pending？然后再学习资源请求、调度和控制循环如何共同解释这个现象。

## 适合谁

课程面向具备本科计算机基础的读者，默认熟悉：

- Linux 与 Python
- 基本机器学习概念
- 计算机体系结构、操作系统与计算机网络
- 基本概率与统计

课程不会重讲完整的本科基础课。需要时会提供简短的 **CS Refresher**，帮助读者把已有知识迁移到 MLSys 问题中。

## 七个部分

| Part | 核心问题 |
| --- | --- |
| 0. Systems Thinking for ML | 面对一个陌生系统，应该先问什么、测什么？ |
| 1. Understanding ML Workloads | 系统实际上需要完成什么工作？ |
| 2. From One GPU to Distributed Training | 为什么增加 GPU 后，扩展开始变难？ |
| 3. From Training Script to Cluster | 一段程序如何成为可调度、可恢复的 ML workload？ |
| 4. From Model to Production Service | 为什么模型能推理，不代表服务可用？ |
| 5. Operating ML Systems | 如何判断系统健康、可靠且成本合理？ |
| 6. Design an ML System | 如何用证据为系统设计辩护？ |

完整课程路径见[学习地图](docs/guide/learning-map.md)，课程设计说明见[课程大纲](COURSE_OUTLINE.md)。

## 内容形态

正文会明确标记四类辅助内容：

- **CS Refresher**：回顾解决当前问题所需的本科知识。
- **Cookbook**：可操作但容易随工具变化的步骤。
- **Deep Dive**：不影响主线的进阶机制。
- **Reality Check**：把玩具规模实验与真实生产约束连接起来。

实验遵循 **toy-scale, production-shaped**：可以只用本地机器、单张 GPU 或小集群，但观察到的排队、通信、显存、失败与取舍应具有生产系统的形状。

## 当前状态

课程已经定义了整体学习路径和各章问题；模块正文仍是“占位”，还不能当作完整教材。当前优先补齐：

- 可复现实验与结果记录
- 由证据支撑的机制解释
- 训练、集群与服务阶段之间的连续案例
- 系统设计项目的样例报告

不要把占位页误认为已经完成的教学内容。状态以[学习地图](docs/guide/learning-map.md)为准。

## 本地运行文档

需要 Node.js 与 pnpm：

```bash
pnpm install
pnpm docs:dev
```

构建静态站点：

```bash
pnpm docs:build
```

## 参与贡献

欢迎补充章节、实验、失败记录、指标图表和参考资料。贡献内容应尽量回答：

1. 遇到了什么事件或设计问题？
2. workload 有什么资源特征？
3. 用什么证据定位瓶颈？
4. 哪个机制解释了现象？
5. 方案获得了什么，又牺牲了什么？

详细约定见[贡献指南](docs/guide/contributing.md)和[章节模板](docs/guide/chapter-template.md)。
