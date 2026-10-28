---
title: Cookie Usage
slug: cookies
updated: 2026-10-18
---

This page lists every cookie and browser storage entry this site writes, what each one is for, and how you can review, change or clear them. It also explains what the three categories in the cookie settings panel control. For how we handle account data and access logs, see the [Privacy Policy](/en/privacy).

## What cookies and local storage are

A cookie is a short piece of text a site stores in your browser; the browser sends it back on later requests to the same site, which is how login state and language are remembered. Local storage (`localStorage`) and session storage (`sessionStorage`) are key-value stores the browser provides as well: the data stays on your device, is never sent with requests, and can only be read by scripts on the page.

This site uses "cookie" as the umbrella term for all of them. Each entry below says where it actually lives: a cookie, local storage or session storage. None of them contains executable code, and none of them can read other files on your device.

## What this site actually stores

:::note
Every key below was checked against the live code and can be found directly in the Application panel of your browser's developer tools.
:::

### Written by this site

| Key | Stored in | Purpose |
|---|---|---|
| `mcsog_consent` | Local storage | Essential · the consent state you saved in cookie settings; the v2 JSON records essential, optional and third-party choices plus a timestamp |
| `mcsog_session` | Cookie | Essential · session identifier issued after signing in with a third-party account, keeps you signed in |
| `mcsog_lang` | Cookie | Essential · interface language preference, so the server renders the first paint in Chinese or English |
| `mcsog_locale` | Local storage | Essential · front-end language preference, used together with `mcsog_lang` |
| `mcsog_theme` | Local storage | Preference · light or dark theme |
| `mcsog_nav` | Local storage | Preference · whether the sidebar is fully open or collapsed to an icon rail |
| `mcsog_nav_groups` | Local storage | Preference · expanded or collapsed state of the sidebar groups |
| `mcsog_news_read` | Local storage | Preference · announcements you have already read, so the same one is not shown again |
| `mcsog_download_agreement` | Local storage | Preference · record of the agreement accepted on the download and search pages |
| `mcsog_search_history` | Local storage | Preference · recent search terms, kept only in your browser |
| `mcsog_scroll:<path>` | Session storage | Essential · restores the scroll position when you go back; cleared when the tab closes |
| `mcsog_splash` | Session storage | Essential · whether the opening animation already played during this visit |
| `mcsog_downloads_last` | Session storage | Preference · the download section you viewed last, used to highlight the current one |
| `mcsog_tutorials_first_seen` | Local storage | Preference · whether the tutorial first-visit tip has been shown |
| `mcsog_edit` | Local storage | Preference · editor mode switch; only meaningful for accounts with editing rights |

:::tip
"Essential" means required to run the site and to remember your choices; "Preference" means settings that make the site fit the way you browse. Both are written by this site's own code and carry no third-party tracking identifier.
:::

### Third parties

| Key | Stored in | Purpose |
|---|---|---|
| `__51uvsct__…`, `__51vcke__…`, `__51vuft__…` | Cookie | 51LA traffic analytics; tells visitors apart and measures visits and time on page, with the site's analytics ID as the suffix |
| `__51huid__…` | Cookie | 51LA performance monitoring visitor identifier |
| `__vtins__…` | Local storage | 51LA visitor session information |
| `HMACCOUNT` | Cookie | Baidu Analytics visitor identifier |
| `Hm_lvt_…`, `Hm_lpvt_…` | Cookie and local storage | Baidu Analytics first-visit time and visit counts |

Their scripts come from `sdk.51.la` and `hm.baidu.com`: 51LA provides traffic analytics and page performance monitoring, Baidu Analytics provides traffic analytics. New visitors accept every category by default, so both load on the first visit; once you turn "third-party cookies" off and save, the next page load no longer requests those scripts or writes the keys above.

If the AI chat widget is enabled, it keeps its own `astrbot-widget-*` keys for its session and panel position; those are written by that widget and are not controlled by the third-party cookie switch.

## What the three categories control

| Category | Includes | Can it be turned off |
|---|---|---|
| Essential cookies | Session, consent state, scroll position, opening animation record | No, required for the site to work |
| Optional cookies | Preferences such as language, theme, sidebar, read announcements, agreement record | The switch records your preference; these settings are still saved so the site looks the same next time |
| Third-party cookies | 51LA traffic analytics and performance monitoring, Baidu Analytics | Yes, nothing is requested on the next load after you turn it off and save |

## Defaults and how to change them

New visitors accept all three categories by default. At any time, use "Cookie settings" in the footer to switch each category and press "Save cookie preferences". **Changes take effect the next time the page loads**; scripts already loaded on the current page are not removed or injected on the spot.

## How to clear them

In your browser settings, open "Privacy and security" then "Cookies and other site data", where you can delete this site's data, or simply browse in a private window. Once cleared, the site shows the cookie prompt again.

:::warn
Clearing `mcsog_session` signs you out, so you will have to authorize again; clearing `mcsog_consent` makes the cookie settings panel appear once more.
:::

## Withdrawing consent

Open "Cookie settings" in the footer, turn "third-party cookies" off and save. The site then stops loading the 51LA and Baidu Analytics scripts. Third-party cookies already written to your browser expire on their own schedule, and you can also delete them as described above. Withdrawing never blocks you from reading tutorials or downloading resources.

## Contact

If something here is unclear, or a key you observe differs from this page, email [mcsog@ndpreforged.com](mailto:mcsog@ndpreforged.com) and we will correct the page after checking.
