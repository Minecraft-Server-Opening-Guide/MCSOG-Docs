---
title: Java Edition Error and Crash Troubleshooting
slug: errors
cat: faq
level: 2
order: 3
minutes: 18
tags: [java, errors, crash, troubleshooting, plugins, logs, incompatibility]
updated: 2026-10-04
draft: false
---

This article is about **how to read an error and how to pin down an incompatibility**. It does not try to catalogue every possible exception. Instead it gives you an order of operations: first decide whether a plugin merely threw an exception while the server kept running, or whether the server actually died; then follow the stack trace to the root cause; then confirm it with a minimal test server.

Incompatibility is the most time-consuming class of failure on a Java Edition server, because it often gives you **no clear message at all**, or points at a class name that has nothing to do with the real problem. Wherever this article is not certain, it says "follow the official documentation" instead of inventing a plausible-sounding explanation.

## 1. How to Read an Error

### 1.1 Where the Logs Are

| Location | Contents | When to look |
| --- | --- | --- |
| `logs/latest.log` | Full console output of the current or most recent run | **Your first stop.** It is overwritten on every restart, so copy it out if you need the evidence |
| `logs/2026-10-04-1.log.gz` | Rotated, compressed history | The problem happened days ago and `latest.log` is already gone |
| `crash-reports/crash-...-server.txt` | Crash report: full stack trace, description, runtime environment | The server **exited abnormally** |
| The console window itself | Live output, scrolling fast | Watch it while the server runs; a crash pushes earlier lines out of view, so copy first |

For what each directory does, see [Server Directory Structure](/tutorials/java/structure).

:::tip Copy before you restart
`logs/latest.log` is overwritten the next time the server starts. **Before restarting**, copy `logs/latest.log` and the newest file in `crash-reports/` somewhere else, or your evidence is gone.
:::

Find the interesting lines quickly (Linux):

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

Windows PowerShell:

```powershell
Select-String -Path logs\latest.log -Pattern "ERROR|Exception|Caused by" | Select-Object -Last 40
Get-ChildItem crash-reports | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 1.2 Plugin Exception vs Fatal Crash

Keep these two apart, or you will get lost in a wall of red text that has nothing to do with the real problem.

| | Plugin exception (most cases) | Fatal crash |
| --- | --- | --- |
| Server state | Still running, players still online | Process exited, window closed or systemd unit stopped |
| End of the log | Normal tick output continues after the exception | Ends with `This crash report has been saved to: ...` |
| Typical markers | `Could not pass event ... to X`, `... has failed to load`, `... was disabled` | `Encountered an unexpected exception`, `Exception in server tick loop`, `Watching Server thread` |
| Blast radius | One plugin or one feature | The whole server |
| What to do | Fix, update or temporarily disable the plugin | Get the server booting first, then read the crash report |

Below is an **illustrative** plugin exception (the shape of one, not a real log). The server keeps running:

```text
[12:00:01 ERROR]: Could not pass event PlayerJoinEvent to MyPlugin v1.2.3
java.lang.NullPointerException: Cannot invoke "java.lang.String.toLowerCase()" because "name" is null
        at com.example.myplugin.JoinListener.onJoin(JoinListener.java:42) ~[MyPlugin-1.2.3.jar:?]
        at org.bukkit.plugin.java.JavaPluginLoader$1.execute(JavaPluginLoader.java:315) ~[paper-api.jar:?]
        at org.bukkit.plugin.RegisteredListener.callEvent(RegisteredListener.java:70) ~[paper-api.jar:?]
        ... 20 more
[12:00:02 INFO]: Player Steve joined the game
```

The important part is the last line: the server went on to handle the next event, which tells you the framework caught this one.

### 1.3 How to Read a Java Stack Trace

An **illustrative** trace with a `Caused by` chain:

```text
[12:00:05 ERROR]: Encountered an unexpected exception
java.lang.RuntimeException: Failed to load plugin data
        at com.example.core.DataLoader.load(DataLoader.java:88) ~[?:?]
        at com.example.core.CorePlugin.onEnable(CorePlugin.java:31) ~[?:?]
        at org.bukkit.plugin.java.JavaPlugin.setEnabled(JavaPlugin.java:280) ~[paper-api.jar:?]
        ... 18 more
