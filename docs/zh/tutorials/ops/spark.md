---
title: 用 spark 分析服务器性能
slug: spark
cat: ops
level: 3
order: 15
minutes: 16
tags: [spark, profiler, tps, mspt, lag, diagnostics, paper, performance]
updated: 2026-10-04
draft: false
---

服务器"卡"是一个现象，不是一个原因。玩家说卡，可能是某个插件占满了主线程、可能是实体太多、可能是玩家在跑图导致区块实时生成，也可能是宿主机 CPU 被限流或超售。**spark 的价值在于把"卡"从一种感受变成一份可以指着看的证据**：哪条调用路径、哪个插件、占了多少百分比。

本篇只讲 spark 本身怎么用。调优方向见 [性能优化](/tutorials/java/optimize)，实体堆积见 [实体与掉落物堆积](/tutorials/faq/entity-lag)，崩溃与报错见 [[JAVA] 常见问题](/tutorials/faq/faq-java)。

:::warn 命令以官方文档为准
本文列出的命令与选项来自 spark 官方文档（spark.lucko.me/docs）与 PaperMC 文档，并已逐条核对。**spark 在不同平台、不同大版本上可用的子命令与选项略有差异**；动手前先用 `/spark` 或 Tab 补全确认你这一版支持哪些参数，不要凭记忆拼选项。
:::

## 1. spark 是什么、怎么装

### 1.1 它由三部分组成

spark 是一个性能分析工具（profiler），官方把它定位为"面向 Minecraft 客户端、服务端和代理端的性能分析器"，由三块能力组成：

| 组件 | 能回答的问题 |
| --- | --- |
| Profiler（采样分析器） | CPU 时间花在哪些方法、哪些插件上？ |
| Memory Inspection（内存检查） | 堆里什么占得最多？GC 停顿多不多？ |
| Health Reporting（健康度报告） | TPS、CPU、内存、磁盘的长期状态如何？ |

它同时是一个网站：spark.lucko.me 既是官网，也是在线的报告查看器（viewer）。你在游戏里跑完一次采样，数据会上传，然后给你一个链接，用浏览器打开就能看调用树、火焰图等。

几点需要先建立的认知：

- **spark 是采样型（sampling）分析器**。官方在 "spark vs. others" 中说明：采样分析在数值精度上通常不如插桩（instrumentation），但它对目标程序几乎不造成拖慢，因此在实践中往往更能反映真实的执行情况。
- **它记录"一切"**。官方在对比 timings 时指出：timings 需要人工预先定义分析区域，它能统计事件次数、对不熟悉分析器的新手更友好；而 spark 不需要预先定义，会记录全部调用栈，因此更适合回答"到底慢在哪一行代码"。
- **它不只是服务端插件**。spark 也能作为 Java agent 挂到任意 JVM 程序上（包括原版 vanilla 服务端），并且会对原版服务端自动套用反混淆映射。

### 1.2 各平台怎么装

官方下载页（https://spark.lucko.me/download）按平台分发不同的包。**先选对你的平台，再下载**，把 jar 放进对应目录，重启服务端即生效。

| 平台 | 官方下载页条目 | 放到哪里 | 备注 |
| --- | --- | --- | --- |
| Bukkit / Spigot / Paper / Purpur | Bukkit (Paper/Spigot) | `plugins/` | 服务端插件；Paper 1.21+ 已内置，见下 |
| Fabric | Fabric | `mods/` | 模组形式 |
| Forge | Forge | `mods/` | 模组形式 |
| NeoForge | NeoForge | `mods/` | 模组形式 |
| Velocity | Velocity | `plugins/` | 代理端；命令前缀不同，见 1.4 |
| BungeeCord | BungeeCord | `plugins/` | 代理端；命令前缀不同，见 1.4 |
| Sponge | Sponge (API 12) | `mods/` | 官方下载页单独列出 |
| 客户端（Fabric/Forge 等） | 对应平台包 | `mods/` | 分析客户端卡顿；命令用 `/sparkc` |
| 任意 JVM 程序 / 原版服务端 | Standalone (Java Agent) | 启动参数 | 见 1.3 |

