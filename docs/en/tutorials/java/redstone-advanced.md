---
title: "Advanced Technical Minecraft and Redstone: Farms, Settings and Server Design"
slug: redstone-advanced
cat: java
level: 3
order: 27
minutes: 18
tags: [java, technical-minecraft, redstone, mob-farms, chunk-loading, server-config, performance]
updated: 2026-10-04
draft: false
---

This is the advanced companion to [Technical Minecraft and Redstone](/tutorials/java/redstone). The introductory article answers "which core should I pick"; this one answers three more practical questions: **what technical players actually build, which server settings those machines depend on, and what a server owner must prepare in advance.**

The boundary of this article first: it **hands out no schematics and guarantees no specific design on your version**. The most basic fact of technical Minecraft is that **a machine's usability is bound to a specific game version and a specific server implementation**. Any claim that "this machine works forever" is not trustworthy.

## 1. What Technical Players Actually Build

What technical players call a "farm" is an **automated or semi-automated resource line**: it trades game mechanics for output instead of manual mining. Start with a map of the categories, then talk about load.

| Category | Mechanism | Main load | Version sensitivity |
| --- | --- | --- | --- |
| Mob farms / drop farms | Natural spawning or a monster spawner, with mobs concentrated and killed | Entity count, AI pathfinding, drops and XP orbs, permanently loaded chunks | Medium: spawning rules, mob AI and hitbox changes all affect throughput |
| Item farms | Output from block behaviour itself (sugar cane, bamboo, cactus, kelp, honey, wool) | Block updates, random ticks, hopper and minecart collection | Medium-low, but the collection end is itself a cost |
| Iron farms | Villagers plus a scaring mechanic (or a raid mechanic) trigger iron golem spawning | Villager AI, point-of-interest lookups, entity spawning, permanently loaded chunks | High: the spawning conditions for villagers and iron golems have been reworked repeatedly |
| Gold farms | A Nether portal spawns zombified piglins (renamed from "zombie pigmen" in 1.16), which are then killed | Portal block entities, entity count, permanently loaded Nether chunks | High: entity naming, AI and portal mechanics have all changed |
| Villager trading halls | Many villagers with workstations, rerolling trades until the wanted ones appear, then locking them | Villager AI, POI lookups, pathfinding, permanently loaded chunks | Medium-high: trading and profession mechanics have been adjusted several times |
| Raid farms | Trigger a raid and process the waves for emeralds, totems of undying and more | Entities spawned in waves, AI, drops | High |
| Wither skeleton farms | Spawning inside a Nether fortress, with snow golems or wither roses finishing the kill | Loaded fortress chunks, entities, drops | Medium-high |
| Tree farms / food farms | Automatic planting and harvesting (pistons or TNT), plus crop farms | Random ticks, block updates, TNT entities, drops | Medium |
| TNT duplication and other mechanic-based farms | Duplication behaviour for TNT and similar resources; edge behaviour of pistons, gravity blocks and portals | TNT entities and explosions, block updates in bulk, easily crushes TPS outright | Extreme: these behaviours are patched and rediscovered repeatedly, and many servers ban them outright |

Classifying by **load** rather than by **output** matters because **the output belongs to the player, while the cost belongs to the server**. Each category in turn:

### 1.1 Mob farms and drop farms

- **Mechanism**: either mobs spawn naturally in a dark area and are then concentrated, or a monster spawner produces them continuously. Concentration usually means water streams, piston pushing, or routing mobs into another dimension.
- **Load**: mobs are entities that think; every tick they run AI, pathfinding and collision checks. Drops and XP orbs keep consuming entity budget afterwards.
- **For the owner**: this is the category most likely to drag a server down, because it spends entity, AI, chunk and drop budget all at once.

### 1.2 Item farms

- **Mechanism**: no mobs involved; block behaviour produces the items, such as sugar cane, bamboo, cactus, kelp, honey and wool.
- **Load**: mostly block updates and random ticks. Output has to be collected with hoppers or minecarts, and **the collection end is often more expensive than the production end**.
- **For the owner**: lowering `randomTickSpeed` slows these farms directly; raising the hopper transfer interval (`hopper-transfer`) slows every collection system down.

