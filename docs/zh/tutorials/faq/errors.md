---
title: Java 版常见报错与崩溃排查
slug: errors
cat: faq
level: 2
order: 3
minutes: 18
tags: [java, errors, crash, troubleshooting, plugins, logs, compatibility]
updated: 2026-10-04
draft: false
---

这一篇讲的是**报错怎么读、不兼容怎么定位**。它不打算穷举所有异常，而是给你一套判断顺序：先分清「插件抛了个异常但服务端还活着」和「服务端直接崩了」，再顺着堆栈找到根因，最后用最小化测试确认。

不兼容是 Java 版服务端里最费时间的一类故障，因为它经常**不给明确提示**，或者给出的类名和真正的原因毫无关系。凡是本文没有把握的地方，都会写「以官方文档为准」，而不是编一个看起来合理的解释。

## 1. 怎么读一份报错

### 1.1 日志都在哪

| 位置 | 内容 | 什么时候看 |
| --- | --- | --- |
| `logs/latest.log` | 当前或最近一次运行的完整控制台输出 | **第一现场**。服务端每次重启会覆盖它，要留证据先复制走 |
| `logs/2026-10-04-1.log.gz` | 历史日志，按天与大小轮转并压缩 | 问题发生在几天前、`latest.log` 已经被覆盖时 |
| `crash-reports/crash-...-server.txt` | 崩溃报告：完整堆栈、描述、当时的运行环境 | 服务端**非正常退出**时优先看这里 |
| 控制台窗口本身 | 实时输出，滚动很快 | 边跑边看；崩溃前的内容很容易被冲掉，先复制 |

目录结构与各文件作用见 [服务端结构](/tutorials/java/structure)。

:::tip 先复制，再重启
`logs/latest.log` 会在下一次启动时被覆盖。**在重启服务端之前**，把 `logs/latest.log` 和 `crash-reports/` 里最新的那份复制到别处，否则你要排查的证据就没了。
:::

按关键字快速定位（Linux）：

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

Windows PowerShell：

```powershell
Select-String -Path logs\latest.log -Pattern "ERROR|Exception|Caused by" | Select-Object -Last 40
Get-ChildItem crash-reports | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 1.2 插件异常与致命崩溃的区别

这两者要分开处理，否则很容易在一堆无关的红字里迷路。

| | 插件异常（多数情况） | 致命崩溃 |
| --- | --- | --- |
| 服务端状态 | 继续运行，玩家还在线 | 进程退出，窗口关闭或 systemd 服务停止 |
| 日志结尾 | 异常之后还有正常的 tick 输出 | 结尾是 `This crash report has been saved to: ...` |
| 典型标记 | `Could not pass event ... to X`、`... has failed to load`、`... was disabled` | `Encountered an unexpected exception`、`Exception in server tick loop`、`Watching Server thread` |
| 影响范围 | 一个插件或一个功能 | 整个服务端 |
| 处理方向 | 修插件、更新插件或先禁用它 | 先让服务端起来，再读崩溃报告 |

下面是一段**示意**（用于说明结构，不是某次真实日志）的插件异常，服务端会继续跑：

```text
[12:00:01 ERROR]: Could not pass event PlayerJoinEvent to MyPlugin v1.2.3
java.lang.NullPointerException: Cannot invoke "java.lang.String.toLowerCase()" because "name" is null
        at com.example.myplugin.JoinListener.onJoin(JoinListener.java:42) ~[MyPlugin-1.2.3.jar:?]
        at org.bukkit.plugin.java.JavaPluginLoader$1.execute(JavaPluginLoader.java:315) ~[paper-api.jar:?]
        at org.bukkit.plugin.RegisteredListener.callEvent(RegisteredListener.java:70) ~[paper-api.jar:?]
        ... 20 more
