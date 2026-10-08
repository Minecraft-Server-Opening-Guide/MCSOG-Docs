---
title: Hosting Protocol and Recommended Configuration
slug: protocol
cat: java
level: 1
order: 1
minutes: 10
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, protocol, eula, configuration, hardware, memory]
updated: 2026-10-04
draft: false
---

Before hosting a server, two things have to be settled first: **whether the licence even allows it**, and **whether the machine can take it**. Get either wrong and everything that follows — installing the environment, choosing a core — just burns time and money.

:::note What this guide covers
① Where the official EULA draws the line for individual server owners; ② minimum and recommended specs; ③ why CPU matters more than memory.
:::

## 1. The Official EULA: What You Can and Cannot Do

A Java Edition server must accept the [Minecraft End User License Agreement (EULA)](https://aka.ms/MinecraftEULA) before it will start. It is simple: the first launch generates `eula.txt`; change `eula=false` to `eula=true`. **Leave it as it is and the server exits immediately after starting.**

| Item | Details |
| --- | --- |
| Private server | Free to set up; no restrictions on playing with friends |
| Distributing the server software | You **may not** redistribute the official server jar; download it only from official or core-project official channels |
| Charging money | You may charge for your server, but you may not sell the game itself or sell vanilla gameplay content that affects fairness; the official terms of each core and platform govern in detail |
| Using the official name | You **may not** let players believe your server is run by Mojang |
| Online mode | `online-mode=true` is the default in `server.properties` and validates premium accounts |

:::warn About offline mode
`online-mode=false` (an "offline server") lowers the barrier to entry, but it also removes account protection: anyone can join under any ID, and premium skins and UUID binding stop working. **Use it only if you fully understand the risks and the server is not open to the public.**
:::

## 2. Recommended Configuration

### Minimum Specs (1–3 players, a small server to test the waters)

| Item | Requirement | Details |
| --- | --- | --- |
| CPU | **2 cores** (3GHz+ high single-core clock preferred) | Look at single-core performance, not core count |
| Memory | **4GB** (1GB for the system + 3GB for MC) | Always leave headroom for the operating system |
| Disk | **20GB SSD** | Mechanical drives load painfully slowly |
| Network | Upload bandwidth of **at least 10Mbps** | Upload is the bottleneck; a fat download pipe is useless |

### Recommended Specs (up to 10 players, stable long-term hosting)

| Item | Requirement | Details |
| --- | --- | --- |
| CPU | **4 cores** | Single-core clock speed still comes first |
| Memory | **8GB** (allocate 6GB to MC) | The rest goes to the system and cache |
| Disk | **50GB SSD** | Worlds, backups and logs all keep growing |
| Network | Upload bandwidth of **30Mbps+** | More players and plugins need more headroom |

### Technical Server Specs (running machines and world eaters)

| Item | Requirement | Details |
| --- | --- | --- |
| CPU | **8 cores** (4.5GHz+ single-core clock recommended) | World eaters, update suppression and large machines all sit on one core; the extra cores are headroom for sub-servers and background work |
| Memory | **16–32GB** | Multiple sub-servers in mind: each one needs its own allocation, and the system plus cache still need room |
| Disk | **120GB+** | Backups in mind: once machines start moving earth, worlds and backups grow far faster than on an ordinary survival server |
| Network | Upload bandwidth of **100Mbps+** | Schematic sync, many players in one area and heavy entity traffic all ride on upload, so leave plenty of headroom |

### Why CPU Matters More Than Memory

**A Minecraft server demands far more from single-core CPU performance than from memory.** The main thread processes entities, chunks, redstone and plugin logic serially, and nearly all of it lands on **one core** — you can add more cores, but there is still only one main thread.

That is why this happens: **a 2-core 4GB machine clocked at 3.5GHz per core actually feels smoother than an 8-core 2GB machine.** The first has a strong core and an unblocked main thread; the second has plenty of cores but low clocks and too little memory, so TPS still drops.

Priority when choosing a machine:

1. **Single-core clock speed** (higher is better; 3.5GHz and above is noticeably better)
2. **Memory capacity** (enough is enough; too little means OOM or frequent GC)
3. **Disk type** (an SSD is mandatory; it affects chunk loading and world saves)
4. **Core count** (only plugin servers, multi-instance setups and proxies need more cores)

:::tip More memory is not always better
An oversized `-Xmx` for MC has two side effects: ① individual GC pauses get longer, which shows up as periodic stutter; ② the memory available to the system shrinks, which actually makes things slower. **4–6GB is usually enough for up to 10 players**; leave the rest to the system.
:::

### Other Factors That Affect the Experience

- **Disk I/O**: the larger the world and the more often players explore, the heavier the I/O pressure. An SSD is not just about "fast startup" — it directly affects stutter while chunks are generated.
- **Upload bandwidth**: home connections usually upload far less than they download. Before hosting, check your actual **upload** speed instead of the "500M" printed on the plan.
- **Network latency**: the physical distance between players and the server sets the baseline latency; domestic players get the best experience on a domestic datacenter.
- **Whether it stays online**: a home PC drops the connection as soon as it sleeps or loses power. If you intend to host long term, a cloud server or dedicated host is a better fit.

## 3. What to Do Next

1. **Pick an operating system**: see [Choosing an Operating System](/tutorials/java/os) — Linux is preferable for long-term hosting, while Windows is good enough for playing locally with people you know
2. **Set up the environment**: see [Environment Setup (Windows and Linux)](/tutorials/java/environment) — install the right Java, open the port, create the directories
3. **Pick a core**: see [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison) — for a first server, Paper is usually the obvious choice

:::note Summary
The EULA is accepted, **single-core clock speed outranks core count and memory**, and the SSD and upload bandwidth are up to scratch — meet those three and the machine will host a stable server.
:::
