---
title: Java 與基岩版跨端聯機速查表
slug: cross-play
cat: ops
level: 2
order: 30
minutes: 8
tags: [跨端, 基岩版, Geyser, Floodgate, 聯機, 埠]
updated: 2026-10-04
draft: false
---

很多玩家想用基岩版客戶端進入 Java 版伺服器。我們把整套流程整理成了一頁速查表。

## 要點

:::step 原理
Geyser 把基岩版協議轉換成 Java 版協議，Floodgate 則讓基岩版玩家無需 Java 帳號也能完成登入驗證。
:::

:::step 裝在哪裡
可以裝在代理端（Velocity、BungeeCord），也可以裝在單台 Paper 服務端上。裝在代理端更便於集中管理。
:::

:::step 要放行的埠
Java 版預設使用 TCP 25565，基岩版預設使用 UDP 19132。防火牆與雲伺服器安全組兩處都必須放行。
:::

:::danger
不要在公開伺服器上關閉正版驗證來「解決」登入問題，那等於讓任何人用任意名字進服。正確做法是配好 Floodgate。
:::

完整步驟見「手機玩家支援」。
