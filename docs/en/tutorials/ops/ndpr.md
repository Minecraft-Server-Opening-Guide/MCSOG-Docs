---
title: "NDPReforged Shared Ban System"
slug: ndpr
cat: ops
level: 3
order: 26
minutes: 16
tags: [shared-ban, ndpr, anticheat, plugin, configuration, ops]
updated: 2026-10-04
draft: false
---

**NDPReforged (NDPR)** is a cross-platform **shared ban system for Minecraft servers**: several servers use one ban database, so bans are **unified and synchronised in real time**. It is built on a RESTful API. The official documentation is at <https://ndpreforged.com/wiki.php> and the site and owner console are at <https://ndpreforged.com/>.

This page follows the official documentation (current version **2.1.0**, documentation last updated 2026-08-16). Every configuration key and default value comes from that documentation.

## 1. What problem it solves

Per-server bans have an obvious hole: you ban a griefer on server A and they simply join server B, and owners can only warn each other by screenshot. NDPR keeps the ban data in the cloud so every connected server **shares one list**.

The official feature list:

| Feature | Description |
| --- | --- |
| Secure authentication | Token authentication plus permission control |
| Cross-platform | MCDR, Bukkit/Paper, Mods (Fabric/Forge/NeoForge), Velocity/BungeeCord, Bedrock |
| Real-time sync | Ban data syncs instantly across servers |
| HWID verification | Browser fingerprinting for machine-level verification |
| Ban review | Submit a ban request and it syncs after cloud review |
| Statistics | Full interception statistics |
| Legacy compatible | Compatible with the older NDP protocol |

Architecturally there are four layers: **web admin console → API service layer (token auth, ban management, user management, data push, HWID verification, review) → data layer (MySQL)**.

## 2. Supported platforms

| Server software | Status |
| --- | --- |
| MCDR 2.8+ | Supported |
| Java: Spigot / Bukkit / Paper / Folia | Supported |
| Fabric / Forge / NeoForge (mods) | Supported |
| Velocity / BungeeCord (proxies) | Supported |
| Bedrock: LeviLamina / BDSX / BDSpyrunner / gomint / Allay / Nukkit | Supported |

:::tip Installing on the proxy is the least work
Install once on **Velocity or BungeeCord** and **every downstream server is protected automatically** — you do not install a client on each backend.
:::

## 3. Installation

### 3.1 MCDR (Java Edition)

Requires **MCDR 2.8+** and **Python 3.8+**.

```bash
!!MCDR plugin install ndpr
```

You can also download it from the GitHub releases page and place the file in MCDR's plugin directory.

### 3.2 Plugin (Bukkit / Spigot / Paper / Folia)

Requires **MC 1.20.1+** and **Java 17+**.

1. Put `NDPR-Bukkit-2.1.0.jar` into the server's `plugins/` directory
2. Start the server; the plugin generates its configuration automatically

**A single jar works across Bukkit / Spigot / Paper / Folia.**

### 3.3 Mod (Fabric / Forge / NeoForge)

Supported versions: **1.20.4 / 1.20.6 / 1.21.1 / 1.21.4 / 1.21.6 / 1.21.9 / 1.21.11 / 26.2**.

Put `NDPR-MOD-2.1.0.jar` into `mods/` and start the game or server. **One jar supports all three loaders.**

### 3.4 Proxy (Velocity / BungeeCord)

Requires **Velocity 3.x** or **BungeeCord (MC 1.20.1+)**, and **Java 17+**.

Put `ndpr-proxy.jar` into the proxy's `plugins/` directory and restart the proxy.

### 3.5 Bedrock

| Platform | How to install |
| --- | --- |
| BDSpyrunner | Put `ndpr.py` into `plugins/` |
| BDSX | Put the npm package into `plugins/ndpr/` |
| LeviLamina | `plugins/ndpr/` (dll plus `manifest.json`) |
| Nukkit / Allay / gomint | Put `ndpr.jar` into `plugins/` |

## 4. Configuration (five steps)

### Step 1: get the UUID

**MCDR**, two ways. First, from the startup log:

```text
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: 服务器类型: xx
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: UUID: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
[MCDR] [20:21:34] [TaskExecutor/INFO] [ndpr]: NDPR插件已加载
```

