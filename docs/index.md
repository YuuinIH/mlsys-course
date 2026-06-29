---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Hello MLSys"
  text: "从成熟系统的现象出发"
  tagline: 学会测量、定位瓶颈、剥开机制，并做出生产取舍。
  actions:
    - theme: brand
      text: 查看学习地图
      link: /guide/learning-map
    - theme: alt
      text: 阅读课程大纲
      link: /outline

features:
  - title: 尽量贴近生产一线
    details: 直接使用 PyTorch、Hugging Face、vLLM、diffusers 等成熟系统观察真实工程现象，而不是停留在空谈。
  - title: 先测量，再解释
    details: 用 benchmark、profiler 和服务指标反推瓶颈，而不是凭感觉猜原因。
  - title: 思路比工具更重要
    details: 工具会变，计算、内存、通信、排队、成本和可靠性这些系统问题会长期存在。
---

这是一门还在打磨中的 MLSys 课程。当前目标不是写成正式教材，而是先建立一套清楚的学习地图和课程骨架。

如果你有一点本科系统课程背景，会更容易进入后面的进阶内容；没有也可以从低算力主线开始，边看边补。

核心主线：

```text
成熟系统 -> 观察现象 -> 测量指标 -> 反推瓶颈 -> 剥开机制 -> 生产决策
```
