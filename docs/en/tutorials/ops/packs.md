---
title: Resource Packs and Datapacks: Differences, Installation and Troubleshooting
slug: packs
cat: ops
level: 3
order: 21
minutes: 14
tags: [ops, resource-pack, datapack, pack-format, sha1, reload, troubleshooting]
updated: 2026-10-04
draft: false
---

Resource packs and datapacks sound similar and do opposite things: **a resource pack changes what players see and hear, while a datapack changes how the game behaves.** Confusing the two produces questions like "I installed a texture pack, so why did the recipe not change?" or "why can my datapack not change a texture?".

This article covers both for Java Edition: what each one can do, how to install them, how a server delivers a resource pack to clients, and how to diagnose format mismatches. Bedrock Edition uses a different system (resource packs plus behavior packs and add-ons); see [Bedrock Third-Party Cores](/tutorials/bedrock/third-party-setup).

## 1. What Each One Is

| Dimension | Resource pack | Datapack |
| --- | --- | --- |
| Where it acts | **Client side**: textures, models, sounds, language files, fonts, GUI | **Server or save side**: recipes, loot tables, advancements, functions, structures, tags |
| Who sees the effect | Only players who have the pack installed or delivered | Every player; the data lives on the server or in the world |
| Where it goes | Client `resourcepacks/`, or delivered by the server | The `datapacks/` folder inside the world directory |
| Can the server force it | Yes, it can deliver and require it (`require-resource-pack`) | Not applicable; it already lives on the server |
| Does it change gameplay | **No.** It changes appearance and audio | **Yes.** Recipes, drops, world generation, and command execution |
| Can it run code | **No.** Assets and configuration only | **Yes.** A function is a list of commands the server executes |
| Typical uses | Textures, UI, sound, translations, fonts, models | Custom recipes, drops, advancements, minigame logic, world generation |
| Version coupling | The format number in `pack.mcmeta` must match the client version | The format number in `pack.mcmeta` must match the server version |

The one-line summary: **a resource pack is a new skin, a datapack is new rules.**

### Directory Layout Side by Side

```text
resource pack/
  pack.mcmeta                 <- required; this is what marks a folder or zip as a pack
  pack.png                    <- optional icon in the selection screen
  assets/
    <namespace>/
      textures/               <- .png textures
      models/                 <- .json models
      sounds/                 <- .ogg audio
      lang/                   <- <language code>.json translations
      font/  blockstates/  gui/ ...

datapack/
  pack.mcmeta                 <- required
  pack.png                    <- optional
  data/
    <namespace>/
      function/               <- .mcfunction command functions
      recipe/                 <- .json recipes
      loot_table/             <- .json loot tables
      advancement/            <- .json advancements
      structure/              <- .nbt structures
      tags/                   <- tags, for example function/tick.json
      predicate/  item_modifier/  worldgen/ ...
```

`pack.mcmeta` is **the only mandatory file**, and it is exactly how the game decides that a directory or zip is a pack at all.

## 2. What Each One Cannot Do

| Goal | Resource pack | Datapack |
| --- | --- | --- |
| Change block textures, sounds, fonts, or language | Yes | **No** (a datapack never touches client assets) |
| Add a crafting recipe or change loot | **No** | Yes |
| Change game logic, add minigame rules, run commands on a schedule | **No** (it cannot execute code) | Yes |
| Add a genuinely new block or item | **No** (it can only restyle existing content) | **No** (this requires a mod) |
| Make every player see the same thing | Requires delivery, and players can still decline | Yes, by nature |
| Affect server performance | Essentially no | **Yes**: a function that runs every tick can slow the server down |

:::note Why a datapack cannot add a new block
A datapack can define data such as recipes, loot, advancements, and world generation, but blocks and items are registered in hardcoded game code. Adding real new blocks or items on the server side requires a mod (or a behavior pack on Bedrock). **If a tutorial claims to add a new ore with a datapack, it is almost always reusing an existing block's appearance and assets.**
:::

## 3. How a Server Delivers a Resource Pack to Java Clients

The vanilla server pushes a resource pack through a few keys in `server.properties`. **The key names must match exactly**, and getting one wrong is among the most common causes of failure:

```properties
resource-pack=https://cdn.example.com/packs/survival-2026-10-04.zip
resource-pack-sha1=<40-character lowercase hexadecimal SHA-1>
require-resource-pack=false
resource-pack-prompt={"text":"This server uses a custom pack; please enable it.","color":"yellow"}
```

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `resource-pack` | string (URL) | empty | The download URL for the pack. Empty means no pack is offered; players may choose to download it when joining. **The pack may not exceed 250 MiB** |
| `resource-pack-sha1` | string | empty | The pack's SHA-1 in **lowercase hexadecimal**, used by the client to verify integrity. **Strongly recommended** |
| `require-resource-pack` | boolean | `false` | When `true`, **players who decline the pack are disconnected** |
| `resource-pack-prompt` | string | empty | A custom message shown on the prompt when the pack is required. Uses chat component (JSON text) syntax and may span multiple lines; empty shows the default message |
| `resource-pack-id` | UUID | empty | Optional identifier for the pack; **only exists in newer versions**, and writing it on an older version has no effect |

