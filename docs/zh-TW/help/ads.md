---
title: 廣告合作
slug: ads
level: 1
minutes: 8
tags: [廣告, ADS, RADS, API, 合作]
updated: 2026-10-30
draft: false
---

MCSOG 為伺服器、工具與社群專案提供廣告版位。所有廣告投放前都需審核，本站保留拒絕、調整或下架廣告的權利。

## ADS 是什麼

ADS 是本站的廣告版位系統，目前支援頂部橫幅、文章內嵌廣告等位置。每則廣告可設定：

- 廣告圖片與點擊跳轉連結；
- 主標題、副標題及各自顏色。

廣告內容應真實、清楚，並與落地頁一致。

## 投廣申請

請透過以下表單提交合作資訊：

[提交廣告合作申請](https://wj.qq.com/s2/28404050/9smy/)

建議提供：

- 廣告主名稱與聯絡方式；
- 圖片素材、落地頁網址；
- 期望投放位置與時間；
- 是否需要遠端廣告（RADS）。

審核通過後，由管理員在廣告編輯器中開通版位。

## RADS 遠端廣告

RADS（Remote Advertising Services，遠端廣告服務）允許廣告主自行維護一個 HTTPS JSON 介面，MCSOG 在展示廣告時即時拉取介面內容。適合需要頻繁更換圖片、活動文案或落地頁的廣告。

:::warn 注意
勾選遠端廣告選項後需經過審查才能開啟此功能。
:::
## API 規範

### 請求

- 方法：`GET`
- 回傳：`application/json; charset=utf-8`
- 請求標頭：`Accept: application/json`
- 不攜帶 Cookie，也不使用 token 驗證；介面必須公開可存取
- 跨域標頭：`Access-Control-Allow-Origin: *` 或 `https://mcsog.ndpreforged.com`

### 空白範本

```json
{
  "settings": {
    "imageUrl": "",
    "clickUrl": "",
    "mainTitle": "",
    "mainTitleColor": "",
    "subTitle": "",
    "subTitleColor": ""
  }
}
```

### 欄位說明

| 欄位 | 含義 | 說明 |
| --- | --- | --- |
| `imageUrl` | 廣告圖片 | 必填，支援 `https://...` 或 `/assets/...` |
| `clickUrl` | 點擊跳轉 | 可空，支援 `https://...` 或站內 `/...` |
| `mainTitle` | 主標題 | 純文字，建議不超過 80 字 |
| `mainTitleColor` | 主標題顏色 | 十六進位色值 |
| `subTitle` | 副標題 | 純文字，建議不超過 120 字 |
| `subTitleColor` | 副標題顏色 | 十六進位色值 |

顏色支援 `#RGB`、`#RGBA`、`#RRGGBB`、`#RRGGBBAA`。顏色為空或格式錯誤時使用預設顏色。

### 空值與回退

- `imageUrl` 為空：回退本地已儲存圖片；沒有圖片則不顯示；
- `clickUrl` 為空：不產生跳轉連結；
- 標題、副標題為空：對應內容不顯示；
- HTTP 非 200、JSON 非法、缺少 `settings`、跨域失敗、逾時或網路錯誤：回退本地內容。

### 伺服器範例

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
        'mainTitle' => '歡迎來到 MCSOG',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'QQ 交流群：1083430859',
        'subTitleColor' => '#FFFFFF'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## 接入步驟

:::step 聯繫對接人員
可於 QQ 群或廣告合作申請中取得聯絡方式。
:::

:::step 提供 API 連結
向對接人員提供遠端廣告 API 連結。
:::

:::step 審核與開啟
審核通過後由管理員開啟遠端廣告。
:::
## 審核與違規處理

- 廣告素材、落地頁與遠端介面內容都必須符合本站規範與當地法律法規；
- 本站有權要求修改素材，或在不另行通知的情況下暫停、下架廣告；
- 遠端介面內容變更後仍需遵守審核要求，不得藉遠端更新繞過審核。

:::danger 危險
注意：開啟遠端廣告功能後，若廣告資料出現違規，我方將按規範進行處罰（包括但不限於撤銷權限、刪除廣告、停止貴方廣告投放，且當月費用不予退還）。
:::
