---
title: Common Dependency Plugins
slug: plugin-deps
cat: java
level: 2
order: 19
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, dependencies, vault, placeholderapi, permissions]
updated: 2026-10-04
draft: false
---

The most common way to break a plugin installation is not downloading the wrong version — it is **forgetting a dependency**. The jar sits in `plugins/`, yet `/plugins` shows it in red, or it loads and some feature is simply missing.

This article explains what a dependency is, what happens when one is missing, and what the four most commonly required plugins — Vault, PlaceholderAPI, ProtocolLib and LuckPerms — actually do.

## 1. What a Dependency Plugin Is

Plugins can depend on one another. Rather than reinventing the wheel, an author declares "I need the capability that another plugin provides", and the plugin being required is the **dependency**.

Dependencies are declared in the `plugin.yml` inside each jar, in two flavours:

| Declaration | Meaning | If it is missing |
| --- | --- | --- |
| `depend` (hard dependency) | The plugin cannot work without it | The plugin **fails to load** and shows red in `/plugins` |
| `softdepend` (soft dependency) | Extra features are enabled if present, but the plugin still runs | The plugin loads normally and the **related features are silently disabled** |

The server loads dependencies first and the plugins that need them afterwards, which is why a dependency must be installed ahead of its dependents.

:::note Any plugin can be a dependency
Dependencies are not a special category of plugin. In principle any plugin can be declared as another plugin's dependency; the handful below simply became known as "dependency plugins" because so many others rely on them.
:::

## 2. What Happens When a Dependency Is Missing

The symptoms are rarely as clear as a straightforward error message. Recognising these patterns saves a lot of time:

| Symptom | Explanation |
| --- | --- |
| The plugin shows red in `/plugins` | The server recognised it but failed to load it; the console always says why |
| The console reports `Unknown dependency` | The clearest case: a hard dependency declared in `plugin.yml` is not in `plugins/` |
| The console reports `ClassNotFoundException` / `NoClassDefFoundError` | The code references a class provided by the dependency, and that class does not exist |
| The plugin loads but one feature "does nothing" | Usually a missing soft dependency; the feature was disabled automatically |
| A placeholder shows literally as `%player_name%` | PlaceholderAPI is missing, or the matching expansion was never downloaded |
| An economy command says no economy system was found | Vault is installed, but no plugin actually provides the economy |

:::warn Read the console before guessing
The reason a plugin failed to load is always written to the startup log. **Open `logs/latest.log` and search for the plugin name** — far faster than asking why your plugin "is red".
:::

## 3. How to Tell That a Plugin Needs a Dependency

In order of reliability:

1. **Read the plugin's download page.** SpigotMC, Modrinth, Hangar and GitHub descriptions usually list a `Requires` or `Dependencies` section.
2. **Open the `plugin.yml` inside the jar.** Use any archive tool, find `plugin.yml`, and read the `depend` and `softdepend` lines — this is the authoritative answer.
3. **Read the console error.** It names the missing dependency, so you know exactly what to install.
4. **Watch the colours in `/plugins`.** For a red entry, suspect a missing dependency first, then a version mismatch.
5. **Check the plugin's documentation or issue tracker.** Authors normally document dependencies and version requirements.

## 4. Vault

**What it is**: Vault is an **abstraction library** for Bukkit-family servers. It implements no features of its own; it defines a set of interfaces so that "plugins that need economy, permission or chat capabilities" can talk to "plugins that actually provide them".

**It is not an economy plugin.** This is the most common misunderstanding: Vault creates no currency whatsoever. To have a working economy you still need an economy plugin (XConomy, the economy module of EssentialsX, CMI, and so on) that registers itself with Vault; other plugins then read and write balances through Vault.

| Interface Vault provides | Who implements it | Who calls it |
| --- | --- | --- |
| Economy | An economy plugin | Shops, daily rewards, crates and so on |
| Permission | A permissions plugin such as LuckPerms | Plugins that check what a player may do |
| Chat | A chat plugin | Plugins that send or format chat |

**Who needs it**: if any entry in your plugin list says it depends on Vault, install Vault. Server owners do not configure anything — installing it is the whole job.

:::tip You can ignore the version label
Vault supports both old and new Minecraft versions, so do not worry about the version range shown on its SpigotMC page.
:::

## 5. PlaceholderAPI

**What it is**: PlaceholderAPI (PAPI for short) is a placeholder system. It replaces text of the form `%expansion_parameter%` with information supplied by other plugins.

```
%player_name%        the player's name
%player_level%       the player's level
%vault_eco_balance%  the player's balance
%server_online%      the online player count
```

In `%player_name%`, `player` is the expansion name and `name` is the parameter — in other words, "fetch the player's name".

**Expansions**: PAPI itself ships with essentially no placeholders; they are supplied by individual **expansions**. Hundreds of them can be downloaded in game from the eCloud, covering EssentialsX, LuckPerms, Vault and many other plugins.

```
/papi ecloud download Player     download the Player expansion
/papi list                       list installed expansions
/papi info <expansion>           show which placeholders an expansion provides
/papi reload                     reload PAPI and its expansions
```

**Testing**: verify a placeholder in game before you ship it, rather than waiting for players to report a problem.

