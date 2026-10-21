---
title: Log Management and Rotation
slug: logs
cat: ops
level: 3
order: 18
minutes: 14
tags: [logs, logrotate, journald, docker, disk-space, syslog, maintenance, troubleshooting]
updated: 2026-10-04
draft: false
---

**Logs are the only evidence you have when something breaks, and they are also the most common reason a Minecraft host runs out of disk.** The server, its plugins, proxies, panels, systemd, Docker and nginx all write to disk, and almost none of them ship with a size limit. This page covers what exists, how to measure before you act, a correct logrotate configuration, the capacity limits of journald and Docker, and a maintenance checklist you can actually follow.

For reading logs while debugging a specific incident, see [Monitoring and Alerting](/tutorials/ops/monitoring). For shipping log copies off the machine, see [Offsite Backup](/tutorials/ops/offsite-backup).

## 1. What logs actually exist on a Minecraft host

Start by breaking "logs" apart. In most "the disk filled up for no reason" incidents, the culprit is not `logs/latest.log`.

| Source | Typical path | Notes |
| --- | --- | --- |
| Server main log | `logs/latest.log` | The log currently being written; UTF-8, LF on Linux and CRLF on Windows |
| Server rotated logs | `logs/YYYY-MM-DD-N.log.gz` | Rotated by the server core itself, gzip compressed |
| Crash reports | `crash-reports/crash-YYYY-MM-DD_HH.MM.SS-server.txt` | One file per crash, long stack traces, hundreds of KB to a few MB each |
| Plugin logs | `plugins/<Plugin>/logs/*.log`, `plugins/<Plugin>/*.log` | **Location is plugin-specific**; some write into the server `logs/` directory instead |
| Proxy logs | `<proxy dir>/logs/latest.log` | Velocity and BungeeCord have their own working directory and `logs/` |
| systemd unit logs | `journalctl -u minecraft.service` | With systemd, stdout/stderr go to the journal by default |
| System logs | `/var/log/syslog`, `/var/log/messages`, `/var/log/kern.log` | Names differ per distribution |
| Auth logs | `/var/log/auth.log` (Debian family), `/var/log/secure` (RHEL family) | SSH brute-force noise lands here; grows fast on public hosts |
| nginx logs | `/var/log/nginx/access.log`, `error.log` | Present whenever a panel, map or web proxy is served through nginx |
| Panel logs | Panel-specific directories | MCSManager, Pterodactyl and friends keep their own logs and often a database |
| Docker logs | `/var/lib/docker/containers/<container-id>/<container-id>-json.log` | The default `json-file` driver, **with no rotation by default** |
| JVM-side files | `logs/gc.log`, `hs_err_pid<pid>.log`, `*.jfr` | Produced by GC logging, JFR or a JVM crash; easy to forget |

:::note Do not forget what the JVM writes
A flag such as `-Xlog:gc*:file=logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M` puts an extra GC log inside `logs/`, and a JVM crash drops `hs_err_pid<pid>.log` into the working directory. Neither is covered by Minecraft's own rotation, so handle them separately.
:::

## 2. How logs take a server down

Log growth comes in three shapes, and the third is the dangerous one:

1. **Normal growth**: players join and leave, plugins write daily records, files get bigger slowly.
2. **Burst growth**: a public host gets scanned, probed or flooded, and every connection may write a line.
3. **Spam loops**: a plugin throws inside `onTick`, or a task fails once per second. That is **20 lines per second**, roughly 1.7 million lines per day; at 150 bytes per line that is **about 250 MB per day**, and it never stops on its own.

A full disk is not merely "large logs". It breaks unrelated things at the same time:

:::warn Symptoms of a full disk: saves, plugins and panels fail together
- **World saves fail**: `Failed to save chunk`, `java.io.IOException: No space left on device`; players get disconnected and chunks roll back.
- **Plugins cannot write configs or databases**: SQLite reports `database or disk is full`, MySQL reports `Disk full`, and permission, economy or claim data may be left half-written.
- **The server dies at the worst possible moment**: `level.dat` cannot be written during shutdown, or the process crashes outright, leaving a gap between the last successful save and the current world state.
- **The panel and SSH fail too**: the panel cannot write logs or sessions, so you lose the very access you need to investigate.
- **inodes can run out as well**: `df -h` still shows free space while `df -i` is at 100%, with identical symptoms.
:::

