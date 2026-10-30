---
title: 广告合作
slug: ads
level: 1
minutes: 8
tags: [广告, ADS, RADS, API, 合作]
updated: 2026-10-30
draft: false
---

MCSOG 为服务器、工具和社区项目提供广告展示位。所有广告在投放前都需要审核，本站保留拒绝、调整或下架广告的权利。

## ADS 是什么

ADS 是本站的广告系统，目前支持顶部横幅、文章内嵌广告等位置。每条广告可以配置：

- 广告图片与点击跳转链接；
- 主标题、副标题及各自颜色。

广告内容应当真实、清晰，并与落地页保持一致。

## 投广申请

请通过下面的申请表提交合作信息：

[提交广告合作申请](https://wj.qq.com/s2/28404050/9smy/)

建议在申请中提供：

- 广告主名称与联系方式；
- 图片素材、落地页地址；
- 期望投放的位置与时间；
- 是否需要远程广告（RADS）。

审核通过后，由管理员在广告编辑器中开通对应广告位。

## RADS 远程广告

RADS（Remote Advertising Services，远程广告服务）允许广告主自行维护一个 HTTPS JSON 接口，MCSOG 在展示广告时实时拉取接口内容。适合需要频繁更换图片、活动文案或落地页的广告。

:::warn 注意
勾选远程广告选项后需要经过审查才能开启该功能。
:::

## API 规范

### 请求

- 方法：`GET`
- 返回：`application/json; charset=utf-8`
- 请求头：`Accept: application/json`
- 不携带 Cookie，也不使用 token 鉴权；接口必须公开可访问
- 跨域响应头：`Access-Control-Allow-Origin: *` 或 `https://mcsog.ndpreforged.com`

### 空白模板

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

### 字段说明

| 字段 | 含义 | 说明 |
| --- | --- | --- |
| `imageUrl` | 广告图片 | 必填，支持 `https://...` 或 `/assets/...` |
| `clickUrl` | 点击跳转 | 可空，支持 `https://...` 或站内 `/...` |
| `mainTitle` | 主标题 | 纯文本，建议不超过 80 字 |
| `mainTitleColor` | 主标题颜色 | 十六进制色值 |
| `subTitle` | 副标题 | 纯文本，建议不超过 120 字 |
| `subTitleColor` | 副标题颜色 | 十六进制色值 |

颜色支持 `#RGB`、`#RGBA`、`#RRGGBB`、`#RRGGBBAA`。颜色为空或格式错误时使用默认颜色。

### 空值与回退

- `imageUrl` 为空：回退本地已保存图片；没有图片则不展示；
- `clickUrl` 为空：不生成跳转链接；
- 标题、副标题为空：对应内容不显示；
- HTTP 非 200、JSON 非法、缺少 `settings`、跨域失败、超时或网络错误：回退本地内容。

### 服务端示例

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
        'clickUrl' => 'https://example.com/activity',
        'mainTitle' => '欢迎来到 MCSOG',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'QQ交流群：1083430859',
        'subTitleColor' => '#FFFFFF'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## 接入步骤

:::step 联系对接人员
可在 QQ 群或广告合作申请中获取联系方式。
:::

:::step 提供 API 链接
向对接人员提供远程广告 API 链接。
:::

:::step 审核与开启
审核通过后由管理员开启远程广告。
:::

## 审核与违规处理

- 广告素材、落地页和远程接口内容都必须符合本站规范与所在地法律法规；
- 本站有权要求修改素材，或在不另行通知的情况下暂停、下架广告；
- 远程接口内容变更后仍需遵守审核要求，不得借远程更新绕过审核。

:::danger 危险
开启远程广告功能后，若广告数据出现违规，我方将按规范进行处罚（包括但不限于撤销权限、删除广告、停止贵方广告投放，且当月费用不予退还）。
:::
