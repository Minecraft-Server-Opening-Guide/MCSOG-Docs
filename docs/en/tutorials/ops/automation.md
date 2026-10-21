---
title: Automated Operations
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [automation, backup-scripts, systemd, cron, ansible, ci-cd, ops]
updated: 2026-10-04
draft: false
---

The goal of automated operations is not to look professional. It is to **turn repeated actions into actions that cannot be forgotten and cannot be done wrong**. When a Minecraft server breaks, the cause is usually not that the technology was too hard, but that someone forgot the task, missed a step, or did it by hand at three in the morning.

This page covers handing backups, restarts, updates, log cleanup, and health checks to scripts and timers, and **which tasks must not be handed over**. Related reading: [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup) for backup strategy, [Analysing Server Performance with spark](/tutorials/ops/spark) for lag, [Updating the Server Core, Plugins and MCDR](/tutorials/ops/updates) for the update process, and [Monitoring and Alerting](/tutorials/ops/monitoring) for alerts.

:::warn Commands and configuration follow the official documentation for your system and software
The **package names, paths, users and groups, service names, module arguments, and systemd options** below all change with **distribution, software version, and install method**. The examples show what to write and why, and are **not something to copy and paste unchanged**. Before applying anything, check the documentation for your distribution, the official documentation for your server software and plugins, and the official manuals for Ansible, systemd, and cron (`man 5 crontab`, `man systemd.timer`, `man systemd.service`).
:::

## 1. What to automate first

The test is simple: **is this something you have to do again on a schedule?** If yes, it is worth automating. If not, leave it alone for now.

| Task | Frequency | How to automate | Risk |
| --- | --- | --- | --- |
| World and configuration backups | Daily / every 6 hours | cron or a systemd timer plus a script | Low, but **an unverified backup is not a backup** |
| Offsite sync | Daily | `rsync` over SSH keys | Medium (the target fills up or gets overwritten) |
| Scheduled restarts | Daily / weekly | cron or a systemd timer | Low, but **a restart is not a fix for lag** |
| Log cleanup and rotation | Daily / weekly | `logrotate` or a script | Medium (deleting the wrong directory is irreversible) |
| Health checks and self-healing | Every minute / 5 minutes | Script, timer, and alerting | Medium (**repeated restarts hide the real problem**) |
| Update checks (notification only) | Daily | Script plus notification | Low |
| Update execution (with rollback) | Human-triggered | Script plus human confirmation | **High** (it changes binaries and configuration) |
| Plugin upgrades | Manual | Test on a staging server first | **High** (config formats and dependencies change) |
| Game version upgrades | Manual | Follow the official upgrade notes | **Highest** (world format changes may be one-way) |
| Deleting worlds, wiping player data, resetting the map | Never automatic | Human execution only | **Irreversible** |

The conclusion: **automation pays off on low-risk, high-frequency, purely mechanical actions.** The riskier an action is, the more you should automate the checking, preparing, verifying, and rolling back around it, rather than the action itself.

## 2. What not to automate blindly

**Game version upgrades.** A major version upgrade often brings a **one-way conversion of world data**. Once the new version has opened and saved the world, going back to the old version is usually no longer possible. A human must confirm this, **after a backup and after testing on a copy**.

**Untested plugin upgrades.** Plugin dependencies (the common ones being Vault, PlaceholderAPI, ProtocolLib, and LuckPerms) and configuration formats change between versions. The typical outcome of automatic upgrading: it finishes overnight, players cannot join in the morning, and you do not know which plugin did it.

**Anything irreversible.** Deleting, overwriting, wiping, migrating, `rm -rf`, a database `DROP`. A script may **prepare** these actions (list what would be deleted, generate a list to confirm), but a timer should never **execute** them.

**Scripts you have not read.** Copying a shell script you do not understand from the internet and running it as root on a timer is planting a mine with an unknown trigger.

:::warn Automated mistakes scale with frequency
A human mistake affects one run. An automated mistake **repeats at its scheduled frequency**: a cleanup script pointing at the wrong directory deletes once a day, and a health check with an inverted condition restarts the server once a minute. **Run a new script read-only for long enough to confirm its judgement is right before you give it write access.**
:::

## 3. Script hygiene

The difference between a good and a bad operations script is not the feature list. It is **whether you can tell what happened when it goes wrong**.

