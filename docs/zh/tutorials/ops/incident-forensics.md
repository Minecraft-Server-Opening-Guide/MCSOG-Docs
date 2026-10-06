---
title: 攻击取证与应急响应
slug: incident-forensics
cat: ops
level: 3
order: 12
minutes: 18
tags: [incident-response, forensics, packet-capture, tcpdump, evidence, ddos, attribution]
updated: 2026-10-04
draft: false
---

被攻击的那一刻，机器上同时存在两类东西：**能被记录下来的证据**，和**几分钟后就会永远消失的状态**。这一篇讲的是后者——在重启、重装、拉黑任何东西之前，先把现场固定下来。预防性内容见 [网络安全基础](/tutorials/ops/network-security) 与 [常见网络攻击与防御](/tutorials/ops/attack-defense)。

:::warn 本文不代替法律意见
取证命令、日志留存要求与个人信息处理规则**因操作系统、发行版、服务商和司法辖区而异**；凡是随环境变化的地方本文都会明确标注。涉及玩家个人数据或可能进入法律程序时，**请咨询专业人士并遵守当地法律与机房政策**。
:::

## 1. 为什么"先取证"是第一条铁律

### 1.1 证据会消失

多数人在被攻击时做的第一件事是**重启**或**重装**。这是最糟的选择：**重启会销毁几乎全部网络层证据**。

| 证据 | 位置 | 消失方式 | 大致存活时间 |
| --- | --- | --- | --- |
| 进程、打开的套接字 | 内存 | 进程结束、重启 | 秒级到分钟级 |
| 当前连接（established） | 内核套接字表 | 连接关闭 | 秒级 |
| conntrack 连接跟踪表 | 内核内存 | 条目超时（随配置） | 秒级到小时级 |
| ARP / 邻居表 | 内核内存 | 条目过期 | 分钟级 |
| 网卡收发包与丢包计数 | 内核计数器 | **重启或网卡重置后清零** | 重启即失 |
| 防火墙规则命中计数 | 内核 netfilter | **重启清零；`iptables -Z` 也清零** | 重启即失 |
| 抓包文件（pcap） | 磁盘 | 仅被删除或磁盘写满覆盖 | 持久 |
| 系统日志 / 服务日志 | 磁盘 | 轮转后压缩、删除 | 天到周 |
| 应用日志（`logs/latest.log`） | 磁盘 | 轮转、被新日志覆盖 | 天 |
| 配置、脚本、定时任务 | 磁盘 | 被"顺手修好"而覆盖 | 持久但易被改动 |
| 崩溃报告 `crash-reports/` | 磁盘 | 一般不自动删除 | 持久 |
| 服务商流量图 / 攻击报告 | 服务商侧 | 按服务商保留期清理 | 天到月 |

**关键区分**：**易失证据（volatile）** 在内存里，重启就没；**持久证据（persistent）** 在磁盘上，但会因轮转、覆盖、误改而丢失。顺序永远是**先固定易失的，再收集持久的**。

### 1.2 重启会毁掉什么

一次重启会同时摧毁：当前所有 TCP 连接与来源 IP 的分布（判断单点还是分布式主要靠它）、conntrack 表（谁和谁通信、包被哪条规则处理）、网卡计数器历史累计值与丢包数、**防火墙规则命中计数**（"我的规则到底拦住了多少"的唯一硬证据）、内存中的可疑进程（若攻击已落地主机，重启等于帮对方清理现场），以及未落盘的日志缓冲区。

:::warn "不重启"不等于"不处置"
你可以在保留现场的同时做缓解：加防火墙规则、限速、切流量到高防、临时封禁。**但做任何修改都要记下来**（见第 3 节），因为修改本身会改变证据。
:::

### 1.3 正确顺序

```text
1. 别重启、别重装、别关机（除非已确认主机被完全控制）
2. 先抓包（tcpdump）—— 网络证据最易失
3. 抓内核状态（ss、conntrack、ip -s link、防火墙计数）
4. 抓进程与服务状态（ps、systemctl、journalctl）
5. 复制日志与配置（对副本操作，不动原件）
6. 计算哈希、写事件日志、记录时间线（统一时区）
7. 然后才开始缓解与加固
```

## 2. 该抓什么（附正确命令）

:::warn 接口名与路径随系统不同
下文用 `eth0` 作为示例网卡名。**实际可能是 `ens3`、`enp1s0`、`eno1`、`bond0` 等**；用 `ip -br link` 或 `ip addr` 确认。同理，日志目录、服务名、防火墙工具在不同发行版上都不一样。
:::

```bash
ip -br link
# 输出示例（你的会不同）：
# lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
# eth0             UP             aa:bb:cc:dd:ee:ff <BROADCAST,MULTICAST,UP,LOWER_UP>
```

### 2.1 抓包：tcpdump

```bash
# Java 版（TCP 25565）
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'port 25565'

# 基岩版 / Geyser（UDP 19132）
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'udp port 19132'
```

| 参数 | 含义 | 为什么必须这样 |
| --- | --- | --- |
| `-i eth0` | 指定网卡 | **换成你的实际接口名**；不指定时 tcpdump 会自己挑，可能挑错 |
| `-nn` | 不做名称解析（IP 与端口保持数字） | 反向 DNS 会**拖慢抓包并丢包**；更严重的是攻击流量会诱使你**对外发起大量 DNS 查询，等于告诉对方"我正在被攻击"** |
| `-s 0` | 抓取完整包，不截断 | 默认只抓前若干字节，**载荷被截断后无法分析协议内容**；`0` 表示完整长度 |
| `-w 文件` | 写入 pcap | 见下方说明 |
| `'port 25565'` | BPF 过滤表达式 | 单引号防止 shell 解释；`port` 同时匹配 TCP 与 UDP |

