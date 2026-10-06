---
title: 网络安全基础
slug: network-security
cat: ops
level: 3
order: 5
minutes: 16
tags: [network-security, firewall, ssh, ddos, secrets, monitoring, ops]
updated: 2026-10-04
draft: false
---

服务端能被别人连上，就意味着**它同时也能被别人扫到**。开服第一天起，你的公网 IP 就会被端口扫描器、爆破脚本和"广撒网"式攻击工具反复试探——**这不是因为你得罪了谁，只是因为你暴露在公网上**。

这一篇讲的是网络层面的防护：**该开哪些端口、防火墙怎么配、SSH 怎么加固、被打了怎么办**。系统内部的加固见 [系统安全加固](/tutorials/ops/system-security)。


:::warn Docker 容器会绕过本机防火墙
本页讲的所有 `ufw` / `firewalld` 规则，对 **Docker 容器映射出来的端口无效**。Docker 会把自己的 `iptables` 规则插在系统防火墙之前，因此 `ufw deny` 挡不住容器端口。

想真正限制，请把端口绑到回环（`-p 127.0.0.1:25565:25565`）或使用 `DOCKER-USER` 链。详见 [用 Docker 部署 Java 版 → 网络与防火墙](/tutorials/java/docker)。
:::

## 一、先认清攻击面

### 1.1 你真正需要开放的端口

| 用途 | 协议 | 默认端口 | 是否对公网开放 |
| --- | --- | --- | --- |
| **Minecraft Java 版** | TCP | `25565` | 是（玩家入口） |
| **基岩版 / Geyser** | UDP | `19132` | 是（跨端服需要） |
| **查询协议（query）** | UDP | `25565` | 一般不需要 |
| **RCON 远程控制台** | TCP | `25575` | **绝不** |
| **数据库**（MySQL / MariaDB） | TCP | `3306` | **绝不** |
| **Redis** | TCP | `6379` | **绝不** |
| **面板**（各类 Web 管理面板） | TCP | 因面板而异 | **绝不** |
| **SSH** | TCP | `22` | 是，但**限制来源** |

:::warn 端口默认值可能被改过
上表是各软件的**出厂默认值**。如果你在 `server.properties` 里改过 `server-port`、`query.port`、`rcon.port`，或者在面板里改过监听端口，**以你的实际配置为准**。防火墙规则要和实际端口一致，否则要么连不上，要么留了个洞。
:::

### 1.2 关于 RCON 和数据库：为什么必须锁死

- **RCON 是"没有界面的管理员权限"**。它用一条口令换取在控制台执行任意指令的能力。一旦暴露到公网，攻击者可以直接 `op` 自己、清空存档、踢光玩家。**正确做法是 `enable-rcon=false`，需要远程管理就通过 SSH 隧道或面板走本地回环。**
- **数据库端口暴露是最常见的数据泄露入口**。MySQL 允许 `root` 从任意主机登录（`root@%`）时，弱口令会在几分钟内被爆破成功，玩家的账号、密码哈希、购买记录全部泄露。
- **面板端口暴露等于把整台机器的控制权挂到公网上**。面板本身有登录页，但登录页也可能有漏洞，且它通常以较高权限运行。

一个基本原则：**任何不是"给玩家用的"端口，都不要对公网开放。** 需要自己远程访问时，用 SSH 隧道（见第四节）而不是直接暴露。

### 1.3 顺手做的两件事

- **确认监听地址**：数据库、面板、RCON 应绑定 `127.0.0.1` 而不是 `0.0.0.0`。绑定回环后，即使防火墙配错，外部也连不上。
- **确认 `online-mode`**：Java 版保持 `online-mode=true`（`server.properties`）。离线模式让任何人都能冒用他人 ID，属于身份层面的洞，防火墙补不了。详见 [服务端配置](/tutorials/java/config)。

## 二、防火墙是两层，不是一层

这是新手最容易漏的一点：

| 层 | 位置 | 谁管 | 例子 |
| --- | --- | --- | --- |
| **云安全组 / 网络 ACL** | 在云平台侧，流量**还没到你的机器** | 云服务商控制台 | 阿里云安全组、腾讯云安全组、AWS Security Group |
| **主机防火墙** | 在操作系统里，`netfilter` / `nftables` | 你自己在机器上配 | `ufw`、`firewalld`、`iptables`、`nftables` |

**两层都要配。** 只配安全组，机器被换到别的网络或安全组被改宽时就失去保护；只配主机防火墙，很多云平台的默认安全组可能已经很宽松，等于把第一道门敞开。

:::warn 云平台的具体操作路径不写在这里
各家云控制台的菜单名称、层级和术语都不一样（"安全组""防火墙""网络 ACL"混用），**本文不臆测具体菜单路径**。请以你所用服务商的官方文档为准。可以确认的是：**入站规则（ingress）默认应全部拒绝，只放行你列出的端口。**
:::

