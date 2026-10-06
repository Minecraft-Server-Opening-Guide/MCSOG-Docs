---
title: Land Claims and Protection
slug: protection
cat: java
level: 3
order: 22
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, land-claim, protection, residence, dominion, worldguard]
updated: 2026-10-04
draft: false
---

Once a server is open to the public, the same class of trouble is almost guaranteed: **people tearing down someone else's build, people rummaging through someone else's chests, people camping the spawn to kill newcomers**. Talking it out afterwards rarely settles anything, so you need defences both in your rules and in your tooling. This article covers the tooling side: **land claims and protection**.

## 1. Why You Need Claims at All

The problems on a public server fall into three broad groups:

| Problem | Typical form | What a protection plugin does | What a logging plugin does |
| --- | --- | --- | --- |
| Griefing | Breaking builds, burning forests, pouring lava, flattening farms | Blocks non-members from changing blocks | Identifies the culprit and rolls the area back |
| Theft | Opening chests, emptying furnaces and hoppers, leading away livestock | Bars non-members from containers and entities | Shows the container access history |
| Disputes | Kill stealing, blocking doorways, PvP at someone's front gate | Disables PvP and some interactions inside the region | Reconstructs what happened as grounds for punishment |

:::note Protection prevents, logging traces
These are not the same job. A protection plugin exists to **stop damage from happening at all**; a logging plugin exists to **find out what happened afterwards and undo it**. A server that wants to be safe runs both, for the reasons in section 5.
:::

## 2. Two Approaches: Player Claims versus Admin Regions

Claim plugins split into two groups with fundamentally different philosophies. Getting this distinction straight first makes the rest of the choice much easier:

| | Player-run claims | Admin-side region protection |
| --- | --- | --- |
| Who draws the boundary | **Players themselves**, with commands or a tool | **Administrators**, with a selection tool |
| Typical plugins | Residence, Dominion, GriefDefender | WorldGuard |
| Do players need to learn commands | Yes, and they must understand the claim rules | Essentially no |
| Protection granularity | Per player, per claim | Per region, per world |
| Best suited to | Survival servers, servers that allow free building | Spawn, shops, event arenas, public facilities |
| Administrative cost | Low: players look after themselves | High: every region is maintained by an admin |

In one line: **player-run claims give every player their own lock; admin-side regions put a fence around shared space**. The two do not conflict, and larger servers usually run both.

## 3. Player-Run Claim Plugins

### Residence

A veteran claim plugin with more than thirteen years of development. It was originally maintained by bekvon, later taken over by the Zrips team, and moved to an **open-source, paid** operating model.

- **Dependency**: it needs CMIlib to run.
- **Versions**: supports servers from 1.8 upwards, which is a very wide range.
- **Security**: to avoid known exploits, **do not run a version below 5.1.4.2**.
- A free build is still available from SpigotMC or the Zrips website.

Its greatest strength is **name recognition**: it has been used on a great many servers, players already understand how its commands behave, and long-standing veterans pick it up cheaply. Its ecosystem compatibility has also been proven over years, so conflicts with other plugins are comparatively unlikely.

### Dominion

A **fully open-source and free** claim plugin written from the start for modern versions.

- **Version requirement**: only 1.20.1 and above (Bukkit / Spigot / Paper / Folia); **servers below 1.20 cannot use it**.
- **Runtime**: requires Java 21.
- Although Spigot is supported, the author strongly recommends Paper or one of its forks such as Purpur for better performance.
- It can import the great majority of Residence data, which keeps migration cheap.
- The project is still marked beta, so releases come very frequently: the upside is fast bug fixes, the downside is a fast upgrade treadmill.

### GriefDefender

Another claim protection plugin, with documentation in both English and Chinese. Note that its **open-source code stops in 2021** and has not been published since, so its long-term maintenance status is something you should assess for yourself.

## 4. Admin-Side Region Protection: WorldGuard

WorldGuard occupies a different niche from the three above. It is not aimed at players claiming their own land; it lets **administrators define regions and set rules for them**.

- **Dependency**: WorldEdit or FastAsyncWorldEdit must be installed.
- **Default state**: every feature is off by default, and you enable only the parts you actually need.

What it does falls roughly into two categories.

**Region protection**

