---
title: 环境准备（Windows 与 Linux）
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, 环境, java版本, 端口, 权限]
updated: 2026-10-04
draft: false
---

这篇把 Windows 与 Linux 放在一起写。两边要做的是**同样四件事**：**确认 Java 版本 → 放行端口 → 建目录 → 装对 Java 并配好环境**。

差异只在命令写法，所以每个小节里都给两套做法，**照着你自己的系统看那一半就行**。

## 第一步：先确认你要开的版本，再决定 Java

**这一步做错，后面全白做。** Java 版本不匹配时服务端启动即崩，日志里会出现 `UnsupportedClassVersionError`。

| Minecraft Java 版 | 官方要求的 Java | 说明 |
| --- | --- | --- |
| 26.1 及以后 | **Java 25** | 最新要求（26.1 起） |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 是最早要求 21 的正式版 |
| 1.18 – 1.20.4 | **Java 17** | 目前最常用的组合 |
| 1.17 – 1.17.1 | **Java 16** | Java 17 也可以正常启动 |
| 1.12 – 1.16.5 | **Java 8** | 大量老整合包仍停留在这一档 |
| 1.7.10 及更早 | 官方要求较低 | 实际普遍使用 Java 8 |

:::note 上表来源
1.20.5 / 1.18 / 1.17 / 1.12 等分界取自 Mojang 官方版本清单（`piston-meta.mojang.com` 每个版本的 `javaVersion.majorVersion` 字段）；26.1 起要求 Java 25 取自 Minecraft Wiki 的版本要求列表。非经验推测。
:::

- **Paper、Purpur、Spigot、Fabric、Forge 的要求与官方一致**：1.20.5 以上需要 Java 21，1.18–1.20.4 需要 Java 17。
- 上表是**最低要求**。Java 版本过高时，部分插件与模组可能不兼容，**建议与要求严格对齐**。
- **基岩版（BDS）不需要 Java**，它是 C++ 程序，直接运行 `bedrock_server`（Windows 下为 `bedrock_server.exe`）即可。

## 第二步：放行端口

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| 25565 | TCP | Java 版游戏连接（**必须**） |
| 25565 | UDP | 服务器列表查询（Query，可选） |
| 25575 | TCP | RCON 远程控制台（可选，**不要暴露给公网**） |
| 19132 | UDP | 基岩版默认端口（IPv6 为 19133，仅跨端方案才需要） |

:::note 端口来源
Java 版默认 **TCP 25565**；基岩版 **BDS 使用 UDP**，IPv4 默认 **19132**、IPv6 默认 **19133**（可在 `server.properties` 修改）。
:::

### 云服务器安全组（云主机必做）

到云控制台的「安全组 / 防火墙」添加入站规则 `TCP 25565`，来源 `0.0.0.0/0`。**本机防火墙配得再对，安全组没开别人一样连不上。**

### 系统防火墙

**Windows（图形界面）**：`控制面板 → Windows Defender 防火墙 → 高级设置 → 入站规则 → 新建规则` → 选「端口」→「TCP」→ 本地端口填 `25565` →「允许连接」→ 三个配置文件全勾 → 命名保存。

**Windows（命令行，管理员 PowerShell）**：

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux（ufw，Ubuntu / Debian）**：

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux（firewalld，CentOS 系）**：

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn 用 Docker 部署时，系统防火墙管不住容器
如果你打算用 **Docker / Docker Compose** 部署服务端（见 [用 Docker 部署 Java 版](/tutorials/java/docker)），那么 **`ufw` 与 `firewalld` 对本节这些端口都不起作用**。

原因：Docker 启动时会自己往 `iptables` 写转发与 NAT 规则，并且把这些规则插在系统防火墙规则**之前**。所以即使你执行了 `sudo ufw deny 25565`，外部**照样能连上容器映射出来的端口**。这不是配置写错了，是 Docker 的既定行为。

四条可行做法，**按推荐程度排序**：

