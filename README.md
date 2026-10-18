# Hello MLSys

**从计算机系统的视角，理解现代机器学习如何真正运行。**

Hello MLSys 是一套持续生长的开放课程，面向具备计算机本科基础、希望理解现代 ML 系统的读者。我们关注工作负载、执行机制、资源约束、测量证据及工程权衡，而不是罗列 AI Infra 工具。

**文章可独立阅读，课程不强制线性。** 主题地图帮助我们把握知识范围，学习路径则从已有文章中组织适合读者的顺序。

## 开始阅读

- [专题文章](docs/essays/index.md)：已有正文的文章、难度与成熟度。
- [主题地图](docs/topics/index.md)：课程的八个主题及真实覆盖程度。
- [学习路径](docs/paths/index.md)：已有文章的建议阅读顺序。
- [课程设计大纲](COURSE_OUTLINE.md)：学习目标、Non-goals 和实践原则。

**现状：3 篇可读初稿，尚非完整课程。** 原来的 16 篇线性章节占位稿仍在 `docs/modules/`，但不再作为正式课程内容推荐。

## 我们不做什么

不重讲完整的 ML 算法、操作系统或编译器课程；不编写工具安装大全、热点新闻合集或特定技术的宣传材料；也不要求学生通过实现大型平台来证明学会知识。PyTorch、CUDA、Kubernetes、推理引擎和论文都是帮助理解某一类系统问题的材料。

文章按阅读门槛标记 **L1 Fundamentals / L2 Engineering / L3 Advanced**；不要求每个主题有三个等级，也不以难度决定重要程度。

**实践是认识知识的手段，而不是交付目标。** 实验、源码、Profiler、案例和推理各有用途。允许 AI 协助编写实验代码，但假设、观察、证据和结论的边界必须经得起检验。

参与编写见[文章写作建议](docs/guide/article-guide.md)和[贡献指南](docs/guide/contributing.md)。

## 在本地运行

需要 Node.js 和 pnpm。

```bash
pnpm install
pnpm docs:dev
```

构建静态网站：`pnpm docs:build`。
