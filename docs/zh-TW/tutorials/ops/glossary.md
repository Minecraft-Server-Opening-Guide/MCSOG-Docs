---
title: 術語表與名詞解釋
slug: glossary
cat: ops
level: 2
order: 16
minutes: 12
tags: [術語, terminology, TPS, MSPT, paper, 基岩版, 維運, reference]
updated: 2026-10-04
draft: false
---

開服路上被卡住的人，很多不是不會操作，而是**看不懂別人在說什麼**。"你的 MSPT 多少""這個插件有前置嗎""你是不是離線服"——每一句裡都藏著一個沒解釋過的詞。

這一篇把本站各篇教學裡反覆出現的名詞集中解釋一遍，**按主題分組**。每條給出中文名、英文對應詞、一兩句話說清它是什麼，以及在哪一篇裡會展開講。

## 0. 怎麼用這一篇

| 你的情況 | 建議 |
| --- | --- |
| 完全新手，還沒跑起來 | 先別看這一篇，直接照 [選擇服務端核心](/tutorials/java/core) 與 [開啟服務端](/tutorials/java/start) 做一遍，遇到不懂的詞再回來查 |
| 能跑起來，但看不懂報錯和別人的建議 | 重點看第 1、2、3 節，這三節是社群交流裡出現頻率最高的 |
| 想開基岩服 | 重點看第 4 節，**基岩版與 Java 版的術語幾乎不通用** |
| 想做技術向（生電）服 | 重點看第 5 節，它決定了你該選哪個核心 |
| 已經在長期維護伺服器 | 重點看第 6 節，這一節的詞和"資料能不能保住"直接相關 |

:::note 當字典用，不要背
術語表的價值在於**搜尋**，不在於記憶。看教學時遇到不認識的詞，回到這裡用瀏覽器的頁內搜尋找一次即可。真正需要記住的只有一件事：**遇到不確定的預設值，去查官方文件和本地生成的設定檔**。
:::

:::warn 版本與廠商差異
Minecraft 服務端生態裡，**預設值、配置鍵名、可用命令幾乎都會隨版本和分支變化**。本文只解釋"這個詞是什麼意思"，**不承諾某個鍵在當前版本的具體預設值**；動手改配置時，請以你所用核心的官方文件和本地生成的設定檔為準。
:::

## 1. 效能類

這一組詞回答同一個問題：**伺服器現在卡不卡，卡在哪裡。**

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| 刻 / tick | tick | 服務端主迴圈的一次執行。原版目標是每秒 20 次，即一個 tick 約 50 毫秒；實體、紅石、方塊更新、玩家移動、大部分區塊排程都在這個迴圈裡完成 | [效能最佳化](/tutorials/java/optimize) |
| TPS | Ticks Per Second | 每秒實際完成的 tick 數。原版上限是 20，服務端算不過來時會低於 20。**它是"結果"，不是"原因"** | [用 spark 分析伺服器效能](/tutorials/ops/spark) |
| MSPT | Milliseconds Per Tick | 平均每個 tick 花掉的毫秒數，也叫 tick 耗時。它與 TPS 是同一件事的兩面：**耗時長期超過 50 ms，TPS 就守不住 20** | [用 spark 分析伺服器效能](/tutorials/ops/spark) |
| 50 ms 預算 | 50 ms budget | 每秒 20 tick 推出來的單 tick 時間上限。注意它是**平均值意義上的預算**：偶爾一個 tick 用掉 200 ms，其餘 tick 很快，TPS 仍可能接近 20，但玩家會感覺到瞬時卡頓 | [效能最佳化](/tutorials/java/optimize) |
| 卡頓 / 卡 | lag | 玩家的主觀感受，**不是指標**。可能是服務端 tick 慢、可能是網路抖動、可能是客戶端渲染問題。排查的第一步就是把它翻譯成具體指標 | [實體與掉落物堆積](/tutorials/faq/entity-lag) |
| GC 停頓 | GC pause | Java 垃圾回收時，應用執行緒可能被暫停的一段時間。堆越大、回收器越不合適，單次停頓可能越長，表現為**週期性的一卡一頓**而非持續變慢 | [效能最佳化](/tutorials/java/optimize) |
| TPS 下降與 MSPT 尖峰 | TPS drop vs MSPT spike | 兩種不同的現象：**TPS 下降**通常是持續性的資源不足（CPU 被限流、實體過多）；**MSPT 尖峰**是短時間的耗時突刺（區塊生成、大規模紅石、GC）。區分它們才能選對修法 | [用 spark 分析伺服器效能](/tutorials/ops/spark) |

### 1.1 為什麼說"卡"不是一個指標

"卡"至少可以對應四種完全不同的現象，而它們的修法互不相同：

