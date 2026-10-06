---
title: 第三方核心（Nukkit / PNX / PMMP）
slug: third-party
cat: bedrock
level: 3
order: 5
minutes: 12
tags: [基岩版, nukkit, powernukkitx, pocketmine, php, 第三方核心]
updated: 2026-10-04
draft: false
---

官方 BDS 稳但不好扩展。要插件、要多核、要自定义，就得用第三方核心。这一篇把三个主流第三方核心的**上手路径**讲清楚。

## 一、Nukkit 系

Nukkit 是"基岩版的 Bukkit"：**Java 编写**、有原生插件系统、配置简单。它衍生出一堆分支，实际使用时**优先选活跃分支**：

| 分支 | 说明 |
| --- | --- |
| **Nukkit（原版）** | 最早上游，已不活跃，不建议新项目使用 |
| **PowerNukkitX（PNX）** | 现代主力分支，**支持最新协议 + 多核优化**，首选 |
| **NukkitX** | 历史分支 |
| **NukkitMot** | 历史分支 |
| **PM1E** | 与 PocketMine 相关的历史分支（社区对其历史有争议） |
| **PNX** | 即 PowerNukkitX 的缩写 |

**准备**：Nukkit 系是 Java 程序，**需要装 Java**（与 Java 版类似，见「环境准备（Windows 与 Linux）」的 Java 一节）。

**上手**：下载核心 jar → 放进目录 → 写启动脚本（`java -jar 核心名.jar`）→ 首次启动生成配置文件 → 装插件到 `plugins/`。

### PowerNukkitX 为什么值得选

- **多核优化** —— 这是它相对 BDS 最大的优势，BDS 的运算基本压在单核；
- **支持最新基岩版协议**，不用等很久；
- **384 格世界高度**、内置 **Terra** 地形生成器；
- **完全开源、API 开放**，可用 Java / Kotlin / Scala / Python / JavaScript / Lua 写插件；
- **兼容 Nukkit 生态的大量插件**。

代价：插件多、配置项多，**新手学习曲线较陡**；开发强度会受上游团队变动影响。

## 二、PocketMine-MP（PMMP）

用 **PHP** 写的基岩版服务端，**插件生态最庞大**。

**准备**：需要 **PHP 运行环境**（不是 Java）。建议按官方文档装对应 PHP 版本，并配好相关扩展。

**上手**：下载 PMMP（通常是 `.phar` 文件）→ 用 PHP 启动（`php PocketMine-MP.phar`）→ 生成配置与目录 → 插件放 `plugins/`。

**优点**：插件极多、跨平台、**会 PHP 就能写插件**、社区活跃、自定义程度高。

**缺点**：**高负载下有性能瓶颈**（内存管理与 CPU 效率）；更新滞后；插件装多了稳定性下降；PHP 作为解释型语言**资源占用更明显**。

:::tip 选 Nukkit 系还是 PMMP？
- 你**熟悉 Java**、想要**更好的性能** → **PowerNukkitX**
- 你**熟悉 PHP**、想要**最多的现成插件** → **PocketMine-MP**
- 两者都不熟 → 先用 **BDS** 跑通，再考虑第三方
:::

## 三、其他服务端

除了上面几个，社区还有一些小众/特定用途的核心：

| 核心 | 定位 |
| --- | --- |
| **Allay** | 社区开发的基岩版服务端 |
| **Dragonfly** | Go 语言编写的基岩版服务端，性能取向 |
| **MCPEServer** | 早期基岩版服务端 |
| **WaterDogPE** | **代理端**（对应 Java 版的 Velocity / BungeeCord），用于多子服互联 |

> 小众核心的**插件生态与文档通常很薄**，遇到问题较难求助。除非有明确理由，**不建议新手选择**。

### WaterDogPE：多子服才需要

和 Java 版一样，基岩版也有**代理端**：它自己不跑世界，只把玩家转发到后端子服。适合"大厅 + 生存 + 小游戏"这种多服结构。**单服不需要它**，多一层就多一层故障点。

## 四、通用建议

1. **版本对齐**：核心、协议、插件三者版本要对齐，基岩版在这点上比 Java 版严格得多。
2. **先小后大**：先跑通一个最小可用服，再逐步加插件。
3. **看活跃度**：优先选**近期仍在更新**的核心与插件，长期不更新的遇到新版必崩。
4. **备份优先**：第三方核心的存档兼容性不如官方，**升级/换核心前一定先备份**（见「备份与恢复」）。

## 下一步

回看整体选型：见 [基岩版核心选择](/tutorials/bedrock/cores) 与 [服务端核心对比](/wiki/compare#mcsog-h-%E5%9F%BA%E5%B2%A9%E7%89%88%E6%A0%B8%E5%BF%83%E5%AF%B9%E6%AF%94)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 的基岩版板块与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