### Details That Matter

- **It must be an HTTPS URL the client can download from directly.** In practice the vanilla client only accepts HTTPS, so a plain HTTP URL or one with a broken certificate fails to download (the exact client-side validation varies by version; defer to the official documentation).
- **Download success and failure are logged by the client, not by the server.** "The server logged no errors" does not mean players received the pack. When troubleshooting, read the client's `logs/latest.log`.
- The server **does not host the file for you.** Put it somewhere publicly reachable (object storage, a CDN, an Nginx static directory) and confirm there is **no hotlink protection, no authentication, and no redirect to an HTML page**.
- The server rewrites `server.properties` on startup: it fills in missing keys, resets invalid values to defaults, and **escapes certain special characters** such as `:`. Writing the `resource-pack-prompt` JSON by hand is therefore fine, but do not assume a stray backslash means you made a mistake.
- Changing these keys **requires a server restart**; `server.properties` is not re-read by `/reload`.

:::warn Requiring a resource pack cuts both ways
With `require-resource-pack=true`, **players who decline simply cannot join**. If the pack is hosted on your own modest connection, a single update can make every player download at once, saturate the link, and look exactly like "the server is down". **Before requiring it, confirm the hosting capacity and keep the ability to turn the requirement off immediately.**
:::

## 4. Computing the SHA-1 Correctly

The hash must be the SHA-1 of the **file contents**, lowercase hexadecimal, 40 characters long.

```bash
# Linux / macOS
sha1sum survival-2026-10-04.zip
```

```powershell
# Windows PowerShell: Get-FileHash prints uppercase, so lower-case it before use
(Get-FileHash -Algorithm SHA1 .\survival-2026-10-04.zip).Hash.ToLower()
```

### What Happens When the Hash Is Wrong

| Situation | Consequence |
| --- | --- |
| The hash does not match the file | Client verification fails and the **pack is not applied**; the failure appears only in the client log, and the server never notices |
| The hash is not a 40-character hexadecimal string | Per the protocol documentation, the client will not use it for verification and will likely waste a download |
| The console prints `Invalid sha1 for resource-pack-sha1` at startup | The configured value does not match the pack or is malformed; the server prints a yellow warning |
| The pack changed but the hash did not | Players download repeatedly and fail repeatedly, while existing players may keep an outdated pack |

:::tip Three mistakes that catch everyone
1. **Re-zipping changes the hash.** Even with identical contents, a new zip (different timestamps or compression level) hashes differently. **Keep the exact zip file you hashed; do not repack it.**
2. **Uploads can alter the file.** Some platforms recompress, watermark, or rewrite content. After uploading, **download the file again** and confirm its hash matches the local copy.
3. **Case matters in practice.** A value like `ABC...` may not be recognised as a valid hash. Use lowercase consistently.
:::

## 5. Where Datapacks Go and How to Install Them

A datapack goes into the `datapacks/` folder **inside the world directory**. On a server that directory is named by `level-name` in `server.properties` (default `world`):

```text
/opt/mcserver/
  server.properties          <- level-name=world
  world/
    datapacks/
      my-tweaks/             <- a datapack as a folder
      economy.zip            <- a datapack as a zip
    level.dat
    region/
```

Installation steps:

1. Download the datapack (the ones listed on this site are at [Datapack Downloads](/downloads/datapacks)) and confirm it is a **`.zip` or a directory**.
2. Put it into `<level-name>/datapacks/`. **The zip must contain `pack.mcmeta` at its root, with no extra wrapper folder.** Compressing a folder with the right-click menu is the usual way this goes wrong.
3. If the server is running, either run `/reload` or enable the pack with `/datapack enable <name>` (some content still needs a restart; see section 6).
4. Verify that it loaded:

```text
/datapack list             list every datapack
/datapack list enabled     list only enabled packs
/datapack list available   list only available but disabled packs
```

Your pack should appear in the output (a zip shows as `file/<filename>`). Hovering over an entry in chat shows the `description` from its `pack.mcmeta`.

### Enabling, Disabling, and Ordering

```text
/datapack enable <name>
/datapack disable <name>
/datapack enable <name> first        move to lowest priority
/datapack enable <name> last         move to highest priority
/datapack enable <name> before <existing pack>
/datapack enable <name> after  <existing pack>
```

