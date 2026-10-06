---
title: "[JAVA] 常见问题"
slug: faq-java
cat: faq
level: 1
order: 1
minutes: 12
tags: [java, 常见问题, 排查, 报错]
updated: 2026-10-04
draft: false
---

这里汇总 Java 版开服各环节最常见的报错与坑，**按现象直接查**。每条都标注了出处章节，需要细节就点进去看。

## 一、启动不起来

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 启动后**立刻退出**，日志提示 EULA | 没同意协议 | 把 `eula.txt` 改成 `eula=true` | [开启服务端](/tutorials/java/start) |
| `UnsupportedClassVersionError ... class file version 65.0` | **Java 版本不对**（65 = Java 21） | 按版本对照表换对应 Java | [环境准备](/tutorials/java/environment) |
| `'java' 不是内部或外部命令` / `java: command not found` | 没装 Java，或 `PATH` 没配好，或**窗口没重开** | 检查 `PATH`，**新开**一个终端再试 | [环境准备](/tutorials/java/environment) |
| 双击启动脚本**窗口一闪而过** | 报错后窗口自动关闭 | 脚本末尾加 `pause`，或在终端里运行 | [开启服务端](/tutorials/java/start) |
| `Address already in use` | 25565 被占用 | `netstat -ano \| findstr :25565`（Win）/ `ss -tlnp \| grep 25565`（Linux）查 PID 后结束 | [环境准备](/tutorials/java/environment) |
| `Could not reserve enough space for object heap` | `-Xmx` 超过可用内存 | 调小 `-Xmx` | [环境准备](/tutorials/java/environment) |
| 首次启动卡在 `Downloading mojang_x.x.x.jar` | 正在下载运行文件 | 耐心等；国内网络长期卡住需自备加速手段 | [开启服务端](/tutorials/java/start) |

## 二、别人连不上

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 自己 `telnet` 通、别人连不上 | **只配了本机防火墙，云安全组没放行** | 到云控制台补入站规则 `TCP 25565` | [部署到可访问环境](/tutorials/java/deploy) |
| 端口检测显示关闭 | 服务端**没启动**时端口不会监听 | 先把服务端跑起来再测 | [环境准备](/tutorials/java/environment) |
| 家里路由器映射了还是不通 | 大概率**没有公网 IPv4** | 对比路由器 WAN 口 IP 与"我的公网 IP"；不一致则需申请/改用云服务器/内网穿透 | [部署到可访问环境](/tutorials/java/deploy) |
| **手机玩家连不上** | 只放行了 TCP | 基岩版/跨端需要额外放行 **UDP 19132** | [手机玩家支持](/tutorials/java/mobile) |

## 三、路径与权限

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 插件/模组报奇怪的路径错误 | 目录含**中文或空格** | 迁到 `C:\mcserver` 或 `/opt/mcserver` 这类纯英文短路径 | [服务端结构](/tutorials/java/structure) |
| Linux 下 `Permission denied` | 服务端由 root 创建，普通用户无写权限 | `sudo chown -R mcserver:mcserver /opt/mcserver` | [环境准备](/tutorials/java/environment) |
| 世界文件改完存档坏了 | 手改了 `region/` 里的文件 | **不要手改**世界文件，用 WorldEdit 等工具，或先停服 | [服务端结构](/tutorials/java/structure) |

## 四、插件相关

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| `/plugins` 里**红色** | 加载失败（服务端认出了但没加载上） | 去控制台看报错，通常是缺前置或版本不匹配 | [插件入门](/tutorials/java/plugins) |
| `/plugins` 里**连红色都没有** | 服务端**根本没识别**它是插件 | 检查是否放进 `plugins/`、后缀是否 `.jar`、是否下错核心类型 | [插件入门](/tutorials/java/plugins) |
| 插件报 YAML 错误 | **用了 Tab 缩进**（YAML 只允许空格） | 改成空格缩进 | [插件入门](/tutorials/java/plugins) |
| 配置里中文变乱码 | 文件编码不是 UTF-8 | 用 VS Code 另存为 **UTF-8** | [插件入门](/tutorials/java/plugins) |
| 改完配置没生效 | 需要重载 | `/插件名 reload`；不支持的只能重启（**别用原版 `/reload`**） | [插件入门](/tutorials/java/plugins) |
| 服务器突然卡顿/报怪错 | 新装的插件 | **先禁用最近新装的插件**再逐个启用定位 | [插件入门](/tutorials/java/plugins) |

