---
title: Deploying a Java Edition Server with Docker
slug: docker
cat: java
level: 3
order: 25
minutes: 16
tags: [docker, compose, java-edition, paper, server, container, volume, backup]
updated: 2026-10-04
draft: false
---

The previous tutorials installed Java on the host and ran the server jar directly. This one uses **containers** instead: a single `docker-compose.yml` describes the server together with the environment it runs in, and Docker takes care of the rest.

Containers are not mandatory, but they solve a few long-standing annoyances: **a host polluted with several Java versions, a rebuild from scratch on every new machine, and no way back after a failed upgrade**. The price is one more layer of tooling to learn, plus the discipline of treating volumes and backups as non-negotiable.

## 1. Why Containerise

### 1.1 What You Gain

| Benefit | What it looks like in practice |
| --- | --- |
| **Clean isolation** | The Java runtime lives inside the image, so the host needs no JDK at all, and a 1.20 server and a 1.21 server can run side by side without fighting over the system Java |
| **Reproducibility** | Image tag, core type, version, memory and ports all live in one file; moving to another machine means moving that file |
| **Easy rollback** | Back up `/data` before an upgrade; if the new version misbehaves, change the version back and restart. The image tag can be pinned the same way |
| **Less process babysitting** | Crash restarts and boot-time startup are handled by the `restart` policy, so you do not have to write a systemd unit |
| **Clean removal** | Deleting the container and the volume leaves nothing scattered around the host |

### 1.2 What It Costs

| Cost | Explanation |
| --- | --- |
| **One more layer to learn** | Images, containers, volumes, networks and Compose are unavoidable concepts, and debugging starts with `docker compose logs` |
| **Volume and backup discipline** | The world no longer sits in a directory you happen to browse; it sits in a volume, and a volume nobody backs up is a volume you have already lost |
| **Performance overhead is small, not zero** | Networking gains a NAT hop and the filesystem gains an overlay layer. That is usually far below the server's own bottleneck, but **a badly chosen memory or CPU limit will slow the server down or kill it outright** |
| **Some cores and plugins need tweaks** | Plugins that need console input, extra ports, a specific Java version or native libraries may need extra configuration; see [Performance Tuning](/tutorials/java/optimize) and [Managing Plugins](/tutorials/java/plugin-manage) |

:::note A container is not a virtual machine
Containers share the host kernel, so the isolation is at the process and filesystem level, not a security boundary. Root inside a container is not automatically root on the host, but **whoever you give Docker access to effectively gets host root**.
:::

## 2. Installing Docker and the Compose Plugin

Do not copy an unattributed one-line install script. Below is the complete manual procedure for **Ubuntu / Debian**, with every command explained. Other distributions, Windows and macOS are linked at the end.

### 2.1 Update the system and remove old packages

```bash
sudo apt update
sudo apt upgrade -y
```

Check for packages that **conflict** with the official ones (`docker.io`, `docker-compose`, `podman-docker`, `containerd`, `runc`) and remove them:

```bash
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)
```

`dpkg --get-selections` lists installed packages, `cut -f1` keeps the names, `apt remove` uninstalls them. If Docker was never installed this prints "unable to locate package" for each name — **that is expected**.

### 2.2 Install the prerequisites

```bash
sudo apt install -y ca-certificates curl
```

- `ca-certificates`: root certificates so HTTPS identities can be verified.
- `curl`: used to fetch Docker's GPG public key.

### 2.3 Add Docker's official GPG key

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

- `install -m 0755 -d`: creates the keyring directory with mode `rwxr-xr-x`.
- `curl -fsSL`: `-f` fails silently on HTTP errors, `-s` silent, `-S` still prints errors, `-L` follows redirects; `-o` sets the output path.
- `chmod a+r`: **required**, otherwise `apt update` cannot read the key.

If `curl` fails, use `wget`:

