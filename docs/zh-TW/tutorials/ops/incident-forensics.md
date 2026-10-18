---
title: 攻擊取證與應急響應
slug: incident-forensics
cat: ops
level: 3
order: 12
minutes: 18
tags: [incident-response, forensics, packet-capture, tcpdump, evidence, ddos, attribution]
updated: 2026-10-04
draft: false
---

被攻擊的那一刻，機器上同時存在兩類東西：**能被記錄下來的證據**，和**幾分鐘後就會永遠消失的狀態**。這一篇講的是後者——在重啟、重灌、拉黑任何東西之前，先把現場固定下來。預防性內容見 [網路安全基礎](/tutorials/ops/network-security) 與 [常見網路攻擊與防禦](/tutorials/ops/attack-defense)。

:::warn 本文不代替法律意見
取證指令、日誌留存要求與個人資訊處理規則**因作業系統、發行版、服務商和司法轄區而異**；凡是隨環境變化的地方本文都會明確標註。涉及玩家個人資料或可能進入法律程序時，**請諮詢專業人士並遵守當地法律與機房政策**。
:::

## 1. 為什麼"先取證"是第一條鐵律

### 1.1 證據會消失

多數人在被攻擊時做的第一件事是**重啟**或**重灌**。這是最糟的選擇：**重啟會銷毀幾乎全部網路層證據**。

| 證據 | 位置 | 消失方式 | 大致存活時間 |
| --- | --- | --- | --- |
| 行程、開啟的套接字 | 記憶體 | 行程結束、重啟 | 秒級到分鐘級 |
| 當前連線（established） | 核心套接字表 | 連線關閉 | 秒級 |
| conntrack 連線跟蹤表 | 核心記憶體 | 條目逾時（隨配置） | 秒級到小時級 |
| ARP / 鄰居表 | 核心記憶體 | 條目過期 | 分鐘級 |
| 網路卡收發包與丟包計數 | 核心計數器 | **重啟或網路卡重置後清零** | 重啟即失 |
| 防火牆規則命中計數 | 核心 netfilter | **重啟清零；`iptables -Z` 也清零** | 重啟即失 |
| 抓包檔案（pcap） | 磁碟 | 僅被刪除或磁碟寫滿覆蓋 | 持久 |
| 系統日誌 / 服務日誌 | 磁碟 | 輪轉後壓縮、刪除 | 天到周 |
| 應用日誌（`logs/latest.log`） | 磁碟 | 輪轉、被新日誌覆蓋 | 天 |
| 配置、腳本、定時任務 | 磁碟 | 被"順手修好"而覆蓋 | 持久但易被改動 |
| 崩潰報告 `crash-reports/` | 磁碟 | 一般不自動刪除 | 持久 |
| 服務商流量圖 / 攻擊報告 | 服務商側 | 按服務商保留期清理 | 天到月 |

**關鍵區分**：**易失證據（volatile）** 在記憶體裡，重啟就沒；**持久證據（persistent）** 在磁碟上，但會因輪轉、覆蓋、誤改而丟失。順序永遠是**先固定易失的，再收集持久的**。

### 1.2 重啟會毀掉什麼

一次重啟會同時摧毀：當前所有 TCP 連線與來源 IP 的分佈（判斷單點還是分散式主要靠它）、conntrack 表（誰和誰通訊、包被哪條規則處理）、網路卡計數器歷史累計值與丟包數、**防火牆規則命中計數**（"我的規則到底攔住了多少"的唯一硬證據）、記憶體中的可疑行程（若攻擊已落地主機，重啟等於幫對方清理現場），以及未落盤的日誌緩衝區。

:::warn "不重啟"不等於"不處置"
你可以在保留現場的同時做緩解：加防火牆規則、限速、切流量到高防、臨時封禁。**但做任何修改都要記下來**（見第 3 節），因為修改本身會改變證據。
:::

### 1.3 正確順序

```text
1. 别重启、别重装、别关机（除非已确认主机被完全控制）
2. 先抓包（tcpdump）—— 网络证据最易失
3. 抓内核状态（ss、conntrack、ip -s link、防火墙计数）
4. 抓进程与服务状态（ps、systemctl、journalctl）
5. 复制日志与配置（对副本操作，不动原件）
6. 计算哈希、写事件日志、记录时间线（统一时区）
7. 然后才开始缓解与加固
```

## 2. 該抓什麼（附正確指令）

