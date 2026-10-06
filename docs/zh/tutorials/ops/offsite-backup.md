---
title: 异地备份：使用、配置与维护
slug: offsite-backup
cat: ops
level: 3
order: 10
minutes: 20
tags: [ops, backup, offsite, rsync, restic, rclone, retention]
updated: 2026-10-04
draft: false
---

本地备份能救"手滑删档"，救不了"硬盘坏了""机器被偷了""机房出事了"。**异地备份（offsite backup）解决的就是这一类"整个环境一起消失"的灾难**。这一篇讲清楚它的原理、配置和维护。

本地备份的基础（备份什么、一致性要求、回档流程）见 [备份与恢复](/tutorials/java/backup)；本篇假设你已经有了本地备份，现在要把副本送出去。

## 1. 3-2-1 原则

3-2-1 是一条被广泛引用的备份经验法则：

| 数字 | 含义 | 对 MC 服务器的落地 |
| --- | --- | --- |
| **3** | 至少保留 **3 份**数据副本（1 份生产 + 2 份备份） | 运行中的服务端目录 + 本地备份盘 + 异地副本 |
| **2** | 至少使用 **2 种不同介质/存储** | 例如内置 SSD + 外置硬盘 + 对象存储 |
| **1** | 至少 **1 份在异地** | 云存储、另一台机器、另一处物理位置 |

### 为什么"同一块盘上的备份"不算备份

把备份写到**服务端所在的同一块硬盘**上，只防住了一种故障：误删、改错配置、插件写坏存档。它防不住**磁盘本身损坏**（备份一起没）、**整机故障**（主板或电源烧了，两块盘一起走）、**勒索软件**（会加密它能看到的所有可写卷）、**人为破坏**（有人 `rm -rf` 了整个目录，或者拔走了机器），以及**火灾、水淹、失窃**。

### 三种典型灾难场景

| 场景 | 本地备份够吗 | 异地备份的作用 |
| --- | --- | --- |
| 硬盘损坏 / 整机报废 | 不够（若备份在同一块盘） | 直接从异地副本恢复 |
| 勒索软件加密所有可写卷 | **不够** | 只读或不可变的异地副本是唯一出路 |
| 服务商跑路 / 机房事故 / 账号被盗 | **不够** | 副本在你自己的存储上 |

:::warn 异地副本必须"备份程序写得进去，攻击者删不掉"
如果异地存储用的是同一套凭证、同一个可写账号，勒索软件一样能删掉它。**能做成只读/不可变（object lock、WORM、append-only）就做**；退一步，至少让备份账号只有写入权限、没有删除权限。
:::

## 2. 备份什么、不备份什么

| 必要性 | 内容 | 说明 |
| --- | --- | --- |
| 必须 | `world/`、`world_nether/`、`world_the_end/` | **存档本体，最重要**；自定义世界名以 `level-name` 为准 |
| 必须 | `server.properties` | 端口、难度、正版验证、`level-name` 等 |
| 必须 | `ops.json`、`whitelist.json`、`banned-ips.json`、`banned-players.json` | 权限与封禁名单 |
| 必须 | `plugins/`（含各插件的配置与数据库） | 插件本体与配置；注意有些插件把数据写在别处 |
| 必须 | `mods/`、`config/`（模组端） | 模组端专用；`config/` 里是模组配置 |
| 必须 | 核心自己的配置（`bukkit.yml` / `spigot.yml` / `paper-*.yml` 等） | 随核心不同而不同 |
| 必须 | 启动脚本、systemd unit、cron 条目 | **容易漏**，恢复时没有它起不来 |
| 可选 | `logs/`、`crash-reports/` | 排查问题有用，但体积会很大 |
| 不必 | `libraries/`、`versions/`、`cache/` | 可自动重建 |

:::tip 把"启动方式"也当成要备份的数据
"存档恢复了但服务起不来"是很常见的事故，原因就是启动脚本、Java 参数、systemd unit、定时任务都没备份。**把它们和配置一起纳入备份范围。**
:::

### 一致性：绝不在服务端写盘时复制

**不要在服务端正在写存档时直接复制**——可能拷到写了一半的区块文件，恢复后存档损坏。两种正确做法：

**方式 A：热备份（不停服）**

