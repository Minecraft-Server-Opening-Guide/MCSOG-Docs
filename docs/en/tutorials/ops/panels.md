---
title: Using and Securing Management Panels
slug: panels
cat: ops
level: 3
order: 14
minutes: 18
tags: [panel, mcsmanager, pterodactyl, security, reverse-proxy, hardening, operations]
updated: 2026-10-04
draft: false
---

The earlier articles all assumed you log into the machine and type commands yourself. This one covers a different way of running a server: **handing it to a web panel**, so that starting instances, reading the console, moving files and editing configs all happen in a browser.

Panels are genuinely convenient, but a panel is **the most privileged service on the machine and the most attractive target on it**. So this article is not about what a panel can do. It is about **what a panel adds to your attack surface, and how to take that back**.

:::note Scope
This article covers **usage and security boundaries**, and does not replace any panel's official installation documentation. Install commands, default ports and directory layouts **follow the official documentation**; values quoted here were checked against an official source and are marked as such.
:::

## 1. What a Panel Gives You, and What It Costs

### 1.1 What Panels Usually Provide

| Capability | What it looks like | When it genuinely saves you |
| --- | --- | --- |
| **Web interface** | Start, stop and restart instances from a browser instead of memorising commands | Restarting a server from your phone during an incident |
| **Multi-instance management** | Several servers on one machine, switched from one place | Survival, creative and test servers side by side |
| **Console access** | Live logs and command input in the browser | Working out why a server crashed, remotely |
| **File manager** | Upload, download and edit jars, configs and world files | Shipping a modpack or swapping a plugin |
| **Scheduled tasks** | Restarts, backups and commands on a timer | A nightly restart to reclaim memory |
| **Users and sub-users** | Giving moderators rights over some instances only | A moderator who can restart a server but has no SSH |
| **Resource statistics** | CPU, memory, disk and player-count graphs | Telling a config problem from an undersized machine |
| **Docker integration** | Container isolation and resource limits per instance | Keeping several instances out of each other's way |

:::note Feature sets differ between panels
The table above describes panels as a category. **Whether a given panel offers a feature, and where it lives in the UI, follows that panel's official documentation and the build you actually run.**
:::

### 1.2 The Cost

| Cost | Explanation |
| --- | --- |
| **One more service to maintain** | The panel is a web application: it needs updates, security advisories and backups of its own data |
| **A larger attack surface** | An extra listening port, an extra account system and an extra API |
| **Privileges concentrated in one place** | The panel, and especially the daemon, can start arbitrary processes and read and write instance directories. Whoever takes it over owns every server on the machine |
| **More complicated reverse proxying** | Panels usually need WebSockets, and some require the browser to reach the daemon directly (see 3.1) |
| **One more thing that can fail** | A dead panel does not kill your servers, but it can leave you without a management path |

:::warn The risk in one sentence
**A panel is not "just another application". It is the master switch for every game server on the machine.** Publishing its login page to the internet publishes your whole machine's management plane.
:::

### 1.3 Draw the Trust Boundary First

Before installing anything, be clear about this line:

- **What the panel controls equals what its runtime identity controls.**
- A panel running as root turns any remote code execution flaw in the panel into a full machine compromise.
- **The daemon API exists to execute commands.** That is its purpose, not a bug. Exposing it is equivalent to publishing a shell.

## 2. MCSManager (MCSM)

### 2.1 Official Positioning

MCSManager describes itself in its official repository as a **"quick deployment, distributed, multi-user, modern management panel for Minecraft and Steam game servers"** (the Chinese README says the same: 快速安装，分布式架构，多用户，现代化的 Minecraft 和 Steam 游戏服务器管理面板). The official documentation adds that it is an **open-source, distributed, out-of-the-box control panel** supporting Minecraft and Steam game servers, that it helps you manage multiple physical machines and create servers on any host, and that it provides a secure multi-user permission system.

Three words in that description are the whole positioning:

| Keyword | Meaning |
| --- | --- |
| **Quick deployment** | An install script that registers the panel as a system service |
| **Distributed** | One panel can manage **several** machines |
| **Multi-user** | A built-in account and permission system, so you can delegate to moderators instead of handing out SSH |

