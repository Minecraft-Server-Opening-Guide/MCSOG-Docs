---
title: 日志管理与轮转
slug: logs
cat: ops
level: 3
order: 18
minutes: 14
tags: [日志, logrotate, journald, Docker, 磁盘空间, syslog, 维护, 排错]
updated: 2026-10-04
draft: false
---

**日志是排查问题的唯一证据，也是把服务器写满磁盘的头号嫌疑人。** 服务端、插件、代理、面板、systemd、Docker、nginx 都会往磁盘上写字，而它们默认几乎都不设上限。这一篇讲清楚：日志都在哪、怎么先量再治、logrotate 的正确写法、journald 与 Docker 的容量限制，以及一套可以照着做的维护清单。

排查具体故障时怎么读日志，见 [监控与告警](/tutorials/ops/monitoring)；把日志和存档一起送出机房，见 [异地备份](/tutorials/ops/offsite-backup)。

## 1. 一台 Minecraft 主机上到底有哪些日志

先把"日志"这个词拆开。绝大多数"磁盘莫名其妙满了"的事故，元凶并不在 `logs/latest.log`。

| 来源 | 典型路径 | 说明 |
| --- | --- | --- |
| 服务端主日志 | `logs/latest.log` | 当前正在写的日志，UTF-8，Linux 下 LF 行尾、Windows 下 CRLF |
| 服务端历史日志 | `logs/YYYY-MM-DD-N.log.gz` | 核心自己轮转出来的旧日志，gzip 压缩 |
| 崩溃报告 | `crash-reports/crash-YYYY-MM-DD_HH.MM.SS-server.txt` | 一次崩溃一个文件，堆栈很长，单个几百 KB 到几 MB |
| 插件日志 | `plugins/<插件>/logs/*.log`、`plugins/<插件>/*.log` | **位置因插件而异**，有的写在插件目录，有的直接写进服务端 `logs/` |
| 代理端日志 | `<代理目录>/logs/latest.log` | Velocity / BungeeCord 有自己独立的工作目录与 `logs/` |
| systemd 单元日志 | `journalctl -u minecraft.service` | 用 systemd 托管时，stdout/stderr 默认进 journal |
| 系统日志 | `/var/log/syslog`、`/var/log/messages`、`/var/log/kern.log` | 发行版不同名字不同 |
| 登录与安全日志 | `/var/log/auth.log`（Debian 系）、`/var/log/secure`（RHEL 系） | SSH 爆破痕迹都在这里，公网机器会长得很快 |
| nginx 日志 | `/var/log/nginx/access.log`、`error.log` | 面板、地图、网页代理走 nginx 时必然有 |
| 面板日志 | 面板自己的目录 | MCSManager、Pterodactyl 等面板各自写日志，还常常写数据库 |
| Docker 日志 | `/var/lib/docker/containers/<容器ID>/<容器ID>-json.log` | 默认 `json-file` 驱动，**默认不轮转** |
| JVM 侧文件 | `logs/gc.log`、`hs_err_pid<pid>.log`、`*.jfr` | 开了 GC 日志、JFR 或 JVM 崩溃时产生，容易被忘记 |

:::note 别忘了 JVM 自己写的东西
`-Xlog:gc*:file=logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M` 这类启动参数会在 `logs/` 里再放一份 GC 日志；JVM 崩溃时还会在工作目录丢下 `hs_err_pid<pid>.log`。它们不在 Minecraft 的轮转体系里，要单独处理。
:::

## 2. 日志为什么能把服务器写死

日志增长有三种典型形态，第三种最危险：

1. **正常增长**：玩家进进出出、插件按天写记录，慢慢变大。
2. **突发增长**：公网机器被扫描、被压测、被刷连接，每个连接都可能写一行。
3. **循环刷屏**：某个插件在 `onTick` 里抛异常，或者某个任务每秒失败一次——**每秒 20 行**，一天就是约 170 万行，按每行 150 字节算，**约 250 MB/天**，而且它不会自己停。

磁盘写满不是"日志大了点"这么简单，它会连带摧毁别的东西：

:::warn 磁盘写满的症状：存档、插件、面板一起出事
- **存档保存失败**：日志里出现 `Failed to save chunk`、`java.io.IOException: No space left on device`，玩家掉线、区块回滚。
- **插件写配置/数据库失败**：SQLite 报 `database or disk is full`，MySQL 报 `Disk full`，权限组、经济、领地数据可能半写坏。
- **服务端在最糟的时刻死掉**：关服时 `level.dat` 写不进去，或者进程直接崩，重启后世界状态与最后一次成功保存之间出现断层。
- **面板和 SSH 一起失灵**：面板写不了日志和 session，你连"上去看看"的入口都没有。
- **inode 也可能被吃光**：`df -h` 显示还有空间，但 `df -i` 已经 100%，表现和磁盘满一样。
:::