**为什么必须写文件而不是打印到终端**：攻击期间包速率可能达每秒数十万，把解析结果打到终端会让 tcpdump **自己成为瓶颈并大量丢包**，同时刷屏使终端失去意义；`-w` 直接写二进制，开销小得多。**别忘了磁盘**：`-s 0` 加高速流量可以在几分钟内写出几十 GB，先看剩余空间，并用 `-c` 限制包数，或用 `-C` 按大小轮转、`-W` 限制文件数：

```bash
# 只抓 200000 个包后停止
sudo tcpdump -i eth0 -nn -s 0 -c 200000 -w /var/log/incident-cap.pcap 'port 25565'

# 每个文件 100 MB，最多 20 个（共约 2 GB），自动轮转
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap -C 100 -W 20 'port 25565'

df -h /var/log    # 先看剩余空间
```

:::tip 抓不到包怎么办
**权限**：抓包需要 `CAP_NET_RAW`，用 `sudo`（`setcap` 会扩大风险面，不推荐）。**接口选错**：容器内网卡与宿主机不同（常见 `docker0`、`veth*`、`br-*`），宿主机 `eth0` 未必看得到全部流量。**流量已被旁路清洗**：服务商清洗后，到达你网卡的可能只剩正常流量——这正是要向服务商索要流量数据的原因（见 2.6）。**云平台安全组**：部分平台的流量在到达实例前已被丢弃，本机抓不到。
:::

抓完先做粗略统计（不要用 `tcpdump -r` 逐包刷屏）；更细致的协议分析建议**离线**在另一台机器上用 Wireshark / `tshark` 做，**不要在生产机上边抓边分析**。

```bash
# 只数包数
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q | wc -l

# 来源 IP 出现次数前 20
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q 2>/dev/null \
  | awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -20
```

### 2.2 防火墙状态与计数

```bash
sudo iptables -L -v -n
sudo iptables -t nat -L -v -n

sudo nft list ruleset
sudo nft list counters
```

- `-L` 列规则，`-v` 显示**每条规则的包计数与字节计数**，`-n` 不做名称解析（理由同 `-nn`）；`-t nat` 是 NAT 表（DNAT/SNAT/端口转发），排查"流量被转到哪去了"必须看它。
- **计数器的意义**：`DROP`/`REJECT` 规则上的计数**直接证明规则拦下了多少流量**，是复盘和向服务商说明的最有力数字。**重启或 `iptables -Z` 会清零**，必须在处置早期抓。
- `nft list ruleset` 输出完整规则集（含集合与计数器）；`nft list counters` 只列具名 counter 对象。**只有显式定义了 counter 对象的规则才有独立计数**，普通规则的内联计数以 `counter packets N bytes M` 出现在 `list ruleset` 里。**nft 的子命令与输出格式随版本变化，以 `man nft` 和发行版文档为准。**

```bash
sudo iptables -L -v -n        > /root/incident/fw-iptables.txt 2>&1
sudo iptables -t nat -L -v -n > /root/incident/fw-iptables-nat.txt 2>&1
sudo nft list ruleset         > /root/incident/fw-nft.txt 2>&1
```

### 2.3 连接表

```bash
# 已建立的 Java 连接
ss -tan state established '( sport = :25565 )'

# UDP 套接字（基岩版无"连接"概念，看监听与收发队列）
ss -uan

# 套接字总量摘要（各类状态计数，判断是否大量半开连接）
ss -s

# 含 SYN-RECV，能看到连接洪水的痕迹
ss -tan '( dport = :25565 or sport = :25565 )'

# 按来源 IP 统计连接数，找"单点集中"的来源
ss -tan state established '( sport = :25565 )' | awk 'NR>1 {print $5}' \
  | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

`ss -tan` 中 `t`=TCP、`a`=全部状态、`n`=数字形式（同样避免 DNS 解析）。

**conntrack**（需要 `conntrack-tools` 且内核启用 `nf_conntrack`）：

```bash
sudo conntrack -L    # 导出当前跟踪的全部连接
sudo conntrack -S    # 按 CPU 的错误计数
sudo conntrack -C    # 当前条目数（先看它，再决定要不要 -L）
```

- `conntrack -L` **在连接数很大时可能很慢甚至卡住**，所以先用 `conntrack -C` 评估规模。
- `conntrack -S` 输出 `insert_failed`、`drop`、`early_drop`、`error` 等。**`insert_failed` 或 `early_drop` 增长说明连接跟踪表已满**，此时新连接会被丢弃——**这本身就是可被利用的拒绝服务**，也是"带宽没打满但玩家连不上"的关键线索。

```bash
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

:::warn conntrack 可能根本不存在
以下情况看不到 conntrack：**内核未加载 `nf_conntrack` 模块**、**纯 nftables 且未启用连接跟踪**、**`conntrack-tools` 未安装**、**容器命名空间看不到宿主机表**、**部分云平台定制内核裁剪了该功能**。**这不是你操作错了**，改用 `ss`、`ip -s link` 与防火墙计数即可。反之，某些大内存主机默认 `nf_conntrack_max` 很高，**条目超时时间也随发行版与配置不同，不要照搬别处的数值**。
:::

### 2.4 网卡计数与速率

```bash
ip -s link show eth0
cat /proc/net/dev
```

`ip -s link` 的 `RX`/`TX` 段给出 **bytes / packets / errors / dropped / overrun / mcast**。其中 **`dropped` 与 `overrun` 是关键**：它们说明**流量已超出网卡或内核处理能力**，即使带宽没跑满也已在丢包。`cat /proc/net/dev` 给出所有接口的同样计数，适合整体快照（**累计值，重启清零，两次采样的差值才有意义**）。

```bash
# sysstat 已安装时，连续采样观察速率（每 1 秒一次，共 5 次）
sar -n DEV 1 5
```

:::note sar 的两个前提
1. **`sysstat` 必须已安装**（Debian/Ubuntu：`sudo apt install sysstat`；RHEL 系：`sudo dnf install sysstat`）。
2. **必须已启用历史数据采集**（通常由 sysstat 的 systemd 定时器或 cron 收集）。**从未启用时，`sar` 只能从现在开始采集，看不到攻击发生时的历史速率**——这正是平时就该开监控的原因。带间隔参数的 `sar -n DEV 1 5` 属于**实时采集**，不受历史数据是否启用影响。
:::