```bash
sudo wget -O /etc/apt/keyrings/docker.asc https://download.docker.com/linux/ubuntu/gpg
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 2.4 Add the official APT repository

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

- This is the **DEB822 format**, supported by Ubuntu 22.04+ and recent Debian.
- `Suites` reads your release codename dynamically (`jammy`, `noble`, `bookworm`) so the repository matches your system; you may hard-code it instead.
- `Signed-By` makes every package from this repository signature-verified.

:::warn Debian users
On Debian use `https://download.docker.com/linux/debian` and the codename from `VERSION_CODENAME`. Everything else is identical.
:::

### 2.5 Install the engine and Compose

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

| Package | Purpose |
| --- | --- |
| `docker-ce` | Community Edition engine |
| `docker-ce-cli` | The `docker` command-line client |
| `containerd.io` | Low-level container runtime |
| `docker-buildx-plugin` | Multi-platform image builds |
| `docker-compose-plugin` | The Compose v2 plugin |

### 2.6 Start and verify

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

`active (running)` means healthy (press `q` to leave). Then:

```bash
sudo docker run --rm hello-world
```

`Hello from Docker!` means the environment works.

### 2.7 Configure a registry mirror (mainland China)

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://hub.rat.dev",
    "https://dockerproxy.net"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep -A5 "Registry Mirrors"
```

:::warn Third-party mirrors
These are **community-run services**; availability, rate limits and trustworthiness change over time and any of them may disappear. Use them only for **public images**, never for private images or credentials. If one fails, remove it and restart Docker. For production, prefer your own registry (for example Harbor) or a cloud container registry.
:::

Prefixing an image name (for example `docker run docker.1ms.run/hello-world`) works but the pulled image carries the prefix and is treated as a **different image**, causing duplicate pulls and wasted disk. Not recommended long term.

### 2.8 About the docker group

```bash
sudo usermod -aG docker $USER
# log out and back in (or run newgrp docker)
```

:::warn This is equivalent to granting host root
Such a user can mount any directory, run privileged containers and rewrite iptables. Acceptable on a personal machine, **a real decision on a shared server**. See [System Hardening](/en/tutorials/ops/system-security).
:::

### 2.9 Official entry points for other platforms

| Platform | Official entry point |
| --- | --- |
| Linux (all distributions) | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Compose plugin on Linux | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

After installing, confirm two things: **the daemon works**, and **Compose is the v2 plugin (`docker compose`, with a space)**.

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::warn A word about the docker group
On Linux, adding a user to the `docker` group removes the need for `sudo`, but **it is equivalent to granting that user host root**: they can mount any directory and start privileged containers. Acceptable on a personal machine, a real decision on a shared server. See [System Hardening](/tutorials/ops/system-security).
:::

## 3. The Image: `itzg/minecraft-server`

The most widely used Java Edition community image is **`itzg/minecraft-server`** (actively maintained, thoroughly documented, and able to run Vanilla, Paper, Purpur, Fabric, NeoForge, Forge and more). It turns "download the core, generate the config, accept the EULA, enable RCON" into environment variables.

```bash
docker pull itzg/minecraft-server
```

:::warn Pick images by provenance, and pin the tag
Pull only from official or long-maintained sources, and **never leave `latest` in production** — a later `pull` can silently swap in a new version, leaving you unable to tell whether the config changed or the version did. If you want to track the newest release, write the version explicitly and back up before upgrading.
:::

## 4. A Complete `docker-compose.yml`

Create a directory (for example `~/mcsog-java`) and put this file in it:

```yaml
services:
  minecraft:
    image: itzg/minecraft-server
    container_name: mcsog-java
    ports:
      - "25565:25565/tcp"
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      VERSION: "1.21.11"
      MEMORY: "4G"
      ONLINE_MODE: "TRUE"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "change-me-to-a-long-random-string"
      TZ: "Asia/Shanghai"
    volumes:
      - mcsog-java-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  mcsog-java-data:
    name: mcsog-java-data