Caused by: java.lang.NoSuchMethodError: 'void org.bukkit.configuration.file.FileConfiguration.setDefaults(org.bukkit.configuration.file.FileConfiguration)'
        at com.example.core.DataLoader.load(DataLoader.java:71) ~[?:?]
        ... 18 more
Caused by: java.lang.ClassNotFoundException: com.example.lib.RequiredLib
        at java.net.URLClassLoader.findClass(URLClassLoader.java:445) ~[?:?]
        ... 21 more
```

Reading it line by line:

- `[12:00:05 ERROR]:` is the log prefix (timestamp and level), not part of the error.
- `java.lang.RuntimeException: Failed to load plugin data` is the **outermost exception**. It is often just a wrapper; the real information is further down.
- `at package.Class.method(File.java:123)` is the call chain. **The top line is where the exception was thrown; further down is the framework that called into it.**
- `Caused by:` is the root-cause chain, and there can be several levels. **The last `Caused by` is the underlying original cause.**
- `... 18 more` means frames identical to the previous section were elided. It does not mean the log was truncated.
- `~[MyPlugin-1.2.3.jar:?]` is the source marker, telling you which jar a frame came from. `~[?:?]` means the source is unknown.

:::tip Read two lines, not two hundred
The two lines that matter are the **first exception's header line** and the **last `Caused by` header line**. The dozens of `at` lines in between are almost always framework internals. Once you have those two headers, look back for the **first `at` line that names your own plugin's package** — that is usually the code that went wrong.
:::

Line numbers exist so an author can find the code. If the failing plugin is yours, the line number takes you straight to the source. If it is a third-party plugin, the line number only tells you which feature failed, and no more.

Note also that `[MyPlugin]` prefixes in the log are printed by the plugin itself. **Searching the log for the plugin name** is far faster than reading the whole file.

### 1.4 What Mixin and Remap Errors Look Like

Mixin is SpongePowered's bytecode injection framework, used by Fabric, Forge, NeoForge, Sponge and some hybrid cores. Some plugins also use Mixin, or reference the server's internal implementation directly, to hook game logic.

The typical Mixin failure:

```text
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
Caused by: org.spongepowered.asm.mixin.throwables.MixinApplyError: Mixin [mymod.mixins.json:PlayerMixin] from mod [mymod] FAILED during APPLY
```

The typical failure when a plugin references server internals (NMS):

```text
java.lang.NoClassDefFoundError: net/minecraft/server/v1_20_R1/MinecraftServer
        at com.example.nmsplugin.NmsHook.<clinit>(NmsHook.java:17) ~[?:?]