:::note Paper 1.21 及以上已经内置
官方安装文档明确说明：**Paper 1.21 或更新版本已经把 spark 打包进服务端，不需要再装插件**。只有在你需要比内置版本更新的 spark 时，才把独立插件 jar 放进 `plugins/`，并在启动参数里加上 `-Dpaper.preferSparkPlugin=true` 来覆盖内置版本。
:::

:::warn 只从官方站点下载
把 jar 放进 `plugins/` 意味着把整台服务器的控制权交给它。**请从官方下载页 https://spark.lucko.me/download 获取**，不要用来路不明的转载包或网盘文件。下载页里另有 "Other Platforms"（Folia、Geyser、Minestom、Nukkit、Hytale 等），官方说明这些由社区提供、按原样（as-is）支持，使用前请自行评估。
:::

### 1.3 独立 agent（Standalone Agent）

当目标不是"标准服务端"时（例如原版服务端、自研 Java 程序），用 agent 方式挂载。启动时挂：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar -jar application.jar [application args]
```

也可以指定 agent 监听端口：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222 -jar application.jar [application args]
```

agent 支持的参数（多个参数用逗号分隔）：

| 参数 | 含义 |
| --- | --- |
| `port={port}` | agent 监听的端口，默认 `2222` |
| `start` | 挂载后立即开始采样 |
| `open` | 挂载后把查看器链接打印到控制台/日志 |

