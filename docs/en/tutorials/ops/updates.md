---
title: Updating and Maintaining the Server Core, Plugins and MCDR
slug: updates
cat: ops
level: 3
order: 13
minutes: 18
tags: [ops, updates, upgrade, rollback, changelog, plugins, mcdr, maintenance]
updated: 2026-10-04
draft: false
---

Updating looks like routine housekeeping, and it is where a large share of avoidable incidents start. A failed plugin install costs you a feature; **a failed update can leave the world unopenable**. This article turns the update process for the server core, plugins, mods, and MCDR into one repeatable routine. The point is not which button to press, but **the way back that every step leaves behind**.

Read two articles first if you have not: [Backup and Restore](/tutorials/java/backup) (you must be able to back up and restore before you update anything) and [Server Directory Layout](/tutorials/java/structure) (know exactly which files you are about to touch).

## 1. The Rules Before You Update Anything

Six rules, in order of importance. **Skip any one of them and a ten-minute update can turn into a full day of recovery.**

### 1.1 Back Up First, and Verify the Backup

A backup is not finished when the archive is written; it is finished when you have confirmed it is usable: the file exists, the size is plausible, the contents list, and ideally you have extracted it once into a scratch directory.

```bash
# Linux: confirm the archive exists, has a plausible size, and lists its contents
ls -lh /opt/mcserver/backups/world-20261004.tar.gz
tar -tzf /opt/mcserver/backups/world-20261004.tar.gz | head
```

```powershell
# Windows: extract to a scratch directory and confirm the contents are complete
Get-Item C:\mcserver\backups\world-20261004.zip | Select-Object Name, Length, LastWriteTime
Expand-Archive -Path C:\mcserver\backups\world-20261004.zip -DestinationPath C:\mcserver\verify -Force
Get-ChildItem C:\mcserver\verify | Select-Object Name
```

:::warn A backup you have never verified is not a backup
"The backup job has been failing for months", "the archive is empty", "only `db/` was copied and `level.dat` was left behind" - all of these are usually discovered on the day it matters. **Perform a real restore at least once a month**; the procedure is in [Backup and Restore](/tutorials/java/backup).
:::

### 1.2 Read the Changelog

You are looking for four things, not for a version number that looks appealing:

| What to look for | Why it matters |
| --- | --- |
| **Breaking changes** | Renamed config keys, renamed commands, and changed data formats invalidate what you already have |
| **New minimum requirements** | The Java version, loader version, and dependency versions the release needs |
| **Data migration notes** | Whether a migration command must be run, and whether an intermediate version is required first |
| **Known issues** | Bugs the author has already acknowledged, so you can avoid a freshly published bad release |

### 1.3 Test in a Separate Instance

Keep a test instance: a second directory, a second port, and a copy of the world. **Every update is proven in the test instance before it touches production.**

```bash
# Linux: lay out a test instance from a backup
mkdir -p /opt/mcserver/test
tar -xzf /opt/mcserver/backups/full-20261004.tar.gz -C /opt/mcserver/test
```

```powershell
# Windows: the same idea
New-Item -ItemType Directory -Force -Path C:\mcserver\test
Expand-Archive -Path C:\mcserver\backups\full-20261004.zip -DestinationPath C:\mcserver\test -Force
```

Change the port in the test instance (`server-port` in `server.properties`), or it will fight the running server for the same one.

### 1.4 Pick a Maintenance Window

Pick your quietest hours (usually late night or a weekday morning), avoid tournaments and fresh map launches, **allow double the time you expect**, and make sure you are around while it runs - someone has to watch the console, or the rollback will not happen in time.

### 1.5 Always Keep a Rollback Path

**The rule: every file you replace stays behind under a versioned name.**

```text
server-1.21.1.jar            # the previous core, ready to swap back in
MyPlugin-1.0.0.jar.bak       # the previous plugin
world-20261004/              # the world as it was before the update
config.yml.20261004.bak      # the configuration as it was before the update
```

