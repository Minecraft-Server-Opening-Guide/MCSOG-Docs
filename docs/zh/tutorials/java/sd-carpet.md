---
title: "[生电篇]Carpet 及其附属包"
slug: sd-carpet
cat: java
level: 3
order: 30
minutes: 25
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生电, carpet, fabric, 服务端]
updated: 2026-10-08
draft: false
---

生电服每天真正要打交道的是 **Carpet**：它把原版里一堆写死的细节行为变成了**可以用指令开关的规则**。本篇讲清规则系统怎么用、四个主流附属包各补什么，以及几条**已核实的防崩规则**。

## 一、Carpet 是什么

`Carpet` 的定位是 **Fabric 服务端 mod**，提供一套**规则系统**：用 `/carpet <规则名> <值>` 开关原版里那些本来写死的行为。

几个基本事实：

- 支持版本从 `1.14.4` 到 `26.3`，共 179 个版本条目，下载量约 1125 万；
- 官方源码 `CarpetSettings.java` 中共有 **91 条带 `@Rule` 注解的规则**。

也就是说，它能动的东西非常多，**"能开"不等于"该开"**：生电服的基本纪律是只开你理解后果的规则。

## 二、`/carpet` 的用法

规则系统的交互非常直接：

```
/carpet <规则名> <值>        # 修改一条规则
```

实践上建议遵守三条：

1. **一次只改一条**，改完观察机器行为再动下一条；
2. **把改过的规则记下来**（写进服规或运维笔记），换核心、升版本时逐条复核；
3. 凡是**会改变原版行为**的规则，正式开服时默认关掉，只在单人测试或特定场景开启。

下面这些规则名取自 Carpet 官方源码，逐条给出中文说明。

## 三、规则示例

### 性能与实体类

| 规则 | 中文说明 |
| --- | --- |
| `optimizedTNT` | 同一位置、液体中的 TNT 爆炸造成更少卡顿 |
| `maxEntityCollisions` | 自定义实体碰撞上限，0 表示不限制 |
| `lagFreeSpawning` | 刷怪只占用少得多的 CPU 与内存 |
| `fastRedstoneDust` | 针对红石粉的卡顿优化 |
| `movableBlockEntities` | 活塞可以推动方块实体，例如漏斗、箱子等 |

### 行为改变类（正式开服默认不要开）

| 规则 | 中文说明 |
| --- | --- |
| `tntDoNotUpdate` | TNT 靠着电源放置时不会被更新 |
| `explosionNoBlockDamage` | 爆炸不破坏方块 |
| `antiCheatDisabled` | 防止玩家因移动过快被回拉 |
| `updateSuppressionBlock` | 在屏障方块上放激活铁轨，铁轨转向时会填满邻居更新栈 |
| `stackableShulkerBoxes` | 空潜影盒丢在地上时可以堆叠 |

`updateSuppressionBlock` 是更新抑制（社区俗称"切门"）的官方可控入口，与它配合的防崩规则见第六节。

### 计数与调试类

| 规则 | 中文说明 |
| --- | --- |
| `hopperCounters` | 指向羊毛的漏斗会统计通过的物品数量 |
| `commandTick` | 启用 `/tick` 指令来控制游戏时钟 |

### 另有名称、未附描述

以下规则确实存在，但这里只列名字；具体行为请以你所用版本的源码或游戏内 `/carpet` 输出为准：

`creativeNoClip`、`renewableSponges`、`persistentParrots`、`flippinCactus`、`xpNoCooldown`、`smoothClientAnimations`、`tntPrimerMomentumRemoved`、`commandPlayer`。

## 四、四个主流附属包

Carpet 本体只做主规则集，功能扩展靠附属包。以下仓库地址、支持版本与版本条目数均为 Modrinth 官方数据。