### 2.1 ufw（Ubuntu / Debian 常见）

`ufw` 是 `iptables` / `nftables` 的前端，适合单机场景。

```bash
sudo apt update
sudo apt install -y ufw

# 关键：先放行 SSH，再启用默认拒绝，否则会把自己关在门外
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp

sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 25565/tcp
sudo ufw allow 19132/udp

sudo ufw enable
sudo ufw status verbose
```

`sudo ufw status verbose` 会输出当前策略与规则，正常应能看到 `Default: deny (incoming), allow (outgoing)` 以及你放行的条目。

**顺序很重要**：如果先 `sudo ufw enable` 再放行 SSH，而你的连接恰好被切断，就只能通过云平台的 VNC / 救援控制台进去了。

### 2.2 firewalld（RHEL / Rocky / AlmaLinux / Fedora 常见）

```bash
sudo dnf install -y firewalld
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --permanent --add-port=19132/udp

# 只允许管理 IP 访问 SSH
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.10" port port="22" protocol="tcp" accept'

sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

`--permanent` 写进持久配置，**必须 `--reload`（或重启 firewalld）才生效**。不加 `--permanent` 的改动是运行时的，重启后消失——两种方式各有用途，别混着用还以为配好了。

### 2.3 iptables（传统写法）

```bash
# 放行已建立的连接与回环
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT

# 只允许管理 IP 访问 SSH
sudo iptables -A INPUT -p tcp -s 203.0.113.10 --dport 22 -j ACCEPT

# 玩家入口
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT

# 默认拒绝
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
```

`iptables` 规则**默认不持久化**，重启即丢。需要保存：

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 2.4 nftables（现代写法）

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 25565 accept
sudo nft add rule inet filter input udp dport 19132 accept
```

:::note 现代发行版里 ufw 与 firewalld 底层就是 nftables
在较新的内核与发行版上，`ufw` / `firewalld` 已经默认使用 `nftables` 后端。**不要同时启用两套前端**（比如既开 `ufw` 又开 `firewalld`），它们会互相覆盖规则，排查起来非常痛苦。**选一套，配到底。**
:::

### 2.5 "放行端口"和"限制来源"是两回事

| 写法 | 含义 | 风险 |
| --- | --- | --- |
| `sudo ufw allow 22/tcp` | **任何人都能连 22 端口** | 全世界都能爆破你的 SSH |
| `sudo ufw allow from 203.0.113.10 to any port 22 proto tcp` | **只有 `203.0.113.10` 能连 22 端口** | 该 IP 变了就得改规则 |

对玩家入口（`25565`）你**必须**放开来源，因为玩家来自五湖四海。但对 SSH、面板、RCON、数据库这些**只有你自己用**的服务，**永远应该限制来源**。

:::tip 没有固定 IP 怎么办
家用宽带的公网 IP 会变。可选方案：向运营商申请固定 IP、使用云服务商的 VPN / 堡垒机、或者用 SSH 密钥 + fail2ban 来降低风险。**注意：把 SSH 限制到某个会变的 IP，会让你在 IP 变化后连不上**——务必先确认云平台有 VNC 救援通道。
:::

## 三、SSH 加固

SSH 是管理入口，也是被爆破最多的端口。加固顺序建议：**先确认密钥能登录，再关密码登录**。

### 3.1 先配置密钥登录

在本机生成密钥（如果还没有）：

```bash
ssh-keygen -t ed25519 -C "mc-admin"
```

把公钥传到服务器：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub mcadmin@203.0.113.10
```

**验证**：新开一个终端，用密钥登录成功，再继续下一步。

### 3.2 修改 sshd 配置

编辑 `/etc/ssh/sshd_config`（用 `sudo`）：

```ini
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

| 配置项 | 作用 |
| --- | --- |
| `PubkeyAuthentication yes` | 允许公钥认证（密钥登录的基础） |
| `PasswordAuthentication no` | **关闭密码认证**，爆破脚本直接失去目标 |
| `PermitRootLogin no` | **禁止 root 直接登录**，攻击者必须先猜到一个普通用户名 |
| `KbdInteractiveAuthentication no` | 关闭键盘交互认证，避免绕过 `PasswordAuthentication no` |

:::warn 改完必须验证语法再重载
先用 `sudo sshd -t` 检查配置语法，**通过后**再 `sudo systemctl reload ssh`（部分发行版是 `sshd`）。如果配置有误就直接重启 SSH，你可能会被彻底锁在外面。
:::

**检查当前生效值**（配置可能被 `Include` 的片段覆盖）：

