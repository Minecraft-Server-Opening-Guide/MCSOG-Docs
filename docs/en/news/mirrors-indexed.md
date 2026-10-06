---
title: Resource index upgraded: mirrors and checksums
slug: mirrors-indexed
updated: 2026-10-02
---

The download section now lists a checksum, size and mirror set for every file.

## What changed

:::step Checksums
The detail page shows SHA-1 so you can verify a file after downloading:

```bash
sha1sum paper-1.21.4.jar
```
:::

:::step Multiple mirrors
Primary and fallback sources are listed side by side. Authentication and rate limiting happen before the redirect.
:::

:::step Object storage ready
The storage layer supports a local directory and S3-compatible object storage (OSS, COS, MinIO). Switching storage is a configuration change, not a code change.
:::

:::warn
Only take server files from this site or the upstream official channel. Third-party repacks may contain backdoors.
:::
