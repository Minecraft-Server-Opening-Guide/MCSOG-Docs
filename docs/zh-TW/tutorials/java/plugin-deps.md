---
title: 常用前置插件
slug: plugin-deps
cat: java
level: 2
order: 19
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, 前置, vault, placeholderapi, 權限]
updated: 2026-10-04
draft: false
---

裝插件時最常見的翻車方式，不是下錯了版本，而是**漏裝了前置**：插件明明放進了 `plugins/`，`/plugins` 裡卻是紅的，或者裝上了但功能缺一塊。

這篇講清楚前置是什麼、少了會怎樣，以及 Vault、PlaceholderAPI、ProtocolLib、LuckPerms 這四個最常被依賴的插件各自幹什麼。

## 1. 什麼是前置插件

插件之間是可以互相依賴的。作者在寫插件時，如果不想重複造輪子，就會聲明"我需要另一個插件提供的能力"，被需要的那個就是**前置（依賴，dependency）**。

依賴關係寫在插件 jar 內的 `plugin.yml` 裡，分兩種：

| 聲明 | 含義 | 缺了會怎樣 |
| --- | --- | --- |
| `depend`（硬前置） | 沒有它就沒法工作 | 插件**載入失敗**，`/plugins` 裡顯示紅色 |
| `softdepend`（軟前置） | 有它則啟用額外功能，沒有也能跑 | 插件正常載入，**相關功能靜默關閉** |

服務端啟動時會先載入前置、再載入依賴它的插件，這也是"前置必須裝在前面"的原因。

:::note 任何插件都可以是前置
前置並不是一類特殊的插件。理論上任何一個插件都能被別的插件聲明為依賴，只是下面這幾個因為被依賴得太多，慢慢就有了"前置插件"這個統稱。
:::

## 2. 少了前置會怎樣

症狀往往不像"報錯"那麼直白，認準這幾種表現能省很多時間：

| 現象 | 說明 |
| --- | --- |
| `/plugins` 裡顯示紅色 | 服務端認出了這個插件，但載入失敗，控制台一定有原因 |
| 控制台報 `Unknown dependency` | 最明確的一種：`plugin.yml` 裡聲明的硬前置不在 `plugins/` |
| 控制台報 `ClassNotFoundException` / `NoClassDefFoundError` | 程式碼裡引用了前置提供的類，但那個類不存在 |
| 插件裝上了，某個功能卻"沒反應" | 多半是軟前置缺失，功能被自動停用 |
| 變數原樣顯示成 `%player_name%` | 沒裝 PlaceholderAPI，或對應的變數擴充沒下載 |
| 經濟相關指令提示找不到經濟系統 | 裝了 Vault，但沒有真正提供經濟的插件 |

:::warn 先看控制台，再猜
插件載入失敗的原因一定寫在啟動日誌裡。**開啟 `logs/latest.log`，搜尋插件名**，比在群裡描述"我的插件紅了"快得多。
:::

## 3. 怎麼判斷一個插件需要前置

按可靠性從高到低：

1. **看插件發佈頁**。SpigotMC、Modrinth、Hangar、GitHub 的說明裡通常會寫 `Requires`、`Dependencies` 或"前置"一欄。
2. **看 jar 裡的 `plugin.yml`**。用壓縮軟體開啟 jar，找到 `plugin.yml`，裡面 `depend` 與 `softdepend` 兩行就是答案，最權威。
3. **看控制台報錯**。啟動時提示缺哪個，就去補哪個。
4. **看 `/plugins` 的顏色**。紅色條目先懷疑前置，再懷疑版本不匹配。
5. **看插件文件或 issue 區**。作者通常會把依賴和版本要求寫清楚。

## 4. Vault

**它是什麼**：Vault 是一個面向 Bukkit 系服務端的**抽象庫**。它自己不做任何具體功能，只是定義了一組介面，讓"需要經濟/權限/聊天能力的插件"和"真正實現這些能力的插件"能對上話。

