---
title: 监控与告警
slug: monitoring
cat: ops
level: 3
order: 17
minutes: 16
tags: [监控, 告警, Prometheus, Grafana, UptimeKuma, TPS, MSPT, 运维]
updated: 2026-10-04
draft: false
---

服务器出问题有两种典型场景。

第一种：玩家在群里说"服炸了"，你打开面板一看确实起不来了，然后开始查——**这是事后分析**，工具是 [用 spark 分析服务器性能](/tutorials/ops/spark)。

第二种：磁盘还有 3% 空间、备份脚本连续三天失败、内存一路爬到开始用 swap，而**你完全不知道**，直到存档写不进去为止。

这一篇讲第二种。核心问题只有一个：**怎么让机器在出事之前主动来找你，而不是等你去找它。**

本篇与 [用 spark 分析服务器性能](/tutorials/ops/spark) 是互补关系：spark 回答"刚才为什么卡"，监控告警回答"现在是不是要出事"。数据保全见 [备份与恢复](/tutorials/java/backup) 与 [异地备份](/tutorials/ops/offsite-backup)；主机加固见 [系统安全加固](/tutorials/ops/system-security)。

:::warn 本文的配置以官方文档为准
下面出现的端口、路径、服务名与配置键**都会随发行版、安装方式和软件版本变化**。示例的作用是说明"该配什么"，**不是可以直接照抄的成品**；落地前请对照 Prometheus、node_exporter、Grafana、Uptime Kuma 与 NUT 的官方文档，以及你自己系统上实际生成的配置文件。
:::

## 1. 监控到底在监控什么

先分清两类完全不同的东西，很多"监控没用"的挫败感都来自把两者混为一谈：**资源与服务状态**（CPU、内存、磁盘空间与 I/O、网络、服务是否在跑、证书是否快过期）是客观数字，可以画成曲线，适合设阈值告警；**游戏体验指标**（TPS、MSPT、玩家数、登录失败率）需要服务端配合暴露，是"玩家真实感受"的代理指标。第一类**必须监控**，因为它们的恶化是渐进的、肉眼看不见的；第二类**值得监控**，但要知道它的局限：TPS 是一个平均量，会把尖峰摊平；MSPT 好而玩家说卡时，问题可能在网络或客户端。

### 1.1 一张必须监控的清单

| 项目 | 为什么必须 | 典型恶化方式 |
| --- | --- | --- |
| 可用性 / 在线时间 | 服务挂了但没人发现，是最严重也最常见的事故 | 进程崩溃、OOM 被杀、开机没自启 |
| TPS / MSPT | 直接决定玩家体验，也是"该不该动手优化"的依据 | 实体堆积、插件热点、区块生成 |
| CPU | 主线程是单线程的，**单核打满就会掉 TPS**，哪怕其他核很闲 | 玩家变多、红石机器、宿主超售 |
| 内存 | 堆与常驻内存都会缓慢爬升，**爬到开始用 swap 就是灾难前兆** | 内存泄漏、世界变大、实体不回收 |
| 磁盘空间 | **磁盘满会导致服务端写存档失败**，属于会毁数据的一类 | 备份堆积、日志疯涨、核心转储 |
| 磁盘 I/O | 世界保存、区块加载、备份都吃 I/O，**它慢的时候 CPU 看起来还很闲** | 机械盘、SSD 快满、备份与游戏抢盘 |
| 网络 | 带宽打满与丢包都会让玩家掉线，且**服务端自身指标完全正常** | 攻击、备份上传占满上行、线路故障 |
| 玩家数 | 既是业务指标，也是**最灵敏的异常探测器**：突然归零往往先于任何告警 | 崩服、被攻击、登录被拒 |
| 备份是否成功 | 备份失败时你不会有任何感觉，**直到你需要它的那一天** | 磁盘满、权限变更、脚本报错被忽略 |
| 证书有效期 | 面板、状态页、网站用 HTTPS 时，**过期当天才会暴露** | 忘记续期、自动续期任务失败 |

