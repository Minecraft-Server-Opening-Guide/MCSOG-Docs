---
title: Server Migration: Moving to Another Machine or Datacenter
slug: server-migration
cat: ops
level: 3
order: 20
minutes: 16
tags: [ops, migration, rsync, dns, cutover, rollback, verification, hosting]
updated: 2026-10-04
draft: false
---

A migration means moving the whole server from one environment to another: onto better hardware, to a different provider, out of a region with bad routing, or simply to cut costs. It is far more dangerous than building a server from scratch. If a fresh install fails you have no server yet; **if a migration fails, the old server is already down and the new one will not come up.**

This article covers the full procedure and the pre-flight checklist. For which files matter and which must never be touched, see [Server Layout](/tutorials/java/structure); for backup scope and restore drills, see [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup).

## 1. When to Migrate

| Reason | Typical signal | What to watch out for |
| --- | --- | --- |
| Hardware upgrade | TPS stays low, memory is tight, disk I/O is saturated, and tuning has nothing left to give | Single-core CPU speed matters more than core count for Minecraft; confirm the bottleneck really is hardware |
| Changing provider | Support tickets go unanswered, overselling is obvious, shutdown rumours, opaque billing | Data residency and compliance, egress fees, and verifying the new environment before cancelling the old one |
| Leaving a bad network region | High latency, odd routing, packet loss, no DDoS protection | **Measure** the target region yourself; do not trust marketing copy |
| Cutting costs | Bill pressure, or an oversized plan sitting idle | Cheap machines often share CPU and use slower disks; benchmark before moving |
| Architecture change | Single server becoming a proxy network, adding a panel or a database | This is a rebuild plus a data move, not a migration; plan it separately |

:::note Solve it in place if you can
Every migration step carries downtime and data risk. **If the problem is memory, buying more memory is cheaper than migrating. If the problem is latency, check routing and proxy configuration first.** Reserve migration for problems that genuinely cannot be fixed where you are.
:::

## 2. Pre-Flight Checklist

The step that breaks migrations is not `rsync`. It is **not knowing what is actually running on the box**. Write the inventory first, then touch anything.

| Item | How to check | Pass condition |
| --- | --- | --- |
| What runs on this machine | `systemctl list-units --type=service --state=running`, `ss -tlnp`, `docker ps`, `crontab -l` | Every entry has a known purpose, and you know whether it moves |
| Game and server core version | Startup log, `/version`, core jar filename | Recorded as game version plus core name plus core build |
| Plugin / mod inventory | `plugins/`, `mods/` listings | A versioned list you can reproduce, not just the directory itself |
| Java version | `java -version` | Identical on both machines; **upgrading Java is a separate change, not part of the move** |
| OS and kernel | `cat /etc/os-release`, `uname -a` | Differences understood (distribution, glibc, filesystem) |
| DNS records and TTL | `dig +noall +answer example.com`, `dig _minecraft._tcp.example.com SRV` | Record types (A, AAAA, SRV) and current TTL written down |
| Who has access | SSH keys, panel accounts, provider accounts, staff list | Reviewed line by line after the move; anything stale removed |
| Backups are restorable | An actual restore drill | Not "there are backup files" but "**restored, and it started**" |
| External dependencies | Databases, object storage, API keys, webhooks, monitoring | Reachable from the new machine with working credentials |

:::warn Migrating without a verified backup is gambling
A mistyped `rsync --delete` path, a full disk, wrong permissions, a truncated archive: any one of these can leave you discovering, after you have already stopped the server, that there is no usable copy. **Before you start, you must hold an offline backup that has been restored and verified**, and you must not delete it during the maintenance window. A backup you never tested is not a backup.
:::

## 3. What Has to Move

Every row below has been forgotten by someone in a real incident. **Losing the world is a disaster; losing the start method gives you "all the data is here but the server will not start".**