:::warn 介面名與路徑隨系統不同
下文用 `eth0` 作為示例網路卡名。**實際可能是 `ens3`、`enp1s0`、`eno1`、`bond0` 等**；用 `ip -br link` 或 `ip addr` 確認。同理，日誌目錄、服務名、防火牆工具在不同發行版上都不一樣。
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

| 參數 | 含義 | 為什麼必須這樣 |
| --- | --- | --- |
| `-i eth0` | 指定網路卡 | **換成你的實際介面名**；不指定時 tcpdump 會自己挑，可能挑錯 |
| `-nn` | 不做名稱解析（IP 與埠保持數字） | 反向 DNS 會**拖慢抓包並丟包**；更嚴重的是攻擊流量會誘使你**對外發起大量 DNS 查詢，等於告訴對方"我正在被攻擊"** |
| `-s 0` | 抓取完整包，不截斷 | 預設只抓前若干位元組，**載荷被截斷後無法分析協議內容**；`0` 表示完整長度 |
| `-w 文件` | 寫入 pcap | 見下方說明 |
| `'port 25565'` | BPF 過濾表示式 | 單引號防止 shell 解釋；`port` 同時匹配 TCP 與 UDP |

**為什麼必須寫檔案而不是列印到終端**：攻擊期間包速率可能達每秒數十萬，把解析結果打到終端會讓 tcpdump **自己成為瓶頸並大量丟包**，同時刷屏使終端失去意義；`-w` 直接寫二進位制，開銷小得多。**別忘了磁碟**：`-s 0` 加高速流量可以在幾分鐘內寫出幾十 GB，先看剩餘空間，並用 `-c` 限制包數，或用 `-C` 按大小輪轉、`-W` 限制檔案數：

```bash
# 只抓 200000 个包后停止
sudo tcpdump -i eth0 -nn -s 0 -c 200000 -w /var/log/incident-cap.pcap 'port 25565'

# 每个文件 100 MB，最多 20 个（共约 2 GB），自动轮转
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap -C 100 -W 20 'port 25565'

df -h /var/log    # 先看剩余空间
```

:::tip 抓不到包怎麼辦
**權限**：抓包需要 `CAP_NET_RAW`，用 `sudo`（`setcap` 會擴大風險面，不推薦）。**介面選錯**：容器內網路卡與宿主機不同（常見 `docker0`、`veth*`、`br-*`），宿主機 `eth0` 未必看得到全部流量。**流量已被旁路清洗**：服務商清洗後，到達你網路卡的可能只剩正常流量——這正是要向服務商索要流量資料的原因（見 2.6）。**雲平台安全組**：部分平台的流量在到達實例前已被丟棄，本機抓不到。
:::

抓完先做粗略統計（不要用 `tcpdump -r` 逐包刷屏）；更細緻的協議分析建議**離線**在另一台機器上用 Wireshark / `tshark` 做，**不要在生產機上邊抓邊分析**。

```bash
# 只数包数
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q | wc -l

# 来源 IP 出现次数前 20
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q 2>/dev/null \
  | awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -20
```

### 2.2 防火牆狀態與計數

```bash
sudo iptables -L -v -n
sudo iptables -t nat -L -v -n

sudo nft list ruleset
sudo nft list counters
```

- `-L` 列規則，`-v` 顯示**每條規則的包計數與位元組計數**，`-n` 不做名稱解析（理由同 `-nn`）；`-t nat` 是 NAT 表（DNAT/SNAT/埠轉發），排查"流量被轉到哪去了"必須看它。
- **計數器的意義**：`DROP`/`REJECT` 規則上的計數**直接證明規則攔下了多少流量**，是復盤和向服務商說明的最有力數字。**重啟或 `iptables -Z` 會清零**，必須在處置早期抓。
- `nft list ruleset` 輸出完整規則集（含集合與計數器）；`nft list counters` 只列具名 counter 物件。**只有顯式定義了 counter 物件的規則才有獨立計數**，普通規則的內聯計數以 `counter packets N bytes M` 出現在 `list ruleset` 裡。**nft 的子指令與輸出格式隨版本變化，以 `man nft` 和發行版文件為準。**

```bash
sudo iptables -L -v -n        > /root/incident/fw-iptables.txt 2>&1
sudo iptables -t nat -L -v -n > /root/incident/fw-iptables-nat.txt 2>&1
sudo nft list ruleset         > /root/incident/fw-nft.txt 2>&1
```

### 2.3 連線表

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

`ss -tan` 中 `t`=TCP、`a`=全部狀態、`n`=數字形式（同樣避免 DNS 解析）。

**conntrack**（需要 `conntrack-tools` 且核心啟用 `nf_conntrack`）：

