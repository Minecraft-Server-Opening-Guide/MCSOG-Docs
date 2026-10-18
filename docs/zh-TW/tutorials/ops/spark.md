---
title: 用 spark 分析伺服器效能
slug: spark
cat: ops
level: 3
order: 15
minutes: 16
tags: [spark, profiler, tps, mspt, lag, diagnostics, paper, performance]
updated: 2026-10-04
draft: false
---

伺服器"卡"是一個現象，不是一個原因。玩家說卡，可能是某個插件佔滿了主執行緒、可能是實體太多、可能是玩家在跑圖導致區塊即時生成，也可能是宿主機 CPU 被限流或超售。**spark 的價值在於把"卡"從一種感受變成一份可以指著看的證據**：哪條呼叫路徑、哪個插件、佔了多少百分比。

本篇只講 spark 本身怎麼用。調優方向見 [效能最佳化](/tutorials/java/optimize)，實體堆積見 [實體與掉落物堆積](/tutorials/faq/entity-lag)，崩潰與報錯見 [[JAVA] 常見問題](/tutorials/faq/faq-java)。

:::warn 指令以官方文件為準
本文列出的指令與選項來自 spark 官方文件（spark.lucko.me/docs）與 PaperMC 文件，並已逐條核對。**spark 在不同平台、不同大版本上可用的子指令與選項略有差異**；動手前先用 `/spark` 或 Tab 補全確認你這一版支援哪些參數，不要憑記憶拼選項。
:::

## 1. spark 是什麼、怎麼裝

### 1.1 它由三部分組成

spark 是一個效能分析工具（profiler），官方把它定位為"面向 Minecraft 客戶端、服務端和代理端的效能分析器"，由三塊能力組成：

| 元件 | 能回答的問題 |
| --- | --- |
| Profiler（取樣分析器） | CPU 時間花在哪些方法、哪些插件上？ |
| Memory Inspection（記憶體檢查） | 堆裡什麼佔得最多？GC 停頓多不多？ |
| Health Reporting（健康度報告） | TPS、CPU、記憶體、磁碟的長期狀態如何？ |

它同時是一個網站：spark.lucko.me 既是官網，也是線上的報告檢視器（viewer）。你在遊戲裡跑完一次取樣，資料會上傳，然後給你一個連結，用瀏覽器開啟就能看呼叫樹、火焰圖等。

幾點需要先建立的認知：

- **spark 是取樣型（sampling）分析器**。官方在 "spark vs. others" 中說明：取樣分析在數值精度上通常不如插樁（instrumentation），但它對目標程式幾乎不造成拖慢，因此在實踐中往往更能反映真實的執行情況。
- **它記錄"一切"**。官方在對比 timings 時指出：timings 需要人工預先定義分析區域，它能統計事件次數、對不熟悉分析器的新手更友好；而 spark 不需要預先定義，會記錄全部呼叫棧，因此更適合回答"到底慢在哪一行程式碼"。
- **它不只是服務端插件**。spark 也能作為 Java agent 掛到任意 JVM 程式上（包括原版 vanilla 服務端），並且會對原版服務端自動套用反混淆對映。

### 1.2 各平台怎麼裝

官方下載頁（https://spark.lucko.me/download）按平台分發不同的包。**先選對你的平台，再下載**，把 jar 放進對應目錄，重啟服務端即生效。

| 平台 | 官方下載頁條目 | 放到哪裡 | 備註 |
| --- | --- | --- | --- |
| Bukkit / Spigot / Paper / Purpur | Bukkit (Paper/Spigot) | `plugins/` | 服務端插件；Paper 1.21+ 已內建，見下 |
| Fabric | Fabric | `mods/` | 模組形式 |
| Forge | Forge | `mods/` | 模組形式 |
| NeoForge | NeoForge | `mods/` | 模組形式 |
| Velocity | Velocity | `plugins/` | 代理端；指令字首不同，見 1.4 |
| BungeeCord | BungeeCord | `plugins/` | 代理端；指令字首不同，見 1.4 |
| Sponge | Sponge (API 12) | `mods/` | 官方下載頁單獨列出 |
| 客戶端（Fabric/Forge 等） | 對應平台包 | `mods/` | 分析客戶端卡頓；指令用 `/sparkc` |
| 任意 JVM 程式 / 原版服務端 | Standalone (Java Agent) | 啟動參數 | 見 1.3 |

