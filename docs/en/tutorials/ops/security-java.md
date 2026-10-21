---
title: "[JAVA] Security Plugins"
slug: security-java
cat: ops
level: 2
order: 3
minutes: 12
tags: [java, ops, security, plugins, authme, coreprotect, luckperms, anticheat]
updated: 2026-10-04
draft: false
---

Once a server goes public, security splits into three layers: **who is who** (identity), **whether you can investigate an incident** (logging and rollback), and **who is allowed to do what** (permissions). Each layer has mature plugins; below we cover only the ones **with a verifiable official repository**.

## 1. Authentication: AuthMe

**AuthMeReloaded** is the authentication plugin for the Bukkit / Spigot family (the author describes it as "an authentication plugin for the Bukkit/Spigot API").

- Repository: <https://github.com/AuthMe/AuthMeReloaded>
- **When you need it**: only in **offline mode** (`online-mode=false`). On a premium server, accounts are verified by Mojang, so no extra login is needed.
- **What it solves**: in offline mode "an ID can be claimed by anyone", and AuthMe binds an ID to a password through **registration + password login**, so impostors cannot get in.
- **What it cannot solve**: the fundamental problems of offline mode (bans can be bypassed by switching IDs, and skins and UUIDs cannot be bound) remain. **Public servers should still enable premium verification**.

:::warn Offline mode's cost does not disappear because you installed a login plugin
A login plugin only "adds a door to offline mode"; it does not turn an offline server into a premium one. Account security, skins, and the force of bans all remain discounted.
:::

## 2. Logging and Rollback: CoreProtect

**CoreProtect** is a data logging and anti-griefing tool (official description: *blazing fast data logging and anti-griefing tool*).

- Repository: <https://github.com/PlayPro/CoreProtect>
- **What it records**: block placement and breaking, container access, entity and command activity, all written to a database.
- **What it can do**: find out "who broke this area and when", check what a given player has done recently, and **roll back in bulk** by time or by player, restoring a damaged area to its original state.
- **Why it is the first priority**: without logs you do not even know who did it, so bans and rollbacks are out of the question.

:::tip Install it as early as possible
CoreProtect can only record what happens **after** it is installed. Install it only after the damage and none of the earlier activity can be found.
:::

## 3. Permissions: LuckPerms

**LuckPerms** is a permissions plugin for Minecraft servers (official description: *A permissions plugin for Minecraft servers.*).

- Repository: <https://github.com/LuckPerms/LuckPerms>
- **What it solves**: vanilla only offers "OP or not", and OP is extremely powerful. LuckPerms uses **permission groups + permission nodes** for fine-grained control, so which command a player may use and which blocks they may touch can each be configured individually.
- **Security value**: split "administrator" into several roles (support, builder, event host) so that **everyone gets only the permissions they need**, instead of one person holding total power.
- **A habit to build**: review permission groups and the OP list regularly.

## 4. Anti-Cheat: Grim

**Grim** is an **open-source, asynchronous, multi-threaded, prediction-based** anti-cheat (the author's description also notes the supported version range 1.8–1.21; check the repository's current statement for details).

- Repository: <https://github.com/GrimAnticheat/Grim>
- **Approach**: rather than waiting for a player to actually break a rule, it **predicts** where and in what state the player should be and flags any deviation, which makes it sensitive to traditional packet-manipulation cheats.
- **Why open source helps**: the detection logic can be inspected and audited instead of trusting a black box.

:::warn In anti-cheat, a false positive hurts players more than a miss
Whichever anti-cheat you use, **first run it in "log only, no punishment" mode for a while** and confirm there are no false positives before enabling punishments. Normal players who get kicked, rubber-banded, or even banned will simply leave.
:::

## 5. Choose by Category, Not by Reputation

| Category | Example | Priority |
| --- | --- | --- |
| **Logging and rollback** | CoreProtect | Essential (first priority) |
| **Permissions** | LuckPerms | Essential |
| **Authentication** | AuthMe (needed only in offline mode) | Essential for offline servers, unnecessary for premium servers |
| **Anti-cheat** | Grim and similar | A bonus, requires careful configuration |
| **Entry gate** | Whitelist / entry review | Strongly recommended for small, high-quality servers |

## 6. General Principles

1. **Download only from official channels**: plugins are third-party code running with server-level privileges, and jars passed around on forums or in chat groups carry the highest risk (they may be stuffed with backdoors).
2. **Test on a test server first**: never install a plugin of unknown origin directly on your main server.
3. **Least privilege**: do not grant OP when you can avoid it; use permission nodes instead.
4. **Backups are the last line of defense**: anti-cheat and logging cannot stop the worst case, so off-site backups remain indispensable (see "Backup and Restore").
5. **Keep an audit trail for admin actions**: who banned whom and who granted what should all be traceable, to avoid accusations of administrative abuse.

## Next Step

- For the Bedrock Edition equivalent, see [[BE] Security Plugins](/tutorials/ops/security-be)
- For rules and player management at the operational level, see [[JAVA] Operations and Management](/tutorials/ops/management-java)
- For a quick troubleshooting reference, see [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java)

---

> The positioning descriptions of the plugins in this article are taken from their respective **official repositories** (links in the body); plugins whose source cannot be verified are not included.
