---
title: Bedrock Edition Performance Tuning
slug: optimize
cat: bedrock
level: 3
order: 8
minutes: 16
tags: [bedrock, bds, performance, view-distance, tick-distance, memory, restarts, third-party-cores]
updated: 2026-10-04
draft: false
---

Bedrock optimisation follows a different logic from Java Edition. Java has plugins, `spark`, and dozens of tunable settings; the official Bedrock server (BDS) has **very few knobs**, and several of its keys are not even named the same way across versions. So on Bedrock, "optimisation" happens mainly in **world design** and **hardware**, not in a config file.

This article covers the official **BDS** only. If your server is not running yet, start with [The BDS Server](/tutorials/bedrock/bds). If you run a third-party core, jump to section 7.

## 1. Bedrock's Performance Model Is Not Java's

| Item | Java Edition (Paper and friends) | Bedrock Edition (official BDS) |
| --- | --- | --- |
| World simulation | Main-thread tick, but the core exposes many optimisation switches | Simulation sits essentially on **one thread**; extra cores help little |
| Plugin ecosystem | Enormous; much optimisation is done by plugins | The official server **does not support plugins**; add-ons and the script API are the alternative |
| Tunable settings | Core config plus plugin config, dozens of options | Only a handful of performance-related keys in `server.properties` |
| Memory control | You set `-Xmx` / `-Xms` | **No memory flag**; the program requests memory from the OS itself |
| Analysis tools | `spark` flame graphs, various profilers | **No `spark`**, and no mature flame-graph workflow |
| Hot reload | Possible in some cases | No `/reload`; changing settings means a restart |

The single most important point is that **single-core clock speed sets the ceiling**:

- World simulation runs on one thread; the remaining cores mainly carry networking, save writes, and other side work;
- A "16 cores at 2.0 GHz" machine will usually feel worse than a "4 cores at 4.5 GHz" machine;
- When buying, look at single-core performance first and core count second.

:::warn Java Edition tuning advice does not transfer
None of the following exist on BDS, so do not follow Java tutorials for them:

- `spark` flame graphs (not supported on BDS - see section 8);
- The `paper.yml` / `spigot.yml` family of settings;
- Plugin or core switches for entity activation range, spawn caps, or entities ticked per tick;
- Optimisation plugins (the official server has no plugin system).

What does transfer is the **concept**: fewer loaded chunks, fewer entities, less high-frequency redstone.
:::

## 2. What You Can Tune: `server.properties`

:::warn Which keys exist, and their defaults, vary by BDS version
Across BDS versions, the **key names, allowed ranges, and defaults in `server.properties` can all differ**: some keys were added later, and some were renamed or split into several keys (the movement-validation group is the classic example).

So this article explains only what these keys **do** and what lowering them costs. **Open the `server.properties` in your own server directory and check every entry**: in the file the official server generates, each key has a comment line above it describing its meaning, allowed range, and default. That comment is the most accurate statement for your version.
:::

### 2.1 The Main Performance Keys

| Key | What it does | Cost of lowering it | Recommended direction |
| --- | --- | --- | --- |
| `view-distance` | How much chunk data the server sends to players, i.e. how far they can see | Fog in the distance, terrain popping in, worse visuals | **The first one to touch**: lower it when players' devices are modest or bandwidth is tight |
| `tick-distance` | How far around a player chunks are **actually simulated** (spawning, crops, redstone, fluids) | Distant machines, farms, and redstone circuits may stop | Affects CPU more directly than view distance; keep it small unless you need distant machines |
| `max-threads` | How many threads the server will try to use (in some versions 0 or a removed line means unlimited) | Setting it too low can queue up networking and save work | **It does not split world simulation across cores**; raising it is not a speed-up, so leave the default first |
| `player-idle-timeout` | How many minutes before an idle player is kicked | Idle players disconnect sooner, which affects AFK play | A near-zero-cost win; set it according to your AFK rules |
| `compression-threshold` | The payload size at which network packets start being compressed | Lowering it compresses more packets, costing **more CPU** and saving bandwidth | Find the bottleneck first: lower it when bandwidth is tight, raise it when CPU is tight |
| `compression-algorithm` | The network compression algorithm (commonly options such as `zlib` / `snappy`) | Switching to a lower-ratio algorithm trades bandwidth for CPU | Pick the faster algorithm when bandwidth is plentiful, the higher-ratio one when it is tight |

