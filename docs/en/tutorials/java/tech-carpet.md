---
title: "[Technical] Carpet and Its Add-ons"
slug: tech-carpet
cat: java
level: 3
order: 30
minutes: 25
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, carpet, fabric, server]
updated: 2026-10-08
draft: false
---

Once the Fabric server is chosen, the mod a technical server deals with every day is **Carpet**. On its own it does one thing: it turns a pile of hard-coded vanilla details into **rules you can switch with a command**. This article covers how the rule system works, what the four mainstream add-ons contribute, and the **verified crash-prevention rules** — the last of these is what makes world eaters and update suppression safe to run. If you have not settled the core yet, start with [Choosing a Server Core](/tutorials/java/tech-server).

## 1. What Carpet Is

`Carpet` is a **Fabric server-side mod** that provides a **rule system**: `/carpet <rule> <value>` switches behaviour that is otherwise hard-coded in vanilla.

The basic facts:

- supported versions run from `1.14.4` to `26.3`, 179 version entries in total, with roughly 11.25 million downloads;
- the official `CarpetSettings.java` source contains **91 rules annotated with `@Rule`**.

In other words, it can change a great deal, and **"available" does not mean "should be on"**: the basic discipline on a technical server is to enable only the rules whose consequences you understand.

## 2. Using `/carpet`

The rule system is interacted with very directly:

```
/carpet <rule> <value>        # change one rule
```

Three habits are worth keeping:

1. **change one rule at a time**, then watch machine behaviour before touching the next;
2. **write down every rule you change** (in the server rules or an operations note), and re-check them item by item when you change cores or upgrade versions;
3. for any rule that **changes vanilla behaviour**, leave it off on a live server and enable it only in single-player testing or a specific scenario.

The rule names and English descriptions below are quoted from Carpet's official source, each with a Chinese explanation.

## 3. Example Rules

### Performance and entities

| Rule | Official description (verbatim) | Explanation |
| --- | --- | --- |
| `optimizedTNT` | TNT causes less lag when exploding in the same spot and in liquids | TNT exploding in the same spot and in liquids causes less lag |
| `maxEntityCollisions` | Customizable maximal entity collision limits, 0 for no limits | Customisable cap on entity collisions; 0 means no limit |
| `lagFreeSpawning` | Spawning requires much less CPU and Memory | Mob spawning uses far less CPU and memory |
| `fastRedstoneDust` | Lag optimizations for redstone dust | Lag optimisations aimed at redstone dust |
| `movableBlockEntities` | Pistons can push block entities, like hoppers, chests etc. | Pistons can push block entities such as hoppers and chests |

### Behaviour changes (leave these off on a live server by default)

| Rule | Official description (verbatim) | Explanation |
| --- | --- | --- |
| `tntDoNotUpdate` | TNT doesn't update when placed against a power source | TNT placed against a power source is not updated |
| `explosionNoBlockDamage` | Explosions won't destroy blocks | Explosions do not destroy blocks |
| `antiCheatDisabled` | Prevents players from rubberbanding when moving too fast | Stops players being rubberbanded for moving too fast |
| `updateSuppressionBlock` | Placing an activator rail on top of a barrier block will fill the neighbor updater stack when the rail turns o… | Placing an activator rail on top of a barrier block fills the neighbour update stack when the rail turns |
| `stackableShulkerBoxes` | Empty shulker boxes can stack when thrown on the ground. | Empty shulker boxes stack when thrown on the ground |

`updateSuppressionBlock` is the official, controllable entry point for update suppression (known in the community as "cutting doors"); the crash-prevention rules that go with it are in section 6.

### Counting and debugging

| Rule | Official description (verbatim) | Explanation |
| --- | --- | --- |
| `hopperCounters` | hoppers pointing to wool will count items passing through them | Hoppers pointing at wool count the items passing through them |
| `commandTick` | Enables `/tick` command to control game clocks | Enables the `/tick` command to control the game clocks |

### Named rules with no quotable description

The following rules do exist, but their official descriptions are not quoted here; check your own version's source or the in-game `/carpet` output for their exact behaviour:

`creativeNoClip`, `renewableSponges`, `persistentParrots`, `flippinCactus`, `xpNoCooldown`, `smoothClientAnimations`, `tntPrimerMomentumRemoved`, `commandPlayer`.

