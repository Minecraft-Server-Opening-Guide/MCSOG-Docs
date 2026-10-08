---
title: 服务端选择
slug: core
cat: java
level: 1
order: 4
minutes: 12
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, 核心, paper, purpur, folia, leaves, fabric, 生电, 多核]
updated: 2026-10-04
draft: false
---

环境准备好之后，下一个决定就是**用哪个服务端核心**。核心决定了三件事：**性能上限**、**能不能装插件或模组**、以及**红石等原版行为是否一致**。

选错了不会开不起来，但会白花钱（多核 CPU 跑单线程端）或者白折腾（生电用 Paper）。

## 一、先分清三类核心

| 类别 | 代表 | 能装插件 | 能装模组 | 说明 |
| --- | --- | --- | --- | --- |
| **原版** | Vanilla | 否 | 否 | 官方服务端，行为最标准，但没有任何优化 |
| **插件端** | Spigot → Paper → Purpur / Leaves / Leaf / Folia | 是 | 否 | Bukkit 系一条线，生态最大 |
| **模组端** | Fabric / Forge / NeoForge | 需桥接 | 是 | 加载模组，适合整合包 |

> 还有一类是**代理端**（Velocity / BungeeCord）：它自己不跑世界，只负责把玩家转发到多个子服，属于「多服互联」时才需要。

这三类里，生电服走的是**模组端（Fabric）**这条路。开生电服之前，这组教程值得先过一遍：

- [[生电篇]服务端选择](/tutorials/java/sd-server)：为什么是 Fabric 加 MCDR，以及各条路线的代价。
- [[生电篇]Carpet 及其附属包](/tutorials/java/sd-carpet)：规则系统、四个主流附属包与防崩规则。
- [[生电篇]共享原理图](/tutorials/java/sd-schematic)：用 Syncmatica 把投影与放置同步给所有人。
- [[生电篇]优化 mod](/tutorials/java/sd-optimize)：哪些能放心装、哪些会改变时序。
- [[生电篇]存档保护](/tutorials/java/sd-backup)：备份流程、Ledger 与异地备份。
- [[生电篇]配置优化](/tutorials/java/sd-config)：生电服到底有哪些开关可动。
- [[生电篇]世吞与切门](/tutorials/java/sd-machine)：世吞与更新抑制的风险控制。
- [[生电篇]为什么不推荐反作弊](/tutorials/java/sd-anticheat)：生电服为什么不该装反作弊。

## 二、按硬件选：这是最容易选错的一点

**Minecraft 的主线程是单线程的。** 实体、区块、红石、插件逻辑几乎都压在**一个核心**上——所以核心多不等于快，**单核频率才是关键**。

| 你的机器 | 推荐 | 原因 |
| --- | --- | --- |
| **单核性能强**（4~8 核，主频 3.5GHz+） | **Paper / Purpur / Leaf** | 这几个端把单线程能做的优化都做满了，单核越强收益越大 |
| **核心多但主频低**（16 核+，主频 <2.5GHz） | **Folia** | 单核是短板，跑 Paper 会浪费掉大部分核心；Folia 能把多核吃满 |
| 不确定、想省心 | **Paper** | 最稳、资料最多、插件兼容性最好 |

### 多核端 Folia 是什么

Folia 是 Paper 官方的一个分支，给服务端加入了**区域化多线程（regionised multithreading）**：把世界切成多个区域，各区域**并行**执行 tick，因此能真正利用多核。

代价同样明确：

- **插件兼容性差**：大量插件没有适配 Folia，装了可能直接报错或行为异常。
- **行为与 Paper 有差异**：跨区域的交互（红石、传送、实体跨区）规则不同。
- 适合**玩家分散、机器单核弱但核心多**的场景，不适合生电。

### 单核强就选 Paper 系

Paper 及其下游（Purpur、Leaf、Leaves）都是**单线程优化**路线：主线程优化到位，单核频率越高越流畅。

- **Paper**：基准选择，生态最大。
- **Purpur**：Paper + 大量可配置玩法开关，适合想微调的人。
- **Leaf**：Paper 分支，在**性能、原版机制与稳定性之间找平衡**（官方定位）。
- **Leaves**：Paper 分支，但方向相反——**专门修复被改坏的原版特性**，见下一节。

## 三、生电（技术向）怎么选

