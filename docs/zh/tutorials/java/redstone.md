---
title: 生电与红石
slug: redstone
cat: java
level: 2
order: 12
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 生电, 红石, fabric, leaves, paper, 原版特性]
updated: 2026-10-04
draft: false
---

「生电」= **生**存 + **电**路，指以红石机器、刷怪塔、精准方块行为为核心玩法的技术向生存。它和普通生存服最大的区别是：**对"原版行为是否被改动"极其敏感**。

一个被优化掉的方块更新顺序、一处被修掉的复制特性，就能让整台机器报废。

## 一、插件端做不到 100% 原版

Paper 官方文档自己就写明了：

> *Unfortunately, it currently is not possible to get a 100% Vanilla experience in Paper.*

也就是说，**用 Paper / Purpur 跑生电，本质上是在打折扣**。所以先选对核心，再谈配置。

| 你的目标 | 推荐核心 |
| --- | --- |
| **纯生电 / 技术向** | **Fabric**（不装优化类 mod 时最贴近原版）、**Leaves**（Paper 分支，专门修复被改坏的原版特性） |
| 原版验证 / 极简 | **Vanilla**（官方原版服务端） |
| **轻度生电**，同时想用插件 | Paper 系 + 下面这套配置调校 |

> 为什么 `Leaves` 值得单独提：它的定位就是"修复原版特性"，能在保留 Paper 生态（插件、性能）的同时把被改动过的行为还原回来，是"既要插件又要生电"时比较现实的选择。

## 二、插件端的原版特性调校

如果你确定要用 Paper 系做**轻度生电**，重点调这几处（文件：`config/paper-world-defaults.yml`）。

### 区块卸载延迟

```yaml
chunks:
  delay-chunk-unloads-by: 0s
```

默认会有一定延迟。设为 `0s` 才能让**末影珍珠滞留回传**这类依赖"区块及时卸载"的装置正常工作。

### 实体碰撞

```yaml
collisions:
  allow-player-cramming-damage: true
  max-entity-collisions: 2147483647
```

- `allow-player-cramming-damage`：玩家因实体过多挤压时是否受伤，需要与原版一致就设为 `true`。
- `max-entity-collisions`：超过这个数量服务端会**停止处理实体碰撞**。密集实体装置（如大规模刷怪塔）需要把它调到极大值，**代价是性能下降**。

### 实体行为

```yaml
entities:
  behavior:
    # 蜜蜂离巢的失败冷却时间，与原版行为相关
```

Paper 为性能给部分实体行为加了"冷却"或限制，生电场景需要逐项核对并关掉。

### 红石实现

Paper 支持切换**红石实现方式**。请**保持 vanilla 实现**——换成其他实现（为性能优化过的）会改变红石更新行为，机器直接失效。
:::warn 调配置前先备份
`config/` 下的文件改错了会导致服务端启动异常。**改前先复制一份**，出问题立刻还原。
:::

## 三、生电常用 mod（模组端）

生电玩家一般会装一套客户端 mod，服务端侧也需要对应支持：

| Mod | 作用 |
| --- | --- |
| **Carpet** | 服务端规则控制，生电服几乎必备（可开关大量原版细节行为） |
| **MiniHUD** | HUD 显示坐标、生物群系、光照等 |
| **Litematica** | 原理图投影，照着搭机器 |
| **Tweakeroo** | 一堆便利性调整 |
| **Servux** | 让 MiniHUD 的结构显示、原理图粘贴在服务器上正常工作 |
| **Syncmatica** | 把原理图上传到服务器共享给其他玩家 |
| **BBOR** | 显示自然结构范围、3D 群系边界、史莱姆区块 |
| **Jade / JEI（或 REI）** | 查看方块信息 / 合成配方 |
| **Xaero's Minimap / World Map** | 小地图与世界地图 |
| **AppleSkin** | 显示饥饿值与饱食度恢复 |
| **EasyAuth** | 服务端登录 mod |
| **Fuji** | 多功能管理 mod |

> 很多 mod 的部分功能**需要服务端也装**才能正确显示数值（如 AppleSkin 的精确饱食度），开生电服时要和玩家对齐版本。

## 四、专门的红石服务端

如果只关心**红石电路本身**（比如做大型计算器、验证机器时序），还有专门为红石优化的服务端核心（如 **MCHPRS** 一类）：它砍掉了生存相关的负担，把红石运算速度拉到极高。

代价是**它不是一个正常的生存服**，很多原版机制并不完整。适合**测机器**，不适合开服给玩家玩。

## 五、选型总结

```
要真生电（机器必须精确）
   → Fabric / Leaves / Vanilla
   → 插件端无论怎么调，都达不到 100% 原版

要轻度生电 + 想用插件
   → Paper 系 + 上面第二节的配置调校
   → 接受"部分机器可能仍然不工作"

只要测红石电路
   → MCHPRS 一类专用核心
```

## 下一步

技术上跑通之后，服务器能不能长久，靠的是经营：见 [经营管理](/tutorials/ops/management-java)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