[12:00:02 INFO]: Player Steve joined the game
```

关键点是最后一行：**异常之后服务端照常处理了下一个事件**，说明它是被框架捕获的插件级错误。

### 1.3 Java 堆栈怎么读

一段带 `Caused by` 链的**示意**堆栈：

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

逐行拆开看：

- `[12:00:05 ERROR]:` 是日志前缀（时间与级别），不是报错内容本身。
- `java.lang.RuntimeException: Failed to load plugin data` 是**最外层异常**。它常常只是包装，真正的信息在下面。
- `at 包名.类名.方法名(文件名.java:行号)` 是调用链。**最上面那一行是异常抛出的位置，越往下越接近调用它的上层框架**。
- `Caused by:` 才是根因链，可能有多层。**最后一层 `Caused by` 是最底层的原始原因**。
- `... 18 more` 表示省略了与上一层完全相同的栈帧，不是日志被截断。
- `~[MyPlugin-1.2.3.jar:?]` 是来源标记，说明这个栈帧来自哪个 jar；`~[?:?]` 表示来源未知。

:::tip 只看两行
一份堆栈里真正有用的是**第一个异常的标题行**和**最后一个 `Caused by` 的标题行**。中间几十行 `at` 绝大多数是框架自己的调用链。找到这两行之后，再回头找**第一个 `at` 里出现的、属于你自己插件的包名**，那通常就是出问题的代码位置。
:::

行号是给作者定位代码用的：如果出错的是你自己的插件，行号可以直接对着源码看；如果是第三方插件，行号只能帮你判断「是哪个功能出的问题」，没有更多用处。

另外，日志里的 `[MyPlugin]` 前缀是插件自己打印的。**用插件名去搜日志**，比通读整份日志快得多。

### 1.4 Mixin 与重映射错误长什么样

Mixin 是 SpongePowered 的字节码注入框架，Fabric、Forge、NeoForge、Sponge 以及部分混合端都用它；一些插件也会通过 Mixin 或直接引用服务端内部实现来「hook」游戏逻辑。

这类错误的典型形态：

```text
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
Caused by: org.spongepowered.asm.mixin.throwables.MixinApplyError: Mixin [mymod.mixins.json:PlayerMixin] from mod [mymod] FAILED during APPLY
```

引用服务端内部实现（NMS）时的典型形态：

```text
java.lang.NoClassDefFoundError: net/minecraft/server/v1_20_R1/MinecraftServer
        at com.example.nmsplugin.NmsHook.<clinit>(NmsHook.java:17) ~[?:?]
