---
title: Offsite Backup: Usage, Configuration and Maintenance
slug: offsite-backup
cat: ops
level: 3
order: 10
minutes: 20
tags: [ops, backup, offsite, encryption, retention, automation, restore-drill]
updated: 2026-10-04
draft: false
---

A local backup saves you from a mistaken deletion. It does not save you from a failed disk, a stolen machine, or an incident at a hosting provider. **Offsite backup exists for the class of disaster in which the entire environment disappears at once.** This article covers how it works, how to configure it, and how to maintain it.

The basics of local backup - what to copy, the consistency requirement, and the restore procedure - are in [Backup and Restore](/tutorials/java/backup). This article assumes you already have local backups and now want copies to live somewhere else.

## 1. The 3-2-1 Rule

The 3-2-1 rule is a widely cited backup heuristic:

| Number | Meaning | What it means for a Minecraft server |
| --- | --- | --- |
| **3** | Keep at least **three copies** of the data (one production plus two backups) | The running server directory, a local backup disk, and an offsite copy |
| **2** | Use at least **two different media or storage types** | For example an internal SSD, an external disk, and object storage |
| **1** | Keep at least **one copy offsite** | Cloud storage, a second machine, or a different physical location |

### Why a Backup on the Same Disk Is Not a Backup

Writing backups to **the same disk that holds the server** protects against exactly one failure mode: accidental deletion, a bad configuration edit, or a plugin corrupting a save. It protects against none of the following: **the disk itself failing** (the backup goes with it), **a whole-machine failure** (a dead motherboard or PSU takes both disks), **ransomware** (which encrypts every writable volume it can see), **deliberate destruction** (someone running `rm -rf` on the directory, or walking off with the machine), or **fire, flood, and theft**.

### Three Typical Disaster Scenarios

| Scenario | Is a local backup enough? | What offsite backup does |
| --- | --- | --- |
| Accidental deletion, or a plugin corrupting data | Yes | Not needed |
| Disk failure, or the machine is written off | No, if the backup is on the same disk | Restore straight from the offsite copy |
| Ransomware encrypting every writable volume | **No** | A read-only or immutable offsite copy is the only way out |
| Provider shutdown, data centre incident, stolen account | **No** | The copy is on storage you control |

:::warn An offsite copy must be writable by the backup and undeletable by an attacker
If the offsite storage uses the same credentials and the same writable account as everything else, ransomware can delete it just as easily. **Make it read-only or immutable if you can** (object lock, WORM, append-only); failing that, at least give the backup account write permission without delete permission.
:::

## 2. What to Back Up, and What to Leave Out

| Necessity | Content | Notes |
| --- | --- | --- |
| Required | `world/`, `world_nether/`, `world_the_end/` | **The world itself, the most important data**; custom world names follow `level-name` |
| Required | `server.properties` | Port, difficulty, online mode, `level-name`, and so on |
| Required | `ops.json`, `whitelist.json`, `banned-ips.json`, `banned-players.json` | Permissions and ban lists |
| Required | `plugins/` including each plugin's configuration and databases | Plugin jars and configs; note that some plugins store data elsewhere |
| Required | `mods/` and `config/` on modded servers | Modded-specific; `config/` holds mod configuration |
| Required | The server core's own configuration (`bukkit.yml`, `spigot.yml`, `paper-*.yml`, and so on) | Differs by core |
| Required | Start scripts, systemd units, cron entries | **Easily forgotten**, and without them the server will not start after a restore |
| Optional | `logs/`, `crash-reports/` | Useful for troubleshooting, but they grow large |
| Not needed | `libraries/`, `versions/`, `cache/` | Rebuilt automatically |

:::tip Treat "how the server starts" as data worth backing up
"the world restored but the server will not start" is a common incident, and the cause is that the start script, JVM flags, systemd unit, and scheduled jobs were never backed up. **Include them alongside the configuration.**
:::

### Consistency: Never Copy While the Server Is Writing

**Do not copy the world while the server is writing to it.** You can end up with half-written chunk files and a world that is corrupt after a restore. There are two correct approaches.