```text
save-all        先把数据刷到磁盘
save-off        关闭自动保存（避免备份过程中继续写入）
（此时执行复制/打包）
save-on         备份完恢复自动保存
```

**方式 B：停服备份（最稳）**

```text
stop            安全关服
（复制/打包整个目录）
（重新启动）
```

方式 A 需要**向服务端控制台发送命令**。若用 systemd 托管且启动方式能接收控制台输入，可以用 `screen`/`tmux` 注入，或启用 RCON 后远程发命令（**RCON 配置方式随核心与版本不同，以官方文档为准**）。

:::warn 打包工具读文件时服务端仍在写
`tar`、`rsync`、`restic` 都会**一边读一边遍历**。即使你刚执行过 `save-all`，如果没 `save-off`，服务端仍会在遍历过程中写入新数据，**归档里可能出现不一致的组合**。`save-off` 这一步不能省。
:::

## 3. rsync over SSH

`rsync` 是最经典的异地增量同步方案：只传变化的部分，走 SSH 加密通道，几乎所有 Linux 发行版都能装。

### 一次完整的示例命令

```bash
rsync -aHAX --delete --numeric-ids --info=progress2 \
  --exclude='logs/' \
  --exclude='crash-reports/' \
  --exclude='cache/' \
  --exclude='libraries/' \
  --exclude='versions/' \
  --exclude='*.tar.gz' \
  --link-dest=/srv/backup/mcserver/2026-10-03 \
  /opt/mcserver/ \
  backup@backup.example.com:/srv/backup/mcserver/2026-10-04/
```

### 逐项解释

| 选项 | 作用 |
| --- | --- |
| `-a` | 归档模式，等价于 `-rlptgoD`（递归、保留符号链接、权限、时间、属组、设备文件） |
| `-H` | 保留硬链接（**服务端目录里若有硬链接，不加会把它们展开成多份**） |
| `-A` | 保留 ACL（访问控制列表） |
| `-X` | 保留扩展属性（xattr） |
| `--delete` | 删除目标端"源端已不存在"的文件，使目标与源保持一致。**这是双刃剑**：源端误删会被同步过去 |
| `--numeric-ids` | 按数字 UID/GID 而不是按用户名/组名映射。跨机器、目标端没有同名用户时**必须加** |
| `--info=progress2` | 显示整体进度（rsync 3.1 及以上） |
| `--exclude` | 排除不需要备份的目录 |
| `--link-dest=DIR` | **硬链接快照**：与 DIR 中内容相同的文件不再复制，而是在目标里创建硬链接，从而让每个日期的目录看起来都是完整副本，实际只占增量空间 |

:::warn `-A` 和 `-X` 需要双方支持
保留 ACL 与 xattr 需要 rsync 版本足够新、目标文件系统支持这些特性，并且**通常需要以 root 运行**才能读取所有文件的 ACL/xattr。若目标文件系统（如部分网络存储）不支持，rsync 会报错或静默丢弃。**不确定就先去掉 `-A -X`**。
:::

### 先 dry-run

**任何带 `--delete` 的命令，第一次都必须先加 `-n`（`--dry-run`）跑一遍**：

```bash
rsync -aHAX --delete --numeric-ids -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ backup@backup.example.com:/srv/backup/mcserver/
```

`-n`（`--dry-run`）只显示会做什么而不实际改动，`-i`（`--itemize-changes`）逐项列出变化，便于确认 `--delete` 会删掉什么。**确认输出里没有"意外要删的东西"再去掉 `-n`。**

### SSH 免密登录

备份脚本要能无人值守运行，所以用密钥登录：

```bash
ssh-keygen -t ed25519 -C "mc-backup@home"
ssh-copy-id backup@backup.example.com
ssh backup@backup.example.com 'echo ok'
```

`ssh-keygen -t ed25519` 生成 Ed25519 密钥对，默认放在 `~/.ssh/id_ed25519`（私钥）与 `~/.ssh/id_ed25519.pub`（公钥）。**给私钥设口令（passphrase）更安全，但定时任务就需要 ssh-agent 或 `keychain` 才能免交互；无人值守的备份机通常不设口令，因此必须严格限制它的权限。** `ssh-copy-id` 把公钥追加到目标机的 `~/.ssh/authorized_keys`；**部分平台（如 Windows 的 OpenSSH 或某些精简系统）可能没有这个命令**，那就手动追加公钥内容。建议在目标机的 `authorized_keys` 里限制这把密钥：