:::tip 日志目录和存档目录尽量不要放在同一个分区
如果条件允许，把 `logs/`（或整个日志挂载点）放到独立分区或独立盘上。这样即使日志失控，存档仍然写得进去，最坏情况只是丢日志而不是丢存档。
:::

## 3. 先量后治：四条命令看清现状

动手之前先测量。以下命令都只读，不会破坏任何东西。

```bash
# 1) 服务端日志目录有多大
du -sh /opt/minecraft/server/logs

# 2) 磁盘还剩多少空间、还剩多少 inode
df -h
df -i

# 3) journald 占了多少（用 systemd 托管时必看）
journalctl --disk-usage

# 4) 找出所有超过 100 MB 的日志类文件
find /opt/minecraft/server -type f -name '*.log*' -size +100M

# 补充：整机上哪个目录最占地
sudo du -x -h -d 1 /var | sort -h | tail -n 10
```

读结果时注意三件事：

- `du -sh` 看的是**当前占用**，`find ... -size +100M` 找的是**单个大文件**，两者结合才能区分"很多小文件"和"一个怪物文件"。
- `df -i` 的 `IUse%` 到 100% 时，即使 `df -h` 显示有剩余空间，服务端一样写不进任何东西。
- `journalctl --disk-usage` 的输出是 journal 目录的实际占用；它不受 `du -sh logs/` 影响，很容易被漏掉。

## 4. Minecraft 自己的日志保留策略

服务端核心自己会做一层轮转：当前的 `latest.log` 被滚成带日期的 `YYYY-MM-DD-N.log.gz`，`N` 是当天的序号。

**保留多少份、以及能不能配置，完全取决于核心。** 有的核心只留最近若干份且不提供开关，有的核心在配置文件里给了键值，键名和默认值各不相同。这里不做猜测：**请以你所使用核心的官方文档与配置文件为准**，在核心目录里搜 `log` 相关配置项，或者直接查核心文档的"日志"章节。

如果核心不提供保留数量设置，就把它交给系统层的 logrotate 或清理脚本（下面几节）。另外注意：`crash-reports/` 里的崩溃报告**不参与**核心的日志轮转，崩溃循环时会无限堆积。

## 5. 用 logrotate 管住 logs/

logrotate 是 Linux 上管理日志轮转的标准工具，几乎所有发行版都预装了它，并且默认通过 `logrotate.timer`（或 cron）每天运行一次。配置放在 `/etc/logrotate.d/` 下的一个文件里。

### 5.1 完整的示例配置

