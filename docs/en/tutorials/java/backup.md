---
title: Backup and Recovery
slug: backup
cat: java
level: 2
order: 15
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, advanced, backup, recovery, rollback, scheduled-tasks]
updated: 2026-10-04
draft: false
---

**Backups are the one thing you cannot skip when running a server.** Hardware fails, hosting providers disappear, players grief, plugins corrupt saves — when something really goes wrong, everything else can be rebuilt, but a lost world is lost for good.

## 1. What to Back Up

| Needed? | Item |
| --- | --- |
| Required | `world/`, `world_nether/`, `world_the_end/` (**the world data itself, the most important part**) |
| Required | `plugins/` (plugin jars and configuration), `mods/` (modded servers) |
| Required | `server.properties`, `ops.json`, `whitelist.json`, `banned-*.json` |
| Required | The core's own configuration (`bukkit.yml` / `spigot.yml` / `paper-*.yml` / the yml files of your core) |
| Optional | `logs/`, `crash-reports/` (optional, useful for troubleshooting) |
| Not needed | `libraries/`, `versions/`, `cache/` (rebuilt automatically, no need to back them up) |

## 2. The Most Important Principle: Backups Must Be Consistent

**Never copy the files while the server is writing the world** — you may copy half-written chunk files and end up with a corrupted world after restoring.

The correct approaches (two of them):

**Method A: Hot backup (no downtime)**

```
save-all        flush the data to disk first
save-off        disable automatic saving (so nothing is written during the backup)
(run the copy/archive here)
save-on         re-enable automatic saving when the backup is done
```

**Method B: Offline backup (the safest)**

```
stop            shut the server down safely
(copy/archive the whole directory)
(start it again)
```

:::tip Use Method A for scheduled backup scripts
Paired with a scheduled task, run "`save-all` → `save-off` → archive → `save-on`" during off-peak hours and players barely notice.
:::

## 3. Automation

**Linux (cron)**: write a backup script (archive + date-based naming + clean up old archives) and run it on a schedule with `crontab -e`.

**Windows (Task Scheduler)**: turn your startup script into a "backup script" and set it to run at a fixed time every day in Task Scheduler.

**Plugin option**: dedicated backup plugins also exist; they can back up automatically at an interval and keep a number of historical copies, saving you from writing a script. **Note**: plugin backups must be consistent too, and **the backup files should not live on the same disk**.

## 4. Retention Policy

- **Keep several versions**: if you keep only the newest one, you are stuck when "the world is already corrupted but nobody has noticed yet". Keeping **several daily copies plus several weekly copies** is recommended.
- **Watch your disk**: world files keep growing, so **clean up old backups regularly** and do not fill the disk (a full disk makes the server fail to write the world, with serious consequences).
- **Keep one copy off-site**: if the local disk dies, the local backups die with it.

:::warn Hosting providers disappear, data centres have incidents
Keeping all your data on a single rented machine means trusting someone else with your life. **At minimum, download backups to your own computer or another storage location regularly**.
:::

## 5. The Recovery (Rollback) Procedure

1. **Stop the server** (always run `stop` first).
2. **Rename the current world data to keep it** (for example `world_broken_20261004`) — **do not delete it outright**, so you can fall back if the new backup turns out to be broken too.
3. Extract the backup and put `world*` back into the server directory.
4. Start the server and check the logs for any world-related errors.
5. Have players confirm that key builds and items are intact.

## 6. One Last Reminder

> **A backup whose restore has never been tested is not a backup.**

Regularly (once a month, say) take one backup and **actually restore it in a test environment**. Plenty of people only discover on the day of a real incident that the backup script has been failing for ages because of a permissions or path problem, or that the archive it produced was empty.

## Next Step

Guard against griefing: see [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
