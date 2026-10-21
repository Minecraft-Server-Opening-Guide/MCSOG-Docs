---
title: 自动化运维
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [自动化, 备份脚本, systemd, cron, Ansible, CI/CD, 运维]
updated: 2026-10-04
draft: false
---

自动化运维的目标不是"显得专业"，而是**把重复动作变成不会忘、不会做错的动作**。服务器出事的原因里，排在最前面的往往不是"技术太难"，而是"这件事我忘了做""上次做的时候漏了一步""凌晨三点做的时候手抖了"。

这一篇讲怎么把备份、重启、更新、日志清理与健康检查交给脚本和定时器，以及**哪些事情不能交给它们**。相关篇目：备份策略见 [备份与恢复](/tutorials/java/backup) 与 [异地备份](/tutorials/ops/offsite-backup)，性能问题见 [用 spark 分析服务器性能](/tutorials/ops/spark)，更新流程见 [服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates)，告警见 [监控与告警](/tutorials/ops/monitoring)。

:::warn 命令与配置以你所用的系统与软件官方文档为准
下面出现的**包名、路径、用户与组、服务名、模块参数与 systemd 选项**都会随**发行版、软件版本与安装方式**变化。示例说明的是"该写什么、为什么这样写"，**不是可以直接复制粘贴的成品**。落地前请对照你所用发行版的文档、服务端与插件官方文档，以及 Ansible、systemd、cron 的官方手册（`man 5 crontab`、`man systemd.timer`、`man systemd.service`）。
:::

## 1. 先自动化什么

判断标准很简单：**这件事是否需要"按时间重复做"？** 是，就值得自动化；不是，就先别碰。

| 任务 | 频率 | 自动化方式 | 风险 |
| --- | --- | --- | --- |
| 世界与配置备份 | 每日 / 每 6 小时 | cron 或 systemd timer + 脚本 | 低（但**没验证过的备份等于没有备份**） |
| 异地同步 | 每日 | `rsync` + SSH 密钥 | 中（目标端被写满或被覆盖） |
| 定时重启 | 每日 / 每周 | cron 或 systemd timer | 低（但**重启不是解决卡顿的手段**） |
| 日志清理与轮转 | 每日 / 每周 | `logrotate` 或脚本 | 中（删错目录不可逆） |
| 健康检查与自愈 | 每分钟 / 每 5 分钟 | 脚本 + 定时器 + 告警 | 中（**反复重启会掩盖真实问题**） |
| 更新检查（只通知） | 每日 | 脚本 + 通知 | 低 |
| 更新执行（含回滚） | 人工触发 | 脚本 + 人工确认 | **高**（会改二进制与配置） |
| 插件升级 | 人工 | 先在测试服验证 | **高**（配置格式与依赖会变） |
| 游戏版本升级 | 人工 | 按官方升级说明执行 | **最高**（世界格式可能单向变更） |
| 删档、清空玩家数据、重置世界 | 绝不自动 | 只允许人工执行 | **不可逆** |

结论：**自动化的价值集中在"低风险、高频率、纯机械"的动作上**；风险越高的动作，越应该把自动化用在"检查、准备、验证、回滚"这些环节，而不是"直接执行"。

## 2. 不要盲目自动化的事

**游戏版本升级。** 跨大版本升级往往伴随**世界数据的单向格式转换**。新版本一旦打开并保存了世界，回退到旧版本通常不再可行。这类操作必须由人确认，并且**先备份、先在副本上试**。

**没有测试过的插件升级。** 插件依赖（Vault、PlaceholderAPI、ProtocolLib、LuckPerms 这类前置）与配置格式会随版本变化。自动升级的典型结局是：夜里更新完成，早上玩家进不来，而你不知道是哪个插件导致的。

**任何不可逆操作。** 删除、覆盖、清空、迁移、`rm -rf`、数据库 `DROP`。这些动作可以被脚本**准备**（列出将被删除的内容、生成待确认清单），但不应该由定时器**直接执行**。

