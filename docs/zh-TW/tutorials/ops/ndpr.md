---
title: "NDPReforged 聯合封禁系統"
slug: ndpr
cat: ops
level: 3
order: 26
minutes: 16
tags: [聯合封禁, NDPR, 反作弊, 插件, 配置, 維運]
updated: 2026-10-04
draft: false
---

**NDPReforged（NDPR）** 是一套跨平台的 **Minecraft 伺服器聯合封禁系統**：多台伺服器共用同一份封禁資料庫，做到**統一封禁、即時同步**。它基於 RESTful API 構建，官方文件在 <https://ndpreforged.com/wiki.php>，官網與服主後台在 <https://ndpreforged.com/>。

本篇按官方文件（當前版本 **2.1.0**，文件最後更新 2026-08-16）整理，所有設定項與預設值均以官方文件為準。

## 一、它解決什麼問題

單機封禁的痛點：你在 A 服封了某個破壞者，他去 B 服照樣能玩；幾個服主之間只能靠截圖和口頭通知。NDPR 把封禁資料放到雲端，所有接入的伺服器**共享同一份名單**。

官方給出的核心特性：

| 特性 | 說明 |
| --- | --- |
| 安全認證 | Token 認證 + 權限控制 |
| 跨平台支援 | MCDR、Bukkit/Paper、Mod（Fabric/Forge/NeoForge）、Velocity/BungeeCord、基岩版 |
| 即時同步 | 多伺服器封禁資料即時同步 |
| HWID 裝置驗證 | 瀏覽器指紋採集，反作弊機器驗證 |
| 封禁審核 | 提交封禁申請，雲端審核後同步 |
| 資料統計 | 完整的攔截統計功能 |
| 舊版相容 | 相容舊版 NDP 協議 |

架構上分為四層：**管理後台（Web）→ API 服務層（Token 鑑權 / 封禁管理 / 使用者管理 / 資料推送 / HWID 裝置驗證 / 審核）→ 資料層（MySQL）**。

## 二、支援矩陣

| 服務端 | 支援狀態 |
| --- | --- |
| MCDR 2.8+ | 已支援 |
| Java：Spigot / Bukkit / Paper / Folia | 已支援 |
| Fabric / Forge / NeoForge（Mod） | 已支援 |
| Velocity / BungeeCord（代理端） | 已支援 |
| 基岩版：LeviLamina / BDSX / BDSpyrunner / gomint / Allay / Nukkit | 已支援 |

:::tip 代理端最省事
在 **Velocity 或 BungeeCord** 上裝一次，**所有下游子服自動獲得封禁防護**，不需要逐個子服裝客戶端。
:::

## 三、安裝

### 1. MCDR（Java 版）

要求：**MCDR 2.8+**，**Python 3.8+**。

```bash
!!MCDR plugin install ndpr
```

也可以從 GitHub 發佈頁手動下載，把檔案放進 MCDR 的插件目錄。

### 2. 插件端（Bukkit / Spigot / Paper / Folia）

要求：**MC 1.20.1+**，**Java 17+**。

1. 把 `NDPR-Bukkit-2.1.0.jar` 放進服務端 `plugins/` 目錄
2. 啟動服務端，插件自動生成設定檔

**一個 jar 通用於 Bukkit / Spigot / Paper / Folia。**

### 3. Mod（Fabric / Forge / NeoForge）

支援版本：**1.20.4 / 1.20.6 / 1.21.1 / 1.21.4 / 1.21.6 / 1.21.9 / 1.21.11 / 26.2**。

把 `NDPR-MOD-2.1.0.jar` 放進 `mods/` 目錄，啟動遊戲或服務端。**同一個 jar 同時支援三種載入器。**

### 4. 代理端（Velocity / BungeeCord）

要求：**Velocity 3.x** 或 **BungeeCord（MC 1.20.1+）**，**Java 17+**。

把 `ndpr-proxy.jar` 放進代理端 `plugins/` 目錄，重啟代理端。

### 5. 基岩版

| 平台 | 安裝方式 |
| --- | --- |
| BDSpyrunner | 將 `ndpr.py` 放入 `plugins/` 目錄 |
| BDSX | npm 包放入 `plugins/ndpr/` 目錄 |
| LeviLamina | `plugins/ndpr/`（dll + `manifest.json`） |
| Nukkit / Allay / gomint | 將 `ndpr.jar` 放入 `plugins/` 目錄 |