### 1.3 Iron farms

- **Mechanism**: villager and "scaring" conditions trigger iron golem spawning; there are also raid-based variants.
- **Load**: villager AI and workstation lookups are famously expensive, and the chunks must stay loaded.
- **Version note**: iron golem spawning conditions and villager work and sleep checks have changed several times. **These machines must be re-verified after almost every major update.**

### 1.4 Gold farms

- **Mechanism**: a Nether portal spawns zombified piglins (renamed from zombie pigmen in 1.16), which are concentrated and killed.
- **Load**: portal block entities, large entity counts and drops, plus permanently loaded Nether chunks.
- **Version note**: the entity rename, AI adjustments and portal mechanic changes all affect how the farm produces.

### 1.5 Villager trading halls

- **Mechanism**: many villagers held in one place with workstations, rerolling trades until a good one appears, then locking it in.
- **Load**: villagers are among the heaviest common entities on a server: pathfinding, POI lookups and per-tick behaviour all cost CPU.
- **For the owner**: trading halls are often wired to an iron farm or a breeder, forming a small high-load district. Optimisation switches such as `tick-inactive-villagers` change villager behaviour directly.

### 1.6 Raid farms

- **Mechanism**: trigger a raid deliberately and process wave after wave of raiders for emeralds, totems of undying and similar.
- **Load**: wave spawning creates a burst of entities, so this is **spiky** load that shows up as MSPT peaks rather than a smooth rise.
- **Version note**: raid triggering conditions, wave composition and loot tables have all changed.

### 1.7 Wither skeleton farms

- **Mechanism**: spawn inside Nether fortress bounds, then kill and collect automatically.
- **Load**: the fortress chunks must stay loaded, and entities and drops persist.
- **For the owner**: fortress bounds are limited, so several players building farms there compete for the same spawning budget.

### 1.8 Tree farms and food farms

- **Mechanism**: automatic planting and harvesting (pistons or TNT), plus wheat, carrot and potato farms.
- **Load**: random ticks, block updates, TNT entities and explosions.
- **For the owner**: the explosions in TNT-based tree farms generate large numbers of block updates and are a common source of **localised** stutter.

### 1.9 TNT duplication and other mechanic-based farms

- **Mechanism**: duplication behaviour for TNT and similarly expensive resources, or edge behaviour of pistons, gravity blocks and portals.
- **Load**: TNT entities, explosions and bulk block updates; a large duplication setup alone can push TPS into single digits.
- **For the owner**: these behaviours are **patched by the developers and rediscovered repeatedly**, so the exact behaviour is entirely version-bound. **Many servers ban them outright**, because they are both a performance problem and a fairness problem. Whether you allow them must be written into your rules explicitly.

:::warn Do not assume a design is universal
The same machine can stop working entirely on a different game version, for reasons ranging from spawning rules and entity AI to block update order, a duplication behaviour that was patched out, or a hitbox that moved by 0.1 of a block. Therefore:

- When a player says "this machine works", ask for the **game version** and the **server core** first.
- When an owner says "we are updating to a new version", that is an announcement that **every machine has to be re-verified**.
- Any tutorial, including this one, offers **approaches**, never **guarantees**.
:::

## 2. What a Machine Costs Your Server

Break a machine into six kinds of cost so you have a direction when something goes wrong:

| Cost | Produced by | Typical symptom |
| --- | --- | --- |
| Entity count | Mobs, drops, XP orbs, minecarts, armour stands, TNT | MSPT rises, entity synchronisation eats bandwidth |
| AI and pathfinding | Per-tick mob and villager thinking, path calculation | Very visible in villager districts; TPS drops and is hard to pin down |
| Chunk loading | Permanently loaded chunks, portal-based loaders | CPU and memory consumed even with nobody online |
| Block updates and redstone scheduling | Redstone components, hoppers, pistons, observers | High-frequency clocks and large redstone builds are the classic killers |
| Random ticks | Crops, leaves, frost, fire | Raising `randomTickSpeed` raises CPU roughly linearly |
| Lighting and saving | Block changes trigger lighting recalculation; chunks autosave periodically | Regular stutter during large building projects |