```

Compose v2 **no longer needs** a top-level `version:` key; if you add one it is ignored (some versions print a notice).

Field by field:

| Field | Purpose |
| --- | --- |
| `image` | Which image to use. Omitting the tag means `:latest`, which is not recommended |
| `container_name` | A fixed container name, so `logs` / `exec` / `attach` are easy to type instead of an auto-generated name |
| `ports` | `host port:container port/protocol`. Java Edition is **TCP 25565**; writing `"25565:25565/tcp"` removes any ambiguity |
| `environment` | The settings the image reads, listed in section 6 |
| `volumes` | `volume name:/data`. **The world, plugins and configs all live in `/data`** — the only irreplaceable part of this deployment |
| `stdin_open: true` | Keeps the container's standard input open; without it you cannot **type** into the server console |
| `tty: true` | Allocates a pseudo-terminal so the console behaves like a real interactive one (used together with `docker attach`) |
| `restart: unless-stopped` | Restarts after a crash or a host reboot, but **not after you run `docker compose stop`**, which is what most people expect |

The explicit `name: mcsog-java-data` in the `volumes` section makes the volume name **predictable**. Without it Compose prefixes the project name (something like `mcsogjava_mcsog-java-data`), and backup commands easily point at the wrong volume.

:::note `EULA=TRUE` is a legal requirement, not a technical switch
`EULA: "TRUE"` states that **you have read and accepted the [Minecraft End User License Agreement](https://aka.ms/MinecraftEULA)**. It is a precondition for using the server software; the image merely writes your statement into `eula.txt`. Leave it out (or set it to `FALSE`) and the server exits immediately after starting. Read the agreement before you set it.
:::

:::tip Run a health check after every edit
Run `docker compose config` whenever you touch the compose file: it expands and prints ports, volumes and environment variables, and reports mistakes on the spot instead of making you dig through the log after a start.
:::

```bash
docker compose config
```

## 5. Networking and Firewall (the easiest place to get burned)

This is the most important section of the guide. Docker's networking behaviour is **nothing like "install software, open a port"**. Most cases of "the firewall is configured but the port is still reachable", "the internal network suddenly breaks" and "it worked on one machine and not another" trace back to here.

### 5.1 The host firewall cannot control Docker

**Short version: your `ufw`, `firewalld` and hand-written `iptables` rules have no effect on ports published by Docker containers.**

Why:

- When the Docker daemon starts, it **creates its own** `iptables` rules: the `DOCKER` chain in the `nat` table, and the `DOCKER`, `DOCKER-ISOLATION` and `DOCKER-USER` chains in the `filter` table.
- These rules are inserted **ahead of** the host firewall rules (at the very top of the `FORWARD` chain), and Docker adds its own ACCEPT rules.
- The packet is therefore handled by Docker's rules before it ever reaches your `ufw` rules.

Verify it yourself (**worth doing once — it sticks**):

```bash
# 1. Explicitly deny the port
sudo ufw deny 25565/tcp

# 2. Confirm the rule is active
sudo ufw status numbered

# 3. Start a container publishing that port
docker run -d --name test-web -p 25565:80 nginx

# 4. From another machine:
#    telnet your.public.ip 25565
#    → it succeeds. ufw was completely bypassed.
```

### 5.2 The four correct approaches

**Approach 1 — bind the port to loopback (recommended, safest and simplest)**

```yaml
services:
  mc:
    ports:
      - "127.0.0.1:25565:25565/tcp"
```

With the `127.0.0.1:` prefix the host only listens on the **loopback interface**, so the port is **unreachable from the internet**. Expose it through a reverse proxy on the host instead:

```nginx
# /etc/nginx/nginx.conf (stream module, layer 4)
stream {
    upstream mc_backend {
        server 127.0.0.1:25565;
    }
    server {
        listen 25565;
        proxy_pass mc_backend;
        proxy_timeout 300s;
    }
}
```

Now firewall rules become meaningful again: the outside can only reach Nginx, which forwards to the container on loopback. **The same works for Bedrock (UDP) — just use `listen 19132 udp;`.**

**Approach 2 — use the `DOCKER-USER` chain**

`DOCKER-USER` is reserved by Docker for you and is **never overwritten by Docker itself**, which makes it the right place for source restrictions:

```bash
# Allow only a specific source to reach 25565, drop everything else
sudo iptables -I DOCKER-USER -p tcp --dport 25565 ! -s 203.0.113.0/24 -j DROP

