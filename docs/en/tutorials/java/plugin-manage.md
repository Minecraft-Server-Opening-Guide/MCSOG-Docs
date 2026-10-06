---
title: Plugin Management and Security Hygiene
slug: plugin-manage
cat: java
level: 3
order: 20
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, plugins, plugin-management, security, backdoor, malware]
updated: 2026-10-04
draft: false
---

A server's plugin folder only ever grows. Dropping a jar into `plugins/` takes seconds; the awkward part comes later, when one plugin needs upgrading, another has to be switched off in a hurry, and a third one looks slightly wrong. This article covers three things: a disciplined install/update/remove routine, what hot-reload tools can and cannot do, and how to tell whether a plugin has been tampered with.

If you have never installed a plugin before, read [Getting Started with Plugins](/tutorials/java/plugins) first.

## 1. Installing, Updating and Removing Plugins Properly

### Installing

1. Confirm the source is trustworthy (see section 5), and note down the version and download URL.
2. **Stop the server.** Most plugins cannot be hot-loaded on their first start.
3. Back up the `plugins/` directory; see [Backup and Recovery](/tutorials/java/backup).
4. Put the `.jar` into `plugins/`.
5. Start the server and watch the console: both successful and failed loads are reported there.
6. Confirm the load status with the `plugins` command.
7. Only then edit the configuration, and prefer the plugin's own `reload` subcommand over the vanilla `/reload`.

### Updating

Updating breaks things more often than installing, because the configuration format may have changed.

| Step | What matters |
| --- | --- |
| Read the changelog | Check for configuration changes and for data that needs migrating by hand |
| Back up | At minimum `plugins/<plugin-name>/`, plus the database if the plugin uses one |
| Keep the old jar | Rename it to `.jar.bak` and hold on to it until the new version is proven |
| Stop before replacing | Never overwrite a jar that is currently in use |
| Restart and verify | Watch the console, then confirm with `plugins` |
| Large version jumps | When crossing a major version (say 1.20 to 1.21) the plugin may need an intermediate release first |

### Removing

Removing a plugin is not the same as deleting its jar.

1. Stop the server.
2. Move the jar out.
3. Do **not** delete the data folder straight away; rename it to `<plugin-name>.bak` and leave it for a while.
4. Check whether another plugin depends on it, and deal with that dependency too.
5. Remove the permission nodes it left behind in your permissions plugin.
6. Clean up scheduled tasks, custom commands and scoreboard entries it registered.
7. Watch out for custom items or blocks it placed in the world, which may now throw errors.

:::warn Removing is not cleaning up
Deleting the jar only settles the "loading" part. The data folder, the permission nodes, the database tables and every other plugin's dependency on it are all still there.
:::

## 2. Hot-Reload Tools: PlugManX and ServerUtils

Tools in this family are usually called **plugin managers**: they can load, unload and reload other plugins while the server is already running.

### PlugManX

A long-standing plugin manager. It began as PlugMan and continues as the community-maintained PlugManX.

| Item | Information |
| --- | --- |
| Distribution | SpigotMC resource 88135 |
| Source | Test-Account666/PlugManX on GitHub (the older project was ryan-clancy/PlugMan) |
| Common subcommands | `load`, `unload`, `reload`, `list`, `info`, `check` |
| Typical usage | `/plugman <subcommand> <plugin-name>` |

Exact subcommand names and arguments vary between releases, so trust the plugin's own help output.

### ServerUtils

| Item | Information |
| --- | --- |
| Distribution | SpigotMC resource 79599, Modrinth |
| Source | frankheijden/serverutils on GitHub |
| Platforms | Spigot, BungeeCord, Velocity |

Beyond plugin management it bundles some server inspection utilities. Because it also runs on proxies, a network can manage plugins at the proxy layer instead of installing it on every backend.

### Where hot reloading actually stops

Hot reloading is not a substitute for restarting. There is a well-defined list of things it cannot do:

| Situation | Can hot reloading handle it? |
| --- | --- |
| A configuration change only | Yes, use the plugin's own `reload` |
| Temporarily disabling a misbehaving plugin | Yes, and this is its most valuable use |
| Swapping in a new plugin version | Not advisable; stop the server and replace the jar |
| The plugin registers commands, permissions, listeners, recipes, world generators or advancements | Leftovers usually remain after unloading, and reloading tends to misbehave |
| The plugin patches server internals (NMS, reflection) | Essentially no |
| The plugin holds database connections, thread pools or large static caches | Resources are usually not released on unload |
| Loading and unloading the same plugin repeatedly | Its class loader cannot be collected, memory climbs and you eventually hit an OOM |
| Hybrid or modded servers | A plugin manager cannot manage mods |
| The vanilla `/reload` command | Not recommended; it easily leaves plugins in an inconsistent state |

:::warn Do not rely on hot reloading alone in production
Hot reloading is for "switch a plugin off and see whether the symptom goes away" and for trying configuration quickly. Real version upgrades and dependency changes should still go through a full stop-and-restart.
:::

:::tip The right way to use it when troubleshooting
Unload the plugins you installed most recently and watch whether the symptom disappears. Once you have your culprit, handle it properly with a restart. This is far faster than reading the logs end to end.
:::

## 3. What a Backdoored Plugin Looks Like

Plugins are third-party code running with server privileges, so a backdoor hands your server to someone else. The following signals deserve attention.

