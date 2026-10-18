---
title: 實體與掉落物堆積導致的卡頓
slug: entity-lag
cat: faq
level: 2
order: 4
minutes: 16
tags: [java, faq, lag, entity, item, hopper, tps, spark]
updated: 2026-10-04
draft: false
---

伺服器 TPS 從 20 掉到個位數，`/spark tps` 顯示 MSPT 長期高於 50 ms，但 CPU 佔用不高、記憶體也沒爆——這類卡頓大機率不是機器不夠，而是**實體（entity）與方塊實體（block entity）堆積**。

實體類卡頓有兩個特點：它**不怎麼吃記憶體，卻實打實吃主執行緒 CPU**；而且**重啟只能緩解幾分鐘**，只要產生源還在，堆積馬上回來。本篇按「為什麼卡 → 掉落物 → 生物 → 漏斗 → 怎麼查 → 誤區」的順序講。

:::note 適用範圍
本篇以 Java 版服務端為主（原版 / Spigot / Paper 系）。文中出現的配置鍵都會標明它屬於哪個檔案；**不同核心、不同版本的結構與預設值會變**，動手前請先看你本地生成的那份設定檔。
:::

## 1. 為什麼實體是效能殺手

### 1.1 一切都在主執行緒上排隊

Minecraft 服務端的主邏輯是**單執行緒 tick 迴圈**：每秒跑 20 個 tick，一個 tick 的預算是 **50 ms**（也就是常說的 MSPT）。所有世界、所有實體、所有方塊實體的運算都要在這條執行緒上排隊做完。

```
1 秒 = 20 tick，每 tick 预算 50 ms
MSPT 40 ms  → TPS 20（健康）
MSPT 60 ms  → TPS 掉到 16 左右（开始卡）
MSPT 200 ms → TPS 5（基本玩不动）
```

所以「實體多」之所以致命，是因為它**直接消耗這條唯一執行緒的時間預算**。CPU 有多少核、記憶體給多大，都救不回主執行緒（詳見 [效能最佳化](/tutorials/java/optimize)）。

### 1.2 每 tick 每個實體都在做什麼

一個實體每 tick 通常要經過這些環節：

- **AI 與目標選擇**：goal selector、尋路（pathfinding）、感測器（sensor）掃描；
- **物理與碰撞**：重力、移動、與其他實體和方塊的碰撞檢測；
- **計時器**：著火、藥水效果、消失（despawn）倒計時；
- **合併檢查**：掉落物與經驗球要檢查附近有沒有同類可以合併；
- **追蹤與同步**：判斷哪些玩家需要收到它的位置更新。

生物類實體在這些項裡佔得最多（尤其是尋路和感測器）；掉落物單體的開銷小得多，但**數量可以輕鬆上萬**——這就是「一個區塊幾千個掉落物」比「幾十只殭屍」更致命的原因。

### 1.3 分類：什麼在 tick，什麼不在

| 類別 | 每 tick 是否運算 | 說明 |
| --- | --- | --- |
| 生物 / 動物 / 怪物 | 是 | 開銷最大的一類：AI、尋路、感測器、碰撞 |
| 掉落物（物品實體） | 是 | 單體便宜，但會堆積到極大量；帶消失倒計時與合併檢查 |
| 經驗球 | 是 | 與掉落物類似；核心通常提供限制合併的選項 |
| 彈射物（箭、三叉戟、雪球、火球、末影珍珠） | 是 | 純物理運算；`spigot.yml` 裡有 `arrow-despawn-rate`、`trident-despawn-rate`（Paper 官方文件當前列為 1200） |
| 礦車 / 船 | 是 | 實體 + 碰撞 + 乘客邏輯；漏斗礦車還會搬運物品 |
| 展示框 / 畫 / 拴繩結等懸掛實體 | 是（低頻） | `spigot.yml` 的 `hanging-tick-frequency`（Spigot wiki 記錄預設 100）控制它們的更新間隔 |
| 盔甲架 / 標記（marker） | 是 | 兩者都是實體；Paper 的 `paper-world-defaults.yml` 裡有 `entities.armor-stands.tick`、`entities.markers.tick`（當前預設均為 `true`），可關閉以省開銷 |
| 刷怪籠 | 是 | 方塊實體，每 tick 計算可刷怪區域 |
| 漏斗 | 是 | 方塊實體，經典的效能殺手，見第 4 節 |
| 熔爐 / 高爐 / 煙燻爐 | 僅在燃燒工作時 | 閒置的熔爐沒有每 tick 邏輯 |
| 箱子 / 木桶 / 潛影盒 | 否（本身不 tick） | 純容器沒有每 tick 的方塊實體邏輯，被開啟或被漏斗訪問時才產生開銷 |
| 指令方塊 | 否（僅被觸發時） | 閒置不運算 |

