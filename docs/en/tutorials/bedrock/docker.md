---
title: Deploying a Bedrock Edition Server with Docker
slug: docker
cat: bedrock
level: 3
order: 7
minutes: 16
tags: [docker, compose, bedrock-edition, bds, udp, server, container, backup]
updated: 2026-10-04
draft: false
---

The official Bedrock server is **BDS**. It has no plugin system and a simple directory layout, which makes it a natural fit for a container: the image downloads the official BDS build, accepts the EULA and maps the ports, while you maintain one volume and one `docker-compose.yml`.

This tutorial covers **running BDS inside a container**. For the BDS directory layout, its memory behaviour and its known rough edges, see [The BDS Server](/tutorials/bedrock/bds).

:::warn Remember one thing first: Bedrock is UDP
Java Edition uses **TCP 25565**; Bedrock uses **UDP 19132** (and `19133/udp` for IPv6). **Publishing or allowing only TCP produces the symptom "the server is clearly running but nobody can connect", with no error anywhere.** This is the single most common Bedrock hosting mistake, and this tutorial will keep repeating it.
:::

## 1. Why Containerise

| Benefit | What it looks like in practice |
| --- | --- |
| **Clean environment** | BDS is a binary; the container packages it together with its runtime, so the host needs no dependencies at all |
| **Reproducibility** | Version, ports, game mode, difficulty and level name all live in one file that you can carry to another machine |
| **Easy rollback** | Back up `/data` before an upgrade; if something breaks, set `VERSION` back and restart |
| **Clean removal** | Delete the container and the volume and nothing is left behind on the host |
| **Consistency across platforms** | Microsoft ships BDS for Windows and Linux only; running the Linux build in a container on Windows gives you exactly the same workflow as on a server |

The costs are real too:

| Cost | Explanation |
| --- | --- |
| **One more layer to learn** | Images, containers, volumes and Compose are unavoidable, and debugging starts with `docker compose logs` |
| **Volume and backup discipline** | The world lives in a volume; a volume nobody backs up is a volume you have already lost |
| **Performance overhead is small, not zero** | Networking gains a NAT hop and the filesystem gains an overlay layer. The real bottleneck is usually **BDS's single-threaded world simulation**, so the CPU allowance has to be adequate |
| **No plugin ecosystem** | BDS has no plugin support and a container does not change that; add-on content can only arrive as behaviour and resource packs in the data directory |

## 2. Installing Docker and the Compose Plugin

Install from the official documentation rather than an unattributed script:

| Platform | Official entry point |
| --- | --- |
| Linux (per distribution) | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Compose plugin on Linux | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::note Two paths on Windows
You can follow [Deploying Bedrock Dedicated Server on Windows](/tutorials/bedrock/windows-bds) and run the official executable directly, or use the container approach from this tutorial. The container approach has one advantage: **it works exactly like a Linux server**, so a later migration needs no relearning.
:::

## 3. The Image: `itzg/minecraft-bedrock-server`

The commonly used Bedrock community image is **`itzg/minecraft-bedrock-server`** (actively maintained, from the same ecosystem as the Java Edition image).

```bash
docker pull itzg/minecraft-bedrock-server
```

