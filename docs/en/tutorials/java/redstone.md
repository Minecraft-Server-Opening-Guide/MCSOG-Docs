---
title: Technical Minecraft and Redstone
slug: redstone
cat: java
level: 2
order: 12
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, technical, redstone, fabric, leaves, paper, vanilla-behaviour]
updated: 2026-10-04
draft: false
---

"Technical Minecraft" (literally **sur**vival + **circ**uits) means technical survival play built around redstone machines, mob farms and precise block behaviour. What sets it apart from ordinary survival is that it is **extremely sensitive to whether vanilla behaviour has been altered**.

One changed block-update order, or a single duplication glitch that got patched out, is enough to scrap an entire machine.

## 1. The Most Important Point: A Plugin Server Cannot Be 100% Vanilla

Paper's own documentation says as much:

> *Unfortunately, it currently is not possible to get a 100% Vanilla experience in Paper.*

In other words, **running technical Minecraft on Paper / Purpur is inherently a compromise**. So pick the right core first, and only then talk about configuration.

| Your goal | Recommended core |
| --- | --- |
| **Pure technical / redstone-focused** | **Fabric** (closest to vanilla when no optimisation mods are installed), **Leaves** (a Paper fork that exists specifically to repair vanilla behaviour that was broken) |
| Vanilla verification / minimal | **Vanilla** (the official server) |
| **Light technical** play, while still wanting plugins | The Paper family + the configuration tuning below |

> Why `Leaves` deserves a mention of its own: its stated purpose is "repairing vanilla behaviour". It restores altered behaviour while keeping the Paper ecosystem (plugins, performance), which makes it the realistic choice when you want plugins *and* technical play.

## 2. Tuning Vanilla Behaviour on a Plugin Server

If you have decided to use the Paper family for **light technical** play, focus on these settings (file: `config/paper-world-defaults.yml`).

### Chunk Unload Delay

```yaml
chunks:
  delay-chunk-unloads-by: 0s
```

There is a delay by default. Only `0s` lets devices that rely on chunks unloading promptly — such as **ender pearl stasis chambers returning the pearl** — work correctly.

### Entity Collisions

```yaml
collisions:
  allow-player-cramming-damage: true
  max-entity-collisions: 2147483647
```

- `allow-player-cramming-damage`: whether players take damage when squeezed by too many entities; set it to `true` if you need parity with vanilla.
- `max-entity-collisions`: above this count the server **stops processing entity collisions**. Dense-entity devices such as large mob farms need it raised to a huge value, **at the cost of performance**.

### Entity Behaviour

```yaml
entities:
  behavior:
    # Failure cooldown for bees leaving the hive; tied to vanilla behaviour
```

Paper adds "cooldowns" or limits to some entity behaviour for the sake of performance. Technical setups have to check these one by one and switch them off.

### Redstone Implementation

Paper lets you switch the **redstone implementation**. **Keep the vanilla implementation** — moving to another one (optimised for performance) changes redstone update behaviour and your machines simply stop working.

:::warn Back up before you change configuration
Getting a file under `config/` wrong can break server startup. **Copy it first**, and restore it immediately if something goes wrong.
:::

## 3. Common Technical Minecraft Mods (Modded Side)

Technical players usually install a set of client mods, and the server side has to support them in turn:

| Mod | Purpose |
| --- | --- |
| **Carpet** | Server-side rule control; close to mandatory on a technical server (toggles a great many vanilla detail behaviours) |
| **MiniHUD** | HUD readouts for coordinates, biome, light level and more |
| **Litematica** | Schematic overlays, so you can build machines by following a projection |
| **Tweakeroo** | A pile of convenience tweaks |
| **Servux** | Makes MiniHUD structure display and schematic pasting work properly on a server |
| **Syncmatica** | Uploads schematics to the server to share with other players |
| **BBOR** | Shows the extent of natural structures, 3D biome boundaries and slime chunks |
| **Jade / JEI (or REI)** | Block information / crafting recipes |
| **Xaero's Minimap / World Map** | Minimap and world map |
| **AppleSkin** | Displays hunger and saturation restoration |
| **EasyAuth** | Server-side login mod |
| **Fuji** | Multi-purpose administration mod |

> For many mods, some features **only display the right numbers when the server has them installed too** (AppleSkin's exact saturation, for example). Keep versions aligned with your players when you run a technical server.

## 4. Purpose-Built Redstone Servers

If all you care about is **the redstone circuit itself** — building large calculators, verifying machine timing — there are cores built specifically for redstone (such as **MCHPRS**): they strip out the survival overhead and push redstone computation to extreme speeds.

The trade-off is that **it is not a normal survival server**, and many vanilla mechanics are incomplete. It suits **testing machines**, not hosting players.

## 5. Choosing, Summed Up

```
True technical play (machines must be exact)
   → Fabric / Leaves / Vanilla
   → No amount of tuning gets a plugin server to 100% vanilla

Light technical play + you want plugins
   → The Paper family + the configuration tuning in section 2
   → Accept that "some machines may still not work"

Redstone circuits only
   → A purpose-built core such as MCHPRS
```

## Next Step

Once it runs technically, whether the server lasts comes down to how you run it: see [Operations and Management](/tutorials/ops/management-java).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