**Method A: hot backup without stopping the server**

```text
save-all        flush the data to disk first
save-off        disable automatic saving (so nothing is written during the copy)
(run the copy or archive now)
save-on         re-enable automatic saving afterwards
```

**Method B: stop the server (the safest option)**

```text
stop            shut down cleanly
(copy or archive the whole directory)
(start it again)
```

Method A requires **sending commands to the server console**. If the server runs under systemd and the launch method accepts console input, you can inject commands with `screen` or `tmux`, or enable RCON and send them remotely (**RCON configuration differs between cores and versions, so follow the official documentation**).

:::warn Archiving tools read files while the server is still writing
`tar`, `rsync`, and `restic` all **walk the tree as they read it**. Even if you have just run `save-all`, without `save-off` the server keeps writing new data during the walk, so **the archive can contain an inconsistent mixture**. The `save-off` step is not optional.
:::

## 3. rsync over SSH

`rsync` is the classic offsite incremental approach: it transfers only what changed, runs over an encrypted SSH channel, and is available in virtually every Linux distribution.

### A Complete Example Command

```bash
rsync -aHAX --delete --numeric-ids --info=progress2 \
  --exclude='logs/' \
  --exclude='crash-reports/' \
  --exclude='cache/' \
  --exclude='libraries/' \
  --exclude='versions/' \
  --exclude='*.tar.gz' \
  --link-dest=/srv/backup/mcserver/2026-10-03 \
  /opt/mcserver/ \
  backup@backup.example.com:/srv/backup/mcserver/2026-10-04/
```

### Flag by Flag

| Flag | Effect |
| --- | --- |
| `-a` | Archive mode, equivalent to `-rlptgoD` (recursive, preserve symlinks, permissions, times, group, owner, device files) |
| `-H` | Preserve hard links (**without it, hard links inside the server directory are expanded into separate copies**) |
| `-A` | Preserve ACLs |
| `-X` | Preserve extended attributes (xattrs) |
| `--delete` | Delete files on the destination that no longer exist on the source, keeping the two in step. **A double-edged sword**: a deletion on the source is propagated |
| `--numeric-ids` | Map by numeric UID/GID instead of by user and group name. **Required** across machines, or when the destination has no matching users |
| `--info=progress2` | Show overall progress (rsync 3.1 and later) |
| `--exclude` | Skip directories that do not need backing up |
| `--link-dest=DIR` | **Hard-link snapshots**: files identical to those in `DIR` are hard-linked in the destination instead of being copied, so each dated directory looks like a full copy while only the changes consume space |

:::warn `-A` and `-X` require support on both ends
Preserving ACLs and xattrs needs a recent rsync, a destination filesystem that supports those features, and **usually root privileges** to read every file's ACLs and xattrs. If the destination (some network storage, for example) does not support them, rsync will either error out or silently drop them. **When in doubt, drop `-A -X` first.**
:::

### Dry Run First

**Any command that includes `--delete` must be run once with `-n` (`--dry-run`) first:**

```bash
rsync -aHAX --delete --numeric-ids -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ backup@backup.example.com:/srv/backup/mcserver/
```

`-n` (`--dry-run`) reports what would happen without changing anything, and `-i` (`--itemize-changes`) lists the changes item by item so you can see exactly what `--delete` would remove. **Once the output contains nothing you did not expect to lose, drop the `-n`.**

### Passwordless SSH

A backup script has to run unattended, so use key authentication:

```bash
ssh-keygen -t ed25519 -C "mc-backup@home"
ssh-copy-id backup@backup.example.com
ssh backup@backup.example.com 'echo ok'
```

`ssh-keygen -t ed25519` creates an Ed25519 key pair, by default at `~/.ssh/id_ed25519` (private) and `~/.ssh/id_ed25519.pub` (public). **A passphrase on the private key is more secure, but scheduled jobs then need ssh-agent or `keychain` to run without interaction; unattended backup hosts usually leave it unset, which makes restricting that key's privileges essential.** `ssh-copy-id` appends the public key to `~/.ssh/authorized_keys` on the destination; **some platforms (Windows OpenSSH, certain minimal systems) may not ship that command**, in which case append the key manually. It is worth restricting the key in the destination's `authorized_keys`:

```text
from="203.0.113.10",command="/usr/bin/rrsync -wo /srv/backup/mcserver/",no-port-forwarding,no-pty ssh-ed25519 AAAA... mc-backup@home
```

`rrsync` is a restricted wrapper shipped with rsync that only permits writes into a given directory. **Its path and availability vary by distribution** (on Debian and Ubuntu it comes with the `rsync` package, possibly at `/usr/bin/rrsync`), so confirm before relying on it.

### A cron Example

```cron
0 4 * * * /usr/local/bin/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

The five fields are minute, hour, day of month, month, and day of week, so `0 4 * * *` means **04:00 every day**. `>> /var/log/mc-backup.log 2>&1` appends both standard output and standard error to the log so you can check exit codes and errors afterwards. **cron provides almost no environment (its `PATH` is very short), so use absolute paths inside the script.** Add a rule under `/etc/logrotate.d/` if you want the log rotated; otherwise it grows forever.

## 4. A Backup Script Skeleton

The bash skeleton below is **ready to adapt**: it quiesces writes, archives the world and configuration, prunes expired archives, rsyncs the result offsite, and logs the outcome.

```bash
#!/usr/bin/env bash
# Offsite backup skeleton. Change the variables for your environment.
set -euo pipefail

SERVER_DIR="/opt/mcserver"                 # server directory (no trailing slash)
BACKUP_ROOT="/srv/backup/mcserver"         # local backup root (ideally a different disk)
LOG_FILE="/var/log/mc-backup.log"
KEEP_DAYS=14                               # how many days of local archives to keep
REMOTE="backup@backup.example.com:/srv/backup/mcserver"   # offsite target

STAMP="$(date +%F_%H%M%S)"
ARCHIVE="${BACKUP_ROOT}/mcserver-${STAMP}.tar.gz"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

# The script logs its own output; the cron redirection is a second safety net
exec >>"${LOG_FILE}" 2>&1
log "=== backup start ${STAMP} ==="

[ -d "${SERVER_DIR}" ] || fail "server directory not found: ${SERVER_DIR}"
mkdir -p "${BACKUP_ROOT}"

# Stopping the server is the safest option. If you cannot stop it, send
# save-all / save-off to the console instead and send save-on after archiving.
START_AFTER=0
if systemctl is-active --quiet minecraft.service; then
    log "stopping minecraft.service for a consistent backup"
    systemctl stop minecraft.service
    START_AFTER=1
fi

tar -czf "${ARCHIVE}" \
    --exclude='logs' \
    --exclude='crash-reports' \
    --exclude='cache' \
    --exclude='libraries' \
    --exclude='versions' \
    --exclude='*.tar.gz' \
    -C "${SERVER_DIR}" .

[ -s "${ARCHIVE}" ] || fail "archive is missing or empty: ${ARCHIVE}"
log "archive created: ${ARCHIVE} ($(du -h "${ARCHIVE}" | cut -f1))"

# Keep the last KEEP_DAYS days of local archives (drop -delete on the first run)
find "${BACKUP_ROOT}" -maxdepth 1 -name 'mcserver-*.tar.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete

# Sync offsite. --delete is deliberately omitted so a local mistake is not mirrored
rsync -aHAX --numeric-ids --info=progress2 "${BACKUP_ROOT}/" "${REMOTE}/"
log "offsite sync finished"

if [ "${START_AFTER}" -eq 1 ]; then
    log "starting minecraft.service again"
    systemctl start minecraft.service
fi

