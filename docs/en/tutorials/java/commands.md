---
title: Common Server Commands
slug: commands
cat: java
level: 1
order: 9
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, commands, op, ban, whitelist, console]
updated: 2026-10-04
draft: false
---

Day-to-day server administration comes down to the same handful of commands. **In the server console you do not prefix them with `/`**; in the in-game chat box you do.

## 1. Starting, Stopping and Saving

| Command | Purpose |
| --- | --- |
| `stop` | **Safely shut down** the server (saves first, then exits). **Always use it to stop the server; never just close the window** |
| `save-all` | Save all world data immediately |
| `save-off` / `save-on` | Turn automatic saving off / back on (**turn it off before backing up**, so you do not capture a half-written save) |
| `reload` | Reload data packs and part of the configuration. **Use with caution**: it can leave plugins in an inconsistent state, so use a plugin's own `reload` whenever you can |
| `restart` | Restart the server (supported by some cores) |

:::tip The standard way to shut down
`save-all` → `save-off` → back up → `stop`. Closing the window directly can corrupt the save or roll data back.
:::

## 2. Player Management

| Command | Purpose |
| --- | --- |
| `list` | List the players **currently online** |
| `kick <player> [reason]` | Kick a player; **they can still rejoin** |
| `ban <player> [reason]` | Ban a player; **they cannot get back in until unbanned** |
| `pardon <player>` | Unban a player (older versions may use `unban`) |
| `ban-ip <IP>` | Ban by IP (**nobody on that IP can get in**; use with caution) |
| `pardon-ip <IP>` | Unban an IP |
| `op <player>` | Grant OP (administrator) rights |
| `deop <player>` | Revoke OP |

### Whitelist

```
whitelist on                  Enable the whitelist
whitelist add <player>        Add a player
whitelist remove <player>     Remove a player
whitelist list                Show the list
whitelist reload              Re-read from whitelist.json
```

Changes made with these commands are written to `whitelist.json`; if you **edited that file directly**, remember to run `whitelist reload` to apply it.

## 3. Plugins and Troubleshooting

| Command | Purpose |
| --- | --- |
| `plugins` (short form `pl`) | List plugins. **Green = loaded**, **red = failed to load** (check the console for the error) |
| `version <plugin>` | Show a plugin's version |
| `help` | Help |

If a plugin **does not even show up in red**, the server never recognised it as a plugin at all — usually because the file is not in `plugins/`, has the wrong extension, or targets the wrong type of core.

### Hiding the Plugin List from Players

The `plugins`, `version` and `help` commands are open by default and anyone can run them. To close them off, set the following permission nodes to `false`:

```
bukkit.command.plugins
bukkit.command.version
bukkit.command.help
```

:::warn Disabling the commands does not make them invisible
Some cheat clients can infer which plugins are installed from the responses to **Tab completion**. If this really matters to you, install an additional hiding plugin (such as PluginHide) to deal with it.
:::

## 4. Common In-Game Administration Commands

| Command | Purpose |
| --- | --- |
| `gamemode <mode> [player]` | Change the game mode |
| `tp <player> <target>` | Teleport |
| `give <player> <item> [amount]` | Give items |
| `time set day` / `weather clear` | Set the time / weather |
| `difficulty <difficulty>` | Change the difficulty |
| `gamerule <rule> <value>` | Change a game rule |
| `say <message>` | Broadcast as the server |
| `whitelist` / `op` and so on | As above (OP required in game) |

## 5. Permissions and Tab Completion

- Vanilla servers control permissions with **OP levels**. Once you install a permission plugin (such as LuckPerms), switch to **permission nodes plus permission groups** for fine-grained control, which is far safer than handing out OP.
- **Tab completion** suggests commands and arguments, and it is the fastest way to check whether a command actually exists. Players can also use it to discover which plugins the server has installed (see above).

## Next Step

Once you are comfortable with the commands, it is time for tools and plugins: see [The MCDR Server Manager](/tutorials/java/mcdr) and [Getting Started with Plugins](/tutorials/java/plugins).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
