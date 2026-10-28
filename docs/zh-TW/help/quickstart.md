---
title: 新手入門
slug: quickstart
updated: 2026-10-05
---

## 先確定你的版本

- **Java 版**：Windows / macOS / Linux 上的官方 Java 版本，服務端核心選擇最多（Paper、Purpur、Fabric、Forge、Velocity）。
- **基岩版**：手機、主機與 Windows 上的版本，官方服務端為 BDS，社群方案有 Nukkit、PocketMine-MP。

兩版之間可以用 Geyser + Floodgate 互通，讓基岩版玩家直連 Java 版伺服器。

## 推薦閱讀順序
:::step 確認執行環境
先看「Java 版開服 → JDK 與版本對應」確認 Java 版本，再決定用哪套服務端核心。
:::
:::step 部署服務端
按「在 Linux 上部署 Paper 服務端」或「BDS 官方服務端部署」從零跑通首次啟動。
:::
:::step 完成基礎配置
閱讀「server.properties 詳解」與「埠、防火牆與內網穿透」，讓玩家能連進來。
:::
:::step 長期維運
配置「備份與回滾」，並學會用「TPS / MSPT 排查」定位卡頓。
:::
:::note
下載資源需要登入。本站只做收錄與跳轉，資源版權歸原作者所有。
:::

## 學習路線圖

上面回答的是「去哪找」，下面回答的是「按什麼順序讀」。本站教學有幾十篇，按階段推進才不會東一榔頭西一棒子：先搞懂名詞，再決定開哪種服，然後本地跑通、讓別人能進來、裝插件、做維運，最後才談運營。

| 階段 | 目標 | 按順序讀這些文件 | 讀完你應該能做到什麼 |
|---|---|---|---|
| 階段 0 | 先搞懂名詞 | [術語表](/tutorials/ops/glossary)、[JAVA VS 基岩](/wiki/editions) | 分得清 Java 版與基岩版，看懂後面教學裡出現的名詞 |
| 階段 1 | 決定開哪種服 | [基岩版服務端類型](/tutorials/bedrock/type) 或 [開服協議與配置推薦](/tutorials/java/protocol)、[作業系統選擇](/tutorials/java/os)、[服務端選擇](/tutorials/java/core) | 選定版本、核心與作業系統，並知道該買多大的機器 |
| 階段 2 | 本地跑起來 | [環境準備（Windows 與 Linux）](/tutorials/java/environment)、[開啟服務端](/tutorials/java/start)、[服務端結構](/tutorials/java/structure)、[配置服務端](/tutorials/java/config)、[常用服務端指令](/tutorials/java/commands) | 能在自己電腦上啟動服務端、進服、正常關服，並看懂服務端目錄與配置 |
| 階段 3 | 讓別人能進來 | [部署到可存取環境](/tutorials/java/deploy)、[手機玩家支援](/tutorials/java/mobile) | 外部玩家能用 IP 或網域連上；需要時讓基岩版/手機玩家也能進（跨端互通） |
| 階段 4 | 裝插件與玩法 | [插件入門](/tutorials/java/plugins)、[插件配置基礎](/tutorials/java/plugin-config)、[常用前置插件](/tutorials/java/plugin-deps)、[插件管理與排毒](/tutorials/java/plugin-manage) | 會挑插件、裝前置、改配置，插件出問題時能定位到是哪一個 |
| 階段 5 | 讓它穩 | [備份與恢復](/tutorials/java/backup)、[異地備份](/tutorials/ops/offsite-backup)、[服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates)、[監控與告警](/tutorials/ops/monitoring) | 有驗證過能恢復的備份，更新前知道怎麼回滾，伺服器出狀況時能提前收到提醒 |
| 階段 6 | 遇到問題 | [[JAVA] 常見問題](/tutorials/faq/faq-java)、[Java 版常見報錯與崩潰排查](/tutorials/faq/errors)、[實體與掉落物堆積導致的卡頓](/tutorials/faq/entity-lag)、[用 spark 分析伺服器效能](/tutorials/ops/spark)、[基岩版服務端執行問題排查](/tutorials/faq/bedrock-issues) | 看到報錯知道先看哪裡；卡頓能區分是配置、插件還是玩法造成的 |
| 階段 7 | 安全與維運 | [網路安全基礎](/tutorials/ops/network-security)、[系統安全加固](/tutorials/ops/system-security)、[常見網路攻擊類型與 Minecraft 專項防禦](/tutorials/ops/attack-defense) | 只開放必要埠、不用 root 跑服務端，被打時知道先做什麼 |
| 階段 8 | 運營 | [[JAVA] 經營管理](/tutorials/ops/management-java)、[宣傳與引流 / 社群運營](/tutorials/ops/promotion) | 有基本的規則、管理與宣傳思路，知道伺服器靠什麼留住玩家 |

階段 0 到階段 3 是「能開起來」，階段 4 到階段 5 是「能開得久」，階段 6 到階段 8 是「出事了不慌、有人來玩」。不必嚴格按順序，但**別跳過階段 0 和階段 5**。

### 三條最容易踩的坑

1. **更新前沒備份**：更新核心、插件或 MCDR 之前先備份，並確認這份備份**真的能恢復**。見 [備份與恢復](/tutorials/java/backup) 與 [服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates)。
2. **沒配好白名單和正版驗證就公開位址**：`online-mode` 與白名單還沒弄好就把 IP 發出去，等於把伺服器交給陌生人。見 [配置服務端](/tutorials/java/config) 與 [網路安全基礎](/tutorials/ops/network-security)。
3. **沒測試新核心就直接升級世界**：世界一旦被新版本開啟過，就很難再退回舊版本。先在副本上測試，再動正式存檔。見 [服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates) 與 [Java 版常見報錯與崩潰排查](/tutorials/faq/errors)。

### 只想開個基岩版服？

Java 版那一大串插件教學可以先跳過，按這條線走即可：

1. [基岩版服務端類型](/tutorials/bedrock/type) —— 先搞清楚 BDS 與第三方核心的區別。
2. [基岩版核心選擇](/tutorials/bedrock/cores) —— 決定用哪個核心。
3. [BDS 服務端](/tutorials/bedrock/bds) 或 [基岩版第三方核心上手](/tutorials/bedrock/third-party-setup) —— 按你選的核心部署。
4. [部署到可存取環境](/tutorials/java/deploy) —— 讓外網連得上（網路部分是通用的）。
5. [基岩版服務端執行問題排查](/tutorials/faq/bedrock-issues)、[[BE] 常見問題](/tutorials/faq/faq-be) —— 出問題先看這兩篇。
6. [備份與恢復](/tutorials/java/backup) —— 無論哪個版本，備份都是必須的。

## 常用入口

| 想做什麼 | 去哪裡 |
|---|---|
| 找教學 | 側欄「開服教學」 |
| 下核心 | 側欄「資源下載 → 服務端核心」 |
| 查版本 | 側欄「版本百科 → 版本時間線」 |
| 遇到報錯 | 側欄「常見問題」 |
