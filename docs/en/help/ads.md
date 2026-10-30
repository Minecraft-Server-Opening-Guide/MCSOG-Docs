---
title: Advertising
slug: ads
level: 1
minutes: 8
tags: [ads, advertising, RADS, API, partnership]
updated: 2026-10-30
draft: false
---

MCSOG offers advertising placements for servers, tools and community projects. Every ad is reviewed before it goes live, and we reserve the right to reject, adjust or remove any ad.

## What is ADS?

ADS is the site's advertising system. It currently supports top banners, in-article ads and other placements. Each ad can configure:

- The ad image and click-through URL;
- Main title, subtitle, ad description and their colors;
- Ad badge, badge colors, team name and verification prefix;
- Hover bubble text and colors.

Ad content must be accurate, clear and consistent with the landing page.

## Submit an ad

Please use the application form:

[Submit an advertising application](https://wj.qq.com/s2/28404050/9smy/)

Please include:

- Advertiser name and contact details;
- Creative assets and landing page URL;
- Preferred placement and schedule;
- Whether you need remote ads (RADS).

After approval, an administrator will enable the placement in the ad editor.

## RADS remote ads

RADS (Remote Advertising Services) lets advertisers maintain their own HTTPS JSON endpoint. MCSOG fetches the endpoint when the ad is displayed. It is suitable for campaigns that change images, copy or landing pages frequently.

:::warn Warning
After ticking the remote ad option, the feature must pass review before it can be enabled.
:::

## API specification

### Request

- Method: `GET`
- Response: `application/json; charset=utf-8`
- Header: `Accept: application/json`
- No cookies are sent and no token authentication is used; the endpoint must be publicly reachable
- CORS response header: `Access-Control-Allow-Origin: *` or `https://mcsog.ndpreforged.com`

### Blank template

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

### Fields

| Field | Meaning | Notes |
| --- | --- | --- |
| `imageUrl` | Ad image | Required; `https://...` or `/assets/...` |
| `clickUrl` | Click-through URL | Optional; `https://...` or site path `/...` |
| `mainTitle` | Main title | Plain text, up to 80 characters recommended |
| `mainTitleColor` | Main title color | Hex color |
| `subTitle` | Subtitle | Plain text, up to 120 characters recommended |
| `subTitleColor` | Subtitle color | Hex color |
| `adDescription` | Ad description | Plain text, up to 160 characters recommended |
| `announcementBackgroundColor` | Description background | Hex color |
| `announcementTextColor` | Description text color | Hex color |
| `adBadge` | Ad badge | Text; `不显示`, `none`, `off` or `hidden` hides it |
| `adBadgeBackgroundColor` | Badge background | Hex color |
| `adBadgeTextColor` | Badge text color | Hex color |
| `bubbleText` | Bubble text | Plain text |
| `teamName` | Team name | Plain text, up to 80 characters recommended |
| `verificationPrefix` | Verification prefix | Plain text, for example "Verified" |
| `bubbleBackgroundColor` | Bubble background | Hex color |
| `bubbleTextColor` | Bubble text color | Hex color |
| `bubbleBorderColor` | Bubble border color | Hex color |

Colors support `#RGB`, `#RGBA`, `#RRGGBB` and `#RRGGBBAA`. Empty or invalid colors use the default color.

### Empty values and fallback

- Empty `imageUrl`: fall back to the saved local image; if there is none, the ad is not rendered;
- Empty `clickUrl`: no link is generated;
- Empty title, subtitle or description: that element is hidden;
- Empty or hidden `adBadge`: no badge is shown;
- Empty bubble text and team name: no bubble is shown;
- Non-200 HTTP status, invalid JSON, missing `settings`, CORS failure, timeout or network error: fall back to local content.

### Server example

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
        'mainTitle' => 'Welcome to MCSOG',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'Community: 1083430859',
        'subTitleColor' => '#FFFFFF',
        'adDescription' => 'Official event',
        'announcementBackgroundColor' => '#112233',
        'announcementTextColor' => '#FFFFFF',
        'adBadge' => 'Official',
        'adBadgeBackgroundColor' => '#C8EB21',
        'adBadgeTextColor' => '#121212',
        'bubbleText' => 'Click for details',
        'teamName' => 'MCSOG Team',
        'verificationPrefix' => 'Verified',
        'bubbleBackgroundColor' => '#111827',
        'bubbleTextColor' => '#FFFFFF',
        'bubbleBorderColor' => '#FFFFFF'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## Integration steps

:::step Contact the liaison
Contact details are available in the QQ group or the advertising application.
:::

:::step Provide the API URL
Send the remote ad API URL to the liaison.
:::

:::step Review and enable
After review, an administrator enables remote ads.
:::

## Review and violations

- Creatives, landing pages and remote endpoint content must comply with site rules and applicable laws;
- We may request changes, or suspend or remove an ad without prior notice;
- Content changes on a remote endpoint are still subject to review; remote updates must not be used to bypass review.

:::danger Danger
After remote ads are enabled, if the ad data violates the rules, we will apply penalties in accordance with the rules, including but not limited to revoking access, deleting the ad, stopping the advertiser's campaigns, and not refunding the current month's fee.
:::
