# 仓库结构与内容约定

这个仓库现在以文档为主，后面会逐步补实验、示例和项目材料。结构先保持简单，避免一开始就分得太细。

## 顶层文件

```text
COURSE_OUTLINE.md
README.md
package.json
docs/
```

`COURSE_OUTLINE.md` 是课程 v0 讨论稿，适合放课程定位、模块草案和还没拆进正式文档的想法。

`README.md` 是项目入口，给第一次进仓库的人看。它应该说明项目状态、课程主线、当前完成度、怎么运行文档和怎么贡献。

`package.json` 放 VitePress 文档命令。

## docs/

`docs/` 是 VitePress 文档站点目录。面向读者的正式内容优先放这里。

当前已有：

```text
docs/
  index.md
  outline.md
  guide/
  modules/
  .vitepress/
```

`docs/index.md` 是文档站首页。

`docs/outline.md` 可以放课程大纲的站内版本，内容应和根目录大纲保持方向一致。

`docs/.vitepress/` 放 VitePress 配置。新增页面后，如果需要出现在导航或侧边栏里，再更新这里。

## docs/modules/

`docs/modules/` 放 17 个课程模块。

命名约定：

```text
00-map.md
01-workloads.md
02-profiler-benchmark.md
...
16-final-project.md
```

模块编号要稳定，方便链接、讨论和后续共学安排。不要因为中途插入一个主题就随便改编号。确实需要调整时，先改学习地图，再一起更新链接。

每个模块尽量围绕一个核心问题写，不要把多个大主题塞进同一页。推荐结构见 [章节模板](chapter-template.md)。

模块内容应该优先包含：

- 一个具体问题
- 一个成熟系统或现成 workload
- 一组可测指标
- 一个瓶颈判断过程
- 一段机制解释
- 一个生产侧取舍讨论

## docs/guide/

`docs/guide/` 放课程使用和协作说明。

当前包括：

- `learning-map.md`，学习地图和模块状态
- `chapter-template.md`，章节写作模板
- `contributing.md`，贡献指南
- `repo-structure.md`，仓库结构与内容约定

如果新增的是“怎么写、怎么学、怎么贡献”的说明，放在这里。不要把模块正文放进 `guide/`。

## future labs/

后续可以新增 `labs/`，用来放可复现实验。

建议每个 lab 只回答一个主要问题，例如：

- batch size 对延迟和吞吐的影响
- DataLoader worker 数量对训练速度的影响
- LLM prefill 和 decode 的耗时差异
- diffusion 采样步数对延迟的影响
- 图片预处理放在请求内外的差异

建议结构：

```text
labs/
  02-profiler-benchmark/
    README.md
    scripts/
    results/
```

`README.md` 写实验问题、环境、运行方法、结果和解释。`scripts/` 放脚本。`results/` 放可以公开的结果表、截图或 trace 说明。不要提交过大的原始数据和模型权重。

## future examples/

后续可以新增 `examples/`，放小型示例代码。

示例代码应该服务于文档里的现象，不追求做成完整框架。比如一个最小 serving 包装、一个 benchmark 模板、一个 profiler 示例。

建议结构：

```text
examples/
  benchmark-template/
  simple-serving/
  profiler-notes/
```

如果一段代码只属于某个 lab，优先放进对应 `labs/` 目录。只有多个章节都会用到的代码，才放进 `examples/`。

## future projects/

后续可以新增 `projects/`，放综合项目说明、报告模板和优秀案例摘要。

项目不要求做成完整平台，重点是把主线串起来：

```text
工作负载描述 -> 测量方法 -> 关键结果 -> 瓶颈分析 -> 机制解释 -> 生产决策建议 -> 还没解决的问题
```

建议结构：

```text
projects/
  README.md
  report-template.md
  examples/
```

如果项目包含代码，尽量保持小而清楚。不要上传敏感数据、私有业务数据或大模型权重。

## 内容状态约定

模块状态统一用：占位、初稿、待实验验证、可学习。

状态表目前在两个地方出现：

- 根目录 `README.md`
- `docs/guide/learning-map.md`

更新模块时，请同步更新这两个表。当前所有模块文章都是占位页，所以状态都是“占位”。

## 链接和导航

新增文档后，先确认它能通过相对链接访问。如果希望它出现在文档站侧边栏或顶部导航里，需要更新 `docs/.vitepress/config.mts`。

不是所有页面都必须立刻进导航。早期草稿可以先从 README 或学习地图链接过去，等结构稳定后再整理侧边栏。
