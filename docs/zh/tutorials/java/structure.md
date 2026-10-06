---
title: 服务端结构
slug: structure
cat: java
level: 1
order: 6
minutes: 10
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 目录, 结构, 备份, 世界, 配置]
updated: 2026-10-04
draft: false
---

服务器跑起来之后，目录里会冒出一堆文件和文件夹。**知道哪个能动、哪个千万别碰**，是后面所有操作（装插件、备份、迁移）的基础。

下面以插件端（Paper / Purpur 这类）为例。

## 一、文件夹

| 文件夹 | 作用 | 能不能动 |
| --- | --- | --- |
| `plugins/` | 插件放这里 | 常动 |
| `world/` | **主世界**数据 | 只能整体备份，别手改 |
| `world_nether/` | 下界数据 | 同上 |
| `world_the_end/` | 末地数据 | 同上 |
| `logs/` | 运行日志，排查问题靠它 | 可删旧的 |
| `crash-reports/` | 崩溃报告，报错时第一时间看这里 | 可删旧的 |
| `config/` | Paper 系的核心配置（如 `paper-world-defaults.yml`） | 改前备份 |
| `libraries/` `versions/` `cache/` | 依赖库与缓存，**自动生成** | 别动 |
| `mods/` | 仅**模组端**（Fabric / Forge）与混合端才有 | 常动 |

## 二、根目录的关键文件

| 文件 | 作用 |
| --- | --- |
| `server.properties` | **最基础的服务端配置**（端口、正版验证、视距……） |
| `eula.txt` | 协议同意文件，必须是 `eula=true` |
| `核心名.jar` | 服务端核心本体 |
| `ops.json` | OP（管理员）名单 |
| `whitelist.json` | 白名单名单 |
| `banned-players.json` / `banned-ips.json` | 封禁名单 |
| `usercache.json` | 玩家名与 UUID 的缓存 |
| `bukkit.yml` / `spigot.yml` | Bukkit / Spigot 层配置（Paper 系都有） |
| `purpur.yml` / `paper.yml` | 对应核心自己的配置（换了核心才有） |
| `commands.yml` | 命令别名与拦截映射 |
| `permissions.yml` | 默认权限定义 |

## 三、世界文件夹里是什么

`world/` 内部才是真正的存档，**备份时整个 `world` 一起备**：

| 子目录 | 内容 |
| --- | --- |
| `region/` | **区块数据**（方块、地形都在这里，体积最大） |
| `playerdata/` | 玩家背包、位置、血量 |
| `entities/` | 实体数据（掉落物、生物、村民交易等） |
| `poi/` | 兴趣点（村民工作站、床等） |
| `data/` | 世界级数据（地图、计分板等） |
| `datapacks/` | 数据包 |
| `advancements/` `stats/` | 成就与统计 |

:::warn 不要手动编辑世界文件
直接改 `region/` 里的文件极可能**损坏存档**。要改世界请用 `WorldEdit` 这类插件，或先停服再操作。
:::

## 四、这套结构告诉你的三件事

1. **备份要备什么**：`world*` 三个世界文件夹 + `plugins/` 里的配置 + `server.properties`，其余大多能自动重建。详见「备份与恢复」。
2. **迁移怎么迁**：把整个服务端目录拷到新机器，装好同版本 Java 即可，路径别带中文和空格。
3. **排查从哪看**：先看 `logs/latest.log`，崩了再看 `crash-reports/`。

## 下一步

看懂结构后，开始改配置：见 [配置服务端](/tutorials/java/config)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