:::warn 「容器方塊」不等於「一直在算」
最容易搞混的一點：**箱子、熔爐這類"容器方塊"本身並不會每 tick 運算**，真正每 tick 運算的是掛在方塊上的**方塊實體（block entity）**，而且只有帶 ticker 的那些（漏斗、刷怪籠、燃燒中的熔爐）才吃 CPU。所以「箱子裡東西多」不卡，「漏斗鏈又長又閒」才卡。
:::

### 1.4 區塊載入與區塊 tick 不是一回事

實體只在**正在 tick 的區塊**裡運算，而"被載入"的區塊不一定在 tick。Paper 的 `/paper chunkinfo` 會把當前區塊分成幾類（定義見 Paper 官方指令文件）：

| 類型 | 含義 |
| --- | --- |
| Entity Ticking | 完整 tick：實體、方塊、刷怪都在跑 |
| Block Ticking | 俗稱 lazy chunk：方塊邏輯在跑，但實體不 tick |
| Full | 俗稱 border chunk：不 tick，但方塊與實體可訪問 |
| Inactive | 不可訪問，只在做區塊生成 |
| Total | 以上總和 |

這解釋了兩個常見現象：

- **遠處的生物不一定卡服**：它們所在區塊可能只是 Block Ticking 或 Full，實體根本沒被 tick；
- **載入不等於運算**：`/paper holderinfo` 顯示的是記憶體中持有的區塊數量，與 CPU 上的 tick 負載不是一回事。

:::note 掉落物不會自己載入區塊
嚴格來說，掉落物本身**不會**把區塊"載入"起來——原版裡維持區塊載入的是玩家、出生點區塊、傳送門、`/forceload` 與插件。但只要那片區塊因為上述原因保持載入，裡面的掉落物就會一直 tick、一直堆積。
:::

### 1.5 實體啟用範圍（activation range）

為了不讓"載入著但身邊沒人"的實體白吃 CPU，Spigot 系引入了**實體啟用範圍**：超出這個距離的實體**不是不載入，而是降低 tick 頻率**。

Paper 官方文件對 `spigot.yml` 中 `entity-activation-range` 的說明是：實體正常 tick 的、與玩家的距離（單位方塊）；超出該範圍後實體 tick 的頻率會降低；設為 0 或更小則關閉該分類的節流，讓已載入實體無論多遠都正常 tick。

Paper 文件當前列出的結構如下（**預設值隨版本變化，請以你本地檔案為準**）：

```yaml
# spigot.yml → world-settings.default
entity-activation-range:
  animals: 32
  monsters: 32
  raiders: 64
  misc: 16
  water: 16
  villagers: 32
  flying-monsters: 32
  wake-up-inactive:
    animals-every: 1200
    animals-for: 100
    animals-max-per-tick: 4
    monsters-every: 400
    monsters-for: 100
    monsters-max-per-tick: 8
    villagers-every: 600
    villagers-for: 100
    villagers-max-per-tick: 4
    flying-monsters-every: 200
    flying-monsters-for: 100
    flying-monsters-max-per-tick: 8
  villagers-work-immunity-after: 100
  villagers-work-immunity-for: 20
  villagers-active-for-panic: true
  tick-inactive-villagers: true
  ignore-spectators: false
```

