---
title: Network Security Fundamentals
slug: network-security
cat: ops
level: 3
order: 5
minutes: 16
tags: [network-security, firewall, ssh, ddos, secrets, hardening, ops]
updated: 2026-10-04
draft: false
---

The moment your server is reachable, it is also **scannable**. From day one, your public IP address is probed repeatedly by port scanners, credential-stuffing scripts and broad, indiscriminate attack tooling. **This is not because you upset anyone; it is simply what being on the public internet means.**

This article covers the network layer: **which ports to open, how to configure firewalls, how to harden SSH, and what to do when you are attacked**. For hardening inside the operating system, see [System Hardening](/tutorials/ops/system-security).


:::warn Docker containers bypass the host firewall
Every `ufw` / `firewalld` rule on this page is **ineffective against ports published by Docker containers**. Docker inserts its own `iptables` rules ahead of the host firewall, so `ufw deny` cannot block a container port.

To actually restrict it, bind the port to loopback (`-p 127.0.0.1:25565:25565`) or use the `DOCKER-USER` chain. See [Deploying Java Edition with Docker → Networking and Firewall](/en/tutorials/java/docker).
:::

## 1. Understand Your Attack Surface First

### 1.1 The Ports You Actually Need

| Purpose | Protocol | Default port | Public exposure |
| --- | --- | --- | --- |
| **Minecraft Java Edition** | TCP | `25565` | Yes (player entry point) |
| **Bedrock / Geyser** | UDP | `19132` | Yes (needed for cross-play) |
| **Query protocol** | UDP | `25565` | Usually not needed |
| **RCON remote console** | TCP | `25575` | **Never** |
| **Database** (MySQL / MariaDB) | TCP | `3306` | **Never** |
| **Redis** | TCP | `6379` | **Never** |
| **Panel** (any web admin panel) | TCP | Varies by panel | **Never** |
| **SSH** | TCP | `22` | Yes, but **restrict the source** |

:::warn Defaults can be changed
The table above lists **factory defaults**. If you changed `server-port`, `query.port` or `rcon.port` in `server.properties`, or changed a listening port in a panel, **your actual configuration wins**. Firewall rules must match the real ports, or you will either break connectivity or leave a hole open.
:::

### 1.2 Why RCON and Databases Must Stay Locked Down

- **RCON is administrative power without a UI.** A single password buys the ability to run arbitrary console commands. Once exposed, an attacker can `op` themselves, wipe worlds and kick every player. **The correct move is `enable-rcon=false`; if you need remote administration, use an SSH tunnel or go through a panel over loopback.**
- **An exposed database port is the most common route to a data breach.** When MySQL allows `root` from any host (`root@%`) and the password is weak, it is cracked within minutes, exposing player accounts, password hashes and purchase records.
- **An exposed panel port puts control of the whole machine on the public internet.** The panel has a login page, but login pages have vulnerabilities too, and the panel usually runs with elevated privileges.

One rule covers all of it: **any port that is not for players should not face the internet.** When you need remote access yourself, use an SSH tunnel (see section 4) rather than exposing the service.

### 1.3 Two Quick Wins

- **Check the bind address.** Databases, panels and RCON should bind `127.0.0.1`, not `0.0.0.0`. Once bound to loopback, they are unreachable from outside even if a firewall rule is wrong.
- **Check `online-mode`.** Keep `online-mode=true` in `server.properties` for Java Edition. Offline mode lets anyone impersonate any player ID, which is an identity problem no firewall can fix. See [Server Configuration](/tutorials/java/config).

## 2. A Firewall Is Two Layers, Not One

This is the most commonly missed point for newcomers:

| Layer | Where it lives | Who manages it | Examples |
| --- | --- | --- | --- |
| **Cloud security group / network ACL** | On the provider side, **before traffic reaches your machine** | The provider's console | Alibaba Cloud security groups, Tencent Cloud security groups, AWS Security Groups |
| **Host firewall** | Inside the operating system, on `netfilter` / `nftables` | You, on the machine | `ufw`, `firewalld`, `iptables`, `nftables` |

**Configure both.** With only a security group, you lose protection the moment the machine moves networks or the group is widened. With only a host firewall, a permissive default security group leaves the first door wide open.

:::warn Provider-specific UI paths are deliberately omitted
Every cloud console uses different menu names, hierarchies and terminology ("security group", "firewall", "network ACL" are used interchangeably). **This article does not guess at specific menu paths.** Follow your provider's official documentation. What is certain: **inbound (ingress) rules should default to deny, allowing only the ports you list.**
:::