| Item | Location (assuming `/opt/mcserver`) | Cost of forgetting it |
| --- | --- | --- |
| World saves | `world/`, `world_nether/`, `world_the_end/` (names follow `level-name` in `server.properties`) | **The worst case**: builds, inventories, and progress are gone |
| Plugin / mod jars | `plugins/`, `mods/` | Features vanish, or modded clients cannot join at all |
| Plugin / mod configuration | `plugins/<plugin>/`, `config/` | Permissions, economy, claims, warps, and crates all revert to defaults |
| `server.properties` | server root | Port, difficulty, online mode, view distance, whitelist toggle all revert |
| Core configuration | `bukkit.yml`, `spigot.yml`, `paper-*.yml`, `purpur.yml` | Tuning and world defaults lost; performance may change noticeably |
| Access lists | `ops.json`, `whitelist.json`, `banned-players.json`, `banned-ips.json` | Admins lose their powers, or bans and the whitelist stop working |
| Player name cache | `usercache.json` | Usually regenerated, but name-to-UUID mapping can be briefly inconsistent in offline mode |
| Start scripts | `start.sh`, `start.bat`, JVM flags | **The most common omission**: the server will not start, or starts with wrong memory settings |
| systemd unit | `/etc/systemd/system/minecraft.service` | No boot start, no crash restart; a wrong `WorkingDirectory` silently creates an empty world |
| Scheduled jobs | `crontab -l`, `/etc/cron.d/`, systemd timers | Backups, restarts, and cleanups disappear, and **you notice weeks later** |
| Firewall rules | `ufw status`, `firewall-cmd --list-all`, cloud security groups | Ports are closed and nobody can connect, or the old exposure is left open |
| TLS certificates | `/etc/letsencrypt/`, `/etc/ssl/` | Panels, maps, and resource packs break or start throwing certificate warnings |
| MCDR data | `config.yml`, `permission.yml`, `plugins/` in the MCDR working directory | Bot permissions, command aliases, and plugin state are lost (exact filenames and layout follow the MCDR documentation) |
| Panel data | The panel's own configuration and instance definitions | Server files still exist but the panel shows nothing; see [Server Panels](/tutorials/ops/panels) |
| Credential files | `.env`, `rcon.password`, database passwords, cloud storage keys | The server will not start, or starts and cannot reach its dependencies |
| Reverse proxy configuration | Nginx or Caddy site files and certificate paths | The domain returns 502, which is easily misdiagnosed as "the server is down" |
| Monitoring and alerting | Probes, agents, alert rules | Nobody is notified when things break, which is the most dangerous kind of silent failure |

### What Not to Move

| Item | Reason |
| --- | --- |
| `logs/`, `crash-reports/` | Large; fetch them separately if you need to investigate an old incident |
| `cache/`, `libraries/`, `versions/` | Rebuilt automatically at startup |
| `world/session.lock` | A runtime lock file; delete it on the destination and let the server recreate it |
| Temporary archives on the old host (`*.tar.gz`) | Easy to sync hundreds of gigabytes of scratch data by accident |

## 4. Migration Methods

### 4.1 rsync over SSH (preferred)

`rsync` transfers only what changed, preserves permissions and timestamps, and runs over an encrypted SSH channel. It is the default choice for migrations.

```bash
# First pass: pre-seed while the server is still running
rsync -aHAX --numeric-ids --delete --info=progress2 \
  --exclude='logs/' \
  --exclude='crash-reports/' \
  --exclude='cache/' \
  --exclude='libraries/' \
  --exclude='versions/' \
  --exclude='session.lock' \
  /opt/mcserver/ \
  mcserver@203.0.113.20:/opt/mcserver/
```

| Option | Effect |
| --- | --- |
| `-a` | Archive mode (equivalent to `-rlptgoD`): recursive, preserving symlinks, permissions, times, group, and device files |
| `-H` | Preserve hard links |
| `-A` | Preserve ACLs |
| `-X` | Preserve extended attributes (xattr) |
| `--numeric-ids` | Map by numeric UID/GID. **Required across machines**, otherwise ownership ends up wrong |
| `--delete` | Make the destination match the source. A double-edged sword: a mistaken deletion on the source propagates |
| `--info=progress2` | Overall progress display (rsync 3.1 and newer) |

**Any command with `--delete` should first be run with `-n` (`--dry-run`) and `-i` (itemize changes)** so you can confirm it will not remove something it should not:

```bash
rsync -aHAX --numeric-ids --delete -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ mcserver@203.0.113.20:/opt/mcserver/
```