```conf
# /etc/logrotate.d/minecraft
# 注意：本文件不能是 group 或 world 可写，否则 logrotate 出于安全会拒绝加载。

/opt/minecraft/server/logs/latest.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su minecraft minecraft
}

# 可选：插件自己写的日志，路径按实际情况调整
/opt/minecraft/server/plugins/*/logs/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

把 `/opt/minecraft/server` 和 `minecraft` 换成你机器上的真实路径与用户名。第二个块里的通配符是安全的：轮转后的文件会变成 `*.log.1` 或 `*.log.1.gz`，不会再被 `*.log` 匹配到。

### 5.2 每条指令在做什么

| 指令 | 作用 |
| --- | --- |
| `daily` | 每天轮转一次（前提是 logrotate 本身每天被触发，发行版默认如此） |
| `rotate 14` | 保留 14 份历史，第 15 份（最旧的）被删除 |
| `compress` | 历史文件用 gzip 压缩，通常能省下 90% 以上的空间 |
| `delaycompress` | 刚轮转出来的那一份**先不压缩**，等下一次轮转时再压 |
| `missingok` | 文件不存在时不报错（服务端还没启动、或换了目录时很有用） |
| `notifempty` | 文件为空时不轮转，避免制造一堆空归档 |
| `copytruncate` | **先复制、再把原文件原地清空**，而不是把文件改名 |
| `su minecraft minecraft` | 以指定用户/组身份执行轮转；当日志目录属于服务端用户时推荐加上 |

### 5.3 为什么 copytruncate 对运行中的服务端很重要

默认的轮转方式是 **rename**：logrotate 把 `latest.log` 改名成 `latest.log.1`，然后（按 `create` 指令）新建一个空的 `latest.log`。问题在于 **Java 进程在启动时已经拿到了那个文件的句柄**：改名之后，服务端仍然往"已经被改名的那个文件"里写，新的 `latest.log` 永远是空的，日志看起来"消失"了，直到服务端重启。

`copytruncate` 换了一种做法：**先复制一份内容，再把原文件截断为 0 字节**。inode 没变，服务端继续往同一个文件句柄写，新日志自然出现在 `latest.log` 里，不需要重启服务端。

它的代价必须说清楚：

- 在"复制完成"和"截断"之间存在一个极短的时间窗，**这期间新写入的少量日志会丢失**（通常只有几行）。
- 因此 `copytruncate` 与 `create` 互斥（原文件不动，所以没有新建动作）。
- 如果日志重要到一行都不能丢，正确做法是让服务端自己重开日志文件（多数核心没有这个信号接口），或者接受这几行的损失——对 Minecraft 服务端来说，这几行通常可以接受。

:::tip 顺带一提：delaycompress 是为了配合 copytruncate
有些程序在轮转后的一小段时间里仍然持有旧文件句柄并继续写入。`delaycompress` 让刚轮转出来的 `latest.log.1` 保持未压缩状态，避免"边写边压"导致归档损坏，下一次轮转再压。
:::

### 5.4 验证与排错

改完配置后**先干跑，不要直接等第二天**：

```bash
# 干跑：只打印将要做什么，不实际改动文件
sudo logrotate -d /etc/logrotate.d/minecraft

# 确认无误后强制跑一次，立刻验证结果
sudo logrotate -f /etc/logrotate.d/minecraft

# 看结果：应出现 latest.log 与 latest.log.1（或 .1.gz）
ls -lh /opt/minecraft/server/logs
```

常见坑：

- **配置没生效**：确认系统里跑的是 `logrotate.timer`，用 `systemctl list-timers logrotate.timer` 检查。
- **报权限错误**：`/etc/logrotate.d/minecraft` 不能是 group/world 可写；日志目录要能被 `su` 指定的用户写入。
- **`/etc` 或 `/usr` 下的日志转不动**：发行版的 `logrotate.service` 默认带 `ProtectSystem=full`，会阻止修改这两个目录下的文件——所以服务端和日志放在 `/opt`、`/srv` 这类位置更省事。
- **文件还在变大却没轮转**：`notifempty` 不会阻止有内容的文件轮转，但如果 `daily` 生效前提是"上次轮转时间"，用 `-d` 的输出能看到判定逻辑。

## 6. systemd 与 journald 的容量上限

用 systemd 托管服务端时，stdout/stderr 默认被 journald 收走。journald 有全局上限，配置在 `/etc/systemd/journald.conf`：

```ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1month
```

| 配置项 | 含义 |
| --- | --- |
| `Storage=` | `persistent` 落盘到 `/var/log/journal`，`volatile` 只在内存，`auto` 看目录是否存在，`none` 不存储 |
| `SystemMaxUse=` | journal 在磁盘上最多占多少（默认约为文件系统的 10%，上限 4G） |
| `SystemMaxFileSize=` | 单个 journal 文件的上限（默认约为 `SystemMaxUse` 的 1/8，上限 128M） |
| `MaxRetentionSec=` | 条目最长保留多久，`0` 表示关闭时间维度的删除 |
| `SystemKeepFree=` | 至少给别的用途留出多少空间；journald 取它与 `SystemMaxUse` 中更严格的一个 |

改完要重启服务并手工回收一次：

```bash
sudo systemctl restart systemd-journald

# 看当前占用
journalctl --disk-usage

# 手工回收（三选一，也可组合）
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-files=20
```

:::warn journald 只删"已归档"的文件
`--vacuum-*` 和 `SystemMaxUse=` 都只删除**已归档**的 journal 文件，当前正在写的活动文件不会被删。所以回收后占用**可能仍然略高于你设定的上限**，这是正常现象，不是配置没生效。
:::

## 7. Docker 容器日志轮转

Docker 默认的 `json-file` 驱动**不做任何轮转**：容器跑得越久，`/var/lib/docker/containers/<ID>/<ID>-json.log` 越大，而且它是被 Docker 守护进程持有的文件句柄，直接 `rm` 不会立刻释放空间。

单个容器启动时限制：

```bash
docker run -d --name mc \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  your-minecraft-image
```

守护进程级别的默认值，写进 `/etc/docker/daemon.json`：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

改完需要重启守护进程，并且**已经存在的容器要重建才会生效**：

```bash
sudo systemctl restart docker

