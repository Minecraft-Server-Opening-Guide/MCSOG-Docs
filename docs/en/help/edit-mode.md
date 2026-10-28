---
title: Edit mode guide
slug: edit-mode
updated: 2026-10-03
---

After signing in, an edit-mode button appears in the top bar when your account permission contains **mcsog**. Turning it on shows an editing toolbar at the bottom of the page; every change is committed to the GitHub repository and synced to the live site.

## What you can change

:::step Interface copy
Open "Copy" to browse the dictionary (searchable), or **click any interface text on the page** to reverse-look-up its dictionary key and edit it in place.
:::

:::step Documents and news
On a tutorial, news or help page, "Edit this page" opens a Markdown editor. Saving writes back to `docs/` and commits.
:::

:::step New content
"New document" asks for type, category, language, slug and title. The body supports `:::step`, `:::note`, `:::warn`, `:::danger`, fenced code and tables.
:::

:::step Images
"Images" uploads PNG, JPEG, WebP, GIF or AVIF and returns a ready-to-use URL, committed to the repository as well.
:::

:::step Navigation
"Navigation" adds an item to any section or removes an existing one by editing `nav.config.js`.
:::

:::warn
In edit mode the server commits and pushes with a configured key. Run `git pull` before local development to avoid diverging from the server-side commits.
:::

## Permission and security

- The permission comes from the OAuth provider's `permission` field; the edit entry only appears when it contains the configured token (default `mcsog`);
- Write endpoints re-check the permission server-side and reject cross-origin requests;
- The SSH private key used for pushing is stored **AES-256-GCM encrypted** in `config/edit.php`, decrypted to a 0600 temporary file at runtime and deleted right after the push;
- Image uploads are capped at 2 MB and must be real image types.
