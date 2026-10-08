---
title: "[生电篇]配置优化"
slug: sd-config
cat: java
level: 3
order: 34
minutes: 16
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生电, carpet, 配置, 优化, 规则]
updated: 2026-10-08
draft: false
---

生电服的"优化"和普通服的优化不是一回事：普通服可以靠调低视距、换核心、加优化插件把 TPS 拉上来，而生电服每动一个开关，都要先问一句"这会不会改变原版行为"。这篇回答的是**生电服到底有哪些开关可以动、动了之后谁负责复验**。

通用的性能优化（优先级、视距与模拟距离、JVM 参数）见 [性能优化](/tutorials/java/optimize)，优化 mod 的选型见 [优化 mod](/tutorials/java/sd-optimize)，Carpet 规则与附属包的完整清单见 [Carpet 及其附属包](/tutorials/java/sd-carpet)。本篇只讲配置层面的取舍，并且**不给任何具体配置字段名与默认值**——那些东西随版本变化，必须以各自官方文档为准。

## 一、生电服的三层开关

| 层面 | 典型例子 | 改了会怎样 |
| --- | --- | --- |
| Carpet 规则 | `optimizedTNT`、`lagFreeSpawning`、`movableBlockEntities` | 有的只是省性能，有的**直接改变原版行为** |
| 优化 mod 的配置 | `ferrite-core`、`modernfix`、`c2me-fabric`、`async` | 各管一块；改错会引入卡顿、bug，或者改变时序 |
| 服务端自身配置 | 视距、模拟距离一类 | 属于通用优化，见 [性能优化](/tutorials/java/optimize) |

三层里最容易踩坑的是第一层：**Carpet 的规则名字听起来都像"优化"，但性质完全不同**。所以下面先把它拆开。

## 二、Carpet 规则：先分清"纯优化"与"改行为"

Carpet 是 Fabric 服务端 mod，提供规则系统，用 `/carpet <规则名> <值>` 开关原版细节行为。它的规则数量不小，生电服真正要关心的通常是下面这些：

| 规则 | 官方描述（原文） | 性质 |
| --- | --- | --- |
| `optimizedTNT` | TNT causes less lag when exploding in the same spot and in liquids | 纯优化 |
| `lagFreeSpawning` | Spawning requires much less CPU and Memory | 纯优化 |
| `fastRedstoneDust` | Lag optimizations for redstone dust | 纯优化，但牵涉红石，改完要复验机器 |
| `maxEntityCollisions` | Customizable maximal entity collision limits, 0 for no limits | 上限类调参，会改变实体挤在一起时的表现 |
| `movableBlockEntities` | Pistons can push block entities, like hoppers, chests etc. | **改变原版行为**：给了原本没有的能力 |
| `commandTick` | Enables `/tick` command to control game clocks | 调试入口，不是优化项 |
| `tntDoNotUpdate` | TNT doesn't update when placed against a power source | **改变原版行为**，只在测试用 |
| `explosionNoBlockDamage` | Explosions won't destroy blocks | **改变原版行为**，只在测试用 |

按性质分档处理：

| 档位 | 规则 | 怎么用 |
| --- | --- | --- |
| 可以常开 | `optimizedTNT`、`lagFreeSpawning` | 先在测试服开，观察机器与刷怪是否照常，再上主服 |
| 改了要复验 | `fastRedstoneDust`、`maxEntityCollisions` | 记进变更记录，通知技术组，机器自己复验 |
| 改变原版行为，按需开 | `movableBlockEntities` | 它给了原版没有的能力，开启前要确认没有机器依赖"活塞推不动方块实体"这一点 |
| 只在测试服开 | `tntDoNotUpdate`、`explosionNoBlockDamage` | **正式开服不要开**；它们的用途是测试与实验 |
| 工具类 | `commandTick` | 它是调试入口，别当成优化项常开 |

:::warn 改了规则就要公告
玩家无法分辨"机器坏了"是自己的问题还是规则被改了。**每次改动都要留记录并公告**：改了什么、什么时候改的、影响哪一类机器。这条纪律比具体开哪条规则更重要。
:::

## 三、优化 mod 的配置：各管一块，一次只改一项

优化 mod 的配置项大多是**给不同子系统准备的**，所以要先知道每个 mod 负责哪一块，再决定动谁：

