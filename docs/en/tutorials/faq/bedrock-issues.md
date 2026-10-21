---
title: Bedrock Server Runtime Troubleshooting
slug: bedrock-issues
cat: faq
level: 2
order: 5
minutes: 16
tags: [bedrock, troubleshooting, bds, pocketmine, nukkit, network, addons, allowlist]
updated: 2026-10-04
draft: false
---

The three failures that dominate Bedrock hosting — the server will not start, nobody can connect, and players get in but something is wrong — often look identical from the outside. All a player can tell you is "I can't join", while on your side the process may not even be running. This article is the in-depth companion to the [[BE] Troubleshooting FAQ](/tutorials/faq/faq-be). It classifies the problem first and then narrows it down, stating the concrete evidence to check at each step.

:::tip How to use this article
Start with the triage table in section 1, decide which class your problem belongs to, and jump straight to that section. Section 5 gives a single ordered workflow you can follow from the beginning; section 6 explains what to include when you ask for help.
:::

## 1. Triage: cannot connect / will not start / runs but misbehaves

There is exactly one question to answer first: **is the server process running, and is it listening on its port?**

| Symptom | Class | Go to |
| --- | --- | --- |
| The launcher window flashes and disappears, or the prompt returns immediately | Will not start | Section 2 |
| The console prints errors and the process never comes up | Will not start | Section 2 |
| The process is running and the console looks healthy, but players cannot join | Cannot connect | Section 3 |
| Players join, but the server lags, worlds break, or permissions are wrong | Runs but misbehaves | Section 4 |
| Some players can join and others cannot | Cannot connect | Section 3 (check protocol version and client platform first) |
| A port checker reports "open" but players still cannot join | Cannot connect | Section 3.2 (the checker probably tested TCP only) |
| It worked yesterday; today nobody can join | Cannot connect | Section 3.1 (a client auto-update changed the protocol) |
| The server starts, then exits on its own after a few minutes | Runs but misbehaves | Sections 4.1 and 4.2 |

:::note Confirm the process state before anything else
"Cannot connect" and "will not start" have completely different diagnostic paths. The first step is always to confirm the process is alive and listening (section 5). Skip that and everything afterwards is guesswork.
:::

## 2. The server will not start (BDS and third-party cores)

### 2.1 BDS: architecture, runtime, and system requirements

BDS is a **natively compiled** program, not a script, so it is picky about the platform and its runtime libraries.

| Item | Requirement | Notes |
| --- | --- | --- |
| Architecture | **x86-64** | Mojang ships Windows and Linux builds for x86-64 only; ARM devices such as a Raspberry Pi are outside official support |
| Windows | Windows 10 version 10.0.15063 or later, or Windows Server 2016 or later | The **Microsoft Visual C++ runtime** (VC++ Redistributable) is also required |
| Linux | Only **Ubuntu 22.04 or later** is officially supported | Other x86-64 distributions work if the libraries are present, including **glibc 2.35 or later** |
| Memory | 4 GB minimum | More is usually needed beyond about 10 concurrent players; reserve 1 GB of disk |

What a missing runtime looks like: on Windows, BDS depends on the Microsoft Visual C++ runtime, and **when it is missing the usual symptom is an immediate error about a missing DLL, or a window that closes before you can read anything**, often with nothing printed to the console at all. On Linux, a glibc version below the baseline typically shows up as a **dynamic loader failure** (`error while loading shared libraries` and similar). The exact required runtime and libc versions belong to the **official BDS download page and its release notes** — do not copy a version number out of a third-party tutorial.

:::warn BDS has no memory flags
Java Edition lets you size the heap with `-Xms` and `-Xmx`. **BDS has no equivalent startup options.** It manages memory itself, so the only levers are indirect: world size, entity counts, and player counts. Advice to "just give BDS more memory" is therefore not actionable.
:::

### 2.2 Linux: execute permission and working directory

The two most common "will not start" causes on Linux are both operational. **First, the binary is not executable** — the `bedrock_server` file extracted from the archive does not carry the execute bit:

```bash
chmod +x bedrock_server
```

**Second, the working directory is wrong** — the official way to run BDS is **from inside its own folder**, with the library search path pointed at the current directory:

```bash
cd /opt/bedrock-server
LD_LIBRARY_PATH=. ./bedrock_server
```

