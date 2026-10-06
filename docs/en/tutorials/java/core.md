---
title: Choosing a Server Core
slug: core
cat: java
level: 1
order: 4
minutes: 12
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, cores, paper, purpur, folia, leaves, fabric, technical, multi-core]
updated: 2026-10-04
draft: false
---

With the environment ready, the next decision is **which server core to use**. The core determines three things: **the performance ceiling**, **whether you can install plugins or mods**, and **whether vanilla behaviour such as redstone stays consistent**.

Choosing wrong will not stop the server from starting, but it wastes money (a many-core CPU running a single-threaded server) or effort (using Paper for technical Minecraft).

## 1. First, Tell the Three Categories Apart

| Category | Examples | Plugins | Mods | Details |
| --- | --- | --- | --- | --- |
| **Vanilla** | Vanilla | No | No | The official server; the most standard behaviour, but no optimisation at all |
| **Plugin server** | Spigot → Paper → Purpur / Leaves / Leaf / Folia | Yes | No | One Bukkit lineage, the largest ecosystem |
| **Modded server** | Fabric / Forge / NeoForge | Needs a bridge | Yes | Loads mods; suited to modpacks |

> There is also the **proxy** category (Velocity / BungeeCord): it runs no world of its own and only forwards players to several backend servers, so you need it only when linking multiple servers together.

## 2. Choose by Hardware: The Easiest Thing to Get Wrong

**Minecraft's main thread is single-threaded.** Entities, chunks, redstone and plugin logic almost all land on **one core** — so more cores does not mean faster; **single-core clock speed is what counts**.

| Your machine | Recommendation | Why |
| --- | --- | --- |
| **Strong single-core performance** (4–8 cores, 3.5GHz+) | **Paper / Purpur / Leaf** | These builds squeeze everything they can out of a single thread, so the stronger the core, the bigger the gain |
| **Many cores but low clocks** (16+ cores, below 2.5GHz) | **Folia** | The single core is the weak spot, and Paper would leave most cores idle; Folia can use them all |
| Unsure, want peace of mind | **Paper** | The most stable, the most documentation, the best plugin compatibility |

### What the Multi-Core Build Folia Is

Folia is an official Paper branch that adds **regionised multithreading** to the server: the world is split into regions, and the regions tick **in parallel**, so multiple cores are genuinely used.

The trade-offs are just as clear:

- **Poor plugin compatibility**: many plugins have not been adapted to Folia and may error out or misbehave once installed.
- **Behaviour differs from Paper**: cross-region interactions (redstone, teleporting, entities crossing regions) follow different rules.
- Suited to **spread-out players and machines with weak single cores but many cores**; not suitable for technical Minecraft.

### With a Strong Single Core, Pick the Paper Family

Paper and its downstreams (Purpur, Leaf, Leaves) all follow the **single-thread optimisation** path: the main thread is optimised thoroughly, so the higher the single-core clock, the smoother it runs.

- **Paper**: the baseline choice and the largest ecosystem.
- **Purpur**: Paper plus a large number of configurable gameplay toggles; good for people who like fine-tuning.
- **Leaf**: a Paper branch that **balances performance, vanilla mechanics and stability** (the project's own positioning).
- **Leaves**: a Paper branch pointing the other way — it **specifically repairs vanilla features that were changed**, see the next section.

## 3. How to Choose for Technical Minecraft

Technical Minecraft means redstone machines, mob farms, TNT duplication and precise block and entity behaviour. It **requires vanilla-consistent behaviour**, so:

- **Fabric** does — with no optimisation mods it is the closest to vanilla and is the mainstream choice for technical servers.
- **Leaves** does — a Paper branch that specifically **repairs vanilla features broken by Paper** (the project's own words: *repairing broken vanilla properties*), so it restores vanilla behaviour while keeping the Paper ecosystem.

:::warn Do not use Paper / Purpur for technical Minecraft
For performance, the Paper family changes some vanilla behaviour (redstone timing, TNT duplication, mob spawning and entity rules), **which breaks machines that depend on those mechanics**. For a technical server, use **Fabric** or **Leaves**.
:::

## 4. Quick Reference of Common Cores

| Core | Type | In one line | Best for |
| --- | --- | --- | --- |
| **Vanilla** | Vanilla | Official server, no optimisation | A pure experience, verifying vanilla behaviour |
| **Spigot** | Plugin | Paper's upstream, compatible with old plugins | Old servers that prioritise compatibility |
| **Paper** | Plugin | The largest ecosystem and the most stable baseline | Most survival and plugin servers |
| **Purpur** | Plugin | Paper + a huge number of gameplay toggles | Fine-grained gameplay tuning |
| **Leaf** | Plugin | Balanced performance and vanilla mechanics | Wanting Paper with fewer vanilla changes |
| **Leaves** | Plugin | Repairs vanilla features | **Technical play + plugins** |
| **Folia** | Multi-core | Regionised multithreading, uses every core | **Many cores, low clocks**, and you accept the plugin limits |
| **Fabric** | Modded | Lightweight, close to vanilla | **Technical play**, lightweight modpacks |
| **Forge** | Modded | Long-established, most modpacks | Large tech modpacks |
| **NeoForge** | Modded | A Forge community fork, the mainstay for new versions | 1.20.2+ modded servers |
| **Velocity** | Proxy | Forwards only, runs no world | Linking multiple backend servers, cross-server |

> The "performance" descriptions in the table are relative; actual results depend on the version, the number of plugins/mods and the hardware.

## 5. Full Comparison Table

The above is a quick reference. For an item-by-item comparison (performance, plugins, mods, learning curve, use cases), see:

**→ [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison)**

## 6. Next Step

Once the core is chosen, download the matching server jar from that core's official channel, put it in the `survival` directory created in Environment Setup, and **write a startup script to run it**:

> **This site indexes the download entry for every core** — open **[Downloads · Server cores](/downloads/core)** to find all builds per core (Vanilla, Paper, Folia, Velocity, Purpur, Leaf, Leaves, Fabric, NeoForge, Forge, Spigot, BungeeCord and Bedrock BDS), then click Download and sign in when prompted. Only official and community links are indexed; **no file is stored on this site**.

**→ [Starting the Server](/tutorials/java/start)** — startup scripts, accepting the EULA, telling whether startup succeeded, automatic restarts

- **Paper / Purpur / Leaf / Leaves / Folia**: get the jar from the official download page
- **Fabric / Forge / NeoForge**: install the server installer for the matching loader first (newer Forge / NeoForge **generate a startup script automatically**)
- **Vanilla**: the official server jar

Confirm once more before starting: **the Java version matches the target MC version** and **25565 is open**.

## Related downloads

Three kinds of resources are indexed here, all as **download links** from official and community sources (no file is stored); click Download and sign in when prompted:

- **[Downloads · Server cores](/downloads/core)** — every build of 13 cores (Vanilla, Paper, Folia, Velocity, Purpur, Leaf, Leaves, Fabric, NeoForge, Forge, Spigot, BungeeCord, Bedrock BDS).
- **[Downloads · Mods](/downloads/mods)** — Modrinth mod entries filterable by loader (Fabric / Forge / NeoForge / Quilt) and game version; see [Modded servers from scratch](/tutorials/java/modded).
- **[Downloads · Plugins](/downloads/plugins)** — server plugins for Java (filter by Paper / Spigot / Folia / Purpur / Bukkit) and Bedrock, plus MCDR plugins; see [Plugins from scratch](/tutorials/java/plugins).