Three things need to be said clearly about these keys:

1. `view-distance` and `tick-distance` are **two different things**: one decides what players can see, the other decides what actually runs. Lowering view distance mainly affects visuals; lowering tick distance affects machines.
2. `max-threads` is a **thread cap**, not a "parallel world simulation" switch. Raising it will not make the single-core bottleneck go away.
3. `player-idle-timeout` is one of the few **almost cost-free** reductions: kicking idle players means fewer loaded chunks and fewer simulated entities.

### 2.2 Movement Validation and Anti-Cheat Keys

These keys are **not performance switches**, but they are often mistaken for tuning options, so they get their own explanation:

| Key | What it does | Cost of loosening validation | Recommended direction |
| --- | --- | --- | --- |
| `server-authoritative-movement` (some versions) | Server-authoritative movement; its value selects one of several validation modes, with more server authority meaning stricter | Loosening means fewer position corrections, but **more room to cheat** | Keep the default or stricter on a public server |
| `server-authoritative-movement-strict` (some versions) | Validates player positions more strictly, so corrections are more frequent | Turning it off means less jitter, but wall-clipping and teleporting are harder to catch | Do not disable it "to save performance" |
| `player-position-acceptance-threshold` | The **tolerance** for client-versus-server position differences | Lowering it means more frequent corrections, so high-latency players get pulled back more | Loosen it only slightly when latency is universally high and players are constantly pulled back, and be explicit about the security trade |

:::warn Do not treat anti-cheat as a performance switch
Position corrections do cost network traffic, but what they buy is "players cannot teleport at will". Loosening validation to save a little CPU or bandwidth is a classic bad trade. Only consider a small adjustment when **latency is universally high and players are constantly being pulled back**, and be clear about what you are giving up.
:::

### 2.3 Other Keys That May Exist

Depending on the version you will also find keys that touch performance indirectly, for example:

- A switch that pushes **visible chunk generation** down to clients: the server does less work, at the cost of worse performance on weak clients;
- **Content log** and **watchdog** keys for add-ons and scripts: they surface script errors, scripts that run too slowly, and memory overruns.

Whether they **exist, what they are called, and what they default to all vary by version**, so no specific key names or values are given here - check your own file and the official documentation. Confirm your version really has them before using them, and do not copy another version's config from the internet.

### 2.4 An Example Snippet

```properties
# View distance: lower it first, then watch visuals and CPU
view-distance=12

# Simulation distance: keep it small unless you need distant machines
tick-distance=4

# Thread cap: keep the default; it is not a speed-up switch
max-threads=8

# Idle kick: set it according to your AFK rules
player-idle-timeout=15

# Compression: keep the default when bandwidth is tight; raise the threshold when CPU is tight
compression-threshold=1
compression-algorithm=zlib
```

These values are **examples only** - they are neither defaults nor recommendations. Compare them against the comments in your own file and replace them with values that suit you.

:::note A restart is required
BDS does not support `/reload`. After editing `server.properties`, stop the server gracefully with `stop` on the console and start it again; do not kill the process.
:::

## 3. The Real Big Lever: World Design

On Bedrock, **you can configure very little, but you can build a great deal**. Almost every case of "the server is lagging" traces back to the map:

| Load source | What to do |
| --- | --- |
| Too many chunks loaded at once | Lower `view-distance` and `tick-distance`, and keep ticking areas to a minimum |
| Too many always-loaded machines | Every machine that must run with nobody around costs CPU continuously; tear down or switch off the ones you do not need |
| Redstone clocks that never stop | High-frequency clocks are a classic load source; use a slower circuit when you can |
| Too many entities | Mobs, dropped items, and minecarts pile up; control farm size and collect or clear drops promptly |
| Farms that are too large | A farm producing far more than you need is pure load; shrink it or run it on demand |
| Accumulating dropped items | Poorly designed collection or disposal keeps entities alive for a long time |

A few notes:

- A **ticking area** keeps designated chunks simulating even with no player nearby. That is convenient, but every area costs CPU continuously, so **delete it when you are done**.
- **Entity pile-ups** have a signature symptom: total CPU usage looks low, yet the whole server is stuck. The thing to fix there is entity count and complex chunks, not another setting.
- **Subtraction first**: tearing down three farms you no longer use usually beats tuning the config file ten times over.

:::tip Subtract first, tune second
On Bedrock the first tool of "optimisation" is to **build less, run less, load less**. Settings can only help within a narrow range.
:::

For the diagnosis mindset around entities and dropped items, see [Lag from Entity and Dropped-Item Accumulation](/tutorials/faq/entity-lag). One warning: **the diagnostic tools in that article are Java-specific** (`spark`, TPS and MSPT metrics), and they do not work on Bedrock; but the **design principles - fewer entities, fewer dropped items, fewer always-loaded machines - transfer directly**.

### 3.1 Ticking Areas and "Offline Machines"

Ticking areas are one of Bedrock's few double-edged tools:

- **The upside**: with no players present, redstone, fluids, crops, and mobs in the designated chunks keep running, so machines can produce while the server is empty;
- **The cost**: those chunks occupy main-thread time **permanently**, whether or not anyone is online;
- **The advice**: create areas only where you genuinely need them and delete them when the job is done; a machine that can be changed to "run only while someone is here" should not be a ticking area.

When investigating, ask three questions: is this machine still needed? Must it run with nobody around? Is its output actually used? If any answer is "no", switch it off.

## 4. Chunks, World Size, and Pre-Generation

View distance and world size are two separate bills:

- **The view-distance bill**: the larger `view-distance` is, the more chunk data must be sent whenever a player joins, moves, or crosses a region, driving CPU and bandwidth up together. It is the biggest CPU and bandwidth lever, and also the visual setting players notice most directly.
- **The world-size bill**: every area a player explores is written to the save. The bigger and older the world, the larger the `worlds/` directory, and the slower **startup, saving, and backups** become, with more disk I/O pressure as well.

What you can do:

1. **Limit the play area**: use the "world border" idea to keep players inside the region that actually needs to be played, instead of letting the world expand without limit. Whether your version or core provides a ready-made border command, and how to use it, is a matter for the official documentation.
2. **Discourage aimless travel**: exploring generates new chunks, and new chunk generation is a common source of stutter.
3. **Keep the spawn area tidy**: the area around spawn is usually loaded most often, so the fewer builds, entities, and redstone circuits there, the better.
4. **Archive old regions**: retire worlds and regions you no longer use, and **back up first**.

On **pre-generation**, let us be honest: **the official BDS ships no pre-generation tool**, and its options are far fewer than Java Edition's.

| Method | Officially supported by BDS | Notes |
| --- | --- | --- |
| A built-in pre-generation command | No | The official server has no such command |
| Flying the map yourself as an admin | Yes (it is ordinary gameplay) | The most reliable, dependency-free option; the cost is time |
| Ticking areas | Yes | They solve "keep simulating with nobody around", which is **not** pre-generation, and they cost performance continuously |
| Java Edition tools (such as Chunky) | No | Those tools target Java Edition servers and mod platforms |
| Third-party pre-generation tools | Outside official scope | Confirm they support your BDS version, and **back up the world first** |

:::warn Do not trust "one-click Bedrock pre-generation"
Most Bedrock "pre-generation plugins or tools" you find online belong to third-party cores or community projects and are **outside what the official BDS supports**. Go by that tool's own official documentation, not by this article or by instructions written for another version.
:::

Bedrock's pre-generation options are limited, and what you can rely on is **flying the map ahead of time** and **keeping the world small**.

## 5. Memory Behaviour

Bedrock memory works nothing like Java:

- **There is no memory flag.** BDS has no `-Xmx`-style switch; it requests initial and maximum memory from the operating system itself, and you cannot set it in the launch arguments.
- **Usage creeps up over time.** After a long uptime it is clearly higher than right after startup; this is widely observed.
- **Do not force-clear memory.** "Memory cleaner" or forced-release tools that squeeze usage down will make **players' resource pack and add-on downloads stall mid-progress**, and can make the server unstable. **A restart is the fix**, which matches what [The BDS Server](/tutorials/bedrock/bds) says.

