---
title: "[生电篇]优化 mod"
slug: tech-optimize
cat: java
level: 3
order: 32
minutes: 18
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生电, 优化, 模组, fabric, spark]
updated: 2026-10-08
draft: false
---

生电服要不要装优化 mod，是一个容易走极端的问题：有人一个不装，宁可卡；有人把能找到的全塞进 `mods`，结果机器开始莫名其妙地失效。两种做法都不对——**问题不在"装不装"，而在"这一类的代价是什么"**。

这一篇把 10 个常见的优化类 mod 分成三类：可以放心装、要看版本、会改时序要谨慎。判断标准只有一条：**它是否可能改变机器的行为**。

和调配置那类优化的关系，见 [性能优化](/tutorials/java/optimize)：那篇讲的是配置与优先级的通盘思路，本篇只讲 mod 这一层。

## 一、全部 10 个 mod 一览

下面的 loaders、支持版本与下载量来自 Modrinth 官方条目，官方一句话为项目页描述原文或其直译。

| mod | loaders | 支持版本 | 下载量（约） | 官方一句话 |
| --- | --- | --- | --- | --- |
| `lithium` | fabric、neoforge、quilt | 1.16.2–26.3 | 1.337 亿 | 通用服务端/客户端性能优化 |
| `ferrite-core` | fabric、forge、neoforge、quilt | 1.16.5–26.3 | 1.574 亿 | Memory usage optimizations |
| `krypton` | fabric | 1.16.2–26.3 | 4304 万 | A mod to optimize the Minecraft networking stack |
| `c2me-fabric` | fabric | 1.17.1–26.4-snapshot-3 | 3918 万 | A Fabric mod designed to improve the chunk performance of Minecraft. |
| `modernfix` | fabric、forge、neoforge | 1.16.4–26.1.2 | 8023 万 | All-in-one mod that improves performance, reduces memory usage, and fixes many bugs |
| `memoryleakfix` | fabric、forge、quilt | 1.14.4–1.20.4 | 3802 万 | 修内存泄漏 |
| `starlight` | fabric | 1.17–1.20.4 | 1606 万 | 重写光照引擎（Fabric 版） |
| `async` | fabric、neoforge、quilt | （官方条目未给出固定区间） | 71.7 万 | improves entity performance by processing entities in parallel across multiple CPU cores and threads |
| `spark` | fabric、forge、neoforge、quilt | 1.16.5–26.3 | 2317 万 | 性能分析工具（profiler） |
| `chunky` | bukkit、fabric、folia、forge | 1.13.2–26.3 | 1888 万 | 区块预生成 |

读这张表时有两点要注意：

- **下载量高不等于"必须装"**。它只说明用的人多，不代表它适合你的硬件与你的机器（装置）。
- **`async` 的版本区间在官方条目上没有固定的写法**，所以上表没有给它编一个范围。以项目页当前列出的游戏版本为准。

## 二、可以放心装：内存、启动、分析与预生成

这一类是"行为无关"的：它们优化的地方不是游戏的逻辑与顺序，而是内存占用、启动过程、观测手段与区块生成。对生电服来说，这一类的代价最低。

| mod | 官方一句话 | 可以放心装的理由 |
| --- | --- | --- |
| `ferrite-core` | Memory usage optimizations | 动的是内存占用这一层，不介入 tick 逻辑 |
| `modernfix` | All-in-one mod that improves performance, reduces memory usage, and fixes many bugs | 覆盖面是性能、内存与 bug 修复，不是单一机制的改写 |
| `spark` | 性能分析工具（profiler） | 它只负责观测，不修改游戏行为 |
| `chunky` | 区块预生成 | 提前把区块生成完，避免玩家跑图时边跑边生成 |

几点补充：

- **`spark` 不是优化 mod**，它是分析工具。"先测再改"的意思就是：装 `spark` 是为了**看清瓶颈在哪**，而不是指望它让服务器变快。它的读图方法见 [用 spark 分析服务器性能](/tutorials/ops/spark)。
- **`chunky` 解决的是生成期的卡顿**，与 [性能优化](/tutorials/java/optimize) 里"世界预生成"一节讲的是同一件事，只是以 mod 的形式提供。长期开放的服几乎是必备。
- **这一类之间不冲突**：内存、启动、分析、预生成各管一段，可以一起用。真正需要小心的是"功能重叠"的两个 mod，例如两个都在重写光照引擎的实现。

## 三、要看版本：两个官方结论

这两个 mod 不是"不好"，而是它们的适用范围有明确边界，官方自己就把边界写清楚了。照抄结论即可：

### `memoryleakfix`：1.20.5+ 已过时

官方 README 的结论是：**Minecraft 1.20.5+ 之后，该 mod 之前修复的所有内存泄漏都已被官方修复**，因此它在新版本上已经过时。

对应的数据也能看出来：它的支持版本是 1.14.4–1.20.4，而新版游戏已经不在这个区间里。**在新版本上继续装它没有意义**；只有在 1.20.4 及更早的版本上，它修的那些泄漏才还有官方未修复的余地。

### `starlight`：只到 1.20.4，且官方给出了取舍

官方 README 里有四条要点，一条比一条具体：

