---
title: 配置服務端
slug: config
cat: java
level: 1
order: 7
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 配置, server.properties, 正版驗證, 視距, gamerule]
updated: 2026-10-04
draft: false
---

伺服器第一次啟動後，根目錄會生成 `server.properties`。**改完必須重啟服務端才生效**（它不是熱過載的）。

用文字編輯器開啟它，下面是最常改的幾項。

## 一、最常改的選項

| 選項 | 預設 | 說明 |
| --- | --- | --- |
| `server-port` | `25565` | 服務端監聽埠，改了要同步改防火牆/安全組 |
| `online-mode` | `true` | **正版驗證**。保持 `true` 時非正版客戶端無法進入；改 `false` 即離線模式 |
| `max-players` | `20` | 最大同時線上人數 |
| `motd` | — | 伺服器列表裡顯示的那行字（支援顏色程式碼） |
| `difficulty` | `easy` | `peaceful`/`easy`/`normal`/`hard`（也接受 `0`~`3`） |
| `gamemode` | `survival` | 新玩家預設模式：`survival`/`creative`/`adventure`/`spectator` |
| `force-gamemode` | `false` | 設為 `true` 時，玩家每次進服都被強制改回預設模式 |
| `pvp` | `true` | 是否允許玩家互相攻擊 |
| `allow-flight` | `false` | 生存模式是否允許飛行（裝了飛行類插件建議開） |
| `spawn-protection` | `16` | 出生點保護半徑，只有 OP 能在此範圍內破壞/放置；`0` 為關閉 |
| `allow-nether` | `true` | 是否允許前往下界（`false` 會停用下界） |
| `generate-structures` | `true` | 新區塊是否生成村莊等結構 |
| `level-seed` | 空 | 世界種子，留空為隨機 |
| `enable-command-block` | `false` | 是否啟用指令方塊，**一般不建議開啟**（見下） |
| `white-list` | `false` | 是否啟用白名單 |
| `view-distance` | `10` | **視距**，最影響效能的選項之一 |
| `simulation-distance` | `10` | **模擬距離**，決定多遠範圍內的實體/紅石還在運算 |

### 關於視距與模擬距離

這兩個是**效能開銷最大的旋鈕**，比換核心更立竿見影：

- `view-distance` 決定玩家能"看見"多遠，調低能顯著省頻寬與 CPU，但遠處會霧濛濛。
- `simulation-distance` 決定多遠的區塊還在**真實運算**（刷怪、紅石、作物生長）。調低它比調低視距省得更多，且不影響觀感。

:::tip 先調這兩個，再考慮升級硬體
很多"伺服器卡"其實把 `simulation-distance` 從 10 降到 6 就能明顯緩解。
:::

### 關於指令方塊

`enable-command-block` 預設關閉，且**多數情況下不建議開啟**：指令方塊在服務端的實現效率較低，而它的功能幾乎都能用插件更高效地實現（且插件還能做權限控制與審計）。確實需要原版指令方塊玩法時再開啟。

## 二、正版驗證與離線模式

- `online-mode=true`（預設）：會向 Mojang 校驗帳號，非正版客戶端進不來。
- `online-mode=false`：任何人可進，但**任何人都能冒用任意 ID**，也無法使用正版皮膚與 UUID 繫結。

如果因為特殊原因必須用離線模式，通常還要配 `SkinsRestorer` 之類的皮膚插件來補回皮膚顯示。

:::warn 離線模式的代價
離線模式下帳號沒有任何保障：封禁可以換個 ID 繞過，管理員權限也更容易被冒用。**公開服不建議關閉正版驗證。**
:::

## 三、遊戲規則（gamerule）

難度、出生點保護這類在 `server.properties` 裡改；而**遊戲規則要用指令改**：

```
/gamerule keepInventory true        死亡不掉落
/gamerule doDaylightCycle false     關閉晝夜更替
/gamerule mobGriefing false         苦力怕不破壞方塊
/gamerule announceAdvancements false 不公告進度達成
```

在控制台或遊戲內（需 OP）執行即可，**立即生效且會被儲存**。

## 四、改配置的通用姿勢

1. **先停服**再改 `server.properties`（改世界相關配置時尤其要停，避免存檔寫入衝突）。
2. 改完**先備份原檔案**，出問題能立刻還原。
3. 重啟後看 `logs/latest.log` 確認沒有配置報錯。
4. 插件配置在 `plugins/插件名/config.yml`，多數支援 `/插件名 reload` 熱過載——但**服務端自身的配置不支援**。

## 下一步

配置完成後，把它部署到能被別人訪問的環境：見 [部署到可存取環境](/tutorials/java/deploy)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