BDS **keeps all of its data in the working directory** and expects the files unpacked from the archive to be there. So: if you start it from systemd or another supervisor, set `WorkingDirectory` explicitly, or the process may inherit `/`; launching the binary from somewhere else may silently create a fresh set of configuration files and a new world in the wrong place, or fail outright because the libraries next to the binary are not found. Note also that in `LD_LIBRARY_PATH=.`, the `.` means the **current working directory**, not the directory containing the binary.

:::tip The first command to run when it will not start
From inside the server directory, run `LD_LIBRARY_PATH=. ./bedrock_server` by hand and read the error in full. Many problems surface right there, far faster than digging through logs.
:::

### 2.3 The rename trap and path pitfalls

You can rename the BDS executable, but you **should not**. Every reference to it has to be updated in lockstep: start scripts (`.bat` / `.sh`), desktop shortcuts, the command configured in a panel or supervisor, and the `LD_LIBRARY_PATH=. ./bedrock_server` invocation from section 2.2 itself. Miss one and the symptom is "nothing happens when I click it" or "file not found". If you already renamed it and it stopped starting, rename it back to verify, then decide whether to update each reference properly.

The path itself matters too: keep the server directory on a path with **plain ASCII characters, no spaces, and no unusual symbols**. Non-ASCII paths break world and plugin loading on some panels and start scripts, and the resulting errors are rarely self-explanatory.

### 2.4 Nukkit family: Java version and build alignment

The Nukkit family (Nukkit, PowerNukkitX, and relatives) consists of **Java** programs. Two things to confirm:

- **Is the Java version new enough?** Recent branches usually require a fairly recent Java. Too old and the JVM dies immediately with something like `UnsupportedClassVersionError`, which normally states the version it needs — **treat the core's own documentation as authoritative**.
- **Is the bit width right?** A 64-bit system needs 64-bit Java. A 32-bit JVM crashes at startup or partway through a session because of its memory ceiling.

The subtler failure is a **build that does not match the protocol version**: the core starts fine, but clients cannot connect, or they are told the server is outdated. See [Getting Started with Third-Party Bedrock Cores](/tutorials/bedrock/third-party-setup) for the full version-alignment picture.

### 2.5 PocketMine-MP: PHP version and extensions

PMMP is a **PHP** program. Its official requirements are: a **64-bit CPU and a 64-bit operating system**, with 1 GB of RAM or better; dual-core or better is **recommended**, not required; Windows, Linux, and macOS are officially targeted, and in general any platform that runs 64-bit PHP with the required extensions will work.

Two traps stand out. **PHP version and extensions**: PMMP needs a specific PHP version plus a set of extensions, and the wrong version or extensions that never loaded produces a startup error — a commonly reported one being a failure to load a PHP extension such as `opcache`; **the exact extension list and minimum PHP version belong to PMMP's official setup-requirements documentation**. **Do not reach for whatever PHP the system happens to have**: distribution packages are often too old and short on extensions, and on Windows there may be a PHP left behind by unrelated software. PMMP publishes **prebuilt PHP runtimes for each supported platform** (take the matching file from its release page); unzip and run. **Use the bundled PHP rather than an arbitrary system PHP.**

:::warn Make sure you are invoking the PHP you think you are
Run `php -v` and confirm the version and bit width it reports. If your start script calls a bare `php`, it resolves to whatever comes first on `PATH`, which is frequently not the runtime you installed.
:::

### 2.6 Port already in use

A port conflict shows up as a process that exits immediately with a bind failure on the console.

There is a **Bedrock-specific trap** here. The `enable-lan-visibility` option in `server.properties` is on by default and makes the server answer clients searching the LAN. While it is enabled, **the server still binds the default ports 19132 and 19133 even if you have changed `server-port` and `server-portv6` to something else.** So a second Bedrock server on the same machine can conflict even after you change its port; if you do not need LAN discovery, disabling the option avoids the clash. Confirm the exact behaviour against the official documentation. Note also that `server-port` must be an integer in the range **1–65535**.

### 2.7 Mistakes in server.properties

Bedrock's `server.properties` is a plain **line-based `key=value` text file**, with lines beginning `#` treated as comments. A value of the wrong type or outside its allowed range can prevent startup, or be ignored so that your change appears to do nothing. These values are confirmed and can be compared directly:

```properties
server-port=19132
server-portv6=19133
allow-list=true
gamemode=survival
difficulty=easy
default-player-permission-level=member
tick-distance=4
view-distance=32
max-players=10
compression-algorithm=zlib
```