- **Order matters**: for the same file, **later packs override earlier ones**, while tag files merge by default unless they set `"replace": true`.
- Permission levels: `list`, `enable`, and `disable` need level 2; `create` needs level 4.
- The enabled pack list is stored **in the world** (`level.dat`), so **switching worlds or restoring a backup also changes which datapacks are enabled**.

:::note Singleplayer and server paths differ
In singleplayer the datapacks live in `.minecraft/saves/<world>/datapacks/`. On a server they live in `<level-name>/datapacks/` **relative to the server's working directory**. Putting them in the wrong place is the most common reason a datapack "does not work".
:::

## 6. What `/reload` Actually Reloads

In Java Edition, `/reload` **reloads the data of the currently enabled datapacks**. It is not a universal refresh and it is not a restart:

| Content | Does `/reload` reload it? |
| --- | --- |
| Registry tags | Yes |
| Loot tables | Yes |
| Recipes | Yes |
| Advancements | Yes |
| Item modifiers and predicates | Yes |
| Functions (`.mcfunction`) | Yes |
| Structure templates | Yes |
| Anything using dynamic registries or experimental content, such as dimensions, biomes, world generation, or enchantments (the exact set varies by version) | **No**; the server must be restarted (in singleplayer, leave and re-enter the world) |
| Core configuration such as `server.properties` | **No**; a restart is required |
| The server process and plugin state | **No**, and `/reload` can actually confuse it |

Two behaviours to remember:

1. **If a datapack contains invalid data, the changes are not applied at all** and the game keeps using the previous data. So "I ran `/reload` and nothing changed" is sometimes a broken pack rather than a failed reload.
2. **Be careful with `/reload` on plugin servers.** It can corrupt plugin state such as scoreboards, listeners, and caches. When `/datapack enable` or `/datapack disable` will do, or when a restart is acceptable, prefer those.

## 7. Pack Format: `pack.mcmeta` and `pack_format`

`pack.mcmeta` is the metadata file for both kinds of pack, but **resource packs and datapacks use different format numbers**.

```json
{
  "pack": {
    "pack_format": <the integer your version requires>,
    "description": "Example datapack"
  }
}
```

:::warn The `<the integer your version requires>` above is a placeholder, not usable JSON
**Never copy a format number from any tutorial, including this one.** The `pack_format` value changes with every Minecraft version, and resource packs and datapacks each have their own sequence. A wrong value produces an "incompatible format" message and the pack is not loaded.
:::

### How to Find the Right Number for Your Version

| Source | Notes |
| --- | --- |
| Official documentation and the Minecraft Wiki pack format table | Lists resource pack and datapack format numbers per version; **this is the authority** |
| Documentation for your server core | Some cores document the format for the version they ship |
| The message the game prints | A failed load usually shows both the declared format and the expected one (wording varies by version) |
| Reverse-engineering the vanilla pack | Read the `pack.mcmeta` inside the official resource pack or built-in datapack for that version |

### Other Fields, Which Also Change Between Versions

`pack.mcmeta` has more than `pack_format`, and **the fields themselves evolve**:

| Field | Purpose | Notes |
| --- | --- | --- |
| `pack.pack_format` | The pack's main format number | Optional in newer versions; required in older ones |
| `pack.supported_formats` | Declares a range such as `[42, 45]` | Added in 1.20.2 and **removed again in newer versions**, kept only for backward compatibility |
| `pack.min_format` / `pack.max_format` | Minimum and maximum supported formats in newer versions, optionally with a minor version | Replaced the role of `supported_formats` |
| `pack.description` | Text shown on hover; accepts text components | Used by both pack types |
| `pack.filter` | Filters files out of lower-priority packs using regular expressions | Added in 1.19 |
| `pack.overlays` | Overlay subdirectories for version ranges | Added in 1.20.2 |
| `features.enabled` | Enables experimental feature flags | Requires the matching experiment to be enabled |

**Field names, whether they are required, and the format numbers themselves all follow the official documentation**, not this article and not any third-party tutorial.

## 8. Performance and Security

### A Datapack Is Server-Side Code

A function is a list of commands **the server executes**, so:

- **Only install datapacks from sources you trust.** A function can do anything a command can do: hand out items, teleport players, edit the world, empty containers, or drop a player into the void.
- **Open the zip before installing it.** Look for commands in `data/<namespace>/function/` that you would not want to run, and check whether the `description` in `pack.mcmeta` matches what the pack actually does.
- The permission level available to functions comes from `function-permission-level` in `server.properties` (default 2), which determines how powerful those commands can be.

### Functions That Run Every Tick Cost Performance

