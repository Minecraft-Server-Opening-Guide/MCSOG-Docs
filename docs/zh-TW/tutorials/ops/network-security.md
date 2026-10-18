---
title: 網路安全基礎
slug: network-security
cat: ops
level: 3
order: 5
minutes: 16
tags: [network-security, firewall, ssh, ddos, secrets, monitoring, ops]
updated: 2026-10-04
draft: false
---

服務端能被別人連上，就意味著**它同時也能被別人掃到**。開服第一天起，你的公網 IP 就會被埠掃描器、爆破腳本和"廣撒網"式攻擊工具反覆試探——**這不是因為你得罪了誰，只是因為你暴露在公網上**。

這一篇講的是網路層面的防護：**該開哪些埠、防火牆怎麼配、SSH 怎麼加固、被打了怎麼辦**。系統內部的加固見 [系統安全加固](/tutorials/ops/system-security)。


:::warn Docker 容器會繞過本機防火牆
本頁講的所有 `ufw` / `firewalld` 規則，對 **Docker 容器映射出來的埠無效**。Docker 會把自己的 `iptables` 規則插在系統防火牆之前，因此 `ufw deny` 擋不住容器埠。

想真正限制，請把埠綁到迴環（`-p 127.0.0.1:25565:25565`）或使用 `DOCKER-USER` 鏈。詳見 [用 Docker 部署 Java 版 → 網路與防火牆](/tutorials/java/docker)。
:::

## 一、先認清攻擊面

### 1.1 你真正需要開放的埠

| 用途 | 協議 | 預設埠 | 是否對公網開放 |
| --- | --- | --- | --- |
| **Minecraft Java 版** | TCP | `25565` | 是（玩家入口） |
| **基岩版 / Geyser** | UDP | `19132` | 是（跨端服需要） |
| **查詢協議（query）** | UDP | `25565` | 一般不需要 |
| **RCON 遠端控制台** | TCP | `25575` | **絕不** |
| **資料庫**（MySQL / MariaDB） | TCP | `3306` | **絕不** |
| **Redis** | TCP | `6379` | **絕不** |
| **面板**（各類 Web 管理面板） | TCP | 因面板而異 | **絕不** |
| **SSH** | TCP | `22` | 是，但**限制來源** |

:::warn 埠預設值可能被改過
上表是各軟體的**出廠預設值**。如果你在 `server.properties` 裡改過 `server-port`、`query.port`、`rcon.port`，或者在面板裡改過監聽埠，**以你的實際配置為準**。防火牆規則要和實際埠一致，否則要麼連不上，要麼留了個洞。
:::

### 1.2 關於 RCON 和資料庫：為什麼必須鎖死

- **RCON 是"沒有介面的管理員權限"**。它用一條口令換取在控制台執行任意指令的能力。一旦暴露到公網，攻擊者可以直接 `op` 自己、清空存檔、踢光玩家。**正確做法是 `enable-rcon=false`，需要遠端管理就通過 SSH 隧道或面板走本地迴環。**
- **資料庫埠暴露是最常見的資料洩露入口**。MySQL 允許 `root` 從任意主機登入（`root@%`）時，弱口令會在幾分鐘內被爆破成功，玩家的帳號、密碼雜湊、購買記錄全部洩露。
- **面板埠暴露等於把整台機器的控制權掛到公網上**。面板本身有登入頁，但登入頁也可能有漏洞，且它通常以較高權限執行。

一個基本原則：**任何不是"給玩家用的"埠，都不要對公網開放。** 需要自己遠端訪問時，用 SSH 隧道（見第四節）而不是直接暴露。

### 1.3 順手做的兩件事

- **確認監聽位址**：資料庫、面板、RCON 應繫結 `127.0.0.1` 而不是 `0.0.0.0`。繫結迴環後，即使防火牆配錯，外部也連不上。
- **確認 `online-mode`**：Java 版保持 `online-mode=true`（`server.properties`）。離線模式讓任何人都能冒用他人 ID，屬於身份層面的洞，防火牆補不了。詳見 [服務端配置](/tutorials/java/config)。

## 二、防火牆是兩層，不是一層

這是新手最容易漏的一點：

| 層 | 位置 | 誰管 | 例子 |
| --- | --- | --- | --- |
| **雲安全組 / 網路 ACL** | 在雲平台側，流量**還沒到你的機器** | 雲服務商控制台 | 阿里雲安全組、騰訊雲安全組、AWS Security Group |
| **主機防火牆** | 在作業系統裡，`netfilter` / `nftables` | 你自己在機器上配 | `ufw`、`firewalld`、`iptables`、`nftables` |

**兩層都要配。** 只配安全組，機器被換到別的網路或安全組被改寬時就失去保護；只配主機防火牆，很多雲平台的預設安全組可能已經很寬鬆，等於把第一道門敞開。

