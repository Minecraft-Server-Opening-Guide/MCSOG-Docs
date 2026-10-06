---
title: Editing Guide
slug: guide
updated: 2026-10-06
---

All content lives as plain Markdown in the public repository [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs), so anyone can propose a change.

## Layout and naming

| Kind | Path |
| --- | --- |
| Tutorial | `docs/en/tutorials/<category>/<slug>.md`, category is `java` / `bedrock` / `ops` / `faq` |
| Wiki | `docs/en/wiki/<name>.md` |
| News | `docs/en/news/<name>.md` |
| Help | `docs/en/help/<name>.md` |

The English file **mirrors the Chinese path exactly**, with `zh` replaced by `en`.
Use lowercase ASCII with hyphens for `<slug>`: it becomes the last URL segment, and the file name must match the `slug` field.

Every tutorial starts with YAML front-matter:

```yaml
---
title: Deploying a Paper Server on Linux
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

| Field | Meaning |
| --- | --- |
| `title` | Page and list title |
| `slug` | File name without `.md`, also the URL segment |
| `cat` | Category folder: `java` / `bedrock` / `ops` / `faq` |
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

:::step Create a branch in the repository
Fork [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) and create a branch, then add files following the layout above.
:::

:::step Verify locally
Start the site with `php -S 127.0.0.1:8080 -t public tools/dev-router.php`,
then request `/api/content?type=tutorials&lang=en` and confirm your entry appears.
:::

:::step Open a pull request
Describe the **scope of the change** and **the result of your verification**.
:::

:::note
Once merged into `main` it takes effect automatically: into the main repository within 30 minutes, live within 2 hours.
:::

See [Contribution and rules](/help/contribute) for the writing rules.