Caused by: java.lang.ClassNotFoundException: net.minecraft.server.v1_20_R1.MinecraftServer
```

**认这两个特征就够了**：

1. 报错里出现 `mixin`、`MixinApplyError`、`InvalidMixinException`、`MixinTransformerError`、`mixin config` 之类的字样；
2. 报错里出现 `net.minecraft.server.v1_xx_Rx`、`org.bukkit.craftbukkit...` 这类**带版本号或指向服务端内部**的包名。

这些名字本身就说明：这段代码是**针对某个具体版本、某个具体加载器**写的，而它现在跑的环境不是它预期的那个。**这几乎总是版本不匹配，而不是你的配置写错了。**

:::warn 别在这种错误上先怀疑配置
看到 Mixin 或 NMS 相关的类名，先去核对版本（游戏版本、核心/加载器版本、插件或模组版本），不要去改 `config.yml`。具体的报错措辞与支持范围，**以对应加载器与插件的官方文档为准**。
:::

## 2. 插件不兼容

### 2.1 症状对照表

| 报错或症状 | 含义 | 常见原因 |
| --- | --- | --- |
| `NoClassDefFoundError: com/example/lib/Foo` | 运行时找不到这个类 | 缺少硬前置（`depend` 没满足）；插件是给**另一种服务端**编译的；该类来自服务端内部实现 |
| `ClassNotFoundException: ...` | 同上，通常是显式加载类时找不到 | 缺前置；插件是多 jar 结构而你没放全；下载的文件损坏 |
| `NoSuchMethodError: 'void a.b.C.d(...)'` | 类找到了，但**方法签名对不上** | 插件编译时依赖的 API 版本与当前服务端或前置不同（多半是插件比服务端新，或前置太旧） |
| `AbstractMethodError` | 接口新增了方法，实现类里没有 | 插件针对**更老**的 API 编译，而当前服务端或前置已经改过接口 |
| `UnsupportedClassVersionError ... class file version 65.0` | 插件用**更新的 Java** 编译 | 你的 Java 比插件要求的旧（65 = Java 21）；换 Java 或换插件版本 |
| `MixinApplyError` / `InvalidMixinException` / `MixinTransformerError` | Mixin 注入失败 | 插件 hook 了它从未针对过的内部实现，属于版本不匹配 |
| 插件加载成功，但它的指令毫无反应 | 功能被静默关闭 | 软前置（`softdepend`）没满足；对应的扩展或模块没装 |
| 插件在启动时把自己禁用了 | 作者主动做了版本检查 | 当前版本不在支持范围内，插件拒绝加载，日志里通常写明它支持的版本 |

:::note NoClassDefFoundError 有时是「后遗症」
如果日志里前面还有一条 `ExceptionInInitializerError`，那么 `NoClassDefFoundError` 只是静态初始化失败的后续结果，**真正的原因在前一条日志里**。
:::

### 2.2 修复顺序

按下面的顺序做，每一步都只改一个变量：

1. **先确认三个版本**：游戏版本（1.20.4 / 1.21.x 等）、服务端软件（Paper / Purpur / Spigot / Fabric / Forge / NeoForge）、Java 版本。Java 与游戏版本的对应关系见 [环境准备（Windows 与 Linux）](/tutorials/java/environment)。
2. **查插件的支持范围**：发布页的 Supported Versions、README，以及 jar 内 `plugin.yml` 里的 `api-version`。
3. **补齐前置**：Vault、PlaceholderAPI、ProtocolLib、LuckPerms 这类最常被依赖的插件，见 [常用前置插件](/tutorials/java/plugin-deps)。
4. **更新或降级插件**：优先让插件与核心版本对齐。很多插件同时维护多个分支或多个 jar，**先下对分支**，再谈版本号。
5. **换掉停更插件**：如果插件最后支持的版本明显低于你的核心版本，不要硬撑，找仍在维护的替代品。
6. **二分法定位**：上面几步都做完还是不行，用下面的方法把范围缩到一个插件。

### 2.3 二分法：把问题缩到一个插件

```text
1. 停服，把整个 plugins/ 目录复制一份备份
2. 只留下必要的前置和怀疑对象，其余全部移出 plugins/
3. 启动，尝试复现问题
   还报错 -> 问题在这几个里，继续对半拆
   不报错 -> 问题在被移出的那批里，移回一半，重复
4. 每轮都从「移出全部，加回一半」开始，最多 log2(N) 轮
5. 定位到单个插件后，再换它的不同版本试，而不是只试最新版
```

:::tip 不要一次换掉所有东西
「把所有插件升到最新版」会让变量从 1 个变成 N 个，之后再想定位就得从头再来。**一次只动一个变量。**
:::

### 2.4 `/plugins` 的颜色与控制台

在 Paper / Spigot 系服务端里，`/plugins` 会用颜色区分状态：**绿色是已启用，红色是加载失败或被禁用**。它只能告诉你有几个红的，**不会告诉你为什么**。

原因一定写在控制台和 `logs/latest.log` 里，典型形式如下（示意）：

```text
[12:00:02 WARN]: [MyPlugin] Could not load 'plugins/MyPlugin.jar' in folder 'plugins'
org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [Vault]. Please download and install these plugins.
        at org.bukkit.plugin.java.JavaPluginLoader.loadPlugin(JavaPluginLoader.java:155) ~[paper-api.jar:?]
        ...
