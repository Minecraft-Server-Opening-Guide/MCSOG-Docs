---
title: 新手入门
slug: quickstart
updated: 2026-10-05
---

## 先确定你的版本

- **Java 版**：Windows / macOS / Linux 上的官方 Java 版本，服务端核心选择最多（Paper、Purpur、Fabric、Forge、Velocity）。
- **基岩版**：手机、主机与 Windows 上的版本，官方服务端为 BDS，社区方案有 Nukkit、PocketMine-MP。

两版之间可以用 Geyser + Floodgate 互通，让基岩版玩家直连 Java 版服务器。

## 推荐阅读顺序
:::step 确认运行环境
先看「Java 版开服 → JDK 与版本对应」确认 Java 版本，再决定用哪套服务端核心。
:::
:::step 部署服务端
按「在 Linux 上部署 Paper 服务端」或「BDS 官方服务端部署」从零跑通首次启动。
:::
:::step 完成基础配置
阅读「server.properties 详解」与「端口、防火墙与内网穿透」，让玩家能连进来。
:::
:::step 长期运维
配置「备份与回滚」，并学会用「TPS / MSPT 排查」定位卡顿。
:::
:::note
下载资源需要登录。本站只做收录与跳转，资源版权归原作者所有。
:::

## 学习路线图

上面回答的是「去哪找」，下面回答的是「按什么顺序读」。本站教程有几十篇，按阶段推进才不会东一榔头西一棒子：先搞懂名词，再决定开哪种服，然后本地跑通、让别人能进来、装插件、做运维，最后才谈运营。

| 阶段 | 目标 | 按顺序读这些文档 | 读完你应该能做到什么 |
|---|---|---|---|
| 阶段 0 | 先搞懂名词 | [术语表](/tutorials/ops/glossary)、[JAVA VS 基岩](/wiki/editions) | 分得清 Java 版与基岩版，看懂后面教程里出现的名词 |
| 阶段 1 | 决定开哪种服 | [基岩版服务端类型](/tutorials/bedrock/type) 或 [开服协议与配置推荐](/tutorials/java/protocol)、[操作系统选择](/tutorials/java/os)、[服务端选择](/tutorials/java/core) | 选定版本、核心与操作系统，并知道该买多大的机器 |
| 阶段 2 | 本地跑起来 | [环境准备（Windows 与 Linux）](/tutorials/java/environment)、[开启服务端](/tutorials/java/start)、[服务端结构](/tutorials/java/structure)、[配置服务端](/tutorials/java/config)、[常用服务端指令](/tutorials/java/commands) | 能在自己电脑上启动服务端、进服、正常关服，并看懂服务端目录与配置 |
| 阶段 3 | 让别人能进来 | [部署到可访问环境](/tutorials/java/deploy)、[手机玩家支持](/tutorials/java/mobile) | 外部玩家能用 IP 或域名连上；需要时让基岩版/手机玩家也能进（跨端互通） |
| 阶段 4 | 装插件与玩法 | [插件入门](/tutorials/java/plugins)、[插件配置基础](/tutorials/java/plugin-config)、[常用前置插件](/tutorials/java/plugin-deps)、[插件管理与排毒](/tutorials/java/plugin-manage) | 会挑插件、装前置、改配置，插件出问题时能定位到是哪一个 |
| 阶段 5 | 让它稳 | [备份与恢复](/tutorials/java/backup)、[异地备份](/tutorials/ops/offsite-backup)、[服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates)、[监控与告警](/tutorials/ops/monitoring) | 有验证过能恢复的备份，更新前知道怎么回滚，服务器出状况时能提前收到提醒 |
| 阶段 6 | 遇到问题 | [[JAVA] 常见问题](/tutorials/faq/faq-java)、[Java 版常见报错与崩溃排查](/tutorials/faq/errors)、[实体与掉落物堆积导致的卡顿](/tutorials/faq/entity-lag)、[用 spark 分析服务器性能](/tutorials/ops/spark)、[基岩版服务端运行问题排查](/tutorials/faq/bedrock-issues) | 看到报错知道先看哪里；卡顿能区分是配置、插件还是玩法造成的 |
| 阶段 7 | 安全与运维 | [网络安全基础](/tutorials/ops/network-security)、[系统安全加固](/tutorials/ops/system-security)、[常见网络攻击类型与 Minecraft 专项防御](/tutorials/ops/attack-defense) | 只开放必要端口、不用 root 跑服务端，被打时知道先做什么 |
| 阶段 8 | 运营 | [[JAVA] 经营管理](/tutorials/ops/management-java)、[宣传与引流 / 社群运营](/tutorials/ops/promotion) | 有基本的规则、管理与宣传思路，知道服务器靠什么留住玩家 |

阶段 0 到阶段 3 是「能开起来」，阶段 4 到阶段 5 是「能开得久」，阶段 6 到阶段 8 是「出事了不慌、有人来玩」。不必严格按顺序，但**别跳过阶段 0 和阶段 5**。

### 三条最容易踩的坑

1. **更新前没备份**：更新核心、插件或 MCDR 之前先备份，并确认这份备份**真的能恢复**。见 [备份与恢复](/tutorials/java/backup) 与 [服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates)。
2. **没配好白名单和正版验证就公开地址**：`online-mode` 与白名单还没弄好就把 IP 发出去，等于把服务器交给陌生人。见 [配置服务端](/tutorials/java/config) 与 [网络安全基础](/tutorials/ops/network-security)。
3. **没测试新核心就直接升级世界**：世界一旦被新版本打开过，就很难再退回旧版本。先在副本上测试，再动正式存档。见 [服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates) 与 [Java 版常见报错与崩溃排查](/tutorials/faq/errors)。

### 只想开个基岩版服？

Java 版那一大串插件教程可以先跳过，按这条线走即可：

1. [基岩版服务端类型](/tutorials/bedrock/type) —— 先搞清楚 BDS 与第三方核心的区别。
2. [基岩版核心选择](/tutorials/bedrock/cores) —— 决定用哪个核心。
3. [BDS 服务端](/tutorials/bedrock/bds) 或 [基岩版第三方核心上手](/tutorials/bedrock/third-party-setup) —— 按你选的核心部署。
4. [部署到可访问环境](/tutorials/java/deploy) —— 让外网连得上（网络部分是通用的）。
5. [基岩版服务端运行问题排查](/tutorials/faq/bedrock-issues)、[[BE] 常见问题](/tutorials/faq/faq-be) —— 出问题先看这两篇。
6. [备份与恢复](/tutorials/java/backup) —— 无论哪个版本，备份都是必须的。

## 常用入口

| 想做什么 | 去哪里 |
|---|---|
| 找教程 | 侧栏「开服教程」 |
| 下核心 | 侧栏「资源下载 → 服务端核心」 |
| 查版本 | 侧栏「版本百科 → 版本时间线」 |
| 遇到报错 | 侧栏「常见问题」 |
