---
title: 單機存檔轉伺服器
slug: save-migration
cat: ops
level: 2
order: 19
minutes: 14
tags: [存檔, 遷移, level.dat, 維度, 玩家資料, 服務端, 備份, 排錯]
updated: 2026-10-04
draft: false
---

**把自己玩了幾百小時的單機存檔搬到伺服器上，是最容易"看起來成功、實際上丟東西"的操作之一。** 目錄名差一個字母，進服就是一個全新空世界；地獄和末地的資料夾沒搬，傳送門後面是一片未生成的地形；玩家資料沒改名，人進來了但背包、成就、統計全部清零。這一篇把存檔的真實結構、兩套目錄佈局、服務端到底期待什麼、以及一次可靠的遷移流程講清楚。

遷移前請先讀完 [備份與恢復](/tutorials/java/backup)：整個流程的第一步和最後一步都是備份。服務端目錄與設定檔的關係見 [服務端結構](/tutorials/java/structure) 與 [配置服務端](/tutorials/java/config)。

## 1. 先看清：單機存檔裡到底有什麼

單機存檔是 `.minecraft/saves/<世界名>/` 下的一個目錄（Windows 上通常是 `%APPDATA%\.minecraft\saves\<世界名>\`）。它不是一個整體檔案，而是**幾十到幾萬個檔案**的組合：

| 路徑 | 內容 | 說明 |
| --- | --- | --- |
| `level.dat` | 世界的全域資訊 | NBT 格式，含世界名、生成設定與種子、遊戲規則、出生點、時間、`DataVersion` 等 |
| `level.dat_old` | 上一份 `level.dat` 的備份 | 載入世界時自動產生，可以一起復制 |
| `level.dat_new` | 寫入過程中的臨時檔案 | 正常關閉後一般不存在，出現它說明上次寫入被中斷 |
| `session.lock` | 世界佔用鎖 | 1.16 起內容是一個 U+2603 字元（雪人符號）；**不要複製**，服務端會自己重建 |
| `region/` | 主世界的區域檔案 `r.<x>.<z>.mca` | 地形與方塊資料，體積最大的一部分 |
| `entities/` | 主世界的實體資料 | 1.17 起從 `region/` 中拆出來獨立存放 |
| `poi/` | 主世界的興趣點 | 1.14 起存在；村民的床與工作站、傳送門、蜂巢、磁石等 |
| `data/` | 世界級雜項資料 | 計分板、襲擊、地圖、指令儲存等 |
| `playerdata/<uuid>.dat` | 玩家資料 | 背包、位置、血量、經驗等，**檔名就是玩家 UUID** |
| `advancements/<uuid>.json` | 進度（成就） | 同樣以 UUID 命名 |
| `stats/<uuid>.json` | 統計 | 同樣以 UUID 命名 |
| `datapacks/` | 世界級資料包 | 與全域資料包不同，它跟著世界走 |
| `DIM-1/`、`DIM1/` | 地獄與末地 | 老佈局；名字來自舊版數字維度 ID（-1 與 1） |
| `dimensions/<命名空间>/<路径>/` | 自定義維度 | 1.16 起支援；26.1 起三個預設維度也搬到這裡 |
| `resources.zip` | 世界自帶資源包 | 26.1 起移入 `resourcepacks/` 子目錄 |

:::note 沒有 `DIM-1/` 不代表存檔有問題
地獄和末地的資料夾是**第一次進入那個維度時**才生成的。如果你從沒去過末地，存檔裡就不會有 `DIM1/`——這是正常的，服務端會在玩家第一次進入時自己建立。
:::

## 2. 兩套佈局：`DIM` 資料夾與 `dimensions/`

這是整個遷移裡最容易搞錯的地方，必須按版本分開看：

| 版本區間 | 主世界 | 地獄 | 末地 | 自定義維度 |
| --- | --- | --- | --- | --- |
| 1.2.1 – 1.13（Anvil 起） | 存檔根目錄（`region/`、`data/` 等） | `DIM-1/` | `DIM1/` | 不支援 |
| 1.14 – 1.15 | 同上，多出 `poi/` | `DIM-1/` | `DIM1/` | 不支援 |
| 1.16 – 26.0 | 同上，1.17 起多出 `entities/` | `DIM-1/` | `DIM1/` | `dimensions/<命名空间>/<路径>/` |
| 26.1（快照 6）及以後 | `dimensions/minecraft/overworld/` | `dimensions/minecraft/the_nether/` | `dimensions/minecraft/the_end/` | `dimensions/<命名空间>/<路径>/` |

要點：

- **老佈局（1.16 – 26.0 及更早）**：兩個預設維度用固定的目錄名 `DIM-1`（地獄，維度 ID `-1`）和 `DIM1`（末地，維度 ID `1`）。它們直接放在**存檔根目錄下**，與 `region/` 平級。
- **`dimensions/` 佈局**：1.16 引入自定義維度後，非預設維度按**資源位置**存放，即 `dimensions/<命名空间>/<路径>/`，例如 `dimensions/mydatapack/skylands/`。26.1 快照 6 重構後，**三個預設維度也改用這套佈局**，`DIM-1`/`DIM1` 不再使用。
- 同一個 26.1 存檔裡，玩家資料也從存檔根目錄移到了 `players/` 下：`players/data/<uuid>.dat`、`players/advancements/<uuid>.json`、`players/stats/<uuid>.json`。

## 3. 服務端到底期待什麼目錄

服務端在**工作目錄**（可以用 `--universe` 改基準路徑）下尋找 `server.properties` 中 `level-name` 指定的目錄，預設是 `world`。如果那個路徑存在且是一個合法世界（有 `level.dat`），就載入它；**否則服務端會在那個路徑上生成一個全新的世界**——注意，它不會報錯停下，這正是"我明明覆制了存檔，進服卻是空世界"的根源。

單機存檔把三個維度塞進一個目錄樹，而服務端預設把三個維度放在**三個平級目錄**裡：

| 單機存檔裡的東西 | 服務端裡的位置 | 說明 |
| --- | --- | --- |
| 存檔根內容：`level.dat`、`region/`、`entities/`、`poi/`、`data/`、`playerdata/`、`advancements/`、`stats/`、`datapacks/` | `world/` | 主世界，也就是 `level-name` 指向的目錄 |
| `DIM-1/` | `world_nether/` | 地獄 |
| `DIM1/` | `world_the_end/` | 末地 |
| `dimensions/<命名空间>/<路径>/` | 對應維度的目錄 | 只有服務端也裝了同一個資料包/模組時才有意義 |
| `session.lock` | 不復制 | 服務端啟動時自己重建 |
| `level.dat_old` | 隨 `level.dat` 一起進 `world/` | 只是上一份 `level.dat` 的備份，留著無害 |

目錄名不是寫死的：它由 `level-name` 加字尾推導而來。`level-name=myworld` 時通常是 `myworld/`、`myworld_nether/`、`myworld_the_end/`。

:::warn 絕對不要在服務端執行時複製存檔
服務端正在寫 `region/*.mca` 時複製，很可能拷到**寫了一半的區塊檔案**，恢復後表現為區塊缺失、方塊錯亂甚至世界無法載入；`session.lock` 也會在兩邊同時存在，導致鎖衝突。正確順序永遠是：`stop` 關服（或在控制台執行 `save-all` → `save-off`，但遷移場景**強烈建議直接停服**）→ 複製 → 再啟動。
:::

:::tip 最穩的一招：讓服務端先把目錄建出來
不要手工猜目錄名。先用目標 `level-name` 啟動一次服務端（生成空世界）→ 停服 → 觀察它實際建立了哪些目錄 → 再把存檔內容**填進這些目錄**。這樣無論核心用 `world_nether` 還是把維度放在 `world/dimensions/` 裡，你都不會填錯位置。
:::

## 4. 玩家資料：為什麼不會自動跟過去

`playerdata/`、`advancements/`、`stats/` 裡的檔名**都是玩家 UUID**。服務端載入玩家時按 UUID 找檔案，檔名不匹配就當作新玩家處理：背包空、成就零、統計零。

UUID 從哪來，取決於服務端怎麼認人：

| 場景 | UUID 來源 | 結果 |
| --- | --- | --- |
| 單機存檔 | 儲存在世界裡的本地玩家 UUID（26.1 起是 `level.dat` 的 `singleplayer_uuid`，更早版本是 `Player` 標籤），也是 `playerdata/` 裡那個檔名 | 這是"源" |
| 服務端 `online-mode=true` | 微軟/Mojang 帳號的正版 UUID | 通常與單機裡的 UUID **不同** |
| 服務端 `online-mode=false`（離線/盜版模式） | 由玩家名確定性計算：`UUID.nameUUIDFromBytes(("OfflinePlayer:" + 名字).getBytes(UTF_8))`，是一個版本 3（MD5）UUID | 與正版 UUID **不同**，而且同名玩家在任何離線服上 UUID 都一樣 |

也就是說：**除非單機世界恰好就是用同一個帳號 UUID 建立的，玩家資料都不會自動生效。**

處理辦法（按推薦順序）：

1. **先讓玩家進一次服**，讓服務端為這個 UUID 建立資料檔案，並把它寫進工作目錄的 `usercache.json`。
2. 停服，從 `usercache.json`（或 `world/playerdata/` 裡新出現的檔名）讀出**目標 UUID**。
3. 把原始檔**改名**到目標 UUID，而不是覆蓋：`playerdata/<旧UUID>.dat` → `playerdata/<新UUID>.dat`，`advancements/`、`stats/` 同理。先備份舊檔案，改錯了可以回退。
4. 遷移前**先定好 `online-mode`**：一旦確定用離線模式，就不要再改成正版模式，否則所有離線玩家換 UUID，表現就像"存檔回檔"。

同樣按 UUID 索引的還有 `ops.json` 與 `whitelist.json`：複製世界不會帶上它們，需要在服務端側重新 `/op`、`/whitelist add`（或手工按正確 UUID 編輯這兩個 JSON）。

## 5. 遷移步驟

### 5.1 遷移前先記錄

- 源存檔的**遊戲版本**（`level.dat` 裡的 `DataVersion`，或客戶端主選單的版本號）。**服務端版本不能低於存檔版本**，否則會拒絕載入；降級世界是不安全的。
- 目標 `level-name`（決定目錄名）。
- 源存檔大小：`du -sh`，確認目標磁碟裝得下並留有備份空間。
- 遷移前在世界裡記下幾個可驗證的事實：出生點座標、`/seed` 的值、某個建築的座標、地獄傳送門位置。

### 5.2 停服與備份

```bash
# 服务端侧：先安全关服
sudo systemctl stop minecraft
# 若不是 systemd 托管，就在控制台执行 stop，确认进程真的退出

# 源存档侧：先打包留底（在客户端机器上）
cd ~/.minecraft/saves
tar -czf MyWorld-20261004.tar.gz MyWorld

# 目标侧：把当前（空的或旧的）世界目录改名留底，不要直接删
cd /opt/minecraft/server
mv world world_before_migration
```

Windows 上對應的做法是在 `%APPDATA%\.minecraft\saves` 裡右鍵壓縮 `MyWorld` 資料夾。

### 5.3 複製檔案

推薦用 `rsync -a`：它能排除不需要的目錄、能續傳、也能在出錯時給出明確資訊。**源路徑結尾的 `/` 表示"複製目錄裡的內容"**，漏掉或寫錯會導致多套一層目錄。

```bash
# 主世界：排除两个维度目录和锁文件，其余全部进入 world/
rsync -a --exclude 'DIM-1' --exclude 'DIM1' --exclude 'session.lock' \
  "/home/you/.minecraft/saves/MyWorld/" /opt/minecraft/server/world/

# 地狱与末地：分别进入各自的平级目录
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM-1/" /opt/minecraft/server/world_nether/
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM1/"  /opt/minecraft/server/world_the_end/
```

如果只有少量目錄要搬，`cp -a` 更直觀。`-a` 會保留時間戳、權限與符號連結：

```bash
# 逐项拷贝（哪个不存在就跳过哪个：例如从没去过末地就没有 DIM1）
cd "/home/you/.minecraft/saves/MyWorld"
cp -a level.dat level.dat_old region entities poi data datapacks \
      playerdata advancements stats /opt/minecraft/server/world/ 2>/dev/null

cp -a DIM-1/. /opt/minecraft/server/world_nether/
cp -a DIM1/.  /opt/minecraft/server/world_the_end/
```

Windows 上用 `robocopy`（注意：`robocopy` 的退出碼 **0–7 都算成功**，`1` 表示"有檔案被複制"，別把它當失敗）：

```bat
robocopy "%APPDATA%\.minecraft\saves\MyWorld" "C:\mc\server\world" /E /XD DIM-1 DIM1 /XF session.lock
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM-1" "C:\mc\server\world_nether" /E
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM1"  "C:\mc\server\world_the_end" /E
```

複製完修正屬主（Linux 下用獨立使用者跑服務端時必做，否則會出現 `Failed to save`）：

```bash
sudo chown -R minecraft:minecraft \
  /opt/minecraft/server/world \
  /opt/minecraft/server/world_nether \
  /opt/minecraft/server/world_the_end
```

:::tip 大存檔先壓縮再傳，別在網路上慢慢拷
幾十 GB 的 `region/` 逐檔案通過網路傳輸會非常慢，而且中斷一次就要重來。更穩的做法是先在源機器上打包（`tar -czf MyWorld.tar.gz MyWorld`，區塊資料壓縮率通常不錯），傳完再解開；`rsync -az --partial` 也能提供傳輸壓縮與斷點續傳。
:::

### 5.4 修正 `level-name`

開啟服務端的 `server.properties`，確認目錄名與 `level-name` **完全一致**（Linux 區分大小寫，`MyWorld` 與 `myworld` 是兩個目錄）：

```properties
level-name=world
```

### 5.5 啟動並觀察

```bash
sudo systemctl start minecraft
# 实时看启动过程，重点找存档相关的报错
tail -f /opt/minecraft/server/logs/latest.log
# 若用 systemd 托管，stdout 在 journal 里
journalctl -u minecraft.service -f
```

啟動日誌裡要重點確認：沒有 `Failed to load`、沒有維度相關異常、`Preparing spawn area` 正常結束、沒有 `No space left on device`。

### 5.6 進服驗證

見第 10 節的驗證清單。**先別急著把伺服器開放給所有人**，用白名單只放一兩個人進去確認無誤。

### 5.7 正式遷移前先演練一次

如果這是重要的世界，**先在本地用另一個埠和一個臨時 `level-name` 起一個測試實例**，把整套流程走一遍。演練能提前暴露目錄名、版本、權限和 UUID 問題，而且完全不影響正式環境。

```properties
# 测试实例的 server.properties（放在与生产实例不同的目录里，避免互相干扰）
level-name=world_test
server-port=25566
online-mode=false
white-list=false
```

```bash
cd /opt/minecraft/testserver
java -Xms2G -Xmx2G -jar server.jar --nogui
```

演練通過之後，再對生產實例照做一遍；測試目錄用完直接整個刪掉即可。

## 6. `level.dat` 該不該動

`level.dat` 是世界的"身份證 + 設定表"，裡面裝著世界名、生成設定與種子、遊戲規則、出生點、時間、難度，以及啟用的資料包列表。它的內容是 **NBT 二進位制**，通常還經過 gzip 壓縮。

結論很簡單：**不要手工編輯它。**

- 用文字編輯器開啟會直接損壞檔案；用 NBT 編輯器改也要面對版本差異（例如 26.1 起遊戲規則、世界生成設定等已被拆到 `data/` 下）。
- 改錯了的表現是世界直接無法載入，而 `level.dat_old` 不一定能救回來。
- **絕大多數想改的東西都有正規入口**：難度、遊戲模式、視距、白名單走 `server.properties`；遊戲規則、時間、天氣、出生點、資料包走遊戲內指令（`/gamerule`、`/time set`、`/weather clear`、`/setworldspawn`、`/datapack`）。
- 注意 `level-seed` **只在世界建立時生效**，已有世界的種子不能通過改配置更換。
- 需要"看一眼裡面有什麼"時，用 NBT 檢視工具**只讀**開啟，並且先複製一份副本。

遷移場景下的正確做法是：**原樣搬運 `level.dat`，不要在遷移過程中改它**；等世界跑起來、驗證通過、備份到位之後，再通過配置和指令調整設定。

## 7. 資料包（`datapacks/`）

- 世界級資料包放在世界目錄下的 `datapacks/`（單機是 `saves/<世界名>/datapacks/`，服務端是 `world/datapacks/`），它跟著世界一起走，複製世界時會一起搬過去。
- **已啟用/已停用的列表記錄在 `level.dat` 裡**，所以搬過去之後一般無需重新啟用；用 `/datapack list` 確認，需要時用 `/datapack enable <名称>` / `/datapack disable <名称>`，改動後用 `/reload` 生效。
- **版本要匹配**：資料包聲明了目標 `pack_format`，服務端版本不對時會被拒絕載入或給出警告。
- **新增維度的資料包要特別注意**：這類世界會有 `dimensions/<命名空间>/<路径>/` 目錄，只有服務端也裝了同一個資料包，那些維度才載入得出來。資料不會因此被刪除，但玩家會進不去。
- 世界自帶的資源包（老版本是 `resources.zip`，26.1 起在 `resourcepacks/` 下）不會自動發給玩家；要讓玩家看到自定義材質，需要在 `server.properties` 裡配置 `resource-pack`。

## 8. 模組存檔、跨版本與基岩版

### 8.1 模組（Forge/NeoForge/Fabric）存檔搬到插件端

這是僅次於目錄名的第二大坑。**插件端（Spigot/Paper 等）不認識模組新增的方塊、物品與實體。**

- 模組方塊在世界裡會變成未知方塊（通常表現為空氣、石頭或佔位方塊）；這些區塊**一旦被載入並重新儲存，原始資料就可能被就地覆蓋**，事後再裝回模組也未必救得回來。
- 模組物品會從背包與容器中消失，模組實體（機器、生物）會被丟棄。
- 模組維度（`dimensions/<模组命名空间>/...`）在沒有對應模組時無法載入。

正確做法：**先備份，再在一份丟棄式的副本上載入**，數一數日誌裡出現多少未知方塊與登錄檔相關的報錯；確認損失可接受再正式遷移。如果損失不可接受，就繼續用模組端，或者乾脆重新開荒。

### 8.2 跨版本

- **存檔版本高於服務端**：服務端會拒絕載入（`DataVersion` 檢查）。唯一安全的做法是升級服務端，而不是降級世界。
- **存檔版本低於服務端**：服務端會通過資料修復（DataFixer）升級世界，通常是可行的，但**升級不可逆**：一旦被新版本載入過，舊版本就打不開了。所以升級前務必留一份沒被動過的備份。
- 跨多個大版本時逐級升級更穩（例如先 1.20 再 1.21），每升一級都驗證一遍，見 [版本更新](/tutorials/ops/updates)。

### 8.3 基岩版

Java 版世界與基岩版世界格式完全不同，**不能直接互相載入**，需要第三方轉換工具，且轉換通常有損（紅石、實體、部分方塊行為）。基岩版的服務端目錄結構見 [BDS 服務端](/tutorials/bedrock/bds)。

## 9. 常見失敗模式

| 現象 | 根本原因 | 處理 |
| --- | --- | --- |
| 進服是全新空世界 | 目錄名與 `level-name` 不一致，或該目錄裡沒有 `level.dat`，服務端於是**新建**了一個世界 | 停服，核對目錄名；把舊目錄改名留底，重新複製 |
| 世界能進，但地獄/末地是全新地形 | `DIM-1/`、`DIM1/` 沒有搬到 `world_nether/`、`world_the_end/`，或搬錯了層級（多套了一層目錄） | 停服後重新複製到正確目錄 |
| 世界能進，玩家卻"從零開始" | 玩家資料檔名（UUID）與服務端認定的 UUID 不匹配 | 按第 4 節改名 `playerdata/`、`advancements/`、`stats/` |
| 服務端拒絕載入世界 | 存檔版本（`DataVersion`）高於服務端版本 | 升級服務端；**不要**嘗試降級世界 |
| 部分區塊丟失、方塊錯亂 | 複製時服務端仍在執行，或磁碟寫滿 | 從備份重新複製；先解決磁碟空間 |
| 日誌出現 `Failed to save` | 檔案屬主/權限不對，服務端使用者寫不進去 | `chown -R` 到服務端執行使用者 |
| Linux 上"檔案明明在，服務端卻說沒有" | 大小寫不一致（`MyWorld` vs `myworld`） | 統一目錄名與 `level-name` |
| 啟動卡在 `Preparing spawn area` 很久 | 世界很大，首次載入需要時間；也可能是磁碟 I/O 瓶頸 | 耐心等待，觀察 CPU/磁碟佔用；不要反覆重啟 |
| 白名單/OP 失效 | `whitelist.json`、`ops.json` 不在世界裡，需要重建 | 重新 `/whitelist add`、`/op`，或按正確 UUID 手工編輯 |
| 遷移後頻繁卡頓 | 單機與伺服器負載模型不同（視距、模擬距離、實體數量） | 調整 `view-distance`、`simulation-distance`，見 [最佳化](/tutorials/java/optimize) |

## 10. 驗證清單

逐項確認，全部通過再對外開放：

| 檢查項 | 方法 |
| --- | --- |
| 世界目錄裡有 `level.dat` | `ls -la /opt/minecraft/server/world/level.dat` |
| 區域檔案數量與源一致 | 兩側各跑 `find world/region -name '*.mca' \| wc -l` 對比 |
| 三個世界的體積符合預期 | `du -sh /opt/minecraft/server/world*` |
| 啟動日誌無存檔錯誤 | `grep -n -i "failed\|unknown dimension\|no space" logs/latest.log` |
| 種子一致 | 遊戲內 `/seed`，與遷移前記錄的值對比 |
| 時間與遊戲規則一致 | `/time query daytime`、`/gamerule keepInventory` 等 |
| 出生點一致 | `/setworldspawn` 前先看當前出生點，與遷移前對比 |
| 關鍵建築存在 | 傳送到記錄過的座標目視確認 |
| 地獄一致 | `/execute in minecraft:the_nether run tp @s 0 64 0`，檢查已知傳送門與地形 |
| 末地一致 | 進入末地，檢查末影龍狀態、末地傳送門與返回傳送門 |
| 玩家進度回來了 | 檢查背包、經驗、進度介面與統計 |
| 權限與白名單正確 | `/whitelist list`、`/op` 檢查 |
| 服務端能寫盤 | `sudo -u minecraft test -w /opt/minecraft/server/world && echo writable` |
| 備份已經生效 | 立刻手工跑一次備份腳本，確認新世界已被納入備份範圍 |

## 11. 遷移之後

- **把 `online-mode`、白名單、正版驗證定下來**，再開始積累玩家資料；中途切換認證模式會讓 UUID 變化。
- **立刻做一次完整備份**，並把它送進異地/離線副本，見 [異地備份](/tutorials/ops/offsite-backup)。
- 按伺服器負載重設 `view-distance`、`simulation-distance`、`max-players`，單機存檔通常是在"單人視距"下生成的，搬到伺服器後可能需要重新生成周邊區塊以適配更遠的視距。
- 加上日誌輪轉與磁碟監控，避免剛搬來的大世界把磁碟寫滿，見 [日誌管理與輪轉](/tutorials/ops/logs) 與 [監控與告警](/tutorials/ops/monitoring)。
- **基岩版（BDS）另當別論**：Java 版世界與基岩版世界是兩種完全不同的格式，不能互相直接載入，需要第三方轉換工具，且轉換通常有損。基岩版的服務端目錄結構見 [BDS 服務端](/tutorials/bedrock/bds)。

## 12. 下一步

- 服務端目錄與各檔案的分工：見 [服務端結構](/tutorials/java/structure)。
- 各項設定項的含義與推薦值：見 [配置服務端](/tutorials/java/config)。
- 遷移完成後的備份與回檔：見 [備份與恢復](/tutorials/java/backup)。
- 基岩版服務端：見 [BDS 服務端](/tutorials/bedrock/bds)。

> 具體路徑與目錄佈局隨遊戲版本與核心而異，請以官方文件為準。