:::note Paper 1.21 及以上已經內建
官方安裝文件明確說明：**Paper 1.21 或更新版本已經把 spark 打包進服務端，不需要再裝插件**。只有在你需要比內建版本更新的 spark 時，才把獨立插件 jar 放進 `plugins/`，並在啟動參數裡加上 `-Dpaper.preferSparkPlugin=true` 來覆蓋內建版本。
:::

:::warn 只從官方網站下載
把 jar 放進 `plugins/` 意味著把整台伺服器的控制權交給它。**請從官方下載頁 https://spark.lucko.me/download 獲取**，不要用來路不明的轉載包或網盤檔案。下載頁裡另有 "Other Platforms"（Folia、Geyser、Minestom、Nukkit、Hytale 等），官方說明這些由社群提供、按原樣（as-is）支援，使用前請自行評估。
:::

### 1.3 獨立 agent（Standalone Agent）

當目標不是"標準服務端"時（例如原版服務端、自研 Java 程式），用 agent 方式掛載。啟動時掛：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar -jar application.jar [application args]
```

也可以指定 agent 監聽埠：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222 -jar application.jar [application args]
```

agent 支援的參數（多個參數用逗號分隔）：

| 參數 | 含義 |
| --- | --- |
| `port={port}` | agent 監聽的埠，預設 `2222` |
| `start` | 掛載後立即開始取樣 |
| `open` | 掛載後把檢視器連結列印到控制台/日誌 |

