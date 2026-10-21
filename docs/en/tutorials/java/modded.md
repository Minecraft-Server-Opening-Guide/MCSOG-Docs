---
title: Getting Started with a Modded Server (Fabric / NeoForge)
slug: modded
cat: java
level: 3
order: 26
minutes: 16
tags: [modded, fabric, neoforge, forge, mod-loaders, client-and-server, jvm, crash-logs]
updated: 2026-10-04
draft: false
---

A plugin server and a modded server are two different worlds. Plugins bolt features onto the server and vanilla clients can still join. Mods change the game code itself, and **most content mods must be installed on both the server and the client** - a player without them cannot get in.

This article takes a modded server from nothing to running: choosing a loader, installing it, matching the client, placing mods, diagnosing mismatches, and the performance, backup, and update problems that are specific to modded servers. If you are still deciding between the two approaches, start with [Choosing a Server Core](/tutorials/java/core).

## 1. Plugin Servers vs Modded Servers

| Item | Plugin server (Paper / Purpur and friends) | Modded server (Fabric / NeoForge and friends) |
| --- | --- | --- |
| How it extends the game | Plugins call APIs the server exposes; the game itself is untouched | Mods modify the game code directly |
| Does the player install anything | No, a vanilla client is enough | Usually yes: the **same loader plus the same mod set** |
| Typical content | Administration, minigames, economy, land claims | New blocks, items, mobs, machines, dimensions |
| Update speed | Core updates fast, plugins follow quickly | Slow, and it depends on each mod author |
| Tunable knobs | Plenty, across core config and plugin config | Few; mostly the mods themselves and the JVM |
| Where troubleshooting starts | The plugin list and plugin configs | Whether the **mod lists match exactly**, plus the crash log |

The short version: **pick mods for gameplay content, pick plugins for administration.** Hybrid servers that run both exist, but they cost more in compatibility and maintenance, so they are a poor first project.

### 1.1 The Three Categories: Client-Only, Server-Only, Both-Required

Not every mod is meant to be installed everywhere. Sort them first, or you will hit trouble:

| Category | Typical examples | Where it goes | What happens if you get it wrong |
| --- | --- | --- | --- |
| **Client-only** | Rendering mods (Sodium and similar), minimaps, shader tooling, UI tweaks | Client only | Dropped into a server it usually errors or crashes outright; most loaders refuse to load it |
| **Server-only** | Logic and performance mods that only matter on the server, plus some admin mods | Server only (some will load on a client too, but there is no point) | Harmless on a client in most cases but may be rejected during the handshake; missing on the server, the feature simply does not exist |
| **Both-required** | Mods that add blocks, items, mobs, dimensions, or mechanics | Client **and** server | Missing on either side: the connection is refused or the registries do not match |

There is a fourth, in-between case: mods that **can** be installed on either side but are not required on both (memory or network optimisation, for example). Their project pages mark them as optional.

### 1.2 How a Mod Tells You Which Category It Is

Trust the mod's own project page and documentation, in roughly this order:

| Source | What to look at |
| --- | --- |
| Project page (Modrinth / CurseForge) | The environment fields. Modrinth now uses `environment` (values such as `client_only`, `server_only`, `client_and_server`); the older `client_side` / `server_side` fields use `required` / `optional` / `unsupported` |
| The mod's README or author announcements | Authors often state "server-side only", "client-side only", or "required on both sides" outright |
| Fabric mods | The `environment` field in `fabric.mod.json`: `"*"` (default, both environments), `"client"` (the game client), `"server"` (the dedicated server; an integrated server does not count) |
| NeoForge mods | The metadata in `META-INF/neoforge.mods.toml`, plus entry points marked as client-only in code (for example `dist = Dist.CLIENT`) |

:::warn Do not mix plugin-server advice with modded-server advice
- `spigot.yml`, `paper-world-defaults.yml`, and the whole Bukkit plugin toolbox **do not exist** on a modded server. Following a plugin-server tuning guide on a modded server wastes your time.
- A modded server cannot run Bukkit plugins by default (that needs a hybrid server, which is a separate project with its own trade-offs).
- Plugin-server JVM flag sets, optimisation plugins, and hot-reload habits do not carry over (see section 10).
- The reverse is just as true: do not apply modded-server advice to a plugin server.
:::