# Inspect the rules
sudo iptables -L DOCKER-USER -n --line-numbers
```

Notes:

- Use `-I` (insert at the top), not `-A`, so an earlier ACCEPT rule cannot win.
- Rules are **lost on reboot**; persist them with `iptables-persistent` or a boot script.
- This chain only sees **forwarded** traffic, so it does not apply to `host` networking (see 5.4).

**Approach 3 — use [ufw-docker](https://github.com/chaifeng/ufw-docker) so UFW governs containers again (recommended if you want UFW to stay your single entry point)**

The first two approaches either change how you bind ports (approach 1) or make you maintain iptables rules yourself (approach 2). **If you want to keep managing every firewall rule with `ufw` alone**, this script is the least effort.

It does not bypass or disable anything: it **wires Docker's reserved `DOCKER-USER` chain back into UFW's forward chain**, so `ufw route` can govern container ports directly.

**Install (three commands)**:

```bash
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
sudo ufw-docker install
```

`ufw-docker install` **backs up** `/etc/ufw/after.rules` and **appends** rules to the end of it (the key line is `-A DOCKER-USER -j ufw-user-forward`). It does **not** touch your Docker configuration — Docker keeps managing its own networks.

Check it:

```bash
ufw-docker check     # are the rules in place?
ufw-docker status    # what forward rules are currently allowed?
```

:::warn Reboot the server once after installing
The author explicitly notes that **the rules sometimes do not take effect after restarting UFW**; rebooting the server fixes it. Plan a maintenance window on production.
:::

**Day to day** (Java Edition, port 25565):

```bash
# Allow the outside to reach container port 25565 (the CONTAINER port, not the host port)
sudo ufw route allow proto tcp from any to any port 25565

# Revoke it
sudo ufw route delete allow proto tcp from any to any port 25565

# Rules for one container
ufw-docker list mc

# Convenience helpers keyed by container name
sudo ufw-docker allow mc 25565
sudo ufw-docker allow mc 25565/tcp
sudo ufw-docker delete allow mc 25565
```

**Bedrock (UDP) works the same way**:

```bash
sudo ufw route allow proto udp from any to any port 19132
sudo ufw-docker allow mc-bedrock 19132/udp
```

**When container IPs change** (after recreating a container):

```bash
sudo ufw-docker reload
```

**Why `ufw route` (forward chain) rather than `ufw allow` (input chain)**:

| Command | Scope | Risk |
| --- | --- | --- |
| `ufw allow 25565` | Opens 25565 on **both** the host and containers | May expose a host service you did not mean to expose |
| `ufw route allow … port 25565` | Only traffic **forwarded** to containers | The host's own 25565 stays closed — a clearer boundary |

**Optional: customise which subnets may reach containers**

By default only the standard private ranges are trusted (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). If your LAN differs:

```bash
# Auto-detect every Docker network subnet (re-run after adding/removing networks)
sudo ufw-docker install --docker-subnets

