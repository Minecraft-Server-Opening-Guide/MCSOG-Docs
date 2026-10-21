---
title: 实体与掉落物堆积导致的卡顿
slug: entity-lag
cat: faq
level: 2
order: 4
minutes: 16
tags: [java, faq, lag, entity, item, hopper, tps, spark]
updated: 2026-10-04
draft: false
---

服务器 TPS 从 20 掉到个位数，`/spark tps` 显示 MSPT 长期高于 50 ms，但 CPU 占用不高、内存也没爆——这类卡顿大概率不是机器不够，而是**实体（entity）与方块实体（block entity）堆积**。

实体类卡顿有两个特点：它**不怎么吃内存，却实打实吃主线程 CPU**；而且**重启只能缓解几分钟**，只要产生源还在，堆积马上回来。本篇按「为什么卡 → 掉落物 → 生物 → 漏斗 → 怎么查 → 误区」的顺序讲。

:::note 适用范围
本篇以 Java 版服务端为主（原版 / Spigot / Paper 系）。文中出现的配置键都会标明它属于哪个文件；**不同核心、不同版本的结构与默认值会变**，动手前请先看你本地生成的那份配置文件。
:::

## 1. 为什么实体是性能杀手

### 1.1 一切都在主线程上排队

Minecraft 服务端的主逻辑是**单线程 tick 循环**：每秒跑 20 个 tick，一个 tick 的预算是 **50 ms**（也就是常说的 MSPT）。所有世界、所有实体、所有方块实体的运算都要在这条线程上排队做完。

```
1 秒 = 20 tick，每 tick 预算 50 ms
MSPT 40 ms  → TPS 20（健康）
MSPT 60 ms  → TPS 掉到 16 左右（开始卡）
MSPT 200 ms → TPS 5（基本玩不动）
```

所以「实体多」之所以致命，是因为它**直接消耗这条唯一线程的时间预算**。CPU 有多少核、内存给多大，都救不回主线程（详见 [性能优化](/tutorials/java/optimize)）。

### 1.2 每 tick 每个实体都在做什么

一个实体每 tick 通常要经过这些环节：

- **AI 与目标选择**：goal selector、寻路（pathfinding）、传感器（sensor）扫描；
- **物理与碰撞**：重力、移动、与其他实体和方块的碰撞检测；
- **计时器**：着火、药水效果、消失（despawn）倒计时；
- **合并检查**：掉落物与经验球要检查附近有没有同类可以合并；
- **追踪与同步**：判断哪些玩家需要收到它的位置更新。

生物类实体在这些项里占得最多（尤其是寻路和传感器）；掉落物单体的开销小得多，但**数量可以轻松上万**——这就是「一个区块几千个掉落物」比「几十只僵尸」更致命的原因。

### 1.3 分类：什么在 tick，什么不在

| 类别 | 每 tick 是否运算 | 说明 |
| --- | --- | --- |
| 生物 / 动物 / 怪物 | 是 | 开销最大的一类：AI、寻路、传感器、碰撞 |
| 掉落物（物品实体） | 是 | 单体便宜，但会堆积到极大量；带消失倒计时与合并检查 |
| 经验球 | 是 | 与掉落物类似；核心通常提供限制合并的选项 |
| 弹射物（箭、三叉戟、雪球、火球、末影珍珠） | 是 | 纯物理运算；`spigot.yml` 里有 `arrow-despawn-rate`、`trident-despawn-rate`（Paper 官方文档当前列为 1200） |
| 矿车 / 船 | 是 | 实体 + 碰撞 + 乘客逻辑；漏斗矿车还会搬运物品 |
| 展示框 / 画 / 拴绳结等悬挂实体 | 是（低频） | `spigot.yml` 的 `hanging-tick-frequency`（Spigot wiki 记录默认 100）控制它们的更新间隔 |
| 盔甲架 / 标记（marker） | 是 | 两者都是实体；Paper 的 `paper-world-defaults.yml` 里有 `entities.armor-stands.tick`、`entities.markers.tick`（当前默认均为 `true`），可关闭以省开销 |
| 刷怪笼 | 是 | 方块实体，每 tick 计算可刷怪区域 |
| 漏斗 | 是 | 方块实体，经典的性能杀手，见第 4 节 |
| 熔炉 / 高炉 / 烟熏炉 | 仅在燃烧工作时 | 闲置的熔炉没有每 tick 逻辑 |
| 箱子 / 木桶 / 潜影盒 | 否（本身不 tick） | 纯容器没有每 tick 的方块实体逻辑，被打开或被漏斗访问时才产生开销 |
| 命令方块 | 否（仅被触发时） | 闲置不运算 |

