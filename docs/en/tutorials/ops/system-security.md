---
title: System Hardening
slug: system-security
cat: ops
level: 3
order: 6
minutes: 16
tags: [hardening, permissions, systemd, updates, backups, audit, ops]
updated: 2026-10-04
draft: false
---

[Network Security Fundamentals](/tutorials/ops/network-security) covers whether outsiders can get in. This article covers the other direction: **assuming someone is already inside — or that you simply made a mistake — how much can this machine take?**

The goal of hardening is not "absolute security", which does not exist. It is to **shrink privileges, reduce entry points and leave traces**, so that one mistake does not become a total compromise.

## 1. Accounts and Privileges

### 1.1 Why You Must Never Run the Server as root

| Risk of running as root | Concrete consequence |
| --- | --- |
| **A single vulnerability becomes a full compromise** | When a flaw in the server, a plugin or a mod is exploited, the attacker inherits root and can edit system files, install backdoors and delete everything |
| **Plugins are third-party code** | A jar you downloaded from a forum runs with the same privileges as the server. **Running as root hands the whole machine to a stranger.** |
| **Mistakes become unrecoverable** | A delete command with a mistyped path costs you the server directory as a normal user; as root it can cost you the operating system |
| **File ownership gets messy** | A `world/` directory, logs or configs created by root cannot be modified by the normal user, so every maintenance task needs `sudo` — and the habit of "just do everything as root" sets in |

:::warn A panel running as root does not mean the server should
Many panels run with elevated privileges for convenience and start the server on your behalf. **That is a matter of trust in the panel and is not a justification for running the server as root.** If the panel lets you specify a run-as user, specify a dedicated one.
:::

### 1.2 Create a Dedicated System User

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
```

| Option | Effect |
| --- | --- |
| `-r` | Creates a **system account** (UID allocated from the system range; normally no password and no expiry) |
| `-m` | Also creates the home directory (`-r` does **not** create it by default, so this must be explicit) |
| `-d /opt/mcserver` | Sets the home directory to `/opt/mcserver` |
| `mcserver` | The user name |

Create the directories and hand over ownership:

```bash
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo chmod 750 /opt/mcserver
```

`chown -R` sets the owner and group for the directory and **everything already inside it** (use `-R` only when recursion is actually needed); `chmod 750` gives the owner read/write/execute, the group read/execute, and everyone else nothing. Confirm the user and directory ownership with `id mcserver` and `ls -ld /opt/mcserver`.

:::tip Stop the service account from logging in
If the account exists only to run the service and never needs an interactive login, disable its shell:

```bash
sudo usermod -s /usr/sbin/nologin mcserver
```

**Note:** `nologin` also blocks conveniences such as `sudo -iu mcserver`. If you still need to switch into the account for maintenance, keep `/bin/bash` and rely on keys and permissions instead, or restore it temporarily when needed. **The path may be `/usr/sbin/nologin` or `/sbin/nologin` depending on the system — check before you change it.**
:::

### 1.3 Use sudo Deliberately

The value of `sudo` is that **every elevation is logged**, and that access can be narrowed to "this user may run these specific commands".

- **Do not run `sudo su -` and stay there.** That discards the record of which command was run by whom and when.
- **Elevate per command**: use `sudo command` rather than keeping an entire session as root.
- **Edit sudoers with `visudo`.** It validates the syntax. Editing `/etc/sudoers` directly means one bad character can lock everyone out of privilege escalation.

```bash
sudo visudo
```

**Preferred approach:** do not edit `/etc/sudoers` itself. Drop a separate fragment into `/etc/sudoers.d/` and edit it with `sudo visudo -f /etc/sudoers.d/mcadmin` so you keep syntax checking. A fragment can be narrowed to specific commands, for example letting one administrator restart the server and nothing else:

```
mcadmin ALL=(root) /usr/bin/systemctl restart minecraft
mcadmin ALL=(root) /usr/bin/systemctl status minecraft
```

**Audit who has sudo access:**

```bash
getent group sudo    # the sudo group on Debian / Ubuntu
getent group wheel   # the wheel group on the RHEL family
sudo grep -rHv '^#\|^$' /etc/sudoers /etc/sudoers.d/
```

:::warn Review on a schedule, not once
**Administrators who left, friends who helped temporarily and test accounts from early on** all stay in the sudo group forever. Review periodically and remove people who no longer need access (`sudo deluser USERNAME sudo`, or `sudo gpasswd -d USERNAME wheel`).
:::

### 1.4 Disable Accounts You Do Not Need

- **List accounts that can log in** (only accounts with a real shell are true entry points):

```bash
awk -F: '$7 !~ /(nologin|false)$/ {print $1, $3, $7}' /etc/passwd
```

- **Lock accounts you no longer need:**

```bash
sudo usermod -L USERNAME                       # lock the password
sudo usermod -s /usr/sbin/nologin USERNAME     # and block login entirely
```

- **Check for extra UID 0 accounts.** There must be exactly one — `root`. Anything else is a backdoor:

```bash
awk -F: '$3 == 0 {print $1}' /etc/passwd
```

## 2. File Permissions: Least Privilege on Disk

### 2.1 Reading Permission Bits

The first column of `ls -l`, such as `-rwxr-x---`, splits into three groups: **owner / group / others**, each three bits (read `r`=4, write `w`=2, execute `x`=1).

| Mode | Numeric | Use |
| --- | --- | --- |
| `rwx------` | `700` | A private directory only the owner uses |
| `rwxr-x---` | `750` | Server root: owner can write, group can enter, others see nothing |
| `rw-r-----` | `640` | Config file the owner writes and the group reads |
| `rw-------` | `600` | **Files containing passwords**, visible only to the owner |
| `rwxrwxrwx` | `777` | **Never, under any circumstances** |

### 2.2 Why `777` Is Dangerous

`chmod -R 777` is the most widely circulated "universal fix" on the internet — reach for it whenever you see `Permission denied`. What it actually means is: **any user on the system, and any compromised service process, may read, modify and delete everything in that directory.**

| Consequence | Explanation |
| --- | --- |
| **Any local account can modify the server** | A compromised low-privilege service (a web application, say) can drop a backdoored jar into `plugins/` that takes effect at the next restart |
| **Password files become world-readable** | The RCON password in `server.properties` and the database password in `.env` are exposed to everyone |
| **World data can be destroyed at will** | Any process can delete `world/` |
| **The real problem stays hidden** | A permission error usually means "the owner is wrong". `777` covers the symptom and leaves the cause in place |

:::warn The fix is correcting ownership, not widening permissions
When you hit `Permission denied`, first ask **who is running and which file is being touched**:

```bash
ls -l /opt/mcserver/survival/server.properties
```

If the owner is `root` while the service runs as `mcserver`, the correct fix is:

```bash
sudo chown mcserver:mcserver /opt/mcserver/survival/server.properties
```

**Not** `chmod 777`. **Recursive permission widening (`chmod -R 777`) is a high-risk operation on a live server. Do not run it.**
:::

### 2.3 Recommended Permissions for the Server Directory

```bash
# The whole server directory belongs to the dedicated user
sudo chown -R mcserver:mcserver /opt/mcserver

