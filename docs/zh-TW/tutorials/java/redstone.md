---
title: 生電與紅石
slug: redstone
cat: java
level: 2
order: 12
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生電, 紅石, fabric, leaves, paper, 原版特性]
updated: 2026-10-04
draft: false
---

「生電」= **生**存 + **電**路，指以紅石機器、刷怪塔、精準方塊行為為核心玩法的技術向生存。它和普通生存服最大的區別是：**對"原版行為是否被改動"極其敏感**。

一個被最佳化掉的方塊更新順序、一處被修掉的複製特性，就能讓整台機器報廢。

## 一、插件端做不到 100% 原版

Paper 官方文件自己就寫明瞭：

> *Unfortunately, it currently is not possible to get a 100% Vanilla experience in Paper.*

也就是說，**用 Paper / Purpur 跑生電，本質上是在打折扣**。所以先選對核心，再談配置。

| 你的目標 | 推薦核心 |
| --- | --- |
| **純生電 / 技術向** | **Fabric**（不裝最佳化類 mod 時最貼近原版）、**Leaves**（Paper 分支，專門修復被改壞的原版特性） |
| 原版驗證 / 極簡 | **Vanilla**（官方原版服務端） |
| **輕度生電**，同時想用插件 | Paper 系 + 下面這套配置調校 |

> 為什麼 `Leaves` 值得單獨提：它的定位就是"修復原版特性"，能在保留 Paper 生態（插件、效能）的同時把被改動過的行為還原回來，是"既要插件又要生電"時比較現實的選擇。

## 二、插件端的原版特性調校

如果你確定要用 Paper 系做**輕度生電**，重點調這幾處（檔案：`config/paper-world-defaults.yml`）。

### 區塊解除安裝延遲

```yaml
chunks:
  delay-chunk-unloads-by: 0s
```

預設會有一定延遲。設為 `0s` 才能讓**末影珍珠滯留回傳**這類依賴"區塊及時解除安裝"的裝置正常工作。

### 實體碰撞

```yaml
collisions:
  allow-player-cramming-damage: true
  max-entity-collisions: 2147483647
```

- `allow-player-cramming-damage`：玩家因實體過多擠壓時是否受傷，需要與原版一致就設為 `true`。
- `max-entity-collisions`：超過這個數量服務端會**停止處理實體碰撞**。密集實體裝置（如大規模刷怪塔）需要把它調到極大值，**代價是效能下降**。

### 實體行為

```yaml
entities:
  behavior:
    # 蜜蜂离巢的失败冷却时间，与原版行为相关
```

Paper 為效能給部分實體行為加了"冷卻"或限制，生電場景需要逐項核對並關掉。

### 紅石實現

Paper 支援切換**紅石實現方式**。請**保持 vanilla 實現**——換成其他實現（為效能最佳化過的）會改變紅石更新行為，機器直接失效。
:::warn 調配置前先備份
`config/` 下的檔案改錯了會導致服務端啟動異常。**改前先複製一份**，出問題立刻還原。
:::

## 三、生電常用 mod（模組端）

生電玩家一般會裝一套客戶端 mod，服務端側也需要對應支援：

| Mod | 作用 |
| --- | --- |
| **Carpet** | 服務端規則控制，生電服幾乎必備（可開關大量原版細節行為） |
| **MiniHUD** | HUD 顯示座標、生物群系、光照等 |
| **Litematica** | 原理圖投影，照著搭機器 |
| **Tweakeroo** | 一堆便利性調整 |
| **Servux** | 讓 MiniHUD 的結構顯示、原理圖貼上在伺服器上正常工作 |
| **Syncmatica** | 把原理圖上傳到伺服器共享給其他玩家 |
| **BBOR** | 顯示自然結構範圍、3D 群系邊界、史萊姆區塊 |
| **Jade / JEI（或 REI）** | 檢視方塊資訊 / 合成配方 |
| **Xaero's Minimap / World Map** | 小地圖與世界地圖 |
| **AppleSkin** | 顯示飢餓值與飽食度恢復 |
| **EasyAuth** | 服務端登入 mod |
| **Fuji** | 多功能管理 mod |

> 很多 mod 的部分功能**需要服務端也裝**才能正確顯示數值（如 AppleSkin 的精確飽食度），開生電服時要和玩家對齊版本。

## 四、專門的紅石服務端

如果只關心**紅石電路本身**（比如做大型計算器、驗證機器時序），還有專門為紅石最佳化的服務端核心（如 **MCHPRS** 一類）：它砍掉了生存相關的負擔，把紅石運算速度拉到極高。

代價是**它不是一個正常的生存服**，很多原版機制並不完整。適合**測機器**，不適合開服給玩家玩。

## 五、選型總結

```
要真生电（机器必须精确）
   → Fabric / Leaves / Vanilla
   → 插件端无论怎么调，都达不到 100% 原版

要轻度生电 + 想用插件
   → Paper 系 + 上面第二节的配置调校
   → 接受"部分机器可能仍然不工作"

只要测红石电路
   → MCHPRS 一类专用核心
```

## 下一步

技術上跑通之後，伺服器能不能長久，靠的是經營：見 [經營管理](/tutorials/ops/management-java)。

## 生電篇

本篇講的是生電的通用原則。真正開一個生電服要落地的東西，寫成了下面這一組：

- [[生電篇]服務端選擇](/tutorials/java/sd-server)：Fabric 加 MCDR、生電最佳化端與多執行緒端的取捨。
- [[生電篇]Carpet 及其附屬包](/tutorials/java/sd-carpet)：規則系統、四個主流附屬包與防崩規則。
- [[生電篇]共享原理圖](/tutorials/java/sd-schematic)：把投影與放置同步給所有人。
- [[生電篇]最佳化 mod](/tutorials/java/sd-optimize)：哪些能放心裝、哪些會改時序。
- [[生電篇]存檔保護](/tutorials/java/sd-backup)：備份流程、Ledger 與異地備份。
- [[生電篇]配置最佳化](/tutorials/java/sd-config)：生電服到底有哪些開關可動。
- [[生電篇]世吞與切門](/tutorials/java/sd-machine)：世吞與更新抑制的風險控制。
- [[生電篇]為什麼不推薦反作弊](/tutorials/java/sd-anticheat)：生電服為什麼不該裝反作弊。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
