---
title: 插件配置基础
slug: plugin-config
cat: java
level: 2
order: 18
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, 配置, yaml, 颜色代码, 编码]
updated: 2026-10-04
draft: false
---

把插件丢进 `plugins/` 只是安装完成，真正决定服务器"顺不顺手"的是接下来那几十个 `config.yml`。配置改对了是功能，改错一个空格就可能整段读不出来。

这篇讲三件事：**YAML 怎么写、颜色代码怎么用、编码怎么不出乱码**，最后给一套改配置的固定流程。

## 1. 插件配置放在哪里

绝大多数插件把自己的文件放在 `plugins/插件名/` 下，常见的几类：

| 文件 / 目录 | 作用 |
| --- | --- |
| `config.yml` | 主配置，几乎每个插件都有 |
| `messages.yml`、`lang/` | 提示文本，改这里等于换措辞或汉化 |
| `menus/`、`kits.yml` 等 | 分模块配置，由插件在启动时生成 |
| `data/`、`playerdata/`、`*.db` | 插件自己维护的运行数据 |

:::warn 不要手改数据文件
`data/`、`playerdata/`、`*.db` 这类内容是插件运行时自己写的。手动编辑轻则被覆盖，重则让玩家数据错位。要改就改配置，不要碰数据。
:::

## 2. YAML 的三条铁律

九成的"配置读不出来"都出在下面三条上。

### 缩进只能用空格，不能用 Tab

YAML 明确规定缩进不得使用制表符。而 Tab 在编辑器里看起来和几个空格一模一样，肉眼很难发现：

```yaml
# 正确：用空格
options:
    enable: true

# 错误：这一行开头是 Tab
options:
	enable: true
```

多数编辑器会直接把 Tab 显示成一个箭头或虚线，VS Code 右下角也能看到 `Tab Size` 与缩进方式。**如果配置里已经混了 Tab，别手工一个个删**，用编辑器的"将缩进转换为空格"功能统一处理。

### 冒号后面必须有空格

```yaml
enabled: true      # 正确：冒号后一个空格
enabled:true       # 错误：整行被当成一个字符串
```

`key:value` 在 YAML 里不是键值对，而是一个普通字符串。插件读不到 `enabled` 这个键，就会退回默认值，表现出来往往是"我明明改了却没生效"。

### 同一层级的缩进必须一致

```yaml
options:
    enable: true
    check: false
    drop-block: true
    other:
        money: 10
        welcome: "欢迎你"
guide:
    show: true
```

`options` 与 `guide` 同层，`enable`、`check`、`drop-block` 与 `other` 同层，而 `other` 下面的 `money` 又低一层。同一层里**不允许出现重复的键**：

```yaml
options:
  enable: true
  enable: false     # 错误：同层重复键
  check: false
```

支持 YAML 语法的编辑器会把这种写法标红；即使编辑器不报，插件读取时也会报错。

## 3. 对象、数组与嵌套

YAML 只有两种基本结构：**键值对（对象）** 和 **列表（数组）**，其余都是它们套起来的结果。

### 对象

```yaml
options:
  enable: true
  check: false
  money: 10
```

也可以写成行内形式，适合短配置：

```yaml
options: {enable: true, check: false}
```

### 列表

以 `-` 开头的行构成一个列表，元素按顺序排列：

```yaml
worlds:
  - world
  - world_nether
  - world_the_end
```

行内写法：

```yaml
worlds: [world, world_nether, world_the_end]
```

### 列表里放对象

这是插件配置里最常见、也最容易写错的结构——**每个元素的第一个键跟在 `-` 后面，同元素的其他键要和它对齐**：

```yaml
kits:
  - name: starter
    price: 0
    items:
      - STONE_SWORD
      - BREAD
  - name: vip
    price: 500
    items:
      - DIAMOND_SWORD
```

注意 `name` 和 `price`、`items` 是同一个元素的三个键，缩进要对齐；而 `- STONE_SWORD` 又是 `items` 的下一层。

### 值的类型

插件配置里常见的值有这么几类，写法上要注意：

