---
title: الإعلان
slug: ads
level: 1
minutes: 8
tags: [إعلانات, ADS, RADS, API, شراكة]
updated: 2026-10-30
draft: false
---

يوفر MCSOG مساحات إعلانية للسيرفرات والأدوات ومشاريع المجتمع. تخضع كل إعلانات للمراجعة قبل النشر، ونحتفظ بالحق في رفض الإعلان أو تعديله أو إزالته.

## ما هو ADS؟

ADS هو نظام المساحات الإعلانية في الموقع. يدعم حالياً اللافتات العلوية والإعلانات داخل المقالات ومواضع أخرى. يمكن ضبط كل إعلان بما يلي:

- صورة الإعلان ورابط النقر؛
- العنوان الرئيسي والعنوان الفرعي ووصف الإعلان وألوانها؛
- شارة الإعلان وألوانها واسم الفريق وبادئة التحقق؛
- نص الفقاعة وألوانها عند المرور بالمؤشر.

يجب أن يكون محتوى الإعلان صحيحاً وواضحاً ومطابقاً لصفحة الوصول.

## طلب الإعلان

يرجى تقديم الطلب عبر النموذج:

[تقديم طلب إعلان](https://wj.qq.com/s2/28404050/9smy/)

يفضل تضمين:

- اسم المعلن وبيانات التواصل؛
- المواد الإعلانية ورابط صفحة الوصول؛
- الموضع والمدة المطلوبة؛
- هل تحتاج إلى الإعلان البعيد (RADS)؟

بعد الموافقة يقوم المشرف بتفعيل الموضع في محرر الإعلانات.

## إعلانات RADS البعيدة

يتيح RADS (Remote Advertising Services، خدمة الإعلانات البعيدة) للمعلن تشغيل نقطة نهاية HTTPS بصيغة JSON، ويجلب MCSOG محتواها عند عرض الإعلان. يناسب الحملات التي تتغير صورها أو نصوصها أو روابطها كثيراً.

:::warn تحذير
بعد تحديد خيار الإعلان البعيد، يجب اجتياز المراجعة قبل تفعيل الميزة.
:::
## مواصفات API

### الطلب

- الطريقة: `GET`
- الاستجابة: `application/json; charset=utf-8`
- الترويسة: `Accept: application/json`
- لا تُرسل ملفات Cookie ولا يُستخدم التحقق بـ token؛ يجب أن تكون نقطة النهاية متاحة للعامة
- ترويسة CORS: `Access-Control-Allow-Origin: *` أو `https://mcsog.ndpreforged.com`

### القالب الفارغ

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

### الحقول

| الحقل | المعنى | ملاحظات |
| --- | --- | --- |
| `imageUrl` | صورة الإعلان | مطلوب؛ `https://...` أو `/assets/...` |
| `clickUrl` | رابط النقر | اختياري؛ `https://...` أو مسار داخلي `/...` |
| `mainTitle` | العنوان الرئيسي | نص عادي، يُفضل ألا يتجاوز 80 حرفاً |
| `mainTitleColor` | لون العنوان الرئيسي | لون HEX |
| `subTitle` | العنوان الفرعي | نص عادي، يُفضل ألا يتجاوز 120 حرفاً |
| `subTitleColor` | لون العنوان الفرعي | لون HEX |
| `adDescription` | وصف الإعلان | نص عادي، يُفضل ألا يتجاوز 160 حرفاً |
| `announcementBackgroundColor` | خلفية الوصف | لون HEX |
| `announcementTextColor` | لون نص الوصف | لون HEX |
| `adBadge` | شارة الإعلان | نص؛ `不显示` أو `none` أو `off` أو `hidden` يخفيها |
| `adBadgeBackgroundColor` | خلفية الشارة | لون HEX |
| `adBadgeTextColor` | لون نص الشارة | لون HEX |
| `bubbleText` | نص الفقاعة | نص عادي |
| `teamName` | اسم الفريق | نص عادي، يُفضل ألا يتجاوز 80 حرفاً |
| `verificationPrefix` | بادئة التحقق | مثل «تم التحقق» |
| `bubbleBackgroundColor` | خلفية الفقاعة | لون HEX |
| `bubbleTextColor` | لون نص الفقاعة | لون HEX |
| `bubbleBorderColor` | لون إطار الفقاعة | لون HEX |

الألوان المدعومة: `#RGB` و`#RGBA` و`#RRGGBB` و`#RRGGBBAA`. اللون الفارغ أو غير الصالح يستخدم اللون الافتراضي.

### القيم الفارغة والرجوع

- `imageUrl` فارغ: يُستخدم ملف الصورة المحلي المحفوظ؛ وإذا لم يوجد لا يُعرض الإعلان؛
- `clickUrl` فارغ: لا يُنشأ رابط؛
- العنوان أو العنوان الفرعي أو الوصف فارغ: يُخفى العنصر؛
- `adBadge` فارغ أو مخفي: لا تُعرض الشارة؛
- نص الفقاعة واسم الفريق فارغان: لا تُعرض الفقاعة؛
- HTTP غير 200 أو JSON غير صالح أو غياب `settings` أو فشل CORS أو المهلة أو خطأ الشبكة: الرجوع إلى المحتوى المحلي.

### مثال الخادم

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
        'mainTitle' => 'مرحباً بك في MCSOG',
        'mainTitleColor' => '#FFFFFF',
        'subTitle' => 'مجموعة QQ: 1083430859',
        'subTitleColor' => '#FFFFFF',
        'adDescription' => 'فعالية رسمية',
        'announcementBackgroundColor' => '#112233',
        'announcementTextColor' => '#FFFFFF',
        'adBadge' => 'رسمي',
        'adBadgeBackgroundColor' => '#C8EB21',
        'adBadgeTextColor' => '#121212',
        'teamName' => 'MCSOG Team',
        'verificationPrefix' => 'تم التحقق'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## خطوات الربط

:::step تواصل مع المنسق
بيانات التواصل متاحة في مجموعة QQ أو نموذج طلب الإعلان.
:::

:::step قدّم رابط API
قدّم رابط API للإعلان البعيد إلى المنسق.
:::

:::step المراجعة والتفعيل
بعد المراجعة يقوم المشرف بتفعيل الإعلان البعيد.
:::
## المراجعة والمخالفات

- يجب أن تتوافق المواد الإعلانية وصفحة الوصول ومحتوى نقطة النهاية مع قواعد الموقع والقوانين المحلية؛
- يحق لنا طلب تعديل المواد أو إيقاف الإعلان أو إزالته دون إشعار مسبق؛
- تخضع تغييرات المحتوى البعيد للمراجعة أيضاً، ولا يجوز استخدام التحديث البعيد لتجاوز المراجعة.

:::danger خطر
ملاحظة: بعد تفعيل الإعلان البعيد، إذا خالف محتوى الإعلان القواعد فسنطبق العقوبات وفق القواعد، بما في ذلك سحب الصلاحيات وحذف الإعلان وإيقاف حملات المعلن وعدم استرداد رسوم الشهر الحالي.
:::
