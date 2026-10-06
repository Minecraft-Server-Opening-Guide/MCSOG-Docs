---
title: Chat, Menus and MOTD
slug: cosmetic
cat: java
level: 3
order: 24
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, chat, menu, motd, holograms, plugins]
updated: 2026-10-04
draft: false
---

The previous articles covered whether a server runs at all and whether it can resist griefing. This one covers a different kind of plugin: the kind that changes no gameplay rule but decides **what players actually see** — the chat box, chest menus, the two lines in the server list, and the floating text above spawn.

A mistake with these plugins rarely crashes anything; it just "looks wrong", which is exactly why they get neglected. Yet they are the first things a player meets after joining.

## 1. Chat Plugins: More Than Good Looks

A chat plugin **takes over the message a player sends** and reassembles it before broadcasting.

The most obvious ability is formatting: adding a prefix, a suffix or a title, or replacing plain text with coloured content. What turns a chat plugin into a genuine **moderation tool**, however, is the following:

| Capability | Problem it solves |
| --- | --- |
| Multiple channels | General, global, private and staff channels stay separate; staff speech can be visually distinct |
| Profanity and ad filtering | Blocks swearing and advertising automatically, and **not only in chat** — signs and anvil names are covered too |
| Chat cooldown | Caps how often a player may speak, stopping spam |
| Mentions (@) | Alerts a player through sound or a title when their name is used |
| Private message monitoring | Staff can switch on a monitoring mode to investigate harassment or trade disputes |
| Colour permissions | Which colour codes a player may use is decided by permission, instead of everyone getting a rainbow |
| Item display | Shows the held item, the inventory or even the ender chest inside chat, saving a lot of description during trades |
| Placeholder support | With PlaceholderAPI attached, chat can show live values such as balance or player count |

**a chat plugin is the cheapest moderation you can buy**. Without one, a human has to watch the screen; with one, the rules are enforced by configuration.

### Comparing Common Chat Plugins

| Plugin | Positioning | Worth knowing |
| --- | --- | --- |
| **TrChat** | The most complete advanced chat system | Multiple channels, cloud-hosted word lists, item display, @ mentions, cross-server support (Bukkit / BungeeCord / Velocity), regex replacement, PlaceholderAPI; covers versions from 1.8 to the latest |
| **Carbon** | A modern, well-designed chat plugin | Clean structure and good extensibility, suited to projects that want a tidy implementation rather than a pile of features |
| **InteractiveChat** | A chat **enhancement**, normally paired with a formatting plugin | Its core is interaction: keywords such as `[item]`, `[inv]` and `[ender]`, custom hover and click actions, interactive player names, cross-server alerts, RGB colours |
| **HuskChat** | Cross-server chat | Development has stopped; not a first choice for new projects |

:::tip Decide what you actually need first
If all you want is a prefix and some colour, your **basic plugin** (EssentialsX or CMI and friends) already does it, and a dedicated chat plugin is unnecessary. You genuinely need one for three things: **multiple channels**, **content filtering**, and **cross-server chat**.
:::

:::warn Do not forget the dependency
Almost every chat plugin relies on placeholders. To print something like a balance or a player count in the format, install **PlaceholderAPI** and the matching expansion first, or the placeholder will simply appear as literal text. See [Plugin Dependencies](/tutorials/java/plugin-deps).
:::

## 2. Menu Plugins: Turning Commands into Chest Interfaces

A menu plugin describes **a chest interface in a configuration file**: every slot is an icon, and clicking one runs an action.

The problem it solves is very concrete — players do not memorise commands. Rather than making a newcomer learn `/warp shop` and `/kit starter`, hand them a chest and let them click.

Typical uses:

- **Server navigation**: a main menu leading to the shop, teleports, events and rules
- **Shops and exchanges**: barter, pay-and-receive, purchase limits
- **Kits and daily rewards**: handing out items by permission or cooldown
- **Player info panels**: showing a player's own statistics, balance and title

### Comparing Menu Plugins

NitWikit arranges menu plugins along a single line of capability: **ChestCommands < DeluxeMenus < TrMenu**.

