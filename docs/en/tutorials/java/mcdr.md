---
title: The MCDR Server Manager
slug: mcdr
cat: java
level: 2
order: 10
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, mcdr, python, plugins, management, automation]
updated: 2026-10-04
draft: false
---

MCDReforged (**MCDR** for short) is a very popular **server manager** in the Minecraft hosting community. It does not replace your server core; instead it **wraps around it**: MCDR starts and manages the core process and reads its console output, so you can extend the server **without modifying the server itself**.

## 1. What Problem It Solves

A vanilla or Paper server can only be extended through plugins, whereas MCDR provides **another layer** of capability:

| Capability | Description |
| --- | --- |
| **Plugin ecosystem** | Write plugins in **Python**, which makes many things that are awkward for Java plugins easy (cross-server forwarding, external API integration, automated operations) |
| **Event-driven** | Parses server output and dispatches events (players joining and leaving, chat, deaths, commands and so on) that plugins simply subscribe to |
| **Hot reload** | Plugins can usually be reloaded without restarting the whole server |
| **Permission system** | Ships with per-player and per-group permission control, used together with `!!`-prefixed commands |
| **Watchdog** | Restarts the core automatically after a crash |
| **Multi-server** | One MCDR instance can manage several server instances |

## 2. How It Works

Once started, MCDR **takes the server process under its wing**: it reads the server's console output and parses it into events, and it intercepts the `!!xxx` commands you type in chat and hands them to plugins instead of passing them to the vanilla server.

As a result:

- The server **itself** is still the same core and behaves exactly as before;
- You have added a "shell", so **troubleshooting means reading one more layer of logs** (MCDR's own logs plus the server logs).

## 3. Installation

MCDR is written in **Python 3** and needs Python and pip:

| MCDR version | Required Python |
| --- | --- |
| < 2.10 | ≥ 3.6 |
| ≥ 2.10 | ≥ 3.8 |
| ≥ 2.15 | **≥ 3.9** |

To install the latest version, use **pip**:

```bash
pip install mcdreforged
```

:::warn Do not download the source zip and run that
Quite a few tutorials online tell you to download a zip from GitHub and extract it — **that is an outdated approach**. Since 1.0 (early 2021), MCDR has no longer been installed from source. Unless you are a developer who knows exactly what you are doing, install it with pip.
:::

## 4. Startup Walkthrough

1. **Initialise**: run the initialisation command once, and MCDR generates its own configuration files and directory structure.
2. **Configure**: fill in the **server start command** and the **working directory** in MCDR's configuration (this is the job the startup script did in "Starting the Server", now handed to MCDR).
3. **Start**: run MCDR; it brings up the server and takes over the console.
4. **Confirm the server type**: MCDR uses **server handlers** to adapt to different kinds of core (vanilla / Paper family / modded and so on), and choosing the wrong one causes event parsing problems.

:::tip For CLI subcommands, trust the official documentation
MCDR's command-line interface (global options, subcommands) has changed between versions, so **check the official CLI documentation for the exact syntax** instead of copying old tutorials.
:::

## 5. Commands and Permissions

MCDR commands all use the `!!` prefix (just type them in the in-game chat box):

| Command | Purpose |
| --- | --- |
| `!!MCDR` | The main command, managing MCDR itself (status, plugins, reload, permissions and so on) |
| `!!help` | Show help for registered commands |

- Who may run a command is controlled by MCDR's **permission system**, and can be granted per player or per permission group.
- Unauthorised players simply get a denial message, and the server itself is unaffected.

## 6. Plugins

- Plugins go into MCDR's `plugins/` directory and are loaded or reloaded through the relevant `!!MCDR` subcommands.
- There is an official **plugin repository** where you can find ready-made plugins; you can also write your own (single-file plugins, multi-file plugins, folder plugins and several other forms).
- Plugin development comes down to **metadata + event listeners + a command tree**: declare the plugin's information, register the events you care about, and build your own `!!` commands.

## 7. When to Use MCDR

**A good fit**: you want automated operations (scheduled restarts, crash recovery, backup integration), you want to connect server status to external platforms (QQ groups, Discord, a website), or you need Python plugins for custom logic.

**Not necessarily needed**: if you are only running a small plugin server, the core's own plugins plus systemd management are enough. **Every extra layer adds maintenance cost**, so do not use it just for the sake of using it.

## Next Step

Gameplay extensions on a server come mainly from plugins: see [Getting Started with Plugins](/tutorials/java/plugins).

---

> The installation method and version requirements for MCDR in this article reference the [official MCDReforged documentation](https://docs.mcdreforged.com/zh-cn/) and were rewritten to fit this site's structure; for the exact commands and arguments, the official documentation prevails.
