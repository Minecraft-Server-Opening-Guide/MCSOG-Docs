---
title: Command Cheat Sheet (Java / Bedrock / Management Layers)
slug: commands
cat: wiki
level: 2
order: 3
minutes: 12
tags: [commands, cheat-sheet, java, bedrock, mcdr, console, permissions]
updated: 2026-10-04
draft: false
---

This page is a lookup table for three layers of commands: **Java Edition server commands**, **Bedrock Edition commands (BDS and third-party cores)**, and the **management layer that sits outside the server** (MCDR, panel consoles, RCON).

The "Permission" column lists the **vanilla default**: OP levels on Java Edition, and operator status plus the cheats toggle on Bedrock. Once a permissions plugin such as LuckPerms is installed, real access is decided by permission nodes, which may be broader or narrower than vanilla.

> Whether a command exists, and at what permission level, **changes with the game version and the core you run**: the same name may be missing on another core, or redefined by it. Before relying on any command, defer to the official documentation for the server software and game version you actually run.

:::note Three things to remember first
- **The console usually does not need a leading `/`**; the in-game chat box always does.
- **The console is the highest privilege identity**; in game it depends on your OP level or permission nodes.
- **Java Edition and Bedrock Edition are two different command sets.** The same name does not mean the same behaviour, and `save-all` has no Bedrock equivalent at all.
:::

## 1. Three Rules Before You Read the Tables

| Rule | What it means |
| --- | --- |
| Version dependent | Commands are added and removed between versions (a command such as `/tick` only exists in newer releases), so old tutorials may no longer work |
| Core dependent | `plugins`, `version`, `tps` and `restart` are **not vanilla commands**; the Spigot / Paper family provides them, and vanilla does not |
| Plugin dependent | A permissions plugin can rewrite vanilla nodes, and an alias plugin can rename commands outright |

The fastest way to find out whether a command really exists is to type `/` in game and read the Tab-completion list, or type the first few letters at the console and watch what completes. If it is not in the completion list, the core has not registered it.

## 2. Java Edition: Lifecycle and Saving

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `stop` | Shut down safely: save first, then exit | OP 4 / console | **The only correct way to stop**; never close the window or kill the process |
| `save-all` | Save all world data now | OP 4 / console | Accepts `flush` to force writes to disk |
| `save-off` | Turn automatic saving off | OP 4 / console | Do this before a backup so you do not capture a half-written world |
| `save-on` | Turn automatic saving back on | OP 4 / console | Remember to restore it after the backup |
| `reload` | Reload data inside enabled data packs | OP 2 (may differ by version) | **Not a restart and not a config reload**; see the warning below |
| `restart` | Restart the server | Core dependent | Provided by the Spigot / Paper family; vanilla has no such command |

The standard shutdown order is `save-all` then `save-off`, then back up, then `stop`. Once the process has exited there is nothing to re-enable.

:::warn `/reload` is not a full reload, and it can break plugins
On Java Edition, `/reload` reloads **only the data inside currently enabled data packs**. It does **not**:

- re-read `server.properties` (port, difficulty and similar settings need a restart);
- restart the server process or reload plugin code;
- return plugin registrations to a clean state.

It **can**, however, leave plugins inconsistent: scoreboards, listeners, caches and registered commands may end up half old and half new, which shows up as "everything looked fine until I reloaded". When a plugin's own `/pluginname reload`, `/datapack enable` or `/datapack disable` will do the job, prefer those; when the change is large or the impact is unclear, use a maintenance window and restart instead.

Bedrock's command of the same name is narrower still (it reloads functions and scripts from behaviour packs). On both editions `reload` is **not** a "refresh the server configuration" button.
:::