**你没读懂过的脚本。** 从网上抄一段没读懂的 shell，配上 root 与定时器，等于给自己埋一颗不知道什么时候响的雷。

:::warn 自动化的破坏力是"自动放大"的
人工操作出错，影响范围是那一次；自动化的错误会**按频率重复**——一个写错目录的清理脚本每天删一次，一个判断条件写反的健康检查每分钟重启一次。**先让脚本以只读方式跑够久，确认它的判断是对的，再给它写权限。**
:::

## 3. 脚本卫生

同一个脚本，写好与写坏的区别不在功能，而在**出事时你能否看懂发生了什么**。

### 3.1 开头三件事

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **shebang**：`#!/usr/bin/env bash` 比 `#!/bin/bash` 更可移植（会在 `PATH` 里找 bash）。**注意**：`sh` 不保证支持下面用到的 bash 语法，所以不要用 `#!/bin/sh`。
- **`set -e`**：命令失败立即退出，避免"上一步失败了还继续往下跑"。
- **`set -u`**：引用未定义变量时报错退出。最危险的 bug 之一就是变量为空导致 `rm -rf "$DIR/"` 变成 `rm -rf /`。
- **`set -o pipefail`**：管道中任一环失败都算失败。没有它，`tar ... | gzip ...` 里 tar 报错也可能被当成成功。

### 3.2 日志、退出码与幂等

**日志必须带时间戳，不要只用 `echo`**：没有时间戳的日志在排查时价值极低，你不知道"备份失败"是今天还是上周。

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

如果脚本由 systemd 托管，也可以不自己加时间戳，改用 `journalctl`（自带时间戳与轮转），**但两种方式不要混用**。

**退出码要有意义**：`0` 成功，非零表示失败，并**区分不同失败原因**，这样告警才有信息量——`1` 通用错误、`2` 用法错误、`3` 依赖缺失、`4` 锁被占用（上一次还在跑）、`5` 数据校验失败。

**幂等性**：幂等的脚本可以重复执行、结果一致，这是自动化最重要的性质——用 `mkdir -p` 而不是 `mkdir`，覆盖式写入而不是追加（除非日志），用"检查再动作"而不是"假设已经就绪"。**不幂等的脚本在重试时会破坏数据**，而重试是常态（机器重启、cron 补跑、你手动再跑一次）。

### 3.3 引号、`--dry-run` 与版本控制

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

变量一律写成 `"$VAR"` 而不是 `$VAR`，否则路径里有空格时会被拆成多个参数；`${VAR:?message}` 在变量为空或未设置时**直接报错退出**，这是防误删最便宜的一道保险。给脚本加一个"只打印不执行"的模式，是成本最低的安全措施。

**脚本要进版本控制**：把脚本放进 Git 仓库，理由不是"规范"，而是你能看到**上次改了什么**、改动之后什么时候开始出问题；误删可以恢复；多台服务器共用同一份脚本，而不是各自演化出三个略有差异的版本。仓库里应当包含脚本、systemd 单元、cron 片段、Ansible 剧本与一份说明依赖的 README，**但绝不要包含密钥**（见第 9 节）。

## 4. 一个完整的备份脚本

下面这份脚本把前面的原则都用上了：**锁文件防止重叠、RCON 关闭存档写入、带日期的归档、校验、保留策略、异地同步**。