```yaml
boolean: true          # true / false，大小写不敏感
integer: 10
float: 3.14
text: "hello"          # 含特殊字符时用引号包起来
null_value: ~          # ~ 表示空值
```

:::tip 什么时候必须加引号
值里出现 `: `、`#`、`{`、`}`、`[`、`]`、`&`、`*`、`!`、`|`、`>` 等符号，或者值以它们开头时，用单引号或双引号包起来最稳。比如 `&a你好` 这类颜色代码文本，写成 `"&a你好"` 就不会被误解析。
:::

## 4. 常见的 YAML 报错与原因

| 现象 | 真实原因 | 处理 |
| --- | --- | --- |
| 插件启动即报 `while parsing`、`mapping values are not allowed here` | 冒号后没空格，或值里出现了未加引号的 `: ` | 补空格，或给值加引号 |
| `found character '\t' that cannot start any token` | 缩进里混了 Tab | 把缩进统一转换为空格 |
| `duplicate key` | 同一层级写了两个相同的键 | 删掉多余的那个 |
| 改了配置却毫无效果 | 键名拼错、层级放错、或插件根本没读这个文件 | 对照插件默认配置逐项核对 |
| 只有某个列表项失效 | 列表项内各键缩进没对齐 | 让同一元素的键左对齐 |
| 整个文件读不出来，第一行就报错 | 文件带了 BOM 或编码不是 UTF-8 | 另存为 UTF-8 无 BOM |
| 报 `expected <block end>` | 某一行少缩进或多缩进 | 逐层检查缩进宽度 |

:::tip 让编辑器替你检查
VS Code 装 YAML 扩展、Notepad++ 打开 `.yml`，都会实时标出缩进和语法问题。**在保存之前先看有没有红波浪线**，比事后翻日志快得多。
:::

## 5. 颜色与格式代码

服务端文本（MOTD、聊天、插件提示、菜单名称）靠**格式代码**上色。原版使用的是分节符号 `§`，但多数插件为了方便，允许在配置里直接写 `&`，由插件自己转换。

### 颜色

```
&0 黑色 &1 深蓝 &2 深绿 &3 深青
&4 深红 &5 深紫 &6 金色 &7 灰色
&8 深灰 &9 蓝色 &a 绿色 &b 青色
&c 红色 &d 粉红 &e 黄色 &f 白色
```

### 格式

```
&l 加粗     &o 斜体     &n 下划线   &m 删除线
&k 随机字符 &r 重置
```

组合使用即可，例如：

```yaml
prefix: "&8[&a服务器&8] &r"
message: "&a欢迎 &e%player_name% &a回到服务器"
warning: "&c&l警告&r &7请不要在此处建造"
```

`&r` 只清除它**之后**的格式，所以一段文字想恢复默认样式，就在那里写 `&r`。

### 几点限制

- **`&` 不是万能的**：它需要插件主动转换。少数地方（原版 `server.properties` 的 `motd`、部分原版指令）只认真正的 `§` 符号，写 `&` 会原样显示。
- **只有 16 种颜色**：`&` 代码是旧版机制，没有真彩色。需要渐变或精确色值，得用下面说的 MiniMessage。
- **打不出 `§` 怎么办**：正常客户端无法直接输入这个符号，可以按住 `Alt` 在小键盘依次输入 `167`，或直接复制粘贴。
- **支持的代码范围由插件决定**：同一个 `&l`，有的插件在菜单标题里生效，有的地方会被忽略。

### MiniMessage（了解即可）

基于 Adventure 库的 MiniMessage 用标签描述样式，支持真彩色、渐变、悬停与点击事件：

```xml
<yellow>你好 <blue><bold>世界</bold></blue>!</yellow>
<gradient:#f6d365:#fda085>渐变色文字</gradient>
<rainbow>彩虹文字</rainbow>
```

要注意的是：**平台原生支持不等于插件支持**。Paper 及其衍生端自带 Adventure，所以基于 Paper 开发的插件多半能用 MiniMessage；而基于 Bukkit 开发的插件（如 EssentialsX）默认并不支持，除非它自己引入了这个库（如 PlaceholderAPI）。