| Key | Allowed values / range |
| --- | --- |
| `server-port` / `server-portv6` | integer in 1–65535 |
| `allow-list` | `true` / `false` |
| `gamemode` | `survival` / `creative` / `adventure` |
| `difficulty` | `peaceful` / `easy` / `normal` / `hard` |
| `default-player-permission-level` | `visitor` / `member` / `operator` |
| `tick-distance` | integer in 4–12 |
| `view-distance` | integer greater than or equal to 5 |
| `max-players` | positive integer |
| `compression-algorithm` | `zlib` / `snappy` |

:::warn Back it up, and edit it as plain text
Use a **plain-text editor**. Do not use a word processor that inserts formatting, because invisible characters will break parsing. Copy `server.properties` before you touch it. For what any individual value actually permits, **the official documentation is authoritative**.
:::

## 3. Cannot connect

### 3.1 Protocol and version mismatch

This is the **single most common** reason players cannot join, and there is almost nothing a player can do about it: app stores update the client automatically, and an update changes the protocol. This layer is covered in depth in [Protocol Versions and Choosing a Version](/tutorials/bedrock/protocol) and is not repeated here. The two points that matter: the client protocol must **match** the server protocol for a connection to succeed, and iOS players can only install the latest store version, so "have players downgrade" is a dead end for that audience. When the versions disagree, the player is shown an outdated-server style message; **the exact wording is defined by the official client**.

### 3.2 UDP versus TCP: ports, firewall, and security group

Bedrock **runs on UDP**, which is the opposite of Java Edition and is the number one cause of "the port checker says it is open but nobody can join".

| Item | Value |
| --- | --- |
| Default IPv4 port | **19132 / UDP** |
| Default IPv6 port | **19133 / UDP** |
| Where it must be allowed | The OS firewall **and** the cloud security group — both |
| Router port forwarding | The protocol must be **UDP**; if the router only offers TCP, add a separate UDP rule |

:::warn TCP-only port checkers will mislead you
Many online "port check" tools probe TCP by default. A reachable TCP port says nothing about UDP. When you verify a Bedrock port, make sure you are testing **UDP**.
:::

Also note that most tunnelling services support TCP only by default; check for **UDP** support before committing to one. For cross-play setups (Bedrock or mobile clients joining a Java server, or the reverse), see [Supporting Mobile Players](/tutorials/java/mobile).

### 3.3 CGNAT, no public IPv4, and double NAT

When the server runs fine and the firewall is open but the outside world still cannot reach it, the problem is usually upstream of your machine.

| Situation | How to tell | What to do |
| --- | --- | --- |
| The router's WAN address is **private or shared** (carrier-grade NAT) | You do not have an exclusive public IPv4 address, so there is nothing to forward to | Ask the ISP for a public IP, or switch to a UDP-capable tunnel or virtual LAN |
| **Double NAT**: a second router sits behind the fibre modem | Forwarding is configured on only one of the two, so the chain breaks | Configure forwarding on the device **directly connected to the internet**, and chain the forward to the next hop |
| The public IP is dynamic | The address changes and players cannot keep up | Use a dynamic DNS service, or a tunnel instead |
| You have public IPv6 only | Some player networks do not carry IPv6 | Verify reachability over IPv4 as well |

When port forwarding is impossible, a common substitute is a **virtual LAN**: put the server and the players on the same virtual network and have players connect to the virtual network address. Community options include ZeroTier, Radmin VPN, and Hamachi; follow each project's own documentation.

### 3.4 LAN discovery versus connecting by IP

The two connection methods take different paths and fail in different ways.

| | LAN discovery | Connecting by IP or domain |
| --- | --- | --- |
| What the player does | Nothing; the server appears at the top of the Play screen | Adds a server manually and enters an address and port |
| Prerequisite | Both sides are on the same local network | The server is reachable from outside (port forwarding or a tunnel) |
| Affected by | `enable-lan-visibility`, and whether UDP 19132/19133 work | Public IP, firewall, security group, tunnel |

A few easy-to-miss points: **Bedrock requires the port to be specified**, because unlike Java Edition it does not use SRV records to make the port optional, so both the address field and the port field must be correct; LAN discovery depends on broadcast or multicast and does not work across every virtual network, container network, or routed subnet, so when it fails, fall back to connecting by IP; and **connecting from the same machine that hosts the server** can fail because of loopback or firewall rules — testing from a second device quickly separates "the server is unreachable" from "this one machine has a problem".

### 3.5 Console platforms (Xbox, PlayStation, Switch)

