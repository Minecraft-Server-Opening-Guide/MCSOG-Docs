---
title: 軟路由與埠轉發
slug: router-firewall
cat: ops
level: 3
order: 8
minutes: 16
tags: [ops, router, firewall, port-forward, nat, ipv6, openwrt]
updated: 2026-10-04
draft: false
---

服務端在本機跑通了，防火牆也放行了，玩家還是連不上——問題幾乎總是出在**從公網到你那台機器之間的那幾跳**上。這一篇講清楚這幾跳各自負責什麼、怎麼配、以及連不上時按什麼順序排查。

本篇給的是**概念 + 命令列示例**。圖形介面的選單名稱、位置和選項在不同版本、不同廠商、不同韌體之間差異極大，凡是這類內容都會明確標註，不會假裝它們到處都一樣。

## 1. 路由器到底做了什麼

家用"路由器"其實是一台一體機，同時幹了五件事。分開理解，排障時才不會混淆：

| 功能 | 作用 | 出問題時的表現 |
| --- | --- | --- |
| **路由** | 在 WAN 與 LAN 之間轉發 IP 包 | 完全上不了網 |
| **NAT** | 把內網位址轉換成公網位址（SNAT），並按規則反向轉換（DNAT，即埠轉發） | 內網能上網，外面連不進來 |
| **DHCP** | 給內網裝置自動分配 IP、閘道器、DNS | 裝置拿不到位址或位址亂變 |
| **DNS** | 轉發/快取域名解析，提供內網名稱 | 能 ping 通 IP 但域名不通 |
| **防火牆** | 有狀態過濾，決定哪些流量能通過 | 規則寫錯則全通或全不通 |

**埠轉發（port forwarding）本質是 DNAT**：把"發往公網 IP 的某埠"的包，改寫目的位址和埠後轉給內網某台機器。它和"防火牆放行"是兩件事：

- **NAT 決定包去哪兒**；
- **過濾規則決定包能不能過**。

兩者必須同時成立，埠轉發才會生效。這也是為什麼在 pfSense 這類系統上"加了埠轉發卻還是不通"——過濾規則沒放行（新版通常會自動建立對應規則，見第 5 節）。

埠轉發的前提是**目標機器有固定內網 IP**：要麼在路由器上做 **DHCP 靜態繫結**（推薦），要麼在主機上設靜態 IP 並把位址排除在 DHCP 池之外。否則機器重啟換了 IP，轉發就指向空氣。

## 2. 家用路由器與軟路由

| 方案 | 適合 | 優點 | 代價 |
| --- | --- | --- | --- |
| **家用一體機** | 需求簡單 | 開箱即用、功耗低、有無線 | 功能少、可設定項有限、廠商韌體常停止維護 |
| **OpenWrt**（刷在支援的硬路由或 x86 上） | 想深度控制、成本低 | 包管理、UCI 配置可腳本化、社群活躍 | 需要自己維護；刷機有變磚風險；無線驅動表現隨機型差異大 |
| **pfSense / OPNsense**（x86） | 想要完整防火牆/VPN 能力 | 有狀態防火牆、NAT、IPsec/WireGuard/OpenVPN、流量圖表、多網段 | 需要一台 x86 機器和兩塊以上網絡卡；功能多也意味著配置面更大 |

:::note 選單路徑不是知識
OpenWrt、pfSense、OPNsense 的介面在版本之間反覆調整過（選項改名、位置搬家、預設值變化）。**記住概念和設定檔的語義，比記住"點哪個選單"更耐用**。本文的命令列示例都是穩定的介面；圖形介面的具體位置請對照你所裝版本的官方文件。
:::

## 3. OpenWrt：用 UCI 配置埠轉發

OpenWrt 的防火牆配置在 `/etc/config/firewall` 裡，用 `uci` 修改。下面是把外網 `TCP 25565` 轉發到內網 `192.168.1.10:25565` 的標準寫法：

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

欄位含義：

| 欄位 | 含義 |
| --- | --- |
| `name` | 規則名稱，僅用於識別，可任意取 |
| `target` | `DNAT` 表示目的位址轉換。**這是 redirect 小節的預設值**，顯式寫出更清晰 |
| `src` | 流量來自哪個區域，這裡是 `wan` |
| `src_dport` | 公網側被訪問的埠 |
| `dest` | 轉發到哪個區域，這裡是 `lan` |
| `dest_ip` | 內網目標機器的 IP |
| `dest_port` | 內網目標埠 |
| `proto` | 協議，`tcp` / `udp` / `tcp udp`（配置解析器接受空格分隔的協議列表） |