例如：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222,start,open -jar application.jar
```

如果程式**已經在執行**，可以直接附加到行程（把 `<pid>` 換成行程號）：

```bash
java -jar spark-x.y.z-standalone-agent.jar <pid>
java -jar spark-x.y.z-standalone-agent.jar <pid> port=2222
```

不帶 PID 執行這個 jar 時，它會列出當前所有 Java 行程及其 PID。附加成功後，**連線方式會列印在被附加程式自己的控制台/日誌裡**；按提示用一個 SSH 會話連進去，就能執行常規的 spark 指令，用 `exit` 退出該會話。

### 1.4 確認它載入成功了

最直接的驗證方式：**不帶任何參數執行 `/spark`**，它會列印版本與可用子指令列表。如果提示未知指令或沒有輸出，說明沒載入成功。

按順序排查：jar 是否放對目錄（`plugins/` 還是 `mods/`）、是否選對了平台包、服務端是否真的重啟過、啟動日誌裡有沒有 spark 的載入資訊。

指令字首因平台而異，官方文件特別標註：

| 環境 | 使用的指令 |
| --- | --- |
| 服務端（Bukkit 系、Fabric/Forge 服務端） | `/spark` |
| BungeeCord | `/sparkb` |
| Velocity | `/sparkv` |
| Forge/Fabric **客戶端** | `/sparkc` |

權限方面：需要 `spark` 權限，或者使用各子指令自己的權限節點。官方文件列出的權限節點包括 `spark.profiler`、`spark.health`、`spark.ping`、`spark.tps`、`spark.tickmonitor`、`spark.gc`、`spark.gcmonitor`、`spark.heapsummary`、`spark.heapdump`、`spark.activity`。多數情況下**把自己設為 OP** 就夠了。

:::tip 一個容易被忽略的配置
spark 的設定項 `overrideTpsCommand` 預設是 `true`，並且**只在 Bukkit 系服務端生效**：也就是說預設情況下 `/tps` 會被 spark 接管，輸出的就是 spark 的 TPS 檢視。
:::

## 2. 先看整體健康度

### 2.1 TPS 與 MSPT 到底是什麼意思

先理解 tick 迴圈（官方 "The Tick Loop" 指南）：

- Minecraft 服務端的目標是**每秒執行 20 個 tick**，也就是**每 50 毫秒一個 tick**。
- 一個 tick 裡要做的事包括：處理玩家發來的資料包（移動、放置/破壞方塊、攻擊實體）、更新玩家與其他實體的位置、向玩家廣播世界變化、生成野怪並處理 AI 與尋路、處理紅石更新，等等。
- 如果某個 tick 用時**少於** 50 毫秒，服務端會在剩餘時間裡"睡眠"，等到該開始下一個 tick 時再繼續。**睡眠是健康的**。
- 如果某個 tick 用時**超過** 50 毫秒，下一個 tick 只能被推遲，因為 tick 不能並行執行。所有事情都會"向右平移"，同樣一秒鐘裡完成的 tick 變少，玩家感受到的就是變慢、變卡。

兩個指標由此而來：

| 指標 | 全稱 | 含義 | 目標值 |
| --- | --- | --- | --- |
| TPS | ticks per second | 平均每秒完成多少個 tick | **20** |
| MSPT | milliseconds per tick | 平均每個 tick 花多少毫秒 | **50 或更低** |

官方文件說明，`/spark tps` 的輸出還會包含 MSPT 的**最小值、中位數、95 分位與最大值**，並且 spark 會按好壞自動把這些數字標成綠色、黃色或紅色。

**為什麼最大值很重要**：上述指標都是平均值或統計量。官方在 tick 迴圈指南裡特別提醒：完全可能出現"大多數 tick 只用 20 毫秒（健康），偶爾某個 tick 用 300 毫秒（不健康）"的情況，這就是**卡頓尖峰（lag spike）**——平均值會把尖峰抹平，所以只看平均 TPS 會漏掉問題。

### 2.2 /spark tps

```text
/spark tps
```

它列印 TPS 與 CPU 使用率。這是每次排查的**第一步**：先確認"到底卡不卡"，再決定要不要上分析器。

### 2.3 /spark health

`health` 子指令生成服務端健康報告，**內容包括 TPS、CPU、記憶體和磁碟佔用**。官方文件給出的用法：

```text
/spark health
/spark health upload
/spark health show
/spark health show --memory
/spark health show --network
```

| 指令 | 行為 |
| --- | --- |
| `/spark health` | 在檢視器裡開啟，**live dashboard 模式，資料每 10 秒自動重新整理** |
| `/spark health upload` | 上傳一份**靜態**健康報告，不會自動更新 |
| `/spark health show` | 直接在控制台列印基礎報告，不開瀏覽器 |
| `/spark health show --memory` | 追加 JVM 記憶體使用資訊 |
| `/spark health show --network` | 追加系統網路使用資訊 |

### 2.4 /spark ping

```text
/spark ping
/spark ping --player <username>
```

不帶參數時檢視**所有玩家的平均 ping**（往返時延 RTT）；帶 `--player` 看某個玩家的當前 ping。

**為什麼單獨列出來**：玩家說"卡"，可能是服務端 tick 慢，也可能只是他自己到機房的網路鏈路差。ping 高而 MSPT 正常，問題就在網路路徑上，改服務端配置沒有用。這一步是用來**把網路問題和 tick 問題分開**的。

### 2.5 怎麼看一段時間的變化

單次 `/spark tps` 只是快照。要看趨勢，用 `/spark health` 的 live dashboard：官方說明它每 10 秒自動更新，因此可以把它當成一條時間線，觀察 TPS、MSPT、CPU 是**持續偏低**還是**週期性掉一下**。

| 形態 | 說明 | 下一步 |
| --- | --- | --- |
| TPS 持續偏低、MSPT 持續偏高 | 主執行緒長期忙不過來 | 直接上 profiler 找熱點 |
| TPS 大部分時間正常，偶爾掉一下 | 卡頓尖峰 | 用 tickmonitor 定位，再用 `--only-ticks-over` 取樣 |

:::note 怎麼理解"低 TPS + 正常 MSPT"
按 tick 迴圈的機制推斷：如果 MSPT 確實正常（每個 tick 都在 50 毫秒預算內完成），TPS 就不應該長期偏低，因為 tick 之間的睡眠會把節奏補齊。所以出現"TPS 低但 MSPT 正常"時，要懷疑的不是"某個插件寫得慢"，而是**外部因素**：服務端被暫停了（例如長時間的 stop-the-world、儲存世界、宿主機掛起或遷移），宿主機 CPU 被限流或被其他租戶搶佔，或者**資料本身就是錯的**。

最後這一點有官方依據：spark 的指標全部取自服務端事件與 Java/系統 API，官方在 "About spark metrics" 裡明確說明，**在容器裡執行時 CPU/記憶體等指標偶爾會被誤報**（Pterodactyl 等環境），"如果看起來不對，很可能是 spark 拿到的原始資料不對"。需要說明的是：**"低 TPS + 正常 MSPT 指向外部因素"是本文依據 tick 迴圈機制做的推斷，官方文件並沒有直接下這個結論**，請結合 CPU 使用率、宿主機負載與 GC 日誌一起判斷。
:::

## 3. 取樣分析（profiler）

### 3.1 指令與選項

以下指令與選項全部來自官方 Command Usage 頁面。

基礎操作：

| 指令 | 作用 |
| --- | --- |
| `/spark profiler start` | 以預設模式開始取樣 |
| `/spark profiler stop` | 停止並檢視結果（預設會上傳並給出連結） |
| `/spark profiler cancel` | 停止取樣且**不上傳**結果 |
| `/spark profiler open` | 取樣已在後台執行時，直接開啟檢視頁，不停止它 |
| `/spark profiler info` | 檢視當前取樣狀態 |

常用選項：

| 選項 | 作用 |
| --- | --- |
| `--timeout <seconds>` | 到時自動停止 |
| `--only-ticks-over <milliseconds>` | **只記錄超過該時長的 tick**，用來抓尖峰 |
| `--thread *` | 跟蹤所有執行緒 |
| `--thread <thread name>` | 只跟蹤指定執行緒 |
| `--thread <pattern> --regex` | 按正則匹配要跟蹤的執行緒名 |
| `--interval <milliseconds>` | 取樣間隔，預設 4 |
| `--alloc` | 分析**記憶體分配**（記憶體壓力）而不是 CPU |
| `--alloc --alloc-live-only` | 分配分析時只保留取樣結束時仍未被回收的物件 |
| `--alloc --interval <bytes>` | 分配分析的取樣粒度，預設 `524287`（約 512 KB） |
| `--combine-all` | 把所有執行緒合併到一個根節點下 |
| `--not-combined` | 不把執行緒池裡的執行緒分組到一起 |
| `--ignore-sleeping` | 只記錄不處於 sleeping 狀態的執行緒樣本 |
| `--force-java-sampler` | 強制使用 Java 取樣器，而不是 async 取樣器 |
| `stop --comment <comment>` | 停止時附上備註，會顯示在檢視器裡 |
| `stop --save-to-file` | 把結果儲存到配置目錄下的檔案，**不上傳** |

組合示例（官方指南與 Paper 文件裡的寫法）：

```text
/spark profiler start --timeout 60
/spark profiler start --timeout 600
/spark profiler start --only-ticks-over 150
/spark profiler stop --comment "改动前基线"
/spark profiler stop --save-to-file
```

:::note 關於"不帶參數的 /spark profiler"
官方文件把 profiler 的操作方式寫成 `start`、`stop`、`cancel`、`open`、`info` 這幾個明確的子指令，並沒有把"不帶參數的 `/spark profiler`"描述成一個獨立動作。另外官方配置文件說明 spark 的**後台分析器預設開啟**（設定項 `backgroundProfiler` 預設 `true`），這種情況下你可以直接用 `/spark profiler stop` 或 `/spark profiler open` 去操作**已經在跑的那一次**。因此：**按子指令寫，不要假設裸指令的行為**。
:::

### 3.2 標準流程

```text
1. 确认问题正在发生（官方强调：profiling 必须在问题发生时进行，否则采不到东西）
2. 开始采样：/spark profiler start --timeout 60
3. 让服务器在真实负载下跑 30 到 60 秒（玩家在线、复现操作）
4. 到时自动停止；聊天栏或控制台会出现一个 spark.lucko.me/xxxx 链接
5. 在浏览器打开这个链接
6. 先看 "Server thread"（服务端主线程），从最宽的节点往下点
```

時長怎麼選：如果問題**此刻正在發生**，30 到 60 秒足夠；如果問題是**間歇性**的，用更長的 `--timeout`（Paper 官方文件給的示例是 `--timeout 600`，也就是 10 分鐘），或者改用第 3.6 節的尖峰打法。

### 3.3 在檢視器裡讀報告

官方 "Using the viewer" 頁面把檢視器的結構講得很清楚。

**執行緒（Threads）**：開啟報告先看到的是一份執行緒列表。可以把執行緒理解成"在程式裡幹某件事的工人"。對服務端來說，**通常唯一真正關心的是 "Server thread"**，也就是負責跑遊戲的主執行緒。根節點（執行緒本身）永遠顯示 100%，因為 100% 的取樣時間都花在這個執行緒裡。

**呼叫幀 / 節點（Call frames）**：每個節點顯示三樣資訊——**名字**、**佔該執行緒總時間的百分比**、以及**毫秒數（懸停時顯示）**。點選節點會展開它的子節點。

展開服務端執行緒時的典型形狀（官方示例）：

```text
Server thread
  java.lang.Thread.run()
    MinecraftServer.run()
      MinecraftServer.tick()        <- 真正干活的地方
      Thread.sleep()                <- 睡眠，健康，可以忽略