Second, after the second start, read it from `MCDR root\config\ndpr\config.toml`:

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
```

**Every other platform** (plugin, mod, proxy, Bedrock) **fetches the UUID automatically on first start and writes it to the configuration file** — no manual entry needed. If you want to confirm it by hand:

| Platform | Configuration file | Field |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `uuid` |
| Mod | `.minecraft/config/ndpr.json` | `uuid` |
| Velocity | `plugins/ndpr/config.toml` | `uuid` |
| BungeeCord | `plugins/NDPReforged-Proxy/config.toml` | `uuid` |
| Bedrock (BDSpyrunner/BDSX/LeviLamina/Nukkit/Allay/gomint) | `plugins/ndpr/config.json` | `uuid` |

### Step 2: get a token

1. Open <https://ndpreforged.com/> and click **服主管理** (owner console) at the top or top-left
2. Sign in or register (dragging the slider slowly makes the captcha easier to pass)
3. Click **Token 管理** (token management) on the left
4. Under "create a new token", enter the UUID from step 1 and generate the token
5. Optional: click **上传权限** (upload permission) and request it next to your token, then wait for review

### Step 3: configure the token

**MCDR** (`MCDR root\config\ndpr\config.toml`):

```toml
token = "xxxxxxxxxxxxxxxxxxxx"
```

Field locations on the other platforms:

| Platform | Configuration file | Field |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `token` |
| Mod | `.minecraft/config/ndpr.json` | `token` |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `token` |
| Bedrock | `plugins/ndpr/config.json` | `token` |

:::warn No token means no protection
**The token enables ban checking. Without it the plugin does not perform any ban check at all.** Installing the plugin and skipping the token leaves you with nothing.
:::

### Step 4: configure the server mode

**MCDR**:

```toml
onlinemode = true   # true = premium server, false = offline server
```

| Platform | Configuration file | Field |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `onlinemode` (required) |
| Mod | `.minecraft/config/ndpr.json` | `onlinemode` (required) |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `onlinemode` (leave blank to use the proxy's own mode) |
| Bedrock | `plugins/ndpr/config.json` | `onlinemode` (Bedrock always uses Xbox login; passed through) |

:::warn Java platforms must set onlinemode
**On every Java platform `onlinemode` is required, otherwise the plugin will not load correctly.**
:::

### Step 5: the remaining options

| Option | Description | Default |
| --- | --- | --- |
| `api_url` | API endpoint | `https://api.ndpreforged.com` |
| `language` | Language (`zh_CN` / `en_us`) | `zh_CN` |
| `download_interval` | Ban database refresh interval in seconds; `0` disables it | `900` |
| `check_hwid` | Enable HWID device verification | `false` |
| `check_interval` | Days a verified player is exempt from re-checking | `3` |
| `fail_closed` | Refuse entry when the ban database is missing (security first) | `false` |
| `verify_timeout` | HWID verification timeout in seconds (30-600) | `60` |
| `freeze_interval` | Interval in seconds for pinning the player back during verification (1-60) | `1` |

**Complete MCDR example** (`MCDR root\config\ndpr\config.toml`):

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

## 5. Commands

### MCDR

Main command: `!!NDPR` or `!!ndpr`.

| Command | Description |
| --- | --- |
| `ban <ID> <reason>` | Ban a player |
| `check <ID>` | Check a player's ban status |
| `download` / `d` | Refresh the ban data |
| `checkupdate` / `cu` | Check for plugin updates |
| `help` | Show help |
| `reload` | Reload the configuration |
| `auth <player>` | Force a device verification for a player |

### Other platforms (plugin / mod / proxy / Bedrock)

The command prefix is always `/ndpr` (proxies and Bedrock have no `!!` prefixed commands).

| Command | Description | Permission |
| --- | --- | --- |
| `/ndpr`, `/ndpr help` | Help | everyone |
| `/ndpr d`, `/ndpr download` | Download the ban database manually | `ndpr.admin` |
| `/ndpr ban <player> <reason>` | Submit a ban for review | `ndpr.admin` |
| `/ndpr check <ID/IP/UUID>` | Check ban status (offers fuzzy suggestions on a miss) | everyone |
| `/ndpr reload` | Reload the configuration and re-download the ban list | `ndpr.admin` |
| `/ndpr cu`, `/ndpr checkupdate` | Check for plugin updates | `ndpr.admin` |
| `/ndpr auth <player>` | Force a device verification for a player | `ndpr.admin` |

`ndpr.admin` is granted to **OP** by default (permission level 2 under MCDR).

## 6. Trade-offs you have to decide yourself

1. **`fail_closed`: security versus availability.** The default is `false`, meaning that when the cloud ban list cannot be fetched the server **lets players in** and keeps working. Setting it to `true` **refuses entry** — safer, but a cloud outage locks players out. A public server and a friends-only server may want opposite settings.
2. **`check_hwid`: anti-cheat versus privacy.** Enabling it uses **browser fingerprinting** for machine verification (alongside `verify_timeout`, `freeze_interval` and `check_interval`). It is a **stronger identifier than an IP address**, but it does collect information about the player's device. The official documentation explains the purpose; **you should disclose this in your server rules** before enabling it.
3. **`download_interval`** defaults to 900 seconds (15 minutes). Smaller means more requests, larger means bans take effect later; `0` disables automatic refresh entirely (then you rely on `/ndpr d`).
4. **Prefer the proxy.** With Velocity/BungeeCord, installing once covers every backend and is much harder to get wrong than installing per server.

## 7. Quick troubleshooting

| Symptom | Check first |
| --- | --- |
| Plugin loads but nothing is ever blocked | Is the **token** filled in? (no token means no checking) |
| Plugin does not load or has no effect | Is **`onlinemode`** set? (required on Java platforms) |
| The ban list cannot be downloaded | Is `api_url` correct (default `https://api.ndpreforged.com`)? Is `download_interval` set to `0`? Can the host reach the internet? |
| A banned player still gets in | Is it installed on the **proxy**? Do backends bypass the proxy? Has the ban list synced? |
| Force a refresh now | `/ndpr d` (MCDR: `!!ndpr d`) |
| Apply a configuration change immediately | `/ndpr reload` (reloads the config and re-downloads the ban list) |

## Next steps

- Under attack, or being flood-tested: see [Common Attack Types and Minecraft-Specific Defense](/tutorials/ops/attack-defense)
- Logging, rollback, permissions and login plugins: see [[JAVA] Security Plugins](/tutorials/ops/security-java)
- Player and community management: see [[JAVA] Operations & Management](/tutorials/ops/management-java)

---

> This page and its configuration defaults come from the official NDPReforged documentation (<https://ndpreforged.com/wiki.php>, version 2.1.0); when upstream changes, follow the official documentation.
