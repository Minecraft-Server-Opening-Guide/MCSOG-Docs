---
title: "[Technical] World Eaters and Update Suppression"
slug: tech-machine
cat: java
level: 3
order: 35
minutes: 22
mc: ["1.21.x", "1.20.4", "1.19.4", "1.16.5"]
tags: [java, technical, world-eater, update-suppression, carpet, tnt]
updated: 2026-10-08
draft: false
---

A world eater is a machine built from a TNT array plus a flying machine, used to clear a large area in one pass; "update suppression" is the class of tricks that Chinese-speaking technical players call "qiemen" (切门, literally "cutting doors"). These two things are the fastest way to take a technical server down.

**This article covers risk control only, not construction.** How to build one is outside the verified scope, and the schematics and steps circulating online are not guaranteed to hold on your version, so they are not reproduced here.

The boundaries first: only three official Carpet rules relate directly to world eaters, and two of them change vanilla behaviour, so they must stay off on a live server. What you actually have to set up in advance is crash protection, and the order matters — **rules first, machines second**.

## 1. What a World Eater Is, and Where the Risk Sits

A world eater fires a TNT array continuously while a flying machine carries the whole structure forward, clearing the terrain as it goes. Its output is a hollowed-out region; its cost is the most expensive things a server has: large numbers of TNT entities, wide-area explosion processing, an enormous volume of block updates from destroyed blocks, and a flying machine that never stops running.

| Risk | Source |
| --- | --- |
| TPS collapse | Many TNT entities and explosions existing at the same instant |
| Storage and bandwidth pressure | One run rewrites a large area, producing a huge volume of block updates |
| Losing control unattended | The machine advances by itself, and nobody may be present when it goes wrong |
| The operation itself oversteps | Update suppression ("qiemen") fills the neighbour update stack, which can then crash the server |

The same machine means opposite things to the two sides of the server:

| Role | What a world eater means |
| --- | --- |
| Player | An efficient production line yielding a cleared region, and the output is theirs |
| Owner | A whole-area block rewrite + a sustained high load + a crash risk |

So the question is never "can it be built", but "can you clean up after it fails".

## 2. The Official Rules That Relate Directly to World Eaters

Carpet toggles fine-grained vanilla behaviour with `/carpet <rule> <value>`. Only the three rules below relate directly to world eaters; the official descriptions are quoted verbatim:

| Rule | Official description | Effect on vanilla behaviour |
| --- | --- | --- |
| `optimizedTNT` | TNT causes less lag when exploding in the same spot and in liquids | Does not change the blast itself; it only makes explosions in the same spot and in liquids cheaper |
| `tntDoNotUpdate` | TNT doesn't update when placed against a power source | **Changes vanilla behaviour**: TNT placed against a power source no longer updates |
| `explosionNoBlockDamage` | Explosions won't destroy blocks | **Changes vanilla behaviour**: explosions stop destroying blocks |

How to use them:

- `optimizedTNT` is about **the same spot and liquids** being less laggy, which is exactly the pattern a world eater produces; it optimises cost, not effect.
- `tntDoNotUpdate` and `explosionNoBlockDamage` **change vanilla behaviour** and belong to testing or specific scenarios only. Do not enable them on a live server: `tntDoNotUpdate` breaks the "place TNT against a power source" pattern, and `explosionNoBlockDamage` removes the destructive power of explosions, so the machine can no longer clear anything.

:::warn The two behaviour-changing rules belong to a test environment
`tntDoNotUpdate` and `explosionNoBlockDamage` are useful in a test server for validating a structure or running a harmless demonstration, and they are **not suitable for a live server**. Machine behaviour measured with them enabled is not the behaviour you will get in production.
:::

## 3. What Update Suppression Actually Is

**"Qiemen" (cutting doors) is the community nickname for update suppression as a class of operations.** It is not one block or one machine; it is a whole family of techniques that exploit update suppression.

Official Carpet exposes a controllable entry point for it: the rule is named `updateSuppressionBlock`, and its official description says that **placing an activator rail on top of a barrier block will fill the neighbour updater stack when the rail turns over.**

Two things to remember:

1. It is an **official, controllable entry point** — the server side of this does not require an extra mod to be switchable.
2. Its consequence is written into that sentence: filling the neighbour update stack is exactly where the crash risk comes from.

## 4. Why Crash Protection Must Come First

Update suppression works by **filling the neighbour update stack**. What happens after it fills is not under your machine's control: **it can then crash the server**.

