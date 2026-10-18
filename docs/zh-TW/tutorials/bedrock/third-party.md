---
title: 第三方核心（Nukkit / PNX / PMMP）
slug: third-party
cat: bedrock
level: 3
order: 5
minutes: 12
tags: [基岩版, nukkit, powernukkitx, pocketmine, php, 第三方核心]
updated: 2026-10-04
draft: false
---

官方 BDS 穩但不好擴充。要插件、要多核、要自定義，就得用第三方核心。這一篇把三個主流第三方核心的**上手路徑**講清楚。

## 一、Nukkit 系

Nukkit 是"基岩版的 Bukkit"：**Java 編寫**、有原生插件系統、配置簡單。它衍生出一堆分支，實際使用時**優先選活躍分支**：

| 分支 | 說明 |
| --- | --- |
| **Nukkit（原版）** | 最早上游，已不活躍，不建議新專案使用 |
| **PowerNukkitX（PNX）** | 現代主力分支，**支援最新協議 + 多核最佳化**，首選 |
| **NukkitX** | 歷史分支 |
| **NukkitMot** | 歷史分支 |
| **PM1E** | 與 PocketMine 相關的歷史分支（社群對其歷史有爭議） |
| **PNX** | 即 PowerNukkitX 的縮寫 |

**準備**：Nukkit 系是 Java 程式，**需要裝 Java**（與 Java 版類似，見「環境準備（Windows 與 Linux）」的 Java 一節）。

**上手**：下載核心 jar → 放進目錄 → 寫啟動腳本（`java -jar 核心名.jar`）→ 首次啟動生成設定檔 → 裝插件到 `plugins/`。

### PowerNukkitX 為什麼值得選

- **多核最佳化** —— 這是它相對 BDS 最大的優勢，BDS 的運算基本壓在單核；
- **支援最新基岩版協議**，不用等很久；
- **384 格世界高度**、內建 **Terra** 地形生成器；
- **完全開源、API 開放**，可用 Java / Kotlin / Scala / Python / JavaScript / Lua 寫插件；
- **相容 Nukkit 生態的大量插件**。

代價：插件多、設定項多，**新手學習曲線較陡**；開發強度會受上游團隊變動影響。

## 二、PocketMine-MP（PMMP）

用 **PHP** 寫的基岩版服務端，**插件生態最龐大**。

**準備**：需要 **PHP 執行環境**（不是 Java）。建議按官方文件裝對應 PHP 版本，並配好相關擴充。

**上手**：下載 PMMP（通常是 `.phar` 檔案）→ 用 PHP 啟動（`php PocketMine-MP.phar`）→ 生成配置與目錄 → 插件放 `plugins/`。

**優點**：插件極多、跨平台、**會 PHP 就能寫插件**、社群活躍、自定義程度高。

**缺點**：**高負載下有效能瓶頸**（記憶體管理與 CPU 效率）；更新滯後；插件裝多了穩定性下降；PHP 作為解釋型語言**資源佔用更明顯**。

:::tip 選 Nukkit 系還是 PMMP？
- 你**熟悉 Java**、想要**更好的效能** → **PowerNukkitX**
- 你**熟悉 PHP**、想要**最多的現成插件** → **PocketMine-MP**
- 兩者都不熟 → 先用 **BDS** 跑通，再考慮第三方
:::

## 三、其他服務端

除了上面幾個，社群還有一些小眾/特定用途的核心：

| 核心 | 定位 |
| --- | --- |
| **Allay** | 社群開發的基岩版服務端 |
| **Dragonfly** | Go 語言編寫的基岩版服務端，效能取向 |
| **MCPEServer** | 早期基岩版服務端 |
| **WaterDogPE** | **代理端**（對應 Java 版的 Velocity / BungeeCord），用於多子服互聯 |

> 小眾核心的**插件生態與文件通常很薄**，遇到問題較難求助。除非有明確理由，**不建議新手選擇**。

### WaterDogPE：多子服才需要

和 Java 版一樣，基岩版也有**代理端**：它自己不跑世界，只把玩家轉發到後端子服。適合"大廳 + 生存 + 小遊戲"這種多服結構。**單服不需要它**，多一層就多一層故障點。

## 四、通用建議

1. **版本對齊**：核心、協議、插件三者版本要對齊，基岩版在這點上比 Java 版嚴格得多。
2. **先小後大**：先跑通一個最小可用服，再逐步加插件。
3. **看活躍度**：優先選**近期仍在更新**的核心與插件，長期不更新的遇到新版必崩。
4. **備份優先**：第三方核心的存檔相容性不如官方，**升級/換核心前一定先備份**（見「備份與恢復」）。

## 下一步

回看整體選型：見 [基岩版核心選擇](/tutorials/bedrock/cores) 與 [服務端核心對比](/wiki/compare#mcsog-h-%E5%9F%BA%E5%B2%A9%E7%89%88%E6%A0%B8%E5%BF%83%E5%AF%B9%E6%AF%94)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 的基岩版板塊與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