```text
from="203.0.113.10",command="/usr/bin/rrsync -wo /srv/backup/mcserver/",no-port-forwarding,no-pty ssh-ed25519 AAAA... mc-backup@home
```

`rrsync` 是 rsync 自带的受限包装脚本，只允许写入指定目录。**`rrsync` 的路径与可用性随发行版而不同**（Debian/Ubuntu 在 `rsync` 包里，路径可能是 `/usr/bin/rrsync`），用之前先确认。

### cron 示例

```cron
0 4 * * * /usr/local/bin/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

五个字段依次是：分、时、日、月、星期，所以 `0 4 * * *` 表示**每天 04:00**；`>> /var/log/mc-backup.log 2>&1` 把标准输出与标准错误都追加到日志，便于事后检查退出码与报错。**cron 的环境变量非常少（`PATH` 很短），脚本里要用绝对路径**；需要日志轮转就在 `/etc/logrotate.d/` 下加一条规则，否则日志会一直增长。

## 4. 备份脚本骨架

下面是一份**可直接使用的 bash 骨架**：它先冻结写入，打包世界与配置，清理过期归档，再 rsync 到异地，并把结果写进日志。

```bash
#!/usr/bin/env bash
# 异地备份脚本骨架。请按你的环境修改变量。
set -euo pipefail

SERVER_DIR="/opt/mcserver"                 # 服务端目录（末尾不要加斜杠）
BACKUP_ROOT="/srv/backup/mcserver"         # 本地备份根目录（建议与 SERVER_DIR 不同盘）
LOG_FILE="/var/log/mc-backup.log"
KEEP_DAYS=14                               # 本地归档保留天数
REMOTE="backup@backup.example.com:/srv/backup/mcserver"   # 异地目标

STAMP="$(date +%F_%H%M%S)"
ARCHIVE="${BACKUP_ROOT}/mcserver-${STAMP}.tar.gz"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

# 脚本自身的输出也写进日志，cron 里的重定向只是双保险
exec >>"${LOG_FILE}" 2>&1
log "=== backup start ${STAMP} ==="

[ -d "${SERVER_DIR}" ] || fail "server directory not found: ${SERVER_DIR}"
mkdir -p "${BACKUP_ROOT}"

# 停服备份最稳。若不能停服，改成向控制台发送 save-all / save-off，打包后再 save-on
START_AFTER=0
if systemctl is-active --quiet minecraft.service; then
    log "stopping minecraft.service for a consistent backup"
    systemctl stop minecraft.service
    START_AFTER=1
fi

tar -czf "${ARCHIVE}" \
    --exclude='logs' \
    --exclude='crash-reports' \
    --exclude='cache' \
    --exclude='libraries' \
    --exclude='versions' \
    --exclude='*.tar.gz' \
    -C "${SERVER_DIR}" .

[ -s "${ARCHIVE}" ] || fail "archive is missing or empty: ${ARCHIVE}"
log "archive created: ${ARCHIVE} ($(du -h "${ARCHIVE}" | cut -f1))"

# 保留最近 KEEP_DAYS 天的本地归档，其余删除（首次运行建议先去掉 -delete 确认范围）
find "${BACKUP_ROOT}" -maxdepth 1 -name 'mcserver-*.tar.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete

# 同步到异地。刻意不使用 --delete，避免本地误删被同步过去
rsync -aHAX --numeric-ids --info=progress2 "${BACKUP_ROOT}/" "${REMOTE}/"
log "offsite sync finished"

if [ "${START_AFTER}" -eq 1 ]; then
    log "starting minecraft.service again"
    systemctl start minecraft.service
fi