| 現象 | 典型特徵 | 先看什麼 |
| --- | --- | --- |
| 主執行緒算不過來 | TPS 長期低於 20，MSPT 穩定偏高 | spark 的 profiler 呼叫樹 |
| 瞬時尖峰 | TPS 平均值還行，但玩家說"一頓一頓" | spark 的 tick 耗時分佈、GC 記錄 |
| 宿主機資源不足 | 服務端行程本身不慢，但 CPU 被限流、磁碟慢、記憶體被換出 | `uptime`、`free -h`、宿主機監控 |
| 網路問題 | 服務端一切正常，只有部分玩家延遲高 | `/spark ping`、玩家與機房之間的鏈路 |

**把這四類分開，是排查卡頓最重要的一步。** 相關方法見 [用 spark 分析伺服器效能](/tutorials/ops/spark)。

### 1.2 閾值不是魔法數字

社群裡常說的"TPS 低於 20 就有問題""MSPT 超過 50 就要看"是**經驗閾值**，用來觸發"去看一眼"，不是"必然故障"。真實的判斷依據是**你自己的歷史基線**：如果你的伺服器平時 MSPT 就在 35，那突然升到 45 就值得查；如果平時就在 48，那 50 反而是常態。基線的建立方法見 [監控與告警](/tutorials/ops/monitoring)。

### 1.3 TPS 與 MSPT 為什麼會"不同步"

一個常見的困惑是："TPS 顯示 20，但玩家還是說卡。"這並不矛盾，原因至少有三種：

| 情況 | 為什麼 TPS 看起來正常 |
| --- | --- |
| 平均值掩蓋了尖峰 | TPS 是**一段時間內的平均**，偶發的長 tick 被大量正常 tick 攤平了 |
| 卡在客戶端 | 服務端 tick 完全正常，但玩家電腦渲染不掉幀、或視距開得太大 |
| 卡在網路 | 服務端一切正常，但玩家到機房的鏈路抖動或丟包 |
| 卡在宿主機 | 服務端行程被 CPU 限流或記憶體換出，但它自己"感覺"只是慢了一點 |

所以判斷順序應當是：**先確認是服務端側還是非服務端側，再進入具體排查**。`/spark ping`、宿主機 CPU 與記憶體、玩家分佈在不同地區的延遲，都是這一步的輸入。方法見 [用 spark 分析伺服器效能](/tutorials/ops/spark)。

### 1.4 tick 與"伺服器時刻"的副作用

因為絕大多數世界邏輯都在 tick 迴圈裡推進，**tick 變慢會同時拖慢遊戲內的很多東西**：作物生長、熔爐進度、紅石時序、生物移動。這也是為什麼"TPS 掉到 15"對玩家的體感遠不止"慢了 25%"——所有依賴時間的機制都會一起變慢，而依賴精確時序的機器可能直接失效。相關機制見 [生電與紅石](/tutorials/java/redstone)。

:::tip 先看哪個
玩家說卡，**先看 TPS 與 MSPT，再看 CPU 佔用**。如果 TPS 低但 MSPT 正常，問題往往不在服務端主執行緒，而要看宿主機 CPU、記憶體回收或網路。相關推理與官方對容器環境的提醒見 [用 spark 分析伺服器效能](/tutorials/ops/spark)。
:::

## 2. 服務端類

這一組詞回答：**你跑的到底是什麼程式，它由哪些部分組成。**

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| 核心 / 服務端核心 | server core / server software | 你實際用 `java -jar` 啟動的那個服務端程式，如 Paper、Fabric、BDS。**"核心"不是官方術語**，是國內社群對服務端實現的習慣叫法 | [選擇服務端核心](/tutorials/java/core) |
| 插件 | plugin | 執行在服務端行程內、通過服務端提供的 API 擴充功能的程式，通常是 `.jar`，放進 `plugins/`。**只有插件端（Paper 系）才支援** | [插件基礎](/tutorials/java/plugins) |
| 模組 | mod | 直接修改遊戲程式碼的擴充，放進 `mods/`，必須與遊戲版本嚴格對應。**只有模組端（Fabric、Forge、NeoForge）才支援** | [服務端選擇](/tutorials/java/core) |
| 前置 / 依賴 | dependency | 某個插件或模組執行前必須同時安裝的另一個插件或模組。缺前置的典型表現是**載入失敗，並在日誌裡寫明缺什麼** | [插件依賴](/tutorials/java/plugin-deps) |
| 代理 / 跨服端 | proxy | 玩家先連到它，再由它把連線轉發到後面的真實服務端。用於多服互轉、統一入口、統一登入 | [跨服端](/tutorials/java/proxy) |
| BungeeCord | BungeeCord | 最早的成熟代理實現，其插件訊息通道後來被其他代理相容，成為事實標準之一 | [跨服端](/tutorials/java/proxy) |
| Velocity | Velocity | 現代代理實現，效能與安全性設計更好。**現代轉發（modern forwarding）**需要代理與後端共享金鑰，配置錯了就進不去服 | [跨服端](/tutorials/java/proxy) |
| 後端服 | backend server | 代理後面真正承載玩法的服務端實例。玩家在代理上"切服"，實際是斷開與一個後端的連線、再連到另一個 | [跨服端](/tutorials/java/proxy) |
| 大廳 | lobby | 一種特殊的後端服：玩家登入後先落在這裡，再通過 NPC 或命令進入各玩法服。通常插件很少、配置很輕 | [跨服端](/tutorials/java/proxy) |
| MCDR | MCDReforged | 掛在服務端旁邊、通過解析控制台輸出與傳送命令來工作的**服務端管理框架**。它不改服務端本身，因此不受核心類型限制 | [MCDR](/tutorials/java/mcdr) |