兩個必須知道的代價：

- `tick-inactive-villagers`（Paper 文件當前預設 `true`）如果關掉，**村民不會按原版工作**，玩家得守在附近才會補貨；
- `wake-up-inactive` 決定"睡著的"實體多久被喚醒一次，調得太吝嗇會讓機器與農場行為明顯異常。

結合 [生電與紅石](/tutorials/java/redstone)：**生電服請謹慎動這裡**，或者乾脆改用 Fabric / Leaves。

## 2. 掉落物堆積

### 2.1 常見成因

- **農場沒有擊殺與收集閉環**：刷怪塔把掉落物直接丟在地上；
- **仙人掌 / 甘蔗 / 自動農場把產物吐在地上**；
- **玩家隨手丟東西**：整理背包、死亡掉落、搬家扔垃圾；
- **TNT / 沙子複製機**這類複製裝置產生的實體；
- **漏斗線斷了**：目標箱子滿了、漏斗被堵住、區塊解除安裝導致物品卡在半路，上游卻還在持續產出；
- **`/give` 濫用或指令方塊迴圈發物品**；
- **農場通宵執行**：出生點區塊、`/forceload`、插件強制載入的區塊裡，機器在無人時也照跑。

### 2.2 為什麼掉落物這麼傷

- **單體便宜，數量可怕**：一個區塊幾千個掉落物，疊加起來就是可觀的 MSPT；
- **合併遠沒有想像中積極**：原版物品只有在很近的距離內才會合併；Paper 的 `entities.behavior.only-merge-items-horizontally`（當前預設 `false`）控制是否只合並同一高度上的物品，設為 `true` 可避免一些視覺異常，但**合併會更少**；
- **每個掉落物都要 tick**：物理、消失倒計時、合併檢查一樣不少；
- **漏斗要掃描它們**：漏斗上方的掉落物是漏斗持續工作的來源之一（見第 4 節）；
- **玩家靠近時被吸進背包**，帶來額外的物品欄與網路開銷；
- **存檔也會變大**：實體要寫進區塊存檔，量大時儲存時間與存檔體積都會上升。

### 2.3 診斷

先用**能看到數量**的手段，而不是憑感覺：

| 手段 | 用途 |
| --- | --- |
| `/paper entity list minecraft:item` | Paper 指令，列出當前 tick 的實體，輸出形如 `Total Ticking: N, Total Non-Ticking: M`，並按類型給出（ticking 數, 非 ticking 數）。掉落物大量出現在非 ticking 一側，說明它們在啟用範圍外被節流——總量仍然值得關注 |
| `/spark tps`、`/spark health` | 先判斷"是不是真的卡"、卡在 TPS 還是記憶體/磁碟 |
| `/spark profiler start --timeout 60` | 取樣後看呼叫樹裡 `ItemEntity.tick`、`Entity.tick` 的佔比 |
| `/spark tickmonitor --threshold-tick 100` | 只報告超過 100 ms 的 tick，配合現場操作定位 |
| `/paper chunkinfo` | 看各世界載入區塊的類型分佈，判斷是"載入太多"還是"實體太多" |
| `/forceload query` | 查有哪些區塊被強制載入（這類區塊裡的農場最容易失控） |
| `/debug start` / `/debug stop` | 原版自帶的效能取樣，生成 debug profile |

spark 的完整用法與讀圖方法見 [用 spark 分析效能](/tutorials/ops/spark)。

**`/kill @e[type=item]` 是把鈍器**，只在應急時用：

```bash
# 清理当前已加载区块内的全部掉落物
/kill @e[type=item]

# 限定范围：以执行者为中心 64 格内
/kill @e[type=item,distance=..64]
```

