---
title: 服务端、插件与 MCDR 的更新维护
slug: updates
cat: ops
level: 3
order: 13
minutes: 18
tags: [ops, updates, upgrade, rollback, backup, plugins, mcdr, maintenance]
updated: 2026-10-04
draft: false
---

"更新"是运维里最像日常、也最容易出事故的动作。装插件失败最多是少个功能，**更新失败可能直接让存档打不开**。这一篇把服务端核心、插件、模组与 MCDR 的更新流程串成一套可复用的做法，重点不是"点下一步"，而是**每一步留下的退路**。

开始之前建议先读两篇：[备份与恢复](/tutorials/java/backup)（更新前必须先会备份与恢复）、[服务端结构](/tutorials/java/structure)（清楚自己要动的到底是哪些文件）。

## 1. 更新的铁律

下面六条按重要性排序。**任何一条跳过，都可能把"十分钟的更新"变成"一整天的抢救"。**

### 1.1 先备份，并且验证备份

备份不是"打个包就完事"，必须确认它**真的可用**：文件存在、体积合理、能列出内容，最好能在测试目录里真正解开一次。

```bash
# Linux：确认归档存在、体积合理、能列出内容
ls -lh /opt/mcserver/backups/world-20261004.tar.gz
tar -tzf /opt/mcserver/backups/world-20261004.tar.gz | head
```

```powershell
# Windows：解到临时目录，确认内容完整
Get-Item C:\mcserver\backups\world-20261004.zip | Select-Object Name, Length, LastWriteTime
Expand-Archive -Path C:\mcserver\backups\world-20261004.zip -DestinationPath C:\mcserver\verify -Force
Get-ChildItem C:\mcserver\verify | Select-Object Name
```

:::warn 没有验证过的备份不算备份
"备份脚本其实早就失败了""包是空的""只拷了 `db/` 没拷 `level.dat`"——这些都是在真出事那天才发现的。**至少每月真正恢复一次**，流程见 [备份与恢复](/tutorials/java/backup)。
:::

### 1.2 读更新日志

更新日志里要找的是四件事，而不是版本号好不好看：

| 要找什么 | 为什么重要 |
| --- | --- |
| **破坏性变更** | 配置键改名、指令改名、数据格式变化，会直接让现有配置失效 |
| **新的最低要求** | 服务端与插件的 Java 版本、加载器版本、依赖插件版本 |
| **数据迁移说明** | 是否需要手动执行迁移命令，是否需要先升到某个中间版本 |
| **已知问题** | 作者已经承认的 bug，能让你避开一个刚发布的坏版本 |

### 1.3 在独立实例里先试

准备一份"测试实例"：另一个目录、另一份端口、另一份世界副本。**所有更新先在测试实例里跑通，再动生产服。**

```bash
# Linux：用备份直接铺一个测试实例
mkdir -p /opt/mcserver/test
tar -xzf /opt/mcserver/backups/full-20261004.tar.gz -C /opt/mcserver/test
```

```powershell
# Windows：同理
New-Item -ItemType Directory -Force -Path C:\mcserver\test
Expand-Archive -Path C:\mcserver\backups\full-20261004.zip -DestinationPath C:\mcserver\test -Force
```

测试实例里要把端口改掉（`server.properties` 的 `server-port`），否则会和正在跑的服务端抢同一个端口。

### 1.4 挑维护窗口

挑玩家最少的时段（通常是凌晨或工作日上午），避开比赛与开荒等活动，**预留两倍时间**，并确认出问题时你自己在场——有人盯着控制台，才可能及时回滚。

### 1.5 永远留回滚路径

**核心原则：任何被替换掉的文件，都要以带版本号的名字留下来。**

```text
server-1.21.1.jar            # 旧核心，随时能换回来
MyPlugin-1.0.0.jar.bak       # 旧插件
world-20261004/              # 更新前的世界备份
config.yml.20261004.bak      # 更新前的配置
```

:::tip 回滚路径要在更新前就想好
更新前先问自己一句："如果十分钟后我要退回去，具体敲哪几条命令？"**答不上来就先别更新。**
:::

### 1.6 提前公告停机

