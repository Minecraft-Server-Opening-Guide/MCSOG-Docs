---
title: 服務端選擇
slug: core
cat: java
level: 1
order: 4
minutes: 12
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, 核心, paper, purpur, folia, leaves, fabric, 生電, 多核]
updated: 2026-10-04
draft: false
---

環境準備好之後，下一個決定就是**用哪個服務端核心**。核心決定了三件事：**效能上限**、**能不能裝插件或模組**、以及**紅石等原版行為是否一致**。

選錯了不會開不起來，但會白花錢（多核 CPU 跑單執行緒端）或者白折騰（生電用 Paper）。

## 一、先分清三類核心

| 類別 | 代表 | 能裝插件 | 能裝模組 | 說明 |
| --- | --- | --- | --- | --- |
| **原版** | Vanilla | 否 | 否 | 官方服務端，行為最標準，但沒有任何最佳化 |
| **插件端** | Spigot → Paper → Purpur / Leaves / Leaf / Folia | 是 | 否 | Bukkit 系一條線，生態最大 |
| **模組端** | Fabric / Forge / NeoForge | 需橋接 | 是 | 載入模組，適合整合包 |

> 還有一類是**代理端**（Velocity / BungeeCord）：它自己不跑世界，只負責把玩家轉發到多個子服，屬於「多服互聯」時才需要。

這三類裡，生電服走的是**模組端（Fabric）**這條路。開生電服之前，這組教學值得先過一遍：

- [\[生電篇\]服務端選擇](/tutorials/java/sd-server)：為什麼是 Fabric 加 MCDR，以及各條路線的代價。
- [\[生電篇\]Carpet 及其附屬包](/tutorials/java/sd-carpet)：規則系統、四個主流附屬包與防崩規則。
- [\[生電篇\]共享原理圖](/tutorials/java/sd-schematic)：用 Syncmatica 把投影與放置同步給所有人。
- [\[生電篇\]最佳化 mod](/tutorials/java/sd-optimize)：哪些能放心裝、哪些會改變時序。
- [\[生電篇\]存檔保護](/tutorials/java/sd-backup)：備份流程、Ledger 與異地備份。
- [\[生電篇\]配置最佳化](/tutorials/java/sd-config)：生電服到底有哪些開關可動。
- [\[生電篇\]世吞與切門](/tutorials/java/sd-machine)：世吞與更新抑制的風險控制。
- [\[生電篇\]為什麼不推薦反作弊](/tutorials/java/sd-anticheat)：生電服為什麼不該裝反作弊。

## 二、按硬體選：這是最容易選錯的一點

**Minecraft 的主執行緒是單執行緒的。** 實體、區塊、紅石、插件邏輯幾乎都壓在**一個核心**上——所以核心多不等於快，**單核頻率才是關鍵**。

| 你的機器 | 推薦 | 原因 |
| --- | --- | --- |
| **單核效能強**（4~8 核，主頻 3.5GHz+） | **Paper / Purpur / Leaf** | 這幾個端把單執行緒能做的最佳化都做滿了，單核越強收益越大 |
| **核心多但主頻低**（16 核+，主頻 <2.5GHz） | **Folia** | 單核是短板，跑 Paper 會浪費掉大部分核心；Folia 能把多核吃滿 |
| 不確定、想省心 | **Paper** | 最穩、資料最多、插件相容性最好 |

### 多核端 Folia 是什麼

Folia 是 Paper 官方的一個分支，給服務端加入了**區域化多執行緒（regionised multithreading）**：把世界切成多個區域，各區域**並行**執行 tick，因此能真正利用多核。

代價同樣明確：

- **插件相容性差**：大量插件沒有適配 Folia，裝了可能直接報錯或行為異常。
- **行為與 Paper 有差異**：跨區域的互動（紅石、傳送、實體跨區）規則不同。
- 適合**玩家分散、機器單核弱但核心多**的場景，不適合生電。

### 單核強就選 Paper 系

Paper 及其下游（Purpur、Leaf、Leaves）都是**單執行緒最佳化**路線：主執行緒最佳化到位，單核頻率越高越流暢。

- **Paper**：基準選擇，生態最大。
- **Purpur**：Paper + 大量可配置玩法開關，適合想微調的人。
- **Leaf**：Paper 分支，在**效能、原版機制與穩定性之間找平衡**（官方定位）。
- **Leaves**：Paper 分支，但方向相反——**專門修復被改壞的原版特性**，見下一節。

## 三、生電（技術向）怎麼選

