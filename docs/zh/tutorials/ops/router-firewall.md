---
title: 软路由与端口转发
slug: router-firewall
cat: ops
level: 3
order: 8
minutes: 16
tags: [ops, router, firewall, port-forward, nat, ipv6, openwrt]
updated: 2026-10-04
draft: false
---

服务端在本机跑通了，防火墙也放行了，玩家还是连不上——问题几乎总是出在**从公网到你那台机器之间的那几跳**上。这一篇讲清楚这几跳各自负责什么、怎么配、以及连不上时按什么顺序排查。

本篇给的是**概念 + 命令行示例**。图形界面的菜单名称、位置和选项在不同版本、不同厂商、不同固件之间差异极大，凡是这类内容都会明确标注，不会假装它们到处都一样。

## 1. 路由器到底做了什么

家用"路由器"其实是一台一体机，同时干了五件事。分开理解，排障时才不会混淆：

| 功能 | 作用 | 出问题时的表现 |
| --- | --- | --- |
| **路由** | 在 WAN 与 LAN 之间转发 IP 包 | 完全上不了网 |
| **NAT** | 把内网地址转换成公网地址（SNAT），并按规则反向转换（DNAT，即端口转发） | 内网能上网，外面连不进来 |
| **DHCP** | 给内网设备自动分配 IP、网关、DNS | 设备拿不到地址或地址乱变 |
| **DNS** | 转发/缓存域名解析，提供内网名称 | 能 ping 通 IP 但域名不通 |
| **防火墙** | 有状态过滤，决定哪些流量能通过 | 规则写错则全通或全不通 |

**端口转发（port forwarding）本质是 DNAT**：把"发往公网 IP 的某端口"的包，改写目的地址和端口后转给内网某台机器。它和"防火墙放行"是两件事：

- **NAT 决定包去哪儿**；
- **过滤规则决定包能不能过**。

两者必须同时成立，端口转发才会生效。这也是为什么在 pfSense 这类系统上"加了端口转发却还是不通"——过滤规则没放行（新版通常会自动创建对应规则，见第 5 节）。

端口转发的前提是**目标机器有固定内网 IP**：要么在路由器上做 **DHCP 静态绑定**（推荐），要么在主机上设静态 IP 并把地址排除在 DHCP 池之外。否则机器重启换了 IP，转发就指向空气。

## 2. 家用路由器与软路由

| 方案 | 适合 | 优点 | 代价 |
| --- | --- | --- | --- |
| **家用一体机** | 需求简单 | 开箱即用、功耗低、有无线 | 功能少、可配置项有限、厂商固件常停止维护 |
| **OpenWrt**（刷在支持的硬路由或 x86 上） | 想深度控制、成本低 | 包管理、UCI 配置可脚本化、社区活跃 | 需要自己维护；刷机有变砖风险；无线驱动表现随机型差异大 |
| **pfSense / OPNsense**（x86） | 想要完整防火墙/VPN 能力 | 有状态防火墙、NAT、IPsec/WireGuard/OpenVPN、流量图表、多网段 | 需要一台 x86 机器和两块以上网卡；功能多也意味着配置面更大 |

:::note 菜单路径不是知识
OpenWrt、pfSense、OPNsense 的界面在版本之间反复调整过（选项改名、位置搬家、默认值变化）。**记住概念和配置文件的语义，比记住"点哪个菜单"更耐用**。本文的命令行示例都是稳定的接口；图形界面的具体位置请对照你所装版本的官方文档。
:::

## 3. OpenWrt：用 UCI 配置端口转发

OpenWrt 的防火墙配置在 `/etc/config/firewall` 里，用 `uci` 修改。下面是把外网 `TCP 25565` 转发到内网 `192.168.1.10:25565` 的标准写法：