### 2.1 "插件端"和"模組端"是兩條平行線

新手最容易混淆的就是這兩個詞。它們不是"同一個東西的兩種叫法"，而是**兩套互不相容的擴充機制**：

| | 插件（plugin） | 模組（mod） |
| --- | --- | --- |
| 載入位置 | `plugins/` | `mods/` |
| 典型核心 | Paper、Spigot、Purpur、Folia | Fabric、Forge、NeoForge |
| 擴充方式 | 呼叫服務端提供的 API | 直接修改遊戲程式碼 |
| 版本對應 | 相對寬鬆，跨小版本常可用 | 極其嚴格，必須完全對應 |
| 典型用途 | 管理、權限、經濟、小遊戲 | 新內容、新機制、客戶端功能 |

**在 Fabric 上用 Bukkit 插件、或在 Paper 上用 Forge 模組，預設都不成立**，需要額外的橋接方案，且往往犧牲相容性或效能。選核心時先想清楚你要哪一邊，見 [選擇服務端核心](/tutorials/java/core)。

### 2.2 代理不是"加速器"

"跨服端"這個詞容易讓人以為它能降低延遲。**它不最佳化網路路徑**，它的作用是讓多個服務端看起來像一個：統一入口位址、玩家在服與服之間切換而不用重連新 IP、登入與權限集中管理。它同時引入新的複雜度（轉發金鑰、後端鑑權、玩家資料同步），配置前請讀 [跨服端](/tutorials/java/proxy)。

:::warn 裝了代理就不要把後端直接暴露
後端服應當只接受來自代理的連線。**如果後端埠對公網開放，玩家可以繞過代理直連**，代理上的登入校驗、權限限制、白名單全部失效。相關埠與防火牆配置見 [網路安全基礎](/tutorials/ops/network-security)。
:::

## 3. Java 版概念

這一組詞是 Java 版生態的"行話"，出現頻率最高。

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| Bukkit | Bukkit | 早期為原版服務端提供插件 API 的專案。後來的服務端基本都以它的 API 為共同方言，所以插件常被稱為"Bukkit 插件" | [選擇服務端核心](/tutorials/java/core) |
| Spigot | Spigot | Bukkit 的後繼分支，長期是插件端的事實標準，也是後來許多分支的起點 | [選擇服務端核心](/tutorials/java/core) |
| Paper | Paper | 目前最主流的 Spigot 分支，做了大量效能與機制修復並持續維護。**為效能改動過部分原版行為**，這是它和生電衝突的根源 | [選擇服務端核心](/tutorials/java/core) |
| Purpur | Purpur | 基於 Paper 的分支，額外提供大量可配置的遊戲玩法選項 | [選擇服務端核心](/tutorials/java/core) |
| Folia | Folia | 基於 Paper 的分支，把世界拆成區域並行 tick。**以插件相容性為代價換取多核利用**，且跨區域互動行為與 Paper 不同 | [選擇服務端核心](/tutorials/java/core) |
| API | Application Programming Interface | 服務端提供給插件呼叫的程式設計介面。**用 API 寫的插件跨版本相對穩定**，直接碰內部實現則相反 | [插件基礎](/tutorials/java/plugins) |
| NMS | net.minecraft.server | 服務端內部類所在的包名，被借來指代"繞過 API 直接呼叫內部實現"。**這些內部結構沒有相容性保證**，版本一升就可能失效 | [插件基礎](/tutorials/java/plugins) |
| api-version | api-version | `plugin.yml` 裡的欄位，聲明插件按哪個版本的 Paper API 編寫。官方文件說明：**服務端版本低於該值時拒絕載入插件**；不填寫會被當作舊式插件載入並列印警告 | [插件基礎](/tutorials/java/plugins) |
| YAML | YAML Ain't Markup Language | 大多數插件與 Paper 系設定檔使用的格式。**縮排即語法**，多用空格、不要用 Tab，寫錯縮排會直接解析失敗 | [配置服務端](/tutorials/java/config) |
| 正版驗證 | online-mode | `server.properties` 的 `online-mode`。開啟時服務端會向 Mojang 的會話服務驗證玩家身份 | [配置服務端](/tutorials/java/config) |
| 離線服 | offline-mode / cracked server | `online-mode=false` 的伺服器。玩家名可以任意填寫，**任何人都能冒用別人的名字**，也無法獲得官方 UUID | [配置服務端](/tutorials/java/config) |
| UUID | Universally Unique Identifier | 玩家的唯一標識。正版服由 Mojang 會話服務給出；離線服則由服務端按名字推導，**同名即同 UUID，改名即換身份** | [常用服務端指令](/tutorials/java/commands) |
| 白名單 | whitelist | 只允許名單內玩家進入的機制。相關鍵為 `white-list`，名單檔案是 `whitelist.json`；`enforce-whitelist` 決定過載後是否踢掉不在名單上的線上玩家 | [配置服務端](/tutorials/java/config) |
| OP / 管理員 | operator | 擁有服務端管理命令權限的玩家，記錄在 `ops.json`。**給 OP 等於給出很大的權限**，給之前想清楚 | [常用服務端指令](/tutorials/java/commands) |
| RCON | Remote Console | 通過網路向服務端傳送控制台命令的協議，預設埠 25575。**它不加密**，密碼與命令都可被截獲，**只應在本機或加密隧道內使用** | [網路安全基礎](/tutorials/ops/network-security) |

