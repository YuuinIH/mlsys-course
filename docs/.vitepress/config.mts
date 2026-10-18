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
      { text: '主题地图', link: '/topics/' },
      { text: '学习路径', link: '/paths/' },
      { text: '课程设计', link: '/outline' },
      { text: '参考资料', link: '/references/' }
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '课程简介', link: '/' },
          { text: '专题文章', link: '/essays/' },
          { text: '主题地图', link: '/topics/' },
          { text: '学习路径', link: '/paths/' },
          { text: '课程设计', link: '/outline' }
        ]
      },
      {
        text: '文章 · 当前初稿',
        collapsed: false,
        items: [
          { text: 'L1 · 为啥需要 MLSys？', link: '/modules/00-systems-thinking' },
          { text: 'L2 · 规模效应：算力、能力与成本', link: '/modules/0X-scaling' },
          { text: 'L2 · 为什么需要专门的 LLM 推理引擎？', link: '/essays/serving-tuning/00-why-inference-engines' }
        ]
      },
      {
        text: '专题 · 持续编写',
        collapsed: true,
        items: [
          { text: '推理服务调优：从能跑到好用', link: '/essays/serving-tuning/' }
        ]
      },
      {
        text: '参与编写',
        collapsed: true,
        items: [
          { text: '文章写作建议', link: '/guide/article-guide' },
          { text: '贡献指南', link: '/guide/contributing' },
          { text: '仓库结构', link: '/guide/repo-structure' },
          { text: '参考资料', link: '/references/' }
        ]
      }
    ]
  }
})