| 名称 | 仓库 | 支持版本 | 版本条目数 | 定位 |
| --- | --- | --- | --- | --- |
| Carpet Extra | `gnembon/carpet-extra` | 1.14.4–26.2 | 87 | 新发射器行为、新的获取方式等 |
| Carpet TIS Addition | `TISUnion/Carpet-TIS-Addition` | 1.14.4–26.3 | 141 | Fabric Carpet 扩展包 |
| Carpet AMS Addition | `Minecraft-AMS/Carpet-AMS-Addition` | 1.16.4–26.3 | 49 | 官网 `https://carpet.mcams.club` |
| Carpet Org Addition | `fcsailboat/Carpet-Org-Addition` | 1.19.4–26.3 | 34 | Carpet 扩展包 |

选包建议：

- **Carpet Extra** 与 **TIS Addition** 覆盖最老的版本区间，老版本整合包常见；
- **AMS Addition** 与 **Org Addition** 从较新的版本起步（1.16.4 与 1.19.4），但它们都跟到了 26.3；
- 只要**你实际要用的规则**在哪个包里，就装哪个，不必全装。

:::warn 附属包要跟 Carpet 的主版本匹配才生效
这是常识性提醒：附属包依赖 Carpet 本体的接口，**游戏版本不同、Carpet 主版本不同，附属包可能整个不加载或部分规则失效**。装之前先确认该附属包的版本区间覆盖你的服务端版本，装完在游戏里用 `/carpet` 看一眼规则是否真的出现了；升级 Carpet 时也要同步升级附属包。具体以各附属包自己发布的版本说明为准。
:::

## 五、已核实的防崩规则

世吞与更新抑制这类玩法会主动制造**极端的方块更新与栈溢出**，服务端的直接后果就是崩溃。以下规则是本次核实到的、专门用来兜住这类风险的。

### Carpet TIS Addition

| 规则 | 作用方向 |
| --- | --- |
| `yeetUpdateSuppressionCrash` | 处理更新抑制引发的崩溃 |
| `updateSuppressionSimulator` | 更新抑制模拟 |
| `deobfuscateCrashReportStackTrace` | 反混淆崩溃报告的调用栈，让崩溃日志可读 |

### Carpet AMS Addition

| 规则 | 可选值 |
| --- | --- |
| `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |

`customBlockUpdateSuppressor` 的作用是把指定方块变成**更新抑制方块**——换句话说，你可以自己选哪种方块承担那个"填满邻居更新栈"的角色，而不是只能用本体的 `updateSuppressionBlock`。

另外：Carpet Org Addition **未核实到抑制或崩溃相关规则**，这里就不写它的规则名。

## 六、和世吞与切门怎么配合

- **"切门"是社区对"更新抑制（update suppression）"这一类操作的俗称**，不是游戏里的正式名词；
- 官方 Carpet 提供的可控入口就是 `updateSuppressionBlock`；AMS 的 `customBlockUpdateSuppressor` 则让你换用别的方块；
- 崩溃风险由 TIS 的 `yeetUpdateSuppressionCrash`、`updateSuppressionSimulator`、`deobfuscateCrashReportStackTrace` 与 AMS 的 `amsUpdateSuppressionCrashFix` 来兜；
- 这三层是"**入口可控 + 参数可换 + 崩溃可兜**"的关系，缺一层都会让排障变难。

具体到机器怎么开、风险怎么控，见第 7 篇 [世吞与切门](/tutorials/java/sd-machine)。那里的结论是：机器越猛，越要"备份 + 权限 + 防崩规则"三件套，而**防崩规则就是本节这几条**。

## 七、本篇的三条底线

```
1. 规则只开你懂后果的 —— 每改一条都记下来
2. 附属包跟主版本匹配 —— 装完用 /carpet 确认规则真的在
3. 防崩规则先开 —— 世吞与更新抑制之前，先把崩溃兜住
```

## 下一步

规则开完之后，机器一动土就要先读风险控制：见 [世吞与切门](/tutorials/java/sd-machine)。想让大家都用上同一份投影，见 [共享原理图](/tutorials/java/sd-schematic)；回头算性能账见 [优化 mod](/tutorials/java/sd-optimize)，核心为什么必须是 Fabric 见 [服务端选择](/tutorials/java/sd-server)。

---

> 本篇的规则名取自 Carpet 官方源码，附属包的仓库地址、支持版本与版本条目数取自 Modrinth 官方数据；规则是否存在、行为如何，请以你所用版本的游戏内 `/carpet` 输出为准。
