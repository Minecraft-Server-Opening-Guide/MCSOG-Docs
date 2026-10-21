---
title: 世界管理
slug: world
cat: java
level: 3
order: 23
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, world-management, worldedit, fawe, worldguard, multiverse]
updated: 2026-10-04
draft: false
---

服务器的"世界"不只是服务器目录里那个 `world` 文件夹。只要你想改地形、想保护一片区域、想同时跑大厅和资源世界，就会用到**世界管理**这一类插件。它们通常一起出现，也通常一起出问题。

## 1. 世界管理包含哪几件事

| 需求 | 典型插件 | 一句话说明 |
| --- | --- | --- |
| 编辑地形与建筑 | WorldEdit / FastAsyncWorldEdit | 用选区工具批量改方块、复制粘贴建筑 |
| 保护区域与设定世界规则 | WorldGuard | 让某些区域只有特定的人能动 |
| 同时运行多个世界 | Multiverse-Core | 新建、删除、导入世界，管理世界间的传送 |

这三件事互相咬合：WorldGuard 依赖 WorldEdit（或 FAWE），WorldEdit 的选区指令是划区域保护的基础。所以通常是一套装，而不是挑一个装。

## 2. WorldEdit 基础

WorldEdit 就是常说的"创世神"或"小木斧"，几乎是所有建筑与管理工作的起点。它的核心概念只有两个：**先选区，再操作**。

### 选区

```
//wand              拿到选区工具（默认是木斧）
//pos1  //pos2      把当前位置设为第一个 / 第二个角点
//hpos1 //hpos2     把准星指向的方块设为角点
//expand 10 up      把选区朝某个方向扩展若干格
//size              查看选区尺寸与方块总数
//limit 100000      给自己设一个单次操作的方块上限
```

左键点方块选第一个角，右键点方块选第二个角，这是最常用的方式；`//pos1` / `//pos2` 适合精确站位。

### 常用编辑指令

```
//set stone                 把选区内全部换成石头
//replace dirt grass        只把选区内的泥土换成草方块
//walls stone               只填充选区四壁（做墙很方便）
//copy  //paste             复制选区 / 粘贴到当前位置
//undo  //redo              撤销 / 重做
```

### 保存与粘贴建筑（schematic）

```
//schem save 建筑名         把当前选区存成文件
//schem load 建筑名         读取已保存的文件
//paste                     粘贴到当前位置
```

文件通常落在 `plugins/WorldEdit/schematics/` 下，FAWE 对应的是 `plugins/FastAsyncWorldEdit/schematics/`。注意指令写法随版本变化：7.x 用 `//schem`，较早的版本用 `//schematic`。

:::tip 动手前先 //size
`//size` 会告诉你这个选区到底有多少个方块。养成先看一眼再执行的习惯，能避免绝大多数"一不小心把整张地图换成石头"的事故。
:::

## 3. 为什么 WorldEdit 会卡服

原版 WorldEdit 的方块改动**在主线程上执行**。这意味着一次 `//set` 期间，服务端几乎没有余力处理别的事情：

- 选区稍大就是几十万甚至上百万个方块，每个方块都要触发光照重算、方块更新与区块标记；
- 主线程被长时间占满，所有玩家一起卡顿、掉线，严重时触发看门狗直接崩服；
- 内存与 CPU 压力同步飙升，视距越大、在线人数越多，情况越糟；
- 最常见的诱因是**选区没确认就执行**，或者把选区拉到了整张地图。

可行的防护手段：

- 用 `//limit` 给自己设单次操作的方块上限；
- 每次动手前先 `//size` 确认规模；
- 大工程拆成多次小块操作；
- 给玩家的 WorldEdit 权限按需给，不要默认放开；
- 真正的大范围作业改用 FAWE。

## 4. FastAsyncWorldEdit（FAWE）

**FastAsyncWorldEdit 是 WorldEdit 的异步优化版本**，把方块改动从主线程挪到异步线程并分批处理，从而避免长时间卡住服务器。

- 它实现了 WorldEdit 的接口，因此**通常可以直接替换 WorldEdit**：把 WorldEdit 换成 FAWE 后，依赖 WorldEdit 的插件一般仍能正常工作。
- 它也有自己的配置，可以限制单个玩家单次操作的方块数量，比原版更适合开放给玩家使用。

**什么时候用 FAWE**

- 大面积地形改造、批量粘贴 schematic；
- 多个管理员同时施工；
- 服务器本身玩家较多，承受不起主线程被占满。

**什么时候原版 WorldEdit 也够用**

- 只是偶尔做小范围改动；
- 某些插件与 FAWE 存在兼容问题，而你的服务器恰好依赖它。

:::note 不是二选一
FAWE 与 WorldEdit 是同一个位置的两个选择，不要同时装两个。装了 FAWE 就等于有了 WorldEdit 的能力，WorldGuard 也会正常识别它。
:::

## 5. WorldGuard：把区域保护起来

WorldGuard 是管理端的区域保护插件，**前置是 WorldEdit 或 FastAsyncWorldEdit**。它的所有功能默认关闭，需要什么开什么。

