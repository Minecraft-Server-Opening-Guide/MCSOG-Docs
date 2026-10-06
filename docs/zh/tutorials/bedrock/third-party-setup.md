---
title: 基岩版第三方核心上手
slug: third-party-setup
cat: bedrock
level: 3
order: 6
minutes: 13
mc: ["1.21.x"]
tags: [基岩版, nukkit, powernukkitx, pocketmine, php, 上手]
updated: 2026-10-04
draft: false
---

[第三方核心（Nukkit / PNX / PMMP）](/tutorials/bedrock/third-party) 那一篇讲的是"选哪个"。这一篇讲"选完之后怎么让它跑起来"：要准备什么、目录长什么样、启动脚本怎么写、插件放哪里，以及最容易翻车的那一步——**核心构建版本与基岩版协议版本对不上**。

## 一、动手之前：先确认三件事

| 要确认的 | 说明 |
| --- | --- |
| **核心家族** | Nukkit 系是 **Java** 程序，PocketMine-MP 是 **PHP** 程序。选错家族，后面的运行环境全都要重来 |
| **运行环境** | Nukkit 系装 **Java**；PMMP 装 **PHP**。两者互不替代 |
| **版本对齐** | 核心构建必须**对得上你要连的基岩版协议版本**，否则客户端直接连不上 |

### Java 环境（Nukkit 系）

Nukkit 系和 Java 版服务端一样是 Java 程序，按 Java 版的思路装即可，见 [环境准备（Windows 与 Linux）](/tutorials/java/environment)。

两个要点：

- **版本要够**：新分支通常要求较新的 Java（常见是 Java 17 及以上），装太旧会直接启动失败，报错信息里一般会写清楚要求。
- **位数要对**：64 位系统配 64 位 Java。装成 32 位会因为内存上限在启动或运行中途崩掉。

### PHP 环境（PocketMine-MP）

PMMP 需要 **PHP**，而不是 Java。

:::tip 用 PMMP 打包的 PHP，别自己拼环境
PHP 官网提供的是**纯净版**，默认不带 PMMP 需要的那些扩展；自己逐个补依赖非常麻烦，而且版本一多就容易乱。**推荐直接下载 PMMP 官方为各系统打包好的 PHP 运行时**（在其 GitHub Releases 里按你的操作系统取对应文件），解压即用。
:::

:::warn 不要用系统自带的 PHP
Linux 发行版仓库里的 PHP 版本往往偏旧，Windows 上也可能装着别的软件留下的 PHP。先把 `php -v` 的输出确认一遍，确保你启动服务器时用的是**你打算用的那一个**。
:::

## 二、目录结构：Nukkit 系 vs PocketMine-MP

### Nukkit 系

首次启动后，根目录大致是这样（不同分支会略有差异）：

| 文件 / 目录 | 作用 |
| --- | --- |
| `nukkit-1.0-SNAPSHOT.jar` 一类 | **核心程序本体**，启动的就是它 |
| `start.bat` / `start.sh` / `start.command` | 启动脚本，分别对应 Windows / Linux / macOS |
| `server.properties` | 主要配置文件：服务器名、端口、最大人数、游戏模式等 |
| `permissions.yml` | 权限定义 |
| `ops.txt` | 管理员（OP）名单 |
| `whitelist.txt` | 白名单名单（在 `server.properties` 里开启白名单后才生效） |
| `banned-players.txt` / `banned-ips.txt` | 封禁的玩家与 IP |
| `rcon_password.txt` | RCON 远程控制密码 |
| `worlds/` | **世界存档总目录**，每个世界一个子文件夹 |
| `plugins/` | **插件目录**，放 `.jar` |
| `logs/` | 运行日志 |

世界目录 `worlds/<世界名>/` 内部：

| 文件 / 目录 | 内容 |
| --- | --- |
| `level.dat` | 世界的基本设定 |
| `region/` | **区块数据**（地形、建筑，体积最大） |
| `entities/` | 实体数据 |

:::warn 存档就备 `worlds/`
和 BDS 一样，基岩版的存档是**整体**的。备份时把整个 `worlds/` 一起拷走，别只挑 `region/`。
:::

### PocketMine-MP

PMMP 的目录思路类似，但文件形态不同：

| 文件 / 目录 | 作用 |
| --- | --- |
| `PocketMine-MP.phar` | **核心程序本体**（`.phar` 是 PHP 的打包格式） |
| PHP 运行时 | 启动器与 `php` 可执行文件；用官方打包版时就在同一目录下 |
| `start.bat` / `start.sh` | 启动脚本 |
| `server.properties` | 主要配置文件 |
| `pocketmine.yml` | PMMP 自身的配置 |
| `plugins/` | **插件目录**，放 `.phar` |
| `worlds/` | 世界存档总目录 |
| `players/` | 玩家数据 |
| `logs/` | 运行日志 |

### 两边对照

| | Nukkit 系 | PocketMine-MP |
| --- | --- | --- |
| 核心文件 | `.jar` | `.phar` |
| 运行环境 | Java | PHP |
| 插件扩展名 | `.jar` | `.phar` |
| 插件目录 | `plugins/` | `plugins/` |
| 世界目录 | `worlds/` | `worlds/` |
| 主配置 | `server.properties` | `server.properties` |
| 管理员名单 | `ops.txt` | 由核心配置与指令管理 |
| 世界内部结构 | `level.dat` + `region/` + `entities/` | `level.dat` + `region/` + `entities/` |