## 2. Choosing a Loader: Fabric / NeoForge / Forge

| Loader | Positioning | Who it suits |
| --- | --- | --- |
| **Fabric** | Lightweight, fast to start, quick to follow new versions; the loader itself is separate from the API | Performance-focused servers with optimisation mods plus a few content mods |
| **NeoForge** | The continuation of the Forge lineage for modern versions, with a fuller feature API | Large modern content modpacks, tech and machinery gameplay |
| **Forge** | The veteran loader; still widely used by older packs and older versions | Running an older modpack, or depending on old mods that are only maintained on Forge |

**Read the version landscape carefully.** Which Minecraft versions a loader supports changes over time, so this article deliberately lists no numbers - only how to check:

- Fabric: the official download page lets you pick both the game version and the loader version, and prints the download and launch commands for your selection. The official documentation states Fabric supports all releases from 1.14 onward (and snapshots from 18w43b onward).
- NeoForge: the project homepage serves the installer for the Minecraft version you select, and the official docs walk through the server install.
- Forge: the official downloads page lists latest and recommended builds per version and still publishes for several versions, including newer ones - but a substantial part of the mod ecosystem for new versions has moved to NeoForge.

> **Downloadable here** — loader cores (Fabric / NeoForge / Forge) are in **[Downloads · Server cores](/downloads/core)**; mods themselves are in **[Downloads · Mods](/downloads/mods)**; if you end up on the plugin route, plugins are in **[Downloads · Plugins](/downloads/plugins)**. All three index official and community links only — click Download and sign in when prompted; **no file is stored on this site**.

:::note Loaders are essentially not interchangeable
A given mod usually supports one loader. A Fabric mod cannot be dropped into a NeoForge server, and vice versa. Choosing a loader is really choosing **which side your mods live on**: check which loaders and game versions your target mods support before you install anything.
:::

A practical order of decisions:

```
Decide the gameplay (which mods) -> check the loaders and game versions they support
  -> pick the loader + game version with the largest overlap -> then install the server
```

## 3. Installing a Loader on the Server

Installer UIs and file names change between versions, so what follows is the **generic flow**. For the exact steps, use the loader's own documentation.

### 3.1 Check the Java Version First

| Minecraft version | Required Java |
| --- | --- |
| 1.16.5 and older | 8 |
| 1.17.2 | 16 |
| 1.18.2 - 1.20.4 | 17 |
| 1.20.5 and newer | 21 |

The wrong Java version is the most common cause of "the installer will not open" and "the server will not start", so rule it out first.

### 3.2 The Generic Flow

1. Create an empty directory to be the server root.
2. On the loader's official download page, pick the Minecraft version and the loader version, then download the installer `.jar`.
3. Run the installer and choose the **server** install mode. On the command line this is usually the `--installServer` argument.
4. The installer produces a **launch script or launcher jar** (plus the library directories it needs).
5. **Start it once.** The first run generates `eula.txt`, `server.properties`, `mods/`, `config/`, `logs/`, and more, then exits because the EULA has not been accepted.
6. Open `eula.txt` and change `eula=false` to `eula=true` (which means you accept the Minecraft EULA).
7. **Start it again** and confirm the server comes up with no errors in the console.
8. Only now put mods into `mods/`, then restart.

### 3.3 Fabric

- The official server download page (the server page on fabricmc.net) lets you choose versions and gives you the download and launch commands. Use the **file name and launch command the page shows you**.
- The installer has a Server tab for generating a server launcher locally.
- Most Fabric mods need **Fabric API**, which is itself a mod and belongs in `mods/`.

```bash
# The official page prints commands similar to these; use whatever it actually shows
# 1) Download the server launcher
# 2) First start
java -jar <server-launcher-file-name> nogui
```

### 3.4 NeoForge

The flow from the official NeoForge documentation (shown here with a 21.x-style version):

```bash
# 1) Download the installer (use the version from the official site)
wget https://maven.neoforged.net/releases/net/neoforged/neoforge/<version>/neoforge-<version>-installer.jar

# 2) Install the server
java -jar neoforge-<version>-installer.jar --installServer

# 3) First start (it exits because of the EULA)
./run.sh        # use run.bat on Windows
```

