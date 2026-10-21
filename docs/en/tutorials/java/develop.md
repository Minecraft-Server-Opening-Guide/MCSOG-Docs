---
title: "Getting Started with Plugin and Datapack Development"
slug: develop
cat: java
level: 3
order: 28
minutes: 19
tags: [java, plugin-development, datapacks, paper, build-tools, api, testing]
updated: 2026-10-04
draft: false
---

The previous articles were about using other people's work: installing plugins, installing datapacks, configuring a server. This one is about **writing your own**.

It is written for two kinds of reader: an owner who wants to add one custom recipe or one custom command, and a player who wants to learn Bukkit / Paper plugin development from zero. The goal is not to make you ship a finished product, but to make sure you **know which path exists, what each one requires, and what the smallest skeleton that actually runs looks like**.

One principle runs through the whole article: **class names, method names, pack formats and directory names all change between versions, and the official documentation always outranks any tutorial, including this one.** Nothing here invents a specific API name or format number.

## 1. Pick the Right Tool First: Datapack / Plugin / Mod

The three paths are aimed at completely different things. Start with the comparison table.

| Dimension | Datapack | Plugin | Mod |
| --- | --- | --- | --- |
| Do you write code? | No (JSON plus mcfunction) | Yes, Java | Yes, Java |
| Build tooling | None | Maven or Gradle | The loader's toolchain |
| Runs on a vanilla server | Yes | No | No |
| Runs on the Paper family | Yes | Yes | No (needs a bridge) |
| What it can change | Data the game already exposes: recipes, loot tables, advancements, functions, tags, some world generation data | Everything the API exposes: commands, events, entities, blocks, GUIs, networking | The game code itself: new blocks, new mobs, new dimensions |
| How you test it | `/reload` plus `/datapack list` | Restart the server | Restart client and server |
| Cost of a version update | Low (format number and directory names) | Medium (the API is mostly stable; reaching into internals breaks) | High (you wait for the loader and every mod) |
| Typical use | Changing rules, adding recipes, adding commands, light logic | Economy, land claims, menus, cross-server, full gameplay systems | New content, large modpacks |

The recommended order is: **if a datapack can do it, use a datapack; if it cannot, write a plugin; only make a mod when you need to change the game itself.** The test is simple:

- What you want to change is **already exposed as data** (recipes, drops, advancements, functions, tags) -> datapack.
- What you want to do **needs to listen to events or interact with players** (custom commands, GUIs, economy, permissions) -> plugin.
- What you want to add **does not exist in the game at all** (new blocks, new mobs) -> mod.

## 2. The Datapack Path

A datapack has the lowest barrier of the three: **no build tooling, no dependencies, no compilation**. A few JSON and text files are enough to take effect.

### 2.1 Directory layout

On a server, datapacks live in the `datapacks/` folder **inside the world directory**, whose name comes from `level-name` in `server.properties` (default `world`):

```text
world/
  datapacks/
    my_pack/
      pack.mcmeta
      data/
        my_pack/
          function/
            tick.mcfunction
            hello.mcfunction
          advancement/
          loot_table/
          tags/
            function/
              tick.json
              load.json
```

The namespace directory name (the `my_pack` above) is the prefix you use to reference your content, for example `my_pack:hello`. **Use only lowercase letters, digits and underscores for a namespace.**

A datapack can also be a `.zip`, but **`pack.mcmeta` must sit directly at the root of the zip**, with no extra wrapper folder. Compressing a folder with the right-click menu is the usual way this goes wrong.

### 2.2 `pack.mcmeta` and `pack_format`

```json
{
  "pack": {
    "pack_format": 0,
    "description": "My first datapack"
  }
}
```

There is exactly one rule to remember about `pack_format`:

:::warn Never copy a format number from any tutorial
The `pack_format` value **changes with every Minecraft version**, and datapacks and resource packs each have their own sequence. A wrong value produces an "incompatible format" message and the pack is not loaded.

**Look up the official wiki format table for your version** rather than copying a number from any tutorial, including this one. The `0` in the example above is a placeholder, not a usable value.

