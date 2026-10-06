---
title: 开启服务端
slug: start
cat: java
level: 1
order: 5
minutes: 14
mc: ["26.1+", "1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 启动脚本, bat, sh, eula, 自动重启, 通配符]
updated: 2026-10-04
draft: false
---

前置条件已经就绪：**Java 装好了、端口放行了、目录建好了、核心也选好并下载了**。这一篇把服务器真正跑起来。

:::note 新版 Forge 与 NeoForge 可以跳过这一篇
新版 **Forge** 与 **NeoForge** 用官方**安装器**安装后，会在服务端目录**自动生成启动脚本**（`run.bat` / `run.sh`）。用它们的话直接运行那个脚本即可，不需要手写启动脚本。
:::

## 一、编写启动脚本

把下载好的服务端核心（`.jar`）放进部署目录，例如：

```
C:\mcserver\survival\        （Linux 下对应 /opt/mcserver/survival/）
├── paper-1.21.4.jar         ← 你下载的核心
└── （其余文件首次启动后自动生成）
```

### Windows：`start.bat`

1. 在这个目录里新建一个**文本文档**，把文件名改成 `start.bat`（扩展名从 `.txt` 改成 `.bat`）。
2. 右键 → 用文本编辑器打开，写入下面内容并保存：

```bat
@echo off
cd /d "%~dp0"
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

把 `核心名.jar` 换成你实际的文件名（例如 `paper-1.21.4.jar`）。

- `cd /d "%~dp0"` 让工作目录固定为脚本所在目录，避免双击时找不到核心文件。
- `--nogui` 表示不打开服务器自带的图形窗口，全部输出走命令行（`nogui` 是它的旧别名，两者等价）。
- `pause` 让窗口在服务器退出后**不要立刻关闭**，方便看报错，详见下文「拓展」。

### Linux：`start.sh`

```bash
#!/bin/sh
cd "$(dirname "$0")"
exec java -Xms2G -Xmx2G -jar 核心名.jar --nogui
```

赋予执行权限后运行：

```bash
chmod +x start.sh
./start.sh
```

## 二、第一次启动：等它下载，然后同意 EULA

**首次启动会先下载运行所需文件**，命令行里会出现类似 `Downloading mojang_x.x.x.jar` 的输出——这是正常的，**耐心等它下载完**即可（国内网络如果一直卡住，需要自备网络加速手段）。

下载完成后，服务器**不会直接启动**，而是提示：

```
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

这时用文本编辑器打开目录里**自动生成的 `eula.txt`**，把：

```
eula=false
```

改成：

```
eula=true
```

保存后**重新运行启动脚本**。这个操作表示你已阅读并同意 [Minecraft EULA](https://aka.ms/MinecraftEULA)。

:::warn 不改就起不来
`eula=false` 时服务器会**启动后立刻退出**，这是最常见的新手卡点。
:::

## 三、怎么算启动成功

当命令行出现下面这行，说明服务器**已经成功开启**：

```
Done (6.554s)! For help, type "help"
```

括号里的秒数因机器而异。此时：

- 在**本机**可用 `localhost:25565` 进入；
- 别人用**你的公网 IP**（或域名）加默认端口 `25565` 进入；
- 在控制台输入 `stop` 可以**安全关闭**服务器（**不要直接叉掉窗口**，容易损坏存档）。

## 四、拓展：三个实用技巧

### 1. 加 `pause`，崩溃时能看到日志

Windows 的 `.bat` 双击运行时，如果服务器崩溃，窗口会**一闪而过**，你什么都看不到。在脚本**最后一行**加 `pause` 即可：

```bat
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

这样服务器退出后窗口会停住，报错信息就能看清了（Linux 下等价做法是在脚本末尾加 `read -n 1 -p "按任意键继续..."`）。

### 2. 用通配符，换核心版本不用改脚本

每次更新核心都要改脚本里的文件名很烦。可以用**通配符**匹配：

```bash
java -jar *.jar
java -jar paper-*.jar
java -jar leaf-*.jar
```

:::warn 通配符在 Windows 的 .bat 里不生效
这是**实测确认**的差异：**Linux / macOS 的 shell 会展开通配符**，但 **Windows 的 cmd 不会**——它会把你写的 `*.jar` 原样传给 Java，Java 找不到这个文件就会报错。

Windows 下要用 `for` 循环来达到同样效果：

```bat
@echo off
cd /d "%~dp0"
for %%f in (paper-*.jar) do (
  java -Xms2G -Xmx2G -jar "%%f" --nogui
  goto :done
)
:done
pause
```

把 `paper-*.jar` 换成你的核心前缀（如 `leaf-*.jar`）即可，更新版本时不用改脚本。
:::

### 3. 崩溃后自动重启

**Windows**（`start.bat`）：

```bat
@echo off
cd /d "%~dp0"
:start
java -Xmx4G -Xms1G -jar server.jar nogui
echo 服务器崩溃，3 秒后重启...
timeout /t 3
goto start
```

**Linux**（`start.sh`）：

```bash
#!/bin/bash
cd "$(dirname "$0")"
while true; do
    java -Xmx4G -Xms1G -jar server.jar nogui
    echo "服务器已关闭，3 秒后重启..."
    sleep 3
done
```

:::warn 自动重启前先想清楚
自动重启适合**无人值守的长期服**。但如果服务器是因为**配置错误**（比如 Java 版本不对、端口被占用）而启动失败，它会**每 3 秒重启一次并刷屏**，反而掩盖真正的错误。**第一次调试时不要用自动重启**，先手动跑通再说。
:::

:::tip Linux 长期开服更推荐 systemd
上面的 `while` 循环在 SSH 断开后会被杀掉。想让服务器**开机自启、崩溃自动重启、退出 SSH 也不停**，用 systemd 托管更合适——见「环境准备（Windows 与 Linux）」第五步。
:::

## 五、下一步

服务器跑起来之后，建议按这个顺序继续：

- **先看懂目录**：见 [服务端结构](/tutorials/java/structure) —— 哪些文件能动能备份
- **再改配置**：见 [配置服务端](/tutorials/java/config) —— 正版验证、难度、视距都在这里
- **让别人也能连上**：见 [部署到可访问环境](/tutorials/java/deploy)
- **换核心 / 对照**：见 [服务端选择](/tutorials/java/core) 与 [服务端核心对比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)