### 3.1 這幾個核心是什麼關係

它們不是並列的五種選擇，而是一條**繼承鏈**：

```text
原版服务端 (vanilla)
  └─ Bukkit / CraftBukkit  提供插件 API
       └─ Spigot           性能与修复
            └─ Paper       大量优化与修复（当前主流）
                 ├─ Purpur 更多玩法选项
                 └─ Folia  区域化并行 tick
```

理解這條鏈的用處在於：**Paper 的設定檔裡會出現 Spigot 和 Bukkit 的鍵**（`spigot.yml`、`bukkit.yml`），因為它們是從上游繼承來的。看到不認識的檔名時，先想想它屬於鏈上的哪一層。

### 3.2 正版驗證、UUID 與白名單的關係

這三個詞經常被放在一起討論，因為它們**互相決定**：

- **正版服**（`online-mode=true`）：玩家身份由 Mojang 會話服務確認，UUID 是帳號級的，**換名字不影響身份**。白名單、權限、經濟資料都掛在這個 UUID 上。
- **離線服**（`online-mode=false`）：服務端按玩家名推導 UUID，**換名字就是換了一個人**，而冒用別人的名字就等於冒充別人。

把一台正版服改成離線服（或反過來），**已有玩家的 UUID 會變**，後果是白名單、權限、經濟資料、領地全部對不上人。這不是"改一個開關"的小事，遷移前務必先備份並核對身份對映，見 [備份與恢復](/tutorials/java/backup)。

:::warn RCON 不要暴露在公網
RCON 的設計目標是本機或可信網路內的遠端管理，**協議本身不加密**。把它對映到公網等於把控制台交給掃描器。需要遠端使用時，走 SSH 隧道或 VPN，見 [網路安全基礎](/tutorials/ops/network-security)。
:::

### 3.3 設定檔分三類，別混在一起

新手最常見的混亂來源，是把不同層級的設定檔當成一回事。它們其實分工明確：

| 類別 | 典型檔案 | 誰生成的 | 改錯了會怎樣 |
| --- | --- | --- | --- |
| 服務端本體配置 | `server.properties` | 服務端首次啟動時生成 | 鍵名寫錯會被忽略或回落預設值，**改動需要重啟生效** |
| 服務端分支配置 | `spigot.yml`、`bukkit.yml`、`paper-world-defaults.yml` 等 | 對應分支首次啟動時生成 | 影響機制與效能，**生電場景下尤其敏感** |
| 插件配置 | `plugins/<插件名>/config.yml` 等 | 插件首次載入時生成 | 格式錯誤會導致插件載入失敗，**原因通常寫在日誌裡** |

一條實用經驗：**改任何設定檔之前先複製一份**。設定檔是純文本，體積很小，備份成本幾乎為零，但改壞之後的排查成本很高。備份範圍與回滾流程見 [備份與恢復](/tutorials/java/backup)。

### 3.4 白名單與 OP 是兩件不同的事

這兩個詞經常被放在一起，但它們控制的是完全不同的東西：

| | 白名單（whitelist） | OP（operator） |
| --- | --- | --- |
| 控制什麼 | **誰能進服** | **進來之後能做什麼** |
| 存放位置 | `whitelist.json` | `ops.json` |
| 相關開關 | `white-list`、`enforce-whitelist` | `op-permission-level` 決定 OP 的預設權限等級 |
| 常見誤區 | 以為開了白名單就等於安全 | 以為給了 OP 只是"多幾個命令" |

**給了 OP 就等於給了很大的權限**，包括能執行會改變世界的命令。給之前想清楚對方是誰，以及這個權限能不能收回。相關命令見 [常用服務端指令](/tutorials/java/commands)。

## 4. 基岩版概念

