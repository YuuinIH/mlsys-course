import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Hello MLSys",
  description: "从成熟 AI 系统的现象出发，学习测量、瓶颈分析和生产取舍。",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '学习地图', link: '/guide/learning-map' },
      { text: '课程大纲', link: '/outline' }
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: '课程简介', link: '/' },
          { text: '学习地图', link: '/guide/learning-map' },
          { text: '章节模板', link: '/guide/chapter-template' },
          { text: '贡献指南', link: '/guide/contributing' },
          { text: '仓库结构', link: '/guide/repo-structure' }
        ]
      },
      {
        text: '课程草稿',
        items: [
          { text: '课程大纲', link: '/outline' }
        ]
      },
      {
        text: '学习模块',
        items: [
          { text: '0. MLSys 地图', link: '/modules/00-map' },
          { text: '1. 工作负载速览', link: '/modules/01-workloads' },
          { text: '2. 指标与 Profiler', link: '/modules/02-profiler-benchmark' },
          { text: '3. 计算、内存与矩阵乘', link: '/modules/03-compute-memory' },
          { text: '4. GPU 与并行直觉', link: '/modules/04-gpu-parallelism' },
          { text: '5. 训练流水线', link: '/modules/05-training-pipeline' },
          { text: '6. 预训练与微调系统', link: '/modules/06-pretraining-finetuning' },
          { text: '7. 训练优化', link: '/modules/07-training-optimization' },
          { text: '8. 分布式训练入门', link: '/modules/08-distributed-training' },
          { text: '9. 推理服务基础', link: '/modules/09-serving-basics' },
          { text: '10. LLM Serving', link: '/modules/10-llm-serving' },
          { text: '11. Diffusion Serving', link: '/modules/11-diffusion-serving' },
          { text: '12. 多模态流水线', link: '/modules/12-multimodal-pipeline' },
          { text: '13. 模型压缩与加速', link: '/modules/13-compression-acceleration' },
          { text: '14. MLOps 与生产闭环', link: '/modules/14-mlops' },
          { text: '15. 成本、SLO 与案例', link: '/modules/15-cost-slo-cases' },
          { text: '16. 综合项目', link: '/modules/16-final-project' }
        ]
      }
    ]
  }
})
