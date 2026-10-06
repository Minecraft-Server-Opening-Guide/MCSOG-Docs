---
title: Third-Party Cores (Nukkit / PNX / PMMP)
slug: third-party
cat: bedrock
level: 3
order: 5
minutes: 12
tags: [bedrock, nukkit, powernukkitx, pocketmine, php, third-party-core]
updated: 2026-10-04
draft: false
---

Official BDS is stable but hard to extend. For plugins, multi-core support, and customization you need a third-party core. This article lays out the **getting-started path** for the three mainstream third-party cores.

## 1. The Nukkit Family

Nukkit is "the Bukkit of Bedrock": **written in Java**, with a native plugin system and simple configuration. It has spawned a pile of forks, and in practice you should **prefer an active fork**:

| Fork | Notes |
| --- | --- |
| **Nukkit (original)** | The earliest upstream, no longer active; not recommended for new projects |
| **PowerNukkitX (PNX)** | The modern mainline fork, **latest protocol + multi-core optimization**; the first choice |
| **NukkitX** | Historical fork |
| **NukkitMot** | Historical fork |
| **PM1E** | A historical fork related to PocketMine (the community disputes its history) |
| **PNX** | Shorthand for PowerNukkitX |

**Preparation**: the Nukkit family consists of Java programs, so **you need Java installed** (similar to Java Edition; see the Java section of "Environment Preparation (Windows and Linux)").

**Getting started**: download the core jar → put it in a directory → write a startup script (`java -jar core-name.jar`) → the first launch generates the configuration files → install plugins into `plugins/`.

### Why PowerNukkitX Is Worth Choosing

- **Multi-core optimization** — its biggest advantage over BDS, whose computation is essentially pinned to a single core;
- **Supports the latest Bedrock protocol** without a long wait;
- **384-block world height** and a built-in **Terra** terrain generator;
- **Fully open source with an open API**, with plugins in Java / Kotlin / Scala / Python / JavaScript / Lua;
- **Compatible with many plugins from the Nukkit ecosystem**.

The trade-off: many plugins and many configuration options make **the learning curve steep for newcomers**, and development pace depends on the upstream team.

## 2. PocketMine-MP (PMMP)

A Bedrock server written in **PHP**, with **the largest plugin ecosystem**.

**Preparation**: you need a **PHP runtime** (not Java). Install the matching PHP version per the official documentation and configure the relevant extensions.

**Getting started**: download PMMP (usually a `.phar` file) → start it with PHP (`php PocketMine-MP.phar`) → configuration and directories are generated → put plugins in `plugins/`.

**Pros**: a huge number of plugins, cross-platform, **if you know PHP you can write plugins**, an active community, and deep customization.

**Cons**: **performance bottlenecks under heavy load** (memory management and CPU efficiency); slow updates; stability drops with many plugins; and as an interpreted language PHP **uses noticeably more resources**.

:::tip Nukkit family or PMMP?
- You **know Java** and want **better performance** → **PowerNukkitX**
- You **know PHP** and want **the largest selection of ready-made plugins** → **PocketMine-MP**
- You know neither → get **BDS** working first, then consider third parties
:::

## 3. Other Servers

Beyond the above, the community also has some niche or purpose-built cores:

| Core | Positioning |
| --- | --- |
| **Allay** | A community-developed Bedrock server |
| **Dragonfly** | A Bedrock server written in Go, performance-oriented |
| **MCPEServer** | An early Bedrock server |
| **WaterDogPE** | A **proxy** (the Bedrock counterpart of Velocity / BungeeCord) for linking multiple sub-servers |

> Niche cores usually have **thin plugin ecosystems and documentation**, which makes help hard to find. Unless you have a clear reason, **beginners should not choose them**.

### WaterDogPE: Only Needed for Multiple Sub-Servers

Like Java Edition, Bedrock has **proxies**: a proxy runs no world itself and only forwards players to backend sub-servers. It suits multi-server setups such as "lobby + survival + minigames". **A single server does not need it** — one more layer means one more point of failure.

## 4. General Advice

1. **Align versions**: core, protocol, and plugins must all line up; Bedrock is far stricter about this than Java Edition.
2. **Start small, then grow**: get a minimal working server running, then add plugins step by step.
3. **Check activity**: prefer cores and plugins that are **still updated recently**; anything long unmaintained will break on a new version.
4. **Back up first**: third-party cores are less save-compatible than the official one, so **always back up before upgrading or switching cores** (see "Backup and Restore").

## Next Step

Review the overall selection: see [Choosing a Bedrock Core](/tutorials/bedrock/cores) and [Server Core Comparison](/wiki/compare#mcsog-h-Bedrock%20core%20comparison).

---

> Parts of this article reference the Bedrock section of [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
