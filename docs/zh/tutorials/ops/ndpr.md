---
title: "NDPReforged 联合封禁系统"
slug: ndpr
cat: ops
level: 3
order: 26
minutes: 16
tags: [联合封禁, NDPR, 反作弊, 插件, 配置, 运维]
updated: 2026-10-04
draft: false
---

**NDPReforged（NDPR）** 是一套跨平台的 **Minecraft 服务器联合封禁系统**：多台服务器共用同一份封禁数据库，做到**统一封禁、实时同步**。它基于 RESTful API 构建，官方文档在 <https://ndpreforged.com/wiki.php>，官网与服主后台在 <https://ndpreforged.com/>。

本篇按官方文档（当前版本 **2.1.0**，文档最后更新 2026-08-16）整理，所有配置项与默认值均以官方文档为准。

## 一、它解决什么问题

单机封禁的痛点：你在 A 服封了某个破坏者，他去 B 服照样能玩；几个服主之间只能靠截图和口头通知。NDPR 把封禁数据放到云端，所有接入的服务器**共享同一份名单**。

官方给出的核心特性：

| 特性 | 说明 |
| --- | --- |
| 安全认证 | Token 认证 + 权限控制 |
| 跨平台支持 | MCDR、Bukkit/Paper、Mod（Fabric/Forge/NeoForge）、Velocity/BungeeCord、基岩版 |
| 实时同步 | 多服务器封禁数据即时同步 |
| HWID 设备验证 | 浏览器指纹采集，反作弊机器验证 |
| 封禁审核 | 提交封禁申请，云端审核后同步 |
| 数据统计 | 完整的拦截统计功能 |
| 旧版兼容 | 兼容旧版 NDP 协议 |

架构上分为四层：**管理后台（Web）→ API 服务层（Token 鉴权 / 封禁管理 / 用户管理 / 数据推送 / HWID 设备验证 / 审核）→ 数据层（MySQL）**。

## 二、支持矩阵

| 服务端 | 支持状态 |
| --- | --- |
| MCDR 2.8+ | 已支持 |
| Java：Spigot / Bukkit / Paper / Folia | 已支持 |
| Fabric / Forge / NeoForge（Mod） | 已支持 |
| Velocity / BungeeCord（代理端） | 已支持 |
| 基岩版：LeviLamina / BDSX / BDSpyrunner / gomint / Allay / Nukkit | 已支持 |

:::tip 代理端最省事
在 **Velocity 或 BungeeCord** 上装一次，**所有下游子服自动获得封禁防护**，不需要逐个子服装客户端。
:::

## 三、安装

### 1. MCDR（Java 版）

要求：**MCDR 2.8+**，**Python 3.8+**。

```bash
!!MCDR plugin install ndpr
```

也可以从 GitHub 发布页手动下载，把文件放进 MCDR 的插件目录。

### 2. 插件端（Bukkit / Spigot / Paper / Folia）

要求：**MC 1.20.1+**，**Java 17+**。

1. 把 `NDPR-Bukkit-2.1.0.jar` 放进服务端 `plugins/` 目录
2. 启动服务端，插件自动生成配置文件

**一个 jar 通用于 Bukkit / Spigot / Paper / Folia。**

### 3. Mod（Fabric / Forge / NeoForge）

支持版本：**1.20.4 / 1.20.6 / 1.21.1 / 1.21.4 / 1.21.6 / 1.21.9 / 1.21.11 / 26.2**。

把 `NDPR-MOD-2.1.0.jar` 放进 `mods/` 目录，启动游戏或服务端。**同一个 jar 同时支持三种加载器。**

### 4. 代理端（Velocity / BungeeCord）

要求：**Velocity 3.x** 或 **BungeeCord（MC 1.20.1+）**，**Java 17+**。

把 `ndpr-proxy.jar` 放进代理端 `plugins/` 目录，重启代理端。

### 5. 基岩版