```bash
# 1. 新增一个 redirect 类型的防火墙小节
uci add firewall redirect

# 2. 给这个新小节（列表最后一项）设置字段
uci set firewall.@redirect[-1].name='Minecraft'
uci set firewall.@redirect[-1].target='DNAT'
uci set firewall.@redirect[-1].src='wan'
uci set firewall.@redirect[-1].src_dport='25565'
uci set firewall.@redirect[-1].dest='lan'
uci set firewall.@redirect[-1].dest_ip='192.168.1.10'
uci set firewall.@redirect[-1].dest_port='25565'
uci set firewall.@redirect[-1].proto='tcp'

# 3. 提交并让防火墙重新生成规则
uci commit firewall
/etc/init.d/firewall reload
```

字段含义：

| 字段 | 含义 |
| --- | --- |
| `name` | 规则名称，仅用于识别，可任意取 |
| `target` | `DNAT` 表示目的地址转换。**这是 redirect 小节的默认值**，显式写出更清晰 |
| `src` | 流量来自哪个区域，这里是 `wan` |
| `src_dport` | 公网侧被访问的端口 |
| `dest` | 转发到哪个区域，这里是 `lan` |
| `dest_ip` | 内网目标机器的 IP |
| `dest_port` | 内网目标端口 |
| `proto` | 协议，`tcp` / `udp` / `tcp udp`（配置解析器接受空格分隔的协议列表） |

常用操作与注意点：

```bash
uci show firewall                 # 查看当前配置，确认规则确实写进去了
uci delete firewall.@redirect[0]  # 删除第 0 条 redirect（编号以 uci show 输出为准）
uci commit firewall
/etc/init.d/firewall reload
```

- `uci set` 只是改内存中的配置，**必须 `uci commit` 才会写入 `/etc/config/firewall`**；
- `reload` 会重新生成并加载规则，不需要重启路由器；
- **OpenWrt 22.03 及以后默认使用 fw4（nftables 后端）**，21.02 及以前是 fw3（iptables 后端）。`/etc/config/firewall` 的写法在两者之间基本一致，但**直接敲 `iptables` 命令的教程在新版本上不适用**，对应的是 `nft`；
- 外部端口和内部端口**可以不同**（改 `src_dport` 即可）。换个外部端口能减少被扫描到的概率，但**这只是降低噪音，不是安全措施**。

**基岩版（UDP）或需要同时转发 TCP/UDP** 时，把协议写成列表：

```bash
uci set firewall.@redirect[-1].proto='tcp udp'
```

## 4. OpenWrt：静态 DHCP 绑定

端口转发的目标 IP 必须稳定。在 OpenWrt 上按 MAC 地址绑定固定 IP：

```bash
uci add dhcp host
uci set dhcp.@host[-1].name='mcserver'
uci set dhcp.@host[-1].mac='AA:BB:CC:DD:EE:FF'
uci set dhcp.@host[-1].ip='192.168.1.10'
uci set dhcp.@host[-1].dns='1'          # 可选：把该名称也注册到本地 DNS

uci commit dhcp
/etc/init.d/dnsmasq restart
```

注意：

- `mac` 用目标机器的网卡 MAC，**区分大小写通常无所谓，但格式必须是六组冒号分隔的十六进制**；
- `ip` 必须在 LAN 网段内，且**不要落在 DHCP 动态池范围内**（OpenWrt 默认动态池常从 `100` 开始，`192.168.1.10` 一般安全，但以你的实际配置为准）；
- 改了 `dhcp` 配置要重启的是 **dnsmasq**，不是 firewall；
- 也可以在主机侧设静态 IP，但**只选一种方式**，两边都配容易冲突。

## 5. pfSense / OPNsense：概念一致，标签会变

这两个系统都是 FreeBSD + pf 防火墙，概念与 OpenWrt 相通，但操作方式完全不同（Web 界面为主，也有 config.xml）。核心概念：

