---
title: "[生电篇]服务端选择"
slug: tech-server
cat: java
level: 3
order: 29
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生电, carpet, fabric, 服务端]
updated: 2026-10-08
draft: false
---

生电服要的不是"一个能开的服务端"，而是**一整套能被规则精细控制的原版机制**：机器按预期工作、TNT 与更新抑制可控、崩了能立刻拉起来。本篇讲清三条路线各自的代价，并把 PCA 协议单独说透。

## 一、三条路线一览

| 路线 | 代表 | 能得到什么 | 代价 |
| --- | --- | --- | --- |
| **Fabric 服务端 + MCDR**（最推荐） | Fabric + `MCDR` | Carpet 及其全部附属包、进程外管理器、官方插件目录 | 需要自己装 mod，没有插件生态的即插即用 |
| 生电优化端 | Paper 系等插件端 | TPS 优化、插件生态 | 会改原版行为，机器可能不工作 |
| 多线程端 | `c2me-fabric`、`async` | 区块与实体处理加速 | 多线程改变时序，影响机器行为 |

**先说结论**：开生电服选 **Fabric 服务端 + MCDR**，其余两条只在明确知道自己要什么时才用。

## 二、为什么最推荐 Fabric 服务端 + MCDR

这不是偏好问题，而是三条硬事实叠出来的结果。

### 生电工具链全在 Fabric 上

`Carpet` 本体，以及它的四个主流附属包（`Carpet Extra`、`Carpet TIS Addition`、`Carpet AMS Addition`、`Carpet Org Addition`）**全部是 Fabric 服务端 mod**。也就是说，生电玩家真正依赖的那套规则系统，只在 Fabric 上有完整实现；选别的核心，等于放弃这套工具链。规则与附属包的细节见 [Carpet 及其附属包](/tutorials/java/tech-carpet)。

### MCDR 独立在服务端进程之外

`MCDR`（MCDReforged）是一个 Python 写的服务端管理器，官方描述是：A rewritten version of MCDaemon, a python tool to control your Minecraft server。

关键在于**它跑在服务端进程之外**：

- 服务端崩了，MCDR 自己还活着，可以**自动重启**；
- 崩溃的那一刻它还有执行能力，所以**能在崩溃时执行备份**；
- 它通过控制台与日志和服务端交互，不侵入服务端本身的逻辑。

这三点对生电服尤其重要：世吞、更新抑制、大规模 TNT 阵列都是能让服务端直接挂掉的玩法，管理器必须比服务端更"耐活"。安装与指令见 [MCDR 服务端管理器](/tutorials/java/mcdr)。

### MCDR 有官方插件目录

MCDR 官方维护着一个插件目录（`MCDReforged/PluginCatalogue`），备份类、查询类、权限类插件都齐全。仅备份一项，目录里就能找到 `prime_backup`、`quick_backup_multi`、`timed_quick_backup_multi`、`better_backup`、`auto_backup`、`permanent_backup`、`zip_backup`、`chunk_backup`、`region_backup`、`ftp_backup`、`baidu_netdisk_backup`、`extra_prime_backup`、`smart_backup`、`cushion_of_backup` 等条目，其中 `ftp_backup` 与 `baidu_netdisk_backup` 属于**异地备份**思路。

换句话说：你不必自己写管理脚本，装完 MCDR 就有一套现成的运维工具箱。

## 三、另外两类选择，以及它们的代价

### 生电优化端（插件端）

Paper 系一类的插件端能把 TPS 优化得很好，插件生态也成熟，但它们的很多默认配置**就是被优化过的**，与原版行为不一致：实体碰撞、红石实现、区块卸载延迟这些项一旦被改，机器就可能不工作或产出不稳定。

这类核心适合普通生存服、小游戏服、需要大量插件功能的服；**开生电服则要反过来，把影响原版行为的项一项项调回原版**。哪些项要调、怎么调，本站已有专门的两篇：

- [服务端选择](/tutorials/java/core) —— 通用选型与各核心的定位；
- [生电与红石](/tutorials/java/redstone) —— 插件端的原版特性调校清单，以及 MCHPRS 一类专用核心。

本篇不重复这两篇的内容。

### 多线程端

多线程端的思路是把区块或实体处理拆到多个线程上：

| mod | 官方一句话 | 生电视角的问题 |
| --- | --- | --- |
| `c2me-fabric` | A Fabric mod designed to improve the chunk performance of Minecraft. | 区块处理并行化，时序与原版不同 |
| `async` | Async — Minecraft Entity Multi-Threading Mod；improves entity performance by processing entities in parallel across multiple CPU cores and threads | 实体并行处理，机器依赖的更新顺序会变 |

