---
title: Lag from Entity and Dropped-Item Accumulation
slug: entity-lag
cat: faq
level: 2
order: 4
minutes: 16
tags: [java, faq, lag, entity, item, hopper, performance, spark]
updated: 2026-10-04
draft: false
---

Your TPS has fallen from 20 to single digits, `/spark tps` reports MSPT well above 50 ms, yet CPU usage is unremarkable and memory is nowhere near full. Lag like this is rarely a hardware problem — it is almost always **entity and block-entity accumulation**.

Entity lag has two distinctive traits: it consumes **very little memory but a great deal of main-thread CPU**, and a restart buys you only a few minutes, because as long as the source keeps producing, the pile comes straight back. This article follows one order: why entities are expensive, dropped items, mobs, hoppers, how to investigate, and the misconceptions that waste your time.

:::note Scope
This article targets Java Edition servers (vanilla, Spigot, and the Paper family). Every configuration key is labelled with the file it lives in, but **structure and defaults change between cores and versions** — always read the file your server actually generated before you edit anything.
:::

## 1. Why entities are a performance killer

### 1.1 Everything queues on one thread

The main game logic of a Minecraft server is a **single-threaded tick loop**: 20 ticks per second, which gives each tick a budget of **50 ms** (the figure usually called MSPT). Every world, every entity, and every block entity has to finish its work on that one thread before the next tick starts.

```
1 second = 20 ticks, 50 ms per tick
MSPT 40 ms  -> TPS 20 (healthy)
MSPT 60 ms  -> TPS drops to about 16 (visible lag)
MSPT 200 ms -> TPS 5 (unplayable)
```

This is why entity counts matter so much: they spend that single thread's time budget directly. Extra CPU cores and extra heap will not help the main thread (see [Performance tuning](/tutorials/java/optimize)).

### 1.2 What an entity does every tick

A typical entity passes through some or all of the following each tick:

- **AI and goal selection**: goal selectors, pathfinding, sensor scans;
- **Physics and collision**: gravity, movement, collision checks against blocks and other entities;
- **Timers**: fire, potion effects, and the despawn countdown;
- **Merge checks**: dropped items and experience orbs look for nearby duplicates to merge with;
- **Tracking and synchronisation**: deciding which players need a position update.

Mobs dominate these categories, especially pathfinding and sensors. A single dropped item is far cheaper, but item counts reach the tens of thousands with ease — which is why "a few thousand items in one chunk" hurts more than "a few dozen zombies".

### 1.3 What ticks and what does not

| Category | Ticks every tick? | Notes |
| --- | --- | --- |
| Mobs and animals | Yes | The most expensive category: AI, pathfinding, sensors, collision |
| Dropped items (item entities) | Yes | Cheap individually, but accumulate in huge numbers; despawn timer plus merge checks |
| Experience orbs | Yes | Similar to items; cores usually offer options that limit merging |
| Projectiles (arrows, tridents, snowballs, fireballs, ender pearls) | Yes | Pure physics; `spigot.yml` exposes `arrow-despawn-rate` and `trident-despawn-rate` (Paper's documentation currently lists 1200) |
| Minecarts and boats | Yes | Entity plus collision plus passenger logic; hopper minecarts also move items |
| Item frames, paintings, leash knots and other hanging entities | Yes (low frequency) | `hanging-tick-frequency` in `spigot.yml` (the Spigot wiki records a default of 100) controls their update interval |
| Armour stands and markers | Yes | Both are entities; Paper's `paper-world-defaults.yml` exposes `entities.armor-stands.tick` and `entities.markers.tick` (both currently default to `true`), which can be disabled to save work |
| Mob spawners | Yes | A block entity that recalculates spawnable areas every tick |
| Hoppers | Yes | Block entity, the classic offender — see section 4 |
| Furnaces, blast furnaces, smokers | Only while burning | An idle furnace has no per-tick logic |
| Chests, barrels, shulker boxes | No (they do not tick) | Plain containers have no per-tick block-entity logic; cost appears only when opened or accessed by a hopper |
| Command blocks | No (only when triggered) | Idle command blocks do no work |

:::warn A container block is not a ticking block entity
The most common confusion: **container blocks such as chests and furnaces do not compute anything per tick**. What ticks is the **block entity** attached to the block, and only the ones that carry a ticker — hoppers, mob spawners, and lit furnaces. A chest stuffed with items is harmless; a long chain of idle hoppers is not.
:::

### 1.4 Loaded chunks and ticking chunks are different things

Entities are only processed in chunks that are **actually ticking**, and a loaded chunk is not necessarily ticking. Paper's `/paper chunkinfo` reports chunks in several categories (definitions from Paper's official command documentation):

