---
title: "[Technical] Choosing a Server Core"
slug: tech-server
cat: java
level: 3
order: 29
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, carpet, fabric, server]
updated: 2026-10-08
draft: false
---

A technical server does not need "a server that starts" — it needs **a full set of vanilla mechanics that rules can control precisely**: machines must behave as designed, TNT and update suppression must stay manageable, and a crash must be recoverable immediately. This article lays out the three routes (Fabric plus MCDR, optimised cores, multi-threaded cores), what each one costs, and then covers the PCA protocol on its own. Before choosing, read [Choosing a Server Core](/tutorials/java/core) and [Technical Minecraft and Redstone](/tutorials/java/redstone) — those two cover the general conclusions; this article only adds the technical-play specifics.

## 1. The Three Routes at a Glance

| Route | Examples | What you get | What it costs |
| --- | --- | --- | --- |
| **Fabric server + MCDR** (most recommended) | Fabric + `MCDR` | Carpet and every add-on, an out-of-process manager, an official plugin catalogue | You install the mods yourself; there is no plug-and-play plugin ecosystem |
| Optimised core for technical play | The Paper family and similar plugin cores | TPS optimisation, a plugin ecosystem | Changes vanilla behaviour, so machines may stop working |
| Multi-threaded core | `c2me-fabric`, `async` | Faster chunk and entity processing | Threading changes timing and affects machine behaviour |

**The conclusion up front**: for a technical server, choose **a Fabric server plus MCDR**. The other two routes are only for people who know exactly what they are trading away.

## 2. Why Fabric + MCDR Is the Recommendation

This is not a preference. It follows from three hard facts.

### The whole technical toolchain lives on Fabric

`Carpet` itself, and its four mainstream add-ons (`Carpet Extra`, `Carpet TIS Addition`, `Carpet AMS Addition`, `Carpet Org Addition`), are **all Fabric server-side mods**. In other words, the rule system that technical players actually depend on is fully implemented on Fabric only; choosing another core means giving that toolchain up. Rules and add-ons are covered in [Carpet and Its Add-ons](/tutorials/java/tech-carpet).

### MCDR runs outside the server process

`MCDR` (MCDReforged) is a Python-written server manager, officially described as: A rewritten version of MCDaemon, a python tool to control your Minecraft server.

The point is that **it runs outside the server process**:

- when the server crashes, MCDR is still alive, so it can **restart it automatically**;
- at the moment of the crash it still has execution ability, so it can **run a backup on crash**;
- it talks to the server through the console and the log, without intruding into the server's own logic.

That matters more on a technical server than anywhere else: world eaters, update suppression and large TNT arrays are all gameplay that can take the server down outright, so the manager has to outlive the server. Installation and commands are in [The MCDR Server Manager](/tutorials/java/mcdr).

### MCDR has an official plugin catalogue

MCDR maintains an official plugin catalogue (`MCDReforged/PluginCatalogue`) with backup, query and permission plugins all present. For backups alone, the catalogue lists entries such as `prime_backup`, `quick_backup_multi`, `timed_quick_backup_multi`, `better_backup`, `auto_backup`, `permanent_backup`, `zip_backup`, `chunk_backup`, `region_backup`, `ftp_backup`, `baidu_netdisk_backup`, `extra_prime_backup`, `smart_backup` and `cushion_of_backup`, and `ftp_backup` and `baidu_netdisk_backup` follow the **offsite backup** idea.

In short: you do not have to write your own management scripts. Installing MCDR gives you a ready-made operations toolbox.

## 3. The Other Two Routes, and What They Cost

### Optimised cores for technical play (plugin cores)

Plugin cores such as the Paper family optimise TPS very well and have a mature plugin ecosystem, but many of their defaults **have already been optimised**, and they do not match vanilla behaviour: once entity collisions, redstone implementation or the chunk unload delay are changed, machines may stop working or produce inconsistently.

These cores suit ordinary survival servers, minigame servers and servers that need lots of plugin features. **On a technical server you do the opposite: set every option that affects vanilla behaviour back to vanilla.** Which options to change and how is already covered by two articles here:

- [Choosing a Server Core](/tutorials/java/core) — the general selection and where each core fits;
- [Technical Minecraft and Redstone](/tutorials/java/redstone) — the vanilla-behaviour tuning checklist for plugin cores, plus dedicated cores such as MCHPRS.

This article does not repeat either of them.

### Multi-threaded cores

The idea behind a multi-threaded core is to spread chunk or entity processing across several threads:

| Mod | Official one-liner | The problem from a technical-play view |
| --- | --- | --- |
| `c2me-fabric` | A Fabric mod designed to improve the chunk performance of Minecraft. | Chunk processing is parallelised, so timing differs from vanilla |
| `async` | Async — Minecraft Entity Multi-Threading Mod; improves entity performance by processing entities in parallel across multiple CPU cores and threads | Entities are processed in parallel, so the update order machines rely on changes |

