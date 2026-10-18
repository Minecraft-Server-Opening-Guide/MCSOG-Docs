---
title: 基岩版第三方核心上手
slug: third-party-setup
cat: bedrock
level: 3
order: 6
minutes: 13
mc: ["1.21.x"]
tags: [基岩版, nukkit, powernukkitx, pocketmine, php, 上手]
updated: 2026-10-04
draft: false
---

[第三方核心（Nukkit / PNX / PMMP）](/tutorials/bedrock/third-party) 那一篇講的是"選哪個"。這一篇講"選完之後怎麼讓它跑起來"：要準備什麼、目錄長什麼樣、啟動腳本怎麼寫、插件放哪裡，以及最容易翻車的那一步——**核心構建版本與基岩版協議版本對不上**。

## 一、動手之前：先確認三件事

| 要確認的 | 說明 |
| --- | --- |
| **核心家族** | Nukkit 系是 **Java** 程式，PocketMine-MP 是 **PHP** 程式。選錯家族，後面的執行環境全都要重來 |
| **執行環境** | Nukkit 系裝 **Java**；PMMP 裝 **PHP**。兩者互不替代 |
| **版本對齊** | 核心構建必須**對得上你要連的基岩版協議版本**，否則客戶端直接連不上 |

### Java 環境（Nukkit 系）

Nukkit 系和 Java 版服務端一樣是 Java 程式，按 Java 版的思路裝即可，見 [環境準備（Windows 與 Linux）](/tutorials/java/environment)。

兩個要點：

- **版本要夠**：新分支通常要求較新的 Java（常見是 Java 17 及以上），裝太舊會直接啟動失敗，報錯資訊裡一般會寫清楚要求。
- **位數要對**：64 位系統配 64 位 Java。裝成 32 位會因為記憶體上限在啟動或執行中途崩掉。

### PHP 環境（PocketMine-MP）

PMMP 需要 **PHP**，而不是 Java。

:::tip 用 PMMP 打包的 PHP，別自己拼環境
PHP 官網提供的是**純淨版**，預設不帶 PMMP 需要的那些擴充；自己逐個補依賴非常麻煩，而且版本一多就容易亂。**推薦直接下載 PMMP 官方為各系統打包好的 PHP 執行時**（在其 GitHub Releases 裡按你的作業系統取對應檔案），解壓即用。
:::

:::warn 不要用系統自帶的 PHP
Linux 發行版倉庫裡的 PHP 版本往往偏舊，Windows 上也可能裝著別的軟體留下的 PHP。先把 `php -v` 的輸出確認一遍，確保你啟動伺服器時用的是**你打算用的那一個**。
:::

## 二、目錄結構：Nukkit 系 vs PocketMine-MP

### Nukkit 系

首次啟動後，根目錄大致是這樣（不同分支會略有差異）：

| 檔案 / 目錄 | 作用 |
| --- | --- |
| `nukkit-1.0-SNAPSHOT.jar` 一類 | **核心程式本體**，啟動的就是它 |
| `start.bat` / `start.sh` / `start.command` | 啟動腳本，分別對應 Windows / Linux / macOS |
| `server.properties` | 主要設定檔：伺服器名、埠、最大人數、遊戲模式等 |
| `permissions.yml` | 權限定義 |
| `ops.txt` | 管理員（OP）名單 |
| `whitelist.txt` | 白名單名單（在 `server.properties` 裡開啟白名單後才生效） |
| `banned-players.txt` / `banned-ips.txt` | 封禁的玩家與 IP |
| `rcon_password.txt` | RCON 遠端控制密碼 |
| `worlds/` | **世界存檔總目錄**，每個世界一個子資料夾 |
| `plugins/` | **插件目錄**，放 `.jar` |
| `logs/` | 執行日誌 |

世界目錄 `worlds/<世界名>/` 內部：

| 檔案 / 目錄 | 內容 |
| --- | --- |
| `level.dat` | 世界的基本設定 |
| `region/` | **區塊資料**（地形、建築，體積最大） |
| `entities/` | 實體資料 |

:::warn 存檔就備 `worlds/`
和 BDS 一樣，基岩版的存檔是**整體**的。備份時把整個 `worlds/` 一起拷走，別隻挑 `region/`。
:::

### PocketMine-MP

PMMP 的目錄思路類似，但檔案形態不同：

| 檔案 / 目錄 | 作用 |
| --- | --- |
| `PocketMine-MP.phar` | **核心程式本體**（`.phar` 是 PHP 的打包格式） |
| PHP 執行時 | 啟動器與 `php` 可執行檔案；用官方打包版時就在同一目錄下 |
| `start.bat` / `start.sh` | 啟動腳本 |
| `server.properties` | 主要設定檔 |
| `pocketmine.yml` | PMMP 自身的配置 |
| `plugins/` | **插件目錄**，放 `.phar` |
| `worlds/` | 世界存檔總目錄 |
| `players/` | 玩家資料 |
| `logs/` | 執行日誌 |

### 兩邊對照

| | Nukkit 系 | PocketMine-MP |
| --- | --- | --- |
| 核心檔案 | `.jar` | `.phar` |
| 執行環境 | Java | PHP |
| 插件副檔名 | `.jar` | `.phar` |
| 插件目錄 | `plugins/` | `plugins/` |
| 世界目錄 | `worlds/` | `worlds/` |
| 主配置 | `server.properties` | `server.properties` |
| 管理員名單 | `ops.txt` | 由核心配置與指令管理 |
| 世界內部結構 | `level.dat` + `region/` + `entities/` | `level.dat` + `region/` + `entities/` |

