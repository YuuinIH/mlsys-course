import { defineConfig } from 'vitepress'

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? '/',
  title: 'Hello MLSys',
  description: '从计算机系统的视角，理解现代机器学习如何真正运行。',
  markdown: {
    math: true,
    config(md) {
      for (const rule of ['math_inline', 'math_block'] as const) {
        const render = md.renderer.rules[rule]
        if (!render) continue

        // VitePress 1.x lowercases MathJax's SVG viewBox while compiling Markdown.
        // A bound attribute preserves the casing and keeps glyphs inside the SVG.
        md.renderer.rules[rule] = (...args) =>
          render(...args).replace(/ viewbox="([^"]+)"/g, ` :viewBox="'$1'"`)
      }
    }
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '专题文章', link: '/essays/' },
      { text: '课程目录', link: '/topics/' },
      { text: '学习路径', link: '/paths/' },
      { text: '课程设计', link: '/outline' },
      { text: '参考资料', link: '/references/' }
    ],
    sidebar: [
      {
        text: '阅读入口',
        items: [
          { text: '课程简介', link: '/' },
          { text: '课程目录 · 主题地图', link: '/topics/' },
          { text: '已有文章 · 5 篇初稿', link: '/essays/' },
          { text: '建议学习路径', link: '/paths/' }
        ]
      },
      {
        text: 'I · 认识系统',
        link: '/topics/#stage-systems',
        collapsed: false,
        items: [
          {
            text: '工作负载与系统思维',
            link: '/topics/#topic-workloads',
            items: [
              { text: 'L1 · 为啥需要 MLSys？', link: '/modules/00-systems-thinking' }
            ]
          },
          { text: '执行路径与硬件约束', link: '/topics/#topic-execution' },
          { text: '通用测量方法与实验设计', link: '/topics/#topic-measurement' }
        ]
      },
      {
        text: 'II · 让模型训练',
        link: '/topics/#stage-training',
        collapsed: true,
        items: [
          { text: '单机训练与数据供给', link: '/topics/#topic-single-training' },
          {
            text: '分布式训练与通信',
            link: '/topics/#topic-distributed-training',
            items: [
              { text: 'L2 · 规模效应：算力、能力与成本', link: '/modules/0X-scaling' }
            ]
          },
          { text: '后训练与模型迭代', link: '/topics/#topic-post-training' }
        ]
      },
      {
        text: 'III · 让模型服务',
        link: '/topics/#stage-serving',
        collapsed: true,
        items: [
          {
            text: '推理引擎与请求调度',
            link: '/topics/#topic-inference',
            items: [
              { text: 'L2 · 为什么需要专门的 LLM 推理引擎？', link: '/essays/serving-tuning/00-why-inference-engines' }
            ]
          },
          {
            text: '推理性能与调优',
            link: '/topics/#topic-serving-performance',
            items: [
              { text: '系列导览 · 推理服务调优', link: '/essays/serving-tuning/' },
              { text: 'L2 · 推理服务性能测量', link: '/essays/serving-tuning/01-what-is-fast' },
              { text: 'L2 · 显存预算与模型配置', link: '/essays/serving-tuning/02-memory-budget' }
            ]
          },
          { text: '缓存、状态与数据移动', link: '/topics/#topic-state' }
        ]
      },
      {
        text: 'IV · 让平台运行',
        link: '/topics/#stage-platform',
        collapsed: true,
        items: [
          { text: '部署、编排与调度', link: '/topics/#topic-orchestration' },
          { text: '可靠性、可观测性与安全', link: '/topics/#topic-reliability' }
        ]
      },
      {
        text: 'V · 让工程可持续',
        link: '/topics/#stage-engineering',
        collapsed: true,
        items: [
          { text: '容量、成本与架构决策', link: '/topics/#topic-cost' },
          { text: '软件工程与组织协作', link: '/topics/#topic-organization' }
        ]
      },
      {
        text: '课程设计与参考',
        collapsed: true,
        items: [
          { text: '课程设计原则', link: '/outline' },
          { text: '参考资料', link: '/references/' }
        ]
      },
      {
        text: '参与编写',
        collapsed: true,
        items: [
          { text: '文章写作建议', link: '/guide/article-guide' },
          { text: '贡献指南', link: '/guide/contributing' },
          { text: '仓库结构', link: '/guide/repo-structure' }
        ]
      }
    ]
  }
})