:::tip 磁盘空间为什么排在最前面
因为它是清单里**唯一会直接毁掉数据**的一项。CPU 高、TPS 低，玩家只是难受；磁盘写满，服务端保存世界失败，可能丢的是几个小时的进度甚至整个存档。所以如果只配一条告警，配磁盘。
:::

## 2. 事后分析与事前告警

这两个词经常被混着用，但它们解决的是完全不同的问题。

| | 事后分析 | 事前告警 |
| --- | --- | --- |
| 触发时机 | 问题已经发生、已经影响玩家 | 问题正在形成，或刚刚发生 |
| 典型工具 | spark、日志、`crash-reports/` | Uptime Kuma、Prometheus + Alertmanager、systemd `OnFailure` |
| 回答的问题 | "刚才到底发生了什么" | "现在是不是要出事" |
| 输出 | 调用树、火焰图、错误栈 | 一条通知，附带"该怎么办" |
| 局限 | **只能解释过去** | **只能发现你预先想到的问题** |

**两者缺一不可，但优先级不同。** 没有事前告警，你会从玩家嘴里知道服务器挂了；没有事后分析，你知道挂了但不知道为什么，下次还会挂。

### 2.1 为什么"看 spark 就够了"是错的

一个常见误解是"我定期跑 spark 看健康报告就行了"。spark 的健康报告确实是长期状态的好工具，但它是**你主动去看的**：凌晨三点磁盘写满时，没有人会主动打开 spark。告警的本质是**把"主动去看"变成"被动被通知"**，从而让"没有时间天天看"这件事不再致命。

:::note 别指望监控发现一切
监控只能发现**你已经想到并且采集了**的问题。第一次遇到"某个插件每天凌晨内存涨 200 MB"这种问题时，你通常没有任何指标能证明它。**正确做法是：出一次事，补一条监控。** 监控体系是长出来的，不是一次配齐的。
:::

## 3. 先做最便宜的：三条零成本方案

在装 Prometheus 之前，先把这三件事做了——它们能覆盖大部分"服务器挂了没人知道"的场景，而且几乎不花时间。

### 3.1 外部可用性检查：Uptime Kuma

思路很简单：**让一台不在你服务器上的机器，每隔一段时间来敲一次门**。为什么必须是"不在你服务器上"？因为服务器整机断电、网络中断、系统卡死时，**跑在它自己身上的监控脚本会一起死掉**，什么也报告不了——这一点是外部监控与本地监控最本质的区别。

Uptime Kuma 是一个自托管的监控工具，官方把它定位为"易于使用的自托管监控工具"：监控类型覆盖 HTTP(S)、TCP、HTTP(S) 关键字与 JSON 查询、WebSocket、Ping、DNS 记录、Push、Steam 游戏服务器、Docker 容器等；官方 README 写明支持 **20 秒**检查间隔，通知渠道包括 Telegram、Discord、Gotify、Slack、Pushover、邮件（SMTP）等，官方称有 **90 多个**通知服务；另外还有多语言、多个状态页、证书信息、代理支持与 2FA。对 Minecraft 服务器，最实用的三种监控是：

| 监控类型 | 监控什么 | 注意 |
| --- | --- | --- |
| TCP 端口 | 服务端进程是否在监听端口 | **进程活着但卡死时，端口仍然通**，它测不出"卡" |
| Ping | 主机是否可达 | 只能证明网络层活着 |
| HTTP(S) | 面板、状态页、网站是否可用 | 顺便能看证书到期时间 |

**把监控放在另一台机器或另一家服务商上。** 放在同一台机器上，断电时它和服务器一起消失。

### 3.2 systemd：让服务自己报告失败

如果服务端是用 systemd 管理的（见 [系统安全加固](/tutorials/ops/system-security)），那么"服务挂了"这件事 systemd 本来就知道，你只需要让它告诉你。**先分清两个经常被搞混的选项**：`Restart=on-failure` 在进程异常退出时**自动重启**（所有长期运行的服务都该配，用来缩短故障时间），`OnFailure=` 在服务进入 failed 状态时**触发另一个 unit**（用来发通知、收集现场、执行清理）。

