---
title: "[JAVA] Troubleshooting FAQ"
slug: faq-java
cat: faq
level: 1
order: 1
minutes: 12
tags: [java, faq, troubleshooting, errors]
updated: 2026-10-04
draft: false
---

A roundup of the most common errors and pitfalls at every stage of running a Java Edition server — **look yours up by symptom**. Every entry names its source section, so click through when you need the details.

## 1. The server won't start

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| Exits **immediately** after starting, log mentions the EULA | EULA not accepted | Set `eula=true` in `eula.txt` | [Starting the server](/tutorials/java/start) |
| `UnsupportedClassVersionError ... class file version 65.0` | **Wrong Java version** (65 = Java 21) | Check the version table and install the matching Java | [Environment setup](/tutorials/java/environment) |
| `'java' 不是内部或外部命令` / `java: command not found` | Java is not installed, `PATH` is not configured, or **the terminal was never reopened** | Check `PATH`, then **open a new** terminal and try again | [Environment setup](/tutorials/java/environment) |
| Double-clicking the start script **flashes a window that vanishes** | The window closes automatically once an error is printed | Add `pause` at the end of the script, or run it from a terminal | [Starting the server](/tutorials/java/start) |
| `Address already in use` | Port 25565 is taken | Find the PID with `netstat -ano \| findstr :25565` (Windows) / `ss -tlnp \| grep 25565` (Linux), then kill it | [Environment setup](/tutorials/java/environment) |
| `Could not reserve enough space for object heap` | `-Xmx` exceeds available memory | Lower `-Xmx` | [Environment setup](/tutorials/java/environment) |
| First start hangs at `Downloading mojang_x.x.x.jar` | The runtime jar is being downloaded | Wait; if it stalls for a long time on a mainland-China connection, arrange your own acceleration | [Starting the server](/tutorials/java/start) |

## 2. Others can't connect

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| `telnet` works locally but others can't connect | **Only the local firewall was configured; the cloud security group is not open** | Add an inbound rule for `TCP 25565` in the cloud console | [Deploying to a reachable environment](/tutorials/java/deploy) |
| Port check reports closed | The port does not listen while the server is **not running** | Start the server first, then test | [Environment setup](/tutorials/java/environment) |
| Router port forwarding still doesn't work | Most likely **no public IPv4 address** | Compare the router's WAN IP with your "public IP"; if they differ, request one, move to a cloud server, or use a tunnel | [Deploying to a reachable environment](/tutorials/java/deploy) |
| **Mobile players can't connect** | Only TCP was opened | Bedrock and cross-play clients also need **UDP 19132** open | [Mobile player support](/tutorials/java/mobile) |

## 3. Paths and permissions

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| Plugins or mods throw odd path errors | The directory contains **non-ASCII characters or spaces** | Move it to a short ASCII path such as `C:\mcserver` or `/opt/mcserver` | [Server layout](/tutorials/java/structure) |
| `Permission denied` on Linux | The server files were created by root, so a normal user has no write access | `sudo chown -R mcserver:mcserver /opt/mcserver` | [Environment setup](/tutorials/java/environment) |
| The world breaks after editing world files | Files under `region/` were edited by hand | **Never edit** world files by hand; use tools such as WorldEdit, or stop the server first | [Server layout](/tutorials/java/structure) |

## 4. Plugins

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| **Red** entry in `/plugins` | Failed to load (the server recognized it but could not load it) | Read the console error; usually a missing dependency or a version mismatch | [Plugin basics](/tutorials/java/plugins) |
| **Not even red** in `/plugins` | The server **never recognized** it as a plugin | Check that it is in `plugins/`, that the extension is `.jar`, and that you did not download the build for the wrong server type | [Plugin basics](/tutorials/java/plugins) |
| Plugin reports a YAML error | **Tab indentation** (YAML allows spaces only) | Re-indent with spaces | [Plugin basics](/tutorials/java/plugins) |
| Non-ASCII text turns into mojibake in configs | The file is not UTF-8 encoded | Re-save as **UTF-8** in VS Code | [Plugin basics](/tutorials/java/plugins) |
| Config changes have no effect | The plugin needs a reload | `/插件名 reload`; if the plugin doesn't support it, restart instead (do **not** use vanilla `/reload`) | [Plugin basics](/tutorials/java/plugins) |
| The server suddenly lags or throws odd errors | A newly installed plugin | **Disable the most recently installed plugins first**, then re-enable them one by one to isolate the culprit | [Plugin basics](/tutorials/java/plugins) |