### 3.1 The first three things

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **Shebang**: `#!/usr/bin/env bash` is more portable than `#!/bin/bash` because it looks up bash on `PATH`. Note that `sh` does not guarantee the bash syntax used below, so do not write `#!/bin/sh`.
- **`set -e`**: exit as soon as a command fails, instead of carrying on after a failed step.
- **`set -u`**: error out on an undefined variable. One of the most dangerous bugs in operations scripting is an empty variable turning `rm -rf "$DIR/"` into `rm -rf /`.
- **`set -o pipefail`**: a pipeline fails if any stage fails. Without it, an error from `tar` in `tar ... | gzip ...` can be reported as success.

### 3.2 Logging, exit codes, and idempotency

**Log with timestamps; do not just use `echo`.** A log line without a timestamp is nearly useless during an incident, because you cannot tell whether "backup failed" was today or last week.

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

If systemd runs the script, you can let `journalctl` add timestamps and rotation instead, **but do not mix both approaches** or the log becomes hard to read.

**Make exit codes meaningful.** `0` means success; anything else is a failure, and **different failures should have different codes** so that an alert carries information: `1` generic error, `2` usage error, `3` missing dependency, `4` lock held (a previous run is still going), `5` data validation failed.

**Idempotency**: an idempotent script can run repeatedly with the same result, which is the most important property in automation. Use `mkdir -p` rather than `mkdir`, write files in place rather than appending (except logs), and check before acting rather than assuming the state is ready. **A script that is not idempotent destroys data when it is retried**, and retries are normal: the machine reboots, cron catches up, or you run it by hand a second time.

### 3.3 Quoting, `--dry-run`, and version control

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

Always write `"$VAR"` rather than `$VAR`, or a path containing spaces is split into several arguments. `${VAR:?message}` **aborts with an error** when the variable is empty or unset, which is the cheapest possible protection against deleting the wrong thing. A mode that prints instead of executing is the cheapest safety measure there is.

**Keep scripts in version control.** The reason is not tidiness: you can see **what changed last time** and when the trouble started, deleted files can be recovered, and several servers can share one script instead of drifting into three slightly different versions. The repository should hold the scripts, systemd units, cron fragments, Ansible playbooks, and a README describing the dependencies, **but never secrets** (see section 9).

## 4. A complete backup script

The script below uses every principle above: **a lock file against overlapping runs, RCON to stop world writes, dated archives, verification, retention pruning, and an offsite sync**.

```bash
#!/usr/bin/env bash
set -euo pipefail
# Minecraft server backup script (Linux). Usage: ./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # empty means do not use RCON
OFFSITE_TARGET=""                           # e.g. backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# Preflight checks
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "missing command: $cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "server directory not found: $SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "RCON is configured but mcrcon was not found" 3
fi
# Lock: stop a second run overlapping the first
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "cannot create lock file: $LOCK" 3
if ! flock -n 9; then log WARN "a previous backup is still running, skipping"; exit 4; fi
# Whatever happens, put world writing back
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on failed, confirm that world writing is re-enabled"
  fi
}
trap cleanup EXIT
log INFO "backup starting: ${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"
# 1) Stop automatic saving (RCON preferred; without it you can send commands through
#    screen, e.g. screen -S minecraft -p 0 -X stuff 'save-off\n', then send save-on)
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "save-off and save-all flush issued"; sleep 5
  else
    log WARN "RCON unavailable, skipping save-off and continuing"
  fi
else
  log WARN "no RCON configured, skipping save-off"
fi
# 2) Verify the world directories exist so we cannot archive an empty set
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "skipping missing directory: ${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "no world directory exists, aborting" 5
# 3) Archive (use pigz when available)
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) Verify the archive is readable: this decides whether a backup exists
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "archive verification failed: $TARBALL" 5
  log INFO "archive verified: $(du -h "$TARBALL" | cut -f1)"
fi
# 5) Retention pruning and a free-space floor
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "free space ${FREE_GB}G is below ${MIN_FREE_GB}G"
# 6) Offsite sync (rsync returns non-zero on failure, which set -e surfaces)
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "syncing offsite: ${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "backup finished: ${TARBALL}"
```

Why these choices matter: **`flock -n 9`** skips the run when the previous one is still going, instead of running two backups at once and saturating disk and I/O. **`trap cleanup EXIT`** tries to restore `save-on` however the script exits, because otherwise **the server silently stops writing to disk**, which is a very quiet failure. **`sleep 5` after `save-all flush`** gives the server time to flush loaded chunks before the copy starts. **`tar -tzf` verification** is the only real test of whether a backup is usable. **`--delete-after`** keeps the offsite copy in step while deleting old files only after a successful transfer, so a failed transfer cannot empty the remote. **`${STATE_DIRECTORY:-/run/lock}`** works with systemd's `StateDirectory=` (section 4.2) and falls back to `/run/lock` when run by hand.