### 2.2 Architecture: One Panel, One or More Daemons

The official documentation splits MCSManager into two parts:

| Component | Responsibilities as described officially |
| --- | --- |
| **Panel** (web panel) | User management, connecting to daemons, authentication for most operations, API |
| **Daemon** | Process management (where instances actually run), Docker image management, file management, real-time terminal communication |

This is what "distributed" means: **the panel does not run your servers itself.** It sends instructions to a daemon on each machine, and the daemon starts and supervises instances locally. The shape is therefore one panel plus N daemon nodes.

:::warn Component names, install commands, default ports and directory layouts follow the official documentation
Service names, script URLs, default ports and data directories can change between MCSManager versions. **The values below are the defaults documented at the time of writing; treat your own configuration files and the official documentation as authoritative.** Never copy an unverified port or path into production.
:::

**Defaults checked against the official documentation (for cross-reference, still worth confirming on your system):**

| Item | Documented default | Note |
| --- | --- | --- |
| Panel web port | `23333` | Changeable via `httpPort` in the web config file |
| Daemon port | `24444` | Changeable via `port` in the daemon config file |
| Linux service names | `mcsm-web`, `mcsm-daemon` | systemd services |
| Script install directory | `/opt/mcsmanager` | The path used in the official example |
| Web config file | `<Web install dir>/data/SystemConfig/config.json` | Holds `httpPort`, `httpIp`, `loginCheckIp` and more |
| Daemon config file | `<Daemon install dir>/data/Config/global.json` | Holds `port`, `key`, `defaultInstancePath` and more |
| Daemon key | The `key` field in that `global.json` | Also printed when the daemon starts |

:::tip An official warning that is very easy to miss
The official distributed deployment page states plainly that on a machine running only the daemon you **must stop and disable the web service**, because otherwise **anyone can reach the initial setup page and take over your server**:

```bash
systemctl stop mcsm-web
systemctl disable mcsm-web
```

Worth remembering on its own: **the web service you forgot to turn off is a complete compromise.**
:::

### 2.3 Installing and Logging In for the First Time

The official Linux one-click script. The documentation stresses that because it registers system services, it **must run with root privileges**:

```bash
sudo su -c "wget -qO- https://script.mcsmanager.com/setup.sh | bash"
```

:::note The script URL differs between language versions
The English documentation uses `setup.sh`; the Chinese documentation uses `setup_cn.sh`. **Use the URL from the documentation of the language version you are following** rather than typing the URL from memory. The official docs also cover a Docker installation and Docker-based isolation; follow those pages for the exact steps.
:::

Then start both services, which the documentation describes as indispensable to each other:

```bash
# Start the daemon first, then the web service
systemctl start mcsm-daemon.service
systemctl start mcsm-web.service

# Enable them at boot if you want them to survive a reboot
systemctl enable mcsm-web.service
systemctl enable mcsm-daemon.service
```

For a manual installation the documented start commands are `./install.sh`, `./start-daemon.sh` and `./start-web.sh`, with the caveat that a manually started panel must be supervised by something like `screen`, or the processes die with your SSH session. On Windows the documented approach is to download the ZIP, extract it and run it, using the bundled launcher if the archive contains one.

**Do these immediately after the first login, in this order:**

1. Log in with the administrator account (the initial credentials come from the official documentation and your install output).
2. **Change the default password at once**, and make it long and different from anything else you use.
3. Put the panel behind an HTTPS reverse proxy as described in 3.5, or at minimum restrict which addresses may reach it.
4. Check the listening address and port, and confirm the daemon is not directly exposed to the internet.

### 2.4 A Typical Workflow

The official "Setup Java Edition Server" page describes roughly this flow (follow the official page for details):

