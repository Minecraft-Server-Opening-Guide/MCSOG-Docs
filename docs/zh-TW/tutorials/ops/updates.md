---
title: 服務端、插件與 MCDR 的更新維護
slug: updates
cat: ops
level: 3
order: 13
minutes: 18
tags: [ops, updates, upgrade, rollback, backup, plugins, mcdr, maintenance]
updated: 2026-10-04
draft: false
---

"更新"是維運裡最像日常、也最容易出事故的動作。裝插件失敗最多是少個功能，**更新失敗可能直接讓存檔打不開**。這一篇把服務端核心、插件、模組與 MCDR 的更新流程串成一套可複用的做法，重點不是"點下一步"，而是**每一步留下的退路**。

開始之前建議先讀兩篇：[備份與恢復](/tutorials/java/backup)（更新前必須先會備份與恢復）、[服務端結構](/tutorials/java/structure)（清楚自己要動的到底是哪些檔案）。

## 1. 更新的鐵律

下面六條按重要性排序。**任何一條跳過，都可能把"十分鐘的更新"變成"一整天的搶救"。**

### 1.1 先備份，並且驗證備份

備份不是"打個包就完事"，必須確認它**真的可用**：檔案存在、體積合理、能列出內容，最好能在測試目錄裡真正解開一次。

```bash
# Linux：确认归档存在、体积合理、能列出内容
ls -lh /opt/mcserver/backups/world-20261004.tar.gz
tar -tzf /opt/mcserver/backups/world-20261004.tar.gz | head
```

```powershell
# Windows：解到临时目录，确认内容完整
Get-Item C:\mcserver\backups\world-20261004.zip | Select-Object Name, Length, LastWriteTime
Expand-Archive -Path C:\mcserver\backups\world-20261004.zip -DestinationPath C:\mcserver\verify -Force
Get-ChildItem C:\mcserver\verify | Select-Object Name
```

:::warn 沒有驗證過的備份不算備份
"備份腳本其實早就失敗了""包是空的""只拷了 `db/` 沒拷 `level.dat`"——這些都是在真出事那天才發現的。**至少每月真正恢復一次**，流程見 [備份與恢復](/tutorials/java/backup)。
:::

### 1.2 讀更新日誌

更新日誌裡要找的是四件事，而不是版本號好不好看：

| 要找什麼 | 為什麼重要 |
| --- | --- |
| **破壞性變更** | 配置鍵改名、指令改名、資料格式變化，會直接讓現有配置失效 |
| **新的最低要求** | 服務端與插件的 Java 版本、載入器版本、依賴插件版本 |
| **資料遷移說明** | 是否需要手動執行遷移指令，是否需要先升到某個中間版本 |
| **已知問題** | 作者已經承認的 bug，能讓你避開一個剛發佈的壞版本 |

### 1.3 在獨立實例裡先試

準備一份"測試實例"：另一個目錄、另一份埠、另一份世界副本。**所有更新先在測試實例裡跑通，再動生產服。**

```bash
# Linux：用备份直接铺一个测试实例
mkdir -p /opt/mcserver/test
tar -xzf /opt/mcserver/backups/full-20261004.tar.gz -C /opt/mcserver/test
```

```powershell
# Windows：同理
New-Item -ItemType Directory -Force -Path C:\mcserver\test
Expand-Archive -Path C:\mcserver\backups\full-20261004.zip -DestinationPath C:\mcserver\test -Force
```

測試實例裡要把埠改掉（`server.properties` 的 `server-port`），否則會和正在跑的服務端搶同一個埠。

### 1.4 挑維護視窗

挑玩家最少的時段（通常是凌晨或工作日上午），避開比賽與開荒等活動，**預留兩倍時間**，並確認出問題時你自己在場——有人盯著控制台，才可能及時回滾。

### 1.5 永遠留回滾路徑

**核心原則：任何被替換掉的檔案，都要以帶版本號的名字留下來。**

```text
server-1.21.1.jar            # 旧核心，随时能换回来
MyPlugin-1.0.0.jar.bak       # 旧插件
world-20261004/              # 更新前的世界备份
config.yml.20261004.bak      # 更新前的配置
```

:::tip 回滾路徑要在更新前就想好
更新前先問自己一句："如果十分鐘後我要退回去，具體敲哪幾條指令？"**答不上來就先別更新。**
:::