## 五、生电与机制

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 红石机器莫名失效 | **Paper 系改动了原版行为** | 生电请用 **Fabric 或 Leaves**；Paper 系只能做轻度生电并调配置 | [生电与红石](/tutorials/java/redstone) |
| 末影珍珠回传装置不工作 | 区块卸载延迟 | `paper-world-defaults.yml` 里 `delay-chunk-unloads-by: 0s` | [生电与红石](/tutorials/java/redstone) |
| 密集实体装置不生效 | 实体碰撞上限 | 调 `max-entity-collisions`（**代价是性能**） | [生电与红石](/tutorials/java/redstone) |

## 六、性能

| 现象 | 处理 | 出处 |
| --- | --- | --- |
| TPS 掉、整体卡 | 先调 **`simulation-distance`**（比调视距省得多且不影响观感） | [性能优化](/tutorials/java/optimize) |
| 不知道卡在哪 | 用 **spark** 生成火焰图，看最宽的那条 | [性能优化](/tutorials/java/optimize) |
| 玩家跑图就卡 | 做**世界预生成**（Chunky 一类） | [性能优化](/tutorials/java/optimize) |
| 内存给了很大还是卡 | `-Xmx` 过大会让 GC 停顿变长 | 10 人内分 4~6GB 通常足够 | [开服协议与配置推荐](/tutorials/java/protocol) |
| 单核很弱 | 调参数救不回来，**该换单核更强的机器** | [开服协议与配置推荐](/tutorials/java/protocol) |

## 七、数据与安全

| 现象 | 原因 / 处理 | 出处 |
| --- | --- | --- |
| 存档损坏 / 数据回滚 | 直接叉窗口关服导致 | 关服请用 `stop`；标准姿势：`save-all` → `save-off` → 备份 → `stop` | [常用服务端指令](/tutorials/java/commands) |
| 备份出来是坏的 | 边写边拷 | 热备需先 `save-off`；或停服再备 | [备份与恢复](/tutorials/java/backup) |
| 被破坏了但查不到是谁 | **没装记录插件** | 早装 CoreProtect 一类，它只能记录**装上之后**的事 | [反作弊与防破坏](/tutorials/java/anticheat) |
| 装了反作弊却误伤玩家 | 处罚开得太早 | 先跑**记录模式**观察；宁可漏判也别误伤 | [反作弊与防破坏](/tutorials/java/anticheat) |
| 离线模式的风险 | 任何人可冒用 ID、封禁可绕过 | 公开服**不建议**关正版验证 | [配置服务端](/tutorials/java/config) |
| 服务商跑路 / 机房出事 | 数据只存在一台机器上 | **至少定期把备份下载到别处** | [备份与恢复](/tutorials/java/backup) |

## 八、跨端与代理

| 现象 | 原因 | 出处 |
| --- | --- | --- |
| 基岩版玩家进不来 | 没装 Geyser，或没放行 UDP | [手机玩家支持](/tutorials/java/mobile) |
| Java 玩家想进基岩版服 | **做不到**：Geyser 是单向的 | [手机玩家支持](/tutorials/java/mobile) |
| 主机平台（Xbox/PS/Switch）进不来 | 它们不能直接输 IP | [手机玩家支持](/tutorials/java/mobile) |
| 跨服后指令没反应 | 插件装错了位置（代理端 vs 子服） | [跨服端](/tutorials/java/proxy) |
| 担心转发密钥泄露 | 泄露 = 任何人可伪造身份 | 密钥保密，子服端口**不要暴露公网** | [跨服端](/tutorials/java/proxy) |

> 找不到你的问题？基岩版相关见 [[BE] 常见问题](/tutorials/faq/faq-be)；运营层面的问题见 [[JAVA] 经营管理](/tutorials/ops/management-java)。