在群里、公告栏、服务器 MOTD 里说明：几点开始、预计多久、会更新什么、出问题怎么办。玩家最反感的不是停机，而是**不知道为什么进不去、也不知道要等多久**。

### 1.7 可能出问题的情况

| 风险 | 典型表现 | 后果 | 预防 |
| --- | --- | --- | --- |
| 世界被新版本改写 | 新版本启动过一次，再换回旧核心时存档报错或无法加载 | **不可逆**，只能回档到备份 | 首次用新版本启动前做完整备份，并保留旧核心与旧目录 |
| Java 版本不符 | 启动即崩，日志出现 `UnsupportedClassVersionError` | 服务起不来 | 按第 2.2 节的表格对齐 Java |
| 插件与新核心不兼容 | `/plugins` 出现红字，或控制台刷 `NoSuchMethodError` | 功能缺失，甚至无法启动 | 先看插件的支持版本与更新日志，先在测试实例试 |
| 配置键被改名或删除 | 插件重新生成默认配置，原有设置"消失" | 功能按默认值运行，影响玩家 | 更新前备份配置目录，更新后逐项对照 |
| 模组与加载器不匹配 | 启动崩溃，日志列出某个模组名与类错误 | 模组端完全起不来 | 加载器、游戏版本、模组三者一起对齐 |
| 基岩版协议不匹配 | 更新服务端后玩家进不来，提示需更新客户端 | 玩家流失，iOS 玩家无法降级 | 更新前确认玩家客户端能跟上 |
| 下载到被篡改的文件 | 核心或插件能跑但行为异常 | 安全事件 | 只从官方或官方认可的发布页下载 |
| 维护窗口估错 | 玩家已经在群里问"怎么还进不去" | 口碑与信任受损 | 预留两倍时间，提前公告 |
| 磁盘写满 | 解压失败，或存档写不进去 | 存档损坏 | 更新前确认可用空间 |
| 权限与属主变化 | Linux 下新文件属主是 root，服务端用户写不进去 | 插件配置无法保存 | 更新后 `chown -R` 回服务端专用用户 |

## 2. 服务端核心的更新

### 2.1 通用流程

1. **停服**。在控制台执行 `stop`，等它正常退出，**不要直接杀进程**。
2. **记录当前版本**（核心版本号、构建号、启动脚本里的 jar 文件名）。
3. **旧核心改名留底**，加上版本后缀。
4. **从官方来源下载新核心**，不要用第三方整合包里的 jar。
5. **放入新核心**，文件名与启动脚本保持一致（否则脚本会找不到文件；启动脚本的写法见 [开启服务端](/tutorials/java/start)）。
6. **启动并盯住控制台**，不要启动完就走开。
7. **验证**：控制台无报错、`/plugins` 正常、自己进服走一圈，并**观察一段时间**再决定是否删除旧 jar。

```text
stop
```

```bash
# Linux
cd /opt/mcserver/survival
mv server.jar server-1.21.1.jar                 # 旧核心改名留底
cp ~/downloads/server-1.21.4.jar ./server.jar   # 换成官方下载页给的文件
./start.sh
```

```powershell
# Windows
Set-Location C:\mcserver\survival
Rename-Item server.jar server-1.21.1.jar
Copy-Item "$env:USERPROFILE\Downloads\server-1.21.4.jar" .\server.jar
.\start.bat
```

进服后的验证动作：

```text
/version        查看服务端版本
/plugins        查看插件加载状态（红色为加载失败）
```

:::tip 旧核心先别删
至少留到"新版本跑满一个维护周期且世界一切正常"之后。一个 jar 几百 MB，换来的是随时能退回去。
:::

### 2.2 版本跳跃不是免费的：先对齐 Java

**Java 版本不匹配时服务端启动即崩**，日志里会出现 `UnsupportedClassVersionError`。下表与 [环境准备（Windows 与 Linux）](/tutorials/java/environment) 保持一致，直接复用：