### 1.6 提前公告停機

在群裡、公告欄、伺服器 MOTD 裡說明：幾點開始、預計多久、會更新什麼、出問題怎麼辦。玩家最反感的不是停機，而是**不知道為什麼進不去、也不知道要等多久**。

### 1.7 可能出問題的情況

| 風險 | 典型表現 | 後果 | 預防 |
| --- | --- | --- | --- |
| 世界被新版本改寫 | 新版本啟動過一次，再換回舊核心時存檔報錯或無法載入 | **不可逆**，只能回檔到備份 | 首次用新版本啟動前做完整備份，並保留舊核心與舊目錄 |
| Java 版本不符 | 啟動即崩，日誌出現 `UnsupportedClassVersionError` | 服務起不來 | 按第 2.2 節的表格對齊 Java |
| 插件與新核心不相容 | `/plugins` 出現紅字，或控制台刷 `NoSuchMethodError` | 功能缺失，甚至無法啟動 | 先看插件的支援版本與更新日誌，先在測試實例試 |
| 配置鍵被改名或刪除 | 插件重新生成預設配置，原有設定"消失" | 功能按預設值執行，影響玩家 | 更新前備份配置目錄，更新後逐項對照 |
| 模組與載入器不匹配 | 啟動崩潰，日誌列出某個模組名與類錯誤 | 模組端完全起不來 | 載入器、遊戲版本、模組三者一起對齊 |
| 基岩版協議不匹配 | 更新服務端後玩家進不來，提示需更新客戶端 | 玩家流失，iOS 玩家無法降級 | 更新前確認玩家客戶端能跟上 |
| 下載到被篡改的檔案 | 核心或插件能跑但行為異常 | 安全事件 | 只從官方或官方認可的發佈頁下載 |
| 維護視窗估錯 | 玩家已經在群裡問"怎麼還進不去" | 口碑與信任受損 | 預留兩倍時間，提前公告 |
| 磁碟寫滿 | 解壓失敗，或存檔寫不進去 | 存檔損壞 | 更新前確認可用空間 |
| 權限與屬主變化 | Linux 下新檔案屬主是 root，服務端使用者寫不進去 | 插件配置無法儲存 | 更新後 `chown -R` 回服務端專用使用者 |

## 2. 服務端核心的更新

### 2.1 通用流程

1. **停服**。在控制台執行 `stop`，等它正常退出，**不要直接殺行程**。
2. **記錄當前版本**（核心版本號、構建號、啟動腳本裡的 jar 檔名）。
3. **舊核心改名留底**，加上版本字尾。
4. **從官方來源下載新核心**，不要用第三方整合包裡的 jar。
5. **放入新核心**，檔名與啟動腳本保持一致（否則腳本會找不到檔案；啟動腳本的寫法見 [開啟服務端](/tutorials/java/start)）。
6. **啟動並盯住控制台**，不要啟動完就走開。
7. **驗證**：控制台無報錯、`/plugins` 正常、自己進服走一圈，並**觀察一段時間**再決定是否刪除舊 jar。

```text
stop
```

```bash
# Linux
cd /opt/mcserver/survival
mv server.jar server-1.21.1.jar                 # 旧核心改名留底
cp ~/downloads/server-1.21.4.jar ./server.jar   # 换成官方下载页给的文件
./start.sh
```

```powershell
# Windows
Set-Location C:\mcserver\survival
Rename-Item server.jar server-1.21.1.jar
Copy-Item "$env:USERPROFILE\Downloads\server-1.21.4.jar" .\server.jar
.\start.bat
```

進服後的驗證動作：

```text
/version        查看服务端版本
/plugins        查看插件加载状态（红色为加载失败）
```

:::tip 舊核心先別刪
至少留到"新版本跑滿一個維護週期且世界一切正常"之後。一個 jar 幾百 MB，換來的是隨時能退回去。
:::

### 2.2 版本跳躍不是免費的：先對齊 Java

**Java 版本不匹配時服務端啟動即崩**，日誌裡會出現 `UnsupportedClassVersionError`。下表與 [環境準備（Windows 與 Linux）](/tutorials/java/environment) 保持一致，直接複用：

