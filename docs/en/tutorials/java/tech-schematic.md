---
title: "[Technical] Sharing Schematics"
slug: tech-schematic
cat: java
level: 3
order: 31
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, schematic, litematica, syncmatica, fabric]
updated: 2026-10-08
draft: false
---

Technical Minecraft runs on schematics. Nobody builds someone else's world eater, mob farm or update-suppression machine from memory; you project the schematic and work through it layer by layer. On a single-player world that is simple: install a client-side projection mod and you are done. On a multiplayer server the schematics live on individual players' computers, so anyone who wants to build from one has to ask the author for a copy of the file first.

`syncmatica` exists to solve exactly that. Its official description reads: Syncmatica is a mod which aims to mod into litematica so that schematics and their placements can be easily shared. In other words, it is a companion that synchronises Litematica, so that schematics and their placements can be shared conveniently.

This article covers three things only: why you need it, which side it goes on, and how the versions line up. **For how to actually upload a schematic, who is allowed to do so, and which command to use, follow the mod's own documentation — this article deliberately does not reproduce those steps**, because they can change between releases and following an outdated walkthrough is worse than reading the official one.

## 1. Where Schematic Sharing Goes Wrong on a Server

In a single-player world the schematic files and the projection both live in your own client, so there is nothing to share. On a multiplayer server there are three layers of friction:

| Problem | What it looks like in practice |
| --- | --- |
| The file lives on one person's computer | Every new player has to be sent a copy of the file again |
| The placement does not match | A projection needs to know which coordinates the schematic sits at, and passing coordinates around by chat goes wrong easily |
| Versions and sources get mixed up | After a few hand-offs, nobody can tell whose copy is the current one |

`syncmatica` is aimed at the first two: making a schematic and its placement into something that "can be easily shared". Note that its official description says aims to, which tells you it handles the synchronisation and sharing layer, not the projection itself — displaying the projection is still Litematica's job.

> To see where projection sits in the technical toolchain, look back at the client-side mod table in [Technical Minecraft and Redstone](/tutorials/java/redstone) and at the description of MiniHUD, Litematica and similar tools in [Advanced Technical Minecraft](/tutorials/java/redstone-advanced).

## 2. What Goes on Which Side

This is the table worth remembering. Sharing schematics is not a one-mod install: **Syncmatica goes on both the server and the client, and the client additionally needs Litematica**.

| Side | What to install | Why |
| --- | --- | --- |
| Server | `syncmatica` | The server half of the synchronisation. A client-only install cannot share anything |
| Client | `syncmatica` | The client half, working together with Litematica |
| Client | `litematica` | The mod that actually renders the projection; `syncmatica` is its synchronisation companion |

Three mistakes that catch people out:

1. **Players install Syncmatica but the server does not**, so no synchronisation can happen.
2. **The server installs Syncmatica but players have no Litematica**, so a shared schematic has nothing to render it.
3. **The two sides run mismatched versions**, which is the most common problem and gets its own section below.

## 3. Loaders and Version Ranges for the Three Mods

The data below comes from the official Modrinth project entries and was checked when this article was written. Treat it as a starting point and confirm once more on the project page before downloading.

| Mod | Loaders | Supported versions | Downloads (approx.) |
| --- | --- | --- | --- |
| `syncmatica` | fabric, quilt | 1.16–26.3 | 839 thousand |
| `litematica` | fabric, forge, liteloader, ornithe | 1.12–26.3 | 26.44 million |
| `servux` | fabric | 1.14.4–26.3 | 984 thousand |

A few notes:

- All three ranges are wide, running from 1.12 / 1.14 / 1.16 up to recent 26.x releases. **A wide range does not mean any build will do**: what has to line up is the game version, plus both sides of Syncmatica sitting in the same version range.
- One more mod is often mentioned alongside these: `servux`, whose official description reads: Servux is a server-side mod that provides extra support and features for some client-side mods when playing on a that server. It is a **server-side mod** that gives some client-side mods extra support and features. It is not a requirement for sharing schematics, but it solves the same kind of problem — a client-side mod wants more data, and the server has to cooperate.
- `litematica` lists forge, liteloader and ornithe among its loaders, so it is not limited to the Fabric route. `syncmatica`, however, is fabric and quilt only, and **that synchronisation side is what narrows your options**.

