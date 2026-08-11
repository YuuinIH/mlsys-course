import { defineConfig } from 'vitepress'

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? '/',
  title: 'MLSys Course',
  description: '从一段 ML 代码到可扩展、可观测的生产系统。',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '学习地图', link: '/guide/learning-map' },
      { text: '课程设计', link: '/outline' },
      { text: '参考资料', link: '/references/' }
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '课程简介', link: '/' },
          { text: '学习地图', link: '/guide/learning-map' },
          { text: '课程设计', link: '/outline' },
          { text: '如何写一章', link: '/guide/chapter-template' },
          { text: '贡献指南', link: '/guide/contributing' },
          { text: '仓库结构', link: '/guide/repo-structure' }
        ]
      },
      {
        text: 'Part 0 · Systems Thinking',
        collapsed: false,
        items: [
          { text: '0. GPU 利用率只有 30%', link: '/modules/00-systems-thinking' },
          { text: '1. Benchmark 可信吗', link: '/modules/01-measurement' }
        ]
      },
      {
        text: 'Part 1 · Understanding Workloads',
        items: [
          { text: '2. 训练与推理 workload', link: '/modules/02-workloads' },
          { text: '3. GPU 为什么喂不饱', link: '/modules/03-gpu-foundations' },
          { text: '4. Training step 解剖', link: '/modules/04-training-anatomy' }
        ]
      },
      {
        text: 'Part 2 · Distributed Training',
        items: [
          { text: '5. 模型或 batch 装不下', link: '/modules/05-training-memory' },
          { text: '6. 多卡为何不线性加速', link: '/modules/06-distributed-training' }
        ]
      },
      {
        text: 'Part 3 · Script to Cluster',
        items: [
          { text: '7. 在我机器上能跑', link: '/modules/07-containers' },
          { text: '8. 有 GPU 却一直 pending', link: '/modules/08-cluster-scheduling' },
          { text: '9. 失败后如何继续', link: '/modules/09-reliability' }
        ]
      },
      {
        text: 'Part 4 · Model to Service',
        items: [
          { text: '10. 平均延迟的陷阱', link: '/modules/10-serving' },
          { text: '11. LLM 的 prefill 与 decode', link: '/modules/11-llm-serving' },
          { text: '12. 多阶段 pipeline', link: '/modules/12-multimodal-serving' },
          { text: '13. 应该先优化什么', link: '/modules/13-serving-optimization' }
        ]
      },
      {
        text: 'Part 5 · Operating Systems',
        items: [
          { text: '14. SLO 为什么失守', link: '/modules/14-observability' },
          { text: '15. 云账单为什么上升', link: '/modules/15-cost-capacity-slo' }
        ]
      },
      {
        text: 'Part 6 · System Design',
        items: [
          { text: '16. 设计并为系统辩护', link: '/modules/16-final-project' },
          { text: '参考资料', link: '/references/' }
        ]
      }
    ]
  }
})
