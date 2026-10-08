---
title: "[Technical] Why Anti-cheat Is Not Recommended"
slug: sd-anticheat
cat: java
level: 3
order: 36
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, anti-cheat, permissions, whitelist, backups]
updated: 2026-10-08
draft: false
---

Anti-cheat is a plus on an ordinary survival server, but on a technical server it is often a net loss. The reason is not that anti-cheat is badly made: it is that **the normal way technical players play keeps triggering anti-cheat checks**.

There is a more direct fact as well: official Carpet already ships the `antiCheatDisabled` rule, described officially as Prevents players from rubberbanding when moving too fast. The fact that the rule system provides that switch shows what a technical server actually needs is to **turn off vanilla's own rubberbanding check for fast movement**, not to add another layer of detection on top.

This article covers the conclusion and the alternatives: why the conflict is structural, where false positives come from, and what to install instead. [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat) covers the general two-layer defence and how to configure it, and none of that is repeated here.

## 1. The Signal From the Official Side

Start with the single most persuasive fact.

| Rule | Official description | What it means |
| --- | --- | --- |
| `antiCheatDisabled` | Prevents players from rubberbanding when moving too fast | With it enabled, players are no longer rubber-banded for moving too fast |

Read that rule closely:

- It addresses exactly one thing: **being rubber-banded for moving too fast**, which is vanilla's own fast-movement check. "Check" here means vanilla behaviour, not a third-party anti-cheat.
- Its existence shows that **what a technical server really needs is that vanilla check switched off**, not another layer of judging stacked on top of it.

## 2. Why Normal Play Triggers Checks

The everyday actions of a technical player look like anomalies to any detection logic:

| Technical play | What it looks like to detection logic |
| --- | --- |
| High-speed movement (elytra, ice roads, minecarts, piston launches and similar) | Excessive speed, discontinuous position |
| Large numbers of entities (mob farms, TNT arrays, piles of drops and XP orbs) | Abnormal entity behaviour and abnormal density |
| Machines and automation (flying machines, repeaters, long unattended runs) | High-frequency, repetitive actions that do not match human input |

The important word is "keeps": this is not the occasional brush against a check, it is **play that lives permanently at the edge of what a check considers normal**. Two kinds of loss follow:

1. **False positives interrupt machines and tests directly**: being rubber-banded, having actions cancelled or being kicked can waste an entire test run.
2. **False positives are hard to reproduce**: the reason a machine broke is usually hard enough to diagnose, and stacking a layer that randomly interferes with movement and actions multiplies the cost.

:::warn No specific thresholds are discussed here
Implementations and thresholds differ between anti-cheat products, and this article neither lists, compares nor reviews any specific one. The point is the **structural conflict**: logic calibrated against "normal human input" will inevitably collide with play whose whole purpose is to exceed what human input can do.
:::

## 3. Which Side It Has to Run On, and What That Costs

Anti-cheat normally has to be installed on a **plugin server or an optimised core**. The problem is that an optimised core already changes vanilla behaviour, and both facts point away from the goals of technical play:

| Conflict | Explanation |
| --- | --- |
| Platform | Anti-cheat targets the plugin ecosystem, while the technical toolchain (Carpet and its add-ons) lives on Fabric |
| Behaviour | An optimised core's defaults already depart from vanilla behaviour, so machines may stop working or produce unstable output |
| Goal | Anti-cheat exists to suppress anomalies; technical play exists to exploit them — the two point in opposite directions |

For core selection and the trade-offs of an optimised core, see [Choosing a Server Core](/tutorials/java/core); for why a plugin core has to be tuned back toward vanilla item by item, see [Technical Minecraft and Redstone](/tutorials/java/redstone). The conclusion here is one line: **components pointing in opposite directions cancel each other out.**

## 4. If Not Anti-cheat, Then What

The more useful question is the reverse one: **what are you actually trying to prevent?** Split it apart and every category has a steadier answer than anti-cheat:

| What you want to stop | What to use | Notes |
| --- | --- | --- |
| Strangers causing trouble | Whitelist and permissions | Putting the barrier in front of the door is far cheaper than judging behaviour afterwards |
| Griefing and theft | `ledger` logging and rollback | Official description: Ledger is a comprehensive logging system for Fabric servers. It provides essential tracking for hundreds of in game events — in one line, a server-side logging mod — the Fabric-side counterpart to CoreProtect on the plugin side |
| The worst case | Scheduled and offsite backups | Being able to roll the whole world back is the last line of defence |
| Block-eating players and auto bedrock-breaking | `playerOperationLimiter` | Official description: per game tick a player may place 2 blocks or instantly break 1 block, and only one of the two operations per tick, for preventing human bulldozers and player auto bedrock-breaking mods |

A few notes:

- **Whitelist and permissions**: a technical server is usually a circle of people who know each other, so controlling who gets in beats judging behaviour once they are inside. For splitting permissions by group, see [Land Claims and Protection](/tutorials/java/protection).
- **Logging and rollback**: `ledger` (the Fabric-side counterpart to CoreProtect) is a logging tool. It does not intercept anything in real time, but it **answers who did what, and when**. Without a log you have no basis for acting at all.
- **Backups**: scheduled plus offsite backups cover the case where everything above has already failed; the full strategy and recovery procedure are in [Protecting Your World](/tutorials/java/sd-backup).
- **`playerOperationLimiter`**: note that this is a **server-side limit**. It acts inside the server itself and requires nothing from players. It caps per-tick placement and breaking operations, targeting automation abuse rather than scoring legitimate play. It is a rule provided by a Carpet add-on project, so **confirm it is available for your game version and mod set before installing**.

## 5. What to Do: A Positive Checklist

Rather than arguing against anti-cheat again, just follow this:

1. **Set the entry barrier first**: a whitelist or an application process controls where your players come from.
2. **Then split permissions**: ordinary players, the technical group and admin rights are separate groups, and OP is not handed out lightly; decide in advance who may run machines and who may use high-risk operations.
3. **Install a logging tool**: a logging mod such as `ledger` should go in as early as possible, because it only records what happens after it is installed.
4. **Set up backups**: scheduled plus offsite, and **rehearse a restore once** — a backup you have never restored is not a backup.
5. **Prefer server-side limits to real-time judging**: something like `playerOperationLimiter`, which acts inside the server and depends on nothing from the player's client.
6. **Write the rules down**: what is allowed, what is forbidden and how violations are handled, somewhere players can actually see it.
7. **When you need vanilla's rubberband check out of the way, use `antiCheatDisabled`**: it is a switch in the official rule system, more controllable than a third-party component and much easier to explain to players.

## 6. The Bottom Line

```
1. The official side already provides antiCheatDisabled — a technical server wants vanilla rubberbanding off, not another layer on
2. Normal technical play keeps triggering checks, so false positives are certain, not occasional
3. Anti-cheat has to run on a plugin/optimised core, the opposite direction from technical goals
4. Alternatives: whitelist and permissions + ledger logging + scheduled offsite backups + server-side limits
```

## Next Step

The general two-layer defence and how to configure it is in [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat); who may run machines and who holds permissions is in [Land Claims and Protection](/tutorials/java/protection); how to recover when things go wrong is in [Protecting Your World](/tutorials/java/sd-backup), and risk control before a machine starts is in [World Eaters and Update Suppression](/tutorials/java/sd-machine).

---

> The rule names and official descriptions quoted here come from the official Carpet source; the mod summaries come from the Modrinth project page for `ledger` and the official Plusls Carpet Addition (plusls-carpet-addition) documentation of `playerOperationLimiter`. No specific anti-cheat product, implementation or threshold is discussed, and nothing already covered by [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat) is repeated.