:::tip Practise a restore now and then
A script that succeeds every day does not prove the backup is usable. Every so often, **actually extract an archive and start the server from it** on a test machine or in a temporary directory. See [Backup and Restore](/tutorials/java/backup) for the restore process and [Offsite Backup](/tutorials/ops/offsite-backup) for why the remote copy matters.
:::

### 4.1 The matching cron line

```ini
# /etc/cron.d/mc-backup
# min hour day month weekday   user        command
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**cron's environment is nothing like your login shell**: `PATH` is short and `HOME` may not be what you expect, so set `SHELL` and `PATH` explicitly in the crontab and use absolute paths inside the script. **Redirect with `>> log 2>&1`**, or output goes to mail (which many machines do not have, making it a black hole). Files in `/etc/cron.d/` **need a user field**, while `crontab -e` writes the current user's table and **has no user field**; mixing these up is the most common cron syntax error. And **cron never catches up on missed runs**: if the machine is off at 04:30, that backup simply does not happen.

### 4.2 The equivalent systemd timer and service

```ini
# /etc/systemd/system/mc-backup.service
[Unit]
Description=Minecraft world backup
After=network-online.target

[Service]
Type=oneshot
User=minecraft
Group=minecraft
StateDirectory=mcbackup
StateDirectoryMode=0750
# The script reads the server directory and writes the backup directory
ReadWritePaths=/srv/minecraft/server /srv/backups/mc
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ExecStart=/opt/mc-ops/mc-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/mc-backup.timer
[Unit]
Description=Run Minecraft world backup every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:30:00
# Run a missed backup after boot
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mc-backup.timer
systemctl list-timers mc-backup.timer
journalctl -u mc-backup.service -n 50 --no-pager
```

Two easy traps: **`OnCalendar` uses English abbreviations for weekdays and months** (`Mon`, `Sun`, `Jan`) and interprets times in the local time zone, so changing the zone moves the trigger (see `man systemd.time`); and **`ProtectSystem=strict` mounts the whole filesystem read-only**, leaving writable only `StateDirectory`, `CacheDirectory`, `LogsDirectory`, `RuntimeDirectory`, and anything listed in `ReadWritePaths`. If the script must write elsewhere, add that path, or you will see the classic "the permissions look right but it cannot write".

:::tip cron or a systemd timer
For "run a script once a day", either works: pick the one you know better. If you want **collected logs, catch-up after boot, resource limits, and retries**, use a systemd timer. If you want **the same behaviour across distributions** (including BSD and containers), cron is more portable.
:::

## 5. Scheduled restarts

Scheduled restarts are routine on many servers, but be clear about one thing first: **a restart is not a fix for lag.** What a restart addresses is a slow memory leak, temporary state that accumulates over long uptimes, and the occasional plugin quirk. What it does not address is low TPS, slow chunk loading, or players reporting stutter; find the cause instead, as described in [Analysing Server Performance with spark](/tutorials/ops/spark). And "it crashes once a day so we restart once a day" means **the real fault is never discovered**.

If a scheduled restart is genuinely wanted, the process must include an announcement:

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # reading it from a restricted file or the environment is safer
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say The server restarts in 5 minutes, please finish up"
sleep 240
rcon "say The server restarts in 1 minute"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "restarting ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# File one: /etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# File two: /etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

If you use a panel (Pterodactyl, AMP, MCSManager, and similar), **prefer the panel's own scheduled restart**, because the panel knows how to stop the process gracefully; killing a panel-managed process from a script can leave the panel's state wrong. See [Server Panels](/tutorials/ops/panels) for a comparison.

:::warn Do not stop the server with kill -9
Force-killing the process can leave the world **unsaved**, or interrupt a write halfway through. The correct order is always: `save-all flush`, then a normal stop (the `stop` command or `systemctl stop`), then wait for the process to exit. Only consider a forced kill when the process is truly hung, and **check the world for damage afterwards**.
:::

## 6. How to automate updates safely

Updates are the highest-risk category. The workable approach is to **automate the preparation and verification and leave execution to a human**: check for a new version (automatic, notification only), download into `staging/` (automatic, **never overwriting the running jar**), verify the official hash (automatic), back up and confirm the archive is readable (automatic), swap (after human confirmation, keeping the old jar renamed), restart and verify the port, logs, and plugin loading, and roll back to the old jar with an **alert** on failure.

A checker that only checks and downloads is the most valuable automation of all, because it cannot break anything:

```bash
#!/usr/bin/env bash
set -euo pipefail
# Check and download only: no swapping, no restarting
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # replace with the official URL
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # replace with the official checksum
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) Download into the staging directory
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) Verify against the published hash
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "checksum mismatch, discarding the download"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) Compare with the running version and only report
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "already up to date"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "new version staged, waiting for human confirmation before the swap"
fi
```

**The key principle: automation prepares and reports; a human presses the button that swaps and restarts.** Full update and rollback detail, including plugins, mods, and MCDR, is in [Updating the Server Core, Plugins and MCDR](/tutorials/ops/updates).

## 7. Health-check driven automation

A health check is valuable because it **finds trouble before players do**. Judge on objective signals: is the process running (`systemctl is-active`, though a live process is not the same as a usable service); is the port listening (`nc -z` or `ss -ltn`, the fastest availability check); does it still answer commands (an RCON query, which shows the main thread is not completely stuck); TPS and MSPT (**commands differ between server software**, so check the official documentation); and disk and memory (better suited to alerting than to automatic restarts).

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # e.g. /opt/mc-ops/notify.sh, called with one message argument
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# Cooldown: avoid a crash-restart loop
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "in cooldown, skipping the restart"; exit 0; fi
fi
# 1) Port check (3 second timeout)
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "port ${PORT} is not answering"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "restart failed, human attention required"; exit 1; fi
  exit 0
fi
# 2) TPS check (needs RCON and a server that supports the command)
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} is below the threshold ${MIN_TPS} (analyse with spark, do not just restart)"
  fi
fi
log INFO "health check passed"
```