`iftop` 与 `nload` 是**可选的实时观察工具**：

```bash
sudo iftop -i eth0    # 按连接对显示实时带宽
sudo nload eth0       # 简单的进出流量曲线
```

:::warn 实时工具装不下证据
`iftop` / `nload` 是**终端里的实时仪表**，关掉就没了，**无法作为取证材料**。应急时用它们快速判断方向没问题，但**必须同时用 tcpdump 落盘**。这类工具本身在高包速率下也会丢包，**不要拿它的数字当精确统计**。安装包名随发行版不同，部分发行版需要先启用 EPEL 之类的额外仓库。
:::

### 2.5 进程与服务证据

```bash
ps auxf
systemctl status <service>
journalctl -u <service> --since "1 hour ago"
```

- `ps auxf`：以**进程树**列出所有进程，看有没有不该在的东西——异常矿工、从 `/tmp` 运行的可执行文件、伪装成 `java` 却指向奇怪路径的进程。**被攻陷的主机上 `ps` 本身可能被替换或劫持，重要结论要用多种方式交叉验证。**
- `systemctl status <service>`：服务状态与最近几行日志。服务名取决于部署方式，例如 `minecraft`、`mcserver`、`paper`，**不是固定的**。
- `journalctl -u <service> --since "1 hour ago"`：systemd 日志，支持 `--since`/`--until`，可写 `"1 hour ago"`、`"2026-10-04 12:00:00"`、`"today"`。**默认按本地时区显示，加 `--utc` 强制 UTC**，取证时强烈建议统一用 `--utc`。日志已轮转时，用 `journalctl -u <service> --since ... --no-pager > 文件` 导出，或用 `journalctl --file` 读取归档文件。

Minecraft 侧：

| 路径 | 内容 | 注意 |
| --- | --- | --- |
| `logs/latest.log` | 当前日志 | **服务器重启时会被覆盖**，重启前必须复制走 |
| `logs/YYYY-MM-DD-N.log.gz` | 历史日志（按天/序号轮转） | 已压缩，仍是有效证据 |
| `crash-reports/` | 崩溃报告 | 一般不自动清理，含堆栈与 JVM 信息 |
| `plugins/*/` | 各插件自己的日志与数据库 | **格式随插件而异**，常见有登录记录、指令审计、封禁记录 |
| `banned-ips.json` / `banned-players.json` | 封禁名单 | 记录你做过什么处置，是时间线的一部分 |
| `usercache.json` / `ops.json` | 玩家与管理员映射 | 把 UUID 和名字对应起来 |

```bash
# 复制而不是移动，绝不改动原件
sudo cp -a /srv/minecraft/logs /root/incident/mc-logs
sudo cp -a /srv/minecraft/crash-reports /root/incident/mc-crash-reports
```

`cp -a` 保留时间戳与权限，**这对取证很重要**——`cp -r` 会把修改时间改成当前时间，破坏时间线。**应用层日志往往比网络层更有用**：网络层只能说"有 4 万个连接"，应用层能说"某个账号在 3 分钟内尝试登录 900 次"；权限组、登录、经济、反作弊插件通常都留记录，**它们是定位"是谁、做了什么"的主要来源**，具体位置与格式请查各插件文档。

### 2.6 云 / 机房侧的证据

**你看到的流量不等于全部流量。** 服务商在更上游，能看到你的实例**被丢弃之前**的入流量（安全组/网络 ACL 丢弃的流量在你机器上根本看不到）、**攻击总带宽与包速率**（pps/Mbps）以及是否触发清洗、攻击类型判断与来源分布，以及平台侧流日志（flow logs）能力——**是否提供、是否收费、保留多久各家差异很大，以服务商文档为准**。

**要做的事：立刻开工单**，说明你在被攻击、要求提供流量细节与攻击报告，并询问是否需要切换高防 IP 或开启清洗。**不要只写"我被打了"**，具体内容见第 5 节。

## 3. 正确保全证据

### 3.1 给所有证据算哈希

```bash
cd /root/incident
sha256sum incident-*.pcap > incident.sha256
```

**哈希的作用是证明"我收集之后没有人改过它"**：

- **哈希文件要与被哈希文件分开保存**（不同目录、不同磁盘，最好另存一份到别处）。放在同一目录里，能改文件的人也能改哈希，证明力归零。
- **校验**：`sha256sum -c incident.sha256`。**哈希文件记录的是相对或绝对路径，移动位置后校验会失败**——这不是文件损坏，是路径变了。
- **对所有证据都做**，不只是 pcap：

```bash
find /root/incident -type f -print0 | sort -z | xargs -0 sha256sum > /root/incident.sha256
```

`find -print0` 加 `xargs -0` 用于正确处理含空格的文件名；`sort -z` 保证顺序稳定，便于比对。**哈希文件写到证据目录之外**，并再复制一份到离线介质。

### 3.2 绝不动原件

- **只在副本上分析**。`tcpdump -r` 是只读的，安全；任何"修复""转换""合并"都应在副本上做。
- 整块磁盘取证时，标准做法是 `dd` 到镜像并立即对镜像计算哈希：

```bash
# 注意：目标容量必须大于源设备；此操作会完全覆盖目标设备
sudo dd if=/dev/sda of=/mnt/evidence/sda.img bs=4M conv=noerror,sync status=progress
sha256sum /mnt/evidence/sda.img > /mnt/evidence/sda.img.sha256
```

:::warn dd 的破坏性
`dd` 的 `of=` 指向什么设备，就**无条件覆盖**什么设备。**执行前务必用 `lsblk` 确认源与目标的设备名，写错一个字母就会毁掉数据。** 不确定时不要执行。
:::

### 3.3 时间线：必须写明时区

**这是最常见也最严重的错误**：把 `journalctl` 的本地时间、服务商的 UTC 时间、插件日志里的时间混在一张表里，事件顺序完全错乱，甚至得出相反结论。