## 3. Java Edition: Players, Bans and the Allowlist

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `list` | List players currently online | Everyone | The everyday "is anyone on" command |
| `kick <player> [reason]` | Kick a player | OP 3 / console | A kicked player **can rejoin** |
| `ban <player> [reason]` | Ban a player | OP 3 / console | They stay out until pardoned |
| `pardon <player>` | Unban a player | OP 3 / console | Very old versions called this `unban` |
| `ban-ip <ip>` | Ban by IP address | OP 3 / console | **Everyone behind that IP is locked out**; use with care |
| `pardon-ip <ip>` | Unban an IP | OP 3 / console | Confirm who holds that IP today before lifting the ban |
| `banlist [ips\|players]` | Show the ban list | OP 3 / console | Without an argument it lists players |
| `op <player>` | Grant operator | OP 3 / console | Give it only where needed; OP is far blunter than a permission node |
| `deop <player>` | Revoke operator | OP 3 / console | Under a permissions plugin, OP can still bypass groups |
| `whitelist on` | Enable the allowlist | OP 3 / console | Add yourself first |
| `whitelist add <player>` | Add a player | OP 3 / console | Writes to `whitelist.json` |
| `whitelist remove <player>` | Remove a player | OP 3 / console | Takes effect on their next connection |
| `whitelist list` | Show the list | OP 3 / console | Matches the contents of `whitelist.json` |
| `whitelist reload` | Re-read the list from disk | OP 3 / console | **Required after editing `whitelist.json` by hand** |

The relevant files are `whitelist.json` for the allowlist, plus `banned-players.json`, `banned-ips.json` and `ops.json`. Commands write to them immediately; hand edits need the matching reload or a restart.

## 4. Java Edition: World, Time and Game Rules

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `tp <player> <target>` | Teleport a player | OP 2 / console | The full name is `teleport`; from the console both arguments are required |
| `gamemode <mode> [player]` | Change game mode | OP 2 / console | Values are `survival`, `creative`, `adventure`, `spectator` |
| `gamerule <rule> <value>` | Change a game rule | OP 2 / console | Rule names come and go; **confirm with Tab completion** |
| `time set day` | Set the time | OP 2 / console | Also `noon`, `night`, `midnight`, or a numeric value |
| `time add <amount>` | Advance the time | OP 2 / console | Better than `set` when testing day and night mechanics |
| `weather clear` | Set the weather | OP 2 / console | Values are `clear`, `rain`, `thunder`, optionally with a duration |
| `difficulty <level>` | Set the difficulty | OP 2 / console | Values are `peaceful`, `easy`, `normal`, `hard` |
| `give <player> <item> [count]` | Give an item | OP 2 / console | Item IDs and component syntax change between versions |
| `seed` | Show the world seed | OP 2 / console | Tied to the world; a different world means a different number |
| `say <message>` | Broadcast as the server | OP 2 / console | Players see the server message style |
| `tell <player> <message>` | Private message | Everyone | Aliases `msg` and `w` |
| `datapack list` | List data packs | OP 2 / console | Used together with `/reload` |

`gamerule` is the most commonly misused command here: **the same rule name may mean different things on Java and Bedrock, and rules get renamed or split between versions.** Check the completion list before you change anything, then watch the log and ask players what actually changed.

## 5. Java Edition: Status and Troubleshooting

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `tps` | Show TPS | OP | **Not vanilla**: the Spigot / Paper family ships it; with spark installed it may be taken over |
| `mspt` | Show milliseconds per tick | OP | Provided by the Paper family; read it together with TPS |
| `spark tps` | Show TPS through spark | OP | spark's command tree is finer grained than the core's own |
| `spark profiler start` | Start a profiling run | OP | Results are uploaded and linked by default; consider the data exposure |
| `spark profiler stop` | Stop and view the result | OP | Use `spark profiler cancel` to stop without uploading |
| `plugins` | List plugins | OP / node | Alias `pl`; green means loaded, red means the load failed |
| `version <plugin>` | Show a plugin version | OP / node | The first thing a bug report will ask for |
| `help` | Show command help | Everyone | Paged; `/help <command>` describes one command |