```bash
sudo conntrack -L    # 导出当前跟踪的全部连接
sudo conntrack -S    # 按 CPU 的错误计数
sudo conntrack -C    # 当前条目数（先看它，再决定要不要 -L）
```

- `conntrack -L` **在連線數很大時可能很慢甚至卡住**，所以先用 `conntrack -C` 評估規模。
- `conntrack -S` 輸出 `insert_failed`、`drop`、`early_drop`、`error` 等。**`insert_failed` 或 `early_drop` 增長說明連線跟蹤表已滿**，此時新連線會被丟棄——**這本身就是可被利用的拒絕服務**，也是"頻寬沒打滿但玩家連不上"的關鍵線索。

```bash
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

:::warn conntrack 可能根本不存在
以下情況看不到 conntrack：**核心未載入 `nf_conntrack` 模組**、**純 nftables 且未啟用連線跟蹤**、**`conntrack-tools` 未安裝**、**容器名稱空間看不到宿主機表**、**部分雲平台定製核心裁剪了該功能**。**這不是你操作錯了**，改用 `ss`、`ip -s link` 與防火牆計數即可。反之，某些大記憶體主機預設 `nf_conntrack_max` 很高，**條目逾時時間也隨發行版與配置不同，不要照搬別處的數值**。
:::

### 2.4 網路卡計數與速率

```bash
ip -s link show eth0
cat /proc/net/dev
```

`ip -s link` 的 `RX`/`TX` 段給出 **bytes / packets / errors / dropped / overrun / mcast**。其中 **`dropped` 與 `overrun` 是關鍵**：它們說明**流量已超出網路卡或核心處理能力**，即使頻寬沒跑滿也已在丟包。`cat /proc/net/dev` 給出所有介面的同樣計數，適合整體快照（**累計值，重啟清零，兩次取樣的差值才有意義**）。

```bash
# sysstat 已安装时，连续采样观察速率（每 1 秒一次，共 5 次）
sar -n DEV 1 5
```

:::note sar 的兩個前提
1. **`sysstat` 必須已安裝**（Debian/Ubuntu：`sudo apt install sysstat`；RHEL 系：`sudo dnf install sysstat`）。
2. **必須已啟用歷史資料採集**（通常由 sysstat 的 systemd 定時器或 cron 收集）。**從未啟用時，`sar` 只能從現在開始採集，看不到攻擊發生時的歷史速率**——這正是平時就該開監控的原因。帶間隔參數的 `sar -n DEV 1 5` 屬於**即時採集**，不受歷史資料是否啟用影響。
:::

`iftop` 與 `nload` 是**可選的即時觀察工具**：

```bash
sudo iftop -i eth0    # 按连接对显示实时带宽
sudo nload eth0       # 简单的进出流量曲线
```

:::warn 即時工具裝不下證據
`iftop` / `nload` 是**終端裡的即時儀表**，關掉就沒了，**無法作為取證材料**。應急時用它們快速判斷方向沒問題，但**必須同時用 tcpdump 落盤**。這類工具本身在高包速率下也會丟包，**不要拿它的數字當精確統計**。安裝包名隨發行版不同，部分發行版需要先啟用 EPEL 之類的額外倉庫。
:::

### 2.5 行程與服務證據

```bash
ps auxf
systemctl status <service>
journalctl -u <service> --since "1 hour ago"
```

- `ps auxf`：以**行程樹**列出所有行程，看有沒有不該在的東西——異常礦工、從 `/tmp` 執行的可執行檔案、偽裝成 `java` 卻指向奇怪路徑的行程。**被攻陷的主機上 `ps` 本身可能被替換或劫持，重要結論要用多種方式交叉驗證。**
- `systemctl status <service>`：服務狀態與最近幾行日誌。服務名取決於部署方式，例如 `minecraft`、`mcserver`、`paper`，**不是固定的**。
- `journalctl -u <service> --since "1 hour ago"`：systemd 日誌，支援 `--since`/`--until`，可寫 `"1 hour ago"`、`"2026-10-04 12:00:00"`、`"today"`。**預設按本地時區顯示，加 `--utc` 強制 UTC**，取證時強烈建議統一用 `--utc`。日誌已輪轉時，用 `journalctl -u <service> --since ... --no-pager > 文件` 匯出，或用 `journalctl --file` 讀取歸檔檔案。

Minecraft 側：

| 路徑 | 內容 | 注意 |
| --- | --- | --- |
| `logs/latest.log` | 當前日誌 | **伺服器重啟時會被覆蓋**，重啟前必須複製走 |
| `logs/YYYY-MM-DD-N.log.gz` | 歷史日誌（按天/序號輪轉） | 已壓縮，仍是有效證據 |
| `crash-reports/` | 崩潰報告 | 一般不自動清理，含堆疊與 JVM 資訊 |
| `plugins/*/` | 各插件自己的日誌與資料庫 | **格式隨插件而異**，常見有登入記錄、指令審計、封禁記錄 |
| `banned-ips.json` / `banned-players.json` | 封禁名單 | 記錄你做過什麼處置，是時間線的一部分 |
| `usercache.json` / `ops.json` | 玩家與管理員對映 | 把 UUID 和名字對應起來 |

```bash
# 复制而不是移动，绝不改动原件
sudo cp -a /srv/minecraft/logs /root/incident/mc-logs
sudo cp -a /srv/minecraft/crash-reports /root/incident/mc-crash-reports
```

`cp -a` 保留時間戳與權限，**這對取證很重要**——`cp -r` 會把修改時間改成當前時間，破壞時間線。**應用層日誌往往比網路層更有用**：網路層只能說"有 4 萬個連線"，應用層能說"某個帳號在 3 分鐘內嘗試登入 900 次"；權限組、登入、經濟、反作弊插件通常都留記錄，**它們是定位"是誰、做了什麼"的主要來源**，具體位置與格式請查各插件文件。

### 2.6 雲 / 機房側的證據

**你看到的流量不等於全部流量。** 服務商在更上游，能看到你的實例**被丟棄之前**的入流量（安全組/網路 ACL 丟棄的流量在你機器上根本看不到）、**攻擊總頻寬與包速率**（pps/Mbps）以及是否觸發清洗、攻擊類型判斷與來源分佈，以及平台側流日誌（flow logs）能力——**是否提供、是否收費、保留多久各家差異很大，以服務商文件為準**。

**要做的事：立刻開工單**，說明你在被攻擊、要求提供流量細節與攻擊報告，並詢問是否需要切換高防 IP 或開啟清洗。**不要只寫"我被打了"**，具體內容見第 5 節。

## 3. 正確保全證據

### 3.1 給所有證據算雜湊

```bash
cd /root/incident
sha256sum incident-*.pcap > incident.sha256
```

**雜湊的作用是證明"我收集之後沒有人改過它"**：

- **雜湊檔案要與被雜湊檔案分開儲存**（不同目錄、不同磁碟，最好另存一份到別處）。放在同一目錄裡，能改檔案的人也能改雜湊，證明力歸零。
- **校驗**：`sha256sum -c incident.sha256`。**雜湊檔案記錄的是相對或絕對路徑，移動位置後校驗會失敗**——這不是檔案損壞，是路徑變了。
- **對所有證據都做**，不只是 pcap：

```bash
find /root/incident -type f -print0 | sort -z | xargs -0 sha256sum > /root/incident.sha256
```

`find -print0` 加 `xargs -0` 用於正確處理含空格的檔名；`sort -z` 保證順序穩定，便於比對。**雜湊檔案寫到證據目錄之外**，並再複製一份到離線介質。

### 3.2 絕不動原件

- **只在副本上分析**。`tcpdump -r` 是隻讀的，安全；任何"修復""轉換""合併"都應在副本上做。
- 整塊磁碟取證時，標準做法是 `dd` 到映像並立即對映像計算雜湊：

```bash
# 注意：目标容量必须大于源设备；此操作会完全覆盖目标设备
sudo dd if=/dev/sda of=/mnt/evidence/sda.img bs=4M conv=noerror,sync status=progress
sha256sum /mnt/evidence/sda.img > /mnt/evidence/sda.img.sha256
```

:::warn dd 的破壞性
`dd` 的 `of=` 指向什麼裝置，就**無條件覆蓋**什麼裝置。**執行前務必用 `lsblk` 確認源與目標的裝置名，寫錯一個字母就會毀掉資料。** 不確定時不要執行。
:::

### 3.3 時間線：必須寫明時區

**這是最常見也最嚴重的錯誤**：把 `journalctl` 的本地時間、服務商的 UTC 時間、插件日誌裡的時間混在一張表裡，事件順序完全錯亂，甚至得出相反結論。

1. **統一用 UTC 記錄**，並在文件裡顯式寫明"以下時間均為 UTC"。
2. 同時**記錄本機時區與 UTC 偏移**，便於與本地日誌對照。
3. 用 ISO 8601 格式，避免 `10/04/2026` 這類有歧義的寫法。

```bash
date -u +%FT%TZ      # 例：2026-10-04T09:32:21Z
date +%FT%T%:z       # 例：2026-10-04T17:32:21+08:00
timedatectl          # 查看系统时区与 NTP 同步状态
```

`date -u +%FT%TZ` 輸出帶 `Z` 字尾的 UTC 時間，**`Z` 表示 UTC，不是時區縮寫**（不要寫 `CST`，它至少對應三個不同時區）。

:::warn 時鐘本身可能是錯的
主機時鐘不準或 NTP 未同步時，**所有日誌時間戳都不可信**。用 `timedatectl` 檢查 `System clock synchronized` 是否為 `yes`，並記錄當前偏移量。**發現漂移要在事件日誌裡註明**，否則跨裝置對時會得出錯誤結論。
:::

### 3.4 寫事件日誌（邊處置邊記）

| 記錄項 | 說明 |
| --- | --- |
| 發現時間 | 誰、通過什麼方式發現的（玩家回饋、監控告警、自己看到） |
| 現象 | 具體表現：卡頓、掉線、無法連線、頻寬跑滿 |
| 每個動作的時間 | **含時區**，寫清"我做了什麼" |
| 你做的修改 | 加的防火牆規則、限速、封禁的 IP、切換的解析 |
| 證據檔名 | 每個檔案是什麼、什麼時候抓的 |
| 聯絡過誰 | 服務商工單號、時間、對方回覆要點 |
| 當前狀態 | 攻擊是否仍在進行 |

:::warn 緩解措施本身會改變證據
你為止血加的每條防火牆規則都會**改變後續抓到的流量特徵**（原本到達的包現在被丟棄，抓不到了）。這不可避免，但**必須記錄**：記下**加規則的時間點**（之後的分析以它為界）、儘量**先抓一輪包再改規則**（哪怕只抓 30 秒）、記錄規則的**完整內容**而不是"我加了條限速"。否則事後無法解釋"為什麼 14:05 之後攻擊流量突然消失了"。
:::

### 3.5 檔案權限與資料保護

```bash
chmod 700 /root/incident
chmod 600 /root/incident/*
chmod 600 /root/incident.sha256
```

- 證據含**玩家 IP、帳號名、聊天內容、可能的登入憑據**，**預設應視為敏感資料**。目錄 `700`（只有屬主可進入）、檔案 `600`（只有屬主可讀寫）。
- **不要**為了"方便檢視"把證據放進 Web 目錄或 `chmod 777`。
- **傳輸**用 `scp` / `rsync -e ssh`（走 SSH 加密），不要用明文 FTP 或郵件附件。
- **資料保護**：涉及玩家個人資料時**注意適用法規**（如歐盟 GDPR、各地個人資訊保護法）——很多轄區把 IP 位址視為個人資訊。原則是**只收集必要範圍、限定用途（安全事件調查）、限制訪問、到期刪除**。**具體義務因國家/地區而異，以當地法律與你的隱私政策為準。**
- **不要**把證據（尤其含玩家聊天與 IP 的 pcap）公開發到論壇或群裡"求鑑定"。

## 4. 歸因：什麼能查、什麼查不出來

**把無辜的第三方當成攻擊者，會造成真實傷害，也會讓你自己的投訴失去可信度。**

### 4.1 偽造源 IP 的 UDP 流量：基本無法歸因

UDP 是**無連線**協議，**源 IP 欄位可以隨意偽造**，且偽造的包不需要收到任何回應就能發出。因此：

- **UDP 洪水（含絕大多數 UDP 反射放大）裡的源 IP 是偽造的，通常完全不可歸因。**
- **不要**因為某個 IP 在 UDP 洪水裡出現最多就去投訴它、封禁它或在公開場合指責它——**那個 IP 極可能是被冒用的受害者**。
- 封禁單個 IP 對偽造流量**沒有意義**（換個偽造值即可），正確做法是**上游流量清洗、限速、按協議特徵過濾**。

少數仍存在的線索：如果能識別出攻擊用的是某個具體服務（DNS、NTP、memcached、CLDAP 等），**那台伺服器是"被利用的開放伺服器"**，不是攻擊者；源 IP 與源埠若有穩定規律，仍有調查價值，但**結論必須謹慎**；流量路徑上的中間裝置（服務商側）能看到更多資訊。

### 4.2 TCP 攻擊：源 IP 通常是真的，但仍不等於"攻擊者"

TCP 需要**三次握手**，完成握手就必須能收到返回包，因此**針對 Minecraft 的 TCP 攻擊**——機器人批次進服（bot join）、連線洪水、狀態查詢（status ping）刷屏——**源 IP 一般是真實的**，可以調查。**但"真實 IP"不等於"攻擊者本人"**：它可能是**被入侵的第三方主機**（被植入後門的 VPS、被黑的家用路由器）、**代理 / VPN / 機場出口**、**Tor 出口節點**，或**共享 NAT 後的某個使用者**。正確表述是：**"該 IP 參與了攻擊流量"，而不是"該 IP 的所有者是攻擊者"。** 這個區別在投訴時非常重要。

### 4.3 反射 / 放大：源頭是無辜的第三方

反射放大攻擊的**受害者有兩個**：你，以及**那些被利用的開放伺服器**。它們被利用是因為管理員**錯誤地把 DNS、NTP、memcached 等 UDP 服務開放給了公網**。

- **不要把反射源報告為攻擊者**，而應報告**"某 IP 上的某服務是開放反射源，正在被濫用"**；
- 給這些 IP 的 `abuse@` 發通知**有幫助**（管理員修好後反射面就消失），但**語氣應是"你的服務被濫用"，不是"你在攻擊我"**；
- 判斷依據：**響應包遠大於請求包**（放大倍數），且**來源是眾所周知的 UDP 服務埠**。

### 4.4 區分"單點集中"與"分散式"

| 觀察到的特徵 | 更可能的性質 | 能做什麼 |
| --- | --- | --- |
| **單個或少數 IP 佔據絕大多數連線** | 單點攻擊、被入侵的主機、測試性掃描 | 值得調查該 IP；可臨時封禁止血 |
| **成千上萬 IP，每個只發少量** | 分散式殭屍網路或偽造源 | 封 IP 無效；靠上游清洗與限速 |
| **TCP 握手完成、連線數穩定增長** | 真實源（bot 進服類） | 調查 IP + 上游防護 + 進服限流 |
| **大量 SYN 但無後續握手** | SYN 洪水（可能偽造源） | 開啟 SYN cookies、上游清洗 |
| **UDP 大包湧入、來源埠固定** | 反射放大 | 按協議/埠過濾、上游清洗，**不要投訴源 IP** |
| **流量不大但服務極慢** | 可能是應用層攻擊或資源耗盡 | 看應用日誌、連線跟蹤表與主機資源 |

**核心判斷**：**少數 IP 集中 = 值得追；海量 IP 分散 = 追不到或追不完，要轉向防護。**

### 4.5 查到 IP 之後做什麼

```bash
whois 203.0.113.10
```

`whois` 輸出通常包含**網段歸屬（netname/descr）、所屬機構、國家，以及 `abuse` 聯絡信箱**。注意：

- **`whois` 客戶端不一定預裝**（Debian/Ubuntu：`sudo apt install whois`；RHEL 系：`sudo dnf install whois`）；
- **不同 RIR（區域網路際網路序號產生器構）輸出格式不同**，`abuse-c`、`OrgAbuseEmail`、`abuse-mailbox` 等欄位名各異，**要人工讀，不要腳本硬匹配**；
- 更推薦 **RDAP**（Registration Data Access Protocol），它是 WHOIS 的**現代 HTTP 替代品**，返回結構化 JSON，支援自動查詢。IANA 提供引導服務（`https://rdap.org/ip/<IP>` 會重定向到對應 RIR），**各 RIR 的具體 URL 與欄位以各 RIR 文件為準**。

**ASN 歸屬**：確定該 IP 屬於哪個自治系統（AS）以及哪家運營商/機房，有助於判斷它是"某雲上的 VPS"還是"某國住宅寬頻"。查詢方式有各 RIR 的 RDAP 服務、`whois -h whois.radb.net` 等，**工具與資料源眾多且覆蓋有差異**，結論不要只依賴單一來源。

**abuse 聯絡方式**：WHOIS/RDAP 裡的 **`abuse@` 信箱**（或 abuse 表單）是**正確的舉報入口**：**要發給 IP 所屬的機房 / 託管商（hosting provider）的 abuse 部門，而不是某個隨機玩家的寬頻 ISP**——機房對自己網段內的機器有實際處置能力（可暫停服務），ISP 對一台被入侵的家用路由器通常動作很慢。**附上證據**：帶時區的時間視窗、協議與埠、來源 IP 列表、包數與速率、pcap 雜湊值；**沒有證據的投訴通常會被忽略**。涉及多個網段時**分別投訴**，不要在群裡公開點名。

### 4.6 法律與邊界

- **規則因國家/地區而異**：什麼算犯罪、要保留哪些日誌、能不能自行調取資料，各國規定不同。**本文不構成法律意見。**
- **推薦順序**：先聯絡**服務商**（能清洗流量、能看上游資料、有 abuse 流程）；嚴重且持續的襲擊（勒索、資料竊取、明確的犯罪行為）再考慮**報警 / 網路犯罪舉報機構**，並保留完整證據鏈。
- **絕對不要報復**：對攻擊源發起 DDoS（所謂 DDoS-back）、入侵對方主機或"反向黑回去"，**在幾乎所有轄區本身就是違法行為**，會讓你從受害者變成被告，並摧毀你原本正當的立場。
- **也不要人肉 / 公開懸賞**攻擊者 IP：可能誤傷無辜第三方，也可能構成騷擾或侵犯隱私。

## 5. 報告與升級

**"我被攻擊了，快處理"幾乎不會得到有效響應。** 有效的工單要能讓對方在 30 秒內判斷該做什麼：

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

| 要素 | 為什麼必須有 |
| --- | --- |
| **帶時區的時間視窗** | 對方要在海量日誌裡定位你的流量，時間不準等於查不到 |
| **攻擊類型與量級** | 決定他們走"清洗"還是"排查"流程 |
| **受影響 IP / 埠** | 確認是打在哪個資產上 |
| **是否仍在持續** | 決定緊急程度 |
| **已做的緩解** | 避免雙方重複操作、互相干擾 |
| **證據檔名** | 讓溝通可追溯 |

**關於 abuse 舉報**：服務商通常有自己的 abuse 信箱或舉報表單，用於處理"其網段內的主機在攻擊別人"，**具體位址以服務商官網/WHOIS 記錄為準**。**他們能看到你看不到的流量**（上游路由、清洗裝置、平台流日誌）——你提供終端視角，他們提供網路視角，兩邊合起來才完整。**隱私限制**：服務商**可能因隱私政策或法律限制，無法把其他客戶的詳細資訊告訴你**，這是正常的，**不要因為對方"不肯給 IP 名單"就認為他們不作為**。持續跟蹤並記錄工單號與每次回覆時間，形成完整溝通時間線（也是事件日誌的一部分）。

## 6. 事件之後

**沒有復盤的應急響應等於白做一次。**

### 6.1 復盤要回答的問題

| 問題 | 具體看什麼 |
| --- | --- |
| **什麼起了作用？** | 哪條防火牆規則命中了？清洗是否生效？限速閾值合理嗎？ |
| **什麼沒起作用？** | 哪些措施毫無效果？哪些反而誤傷了正常玩家？ |
| **多久才恢復？** | 從發現到緩解的真實耗時，瓶頸在哪一步（發現慢？判斷慢？沒有預案？） |
| **攻擊者回來了嗎？** | 對比時間視窗與來源分佈，判斷是同一波還是新一波 |
| **有資料損失嗎？** | 存檔是否完整？有沒有回檔？備份可用嗎？ |
| **暴露了什麼？** | 是否有帳號、金鑰、面板口令在過程中被看到或洩露？ |

### 6.2 加固動作

- **限流（rate limit）**：對連線頻率、每 IP 併發數、進服速率設上限。**這是最有效且最便宜的一層**。例如 `iptables` 的 `hashlimit`/`connlimit` 模組，或服務端插件層面的進服限流（**具體模組名與語法隨核心與工具鏈不同，配置前先確認模組可用**）。
- **上代理 / 高防**：把真實 IP 藏起來（TCPShield 類代理、服務商高防 IP、CDN 的 TCP 轉發）。**注意**：代理能擋網路層洪水，**擋不住應用層攻擊（bot 進服、協議漏洞）**，那需要服務端側的驗證與限流。
- **換服務商 / 換機房**：服務商不提供清洗、或攻擊針對該網段的固定目標時，遷移是現實選擇。**遷移前先確認新家是否有 DDoS 防護與清洗能力。**
- **白名單**：熟人小圈子服**直接開 `white-list=true` 是最徹底的方案**——攻擊者連不進來，就沒法用進服類攻擊消耗你的資源。
- **減少暴露面**：關閉不必要的埠（RCON、query、面板），見 [網路安全基礎](/tutorials/ops/network-security)；主機側加固見 [系統安全加固](/tutorials/ops/system-security)。
- **監控與告警**：**下一次攻擊時，你希望是被監控叫醒的，而不是被玩家罵醒的。** 至少監控頻寬、連線數、TPS 與行程存活。

### 6.3 備份是否完好、是否離線

- **驗證備份真的能恢復**，而不只是"檔案存在"。恢復演練見 [備份與恢復](/tutorials/java/backup) 與 [異地備份](/tutorials/ops/offsite-backup)。
- **確認至少一份副本是離線的**（或不可變/只讀）。若攻擊伴隨主機入侵，**線上且可寫的備份可能已被加密或刪除**。
- **檢查備份時間點**：攻擊期間若發生回檔，要明確**恢復到哪個時間點**，以及玩家資料會退回多久。

### 6.4 憑據與金鑰輪換

**只要有任何暴露的可能，就假定已洩露，全部輪換。**

| 物件 | 動作 |
| --- | --- |
| 面板 / 後台帳號口令 | 立即更換，並啟用兩步驗證（如有） |
| SSH 私鑰 | 重新生成金鑰對，刪除舊公鑰，檢查 `authorized_keys` 有無多餘條目 |
| RCON 口令 | 更換；確認 `enable-rcon` 未對公網開放 |
| 資料庫帳號 | 更換口令，檢查是否有 `root@%` 之類過寬的授權 |
| 雲平台 API Key / Access Key | 在控制台吊銷並重建，檢查有無異常呼叫記錄 |
| 服務帳號 / Token（插件、備份、監控） | 逐一吊銷重建 |
| 玩家帳號 | 若插件資料庫洩露，**通知玩家改密碼** |

**同時檢查**：`~/.ssh/authorized_keys`、`/etc/passwd` 與 `/etc/shadow` 有無新增帳號、`crontab -l` 與 `/etc/cron.*` 有無可疑定時任務、systemd 有無異常 unit。**這些檢查要在完成取證之後做，且把發現記錄下來。**

### 6.5 經驗清單

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

## 7. 可直接使用的取證腳本

下面的腳本把第 2 節裡**易失**的部分一次性收集到帶時間戳的目錄，計算雜湊並列印摘要。**用法：`sudo bash capture-evidence.sh`**（抓包與 conntrack 需要 root）。**執行前請確認**介面名（腳本會自動探測預設路由介面）、證據目錄（預設 `/root/incident`）、抓包時長與包數上限。**腳本只做只讀採集，不修改任何配置、不重啟任何服務。**

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

| 項 | 說明 |
| --- | --- |
| `set -u` 而非 `set -e` | 採集腳本要**儘量把能抓的都抓完**，某個可選指令失敗不應中斷整個採集 |
| `command -v` 守衛 | 只對**可選工具**（`sar`、`nft`、`conntrack`、`tcpdump`、`systemctl`）使用；核心指令（`ip`、`ss`）假定存在 |
| `timeout` | 限制抓包時長；**`timeout` 屬於 GNU coreutils，多數 Linux 發行版自帶**，極小化映像可能沒有 |
| `-c "$CAPTURE_PACKETS"` | 包數上限，防止攻擊期間寫滿磁碟；**時長與包數誰先滿足誰生效** |
| `cp -a` | 保留日誌原件的**時間戳與權限**，這是取證的基本要求 |
| 抓包過濾器 | `'port 25565 or udp port 19132'`：**`port` 同時匹配 TCP/UDP**，所以寫成 `port 25565` 加 `udp port 19132`，避免把 19132 的 TCP 也抓進來 |
| 校驗和 | 目錄內留一份，**另外在 `BASE_DIR` 下再存一份**；真正嚴格的場景應把校驗和與證據分機器儲存 |
| 服務名與路徑 | `MC_SERVICE`、`MC_DIR` **必須按你的部署填寫**，腳本無法猜測 |
| 容器環境 | 在容器裡執行時，`IFACE` 與 `MC_DIR` 都要指向**容器網路名稱空間內的**介面與路徑 |

:::warn 採集腳本不能代替判斷
腳本負責**把易失證據落盤**，但**判斷"這是什麼攻擊、要不要投訴、要不要切高防"仍然要靠人**。腳本跑完後請按第 1 至第 6 節的流程繼續，尤其別忘了**寫事件日誌**和**聯絡服務商**。
:::

配套閱讀：[網路安全基礎](/tutorials/ops/network-security)（埠與防火牆）、[常見網路攻擊與防禦](/tutorials/ops/attack-defense)（攻擊類型與預防）、[系統安全加固](/tutorials/ops/system-security)（主機側加固）、[異地備份](/tutorials/ops/offsite-backup) 與 [備份與恢復](/tutorials/java/backup)（資料保全與恢復演練）。

> 取證指令與合規要求因系統與地區而異，請以當地法律與機房政策為準。