1. **统一用 UTC 记录**，并在文档里显式写明"以下时间均为 UTC"。
2. 同时**记录本机时区与 UTC 偏移**，便于与本地日志对照。
3. 用 ISO 8601 格式，避免 `10/04/2026` 这类有歧义的写法。

```bash
date -u +%FT%TZ      # 例：2026-10-04T09:32:21Z
date +%FT%T%:z       # 例：2026-10-04T17:32:21+08:00
timedatectl          # 查看系统时区与 NTP 同步状态
```

`date -u +%FT%TZ` 输出带 `Z` 后缀的 UTC 时间，**`Z` 表示 UTC，不是时区缩写**（不要写 `CST`，它至少对应三个不同时区）。

:::warn 时钟本身可能是错的
主机时钟不准或 NTP 未同步时，**所有日志时间戳都不可信**。用 `timedatectl` 检查 `System clock synchronized` 是否为 `yes`，并记录当前偏移量。**发现漂移要在事件日志里注明**，否则跨设备对时会得出错误结论。
:::

### 3.4 写事件日志（边处置边记）

| 记录项 | 说明 |
| --- | --- |
| 发现时间 | 谁、通过什么方式发现的（玩家反馈、监控告警、自己看到） |
| 现象 | 具体表现：卡顿、掉线、无法连接、带宽跑满 |
| 每个动作的时间 | **含时区**，写清"我做了什么" |
| 你做的修改 | 加的防火墙规则、限速、封禁的 IP、切换的解析 |
| 证据文件名 | 每个文件是什么、什么时候抓的 |
| 联系过谁 | 服务商工单号、时间、对方回复要点 |
| 当前状态 | 攻击是否仍在进行 |

:::warn 缓解措施本身会改变证据
你为止血加的每条防火墙规则都会**改变后续抓到的流量特征**（原本到达的包现在被丢弃，抓不到了）。这不可避免，但**必须记录**：记下**加规则的时间点**（之后的分析以它为界）、尽量**先抓一轮包再改规则**（哪怕只抓 30 秒）、记录规则的**完整内容**而不是"我加了条限速"。否则事后无法解释"为什么 14:05 之后攻击流量突然消失了"。
:::

### 3.5 文件权限与数据保护

```bash
chmod 700 /root/incident
chmod 600 /root/incident/*
chmod 600 /root/incident.sha256
```

- 证据含**玩家 IP、账号名、聊天内容、可能的登录凭据**，**默认应视为敏感数据**。目录 `700`（只有属主可进入）、文件 `600`（只有属主可读写）。
- **不要**为了"方便查看"把证据放进 Web 目录或 `chmod 777`。
- **传输**用 `scp` / `rsync -e ssh`（走 SSH 加密），不要用明文 FTP 或邮件附件。
- **数据保护**：涉及玩家个人数据时**注意适用法规**（如欧盟 GDPR、各地个人信息保护法）——很多辖区把 IP 地址视为个人信息。原则是**只收集必要范围、限定用途（安全事件调查）、限制访问、到期删除**。**具体义务因国家/地区而异，以当地法律与你的隐私政策为准。**
- **不要**把证据（尤其含玩家聊天与 IP 的 pcap）公开发到论坛或群里"求鉴定"。

## 4. 归因：什么能查、什么查不出来

**把无辜的第三方当成攻击者，会造成真实伤害，也会让你自己的投诉失去可信度。**

### 4.1 伪造源 IP 的 UDP 流量：基本无法归因

UDP 是**无连接**协议，**源 IP 字段可以随意伪造**，且伪造的包不需要收到任何回应就能发出。因此：

- **UDP 洪水（含绝大多数 UDP 反射放大）里的源 IP 是伪造的，通常完全不可归因。**
- **不要**因为某个 IP 在 UDP 洪水里出现最多就去投诉它、封禁它或在公开场合指责它——**那个 IP 极可能是被冒用的受害者**。
- 封禁单个 IP 对伪造流量**没有意义**（换个伪造值即可），正确做法是**上游流量清洗、限速、按协议特征过滤**。

少数仍存在的线索：如果能识别出攻击用的是某个具体服务（DNS、NTP、memcached、CLDAP 等），**那台服务器是"被利用的开放服务器"**，不是攻击者；源 IP 与源端口若有稳定规律，仍有调查价值，但**结论必须谨慎**；流量路径上的中间设备（服务商侧）能看到更多信息。

### 4.2 TCP 攻击：源 IP 通常是真的，但仍不等于"攻击者"

TCP 需要**三次握手**，完成握手就必须能收到返回包，因此**针对 Minecraft 的 TCP 攻击**——机器人批量进服（bot join）、连接洪水、状态查询（status ping）刷屏——**源 IP 一般是真实的**，可以调查。**但"真实 IP"不等于"攻击者本人"**：它可能是**被入侵的第三方主机**（被植入后门的 VPS、被黑的家用路由器）、**代理 / VPN / 机场出口**、**Tor 出口节点**，或**共享 NAT 后的某个用户**。正确表述是：**"该 IP 参与了攻击流量"，而不是"该 IP 的所有者是攻击者"。** 这个区别在投诉时非常重要。

### 4.3 反射 / 放大：源头是无辜的第三方

反射放大攻击的**受害者有两个**：你，以及**那些被利用的开放服务器**。它们被利用是因为管理员**错误地把 DNS、NTP、memcached 等 UDP 服务开放给了公网**。

- **不要把反射源报告为攻击者**，而应报告**"某 IP 上的某服务是开放反射源，正在被滥用"**；
- 给这些 IP 的 `abuse@` 发通知**有帮助**（管理员修好后反射面就消失），但**语气应是"你的服务被滥用"，不是"你在攻击我"**；
- 判断依据：**响应包远大于请求包**（放大倍数），且**来源是众所周知的 UDP 服务端口**。

### 4.4 区分"单点集中"与"分布式"

