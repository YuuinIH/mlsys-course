# 仓库结构与内容约定

当前采用 **Topics（主题范围）/ Essays（独立文章）/ Paths（学习路径）** 三个相对独立的内容层次。

```text
COURSE_OUTLINE.md        # 学习目标、Non-goals 与设计原则
README.md                # 仓库入口
docs/
  index.md               # 首页
  outline.md             # 课程定位摘要
  topics/index.md        # 主题地图
  essays/index.md        # 可阅读文章列表
  paths/index.md         # 学习路径
  guide/                 # 写作与贡献建议
  modules/               # 旧文件名：2 篇初稿、16 篇历史占位稿
  references/            # 外部参考资料
  public/images/         # 图片资源
  .vitepress/config.mts  # 站点导航
```

## 新文章

优先放 `docs/essays/<short-slug>.md`，使用描述问题的稳定文件名，不再强制编号。建议在 frontmatter 中标记 `level`、`status`、`topics`。只有内容可读后，才把链接加入专题索引与主题地图；学习路径不必因每篇新文章而变化。

## 历史内容

已有两篇长文暂时保留在 `docs/modules/`，以避免外部 URL 和图片引用失效。其余 `01-` 到 `16-` 编号文件属于旧线性课程的占位规划，不再作为必须依序填完的任务，也不出现在主要导航。将来可逐篇重写、归档或设置跳转。

不预建八个主题的空白文章，不强求 `labs/` 或 `projects/`。确实需要实验时再添加小规模可复核材料。

## 发布前检查

检查页面和图片链接、难度与成熟度描述、主题地图实际覆盖、导航，以及 `pnpm docs:build`。写作参考见[文章写作建议](/guide/article-guide)。
