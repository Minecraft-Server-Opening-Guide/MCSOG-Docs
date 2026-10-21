---
title: Moving a Single-Player World to a Server
slug: save-migration
cat: ops
level: 2
order: 19
minutes: 14
tags: [world, migration, level-dat, dimensions, playerdata, server, backup, troubleshooting]
updated: 2026-10-04
draft: false
---

**Moving a world you have played for hundreds of hours onto a server is one of the easiest operations to get "almost" right.** One letter off in a directory name and you land in a brand new empty world; the Nether and End folders left behind and the portals lead into freshly generated terrain; player data files not renamed and the player arrives with an empty inventory, no advancements and no statistics. This page covers the real structure of a save, the two directory layouts, what a server actually expects, and a migration procedure you can trust.

Read [Backup and Restore](/tutorials/java/backup) first: the first and the last step of this procedure are both backups. For how the server directory and its configuration fit together, see [Server Structure](/tutorials/java/structure) and [Configuring the Server](/tutorials/java/config).

## 1. What a single-player save actually contains

A single-player save is a directory under `.minecraft/saves/<world name>/` (on Windows usually `%APPDATA%\.minecraft\saves\<world name>\`). It is not one file: it is a combination of dozens to tens of thousands of files.

| Path | Contents | Notes |
| --- | --- | --- |
| `level.dat` | Global world information | NBT format: world name, generation settings and seed, gamerules, spawn point, time, `DataVersion` |
| `level.dat_old` | Backup of the previous `level.dat` | Written whenever the world is loaded; safe to copy along |
| `level.dat_new` | Temporary file during writes | Normally absent after a clean shutdown; its presence means the last write was interrupted |
| `session.lock` | World lock | Contains a single snowman character since 1.16; **do not copy it**, the server recreates it |
| `region/` | Overworld region files `r.<x>.<z>.mca` | Terrain and block data; the largest part of a world |
| `entities/` | Overworld entity data | Split out of `region/` since 1.17 |
| `poi/` | Overworld points of interest | Present since 1.14: villager beds and job sites, portals, beehives, lodestones |
| `data/` | World-level miscellaneous data | Scoreboard, raids, maps, command storage |
| `playerdata/<uuid>.dat` | Player data | Inventory, position, health, experience; **the filename is the player UUID** |
| `advancements/<uuid>.json` | Advancements | Also named after the UUID |
| `stats/<uuid>.json` | Statistics | Also named after the UUID |
| `datapacks/` | World-level data packs | Unlike global packs, these travel with the world |
| `DIM-1/`, `DIM1/` | The Nether and the End | Legacy layout; the names come from the old numeric dimension IDs (-1 and 1) |
| `dimensions/<namespace>/<path>/` | Custom dimensions | Supported since 1.16; since 26.1 the three default dimensions live here too |
| `resources.zip` | World-bundled resource pack | Moved into `resourcepacks/` in 26.1 |

:::note A missing `DIM-1/` is not a broken save
The Nether and End folders are only created the **first time** a player enters that dimension. If the world was never taken to the End, there is no `DIM1/`, and that is perfectly normal. The server creates it on first entry.
:::

## 2. Two layouts: the `DIM` folders and `dimensions/`

This is where most migrations go wrong, so read it by version:

| Version range | Overworld | Nether | End | Custom dimensions |
| --- | --- | --- | --- | --- |
| 1.2.1 – 1.13 (from Anvil) | The save root (`region/`, `data/`, ...) | `DIM-1/` | `DIM1/` | Not supported |
| 1.14 – 1.15 | Same, plus `poi/` | `DIM-1/` | `DIM1/` | Not supported |
| 1.16 – 26.0 | Same, plus `entities/` from 1.17 | `DIM-1/` | `DIM1/` | `dimensions/<namespace>/<path>/` |
| 26.1 (snapshot 6) and later | `dimensions/minecraft/overworld/` | `dimensions/minecraft/the_nether/` | `dimensions/minecraft/the_end/` | `dimensions/<namespace>/<path>/` |

The essentials:

- **Legacy layout (1.16 – 26.0 and earlier)**: the two default dimensions use the fixed names `DIM-1` (the Nether, dimension ID `-1`) and `DIM1` (the End, dimension ID `1`), sitting **directly in the save root**, next to `region/`.
- **The `dimensions/` layout**: after custom dimensions arrived in 1.16, non-default dimensions are stored by **resource location**, that is `dimensions/<namespace>/<path>/`, for example `dimensions/mydatapack/skylands/`. In the 26.1 snapshot 6 restructure, **the three default dimensions moved to this layout as well** and `DIM-1`/`DIM1` are no longer used.
- In a 26.1 world, player data also moved from the save root into `players/`: `players/data/<uuid>.dat`, `players/advancements/<uuid>.json`, `players/stats/<uuid>.json`.

## 3. What a server directory expects

The server looks in its **working directory** (changeable with `--universe`) for the directory named by `level-name` in `server.properties`, `world` by default. If that path exists and is a valid world (it has a `level.dat`), the server loads it. **Otherwise the server generates a brand new world at that path** — it does not stop with an error, which is exactly why "I copied the save but the server is empty" happens.

A single-player save packs all three dimensions into one tree. A server, by default, keeps them in **three sibling directories**:

| In the single-player save | On the server | Notes |
| --- | --- | --- |
| Save root contents: `level.dat`, `region/`, `entities/`, `poi/`, `data/`, `playerdata/`, `advancements/`, `stats/`, `datapacks/` | `world/` | The Overworld, the directory `level-name` points at |
| `DIM-1/` | `world_nether/` | The Nether |
| `DIM1/` | `world_the_end/` | The End |
| `dimensions/<namespace>/<path>/` | The corresponding dimension directory | Only meaningful if the server has the same data pack or mod installed |
| `session.lock` | Do not copy | The server recreates it on start |
| `level.dat_old` | Goes into `world/` alongside `level.dat` | Merely the previous `level.dat`; harmless to keep |

The names are not hard-coded: they are derived from `level-name` plus a suffix. With `level-name=myworld` you normally get `myworld/`, `myworld_nether/` and `myworld_the_end/`.

:::warn Never copy a world while the server is running
Copying `region/*.mca` while the server is writing can capture **half-written chunk files**, which show up later as missing chunks, scrambled blocks or a world that refuses to load. `session.lock` also ends up present on both sides, causing lock conflicts. The order is always: `stop` the server (for a migration, do not settle for `save-all` plus `save-off`) → copy → start again.
:::

:::tip The safest trick: let the server create the directories first
Do not guess directory names by hand. Start the server once with the intended `level-name` (it generates an empty world), stop it, and look at which directories it actually created. Then **fill those directories** with the save contents. Whether your core uses `world_nether` or keeps dimensions inside `world/dimensions/`, you cannot put files in the wrong place.
:::

## 4. Player data: why it does not follow automatically

Every filename inside `playerdata/`, `advancements/` and `stats/` **is a player UUID**. When the server loads a player it looks for that UUID, and an unmatched filename means a new player: empty inventory, no advancements, zero statistics.

Where the UUID comes from depends on how the server identifies players:

| Scenario | UUID source | Consequence |
| --- | --- | --- |
| Single-player save | The local player UUID stored in the world (the `singleplayer_uuid` tag in `level.dat` since 26.1, the `Player` tag before that), which is also the filename in `playerdata/` | This is the source |
| Server with `online-mode=true` | The genuine Microsoft/Mojang account UUID | Usually **different** from the single-player UUID |
| Server with `online-mode=false` (offline or cracked mode) | Computed deterministically from the name: `UUID.nameUUIDFromBytes(("OfflinePlayer:" + name).getBytes(UTF_8))`, a version 3 (MD5) UUID | **Different** from the premium UUID, and identical for the same name on any offline server |

In other words: **unless the single-player world happened to be created with the same account UUID, player data will not apply by itself.**

The procedure, in the recommended order:

1. **Let the player join the server once** so the server creates a data file for that UUID and records it in `usercache.json` in the working directory.
2. Stop the server, then read the **target UUID** from `usercache.json` (or from the newly created filename in `world/playerdata/`).
3. **Rename** the source files to the target UUID rather than overwriting: `playerdata/<old-uuid>.dat` to `playerdata/<new-uuid>.dat`, and the same for `advancements/` and `stats/`. Back up the old files first so you can roll back.
4. **Decide `online-mode` before migrating.** Once you settle on offline mode, do not switch back to online mode later: every offline player gets a new UUID and it looks exactly like a world rollback.

`ops.json` and `whitelist.json` are keyed by UUID too. Copying a world does not bring them along, so re-add operators and whitelist entries on the server (`/op`, `/whitelist add`) or edit those JSON files with the correct UUIDs.

## 5. The migration, step by step

### 5.1 Record the facts first

- The **game version** of the source save (the `DataVersion` in `level.dat`, or the version in the client's main menu). **A server must not be older than the save**, or it refuses to load it; downgrading a world is unsafe.
- The target `level-name`, which determines the directory names.
- The size of the source save with `du -sh`, to confirm the target disk has room for it plus a backup.
- A few verifiable facts before you move anything: the spawn coordinates, the `/seed` value, the coordinates of a known build, the location of a Nether portal.

### 5.2 Stop the server and back up

```bash
# Server side: shut down cleanly
sudo systemctl stop minecraft
# If it is not under systemd, run stop in the console and confirm the process exited

# Source side: archive before touching anything (on the client machine)
cd ~/.minecraft/saves
tar -czf MyWorld-20261004.tar.gz MyWorld

# Target side: rename the current (empty or old) world directory instead of deleting it
cd /opt/minecraft/server
mv world world_before_migration
```

On Windows, the equivalent is right-clicking the `MyWorld` folder under `%APPDATA%\.minecraft\saves` and compressing it.

### 5.3 Copy the files

`rsync -a` is the better tool: it can exclude what you do not want, resume, and report clearly. **A trailing `/` on the source means "copy the contents of this directory"**; getting it wrong nests an extra directory level.

```bash
# Overworld: exclude the two dimension folders and the lock file, copy everything else into world/
rsync -a --exclude 'DIM-1' --exclude 'DIM1' --exclude 'session.lock' \
  "/home/you/.minecraft/saves/MyWorld/" /opt/minecraft/server/world/

# Nether and End: each into its own sibling directory
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM-1/" /opt/minecraft/server/world_nether/
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM1/"  /opt/minecraft/server/world_the_end/
```

For a handful of directories, `cp -a` is more direct. `-a` preserves timestamps, permissions and symbolic links:

```bash
# Copy item by item (skip whichever does not exist, e.g. no DIM1 if the End was never visited)
cd "/home/you/.minecraft/saves/MyWorld"
cp -a level.dat level.dat_old region entities poi data datapacks \
      playerdata advancements stats /opt/minecraft/server/world/ 2>/dev/null

cp -a DIM-1/. /opt/minecraft/server/world_nether/
cp -a DIM1/.  /opt/minecraft/server/world_the_end/
```

On Windows use `robocopy` (note that its exit codes **0 through 7 all mean success**, and `1` means "files were copied", so do not treat it as a failure):

```bat
robocopy "%APPDATA%\.minecraft\saves\MyWorld" "C:\mc\server\world" /E /XD DIM-1 DIM1 /XF session.lock
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM-1" "C:\mc\server\world_nether" /E
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM1"  "C:\mc\server\world_the_end" /E
```

Fix ownership afterwards. On Linux, when the server runs under its own user, this is mandatory or you will see `Failed to save`:

```bash
sudo chown -R minecraft:minecraft \
  /opt/minecraft/server/world \
  /opt/minecraft/server/world_nether \
  /opt/minecraft/server/world_the_end
```

:::tip Compress large worlds before sending them over a network
Copying tens of gigabytes of `region/` file by file across a network is slow, and a single interruption means starting over. Packing first (`tar -czf MyWorld.tar.gz MyWorld`; chunk data compresses well) and unpacking at the destination is more reliable, and `rsync -az --partial` gives you transfer compression plus resume.
:::

### 5.4 Fix `level-name`

Open `server.properties` and make sure the directory name and `level-name` match **exactly** (Linux is case-sensitive; `MyWorld` and `myworld` are two different directories):

```properties
level-name=world
```

### 5.5 Start it and watch the log

```bash
sudo systemctl start minecraft
# Follow startup and look for world-related errors
tail -f /opt/minecraft/server/logs/latest.log
# Under systemd, stdout also goes to the journal
journalctl -u minecraft.service -f
```

Confirm there is no `Failed to load`, no dimension-related exception, that `Preparing spawn area` finishes, and that there is no `No space left on device`.

### 5.6 Verify in game

Use the checklist in section 10. **Do not open the server to everyone yet**; whitelist one or two people and confirm first.

### 5.7 Rehearse the migration first

If the world matters to you, **stand up a throwaway test instance on another port and a temporary `level-name`** and walk the whole procedure once. A rehearsal surfaces directory-name, version, permission and UUID problems before production is touched.

```properties
# server.properties for the test instance (keep it in a separate directory)
level-name=world_test
server-port=25566
online-mode=false
white-list=false
```

```bash
cd /opt/minecraft/testserver
java -Xms2G -Xmx2G -jar server.jar --nogui
```

Once the rehearsal is clean, repeat the procedure against the production instance. When you are done, the test directory can simply be deleted.

## 6. Should you touch `level.dat`?

`level.dat` is the world's identity card and settings sheet: world name, generation settings and seed, gamerules, spawn point, time, difficulty and the list of enabled data packs. Its contents are **binary NBT**, usually gzip-compressed.

The conclusion is simple: **do not edit it by hand.**

- Opening it in a text editor corrupts it outright, and an NBT editor still has to deal with version differences (since 26.1, gamerules and world generation settings live under `data/`, for example).
- A bad edit means the world will not load at all, and `level.dat_old` will not necessarily save you.
- **Almost everything you might want to change has a supported route**: difficulty, game mode, view distance and whitelist belong in `server.properties`; gamerules, time, weather, spawn and data packs belong to in-game commands (`/gamerule`, `/time set`, `/weather clear`, `/setworldspawn`, `/datapack`).
- Note that `level-seed` **only applies when a world is created**; the seed of an existing world cannot be changed through configuration.
- When you need to look inside, open it **read-only** with an NBT viewer, and only on a copy.

For a migration the correct behaviour is: **carry `level.dat` over untouched, and do not modify it during the move.** Once the world is running, verified and backed up, adjust settings through configuration and commands.

## 7. Data packs (`datapacks/`)

- World-level data packs live in the world's own `datapacks/` directory (`saves/<world>/datapacks/` in single-player, `world/datapacks/` on a server). They travel with the world, so copying the world brings them along.
- **The enabled and disabled lists are stored in `level.dat`**, so normally nothing needs re-enabling. Confirm with `/datapack list` and use `/datapack enable <name>` or `/datapack disable <name>` when needed, followed by `/reload`.
- **Versions must match**: a data pack declares a target `pack_format`, and a mismatched server version will reject it or warn.
- **Packs that add dimensions deserve special care.** Such worlds contain `dimensions/<namespace>/<path>/` directories, and those dimensions only load if the server has the same data pack installed. The data is not deleted, but players cannot reach it.
- A world-bundled resource pack (`resources.zip` in older layouts, under `resourcepacks/` since 26.1) is not sent to players automatically. To let players see custom textures, configure `resource-pack` in `server.properties`.

## 8. Modded worlds, version changes and Bedrock

### 8.1 Moving a modded (Forge/NeoForge/Fabric) world to a plugin server

This is the second biggest trap after directory names. **A plugin server (Spigot, Paper and friends) does not know the blocks, items and entities a mod added.**

- Modded blocks in the world become unknown blocks (usually air, stone or a placeholder), and once those chunks are loaded and saved again, **the original data can be overwritten in place**; reinstalling the mod afterwards may not bring it back.
- Modded items disappear from inventories and containers, and modded entities (machines, mobs) are dropped.
- Modded dimensions (`dimensions/<mod namespace>/...`) cannot load without the corresponding mod.

The right approach: **back up first, then load the world on a disposable copy** and count the unknown-block and registry errors in the log. Migrate for real only if the loss is acceptable; if it is not, keep the modded server or start a fresh world.

### 8.2 Version changes

- **Save newer than the server**: the server refuses to load it (a `DataVersion` check). The only safe fix is upgrading the server, never downgrading the world.
- **Save older than the server**: the server upgrades the world through its data fixers, which usually works, but **the upgrade is irreversible**. Once a newer version has loaded it, an older version cannot open it again, so keep an untouched backup before upgrading.
- For jumps across several major versions, upgrade one step at a time (1.20, then 1.21) and verify after each step. See [Version Updates](/tutorials/ops/updates).

### 8.3 Bedrock

Java and Bedrock worlds use entirely different formats and **cannot be loaded by each other**. Conversion needs third-party tools and is usually lossy (redstone, entities, some block behaviour). For the Bedrock server layout, see [BDS Server](/tutorials/bedrock/bds).

## 9. Common failure modes

| Symptom | Root cause | Fix |
| --- | --- | --- |
| A brand new empty world | The directory name does not match `level-name`, or the directory has no `level.dat`, so the server **created** a world there | Stop, check the directory name, rename the old directory aside and copy again |
| The world loads but the Nether and End are fresh terrain | `DIM-1/` and `DIM1/` were not copied into `world_nether/` and `world_the_end/`, or were copied one level too deep | Stop the server and copy them into the correct directories |
| The world loads but the player starts from scratch | Player data filenames (UUIDs) do not match the UUID the server uses | Rename `playerdata/`, `advancements/` and `stats/` as described in section 4 |
| The server refuses to load the world | The save's `DataVersion` is newer than the server | Upgrade the server; **never** try to downgrade the world |
| Missing chunks or scrambled blocks | The copy happened while the server was running, or the disk filled up | Copy again from a backup, and fix the disk space first |
| `Failed to save` in the log | Wrong ownership or permissions; the server user cannot write | `chown -R` to the user the server runs as |
| "The file is right there but the server says it is missing" on Linux | Case mismatch (`MyWorld` vs `myworld`) | Make the directory name and `level-name` identical |
| Startup hangs on `Preparing spawn area` for a long time | A large world takes time to load for the first time; possibly slow disk I/O | Wait and watch CPU and disk usage; do not keep restarting |
| Whitelist or operator status lost | `whitelist.json` and `ops.json` are not part of the world and must be rebuilt | Re-run `/whitelist add` and `/op`, or edit the JSON with correct UUIDs |
| Frequent lag after the move | Single-player and server load models differ (view distance, simulation distance, entity counts) | Tune `view-distance` and `simulation-distance`, see [Optimization](/tutorials/java/optimize) |

## 10. Verification checklist

Confirm every line before opening the server to the public:

| Check | How |
| --- | --- |
| `level.dat` exists in the world directory | `ls -la /opt/minecraft/server/world/level.dat` |
| Region file count matches the source | Run `find world/region -name '*.mca' \| wc -l` on both sides and compare |
| All three worlds have the expected size | `du -sh /opt/minecraft/server/world*` |
| Startup log is free of world errors | `grep -n -i "failed\|unknown dimension\|no space" logs/latest.log` |
| The seed matches | Run `/seed` in game and compare with the value recorded before the move |
| Time and gamerules match | `/time query daytime`, `/gamerule keepInventory` and friends |
| The spawn point matches | Inspect the current spawn before changing it, and compare |
| Known builds are present | Teleport to the recorded coordinates and look |
| The Nether matches | `/execute in minecraft:the_nether run tp @s 0 64 0`, then check known portals and terrain |
| The End matches | Enter the End and check the dragon state, the end portal and the return portal |
| Player progress is back | Check inventory, experience, the advancements screen and statistics |
| Permissions and whitelist are correct | `/whitelist list`, `/op` |
| The server can write to disk | `sudo -u minecraft test -w /opt/minecraft/server/world && echo writable` |
| Backups are already working | Run the backup script once by hand and confirm the new world is included |

## 11. After the migration

- **Settle `online-mode`, the whitelist and account verification first**, then start accumulating player data. Switching authentication mode later changes UUIDs.
- **Take a full backup immediately** and get a copy off the machine, as described in [Offsite Backup](/tutorials/ops/offsite-backup).
- Retune `view-distance`, `simulation-distance` and `max-players` for a server. A single-player world is usually generated under single-player view distances, so surrounding chunks may need regeneration to match a longer view distance.
- Add log rotation and disk monitoring so the large world you just moved in does not fill the disk, see [Log Management and Rotation](/tutorials/ops/logs) and [Monitoring and Alerting](/tutorials/ops/monitoring).
- **Bedrock (BDS) is a different story**: Java and Bedrock worlds use completely different formats and cannot be loaded by each other directly; conversion requires third-party tools and is usually lossy. For the Bedrock server layout, see [BDS Server](/tutorials/bedrock/bds).

## 12. Next steps

- How the server directory is organised: see [Server Structure](/tutorials/java/structure).
- What each configuration key does and sensible values: see [Configuring the Server](/tutorials/java/config).
- Backups and rollbacks once the world is live: see [Backup and Restore](/tutorials/java/backup).
- The Bedrock dedicated server: see [BDS Server](/tutorials/bedrock/bds).

> Exact paths and directory layouts vary by game version and server core; refer to the official documentation.