# Or specify explicitly
sudo ufw-docker install --docker-subnets 192.168.207.0/24 10.207.0.0/16
```

**Uninstalling**:

```bash
sudo ufw-docker uninstall   # restores the UFW config and removes installed files
```

**Trade-offs**:

| | Notes |
| --- | --- |
| ✓ Docker's iptables stays enabled | Containers still reach the internet; new Docker networks need no manual rules |
| ✓ One tool for everything | Host ports via `ufw allow`, container ports via `ufw route allow`, all visible in `ufw status` |
| ✓ IPv6 and Swarm | Updates `after6.rules` when needed; Swarm can be managed from a manager node |
| ✗ Third-party script | Not shipped by Docker or Canonical; watch upgrades yourself (the script is short — read it once) |
| ✗ Container port, not host port | With `-p 8080:80` use `80`, not `8080` — the most common mistake |
| ✗ Reboot needed after first install | See the warning above |

**Approach 4 — disable Docker's iptables management (not for beginners)**

```json
// /etc/docker/daemon.json
{
  "iptables": false
}
```

Then `sudo systemctl restart docker`. The cost:

- **Port publishing (`-p`) stops working**, because NAT rules are no longer generated;
- Containers cannot reach the internet by default (you must write SNAT yourself);
- Cross-bridge container communication is affected too.

Only do this if you fully intend to own the NAT rules.

### 5.3 The three ways to publish a port

| Form | Listens on | Who can reach it | When to use |
| --- | --- | --- | --- |
| `-p 25565:25565` | `0.0.0.0` (every interface) | **The whole internet plus the LAN** | Only when a cloud security group is your real boundary |
| `-p 127.0.0.1:25565:25565` | Loopback only | **This host only** | **Recommended**: pair with a reverse proxy or SSH tunnel |
| `-p 192.168.1.10:25565:25565` | A specific interface | That subnet only | LAN-only servers |

**Key point**: `-p 25565:25565` binds `0.0.0.0` by default, so **publishing a port means opening it to the internet**. Many people assume "I did not touch the firewall, so it is closed" — in fact the port is wide open. A cloud security group is a separate layer, not a substitute for the host firewall.

### 5.4 Choosing among the five network modes

| Mode | Description | Pros | Cons | When to use |
| --- | --- | --- | --- | --- |
| `bridge` (default) | Containers attach to the `docker0` bridge and NAT out | Good isolation, controllable ports | An extra NAT layer; only reachable when published | **The vast majority of cases** |
| `host` | The container **uses the host network stack** directly, no bridge, no NAT | Best performance, lowest latency | **No network isolation**; port conflicts; `-p` is ignored; Docker's firewall rules do not apply | Extreme performance or awkward port needs |
| `macvlan` | The container gets its own MAC and LAN IP, looking like a real machine on the LAN | **Directly discoverable on the LAN** (Bedrock LAN list, Java LAN broadcast) | Needs switch/router support; some clouds forbid it | LAN play, broadcast discovery |
| `overlay` | Virtual network across hosts (Swarm) | Multi-host clusters | High complexity | Multi-host deployments |
| `none` | No network | Full isolation | No connectivity | Offline compute jobs |

```yaml
# host mode example (note: the ports section becomes meaningless)
services:
  mc:
    network_mode: host
    environment:
      SERVER_PORT: "25565"