## 四、配置（五步）

### 第 1 步：獲取 UUID

**MCDR 端**，兩種方式：

方式一，從啟動日誌裡找：

```text
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: 服务器类型: xx
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: UUID: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
[MCDR] [20:21:34] [TaskExecutor/INFO] [ndpr]: NDPR插件已加载
```

方式二，第二次啟動後從設定檔讀，目錄 `MCDR根目录\config\ndpr\config.toml`：

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
```

**其他所有平台**（插件端 / Mod / 代理端 / 基岩版）**首次啟動都會自動獲取 UUID 並寫入設定檔**，無需手動填寫。需要手動確認時按下表找：

| 平台 | 設定檔位置 | 欄位 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `uuid` |
| Mod | `.minecraft/config/ndpr.json` | `uuid` |
| Velocity | `plugins/ndpr/config.toml` | `uuid` |
| BungeeCord | `plugins/NDPReforged-Proxy/config.toml` | `uuid` |
| 基岩版（BDSpyrunner/BDSX/LeviLamina/Nukkit/Allay/gomint） | `plugins/ndpr/config.json` | `uuid` |

### 第 2 步：獲取 Token

1. 開啟官網 <https://ndpreforged.com/>，點上方或左上角的 **服主管理**
2. 登入或註冊帳號（滑塊驗證拖慢一點更容易通過）
3. 點左側 **Token 管理**
4. 在“建立新 Token”處填寫上一步的 UUID，生成 Token
5. 可選：點左側 **上傳權限**，在 Token 旁申請上傳權限並等待審核

### 第 3 步：配置 Token

**MCDR 端**（`MCDR根目录\config\ndpr\config.toml`）：

```toml
token = "xxxxxxxxxxxxxxxxxxxx"
```

其他平台的欄位位置：

| 平台 | 設定檔 | 欄位 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `token` |
| Mod | `.minecraft/config/ndpr.json` | `token` |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `token` |
| 基岩版 | `plugins/ndpr/config.json` | `token` |

:::warn Token 不填等於沒裝
**Token 用於啟用封禁功能，不配置則插件不會執行封禁檢查。** 只裝插件不填 Token，防護是空的。
:::

### 第 4 步：配置伺服器類型

**MCDR 端**：

```toml
onlinemode = true   # true = 正版服, false = 离线服
```

| 平台 | 設定檔 | 欄位 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `onlinemode`（必填） |
| Mod | `.minecraft/config/ndpr.json` | `onlinemode`（必填） |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `onlinemode`（留空使用代理自身模式） |
| 基岩版 | `plugins/ndpr/config.json` | `onlinemode`（Bedrock 統一 Xbox 登入，透傳） |

:::warn Java 版必須填 onlinemode
**Java 版各平台的 `onlinemode` 為必填項，否則插件不會正常載入。**
:::

### 第 5 步：其他設定項

| 設定項 | 說明 | 預設值 |
| --- | --- | --- |
| `api_url` | API 位址 | `https://api.ndpreforged.com` |
| `language` | 語言（`zh_CN` / `en_us`） | `zh_CN` |
| `download_interval` | 封禁庫自動更新間隔（秒），`0` = 停用 | `900` |
| `check_hwid` | 啟用 HWID 裝置驗證 | `false` |
| `check_interval` | 驗證通過後免檢天數 | `3` |
| `fail_closed` | 封禁庫缺失時拒絕進服（安全優先） | `false` |
| `verify_timeout` | HWID 驗證逾時（秒，30~600） | `60` |
| `freeze_interval` | 驗證期間釘回座標間隔（秒，1~60） | `1` |

