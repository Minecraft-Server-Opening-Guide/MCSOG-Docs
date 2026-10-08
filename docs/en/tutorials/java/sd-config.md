---
title: "[Technical] Tuning the Configuration"
slug: sd-config
cat: java
level: 3
order: 34
minutes: 16
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, carpet, configuration, optimisation, version]
updated: 2026-10-08
draft: false
---

Optimisation on a technical server is not the same as optimisation on a casual one. A casual server can raise TPS by lowering the view distance, switching cores or adding performance plugins; a technical server has to ask one extra question about every switch it touches: **does this change vanilla behaviour?** This article answers **which switches actually exist on a technical server, and who is responsible for re-verifying the machines afterwards**.

General performance work (priority order, view and simulation distance, JVM flags) is covered in [Performance Optimisation](/tutorials/java/optimize), mod selection in [Performance Mods](/tutorials/java/sd-optimize), and the full rule list in [Carpet and Its Add-ons](/tutorials/java/sd-carpet). This article stays on configuration trade-offs, and it deliberately **names no configuration fields and no default values** — those change between versions and must come from each project's own documentation.

## 1. The Three Layers of Switches

| Layer | Typical examples | What changing it does |
| --- | --- | --- |
| Carpet rules | `optimizedTNT`, `lagFreeSpawning`, `movableBlockEntities` | Some only save performance, some **change vanilla behaviour outright** |
| Optimisation mod configuration | `ferrite-core`, `modernfix`, `c2me-fabric`, `async` | Each covers one area; a bad change causes lag, bugs, or a shift in timing |
| The server's own configuration | View distance, simulation distance and friends | General optimisation, covered in [Performance Optimisation](/tutorials/java/optimize) |

The first layer is where people get caught out: **Carpet rule names all sound like "optimisations", but they are not the same kind of thing.** So start by splitting them apart.

## 2. Carpet Rules: Separate Pure Optimisation from Behaviour Changes

Carpet is a Fabric server mod that provides a rule system; `/carpet <rule> <value>` toggles individual vanilla details on and off. The rule set is large, but a technical server usually cares about these:

| Rule | Nature |
| --- | --- |
| `optimizedTNT` | Pure optimisation |
| `lagFreeSpawning` | Pure optimisation |
| `fastRedstoneDust` | Pure optimisation, but it touches redstone, so re-verify machines |
| `maxEntityCollisions` | A limit to tune; it changes how entities behave when packed together |
| `movableBlockEntities` | **Changes vanilla behaviour**: it grants an ability vanilla does not have |
| `commandTick` | A debugging entry point, not an optimisation |
| `tntDoNotUpdate` | **Changes vanilla behaviour**, testing only |
| `explosionNoBlockDamage` | **Changes vanilla behaviour**, testing only |

Handle them in tiers:

| Tier | Rules | How to use them |
| --- | --- | --- |
| Safe to keep on | `optimizedTNT`, `lagFreeSpawning` | Enable on a test server first; check that machines and spawning still behave, then apply to the main server |
| Enable, then re-verify | `fastRedstoneDust`, `maxEntityCollisions` | Record the change, tell the technical players, and have the machines re-verified |
| Changes vanilla behaviour, enable as needed | `movableBlockEntities` | It grants an ability vanilla does not have; before enabling it, confirm that no machine relies on pistons being unable to push block entities |
| Test server only | `tntDoNotUpdate`, `explosionNoBlockDamage` | **Do not enable these on a live server**; their purpose is testing and experimentation |
| Tooling | `commandTick` | A debugging entry point, not something to leave on as an "optimisation" |

:::warn Announce every rule change
Players cannot tell whether a broken machine is their own fault or the result of a rule change. **Keep a record and announce it**: what changed, when, and which class of machines it affects. That discipline matters more than which rule you pick.
:::

## 3. Optimisation Mod Configuration: One Area Each, One Change at a Time

Most options in performance mods belong to different subsystems, so first know which area each mod owns, then decide what to touch:

| Mod | Area |
| --- | --- |
| `ferrite-core` | Memory usage |
| `modernfix` | All-in-one: performance, memory, and many bug fixes |
| `c2me-fabric` | Chunk performance |
| `async` | Entity multi-threading |
| `spark` | A measurement tool (profiler), not an optimisation mod |

**This article deliberately names no configuration fields and no defaults.** These options change between versions, a field name copied from an old guide may no longer exist, and copying an old default can change behaviour outright. Look any option up in that mod's own documentation.

The discipline for changing configuration has four rules, and none of them is optional:

1. **Back up the configuration files first** (principles and method in [Backup and Recovery](/tutorials/java/backup)) — if a change goes wrong you can at least return to the previous file.
2. **Change one thing at a time** and then watch the server for a while. Change five options at once and you cannot tell which one caused the problem.
3. **Compare before and after with `spark`**, so the decision rests on data rather than a feeling that things are smoother.
4. **Verify on a test server or test world first**, especially for chunk and multi-threading options such as `c2me-fabric` and `async`.

:::tip Multi-threading changes timing
`c2me-fabric` and `async` speed up chunk and entity processing, and multi-threading inherently changes execution order and timing — while machines are exactly what depends on timing. Touch them only when you know precisely what you want and are willing to pay the re-verification cost.
:::

## 4. Version Drift: Your Checklist Has an Expiry Date

No single "universal optimisation config" survives a version change. Two examples worth remembering:

| Mod | What changed | Conclusion |
| --- | --- | --- |
| `memoryleakfix` | Its official README states that after Minecraft `1.20.5+` every memory leak it used to fix was fixed upstream, so the mod is **obsolete** on newer versions | Do not install it on new versions "for performance" |
| `starlight` | Supported versions stop at `1.20.4` (Fabric); its official README states that Starlight and Vanilla are close enough on `1.20`, and that it is an **intrusive** light engine rewrite, more likely to conflict with other mods | It should no longer appear in a new version's checklist |

So every time you upgrade the game version, a mod or the core, re-check the whole list: **does each entry still exist, and does it still make sense on the current version?** An obsolete entry usually does not throw errors; it just sits there quietly and adds compatibility risk.

## 5. A Change Priority List

Work through it in order for the best return; in the wrong order you can break machines and never find out why.

```text
1. Measure a baseline first: sample with spark and record normal TPS / MSPT
2. Then the "pure optimisation" items: optimizedTNT, lagFreeSpawning, and memory-related mod configuration
3. Then limits and ranges: maxEntityCollisions and friends, with machines re-verified afterwards
4. Only then the timing-sensitive items: c2me-fabric and async, and anything else chunk- or thread-related
5. Rules that change vanilla behaviour (tntDoNotUpdate, explosionNoBlockDamage) stay on the test server
```

The habits that go with it are: **back up before the change, one item at a time, keep a record, announce to players.** Configuration management on a technical server is really **version management**: what you change is not a number, it is the precondition every machine runs on.

## 6. Four Common Mistakes

| Common practice | The problem |
| --- | --- |
| Enabling every optimisation you can find at once | When something breaks you cannot tell which change did it, so you switch them all off and start over |
| Copying someone else's optimisation config | Versions, mod combinations and machines differ; what works for them may not work for you |
| Treating "it feels faster" as a conclusion | Without a baseline there is nothing to compare against; sample with `spark` before deciding |
| Changing rules without recording or announcing them | Nobody knows why a machine broke, so the technical players treat it as a bug hunt |

There is one test for keeping a change: **the data says it is better**, not that everyone else runs it.

## Next Step

The full rule list and the add-on packs (including crash and update-suppression rules) are in [Carpet and Its Add-ons](/tutorials/java/sd-carpet); mod selection and the "obsolete" verdicts are in [Performance Mods](/tutorials/java/sd-optimize); the general order from hardware to view distance to JVM flags is in [Performance Optimisation](/tutorials/java/optimize).

---

> Rule names and mod version ranges in this article come from Carpet's official source, official Modrinth data and the official READMEs of the mods; for configuration, follow each mod's documentation for the version you run.