:::note 不要硬套
看到别人用 MiniMessage 效果好，不代表你的插件也认。写之前先翻插件文档，确认它支持的是 `&` 代码、MiniMessage 标签，还是两者都支持。
:::

## 6. 文件编码与乱码

配置里写中文后显示成 `???`、`鍑虹幇`、`æ¬¢è¿` 之类，几乎都是**编码不对**，而不是插件不支持中文。

| 现象 | 原因 |
| --- | --- |
| 中文变成问号或方块 | 文件被存成了 ANSI / GBK，而服务端按 UTF-8 读 |
| 中文变成一串奇怪符号 | 文件是 UTF-8，但被当成 GBK 读（或反过来） |
| 第一行键名读不出来 | 文件开头带了 BOM，个别解析器会把 BOM 当成键名的一部分 |

处理办法：

1. 用 VS Code、Notepad++ 之类的编辑器打开文件。
2. 在保存时选择 **UTF-8**（VS Code 右下角编码处选 `Save with Encoding`）。
3. 确认不要带 BOM。Windows 记事本在旧版本里默认存成"UTF-8 带 BOM"，是最常见的坑。
4. 保存后重新加载插件，观察控制台与游戏内文本。

:::warn 先用记事本存一次是危险操作
Windows 记事本打开 `.yml` 后随手 Ctrl+S，很容易把原本正常的 UTF-8 文件改成 ANSI。**建议一开始就用支持 YAML 与编码显示的编辑器**，并且改之前先备份。
:::

## 7. 安全地改配置：一套固定流程

按这个顺序走，出问题的概率会低很多。

1. **先备份**。复制一份 `config.yml` 为 `config.yml.bak`，改坏了立刻能还原。
2. **尽量在停服或低峰期改**。部分插件会在关闭时把自己的内存状态写回文件，运行中改的内容可能被覆盖。
3. **用带 YAML 支持的编辑器**，保留原有的注释和结构，不要顺手格式化整个文件。
4. **一次只改一处**，改完立刻验证。一次改二十行，出问题就不知道是哪一行。
5. **重新加载**。优先用插件自己的指令：

| 方式 | 说明 |
| --- | --- |
| `/插件名 reload` | 多数插件支持，**首选**（如 `/tab reload`、`/papi reload`） |
| 重启服务端 | 最保险，不支持热重载的插件只能这样 |
| `/reload`（原版指令） | **不推荐**，容易让插件状态错乱 |

6. **看控制台和 `logs/latest.log`**。配置解析失败通常会在加载时打印文件名与行号，按行号回去找基本一眼就能看到。
7. **不确定就先在测试服试**。改插件配置比装插件安全，但仍然可能影响存档或玩家数据。

:::tip 报错行号怎么用
日志里出现 `config.yml: 42` 这样的提示时，**不要只盯第 42 行**。YAML 的解析错误经常是前一行缩进或引号没闭合导致的，往上多看两三行。
:::

## 8. 速查

| 问题 | 先检查 |
| --- | --- |
| 配置没生效 | 键名拼写、层级位置、是否执行了 reload |
| 插件启动报解析错误 | 冒号后空格、Tab 缩进、同层重复键 |
| 中文乱码 | 文件是否为 UTF-8 无 BOM |
| 颜色代码原样显示 | 该位置是否支持 `&`，或需要 MiniMessage 标签 |
| 改了又变回去 | 插件是否在关服时重写了配置 |

## 下一步

配置里常出现的 `%player_name%` 这类变量从哪来？见 [常用前置插件](/tutorials/java/plugin-deps)。如果你还没装插件，先看 [插件入门](/tutorials/java/plugins)；服务端自身的配置则在 [配置服务端](/tutorials/java/config)。

---

> 本篇部分内容参考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 与 [其 GitHub 仓库](https://github.com/Cubic-Project/NitWikit)，已按本站结构重写；如与上游不一致以上游为准。