- stop players from placing and breaking blocks inside a given region;
- allow only specific people to build in a region;
- disable PvP, TNT, mob damage and similar features inside a region.

**World rule tuning**

- prevent block damage from creepers and withers, as well as fall damage and similar;
- turn off fire spread, lava ignition, ice formation, endermen picking up blocks and other mechanics;
- blacklist certain items or blocks so they cannot be used;
- warn administrators when particular items or blocks are used;
- close off some item-duplication exploits that abuse game mechanics;
- provide handy administrative commands such as one that immediately halts all fire spread.

WorldGuard is a **staff tool, not a player tool**. It fits the spawn, the shop district, event arenas, and worlds that need uniform rules, for example a resource world where PvP and block placement are both forbidden.

## 5. How Claims Relate to Your Anti-Grief Logging Plugin

Many people assume that installing a claim plugin removes the need for logging. That is a common misunderstanding:

- **Claims only protect the land that has been claimed.** Wilderness, public areas and not-yet-claimed plots have no protection at all.
- **Claims cannot stop an inside job.** If a player grants access to unreliable teammates or shares the claim, nothing stops those people from emptying the chests.
- **Claim plugins generally do not roll anything back.** They stop what they can stop; whatever gets through (explosions, damage outside the claim, a misconfigured permission) still needs a logging plugin to restore.

The standard pairing is therefore: **the claim plugin prevents, and a logging plugin such as CoreProtect traces and rolls back**. See [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat) for how the two divide the work and how to configure them.

:::warn Install the logging plugin early
It can only record what happens **after** it is installed. Install it once the damage is already done and none of the earlier history exists.
:::

## 6. Comparison Table

| Plugin | Who claims | Learning curve | Version requirement | Typical use |
| --- | --- | --- | --- | --- |
| **Residence** | Players | Low: long-established, plenty of guides | 1.8+ | Survival servers with free building; older servers with a large player base |
| **Dominion** | Players | Low to medium | 1.20.1+, needs Java 21 | Newer high-version survival servers that want an open-source option |
| **GriefDefender** | Players | Medium | Depends on the version | Claim management that needs finer permission tiers |
| **WorldGuard** | Administrators | Medium to high: selections and flags | Follows WorldEdit / FAWE | Spawn, shops, event arenas, world-wide rules |

## 7. How to Choose

Work through the following in order:

1. **Is the server on 1.20.1 or newer?**
   - Yes: both Residence and Dominion are on the table. Pick Dominion for an open-source project with active development, or Residence for familiarity and proven compatibility.
   - No: rule Dominion out and choose between Residence and GriefDefender.
2. **Are the players mostly veterans or newcomers?**
   - Mostly veterans: Residence's existing familiarity saves you a great deal of support time.
   - An entirely new player base: Dominion's command design sits closer to modern habits.
3. **Do shared areas need their own rules?**
   - Yes: whichever claim plugin you pick, add WorldGuard alongside it.
4. **Are there cross-version or unusual core requirements?**
   - Yes: favour the option with the wider compatibility and the better documentation, and validate it on a test server first.

:::tip Do not run two player-claim plugins at once
Residence, Dominion and GriefDefender all solve the same problem. Run two together and players will not know which one to use, while the two selection models readily interfere with each other. **Pick one.** WorldGuard sits on a different layer and can coexist with any of them.
:::

## 8. Common Pitfalls in Practice

- **No cap on claim size**: configure how much land and how many claims each player gets, or a single person can claim everything around the spawn. Most plugins let you grant different quotas per permission group.
- **Permissions left unconfigured**: claim commands are all gated behind permission nodes. Get this wrong and either players cannot use the plugin, or everyone is effectively an administrator.
- **Overlapping and adjacent claims**: decide in advance how the plugin treats overlaps and directly neighbouring claims, and write that decision into your server rules.
- **Claim teleports being abused**: teleporting to your own claim is a common feature, but rate-limit it and add a cooldown so it does not become free long-distance transport.
- **Protection that only applies to the overworld**: many claim plugins scope protection per world. Once you run multiple worlds, check whether the resource world and the creative world are protected too, or whether they are **deliberately** left open, since a resource world is usually meant to be mined freely.

## Next Step

Claims and region protection are drawn with the same toolset that handles world editing and multiple worlds: see [World Management](/tutorials/java/world).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
