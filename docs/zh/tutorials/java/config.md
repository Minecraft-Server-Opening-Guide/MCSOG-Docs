---
title: 配置服务端
slug: config
cat: java
level: 1
order: 7
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 配置, server.properties, 正版验证, 视距, gamerule]
updated: 2026-10-04
draft: false
---

服务器第一次启动后，根目录会生成 `server.properties`。**改完必须重启服务端才生效**（它不是热重载的）。

用文本编辑器打开它，下面是最常改的几项。

## 一、最常改的选项

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `server-port` | `25565` | 服务端监听端口，改了要同步改防火墙/安全组 |
| `online-mode` | `true` | **正版验证**。保持 `true` 时非正版客户端无法进入；改 `false` 即离线模式 |
| `max-players` | `20` | 最大同时在线人数 |
| `motd` | — | 服务器列表里显示的那行字（支持颜色代码） |
| `difficulty` | `easy` | `peaceful`/`easy`/`normal`/`hard`（也接受 `0`~`3`） |
| `gamemode` | `survival` | 新玩家默认模式：`survival`/`creative`/`adventure`/`spectator` |
| `force-gamemode` | `false` | 设为 `true` 时，玩家每次进服都被强制改回默认模式 |
| `pvp` | `true` | 是否允许玩家互相攻击 |
| `allow-flight` | `false` | 生存模式是否允许飞行（装了飞行类插件建议开） |
| `spawn-protection` | `16` | 出生点保护半径，只有 OP 能在此范围内破坏/放置；`0` 为关闭 |
| `allow-nether` | `true` | 是否允许前往下界（`false` 会禁用下界） |
| `generate-structures` | `true` | 新区块是否生成村庄等结构 |
| `level-seed` | 空 | 世界种子，留空为随机 |
| `enable-command-block` | `false` | 是否启用命令方块，**一般不建议开启**（见下） |
| `white-list` | `false` | 是否启用白名单 |
| `view-distance` | `10` | **视距**，最影响性能的选项之一 |
| `simulation-distance` | `10` | **模拟距离**，决定多远范围内的实体/红石还在运算 |

### 关于视距与模拟距离

这两个是**性能开销最大的旋钮**，比换核心更立竿见影：

- `view-distance` 决定玩家能"看见"多远，调低能显著省带宽与 CPU，但远处会雾蒙蒙。
- `simulation-distance` 决定多远的区块还在**真实运算**（刷怪、红石、作物生长）。调低它比调低视距省得更多，且不影响观感。

:::tip 先调这两个，再考虑升级硬件
很多"服务器卡"其实把 `simulation-distance` 从 10 降到 6 就能明显缓解。
:::

### 关于命令方块

`enable-command-block` 默认关闭，且**多数情况下不建议打开**：命令方块在服务端的实现效率较低，而它的功能几乎都能用插件更高效地实现（且插件还能做权限控制与审计）。确实需要原版命令方块玩法时再打开。

## 二、正版验证与离线模式

- `online-mode=true`（默认）：会向 Mojang 校验账号，非正版客户端进不来。
- `online-mode=false`：任何人可进，但**任何人都能冒用任意 ID**，也无法使用正版皮肤与 UUID 绑定。

如果因为特殊原因必须用离线模式，通常还要配 `SkinsRestorer` 之类的皮肤插件来补回皮肤显示。

:::warn 离线模式的代价
离线模式下账号没有任何保障：封禁可以换个 ID 绕过，管理员权限也更容易被冒用。**公开服不建议关闭正版验证。**
:::

## 三、游戏规则（gamerule）

难度、出生点保护这类在 `server.properties` 里改；而**游戏规则要用指令改**：

```
/gamerule keepInventory true        死亡不掉落
/gamerule doDaylightCycle false     关闭昼夜更替
/gamerule mobGriefing false         苦力怕不破坏方块
/gamerule announceAdvancements false 不公告进度达成
```

在控制台或游戏内（需 OP）执行即可，**立即生效且会被保存**。

## 四、改配置的通用姿势

1. **先停服**再改 `server.properties`（改世界相关配置时尤其要停，避免存档写入冲突）。
2. 改完**先备份原文件**，出问题能立刻还原。
3. 重启后看 `logs/latest.log` 确认没有配置报错。
4. 插件配置在 `plugins/插件名/config.yml`，多数支持 `/插件名 reload` 热重载——但**服务端自身的配置不支持**。

## 下一步

配置完成后，把它部署到能被别人访问的环境：见 [部署到可访问环境](/tutorials/java/deploy)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
