---
title: "[生電篇]服務端選擇"
slug: sd-server
cat: java
level: 3
order: 29
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生電, carpet, fabric, 服務端]
updated: 2026-10-08
draft: false
---

生電服要的不是"一個能開的服務端"，而是**一整套能被規則精細控制的原版機制**：機器按預期工作、TNT 與更新抑制可控、崩了能立刻拉起來。本篇講清三條路線各自的代價，並把 PCA 協議單獨說透。

## 一、三條路線一覽

| 路線 | 代表 | 能得到什麼 | 代價 |
| --- | --- | --- | --- |
| **Fabric 服務端 + MCDR**（最推薦） | Fabric + `MCDR` | Carpet 及其全部附屬包、行程外管理器、官方插件目錄 | 需要自己裝 mod，沒有插件生態的即插即用 |
| 生電最佳化端 | Paper 系等插件端 | TPS 最佳化、插件生態 | 會改原版行為，機器可能不工作 |
| 多執行緒端 | `c2me-fabric`、`async` | 區塊與實體處理加速 | 多執行緒改變時序，影響機器行為 |

**先說結論**：開生電服選 **Fabric 服務端 + MCDR**，其餘兩條只在明確知道自己要什麼時才用。

## 二、為什麼最推薦 Fabric 服務端 + MCDR

這不是偏好問題，而是三條硬事實疊出來的結果。

### 生電工具鏈全在 Fabric 上

`Carpet` 本體，以及它的四個主流附屬包（`Carpet Extra`、`Carpet TIS Addition`、`Carpet AMS Addition`、`Carpet Org Addition`）**全部是 Fabric 服務端 mod**。也就是說，生電玩家真正依賴的那套規則系統，只在 Fabric 上有完整實現；選別的核心，等於放棄這套工具鏈。規則與附屬包的細節見 [Carpet 及其附屬包](/tutorials/java/sd-carpet)。

### MCDR 獨立在服務端行程之外

`MCDR`（MCDReforged）是一個 Python 寫的服務端管理器。

關鍵在於**它跑在服務端行程之外**：

- 服務端崩了，MCDR 自己還活著，可以**自動重啟**；
- 崩潰的那一刻它還有執行能力，所以**能在崩潰時執行備份**；
- 它通過控制台與日誌和服務端互動，不侵入服務端本身的邏輯。

這三點對生電服尤其重要：世吞、更新抑制、大規模 TNT 陣列都是能讓服務端直接掛掉的玩法，管理器必須比服務端更"耐活"。安裝與指令見 [MCDR 服務端管理器](/tutorials/java/mcdr)。

### MCDR 有官方插件目錄

MCDR 官方維護著一個插件目錄（`MCDReforged/PluginCatalogue`），備份類、查詢類、權限類插件都齊全。僅備份一項，目錄裡就能找到 `prime_backup`、`quick_backup_multi`、`timed_quick_backup_multi`、`better_backup`、`auto_backup`、`permanent_backup`、`zip_backup`、`chunk_backup`、`region_backup`、`ftp_backup`、`baidu_netdisk_backup`、`extra_prime_backup`、`smart_backup`、`cushion_of_backup` 等條目，其中 `ftp_backup` 與 `baidu_netdisk_backup` 屬於**異地備份**思路。

換句話說：你不必自己寫管理腳本，裝完 MCDR 就有一套現成的維運工具箱。

## 三、另外兩類選擇，以及它們的代價

### 生電最佳化端（插件端）

Paper 系一類的插件端能把 TPS 最佳化得很好，插件生態也成熟，但它們的很多預設配置**就是被最佳化過的**，與原版行為不一致：實體碰撞、紅石實現、區塊解除安裝延遲這些項一旦被改，機器就可能不工作或產出不穩定。

這類核心適合普通生存服、小遊戲服、需要大量插件功能的服；**開生電服則要反過來，把影響原版行為的項一項項調回原版**。哪些項要調、怎麼調，本站已有專門的兩篇：

- [服務端選擇](/tutorials/java/core) —— 通用選型與各核心的定位；
- [生電與紅石](/tutorials/java/redstone) —— 插件端的原版特性調校清單，以及 MCHPRS 一類專用核心。

本篇不重複這兩篇的內容。

### 多執行緒端

多執行緒端的思路是把區塊或實體處理拆到多個執行緒上：

| mod | 生電視角的問題 |
| --- | --- |
| `c2me-fabric` | 區塊處理並行化，時序與原版不同 |
| `async` | 實體並行處理，機器依賴的更新順序會變 |

紅石與生電機器**大量依賴更新順序與時序**。多執行緒加速的是吞吐量，代價是把"同一 tick 內誰先誰後"這件事變得不可預測——機器可能偶爾對、偶爾錯，這比穩定地慢更難排查。

結論：只有明確知道自己要什麼（例如只是想讓跑圖不卡，且接受機器行為的偏差）時才用多執行緒端。

## 四、生電服不推薦裝反作弊

直說：**生電服不推薦裝反作弊插件**。

原因是邏輯上的衝突：

