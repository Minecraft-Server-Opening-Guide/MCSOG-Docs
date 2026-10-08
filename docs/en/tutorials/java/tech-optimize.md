---
title: "[Technical] Performance Mods"
slug: tech-optimize
cat: java
level: 3
order: 32
minutes: 18
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, optimisation, mods, fabric, spark]
updated: 2026-10-08
draft: false
---

Whether a technical server should install performance mods is a question people answer from one extreme or the other: some install none and accept the lag, others drop everything they can find into `mods` and watch their machines start failing for no visible reason. Neither is right — **the question is not whether to install them, but what each kind costs you**.

This article sorts ten common performance-related mods into three groups: safe to install, version-dependent, and timing-changing (install with care). There is one criterion: **could it change how a machine behaves?**

For the configuration side of optimisation, see [Performance Optimisation](/tutorials/java/optimize): that article covers the overall priority order, while this one stays at the mod layer.

## 1. All Ten Mods at a Glance

Loaders, supported versions and downloads below come from the official Modrinth project entries; the one-line description is the project description or a direct translation of it.

| Mod | Loaders | Supported versions | Downloads (approx.) | Official one-liner |
| --- | --- | --- | --- | --- |
| `lithium` | fabric, neoforge, quilt | 1.16.2–26.3 | 133.7 million | General server/client performance optimisation |
| `ferrite-core` | fabric, forge, neoforge, quilt | 1.16.5–26.3 | 157.4 million | Memory usage optimizations |
| `krypton` | fabric | 1.16.2–26.3 | 43.04 million | A mod to optimize the Minecraft networking stack |
| `c2me-fabric` | fabric | 1.17.1–26.4-snapshot-3 | 39.18 million | A Fabric mod designed to improve the chunk performance of Minecraft. |
| `modernfix` | fabric, forge, neoforge | 1.16.4–26.1.2 | 80.23 million | All-in-one mod that improves performance, reduces memory usage, and fixes many bugs |
| `memoryleakfix` | fabric, forge, quilt | 1.14.4–1.20.4 | 38.02 million | Fixes memory leaks |
| `starlight` | fabric | 1.17–1.20.4 | 16.06 million | A rewrite of the lighting engine (Fabric) |
| `async` | fabric, neoforge, quilt | (no fixed range on the official entry) | 717 thousand | improves entity performance by processing entities in parallel across multiple CPU cores and threads |
| `spark` | fabric, forge, neoforge, quilt | 1.16.5–26.3 | 23.17 million | A performance profiling tool (profiler) |
| `chunky` | bukkit, fabric, folia, forge | 1.13.2–26.3 | 18.88 million | Chunk pre-generation |

Two things to keep in mind when reading that table:

- **A high download count does not mean "you must install it".** It means many people use it, not that it suits your hardware or your machines.
- **`async` has no fixed version range on its official entry**, so the table does not invent one. Go by the game versions the project page currently lists.

## 2. Safe to Install: Memory, Startup, Analysis and Pre-generation

This group is behaviour-independent: it optimises memory usage, the startup path, your ability to observe the server, and chunk generation — not the game's logic or its ordering. On a technical server it is the cheapest group by far.

| Mod | Official one-liner | Why it is safe |
| --- | --- | --- |
| `ferrite-core` | Memory usage optimizations | It works at the memory-usage layer and does not intervene in tick logic |
| `modernfix` | All-in-one mod that improves performance, reduces memory usage, and fixes many bugs | It covers performance, memory and bug fixes rather than rewriting one mechanism |
| `spark` | A performance profiling tool (profiler) | It only observes; it does not modify game behaviour |
| `chunky` | Chunk pre-generation | Chunks are generated ahead of time instead of while players explore |

A few notes:

- **`spark` is not a performance mod.** It is an analysis tool. "Measure before you change" means installing `spark` to **see where the bottleneck is**, not expecting it to make the server faster on its own. How to read its output is covered in [Profiling a Server with spark](/tutorials/ops/spark).
- **`chunky` addresses lag during world generation**, which is the same subject as the pre-generation section of [Performance Optimisation](/tutorials/java/optimize), just delivered as a mod. For a long-running server it is close to mandatory.
- **These four do not conflict**: memory, startup, analysis and pre-generation each cover a different area and can be used together. What you do have to watch for is two mods doing the same job — two separate rewrites of the lighting engine, for example.

## 3. Version-Dependent: Two Official Verdicts

These two mods are not "bad"; their useful range simply has a clearly documented edge, and both projects state that edge themselves.

### `memoryleakfix`: obsolete on 1.20.5 and later

The official README concludes that **as of Minecraft 1.20.5 and later, every memory leak the mod used to fix has been fixed by the game itself**, so the mod is obsolete on newer versions.

The version data agrees: it supports 1.14.4–1.20.4, and newer game versions fall outside that range. **Installing it on a current version achieves nothing**; only on 1.20.4 and older is there anything left for it to fix.

### `starlight`: stops at 1.20.4, and the project states the trade-offs

The official README makes four points, each more specific than the last:

| Official verdict | What it means for a technical server |
| --- | --- |
| Supported up to 1.20.4 (1.17–1.20.4) | On newer versions there is no build to install at all |
| On 1.20, Starlight and vanilla are close enough (original wording: Starlight and Vanilla are close enough on 1.20) | Once you are on 1.20, the gain is already small |
| It is completely incompatible with Phosphor | The two cannot coexist |
| It is an **invasive** lighting engine rewrite and therefore more likely to conflict with other mods | Technical servers usually run a fair number of mods, so conflict risk is part of the cost |
| Progress beyond 1.20 points to Moonrise | Its role has been handed on |

So the correct use of `starlight` is: **only consider it if you are deliberately staying on 1.20.4 or older and are not running Phosphor.** On a current-version machine server there is no decision left to make here.

## 4. Timing-Changing: Four Mods to Treat with Care

This is the group a technical server should actually stop and think about. What they have in common is that they **change when events happen or in what order**, and a machine's correctness often rests on exactly that order.

| Mod | Official one-liner | Where the risk is |
| --- | --- | --- |
| `lithium` | General server/client performance optimisation | Wide coverage: it touches logic paths such as mob spawning, AI and block behaviour. "General optimisation" is not the same as "harmless for you" |
| `krypton` | A mod to optimize the Minecraft networking stack | It rewrites the networking stack. The official README states plainly that **the author gives no guarantee about its stability or its compatibility with other mods** |
| `c2me-fabric` | A Fabric mod designed to improve the chunk performance of Minecraft. | Chunk processing becomes multi-threaded, so the timing is no longer single-threaded timing |
| `async` | improves entity performance by processing entities in parallel across multiple CPU cores and threads | Entity processing is parallelised across CPU cores and threads, so the order in which entities are handled changes |

One by one:

- **`lithium`** is the most frequently recommended mod in this group and therefore the easiest to trust too far. It is described as a general optimisation, but "tries not to change behaviour" and "never changes behaviour" are two different claims. **Test it on your machines before you commit** — especially devices that are sensitive to spawning, AI or block updates.
- **`krypton`** takes the clearest position of the four: its official README states outright that no guarantee is given about stability or compatibility with other mods. That does not make it unusable; it means that if something breaks, the author is not going to be your safety net. On a public server that is a real trade-off.
- **`c2me-fabric`** is described as improving chunk performance, which means parallelising chunk work. Threading changes when chunks load, generate and unload, and **chunk-loaded areas and the parts of a machine that span chunk borders are exactly what breaks first**.
- **`async`** improves entity performance by processing entities in parallel across multiple CPU cores and threads. Parallel entity handling means ticks no longer begin strictly in sequence, and machines that depend on entity order or on collision timing are the most fragile kind there is.

The summary of this section: **the gains from these four are real, and so is the risk of a machine quietly breaking — which is why the only safe method is to test on your machines first.**

## 5. Three Rules for Performance Mods on a Technical Server

Distilled into three rules you can act on:

```
1. Behaviour-independent first  — memory, startup, analysis, pre-generation
2. Test timing-changing mods    — add one at a time and verify on real machines
3. Compare with spark           — measure before and after; trust data, not feelings
```

A little more detail:

1. **Behaviour-independent first.** Install the group from section 2 first; it barely affects machine behaviour and gives the most direct gain. On many servers that alone relieves most of the problem.
2. **Test timing-changing mods.** Do not install all four from section 4 at once. **Add one at a time** and immediately run a representative machine afterwards: does the mob farm still produce, does the device still behave as designed? If something breaks, roll back that one mod rather than tearing everything down.
3. **Add one at a time and compare with `spark`.** `spark` is an analysis tool, and its value is telling you whether things actually got faster after a change. **An optimisation mod with no data behind it is a placebo.**

Two operational habits that have nothing to do with the mods themselves but matter just as much:

- **Back up the world** before installing, removing or swapping mods; see [Backups and Recovery](/tutorials/java/backup).
- When something breaks, **remove the most recently added mod first** — it is the fastest way to narrow things down.

## 6. Where This Connects

- **Configuration-level optimisation** (view distance, simulation distance, JVM, pre-generation): [Performance Optimisation](/tutorials/java/optimize)
- **How to use the profiling tool**: [Profiling a Server with spark](/tutorials/ops/spark)
- **Modded servers, loaders and troubleshooting**: [Getting Started with Modded Servers](/tutorials/java/modded)
- **Why a Fabric server comes first for technical play**, and the trade-offs of multi-threaded cores: [Choosing a Server Core](/tutorials/java/tech-server)
- **Why vanilla behaviour matters so much**: [Technical Minecraft and Redstone](/tutorials/java/redstone) and [Advanced Technical Minecraft](/tutorials/java/redstone-advanced)

## Next Step

Optimisation needs data behind it, so start by turning conclusions into numbers with `spark`: see [Profiling a Server with `spark`](/tutorials/ops/spark). For the wider picture see [Performance Optimisation](/tutorials/java/optimize); for the server itself see [Choosing a Server Core](/tutorials/java/tech-server) and [Carpet and Its Add-ons](/tutorials/java/tech-carpet).

---

> The mod list, loaders, supported versions and download counts in this article come from the official Modrinth project entries; the findings about `memoryleakfix`, `starlight` and `krypton` quote their respective official READMEs. Confirm on the project page before installing — versions and descriptions change as projects are updated.