log "=== backup ok ${STAMP} ==="
exit 0
```

### 使用说明

```bash
sudo install -m 750 mc-backup.sh /usr/local/bin/mc-backup.sh
sudo /usr/local/bin/mc-backup.sh
tail -20 /var/log/mc-backup.log
```

几点必须知道的：

- `set -euo pipefail` 让脚本**遇到错误立刻退出**，避免"备份失败了但脚本继续跑、最后报成功"。
- **停服备份是最稳的**；若不能停服，把 `systemctl stop` 换成向控制台发送 `save-all` / `save-off`，打包完成后 `save-on`（见第 2 节）。
- `find ... -mtime "+${KEEP_DAYS}" -delete` **先打印再删除**，第一次运行建议先把 `-delete` 去掉，确认匹配到的文件是对的。
- **异地同步用追加而不是 `--delete`**，否则本地归档被误删时异地副本会同步消失。若你确实想要镜像式同步，请确保本地删除逻辑绝对可靠。
- `systemctl` 的 unit 名、`tar` 的排除路径都要按你的实际目录调整；**`tar` 的 `--exclude` 匹配的是归档内路径，写法与 rsync 不完全相同**。需要 GFS 式保留（每日/每周/每月）时，改用 restic 的 `forget --keep-*` 比手写 `find` 更省事。

:::warn 脚本里的 `--delete` 一定要想清楚
`rsync --delete` 让目标端与源端完全一致。**如果源端因为权限、挂载失败或路径写错而变成空目录，`--delete` 会把异地副本也清空。** 这是备份事故的经典成因。
:::

## 5. 其他工具与选择

### restic：去重、加密、快照

restic 是写快照式的备份工具，**自带去重与加密**，适合"想保留很多历史版本但不想占很多空间"的场景。

```bash
# 1. 初始化仓库（只需一次）
export RESTIC_REPOSITORY="sftp:backup@backup.example.com:/srv/restic/mcserver"
export RESTIC_PASSWORD_FILE="/root/.config/restic/mcserver.pass"
restic init

# 2. 备份
restic -r "${RESTIC_REPOSITORY}" backup /opt/mcserver

# 3. 查看快照
restic snapshots

# 4. 保留策略：7 个每日、4 个每周，然后清理未引用的数据
restic forget --keep-daily 7 --keep-weekly 4 --prune
```

`RESTIC_PASSWORD_FILE` 指向一个 **`chmod 600` 的口令文件**，不要写进脚本。`restic forget` 只删快照引用，**必须加 `--prune` 才真正回收空间**，而 `--prune` 耗时较长，建议放在维护窗口。恢复用 `restic restore latest --target /tmp/restore-test`。仓库可以放在本地目录、SFTP、S3 兼容存储等多种后端上（**后端支持列表以官方文档为准**）。

### rclone：云存储同步

rclone 是"云存储的 rsync"，支持大量对象存储与网盘后端。

```bash
# 1. 交互式配置一个远端，名字例如 myremote
rclone config

# 2. 同步本地目录到远端（会删除远端多余文件，注意方向与语义）
rclone sync /srv/backup/mcserver myremote:mcserver-backup --progress

# 3. 校验两端一致
rclone check /srv/backup/mcserver myremote:mcserver-backup
```

`rclone sync` 让目标与源**完全一致**，会删除目标端多余文件；只想追加就用 `rclone copy`。`rclone check` 比较两端文件（默认比较大小与哈希，**是否支持哈希取决于后端**）。`rclone config` 是交互式的，无界面环境也可以手工写配置文件（`rclone config file` 查看路径）；凭据就存在该文件里，**权限要收紧到 `chmod 600`**。

### 纯 tar + scp

最简单的组合，没有任何额外依赖：

```bash
tar -czf /tmp/mcserver-$(date +%F).tar.gz -C /opt/mcserver .
scp /tmp/mcserver-$(date +%F).tar.gz backup@backup.example.com:/srv/backup/
```

适合**数据量很小、备份频率很低**的场景。缺点是：**每次全量传输、没有去重、没有加密（除了 SSH 通道）、没有校验**，数据一大就不可用。

### 对比

| 工具 | 去重 | 加密 | 增量 | 云支持 | 复杂度 | 适合 |
| --- | --- | --- | --- | --- | --- | --- |
| **rsync** | 否（靠 `--link-dest` 省空间） | 否（依赖 SSH 通道） | 是（按文件） | 需挂载或配合其他工具 | 低 | 有 SSH 目标、结构简单的目录 |
| **restic** | **是** | **是（内置）** | 是（按块） | 多种后端（S3、SFTP 等） | 中 | 想留很多历史版本、需要加密 |
| **rclone** | 否 | 传输加密取决于后端 | 是（按文件） | **最广** | 中 | 目标是网盘/对象存储 |
| **tar + scp** | 否 | 否 | 否（全量） | 需目标可 scp | **最低** | 数据量小、偶发备份 |

## 6. 加密与密钥管理

**异地副本必须加密。** 副本放在别人的存储上，等于把数据交给第三方；对象存储的密钥泄露、共享链接配错、云账号被盗，都会直接暴露存档（里面往往还有玩家 IP、聊天记录、可能的隐私信息）。

- **restic 自带加密**：仓库用口令派生密钥，**口令丢了数据就永久打不开**；**rsync / rclone / tar+scp 本身不加密内容**，要么依赖传输层（SSH、HTTPS），要么自己先加密：

```bash
# 用 gpg 对称加密一个归档（会交互式输入口令）
gpg --symmetric --cipher-algo AES256 mcserver-2026-10-04.tar.gz