Caused by: java.lang.ClassNotFoundException: net.minecraft.server.v1_20_R1.MinecraftServer
```

**Two features are enough to recognise this family**:

1. The message contains `mixin`, `MixinApplyError`, `InvalidMixinException`, `MixinTransformerError` or `mixin config`.
2. The message contains a package name such as `net.minecraft.server.v1_xx_Rx` or `org.bukkit.craftbukkit...` that is **versioned or points into the server's internals**.

Those names tell you the code was written **for one specific version and one specific loader**, and it is now running somewhere it never expected. **This is almost always a version mismatch, not a mistake in your configuration.**

:::warn Do not start with the config file
When you see Mixin or NMS class names, check versions first (game version, core or loader version, plugin or mod version) instead of editing `config.yml`. For the exact wording and supported ranges, **follow the official documentation of the loader and the plugin**.
:::

## 2. Plugin Incompatibility

### 2.1 Symptom Table

| Error or symptom | What it means | Usual cause |
| --- | --- | --- |
| `NoClassDefFoundError: com/example/lib/Foo` | A class cannot be found at runtime | A missing hard dependency (`depend` unsatisfied); the plugin was built for **different server software**; the class came from server internals |
| `ClassNotFoundException: ...` | Same idea, usually during explicit class loading | Missing dependency; a multi-jar plugin you did not install completely; a corrupted download |
| `NoSuchMethodError: 'void a.b.C.d(...)'` | The class exists but the **method signature does not match** | The plugin was compiled against a different API version than your server or dependency (often the plugin is newer, or the dependency is too old) |
| `AbstractMethodError` | An interface gained a method the implementation does not have | The plugin was compiled against an **older** API and the server or dependency has since changed the interface |
| `UnsupportedClassVersionError ... class file version 65.0` | The plugin was compiled for a **newer Java** | Your Java is older than the plugin requires (65 = Java 21); change Java or use an older plugin build |
| `MixinApplyError` / `InvalidMixinException` / `MixinTransformerError` | Mixin injection failed | The plugin hooks internals it was never built for: a version mismatch |
| Plugin loads but its commands do nothing | Features were silently disabled | A soft dependency (`softdepend`) is missing, or the matching expansion or module is not installed |
| Plugin disables itself at startup | The author added a version check | Your version is outside the supported range; the plugin refuses to load and usually logs the range it supports |

:::note NoClassDefFoundError is sometimes an after-effect
If the log shows an `ExceptionInInitializerError` a few lines earlier, the `NoClassDefFoundError` is just the follow-up to a failed static initializer. **The real cause is the earlier entry.**
:::

### 2.2 The Fix Order

Work through this order, changing one variable at a time:

1. **Confirm three versions**: game version (1.20.4, 1.21.x, ...), server software (Paper, Purpur, Spigot, Fabric, Forge, NeoForge), and Java version. For which Java goes with which game version, see [Environment Setup (Windows and Linux)](/tutorials/java/environment).
2. **Check what the plugin supports**: the Supported Versions section on its download page, its README, and the `api-version` field in the `plugin.yml` inside the jar.
3. **Install the dependencies**: Vault, PlaceholderAPI, ProtocolLib and LuckPerms are the ones most often required. See [Common Dependency Plugins](/tutorials/java/plugin-deps).
4. **Update or downgrade the plugin**: align it with your core version first. Many plugins ship several branches or several jars, so **pick the right branch** before comparing version numbers.
5. **Replace abandoned plugins**: if the last supported version is clearly below your core version, do not force it. Find a maintained alternative.
6. **Bisect**: if none of the above helped, narrow the problem down to a single plugin as described below.

### 2.3 Bisection: Narrow It Down to One Plugin

```text
1. Stop the server and copy the whole plugins/ directory as a backup
2. Leave only the required dependencies and the suspects; move everything else out of plugins/
3. Start the server and try to reproduce
   Still broken -> the problem is in the remaining set; split it in half again
   Fine now     -> the problem is in the removed set; move half of it back and repeat
4. Each round starts from "remove everything, add back half", so it takes at most log2(N) rounds
5. Once you have one plugin, try its different versions - not only the newest one
```

:::tip Do not change everything at once
"Update every plugin to the latest version" turns one variable into N variables, and then you have to start the investigation over. **Change one thing at a time.**
:::

### 2.4 `/plugins` Colours and the Console

On Paper and Spigot family servers, `/plugins` colour-codes the list: **green means enabled, red means it failed to load or was disabled**. It tells you how many are red. **It never tells you why.**

The reason is always written to the console and to `logs/latest.log`, in roughly this shape (illustrative):

```text
[12:00:02 WARN]: [MyPlugin] Could not load 'plugins/MyPlugin.jar' in folder 'plugins'
org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [Vault]. Please download and install these plugins.
        at org.bukkit.plugin.java.JavaPluginLoader.loadPlugin(JavaPluginLoader.java:155) ~[paper-api.jar:?]
        ...