| 概念 | 说明 |
| --- | --- |
| **接口（Interfaces）** | 通常有 WAN、LAN，以及可选的 OPT 口；每个接口对应一块网卡或一个 VLAN |
| **端口转发** | 在 **Firewall > NAT > Port Forward** 里新增映射：指定接口、协议、目的端口、目标 IP 与端口 |
| **关联过滤规则** | **NAT 与过滤是两件事**。较新版本会在保存转发时**自动创建对应的放行规则**；老版本界面上有"Add associated filter rule"之类的勾选项。**具体行为随版本变化，请在 `Firewall > Rules` 里确认规则确实存在。** |
| **别名（Aliases）** | **Firewall > Aliases** 可把多个端口或多个 IP 定义成一个名字，规则里引用别名，便于维护 |
| **静态映射** | 在 DHCP 服务页面（pfSense 的 `Services > DHCP Server`；OPNsense 的 DHCP 相关页面）里为 MAC 绑定固定 IP |
| **NAT 回流（reflection）** | 让内网机器也能用公网 IP 访问内部服务。默认常关闭，开启方式与选项名称随版本变化 |
| **配置备份** | pfSense 在 `Diagnostics > Backup & Restore`；OPNsense 在 `System > Configuration > Backups`。**改完一定要导出配置** |

需要额外留意的版本差异：

- **OPNsense 从 24.7 起把默认 DHCP 服务从 ISC dhcpd 换成了 Kea**，静态映射的菜单位置随之变化；
- pfSense 分 CE 与 Plus 两条线，同一功能的位置可能不同；
- 两家的界面标签在多年迭代中反复改过名。

因此：**菜单路径以你所装版本的官方文档为准**，但"WAN/LAN 接口、NAT 端口转发、关联过滤规则、别名、静态映射"这五个概念在任何版本里都成立。

## 6. 公网 IPv4 与 CGNAT

**在配端口转发之前，先确认你到底有没有公网 IPv4。** 方法很简单：

1. 在路由器状态页看 **WAN 口拿到的 IP**；
2. 用另一台设备（例如手机流量）访问任意"我的 IP 是什么"网站，看**外部看到的 IP**；
3. 两者**一致**，且该地址不是私有地址，才说明你有公网 IPv4。

判断线索：

| 现象 | 含义 |
| --- | --- |
| WAN IP 落在 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | 运营商内网地址，典型的多层 NAT |
| WAN IP 落在 `100.64.0.0/10` | **CGNAT 专用地址段（RFC 6598）**，几乎可以确定没有公网 IPv4 |
| `traceroute` 前面几跳都是私有地址 | 中间还有运营商级 NAT |
| WAN IP 是公网地址，但外部依然连不上 | 可能是运营商封了入向端口，也可能是你的转发/防火墙没配好，需分步验证 |

:::warn 不要假设"打电话就能要到一个公网 IP"
不同运营商、不同地区、不同套餐的政策差别很大：有的可以免费给，有的收费，有的明确不提供，还有的只给企业宽带。**可以申请，但不要把它当成必然能拿到的方案**，要准备好替代路线。
:::

另外两种常见的"看起来像没公网"的情况：

- **双重 NAT**：光猫自己也在拨号并做 NAT，你的路由器再 NAT 一次。解决办法是把光猫改成**桥接模式**（由你的路由器拨号），或者在光猫上也做一次端口转发（两层都要转）。
- **运营商封端口**：常见于部分地区的 80/443 等端口。换用非标准端口通常可以绕开，**具体封禁策略因运营商与地区而异**。

## 7. 没有公网 IPv4 时的三条出路

| 方案 | 原理 | 代价 |
| --- | --- | --- |
| **申请公网 IP** | 让 ISP 直接给你一个可入向的地址 | 可能免费、可能收费、可能被拒；不一定给静态地址 |
| **改用 IPv6** | 大多数地区 IPv6 是公网可达的，直接开放防火墙即可（见第 8 节） | 玩家侧也需要 IPv6；不同网络覆盖率差异大 |
| **VPS 中转 / 隧道** | 用一台有公网 IP 的服务器做跳板，把流量转回你家 | 多一跳，延迟与稳定性取决于中转节点；有带宽成本 |

