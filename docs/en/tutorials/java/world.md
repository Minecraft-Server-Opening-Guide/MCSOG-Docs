---
title: World Management
slug: world
cat: java
level: 3
order: 23
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, world-management, worldedit, fawe, worldguard, multiverse]
updated: 2026-10-04
draft: false
---

A server's "worlds" are not just the `world` folder sitting in the server directory. The moment you want to reshape terrain, protect an area, or run a lobby and a resource world side by side, you are in the territory of **world management** plugins. They tend to be installed together, and they tend to break together.

## 1. What World Management Covers

| Need | Typical plugin | In one line |
| --- | --- | --- |
| Editing terrain and builds | WorldEdit / FastAsyncWorldEdit | Batch-edit blocks and copy-paste builds with a selection tool |
| Protecting regions and setting world rules | WorldGuard | Restrict who may change what, where |
| Running several worlds at once | Multiverse-Core | Create, delete and import worlds; manage travel between them |

The three interlock: WorldGuard depends on WorldEdit (or FAWE), and WorldEdit's selection commands are the basis for defining protected regions. You normally install them as a set rather than picking one.

## 2. WorldEdit Basics

WorldEdit is the tool people mean by "the world editor" or "the wooden axe", and it is the starting point for almost all building and administrative work. Its core idea is just two steps: **select first, then act**.

### Selecting

```
//wand              get the selection tool (a wooden axe by default)
//pos1  //pos2      set your current position as the first / second corner
//hpos1 //hpos2     set the block you are looking at as a corner
//expand 10 up      grow the selection a number of blocks in a direction
//size              show the selection's dimensions and block count
//limit 100000      cap how many blocks you may change in one operation
```

Left-clicking a block sets the first corner and right-clicking sets the second, which is the everyday method; `//pos1` and `//pos2` are for standing exactly where you want the corner.

### Everyday editing commands

```
//set stone                 replace everything in the selection with stone
//replace dirt grass        replace only dirt in the selection with grass blocks
//walls stone               fill just the four walls of the selection (handy for walls)
//copy  //paste             copy the selection / paste it at your position
//undo  //redo              undo / redo
```

### Saving and pasting builds (schematics)

```
//schem save <name>         save the current selection to a file
//schem load <name>         load a saved file
//paste                     paste it at your position
```

Files normally land in `plugins/WorldEdit/schematics/`, or `plugins/FastAsyncWorldEdit/schematics/` under FAWE. Note that the command spelling changes with versions: 7.x uses `//schem`, while older releases use `//schematic`.

:::tip Run //size before you commit
`//size` tells you exactly how many blocks the selection contains. Making a habit of checking before executing prevents the overwhelming majority of "I accidentally turned the whole map into stone" incidents.
:::

## 3. Why WorldEdit Can Lag the Server

Vanilla WorldEdit applies block changes **on the main thread**. That means the server has almost nothing left over while a single `//set` runs:

- even a modest selection is hundreds of thousands of blocks, and every one of them triggers light recalculation, block updates and chunk marking;
- the main thread stays saturated for a long time, so every player lags and disconnects, and in bad cases the watchdog kills the server outright;
- memory and CPU pressure spike at the same time, and the larger the view distance and the player count, the worse it gets;
- the most common trigger is **executing before confirming the selection**, or dragging the selection across an entire map.

Practical safeguards:

- use `//limit` to cap the blocks you may change in one operation;
- run `//size` before every operation to confirm the scale;
- split large jobs into several smaller operations;
- grant WorldEdit permissions on an as-needed basis rather than opening them up by default;
- switch to FAWE for genuinely large-scale work.

## 4. FastAsyncWorldEdit (FAWE)

**FastAsyncWorldEdit is the asynchronous, optimised version of WorldEdit.** It moves block changes off the main thread onto async threads and processes them in batches, so the server is not held up for long stretches.

- It implements the WorldEdit API, so it **can normally replace WorldEdit directly**: swap WorldEdit for FAWE and plugins that depend on WorldEdit generally keep working.
- It has its own configuration, including limits on how many blocks a single player may change at once, which makes it far better suited to letting players use it.

**When to use FAWE**

- large terrain reshaping and bulk schematic pasting;
- several administrators building at the same time;
- servers with enough players that they cannot afford a saturated main thread.

**When vanilla WorldEdit is enough**

- you only make small, occasional edits;
- a plugin you depend on has a compatibility problem with FAWE.

:::note Not an either/or install
FAWE and WorldEdit occupy the same slot, so do not install both. Installing FAWE gives you WorldEdit's capabilities, and WorldGuard will recognise it normally.
:::

## 5. WorldGuard: Protecting Regions

WorldGuard is the administrative region protection plugin, and it **requires WorldEdit or FastAsyncWorldEdit as a dependency**. Everything it offers is disabled by default, so you enable only what you need.