[12:00:02 WARN]: [MyPlugin] Disabling MyPlugin v1.2.3
```

用插件名搜日志，一般几秒钟就能看到原因。前置相关的细节见 [常用前置插件](/tutorials/java/plugin-deps)，插件安装与加载的基础见 [插件入门](/tutorials/java/plugins)。

## 3. 核心不兼容

### 3.1 API 家族：Bukkit 系是一条线

Bukkit、Spigot、Paper、Purpur、Leaves、Leaf、Folia 属于同一个 API 家族，是**逐层向下兼容**的关系：针对上层写的插件通常能在下游运行，反之不成立。

| 插件编译时针对的 API | Spigot | Paper / Purpur | Folia |
| --- | --- | --- | --- |
| Bukkit / Spigot API | 可以 | 可以 | 需插件声明支持 Folia |
| Paper API | 通常不行（缺类或方法） | 可以 | 需插件适配 |
| NMS 或某个分支专有 API | 仅限对应版本 | 仅限对应版本 | 通常不行 |

:::note 表里的「可以」只是 API 层面的判断
它不代表插件的实际行为一定正确。**插件能不能跑在你的核心上，以插件官方说明为准。**
:::

Folia 是特例：它把世界切成区域并行 tick，因此**要求插件在 `plugin.yml` 里显式声明支持 Folia**，否则会被直接拒绝加载。具体字段与限制以 Folia 官方文档为准。

### 3.2 为什么用 NMS 的插件每次更新都会坏

NMS 指的是 `net.minecraft.server`，也就是服务端的**内部实现**。Mojang 从来没有承诺这部分稳定：类名、方法名、字段名在版本之间都可能变化。

- 只使用 Bukkit / Paper **公开 API** 的插件，跨小版本升级通常没问题。
- 引用 NMS 的插件，**每个游戏版本都要作者重新适配**，跳过中间版本基本必坏。
- Spigot 时代通过重映射把内部实现放进 `v1_20_R1` 这类**带版本号**的包里，所以插件一换版本就会找不到类。
- Paper 从 1.20.5 起改用 Mojang 官方映射，NMS 插件的写法与以前不同，**具体变更以 Paper 官方公告为准**。

报错特征很统一：`NoClassDefFoundError`、`NoSuchMethodError`、`NoSuchFieldError`，并且类名里带 `net.minecraft` 或 `org.bukkit.craftbukkit`。

### 3.3 插件端与模组端不能互换

| 你的服务端 | 能加载插件 | 能加载模组 |
| --- | --- | --- |
| Paper / Purpur / Spigot | 是 | 否 |
| Fabric / Forge / NeoForge | 否（需桥接） | 是 |
| 混合端（Arclight、Mohist、Youer 等） | 通常两者都可 | 通常两者都可 |

- **Fabric / Forge / NeoForge 的模组，插件端加载不了**；反过来，插件也不能直接丢进模组端。
- 混合端能同时加载两边，但**兼容性由混合端自己维护**，两边生态都可能出问题。在混合端上遇到插件报错，先去混合端官方文档确认它支持哪些插件与模组。
- 代理端（Velocity、BungeeCord）是**第三套 API**：Bukkit 插件不能放进 Velocity，Velocity 插件也不能放进 Paper。相关说明见 [跨服端](/tutorials/java/proxy)。

细节与取舍见 [插件入门](/tutorials/java/plugins) 与 [服务端选择](/tutorials/java/core)。

### 3.4 模组服的三方匹配

模组服要同时对上三样东西：**游戏版本 + 加载器版本 + 每一个模组**。少对一样，加载器就会在启动时拒绝启动并列出问题模组。

Fabric 的典型形式（示意，实际措辞以 Fabric 官方文档为准）：

```text
Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Mod resolution encountered an incompatible mod set!
A potential solution has been determined:
         - Replace mod 'Sodium' (sodium) 0.5.8 with a version that supports minecraft 1.20.1
```

Forge / NeoForge 的典型形式（示意）：

```text
Missing or unsupported mandatory dependencies:
        Mod ID: 'create', Requested by: 'mymod', Expected range: '[0.5.1,)', Actual version: '0.5.0'