Console platforms **cannot join a server by typing an IP address in game**. The two usual routes are a **custom DNS entry** that resolves a domain to your server, so the console joins by name, and **LAN**, with the console and the server on the same local network, joining through LAN discovery.

:::note Platform policy differs by console and changes over time
Console restrictions **vary by platform and change between versions**. Available material indicates that console editions lean toward LAN-only connectivity, and that the Switch is the most restricted of the three (possibly limited to Realms or official featured servers). **For what a specific platform currently supports, rely on official documentation and the platform vendor's own statements** rather than an old tutorial.
:::

### 3.6 Client-side checks

Rule out the cheap possibilities before touching the server. **Address format**: put only the IP or domain in the address field and the **port in the port field** — entering `ip:port` as a single string fails to parse on some versions. **Port**: 19132 by default, and if the server was moved to another port the client must match. **Edition**: a Bedrock client **cannot** join a Java Edition server directly, and vice versa, so cross-play needs an extra component; see [Supporting Mobile Players](/tutorials/java/mobile). **Version**: the client version must equal the server version, because Bedrock does not let an older client join a newer server. Finally, **try a different device and a different network**, which immediately separates a server problem from a player's network or device problem.

### 3.7 Third-party core specifics

Third-party cores **do not necessarily implement every protocol feature or every piece of game content** that the official server does, so "the same client works on an official server but not on mine" is expected behaviour, not automatically a misconfiguration. PocketMine-MP is an explicit example: its official documentation states that PMMP does **not** implement all of Minecraft's gameplay features, because its developers maintain it in their spare time and struggle to keep pace with new releases. At the time of writing, the missing features called out include **mobs, redstone, minecarts, and dimensions**.

The other issue is **build-to-protocol alignment**: the version a core reports to clients has to be one the client will accept, or players see an outdated-server style message. PMMP's official FAQ approach is to run the `version` command in the server console to see which Minecraft version the current build supports, then move to a newer build as needed. The same documentation notes that newer **patch** versions are **sometimes, but not always**, compatible without any core update.

## 4. Runs but misbehaves

### 4.1 Lag and memory

**Single-core performance is the first thing to check.** BDS performs its entity simulation on a single thread, so smoothness depends mainly on single-core speed and larger worlds run worse, as described in [BDS Server](/tutorials/bedrock/bds).

| Lever | Notes |
| --- | --- |
| Lower `tick-distance` | Valid range 4–12, default 4. Higher values tick more chunks |
| Lower `view-distance` | Must be at least 5, default 32. Mainly affects what is sent to clients |
| Shrink entity farms | Entities are the dominant load on the single ticking thread |
| Move to a CPU with stronger single-core performance | The most direct fix, and the most expensive |
| `max-threads` | Bedrock does expose a maximum thread count, but it **does not remove the single-thread bottleneck**; do not expect it to fix lag |

On PHP cores: PMMP's official documentation says plainly that it is "notoriously bad at multi-core usage". If you are buying a machine to run PMMP, **prefer higher clock speed over more cores**.

**On steadily growing memory**: BDS has a known issue where memory creeps upward. The important warning:

:::warn Do not force a memory cleanup
Forcing a cleanup makes the progress bar **hang** while players download resource packs or addons, and **only a server restart** clears it. Plan scheduled restarts instead of clearing memory whenever the number looks high.
:::

### 4.2 Chunk and world data problems

BDS keeps world data under **`worlds/`**, one subfolder per world. One behaviour matters enormously here:

> On startup the server looks in `worlds/` for a directory **matching the `level-name` value** in `server.properties`. If it finds one, it loads it. **If it does not, it creates a new world.**

That means **a single wrong letter in `level-name` does not raise an error — the server quietly generates a fresh world**, and what the players see is "our world is gone". So when a world appears to have vanished, the first thing to check is `level-name` against the directory names under `worlds/`.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| The world fails to load, or startup reports a world error | Corrupted save data, or an interrupted save | **Stop restarting it repeatedly** and restore from a backup |
| The world will not load after switching cores | Third-party cores are less compatible with official BDS worlds | Go back to the original core, or migrate following that core's documentation |
| An imported world does not take effect | The directory name does not match `level-name` | Rename the world directory to the `level-name` value |
| The world is lost entirely | Only some files were backed up | Back up the **whole** `worlds/` directory |

The full restore procedure is in [Backup and Restore](/tutorials/java/backup).