| 观察到的特征 | 更可能的性质 | 能做什么 |
| --- | --- | --- |
| **单个或少数 IP 占据绝大多数连接** | 单点攻击、被入侵的主机、测试性扫描 | 值得调查该 IP；可临时封禁止血 |
| **成千上万 IP，每个只发少量** | 分布式僵尸网络或伪造源 | 封 IP 无效；靠上游清洗与限速 |
| **TCP 握手完成、连接数稳定增长** | 真实源（bot 进服类） | 调查 IP + 上游防护 + 进服限流 |
| **大量 SYN 但无后续握手** | SYN 洪水（可能伪造源） | 开启 SYN cookies、上游清洗 |
| **UDP 大包涌入、来源端口固定** | 反射放大 | 按协议/端口过滤、上游清洗，**不要投诉源 IP** |
| **流量不大但服务极慢** | 可能是应用层攻击或资源耗尽 | 看应用日志、连接跟踪表与主机资源 |

**核心判断**：**少数 IP 集中 = 值得追；海量 IP 分散 = 追不到或追不完，要转向防护。**

### 4.5 查到 IP 之后做什么

```bash
whois 203.0.113.10
```

`whois` 输出通常包含**网段归属（netname/descr）、所属机构、国家，以及 `abuse` 联系邮箱**。注意：

- **`whois` 客户端不一定预装**（Debian/Ubuntu：`sudo apt install whois`；RHEL 系：`sudo dnf install whois`）；
- **不同 RIR（区域互联网注册机构）输出格式不同**，`abuse-c`、`OrgAbuseEmail`、`abuse-mailbox` 等字段名各异，**要人工读，不要脚本硬匹配**；
- 更推荐 **RDAP**（Registration Data Access Protocol），它是 WHOIS 的**现代 HTTP 替代品**，返回结构化 JSON，支持自动查询。IANA 提供引导服务（`https://rdap.org/ip/<IP>` 会重定向到对应 RIR），**各 RIR 的具体 URL 与字段以各 RIR 文档为准**。

**ASN 归属**：确定该 IP 属于哪个自治系统（AS）以及哪家运营商/机房，有助于判断它是"某云上的 VPS"还是"某国住宅宽带"。查询方式有各 RIR 的 RDAP 服务、`whois -h whois.radb.net` 等，**工具与数据源众多且覆盖有差异**，结论不要只依赖单一来源。

**abuse 联系方式**：WHOIS/RDAP 里的 **`abuse@` 邮箱**（或 abuse 表单）是**正确的举报入口**：**要发给 IP 所属的机房 / 托管商（hosting provider）的 abuse 部门，而不是某个随机玩家的宽带 ISP**——机房对自己网段内的机器有实际处置能力（可暂停服务），ISP 对一台被入侵的家用路由器通常动作很慢。**附上证据**：带时区的时间窗口、协议与端口、来源 IP 列表、包数与速率、pcap 哈希值；**没有证据的投诉通常会被忽略**。涉及多个网段时**分别投诉**，不要在群里公开点名。

### 4.6 法律与边界

- **规则因国家/地区而异**：什么算犯罪、要保留哪些日志、能不能自行调取数据，各国规定不同。**本文不构成法律意见。**
- **推荐顺序**：先联系**服务商**（能清洗流量、能看上游数据、有 abuse 流程）；严重且持续的袭击（勒索、数据窃取、明确的犯罪行为）再考虑**报警 / 网络犯罪举报机构**，并保留完整证据链。
- **绝对不要报复**：对攻击源发起 DDoS（所谓 DDoS-back）、入侵对方主机或"反向黑回去"，**在几乎所有辖区本身就是违法行为**，会让你从受害者变成被告，并摧毁你原本正当的立场。
- **也不要人肉 / 公开悬赏**攻击者 IP：可能误伤无辜第三方，也可能构成骚扰或侵犯隐私。

## 5. 报告与升级

**"我被攻击了，快处理"几乎不会得到有效响应。** 有效的工单要能让对方在 30 秒内判断该做什么：

```text
主题：[DDoS/攻击] 实例 <实例ID/IP> 正在遭受攻击，请求协助与流量数据

1. 受影响资产
   - 公网 IP：203.0.113.10
   - 端口/协议：25565/TCP（Java 版），19132/UDP（基岩版）
   - 实例 ID / 订单号：<填写>

2. 时间窗口（请注明时区）
   - 开始：2026-10-04 09:12 UTC（本地时间 17:12，UTC+8）
   - 结束：仍在持续 / 已于 09:40 UTC 停止
   - 峰值时段：09:20 - 09:35 UTC

3. 攻击类型与量级（已知的部分）
   - 类型判断：UDP 反射放大（疑似 NTP/DNS）/ TCP 连接洪水 / 机器人进服
   - 观测到的速率：约 XX Mbps，约 XX kpps（来源：本机 ip -s link 计数）
   - 网卡丢包：RX dropped 从 0 增至 XXXXX（同期）

4. 已做的缓解
   - 09:25 UTC 添加 iptables 规则限制单 IP 并发连接数
   - 09:30 UTC 封禁来源 IP（仅对 TCP 有效）
   - 未重启、未重装，现场已保全

5. 请求
   - 提供该时段进入本实例的流量统计与攻击报告
   - 确认是否可启用/已启用流量清洗或高防 IP
   - 若有平台侧流日志，请协助导出

6. 证据文件
   - incident-2026-10-04-0915.pcap（sha256: <哈希>）
   - fw-iptables.txt、ss-established.txt、conntrack.txt
   - 需要时可提供完整证据包
```

| 要素 | 为什么必须有 |
| --- | --- |
| **带时区的时间窗口** | 对方要在海量日志里定位你的流量，时间不准等于查不到 |
| **攻击类型与量级** | 决定他们走"清洗"还是"排查"流程 |
| **受影响 IP / 端口** | 确认是打在哪个资产上 |
| **是否仍在持续** | 决定紧急程度 |
| **已做的缓解** | 避免双方重复操作、互相干扰 |
| **证据文件名** | 让沟通可追溯 |

