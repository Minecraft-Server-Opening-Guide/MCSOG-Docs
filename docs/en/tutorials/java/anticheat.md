---
title: Anti-Cheat and Grief Prevention
slug: anticheat
cat: java
level: 3
order: 16
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, advanced, anti-cheat, grief-prevention, coreprotect, rollback, permissions]
updated: 2026-10-04
draft: false
---

As soon as a server goes public, two kinds of problem show up: **people griefing or stealing**, and **people using cheat clients**. The two need different countermeasures.

## 1. Separate the Two Layers of Defence First

| Layer | Goal | Means | Priority |
| --- | --- | --- | --- |
| **Logging and rollback** | Investigate and roll back after an incident | Logging plugins such as CoreProtect / Prism |  **Essential** |
| **Real-time anti-cheat** | Stop cheating as it happens | Anti-cheat plugins (detecting movement, combat, packet sending) | Nice to have |
| **Permissions and auditing** | Prevent "admin abuse" | Permission groups + an audit trail |  Essential |
| **Entry requirements** | Reduce sources of trouble | Whitelist / application review | Depends on scale |

**The order matters**: get "logging and rollback" right first, and only then think about anti-cheat. Because **without logs you do not even know who did it**, while even the best anti-cheat lets some players through.

## 2. Logging and Rollback (Grief Prevention)

These plugins work by **recording every block, container, entity and command action into a database**, after which you can:

- look up **who broke or placed** a given block **and when**;
- look up **what a given player has been doing** recently;
- **roll back in bulk** by time or by player (restoring a griefed area to its original state);
- inspect container (chest) access records to determine whether a theft occurred.

Recommended practice:

- **CoreProtect**: the most widely used block-logging plugin; use it through its lookup and rollback commands.
- You can also pair it with an **InvSee**-style plugin to inspect player inventories (to trace stolen goods).
- **Prism** and similar are alternative options in the same category.

:::tip Install a logging plugin early
It can only record what happens **after** it is installed. Install it once you have already been griefed and none of the earlier events can be found.
:::

## 3. Real-Time Anti-Cheat

The mainstream approach is a **server-side anti-cheat plugin**, which flags anomalies by analysing the packets players send (speeding, teleporting, attacking beyond reach, aimbot behaviour and so on). Common ones include Grim, Matrix, Vulcan and Spartan.

When choosing and configuring one:

- **Start in logging mode**: the vast majority of anti-cheats support "log only, do not punish", so **observe for a while** before enabling punishments.
- **False positives hurt players more than missed detections**: a legitimate player who gets kicked, rubber-banded or even banned leaves for good and posts a bad review. **Better to miss a little than to hit innocent players at scale**.
- **Anti-cheat means little in offline mode**: anyone can come back with a different ID, so account bans lose most of their deterrent value.
- **Client-side anti-cheat**: a few servers require players to install a dedicated client for verification. Protection is stronger but the **barrier to entry is very high**, so it suits closed, competitive servers.
- **Plugin conflicts**: anti-cheat plugins reach deep into the protocol and readily conflict with certain plugins (especially those that alter movement or combat logic), so **watch the logs after installing**.

## 4. Permissions and Internal Management

You can keep outsiders out and still be ruined from the inside:

- **Do not hand out OP casually**: vanilla OP is extremely powerful. Granting permissions finely through **permission nodes** with a permissions plugin (LuckPerms) is far safer than giving OP.
- **Admin actions need an audit trail**: who issued a ban, who handed out items, who changed the world — all of it should be traceable.
- **Avoid one-person rule**: if administrative power sits with a single person, the server is in a bad spot the moment that person goes rogue or disappears.
- **Review regularly**: check the OP list, permission groups and whitelist for people who should not be there.

## 5. Move the Barrier Upfront

Easier than "cleaning up afterwards" is **letting less trouble in**:

- **Whitelist / application review**: common on small, high-quality servers; it blocks the vast majority of griefing and cheating.
- **Clear rules**: write down what is forbidden and how it is punished, so that you have grounds when you act.
- **Probation for new players**: restrict some permissions for new accounts (no access to certain containers for a while, for example) to reduce the risk of one-off destruction.

## 6. A Realistic Conclusion

**No anti-cheat blocks 100% of cheating**, and no protection prevents 100% of griefing. What is genuinely reliable is the combination of three things:

```
Install a logging plugin early (so you can investigate and roll back)
   + Configure anti-cheat carefully (so you do not hit innocent players)
   + Back up off-site regularly (so the worst case can be rolled back wholesale)
```

Of those three, **backup is the last line of defence** (see "Backup and Recovery").

## Next Step

The last step is squeezing performance to a sensible level: see [Performance Optimisation](/tutorials/java/optimize).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