:::warn 「容器方块」不等于「一直在算」
最容易搞混的一点：**箱子、熔炉这类"容器方块"本身并不会每 tick 运算**，真正每 tick 运算的是挂在方块上的**方块实体（block entity）**，而且只有带 ticker 的那些（漏斗、刷怪笼、燃烧中的熔炉）才吃 CPU。所以「箱子里东西多」不卡，「漏斗链又长又闲」才卡。
:::

### 1.4 区块加载与区块 tick 不是一回事

实体只在**正在 tick 的区块**里运算，而"被加载"的区块不一定在 tick。Paper 的 `/paper chunkinfo` 会把当前区块分成几类（定义见 Paper 官方命令文档）：

| 类型 | 含义 |
| --- | --- |
| Entity Ticking | 完整 tick：实体、方块、刷怪都在跑 |
| Block Ticking | 俗称 lazy chunk：方块逻辑在跑，但实体不 tick |
| Full | 俗称 border chunk：不 tick，但方块与实体可访问 |
| Inactive | 不可访问，只在做区块生成 |
| Total | 以上总和 |

这解释了两个常见现象：

- **远处的生物不一定卡服**：它们所在区块可能只是 Block Ticking 或 Full，实体根本没被 tick；
- **加载不等于运算**：`/paper holderinfo` 显示的是内存中持有的区块数量，与 CPU 上的 tick 负载不是一回事。

:::note 掉落物不会自己加载区块
严格来说，掉落物本身**不会**把区块"加载"起来——原版里维持区块加载的是玩家、出生点区块、传送门、`/forceload` 与插件。但只要那片区块因为上述原因保持加载，里面的掉落物就会一直 tick、一直堆积。
:::

### 1.5 实体激活范围（activation range）

为了不让"加载着但身边没人"的实体白吃 CPU，Spigot 系引入了**实体激活范围**：超出这个距离的实体**不是不加载，而是降低 tick 频率**。

Paper 官方文档对 `spigot.yml` 中 `entity-activation-range` 的说明是：实体正常 tick 的、与玩家的距离（单位方块）；超出该范围后实体 tick 的频率会降低；设为 0 或更小则关闭该分类的节流，让已加载实体无论多远都正常 tick。

Paper 文档当前列出的结构如下（**默认值随版本变化，请以你本地文件为准**）：

```yaml
# spigot.yml → world-settings.default
entity-activation-range:
  animals: 32
  monsters: 32
  raiders: 64
  misc: 16
  water: 16
  villagers: 32
  flying-monsters: 32
  wake-up-inactive:
    animals-every: 1200
    animals-for: 100
    animals-max-per-tick: 4
    monsters-every: 400
    monsters-for: 100
    monsters-max-per-tick: 8
    villagers-every: 600
    villagers-for: 100
    villagers-max-per-tick: 4
    flying-monsters-every: 200
    flying-monsters-for: 100
    flying-monsters-max-per-tick: 8
  villagers-work-immunity-after: 100
  villagers-work-immunity-for: 20
  villagers-active-for-panic: true
  tick-inactive-villagers: true
  ignore-spectators: false
```

两个必须知道的代价：

- `tick-inactive-villagers`（Paper 文档当前默认 `true`）如果关掉，**村民不会按原版工作**，玩家得守在附近才会补货；
- `wake-up-inactive` 决定"睡着的"实体多久被唤醒一次，调得太吝啬会让机器与农场行为明显异常。

结合 [生电与红石](/tutorials/java/redstone)：**生电服请谨慎动这里**，或者干脆改用 Fabric / Leaves。

## 2. 掉落物堆积

### 2.1 常见成因

- **农场没有击杀与收集闭环**：刷怪塔把掉落物直接丢在地上；
- **仙人掌 / 甘蔗 / 自动农场把产物吐在地上**；
- **玩家随手丢东西**：整理背包、死亡掉落、搬家扔垃圾；
- **TNT / 沙子复制机**这类复制装置产生的实体；
- **漏斗线断了**：目标箱子满了、漏斗被堵住、区块卸载导致物品卡在半路，上游却还在持续产出；
- **`/give` 滥用或命令方块循环发物品**；
- **农场通宵运行**：出生点区块、`/forceload`、插件强制加载的区块里，机器在无人时也照跑。