Redstone and technical machines **depend heavily on update order and timing**. Multi-threading speeds up throughput at the cost of making "who goes first within a tick" unpredictable — a machine may work sometimes and fail other times, which is far harder to debug than being consistently slow.

The conclusion: use a multi-threaded core only when you know exactly what you want (for example, you only want exploration to stop lagging and you accept the change in machine behaviour).

## 4. Do Not Install Anti-Cheat on a Technical Server

Plainly: **anti-cheat plugins are not recommended on a technical server.**

The conflict is logical:

- normal technical play keeps tripping anti-cheat checks on its own — high-speed movement, large numbers of entities, and the unusual behaviour produced by machines and automation all look suspicious;
- anti-cheat usually has to be installed on a **plugin core or an optimised core**, and both of those change vanilla behaviour, which directly conflicts with the goals of technical play;
- the vanilla checks and rubberbanding aimed at fast movement already have a switch in Carpet: `antiCheatDisabled`, officially described as Prevents players from rubberbanding when moving too fast.

What you actually need are alternatives such as **whitelists and permissions, logging and rollback, and regular offsite backups**, not another layer of checks that will misfire. The full argument is in [Why Anti-cheat Is Not Recommended](/tutorials/java/tech-anticheat); logging and rollback tools are in [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat).

## 5. The PCA Protocol

`PCA` is properly known as `plusls-carpet-addition` (Plusls Carpet Addition), an extension mod for Carpet.

### What it is

Its synchronisation protocol is officially described as follows:

> The PCA sync protocol is a protocol for synchronising Entities and BlockEntities between the server and the client, currently used by MasaGadget to implement multiplayer container preview.

Three layers are worth separating out:

1. it is a protocol **between the server and the client**, so both ends need matching support;
2. what it synchronises is **Entity and BlockEntity** data;
3. its current main use is **MasaGadget's multiplayer container preview** — looking inside someone else's chests, hoppers or machine inventories in a multiplayer world.

### The two rules

| Rule | Type | Default | Accepted values | Notes |
| --- | --- | --- | --- | --- |
| `pcaSyncProtocol` | `boolean` | `false` | `true` / `false` | The switch for the sync protocol; its categories are `PCA` and `protocal` |
| `pcaSyncPlayerEntity` | `enum` | `OPS` | `NOBODY` / `BOT` / `OPS` / `OPS_AND_SELF` / `EVERYONE` | Decides which players' data will be synced by the PCA sync protocol |

Note that `pcaSyncProtocol` **defaults to off**: the protocol is a capability, not a default behaviour, so decide for yourself who gets to see what before enabling it.

### Maintenance status (read this part carefully)

| Project | Status |
| --- | --- |
| `plusls/plusls-carpet-addition` (the original) | Last updated 2022 |
| `Nyan-Work/plusls-carpet-addition` (one of the forks) | Last updated 2024 |
| `pca-protocol` | Available today. Modrinth, `fabric`, 1.14.4–26.3, by fallen-breath. Official description: A fork of plusls-carpet-addition, provides PCA protocol support to the server. That's everything it does |
| `pca-protocol-plugin` | Available today. Modrinth, `bukkit` / `paper` / `purpur` / `spigot`, 1.17–1.21.8. Official description: Add PCA protocol support for the spigot and its optimized/branch server |

In other words: the original project and its fork are both discontinued, and **what works now are the two stripped-down forks that keep only the protocol** — `pca-protocol` for Fabric servers and `pca-protocol-plugin` for Spigot-family servers.

:::warn The stripped-down fork conflicts with the full version
The official documentation states it plainly: the stripped-down fork **conflicts** with the full `plusls-carpet-addition`. So either use the full version (which has other features but is discontinued) or the stripped-down one (protocol only, still maintained) — **never install both**.
:::

## 6. Three Bottom Lines

```
1. Choose Fabric — the technical toolchain is only complete there
2. Let MCDR manage — it lives outside the server process and survives a crash
3. Skip anti-cheat — misfires are guaranteed; use permissions, logs and backups instead
```

## Next Steps

- Core settled, now add the rule system: [Carpet and Its Add-ons](/tutorials/java/tech-carpet)
- Read the risk control before the machines start: [World Eaters and Update Suppression](/tutorials/java/tech-machine)
- Why anti-cheat is a net loss on a technical server: [Why Anti-cheat Is Not Recommended](/tutorials/java/tech-anticheat)
- The general selection and the details skipped here: [Choosing a Server Core](/tutorials/java/core), [Technical Minecraft and Redstone](/tutorials/java/redstone)
