---
title: 編集ガイド
slug: guide
updated: 2026-10-06
---

当サイトのコンテンツはすべて Markdown 形式で保存されており、公開リポジトリ [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) に置かれています。どなたでも修正を提案できます。

## ディレクトリと命名

| 種類 | パス |
| --- | --- |
| チュートリアル | `docs/zh/tutorials/<分類>/<slug>.md`、分類は `java` / `bedrock` / `ops` / `faq` |
| 百科 | `docs/zh/wiki/<name>.md` |
| お知らせ | `docs/zh/news/<name>.md` |
| ヘルプ | `docs/zh/help/<name>.md` |

英語版のファイルは中国語版と**パスが一対一で対応**しており、`zh` を `en` に置き換えるだけです。
`<slug>` は小文字の英字とハイフンで指定し、ページ URL の最後のセグメントになります。ファイル名と `slug` は必ず一致させてください。

チュートリアルのファイルは、先頭に YAML front-matter が必要です：

```yaml
---
title: Linux での Paper サーバーの構築
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

| フィールド | 意味 |
| --- | --- |
| `title` | ページと一覧のタイトル |
| `slug` | ファイル名から `.md` を除いたもの。URL の一部にもなる |
| `cat` | 分類ディレクトリ：`java` / `bedrock` / `ops` / `faq` |
| `level` | 難易度 1〜3。タグとして表示される |
| `minutes` | 想定読了時間（分） |
| `mc` | 対象となる Minecraft のバージョン |
| `tags` | タグ。サイト内検索でも使われる |
| `updated` | `YYYY-MM-DD`。一覧はこの値で並び替えられる |
| `draft` | `true` にするとそのページは公開されない |

## 本文の拡張

:::step ステップブロック
`:::step タイトル` で開始し、単独行の `:::` で終了します。連続するステップブロックは自動的に番号付きのステップ表示にまとめられます。
:::

:::note
`:::note` ヒントボックス。補足説明に向いています。
:::

:::warn
`:::warn` 警告ボックス。つまずきやすい箇所に向いています。
:::

:::danger
`:::danger` 危険ボックス。取り消せない操作（データ削除、設定の上書きなど）に向いています。
:::

そのほか標準 Markdown が使えます：見出し（右側の目次が自動生成されます）、リスト、表、タスクリスト、インラインコード、言語指定付きのコードフェンス。

## HTML 埋め込み拡張

`html.()` は Markdown に生の HTML を埋め込み、HTML/JS の実行を維持します。内容は既定で Shadow DOM に隔離され、内部 CSS がサイトのレイアウト・余白・色に影響しません。
`html.()` 以外の通常の HTML タグはテキストとしてエスケープされ、実行されません。

完全な例：

```text
html.csp=[example.com,*.example.org].L=640.H=360(<div>...</div>)
```

パラメータ：

- `csp=[...]`：許可するドメイン一覧。`*.example.com` のワイルドカードに対応。指定時は CSP 付きの隔離 iframe、未指定時は Shadow DOM を使用。
- `L` / `H`：幅 / 高さ（px）。両方必須で、片方だけの場合は無効となり自動サイズになります。
- パラメータ名は大文字小文字を区別しません。
- `html.()` 内の JS は実行されます。信頼できる内容だけを埋め込んでください。

## 投稿方法

:::step リポジトリにブランチを作成
[MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) を Fork してブランチを作成し、上記のディレクトリと命名に従ってファイルを追加します。
:::

:::step Pull Request を送信
PR で**変更範囲**を説明してください。
:::

:::note
`main` にマージされると自動的に反映されます：30 分以内にメインリポジトリへ同期され、2 時間以内に公開されます。
:::

執筆と引用のルールは[貢献ガイド](/help/contribute)を参照してください。