`Restart=` 是"自愈"，`OnFailure=` 是"告警"。**两个都要配**，但不要指望 `Restart=` 能替代告警：如果服务一直在崩溃-重启循环，`Restart=` 只会让它继续循环，而你什么都不会知道。一个最小的告警 unit，以及服务端 unit 里引用它的那一行：

```ini
# /etc/systemd/system/mc-alert@.service
[Unit]
Description=Send an alert for a failed unit (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# 把 %i（失败的服务名）交给你的通知脚本
ExecStart=/usr/local/bin/mc-notify.sh "systemd unit %i entered the failed state"

# --- 以下是服务端 unit 的 [Unit] 段 ---
# 服务进入 failed 状态时，启动模板实例 mc-alert@<本服务名>.service
OnFailure=mc-alert@%n.service
```

改完记得 `systemctl daemon-reload`，然后**真的把它弄挂一次验证**。没验证过的告警和没有告警是一样的。

:::warn 崩溃-重启循环会掩盖问题
`Restart=always` 加上"玩家没察觉"，可能让一台**每十分钟崩一次**的服务器看起来完全正常。**告警要能区分"偶尔重启"和"一直在重启"**，否则你会被静默地骗很久。检查 `systemctl status` 里的重启计数与最近退出时间。
:::

### 3.3 一条 cron + 一个检查脚本

最原始也最可靠的方案：让 cron 每分钟跑一个脚本，脚本发现异常就以非零退出码结束，再由 cron 的邮件或你的通知脚本把结果送出去。

**关键约定：脚本用退出码表达结果。** `0` 表示一切正常，**非零表示出事了**。这样无论是 cron、systemd timer 还是别的调度器，都能用同一套判断逻辑。

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-healthcheck.sh
# 退出码约定：0 = 正常，非零 = 异常（会被 cron / systemd 当作失败）
set -uo pipefail
PORT="25565"        # 服务端监听端口
WARN_DISK=85        # 磁盘使用率告警线（百分比）
fail=0
note() { printf '%s\n' "$*"; }
bad()  { printf 'FAIL: %s\n' "$*"; fail=1; }

# 1) TCP 端口是否有人监听（ss 的过滤表达式用引号包起来，避免被 shell 拆分）
if command -v ss >/dev/null 2>&1; then
  if ss -lnt "( sport = :${PORT} )" | grep -q .; then
    note "port ${PORT}: listening"
  else
    bad "port ${PORT} is not listening"
  fi
fi
# 2) 服务端进程是否存在（方括号写法可避免 pgrep 匹配到自己；按实际进程名调整）
if pgrep -f '[s]erver\.jar' >/dev/null 2>&1; then
  note "server process: present"
else
  bad "server process not found"
fi
# 3) 根文件系统使用率（df -P 保证输出格式稳定，便于按列解析）
used="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ -n "${used}" ] && [ "${used}" -ge "${WARN_DISK}" ]; then
  bad "disk usage on / is ${used}% (threshold ${WARN_DISK}%)"
else
  note "disk usage on /: ${used:-unknown}%"
fi
exit "${fail}"
```

配到 cron 里（每分钟一次）：

```bash
# crontab -e
* * * * * /usr/local/bin/mc-healthcheck.sh || /usr/local/bin/mc-notify.sh "healthcheck failed on $(hostname)"
```

:::warn cron 的邮件经常是黑洞
很多系统上 cron 的邮件要么没配 MTA、要么进了没人看的邮箱。**不要假设"cron 会通知我"**，一定要自己验证一次：手动把脚本改成必然失败，看通知有没有真的送到你手上。

上面的示例里用到了 `/usr/local/bin/mc-notify.sh`，**它需要你自己实现**：最简单的做法是往一个 Webhook 发一条 POST，或者调用 Uptime Kuma 的 Push 监控地址。选择哪个渠道取决于你已有的工具，**具体接口以该工具的官方文档为准**。
:::

:::note TPS 与 MSPT 怎么进脚本
上面的脚本没有检查 TPS 与 MSPT，因为**这两个值不在操作系统层面**，只能由服务端、插件或 MCDR 暴露出来。取到值之后判断本身很简单，注意 shell 只支持整数比较，浮点要用 `awk`：

```bash
mspt="$(your-command-to-read-mspt 2>/dev/null)"
if [ -n "${mspt}" ] && awk -v v="${mspt}" -v m="50" 'BEGIN {exit !(v > m)}'; then
  bad "MSPT ${mspt} exceeds 50"
