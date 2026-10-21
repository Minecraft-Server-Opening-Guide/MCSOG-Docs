---
title: "[BE] Troubleshooting FAQ"
slug: faq-be
cat: faq
level: 1
order: 2
minutes: 10
tags: [bedrock, faq, troubleshooting, protocol, bds]
updated: 2026-10-04
draft: false
---

Running a Bedrock server trips over **very different** pitfalls than Java Edition — the biggest one being **version and protocol**. Below they are grouped by symptom, with the source section noted.

## 1. Players can't connect (most common)

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| Prompt: "**All players should update to the latest version**" | **Protocol version mismatch** | The server protocol must match the client: update the server to the latest version, or have players pin their version | [Protocol versions and version choice](/tutorials/bedrock/protocol) |
| It worked yesterday, today nobody can join | Client **auto-update** changed the protocol | Update the server to match (app stores update automatically, and you cannot expect players to downgrade) | [Protocol versions and version choice](/tutorials/bedrock/protocol) |
| **iOS players can't get in** | On iOS you **can only install the latest store version**; specific versions cannot be installed | Unless you give up the iOS audience, the server has to follow the latest version | [Protocol versions and version choice](/tutorials/bedrock/protocol) |
| Port check passes but players still can't connect | Client and server use **different protocol numbers** | Verify the protocol number (against the Minecraft Wiki version table) | [Protocol versions and version choice](/tutorials/bedrock/protocol) |

## 2. Ports and networking

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| The server is clearly running but nobody can join | **Bedrock uses UDP** | Open **UDP 19132** (19133 for IPv6); do it in **both** the security group and the OS firewall | [Mobile player support](/tutorials/java/mobile) |
| Console platforms (Xbox / PS / Switch) can't join | They **cannot join by entering an IP address** | They can only connect through a **custom DNS** or a **LAN** | [Mobile player support](/tutorials/java/mobile) |
| A tunnel is set up but connections fail | Most tunneling services only support TCP by default | Choose a tunneling option that supports **UDP** | [Deploying to a reachable environment](/tutorials/java/deploy) |

## 3. BDS

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| BDS **can't take plugins** | The official server **has no plugin system** | Use a community loader (LeviLamina / EndStone / BDSX) | [BDS server](/tutorials/bedrock/bds) |
| The loader is installed but the server won't start | **Loaders are tightly bound to a game version** | First confirm the server version is on the loader's supported list | [BDS server](/tutorials/bedrock/bds) |
| Bigger maps run worse | BDS **ticks mobs on a single thread** | Smoothness depends on **single-core performance**; move to a faster single-core machine or shrink the map | [BDS server](/tutorials/bedrock/bds) |
| Memory keeps creeping up | A known BDS issue (memory-leak-like) | **Do not force a memory cleanup** → it makes the progress bar **hang** while players download resource packs/Addons; only a server restart clears it | [BDS server](/tutorials/bedrock/bds) |
| Startup fails after renaming `bedrock_server.exe` | The path in the start script or panel was not updated | Restore the original name, or update the startup path to match | [BDS server](/tutorials/bedrock/bds) |

## 4. Choosing a core

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| Nukkit can't keep up with new versions | Upstream Nukkit is **no longer active** | Switch to **PowerNukkitX** (latest protocol support + multi-core optimization) | [Third-party cores](/tutorials/bedrock/third-party) |
| Lag as soon as more players join (PMMP) | PHP cores **bottleneck under high load** | Trim plugins, upgrade hardware, or switch to PowerNukkitX / BDS | [Third-party cores](/tutorials/bedrock/third-party) |
| Not sure which core to pick | — | Vanilla survival: **BDS**; performance plus customization: **PNX**; maximum plugins and you know PHP: **PMMP** | [Choosing a Bedrock core](/tutorials/bedrock/cores) |
| Multiple backend servers need one entry point | A **proxy** is required | Use **WaterDogPE** (the Bedrock counterpart of Velocity) | [Third-party cores](/tutorials/bedrock/third-party) |

## 5. Worlds and backups

| Symptom | Cause | Fix | Source |
| --- | --- | --- | --- |
| The world won't load after switching cores | Third-party cores are less compatible with official worlds | **Back up before upgrading or switching cores**; upgrade within the same core where possible | [Third-party cores](/tutorials/bedrock/third-party) |
| Backups are incomplete | Only some files were copied | All BDS world data lives in **`worlds/`** — back up the whole directory | [BDS server](/tutorials/bedrock/bds) |
| Backups are huge and keep piling up | No retention policy | Keep several daily plus several weekly backups, and delete old archives | [Backup and restore](/tutorials/java/backup) |
| Host disappears and all data is lost | Data lives on a single machine | **Download backups somewhere else on a regular basis** | [Backup and restore](/tutorials/java/backup) |

## 6. Players and operations

| Symptom | Fix | Source |
| --- | --- | --- |
| Many young players, many conflicts | Keep the rules short, gate entry with a whitelist/review, and have staff on duty during peak hours | [[BE] Operations and Management](/tutorials/ops/management-be) |
| Players don't know how to install the client (appx/apk) | Prepare **per-platform illustrated guides** in advance | [[BE] Operations and Management](/tutorials/ops/management-be) |
| Android players report heavy lag | Some versions stutter badly on Android and the community has never solved it | [Protocol versions and version choice](/tutorials/bedrock/protocol) |
| Players say shaders don't work | Since 1.18.30 the client ships **RenderDragon**, so classic shaders no longer work | [Protocol versions and version choice](/tutorials/bedrock/protocol) |

> Java Edition questions: see [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java); for a full core comparison see [Server core comparison](/wiki/compare#mcsog-h-Core%20comparison).