It does two main things.

**Region protection**

- stop players from placing and breaking blocks inside a given region;
- allow only specific people to build in a region;
- disable PvP, TNT, mob damage and similar inside a region.

**World rule tuning**

- prevent block damage from creepers and withers, plus fall damage and similar;
- turn off fire spread, lava ignition, ice formation, endermen picking up blocks and other mechanics;
- blacklist items or blocks, or warn administrators when they are used;
- close off item-duplication exploits that abuse game mechanics;
- provide handy commands such as one that immediately halts all fire spread.

The classic use is one region each for the spawn, the shop district and the event arena, plus a separate rule set for the resource world. For how region protection differs from player claim plugins, see [Land Claims and Protection](/tutorials/java/protection).

## 6. Multiverse: Running Several Worlds at Once

Multiverse-Core is a well-known, long-established multi-world plugin used to **create, delete and import worlds (dimensions)**. A common split is one lobby, one survival overworld, one renewable resource world and one creative world.

The core plugin only manages worlds; the gameplay around them comes from its add-ons:

| Add-on | What it does |
| --- | --- |
| **Multiverse-NetherPortals** | Lets player-built nether portals lead to a chosen world |
| **Multiverse-Portals** | Creates portals that teleport to a chosen destination |
| **Multiverse-Inventories** | Separates player inventories per world |
| **Multiverse-SignPortals** | Turns signs into teleport points |

A few practical details:

- **Suppressing the default worlds**: the overworld cannot be disabled; the nether can be turned off by setting `allow-nether` to `false` in `server.properties`, and the end by setting `settings.allow-end` to `false` in `bukkit.yml`. People do this when the server only serves as a lobby or a minigame host and does not need the extra dimensions.
- **World name format decides portal ownership**: `plugins/Multiverse-Core/config.yml` contains `world-name-format`, which by default names the nether and the end `%overworld%_nether` and `%overworld%_the_end`. Change that format, or create worlds whose names do not match it, and the nether and end portals linking those worlds to the overworld are severed: the portals can still be lit, but they will not carry you anywhere.
- **Where to download**: the builds on GitHub are newer than what SpigotMC offers, so check GitHub and Hangar if you want recent features.
- **Crash vulnerability**: early versions could be crashed by special characters triggering a `PatternSyntaxException`. **Multiverse-Core 4.3.1 fixes this**, so run the latest version. If you genuinely cannot upgrade, the community published patches for it.

## 7. Common Multi-World Pitfalls

| Pitfall | Symptom | What to do |
| --- | --- | --- |
| Inventories and gamemodes | Inventory, experience and gamemode follow the player between worlds, or you wanted them separated and they are not | Use **Multiverse-Inventories** to separate inventories per world; set each world's gamemode in that world's own configuration |
| Portals linking wrongly | A portal built in the nether sends players to another world | Use **Multiverse-NetherPortals** to pin the destination world, and check `world-name-format` |
| Non-ASCII world names | World names render as garbled text in commands and messages | Keep world names in English; for a Chinese display name set an `alias` in `worlds.yml` |
| Too many worlds | Memory and disk usage climb and startup slows down | Keep only the worlds you actually need; back up unused ones and remove them rather than leaving them mounted |
| Special characters | Certain input crashes the server outright | Upgrade past 4.3.1 |
| Wrong spawn | New players first land somewhere odd | Set the spawn point per world instead of relying on the overworld's |
| World permissions | Players wander into worlds they should not enter | Gate each world behind permission nodes, especially creative and event worlds |

:::warn An alias is not a rename
`alias` only changes what plugins display; the world folder name and the name used in commands stay in English. Change the alias if you want a localised display name. Renaming the world itself will leave existing saved data unable to find its world.
:::

## 8. A Recommended Set

| Need | Choice |
| --- | --- |
| Small-scale terrain and build editing | WorldEdit |
| Large jobs and bulk pasting | FastAsyncWorldEdit (replacing WorldEdit) |
| Protecting the spawn, shops and event arenas | WorldGuard (optionally WorldGuard Extra Flags for more flags) |
| Lobby / resource world / creative world | Multiverse-Core, with add-ons as needed |
| Investigating and rolling back incidents | A logging plugin such as CoreProtect |

Once installed, do three things first: put the spawn inside a WorldGuard region, settle the rules for the resource world, and confirm that your inventory and gamemode policy per world is what you actually intend. Skip those three and multiple worlds simply multiply your problems.

## Next Step

Once the world has changed and the terrain has moved, think about preserving the result: see [Backup and Recovery](/tutorials/java/backup). For the basics of installing and configuring plugins themselves, see [Plugin Basics](/tutorials/java/plugins).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