:::warn 清理掉落物是不可撤銷的
它會**無差別刪除地上的所有物品**：玩家剛丟下的、農場正在收集的、死亡掉落的裝備，全都沒了，且無法恢復。**玩家線上時不要隨手全服執行**；更不要把它當長期方案——半小時後地上又是一片。
:::

**怎麼定位"某一個區塊裡有幾千個實體"？** 實體總數只告訴你"多"，不告訴你"在哪"。可以按這個順序找：

1. 先用 `/paper chunkinfo` 排除"區塊載入過多"這一類原因；
2. 再用 spark 取樣，對比不同世界、不同區域的熱點，或開著 `/spark tickmonitor --threshold-tick 100` 跑到可疑區域，看 tick 是否明顯變長；
3. 用 `@e` 選擇器做範圍計數：站到可疑位置執行 `/execute if entity @e[type=item,distance=..16]`，從指令回饋的成功次數判斷數量級（不同版本的回饋格式不同，以實際輸出為準）；
4. 需要長期盯著看時，用能按區塊列出實體數量的插件或面板工具。

:::tip timings 是老版本的事
舊版 Paper 的效能報告是 **timings**。Paper 官方文件現在把 `/tps`、`/mspt` 歸入"已被 `/spark` 取代"的範疇——**能用 spark 就用 spark**，報告口徑統一，也更容易對比。
:::

### 2.4 處理

**第一步永遠是改設計，而不是改配置。** 讓農場形成閉環：擊殺室 + 水流或漏斗礦車收集 + 直接進箱子，產物不再落地。

**第二步才是配置與插件。**

**掉落物存活時間**：原版機制是掉落物約 5 分鐘（6000 tick）後消失。多數核心允許調整這一時長，甚至按物品類型單獨設定，但**鍵名、所在層級與預設值因核心與版本而異**，請以你本地生成的設定檔與官方文件為準。

**定時清理插件**（社群常見的如 ClearLag 一類）。選型與配置時重點確認：

- **清理間隔**：多久清一次（常見 5~10 分鐘）；
- **清理物件**：只清 `item`，還是連經驗球、彈射物、怪物一起清（後者更容易誤傷）；
- **提前公告**：清理前給倒計時提示，避免玩家正在撿東西時被清；
- **保護規則**：跳過有自定義名稱的物品、跳過玩家死亡掉落、跳過指定世界或指定區域（產物收集區尤其要排除）；
- **相容性**：確認插件支援你的核心與遊戲版本（見 [插件入門](/tutorials/java/plugins)）。

**合併半徑 `merge-radius`**：這是 Spigot / Paper 系真實存在的鍵，位於 `spigot.yml` 的 world-settings 下，分物品與經驗球兩項。Paper 官方文件當前列出的結構是：

```yaml
# spigot.yml → world-settings.default
merge-radius:
  item: 0.5
  exp: -1
```

需要注意**兩處權威文件並不一致**：Spigot wiki 對同一組鍵記錄的預設值是 item 2.5 / exp 3.0，並把它描述為"物品/經驗球在地面上合併的範圍"；Paper 官方文件對 exp 的說明則是"在生成瞬間合併，原版沒有這個行為，設為 0 或更小即關閉"。

:::tip 預設值不一致正是要你查本地檔案的原因
同一個鍵在不同核心、不同版本下預設值不同，是這類最佳化的常態。**調大合併半徑**能讓掉落物更快堆成一疊、減少實體數量，代價是**改變原版行為**，可能影響依賴物品分離的機器——生電服慎用。相關鍵還有 Paper 的 `entities.behavior.experience-merge-max-value`（當前預設 `-1`，即不限制經驗球合併後的最大值）。
:::

**給存檔兜底**：Paper 的 `chunks.entity-per-chunk-save-limit` 可以限制每個區塊**儲存/載入**的某類實體數量（Paper 文件中 `experience_orb: -1` 表示不限制，也可按 `<entity-type>` 配置）。它限制的是存檔與載入環節，不是當場刪除實體，適合給"掉一地經驗球"這種場景兜底。