```
/papi parse me %player_name%
```

This returns the resolved result directly; `me` means "use me as the context".

**Nested placeholders**: to feed the result of one placeholder into another placeholder's parameter, use `{}` for the inner one instead of `%%`:

```
%math_2_{player_health}%
```

The example above needs the math expansion and displays the player's health rounded to two decimal places.

**What else it can do**: some expansions go beyond fetching values — Math (arithmetic), CheckItem (inspect a player's items), JavaScript (run scripts) and Progress (build progress bars), for instance.

**Who needs it**: plugins whose whole purpose is to display other plugins' data — TAB, scoreboards, holograms, menus, chat formatting, MOTD — rely on PAPI. It is one of the first plugins worth installing on any plugin server.

## 6. ProtocolLib

**What it is**: ProtocolLib provides low-level access to the Minecraft network protocol (packets), letting plugins intercept, modify or send packets in order to do things the Bukkit API does not expose.

**Who needs it**: it exists **for plugin developers**. As a server owner you never configure it — if a plugin requires ProtocolLib, install it and move on.

| Item | Detail |
| --- | --- |
| Configuration required | None; install and go |
| Version choice | Use 5.0.0 for 1.8 through 1.19.4; use the latest release for newer versions |
| Common tweak | In `plugins/ProtocolLib/config.yml`, set `auto updater.notify` to `false` to silence update notices |

:::warn Versions must match
ProtocolLib manipulates the server's internals directly, so **a version mismatch can break or even crash the whole server** rather than just the plugin that needs it. When you upgrade your server core, check it at the same time.
:::

## 7. LuckPerms

**What it is**: LuckPerms is the most widely used **permissions plugin**. It manages who may run which command, who may enter which world, and what prefix a player displays. It supports Bukkit/Spigot/Paper, BungeeCord, Velocity, Sponge, Fabric and more.

**Core concepts**:

| Concept | Purpose |
| --- | --- |
| Permission node | The smallest unit, such as `essentials.fly`; `true` allows, `false` denies |
| Group | A named set of permissions, such as `default`, `vip` or `admin` |
| Inheritance | Groups can inherit from other groups, so `admin` inheriting `vip` avoids duplication |
| Context | Restricts a permission to a particular world, server or game mode |
| Prefix / suffix (meta) | Display information read by chat and TAB plugins |

**Common commands**:

```
/lp user <player> permission set <node> true
/lp group <group> permission set <node> true
/lp group <group> parent add <parent-group>
/lp user <player> parent add <group>
/lp editor
```

`/lp editor` produces a link to a web editor. Editing permissions graphically is far more intuitive than typing commands, and saving applies the changes.

**Storage**: the default is file-based storage (H2/SQLite) under `plugins/LuckPerms/`. **When several servers share one set of permissions you must switch to a database such as MySQL/MariaDB**, otherwise each server keeps its own copy.

**How it relates to Vault**: LuckPerms registers a permission service with Vault, so plugins that check permissions through Vault work as soon as LuckPerms is installed, with no extra configuration.

:::note Who actually displays the prefix
LuckPerms only stores prefixes; it **does not display them**. What puts a prefix into chat or the tab list is a chat plugin (TrChat, Carbon) or a TAB plugin, reading the meta information from LuckPerms.
:::

## 8. Installation Order and Pairings

Install dependencies **first, then restart**, and only afterwards install the plugins that need them. A typical starting order:

| Order | Plugin | Why here |
| --- | --- | --- |
| 1 | LuckPerms | Permissions are the basis on which other plugins decide what is allowed |
| 2 | An economy plugin (XConomy / EssentialsX / CMI) | Gives Vault a real economy to talk to |
| 3 | Vault | Provides the shared interface for economy, permissions and chat |
| 4 | PlaceholderAPI | Then download the expansions you need |
| 5 | ProtocolLib | Only when a plugin explicitly requires it |
| 6 | Everything else | Shops, menus, tags, TAB and so on |

:::tip Verify after each install
Restart after each dependency and confirm it shows green in `/plugins`. Dropping a dozen plugins in at once multiplies the cost of troubleshooting when something breaks.
:::

## 9. Troubleshooting Checklist

| Check | How to confirm |
| --- | --- |
| Is the dependency actually in `plugins/`? | Check the file name and that the extension is `.jar` |
| Is a hard dependency missing? | Search the console for `Unknown dependency` |
| Is a soft dependency missing? | The feature does nothing but the plugin is green; check the docs for what it depends on |
| Do the versions match? | Compare against the server and dependency versions stated on the download page |
| A placeholder is not resolving | Confirm PAPI is installed and the expansion downloaded, then test with `/papi parse me` |
| Economy is unavailable | Confirm Vault **and** an actual economy plugin are installed |
| Permissions have no effect | Check the verdict with `/lp user <player> permission check <node>` |
| A change did not take effect | Use the plugin's own reload command, or simply restart |

## Next Step

Once the dependencies are in place, you will want to configure them: see [Plugin Configuration Basics](/tutorials/java/plugin-config). If you have not installed any plugins yet, start with [Getting Started with Plugins](/tutorials/java/plugins); for the full permissions workflow, read it alongside [Common Server Commands](/tutorials/java/commands).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