# 解密
gpg --decrypt mcserver-2026-10-04.tar.gz.gpg > mcserver-2026-10-04.tar.gz
```

### 口令放在哪里

**绝不放在备份仓库/目标存储本身**，也**不要和备份脚本放在同一个可写目录里**。可接受的做法是**记在密码管理器里**（人可读），并**放在备份机上权限严格的文件里**（脚本可读）：

```bash
sudo install -d -m 700 -o root -g root /root/.config/restic
sudo sh -c 'printf "%s" "你的口令" > /root/.config/restic/mcserver.pass'
sudo chmod 600 /root/.config/restic/mcserver.pass
sudo chown root:root /root/.config/restic/mcserver.pass
```

**口令要有一份离线记录**（写在纸上锁起来、或放在另一台设备的密码管理器里）。**加密备份 + 丢失口令 = 数据全丢**，而且比没加密更彻底。密钥文件（SSH 私钥、rclone 配置）同样 `chmod 600`，并且**只给备份专用的最小权限账号**。

:::warn 加密不是"设了密码就完事"
口令强度、口令保管、密钥轮换都要考虑。**一个写在脚本里的弱口令，安全性约等于零。** 另外：加密后**压缩率会下降**（密文不可压缩），先压缩再加密。
:::

## 7. 云端与对象存储目标

| 类型 | 例子 | 特点 |
| --- | --- | --- |
| 另一台机器 / NAS | 朋友家的 NAS、第二台 VPS | 便宜、可控，但要自己维护 |
| S3 兼容对象存储 | 各类 S3 兼容服务、自建 MinIO | 标准 API，restic/rclone 直接支持 |
| 冷存储 / 归档存储 | 各家"归档""冷"级别 | **单价极低，取回慢且可能按取回量计费** |
| 网盘 | rclone 支持的网盘后端 | 便宜甚至免费，但**限速、可能封号、不适合作为唯一副本** |

### 必须注意的成本陷阱

- **出口流量费（egress）**：很多对象存储**上传免费、下载收费**。恢复一次几百 GB 的备份可能比存一年还贵。**买之前先看计价页的取回与出口价格。**
- **请求费**：按请求数计费的后端，小文件多时费用会上升。
- **最低存储时长**：部分归档级别要求数据至少存 30/90/180 天，提前删除仍按整段收费。
- **取回延迟**：归档级别的恢复可能需要数小时，**不适合"出事了马上要恢复"**，建议至少保留一份"能立即恢复"的副本。

### 生命周期与保留规则

对象存储通常支持**生命周期规则（lifecycle rule）**，用来把超过 N 天的对象**转到更便宜的存储级别**、在 N 天后**自动删除**以实现保留策略，以及清理未完成的分片上传（multipart upload）残留——**后者是隐藏费用的常见来源**。**具体规则语法、支持的级别名称与最短期限随服务商不同，以各服务商文档为准**，不要照搬别家的示例。

## 8. 保留策略设计

### 保留多少份

| 层级 | 常见数量 | 用途 |
| --- | --- | --- |
| 每日 | 7 - 14 份 | 应对"昨天/前天写坏了" |
| 每周 | 4 - 8 份 | 应对"几周后才发现的问题" |
| 每月 / 每年 | 每月 6 - 12 份、每年 1 - 3 份 | 长期留档、应对缓慢发生的损坏 |

原则：**"能覆盖你发现问题所需的最长时间"**。存档损坏往往**不是当天就被发现的**，所以要留足够久。

### 磁盘空间估算

设世界大小为 `W`，压缩后约为 `0.4W - 0.7W`（**压缩率取决于内容，region 文件压缩效果一般，实测为准**）。

| 方案 | 空间占用 |
| --- | --- |
| 每次独立 `tar.gz`，保留 `N` 份 | 约 `N x 0.5W` |
| rsync `--link-dest` 硬链接快照 | 约 `0.5W + 变化量 x (N-1)`，**变化量才是关键** |
| restic 去重快照 | 与硬链接快照同量级或更省，取决于去重粒度 |

例子：世界 5 GB，保留 14 份独立归档，按 0.5 压缩率约需 `14 x 2.5 = 35 GB`；换成 `--link-dest` 快照，若每天变化 100 MB，则约 `2.5 GB + 13 x 0.1 GB = 3.8 GB`。**差距很大，值得为此改用快照方案。**

### 安全地清理旧备份

- **绝不在验证新备份可用之前删除旧备份**。顺序永远是：**生成新备份 -> 校验新备份 -> 确认无误 -> 才清理旧备份**。
- **保留至少一份"最老但已知可用"的副本**（应对"损坏已经存在很久"），清理动作**先 dry-run 或先打印文件列表**确认匹配范围。
- 异地端的清理**要比本地更保守**（多留几份、延后删除），因为异地副本是最后一道防线。

:::warn 自动清理是"删数据的自动化"
一个写错的 `find ... -delete` 或 `--delete` 可能一次清掉所有历史。**任何清理逻辑上线前都要在测试目录上跑一遍，并确认它不会匹配到不该删的文件。**
:::

## 9. 维护

### 没恢复过的备份不算备份

这条规则怎么强调都不过分。**备份脚本每天"成功"运行，和备份真的能恢复，是两件完全不同的事。** 常见情况是：脚本因为权限、路径、磁盘满而失败了几周，没人发现；或者打包出来的归档是空的；或者加密口令早就不对了。

### 季度恢复演练流程

1. **选一份副本**：最好选**异地副本**，这样连"传输过程有没有坏"一起验证。
2. **恢复到一个隔离的测试目录**，绝不覆盖生产目录：

```bash
mkdir -p /tmp/restore-test
tar -xzf /srv/backup/mcserver/mcserver-2026-10-04_040001.tar.gz -C /tmp/restore-test
ls -la /tmp/restore-test
```

3. **检查关键文件是否存在且非空**：`world/level.dat`、`server.properties`、`plugins/` 下的配置。
4. **用不同端口启动测试实例**：复制一份测试目录，把 `server.properties` 里的端口改成别的值（例如 `server-port=25566`、`query.port=25566`、`rcon.port=25567`），启动并观察日志；进服后检查关键建筑、容器内容、玩家背包与权限，确认没有区块或存档相关报错。
5. **记录并清理**：写下演练日期、用时与遇到的问题（**这是你唯一能证明备份可用的证据**），然后删掉测试实例，保留记录。

:::tip 把恢复步骤写成文档
出事当天不是研究"怎么恢复"的时候。**提前把命令写成一页纸**，演练时照着走、发现问题就更新它。
:::

### 校验完整性

| 手段 | 命令 | 说明 |
| --- | --- | --- |
| restic 仓库检查 | `restic check` | 校验仓库结构与元数据；加 `--read-data` 会**读取全部数据块**，慢但更彻底 |
| 列出 tar 内容 | `tar -tzf archive.tar.gz >/dev/null` | 读取并解压列表，能发现**截断或损坏的归档** |
| 校验和比对 | `sha256sum archive.tar.gz` | 与备份时记录的哈希比对，确认传输后内容一致 |
| rclone 校验 | `rclone check src dst` | 比较两端文件（能力取决于后端是否支持哈希） |
| 试解压 | `tar -xzf archive.tar.gz -C /tmp/check` | 最直接的验证：能不能真的解出来 |

**校验和要单独保存**（例如随归档写一个 `.sha256` 文件），否则"用备份自己的哈希校验备份"没有意义。

### 监控备份是否真的跑了

**看退出码**（cron 失败时日志里会有非 0 退出码；`set -e` 的脚本遇到错误会提前退出）、**看日志**（`tail -20 /var/log/mc-backup.log` 确认最后一行是成功标记）、**看产物**（新归档的时间戳是今天，大小在合理范围，不是 0 字节也不是异常小）。更重要的是**主动告警**：让脚本失败时发邮件或发消息（`mail`、`curl` 调 Webhook 等）。**"没有消息"不等于"一切正常"**，最好做**心跳式监控**——每天成功就上报一次，没上报就告警。

### 常见失败原因

| 现象 | 常见原因 | 排查方向 |
| --- | --- | --- |
| 磁盘满 / 归档 0 字节 | 本地备份盘写满、保留策略没生效 | `df -h`、检查清理逻辑 |
| SSH 认证失败 | 密钥被换、`authorized_keys` 权限不对、账号被锁 | 手动跑一次 `ssh backup@host 'echo ok'` |
| 主机密钥变更告警 | 目标机重装或 IP 复用，`known_hosts` 记录过期 | **先确认对方身份**，再更新 `known_hosts` |
| 权限错误（Permission denied） | 备份账号读不到源文件、目标目录不可写 | 检查目录权限与属主，必要时用 root 跑 |
| 凭据过期 / 加密口令不对 | 云存储密钥到期；口令轮换后脚本没更新 | 更新密钥，并手动 `restic snapshots` 验证 |
| 归档内容不完整 | 忘了 `save-off`、`--exclude` 写错排除了关键目录 | 用 `tar -tzf` 列内容核对 |
| 同步把好数据删了 | 源端路径写错 + `--delete` | 立即停用同步，从更早的副本恢复 |

:::warn 报错日志要看，不要只看"有没有文件生成"
文件生成 ≠ 内容正确。**归档大小、退出码、校验和，三者至少要检查两项。**
:::

## 10. 检查清单

| 项目 | 要求 | 检查频率 |
| --- | --- | --- |
| 3-2-1 覆盖 | 至少 3 份副本、2 种介质、1 份异地 | 每季度复核 |
| 备份范围 | 世界、配置、名单、插件/模组与配置、启动脚本 | 每次改配置后 |
| 一致性 | 停服备份，或 `save-all` + `save-off` -> 打包 -> `save-on` | 每次备份 |
| 自动化 | cron / systemd timer 定时执行，有日志 | 部署时 |
| 加密与权限 | 异地副本加密、口令离线留存、口令与私钥 `chmod 600`、账号最小权限 | 每季度复核 |
| 保留策略 | 每日/每周/每月份数明确，清理逻辑经过测试 | 每季度复核 |
| 空间 | 本地与异地剩余空间充足 | 每周 |
| 校验 | `restic check` / `tar -tzf` / 校验和比对通过 | 每月 |
| 监控 | 失败会告警，成功有心跳 | 部署时，每月复核 |
| 恢复演练 | 恢复到测试目录并用不同端口启动验证 | **每季度** |
| 异地可用性 | 确认能下载/恢复，出口费用可接受 | 每季度 |
| 文档 | 恢复步骤、口令位置、目标地址有书面记录 | 每半年 |

## 11. 小结

- **同盘备份不算备份**：真正救命的副本必须在别处，而且最好不可被远程删除。
- **一致性优先于速度**：不在服务端写盘时复制。
- **加密 + 口令离线留存**：异地副本必须加密，口令丢了就全丢了。
- **保留策略要经过测试**：清理逻辑是"删数据的自动化"，上线前必须验证。
- **每季度真的恢复一次**：这是唯一能证明备份有效的方法。

配套阅读：[备份与恢复](/tutorials/java/backup)（备份范围与回档流程）、[服务端结构](/tutorials/java/structure)（哪些文件该备）、[家用电脑开服与维护](/tutorials/ops/home-hosting)（硬件与供电风险）。

> 命令与配置以各软件官方文档为准；对象存储的计价、生命周期规则与取回策略以各服务商文档为准。