## 4. The Four Mainstream Add-ons

Carpet itself only carries the main rule set; extra features come from add-ons. The repositories, supported versions and version counts below are official Modrinth data.

| Name | Repository | Supported versions | Version entries | Purpose |
| --- | --- | --- | --- | --- |
| Carpet Extra | `gnembon/carpet-extra` | 1.14.4–26.2 | 87 | Official description: Extra Features for Carpet Mod; new dispenser behaviour, new renewable sources and more |
| Carpet TIS Addition | `TISUnion/Carpet-TIS-Addition` | 1.14.4–26.3 | 141 | A Fabric Carpet extension pack |
| Carpet AMS Addition | `Minecraft-AMS/Carpet-AMS-Addition` | 1.16.4–26.3 | 49 | Website `https://carpet.mcams.club` |
| Carpet Org Addition | `fcsailboat/Carpet-Org-Addition` | 1.19.4–26.3 | 34 | A Carpet extension pack |

How to choose:

- **Carpet Extra** and **TIS Addition** cover the oldest version ranges and are common in older modpacks;
- **AMS Addition** and **Org Addition** start at newer versions (1.16.4 and 1.19.4) but both track up to 26.3;
- install the pack that contains **the rules you actually need** — there is no reason to install all four.

:::warn Add-ons only work when they match Carpet's main version
This is a common-sense reminder: add-ons depend on Carpet's own interfaces, so **with a different game version or a different Carpet main version, an add-on may fail to load entirely or lose some of its rules**. Before installing, check that the add-on's version range covers your server version; after installing, run `/carpet` in game to confirm the rules actually appeared, and upgrade add-ons alongside Carpet. When in doubt, follow each add-on's own release notes.
:::

## 5. The Verified Crash-Prevention Rules

World eaters and update suppression deliberately create **extreme block updates and stack overflows**, and the immediate consequence for the server is a crash. The rules below are the ones verified here that specifically catch that risk.

### Carpet TIS Addition

| Rule | What it addresses |
| --- | --- |
| `yeetUpdateSuppressionCrash` | Handles crashes caused by update suppression |
| `updateSuppressionSimulator` | Update suppression simulation |
| `deobfuscateCrashReportStackTrace` | De-obfuscates the crash report stack trace so the log is readable |

### Carpet AMS Addition

| Rule | Accepted values |
| --- | --- |
| `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |

`customBlockUpdateSuppressor` turns the chosen block into an **update suppressor** — in other words, you pick which block plays the "fill the neighbour update stack" role instead of being limited to the built-in `updateSuppressionBlock`.

One more note: no suppression or crash-related rules could be verified for Carpet Org Addition, so its rule names are not listed here.

## 6. How This Works with World Eaters and Door Cutting

- **"Cutting doors" is the community's nickname for update suppression** as a family of operations; it is not a formal in-game term;
- the controllable entry point Carpet offers is `updateSuppressionBlock`; AMS's `customBlockUpdateSuppressor` lets you swap in a different block;
- the crash risk is caught by TIS's `yeetUpdateSuppressionCrash`, `updateSuppressionSimulator` and `deobfuscateCrashReportStackTrace`, plus AMS's `amsUpdateSuppressionCrashFix`;
- the three layers relate as "**a controllable entry point, swappable parameters, and a crash net**" — remove any one and debugging becomes much harder.

For how the machines are actually run and how the risk is contained, see article 7, [World Eaters and Update Suppression](/tutorials/java/tech-machine). Its conclusion is that the more aggressive the machine, the more you need the trio of "backups, permissions and crash-prevention rules" — and **the crash-prevention part is exactly this section**.

## 7. Three Bottom Lines

```
1. Only enable rules whose consequences you understand — record every change
2. Match add-ons to the main version — confirm with /carpet that the rules are really there
3. Turn the crash-prevention rules on first — catch the crash before the world eater runs
```

## Next Steps

- Before the machines move earth, read the risk control: [World Eaters and Update Suppression](/tutorials/java/tech-machine)
- Let everyone share schematics and placements: [Sharing Schematics](/tutorials/java/tech-schematic)
- Rules settled, now review the performance budget: [Performance Mods](/tutorials/java/tech-optimize)
- Why the core has to be Fabric: [Choosing a Server Core](/tutorials/java/tech-server)