:::tip Decide the rollback path before the update, not after
Ask yourself one question first: "if I want to undo this in ten minutes, which exact commands do I type?" **If you cannot answer it, do not start the update yet.**
:::

### 1.6 Announce the Downtime

Post it in your community channel, on the notice board, and in the server MOTD: when it starts, how long it should take, what is changing, and what happens if it goes wrong. Players do not resent downtime nearly as much as they resent **not knowing why they cannot connect or how long it will last**.

### 1.7 What Can Go Wrong

| Risk | Typical symptom | Consequence | Prevention |
| --- | --- | --- | --- |
| The world is rewritten by the new version | After one start on the new version, the world errors out or refuses to load on the old core | **Irreversible**; only a restore from backup helps | Take a full backup before the first start on the new version, and keep the old core and old directory |
| Java version mismatch | The server dies on startup with `UnsupportedClassVersionError` | The server will not start | Align Java using the table in section 2.2 |
| Plugin incompatible with the new core | Red entries in `/plugins`, or `NoSuchMethodError` spam in the console | Missing features, or a server that will not start | Check the plugin's supported versions and changelog; test in the test instance first |
| Config keys renamed or removed | The plugin regenerates a default config and your settings appear to vanish | The plugin runs on defaults, which players will notice | Back up the config directory before, and diff it after |
| Loader and mods out of step | A crash on startup listing a mod name and a class error | The modded server does not start at all | Keep loader, game version, and every mod in step |
| Bedrock protocol mismatch | Players cannot connect after the update and are told to update the client | Players leave, and iOS players cannot downgrade | Confirm your players can follow the client update before you update |
| A tampered download | The core or plugin runs, but behaves strangely | A security incident | Download only from official or officially recognised sources |
| The window was underestimated | Players are already asking why the server is still down | Reputation and trust | Allow double the time and announce it in advance |
| The disk fills up | Extraction fails, or the world cannot be written | A corrupted world | Check free space before the update |
| Ownership and permissions changed | On Linux the new files are owned by root and the service account cannot write | Plugin configuration cannot be saved | Run `chown -R` back to the dedicated service account afterwards |

## 2. Updating the Server Core

### 2.1 General Procedure

1. **Stop the server.** Run `stop` in the console and let it exit cleanly. **Do not kill the process.**
2. **Record the current version** (core version, build number, and the jar filename used by the start script).
3. **Rename the old core** with a version suffix so it stays on disk.
4. **Download the new core from the official source**, not from a third-party bundle.
5. **Install the new core** under the filename the start script expects, or the script will not find it (see [Starting the Server](/tutorials/java/start) for the script itself).
6. **Start the server and watch the console.** Do not walk away.
7. **Verify:** no errors in the console, `/plugins` looks right, and you can join and move around - then **observe for a while** before deleting the old jar.

```text
stop
```

```bash
# Linux
cd /opt/mcserver/survival
mv server.jar server-1.21.1.jar                 # keep the old core under a versioned name
cp ~/downloads/server-1.21.4.jar ./server.jar   # the file from the official download page
./start.sh
```

```powershell
# Windows
Set-Location C:\mcserver\survival
Rename-Item server.jar server-1.21.1.jar
Copy-Item "$env:USERPROFILE\Downloads\server-1.21.4.jar" .\server.jar
.\start.bat
```

Verification after you join:

```text
/version        check the server version
/plugins        check plugin load status (red means failed to load)
```

:::tip Keep the old core for now
Keep it at least until the new version has run through a full maintenance cycle with the world in good shape. It costs a few hundred megabytes and buys you an instant way back.
:::

### 2.2 Version Jumps Are Not Free: Align Java First

**A Java version mismatch kills the server on startup**, with `UnsupportedClassVersionError` in the log. This is the same table used in [Environment Setup (Windows and Linux)](/tutorials/java/environment), reused here:

| Minecraft Java Edition | Java required by Mojang | Notes |
| --- | --- | --- |
| 26.1 and later | **Java 25** | The current requirement (from 26.1) |
| 1.20.5 - 1.21.x | **Java 21** | 1.20.5 was the first release to require 21 |
| 1.18 - 1.20.4 | **Java 17** | The most common combination today |
| 1.17 - 1.17.1 | **Java 16** | Java 17 also starts fine |
| 1.12 - 1.16.5 | **Java 8** | Many older modpacks still sit here |
| 1.7.10 and earlier | Lower official requirement | Java 8 is what people actually use |

:::note Where this table comes from
The 1.20.5 / 1.18 / 1.17 / 1.12 boundaries come from Mojang's official version manifest (the `javaVersion.majorVersion` field of each version on `piston-meta.mojang.com`); the Java 25 requirement from 26.1 comes from the Minecraft Wiki version requirements list. This is not guesswork.
:::

- **Paper, Purpur, Spigot, Fabric, and Forge follow the same requirements**: Java 21 above 1.20.5, Java 17 for 1.18 - 1.20.4.
- The table is a **minimum**. A Java version that is too new can break some plugins and mods, so **match the requirement exactly** where you can.
- **Bedrock (BDS) does not need Java.** It is a C++ program: run `bedrock_server` (`bedrock_server.exe` on Windows).

**Do not jump several major versions at once.** Intermediate versions may have changed the config format, the world format, and plugin APIs. Step through the versions when needed (for example 1.19 then 1.20 then 1.21) and verify after each one.

### 2.3 World Format: An Upgrade Is Generally One-Way

:::warn A world opened by a newer version is not guaranteed to load in an older one
Once the server has started on the new version, chunks and entity data may already have been **rewritten into the new format**. Swapping the core back to the old version then produces anything from error spam to **a world that will not load**. There is no official tool that converts a world back to the older format.
:::

Therefore:

- **Take a full backup before the first start on the new version** (`world/`, `world_nether/`, `world_the_end/`; for custom names, follow `level-name` in `server.properties`).
- When you roll back, **roll the world back with the core**: restore the pre-update world backup at the same time as you restore the old jar. Swapping only the jar is what causes the damage.
- To test compatibility, do it in the test instance. **Never experiment on the production world.**

### 2.4 Paper, Purpur, Leaves, Leaf

For this family of cores the update procedure is identical: **replace the jar**. They share the vanilla world format, so section 2.3 applies unchanged.

The only part that needs attention is configuration:

| Situation | What happens |
| --- | --- |
| New config keys | On first start the core **writes the missing keys as defaults** into the configuration files |
| Removed or renamed keys | Old keys may be kept but no longer honoured, or silently ignored; behaviour can change without an error |
| Build number changes | Different builds of the same game version can change behaviour; read the build changelog |

The practice: copy the whole server directory (at minimum every `*.yml`) before the update, then compare afterwards.

```bash
# Linux: compare the configuration before and after
diff -u paper-global.yml.bak paper-global.yml
```

```powershell
# Windows: compare the configuration before and after
Compare-Object (Get-Content .\paper-global.yml.bak) (Get-Content .\paper-global.yml)
```

:::tip Official sources
Paper is at <https://papermc.io/> and Purpur at <https://purpurmc.org/>. For Leaves, Leaf, and other cores, use each project's own official release page - **never a jar from an aggregator site or a file-sharing link**.
:::

### 2.5 Fabric, Forge, NeoForge

Modded servers are stricter than plugin servers: **the loader version, the game version, and every single mod must match each other**.

| Component | What it must match | Symptom when it does not |
| --- | --- | --- |
| Loader (Fabric / Forge / NeoForge) | Tied to the game version; it supports only specific version ranges | The loader will not install, or the server will not start |
| Each mod | The game version, the loader version, and the other mods it depends on | A crash on startup listing the mod name and a class error |
| Server and client mods | Mods that both sides need must be present on both sides | Players cannot connect, or are kicked immediately after joining |