Vanilla has **none** of `tps`, `mspt`, `plugins` or `version`. On vanilla you read performance from the log and external tools, which is why so many people discover "new commands" after switching cores. For the full workflow see [Analysing Server Performance with spark](/tutorials/ops/spark).

:::tip Permission nodes can also hide commands
The nodes behind `plugins`, `version` and `help` are open to everyone by default. To close them, set `bukkit.command.plugins`, `bukkit.command.version` and `bukkit.command.help` to `false`. But **hiding a command does not hide the plugin**: some clients can infer installed plugins from Tab-completion responses.
:::

## 6. Bedrock Edition: The Same Families on BDS

Bedrock Edition (BDS and third-party cores) has its own command set. **Availability depends on two things at once**: whether you hold operator status, and whether cheats are enabled on the server.

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `stop` | Shut the server down safely | Console | Same name and meaning as Java; the one to memorise |
| `save hold` | Pause writes and keep files consistent | Console | Step one of a Bedrock backup |
| `save query` | List the files to copy | Console | Copy exactly what it reports |
| `save resume` | Resume writes | Console | Run it when the copy is done |
| `whitelist on` / `off` | Toggle the allowlist | Operator | The backing file is `allowlist.json` |
| `whitelist add` / `remove` / `list` / `reload` | Maintain the allowlist | Operator | Reload after editing the file by hand |
| `op` / `deop` | Grant / revoke operator | Operator | Recorded in `permissions.json` |
| `permission list` | Show current permissions | Operator | Mirrors `permissions.json` |
| `permission reload` | Re-read the permission file | Operator | Run it after hand-editing `permissions.json` |
| `kick <player> [reason]` | Kick a player | Operator | Same meaning as Java |
| `ban` / `pardon` | Ban / unban a player | Operator | Bans are per player (gamertag / XUID); **there is no IP-ban equivalent** |
| `tp` / `teleport` | Teleport | Operator | Close to the Java syntax but not identical |
| `gamemode` | Change game mode | Operator | Values are similar to Java |
| `gamerule` | Change a game rule | Operator | The rule set **differs** from Java, and shared names can mean different things |
| `time set` / `time add` | Set / advance time | Operator | Bedrock also has commands such as `daylock` |
| `weather clear` / `rain` / `thunder` | Set the weather | Operator | There is also `toggledownfall` |
| `difficulty` | Set the difficulty | Operator | Same name as Java |
| `list` | List players online | Operator | Some versions allow ordinary players; confirm with completion |

Some of these commands were **added in newer releases** (the `ban` / `pardon` pair is a clear example), so on an older Bedrock server they may not appear in the completion list at all. **The only reliable way to know whether a command exists on your version is Tab completion plus the official documentation**; do not copy a version number from somewhere else.

One BDS setting directly controls commands: `allow-cheats` in `server.properties`. With it off, in-game commands are restricted. Confirm the default in the file your own server generated, and remember that a change only takes effect after a restart. **Most "the command does not work" reports on Bedrock are really about the cheats toggle or operator status, not about the command being typed wrongly.**

The Bedrock backup flow is completely different from Java's and can be copied directly:

```text
save hold
save query
# copy the files query reports (take the whole worlds/ directory)
save resume
```

## 7. What Bedrock Does Not Have, or Defines Differently

| Java command | Bedrock status | Explanation |
| --- | --- | --- |
| `save-all` | Does not exist | Use `save hold` / `save query` / `save resume` |
| `save-off` / `save-on` | Does not exist | Bedrock has no "pause automatic saving" pair |
| `ban-ip` / `pardon-ip` | Does not exist | Bedrock bans players, not addresses |
| `plugins` / `version <plugin>` | Does not exist | No unified plugin-listing command; read the console output |
| `tps` / `mspt` | Does not exist | No TPS command on Bedrock; judge performance from logs and external observation |
| `reload` | Exists but **means something else** | It reloads functions and scripts from behaviour packs, **not `server.properties`**, and it is not a restart |
| `gamerule` | Exists but the **rule set differs** | Shared names can behave differently; copying across editions breaks things |
| `difficulty` / `time` / `weather` | Exist | Both editions have these, with similar syntax |

