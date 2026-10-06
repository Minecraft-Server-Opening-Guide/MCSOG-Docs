---
title: Getting Started with Plugins
slug: plugins
cat: java
level: 2
order: 11
minutes: 16
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, plugins, yaml, dependencies, permissions, security]
updated: 2026-10-04
draft: false
---

Plugins are the greatest strength of **plugin servers** (Paper / Purpur / Spigot and the like): you can add features to your server without touching the client and without asking players to install anything.

## 1. First, Tell Plugins and Mods Apart

| | Plugin | Mod |
| --- | --- | --- |
| Installed in | The server's `plugins/` | Client + server `mods/` |
| Do players install anything? | **No** | Usually yes |
| Used with | Plugin server cores | Modded server cores (Fabric / Forge / NeoForge) |
| Interchangeable? | **No**: plugin servers cannot load mods, and modded servers cannot load plugins (unless you use a hybrid server or a bridging solution) |

## 2. The Standard Plugin Installation Workflow

1. Download the plugin's `.jar` file.
2. Put it in the `plugins/` folder in the server root directory.
3. **Restart the server** (most plugins cannot be hot-loaded the first time).
4. Watch the console: plugins usually print their name and version on startup, and errors show up here too.
5. Confirm the status with the `plugins` command (see below).

### Using `plugins` to Check the Load Status

```
plugins          (short form: pl)
```

- **Green**: loaded — yes (note: this only means it **loaded this time**; it does not mean it will not error at runtime)
- **Red**: failed to load — no (the server recognised it, but it did not load successfully; check the console for the error)
- **Not listed at all**: the server **never recognised** it as a plugin → check that the file really is in `plugins/`, that the extension is `.jar`, and that you did not download the wrong type of core artifact (for example installing a mod as a plugin)

## 3. Dependencies

Many plugins do no work themselves and only provide shared capabilities. **They must be installed first**, or the plugins that need them fail to load:

| Dependency | What it provides |
| --- | --- |
| **Vault** | A unified interface for economy / permissions / chat, relied on by a great many plugins |
| **PlaceholderAPI** (PAPI) | Variable placeholders (such as showing a player's balance or the online count), and the standard way for plugins to read each other's data |
| **ProtocolLib** | Low-level protocol manipulation; a dependency for many advanced plugins |
| **LuckPerms** | Permission management, giving fine control over who may use which commands |

## 4. Configuration Files and YAML

Plugin configuration lives under `plugins/<plugin-name>/`, usually in `config.yml`. The pitfalls people hit most often when writing YAML:

- **Indent with spaces only, never tabs** (this is the single biggest source of YAML errors).
- Put one space after a colon, as in `enabled: true`.
- Hierarchy is expressed by indentation, and entries at the same level must be indented identically.

:::warn Garbled non-ASCII text
If non-ASCII text in a configuration file shows up as garbage, the file is most likely **not encoded as UTF-8** (saving with Windows Notepad easily turns it into ANSI/GBK). Use an editor such as VS Code and save it as **UTF-8**.
:::

### Color Codes

Server text (MOTD, chat, plugin messages) uses `&` followed by a letter to set colors and styles, for example:

```
&aGreen  &cRed  &lBold  &oItalic  &rReset
```

Exactly which codes are supported depends on the server version and the plugin.

## 5. Applying Configuration Changes

| Method | Description |
| --- | --- |
| `/<plugin-name> reload` or `/<plugin-abbreviation> reload` | Supported by most plugins and **preferred** (for example `/tab reload`) |
| Restart the server | The safest option, and the only one for plugins that do not support hot reloading |
| `/reload` (vanilla command) | **Not recommended**; it easily leaves plugins in an inconsistent state |

## 6. Choosing Plugins by Purpose

| Purpose | Common choices |
| --- | --- |
| Permissions | LuckPerms |
| Basic features (homes, teleporting, kits) | EssentialsX, CMI |
| **Anti-grief and rollback** | CoreProtect (block logging, so you can find out who did it when something goes wrong) |
| Land claims | Residence, Dominion, GriefDefender |
| World editing | WorldEdit, WorldGuard (region protection) |
| Multiple worlds | Multiverse-Core |
| Chat formatting | TrChat, Carbon |
| Menus / GUIs | DeluxeMenus, TrMenu |
| MOTD and the server list | MiniMOTD |
| Skins (essential in offline mode) | SkinsRestorer |
| Login (offline mode) | AuthMe, LibreLogin |
| Cross-version compatibility | ViaVersion + ViaBackwards |
| Plugin hot management | PlugManX |

A common starter set: **LuckPerms + EssentialsX + CoreProtect + WorldEdit/WorldGuard + Vault + PlaceholderAPI**, then add more depending on your gameplay.

## 7. Security: Plugins Can Be Toxic Too

Plugins are **third-party code running with server privileges**, so installing the wrong one has serious consequences:

- **Download only from trusted sources**: official distribution channels (such as SpigotMC, Modrinth, Hangar) or the author's repository. Jars passed around on forums or in group chats carry the highest risk.
- **Watch out for backdoors**: people repackage legitimate plugins and slip in code that runs arbitrary commands, grants OP to specific players, uploads files and so on.
- **Check whether it is maintained**: a plugin that has not been updated for a long time, or whose author has walked away, may crash your server outright on a new version.
- **If in doubt, test on a test server first**: never install a plugin of unknown origin directly on your main server.

:::tip Suspect plugins first when things break
If the server suddenly lags or throws strange errors, **disable the plugins you installed most recently** and re-enable them one by one to isolate the cause — this is far faster than reading logs.
:::

## Next Step

To keep redstone machines and vanilla mechanics working properly, plugin servers need extra tuning: see [Technical Minecraft and Redstone](/tutorials/java/redstone).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.

## Related downloads

- [Downloads · Plugins](/downloads/plugins) — official and community build sources; sign in when prompted to download.
