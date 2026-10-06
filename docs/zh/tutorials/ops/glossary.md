---
title: 术语表与名词解释
slug: glossary
cat: ops
level: 2
order: 16
minutes: 12
tags: [术语, terminology, TPS, MSPT, paper, 基岩版, 运维, reference]
updated: 2026-10-04
draft: false
---

开服路上被卡住的人，很多不是不会操作，而是**看不懂别人在说什么**。"你的 MSPT 多少""这个插件有前置吗""你是不是离线服"——每一句里都藏着一个没解释过的词。

这一篇把本站各篇教程里反复出现的名词集中解释一遍，**按主题分组**。每条给出中文名、英文对应词、一两句话说清它是什么，以及在哪一篇里会展开讲。

## 0. 怎么用这一篇

| 你的情况 | 建议 |
| --- | --- |
| 完全新手，还没跑起来 | 先别看这一篇，直接照 [选择服务端核心](/tutorials/java/core) 与 [开启服务端](/tutorials/java/start) 做一遍，遇到不懂的词再回来查 |
| 能跑起来，但看不懂报错和别人的建议 | 重点看第 1、2、3 节，这三节是社区交流里出现频率最高的 |
| 想开基岩服 | 重点看第 4 节，**基岩版与 Java 版的术语几乎不通用** |
| 想做技术向（生电）服 | 重点看第 5 节，它决定了你该选哪个核心 |
| 已经在长期维护服务器 | 重点看第 6 节，这一节的词和"数据能不能保住"直接相关 |

:::note 当字典用，不要背
术语表的价值在于**搜索**，不在于记忆。看教程时遇到不认识的词，回到这里用浏览器的页内搜索找一次即可。真正需要记住的只有一件事：**遇到不确定的默认值，去查官方文档和本地生成的配置文件**。
:::

:::warn 版本与厂商差异
Minecraft 服务端生态里，**默认值、配置键名、可用命令几乎都会随版本和分支变化**。本文只解释"这个词是什么意思"，**不承诺某个键在当前版本的具体默认值**；动手改配置时，请以你所用核心的官方文档和本地生成的配置文件为准。
:::

## 1. 性能类

这一组词回答同一个问题：**服务器现在卡不卡，卡在哪里。**

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| 刻 / tick | tick | 服务端主循环的一次执行。原版目标是每秒 20 次，即一个 tick 约 50 毫秒；实体、红石、方块更新、玩家移动、大部分区块调度都在这个循环里完成 | [性能优化](/tutorials/java/optimize) |
| TPS | Ticks Per Second | 每秒实际完成的 tick 数。原版上限是 20，服务端算不过来时会低于 20。**它是"结果"，不是"原因"** | [用 spark 分析服务器性能](/tutorials/ops/spark) |
| MSPT | Milliseconds Per Tick | 平均每个 tick 花掉的毫秒数，也叫 tick 耗时。它与 TPS 是同一件事的两面：**耗时长期超过 50 ms，TPS 就守不住 20** | [用 spark 分析服务器性能](/tutorials/ops/spark) |
| 50 ms 预算 | 50 ms budget | 每秒 20 tick 推出来的单 tick 时间上限。注意它是**平均值意义上的预算**：偶尔一个 tick 用掉 200 ms，其余 tick 很快，TPS 仍可能接近 20，但玩家会感觉到瞬时卡顿 | [性能优化](/tutorials/java/optimize) |
| 卡顿 / 卡 | lag | 玩家的主观感受，**不是指标**。可能是服务端 tick 慢、可能是网络抖动、可能是客户端渲染问题。排查的第一步就是把它翻译成具体指标 | [实体与掉落物堆积](/tutorials/faq/entity-lag) |
| GC 停顿 | GC pause | Java 垃圾回收时，应用线程可能被暂停的一段时间。堆越大、回收器越不合适，单次停顿可能越长，表现为**周期性的一卡一顿**而非持续变慢 | [性能优化](/tutorials/java/optimize) |
| TPS 下降与 MSPT 尖峰 | TPS drop vs MSPT spike | 两种不同的现象：**TPS 下降**通常是持续性的资源不足（CPU 被限流、实体过多）；**MSPT 尖峰**是短时间的耗时突刺（区块生成、大规模红石、GC）。区分它们才能选对修法 | [用 spark 分析服务器性能](/tutorials/ops/spark) |

### 1.1 为什么说"卡"不是一个指标

"卡"至少可以对应四种完全不同的现象，而它们的修法互不相同：