常用操作與注意點：

```bash
uci show firewall                 # 查看当前配置，确认规则确实写进去了
uci delete firewall.@redirect[0]  # 删除第 0 条 redirect（编号以 uci show 输出为准）
uci commit firewall
/etc/init.d/firewall reload
```

- `uci set` 只是改記憶體中的配置，**必須 `uci commit` 才會寫入 `/etc/config/firewall`**；
- `reload` 會重新生成並載入規則，不需要重啟路由器；
- **OpenWrt 22.03 及以後預設使用 fw4（nftables 後端）**，21.02 及以前是 fw3（iptables 後端）。`/etc/config/firewall` 的寫法在兩者之間基本一致，但**直接敲 `iptables` 命令的教學在新版本上不適用**，對應的是 `nft`；
- 外部埠和內部埠**可以不同**（改 `src_dport` 即可）。換個外部埠能減少被掃描到的機率，但**這只是降低噪音，不是安全措施**。

**基岩版（UDP）或需要同時轉發 TCP/UDP** 時，把協議寫成列表：

```bash
uci set firewall.@redirect[-1].proto='tcp udp'
```

## 4. OpenWrt：靜態 DHCP 繫結

埠轉發的目標 IP 必須穩定。在 OpenWrt 上按 MAC 位址繫結固定 IP：

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

- `mac` 用目標機器的網絡卡 MAC，**區分大小寫通常無所謂，但格式必須是六組冒號分隔的十六進位制**；
- `ip` 必須在 LAN 網段內，且**不要落在 DHCP 動態池範圍內**（OpenWrt 預設動態池常從 `100` 開始，`192.168.1.10` 一般安全，但以你的實際配置為準）；
- 改了 `dhcp` 配置要重啟的是 **dnsmasq**，不是 firewall；
- 也可以在主機側設靜態 IP，但**只選一種方式**，兩邊都配容易衝突。

## 5. pfSense / OPNsense：概念一致，標籤會變

這兩個系統都是 FreeBSD + pf 防火牆，概念與 OpenWrt 相通，但操作方式完全不同（Web 介面為主，也有 config.xml）。核心概念：

| 概念 | 說明 |
| --- | --- |
| **介面（Interfaces）** | 通常有 WAN、LAN，以及可選的 OPT 口；每個介面對應一塊網絡卡或一個 VLAN |
| **埠轉發** | 在 **Firewall > NAT > Port Forward** 裡新增對映：指定介面、協議、目的埠、目標 IP 與埠 |
| **關聯過濾規則** | **NAT 與過濾是兩件事**。較新版本會在儲存轉發時**自動建立對應的放行規則**；老版本介面上有"Add associated filter rule"之類的勾選項。**具體行為隨版本變化，請在 `Firewall > Rules` 裡確認規則確實存在。** |
| **別名（Aliases）** | **Firewall > Aliases** 可把多個埠或多個 IP 定義成一個名字，規則裡引用別名，便於維護 |
| **靜態對映** | 在 DHCP 服務頁面（pfSense 的 `Services > DHCP Server`；OPNsense 的 DHCP 相關頁面）裡為 MAC 繫結固定 IP |
| **NAT 迴流（reflection）** | 讓內網機器也能用公網 IP 訪問內部服務。預設常關閉，開啟方式與選項名稱隨版本變化 |
| **配置備份** | pfSense 在 `Diagnostics > Backup & Restore`；OPNsense 在 `System > Configuration > Backups`。**改完一定要匯出配置** |

需要額外留意的版本差異：

- **OPNsense 從 24.7 起把預設 DHCP 服務從 ISC dhcpd 換成了 Kea**，靜態對映的選單位置隨之變化；
- pfSense 分 CE 與 Plus 兩條線，同一功能的位置可能不同；
- 兩家的介面標籤在多年迭代中反覆改過名。

因此：**選單路徑以你所裝版本的官方文件為準**，但"WAN/LAN 介面、NAT 埠轉發、關聯過濾規則、別名、靜態對映"這五個概念在任何版本里都成立。

## 6. 公網 IPv4 與 CGNAT

**在配埠轉發之前，先確認你到底有沒有公網 IPv4。** 方法很簡單：

1. 在路由器狀態頁看 **WAN 口拿到的 IP**；
2. 用另一台裝置（例如手機流量）訪問任意"我的 IP 是什麼"網站，看**外部看到的 IP**；
3. 兩者**一致**，且該位址不是私有位址，才說明你有公網 IPv4。

