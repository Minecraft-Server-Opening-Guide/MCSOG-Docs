---
title: Glossary of Terms
slug: glossary
cat: ops
level: 2
order: 16
minutes: 12
tags: [glossary, terminology, tps, mspt, paper, bedrock, reference, basics]
updated: 2026-10-04
draft: false
---

Most people who get stuck running a Minecraft server are not stuck on the clicking. They are stuck because **they cannot tell what everyone else is talking about**. "What is your MSPT?" "Does this plugin have a dependency?" "Is your server offline-mode?" Every one of those sentences hides a word nobody explained.

This page collects the terms that come up again and again across this site, **grouped by topic**. Each entry gives the term, its English equivalent, one to three sentences saying what it actually is, and where on this site it is covered in depth.

## 0. How to Use This Page

| Your situation | What to read |
| --- | --- |
| Complete beginner, server not running yet | Skip this page. Work through [Choosing a Server Core](/tutorials/java/core) and [Starting the Server](/tutorials/java/start) first, then come back when a word blocks you |
| It runs, but you cannot read the errors or the advice | Sections 1, 2 and 3. These are by far the most common words in community discussion |
| Bedrock server | Section 4. **Bedrock and Java terminology barely overlap** |
| Technical (redstone) server | Section 5. It decides which core you should pick |
| Already maintaining a server long term | Section 6. These words are the ones that decide whether your data survives |

:::note Use it as a dictionary, not a memory test
The value of a glossary is that you can **search** it. When a tutorial uses a word you do not know, come back and find it once. The only thing genuinely worth remembering is this: **when you are unsure about a default value, check the official documentation and the file your own server generated.**
:::

:::warn Versions and vendors differ
Across the Minecraft server ecosystem, **default values, configuration key names and available commands change with both version and fork**. This page explains what a word means; **it does not promise what any key defaults to in your build**. Before changing a config, follow the official documentation for the software you actually run and the file your server generated.
:::

## 1. Performance Terms

