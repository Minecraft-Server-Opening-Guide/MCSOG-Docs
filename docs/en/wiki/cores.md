---
title: Cores, Plugins and Loaders Compared
slug: cores
cat: wiki
level: 2
order: 5
minutes: 14
tags: [cores, plugins, mods, loaders, paper, fabric, bedrock]
updated: 2026-10-04
draft: false
---

The first decision when hosting is "what do I actually run". It goes wrong so often because four words get mixed together: **core, plugin, mod and loader**. This page puts them side by side: the Java Edition core families and mod loaders, Bedrock's official and third-party cores, the community loaders for BDS, and finally a decision path for "which one should I pick".

> Which game versions each project supports, and how well, **changes over time**: cores stop being maintained, loaders race to catch up with new releases, plugins lose their authors. This page only maps families and positioning; **for concrete version ranges and support status, follow each project's official repository and documentation**.

## 1. Four Words, Kept Apart

| Word | What it is | Typical form | Do players install anything |
| --- | --- | --- | --- |
| Core (server) | The program that runs the world and the logic | `paper-x.jar`, `bedrock_server.exe` | No |
| Plugin | Extends features through APIs the core exposes | A jar or phar dropped into `plugins/` | No, a vanilla client is enough |
| Mod | Changes the game itself | A jar dropped into `mods/` | **Most content mods require the same set on the client** |
| Loader | The framework that loads and runs mods | Fabric, NeoForge, Forge, Quilt | Yes, on both client and server |

The one-line distinction: **plugins add features around the server, mods change content inside the game.** That difference decides whether players have to install anything, and it shapes every troubleshooting step afterwards.

## 2. Java Edition Server Cores

Java cores form one clear chain: Bukkit, then Spigot, then Paper, then Purpur, Folia, Leaves and Leaf. **Plugin compatibility is largely inherited from upstream**: a plugin that works on Paper usually works on Purpur, but not necessarily the other way round.

