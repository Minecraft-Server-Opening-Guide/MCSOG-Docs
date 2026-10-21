---
title: 服務端結構
slug: structure
cat: java
level: 1
order: 6
minutes: 10
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 目錄, 結構, 備份, 世界, 配置]
updated: 2026-10-04
draft: false
---

伺服器跑起來之後，目錄裡會冒出一堆檔案和資料夾。**知道哪個能動、哪個千萬別碰**，是後面所有操作（裝插件、備份、遷移）的基礎。

下面以插件端（Paper / Purpur 這類）為例。

## 一、資料夾

| 資料夾 | 作用 | 能不能動 |
| --- | --- | --- |
| `plugins/` | 插件放這裡 | 常動 |
| `world/` | **主世界**資料 | 只能整體備份，別手改 |
| `world_nether/` | 下界資料 | 同上 |
| `world_the_end/` | 末地資料 | 同上 |
| `logs/` | 執行日誌，排查問題靠它 | 可刪舊的 |
| `crash-reports/` | 崩潰報告，報錯時第一時間看這裡 | 可刪舊的 |
| `config/` | Paper 系的核心配置（如 `paper-world-defaults.yml`） | 改前備份 |
| `libraries/` `versions/` `cache/` | 依賴庫與快取，**自動生成** | 別動 |
| `mods/` | 僅**模組端**（Fabric / Forge）與混合端才有 | 常動 |

## 二、根目錄的關鍵檔案

| 檔案 | 作用 |
| --- | --- |
| `server.properties` | **最基礎的服務端配置**（埠、正版驗證、視距……） |
| `eula.txt` | 協議同意檔案，必須是 `eula=true` |
| `<core-name>.jar` | 服務端核心本體 |
| `ops.json` | OP（管理員）名單 |
| `whitelist.json` | 白名單名單 |
| `banned-players.json` / `banned-ips.json` | 封禁名單 |
| `usercache.json` | 玩家名與 UUID 的快取 |
| `bukkit.yml` / `spigot.yml` | Bukkit / Spigot 層配置（Paper 系都有） |
| `purpur.yml` / `paper.yml` | 對應核心自己的配置（換了核心才有） |
| `commands.yml` | 指令別名與攔截對映 |
| `permissions.yml` | 預設權限定義 |

## 三、世界資料夾裡是什麼

`world/` 內部才是真正的存檔，**備份時整個 `world` 一起備**：

| 子目錄 | 內容 |
| --- | --- |
| `region/` | **區塊資料**（方塊、地形都在這裡，體積最大） |
| `playerdata/` | 玩家背包、位置、血量 |
| `entities/` | 實體資料（掉落物、生物、村民交易等） |
| `poi/` | 興趣點（村民工作站、床等） |
| `data/` | 世界級資料（地圖、計分板等） |
| `datapacks/` | 資料包 |
| `advancements/` `stats/` | 成就與統計 |

:::warn 不要手動編輯世界檔案
直接改 `region/` 裡的檔案極可能**損壞存檔**。要改世界請用 `WorldEdit` 這類插件，或先停服再操作。
:::

## 四、這套結構告訴你的三件事

1. **備份要備什麼**：`world*` 三個世界資料夾 + `plugins/` 裡的配置 + `server.properties`，其餘大多能自動重建。詳見「備份與恢復」。
2. **遷移怎麼遷**：把整個服務端目錄拷到新機器，裝好同版本 Java 即可，路徑別帶中文和空格。
3. **排查從哪看**：先看 `logs/latest.log`，崩了再看 `crash-reports/`。

## 下一步

看懂結構後，開始改配置：見 [配置服務端](/tutorials/java/config)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