fi
```

**取值方式随核心、版本与插件而异，请以你所用方案的官方文档为准。**
:::

## 4. 正规方案：node_exporter + Prometheus + Grafana

三条零成本方案能告诉你"挂了没有"，但回答不了"磁盘是怎么涨上来的""内存是几点开始爬的"。要做到后者，需要一套能**存历史数据并画成曲线**的体系。

### 4.1 三个组件各干什么

| 组件 | 角色 | 一句话理解 |
| --- | --- | --- |
| node_exporter | 采集器（exporter） | 把主机的 CPU、内存、磁盘、网络等指标变成一个 HTTP 接口上的文本，等别人来抓 |
| Prometheus | 时序数据库 + 抓取器 | **定期主动去抓** exporter 暴露的指标，存成时间序列，并按规则判断是否要告警 |
| Grafana | 可视化 | 连接 Prometheus，把时间序列画成图、拼成面板 |
| Alertmanager | 告警路由 | Prometheus 判定"该告警了"之后，由它负责分组、去重、静默和发送（见第 6 节） |

**理解"拉（pull）"这个模型很重要**：不是 exporter 往 Prometheus 推数据，而是 **Prometheus 定时去拉**。副作用很有用——抓不到某个目标时 Prometheus 自己就知道"它挂了"，这个 `up` 指标本身就是最基础的可用性监控。

### 4.2 node_exporter 与一个最小的 systemd unit

node_exporter 是一个单独的二进制文件，跑起来之后在默认端口上暴露指标。官方文档给出的验证方式是：

```bash
./node_exporter                              # 前台直接运行
curl http://localhost:9100/metrics           # 确认指标能被读到（默认端口 9100）
curl http://localhost:9100/metrics | grep "node_"   # 只看 node_ 前缀的主机指标
```

官方文档说明主机指标以 `node_` 为前缀，例如 `node_cpu_seconds_total`（CPU 各模式累计时间，配合 `rate()` 得到使用率）、`node_filesystem_avail_bytes`（文件系统对非 root 用户可用的字节数）、`node_network_receive_bytes_total`（网卡累计接收字节数）。上游仓库的示例 unit 使用 **socket 激活**（`Requires=node_exporter.socket` 加 `--web.systemd-socket`），因此那个文件**不能单独使用**，必须配套 socket unit；下面给一个不依赖 socket 激活、更直白的写法：

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
# 发行版包安装时，用户与二进制路径通常由包提供（常见为 prometheus-node-exporter）
User=node_exporter
Group=node_exporter
# 二进制路径随安装方式不同：上游二进制常见 /usr/local/bin/node_exporter
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

启用并验证：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
systemctl status node_exporter --no-pager
curl -s http://127.0.0.1:9100/metrics | head
```

:::warn 路径、用户与端口都要按实际情况改
上面的 `User=`、`ExecStart=` 路径和监听端口**只是示意**。发行版包安装与上游二进制安装的位置不同，用户是否存在也取决于包；**端口 9100 是默认值，不是规定值**，改过之后 Prometheus 的目标地址也要同步改。另外，node_exporter 的某些采集器（尤其是读取 systemd 或日志的那些）在繁忙机器上开销不小，**在容器里往往还需要额外挂载才能拿到宿主机指标**；启用哪些采集器以你所装版本的官方文档与 `--help` 输出为准。
:::

### 4.3 Prometheus 的最小配置

