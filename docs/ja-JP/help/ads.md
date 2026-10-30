---
title: 広告掲載
slug: ads
level: 1
minutes: 8
tags: [広告, ADS, RADS, API, 提携]
updated: 2026-10-30
draft: false
---

MCSOG はサーバー、ツール、コミュニティプロジェクト向けの広告枠を提供しています。すべての広告は掲載前に審査され、当サイトは拒否、調整、掲載停止を行う権利を保有します。

## ADS とは

ADS は当サイトの広告枠システムです。現在、トップバナーや記事内広告などの枠に対応しています。広告ごとに次を設定できます。

- 広告画像とクリック先 URL；
- メインタイトル、サブタイトル、広告説明と各色；
- 広告バッジ、バッジ色、チーム名、認証プレフィックス；
- ホバー時のバブルテキストと色。

広告内容は正確かつ明確で、リンク先ページと一致している必要があります。

## 広告掲載の申し込み

以下のフォームからお申し込みください。

[広告掲載を申し込む](https://wj.qq.com/s2/28404050/9smy/)

可能であれば次を含めてください。

- 広告主名と連絡先；
- 画像素材とリンク先 URL；
- 希望する掲載位置と期間；
- リモート広告（RADS）の要否。

承認後、管理者が広告エディターで枠を有効にします。

## RADS リモート広告

RADS（Remote Advertising Services、リモート広告サービス）は、広告主が HTTPS の JSON エンドポイントを運用し、MCSOG が広告表示時に内容を取得する仕組みです。画像やキャンペーン文言、リンク先を頻繁に変更する広告に適しています。

:::warn 注意
リモート広告をチェックした後、機能を有効にするには審査が必要です。
:::
## API 仕様

### リクエスト

- メソッド：`GET`
- レスポンス：`application/json; charset=utf-8`
- ヘッダー：`Accept: application/json`
- Cookie は送信せず、token 認証も使用しません。エンドポイントは公開されている必要があります
- CORS ヘッダー：`Access-Control-Allow-Origin: *` または `https://mcsog.ndpreforged.com`

### 空のテンプレート

```json
{
  "settings": {
    "imageUrl": "",
    "clickUrl": "",
    "mainTitle": "",
    "mainTitleColor": "",
    "subTitle": "",
    "subTitleColor": "",
    "adDescription": "",
    "announcementBackgroundColor": "",
    "announcementTextColor": "",
    "adBadge": "",
    "adBadgeBackgroundColor": "",
    "adBadgeTextColor": "",
    "bubbleText": "",
    "teamName": "",
    "verificationPrefix": "",
    "bubbleBackgroundColor": "",
    "bubbleTextColor": "",
    "bubbleBorderColor": ""
  }
}
```

### フィールド

| フィールド | 意味 | 説明 |
| --- | --- | --- |
| `imageUrl` | 広告画像 | 必須。`https://...` または `/assets/...` |
| `clickUrl` | クリック先 | 任意。`https://...` またはサイト内 `/...` |
| `mainTitle` | メインタイトル | プレーンテキスト、80 文字以内推奨 |
| `mainTitleColor` | メインタイトル色 | 16 進カラー |
| `subTitle` | サブタイトル | プレーンテキスト、120 文字以内推奨 |
| `subTitleColor` | サブタイトル色 | 16 進カラー |
| `adDescription` | 広告説明 | プレーンテキスト、160 文字以内推奨 |
| `announcementBackgroundColor` | 説明背景色 | 16 進カラー |
| `announcementTextColor` | 説明文字色 | 16 進カラー |
| `adBadge` | 広告バッジ | テキスト。`不显示`、`none`、`off`、`hidden` で非表示 |
| `adBadgeBackgroundColor` | バッジ背景色 | 16 進カラー |
| `adBadgeTextColor` | バッジ文字色 | 16 進カラー |
| `bubbleText` | バブル説明 | プレーンテキスト |
| `teamName` | チーム名 | プレーンテキスト、80 文字以内推奨 |
| `verificationPrefix` | 認証プレフィックス | 「認証済み」など |
| `bubbleBackgroundColor` | バブル背景色 | 16 進カラー |
| `bubbleTextColor` | バブル文字色 | 16 進カラー |
| `bubbleBorderColor` | バブル枠色 | 16 進カラー |

色は `#RGB`、`#RGBA`、`#RRGGBB`、`#RRGGBBAA` に対応します。空または不正な色は既定色になります。

### 空値とフォールバック

- `imageUrl` が空：保存済みローカル画像を使用。なければ表示しません；
- `clickUrl` が空：リンクを生成しません；
- タイトル、サブタイトル、説明が空：該当要素を表示しません；
- `adBadge` が空または非表示値：バッジを表示しません；
- バブルテキストとチーム名が両方空：バブルを表示しません；
- HTTP 非 200、不正 JSON、`settings` 欠落、CORS 失敗、タイムアウト、通信エラー：ローカル内容にフォールバックします。

### サーバー例

```php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'settings' => [
        'imageUrl' => 'https://cdn.example.com/ad/banner.png',
        'mainTitle' => 'MCSOG へようこそ',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'QQ グループ：1083430859',
        'subTitleColor' => '#FFFFFF',
        'adDescription' => '公式イベント',
        'announcementBackgroundColor' => '#112233',
        'announcementTextColor' => '#FFFFFF',
        'adBadge' => '公式',
        'adBadgeBackgroundColor' => '#C8EB21',
        'adBadgeTextColor' => '#121212',
        'teamName' => 'MCSOG Team',
        'verificationPrefix' => '認証済み'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## 接続手順

:::step 担当者に連絡
連絡先は QQ グループまたは広告申し込みフォームで確認できます。
:::

:::step API URL を提供
担当者にリモート広告 API の URL を伝えてください。
:::

:::step 審査と有効化
審査通過後、管理者がリモート広告を有効にします。
:::
## 審査と違反対応

- 広告素材、リンク先、リモートエンドポイントの内容は、当サイトの規則と現地法に従う必要があります；
- 当サイトは素材の修正を求めることができ、事前通知なく広告を停止または削除できます；
- リモート更新後も審査要件は適用され、リモート更新で審査を回避することはできません。

:::danger 危険
注意：リモート広告を有効にした後、広告データに違反があった場合、当方は規則に従い処分を行います（権限の剥奪、広告の削除、広告配信の停止、当月料金の返金なしを含みますがこれらに限りません）。
:::