```bash
#!/usr/bin/env bash
set -euo pipefail
# Minecraft 服务端备份脚本（Linux）。用法：./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # 留空表示不使用 RCON
OFFSITE_TARGET=""                           # 例：backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# 前置检查
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "缺少命令：$cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "服务端目录不存在：$SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "配置了 RCON 但找不到 mcrcon" 3
fi
# 锁：防止上一次还没跑完就重叠执行
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "无法创建锁文件：$LOCK" 3
if ! flock -n 9; then log WARN "上一次备份仍在运行，本次跳过"; exit 4; fi
# 无论怎么退出，都要恢复存档写入
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on 失败，请手动确认存档写入已恢复"
  fi
}
trap cleanup EXIT
log INFO "备份开始：${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"

# 1) 关闭自动保存（推荐 RCON；不用 RCON 时可用 screen 发送命令，例如
#    screen -S minecraft -p 0 -X stuff 'save-off\n'，随后记得再发 save-on）
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "已执行 save-off 与 save-all flush"; sleep 5
  else
    log WARN "RCON 不可用，跳过 save-off，继续备份"
  fi
else
  log WARN "未配置 RCON，跳过 save-off"
fi

# 2) 校验世界目录存在，避免打包出一个空归档
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "跳过不存在的目录：${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "没有任何世界目录存在，中止" 5
# 3) 打包（有 pigz 就用它并行压缩）
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) 校验归档可读（这一步决定"备份是否存在"）
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "归档校验失败：$TARBALL" 5
  log INFO "归档校验通过：$(du -h "$TARBALL" | cut -f1)"
fi
# 5) 保留策略与空间下限
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "剩余空间 ${FREE_GB}G 低于下限 ${MIN_FREE_GB}G"
# 6) 异地同步（rsync 失败返回非零，配合 set -e 直接暴露）
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "同步到异地：${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "备份完成：${TARBALL}"
```

关键设计：**`flock -n 9`** 让上一次没跑完时直接跳过，而不是并行执行两份备份把磁盘与 I/O 打满；**`trap cleanup EXIT`** 保证无论脚本怎么退出都尝试恢复 `save-on`，否则**服务端会一直不写盘**，这是很隐蔽的事故；**`save-all flush` 后 `sleep 5`** 给服务端时间把内存中的区块落盘；**`tar -tzf` 校验**是"备份是否有效"的唯一判据；**`--delete-after`** 先传输成功再删除旧文件，避免传输失败导致异地被清空；**`${STATE_DIRECTORY:-/run/lock}`** 兼容 systemd 的 `StateDirectory=`（见 4.2），手动运行时回退到 `/run/lock`。

:::tip 备份要定期做一次"恢复演练"
脚本每天成功，不代表备份可用。每隔一段时间，**在一台测试机或临时目录里真正解压并启动一次**。恢复流程见 [备份与恢复](/tutorials/java/backup)，异地副本的意义见 [异地备份](/tutorials/ops/offsite-backup)。
:::

### 4.1 对应的 cron 写法

```ini
# /etc/cron.d/mc-backup
# 分 时 日 月 周   用户       命令
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**cron 的环境与你登录的 shell 完全不同**：`PATH` 很短，`HOME` 可能不是你以为的那个，所以要在 crontab 里显式设置 `SHELL` 与 `PATH`，脚本里也尽量用绝对路径；**必须重定向 `>> log 2>&1`**，否则输出会进邮件（很多机器上根本没有邮件系统，等于黑洞）；`/etc/cron.d/` 的文件**需要用户名字段**，而 `crontab -e` 写的是当前用户的表、**没有用户名字段**，这是最常见的 cron 语法错误；**cron 不会"补跑"错过的任务**，机器在 4:30 关机，这次备份就不会发生。

### 4.2 等价的 systemd timer + service

```ini
# /etc/systemd/system/mc-backup.service
[Unit]
Description=Minecraft world backup
After=network-online.target