例如：

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222,start,open -jar application.jar
```

如果程序**已经在运行**，可以直接附加到进程（把 `<pid>` 换成进程号）：

```bash
java -jar spark-x.y.z-standalone-agent.jar <pid>
java -jar spark-x.y.z-standalone-agent.jar <pid> port=2222
```

不带 PID 运行这个 jar 时，它会列出当前所有 Java 进程及其 PID。附加成功后，**连接方式会打印在被附加程序自己的控制台/日志里**；按提示用一个 SSH 会话连进去，就能执行常规的 spark 命令，用 `exit` 退出该会话。

### 1.4 确认它加载成功了

最直接的验证方式：**不带任何参数执行 `/spark`**，它会打印版本与可用子命令列表。如果提示未知命令或没有输出，说明没加载成功。

按顺序排查：jar 是否放对目录（`plugins/` 还是 `mods/`）、是否选对了平台包、服务端是否真的重启过、启动日志里有没有 spark 的加载信息。

命令前缀因平台而异，官方文档特别标注：

| 环境 | 使用的命令 |
| --- | --- |
| 服务端（Bukkit 系、Fabric/Forge 服务端） | `/spark` |
| BungeeCord | `/sparkb` |
| Velocity | `/sparkv` |
| Forge/Fabric **客户端** | `/sparkc` |

权限方面：需要 `spark` 权限，或者使用各子命令自己的权限节点。官方文档列出的权限节点包括 `spark.profiler`、`spark.health`、`spark.ping`、`spark.tps`、`spark.tickmonitor`、`spark.gc`、`spark.gcmonitor`、`spark.heapsummary`、`spark.heapdump`、`spark.activity`。多数情况下**把自己设为 OP** 就够了。

:::tip 一个容易被忽略的配置
spark 的配置项 `overrideTpsCommand` 默认是 `true`，并且**只在 Bukkit 系服务端生效**：也就是说默认情况下 `/tps` 会被 spark 接管，输出的就是 spark 的 TPS 视图。
:::

## 2. 先看整体健康度

### 2.1 TPS 与 MSPT 到底是什么意思

先理解 tick 循环（官方 "The Tick Loop" 指南）：

- Minecraft 服务端的目标是**每秒执行 20 个 tick**，也就是**每 50 毫秒一个 tick**。
- 一个 tick 里要做的事包括：处理玩家发来的数据包（移动、放置/破坏方块、攻击实体）、更新玩家与其他实体的位置、向玩家广播世界变化、生成野怪并处理 AI 与寻路、处理红石更新，等等。
- 如果某个 tick 用时**少于** 50 毫秒，服务端会在剩余时间里"睡眠"，等到该开始下一个 tick 时再继续。**睡眠是健康的**。
- 如果某个 tick 用时**超过** 50 毫秒，下一个 tick 只能被推迟，因为 tick 不能并行执行。所有事情都会"向右平移"，同样一秒钟里完成的 tick 变少，玩家感受到的就是变慢、变卡。

两个指标由此而来：

| 指标 | 全称 | 含义 | 目标值 |
| --- | --- | --- | --- |
| TPS | ticks per second | 平均每秒完成多少个 tick | **20** |
| MSPT | milliseconds per tick | 平均每个 tick 花多少毫秒 | **50 或更低** |

官方文档说明，`/spark tps` 的输出还会包含 MSPT 的**最小值、中位数、95 分位与最大值**，并且 spark 会按好坏自动把这些数字标成绿色、黄色或红色。

**为什么最大值很重要**：上述指标都是平均值或统计量。官方在 tick 循环指南里特别提醒：完全可能出现"大多数 tick 只用 20 毫秒（健康），偶尔某个 tick 用 300 毫秒（不健康）"的情况，这就是**卡顿尖峰（lag spike）**——平均值会把尖峰抹平，所以只看平均 TPS 会漏掉问题。

### 2.2 /spark tps

```text
/spark tps
```

它打印 TPS 与 CPU 使用率。这是每次排查的**第一步**：先确认"到底卡不卡"，再决定要不要上分析器。

### 2.3 /spark health

`health` 子命令生成服务端健康报告，**内容包括 TPS、CPU、内存和磁盘占用**。官方文档给出的用法：

```text
/spark health
/spark health upload
/spark health show
/spark health show --memory
/spark health show --network
```

| 命令 | 行为 |
| --- | --- |
| `/spark health` | 在查看器里打开，**live dashboard 模式，数据每 10 秒自动刷新** |
| `/spark health upload` | 上传一份**静态**健康报告，不会自动更新 |
| `/spark health show` | 直接在控制台打印基础报告，不开浏览器 |
| `/spark health show --memory` | 追加 JVM 内存使用信息 |
| `/spark health show --network` | 追加系统网络使用信息 |

### 2.4 /spark ping

```text
/spark ping
/spark ping --player <username>
```

不带参数时查看**所有玩家的平均 ping**（往返时延 RTT）；带 `--player` 看某个玩家的当前 ping。

**为什么单独列出来**：玩家说"卡"，可能是服务端 tick 慢，也可能只是他自己到机房的网络链路差。ping 高而 MSPT 正常，问题就在网络路径上，改服务端配置没有用。这一步是用来**把网络问题和 tick 问题分开**的。

### 2.5 怎么看一段时间的变化

单次 `/spark tps` 只是快照。要看趋势，用 `/spark health` 的 live dashboard：官方说明它每 10 秒自动更新，因此可以把它当成一条时间线，观察 TPS、MSPT、CPU 是**持续偏低**还是**周期性掉一下**。

| 形态 | 说明 | 下一步 |
| --- | --- | --- |
| TPS 持续偏低、MSPT 持续偏高 | 主线程长期忙不过来 | 直接上 profiler 找热点 |
| TPS 大部分时间正常，偶尔掉一下 | 卡顿尖峰 | 用 tickmonitor 定位，再用 `--only-ticks-over` 采样 |

:::note 怎么理解"低 TPS + 正常 MSPT"
按 tick 循环的机制推断：如果 MSPT 确实正常（每个 tick 都在 50 毫秒预算内完成），TPS 就不应该长期偏低，因为 tick 之间的睡眠会把节奏补齐。所以出现"TPS 低但 MSPT 正常"时，要怀疑的不是"某个插件写得慢"，而是**外部因素**：服务端被暂停了（例如长时间的 stop-the-world、保存世界、宿主机挂起或迁移），宿主机 CPU 被限流或被其他租户抢占，或者**数据本身就是错的**。

最后这一点有官方依据：spark 的指标全部取自服务端事件与 Java/系统 API，官方在 "About spark metrics" 里明确说明，**在容器里运行时 CPU/内存等指标偶尔会被误报**（Pterodactyl 等环境），"如果看起来不对，很可能是 spark 拿到的原始数据不对"。需要说明的是：**"低 TPS + 正常 MSPT 指向外部因素"是本文依据 tick 循环机制做的推断，官方文档并没有直接下这个结论**，请结合 CPU 使用率、宿主机负载与 GC 日志一起判断。
:::

## 3. 采样分析（profiler）

### 3.1 命令与选项

以下命令与选项全部来自官方 Command Usage 页面。

基础操作：

| 命令 | 作用 |
| --- | --- |
| `/spark profiler start` | 以默认模式开始采样 |
| `/spark profiler stop` | 停止并查看结果（默认会上传并给出链接） |
| `/spark profiler cancel` | 停止采样且**不上传**结果 |
| `/spark profiler open` | 采样已在后台运行时，直接打开查看页，不停止它 |
| `/spark profiler info` | 查看当前采样状态 |

常用选项：

| 选项 | 作用 |
| --- | --- |
| `--timeout <seconds>` | 到时自动停止 |
| `--only-ticks-over <milliseconds>` | **只记录超过该时长的 tick**，用来抓尖峰 |
| `--thread *` | 跟踪所有线程 |
| `--thread <thread name>` | 只跟踪指定线程 |
| `--thread <pattern> --regex` | 按正则匹配要跟踪的线程名 |
| `--interval <milliseconds>` | 采样间隔，默认 4 |
| `--alloc` | 分析**内存分配**（内存压力）而不是 CPU |
| `--alloc --alloc-live-only` | 分配分析时只保留采样结束时仍未被回收的对象 |
| `--alloc --interval <bytes>` | 分配分析的采样粒度，默认 `524287`（约 512 KB） |
| `--combine-all` | 把所有线程合并到一个根节点下 |
| `--not-combined` | 不把线程池里的线程分组到一起 |
| `--ignore-sleeping` | 只记录不处于 sleeping 状态的线程样本 |
| `--force-java-sampler` | 强制使用 Java 采样器，而不是 async 采样器 |
| `stop --comment <comment>` | 停止时附上备注，会显示在查看器里 |
| `stop --save-to-file` | 把结果保存到配置目录下的文件，**不上传** |

组合示例（官方指南与 Paper 文档里的写法）：

```text
/spark profiler start --timeout 60
/spark profiler start --timeout 600
/spark profiler start --only-ticks-over 150
/spark profiler stop --comment "改动前基线"
/spark profiler stop --save-to-file
```

:::note 关于"不带参数的 /spark profiler"
官方文档把 profiler 的操作方式写成 `start`、`stop`、`cancel`、`open`、`info` 这几个明确的子命令，并没有把"不带参数的 `/spark profiler`"描述成一个独立动作。另外官方配置文档说明 spark 的**后台分析器默认开启**（配置项 `backgroundProfiler` 默认 `true`），这种情况下你可以直接用 `/spark profiler stop` 或 `/spark profiler open` 去操作**已经在跑的那一次**。因此：**按子命令写，不要假设裸命令的行为**。
:::

### 3.2 标准流程

```text
1. 确认问题正在发生（官方强调：profiling 必须在问题发生时进行，否则采不到东西）
2. 开始采样：/spark profiler start --timeout 60
3. 让服务器在真实负载下跑 30 到 60 秒（玩家在线、复现操作）
4. 到时自动停止；聊天栏或控制台会出现一个 spark.lucko.me/xxxx 链接
5. 在浏览器打开这个链接
6. 先看 "Server thread"（服务端主线程），从最宽的节点往下点
```

时长怎么选：如果问题**此刻正在发生**，30 到 60 秒足够；如果问题是**间歇性**的，用更长的 `--timeout`（Paper 官方文档给的示例是 `--timeout 600`，也就是 10 分钟），或者改用第 3.6 节的尖峰打法。

### 3.3 在查看器里读报告

官方 "Using the viewer" 页面把查看器的结构讲得很清楚。

**线程（Threads）**：打开报告先看到的是一份线程列表。可以把线程理解成"在程序里干某件事的工人"。对服务端来说，**通常唯一真正关心的是 "Server thread"**，也就是负责跑游戏的主线程。根节点（线程本身）永远显示 100%，因为 100% 的采样时间都花在这个线程里。

**调用帧 / 节点（Call frames）**：每个节点显示三样信息——**名字**、**占该线程总时间的百分比**、以及**毫秒数（悬停时显示）**。点击节点会展开它的子节点。

展开服务端线程时的典型形状（官方示例）：

```text
Server thread
  java.lang.Thread.run()
    MinecraftServer.run()
      MinecraftServer.tick()        <- 真正干活的地方
      Thread.sleep()                <- 睡眠，健康，可以忽略
