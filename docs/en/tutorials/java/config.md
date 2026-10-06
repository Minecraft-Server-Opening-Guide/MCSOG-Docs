---
title: Configuring the Server
slug: config
cat: java
level: 1
order: 7
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, configuration, server.properties, online-mode, view-distance, gamerule]
updated: 2026-10-04
draft: false
---

After the server starts for the first time, `server.properties` is generated in the root directory. **Changes only take effect after you restart the server** (it is not hot-reloaded).

Open it in a text editor; the options below are the ones people change most often.

## 1. The Most Commonly Changed Options

| Option | Default | Description |
| --- | --- | --- |
| `server-port` | `25565` | The port the server listens on; if you change it, update the firewall and security group to match |
| `online-mode` | `true` | **Premium account verification.** While `true`, cracked clients cannot join; set it to `false` for offline mode |
| `max-players` | `20` | Maximum number of players online at once |
| `motd` | — | The line shown in the server list (supports color codes) |
| `difficulty` | `easy` | `peaceful`/`easy`/`normal`/`hard` (`0`–`3` are also accepted) |
| `gamemode` | `survival` | Default mode for new players: `survival`/`creative`/`adventure`/`spectator` |
| `force-gamemode` | `false` | When `true`, players are forced back to the default mode every time they join |
| `pvp` | `true` | Whether players may attack each other |
| `allow-flight` | `false` | Whether flight is allowed in survival (enable it if you run a flight plugin) |
| `spawn-protection` | `16` | Spawn protection radius; only OPs may break or place blocks inside it. `0` disables it |
| `allow-nether` | `true` | Whether players may travel to the Nether (`false` disables the Nether) |
| `generate-structures` | `true` | Whether new chunks generate structures such as villages |
| `level-seed` | Empty | World seed; leave it empty for a random one |
| `enable-command-block` | `false` | Whether command blocks are enabled; **generally not recommended** (see below) |
| `white-list` | `false` | Whether the whitelist is enabled |
| `view-distance` | `10` | **View distance**; one of the options with the largest performance impact |
| `simulation-distance` | `10` | **Simulation distance**; how far away entities and redstone keep ticking |

### About View Distance and Simulation Distance

These two are **the knobs with the biggest performance cost**, and they pay off faster than switching cores:

- `view-distance` decides how far players can "see". Lowering it saves noticeable bandwidth and CPU, but distant terrain turns foggy.
- `simulation-distance` decides how far chunks keep **actually ticking** (mob spawning, redstone, crop growth). Lowering it saves more than lowering view distance does, and it does not affect what you see.

:::tip Tune these two first, before upgrading hardware
Many cases of "the server is laggy" are eased noticeably just by dropping `simulation-distance` from 10 to 6.
:::

### About Command Blocks

`enable-command-block` is off by default and **is not recommended in most cases**: command blocks are implemented inefficiently on the server, and almost everything they do can be achieved more efficiently with plugins (which also give you permission control and auditing). Turn it on only when you genuinely need vanilla command block gameplay.

## 2. Online Mode and Offline Mode

- `online-mode=true` (default): accounts are verified with Mojang, so cracked clients cannot get in.
- `online-mode=false`: anyone can join, but **anyone can impersonate any ID**, and premium skins and UUID binding stop working.

If you must use offline mode for a specific reason, you will usually also need a skin plugin such as `SkinsRestorer` to bring skin display back.

:::warn The cost of offline mode
In offline mode an account has no protection at all: a ban can be bypassed by switching to another ID, and administrator rights are far easier to impersonate. **Do not disable online mode on a public server.**
:::

## 3. Game Rules (gamerule)

Settings such as difficulty and spawn protection are changed in `server.properties`, but **game rules are changed with commands**:

```
/gamerule keepInventory true         Keep items on death
/gamerule doDaylightCycle false      Disable the day/night cycle
/gamerule mobGriefing false          Creepers do not damage blocks
/gamerule announceAdvancements false Do not announce advancement completion
```

Run them from the console or in game (OP required); they **take effect immediately and are saved**.

## 4. General Practice for Changing Configuration

1. **Stop the server first**, then edit `server.properties` (this matters especially for world-related settings, so you avoid write conflicts with the save).
2. **Keep a backup of the original file** so you can restore it immediately if something goes wrong.
3. After restarting, check `logs/latest.log` to confirm there are no configuration errors.
4. Plugin configuration lives under `plugins/<plugin-name>/config.yml`, and most plugins support hot reloading with `/<plugin-name> reload` — but **the server's own configuration does not**.

## Next Step

Once configuration is done, deploy the server somewhere other people can reach it: see [Deploying to a Public Environment](/tutorials/java/deploy).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
