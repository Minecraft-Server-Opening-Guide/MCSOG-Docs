---
title: "[生電篇]Carpet 及其附屬包"
slug: sd-carpet
cat: java
level: 3
order: 30
minutes: 25
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生電, carpet, fabric, 服務端]
updated: 2026-10-08
draft: false
---

生電服每天真正要打交道的是 **Carpet**：它把原版裡一堆寫死的細節行為變成了**可以用指令開關的規則**。本篇講清規則系統怎麼用、四個主流附屬包各補什麼，以及幾條**已核實的防崩規則**。

## 一、Carpet 是什麼

`Carpet` 的定位是 **Fabric 服務端 mod**，提供一套**規則系統**：用 `/carpet <规则名> <值>` 開關原版裡那些本來寫死的行為。

幾個基本事實：

- 支援版本從 `1.14.4` 到 `26.3`，共 179 個版本條目，下載量約 1125 萬；
- 官方原始碼 `CarpetSettings.java` 中共有 **91 條帶 `@Rule` 註解的規則**。

也就是說，它能動的東西非常多，**"能開"不等於"該開"**：生電服的基本紀律是隻開你理解後果的規則。

## 二、`/carpet` 的用法

規則系統的互動非常直接：

```
/carpet <规则名> <值>        # 修改一条规则
```

實踐上建議遵守三條：

1. **一次只改一條**，改完觀察機器行為再動下一條；
2. **把改過的規則記下來**（寫進服規或維運筆記），換核心、升版本時逐條複核；
3. 凡是**會改變原版行為**的規則，正式開服時預設關掉，只在單人測試或特定場景開啟。

下面這些規則名取自 Carpet 官方原始碼，逐條給出中文說明。

## 三、規則示例

### 效能與實體類

| 規則 | 中文說明 |
| --- | --- |
| `optimizedTNT` | 同一位置、液體中的 TNT 爆炸造成更少卡頓 |
| `maxEntityCollisions` | 自定義實體碰撞上限，0 表示不限制 |
| `lagFreeSpawning` | 刷怪只佔用少得多的 CPU 與記憶體 |
| `fastRedstoneDust` | 針對紅石粉的卡頓最佳化 |
| `movableBlockEntities` | 活塞可以推動方塊實體，例如漏斗、箱子等 |

### 行為改變類（正式開服預設不要開）

| 規則 | 中文說明 |
| --- | --- |
| `tntDoNotUpdate` | TNT 靠著電源放置時不會被更新 |
| `explosionNoBlockDamage` | 爆炸不破壞方塊 |
| `antiCheatDisabled` | 防止玩家因移動過快被回拉 |
| `updateSuppressionBlock` | 在屏障方塊上放啟用鐵軌，鐵軌轉向時會填滿鄰居更新棧 |
| `stackableShulkerBoxes` | 空潛影盒丟在地上時可以堆疊 |

`updateSuppressionBlock` 是更新抑制（社群俗稱"切門"）的官方可控入口，與它配合的防崩規則見第六節。

### 計數與除錯類

| 規則 | 中文說明 |
| --- | --- |
| `hopperCounters` | 指向羊毛的漏斗會統計通過的物品數量 |
| `commandTick` | 啟用 `/tick` 指令來控制遊戲時鐘 |

### 另有名稱、未附描述

以下規則確實存在，但這裡只列名字；具體行為請以你所用版本的原始碼或遊戲內 `/carpet` 輸出為準：

`creativeNoClip`、`renewableSponges`、`persistentParrots`、`flippinCactus`、`xpNoCooldown`、`smoothClientAnimations`、`tntPrimerMomentumRemoved`、`commandPlayer`。

## 四、四個主流附屬包

Carpet 本體只做主規則集，功能擴充靠附屬包。以下倉庫位址、支援版本與版本條目數均為 Modrinth 官方資料。

| 名稱 | 倉庫 | 支援版本 | 版本條目數 | 定位 |
| --- | --- | --- | --- | --- |
| Carpet Extra | `gnembon/carpet-extra` | 1.14.4–26.2 | 87 | 新發射器行為、新的獲取方式等 |
| Carpet TIS Addition | `TISUnion/Carpet-TIS-Addition` | 1.14.4–26.3 | 141 | Fabric Carpet 擴充包 |
| Carpet AMS Addition | `Minecraft-AMS/Carpet-AMS-Addition` | 1.16.4–26.3 | 49 | 官網 `https://carpet.mcams.club` |
| Carpet Org Addition | `fcsailboat/Carpet-Org-Addition` | 1.19.4–26.3 | 34 | Carpet 擴充包 |