**关于 abuse 举报**：服务商通常有自己的 abuse 邮箱或举报表单，用于处理"其网段内的主机在攻击别人"，**具体地址以服务商官网/WHOIS 记录为准**。**他们能看到你看不到的流量**（上游路由、清洗设备、平台流日志）——你提供终端视角，他们提供网络视角，两边合起来才完整。**隐私限制**：服务商**可能因隐私政策或法律限制，无法把其他客户的详细信息告诉你**，这是正常的，**不要因为对方"不肯给 IP 名单"就认为他们不作为**。持续跟踪并记录工单号与每次回复时间，形成完整沟通时间线（也是事件日志的一部分）。

## 6. 事件之后

**没有复盘的应急响应等于白做一次。**

### 6.1 复盘要回答的问题

| 问题 | 具体看什么 |
| --- | --- |
| **什么起了作用？** | 哪条防火墙规则命中了？清洗是否生效？限速阈值合理吗？ |
| **什么没起作用？** | 哪些措施毫无效果？哪些反而误伤了正常玩家？ |
| **多久才恢复？** | 从发现到缓解的真实耗时，瓶颈在哪一步（发现慢？判断慢？没有预案？） |
| **攻击者回来了吗？** | 对比时间窗口与来源分布，判断是同一波还是新一波 |
| **有数据损失吗？** | 存档是否完整？有没有回档？备份可用吗？ |
| **暴露了什么？** | 是否有账号、密钥、面板口令在过程中被看到或泄露？ |

### 6.2 加固动作

- **限流（rate limit）**：对连接频率、每 IP 并发数、进服速率设上限。**这是最有效且最便宜的一层**。例如 `iptables` 的 `hashlimit`/`connlimit` 模块，或服务端插件层面的进服限流（**具体模块名与语法随内核与工具链不同，配置前先确认模块可用**）。
- **上代理 / 高防**：把真实 IP 藏起来（TCPShield 类代理、服务商高防 IP、CDN 的 TCP 转发）。**注意**：代理能挡网络层洪水，**挡不住应用层攻击（bot 进服、协议漏洞）**，那需要服务端侧的验证与限流。
- **换服务商 / 换机房**：服务商不提供清洗、或攻击针对该网段的固定目标时，迁移是现实选择。**迁移前先确认新家是否有 DDoS 防护与清洗能力。**
- **白名单**：熟人小圈子服**直接开 `white-list=true` 是最彻底的方案**——攻击者连不进来，就没法用进服类攻击消耗你的资源。
- **减少暴露面**：关闭不必要的端口（RCON、query、面板），见 [网络安全基础](/tutorials/ops/network-security)；主机侧加固见 [系统安全加固](/tutorials/ops/system-security)。
- **监控与告警**：**下一次攻击时，你希望是被监控叫醒的，而不是被玩家骂醒的。** 至少监控带宽、连接数、TPS 与进程存活。

### 6.3 备份是否完好、是否离线

- **验证备份真的能恢复**，而不只是"文件存在"。恢复演练见 [备份与恢复](/tutorials/java/backup) 与 [异地备份](/tutorials/ops/offsite-backup)。
- **确认至少一份副本是离线的**（或不可变/只读）。若攻击伴随主机入侵，**在线且可写的备份可能已被加密或删除**。
- **检查备份时间点**：攻击期间若发生回档，要明确**恢复到哪个时间点**，以及玩家数据会退回多久。

### 6.4 凭据与密钥轮换

**只要有任何暴露的可能，就假定已泄露，全部轮换。**

| 对象 | 动作 |
| --- | --- |
| 面板 / 后台账号口令 | 立即更换，并启用两步验证（如有） |
| SSH 私钥 | 重新生成密钥对，删除旧公钥，检查 `authorized_keys` 有无多余条目 |
| RCON 口令 | 更换；确认 `enable-rcon` 未对公网开放 |
| 数据库账号 | 更换口令，检查是否有 `root@%` 之类过宽的授权 |
| 云平台 API Key / Access Key | 在控制台吊销并重建，检查有无异常调用记录 |
| 服务账号 / Token（插件、备份、监控） | 逐一吊销重建 |
| 玩家账号 | 若插件数据库泄露，**通知玩家改密码** |

**同时检查**：`~/.ssh/authorized_keys`、`/etc/passwd` 与 `/etc/shadow` 有无新增账号、`crontab -l` 与 `/etc/cron.*` 有无可疑定时任务、systemd 有无异常 unit。**这些检查要在完成取证之后做，且把发现记录下来。**

### 6.5 经验清单

```text
[ ] 发现是否及时？监控告警是否覆盖了带宽、连接数、TPS、进程存活？
[ ] 有没有书面预案？（谁负责判断、谁负责联系服务商、谁负责公告玩家）
[ ] 抓包是否及时？有没有因为先重启而丢掉证据？
[ ] 时间线是否统一了时区？
[ ] 哈希是否已计算并与证据分开保存？
[ ] 是否发生过误封正常玩家？误封如何解除？
[ ] 服务商工单是否记录了完整时间线与证据？
[ ] 备份是否验证可恢复、是否有离线副本？
[ ] 所有可能暴露的凭据是否已轮换？
[ ] 有没有把"这次学到的"写进文档，而不是留在脑子里？
```

## 7. 可直接使用的取证脚本

下面的脚本把第 2 节里**易失**的部分一次性收集到带时间戳的目录，计算哈希并打印摘要。**用法：`sudo bash capture-evidence.sh`**（抓包与 conntrack 需要 root）。**运行前请确认**接口名（脚本会自动探测默认路由接口）、证据目录（默认 `/root/incident`）、抓包时长与包数上限。**脚本只做只读采集，不修改任何配置、不重启任何服务。**