| Minecraft Java 版 | 官方要求的 Java | 说明 |
| --- | --- | --- |
| 26.1 及以后 | **Java 25** | 最新要求（26.1 起） |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 是最早要求 21 的正式版 |
| 1.18 – 1.20.4 | **Java 17** | 目前最常用的组合 |
| 1.17 – 1.17.1 | **Java 16** | Java 17 也可以正常启动 |
| 1.12 – 1.16.5 | **Java 8** | 大量老整合包仍停留在这一档 |
| 1.7.10 及更早 | 官方要求较低 | 实际普遍使用 Java 8 |

:::note 上表来源
1.20.5 / 1.18 / 1.17 / 1.12 等分界取自 Mojang 官方版本清单（`piston-meta.mojang.com` 每个版本的 `javaVersion.majorVersion` 字段）；26.1 起要求 Java 25 取自 Minecraft Wiki 的版本要求列表。非经验推测。
:::

- **Paper、Purpur、Spigot、Fabric、Forge 的要求与官方一致**：1.20.5 以上需要 Java 21，1.18 – 1.20.4 需要 Java 17。
- 上表是**最低要求**，Java 版本过高时部分插件与模组可能不兼容，**建议与要求严格对齐**。
- **基岩版（BDS）不需要 Java**，它是 C++ 程序，直接运行 `bedrock_server`（Windows 下为 `bedrock_server.exe`）。

**跨多个大版本时不要一步跳过去。** 中间版本可能改变了配置格式、世界格式与插件 API，必要时逐版本升级（例如 1.19 → 1.20 → 1.21），每次升完都验证一遍。

### 2.3 世界格式：升级基本是单行道

:::warn 被新版本打开过的世界，不保证能在旧版本打开
用新版本启动过服务端之后，世界里的区块与实体数据可能已经**按新格式改写**。把核心换回旧版本时，轻则报错刷屏，重则**世界无法加载**。这是单向的，没有"转换回旧格式"的官方工具。
:::

因此：

- 首次用新版本启动之前，**做一次完整备份**（`world/`、`world_nether/`、`world_the_end/`，自定义世界名以 `server.properties` 的 `level-name` 为准）。
- 回退时**连世界一起回退**：换回旧核心的**同时**，用更新前的备份覆盖世界，而不是只把 jar 换回去。
- 想先验证兼容性，就在测试实例里跑新版本，**不要拿生产世界试**。

### 2.4 Paper / Purpur / Leaves / Leaf

这一批核心的更新方式完全一致：**替换 jar**。它们与官方原版共享同一套世界格式，所以第 2.3 节的结论同样适用。

需要注意的只有配置：

| 情况 | 说明 |
| --- | --- |
| 配置新增键 | 首次启动时核心会把缺失的键**写成默认值**追加进配置文件 |
| 配置删除或改名 | 旧键可能被保留但不再生效，也可能被忽略；行为可能悄悄变化 |
| 构建号变化 | 同一游戏版本的不同构建也可能引入行为变化，读一下构建日志 |

做法：更新前把整个服务端目录（至少是各 `*.yml`）复制一份，更新后对比差异。

```bash
# Linux：对比更新前后的配置
diff -u paper-global.yml.bak paper-global.yml
```

```powershell
# Windows：对比更新前后的配置
Compare-Object (Get-Content .\paper-global.yml.bak) (Get-Content .\paper-global.yml)
```

:::tip 官方来源
Paper 见 <https://papermc.io/>，Purpur 见 <https://purpurmc.org/>。Leaves、Leaf 等核心请以各自官方发布页为准，**不要用聚合站或网盘里的 jar**。
:::

### 2.5 Fabric / Forge / NeoForge

模组端比插件端"卡"得更死：**加载器版本、游戏版本、每一个模组，三者必须相互匹配**。

| 组件 | 必须匹配什么 | 不匹配的症状 |
| --- | --- | --- |
| 加载器（Fabric / Forge / NeoForge） | 与游戏版本绑定，只支持特定版本区间 | 加载器装不上，或服务端起不来 |
| 每个模组 | 与游戏版本、加载器版本、以及它依赖的其他模组匹配 | 启动崩溃，日志列出模组名与类错误 |
| 服务端与客户端模组 | 需要双方都装的模组必须一致 | 玩家进不来，或进服后立即被踢 |