:::tip Stop the server cleanly before copying or backing up
Run `stop` in the console and wait for the process to actually exit before copying `worlds/`. Copying while the process is still writing usually produces an archive that looks complete but is corrupt.
:::

### 4.3 Addons and resource packs

Two preconditions: **the pack must be in Bedrock format**, because Java Edition datapacks and resource packs are a different system entirely and are not interchangeable with Bedrock addons; and **the pack must be placed correctly and then registered**, because dropping the files in is not enough and the server does not enable them by itself. The verified layout and registration are as follows:

| Type | Directory |
| --- | --- |
| Behavior pack | `development_behavior_packs` |
| Resource pack | `development_resource_packs` |

To enable a pack for a world, create the corresponding manifest file **in that world's working directory**, listing the pack's UUID and version. The UUID comes from the pack's own `manifest.json`:

```json
[
    {
        "pack_id": "33556fcf-d192-4d5f-96a0-29357702af7b",
        "version": [ 1, 0, 0 ]
    }
]
```

Where: behavior packs are declared in `world_behavior_packs.json`, resource packs are declared in `world_resource_packs.json`, and when several packs conflict, **the pack listed first wins**.

Other points to keep in mind: **`texturepack-required=true`** forces clients to download the server's resource packs, and with it enabled, resource packs the player enabled client-side (including Marketplace packs) stop applying; **Marketplace packs cannot be applied to a server**; the server root also contains **`valid_known_packs.json`**, the server's list of **known packs**, which it uses for validation, and its exact format and maintenance workflow **belong to the official documentation** — for day-to-day work, use the "place the directory, then write `world_*_packs.json`" flow above; and a **client stuck downloading resource packs** can be caused by the server's memory state (see 4.1) rather than by the pack, in which case restarting the server often clears it.

PMMP has one more officially documented issue: the server is **known to have problems with large resource packs** (the documentation gives packs larger than 1 MB as the example). The documented step is to remove the large packs and retest; a possible workaround is lowering `network.max-mtu-size` in `pocketmine.yml` in small steps (100 at a time) and testing after each change. The documentation is explicit that this is only a **workaround**, that it increases bandwidth usage, and that you should still find and fix the root cause.

### 4.4 Permissions and allowlist

BDS keeps permissions and the allowlist in **two separate files** with different fields, and they are easy to confuse. **Operators live in `permissions.json`**, where each entry has a `xuid` and a `permission`:

```json
[
    {
        "permission": "operator",
        "xuid": "451298348"
    }
]
```

- `permission` accepts exactly three values: **`operator` / `member` / `visitor`**.
- **`online-mode` must be enabled**, because an XUID requires online account verification.
- If you edit the file while the server is running, run **`permission reload`** for the change to take effect; `permission list` shows current permissions.
- New players who are not in the list fall back to `default-player-permission-level`. Permissions can also be **changed in game** rather than by editing the file.

**The allowlist lives in `allowlist.json`**, with these fields:

| Field | Meaning |
| --- | --- |
| `name` | The player's **gamertag**, which must match exactly |
| `xuid` | The player's XUID; **it may be omitted if `name` is present** |
| `ignoresPlayerLimit` | When `true`, this player can join even when the server is full |

Behaviour worth knowing: if you supply only `name`, the **XUID is filled in automatically once a player with that gamertag connects**, so a misspelled name locks that player out permanently and nothing corrects it automatically; **the allowlist only works with `online-mode` enabled**, and with authentication off a player can join under a name that is on the list, which makes the allowlist meaningless; if a player **changes their gamertag**, the old entry stops matching and has to be updated; and if you edit the file by hand while the server is running, use the corresponding reload command for the change to apply.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Someone who should be an operator is not | The entry is missing from `permissions.json`, or it was added without a reload | Add the entry and reload, or set it in game |
| An entry in `permissions.json` has no effect | `online-mode` is off, so the XUID cannot be verified | Enable `online-mode` |
| A listed player cannot join | `name` does not exactly match the gamertag (case, spaces, a rename) | Verify the exact name, or supply the XUID |
| Anyone can join | The allowlist is not enabled, or `online-mode` is off | Check `allow-list` and `online-mode` |

:::note Field names follow the official documentation
The field names and behaviour above come from official documentation. **Fields and defaults can change between versions**, so the authoritative sources are the official BDS documentation and the `bedrock_server_how_to.html` file shipped with the server.
:::

### 4.5 Behaviour differences from Java Edition