[Service]
Type=oneshot
User=minecraft
Group=minecraft
StateDirectory=mcbackup
StateDirectoryMode=0750
# 脚本需要读服务端目录、写备份目录
ReadWritePaths=/srv/minecraft/server /srv/backups/mc
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ExecStart=/opt/mc-ops/mc-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/mc-backup.timer
[Unit]
Description=Run Minecraft world backup every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:30:00
# 机器在触发点关机时，开机后补跑一次
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mc-backup.timer
systemctl list-timers mc-backup.timer
journalctl -u mc-backup.service -n 50 --no-pager
```

两个容易踩的点：**`OnCalendar` 的星期与月份用英文缩写**（`Mon`、`Sun`、`Jan`），时间默认按本地时区解释，改时区后触发时间会跟着变（语法见 `man systemd.time`）；**`ProtectSystem=strict` 会把整个文件系统挂成只读**，可写路径只有 `StateDirectory`、`CacheDirectory`、`LogsDirectory`、`RuntimeDirectory` 与显式列出的 `ReadWritePaths`——脚本要写别的地方就必须加进去，否则你会看到"权限明明对，就是写不进去"。

:::tip cron 与 systemd timer 怎么选
只是"每天跑个脚本"：两者都行，选你更熟的。需要**日志归集、开机补跑、资源限制、失败重试**：选 systemd timer。需要**跨发行版一致**（含 BSD、容器）：cron 更通用。
:::

## 5. 定时重启

定时重启是很多服务器的日常操作，但要先明确：**重启不是解决卡顿的手段。** 重启能处理的是内存缓慢泄漏、长期运行积累的临时状态、某个插件的小毛病；**不能**处理 TPS 低、区块加载慢、玩家卡顿——那些要找出原因，见 [用 spark 分析服务器性能](/tutorials/ops/spark)；而"每天崩一次所以每天重启一次"会让**真实故障永远不被发现**。

确定需要定时重启时，流程上必须包含**提前公告**：

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # 更安全的做法是从受限权限的文件或环境变量读取
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say 服务器将在 5 分钟后重启，请及时保存进度"
sleep 240
rcon "say 服务器将在 1 分钟后重启"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "重启 ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# 文件一：/etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# 文件二：/etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

如果你用面板（Pterodactyl、AMP、MCSManager 一类），**优先用面板自带的重启计划**，因为面板知道如何优雅地停止进程；用脚本直接 `kill` 面板管理的进程可能让面板状态错乱。面板对比见 [服务器面板](/tutorials/ops/panels)。

:::warn 不要用 kill -9 停止服务端
强制杀死进程可能让世界**来不及保存**，或在写入过程中被中断。正确顺序永远是：`save-all flush` → 正常停止（`stop` 命令或 `systemctl stop`）→ 等进程退出。只有进程卡死时才考虑强制终止，并且**事后检查存档完整性**。
:::

## 6. 更新自动化要怎么做才安全

更新是自动化里风险最高的一类。可行做法是**把自动化用在"准备与验证"，把执行留给人工确认**：检查新版本（自动，只做通知）→ 下载到 `staging/`（自动，**不要直接覆盖正在运行的 jar**）→ 校验官方哈希（自动）→ 备份并确认归档可读（自动）→ 切换（人工确认后执行，旧 jar 重命名保留）→ 重启并验证端口、日志与插件加载 → 失败则换回旧 jar 并**告警**。

一个只做"检查与下载"的检查器是最有价值的自动化，因为它没有破坏力：

```bash
#!/usr/bin/env bash
set -euo pipefail
# 只检查与下载，不替换、不重启
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # 替换为官方地址
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # 替换为官方校验和地址
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) 下载到暂存目录
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) 校验（必须使用官方发布的哈希）
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "校验和不匹配，丢弃下载"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) 与当前版本比较，只报告
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "已是最新版本"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "发现新版本，已放入暂存目录，等待人工确认后切换"
fi
```

**关键原则：自动化只负责"把东西准备好并说清楚"，替换与重启由人按下按钮。** 完整的更新与回滚细节（含插件、Mod 与 MCDR）见 [服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates)。

## 7. 健康检查驱动的自动化

健康检查的价值在于**在玩家发现问题之前发现它**。判断依据应当尽量客观：进程是否在跑（`systemctl is-active`，但进程活着不等于服务可用）；端口是否监听（`nc -z` / `ss -ltn`，最快的可用性检查）；是否还能响应命令（RCON 查询，能响应说明主线程没有完全卡死）；TPS / MSPT（**不同服务端命令不同**，需按官方文档确认）；磁盘与内存（更适合告警，不适合"自动重启"）。

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # 例：/opt/mc-ops/notify.sh，接收一个消息参数
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# 冷却：避免崩溃-重启循环
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "处于冷却期，跳过自动重启"; exit 0; fi
fi
# 1) 端口检查（3 秒超时）
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "端口 ${PORT} 无响应"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "重启失败，需要人工介入"; exit 1; fi
  exit 0
fi
# 2) TPS 检查（需要 RCON 且服务端支持对应命令）
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} 低于阈值 ${MIN_TPS}（请用 spark 分析，不要盲目重启）"
  fi
fi
log INFO "健康检查通过"
```