**別讓農場在無人時跑**：不要濫用 `/forceload`；Paper 的 `unsupported-settings.disable-world-ticking-when-empty`（當前預設 `false`，屬於官方明確標註"不受支援"的選項）可以在沒有玩家、也沒有強制載入區塊時停止世界 tick——**改動前先確認版本行為**。

## 3. 實體堆積（生物）

### 3.1 常見成因

- **刷怪籠長期執行**：尤其是沒做擊殺/收集的刷怪籠；
- **未照明的洞穴與夜晚刷怪**：玩家活動區附近的地下全是怪；
- **無節制繁殖**：牛羊豬雞堆成一片；
- **寵物滿地**：馴服的狼、貓、馬散落在地圖各處；
- **村民繁殖大廳**：村民數量上百後，POI 查詢與尋路開銷顯著；
- **襲擊 / 流浪商人堆積**：長期不結束的襲擊、沒人搭理的流浪商人及其羊駝；
- **實體密集的紅石裝置**：礦車陣列、盔甲架、掉落物鏈；
- **傳送門刷豬人**：Paper 提供 `nerf-pigmen-from-nether-portals`（當前預設 `false`）來關閉該行為。

### 3.2 診斷

- **spark profiler**：熱點常見於 `Entity.tick`、尋路相關方法、感測器掃描、村民 POI 查詢；
- **`/spark health`**：確認 TPS、CPU、記憶體、磁碟四項裡是哪一項在告急；
- **`/paper entity list`**：看實體類型的分佈（哪些類型數量異常）；
- **`/paper mobcaps`**：檢視某個世界的全域刷怪上限與實際佔用，以及可刷怪區塊數量；
- **`/paper playermobcaps`**：檢視單個玩家的本地刷怪上限；
- **`/paper chunkinfo`**：把實體數量和區塊載入情況對應起來，判斷是不是"某個強制載入區塊在刷怪"。

### 3.3 處理

**（1）實體啟用範圍**：見 1.5 節。這是最有效也最容易傷到機器的一檔，改前先備份配置、改後回測農場。

**（2）刷怪範圍 `mob-spawn-range`**：單位是區塊，控制玩家周圍多遠可以刷怪。Paper 官方文件當前列為 `8`，Spigot wiki 記錄為 `6`——**又是一個隨版本變化的預設值**，請以本地檔案為準。調小可以減少刷出的生物總量，但可能讓某些刷怪塔效率下降。

**（3）每世界刷怪上限**：`bukkit.yml` 的 `spawn-limits`，Paper 官方文件當前列出的預設值為：

```yaml
# bukkit.yml
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
```

Paper 還允許在 `paper-world-defaults.yml` 裡按世界覆蓋同一組上限（`entities.spawning.spawn-limits`，當前預設全部為 `-1`，即沿用 `bukkit.yml` 的值）。另外 `entities.spawning.per-player-mob-spawns`（當前預設 `true`）決定刷怪上限是按玩家各自計算還是全域共享。

**（4）遊戲規則**：原版自帶、見效最快的一檔。

```bash
# 关闭自然刷怪（原版默认 true）——注意这会让刷怪塔失效
/gamerule doMobSpawning false

# 关闭生物掉落物（原版默认 true）
/gamerule doMobLoot false

# 随机刻速度，原版默认 3；调低会同时影响作物生长、火势蔓延、冰雪形成
/gamerule randomTickSpeed 3
```

:::warn 遊戲規則是"一刀切"
`doMobSpawning`、`doMobLoot` 關掉之後，**所有依賴它的玩法都會一起失效**（刷怪塔、經驗農場、凋靈骷髏頭收集等）。它適合活動服或臨時救火，不適合長期開著當最佳化手段。
:::

**（5）刷怪籠相關**：