VPS 中转的常见做法：

- **frp**：家内跑 `frpc`，VPS 上跑 `frps`，把 VPS 的端口映射到内网服务。配置简单，适合单端口转发（示例见 [部署到可访问环境](/tutorials/java/deploy)）；
- **WireGuard + DNAT**：家内机器与 VPS 建隧道，VPS 上把入向流量 DNAT 到隧道内的内网地址。灵活、加密，但需要自己维护路由与转发规则；
- **商用隧道服务**：省事，但通常有流量/带宽限制，且**质量参差**。

选择时注意：**基岩版用 UDP**，很多隧道方案默认只支持 TCP，UDP 需要额外确认或付费。另外中转会增加**几十毫秒级**的延迟（取决于地理距离），对延迟敏感的玩法要提前评估。

## 8. IPv6：端口转发的逻辑变了

IPv6 的核心变化是**地址足够多，通常不再需要 NAT**。因此：

- 不再有"端口转发"（DNAT）这一层，取而代之的是**在防火墙上放行入向流量**；
- 每台设备通常有**全局可路由地址**，直接可达；
- 防火墙的默认策略才是关键：**OpenWrt 等固件默认拒绝 WAN 侧入向连接**，你必须显式加一条放行规则。

OpenWrt 上放行某台主机的 `TCP 25565`：

```bash
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-Minecraft-v6'
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].dest='lan'
uci set firewall.@rule[-1].dest_ip='2001:db8:abcd:1::10'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='25565'
uci set firewall.@rule[-1].family='ipv6'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
/etc/init.d/firewall reload
```

**前缀问题**是 IPv6 开服最常见的坑：

- 家宽通常通过 **DHCPv6-PD（前缀委派）** 从 ISP 拿到一个前缀（常见 `/56`、`/60` 或 `/64`，随 ISP 而异），再由路由器分配给内网；
- **很多 ISP 的前缀不是固定的**，重播、重启光猫、运营商侧调整都可能换前缀；
- 前缀一换，上面那条规则里的 `dest_ip` 就失效了，玩家也连不上；
- 应对思路：向 ISP 申请**静态前缀**（不一定给）；或让主机使用**稳定的接口标识符**（例如在 SLAAC/DHCPv6 里固定后缀），再用脚本在 `hotplug.d/iface` 或定时任务里**自动更新防火墙规则**；也可以使用隧道服务商分配的路由前缀（属于第三方方案，需自行评估稳定性）。

其他 IPv6 注意点：

- 玩家连接时要写**方括号**：`[2001:db8:abcd:1::10]:25565`；
- 服务端 `server.properties` 里的 `server-ip` 留空即可同时监听 IPv4/IPv6（留空 = 绑定所有接口）；
- **相当一部分玩家没有可用的 IPv6**（尤其在某些地区与移动网络），所以 IPv6 最好作为 IPv4 之外的**补充**，而不是唯一入口；
- 内网可以用 ULA 地址（`fd00::/8`）做稳定的内部编址，但**对外可达仍然依赖 ISP 给的前缀**。

## 9. 边界安全：只转发你真正需要的

端口转发的每一条规则，都是你在公网上开的一扇门。原则：

1. **只转发必须的端口**。Minecraft 只需要 `TCP 25565`（基岩版 `UDP 19132`）。
2. **绝不转发这些端口**（这是最常见的入侵入口）：
   - `TCP 25575` RCON（协议本身不加密，等于把控制台交出去）；
   - `TCP 3306` MySQL/MariaDB、`TCP 5432` PostgreSQL、`TCP 6379` Redis、`TCP 27017` MongoDB、`TCP 9200` Elasticsearch；
   - `TCP 2375` / `2376` Docker API；
   - `TCP 445` SMB；
   - `UDP 623` IPMI（见 [机架式服务器、交换机、硬件防火墙与 UPS](/tutorials/ops/hardware-rack)）；
   - `TCP 3493` NUT。