The correct answer is a **scheduled restart**:

| Practice | Notes |
| --- | --- |
| Restart on a schedule | Restart during off-peak hours to hand the accumulated memory back to the system |
| Restart interval | **There is no official recommendation**; it is a judgement call based on your player count, world size, add-on count, and memory growth curve. Daily and every-few-days are both common |
| Stop gracefully | Use `stop` on the console and start again, so saves and statistics are not corrupted |
| Announce it | **Tell players in game and in your community chat before restarting**, and leave a buffer so nobody is kicked mid-exploration or mid-fight |

:::tip How to choose the interval
Do not copy someone else's "restart three times a day". Record a few days first: how long until memory grows beyond what your machine can take, and when your player peak is. **More players and more add-ons mean a shorter interval; a small server with few add-ons can go longer.**
:::

## 6. Hardware and Hosting Choices

The first rule of Bedrock hardware is still **single-core performance first**:

| Priority | Item | Why |
| --- | --- | --- |
| 1 | Single-core clock speed and single-core performance | World simulation is single-threaded, so a weak single core decides directly whether the server stutters |
| 2 | SSD or NVMe | Chunk reads and writes, saves, and backups are all disk I/O; mechanical or network storage slows them noticeably |
| 3 | RAM capacity | Leave headroom; more players, larger worlds, and more add-ons all need more |
| 4 | Core count | Useful, but behind the three above |

Why a cheap VPS stutters "for no reason":

- Cheap plans commonly use **low-clock, many-core, oversold, shared** CPUs. BDS wants single-core speed, and a shared CPU gets crowded out by neighbours, producing periodic stalls and latency spikes;
- "Burstable" instances look idle most of the time, but slow down across the board once the CPU allowance is used up;
- Mechanical or network storage slows chunk reads and writes, which shows up most when players explore;
- With too little RAM the OS starts paging, which feels like the whole server hitching.

:::warn Containers and virtualisation steal CPU too
If you run BDS in a container or virtual machine, **CPU limits (limit / quota) can starve it**: when the single busy core gets throttled, the symptom is a periodic hitch. Give it a generous CPU share, and avoid putting it on the same machine as other heavy services. For deployment details, see [Deploying a Bedrock Edition Server with Docker](/tutorials/bedrock/docker).
:::

### 6.1 Hosting Quick Reference

| Your situation | Suggestion |
| --- | --- |
| Few players, limited budget | A machine with a strong single core is usually steadier than an oversold multi-core VPS |
| Long uptime needed, stable player base | Choose a plan that states its CPU clock speed and does not oversell, and test small before scaling up |
| Container deployment | Give it enough CPU share, avoid sharing the host with heavy services, and mind ports and volumes - see [Deploying a Bedrock Edition Server with Docker](/tutorials/bedrock/docker) |
| You want a plugin ecosystem | That is not the BDS path; see section 7 |

## 7. Third-Party Cores Behave Differently

If what you want is plugins and multi-core scaling, that is not the BDS path:

| Core | Language | Performance character |
| --- | --- | --- |
| Nukkit family (including PowerNukkitX) | Java | Built around multi-core and optimisation, with a plugin system and many tunables |
| PocketMine-MP | PHP | The largest plugin ecosystem, but clear bottlenecks under heavy load, with the overhead of an interpreted language |

Their performance models, settings, and available tools all differ from BDS, so **tuning advice does not transfer between them**. For example, `spark` supports Nukkit but **not BDS**; copying a PMMP or Nukkit tuning guide onto BDS usually just wastes time.

:::warn Decide which path you are on
Choosing BDS means "official, stable, few knobs"; choosing a third-party core means "more plugins, more knobs, but not an official implementation". For the trade-offs and setup, see [Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) and [Getting Started with Bedrock Third-Party Cores](/tutorials/bedrock/third-party-setup).
:::

## 8. How to Measure