This group answers one question: **is the server lagging right now, and where.**

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| tick | game tick | One pass of the server's main loop. Vanilla targets 20 per second, so a tick is roughly 50 milliseconds; entities, redstone, block updates, player movement and most chunk scheduling all happen inside it | [Performance Tuning](/tutorials/java/optimize) |
| TPS | Ticks Per Second | How many ticks actually complete each second. The vanilla ceiling is 20, and it falls below 20 when the server cannot keep up. **It is a result, not a cause** | [Analysing Server Performance with spark](/tutorials/ops/spark) |
| MSPT | Milliseconds Per Tick | The average time one tick takes, also called tick time. It is the other face of TPS: **when it stays above 50 ms, TPS cannot hold 20** | [Analysing Server Performance with spark](/tutorials/ops/spark) |
| 50 ms budget | tick budget | The per-tick time limit implied by 20 ticks per second. Note that it is a budget **in the average sense**: one tick taking 200 ms while the rest are fast still leaves TPS near 20, but players feel a stutter | [Performance Tuning](/tutorials/java/optimize) |
| lag | stutter, slowdown | A player's subjective experience, **not a metric**. It may be slow ticks, network jitter, or the player's own client rendering. The first step of any investigation is translating it into a metric | [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |
| GC pause | garbage collection pause | A period during which Java's garbage collector may suspend application threads. Bigger heaps and less suitable collectors make individual pauses longer, which shows up as **periodic stutter rather than a steady slowdown** | [Performance Tuning](/tutorials/java/optimize) |
| TPS drop vs MSPT spike | - | Two different phenomena. **A TPS drop** is usually sustained resource shortage (a throttled CPU, too many entities). **An MSPT spike** is a short burst of work (chunk generation, large redstone, GC). Telling them apart is what tells you which fix to use | [Analysing Server Performance with spark](/tutorials/ops/spark) |

### 1.1 Why "lag" Is Not a Metric

"Lag" can describe at least four completely different situations, and they have different fixes:

| What is happening | Typical signature | Look at first |
| --- | --- | --- |
| The main thread cannot keep up | TPS stays below 20 and MSPT is consistently high | spark's profiler call tree |
| Short spikes | Average TPS looks fine, but players report a stutter | spark's tick-time distribution and GC logs |
| The host is short of resources | The server process is not slow, but its CPU is throttled, the disk is slow, or memory is being swapped | `uptime`, `free -h`, host monitoring |
| A network problem | The server is healthy and only some players have high latency | `/spark ping`, the path between player and datacentre |

**Separating those four is the single most valuable step in diagnosing lag.** The methods are in [Analysing Server Performance with spark](/tutorials/ops/spark).

### 1.2 Thresholds Are Not Magic Numbers

The community lines "TPS below 20 means trouble" and "MSPT above 50 means look at it" are **rules of thumb** that mean "go and take a look", not "this is definitely broken". The real basis for judgement is **your own historical baseline**: if your server normally sits at MSPT 35, a jump to 45 deserves a look; if it normally sits at 48, then 50 is just Tuesday. How to build that baseline is covered in [Monitoring and Alerting](/tutorials/ops/monitoring).

### 1.3 Why TPS and MSPT Can Disagree

A common confusion: "TPS says 20, but players still say it stutters." That is not a contradiction. At least four things explain it:

| Situation | Why TPS still looks healthy |
| --- | --- |
| An average hiding a spike | TPS is an **average over a window**, so a few very long ticks are flattened by many normal ones |
| The problem is on the client | Server ticks are perfect, but the player's machine cannot render fast enough or has too large a view distance |
| The problem is the network | The server is fine, but the player's route to the datacentre jitters or drops packets |
| The problem is the host | The process is CPU-throttled or being swapped out, but from the inside it only "feels a bit slow" |

So the order should be: **first establish whether this is server-side or not, then investigate specifically.** `/spark ping`, host CPU and memory, and the latency of players in different regions are all inputs to that first step. See [Analysing Server Performance with spark](/tutorials/ops/spark).

### 1.4 The Side Effects of a Slow Tick

Because almost all world logic advances inside the tick loop, **a slow tick slows down a great deal at once**: crop growth, furnace progress, redstone timing, mob movement. That is why "TPS dropped to 15" feels like far more than a 25 percent slowdown - every time-dependent mechanic slows together, and machines that depend on exact timing may stop working entirely. See [Technical Minecraft and Redstone](/tutorials/java/redstone).

:::tip Which number first
When a player says the server is lagging, **read TPS and MSPT first, then CPU usage**. If TPS is low while MSPT looks normal, the problem is usually not the server's main thread but host CPU, memory reclaim or the network. For the reasoning, and the official caveat about containerised hosts, see [Analysing Server Performance with spark](/tutorials/ops/spark).
:::

## 2. Server Terms

This group answers: **what program are you actually running, and what is it made of.**

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| server core | server software, server jar | The program you actually launch with `java -jar`, such as Paper, Fabric or BDS. **"Core" is community shorthand**, not an official term | [Choosing a Server Core](/tutorials/java/core) |
| plugin | - | A program that runs inside the server process and extends it through the server's API, usually a `.jar` dropped into `plugins/`. **Only plugin platforms (the Paper family) support them** | [Plugins](/tutorials/java/plugins) |
| mod | modification | An extension that changes the game code directly, placed in `mods/` and tightly bound to one game version. **Only mod platforms (Fabric, Forge, NeoForge) support them** | [Choosing a Server Core](/tutorials/java/core) |
| dependency | prerequisite, required plugin | Another plugin or mod that must be installed for this one to work. A missing dependency normally shows up as **a failed load with the missing name printed in the log** | [Plugin Dependencies](/tutorials/java/plugin-deps) |
| proxy | cross-server proxy | The server players connect to first, which forwards them to the real servers behind it. Used for switching between servers, one entry address, and centralised login | [Proxies](/tutorials/java/proxy) |
| BungeeCord | - | The earliest mature proxy implementation. Its plugin messaging channel was later adopted by other proxies and became a de facto standard | [Proxies](/tutorials/java/proxy) |
| Velocity | - | A modern proxy with better performance and security design. **Modern forwarding requires a shared secret** between proxy and backend; misconfigure it and nobody can join | [Proxies](/tutorials/java/proxy) |
| backend server | backend, sub-server | A real server instance behind the proxy that hosts gameplay. When a player "switches server", they disconnect from one backend and connect to another | [Proxies](/tutorials/java/proxy) |
| lobby | hub | A special backend where players land after logging in, then move to game servers through NPCs or commands. Usually light on plugins and configuration | [Proxies](/tutorials/java/proxy) |
| MCDR | MCDReforged | A **server management framework** that sits beside the server, parsing its console output and sending it commands. It does not modify the server, so it is not tied to one core | [MCDR](/tutorials/java/mcdr) |

### 2.1 Plugin Platforms and Mod Platforms Are Parallel Tracks

This is the most common beginner confusion. They are not two names for one thing; they are **two incompatible extension systems**:

| | Plugin | Mod |
| --- | --- | --- |
| Loaded from | `plugins/` | `mods/` |
| Typical cores | Paper, Spigot, Purpur, Folia | Fabric, Forge, NeoForge |
| How it extends | Calls the API the server provides | Modifies the game code directly |
| Version sensitivity | Fairly tolerant; often survives minor updates | Extremely strict; must match exactly |
| Typical uses | Administration, permissions, economy, minigames | New content, new mechanics, client features |

**Using a Bukkit plugin on Fabric, or a Forge mod on Paper, does not work by default.** It needs a bridge, and a bridge usually costs compatibility or performance. Decide which side you need before choosing a core; see [Choosing a Server Core](/tutorials/java/core).

### 2.2 A Proxy Is Not an Accelerator

"Proxy" makes people think it reduces latency. **It does not optimise the network path.** Its job is to make several servers look like one: a single entry address, switching between servers without reconnecting to a new IP, and centralised login and permissions. It also adds complexity - forwarding secrets, backend authentication, player data synchronisation - so read [Proxies](/tutorials/java/proxy) before configuring one.

:::warn If you run a proxy, do not expose the backends
Backend servers should accept connections only from the proxy. **If a backend port is reachable from the internet, players can bypass the proxy entirely**, and every login check, permission and whitelist on the proxy becomes irrelevant. Ports and firewall rules are covered in [Network Security Fundamentals](/tutorials/ops/network-security).
:::

## 3. Java Edition Concepts

These are the words you will meet most often in Java Edition discussions.

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| Bukkit | CraftBukkit | The early project that gave the vanilla server a plugin API. Later servers largely adopted its API as a common dialect, which is why plugins are still called "Bukkit plugins" | [Choosing a Server Core](/tutorials/java/core) |
| Spigot | - | Bukkit's successor, long the de facto standard plugin platform and the starting point for many later forks | [Choosing a Server Core](/tutorials/java/core) |
| Paper | - | The most widely used Spigot fork today, with extensive performance work and ongoing maintenance. **It changes some vanilla behaviour for performance**, which is the root of its conflict with technical play | [Choosing a Server Core](/tutorials/java/core) |
| Purpur | - | A Paper fork that adds a large number of configurable gameplay options | [Choosing a Server Core](/tutorials/java/core) |
| Folia | - | A Paper fork that splits the world into regions ticked in parallel. **It trades plugin compatibility for multi-core use**, and cross-region behaviour differs from Paper | [Choosing a Server Core](/tutorials/java/core) |
| API | Application Programming Interface | The interface a server exposes for plugins to call. **Plugins written against the API survive version changes far better** than ones that reach into internals | [Plugins](/tutorials/java/plugins) |
| NMS | net.minecraft.server | The package holding the server's internal classes, used as shorthand for "bypassing the API and calling internals directly". **Those internals carry no compatibility guarantee** and can break on any update | [Plugins](/tutorials/java/plugins) |
| api-version | - | The `plugin.yml` field declaring which Paper API version a plugin targets. The official documentation states that **a server older than the declared version refuses to load the plugin**; leaving it out loads the plugin as legacy and prints a warning | [Plugins](/tutorials/java/plugins) |
| YAML | YAML Ain't Markup Language | The format used by most plugin configs and the Paper family. **Indentation is syntax**: use spaces, never tabs, and a bad indent is a parse failure | [Configuring the Server](/tutorials/java/config) |
| online-mode | premium mode, authentication | The `server.properties` key `online-mode`. When enabled, the server verifies each player's identity against Mojang's session service | [Configuring the Server](/tutorials/java/config) |
| offline mode | cracked server | A server running with `online-mode=false`. Player names can be anything, **anyone can impersonate anyone**, and players do not receive official UUIDs | [Configuring the Server](/tutorials/java/config) |
| UUID | Universally Unique Identifier | A player's unique identity. On an online-mode server it comes from Mojang's session service; on an offline server the server derives it from the name, so **the same name means the same UUID, and a rename means a new identity** | [Server Commands](/tutorials/java/commands) |
| whitelist | allowlist | The mechanism that lets only listed players join. The relevant keys are `white-list` and `enforce-whitelist`, and the list lives in `whitelist.json` | [Configuring the Server](/tutorials/java/config) |
| OP | operator | A player with access to server administration commands, recorded in `ops.json`. **Granting OP grants a great deal of power**; think before you do it | [Server Commands](/tutorials/java/commands) |
| RCON | Remote Console | A protocol for sending console commands to the server over the network, on port 25575 by default. **It is not encrypted**, so both the password and the commands can be intercepted; **use it only from localhost or through an encrypted tunnel** | [Network Security Fundamentals](/tutorials/ops/network-security) |

### 3.1 How the Cores Relate

They are not five parallel options; they are an **inheritance chain**:

```text
Vanilla server
  └─ Bukkit / CraftBukkit   adds a plugin API
       └─ Spigot            performance and fixes
            └─ Paper        extensive optimisation and fixes (today's mainstream)
                 ├─ Purpur  more gameplay options
                 └─ Folia   region-based parallel ticking
```

Knowing the chain explains something practical: **a Paper install still contains Spigot and Bukkit config files** (`spigot.yml`, `bukkit.yml`), because it inherited them from upstream. When you meet a config file you do not recognise, first work out which layer of the chain it belongs to.

### 3.2 online-mode, UUIDs and the Whitelist

These three are usually discussed together because they **determine each other**:

- **Online mode** (`online-mode=true`): the player's identity is confirmed by Mojang's session service, and the UUID belongs to the account, so **a rename does not change who they are**. The whitelist, permissions and economy data all hang off that UUID.
- **Offline mode** (`online-mode=false`): the server derives the UUID from the player's name, so **a rename makes a new person**, and using someone else's name means impersonating them.

Switching an online-mode server to offline mode (or back) **changes existing players' UUIDs**, after which whitelists, permissions, economy data and land claims all point at the wrong people. This is not "flipping one switch"; back up first and reconcile the identity mapping. See [Backup and Restore](/tutorials/java/backup).

:::warn Do not expose RCON to the internet
RCON is designed for remote administration from localhost or a trusted network, and **the protocol itself is unencrypted**. Publishing it to the internet hands your console to the first scanner that finds it. For remote use, go through an SSH tunnel or a VPN; see [Network Security Fundamentals](/tutorials/ops/network-security).
:::

### 3.3 Config Files Come in Three Layers

The most common source of beginner confusion is treating different config layers as one thing. They have distinct jobs:

| Layer | Typical files | Who generates it | What happens if you get it wrong |
| --- | --- | --- | --- |
| Server configuration | `server.properties` | The server, on first start | A misspelled key is ignored or falls back to the default; **changes need a restart** |
| Platform configuration | `spigot.yml`, `bukkit.yml`, `paper-world-defaults.yml` and similar | The fork, on first start | Affects mechanics and performance, and is **especially sensitive for technical play** |
| Plugin configuration | `plugins/<name>/config.yml` and similar | The plugin, on first load | A format error stops the plugin loading, and **the reason is normally in the log** |

One practical habit: **copy any config file before you edit it.** Config files are small text files, so the cost of a copy is near zero, while the cost of debugging a broken one is high. Scope and rollback are covered in [Backup and Restore](/tutorials/java/backup).

### 3.4 A Whitelist and OP Are Different Things

These two are often mentioned together, but they control completely different things:

| | Whitelist | OP |
| --- | --- | --- |
| Controls | **Who may join** | **What they may do once inside** |
| Stored in | `whitelist.json` | `ops.json` |
| Related setting | `white-list`, `enforce-whitelist` | `op-permission-level` sets the default permission level for operators |
| Common mistake | Assuming a whitelist means the server is secure | Assuming OP only adds "a few extra commands" |

**Granting OP grants a great deal of power**, including commands that change the world. Before you grant it, be sure who the person is and whether the permission can be taken back. Commands are covered in [Server Commands](/tutorials/java/commands).

## 4. Bedrock Edition Concepts

Bedrock's ecosystem barely overlaps with Java's, and so does its vocabulary.

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| BDS | Bedrock Dedicated Server | Microsoft's official Bedrock server. **It is not open source**, its plugin capability is limited, and extension normally happens through behaviour packs and scripting | [Bedrock Dedicated Server](/tutorials/bedrock/bds) |
| protocol version | network protocol | The version of the data format clients and servers speak. **Bedrock clients update automatically**, so a server that falls behind simply cannot be joined - the most common Bedrock failure | [Bedrock Protocols and Versions](/tutorials/bedrock/protocol) |
| Addon | add-on | The umbrella term for Bedrock extension content, made up of behaviour packs, resource packs and similar, loaded through world settings | [Bedrock Server Types](/tutorials/bedrock/type) |
| behaviour pack | behavior pack | The part of an add-on that carries logic and rules: new entities, changed drops, scripts | [Bedrock Server Types](/tutorials/bedrock/type) |
| resource pack | texture pack | The part of an add-on that carries appearance and sound: textures, models, audio, interface text | [Bedrock Server Types](/tutorials/bedrock/type) |
| allowlist.json | - | The Bedrock server's allowlist file, corresponding to the `allow-list` setting in `server.properties`. **The file name differs from Java Edition's `whitelist.json`** | [Bedrock Dedicated Server](/tutorials/bedrock/bds) |
| permissions.json | - | The Bedrock file that assigns player permission levels: visitor, member and operator. `default-player-permission-level` in `server.properties` sets the level for new players | [Bedrock Dedicated Server](/tutorials/bedrock/bds) |
| Xbox Live authentication | Xbox Live sign-in | Bedrock's account system. **Connecting to a remote (non-LAN) server always requires Xbox Live authentication**; `online-mode` mainly affects local and LAN play | [Bedrock Protocols and Versions](/tutorials/bedrock/protocol) |
| Nukkit | - | A Bedrock server implementation written in Java, offering a Bukkit-like plugin API. The original project is far less active than it once was | [Third-Party Bedrock Servers](/tutorials/bedrock/third-party) |
| PMMP | PocketMine-MP | A Bedrock server implementation written in PHP, with a mature plugin ecosystem and a large community | [Third-Party Bedrock Servers](/tutorials/bedrock/third-party) |
| PNX | PowerNukkitX | One of the actively maintained successors to Nukkit, aiming to keep up with new versions | [Third-Party Bedrock Servers](/tutorials/bedrock/third-party) |

### 4.1 Why a Bedrock Server "Breaks Every Time the Client Updates"

Because **the client updates itself and the server does not**. Official BDS releases are tied to client versions, and third-party implementations usually lag further behind. Once a player's phone updates, a server still on the old protocol version simply refuses the connection.

That is why "protocol version" comes up constantly in Bedrock conversations. What to do about it, and how each implementation tracks releases, is covered in [Bedrock Protocols and Versions](/tutorials/bedrock/protocol).

### 4.2 Third-Party Implementations Need Your Own Judgement

Nukkit, PMMP and PNX are **not official servers**, and they differ widely in how faithfully they reproduce vanilla mechanics, how fast they update, and how good their plugins are. Before choosing one, confirm three things: **does it already support the protocol version you need**, **does its plugin ecosystem cover your requirements**, and **is the project still maintained**. See [Third-Party Bedrock Servers](/tutorials/bedrock/third-party-setup).

:::note Do not carry terminology across editions
`whitelist.json` (Java Edition) and `allowlist.json` (Bedrock Edition) are different files. A Java "plugin" and a Bedrock "behaviour pack" are not the same kind of thing. **When you ask for help, say which edition you run first** - it saves a great deal of back and forth.
:::

## 5. Technical Play and Redstone

These words belong to technical survival players, and they are **the group that most often conflicts with performance tuning**.

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| technical Minecraft | technical play, "redstone" scene | Survival play built around redstone machines, mob farms and exact block and entity behaviour. It is **extremely sensitive to whether vanilla behaviour has been altered** | [Technical Minecraft and Redstone](/tutorials/java/redstone) |
| mob farm | mob grinder, spawner | A build that concentrates mob spawning and kills the mobs for their drops. It is also a **heavy resource consumer**: many entities, many dropped items, and chunks kept loaded | [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |
| redstone clock | clock circuit | A circuit that emits a redstone signal on a repeating cycle to trigger other builds. **A fast clock is a classic source of MSPT spikes** | [Technical Minecraft and Redstone](/tutorials/java/redstone) |
| TNT duplication | TNT duping | A technique that duplicates TNT entities using version-specific mechanics, and the basis of many large builds. **Some server forks change the relevant behaviour** for performance or balance, which breaks it | [Technical Minecraft and Redstone](/tutorials/java/redstone) |
| entity activation range | activation range | A Spigot-family mechanism where **entities beyond a certain distance are not unloaded but ticked less often**. Lowering it saves CPU and makes distant machines behave oddly | [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |
| chunk loading | force load, chunk load | A chunk only ticks while it is loaded. Players, spawn chunks, portals, `/forceload` and plugins can all keep one loaded; **forcing a load means deliberately keeping it loaded**, at the cost of permanent CPU and memory | [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |
| mob cap | spawn limit | The ceiling on how many mobs may exist in a world at once. It is configured in `bukkit.yml` under `spawn-limits`, and the Paper family can also override it per world or count it per player | [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |

### 5.1 "Loaded" and "Ticking" Are Not the Same

Beginners use these two interchangeably, but they describe different stages:

| Stage | Meaning | Typical cost |
| --- | --- | --- |
| Loading | Chunk data is in memory and can be read or written | Memory, disk I/O |
| Ticking | Entities, block entities and random ticks inside the chunk advance | CPU (main thread) |

A chunk **can be loaded without ticking** (when it is beyond simulation distance), and a force-loaded chunk **is both loaded and ticking, permanently**. Dropped items do not keep a chunk loaded by themselves, but as long as something else keeps that chunk loaded, the items inside tick forever and pile up forever. This distinction is the key to diagnosing "entities keep accumulating"; see [Entity and Item Pile-Ups](/tutorials/faq/entity-lag).

### 5.2 Optimisation and Technical Play Often Conflict

"Shrink the activation range, lower the mob caps, relax the hopper checks" makes TPS look better, and **also breaks farms and machines outright**: villagers stop restocking, mob farms stop producing, and builds that depend on item separation fall apart. A technical server should do the opposite - restore behaviour-affecting settings to vanilla, or switch to a core that stays close to vanilla. See [Technical Minecraft and Redstone](/tutorials/java/redstone) and [Performance Tuning](/tutorials/java/optimize).

:::warn Back up before changing configs
Any change made "for performance" can change game mechanics. **Back up the config, then re-test the machines afterwards** is the standard routine on a technical server. Scope is covered in [Backup and Restore](/tutorials/java/backup).
:::

## 6. Operations Terms

These are the words you meet once you treat the server as **something that has to be maintained for years**.

| Term | Also called | Explanation | Details |
| --- | --- | --- | --- |
| backup | - | A copy of the world and configuration that can be restored when something goes wrong. **Copying without ever verifying a restore is not a backup** | [Backup and Restore](/tutorials/java/backup) |
| offsite backup | remote backup | A backup copy held **at a different physical location or with a different provider**. If the machine dies, is compromised, or the datacentre has an incident, backups on that machine vanish with it | [Offsite Backup](/tutorials/ops/offsite-backup) |
| 3-2-1 rule | - | A widely used rule of thumb: **at least 3 copies, on 2 different kinds of media, with 1 of them offsite**. It is a heuristic, not a standard | [Offsite Backup](/tutorials/ops/offsite-backup) |
| off-site | - | Storage that is not in the same physical place as the host and not affected by the same incident. **Another directory on the same machine, or another disk in the same machine, does not count** | [Offsite Backup](/tutorials/ops/offsite-backup) |
| UPS | uninterruptible power supply | A battery-backed power supply. Its value is not "keep playing during an outage" but **buying the server a few minutes to shut down cleanly**, avoiding a hard power loss in the middle of a write | [Racks, Switches and UPS](/tutorials/ops/hardware-rack) |
| panel | control panel | A web interface for managing servers: start and stop, console, file management, backups. Pterodactyl and MCSManager are common examples. **It is also a new attack surface** | [Panels](/tutorials/ops/panels) |
| daemon | - | A program that stays resident in the background performing a specific job. Panel architectures usually run one daemon on each managed machine, and **the link between it and the web front end deserves hardening** | [Panels](/tutorials/ops/panels) |
| DDoS | Distributed Denial of Service | An attack that saturates a target's bandwidth or connection resources from many sources. **There is a limit to what the host can do; it usually takes upstream scrubbing by the provider** | [Common Network Attacks and Defenses](/tutorials/ops/attack-defense) |
| rate limiting | throttling | Deliberately limiting connections or requests per unit of time so a few sources cannot exhaust your resources. **It mitigates, it does not cure**, and set too tightly it punishes legitimate players | [Common Network Attacks and Defenses](/tutorials/ops/attack-defense) |
| forensics | incident forensics | Before you restart, reinstall or block anything, **freeze the scene that will be gone in minutes**: processes, connections, logs, timeline. **Get the order wrong and the evidence is gone** | [Incident Response and Forensics](/tutorials/ops/incident-forensics) |
| post-mortem analysis | after-the-fact analysis | Investigating what happened after it happened. **It explains the past; it does not prevent the next one** | [Analysing Server Performance with spark](/tutorials/ops/spark) |
| alerting | proactive monitoring | Having the system tell you about a problem before players are affected. It complements post-mortem analysis rather than replacing it | [Monitoring and Alerting](/tutorials/ops/monitoring) |
| I/O wait | iowait | The share of time the CPU spends idle waiting for a disk operation to finish. **When it is high, the server looks like it is not computing anything, yet everything is slow** | [Racks, Switches and UPS](/tutorials/ops/hardware-rack) |
| runbook | playbook | Pre-written steps for "what to do when this alert fires". **An alert without a runbook is a 3 a.m. wake-up call about a problem you do not know how to handle** | [Monitoring and Alerting](/tutorials/ops/monitoring) |

### 6.1 "Backup" Is a Badly Overused Word

In everyday conversation, "I have a backup" can mean at least four different things:

| What people say | What it actually means | Is it enough |
| --- | --- | --- |
| "I copied the world folder" | There is a second copy on the same machine | Survives a mistaken deletion, not a machine failure |
| "My backup script runs every day" | A scheduled job exists | **Without reading the exit code you do not know whether it succeeded** |
| "The backup files are there" | Archive files exist on disk | **Untested restores do not count as backups** |
| "I have restored from it" | It was actually restored elsewhere and started successfully | This is a usable backup |

Only the last of the four will actually save you. How to verify a restore is covered in [Offsite Backup](/tutorials/ops/offsite-backup).

### 6.2 Why a UPS Belongs in an Operations Glossary

Because a power cut and a server crash are different kinds of event. **A server crash normally does not corrupt the world** - the process dies abnormally but the filesystem stays consistent. **A hard power loss during a write can leave half-written files behind**, costing you a few chunks at best and an unloadable world at worst.

So the UPS exists to "give the server a chance to shut down cleanly", not to "keep players online through an outage". Sizing, NUT monitoring and automatic shutdown are covered in [Racks, Switches and UPS](/tutorials/ops/hardware-rack) and [Hosting on a Home PC](/tutorials/ops/home-hosting).

:::tip The most frequently skipped item
Of all the words above, the one that is genuinely ignored is **verified restore**. A backup file existing, or a script exiting zero, does not mean the server can be brought back. Restore one for real, periodically; see [Offsite Backup](/tutorials/ops/offsite-backup).
:::

## 7. Commands That Match the Terminology

A term is only useful once it maps onto a command. The table below pairs the most common words from earlier sections with the command that shows you the current state. **Output formats differ between distributions and versions; trust what your own system prints.**

| Word you want to confirm | Command | What to read |
| --- | --- | --- |
| Overall host load | `uptime` | The last three numbers are 1, 5 and 15 minute load averages; **read them against your CPU core count**, where 1.00 per core is fully loaded |
| Memory and swap | `free -h` | Read the `available` column; it is much closer to "how much is actually usable" than `free` |
| Disk space | `df -h` | Check free space on the mount that holds your server; **a full disk makes the server fail to save the world** |
| Disk health | `smartctl -a /dev/sdX` | Power-on hours, bytes written, reallocated sectors and similar attributes; the command ships in `smartmontools` |
| Network overview | `ss -s` | Totals per socket type; **abnormal connection growth usually appears before memory runs out** |
| Listening ports | `ss -lntp` / `ss -lunp` | Which TCP / UDP ports are listening and which process owns them |
| Service state | `systemctl status <unit>` | Whether it is active, recent exits, and the latest log lines |
| Service log | `journalctl -u <unit>` | Narrow the range with `--since "1 hour ago"`; **add `--utc` during an incident** |
| HTTP availability | `curl -s -o /dev/null -w '%{http_code}' <URL>` | Prints only the status code, which is what you want inside a script |
| UPS state | `upsc <upsname>` | `ups.status` reads `OL` on mains and `OB` on battery; variable names follow the NUT documentation and your model |

:::tip Never trust a single reading
`free -h` and `df -h` are **snapshots**, and one snapshot tells you almost nothing. What matters is the **trend**: is the disk growing every week, is memory climbing every day. Trends need scheduled collection; see [Monitoring and Alerting](/tutorials/ops/monitoring).
:::

## 8. How the Terms Fit Together

Memorising isolated words is useless. **Chaining them into a few causal lines** is what pays off:

| What you want to do | Terms to understand first | Why |
| --- | --- | --- |
| Decide whether the server is lagging | tick, TPS, MSPT, 50 ms budget | Only a metric can turn "lag" into something you can investigate |
| Choose a server core | plugin, mod, technical Minecraft, proxy | The core decides which extensions you get and whether vanilla behaviour is altered |
| Configure plugins | YAML, dependency, API, NMS, api-version | Most "the plugin is red" problems live in these five words |
| Manage players | online-mode, UUID, whitelist, OP | Identity and permissions all hang off the UUID |
| Run a Bedrock server | BDS, protocol version, behaviour pack, allowlist.json | Bedrock is a separate world where Java habits do not transfer |
| Keep your data | backup, offsite, 3-2-1, UPS, forensics | When it goes wrong, these are the only things that save you |
| Maintain it long term | panel, daemon, DDoS, rate limiting, monitoring | Treating the server as something that needs continuous attention |

## 9. Next Steps

Once the vocabulary makes sense, these are the next things to do, in order:

| What you want | Where to go |
| --- | --- |
| Pick a suitable core | [Choosing a Server Core](/tutorials/java/core) |
| Get the server running | [Starting the Server](/tutorials/java/start) |
| Not know where to look when it breaks | [Logs and Error Triage](/tutorials/faq/errors) |
| The server is lagging | [Analysing Server Performance with spark](/tutorials/ops/spark) |
| Keep your data safe | [Backup and Restore](/tutorials/java/backup), [Offsite Backup](/tutorials/ops/offsite-backup) |
| Harden the machine | [System Hardening](/tutorials/ops/system-security) |
| Something has already gone wrong | [Incident Response and Forensics](/tutorials/ops/incident-forensics) |
| Set up monitoring and alerting | [Monitoring and Alerting](/tutorials/ops/monitoring) |

## 10. Symptom Lookup

Finally, a table for looking things up backwards: **start from the symptom and find the term**. It does not replace diagnosis, but it tells you which direction to search.

| What you see | Terms to think of first | Where to look |
| --- | --- | --- |
| Players say it stutters, but TPS reads 20 | client rendering, network jitter, MSPT spike | Section 1; [Analysing Server Performance with spark](/tutorials/ops/spark) |
| TPS stays below 20 and MSPT is consistently high | entity pile-up, mob cap, chunk loading, plugin hotspot | Sections 1 and 5; [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) |
| It stutters every so often | GC pause, autosave, scheduled jobs | Section 1; [Performance Tuning](/tutorials/java/optimize) |
| The server shut itself down | watchdog, `OutOfMemoryError`, full disk | [Logs and Error Triage](/tutorials/faq/errors) |
| The world will not load, or chunks are missing | hard power loss, half-written files, UPS | Section 6; [Backup and Restore](/tutorials/java/backup) |
| A plugin fails to load at startup | dependency, api-version, NMS, version mismatch | Sections 2 and 3; [Plugin Dependencies](/tutorials/java/plugin-deps) |
| Players cannot join, authentication fails | online-mode, UUID, authentication | Section 3; [Configuring the Server](/tutorials/java/config) |
| Every Bedrock player is locked out | protocol version, automatic client updates | Section 4; [Bedrock Protocols and Versions](/tutorials/bedrock/protocol) |
| A redstone machine suddenly stops working | technical Minecraft, TNT duplication, activation range, fork behaviour changes | Section 5; [Technical Minecraft and Redstone](/tutorials/java/redstone) |
| The backup script "ran" but the files are wrong | exit code, offsite, verified restore | Section 6; [Offsite Backup](/tutorials/ops/offsite-backup) |
| The panel or console will not connect | daemon, ports, certificate | Section 6; [Panels](/tutorials/ops/panels) |
| Bandwidth is saturated and even SSH fails | DDoS, rate limiting, upstream scrubbing | Section 6; [Common Network Attacks and Defenses](/tutorials/ops/attack-defense) |

> Installation and configuration of each piece of software are governed by its official documentation.