```ini
# /etc/systemd/system/mc-health.timer
[Unit]
Description=Check Minecraft server health every 2 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
```

:::warn Repeated restarts hide the real problem
If your health check restarts the server once a day, what you have is not a stable server but **one that crashes daily without anyone knowing**. A script that restarts automatically **must alert at the same time**, and the cooldown must be long enough. If it keeps triggering, **turn the automatic restart off and investigate by hand**.
:::

For metric collection, thresholds, and alert channels in full, see [Monitoring and Alerting](/tutorials/ops/monitoring).

## 8. Configuration management: Ansible concepts and a minimal example

Once you run more than one server, "log in and edit it by hand" starts to drift: three machines slowly diverge and you no longer know which one is correct. Configuration management tools (Ansible, Salt, Puppet, Chef) exist to solve exactly that: **write the desired state of a machine into a file, keep it in version control, and let the tool converge the machine towards it.** Ansible has the lowest barrier because it **needs only SSH and Python and installs no agent on the managed host**.

```ini
# inventory.ini
[mcservers]
mc1.example.com ansible_user=deploy
mc2.example.com ansible_user=deploy

[mcservers:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# playbook.yml
---
- name: Provision a Minecraft host
  hosts: mcservers
  become: true
  vars:
    mc_user: minecraft
    mc_group: minecraft
    mc_home: /srv/minecraft
    # Distribution differences: Debian/Ubuntu usually use openjdk-21-jre-headless,
    # RHEL-family systems usually use java-21-openjdk-headless. Verify for yours.
    java_package: openjdk-21-jre-headless
  tasks:
    - name: Install a Java runtime
      ansible.builtin.package:
        name: "{{ java_package }}"
        state: present
    - name: Create the service user and group
      ansible.builtin.user:
        name: "{{ mc_user }}"
        group: "{{ mc_group }}"
        home: "{{ mc_home }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: true
        state: present
    - name: Deploy the systemd unit
      ansible.builtin.template:
        src: templates/minecraft.service.j2
        dest: /etc/systemd/system/minecraft.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart the server
  handlers:
    - name: Reload systemd and restart the server
      ansible.builtin.systemd:
        name: minecraft.service
        daemon_reload: true
        state: restarted
```

Run it with a syntax-and-diff check first:

```bash
ansible-playbook -i inventory.ini playbook.yml --check --diff
ansible-playbook -i inventory.ini playbook.yml
```

:::warn Check module arguments against the Ansible documentation
The **argument names, accepted values, and behaviour of every module above** (`package`, `user`, `template`, `systemd`) change between Ansible versions, and modules are renamed or moved into collections over time. **Copying an example verbatim is a common cause of incidents**: run it with `--check` first (report only, change nothing), then confirm each argument against the official Ansible documentation.
:::