红石与生电机器**大量依赖更新顺序与时序**。多线程加速的是吞吐量，代价是把"同一 tick 内谁先谁后"这件事变得不可预测——机器可能偶尔对、偶尔错，这比稳定地慢更难排查。

结论：只有明确知道自己要什么（例如只是想让跑图不卡，且接受机器行为的偏差）时才用多线程端。

## 四、生电服不推荐装反作弊

直说：**生电服不推荐装反作弊插件**。

原因是逻辑上的冲突：

- 生电玩家的正常玩法本身就会持续触发反作弊判定——高速移动、大量实体、机器与自动化产生的异常行为，都会被当成可疑；
- 反作弊通常要求装在**插件端或优化端**上，而这两类核心本身就会改原版行为，与生电目标直接冲突；
- 原版那套针对快速移动的检测与回拉，Carpet 自己就有开关：`antiCheatDisabled`，官方描述为 Prevents players from rubberbanding when moving too fast（防止玩家因移动过快被回拉）。

你真正需要的是**白名单与权限、操作记录与回溯、定期与异地备份**这类替代方案，而不是再加一层会误判的判定。完整论证见 [为什么不推荐反作弊](/tutorials/java/tech-anticheat)，日志与回滚手段见 [反作弊与防破坏](/tutorials/java/anticheat)。

## 五、PCA 协议

`PCA` 的准确身份是 `plusls-carpet-addition`（Plusls Carpet Addition），一个 Carpet 的扩展 mod。

### 它是什么

它的同步协议官方描述原文是：

> PCA 同步协议是一个用于在服务端和客户端之间同步 Entity，BlockEntity 的协议，目前被 MasaGadget 用于实现多人游戏容器预览。

拆开看三层含义：

1. 它是**服务端与客户端之间**的协议，两端都要有对应支持；
2. 它同步的对象是 **Entity 与 BlockEntity** 的数据；
3. 目前的主要用途是 **MasaGadget 用它实现多人游戏容器预览**——多人环境下看别人的箱子、漏斗、机器内部内容。

### 两个规则

| 规则 | 类型 | 默认值 | 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `pcaSyncProtocol` | `boolean` | `false` | `true` / `false` | 同步协议的开关，分类为 `PCA`、`protocal` |
| `pcaSyncPlayerEntity` | `enum` | `OPS` | `NOBODY` / `BOT` / `OPS` / `OPS_AND_SELF` / `EVERYONE` | 决定哪些玩家的数据将会被 PCA 同步协议同步 |

注意 `pcaSyncProtocol` **默认是关的**：协议是能力，不是默认行为，用之前要自己想清楚同步给谁看。

### 维护现状（这一段必须看清）

| 项目 | 状态 |
| --- | --- |
| `plusls/plusls-carpet-addition`（原始项目） | 2022 年停止更新 |
| `Nyan-Work/plusls-carpet-addition`（其中一个 fork） | 2024 年停止更新 |
| `pca-protocol` | 现可用。Modrinth，`fabric`，1.14.4–26.3，作者 fallen-breath。官方描述：A fork of plusls-carpet-addition, provides PCA protocol support to the server. That's everything it does |
| `pca-protocol-plugin` | 现可用。Modrinth，`bukkit` / `paper` / `purpur` / `spigot`，1.17–1.21.8。官方描述：Add PCA protocol support for the spigot and its optimized/branch server |

也就是说：原始项目与其 fork 都已停更，**现在能用的是只保留协议功能的两个精简 fork**——`pca-protocol` 给 Fabric 服务端，`pca-protocol-plugin` 给 Spigot 系服务端。

:::warn 精简 fork 与完整版冲突
官方明确说明：精简 fork 与完整的 `plusls-carpet-addition` **冲突**。也就是说，要么用完整版（含其他功能，但已停更），要么用精简版（只有协议，仍在维护），**不要同时装**。
:::

## 六、本篇的三条底线

```
1. 核心选 Fabric —— 生电工具链只在这里完整
2. 管理交给 MCDR —— 它在服务端进程之外，崩了还能救
3. 不加反作弊 —— 误判是必然的，用权限、日志与备份替代
```

## 下一步

核心定下来之后，下一步是把规则系统装上：见 [Carpet 及其附属包](/tutorials/java/tech-carpet)。机器开工之前先读风险控制，见 [世吞与切门](/tutorials/java/tech-machine)；为什么反作弊在生电服是负收益，见 [为什么不推荐反作弊](/tutorials/java/tech-anticheat)。通用选型与被跳过的细节见 [服务端选择](/tutorials/java/core) 与 [生电与红石](/tutorials/java/redstone)。

---

> 本篇的 mod 加载器、支持版本与插件目录名均取自 Modrinth 官方数据与 MCDR 官方插件目录；具体配置以各项目官方说明为准。
