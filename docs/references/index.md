# 参考资料库

这里先放一版课程参考资料入口。它不是完整 bibliography，也不是要求大家按顺序读完。

使用原则：先按问题找资料，再决定要不要读。每个模块正文都要在末尾维护自己的“脚注与参考索引”。

## 课程与教材

- [MLSysBook](https://mlsysbook.ai/)：机器学习系统的系统化教材，可作为课程结构、实验和概念框架参考。
- [Open MLSys](https://openmlsys.github.io/)：中文机器学习系统教材，适合补计算图、编译、运行时、训练系统等基础。
- [Stanford CS149: Parallel Computing](https://gfxcourses.stanford.edu/cs149/fall25/)：并行计算和性能工程参考，适合补 GPU、并行和性能直觉。
- [CMU Machine Learning Systems](https://mlsyscourse.org/)：MLSys 正式课程参考。
- [Efficient Deep Learning Systems](https://github.com/mryab/efficient-dl-systems)：训练和推理系统优化课程参考。
- [LLM Systems Cookbook](https://github.com/hassan11196/llm-systems-cookbook)：LLM 系统实践与 notebook 组织方式参考。
- [MLOps Zoomcamp](https://github.com/DataTalksClub/mlops-zoomcamp)：MLOps 课程组织、作业和社区入口参考。

## 工具与官方文档

- [PyTorch Profiler](https://pytorch.org/docs/stable/profiler.html)：用于训练 step、operator、CPU/GPU 时间线分析。
- [torch.utils.benchmark](https://pytorch.org/docs/stable/benchmark_utils.html)：用于写更可靠的 PyTorch benchmark。
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/index)：用于成熟模型训练、推理、generation 和 cache 观察。
- [Hugging Face Datasets](https://huggingface.co/docs/datasets/index)：用于数据加载、streaming、缓存和数据管线实验。
- [Hugging Face Diffusers](https://huggingface.co/docs/diffusers/index)：用于 diffusion pipeline、scheduler、采样步数和生成服务实验。
- [vLLM](https://docs.vllm.ai/)：用于 LLM serving、KV cache、PagedAttention、continuous batching 观察。
- [MLflow](https://mlflow.org/docs/latest/index.html)：用于实验追踪、模型版本和生产闭环的入门实验。
- [Prometheus](https://prometheus.io/docs/introduction/overview/)：用于服务指标和监控。
- [Grafana](https://grafana.com/docs/grafana/latest/)：用于指标可视化和 dashboard。

## 论文与系统文章候选

这些资料后面需要按模块拆进脚注索引，目前先集中放在这里。

- ZeRO：理解大模型训练中的 optimizer state、gradient、parameter 分片。
- FSDP：理解 PyTorch 生态里的参数分片和显存优化。
- FlashAttention：理解 attention 的内存访问、IO-aware 优化和算子瓶颈。
- PagedAttention / vLLM：理解 LLM serving 中 KV cache 管理和吞吐优化。
- Speculative Decoding：理解 LLM decode 加速的算法和系统取舍。
- Triton / Torch Compile 相关资料：理解图优化、kernel、编译与推理加速。

## 显存、并行与拓扑

这一组资料服务于“显存不够装怎么办 -> 多卡 -> 多机 -> 网络拓扑”的课程线。

- [MLSysBook: AI Engineering at Scale Syllabus](https://mlsysbook.ai/instructors/scale-syllabus.html)：适合看 compute infrastructure、network fabrics、distributed training、collective communication、inference at scale 在课程地图里的位置。
- [MLSysBook: Distributed Training](https://mlsysbook.ai/vol2/distributed_training/distributed_training.html)：适合从 memory exhaustion 引出 DP、TP、PP、ZeRO/FSDP、expert parallel 和 hybrid parallelism。
- [PyTorch Distributed](https://docs.pytorch.org/docs/stable/distributed.html)：适合理解 PyTorch 里的 backend、process group、NCCL 调试和 distributed runtime。
- [PyTorch FSDP](https://docs.pytorch.org/docs/stable/fsdp.html)：适合理解参数分片、all-gather、reduce-scatter 和显存优化。
- [DeepSpeed ZeRO](https://deepspeed.readthedocs.io/en/latest/zero3.html)：适合理解 ZeRO stage、offload、reduce-scatter、all-gather 等显存与通信取舍。
- [Megatron-LM](https://github.com/NVIDIA/Megatron-LM)：适合整理 TP、PP、DP、EP、CP 等并行策略词汇。
- [NCCL Collective Operations](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html)：适合讲 all-reduce、all-gather、reduce-scatter、all-to-all 这些通信原语。
- [NCCL Performance and Tuning](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/performance_and_tuning.html)：适合连接 topology、带宽检查和多卡性能异常。
- [NCCL Networking Troubleshooting](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/networking_troubleshooting.html)：适合解释 Ethernet/TCP、network interface、端口和跨节点初始化问题。
- [NVIDIA Fabric Manager](https://docs.nvidia.com/datacenter/tesla/fabric-manager-user-guide/)：适合了解 NVLink、NVSwitch 和单机/多 GPU 拓扑。
- [NVIDIA GPUDirect RDMA](https://docs.nvidia.com/cuda/gpudirect-rdma/)：适合理解 RDMA 为什么不是“更快的 TCP”，而是 GPU 和 NIC 之间不同的数据路径。
- [NVIDIA Multi-Node NVLink](https://docs.nvidia.com/multi-node-nvlink-systems/mnnvl-user-guide/overview.html)：适合做进阶阅读，区分 data plane 和 control plane。

后续整理时，每条论文需要补全标题、作者、会议、年份、链接，以及它回答哪个课程问题。

## 模块引用要求

每个模块至少维护这些信息：

```text
资料标题
链接
适合回答的问题
和本章实验或现象的关系
```

不要只贴链接。脚注索引的目标是帮助读者知道“为什么要读这条资料”。