:::warn The trailing slash on the source path is not cosmetic
`/opt/mcserver/` with a trailing slash means "sync the contents of this directory". `/opt/mcserver` without it means "create a directory named `mcserver` on the destination and put things inside". **Combined with `--delete`, a wrong slash can wreck the destination layout.**
:::

### 4.2 tar + scp (small datasets, no rsync available)

When `rsync` is unavailable or the dataset is small, pipe an archive straight over SSH without an intermediate file:

```bash
# Run on the old host: archive and unpack on the new host in one pipeline
tar -C /opt/mcserver -czf - \
  --exclude='logs' --exclude='crash-reports' --exclude='cache' \
  --exclude='libraries' --exclude='versions' --exclude='session.lock' \
  . | ssh mcserver@203.0.113.20 'mkdir -p /opt/mcserver && tar -C /opt/mcserver -xzf -'
```

Or stage the archive locally first:

```bash
tar -czf /tmp/mcserver-2026-10-04.tar.gz -C /opt/mcserver .
scp /tmp/mcserver-2026-10-04.tar.gz mcserver@203.0.113.20:/tmp/
```

The drawbacks are real: **full transfer every time, no incrementality, and a dropped connection means starting over.** It does not scale to a world measured in hundreds of gigabytes.

### 4.3 Provider snapshots and volume copies (fastest)

When moving within one provider, you can usually **snapshot the system or data volume and attach it to a new instance**, or detach the volume from the old instance and attach it to the new one. This is orders of magnitude faster than copying files over the network.

Caveats:

- **Consistency depends on whether the server is writing when the snapshot is taken.** For a trustworthy snapshot, stop the server first (or at minimum run `save-all` then `save-off`, and `save-on` afterwards).
- Mount paths, device names, and filesystem UUIDs can change. Use UUIDs in `/etc/fstab` or reconfigure it, or the new instance will not boot.
- Cross-provider and often cross-region copies cannot attach a volume directly; those must go over the network.
- A snapshot carries the old SSH host keys, old-IP configuration, and panel credentials. **Rotate credentials after the move.**

### 4.4 Why You Sync Twice

| Pass | Server state | Purpose |
| --- | --- | --- |
| First sync | **Running** | Move the bulk of the data early, shrinking the maintenance window from hours to minutes |
| Second sync | **Stopped** | Transfer only the differences, making the destination match the instant of shutdown |

Because the server keeps writing during the first pass, that copy **is not consistent on its own**. Its only value is that most files are already in place; correctness comes entirely from the second pass. Therefore:

- The second sync **must happen after the server is stopped**, and you must not start the old server again afterwards, or you will have to sync again.
- By default `rsync` decides whether to re-transfer using size and modification time. For a stricter content comparison, add `--checksum` (`-c`) to the final pass: **slower, but it will not miss a file whose size is unchanged and whose timestamp was preserved while its contents differ.**
- After the second sync, **verify** (next section). Do not start the server just because the command did not error.

## 5. The Maintenance Window, Step by Step

Announce the window in advance, with an expected duration and what players get in return, then follow the order below. **Confirm each step before starting the next.**

1. **Freeze changes**: tell staff to stop editing configuration and installing plugins, and make sure no backup or cleanup job is running that would conflict with the move.

2. **Re-confirm the backup**: verify that the offline backup exists, that its checksums pass, and that it is **not** stored in a path you are about to delete or overwrite.

3. **Lower the DNS TTL**: if you have not already, drop it to 60 to 300 seconds. The change only takes effect after the old TTL expires, which is why this step actually belongs **24 to 48 hours earlier** (see section 6).

4. **Stop the server**:

```bash
sudo systemctl stop minecraft
pgrep -a java          # must print nothing; confirm the process really exited
```

5. **Final sync** (the section 4.1 command with `--exclude` adjusted and `-c` added):

```bash
rsync -aHAX --numeric-ids --delete --checksum --info=progress2 \
  /opt/mcserver/ mcserver@203.0.113.20:/opt/mcserver/
```

6. **Verify**: build a manifest on each side and compare. Paths must be **relative**, or the filenames will not line up.

```bash
# Old host
cd /opt/mcserver && find . -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/old.sha256

# New host: same command, writing /tmp/new.sha256, then:
diff /tmp/old.sha256 /tmp/new.sha256 && echo "verification passed"
```