The conclusion is one sentence: **TPS is the sum of these costs, not the product of one switch.**

### 2.1 Measuring the cost

Do not guess whether a machine is expensive. Measure it in this order:

```text
1. Record a baseline: TPS and MSPT with nobody online
2. Put one player next to the machine and watch the MSPT curve for 5-10 minutes
3. Switch the machine off and measure again; the difference is its cost
4. Sample with spark to see whether the cost sits in entities, block entities or chunks
5. Write the numbers down and repeat the same measurement after an update or a config change
```

The value of this is that when a player claims "the machine only failed because the server is lagging", you have data to decide with instead of trading guesses.

## 3. The Server Settings Technical Play Depends On

The principle first: **vanilla behaviour is the default; optimisation is a deviation from the default.** Technical players want the former.

Every key name, default value and allowed value below **changes between versions**, and may not exist at all on your fork. Treat **your own server's configuration files** and that core's official documentation as authoritative. This article only explains what each setting does and what changes when you touch it.

### 3.1 Mob caps

The vanilla mob cap **is not a fixed number**; it scales with players and with the number of spawnable chunks. Key points:

- The cap scales with the **number of players** and the **spawnable chunks around them**, so "more players means more mobs" is expected behaviour.
- Monsters, animals, water creatures and ambient creatures each have their own cap.
- Caps are counted per player, so **no natural mob spawning happens when nobody is online**, even if the chunks are permanently loaded.
- The plugin-side `spawn-limits` (`bukkit.yml`) overrides this algorithm and switches it to a different basis. Implementations differ between forks, and changing it directly changes the throughput of every mob farm.

### 3.2 Spawn range and despawn distance

- Vanilla mobs spawn within a distance band around a player (with both a minimum and a maximum) and despawn when they are too far away.
- `mob-spawn-range` (`spigot.yml`, measured in chunks) changes that range.
- Knock-on effects: mob farm throughput, despawn speed, and the trigger range of village and raid mechanics.
- Technical servers normally **keep the vanilla range**, because every established design is built around the vanilla distances.

### 3.3 Entity activation range

- Spigot's `entity-activation-range` makes distant entities **tick less often or stop ticking entirely**; default values sit somewhere between the mid-teens and high forties of blocks (check your own `spigot.yml`).
- The consequence is direct: the half of the machine that is far from the player stops working, or works at a different speed than vanilla.
- A technical server either raises it far enough or accepts that some machines behave differently from vanilla.
- Note that this setting is **extremely valuable** for an ordinary survival server, so many preset configs push it very low. That is exactly where the conflict comes from.

### 3.4 Random ticks

- `randomTickSpeed` is a game rule with a vanilla default of 3.
- It affects crop growth, leaf decay, frost formation and melting, and fire spread.
- Raising it speeds up farms that depend on random ticks while **substantially** raising CPU cost; lowering it does the opposite.
- Many "optimisation" guides suggest lowering it. That is **changing vanilla behaviour**, and crop-based machines slow down accordingly.

### 3.5 Redstone

- The Paper family exposes a switchable **redstone implementation** (a world-defaults option such as `misc.redstone-implementation`; the key path and allowed values change between versions).
- A technical server **must stay on the vanilla implementation**. Switching to an implementation tuned for performance changes redstone update behaviour and can break machines outright.
- Also note that some optimisation options adjust block update order or redstone scheduling. That kind of change is worse than a performance loss, because it breaks machines **silently**.

### 3.6 Other settings that are commonly changed