| 现象 | 典型特征 | 先看什么 |
| --- | --- | --- |
| 主线程算不过来 | TPS 长期低于 20，MSPT 稳定偏高 | spark 的 profiler 调用树 |
| 瞬时尖峰 | TPS 平均值还行，但玩家说"一顿一顿" | spark 的 tick 耗时分布、GC 记录 |
| 宿主机资源不足 | 服务端进程本身不慢，但 CPU 被限流、磁盘慢、内存被换出 | `uptime`、`free -h`、宿主机监控 |
| 网络问题 | 服务端一切正常，只有部分玩家延迟高 | `/spark ping`、玩家与机房之间的链路 |

**把这四类分开，是排查卡顿最重要的一步。** 相关方法见 [用 spark 分析服务器性能](/tutorials/ops/spark)。

### 1.2 阈值不是魔法数字

社区里常说的"TPS 低于 20 就有问题""MSPT 超过 50 就要看"是**经验阈值**，用来触发"去看一眼"，不是"必然故障"。真实的判断依据是**你自己的历史基线**：如果你的服务器平时 MSPT 就在 35，那突然升到 45 就值得查；如果平时就在 48，那 50 反而是常态。基线的建立方法见 [监控与告警](/tutorials/ops/monitoring)。

### 1.3 TPS 与 MSPT 为什么会"不同步"

一个常见的困惑是："TPS 显示 20，但玩家还是说卡。"这并不矛盾，原因至少有三种：

| 情况 | 为什么 TPS 看起来正常 |
| --- | --- |
| 平均值掩盖了尖峰 | TPS 是**一段时间内的平均**，偶发的长 tick 被大量正常 tick 摊平了 |
| 卡在客户端 | 服务端 tick 完全正常，但玩家电脑渲染不掉帧、或视距开得太大 |
| 卡在网络 | 服务端一切正常，但玩家到机房的链路抖动或丢包 |
| 卡在宿主机 | 服务端进程被 CPU 限流或内存换出，但它自己"感觉"只是慢了一点 |

所以判断顺序应当是：**先确认是服务端侧还是非服务端侧，再进入具体排查**。`/spark ping`、宿主机 CPU 与内存、玩家分布在不同地区的延迟，都是这一步的输入。方法见 [用 spark 分析服务器性能](/tutorials/ops/spark)。

### 1.4 tick 与"服务器时刻"的副作用

因为绝大多数世界逻辑都在 tick 循环里推进，**tick 变慢会同时拖慢游戏内的很多东西**：作物生长、熔炉进度、红石时序、生物移动。这也是为什么"TPS 掉到 15"对玩家的体感远不止"慢了 25%"——所有依赖时间的机制都会一起变慢，而依赖精确时序的机器可能直接失效。相关机制见 [生电与红石](/tutorials/java/redstone)。

:::tip 先看哪个
玩家说卡，**先看 TPS 与 MSPT，再看 CPU 占用**。如果 TPS 低但 MSPT 正常，问题往往不在服务端主线程，而要看宿主机 CPU、内存回收或网络。相关推理与官方对容器环境的提醒见 [用 spark 分析服务器性能](/tutorials/ops/spark)。
:::

## 2. 服务端类

这一组词回答：**你跑的到底是什么程序，它由哪些部分组成。**

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| 核心 / 服务端核心 | server core / server software | 你实际用 `java -jar` 启动的那个服务端程序，如 Paper、Fabric、BDS。**"核心"不是官方术语**，是国内社区对服务端实现的习惯叫法 | [选择服务端核心](/tutorials/java/core) |
| 插件 | plugin | 运行在服务端进程内、通过服务端提供的 API 扩展功能的程序，通常是 `.jar`，放进 `plugins/`。**只有插件端（Paper 系）才支持** | [插件基础](/tutorials/java/plugins) |
| 模组 | mod | 直接修改游戏代码的扩展，放进 `mods/`，必须与游戏版本严格对应。**只有模组端（Fabric、Forge、NeoForge）才支持** | [服务端选择](/tutorials/java/core) |
| 前置 / 依赖 | dependency | 某个插件或模组运行前必须同时安装的另一个插件或模组。缺前置的典型表现是**加载失败，并在日志里写明缺什么** | [插件依赖](/tutorials/java/plugin-deps) |
| 代理 / 跨服端 | proxy | 玩家先连到它，再由它把连接转发到后面的真实服务端。用于多服互转、统一入口、统一登录 | [跨服端](/tutorials/java/proxy) |
| BungeeCord | BungeeCord | 最早的成熟代理实现，其插件消息通道后来被其他代理兼容，成为事实标准之一 | [跨服端](/tutorials/java/proxy) |
| Velocity | Velocity | 现代代理实现，性能与安全性设计更好。**现代转发（modern forwarding）**需要代理与后端共享密钥，配置错了就进不去服 | [跨服端](/tutorials/java/proxy) |
| 后端服 | backend server | 代理后面真正承载玩法的服务端实例。玩家在代理上"切服"，实际是断开与一个后端的连接、再连到另一个 | [跨服端](/tutorials/java/proxy) |
| 大厅 | lobby | 一种特殊的后端服：玩家登录后先落在这里，再通过 NPC 或命令进入各玩法服。通常插件很少、配置很轻 | [跨服端](/tutorials/java/proxy) |
| MCDR | MCDReforged | 挂在服务端旁边、通过解析控制台输出与发送命令来工作的**服务端管理框架**。它不改服务端本身，因此不受核心类型限制 | [MCDR](/tutorials/java/mcdr) |

