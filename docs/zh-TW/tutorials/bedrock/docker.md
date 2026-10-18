---
title: 用 Docker 部署基岩版服務端
slug: docker
cat: bedrock
level: 3
order: 7
minutes: 16
tags: [Docker, compose, 基岩版, BDS, udp, deployment, 備份]
updated: 2026-10-04
draft: false
---

基岩版官方服務端是 **BDS**，它沒有插件系統、目錄結構簡單，非常適合放進容器：映像負責下載官方 BDS、接受 EULA、對映埠，你只需要維護一個卷和一個 `docker-compose.yml`。

這一篇講的是**在容器裡跑 BDS**。BDS 本身的目錄結構、記憶體特性與已知坑，見 [BDS 服務端](/tutorials/bedrock/bds)。

:::warn 先記住一件事：基岩版是 UDP
Java 版走 **TCP 25565**，基岩版走 **UDP 19132**（IPv6 為 `19133/udp`）。**只放行或只對映 TCP，表現是「伺服器明明在跑，但誰也連不上」，而且不會有任何報錯。** 這是基岩版開服最常見的坑，本文會反覆強調。
:::

## 1. 為什麼要容器化

| 收益 | 具體表現 |
| --- | --- |
| **環境乾淨** | 官方 BDS 是二進位制程式，容器把它和它的執行庫一起打包，宿主機不需要裝任何依賴 |
| **可復現** | 版本、埠、遊戲模式、難度、世界名全寫在一個檔案裡，換機器照搬即可 |
| **回滾容易** | 升級前備份 `/data`，出問題就把 `VERSION` 改回去重啟 |
| **刪除乾淨** | 不要了就刪容器與卷，宿主機上不留殘留檔案 |
| **跨平台一致** | 官方 BDS 只提供 Windows 與 Linux 版；在 Windows 上用容器跑 Linux 版 BDS，操作方式與伺服器上完全一致 |

代價同樣存在：

| 代價 | 說明 |
| --- | --- |
| **多一層要學** | 映像、容器、卷、Compose 的概念繞不開，排錯從 `docker compose logs` 開始 |
| **卷與備份紀律** | 世界存檔在卷裡，不主動備份就等於沒有備份 |
| **效能開銷小但不為零** | 網路多一層 NAT、檔案系統多一層 overlay；真正的瓶頸通常是 **BDS 的單執行緒世界模擬**，所以 CPU 限額一定要給夠 |
| **沒有插件生態** | BDS 本身不支援插件，容器也不會改變這一點；附加內容只能以行為包/資源包的形式放進資料目錄 |

## 2. 安裝 Docker 與 Compose 插件

按官方文件安裝，不要用來源不明的安裝腳本：