# Owner full; group read/enter; others nothing
sudo chmod -R u=rwX,g=rX,o= /opt/mcserver

# The root directory itself gets no access for others
sudo chmod 750 /opt/mcserver
```

`u=rwX,g=rX,o=` is **symbolic mode**: the capital `X` grants execute **only to directories, or to files that already have some execute bit**, which is a better fit than a blanket `-R 755` where files should not be executable. **Do not use `chmod -R 777`, and do not grant `o+w` (world-writable) on the server directory.**

### 2.4 What Deserves Extra Protection

| Item | Why it matters | Recommendation |
| --- | --- | --- |
| `world/`, `world_nether/`, `world_the_end/` | The world is everything players have invested; destruction is irreversible | Owned by `mcserver`, no access for others; **regular offline backups** (see section 5) |
| `server.properties` | Holds the RCON password, ports and `online-mode` | `640`, owned by `mcserver` |
| `.env` and scripts containing passwords | Database passwords, API keys | **`600`**, owner read/write only |
| `ops.json`, `whitelist.json` | Decide who holds administrator power | `640`, and review the contents after every change |
| Private keys (`id_ed25519` and similar) | A leak hands over your login | **`600`**, with the `.ssh` directory at `700` |
| Backup files | Usually contain full credentials and world data | **Never in a web-served directory**; keep one copy offsite |

```bash
# Credential file: owner only
chmod 600 /opt/mcserver/survival/.env
ls -l /opt/mcserver/survival/.env
# Expected: -rw------- 1 mcserver mcserver ... .env
```

:::note Backups change permissions; restore ownership afterwards
Back up with tools that **preserve attributes**, such as `cp -a`, `tar` or `rsync -a`, so ownership and modes survive a restore. If you copy only the contents, the restored files may end up owned by root and the server will be unable to write world data. Check once with `ls -ld` after restoring.
:::

## 3. System Updates

**The overwhelming majority of intrusions exploit a vulnerability that was already patched upstream but never patched on your machine.** Staying current is the highest-value hardening measure there is.

### 3.1 The Concept of Automated Security Updates

The idea is simple: **install security patches automatically and decide on everything else yourself.**

| Distribution | Tool | Configuration files |
| --- | --- | --- |
| Ubuntu / Debian | `unattended-upgrades` | `/etc/apt/apt.conf.d/20auto-upgrades`, `/etc/apt/apt.conf.d/50unattended-upgrades` |
| RHEL / Rocky / AlmaLinux / Fedora | `dnf-automatic` | `/etc/dnf/automatic.conf` |

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Typical contents of `20auto-upgrades`:

```ini
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

