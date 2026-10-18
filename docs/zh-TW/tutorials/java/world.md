---
title: 世界管理
slug: world
cat: java
level: 3
order: 23
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, world-management, worldedit, fawe, worldguard, multiverse]
updated: 2026-10-04
draft: false
---

伺服器的"世界"不只是伺服器目錄裡那個 `world` 資料夾。只要你想改地形、想保護一片區域、想同時跑大廳和資源世界，就會用到**世界管理**這一類插件。它們通常一起出現，也通常一起出問題。

## 1. 世界管理包含哪幾件事

| 需求 | 典型插件 | 一句話說明 |
| --- | --- | --- |
| 編輯地形與建築 | WorldEdit / FastAsyncWorldEdit | 用選區工具批次改方塊、複製貼上建築 |
| 保護區域與設定世界規則 | WorldGuard | 讓某些區域只有特定的人能動 |
| 同時執行多個世界 | Multiverse-Core | 新建、刪除、匯入世界，管理世界間的傳送 |

這三件事互相咬合：WorldGuard 依賴 WorldEdit（或 FAWE），WorldEdit 的選區指令是劃區域保護的基礎。所以通常是一套裝，而不是挑一個裝。

## 2. WorldEdit 基礎

WorldEdit 就是常說的"創世神"或"小木斧"，幾乎是所有建築與管理工作的起點。它的核心概念只有兩個：**先選區，再操作**。

### 選區

```
//wand              拿到选区工具（默认是木斧）
//pos1  //pos2      把当前位置设为第一个 / 第二个角点
//hpos1 //hpos2     把准星指向的方块设为角点
//expand 10 up      把选区朝某个方向扩展若干格
//size              查看选区尺寸与方块总数
//limit 100000      给自己设一个单次操作的方块上限
```

左鍵點方塊選第一個角，右鍵點方塊選第二個角，這是最常用的方式；`//pos1` / `//pos2` 適合精確站位。

### 常用編輯指令

```
//set stone                 把选区内全部换成石头
//replace dirt grass        只把选区内的泥土换成草方块
//walls stone               只填充选区四壁（做墙很方便）
//copy  //paste             复制选区 / 粘贴到当前位置
//undo  //redo              撤销 / 重做
```

### 儲存與貼上建築（schematic）

```
//schem save 建筑名         把当前选区存成文件
//schem load 建筑名         读取已保存的文件
//paste                     粘贴到当前位置
```

檔案通常落在 `plugins/WorldEdit/schematics/` 下，FAWE 對應的是 `plugins/FastAsyncWorldEdit/schematics/`。注意指令寫法隨版本變化：7.x 用 `//schem`，較早的版本用 `//schematic`。

:::tip 動手前先 //size
`//size` 會告訴你這個選區到底有多少個方塊。養成先看一眼再執行的習慣，能避免絕大多數"一不小心把整張地圖換成石頭"的事故。
:::

## 3. 為什麼 WorldEdit 會卡服

原版 WorldEdit 的方塊改動**在主執行緒上執行**。這意味著一次 `//set` 期間，服務端幾乎沒有餘力處理別的事情：

- 選區稍大就是幾十萬甚至上百萬個方塊，每個方塊都要觸發光照重算、方塊更新與區塊標記；
- 主執行緒被長時間佔滿，所有玩家一起卡頓、掉線，嚴重時觸發看門狗直接崩服；
- 記憶體與 CPU 壓力同步飆升，視距越大、線上人數越多，情況越糟；
- 最常見的誘因是**選區沒確認就執行**，或者把選區拉到了整張地圖。

可行的防護手段：

- 用 `//limit` 給自己設單次操作的方塊上限；
- 每次動手前先 `//size` 確認規模；
- 大工程拆成多次小塊操作；
- 給玩家的 WorldEdit 權限按需給，不要預設放開；
- 真正的大範圍作業改用 FAWE。

## 4. FastAsyncWorldEdit（FAWE）

**FastAsyncWorldEdit 是 WorldEdit 的非同步最佳化版本**，把方塊改動從主執行緒挪到非同步執行緒並分批處理，從而避免長時間卡住伺服器。

- 它實現了 WorldEdit 的介面，因此**通常可以直接替換 WorldEdit**：把 WorldEdit 換成 FAWE 後，依賴 WorldEdit 的插件一般仍能正常工作。
- 它也有自己的配置，可以限制單個玩家單次操作的方塊數量，比原版更適合開放給玩家使用。

**什麼時候用 FAWE**

- 大面積地形改造、批次貼上 schematic；
- 多個管理員同時施工；
- 伺服器本身玩家較多，承受不起主執行緒被佔滿。

**什麼時候原版 WorldEdit 也夠用**

- 只是偶爾做小範圍改動；
- 某些插件與 FAWE 存在相容問題，而你的伺服器恰好依賴它。

:::note 不是二選一
FAWE 與 WorldEdit 是同一個位置的兩個選擇，不要同時裝兩個。裝了 FAWE 就等於有了 WorldEdit 的能力，WorldGuard 也會正常識別它。
:::

## 5. WorldGuard：把區域保護起來

WorldGuard 是管理端的區域保護插件，**前置是 WorldEdit 或 FastAsyncWorldEdit**。它的所有功能預設關閉，需要什麼開什麼。