**A loader upgrade usually requires mod updates**: mods are compiled against a specific version of the loader API. The typical failure is **a crash on startup**, with a mod name next to a class error such as `NoClassDefFoundError`, `ClassNotFoundException`, or `NoSuchMethodError`. Forge-based loaders often state it plainly as a missing mandatory dependency (`Missing or unsupported mandatory dependencies`), and the client may report an incompatible mod set.

A workable order:

1. Confirm the target game version already has a loader release.
2. In the test instance, upgrade the loader and confirm it starts (with the mods moved aside for now).
3. Bring the mods back in batches (starting the server after each batch, so you can tell which mod is the problem), then update the server and the client together and keep the client mod list in step.

### 2.6 Bedrock (BDS)

Bedrock is constrained differently from Java Edition: **the client protocol and the server build must match**. When the protocol changes, older clients simply cannot connect (the mechanism is explained in [Protocol Versions and Version Choice](/tutorials/bedrock/protocol)).

| Point | Detail |
| --- | --- |
| Client protocol | After a server update, players must run a matching client version; a mismatch tells them to update |
| iOS limitation | iOS players **can only install the newest version from the store** and cannot install an older build. Pinning an old version therefore means giving up your iOS players |
| World data | All BDS world data lives under `worlds/`, and **must be backed up in full** before an update |
| Configuration | `server.properties`, `allowlist.json`, `permissions.json`, and `valid_known_packs.json` are your data and must not be overwritten by the new package |

Procedure: take the archive for your platform from the official download page, **extract it to a temporary directory**, and copy only the program file into the existing directory.

```bash
# Linux: extract to a temporary directory and replace only the binary
# (use the actual version numbers in the filenames)
unzip bedrock-server-new.zip -d /tmp/bds-new
mv bedrock_server bedrock_server-old
cp /tmp/bds-new/bedrock_server .
chmod +x bedrock_server
```

```powershell
# Windows: the same idea (the archive also ships companion DLLs - do not forget them)
Expand-Archive -Path "$env:USERPROFILE\Downloads\bedrock-server-new.zip" -DestinationPath C:\bds-new -Force
Rename-Item .\bedrock_server.exe bedrock_server-old.exe
Copy-Item C:\bds-new\bedrock_server.exe .
```

:::warn Do not extract the whole package over your installation
The official archive also contains a default `server.properties`, `allowlist.json`, `permissions.json`, and so on. **Extracting it over your directory overwrites your configuration and your allow list.** Copy only the program files, leave your data and configuration alone, and confirm that `worlds/` was not replaced.
:::

The directory layout and the loader version constraints are covered in [BDS Server](/tutorials/bedrock/bds). Third-party loaders also support only specific version ranges, so **confirm the loader has caught up before you upgrade the server**.

### 2.7 Downgrading: The Most Common Self-Inflicted Data Loss

:::warn Once a newer version has opened the world, downgrading the core destroys data
"I updated, a plugin broke, so I put the old jar back" is the most common self-inflicted incident in server operations. **The core can go back; the world may not.**
The correct move is to restore the pre-update world backup **at the same time** as the old core. Swapping only the jar tends to produce a world that will not open.
:::

If you really must downgrade after an update:

1. Stop the server.
2. Rename the **current** world directory (the one the new version rewrote) rather than deleting it - it is your evidence.
3. Extract the pre-update world backup and put it back in place.
4. Restore the old core jar.
5. Start the server and check the log and the world.
6. Have players confirm that key builds and items are intact.

## 3. Updating Plugins

Plugins update more often than cores, and they break more often because of **configuration changes** than because of code. For the basics, see [Introduction to Plugins](/tutorials/java/plugins).

### 3.1 Four Checks Before You Update

