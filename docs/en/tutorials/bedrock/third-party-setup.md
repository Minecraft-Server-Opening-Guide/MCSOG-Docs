---
title: Getting Started with Bedrock Third-Party Cores
slug: third-party-setup
cat: bedrock
level: 3
order: 6
minutes: 13
mc: ["1.21.x"]
tags: [bedrock, nukkit, powernukkitx, pocketmine, php, getting-started]
updated: 2026-10-04
draft: false
---

[Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) covers which core to pick. This article covers what comes next: what you need installed, what the directory looks like, how to write a start script, where plugins go, and the step that most often goes wrong — **a core build that does not match the Bedrock protocol version**.

## 1. Before You Start: Three Things to Confirm

| Confirm | Why |
| --- | --- |
| **The core family** | The Nukkit family consists of **Java** programs; PocketMine-MP is a **PHP** program. Pick the wrong family and the whole runtime setup has to be redone |
| **The runtime** | Install **Java** for the Nukkit family, **PHP** for PMMP. One does not substitute for the other |
| **Version alignment** | The core build must **match the Bedrock protocol version you intend to connect with**, or clients simply cannot join |

### Java (Nukkit family)

The Nukkit family consists of Java programs just like a Java Edition server, so prepare it the same way — see [Environment Preparation (Windows and Linux)](/tutorials/java/environment).

Two points matter:

- **New enough**: recent forks usually require a recent Java (Java 17 or above is common). Too old and the server fails to start, though the error message normally states the requirement.
- **Correct architecture**: a 64-bit system needs 64-bit Java. A 32-bit install will hit its memory ceiling and die during startup or later at runtime.

### PHP (PocketMine-MP)

PMMP needs **PHP**, not Java.

:::tip Use the PHP build PMMP packages, do not assemble your own
The PHP published on the official website is a **bare build** and ships without the extensions PMMP needs. Filling in those dependencies by hand is painful and easy to get wrong. **Download the PHP runtime PMMP packages for each platform instead** — grab the file for your operating system from its GitHub Releases and unpack it.
:::

:::warn Do not rely on a system PHP
PHP in Linux distribution repositories is often old, and on Windows another application may have left a PHP behind. Check `php -v` first so you know that the `php` your start script invokes is **the one you intend to use**.
:::

## 2. Directory Layout: Nukkit Family vs PocketMine-MP

### The Nukkit family

After the first launch the root directory looks roughly like this (forks differ slightly):

| File / directory | Purpose |
| --- | --- |
| `nukkit-1.0-SNAPSHOT.jar` and similar | **The core program itself** — this is what you launch |
| `start.bat` / `start.sh` / `start.command` | Start scripts for Windows / Linux / macOS |
| `server.properties` | The main configuration: server name, port, player limit, game mode and so on |
| `permissions.yml` | Permission definitions |
| `ops.txt` | The administrator (OP) list |
| `whitelist.txt` | The whitelist, active only once enabled in `server.properties` |
| `banned-players.txt` / `banned-ips.txt` | Banned players and IP addresses |
| `rcon_password.txt` | The RCON remote-control password |
| `worlds/` | **The world save directory**, one sub-folder per world |
| `plugins/` | **The plugin directory**, holding `.jar` files |
| `logs/` | Runtime logs |

Inside a world directory, `worlds/<world name>/`:

| File / directory | Content |
| --- | --- |
| `level.dat` | Basic world settings |
| `region/` | **Chunk data** (terrain and builds; the largest part) |
| `entities/` | Entity data |

:::warn Back up `worlds/` as a whole
As with BDS, Bedrock saves are a **single unit**. Copy the entire `worlds/` directory rather than picking out `region/`.
:::

### PocketMine-MP

PMMP follows the same idea but uses different file formats:

| File / directory | Purpose |
| --- | --- |
| `PocketMine-MP.phar` | **The core program itself** (`.phar` is PHP's packaging format) |
| PHP runtime | The launcher and the `php` executable; with the official package they sit in the same directory |
| `start.bat` / `start.sh` | Start scripts |
| `server.properties` | The main configuration |
| `pocketmine.yml` | PMMP's own configuration |
| `plugins/` | **The plugin directory**, holding `.phar` files |
| `worlds/` | The world save directory |
| `players/` | Player data |
| `logs/` | Runtime logs |

### Side by side

| | Nukkit family | PocketMine-MP |
| --- | --- | --- |
| Core file | `.jar` | `.phar` |
| Runtime | Java | PHP |
| Plugin extension | `.jar` | `.phar` |
| Plugin directory | `plugins/` | `plugins/` |
| World directory | `worlds/` | `worlds/` |
| Main configuration | `server.properties` | `server.properties` |
| Administrator list | `ops.txt` | Managed through core configuration and commands |
| World internals | `level.dat` + `region/` + `entities/` | `level.dat` + `region/` + `entities/` |

:::note A shared pitfall: no non-ASCII characters or spaces in the path
Whichever core you use, keep the server directory on a path that is **plain ASCII with no spaces**. Non-ASCII paths break world or plugin loading on some forks and control panels, and the resulting error is usually hard to read.
:::

## 3. Starting the Server

### The Nukkit family

The minimum usable command is a single `java -jar`:

```bat
@echo off
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
pause
```

The equivalent on Linux / macOS:

```sh
#!/bin/sh
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
```

Notes:

- `-Xms` is the initial heap and `-Xmx` the maximum; **set both to the same value** so the server does not keep resizing at runtime.
- Keep `-Xmx` below the machine's physical memory, or the system starts swapping and everything gets slower.
- On Windows, end the `.bat` with `pause` so the window stays open after a crash and you can actually read the error.

### PocketMine-MP

```bat
@echo off
php PocketMine-MP.phar
pause
```

On Linux / macOS:

```sh
#!/bin/sh
./bin/php7/bin/php PocketMine-MP.phar
```

Notes:

- The exact path depends on whether you use the packaged PHP or your own install. **Confirm `php -v` resolves** before writing it into a script.
- The memory ceiling is not a command-line flag here; configure it in `pocketmine.yml` and `server.properties`.

:::tip What to check on the first launch
The first launch generates the configuration files and the world. Afterwards check two things: **whether the console printed errors**, and **whether `plugins/` and `worlds/` actually appeared**. If those directories were never created, the core did not start, so do not rush to install plugins.
:::

:::warn Do not hand over all the memory at once
A new server with no players should start with a modest `-Xmx` (2G, say) and be raised later. Setting it to the physical memory limit makes the operating system and the core fight over RAM.
:::

## 4. Where Plugins Go and How They Load

1. Download the matching file from the plugin's release page: `.jar` for the Nukkit family, `.phar` for PMMP.
2. Put it in the server root's `plugins/` directory.
3. **Restart the server.**
4. Read the console output and confirm the plugin loaded without errors.
5. Some plugins generate their own configuration directory on first load, `plugins/<plugin name>/`; edit it and restart once more.

On reloading:

- Most plugins provide a reload command, but **a reload is not a restart**. After changing core configuration, swapping a plugin version, or when plugins have registered events with each other, a reload often leaves stale state behind — producing "I changed it but nothing happened", or an outright error.
- The rule: **configuration changes may be reloaded; installing, removing or replacing plugins always means a restart**.

:::warn Do not drop Java Edition plugins in here
A Nukkit-family `.jar` and a Java Edition (Paper / Spigot) `.jar` are entirely different things and are **not interchangeable**. When downloading, check whether the plugin targets Nukkit / PNX or Paper; the wrong file usually just produces an "invalid plugin file" message.
:::

## 5. The Step That Most Often Goes Wrong: Version Alignment

This deserves its own section because Bedrock is far stricter about it than Java Edition.

Bedrock clients **update automatically**, and players cannot stay on an older version the way Java Edition players can. Therefore:

- Your core build must **support the current Bedrock protocol version**, or players see a message about an outdated server and cannot connect at all.
- Matching the core is not enough: plugins follow the core's API, so **a core upgrade can break older plugins immediately**.
- Upgrading a third-party core is therefore an **all-or-nothing package**: core, plugins and configuration move together, never one in isolation.

When a connection fails, work through this order:

| Symptom | Check first |
| --- | --- |
| Client reports the server is outdated | Whether the core build supports the current Bedrock protocol |
| Client hangs on "connecting" | Whether the port is open and whether the port in `server.properties` matches your forwarding |
| You can join but plugins do nothing | Whether the plugins loaded and whether their versions match the core |
| Kicked immediately after joining | Whether the whitelist is on and whether a `banned-*` entry applies |

:::tip Back up before upgrading
Third-party cores are **less save-compatible than official BDS**. Before switching cores or upgrading a major version, back up the whole `worlds/` directory and the configuration under `plugins/` — see [Backup and Restore](/tutorials/java/backup).
:::

## 6. Getting-Started Checklist

- [ ] Runtime installed and callable from the command line (`java -version` / `php -v`)
- [ ] Core build matches the target Bedrock protocol version
- [ ] Directory path is plain ASCII with no spaces
- [ ] Memory flags in the start script are sensible
- [ ] First launch created `plugins/` and `worlds/` with no console errors
- [ ] Plugin extensions match the core family
- [ ] `worlds/` is included in the backup plan

## Next Step

- Directory and file details: see [BDS Server](/tutorials/bedrock/bds)
- How protocols and versions relate: see [Bedrock Protocols and Versions](/tutorials/bedrock/protocol)
- Back to core selection: see [Choosing a Bedrock Core](/tutorials/bedrock/cores)

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