| Type | Meaning |
| --- | --- |
| Entity Ticking | Fully ticked: entities, blocks and spawning all run |
| Block Ticking | Commonly called a lazy chunk: block logic runs, but entities do not tick |
| Full | Commonly called a border chunk: no ticking, but blocks and entities are accessible |
| Inactive | Not accessible; used for chunk generation |
| Total | The sum of the above |

That explains two things admins often find surprising:

- **Distant mobs are not necessarily costing you anything** — their chunk may only be Block Ticking or Full, so the entities are never ticked;
- **Loaded is not the same as computed** — `/paper holderinfo` reports chunks held in memory, which is a different number from the tick workload on the CPU.

:::note Dropped items do not load chunks by themselves
Strictly speaking, item entities do **not** keep chunks loaded. In vanilla, chunk loading is sustained by players, spawn chunks, portals, `/forceload`, and plugins. But as long as a chunk stays loaded for one of those reasons, the items inside it keep ticking and keep piling up.
:::

### 1.5 Entity activation range

To stop loaded-but-unattended entities from burning CPU for nothing, the Spigot family introduced the **entity activation range**: entities beyond that distance are **not unloaded — they simply tick less often**.

Paper's documentation for `entity-activation-range` in `spigot.yml` reads: the distance in blocks from a player at which entities tick normally; outside that range entities tick less frequently; set to 0 or less to disable activation-range throttling for that category, so loaded entities tick normally regardless of player distance.

Paper's documentation currently shows this structure (**defaults vary by version — confirm them in your own file**):

```yaml
# spigot.yml -> world-settings.default
entity-activation-range:
  animals: 32
  monsters: 32
  raiders: 64
  misc: 16
  water: 16
  villagers: 32
  flying-monsters: 32
  wake-up-inactive:
    animals-every: 1200
    animals-for: 100
    animals-max-per-tick: 4
    monsters-every: 400
    monsters-for: 100
    monsters-max-per-tick: 8
    villagers-every: 600
    villagers-for: 100
    villagers-max-per-tick: 4
    flying-monsters-every: 200
    flying-monsters-for: 100
    flying-monsters-max-per-tick: 8
  villagers-work-immunity-after: 100
  villagers-work-immunity-for: 20
  villagers-active-for-panic: true
  tick-inactive-villagers: true
  ignore-spectators: false
```

Two costs you must know about:

- If `tick-inactive-villagers` (currently `true` in Paper's documentation) is disabled, **villagers stop behaving like vanilla** and players have to stay nearby for trades to restock;
- `wake-up-inactive` decides how often "sleeping" entities are woken up. Being too stingy here visibly breaks machines and farms.

As [Technical Minecraft and redstone](/tutorials/java/redstone) explains, technical servers should treat this section as off limits — or run Fabric or Leaves instead.

## 2. Dropped-item accumulation

### 2.1 Common causes

- **Farms with no kill-and-collect loop**: the mob farm drops its output straight onto the ground;
- **Cactus, sugar cane and other auto-farms ejecting their produce**;
- **Players dumping items**: inventory clean-ups, death drops, moving house;
- **Duplication contraptions** such as TNT or sand dupers producing entities;
- **A broken hopper line**: the destination chest is full, a hopper is jammed, or a chunk unloaded mid-transport while production upstream continues;
- **`/give` abuse or command blocks looping item grants**;
- **Farms running unattended overnight**, in spawn chunks, `/forceload`ed chunks, or chunks force-loaded by a plugin.

### 2.2 Why it hurts

- **Cheap individually, terrifying in bulk**: a few thousand items in one chunk adds up to real MSPT;
- **Merging is far less eager than people assume**: vanilla items merge only when they are very close. Paper's `entities.behavior.only-merge-items-horizontally` (currently `false`) controls whether only items at the same height merge; setting it to `true` avoids some visual artefacts but **reduces merging**;
- **Every item ticks**: physics, the despawn countdown and merge checks all still run;
- **Hoppers have to scan them**: items lying above a hopper are one reason hoppers keep working (see section 4);
- **Nearby players vacuum them up**, adding inventory and network work;
- **Saves grow too**: entities are written into region files, so both save time and file size rise.

### 2.3 Diagnosis

Start with tools that **show you counts**, not with a hunch:

| Tool | What it gives you |
| --- | --- |
| `/paper entity list minecraft:item` | A Paper command that lists currently ticking entities, printing something like `Total Ticking: N, Total Non-Ticking: M` plus per-type `(ticking, non-ticking)` counts. Items appearing mostly on the non-ticking side means they sit outside the activation range and are throttled — still worth watching in bulk |
| `/spark tps` and `/spark health` | Decide whether there is a real problem, and whether it is TPS, memory, or disk |
| `/spark profiler start --timeout 60` | Sample, then read the share of `ItemEntity.tick` and `Entity.tick` in the call tree |
| `/spark tickmonitor --threshold-tick 100` | Report only ticks longer than 100 ms, useful while reproducing the problem live |
| `/paper chunkinfo` | Chunk type distribution per world: tells "too much loaded" apart from "too many entities" |
| `/forceload query` | Which chunks are force-loaded — farms there are the usual runaway case |
| `/debug start` and `/debug stop` | The vanilla sampler; writes a debug profile |

Full spark usage and how to read the viewer are covered in [Profiling with spark](/tutorials/ops/spark).

**`/kill @e[type=item]` is a blunt instrument.** Use it for emergencies only:

```bash
# Remove every dropped item in currently loaded chunks
/kill @e[type=item]

# Limit the radius: within 64 blocks of the executor
/kill @e[type=item,distance=..64]
```

:::warn Purging items cannot be undone
It deletes **every item on the ground indiscriminately**: what a player just dropped, what a farm is collecting, gear lost on death. There is no undo. **Never run it server-wide while players are online**, and never treat it as a solution — the ground will be covered again within the hour.
:::

**How do you find the one chunk holding thousands of entities?** A total entity count tells you that there is a lot, not where it is. Work through this order:

1. Use `/paper chunkinfo` first to rule out "too much chunk loading" as the cause;
2. Then sample with spark and compare hotspots across worlds and regions, or run `/spark tickmonitor --threshold-tick 100` while walking into the suspect area and watch for ticks that suddenly get longer;
3. Use `@e` selectors for range counting: stand at the suspect spot and run `/execute if entity @e[type=item,distance=..16]`, judging the order of magnitude from the command's success count (feedback formatting differs between versions, so trust what your server actually prints);
4. For continuous monitoring, use a plugin or panel tool that lists entity counts per chunk.

:::tip timings is a legacy story
Older Paper versions produced **timings** reports. Paper's documentation now groups `/tps` and `/mspt` under commands superseded by `/spark`, so **use spark whenever you can** — the reporting is consistent and far easier to compare.
:::

### 2.4 Fixes

**Step one is always design, not configuration.** Close the loop: kill chamber, water stream or hopper minecart collection, output straight into a chest. Produce stops landing on the ground.

**Step two is configuration and plugins.**

**Dropped-item lifetime.** The vanilla mechanic is that items despawn after roughly five minutes (6000 ticks). Most cores let you change that duration, and some let you set it per item type, but **the key name, its nesting and its default differ between cores and versions** — confirm them in the configuration file your server generated and in that core's official documentation.

**Scheduled cleanup plugins** (ClearLag and similar are common in the community). When choosing and configuring one, check:

- **Interval**: how often it purges (5 to 10 minutes is typical);
- **Targets**: items only, or experience orbs, projectiles and mobs as well (the latter cause far more collateral damage);
- **Warning**: a countdown before the purge so nobody loses what they were picking up;
- **Protections**: skip custom-named items, skip player death drops, skip specific worlds or regions — collection areas in particular must be excluded;
- **Compatibility**: confirm the plugin supports your core and game version (see [Introduction to plugins](/tutorials/java/plugins)).

**Merge radius.** `merge-radius` is a real key in the Spigot and Paper families, living under world settings in `spigot.yml`, with separate entries for items and experience orbs. Paper's documentation currently shows:

```yaml
# spigot.yml -> world-settings.default
merge-radius:
  item: 0.5
  exp: -1
```

Note that **two authoritative sources disagree here**: the Spigot wiki records item 2.5 and exp 3.0 for the same keys and describes them as the range in blocks at which items and orbs group together on the ground, while Paper's documentation describes exp merging as happening at spawn time, a behaviour vanilla does not have, disabled by 0 or less.

:::tip Conflicting defaults are exactly why you check your own file
The same key having different defaults across cores and versions is normal in this area. **Raising the merge radius** makes items stack up sooner and cuts entity counts, at the price of **changing vanilla behaviour** and possibly breaking machines that rely on item separation — technical players should be careful. Related keys include Paper's `entities.behavior.experience-merge-max-value` (currently `-1`, meaning no cap on merged orb value).
:::

**A safety net for saves.** Paper's `chunks.entity-per-chunk-save-limit` limits how many entities of a given type are **saved and loaded** per chunk (Paper's documentation shows `experience_orb: -1` for no limit, configurable per `<entity-type>`). It constrains saving and loading rather than deleting anything on the spot, which makes it a decent backstop for "experience orbs everywhere".