```

**睡眠占比是第一个要看的东西**。官方在 tick 循环指南里给了经验值：

| 睡眠（waitForNextTick / sleep）占比 | 含义 |
| --- | --- |
| 越高越好（官方示例中是 81%） | 服务端有余量，能扛住突发负载 |
| 低于 20% | 服务端已经很忙，某些 tick 可能已经在卡 |
| 低于 5% | 基本可以认为正在卡，没有余量 |

**但这些全是平均值**，官方特别强调：尖峰会被平均掉，所以"睡眠占比很高"不等于"没有卡顿尖峰"。

**三种视图**（顶部工具栏切换）：

| 视图 | 内容 | 什么时候用 |
| --- | --- | --- |
| All（默认） | 完整可展开的调用树 | 顺着百分比往下找 |
| Flat | 把**最慢的 250 个方法调用**平铺在顶层 | 快速看"总体上谁最耗时" |
| Sources | **按插件/模组分别给出一棵树**，顶层是该来源发出的调用 | 直接定位"是哪个插件" |

Flat 视图还有两个维度：Display 可选 **Top Down**（正常方向，展开看子调用）与 **Bottom Up**（反向，展开看"是谁调用了它"）；Sort 可选 **Total Time**（含子调用的总时间）与 **Self Time**（方法自身耗时）。

**火焰图（Flame Graph）**：可以点顶部火焰图标，或右键某个节点选 "View as Flame Graph"。官方说明：**节点宽度对应它占用的时间比例**；点击节点可以"聚焦"它并让它铺满整页。常说的"看最宽的那条"，指的就是这里。

**反混淆映射（Deobfuscation）**：Minecraft 的客户端与服务端把类名和方法名混淆过。查看器**默认会自动识别该套用哪套映射**；如果没识别对，用页面右上角的下拉菜单手动选择。

**书签**：按住 `alt` 点击某个方法调用，或右键选 "Toggle bookmark"，该方法会高亮，并且**书签会被编码进 URL**——把这条带书签的链接发给别人，对方打开时会自动展开并高亮同样的位置。这是"指给别人看"的最省事方式。

### 3.4 服务端线程与异步线程

- **Server thread**：tick 循环所在的主线程，绝大多数性能问题都在这里。
- **异步线程（async threads）**：插件的异步任务、区块保存、网络 IO（Netty）、GC 线程等。它们**不直接占用 tick 预算**，但如果它们抢 CPU，或者与主线程争锁，仍然会影响主线程。

官方文档里 `--thread *` 的说明是"跟踪**所有**线程"，这意味着默认情况下并不是所有线程都被纳入采样。**如果你怀疑某个插件把重活丢到了异步线程**（表现为 CPU 很高但服务端线程看起来不忙），就显式用 `--thread *` 再采一次。

### 3.5 怎么把时间归因到某个插件

这是 spark 相比 timings 最实用的地方：**报告里会出现插件自己的包名**。

例如服务端线程里出现一条很宽的：

```text
com.example.shop.ShopManager.tickShops()
```

那么 `com.example.shop` 这个插件就是在做这件事。判断方法：

1. 在 All 视图里顺着百分比往下展开，直到看到一个"看起来像插件"的包名（通常是反向域名，如 `me.lucko.`、`com.example.`）。
2. 或者直接切到 **Sources 视图**，它会**按插件/模组分别建树**，谁的树最"胖"谁就是嫌疑对象。
3. 如果最顶层是服务端自己的方法（NMS），别急着下结论：用 **Bottom Up** 或继续展开，看看**是谁调用了它**——很可能是某个插件通过事件或 API 触发了这段服务端代码。

### 3.6 专打卡顿尖峰：tickmonitor 加 only-ticks-over

尖峰会被平均值掩盖，所以官方给了一套专门的组合拳。

第一步，用 `tickmonitor` 找出"多慢算异常"：

| 命令 | 作用 |
| --- | --- |
| `/spark tickmonitor` | **开关**监控系统（再执行一次即关闭） |
| `/spark tickmonitor --threshold <percent>` | 只报告**比平均 tick 时长高出指定百分比**的 tick |
| `/spark tickmonitor --threshold-tick <milliseconds>` | 只报告**超过指定毫秒数**的 tick |
| `/spark tickmonitor --without-gc` | 开启监控，但关闭关于 GC 活动的报告 |

官方说明：默认阈值是 **100%**，也就是"这个 tick 花的时间是平均值的两倍"才报告。想更敏感就调低，例如：

```text
/spark tickmonitor --threshold-tick 50
/spark tickmonitor --threshold-tick 70
```

第二步，用 `--only-ticks-over` 只采这些异常 tick：

```text
/spark profiler start --only-ticks-over 150
```

官方给的经验：阈值**建议取 50 到 100 之间，但一定要小于你那些"卡"的 tick 的实际时长**，否则会把尖峰本身过滤掉。官方示例里的卡顿动作超过 300 毫秒，于是取 150 毫秒"保险一点"。

这样采出来的报告里，所有"正常"的游戏工作都被过滤掉了，剩下的就是尖峰本身，热点会非常清楚。

## 4. 其他诊断工具

| 命令 | 回答什么问题 | 什么时候用 |
| --- | --- | --- |
| `/spark tps` | 现在到底卡不卡？TPS、MSPT、CPU 各是多少？ | 每次排查的第一步；改配置前后做对比 |
| `/spark health` | 整体健康度如何（TPS、CPU、内存、磁盘）？ | 需要连续观察；live dashboard 每 10 秒刷新 |
| `/spark health upload` | 同上，但要一份可分享的静态快照 | 发给人看、留档 |
| `/spark health show` | 不开浏览器，直接在控制台看 | SSH 环境里快速看一眼；加 `--memory` 或 `--network` |
| `/spark ping` | 玩家延迟高不高？是网络问题还是 tick 问题？ | 玩家报"卡"，先分清这两类 |
| `/spark profiler start` | CPU 时间花在哪些方法、哪些插件上？ | 确认"真的卡"之后 |
| `/spark tickmonitor` | 哪些 tick 异常慢？多久出现一次？ | 间歇性卡顿、尖峰 |
| `/spark gc` | GC 历史如何？停顿频繁吗？ | 怀疑内存或 GC 导致卡顿 |
| `/spark gcmonitor` | 持续盯着 GC，发生时报出来 | 怀疑 GC 尖峰；开一次、复现、再关一次 |
| `/spark heapsummary` | 堆里什么对象占得最多？ | 怀疑内存泄漏；结果上传到查看器 |
| `/spark heapdump` | 完整堆快照（`.hprof`） | 需要用 MAT 等离线工具深挖；文件很大 |
| `/spark activity` | 最近谁用过 spark、做了什么？ | 多人共管时确认是不是别人在采样；`--page <n>` 翻页 |

下面补充几个容易用错的细节。

### 4.1 GC 相关：/spark gc 与 /spark gcmonitor

`/spark gc` 打印服务端的 **GC（垃圾回收）历史**，回答"GC 有没有在拖慢服务端"。

`/spark gcmonitor` **开关** GC 监控系统（再执行一次关闭）。它的价值在于**和卡顿对齐**：先开监控，复现一次卡顿，然后看卡顿的时刻有没有对应的 GC 活动。如果时间对得上，方向就转向内存与 GC 参数，而不是去找插件热点。

### 4.2 内存相关：/spark heapsummary 与 /spark heapdump

两者的区别很重要：

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `/spark heapsummary` | 堆**摘要**，上传到查看器 | 快速看"哪类对象占内存最多"，用来判断有没有泄漏嫌疑 |
| `/spark heapdump` | 完整 `.hprof` 文件，写到磁盘 | 需要离线用专业工具深挖对象引用链 |

`/spark heapdump` 的选项是 `--compress <type>`，支持的压缩类型为 `gzip`、`xz`、`lzma`。官方文档把 `--include-non-live`（包含不可达对象）和 `--run-gc-before`（生成前建议 JVM 先跑一次 GC）**标记为已废弃（deprecated）**；`heapsummary` 的 `--run-gc-before` 同样已废弃。

:::warn heapdump 很重
完整堆转储会**写一个和堆大小同量级的文件到磁盘**，并且过程会让 JVM 有明显停顿。生产环境上不要在高峰期随手执行，先确认磁盘空间。
:::

## 5. 从报告里定位问题

### 5.1 决策表

先说明一个前提：**方法名会随版本、服务端实现和映射集变化**。官方查看器示例里用的是 `WorldServer.doTick()`、`WorldServer.tickEntities()` 这类名字（对应较老的映射）；在别的版本上你看到的可能是 `ServerLevel.tick`、`Level.tickEntities` 之类。**不要背名字，要看形状和百分比**，并利用查看器的自动反混淆。

| 报告里的现象 | 大概率结论 | 下一步 |
| --- | --- | --- |
| 某个**插件的包名**（如 `com.example.shop`）在服务端线程里占比最高 | 这个插件就是瓶颈 | 升级、找替代、限制触发频率；把报告链接发给作者 |
| `Entity.tick` 或 `Level.tickEntities`（旧映射下是 `WorldServer.tickEntities`）占大头 | **实体太多** | 见 [实体与掉落物堆积](/tutorials/faq/entity-lag)：清理掉落物、限制刷怪、调低视距与实体相关配置 |
| 区块相关调用（`ChunkMap`、`ChunkGenerator` 等）占大头 | **区块生成或加载** | 做地图预生成，减少玩家探索新区域带来的实时生成 |
| 漏斗与方块实体 tick（`hopper`、`LevelChunk.tickBlockEntities` 等） | **红石、漏斗与方块实体负载** | 给漏斗限速、合并农场、减少常加载区块里的红石机器 |
| 时间线上出现长 GC 停顿 | **内存或 GC 配置** | 调堆大小与 GC 参数；先用 `heapsummary` 排除泄漏 |
| 只有**某一个世界或某一片区域**慢 | 特定农场或建筑 | 定位坐标，就地拆解、限制，或拆到独立服务端 |
| `waitForNextTick` 或 sleep 占比很低（低于 5%） | 服务端整体没有余量 | 不是单点问题，而是容量不足：减负载或升级单核性能 |
| sleep 占比很高，但玩家仍报卡 | 平均值掩盖了尖峰 | 走 3.6 节：`tickmonitor` 加 `--only-ticks-over` |

### 5.2 归因的两个常见误区

**误区一：看到 NMS 方法就以为是"服务端的问题"。** `Entity.tick` 这类方法是服务端代码，但**触发它的可能是插件、玩家行为或农场设计**；用 Flat 视图按 **Bottom Up** 展开，找"谁调用了它"。

**误区二：只看 Total Time 就下结论。** 一个方法 Total Time 很高，可能只是因为它调用了很多子方法（它自己是"壳"）；切到 **Self Time** 排序，看**真正把时间花在自己身上**的方法，那才是要改的地方。

### 5.3 一定要做前后对比

单份报告只能说明"现在是这样"，不能说明"改这个有没有用"。正确做法：

```text
1. 采样 A：/spark profiler stop --comment "改动前基线"
2. 做且只做一处改动
3. 在尽量相同的条件下采样 B（玩家数、时间段、是否在同一区域）
4. 对比两次报告里同一个节点的百分比变化
5. 如果没变好，回滚这次改动，再试下一个假设
```

一次只改一个变量，否则无法归因。对比时看的是**同一节点的百分比变化**，而不是绝对值——因为两次采样的总时长与玩家数可能不同。

## 6. 实战流程与注意事项

### 6.1 采样本身有开销

spark 是采样型分析器，开销比插桩小得多，但**不是零**：

- 后台分析器**默认开启**，采样间隔默认 **10 毫秒**（配置项 `backgroundProfilerInterval`）。
- 采样引擎默认是 `async`（async-profiler），官方说明它比 Java/WarmRoast 引擎更准确（不受安全点采样偏差影响），**系统支持时会自动使用**。它要求 Linux 或 macOS 加 x86_64/aarch64 架构；在容器里可能还需要补 `libstdc++`。
- **分配分析（`--alloc`）与 heapdump 更重**：前者需要 HotSpot 调试符号（Java 11 及以上通常自带），后者要写大文件并让 JVM 停顿。

:::warn 不要让分析器一直跑
采样是为了回答一个具体问题，采完就停。用 `--timeout` 让它自己停是最省心的做法。**在已经卡的服务器上长期挂着分析器，只会让情况更糟。**
:::

### 6.2 分享报告与隐私

官方文档对"分享"的说法是正面的：报告会自动上传到查看器并给你一个链接，**这个链接可以自由发给别人**——发给帮你排查的人，或者发给插件与模组的作者，用来指出问题。书签机制还会把"我指的是这一行"编码进 URL。

但有几件事必须清楚：

1. **上传是默认行为**。`/spark profiler stop` 默认上传；只有 `/spark profiler stop --save-to-file` 是**保存到配置目录下的文件而不上传**。
2. **官方文档没有描述"把报告设为私有"的开关**。在本文核对过的页面里，没有任何关于访问控制或私有报告的说明。因此**请把报告链接当作"任何拿到它的人都能打开"来对待**。
3. **原始数据是可取的**。官方 "Raw spark data" 页面说明：给链接加上 `?raw=1` 可以得到 JSON 元数据；甚至可以直接向 `https://spark-usercontent.lucko.me/<code>` 请求原始数据（类型为 `application/x-spark-sampler`、`application/x-spark-heap`、`application/x-spark-health`）。也就是说，**那串短码本身就是访问凭据**。
4. **元数据里包含身份信息**。官方示例的元数据里就有发起者的用户名与 UUID。把链接贴到公开场合前，先想一下这一点。
5. **本地打开**：不想上传时，可以把 `.sparkprofile` 或 `.sparkheap` 文件拖拽到查看器页面的拖放区域，在本地查看。
6. 如果是拿去求助，PaperMC 官方文档的建议是**带着 spark 报告去他们的 Discord `#paper-help` 频道**（这是 Paper 官方给出的渠道）。