### 2.1 "插件端"和"模组端"是两条平行线

新手最容易混淆的就是这两个词。它们不是"同一个东西的两种叫法"，而是**两套互不兼容的扩展机制**：

| | 插件（plugin） | 模组（mod） |
| --- | --- | --- |
| 加载位置 | `plugins/` | `mods/` |
| 典型核心 | Paper、Spigot、Purpur、Folia | Fabric、Forge、NeoForge |
| 扩展方式 | 调用服务端提供的 API | 直接修改游戏代码 |
| 版本对应 | 相对宽松，跨小版本常可用 | 极其严格，必须完全对应 |
| 典型用途 | 管理、权限、经济、小游戏 | 新内容、新机制、客户端功能 |

**在 Fabric 上用 Bukkit 插件、或在 Paper 上用 Forge 模组，默认都不成立**，需要额外的桥接方案，且往往牺牲兼容性或性能。选核心时先想清楚你要哪一边，见 [选择服务端核心](/tutorials/java/core)。

### 2.2 代理不是"加速器"

"跨服端"这个词容易让人以为它能降低延迟。**它不优化网络路径**，它的作用是让多个服务端看起来像一个：统一入口地址、玩家在服与服之间切换而不用重连新 IP、登录与权限集中管理。它同时引入新的复杂度（转发密钥、后端鉴权、玩家数据同步），配置前请读 [跨服端](/tutorials/java/proxy)。

:::warn 装了代理就不要把后端直接暴露
后端服应当只接受来自代理的连接。**如果后端端口对公网开放，玩家可以绕过代理直连**，代理上的登录校验、权限限制、白名单全部失效。相关端口与防火墙配置见 [网络安全基础](/tutorials/ops/network-security)。
:::

## 3. Java 版概念

这一组词是 Java 版生态的"行话"，出现频率最高。

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| Bukkit | Bukkit | 早期为原版服务端提供插件 API 的项目。后来的服务端基本都以它的 API 为共同方言，所以插件常被称为"Bukkit 插件" | [选择服务端核心](/tutorials/java/core) |
| Spigot | Spigot | Bukkit 的后继分支，长期是插件端的事实标准，也是后来许多分支的起点 | [选择服务端核心](/tutorials/java/core) |
| Paper | Paper | 目前最主流的 Spigot 分支，做了大量性能与机制修复并持续维护。**为性能改动过部分原版行为**，这是它和生电冲突的根源 | [选择服务端核心](/tutorials/java/core) |
| Purpur | Purpur | 基于 Paper 的分支，额外提供大量可配置的游戏玩法选项 | [选择服务端核心](/tutorials/java/core) |
| Folia | Folia | 基于 Paper 的分支，把世界拆成区域并行 tick。**以插件兼容性为代价换取多核利用**，且跨区域交互行为与 Paper 不同 | [选择服务端核心](/tutorials/java/core) |
| API | Application Programming Interface | 服务端提供给插件调用的编程接口。**用 API 写的插件跨版本相对稳定**，直接碰内部实现则相反 | [插件基础](/tutorials/java/plugins) |
| NMS | net.minecraft.server | 服务端内部类所在的包名，被借来指代"绕过 API 直接调用内部实现"。**这些内部结构没有兼容性保证**，版本一升就可能失效 | [插件基础](/tutorials/java/plugins) |
| api-version | api-version | `plugin.yml` 里的字段，声明插件按哪个版本的 Paper API 编写。官方文档说明：**服务端版本低于该值时拒绝加载插件**；不填写会被当作旧式插件加载并打印警告 | [插件基础](/tutorials/java/plugins) |
| YAML | YAML Ain't Markup Language | 大多数插件与 Paper 系配置文件使用的格式。**缩进即语法**，多用空格、不要用 Tab，写错缩进会直接解析失败 | [配置服务端](/tutorials/java/config) |
| 正版验证 | online-mode | `server.properties` 的 `online-mode`。开启时服务端会向 Mojang 的会话服务验证玩家身份 | [配置服务端](/tutorials/java/config) |
| 离线服 | offline-mode / cracked server | `online-mode=false` 的服务器。玩家名可以任意填写，**任何人都能冒用别人的名字**，也无法获得官方 UUID | [配置服务端](/tutorials/java/config) |
| UUID | Universally Unique Identifier | 玩家的唯一标识。正版服由 Mojang 会话服务给出；离线服则由服务端按名字推导，**同名即同 UUID，改名即换身份** | [常用服务端指令](/tutorials/java/commands) |
| 白名单 | whitelist | 只允许名单内玩家进入的机制。相关键为 `white-list`，名单文件是 `whitelist.json`；`enforce-whitelist` 决定重载后是否踢掉不在名单上的在线玩家 | [配置服务端](/tutorials/java/config) |
| OP / 管理员 | operator | 拥有服务端管理命令权限的玩家，记录在 `ops.json`。**给 OP 等于给出很大的权限**，给之前想清楚 | [常用服务端指令](/tutorials/java/commands) |
| RCON | Remote Console | 通过网络向服务端发送控制台命令的协议，默认端口 25575。**它不加密**，密码与命令都可被截获，**只应在本机或加密隧道内使用** | [网络安全基础](/tutorials/ops/network-security) |

