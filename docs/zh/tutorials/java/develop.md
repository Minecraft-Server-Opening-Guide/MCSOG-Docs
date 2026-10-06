---
title: 插件与数据包开发入门
slug: develop
cat: java
level: 3
order: 28
minutes: 19
tags: [java, 插件开发, 数据包, paper, 构建工具, api, 测试]
updated: 2026-10-04
draft: false
---

前面几篇讲的是"用别人的东西"：装插件、装数据包、配服务端。这一篇讲**自己写**。

写给两类人：想给服务器加一条自定义配方或自定义命令的服主，和想从零学 Bukkit / Paper 插件开发的玩家。目标不是让你写出完整作品，而是让你**知道有哪条路、每条路要准备什么、第一次能跑起来的最小骨架长什么样**。

一条贯穿全篇的原则：**类名、方法名、包格式与目录名都会随版本变化，官方文档永远优先于任何教程，包括本篇。** 本篇不编造任何具体的 API 名称或格式号。

## 1. 先选对工具：数据包 / 插件 / 模组

三条路的定位完全不同，先看对比表。

| 维度 | 数据包（datapack） | 插件（plugin） | 模组（mod） |
| --- | --- | --- | --- |
| 要写代码吗 | 不需要（JSON + mcfunction） | 需要 Java | 需要 Java |
| 构建工具 | 不需要 | Maven 或 Gradle | 加载器工具链 |
| 能在原版服务端跑 | 能 | 不能 | 不能 |
| 能在 Paper 系跑 | 能 | 能 | 不能（需桥接） |
| 能改什么 | 游戏已经暴露的数据：配方、战利品表、进度、函数、标签、部分世界生成数据 | API 暴露的一切：命令、事件、实体、方块、GUI、网络 | 游戏代码本身：新方块、新生物、新维度 |
| 怎么测试 | `/reload` + `/datapack list` | 重启服务端 | 重启客户端与服务端 |
| 升级版本的代价 | 低（改格式号与目录名） | 中（API 大体稳定，直接用内部类会碎） | 高（要等加载器与每个模组都更新） |
| 典型用途 | 改规则、加配方、加命令、轻量逻辑 | 经济、领地、菜单、跨服、完整玩法系统 | 新增内容、大型整合包 |

选择顺序建议是：**能用数据包解决就用数据包；数据包做不到再写插件；需要改游戏本身才做模组。** 判断标准：

- 你想改的东西**游戏已经暴露成数据**（配方、掉落、进度、函数、标签）→ 数据包。
- 你想做的事**需要监听事件或与玩家交互**（自定义命令、GUI、经济、权限）→ 插件。
- 你想加的东西**游戏里原本不存在**（新方块、新生物）→ 模组。

## 2. 数据包路径

数据包是三条路里门槛最低的：**没有构建工具、没有依赖、不需要编译**，写几个 JSON 和文本文件就能生效。

### 2.1 目录结构

服务端的数据包放在**存档目录**下的 `datapacks/`，存档目录名由 `server.properties` 的 `level-name` 决定（默认是 `world`）：

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

命名空间目录名（上面的 `my_pack`）就是你引用内容时用的前缀，例如 `my_pack:hello`。**命名空间建议只用小写字母、数字和下划线。**

数据包也可以是 `.zip`，但**zip 里必须直接就是 `pack.mcmeta`**，不能多套一层文件夹。从文件夹右键压缩时最容易多出一层。

### 2.2 `pack.mcmeta` 与 `pack_format`

```json
{
  "pack": {
    "pack_format": 0,
    "description": "My first datapack"
  }
}
```

关于 `pack_format`，只有一条规则要记：

:::warn 不要照抄任何教程里的格式号
`pack_format` 的数值**随每个游戏版本变化**，数据包与资源包各有一套编号。填错的结果是"格式不兼容"的提示，包不会被加载。