Let us be plain about it: **there is no `spark` for Bedrock**. `spark` supports a set of Java Edition platforms and some community platforms, and **Bedrock Dedicated Server is not among them**. So do not expect flame graphs on BDS, and do not copy the Java routine of "watch TPS and MSPT".

What you can use:

| Method | How |
| --- | --- |
| Host-level monitoring | Watch CPU (especially **single-core usage**), memory, disk I/O, and bandwidth. See [Monitoring and Alerting](/tutorials/ops/monitoring) |
| BDS console output | Startup and shutdown messages, errors, and add-on or script warnings |
| Player reports | "When does it lag, how many players were online, which area were you in" is often more direct than any metric |
| Before/after comparison | Change one thing, then record CPU usage and player experience before and after |

:::note Change one thing at a time
With no flame graphs, the only reliable method is **controlling variables**: change one setting, observe over a comparable period, write it down, then change the next one. Change five at once and you will never know which one helped - or hurt.
:::

A measurement discipline to follow:

1. **Change one variable at a time** and leave everything else alone;
2. **Measure over a comparable period**: same time of day, similar player count, similar activity (everyone exploring, or everyone idle);
3. **Keep a log**: what you changed, when, and the metrics plus player experience before and after;
4. **Observe long enough**: phenomena such as chunk generation and memory growth need time to show up, so drawing conclusions immediately after a change is easy to get wrong.

A simple host-level recording example (Linux, illustrative only):

```bash
# Sample overall and per-core load every 5 seconds, so you can spot "low total usage but one saturated core"
top -b -d 5 -n 60 > cpu-sample.log
```

On Windows, Task Manager or Performance Monitor shows the same thing; **the single-core curve is what matters, not total usage**.

## 9. Tuning Order

Work in this order for the best return; doing it backwards wastes money:

1. **World design**: subtract first - fewer loaded chunks, fewer always-loaded machines, shut down unneeded farms, restrain redstone clocks, control entities and dropped items. The biggest win, and it costs nothing.
2. **View and tick distance**: adjust `view-distance`, `tick-distance`, `player-idle-timeout`, and the compression keys. Nearly free and immediately visible.
3. **Hardware**: single-core performance first, then memory, SSD, and core count. It costs money but it works.
4. **Restart schedule**: pick an interval that suits you and announce it in advance. It treats the symptom, but it deals with long-term memory accumulation.
5. **Different core**: only after the first four are done, and only if you genuinely need plugins or multi-core, consider the Nukkit family or PMMP.

### 9.1 Closing Checklist

| # | Check | Done when |
| --- | --- | --- |
| 1 | Confirm which keys your version has | You have opened your local `server.properties` and checked every key name and default |
| 2 | World design | Unused farms and machines are off, ticking areas are cleaned up, high-frequency redstone is restrained |
| 3 | View and tick distance | `view-distance` and `tick-distance` suit your players' devices and bandwidth, and no machine is broken |
| 4 | Idle and compression | `player-idle-timeout` is set, and the compression keys are tuned toward your actual bottleneck |
| 5 | Hardware | Single-core performance and disk I/O bottlenecks are addressed, and containers have enough CPU share |
| 6 | Restart schedule | There is an interval, an announcement, and a graceful `stop` |
| 7 | Measurement log | Every change has before/after records, and only one thing changed at a time |
| 8 | Anti-cheat | Movement validation was not loosened to save performance, or the risk is explicitly accepted |

Bedrock tuning comes down to three sentences: **single-core clock speed sets the ceiling, world design sets the floor, and a restart schedule keeps it stable over time.**

Related reading:

- The server itself: [The BDS Server](/tutorials/bedrock/bds)
- Container deployment: [Deploying a Bedrock Edition Server with Docker](/tutorials/bedrock/docker)
- Third-party cores: [Third-Party Cores (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party), [Getting Started with Bedrock Third-Party Cores](/tutorials/bedrock/third-party-setup)
- Observing and diagnosing: [Monitoring and Alerting](/tutorials/ops/monitoring)
- Entities and dropped items (Java tools, transferable principles): [Lag from Entity and Dropped-Item Accumulation](/tutorials/faq/entity-lag)

> Which keys server.properties offers, and their defaults, vary by BDS version; rely on the file your own server generates and the official documentation.
