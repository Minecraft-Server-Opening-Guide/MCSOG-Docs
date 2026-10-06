---
title: "[BE] 常见问题"
slug: faq-be
cat: faq
level: 1
order: 2
minutes: 10
tags: [基岩版, 常见问题, 排查, 协议, bds]
updated: 2026-10-04
draft: false
---

基岩版开服的坑和 Java 版**很不一样**——最大的区别是**版本/协议**。这里按现象汇总，标注了出处章节。

## 一、玩家连不上（最常见）

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 提示"**所有玩家都应更新到最新版本**" | **协议版本不匹配** | 服务端协议必须与客户端一致：把服务端更新到最新版，或让玩家固定版本 | [协议版本与版本选择](/tutorials/bedrock/protocol) |
| 昨天还好，今天玩家全进不来 | 玩家客户端**自动更新**换了协议 | 跟进更新服务端（应用商店默认自动更新，无法指望玩家降级） | [协议版本与版本选择](/tutorials/bedrock/protocol) |
| **iOS 玩家进不来** | iOS **只能装商店最新版**，无法安装指定版本 | 除非放弃 iOS 群体，否则只能让服务端跟进最新版 | [协议版本与版本选择](/tutorials/bedrock/protocol) |
| 端口检测通过但还是连不上 | 客户端与服务端**协议号不同** | 核对协议号（以 Minecraft Wiki 版本表为准） | [协议版本与版本选择](/tutorials/bedrock/protocol) |

## 二、端口与网络

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 服务器明明开着，谁都进不来 | **基岩版用 UDP** | 放行 **UDP 19132**（IPv6 为 19133）；安全组与系统防火墙**两处都要** | [手机玩家支持](/tutorials/java/mobile) |
| 主机平台（Xbox / PS / Switch）进不来 | 它们**不能直接输 IP 加入** | 只能通过**自定义 DNS** 或**局域网**方式连接 | [手机玩家支持](/tutorials/java/mobile) |
| 想用内网穿透但连不上 | 多数穿透服务默认只支持 TCP | 选支持 **UDP** 的穿透方案 | [部署到可访问环境](/tutorials/java/deploy) |

## 三、BDS 相关

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| BDS **装不了插件** | 官方服务端**没有插件系统** | 用社区加载器（LeviLamina / EndStone / BDSX） | [BDS 服务端](/tutorials/bedrock/bds) |
| 装了加载器却起不来 | **加载器与游戏版本强绑定** | 先确认服务端版本在加载器支持列表内 | [BDS 服务端](/tutorials/bedrock/bds) |
| 地图越大越卡 | BDS **生物运算单线程** | 流畅度取决于**单核性能**；只能换单核更强的机器或减小地图规模 | [BDS 服务端](/tutorials/bedrock/bds) |
| 内存一直缓慢上涨 | BDS 已知问题（类似内存泄漏） | **不要强行清理内存** → 会导致玩家下载材质包/Addon 时**进度条卡住**，只能重启服务端 | [BDS 服务端](/tutorials/bedrock/bds) |
| 改了 `bedrock_server.exe` 名字后启动失败 | 启动脚本/面板里的路径没同步改 | 改回原名，或同步修改启动路径 | [BDS 服务端](/tutorials/bedrock/bds) |

## 四、核心选择

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 用了 Nukkit 却跟不上新版本 | 原版 Nukkit **已不活跃** | 换 **PowerNukkitX**（支持最新协议 + 多核优化） | [第三方核心](/tutorials/bedrock/third-party) |
| 玩家一多就卡（PMMP） | PHP 核心**高负载有瓶颈** | 减少插件、升级硬件，或改用 PowerNukkitX / BDS | [第三方核心](/tutorials/bedrock/third-party) |
| 不知道该选哪个核心 | — | 原版生存选 **BDS**；要性能+自定义选 **PNX**；要最多插件且会 PHP 选 **PMMP** | [基岩版核心选择](/tutorials/bedrock/cores) |
| 多子服想统一入口 | 需要**代理端** | 用 **WaterDogPE**（对应 Java 版的 Velocity） | [第三方核心](/tutorials/bedrock/third-party) |

## 五、存档与备份

| 现象 | 原因 | 处理 | 出处 |
| --- | --- | --- | --- |
| 换核心后存档读不出来 | 第三方核心的存档兼容性不如官方 | **升级/换核心前先备份**；尽量同核心内升级 | [第三方核心](/tutorials/bedrock/third-party) |
| 备份不完整 | 只拷了部分文件 | BDS 的存档全在 **`worlds/`**，整个目录一起备份 | [BDS 服务端](/tutorials/bedrock/bds) |
| 备份文件很大且越来越多 | 没做保留策略 | 保留若干天每日 + 若干周每周，并清理旧包 | [备份与恢复](/tutorials/java/backup) |
| 服务商跑路数据全丢 | 数据只在一台机器 | **至少定期把备份下载到别处** | [备份与恢复](/tutorials/java/backup) |

## 六、玩家与运营

| 现象 | 处理 | 出处 |
| --- | --- | --- |
| 低龄玩家多、冲突多 | 规则写短、白名单/审核前置、同时段有人值守 | [[BE] 经营管理](/tutorials/ops/management-be) |
| 玩家不会装客户端（appx/apk） | 提前写好**分平台图文教程** | [[BE] 经营管理](/tutorials/ops/management-be) |
| 安卓玩家说很卡 | 某版本起安卓端存在严重卡顿，社区长期无解 | [协议版本与版本选择](/tutorials/bedrock/protocol) |
| 玩家说光影用不了 | 1.18.30 起客户端实装**渲染龙**，传统光影不可用 | [协议版本与版本选择](/tutorials/bedrock/protocol) |

> Java 版相关见 [[JAVA] 常见问题](/tutorials/faq/faq-java)；完整的核心对照见 [服务端核心对比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)。
