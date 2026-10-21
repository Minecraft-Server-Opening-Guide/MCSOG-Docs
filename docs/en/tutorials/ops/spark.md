---
title: Analysing Server Performance with spark
slug: spark
cat: ops
level: 3
order: 15
minutes: 16
tags: [spark, profiler, tps, mspt, performance, diagnostics, lag, java]
updated: 2026-10-04
draft: false
---

"Lag" is a symptom, not a cause. When players say the server is lagging, it might be a single plugin saturating the main thread, too many entities, chunks being generated because someone is exploring, or a host whose CPU is throttled or oversold. **spark turns "lag" from a feeling into evidence you can point at**: this call path, this plugin, this percentage.

This article covers spark itself. For tuning, see [Performance Optimisation](/tutorials/java/optimize); for entity pile-ups see [Entity and Item Pile-Ups](/tutorials/faq/entity-lag); for crashes and errors see the [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java).

:::warn Commands follow the official documentation
Every command and option below comes from spark's official documentation (spark.lucko.me/docs) and PaperMC's documentation, and has been checked against those pages. **The subcommands and options available differ slightly between platforms and major versions**; before you run anything, use `/spark` or tab completion to confirm what your build supports. Do not assemble options from memory.
:::

## 1. What spark Is and How to Install It

### 1.1 Three Components

spark is a performance profiler, described officially as a profiler for Minecraft clients, servers, and proxies. It is made up of three capabilities:

| Component | The question it answers |
| --- | --- |
| Profiler | Which methods and which plugins is CPU time going to? |
| Memory Inspection | What is using the most heap? How often does the GC pause? |
| Health Reporting | What do TPS, CPU, memory, and disk look like over time? |

It is also a website. spark.lucko.me is both the project homepage and the online report viewer. After you take a sample in game, the data is uploaded and you are given a link; open it in a browser to explore the call tree, flame graph, and so on.

A few things worth understanding up front:

- **spark is a sampling profiler.** The official "spark vs. others" page notes that sampling is usually less numerically accurate than instrumentation, but it barely slows the target program down, so in practice it often gives a truer picture of what the program is really doing.
- **It records everything.** Comparing itself to timings, the documentation points out that timings requires you to define the areas of interest in advance and can count how often events occur, which is friendlier to admins who are new to profilers. spark needs no such setup and records full stacks, which makes it better at answering "which piece of code is actually slow".
- **It is not only a server plugin.** spark can also attach to any JVM application as a Java agent, including a vanilla Minecraft server, and it applies deobfuscation mappings automatically when profiling a vanilla server.

### 1.2 Installing on Each Platform