The fields of `pack.mcmeta` also evolve: newer versions let a pack declare a range of supported formats (a field such as `supported_formats`). The field set changes between versions, so use the official wiki page for `pack.mcmeta` as your reference.
:::

### 2.3 Directory names change between singular and plural

This is the trap beginners hit most often, and the one tutorials mention least:

| Content type | Earlier versions (1.20.x and before) | From 1.21 |
| --- | --- | --- |
| Functions | `data/<ns>/functions/` | `data/<ns>/function/` |
| Advancements | `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| Loot tables | `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| Recipes | `data/<ns>/recipes/` | `data/<ns>/recipe/` |
| Predicates | `data/<ns>/predicates/` | `data/<ns>/predicate/` |
| Function tags | `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

In other words, **from 1.21 these directories became singular**. The plural form is correct on older versions and simply "does nothing, with no obvious error" on newer ones. Defer to the official wiki for your version.

### 2.4 Functions (`.mcfunction`)

- A function is a text file with **one command per line**, and you **do not write the leading `/`**. A line starting with `#` is a comment.
- A function can be run by a command: `/function my_pack:hello`.
- Newer versions support **function macros**: write `$(name)` as a placeholder and pass arguments with `function <function> with <data source>`. Macros are a version-dependent feature; confirm your version supports them before relying on them.

```text
# Give players within 16 blocks a small visual effect
# Note: always filter. Never iterate over every entity in the world.
execute as @a[distance=..16] at @s run particle minecraft:flame ~ ~1 ~ 0 0 0 0 1
```

### 2.5 Tags

Tags are how you hook content onto the game. The two function tags you will use most:

```json
{
  "values": [
    "my_pack:tick"
  ]
}
```

Placed at `data/minecraft/tags/function/tick.json` (in `functions/` before 1.21), the functions inside **run once per game tick**. Placed in `load.json`, they run **once on load and on `/reload`**. This is the standard way to make a datapack do something continuously, and also the most common source of performance problems.

### 2.6 Advancements and loot tables

An advancement is often used as a custom trigger: give it a criterion that cannot be met naturally, then grant it from a function, with `rewards.function` naming the function to call. A loot table controls the drops of a block, a mob or a chest:

```json
{
  "type": "minecraft:generic",
  "pools": [
    {
      "rolls": 1,
      "entries": [
        { "type": "minecraft:item", "name": "minecraft:diamond" }
      ]
    }
  ]
}
```

The available `type` values, conditions and function names are documented on the official wiki; they are **added to and adjusted every version**.

### 2.7 Testing: `/reload` and `/datapack list`

```bash
/datapack list
/datapack enable "file/my_pack"
/reload
/function my_pack:hello
```

Key points:

- `/datapack list` is the first diagnostic command for "was my pack recognised at all".
- `/reload` reloads **the data of the currently enabled datapacks** (functions, tags, advancements, loot tables, recipes and so on). It is **not** a restart.
- World generation, dimension types and parts of the registries only take effect after a **server restart**.
- On a busy server `/reload` itself has a cost, so do not treat it as a hot-reload button.
- For pack formats, placement and troubleshooting in more depth, see [Resource Packs and Datapacks](/tutorials/ops/packs).

### 2.8 Performance warning: a tick function is a per-tick cost

:::warn Running every tick means 20 times per second
Attaching a function to the `tick` tag means it **runs 20 times every second**. Every extra command, and every unfiltered entity iteration, is multiplied by 20.

The usual performance mistakes:

- `execute as @e` with no selector filter, iterating every entity on the server.
- Doing heavy block queries or `data get` calls inside a per-tick function.
- Writing polling logic in functions when an event or a tag would do the job.

Tools such as `/spark` can pin lag on a function. **Get it correct first, then optimise**: anything that can live in `load` should not live in `tick`, and any filter you can add, you should.
:::

Two game rules about command scale are worth knowing: `maxCommandChainLength`, which bounds the length of a command chain and of function recursion, and `commandModificationBlockLimit`, which bounds how many blocks a single command may change. Their defaults change between versions, so look them up before writing large functions.

