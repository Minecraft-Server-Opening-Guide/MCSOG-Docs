---
title: "[JAVA] 常見問題"
slug: faq-java
cat: faq
level: 1
order: 1
minutes: 12
tags: [java, 常見問題, 排查, 報錯]
updated: 2026-10-04
draft: false
---

這裡彙總 Java 版開服各環節最常見的報錯與坑，**按現象直接查**。每條都標註了出處章節，需要細節就點進去看。

## 一、啟動不起來

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 啟動後**立刻退出**，日誌提示 EULA | 沒同意協議 | 把 `eula.txt` 改成 `eula=true` | [開啟服務端](/tutorials/java/start) |
| `UnsupportedClassVersionError ... class file version 65.0` | **Java 版本不對**（65 = Java 21） | 按版本對照表換對應 Java | [環境準備](/tutorials/java/environment) |
| `'java' 不是内部或外部命令` / `java: command not found` | 沒裝 Java，或 `PATH` 沒配好，或**視窗沒重開** | 檢查 `PATH`，**新開**一個終端再試 | [環境準備](/tutorials/java/environment) |
| 雙擊啟動腳本**視窗一閃而過** | 報錯後視窗自動關閉 | 腳本末尾加 `pause`，或在終端裡執行 | [開啟服務端](/tutorials/java/start) |
| `Address already in use` | 25565 被佔用 | `netstat -ano \| findstr :25565`（Win）/ `ss -tlnp \| grep 25565`（Linux）查 PID 後結束 | [環境準備](/tutorials/java/environment) |
| `Could not reserve enough space for object heap` | `-Xmx` 超過可用記憶體 | 調小 `-Xmx` | [環境準備](/tutorials/java/environment) |
| 首次啟動卡在 `Downloading mojang_x.x.x.jar` | 正在下載執行檔案 | 耐心等；國內網路長期卡住需自備加速手段 | [開啟服務端](/tutorials/java/start) |

## 二、別人連不上

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 自己 `telnet` 通、別人連不上 | **只配了本機防火牆，雲安全組沒放行** | 到雲控制台補入站規則 `TCP 25565` | [部署到可存取環境](/tutorials/java/deploy) |
| 埠檢測顯示關閉 | 服務端**沒啟動**時埠不會監聽 | 先把服務端跑起來再測 | [環境準備](/tutorials/java/environment) |
| 家裡路由器對映了還是不通 | 大機率**沒有公網 IPv4** | 對比路由器 WAN 口 IP 與"我的公網 IP"；不一致則需申請/改用雲伺服器/內網穿透 | [部署到可存取環境](/tutorials/java/deploy) |
| **手機玩家連不上** | 只放行了 TCP | 基岩版/跨端需要額外放行 **UDP 19132** | [手機玩家支援](/tutorials/java/mobile) |

## 三、路徑與權限

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 插件/模組報奇怪的路徑錯誤 | 目錄含**中文或空格** | 遷到 `C:\mcserver` 或 `/opt/mcserver` 這類純英文短路徑 | [服務端結構](/tutorials/java/structure) |
| Linux 下 `Permission denied` | 服務端由 root 建立，普通使用者無寫權限 | `sudo chown -R mcserver:mcserver /opt/mcserver` | [環境準備](/tutorials/java/environment) |
| 世界檔案改完存檔壞了 | 手改了 `region/` 裡的檔案 | **不要手改**世界檔案，用 WorldEdit 等工具，或先停服 | [服務端結構](/tutorials/java/structure) |

## 四、插件相關

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| `/plugins` 裡**紅色** | 載入失敗（服務端認出了但沒載入上） | 去控制台看報錯，通常是缺前置或版本不匹配 | [插件入門](/tutorials/java/plugins) |
| `/plugins` 裡**連紅色都沒有** | 服務端**根本沒識別**它是插件 | 檢查是否放進 `plugins/`、字尾是否 `.jar`、是否下錯核心類型 | [插件入門](/tutorials/java/plugins) |
| 插件報 YAML 錯誤 | **用了 Tab 縮排**（YAML 只允許空格） | 改成空格縮排 | [插件入門](/tutorials/java/plugins) |
| 配置裡中文變亂碼 | 檔案編碼不是 UTF-8 | 用 VS Code 另存為 **UTF-8** | [插件入門](/tutorials/java/plugins) |
| 改完配置沒生效 | 需要過載 | `/<plugin-name> reload`；不支援的只能重啟（**別用原版 `/reload`**） | [插件入門](/tutorials/java/plugins) |
| 伺服器突然卡頓/報怪錯 | 新裝的插件 | **先停用最近新裝的插件**再逐個啟用定位 | [插件入門](/tutorials/java/plugins) |

