---
title: Java 与基岩版跨端联机速查表
slug: cross-play
cat: ops
level: 2
order: 30
minutes: 8
tags: [跨端, 基岩版, Geyser, Floodgate, 联机, 端口]
updated: 2026-10-04
draft: false
---

很多玩家想用基岩版客户端进入 Java 版服务器。我们把整套流程整理成了一页速查表。

## 要点

:::step 原理
Geyser 把基岩版协议转换成 Java 版协议，Floodgate 则让基岩版玩家无需 Java 账号也能完成登录验证。
:::

:::step 装在哪里
可以装在代理端（Velocity、BungeeCord），也可以装在单台 Paper 服务端上。装在代理端更便于集中管理。
:::

:::step 要放行的端口
Java 版默认使用 TCP 25565，基岩版默认使用 UDP 19132。防火墙与云服务器安全组两处都必须放行。
:::

:::danger
不要在公开服务器上关闭正版验证来「解决」登录问题，那等于让任何人用任意名字进服。正确做法是配好 Floodgate。
:::

完整步骤见「手机玩家支持」。