**它不是經濟插件**。這一點最容易誤解：Vault 本身不產生任何貨幣，它只是一個統一介面。要真正有經濟系統，你還得裝一個經濟插件（如 XConomy、EssentialsX 的經濟模組、CMI），由它向 Vault 註冊服務，其他插件再通過 Vault 存取餘額。

| Vault 提供的介面 | 誰來實現 | 誰在呼叫 |
| --- | --- | --- |
| 經濟（Economy） | 經濟插件 | 商店、簽到、抽獎等 |
| 權限（Permission） | 權限插件（如 LuckPerms） | 需要判斷玩家權限的插件 |
| 聊天（Chat） | 聊天插件 | 需要傳送/格式化聊天的插件 |

**誰需要它**：只要你的插件列表裡出現"依賴 Vault"的條目，就裝上。服主不需要配置 Vault 的任何東西，裝上即可。

:::tip 版本標註可以忽略
Vault 同時支援舊版本和新版本的 Minecraft，不用在意 SpigotMC 頁面上標的適用版本。
:::

## 5. PlaceholderAPI

**它是什麼**：PlaceholderAPI（簡稱 PAPI）是一個變數佔位符系統。它把形如 `%变量扩展_参数%` 的文本，替換成其他插件提供的資訊。

```
%player_name%        玩家名
%player_level%       玩家等级
%vault_eco_balance%  玩家余额
%server_online%      在线人数
```

以 `%player_name%` 為例，`player` 是變數副檔名，`name` 是參數，意思是"取玩家名"。

**變數擴充**：PAPI 本體幾乎不提供變數，變數由一個個**擴充**提供。擴充可以在遊戲內從 eCloud 下載，目前有數百個，覆蓋 EssentialsX、LuckPerms、Vault 等大量插件。

```
/papi ecloud download Player     下载 Player 扩展
/papi list                       查看已安装的扩展
/papi info <扩展名>               查看某个扩展提供哪些变量
/papi reload                     重载 PAPI 与扩展
```

**除錯**：寫完變數先在遊戲裡驗一遍，別等玩家來報錯。

```
/papi parse me %player_name%
```

這條指令會把解析結果直接返回給你，`me` 表示以自己為上下文。

**變數巢狀**：把一個變數的解析結果塞進另一個變數的參數時，內層用 `{}` 代替 `%%`：

```
%math_2_{player_health}%
```

上例需要 math 擴充，作用是把玩家血量保留兩位小數。

**除了變數還能做什麼**：部分擴充提供了超出"取值"的能力，例如 Math（數學運算）、CheckItem（判斷玩家物品）、JavaScript（執行腳本）、Progress（生成進度條）。

**誰需要它**：TAB、記分板、全息圖、選單、聊天格式、MOTD 這類"要把別的插件的資料顯示出來"的插件，基本都靠 PAPI。它是插件端最值得提前裝好的插件之一。

## 6. ProtocolLib

**它是什麼**：ProtocolLib 提供了對 Minecraft 網路協議（資料包）的底層訪問能力，讓插件可以攔截、修改或主動傳送資料包，去做 Bukkit API 本身沒有暴露的事情。

**誰需要它**：它是**給插件開發者用的**。作為服主，你不需要配置它任何東西——如果某個插件要求 ProtocolLib，裝上就行。

| 專案 | 說明 |
| --- | --- |
| 需要配置嗎 | 不需要，裝上即用 |
| 版本選擇 | 1.8 至 1.19.4 用 5.0.0；更高版本用最新版 |
| 常見配置 | `plugins/ProtocolLib/config.yml` 裡可把 `auto updater.notify` 改為 `false` 關閉更新提示 |

:::warn 版本必須對得上
ProtocolLib 直接操作服務端內部實現，**版本不匹配時表現可能是整個服務端報錯甚至崩潰**，而不是插件自己出問題。升級服務端核心時，記得同步檢查它。
:::

## 7. LuckPerms

