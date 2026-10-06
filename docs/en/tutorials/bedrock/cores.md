---
title: Choosing a Bedrock Core
slug: cores
cat: bedrock
level: 2
order: 3
minutes: 12
tags: [bedrock, bds, nukkit, powernukkitx, pocketmine, core]
updated: 2026-10-04
draft: false
---

Bedrock Edition's core ecosystem is far smaller than Java Edition's; there are four mainstream options:

| Core | Language | Plugins | In one line |
| --- | --- | --- | --- |
| **BDS** | C++ | Needs a community loader | Official server, **best compatibility** |
| **Nukkit (NK)** | Java | Native | Lightweight, the Bukkit of Bedrock |
| **PowerNukkitX (PNX)** | Java | Native | Nukkit's modern successor, **multi-core optimized** |
| **PocketMine-MP (PMMP)** | PHP | Native | Huge plugin ecosystem, written in PHP |

> For a full item-by-item comparison (performance, plugins, ecosystem, use cases), see the "Bedrock core comparison" section of **[Server Core Comparison](/wiki/compare#mcsog-h-Bedrock%20core%20comparison)**.

## 1. BDS (Official)

The official Bedrock server offered on the Minecraft website, on the same page as Java Edition's Vanilla.

**Pros**

- **Official support**: updates alongside Mojang and offers the best compatibility with the latest clients;
- **Stable**: an official product that runs reliably;
- **Resource usage**: optimized for Bedrock and uses server resources efficiently;
- **Security updates**: security fixes arrive more frequently.

**Cons**

- **No plugin support**: the official server has no plugin system of its own, so plugins require a **community plugin loader**;
- **Single-thread bottleneck**: **mob and entity ticking runs on one thread**, so smoothness **depends mainly on single-core CPU performance**; the bigger the map, the worse it runs, and overall it trails multi-core Java servers;
- **Missing advanced features**: custom world generation and advanced permission management usually require third-party tools;
- **Slow memory growth**: usage creeps upward and can look like a memory leak. Note that **force-clearing memory makes the progress bar hang when players download resource packs or add-ons**, and only a server restart fixes it.

**Best for**: servers that need official support and compatibility without complex customization. **The first choice for survival servers.**

## 2. Nukkit (NK)

The "Bukkit" of Bedrock — written in **Java**, with an ecosystem and development approach much like Java plugin servers.

**Pros**: lightweight (low resource demands), decent performance, **a native plugin system**, cross-platform (Windows/Linux/macOS), and easy to pick up.

**Cons**: **slow to update** (may lag behind the latest version and features), a smaller plugin ecosystem than Spigot/Paper, insufficient multi-core optimization, less high-quality documentation, and occasional stability issues in the open-source project.

**Best for**: beginners and small servers. **Note**: the original Nukkit is no longer active, so its modern fork is the practical recommendation (see below).

## 3. PowerNukkitX (PNX)

Nukkit's **modern successor**, currently the workhorse among third-party Bedrock cores.

**Pros**

- **Supports the latest Bedrock protocol**, so it keeps up with new versions;
- **Multi-core optimization**: its biggest advantage over BDS and old Nukkit;
- **384-block world height**;
- A built-in **Terra** terrain generator for rich landscapes;
- **Fully open source with an open API**, supporting plugins in Java / Kotlin / Scala / Python / JavaScript / Lua and other JVM languages;
- **Compatible with many plugins from the Nukkit ecosystem**.

**Cons**: development pace is affected by changes in the original Nukkit team; the ecosystem is still small compared with mainstream Java servers; and the number of plugins makes the learning curve steep for newcomers.

**Best for**: owners who want **high performance plus deep customization**.

## 4. PocketMine-MP (PMMP)

A Bedrock server written in **PHP**, with the largest plugin ecosystem.

**Pros**: a huge plugin ecosystem, cross-platform, **a low PHP barrier** (if you know PHP you can write plugins), an active community, and a high degree of customization.

**Cons**: **performance bottlenecks under heavy player load** (memory management and CPU efficiency); slow updates; stability drops with many plugins; PHP is interpreted, so **resource consumption is more noticeable**; configuration and plugin management take learning.

**Best for**: owners who value **plugin features and customization** and can accept some performance trade-offs.

## 5. How to Choose

```
Stability + official compatibility + vanilla survival
   → BDS (add a community loader if you need plugins, see "BDS Server")

High performance + multi-core + deep customization
   → PowerNukkitX

The largest plugin ecosystem, and you know PHP
   → PocketMine-MP

A simple start in the Nukkit ecosystem
   → the Nukkit family (but prefer an active fork)
```

:::tip Validate at minimum scale first
Once the core is chosen, **run it at a small scale first** (a few players, a few plugins) before opening up. Bedrock cores have more compatibility pitfalls than Java cores, so do not pile on a full plugin set right away.
:::

## Next Step

Review server types and version strategy first, then get to work: see [Bedrock Server Types](/tutorials/bedrock/type) and [Protocol Versions and Version Choice](/tutorials/bedrock/protocol).

---

> Parts of this article reference the Bedrock section of [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.

## Related downloads

- [Downloads · Bedrock cores](/downloads/core) — official and community build sources; sign in when prompted to download.