| Plugin | Strength | Notes |
| --- | --- | --- |
| **ChestCommands** | Entry level | Very old, essentially only suitable for 1.7 / 1.8 servers; clearly underpowered on modern versions |
| **DeluxeMenus** | Workhorse | Configuration-driven with solid documentation; the "good enough" choice for most servers |
| **TrMenu** | Advanced | Strong on both features and performance, with conditions, sub-icons and Kether scripting; v2 is discontinued, so **use the community-maintained v3** |
| **Invero** | Visual | Offers scrolling panes, frame-by-frame animation and interactive slots for interfaces that should not look like a vanilla chest |

:::note About visual editors
Menu plugins have **no** visual editor, and they do not need one. Write the configuration in a text editor following the documentation. So-called "menu editors" either generate YAML for you or leave you with configuration you cannot read.
:::

:::tip Menu plugins lean on placeholders and permissions
Effects such as "show my balance" or "visible to VIP only" come from **PlaceholderAPI** and a permission plugin. Get those two in place first, or the menu will open but every value in it will be dead.
:::

## 3. MOTD: The First Impression in the Server List

Before a player ever connects, they see your server's entry in the **multiplayer list**: icon, name, two lines of description and the player count. Together these are the **MOTD**.

Vanilla `server.properties` allows only two lines of plain text with limited colour. A MOTD plugin fills exactly that gap:

- **Gradients and colour**, plus bold and italic styling
- **Multi-line content** with rotation
- **Random rotation**: a different MOTD on each refresh, useful for cycling announcements
- **Faked player counts**: displaying a number other than the real one
- **Conditional display**: different content for different players or states

| Plugin | Notes |
| --- | --- |
| **MiniMOTD** | A widely supported MOTD plugin that works on Bukkit / Spigot / Paper and on proxies; random rotation is its common use |

:::warn Do not stop at the name
The MOTD is **the fastest way for a player to judge whether a server is still alive**. A server with two blank lines, a default "Unnamed server", or a count of 0 gets very few clicks no matter how good the content is. Spending ten minutes on a clear MOTD — **server type, what makes it different, how to reach you** — is one of the highest-value changes available.
:::

## 4. Holograms: An Optional Extra

A hologram is floating text pinned to a location that always faces the player; it can also include display entities and items.

This category is a **finishing touch**, commonly used for:

- A welcome message and a summary of the rules at spawn
- Prices written directly above a shop, saving a sign
- Leaderboards and event countdowns
- Labels on teleport points and landmarks

| Plugin | Notes |
| --- | --- |
| **DecentHolograms** | Lightweight but complete, with many configuration options and optional damage and healing displays; **the current first choice** |
| **HolographicDisplays** | The veteran hologram plugin; its repository is archived with no further commits. Older servers may still run it, but new projects should go straight to DecentHolograms |

:::note Some limits come from the game itself
Several hologram quirks are not the plugin's fault but Minecraft's: text **always faces the player**, and font size and typeface cannot be changed per hologram. Some entities, such as floating item icons, rotate and bob on their own and even make noise. No plugin can fix that; workarounds involve resource packs with custom fonts.
:::

## 5. A Sensible Installation Order

These plugin types depend on each other, so install them in this order:

1. **Dependencies**: PlaceholderAPI, a permission plugin, an economy plugin (see [Plugin Dependencies](/tutorials/java/plugin-deps))
2. **Basic plugins**: the ones providing the warp and kit commands your menus will call
3. **Chat plugin**: settle the chat format and leave room for placeholders
4. **Menu plugin**: wrap those commands in an interface
5. **MOTD plugin**: adjust the outward-facing presentation last
6. **Holograms**: once the world and shop locations are settled, or you will move them again

:::tip Install one at a time
All of these plugins change text a player can see. Install three and debug at once and you will not know which one produced the output. Install one, restart, check the result, then install the next.
:::

## Next Step

With the interface done, review the whole picture: see [Getting Started with Plugins](/tutorials/java/plugins), [Plugin Configuration Basics](/tutorials/java/plugin-config) and [Plugin Management and Auditing](/tutorials/java/plugin-manage).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
