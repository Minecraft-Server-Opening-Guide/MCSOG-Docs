---
title: Performance Optimisation
slug: optimize
cat: java
level: 3
order: 17
minutes: 15
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, advanced, optimisation, tps, spark, view-distance, jvm, pre-generation]
updated: 2026-10-04
draft: false
---

"The server is lagging" is the most common complaint, but **optimisation has a priority order**. Working through it in the order below gives the best return; in the wrong order you can spend enormous effort for almost nothing.

## 1. The Priority Order

```
1. Hardware (single-core performance)        ← biggest gain, biggest cost
2. Server configuration (view/simulation distance)  ← almost free, immediate effect
3. Core choice (Paper family vs vanilla)
4. Plugin/mod quality (bad plugins are the worst offender)
5. JVM flags
```

**The conclusion up front**: if your machine's single-core performance is weak, **neither new hardware nor tweaked settings will save you**, because there is only one main thread.

## 2. Configuration Tuning (Best Value)

### View Distance and Simulation Distance

| Option | Effect |
| --- | --- |
| `view-distance` | How far players can see. Lowering it saves CPU and bandwidth, at the cost of fog in the distance |
| `simulation-distance` | How far away chunks are still **actually ticking** (mob spawning, redstone, crops). **Lowering this saves far more than lowering view distance and does not hurt what players see** |

For most small servers, dropping `simulation-distance` from 10 to around 6 noticeably relieves lag.

### Entity Control at the Spigot Layer

`spigot.yml` holds several key entity-related settings (names differ slightly between versions):

- **Entity activation range**: how far away a mob still gets ticked; lowering it saves a lot of CPU.
- **Mob spawn range**: how far away mobs spawn.
- **Entity/item merge radius**: raising it reduces entity counts (dropped items, XP orbs), **but it changes vanilla behaviour** (use with care on technical servers).
- **Maximum entities ticked per tick**: caps entity processing so a flood of entities cannot bring the server down.

### World Configuration at the Paper Layer

In `config/paper-world-defaults.yml` you can tune the entity collision cap, the number of chunks autosaved, the chunk unload delay and more.

:::warn Optimisation and "vanilla behaviour" trade off against each other
Many of the switches above **have already-optimised defaults**, and the more aggressively you tune them, the further you drift from vanilla. **On a technical server, do the opposite — set the options that affect vanilla behaviour back to vanilla** (see "Technical Minecraft and Redstone").
:::

## 3. Find Where the Lag Is Before You Touch Anything

**Do not optimise by feel.** Measure first:

| Tool | Purpose |
| --- | --- |
| **spark** | Today's mainstream profiling plugin/command; it produces flame graphs that point straight at the plugin/entity/chunk eating CPU |
| `/tps`-style commands | Shows the current TPS (below 20 means ticks are being dropped) |
| **timings** (older Paper) | Performance reports on older versions |

Run a spark sampling session for a while, **look at the widest bar in the flame graph**, and fix that specifically. Common culprits:

- a poorly written plugin doing heavy work in a loop;
- large piles of entities (a mob farm with no proper collection, dropped items nobody clears);
- too many hoppers/redstone devices (hoppers are the classic performance killer);
- players exploring and generating large numbers of new chunks (see below).

## 4. World Pre-Generation

**Generating new chunks while players explore** is a major source of lag: new chunk generation is CPU-intensive and makes TPS drop instantly.

The fix is **pre-generation**: use a plugin such as `Chunky` to generate a set area of the map in advance. When players later reach that area, the chunks are merely loaded, with no generation triggered.

For a **long-running survival server**, pre-generation is close to mandatory.

## 5. JVM Flags

- **Memory**: give `-Xmx` enough but not too much (an oversized heap actually makes GC pauses longer). On a dedicated machine you can set `-Xms` equal to `-Xmx` to reduce heap resizing.
- **GC flags**: the community has mature recommended combinations (such as **Aikar's Flags**), and Paper's official documentation provides a dedicated startup flag generator and explanation. **Do not blindly copy contradictory "magic flags" from the internet**.
- Flags only help at the **memory/GC level** and **cannot fix a single-core bottleneck**.

## 6. Other Practical Measures

- **Clear entities regularly**: give dropped items and XP orbs a sensible lifetime; plugins can handle scheduled cleanups.
- **Limit TNT / fast redstone clocks**: on a public server, limiting explosions and high-frequency redstone significantly reduces malicious lag.
- **Limit exploration**: use a world border to constrain the active area and avoid endless generation.
- **Restart regularly**: this is not "optimisation", but it clears some plugin memory leaks, so it works as a **temporary mitigation** (treating the symptom, not the cause).
- **Upgrade the hardware**: if spark shows the main thread saturating a CPU core and your configuration is already tuned, then it is **time for a machine with stronger single-core performance**.

## 7. The Bottom Line on Optimisation

```
Optimisation must not come at the cost of "vanilla behaviour" — unless you clearly do not need vanilla behaviour
```

On a technical server: **better to lag a little than to break the machines**.
On an ordinary survival server: **you can be reasonably aggressive**, putting the online experience first.

## Conclusion

With this, the full path of running a Java Edition server is complete:

```
Protocol and configuration → Operating system → Environment setup → Choosing a core → Starting the server
   → Server structure → Configuring the server → Deployment → Common commands
   → MCDR → Plugins → Technical Minecraft
   → Operations and management → Proxies → Mobile players → Backups → Anti-cheat → Performance optimisation
```

To revisit any link in the chain, go back to the matching chapter from the table of contents on the left. For a point-by-point comparison of cores, see [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