```ini
# /etc/systemd/system/mc-health.timer
[Unit]
Description=Check Minecraft server health every 2 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
```

:::warn 反复重启会掩盖真实问题
如果健康检查每天都要重启一次服务器，你得到的不是"稳定的服务器"，而是"**一个每天都崩但没人知道的服务器**"。自动重启的脚本**必须同时发告警**，冷却时间要足够长；持续触发时应当**停掉自动重启、转人工排查**。
:::

指标采集、阈值设定与告警渠道的完整做法见 [监控与告警](/tutorials/ops/monitoring)。

## 8. 配置管理：Ansible 的概念与最小示例

当服务器超过一台，"登录上去手动改"就开始失控：三台机器的配置慢慢不一样，而你不知道哪台是对的。配置管理工具（Ansible、Salt、Puppet、Chef）解决的就是这个问题：**把机器的期望状态写成文件，放进版本控制，由工具去收敛。** Ansible 门槛最低，因为它**只需要 SSH 与 Python，不需要在被管机器上装 agent**。

```ini
# inventory.ini
[mcservers]
mc1.example.com ansible_user=deploy
mc2.example.com ansible_user=deploy

[mcservers:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# playbook.yml
---
- name: Provision a Minecraft host
  hosts: mcservers
  become: true
  vars:
    mc_user: minecraft
    mc_group: minecraft
    mc_home: /srv/minecraft
    # 发行版差异：Debian/Ubuntu 上通常是 openjdk-21-jre-headless，
    # RHEL 系通常是 java-21-openjdk-headless。务必按你的发行版核实。
    java_package: openjdk-21-jre-headless
  tasks:
    - name: Install a Java runtime
      ansible.builtin.package:
        name: "{{ java_package }}"
        state: present
    - name: Create the service user and group
      ansible.builtin.user:
        name: "{{ mc_user }}"
        group: "{{ mc_group }}"
        home: "{{ mc_home }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: true
        state: present
    - name: Deploy the systemd unit
      ansible.builtin.template:
        src: templates/minecraft.service.j2
        dest: /etc/systemd/system/minecraft.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart the server
  handlers:
    - name: Reload systemd and restart the server
      ansible.builtin.systemd:
        name: minecraft.service
        daemon_reload: true
        state: restarted
```

```bash
ansible-playbook -i inventory.ini playbook.yml --check --diff
ansible-playbook -i inventory.ini playbook.yml
```

:::warn 模块参数以 Ansible 官方文档为准
上面每个模块（`package`、`user`、`template`、`systemd`）的**参数名、取值与行为会随 Ansible 版本变化**，模块在较新版本中也会被重命名或迁移到 collection。**照抄示例是常见的事故来源**：先用 `--check`（只报告不改动）跑一遍，再对照 Ansible 官方文档逐个确认参数含义。
:::

三条经验：**先管住"配置"，再管住"部署"**（把 `server.properties`、插件配置、systemd 单元纳入版本控制，价值远大于让 Ansible 帮你下载 jar）；**`--check` 是你的朋友**（任何剧本先跑 `--check --diff`）；**敏感值不进仓库**（密码、Token、RCON 密码用 `ansible-vault` 或环境变量注入）。

## 9. CI/CD 的概念（以及为什么密钥不能进仓库）

CI/CD 用在 Minecraft 服务器上，最有价值的不是"自动部署"，而是**自动检查**。务实做法是：把服务器配置放进 Git 仓库，让流水线在每次提交时做三件事——**语法校验、结构解析、脚本静态检查**。