| Check | Where to look | Cost of skipping it |
| --- | --- | --- |
| Supported server versions | The compatibility list on the plugin's release page | It fails to load and shows red in `/plugins` |
| Supported Java version | The release page or the changelog | A class version error at load time |
| Dependencies present and new enough | The Requires / Dependencies section of the plugin description; see [Common Dependency Plugins](/tutorials/java/plugin-deps) | A missing hard dependency makes the plugin fail outright |
| Breaking changes in the changelog | The changelog or release notes | Settings stop applying and data is never migrated |

The four dependencies that turn up most often are **Vault, PlaceholderAPI, ProtocolLib, and LuckPerms**. Many plugins declare them as hard or soft dependencies, so confirm they are present and new enough before you update the plugins that use them.

### 3.2 Procedure

1. **Stop the server** (or accept the documented limits of hot reloading, see 3.5).
2. **Back up** `plugins/<plugin name>/`, plus the database for any plugin that uses one.
3. **Rename the old jar** with a version suffix so it stays on disk.
4. **Install the new jar.**
5. **Start the server and read the console.**
6. **Confirm with `/plugins`** (a red entry means the plugin was recognised but failed to load), then **test the plugin's own commands** to confirm the features actually work.

```powershell
# Windows
Set-Location C:\mcserver\survival\plugins
Rename-Item MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
Copy-Item "$env:USERPROFILE\Downloads\MyPlugin-1.1.0.jar" .
```

```bash
# Linux
cd /opt/mcserver/survival/plugins
mv MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
cp ~/downloads/MyPlugin-1.1.0.jar .
```

```text
/plugins
```

:::note A red entry means: read the console
The reason for a failed load is always printed to the console and to `logs/latest.log`. **Open the log and search for the plugin name** - far faster than describing the problem to someone else.
:::

### 3.3 Config Migration

| Situation | Recommended approach |
| --- | --- |
| New options were added | Let the plugin generate its own defaults; usually nothing to do |
| Keys were renamed or restructured | **Keep a copy of the old config** and move your values across item by item against the changelog |
| The config was split into several files | Keep the old files too and follow the official migration notes |
| Data needs migrating (databases, player data) | Follow the official migration notes, and **back up the database first** |

:::tip Let the plugin regenerate its defaults first
A safer order than merging two YAML files by hand: **let the new version write a complete default config**, then copy your own values into it against the old file. Hand-merging tends to fail on indentation, duplicated keys, and types (a string where a number is expected), and YAML error messages are rarely helpful.
:::

### 3.4 Dependencies First

**Update dependencies before the plugins that need them.** Doing it the other way round produces the classic "the dependency's API changed while the plugin above it still calls the old one" failure: `NoSuchMethodError` or `NoClassDefFoundError`.

The same logic applies when a plugin is itself a dependency of several others: one update can affect all of them, so exercise the related features afterwards.

### 3.5 Plugin Managers: What They Can and Cannot Do

Tools such as PlugManX and ServerUtils can load, unload, and reload other plugins while the server is running. Their limits are precise:

| Situation | Can hot reload handle it? |
| --- | --- |
| You only changed configuration | Use the plugin's own `reload` command |
| Temporarily disabling a misbehaving plugin | Yes - this is the most valuable use of hot reloading |
| Changing the plugin version (a new jar) | Not recommended; stop the server and replace it |
| The plugin registers commands, permissions, listeners, recipes, or world generators | Unloading leaves residue behind and reloading tends to misbehave |
| The plugin holds database connections, thread pools, or large static caches | Resources are usually not released on unload |
| Repeatedly loading and unloading the same plugin | The class loader is never collected and memory climbs until the server runs out |
| A modded server | Plugin managers cannot manage mods |
| Vanilla `/reload` | Not recommended; it leaves plugin state inconsistent |

:::warn Do not rely on hot reloading in production
Hot reloading is for "disable one plugin and see whether the symptom goes away" and for trying configuration quickly. **Real version updates and dependency changes still belong in a stop-and-restart procedure.** A fuller triage process is in [Plugin Management and Triage](/tutorials/java/plugin-manage).
:::

### 3.6 Download Only From Official Sources