```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

:::note 配置文件的写法随版本变化
较新的 OpenSSH 支持在 `/etc/ssh/sshd_config.d/` 放 `.conf` 片段，且**片段里的设置通常优先于主文件**。如果你的发行版有这个目录，改之前先 `ls /etc/ssh/sshd_config.d/` 看看有没有覆盖项。**具体优先级以你系统上 `sshd -T` 的实际输出和 OpenSSH 官方文档为准。**
:::

### 3.3 改默认端口：可选，作用有限

把 SSH 端口从 `22` 改成别的（比如 `2222`）：

```ini
Port 2222
```

**它带来什么**：自动扫描器大多只扫 `22`，改端口能显著减少日志噪音和无效爆破。

**它不带来什么**：**不是安全措施**。针对性的扫描可以在全端口范围内找到你的 SSH。所以改端口**不能替代**密钥登录和来源限制。

如果改了端口，记得同步更新防火墙规则，并**保留旧端口的放行直到新端口验证成功**，否则同样会锁死自己。

### 3.4 fail2ban：可选的补充

**概念**：fail2ban 读取日志，发现某个 IP 在短时间内多次认证失败，就**临时**用防火墙规则封掉它。

**核心概念是 jail（监狱）**：一个 jail = 一份日志 + 一套匹配规则 + 一组封禁参数。启用的 jail 写在 `/etc/fail2ban/jail.d/` 下的 `.conf` 或 `/etc/fail2ban/jail.local` 中。

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

- `maxretry`：允许的失败次数；`findtime`：统计窗口；`bantime`：封禁时长。
- `backend = systemd` 适用于日志由 systemd-journald 收集的现代发行版；如果你的发行版写的是 `/var/log/auth.log`，需要按官方文档改用对应的 `logpath`。

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

:::warn 别把 fail2ban 当成护身符
- 它只能封**已经失败过**的 IP，属于**事后补救**，不阻止第一波尝试。
- **封错 IP 会让你自己进不去**，`bantime` 别设得过长（比如几个月）。
- 配置项与默认值**随发行版和版本变化**，上面只是常见写法，请对照你所用版本的官方文档。
- 装了 fail2ban **不能**让你把 `PasswordAuthentication` 重新打开。
:::

## 四、DDoS 与滥用：你能做什么，不能做什么

### 4.1 为什么游戏服会被打

- **门槛极低**：攻击服务按量售卖，几美元就能发动一次。
- **动机简单**：同行竞争、玩家报复、单纯"好玩"、或者只是被扫描器顺带命中。
- **游戏服特别脆弱**：Minecraft 是**有状态的长连接**，一次 TCP 握手就要占用服务端资源。同样的带宽打到 Web 服务上可能只是变慢，打到游戏服上可能直接卡死或崩溃。

### 4.2 你能做的

| 手段 | 说明 |
| --- | --- |
| **上游 / 服务商防护** | 云服务商通常提供基础的 DDoS 清洗。**这是最有效的一层**，因为流量在到达你的机器之前就被处理了。 |
| **限速与连接数限制** | 在防火墙或反代层限制单 IP 的连接数与新建速率，能挡掉低强度的洪水。 |
| **代理转发隐藏源站** | 让玩家连代理，真实服务端只接受代理的连接（配合转发密钥）。见 [跨服端](/tutorials/java/proxy)。 |
| **白名单 / 进服审核** | 小规模服最彻底的手段：**不认识的人根本连不上**。 |
| **应用层限流** | 服务端或插件层的连接频率限制，能减轻"进服即断"式的骚扰。 |

### 4.3 你做不到的，以及一个常见误区

:::warn "封掉攻击者 IP"对流量型攻击无效
这是最普遍的误解。流量型攻击（volumetric）的特征就是：

- 源 IP **成千上万且不断变化**（很多来自被感染的设备），你封不完；
- **你的防火墙在攻击流量之后**——封包规则生效时，带宽已经被占满了。链路堵住的那一刻，你的机器连"执行封禁规则"这件事都做不好。

**结论**：封 IP 对单个骚扰者是有效的，对流量型攻击基本无效。**只有上游清洗能解决**，这也意味着：**选购服务时要看清服务商的 DDoS 防护条款**，而不是等被打的那天再想办法。
:::

:::note 被打时先做什么
1. **确认是不是真的攻击**：看带宽曲线、连接数、CPU，区分"被打"和"自己的 bug 导致死循环"。
2. **联系服务商**：说明情况，询问是否触发清洗、是否需要换 IP。
3. **保命优先**：必要时临时白名单，先让服务器活着。
4. **留证据**：保存日志和流量图，便于向服务商申诉。
:::

## 五、密钥与凭据卫生

服务端目录里躺着大量敏感信息：`server.properties` 里的 RCON 口令、数据库密码、面板账号、云服务商的 API Key。

| 规则 | 做法 |
| --- | --- |
| **绝不提交到 Git** | 含口令的配置、`.env`、密钥文件一律进 `.gitignore`。**提交过一次就等于永久泄露**，历史记录里还在。 |
| **凭据文件权限收紧** | `chmod 600`（只有属主可读写），必要时 `chmod 640`（属主读写、同组只读）。 |
| **用环境文件而不是硬编码** | 把敏感值放进 `.env` 之类的文件，代码只读环境变量。 |
| **泄露了就换，不要"删掉了事"** | 删掉文件**不会**让已经泄露的口令失效。**必须去对应服务上重新生成 / 吊销。** |

```bash
# 凭据文件只给属主读写
chmod 600 /opt/mcserver/survival/.env