:::warn 雲平台的具體操作路徑不寫在這裡
各家雲控制台的選單名稱、層級和術語都不一樣（"安全組""防火牆""網路 ACL"混用），**本文不臆測具體選單路徑**。請以你所用服務商的官方文件為準。可以確認的是：**入站規則（ingress）預設應全部拒絕，只放行你列出的埠。**
:::

### 2.1 ufw（Ubuntu / Debian 常見）

`ufw` 是 `iptables` / `nftables` 的前端，適合單機場景。

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

`sudo ufw status verbose` 會輸出當前策略與規則，正常應能看到 `Default: deny (incoming), allow (outgoing)` 以及你放行的條目。

**順序很重要**：如果先 `sudo ufw enable` 再放行 SSH，而你的連線恰好被切斷，就只能通過雲平台的 VNC / 救援控制台進去了。

### 2.2 firewalld（RHEL / Rocky / AlmaLinux / Fedora 常見）

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

`--permanent` 寫進持久配置，**必須 `--reload`（或重啟 firewalld）才生效**。不加 `--permanent` 的改動是執行時的，重啟後消失——兩種方式各有用途，別混著用還以為配好了。

### 2.3 iptables（傳統寫法）

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

`iptables` 規則**預設不持久化**，重啟即丟。需要儲存：

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 2.4 nftables（現代寫法）

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 25565 accept
sudo nft add rule inet filter input udp dport 19132 accept
```

:::note 現代發行版裡 ufw 與 firewalld 底層就是 nftables
在較新的核心與發行版上，`ufw` / `firewalld` 已經預設使用 `nftables` 後端。**不要同時啟用兩套前端**（比如既開 `ufw` 又開 `firewalld`），它們會互相覆蓋規則，排查起來非常痛苦。**選一套，配到底。**
:::

### 2.5 "放行埠"和"限制來源"是兩回事

| 寫法 | 含義 | 風險 |
| --- | --- | --- |
| `sudo ufw allow 22/tcp` | **任何人都能連 22 埠** | 全世界都能爆破你的 SSH |
| `sudo ufw allow from 203.0.113.10 to any port 22 proto tcp` | **只有 `203.0.113.10` 能連 22 埠** | 該 IP 變了就得改規則 |

對玩家入口（`25565`）你**必須**放開來源，因為玩家來自五湖四海。但對 SSH、面板、RCON、資料庫這些**只有你自己用**的服務，**永遠應該限制來源**。

:::tip 沒有固定 IP 怎麼辦
家用寬頻的公網 IP 會變。可選方案：向運營商申請固定 IP、使用雲服務商的 VPN / 堡壘機、或者用 SSH 金鑰 + fail2ban 來降低風險。**注意：把 SSH 限制到某個會變的 IP，會讓你在 IP 變化後連不上**——務必先確認雲平台有 VNC 救援通道。
:::

## 三、SSH 加固

SSH 是管理入口，也是被爆破最多的埠。加固順序建議：**先確認金鑰能登入，再關密碼登入**。

### 3.1 先配置金鑰登入

在本機生成金鑰（如果還沒有）：

```bash
ssh-keygen -t ed25519 -C "mc-admin"
```

把公鑰傳到伺服器：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub mcadmin@203.0.113.10
```

**驗證**：新開一個終端，用金鑰登入成功，再繼續下一步。

### 3.2 修改 sshd 配置

編輯 `/etc/ssh/sshd_config`（用 `sudo`）：

```ini
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

| 設定項 | 作用 |
| --- | --- |
| `PubkeyAuthentication yes` | 允許公鑰認證（金鑰登入的基礎） |
| `PasswordAuthentication no` | **關閉密碼認證**，爆破腳本直接失去目標 |
| `PermitRootLogin no` | **禁止 root 直接登入**，攻擊者必須先猜到一個普通使用者名稱 |
| `KbdInteractiveAuthentication no` | 關閉鍵盤互動認證，避免繞過 `PasswordAuthentication no` |

:::warn 改完必須驗證語法再過載
先用 `sudo sshd -t` 檢查配置語法，**通過後**再 `sudo systemctl reload ssh`（部分發行版是 `sshd`）。如果配置有誤就直接重啟 SSH，你可能會被徹底鎖在外面。
:::

**檢查當前生效值**（配置可能被 `Include` 的片段覆蓋）：

```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

:::note 設定檔的寫法隨版本變化
較新的 OpenSSH 支援在 `/etc/ssh/sshd_config.d/` 放 `.conf` 片段，且**片段裡的設定通常優先於主檔案**。如果你的發行版有這個目錄，改之前先 `ls /etc/ssh/sshd_config.d/` 看看有沒有覆蓋項。**具體優先順序以你係統上 `sshd -T` 的實際輸出和 OpenSSH 官方文件為準。**
:::