### 2.2 为什么掉落物这么伤

- **单体便宜，数量可怕**：一个区块几千个掉落物，叠加起来就是可观的 MSPT；
- **合并远没有想象中积极**：原版物品只有在很近的距离内才会合并；Paper 的 `entities.behavior.only-merge-items-horizontally`（当前默认 `false`）控制是否只合并同一高度上的物品，设为 `true` 可避免一些视觉异常，但**合并会更少**；
- **每个掉落物都要 tick**：物理、消失倒计时、合并检查一样不少；
- **漏斗要扫描它们**：漏斗上方的掉落物是漏斗持续工作的来源之一（见第 4 节）；
- **玩家靠近时被吸进背包**，带来额外的物品栏与网络开销；
- **存档也会变大**：实体要写进区块存档，量大时保存时间与存档体积都会上升。

### 2.3 诊断

先用**能看到数量**的手段，而不是凭感觉：

| 手段 | 用途 |
| --- | --- |
| `/paper entity list minecraft:item` | Paper 命令，列出当前 tick 的实体，输出形如 `Total Ticking: N, Total Non-Ticking: M`，并按类型给出（ticking 数, 非 ticking 数）。掉落物大量出现在非 ticking 一侧，说明它们在激活范围外被节流——总量仍然值得关注 |
| `/spark tps`、`/spark health` | 先判断"是不是真的卡"、卡在 TPS 还是内存/磁盘 |
| `/spark profiler start --timeout 60` | 采样后看调用树里 `ItemEntity.tick`、`Entity.tick` 的占比 |
| `/spark tickmonitor --threshold-tick 100` | 只报告超过 100 ms 的 tick，配合现场操作定位 |
| `/paper chunkinfo` | 看各世界加载区块的类型分布，判断是"加载太多"还是"实体太多" |
| `/forceload query` | 查有哪些区块被强制加载（这类区块里的农场最容易失控） |
| `/debug start` / `/debug stop` | 原版自带的性能采样，生成 debug profile |

spark 的完整用法与读图方法见 [用 spark 分析性能](/tutorials/ops/spark)。

**`/kill @e[type=item]` 是把钝器**，只在应急时用：

```bash
# 清理当前已加载区块内的全部掉落物
/kill @e[type=item]

# 限定范围：以执行者为中心 64 格内
/kill @e[type=item,distance=..64]
```

:::warn 清理掉落物是不可撤销的
它会**无差别删除地上的所有物品**：玩家刚丢下的、农场正在收集的、死亡掉落的装备，全都没了，且无法恢复。**玩家在线时不要随手全服执行**；更不要把它当长期方案——半小时后地上又是一片。
:::

**怎么定位"某一个区块里有几千个实体"？** 实体总数只告诉你"多"，不告诉你"在哪"。可以按这个顺序找：

1. 先用 `/paper chunkinfo` 排除"区块加载过多"这一类原因；
2. 再用 spark 采样，对比不同世界、不同区域的热点，或开着 `/spark tickmonitor --threshold-tick 100` 跑到可疑区域，看 tick 是否明显变长；
3. 用 `@e` 选择器做范围计数：站到可疑位置执行 `/execute if entity @e[type=item,distance=..16]`，从命令反馈的成功次数判断数量级（不同版本的反馈格式不同，以实际输出为准）；
4. 需要长期盯着看时，用能按区块列出实体数量的插件或面板工具。

:::tip timings 是老版本的事
旧版 Paper 的性能报告是 **timings**。Paper 官方文档现在把 `/tps`、`/mspt` 归入"已被 `/spark` 取代"的范畴——**能用 spark 就用 spark**，报告口径统一，也更容易对比。
:::

### 2.4 处理

**第一步永远是改设计，而不是改配置。** 让农场形成闭环：击杀室 + 水流或漏斗矿车收集 + 直接进箱子，产物不再落地。

**第二步才是配置与插件。**