```yaml
# .github/workflows/validate.yml
name: Validate server configuration
on:
  push:
    branches: [main]
  pull_request:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v4
      - name: Lint YAML configuration
        run: |
          pip install --disable-pip-version-check yamllint
          yamllint -c .yamllint.yml config/
      - name: Parse YAML and TOML files
        run: |
          python3 - <<'PY'
          import pathlib, sys, tomllib, yaml
          parsers = {"*.yml": yaml.safe_load, "*.toml": tomllib.loads}
          failed = False
          for pattern, parse in parsers.items():
              for path in sorted(pathlib.Path("config").rglob(pattern)):
                  try:
                      parse(path.read_text(encoding="utf-8"))
                  except Exception as exc:
                      failed = True
                      print(f"{path}: {exc}")
          sys.exit(1 if failed else 0)
          PY
      - name: ShellCheck the operations scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck -x scripts/*.sh
```

:::note 版本差异：`tomllib` 需要 Python 3.11+
Python 3.11 起标准库才有 `tomllib`。更早的版本需要安装 `tomli` 并改为 `import tomli as tomllib`。请按你的运行环境核实。
:::

**"同步到服务器"这一步要谨慎。** 可行的顺序是：CI 只负责**校验与打包**，部署由人触发，并且部署前自动备份。**不要让每次提交都直接重启生产服。**

**绝不要把密码、Token、RCON 密码、SSH 私钥提交进仓库。** 三个具体后果：**Git 历史会永久保留它**（删掉文件不解决问题，旧提交里还有，克隆过的人手里也有；彻底清除需要重写历史，并且必须**更换所有已泄露的凭据**）；**公开仓库会被自动扫描**（有人专门爬取公开仓库里的密钥，从提交到被滥用可能只有几分钟）；**它会跟着仓库扩散**（每个克隆、每个 fork、每个 CI 日志里都可能留下一份）。

| 场景 | 做法 |
| --- | --- |
| CI 里需要密钥 | 使用平台提供的 Secrets（如 GitHub Actions 的 repository secrets），通过环境变量注入 |
| 服务器上需要密钥 | 放在权限受限的文件里（`chmod 600`、属主为服务用户），或用 systemd 的 `EnvironmentFile=` |
| Ansible 需要密钥 | `ansible-vault` 加密，或从环境变量读取 |
| 本地开发 | `.gitignore` 掉真实配置，仓库里只放 `.example` 模板 |

**上线前用一次密钥扫描工具（如 gitleaks、trufflehog）检查整个 Git 历史**，比事后补救便宜得多。

## 10. 落地顺序建议

不要一次把所有东西都自动化。按风险从低到高、价值从高到低推进：**先有备份脚本，并且验证过一次恢复**（第 4 节）→ **把备份挂上定时器**，确认日志能看到成功与失败 → **加健康检查 + 告警**（第 7 节），先只告警、不自动重启 → **加日志清理与轮转**，把磁盘空间控制住 → **把脚本与配置放进 Git**（第 3.3、9 节）→ **最后才考虑自动更新**，而且只自动到"下载 + 校验 + 通知"这一步（第 6 节）。

:::warn 没有备份的自动破坏性操作，就是丢档的标准剧本
一个清理脚本写错目录、一个 `rsync --delete` 写错方向、一个更新脚本覆盖了世界文件——这些事故的共同点是**在它们发生之前，没有一份可用的备份**。**任何会删除、覆盖、移动数据的自动化，都必须先确认备份存在且可恢复**；做不到这一点，就不要让它自动运行。存档丢了通常找不回来，而脚本可以重写。
:::

## 下一步

- 备份策略与恢复流程：见 [备份与恢复](/tutorials/java/backup)
- 异地副本怎么做：见 [异地备份](/tutorials/ops/offsite-backup)
- 指标、阈值与告警渠道：见 [监控与告警](/tutorials/ops/monitoring)
- 卡顿时如何定位原因（而不是重启）：见 [用 spark 分析服务器性能](/tutorials/ops/spark)
- 更新与回滚的完整流程：见 [服务端、插件与 MCDR 的更新维护](/tutorials/ops/updates)
- 面板自带的任务计划：见 [服务器面板](/tutorials/ops/panels)

---

> 脚本与配置以你所用的系统与软件官方文档为准。