**Stop farms running unattended.** Do not overuse `/forceload`. Paper's `unsupported-settings.disable-world-ticking-when-empty` (currently `false`, and officially marked unsupported) can stop a world from ticking when it has no players and no force-loaded chunks — **verify the behaviour for your version before relying on it**.

## 3. Mob accumulation

### 3.1 Common causes

- **Spawners left running**, especially without a kill or collection loop;
- **Unlit caves and night spawning**: the underground around your player base fills up;
- **Unlimited breeding**: pens packed with cows, sheep, pigs and chickens;
- **Pets everywhere**: tamed wolves, cats and horses scattered across the map;
- **Villager breeding halls**: past a hundred villagers, POI lookups and pathfinding become visible in profiles;
- **Raids and wandering traders that never resolve**, plus their llamas;
- **Entity-heavy redstone contraptions**: minecart arrays, armour stands, item chains;
- **Portal-spawned zombified piglins**: Paper offers `nerf-pigmen-from-nether-portals` (currently `false`) to switch that behaviour off.

### 3.2 Diagnosis

- **spark profiler**: hotspots usually appear in `Entity.tick`, pathfinding methods, sensor scans and villager POI lookups;
- **`/spark health`**: tells you which of TPS, CPU, memory or disk is actually in trouble;
- **`/paper entity list`**: the distribution across entity types, which exposes the outliers;
- **`/paper mobcaps`**: the global mob caps and actual occupancy for a world, plus how many chunks can spawn mobs;
- **`/paper playermobcaps`**: the per-player local mob caps;
- **`/paper chunkinfo`**: correlate entity counts with chunk loading, to tell whether a force-loaded chunk is spawning everything.

### 3.3 Fixes

**(1) Entity activation range.** See section 1.5. This is the most effective lever and also the one most likely to break machines: back up the configuration first, and re-test your farms afterwards.