它主要做兩件事。

**區域保護**

- 阻止玩家在指定區域內放置與破壞方塊；
- 只允許特定的人在某個區域內建造；
- 在區域內停用 PvP、TNT、怪物傷害等。

**世界規則調整**

- 阻止爬行者與凋靈造成的方塊破壞、墜落傷害等；
- 關閉火焰蔓延、岩漿引燃、結冰、末影人搬走方塊等機制；
- 把某些物品或方塊列入黑名單，或在使用時向管理員發出警告；
- 防範一些利用遊戲機制的刷物品漏洞；
- 提供"立即停止所有火焰蔓延"一類的實用指令。

典型用法是在出生點、商店街、活動場地各劃一個區域，再給資源世界單獨定一套規則。區域保護的思路與領地插件的區別，見 [領地與保護](/tutorials/java/protection)。

## 6. Multiverse：同時執行多個世界

Multiverse-Core 是知名度很高的老牌多世界插件，用來**新建、刪除、匯入世界（維度）**。常見的世界劃分是：一個大廳、一個生存主世界、一個可再生的資源世界、一個創造世界。

它本身只做世界管理，具體玩法靠擴充插件補：

| 擴充 | 作用 |
| --- | --- |
| **Multiverse-NetherPortals** | 讓玩家建造的地獄門通往指定的世界 |
| **Multiverse-Portals** | 建立傳送到指定地點的傳送門 |
| **Multiverse-Inventories** | 按世界隔離玩家背包 |
| **Multiverse-SignPortals** | 用告示牌做傳送點 |

幾個實用細節：

- **禁止生成預設世界**：主世界無法停用；下界可以在 `server.properties` 裡把 `allow-nether` 設為 `false`；末地在 `bukkit.yml` 裡把 `settings.allow-end` 設為 `false`。這樣做通常是因為伺服器只當大廳或小遊戲服使用，不需要額外維度。
- **世界名格式決定傳送門歸屬**：`plugins/Multiverse-Core/config.yml` 裡有 `world-name-format`，預設把下界和末地命名為 `%overworld%_nether` 與 `%overworld%_the_end`。如果改掉這個格式，或者建立了名字不匹配的世界，那麼這些世界與主世界之間的地獄門、末地門關聯就會斷開，傳送門即使能被啟用也不會把你送過去。
- **下載渠道**：GitHub 上的版本比 SpigotMC 上能拿到的更新，想要新特性優先看 GitHub 與 Hangar。
- **崩潰漏洞**：早期版本存在特殊字元觸發 `PatternSyntaxException` 導致服務端崩潰的問題，**Multiverse-Core 4.3.1 已修復**，請使用最新版本。確實無法升級時，社群提供過對應的修復補丁。

## 7. 多世界的常見坑

| 坑 | 現象 | 處理方式 |
| --- | --- | --- |
| 背包與遊戲模式 | 換世界後背包、經驗、遊戲模式跟著變，或者你想要分離卻沒分離 | 用 **Multiverse-Inventories** 按世界隔離背包；每個世界的遊戲模式在世界配置裡單獨設定 |
| 傳送門亂連 | 建在地獄的門把玩家送到了另一個世界 | 用 **Multiverse-NetherPortals** 明確指定目標世界，並檢查 `world-name-format` |
| 中文世界名亂碼 | 世界名在指令與提示裡顯示成亂碼 | 世界名一律用英文；要顯示中文就在 `worlds.yml` 裡設定 `alias` 別名 |
| 世界太多 | 記憶體與磁碟佔用上漲，啟動變慢 | 只保留真正需要的世界；不用的世界備份後移除，而不是一直掛著 |
| 特殊字元崩服 | 特定輸入直接讓服務端崩潰 | 升級到 4.3.1 以上 |
| 出生點不對 | 新玩家第一次進入時落在奇怪的位置 | 每個世界單獨設定出生點，而不是隻依賴主世界的出生點 |
| 世界權限 | 玩家可以隨便進出不該進的世界 | 用權限節點控制進入各世界的權限，創造世界與活動世界尤其要限制 |

:::warn 別名不等於改名
`alias` 隻影響插件顯示，世界資料夾名與指令裡用的仍然是英文名。想改中文名請改別名，直接改世界名會讓已存檔的資料找不到對應世界。
:::

## 8. 一套推薦的組合

| 需求 | 選擇 |
| --- | --- |
| 小範圍編輯地形與建築 | WorldEdit |
| 大範圍施工、批次貼上 | FastAsyncWorldEdit（替換 WorldEdit） |
| 保護出生點、商店、活動場地 | WorldGuard（可選 WorldGuard Extra Flags 補充更多 flag） |
| 大廳 / 資源世界 / 創造世界 | Multiverse-Core，按需加裝擴充 |
| 出事能查、能回滾 | CoreProtect 一類的記錄插件 |

裝完之後先做三件事：把出生點划進 WorldGuard 區域、給資源世界定好規則、確認每個世界的背包與遊戲模式策略符合預期。這三件事沒做，多世界就只是把麻煩放大了。

## 下一步

世界改了、地形動了，就要考慮怎麼把成果保住：見 [備份與恢復](/tutorials/java/backup)。插件本身的安裝與配置基礎見 [插件入門](/tutorials/java/plugins)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