**请去查对应版本的官方 wiki 格式表**，而不是抄任何教程（包括本篇）里的数字。上面示例里的 `0` 是占位符，不是可用值。

另外，`pack.mcmeta` 的字段本身也在演进：较新的版本允许声明一个支持的格式范围（例如 `supported_formats` 一类字段）。字段集合随版本变化，以官方 wiki 的 `pack.mcmeta` 页面为准。
:::

### 2.3 目录名的单复数随版本变化

这是新手最容易踩、也最少被教程提到的坑：

| 内容类型 | 较早版本（1.20.x 及以前） | 1.21 起 |
| --- | --- | --- |
| 函数 | `data/<ns>/functions/` | `data/<ns>/function/` |
| 进度 | `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| 战利品表 | `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| 配方 | `data/<ns>/recipes/` | `data/<ns>/recipe/` |
| 谓词 | `data/<ns>/predicates/` | `data/<ns>/predicate/` |
| 函数标签 | `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

也就是说，**从 1.21 起这些目录改成了单数**。写成复数在旧版本上是对的，在新版本上就是"内容不生效且没有明显报错"。请以对应版本的官方 wiki 为准。

### 2.4 函数（`.mcfunction`）

- 一个函数就是**一行一条命令**的文本文件，**不要写开头的 `/`**；以 `#` 开头的行是注释。
- 函数可以被命令调用：`/function my_pack:hello`。
- 较新的版本支持**函数宏**：用 `$(名称)` 占位，再用 `function <函数> with <数据源>` 传入参数。宏是版本相关特性，用之前先确认你的版本支持。

```text
# 给 16 格内的玩家一点视觉效果
# 注意：一定要加过滤条件，不要无过滤地遍历所有实体
execute as @a[distance=..16] at @s run particle minecraft:flame ~ ~1 ~ 0 0 0 0 1
```

### 2.5 标签（tags）

标签用来把内容"挂"到游戏的钩子上。最常用的两个函数标签：

```json
{
  "values": [
    "my_pack:tick"
  ]
}
```

放在 `data/minecraft/tags/function/tick.json`（1.21 前是 `functions/`）时，里面的函数**每游戏刻执行一次**；放在 `load.json` 时，在**加载与 `/reload` 时执行一次**。这是"让数据包持续做事"的标准做法，也是性能问题最常见的来源。

### 2.6 进度与战利品表

进度（advancement）常被当作"自定义触发器"使用：用一个无法自然达成的条件，再由函数手动发放，`rewards.function` 指定要调用的函数。战利品表（loot table）控制方块、生物或箱子的掉落：

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

具体可用的 `type`、条件与函数名以官方 wiki 的对应页面为准，它们**每个版本都会增加或调整**。

### 2.7 测试：`/reload` 与 `/datapack list`

```bash
/datapack list
/datapack enable "file/my_pack"
/reload
/function my_pack:hello
```

要点：

- `/datapack list` 是"包到底被没被识别"的第一诊断命令；
- `/reload` 重载的是**已启用数据包的数据**（函数、标签、进度、战利品表、配方等），**不是重启**；
- 世界生成、维度类型、部分注册表内容必须**重启服务端**才生效；
- 大服上 `/reload` 本身就有成本，不要把它当热更新按钮频繁使用；
- 更多关于包格式、放置位置与排查的内容见 [资源包与数据包](/tutorials/ops/packs)。

### 2.8 性能警告：挂在 tick 上的函数是"每刻成本"

:::warn 每刻执行 = 每秒 20 次
把函数挂到 `tick` 标签上，等于让它**每秒执行 20 次**。里面每多一条命令、每多一次无过滤的实体遍历，成本都会乘以 20。

常见的性能错误：

- `execute as @e` 不带任何选择器过滤，遍历全服实体；
- 在每刻函数里做大量方块查询或 `data get`；
- 用函数写"轮询式"逻辑，本可以用事件或标签代替。