Points that matter:

- The install creates `run.sh` / `run.bat` and a **`user_jvm_args.txt`**. **Change memory in `user_jvm_args.txt`, not by hand-editing `run.sh`.**
- The `mods` folder appears after the first start; that is where mods go.
- To update NeoForge, download and run the installer for the new version the same way. The official docs explicitly warn: **always back up your world before updating NeoForge or mods.**

### 3.5 Forge (Older Versions and Older Packs)

```bash
java -jar forge-<version>-installer.jar --installServer
```

- Newer Forge behaves much like NeoForge: it generates `run.sh` / `run.bat` and `user_jvm_args.txt`.
- Older versions generate a directly launchable `forge-<version>.jar` that you start with `java -jar`.
- Mods for old versions are often only maintained on Forge, so there may be no real choice.

:::tip When it will not start, read the log first
Loader install failures and mod crashes all land in `logs/latest.log`, `logs/debug.log`, and `crash-reports/`. See [Common Errors and Crash Troubleshooting](/tutorials/faq/errors) for the diagnostic approach.
:::

## 4. The Client Side: Players Need the Same Setup

When players cannot join a modded server, it is almost never the network - it is a **mod list that does not match the server**.

What each player must do:

1. Install the **same loader**, on the **same Minecraft version**.
2. Install the **same set of mods**, including every dependency (Fabric API, for example).
3. Match the mod versions too (see section 6).

### 4.1 Why a Mismatched List Blocks the Join

When a client connects, the two sides perform a handshake: they exchange loader information, the mod list, and parts of the registries. Any of the following gets the connection refused or throws an error:

- A **both-required** mod on the server that the client lacks;
- The same kind of mod on the client but not on the server;
- The **same mod at a different version**;
- A missing dependency.

### 4.2 What the Player Sees

| Loader | Behaviour |
| --- | --- |
| NeoForge / Forge | The connection is rejected and a screen listing the rejected mods appears (commonly called the "mod rejections" or incompatible-mods screen), with a reason per entry such as "this mod is missing on the server" or "version mismatch". The exact wording and layout change between versions |
| Fabric | When dependencies are missing at load time, the loader shows an "Incompatible mod set!" style error screen and lists the missing or conflicting mods in the log. The official Fabric docs have dedicated pages for crash reports and dependency overrides |

:::tip How to save your players a lot of pain
- Zip the client `mods/` folder and hand it out, or publish a client pack and a server pack on a modpack platform.
- Put the loader, Minecraft version, loader version, and mod list version in a pinned announcement.
- After updating mods on the server, **update the client pack in the same session** - otherwise every player on the old pack is locked out immediately.
:::

## 5. Where Mods Go

| Location | What it holds |
| --- | --- |
| Server `mods/` | Every mod (`.jar`) the server loads |
| Client `.minecraft/mods/` | Every mod the player's client loads |
| `config/` | The mods' own configuration files. Most are generated **after the first start** and are not inside `mods/` |
| `defaultconfigs/` | Used by some loaders and packs for "defaults for new worlds" |

:::warn Client-only mods must NOT go on the server, and vice versa
This is one of the most common causes of modded-server crashes:

- Dropping rendering or UI **client-only mods** into the server's `mods/` folder makes the server error out or crash on startup, because the client classes are not there.
- Handing a **server-only mod** to a client is useless at best and a client crash at worst.
- Installing only half of a **both-required mod** simply locks players out.

The test is the one from section 1.2: go by the project page's environment fields and the author's own notes.
:::

## 6. The Three-Way Matching Rule

A modded server works only when three things line up at once:

| What must match | Requirement |
| --- | --- |
| Game version | The server, the client, and every mod must support the same Minecraft version |
| Loader version | Client and server run the same loader; keep the loader versions aligned (at minimum, both inside what the mods require) |
| Mod versions | The same mod must be the **same version** on both sides, and dependencies must be present and satisfy their version ranges |

### 6.1 Diagnosing a Mismatch from the Log