```bash
#!/usr/bin/env bash
#
# capture-evidence.sh - 采集 Minecraft 服务器被攻击时的易失证据
#
# 用法: sudo bash capture-evidence.sh
#
# 特点:
#   - 只读采集，不修改系统配置，不重启服务
#   - 可选工具用 command -v 判断，缺失时记录并跳过
#   - 所有采集结果计算 SHA-256，摘要写入独立文件
#
# 注意: 接口名、服务名、日志路径因系统而异，请按需修改下方变量。

set -u

# ---------------- 可调参数 ----------------
IFACE="${IFACE:-}"                            # 留空则自动探测默认路由接口
CAPTURE_SECONDS="${CAPTURE_SECONDS:-60}"      # 抓包持续秒数
CAPTURE_PACKETS="${CAPTURE_PACKETS:-200000}"  # 抓包数量上限，防止写满磁盘
MC_TCP_PORT="${MC_TCP_PORT:-25565}"           # Java 版端口
MC_UDP_PORT="${MC_UDP_PORT:-19132}"           # 基岩版 / Geyser 端口
MC_SERVICE="${MC_SERVICE:-}"                  # systemd 服务名，留空则跳过
MC_DIR="${MC_DIR:-}"                          # 服务端目录，留空则跳过日志复制
BASE_DIR="${BASE_DIR:-/root/incident}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BASE_DIR%/}/incident-${STAMP}"

# ---------------- 前置检查 ----------------
if [ "$(id -u)" -ne 0 ]; then
  echo "错误: 需要 root 权限（抓包与 conntrack 需要）。请用 sudo 运行。" >&2
  exit 1
fi

mkdir -p "$OUT" || { echo "错误: 无法创建 $OUT" >&2; exit 1; }
chmod 700 "$BASE_DIR" 2>/dev/null || true
chmod 700 "$OUT" 2>/dev/null || true

if [ -z "$IFACE" ]; then
  IFACE="$(ip route show default 2>/dev/null | awk '/default/ {print $5; exit}')"
fi
if [ -z "$IFACE" ]; then
  IFACE="eth0"
  echo "警告: 未能自动探测默认路由接口，回退为 eth0。请用 IFACE=... 覆盖。" >&2
fi

echo "==> 证据目录: $OUT"
echo "==> 采集接口: $IFACE"
echo "==> 采集时间: $STAMP (UTC)"
echo "==> 磁盘剩余空间:"
df -h "$OUT" 2>/dev/null || true

# ---------------- 采集函数 ----------------
capture() {
  _name="$1"
  shift
  echo "  - $_name"
  "$@" > "${OUT}/${_name}.txt" 2>&1 || echo "    (命令返回非零，输出仍已保存)"
}

{
  echo "采集开始(UTC): $(date -u +%FT%TZ)"
  echo "本地时间: $(date +%FT%T%:z)"
  echo "主机名: $(hostname)"
  echo "内核: $(uname -a)"
  echo "运行时长: $(uptime)"
  echo "接口: $IFACE"
  echo "Java 端口: $MC_TCP_PORT  UDP 端口: $MC_UDP_PORT"
} > "${OUT}/meta.txt" 2>&1
chmod 600 "${OUT}/meta.txt" 2>/dev/null || true

echo "==> 采集系统与进程状态"
capture ps-auxf ps auxf
capture ss-summary ss -s
capture ss-tcp-all ss -tan
capture ss-udp ss -uan
capture ss-tcp-listen ss -tlnp
capture ip-addr ip -br addr
capture ip-route ip route show
capture ip-neigh ip neigh show
capture uptime uptime
capture date-utc date -u +%FT%TZ
capture timedatectl timedatectl
capture df-h df -h

if command -v ss >/dev/null 2>&1; then
  echo "  - ss-java-established"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" \
    > "${OUT}/ss-java-established.txt" 2>&1 || true
  echo "  - ss-source-ranking"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" 2>/dev/null \
    | awk 'NR>1 {print $5}' | cut -d: -f1 \
    | sort | uniq -c | sort -rn | head -50 \
    > "${OUT}/ss-source-ranking.txt" 2>&1 || true
fi

echo "==> 采集网卡计数"
if command -v ip >/dev/null 2>&1; then
  echo "  - ip-s-link"
  ip -s link show "$IFACE" > "${OUT}/ip-s-link.txt" 2>&1 || true
fi
[ -r /proc/net/dev ] && capture proc-net-dev cat /proc/net/dev
if command -v sar >/dev/null 2>&1; then
  capture sar-dev sar -n DEV 1 5
else
  echo "sar 未安装，跳过实时速率采样（sysstat 提供 sar）" > "${OUT}/sar-dev.txt"
fi

echo "==> 采集防火墙状态与计数"
if command -v iptables >/dev/null 2>&1; then
  capture fw-iptables iptables -L -v -n
  capture fw-iptables-nat iptables -t nat -L -v -n
else
  echo "iptables 不可用" > "${OUT}/fw-iptables.txt"
fi
if command -v nft >/dev/null 2>&1; then
  capture fw-nft nft list ruleset
  capture fw-nft-counters nft list counters
else
  echo "nft 不可用" > "${OUT}/fw-nft.txt"
fi

echo "==> 采集连接跟踪表（如可用）"
if command -v conntrack >/dev/null 2>&1; then
  capture conntrack-list conntrack -L
  capture conntrack-stats conntrack -S
  capture conntrack-count conntrack -C
else
  echo "conntrack 命令不可用（需要 conntrack-tools，且内核需启用 nf_conntrack）" \
    > "${OUT}/conntrack-list.txt"
fi
[ -r /proc/sys/net/netfilter/nf_conntrack_count ] \
  && capture conntrack-sysctl cat /proc/sys/net/netfilter/nf_conntrack_count
[ -r /proc/sys/net/netfilter/nf_conntrack_max ] \
  && capture conntrack-max cat /proc/sys/net/netfilter/nf_conntrack_max

echo "==> 采集服务与日志"
if [ -n "$MC_SERVICE" ] && command -v systemctl >/dev/null 2>&1; then
  capture systemctl-status systemctl status "$MC_SERVICE" --no-pager
  if command -v journalctl >/dev/null 2>&1; then
    capture journalctl-1h \
      journalctl -u "$MC_SERVICE" --since "1 hour ago" --utc --no-pager
  fi
else
  echo "未指定 MC_SERVICE，跳过服务状态采集（用法: MC_SERVICE=minecraft sudo -E bash $0）" \
    > "${OUT}/systemctl-status.txt"
fi

if [ -n "$MC_DIR" ] && [ -d "$MC_DIR" ]; then
  echo "  - 复制服务端日志（-a 保留时间戳）"
  [ -d "${MC_DIR}/logs" ] && cp -a "${MC_DIR}/logs" "${OUT}/mc-logs" 2>/dev/null || true
  [ -d "${MC_DIR}/crash-reports" ] \
    && cp -a "${MC_DIR}/crash-reports" "${OUT}/mc-crash-reports" 2>/dev/null || true
else
  echo "未指定 MC_DIR，跳过服务端日志复制（用法: MC_DIR=/srv/minecraft sudo -E bash $0）" \
    > "${OUT}/mc-logs-note.txt"
fi

echo "==> 短时抓包 ${CAPTURE_SECONDS}s / 最多 ${CAPTURE_PACKETS} 包"
if command -v tcpdump >/dev/null 2>&1; then
  PCAP="${OUT}/capture-${STAMP}.pcap"
  timeout "$CAPTURE_SECONDS" tcpdump -i "$IFACE" -nn -s 0 \
    -c "$CAPTURE_PACKETS" -w "$PCAP" \
    "port ${MC_TCP_PORT} or udp port ${MC_UDP_PORT}" 2>"${OUT}/tcpdump.log" || true
  echo "  - 抓包文件: $PCAP"
  echo "  - 包数统计:"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | wc -l | tee "${OUT}/pcap-packet-count.txt" || true
  echo "  - 来源 IP 排行(前 30):"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | awk '{print $3}' | cut -d. -f1-4 \
    | sort | uniq -c | sort -rn | head -30 > "${OUT}/pcap-source-ranking.txt" || true
else
  echo "tcpdump 未安装，无法抓包。请尽快安装后重新采集（Debian/Ubuntu: apt install tcpdump）" \
    > "${OUT}/tcpdump.log"
fi

echo "==> 计算 SHA-256"
find "$OUT" -type f ! -name 'SHA256SUMS' -print0 \
  | sort -z | xargs -0 sha256sum > "${OUT}/SHA256SUMS" 2>/dev/null || true
# 校验和另存一份到证据目录之外，避免被同时篡改
cp "${OUT}/SHA256SUMS" "${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt" 2>/dev/null || true
find "$OUT" -type f -exec chmod 600 {} + 2>/dev/null || true

echo
echo "=================== 采集摘要 ==================="
echo "证据目录 : $OUT"
echo "开始时间 : $(head -n 1 "${OUT}/meta.txt" 2>/dev/null)"
echo "接口     : $IFACE"
echo "文件数量 : $(find "$OUT" -type f | wc -l)"
echo "占用空间 : $(du -sh "$OUT" 2>/dev/null | cut -f1)"
echo "抓包文件 : $(ls -1 "${OUT}"/*.pcap 2>/dev/null | head -n 1)"
echo "校验文件 : ${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt"
echo "------------------------------------------------"
echo "下一步（重要）:"
echo "  1. 不要重启、不要重装系统，易失证据重启即失。"
echo "  2. 立即把证据复制到另一台机器或离线介质:"
echo "     scp -r root@<本机IP>:$OUT ./evidence/"
echo "  3. 记录事件日志，时间统一用 UTC，并写明本机时区偏移。"
echo "  4. 联系服务商开工单，附上时间窗口与证据文件名（见文档第 5 节）。"
echo "================================================"
```