### 3.1 这几个核心是什么关系

它们不是并列的五种选择，而是一条**继承链**：

```text
原版服务端 (vanilla)
  └─ Bukkit / CraftBukkit  提供插件 API
       └─ Spigot           性能与修复
            └─ Paper       大量优化与修复（当前主流）
                 ├─ Purpur 更多玩法选项
                 └─ Folia  区域化并行 tick
```

理解这条链的用处在于：**Paper 的配置文件里会出现 Spigot 和 Bukkit 的键**（`spigot.yml`、`bukkit.yml`），因为它们是从上游继承来的。看到不认识的文件名时，先想想它属于链上的哪一层。

### 3.2 正版验证、UUID 与白名单的关系

这三个词经常被放在一起讨论，因为它们**互相决定**：

- **正版服**（`online-mode=true`）：玩家身份由 Mojang 会话服务确认，UUID 是账号级的，**换名字不影响身份**。白名单、权限、经济数据都挂在这个 UUID 上。
- **离线服**（`online-mode=false`）：服务端按玩家名推导 UUID，**换名字就是换了一个人**，而冒用别人的名字就等于冒充别人。

把一台正版服改成离线服（或反过来），**已有玩家的 UUID 会变**，后果是白名单、权限、经济数据、领地全部对不上人。这不是"改一个开关"的小事，迁移前务必先备份并核对身份映射，见 [备份与恢复](/tutorials/java/backup)。

:::warn RCON 不要暴露在公网
RCON 的设计目标是本机或可信网络内的远程管理，**协议本身不加密**。把它映射到公网等于把控制台交给扫描器。需要远程使用时，走 SSH 隧道或 VPN，见 [网络安全基础](/tutorials/ops/network-security)。
:::

### 3.3 配置文件分三类，别混在一起

新手最常见的混乱来源，是把不同层级的配置文件当成一回事。它们其实分工明确：

| 类别 | 典型文件 | 谁生成的 | 改错了会怎样 |
| --- | --- | --- | --- |
| 服务端本体配置 | `server.properties` | 服务端首次启动时生成 | 键名写错会被忽略或回落默认值，**改动需要重启生效** |
| 服务端分支配置 | `spigot.yml`、`bukkit.yml`、`paper-world-defaults.yml` 等 | 对应分支首次启动时生成 | 影响机制与性能，**生电场景下尤其敏感** |
| 插件配置 | `plugins/<插件名>/config.yml` 等 | 插件首次加载时生成 | 格式错误会导致插件加载失败，**原因通常写在日志里** |

一条实用经验：**改任何配置文件之前先复制一份**。配置文件是纯文本，体积很小，备份成本几乎为零，但改坏之后的排查成本很高。备份范围与回滚流程见 [备份与恢复](/tutorials/java/backup)。

### 3.4 白名单与 OP 是两件不同的事

这两个词经常被放在一起，但它们控制的是完全不同的东西：

| | 白名单（whitelist） | OP（operator） |
| --- | --- | --- |
| 控制什么 | **谁能进服** | **进来之后能做什么** |
| 存放位置 | `whitelist.json` | `ops.json` |
| 相关开关 | `white-list`、`enforce-whitelist` | `op-permission-level` 决定 OP 的默认权限等级 |
| 常见误区 | 以为开了白名单就等于安全 | 以为给了 OP 只是"多几个命令" |

**给了 OP 就等于给了很大的权限**，包括能执行会改变世界的命令。给之前想清楚对方是谁，以及这个权限能不能收回。相关命令见 [常用服务端指令](/tutorials/java/commands)。

## 4. 基岩版概念