:::note 共同的坑：路径别带中文和空格
无论哪个核心，服务端目录都建议放在**纯英文、无空格**的路径下。中文路径在部分分支与面板上会导致世界或插件读取失败，报错还往往很难懂。
:::

## 三、启动服务端

### Nukkit 系

最小可用的启动命令就是一条 `java -jar`：

```bat
@echo off
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
pause
```

Linux / macOS 下等价写法：

```sh
#!/bin/sh
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
```

说明：

- `-Xms` 是初始堆内存，`-Xmx` 是最大堆内存；**两者建议设成同一个值**，避免运行中反复扩容。
- `-Xmx` 不要超过机器物理内存，否则系统会开始用交换分区，反而更卡。
- Windows 下 `.bat` 末尾加 `pause`，崩了之后窗口不会立刻消失，你才有机会看到报错。

### PocketMine-MP

```bat
@echo off
php PocketMine-MP.phar
pause
```

Linux / macOS 下：

```sh
#!/bin/sh
./bin/php7/bin/php PocketMine-MP.phar
```

说明：

- 具体路径取决于你用的是官方打包的 PHP 还是自己装的环境。**先用 `php -v` 确认能调到**，再写进脚本。
- 内存上限不靠命令行参数，而是在 `pocketmine.yml` 与 `server.properties` 里配置。

:::tip 首次启动看什么
第一次启动会生成配置文件与世界。启动完成后注意两件事：**控制台有没有报错**，以及**目录里有没有真的多出 `plugins/` 和 `worlds/`**。如果目录没生成，说明核心没跑起来，别急着装插件。
:::

:::warn 内存别一次给满
新服还没人，先把 `-Xmx` 设小一点（比如 2G），等玩家上来了再调。一次给到物理内存的上限，会让系统和核心抢内存。
:::

## 四、插件放哪、怎么加载

1. 从插件的发布页下载对应版本的文件：Nukkit 系要 `.jar`，PMMP 要 `.phar`。
2. 放进服务端根目录的 `plugins/`。
3. **重启服务端**。
4. 看控制台输出，确认插件被加载、没有报错。
5. 有些插件首次加载后会生成自己的配置目录 `plugins/插件名/`，改完配置再重启一次。

关于重载：

- 大多数插件支持一条重载指令，但**重载不等于重启**。改了核心配置、换了插件版本、或者插件之间互相注册了事件时，重载经常留下旧状态，出现"明明改了却没生效"甚至直接报错。
- 结论：**改配置可以重载，装/删/换插件一律重启**。

:::warn 别把 Java 版插件塞进来
Nukkit 系的 `.jar` 与 Java 版（Paper / Spigot）的 `.jar` 是两套完全不同的东西，**互不通用**。从插件站下载时先确认它标注的是 Nukkit / PNX 还是 Paper，装错了核心通常只会报一句"无效的插件文件"。
:::

## 五、最容易翻车的一步：版本对齐

这是基岩版比 Java 版严格得多的地方，单独拎出来讲。

基岩版客户端**自动更新**，玩家没法像 Java 版那样留在旧版本。所以：

- 你的核心构建必须**支持当前基岩版的协议版本**，否则玩家会看到"过旧的服务器"一类的提示，直接连不上。
- 核心版本对了，插件还要对：插件是跟着核心的 API 走的，**核心一升级，旧插件可能立刻失效**。
- 因此第三方核心的升级是**成套**的：核心 + 插件 + 配置一起换，不能只换其中一样。

排查连不上的顺序：

| 现象 | 先查什么 |
| --- | --- |
| 提示服务器版本过旧 | 核心构建是否支持当前基岩版协议 |
| 客户端卡在"正在连接" | 端口是否开放、`server.properties` 里的端口与转发是否一致 |
| 能进服但插件没反应 | 插件是否加载、版本是否匹配核心 |
| 进服后立刻被踢 | 白名单是否开启、是否被 `banned-*` 记录 |

:::tip 升级前先备份
第三方核心的**存档兼容性不如官方 BDS**。换核心或升级大版本前，先把整个 `worlds/` 和 `plugins/` 里的配置备份出来，见 [备份与恢复](/tutorials/java/backup)。
:::

## 六、上手检查清单

- [ ] 运行环境装好并能在命令行调用（`java -version` / `php -v`）
- [ ] 核心构建与目标基岩版协议版本一致
- [ ] 目录路径为纯英文、无空格
- [ ] 启动脚本内存参数合理
- [ ] 首次启动生成 `plugins/` 与 `worlds/`，控制台无报错
- [ ] 插件扩展名与核心家族匹配
- [ ] `worlds/` 已纳入备份计划

## 下一步

- 目录与文件细节：见 [BDS 服务端](/tutorials/bedrock/bds)
- 协议与版本关系：见 [基岩版协议与版本](/tutorials/bedrock/protocol)
- 回到选型：见 [基岩版核心选择](/tutorials/bedrock/cores)

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