### 2.1 ufw (Common on Ubuntu / Debian)

`ufw` is a front end for `iptables` / `nftables` and suits single-machine setups.

```bash
sudo apt update
sudo apt install -y ufw

# Important: allow SSH BEFORE enabling default-deny, or you lock yourself out
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp

sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 25565/tcp
sudo ufw allow 19132/udp

sudo ufw enable
sudo ufw status verbose
```

`sudo ufw status verbose` prints the current policy and rules. You should see `Default: deny (incoming), allow (outgoing)` plus the entries you added.

**Order matters.** If you run `sudo ufw enable` before allowing SSH and your session is cut, your only way back in is the provider's VNC or rescue console.

### 2.2 firewalld (Common on RHEL / Rocky / AlmaLinux / Fedora)

```bash
sudo dnf install -y firewalld
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --permanent --add-port=19132/udp

# Allow SSH only from your admin address
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.10" port port="22" protocol="tcp" accept'

sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

`--permanent` writes to the persistent configuration and **requires `--reload` (or a firewalld restart) to take effect**. A change without `--permanent` applies only to the running configuration and disappears on restart. Both modes are useful; the trap is mixing them up and believing you are done.

### 2.3 iptables (Classic Syntax)

```bash
# Allow established connections and loopback
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow SSH only from your admin address
sudo iptables -A INPUT -p tcp -s 203.0.113.10 --dport 22 -j ACCEPT

# Player entry points
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT

# Default deny
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
```

`iptables` rules are **not persistent by default** and vanish on reboot. To save them:

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 2.4 nftables (Modern Syntax)

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 25565 accept
sudo nft add rule inet filter input udp dport 19132 accept
```

:::note On modern distributions, ufw and firewalld sit on top of nftables
On recent kernels and distributions, `ufw` and `firewalld` already use the `nftables` backend. **Never run two front ends at once** (for example `ufw` and `firewalld` together): they overwrite each other's rules and the resulting behaviour is painful to debug. **Pick one and stay with it.**
:::

### 2.5 Allowing a Port Is Not the Same as Restricting a Source

| Rule | Meaning | Risk |
| --- | --- | --- |
| `sudo ufw allow 22/tcp` | **Anyone may connect to port 22** | The whole internet can brute-force your SSH |
| `sudo ufw allow from 203.0.113.10 to any port 22 proto tcp` | **Only `203.0.113.10` may connect to port 22** | You must update the rule when that address changes |

For player entry points (`25565`) you **must** leave the source open, because players come from everywhere. For SSH, panels, RCON and databases, which **only you use**, **always restrict the source**.

:::tip No static IP?
Home connections get reassigned addresses. Options: ask your ISP for a static IP, use a provider VPN or bastion host, or accept SSH keys plus fail2ban as your mitigation. **Be aware that restricting SSH to an address that changes will lock you out when it changes** — confirm your provider offers a VNC rescue channel first.
:::

## 3. Hardening SSH

SSH is your administrative entrance and the most heavily brute-forced port on the internet. Recommended order: **confirm key-based login works, then disable password authentication.**

### 3.1 Set Up Key-Based Login First

Generate a key pair locally if you do not have one:

```bash
ssh-keygen -t ed25519 -C "mc-admin"
```

Copy the public key to the server:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub mcadmin@203.0.113.10
```

**Verify** that a fresh terminal can log in with the key before continuing.

### 3.2 Edit the sshd Configuration

Edit `/etc/ssh/sshd_config` with `sudo`:

```ini
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

| Directive | Effect |
| --- | --- |
| `PubkeyAuthentication yes` | Enables public-key authentication (the basis of key login) |
| `PasswordAuthentication no` | **Disables password authentication**, removing the target brute-force scripts aim at |
| `PermitRootLogin no` | **Forbids direct root login**, forcing an attacker to guess a regular username first |
| `KbdInteractiveAuthentication no` | Disables keyboard-interactive authentication so it cannot bypass `PasswordAuthentication no` |

:::warn Validate the syntax before reloading
Run `sudo sshd -t` to check the configuration, and only then `sudo systemctl reload ssh` (on some distributions the unit is `sshd`). Reloading SSH with a broken configuration can lock you out completely.
:::

**Check the effective values** (the file may be overridden by an `Include`d fragment):