基岩版的生态与 Java 版几乎不重叠，术语也自成一套。

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| BDS | Bedrock Dedicated Server | 微软官方发布的基岩版专用服务端，**不开源**，插件能力有限，通常靠行为包与脚本扩展 | [基岩版 BDS](/tutorials/bedrock/bds) |
| 协议版本 | protocol version | 客户端与服务端通信的数据格式版本。**基岩版客户端会自动更新**，服务端跟不上就连不上，这是基岩服最常见的故障 | [基岩版协议与版本](/tutorials/bedrock/protocol) |
| Addon | add-on | 基岩版扩展内容的统称，由行为包、资源包等组成，通过世界设置加载 | [基岩版服务端类型](/tutorials/bedrock/type) |
| 行为包 | behavior pack | Addon 中负责逻辑与规则的部分：可以加实体、改掉落、写脚本 | [基岩版服务端类型](/tutorials/bedrock/type) |
| 资源包 | resource pack | Addon 中负责外观与音效的部分：材质、模型、音效、界面文字 | [基岩版服务端类型](/tutorials/bedrock/type) |
| allowlist.json | allowlist.json | 基岩版服务端的白名单文件，对应 `server.properties` 中的 `allow-list` 开关。**文件名与 Java 版的 `whitelist.json` 不同** | [基岩版 BDS](/tutorials/bedrock/bds) |
| permissions.json | permissions.json | 基岩版服务端用于指定玩家权限等级的文件，等级分 visitor、member、operator；`server.properties` 的 `default-player-permission-level` 决定新玩家的默认等级 | [基岩版 BDS](/tutorials/bedrock/bds) |
| Xbox Live 验证 | Xbox Live authentication | 基岩版的账号体系。**连接远程（非局域网）服务器时始终需要 Xbox Live 验证**，`online-mode` 主要影响本地与局域网场景 | [基岩版协议与版本](/tutorials/bedrock/protocol) |
| Nukkit | Nukkit | 用 Java 写的基岩版服务端实现，提供类似 Bukkit 的插件 API。原项目活跃度已大幅下降 | [第三方基岩服务端](/tutorials/bedrock/third-party) |
| PMMP | PocketMine-MP | 用 PHP 写的基岩版服务端实现，插件生态成熟，社区规模大 | [第三方基岩服务端](/tutorials/bedrock/third-party) |
| PNX | PowerNukkitX | Nukkit 的活跃后继分支之一，目标是继续维护并跟进新版本 | [第三方基岩服务端](/tutorials/bedrock/third-party) |

### 4.1 为什么基岩服总是"更新完就进不去"

因为**客户端会自动更新，而服务端不会**。官方 BDS 的更新节奏与客户端版本绑定，第三方实现的跟进通常更慢。玩家手机上的客户端升到新版本后，服务端还停在旧协议版本，结果就是连不上。

这也解释了"协议版本"这个词为什么在基岩版里出现频率极高。应对方式与各实现的跟进情况见 [基岩版协议与版本](/tutorials/bedrock/protocol)。

### 4.2 第三方实现要自己评估

Nukkit、PMMP、PNX 都**不是官方服务端**，对原版机制的还原程度、更新速度、插件质量差异很大。选之前先确认三件事：**是否已跟进你要的协议版本**、**插件生态是否满足需求**、**项目最近是否还在维护**。参见 [第三方基岩服务端](/tutorials/bedrock/third-party-setup)。

:::note 术语不要跨版本套用
`whitelist.json`（Java 版）与 `allowlist.json`（基岩版）是两个不同的文件；Java 版的"插件"和基岩版的"行为包"不是同类东西。**在群里提问时先说清是哪个版本**，能省下大量来回。
:::

## 5. 生电与技术类