**加载器升级通常要求模组一起更新**：模组是针对特定版本的加载器 API 编译的。典型失败症状是**启动即崩**，日志里能看到模组名配合类错误，例如 `NoClassDefFoundError`、`ClassNotFoundException`、`NoSuchMethodError`；Forge 系还会直接提示缺少必需依赖（`Missing or unsupported mandatory dependencies`），客户端可能提示模组集合不兼容。

建议的更新顺序：

1. 先确认目标游戏版本已有可用的加载器版本。
2. 在测试实例里升级加载器，确认能起得来（此时模组可以先全部移走）。
3. 分批放回模组（每批更新完启动一次，便于定位是哪个模组出问题），最后把服务端与客户端一起更新，模组清单两边对齐。

### 2.6 基岩版 BDS

基岩版的版本约束和 Java 版不同：**客户端协议必须与服务端构建匹配**，协议一变，旧客户端直接连不上（原理见 [协议版本与版本选择](/tutorials/bedrock/protocol)）。

| 要点 | 说明 |
| --- | --- |
| 客户端协议 | 更新服务端后，玩家必须使用匹配版本的客户端；不匹配时提示需要更新 |
| iOS 限制 | iOS 玩家**只能安装商店里的最新版本**，无法安装指定的旧版本。所以"固定旧版本"等于放弃 iOS 玩家 |
| 存档位置 | BDS 的存档全在 `worlds/` 下，**更新前必须整体备份** |
| 配置文件 | `server.properties`、`allowlist.json`、`permissions.json`、`valid_known_packs.json` 都是你的数据，不能被新包覆盖 |

更新步骤：从官方下载页取对应平台的压缩包，**解压到临时目录**，只取可执行文件放进原目录。

```bash
# Linux：解压到临时目录，只替换二进制（文件名换成实际的版本号）
unzip bedrock-server-new.zip -d /tmp/bds-new
mv bedrock_server bedrock_server-old
cp /tmp/bds-new/bedrock_server .
chmod +x bedrock_server
```

```powershell
# Windows：同理（压缩包里还有配套 DLL，不要漏拷）
Expand-Archive -Path "$env:USERPROFILE\Downloads\bedrock-server-new.zip" -DestinationPath C:\bds-new -Force
Rename-Item .\bedrock_server.exe bedrock_server-old.exe
Copy-Item C:\bds-new\bedrock_server.exe .
```

:::warn 不要整包解压覆盖上去
官方压缩包里也带一份默认的 `server.properties`、`allowlist.json`、`permissions.json` 等文件。**整包覆盖会覆盖你的配置与白名单。** 只取程序文件，数据与配置保持原样，并确认 `worlds/` 没有被替换。
:::

目录结构与加载器的版本约束见 [BDS 服务端](/tutorials/bedrock/bds)：第三方加载器同样只支持特定版本区间，**升级服务端前先确认加载器已跟进**。

### 2.7 降级：最常见的人为数据损失

:::warn 世界被新版打开过之后，降级核心等于数据损失
"更新完发现插件不兼容，赶紧把旧核心换回来"是运维里最常见的自伤操作。**核心能换回去，世界不一定。**
正确做法是：回退核心的**同时**，用更新前的完整备份把世界一起回退；只换 jar 不换世界，很可能换来一个打不开的存档。
:::

如果更新后确实要降级，顺序是：

1. 停服。
2. 把**当前**（被新版改写过的）世界目录改名留底，不要直接删——它是排查问题的证据。
3. 解压更新前的世界备份，放回原位。
4. 换回旧核心 jar。
5. 启动，检查日志与存档。
6. 让玩家确认关键建筑与物品正常。

## 3. 插件的更新

插件更新比核心更新更频繁，也更容易因为**配置结构变化**而出问题。基础操作见 [插件入门](/tutorials/java/plugins)。

### 3.1 更新前检查四件事

| 检查项 | 去哪里看 | 不看会怎样 |
| --- | --- | --- |
| 支持的服务端版本 | 插件发布页的兼容版本列表 | 加载失败，`/plugins` 红字 |
| 支持的 Java 版本 | 插件发布页或更新日志 | 加载时报类版本错误 |
| 前置依赖是否齐备、版本是否够新 | 插件说明里的 Requires / Dependencies，见 [常用前置插件](/tutorials/java/plugin-deps) | 硬前置缺失时插件直接加载失败 |
| 更新日志里的破坏性变更 | 发布页的 changelog / release notes | 配置失效、数据未迁移 |