| Signal | What you actually see |
| --- | --- |
| Strange permissions or commands | `plugin.yml` declares high-risk commands unrelated to the plugin's purpose, such as granting OP, running arbitrary commands or reading and writing arbitrary files |
| Obfuscated code | Meaningless single-letter or `a/b/c` class names, or a jar that is encrypted and decrypted at runtime by a custom class loader |
| Suspicious runtime calls | Spawning child processes (`ProcessBuilder`, `Runtime.exec`), reaching out to the network (`URL.openConnection`, HTTP requests), editing `ops.json` directly, or loading remote classes through reflection |
| A disguised "updater" | Claims to update itself automatically but in fact downloads from the author's own server and overwrites the jar |
| Unknown origin | Jars passed around as forum attachments, file-sharing links or chat group uploads |
| "Free premium plugin" | A paid plugin cracked and repackaged, and the cracker usually added something of their own |
| Mismatch with upstream | Same name and version, but a different file size or hash, or an edited author and website in `plugin.yml` |
| Harmless-sounding hidden options | Default-enabled `metrics`, `telemetry` or `update-check` toggles that are in fact shipping data out |

:::warn Never judge a plugin by its name
Backdoored plugins routinely borrow the name and version number of a well-known plugin. What matters is where the file came from and what is inside it, not what it is called.
:::

## 4. Safe Download Sources

| Source | Risk |
| --- | --- |
| Mainstream platforms such as SpigotMC, Modrinth, Hangar and Bukkit Dev | Low; prefer these |
| The author's own GitHub releases | Low; make sure the repository owner is really the author |
| The official store page for a paid plugin | Low; beware of resellers |
| Aggregator or mirror sites | Medium; they may repackage the jar, so verify the file hash |
| Forum attachments, file-sharing links, chat group uploads | High |
| "Free premium plugins" on second-hand marketplaces | Extremely high; this is the worst offender |

The test is simple: **can you trace the file back to a release the author published themselves?** The number of sites a plugin appears on tells you nothing about its safety.

:::tip Install only what you need
Fewer plugins means a smaller attack surface and an easier time troubleshooting. If two plugins overlap, keep one.
:::

## 5. A Practical Procedure for a Suspected Plugin

1. **Record the symptoms**: when it started, what the console reports, whether players have noticed anything odd.
2. **Back up first**: take a full backup, including `plugins/` and the world data, before touching anything.
3. **Draw up a suspect list**: every plugin added or updated in the last 24 to 72 hours.
4. **Bisect**: stop the server, disable half the suspects, restart and observe. If the symptom is gone it is in the disabled half, otherwise in the other half.
5. **Reproduce in isolation**: once you are down to one plugin, unload only that one with the plugin manager and check whether the symptom returns.
6. **Scan statically**: run the scan described in section 6.
7. **Read `plugin.yml` by hand**: check `author`, `website`, `main`, `commands` and `permissions` against the official release.
8. **List the class files**: unpack the jar and look for meaningless class names and for the suspicious calls listed above.
9. **Compare hashes**: check the file size and hash against the official download.
10. **If it is malicious, move to the incident checklist.**

Incident checklist:

- Check whether `ops.json` and `whitelist.json` were modified, and whether an unknown account gained OP.
- Look for unusual login records or unfamiliar player data files.
- Rotate every credential: RCON password, panel password, database password, SSH keys.
- Check whether extra jars were dropped into `plugins/`, and whether the server core jar or the startup script was replaced.
- Check operating-system level scheduled tasks for anything set to run at boot.
- Read the console and plugin logs to pin down when the backdoor first became active.
- Notify players and roll back if necessary, keeping the evidence intact for analysis first.

## 6. Static Scanning with McGuard

McGuard (MCG) is a third-party static analysis tool by huzpsb. It scans every jar under `plugins/` **without starting the server** and flags anything suspicious.

### Console mode

Put the MCG jar in the server root directory and run this from that directory:

```
java -Xmx1G -jar MCG.jar
```

It then asks you to pick a mode. `0` (standard) is usually enough; expert and developer modes also exist.

Results are reported as follows:

| Outcome | Output |
| --- | --- |
| Nothing detected | Only the scanning progress is printed; no result block appears |
| Something detected | A result block appears, listing each finding with a severity level and a description |

The description names the behaviour it matched, for example that the class may obtain OP by setting permission bits, or may run remote commands by launching a child process.

:::warn MCG reports, it does not act
It neither modifies nor deletes plugins, so cleaning up is your job. Note also that expert mode matches known malicious code signatures and analyses intent, which covers most samples that do not deliberately evade scanning, but false positives do occur.
:::

### Plugin mode

MCG can also be installed as a Bukkit/Spigot plugin to provide continuous protection while the server runs. The project is explicit that this protection is relative: a small number of malicious plugins may still slip past its behaviour controls, and you should **never run a server containing a known-malicious plugin just because MCG is installed**.

:::warn Scanning is the last line of defence
No scanner removes every risk, and the real answer is still to get plugins from legitimate sources. If you intend to run a server core of unknown origin, scan it in console mode first and then try it in an isolated environment such as a sandbox.
:::

## 7. Routine Maintenance

- Check for plugin updates at least once a month, especially for security-relevant ones such as cross-version compatibility and anti-cheat.
- Keep a plugin inventory recording name, version, source and download URL, so you can trace things back when something goes wrong.
- Separate production from testing, and let new plugins run on a test server for a while first.
- Do not run the server process as root or Administrator; give it a dedicated account with the least privilege it needs.
- Follow the author's repository issues and announcements; a poisoned plugin usually gets discussed in the community before you notice it yourself.

## Next Steps

- The basics of installing plugins and their dependencies: [Getting Started with Plugins](/tutorials/java/plugins)
- Investigating and preventing damage: [Anti-Cheat and Grief Prevention](/tutorials/java/anticheat)
- Recovering when things go wrong: [Backup and Recovery](/tutorials/java/backup)
- Letting players on other client versions join: [Cross-Version Compatibility](/tutorials/java/via)

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