[12:00:02 WARN]: [MyPlugin] Disabling MyPlugin v1.2.3
```

Searching the log for the plugin name usually shows you the cause within seconds. For dependency details see [Common Dependency Plugins](/tutorials/java/plugin-deps); for how plugins are installed and loaded see [Introduction to Plugins](/tutorials/java/plugins).

## 3. Core Incompatibility

### 3.1 API Families: Bukkit Is One Lineage

Bukkit, Spigot, Paper, Purpur, Leaves, Leaf and Folia are one API family, compatible **downwards**: a plugin written against an upstream API usually runs on the downstream cores, but not the other way round.

| API the plugin was built against | Spigot | Paper / Purpur | Folia |
| --- | --- | --- | --- |
| Bukkit / Spigot API | Yes | Yes | Only if the plugin declares Folia support |
| Paper API | Usually not (missing classes or methods) | Yes | Only if adapted |
| NMS or a fork-specific API | Matching version only | Matching version only | Usually not |

:::note "Yes" in that table only means the API is available
It does not mean the plugin behaves correctly. **Whether a plugin runs on your core is decided by the plugin's own documentation.**
:::

Folia is a special case: it splits the world into regions and ticks them in parallel, so it **requires plugins to declare Folia support in `plugin.yml`** and otherwise refuses to load them. For the exact field and its limitations, follow the official Folia documentation.

### 3.2 Why NMS Plugins Break on Every Update

NMS means `net.minecraft.server`, the server's **internal implementation**. Mojang has never promised that this part is stable: class names, method names and field names can all change between versions.

- Plugins that use only the public Bukkit or Paper **API** usually survive minor version upgrades.
- Plugins that reference NMS must be **adapted by their author for every game version**, and skipping versions almost always breaks them.
- In the Spigot era, internal classes were remapped into **versioned** packages such as `v1_20_R1`, which is why a plugin loses its classes the moment the version changes.
- Paper switched to Mojang's official mappings in 1.20.5, so NMS plugins are written differently than before. **For the specifics, follow Paper's official announcements.**

The failure signature is consistent: `NoClassDefFoundError`, `NoSuchMethodError` or `NoSuchFieldError`, with a class name containing `net.minecraft` or `org.bukkit.craftbukkit`.

### 3.3 Plugin Servers and Mod Servers Are Not Interchangeable

| Your server | Loads plugins | Loads mods |
| --- | --- | --- |
| Paper / Purpur / Spigot | Yes | No |
| Fabric / Forge / NeoForge | No (needs a bridge) | Yes |
| Hybrid cores (Arclight, Mohist, Youer, ...) | Usually both | Usually both |

- **Fabric, Forge and NeoForge mods cannot be loaded by a plugin server**, and plugins cannot simply be dropped into a mod server.
- Hybrid cores load both, but **compatibility is maintained by the hybrid project itself**, and either ecosystem can break. When a plugin misbehaves on a hybrid core, check that core's own documentation for what it supports.
- Proxy software (Velocity, BungeeCord) is a **third API family**: a Bukkit plugin does not go into Velocity, and a Velocity plugin does not go into Paper. See [Proxies](/tutorials/java/proxy).

For the trade-offs, see [Getting Started with Plugins](/tutorials/java/plugins) and [Choosing a Server Core](/tutorials/java/core).

### 3.4 Three-Way Matching on Modded Servers

A modded server has to line up three things: **game version, loader version and every individual mod**. Miss one and the loader refuses to start and lists the offending mods.

Fabric's shape (illustrative; the exact wording is Fabric's own, so follow the official documentation):

```text
Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Mod resolution encountered an incompatible mod set!
A potential solution has been determined:
         - Replace mod 'Sodium' (sodium) 0.5.8 with a version that supports minecraft 1.20.1
```

Forge and NeoForge's shape (illustrative):

```text
Missing or unsupported mandatory dependencies:
        Mod ID: 'create', Requested by: 'mymod', Expected range: '[0.5.1,)', Actual version: '0.5.0'