基岩版的生態與 Java 版幾乎不重疊，術語也自成一套。

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| BDS | Bedrock Dedicated Server | 微軟官方發佈的基岩版專用服務端，**不開源**，插件能力有限，通常靠行為包與腳本擴充 | [基岩版 BDS](/tutorials/bedrock/bds) |
| 協議版本 | protocol version | 客戶端與服務端通訊的資料格式版本。**基岩版客戶端會自動更新**，服務端跟不上就連不上，這是基岩服最常見的故障 | [基岩版協議與版本](/tutorials/bedrock/protocol) |
| Addon | add-on | 基岩版擴充內容的統稱，由行為包、資源包等組成，通過世界設定載入 | [基岩版服務端類型](/tutorials/bedrock/type) |
| 行為包 | behavior pack | Addon 中負責邏輯與規則的部分：可以加實體、改掉落、寫腳本 | [基岩版服務端類型](/tutorials/bedrock/type) |
| 資源包 | resource pack | Addon 中負責外觀與音效的部分：材質、模型、音效、介面文字 | [基岩版服務端類型](/tutorials/bedrock/type) |
| allowlist.json | allowlist.json | 基岩版服務端的白名單檔案，對應 `server.properties` 中的 `allow-list` 開關。**檔名與 Java 版的 `whitelist.json` 不同** | [基岩版 BDS](/tutorials/bedrock/bds) |
| permissions.json | permissions.json | 基岩版服務端用於指定玩家權限等級的檔案，等級分 visitor、member、operator；`server.properties` 的 `default-player-permission-level` 決定新玩家的預設等級 | [基岩版 BDS](/tutorials/bedrock/bds) |
| Xbox Live 驗證 | Xbox Live authentication | 基岩版的帳號體系。**連線遠端（非區域網路）伺服器時始終需要 Xbox Live 驗證**，`online-mode` 主要影響本地與區域網路場景 | [基岩版協議與版本](/tutorials/bedrock/protocol) |
| Nukkit | Nukkit | 用 Java 寫的基岩版服務端實現，提供類似 Bukkit 的插件 API。原專案活躍度已大幅下降 | [第三方基岩服務端](/tutorials/bedrock/third-party) |
| PMMP | PocketMine-MP | 用 PHP 寫的基岩版服務端實現，插件生態成熟，社群規模大 | [第三方基岩服務端](/tutorials/bedrock/third-party) |
| PNX | PowerNukkitX | Nukkit 的活躍後繼分支之一，目標是繼續維護並跟進新版本 | [第三方基岩服務端](/tutorials/bedrock/third-party) |

### 4.1 為什麼基岩服總是"更新完就進不去"

因為**客戶端會自動更新，而服務端不會**。官方 BDS 的更新節奏與客戶端版本繫結，第三方實現的跟進通常更慢。玩家手機上的客戶端升到新版本後，服務端還停在舊協議版本，結果就是連不上。

這也解釋了"協議版本"這個詞為什麼在基岩版裡出現頻率極高。應對方式與各實現的跟進情況見 [基岩版協議與版本](/tutorials/bedrock/protocol)。

### 4.2 第三方實現要自己評估

Nukkit、PMMP、PNX 都**不是官方服務端**，對原版機制的還原程度、更新速度、插件質量差異很大。選之前先確認三件事：**是否已跟進你要的協議版本**、**插件生態是否滿足需求**、**專案最近是否還在維護**。參見 [第三方基岩服務端](/tutorials/bedrock/third-party-setup)。

:::note 術語不要跨版本套用
`whitelist.json`（Java 版）與 `allowlist.json`（基岩版）是兩個不同的檔案；Java 版的"插件"和基岩版的"行為包"不是同類東西。**在群裡提問時先說清是哪個版本**，能省下大量來回。
:::

## 5. 生電與技術類

這一組詞屬於"技術向生存"（生電）玩家的日常，也是**最容易和效能最佳化衝突**的一類需求。

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| 生電 | technical Minecraft | "生存 + 電路"，指以紅石機器、刷怪塔、精確方塊與實體行為為核心玩法的技術向生存。**對原版行為是否被改動極其敏感** | [生電與紅石](/tutorials/java/redstone) |
| 刷怪塔 | mob farm / mob grinder | 利用刷怪機制集中生成並擊殺生物以獲取掉落物的裝置。它同時是**效能大戶**：實體多、掉落物多、區塊常駐載入 | [實體與掉落物堆積](/tutorials/faq/entity-lag) |
| 紅石時鐘 | redstone clock | 週期性輸出紅石訊號的電路，用來定時觸發其他裝置。**高頻時鐘是典型的 MSPT 尖峰來源** | [生電與紅石](/tutorials/java/redstone) |
| TNT 複製 | TNT duplication | 利用特定版本機制複製 TNT 實體的技巧，是許多大型工程的基礎。**部分服務端分支為效能或平衡改動過相關行為**，會導致複製失效 | [生電與紅石](/tutorials/java/redstone) |
| 實體啟用範圍 | entity activation range | Spigot 系引入的機制：**超出一定距離的實體不是不載入，而是降低 tick 頻率**。調小可省 CPU，但會讓遠處的機器表現異常 | [實體與掉落物堆積](/tutorials/faq/entity-lag) |
| 區塊載入 / 強載入 | chunk loading / force load | 區塊只有被載入才會 tick。玩家、出生點區塊、傳送門、`/forceload` 與插件都能維持載入；**強載入指人為讓它長期保持載入**，代價是常駐的 CPU 與記憶體開銷 | [實體與掉落物堆積](/tutorials/faq/entity-lag) |
| 刷怪上限 | mob cap | 一個世界裡同時存在的生物數量上限。它在 `bukkit.yml` 的 `spawn-limits` 等位置配置，Paper 系還可按世界覆蓋，或改成按玩家分別計算 | [實體與掉落物堆積](/tutorials/faq/entity-lag) |

