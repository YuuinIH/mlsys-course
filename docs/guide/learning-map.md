# 学习地图

这门课先不限定时间。能做到哪里就做到哪里，后面可以持续补章节、补实验、补案例。

暂定三条主载体：

| 主载体 | 用来观察什么 |
| --- | --- |
| PyTorch / Hugging Face | 训练、普通推理、数据加载、profiler、benchmark、dtype、batch、显存、吞吐 |
| vLLM | prefill、decode、KV cache、continuous batching、并发、P95/P99、吞吐和延迟权衡 |
| diffusers | 采样步数、scheduler、分辨率、多阶段 pipeline 的耗时拆解 |

横向工具按需出现，例如 profiler、benchmark、MLflow、Prometheus / Grafana。它们不是课程主角，只用来帮助我们观察、部署、对比和解释现象。

## 暂定模块

下面只是内容地图，不是固定进度表。

状态说明：

- 占位：只有标题或很少说明，还不能当作完整学习材料
- 初稿：已有可读正文，但还需要补实验、图表或参考资料
- 待实验验证：文字方向基本清楚，但实验还没跑通或结果还没整理
- 可学习：正文、实验和必要说明已经比较完整，可以按章节学习

当前所有模块文章都还是占位页，所以先统一标为“占位”。

| 序号 | 主题 | 状态 | 核心问题 | 主要产出 |
| --- | --- | --- | --- | --- |
| 0 | [课程准备与 MLSys 地图](/modules/00-map) | 占位 | AI 系统到底在管什么？ | 环境检查、成熟 demo、第一个 benchmark |
| 1 | [工作负载速览](/modules/01-workloads) | 占位 | LLM、diffusion、视觉、多模态的系统压力有什么不同？ | 基于成熟模型的 workload 对比笔记 |
| 2 | [性能指标、Profiler 与 Benchmark](/modules/02-profiler-benchmark) | 占位 | 怎么知道慢在哪里，测得准不准？ | 指标速查、benchmark 模板、profiler 解读笔记 |
| 3 | [计算、内存与矩阵乘](/modules/03-compute-memory) | 占位 | profiler 里看到的算子瓶颈从哪里来？ | tensor op 性能观察和机制解释 |
| 4 | [GPU 与并行直觉](/modules/04-gpu-parallelism) | 占位 | GPU 为什么快，又为什么经常利用不好？ | CPU/GPU 对比实验 |
| 5 | [深度学习训练流水线](/modules/05-training-pipeline) | 占位 | 一个 training step 的时间花在哪里？ | 训练 step profiling 报告 |
| 6 | [预训练与微调系统](/modules/06-pretraining-finetuning) | 占位 | tokens/sec、batch、序列长度、显存之间怎么权衡？ | 现成训练栈上的 pretraining / fine-tuning 分析 |
| 7 | [训练优化](/modules/07-training-optimization) | 占位 | AMP、checkpointing、gradient accumulation 解决什么？ | 显存和吞吐对比实验 |
| 8 | [并行策略、通信与拓扑](/modules/08-distributed-training) | 占位 | 模型装不下、跑不快以后，系统如何把计算、参数和通信摊到多卡/多机上？ | 并行策略、collective 和拓扑关系图 |
| 9 | [推理服务基础](/modules/09-serving-basics) | 占位 | 模型能跑，服务为什么还慢？ | serving 工具或服务包装的压测报告 |
| 10 | [LLM Serving](/modules/10-llm-serving) | 占位 | prefill、decode、KV cache、batching 在解决什么？ | LLM serving 现象分析 |
| 11 | [Diffusion Serving](/modules/11-diffusion-serving) | 占位 | 生成一张图为什么慢，成本在哪里？ | diffusion pipeline 延迟拆解 |
| 12 | [多模态与流水线系统](/modules/12-multimodal-pipeline) | 占位 | 多阶段 AI 应用为什么难部署？ | 多阶段 pipeline 耗时分析 |
| 13 | [模型压缩与推理加速](/modules/13-compression-acceleration) | 占位 | 量化、导出、编译优化到底改了什么？ | dtype/量化/导出实验 |
| 14 | [MLOps 与生产闭环](/modules/14-mlops) | 占位 | 模型上线以后看什么？ | 版本、监控、回滚小案例 |
| 15 | [成本、SLO 与生产案例](/modules/15-cost-slo-cases) | 占位 | 如何做生产侧系统决策？ | incident-style 分析报告 |
| 16 | [综合项目](/modules/16-final-project) | 占位 | 如何把测量、解释和决策串起来？ | final project 报告 |
