---
title: "[Technical] Protecting Your World"
slug: sd-backup
cat: java
level: 3
order: 33
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, backup, mcdr, ledger, offsite]
updated: 2026-10-08
draft: false
---

A technical server rewrites its world **continuously**: once the machines are running, terrain, blocks and entities change at a scale you never see on a casual server. One mistake, or one crash that corrupts the save, rarely costs you "a few minutes of progress" — it can cost you an entire build.

The general principles — what to back up, how to keep backups consistent, retention, and the restore procedure — are covered in [Backup and Recovery](/tutorials/java/backup); this article does not repeat them. It covers the three things a technical server needs on top: **making backups a process with MCDR backup plugins**, **finding out what actually happened with `Ledger`**, and **keeping at least one copy off the machine**.

## 1. Why a Technical Server Needs Backups More Often

| What makes technical servers different | What it demands of your backups |
| --- | --- |
| Once machines run, the world changes enormously: devices that clear whole regions, farms that run around the clock, all rewriting large areas of terrain and entities in a very short time | The backup interval must be shorter than the loss you can accept; do not expect one overnight backup to cover a big project |
| Rollback is collective: restoring the whole world also erases **every** player's progress in that window | Try to fix the damage locally first; roll the whole world back only when that fails |
| Big projects are expensive: from gathering materials to building and debugging, a machine trades time for output | A backup does not save a few blocks, it saves the time already invested |
| The world and its backups live on the same machine and the same disk by default | Besides local backups, one copy must leave that machine |

:::warn A backup whose restore has never been tested is not a backup
This holds especially true for a technical server: the bigger the machines, the more expensive a rollback. Discovering on the day of the incident that the backup has never actually worked leaves you with nothing to fall back on. See [Backup and Recovery](/tutorials/java/backup) for restore drills.
:::

## 2. Turning Backups into a Process with MCDR Plugins

MCDR is a Python manager that runs **outside the server process**. When the server crashes, MCDR is still there, so it can restart the server automatically and can run a backup on crash — exactly where backups belong. Installation, the plugin system and its commands are covered in [The MCDR Server Manager](/tutorials/java/mcdr).

These backup plugin directory names **do exist** in the official MCDR plugin catalogue. They fall into four rough directions:

| Direction | Plugin directory names | Rough purpose |
| --- | --- | --- |
| Full-world backup | `prime_backup`, `extra_prime_backup`, `quick_backup_multi`, `better_backup`, `permanent_backup`, `zip_backup`, `smart_backup`, `cushion_of_backup` | Back up and retain the whole world or the whole server directory as one unit |
| Scheduled backup | `timed_quick_backup_multi`, `auto_backup` | Trigger automatically on an interval, so nothing depends on you remembering |
| Per-chunk and per-region backup | `chunk_backup`, `region_backup` | Work at chunk or region level, a finer granularity than a full archive |
| Off-site backup | `ftp_backup`, `baidu_netdisk_backup` | Send the backup to remote storage |

Three things to confirm before and after you pick one:

1. **The grouping is only the direction the directory name suggests.** The actual features, configuration keys and retention rules are whatever each plugin's own documentation says; after installing one, really run a "backup -> restore" cycle in a test environment.
2. **No plugin solves consistency for you.** Whichever one you use, confirm that it cannot copy a half-written world, per the principles in [Backup and Recovery](/tutorials/java/backup).
3. **Do not leave the backup output on the same disk**, or the problems in sections 4 and 6 happen anyway.

For a technical server a practical combination is **one scheduled full backup plus one per-chunk backup**: the first is the safety net, the second narrows the rollback to a single area. If you run both, stagger their schedules so they do not hammer the disk at the same time.

## 3. `Ledger`: Find Out What Actually Happened

`Ledger` is a server-side logging mod (loaders: `fabric`, `quilt`; supported versions `1.17-rc1` to `26.3`; one line: A serverside logging mod). Its official description reads:

> Ledger is a comprehensive logging system for Fabric servers. It provides essential tracking for hundreds of in game events.

On the plugin side the best-known equivalent is **CoreProtect** (loaders: `bukkit`, `folia`, `paper`, `purpur`, `spigot`; versions `1.14.1` to `26.2`; officially a fast, efficient data logging and anti-griefing tool that can roll back and restore damage). Think of `Ledger` as **the CoreProtect counterpart in the Fabric ecosystem**: it also records block and container activity and lets you look it up by time and position — except that CoreProtect runs on the plugin side and can roll damage back itself, while `Ledger` only records and queries.

It answers a different question from backups, and the two are not interchangeable:

| | `Ledger` | Backups |
| --- | --- | --- |
| Question it answers | What happened, who did it, when, and what was affected | How to return the whole world to an earlier point in time |
| Data shape | Event records | A copy of the world directory |
| Granularity | Event level, down to a specific location or container | Whole world (directory level) |
| First thing to do after an incident | Locate and attribute, then judge whether you can roll back or repair only a small part | The fallback when you cannot locate anything: restore the whole world |
| Cost | Records grow continuously and need maintenance | Disk space, and a rollback erases everyone's progress in that window |

Points to keep in mind:

- `Ledger` is a **record**, not a recovery tool. It gives you the scope and the responsible party; putting the world back still means manual repair or a backup.
- The records need long-term maintenance: the official MCDR plugin catalogue contains `ledger_cleaner`, whose purpose is to clean up `Ledger` data. That alone tells you it is not something you install and forget.
- `Ledger` is a server-side mod and requires a Fabric server. The other half of grief defence (permissions and real-time measures) is covered in [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat).

**The right order is**: after an incident, use `Ledger` to narrow the scope down to a small area and repair locally if you can. If you cannot locate it, or the damage is too wide, restore a backup. Doing it the other way round means erasing the whole server's progress for one person's behaviour.

## 4. Off-Site Backup: The Step You Cannot Skip

Local backups sit on the same machine as the server, so all of the following take **the world and every local backup at once**:

| Situation | Result |
| --- | --- |
| The machine (or its disk) dies | World and local backups are both gone |
| The system is reinstalled, the disk formatted, a directory deleted by mistake | Same as above |
| The machine is reclaimed by the host, or the datacenter has an incident | You may not even get the machine back |

The plugin layer already offers an off-site route: `ftp_backup` and `baidu_netdisk_backup` both **send backups to a remote location**, so you do not have to write that tooling yourself.

But "uploaded" does not mean "retrievable". Remote credentials expire, paths change, archives may be incomplete, and restores may fail — all of which must be verified periodically. General off-site practice and maintenance are covered in [Offsite Backup](/tutorials/ops/offsite-backup). One more trap: the upload uses the same chain as everything else, so if the backup itself failed because the disk was full or permissions were wrong, the remote side simply ends up quietly missing a copy. Read the local backup logs too.

## 5. A Checklist You Can Follow Directly

| When | Action |
| --- | --- |
| Before opening the server | Install a scheduled full-backup plugin and point the backup directory at another disk |
| Before starting a big project | Take a manual full backup and write down the timestamp (your rollback anchor) |
| Before changing configuration or adding mods | Back up both config and world, then watch the server before going further |
| Day to day | Confirm the backup output is actually being produced (check the directory and the logs), not just that the plugin loaded |
| Periodically | Send one backup off-site; unpack and restore one in a test environment |
| During an incident | Check `Ledger` first to size the damage, repair locally if you can, restore a backup if you cannot |

## 6. Where the Backups Live: Three Locations

| Location | What it survives | What it does not survive |
| --- | --- | --- |
| Next to the world, or on the same disk | Deleting the wrong file, one corrupt archive | Disk failure, formatting, deletion of the whole directory |
| A second disk in the same machine | Failure of a single disk | A reinstall, a machine-level failure, the host taking the machine back |
| Remote storage away from the machine | Machine failure, accidental formatting, the host taking the machine back | No obvious weakness, provided you have verified that you can get it back |

The usual mistakes live inside that table:

- The backup directory sits inside `world/`, so a rollback overwrites the backups too;
- Backups share a disk with the world, so one disk failure takes both;
- Only the newest copy is kept, which is useless when "the world is already broken but nobody has noticed";
- The plugin was installed but its logs were never read, so nobody notices it has been failing until the day it matters.

## 7. Backups Are Not Standalone: The Three-Part Kit

The bigger the machines, the more you need **backups, permissions and crash-prevention rules** together. Each covers a different stage, and whichever one is missing shows up on the day of the incident:

| Part | What it solves | Where to read more |
| --- | --- | --- |
| Backups | Returning the world after something goes wrong | This article and [Backup and Recovery](/tutorials/java/backup) |
| Permissions and whitelist | Stopping the people who should not be touching anything | [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat) |
| Crash-prevention rules | Keeping the server from crashing outright during update-suppression style operations | [Carpet and Its Add-ons](/tutorials/java/sd-carpet) |

## Next Step

The bigger the machines, the more backups belong in your process: risk control for high-destruction operations such as world eaters and update suppression is covered in [World Eaters and Update Suppression](/tutorials/java/sd-machine). For MCDR itself see [The MCDR Server Manager](/tutorials/java/mcdr); for consistency, retention and restore drills see [Backup and Recovery](/tutorials/java/backup).

---

> Plugin directory names, mod version ranges and official descriptions in this article come from the official MCDR plugin catalogue and Modrinth data; the features and configuration of each plugin are whatever its own documentation says.
