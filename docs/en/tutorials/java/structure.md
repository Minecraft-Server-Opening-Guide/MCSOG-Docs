---
title: Server Directory Structure
slug: structure
cat: java
level: 1
order: 6
minutes: 10
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, directories, structure, backup, worlds, configuration]
updated: 2026-10-04
draft: false
---

Once your server is running, the directory fills up with a pile of files and folders. **Knowing which ones you can touch and which ones you must never touch** is the foundation for everything that follows: installing plugins, backing up, migrating.

The examples below use a plugin server (Paper / Purpur and the like).

## 1. Folders

| Folder | Purpose | Safe to touch? |
| --- | --- | --- |
| `plugins/` | Where plugins go | Yes, constantly |
| `world/` | **Overworld** data | Back up as a whole only; never edit by hand |
| `world_nether/` | Nether data | Same as above |
| `world_the_end/` | The End data | Same as above |
| `logs/` | Runtime logs, your first stop when troubleshooting | Old ones can be deleted |
| `crash-reports/` | Crash reports; look here first when something errors | Old ones can be deleted |
| `config/` | Core configuration for the Paper family (e.g. `paper-world-defaults.yml`) | Back up before editing |
| `libraries/` `versions/` `cache/` | Dependency libraries and caches, **generated automatically** | Leave alone |
| `mods/` | Only present on **modded servers** (Fabric / Forge) and hybrid servers | Yes, constantly |

## 2. Key Files in the Root Directory

| File | Purpose |
| --- | --- |
| `server.properties` | **The most basic server configuration** (port, online mode, view distance, …) |
| `eula.txt` | EULA acceptance file; must be `eula=true` |
| `<core-name>.jar` | The server core itself |
| `ops.json` | OP (administrator) list |
| `whitelist.json` | Whitelist |
| `banned-players.json` / `banned-ips.json` | Ban lists |
| `usercache.json` | Cache mapping player names to UUIDs |
| `bukkit.yml` / `spigot.yml` | Bukkit / Spigot layer configuration (present on every Paper-family server) |
| `purpur.yml` / `paper.yml` | Configuration belonging to that core (it exists only if you run that core) |
| `commands.yml` | Command aliases and interception mappings |
| `permissions.yml` | Default permission definitions |

## 3. What Is Inside a World Folder

The real save data lives inside `world/`, so **back up the whole `world` folder as one unit**:

| Subdirectory | Contents |
| --- | --- |
| `region/` | **Chunk data** (blocks and terrain live here; by far the largest part) |
| `playerdata/` | Player inventories, positions and health |
| `entities/` | Entity data (dropped items, mobs, villager trades and so on) |
| `poi/` | Points of interest (villager workstations, beds and so on) |
| `data/` | World-level data (maps, scoreboards and so on) |
| `datapacks/` | Data packs |
| `advancements/` `stats/` | Advancements and statistics |

:::warn Never edit world files by hand
Editing files inside `region/` directly will very likely **corrupt the save**. To change the world, use a plugin such as `WorldEdit`, or stop the server first.
:::

## 4. Three Things This Structure Tells You

1. **What to back up**: the three `world*` folders, the configuration inside `plugins/`, and `server.properties`. Most of the rest can be rebuilt automatically. See "Backup and Recovery" for details.
2. **How to migrate**: copy the entire server directory to the new machine and install the same Java version. Keep the path free of non-ASCII characters and spaces.
3. **Where to start troubleshooting**: check `logs/latest.log` first, and `crash-reports/` if the server crashed.

## Next Step

Now that you understand the layout, move on to configuration: see [Configuring the Server](/tutorials/java/config).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