```

模组在元数据里声明依赖：Fabric 在 `fabric.mod.json` 的 `depends`，Forge / NeoForge 在 `mods.toml` 的 `[[dependencies]]`。另外要分清**仅客户端**、**仅服务端**和**两端通用**的模组：把仅客户端的模组放进服务端 `mods/`，同样会报错。

### 3.5 怎么诊断核心不兼容

1. **读控制台里第一个提到类名、包名或模组 ID 的错误**。后面的错误大多是它的连锁反应。
2. **看 `plugin.yml` 的 `api-version`**（Paper / Spigot 插件）。它是个**提示**：说明作者声明的目标 API 版本，但**不保证**能在你的核心上正常跑。字段缺失时，服务端通常按「老插件」处理并给出提示，具体行为以服务端官方文档为准。
3. **在干净测试服上复现**：同版本核心、只放这一个插件（加必要前置）、用一个新世界。如果照样报错，那就是插件与核心或版本的问题，不是你的配置问题。
4. **对照官方支持矩阵**：插件发布页、核心官方文档、模组页面三处都看一眼。
5. **检查是否混装了不同家族的东西**：插件目录里出现模组、代理端插件丢进子服，都会产生看不懂的报错。

### 3.6 升级与降级策略

- **升级前先备份**：至少包含 `world` 系列目录、插件配置、`server.properties`，并**记录当前所有插件与模组的版本号**。
- **保留上一个核心 jar**：出问题直接换回来，比现场排查快得多。
- **插件版本钉死**：升级核心之后，不要同时把所有插件升到最新；先确认核心能正常启动，再一批一批升插件。
- **不要先升级世界**：世界一旦被更高版本打开，降级回旧核心可能无法读回。**先让核心在新版本上跑通并确认要留下，再动世界。**
- **分批推进**：核心 -> 前置 -> 依赖前置的插件 -> 其他插件，每批都启动验证一次。
- **代理端同理**：先升子服，确认没问题再升代理。

:::warn 降级的前提是「升级前的备份」
世界数据被新版本写入后，旧版本可能直接拒绝加载。**没有升级前的完整备份，就不要做升级。**
:::

## 4. 其他高频报错

### 4.1 UnsupportedClassVersionError（Java 版本不对）

```text
java.lang.UnsupportedClassVersionError: com/example/Plugin has been compiled by a more recent
version of the Java Runtime (class file version 65.0), this version of the Java Runtime only
recognizes class file versions up to 61.0
```

括号里的两个数字是**类文件版本号**，不是 Java 版本号。对照关系：

| 类文件版本 | 对应 Java |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |
| 69 | Java 25 |

- **插件报这个错**：插件编译用的 Java 比你的运行时新，换 Java 或换插件版本。
- **服务端核心报这个错**：核心要求的 Java 比你的运行时新。
- 该用哪个 Java，按游戏版本查 [环境准备（Windows 与 Linux）](/tutorials/java/environment) 里的对照表，**不要凭感觉装最新的**。
- 改 `-Xmx`、改配置、重装插件都没用，这不是内存或配置问题。

:::note Java 过高也会出问题
Java 版本高于要求时通常不会报这个错，但可能触发部分插件或模组的兼容问题。**建议与要求严格对齐**，具体以核心与插件的官方文档为准。
:::

### 4.2 Address already in use（端口被占用）

```text
[12:00:00 ERROR]: **** FAILED TO BIND TO PORT!
[12:00:00 ERROR]: The exception was: java.net.BindException: Address already in use: bind
[12:00:00 ERROR]: Perhaps a server is already running on that port?
```

原因是 25565（或你配置的端口）已经被别的进程占用：另一个服务端实例、上一次没退干净的进程，或别的程序。

Windows：

```powershell
netstat -ano | findstr :25565
taskkill /PID <PID> /F
```

Linux：

```bash
sudo ss -tlnp | grep 25565
kill <PID>
```

同一台机器跑多个服务端时，必须给每个实例不同的 `server-port`。端口相关的排查步骤见 [环境准备（Windows 与 Linux）](/tutorials/java/environment)。

### 4.3 EULA 未同意导致退出

```text
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

这不是崩溃，而是服务端的正常拒绝启动。把服务端目录下的 `eula.txt` 改成 `eula=true` 后重启即可。**只有在你确实阅读并同意 Minecraft EULA 的前提下才这么做**，协议原文以官方页面为准。

### 4.4 内存相关报错

| 报错 | 含义 | 处理方向 |
| --- | --- | --- |
| `java.lang.OutOfMemoryError: Java heap space` | 堆内存不够 | 适当调大 `-Xmx`；同时检查视距、实体数量与插件是否泄漏 |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | GC 花掉大量时间却回收不到内存 | 本质仍是堆太小或内存泄漏，同上 |
| `Could not reserve enough space for object heap` | JVM **启动阶段**就失败，堆要不到 | `-Xmx` 超过可用内存，或用的是 32 位 Java；调小 `-Xmx` 并改用 64 位 Java |
| `Error occurred during initialization of VM` | JVM 初始化失败，通常是参数或内存问题 | 检查启动参数里的 `-Xms` / `-Xmx` 是否合理 |