**它是什麼**：LuckPerms 是目前最主流的**權限插件**，用來管理"誰能用什麼指令、誰能進哪個世界、顯示什麼字首"。它支援 Bukkit/Spigot/Paper、BungeeCord、Velocity、Sponge、Fabric 等多種平台。

**核心概念**：

| 概念 | 作用 |
| --- | --- |
| 權限節點（permission） | 最小單位，形如 `essentials.fly`，`true` 為允許、`false` 為拒絕 |
| 組（group） | 一組權限的集合，如 `default`、`vip`、`admin` |
| 繼承（inheritance） | 組可以繼承其他組，`admin` 繼承 `vip` 就不必重複配置 |
| 上下文（context） | 讓權限只在特定世界、伺服器或模式下生效 |
| 字首 / 字尾（meta） | 供聊天、TAB 等插件讀取的顯示資訊 |

**常用指令**：

```
/lp user <玩家> permission set <节点> true
/lp group <组> permission set <节点> true
/lp group <组> parent add <父组>
/lp user <玩家> parent add <组>
/lp editor
```

`/lp editor` 會生成一個網頁編輯器的連結，圖形化改權限比敲指令直觀得多，改完點儲存即可生效。

**儲存**：預設使用檔案型儲存（H2/SQLite），資料在 `plugins/LuckPerms/` 下。**多服共用一套權限時，必須換成 MySQL/MariaDB 之類的資料庫**，否則每個服各管各的。

**它和 Vault 的關係**：LuckPerms 會向 Vault 註冊權限服務，所以那些"通過 Vault 判斷權限"的插件，裝完 LuckPerms 就能正常工作，不需要額外配置。

:::note 字首由誰顯示
LuckPerms 只負責存字首，**不負責把它顯示出來**。真正讓前綴出現在聊天欄或 TAB 裡的，是聊天插件（如 TrChat、Carbon）或 TAB 類插件，它們讀取 LuckPerms 裡的 meta 資訊。
:::

## 8. 安裝順序與搭配

前置要**先裝、先重啟**，再裝依賴它的插件。一套常見的起步順序：

| 順序 | 插件 | 理由 |
| --- | --- | --- |
| 1 | LuckPerms | 權限是其他插件判斷"能不能用"的基礎 |
| 2 | 經濟插件（XConomy / EssentialsX / CMI） | 給 Vault 提供真正的經濟實現 |
| 3 | Vault | 讓經濟、權限、聊天有統一介面可用 |
| 4 | PlaceholderAPI | 裝完再按需下載變數擴充 |
| 5 | ProtocolLib | 只在有插件明確要求時裝 |
| 6 | 其他功能插件 | 商店、選單、稱號、TAB 等 |

:::tip 裝完先驗證再繼續
每裝一個前置就重啟一次，確認 `/plugins` 裡是綠色的。一次性把十幾個插件全丟進去，出問題時排查成本會成倍上升。
:::

## 9. 排查清單

| 檢查項 | 怎麼確認 |
| --- | --- |
| 前置是否真的在 `plugins/` 裡 | 看檔名與字尾是否為 `.jar` |
| 是不是硬前置缺失 | 控制台搜 `Unknown dependency` |
| 是不是軟前置缺失 | 功能沒反應但插件是綠的，翻插件文件確認它依賴誰 |
| 版本是否匹配 | 對照插件發佈頁寫明的服務端版本與前置版本 |
| 變數不解析 | 確認裝了 PAPI、下載了對應擴充，再用 `/papi parse me` 驗證 |
| 經濟不可用 | 確認裝了 Vault **以及**一個真正的經濟插件 |
| 權限不生效 | 用 `/lp user <玩家> permission check <节点>` 看判定結果 |
| 改完沒生效 | 用插件自己的 reload 指令，或直接重啟 |

## 下一步

前置裝好後，接著就要改它們的配置了：見 [插件配置基礎](/tutorials/java/plugin-config)。還沒裝過插件的話，從 [插件入門](/tutorials/java/plugins) 開始；權限的完整玩法可以配合 [常用服務端指令](/tutorials/java/commands) 一起看。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