# 查看某个容器当前的日志配置与日志文件路径
docker inspect --format='{{.HostConfig.LogConfig}}' mc
docker inspect --format='{{.LogPath}}' mc

# 紧急情况下先截断再慢慢排查（对运行中的容器也有效）
sudo truncate -s 0 "$(docker inspect --format='{{.LogPath}}' mc)"

# 日常看日志
docker logs --tail 200 -f mc
docker system df
```

用 Docker Compose 时写在服务下：

```yaml
services:
  mc:
    image: your-minecraft-image
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## 8. nginx、面板与代理的日志

- **nginx**：`/var/log/nginx/access.log` 与 `error.log`。发行版的 nginx 包**自带** logrotate 配置，通常已经轮转；如果面板被公网扫描，`access.log` 会异常膨胀，可以考虑把静态资源关掉访问日志，或单独为面板站点指定日志文件并加 `maxsize 200M`。
- **面板**：面板自己的日志目录 + 数据库。面板日志通常不在你的 `logs/` 里，别以为清了 `logs/` 就万事大吉。
- **代理端**：Velocity / BungeeCord 各有独立工作目录与 `logs/`，需要**单独**加一份 logrotate 块或清理规则。
- **反代与面板的访问日志里含有玩家 IP**：这类日志在集中化和外发时要按隐私数据处理，参考 [系统安全](/tutorials/ops/system-security)。

## 9. 把日志集中到一处（可选）

单机排查够用，但机器一多、或者想要"机器挂了日志还在"，就需要集中化。

**方式 A：rsyslog 转发**（传统 syslog 体系，简单直接）

```conf
# /etc/rsyslog.d/50-forward.conf
# @@ 表示 TCP，@ 表示 UDP；生产环境用 TCP
*.* @@10.0.0.5:514
```

接收端也要跑 rsyslog（并允许来自该主机的连接）。日志里有玩家名、IP 和可能的聊天内容，**只在可信网络里转发，或加 TLS/RELP**。

**方式 B：journald 转发**（systemd 体系）

```ini
# /etc/systemd/journald.conf
[Journal]
ForwardToSyslog=yes
ForwardToSocket=10.0.0.5:4444
```

接收端用 `systemd-journal-remote` 收取。注意官方文档的提醒：**转发是同步进行的**，接收端慢会拖住 journald，进而拖住写日志的服务——生产环境慎用 `ForwardToConsole=`，同理也要评估 `ForwardToSocket=`。

**方式 C：定期搬运**（最省事，也最不容易出事）

把 `logs/`、`crash-reports/` 用 `rsync` / `rclone` 每天同步到另一台机器或对象存储，保留若干天。它不实时，但不需要常驻服务，也不会影响服务端性能，具体做法见 [异地备份](/tutorials/ops/offsite-backup)。

## 10. 高效检索日志

日志动辄几个 GB，检索策略比命令本身更重要：**先用时间范围或文件名把范围缩小，再做文本匹配。**

| 目的 | 命令 |
| --- | --- |
| 实时跟踪当前日志 | `tail -f logs/latest.log` |
| 看最后 200 行 | `tail -n 200 logs/latest.log` |
| 带行号找异常 | `grep -n "Exception" logs/latest.log` |
| 统计出现次数 | `grep -c "OutOfMemoryError" logs/latest.log` |
| 在压缩日志里搜 | `zgrep -n "Exception" logs/2026-10-01-1.log.gz` |
| 跨所有历史日志搜 | `zgrep -c "Exception" logs/*.log.gz` |
| 按时间范围查单元日志 | `journalctl -u minecraft.service --since "2026-10-01" --until "2026-10-02"` |
| 只看警告及以上 | `journalctl -u minecraft.service -p warning -n 100 --no-pager` |
| 实时跟随单元 | `journalctl -u minecraft.service -f` |
| 内容过滤（systemd 237+） | `journalctl -u minecraft.service -g "Exception" --since today` |
| 看上一次开机的日志 | `journalctl -b -1` |

几个实战习惯：