最常被依赖的几个前置是 **Vault、PlaceholderAPI、ProtocolLib、LuckPerms**：它们被大量插件当作硬前置或软前置，更新前先确认它们在位并且版本满足要求。

### 3.2 流程

1. **停服**（或明确接受热重载的能力边界，见 3.5）。
2. **备份** `plugins/<插件名>/` 目录；涉及数据库的插件，连数据库一起备份。
3. **旧 jar 改名留底**，加上版本号。
4. **放入新 jar**。
5. **启动，看控制台**。
6. **`/plugins` 确认状态**（红色表示插件被识别但加载失败），再**测试插件自己的命令**确认功能真的可用。

```powershell
# Windows
Set-Location C:\mcserver\survival\plugins
Rename-Item MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
Copy-Item "$env:USERPROFILE\Downloads\MyPlugin-1.1.0.jar" .
```

```bash
# Linux
cd /opt/mcserver/survival/plugins
mv MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
cp ~/downloads/MyPlugin-1.1.0.jar .
```

```text
/plugins
```

:::note 红色条目先看控制台
加载失败的原因一定打印在控制台与 `logs/latest.log` 里。**打开日志搜索插件名**，比在群里描述"我的插件红了"快得多。
:::

### 3.3 配置迁移

| 情况 | 建议做法 |
| --- | --- |
| 只是新增了配置项 | 让插件自己生成默认值即可，通常不需要干预 |
| 配置键被改名或重构 | **保留旧配置副本**，对照更新日志逐项搬运 |
| 配置被拆成多个文件 | 同样保留旧文件，按官方说明迁移 |
| 数据需要迁移（数据库、玩家数据） | 按官方迁移说明执行，**先备份数据库** |

:::tip 让插件先重新生成默认配置
比起手工合并两份 YAML，更稳的顺序是：**先让新版本自己生成一份完整的默认配置**，再对照旧配置把自己的值逐项填回去。手工合并很容易在缩进、重复键、类型（字符串与数字）上出错，而 YAML 的报错信息通常很难懂。
:::

### 3.4 依赖优先：先更新前置

**先更新前置，再更新依赖它的插件。** 反过来做，会出现"前置的接口已经变了，上层插件还在调用旧接口"的 `NoSuchMethodError` / `NoClassDefFoundError`。

同理，如果某个插件被多个插件当作前置，它的一次更新可能同时影响好几个插件，更新后要把相关功能都点一遍。

### 3.5 插件管理器：能做什么，不能做什么

PlugManX、ServerUtils 这类"插件管理插件"可以在服务端运行中加载、卸载、重载其他插件。它们的**能力边界**很明确：

| 情况 | 能否靠热重载解决 |
| --- | --- |
| 只是改了配置 | 用插件自带的 `reload` 即可 |
| 临时禁用出问题的插件 | 可以，这是热重载最有价值的用法 |
| 换插件版本（换 jar） | 不建议，应当停服替换 |
| 插件注册了指令、权限、监听器、配方、世界生成器 | 卸载后常留残留，重载容易出错 |
| 插件持有数据库连接、线程池或大量静态缓存 | 卸载后资源往往不释放 |
| 反复加载卸载同一个插件 | 类加载器无法回收，内存持续上涨 |
| 模组端 | 插件管理器管不了模组 |
| 服务端原版 `/reload` | 不推荐，容易让插件状态错乱 |

:::warn 生产服不要只靠热重载
热重载适合"临时关掉一个插件看问题是否消失"和快速试配置。**正式的版本更新、依赖变更，仍然应该走停服重启的流程。** 更详细的排毒流程见 [插件管理与排毒](/tutorials/java/plugin-manage)。
:::

### 3.6 只从官方来源下载