```

:::warn In host mode the firewall does apply — but so does the whole port
`host` mode does not go through Docker's NAT rules, so `ufw` **can** block the port here. But the container occupies the host port directly, so **as soon as the server listens, the internet can connect**; security depends entirely on your host firewall and security group. Double-check the rules before using it.
:::

### 5.5 `docker0` subnet conflicts (the number one cause of "the internal network broke")

Docker gives the `docker0` bridge **`172.17.0.0/16`** by default, and each additional custom network takes `172.18.0.0/16`, `172.19.0.0/16` and so on.

**The problem**: if your **corporate LAN, VPN or cloud private network** also uses `172.17.x.x`, the host ends up with two routes for the same range. Symptoms:

- Containers time out reaching internal services;
- The host reaches some internal addresses intermittently;
- SSH sessions to other machines drop.

**Diagnose**:

```bash
ip route | grep 172
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**Fix** (change Docker's default address pool; **this restarts Docker and briefly interrupts every container**):

```json
// /etc/docker/daemon.json
{
  "default-address-pools": [
    { "base": "10.201.0.0/16", "size": 24 }
  ]
}
```

```bash
sudo systemctl restart docker
# Existing custom networks are not changed automatically; delete and recreate them
docker network ls
docker network rm <network-name>
```

Pick a pool that **avoids every network you actually use** (commonly parts of `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`). If `10.x` is taken, `100.64.0.0/16` (carrier-grade NAT) is a good alternative.

### 5.6 How containers talk to each other

**Inside one custom network, use the service name as the hostname — never `localhost`.**

```yaml
services:
  mc:
    networks: [mcnet]
  backup:
    networks: [mcnet]
    environment:
      TARGET: "mc:25565"          # correct: the service name
      # TARGET: "127.0.0.1:25565" # wrong: that is the backup container itself
networks:
  mcnet:
    driver: bridge
```

Additional points:

- The **default `bridge` network has no service-name resolution**; create your own network (`docker network create`, or Compose's `networks`). Compose creates a project network automatically, so Compose users are usually fine.
- **Container IPs change when containers are recreated**, so never hard-code an IP — always use the service name.
- To reach a service **on the host** (for example a host MySQL), use `host.docker.internal` (on Linux add `host-gateway` via `extra_hosts`), or run with `--network host`.

### 5.7 Networking troubleshooting table

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ufw` allow/deny changes nothing for container ports | Docker bypasses the host firewall | Use `-p 127.0.0.1:` or the `DOCKER-USER` chain |
| A port is reachable from the internet although you never opened it | `-p` binds `0.0.0.0` by default | Use `-p 127.0.0.1:host:container` |
| Containers time out reaching internal services | `docker0` subnet collides with the LAN | Change `default-address-pools` and recreate networks |
| Bedrock server invisible in the LAN list | `bridge` mode does not forward broadcasts | Use `macvlan` or `host` mode |
| Connection address breaks after recreating a container | The container IP changed | Use the service name, not an IP |
| Container cannot reach a service on the host | `localhost` means the container itself | Use `host.docker.internal` or host networking |
| `ports` ignored in `host` mode | `host` mode does not use port mapping | Change the server's listening port instead |
| Occasional stalls or timeouts on large transfers | MTU mismatch (some clouds) | Set `"mtu": 1400` in `daemon.json`, or the vendor's recommended value |
| `DOCKER-USER` rules vanish after reboot | iptables rules are not persisted | Use `iptables-persistent` or a boot script |

### 5.8 A safe exposure checklist

Work through this list in order; any missing item means "you think it is closed, but it is actually open":

1. **Cloud security group**: allow only the ports and sources you truly need (prefer a fixed source over `0.0.0.0/0`).
2. **Port binding**: `-p 127.0.0.1:...`, not `-p ...`.
3. **Reverse proxy**: expose through Nginx `stream` / frp, keeping the container port on the host.
4. **Host firewall**: still effective for **non-container** services — configure it as usual.
5. **Test from outside**: run `telnet your.public.ip port` from **another machine**, or use an online port scanner, and confirm that ports you did not open are indeed unreachable.
6. **Never publish RCON to the internet** (see the note under the environment variable table in §7).

## 6. Starting, Logs, Console and Shutdown

```bash
docker compose up -d
```

The first start downloads the server core and generates the world, so **anything from a few minutes to a quarter of an hour is normal**. It has not hung:

```bash
docker compose logs -f
```

A line such as `Done (xx.xxxs)! For help, type "help"` means it is up. `Ctrl+C` only stops following the log; **it does not stop the server**.

Run commands in the console. The image bundles `rcon-cli`, which logs in with `RCON_PASSWORD` automatically:

```bash
docker compose exec -it mcsog-java rcon-cli
docker compose exec -it mcsog-java rcon-cli list
docker compose exec -it mcsog-java rcon-cli save-all
```

For a genuinely interactive console (continuous typing, live output), attach to the container:

```bash
docker attach mcsog-java
```

:::warn Two key traps when using attach
Inside `docker attach`, `Ctrl+C` delivers an interrupt to the server process, which **shuts it down** (and can corrupt the save). Detach properly with `Ctrl+P` followed by `Ctrl+Q`, which leaves the container running. For one-off commands, prefer `rcon-cli`.
:::

Stopping and removing:

```bash
docker compose stop
docker compose down
```

| Command | What it does | Data in the volume |
| --- | --- | --- |
| `docker compose stop` | Stops the container; the container still exists | Kept |
| `docker compose start` | Starts the stopped container again | Kept |
| `docker compose down` | Stops and **deletes the container and network** | Kept |
| `docker compose down -v` | All of the above **plus deleting the volumes** | **Gone** |

:::danger Do not add `-v` out of habit
`docker compose down -v` deletes the `/data` volume, taking the world, plugins and configs with it. Use it only when you intend a complete reset and you already hold a restorable backup.
:::

## 7. The Environment Variables Used Here

The table lists the variables from the compose file above, plus a few common extras. **Defaults change between image versions, so always confirm against the image's official documentation.**

| Variable | Purpose | Example value |
| --- | --- | --- |
| `EULA` | States that you accept the Minecraft EULA; startup fails without it | `"TRUE"` |
| `TYPE` | Server core type | `"PAPER"`, `"VANILLA"`, `"FABRIC"`, `"NEOFORGE"` |
| `VERSION` | Minecraft version, which must be one the core supports | `"1.21.11"`, `"LATEST"` |
| `MEMORY` | JVM heap given to the server | `"4G"` |
| `ONLINE_MODE` | Whether to verify premium accounts (maps to `online-mode`) | `"TRUE"` / `"FALSE"` |
| `ENABLE_RCON` | Enables the RCON remote console | `"true"` |
| `RCON_PASSWORD` | RCON password; **always replace it with a strong one** | a long random string |
| `RCON_PORT` | RCON listen port (default 25575, **never publish it to the internet**) | `"25575"` |
| `TZ` | Container time zone, which drives log timestamps | `"Asia/Shanghai"` |
| `DIFFICULTY` | Game difficulty | `"normal"` |
| `MOTD` | Description shown in the server list | `"MCSOG Java"` |
| `MAX_PLAYERS` | Maximum player count | `"20"` |
| `OPS` | Comma-separated player names granted operator status | `"Alice,Bob"` |
| `WHITELIST` | Comma-separated whitelist entries | `"Alice,Bob"` |
| `ENFORCE_WHITELIST` | Whether the whitelist is enforced | `"TRUE"` |
| `PUID` / `PGID` | Run as a specific user and group, useful for bind-mount ownership (**confirm the usage in the image documentation**) | `"1000"` |

:::note RCON is administrative power without a UI
`ENABLE_RCON: "true"` only listens on `25575` inside the container. **Never publish `25575` to the internet**: the RCON protocol is unencrypted, so the password alone buys a console. For remote administration, use an SSH tunnel or a panel instead; see [Network Security Fundamentals](/tutorials/ops/network-security).
:::

## 8. What Lives in `/data`

Containers are disposable; volumes are not. All of the following sit in `/data`:

| Path | Contents |
| --- | --- |
| `/data/world/` | The overworld save (the Nether and the End have their own directories) |
| `/data/plugins/` | Plugin jars and their configuration |
| `/data/mods/` | Mods (used when `TYPE` is a modded core) |
| `/data/server.properties` | Server configuration (port, difficulty, `online-mode`, and so on) |
| `/data/eula.txt` | The EULA statement written from the `EULA` variable |
| `/data/logs/` | Server logs |

So: **delete containers freely, never delete the volume.** To find it:

```bash
docker volume ls
docker volume inspect mcsog-java-data
```

## 9. Backup and Restore

You back up `/data`, not the container. The safest approach stops the server first:

```bash
mkdir -p backups
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/mcsog-java-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker compose start
```

On Windows PowerShell, use `-v "${PWD}\backups:/backup"` instead (with Docker Desktop).

If the server must stay online, keep the copy consistent with console commands:

```bash
docker compose exec -it mcsog-java rcon-cli save-all
docker compose exec -it mcsog-java rcon-cli save-off
```

`save-all` flushes in-memory data to disk and `save-off` disables automatic saving, so nothing new is written while you archive. Turn saving back on afterwards:

```bash
docker compose exec -it mcsog-java rcon-cli save-on
```

To restore, **stop the container first**, then empty the volume and unpack (this overwrites whatever the volume currently holds):

```bash
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-java-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn A container is not a backup
Running the server in a container does **not** make the data safe. The volume and the container share one disk, so an accidental volume deletion, a failing disk or ransomware takes both. Keep at least one copy **offline or offsite**; see [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup). **A backup you have never restored is not a backup.**
:::

## 10. Updating the Image, Switching Core or Version

Upgrading the image (for a bug fix or a new release):

```bash
docker compose pull
docker compose up -d
```

The order matters: **back up, then pull, then up**. When `docker compose up -d` sees a changed image or configuration it recreates the container, and the volume is reattached unchanged, so the world survives — provided you did not delete the volume.

To change the core type or version, edit the environment variables and run `up -d` again:

```yaml
    environment:
      TYPE: "FABRIC"
      VERSION: "1.21.11"
```

| Change | What happens | Watch out for |
| --- | --- | --- |
| `VERSION` only | The image downloads the new core | **Save upgrades are one-way**: an older version usually cannot open a newer world. Back up before upgrading |
| `TYPE` between plugin cores | A different core jar, same `plugins/` | Plugins must be compatible with the core and version |
| `TYPE` from a plugin core to a modded core | The server starts reading `mods/` | Existing `plugins/` stop taking effect, and the world may need extra handling |
| `MEMORY` | Container is recreated with a new heap size | Do not exceed a sensible share of the host's available memory |

## 11. Adding Plugins and Mods

Pick whichever of the three approaches you prefer.

**Option A: bind mount (easiest for editing files)**

Point the volume at a host directory:

```yaml
    volumes:
      - ./data:/data
```

Now you can work directly with `./data/plugins/` and `./data/server.properties` on the host. On Linux, mind the ownership issue described in section 11.

**Option B: copy files into the volume (keeps the named volume)**

```bash
docker cp ./MyPlugin.jar mcsog-java:/data/plugins/
docker compose restart
```

**Option C: let the image download them**

The image also offers variables that fetch plugins or mods from a source (for example installing plugins by Spiget resource id, or mods by Modrinth project). Those variable names and values are **subject to the image's official documentation** — check them before relying on them.

After changing configuration, many plugins support an in-game reload, but **a restart is the reliable option**:

```bash
docker compose restart
```

## 12. Common Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Exits immediately and the log mentions the EULA | `EULA: "TRUE"` is missing | Add the variable and run `docker compose up -d` |
| The container is killed and the log shows OOM | `MEMORY` exceeds what the host can provide | Lower `MEMORY` or add RAM, and leave headroom on the host |
| The internet cannot connect while the container looks healthy | Port not published, or the security group / firewall is closed | Publish `25565/tcp` and open **both** the cloud security group and the host firewall; see [Deploying to a Reachable Environment](/tutorials/java/deploy) |
| The container cannot write `/data`, with permission errors in the log | Bind-mount ownership does not match the user inside the container | Fix the host directory ownership, or use the image's user-mapping variables (`PUID`/`PGID`, **subject to the image documentation**) |
| The world is "gone" after recreating the container | The volume was deleted (for example `down -v`), or `/data` was never mounted | Stop and restore from a backup; from now on pin the volume name and include it in backups |
| You cannot type in the console | `stdin_open: true` and `tty: true` are missing | Add both and recreate the container |
| `docker compose` is not recognised | An old v1 `docker-compose` is installed | Install the Compose v2 plugin per the official docs; the command is `docker compose` |
| A configuration change had no effect | The file changed but the container was not recreated | Run `docker compose up -d` so the change takes effect |

For day-to-day checks (container state, resource usage, free disk), pair this with [Monitoring and Alerting](/tutorials/ops/monitoring).

## 13. Next Steps

- Learn the server directory and its files: [Server Structure](/tutorials/java/structure)
- The full first-launch walkthrough: [Starting the Server](/tutorials/java/start)
- Backup strategy for worlds, plugins and configs: [Backup and Restore](/tutorials/java/backup)
- Diagnosing lag and tuning parameters: [Performance Tuning](/tutorials/java/optimize)
- Managing several servers from one panel: [Using and Securing Panel Tools](/tutorials/ops/panels)

---

> Image names, environment variables and default ports are subject to the image's official documentation.
