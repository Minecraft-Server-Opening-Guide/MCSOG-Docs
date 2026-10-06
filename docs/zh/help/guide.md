---
title: 编辑指南
slug: guide
updated: 2026-10-06
---

本站内容以 Markdown 形式存储，全部放在公开仓库 [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) 里，任何人都可以提交修改。

## 目录与命名

| 类型 | 路径 |
| --- | --- |
| 教程 | `docs/zh/tutorials/<分类>/<slug>.md`，分类为 `java` / `bedrock` / `ops` / `faq` |
| 百科 | `docs/zh/wiki/<名称>.md` |
| 公告 | `docs/zh/news/<名称>.md` |
| 帮助 | `docs/zh/help/<名称>.md` |

英文文件与中文**路径一一对应**，只把 `zh` 换成 `en`。
`<slug>` 用小写英文与连字符，会成为页面 URL 的最后一段；文件名与 `slug` 必须一致。

教程文件开头需要 YAML front-matter：

```yaml
---
title: 在 Linux 上部署 Paper 服务端
slug: linux-paper
cat: java
level: 2
minutes: 15
mc: ["1.21.x", "1.20.4"]
tags: [linux, paper, systemd]
updated: 2026-10-06
draft: false
---
```

| 字段 | 含义 |
| --- | --- |
| `title` | 页面与列表标题 |
| `slug` | 文件名去掉 `.md`，同时是 URL 的一段 |
| `cat` | 分类目录：`java` / `bedrock` / `ops` / `faq` |
| `level` | 难度 1–3，显示为标签 |
| `minutes` | 预计阅读分钟数 |
| `mc` | 适用的 Minecraft 版本 |
| `tags` | 标签，站内搜索也会用到 |
| `updated` | `YYYY-MM-DD`，列表按它排序 |
| `draft` | 设为 `true` 时该页不上线 |

## 正文扩展

:::step 步骤块
用 `:::step 标题` 开始、单独一行 `:::` 结束。连续多个步骤块会自动合并成带序号的步骤条。
:::

:::note
`:::note` 提示框，适合补充说明。
:::

:::warn
`:::warn` 警告框，适合容易踩坑的地方。
:::

:::danger
`:::danger` 危险框，适合不可逆操作（删库、覆盖配置等）。
:::

其余支持标准 Markdown：标题（自动生成右侧目录）、列表、表格、任务列表、行内代码、带语言标注的代码围栏。

## 提交方式

:::step 在仓库新建分支
Fork [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) 后新建一个分支，按上面的目录与命名添加文件。
:::

:::step 本地起站自检
运行 `php -S 127.0.0.1:8080 -t public tools/dev-router.php`，
然后请求 `/api/content?type=tutorials&lang=zh` 确认条目出现。
:::

:::step 提交 Pull Request
在 PR 里说明**改动范围**与**自检结果**。
:::

:::note
合并进 `main` 后自动生效：30 分钟内同步进主仓库，2 小时内上线。
:::

写作与引用规范见[贡献与规范](/help/contribute)。