:::warn 非官方转载的 jar 不要用
聚合下载站、网盘、群文件里的"汉化版""破解版""整合版"插件，很可能被重新打包过。**文件名与版本号一样，内容可能已经不同。**
优先使用官方发布页：SpigotMC、Modrinth、Hangar、作者自己的 GitHub Releases。有提供哈希就核对哈希；付费插件请走官方购买页。
:::

## 4. MCDR 的更新

MCDR（MCDReforged）是包在服务端核心外面的管理器，用 Python 3 编写。更新它**不会动你的服务端核心与世界**，风险主要落在**它自己的配置与 Python 插件**上。基础概念见 [MCDR 服务端管理器](/tutorials/java/mcdr)。

### 4.1 安装方式：用 pip，不要用源码 zip

MCDR 已发布到 PyPI，官方文档给出的安装方式是 pip：

```bash
# Windows
pip install mcdreforged

# Linux
pip3 install mcdreforged
```

:::warn 不要下载源码 zip 来运行
网上不少教程让你去 GitHub 下载压缩包解压使用——**官方文档明确说明那是过时做法**。MCDR 自 2021 年初的 v1.0 起就不再使用源码安装。除非你是 MCDR 的开发者并且清楚在做什么，否则请用 pip 安装。
:::

### 4.2 Python 版本要求

官方文档给出的对应关系：

| MCDR 版本 | Python 依赖 |
| --- | --- |
| < 2.10 | >= 3.6 |
| >= 2.10 | >= 3.8 |
| >= 2.15 | **>= 3.9** |

升级 MCDR 之前先确认你的 Python 版本满足目标版本的要求；如果系统 Python 太旧，需要先升级 Python（或改用官方文档推荐的隔离环境方式）。

### 4.3 更新命令

**用运行 MCDR 的那个解释器去升级**，具体命令取决于当初是怎么装的：

```bash
# 全局 pip（Windows，-U 即 --upgrade）
pip install mcdreforged -U

# 全局 pip（Linux）
pip3 install mcdreforged -U

# pipx 管理的隔离环境
pipx upgrade mcdreforged

# 虚拟环境：先激活，再升级
# source venv/bin/activate        （POSIX）
# venv\Scripts\Activate.ps1       （Windows PowerShell）
pip install mcdreforged -U
```

验证版本，输出形如 `MCDReforged v2.16.0`：

```bash
mcdreforged -V
```

:::warn 升级的可能不是 MCDR 正在用的那一份
系统里同时存在系统 Python、虚拟环境、pipx 环境时，`pip install -U` 升级的未必是 MCDR 实际使用的那一份——**升完 `mcdreforged -V` 还是旧版本号，通常就是这个原因**。先确认 MCDR 是怎么启动的（哪个解释器、哪个环境），再在那个环境里升级。
:::

:::note 其他安装方式
- **pipx**：用 `pipx upgrade mcdreforged` 升级；给它装 Python 依赖要用 `pipx inject mcdreforged <包名>`。
- **Docker**：按官方镜像文档更换镜像标签，具体写法以官方文档的 Docker 章节为准。
- **国内网络**：可以在命令里加 `-i https://pypi.tuna.tsinghua.edu.cn/simple` 使用镜像加速，这是官方文档给出的做法。
- **系统包管理器**：官方文档**非常不建议**用它安装 MCDR，因为很难管理插件依赖。
:::

### 4.4 大版本升级前先读迁移指引

官方文档有独立的「迁移指引」章节，包含 **0.x 至 1.x** 与 **1.x 至 2.x** 两部分。

大版本升级可能改变配置文件格式（旧 `config.yml` 里的选项被改名或废弃）、插件 API（依赖旧 API 的 MCDR 插件可能加载失败或行为异常），以及命令与命令行接口（启动参数、子命令可能调整）。**所以升级 MCDR 往往意味着也要更新 MCDR 插件。** 升级前读一遍对应的迁移文档，按其中的步骤执行，不要凭记忆照抄旧教程。

### 4.5 升级前备份什么

| 内容 | 位置 |
| --- | --- |
| MCDR 自己的配置 | `config.yml`，位于 **MCDR 的工作目录** |
| MCDR 的插件 | 默认在 `plugins/`，实际以配置项 `plugin_directories` 为准 |
| 权限文件与日志 | 排查问题时有用，建议一并留档 |