| 官方结论 | 对生电服的含义 |
| --- | --- |
| 支持到 1.20.4 为止（1.17–1.20.4） | 新版本上根本没有可装的文件 |
| 1.20 上 Starlight 与原版差距已经很小（原文：Starlight and Vanilla are close enough on 1.20） | 升级到 1.20 之后，装它的收益已经不大了 |
| 与 Phosphor 完全不兼容 | 两者不能同时存在 |
| 它是**侵入式**的光照引擎重写，更容易与其他 mod 冲突 | 生电服的 mod 组合通常不少，冲突风险要算进成本 |
| 1.20 之后的后续进展指向 Moonrise | 它的历史使命已经交接出去 |

所以 `starlight` 的正确用法是：**明确知道自己停在 1.20.4 或更早、且没有装 Phosphor 时，才考虑它**。新版本的机器服不必再纠结这一个。

## 四、会改时序，要谨慎：四个模组

这一类是生电服真正要停下来想一想的。它们的共同点是**改变了事件发生的顺序或时机**，而机器的正确性往往正建立在那个顺序上。

| mod | 官方一句话 | 风险在哪 |
| --- | --- | --- |
| `lithium` | 通用服务端/客户端性能优化 | 覆盖范围广，会动到刷怪、AI、方块行为等逻辑路径；"通用优化"不等于"对你无害" |
| `krypton` | A mod to optimize the Minecraft networking stack | 改的是网络栈。官方 README 明确声明：**作者不对其稳定性、与其他 mod 的兼容性作任何保证** |
| `c2me-fabric` | A Fabric mod designed to improve the chunk performance of Minecraft. | 区块处理多线程化，时序与单线程不再一样 |
| `async` | improves entity performance by processing entities in parallel across multiple CPU cores and threads | 实体处理并行化（跨多个 CPU 核心与线程），实体的处理顺序随之改变 |

逐条说明：

- **`lithium`** 是这一类里最常被推荐的，也是最容易让人放松警惕的：它被描述为通用优化，但"尽量不改变行为"与"绝对不改变行为"是两回事。**装之前先在机器上实测**——尤其是那些对刷怪、AI、方块更新敏感的装置。
- **`krypton`** 的立场最明确：官方 README 直接写明不对稳定性与兼容性作任何保证。这不是"不能用"，而是"出问题时不要指望作者兜底"。用在公开服上要权衡。
- **`c2me-fabric`** 的官方描述指向区块性能，也就是把区块处理并行化。多线程会改变区块的加载、生成与卸载时机，而**常加载区、机器跨区块的部分正是最容易因此出问题的地方**。
- **`async`** 的官方描述原文是 improves entity performance by processing entities in parallel across multiple CPU cores and threads，即把实体处理并行到多个 CPU 核心与线程上。实体并行意味着 tick 顺序不再逐一开始，依赖实体顺序或碰撞时序的机器是最脆的一类。

一句话总结这一节：**这四类 mod 的收益是真的，机器失效的风险也是真的，所以只能"先测机器"。**

## 五、生电服装优化 mod 的三条原则

把上面的内容收束成三条可执行的原则：

```
1. 行为无关的优先     —— 内存、启动、分析、预生成先装
2. 改时序的先测机器   —— 一次只加一个，加完就在机器上验证
3. 用 spark 做对比    —— 加之前测一次，加之后测一次，看数据而不是看感觉
```

展开一点：

1. **行为无关的优先**。先把第二节那一组装上，它们几乎不会影响机器行为，收益也最直接。很多服的问题到这一步就缓解了大半。
2. **改时序的先测机器**。第四节的四个 mod 不要一次性全上，**一次只加一个**，加完立刻在有代表性的机器上跑一遍——刷怪塔还出货吗、机器还按预期工作吗。出问题就回退这一个，而不是全部推倒。
3. **一次只加一个并用 `spark` 对比**。`spark` 是分析工具，它的价值在于让你知道"加了之后到底有没有变快"。**没有数据支撑的优化 mod 都是心理安慰**。

另外两条运维习惯，和 mod 本身无关但同样重要：

- 装 mod 或换 mod 之前**先备份世界**，相关流程见 [备份与恢复](/tutorials/java/backup)。
- 出问题时**先移除最近新加的那个 mod**，这是最快的定位手段。

## 六、和别处怎么衔接

- **配置层面的优化**（视距、模拟距离、JVM、预生成思路）：[性能优化](/tutorials/java/optimize)
- **分析工具的用法**：[用 spark 分析服务器性能](/tutorials/ops/spark)
- **模组服的加载器与排错**：[模组服完整上手](/tutorials/java/modded)
- **为什么生电服优先选 Fabric**，以及多线程端的取舍：[服务端选择](/tutorials/java/tech-server)
- **原版行为为什么这么重要**：[生电与红石](/tutorials/java/redstone)、[生电与红石进阶](/tutorials/java/redstone-advanced)

## 下一步

- 用 `spark` 把优化变成数据：[用 spark 分析服务器性能](/tutorials/ops/spark)
- 回到配置与服务端的整体思路：[性能优化](/tutorials/java/optimize)
- 服务端本身的选型：[服务端选择](/tutorials/java/tech-server)、[Carpet 及其附属包](/tutorials/java/tech-carpet)

---

> 本篇的 mod 列表、loaders、支持版本与下载量均来自 Modrinth 官方条目；`memoryleakfix`、`starlight`、`krypton` 的结论引用各自官方 README。装之前请再核对一次项目页，版本与描述会随项目更新而变化。