```yaml
# spigot.yml → world-settings.default
nerf-spawner-mobs: false
```

Paper 文件對 `nerf-spawner-mobs` 的說明是"停用刷怪籠生成的生物的大部分 AI"（當前預設 `false`）。設為 `true` 能省下可觀的 AI 開銷，但刷怪籠產出的生物行為會明顯不同。Paper 另有 `tick-rates.mob-spawner`（當前預設 `1`）控制刷怪籠計算可刷怪區域與生成實體的頻率。

**（6）刷怪籠控制插件**：不少插件可以限制刷怪籠的啟用距離、每分鐘生成數量或需要玩家在場。選型時同樣確認與核心、版本相容，並優先選擇"可回退、可白名單"的方案。

**（7）農場設計**：擊殺室 + 收集閉環 + 及時消失，是比任何配置都穩的解法。掉落物不落地，實體數就不會失控。

**（8）裝飾性實體**：盔甲架、標記（marker）都是實體。Paper 的 `entities.armor-stands.tick`（當前預設 `true`，官方說明是"關掉可阻止盔甲架 tick，在盔甲架很多時能提升效能"）與 `entities.markers.tick`（當前預設 `true`，官方提示可能影響它們作為其他實體乘客時的行為）可以按需關閉。

**（9）強制消失**：Paper 的 `entities.spawning.despawn-time.<entity-type>`（當前預設 `disabled`）可以給指定實體類型設定強制消失時間；`entities.spawning.despawn-ranges` 控制隨機消失距離（預設 `default`，即沿用原版規則）。這兩項都會改變原版行為，動之前先想清楚。

## 4. 方塊實體與漏斗

### 4.1 漏斗為什麼是經典元兇

漏斗是**方塊實體**，在它所在的區塊被 tick 時，它每 tick 都有工作要做：

- 檢查上方是否有掉落物可以吸入、是否有容器可以抽取；
- 按冷卻搬運物品（原版是 8 tick 一次，對應 `spigot.yml` 的 `ticks-per.hopper-transfer`）；
- 訪問容器時產生額外開銷，插件監聽搬運事件（InventoryMoveItemEvent）時開銷更大。

Paper 官方文件對 `spigot.yml` 裡相關鍵的說明是：

- `ticks-per.hopper-transfer`（當前預設 `8`）：漏斗搬運物品的間隔 tick；
- `ticks-per.hopper-check`（當前預設 `1`）：漏斗檢查抽取物品的間隔 tick；
- `hopper-amount`（當前預設 `1`）：漏斗一次搬運的物品數量，上限為堆疊大小；
- `hopper-can-load-chunks`（當前預設 `false`）：與"漏斗是否會載入區塊"相關的開關，語義與預設值請以官方文件與你本地配置為準。

Spigot wiki 額外提醒：把 `hopper-check` 改大會**因為不同步而破壞大多數漏斗裝置**。也就是說，這類"效能最佳化"在生電場景下幾乎必然出問題。

```yaml
# spigot.yml → world-settings.default
ticks-per:
  hopper-transfer: 8
  hopper-check: 1
hopper-amount: 1
```

### 4.2 怎麼減少漏斗開銷

| 做法 | 說明 | 代價 |
| --- | --- | --- |
| 用水流/冰道代替長漏斗鏈 | 物品順水漂流，只在終點放一個漏斗收集 | 需要重新設計物流 |
| 用投擲器匯入單條漏斗線 | 減少"每個箱子配一個漏斗"的重複 | 需要紅石控制 |
| 拆掉閒置漏斗 | 已廢棄的機器、壞掉的物流線留在世界裡照樣 tick | 無 |
| 漏斗礦車搬運 | 一個實體頂一條漏斗線，適合長距離 | 礦車本身也是實體 |
| 開啟核心的漏斗最佳化 | 例如 Paper 的 `hopper` 段 | 可能影響依賴搬運事件的插件 |
| 讓滿的漏斗少幹活 | Paper 的 `hopper.cooldown-when-full`（當前預設 `true`） | 無，屬於預設開啟的最佳化 |