log "=== backup ok ${STAMP} ==="
exit 0
```

### How to Use It

```bash
sudo install -m 750 mc-backup.sh /usr/local/bin/mc-backup.sh
sudo /usr/local/bin/mc-backup.sh
tail -20 /var/log/mc-backup.log
```

Things you need to know:

- `set -euo pipefail` makes the script **abort on the first error**, so you never get "the backup failed but the script kept going and reported success".
- **Stopping the server is the safest approach.** If you cannot, replace `systemctl stop` with `save-all` and `save-off` sent to the console, then `save-on` after archiving (section 2).
- `find ... -mtime "+${KEEP_DAYS}" -delete` **prints before deleting**; on the first run, remove `-delete` and confirm the matched files are the right ones.
- **The offsite sync appends rather than using `--delete`**, because otherwise deleting a local archive by mistake deletes the offsite copy too. If you really want mirroring, make absolutely sure the local deletion logic is correct.
- Adjust the systemd unit name and the `tar` exclusion paths to your layout. **`tar`'s `--exclude` matches paths inside the archive, and its syntax is not identical to rsync's.**
- For grandfather-father-son retention (daily, weekly, monthly), restic's `forget --keep-*` is less error-prone than hand-written `find` rules.

:::warn Think hard before putting `--delete` in a script
`rsync --delete` makes the destination identical to the source. **If the source ever becomes an empty directory because of a permissions problem, a failed mount, or a mistyped path, `--delete` will empty the offsite copy as well.** This is a classic way to lose backups.
:::

## 5. Alternative Tools and When to Use Them

### restic: Deduplication, Encryption, Snapshots

restic writes snapshot-style backups with **built-in deduplication and encryption**, which suits "keep many historical versions without consuming much space".

```bash
# 1. Initialise the repository (once only)
export RESTIC_REPOSITORY="sftp:backup@backup.example.com:/srv/restic/mcserver"
export RESTIC_PASSWORD_FILE="/root/.config/restic/mcserver.pass"
restic init

# 2. Back up
restic -r "${RESTIC_REPOSITORY}" backup /opt/mcserver

# 3. List snapshots
restic snapshots

# 4. Retention: 7 daily and 4 weekly, then free unreferenced data
restic forget --keep-daily 7 --keep-weekly 4 --prune
```

`RESTIC_PASSWORD_FILE` points at a passphrase file with **`chmod 600`**; never put the passphrase in the script itself. `restic forget` only removes snapshot references, so **`--prune` is required to reclaim space**, and pruning takes a long time, so schedule it in a maintenance window. Restore with `restic restore latest --target /tmp/restore-test`. Repositories can live on a local directory, SFTP, S3-compatible storage, and other backends (**check the official documentation for the current backend list**).

### rclone: Cloud Storage Synchronisation

rclone is "rsync for cloud storage" and supports a large number of object storage and consumer cloud backends.

```bash
# 1. Configure a remote interactively, named e.g. myremote
rclone config

# 2. Sync the local directory to the remote (removes extra remote files; mind the direction)
rclone sync /srv/backup/mcserver myremote:mcserver-backup --progress

# 3. Verify that the two sides match
rclone check /srv/backup/mcserver myremote:mcserver-backup
```

`rclone sync` makes the destination **exactly match** the source and deletes extra files there; use `rclone copy` if you only want to add. `rclone check` compares files on both sides (by size and hash by default, **depending on whether the backend supports hashes**). `rclone config` is interactive, but you can also write the configuration file by hand on a headless machine (find its path with `rclone config file`); credentials live in that file, so **tighten it to `chmod 600`**.

### Plain tar and scp

The simplest combination, with no extra dependencies:

```bash
tar -czf /tmp/mcserver-$(date +%F).tar.gz -C /opt/mcserver .
scp /tmp/mcserver-$(date +%F).tar.gz backup@backup.example.com:/srv/backup/
```

This suits **very small data sets backed up infrequently**. Its drawbacks: **a full transfer every time, no deduplication, no encryption beyond the SSH channel, and no verification** - so it stops being practical as soon as the data grows.

### Comparison

| Tool | Deduplication | Encryption | Incremental | Cloud support | Complexity | Best for |
| --- | --- | --- | --- | --- | --- | --- |
| **rsync** | No (space saved via `--link-dest`) | No (relies on the SSH channel) | Yes (per file) | Needs a mount or another tool | Low | An SSH target and a straightforward directory |
| **restic** | **Yes** | **Yes, built in** | Yes (per block) | Many backends (S3, SFTP, and more) | Medium | Many historical versions, and encryption |
| **rclone** | No | Depends on the backend | Yes (per file) | **The widest** | Medium | Consumer cloud or object storage targets |
| **tar + scp** | No | No | No (full copies) | Needs an scp-reachable target | **Lowest** | Small data, occasional backups |

## 6. Encryption and Secret Management

**Offsite copies must be encrypted.** A copy on someone else's storage means handing your data to a third party; a leaked object-storage key, a misconfigured share link, or a compromised cloud account exposes the world directly, along with player IPs, chat logs, and potentially private information.

- **restic encrypts by design**: the repository derives its keys from the passphrase, and **losing the passphrase means the data is gone forever**; **rsync, rclone, and tar+scp do not encrypt content themselves**, so either rely on the transport (SSH, HTTPS) or encrypt first:

```bash
# Encrypt an archive symmetrically with gpg (prompts for a passphrase)
gpg --symmetric --cipher-algo AES256 mcserver-2026-10-04.tar.gz