## 5. Technical Minecraft and mechanics

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| Redstone machines mysteriously stop working | **Paper-based servers change vanilla behavior** | For technical play use **Fabric or Leaves**; Paper-based servers can only handle light technical builds, with config tweaks | [Technical Minecraft and redstone](/tutorials/java/redstone) |
| Ender pearl stasis chambers don't work | Chunk unload delay | Set `delay-chunk-unloads-by: 0s` in `paper-world-defaults.yml` | [Technical Minecraft and redstone](/tutorials/java/redstone) |
| Dense entity farms don't work | Entity collision limit | Adjust `max-entity-collisions` (**at the cost of performance**) | [Technical Minecraft and redstone](/tutorials/java/redstone) |

## 6. Performance

| Symptom | Fix | Source |
| --- | --- | --- |
| Dropping TPS, everything laggy | Tune **`simulation-distance`** first (far cheaper than view distance and invisible to players) | [Performance tuning](/tutorials/java/optimize) |
| No idea where the lag comes from | Profile with **spark** and read the widest bar in the flame graph | [Performance tuning](/tutorials/java/optimize) |
| Lag whenever players explore | **Pregenerate the world** (Chunky and similar) | [Performance tuning](/tutorials/java/optimize) |
| Plenty of memory allocated but still laggy | A too-large `-Xmx` makes GC pauses longer | 4–6 GB is usually enough for up to 10 players | [Hosting terms and recommended specs](/tutorials/java/protocol) |
| Weak single-core CPU | No config tweak can save it — **move to a machine with a faster single core** | [Hosting terms and recommended specs](/tutorials/java/protocol) |

## 7. Data and security

| Symptom | Cause / Fix | Source |
| --- | --- | --- |
| Corrupted world / rolled-back data | Caused by closing the server with the window's X button | Shut down with `stop`; the standard sequence is `save-all` → `save-off` → back up → `stop` | [Common server commands](/tutorials/java/commands) |
| Backups come out corrupt | Copying files while they are still being written | Hot backups need `save-off` first; otherwise stop the server before backing up | [Backup and restore](/tutorials/java/backup) |
| Griefed, but no way to tell who did it | **No logging plugin installed** | Install something like CoreProtect early; it can only log what happens **after** installation | [Anti-cheat and grief prevention](/tutorials/java/anticheat) |
| Anti-cheat punishes innocent players | Penalties enabled too early | Run in **logging mode** first; a missed catch beats a false positive | [Anti-cheat and grief prevention](/tutorials/java/anticheat) |
| Risks of offline mode | Anyone can spoof a player ID and bans can be bypassed | Public servers are **not advised** to turn off online-mode authentication | [Configuring the server](/tutorials/java/config) |
| Host goes out of business / datacenter incident | Data lives on a single machine | **Download backups somewhere else on a regular basis** | [Backup and restore](/tutorials/java/backup) |

## 8. Cross-play and proxies

| Symptom | Cause | Source |
| --- | --- | --- |
| Bedrock players can't get in | Geyser is not installed, or UDP is not open | [Mobile player support](/tutorials/java/mobile) |
| Java players want to join a Bedrock server | **Impossible**: Geyser only works one way | [Mobile player support](/tutorials/java/mobile) |
| Console platforms (Xbox/PS/Switch) can't get in | They cannot enter an IP address directly | [Mobile player support](/tutorials/java/mobile) |
| Commands do nothing after setting up a proxy | The plugin is installed in the wrong place (proxy vs backend server) | [Proxies](/tutorials/java/proxy) |
| Worried about forwarding secret leaks | A leak means anyone can forge an identity | Keep the secret private and **never expose backend ports to the internet** | [Proxies](/tutorials/java/proxy) |

> Can't find your issue? For Bedrock Edition see [[BE] Troubleshooting FAQ](/tutorials/faq/faq-be); for running a server as a business see [[JAVA] Operations and Management](/tutorials/ops/management-java).