| Step | Action | Note |
| --- | --- | --- |
| 1 | Install the panel and daemon (or use the documented Docker route) | On a node machine, run only the daemon service |
| 2 | Log in and change the default password | See 2.3 |
| 3 | Confirm or add the daemon in the panel | Needs an address and key; the docs say the address accepts an IP or domain, and also `ws://` or `wss://` prefixes |
| 4 | On the Instances page, click Create | Either install from the market, or "create directly" and pick the node to run on |
| 5 | Fill in the startup command | Documented example: `java -Dfile.encoding=UTF-8 -jar "paper-<version>.jar"`, optionally with `-Xms` / `-Xmx` |
| 6 | Upload the server files | Use the panel's file manager to upload the server jar |
| 7 | Press Start on the instance console and watch the log | A first start usually also requires editing `eula.txt` to `eula=true` under Configuration Files |
| 8 | Create sub-users for moderators, scoped to the instances they need | Never "all instances plus file management" |

The documentation also states that instance data lives under `<Daemon install dir>/data/InstanceData/<instance ID>/` by default, and instance configuration under `<Daemon install dir>/data/InstanceConfig/<instance ID>.json`, which includes the startup command. **These are the things you cannot easily reconstruct, so they belong in your backups.**

:::warn Do not get greedy with heap flags
The official documentation warns specifically against allocating all of the machine's memory to the JVM: the operating system needs memory too, and ignoring this can crash the whole machine. Keep `-Xmx` clearly below physical RAM.
:::

### 2.5 Where a Panel Really Helps

- **Many instances**: restarting a dozen servers over SSH one by one does not scale.
- **Limited moderator access**: let moderators restart servers and read logs **without giving them SSH**. This is the single biggest security win a panel offers.
- **Scheduled restarts and backups**: panels as a category usually offer scheduled tasks. **Whether MCSManager provides them, where they live and how to configure them follows the official documentation and your own build's interface.**
- **Several machines**: one panel, several daemons, one entry point.
- **People who are not comfortable with a shell**: constraining them to the panel's feature set is often safer than handing over a shell.

## 3. Securing a Panel

### 3.1 Rule One: Never Expose the Panel or the Daemon API

This matters more than every other item combined:

:::warn Never expose the daemon port to the internet
The daemon API exists to **start processes, read and write files and execute commands**. It is a **remote code execution interface** with an authentication layer wrapped around it. **Once it is reachable, a leaked key, an authentication bypass or one unpatched flaw is all an attacker needs to run arbitrary commands on your machine.** The panel web UI is the same story, except that it at least has a login page in front of it.
:::

What to do instead:

1. **Panel**: bind it to `127.0.0.1` or a private address, publish it through an HTTPS reverse proxy, and add a source restriction on top (VPN, IP allowlist or firewall rule).
2. **Daemon**: allow only the panel host (and any client that genuinely must connect directly).
3. **Do not bind the daemon to `0.0.0.0` "for convenience".**

:::note The MCSManager wrinkle: the browser talks to the daemon directly
The official network architecture page explains that, to keep the panel from becoming a bottleneck for high-bandwidth work such as file uploads and console logs, **that traffic goes directly from the browser to the daemon**. The same page states that a daemon address **cannot be a LAN address**, because the daemon status would otherwise stay stuck at "Connecting".

Two consequences you need to know:

- If you put the panel behind HTTPS, **every daemon needs its own HTTPS reverse proxy too**, and the address in the panel must become `wss://...`. The documentation is explicit that browsers **refuse** to connect to a daemon over a non-HTTPS WebSocket.
- The generic advice "keep the daemon on a private network" has to be implemented the way the official docs describe: **either follow their HTTPS reverse proxy recipe, or protect the browser-to-daemon path with a VPN or tunnel.** Do not simply publish the port.

**Follow the official network architecture and NGINX HTTPS pages for the actual configuration.**
:::

### 3.2 Do Not Run It as root

| Case | What the official documentation says | What to do |
| --- | --- | --- |
| MCSManager one-click script | The script **must run as root**, because it registers system services | Installing as root is fine, but **run instances under a dedicated user or inside a container**; the docs have a separate Docker isolation page |
| Pterodactyl Wings | The documented systemd unit uses `User=root` | That is the official design (Wings drives Docker); **container isolation of instances is the mitigation** |
| General-purpose panels | Usually need elevated rights to manage services and websites | Do not put game servers and such a panel inside the same trust boundary (see 4.2) |