判斷線索：

| 現象 | 含義 |
| --- | --- |
| WAN IP 落在 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | 運營商內網位址，典型的多層 NAT |
| WAN IP 落在 `100.64.0.0/10` | **CGNAT 專用位址段（RFC 6598）**，幾乎可以確定沒有公網 IPv4 |
| `traceroute` 前面幾跳都是私有位址 | 中間還有運營商級 NAT |
| WAN IP 是公網位址，但外部依然連不上 | 可能是運營商封了入向埠，也可能是你的轉發/防火牆沒配好，需分步驗證 |

:::warn 不要假設"打電話就能要到一個公網 IP"
不同運營商、不同地區、不同套餐的政策差別很大：有的可以免費給，有的收費，有的明確不提供，還有的只給企業寬頻。**可以申請，但不要把它當成必然能拿到的方案**，要準備好替代路線。
:::

另外兩種常見的"看起來像沒公網"的情況：

- **雙重 NAT**：光貓自己也在撥號並做 NAT，你的路由器再 NAT 一次。解決辦法是把光貓改成**橋接模式**（由你的路由器撥號），或者在光貓上也做一次埠轉發（兩層都要轉）。
- **運營商封埠**：常見於部分地區的 80/443 等埠。換用非標準埠通常可以繞開，**具體封禁策略因運營商與地區而異**。

## 7. 沒有公網 IPv4 時的三條出路

| 方案 | 原理 | 代價 |
| --- | --- | --- |
| **申請公網 IP** | 讓 ISP 直接給你一個可入向的位址 | 可能免費、可能收費、可能被拒；不一定給靜態位址 |
| **改用 IPv6** | 大多數地區 IPv6 是公網可達的，直接開放防火牆即可（見第 8 節） | 玩家側也需要 IPv6；不同網路覆蓋率差異大 |
| **VPS 中轉 / 隧道** | 用一台有公網 IP 的伺服器做跳板，把流量轉回你家 | 多一跳，延遲與穩定性取決於中轉節點；有頻寬成本 |

VPS 中轉的常見做法：

- **frp**：家內跑 `frpc`，VPS 上跑 `frps`，把 VPS 的埠對映到內網服務。配置簡單，適合單埠轉發（示例見 [部署到可存取環境](/tutorials/java/deploy)）；
- **WireGuard + DNAT**：家內機器與 VPS 建隧道，VPS 上把入向流量 DNAT 到隧道內的內網位址。靈活、加密，但需要自己維護路由與轉發規則；
- **商用隧道服務**：省事，但通常有流量/頻寬限制，且**質量參差**。

選擇時注意：**基岩版用 UDP**，很多隧道方案預設只支援 TCP，UDP 需要額外確認或付費。另外中轉會增加**幾十毫秒級**的延遲（取決於地理距離），對延遲敏感的玩法要提前評估。

## 8. IPv6：埠轉發的邏輯變了

IPv6 的核心變化是**位址足夠多，通常不再需要 NAT**。因此：

- 不再有"埠轉發"（DNAT）這一層，取而代之的是**在防火牆上放行入向流量**；
- 每台裝置通常有**全域可路由位址**，直接可達；
- 防火牆的預設策略才是關鍵：**OpenWrt 等韌體預設拒絕 WAN 側入向連線**，你必須顯式加一條放行規則。

OpenWrt 上放行某台主機的 `TCP 25565`：

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

**字首問題**是 IPv6 開服最常見的坑：

- 家寬通常通過 **DHCPv6-PD（字首委派）** 從 ISP 拿到一個字首（常見 `/56`、`/60` 或 `/64`，隨 ISP 而異），再由路由器分配給內網；
- **很多 ISP 的字首不是固定的**，重播、重啟光貓、運營商側調整都可能換字首；
- 字首一換，上面那條規則裡的 `dest_ip` 就失效了，玩家也連不上；
- 應對思路：向 ISP 申請**靜態字首**（不一定給）；或讓主機使用**穩定的介面識別符號**（例如在 SLAAC/DHCPv6 裡固定字尾），再用腳本在 `hotplug.d/iface` 或定時任務裡**自動更新防火牆規則**；也可以使用隧道服務商分配的路由字首（屬於第三方方案，需自行評估穩定性）。

其他 IPv6 注意點：