| Symptom or log line | What it means | What to do |
| --- | --- | --- |
| Crash on startup, the crash report names a mod | That mod is incompatible with the current game or loader version, or a dependency is missing | Switch to the matching version, or add the dependency |
| The log mentions a missing dependency or failed dependency resolution | A declared dependency is absent or out of range | Install what the log asks for |
| The log shows a mod failing to load, or a class-not-found error | Often a client-only mod on the server (or the reverse) | Remove it from the wrong side |
| A player is refused and a screen lists mods | The two mod lists or versions do not match | Align both sides |
| The crash report says `Is Modded: Definitely; ... brand changed to 'fabric'/'neoforge'` | This only confirms you are running modded; it is not the error itself | Keep reading for the real stack trace |

Dependency semantics (Fabric specification; NeoForge is similar):

| Declaration | Meaning |
| --- | --- |
| `depends` | Hard dependency; missing means failure |
| `recommends` | Soft dependency; missing produces a warning |
| `conflicts` / `breaks` | A conflict; a match means an error |

### 6.2 Finding the Mod That Is Actually Breaking Things

Use a **binary search**, which the official NeoForge documentation recommends:

1. Move half the mods out of `mods/` (keep dependencies intact).
2. Start the game or server and see whether the problem persists.
3. If it persists, repeat step 1 on the half still installed; if it is gone, swap in the other half and repeat.
4. Continue until the offending mod is isolated.

## 7. Performance Mods Worth Knowing, by Category