| Core | Characteristics | Plugin compatibility | Who it suits |
| --- | --- | --- | --- |
| Vanilla | The official server; data packs only, no third-party extensions | No plugins | Verifying vanilla behaviour, running pure vanilla gameplay |
| Spigot | Continuation of Bukkit and the upstream of Paper; slower release cadence | Large ecosystem; many older plugins target it | Cases that need older plugins without moving to Paper |
| Paper | A Spigot fork; the most mature async chunk, entity and network optimisation | **Largest ecosystem**; the default target for most plugins | **The default first choice**: stable, well documented, fast enough |
| Purpur | A Paper fork with a large set of gameplay toggles | Compatible with Paper plugins | Fine-tuning vanilla mechanics without writing code |
| Folia | A Paper fork with regionised multithreading | **Poor**: most plugins are not adapted and need explicit support | Machines with many cores and low clocks; **not for technical play** |
| Leaves | A Paper fork aimed at repairing vanilla properties broken by performance work | Compatible with Paper plugins (check each project's notes) | **Technical (redstone) play plus plugins** |
| Leaf | A Paper fork balancing performance, vanilla mechanics and stability | Compatible with Paper plugins (check each project's notes) | Wanting performance and a vanilla feel without all of Leaves' changes |

Three reminders:

1. **Leaves and Leaf are two different projects** whose names differ by one letter. Check the spelling when searching for documentation or downloads.
2. **Folia is not "a faster Paper".** It splits the world into regions and schedules them in parallel, so cross-region interaction differs from Paper, and plugins without support will error out or misbehave. Confirm your plugins declare Folia support before choosing it.
3. **Vanilla supports data packs only.** If you want plugins you must change the core; if you want mods you must add a loader.

### 2.1 The Inheritance Chain

Memorise this chain and you can judge half of all plugin-compatibility questions yourself:

```text
Bukkit (the earliest server API)
  +- Spigot (the continuation of Bukkit)
       +- Paper (the mainstream fork with the largest plugin ecosystem)
            +- Purpur (the most gameplay toggles)
            +- Folia (regionised multithreading, poor plugin compatibility)
            +- Leaves (restoring vanilla properties, for technical play)
            +- Leaf (a balance of performance, vanilla mechanics and stability)
```

The rule is **downward compatible, upward not guaranteed**: a plugin written for Paper usually runs on Purpur; a plugin written for Folia is not necessarily adapted for Paper; an older Spigot-only plugin generally still runs on Paper, though it may warn about deprecated APIs.

The full side-by-side comparison and the hardware-based selection guide are in [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison); the complete walkthrough is in [Choosing a Server Core](/tutorials/java/core).

## 3. Java Edition Mod Loaders

A modded server is a different world from a plugin server. The loader decides which mods you can install, and **a given mod usually supports only one loader**.

| Loader | Positioning | Ecosystem | Release cadence |
| --- | --- | --- | --- |
| Fabric | Lightweight and fast to start; the loader and its API are separate, so many features come from the Fabric API mod | Active; strong in optimisation and lightweight content mods | Fastest to follow new versions |
| NeoForge | The continuation of Forge's lineage on modern versions; fuller feature APIs | The main force behind large modern content and tech modpacks | Moves with each major version |
| Forge | The veteran loader; heavily used by historical modpacks and older versions | The largest collection of older modpacks; a good share of new-version development has moved to NeoForge | Still publishes builds for several versions, but follows new versions less closely |
| Quilt | A fork of Fabric aiming at more open governance and new APIs | Clearly smaller than Fabric; it can load a good share of Fabric mods but **not all of them** | Less active than Fabric; confirm your mods exist for it first |

The right order is **gameplay first, loader second**:

```text
List the mods you cannot do without
  -> check which loader and game version each one supports
  -> take the combination with the largest intersection
  -> then install the server
```

Doing it the other way round (pick a loader, then hunt for mods) almost always means starting over. Installation, client alignment and troubleshooting are covered in [Getting Started with a Modded Server (Fabric / NeoForge)](/tutorials/java/modded).

### 3.1 Do Not Forget the Runtime

Cores and loaders both require a matching Java runtime. A wrong Java version is the most common cause of "the installer will not open" and "the server will not start":

| Minecraft version | Java usually required |
| --- | --- |
| 1.16.5 and earlier | 8 |
| 1.17.2 | 16 |
| 1.18.2 to 1.20.4 | 17 |
| 1.20.5 and newer | 21 |

This table reflects the **common mapping at the time of writing**; newer releases can raise the requirement at any time, so follow the official documentation for your core and loader.

### 3.2 The Client Needs the Loader Too

A common misconception about modded servers is that "getting the server right is enough". In practice:

| Mod type | Where it goes | What happens if you get it wrong |
| --- | --- | --- |
| Client-only (rendering, minimaps, interface) | Client only | Dropping it on the server usually errors out or is refused by the loader |
| Server-only (logic and performance) | Server only | Pointless on the client; missing on the server means the feature does not exist |
| Required on both (new blocks, items, dimensions) | Both client and server | Miss either side and the connection is refused, or a registry mismatch errors out |

So when you publish a modpack, **ship both a client and a server list**, and state clearly which mods are optional.

## 4. Proxies: Not a Core, but Part of the Choice

A proxy does not run a world itself; it forwards players to backend servers. It belongs to multi-server setups, and **a single server does not need one**.

| Proxy | Positioning | Notes |
| --- | --- | --- |
| Velocity | A modern proxy: fast and actively maintained | The mainstream choice for linking backend servers |
| BungeeCord | The veteran proxy | Long-standing ecosystem and documentation; new projects usually prefer Velocity |

With a proxy in place, the path becomes "client, then proxy, then backend". Plugins have to be installed on the correct side, and cross-version plugins behave differently depending on which side they run on. See [Cross-Version Compatibility](/tutorials/java/via) for the trade-offs.

## 5. Bedrock Edition: Official and Third-Party Cores

Bedrock's core ecosystem is much smaller than Java's; four projects dominate.

| Core | Language | Plugin ecosystem | Notes |
| --- | --- | --- | --- |
| BDS (official) | C++ | **No plugin support of its own**; needs a community loader | The official server with the best compatibility; mob ticking sits on a single thread, so smoothness depends mostly on single-core speed |
| Nukkit | Java | Native plugin system, smaller ecosystem | Lightweight and easy to start; **the original project is no longer active**, so prefer an active fork |
| PowerNukkitX | Java | Compatible with a large share of Nukkit plugins; medium-sized ecosystem | Nukkit's modern main fork: newer protocol support, multi-core optimisation, 384-block world height, built-in Terra terrain generator |
| PocketMine-MP | PHP | **The largest** (most PHP plugins) | If you know PHP you can write plugins; performance bottlenecks under heavy load and slower to follow updates |

Rules of thumb:

- **Official compatibility and stability**: BDS, adding a community loader only if you need plugins;
- **High performance and deep customisation**: PowerNukkitX;
- **The largest pool of ready-made plugins, with PHP skills**: PocketMine-MP;
- **Starting simple**: get BDS working first, then consider a third-party core.

Per-item comparisons and setup paths are in [Choosing a Bedrock Core](/tutorials/bedrock/cores) and [Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party).

### 5.1 Runtimes for Third-Party Cores

Confirm which runtime the machine has before choosing a core, or you will stall at step one:

| Core family | What it needs | Notes |
| --- | --- | --- |
| BDS | No Java or PHP; unzip and run | Platform archives and executable names follow the official download page |
| The Nukkit family (including PNX) | **Java**, usually a fairly recent version | Use 64-bit Java on a 64-bit system, or the process dies mid-run at the memory limit |
| PocketMine-MP | **PHP** (preferably the runtime the project packages) | Distribution packages are often old and short of extensions; check `php -v` first |

Choosing the wrong family (Java for PMMP, PHP for Nukkit) does not "sort of work": it fails to start, full stop.

## 6. Plugin Loaders for BDS

Official BDS has no plugin system at all. To run plugins on BDS you must install a community loader, and **loaders are tightly bound to game versions**: confirm the loader has caught up before you upgrade the server.

| Loader | Plugins are written in | Ecosystem | Notes |
| --- | --- | --- | --- |
| LeviLamina | C++ (formerly LiteLoaderBDS) | Currently the most mature and the largest | Supports only specific version ranges; check before upgrading BDS |
| BDSX | Node.js / TypeScript | Maintained for a long time; low-level work with hooks and network packets | Wide version coverage; suits people willing to write code |
| EndStone | C++ / Python with a Bukkit-like API | A very small ecosystem, but a clear direction | For those who want a Bukkit-style development experience |
| BDSpyrunner | Python | Small | Its exact shape and supported versions follow the project's official repository |

The community also has **alternative servers** that are not BDS loaders: gomint and Dragonfly (written in Go), and the community server Allay, plus the Bedrock proxy WaterDogPE. They share one trait: **thin ecosystems and thin documentation**, so problems are hard to get help with. Unless you have a clear reason, do not start there.

:::warn Loaders are tightly bound to game versions
Bedrock server builds and protocols are closely coupled, and community loaders usually support only a **narrow version range**. "Upgrade BDS to the latest, then go find a loader" is the classic way to break a server; the correct order is to **confirm which build the loader supports, then decide where the server goes**.
:::

## 7. Which One Should I Pick

```text
Players use vanilla clients, and you need management or gameplay plugins
  -> Paper (first choice)
  -> tuning vanilla mechanics: Purpur
  -> technical play plus plugins: Leaves or Leaf (watch the name)
  -> many cores, low clocks: consider Folia (confirm plugin support first)

Players want mods and new content
  -> fix the mod list first -> Fabric (lightweight/optimisation) or NeoForge (modern content packs)
  -> older modpacks: Forge
  -> only when a mod is Quilt-exclusive: consider Quilt

Players are on Bedrock
  -> vanilla survival with official compatibility: BDS (add a loader if you need plugins)
  -> high performance and customisation: PowerNukkitX
  -> the largest pool of ready-made plugins, with PHP: PocketMine-MP

You need several servers linked together
  -> add a proxy layer (Velocity first)
```

## 8. Plugins and Mods Are Two Different Worlds

:::warn Plugins and mods are not the same thing, and mixing them up keeps costing you
**Plugins** call APIs exposed by the core and are installed on the server; players join with a **vanilla client**. Typical content: management, economy, land claims, minigames.

**Mods** change the game itself and are installed on a **loader**; most content mods require **the same set on both client and server**, and players without them cannot join. Typical content: new blocks, items, mobs and dimensions.

Several hard rules follow:

- **A plugin server cannot run mods**: Paper-family cores have no mod loading, and there is no `mods/` directory.
- **A modded server cannot run plugins by default**: Fabric and NeoForge servers do not understand Bukkit plugins; there is no `plugins/` directory, and none of `spigot.yml`, `paper-world-defaults.yml` and friends exist either.
- **Tuning advice does not transfer**: plugin-server JVM flags, optimisation plugins and hot-reload habits are largely useless on a modded server, and vice versa.
- **The same feature is implemented completely differently on each side**: land claims, for example, come from a plugin on one side and a mod on the other, with no shared configuration or commands.
:::

## 9. The Cost of a Hybrid Core

A **hybrid** server is a project that tries to provide both a plugin API and mod loading at once. It can genuinely run plugins and mods on one server, but the costs deserve stating plainly:

| Cost | Explanation |
| --- | --- |
| Slow upstream tracking | It has to adapt to a Minecraft version, a mod loader and a plugin API at the same time, so new versions usually arrive late |
| Compatibility problems on both sides | Plugins and mods can both break, and it is hard to tell which side caused it |
| Hard to get help | The user base is small, ready-made answers are rare, and maintainer time is limited |
| Risky upgrades and rollbacks | World format, mod data and plugin data are mixed together, so rollback is far more complex than on a pure plugin or pure modded server |

:::warn Do not start with a hybrid core
A hybrid answers a "I want both" requirement, but it stacks the risks of two systems on top of each other. **Beginners should not touch one.** If you genuinely need it, get a pure plugin server or a pure modded server stable first, then evaluate whether a hybrid is worth it, following that project's official documentation. Several hybrid projects have existed over the years with very different support and maintenance states, so always check the latest release and supported versions before choosing.
:::

## 10. How to Verify Versions and Ecosystem

Never pick a core from memory. Run these four checks every time:

| Step | What to check | Where |
| --- | --- | --- |
| 1 | Whether the core publishes a build for your target game version | The core's official download page or repository |
| 2 | Whether your plugins or mods declare support for that core and version | The plugin or mod release page and support list |
| 3 | Which version range the loader (if any) supports | The loader's official documentation |
| 4 | Which Java or PHP runtime is required | The core's and loader's official documentation |

The timeline only tells you **when a version was released**; it cannot tell you whether your core has caught up. Check the two separately, as described in [How to Read the Version Timeline](/wiki/versions-guide).

## 11. Common Selection Mistakes

| Mistake | Consequence | Correct approach |
| --- | --- | --- |
| Dropping mods into a plugin server | The server never loads them, or errors out | Separate plugins from mods and pick the matching core or loader |
| Choosing a loader before knowing the mods | The content mods you want do not support it, so you start over | List the mods first, then pick the loader |
| Confusing Leaves with Leaf | Vanilla-property behaviour differs from what you expected | Check the project name and its official notes |
| Assuming Folia is "a faster Paper" | Plugins break across the board | Confirm each plugin declares Folia support |
| Judging on "performance" alone | The core is fast but lacks the plugins you need | Ecosystem and plugin support come before performance numbers |
| Reaching for a hybrid to get everything at once | Stacked compatibility problems and hard upgrades | Get a pure plugin or pure modded server working first |
| Upgrading BDS straight to the latest | The community loader has not caught up, so plugins stop working | Confirm the loader's supported range before upgrading the server |

## 12. Beyond Performance: Three Kinds of Cost

The word "performance" misleads more than any other when choosing a core. What actually decides the experience is three kinds of cost, and they point at different hardware:

| Cost | Decided by | Symptom | What to choose |
| --- | --- | --- | --- |
| Single-core speed | Minecraft's main logic is largely single-threaded: entities, chunks, redstone and plugin logic all sit on **one core** | Lag as players gather, TPS drops, slow chunk loading | Pick the Paper family on machines with strong single-core speed; only consider Folia when cores are many but clocks are low |
| Memory | View distance, entity counts, plugin caches and mod counts | Frequent GC stutter, out-of-memory crashes | Cut view distance and entity caps first, then add memory; memory never substitutes for single-core speed |
| Disk and network | Chunk reads and writes, autosaves, chunk sending as players join | Server-wide stalls during saves, slow joins | Prefer SSDs; network tuning is a separate track |

So "how many cores does this machine have" matters far less than "**how fast is one core**". Plugin count, mod count and view distance usually affect the experience more than swapping cores does.

## Next Steps

- How to install and tune once chosen: see [Choosing a Server Core](/tutorials/java/core) and [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison)
- The full modded-server walkthrough: see [Getting Started with a Modded Server (Fabric / NeoForge)](/tutorials/java/modded)
- Bedrock cores and third-party cores: see [Choosing a Bedrock Core](/tutorials/bedrock/cores) and [Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party)

> Command and version details follow the official documentation for the corresponding server software and the game.