選包建議：

- **Carpet Extra** 與 **TIS Addition** 覆蓋最老的版本區間，老版本整合包常見；
- **AMS Addition** 與 **Org Addition** 從較新的版本起步（1.16.4 與 1.19.4），但它們都跟到了 26.3；
- 只要**你實際要用的規則**在哪個包裡，就裝哪個，不必全裝。

:::warn 附屬包要跟 Carpet 的主版本匹配才生效
這是常識性提醒：附屬包依賴 Carpet 本體的介面，**遊戲版本不同、Carpet 主版本不同，附屬包可能整個不載入或部分規則失效**。裝之前先確認該附屬包的版本區間覆蓋你的服務端版本，裝完在遊戲裡用 `/carpet` 看一眼規則是否真的出現了；升級 Carpet 時也要同步升級附屬包。具體以各附屬包自己發佈的版本說明為準。
:::

## 五、已核實的防崩規則

世吞與更新抑制這類玩法會主動製造**極端的方塊更新與棧溢位**，服務端的直接後果就是崩潰。以下規則是本次核實到的、專門用來兜住這類風險的。

### Carpet TIS Addition

| 規則 | 作用方向 |
| --- | --- |
| `yeetUpdateSuppressionCrash` | 處理更新抑制引發的崩潰 |
| `updateSuppressionSimulator` | 更新抑制模擬 |
| `deobfuscateCrashReportStackTrace` | 反混淆崩潰報告的呼叫棧，讓崩潰日誌可讀 |

### Carpet AMS Addition

| 規則 | 可選值 |
| --- | --- |
| `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |

`customBlockUpdateSuppressor` 的作用是把指定方塊變成**更新抑制方塊**——換句話說，你可以自己選哪種方塊承擔那個"填滿鄰居更新棧"的角色，而不是隻能用本體的 `updateSuppressionBlock`。

另外：Carpet Org Addition **未核實到抑制或崩潰相關規則**，這裡就不寫它的規則名。

## 六、和世吞與切門怎麼配合

- **"切門"是社群對"更新抑制（update suppression）"這一類操作的俗稱**，不是遊戲裡的正式名詞；
- 官方 Carpet 提供的可控入口就是 `updateSuppressionBlock`；AMS 的 `customBlockUpdateSuppressor` 則讓你換用別的方塊；
- 崩潰風險由 TIS 的 `yeetUpdateSuppressionCrash`、`updateSuppressionSimulator`、`deobfuscateCrashReportStackTrace` 與 AMS 的 `amsUpdateSuppressionCrashFix` 來兜；
- 這三層是"**入口可控 + 參數可換 + 崩潰可兜**"的關係，缺一層都會讓排障變難。

具體到機器怎麼開、風險怎麼控，見第 7 篇 [世吞與切門](/tutorials/java/sd-machine)。那裡的結論是：機器越猛，越要"備份 + 權限 + 防崩規則"三件套，而**防崩規則就是本節這幾條**。

## 七、本篇的三條底線

```
1. 规则只开你懂后果的 —— 每改一条都记下来
2. 附属包跟主版本匹配 —— 装完用 /carpet 确认规则真的在
3. 防崩规则先开 —— 世吞与更新抑制之前，先把崩溃兜住
```

## 下一步

規則開完之後，機器一動土就要先讀風險控制：見 [世吞與切門](/tutorials/java/sd-machine)。想讓大家都用上同一份投影，見 [共享原理圖](/tutorials/java/sd-schematic)；回頭算效能賬見 [最佳化 mod](/tutorials/java/sd-optimize)，核心為什麼必須是 Fabric 見 [服務端選擇](/tutorials/java/sd-server)。

---

> 本篇的規則名取自 Carpet 官方原始碼，附屬包的倉庫位址、支援版本與版本條目數取自 Modrinth 官方資料；規則是否存在、行為如何，請以你所用版本的遊戲內 `/carpet` 輸出為準。
