---
layout: home

hero:
  name: "MLSys Course"
  text: "从一段代码到生产系统"
  tagline: 用观察、测量和实验理解机制，用证据做工程决策。
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/learning-map
    - theme: alt
      text: 课程设计
      link: /outline

features:
  - title: Problem First
    details: 每章从事故或设计问题开始，技术只在解决问题时出现。
  - title: Toy-scale, Production-shaped
    details: 实验可以在本地或单卡运行，但要复现真实系统中的瓶颈、失败和取舍。
  - title: Evidence to Decision
    details: 不止解释机制，还要记录测量证据、方案边界和最终决策。
---

课程沿着一个 ML workload 的演化展开：

```text
代码 -> 单卡 workload -> 分布式训练 -> 集群任务 -> 生产服务 -> 持续运维
```

读者最终应能面对一个陌生 ML 系统，提出正确问题、收集证据、解释约束并做出可辩护的工程决策。
