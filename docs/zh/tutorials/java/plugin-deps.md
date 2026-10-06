---
title: 常用前置插件
slug: plugin-deps
cat: java
level: 2
order: 19
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, 前置, vault, placeholderapi, 权限]
updated: 2026-10-04
draft: false
---

装插件时最常见的翻车方式，不是下错了版本，而是**漏装了前置**：插件明明放进了 `plugins/`，`/plugins` 里却是红的，或者装上了但功能缺一块。

这篇讲清楚前置是什么、少了会怎样，以及 Vault、PlaceholderAPI、ProtocolLib、LuckPerms 这四个最常被依赖的插件各自干什么。

## 1. 什么是前置插件

插件之间是可以互相依赖的。作者在写插件时，如果不想重复造轮子，就会声明"我需要另一个插件提供的能力"，被需要的那个就是**前置（依赖，dependency）**。

依赖关系写在插件 jar 内的 `plugin.yml` 里，分两种：

| 声明 | 含义 | 缺了会怎样 |
| --- | --- | --- |
| `depend`（硬前置） | 没有它就没法工作 | 插件**加载失败**，`/plugins` 里显示红色 |
| `softdepend`（软前置） | 有它则启用额外功能，没有也能跑 | 插件正常加载，**相关功能静默关闭** |

服务端启动时会先加载前置、再加载依赖它的插件，这也是"前置必须装在前面"的原因。

:::note 任何插件都可以是前置
前置并不是一类特殊的插件。理论上任何一个插件都能被别的插件声明为依赖，只是下面这几个因为被依赖得太多，慢慢就有了"前置插件"这个统称。
:::

## 2. 少了前置会怎样

症状往往不像"报错"那么直白，认准这几种表现能省很多时间：

| 现象 | 说明 |
| --- | --- |
| `/plugins` 里显示红色 | 服务端认出了这个插件，但加载失败，控制台一定有原因 |
| 控制台报 `Unknown dependency` | 最明确的一种：`plugin.yml` 里声明的硬前置不在 `plugins/` |
| 控制台报 `ClassNotFoundException` / `NoClassDefFoundError` | 代码里引用了前置提供的类，但那个类不存在 |
| 插件装上了，某个功能却"没反应" | 多半是软前置缺失，功能被自动禁用 |
| 变量原样显示成 `%player_name%` | 没装 PlaceholderAPI，或对应的变量扩展没下载 |
| 经济相关指令提示找不到经济系统 | 装了 Vault，但没有真正提供经济的插件 |

:::warn 先看控制台，再猜
插件加载失败的原因一定写在启动日志里。**打开 `logs/latest.log`，搜索插件名**，比在群里描述"我的插件红了"快得多。
:::

## 3. 怎么判断一个插件需要前置

按可靠性从高到低：

1. **看插件发布页**。SpigotMC、Modrinth、Hangar、GitHub 的说明里通常会写 `Requires`、`Dependencies` 或"前置"一栏。
2. **看 jar 里的 `plugin.yml`**。用压缩软件打开 jar，找到 `plugin.yml`，里面 `depend` 与 `softdepend` 两行就是答案，最权威。
3. **看控制台报错**。启动时提示缺哪个，就去补哪个。
4. **看 `/plugins` 的颜色**。红色条目先怀疑前置，再怀疑版本不匹配。
5. **看插件文档或 issue 区**。作者通常会把依赖和版本要求写清楚。

## 4. Vault

**它是什么**：Vault 是一个面向 Bukkit 系服务端的**抽象库**。它自己不做任何具体功能，只是定义了一组接口，让"需要经济/权限/聊天能力的插件"和"真正实现这些能力的插件"能对上话。

**它不是经济插件**。这一点最容易误解：Vault 本身不产生任何货币，它只是一个统一接口。要真正有经济系统，你还得装一个经济插件（如 XConomy、EssentialsX 的经济模块、CMI），由它向 Vault 注册服务，其他插件再通过 Vault 存取余额。

| Vault 提供的接口 | 谁来实现 | 谁在调用 |
| --- | --- | --- |
| 经济（Economy） | 经济插件 | 商店、签到、抽奖等 |
| 权限（Permission） | 权限插件（如 LuckPerms） | 需要判断玩家权限的插件 |
| 聊天（Chat） | 聊天插件 | 需要发送/格式化聊天的插件 |

**谁需要它**：只要你的插件列表里出现"依赖 Vault"的条目，就装上。服主不需要配置 Vault 的任何东西，装上即可。

:::tip 版本标注可以忽略
Vault 同时支持旧版本和新版本的 Minecraft，不用在意 SpigotMC 页面上标的适用版本。
:::

## 5. PlaceholderAPI

**它是什么**：PlaceholderAPI（简称 PAPI）是一个变量占位符系统。它把形如 `%变量扩展_参数%` 的文本，替换成其他插件提供的信息。

```
%player_name%        玩家名
%player_level%       玩家等级
%vault_eco_balance%  玩家余额
%server_online%      在线人数
```

以 `%player_name%` 为例，`player` 是变量扩展名，`name` 是参数，意思是"取玩家名"。

**变量扩展**：PAPI 本体几乎不提供变量，变量由一个个**扩展**提供。扩展可以在游戏内从 eCloud 下载，目前有数百个，覆盖 EssentialsX、LuckPerms、Vault 等大量插件。

```
/papi ecloud download Player     下载 Player 扩展
/papi list                       查看已安装的扩展
/papi info <扩展名>               查看某个扩展提供哪些变量
/papi reload                     重载 PAPI 与扩展
```

**调试**：写完变量先在游戏里验一遍，别等玩家来报错。

```
/papi parse me %player_name%
```