:::warn Read "Bedrock has no /reload" carefully
What the community usually means by "Bedrock has no `/reload`" is that **there is no reload that re-reads the server configuration** — and that part is correct: after editing `server.properties` on Bedrock you must restart the server (stop it cleanly from the console, then start it again; do not kill the process).

Bedrock does, however, have a command named `reload`, and its scope is the functions and scripts inside behaviour packs. It is **not** the same thing as Java's data-pack reload, and it will not make the server re-read its configuration files. On both editions, do not treat `reload` as a universal refresh key; the exact scope and behaviour vary by version, so follow the official documentation.
:::

## 8. Management Layer: `!!MCDR` Subcommands

MCDReforged (MCDR) is a manager that wraps the server process: it hosts the core, parses console output, and exposes a family of `!!` commands. These are **not game commands**; MCDR handles them itself and they never reach the server.

| Command | Purpose | Permission | Notes |
| --- | --- | --- | --- |
| `!!MCDR` | Main command; lists available subcommands | MCDR permission system | The `!!` prefix is configurable |
| `!!MCDR status` | Show MCDR status | MCDR permission | First check when "is the manager still alive" |
| `!!MCDR reload config` | Reload the MCDR configuration | MCDR permission | Short forms exist, such as `!!MCDR r cfg` |
| `!!MCDR reload plugin` | Reload plugins | MCDR permission | Separate from reloading the configuration |
| `!!MCDR reload permission` | Reload permission data | MCDR permission | Use it after editing permission files |
| `!!MCDR reload all` | Reload everything | MCDR permission | The first thing to try when something is off |
| `!!MCDR plugin list` | List loaded plugins | MCDR permission | Unrelated to Java's `/plugins` |
| `!!MCDR plugin load <plugin>` | Load a plugin | MCDR permission | The argument is the plugin id |
| `!!MCDR plugin reload <plugin>` | Reload one plugin | MCDR permission | Lighter than a full restart |
| `!!MCDR plugin unload <plugin>` | Unload a plugin | MCDR permission | Unloading is not deleting the files |
| `!!MCDR plugin install <plugin>` | Install from the official repository | MCDR permission | For example `!!MCDR plugin install ndpr` |
| `!!MCDR permission list` | Show permissions | MCDR permission | Per player and per group |
| `!!MCDR permission set` | Set a permission | MCDR permission | Exact syntax follows the official documentation |
| `!!MCDR permission remove` | Remove a permission | MCDR permission | |
| `!!MCDR checkupdate` | Check for an MCDR update | MCDR permission | Whether it runs automatically is a configuration option |

:::warn MCDR subcommands change between versions
Subcommands and their abbreviations are adjusted between MCDR releases (short forms such as `!!MCDR reload config` are easy to misremember), so **follow the MCDR official documentation and the help that `!!MCDR` prints on your own machine**. Note also that MCDR permissions are their own system, unrelated to in-game OP levels: which `!!` commands a player may run depends on the MCDR permission configuration.
:::

## 9. Management Layer: Panel Consoles and RCON

A panel console (MCSManager, Pterodactyl and similar) is essentially **a remote standard input**: what you type is delivered verbatim to the server process, exactly as if you were sitting at the machine.

| Channel | Leading `/` | Permission | Notes |
| --- | --- | --- | --- |
| Local console | Usually not needed | Highest privilege | The vanilla console is not limited by OP levels |
| Panel web console | Most panels accept both | Highest privilege | Some panels strip a leading `/`; follow the panel's own behaviour |
| RCON | Usually not needed | Highest privilege | Must be enabled in `server.properties` with a password |
| In-game chat | Required | OP level or permission nodes | Also subject to the allowlist, bans and permissions plugins |

