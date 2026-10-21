---
title: Server Core Comparison
slug: compare
mc: [1.21.x, 1.20.4]
tags: [core, comparison, paper, purpur, folia, leaves, leaf, fabric, forge, velocity, bds]
updated: 2026-10-04
---

A side-by-side look at the performance, ecosystem and best-fit scenarios of the common server cores. Pick one first, then read its guide.

> "Performance" in the tables is a relative reference (typical behaviour on the same hardware with the same player count), not an absolute figure; real results depend on the version, the number of plugins or mods, and the hardware.

## Core comparison

| Core | Type | Performance | Plugins | Mods | Learning curve | Best for |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla | Official release | Baseline | Not supported | Not supported | Beginner | Vanilla gameplay, verifying vanilla behaviour |
| Spigot | Bukkit family | Medium | Large ecosystem (upstream of Paper) | Not supported | Beginner | Servers that must keep older plugins working |
| Paper | Spigot fork (Bukkit family) | High (async chunks, entity optimisation) | Largest ecosystem | Not supported | Beginner | Survival and plugin servers, the default choice |
| Purpur | Paper fork | High (includes every Paper optimisation) | Paper plugin compatible | Not supported | Intermediate | Servers that need a large number of gameplay toggles |
| Leaf | Paper fork | High | Paper plugin compatible | Not supported | Intermediate | Balancing performance and vanilla mechanics |
| Leaves | Paper fork | High | Paper plugin compatible | Not supported | Intermediate | **Technical play** (restoring vanilla features) plus plugins |
| Folia | Paper fork (multi-core) | **Multi-core parallelism** (regionised multithreading) | Poor compatibility, most plugins are not adapted | Not supported | Intermediate | Machines with **many cores and a low clock speed** |
| Fabric | Lightweight mod loader | High (close to vanilla) | Needs a server-side plugin bridge | Active ecosystem | Intermediate | **Technical play**, lightweight modpacks |
| Forge | Traditional mod loader | Medium (more mods means more overhead) | Not supported | The largest catalogue of older modpacks | Intermediate | Large tech modpacks |
| NeoForge | Community fork of Forge | Medium | Not supported | The main choice on new versions | Intermediate | Modded servers on 1.20.2 and later |
| Velocity | Proxy | Very high (forwards traffic, runs no world) | Proxy plugins | Not supported | Intermediate | Linking several backend servers, cross-server play |
| BDS | Official Bedrock server | Medium | Not supported (add-ons are possible) | Not supported | Beginner | Bedrock players playing together |

> Neither vanilla nor plugin servers can load mods: vanilla supports only data packs, and plugin servers support only plugins.

### How the newer cores describe themselves

| Core | Official description (verbatim) |
| --- | --- |
| Folia | *Fork of Paper which adds regionised multithreading to the dedicated server.* |
| Leaves | *Fork of Paper aimed at repairing broken vanilla properties.* |
| Leaf | *A Paper fork focused on finding the balance between performance, vanilla mechanics, and stability.* |

## How to choose

### Choose by hardware (the easiest thing to get wrong)

The Minecraft main thread is **single-threaded**: entities, chunks, redstone and plugin logic all sit on **one core**, so **more cores does not mean faster**.

| Your machine | Recommended | Why |
| --- | --- | --- |
| **Strong single-core** (4 to 8 cores, 3.5GHz+) | **Paper / Purpur / Leaf** | The best single-thread optimisation; the stronger the single core, the bigger the gain |
| **Many cores but low clock** (16+ cores, under 2.5GHz) | **Folia** | Single-core is the weak spot, so Paper wastes cores; Folia uses regionised multithreading to use them all |
| Not sure | **Paper** | The most stable, the largest ecosystem, the most documentation |

> The price of Folia: **poor plugin compatibility** (many plugins are not adapted), and cross-region interaction behaves differently from Paper, so it is **not suitable for technical play**.

### Choose by gameplay

- **First server**: go straight to Paper. It has the largest ecosystem, the most complete documentation and enough performance.
- **Fine-grained gameplay control**: Purpur (Paper plus a huge number of toggles).
- **Technical play**: **Fabric** or **Leaves** are the way to go, since both guarantee consistent vanilla behaviour; **do not use Paper / Purpur**, which change some vanilla behaviour for performance and will break redstone machines.
- **Running mods**: Fabric (lightweight), NeoForge (the main choice on 1.20.2+) or Forge (older modpacks).
- **Linking several servers**: add a Velocity proxy on top.

## Bedrock core comparison

The Bedrock core ecosystem is much smaller than the Java one; the four below are the mainstream options. **Version compatibility on Bedrock is far stricter than on Java**: the client protocol must match the server protocol before a player can join (see "Protocol Versions and Version Choice").

| Core | Language | Plugins | Multi-core | Protocol tracking | Plugin ecosystem | Learning curve | Best for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **BDS** | C++ | Needs a community loader | Single-threaded | Official, always current | The most stable official option | Beginner | Vanilla survival, official compatibility |
| **Nukkit** | Java | Native | Average | Lags behind | Small | Beginner | Learning, small servers (upstream is no longer active) |
| **PowerNukkitX** | Java | Native | **Multi-core optimisation** | Supports the latest | Medium (Nukkit plugin compatible) | Intermediate | High performance plus heavy customisation |
| **PocketMine-MP** | PHP | Native | Average (bottlenecks under heavy load) | Lags behind | **The largest** (most PHP plugins) | Intermediate | Plugin-driven gameplay, if you know PHP |

### Bedrock plugin loaders (BDS only)

The official BDS **does not support plugins by itself**; community loaders fill the gap:

| Loader | Language for plugins | Recommendation | Supported versions |
| --- | --- | --- | --- |
| **LeviLamina** (LLL / LLv3) | C++ (formerly LiteLoaderBDS) | **Highly recommended** (best ecosystem) | 1.20.61 to 1.21.3 |
| **EndStone** | C++ / Python (Bukkit-like API) | Recommended (very small ecosystem, high potential) | 1.20.71 to 1.21.2 |
| **BDSX** | Node.js (hooks plus network packets) | Recommended (maintained since 2019) | 1.12 to the latest |

> For the differences between Bedrock and Java see [Java vs Bedrock](/wiki/editions); for the Bedrock server setup flow, start with "Bedrock Server Types" and the documents that follow it.

## Next steps

Once you have picked a core, prepare the environment with the guides and then download that core:

- **Choosing a server core**: see [Choosing a Server Core](/tutorials/java/core) for the full walkthrough of picking a core by hardware and gameplay
- **Preparing the environment**: see [Environment Setup (Windows and Linux)](/tutorials/java/environment) to install the right Java, open the ports and create the directories