- **别在 5 GB 的 `latest.log` 上直接 `grep`**：先 `tail -n 5000` 或按日期挑 `*.log.gz`，速度差一个数量级。
- `zgrep` 直接读 `.gz`，不要先 `gunzip`——解压出来的文件会再占一份磁盘，在磁盘已经告急时尤其危险。
- 用 `journalctl -o short-iso` 让时间戳带时区，跨机器比对时不会算错。
- 定位到某个插件的刷屏后，**先处理根因**（关掉调试、升级插件、临时禁用），再清日志，否则清完还会长回来。

## 11. 清理脚本与定时任务

logrotate 管的是"轮转"，还需要一个脚本处理它管不到的东西：核心自己轮转出的 `.log.gz`、堆积的崩溃报告、以及体积告警。

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-log-cleanup.sh
set -euo pipefail

SERVER_DIR="/opt/minecraft/server"
LOG_DIR="$SERVER_DIR/logs"
CRASH_DIR="$SERVER_DIR/crash-reports"

# 1) 删除核心自己轮转出来的、超过 30 天的压缩日志
find "$LOG_DIR" -type f -name '*.log.gz' -mtime +30 -delete

# 2) 崩溃报告只保留最新的 20 份
if [ -d "$CRASH_DIR" ]; then
    ls -1t "$CRASH_DIR"/crash-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f
fi

# 3) 把仍然超过 100 MB 的日志列出来，交给人工确认
find "$SERVER_DIR" -type f -name '*.log*' -size +100M -exec ls -lh {} +
```

```bash
chmod +x /usr/local/bin/mc-log-cleanup.sh
```

**用 cron 定时（每天 04:15）：**

```bash
# crontab -e  （或用 /etc/cron.d/mc-log-cleanup，注意后者需要写用户名）
15 4 * * * /usr/local/bin/mc-log-cleanup.sh >> /var/log/mc-log-cleanup.log 2>&1
```

**用 systemd timer 定时（推荐，有日志、可查状态、错过的执行可补跑）：**

```ini
# /etc/systemd/system/mc-log-cleanup.service
[Unit]
Description=Clean up Minecraft server logs

[Service]
Type=oneshot
User=minecraft
Group=minecraft
ExecStart=/usr/local/bin/mc-log-cleanup.sh
```

```ini
# /etc/systemd/system/mc-log-cleanup.timer
[Unit]
Description=Run Minecraft log cleanup daily

[Timer]
OnCalendar=*-*-* 04:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mc-log-cleanup.timer
systemctl list-timers mc-log-cleanup.timer
journalctl -u mc-log-cleanup.service -n 50 --no-pager
```

:::tip 清理脚本要"先删自己生成的，再报警"
脚本不要一上来就 `rm -rf logs/*`：那是把证据一起删掉。正确的顺序是**按年龄删归档 → 控制崩溃报告数量 → 把异常大或异常新的文件报出来**。真正需要人看的，是"日志今天长了 3 GB"这件事本身。
:::

## 12. 维护清单

| 频率 | 动作 | 命令 / 位置 |
| --- | --- | --- |
| 每天（自动） | logrotate 轮转服务端与插件日志 | `logrotate.timer`，配置在 `/etc/logrotate.d/minecraft` |
| 每天（自动） | 清理脚本删旧归档、控制崩溃报告数量 | `mc-log-cleanup.timer` |
| 每周 | 看磁盘与 inode 水位 | `df -h`、`df -i` |
| 每周 | 看 journal 占用与最大的日志文件 | `journalctl --disk-usage`、`find ... -size +100M` |
| 每周 | 检查崩溃报告是否在成批增加（可能是崩溃循环） | `ls -1t crash-reports/ \| head` |
| 每月 | 复查 logrotate 配置与保留份数是否仍然合适 | `logrotate -d /etc/logrotate.d/minecraft` |
| 每月 | 确认集中化/异地日志确实有新数据到达 | 接收端目录或对象存储的修改时间 |
| 每次变更后 | 改了路径、用户名、unit 名之后干跑一次 | `sudo logrotate -d` |
| 出事后 | 先归档现场再清理 | 把相关 `latest.log` 与 `crash-reports/` 复制出去，再动手 |

## 13. 下一步

- 让日志和指标一起报警，而不是靠人盯：见 [监控与告警](/tutorials/ops/monitoring)。
- 日志与存档的一致性、保留策略：见 [备份与恢复](/tutorials/java/backup)。
- 把日志副本送出本机：见 [异地备份](/tutorials/ops/offsite-backup)。
- 服务端目录结构总览：见 [服务端结构](/tutorials/java/structure)。

> 具体路径与目录布局随游戏版本与核心而异，请以官方文档为准。