生电指红石机器、刷怪塔、TNT 复制、精确的方块与实体行为。它**要求原版行为一致**，所以：

- **Fabric** 是 —— 不装优化类 mod 时最接近原版，是生电服的主流选择。
- **Leaves** 是 —— Paper 分支，但专门**修复被 Paper 改坏的原版特性**（官方定位：*repairing broken vanilla properties*），因此能在保留 Paper 生态的同时还原原版行为。

:::warn 生电不要用 Paper / Purpur
Paper 系为了性能改动了部分原版行为（红石时序、TNT 复制、刷怪与实体规则等），**会让依赖这些机制的机器失效**。生电服请用 **Fabric** 或 **Leaves**。
:::

## 四、常用核心速查

| 核心 | 类型 | 一句话 | 适合 |
| --- | --- | --- | --- |
| **Vanilla** | 原版 | 官方服务端，无优化 | 纯净体验、验证原版行为 |
| **Spigot** | 插件端 | Paper 的上游，兼容老插件 | 优先兼容性的老服 |
| **Paper** | 插件端 | 生态最大、最稳的基准 | 大多数生存服、插件服 |
| **Purpur** | 插件端 | Paper + 海量玩法开关 | 想精细调玩法 |
| **Leaf** | 插件端 | 性能与原版机制平衡 | 想要 Paper 又想少改原版行为 |
| **Leaves** | 插件端 | 修复原版特性 | **生电 + 想用插件** |
| **Folia** | 多核端 | 区域化多线程，吃满多核 | **核心多、主频低**，能接受插件限制 |
| **Fabric** | 模组端 | 轻量、贴近原版 | **生电**、轻量模组整合 |
| **Forge** | 模组端 | 老牌，整合包最多 | 大型科技整合包 |
| **NeoForge** | 模组端 | Forge 社区分支，新版本主力 | 1.20.2+ 模组服 |
| **Velocity** | 代理端 | 只转发不跑世界 | 多子服互联、跨服 |

> 表中「性能」类描述为相对参考，实际表现取决于版本、插件/模组数量与硬件。

## 五、完整对照表

上面是速查，逐项对比（性能、插件、模组、上手难度、适用场景）见：

**→ [服务端核心对比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)**

## 六、下一步

选定核心后，到该核心的官方渠道下载对应版本的服务端 jar，放进「环境准备」里建好的 `survival` 目录，然后**写启动脚本把它跑起来**：

> **本站已收录这些核心的下载入口** —— 打开 **[资源下载 · 服务端核心](/downloads/core)**，里面按核心名列出了全部构建版本（Vanilla、Paper、Folia、Velocity、Purpur、Leaf、Leaves、Fabric、NeoForge、Forge、Spigot、BungeeCord 以及基岩版 BDS），点「下载」按钮并按提示登录即可。收录的是官方与社区来源的下载链接，**本站不存储任何文件**。

**→ [开启服务端](/tutorials/java/start)** —— 启动脚本、同意 EULA、判断启动成功、自动重启

- **Paper / Purpur / Leaf / Leaves / Folia**：官方下载页获取 jar
- **Fabric / Forge / NeoForge**：先装对应加载器的服务端安装器（新版 Forge / NeoForge 会**自动生成启动脚本**）
- **原版 Vanilla**：官方服务端 jar

启动前再确认一次：**Java 版本与目标 MC 版本匹配**、**25565 已放行**。

## 相关资源

本站收录了三类资源，都是官方与社区来源的**下载链接**（不存储任何文件），点「下载」按钮按提示登录即可：

- **[资源下载 · 服务端核心](/downloads/core)** —— 13 个核心（Vanilla、Paper、Folia、Velocity、Purpur、Leaf、Leaves、Fabric、NeoForge、Forge、Spigot、BungeeCord、基岩版 BDS）的全部构建版本。
- **[资源下载 · 模组](/downloads/mods)** —— Modrinth 模组条目，可按加载器（Fabric / Forge / NeoForge / Quilt）与游戏版本筛选；模组服路线见 [模组服完整上手](/tutorials/java/modded)。
- **[资源下载 · 插件](/downloads/plugins)** —— 服务端插件，支持 Java 版（Paper / Spigot / Folia / Purpur / Bukkit 筛选）与基岩版，另含 MCDR 插件；插件服路线见 [插件入门](/tutorials/java/plugins)。