生電指紅石機器、刷怪塔、TNT 複製、精確的方塊與實體行為。它**要求原版行為一致**，所以：

- **Fabric** 是 —— 不裝最佳化類 mod 時最接近原版，是生電服的主流選擇。
- **Leaves** 是 —— Paper 分支，但專門**修復被 Paper 改壞的原版特性**（官方定位：*repairing broken vanilla properties*），因此能在保留 Paper 生態的同時還原原版行為。

:::warn 生電不要用 Paper / Purpur
Paper 係為了效能改動了部分原版行為（紅石時序、TNT 複製、刷怪與實體規則等），**會讓依賴這些機制的機器失效**。生電服請用 **Fabric** 或 **Leaves**。
:::

## 四、常用核心速查

| 核心 | 類型 | 一句話 | 適合 |
| --- | --- | --- | --- |
| **Vanilla** | 原版 | 官方服務端，無最佳化 | 純淨體驗、驗證原版行為 |
| **Spigot** | 插件端 | Paper 的上游，相容老插件 | 優先相容性的老服 |
| **Paper** | 插件端 | 生態最大、最穩的基準 | 大多數生存服、插件服 |
| **Purpur** | 插件端 | Paper + 海量玩法開關 | 想精細調玩法 |
| **Leaf** | 插件端 | 效能與原版機制平衡 | 想要 Paper 又想少改原版行為 |
| **Leaves** | 插件端 | 修復原版特性 | **生電 + 想用插件** |
| **Folia** | 多核端 | 區域化多執行緒，吃滿多核 | **核心多、主頻低**，能接受插件限制 |
| **Fabric** | 模組端 | 輕量、貼近原版 | **生電**、輕量模組整合 |
| **Forge** | 模組端 | 老牌，整合包最多 | 大型科技整合包 |
| **NeoForge** | 模組端 | Forge 社群分支，新版本主力 | 1.20.2+ 模組服 |
| **Velocity** | 代理端 | 只轉發不跑世界 | 多子服互聯、跨服 |

> 表中「效能」類描述為相對參考，實際表現取決於版本、插件/模組數量與硬體。

## 五、完整對照表

上面是速查，逐項對比（效能、插件、模組、上手難度、適用場景）見：

**→ [服務端核心對比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)**

## 六、下一步

選定核心後，到該核心的官方渠道下載對應版本的服務端 jar，放進「環境準備」裡建好的 `survival` 目錄，然後**寫啟動腳本把它跑起來**：

> **本站已收錄這些核心的下載入口** —— 開啟 **[資源下載 · 服務端核心](/downloads/core)**，裡面按核心名列出了全部構建版本（Vanilla、Paper、Folia、Velocity、Purpur、Leaf、Leaves、Fabric、NeoForge、Forge、Spigot、BungeeCord 以及基岩版 BDS），點「下載」按鈕並按提示登入即可。收錄的是官方與社群來源的下載連結，**本站不儲存任何檔案**。

**→ [開啟服務端](/tutorials/java/start)** —— 啟動腳本、同意 EULA、判斷啟動成功、自動重啟

- **Paper / Purpur / Leaf / Leaves / Folia**：官方下載頁獲取 jar
- **Fabric / Forge / NeoForge**：先裝對應載入器的服務端安裝器（新版 Forge / NeoForge 會**自動生成啟動腳本**）
- **原版 Vanilla**：官方服務端 jar

啟動前再確認一次：**Java 版本與目標 MC 版本匹配**、**25565 已放行**。

## 相關資源

本站收錄了三類資源，都是官方與社群來源的**下載連結**（不儲存任何檔案），點「下載」按鈕按提示登入即可：

- **[資源下載 · 服務端核心](/downloads/core)** —— 13 個核心（Vanilla、Paper、Folia、Velocity、Purpur、Leaf、Leaves、Fabric、NeoForge、Forge、Spigot、BungeeCord、基岩版 BDS）的全部構建版本。
- **[資源下載 · 模組](/downloads/mods)** —— Modrinth 模組條目，可按載入器（Fabric / Forge / NeoForge / Quilt）與遊戲版本篩選；模組服路線見 [模組服完整上手](/tutorials/java/modded)。
- **[資源下載 · 插件](/downloads/plugins)** —— 服務端插件，支援 Java 版（Paper / Spigot / Folia / Purpur / Bukkit 篩選）與基岩版，另含 MCDR 插件；插件服路線見 [插件入門](/tutorials/java/plugins)。