| Minecraft Java 版 | 官方要求的 Java | 說明 |
| --- | --- | --- |
| 26.1 及以後 | **Java 25** | 最新要求（26.1 起） |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 是最早要求 21 的正式版 |
| 1.18 – 1.20.4 | **Java 17** | 目前最常用的組合 |
| 1.17 – 1.17.1 | **Java 16** | Java 17 也可以正常啟動 |
| 1.12 – 1.16.5 | **Java 8** | 大量老整合包仍停留在這一檔 |
| 1.7.10 及更早 | 官方要求較低 | 實際普遍使用 Java 8 |

:::note 上表來源
1.20.5 / 1.18 / 1.17 / 1.12 等分界取自 Mojang 官方版本清單（`piston-meta.mojang.com` 每個版本的 `javaVersion.majorVersion` 欄位）；26.1 起要求 Java 25 取自 Minecraft Wiki 的版本要求列表。非經驗推測。
:::

- **Paper、Purpur、Spigot、Fabric、Forge 的要求與官方一致**：1.20.5 以上需要 Java 21，1.18 – 1.20.4 需要 Java 17。
- 上表是**最低要求**，Java 版本過高時部分插件與模組可能不相容，**建議與要求嚴格對齊**。
- **基岩版（BDS）不需要 Java**，它是 C++ 程式，直接執行 `bedrock_server`（Windows 下為 `bedrock_server.exe`）。

**跨多個大版本時不要一步跳過去。** 中間版本可能改變了配置格式、世界格式與插件 API，必要時逐版本升級（例如 1.19 → 1.20 → 1.21），每次升完都驗證一遍。

### 2.3 世界格式：升級基本是單行道

:::warn 被新版本開啟過的世界，不保證能在舊版本開啟
用新版本啟動過服務端之後，世界裡的區塊與實體資料可能已經**按新格式改寫**。把核心換回舊版本時，輕則報錯刷屏，重則**世界無法載入**。這是單向的，沒有"轉換回舊格式"的官方工具。
:::

因此：

- 首次用新版本啟動之前，**做一次完整備份**（`world/`、`world_nether/`、`world_the_end/`，自定義世界名以 `server.properties` 的 `level-name` 為準）。
- 回退時**連世界一起回退**：換回舊核心的**同時**，用更新前的備份覆蓋世界，而不是隻把 jar 換回去。
- 想先驗證相容性，就在測試實例裡跑新版本，**不要拿生產世界試**。

### 2.4 Paper / Purpur / Leaves / Leaf

這一批核心的更新方式完全一致：**替換 jar**。它們與官方原版共享同一套世界格式，所以第 2.3 節的結論同樣適用。

需要注意的只有配置：

| 情況 | 說明 |
| --- | --- |
| 配置新增鍵 | 首次啟動時核心會把缺失的鍵**寫成預設值**追加進設定檔 |
| 配置刪除或改名 | 舊鍵可能被保留但不再生效，也可能被忽略；行為可能悄悄變化 |
| 構建號變化 | 同一遊戲版本的不同構建也可能引入行為變化，讀一下構建日誌 |

做法：更新前把整個服務端目錄（至少是各 `*.yml`）複製一份，更新後對比差異。

```bash
# Linux：对比更新前后的配置
diff -u paper-global.yml.bak paper-global.yml
```

```powershell
# Windows：对比更新前后的配置
Compare-Object (Get-Content .\paper-global.yml.bak) (Get-Content .\paper-global.yml)
```

:::tip 官方來源
Paper 見 <https://papermc.io/>，Purpur 見 <https://purpurmc.org/>。Leaves、Leaf 等核心請以各自官方發佈頁為準，**不要用聚合站或網盤裡的 jar**。
:::

### 2.5 Fabric / Forge / NeoForge

模組端比插件端"卡"得更死：**載入器版本、遊戲版本、每一個模組，三者必須相互匹配**。

| 元件 | 必須匹配什麼 | 不匹配的症狀 |
| --- | --- | --- |
| 載入器（Fabric / Forge / NeoForge） | 與遊戲版本繫結，只支援特定版本區間 | 載入器裝不上，或服務端起不來 |
| 每個模組 | 與遊戲版本、載入器版本、以及它依賴的其他模組匹配 | 啟動崩潰，日誌列出模組名與類錯誤 |
| 服務端與客戶端模組 | 需要雙方都裝的模組必須一致 | 玩家進不來，或進服後立即被踢 |