下面是 Prometheus 官方 node_exporter 指南给出的最小抓取配置，并补上规则评估与告警所需的字段：

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s      # 官方默认 1m，此处显式设为 15s
  scrape_timeout: 10s       # 不能大于抓取间隔；官方默认 10s
  evaluation_interval: 1m   # 规则评估间隔；官方默认 1m

rule_files:                 # 告警规则文件（第 5 节给出示例内容）
  - /etc/prometheus/rules/*.yml

alerting:                   # 判定告警后交给谁处理（第 6 节）
  alertmanagers:
    - static_configs:
        - targets:
            - 127.0.0.1:9093

scrape_configs:
  - job_name: node          # 主机指标：官方指南中的最小示例
    static_configs:
      - targets: ['localhost:9100']

  - job_name: prometheus    # 抓自己，便于确认它本身是否健康
    static_configs:
      - targets: ['localhost:9090']
```

校验并重载配置：

```bash
# 用官方自带的校验工具，避免带着语法错误重启
promtool check config /etc/prometheus/prometheus.yml
# 重载（需要启动时启用了 --web.enable-lifecycle）
curl -X POST http://127.0.0.1:9090/-/reload
```

:::note 端口与路径都是默认值
`9090`（Prometheus）与 `9093`（Alertmanager）是这两个项目的**默认端口**，可以在启动参数或配置里修改。配置文件路径随发行版与安装方式不同，`/etc/prometheus/` 只是 Debian 系的常见位置。**别照抄，先看你系统上文件到底在哪。**
:::

### 4.4 Grafana

Grafana 的角色是把 Prometheus 里的数据画出来，默认端口是 `3000`，配置与数据目录位置随安装方式变化。对 Minecraft 主机，先做四张图就够用了：磁盘使用率（`node_filesystem_avail_bytes` 与 `node_filesystem_size_bytes`）、CPU 使用率（`rate(node_cpu_seconds_total[5m])`）、内存与 swap（`node_memory_*`）、磁盘 I/O 等待（`rate(node_cpu_seconds_total{mode="iowait"}[5m])`）。

:::tip 面板要能回答"和上周比怎么样"
只有一条当前值的面板几乎没有价值。**每张图都要能切换时间范围**，这样你才能看出"磁盘从哪天开始加速下降""内存是哪个版本更新后开始涨"。这也是为什么必须存历史数据，而不是只看当下。
:::

## 5. 告警阈值：设多少，为什么

阈值不是越灵敏越好。**设得太松，事故已经发生；设得太紧，你会在第三天开始忽略所有通知。** 下面给出的是社区常用的起点，请按你自己的基线调整。

| 项目 | 建议起点 | 为什么是这个值 | 常见误报原因 |
| --- | --- | --- | --- |
| 磁盘使用率 | **超过 85%** | 留出足够时间在写满之前处理；写满会直接导致保存失败 | 临时备份文件占位、日志轮转滞后 |
| MSPT | **持续超过 50 ms** | 50 ms 是 20 TPS 对应的单 tick 预算，长期超过它意味着 TPS 已经守不住 | 单次尖峰被平均值掩盖，所以要加"持续"条件 |
| 备份任务失败 | **任意一次失败即告警** | 备份失败时不会有任何其他症状，只能靠它自己报告 | 脚本退出码没写对、磁盘暂时满 |
| 服务未运行 | **`systemd` 状态为 failed 或非 active** | 最基础的可用性，必须有人知道 | 计划内重启没有加维护窗口 |
| 内存高且开始用 swap | **swap 使用量持续大于 0** | 一旦开始换页，延迟会断崖式恶化；**"内存高但没有 swap"通常只是浪费了内存，不一定要告警** | 系统本来就有少量 swap 活动 |
| CPU 持续高 | **持续接近单核满载** | Minecraft 主线程是单线程的，**一个核打满就足以掉 TPS**，与其他核是否空闲无关 | 备份、世界生成等正常高峰 |
| 证书到期 | **剩余不足 14 天** | 留出足够时间处理自动续期失败 | 多域名证书只监控了其中一个 |

### 5.1 一条真正可用的告警规则

"超过 50"这个条件本身有问题：一次瞬时尖峰就会触发。要表达"持续超过"，需要配合 `for`：

```yaml
# /etc/prometheus/rules/minecraft.yml
groups:
  - name: minecraft-host
    rules:
      - alert: HostDiskSpaceLow
        # 磁盘可用比例低于 15%（即使用率高于 85%）
        expr: |
          (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
            / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) < 0.15
        for: 15m          # 持续这么久才告警，避开临时波动
        labels:
          severity: critical
        annotations:
          summary: "磁盘剩余空间不足 15%（挂载点 {{ $labels.mountpoint }}）"
          description: "主机 {{ $labels.instance }} 可用空间偏低，磁盘写满会导致服务端无法保存世界。"

      - alert: HostHighMemoryWithSwap
        # 已用 swap 持续大于 0
        expr: node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "主机开始使用 swap"

      - alert: NodeExporterDown
        # 抓取失败：说明目标不可达或 exporter 挂了
        expr: up{job="node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "无法抓取主机指标（{{ $labels.instance }}）"
```

**注意 `for` 与 `expr` 的分工**：`expr` 判断"现在是不是满足条件"，`for` 判断"已经满足了多久"。**没有 `for` 的告警几乎一定会吵。**

:::warn TPS 与 MSPT 需要你自己接进来
上面的规则只用了 node_exporter 的指标，**它看不到 TPS 和 MSPT**。要监控游戏内指标，你需要一个能把它们暴露成 Prometheus 指标的东西（服务端插件、MCDR 脚本或自建 exporter）。**具体方案随核心、版本与插件而异，本文不给出具体实现，请以你所用方案的官方文档为准。**
:::

### 5.2 服务是否在运行

服务级监控有三种写法，**而且可以叠加**：systemd `OnFailure`（简单、不依赖额外组件，但**只覆盖 failed 状态**，卡死却没退出的进程测不到）、外部端口探测（能发现"进程在但服务不通"，需要另一台机器）、自建脚本 + cron（灵活，能检查任意条件，但要自己维护）。三种成本都很低，覆盖的场景却不同。

## 6. 告警疲劳：怎么让通知还有意义

这是监控体系里**最容易被低估**的一环。一个每十分钟响一次、但每次都是误报的告警，会在几天内训练你彻底忽略所有通知——**那时候监控体系在事实上已经失效了，只是你还没意识到。**

### 6.1 告警症状，而不是原因

| 反例（告警原因） | 正例（告警症状） |
| --- | --- |
| "CPU 使用率超过 80%" | "TPS 低于 15 持续 5 分钟" |
| "磁盘 I/O 等待偏高" | "磁盘剩余空间不足 15%" |
| "某个进程重启了" | "服务在 1 小时内重启超过 3 次" |
| "内存使用率超过 70%" | "已开始使用 swap" |

原因是：**原因不一定影响玩家，症状一定影响玩家。** CPU 高但 TPS 正常，说明这台机器还撑得住；而 TPS 掉了，无论原因是什么，玩家都在难受。

### 6.2 去重、分组、静默

告警系统需要三种基本能力，否则一次事故会变成一百条通知：

| 能力 | 作用 | 例子 |
| --- | --- | --- |
| 去重（deduplication） | 同一个问题只通知一次 | 磁盘满了之后，所有写盘的操作都会失败，但你应该只收到一条"磁盘满" |
| 分组（grouping） | 把相关告警合并成一条 | 一次断电会让十台机器同时离线，应该合并成一条而不是十条 |
| 静默（silencing） | 计划维护期间不通知 | 你正在重启服务端，不需要为此收到告警 |

Prometheus 生态里，这三件事由 **Alertmanager** 负责，而不是 Prometheus 本身。**这是很多人漏掉的一环**：只装 Prometheus 不装 Alertmanager，你得到的是一堆各自为政的通知。

### 6.3 只留一个渠道，并且每条告警都要有人能处理

一条实用的纪律：**所有告警走同一个渠道。** 原因很实际：如果有三个渠道，你会开始"这个渠道的通知不重要"地分类对待，最后三个都不看。**一个渠道、一条规则、一个地方看**，才能形成"响了一定有事"的条件反射。

上线一条告警之前，再问自己一个问题：**它响了之后，我要做什么？** 如果答案是"不知道，先看看"，那这条告警**现在还不该上线**。先想清楚处理步骤，再打开它——这就是下一节的运行手册。

## 7. 告警响了之后：运行手册

**运行手册（runbook）** 是针对"某条告警响了该怎么办"预先写好的步骤。它不是形式主义，因为告警最可能在你最没状态的时候响——半夜、通勤路上、正在做别的事。

一份最小可用的运行手册，每条告警只需要四行：

```text
告警名：HostDiskSpaceLow
含义：主机某个挂载点可用空间低于 15%
第一步：df -h 确认是哪个挂载点、涨得有多快
第二步：找出占用最大的目录：du -sh /srv/minecraft/* | sort -h
        常见元凶：备份堆积、日志未轮转、核心转储文件
第三步：清理可安全删除的内容（过期备份、旧日志），确认服务端仍能写盘
第四步：如果无法立刻清理，先停掉会持续写盘的任务，并通知玩家
```

### 7.1 四条通用处置原则

| 原则 | 为什么 |
| --- | --- |
| **先止损，再找原因** | 玩家还在受影响时，先把服务恢复起来；排查可以之后做 |
| **保留现场** | 重启之前先复制日志与状态，见 [应急与取证](/tutorials/ops/incident-forensics) |
| **不要只重启了事** | 重启只是把世界重新载入一次，**如果根因还在，问题会以同样的速度回来** |
| **记录处置过程** | 下次同样的告警响时，你需要的正是这次的记录 |

### 7.2 一个真实的处理顺序

以"TPS 掉到 10"为例，合理的顺序是：**确认现象（TPS、MSPT、玩家数、`uptime`）→ 判断是服务端侧还是宿主机侧 → 服务端侧跑一次 spark profiler 拿调用树，宿主机侧看 CPU 限流、内存与磁盘 I/O → 先上应急手段让玩家能玩 → 最后复盘并补一条监控**。前两步的判据见 [用 spark 分析服务器性能](/tutorials/ops/spark)。

## 8. 家用主机怎么监控

家用主机与机房环境的差别，主要在于**它有一堆机房替你解决的问题**：市电、空调、门禁、值守。相关背景见 [家用电脑开服与维护](/tutorials/ops/home-hosting)。

### 8.1 断电检测与自动关机：NUT

家用主机最典型的故障是**市电中断**。它和"服务端崩溃"不同：崩溃通常不损坏存档，而**写入过程中的硬掉电可能留下半写的文件**，轻则丢区块，重则存档无法加载。所以 UPS 的定位是"争取安全停机的时间"，而**NUT（Network UPS Tools）** 是 Linux 上最通用的监控方案：它分三层——**驱动与 UPS 通信、`upsd` 是服务端、`upsmon` 是监控客户端**，`upsmon` 从 `upsd` 读取状态并在需要时触发关机。读取状态的命令是 `upsc`（只读客户端）：

```bash
upsc -l                       # 列出所有已配置的 UPS 名称
upsc myups                    # 查看某台 UPS 的全部变量
upsc myups ups.status         # 只看状态：OL 市电 / OB 电池 / LB 低电量
upsc myups battery.charge     # 剩余电量百分比
upsc myups battery.runtime    # 预计续航秒数
```

把 UPS 状态接到告警里很简单：判断 `ups.status` 是否包含 `OB`（on battery）即可——**取不到状态时不要静默放过**，而应当按"未知"告警。

:::warn NUT 的细节随发行版与版本变化
包名与服务名在不同发行版上不同（Debian 系常见 `nut-server`、`nut-client`，RHEL 系常见 `nut-server`、`nut-monitor`），配置目录也有 `/etc/nut/` 与 `/etc/ups/` 两种；**NUT 2.8.0 起把 `master`/`slave` 改名为 `primary`/`secondary`**，旧写法仍被兼容接受。变量名也可能随驱动与机型变化，**先用 `upsc` 把实际变量列出来再写脚本**。完整配置见 [机架、交换机与 UPS](/tutorials/ops/hardware-rack)。
:::

### 8.2 断电之后能不能自己起来、会不会过热

监控能告诉你"停电了"，但**恢复供电后机器能否自己启动取决于 BIOS/UEFI 设置**，与监控无关；这一项要在装机时就配好，否则每次停电都得亲自去按开机键。家用环境也没有机房空调，**夏天高温是真实的故障源**：CPU 与风扇转速可以用 `lm-sensors` 的 `sensors` 命令读取，硬盘温度通常在 `smartctl -a` 的 SMART 属性里，**能读到哪些传感器取决于主板与传感器芯片**。

:::note 温度阈值因硬件而异
不同 CPU 的正常工作温度差别很大，**不存在一个通用的告警温度**。正确做法是查你所用型号的规格书，把阈值设在"明显高于日常、但低于降频点"的位置：先跑几天记录基线，再设阈值。
:::

家用主机还该盯四件事：**上游链路**（家宽会重播 PPPoE、会临时抖动，服务端指标正常但玩家全掉线）、**公网 IP 变化**（没有固定 IP 时 DDNS 更新失败会让玩家连不上）、**磁盘 SMART 属性**（家用盘没有企业盘的冗余设计，提前发现坏道能救一次数据）、**睡眠与休眠**（系统进入睡眠后服务端就停了，必须确认相关设置已关闭）。

## 9. 落地顺序与检查清单

不要一次把整套栈都装上。按这个顺序做，每一步都能独立产生价值：**外部探测 + 一个通知渠道**（解决"服务器挂了但没人知道"）→ **systemd `OnFailure` 与 `Restart=`**（服务崩溃的自动恢复与通知）→ **一条 cron 健康检查脚本**（磁盘将满、进程消失）→ **node_exporter + Prometheus + Grafana**（看到趋势，能回答"从什么时候开始变坏"）→ **告警规则 + Alertmanager**（从"看图"变成"被通知"）→ **给每条告警写运行手册**（半夜收到通知时知道该做什么）。

### 9.1 上线前检查清单

| 检查项 | 为什么必须确认 |
| --- | --- |
| 监控本身不在被监控的机器上 | 整机断电时，本机监控会一起消失 |
| 通知渠道真的验证过一次 | 没验证过的告警等于没有告警 |
| 告警能区分"持续"与"瞬时" | 用 `for` 之类的条件，否则一定会吵 |
| 每条告警都有对应的运行手册 | 否则它只是把你叫醒 |
| 磁盘告警的阈值低于"写满"还有余量 | 磁盘满是会毁数据的一类故障 |
| 备份失败会告警 | 备份失败没有任何其他症状 |
| 监控了证书到期 | 过期当天才会暴露 |
| 计划维护时有静默机制 | 否则重启一次就收一堆通知 |
| 有历史数据可回看 | 单点快照说明不了趋势 |
| 知道去哪看日志与指标 | 见 [日志与报错排查](/tutorials/faq/errors) |

### 9.2 常见错误

| 错误 | 后果 |
| --- | --- |
| 只监控 CPU 与内存 | 漏掉磁盘、备份、证书这三类"不会自己喊"的故障 |
| 告警直接绑在原始指标上 | 每次瞬时波动都通知，很快被忽略 |
| 通知发到三个渠道 | 三个都不认真看 |
| 装完就不管 | 阈值随业务变化，半年后全部失效 |
| 只监控不演练 | 真出事时才发现通知发不出去 |
| 把监控放在同一台机器 | 最需要它的那次故障中，它不在 |

:::tip 最后一条建议
**监控体系的正确规模是"你愿意维护的规模"。** 一条被认真对待的磁盘告警，比二十条被静音的面板有用得多。从最小可用开始，出一次事补一条，比一次配齐再全部放弃要现实。
:::

> 各软件的安装与配置以官方文档为准。
