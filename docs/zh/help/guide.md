---
title: 编辑指南
slug: guide
updated: 2026-10-04
---

获得编辑权限后可编辑本站内容本站内容以markdown形式存储

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

1. 在仓库新建分支，按上面的目录与命名添加文件；
2. 本地起站自检：`php -S 127.0.0.1:8080 -t public tools/dev-router.php`，然后请求 `/api/content?type=tutorials&lang=zh` 确认条目出现；
3. 提交 Pull Request，说明改动范围与自检结果。
