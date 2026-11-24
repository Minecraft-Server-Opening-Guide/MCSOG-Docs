---
title: 编辑指南
slug: guide
updated: 2026-11-24
---

本站内容以 Markdown 形式存储，全部放在公开仓库 [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) 里，任何人都可以提交修改。
1
## 目录与命名

| 类型 | 路径 |
| --- | --- |
| 教程 | `docs/zh/tutorials/<category>/<slug>.md`，分类为 `java` / `bedrock` / `ops` / `faq` |
| 百科 | `docs/zh/wiki/<name>.md` |
| 公告 | 私有仓 `docs/zh/news/<name>.md`（公开仓不维护） |
| 帮助 | `docs/zh/help/<name>.md` |

## docslist.json 与教程文档

`docslist.json` 只管理开服教程：`nav` 是侧栏教程导航项（教程总览、Java 版开服、基岩版开服、运维与安全、常见问题），`docs` 是教程文档索引，分类固定为 `java`、`be`、`ops`、`faq`（`be` 对应磁盘上的 `bedrock` 目录）。`help`、`wiki`、`news` 不写入此文件。

```json
{
  "nav": [
    { "key": "tutorials", "icon": "book-open", "path": "/tutorials", "label": { "zh": "教程总览", "en": "Overview" }, "sub": { "zh": "OVERVIEW", "en": "OVERVIEW" } }
  ],
  "docs": {
    "java": {
      "zh": [
        { "path": "/zh/tutorials/java/example", "title": "示例教程", "slug": "example", "cat": "java", "updated": "2026-11-03", "level": 1, "minute": 10, "order": 1 }
      ]
    }
  }
}
```

`path` 是教程页面的站内路径；`slug` 必须与 Markdown 文件名一致。新增教程时提交 Markdown 文件，并在对应分类和语言下登记条目。

英文文件与中文**路径一一对应**，只把 `zh` 换成 `en`。
`<slug>` 用小写英文与连字符，会成为页面 URL 的最后一段；文件名与 `slug` 必须一致。

教程文件开头需要 YAML front-matter：

```yaml

SYNC-PROBE-MARKER

MARKER5