:::note MCDR 会自己补配置项
官方文档说明：启动时 MCDR 会加载 `config.yml`，并把**缺失的选项追加**到配置文件末尾；如果配置文件不存在，则生成默认配置并退出。所以升级后配置里多出新键是正常现象——但**不要**因此认为旧配置一定被正确迁移了，仍要对照迁移指引与更新日志。
:::

MCDR 还有 `check_update` 配置项（默认 `true`），会每 24 小时检测一次更新；运行中可以用 `!!MCDR reload config`（缩写 `!!MCDR r cfg`）重载配置。**插件兼容性才是升级 MCDR 的主要风险**，不是 MCDR 本身。

### 4.6 回滚

出问题时可以把 MCDR 固定回上一个版本：

```bash
# 先到 PyPI 的 mcdreforged 项目页确认要回退到的具体版本号
pip install mcdreforged==2.15.0
mcdreforged -V
```

- **版本号务必在 PyPI 上确认**，不要凭记忆写；pipx 环境可以用 `pipx install --force mcdreforged==<版本>` 覆盖安装（具体写法以 pipx 官方文档为准）。
- 如果升级时同时更新了 MCDR 插件，**插件也要一起回滚**，否则新插件配旧 MCDR 一样会出错。

## 5. 更新检查清单

| 更新对象 | 更新前 | 更新后验证 | 回滚方式 |
| --- | --- | --- | --- |
| **服务端核心** | 完整备份（世界 + 配置 + 插件）；确认目标版本要求的 Java；把旧 jar 改名留底；读更新日志 | 控制台无报错；`/plugins` 正常；`/version` 正确；自己进服走一圈；观察 10 到 30 分钟 | 停服，换回旧 jar；若新版本已启动过，**连世界一起用备份回退** |
| **插件** | 备份 `plugins/<插件名>/` 与数据库；确认支持的服务端版本、Java 版本与前置依赖；读更新日志的破坏性变更 | `/plugins` 无红字；控制台无 `NoSuchMethodError` 等异常；插件自身命令可用；相关功能点一遍 | 停服，把旧 `.jar.bak` 改回原名；配置一并回退到旧副本 |
| **模组与加载器** | 备份 `mods/` 与 `config/`；确认加载器支持目标游戏版本；列出每个模组的目标版本 | 启动无崩溃；日志无模组类错误；客户端能进服且无缺失模组提示 | 换回旧加载器与旧 `mods/` 目录；客户端同步回退 |
| **MCDR** | 记录当前版本（`mcdreforged -V`）；备份 `config.yml` 与插件目录；大版本先读迁移指引 | `mcdreforged -V` 显示新版本；MCDR 能正常启动并拉起服务端；MCDR 插件加载正常 | `pip install mcdreforged==<旧版本>`（版本号以 PyPI 为准）；MCDR 插件同步回滚 |
| **操作系统软件包** | 记录当前版本；确认不在维护窗口；有条件先做系统快照或镜像 | 重启后服务端能自动起来；**确认 Java 没有被顺带升级**；端口与防火墙规则未变 | 用发行版的版本回退或系统快照；必要时把 Java 包锁定（例如 `apt-mark hold`） |

### 维护节奏建议

**每月一次**例行检查核心、插件、模组、MCDR 与系统包；**安全相关的优先**（登录验证、权限、反作弊有修复就尽快跟）；**非必要不更新**——稳定运行且没有安全问题的版本可以不动，更新的收益要大于它带来的风险；每次更新**留档记录**（什么时候、从哪个版本到哪个版本、谁做的、有没有回滚），下次出问题能快速回溯。

## 下一步

- 更新前必须会的备份与恢复：[备份与恢复](/tutorials/java/backup)
- 备份要送出去一份：[异地备份](/tutorials/ops/offsite-backup)
- 插件装卸与排毒：[插件管理与排毒](/tutorials/java/plugin-manage)
- 更新完核心后适配插件与配置：[插件配置](/tutorials/java/plugin-config)
- 基岩版服务端与协议：[BDS 服务端](/tutorials/bedrock/bds)

> 各软件的更新方式以官方文档为准。