Paper 的 `paper-world-defaults.yml` 裡有專門的漏斗段：

```yaml
# paper-world-defaults.yml
hopper:
  cooldown-when-full: true
  disable-move-event: false
  ignore-occluding-blocks: false
```

- `cooldown-when-full`：Paper 文件說明為"漏斗滿時施加短暫冷卻，而不是持續嘗試抽取新物品"；
- `disable-move-event`：關掉搬運事件以省開銷，但**依賴該事件的插件會失效**；
- `ignore-occluding-blocks`：忽略遮擋方塊相關的檢查。

:::note 結構與預設值隨版本變化
上面這一段的形狀在不同 Paper 版本裡改過（例如 `cooldown-when-full` 早期是帶 `enabled` / `movement-ticks` 的子節點）。**請以你本地生成的 `paper-world-defaults.yml` 與 Paper 官方文件為準。**
:::

### 4.3 順帶一提：容器更新與"不受支援"的開關

Paper 的 `tick-rates.container-update`（當前預設 `1`）控制服務端更新容器與物品欄的頻率。Paper 官方文件明確警告：**把它調大於 1 會造成物品不同步/複製（ghosting），或者讓挖掘進度看起來莫名重置，也可能製造出"像卡服"的視覺假象**。這不是一個值得動的最佳化項。

Paper 的 `unsupported-settings.ticking.block-entities` 與 `ticking.chunks`（當前預設均為 `true`，且被官方標註為"不受支援"）可以整體關閉方塊實體或區塊 tick。**不要在生產服上碰它們**——那等於把遊戲邏輯關掉。

## 5. 排查流程

實體類卡頓的排查順序和別的效能問題一樣：**先測量，再定位，最後才動手**。

### 5.1 七步

1. **測量**：`/spark tps` 看 TPS 與 MSPT，`/spark health` 看是 CPU、記憶體還是磁碟的問題。確認"確實是主執行緒被吃滿"再往下走。
2. **找熱點**：`/spark profiler start --timeout 60`，取樣結束後看呼叫樹——`Entity.tick`、`ItemEntity.tick`、方塊實體 tick、尋路/感測器方法，哪一枝最寬就是主嫌疑。讀圖方法見 [用 spark 分析效能](/tutorials/ops/spark)。
3. **定位區塊與類型**：`/paper entity list` 看類型分佈，`/paper chunkinfo` 看區塊類型分佈，`/forceload query` 查強制載入。
4. **判斷性質**：這是**設計問題**（農場沒閉環、機器沒人管）還是**配置問題**（刷怪範圍、啟用範圍太寬鬆）？絕大多數情況下是設計問題。
5. **先改設計**：加擊殺室、加收集、拆掉廢棄機器、別讓農場無人值守通宵跑。改完再測。
6. **再調配置**：設計改完仍不夠，才動 `spigot.yml` / `bukkit.yml` / `paper-world-defaults.yml` 裡的實體相關項。**一次只改一項**，改前備份（見 [配置服務端](/tutorials/java/config)）。
7. **複測並記賬**：改完立刻回測同一場景（同一機器、同一時段、同樣人數），確認 MSPT 真的降了；把"改了什麼、為什麼、效果如何"記進變更日誌。**沒有複測的最佳化等於沒做。**

### 5.2 速查表