| mod | 负责的方向 | 官方一句话 |
| --- | --- | --- |
| `ferrite-core` | 内存占用 | Memory usage optimizations |
| `modernfix` | 多合一：性能、内存、同时修 bug | All-in-one mod that improves performance, reduces memory usage, and fixes many bugs |
| `c2me-fabric` | 区块性能 | A Fabric mod designed to improve the chunk performance of Minecraft. |
| `async` | 实体多线程 | Async — Minecraft Entity Multi-Threading Mod；improves entity performance by processing entities in parallel across multiple CPU cores and threads |
| `spark` | 测量工具（profiler），不是优化 mod | 性能分析工具 |

**本篇刻意不写任何具体配置字段名与默认值**：这些 mod 的选项在版本之间会变，抄来的字段名可能已经不存在，照抄默认值更可能直接把行为改掉。要调就在各 mod 自己的官方说明里查。

改配置的纪律只有四条，但每一条都不能省：

1. **改之前先备份配置文件**（原则与做法见 [备份与恢复](/tutorials/java/backup)）——配置改坏了，你至少还能回到上一份。
2. **一次只改一项**，改完观察一段时间。一次改五项，出事时你无法判断是哪一项造成的。
3. **用 `spark` 对比改前改后**，用数据说话，而不是凭"感觉流畅了"。
4. **先在测试服或测试世界验证**，尤其是 `c2me-fabric`、`async` 这类涉及区块与多线程的项。

:::tip 多线程会改变时序
`c2me-fabric` 与 `async` 加速的是区块与实体处理，多线程天然会改变执行顺序与时序，而机器恰恰对时序敏感。只有在明确知道自己要什么、并且愿意承担复验成本时才动它们。
:::

## 四、版本差异：配置清单要跟着版本变

没有一份"万能优化配置"能跨版本通用。两个必须记住的例子：

| mod | 变化 | 结论 |
| --- | --- | --- |
| `memoryleakfix` | 官方 README 说明：Minecraft `1.20.5+` 之后，它之前修复的所有内存泄漏官方都已修复，该 mod 在新版本上**已过时** | 新版本上不要再为了"优化"装它 |
| `starlight` | 支持版本只到 `1.20.4`（Fabric）；官方 README 说明 `1.20` 上它与原版差距已经很小，且它是**侵入式**的光照引擎重写，更容易与其他 mod 冲突 | 它不该继续出现在新版本的配置清单里 |

所以每次升级游戏版本、升级 mod 或换核心之后，都要重新对照一遍：**这份清单里的每一项，在当前版本上是否还存在、是否还有意义**。已经过时的项留在配置里，通常不会报错，只会安静地占着位置并增加兼容风险。

## 五、改动优先级清单

按顺序做，性价比最高；顺序反了，容易把机器改坏还找不到原因。

```text
1. 先测基线：用 spark 采样，记下正常时的 TPS / MSPT
2. 再动"纯优化"项：optimizedTNT、lagFreeSpawning，以及内存类优化 mod 的配置
3. 接着动上限与范围类调参：maxEntityCollisions 一类，改完让机器复验
4. 最后才考虑改时序的项：c2me-fabric、async 这类区块与多线程相关的配置
5. 改变原版行为的规则（tntDoNotUpdate、explosionNoBlockDamage）只在测试服用
```

配套的做法是"**改前备份、一次一项、留下记录、公告玩家**"。生电服的配置管理，本质上是**版本管理**：你改的不是一个数字，而是所有机器的运行前提。

## 六、四个常见误区

| 常见做法 | 问题 |
| --- | --- |
| 一次把看到的优化项全开 | 出问题无法定位是哪一项造成的，只能全部关掉重来 |
| 抄一份别人的优化配置直接用 | 版本、mod 组合与机器都不同，别人能开不代表你能开 |
| 拿"感觉变快了"当结论 | 没有基线就没有对比，先用 `spark` 采样再下判断 |
| 改了规则不记录、不公告 | 机器坏了没人知道原因，技术组只能把它当成 bug 排查 |

判断一个改动值不值得保留，标准只有一个：**有数据表明它更好**，而不是"别人都这么开"。

## 下一步

规则层面的完整清单与附属包（包括防崩与更新抑制相关规则）见 [Carpet 及其附属包](/tutorials/java/sd-carpet)；优化 mod 的选型与"过时结论"见 [优化 mod](/tutorials/java/sd-optimize)；从硬件、视距到 JVM 的通用优化顺序见 [性能优化](/tutorials/java/optimize)。

---

> 本篇的规则名、规则官方描述与 mod 支持版本均取自 Carpet 官方源码、Modrinth 官方数据与各 mod 官方 README；具体配置项以各 mod 当前版本的官方说明为准。
