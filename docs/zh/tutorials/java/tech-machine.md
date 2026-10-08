---
title: "[生电篇]世吞与切门"
slug: tech-machine
cat: java
level: 3
order: 35
minutes: 22
mc: ["1.21.x", "1.20.4", "1.19.4", "1.16.5"]
tags: [java, 生电, 世吞, 更新抑制, 切门, carpet, tnt]
updated: 2026-10-08
draft: false
---

世吞（world eater）是 TNT 阵列加飞行器的机器，用来成片清空一块区域；"切门"则是社区对更新抑制（update suppression）这一类操作的俗称。这两样东西是生电服上最容易把服务端直接搞挂的玩法。

**本篇只讲风险控制，不讲怎么造。**造法不在已核实范围内，网上流传的图纸与步骤也不保证在你的版本上成立，这里不写、也不复述。

先把边界说清楚：与世吞直接相关的官方 Carpet 规则只有三条，其中两条会改变原版行为，正式开服不要开。真正需要你提前配好的是防崩规则，而且要**先进规则、后动机器**。

## 一、世吞是什么，风险在哪

世吞的做法是用 TNT 阵列持续爆破，再靠飞行器把整个结构平移过去，一路把地形清空。它的产出是"一片被挖空的区域"，它的成本则是服务器最贵的几样东西：海量 TNT 实体、成片的爆炸计算、被摧毁方块带来的巨量方块更新，以及始终在运行的飞行器。

| 风险 | 来源 |
| --- | --- |
| TPS 被拖垮 | 同一时刻存在大量 TNT 实体与爆炸计算 |
| 存档与带宽压力 | 一次运行就改掉大片区域，方块更新量巨大 |
| 无人值守下失控 | 机器靠飞行器自行推进，出问题时不一定有人在场 |
| 操作本身越界 | 更新抑制（"切门"）会把邻居更新栈填满，进而可能让服务端崩溃 |

换一个角度看，同一台机器对玩家和服主的含义是相反的：

| 角色 | 世吞意味着什么 |
| --- | --- |
| 玩家 | 一条高效获取大片空区的产线，产出归自己 |
| 服主 | 一片区域的全量方块改动 + 一段持续的高负载 + 一份崩溃风险 |

所以世吞不是"能不能造出来"的问题，而是"出事之后你能不能收场"的问题。

## 二、与世吞直接相关的官方规则

Carpet 用 `/carpet <规则名> <值>` 开关原版细节行为。与世吞直接相关的只有下面三条，官方描述照抄如下：

| 规则 | 官方描述 | 对原版行为的影响 |
| --- | --- | --- |
| `optimizedTNT` | TNT causes less lag when exploding in the same spot and in liquids | 不改变爆炸效果本身，只是让同位置与液体中的爆炸更省资源 |
| `tntDoNotUpdate` | TNT doesn't update when placed against a power source | **改变原版行为**：TNT 靠着电源放置时不再被更新 |
| `explosionNoBlockDamage` | Explosions won't destroy blocks | **改变原版行为**：爆炸不再破坏方块 |

使用口径：

- `optimizedTNT` 描述的是**同位置、液体中**爆炸的卡顿更小，对世吞这种"同一片区域反复爆"的场景有意义；它优化的是开销，不是效果。
- `tntDoNotUpdate` 与 `explosionNoBlockDamage` **会改变原版行为**，只在测试或特定场景使用。正式开服不要开——`tntDoNotUpdate` 会让"靠着电源放 TNT"这套玩法失效，`explosionNoBlockDamage` 则直接取消爆炸的破坏力，机器清空区域的能力就没了。

:::warn 两条改变原版行为的规则只属于测试环境
`tntDoNotUpdate` 与 `explosionNoBlockDamage` 适合在测试服里验证结构、做无害演示，**不适合正式开服**。开着它们测出来的机器行为，和真正上线后的行为是两回事。
:::

## 三、"切门"的准确定义

**"切门"是社区对"更新抑制（update suppression）"这一类操作的俗称。**它指的不是某个方块、某个机器，而是一整类利用更新抑制现象的技巧。

官方 Carpet 给了它一个可控入口，规则名是 `updateSuppressionBlock`，官方描述的含义是：**在屏障方块上放激活铁轨，铁轨转向时会填满邻居更新栈。**

这里有两个必须记住的点：

1. 它是**官方提供的可控入口**，也就是说这件事本身不需要额外的 mod 才能在服务端侧被开关。
2. 它的后果写在"填满邻居更新栈"这句里——邻居更新栈被填满，正是崩溃风险的来源。

## 四、为什么必须先开防崩

更新抑制的机制是**把邻居更新栈填满**。填满之后发生的事情不受你的机器控制：**它进而可能让服务端崩溃**。

