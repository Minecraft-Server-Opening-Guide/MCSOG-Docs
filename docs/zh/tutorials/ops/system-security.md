---
title: 系统安全加固
slug: system-security
cat: ops
level: 3
order: 6
minutes: 16
tags: [hardening, permissions, systemd, updates, backups, audit, ops]
updated: 2026-10-04
draft: false
---

[网络安全基础](/tutorials/ops/network-security) 解决的是"外面的人能不能进来"。这一篇解决另一个方向的问题：**假设有人已经进来了（或者你就是操作失误了），这台机器能扛住多少。**

系统加固的目标不是"绝对安全"——那不存在——而是**缩小权限、减少入口、留下痕迹**，让一次失误不至于变成整台机器沦陷。

## 一、账号与权限

### 1.1 为什么绝对不要用 root 跑服务端

| 用 root 跑的风险 | 具体后果 |
| --- | --- |
| **漏洞直接等于整机沦陷** | 服务端、插件、模组的漏洞被利用后，攻击者继承的是 root 权限，可以改系统文件、装后门、删光数据 |
| **插件是第三方代码** | 你从论坛下载的 jar 和服务端跑在同一个权限下。**以 root 运行意味着你把整台机器交给了一个陌生作者。** |
| **误操作无法挽回** | 一个写错路径的删除指令，以普通用户运行最多毁掉服务端目录；以 root 运行可能毁掉整个系统 |
| **文件属主混乱** | root 创建的 `world/`、日志、配置文件，普通用户改不动，之后每次维护都要 `sudo`，最终养成"什么都用 root"的坏习惯 |

:::warn 面板以 root 运行不代表服务端也该以 root 运行
很多面板为了管理方便以高权限运行，并替你启动服务端。**这属于面板的信任边界问题，不能作为"服务端就该用 root"的理由。** 如果面板支持指定运行用户，请指定专用用户。
:::