**MCDR 端完整示例**（`MCDR根目录\config\ndpr\config.toml`）：

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
token = "xxxxxxxxxxxxxxxxxxxx"
onlinemode = true
api_url = "https://api.ndpreforged.com"
language = "zh_CN"
download_interval = 900
check_hwid = false
check_interval = 3
fail_closed = false
verify_timeout = 60
freeze_interval = 1
```

## 五、指令

### MCDR 端

主指令 `!!NDPR` 或 `!!ndpr`。

| 指令 | 描述 |
| --- | --- |
| `ban <ID> <原因>` | 封禁玩家 |
| `check <ID>` | 檢查玩家封禁狀態 |
| `download` / `d` | 更新封禁資料 |
| `checkupdate` / `cu` | 檢查更新 |
| `help` | 顯示幫助資訊 |
| `reload` | 過載設定檔 |
| `auth <玩家>` | 強制觸發玩家裝置驗證 |

### 其他平台（插件端 / Mod / 代理端 / 基岩版）

指令字首統一為 `/ndpr`（代理端與基岩版沒有 `!!` 字首指令）。

| 指令 | 描述 | 權限 |
| --- | --- | --- |
| `/ndpr`、`/ndpr help` | 幫助資訊 | 所有人 |
| `/ndpr d`、`/ndpr download` | 手動下載封禁資料庫 | `ndpr.admin` |
| `/ndpr ban <玩家> <原因>` | 提交封禁審核 | `ndpr.admin` |
| `/ndpr check <ID/IP/UUID>` | 檢查封禁狀態（未命中時給出模糊建議） | 所有人 |
| `/ndpr reload` | 過載配置並重新下載封禁庫 | `ndpr.admin` |
| `/ndpr cu`、`/ndpr checkupdate` | 檢查插件更新 | `ndpr.admin` |
| `/ndpr auth <玩家>` | 強制觸發玩家裝置驗證 | `ndpr.admin` |

`ndpr.admin` 預設授予 **OP**（MCDR 為權限等級 2）。

## 六、幾個需要你自己權衡的點

1. **`fail_closed`：安全 vs 可用性**。預設 `false` —— 雲端封禁庫拉不下來時**放行**，伺服器照常能用；改成 `true` 則**拒絕進服**，安全優先，但云端故障時玩家會被擋在門外。公開服與朋友服的選擇可能相反。
2. **`check_hwid`：反作弊 vs 隱私**。開啟後會用**瀏覽器指紋採集**做機器驗證（配套 `verify_timeout` 驗證逾時、`freeze_interval` 驗證期間釘回座標間隔、`check_interval` 免檢天數）。這是**比 IP 更強的識別手段**，但也涉及玩家裝置資訊採集 —— 官方文件說明了用途，**你應當在伺服器規則裡向玩家說明**再開啟。
3. **`download_interval`**：預設 900 秒（15 分鐘）同步一次。調太小會增加請求頻率，調太大則封禁生效變慢；`0` 表示停用自動更新（那就只能靠 `/ndpr d` 手動拉取）。
4. **代理端優先**：如果是 Velocity/BungeeCord 架構，裝在代理端一次即可覆蓋全部子服，比逐子服安裝更不容易漏。

## 七、排錯速查

| 現象 | 先查什麼 |
| --- | --- |
| 插件載入了但沒有任何攔截 | **Token 是否填寫**（不填 = 不檢查） |
| 插件不載入 / 不生效 | Java 版的 **`onlinemode` 是否填寫**（必填） |
| 封禁庫拉不下來 | `api_url` 是否正確（預設 `https://api.ndpreforged.com`）、`download_interval` 是否為 `0`、以及主機能否訪問外網 |
| 玩家被封禁後仍能進 | 是否裝在**代理端**、子服是否繞過代理直連、封禁庫是否已同步 |
| 想手動重新整理名單 | `/ndpr d`（MCDR 用 `!!ndpr d`） |
| 想改配置後立即生效 | `/ndpr reload`（會過載配置並重新下載封禁庫） |

## 下一步

- 伺服器被攻擊、被壓測時怎麼辦：見 [常見網路攻擊類型與 Minecraft 專項防禦](/tutorials/ops/attack-defense)
- 記錄與回滾、權限與登入插件：見 [[JAVA] 安全插件](/tutorials/ops/security-java)
- 玩家與運營管理：見 [[JAVA] 經營管理](/tutorials/ops/management-java)

---

> 本篇內容與設定項預設值取自 NDPReforged 官方文件（<https://ndpreforged.com/wiki.php>，版本 2.1.0）；官方更新後請以官方文件為準。