这一组词属于"技术向生存"（生电）玩家的日常，也是**最容易和性能优化冲突**的一类需求。

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| 生电 | technical Minecraft | "生存 + 电路"，指以红石机器、刷怪塔、精确方块与实体行为为核心玩法的技术向生存。**对原版行为是否被改动极其敏感** | [生电与红石](/tutorials/java/redstone) |
| 刷怪塔 | mob farm / mob grinder | 利用刷怪机制集中生成并击杀生物以获取掉落物的装置。它同时是**性能大户**：实体多、掉落物多、区块常驻加载 | [实体与掉落物堆积](/tutorials/faq/entity-lag) |
| 红石时钟 | redstone clock | 周期性输出红石信号的电路，用来定时触发其他装置。**高频时钟是典型的 MSPT 尖峰来源** | [生电与红石](/tutorials/java/redstone) |
| TNT 复制 | TNT duplication | 利用特定版本机制复制 TNT 实体的技巧，是许多大型工程的基础。**部分服务端分支为性能或平衡改动过相关行为**，会导致复制失效 | [生电与红石](/tutorials/java/redstone) |
| 实体激活范围 | entity activation range | Spigot 系引入的机制：**超出一定距离的实体不是不加载，而是降低 tick 频率**。调小可省 CPU，但会让远处的机器表现异常 | [实体与掉落物堆积](/tutorials/faq/entity-lag) |
| 区块加载 / 强加载 | chunk loading / force load | 区块只有被加载才会 tick。玩家、出生点区块、传送门、`/forceload` 与插件都能维持加载；**强加载指人为让它长期保持加载**，代价是常驻的 CPU 与内存开销 | [实体与掉落物堆积](/tutorials/faq/entity-lag) |
| 刷怪上限 | mob cap | 一个世界里同时存在的生物数量上限。它在 `bukkit.yml` 的 `spawn-limits` 等位置配置，Paper 系还可按世界覆盖，或改成按玩家分别计算 | [实体与掉落物堆积](/tutorials/faq/entity-lag) |

### 5.1 "加载"和"tick"不是一回事

新手常把这两个词混用，但它们描述不同阶段：

| 阶段 | 含义 | 典型开销 |
| --- | --- | --- |
| 加载（load） | 区块数据在内存里存在，可以被读写 | 内存、磁盘 I/O |
| tick | 区块内的实体、方块实体、随机刻按规则推进 | CPU（主线程） |

一个区块**可以被加载但不被 tick**（例如超出模拟距离），也可以因为强加载而**长期既加载又 tick**。掉落物本身不会让区块保持加载，但只要那片区块因别的原因保持加载，里面的掉落物就会一直 tick、一直堆积。这一区别是排查"实体越堆越多"的关键，见 [实体与掉落物堆积](/tutorials/faq/entity-lag)。

### 5.2 优化与生电经常互斥

"把激活范围调小、把刷怪上限调低、把漏斗检查放宽"能让 TPS 好看，但**也会让农场和机器直接失效**：村民不补货、刷怪塔不出货、依赖物品分离的装置乱套。生电服应当反过来——把影响原版行为的项调回原版，或直接改用贴近原版的核心。参见 [生电与红石](/tutorials/java/redstone) 与 [性能优化](/tutorials/java/optimize)。

:::warn 改配置前先备份
任何"为了性能"的改动都可能改变游戏机制。**改之前备份配置文件，改之后回测机器**，是生电服的固定流程。备份范围见 [备份与恢复](/tutorials/java/backup)。
:::

## 6. 运维类

这一组词是"把服务器当成一件长期要维护的事"之后必然遇到的。

| 术语 | 英文 | 解释 | 相关文档 |
| --- | --- | --- | --- |
| 备份 | backup | 把世界与配置复制成一份可以在出事时恢复的副本。**只复制不验证恢复，不算备份** | [备份与恢复](/tutorials/java/backup) |
| 异地备份 | offsite backup | 把备份副本放到**与主机不同的物理位置或不同的服务商**。主机整机损毁、被入侵或机房事故时，本机上的备份会一起消失 | [异地备份](/tutorials/ops/offsite-backup) |
| 3-2-1 原则 | 3-2-1 rule | 一条通用的备份经验法则：**至少 3 份副本、放在 2 种不同介质上、其中 1 份在异地**。它是经验总结，不是标准 | [异地备份](/tutorials/ops/offsite-backup) |
| 异地 | off-site | 与主机不在同一物理位置、不受同一事故影响的存储位置。**同一台机器上的另一个目录、同一台机器上的另一块盘，都不算异地** | [异地备份](/tutorials/ops/offsite-backup) |
| UPS | Uninterruptible Power Supply | 不间断电源。它的主要价值不是"停电继续玩"，而是**给服务端争取几分钟完成安全停机**，避免写入过程中的硬掉电损坏存档 | [机架、交换机与 UPS](/tutorials/ops/hardware-rack) |
| 面板 | panel / control panel | 用网页界面管理服务端的工具，提供启停、控制台、文件管理、备份等功能，常见如 Pterodactyl、MCSManager。**它同时是一个新的攻击面** | [面板管理](/tutorials/ops/panels) |
| 守护进程 | daemon | 在后台常驻、负责执行具体任务的程序。面板架构里通常有一个守护进程跑在每台被管理的机器上，**它与网页端之间的通信需要重点加固** | [面板管理](/tutorials/ops/panels) |
| DDoS | Distributed Denial of Service | 分布式拒绝服务攻击：用大量来源的流量把目标带宽或连接资源占满。**主机侧能做的事有限，通常需要服务商在上游清洗** | [常见网络攻击与防御](/tutorials/ops/attack-defense) |
| 限速 | rate limiting | 主动限制单位时间内的连接数或请求数，避免少量来源耗尽资源。**它是缓解手段，不是根治手段**，且设置过严会误伤正常玩家 | [常见网络攻击与防御](/tutorials/ops/attack-defense) |
| 取证 | forensics | 在重启、重装、封禁之前，先把**几分钟后就会永久消失的现场**固定下来：进程、连接、日志、时间线。**顺序错了，证据就没了** | [应急与取证](/tutorials/ops/incident-forensics) |
| 事后分析 | post-mortem analysis | 出事之后再去查"当时发生了什么"。**它只能解释过去，不能阻止下一次** | [用 spark 分析服务器性能](/tutorials/ops/spark) |
| 事前告警 | alerting | 在问题影响到玩家之前，由系统主动通知你。它与事后分析是互补关系，不是替代关系 | [监控与告警](/tutorials/ops/monitoring) |
| 磁盘 I/O 等待 | I/O wait | CPU 在等磁盘完成读写而空转的时间占比。**它高的时候，服务端看起来"没在算"，但就是慢** | [机架、交换机与 UPS](/tutorials/ops/hardware-rack) |
| 运行手册 | runbook | 针对"某条告警响了该怎么办"预先写好的处理步骤。**没有运行手册的告警，等于半夜把你叫醒去看一个你不知道怎么处理的问题** | [监控与告警](/tutorials/ops/monitoring) |