:::warn Do not use unofficial re-uploads
Plugins reposted to aggregator sites, file-sharing links, or chat groups as a "translated edition", a "cracked premium edition", or a "bundled pack" may well have been repackaged. **The filename and version number can be identical while the contents are not.**
Prefer the official release pages: SpigotMC, Modrinth, Hangar, and the author's own GitHub Releases. Verify a published hash when one exists, and buy paid plugins from the official store page.
:::

## 4. Updating MCDR

MCDR (MCDReforged) is a manager that wraps the server core and is written in Python 3. Updating it **does not touch your server core or your world**; the risk sits in **its own configuration and its Python plugins**. For the basics, see [MCDR Server Manager](/tutorials/java/mcdr).

### 4.1 Install With pip, Not From a Source Archive

MCDR is published on PyPI, and the documented installation method is pip:

```bash
# Windows
pip install mcdreforged

# Linux
pip3 install mcdreforged
```

:::warn Do not download a source zip and run it
Many older tutorials tell you to download the archive from GitHub and unpack it. **The official documentation states plainly that this is outdated.** MCDR has not been installed from source since v1.0 in early 2021. Unless you are an MCDR developer who knows exactly what you are doing, install it with pip.
:::

### 4.2 Python Version Requirements

The mapping given in the official documentation:

| MCDR version | Python requirement |
| --- | --- |
| < 2.10 | >= 3.6 |
| >= 2.10 | >= 3.8 |
| >= 2.15 | **>= 3.9** |

Before upgrading, confirm your Python satisfies the target release. If the system Python is too old, upgrade Python first, or move to one of the isolated environments the official documentation recommends.

### 4.3 Update Commands

**Use the same interpreter that runs MCDR.** The exact command depends on how it was installed:

```bash
# Global pip (Windows; -U is short for --upgrade)
pip install mcdreforged -U

# Global pip (Linux)
pip3 install mcdreforged -U

# A pipx-managed isolated environment
pipx upgrade mcdreforged

# A virtual environment: activate it first, then upgrade
# source venv/bin/activate        (POSIX)
# venv\Scripts\Activate.ps1       (Windows PowerShell)
pip install mcdreforged -U
```

Check the version; it prints something like `MCDReforged v2.16.0`:

```bash
mcdreforged -V
```

:::warn You may have upgraded a different copy
When the machine has a system Python, a virtual environment, and a pipx environment at the same time, `pip install -U` may not upgrade the copy MCDR actually runs. **If `mcdreforged -V` still reports the old version after an upgrade, this is almost always why.** Work out how MCDR is started (which interpreter, which environment) and upgrade inside that environment.
:::

:::note Other installation methods
- **pipx**: upgrade with `pipx upgrade mcdreforged`; install Python packages into that environment with `pipx inject mcdreforged <package>`.
- **Docker**: change the image tag as described in the official Docker chapter; follow the official documentation for the exact commands.
- **Slow networks**: add `-i https://pypi.tuna.tsinghua.edu.cn/simple` to use a mirror, which is the acceleration method the official documentation gives.
- **System package managers**: the official documentation **strongly advises against** installing MCDR this way, because plugin dependencies become very hard to manage.
:::

### 4.4 Read the Migration Guide Before a Major Upgrade

The official documentation has a dedicated migration section with **0.x to 1.x** and **1.x to 2.x** guides.

A major version upgrade can change the configuration format (options in your existing `config.yml` may be renamed or dropped), the plugin API (MCDR plugins written against the old API may fail to load or misbehave), and the commands and CLI (launch arguments and subcommands may have been adjusted). **Upgrading MCDR therefore often means updating your MCDR plugins as well.** Read the matching migration guide first and follow its steps rather than copying an old tutorial from memory.

### 4.5 What to Back Up First

| Content | Location |
| --- | --- |
| MCDR's own configuration | `config.yml`, in **MCDR's working directory** |
| MCDR plugins | `plugins/` by default; the authoritative list is the `plugin_directories` option |
| Permission files and logs | Useful for troubleshooting; worth keeping a copy |