## 五、生電與機制

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 紅石機器莫名失效 | **Paper 系改動了原版行為** | 生電請用 **Fabric 或 Leaves**；Paper 系只能做輕度生電並調配置 | [生電與紅石](/tutorials/java/redstone) |
| 末影珍珠回傳裝置不工作 | 區塊解除安裝延遲 | `paper-world-defaults.yml` 裡 `delay-chunk-unloads-by: 0s` | [生電與紅石](/tutorials/java/redstone) |
| 密集實體裝置不生效 | 實體碰撞上限 | 調 `max-entity-collisions`（**代價是效能**） | [生電與紅石](/tutorials/java/redstone) |

## 六、效能

| 現象 | 處理 | 出處 |
| --- | --- | --- |
| TPS 掉、整體卡 | 先調 **`simulation-distance`**（比調視距省得多且不影響觀感） | [效能最佳化](/tutorials/java/optimize) |
| 不知道卡在哪 | 用 **spark** 生成火焰圖，看最寬的那條 | [效能最佳化](/tutorials/java/optimize) |
| 玩家跑圖就卡 | 做**世界預生成**（Chunky 一類） | [效能最佳化](/tutorials/java/optimize) |
| 記憶體給了很大還是卡 | `-Xmx` 過大會讓 GC 停頓變長 | 10 人內分 4~6GB 通常足夠 | [開服協議與配置推薦](/tutorials/java/protocol) |
| 單核很弱 | 調參數救不回來，**該換單核更強的機器** | [開服協議與配置推薦](/tutorials/java/protocol) |

## 七、資料與安全

| 現象 | 原因 / 處理 | 出處 |
| --- | --- | --- |
| 存檔損壞 / 資料回滾 | 直接叉視窗關服導致 | 關服請用 `stop`；標準姿勢：`save-all` → `save-off` → 備份 → `stop` | [常用服務端指令](/tutorials/java/commands) |
| 備份出來是壞的 | 邊寫邊拷 | 熱備需先 `save-off`；或停服再備 | [備份與恢復](/tutorials/java/backup) |
| 被破壞了但查不到是誰 | **沒裝記錄插件** | 早裝 CoreProtect 一類，它只能記錄**裝上之後**的事 | [反作弊與防破壞](/tutorials/java/anticheat) |
| 裝了反作弊卻誤傷玩家 | 處罰開得太早 | 先跑**記錄模式**觀察；寧可漏判也別誤傷 | [反作弊與防破壞](/tutorials/java/anticheat) |
| 離線模式的風險 | 任何人可冒用 ID、封禁可繞過 | 公開服**不建議**關正版驗證 | [配置服務端](/tutorials/java/config) |
| 服務商跑路 / 機房出事 | 資料只存在一台機器上 | **至少定期把備份下載到別處** | [備份與恢復](/tutorials/java/backup) |

## 八、跨端與代理

| 現象 | 原因 | 出處 |
| --- | --- | --- |
| 基岩版玩家進不來 | 沒裝 Geyser，或沒放行 UDP | [手機玩家支援](/tutorials/java/mobile) |
| Java 玩家想進基岩版服 | **做不到**：Geyser 是單向的 | [手機玩家支援](/tutorials/java/mobile) |
| 主機平台（Xbox/PS/Switch）進不來 | 它們不能直接輸 IP | [手機玩家支援](/tutorials/java/mobile) |
| 跨服後指令沒反應 | 插件裝錯了位置（代理端 vs 子服） | [跨服端](/tutorials/java/proxy) |
| 擔心轉發金鑰洩露 | 洩露 = 任何人可偽造身份 | 金鑰保密，子服埠**不要暴露公網** | [跨服端](/tutorials/java/proxy) |

> 找不到你的問題？基岩版相關見 [[BE] 常見問題](/tutorials/faq/faq-be)；運營層面的問題見 [[JAVA] 經營管理](/tutorials/ops/management-java)。