```

**睡眠佔比是第一個要看的東西**。官方在 tick 迴圈指南裡給了經驗值：

| 睡眠（waitForNextTick / sleep）佔比 | 含義 |
| --- | --- |
| 越高越好（官方示例中是 81%） | 服務端有餘量，能扛住突發負載 |
| 低於 20% | 服務端已經很忙，某些 tick 可能已經在卡 |
| 低於 5% | 基本可以認為正在卡，沒有餘量 |

**但這些全是平均值**，官方特別強調：尖峰會被平均掉，所以"睡眠佔比很高"不等於"沒有卡頓尖峰"。

**三種檢視**（頂部工具欄切換）：

| 檢視 | 內容 | 什麼時候用 |
| --- | --- | --- |
| All（預設） | 完整可展開的呼叫樹 | 順著百分比往下找 |
| Flat | 把**最慢的 250 個方法呼叫**平鋪在頂層 | 快速看"總體上誰最耗時" |
| Sources | **按插件/模組分別給出一棵樹**，頂層是該來源發出的呼叫 | 直接定位"是哪個插件" |

Flat 檢視還有兩個維度：Display 可選 **Top Down**（正常方向，展開看子呼叫）與 **Bottom Up**（反向，展開看"是誰呼叫了它"）；Sort 可選 **Total Time**（含子呼叫的總時間）與 **Self Time**（方法自身耗時）。

**火焰圖（Flame Graph）**：可以點頂部火焰圖示，或右鍵某個節點選 "View as Flame Graph"。官方說明：**節點寬度對應它佔用的時間比例**；點選節點可以"聚焦"它並讓它鋪滿整頁。常說的"看最寬的那條"，指的就是這裡。

**反混淆對映（Deobfuscation）**：Minecraft 的客戶端與服務端把類名和方法名混淆過。檢視器**預設會自動識別該套用哪套對映**；如果沒識別對，用頁面右上角的下拉選單手動選擇。

**書籤**：按住 `alt` 點選某個方法呼叫，或右鍵選 "Toggle bookmark"，該方法會高亮，並且**書籤會被編碼進 URL**——把這條帶書籤的連結發給別人，對方開啟時會自動展開並高亮同樣的位置。這是"指給別人看"的最省事方式。

### 3.4 服務端執行緒與非同步執行緒

- **Server thread**：tick 迴圈所在的主執行緒，絕大多數效能問題都在這裡。
- **非同步執行緒（async threads）**：插件的非同步任務、區塊儲存、網路 IO（Netty）、GC 執行緒等。它們**不直接佔用 tick 預算**，但如果它們搶 CPU，或者與主執行緒爭鎖，仍然會影響主執行緒。

官方文件裡 `--thread *` 的說明是"跟蹤**所有**執行緒"，這意味著預設情況下並不是所有執行緒都被納入取樣。**如果你懷疑某個插件把重活丟到了非同步執行緒**（表現為 CPU 很高但服務端執行緒看起來不忙），就顯式用 `--thread *` 再採一次。

### 3.5 怎麼把時間歸因到某個插件

這是 spark 相比 timings 最實用的地方：**報告裡會出現插件自己的包名**。

例如服務端執行緒裡出現一條很寬的：

```text
com.example.shop.ShopManager.tickShops()
```

那麼 `com.example.shop` 這個插件就是在做這件事。判斷方法：

1. 在 All 視圖裡順著百分比往下展開，直到看到一個"看起來像插件"的包名（通常是反向網域，如 `me.lucko.`、`com.example.`）。
2. 或者直接切到 **Sources 檢視**，它會**按插件/模組分別建樹**，誰的樹最"胖"誰就是嫌疑物件。
3. 如果最頂層是服務端自己的方法（NMS），別急著下結論：用 **Bottom Up** 或繼續展開，看看**是誰呼叫了它**——很可能是某個插件通過事件或 API 觸發了這段服務端程式碼。

### 3.6 專打卡頓尖峰：tickmonitor 加 only-ticks-over

尖峰會被平均值掩蓋，所以官方給了一套專門的組合拳。

第一步，用 `tickmonitor` 找出"多慢算異常"：

| 指令 | 作用 |
| --- | --- |
| `/spark tickmonitor` | **開關**監控系統（再執行一次即關閉） |
| `/spark tickmonitor --threshold <percent>` | 只報告**比平均 tick 時長高出指定百分比**的 tick |
| `/spark tickmonitor --threshold-tick <milliseconds>` | 只報告**超過指定毫秒數**的 tick |
| `/spark tickmonitor --without-gc` | 開啟監控，但關閉關於 GC 活動的報告 |

官方說明：預設閾值是 **100%**，也就是"這個 tick 花的時間是平均值的兩倍"才報告。想更敏感就調低，例如：

```text
/spark tickmonitor --threshold-tick 50
/spark tickmonitor --threshold-tick 70
```

第二步，用 `--only-ticks-over` 只採這些異常 tick：

```text
/spark profiler start --only-ticks-over 150
```

官方給的經驗：閾值**建議取 50 到 100 之間，但一定要小於你那些"卡"的 tick 的實際時長**，否則會把尖峰本身過濾掉。官方示例裡的卡頓動作超過 300 毫秒，於是取 150 毫秒"保險一點"。

這樣採出來的報告裡，所有"正常"的遊戲工作都被過濾掉了，剩下的就是尖峰本身，熱點會非常清楚。

## 4. 其他診斷工具

| 指令 | 回答什麼問題 | 什麼時候用 |
| --- | --- | --- |
| `/spark tps` | 現在到底卡不卡？TPS、MSPT、CPU 各是多少？ | 每次排查的第一步；改配置前後做對比 |
| `/spark health` | 整體健康度如何（TPS、CPU、記憶體、磁碟）？ | 需要連續觀察；live dashboard 每 10 秒重新整理 |
| `/spark health upload` | 同上，但要一份可分享的靜態快照 | 發給人看、留檔 |
| `/spark health show` | 不開瀏覽器，直接在控制台看 | SSH 環境裡快速看一眼；加 `--memory` 或 `--network` |
| `/spark ping` | 玩家延遲高不高？是網路問題還是 tick 問題？ | 玩家報"卡"，先分清這兩類 |
| `/spark profiler start` | CPU 時間花在哪些方法、哪些插件上？ | 確認"真的卡"之後 |
| `/spark tickmonitor` | 哪些 tick 異常慢？多久出現一次？ | 間歇性卡頓、尖峰 |
| `/spark gc` | GC 歷史如何？停頓頻繁嗎？ | 懷疑記憶體或 GC 導致卡頓 |
| `/spark gcmonitor` | 持續盯著 GC，發生時報出來 | 懷疑 GC 尖峰；開一次、復現、再關一次 |
| `/spark heapsummary` | 堆裡什麼物件佔得最多？ | 懷疑記憶體洩漏；結果上傳到檢視器 |
| `/spark heapdump` | 完整堆快照（`.hprof`） | 需要用 MAT 等離線工具深挖；檔案很大 |
| `/spark activity` | 最近誰用過 spark、做了什麼？ | 多人共管時確認是不是別人在取樣；`--page <n>` 翻頁 |

下面補充幾個容易用錯的細節。

### 4.1 GC 相關：/spark gc 與 /spark gcmonitor

`/spark gc` 列印服務端的 **GC（垃圾回收）歷史**，回答"GC 有沒有在拖慢服務端"。

`/spark gcmonitor` **開關** GC 監控系統（再執行一次關閉）。它的價值在於**和卡頓對齊**：先開監控，復現一次卡頓，然後看卡頓的時刻有沒有對應的 GC 活動。如果時間對得上，方向就轉向記憶體與 GC 參數，而不是去找插件熱點。

### 4.2 記憶體相關：/spark heapsummary 與 /spark heapdump

兩者的區別很重要：

| 指令 | 產物 | 用途 |
| --- | --- | --- |
| `/spark heapsummary` | 堆**摘要**，上傳到檢視器 | 快速看"哪類物件佔記憶體最多"，用來判斷有沒有洩漏嫌疑 |
| `/spark heapdump` | 完整 `.hprof` 檔案，寫到磁碟 | 需要離線用專業工具深挖物件引用鏈 |

`/spark heapdump` 的選項是 `--compress <type>`，支援的壓縮類型為 `gzip`、`xz`、`lzma`。官方文件把 `--include-non-live`（包含不可達物件）和 `--run-gc-before`（生成前建議 JVM 先跑一次 GC）**標記為已廢棄（deprecated）**；`heapsummary` 的 `--run-gc-before` 同樣已廢棄。

:::warn heapdump 很重
完整堆轉儲會**寫一個和堆大小同量級的檔案到磁碟**，並且過程會讓 JVM 有明顯停頓。正式環境上不要在高峰期隨手執行，先確認磁碟空間。
:::

## 5. 從報告裡定位問題

### 5.1 決策表

先說明一個前提：**方法名會隨版本、服務端實現和對映集變化**。官方檢視器示例裡用的是 `WorldServer.doTick()`、`WorldServer.tickEntities()` 這類名字（對應較老的對映）；在別的版本上你看到的可能是 `ServerLevel.tick`、`Level.tickEntities` 之類。**不要背名字，要看形狀和百分比**，並利用檢視器的自動反混淆。

| 報告裡的現象 | 大機率結論 | 下一步 |
| --- | --- | --- |
| 某個**插件的包名**（如 `com.example.shop`）在服務端執行緒裡佔比最高 | 這個插件就是瓶頸 | 升級、找替代、限制觸發頻率；把報告連結發給作者 |
| `Entity.tick` 或 `Level.tickEntities`（舊對映下是 `WorldServer.tickEntities`）佔大頭 | **實體太多** | 見 [實體與掉落物堆積](/tutorials/faq/entity-lag)：清理掉落物、限制刷怪、調低視距與實體相關配置 |
| 區塊相關呼叫（`ChunkMap`、`ChunkGenerator` 等）佔大頭 | **區塊生成或載入** | 做地圖預生成，減少玩家探索新區域帶來的即時生成 |
| 漏斗與方塊實體 tick（`hopper`、`LevelChunk.tickBlockEntities` 等） | **紅石、漏斗與方塊實體負載** | 給漏斗限速、合併農場、減少常載入區塊裡的紅石機器 |
| 時間線上出現長 GC 停頓 | **記憶體或 GC 配置** | 調堆大小與 GC 參數；先用 `heapsummary` 排除洩漏 |
| 只有**某一個世界或某一片區域**慢 | 特定農場或建築 | 定位座標，就地拆解、限制，或拆到獨立服務端 |
| `waitForNextTick` 或 sleep 佔比很低（低於 5%） | 服務端整體沒有餘量 | 不是單點問題，而是容量不足：減負載或升級單核效能 |
| sleep 佔比很高，但玩家仍報卡 | 平均值掩蓋了尖峰 | 走 3.6 節：`tickmonitor` 加 `--only-ticks-over` |

### 5.2 歸因的兩個常見誤區

**誤區一：看到 NMS 方法就以為是"服務端的問題"。** `Entity.tick` 這類方法是服務端程式碼，但**觸發它的可能是插件、玩家行為或農場設計**；用 Flat 檢視按 **Bottom Up** 展開，找"誰呼叫了它"。

**誤區二：只看 Total Time 就下結論。** 一個方法 Total Time 很高，可能只是因為它呼叫了很多子方法（它自己是"殼"）；切到 **Self Time** 排序，看**真正把時間花在自己身上**的方法，那才是要改的地方。

### 5.3 一定要做前後對比

單份報告只能說明"現在是這樣"，不能說明"改這個有沒有用"。正確做法：

```text
1. 采样 A：/spark profiler stop --comment "改动前基线"
2. 做且只做一处改动
3. 在尽量相同的条件下采样 B（玩家数、时间段、是否在同一区域）
4. 对比两次报告里同一个节点的百分比变化
5. 如果没变好，回滚这次改动，再试下一个假设
```

一次只改一個變數，否則無法歸因。對比時看的是**同一節點的百分比變化**，而不是絕對值——因為兩次取樣的總時長與玩家數可能不同。

## 6. 實戰流程與注意事項

### 6.1 取樣本身有開銷

spark 是取樣型分析器，開銷比插樁小得多，但**不是零**：

- 後台分析器**預設開啟**，取樣間隔預設 **10 毫秒**（設定項 `backgroundProfilerInterval`）。
- 取樣引擎預設是 `async`（async-profiler），官方說明它比 Java/WarmRoast 引擎更準確（不受安全點取樣偏差影響），**系統支援時會自動使用**。它要求 Linux 或 macOS 加 x86_64/aarch64 架構；在容器裡可能還需要補 `libstdc++`。
- **分配分析（`--alloc`）與 heapdump 更重**：前者需要 HotSpot 除錯符號（Java 11 及以上通常自帶），後者要寫大檔案並讓 JVM 停頓。

:::warn 不要讓分析器一直跑
取樣是為了回答一個具體問題，採完就停。用 `--timeout` 讓它自己停是最省心的做法。**在已經卡的伺服器上長期掛著分析器，只會讓情況更糟。**
:::

### 6.2 分享報告與隱私

官方文件對"分享"的說法是正面的：報告會自動上傳到檢視器並給你一個連結，**這個連結可以自由發給別人**——發給幫你排查的人，或者發給插件與模組的作者，用來指出問題。書籤機制還會把"我指的是這一行"編碼進 URL。

但有幾件事必須清楚：

1. **上傳是預設行為**。`/spark profiler stop` 預設上傳；只有 `/spark profiler stop --save-to-file` 是**儲存到配置目錄下的檔案而不上傳**。
2. **官方文件沒有描述"把報告設為私有"的開關**。在本文核對過的頁面裡，沒有任何關於訪問控制或私有報告的說明。因此**請把報告連結當作"任何拿到它的人都能開啟"來對待**。
3. **原始資料是可取的**。官方 "Raw spark data" 頁面說明：給連結加上 `?raw=1` 可以得到 JSON 元資料；甚至可以直接向 `https://spark-usercontent.lucko.me/<code>` 請求原始資料（類型為 `application/x-spark-sampler`、`application/x-spark-heap`、`application/x-spark-health`）。也就是說，**那串短碼本身就是訪問憑據**。
4. **元資料裡包含身份資訊**。官方示例的元資料裡就有發起者的使用者名與 UUID。把連結貼到公開場合前，先想一下這一點。
5. **本地開啟**：不想上傳時，可以把 `.sparkprofile` 或 `.sparkheap` 檔案拖拽到檢視器頁面的拖放區域，在本地檢視。
6. 如果是拿去求助，PaperMC 官方文件的建議是**帶著 spark 報告去他們的 Discord `#paper-help` 頻道**（這是 Paper 官方給出的渠道）。