### 5.1 "載入"和"tick"不是一回事

新手常把這兩個詞混用，但它們描述不同階段：

| 階段 | 含義 | 典型開銷 |
| --- | --- | --- |
| 載入（load） | 區塊資料在記憶體裡存在，可以被讀寫 | 記憶體、磁碟 I/O |
| tick | 區塊內的實體、方塊實體、隨機刻按規則推進 | CPU（主執行緒） |

一個區塊**可以被載入但不被 tick**（例如超出模擬距離），也可以因為強載入而**長期既載入又 tick**。掉落物本身不會讓區塊保持載入，但只要那片區塊因別的原因保持載入，裡面的掉落物就會一直 tick、一直堆積。這一區別是排查"實體越堆越多"的關鍵，見 [實體與掉落物堆積](/tutorials/faq/entity-lag)。

### 5.2 最佳化與生電經常互斥

"把啟用範圍調小、把刷怪上限調低、把漏斗檢查放寬"能讓 TPS 好看，但**也會讓農場和機器直接失效**：村民不補貨、刷怪塔不出貨、依賴物品分離的裝置亂套。生電服應當反過來——把影響原版行為的項調回原版，或直接改用貼近原版的核心。參見 [生電與紅石](/tutorials/java/redstone) 與 [效能最佳化](/tutorials/java/optimize)。

:::warn 改配置前先備份
任何"為了效能"的改動都可能改變遊戲機制。**改之前備份設定檔，改之後回測機器**，是生電服的固定流程。備份範圍見 [備份與恢復](/tutorials/java/backup)。
:::

## 6. 維運類

這一組詞是"把伺服器當成一件長期要維護的事"之後必然遇到的。

| 術語 | 英文 | 解釋 | 相關文件 |
| --- | --- | --- | --- |
| 備份 | backup | 把世界與配置複製成一份可以在出事時恢復的副本。**只複製不驗證恢復，不算備份** | [備份與恢復](/tutorials/java/backup) |
| 異地備份 | offsite backup | 把備份副本放到**與主機不同的物理位置或不同的服務商**。主機整機損毀、被入侵或機房事故時，本機上的備份會一起消失 | [異地備份](/tutorials/ops/offsite-backup) |
| 3-2-1 原則 | 3-2-1 rule | 一條通用的備份經驗法則：**至少 3 份副本、放在 2 種不同介質上、其中 1 份在異地**。它是經驗總結，不是標準 | [異地備份](/tutorials/ops/offsite-backup) |
| 異地 | off-site | 與主機不在同一物理位置、不受同一事故影響的儲存位置。**同一台機器上的另一個目錄、同一台機器上的另一塊盤，都不算異地** | [異地備份](/tutorials/ops/offsite-backup) |
| UPS | Uninterruptible Power Supply | 不間斷電源。它的主要價值不是"停電繼續玩"，而是**給服務端爭取幾分鐘完成安全停機**，避免寫入過程中的硬掉電損壞存檔 | [機架、交換機與 UPS](/tutorials/ops/hardware-rack) |
| 面板 | panel / control panel | 用網頁介面管理服務端的工具，提供啟停、控制台、檔案管理、備份等功能，常見如 Pterodactyl、MCSManager。**它同時是一個新的攻擊面** | [面板管理](/tutorials/ops/panels) |
| 守護行程 | daemon | 在後台常駐、負責執行具體任務的程式。面板架構裡通常有一個守護行程跑在每台被管理的機器上，**它與網頁端之間的通訊需要重點加固** | [面板管理](/tutorials/ops/panels) |
| DDoS | Distributed Denial of Service | 分散式拒絕服務攻擊：用大量來源的流量把目標頻寬或連線資源佔滿。**主機側能做的事有限，通常需要服務商在上游清洗** | [常見網路攻擊與防禦](/tutorials/ops/attack-defense) |
| 限速 | rate limiting | 主動限制單位時間內的連線數或請求數，避免少量來源耗盡資源。**它是緩解手段，不是根治手段**，且設定過嚴會誤傷正常玩家 | [常見網路攻擊與防禦](/tutorials/ops/attack-defense) |
| 取證 | forensics | 在重啟、重灌、封禁之前，先把**幾分鐘後就會永久消失的現場**固定下來：行程、連線、日誌、時間線。**順序錯了，證據就沒了** | [應急與取證](/tutorials/ops/incident-forensics) |
| 事後分析 | post-mortem analysis | 出事之後再去查"當時發生了什麼"。**它只能解釋過去，不能阻止下一次** | [用 spark 分析伺服器效能](/tutorials/ops/spark) |
| 事前告警 | alerting | 在問題影響到玩家之前，由系統主動通知你。它與事後分析是互補關係，不是替代關係 | [監控與告警](/tutorials/ops/monitoring) |
| 磁碟 I/O 等待 | I/O wait | CPU 在等磁碟完成讀寫而空轉的時間佔比。**它高的時候，服務端看起來"沒在算"，但就是慢** | [機架、交換機與 UPS](/tutorials/ops/hardware-rack) |
| 執行手冊 | runbook | 針對"某條告警響了該怎麼辦"預先寫好的處理步驟。**沒有執行手冊的告警，等於半夜把你叫醒去看一個你不知道怎麼處理的問題** | [監控與告警](/tutorials/ops/monitoring) |