- 玩家連線時要寫**方括號**：`[2001:db8:abcd:1::10]:25565`；
- 服務端 `server.properties` 裡的 `server-ip` 留空即可同時監聽 IPv4/IPv6（留空 = 繫結所有介面）；
- **相當一部分玩家沒有可用的 IPv6**（尤其在某些地區與行動網路），所以 IPv6 最好作為 IPv4 之外的**補充**，而不是唯一入口；
- 內網可以用 ULA 位址（`fd00::/8`）做穩定的內部編址，但**對外可達仍然依賴 ISP 給的字首**。

## 9. 邊界安全：只轉發你真正需要的

埠轉發的每一條規則，都是你在公網上開的一扇門。原則：

1. **只轉發必須的埠**。Minecraft 只需要 `TCP 25565`（基岩版 `UDP 19132`）。
2. **絕不轉發這些埠**（這是最常見的入侵入口）：
   - `TCP 25575` RCON（協議本身不加密，等於把控制台交出去）；
   - `TCP 3306` MySQL/MariaDB、`TCP 5432` PostgreSQL、`TCP 6379` Redis、`TCP 27017` MongoDB、`TCP 9200` Elasticsearch；
   - `TCP 2375` / `2376` Docker API；
   - `TCP 445` SMB；
   - `UDP 623` IPMI（見 [機架式伺服器、交換機、硬體防火牆與 UPS](/tutorials/ops/hardware-rack)）；
   - `TCP 3493` NUT。
3. **管理面板不要直接暴露**。Pterodactyl、寶塔之類的面板屬於高危目標：漏洞影響面大，一旦被拿到就是整機。
4. **RDP / SSH 之類的管理入口換用非標準外部埠**（例如把外部 `50022` 轉到內網 `22`）。這隻能減少自動化掃描，**不能替代認證與加固**——該用金鑰還是要用金鑰，該開二次驗證還是要開。
5. **優先用 VPN 而不是暴露**。要把管理面板給自己用，最穩的做法是建一條 VPN，面板只監聽內網位址。
6. **不要在邊緣開啟 UPnP / NAT-PMP**，除非你確實需要它。它允許內網程式自行在防火牆上打洞，等於把邊界策略交給應用。
7. **在防火牆上做速率限制**（例如對 `25565` 的新建連線限速），能緩解一部分連線洪水；配合服務端的連線限制一起用。
8. **面板類服務配 fail2ban 之類的登入封禁**，並保持及時更新。

## 10. WireGuard：比暴露埠更安全的做法

思路：**不把管理埠暴露給全世界，而是讓外網裝置先進入內網**。WireGuard 是當前最簡潔的選擇——核心態實現（Linux 5.6 起進入主線）、配置短、基於 UDP。

生成金鑰對：

```bash
wg genkey | tee privatekey | wg pubkey > publickey
chmod 600 privatekey
```

服務端（有公網 IP 的一側，例如 VPS 或你的軟路由）：

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

客戶端（你的筆記本或手機）：

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

要點：

- **`AllowedIPs` 在服務端側同時是"允許這個對端使用哪些源位址"和"去往這些位址的流量發給這個對端"**，寫 `10.10.0.2/32` 是單主機；客戶端側寫 `10.10.0.0/24` 表示**只把去 VPN 網段的流量走隧道**（分流），寫 `0.0.0.0/0, ::/0` 則是**全域代理**；
- **`PersistentKeepalive = 25` 放在位於 NAT 後面的一側**，用來維持對映，讓服務端能主動回連；
- 客戶端側不需要 `Endpoint` 也能工作（服務端主動連它時），但通常還是寫上以便先發起；
- 只需在**服務端**放行 `UDP 51820`（埠可自定義），客戶端不需要任何入向埠；
- 如果要讓 VPN 客戶端訪問整個內網或訪問網際網路，服務端需要開啟 IP 轉發並在 nftables/iptables 裡做 MASQUERADE/NAT；
- OpenWrt 上 WireGuard 的配置方式是通過 UCI（`/etc/config/network` 的 `wireguard` 介面段）或 `luci-app-wireguard`，**與上面的 wg-quick 格式不同**，但金鑰、`AllowedIPs`、`Endpoint` 這些概念完全一致；
- 同樣別忘了：**私鑰檔案權限設成 `600`，不要提交到 Git 倉庫**。

## 11. 排障順序：從內到外，逐層驗證

玩家連不上時，**不要一上來就懷疑運營商**。按這個順序查，每步都能給出"是/否"的結論：

**第 1 步：主機上的服務真的在監聽嗎**