- `Update-Package-Lists "1"`: refresh the package index once a day.
- `Unattended-Upgrade "1"`: install matching upgrades once a day (**by default this covers security updates only**; the exact scope comes from `Unattended-Upgrade::Allowed-Origins` in `50unattended-upgrades`).

**RHEL family:**

```bash
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer
```

Common settings in `/etc/dnf/automatic.conf` for "security updates only, applied automatically":

```ini
[commands]
upgrade_type = security
apply_updates = yes
```

**Verify that it is running** with `systemctl status unattended-upgrades` (Debian / Ubuntu) or `systemctl status dnf-automatic.timer` (RHEL family).

:::warn Configuration keys and defaults vary by version
The snippets above are common forms. **File names, option names and default scope differ between distributions and versions** (for example, whether non-security updates are included, or whether old kernels are removed automatically). Check the documentation for your version before changing anything, and confirm with `systemctl status` that the service is really running. **Configured does not mean in effect.**
:::

### 3.2 Do Not Auto-Reboot Blindly

Installing a patch and rebooting are two separate things. Updates to the kernel, glibc or systemd **only take effect after a restart**. **Do not enable unconditional automatic reboots**, for these reasons:

- **Players are online.** A reboot in the middle of the night disconnects them, may lose progress, and can trigger world-file problems.
- **A failed reboot means extended downtime.** If the new kernel is incompatible with your drivers or environment, the machine may not come back, and you may not notice until the next day.
- **The server does not necessarily restart by itself.** That depends on whether the service is `enable`d (see section 4).

**Recommended approach:**

| Practice | Notes |
| --- | --- |
| **Maintenance window** | Pick a fixed low-population slot (Tuesday at 04:00, for instance), announce it in advance and reboot manually |
| **Announce before rebooting** | Broadcast a countdown in-game so players can log off safely |
| **Keep old kernels** | Do not auto-remove previous kernels; they are your rollback path |
| **Verify immediately after** | Is the service running, are the ports reachable, is the log clean |

Check whether a restart is pending with `[ -f /var/run/reboot-required ] && cat /var/run/reboot-required` (Debian / Ubuntu) or `sudo dnf needs-restarting -r` (RHEL family).
:::tip Reboot once, on purpose, to prove it comes back
Reboot the machine manually **while no players are online** and confirm that "start on boot" genuinely works. **Unverified auto-start is the same as no auto-start.**
:::

## 4. Service Hardening with systemd

### 4.1 A Basic Unit

`/etc/systemd/system/minecraft.service`:

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
Type=simple
User=mcserver
Group=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

| Directive | Effect |
| --- | --- |
| `User=` / `Group=` | **Runs the service as the dedicated user.** Omit it and the service runs as root — the most common hardening hole there is. |
| `WorkingDirectory=` | The server's working directory. Relative paths (`world/`, `plugins/`) resolve against it. |
| `ExecStart=` | The start command. **Use absolute paths**; systemd does not resolve `PATH`. |
| `Restart=on-failure` | Restart after an abnormal exit. A clean `stop` does not trigger it. |
| `RestartSec=10` | Wait 10 seconds before restarting, so a crash loop does not flood the logs. |

Apply it with `sudo systemctl daemon-reload`, then `sudo systemctl enable --now minecraft` and check it with `sudo systemctl status minecraft`.

:::note The existing tutorial uses screen in its unit
The example in [Environment Setup](/tutorials/java/environment) uses `screen` to keep a console you can type into. **Both approaches are valid**; the example here runs the Java process directly, which composes more cleanly with the hardening options below. **Note that combining `screen` with options such as `ProtectSystem=strict` requires the socket directory `screen` uses to remain writable.**
:::