它主要做两件事。

**区域保护**

- 阻止玩家在指定区域内放置与破坏方块；
- 只允许特定的人在某个区域内建造；
- 在区域内禁用 PvP、TNT、怪物伤害等。

**世界规则调整**

- 阻止爬行者与凋灵造成的方块破坏、坠落伤害等；
- 关闭火焰蔓延、岩浆引燃、结冰、末影人搬走方块等机制；
- 把某些物品或方块列入黑名单，或在使用时向管理员发出警告；
- 防范一些利用游戏机制的刷物品漏洞；
- 提供"立即停止所有火焰蔓延"一类的实用指令。

典型用法是在出生点、商店街、活动场地各划一个区域，再给资源世界单独定一套规则。区域保护的思路与领地插件的区别，见 [领地与保护](/tutorials/java/protection)。

## 6. Multiverse：同时运行多个世界

Multiverse-Core 是知名度很高的老牌多世界插件，用来**新建、删除、导入世界（维度）**。常见的世界划分是：一个大厅、一个生存主世界、一个可再生的资源世界、一个创造世界。

它本身只做世界管理，具体玩法靠扩展插件补：

| 扩展 | 作用 |
| --- | --- |
| **Multiverse-NetherPortals** | 让玩家建造的地狱门通往指定的世界 |
| **Multiverse-Portals** | 创建传送到指定地点的传送门 |
| **Multiverse-Inventories** | 按世界隔离玩家背包 |
| **Multiverse-SignPortals** | 用告示牌做传送点 |

几个实用细节：

- **禁止生成默认世界**：主世界无法禁用；下界可以在 `server.properties` 里把 `allow-nether` 设为 `false`；末地在 `bukkit.yml` 里把 `settings.allow-end` 设为 `false`。这样做通常是因为服务器只当大厅或小游戏服使用，不需要额外维度。
- **世界名格式决定传送门归属**：`plugins/Multiverse-Core/config.yml` 里有 `world-name-format`，默认把下界和末地命名为 `%overworld%_nether` 与 `%overworld%_the_end`。如果改掉这个格式，或者创建了名字不匹配的世界，那么这些世界与主世界之间的地狱门、末地门关联就会断开，传送门即使能被激活也不会把你送过去。
- **下载渠道**：GitHub 上的版本比 SpigotMC 上能拿到的更新，想要新特性优先看 GitHub 与 Hangar。
- **崩溃漏洞**：早期版本存在特殊字符触发 `PatternSyntaxException` 导致服务端崩溃的问题，**Multiverse-Core 4.3.1 已修复**，请使用最新版本。确实无法升级时，社区提供过对应的修复补丁。

## 7. 多世界的常见坑

| 坑 | 现象 | 处理方式 |
| --- | --- | --- |
| 背包与游戏模式 | 换世界后背包、经验、游戏模式跟着变，或者你想要分离却没分离 | 用 **Multiverse-Inventories** 按世界隔离背包；每个世界的游戏模式在世界配置里单独设定 |
| 传送门乱连 | 建在地狱的门把玩家送到了另一个世界 | 用 **Multiverse-NetherPortals** 明确指定目标世界，并检查 `world-name-format` |
| 中文世界名乱码 | 世界名在指令与提示里显示成乱码 | 世界名一律用英文；要显示中文就在 `worlds.yml` 里设置 `alias` 别名 |
| 世界太多 | 内存与磁盘占用上涨，启动变慢 | 只保留真正需要的世界；不用的世界备份后移除，而不是一直挂着 |
| 特殊字符崩服 | 特定输入直接让服务端崩溃 | 升级到 4.3.1 以上 |
| 出生点不对 | 新玩家第一次进入时落在奇怪的位置 | 每个世界单独设置出生点，而不是只依赖主世界的出生点 |
| 世界权限 | 玩家可以随便进出不该进的世界 | 用权限节点控制进入各世界的权限，创造世界与活动世界尤其要限制 |

:::warn 别名不等于改名
`alias` 只影响插件显示，世界文件夹名与指令里用的仍然是英文名。想改中文名请改别名，直接改世界名会让已存档的数据找不到对应世界。
:::

## 8. 一套推荐的组合

| 需求 | 选择 |
| --- | --- |
| 小范围编辑地形与建筑 | WorldEdit |
| 大范围施工、批量粘贴 | FastAsyncWorldEdit（替换 WorldEdit） |
| 保护出生点、商店、活动场地 | WorldGuard（可选 WorldGuard Extra Flags 补充更多 flag） |
| 大厅 / 资源世界 / 创造世界 | Multiverse-Core，按需加装扩展 |
| 出事能查、能回滚 | CoreProtect 一类的记录插件 |

装完之后先做三件事：把出生点划进 WorldGuard 区域、给资源世界定好规则、确认每个世界的背包与游戏模式策略符合预期。这三件事没做，多世界就只是把麻烦放大了。

## 下一步

世界改了、地形动了，就要考虑怎么把成果保住：见 [备份与恢复](/tutorials/java/backup)。插件本身的安装与配置基础见 [插件入门](/tutorials/java/plugins)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