### 3.3 改預設埠：可選，作用有限

把 SSH 埠從 `22` 改成別的（比如 `2222`）：

```ini
Port 2222
```

**它帶來什麼**：自動掃描器大多隻掃 `22`，改埠能顯著減少日誌噪音和無效爆破。

**它不帶來什麼**：**不是安全措施**。針對性的掃描可以在全埠範圍內找到你的 SSH。所以改埠**不能替代**金鑰登入和來源限制。

如果改了埠，記得同步更新防火牆規則，並**保留舊埠的放行直到新埠驗證成功**，否則同樣會鎖死自己。

### 3.4 fail2ban：可選的補充

**概念**：fail2ban 讀取日誌，發現某個 IP 在短時間內多次認證失敗，就**臨時**用防火牆規則封掉它。

**核心概念是 jail（監獄）**：一個 jail = 一份日誌 + 一套匹配規則 + 一組封禁參數。啟用的 jail 寫在 `/etc/fail2ban/jail.d/` 下的 `.conf` 或 `/etc/fail2ban/jail.local` 中。

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

- `maxretry`：允許的失敗次數；`findtime`：統計視窗；`bantime`：封禁時長。
- `backend = systemd` 適用於日誌由 systemd-journald 收集的現代發行版；如果你的發行版寫的是 `/var/log/auth.log`，需要按官方文件改用對應的 `logpath`。

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

:::warn 別把 fail2ban 當成護身符
- 它只能封**已經失敗過**的 IP，屬於**事後補救**，不阻止第一波嘗試。
- **封錯 IP 會讓你自己進不去**，`bantime` 別設得過長（比如幾個月）。
- 設定項與預設值**隨發行版和版本變化**，上面只是常見寫法，請對照你所用版本的官方文件。
- 裝了 fail2ban **不能**讓你把 `PasswordAuthentication` 重新開啟。
:::

## 四、DDoS 與濫用：你能做什麼，不能做什麼

### 4.1 為什麼遊戲服會被打

- **門檻極低**：攻擊服務按量售賣，幾美元就能發動一次。
- **動機簡單**：同行競爭、玩家報復、單純"好玩"、或者只是被掃描器順帶命中。
- **遊戲服特別脆弱**：Minecraft 是**有狀態的長連線**，一次 TCP 握手就要佔用服務端資源。同樣的頻寬打到 Web 服務上可能只是變慢，打到遊戲服上可能直接卡死或崩潰。

### 4.2 你能做的

| 手段 | 說明 |
| --- | --- |
| **上游 / 服務商防護** | 雲服務商通常提供基礎的 DDoS 清洗。**這是最有效的一層**，因為流量在到達你的機器之前就被處理了。 |
| **限速與連線數限制** | 在防火牆或反代層限制單 IP 的連線數與新建速率，能擋掉低強度的洪水。 |
| **代理轉發隱藏源站** | 讓玩家連代理，真實服務端只接受代理的連線（配合轉發金鑰）。見 [跨服端](/tutorials/java/proxy)。 |
| **白名單 / 進服審核** | 小規模服最徹底的手段：**不認識的人根本連不上**。 |
| **應用層限流** | 服務端或插件層的連線頻率限制，能減輕"進服即斷"式的騷擾。 |

### 4.3 你做不到的，以及一個常見誤區

:::warn "封掉攻擊者 IP"對流量型攻擊無效
這是最普遍的誤解。流量型攻擊（volumetric）的特徵就是：

- 源 IP **成千上萬且不斷變化**（很多來自被感染的裝置），你封不完；
- **你的防火牆在攻擊流量之後**——封包規則生效時，頻寬已經被佔滿了。鏈路堵住的那一刻，你的機器連"執行封禁規則"這件事都做不好。

**結論**：封 IP 對單個騷擾者是有效的，對流量型攻擊基本無效。**只有上游清洗能解決**，這也意味著：**選購服務時要看清服務商的 DDoS 防護條款**，而不是等被打的那天再想辦法。
:::

:::note 被打時先做什麼
1. **確認是不是真的攻擊**：看頻寬曲線、連線數、CPU，區分"被打"和"自己的 bug 導致死迴圈"。
2. **聯絡服務商**：說明情況，詢問是否觸發清洗、是否需要換 IP。
3. **保命優先**：必要時臨時白名單，先讓伺服器活著。
4. **留證據**：儲存日誌和流量圖，便於向服務商申訴。
:::

## 五、金鑰與憑據衛生

服務端目錄裡躺著大量敏感資訊：`server.properties` 裡的 RCON 口令、資料庫密碼、面板帳號、雲服務商的 API Key。