### 4.2 Resource Limits

Limits protect both against "a memory leak takes down the whole machine" and against "an attack saturates the box".

```ini
[Service]
LimitNOFILE=65535
MemoryMax=6G
```

| Directive | Effect | Notes |
| --- | --- | --- |
| `LimitNOFILE` | Cap on open file descriptors | With many players and loaded chunks the default may be too low, showing up as "connection refused" or inexplicable IO errors |
| `MemoryMax` | **Hard memory ceiling** for the service | Exceeding it means the kernel OOM-kills the process. **It must be clearly larger than `-Xmx`**, because the JVM itself, metaspace, thread stacks and direct memory all live outside the heap |

:::warn Setting `MemoryMax` below `-Xmx` is a classic mistake
`-Xmx4G` limits the Java heap only. A Minecraft server with a 4G heap **commonly has a resident set above 5G**. Set `MemoryMax=4G` and the service will be killed and restarted repeatedly, while the logs show nothing but "the process disappeared".

**Recommendation:** leave at least 30% headroom (for example `-Xmx4G` with `MemoryMax=6G`), and watch actual usage in `systemctl status` before tuning further.
:::

### 4.3 Restricting Privileges and Protecting the Filesystem

These directives let the service **touch only what it should**. Even if the server or a plugin is compromised, the damage an attacker can do is bounded.

```ini
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/mcserver/survival
```

| Directive | Effect |
| --- | --- |
| `NoNewPrivileges=yes` | Stops the process from gaining privileges through setuid / setgid binaries. **Almost free of side effects; add it everywhere.** |
| `PrivateTmp=yes` | Gives the service a **private `/tmp` and `/var/tmp`**, isolated from other processes' temporary files |
| `ProtectSystem=strict` | Mounts the **entire filesystem read-only** (except `/dev`, `/proc` and `/sys`). The service can write only to paths listed in `ReadWritePaths` |
| `ProtectHome=yes` | Makes `/home`, `/root` and `/run/user` **invisible** to the service (they appear as empty directories) |
| `ReadWritePaths=` | Works with `ProtectSystem=strict` to **list the paths that may be written**. **Without it, the server cannot even save world data.** |

:::warn If the service fails to start after adding `ProtectSystem=strict`, look here first
Common causes:

1. **`ReadWritePaths` is missing or wrong.** It must be an absolute path and must match `WorkingDirectory`.
2. **A backup script or plugin writes elsewhere** (such as `/var/log` or `/srv`); add those paths too.
3. **Java needs a writable temporary directory.** `PrivateTmp=yes` usually covers it, but if the server explicitly configures a fixed temp path, add that as well.

**How to diagnose:** `sudo systemctl status minecraft` and `sudo journalctl -u minecraft -n 100` name the exact path that was denied.
:::

:::note Availability of hardening options depends on the systemd version
These directives exist on reasonably recent systemd releases, but **exact support varies by version**. `systemd-analyze security minecraft.service` shows the sandbox settings actually in effect: an exposure score plus a per-item explanation. Score scales and item names differ between versions, so **rely on the output on your own system**.
:::

## 5. Backups Are a Security Control

The sections above defend against "the system is taken over". Two further threats **cannot be stopped by any amount of hardening**:

| Threat | How it shows up |
| --- | --- |
| **Ransomware** | Encrypts every file it can reach. **A backup mounted on the same machine gets encrypted along with everything else.** |
| **Insider sabotage or plain mistakes** | An administrator or plugin runs one `rm -rf`, or a malicious "collaborator" wipes the data and leaves |

**Conclusion: backups are not only about hardware failure. They are the only defence against extortion and sabotage — provided the backup is somewhere the attacker cannot reach.**

| Principle | Practice |
| --- | --- |
| **Offline** | Keep at least one copy on media that is normally unmounted and not networked (an external drive, a provider snapshot) |
| **Offsite** | If the local disk dies or the datacenter has an incident, a local-only backup disappears with it |
| **Versioned** | Keeping only the newest copy fails exactly when the world was already broken and nobody noticed |
| **Restricted** | Backup files usually contain full credentials and world data: **never in a web-served directory**, with permissions tightened as in section 2 |

For the operational details (consistent snapshots, `save-off` / `save-on`, retention policy, restore procedure) see [Backup and Restore](/tutorials/java/backup). **A backup you have never restored is not a backup.**

:::warn Do not let the server write to the backup directory
If the server process — or a plugin it loads — can write to the backup directory, then one compromised plugin can **delete or encrypt every backup you have**. Keep the backup directory outside the server directory and **do not grant the service account write access to it**.
:::