**載入器升級通常要求模組一起更新**：模組是針對特定版本的載入器 API 編譯的。典型失敗症狀是**啟動即崩**，日誌裡能看到模組名配合類錯誤，例如 `NoClassDefFoundError`、`ClassNotFoundException`、`NoSuchMethodError`；Forge 系還會直接提示缺少必需依賴（`Missing or unsupported mandatory dependencies`），客戶端可能提示模組集合不相容。

建議的更新順序：

1. 先確認目標遊戲版本已有可用的載入器版本。
2. 在測試實例裡升級載入器，確認能起得來（此時模組可以先全部移走）。
3. 分批放回模組（每批更新完啟動一次，便於定位是哪個模組出問題），最後把服務端與客戶端一起更新，模組清單兩邊對齊。

### 2.6 基岩版 BDS

基岩版的版本約束和 Java 版不同：**客戶端協議必須與服務端構建匹配**，協議一變，舊客戶端直接連不上（原理見 [協議版本與版本選擇](/tutorials/bedrock/protocol)）。

| 要點 | 說明 |
| --- | --- |
| 客戶端協議 | 更新服務端後，玩家必須使用匹配版本的客戶端；不匹配時提示需要更新 |
| iOS 限制 | iOS 玩家**只能安裝商店裡的最新版本**，無法安裝指定的舊版本。所以"固定舊版本"等於放棄 iOS 玩家 |
| 存檔位置 | BDS 的存檔全在 `worlds/` 下，**更新前必須整體備份** |
| 設定檔 | `server.properties`、`allowlist.json`、`permissions.json`、`valid_known_packs.json` 都是你的資料，不能被新包覆蓋 |

更新步驟：從官方下載頁取對應平台的壓縮包，**解壓到臨時目錄**，只取可執行檔案放進原目錄。

```bash
# Linux：解压到临时目录，只替换二进制（文件名换成实际的版本号）
unzip bedrock-server-new.zip -d /tmp/bds-new
mv bedrock_server bedrock_server-old
cp /tmp/bds-new/bedrock_server .
chmod +x bedrock_server
```

```powershell
# Windows：同理（压缩包里还有配套 DLL，不要漏拷）
Expand-Archive -Path "$env:USERPROFILE\Downloads\bedrock-server-new.zip" -DestinationPath C:\bds-new -Force
Rename-Item .\bedrock_server.exe bedrock_server-old.exe
Copy-Item C:\bds-new\bedrock_server.exe .
```

:::warn 不要整包解壓覆蓋上去
官方壓縮包裡也帶一份預設的 `server.properties`、`allowlist.json`、`permissions.json` 等檔案。**整包覆蓋會覆蓋你的配置與白名單。** 只取程式檔案，資料與配置保持原樣，並確認 `worlds/` 沒有被替換。
:::

目錄結構與載入器的版本約束見 [BDS 服務端](/tutorials/bedrock/bds)：第三方載入器同樣只支援特定版本區間，**升級服務端前先確認載入器已跟進**。

### 2.7 降級：最常見的人為資料損失

:::warn 世界被新版開啟過之後，降級核心等於資料損失
"更新完發現插件不相容，趕緊把舊核心換回來"是維運裡最常見的自傷操作。**核心能換回去，世界不一定。**
正確做法是：回退核心的**同時**，用更新前的完整備份把世界一起回退；只換 jar 不換世界，很可能換來一個打不開的存檔。
:::

如果更新後確實要降級，順序是：

1. 停服。
2. 把**當前**（被新版改寫過的）世界目錄改名留底，不要直接刪——它是排查問題的證據。
3. 解壓更新前的世界備份，放回原位。
4. 換回舊核心 jar。
5. 啟動，檢查日誌與存檔。
6. 讓玩家確認關鍵建築與物品正常。

## 3. 插件的更新

插件更新比核心更新更頻繁，也更容易因為**配置結構變化**而出問題。基礎操作見 [插件入門](/tutorials/java/plugins)。

### 3.1 更新前檢查四件事