| 現象 | 可能原因 | 先查什麼 | 處理 |
| --- | --- | --- | --- |
| 地上到處是掉落物，TPS 緩慢下滑 | 農場無收集閉環、漏斗線斷了、玩家亂丟 | `/paper entity list minecraft:item`、spark 呼叫樹 | 修農場設計；定時清理插件兜底 |
| 單個區域一到就卡，離開就好 | 該區塊有大量實體或密集機器 | `/paper chunkinfo`、`/forceload query`、spark 按世界/區域對比 | 拆改機器；取消不必要的強制載入 |
| 夜晚/地下刷怪後開始卡 | 未照明區域刷怪 | `/paper entity list`、`/paper mobcaps` | 照明洞穴；收緊縮小 `mob-spawn-range`；必要時 `doMobSpawning` |
| 村民大廳附近卡 | 村民數量大、POI 查詢與尋路開銷 | spark 中村民相關熱點、`/paper entity list minecraft:villager` | 限制繁殖；必要時關閉 `tick-inactive-villagers`（會改變原版行為） |
| 大量機器閒置時也卡 | 漏斗、刷怪籠、盔甲架等方塊實體與實體在空轉 | spark 中方塊實體與實體 tick 的佔比 | 拆閒置機器；啟用核心的漏斗最佳化；關閉盔甲架 tick |
| 重啟後短暫正常，隨後又卡 | 產生源未處理 | 觀察恢復所需時間、對照上面的排查 | 回到第 1~5 步，處理產生源而不是反覆重啟 |
| 記憶體給很大仍然卡 | 瓶頸在主執行緒 CPU，不在堆記憶體 | `/spark health` 的 CPU 與 MSPT | 按本篇處理實體；見 [效能最佳化](/tutorials/java/optimize) |
| 裝了清理插件還是卡 | 清理物件/間隔不對，或卡點根本不是掉落物 | spark 呼叫樹 | 先確認熱點，再決定是否保留該插件 |

Java 版各類報錯與坑的症狀速查見 [[JAVA] 常見問題](/tutorials/faq/faq-java)。

## 6. 常見誤區

**誤區一：重啟能解決問題。**
重啟只是把世界重新載入一次，短時間看起來"順了"。只要刷怪塔還在往地上丟東西、漏斗線還是斷的、強制載入區塊還開著，堆積會以同樣的速度回來。重啟是**應急手段**，不是修復手段。

**誤區二：加記憶體（`-Xmx`）能治實體卡頓。**
實體卡頓是**主執行緒 CPU** 問題，不是堆記憶體問題。給得再大，tick 還是在那一條執行緒上跑；`-Xmx` 過大反而會讓 GC 停頓變長。先把熱點找出來。

**誤區三：把實體上限調得越狠越好。**
激進地縮小啟用範圍、刷怪範圍、合併半徑，會讓**農場和生電機器直接失效**：村民不補貨、刷怪塔不出貨、依賴物品分離的裝置亂套。生電服請優先看 [生電與紅石](/tutorials/java/redstone)，必要時換 Fabric / Leaves，而不是在 Paper 系裡把行為改到面目全非。

**誤區四：`/kill @e` 是萬能藥。**
它會連玩家馴服的寵物、帶裝備的盔甲架、正在收集的產物一起清掉，**不可撤銷**。`/kill @e[type=item]` 雖然溫和一些，也依然會清掉玩家與農場在地上的合法物品。執行前先想清楚"這些實體裡有沒有玩家財產"。

**誤區五：實體數量多就等於卡。**
數量要看類型和位置。一萬個掉落物堆在一個區塊裡、旁邊還有玩家，那是災難；一萬個掉落物分散在一百個只是 Block Ticking 的區塊裡，可能幾乎不產生開銷。**先看 tick 熱點，再看數量。**

**誤區六：裝一堆"最佳化插件"就能解決。**
最佳化插件多數只是把上面這些設定項包裝成圖形介面或定時任務。**產生源不解決，清理只是把問題從"持續卡"變成"週期性卡一下"。** 插件與核心的相容性也要確認，劣質插件本身可能就是熱點。

**誤區七：最佳化一次就完事。**
伺服器是活的：新機器、新農場、新玩家都會改變負載。把關鍵指標（TPS/MSPT、實體數量級）納入日常巡檢，比一次性調參有用得多。

---

> 設定項名稱與預設值隨核心與版本變化，請以你本地生成的設定檔與官方文件為準。