**掉落物存活时间**：原版机制是掉落物约 5 分钟（6000 tick）后消失。多数核心允许调整这一时长，甚至按物品类型单独设置，但**键名、所在层级与默认值因核心与版本而异**，请以你本地生成的配置文件与官方文档为准。

**定时清理插件**（社区常见的如 ClearLag 一类）。选型与配置时重点确认：

- **清理间隔**：多久清一次（常见 5~10 分钟）；
- **清理对象**：只清 `item`，还是连经验球、弹射物、怪物一起清（后者更容易误伤）；
- **提前公告**：清理前给倒计时提示，避免玩家正在捡东西时被清；
- **保护规则**：跳过有自定义名称的物品、跳过玩家死亡掉落、跳过指定世界或指定区域（产物收集区尤其要排除）；
- **兼容性**：确认插件支持你的核心与游戏版本（见 [插件入门](/tutorials/java/plugins)）。

**合并半径 `merge-radius`**：这是 Spigot / Paper 系真实存在的键，位于 `spigot.yml` 的 world-settings 下，分物品与经验球两项。Paper 官方文档当前列出的结构是：

```yaml
# spigot.yml → world-settings.default
merge-radius:
  item: 0.5
  exp: -1
```

需要注意**两处权威文档并不一致**：Spigot wiki 对同一组键记录的默认值是 item 2.5 / exp 3.0，并把它描述为"物品/经验球在地面上合并的范围"；Paper 官方文档对 exp 的说明则是"在生成瞬间合并，原版没有这个行为，设为 0 或更小即关闭"。

:::tip 默认值不一致正是要你查本地文件的原因
同一个键在不同核心、不同版本下默认值不同，是这类优化的常态。**调大合并半径**能让掉落物更快堆成一叠、减少实体数量，代价是**改变原版行为**，可能影响依赖物品分离的机器——生电服慎用。相关键还有 Paper 的 `entities.behavior.experience-merge-max-value`（当前默认 `-1`，即不限制经验球合并后的最大值）。
:::

**给存档兜底**：Paper 的 `chunks.entity-per-chunk-save-limit` 可以限制每个区块**保存/加载**的某类实体数量（Paper 文档中 `experience_orb: -1` 表示不限制，也可按 `<entity-type>` 配置）。它限制的是存档与加载环节，不是当场删除实体，适合给"掉一地经验球"这种场景兜底。

**别让农场在无人时跑**：不要滥用 `/forceload`；Paper 的 `unsupported-settings.disable-world-ticking-when-empty`（当前默认 `false`，属于官方明确标注"不受支持"的选项）可以在没有玩家、也没有强制加载区块时停止世界 tick——**改动前先确认版本行为**。

## 3. 实体堆积（生物）

### 3.1 常见成因

- **刷怪笼长期运行**：尤其是没做击杀/收集的刷怪笼；
- **未照明的洞穴与夜晚刷怪**：玩家活动区附近的地下全是怪；
- **无节制繁殖**：牛羊猪鸡堆成一片；
- **宠物满地**：驯服的狼、猫、马散落在地图各处；
- **村民繁殖大厅**：村民数量上百后，POI 查询与寻路开销显著；
- **袭击 / 流浪商人堆积**：长期不结束的袭击、没人搭理的流浪商人及其羊驼；
- **实体密集的红石装置**：矿车阵列、盔甲架、掉落物链；
- **传送门刷猪人**：Paper 提供 `nerf-pigmen-from-nether-portals`（当前默认 `false`）来关闭该行为。

### 3.2 诊断

- **spark profiler**：热点常见于 `Entity.tick`、寻路相关方法、传感器扫描、村民 POI 查询；
- **`/spark health`**：确认 TPS、CPU、内存、磁盘四项里是哪一项在告急；
- **`/paper entity list`**：看实体类型的分布（哪些类型数量异常）；
- **`/paper mobcaps`**：查看某个世界的全局刷怪上限与实际占用，以及可刷怪区块数量；
- **`/paper playermobcaps`**：查看单个玩家的本地刷怪上限；
- **`/paper chunkinfo`**：把实体数量和区块加载情况对应起来，判断是不是"某个强制加载区块在刷怪"。

### 3.3 处理

**（1）实体激活范围**：见 1.5 节。这是最有效也最容易伤到机器的一档，改前先备份配置、改后回测农场。