- `-Xms` 是初始堆，`-Xmx` 是最大堆。两者设成相同值可以减少运行时扩堆的开销，但**不要超过物理内存**，要给操作系统和其他进程留出空间。
- **调大 `-Xmx` 不是万能药**：如果内存是被插件或模组泄漏掉的，调大只是把崩溃时间往后推。用 **spark** 这类工具看内存与火焰图，方法见 [性能优化](/tutorials/java/optimize)。
- 内存与玩家的推荐配比见 [开服协议与配置推荐](/tutorials/java/protocol)。

### 4.5 存档与区块损坏

表现形式与版本相关，常见的是加载区块时报 IO 异常，例如（示意，实际措辞以日志原文与官方文档为准）：

```text
[12:00:00 ERROR]: Error loading chunk [12, 34]: java.io.IOException: Region file is corrupted
[12:00:00 ERROR]: Failed to load chunk at 12, 34
```

处理原则：

1. **不要手动编辑 `region/` 里的文件**，直接改极可能把损坏范围扩大。
2. **优先用备份恢复**，这是最可靠的做法，见 [备份与恢复](/tutorials/java/backup)。
3. 只有一个区块坏、又不想回滚整个存档时，可以用 **MCA Selector**、**NBTExplorer** 这类第三方工具删除或替换该区块，**代价是该区块内的所有内容一起消失**。
4. 如果同一块磁盘反复出现损坏，先怀疑硬件与文件系统（磁盘健康状态、内核日志），修好硬件再谈恢复。

### 4.6 Ticking entity / Ticking block entity 崩溃

这类崩溃的标题行是 `Description: Ticking entity` 或 `Description: Ticking block entity`（也有 `Ticking player`），意思是**某个实体或方块实体在 tick 时抛了异常**，通常来自某个模组，或者某个区块数据已经损坏。

崩溃报告里会写明出问题对象的位置（示意）：

```text
Description: Ticking entity

java.lang.NullPointerException: Cannot invoke "net.minecraft.world.entity.Entity.getType()" because "entity" is null
        at com.example.mymod.TickHandler.onTick(TickHandler.java:64) ~[?:?]

-- Entity being ticked --
    Entity Type: minecraft:pig (net.minecraft.world.entity.animal.Pig)
    Entity's Exact location: 123.45, 64.00, -67.89
    Entity's Block location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; contains blocks 112,0,-80 to 127,255,-65)
```

方块实体的形式类似：

```text
Description: Ticking block entity

-- Block entity being ticked --
    Name: minecraft:chest
    Block type: minecraft:chest
    Location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; ...)
```

**从坐标定位到文件**：

- 区块坐标 = `floor(x) >> 4`、`floor(z) >> 4`。上面例子里 `x=123` 对应区块 `7`，`z=-68` 对应区块 `-5`，与报告里写的 `in 7,-5` 一致。
- 区域文件 = `r.<floor(区块X/32)>.<floor(区块Z/32)>.mca`。例子里区块 `7` 与 `-5` 落在 `r.0.-1.mca`，与报告里的 Region 字段一致。

**安全的处理顺序**：

1. **停服并完整备份世界**。这一步不能省。
2. 用 **MCA Selector**、**NBTExplorer** 等工具打开对应区域文件，**只删除那一个实体或方块实体**，这样损失最小。
3. 找不到具体实体、或者工具无法处理时，才考虑删除整个区块。**删除区块会连带删掉该区块内的建筑、箱子与所有实体。**
4. 处理完先启动验证，确认不再崩，再做一次新的备份。
5. 如果出问题的是模组实体，回到第 3 节核对「游戏版本 + 加载器版本 + 模组版本」，**版本不匹配往往才是根因**。

:::warn 不要在服务端运行时改存档文件
服务端运行中修改 `region/` 文件会造成二次损坏。**停服、备份、再操作。**
:::