:::tip Keep the log directory off the world partition if you can
If the layout allows it, put `logs/` (or the whole log mount) on a separate partition or disk. Then even a runaway log cannot stop world saves, and the worst case is losing logs rather than a world.
:::

## 3. Measure first: four commands

All of these are read-only.

```bash
# 1) How large is the server log directory?
du -sh /opt/minecraft/server/logs

# 2) How much space and how many inodes are left?
df -h
df -i

# 3) How much is the journal using? (essential with systemd)
journalctl --disk-usage

# 4) Find every log-like file larger than 100 MB
find /opt/minecraft/server -type f -name '*.log*' -size +100M

# Extra: which top-level directory under /var is the biggest?
sudo du -x -h -d 1 /var | sort -h | tail -n 10
```

Three things to watch when reading the output:

- `du -sh` shows **current usage**, while `find ... -size +100M` finds **individual large files**. Together they tell you whether you have many small files or one monster file.
- When `df -i` reports `IUse%` at 100%, the server cannot write anything even though `df -h` shows free space.
- `journalctl --disk-usage` reports the journal directory, which `du -sh logs/` never sees. It is the most commonly missed item.

## 4. Minecraft's own retention

The server core rotates its own log: the current `latest.log` is rolled into a dated `YYYY-MM-DD-N.log.gz`, where `N` is the sequence number for that day.

**How many generations are kept, and whether it is configurable at all, is entirely core-specific.** Some cores keep a small fixed number with no option; others expose a key in their config, with different names and defaults. This page will not guess: **defer to the official documentation and configuration file of the core you run**. Search the core's directory for log-related keys, or read the logging section of its docs.

If your core has no retention setting, handle it at the system level with logrotate or a cleanup script (see below). Note also that `crash-reports/` is **not** covered by the core's log rotation and will grow without bound during a crash loop.

## 5. Taming logs with logrotate

logrotate is the standard log rotation tool on Linux. It is preinstalled nearly everywhere and normally runs once a day through `logrotate.timer` (or cron). Configuration lives in a file under `/etc/logrotate.d/`.

### 5.1 A complete example configuration

```conf
# /etc/logrotate.d/minecraft
# This file must not be group- or world-writable, or logrotate refuses to load it.

/opt/minecraft/server/logs/latest.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su minecraft minecraft
}

# Optional: logs written by plugins; adjust the path to match your layout
/opt/minecraft/server/plugins/*/logs/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

Replace `/opt/minecraft/server` and `minecraft` with the real path and user on your machine. The wildcard in the second block is safe: rotated files become `*.log.1` or `*.log.1.gz` and are never matched by `*.log` again.

### 5.2 What each directive does

| Directive | Effect |
| --- | --- |
| `daily` | Rotate once a day (logrotate itself must be triggered daily, which distributions do by default) |
| `rotate 14` | Keep 14 generations; the 15th, oldest one is deleted |
| `compress` | gzip the rotated files, usually saving well over 90 percent of the space |
| `delaycompress` | Do **not** compress the file that was just rotated; compress it on the next cycle instead |
| `missingok` | Do not report an error when the file is absent (useful before the server has started, or after a move) |
| `notifempty` | Do not rotate an empty file, avoiding a pile of empty archives |
| `copytruncate` | **Copy the file, then truncate the original in place** instead of renaming it |
| `su minecraft minecraft` | Run the rotation as this user and group; recommended when the log directory belongs to the server user |

### 5.3 Why copytruncate matters for a running server

The default rotation mode is **rename**: logrotate renames `latest.log` to `latest.log.1` and (via `create`) makes a fresh, empty `latest.log`. The catch is that **the Java process already holds a file handle** to the old file. After the rename the server keeps appending to the renamed file, the new `latest.log` stays empty forever, and your logs appear to have vanished until the server is restarted.

`copytruncate` works differently: it **copies the contents, then truncates the original to zero bytes**. The inode never changes, so the running server keeps writing through the same handle and new lines show up in `latest.log` without a restart.

The cost is real and worth stating:

- There is a very short window between the copy and the truncate, and **log lines written in that window are lost** (usually only a few lines).
- Because the original file stays in place, `copytruncate` makes `create` a no-op.
- If losing even one line is unacceptable, the correct fix is to make the server reopen its own log file (most cores expose no such signal), or to accept the small loss. For a Minecraft server, that trade is normally fine.

:::tip delaycompress exists to pair with copytruncate
Some programs keep the old file handle open briefly after rotation and continue writing. `delaycompress` keeps the freshly rotated `latest.log.1` uncompressed so nothing is compressed while it is still being written, and compresses it on the next cycle.
:::

### 5.4 Verifying and troubleshooting

After editing the configuration, **dry-run it instead of waiting for tomorrow**:

```bash
# Dry run: prints what it would do without touching any file
sudo logrotate -d /etc/logrotate.d/minecraft