**（2）刷怪范围 `mob-spawn-range`**：单位是区块，控制玩家周围多远可以刷怪。Paper 官方文档当前列为 `8`，Spigot wiki 记录为 `6`——**又是一个随版本变化的默认值**，请以本地文件为准。调小可以减少刷出的生物总量，但可能让某些刷怪塔效率下降。

**（3）每世界刷怪上限**：`bukkit.yml` 的 `spawn-limits`，Paper 官方文档当前列出的默认值为：

```yaml
# bukkit.yml
spawn-limits:
  monsters: 70
  animals: 10
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
```

Paper 还允许在 `paper-world-defaults.yml` 里按世界覆盖同一组上限（`entities.spawning.spawn-limits`，当前默认全部为 `-1`，即沿用 `bukkit.yml` 的值）。另外 `entities.spawning.per-player-mob-spawns`（当前默认 `true`）决定刷怪上限是按玩家各自计算还是全局共享。

**（4）游戏规则**：原版自带、见效最快的一档。

```bash
# 关闭自然刷怪（原版默认 true）——注意这会让刷怪塔失效
/gamerule doMobSpawning false

# 关闭生物掉落物（原版默认 true）
/gamerule doMobLoot false

# 随机刻速度，原版默认 3；调低会同时影响作物生长、火势蔓延、冰雪形成
/gamerule randomTickSpeed 3
```

:::warn 游戏规则是"一刀切"
`doMobSpawning`、`doMobLoot` 关掉之后，**所有依赖它的玩法都会一起失效**（刷怪塔、经验农场、凋灵骷髅头收集等）。它适合活动服或临时救火，不适合长期开着当优化手段。
:::

**（5）刷怪笼相关**：

```yaml
# spigot.yml → world-settings.default
nerf-spawner-mobs: false
```

Paper 文档对 `nerf-spawner-mobs` 的说明是"禁用刷怪笼生成的生物的大部分 AI"（当前默认 `false`）。设为 `true` 能省下可观的 AI 开销，但刷怪笼产出的生物行为会明显不同。Paper 另有 `tick-rates.mob-spawner`（当前默认 `1`）控制刷怪笼计算可刷怪区域与生成实体的频率。

**（6）刷怪笼控制插件**：不少插件可以限制刷怪笼的激活距离、每分钟生成数量或需要玩家在场。选型时同样确认与核心、版本兼容，并优先选择"可回退、可白名单"的方案。

**（7）农场设计**：击杀室 + 收集闭环 + 及时消失，是比任何配置都稳的解法。掉落物不落地，实体数就不会失控。

**（8）装饰性实体**：盔甲架、标记（marker）都是实体。Paper 的 `entities.armor-stands.tick`（当前默认 `true`，官方说明是"关掉可阻止盔甲架 tick，在盔甲架很多时能提升性能"）与 `entities.markers.tick`（当前默认 `true`，官方提示可能影响它们作为其他实体乘客时的行为）可以按需关闭。

**（9）强制消失**：Paper 的 `entities.spawning.despawn-time.<entity-type>`（当前默认 `disabled`）可以给指定实体类型设置强制消失时间；`entities.spawning.despawn-ranges` 控制随机消失距离（默认 `default`，即沿用原版规则）。这两项都会改变原版行为，动之前先想清楚。

## 4. 方块实体与漏斗

### 4.1 漏斗为什么是经典元凶

漏斗是**方块实体**，在它所在的区块被 tick 时，它每 tick 都有工作要做：

- 检查上方是否有掉落物可以吸入、是否有容器可以抽取；
- 按冷却搬运物品（原版是 8 tick 一次，对应 `spigot.yml` 的 `ticks-per.hopper-transfer`）；
- 访问容器时产生额外开销，插件监听搬运事件（InventoryMoveItemEvent）时开销更大。

Paper 官方文档对 `spigot.yml` 里相关键的说明是：

- `ticks-per.hopper-transfer`（当前默认 `8`）：漏斗搬运物品的间隔 tick；
- `ticks-per.hopper-check`（当前默认 `1`）：漏斗检查抽取物品的间隔 tick；
- `hopper-amount`（当前默认 `1`）：漏斗一次搬运的物品数量，上限为堆叠大小；
- `hopper-can-load-chunks`（当前默认 `false`）：与"漏斗是否会加载区块"相关的开关，语义与默认值请以官方文档与你本地配置为准。