# 确认权限
ls -l /opt/mcserver/survival/.env
# 期望输出形如：-rw------- 1 mcserver mcserver ... .env
```

:::warn 口令泄露后的处理顺序
1. **立刻轮换**：在对应服务上重置口令 / 吊销密钥（这一步才是真正止血）。
2. **查影响范围**：看日志，确认有没有被使用过。
3. **清理历史**：从 Git 历史中移除（`git filter-repo` 等工具），但**不要指望它能补救已经泄露的值**。
4. **复盘**：为什么会被提交？加 `.gitignore`、加提交前检查。
:::

数据库口令还应遵循：**每个服务用独立账号**（不要全用 `root`）、**只授权需要的库**、**限制来源为主机本地或内网**。

## 六、监控：怎么发现有人在试探你

**你不需要 7x24 盯着屏幕**，但需要知道"哪里能看出异常"。

### 6.1 该看什么

| 位置 | 能看出什么 |
| --- | --- |
| `/var/log/auth.log`（Debian / Ubuntu） | SSH 登录成功与失败记录 |
| `/var/log/secure`（RHEL 系） | 同上 |
| `journalctl -u ssh` | 由 systemd 收集的 SSH 日志 |
| `sudo fail2ban-client status sshd` | 当前被封禁的 IP 数与列表 |
| `sudo lastb` | 失败的登录尝试（**需要 root，且部分系统默认不记录**） |
| `ss -tlnp` | 当前监听中的端口，用于发现意外暴露的服务 |

```bash
# 看最近的 SSH 失败情况（Debian / Ubuntu）
sudo grep 'Failed password' /var/log/auth.log | tail -n 20

# 统计失败次数最多的来源 IP
sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head

# 看谁在监听端口
sudo ss -tlnp
```

### 6.2 什么算异常

- **短时间内大量 `Failed password`**：典型的爆破。
- **成功登录但你不知情的时间 / 来源 IP**：**这是最危险的信号**，说明凭据可能已经泄露。
- **出现你没创建过的用户**：可能已经被建立了后门账号。
- **陌生的监听端口**：可能被装了挖矿程序或后门。
- **CPU / 带宽在你没有玩家时异常高**：可能在被当作攻击源。

:::tip 让日志替你值班
如果不想天天翻日志，用 `logwatch`、`journalctl` 的定时摘要，或者干脆给关键事件配告警。**关键是"有人会看"**——没人看的日志等于没有日志。
:::

## 七、上线前检查清单

- [ ] 云安全组与主机防火墙**两层都已配置**，入站默认拒绝
- [ ] 只放行了实际需要的端口（Java `TCP 25565`、基岩 / Geyser `UDP 19132`）
- [ ] `enable-rcon` 保持 `false`，或 RCON 仅监听 `127.0.0.1`
- [ ] 数据库、面板端口**未对公网开放**
- [ ] SSH 已配置密钥登录，`PasswordAuthentication no`、`PermitRootLogin no` 已生效（用 `sshd -T` 确认）
- [ ] SSH 已限制来源 IP，或至少有 fail2ban 兜底
- [ ] 含口令的文件权限为 `600`，且**不在 Git 仓库里**
- [ ] `online-mode` 保持 `true`（除非明确知道离线模式的代价）
- [ ] 已了解服务商的 DDoS 防护条款，知道被打时找谁
- [ ] 已用**外部机器**验证过端口可达性

## 下一步

- 系统内部的加固（账号、权限、systemd）：见 [系统安全加固](/tutorials/ops/system-security)
- 服务端与插件的安全配置：见 [[JAVA] 安全插件](/tutorials/ops/security-java) 与 [[BE] 安全插件](/tutorials/ops/security-be)
- 防破坏与记录：见 [反作弊与防破坏](/tutorials/java/anticheat)
- 数据最后防线：见 [备份与恢复](/tutorials/java/backup)

---

> 命令与配置以各软件官方文档为准。不同发行版的软件包名、服务名与配置项默认值可能存在差异，请以你系统上的实际输出为准。