## 6. Auditing and Routine Hygiene

Hardening is not a one-off task. Run the checks below **on a schedule**, or after any change to the system.

### 6.1 Checklist and Commands

| Check | Command | Expected result |
| --- | --- | --- |
| **Listening TCP ports** | `sudo ss -tlnp` | Only services you know about; investigate anything unfamiliar |
| **Listening UDP ports** | `sudo ss -ulnp` | The same (Bedrock / Geyser use UDP) |
| **Failed logins** | `sudo lastb \| head` | Many entries mean brute forcing (requires root; not recorded by default everywhere) |
| **Successful logins** | `last -n 20` | No user or source IP you do not recognise |
| **UID 0 accounts** | `awk -F: '$3 == 0 {print $1}' /etc/passwd` | `root` and nothing else |
| **Login-capable accounts** | `awk -F: '$7 !~ /(nologin\|false)$/ {print $1, $7}' /etc/passwd` | Only people you know |
| **sudo access** | `getent group sudo` / `getent group wheel` | No departed or temporary accounts |
| **Scheduled tasks** | `sudo crontab -l`, `ls -l /etc/cron.*`, `systemctl list-timers --all` | No job you did not create |
| **systemd units** | `systemctl list-units --type=service --state=running` | No unfamiliar services |
| **Unused packages** | `sudo apt autoremove --dry-run` / `sudo dnf autoremove` | Confirm the removals really are unused |
| **Sandbox score** | `systemd-analyze security minecraft.service` | Lower is better; read the per-item suggestions |

:::warn Take unfamiliar entries seriously
- **A cron job or systemd unit you did not create** may be a persistence backdoor, or may ship with a package — **establish where it came from before deleting it**.
- **An unfamiliar listening port**: find the PID with `sudo ss -tlnp`, then inspect it with `ps -p PID -o pid,user,cmd`.
- **An unfamiliar account**: do not delete it immediately. Check its home directory, `authorized_keys` and login history first to judge whether it has already been used.
:::

### 6.2 Minimise the Installed Surface

**The less software you install, the fewer vulnerabilities exist to be exploited.**

- **Do not install a desktop environment.** On a cloud server it brings a large number of unnecessary services and ports (see [Choosing an Operating System](/tutorials/java/os)).
- **Do not install services you will not use**: FTP, Samba, printing services, or a database the server does not need.
- **Check service state**: a service you do not need should be `disable`d and `stop`ped, not merely "installed but not started" — a dependency chain can pull it up. Use `systemctl is-enabled SERVICE` to check and `sudo systemctl disable --now SERVICE` to stop and disable it.

### 6.3 One-Page Summary

- [ ] The server runs as a **dedicated user**, never root (confirm with `ps -o user,cmd -C java` or `systemctl status`)
- [ ] Server directory ownership is correct and **nothing is `777`**
- [ ] Files containing passwords are mode **600**, outside web directories and outside the Git repository
- [ ] Automated security updates are enabled and **confirmed running**, with unconditional automatic reboots **off**
- [ ] The systemd unit sets `User=`, `WorkingDirectory=` and `Restart=`
- [ ] `LimitNOFILE` is configured and `MemoryMax` is **clearly above** `-Xmx`
- [ ] `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem` and `ReadWritePaths` are enabled as appropriate
- [ ] The machine has been rebooted once to confirm the **service starts on boot**
- [ ] **Offline / offsite** backups exist and the service account **cannot write** to the backup directory
- [ ] The audit commands above are scheduled for periodic review
- [ ] The machine has been rebooted once to confirm the **service starts on boot**
- [ ] **Offline / offsite** backups exist and the service account **cannot write** to the backup directory
- [ ] Periodic review of listening ports, failed logins, sudo membership, cron jobs and systemd units

## Next Steps

- Network-layer protection (ports, firewalls, SSH): see [Network Security Fundamentals](/tutorials/ops/network-security)
- Backup and restore in practice: see [Backup and Restore](/tutorials/java/backup)
- Server-side and plugin security: see [[JAVA] Security Plugins](/tutorials/ops/security-java) and [[BE] Security Plugins](/tutorials/ops/security-be)
- Anti-griefing and logging: see [Anti-Cheat and Anti-Griefing](/tutorials/java/anticheat)

---

> Commands and configuration follow each project's official documentation. Package names, service names, systemd versions and configuration defaults differ between distributions; rely on the actual output on your own system.