```bash
ss -tlnp            # TCP 监听
ss -ulnp            # UDP 监听（基岩版用）
```

- 看監聽位址：如果是 `127.0.0.1:25565`，**只有本機能連**，必須改成監聽 `0.0.0.0`（或留空/指定內網 IP）；
- Java 版的 `server.properties` 裡 **`server-ip` 留空**即繫結所有介面，填了 `127.0.0.1` 就會導致外網不可達；
- 確認服務端確實完成了啟動（看到 `Done` 之類的日誌），而不是卡在啟動階段。

**第 2 步：主機防火牆放行了嗎**

```bash
sudo ufw status verbose          # Ubuntu/Debian
sudo firewall-cmd --list-all     # RHEL/Fedora 系
sudo nft list ruleset            # nftables
sudo iptables -S                 # 旧版 iptables
```

Windows 上檢查入站規則，並確認該網路位置被識別為"專用網路"而不是"公用網路"。**雲伺服器還要額外檢查安全組**——安全組和系統防火牆是兩處獨立放行，缺一不可。

**第 3 步：埠轉發規則對嗎**

- 規則存在、目標 IP 是那台機器的**當前** IP（先確認 DHCP 繫結生效）；
- 協議對（TCP 還是 UDP）；
- 外部埠和內部埠沒寫反；
- **從外網測試，不要從內網測**：很多路由器的 NAT 迴流（hairpin）預設關閉，內網用公網 IP 訪問自己會失敗，但這不代表轉發沒配好。用手機流量或外部檢測工具驗證。

**第 4 步：ISP / CGNAT**

- 回到第 6 節的方法，確認 WAN IP 與外部看到的 IP 一致；
- 用 `traceroute`（Windows 用 `tracert`）看前幾跳是否有私有位址；
- 如果確認在 CGNAT 後面，埠轉發無論怎麼配都不會生效，只能走第 7 節的路線。

**第 5 步：客戶端側**

- 位址和埠有沒有寫錯、域名解析到的是不是當前 IP（動態 IP 換了位址很常見）；
- 客戶端自己的防火牆/公司網路是否封了該埠（有些企業網只放行 80/443）；
- 玩家用的是 IPv4 還是 IPv6，和服務端開放的棧是否匹配；
- 客戶端與服務端版本是否相容（協議版本不匹配會被直接拒絕，見 [開服協議與配置推薦](/tutorials/java/protocol)）；
- 服務端是否開了白名單、是否處於 `online-mode` 的驗證失敗狀態。

**抓包確認**：在服務端機器上跑

```bash
sudo tcpdump -ni any port 25565
```

然後讓外部客戶端連線。**看到包進來**說明前面的轉發鏈路是通的，問題在主機側（防火牆/監聽）；**完全沒包**說明問題在更外側（轉發/ISP）。

## 12. 上線前檢查清單

- [ ] 已確認自己**有公網 IPv4**，或已選定替代方案（IPv6 / VPS 中轉 / 隧道）
- [ ] 目標機器已有**固定的內網 IP**（DHCP 靜態繫結或主機靜態位址，只選一種）
- [ ] 只轉發了 `TCP 25565`（基岩版再加 `UDP 19132`）
- [ ] **RCON `25575`、資料庫埠、Docker API、IPMI 一律沒有暴露**
- [ ] 管理面板不在公網直連，或已通過 VPN 訪問
- [ ] 路由器/防火牆韌體已更新，WAN 側管理已關閉，預設密碼已修改
- [ ] 已從**外網**（不是內網）驗證過埠可達
- [ ] 若使用 IPv6：已確認字首是否會變，並有更新規則的辦法
- [ ] 配置已匯出備份（路由器和防火牆都是）
- [ ] 服務端側也有主機防火牆，且**兩處放行一致**

## 下一步

- 機架、供電與帶外管理的物理層知識：見 [機架式伺服器、交換機、硬體防火牆與 UPS](/tutorials/ops/hardware-rack)
- 讓別人能連上伺服器的完整路線：見 [部署到可存取環境](/tutorials/java/deploy)
- 服務端本身的安全配置：見 [安全插件](/tutorials/ops/security-java)
- 資料安全底線：見 [備份與恢復](/tutorials/java/backup)

---

> 本文中的圖形介面選單名稱、預設值、服務名與埠封禁策略均隨韌體/發行版/運營商變化，**請以對應版本的官方文件為準**；命令列示例以 OpenWrt 的 UCI 與標準 WireGuard 配置格式為基礎，其他系統上的等價操作請對照其文件。