### 1.2 创建专用系统用户

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
```

| 参数 | 作用 |
| --- | --- |
| `-r` | 创建**系统用户**（UID 从系统保留区间分配，通常不创建密码、不过期） |
| `-m` | 同时创建家目录（`-r` 默认**不**创建，必须显式指定） |
| `-d /opt/mcserver` | 指定家目录为 `/opt/mcserver` |
| `mcserver` | 用户名 |

**创建目录并把属主交给它**：

```bash
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo chmod 750 /opt/mcserver
```

`chown -R` 把目录及**已有内容**的属主与属组一并改成 `mcserver`（只在需要递归时用 `-R`）；`chmod 750` 让属主可读写执行、同组可读执行、其他人无权限。用 `id mcserver` 与 `ls -ld /opt/mcserver` 确认用户与目录属主。

:::tip 让专用用户无法登录
如果这个账号只用来跑服务，不需要交互式登录，可以禁止它的 shell：

```bash
sudo usermod -s /usr/sbin/nologin mcserver
```

**注意**：`nologin` 会阻止 `sudo -iu mcserver` 这类切换方式。如果你还需要切进去维护，可以改用 `/bin/bash` 并靠密钥与权限控制，或者在需要时临时改回。**系统上 `nologin` 的路径可能是 `/usr/sbin/nologin` 或 `/sbin/nologin`，先确认再改。**
:::

### 1.3 有意识地使用 sudo

`sudo` 的价值在于**每次提权都留痕**（写入系统日志），并且可以精确到"某个用户只能运行某几条命令"。

- **不要 `sudo su -` 然后一直待在里面**。这会丢掉"哪条命令是谁在什么时候跑的"这一层记录。
- **按需提权**：单条命令用 `sudo 命令`，不要整段会话都在 root 下。
- **用 `visudo` 编辑 sudoers**。它会做语法检查；直接改 `/etc/sudoers` 写错一个字符就可能让所有人都无法提权。

```bash
sudo visudo
```

**推荐的做法**：不直接改 `/etc/sudoers` 主文件，而是在 `/etc/sudoers.d/` 下放独立片段，并用 `sudo visudo -f /etc/sudoers.d/mcadmin` 编辑以获得语法检查。片段里可以精确到命令，例如只允许某个管理员重启服务端：

```
mcadmin ALL=(root) /usr/bin/systemctl restart minecraft
mcadmin ALL=(root) /usr/bin/systemctl status minecraft
```

**审计谁有 sudo 权限**：

```bash
getent group sudo    # Debian / Ubuntu 的 sudo 组
getent group wheel   # RHEL 系的 wheel 组
sudo grep -rHv '^#\|^$' /etc/sudoers /etc/sudoers.d/
```

:::warn 定期复查，而不是配完就忘
**离职的管理、临时帮忙的朋友、早期测试时加的账号**，都会长期留在 sudo 组里。建议每隔一段时间复查一次，把不再需要的人移除（`sudo deluser 用户名 sudo` 或 `sudo gpasswd -d 用户名 wheel`）。
:::

### 1.4 停用不需要的账号

- **检查所有可登录账号**（能拿到 shell 的账号才是真正的入口）：

```bash
awk -F: '$7 !~ /(nologin|false)$/ {print $1, $3, $7}' /etc/passwd
```

- **锁定不再需要的账号**：

```bash
sudo usermod -L 用户名          # 锁定密码
sudo usermod -s /usr/sbin/nologin 用户名   # 同时禁止登录
```

- **重点排查**：`/etc/passwd` 里 UID 为 `0` 的账号**只能有 `root` 一个**。多出来的就是后门：

```bash
awk -F: '$3 == 0 {print $1}' /etc/passwd
```

## 二、文件权限：最小权限落到目录上

### 2.1 先理解权限位

`ls -l` 输出的第一列，如 `-rwxr-x---`，分成三组：**属主 / 属组 / 其他人**，每组三位（读 `r`=4、写 `w`=2、执行 `x`=1）。

| 权限 | 数字 | 适用 |
| --- | --- | --- |
| `rwx------` | `700` | 只有属主可用的私有目录 |
| `rwxr-x---` | `750` | 服务端根目录：属主可写，同组可进入，其他人完全不可见 |
| `rw-r-----` | `640` | 属主读写、同组只读的配置文件 |
| `rw-------` | `600` | **含口令的文件**，只有属主能看 |
| `rwxrwxrwx` | `777` | **任何时候都不要** |

### 2.2 为什么 `777` 是危险的

`chmod -R 777` 是网上流传最广的"万能解法"——遇到 `Permission denied` 就 777。它的实际含义是：**系统上任何一个用户、任何一个被攻陷的服务进程，都可以读取、修改、删除这个目录里的一切。**

| 后果 | 说明 |
| --- | --- |
| **任何本地账号都能改服务端** | 一个被攻陷的低权限服务（比如某个 Web 应用）可以直接往 `plugins/` 里塞一个后门 jar，等下次重启就生效 |
| **口令文件对所有人可见** | `server.properties` 里的 RCON 口令、`.env` 里的数据库密码一览无余 |
| **存档可被任意破坏** | 任何进程都能删除 `world/` |
| **掩盖真正的问题** | 权限报错的根因通常是"属主错了"，`777` 只是把症状盖住，问题还在 |

:::warn 正确的修法不是放宽权限，而是修属主
遇到 `Permission denied`，先看**是谁在跑、要动哪个文件**：

```bash
ls -l /opt/mcserver/survival/server.properties
```

如果属主是 `root`，而服务以 `mcserver` 运行，正确做法是：

```bash
sudo chown mcserver:mcserver /opt/mcserver/survival/server.properties
```

**不是** `chmod 777`。**递归改权限（`chmod -R 777`）在服务器上是高危操作，请勿执行。**
:::

### 2.3 服务端目录的推荐权限

```bash
# 整个服务端目录归专用用户所有
sudo chown -R mcserver:mcserver /opt/mcserver