### 6.1 "備份"這個詞被誤用得太厲害

日常對話裡，"我備份了"至少可能指四件不同的事：

| 說法 | 實際含義 | 夠不夠 |
| --- | --- | --- |
| "我複製了 world 資料夾" | 有了一份同機副本 | 能擋誤刪，擋不住整機故障 |
| "備份腳本每天在跑" | 有一個任務在定時執行 | **不看退出碼就不知道它是否成功** |
| "備份檔案在" | 磁碟上有歸檔檔案 | **沒驗證過恢復就不算備份** |
| "備份恢復過一次" | 真的在別處還原並啟動成功 | 這才是可用的備份 |

四層裡只有最後一層能真正救命。**驗證恢復的方法**見 [異地備份](/tutorials/ops/offsite-backup)。

### 6.2 為什麼 UPS 算維運詞

因為斷電和"伺服器崩了"是兩件不同性質的事。**服務端崩潰通常不會損壞存檔**（行程異常退出，但檔案系統仍是一致的）；而**寫入過程中的硬掉電可能留下半寫的檔案**，輕則丟區塊，重則存檔無法載入。

所以 UPS 的定位是"讓服務端有機會安全停機"，而不是"讓玩家停電也能玩"。選型、NUT 監控與自動關機配置見 [機架、交換機與 UPS](/tutorials/ops/hardware-rack) 與 [家用電腦開服與維護](/tutorials/ops/home-hosting)。

:::tip 最容易漏的一條
上面這些詞裡，真正被反覆忽略的是**"驗證恢復"**。備份檔案存在、腳本退出碼為 0，都不代表能把伺服器恢復起來。定期真的恢復一次，見 [異地備份](/tutorials/ops/offsite-backup)。
:::

## 7. 與術語對應的常用命令

術語只有落到具體命令上才有用。下表把前面幾節最常見的詞和"看一眼現狀"的命令對應起來。**這些命令的具體輸出格式隨發行版和版本變化，請以你係統上的實際輸出為準。**

| 想確認的詞 | 命令 | 看什麼 |
| --- | --- | --- |
| 宿主機整體負載 | `uptime` | 末尾三個數字是 1、5、15 分鐘的平均負載；**要和 CPU 核心數一起看**，單核滿載是 1.00 |
| 記憶體與交換 | `free -h` | 重點看 `available` 這一列，它比 `free` 更接近"還能用多少" |
| 磁碟空間 | `df -h` | 看掛載點對應的剩餘空間；**磁碟滿會導致服務端寫存檔失敗** |
| 磁碟健康 | `smartctl -a /dev/sdX` | 通電時間、寫入量、重分配扇區等屬性；命令來自 `smartmontools` |
| 網路連線概況 | `ss -s` | 各類 socket 的總數；**連線數異常增長往往先於記憶體耗盡出現** |
| 監聽埠 | `ss -lntp` / `ss -lunp` | TCP / UDP 分別在聽哪些埠、由哪個行程持有 |
| 服務狀態 | `systemctl status <服务名>` | 是否 active、最近幾次退出、最近日誌片段 |
| 服務日誌 | `journalctl -u <服务名>` | 用 `--since "1 hour ago"` 縮小範圍；**取證時加 `--utc`** |
| HTTP 可用性 | `curl -s -o /dev/null -w '%{http_code}' <URL>` | 只輸出狀態碼，適合塞進腳本做判斷 |
| UPS 狀態 | `upsc <ups名>` | `ups.status` 為 `OL` 表示市電、`OB` 表示電池供電；變數名以 NUT 文件與機型為準 |