| 平台 | 安装方式 |
| --- | --- |
| BDSpyrunner | 将 `ndpr.py` 放入 `plugins/` 目录 |
| BDSX | npm 包放入 `plugins/ndpr/` 目录 |
| LeviLamina | `plugins/ndpr/`（dll + `manifest.json`） |
| Nukkit / Allay / gomint | 将 `ndpr.jar` 放入 `plugins/` 目录 |

## 四、配置（五步）

### 第 1 步：获取 UUID

**MCDR 端**，两种方式：

方式一，从启动日志里找：

```text
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: 服务器类型: xx
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: UUID: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
[MCDR] [20:21:34] [TaskExecutor/INFO] [ndpr]: NDPR插件已加载
```

方式二，第二次启动后从配置文件读，目录 `MCDR根目录\config\ndpr\config.toml`：

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
```

**其他所有平台**（插件端 / Mod / 代理端 / 基岩版）**首次启动都会自动获取 UUID 并写入配置文件**，无需手动填写。需要手动确认时按下表找：

| 平台 | 配置文件位置 | 字段 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `uuid` |
| Mod | `.minecraft/config/ndpr.json` | `uuid` |
| Velocity | `plugins/ndpr/config.toml` | `uuid` |
| BungeeCord | `plugins/NDPReforged-Proxy/config.toml` | `uuid` |
| 基岩版（BDSpyrunner/BDSX/LeviLamina/Nukkit/Allay/gomint） | `plugins/ndpr/config.json` | `uuid` |

### 第 2 步：获取 Token

1. 打开官网 <https://ndpreforged.com/>，点上方或左上角的 **服主管理**
2. 登录或注册账号（滑块验证拖慢一点更容易通过）
3. 点左侧 **Token 管理**
4. 在“创建新 Token”处填写上一步的 UUID，生成 Token
5. 可选：点左侧 **上传权限**，在 Token 旁申请上传权限并等待审核

### 第 3 步：配置 Token

**MCDR 端**（`MCDR根目录\config\ndpr\config.toml`）：

```toml
token = "xxxxxxxxxxxxxxxxxxxx"
```

其他平台的字段位置：

| 平台 | 配置文件 | 字段 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `token` |
| Mod | `.minecraft/config/ndpr.json` | `token` |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `token` |
| 基岩版 | `plugins/ndpr/config.json` | `token` |

:::warn Token 不填等于没装
**Token 用于启用封禁功能，不配置则插件不会执行封禁检查。** 只装插件不填 Token，防护是空的。
:::

### 第 4 步：配置服务器类型

**MCDR 端**：

```toml
onlinemode = true   # true = 正版服, false = 离线服
```

| 平台 | 配置文件 | 字段 |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `onlinemode`（必填） |
| Mod | `.minecraft/config/ndpr.json` | `onlinemode`（必填） |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `onlinemode`（留空使用代理自身模式） |
| 基岩版 | `plugins/ndpr/config.json` | `onlinemode`（Bedrock 统一 Xbox 登录，透传） |

:::warn Java 版必须填 onlinemode
**Java 版各平台的 `onlinemode` 为必填项，否则插件不会正常加载。**
:::

### 第 5 步：其他配置项

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `api_url` | API 地址 | `https://api.ndpreforged.com` |
| `language` | 语言（`zh_CN` / `en_us`） | `zh_CN` |
| `download_interval` | 封禁库自动更新间隔（秒），`0` = 禁用 | `900` |
| `check_hwid` | 启用 HWID 设备验证 | `false` |
| `check_interval` | 验证通过后免检天数 | `3` |
| `fail_closed` | 封禁库缺失时拒绝进服（安全优先） | `false` |
| `verify_timeout` | HWID 验证超时（秒，30~600） | `60` |
| `freeze_interval` | 验证期间钉回坐标间隔（秒，1~60） | `1` |

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

## 五、命令

### MCDR 端

主命令 `!!NDPR` 或 `!!ndpr`。