```

Mods declare their requirements in metadata: Fabric uses `depends` in `fabric.mod.json`, Forge and NeoForge use `[[dependencies]]` in `mods.toml`. Also distinguish **client-only**, **server-only** and **both-sides** mods: putting a client-only mod into the server's `mods/` directory produces errors too.

### 3.5 How to Diagnose Core Incompatibility

1. **Read the first error that names a class, a package or a mod ID.** Everything after it is usually fallout.
2. **Look at `api-version` in `plugin.yml`** (Paper and Spigot plugins). It is a **hint**: it records the API version the author targeted, and it does **not** guarantee the plugin runs on your core. When the field is absent, servers typically treat the plugin as legacy and say so. For the exact behaviour, follow the server's official documentation.
3. **Reproduce on a clean test server**: same core version, only that one plugin (plus its dependencies), a fresh world. If it still fails, the problem is the plugin versus the core or version, not your configuration.
4. **Check the official support matrix**: the plugin download page, the core's documentation, and the mod page.
5. **Check for mixed families**: mods inside `plugins/`, or proxy plugins dropped into a backend server, both produce errors that look nonsensical at first.

### 3.6 Upgrade and Downgrade Strategy

- **Back up before upgrading**: at minimum the `world` directories, your plugin configuration and `server.properties`, plus a **written record of every plugin and mod version**.
- **Keep the previous core jar**: swapping it back is faster than investigating on the spot.
- **Pin plugin versions**: after upgrading the core, do not update every plugin at the same time. Get the core booting first, then update plugins in batches.
- **Do not upgrade the world first**: once a world has been opened by a newer version, an older core may refuse to read it. **Get the core running on the new version and decide to stay there before touching the world.**
- **Move in stages**: core, then dependencies, then the plugins that need them, then everything else. Start the server after each stage.
- **Proxies are the same**: upgrade the backend servers first, confirm they are fine, then upgrade the proxy.

:::warn A downgrade is only as good as your pre-upgrade backup
After a newer version has written to the world data, the older version may simply refuse to load it. **Without a complete pre-upgrade backup, do not upgrade.**
:::

## 4. Other Frequent Errors

### 4.1 UnsupportedClassVersionError (Wrong Java Version)

```text
java.lang.UnsupportedClassVersionError: com/example/Plugin has been compiled by a more recent
version of the Java Runtime (class file version 65.0), this version of the Java Runtime only
recognizes class file versions up to 61.0
```

The two numbers are **class file versions**, not Java version numbers:

| Class file version | Java |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |
| 69 | Java 25 |

- **A plugin reports this**: the plugin was compiled for a newer Java than your runtime. Change Java, or use an older build of the plugin.
- **The server core reports this**: the core requires a newer Java than your runtime.
- To find the right Java for your game version, use the table in [Environment Setup (Windows and Linux)](/tutorials/java/environment). **Do not just install the newest one.**
- Changing `-Xmx`, editing configs or reinstalling the plugin will not help. This is not a memory or configuration problem.

:::note Too new a Java causes problems as well
A Java version above the requirement usually does not produce this error, but it can trigger compatibility issues in some plugins and mods. **Align it with the requirement**, and follow the official documentation of the core and the plugin.
:::

### 4.2 Address Already in Use

```text
[12:00:00 ERROR]: **** FAILED TO BIND TO PORT!
[12:00:00 ERROR]: The exception was: java.net.BindException: Address already in use: bind
[12:00:00 ERROR]: Perhaps a server is already running on that port?
```

Port 25565 (or whichever port you configured) is already held by another process: a second server instance, a previous run that never exited, or an unrelated program.

Windows:

```powershell
netstat -ano | findstr :25565
taskkill /PID <PID> /F
```

Linux:

```bash
sudo ss -tlnp | grep 25565
kill <PID>
```

When several servers share one machine, each needs its own `server-port`. For the wider port checklist, see [Environment Setup (Windows and Linux)](/tutorials/java/environment).

### 4.3 EULA Refusal

```text
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

This is not a crash; the server is refusing to start, by design. Set `eula=true` in `eula.txt` in the server directory and restart. **Only do this if you have actually read and accepted the Minecraft EULA**; the authoritative text is the official page.

### 4.4 Memory Errors