:::tip 別隻看單次結果
`free -h` 和 `df -h` 是**快照**，單次結果幾乎說明不了問題。真正有用的是**趨勢**：磁碟是不是每週都在漲、記憶體是不是每天都在爬。趨勢要靠定時採集，見 [監控與告警](/tutorials/ops/monitoring)。
:::

## 8. 術語之間的關係

零散的名詞背下來沒用，**把它們連成幾條因果鏈**才有用：

| 你想做的事 | 需要先理解的術語 | 為什麼 |
| --- | --- | --- |
| 判斷伺服器卡不卡 | tick、TPS、MSPT、50 ms 預算 | 只有把"卡"翻譯成指標，才能開始排查 |
| 選服務端核心 | 插件、模組、生電、代理 | 核心決定了你能用什麼擴充，以及原版行為是否被改動 |
| 配置插件 | YAML、前置、API、NMS、api-version | 大部分"插件紅了"都出在這幾個詞上 |
| 管理玩家 | online-mode、UUID、白名單、OP | 身份與權限全部掛在 UUID 上 |
| 開基岩服 | BDS、協議版本、行為包、allowlist.json | 基岩版自成一套，Java 版經驗不通用 |
| 保住資料 | 備份、異地、3-2-1、UPS、取證 | 出事時能救你的只有這幾樣 |
| 長期維護 | 面板、守護行程、DDoS、限速、監控告警 | 把伺服器當成一件需要持續照看的事 |

## 9. 下一步

術語看懂了，接下來按順序做這幾件事就夠了：

| 想做的事 | 去哪一篇 |
| --- | --- |
| 先挑一個合適的核心 | [選擇服務端核心](/tutorials/java/core) |
| 把服務端跑起來 | [開啟服務端](/tutorials/java/start) |
| 出問題不知道看哪裡 | [日誌與報錯排查](/tutorials/faq/errors) |
| 伺服器卡 | [用 spark 分析伺服器效能](/tutorials/ops/spark) |
| 把資料保住 | [備份與恢復](/tutorials/java/backup)、[異地備份](/tutorials/ops/offsite-backup) |
| 把機器加固 | [系統安全加固](/tutorials/ops/system-security) |
| 出事了怎麼辦 | [應急與取證](/tutorials/ops/incident-forensics) |
| 裝一套監控和告警 | [監控與告警](/tutorials/ops/monitoring) |

## 10. 症狀對照表

最後給一張"倒著查"的表：**從現象出發，找到對應的術語**。這張表不能替代排查，但能讓你知道該往哪個方向搜尋。

| 你看到的現象 | 先想到哪些術語 | 去哪裡看 |
| --- | --- | --- |
| 玩家說"卡"，但 TPS 顯示 20 | 客戶端渲染、網路抖動、MSPT 尖峰 | 第 1 節；[用 spark 分析伺服器效能](/tutorials/ops/spark) |
| TPS 長期低於 20，MSPT 穩定偏高 | 實體堆積、刷怪上限、區塊載入、插件熱點 | 第 1、5 節；[實體與掉落物堆積](/tutorials/faq/entity-lag) |
| 隔一段時間就"頓一下" | GC 停頓、自動儲存、定時任務 | 第 1 節；[效能最佳化](/tutorials/java/optimize) |
| 服務端突然自己關了 | 看門狗、`OutOfMemoryError`、磁碟滿 | [日誌與報錯排查](/tutorials/faq/errors) |
| 存檔載入不了 / 少了區塊 | 硬掉電、半寫檔案、UPS | 第 6 節；[備份與恢復](/tutorials/java/backup) |
| 插件啟動就報紅 | 前置、api-version、NMS、版本不匹配 | 第 2、3 節；[插件依賴](/tutorials/java/plugin-deps) |
| 玩家進不來，提示驗證失敗 | online-mode、UUID、正版驗證 | 第 3 節；[配置服務端](/tutorials/java/config) |
| 基岩版玩家集體進不來 | 協議版本、客戶端自動更新 | 第 4 節；[基岩版協議與版本](/tutorials/bedrock/protocol) |
| 紅石機器突然不工作 | 生電、TNT 複製、實體啟用範圍、服務端分支改動 | 第 5 節；[生電與紅石](/tutorials/java/redstone) |
| 備份腳本"跑了"，但檔案不對 | 退出碼、異地、驗證恢復 | 第 6 節；[異地備份](/tutorials/ops/offsite-backup) |
| 面板上不去 / 控制台連不上 | 守護行程、埠、證書 | 第 6 節；[面板管理](/tutorials/ops/panels) |
| 頻寬被打滿、SSH 都連不上 | DDoS、限速、上游清洗 | 第 6 節；[常見網路攻擊與防禦](/tutorials/ops/attack-defense) |

> 各軟體的安裝與配置以官方文件為準。