## 4. Getting the Versions to Line Up

Because sharing is a two-sided mechanism, "aligned" means four things holding at once:

| What to check | Requirement |
| --- | --- |
| Game version | Client and server must run the same game version |
| `syncmatica` (server) | Must be inside the supported range for that game version |
| `syncmatica` (client) | The same version range as above; do not mix the two sides |
| `litematica` (client) | Must match that game version |

Two failure modes cover most of the cases in the wild: **updating only one side** (a fresh client mod while the server stays behind), and **downgrading the game version to satisfy one mod**, which then breaks the other side.

A safe order of operations:

1. Decide the game version first, then pick all three mods from the table in section 3.
2. Use builds from the same version range for the server and the client side of `syncmatica`.
3. Confirm you can join and that projections render before you worry about sharing.
4. When something does not work, the first suspect is always **version**, not configuration.

## 5. Why This Article Only Covers "Which Side"

Schematic sharing is a **mechanism that spans two sides**, and when one piece is wrong it does not produce a clear error — it just looks like "sharing does nothing". The actual interface — how a schematic gets put up, who may do it, which command manages it — belongs to the mod's own feature surface and changes between releases.

So the approach here is:

1. **Explain the mechanism**: why the mod exists and which way the data flows.
2. **Explain the placement**: what the server needs and what the client needs; neither is optional.
3. **Explain version alignment**: how the three pieces relate.
4. **Leave the interface to the official documentation**: whatever it says, do that.

That is not laziness. Hard-coding one release's screens and commands into a tutorial is how you mislead readers after the mod updates.

## 6. How It Relates to Carpet

In one line: **the same technical toolbox, but a different problem**.

| | Carpet | Syncmatica |
| --- | --- | --- |
| Solves | Switching vanilla detail behaviour with rules | Making schematics and their placements easy to share |
| Shape | A Fabric server-side mod providing a rule system | A synchronisation mod with a server half and a client half |
| Typical use | `/carpet <rule> <value>` | Sharing schematics together with Litematica |

What they share is Fabric: Carpet and all of its add-ons are Fabric, and `syncmatica` lists fabric and quilt. That is one of the reasons [Choosing a Server Core](/tutorials/java/tech-server) recommends a Fabric server with MCDR — the toolchain sits on one side, so there is no bridging to do.

For Carpet's own role and how its rules are used, see [Carpet and Its Add-ons](/tutorials/java/tech-carpet).

## 7. Working with World Eaters and Update Suppression

Large machines are the classic use case for projection. A world eater is a TNT array plus flying machines that clears an area in swathes: it is big, repetitive and unforgiving about coordinates, and no one can build one from memory. The normal flow is: **a schematic exists first, then you build from the projection**.

Sharing schematics solves the collaboration problem inside that flow. A world eater is rarely built by one person; several players work on different sections, and identical projections are what let their blocks meet up correctly.

Once the machine is running, the priority stops being projection and becomes risk control: [World Eaters and Update Suppression](/tutorials/java/tech-machine) explains that the more aggressive the machine, the more you need the trio of backups, permissions and crash-prevention rules, and that on current versions update suppression (known in the community as "cutting the gate") depends on community mods to be restored. Read that article before you build.

## 8. The Bottom Line

```
Syncmatica on the server + Syncmatica on the client + Litematica on the client
Then align all three versions — miss one and sharing simply does not work
```

- **Do not forget the server side**: a client-only setup is the most common beginner mistake.
- **Follow the official documentation** for the actual operations rather than copying someone's steps without checking them.
- **Align versions before installing**: the ranges are in the table in section 3; confirm on the project page first.

## Next Steps

- The foundation of the technical toolbox: [Carpet and Its Add-ons](/tutorials/java/tech-carpet)
- Why a Fabric server: [Choosing a Server Core](/tutorials/java/tech-server)
- Turning a projection into a machine: [World Eaters and Update Suppression](/tutorials/java/tech-machine)
- General performance and diagnosis: [Performance Optimisation](/tutorials/java/optimize) and [Profiling a Server with `spark`](/tutorials/ops/spark)

---

> The role, loaders and version ranges of the mods in this article follow the official Modrinth project entries and each mod's own documentation; for the actual operations, follow the mod's official documentation.