用 `/spark` 一类工具可以定位到函数造成的卡顿。**先写对，再优化**：能放在 `load` 里的不要放在 `tick` 里，能加过滤条件的不要省。
:::

另外两个与命令规模相关的游戏规则值得知道：限制一条命令链/递归长度的 `maxCommandChainLength`，以及限制单条命令能改动方块数量的 `commandModificationBlockLimit`。两者的默认值随版本变化，写大型函数前先查一下。

## 3. 插件路径

插件比数据包强大得多，代价是你需要 **JDK、构建工具、一个测试服务端**。

### 3.1 需要准备什么

| 需要 | 说明 |
| --- | --- |
| JDK | 版本必须与服务端要求的 Java 版本一致 |
| 构建工具 | Maven 或 Gradle，二选一即可 |
| 目标平台的 API | Paper 系用 Paper API，编译时使用，**不打包进你的 jar** |
| 一个测试服务端 | 独立的目录、独立的端口、独立的世界副本 |

Java 版本要求**随游戏版本变化**，各核心分支也可能不同。大致对应关系（**请以 Paper 官方文档为准，不要照抄**）：

| Minecraft 版本 | 需要的 Java |
| --- | --- |
| 1.16.5 及更早 | Java 8 |
| 1.17.x | Java 16 |
| 1.18.x - 1.20.4 | Java 17 |
| 1.20.5 及以后 | Java 21 |

服务端的 Java 版本与编译时用的 `release` 版本**必须对得上**，否则会出现 `UnsupportedClassVersionError` 一类的启动失败。

### 3.2 Maven：`pom.xml`

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

三个要点：

- `<scope>provided</scope>` 表示"服务端已经提供了这个库，不要打进我的 jar"。**这行必须写**，否则你会把整个 API 打进插件里。
- `<version>` 的写法类似 `<Minecraft 版本>-R0.1-SNAPSHOT`，**具体值随版本变化**，请到官方文档或仓库里查当前值，不要照抄。
- 没有用到第三方库时**不要引入 shade 插件**。打包别人的库会带来冲突，也容易踩到许可证问题。

### 3.3 Gradle：`build.gradle`

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

`compileOnly` 就是 Gradle 里的 `provided`：**编译时可见，打包时不包含**。构建产物在 `build/libs/`。

### 3.4 `plugin.yml` 与 `api-version`

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

| 字段 | 作用 |
| --- | --- |
| `name` | 插件名，用于日志前缀与数据文件夹名；不要带空格 |
| `main` | 主类的**完整类名**（含包名），该类必须继承 `JavaPlugin` |
| `version` | 插件版本，出现在日志与 `/plugins` 里 |
| `api-version` | 声明插件按哪个 API 版本编写 |

**`api-version` 为什么重要**：服务端会据此决定以哪种模式加载你的插件。官方文档的说明是——**服务端版本低于插件声明的 API 版本时会拒绝加载**；而**不填写该字段时，插件会以旧式（legacy）方式加载并打印警告**。它还会影响一些兼容性转换行为，所以新插件应当明确填写。

它**不是**版本保证：写了 `api-version` 只代表你声明了目标版本，不代表你的代码在新版本上一定正常。较新的 Paper 还支持另一种清单文件（`paper-plugin.yml`）与不同的插件加载模型，具体写法以对应版本的官方文档为准。

### 3.5 生命周期：`onEnable` 与 `onDisable`

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

- `onEnable()` 在插件被启用时调用。服务端启动时，它发生在服务端自身初始化之后、玩家可以进服之前。
- **不要在 `onEnable()` 里做耗时的阻塞操作**（下载文件、连接远程服务、遍历整个世界），那会直接拖慢服务端启动。
- `onDisable()` 里应该保存配置、取消你自己调度的任务、关闭你打开的资源。
- 服务端在禁用插件时会**自动注销监听器并取消该插件调度的任务**，但**不会**替你保存数据或关闭你打开的文件与连接。