| 檢查項 | 去哪裡看 | 不看會怎樣 |
| --- | --- | --- |
| 支援的服務端版本 | 插件發佈頁的相容版本列表 | 載入失敗，`/plugins` 紅字 |
| 支援的 Java 版本 | 插件發佈頁或更新日誌 | 載入時報類版本錯誤 |
| 前置依賴是否齊備、版本是否夠新 | 插件說明裡的 Requires / Dependencies，見 [常用前置插件](/tutorials/java/plugin-deps) | 硬前置缺失時插件直接載入失敗 |
| 更新日誌裡的破壞性變更 | 發佈頁的 changelog / release notes | 配置失效、資料未遷移 |

最常被依賴的幾個前置是 **Vault、PlaceholderAPI、ProtocolLib、LuckPerms**：它們被大量插件當作硬前置或軟前置，更新前先確認它們在位並且版本滿足要求。

### 3.2 流程

1. **停服**（或明確接受熱過載的能力邊界，見 3.5）。
2. **備份** `plugins/<插件名>/` 目錄；涉及資料庫的插件，連資料庫一起備份。
3. **舊 jar 改名留底**，加上版本號。
4. **放入新 jar**。
5. **啟動，看控制台**。
6. **`/plugins` 確認狀態**（紅色表示插件被識別但載入失敗），再**測試插件自己的指令**確認功能真的可用。

```powershell
# Windows
Set-Location C:\mcserver\survival\plugins
Rename-Item MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
Copy-Item "$env:USERPROFILE\Downloads\MyPlugin-1.1.0.jar" .
```

```bash
# Linux
cd /opt/mcserver/survival/plugins
mv MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
cp ~/downloads/MyPlugin-1.1.0.jar .
```

```text
/plugins
```

:::note 紅色條目先看控制台
載入失敗的原因一定列印在控制台與 `logs/latest.log` 裡。**開啟日誌搜尋插件名**，比在群裡描述"我的插件紅了"快得多。
:::

### 3.3 配置遷移

| 情況 | 建議做法 |
| --- | --- |
| 只是新增了設定項 | 讓插件自己生成預設值即可，通常不需要干預 |
| 配置鍵被改名或重構 | **保留舊配置副本**，對照更新日誌逐項搬運 |
| 配置被拆成多個檔案 | 同樣保留舊檔案，按官方說明遷移 |
| 資料需要遷移（資料庫、玩家資料） | 按官方遷移說明執行，**先備份資料庫** |

:::tip 讓插件先重新生成預設配置
比起手工合併兩份 YAML，更穩的順序是：**先讓新版本自己生成一份完整的預設配置**，再對照舊配置把自己的值逐項填回去。手工合併很容易在縮排、重複鍵、類型（字串與數字）上出錯，而 YAML 的報錯資訊通常很難懂。
:::

### 3.4 依賴優先：先更新前置

**先更新前置，再更新依賴它的插件。** 反過來做，會出現"前置的介面已經變了，上層插件還在呼叫舊介面"的 `NoSuchMethodError` / `NoClassDefFoundError`。

同理，如果某個插件被多個插件當作前置，它的一次更新可能同時影響好幾個插件，更新後要把相關功能都點一遍。

### 3.5 插件管理器：能做什麼，不能做什麼

PlugManX、ServerUtils 這類"插件管理插件"可以在服務端執行中載入、解除安裝、過載其他插件。它們的**能力邊界**很明確：

| 情況 | 能否靠熱過載解決 |
| --- | --- |
| 只是改了配置 | 用插件自帶的 `reload` 即可 |
| 臨時停用出問題的插件 | 可以，這是熱過載最有價值的用法 |
| 換插件版本（換 jar） | 不建議，應當停服替換 |
| 插件註冊了指令、權限、監聽器、配方、世界生成器 | 解除安裝後常留殘留，過載容易出錯 |
| 插件持有資料庫連線、執行緒池或大量靜態快取 | 解除安裝後資源往往不釋放 |
| 反覆載入解除安裝同一個插件 | 類載入器無法回收，記憶體持續上漲 |
| 模組端 | 插件管理器管不了模組 |
| 服務端原版 `/reload` | 不推薦，容易讓插件狀態錯亂 |

:::warn 生產服不要只靠熱過載
熱過載適合"臨時關掉一個插件看問題是否消失"和快速試配置。**正式的版本更新、依賴變更，仍然應該走停服重啟的流程。** 更詳細的排毒流程見 [插件管理與排毒](/tutorials/java/plugin-manage)。
:::

### 3.6 只從官方來源下載