| Setting | Vanilla behaviour | Typical "optimisation" | The technical trade-off |
| --- | --- | --- | --- |
| `simulation-distance` (`server.properties`) | Chunks within this distance run real logic | Lower it to 4-6 | Sets the usable range of every machine; lowering it cuts off distant machines |
| `view-distance` | How far players can see | Lower it | Affects visuals and bandwidth only, barely affects machines |
| `entity-broadcast-range-percentage` | Percentage of the entity sync range | Lower it | Players see entities "pop in", but server-side logic is unchanged |
| `entity-tracking-range` (`spigot.yml`) | Distance at which entities are tracked | Lower it | Synchronisation only, no change to machine logic |
| `max-entity-collisions` | Above the limit, entity collisions stop being processed | Lower it | Dense-entity machines need it raised, at a performance cost |
| `nerf-spawner-mobs` | Mobs from spawners keep full AI | Set to `true` to weaken AI | Changes how spawner-based farms produce |
| `hopper-transfer` / `hopper-check` (`ticks-per`) | Hoppers move items every 8 ticks | Raise it to save performance | **Changes the throughput of every hopper**, and every machine's timing with it |
| `merge-radius` (`spigot.yml`) | Merge radius for drops and XP orbs | Raise it | Fewer entities, but vanilla merging behaviour changes |
| `randomTickSpeed` | 3 | Lower it | Crop-based farms slow down |
| Game rules such as `doMobSpawning` | See the in-game `/gamerule` description | Turn them off to cut load | Turning them off removes mob farms entirely |

### 3.7 What these settings look like

The blocks below are **illustrative only**: they show where these keys live and what shape they have. **The numbers are not an answer to copy**; compare against your own files.

```yaml
# spigot.yml (illustrative; key names and defaults change between versions)
world-settings:
  default:
    mob-spawn-range: 8
    entity-activation-range:
      animals: 32
      monsters: 32
      raiders: 48
      misc: 16
      water: 16
      villagers: 32
      flying-monsters: 48
    max-entity-collisions: 8
    nerf-spawner-mobs: false
    merge-radius:
      item: 2.5
      exp: 3.0
    ticks-per:
      hopper-transfer: 8
      hopper-check: 8
```

```yaml
# bukkit.yml (illustrative; defaults change between versions)
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 15
  water-ambient: 20
  ambient: 15
ticks-per:
  monster-spawns: 1
  animal-spawns: 400
  autosave: 6000
```

```text
# server.properties (illustrative)
simulation-distance=10
view-distance=10
entity-broadcast-range-percentage=100
```

```bash
# Game rules: these are the vanilla defaults. Think about what you break before you change them.
/gamerule randomTickSpeed 3
/gamerule doMobSpawning true
/gamerule doFireTick true
/gamerule doInsomnia true
/gamerule doPatrolSpawning true
/gamerule doTraderSpawning true
/gamerule disableRaids false
/gamerule mobGriefing true
```

:::warn Many "optimisation" plugins change vanilla behaviour
A large share of performance plugins and preset configs push exactly the values above far more aggressively than vanilla: shrinking entity activation ranges, lowering random ticks, merging entities, rewriting redstone scheduling, capping spawn limits. For an ordinary survival server that is a good thing. **For a technical server it is a disaster** — machines fail in ways that are hard to diagnose, and usually not by stopping dead but by producing slightly less, occasionally.

So:

- Before installing any optimisation plugin, find out **which vanilla behaviours it changes**, and validate against a machine you already understand on a test server.
- Optimisation and technical play trade off against each other; do not expect to max out both. See [Performance Tuning](/tutorials/java/optimize).
- If the symptom is "entities and drops piling up and never clearing", that is a pile-up problem rather than a config problem: see [Lag from Entity and Item Pile-Ups](/tutorials/faq/entity-lag).
:::

## 4. Chunk Loading

Chunk loading is the part of a technical server that owners overlook most, and the part players abuse most.

### 4.1 Spawn chunks