这条指令会把解析结果直接返回给你，`me` 表示以自己为上下文。

**变量嵌套**：把一个变量的解析结果塞进另一个变量的参数时，内层用 `{}` 代替 `%%`：

```
%math_2_{player_health}%
```

上例需要 math 扩展，作用是把玩家血量保留两位小数。

**除了变量还能做什么**：部分扩展提供了超出"取值"的能力，例如 Math（数学运算）、CheckItem（判断玩家物品）、JavaScript（执行脚本）、Progress（生成进度条）。

**谁需要它**：TAB、记分板、全息图、菜单、聊天格式、MOTD 这类"要把别的插件的数据显示出来"的插件，基本都靠 PAPI。它是插件端最值得提前装好的插件之一。

## 6. ProtocolLib

**它是什么**：ProtocolLib 提供了对 Minecraft 网络协议（数据包）的底层访问能力，让插件可以拦截、修改或主动发送数据包，去做 Bukkit API 本身没有暴露的事情。

**谁需要它**：它是**给插件开发者用的**。作为服主，你不需要配置它任何东西——如果某个插件要求 ProtocolLib，装上就行。

| 项目 | 说明 |
| --- | --- |
| 需要配置吗 | 不需要，装上即用 |
| 版本选择 | 1.8 至 1.19.4 用 5.0.0；更高版本用最新版 |
| 常见配置 | `plugins/ProtocolLib/config.yml` 里可把 `auto updater.notify` 改为 `false` 关闭更新提示 |

:::warn 版本必须对得上
ProtocolLib 直接操作服务端内部实现，**版本不匹配时表现可能是整个服务端报错甚至崩溃**，而不是插件自己出问题。升级服务端核心时，记得同步检查它。
:::

## 7. LuckPerms

**它是什么**：LuckPerms 是目前最主流的**权限插件**，用来管理"谁能用什么指令、谁能进哪个世界、显示什么前缀"。它支持 Bukkit/Spigot/Paper、BungeeCord、Velocity、Sponge、Fabric 等多种平台。

**核心概念**：

| 概念 | 作用 |
| --- | --- |
| 权限节点（permission） | 最小单位，形如 `essentials.fly`，`true` 为允许、`false` 为拒绝 |
| 组（group） | 一组权限的集合，如 `default`、`vip`、`admin` |
| 继承（inheritance） | 组可以继承其他组，`admin` 继承 `vip` 就不必重复配置 |
| 上下文（context） | 让权限只在特定世界、服务器或模式下生效 |
| 前缀 / 后缀（meta） | 供聊天、TAB 等插件读取的显示信息 |

**常用指令**：

```
/lp user <玩家> permission set <节点> true
/lp group <组> permission set <节点> true
/lp group <组> parent add <父组>
/lp user <玩家> parent add <组>
/lp editor
```

`/lp editor` 会生成一个网页编辑器的链接，图形化改权限比敲指令直观得多，改完点保存即可生效。

**存储**：默认使用文件型存储（H2/SQLite），数据在 `plugins/LuckPerms/` 下。**多服共用一套权限时，必须换成 MySQL/MariaDB 之类的数据库**，否则每个服各管各的。

**它和 Vault 的关系**：LuckPerms 会向 Vault 注册权限服务，所以那些"通过 Vault 判断权限"的插件，装完 LuckPerms 就能正常工作，不需要额外配置。

:::note 前缀由谁显示
LuckPerms 只负责存前缀，**不负责把它显示出来**。真正让前缀出现在聊天栏或 TAB 里的，是聊天插件（如 TrChat、Carbon）或 TAB 类插件，它们读取 LuckPerms 里的 meta 信息。
:::

## 8. 安装顺序与搭配

前置要**先装、先重启**，再装依赖它的插件。一套常见的起步顺序：

| 顺序 | 插件 | 理由 |
| --- | --- | --- |
| 1 | LuckPerms | 权限是其他插件判断"能不能用"的基础 |
| 2 | 经济插件（XConomy / EssentialsX / CMI） | 给 Vault 提供真正的经济实现 |
| 3 | Vault | 让经济、权限、聊天有统一接口可用 |
| 4 | PlaceholderAPI | 装完再按需下载变量扩展 |
| 5 | ProtocolLib | 只在有插件明确要求时装 |
| 6 | 其他功能插件 | 商店、菜单、称号、TAB 等 |

:::tip 装完先验证再继续
每装一个前置就重启一次，确认 `/plugins` 里是绿色的。一次性把十几个插件全丢进去，出问题时排查成本会成倍上升。
:::

## 9. 排查清单

| 检查项 | 怎么确认 |
| --- | --- |
| 前置是否真的在 `plugins/` 里 | 看文件名与后缀是否为 `.jar` |
| 是不是硬前置缺失 | 控制台搜 `Unknown dependency` |
| 是不是软前置缺失 | 功能没反应但插件是绿的，翻插件文档确认它依赖谁 |
| 版本是否匹配 | 对照插件发布页写明的服务端版本与前置版本 |
| 变量不解析 | 确认装了 PAPI、下载了对应扩展，再用 `/papi parse me` 验证 |
| 经济不可用 | 确认装了 Vault **以及**一个真正的经济插件 |
| 权限不生效 | 用 `/lp user <玩家> permission check <节点>` 看判定结果 |
| 改完没生效 | 用插件自己的 reload 指令，或直接重启 |

## 下一步

前置装好后，接着就要改它们的配置了：见 [插件配置基础](/tutorials/java/plugin-config)。还没装过插件的话，从 [插件入门](/tutorials/java/plugins) 开始；权限的完整玩法可以配合 [常用服务端指令](/tutorials/java/commands) 一起看。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