| 命令 | 描述 |
| --- | --- |
| `ban <ID> <原因>` | 封禁玩家 |
| `check <ID>` | 检查玩家封禁状态 |
| `download` / `d` | 更新封禁数据 |
| `checkupdate` / `cu` | 检查更新 |
| `help` | 显示帮助信息 |
| `reload` | 重载配置文件 |
| `auth <玩家>` | 强制触发玩家设备验证 |

### 其他平台（插件端 / Mod / 代理端 / 基岩版）

命令前缀统一为 `/ndpr`（代理端与基岩版没有 `!!` 前缀命令）。

| 命令 | 描述 | 权限 |
| --- | --- | --- |
| `/ndpr`、`/ndpr help` | 帮助信息 | 所有人 |
| `/ndpr d`、`/ndpr download` | 手动下载封禁数据库 | `ndpr.admin` |
| `/ndpr ban <玩家> <原因>` | 提交封禁审核 | `ndpr.admin` |
| `/ndpr check <ID/IP/UUID>` | 检查封禁状态（未命中时给出模糊建议） | 所有人 |
| `/ndpr reload` | 重载配置并重新下载封禁库 | `ndpr.admin` |
| `/ndpr cu`、`/ndpr checkupdate` | 检查插件更新 | `ndpr.admin` |
| `/ndpr auth <玩家>` | 强制触发玩家设备验证 | `ndpr.admin` |

`ndpr.admin` 默认授予 **OP**（MCDR 为权限等级 2）。

## 六、几个需要你自己权衡的点

1. **`fail_closed`：安全 vs 可用性**。默认 `false` —— 云端封禁库拉不下来时**放行**，服务器照常能用；改成 `true` 则**拒绝进服**，安全优先，但云端故障时玩家会被挡在门外。公开服与朋友服的选择可能相反。
2. **`check_hwid`：反作弊 vs 隐私**。开启后会用**浏览器指纹采集**做机器验证（配套 `verify_timeout` 验证超时、`freeze_interval` 验证期间钉回坐标间隔、`check_interval` 免检天数）。这是**比 IP 更强的识别手段**，但也涉及玩家设备信息采集 —— 官方文档说明了用途，**你应当在服务器规则里向玩家说明**再开启。
3. **`download_interval`**：默认 900 秒（15 分钟）同步一次。调太小会增加请求频率，调太大则封禁生效变慢；`0` 表示禁用自动更新（那就只能靠 `/ndpr d` 手动拉取）。
4. **代理端优先**：如果是 Velocity/BungeeCord 架构，装在代理端一次即可覆盖全部子服，比逐子服安装更不容易漏。

## 七、排错速查

| 现象 | 先查什么 |
| --- | --- |
| 插件加载了但没有任何拦截 | **Token 是否填写**（不填 = 不检查） |
| 插件不加载 / 不生效 | Java 版的 **`onlinemode` 是否填写**（必填） |
| 封禁库拉不下来 | `api_url` 是否正确（默认 `https://api.ndpreforged.com`）、`download_interval` 是否为 `0`、以及主机能否访问外网 |
| 玩家被封禁后仍能进 | 是否装在**代理端**、子服是否绕过代理直连、封禁库是否已同步 |
| 想手动刷新名单 | `/ndpr d`（MCDR 用 `!!ndpr d`） |
| 想改配置后立即生效 | `/ndpr reload`（会重载配置并重新下载封禁库） |

## 下一步

- 服务器被攻击、被压测时怎么办：见 [常见网络攻击类型与 Minecraft 专项防御](/tutorials/ops/attack-defense)
- 记录与回滚、权限与登录插件：见 [[JAVA] 安全插件](/tutorials/ops/security-java)
- 玩家与运营管理：见 [[JAVA] 经营管理](/tutorials/ops/management-java)

---

> 本篇内容与配置项默认值取自 NDPReforged 官方文档（<https://ndpreforged.com/wiki.php>，版本 2.1.0）；官方更新后请以官方文档为准。