## 3. The Plugin Path

A plugin is far more powerful than a datapack, and the price is that you need **a JDK, a build tool and a test server**.

### 3.1 What you need

| Requirement | Notes |
| --- | --- |
| JDK | The version must match what your server requires |
| Build tool | Maven or Gradle; either one is fine |
| The API of your target platform | The Paper family uses the Paper API; compile against it and **do not bundle it into your jar** |
| A test server | Its own directory, its own port, its own copy of the world |

The Java requirement **changes with the game version**, and can differ between forks. The rough mapping (**check the official Paper documentation; do not copy this**):

| Minecraft version | Java required |
| --- | --- |
| 1.16.5 and earlier | Java 8 |
| 1.17.x | Java 16 |
| 1.18.x - 1.20.4 | Java 17 |
| 1.20.5 and later | Java 21 |

The server's Java version and the `release` version you compile with **must line up**, or you get a startup failure such as `UnsupportedClassVersionError`.

### 3.2 Maven: `pom.xml`

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>myplugin</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <repositories>
    <repository>
      <id>papermc</id>
      <url>https://repo.papermc.io/repository/maven-public/</url>
    </repository>
  </repositories>
  <dependencies>
    <dependency>
      <groupId>io.papermc.paper</groupId>
      <artifactId>paper-api</artifactId>
      <version>PUT-THE-VERSION-HERE</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

Three points:

- `<scope>provided</scope>` means "the server already provides this library, do not put it in my jar". **This line is mandatory**; without it you bundle the entire API into your plugin.
- The `<version>` value looks like `<minecraft version>-R0.1-SNAPSHOT`. **The exact value changes between versions**, so look up the current one in the official documentation or repository instead of copying it.
- When you use no third-party libraries, **do not add a shade plugin**. Bundling other people's libraries creates conflicts and easily runs into licensing problems.

### 3.3 Gradle: `build.gradle`

```groovy
plugins {
    id 'java'
}
group = 'com.example'
version = '1.0.0'
repositories {
    mavenCentral()
    maven {
        name = 'papermc'
        url = 'https://repo.papermc.io/repository/maven-public/'
    }
}
dependencies {
    compileOnly 'io.papermc.paper:paper-api:PUT-THE-VERSION-HERE'
}
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}
```

`compileOnly` is Gradle's equivalent of `provided`: **visible at compile time, absent from the packaged jar**. The build output lands in `build/libs/`.

### 3.4 `plugin.yml` and `api-version`

```yaml
name: MyPlugin
version: 1.0.0
main: com.example.myplugin.MyPlugin
api-version: '1.21'
author: YourName
description: An example plugin.
commands:
  hello:
    description: Says hello.
    usage: /hello
    permission: myplugin.hello
permissions:
  myplugin.hello:
    description: Allows the use of /hello
    default: op
```

| Field | Purpose |
| --- | --- |
| `name` | The plugin name, used for the log prefix and the data folder; do not use spaces |
| `main` | The **fully qualified class name** of the main class, which must extend `JavaPlugin` |
| `version` | The plugin version, shown in the log and in `/plugins` |
| `api-version` | Declares which API version the plugin was written against |

**Why `api-version` matters**: the server uses it to decide how to load your plugin. The official documentation states that **a server older than the declared API version refuses to load the plugin**, while **leaving the field out loads the plugin in legacy mode and prints a warning**. It also affects some compatibility conversion behaviour, so a new plugin should declare it explicitly.

It is **not** a version guarantee: declaring `api-version` only states your target version, it does not mean your code works on a newer one. Newer Paper versions also support a different manifest file (`paper-plugin.yml`) and a different plugin loading model; use the official documentation for your version.

### 3.5 Lifecycle: `onEnable` and `onDisable`

```text
package com.example.myplugin;

import org.bukkit.plugin.java.JavaPlugin;

public final class MyPlugin extends JavaPlugin {
    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(new PlayerJoinListener(this), this);
        getLogger().info("MyPlugin enabled.");
    }
    @Override
    public void onDisable() {
        getLogger().info("MyPlugin disabled.");
    }
}
```