1. **端口只绑本机回环**（最安全、最简单）：`-p 127.0.0.1:25565:25565`，容器端口因此**完全不暴露到公网**；需要对外时再由宿主机的反向代理（Nginx `stream`、frp、加速器等）转发。
2. **用 [ufw-docker](https://github.com/chaifeng/ufw-docker) 脚本让 UFW 重新管得住容器**（**想让 UFW 继续当统一入口时选它**）：一条命令装好，之后就能用 `ufw route allow proto tcp from any to any port 25565` 放行容器端口、`ufw route delete allow …` 收回，**既不用禁用 Docker 的 iptables，也不用自己写 iptables 规则**。详见 [用 Docker 部署 Java 版 → 5.2 正确的四种做法](/tutorials/java/docker#52-正确的四种做法)。
3. **用 `DOCKER-USER` 链手工写规则**：这是 Docker 专门留给用户的链，Docker 自己不会覆盖它，适合只做少量来源限制的场景。
4. 在 `/etc/docker/daemon.json` 写 `"iptables": false` 后自行维护转发规则——**会同时失去端口映射能力（除非你自己配 NAT），不建议新手使用**。

完整说明见 [用 Docker 部署 Java 版 → 网络与防火墙](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节)。
:::

### 验证

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

外部可达性必须从**另一台机器**测试：`telnet 你的公网IP 25565`，或使用在线端口检测工具。**服务端没启动时端口不会监听**，所以要先让服务端跑起来再测。

## 第三步：创建目录

:::warn 路径不要带中文和空格
`C:\我的服务器\1.20 服务端\` 或 `/home/我的服务器/` 这类路径会让部分启动脚本、插件配置解析出错，报错信息往往还很难懂。**统一用纯英文、无空格的短路径。**
:::

两边用**同一套结构**，将来从 Windows 迁到 Linux 只需整体拷过去：

```
mcserver/
├── survival/          # 单个服务端的全部文件
│   ├── server.jar     # 服务端核心
│   ├── eula.txt       # 必须同意才会启动
│   ├── server.properties
│   ├── world/         # 世界数据（务必单独备份）
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # 备份目录，与运行目录分开更安全
```

**Windows**：

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux**（用专用用户，不要用 root 跑服务端）：

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**把服务端核心放进 `survival` 后，第一次启动会生成 `eula.txt`**，把 `eula=false` 改成 `eula=true` 表示同意 [Minecraft EULA](https://aka.ms/MinecraftEULA)。**不改就是启动后立刻退出。**

## 第四步：安装 Java 并配置环境

推荐 **Eclipse Temurin（Adoptium）**：免费、开源、长期维护，是服务端社区使用最广的 OpenJDK 发行版。

### Windows：安装

到 Adoptium 官网下载 **JDK 的 `.msi` 安装包**（`.jar` 版是运行时，`.msi` 才是带向导的 JDK）。Java 21 对应 `temurin-21-jdk`，Java 17 换成 `temurin-17-jdk`，Java 8 换成 `temurin-8-jdk`。

安装向导里有一项 **`Set JAVA_HOME variable`**，设为 **Will be installed on local hard drive**，勾上它环境变量会自动配好。

装完**新开一个** PowerShell 验证：

```powershell
java -version        # 应输出 openjdk version "21.x.x" ...
```

### Linux：安装

```bash
# Ubuntu / Debian：Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# 需要 Java 17 时
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# CentOS 系
sudo dnf install -y java-21-openjdk-headless
```

多版本共存时切换默认版本：

```bash
sudo update-alternatives --config java
java -version
```

:::tip headless 版本就够
`-headless` 不含图形组件，内存占用更小；服务端用不到 GUI，**优先装 headless**。
:::

### 手动配置环境变量（Windows 未勾选安装选项，或使用免安装 ZIP 版时）

**图形界面**：`此电脑 → 右键属性 → 高级系统设置 → 环境变量`，在**系统变量**中：

1. 新建 `JAVA_HOME`，值填 JDK 安装目录，例如 `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot`（**不要**带 `\bin`）
2. 编辑 `Path`，新增一项 `%JAVA_HOME%\bin`
3. 确定保存，然后**新开** PowerShell 验证

**命令行**（需管理员权限；`setx` 只影响新窗口）：

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn 关于 setx 覆盖 Path 的风险
`setx Path` 会写入**当前**已解析的 Path。如果原 Path 过长或含变量引用，直接拼接可能截断。**图形界面编辑更安全。**
:::

**Linux** 下包管理器安装的 JDK 通常已在 `PATH` 中；若使用免安装 tar.gz，则在 `~/.bashrc` 或 `/etc/profile.d/` 中设置：

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**验证**：

```powershell
echo $env:JAVA_HOME      # cmd：echo %JAVA_HOME%
java -version
where.exe java           # 应指向 %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### 多版本共存

**Windows** 没有 `update-alternatives`，最稳的做法是：装多个 JDK，不改系统默认，而是在每个服务端的启动脚本里写死 `java.exe` 的绝对路径。

`C:\mcserver\survival\start.bat`：

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **路径一定要用双引号包住**——`Program Files` 里有空格，不加引号必然失败
- `cd /d "%~dp0"` 让工作目录固定为脚本所在目录
- `pause` 让窗口在出错时**不要立刻关闭**，否则看不到报错

**Linux** 用 `update-alternatives` 切换，或在 `start.sh` 中写死路径：

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## 第五步（Linux 建议）：用 systemd 托管

手动 `./start.sh` 一关 SSH 就断了，也做不到崩溃自动重启。长期开服建议托管成服务：

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/bin/screen -DmS mcserver /usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
ExecStop=/usr/bin/screen -S mcserver -X stuff "stop\n"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note 需要 screen
上面的写法借助 `screen` 保留控制台，便于进服敲指令：`sudo apt install -y screen`，之后用 `screen -r mcserver` 回到控制台。
:::

## 常见问题排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `java: command not found` / `'java' 不是内部或外部命令` | 未安装，或 `PATH` 没配好，或窗口没重开 | 检查 `PATH`，**新开**窗口再试 |
| `UnsupportedClassVersionError ... class file version 65.0` | Java 版本过低（65 = Java 21） | 按上表换对应 Java 版本 |
| 双击启动脚本窗口一闪而过 | 报错后窗口自动关闭 | 脚本末尾加 `pause`，或在终端里运行看输出 |
| 启动后立刻退出，日志提示 EULA | 没同意 EULA | 改 `eula.txt` 为 `eula=true` |
| `Address already in use` | 25565 被占用 | Windows：`netstat -ano \| findstr :25565`；Linux：`ss -tlnp \| grep 25565`，查 PID 后结束 |
| `Could not reserve enough space for object heap` | `-Xmx` 超过可用内存 | 调小 `-Xmx`（例如 `-Xmx2G`） |
| 自己 telnet 通、别人连不上 | 只配了本机防火墙，云安全组没放行 | 到云控制台补入站规则 |
| 插件/模组报奇怪的路径错误 | 目录含中文或空格 | 迁到 `C:\mcserver` 或 `/opt/mcserver` 这类纯英文路径 |
| Linux 下 `Permission denied` | 服务端由 root 创建，普通用户无写权限 | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Windows 电脑睡眠后掉线 | 系统休眠中断了服务 | 电源选项设为「从不睡眠」，或改用长期在线的机器 |

## 下一步

环境就绪后即可安装服务端核心：

- **服务端选择**：见 [服务端选择](/tutorials/java/core) —— 按硬件与玩法挑核心（多核低主频选 Folia、单核强选 Paper 系、生电选 Fabric 或 Leaves）
- **逐项对照**：见 [服务端核心对比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) —— 性能、插件、模组、适用场景一览

**开机前再确认两件事**：Java 版本与目标 MC 版本匹配、25565 已在安全组与系统防火墙上都放行。

环境与核心都定好之后，写启动脚本把服务器跑起来：见 [开启服务端](/tutorials/java/start)。