### 3.6 注册命令与监听器

命令执行器：

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

- 返回值表示"这条命令是否被正确处理"：返回 `false` 时服务端会打印该命令的 `usage`。
- 记得检查 `args.length`，否则玩家少打一个参数就会抛数组越界。
- 需要补全时实现 `TabCompleter` 并用 `setTabCompleter(...)` 注册。

事件监听器：

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

注册监听器**必须**调用 `registerEvents(listener, plugin)`，只实现 `Listener` 是不够的。在 `onEnable()` 里绑定命令时，记得判空：

```text
if (getCommand("hello") == null) {
    getLogger().severe("Command 'hello' is missing from plugin.yml!");
    return;
}
getCommand("hello").setExecutor(new HelloCommand(this));
```

**`getCommand()` 在命令没有写进 `plugin.yml` 时会返回 `null`**，直接调用 `setExecutor` 就是启动即崩。这是新手最常见的第一个崩溃。较新的 Paper 版本提供了基于 Brigadier 的命令注册方式（通过生命周期事件注册），对复杂命令更友好；它属于平台特有 API，写法随版本变化，请以官方文档为准。

### 3.7 日志：用 `getLogger()`

```text
getLogger().info("Loaded " + count + " entries.");
getLogger().warning("Config value is missing, using the default.");
getLogger().log(java.util.logging.Level.WARNING, "Failed to save data", exception);
```

- `getLogger()` 返回一个以插件名作为前缀的日志器，日志会进入服务端控制台与日志文件。
- **不要把异常吞掉**：捕获后至少要 `log` 出来，并带上异常对象，否则排查时只剩一句"出错了"。
- 不要用 `System.out.println`：它绕过日志系统，丢失插件名与级别，也没法被日志工具过滤。较新的 Paper 还提供 SLF4J 风格的日志器，写法以官方文档为准。

### 3.8 构建与部署

```bash
mvn -q package          # Maven，产物在 target/
gradle build            # Gradle，产物在 build/libs/
```

部署步骤：

```bash
stop                                              # 在测试服控制台执行
cp target/myplugin-1.0.0.jar /path/to/testserver/plugins/
java -Xms2G -Xmx2G -jar paper.jar --nogui         # 重启后看 onEnable 日志与 /plugins 状态
```

注意两点：

- 如果你用了 shade 一类插件，`original-` 开头的那个 jar **不是**要部署的文件。
- **不要用 `/reload` 来热更新插件。** 插件热重载不是受支持的用法，很容易残留状态、泄漏类加载器，最终表现为各种诡异问题。开发阶段直接重启测试服。

## 4. 去哪里学 API

这是本篇最想强调的一节：**不要凭记忆写方法名。**

| 资源 | 用途 |
| --- | --- |
| 官方 Paper 文档站 | 入门教程、事件与命令的推荐写法、平台特性说明 |
| 官方 Paper Javadoc | **方法名与类名的唯一权威**，可以按你目标版本查看 |
| Bukkit / Spigot 的 Javadoc | 基础 API 的参考，Paper 大部分 API 与之兼容 |
| 你所用核心的官方仓库与文档 | 确认某个行为是 Paper 特有还是 Bukkit 通用 |

具体做法：

1. 先确定你**要针对哪个 Minecraft 版本**开发，然后在 Javadoc 里选对应版本。
2. 想用某个功能时，**先在 Javadoc 里搜到那个类**，确认方法签名，再写代码。
3. **类名、事件名、枚举值都会随版本变化**，博客与旧教程里的写法经常已经失效。
4. **区分 API 与内部实现**：`org.bukkit.*`、`io.papermc.paper.*` 是有兼容承诺的 API；服务端内部类（常被称作 NMS）**没有任何兼容保证**，用它等于把插件绑死在某个版本上。
5. 遇到"方法不存在"的编译错误，先怀疑版本不对，而不是去搜一个能编过的替代写法。