这就是顺序问题的答案。很多人是"先动机器，崩了再找规则"，但崩溃不是每次都能温柔收场——服务端挂掉的那一刻，正在写入的区块和正在运行的机器状态都不一定完整。所以正确顺序是：

```
1. 先进防崩规则（本节）
2. 再进机器、再让玩家开工
```

已经核实到的防崩规则如下，按来源分两组。规则名与可选值在 [Carpet 及其附属包](/tutorials/java/tech-carpet) 里已作为清单列过一遍，**这里要补的是使用顺序**：

| 来源 | 规则 | 可选值 |
| --- | --- | --- |
| Carpet AMS Addition | `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| Carpet AMS Addition | `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |
| Carpet TIS Addition | `yeetUpdateSuppressionCrash` | 见对应版本的 mod 说明 |
| Carpet TIS Addition | `updateSuppressionSimulator` | 见对应版本的 mod 说明 |

几点说明：

- `amsUpdateSuppressionCrashFix` 是一个**三态开关**：`false` 与 `true` 是常见的关与开，`silence` 是第三档处理方式。三档各自的确切语义以 mod 官方说明为准，这里不替它下定义。
- `customBlockUpdateSuppressor` 的作用是**把指定方块变成更新抑制方块**，可选值就是上表那几个方块。
- Carpet TIS Addition 的 `yeetUpdateSuppressionCrash` 与 `updateSuppressionSimulator` 覆盖的是**另外两个方向**：一个对应崩溃处理，一个对应模拟。两者的具体行为与可用值以对应版本的 mod 说明为准。

:::tip 先确认规则真的生效，再动机器
防崩规则不是"装上就永远安全"，它是一层兜底。做法是：**配置完先自己触发一次更新抑制看表现**，确认规则确实按预期拦住了，再让玩家开始动机器。
:::

## 五、版本差异：新版本要靠社区 mod 恢复

这是一个必须照写的事实：**官方版本已修复更新抑制**。也就是说，在新版本上要做同类操作，需要社区提供的恢复或辅助 mod，而它们各自覆盖的版本区间不同：

| mod | loaders | 覆盖版本区间 |
| --- | --- | --- |
| `update-depression` | fabric、quilt | 1.19.4–1.21.1 |
| `better-update-suppression` | fabric | 1.21.10–26.2 |
| `suppressed` | fabric | 26.1.1–26.2 |
| `lithonate` | fabric | 仅 1.16.5 |

读这张表的正确方式：

- 这不是一张"随便挑一个"的清单，而是**四个各不相同、且互不重叠的版本区间**。你要先定游戏版本，再看那个版本落在谁的区间里。
- `suppressed` 与 `better-update-suppression` 的区间都在 26.x 一带，`update-depression` 覆盖的是较老的 1.19.4 到 1.21.1，`lithonate` 只覆盖 1.16.5。
- **一旦换版本，这套选择就要重做。**机器能不能跑、要装哪个 mod，都以版本为前提，不要指望"升级后照旧能用"。

## 六、三件套：备份、权限、防崩规则

机器越猛，这三件事越不能省。它们分别对应本站的三篇：

| 事项 | 作用 | 详见 |
| --- | --- | --- |
| **备份** | 崩服、误操作、机器失控之后能回到上一个可用状态 | [存档保护](/tutorials/java/tech-backup) |
| **权限** | 决定谁能动机器、谁能用更新抑制这类高风险操作 | [领地与保护](/tutorials/java/protection) |
| **防崩规则** | 把更新抑制这类操作从"可能搞挂服务端"压回可控范围 | 本篇第四节 |

补充一条与机器行为直接相关的阅读：机器为什么坏、为什么慢，取决于 tick 模型与同一刻内的更新顺序，见 [生电与红石进阶](/tutorials/java/redstone-advanced)。

## 七、本篇的底线

```
1. 官方规则只认三条：`optimizedTNT` 可留，另外两条改动原版，正式服不开
2. 切门 = 更新抑制的社区俗称，官方可控入口是 `updateSuppressionBlock`
3. 先进防崩规则，再动机器 —— 顺序反了就等于拿存档赌
4. 新版本上做同类操作，先按版本选恢复/辅助 mod
```

## 下一步

机器一动土，最先要保证的是出事了能回来：见 [存档保护](/tutorials/java/tech-backup)。谁能动机器由权限决定，见 [领地与保护](/tutorials/java/protection)；机器为什么坏、为什么慢，见 [生电与红石进阶](/tutorials/java/redstone-advanced)，反作弊在生电服为什么是负收益见 [为什么不推荐反作弊](/tutorials/java/tech-anticheat)。

---

> 本篇引用的规则名、官方描述、mod 名称与版本区间，均以 Carpet 及 Carpet AMS Addition、Carpet TIS Addition 的官方源码与说明，以及相关项目在 Modrinth 的官方条目为准；具体造法与机器设计不在本篇范围内。