The principle: **avoid root where you can, and when elevated rights are unavoidable, contain the blast radius with isolation** — a dedicated user, a container, or a separate machine.

### 3.3 Credentials and Accounts

- **Change the default password immediately.** Default credentials are the first thing automated scanners try.
- Use **long, unique passwords**, ideally generated by a password manager. **A leaked panel password is every instance compromised.**
- **Enable two-factor authentication if the panel supports it.** Whether it does, and how to turn it on, **follows the official documentation**.
- **Audit sub-users and their permissions regularly.** Who is still there? Do they still need it? Is the scope too wide? "File management plus all instances" is effectively shell access.
- **Delete accounts you no longer need**, including departed moderators, test accounts and unused API keys.
- Keep panel credentials out of screenshots, chat logs, Git repositories and stray text files in server directories.

### 3.4 Keep the Panel Itself Updated

A panel is a web application, and **web applications have CVE histories**. Concretely:

- Subscribe to the official repository's releases and security advisories.
- Follow the upgrade procedure in the official documentation's update section.
- **Back up the panel's own data before upgrading** (see 3.7).

:::warn One MCSManager upgrade trap
The official upgrade and reset page notes that the one-click update script **re-enables `mcsm-web` automatically**. If you deliberately disabled the web service on a node machine (see 2.2), you **must stop and disable it again after every update**, or the initial setup page is exposed once more.
:::

### 3.5 Binding and Reverse Proxying (nginx Example)

The shape of the solution: **bind the panel to loopback, and let nginx terminate HTTPS in front of it.** The port below is a **placeholder**; replace it with your panel's actual port.

