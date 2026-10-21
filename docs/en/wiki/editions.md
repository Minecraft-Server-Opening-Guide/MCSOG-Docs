---
title: Differences Between Java Edition and Bedrock Edition
slug: editions
mc: [1.21.x, 1.20.4]
tags: [java, bedrock, comparison, ports]
updated: 2026-10-04
---

Java Edition and Bedrock Edition are not the same game version: redstone, commands and mod mechanics all differ. Understand the differences before you decide which edition to host.

> Port numbers and redstone differences are official, fixed behaviour; details may shift between versions, so the official notes for your version take precedence.

## Side-by-side differences

| Item | Java Edition | Bedrock Edition |
| --- | --- | --- |
| Redstone and commands | Complete redstone mechanics (including quasi-connectivity), the fullest command set | Redstone behaves differently (no quasi-connectivity, pistons and sticky blocks act differently) |
| Mods and plugins | Fabric / Forge / NeoForge plus a plugin ecosystem | Mainly add-ons |
| Server cores | Paper / Purpur / Fabric / Forge / Velocity | BDS / Nukkit / PocketMine-MP |
| Default port | 25565 (TCP) | 19132 (UDP), 19133 (UDP) for IPv6 |
| Cross-edition play | A Java server needs Geyser before Bedrock players can join (with Floodgate they can skip Java account login) | A Bedrock server cannot let Java players in |
| Performance and tuning | The richest choice of optimisation forks and startup flags | Official BDS has few tuning options; system-level tuning does most of the work |
| Who it suits | Anyone who wants plugins, mods, automation and large-scale multiplayer | Phone and console players, plug-and-play multiplayer |

## Things to watch

Bedrock servers use UDP 19132 and Java servers use TCP 25565. Allowing only TCP is the most common reason players cannot connect.

The cross-edition tool Geyser is one-way: it lets Bedrock clients connect to a Java server. There is no official solution in the other direction (Java clients joining a Bedrock server). Geyser has to be installed on the Java server side, and cannot be installed on the official Bedrock server, BDS.