Three lessons: **manage configuration before you manage deployment** (putting `server.properties`, plugin configuration, and systemd units into version control is worth far more than having Ansible download a jar); **`--check` is your friend** (always run `--check --diff` first); and **secrets stay out of the repository** (use `ansible-vault` or environment variables for passwords, tokens, and RCON passwords).

## 9. CI/CD concepts, and why secrets never belong in the repository

The most valuable use of CI/CD for a Minecraft server is not automatic deployment but **automatic checking**. A practical setup is to keep server configuration in a Git repository and have the pipeline do three things on every commit: **syntax linting, structural parsing, and static analysis of the scripts**.

```yaml
# .github/workflows/validate.yml
name: Validate server configuration
on:
  push:
    branches: [main]
  pull_request:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v4
      - name: Lint YAML configuration
        run: |
          pip install --disable-pip-version-check yamllint
          yamllint -c .yamllint.yml config/
      - name: Parse YAML and TOML files
        run: |
          python3 - <<'PY'
          import pathlib, sys, tomllib, yaml
          parsers = {"*.yml": yaml.safe_load, "*.toml": tomllib.loads}
          failed = False
          for pattern, parse in parsers.items():
              for path in sorted(pathlib.Path("config").rglob(pattern)):
                  try:
                      parse(path.read_text(encoding="utf-8"))
                  except Exception as exc:
                      failed = True
                      print(f"{path}: {exc}")
          sys.exit(1 if failed else 0)
          PY
      - name: ShellCheck the operations scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck -x scripts/*.sh
```

:::note Version difference: `tomllib` needs Python 3.11 or newer
`tomllib` only entered the standard library in Python 3.11. On older versions, install `tomli` and use `import tomli as tomllib`. Check this against the runtime you actually use.
:::

**Be careful with the "sync to the server" step.** A workable order is: CI only **validates and packages**, deployment is triggered by a human, and a backup runs before every deployment. **Do not let every commit restart the production server.**

**Never commit passwords, tokens, RCON passwords, or SSH private keys.** Three concrete consequences: **Git history keeps them forever** (deleting the file does not help, because older commits and everyone who cloned the repository still have it; removing it properly means rewriting history and **rotating every leaked credential**); **public repositories are scanned automatically** (people crawl public repositories specifically for keys, and the gap between a commit and abuse can be minutes); and **it spreads with the repository** (every clone, every fork, and every CI log may hold a copy).

| Situation | What to do |
| --- | --- |
| CI needs a secret | Use the platform's secret store (for example GitHub Actions repository secrets) and inject it through an environment variable |
| The server needs a secret | Keep it in a permission-restricted file (`chmod 600`, owned by the service user) or use systemd's `EnvironmentFile=` |
| Ansible needs a secret | Encrypt with `ansible-vault`, or read it from the environment |
| Local development | `.gitignore` the real configuration and keep only `.example` templates in the repository |

**Run a secret scanner (such as gitleaks or trufflehog) over the whole Git history before you go public.** It is far cheaper than cleaning up afterwards.

## 10. A sensible order of adoption

Do not automate everything at once. Work from low risk and high value downwards: **write the backup script and verify one restore** (section 4), **put the backup on a timer** and confirm the logs show both success and failure, **add health checks and alerting** (section 7) with alerting only at first, **add log cleanup and rotation** to keep disk usage under control, **put the scripts and configuration into Git** (sections 3.3 and 9), and **only then consider automatic updates**, and only as far as download, verify, and notify (section 6).

:::warn An automated destructive action without a backup is the standard way to lose a world
A cleanup script pointing at the wrong directory, an `rsync --delete` running in the wrong direction, an update script overwriting the world files: what these incidents have in common is that **no usable backup existed before they happened**. **Any automation that deletes, overwrites, or moves data must first confirm that a backup exists and can be restored.** If you cannot do that, do not let it run automatically. A lost world usually cannot be recovered; a script can be rewritten.
:::

## Next steps

- Backup strategy and the restore process: [Backup and Restore](/tutorials/java/backup)
- How to keep an offsite copy: [Offsite Backup](/tutorials/ops/offsite-backup)
- Metrics, thresholds, and alert channels: [Monitoring and Alerting](/tutorials/ops/monitoring)
- Finding the cause of lag instead of restarting: [Analysing Server Performance with spark](/tutorials/ops/spark)
- The full update and rollback process: [Updating the Server Core, Plugins and MCDR](/tutorials/ops/updates)
- Built-in scheduling in panels: [Server Panels](/tutorials/ops/panels)

---

> Scripts and configuration are governed by the official documentation for your own system and software.