### 4.7 Linux 下的权限与端口报错

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `java.io.FileNotFoundException: ... (Permission denied)` | 服务端目录属主不对（比如曾经用 root 跑过） | `sudo chown -R mcserver:mcserver /opt/mcserver`，并用专用用户运行 |
| `java.net.BindException: Permission denied` | 绑定了 1024 以下的特权端口且不是 root | 换用 1024 以上的端口，或按需授予绑定权限（了解风险后再做） |
| 玩家连不上，但日志里没有任何报错 | 防火墙或云安全组没放行 | 属于网络层问题，见 [环境准备（Windows 与 Linux）](/tutorials/java/environment) |

**不要用 root 直接跑服务端**：一旦服务端或插件被利用，攻击者拿到的是整台机器。权限与安全实践见 [[JAVA] 安全插件](/tutorials/ops/security-java)。

## 5. 排查流程与清单

### 5.1 按这个顺序走

1. **读日志**。先确认是「插件异常，服务端还活着」还是「服务端已经崩了」，决定看 `logs/latest.log` 还是 `crash-reports/`。
2. **找出第一个错误**。从第一条 `ERROR` 或 `Exception` 开始读，不要从最后一条倒着猜。
3. **核对三个版本**。游戏版本、核心或加载器版本、Java 版本，先排除最基本的不匹配。
4. **在干净测试服上复现**。同版本核心 + 只放可疑插件 + 新世界，把「你的配置问题」和「插件本身的问题」分开。
5. **二分定位**。用 2.3 的方法把范围缩到一个插件或模组。
6. **应用修复**。按「补前置 -> 调版本 -> 换替代品」的顺序，一次只改一个变量。
7. **验证**。重启后确认日志里不再有该错误，并实际触发一次相关功能。
8. **记录**。把「报错 + 原因 + 处理」写进自己的运维笔记，下次遇到同样的错误能直接查。

### 5.2 排查清单

| 步骤 | 做什么 | 判断标准 |
| --- | --- | --- |
| 1 | 复制 `logs/latest.log` 与最新的 `crash-reports/` 文件 | 证据已保存，重启不会丢 |
| 2 | 判断异常类型 | 能说出是插件级异常还是致命崩溃 |
| 3 | 找到第一个异常与最后一个 `Caused by` | 拿到两个标题行 |
| 4 | 核对游戏版本、核心版本、Java 版本 | 三者互相匹配 |
| 5 | 核对插件的支持版本与前置 | 插件支持当前核心，前置齐全 |
| 6 | 干净测试服复现 | 能稳定复现，或能证明与你的配置无关 |
| 7 | 二分法缩范围 | 锁定到单个插件或模组 |
| 8 | 修复并验证 | 日志无该错误，功能正常 |
| 9 | 记录并备份 | 有笔记，有可回滚的备份 |

### 5.3 去求助时该给什么

在群里或 issue 里问之前，把这些准备好。信息越全，别人越可能一眼看出问题：

- **完整的日志片段**：从第一个 `ERROR` 或 `Exception` 开始，到该异常结束，**包含所有 `Caused by`**。不要只截三行，也不要用手机拍屏幕。
- **崩溃报告**：如果是崩溃，附上 `crash-reports/` 里对应的那份文件，它已经包含版本与环境信息。
- **版本信息**：游戏版本、核心名称与构建号、`java -version` 的输出。
- **插件或模组列表**：`/plugins` 的输出，或者 `plugins/`、`mods/` 目录的文件名与版本号。
- **最近改了什么**：升级了核心、装了新插件、改了哪份配置。**这一条经常直接就是答案。**
- **复现步骤**：什么时候必崩，什么时候不崩。
- **已经试过什么**：避免别人让你重复做一遍已经排除的操作。

## 相关文档

- [环境准备（Windows 与 Linux）](/tutorials/java/environment)：Java 版本对照、端口与权限
- [插件入门](/tutorials/java/plugins)：插件放在哪、怎么被加载
- [常用前置插件](/tutorials/java/plugin-deps)：Vault、PlaceholderAPI、ProtocolLib、LuckPerms
- [服务端选择](/tutorials/java/core)：各核心的定位与兼容范围
- [性能优化](/tutorials/java/optimize)：用 spark 看内存与卡顿
- [[JAVA] 常见问题](/tutorials/faq/faq-java)：按现象直接查的速查表

> 报错信息与配置键名以对应插件与核心的官方文档为准。