Three practical rules:

1. **Always stop the server with `stop`** (on Bedrock too). Do not click "terminate process" in a panel: a hard kill can lose data or damage the world.
2. **Never expose RCON to the internet.** It is an unauthenticated "run any command" channel; bind it to loopback or an internal address and use a long, unique password.
3. **A panel console runs at full privilege.** Think about that before handing a panel account to a co-admin.

## 10. Console Versus In-Game: The Differences That Matter

| Difference | Console / RCON | In-game chat |
| --- | --- | --- |
| Leading slash | Usually omitted | Required |
| Source of privilege | Process identity, effectively maximum | OP level or permission nodes |
| Execution context | **No executor**: `@s`, relative coordinates and `tp` without a target do not work | Has an executor, so selectors and relative coordinates work |
| Where output goes | Terminal and log files | Chat and action bar |
| Tab completion | Usually available; some panels lack it | Available |
| Character encoding | A wrong Windows code page garbles non-ASCII text | Normally fine |
| Player visibility | Players cannot see what you typed | Some commands broadcast to players |

The classic trap is running `/tp ~ ~10 ~` from the console: the console has no position, so the command always fails. From the console, **always name both the player and the destination**.

## 11. Where Permissions Come From

| System | Applies to | How it is controlled |
| --- | --- | --- |
| OP levels | Vanilla Java Edition | `/op` grants level 4; levels 1 to 4 cover different command groups and can be refined with permission nodes |
| Permission nodes | Java Edition plugin servers | A permissions plugin such as LuckPerms assigns nodes and groups; safer than handing out OP |
| Operator plus cheats | Bedrock Edition | `permissions.json` decides who is an operator; `allow-cheats` in `server.properties` decides whether commands work |
| MCDR permissions | Servers running MCDR | MCDR's own system, per player and per group, for `!!` commands |

**The principle is minimum privilege**: if you can grant one command, do not grant OP; if you can grant a time-limited role, do not grant it permanently. OP is machine-level trust, while permission nodes are the fine-grained alternative.

## 12. Combinations You Can Copy Directly

Standard pre-maintenance sequence (Java Edition):

```text
say The server enters maintenance in 5 minutes
save-all
save-off
# now archive the world and plugin directories externally
stop
```

Bringing an allowlist up from nothing (Java Edition):

```text
whitelist add YourName
whitelist on
whitelist list
```

Bedrock backup and resume:

```text
save hold
save query
# copy the files query reports; take the whole worlds/ directory
save resume
```

First commands to run when a player "cannot get in":

```text
list
whitelist list
banlist players
plugins
```

## 13. Common Misuse

| Mistake | Consequence | Correct approach |
| --- | --- | --- |
| Closing the window or clicking "terminate" | The world may be damaged or roll back | Run `stop` from the console |
| Treating `/reload` as a restart | Plugin state breaks and configuration does not apply | Use the plugin's own reload; restart when needed |
| Backing up without `save-off` | The backup captures a half-written world | `save-all`, then `save-off` |
| Using `~` relative coordinates at the console | The command simply fails | Name the player and coordinates explicitly |
| Publishing RCON to the internet | You have handed the server to scanners | Bind to loopback or an internal address with a strong password |
| Editing `whitelist.json` without reloading | The change does not apply | Run `whitelist reload` |
| Using Bedrock `gamerule` names on Java | The rule is missing or means something else | Confirm rule names with Tab completion |
| Assuming Bedrock has `save-all` | The command does not exist | Use `save hold` / `save query` / `save resume` |

## Next Steps

- Configuration and tuning after the commands: see [Configuring the Server](/tutorials/java/config) and [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison)
- Automation with MCDR: see [The MCDR Server Manager](/tutorials/java/mcdr)
- How to read what the performance commands report: see [Analysing Server Performance with spark](/tutorials/ops/spark)

> Command and version details follow the official documentation for the corresponding server software and the game.
