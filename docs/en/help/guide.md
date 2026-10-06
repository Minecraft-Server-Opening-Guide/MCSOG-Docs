---
title: Editing Guide
slug: guide
updated: 2026-10-03
---

Guides live as plain Markdown under `docs/<lang>/tutorials/<category>/<slug>.md`. Provide one file per language with an identical file name and slug. Once the file exists it is live; no front-end change is needed.

## Files and metadata

Every document starts with YAML front-matter:

```yaml
---
title: Deploying a Paper Server on Linux
slug: linux-paper
cat: java
level: 2
minutes: 15
mc: ["1.21.x", "1.20.4"]
tags: [linux, paper, systemd]
updated: 2026-10-03
draft: false
---
```

| Field | Meaning |
|---|---|
| `title` | Page and list title |
| `slug` | File name without `.md`, also the URL segment |
| `cat` | Category folder: `java`, `bedrock`, `ops`, `faq` |
| `level` | Difficulty 1-3, shown as a tag |
| `minutes` | Estimated reading time in minutes |
| `mc` | Supported Minecraft versions |
| `tags` | Tags, also used by site search |
| `updated` | `YYYY-MM-DD`; listings sort by it |
| `draft` | `true` keeps the page offline |

## Content extensions

:::step Step blocks
Open with `:::step Title` and close with a single `:::` line. Consecutive blocks merge into a numbered step list.
:::

:::note
`:::note` for side notes.
:::

:::warn
`:::warn` for common pitfalls.
:::

:::danger
`:::danger` for irreversible operations.
:::

Standard Markdown works as well: headings (which build the table of contents), lists, tables, task lists, inline code and fenced code blocks with a language tag.

## How to submit

1. Create a branch and add files following the layout above;
2. Verify locally with `php -S 127.0.0.1:8080 -t public tools/dev-router.php` and request `/api/content?type=tutorials&lang=en`;
3. Open a pull request describing the scope and your verification.