:::note How it relates to the official download
The official [BDS download page](https://www.minecraft.net/en-us/download/server/bedrock) hands you an archive that you unpack, configure and launch yourself. **The community image downloads the official BDS build for you at container start and writes your environment variables into `server.properties` and friends.**

Therefore: **the exact mechanism it uses to obtain BDS (download source, version resolution, caching) is subject to the image's official documentation**, and may change between image versions. If you want full control, download the official archive and follow [The BDS Server](/tutorials/bedrock/bds) instead.
:::

## 4. A Complete `docker-compose.yml`

```yaml
services:
  bedrock:
    image: itzg/minecraft-bedrock-server
    container_name: mcsog-bedrock
    ports:
      - "19132:19132/udp"
      - "19133:19133/udp"
    environment:
      EULA: "TRUE"
      SERVER_NAME: "MCSOG Bedrock"
      GAMEMODE: "survival"
      DIFFICULTY: "normal"
      LEVEL_NAME: "MCSOG"
      ONLINE_MODE: "TRUE"
      TZ: "Asia/Shanghai"
    volumes:
      - mcsog-bedrock-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  mcsog-bedrock-data:
    name: mcsog-bedrock-data
```

Compose v2 does **not** need a top-level `version:` key.

| Field | Purpose |
| --- | --- |
| `image` | The image to use; pin the tag in production instead of tracking `latest` forever |
| `container_name` | A fixed name that makes `logs` and `attach` easy to type |
| `ports` | **The `/udp` suffix is mandatory.** `19132` is the IPv4 port and `19133` the IPv6 port (skip the latter if you serve no IPv6 clients, but publishing it does no harm) |

:::warn Docker bypasses the host firewall (Bedrock included)
`ufw` and `firewalld` rules are **ineffective against ports published by Docker containers**: Docker inserts its own `iptables` rules ahead of the host firewall, so `ufw deny 19132/udp` cannot stop outside access either.

Bedrock uses **UDP**, which is easy to overlook, so tighten it as follows:

1. **Bind the port to loopback** (recommended): `-p 127.0.0.1:19132:19132/udp`, then let a reverse proxy on the host expose it;
2. Use the `DOCKER-USER` chain for source restrictions;
3. Rely on your **cloud security group** as the outer layer (it is unaffected by Docker).

Also note: if you want the server to appear in the **LAN list** (Bedrock discovers servers over UDP broadcast), `bridge` mode cannot do it — you need `macvlan` or `host` networking.

Full details (address-pool conflicts, network mode comparison, troubleshooting table): [Deploying Java Edition with Docker → Networking and Firewall](/en/tutorials/java/docker#5-networking-and-firewall-the-easiest-place-to-get-burned).
:::
| `environment` | The settings the image reads, listed in section 6 |
| `volumes` | `volume name:/data`. **The world, configuration and add-ons all live in `/data`** |
| `stdin_open: true` | Keeps standard input open, without which you cannot **type commands** into the BDS console |
| `tty: true` | Allocates a pseudo-terminal so `docker attach` gives you an interactive console |
| `restart: unless-stopped` | Restarts after a crash or host reboot, but not after you run `docker compose stop` |

The explicit `name:` in the `volumes` section makes the volume name **predictable** (otherwise Compose prefixes the project name), so backup commands cannot point at the wrong volume.

:::note `EULA=TRUE` is a legal requirement
`EULA: "TRUE"` states that **you have read and accepted the [Minecraft End User License Agreement](https://aka.ms/MinecraftEULA)**. Without it BDS exits immediately after starting and the container enters a restart loop.
:::

:::tip Run a health check before starting
Run `docker compose config` whenever you touch the compose file: it expands and prints ports, volumes and environment variables, and reports mistakes on the spot. **A missing `/udp` shows up right here.**
:::

```bash
docker compose config
```

## 5. Starting, Logs, Console and Shutdown

```bash
docker compose up -d
```

The first start downloads BDS, so give it time:

```bash
docker compose logs -f
```

A line such as `[INFO] Server started.` means it is up. `Ctrl+C` only stops following the log; it does not stop the server.

Bedrock has **no RCON**, so there is no `rcon-cli`; the only way into the console is `attach`:

```bash
docker attach mcsog-bedrock
```

Once attached you can type BDS commands exactly as in a local window, for example:

```text
list
say hello
save hold
save resume
stop
```

:::warn Key traps when using attach
Inside `docker attach`, `Ctrl+C` delivers an interrupt to BDS, which **shuts the server down** (and can corrupt the save). Detach properly with `Ctrl+P` followed by `Ctrl+Q`, which leaves the container running. To actually stop the server, type the `stop` command and wait for the process to exit.
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
| `docker compose down` | Stops and deletes the container and network | Kept |
| `docker compose down -v` | All of the above **plus deleting the volumes** | **Gone** |

:::danger Do not add `-v` out of habit
`docker compose down -v` deletes the `/data` volume, taking the world with it. Use it only when you intend a full reset and already hold a restorable backup.
:::

## 6. The Environment Variables Used Here

| Variable | Purpose | Example value |
| --- | --- | --- |
| `EULA` | States that you accept the Minecraft EULA; startup fails without it | `"TRUE"` |
| `SERVER_NAME` | Server name (maps to `server-name`) | `"MCSOG Bedrock"` |
| `GAMEMODE` | Default game mode | `"survival"` / `"creative"` |
| `DIFFICULTY` | Game difficulty | `"normal"` / `"peaceful"` |
| `LEVEL_NAME` | Level (world) name, which **also decides the folder name under `worlds/`** | `"MCSOG"` |
| `ONLINE_MODE` | Whether to verify Xbox Live accounts | `"TRUE"` / `"FALSE"` |
| `TZ` | Container time zone, which drives log timestamps | `"Asia/Shanghai"` |
| `VERSION` | Pin a specific BDS version; omitting it normally tracks the latest | `"LATEST"` |
| `SERVER_PORT` | IPv4 listen port (default 19132) | `"19132"` |
| `SERVER_PORT_V6` | IPv6 listen port (default 19133) | `"19133"` |
| `MAX_PLAYERS` | Maximum player count | `"20"` |
| `VIEW_DISTANCE` | View distance | `"12"` |
| `LEVEL_SEED` | World seed | a number or string |
| `ALLOW_LIST` | Whether the allow list is enabled | `"true"` / `"false"` |

:::note Defaults move
The defaults in brackets above match the usual BDS configuration, but **an image release may change them, so always confirm against the image's official documentation**. The production rule is simple: **write every setting that matters explicitly** rather than relying on a default.
:::

:::warn Non-ASCII server names
`SERVER_NAME` accepts non-ASCII text, but some older clients render it as mojibake. When players report broken characters, switch to a plain ASCII name first. Keep `LEVEL_NAME` ASCII as well: it becomes a directory name, and special characters only create trouble.
:::

## 7. What Lives in `/data`

| Path | Contents |
| --- | --- |
| `/data/worlds/<LEVEL_NAME>/` | **The world save** (`db/`, `level.dat`, `level_name.txt` and so on) |
| `/data/server.properties` | Server configuration (ports, difficulty, game mode, allow-list toggle) |
| `/data/allowlist.json` | Allow-list data |
| `/data/permissions.json` | Operator (OP) data |
| `/data/valid_known_packs.json` | The list of known add-on packs |
| `/data/behavior_packs/`, `/data/resource_packs/` | Behaviour and resource packs (where add-on content lands) |

All BDS saves live **under `worlds/`**, one directory per world. Whatever you put in `LEVEL_NAME` becomes the directory name:

```text
/data/worlds/MCSOG/db/
```

:::warn Changing `LEVEL_NAME` switches worlds
When `LEVEL_NAME` changes, BDS looks for the new directory name; if it is missing, it **generates a brand-new empty world**, so the old one appears to have vanished (it is still in the volume). Confirm the save directory name before changing this value.
:::

## 8. Backup and Restore

You back up `/data`, with `/data/worlds/` as the priority. The safest approach stops the server first:

```bash
mkdir -p backups
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/mcsog-bedrock-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker compose start
```

On Windows PowerShell, use `-v "${PWD}\backups:/backup"` instead (with Docker Desktop).

If the server cannot go offline, BDS has its own consistency commands (typed into the console via `docker attach`):

```text
save hold
save query
```

`save hold` pauses writes and keeps the files consistent, and `save query` lists the files that need copying. Resume afterwards:

```text
save resume
```

:::note Why the Java Edition recipe does not transfer
Java Edition uses `save-all` / `save-off` / `save-on`; Bedrock BDS uses **`save hold` / `save query` / `save resume`**, and the two sets are not interchangeable. Stopping the server works for both and is the least error-prone option.
:::

To restore, stop the container first, then empty the volume and unpack:

```bash
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-bedrock-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn A container is not a backup
The volume and the container share one disk, so an accidental volume deletion, a failing disk or ransomware takes both. Keep at least one copy **offline or offsite**; see [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup). **A backup you have never restored is not a backup.**
:::

## 9. Updating the Image and the BDS Version

```bash
docker compose pull
docker compose up -d
```

The order still matters: **back up, then pull, then up**.

| Change | What happens | Watch out for |
| --- | --- | --- |
| `docker compose pull` | Fetches a newer image | Nothing takes effect until `up -d` recreates the container |
| Setting `VERSION` | The image downloads that BDS build | Client and BDS versions must match; back up the world before upgrading |
| Leaving `VERSION` unset | Normally tracks the newest BDS | Convenient but **not reproducible**: when something breaks you cannot tell whether the version or the configuration changed |

:::note Version mismatch is the classic "cannot connect"
When a Bedrock client and the BDS build differ, players usually **see the server but cannot join**. Pinning `VERSION` gives you the same build on every restart; tracking the newest release means accepting that a restart may change it, so tell your players in advance.
:::

## 10. Add-on Content: BDS Has No Plugin System

BDS supports only the official **behaviour packs and resource packs**; there is no Bukkit-style plugin layer, and a container does not change that. If you need plugins, switch to a third-party server; see [The BDS Server](/tutorials/bedrock/bds) and [Third-Party Server Options](/tutorials/bedrock/third-party).

Where add-ons go:

| Content | Location |
| --- | --- |
| Behaviour packs | `/data/behavior_packs/` |
| Resource packs | `/data/resource_packs/` |
| World-specific packs | The matching directories under `/data/worlds/<LEVEL_NAME>/` |

**Option A: bind mount (easiest for editing files)**

```yaml
    volumes:
      - ./data:/data
```

Now you can work directly with `./data/behavior_packs/` on the host.

**Option B: copy into the volume**

```bash
docker cp ./MyAddon.mcpack mcsog-bedrock:/data/
docker compose restart
```

After changing configuration or packs, **restarting the container is the reliable move**:

```bash
docker compose restart
```

## 11. Performance and Memory: Two Bedrock-Specific Points

### 11.1 World simulation is single-threaded; do not starve the CPU

BDS performs entity and world simulation essentially on one thread, so **smoothness depends on single-core performance** and grows harder as the map grows. Container overhead itself is small, but **a CPU quota that is too low starves the server**: tick rate drops, players stutter and chunks load slowly.

```yaml
    cpus: "2.0"
```

:::warn Do not cap the CPU just to save resources
Unless you know exactly what else runs on the machine and have load-tested it, **do not set a CPU limit on a BDS container** (such as `cpus: "0.5"`). BDS's single-threaded nature makes it very sensitive to single-core clock speed and to having one core available whenever it needs it. For tuning, see [Performance Tuning](/tutorials/java/optimize).
:::

On memory:

```yaml
    mem_limit: "4g"
```

`mem_limit` is a hard ceiling, and **setting it below what the server actually needs gets the container OOM-killed** (which looks like the server restarting out of nowhere). If you are unsure, leave it unset, watch real usage with `docker stats`, and set it afterwards.

:::warn Never force-clear memory
BDS memory usage creeps up over time, and **do not use tools to force-clear it**: players downloading resource or add-on packs will hang at the progress bar. **The correct fix is a server restart**, which matches [The BDS Server](/tutorials/bedrock/bds).
:::

## 12. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The container **restarts in a loop** | EULA not accepted, an illegal `LEVEL_NAME`, a busy port, insufficient memory, an invalid `VERSION` | Start with `docker compose logs --tail=200`; the first screen of the log usually names the cause outright |
| The server runs but **nobody can connect** | Only TCP was published or allowed; the firewall or security group never opened **UDP** | Publish `"19132:19132/udp"` and open **UDP 19132 in both** the security group and the host firewall |
| It works on the LAN but not from the internet | Port forwarding or security-group problem | See [Deploying to a Reachable Environment](/tutorials/java/deploy) and [Router and Firewall](/tutorials/ops/router-firewall) |
| The world "disappeared" and a new map was generated | `LEVEL_NAME` changed, or the wrong volume is mounted | Set `LEVEL_NAME` back to the original name and confirm you are mounting the same volume |
| Players see the server but cannot join | Client and BDS versions differ, or the allow list / online verification blocks them | Pin `VERSION`, then check `ALLOW_LIST` and `ONLINE_MODE` |
| The container cannot write `/data` (Linux bind mount) | Host directory ownership does not match the user inside the container | Fix the directory ownership, or use the user-mapping mechanism documented by the image |
| The server restarts for no visible reason | A memory hard limit that is too low triggers OOM | Raise or remove `mem_limit` and watch `docker stats` |
| You cannot type in the console | `stdin_open: true` and `tty: true` are missing | Add both and recreate the container |

For day-to-day checks (container state, CPU and memory usage, free disk), pair this with [Monitoring and Alerting](/tutorials/ops/monitoring).

## 13. Next Steps

- The BDS directory layout and its known traps: [The BDS Server](/tutorials/bedrock/bds)
- Running the official executable on Windows: [Deploying Bedrock Dedicated Server on Windows](/tutorials/bedrock/windows-bds)
- Choosing a Bedrock server core: [Server Types](/tutorials/bedrock/type)
- General-purpose save backup methods: [Backup and Restore](/tutorials/java/backup)
- Managing several servers from one panel: [Using and Securing Panel Tools](/tutorials/ops/panels)

---

> Image names, environment variables and default ports are subject to the image's official documentation.