- 生電玩家的正常玩法本身就會持續觸發反作弊判定——高速移動、大量實體、機器與自動化產生的異常行為，都會被當成可疑；
- 反作弊通常要求裝在**插件端或最佳化端**上，而這兩類核心本身就會改原版行為，與生電目標直接衝突；
- 原版那套針對快速移動的檢測與回拉，Carpet 自己就有開關：`antiCheatDisabled`（防止玩家因移動過快被回拉）。

你真正需要的是**白名單與權限、操作記錄與回溯、定期與異地備份**這類替代方案，而不是再加一層會誤判的判定。完整論證見 [為什麼不推薦反作弊](/tutorials/java/sd-anticheat)，日誌與回滾手段見 [反作弊與防破壞](/tutorials/java/anticheat)。

## 五、PCA 協議

`PCA` 的準確身份是 `plusls-carpet-addition`（Plusls Carpet Addition），一個 Carpet 的擴充 mod。社群裡說「給服務端加入 PCA 協議」，指的就是這件事，常被簡稱為 **PCA Protect**；協議文件見 [plusls/plusls-carpet-addition](https://github.com/plusls/plusls-carpet-addition)。

### 它是什麼

PCA 同步協議是一個用於在服務端和客戶端之間同步 Entity，BlockEntity 的協議，目前被 MasaGadget 用於實現多人遊戲容器預覽。

拆開看三層含義：

1. 它是**服務端與客戶端之間**的協議，兩端都要有對應支援；
2. 它同步的物件是 **Entity 與 BlockEntity** 的資料；
3. 目前的主要用途是 **MasaGadget 用它實現多人遊戲容器預覽**——多人環境下看別人的箱子、漏斗、機器內部內容。

### 兩個規則

| 規則 | 類型 | 預設值 | 可選值 | 說明 |
| --- | --- | --- | --- | --- |
| `pcaSyncProtocol` | `boolean` | `false` | `true` / `false` | 同步協議的開關，分類為 `PCA`、`protocal` |
| `pcaSyncPlayerEntity` | `enum` | `OPS` | `NOBODY` / `BOT` / `OPS` / `OPS_AND_SELF` / `EVERYONE` | 決定哪些玩家的資料將會被 PCA 同步協議同步 |

注意 `pcaSyncProtocol` **預設是關的**：協議是能力，不是預設行為，用之前要自己想清楚同步給誰看。

### 維護現狀（這一段必須看清）

| 專案 | 狀態 |
| --- | --- |
| `plusls/plusls-carpet-addition`（原始專案） | 2022 年停止更新 |
| `Nyan-Work/plusls-carpet-addition`（其中一個 fork） | 2024 年停止更新 |
| `pca-protocol` | 現可用。Modrinth，`fabric`，1.14.4–26.3，作者 fallen-breath。|
| `pca-protocol-plugin` | 現可用。Modrinth，`bukkit` / `paper` / `purpur` / `spigot`，1.17–1.21.8。|

也就是說：原始專案與其 fork 都已停更，**現在能用的是隻保留協議功能的兩個精簡 fork**——`pca-protocol` 給 Fabric 服務端，`pca-protocol-plugin` 給 Spigot 系服務端。

### 給服務端加入 PCA 協議（PCA Protect）

社群把「讓服務端說 PCA 協議」這件事簡稱為 **PCA Protect**，做法就是裝上面兩個精簡 fork 中對應的那一個：

- **Fabric 服務端**：裝 `pca-protocol`（原始碼：[Fallen-Breath/pca-protocol](https://github.com/Fallen-Breath/pca-protocol)），它不需要任何額外前置，只要有 Fabric Loader。
- **Spigot 系服務端**（`bukkit` / `paper` / `purpur` / `spigot`）：裝 `pca-protocol-plugin`。
- **客戶端**：服務端只是"會說話"，真正要用起來還得客戶端裝一個使用該協議的 mod，例如 `MasaGadget`（多人容器預覽就是它實現的）。

裝好之後協議仍然**預設關閉**：要手動開啟 `pcaSyncProtocol`，並用 `pcaSyncPlayerEntity` 決定同步範圍。

:::warn 精簡 fork 與完整版衝突
官方明確說明：精簡 fork 與完整的 `plusls-carpet-addition` **衝突**。也就是說，要麼用完整版（含其他功能，但已停更），要麼用精簡版（只有協議，仍在維護），**不要同時裝**。
:::

## 六、本篇的三條底線

```
1. 核心选 Fabric —— 生电工具链只在这里完整
2. 管理交给 MCDR —— 它在服务端进程之外，崩了还能救
3. 不加反作弊 —— 误判是必然的，用权限、日志与备份替代
```

## 下一步

核心定下來之後，下一步是把規則系統裝上：見 [Carpet 及其附屬包](/tutorials/java/sd-carpet)。機器開工之前先讀風險控制，見 [世吞與切門](/tutorials/java/sd-machine)；為什麼反作弊在生電服是負收益，見 [為什麼不推薦反作弊](/tutorials/java/sd-anticheat)。通用選型與被跳過的細節見 [服務端選擇](/tutorials/java/core) 與 [生電與紅石](/tutorials/java/redstone)。

---

> 本篇的 mod 載入器、支援版本與插件目錄名均取自 Modrinth 官方資料與 MCDR 官方插件目錄；具體配置以各專案官方說明為準。