```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

:::note Configuration layout varies by version
Recent OpenSSH releases support drop-in `.conf` fragments under `/etc/ssh/sshd_config.d/`, and **settings in those fragments typically take precedence over the main file**. If your distribution has that directory, run `ls /etc/ssh/sshd_config.d/` first to look for overrides. **For the exact precedence rules, rely on the `sshd -T` output on your own system and the official OpenSSH documentation.**
:::

### 3.3 Changing the Default Port: Optional and Limited

To move SSH off `22` (to `2222`, for example):

```ini
Port 2222
```

**What it gives you:** automated scanners mostly probe `22`, so the change sharply reduces log noise and wasted brute-force attempts.

**What it does not give you:** **it is not a security control.** A targeted scan can find your SSH anywhere in the port range. Changing the port **does not replace** key-based login and source restriction.

If you change it, update the firewall rules too, and **keep the old port allowed until the new one is verified** — otherwise you lock yourself out the same way.

### 3.4 fail2ban: An Optional Addition

**The concept:** fail2ban reads logs, notices an IP failing authentication repeatedly in a short window, and **temporarily** blocks it with a firewall rule.

**The core concept is the jail:** one jail = one log source + one set of matching rules + one set of ban parameters. Enabled jails live in `/etc/fail2ban/jail.d/*.conf` or `/etc/fail2ban/jail.local`.

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

- `maxretry`: allowed failures; `findtime`: the counting window; `bantime`: ban duration.
- `backend = systemd` suits modern distributions where systemd-journald collects logs. If your distribution writes `/var/log/auth.log` instead, use the matching `logpath` as documented by fail2ban.

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

:::warn fail2ban is not a shield
- It only blocks IPs that have **already failed**, so it is **reactive** and does not stop the first wave.
- **A misconfigured ban can lock you out.** Do not set an extreme `bantime` such as several months.
- Options and defaults **vary by distribution and version**. The snippet above is a common form; check the documentation for your version.
- Installing fail2ban is **not** a reason to turn `PasswordAuthentication` back on.
:::

## 4. DDoS and Abuse: What You Can and Cannot Do

### 4.1 Why Game Servers Get Targeted

- **The barrier is extremely low.** Attack-for-hire services sell by volume; a few dollars buys an attack.
- **The motives are simple.** Rival servers, a retaliating player, plain boredom, or an indiscriminate scanner hitting you in passing.
- **Game servers are unusually fragile.** Minecraft uses **stateful, long-lived connections**, and every TCP handshake costs server resources. The same bandwidth that merely slows a web service can freeze or crash a game server.

### 4.2 What You Can Do

| Measure | Notes |
| --- | --- |
| **Upstream / provider protection** | Cloud providers usually include baseline DDoS scrubbing. **This is the most effective layer**, because traffic is handled before it reaches your machine. |
| **Rate and connection limits** | Cap connections per IP and new-connection rate at the firewall or proxy layer to blunt low-intensity floods. |
| **Hide the origin behind a proxy** | Let players connect to a proxy and have the real server accept only the proxy (with forwarding secrets). See [Proxy Networks](/tutorials/java/proxy). |
| **Whitelist / application review** | The most thorough option for a small server: **people you do not know simply cannot connect**. |
| **Application-level throttling** | Connection-frequency limits in the server or a plugin reduce join-and-drop harassment. |

### 4.3 What You Cannot Do, and a Common Misconception

:::warn "Blocking the attacker's IP" does nothing against volumetric attacks
This is the most widespread misunderstanding. A volumetric attack is defined by:

- **Thousands of constantly changing source IPs**, many from infected devices, so you can never block them all;
- **Your firewall sits behind the flood.** By the time a drop rule matters, the link is already saturated. Once the pipe is full, the machine struggles even to apply the blocking rules.

**Conclusion:** IP blocking works against an individual harasser and is essentially useless against a volumetric attack. **Only upstream scrubbing solves it**, which means you should **read your provider's DDoS protection terms when you buy**, not when you are being attacked.
:::

:::note What to do while under attack
1. **Confirm it is really an attack.** Look at bandwidth, connection counts and CPU, and rule out your own bug spinning in a loop.
2. **Contact your provider.** Explain the situation and ask whether scrubbing has triggered and whether an IP change is available.
3. **Stabilise first.** If necessary, switch to a temporary whitelist to keep the server alive.
4. **Preserve evidence.** Keep logs and traffic graphs for the provider.
:::

## 5. Secrets and Credential Hygiene

A server directory holds plenty of sensitive material: the RCON password in `server.properties`, database passwords, panel accounts and provider API keys.

| Rule | Practice |
| --- | --- |
| **Never commit secrets to Git** | Configs with passwords, `.env` files and key material belong in `.gitignore`. **One commit is a permanent leak** — the value stays in history. |
| **Tighten credential file permissions** | `chmod 600` (owner read/write only), or `chmod 640` (owner read/write, group read) where a group must read it. |
| **Use environment files, not hardcoded values** | Keep sensitive values in a `.env`-style file and have code read environment variables. |
| **Rotate on leak; do not just delete** | Deleting a file **does not** invalidate a leaked credential. **Regenerate or revoke it at the service that issued it.** |

```bash
# Owner-only read/write for a credential file
chmod 600 /opt/mcserver/survival/.env

# Confirm the permissions
ls -l /opt/mcserver/survival/.env
# Expected output resembles: -rw------- 1 mcserver mcserver ... .env
```

:::warn Order of operations after a credential leak
1. **Rotate immediately.** Reset the password or revoke the key at the issuing service — this is the step that actually stops the bleeding.
2. **Assess the blast radius.** Read the logs and determine whether the credential was used.
3. **Clean the history.** Remove it from Git history (with tools such as `git filter-repo`), but **do not imagine this rescues the value that already leaked**.
4. **Learn from it.** Why was it committed? Add `.gitignore` entries and a pre-commit check.
:::

For database credentials specifically: **give each service its own account** (never share `root`), **grant only the databases it needs**, and **restrict the source to localhost or the private network**.

## 6. Monitoring: Noticing That Someone Is Probing You

**You do not need to watch a screen 24/7**, but you do need to know where anomalies show up.

### 6.1 Where to Look

| Location | What it reveals |
| --- | --- |
| `/var/log/auth.log` (Debian / Ubuntu) | Successful and failed SSH logins |
| `/var/log/secure` (RHEL family) | The same |
| `journalctl -u ssh` | SSH logs collected by systemd |
| `sudo fail2ban-client status sshd` | Current ban count and banned IPs |
| `sudo lastb` | Failed login attempts (**requires root; not recorded by default on every system**) |
| `ss -tlnp` | Currently listening ports, for spotting unexpected exposure |

```bash
# Recent SSH failures (Debian / Ubuntu)
sudo grep 'Failed password' /var/log/auth.log | tail -n 20

# Source IPs with the most failures
sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head

# What is listening
sudo ss -tlnp
```

### 6.2 What Counts as Anomalous

- **A burst of `Failed password` entries**: textbook brute force.
- **A successful login at a time or from an IP you do not recognise**: **the most dangerous signal of all**, suggesting a credential has leaked.
- **Accounts you never created**: a backdoor account may have been added.
- **Unfamiliar listening ports**: possibly a miner or backdoor.
- **CPU or bandwidth spiking with no players online**: your machine may be part of an attack.

:::tip Let the logs stand watch for you
If you will not read logs daily, use `logwatch`, scheduled `journalctl` summaries, or alerting on key events. **What matters is that someone reads them** — unread logs are the same as no logs.
:::

## 7. Pre-Launch Checklist

- [ ] **Both layers configured** (cloud security group and host firewall), inbound default deny
- [ ] Only the ports you actually need are open (Java `TCP 25565`, Bedrock / Geyser `UDP 19132`)
- [ ] `enable-rcon` is `false`, or RCON listens on `127.0.0.1` only
- [ ] Database and panel ports are **not reachable from the internet**
- [ ] SSH uses key-based login with `PasswordAuthentication no` and `PermitRootLogin no` in effect (confirmed with `sshd -T`)
- [ ] SSH source is restricted, or fail2ban is in place as a fallback
- [ ] Files containing passwords are mode `600` and **are not in the Git repository**
- [ ] `online-mode` remains `true` (unless you knowingly accept the cost of offline mode)
- [ ] You know your provider's DDoS protection terms and who to contact under attack
- [ ] Port reachability has been verified **from an external machine**

## Next Steps

- Hardening inside the operating system (accounts, permissions, systemd): see [System Hardening](/tutorials/ops/system-security)
- Server-side and plugin security: see [[JAVA] Security Plugins](/tutorials/ops/security-java) and [[BE] Security Plugins](/tutorials/ops/security-be)
- Anti-griefing and logging: see [Anti-Cheat and Anti-Griefing](/tutorials/java/anticheat)
- Your last line of defence for data: see [Backup and Restore](/tutorials/java/backup)

---

> Commands and configuration follow each project's official documentation. Package names, service names and configuration defaults differ between distributions; rely on the actual output on your own system.