# Once it looks right, force one rotation and check the result immediately
sudo logrotate -f /etc/logrotate.d/minecraft

# Expected: latest.log plus latest.log.1 (or .1.gz)
ls -lh /opt/minecraft/server/logs
```

Common traps:

- **The config never runs**: check that `logrotate.timer` is active with `systemctl list-timers logrotate.timer`.
- **Permission errors**: `/etc/logrotate.d/minecraft` must not be group- or world-writable, and the log directory must be writable by the user named in `su`.
- **Logs under `/etc` or `/usr` will not rotate**: the distribution's `logrotate.service` sets `ProtectSystem=full` by default, which blocks modifications there. Keeping the server and its logs under `/opt` or `/srv` avoids the problem entirely.
- **A file keeps growing without rotating**: `notifempty` only skips empty files. Use the `-d` output to see exactly how the decision was made.

## 6. journald capacity limits

When the server runs under systemd, stdout/stderr go to the journal by default. journald enforces global limits configured in `/etc/systemd/journald.conf`:

```ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1month
```

| Setting | Meaning |
| --- | --- |
| `Storage=` | `persistent` writes to `/var/log/journal`, `volatile` keeps it in memory, `auto` decides by directory existence, `none` stores nothing |
| `SystemMaxUse=` | Maximum disk space the journal may use (default about 10 percent of the filesystem, capped at 4G) |
| `SystemMaxFileSize=` | Maximum size of one journal file (default about one eighth of `SystemMaxUse`, capped at 128M) |
| `MaxRetentionSec=` | Maximum age of entries; `0` disables time-based deletion |
| `SystemKeepFree=` | Space to leave free for everything else; journald honours whichever of this and `SystemMaxUse` is stricter |

Restart the service and reclaim manually:

```bash
sudo systemctl restart systemd-journald

# Current usage
journalctl --disk-usage

# Manual reclaim (pick one, or combine)
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-files=20
```

:::warn journald only deletes archived files
Both `--vacuum-*` and `SystemMaxUse=` only remove **archived** journal files; the active file being written is never removed. Usage may therefore stay slightly above the limit right after a vacuum. That is expected behaviour, not a broken configuration.
:::

## 7. Docker container log rotation

Docker's default `json-file` driver **performs no rotation at all**. The longer a container runs, the larger `/var/lib/docker/containers/<ID>/<ID>-json.log` grows, and because the Docker daemon holds the file handle, deleting it does not free space immediately.

Limit it per container at start time:

```bash
docker run -d --name mc \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  your-minecraft-image
```

For a daemon-wide default, edit `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart the daemon afterwards, and remember that **existing containers must be recreated** before they pick up the new defaults:

