---
title: BDS Server
slug: bds
cat: bedrock
level: 2
order: 4
minutes: 12
tags: [bedrock, bds, directory-structure, plugin-loader, levilamina, endstone, bdsx]
updated: 2026-10-04
draft: false
---

The official **BDS** is the most stable choice for Bedrock, but it **does not support plugins by itself**. This article explains its directory layout and how to add plugin capability with community loaders.

## 1. Directory Layout

After extraction, BDS is a self-contained ("portable") directory. Knowing these entries is enough:

| File / Directory | Purpose | Safe to touch? |
| --- | --- | --- |
| `bedrock_server.exe` | **Server launcher** (no `.exe` on Linux) | You can rename it, but **you should not** — the launch paths in scripts and panels must be updated to match, which is error-prone |
| `server.properties` | Server configuration (port, difficulty, mode, etc.) | Edited often |
| `allowlist.json` | The **allow list** (managed here after the allow list is enabled in `server.properties`) | Editable |
| `permissions.json` | **Operator (OP)** data (UUID, name, permissions) | Editable |
| `valid_known_packs.json` | Known add-on list (behavior packs / resource packs) that the server validates against | Usually left alone |
| `worlds/` | **World saves** (one subfolder per world) | Back up as a whole only |
| `bedrock_server.pdb` | Program database file for debugging | Leave it alone |
| `bedrock_server_how_to.html` | Official usage instructions | Read-only |
| `release-notes.txt` | Version changelog | Read-only |

### What Is Inside a World Folder

Under `worlds/<world name>/`:

| File / Directory | Contents |
| --- | --- |
| `db/` | **Save data** (the world's database files, the largest part) |
| `level.dat` | Basic world settings and properties (gamerules, time, weather, etc.) |
| `level.dat_old` | The previous save settings (used when updating or backing up) |
| `level_name.txt` | World name |

:::warn Back up `worlds/`
All BDS saves live in `worlds/`, so **back up the entire directory**. Do not copy only `db/`, or your settings will be lost.
:::

## 2. Adding Plugins to BDS: Three Mainstream Loaders

Official BDS has no plugin system, so the community built loaders to fill the gap. Three are mainstream today:

### LeviLamina (also LLL / LLv3) — **most recommended**

- Author: LiteLDev (formerly **LiteLoaderBDS**)
- Purpose: a lightweight, modular, multi-purpose BDS plugin loader
- **Rating: highly recommended** — the best plugin ecosystem, carrying on the peak of the LiteLoader era
- Supported versions: 1.20.61 – 1.21.3 (actively maintained)

### EndStone — promising

- Author: EndStoneMC
- Purpose: provides a **friendly Bukkit-like API** and lets you write plugins in **C++ or Python**
- **Rating: recommended** — the plugin ecosystem is tiny today, but community developers are joining in and it may catch up with LeviLamina
- Supported versions: 1.20.71 – 1.21.2 (actively maintained)

### BDSX — established and stable

- Purpose: a BDS mod supporting **Node.js**, based on official BDS; it keeps all vanilla features and supports function hooks and network packets
- **Rating: fairly recommended** — not many plugins from the domestic community, but plenty of users, and the author has maintained it since 2019
- Supported versions: 1.12 – latest (actively maintained)

> Besides these three, Mojang also provides a **script loader** (based on the official Script API). It is weaker than third-party loaders, but it has official support.

### How to Choose

| Your situation | Recommendation |
| --- | --- |
| Want ready-made plugins, ecosystem first | **LeviLamina** |
| Know C++ / Python and want to write your own | **EndStone** |
| Familiar with Node.js / need low-level hooks | **BDSX** |
| Only official capabilities, no third parties | Official script loader |

:::warn Loaders are tightly bound to game versions
A loader supports only **a specific version range**. **Confirm your server version is on the supported list** before installing, or it will fail to load or even fail to start. Check whether the loader has caught up before upgrading the game version, too.
:::

## 3. Two Known Pitfalls of BDS

1. **Single-core bottleneck**: mob and entity ticking is single-threaded → smoothness depends on **single-core performance**, and larger maps run worse.
2. **Slow memory growth**: usage creeps upward. Note that you **must not force-clear memory** — it makes the progress bar hang when players download resource packs or add-ons, and **only a server restart** fixes it.

## Next Step

Build a BDS server from scratch on Windows: see [Setting Up a BDS Server on Windows](/tutorials/bedrock/windows-bds).

---

> Parts of this article reference the Bedrock section of [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