Spigot wiki 额外提醒：把 `hopper-check` 改大会**因为不同步而破坏大多数漏斗装置**。也就是说，这类"性能优化"在生电场景下几乎必然出问题。

```yaml
# spigot.yml → world-settings.default
ticks-per:
  hopper-transfer: 8
  hopper-check: 1
hopper-amount: 1
```

### 4.2 怎么减少漏斗开销

| 做法 | 说明 | 代价 |
| --- | --- | --- |
| 用水流/冰道代替长漏斗链 | 物品顺水漂流，只在终点放一个漏斗收集 | 需要重新设计物流 |
| 用投掷器汇入单条漏斗线 | 减少"每个箱子配一个漏斗"的重复 | 需要红石控制 |
| 拆掉闲置漏斗 | 已废弃的机器、坏掉的物流线留在世界里照样 tick | 无 |
| 漏斗矿车搬运 | 一个实体顶一条漏斗线，适合长距离 | 矿车本身也是实体 |
| 打开核心的漏斗优化 | 例如 Paper 的 `hopper` 段 | 可能影响依赖搬运事件的插件 |
| 让满的漏斗少干活 | Paper 的 `hopper.cooldown-when-full`（当前默认 `true`） | 无，属于默认开启的优化 |

Paper 的 `paper-world-defaults.yml` 里有专门的漏斗段：

```yaml
# paper-world-defaults.yml
hopper:
  cooldown-when-full: true
  disable-move-event: false
  ignore-occluding-blocks: false
```

- `cooldown-when-full`：Paper 文档说明为"漏斗满时施加短暂冷却，而不是持续尝试抽取新物品"；
- `disable-move-event`：关掉搬运事件以省开销，但**依赖该事件的插件会失效**；
- `ignore-occluding-blocks`：忽略遮挡方块相关的检查。

:::note 结构与默认值随版本变化
上面这一段的形状在不同 Paper 版本里改过（例如 `cooldown-when-full` 早期是带 `enabled` / `movement-ticks` 的子节点）。**请以你本地生成的 `paper-world-defaults.yml` 与 Paper 官方文档为准。**
:::

### 4.3 顺带一提：容器更新与"不受支持"的开关

Paper 的 `tick-rates.container-update`（当前默认 `1`）控制服务端更新容器与物品栏的频率。Paper 官方文档明确警告：**把它调大于 1 会造成物品不同步/复制（ghosting），或者让挖掘进度看起来莫名重置，也可能制造出"像卡服"的视觉假象**。这不是一个值得动的优化项。

Paper 的 `unsupported-settings.ticking.block-entities` 与 `ticking.chunks`（当前默认均为 `true`，且被官方标注为"不受支持"）可以整体关闭方块实体或区块 tick。**不要在生产服上碰它们**——那等于把游戏逻辑关掉。

## 5. 排查流程

实体类卡顿的排查顺序和别的性能问题一样：**先测量，再定位，最后才动手**。

### 5.1 七步

1. **测量**：`/spark tps` 看 TPS 与 MSPT，`/spark health` 看是 CPU、内存还是磁盘的问题。确认"确实是主线程被吃满"再往下走。
2. **找热点**：`/spark profiler start --timeout 60`，采样结束后看调用树——`Entity.tick`、`ItemEntity.tick`、方块实体 tick、寻路/传感器方法，哪一枝最宽就是主嫌疑。读图方法见 [用 spark 分析性能](/tutorials/ops/spark)。
3. **定位区块与类型**：`/paper entity list` 看类型分布，`/paper chunkinfo` 看区块类型分布，`/forceload query` 查强制加载。
4. **判断性质**：这是**设计问题**（农场没闭环、机器没人管）还是**配置问题**（刷怪范围、激活范围太宽松）？绝大多数情况下是设计问题。
5. **先改设计**：加击杀室、加收集、拆掉废弃机器、别让农场无人值守通宵跑。改完再测。
6. **再调配置**：设计改完仍不够，才动 `spigot.yml` / `bukkit.yml` / `paper-world-defaults.yml` 里的实体相关项。**一次只改一项**，改前备份（见 [配置服务端](/tutorials/java/config)）。
7. **复测并记账**：改完立刻回测同一场景（同一机器、同一时段、同样人数），确认 MSPT 真的降了；把"改了什么、为什么、效果如何"记进变更日志。**没有复测的优化等于没做。**