Modded-server performance work is mostly about installing the right mods rather than tuning config files. These are confirmed to exist and are widely used (loader support comes from each project's own page and changes over time, so re-check before installing):

| Category | Mod | What it does | Loaders | Notes |
| --- | --- | --- | --- | --- |
| Game logic optimisation | **Lithium** | Optimises game logic (mob spawning, AI, block behaviour) without compromising behaviour | Fabric, NeoForge, Quilt | Can run on both sides; the server gains the most |
| Memory usage | **FerriteCore** | Reduces memory usage (block state and similar data structures) | Fabric, Forge, NeoForge, Quilt | Very useful on memory-hungry modded servers |
| Networking | **Krypton** | Optimises the networking stack to cut bandwidth and CPU cost | Fabric | Aimed mainly at servers and multiplayer |
| Light engine | **Starlight** | Rewrites the light engine to fix lighting performance and lighting errors | Fabric | The project is archived and stops at 1.20.4; its own notes say Starlight and vanilla are already close on 1.20. **Do not force it onto newer versions** |
| Chunk pre-generation | **Chunky** | Generates chunks ahead of time so exploring does not stutter the server | Fabric, Forge, NeoForge, plus Paper/Spigot and friends | Close to mandatory for a long-running survival server |
| Client rendering | **Sodium** | Client-side rendering optimisation for higher frame rates | Fabric, NeoForge, Quilt | **Client-only**; never put it on the server |

:::note Two rules for "optimisation" mods
- **Never stack two optimisation mods that do the same job** (two light engine rewrites, for example). They conflict far more often than not.
- Optimisation mods change internal behaviour, so **technical and redstone-heavy servers should be careful**: better to run slightly slower than to break a machine.
:::

## 8. World and Data Compatibility: Removing a Mod Is Irreversible

Blocks, items, entities, dimensions, and biomes that a mod adds are written into the world save. **Remove the mod and that data is still in the save, but the game no longer understands it:**

- At best you get "missing" blocks or empty entities that look like air while the data is still there;
- At worst chunk loading errors out, or the save will not open at all;
- Reinstalling the **same mod at a compatible version** usually restores it.

:::warn Back up before you touch the mod list
- Before adding mods, removing mods, changing loaders, or changing game versions, **back up the world directory completely** (see [Backup and Restore](/tutorials/java/backup)).
- A modded world does not downgrade cleanly. Opening it in vanilla or on an older version is a high-risk move.
- Want to "just try a mod"? Try it on a **copy**, never on the live save.
:::

## 9. Updating a Modpack Server Safely

Follow this order and do not skip steps:

1. **Back up**: the world, `config/`, and the mod list.
2. **Freeze changes**: stop the server, or work inside a maintenance window.
3. **Update the loader first** and start once to confirm the server itself is fine (old mods may error here, which is expected).
4. **Update mods one batch at a time**, not all at once. Batches make it obvious which mod broke things.
5. **Realign the client pack**: repackage and redistribute the updated client-side `mods/`.
6. **Watch it**: check `logs/latest.log` after startup, then watch TPS and errors with players online (the methods in [Performance Tuning](/tutorials/java/optimize) apply).
7. **Keep the rollback copy**: retain the previous server directory and client pack so you can revert immediately.

## 10. Memory and JVM Flags

Modded servers and plugin servers have different memory profiles:

| Item | Plugin server | Modded server |
| --- | --- | --- |
| Heap demand | Comparatively low | **Noticeably higher**: registries, models, recipes, and machine data all consume memory |
| Startup time | Short | Long; several minutes is normal with hundreds of mods |
| Main bottleneck | Main thread plus plugin quality | Main thread plus mod quality plus memory/GC |
| Where flags come from | The core's official documentation | **The loader's own launch file notes** |

Practical advice:

- **Give it enough heap, but not too much.** An oversized heap makes GC pauses longer. Start from a sensible value for your mod count and player count (a small modded server commonly starts around 4-8 GB) and adjust from there.
- On NeoForge and newer Forge, edit `user_jvm_args.txt` (it is generated at install time and contains its own comments). Do not hand-edit `run.sh`.
- With other launch methods, set memory with `-Xms` / `-Xmx` in your startup script.
- **Do not copy a plugin-server flag set.** Flag combinations built for Paper/Spigot assume a different workload and GC behaviour. Prefer the loader's official documentation and the mod authors' notes.
- Flags only address memory and GC. They **cannot fix a single-core bottleneck**, and they cannot fix a badly written mod.

```bash
# Illustrative: put memory settings in your startup script or user_jvm_args.txt
# Tune the numbers to your mod count and player count
-Xms4G
-Xmx8G
```

## 11. Troubleshooting Table

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| The server crashes on startup and the log names a mod | The mod does not match the game or loader version, or a dependency is missing | Install the matching version and add the dependency |
| The screen or log says "Incompatible mod set!" or lists rejected mods | The two mod lists or their versions differ | Align the mods and versions on both sides |
| After removing a mod, missing blocks or entities appear in the world | Leftover mod data the game no longer understands | Reinstall a compatible version to restore it; **back up first** and avoid writing to the save meanwhile |
| Players cannot join and the server logs nothing obvious | The client is missing mods, dependencies, or has different versions | Have them use the same client pack |
| The server starts but runs badly | A poorly performing mod, too many entities or machines, or too little memory | Profile it (see [Analysing Server Performance with spark](/tutorials/ops/spark)) and fix the actual cause |
| Startup sits for a long time loading mods | Many mods, first-time config generation, slow disk | Expected behaviour; use an SSD and be patient |
| A client-only mod was installed on the server | The server lacks the client classes | Remove it from the server's `mods/` |

## Where to Go Next

The complexity of a modded server comes from one iron rule: **both sides must match**. Decide the gameplay and version first, install the loader second, and add mods last. Starting the server after every single mod, and backing up before every change, saves a lot of rework.

Related reading:

- Core and gameplay choices: [Choosing a Server Core](/tutorials/java/core)
- The plugin-server route, for contrast: [Introduction to Plugins](/tutorials/java/plugins), [Plugin Configuration Basics](/tutorials/java/plugin-config)
- Performance and diagnosis: [Performance Tuning](/tutorials/java/optimize), [Common Errors and Crash Troubleshooting](/tutorials/faq/errors), [Analysing Server Performance with spark](/tutorials/ops/spark)
- Long-term operations: [Monitoring and Alerting](/tutorials/ops/monitoring)

> Loader versions, mod compatibility, and configuration key names are subject to each project's official documentation.

## Related downloads

- [Downloads · Server cores](/downloads/core) — official builds of Fabric / NeoForge / Forge and other cores.
- [Downloads · Mods](/downloads/mods) — Modrinth mod entries filterable by loader and game version.
- [Downloads · Plugins](/downloads/plugins) — server plugins (including MCDR); see [Plugins from scratch](/tutorials/java/plugins).

All three index official and community links only; click Download and sign in when prompted, and **no file is stored on this site**.