The official download page (https://spark.lucko.me/download) publishes a separate build per platform. **Pick your platform first, then download**, drop the jar into the right directory, and restart the server.

| Platform | Download page entry | Where it goes | Notes |
| --- | --- | --- | --- |
| Bukkit / Spigot / Paper / Purpur | Bukkit (Paper/Spigot) | `plugins/` | Server plugin; already bundled on Paper 1.21+, see below |
| Fabric | Fabric | `mods/` | Mod form |
| Forge | Forge | `mods/` | Mod form |
| NeoForge | NeoForge | `mods/` | Mod form |
| Velocity | Velocity | `plugins/` | Proxy; different command prefix, see 1.4 |
| BungeeCord | BungeeCord | `plugins/` | Proxy; different command prefix, see 1.4 |
| Sponge | Sponge (API 12) | `mods/` | Listed separately on the download page |
| Client (Fabric/Forge, etc.) | Matching platform build | `mods/` | For client-side stutter; the command is `/sparkc` |
| Any JVM app / vanilla server | Standalone (Java Agent) | Startup arguments | See 1.3 |

:::note Paper 1.21 and newer already include spark
The official installation documentation states plainly that **Paper 1.21 or newer ships spark as part of the server, so there is no need to install the plugin**. Only if you want a newer spark than the bundled one should you place the standalone plugin jar in `plugins/` and add `-Dpaper.preferSparkPlugin=true` to your startup arguments to override the bundled version.
:::

:::warn Download only from the official site
Putting a jar in `plugins/` hands that jar control over your whole server. **Get spark from the official download page at https://spark.lucko.me/download** rather than a mirror, a file-sharing link, or an unknown repost. The download page also lists "Other Platforms" (Folia, Geyser, Minestom, Nukkit, Hytale and others); the documentation states these are community-provided and supported as-is, so evaluate them yourself before relying on them.
:::

### 1.3 The Standalone Agent

When the target is not a standard server - a vanilla server, or a Java application of your own - attach spark as an agent. To attach at startup:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar -jar application.jar [application args]
```

You can also choose the port the agent listens on:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222 -jar application.jar [application args]
```

The agent accepts these arguments (separate multiple arguments with commas):

| Argument | Meaning |
| --- | --- |
| `port={port}` | The port the agent listens on; default `2222` |
| `start` | Begin profiling immediately after attaching |
| `open` | Print a viewer link to the console/log after attaching |

For example:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222,start,open -jar application.jar
```

If the application is **already running**, attach to the process instead (replace `<pid>` with the process ID):

```bash
java -jar spark-x.y.z-standalone-agent.jar <pid>
java -jar spark-x.y.z-standalone-agent.jar <pid> port=2222
```

Run that jar without a PID and it prints a list of all running Java processes with their PIDs. Once the agent has attached, **the connection instructions are printed to the attached application's own console and logs**; follow them to connect over an SSH session, where you can run the usual spark commands, and type `exit` to disconnect.

### 1.4 Confirming It Loaded

The simplest check: **run `/spark` with no arguments**. It prints its version and the list of available subcommands. If you get an unknown-command message, or nothing at all, it did not load.

Work through the possibilities in order: is the jar in the right directory (`plugins/` or `mods/`), did you download the build for the right platform, did the server actually restart, and does the startup log mention spark loading?

Command prefixes vary by platform, and the official documentation calls this out explicitly:

| Environment | Command to use |
| --- | --- |
| Server (Bukkit family, Fabric/Forge servers) | `/spark` |
| BungeeCord | `/sparkb` |
| Velocity | `/sparkv` |
| Forge/Fabric **client** | `/sparkc` |

On permissions: you need the `spark` permission, or the per-subcommand node. The nodes documented officially are `spark.profiler`, `spark.health`, `spark.ping`, `spark.tps`, `spark.tickmonitor`, `spark.gc`, `spark.gcmonitor`, `spark.heapsummary`, `spark.heapdump`, and `spark.activity`. In most cases **making yourself an operator** is enough.

:::tip An easily missed configuration default
spark's `overrideTpsCommand` setting defaults to `true` and is **only read when spark runs on a Bukkit server**. In other words, by default `/tps` is taken over by spark, and what you see is spark's own TPS view.
:::

## 2. Start with Overall Health

### 2.1 What TPS and MSPT Actually Mean

Start with the tick loop (from the official "The Tick Loop" guide):

- A Minecraft server aims to run **exactly 20 ticks per second**, which means **one tick every 50 milliseconds**.
- Each tick handles incoming packets from players (movement, placing and breaking blocks, attacking entities), updates player and entity positions, broadcasts world changes back to players, spawns mobs and runs their AI and pathfinding, processes redstone updates, and more.
- If a tick takes **less than** 50 milliseconds, the server sleeps for the remaining time until it is time to start the next tick. **Sleeping is healthy.**
- If a tick takes **more than** 50 milliseconds, the next tick has to be delayed, because ticks cannot run in parallel. Everything shifts to the right, fewer ticks complete in the same second, and gameplay feels slower and less responsive.

The two metrics follow from this:

| Metric | Full name | Meaning | Target |
| --- | --- | --- | --- |
| TPS | ticks per second | How many ticks complete per second on average | **20** |
| MSPT | milliseconds per tick | How many milliseconds a tick takes on average | **50 or lower** |

The documentation notes that `/spark tps` also reports the **minimum, median, 95th percentile, and maximum** MSPT, and that spark colours these values green, amber, or red according to how healthy they look.

**Why the maximum matters**: all of these are averages and summary statistics. The tick loop guide warns specifically that a server can spend only 20 milliseconds on most ticks (healthy) and then occasionally spend 300 milliseconds on one tick (not healthy). That is a **lag spike**, and averaging hides it, which is why average TPS alone will miss the problem.

### 2.2 /spark tps

```text
/spark tps
```

This prints the server's TPS and CPU usage. It is the **first step** of every investigation: establish whether there is a problem at all before reaching for the profiler.

### 2.3 /spark health

The `health` subcommand generates a health report for the server covering **TPS, CPU, memory, and disk usage**. The documented forms are:

```text
/spark health
/spark health upload
/spark health show
/spark health show --memory
/spark health show --network
```

| Command | Behaviour |
| --- | --- |
| `/spark health` | Opens in the viewer as a **live dashboard that refreshes every 10 seconds** |
| `/spark health upload` | Uploads a **static** health report that does not update |
| `/spark health show` | Prints a basic report to the console, no browser needed |
| `/spark health show --memory` | Adds detail about JVM memory usage |
| `/spark health show --network` | Adds detail about system network usage |

### 2.4 /spark ping

```text
/spark ping
/spark ping --player <username>
```

With no arguments this shows the average ping (round-trip time) across all players; with `--player` it shows one player's current ping.

**Why this deserves its own section**: when players report lag, it may be the server's tick loop, or it may simply be their own network path to the datacentre. High ping with normal MSPT points at the network, and no amount of server configuration will fix it. This command is how you **separate a network problem from a tick problem**.

### 2.5 Reading Behaviour Over Time

A single `/spark tps` is a snapshot. For a trend, use the `/spark health` live dashboard: it refreshes every 10 seconds, so you can treat it as a timeline and watch whether TPS, MSPT, and CPU are **persistently poor** or **dipping periodically**.

| Pattern | What it means | What to do next |
| --- | --- | --- |
| TPS persistently low, MSPT persistently high | The main thread is behind for a sustained period | Go straight to the profiler and find the hot spot |
| TPS mostly normal, occasionally dipping | Lag spikes | Locate them with tickmonitor, then sample with `--only-ticks-over` |

:::note How to read "low TPS with normal MSPT"
Reasoning from how the tick loop works: if MSPT really is normal (every tick finishing inside its 50 millisecond budget), TPS should not stay low, because the sleep between ticks restores the rhythm. So when TPS is low but MSPT looks normal, the suspect is not "a plugin that is written slowly" but something **external**: the server was paused (a long stop-the-world pause, a world save, a host suspend or migration), the host CPU is being throttled or contended by another tenant, or **the data itself is wrong**.

That last possibility has official backing. Every metric spark reports is taken from server events and Java or operating-system APIs, and the "About spark metrics" page states plainly that **CPU and memory metrics are occasionally misreported when the server runs inside a container** (Pterodactyl and similar), and that if something looks wrong, it is likely the raw data spark receives that is wrong. To be explicit: **"low TPS with normal MSPT points to an external cause" is an inference drawn here from the tick loop mechanics, not a conclusion the official documentation states.** Confirm it against CPU usage, host load, and GC logs.
:::

## 3. Sampling with the Profiler

### 3.1 Commands and Options

Everything in this section comes from the official Command Usage page.

Basic operation:

| Command | Effect |
| --- | --- |
| `/spark profiler start` | Start profiling in the default mode |
| `/spark profiler stop` | Stop and view the results (uploaded, with a link, by default) |
| `/spark profiler cancel` | Stop the profiler **without uploading** the results |
| `/spark profiler open` | Open the viewer page for an already-running background profiler without stopping it |
| `/spark profiler info` | Check the current profiler status |

Common options:

| Option | Effect |
| --- | --- |
| `--timeout <seconds>` | Stop automatically after this many seconds |
| `--only-ticks-over <milliseconds>` | **Record only ticks longer than this**, for catching spikes |
| `--thread *` | Track all threads |
| `--thread <thread name>` | Track only the named thread |
| `--thread <pattern> --regex` | Track only threads whose names match the regular expression |
| `--interval <milliseconds>` | Sampling interval; default 4 |
| `--alloc` | Profile **memory allocations** (memory pressure) instead of CPU |
| `--alloc --alloc-live-only` | Allocation profiling that keeps stats only for objects not garbage collected by the end |
| `--alloc --interval <bytes>` | Allocation sampling rate; default `524287` (about 512 KB) |
| `--combine-all` | Combine all threads under a single root node |
| `--not-combined` | Do not group threads from a thread pool together |
| `--ignore-sleeping` | Record only samples from threads that are not in a sleeping state |
| `--force-java-sampler` | Force the Java sampler instead of the async one |
| `stop --comment <comment>` | Include a comment in the viewer when stopping |
| `stop --save-to-file` | Save the profile to a file under the config directory **instead of uploading** |

Combined examples, as written in the official guides and Paper's documentation:

```text
/spark profiler start --timeout 60
/spark profiler start --timeout 600
/spark profiler start --only-ticks-over 150
/spark profiler stop --comment "baseline before change"
/spark profiler stop --save-to-file
```

:::note On a bare /spark profiler
The official documentation describes profiler control through the explicit subcommands `start`, `stop`, `cancel`, `open`, and `info`; it does not describe a bare `/spark profiler` as an action of its own. The configuration page also states that spark's **background profiler is enabled by default** (`backgroundProfiler` defaults to `true`), in which case you can operate on **the run that is already in progress** with `/spark profiler stop` or `/spark profiler open`. So: **use the subcommands, and do not assume what a bare command does.**
:::

### 3.2 The Standard Workflow

```text
1. Confirm the problem is happening right now (the official docs stress that profiling only
   works while the issue you are diagnosing is actively occurring)
2. Start sampling: /spark profiler start --timeout 60
3. Let the server run under real load for 30 to 60 seconds (players online, reproduce the action)
4. It stops on its own; a spark.lucko.me/xxxx link appears in chat or the console
5. Open that link in a browser
6. Start with "Server thread" and click down through the widest nodes
```

Choosing a duration: if the problem **is happening now**, 30 to 60 seconds is plenty. If it is **intermittent**, use a longer `--timeout` (Paper's documentation uses `--timeout 600`, ten minutes), or switch to the spike-focused approach in section 3.6.

### 3.3 Reading the Report in the Viewer

The official "Using the viewer" page explains the structure well.

**Threads**: the first thing you see is a list of threads. Think of a thread as a worker doing one particular job inside the program. On a server, **the one that usually matters is "Server thread"**, the main thread that runs the game. The root node (the thread itself) always shows 100%, because 100% of the sampled time was spent inside that thread.

**Call frames (nodes)**: each node shows three pieces of information - the **name**, the **percentage of that thread's total time** taken by the frame, and the **milliseconds** (shown on hover). Clicking a node expands its children.

The shape you typically see when expanding the server thread (from the official example):

```text
Server thread
  java.lang.Thread.run()
    MinecraftServer.run()
      MinecraftServer.tick()        <- where the work happens
      Thread.sleep()                <- sleeping, healthy, ignore it
```

**The sleep percentage is the first thing to look at.** The tick loop guide gives these rules of thumb:

| Sleep (waitForNextTick / sleep) share | Meaning |
| --- | --- |
| Higher is better (81% in the official example) | The server has spare capacity and can absorb bursts |
| Below 20% | The server is working hard; some ticks may already be overrunning |
| Below 5% | It is probably lagging, with no spare capacity |

**But all of these are averages.** The documentation stresses that spikes get averaged away, so a high sleep share does not mean there are no lag spikes.

**Three views** (switch from the top controls bar):

| View | Contents | When to use it |
| --- | --- | --- |
| All (default) | The full expandable call tree | Following the percentages downwards |
| Flat | The **250 slowest method calls** flattened to the top level | Quickly seeing what costs the most overall |
| Sources | **A separate tree per plugin/mod**, top level showing that source's outgoing calls | Going straight to "which plugin" |

Flat view has two further dimensions. Display can be **Top Down** (the normal direction, expanding reveals sub-methods) or **Bottom Up** (reversed, expanding reveals what called the method). Sort can be **Total Time** (time in the method plus its sub-calls) or **Self Time** (time spent executing the method itself).

**Flame graph**: click the flame icon in the top controls bar, or right-click a thread or method call and choose "View as Flame Graph". The documentation states that **the width of each node corresponds to the portion of time spent executing it**, and that clicking a node focuses it, expanding it to fill the page. This is where the often-quoted advice to "look at the widest bar" applies.

**Deobfuscation mappings**: the Minecraft client and server obfuscate class and method names. The viewer **detects automatically which mappings to apply**; if that does not work, choose them manually from the dropdown menu in the top right of the page.

**Bookmarks**: hold `alt` and click a method call, or right-click it and choose "Toggle bookmark", to highlight it. The bookmark is **encoded into the URL**, so if you share that modified link the other person sees the same methods highlighted and expanded automatically. It is the easiest way to point someone at a specific line.

### 3.4 The Server Thread Versus Async Threads

- **Server thread**: the main thread running the tick loop. Almost every performance problem lives here.
- **Async threads**: plugin async tasks, chunk saving, network IO (Netty), GC threads, and so on. They do **not** consume the tick budget directly, but if they compete for CPU or contend on locks with the main thread, they still hurt it.

The official documentation describes `--thread *` as tracking **all** threads, which means that by default not every thread is included in the sample. **If you suspect a plugin is offloading heavy work to an async thread** - which looks like high CPU while the server thread appears idle - sample again with `--thread *` explicitly.

### 3.5 Attributing Time to a Plugin

This is where spark is most useful compared with timings: **plugin package names show up in the report**.

If the server thread contains a wide frame such as:

```text
com.example.shop.ShopManager.tickShops()
```

then the `com.example.shop` plugin is doing that work. The procedure:

1. In the All view, follow the percentages downwards until you reach something that looks like a plugin package (usually a reverse domain name such as `me.lucko.` or `com.example.`).
2. Or switch straight to the **Sources view**, which builds **a separate tree per plugin/mod**; whichever tree is fattest is the prime suspect.
3. If the top frame is server code (NMS), do not stop there: use **Bottom Up**, or keep expanding, to see **who called it**. It is very often a plugin triggering that server code through an event or API.

### 3.6 Hunting Lag Spikes: tickmonitor and only-ticks-over

Averages hide spikes, so the documentation offers a dedicated combination.

Step one, use `tickmonitor` to find out what counts as abnormally slow:

| Command | Effect |
| --- | --- |
| `/spark tickmonitor` | **Toggles** the monitoring system on and off |
| `/spark tickmonitor --threshold <percent>` | Report only ticks exceeding the average tick duration by this percentage |
| `/spark tickmonitor --threshold-tick <milliseconds>` | Report only ticks exceeding this duration in milliseconds |
| `/spark tickmonitor --without-gc` | Start monitoring but disable reports about GC activity |

The default threshold is **100%**, meaning a tick is reported when it takes twice as long as average. Lower it to become more sensitive:

```text
/spark tickmonitor --threshold-tick 50
/spark tickmonitor --threshold-tick 70
```

Step two, use `--only-ticks-over` so the profiler records only those abnormal ticks:

```text
/spark profiler start --only-ticks-over 150
```

The guidance in the official guide: **a value between 50 and 100 is recommended, but it must always be lower than the duration your laggy ticks actually take**, otherwise the spike itself gets filtered out. In the documented example the laggy action took over 300 milliseconds, so a threshold of 150 was chosen for safety.

The resulting report has all the normal game work filtered out, leaving only the spikes, so the hot spots stand out clearly.

## 4. Other Diagnostic Tools

| Command | The question it answers | When to use it |
| --- | --- | --- |
| `/spark tps` | Is it actually lagging right now? What are TPS, MSPT, and CPU? | First step of every investigation; comparing before and after a change |
| `/spark health` | How healthy is the server overall (TPS, CPU, memory, disk)? | When you need continuous observation; the live dashboard refreshes every 10 seconds |
| `/spark health upload` | The same, but as a shareable static snapshot | Sending to someone, or keeping a record |
| `/spark health show` | The same without opening a browser | A quick look over SSH; add `--memory` or `--network` |
| `/spark ping` | Is player latency high, and is it the network or the tick loop? | As soon as players report lag, to separate the two |
| `/spark profiler start` | Which methods and plugins is CPU time going to? | Once you have confirmed there is a real problem |
| `/spark tickmonitor` | Which ticks are abnormally slow, and how often? | Intermittent lag and spikes |
| `/spark gc` | What does the GC history look like? Are pauses frequent? | When you suspect memory or GC is causing the lag |
| `/spark gcmonitor` | Watches the GC continuously and reports activity | When you suspect GC spikes; turn it on, reproduce, turn it off |
| `/spark heapsummary` | What objects occupy the most heap? | When you suspect a memory leak; the result is uploaded to the viewer |
| `/spark heapdump` | A full heap snapshot (`.hprof`) | For deep offline analysis with tools such as MAT; the file is large |
| `/spark activity` | Who used spark recently, and for what? | On a shared server, to check whether someone else is sampling; `--page <n>` pages through it |

A few details that are easy to get wrong.

### 4.1 GC: /spark gc and /spark gcmonitor

`/spark gc` prints the server's **GC (garbage collection) history**. It answers whether the collector is holding the server back.

`/spark gcmonitor` **toggles** the GC monitoring system (run it again to turn it off). Its real value is **correlating GC with lag**: turn monitoring on, reproduce the lag once, then check whether GC activity lines up with the moment things stalled. If it does, the investigation moves to heap sizing and GC tuning rather than plugin hot spots.

### 4.2 Memory: /spark heapsummary and /spark heapdump

The distinction matters:

| Command | Output | Purpose |
| --- | --- | --- |
| `/spark heapsummary` | A heap **summary**, uploaded to the viewer | Quickly see which kinds of objects dominate memory, to judge whether a leak is plausible |
| `/spark heapdump` | A full `.hprof` file written to disk | Deep offline analysis of object reference chains |

The option for `/spark heapdump` is `--compress <type>`, which supports `gzip`, `xz`, and `lzma`. The documentation marks `--include-non-live` (include unreachable objects) and `--run-gc-before` (suggest the JVM runs the collector first) as **deprecated**; `heapsummary`'s `--run-gc-before` is deprecated as well.

:::warn Heap dumps are heavy
A full heap dump **writes a file on the order of your heap size to disk**, and the process causes a noticeable JVM pause. Do not run it casually on a production server at peak time, and check free disk space first.
:::

## 5. Going from a Report to a Cause

### 5.1 Decision Table

One caveat first: **method names change with the version, the server implementation, and the mapping set**. The official viewer example uses names such as `WorldServer.doTick()` and `WorldServer.tickEntities()`, which correspond to older mappings; on other versions you may see `ServerLevel.tick` or `Level.tickEntities` instead. **Do not memorise names - read the shape and the percentages**, and let the viewer's automatic deobfuscation help.

| What the report shows | Likely conclusion | Next step |
| --- | --- | --- |
| A **plugin package** (for example `com.example.shop`) dominates the server thread | That plugin is the bottleneck | Update it, replace it, or limit how often it runs; send the report link to its author |
| `Entity.tick` or `Level.tickEntities` dominates (older mappings: `WorldServer.tickEntities`) | **Too many entities** | See [Entity and Item Pile-Ups](/tutorials/faq/entity-lag): clear dropped items, limit spawning, lower view distance and entity-related settings |
| Chunk-related calls dominate (`ChunkMap`, `ChunkGenerator`, and similar) | **Chunk generation or loading** | Pre-generate the map so exploring new terrain does not generate chunks live |
| Hoppers and block entity ticking (`hopper`, `LevelChunk.tickBlockEntities`, and similar) | **Redstone, hopper, and block entity load** | Rate-limit hoppers, consolidate farms, and reduce redstone machines in always-loaded chunks |
| Long GC pauses appear on the timeline | **Memory or GC configuration** | Tune heap size and the collector; rule out a leak with `heapsummary` first |
| Only **one world or one area** is slow | A specific farm or build | Locate the coordinates and dismantle, limit, or move it to its own server |
| `waitForNextTick` or the sleep share is very low (below 5%) | The server has no spare capacity at all | Not a single hot spot but a capacity problem: cut load or move to stronger single-core hardware |
| Sleep share is high, yet players still report lag | Averages are hiding spikes | Go to section 3.6: `tickmonitor` plus `--only-ticks-over` |

### 5.2 Two Common Attribution Mistakes

**Mistake one: assuming an NMS frame means "the server's fault".** Methods such as `Entity.tick` are server code, but **what triggers them may be a plugin, player behaviour, or a farm design**; use Flat view with **Bottom Up** to find who called it.

**Mistake two: concluding from Total Time alone.** A method with high Total Time may simply be a shell that calls many sub-methods; sort by **Self Time** to see which methods **actually spend the time themselves** - that is what needs changing.

### 5.3 Always Compare Before and After

A single report only tells you what is happening now; it cannot tell you whether a change helped. Do this instead:

```text
1. Take sample A: /spark profiler stop --comment "baseline before change"
2. Make one change, and only one
3. Take sample B under conditions as similar as possible (player count, time of day, same area)
4. Compare the percentage of the same node in both reports
5. If it did not improve, roll the change back and test the next hypothesis
```

Change one variable at a time, or attribution becomes impossible. And compare the **percentage of the same node**, not absolute values, because the two samples may differ in duration and player count.

## 6. Practical Workflow and Cautions

### 6.1 Profiling Has a Cost

spark is a sampling profiler, so its overhead is far smaller than instrumentation, but it is **not zero**:

- The background profiler is **enabled by default**, sampling at an interval of **10 milliseconds** (`backgroundProfilerInterval`).
- The default engine is `async` (async-profiler). The documentation notes it is more accurate than the Java/WarmRoast engine because it does not suffer from safe-point sampling bias, and that it is used automatically when the system supports it. It requires Linux or macOS on x86_64 or aarch64; in containers you may also need to install `libstdc++`.
- **Allocation profiling (`--alloc`) and heap dumps are heavier**: the former requires HotSpot debug symbols, which modern JVMs (Java 11 and later) should have by default, while the latter write a large file and pause the JVM.

:::warn Do not leave the profiler running
Profiling exists to answer one specific question; stop when you have the answer. Using `--timeout` so it stops by itself is the least error-prone approach. **Leaving a profiler attached to an already-struggling server only makes things worse.**
:::

### 6.2 Sharing Reports and Privacy

The official documentation is positive about sharing: a profile is uploaded to the viewer automatically and you are given a link, and **you can freely share that link with other people** - with someone helping you, or with a plugin or mod developer to point out a problem. The bookmark mechanism even encodes "this is the line I mean" into the URL.

Several things are still worth being clear about:

1. **Uploading is the default.** `/spark profiler stop` uploads; only `/spark profiler stop --save-to-file` saves the profile to a file under the config directory **instead of uploading it**.
2. **The documentation does not describe a "keep this private" switch.** None of the pages checked for this article mention access control or private reports. So **treat a report link as something anyone who obtains it can open.**
3. **The raw data is retrievable.** The "Raw spark data" page documents that appending `?raw=1` to a viewer URL returns JSON metadata, and that the raw data can be requested directly from `https://spark-usercontent.lucko.me/<code>` (content types `application/x-spark-sampler`, `application/x-spark-heap`, and `application/x-spark-health`). In other words, **the short code itself is the credential**.
4. **The metadata contains identifying information.** The documented example metadata includes the requesting user's name and UUID. Think about that before pasting a link somewhere public.
5. **Opening reports locally**: if you would rather not upload, drag a `.sparkprofile` or `.sparkheap` file into the drop area on the viewer page and read it there. If you are asking for help, Paper's documentation recommends bringing a spark report to their Discord `#paper-help` channel; that is Paper's own suggested route.

### 6.3 A Checklist for One Profiling Session

```text
Prepare
[ ] Confirm it loaded (/spark) and record the current state (/spark tps)
[ ] Confirm the problem is happening now (otherwise you will sample nothing)
[ ] Check free disk space (especially if a heap dump may be involved)
Sample
[ ] Sustained lag     -> /spark profiler start --timeout 60
[ ] Intermittent spikes -> find a threshold with /spark tickmonitor, then
                           /spark profiler start --only-ticks-over <ms> --timeout <s>
[ ] Suspect async threads -> add --thread *; suspect allocations -> add --alloc (heavier, see 6.1)
[ ] Do not leave it running indefinitely
Read the report
[ ] Start with the sleep share on the Server thread
[ ] Click down from the widest node, following the percentages
[ ] Attribute to a specific plugin with the Sources view
[ ] Find methods that spend time themselves using Flat plus Self Time
[ ] Find who called the slow method using Bottom Up
[ ] For spike sessions, confirm --only-ticks-over worked (the report should not be
    full of ordinary ticks)
Conclude and verify
[ ] Write down the conclusion: which plugin, which kind of entity, which area, or capacity
[ ] Change one thing, then sample again under the same conditions
[ ] Label reports with --comment and keep the links for comparison
```

### 6.4 When Not to Use spark

If players simply have high latency, run `/spark ping` first, because it may be a network path problem rather than a server performance problem. If the server will not start or it crashes, read the logs and crash reports instead (see the [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java)). If TPS is normal but players say it feels bad, check client rendering, view distance, and network jitter before reaching for a profiler.

Related reading: [Performance Optimisation](/tutorials/java/optimize) (configuration and JVM tuning), [Entity and Item Pile-Ups](/tutorials/faq/entity-lag) (too many entities), [System Hardening](/tutorials/ops/system-security) (host-side hardening), and [Backup and Recovery](/tutorials/java/backup) (a safety net before you change anything).

> spark's commands and options are governed by its official documentation; the commands available differ slightly between platforms.