- A function referenced by the `minecraft:tick` function tag **runs once per tick, 20 times per second**. Iterating over hundreds of entities, or placing and breaking blocks every tick, steadily consumes MSPT.
- A function referenced by `minecraft:load` runs once on (re)load and costs far less.
- If you poll with `/schedule` or `execute if`, work out **how many times per second it really runs**.
- Measure before changing anything: see [Profiling with spark](/tutorials/ops/spark).

```text
# To check whether a pack has a per-tick entry point, look for this file
data/<namespace>/tags/function/tick.json
```

### Notes on Resource Packs

- A resource pack performs **asset replacement** on the client and cannot execute code, so the security risk is low; the **download and storage cost** is real, though, with a 250 MiB cap and a fresh download on every update.
- Large packs noticeably lengthen join times, and players on poor connections may simply give up. **If a few megabytes will do, do not ship tens of megabytes.**
- A resource pack can replace any texture, which means it **can also be used to mislead players**, for example by drawing ordinary ore to look like diamond ore. On a multiplayer server that is a fairness question, not just a technical one.
- Delivering a pack **does not guarantee** players use it: unless `require-resource-pack=true`, they may decline, and their own client-side packs can override yours by load order.

## 9. Troubleshooting Table

| Symptom | Likely cause | How to check |
| --- | --- | --- |
| The pack is never delivered | `resource-pack` is empty or mistyped; the URL is unreachable; the server was not restarted | Check the key spelling and URL in `server.properties`; confirm with a browser or `curl -I` that the zip downloads directly |
| Players see a download failure when joining | Not HTTPS, invalid certificate, authentication required, hotlink protection, or the URL returns HTML instead of a zip | **Read the client log**; the server does not record download failures |
| Hash verification fails and the pack is re-downloaded repeatedly | `resource-pack-sha1` does not match the file; the pack was repacked without updating the hash; the hash is uppercase or the wrong length | Recompute it as in section 4 and confirm the downloaded file is identical to the local one |
| The console prints `Invalid sha1 for resource-pack-sha1` | The value is inconsistent with the pack or malformed | Recompute and update it; if unsure, leave it empty (you lose verification) |
| Players who decline cannot join | `require-resource-pack=true` | Set it to `false` and restart, or fix the download problem before requiring it |
| Textures do not change | Wrong path or namespace inside the pack; missing or mismatched `pack.mcmeta`; overridden by a higher-priority pack; overridden by the player's own pack | Verify the `assets/<namespace>/textures/...` path, move the pack to the top of the list, and test on a vanilla client |
| It works for some players only | They declined the pack, or they use their own | Enable `require-resource-pack` if you need consistency, after fixing hosting bandwidth |
| The datapack does not appear in `/datapack list` | Wrong directory (it belongs in `<level-name>/datapacks/`); an extra wrapper folder inside the zip; not a `.zip` or directory | Confirm `pack.mcmeta` sits at the pack root; inspect the zip with `unzip -l` |
| The datapack is listed but has no effect | It is not enabled; no function is referenced by the `tick` or `load` tag; wrong namespace or path; the content needs a restart | Confirm with `/datapack list enabled`, check the log after `/reload`, and restart if needed |
| An "incompatible format" message appears | `pack_format` does not match the version (and resource packs and datapacks use different numbers) | Look up the official table as in section 7 and set the correct number |
| Nothing changed after `/reload` | The content requires a restart, or invalid data in the pack caused all changes to be discarded | Check the server log for load errors; verify with a restart |
| Clear lag right after installing a datapack | A function on the `minecraft:tick` tag is expensive every tick | Inspect `tags/function/tick.json` and locate it with [spark](/tutorials/ops/spark) |

## 10. Summary

- **A resource pack changes appearance, a datapack changes rules**; one lives on the client, the other on the server.
- **Server delivery uses four `server.properties` keys**: `resource-pack`, `resource-pack-sha1`, `require-resource-pack`, and `resource-pack-prompt` (plus `resource-pack-id` in newer versions), and a restart is required.
- **The hash must match the actual file and be 40 lowercase hexadecimal characters.** Do not repack after hashing, and re-verify after uploading.
- **Datapacks go in `<level-name>/datapacks/`** and are verified with `/datapack list`; `/reload` only reloads part of the content, while dynamic registries and core configuration need a restart.
- **Format numbers change with every version.** Always check the official table instead of copying one from a tutorial.
- **A datapack is server-side code.** Install only trusted sources, and remember that a function on the `tick` tag consumes performance forever.

Downloads: [Datapack Downloads](/downloads/datapacks). Related reading: [Server Layout](/tutorials/java/structure) for where `datapacks/` lives, [Server Configuration](/tutorials/java/config) for the other `server.properties` keys, [Profiling with spark](/tutorials/ops/spark) for lag caused by functions, and [Backup and Restore](/tutorials/java/backup) because restoring a world also restores which datapacks are enabled.

> Pack format versions and configuration key names change with game versions; defer to the official documentation.