:::warn 非官方轉載的 jar 不要用
聚合下載站、網盤、群檔案裡的"漢化版""破解版""整合版"插件，很可能被重新打包過。**檔名與版本號一樣，內容可能已經不同。**
優先使用官方發佈頁：SpigotMC、Modrinth、Hangar、作者自己的 GitHub Releases。有提供雜湊就核對雜湊；付費插件請走官方購買頁。
:::

## 4. MCDR 的更新

MCDR（MCDReforged）是包在服務端核心外面的管理器，用 Python 3 編寫。更新它**不會動你的服務端核心與世界**，風險主要落在**它自己的配置與 Python 插件**上。基礎概念見 [MCDR 服務端管理器](/tutorials/java/mcdr)。

### 4.1 安裝方式：用 pip，不要用原始碼 zip

MCDR 已發佈到 PyPI，官方文件給出的安裝方式是 pip：

```bash
# Windows
pip install mcdreforged

# Linux
pip3 install mcdreforged
```

:::warn 不要下載原始碼 zip 來執行
網上不少教學讓你去 GitHub 下載壓縮包解壓使用——**官方文件明確說明那是過時做法**。MCDR 自 2021 年初的 v1.0 起就不再使用原始碼安裝。除非你是 MCDR 的開發者並且清楚在做什麼，否則請用 pip 安裝。
:::

### 4.2 Python 版本要求

官方文件給出的對應關係：

| MCDR 版本 | Python 依賴 |
| --- | --- |
| < 2.10 | >= 3.6 |
| >= 2.10 | >= 3.8 |
| >= 2.15 | **>= 3.9** |

升級 MCDR 之前先確認你的 Python 版本滿足目標版本的要求；如果系統 Python 太舊，需要先升級 Python（或改用官方文件推薦的隔離環境方式）。

### 4.3 更新指令

**用執行 MCDR 的那個直譯器去升級**，具體指令取決於當初是怎麼裝的：

```bash
# 全局 pip（Windows，-U 即 --upgrade）
pip install mcdreforged -U

# 全局 pip（Linux）
pip3 install mcdreforged -U

# pipx 管理的隔离环境
pipx upgrade mcdreforged

# 虚拟环境：先激活，再升级
# source venv/bin/activate        （POSIX）
# venv\Scripts\Activate.ps1       （Windows PowerShell）
pip install mcdreforged -U
```

驗證版本，輸出形如 `MCDReforged v2.16.0`：

```bash
mcdreforged -V
```

:::warn 升級的可能不是 MCDR 正在用的那一份
系統裡同時存在系統 Python、虛擬環境、pipx 環境時，`pip install -U` 升級的未必是 MCDR 實際使用的那一份——**升完 `mcdreforged -V` 還是舊版本號，通常就是這個原因**。先確認 MCDR 是怎麼啟動的（哪個直譯器、哪個環境），再在那個環境裡升級。
:::

:::note 其他安裝方式
- **pipx**：用 `pipx upgrade mcdreforged` 升級；給它裝 Python 依賴要用 `pipx inject mcdreforged <包名>`。
- **Docker**：按官方映像文件更換映像標籤，具體寫法以官方文件的 Docker 章節為準。
- **國內網路**：可以在指令裡加 `-i https://pypi.tuna.tsinghua.edu.cn/simple` 使用映像加速，這是官方文件給出的做法。
- **系統包管理器**：官方文件**非常不建議**用它安裝 MCDR，因為很難管理插件依賴。
:::

### 4.4 大版本升級前先讀遷移指引

官方文件有獨立的「遷移指引」章節，包含 **0.x 至 1.x** 與 **1.x 至 2.x** 兩部分。

大版本升級可能改變設定檔格式（舊 `config.yml` 裡的選項被改名或廢棄）、插件 API（依賴舊 API 的 MCDR 插件可能載入失敗或行為異常），以及指令與命令列介面（啟動參數、子指令可能調整）。**所以升級 MCDR 往往意味著也要更新 MCDR 插件。** 升級前讀一遍對應的遷移文件，按其中的步驟執行，不要憑記憶照抄舊教學。

### 4.5 升級前備份什麼

| 內容 | 位置 |
| --- | --- |
| MCDR 自己的配置 | `config.yml`，位於 **MCDR 的工作目錄** |
| MCDR 的插件 | 預設在 `plugins/`，實際以設定項 `plugin_directories` 為準 |
| 權限檔案與日誌 | 排查問題時有用，建議一併留檔 |

