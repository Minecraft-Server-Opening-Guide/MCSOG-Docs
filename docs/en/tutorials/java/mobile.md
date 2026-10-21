---
title: Supporting Mobile Players
slug: mobile
cat: java
level: 2
order: 14
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, geyser, floodgate, bedrock, mobile, cross-platform, udp]
updated: 2026-10-04
draft: false
---

Many players only ever play Minecraft on a **phone / tablet / console**, which is **Bedrock Edition**. By default, Bedrock players **cannot join a Java Edition server** — the two editions use completely different protocols.

**Geyser** bridges that gap and lets phone players join your Java server.

## 1. Geyser Is One-Way (Get This Straight First)

The official Geyser FAQ is explicit:

> **Can I use Geyser to let Java players connect to my Bedrock server?**
> **No. This is a tool for letting Bedrock players connect to a Java server; the reverse does not work.**

Therefore:

| Direction | Possible? | Solution |
| --- | --- | --- |
| Bedrock players → **Java server** | Yes | **Geyser** (+ Floodgate) |
| Java players → Bedrock server | No official solution | Does not exist |

**Geyser is installed on the Java server side**; the official Bedrock dedicated server (BDS) **cannot run Geyser**.

## 2. Where and How to Install It

Geyser comes in several forms; pick the one matching your Java server:

- **Plugin form**: plugin servers such as Spigot / Paper / Purpur (the most common)
- **Proxy form**: Velocity / BungeeCord (installed on the proxy in a multi-server setup)
- **Mod form**: Fabric / NeoForge
- **Standalone form**: runs on its own without depending on any of the platforms above

Once installed, restart the server and Geyser generates its own configuration files.

## 3. The Key Point: You Must Open a UDP Port

This is the step people miss most often:

| Port | Protocol | Purpose |
| --- | --- | --- |
| `25565` | **TCP** | Java player connections |
| `19132` | **UDP** | **Bedrock player connections (Geyser listens here)** |
| `19133` | UDP | Default Bedrock IPv6 port |

:::warn Opening only TCP is the number one reason phone players cannot connect
You must allow **UDP 19132** in **both** the cloud provider's security group and the system firewall. Plenty of people open only TCP 25565 and then wonder why "the phone cannot connect".
:::

In the "Add Server" screen, phone players fill in: **address = your IP or domain, port = 19132**.

## 4. Floodgate: So Phone Players Do Not Need a Java Account

By default, with premium authentication enabled on the Java server, Bedrock players **have no Java account** and are turned away at the door.

**Floodgate** solves this: it lets Bedrock players **get in directly with their Xbox account**, without buying Java Edition.

Key points:

- Floodgate is normally installed alongside Geyser;
- Bedrock players' names carry a **prefix** (`.` by default) to distinguish them from Java players;
- so when writing names in **whitelists, bans and commands**, keep that prefix in mind, and wrap the name in quotes when necessary;
- you can also use Floodgate's account linking to associate a Bedrock account with an existing Java account.

## 5. Known Limitations (Tell Players in Advance)

- **Console platforms are restricted**: Xbox / PlayStation / Switch players **cannot simply type in an IP to join**; they usually have to connect via a **custom DNS** or **LAN** method.
- **Visual glitches at long distances**: the Bedrock client is 32-bit while Java is 64-bit, so strange position/render issues can appear when travelling far out (the community has unofficial mitigations).
- **Some plugins are incompatible**: Geyser emulates a Java client, so the vast majority of plugins work, but the few that reach deep into login or the protocol will conflict.
- **Resource packs need converting**: Java resource packs cannot be read by Bedrock, so they have to be converted to the Bedrock format before Geyser can use them.
- **Modded servers are limited**: if the server requires clients to install mods before joining, Geyser cannot bring them in either ("if a vanilla client can join, Geyser can join").

## 6. Should You Enable Cross-Play?

**Good fit**: you want to widen your player base, you already have a phone-player community, or the gameplay leans towards survival/building (not sensitive to exact redstone).

**Be careful**: **technical servers**. Bedrock and Java redstone behaviour already differs, so cross-play players see inconsistent mechanics, which easily leads to arguments.

## Next Step

Data is priceless, so back it up first: see [Backup and Recovery](/tutorials/java/backup).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