### 6.1 "备份"这个词被误用得太厉害

日常对话里，"我备份了"至少可能指四件不同的事：

| 说法 | 实际含义 | 够不够 |
| --- | --- | --- |
| "我复制了 world 文件夹" | 有了一份同机副本 | 能挡误删，挡不住整机故障 |
| "备份脚本每天在跑" | 有一个任务在定时执行 | **不看退出码就不知道它是否成功** |
| "备份文件在" | 磁盘上有归档文件 | **没验证过恢复就不算备份** |
| "备份恢复过一次" | 真的在别处还原并启动成功 | 这才是可用的备份 |

四层里只有最后一层能真正救命。**验证恢复的方法**见 [异地备份](/tutorials/ops/offsite-backup)。

### 6.2 为什么 UPS 算运维词

因为断电和"服务器崩了"是两件不同性质的事。**服务端崩溃通常不会损坏存档**（进程异常退出，但文件系统仍是一致的）；而**写入过程中的硬掉电可能留下半写的文件**，轻则丢区块，重则存档无法加载。

所以 UPS 的定位是"让服务端有机会安全停机"，而不是"让玩家停电也能玩"。选型、NUT 监控与自动关机配置见 [机架、交换机与 UPS](/tutorials/ops/hardware-rack) 与 [家用电脑开服与维护](/tutorials/ops/home-hosting)。

:::tip 最容易漏的一条
上面这些词里，真正被反复忽略的是**"验证恢复"**。备份文件存在、脚本退出码为 0，都不代表能把服务器恢复起来。定期真的恢复一次，见 [异地备份](/tutorials/ops/offsite-backup)。
:::

## 7. 与术语对应的常用命令

术语只有落到具体命令上才有用。下表把前面几节最常见的词和"看一眼现状"的命令对应起来。**这些命令的具体输出格式随发行版和版本变化，请以你系统上的实际输出为准。**

| 想确认的词 | 命令 | 看什么 |
| --- | --- | --- |
| 宿主机整体负载 | `uptime` | 末尾三个数字是 1、5、15 分钟的平均负载；**要和 CPU 核心数一起看**，单核满载是 1.00 |
| 内存与交换 | `free -h` | 重点看 `available` 这一列，它比 `free` 更接近"还能用多少" |
| 磁盘空间 | `df -h` | 看挂载点对应的剩余空间；**磁盘满会导致服务端写存档失败** |
| 磁盘健康 | `smartctl -a /dev/sdX` | 通电时间、写入量、重分配扇区等属性；命令来自 `smartmontools` |
| 网络连接概况 | `ss -s` | 各类 socket 的总数；**连接数异常增长往往先于内存耗尽出现** |
| 监听端口 | `ss -lntp` / `ss -lunp` | TCP / UDP 分别在听哪些端口、由哪个进程持有 |
| 服务状态 | `systemctl status <服务名>` | 是否 active、最近几次退出、最近日志片段 |
| 服务日志 | `journalctl -u <服务名>` | 用 `--since "1 hour ago"` 缩小范围；**取证时加 `--utc`** |
| HTTP 可用性 | `curl -s -o /dev/null -w '%{http_code}' <URL>` | 只输出状态码，适合塞进脚本做判断 |
| UPS 状态 | `upsc <ups名>` | `ups.status` 为 `OL` 表示市电、`OB` 表示电池供电；变量名以 NUT 文档与机型为准 |