3. **管理面板不要直接暴露**。Pterodactyl、宝塔之类的面板属于高危目标：漏洞影响面大，一旦被拿到就是整机。
4. **RDP / SSH 之类的管理入口换用非标准外部端口**（例如把外部 `50022` 转到内网 `22`）。这只能减少自动化扫描，**不能替代认证与加固**——该用密钥还是要用密钥，该开二次验证还是要开。
5. **优先用 VPN 而不是暴露**。要把管理面板给自己用，最稳的做法是建一条 VPN，面板只监听内网地址。
6. **不要在边缘开启 UPnP / NAT-PMP**，除非你确实需要它。它允许内网程序自行在防火墙上打洞，等于把边界策略交给应用。
7. **在防火墙上做速率限制**（例如对 `25565` 的新建连接限速），能缓解一部分连接洪水；配合服务端的连接限制一起用。
8. **面板类服务配 fail2ban 之类的登录封禁**，并保持及时更新。

## 10. WireGuard：比暴露端口更安全的做法

思路：**不把管理端口暴露给全世界，而是让外网设备先进入内网**。WireGuard 是当前最简洁的选择——内核态实现（Linux 5.6 起进入主线）、配置短、基于 UDP。

生成密钥对：

```bash
wg genkey | tee privatekey | wg pubkey > publickey
chmod 600 privatekey
```

服务端（有公网 IP 的一侧，例如 VPS 或你的软路由）：

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <服务端私钥>

[Peer]
PublicKey = <客户端公钥>
AllowedIPs = 10.10.0.2/32
```

客户端（你的笔记本或手机）：

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.2/24
PrivateKey = <客户端私钥>

[Peer]
PublicKey = <服务端公钥>
Endpoint = vpn.example.com:51820
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
```

要点：

- **`AllowedIPs` 在服务端侧同时是"允许这个对端使用哪些源地址"和"去往这些地址的流量发给这个对端"**，写 `10.10.0.2/32` 是单主机；客户端侧写 `10.10.0.0/24` 表示**只把去 VPN 网段的流量走隧道**（分流），写 `0.0.0.0/0, ::/0` 则是**全局代理**；
- **`PersistentKeepalive = 25` 放在位于 NAT 后面的一侧**，用来维持映射，让服务端能主动回连；
- 客户端侧不需要 `Endpoint` 也能工作（服务端主动连它时），但通常还是写上以便先发起；
- 只需在**服务端**放行 `UDP 51820`（端口可自定义），客户端不需要任何入向端口；
- 如果要让 VPN 客户端访问整个内网或访问互联网，服务端需要开启 IP 转发并在 nftables/iptables 里做 MASQUERADE/NAT；
- OpenWrt 上 WireGuard 的配置方式是通过 UCI（`/etc/config/network` 的 `wireguard` 接口段）或 `luci-app-wireguard`，**与上面的 wg-quick 格式不同**，但密钥、`AllowedIPs`、`Endpoint` 这些概念完全一致；
- 同样别忘了：**私钥文件权限设成 `600`，不要提交到 Git 仓库**。

## 11. 排障顺序：从内到外，逐层验证

玩家连不上时，**不要一上来就怀疑运营商**。按这个顺序查，每步都能给出"是/否"的结论：

**第 1 步：主机上的服务真的在监听吗**

```bash
ss -tlnp            # TCP 监听
ss -ulnp            # UDP 监听（基岩版用）
```

- 看监听地址：如果是 `127.0.0.1:25565`，**只有本机能连**，必须改成监听 `0.0.0.0`（或留空/指定内网 IP）；
- Java 版的 `server.properties` 里 **`server-ip` 留空**即绑定所有接口，填了 `127.0.0.1` 就会导致外网不可达；
- 确认服务端确实完成了启动（看到 `Done` 之类的日志），而不是卡在启动阶段。