**(2) Mob spawn range.** `mob-spawn-range` is measured in chunks and controls how far from a player mobs may spawn. Paper's documentation currently lists `8`; the Spigot wiki records `6`. **Another default that moves between versions** — confirm it locally. Lowering it reduces the total mob population but can make some farms less productive.

**(3) Per-world spawn limits.** `spawn-limits` in `bukkit.yml`; Paper's documentation currently lists these defaults:

```yaml
# bukkit.yml
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
```

Paper also allows overriding the same limits per world in `paper-world-defaults.yml` (`entities.spawning.spawn-limits`, currently all `-1`, meaning "use the value from `bukkit.yml`"). Separately, `entities.spawning.per-player-mob-spawns` (currently `true`) decides whether the mob cap is calculated per player or shared globally.

**(4) Game rules.** Built into vanilla, and the fastest lever available.

```bash
# Turn off natural spawning (vanilla default: true) - this also disables mob farms
/gamerule doMobSpawning false

# Turn off mob loot (vanilla default: true)
/gamerule doMobLoot false

# Random tick speed, vanilla default 3; lowering it also slows crop growth, fire spread and ice/snow formation
/gamerule randomTickSpeed 3
```

:::warn Game rules are a blunt axe
Once `doMobSpawning` or `doMobLoot` is off, **every piece of gameplay that depends on it stops working too** — mob farms, experience farms, wither skeleton skull collection and more. This suits event servers or emergency triage, not a permanent optimisation.
:::

**(5) Spawner controls.**

```yaml
# spigot.yml -> world-settings.default
nerf-spawner-mobs: false
```

Paper's documentation describes `nerf-spawner-mobs` as disabling most AI for spawner-spawned mobs (currently `false`). Setting it to `true` saves real AI work, but spawner output behaves noticeably differently. Paper additionally exposes `tick-rates.mob-spawner` (currently `1`), which controls how often spawners recalculate spawnable areas and spawn entities.

**(6) Spawner management plugins.** Many plugins can limit a spawner's activation distance, its spawns per minute, or require a player nearby. As always, verify core and version compatibility, and prefer options that are reversible and support whitelists.

**(7) Farm design.** A kill chamber, a collection loop, and timely despawning beat any configuration change. If produce never reaches the ground, entity counts cannot run away.

**(8) Decorative entities.** Armour stands and markers are entities. Paper's `entities.armor-stands.tick` (currently `true`; the documentation says disabling it prevents armour stands from ticking and can improve performance when there are many of them) and `entities.markers.tick` (currently `true`; the documentation warns it may affect their behaviour as passengers of other entities) can be disabled as needed.

**(9) Forced despawning.** Paper's `entities.spawning.despawn-time.<entity-type>` (currently `disabled`) can force a despawn time for a specific entity type, and `entities.spawning.despawn-ranges` controls the random despawn distances (default `default`, meaning vanilla rules). Both change vanilla behaviour — think before you touch them.

## 4. Block entities and hoppers

### 4.1 Why hoppers are the classic offender

A hopper is a **block entity**, and whenever its chunk ticks, it has work to do every tick:

- checking for items above it to suck in, and for a container above it to pull from;
- moving items on a cooldown (8 ticks in vanilla, matching `ticks-per.hopper-transfer` in `spigot.yml`);
- generating extra work whenever a container is accessed, and more still when plugins listen for the move event (InventoryMoveItemEvent).

Paper's documentation describes the relevant `spigot.yml` keys as:

- `ticks-per.hopper-transfer` (currently `8`): ticks between hopper item movements;
- `ticks-per.hopper-check` (currently `1`): ticks between checks to pull items;
- `hopper-amount` (currently `1`): how many items a hopper moves at a time, capped at the stack size;
- `hopper-can-load-chunks` (currently `false`): a switch relating to whether hoppers load chunks; confirm its exact semantics and default in the official documentation and your own file.

The Spigot wiki adds an important warning: raising `hopper-check` **breaks most hopper contraptions through desynchronisation**. In other words, this class of "optimisation" is almost guaranteed to break technical play.