# Decrypt
gpg --decrypt mcserver-2026-10-04.tar.gz.gpg > mcserver-2026-10-04.tar.gz
```

### Where to Keep the Passphrase

**Never inside the backup repository or the destination storage**, and **never in the same writable directory as the backup script**. Acceptable practice is to **record it in a password manager** (readable by a human) and to **store it on the backup host in a tightly permissioned file** (readable by the script):

```bash
sudo install -d -m 700 -o root -g root /root/.config/restic
sudo sh -c 'printf "%s" "YOUR_PASSPHRASE" > /root/.config/restic/mcserver.pass'
sudo chmod 600 /root/.config/restic/mcserver.pass
sudo chown root:root /root/.config/restic/mcserver.pass
```

**Keep an offline record of the passphrase too** (on paper in a locked drawer, or in a password manager on another device). **An encrypted backup plus a lost passphrase equals total data loss**, and more completely so than leaving it unencrypted. Key files (SSH private keys, rclone configuration) should also be `chmod 600`, and should belong to **a dedicated least-privilege backup account**.

:::warn Encryption is not finished once a password is set
Passphrase strength, passphrase custody, and key rotation all matter. **A weak passphrase written into a script provides roughly zero security.** Note also that **encryption reduces compression** (ciphertext does not compress), so compress first and encrypt afterwards.
:::

## 7. Cloud and Object Storage Targets

| Type | Examples | Characteristics |
| --- | --- | --- |
| Another machine or NAS | A friend's NAS, a second VPS | Cheap and controllable, but you maintain it |
| S3-compatible object storage | Commercial S3-compatible services, self-hosted MinIO | Standard API; restic and rclone support it directly |
| Cold or archive storage | The "archive" and "cold" tiers various providers offer | **Very cheap per gigabyte, slow to retrieve, often billed by retrieval** |
| Consumer cloud drives | The backends rclone supports | Cheap or free, but **rate limited, subject to account closure, and unsuitable as your only copy** |

### Cost Traps to Watch

- **Egress charges**: many object storage services charge **nothing for uploads and a lot for downloads**. Restoring a few hundred gigabytes can cost more than a year of storage. **Read the retrieval and egress pricing before you buy.**
- **Request charges**: on backends that bill per request, many small files add up.
- **Minimum storage duration**: some archive tiers require data to remain for 30, 90, or 180 days, and deleting earlier is billed for the full period anyway.
- **Retrieval latency**: restoring from an archive tier can take hours, which makes it **unsuitable for "I need it back now"**; keep at least one copy that can be restored immediately.

### Lifecycle and Retention Rules

Object storage generally supports **lifecycle rules**, which can move objects older than N days to a cheaper storage class, **delete** objects after N days to implement retention, and clean up incomplete multipart uploads - **the last of these is a common source of hidden charges**. **The exact rule syntax, the storage class names, and the minimum durations differ between providers, so follow each provider's documentation** rather than copying another provider's examples.

## 8. Designing a Retention Policy

### How Many Copies to Keep

| Tier | Typical count | Purpose |
| --- | --- | --- |
| Daily | 7 - 14 | Covers "something broke yesterday or the day before" |
| Weekly | 4 - 8 | Covers problems noticed only weeks later |
| Monthly | 6 - 12 | Long-term reference and slow-onset corruption |
| Yearly | 1 - 3 | Long-term archival |

The principle is **"long enough to cover the time it takes you to notice"**. World corruption is usually **not discovered the same day**, so keep copies for a good while.

### Estimating Disk Space

Let the world size be `W`; compressed it is roughly `0.4W` to `0.7W` (**the ratio depends on content, and region files compress poorly, so measure your own data**).

| Approach | Space used |
| --- | --- |
| Independent `tar.gz` per run, keeping `N` copies | about `N x 0.5W` |
| rsync `--link-dest` hard-link snapshots | about `0.5W + change x (N-1)`; **the change rate is what matters** |
| restic deduplicated snapshots | Same order as hard-link snapshots or better, depending on deduplication granularity |

Example: a 5 GB world with 14 independent archives at a 0.5 compression ratio needs about `14 x 2.5 = 35 GB`. Switch to `--link-dest` snapshots and, if 100 MB changes each day, it needs about `2.5 GB + 13 x 0.1 GB = 3.8 GB`. **The difference is large enough to justify moving to snapshots.**

### Pruning Old Backups Safely

- **Never delete an old backup before verifying that a newer one works.** The order is always: **create the new backup, verify it, confirm it is good, and only then prune the old one.**
- **Keep at least one old but known-good copy** (for corruption that has been present a long time), and **dry-run or print the file list first** so you can confirm what a cleanup would match.
- Prune the offsite side **more conservatively than the local side** (keep more, delete later), because the offsite copy is the last line of defence.

:::warn Automated cleanup is automated deletion
A mistyped `find ... -delete` or `--delete` can wipe out every historical copy in one go. **Run any cleanup logic against a test directory before it goes live, and confirm it cannot match files it should not touch.**
:::

## 9. Maintenance

### A Backup You Have Never Restored Is Not a Backup

This rule cannot be overstated. **A backup script that "succeeds" every day and a backup that can actually be restored are two entirely different claims.** The usual story: the script has been failing for weeks because of permissions, a path, or a full disk and nobody noticed, or the archive it produced is empty, or the encryption passphrase has not worked for months.

### The Quarterly Restore Drill

1. **Pick a copy**: preferably the **offsite copy**, so that the transfer is validated at the same time.
2. **Restore into an isolated test directory**, never over the production directory:

```bash
mkdir -p /tmp/restore-test
tar -xzf /srv/backup/mcserver/mcserver-2026-10-04_040001.tar.gz -C /tmp/restore-test
ls -la /tmp/restore-test
```

3. **Check that key files exist and are non-empty**: `world/level.dat`, `server.properties`, and the configurations under `plugins/`.
4. **Start a test instance on a different port**: copy the test directory, change the ports in `server.properties` (for example `server-port=25566`, `query.port=25566`, `rcon.port=25567`), start it, and watch the log; then connect and check key builds, container contents, player inventories, and permissions, and confirm there are no chunk or world-related errors.
5. **Record the result and clean up**: write down the date, the time taken, and any problems found (**this is the only evidence that your backups work**), then remove the test instance while keeping the record.

:::tip Write the restore procedure down
The day of an incident is not the time to work out how to restore. **Put the commands on a single page in advance**, follow it during the drill, and update it whenever you find a gap.
:::

### Verifying Integrity

| Method | Command | Notes |
| --- | --- | --- |
| restic repository check | `restic check` | Validates repository structure and metadata; adding `--read-data` **reads every data block**, which is slow but thorough |
| List a tar archive | `tar -tzf archive.tar.gz >/dev/null` | Reads and decompresses the listing, which exposes **truncated or damaged archives** |
| Compare checksums | `sha256sum archive.tar.gz` | Compare against the hash recorded at backup time to confirm the transfer was faithful |
| rclone check | `rclone check src dst` | Compares both sides (capability depends on backend hash support) |
| Test extraction | `tar -xzf archive.tar.gz -C /tmp/check` | The most direct verification: does it actually come out |

**Store checksums separately** (a `.sha256` file next to the archive, for example); "verifying a backup with a checksum that lives inside the backup" proves nothing.

### Monitoring That Backups Actually Ran

**Check the exit code** (a cron failure leaves a non-zero code in the log, and a `set -e` script exits early on error), **check the log** (`tail -20 /var/log/mc-backup.log` and confirm the last line is the success marker), and **check the artefacts** (the newest archive is timestamped today and its size is plausible, neither zero bytes nor suspiciously small). More important is **active alerting**: have the script send mail or a message on failure (`mail`, a `curl` webhook, or similar). **Silence does not mean everything is fine**, so prefer **heartbeat monitoring** - report success once a day and alert when a report does not arrive.

### Common Failure Causes

| Symptom | Common cause | Where to look |
| --- | --- | --- |
| Disk full, or a zero-byte archive | The local backup disk filled up, retention never ran | `df -h`, and check the cleanup logic |
| SSH authentication failure | Key replaced, wrong `authorized_keys` permissions, locked account | Run `ssh backup@host 'echo ok'` by hand |
| Host key changed warning | The destination was rebuilt or the IP was reused; `known_hosts` is stale | **Confirm the host's identity first**, then update `known_hosts` |
| Permission denied | The backup account cannot read the source, or cannot write the destination | Check directory ownership and modes; run as root if necessary |
| Expired credentials | Cloud access keys or tokens have expired | Rotate the keys and test again |
| Incomplete archive contents | `save-off` was skipped, or an `--exclude` rule removed something important | List the contents with `tar -tzf` and compare |
| Good data deleted by the sync | A mistyped source path plus `--delete` | Disable the sync immediately and restore from an older copy |
| Wrong encryption passphrase | The passphrase was rotated but the script was not updated, or file permissions changed | Verify by hand with `restic snapshots` |

:::warn Read the error log; do not just check that a file appeared
A file appearing does not mean its contents are correct. **Of archive size, exit code, and checksum, check at least two.**
:::

## 10. Checklist

| Item | Requirement | Frequency |
| --- | --- | --- |
| 3-2-1 coverage | At least three copies, two media, one offsite | Review quarterly |
| Backup scope | World, configuration, player lists, plugins/mods and their configs, start scripts | After any configuration change |
| Consistency | Stop the server, or `save-all` + `save-off`, archive, then `save-on` | Every backup |
| Automation | Scheduled by cron or a systemd timer, with logging | At deployment |
| Encryption | Offsite copies encrypted, passphrase recorded offline | Review quarterly |
| Permissions | Passphrase and private keys `chmod 600`, least-privilege backup account | Review quarterly |
| Retention | Explicit daily/weekly/monthly counts, cleanup logic tested | Review quarterly |
| Space | Enough free space locally and offsite | Weekly |
| Verification | `restic check` / `tar -tzf` / checksum comparison passes | Monthly |
| Monitoring | Failures alert, successes send a heartbeat | At deployment, reviewed monthly |
| Restore drill | Restore to a test directory and start on a different port | **Quarterly** |
| Offsite usability | Confirm you can download and restore, and that egress costs are acceptable | Quarterly |
| Documentation | Restore steps, passphrase location, and target addresses written down | Every six months |

## 11. Summary

- **A backup on the same disk is not a backup**: the copy that saves you must live elsewhere, and preferably cannot be deleted remotely.
- **Consistency beats speed**: never copy while the server is writing.
- **Encrypt, and keep the passphrase offline**: offsite copies must be encrypted, and a lost passphrase loses everything.
- **Test the retention logic**: cleanup is automated deletion, so validate it before it runs for real.
- **Restore once a quarter**: it is the only way to prove the backups work.

Related reading: [Backup and Restore](/tutorials/java/backup) (scope and rollback procedure), [Server Directory Structure](/tutorials/java/structure) (which files to include), [Hosting on a Home PC](/tutorials/ops/home-hosting) (hardware and power risks).

> Commands and configuration are governed by each project's official documentation; object storage pricing, lifecycle rules, and retrieval policies are governed by each provider's documentation.