:::note 共同的坑：路徑別帶中文和空格
無論哪個核心，服務端目錄都建議放在**純英文、無空格**的路徑下。中文路徑在部分分支與面板上會導致世界或插件讀取失敗，報錯還往往很難懂。
:::

## 三、啟動服務端

### Nukkit 系

最小可用的啟動指令就是一條 `java -jar`：

```bat
@echo off
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
pause
```

Linux / macOS 下等價寫法：

```sh
#!/bin/sh
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
```

說明：

- `-Xms` 是初始堆記憶體，`-Xmx` 是最大堆記憶體；**兩者建議設成同一個值**，避免執行中反覆擴充。
- `-Xmx` 不要超過機器物理記憶體，否則系統會開始用交換分區，反而更卡。
- Windows 下 `.bat` 末尾加 `pause`，崩了之後視窗不會立刻消失，你才有機會看到報錯。

### PocketMine-MP

```bat
@echo off
php PocketMine-MP.phar
pause
```

Linux / macOS 下：

```sh
#!/bin/sh
./bin/php7/bin/php PocketMine-MP.phar
```

說明：

- 具體路徑取決於你用的是官方打包的 PHP 還是自己裝的環境。**先用 `php -v` 確認能調到**，再寫進腳本。
- 記憶體上限不靠命令列參數，而是在 `pocketmine.yml` 與 `server.properties` 裡配置。

:::tip 首次啟動看什麼
第一次啟動會生成設定檔與世界。啟動完成後注意兩件事：**控制台有沒有報錯**，以及**目錄裡有沒有真的多出 `plugins/` 和 `worlds/`**。如果目錄沒生成，說明核心沒跑起來，別急著裝插件。
:::

:::warn 記憶體別一次給滿
新服還沒人，先把 `-Xmx` 設小一點（比如 2G），等玩家上來了再調。一次給到物理記憶體的上限，會讓系統和核心搶記憶體。
:::

## 四、插件放哪、怎麼載入

1. 從插件的發佈頁下載對應版本的檔案：Nukkit 系要 `.jar`，PMMP 要 `.phar`。
2. 放進服務端根目錄的 `plugins/`。
3. **重啟服務端**。
4. 看控制台輸出，確認插件被載入、沒有報錯。
5. 有些插件首次載入後會生成自己的配置目錄 `plugins/<plugin-name>/`，改完配置再重啟一次。

關於過載：

- 大多數插件支援一條過載指令，但**過載不等於重啟**。改了核心配置、換了插件版本、或者插件之間互相註冊了事件時，過載經常留下舊狀態，出現"明明改了卻沒生效"甚至直接報錯。
- 結論：**改配置可以過載，裝/刪/換插件一律重啟**。

:::warn 別把 Java 版插件塞進來
Nukkit 系的 `.jar` 與 Java 版（Paper / Spigot）的 `.jar` 是兩套完全不同的東西，**互不通用**。從插件站下載時先確認它標註的是 Nukkit / PNX 還是 Paper，裝錯了核心通常只會報一句"無效的插件檔案"。
:::

## 五、最容易翻車的一步：版本對齊

這是基岩版比 Java 版嚴格得多的地方，單獨拎出來講。

基岩版客戶端**自動更新**，玩家沒法像 Java 版那樣留在舊版本。所以：

- 你的核心構建必須**支援當前基岩版的協議版本**，否則玩家會看到"過舊的伺服器"一類的提示，直接連不上。
- 核心版本對了，插件還要對：插件是跟著核心的 API 走的，**核心一升級，舊插件可能立刻失效**。
- 因此第三方核心的升級是**成套**的：核心 + 插件 + 配置一起換，不能只換其中一樣。

排查連不上的順序：

| 現象 | 先查什麼 |
| --- | --- |
| 提示伺服器版本過舊 | 核心構建是否支援當前基岩版協議 |
| 客戶端卡在"正在連線" | 埠是否開放、`server.properties` 裡的埠與轉發是否一致 |
| 能進服但插件沒反應 | 插件是否載入、版本是否匹配核心 |
| 進服後立刻被踢 | 白名單是否開啟、是否被 `banned-*` 記錄 |

:::tip 升級前先備份
第三方核心的**存檔相容性不如官方 BDS**。換核心或升級大版本前，先把整個 `worlds/` 和 `plugins/` 裡的配置備份出來，見 [備份與恢復](/tutorials/java/backup)。
:::

## 六、上手檢查清單

- [ ] 執行環境裝好並能在命令列呼叫（`java -version` / `php -v`）
- [ ] 核心構建與目標基岩版協議版本一致
- [ ] 目錄路徑為純英文、無空格
- [ ] 啟動腳本記憶體參數合理
- [ ] 首次啟動生成 `plugins/` 與 `worlds/`，控制台無報錯
- [ ] 插件副檔名與核心家族匹配
- [ ] `worlds/` 已納入備份計劃

## 下一步

- 目錄與檔案細節：見 [BDS 服務端](/tutorials/bedrock/bds)
- 協議與版本關係：見 [基岩版協議與版本](/tutorials/bedrock/protocol)
- 回到選型：見 [基岩版核心選擇](/tutorials/bedrock/cores)

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