### 6.3 一次完整取樣的清單

```text
准备
[ ] 确认已加载：/spark
[ ] 记录当前状态：/spark tps
[ ] 确认问题正在发生（否则采不到东西）
[ ] 确认磁盘空间足够（尤其是可能要 heapdump 时）
采样
[ ] 整体持续卡   -> /spark profiler start --timeout 60
[ ] 间歇性尖峰   -> 先 /spark tickmonitor 找阈值，再 /spark profiler start --only-ticks-over <ms> --timeout <s>
[ ] 怀疑异步线程 -> 加 --thread *；怀疑内存分配 -> 加 --alloc（开销更大）
[ ] 不要让它无限期运行
读报告
[ ] 先看 Server thread 的 sleep 占比
[ ] 从最宽的节点往下点，跟着百分比走
[ ] 用 Sources 视图归因到具体插件
[ ] 用 Flat 加 Self Time 找"真正自己耗时"的方法
[ ] 用 Bottom Up 找"是谁调用了这个慢方法"
[ ] 尖峰场景确认 --only-ticks-over 生效（报告里不应有大量正常 tick）
结论与复验
[ ] 写下结论：哪个插件、哪类实体、哪个区域，还是容量不足
[ ] 一次只改一处，改完用相同条件再采一次
[ ] 用 --comment 给报告打标签，保留链接做对比
```

### 6.4 什麼時候不該用 spark

玩家只是延遲高時，先 `/spark ping`，那可能是網路路徑問題；服務端起不來或崩潰時去看日誌與崩潰報告，profiler 幫不上忙；TPS 正常但玩家仍說"卡"時，先確認是不是客戶端渲染、視距或網路抖動，而不是盲目上分析器。

配套閱讀：[效能最佳化](/tutorials/java/optimize)（配置與 JVM 調優）、[實體與掉落物堆積](/tutorials/faq/entity-lag)（實體過多）、[系統安全加固](/tutorials/ops/system-security)（主機側加固）、[備份與恢復](/tutorials/java/backup)（改動前的兜底）。

> spark 的指令與選項以其官方文件為準；不同平台可用指令略有差異。