That is the whole answer to the ordering question. Many owners start the machine first and look for a rule after the crash — but a crash does not always come out gently: at the moment the server goes down, chunks being written and machine state being ticked are not guaranteed to be complete. The correct order is:

```
1. Set the crash-protection rules (this section)
2. Then start the machine and let players work
```

The verified crash-protection rules, grouped by source. The names and values are already catalogued in [Carpet and Its Add-ons](/tutorials/java/tech-carpet); **what this section adds is the order in which to use them**:

| Source | Rule | Accepted values |
| --- | --- | --- |
| Carpet AMS Addition | `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| Carpet AMS Addition | `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |
| Carpet TIS Addition | `yeetUpdateSuppressionCrash` | See the mod documentation for your version |
| Carpet TIS Addition | `updateSuppressionSimulator` | See the mod documentation for your version |

Notes:

- `amsUpdateSuppressionCrashFix` is a **three-state switch**: `false` and `true` are the familiar off and on, and `silence` is a third handling mode. Treat the mod's own documentation as authoritative for what each state does; this article does not define it for them.
- `customBlockUpdateSuppressor` **turns the chosen block into an update suppression block**, and the accepted values are the blocks listed above.
- Carpet TIS Addition's `yeetUpdateSuppressionCrash` and `updateSuppressionSimulator` cover **two other angles**: one for crash handling, one for simulation. Their exact behaviour and accepted values follow the mod documentation for your version.

:::tip Confirm the rules actually work before you start the machine
Crash protection is a safety net, not a guarantee that nothing can ever go wrong. The procedure is: **trigger update suppression yourself once and watch what happens**, confirm the rules intercept it as expected, and only then let players start the machine.
:::

## 5. Version Differences: Newer Versions Need Community Mods

This fact has to be stated plainly: **update suppression has been fixed in official versions.** On newer versions, the same kind of operation needs a community restoration or helper mod, and the version ranges they cover do not overlap:

| Mod | Loaders | Versions covered |
| --- | --- | --- |
| `update-depression` | fabric, quilt | 1.19.4–1.21.1 |
| `better-update-suppression` | fabric | 1.21.10–26.2 |
| `suppressed` | fabric | 26.1.1–26.2 |
| `lithonate` | fabric | 1.16.5 only |

How to read that table:

- It is not a "pick any one" list. These are **four distinct, non-overlapping ranges**: decide your game version first, then see whose range it falls into.
- `suppressed` and `better-update-suppression` both sit around the 26.x era, `update-depression` covers the older 1.19.4 to 1.21.1, and `lithonate` covers 1.16.5 only.
- **Changing version means redoing this choice.** Whether a machine runs, and which mod it needs, both depend on the version; never assume an upgrade keeps everything working.

## 6. The Three-Part Kit: Backups, Permissions, Crash Protection

The more powerful the machine, the less optional these three become. Each maps to an article on this site:

| Item | What it buys you | Where |
| --- | --- | --- |
| **Backups** | After a crash, a mistake or a runaway machine, a state you can return to | [Protecting Your World](/tutorials/java/tech-backup) |
| **Permissions** | Who may run the machine, and who may use high-risk operations such as update suppression | [Land Claims and Protection](/tutorials/java/protection) |
| **Crash-protection rules** | Pulls update suppression back from "can take the server down" into a controllable range | Section 4 above |

One more article is directly relevant to how machines behave: why machines break and why they are slow comes down to the tick model and the order of updates within a single tick, covered in [Advanced Technical Minecraft and Redstone](/tutorials/java/redstone-advanced).

## 7. The Bottom Line

```
1. Only three official rules matter here: keep `optimizedTNT`, leave the other two off in production
2. Qiemen (cutting doors) is the community name for update suppression; the official entry point is `updateSuppressionBlock`
3. Set crash protection first, start the machine second — the reverse order bets your world
4. On newer versions, pick the restoration/helper mod by version before anything else
```

## Next Step

Before a machine moves earth, make sure you can get your world back: see [Protecting Your World](/tutorials/java/tech-backup). Who may run a machine is a permissions question — see [Land Claims and Protection](/tutorials/java/protection); why machines break and why they are slow is covered in [Advanced Technical Minecraft and Redstone](/tutorials/java/redstone-advanced), and why anti-cheat is a net loss here in [Why Anti-cheat Is Not Recommended](/tutorials/java/tech-anticheat).

---

> Every rule name, official description, mod name and version range quoted here follows the official Carpet, Carpet AMS Addition and Carpet TIS Addition sources, and the Modrinth project pages of the listed mods; construction details and machine designs are outside the scope of this article.