### 6.3 一次完整采样的清单

```text
准备
[ ] 确认已加载：/spark
[ ] 记录当前状态：/spark tps
[ ] 确认问题正在发生（否则采不到东西）
[ ] 确认磁盘空间足够（尤其是可能要 heapdump 时）
采样
[ ] 整体持续卡   -> /spark profiler start --timeout 60
[ ] 间歇性尖峰   -> 先 /spark tickmonitor 找阈值，再 /spark profiler start --only-ticks-over <ms> --timeout <s>
[ ] 怀疑异步线程 -> 加 --thread *；怀疑内存分配 -> 加 --alloc（开销更大）
[ ] 不要让它无限期运行
读报告
[ ] 先看 Server thread 的 sleep 占比
[ ] 从最宽的节点往下点，跟着百分比走
[ ] 用 Sources 视图归因到具体插件
[ ] 用 Flat 加 Self Time 找"真正自己耗时"的方法
[ ] 用 Bottom Up 找"是谁调用了这个慢方法"
[ ] 尖峰场景确认 --only-ticks-over 生效（报告里不应有大量正常 tick）
结论与复验
[ ] 写下结论：哪个插件、哪类实体、哪个区域，还是容量不足
[ ] 一次只改一处，改完用相同条件再采一次
[ ] 用 --comment 给报告打标签，保留链接做对比
```

### 6.4 什么时候不该用 spark

玩家只是延迟高时，先 `/spark ping`，那可能是网络路径问题；服务端起不来或崩溃时去看日志与崩溃报告，profiler 帮不上忙；TPS 正常但玩家仍说"卡"时，先确认是不是客户端渲染、视距或网络抖动，而不是盲目上分析器。

配套阅读：[性能优化](/tutorials/java/optimize)（配置与 JVM 调优）、[实体与掉落物堆积](/tutorials/faq/entity-lag)（实体过多）、[系统安全加固](/tutorials/ops/system-security)（主机侧加固）、[备份与恢复](/tutorials/java/backup)（改动前的兜底）。

> spark 的命令与选项以其官方文档为准；不同平台可用命令略有差异。
