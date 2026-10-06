---
title: Protocol Versions and Version Choice
slug: protocol
cat: bedrock
level: 2
order: 2
minutes: 10
tags: [bedrock, protocol-version, version-choice, auto-update, ios]
updated: 2026-10-04
draft: false
---

The biggest pitfall when running a Bedrock server is not configuration but **versioning**. This article settles two questions: what a protocol version is, and which game version you should choose.

## 1. Protocol Version: the "Language" Between Client and Server

Think of a protocol version as **the language version the two sides talk in**:

> 1.20.50 speaks "Ancient Chinese" (protocol **630**), while 1.20.60 speaks "Modern Chinese" (protocol **649**).
> Two people who speak different languages **cannot understand each other** — so a 1.20.60 client **cannot connect** to a server running the 1.20.50 protocol, and it tells the player that all players should update to the latest version and try again.

In other words: **the client protocol must match the server protocol** before a player can join. This differs from Java Edition's "version compatibility" logic; Bedrock is far stricter.

### When the Protocol Changes

- **Usually**: the protocol changes when the **tens digit** of the revision number changes. For example, `1.20.10`–`1.20.15` all use **594**; from `1.20.30` it becomes **618**; from `1.20.40` it becomes **622**.
- **Exceptions**: Mojang sometimes changes the protocol within the same tens digit. For example, `1.19.60`–`62` and `1.19.63` use different protocols; `1.21.0`–`1.21.1` and `1.21.2`–`1.21.3` also differ.
- Roughly **every five weeks or so**, a version changes the protocol.

:::tip Looking up protocol numbers
For the protocol number that a specific version uses, refer to the version list on the **Minecraft Wiki**.
:::

## 2. Which Game Version to Choose

**The conclusion first**: with no specific requirement, **choose the latest version**. The latest server usually supports the latest client.

### A Few Client Changes That Hit Players Hard

Mojang described these updates lightly, but they matter a great deal for server owners:

| Version | Impact |
| --- | --- |
| **1.20.50** | Heavy block "flattening" and code refactoring → **cross-version plugin compatibility below this version gets worse** |
| **1.20.40** | The new touch layout allows customizable positions |
| **1.20.x** (roughly) | **Severe stuttering** appeared on Android, with no community fix for a long time |
| **1.19.50** | Added the new touch layout |
| **1.18.30** | **RenderDragon** shipped in the client → **legacy shaders no longer work**, leaving only hardware ray tracing or deferred rendering |

### Beware: "Auto-Update" Is the Biggest Pitfall

App stores update the client **automatically** by default. Bedrock changes protocol every few versions, so:

> A player's client updates itself without your knowledge → **the protocol changes** → **they can no longer join your server** No

Java Edition rarely runs into this, because auto-update happens only in the official launcher, and not every player uses it.

**There are only two ways to respond**:

1. **Keep following the latest version** (update your server to the latest as well) — recommended, and the community default;
2. **Require players to pin a version** — but this brings the problems below.

### The Cost of Pinning a Version

If you choose to pin an older version:

- No **You lose almost every iOS player**: how iOS works means they **can only install the latest version** and cannot install a specific package (the community still has no perfect fix);
- No **You lose every player who plays only the latest version**: the servers and player base on the latest version are enormous;
- No Your support team must **manually walk novices** through installing apk / appx files.

Players themselves also lean toward the latest version: third-party app stores prioritize the newest packages, community news revolves around it, and switching Bedrock versions across platforms is a pain — so the community has settled into an unspoken "everyone follows the latest version".

:::warn Count the losses before pinning a version
Only consider pinning a version when the losses above **will not seriously hurt your server's popularity**. Otherwise, keep the server on the latest version.
:::

## Next Step

With the version strategy settled, go pick a core: see [Choosing a Bedrock Core](/tutorials/bedrock/cores).

---

> Parts of this article reference the Bedrock section of [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