Many player bug reports are really just **the two editions behaving differently** — redstone mechanics and mob spawning rules among them. That layer is not re-explained here; see [Java vs Bedrock](/wiki/editions).

## 5. A practical troubleshooting order

Work through these in order. Each step roughly halves the remaining possibilities. **Do not skip steps.**

1. **Confirm the server process is actually running.** Is the console window still there? Is the process still in the process list?
2. **Confirm it is listening on its port.** Commands for Linux and Windows are below.
3. **Confirm the port and the protocol.** Is the port number right, and is what you opened **UDP** (19132 by default, 19133 for IPv6)?
4. **Confirm the client version.** The client version must match the server version; see [Protocol Versions and Choosing a Version](/tutorials/bedrock/protocol).
5. **Confirm the network path.** LAN, public IP, and tunnel are three different paths, and either CGNAT or double NAT breaks the public-IP one.
6. **Read the server console and logs.** The exact error text is worth more than any amount of guessing. BDS prints startup output and errors to the console.
7. **Check permissions and the allowlist.** Was the player kicked, or did they never connect? A kick usually leaves a reason in the console.
8. **Check world and addon integrity.** Does `level-name` match a directory under `worlds/`? Are packs in the right directory and registered?

For step 2, Linux uses `ss -ulnp | grep 19132` (`-u` restricts output to UDP); Windows uses `netstat -ano | findstr 19132` (`-a` all connections and listeners, `-n` numeric, `-o` owning process ID); and a clearer form in PowerShell is `Get-NetUDPEndpoint -LocalPort 19132`.

```bash
ss -ulnp | grep 19132
```

```bat
netstat -ano | findstr 19132
```

**Symptom reference:**

| Symptom | Check first | Common cause |
| --- | --- | --- |
| The process is not running | The exact console error | Missing runtime, wrong Java or PHP version, port in use, malformed configuration |
| The process runs but nothing is listening | Whether the startup log shows a bind failure | Port in use; `enable-lan-visibility` claiming 19132/19133 |
| Listening locally, unreachable from outside | Public reachability | Security group or firewall not allowing UDP, CGNAT, double NAT |
| The port checker passes but players cannot join | Whether the checker tested TCP or UDP | Only TCP was opened |
| "Server is outdated" style message | Client and server versions | Protocol mismatch; a third-party core build that is too old |
| Players join and are immediately dropped | Any kick reason in the console | Allowlist, permissions, player limit |
| Players join but it is very laggy | Single-core load, `tick-distance`, entity counts | Single-thread bottleneck, oversized world |
| The world "disappeared" | `level-name` against the `worlds/` directory names | A typo in `level-name` made the server create a new world |
| An addon has no effect | Pack type and target directory | Wrong directory, or no `world_*_packs.json` |

## 6. What to include when asking for help

Providing all of this at once saves several rounds of back and forth:

| What to provide | Why it matters |
| --- | --- |
| **Server core and build** | The BDS version number, or the core name and build for Nukkit-family or PMMP. Different cores have different diagnostic paths |
| **Game version / protocol version** | The client and server versions; this is the first thing to check on Bedrock |
| **Operating system and architecture** | Windows or Linux, distribution and release, whether it is 64-bit, and whether it is x86-64 |
| **The full console error text** | **Do not paraphrase and do not paste half of it.** The keywords in the original error usually locate the problem directly |
| **What changed recently** | A core upgrade? A port change? A new addon? An edit to `server.properties`? |
| **Whether it ever worked** | "It has never worked" and "it worked yesterday" are entirely different diagnostic paths |
| **What you have already tried** | Avoids repeated suggestions and shows which directions are already ruled out |
| **Your network situation** | LAN or public, whether you have a public IP, which tunnel you use, and how port forwarding is configured |

:::tip How to supply an error
Copy the console output as text, or attach the log file. **Photos, screenshots, and only the final line** all slow the diagnosis down. If the output is long, keep several lines before and after the error rather than a single sentence.
:::

Related documentation: [[BE] Troubleshooting FAQ](/tutorials/faq/faq-be), [Protocol Versions and Choosing a Version](/tutorials/bedrock/protocol), [BDS Server](/tutorials/bedrock/bds), [Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party), [Getting Started with Third-Party Bedrock Cores](/tutorials/bedrock/third-party-setup), [Supporting Mobile Players](/tutorials/java/mobile), [Backup and Restore](/tutorials/java/backup), [Java vs Bedrock](/wiki/editions).

> Ports, field names, and directory layout follow the official BDS documentation and each core's official documentation.