:::tip 别只看单次结果
`free -h` 和 `df -h` 是**快照**，单次结果几乎说明不了问题。真正有用的是**趋势**：磁盘是不是每周都在涨、内存是不是每天都在爬。趋势要靠定时采集，见 [监控与告警](/tutorials/ops/monitoring)。
:::

## 8. 术语之间的关系

零散的名词背下来没用，**把它们连成几条因果链**才有用：

| 你想做的事 | 需要先理解的术语 | 为什么 |
| --- | --- | --- |
| 判断服务器卡不卡 | tick、TPS、MSPT、50 ms 预算 | 只有把"卡"翻译成指标，才能开始排查 |
| 选服务端核心 | 插件、模组、生电、代理 | 核心决定了你能用什么扩展，以及原版行为是否被改动 |
| 配置插件 | YAML、前置、API、NMS、api-version | 大部分"插件红了"都出在这几个词上 |
| 管理玩家 | online-mode、UUID、白名单、OP | 身份与权限全部挂在 UUID 上 |
| 开基岩服 | BDS、协议版本、行为包、allowlist.json | 基岩版自成一套，Java 版经验不通用 |
| 保住数据 | 备份、异地、3-2-1、UPS、取证 | 出事时能救你的只有这几样 |
| 长期维护 | 面板、守护进程、DDoS、限速、监控告警 | 把服务器当成一件需要持续照看的事 |

## 9. 下一步

术语看懂了，接下来按顺序做这几件事就够了：

| 想做的事 | 去哪一篇 |
| --- | --- |
| 先挑一个合适的核心 | [选择服务端核心](/tutorials/java/core) |
| 把服务端跑起来 | [开启服务端](/tutorials/java/start) |
| 出问题不知道看哪里 | [日志与报错排查](/tutorials/faq/errors) |
| 服务器卡 | [用 spark 分析服务器性能](/tutorials/ops/spark) |
| 把数据保住 | [备份与恢复](/tutorials/java/backup)、[异地备份](/tutorials/ops/offsite-backup) |
| 把机器加固 | [系统安全加固](/tutorials/ops/system-security) |
| 出事了怎么办 | [应急与取证](/tutorials/ops/incident-forensics) |
| 装一套监控和告警 | [监控与告警](/tutorials/ops/monitoring) |

## 10. 症状对照表

最后给一张"倒着查"的表：**从现象出发，找到对应的术语**。这张表不能替代排查，但能让你知道该往哪个方向搜索。

| 你看到的现象 | 先想到哪些术语 | 去哪里看 |
| --- | --- | --- |
| 玩家说"卡"，但 TPS 显示 20 | 客户端渲染、网络抖动、MSPT 尖峰 | 第 1 节；[用 spark 分析服务器性能](/tutorials/ops/spark) |
| TPS 长期低于 20，MSPT 稳定偏高 | 实体堆积、刷怪上限、区块加载、插件热点 | 第 1、5 节；[实体与掉落物堆积](/tutorials/faq/entity-lag) |
| 隔一段时间就"顿一下" | GC 停顿、自动保存、定时任务 | 第 1 节；[性能优化](/tutorials/java/optimize) |
| 服务端突然自己关了 | 看门狗、`OutOfMemoryError`、磁盘满 | [日志与报错排查](/tutorials/faq/errors) |
| 存档加载不了 / 少了区块 | 硬掉电、半写文件、UPS | 第 6 节；[备份与恢复](/tutorials/java/backup) |
| 插件启动就报红 | 前置、api-version、NMS、版本不匹配 | 第 2、3 节；[插件依赖](/tutorials/java/plugin-deps) |
| 玩家进不来，提示验证失败 | online-mode、UUID、正版验证 | 第 3 节；[配置服务端](/tutorials/java/config) |
| 基岩版玩家集体进不来 | 协议版本、客户端自动更新 | 第 4 节；[基岩版协议与版本](/tutorials/bedrock/protocol) |
| 红石机器突然不工作 | 生电、TNT 复制、实体激活范围、服务端分支改动 | 第 5 节；[生电与红石](/tutorials/java/redstone) |
| 备份脚本"跑了"，但文件不对 | 退出码、异地、验证恢复 | 第 6 节；[异地备份](/tutorials/ops/offsite-backup) |
| 面板上不去 / 控制台连不上 | 守护进程、端口、证书 | 第 6 节；[面板管理](/tutorials/ops/panels) |
| 带宽被打满、SSH 都连不上 | DDoS、限速、上游清洗 | 第 6 节；[常见网络攻击与防御](/tutorials/ops/attack-defense) |

> 各软件的安装与配置以官方文档为准。