On Windows you can compare file by file with `Get-FileHash -Algorithm SHA256`, or, for small datasets, just compare sizes and file counts:

```powershell
Get-ChildItem -Recurse -File C:\mcserver | Measure-Object -Property Length -Sum
```

7. **Clear runtime leftovers on the new host**:

```bash
rm -f /opt/mcserver/world/session.lock
```

8. **Confirm the new host environment**: Java version matches the old host (`java -version`), directory ownership is correct, and the port in `server.properties` does not collide with anything else.

9. **Install and start the supervised service**:

```bash
sudo cp minecraft.service /etc/systemd/system/minecraft.service
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
journalctl -u minecraft -n 50 --no-pager
```

10. **Test with the same client you normally play on**: connect to the new IP first (section 6) and check builds, container contents, inventories, permissions, and plugin commands.

11. **Cut over DNS**: once the new server is confirmed healthy, point the records at the new IP.

12. **Keep the old host for a while**: **do not cancel or wipe it immediately.** It is your rollback target (section 9).

## 6. DNS and Cutover

### Lower the TTL First

DNS records are cached for their TTL. If the TTL is 24 hours, players will keep resolving to the old IP for up to 24 hours after you change the record.

```bash
# Inspect current resolution and TTL
dig +noall +answer mc.example.com
dig +noall +answer mc.example.com AAAA
dig +noall +answer _minecraft._tcp.mc.example.com SRV
```

**The sequence is**: 24 to 48 hours before the move, lower the TTL to 60 to 300 seconds; wait for the old TTL to expire; migrate; switch the record; once things are stable, raise the TTL again to reduce query load.

### How to Test the New Server Before Switching

**Do not change DNS before verifying the new server.** Two safe approaches:

| Method | How | Best for |
| --- | --- | --- |
| hosts file | Point the domain at the new IP in your local hosts file | Affects only you; good for the owner and staff to check first |
| Connect to the IP directly | Enter `203.0.113.20:25565` in the client | Works for anyone, and **does not depend on DNS at all** |

```text
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux / macOS: /etc/hosts
203.0.113.20  mc.example.com
```

:::tip Test with the same client your players use
Testing from another computer, another network, or another game version tells you nothing about the real experience. **Connect once with the client you actually play on, from the network you actually play on.**
:::

### Do Not Forget the SRV Record

Many servers use an SRV record so players only type a domain without a port. When migrating you must **update the SRV target as well**, or players will keep being sent to the old machine:

```text
_minecraft._tcp.mc.example.com. 300 IN SRV 0 5 25565 mc.example.com.
```

### Keep the Old Host as a Rollback Target

After the cutover, keep the old host intact for **at least one full maintenance window** (24 to 72 hours is a common choice, depending on player numbers and your tolerance for downtime):

- Keep it **able to start at any moment**: configuration, data, and Java environment untouched.
- But **never run both hosts behind the same domain at the same time.** That splits player data across two worlds, and the split cannot be merged automatically.
- If DNS caching still sends some players to the old host, consider leaving its server **stopped** and starting it only if you decide to roll back.

## 7. Consequences of a New IP Address

Everything keyed to an IP address breaks at once. **Miss this section and the symptom is "players can join, but some feature mysteriously does not work".**