# 属主全权；同组只读进入；其他人无权限
sudo chmod -R u=rwX,g=rX,o= /opt/mcserver

# 目录本身不要给其他人任何权限
sudo chmod 750 /opt/mcserver
```

`u=rwX,g=rX,o=` 是**符号模式**：`X`（大写）表示"对目录，或对已经有执行位的文件，才加执行权限"，比无脑 `-R 755` 更贴合"文件不该可执行"的原则。**不要用 `chmod -R 777`，也不要在服务端目录上使用 `o+w`（其他人可写）。**

### 2.4 重点保护的对象

| 对象 | 为什么 | 建议 |
| --- | --- | --- |
| `world/`、`world_nether/`、`world_the_end/` | 存档是玩家投入的全部，被破坏就无法挽回 | 属主 `mcserver`，其他人零权限；**定期离线备份**（见第五节） |
| `server.properties` | 含 RCON 口令、端口、`online-mode` 等关键开关 | `640`，属主 `mcserver` |
| `.env`、含口令的脚本 | 数据库口令、API Key | **`600`**，只有属主可读写 |
| `ops.json`、`whitelist.json` | 决定谁能拿到管理员权限 | `640`，改动后复查内容 |
| 私钥文件（`id_ed25519` 等） | 泄露等于交出登录权 | **`600`**，`.ssh` 目录 `700` |
| 备份文件 | 往往包含完整口令与存档 | **不要放在 Web 可访问目录**；异地一份 |

```bash
# 凭据文件只给属主
chmod 600 /opt/mcserver/survival/.env
ls -l /opt/mcserver/survival/.env
# 期望：-rw------- 1 mcserver mcserver ... .env
```

:::note 备份会改变权限，恢复时要还原属主
用 `cp -a`、`tar`、`rsync -a` 之类**保留属性**的方式备份，恢复后属主和权限才是对的。如果只拷了内容，恢复后可能变成 root 属主，服务端又写不了存档——恢复后记得用 `ls -ld` 检查一次。
:::

## 三、系统更新

**绝大多数入侵利用的是"已经修好、但你没打补丁"的漏洞。** 保持更新是所有加固措施里性价比最高的一条。

### 3.1 安全更新自动化的概念

自动更新的思路是：**安全补丁自动装，其余更新你自己决定**。

| 发行版 | 工具 | 配置文件 |
| --- | --- | --- |
| Ubuntu / Debian | `unattended-upgrades` | `/etc/apt/apt.conf.d/20auto-upgrades`、`/etc/apt/apt.conf.d/50unattended-upgrades` |
| RHEL / Rocky / AlmaLinux / Fedora | `dnf-automatic` | `/etc/dnf/automatic.conf` |

**Ubuntu / Debian**：

```bash
sudo apt update
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

`20auto-upgrades` 的常见内容：