| Error | Meaning | Direction |
| --- | --- | --- |
| `java.lang.OutOfMemoryError: Java heap space` | The heap is too small | Raise `-Xmx` moderately; also check view distance, entity counts and plugin leaks |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | The GC spends most of its time recovering almost nothing | Fundamentally a heap that is too small or a memory leak; same direction |
| `Could not reserve enough space for object heap` | The JVM fails **at startup**, before the server runs | `-Xmx` exceeds available memory, or you are on a 32-bit Java; lower `-Xmx` and switch to 64-bit Java |
| `Error occurred during initialization of VM` | JVM initialisation failed, usually parameters or memory | Check that `-Xms` and `-Xmx` in your start command are sane |

- `-Xms` is the initial heap, `-Xmx` the maximum. Setting both to the same value avoids heap growth at runtime, but **do not exceed physical memory** - leave room for the operating system and other processes.
- **Raising `-Xmx` is not a cure.** If a plugin or mod is leaking, a bigger heap only postpones the crash. Use a tool such as **spark** to look at memory and flame graphs; see [Performance Optimisation](/tutorials/java/optimize).
- For memory sizing by player count, see [Hosting Protocol and Recommended Configuration](/tutorials/java/protocol).

### 4.5 World and Chunk Corruption

The exact wording depends on the version. A typical shape is an I/O error while loading a chunk (illustrative; the real wording is whatever your log says, and the official documentation is authoritative):

```text
[12:00:00 ERROR]: Error loading chunk [12, 34]: java.io.IOException: Region file is corrupted
[12:00:00 ERROR]: Failed to load chunk at 12, 34
```

How to handle it:

1. **Do not hand-edit files in `region/`.** Doing so can easily widen the damage.
2. **Restore from a backup first.** This is the most reliable route; see [Backup and Recovery](/tutorials/java/backup).
3. If only one chunk is damaged and you do not want to roll the whole world back, use a third-party tool such as **MCA Selector** or **NBTExplorer** to delete or replace that chunk. **The cost is everything inside it.**
4. If the same disk keeps producing corruption, suspect the hardware and filesystem first (disk health, kernel log) and fix that before restoring data.

### 4.6 Ticking Entity and Ticking Block Entity Crashes

These crashes are titled `Description: Ticking entity` or `Description: Ticking block entity` (also `Ticking player`). They mean **an entity or block entity threw an exception while ticking**, usually because of a mod, or because the chunk data is already damaged.

The crash report records where the offending object is (illustrative):

```text
Description: Ticking entity

java.lang.NullPointerException: Cannot invoke "net.minecraft.world.entity.Entity.getType()" because "entity" is null
        at com.example.mymod.TickHandler.onTick(TickHandler.java:64) ~[?:?]

-- Entity being ticked --
    Entity Type: minecraft:pig (net.minecraft.world.entity.animal.Pig)
    Entity's Exact location: 123.45, 64.00, -67.89
    Entity's Block location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; contains blocks 112,0,-80 to 127,255,-65)
```

A block entity looks like this:

```text
Description: Ticking block entity

-- Block entity being ticked --
    Name: minecraft:chest
    Block type: minecraft:chest
    Location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; ...)
```

**From coordinates to files**:

- Chunk coordinates are `floor(x) >> 4` and `floor(z) >> 4`. In the example above, `x=123` is chunk `7` and `z=-68` is chunk `-5`, matching the `in 7,-5` in the report.
- The region file is `r.<floor(chunkX/32)>.<floor(chunkZ/32)>.mca`. Chunks `7` and `-5` fall in `r.0.-1.mca`, matching the Region field in the report.

**A safe order of operations**:

1. **Stop the server and back up the world completely.** Do not skip this.
2. Open the region file with a tool such as **MCA Selector** or **NBTExplorer** and **delete only that one entity or block entity**, which keeps the loss minimal.
3. Only if you cannot find the object, or no tool can handle it, consider deleting the whole chunk. **Deleting a chunk also deletes the builds, chests and entities inside it.**
4. Start the server to verify it no longer crashes, then take a fresh backup.
5. If the failing object belongs to a mod, go back to section 3 and check game version plus loader version plus mod version. **A version mismatch is often the actual root cause.**

:::warn Never edit world files while the server is running
Modifying files under `region/` while the server runs causes a second round of corruption. **Stop the server, back up, then edit.**
:::