```yaml
# spigot.yml -> world-settings.default
ticks-per:
  hopper-transfer: 8
  hopper-check: 1
hopper-amount: 1
```

### 4.2 Reducing hopper cost

| Approach | Description | Trade-off |
| --- | --- | --- |
| Replace long hopper chains with water or ice streams | Items flow along the stream; only the endpoint needs a hopper | Requires redesigning the logistics |
| Funnel droppers into a single hopper line | Avoids "one hopper per chest" duplication | Needs redstone control |
| Remove idle hoppers | Abandoned machines and dead logistics lines still tick | None |
| Hopper minecarts | One entity replaces a whole hopper line for long distances | The minecart is itself an entity |
| Enable the core's hopper optimisations | For example Paper's `hopper` section | May affect plugins that rely on move events |
| Let full hoppers idle | Paper's `hopper.cooldown-when-full` (currently `true`) | None; it is on by default |

Paper's `paper-world-defaults.yml` has a dedicated hopper section:

```yaml
# paper-world-defaults.yml
hopper:
  cooldown-when-full: true
  disable-move-event: false
  ignore-occluding-blocks: false
```

- `cooldown-when-full`: Paper's documentation describes it as applying a short cooldown when a hopper is full instead of constantly trying to pull new items;
- `disable-move-event`: skips the move event to save work, but **plugins depending on that event stop working**;
- `ignore-occluding-blocks`: skips checks related to occluding blocks.

:::note Structure and defaults change between versions
The shape of this section has changed across Paper releases (for example, `cooldown-when-full` was once a node with `enabled` and `movement-ticks` children). **Confirm against the `paper-world-defaults.yml` your server generated and Paper's official documentation.**
:::

### 4.3 Two related settings worth knowing

Paper's `tick-rates.container-update` (currently `1`) controls how often the server updates containers and inventories. Paper's documentation explicitly warns that **values above 1 cause item desynchronisation and ghosting, can make block-breaking progress appear to reset, and can create visual artefacts that look like server lag even when there is none**. This is not an optimisation worth making.

Paper's `unsupported-settings.ticking.block-entities` and `ticking.chunks` (currently both `true`, and officially marked unsupported) can disable block-entity or chunk ticking wholesale. **Do not touch them on a production server** — that switches off game logic itself.

## 5. A practical investigation workflow

The order for entity lag is the same as for any performance problem: **measure first, locate second, change things last**.

### 5.1 Seven steps

1. **Measure.** Use `/spark tps` for TPS and MSPT and `/spark health` to see whether CPU, memory or disk is the constraint. Confirm that the main thread really is saturated before going further.
2. **Find the hotspot.** Run `/spark profiler start --timeout 60`, then read the call tree: `Entity.tick`, `ItemEntity.tick`, block-entity ticking, pathfinding and sensor methods. The widest branch is your prime suspect. Reading the viewer is covered in [Profiling with spark](/tutorials/ops/spark).
3. **Locate the chunk and the type.** `/paper entity list` gives the type distribution, `/paper chunkinfo` the chunk type distribution, and `/forceload query` the force-loaded chunks.
4. **Classify the problem.** Is this a **design** problem (a farm with no collection loop, machines nobody maintains) or a **configuration** problem (spawn range, activation range set too generously)? Nine times out of ten it is design.
5. **Fix the design first.** Add a kill chamber, add collection, dismantle dead machines, stop running farms unattended overnight. Then measure again.
6. **Then tune configuration.** Only if the design fix is not enough should you touch entity settings in `spigot.yml`, `bukkit.yml` or `paper-world-defaults.yml`. **Change one thing at a time**, and back up first (see [Configuring the server](/tutorials/java/config)).
7. **Re-measure and write it down.** Re-test the same scenario immediately (same machine, same time of day, same player count) to prove MSPT actually fell, and record what you changed, why, and what happened. **An unverified optimisation is not an optimisation.**

