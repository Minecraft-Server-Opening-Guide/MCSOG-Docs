---
title: 常用服务端指令
slug: commands
cat: java
level: 1
order: 9
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 指令, 命令, op, ban, whitelist, 控制台]
updated: 2026-10-04
draft: false
---

日常管理服务器，来来回回就是这些指令。**在服务端控制台里执行不需要加 `/`**，在游戏内聊天框里执行要加 `/`。

## 一、开关与保存

| 指令 | 作用 |
| --- | --- |
| `stop` | **安全关闭**服务器（先保存再退出）。**永远用它关服，不要直接叉窗口** |
| `save-all` | 立即保存全部世界数据 |
| `save-off` / `save-on` | 关闭 / 恢复自动保存（**备份前**先关，避免备份到写入一半的存档） |
| `reload` | 重载数据包与部分配置。**慎用**：可能让插件状态错乱，能用插件自己的 `reload` 就别用它 |
| `restart` | 重启服务端（部分核心支持） |

:::tip 关服的标准姿势
`save-all` → `save-off` → 备份 → `stop`。直接把窗口叉掉可能导致存档损坏或数据回滚。
:::

## 二、玩家管理

| 指令 | 作用 |
| --- | --- |
| `list` | 列出**当前在线**玩家 |
| `kick <玩家> [原因]` | 踢出玩家，**他还能重新进** |
| `ban <玩家> [原因]` | 封禁玩家，**不解封就进不来** |
| `pardon <玩家>` | 解封玩家（老版本可能是 `unban`） |
| `ban-ip <IP>` | 按 IP 封禁（**该 IP 下所有人都进不来**，慎用） |
| `pardon-ip <IP>` | 解封 IP |
| `op <玩家>` | 给予 OP（管理员）权限 |
| `deop <玩家>` | 撤销 OP |

### 白名单

```
whitelist on                  开启白名单
whitelist add <玩家>          添加
whitelist remove <玩家>       移除
whitelist list                查看名单
whitelist reload              从 whitelist.json 重新读取
```

用指令改完后名单会写入 `whitelist.json`；如果你**直接编辑了这个文件**，记得执行 `whitelist reload` 让它生效。

## 三、插件与排查

| 指令 | 作用 |
| --- | --- |
| `plugins`（简写 `pl`） | 列出插件。**绿色 = 已加载**，**红色 = 加载失败**（去控制台看报错） |
| `version <插件>` | 查看插件版本 |
| `help` | 帮助 |

如果某个插件**连红色都没有**，说明服务端根本没把它识别为插件——通常是文件没放进 `plugins/`、后缀不对，或核心类型不匹配。

### 不想让玩家看到插件列表

`plugins`、`version`、`help` 这三条指令的权限默认是放开的，所有人都能执行。想关掉，把下面这些权限节点设为 `false`：

```
bukkit.command.plugins
bukkit.command.version
bukkit.command.help
```

:::warn 关掉指令不等于藏得住
部分作弊客户端能通过 **Tab 补全**的响应反推出已安装的插件。真的在意，需要额外装隐藏类插件（如 PluginHide 一类）来处理。
:::

## 四、游戏内常用的管理指令

| 指令 | 作用 |
| --- | --- |
| `gamemode <模式> [玩家]` | 切换游戏模式 |
| `tp <玩家> <目标>` | 传送 |
| `give <玩家> <物品> [数量]` | 给予物品 |
| `time set day` / `weather clear` | 调时间 / 天气 |
| `difficulty <难度>` | 改难度 |
| `gamerule <规则> <值>` | 改游戏规则 |
| `say <内容>` | 以服务器身份广播 |
| `whitelist` / `op` 等 | 同上（游戏内需 OP） |

## 五、权限与 Tab 补全

- 原版服务器用 **OP 等级**控制权限；装了权限插件（如 LuckPerms）后，改用**权限节点 + 权限组**精细控制，比给 OP 安全得多。
- **Tab 补全**能补出指令与参数，是排查"这条指令到底存不存在"的最快方式；玩家侧也能用它发现服务器装了哪些插件（见上）。

## 下一步

指令熟练之后，就该上工具与插件了：见 [MCDR 服务端管理器](/tutorials/java/mcdr) 与 [插件入门](/tutorials/java/plugins)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