### 4.7 Linux Permission and Port Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `java.io.FileNotFoundException: ... (Permission denied)` | Wrong ownership of the server directory (for example, it was once started as root) | `sudo chown -R mcserver:mcserver /opt/mcserver`, and run it as a dedicated user |
| `java.net.BindException: Permission denied` | Binding a privileged port below 1024 without root | Use a port above 1024, or grant bind capability deliberately (understand the risk first) |
| Players cannot connect, but the log shows nothing | A firewall or cloud security group is blocking the port | A network-layer problem; see [Environment Setup (Windows and Linux)](/tutorials/java/environment) |

**Do not run the server as root.** If the server or a plugin is exploited, the attacker gets the whole machine. For the security side, see [[JAVA] Security Plugins](/tutorials/ops/security-java).

## 5. Workflow and Checklist

### 5.1 Follow This Order

1. **Read the log.** Decide whether this is a plugin exception (server alive) or a crash (server dead), which tells you whether to open `logs/latest.log` or `crash-reports/`.
2. **Find the first error.** Start from the first `ERROR` or `Exception`; do not work backwards from the last line.
3. **Check the three versions.** Game version, core or loader version, Java version - rule out the basics first.
4. **Reproduce on a clean test server.** Same core version, only the suspect plugin, a fresh world. This separates "my configuration" from "the plugin itself".
5. **Bisect.** Use the method in 2.3 to narrow it down to one plugin or mod.
6. **Apply the fix.** In the order: install dependencies, adjust versions, replace abandoned software. One variable at a time.
7. **Verify.** After restarting, confirm the error is gone and actually exercise the feature involved.
8. **Write it down.** Record error, cause and fix in your own notes so the next occurrence is a lookup, not an investigation.

### 5.2 Checklist

| Step | Action | Done when |
| --- | --- | --- |
| 1 | Copy `logs/latest.log` and the newest `crash-reports/` file | Evidence saved; a restart cannot destroy it |
| 2 | Classify the failure | You can say whether it is a plugin exception or a fatal crash |
| 3 | Find the first exception and the last `Caused by` | You have both header lines |
| 4 | Check game version, core version, Java version | The three agree |
| 5 | Check the plugin's supported versions and dependencies | The plugin supports your core and all dependencies are present |
| 6 | Reproduce on a clean test server | It reproduces reliably, or you can show it is unrelated to your configuration |
| 7 | Bisect | Down to a single plugin or mod |
| 8 | Fix and verify | The error is gone and the feature works |
| 9 | Document and back up | You have notes and a rollback point |

### 5.3 What to Include When Asking for Help

Before posting in a chat group or an issue tracker, prepare these. The more complete the information, the more likely someone spots the problem immediately:

- **A complete log excerpt**: from the first `ERROR` or `Exception` to the end of that exception, **including every `Caused by`**. Do not paste three lines, and do not photograph your screen.
- **The crash report**: if the server crashed, attach the matching file from `crash-reports/`. It already contains version and environment details.
- **Version information**: game version, core name and build number, and the output of `java -version`.
- **Plugin or mod list**: the output of `/plugins`, or the file names and versions in `plugins/` or `mods/`.
- **What changed recently**: a core upgrade, a new plugin, a configuration edit. **This one is often the answer by itself.**
- **Reproduction steps**: when it always fails, and when it does not.
- **What you have already tried**: so nobody sends you back through steps you have ruled out.

## Related Documentation

- [Environment Setup (Windows and Linux)](/tutorials/java/environment): Java version table, ports and permissions
- [Getting Started with Plugins](/tutorials/java/plugins): where plugins live and how they are loaded
- [Common Dependency Plugins](/tutorials/java/plugin-deps): Vault, PlaceholderAPI, ProtocolLib, LuckPerms
- [Choosing a Server Core](/tutorials/java/core): what each core is for and what it supports
- [Performance Optimisation](/tutorials/java/optimize): using spark to read memory and lag
- [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java): the symptom-first quick reference

> Error messages and configuration keys are governed by the official documentation of the plugin and core in question.