| 平台 | 官方入口 |
| --- | --- |
| Linux（按發行版） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux 的 Compose 插件 | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::note Windows 上的兩條路
Windows 可以下載官方壓縮包直接跑裡面的 exe（下載頁見 [Minecraft 官方 BDS 下載頁](https://www.minecraft.net/en-us/download/server/bedrock)），也可以用本文的容器方案。容器方案的好處是**與 Linux 伺服器上的操作完全一致**，將來遷移不用重學。
:::

## 3. 映像：`itzg/minecraft-bedrock-server`

社群裡常用的基岩版映像是 **`itzg/minecraft-bedrock-server`**（維護活躍，與 Java 版映像同一作者生態）。

```bash
docker pull itzg/minecraft-bedrock-server
```

:::note 它和官方下載包的關係
官方的 [BDS 下載頁](https://www.minecraft.net/en-us/download/server/bedrock) 提供壓縮包，需要你自己解壓、改配置、啟動。**社群映像做的事是：在容器啟動時替你下載官方 BDS，並把環境變數寫進 `server.properties` 等配置。**

所以：**映像下載 BDS 的具體機制（下載網址、版本解析、快取方式）以映像官方文件為準**，不同映像版本可能不同。想要完全自己控制，就用官方壓縮包按 [BDS 服務端](/tutorials/bedrock/bds) 手動部署。
:::

## 4. 一份完整的 `docker-compose.yml`

```yaml
services:
  bedrock:
    image: itzg/minecraft-bedrock-server
    container_name: mcsog-bedrock
    ports:
      - "19132:19132/udp"
      - "19133:19133/udp"
    environment:
      EULA: "TRUE"
      SERVER_NAME: "MCSOG Bedrock"
      GAMEMODE: "survival"
      DIFFICULTY: "normal"
      LEVEL_NAME: "MCSOG"
      ONLINE_MODE: "TRUE"
      TZ: "Asia/Shanghai"
    volumes:
      - mcsog-bedrock-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  mcsog-bedrock-data:
    name: mcsog-bedrock-data
```

Compose v2 **不需要**頂層 `version:` 欄位。

| 欄位 | 作用 |
| --- | --- |
| `image` | 使用的映像；正式環境建議固定標籤，不要永遠用 `latest` |
| `container_name` | 固定容器名，方便 `logs` / `attach` |
| `ports` | **`/udp` 必須寫**。`19132` 是 IPv4 主埠，`19133` 是 IPv6 埠（沒有 IPv6 客戶端可以不對映，但對映了不會有副作用） |

:::warn Docker 會繞過系統防火牆（基岩版同樣適用）
`ufw` 與 `firewalld` 的規則**對 Docker 容器對映出來的埠無效**：Docker 會把自己的 `iptables` 規則插在系統防火牆之前，所以 `ufw deny 19132/udp` 也擋不住外部訪問。

基岩版走 **UDP**，更容易被忽略，務必按下面的方式收緊：

1. **埠只綁回環**（推薦）：`-p 127.0.0.1:19132:19132/udp`，再由宿主機反向代理對外；
2. **用 `DOCKER-USER` 鏈**做來源限制；
3. 用雲廠商**安全組**兜底（這一層不受 Docker 影響）。

另外，若希望伺服器出現在**區域網路列表**裡（基岩版靠 UDP 廣播發現），`bridge` 模式做不到，需要 `macvlan` 或 `host` 網路模式。

完整說明（含網段衝突、網路模式對比、排查表）見 [用 Docker 部署 Java 版 → 網路與防火牆](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节)。
:::
| `environment` | 映像讀取的配置，見第 6 節 |
| `volumes` | `卷名:/data`。**世界、配置、附加包全在 `/data`** |
| `stdin_open: true` | 開啟標準輸入，否則無法向 BDS 控制台**輸入指令** |
| `tty: true` | 分配偽終端，配合 `docker attach` 獲得可互動的控制台 |
| `restart: unless-stopped` | 崩潰或宿主機重啟後自動拉起；手動 `docker compose stop` 後不會自動拉起 |

`volumes` 裡顯式寫 `name:` 是為了讓卷名**可預測**（否則 Compose 會加專案名字首），備份指令才不會指錯卷。

:::note `EULA=TRUE` 是法律要求
`EULA: "TRUE"` 表示**你已閱讀並同意 [Minecraft 最終使用者許可協議](https://aka.ms/MinecraftEULA)**。不設定這個變數，BDS 會啟動後立刻退出，容器就會進入重啟迴圈。
:::

:::tip 啟動前先做一次「體檢」
每次改完 compose 檔案先跑一次 `docker compose config`：埠、卷、環境變數會被展開列印出來，寫錯的地方會當場報錯。**尤其是 `/udp`，漏寫在這裡就能看出來。**
:::

```bash
docker compose config
```

## 5. 啟動、看日誌、進控制台、停止

```bash
docker compose up -d
```

第一次啟動要下載 BDS，耐心等：

```bash
docker compose logs -f
```

看到 `[INFO] Server started.` 一類的日誌就說明起來了。`Ctrl+C` 只退出日誌跟隨，不會停服。

基岩版**沒有 RCON**，所以沒有 `rcon-cli` 可用，進控制台只能用 `attach`：

```bash
docker attach mcsog-bedrock
```

attach 之後就可以像在本地視窗裡一樣輸入 BDS 指令，例如：

```text
list
say hello
save hold
save resume
stop
```

:::warn attach 的按鍵陷阱
在 `docker attach` 裡按 `Ctrl+C` 會把中斷訊號發給 BDS，**等於直接關服**（存檔可能損壞）。正確退出是 `Ctrl+P` 再 `Ctrl+Q`（detach，容器繼續執行）。需要真正關服時，輸入 `stop` 指令並等待行程退出。
:::

停止與刪除：

```bash
docker compose stop
docker compose down
```

| 指令 | 做了什麼 | 卷裡的資料 |
| --- | --- | --- |
| `docker compose stop` | 停止容器，容器還在 | 保留 |
| `docker compose start` | 啟動已停止的容器 | 保留 |
| `docker compose down` | 停止並刪除容器與網路 | 保留 |
| `docker compose down -v` | 上面全部 **加上刪除卷** | **全部丟失** |

:::danger 不要隨手加 `-v`
`docker compose down -v` 會刪掉 `/data` 卷，也就是世界存檔一起沒。只在確認要徹底重來、且已有可用備份時才用。
:::

## 6. 本文示例用到的環境變數

| 變數 | 作用 | 示例值 |
| --- | --- | --- |
| `EULA` | 聲明已同意 Minecraft EULA，未設定會啟動失敗 | `"TRUE"` |
| `SERVER_NAME` | 伺服器名稱（對應 `server-name`） | `"MCSOG Bedrock"` |
| `GAMEMODE` | 預設遊戲模式 | `"survival"` / `"creative"` |
| `DIFFICULTY` | 遊戲難度 | `"normal"` / `"peaceful"` |
| `LEVEL_NAME` | 世界（關卡）名稱，**同時決定 `worlds/` 下的資料夾名** | `"MCSOG"` |
| `ONLINE_MODE` | 是否校驗 Xbox Live 帳號 | `"TRUE"` / `"FALSE"` |
| `TZ` | 容器時區，影響日誌時間 | `"Asia/Shanghai"` |
| `VERSION` | 指定 BDS 版本；不寫通常跟隨最新 | `"LATEST"` |
| `SERVER_PORT` | IPv4 監聽埠（預設 19132） | `"19132"` |
| `SERVER_PORT_V6` | IPv6 監聽埠（預設 19133） | `"19133"` |
| `MAX_PLAYERS` | 最大玩家數 | `"20"` |
| `VIEW_DISTANCE` | 視距 | `"12"` |
| `LEVEL_SEED` | 世界種子 | 數字或字串 |
| `ALLOW_LIST` | 是否啟用白名單 | `"true"` / `"false"` |

:::note 預設值會變
表中括號裡的預設值對應 BDS 的常見預設配置，**映像版本更新後可能調整，務必以映像官方文件為準**。正式環境的原則是：**關鍵項一律顯式寫出來**，不要依賴預設值。
:::

:::warn 非 ASCII 伺服器名
`SERVER_NAME` 支援中文，但部分舊客戶端會顯示成亂碼。玩家回饋亂碼時，先換回純 ASCII 名稱排查。`LEVEL_NAME` 也建議用 ASCII：它會變成目錄名，特殊字元會帶來不必要的麻煩。
:::

## 7. `/data` 裡有什麼

| 路徑 | 內容 |
| --- | --- |
| `/data/worlds/<LEVEL_NAME>/` | **世界存檔**（`db/`、`level.dat`、`level_name.txt` 等） |
| `/data/server.properties` | 伺服器配置（埠、難度、模式、白名單開關等） |
| `/data/allowlist.json` | 白名單資料 |
| `/data/permissions.json` | 管理員（OP）資料 |
| `/data/valid_known_packs.json` | 已知附加包列表 |
| `/data/behavior_packs/`、`/data/resource_packs/` | 行為包與資源包（附加內容的落地位置） |

BDS 的存檔**全部在 `worlds/` 下**，每個世界一個子目錄。`LEVEL_NAME` 寫什麼，目錄就叫什麼：

```text
/data/worlds/MCSOG/db/
```

:::warn 改 `LEVEL_NAME` 等於換世界
`LEVEL_NAME` 變了，BDS 會去找新名字的目錄；找不到就**生成一個全新的空世界**，舊世界看起來「消失了」（其實還在卷裡）。改這個名字之前先確認存檔目錄名。
:::

## 8. 備份與恢復

備份物件是 `/data`，重點是 `/data/worlds/`。最穩的做法是**停服再打包**：

```bash
mkdir -p backups
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/mcsog-bedrock-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker compose start
```

Windows PowerShell 下把掛載路徑換成 `-v "${PWD}\backups:/backup"`（Docker Desktop）。

不能停服時，BDS 提供了自己的存檔一致性指令（需要在 `docker attach` 的控制台裡輸入）：

```text
save hold
save query
```

`save hold` 讓服務端暫停寫入並保持檔案一致，`save query` 列出當前需要備份的檔案。複製完成後恢復：

```text
save resume
```

:::note 為什麼基岩版不能照抄 Java 版的做法
Java 版用 `save-all` / `save-off` / `save-on`，基岩版 BDS 用的是 **`save hold` / `save query` / `save resume`**，兩套指令不通用。停服備份則兩者都適用，也最省心。
:::

恢復時先停容器，清空卷再解包：

```bash
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-bedrock-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn 容器不是備份
卷和容器在同一塊磁碟上，誤刪卷、磁碟損壞、勒索軟體會一起帶走。至少保留一份**離線或異地**的副本，見 [備份與恢復](/tutorials/java/backup) 與 [異地備份](/tutorials/ops/offsite-backup)。**沒驗證過恢復的備份不算備份。**
:::

## 9. 更新映像與 BDS 版本

```bash
docker compose pull
docker compose up -d
```

順序依舊是：**先備份，再 pull，再 up**。

| 變更 | 會發生什麼 | 注意事項 |
| --- | --- | --- |
| `docker compose pull` | 拉取映像新版本 | 拉完必須 `up -d` 才會重建容器並生效 |
| 改 `VERSION` | 映像重新下載對應版本的 BDS | 客戶端與 BDS 版本需要匹配；升級前備份存檔 |
| 不寫 `VERSION` | 通常跟隨最新 BDS | 方便，但**不可復現**；出問題時無法確定是版本變了還是配置變了 |

:::note 版本不匹配是最常見的「連不上」
基岩版客戶端與 BDS 版本不匹配時，玩家通常**能看到伺服器但進不去**。固定 `VERSION` 可以讓每次重啟都拿到同一版本；要跟隨最新，就接受「某次重啟後版本變了」這件事，並提前通知玩家。
:::

## 10. 附加內容：BDS 沒有插件系統

BDS 只支援官方的**行為包（behavior packs）與資源包（resource packs）**，沒有 Bukkit 那樣的插件體系，容器也不會改變這一點。需要插件能力時，要換第三方服務端，見 [BDS 服務端](/tutorials/bedrock/bds) 與 [第三方服務端方案](/tutorials/bedrock/third-party)。

附加內容放法：

| 內容 | 放置位置 |
| --- | --- |
| 行為包 | `/data/behavior_packs/` |
| 資源包 | `/data/resource_packs/` |
| 世界專屬的包 | `/data/worlds/<LEVEL_NAME>/` 下對應目錄 |

**方式 A：繫結掛載（改檔案最方便）**

```yaml
    volumes:
      - ./data:/data
```

之後直接在宿主機上操作 `./data/behavior_packs/`。

**方式 B：拷進卷裡**

```bash
docker cp ./MyAddon.mcpack mcsog-bedrock:/data/
docker compose restart
```

改完配置或換包之後，**重啟容器最穩**：

```bash
docker compose restart
```

## 11. 效能與記憶體：基岩版特有的兩點

### 11.1 世界模擬是單執行緒的，別把 CPU 掐太死

BDS 的生物運算與世界模擬基本是單執行緒的，**流暢度取決於單核效能**，地圖越大越吃力。容器本身的開銷很小，但**給容器設一個過低的 CPU 配額，會讓服務端直接餓死**：表現為 TPS 掉、玩家卡頓、區塊載入緩慢。

```yaml
    cpus: "2.0"
```

:::warn 不要為了「省資源」而限制 CPU
除非你明確知道這台機器上還跑著什麼、並且做了壓測，否則**不要給 BDS 容器設 CPU 上限**（例如 `cpus: "0.5"`）。BDS 的單執行緒特性決定了它對單核頻率和「隨時可用的一個核」非常敏感。相關調優見 [效能最佳化](/tutorials/java/optimize)。
:::

記憶體方面：

```yaml
    mem_limit: "4g"
```

`mem_limit` 是硬上限，**設得比實際需要還低，容器會被 OOM 殺掉**（表現是服務端毫無徵兆地重啟）。不確定就先不設上限，用 `docker stats` 觀察實際佔用後再定。

:::warn 不要強行清理記憶體
BDS 的記憶體佔用會隨時間緩慢增長，**不要用工具強行清記憶體**：會導致玩家下載材質包/附加包時進度條卡住。**正確的處理方式是重啟服務端**，這一點與 [BDS 服務端](/tutorials/bedrock/bds) 的說明一致。
:::

## 12. 故障排查

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| 容器**迴圈重啟** | EULA 未同意、`LEVEL_NAME` 含非法字元、埠被佔用、記憶體不足、`VERSION` 無效 | 先看 `docker compose logs --tail=200`，日誌第一屏通常會直接點出原因 |
| 伺服器在跑，但**誰都連不上** | 只對映/放行了 TCP；安全組沒放行 **UDP** | `ports` 寫 `"19132:19132/udp"`，並在**雲安全組**放行 UDP 19132。系統防火牆對容器無效，見上方警告 |
| 區域網路能連，公網不能 | 埠對映/安全組問題 | 見 [部署到可存取環境](/tutorials/java/deploy) 與 [路由器與防火牆](/tutorials/ops/router-firewall) |
| 世界「不見了」，生成了新地圖 | 改了 `LEVEL_NAME`，或掛載錯了卷 | 把 `LEVEL_NAME` 改回原來的名字；確認掛的是同一個卷 |
| 玩家能看到伺服器但進不去 | 客戶端與 BDS 版本不匹配，或白名單/線上驗證攔截 | 固定 `VERSION`，檢查 `ALLOW_LIST` 與 `ONLINE_MODE` |
| 容器寫不了 `/data`（Linux 繫結掛載） | 宿主機目錄屬主與容器內使用者不一致 | 修正目錄屬主；必要時使用映像文件給出的使用者對映方式 |
| 服務端莫名重啟 | 記憶體硬上限過低觸發 OOM | 提高或取消 `mem_limit`，用 `docker stats` 觀察 |
| 控制台打不了字 | 少了 `stdin_open: true` 與 `tty: true` | 補上並重建容器 |

日常巡檢（容器狀態、CPU/記憶體佔用、磁碟餘量）建議配合 [監控與告警](/tutorials/ops/monitoring) 一起做。

## 13. 下一步

- BDS 的目錄結構與已知坑： [BDS 服務端](/tutorials/bedrock/bds)
- 官方 BDS 下載與說明： [Minecraft 官方 BDS 下載頁](https://www.minecraft.net/en-us/download/server/bedrock)
- 基岩版的核心選擇： [服務端類型](/tutorials/bedrock/type)
- 存檔備份的通用方法： [備份與恢復](/tutorials/java/backup)
- 多台服務端統一管理： [面板管理工具的使用與安全](/tutorials/ops/panels)

---

> 映像名稱、環境變數與預設埠以映像官方文件為準。