### 5.2 Quick reference

| Symptom | Likely cause | Check first | Action |
| --- | --- | --- | --- |
| Items all over the ground, TPS sliding | Farm with no collection loop, broken hopper line, players dumping items | `/paper entity list minecraft:item`, spark call tree | Fix the farm design; keep a cleanup plugin as a backstop |
| Lags only when you approach one area, fine once you leave | That chunk holds many entities or dense machinery | `/paper chunkinfo`, `/forceload query`, spark comparison per world or region | Rebuild or remove the machine; drop unnecessary force-loads |
| Lag starts after night falls or underground | Unlit areas spawning mobs | `/paper entity list`, `/paper mobcaps` | Light up caves; tighten `mob-spawn-range`; `doMobSpawning` if necessary |
| Lag near a villager hall | Large villager population, POI lookups and pathfinding | Villager-related hotspots in spark, `/paper entity list minecraft:villager` | Limit breeding; `tick-inactive-villagers` only if you accept the vanilla behaviour change |
| Lags even with all machines idle | Hoppers, spawners, armour stands and other block entities or entities idling | Share of block-entity and entity ticking in spark | Dismantle idle machines; enable core hopper optimisations; disable armour stand ticking |
| Restart helps briefly, then it returns | The source was never addressed | How long recovery takes, plus the checks above | Go back to steps 1 to 5; fix the source instead of restarting |
| Lots of memory, still lagging | The bottleneck is main-thread CPU, not the heap | CPU and MSPT in `/spark health` | Work through this article; see [Performance tuning](/tutorials/java/optimize) |
| Cleanup plugin installed, still lagging | Wrong targets or interval, or the hotspot is not items at all | spark call tree | Confirm the hotspot before keeping the plugin |

For a symptom-first index of Java Edition problems in general, see [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java).

## 6. Misconceptions

**Misconception 1: restarting fixes it.**
A restart only reloads the world, so things feel smooth for a while. As long as the mob farm keeps dumping items, the hopper line stays broken and the force-loaded chunks stay loaded, the pile returns at the same rate. Restarting is **triage, not a fix**.

**Misconception 2: more heap (`-Xmx`) cures entity lag.**
Entity lag is a **main-thread CPU** problem, not a heap problem. More memory does not add a second tick thread, and an oversized `-Xmx` actually lengthens GC pauses. Find the hotspot instead.

**Misconception 3: the tighter the entity limits, the better.**
Aggressively shrinking activation ranges, spawn ranges and merge radii **breaks farms and technical machines outright**: villagers stop restocking, mob farms stop producing, and devices that depend on item separation misbehave. Technical servers should read [Technical Minecraft and redstone](/tutorials/java/redstone) first and consider Fabric or Leaves, rather than mangling Paper-family behaviour beyond recognition.

**Misconception 4: `/kill @e` is a cure-all.**
It removes tamed pets, geared armour stands and produce mid-collection along with everything else, and it **cannot be undone**. `/kill @e[type=item]` is gentler but still destroys legitimate items that players and farms have on the ground. Before running either, ask whose property is in that entity list.

**Misconception 5: a high entity count means lag.**
Counts only matter together with type and location. Ten thousand items stacked in one chunk next to a player is a disaster; ten thousand items spread across a hundred Block Ticking chunks may cost almost nothing. **Look at the tick hotspot first, the raw count second.**

**Misconception 6: a pile of "optimisation plugins" will solve it.**
Most such plugins are wrappers around the settings above, or a scheduled purge. **Without fixing the source, cleanup only turns continuous lag into periodic lag.** Plugin and core compatibility matters too — a poor plugin can itself be the hotspot.

**Misconception 7: optimise once and you are done.**
Servers are alive: new machines, new farms and new players all change the load. Tracking a couple of key numbers (TPS/MSPT and the order of magnitude of entity counts) as part of routine maintenance beats a one-off tuning session.

---

> Configuration key names and defaults vary by core and version. Always defer to the configuration file your server generated and the official documentation.