:::note MCDR fills in missing options itself
The official documentation states that on startup MCDR loads `config.yml` and **appends any missing options** to the end of the file; if the file does not exist, it generates a default config and exits. New keys appearing after an upgrade is therefore normal - but **do not** read that as proof that your old settings were migrated correctly. Compare against the migration guide and the changelog.
:::

MCDR also has a `check_update` option (default `true`) that checks for a new release every 24 hours, and `!!MCDR reload config` (short form `!!MCDR r cfg`) reloads the configuration at runtime. **Plugin compatibility, not MCDR itself, is the main risk in an MCDR upgrade.**

### 4.6 Rollback

If something breaks, pin MCDR back to the previous release:

```bash
# Check the exact version number on the mcdreforged project page on PyPI first
pip install mcdreforged==2.15.0
mcdreforged -V
```

- **Confirm the version number on PyPI** rather than writing it from memory; in a pipx environment, `pipx install --force mcdreforged==<version>` overwrites the installed version (follow the pipx documentation for the exact syntax).
- If you updated MCDR plugins at the same time, **roll those back too**; a new plugin against an old MCDR fails just as badly.

## 5. Update Checklist

| Target | Before | Verify after | Rollback |
| --- | --- | --- | --- |
| **Server core** | Full backup (world, config, plugins); confirm the Java version the target release needs; rename the old jar with a version suffix; read the changelog | No errors in the console; `/plugins` healthy; `/version` correct; join and move around; watch for 10 to 30 minutes | Stop the server and restore the old jar; if the new version has already started once, **restore the world from backup as well** |
| **Plugins** | Back up `plugins/<plugin name>/` and any database; confirm supported server version, Java version, and dependencies; read the changelog for breaking changes | No red entries in `/plugins`; no `NoSuchMethodError` and similar in the console; the plugin's own commands work; related features exercised | Stop the server, rename the old `.jar.bak` back, and restore the old config copy |
| **Mods and loader** | Back up `mods/` and `config/`; confirm the loader supports the target game version; list the target version of every mod | Startup without a crash; no mod class errors in the log; the client connects without missing-mod warnings | Restore the old loader and the old `mods/` directory; roll the client back to match |
| **MCDR** | Record the current version (`mcdreforged -V`); back up `config.yml` and the plugin directory; read the migration guide for a major version | `mcdreforged -V` shows the new version; MCDR starts and brings the server up; MCDR plugins load | `pip install mcdreforged==<previous version>` (confirm the number on PyPI); roll the MCDR plugins back too |
| **OS packages** | Record current versions; confirm you are outside the maintenance window; take a system snapshot if you can | The server starts by itself after a reboot; **confirm Java was not upgraded along with everything else**; ports and firewall rules unchanged | Use the distribution's version rollback or the system snapshot; hold the Java package where needed (for example `apt-mark hold`) |

### A Maintenance Rhythm

**Once a month**, walk through the core, plugins, mods, MCDR, and OS packages for security updates; put **security first** (login, permissions, and anti-cheat plugins should be updated promptly when a fix lands); **do not update for its own sake**, since a version that runs stably with no security issue can stay where it is and the benefit of an update has to outweigh the risk it carries; and **keep a record** of when each update happened, from which version to which, who did it, and whether anything was rolled back.

## Next Steps

- The backup and restore skills every update depends on: [Backup and Restore](/tutorials/java/backup)
- Getting a copy of that backup off the machine: [Offsite Backup](/tutorials/ops/offsite-backup)
- Plugin install, removal, and triage: [Plugin Management and Triage](/tutorials/java/plugin-manage)
- Adapting plugins and config after a core update: [Plugin Configuration](/tutorials/java/plugin-config)
- Bedrock server and protocols: [BDS Server](/tutorials/bedrock/bds)

> For every piece of software here, the official documentation is the authority on how it is updated.