```nginx
# /etc/nginx/conf.d/panel.conf
# <panel-port> is a placeholder: replace it with the panel's real local port.
# Certificate paths come from your certificate tool. Do not copy the examples below.

server {
    listen 80;
    server_name panel.example.com;
    # Redirect only; how certificates are issued and renewed follows your certificate tool
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name panel.example.com;

    # Generated and renewed by your certificate tool; replace with the real paths
    # (for example the paths certbot writes to)
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    # The panel console needs WebSockets, so the Upgrade header must be forwarded
    location / {
        proxy_pass http://127.0.0.1:<panel-port>;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Panels may upload large server jars or modpacks; 0 means no limit
        client_max_body_size 0;

        # The console is a long-lived connection: do not buffer it or cut it short
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

A few notes:

- `proxy_http_version 1.1` together with the `Upgrade` and `Connection` headers is what makes WebSockets work. **Miss one and the console may simply never connect.**
- The `ssl_certificate` and `ssl_certificate_key` **paths come from your certificate tool** (certbot and friends). They differ between tools and deployment styles, so **do not copy them**.
- If the panel's own documentation ships a reverse proxy recipe (MCSManager has NGINX, IIS and Caddy pages), **follow it**, because the daemon path usually needs its own configuration as well.
- Test the syntax before reloading — the MCSManager documentation asks for the same discipline:

```bash
sudo nginx -t
sudo nginx -s reload
```

### 3.6 Firewall

Open only what must be open and deny the rest by default:

| Port | Reachable from | Note |
| --- | --- | --- |
| 80 / 443 | The internet | The panel entry point (or whichever HTTPS port you chose); 80 is only for redirects and certificate validation |
| Panel local port | **This machine only** | Nothing to open when the panel is bound to `127.0.0.1` |
| Daemon port | **The panel host only** (or the restricted set the official architecture requires) | Never the internet; the exact port follows the official documentation |
| Game ports | The internet, as needed | Where players connect |
| SSH | Your management addresses | Key-only authentication is strongly preferred |

An example (ports and networks are **placeholders**; replace them with your own values and check the syntax against your distribution's documentation):

```bash
# ufw example
sudo ufw default deny incoming
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
# Allow only the panel host to reach the daemon port
sudo ufw allow from <panel-host-ip> to any port <daemon-port> proto tcp
sudo ufw enable
sudo ufw status verbose
```

For the full picture of ports and rules, see [Network Security Fundamentals](/tutorials/ops/network-security) and [Routers and Firewalls](/tutorials/ops/router-firewall).

### 3.7 Back Up the Panel's Own Data

**The panel's data directory holds every instance definition, user and setting. Lose it and your server files still exist, but the panel shows nothing.**

| What to back up | Why |
| --- | --- |
| The panel's database and config directory | Users, permissions, instance definitions, scheduled tasks |
| The daemon's configuration | Port, key, instance configuration |
| Instance data directories | Worlds, plugins, configs — usually the bulk of the size |

:::warn Paths follow the official documentation
Data directory locations differ between panels, so **confirm them in the official documentation before writing them into a backup script.** Do not guess paths.

For MCSManager the documented locations are: web config at `<Web install dir>/data/SystemConfig/config.json`, daemon config at `<Daemon install dir>/data/Config/global.json`, instance data at `<Daemon install dir>/data/InstanceData/<instance ID>/`, and instance config at `<Daemon install dir>/data/InstanceConfig/<instance ID>.json`. The official upgrade and reset page simply advises backing up the `web/data` and `daemon/data` directories elsewhere before an upgrade.
:::

Backup guidance:

- Keep panel backups **offline or offsite**, in a location **the panel process itself cannot write to** — otherwise a compromised panel deletes its own backups.
- Those backups contain the panel database and keys, so **encrypt them or lock their permissions down**.
- **Rehearse a restore periodically.** Backups you have never restored are not backups. See [Backup and Recovery](/tutorials/java/backup) and [Offsite Backups](/tutorials/ops/offsite-backup).

### 3.8 What a Compromised Panel Means

Write the worst case down, and it becomes obvious what to defend:

| What the attacker obtains | Consequence |
| --- | --- |
| The panel account | Control of **every instance**: worlds deleted, configs edited, players kicked, themselves opped |
| The panel plus file management | Malicious jars or plugins uploaded, carrying a backdoor into the server |
| The daemon API | **Arbitrary command execution on the machine** — that is its job — which usually means a shell |
| The panel database or keys | Persistence: old API keys and sessions may keep working even after you change the password |
| Write access to the backup location | **Your backups deleted**, leaving nothing to restore from — a common move in ransomware and revenge deletions |

So: **if you suspect the panel has been compromised, treat the whole machine as compromised.**

1. Cut off public access to the panel and daemon first (change the firewall, not just the password).
2. Rotate **every** credential: panel accounts, the daemon key, RCON passwords inside your servers, database passwords, cloud provider API keys.
3. Look for new administrator accounts, new API keys and unexpected scheduled tasks.
4. Inspect server directories for suspicious jars, plugins and cron-style scripts.
5. Restore from a backup you **know** is clean, rather than cleaning up the compromised machine and carrying on.
6. Work out how it was exposed — a published port, a weak password, or a missing patch. See [Network Security Fundamentals](/tutorials/ops/network-security) and [System Hardening](/tutorials/ops/system-security).

## 4. Other Panels and How to Choose

### 4.1 Pterodactyl

Pterodactyl describes itself as a **free, open-source game server management panel built with PHP, React and Go. Designed with security in mind, it runs all game servers in isolated Docker containers** while exposing an intuitive UI to end users. It is MIT licensed, and the project highlights bcrypt password hashing, AES-256-CBC encryption and HTTPS support out of the box.

Its architecture belongs to the same "panel plus per-node daemon" family as MCSManager. The official terminology page defines:

| Term | Official meaning |
| --- | --- |
| **Panel** | Pterodactyl itself; what lets you add nodes and servers to the system |
| **Node** | A physical machine that runs an instance of Wings |
| **Wings** | The newer service written in Go that interfaces with Docker and the Panel to control servers securely through the panel |
| **Server** | A running instance created by the panel; servers run on nodes, and a node can host several |
| **Docker / Image / Container** | The isolation layer; each server runs in its own container to enforce CPU and memory limits and prevent interference |
| **Nest / Egg** | A nest usually maps to a game or service; an egg stores the configuration for one specific flavour of it |
| **Yolks** | The curated collection of core Docker images used with the egg system |

Points taken from the official documentation:

- Wings is **Linux only**; the documentation states plainly that it will not run on Windows. It needs a system that can run Docker containers, and OpenVZ- or LXC-based virtualisation usually will not work (the docs suggest checking with `systemd-detect-virt`).
- The documented install flow is: create a node in the panel, paste the generated configuration into `/etc/pterodactyl/config.yml` on the node (or run the command behind the "generate token" button), then run Wings as a systemd service.
- The documented systemd unit runs Wings with `User=root`. That is the official design.
- The documentation notes that **when the panel uses SSL, Wings must have a certificate for its FQDN as well**.
- Nodes need allocations, which are IP and port combinations; every server needs at least one, and the docs say not to use `127.0.0.1`.

:::note What this article does not enumerate
Pterodactyl's **exact install commands, default ports, directory layout and version requirements change between releases**, so they are not reproduced here: **follow the official documentation.** Panel installation is covered by the official Panel "Getting Started" page, and the node daemon by the official Wings "Installing Wings" page.
:::

### 4.2 General-Purpose Server Panels (1Panel, BT Panel and Similar)

These tools are **not game server panels**. They manage the **operating system layer**: websites, databases, containers, files, scheduled tasks and firewalls.

1Panel, for example, describes itself as a **modern, open-source Linux server operations and management panel** (and a lightweight AI management platform). It offers a web interface for host monitoring, file management, database management, container management and scheduled tasks, integrates closely with site builders such as WordPress and Halo, and advertises WAF, log auditing and backup as security features.

**How they differ from a game panel:**

| Dimension | Game server panel | General-purpose panel |
| --- | --- | --- |
| What it manages | Game instances (processes or containers) | System services, websites, databases, containers |
| Game awareness | Console, plugin uploads, startup commands | Usually none; it treats a server as just another process or container |
| Privilege scope | Instances and the daemon | **Frequently the whole system** |
| Typical use | Many instances, delegated moderator access | Websites, services, Docker management |

**Risks of running game servers through a general panel:**

- **Broader privileges.** Such panels typically need to manage system services and files, so a compromise reaches further than with a game panel.
- **No understanding of the game.** It will not perform "send stop, wait for the world to save" for you, and will happily hard-kill a server like any other process.
- **One more layer.** You are now maintaining both your deployment method and a general panel, and the attack surfaces add up.
- **Serious vulnerabilities have occurred historically.** General panels are prime targets for internet-wide scanning. **Treat any panel as internet-facing infrastructure**: patch promptly, restrict sources, and require strong authentication. **For specifics, consult each vendor's official security advisories rather than second-hand reports.**

:::tip A more defensible arrangement
If you do need a general panel (because the same machine also hosts a website, say), **put the game servers on a separate machine, under a separate user, or in separate containers.** Do not let the general panel's privileges and your game instances share one trust boundary. For host-level hardening see [System Hardening](/tutorials/ops/system-security).
:::

### 4.3 Comparison

| Panel | Positioning | Separate daemon required | Who it suits | Main risk |
| --- | --- | --- | --- | --- |
| **MCSManager** | Open-source, distributed, multi-user panel for Minecraft and Steam game servers | **Yes** (panel plus one or more daemons) | Owners with many instances, several machines, or moderators to delegate to | The daemon is a remote code execution surface; the browser must reach the daemon, complicating reverse proxying; upgrades may re-enable the web service |
| **Pterodactyl** | Free, open-source game server panel with instances in isolated Docker containers | **Yes** (panel plus Wings on each node) | Container isolation, multi-user and multi-node setups | Requires Docker and Linux; the documented Wings unit runs as root; a higher installation and maintenance bar; install method and ports follow the official docs |
| **1Panel** | Modern, open-source Linux server operations panel (general purpose) | No (it is itself a system-level panel) | Websites, databases, containers, general operations | **System-level privileges** and a large attack surface; no game-specific awareness; a compromise reaches far |
| **BT Panel and similar** | General-purpose server operations panels | No | Websites and general operations | As with 1Panel; **install commands, default ports and security features follow the official documentation** |
| **No panel (SSH plus systemd)** | Direct management | No | One machine, a few instances | No extra attack surface, but units, logs and updates are all yours to maintain |

## 5. Practical Advice

### 5.1 Install Order

1. **Harden the system first**: dedicated users, SSH keys, firewall, automatic updates. See [System Hardening](/tutorials/ops/system-security).
2. **Then install the panel**, and change the default password immediately.
3. **Put the panel behind an HTTPS reverse proxy** and restrict who can reach it (VPN, IP allowlist or firewall rule).
4. **Add daemon nodes last.** A node runs only the daemon; shut down any extra web service.
5. Create an instance, upload files, get the console working.
6. Configure scheduled tasks and backups.
7. Create sub-users for moderators with the minimum permissions they need.

**Do not** stand a panel up on the open internet "just to get it working first". Every minute it is exposed, it is being scanned.

### 5.2 Hardening Checklist

- [ ] Neither the panel nor the daemon is **directly reachable from the internet**
- [ ] The panel is served over HTTPS and WebSockets work
- [ ] The default password is changed; two-factor authentication is on where supported
- [ ] Config files for the panel and daemon are tightly permissioned (files holding keys or passwords are not world-readable)
- [ ] Instances run as a dedicated user or in a container, not as root
- [ ] Panel data is backed up somewhere the panel cannot write to
- [ ] You follow the official security advisories and have a defined update process
- [ ] Sub-user permissions have been audited
- [ ] No leftover initial setup page is reachable on the node machines
- [ ] You know the incident steps for a compromised panel

### 5.3 What to Monitor

| Signal | Why |
| --- | --- |
| **Failed panel logins** | The first sign of brute forcing. Some panels ship a login-failure IP blocking option (MCSManager's web config includes `loginCheckIp`; **its exact meaning and behaviour follow the official documentation**) |
| **Unexpected new instances** | Attackers create instances to run their own workloads |
| **Unexpected scheduled tasks** | Timers are a favourite persistence mechanism |
| **New administrators or API keys** | Persistence backdoors |
| **Resource spikes** | CPU, memory or bandwidth being used for mining or flooding |
| **Panel and daemon versions** | So you can patch on time |
| **Unusual outbound connections** | A game server normally should not be dialling out to many addresses |

For log locations and audit commands see [System Hardening](/tutorials/ops/system-security).

### 5.4 When Not to Use a Panel

A panel is not the default choice. These situations **usually do not need one**:

- **One machine, one server.** SSH plus systemd is simpler and leaves one less attack surface. See [Deploying to a Reachable Environment](/tutorials/java/deploy).
- **You are the only user and you are comfortable on the command line.** You get none of the panel's benefits (visualisation, delegation) while paying all of its costs.
- **The machine is short on resources.** The panel itself consumes memory, which is a bad trade on a small VPS.
- **You will not maintain it.** **An unpatched panel is more dangerous than no panel at all.**

Conversely, a panel is usually worth it if any of these apply: many instances, several machines, moderators who need limited access, a need for scheduled tasks, or people who are not comfortable with a shell.

## Next Steps

- Host and account hardening: [System Hardening](/tutorials/ops/system-security)
- Ports, firewalls and exposure: [Network Security Fundamentals](/tutorials/ops/network-security)
- Rules for routers and firewalls: [Routers and Firewalls](/tutorials/ops/router-firewall)
- Backup strategy: [Backup and Recovery](/tutorials/java/backup) and [Offsite Backups](/tutorials/ops/offsite-backup)
- Keeping software current: [Updating the Server, Plugins and MCDR](/tutorials/ops/updates)
- Deploying without a panel: [Deploying to a Reachable Environment](/tutorials/java/deploy) and [MCDR Server Manager](/tutorials/java/mcdr)

---

> Install commands, default ports and directory layouts for every panel follow the official documentation.