```bash
sudo systemctl restart docker

# Inspect a container's log configuration and log file path
docker inspect --format='{{.HostConfig.LogConfig}}' mc
docker inspect --format='{{.LogPath}}' mc

# Emergency: truncate first, investigate later (works on a running container)
sudo truncate -s 0 "$(docker inspect --format='{{.LogPath}}' mc)"

# Day-to-day reading
docker logs --tail 200 -f mc
docker system df
```

With Docker Compose, put it under the service:

```yaml
services:
  mc:
    image: your-minecraft-image
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## 8. nginx, panels and proxies

- **nginx**: `/var/log/nginx/access.log` and `error.log`. The distribution package **ships its own** logrotate configuration, so rotation is usually already handled. If a panel is exposed to the internet and gets scanned constantly, `access.log` balloons; consider disabling access logging for static assets, or giving the panel its own log file with `maxsize 200M`.
- **Panels**: their own log directory plus a database. Panel logs are normally not inside your server's `logs/`, so cleaning `logs/` alone changes nothing.
- **Proxies**: Velocity and BungeeCord each have their own working directory and `logs/`, so they need **their own** logrotate block or cleanup rule.
- **Reverse proxy and panel access logs contain player IPs**: treat them as personal data when centralising or shipping them, as described in [System Security](/tutorials/ops/system-security).

## 9. Centralising logs (optional)

Local logs are enough for one machine, but once you run several, or you want logs to survive the machine dying, centralise them.

**Option A: rsyslog forwarding** (classic syslog, simple and direct)

```conf
# /etc/rsyslog.d/50-forward.conf
# @@ means TCP, @ means UDP; use TCP in production
*.* @@10.0.0.5:514
```

The receiver must also run rsyslog and accept connections from this host. These logs contain player names, IPs and possibly chat, so **forward only over a trusted network, or add TLS/RELP**.

**Option B: journald forwarding** (systemd)

```ini
# /etc/systemd/journald.conf
[Journal]
ForwardToSyslog=yes
ForwardToSocket=10.0.0.5:4444
```

Receive them with `systemd-journal-remote`. Heed the upstream warning: **forwarding is synchronous**, so a slow receiver stalls journald and, through it, the services that log to it. Be as careful with `ForwardToSocket=` as you would be with `ForwardToConsole=`.

**Option C: periodic shipping** (least invasive)

`rsync` or `rclone` `logs/` and `crash-reports/` to another host or object storage once a day and keep a few days of history. It is not real time, but it needs no long-running service and cannot slow the server down. See [Offsite Backup](/tutorials/ops/offsite-backup) for the mechanics.

## 10. Searching logs efficiently

Logs are often several gigabytes, so the strategy matters more than the command: **narrow by time or filename first, then match text.**

| Goal | Command |
| --- | --- |
| Follow the current log live | `tail -f logs/latest.log` |
| Show the last 200 lines | `tail -n 200 logs/latest.log` |
| Find exceptions with line numbers | `grep -n "Exception" logs/latest.log` |
| Count occurrences | `grep -c "OutOfMemoryError" logs/latest.log` |
| Search inside compressed logs | `zgrep -n "Exception" logs/2026-10-01-1.log.gz` |
| Search all history at once | `zgrep -c "Exception" logs/*.log.gz` |
| Query a unit by time range | `journalctl -u minecraft.service --since "2026-10-01" --until "2026-10-02"` |
| Warnings and worse only | `journalctl -u minecraft.service -p warning -n 100 --no-pager` |
| Follow a unit live | `journalctl -u minecraft.service -f` |
| Filter by content (systemd 237+) | `journalctl -u minecraft.service -g "Exception" --since today` |
| Read the previous boot | `journalctl -b -1` |

Habits that pay off:

- **Do not `grep` a 5 GB `latest.log` directly**: use `tail -n 5000`, or pick the right `*.log.gz` by date first. It is an order of magnitude faster.
- `zgrep` reads `.gz` in place. Do not `gunzip` first, since the decompressed copy costs you another full copy of the data on a disk that is already under pressure.
- Use `journalctl -o short-iso` so timestamps carry a timezone and cross-machine comparison stays correct.
- Once you find a spamming plugin, **fix the root cause first** (turn off debug, update or temporarily disable the plugin) and clean the logs afterwards. Otherwise the space comes straight back.

## 11. Cleanup script and scheduling

logrotate handles rotation. A script handles what it cannot: the core's own `.log.gz` files, the pile of crash reports, and size alerting.

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-log-cleanup.sh
set -euo pipefail

SERVER_DIR="/opt/minecraft/server"
LOG_DIR="$SERVER_DIR/logs"
CRASH_DIR="$SERVER_DIR/crash-reports"

# 1) Delete the core's own rotated logs older than 30 days
find "$LOG_DIR" -type f -name '*.log.gz' -mtime +30 -delete

# 2) Keep only the 20 newest crash reports
if [ -d "$CRASH_DIR" ]; then
    ls -1t "$CRASH_DIR"/crash-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f
fi

# 3) Report anything still above 100 MB for a human to look at
find "$SERVER_DIR" -type f -name '*.log*' -size +100M -exec ls -lh {} +
```

```bash
chmod +x /usr/local/bin/mc-log-cleanup.sh
```

**With cron (daily at 04:15):**

```bash
# crontab -e  (or /etc/cron.d/mc-log-cleanup, which additionally needs a user field)
15 4 * * * /usr/local/bin/mc-log-cleanup.sh >> /var/log/mc-log-cleanup.log 2>&1
```

**With a systemd timer (preferred: it has logs, status and catch-up runs):**

```ini
# /etc/systemd/system/mc-log-cleanup.service
[Unit]
Description=Clean up Minecraft server logs

[Service]
Type=oneshot
User=minecraft
Group=minecraft
ExecStart=/usr/local/bin/mc-log-cleanup.sh
```

```ini
# /etc/systemd/system/mc-log-cleanup.timer
[Unit]
Description=Run Minecraft log cleanup daily

[Timer]
OnCalendar=*-*-* 04:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mc-log-cleanup.timer
systemctl list-timers mc-log-cleanup.timer
journalctl -u mc-log-cleanup.service -n 50 --no-pager
```

:::tip Delete what you generated, then alert on the rest
Never start the script with `rm -rf logs/*`; that throws away the evidence too. The right order is **delete archives by age, cap the number of crash reports, then report files that are unusually large or unusually new**. The thing a human actually needs to see is "the log grew by 3 GB today".
:::

## 12. Maintenance checklist

| Frequency | Action | Command or location |
| --- | --- | --- |
| Daily (automatic) | Rotate server and plugin logs | `logrotate.timer`, config in `/etc/logrotate.d/minecraft` |
| Daily (automatic) | Delete old archives, cap crash reports | `mc-log-cleanup.timer` |
| Weekly | Check disk and inode headroom | `df -h`, `df -i` |
| Weekly | Check journal usage and the largest log files | `journalctl --disk-usage`, `find ... -size +100M` |
| Weekly | Watch whether crash reports are piling up (possible crash loop) | `ls -1t crash-reports/ \| head` |
| Monthly | Re-check logrotate retention against current volume | `logrotate -d /etc/logrotate.d/minecraft` |
| Monthly | Confirm centralised or offsite logs are still arriving | Modification times on the receiver or in object storage |
| After every change | Dry-run logrotate after moving paths, users or unit names | `sudo logrotate -d` |
| After an incident | Preserve the scene before cleaning | Copy the relevant `latest.log` and `crash-reports/` elsewhere first |

## 13. Next steps

- Turn logs and metrics into alerts instead of eyeballing them: see [Monitoring and Alerting](/tutorials/ops/monitoring).
- Consistency and retention for logs and worlds: see [Backup and Restore](/tutorials/java/backup).
- Get log copies off the machine: see [Offsite Backup](/tutorials/ops/offsite-backup).
- Overall server directory layout: see [Server Structure](/tutorials/java/structure).

> Exact paths and directory layouts vary by game version and server core; refer to the official documentation.