| 项 | 说明 |
| --- | --- |
| `set -u` 而非 `set -e` | 采集脚本要**尽量把能抓的都抓完**，某个可选命令失败不应中断整个采集 |
| `command -v` 守卫 | 只对**可选工具**（`sar`、`nft`、`conntrack`、`tcpdump`、`systemctl`）使用；核心命令（`ip`、`ss`）假定存在 |
| `timeout` | 限制抓包时长；**`timeout` 属于 GNU coreutils，多数 Linux 发行版自带**，极小化镜像可能没有 |
| `-c "$CAPTURE_PACKETS"` | 包数上限，防止攻击期间写满磁盘；**时长与包数谁先满足谁生效** |
| `cp -a` | 保留日志原件的**时间戳与权限**，这是取证的基本要求 |
| 抓包过滤器 | `'port 25565 or udp port 19132'`：**`port` 同时匹配 TCP/UDP**，所以写成 `port 25565` 加 `udp port 19132`，避免把 19132 的 TCP 也抓进来 |
| 校验和 | 目录内留一份，**另外在 `BASE_DIR` 下再存一份**；真正严格的场景应把校验和与证据分机器保存 |
| 服务名与路径 | `MC_SERVICE`、`MC_DIR` **必须按你的部署填写**，脚本无法猜测 |
| 容器环境 | 在容器里运行时，`IFACE` 与 `MC_DIR` 都要指向**容器网络命名空间内的**接口与路径 |

:::warn 采集脚本不能代替判断
脚本负责**把易失证据落盘**，但**判断"这是什么攻击、要不要投诉、要不要切高防"仍然要靠人**。脚本跑完后请按第 1 至第 6 节的流程继续，尤其别忘了**写事件日志**和**联系服务商**。
:::

配套阅读：[网络安全基础](/tutorials/ops/network-security)（端口与防火墙）、[常见网络攻击与防御](/tutorials/ops/attack-defense)（攻击类型与预防）、[系统安全加固](/tutorials/ops/system-security)（主机侧加固）、[异地备份](/tutorials/ops/offsite-backup) 与 [备份与恢复](/tutorials/java/backup)（数据保全与恢复演练）。

> 取证命令与合规要求因系统与地区而异，请以当地法律与机房政策为准。
