# 仓库结构与内容约定

仓库以课程文档为主，实验、示例和项目材料随正文逐步补充。

## 当前结构

```text
COURSE_OUTLINE.md          # 课程定位、目标与整体结构
README.md                  # 仓库入口与当前状态
docs/
  index.md                 # 文档站首页
  outline.md               # 站内课程结构摘要
  guide/                   # 学习与贡献约定
  modules/                 # 00—16 章正文
  references/              # 按问题组织的参考入口
  .vitepress/              # 文档站配置
```

面向学习者的正式内容放在 `docs/`。新增或改名页面后，要同步检查学习地图、侧边栏和站内链接。

## 模块命名

`docs/modules/` 的编号代表学习顺序，文件名描述稳定的问题领域：

```text
00-systems-thinking.md
01-measurement.md
02-workloads.md
03-gpu-foundations.md
04-training-anatomy.md
05-training-memory.md
06-distributed-training.md
07-containers.md
08-cluster-scheduling.md
09-reliability.md
10-serving.md
11-llm-serving.md
12-multimodal-serving.md
13-serving-optimization.md
14-observability.md
15-cost-capacity-slo.md
16-final-project.md
```

章节标题应优先写成事故现象或设计问题，文件名则保持简短稳定。不要仅为加入一种新工具而增加模块；先判断它属于正文、Cookbook 还是 Deep Dive。

## 实验目录

新增实验时使用与章节一致的编号，例如：

```text
labs/
  02-measurement/
    README.md
    scripts/
    results/
```

一个 lab 主要验证一个假设。`README.md` 记录问题、环境、运行方法、结果、局限和决策；`scripts/` 放可复现代码；`results/` 只提交体积合理且可公开的结果。

多个章节共用的最小示例可放 `examples/`。只服务单章实验的代码应留在相应 lab，避免形成脱离问题的示例集合。

## 项目材料

最终项目 brief、报告模板和公开案例放 `projects/`：

```text
projects/
  README.md
  report-template.md
  examples/
```

项目代码保持小而清楚，不提交模型权重、敏感数据或私有业务资料。

## 内容状态

状态统一为：占位、初稿、待实验验证、可学习。唯一汇总表位于[学习地图](learning-map.md)，其他页面只链接它，避免重复状态表产生漂移。

## 提交前结构检查

- 学习地图和侧边栏能否到达新页面？
- 站内是否还引用旧文件名？
- 章节是否遵循[章节模板](chapter-template.md)？
- 实验是否与一个明确问题和章节绑定？
- 文档站能否成功构建？