| 規則 | 做法 |
| --- | --- |
| **絕不提交到 Git** | 含口令的配置、`.env`、金鑰檔案一律進 `.gitignore`。**提交過一次就等於永久洩露**，歷史記錄裡還在。 |
| **憑據檔案權限收緊** | `chmod 600`（只有屬主可讀寫），必要時 `chmod 640`（屬主讀寫、同組只讀）。 |
| **用環境檔案而不是硬編碼** | 把敏感值放進 `.env` 之類的檔案，程式碼只讀環境變數。 |
| **洩露了就換，不要"刪掉了事"** | 刪掉檔案**不會**讓已經洩露的口令失效。**必須去對應服務上重新生成 / 吊銷。** |

```bash
# 凭据文件只给属主读写
chmod 600 /opt/mcserver/survival/.env

# 确认权限
ls -l /opt/mcserver/survival/.env
# 期望输出形如：-rw------- 1 mcserver mcserver ... .env
```

:::warn 口令洩露後的處理順序
1. **立刻輪換**：在對應服務上重置口令 / 吊銷金鑰（這一步才是真正止血）。
2. **查影響範圍**：看日誌，確認有沒有被使用過。
3. **清理歷史**：從 Git 歷史中移除（`git filter-repo` 等工具），但**不要指望它能補救已經洩露的值**。
4. **復盤**：為什麼會被提交？加 `.gitignore`、加提交前檢查。
:::

資料庫口令還應遵循：**每個服務用獨立帳號**（不要全用 `root`）、**只授權需要的庫**、**限制來源為主機本地或內網**。

## 六、監控：怎麼發現有人在試探你

**你不需要 7x24 盯著螢幕**，但需要知道"哪裡能看出異常"。

### 6.1 該看什麼

| 位置 | 能看出什麼 |
| --- | --- |
| `/var/log/auth.log`（Debian / Ubuntu） | SSH 登入成功與失敗記錄 |
| `/var/log/secure`（RHEL 系） | 同上 |
| `journalctl -u ssh` | 由 systemd 收集的 SSH 日誌 |
| `sudo fail2ban-client status sshd` | 當前被封禁的 IP 數與列表 |
| `sudo lastb` | 失敗的登入嘗試（**需要 root，且部分系統預設不記錄**） |
| `ss -tlnp` | 當前監聽中的埠，用於發現意外暴露的服務 |

```bash
# 看最近的 SSH 失败情况（Debian / Ubuntu）
sudo grep 'Failed password' /var/log/auth.log | tail -n 20

# 统计失败次数最多的来源 IP
sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head

# 看谁在监听端口
sudo ss -tlnp
```

### 6.2 什麼算異常

- **短時間內大量 `Failed password`**：典型的爆破。
- **成功登入但你不知情的時間 / 來源 IP**：**這是最危險的訊號**，說明憑據可能已經洩露。
- **出現你沒建立過的使用者**：可能已經被建立了後門帳號。
- **陌生的監聽埠**：可能被裝了挖礦程式或後門。
- **CPU / 頻寬在你沒有玩家時異常高**：可能在被當作攻擊源。

:::tip 讓日誌替你值班
如果不想天天翻日誌，用 `logwatch`、`journalctl` 的定時摘要，或者乾脆給關鍵事件配告警。**關鍵是"有人會看"**——沒人看的日誌等於沒有日誌。
:::

## 七、上線前檢查清單

- [ ] 雲安全組與主機防火牆**兩層都已配置**，入站預設拒絕
- [ ] 只放行了實際需要的埠（Java `TCP 25565`、基岩 / Geyser `UDP 19132`）
- [ ] `enable-rcon` 保持 `false`，或 RCON 僅監聽 `127.0.0.1`
- [ ] 資料庫、面板埠**未對公網開放**
- [ ] SSH 已配置金鑰登入，`PasswordAuthentication no`、`PermitRootLogin no` 已生效（用 `sshd -T` 確認）
- [ ] SSH 已限制來源 IP，或至少有 fail2ban 兜底
- [ ] 含口令的檔案權限為 `600`，且**不在 Git 倉庫裡**
- [ ] `online-mode` 保持 `true`（除非明確知道離線模式的代價）
- [ ] 已瞭解服務商的 DDoS 防護條款，知道被打時找誰
- [ ] 已用**外部機器**驗證過埠可達性

## 下一步

- 系統內部的加固（帳號、權限、systemd）：見 [系統安全加固](/tutorials/ops/system-security)
- 服務端與插件的安全配置：見 [[JAVA] 安全插件](/tutorials/ops/security-java) 與 [[BE] 安全插件](/tutorials/ops/security-be)
- 防破壞與記錄：見 [反作弊與防破壞](/tutorials/java/anticheat)
- 資料最後防線：見 [備份與恢復](/tutorials/java/backup)

---

> 命令與配置以各軟體官方文件為準。不同發行版的軟體包名、服務名與設定項預設值可能存在差異，請以你係統上的實際輸出為準。