**第 2 步：主机防火墙放行了吗**

```bash
sudo ufw status verbose          # Ubuntu/Debian
sudo firewall-cmd --list-all     # RHEL/Fedora 系
sudo nft list ruleset            # nftables
sudo iptables -S                 # 旧版 iptables
```

Windows 上检查入站规则，并确认该网络位置被识别为"专用网络"而不是"公用网络"。**云服务器还要额外检查安全组**——安全组和系统防火墙是两处独立放行，缺一不可。

**第 3 步：端口转发规则对吗**

- 规则存在、目标 IP 是那台机器的**当前** IP（先确认 DHCP 绑定生效）；
- 协议对（TCP 还是 UDP）；
- 外部端口和内部端口没写反；
- **从外网测试，不要从内网测**：很多路由器的 NAT 回流（hairpin）默认关闭，内网用公网 IP 访问自己会失败，但这不代表转发没配好。用手机流量或外部检测工具验证。

**第 4 步：ISP / CGNAT**

- 回到第 6 节的方法，确认 WAN IP 与外部看到的 IP 一致；
- 用 `traceroute`（Windows 用 `tracert`）看前几跳是否有私有地址；
- 如果确认在 CGNAT 后面，端口转发无论怎么配都不会生效，只能走第 7 节的路线。

**第 5 步：客户端侧**

- 地址和端口有没有写错、域名解析到的是不是当前 IP（动态 IP 换了地址很常见）；
- 客户端自己的防火墙/公司网络是否封了该端口（有些企业网只放行 80/443）；
- 玩家用的是 IPv4 还是 IPv6，和服务端开放的栈是否匹配；
- 客户端与服务端版本是否兼容（协议版本不匹配会被直接拒绝，见 [开服协议与配置推荐](/tutorials/java/protocol)）；
- 服务端是否开了白名单、是否处于 `online-mode` 的验证失败状态。

**抓包确认**：在服务端机器上跑

```bash
sudo tcpdump -ni any port 25565
```

然后让外部客户端连接。**看到包进来**说明前面的转发链路是通的，问题在主机侧（防火墙/监听）；**完全没包**说明问题在更外侧（转发/ISP）。

## 12. 上线前检查清单

- [ ] 已确认自己**有公网 IPv4**，或已选定替代方案（IPv6 / VPS 中转 / 隧道）
- [ ] 目标机器已有**固定的内网 IP**（DHCP 静态绑定或主机静态地址，只选一种）
- [ ] 只转发了 `TCP 25565`（基岩版再加 `UDP 19132`）
- [ ] **RCON `25575`、数据库端口、Docker API、IPMI 一律没有暴露**
- [ ] 管理面板不在公网直连，或已通过 VPN 访问
- [ ] 路由器/防火墙固件已更新，WAN 侧管理已关闭，默认密码已修改
- [ ] 已从**外网**（不是内网）验证过端口可达
- [ ] 若使用 IPv6：已确认前缀是否会变，并有更新规则的办法
- [ ] 配置已导出备份（路由器和防火墙都是）
- [ ] 服务端侧也有主机防火墙，且**两处放行一致**

## 下一步

- 机架、供电与带外管理的物理层知识：见 [机架式服务器、交换机、硬件防火墙与 UPS](/tutorials/ops/hardware-rack)
- 让别人能连上服务器的完整路线：见 [部署到可访问环境](/tutorials/java/deploy)
- 服务端本身的安全配置：见 [安全插件](/tutorials/ops/security-java)
- 数据安全底线：见 [备份与恢复](/tutorials/java/backup)

---

> 本文中的图形界面菜单名称、默认值、服务名与端口封禁策略均随固件/发行版/运营商变化，**请以对应版本的官方文档为准**；命令行示例以 OpenWrt 的 UCI 与标准 WireGuard 配置格式为基础，其他系统上的等价操作请对照其文档。