- The chunks around the world spawn are **kept loaded continuously** by the game, even with no players online. This is why a farm at spawn can run around the clock.
- Separate "loaded" from "spawning": **no natural mob spawning happens with nobody online**, but redstone, block entities and crop random ticks keep advancing.
- The **size of the spawn chunk area has changed between versions**, and newer versions expose a game rule to control it (for example a `spawnChunkRadius`-style rule). Look up the exact size and rule name for your version on the official wiki instead of copying an old tutorial.
- Practical advice: **do not build your most important machines at spawn**, or they will quietly consume resources 24 hours a day.

### 4.2 `/forceload`

The vanilla force-load command, and the most direct handle an owner has when auditing:

```bash
/forceload add <fromX> <fromZ> [toX toZ]
/forceload remove <fromX> <fromZ> [toX toZ]
/forceload remove all
/forceload query
/forceload query <x> <z>
```

Key points:

- Coordinates are **block coordinates**; the chunks containing them are what gets loaded.
- A single command can load a limited number of chunks (**up to 256 chunks**).
- The force-load list **is saved with the world**, so it survives restarts.
- It requires administrator permission level (usually OP level 2).
- Force-loaded chunks are **fully ticked**, not merely "loaded but idle".

### 4.3 Portal-based chunk loaders

- Most player-built "chunk loaders" rely on Nether portals: a portal keeps the **corresponding chunk in the other dimension** loaded for a period of time.
- The usual pattern is "place a portal in the Nether so a machine in the Overworld keeps running", or the reverse.
- **How long it stays loaded, and which ticket level is used, is version-dependent.** Check the mechanics description for your version. It also means a loader can stop working after an update, or become permanently loaded.
- From the owner's side: these devices **do not appear in `/forceload query`**, so they can only be found by hand.

### 4.4 The cost of permanently loaded chunks

| Cost | Explanation |
| --- | --- |
| Memory | Every loaded chunk's data and entities stay resident; the more you load, the higher the heap occupancy and the harder GC works |
| CPU | Loaded chunks run the full tick loop: block entities, random ticks, entity ticks |
| Mob cap | If players are near a loaded area, those chunks **share** the mob cap and reduce the throughput of farms elsewhere |
| Saving | Loaded chunks autosave periodically; the larger the permanently loaded area, the more visible the autosave stutter |
| Concealment | Loaders are usually built where nobody looks (the Nether, underground), which makes them the hardest thing to find when something goes wrong |

### 4.5 How to audit

1. **Run `/forceload query` in every dimension**: Overworld, Nether and End. Loaders are often in the other two.
2. **Hunt portal loaders**: ask players, look at Nether portal locations, and question "why is there a lone portal out here".
3. **Look at MSPT with nobody online**: if TPS/MSPT is still unhealthy with all players offline, permanently loaded chunks are running.
4. **Locate with a profiler**: sampling tools such as spark tell you which chunks and entities the time goes into; the method is the same as in [Performance Tuning](/tutorials/java/optimize).
5. **Write the result into your rules**: who built which loader, how large an area it loads, and what it runs, recorded and re-verified before every version update.

## 5. The Tick Model a Technical Player Needs

### 5.1 20 TPS and 50 milliseconds

- Vanilla targets **20 TPS**, which is **50 milliseconds** per game tick.
- A single overlong tick does not drop TPS immediately: one 200 ms tick still averages out to nearly 20 TPS, but players feel a stutter. What actually drops TPS is **sustained** overspending.
- Every time-dependent mechanic (crops, furnaces, redstone, mob movement) advances inside that loop, so when TPS falls, **everything slows down together**.
- That is why "TPS 15" feels far worse than a 25 percent slowdown: every machine slows by the same factor, and designs that depend on exact timing stop working altogether.

### 5.2 Game ticks and redstone ticks

| Unit | Length | Use |
| --- | --- | --- |
| Game tick | 1/20 s = 50 ms | The smallest unit of the server's main loop |
| Redstone tick | 2 game ticks = 0.1 s | The community's unit for redstone delay; repeaters, observers and similar are specified in it |

A minimal example:

```text
Tick 0 (0 ms)      the repeater is powered and schedules "output in 2 ticks"
Tick 1 (50 ms)     other updates on the line continue to resolve within the same tick
Tick 2 (100 ms)    the repeater outputs, i.e. one redstone tick later
```

The point to take away: **a redstone tick is a unit for measuring delay, not a unit of execution**. Block updates can propagate instantly along a line within a single game tick, so machine behaviour often depends on **the order of updates within that tick**, not only on delay values.

### 5.3 Why update order is the crux

- When two components affect each other in the same tick, which one goes first decides the final state.
- This is the root reason "the machine broke when I changed server core": a core may change traversal order to parallelise or optimise.
- It is also why every machine must be **re-verified one by one** after a game update: fixing a bug often changes some ordering along the way.
- For debugging, vanilla provides `/tick`-style control commands (freeze, step, sprint and similar; the exact subcommands change between versions) so you can watch a machine tick by tick. Carpet-style tools provide more.

### 5.4 "Lag machines" are a griefing technique

**A lag machine is a deliberately constructed device whose purpose is to overwhelm the server.** Common shapes:

- Extremely high-frequency redstone clocks combined with large redstone networks to create update storms.
- Mass entity generation in an instant (TNT, drops, armour stands, minecarts, boats).
- Large-scale water and lava flow and update.
- Abusing chunk loading to create "always loaded and always computing" loops.
- Repeatedly triggering chunk generation and unloading so the main thread never stops doing chunk work.

Its nature is **destruction, not gameplay**: the goal is to disconnect everyone, stop the server saving properly, or corrupt the world.

### 5.5 How to detect one

| Signal | Explanation |
| --- | --- |
| MSPT spikes and stays high; TPS falls into single digits | The most direct symptom |
| An abnormal entity count | **Do not clear it in a hurry** with a `/kill`-style command; that is your evidence |
| A concentrated redstone/entity/chunk hotspot in a spark flame graph | Pins it to specific chunks and coordinates |
| Players report "it lags as soon as you go near these coordinates" | The coordinates are the lead |
| Entity-limit or watchdog warnings in the log | The server is already protecting itself |

Suggested order of response: **locate the coordinates and the device, capture evidence, act according to your rules, then restore the affected area.** Anti-cheat, logging and rollback tools are covered in [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat).

## 6. Permissions and Tooling

### 6.1 Server side: Carpet-style tools

- Technical servers commonly run **Fabric plus Carpet** (and its various extensions) for server-side rules and debugging: it toggles a large number of detailed vanilla behaviours and adds debug commands.
- **The exact rule names and the available rule set change between Carpet versions.** Use the official Carpet documentation for your version rather than copying somebody's rule list.
- Carpet is a server-side mod, so vanilla clients can join without installing anything.
- The usual practice on a technical server is to **publish the list of enabled rules**, so players know which vanilla behaviours have been altered.

### 6.2 Client side: MiniHUD / Litematica-style tools

| Tool | Purpose |
| --- | --- |
| MiniHUD | HUD readouts for coordinates, biome, light level, chunk borders and more |
| Litematica | Schematic overlay for building machines from a plan |
| Tweakeroo | A collection of convenience tweaks |
| Servux | A server-side mod that makes structure bounds and schematic pasting work on a server |
| Syncmatica | Uploads schematics to the server so several players can share them |

### 6.3 What the server has to support

- Server-side mods (Carpet, Servux, the server half of Syncmatica) **require a Fabric server**. A plugin server (the Paper family) cannot run Fabric mods directly; bridging costs compatibility and performance, as covered in [Getting Started with Modded Servers](/tutorials/java/modded).
- Purely client-side mods (MiniHUD, the display half of Litematica) work on any server, but the **parts that need server data** (structure bounds, schematic pasting, accurate placement) only work with server-side cooperation.
- So settle one question before opening a technical server: **is the server Fabric or Paper-family?** Once that is decided, almost the whole toolchain follows.
- Keep **versions aligned** as well: client mod versions, server mod versions and the game version must all match, or players cannot connect.

### 6.4 Permission checklist

Give technical players their own group rather than OP:

| Permission | Purpose | Risk |
| --- | --- | --- |
| `/forceload` | Keep machines running | Abuse means long-term high load; use a registration system |
| `/tick` (freeze/step and similar) | Debug machine timing | Freezing the whole server interrupts everyone; announce it |
| `/gamemode spectator`, `/tp` | Observing and building | Low risk |
| `/spark` | Self-service performance checks | Low risk; worth opening to the technical group |
| `/give`, creative mode | Building machines | Only in a test environment or an explicitly authorised build area |
| Bulk editing tools such as WorldEdit | Fast construction | **One wrong selection can destroy the world**; restrict the permission and back up first |

## 7. Checklist for Hosting a Technical Community

| Item | Why it is mandatory |
| --- | --- |
| **Pre-generate the world** | Chunk generation triggered by players exploring is the main TPS killer; pre-generation pays that cost up front, see [Performance Tuning](/tutorials/java/optimize) |
| **Back up before every large build** | Technical players make large-scale changes and explosive tests; you need to return to the previous minute |
| **A separate test world/server** | Every new machine, config or core build is validated there first, never on the production server |
| **Version pinning and an update process** | Updates break machines; announce, back up, re-verify on the test server, then update production |
| **A published Carpet rule list** | Players need to know which vanilla behaviours changed, or they will blame themselves for a broken machine |
| **Explicit rules about lag machines and duplication** | Both must be written down, or you have no basis for acting against a player |
| **Baseline monitoring** | Record healthy TPS/MSPT so "it got slower" has a comparison instead of a feeling |
| **Storage planning** | Backups, schematics and logs grow faster than most owners expect |
| **Tiered permissions** | Separate the technical group from ordinary players; do not hand out OP casually |
| **Machine registration and a channel for it** | Who built what, and where, is the most valuable information when something goes wrong |

A rules skeleton you can adapt directly:

```text
1. Allowed: ordinary redstone machines, mob farms, crop farms, villager trading facilities.
2. Must be registered: permanently loaded chunks, chunk loaders, any large device that runs unattended.
3. Forbidden: devices whose purpose is to overwhelm the server (high-frequency clock arrays,
   mass entity generation, repeated chunk loading).
4. Duplication behaviour: state explicitly whether it is allowed or forbidden. Do not leave it blank.
5. Version updates: announced in advance; machines must be re-verified by their owners afterwards,
   and the server owner does not guarantee compatibility.
6. Enforcement: act on log and coordinate evidence; warn before banning.
```

## 8. Summary

- Technical players build **resource lines**. Classifying them by load is more useful than classifying by output.
- The settings that matter are concentrated in **mob caps and spawn range, entity activation range, random ticks, redstone implementation and chunk loading**.
- **Permanently loaded chunks have a cost**: memory, CPU, mob cap and save stutter. Audit them and keep a register.
- Understanding **20 TPS / 50 ms** and **one redstone tick = 2 game ticks** is what lets you reason about why a machine broke and why the server is slow.
- **Lag machines are a griefing technique**: you need rules, detection and rollback.
- The toolchain choice (Fabric plus Carpet, or the Paper family) is the **first decision** of a technical server, and everything else follows from it.

:::tip A technical server's TPS is a design outcome, not a config outcome
Many owners treat "it lags" as a configuration problem, so they keep tuning values and installing optimisation plugins until the machines are all broken. In reality, **TPS is decided by what machines players built, how large they are, where they sit and how many chunks are loaded**. Configuration only lets you trade vanilla behaviour against performance; it cannot make a badly designed machine cheap. Look at the design first, then the config.
:::

Related reading: [Technical Minecraft and Redstone](/tutorials/java/redstone) for the basics and core selection, [Performance Tuning](/tutorials/java/optimize) for finding lag, [Lag from Entity and Item Pile-Ups](/tutorials/faq/entity-lag), [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat), and [Getting Started with Modded Servers](/tutorials/java/modded).

> Game mechanics, APIs and pack formats follow the official documentation for your version.