## 5. 测试纪律

开发插件最容易出的事故不是写不出来，而是**在生产服上试**。

| 纪律 | 说明 |
| --- | --- |
| 用独立测试服 | 独立目录、独立端口、世界用副本，**永远不要拿主服当试验场** |
| 对齐环境 | 测试服的**核心版本、构建号、Java 版本**要和生产一致，否则你测的不是同一个环境 |
| 先备份世界 | 插件会改数据，出问题时备份是唯一的退路，见 [备份与恢复](/tutorials/java/backup) |
| 一次只改一件事 | 同时改插件、配置与核心版本，出问题就无从定位 |
| 读控制台堆栈 | 崩溃时看**第一行 + `Caused by` 链 + 你自己包名的那一行**，方法见 [Java 版常见报错与崩溃排查](/tutorials/faq/errors) |
| 用普通玩家账号测一遍 | 权限相关的 bug 只有非 OP 账号才测得出 |
| 上线前灰度 | 先在小服或非高峰时段启用，观察 TPS 与日志 |

## 6. 安全提醒

**插件不是沙箱。** 一个插件运行在服务端同一个 JVM 里，拥有服务端的全部权限：读写文件、打开网络连接、执行系统命令、访问内存中的数据。平台不会限制它。

由此推出三条结论：

- **别人插件里的后门，就是你机器上的后门。** 只从官方发布渠道获取插件，留意被二次打包、改名、加壳的版本。
- **数据包也一样。** 一个函数能做任何命令能做的事：发物品、传送玩家、清空容器、把玩家丢进虚空。只装可信来源的包。
- **你自己的插件也不要信任玩家输入。** 校验命令参数、别把玩家提供的字符串直接当文件路径拼接、别把配置里的字符串当代码执行、发送给玩家的文本注意转义。

插件的安装、审计与排毒流程见 [插件管理与排毒](/tutorials/java/plugin-manage)。

## 7. 小结

- **先选工具**：数据包 → 插件 → 模组，能用简单的就不要用复杂的。
- 数据包**门槛最低**：`pack.mcmeta` 的格式号必须查官方表格，目录名的单复数随版本变化。
- 插件需要 **JDK + 构建工具 + 测试服**；编译时用 `provided` / `compileOnly` 引用 API，**不要打包 API**。
- `plugin.yml` 里 **`api-version` 决定加载模式**，不填会被当作旧式插件并告警；命令必须写进 `plugin.yml`，否则 `getCommand()` 返回 `null`。
- **`onEnable` 里不要做耗时操作**，`onDisable` 里保存状态并释放资源。
- **方法名以官方 Javadoc 为准**，类名与事件名随版本变化。
- **开发永远在测试服**，一次只改一件事，崩溃先读堆栈。
- **插件拥有服务端全部权限**，来源不明的插件就是来源不明的后门。

:::tip 最快的学法：读一个现成的开源插件
从零想"我该调用哪个方法"是最慢的路径。更快的做法是：找一个**功能和你目标相似的开源插件**，读它的 `plugin.yml`、主类、一个命令类和一个监听器类，把最小骨架抄下来，改成你要的功能。你会在半小时里学到比看十篇教程更多的东西。

读的时候带着三个问题：**它在哪个生命周期阶段注册了什么、它怎么处理玩家输入、它把数据存在哪里。** 这三点搞清楚了，插件开发的门就开了。
:::

相关阅读：[资源包与数据包](/tutorials/ops/packs)（包格式与放置位置）、[插件基础](/tutorials/java/plugins)（安装与加载）、[插件管理与排毒](/tutorials/java/plugin-manage)、[Java 版常见报错与崩溃排查](/tutorials/faq/errors)、[备份与恢复](/tutorials/java/backup)。

> 游戏机制、API 与包格式版本以对应官方文档为准。