:::note MCDR 會自己補設定項
官方文件說明：啟動時 MCDR 會載入 `config.yml`，並把**缺失的選項追加**到設定檔末尾；如果設定檔不存在，則生成預設配置並退出。所以升級後配置裡多出新鍵是正常現象——但**不要**因此認為舊配置一定被正確遷移了，仍要對照遷移指引與更新日誌。
:::

MCDR 還有 `check_update` 設定項（預設 `true`），會每 24 小時檢測一次更新；執行中可以用 `!!MCDR reload config`（縮寫 `!!MCDR r cfg`）過載配置。**插件相容性才是升級 MCDR 的主要風險**，不是 MCDR 本身。

### 4.6 回滾

出問題時可以把 MCDR 固定回上一個版本：

```bash
# 先到 PyPI 的 mcdreforged 项目页确认要回退到的具体版本号
pip install mcdreforged==2.15.0
mcdreforged -V
```

- **版本號務必在 PyPI 上確認**，不要憑記憶寫；pipx 環境可以用 `pipx install --force mcdreforged==<版本>` 覆蓋安裝（具體寫法以 pipx 官方文件為準）。
- 如果升級時同時更新了 MCDR 插件，**插件也要一起回滾**，否則新插件配舊 MCDR 一樣會出錯。

## 5. 更新檢查清單

| 更新物件 | 更新前 | 更新後驗證 | 回滾方式 |
| --- | --- | --- | --- |
| **服務端核心** | 完整備份（世界 + 配置 + 插件）；確認目標版本要求的 Java；把舊 jar 改名留底；讀更新日誌 | 控制台無報錯；`/plugins` 正常；`/version` 正確；自己進服走一圈；觀察 10 到 30 分鐘 | 停服，換回舊 jar；若新版本已啟動過，**連世界一起用備份回退** |
| **插件** | 備份 `plugins/<插件名>/` 與資料庫；確認支援的服務端版本、Java 版本與前置依賴；讀更新日誌的破壞性變更 | `/plugins` 無紅字；控制台無 `NoSuchMethodError` 等異常；插件自身指令可用；相關功能點一遍 | 停服，把舊 `.jar.bak` 改回原名；配置一併回退到舊副本 |
| **模組與載入器** | 備份 `mods/` 與 `config/`；確認載入器支援目標遊戲版本；列出每個模組的目標版本 | 啟動無崩潰；日誌無模組類錯誤；客戶端能進服且無缺失模組提示 | 換回舊載入器與舊 `mods/` 目錄；客戶端同步回退 |
| **MCDR** | 記錄當前版本（`mcdreforged -V`）；備份 `config.yml` 與插件目錄；大版本先讀遷移指引 | `mcdreforged -V` 顯示新版本；MCDR 能正常啟動並拉起服務端；MCDR 插件載入正常 | `pip install mcdreforged==<旧版本>`（版本號以 PyPI 為準）；MCDR 插件同步回滾 |
| **作業系統軟體包** | 記錄當前版本；確認不在維護視窗；有條件先做系統快照或映像 | 重啟後服務端能自動起來；**確認 Java 沒有被順帶升級**；埠與防火牆規則未變 | 用發行版的版本回退或系統快照；必要時把 Java 包鎖定（例如 `apt-mark hold`） |

### 維護節奏建議

**每月一次**例行檢查核心、插件、模組、MCDR 與系統包；**安全相關的優先**（登入驗證、權限、反作弊有修復就儘快跟）；**非必要不更新**——穩定執行且沒有安全問題的版本可以不動，更新的收益要大於它帶來的風險；每次更新**留檔記錄**（什麼時候、從哪個版本到哪個版本、誰做的、有沒有回滾），下次出問題能快速回溯。

## 下一步

- 更新前必須會的備份與恢復：[備份與恢復](/tutorials/java/backup)
- 備份要送出去一份：[異地備份](/tutorials/ops/offsite-backup)
- 插件裝卸與排毒：[插件管理與排毒](/tutorials/java/plugin-manage)
- 更新完核心後適配插件與配置：[插件配置](/tutorials/java/plugin-config)
- 基岩版服務端與協議：[BDS 服務端](/tutorials/bedrock/bds)

> 各軟體的更新方式以官方文件為準。
