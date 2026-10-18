---
title: 常用服務端指令
slug: commands
cat: java
level: 1
order: 9
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 指令, 指令, op, ban, whitelist, 控制台]
updated: 2026-10-04
draft: false
---

日常管理伺服器，來來回回就是這些指令。**在服務端控制台裡執行不需要加 `/`**，在遊戲內聊天框裡執行要加 `/`。

## 一、開關與儲存

| 指令 | 作用 |
| --- | --- |
| `stop` | **安全關閉**伺服器（先儲存再退出）。**永遠用它關服，不要直接叉視窗** |
| `save-all` | 立即儲存全部世界資料 |
| `save-off` / `save-on` | 關閉 / 恢復自動儲存（**備份前**先關，避免備份到寫入一半的存檔） |
| `reload` | 過載資料包與部分配置。**慎用**：可能讓插件狀態錯亂，能用插件自己的 `reload` 就別用它 |
| `restart` | 重啟服務端（部分核心支援） |

:::tip 關服的標準姿勢
`save-all` → `save-off` → 備份 → `stop`。直接把視窗叉掉可能導致存檔損壞或資料回滾。
:::

## 二、玩家管理

| 指令 | 作用 |
| --- | --- |
| `list` | 列出**當前線上**玩家 |
| `kick <玩家> [原因]` | 踢出玩家，**他還能重新進** |
| `ban <玩家> [原因]` | 封禁玩家，**不解封就進不來** |
| `pardon <玩家>` | 解封玩家（老版本可能是 `unban`） |
| `ban-ip <IP>` | 按 IP 封禁（**該 IP 下所有人都進不來**，慎用） |
| `pardon-ip <IP>` | 解封 IP |
| `op <玩家>` | 給予 OP（管理員）權限 |
| `deop <玩家>` | 撤銷 OP |

### 白名單

```
whitelist on                  开启白名单
whitelist add <玩家>          添加
whitelist remove <玩家>       移除
whitelist list                查看名单
whitelist reload              从 whitelist.json 重新读取
```

用指令改完後名單會寫入 `whitelist.json`；如果你**直接編輯了這個檔案**，記得執行 `whitelist reload` 讓它生效。

## 三、插件與排查

| 指令 | 作用 |
| --- | --- |
| `plugins`（簡寫 `pl`） | 列出插件。**綠色 = 已載入**，**紅色 = 載入失敗**（去控制台看報錯） |
| `version <插件>` | 檢視插件版本 |
| `help` | 幫助 |

如果某個插件**連紅色都沒有**，說明服務端根本沒把它識別為插件——通常是檔案沒放進 `plugins/`、字尾不對，或核心類型不匹配。

### 不想讓玩家看到插件列表

`plugins`、`version`、`help` 這三條指令的權限預設是放開的，所有人都能執行。想關掉，把下面這些權限節點設為 `false`：

```
bukkit.command.plugins
bukkit.command.version
bukkit.command.help
```

:::warn 關掉指令不等於藏得住
部分作弊客戶端能通過 **Tab 補全**的響應反推出已安裝的插件。真的在意，需要額外裝隱藏類插件（如 PluginHide 一類）來處理。
:::

## 四、遊戲內常用的管理指令

| 指令 | 作用 |
| --- | --- |
| `gamemode <模式> [玩家]` | 切換遊戲模式 |
| `tp <玩家> <目标>` | 傳送 |
| `give <玩家> <物品> [数量]` | 給予物品 |
| `time set day` / `weather clear` | 調時間 / 天氣 |
| `difficulty <难度>` | 改難度 |
| `gamerule <规则> <值>` | 改遊戲規則 |
| `say <内容>` | 以伺服器身份廣播 |
| `whitelist` / `op` 等 | 同上（遊戲內需 OP） |

## 五、權限與 Tab 補全

- 原版伺服器用 **OP 等級**控制權限；裝了權限插件（如 LuckPerms）後，改用**權限節點 + 權限組**精細控制，比給 OP 安全得多。
- **Tab 補全**能補出指令與參數，是排查"這條指令到底存不存在"的最快方式；玩家側也能用它發現伺服器裝了哪些插件（見上）。

## 下一步

指令熟練之後，就該上工具與插件了：見 [MCDR 服務端管理器](/tutorials/java/mcdr) 與 [插件入門](/tutorials/java/plugins)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
