---
title: 单机存档转服务器
slug: save-migration
cat: ops
level: 2
order: 19
minutes: 14
tags: [存档, 迁移, level.dat, 维度, 玩家数据, 服务端, 备份, 排错]
updated: 2026-10-04
draft: false
---

**把自己玩了几百小时的单机存档搬到服务器上，是最容易"看起来成功、实际上丢东西"的操作之一。** 目录名差一个字母，进服就是一个全新空世界；地狱和末地的文件夹没搬，传送门后面是一片未生成的地形；玩家数据没改名，人进来了但背包、成就、统计全部清零。这一篇把存档的真实结构、两套目录布局、服务端到底期待什么、以及一次可靠的迁移流程讲清楚。

迁移前请先读完 [备份与恢复](/tutorials/java/backup)：整个流程的第一步和最后一步都是备份。服务端目录与配置文件的关系见 [服务端结构](/tutorials/java/structure) 与 [配置服务端](/tutorials/java/config)。

## 1. 先看清：单机存档里到底有什么

单机存档是 `.minecraft/saves/<世界名>/` 下的一个目录（Windows 上通常是 `%APPDATA%\.minecraft\saves\<世界名>\`）。它不是一个整体文件，而是**几十到几万个文件**的组合：

| 路径 | 内容 | 说明 |
| --- | --- | --- |
| `level.dat` | 世界的全局信息 | NBT 格式，含世界名、生成设置与种子、游戏规则、出生点、时间、`DataVersion` 等 |
| `level.dat_old` | 上一份 `level.dat` 的备份 | 加载世界时自动产生，可以一起复制 |
| `level.dat_new` | 写入过程中的临时文件 | 正常关闭后一般不存在，出现它说明上次写入被中断 |
| `session.lock` | 世界占用锁 | 1.16 起内容是一个 U+2603 字符（雪人符号）；**不要复制**，服务端会自己重建 |
| `region/` | 主世界的区域文件 `r.<x>.<z>.mca` | 地形与方块数据，体积最大的一部分 |
| `entities/` | 主世界的实体数据 | 1.17 起从 `region/` 中拆出来独立存放 |
| `poi/` | 主世界的兴趣点 | 1.14 起存在；村民的床与工作站、传送门、蜂巢、磁石等 |
| `data/` | 世界级杂项数据 | 计分板、袭击、地图、命令存储等 |
| `playerdata/<uuid>.dat` | 玩家数据 | 背包、位置、血量、经验等，**文件名就是玩家 UUID** |
| `advancements/<uuid>.json` | 进度（成就） | 同样以 UUID 命名 |
| `stats/<uuid>.json` | 统计 | 同样以 UUID 命名 |
| `datapacks/` | 世界级数据包 | 与全局数据包不同，它跟着世界走 |
| `DIM-1/`、`DIM1/` | 地狱与末地 | 老布局；名字来自旧版数字维度 ID（-1 与 1） |
| `dimensions/<命名空间>/<路径>/` | 自定义维度 | 1.16 起支持；26.1 起三个默认维度也搬到这里 |
| `resources.zip` | 世界自带资源包 | 26.1 起移入 `resourcepacks/` 子目录 |

:::note 没有 `DIM-1/` 不代表存档有问题
地狱和末地的文件夹是**第一次进入那个维度时**才生成的。如果你从没去过末地，存档里就不会有 `DIM1/`——这是正常的，服务端会在玩家第一次进入时自己创建。
:::

## 2. 两套布局：`DIM` 文件夹与 `dimensions/`

这是整个迁移里最容易搞错的地方，必须按版本分开看：

| 版本区间 | 主世界 | 地狱 | 末地 | 自定义维度 |
| --- | --- | --- | --- | --- |
| 1.2.1 – 1.13（Anvil 起） | 存档根目录（`region/`、`data/` 等） | `DIM-1/` | `DIM1/` | 不支持 |
| 1.14 – 1.15 | 同上，多出 `poi/` | `DIM-1/` | `DIM1/` | 不支持 |
| 1.16 – 26.0 | 同上，1.17 起多出 `entities/` | `DIM-1/` | `DIM1/` | `dimensions/<命名空间>/<路径>/` |
| 26.1（快照 6）及以后 | `dimensions/minecraft/overworld/` | `dimensions/minecraft/the_nether/` | `dimensions/minecraft/the_end/` | `dimensions/<命名空间>/<路径>/` |

要点：

- **老布局（1.16 – 26.0 及更早）**：两个默认维度用固定的目录名 `DIM-1`（地狱，维度 ID `-1`）和 `DIM1`（末地，维度 ID `1`）。它们直接放在**存档根目录下**，与 `region/` 平级。
- **`dimensions/` 布局**：1.16 引入自定义维度后，非默认维度按**资源位置**存放，即 `dimensions/<命名空间>/<路径>/`，例如 `dimensions/mydatapack/skylands/`。26.1 快照 6 重构后，**三个默认维度也改用这套布局**，`DIM-1`/`DIM1` 不再使用。
- 同一个 26.1 存档里，玩家数据也从存档根目录移到了 `players/` 下：`players/data/<uuid>.dat`、`players/advancements/<uuid>.json`、`players/stats/<uuid>.json`。

## 3. 服务端到底期待什么目录

服务端在**工作目录**（可以用 `--universe` 改基准路径）下寻找 `server.properties` 中 `level-name` 指定的目录，默认是 `world`。如果那个路径存在且是一个合法世界（有 `level.dat`），就加载它；**否则服务端会在那个路径上生成一个全新的世界**——注意，它不会报错停下，这正是"我明明复制了存档，进服却是空世界"的根源。

单机存档把三个维度塞进一个目录树，而服务端默认把三个维度放在**三个平级目录**里：

| 单机存档里的东西 | 服务端里的位置 | 说明 |
| --- | --- | --- |
| 存档根内容：`level.dat`、`region/`、`entities/`、`poi/`、`data/`、`playerdata/`、`advancements/`、`stats/`、`datapacks/` | `world/` | 主世界，也就是 `level-name` 指向的目录 |
| `DIM-1/` | `world_nether/` | 地狱 |
| `DIM1/` | `world_the_end/` | 末地 |
| `dimensions/<命名空间>/<路径>/` | 对应维度的目录 | 只有服务端也装了同一个数据包/模组时才有意义 |
| `session.lock` | 不复制 | 服务端启动时自己重建 |
| `level.dat_old` | 随 `level.dat` 一起进 `world/` | 只是上一份 `level.dat` 的备份，留着无害 |

目录名不是写死的：它由 `level-name` 加后缀推导而来。`level-name=myworld` 时通常是 `myworld/`、`myworld_nether/`、`myworld_the_end/`。

:::warn 绝对不要在服务端运行时复制存档
服务端正在写 `region/*.mca` 时复制，很可能拷到**写了一半的区块文件**，恢复后表现为区块缺失、方块错乱甚至世界无法加载；`session.lock` 也会在两边同时存在，导致锁冲突。正确顺序永远是：`stop` 关服（或在控制台执行 `save-all` → `save-off`，但迁移场景**强烈建议直接停服**）→ 复制 → 再启动。
:::

:::tip 最稳的一招：让服务端先把目录建出来
不要手工猜目录名。先用目标 `level-name` 启动一次服务端（生成空世界）→ 停服 → 观察它实际创建了哪些目录 → 再把存档内容**填进这些目录**。这样无论核心用 `world_nether` 还是把维度放在 `world/dimensions/` 里，你都不会填错位置。
:::

## 4. 玩家数据：为什么不会自动跟过去

`playerdata/`、`advancements/`、`stats/` 里的文件名**都是玩家 UUID**。服务端加载玩家时按 UUID 找文件，文件名不匹配就当作新玩家处理：背包空、成就零、统计零。

UUID 从哪来，取决于服务端怎么认人：

| 场景 | UUID 来源 | 结果 |
| --- | --- | --- |
| 单机存档 | 保存在世界里的本地玩家 UUID（26.1 起是 `level.dat` 的 `singleplayer_uuid`，更早版本是 `Player` 标签），也是 `playerdata/` 里那个文件名 | 这是"源" |
| 服务端 `online-mode=true` | 微软/Mojang 账号的正版 UUID | 通常与单机里的 UUID **不同** |
| 服务端 `online-mode=false`（离线/盗版模式） | 由玩家名确定性计算：`UUID.nameUUIDFromBytes(("OfflinePlayer:" + 名字).getBytes(UTF_8))`，是一个版本 3（MD5）UUID | 与正版 UUID **不同**，而且同名玩家在任何离线服上 UUID 都一样 |

也就是说：**除非单机世界恰好就是用同一个账号 UUID 创建的，玩家数据都不会自动生效。**

处理办法（按推荐顺序）：

1. **先让玩家进一次服**，让服务端为这个 UUID 创建数据文件，并把它写进工作目录的 `usercache.json`。
2. 停服，从 `usercache.json`（或 `world/playerdata/` 里新出现的文件名）读出**目标 UUID**。
3. 把源文件**改名**到目标 UUID，而不是覆盖：`playerdata/<旧UUID>.dat` → `playerdata/<新UUID>.dat`，`advancements/`、`stats/` 同理。先备份旧文件，改错了可以回退。
4. 迁移前**先定好 `online-mode`**：一旦确定用离线模式，就不要再改成正版模式，否则所有离线玩家换 UUID，表现就像"存档回档"。

同样按 UUID 索引的还有 `ops.json` 与 `whitelist.json`：复制世界不会带上它们，需要在服务端侧重新 `/op`、`/whitelist add`（或手工按正确 UUID 编辑这两个 JSON）。

## 5. 迁移步骤

### 5.1 迁移前先记录

- 源存档的**游戏版本**（`level.dat` 里的 `DataVersion`，或客户端主菜单的版本号）。**服务端版本不能低于存档版本**，否则会拒绝加载；降级世界是不安全的。
- 目标 `level-name`（决定目录名）。
- 源存档大小：`du -sh`，确认目标磁盘装得下并留有备份空间。
- 迁移前在世界里记下几个可验证的事实：出生点坐标、`/seed` 的值、某个建筑的坐标、地狱传送门位置。

### 5.2 停服与备份

```bash
# 服务端侧：先安全关服
sudo systemctl stop minecraft
# 若不是 systemd 托管，就在控制台执行 stop，确认进程真的退出

# 源存档侧：先打包留底（在客户端机器上）
cd ~/.minecraft/saves
tar -czf MyWorld-20261004.tar.gz MyWorld

# 目标侧：把当前（空的或旧的）世界目录改名留底，不要直接删
cd /opt/minecraft/server
mv world world_before_migration
```

Windows 上对应的做法是在 `%APPDATA%\.minecraft\saves` 里右键压缩 `MyWorld` 文件夹。

### 5.3 复制文件

推荐用 `rsync -a`：它能排除不需要的目录、能续传、也能在出错时给出明确信息。**源路径结尾的 `/` 表示"复制目录里的内容"**，漏掉或写错会导致多套一层目录。

```bash
# 主世界：排除两个维度目录和锁文件，其余全部进入 world/
rsync -a --exclude 'DIM-1' --exclude 'DIM1' --exclude 'session.lock' \
  "/home/you/.minecraft/saves/MyWorld/" /opt/minecraft/server/world/

# 地狱与末地：分别进入各自的平级目录
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM-1/" /opt/minecraft/server/world_nether/
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM1/"  /opt/minecraft/server/world_the_end/
```

如果只有少量目录要搬，`cp -a` 更直观。`-a` 会保留时间戳、权限与符号链接：

```bash
# 逐项拷贝（哪个不存在就跳过哪个：例如从没去过末地就没有 DIM1）
cd "/home/you/.minecraft/saves/MyWorld"
cp -a level.dat level.dat_old region entities poi data datapacks \
      playerdata advancements stats /opt/minecraft/server/world/ 2>/dev/null

cp -a DIM-1/. /opt/minecraft/server/world_nether/
cp -a DIM1/.  /opt/minecraft/server/world_the_end/
```

Windows 上用 `robocopy`（注意：`robocopy` 的退出码 **0–7 都算成功**，`1` 表示"有文件被复制"，别把它当失败）：

```bat
robocopy "%APPDATA%\.minecraft\saves\MyWorld" "C:\mc\server\world" /E /XD DIM-1 DIM1 /XF session.lock
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM-1" "C:\mc\server\world_nether" /E
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM1"  "C:\mc\server\world_the_end" /E
```

复制完修正属主（Linux 下用独立用户跑服务端时必做，否则会出现 `Failed to save`）：

```bash
sudo chown -R minecraft:minecraft \
  /opt/minecraft/server/world \
  /opt/minecraft/server/world_nether \
  /opt/minecraft/server/world_the_end
```

:::tip 大存档先压缩再传，别在网络上慢慢拷
几十 GB 的 `region/` 逐文件通过网络传输会非常慢，而且中断一次就要重来。更稳的做法是先在源机器上打包（`tar -czf MyWorld.tar.gz MyWorld`，区块数据压缩率通常不错），传完再解开；`rsync -az --partial` 也能提供传输压缩与断点续传。
:::

### 5.4 修正 `level-name`

打开服务端的 `server.properties`，确认目录名与 `level-name` **完全一致**（Linux 区分大小写，`MyWorld` 与 `myworld` 是两个目录）：

```properties
level-name=world
```

### 5.5 启动并观察

```bash
sudo systemctl start minecraft
# 实时看启动过程，重点找存档相关的报错
tail -f /opt/minecraft/server/logs/latest.log
# 若用 systemd 托管，stdout 在 journal 里
journalctl -u minecraft.service -f
```

启动日志里要重点确认：没有 `Failed to load`、没有维度相关异常、`Preparing spawn area` 正常结束、没有 `No space left on device`。

### 5.6 进服验证

见第 10 节的验证清单。**先别急着把服务器开放给所有人**，用白名单只放一两个人进去确认无误。

### 5.7 正式迁移前先演练一次

如果这是重要的世界，**先在本地用另一个端口和一个临时 `level-name` 起一个测试实例**，把整套流程走一遍。演练能提前暴露目录名、版本、权限和 UUID 问题，而且完全不影响生产环境。

```properties
# 测试实例的 server.properties（放在与生产实例不同的目录里，避免互相干扰）
level-name=world_test
server-port=25566
online-mode=false
white-list=false
```

```bash
cd /opt/minecraft/testserver
java -Xms2G -Xmx2G -jar server.jar --nogui
```

演练通过之后，再对生产实例照做一遍；测试目录用完直接整个删掉即可。

## 6. `level.dat` 该不该动

`level.dat` 是世界的"身份证 + 设置表"，里面装着世界名、生成设置与种子、游戏规则、出生点、时间、难度，以及启用的数据包列表。它的内容是 **NBT 二进制**，通常还经过 gzip 压缩。

结论很简单：**不要手工编辑它。**

- 用文本编辑器打开会直接损坏文件；用 NBT 编辑器改也要面对版本差异（例如 26.1 起游戏规则、世界生成设置等已被拆到 `data/` 下）。
- 改错了的表现是世界直接无法加载，而 `level.dat_old` 不一定能救回来。
- **绝大多数想改的东西都有正规入口**：难度、游戏模式、视距、白名单走 `server.properties`；游戏规则、时间、天气、出生点、数据包走游戏内命令（`/gamerule`、`/time set`、`/weather clear`、`/setworldspawn`、`/datapack`）。
- 注意 `level-seed` **只在世界创建时生效**，已有世界的种子不能通过改配置更换。
- 需要"看一眼里面有什么"时，用 NBT 查看工具**只读**打开，并且先复制一份副本。

迁移场景下的正确做法是：**原样搬运 `level.dat`，不要在迁移过程中改它**；等世界跑起来、验证通过、备份到位之后，再通过配置和命令调整设置。

## 7. 数据包（`datapacks/`）

- 世界级数据包放在世界目录下的 `datapacks/`（单机是 `saves/<世界名>/datapacks/`，服务端是 `world/datapacks/`），它跟着世界一起走，复制世界时会一起搬过去。
- **已启用/已禁用的列表记录在 `level.dat` 里**，所以搬过去之后一般无需重新启用；用 `/datapack list` 确认，需要时用 `/datapack enable <名称>` / `/datapack disable <名称>`，改动后用 `/reload` 生效。
- **版本要匹配**：数据包声明了目标 `pack_format`，服务端版本不对时会被拒绝加载或给出警告。
- **添加维度的数据包要特别注意**：这类世界会有 `dimensions/<命名空间>/<路径>/` 目录，只有服务端也装了同一个数据包，那些维度才加载得出来。数据不会因此被删除，但玩家会进不去。
- 世界自带的资源包（老版本是 `resources.zip`，26.1 起在 `resourcepacks/` 下）不会自动发给玩家；要让玩家看到自定义材质，需要在 `server.properties` 里配置 `resource-pack`。

## 8. 模组存档、跨版本与基岩版

### 8.1 模组（Forge/NeoForge/Fabric）存档搬到插件端

这是仅次于目录名的第二大坑。**插件端（Spigot/Paper 等）不认识模组添加的方块、物品与实体。**

- 模组方块在世界里会变成未知方块（通常表现为空气、石头或占位方块）；这些区块**一旦被加载并重新保存，原始数据就可能被就地覆盖**，事后再装回模组也未必救得回来。
- 模组物品会从背包与容器中消失，模组实体（机器、生物）会被丢弃。
- 模组维度（`dimensions/<模组命名空间>/...`）在没有对应模组时无法加载。

正确做法：**先备份，再在一份丢弃式的副本上加载**，数一数日志里出现多少未知方块与注册表相关的报错；确认损失可接受再正式迁移。如果损失不可接受，就继续用模组端，或者干脆重新开荒。

### 8.2 跨版本

- **存档版本高于服务端**：服务端会拒绝加载（`DataVersion` 检查）。唯一安全的做法是升级服务端，而不是降级世界。
- **存档版本低于服务端**：服务端会通过数据修复（DataFixer）升级世界，通常是可行的，但**升级不可逆**：一旦被新版本加载过，旧版本就打不开了。所以升级前务必留一份没被动过的备份。
- 跨多个大版本时逐级升级更稳（例如先 1.20 再 1.21），每升一级都验证一遍，见 [版本更新](/tutorials/ops/updates)。

### 8.3 基岩版

Java 版世界与基岩版世界格式完全不同，**不能直接互相加载**，需要第三方转换工具，且转换通常有损（红石、实体、部分方块行为）。基岩版的服务端目录结构见 [BDS 服务端](/tutorials/bedrock/bds)。

## 9. 常见失败模式

| 现象 | 根本原因 | 处理 |
| --- | --- | --- |
| 进服是全新空世界 | 目录名与 `level-name` 不一致，或该目录里没有 `level.dat`，服务端于是**新建**了一个世界 | 停服，核对目录名；把旧目录改名留底，重新复制 |
| 世界能进，但地狱/末地是全新地形 | `DIM-1/`、`DIM1/` 没有搬到 `world_nether/`、`world_the_end/`，或搬错了层级（多套了一层目录） | 停服后重新复制到正确目录 |
| 世界能进，玩家却"从零开始" | 玩家数据文件名（UUID）与服务端认定的 UUID 不匹配 | 按第 4 节改名 `playerdata/`、`advancements/`、`stats/` |
| 服务端拒绝加载世界 | 存档版本（`DataVersion`）高于服务端版本 | 升级服务端；**不要**尝试降级世界 |
| 部分区块丢失、方块错乱 | 复制时服务端仍在运行，或磁盘写满 | 从备份重新复制；先解决磁盘空间 |
| 日志出现 `Failed to save` | 文件属主/权限不对，服务端用户写不进去 | `chown -R` 到服务端运行用户 |
| Linux 上"文件明明在，服务端却说没有" | 大小写不一致（`MyWorld` vs `myworld`） | 统一目录名与 `level-name` |
| 启动卡在 `Preparing spawn area` 很久 | 世界很大，首次加载需要时间；也可能是磁盘 I/O 瓶颈 | 耐心等待，观察 CPU/磁盘占用；不要反复重启 |
| 白名单/OP 失效 | `whitelist.json`、`ops.json` 不在世界里，需要重建 | 重新 `/whitelist add`、`/op`，或按正确 UUID 手工编辑 |
| 迁移后频繁卡顿 | 单机与服务器负载模型不同（视距、模拟距离、实体数量） | 调整 `view-distance`、`simulation-distance`，见 [优化](/tutorials/java/optimize) |

## 10. 验证清单

逐项确认，全部通过再对外开放：

| 检查项 | 方法 |
| --- | --- |
| 世界目录里有 `level.dat` | `ls -la /opt/minecraft/server/world/level.dat` |
| 区域文件数量与源一致 | 两侧各跑 `find world/region -name '*.mca' \| wc -l` 对比 |
| 三个世界的体积符合预期 | `du -sh /opt/minecraft/server/world*` |
| 启动日志无存档错误 | `grep -n -i "failed\|unknown dimension\|no space" logs/latest.log` |
| 种子一致 | 游戏内 `/seed`，与迁移前记录的值对比 |
| 时间与游戏规则一致 | `/time query daytime`、`/gamerule keepInventory` 等 |
| 出生点一致 | `/setworldspawn` 前先看当前出生点，与迁移前对比 |
| 关键建筑存在 | 传送到记录过的坐标目视确认 |
| 地狱一致 | `/execute in minecraft:the_nether run tp @s 0 64 0`，检查已知传送门与地形 |
| 末地一致 | 进入末地，检查末影龙状态、末地传送门与返回传送门 |
| 玩家进度回来了 | 检查背包、经验、进度界面与统计 |
| 权限与白名单正确 | `/whitelist list`、`/op` 检查 |
| 服务端能写盘 | `sudo -u minecraft test -w /opt/minecraft/server/world && echo writable` |
| 备份已经生效 | 立刻手工跑一次备份脚本，确认新世界已被纳入备份范围 |

## 11. 迁移之后

- **把 `online-mode`、白名单、正版验证定下来**，再开始积累玩家数据；中途切换认证模式会让 UUID 变化。
- **立刻做一次完整备份**，并把它送进异地/离线副本，见 [异地备份](/tutorials/ops/offsite-backup)。
- 按服务器负载重设 `view-distance`、`simulation-distance`、`max-players`，单机存档通常是在"单人视距"下生成的，搬到服务器后可能需要重新生成周边区块以适配更远的视距。
- 加上日志轮转与磁盘监控，避免刚搬来的大世界把磁盘写满，见 [日志管理与轮转](/tutorials/ops/logs) 与 [监控与告警](/tutorials/ops/monitoring)。
- **基岩版（BDS）另当别论**：Java 版世界与基岩版世界是两种完全不同的格式，不能互相直接加载，需要第三方转换工具，且转换通常有损。基岩版的服务端目录结构见 [BDS 服务端](/tutorials/bedrock/bds)。

## 12. 下一步

- 服务端目录与各文件的分工：见 [服务端结构](/tutorials/java/structure)。
- 各项配置项的含义与推荐值：见 [配置服务端](/tutorials/java/config)。
- 迁移完成后的备份与回档：见 [备份与恢复](/tutorials/java/backup)。
- 基岩版服务端：见 [BDS 服务端](/tutorials/bedrock/bds)。

> 具体路径与目录布局随游戏版本与核心而异，请以官方文档为准。