```ini
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

- `Update-Package-Lists "1"`：每天刷新一次软件包索引。
- `Unattended-Upgrade "1"`：每天自动安装符合条件的升级（**默认只包含安全更新**，具体范围由 `50unattended-upgrades` 里的 `Unattended-Upgrade::Allowed-Origins` 决定）。

**RHEL 系**：

```bash
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer
```

`/etc/dnf/automatic.conf` 中与"只装安全更新、自动应用"相关的常见设置：

```ini
[commands]
upgrade_type = security
apply_updates = yes
```

**验证是否在运行**：`systemctl status unattended-upgrades`（Debian / Ubuntu）或 `systemctl status dnf-automatic.timer`（RHEL 系）。

:::warn 具体配置项与默认值随版本变化
上面只是常见写法。**不同发行版、不同版本里配置文件名、选项名与默认范围都可能不同**（例如"是否包含非安全更新""是否自动清理旧内核"）。改之前请对照你所使用版本的官方文档，并用 `systemctl status` 确认服务真的在跑。**配置了不等于生效了。**
:::

### 3.2 不要盲目自动重启

自动更新**安装**补丁和**重启**是两件事。内核、glibc、systemd 这类组件的更新**只有重启后才真正生效**。**不要开无条件自动重启**，原因是：

- **游戏服有玩家**。半夜重启会让正在玩的玩家掉线，可能丢进度，也可能触发存档问题。
- **重启失败等于长时间宕机**。如果新内核与你的驱动或环境不兼容，机器起不来，而你可能第二天才发现。
- **重启后服务端不一定自己起来**。这取决于服务是否 `enable`（见第四节）。

**推荐做法**：

| 做法 | 说明 |
| --- | --- |
| **维护窗口** | 固定一个玩家最少的时间段（比如周二凌晨），提前公告，手动重启 |
| **先通知再重启** | 用服务端指令广播倒计时，让玩家安全下线 |
| **保留旧内核** | 不要自动删除旧内核，出问题时可以回退 |
| **重启后立即验证** | 服务是否在跑、端口是否可达、日志有无异常 |

用 `[ -f /var/run/reboot-required ] && cat /var/run/reboot-required`（Debian / Ubuntu）或 `sudo dnf needs-restarting -r`（RHEL 系）检查是否在等待重启。

:::tip 先重启一次，确认它能自己起来
在**没有玩家**的时候手动重启一次机器，验证"服务开机自启"确实有效。**没验证过的自启等于没有自启。**
:::

## 四、服务加固（systemd）

### 4.1 一个基本的 unit

`/etc/systemd/system/minecraft.service`：

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
Type=simple
User=mcserver
Group=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

| 指令 | 作用 |
| --- | --- |
| `User=` / `Group=` | **以专用用户运行**。不写就默认以 root 运行——这是最常见的加固漏洞。 |
| `WorkingDirectory=` | 服务端的工作目录。相对路径（`world/`、`plugins/`）都以它为基准。 |
| `ExecStart=` | 启动命令。**必须写绝对路径**，systemd 不解析 `PATH`。 |
| `Restart=on-failure` | 异常退出时重启。正常 `stop` 不触发。 |
| `RestartSec=10` | 重启前等待 10 秒，避免崩溃时空转刷屏。 |

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note 现有教程里的 unit 使用了 screen
[环境准备](/tutorials/java/environment) 中的示例借助 `screen` 保留控制台，便于进服敲指令。**两种写法都可以**；本文的示例用 `Type=simple` 直接运行 Java 进程，更适合叠加下面的加固选项。**注意：`screen` 与 `ProtectSystem=strict` 这类加固组合时，要确认 `screen` 需要的 socket 目录可写。**
:::

### 4.2 资源限制

限制资源既防"内存泄漏拖垮整机"，也防"被攻击时把机器吃满"。

```ini
[Service]
LimitNOFILE=65535
MemoryMax=6G
```

| 指令 | 作用 | 注意 |
| --- | --- | --- |
| `LimitNOFILE` | 可打开的文件描述符上限 | 玩家多、区块加载多时，默认值可能不够，表现为"连接被拒绝"或莫名其妙的 IO 错误 |
| `MemoryMax` | 该服务的**内存硬上限** | 超过会被内核 OOM 杀掉。**必须明显大于 `-Xmx`**，因为 JVM 自身、元空间、线程栈、直接内存都在这之外 |

:::warn `MemoryMax` 设得比 `-Xmx` 还小是典型错误
`-Xmx4G` 只限制 Java 堆。一个堆上限 4G 的 Minecraft 服务端，**实际常驻内存可能到 5G 以上**。如果 `MemoryMax` 设成 `4G`，服务会被反复杀掉重启，而你从日志里只能看到"进程突然消失"。

**建议**：`MemoryMax` 至少留出 30% 余量（例如 `-Xmx4G` 配 `MemoryMax=6G`），并观察 `systemctl status` 里的实际内存占用再调整。
:::

### 4.3 限制权限与保护文件系统

这些指令让服务**只能碰它该碰的东西**。即使服务端或插件被攻陷，攻击者能造成的破坏也被框住了。

```ini
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/mcserver/survival
```

| 指令 | 作用 |
| --- | --- |
| `NoNewPrivileges=yes` | 禁止进程通过 setuid / setgid 程序提权。**几乎无副作用的加固项，建议都加上。** |
| `PrivateTmp=yes` | 给服务一份**私有的 `/tmp` 与 `/var/tmp`**，看不到也影响不到其他进程的临时文件 |
| `ProtectSystem=strict` | 把**整个文件系统挂载为只读**（`/dev`、`/proc`、`/sys` 除外）。服务只能写 `ReadWritePaths` 里列出的路径 |
| `ProtectHome=yes` | 让 `/home`、`/root`、`/run/user` 对服务**不可见**（相当于空目录） |
| `ReadWritePaths=` | 与 `ProtectSystem=strict` 配合，**显式列出允许写入的路径**。**不加这一条，服务端连存档都写不了。** |

:::warn 加了 `ProtectSystem=strict` 之后服务起不来，先看这里
常见原因：

1. **忘了 `ReadWritePaths`**，或者路径写错（必须是绝对路径，且与 `WorkingDirectory` 一致）。
2. **备份脚本或插件要写别处**（比如 `/var/log`、`/srv`），需要一并加进 `ReadWritePaths`。
3. **Java 需要写临时目录**：`PrivateTmp=yes` 一般已经够用，但如果服务端显式配置了某个固定临时路径，要把它也加进去。

**排查方法**：`sudo systemctl status minecraft` 和 `sudo journalctl -u minecraft -n 100` 会直接给出"权限被拒绝"的路径。
:::

:::note 加固选项的可用性取决于 systemd 版本
上面这些指令在较新的 systemd 上都可用，但**具体支持情况随版本变化**。用 `systemd-analyze security minecraft.service` 可以查看服务实际生效的沙箱设置：它给出一个"暴露程度"评分和逐项说明，比凭感觉加指令可靠得多。不同版本的评分标准与项目名可能不同，**以你系统上的实际输出为准**。
:::

## 五、备份也是安全控制

前面几节防的是"系统被控制"，但还有两类威胁，**任何加固都挡不住**：

| 威胁 | 表现 |
| --- | --- |
| **勒索软件** | 加密你能访问到的所有文件。**挂载在同一台机器上的备份会被一起加密。** |
| **内部破坏 / 误操作** | 管理员或插件一条 `rm -rf`，或者恶意的"合作者"删库跑路 |

**结论：备份的意义不只是"防硬件故障"，它是唯一能对抗勒索与破坏的手段——前提是备份不在攻击者能碰到的地方。**

| 原则 | 做法 |
| --- | --- |
| **离线** | 至少有一份备份在**平时不挂载、不联网**的介质上（外置硬盘、对象存储的快照） |
| **异地** | 本机磁盘坏了、机房出事了，本地备份一起消失 |
| **版本化** | 只留最新一份，遇到"存档早就坏了但没发现"就无解 |
| **权限** | 备份文件里通常有完整口令与存档，**不要放在 Web 可访问目录**，权限按第二节收紧 |

具体操作（一致性备份、`save-off` / `save-on`、保留策略、恢复流程）见 [备份与恢复](/tutorials/java/backup)。**没验证过恢复的备份不算备份。**

:::warn 备份目录不要给服务端写权限
如果服务端进程（或它加载的插件）能写备份目录，那么一个被攻陷的插件就能**删掉或加密你的所有备份**。把备份目录放在服务端目录之外，并且**不授予服务账号写权限**。
:::

## 六、审计与日常卫生

加固不是一次性动作。下面这些检查建议**定期跑一遍**，或者至少在你改动过系统之后跑一遍。

### 6.1 检查清单与命令

| 检查项 | 命令 | 期望结果 |
| --- | --- | --- |
| **监听端口** | `sudo ss -tlnp` | 只有你知道的服务在监听；陌生端口要查清 |
| **UDP 监听** | `sudo ss -ulnp` | 同上（基岩版 / Geyser 用 UDP） |
| **失败登录** | `sudo lastb \| head` | 大量记录说明在被爆破（需要 root；部分系统默认不记录） |
| **成功登录** | `last -n 20` | 没有你不认识的用户或来源 IP |
| **UID 0 账号** | `awk -F: '$3 == 0 {print $1}' /etc/passwd` | 只有 `root` |
| **可登录账号** | `awk -F: '$7 !~ /(nologin\|false)$/ {print $1, $7}' /etc/passwd` | 只有你认识的人 |
| **sudo 权限** | `getent group sudo` / `getent group wheel` | 没有离职或临时账号 |
| **计划任务** | `sudo crontab -l`、`ls -l /etc/cron.*`、`systemctl list-timers --all` | 没有你没建过的任务 |
| **systemd 单元** | `systemctl list-units --type=service --state=running` | 没有陌生服务 |
| **未使用软件包** | `sudo apt autoremove --dry-run` / `sudo dnf autoremove` | 确认要删的确实是没用的 |
| **服务沙箱评分** | `systemd-analyze security minecraft.service` | 评分越低越好，逐项看建议 |

:::warn 陌生条目要当真
- **没建过的 cron 任务或 systemd 单元**：可能是持久化后门，也可能是某个软件包自带的——**先查清来源再决定删不删**。
- **陌生监听端口**：先 `sudo ss -tlnp` 找到进程 PID，再 `ps -p PID -o pid,user,cmd` 看它是什么。
- **陌生账号**：不要直接删，先看家目录、`authorized_keys` 和登录记录，判断是不是已经被用了。
:::

### 6.2 最小化安装面

**装的软件越少，可能被利用的漏洞就越少。**

- **不装桌面环境**。云服务器上装桌面会带来大量不必要的服务与端口（见 [操作系统的选择](/tutorials/java/os)）。
- **不装用不到的服务**：FTP、Samba、打印服务、数据库（如果服务端用不到）。
- **确认服务状态**：不需要的服务应该 `disable` 且 `stop`，而不是"装着但没启动"——它可能被依赖链拉起来。用 `systemctl is-enabled 服务名` 查看，用 `sudo systemctl disable --now 服务名` 停用。

### 6.3 一页速查

- [ ] 服务端以**专用用户**运行，不以 root（用 `ps -o user,cmd -C java` 或 `systemctl status` 确认）
- [ ] 服务端目录属主正确，**没有 777**
- [ ] 含口令的文件权限为 **600**，且不在 Web 目录、不在 Git 仓库里
- [ ] 自动安全更新已启用并**确认在运行**；**没有**开启无条件自动重启
- [ ] systemd unit 设置了 `User=`、`WorkingDirectory=`、`Restart=`
- [ ] 已配置 `LimitNOFILE`，且 `MemoryMax` **明显大于** `-Xmx`
- [ ] 已按需启用 `NoNewPrivileges`、`PrivateTmp`、`ProtectSystem`、`ReadWritePaths`
- [ ] 重启过一次机器，确认**服务能开机自启**
- [ ] 有**离线 / 异地**备份，且服务账号**无法写**备份目录
- [ ] 已把上面的审计命令排进定期复查

## 下一步

- 网络层面的防护（端口、防火墙、SSH）：见 [网络安全基础](/tutorials/ops/network-security)
- 备份与恢复的具体操作：见 [备份与恢复](/tutorials/java/backup)
- 服务端与插件的安全配置：见 [[JAVA] 安全插件](/tutorials/ops/security-java) 与 [[BE] 安全插件](/tutorials/ops/security-be)
- 防破坏与记录：见 [反作弊与防破坏](/tutorials/java/anticheat)

---

> 命令与配置以各软件官方文档为准。不同发行版的软件包名、服务名、systemd 版本与配置项默认值可能存在差异，请以你系统上的实际输出为准。