| Affected system | Symptom | Action |
| --- | --- | --- |
| Allowlists on other services | Databases, object storage, and third-party APIs refuse connections | Add the new IP, remove the old one |
| RCON and panel IP allowlists | The panel shows the instance offline, RCON will not connect | Update both the panel and daemon allowlists (configuration keys follow each panel's documentation) |
| Firewalls and cloud security groups | Ports closed, or the reverse proxy cannot reach the backend | Add rules on the new host and **close the old host down** so it stops being exposed |
| TLS certificates and reverse proxy | HTTPS errors, certificate name mismatch | Move or reissue certificates; repoint the proxy upstream at the new IP |
| Geyser / Floodgate and proxy networks | Bedrock players cannot join, or every player appears to come from the proxy IP | Move the forwarding configuration too; see [Bedrock Third-Party Cores](/tutorials/bedrock/third-party-setup) and [Proxy Networks](/tutorials/java/proxy) |
| IP ban lists | Entries in `banned-ips.json` may refer to the old environment, or a forwarding change can make **every player appear as the proxy IP, so one ban hits everyone** | Confirm forwarding works after the move before deciding what to keep |
| Monitoring and alerting | Probes still watch the old IP, so a dead new server goes unnoticed | Repoint probes and **deliberately fire one alert** to prove the path works |
| Backup jobs | Backups still pull from the old host, or the new host has none configured | See [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup) |
| Whitelisted Bedrock players | Bedrock identity is tied to the XUID, so it normally **survives an IP change** | Usually nothing to do, but re-check if forwarding or permission plugins depend on IP |

:::note About IP bans
IP bans were never a good long-term control: home connections change addresses and datacenter ranges get reused. If the ban list holds a lot of IP entries, **confirm they are still meaningful before copying them over** instead of carrying them along blindly.
:::

## 8. Post-Migration Verification Checklist

| Check | How | Pass condition |
| --- | --- | --- |
| Players can join | Connect once with a real client, including Bedrock if cross-play is enabled | Joins, chats, moves, and interacts normally |
| TPS / MSPT normal | `/tps`, `/spark tps`, or the core's own command | Same order of magnitude as the old host, no sustained tick drop |
| All plugins and mods loaded | Search the startup log for `Enabling`, `Loaded`, and error keywords | No `Could not load`, no version incompatibilities |
| Configuration took effect | Spot-check permissions, economy, claims, warps | Identical to before the move |
| Access lists correct | `/whitelist list`, op commands, or read the files | Admins and whitelist match the old server |
| Backups run on the new host | Run the backup script by hand | Archive created, sensible size, and **it really extracts** |
| Monitoring updated | Check the monitoring dashboard | New IP has a heartbeat; alerts for the old IP are disabled |
| Scheduled jobs | `crontab -l`, `systemctl list-timers` | Backup, restart, and cleanup jobs all present with correct times |
| Performance and disk | `df -h`, `iostat`, memory usage | Plenty of free disk, no obvious I/O bottleneck |
| Old host decommissioned | See below | Only **after the rollback window closes** |

## 9. The Rollback Plan

A rollback is not "migrate back". It is "**return to a known-good state**". Write the plan **before** migrating:

1. **Define the trigger**: what makes you roll back? For example: the new server cannot start reliably within two hours, world verification fails, a critical plugin will not work, or TPS is half the old host's with no identifiable cause.
2. **Define the actions**: point DNS back at the old IP, start the server on the old host, announce what happened, and analyse afterwards.
3. **Preserve the target**: keep the old host's server directory, Java environment, systemd unit, and firewall rules exactly as they are until the rollback window closes.
4. **Decide the data policy in advance**: if the new server has been live for a while and players have been playing on it, **the old world is now behind**. Rolling back means losing that progress, or manually moving the newer world back, in which case the "new" world is the authoritative data. **Make this decision before you roll back, not during it.**
5. **Verify the rollback too**: before starting the old host, confirm its data still matches the shutdown state (not modified by a backup job, not accidentally deleted).

:::warn The worst outcome is both servers running at once
If old and new hosts serve the same domain simultaneously, for example because DNS caching sends some players to each, **player data splits across two worlds**. That split usually cannot be merged automatically and you simply lose one side. **Stopping the old server before the cutover is the simplest way to avoid it.**
:::

## 10. Summary

- **Inventory first, then act.** Most migration failures are not technical; they come from forgetting what else was running.
- **The backup must be verified.** An untested backup is a comfort blanket, not a safety net.
- **Sync twice.** A warm-up pass while running, a final pass after stopping, and never restart the old server in between.
- **Test before cutting over.** Verify via a hosts entry or a direct IP connection, then change DNS.
- **Lower the TTL early.** It is the one step that cannot be done at the last minute.
- **Keep a rollback target.** The old host is not junk; it is your way back.

Related reading: [Server Layout](/tutorials/java/structure) for what to move, [Deploying to a Reachable Environment](/tutorials/java/deploy) for publishing the new host, [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup) for the safety net, and [Resource Packs and Datapacks](/tutorials/ops/packs) for the pack links and datapacks you should re-check after the move.

> Migration commands, configuration keys, and service directory layouts change with software versions; defer to the official documentation.