- `onEnable()` is called when the plugin is enabled. At server startup that happens after the server's own initialisation and before players can join.
- **Do not do slow blocking work in `onEnable()`** (downloading files, contacting a remote service, iterating the whole world). It delays server startup directly.
- `onDisable()` is where you save configuration, cancel tasks you scheduled yourself and close resources you opened.
- When a plugin is disabled the server **automatically unregisters its listeners and cancels the tasks it scheduled**, but it does **not** save your data or close the files and connections you opened.

### 3.6 Registering a command and a listener

A command executor:

```text
package com.example.myplugin;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;

public final class HelloCommand implements CommandExecutor {
    private final MyPlugin plugin;
    public HelloCommand(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        sender.sendMessage("Hello, " + sender.getName() + "!");
        return true;
    }
}
```

- The return value says whether the command was handled: returning `false` makes the server print the command's `usage`.
- Check `args.length`, or a player who supplies one argument too few triggers an array index error.
- For completion, implement `TabCompleter` and register it with `setTabCompleter(...)`.

An event listener:

```text
package com.example.myplugin;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public final class PlayerJoinListener implements Listener {
    private final MyPlugin plugin;
    public PlayerJoinListener(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        player.sendMessage("Welcome to the server!");
    }
}
```

Registering a listener **requires** calling `registerEvents(listener, plugin)`; merely implementing `Listener` does nothing. When binding a command in `onEnable()`, check for null first:

```text
if (getCommand("hello") == null) {
    getLogger().severe("Command 'hello' is missing from plugin.yml!");
    return;
}
getCommand("hello").setExecutor(new HelloCommand(this));
```

**`getCommand()` returns `null` when the command is not declared in `plugin.yml`**, and calling `setExecutor` on it crashes the plugin at startup. This is the most common first crash a beginner meets. Newer Paper versions offer Brigadier-based command registration through lifecycle events, which is friendlier for complex command trees; it is platform-specific API whose shape changes between versions, so follow the official documentation.

### 3.7 Logging: use `getLogger()`

```text
getLogger().info("Loaded " + count + " entries.");
getLogger().warning("Config value is missing, using the default.");
getLogger().log(java.util.logging.Level.WARNING, "Failed to save data", exception);
```

- `getLogger()` returns a logger prefixed with the plugin name, and its output reaches the server console and log files.
- **Never swallow an exception**: at minimum log it, and pass the exception object, or your only evidence later is "something went wrong".
- Do not use `System.out.println`: it bypasses the logging system, loses the plugin name and level, and cannot be filtered by log tooling. Newer Paper versions also expose an SLF4J-style logger; follow the official documentation.
- Keep messages in English, or the console and your log tooling will fight you.

### 3.8 Building and deploying

```bash
mvn -q package          # Maven, output in target/
gradle build            # Gradle, output in build/libs/
```

The deployment sequence:

```bash
stop                                              # run in the test server console
cp target/myplugin-1.0.0.jar /path/to/testserver/plugins/
java -Xms2G -Xmx2G -jar paper.jar --nogui         # check the onEnable line and /plugins after restart
```

Two warnings:

- If you do use a shade plugin, the jar starting with `original-` is **not** the file to deploy.
- **Do not use `/reload` to hot-swap a plugin.** Plugin reloading is not a supported workflow: state is left behind, class loaders leak, and the symptoms show up later in strange ways. During development, just restart the test server.

## 4. Where to Learn the API

This is the section the article most wants to land: **never write a method name from memory.**

| Resource | Use |
| --- | --- |
| The official Paper documentation site | Getting-started tutorials, recommended patterns for events and commands, platform features |
| The official Paper Javadoc | **The only authority for method and class names**, browsable per target version |
| The Bukkit / Spigot Javadoc | Reference for the base API; most of Paper's API is compatible with it |
| Your core's official repository and docs | To confirm whether a behaviour is Paper-specific or common Bukkit |

How to actually work:

1. Decide **which Minecraft version you are developing against**, then select that version in the Javadoc.
2. Before using a feature, **find the class in the Javadoc**, confirm the method signature, and only then write code.
3. **Class names, event names and enum values change between versions**; blog posts and older tutorials are frequently out of date.
4. **Separate API from internals**: `org.bukkit.*` and `io.papermc.paper.*` are API with compatibility promises; the server's internal classes (commonly called NMS) carry **no compatibility guarantee at all**, and using them pins your plugin to one version.
5. When you hit a "method does not exist" compile error, suspect the version first rather than searching for an alternative spelling that happens to compile.

## 5. Testing Discipline

The accident that actually happens to plugin developers is not failing to write the code, it is **testing on the production server**.

| Discipline | Why |
| --- | --- |
| Use a separate test server | Its own directory, its own port, a copy of the world. **Never use the production server as a laboratory** |
| Match the environment | The test server's **core version, build number and Java version** must match production, or you are not testing the same thing |
| Back up the world first | Plugins change data, and a backup is the only way back; see [Backup and Restore](/tutorials/java/backup) |
| Change one thing at a time | Changing the plugin, the config and the core together leaves you nothing to isolate |
| Read the console stack trace | On a crash, read **the first line, the `Caused by` chain, and the line in your own package**; the method is in [Common Java Edition Errors and Crash Triage](/tutorials/faq/errors) |
| Test with an ordinary player account | Permission bugs only show up for a non-OP account |
| Roll out gradually | Enable it on a small server or off-peak first, and watch TPS and the log |

## 6. A Short Security Note

**A plugin is not sandboxed.** It runs in the same JVM as the server with the server's full privileges: reading and writing files, opening network connections, executing system commands, touching data in memory. The platform does not restrain it.

Three conclusions follow:

- **A backdoor in someone else's plugin is a backdoor on your machine.** Take plugins only from official release channels, and be suspicious of repackaged, renamed or obfuscated builds.
- **Datapacks are the same story.** A function can do anything a command can: hand out items, teleport players, empty containers, drop a player into the void. Only install packs from sources you trust.
- **Do not trust player input in your own plugin either.** Validate command arguments, never concatenate a player-supplied string straight into a file path, never execute a string from your config as code, and escape the text you send to players.

Installing, auditing and cleaning up plugins is covered in [Plugin Management and Auditing](/tutorials/java/plugin-manage).

## 7. Summary

- **Pick the tool first**: datapack, then plugin, then mod. Use the simplest thing that works.
- A datapack has the **lowest barrier**: the `pack.mcmeta` format number must come from the official table, and directory names change between singular and plural across versions.
- A plugin needs **a JDK, a build tool and a test server**; reference the API with `provided` / `compileOnly` and **do not bundle the API**.
- In `plugin.yml`, **`api-version` decides the loading mode** and omitting it loads the plugin as legacy with a warning; a command must be declared there or `getCommand()` returns `null`.
- **Do no slow work in `onEnable`**; save state and release resources in `onDisable`.
- **Method names come from the official Javadoc**; class and event names change between versions.
- **Develop on a test server**, change one thing at a time, and read the stack trace when it crashes.
- **A plugin has the server's full privileges**, so a plugin of unknown origin is a backdoor of unknown origin.

:::tip The fastest way to learn: read an existing open-source plugin
Starting from "which method do I call" is the slowest possible path. A faster one: find **an open-source plugin that does something similar to your goal**, read its `plugin.yml`, its main class, one command class and one listener class, copy that minimal skeleton, and turn it into your feature. You will learn more in half an hour than from ten tutorials.

Read it with three questions in mind: **what does it register, and in which lifecycle stage; how does it handle player input; and where does it store its data.** Get those three clear and the door to plugin development is open.
:::

Related reading: [Resource Packs and Datapacks](/tutorials/ops/packs) for pack formats and placement, [Plugin Basics](/tutorials/java/plugins) for installing and loading, [Plugin Management and Auditing](/tutorials/java/plugin-manage), [Common Java Edition Errors and Crash Triage](/tutorials/faq/errors), and [Backup and Restore](/tutorials/java/backup).

> Game mechanics, APIs and pack formats follow the official documentation for your version.
