---
title: 編輯指南
slug: guide
updated: 2026-10-06
---

本站內容以 Markdown 形式儲存，全部放在公開倉庫 [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) 裡，任何人都可以提交修改。

## 目錄與命名

| 類型 | 路徑 |
| --- | --- |
| 教學 | `docs/zh/tutorials/<category>/<slug>.md`，分類為 `java` / `bedrock` / `ops` / `faq` |
| 百科 | `docs/zh/wiki/<name>.md` |
| 公告 | `docs/zh/news/<name>.md` |
| 幫助 | `docs/zh/help/<name>.md` |

英文檔案與中文**路徑一一對應**，只把 `zh` 換成 `en`。
`<slug>` 用小寫英文與連字元，會成為頁面 URL 的最後一段；檔名與 `slug` 必須一致。

教學檔案開頭需要 YAML front-matter：

```yaml
---
title: 在 Linux 上部署 Paper 服務端
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

| 欄位 | 含義 |
| --- | --- |
| `title` | 頁面與列表標題 |
| `slug` | 檔名去掉 `.md`，同時是 URL 的一段 |
| `cat` | 分類目錄：`java` / `bedrock` / `ops` / `faq` |
| `level` | 難度 1–3，顯示為標籤 |
| `minutes` | 預計閱讀分鐘數 |
| `mc` | 適用的 Minecraft 版本 |
| `tags` | 標籤，站內搜尋也會用到 |
| `updated` | `YYYY-MM-DD`，列表按它排序 |
| `draft` | 設為 `true` 時該頁不上線 |

## 正文擴充

:::step 步驟塊
用 `:::step Title` 開始、單獨一行 `:::` 結束。連續多個步驟塊會自動合併成帶序號的步驟條。
:::

:::note
`:::note` 提示框，適合補充說明。
:::

:::warn
`:::warn` 警告框，適合容易踩坑的地方。
:::

:::danger
`:::danger` 危險框，適合不可逆操作（刪庫、覆蓋配置等）。
:::

其餘支援標準 Markdown：標題（自動生成右側目錄）、列表、表格、任務列表、行內程式碼、帶語言標註的程式碼圍欄。

## 提交方式

:::step 在倉庫新建分支
Fork [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) 後新建一個分支，按上面的目錄與命名新增檔案。
:::

:::step 提交 Pull Request
在 PR 裡說明**改動範圍**。
:::

:::note
合併進 `main` 後自動生效：30 分鐘內同步進主倉庫，2 小時內上線。
:::

寫作與引用規範見[貢獻與規範](/help/contribute)。