### 5.2 速查表

| 现象 | 可能原因 | 先查什么 | 处理 |
| --- | --- | --- | --- |
| 地上到处是掉落物，TPS 缓慢下滑 | 农场无收集闭环、漏斗线断了、玩家乱丢 | `/paper entity list minecraft:item`、spark 调用树 | 修农场设计；定时清理插件兜底 |
| 单个区域一到就卡，离开就好 | 该区块有大量实体或密集机器 | `/paper chunkinfo`、`/forceload query`、spark 按世界/区域对比 | 拆改机器；取消不必要的强制加载 |
| 夜晚/地下刷怪后开始卡 | 未照明区域刷怪 | `/paper entity list`、`/paper mobcaps` | 照明洞穴；收紧缩小 `mob-spawn-range`；必要时 `doMobSpawning` |
| 村民大厅附近卡 | 村民数量大、POI 查询与寻路开销 | spark 中村民相关热点、`/paper entity list minecraft:villager` | 限制繁殖；必要时关闭 `tick-inactive-villagers`（会改变原版行为） |
| 大量机器闲置时也卡 | 漏斗、刷怪笼、盔甲架等方块实体与实体在空转 | spark 中方块实体与实体 tick 的占比 | 拆闲置机器；启用核心的漏斗优化；关闭盔甲架 tick |
| 重启后短暂正常，随后又卡 | 产生源未处理 | 观察恢复所需时间、对照上面的排查 | 回到第 1~5 步，处理产生源而不是反复重启 |
| 内存给很大仍然卡 | 瓶颈在主线程 CPU，不在堆内存 | `/spark health` 的 CPU 与 MSPT | 按本篇处理实体；见 [性能优化](/tutorials/java/optimize) |
| 装了清理插件还是卡 | 清理对象/间隔不对，或卡点根本不是掉落物 | spark 调用树 | 先确认热点，再决定是否保留该插件 |

Java 版各类报错与坑的症状速查见 [[JAVA] 常见问题](/tutorials/faq/faq-java)。

## 6. 常见误区

**误区一：重启能解决问题。**
重启只是把世界重新载入一次，短时间看起来"顺了"。只要刷怪塔还在往地上丢东西、漏斗线还是断的、强制加载区块还开着，堆积会以同样的速度回来。重启是**应急手段**，不是修复手段。

**误区二：加内存（`-Xmx`）能治实体卡顿。**
实体卡顿是**主线程 CPU** 问题，不是堆内存问题。给得再大，tick 还是在那一条线程上跑；`-Xmx` 过大反而会让 GC 停顿变长。先把热点找出来。

**误区三：把实体上限调得越狠越好。**
激进地缩小激活范围、刷怪范围、合并半径，会让**农场和生电机器直接失效**：村民不补货、刷怪塔不出货、依赖物品分离的装置乱套。生电服请优先看 [生电与红石](/tutorials/java/redstone)，必要时换 Fabric / Leaves，而不是在 Paper 系里把行为改到面目全非。

**误区四：`/kill @e` 是万能药。**
它会连玩家驯服的宠物、带装备的盔甲架、正在收集的产物一起清掉，**不可撤销**。`/kill @e[type=item]` 虽然温和一些，也依然会清掉玩家与农场在地上的合法物品。执行前先想清楚"这些实体里有没有玩家财产"。

**误区五：实体数量多就等于卡。**
数量要看类型和位置。一万个掉落物堆在一个区块里、旁边还有玩家，那是灾难；一万个掉落物分散在一百个只是 Block Ticking 的区块里，可能几乎不产生开销。**先看 tick 热点，再看数量。**

**误区六：装一堆"优化插件"就能解决。**
优化插件多数只是把上面这些配置项包装成图形界面或定时任务。**产生源不解决，清理只是把问题从"持续卡"变成"周期性卡一下"。** 插件与核心的兼容性也要确认，劣质插件本身可能就是热点。

**误区七：优化一次就完事。**
服务器是活的：新机器、新农场、新玩家都会改变负载。把关键指标（TPS/MSPT、实体数量级）纳入日常巡检，比一次性调参有用得多。

---

> 配置项名称与默认值随核心与版本变化，请以你本地生成的配置文件与官方文档为准。
