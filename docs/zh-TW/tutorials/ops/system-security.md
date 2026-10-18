---
title: 系統安全加固
slug: system-security
cat: ops
level: 3
order: 6
minutes: 16
tags: [hardening, permissions, systemd, updates, backups, audit, ops]
updated: 2026-10-04
draft: false
---

[網路安全基礎](/tutorials/ops/network-security) 解決的是"外面的人能不能進來"。這一篇解決另一個方向的問題：**假設有人已經進來了（或者你就是操作失誤了），這台機器能扛住多少。**

系統加固的目標不是"絕對安全"——那不存在——而是**縮小權限、減少入口、留下痕跡**，讓一次失誤不至於變成整台機器淪陷。

## 一、帳號與權限

### 1.1 為什麼絕對不要用 root 跑服務端

| 用 root 跑的風險 | 具體後果 |
| --- | --- |
| **漏洞直接等於整機淪陷** | 服務端、插件、模組的漏洞被利用後，攻擊者繼承的是 root 權限，可以改系統檔案、裝後門、刪光資料 |
| **插件是第三方程式碼** | 你從論壇下載的 jar 和服務端跑在同一個權限下。**以 root 執行意味著你把整台機器交給了一個陌生作者。** |
| **誤操作無法挽回** | 一個寫錯路徑的刪除指令，以普通使用者執行最多毀掉服務端目錄；以 root 執行可能毀掉整個系統 |
| **檔案屬主混亂** | root 建立的 `world/`、日誌、設定檔，普通使用者改不動，之後每次維護都要 `sudo`，最終養成"什麼都用 root"的壞習慣 |

:::warn 面板以 root 執行不代表服務端也該以 root 執行
很多面板為了管理方便以高權限執行，並替你啟動服務端。**這屬於面板的信任邊界問題，不能作為"服務端就該用 root"的理由。** 如果面板支援指定執行使用者，請指定專用使用者。
:::

### 1.2 建立專用系統使用者

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
```

| 參數 | 作用 |
| --- | --- |
| `-r` | 建立**系統使用者**（UID 從系統保留區間分配，通常不建立密碼、不過期） |
| `-m` | 同時建立家目錄（`-r` 預設**不**建立，必須顯式指定） |
| `-d /opt/mcserver` | 指定家目錄為 `/opt/mcserver` |
| `mcserver` | 使用者名 |

**建立目錄並把屬主交給它**：

```bash
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo chmod 750 /opt/mcserver
```

`chown -R` 把目錄及**已有內容**的屬主與屬組一併改成 `mcserver`（只在需要遞迴時用 `-R`）；`chmod 750` 讓屬主可讀寫執行、同組可讀執行、其他人無權限。用 `id mcserver` 與 `ls -ld /opt/mcserver` 確認使用者與目錄屬主。

:::tip 讓專用使用者無法登入
如果這個帳號只用來跑服務，不需要互動式登入，可以禁止它的 shell：

```bash
sudo usermod -s /usr/sbin/nologin mcserver
```

**注意**：`nologin` 會阻止 `sudo -iu mcserver` 這類切換方式。如果你還需要切進去維護，可以改用 `/bin/bash` 並靠金鑰與權限控制，或者在需要時臨時改回。**系統上 `nologin` 的路徑可能是 `/usr/sbin/nologin` 或 `/sbin/nologin`，先確認再改。**
:::

### 1.3 有意識地使用 sudo

`sudo` 的價值在於**每次提權都留痕**（寫入系統日誌），並且可以精確到"某個使用者只能執行某幾條指令"。

- **不要 `sudo su -` 然後一直待在裡面**。這會丟掉"哪條指令是誰在什麼時候跑的"這一層記錄。
- **按需提權**：單條指令用 `sudo 命令`，不要整段會話都在 root 下。
- **用 `visudo` 編輯 sudoers**。它會做語法檢查；直接改 `/etc/sudoers` 寫錯一個字元就可能讓所有人都無法提權。

```bash
sudo visudo
```

**推薦的做法**：不直接改 `/etc/sudoers` 主檔案，而是在 `/etc/sudoers.d/` 下放獨立片段，並用 `sudo visudo -f /etc/sudoers.d/mcadmin` 編輯以獲得語法檢查。片段裡可以精確到指令，例如只允許某個管理員重啟服務端：

```
mcadmin ALL=(root) /usr/bin/systemctl restart minecraft
mcadmin ALL=(root) /usr/bin/systemctl status minecraft
```

**審計誰有 sudo 權限**：

```bash
getent group sudo    # Debian / Ubuntu 的 sudo 组
getent group wheel   # RHEL 系的 wheel 组
sudo grep -rHv '^#\|^$' /etc/sudoers /etc/sudoers.d/
```

:::warn 定期複查，而不是配完就忘
**離職的管理、臨時幫忙的朋友、早期測試時加的帳號**，都會長期留在 sudo 組裡。建議每隔一段時間複查一次，把不再需要的人移除（`sudo deluser USERNAME sudo` 或 `sudo gpasswd -d USERNAME wheel`）。
:::

### 1.4 停用不需要的帳號

- **檢查所有可登入帳號**（能拿到 shell 的帳號才是真正的入口）：

```bash
awk -F: '$7 !~ /(nologin|false)$/ {print $1, $3, $7}' /etc/passwd
```

- **鎖定不再需要的帳號**：

```bash
sudo usermod -L USERNAME          # 锁定密码
sudo usermod -s /usr/sbin/nologin USERNAME   # 同时禁止登录
```

- **重點排查**：`/etc/passwd` 裡 UID 為 `0` 的帳號**只能有 `root` 一個**。多出來的就是後門：

```bash
awk -F: '$3 == 0 {print $1}' /etc/passwd
```

## 二、檔案權限：最小權限落到目錄上

### 2.1 先理解權限位

`ls -l` 輸出的第一列，如 `-rwxr-x---`，分成三組：**屬主 / 屬組 / 其他人**，每組三位（讀 `r`=4、寫 `w`=2、執行 `x`=1）。

| 權限 | 數字 | 適用 |
| --- | --- | --- |
| `rwx------` | `700` | 只有屬主可用的私有目錄 |
| `rwxr-x---` | `750` | 服務端根目錄：屬主可寫，同組可進入，其他人完全不可見 |
| `rw-r-----` | `640` | 屬主讀寫、同組只讀的設定檔 |
| `rw-------` | `600` | **含口令的檔案**，只有屬主能看 |
| `rwxrwxrwx` | `777` | **任何時候都不要** |

### 2.2 為什麼 `777` 是危險的

`chmod -R 777` 是網上流傳最廣的"萬能解法"——遇到 `Permission denied` 就 777。它的實際含義是：**系統上任何一個使用者、任何一個被攻陷的服務行程，都可以讀取、修改、刪除這個目錄裡的一切。**

| 後果 | 說明 |
| --- | --- |
| **任何本地帳號都能改服務端** | 一個被攻陷的低權限服務（比如某個 Web 應用）可以直接往 `plugins/` 裡塞一個後門 jar，等下次重啟就生效 |
| **口令檔案對所有人可見** | `server.properties` 裡的 RCON 口令、`.env` 裡的資料庫密碼一覽無餘 |
| **存檔可被任意破壞** | 任何行程都能刪除 `world/` |
| **掩蓋真正的問題** | 權限報錯的根因通常是"屬主錯了"，`777` 只是把症狀蓋住，問題還在 |

:::warn 正確的修法不是放寬權限，而是修屬主
遇到 `Permission denied`，先看**是誰在跑、要動哪個檔案**：

```bash
ls -l /opt/mcserver/survival/server.properties
```

如果屬主是 `root`，而服務以 `mcserver` 執行，正確做法是：

```bash
sudo chown mcserver:mcserver /opt/mcserver/survival/server.properties
```

**不是** `chmod 777`。**遞迴改權限（`chmod -R 777`）在伺服器上是高危操作，請勿執行。**
:::

### 2.3 服務端目錄的推薦權限

```bash
# 整个服务端目录归专用用户所有
sudo chown -R mcserver:mcserver /opt/mcserver

# 属主全权；同组只读进入；其他人无权限
sudo chmod -R u=rwX,g=rX,o= /opt/mcserver

# 目录本身不要给其他人任何权限
sudo chmod 750 /opt/mcserver
```

`u=rwX,g=rX,o=` 是**符號模式**：`X`（大寫）表示"對目錄，或對已經有執行位的檔案，才加執行權限"，比無腦 `-R 755` 更貼合"檔案不該可執行"的原則。**不要用 `chmod -R 777`，也不要在服務端目錄上使用 `o+w`（其他人可寫）。**

### 2.4 重點保護的物件

| 物件 | 為什麼 | 建議 |
| --- | --- | --- |
| `world/`、`world_nether/`、`world_the_end/` | 存檔是玩家投入的全部，被破壞就無法挽回 | 屬主 `mcserver`，其他人零權限；**定期離線備份**（見第五節） |
| `server.properties` | 含 RCON 口令、埠、`online-mode` 等關鍵開關 | `640`，屬主 `mcserver` |
| `.env`、含口令的腳本 | 資料庫口令、API Key | **`600`**，只有屬主可讀寫 |
| `ops.json`、`whitelist.json` | 決定誰能拿到管理員權限 | `640`，改動後複查內容 |
| 私鑰檔案（`id_ed25519` 等） | 洩露等於交出登入權 | **`600`**，`.ssh` 目錄 `700` |
| 備份檔案 | 往往包含完整口令與存檔 | **不要放在 Web 可訪問目錄**；異地一份 |

```bash
# 凭据文件只给属主
chmod 600 /opt/mcserver/survival/.env
ls -l /opt/mcserver/survival/.env
# 期望：-rw------- 1 mcserver mcserver ... .env
```

:::note 備份會改變權限，恢復時要還原屬主
用 `cp -a`、`tar`、`rsync -a` 之類**保留屬性**的方式備份，恢復後屬主和權限才是對的。如果只拷了內容，恢復後可能變成 root 屬主，服務端又寫不了存檔——恢復後記得用 `ls -ld` 檢查一次。
:::

## 三、系統更新

**絕大多數入侵利用的是"已經修好、但你沒打補丁"的漏洞。** 保持更新是所有加固措施裡價效比最高的一條。

### 3.1 安全更新自動化的概念

自動更新的思路是：**安全補丁自動裝，其餘更新你自己決定**。

| 發行版 | 工具 | 設定檔 |
| --- | --- | --- |
| Ubuntu / Debian | `unattended-upgrades` | `/etc/apt/apt.conf.d/20auto-upgrades`、`/etc/apt/apt.conf.d/50unattended-upgrades` |
| RHEL / Rocky / AlmaLinux / Fedora | `dnf-automatic` | `/etc/dnf/automatic.conf` |

**Ubuntu / Debian**：

```bash
sudo apt update
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

`20auto-upgrades` 的常見內容：

```ini
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

- `Update-Package-Lists "1"`：每天重新整理一次軟體包索引。
- `Unattended-Upgrade "1"`：每天自動安裝符合條件的升級（**預設只包含安全更新**，具體範圍由 `50unattended-upgrades` 裡的 `Unattended-Upgrade::Allowed-Origins` 決定）。

**RHEL 系**：

```bash
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer
```

`/etc/dnf/automatic.conf` 中與"只裝安全更新、自動應用"相關的常見設定：

```ini
[commands]
upgrade_type = security
apply_updates = yes
```

**驗證是否在執行**：`systemctl status unattended-upgrades`（Debian / Ubuntu）或 `systemctl status dnf-automatic.timer`（RHEL 系）。

:::warn 具體設定項與預設值隨版本變化
上面只是常見寫法。**不同發行版、不同版本裡設定檔名、選項名與預設範圍都可能不同**（例如"是否包含非安全更新""是否自動清理舊核心"）。改之前請對照你所使用版本的官方文件，並用 `systemctl status` 確認服務真的在跑。**配置了不等於生效了。**
:::

### 3.2 不要盲目自動重啟

自動更新**安裝**補丁和**重啟**是兩件事。核心、glibc、systemd 這類元件的更新**只有重啟後才真正生效**。**不要開無條件自動重啟**，原因是：

- **遊戲服有玩家**。半夜重啟會讓正在玩的玩家掉線，可能丟進度，也可能觸發存檔問題。
- **重啟失敗等於長時間當機**。如果新核心與你的驅動或環境不相容，機器起不來，而你可能第二天才發現。
- **重啟後服務端不一定自己起來**。這取決於服務是否 `enable`（見第四節）。

**推薦做法**：

| 做法 | 說明 |
| --- | --- |
| **維護視窗** | 固定一個玩家最少的時間段（比如週二凌晨），提前公告，手動重啟 |
| **先通知再重啟** | 用服務端指令廣播倒計時，讓玩家安全下線 |
| **保留舊核心** | 不要自動刪除舊核心，出問題時可以回退 |
| **重啟後立即驗證** | 服務是否在跑、埠是否可達、日誌有無異常 |

用 `[ -f /var/run/reboot-required ] && cat /var/run/reboot-required`（Debian / Ubuntu）或 `sudo dnf needs-restarting -r`（RHEL 系）檢查是否在等待重啟。

:::tip 先重啟一次，確認它能自己起來
在**沒有玩家**的時候手動重啟一次機器，驗證"服務開機自啟"確實有效。**沒驗證過的自啟等於沒有自啟。**
:::

## 四、服務加固（systemd）

### 4.1 一個基本的 unit

`/etc/systemd/system/minecraft.service`：

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
Type=simple
User=mcserver
Group=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

| 指令 | 作用 |
| --- | --- |
| `User=` / `Group=` | **以專用使用者執行**。不寫就預設以 root 執行——這是最常見的加固漏洞。 |
| `WorkingDirectory=` | 服務端的工作目錄。相對路徑（`world/`、`plugins/`）都以它為基準。 |
| `ExecStart=` | 啟動指令。**必須寫絕對路徑**，systemd 不解析 `PATH`。 |
| `Restart=on-failure` | 異常退出時重啟。正常 `stop` 不觸發。 |
| `RestartSec=10` | 重啟前等待 10 秒，避免崩潰時空轉刷屏。 |

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note 現有教學裡的 unit 使用了 screen
[環境準備](/tutorials/java/environment) 中的示例藉助 `screen` 保留控制台，便於進服敲指令。**兩種寫法都可以**；本文的示例用 `Type=simple` 直接執行 Java 行程，更適合疊加下面的加固選項。**注意：`screen` 與 `ProtectSystem=strict` 這類加固組合時，要確認 `screen` 需要的 socket 目錄可寫。**
:::

### 4.2 資源限制

限制資源既防"記憶體洩漏拖垮整機"，也防"被攻擊時把機器吃滿"。

```ini
[Service]
LimitNOFILE=65535
MemoryMax=6G
```

| 指令 | 作用 | 注意 |
| --- | --- | --- |
| `LimitNOFILE` | 可開啟的檔案描述符上限 | 玩家多、區塊載入多時，預設值可能不夠，表現為"連線被拒絕"或莫名其妙的 IO 錯誤 |
| `MemoryMax` | 該服務的**記憶體硬上限** | 超過會被核心 OOM 殺掉。**必須明顯大於 `-Xmx`**，因為 JVM 自身、元空間、執行緒棧、直接記憶體都在這之外 |

:::warn `MemoryMax` 設得比 `-Xmx` 還小是典型錯誤
`-Xmx4G` 只限制 Java 堆。一個堆上限 4G 的 Minecraft 服務端，**實際常駐記憶體可能到 5G 以上**。如果 `MemoryMax` 設成 `4G`，服務會被反覆殺掉重啟，而你從日誌裡只能看到"行程突然消失"。

**建議**：`MemoryMax` 至少留出 30% 餘量（例如 `-Xmx4G` 配 `MemoryMax=6G`），並觀察 `systemctl status` 裡的實際記憶體佔用再調整。
:::

### 4.3 限制權限與保護檔案系統

這些指令讓服務**只能碰它該碰的東西**。即使服務端或插件被攻陷，攻擊者能造成的破壞也被框住了。

```ini
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/mcserver/survival
```

| 指令 | 作用 |
| --- | --- |
| `NoNewPrivileges=yes` | 禁止行程通過 setuid / setgid 程式提權。**幾乎無副作用的加固項，建議都加上。** |
| `PrivateTmp=yes` | 給服務一份**私有的 `/tmp` 與 `/var/tmp`**，看不到也影響不到其他行程的臨時檔案 |
| `ProtectSystem=strict` | 把**整個檔案系統掛載為只讀**（`/dev`、`/proc`、`/sys` 除外）。服務只能寫 `ReadWritePaths` 裡列出的路徑 |
| `ProtectHome=yes` | 讓 `/home`、`/root`、`/run/user` 對服務**不可見**（相當於空目錄） |
| `ReadWritePaths=` | 與 `ProtectSystem=strict` 配合，**顯式列出允許寫入的路徑**。**不加這一條，服務端連存檔都寫不了。** |

:::warn 加了 `ProtectSystem=strict` 之後服務起不來，先看這裡
常見原因：

1. **忘了 `ReadWritePaths`**，或者路徑寫錯（必須是絕對路徑，且與 `WorkingDirectory` 一致）。
2. **備份腳本或插件要寫別處**（比如 `/var/log`、`/srv`），需要一併加進 `ReadWritePaths`。
3. **Java 需要寫臨時目錄**：`PrivateTmp=yes` 一般已經夠用，但如果服務端顯式配置了某個固定臨時路徑，要把它也加進去。

**排查方法**：`sudo systemctl status minecraft` 和 `sudo journalctl -u minecraft -n 100` 會直接給出"權限被拒絕"的路徑。
:::

:::note 加固選項的可用性取決於 systemd 版本
上面這些指令在較新的 systemd 上都可用，但**具體支援情況隨版本變化**。用 `systemd-analyze security minecraft.service` 可以檢視服務實際生效的沙箱設定：它給出一個"暴露程度"評分和逐項說明，比憑感覺加指令可靠得多。不同版本的評分標準與專案名可能不同，**以你係統上的實際輸出為準**。
:::

## 五、備份也是安全控制

前面幾節防的是"系統被控制"，但還有兩類威脅，**任何加固都擋不住**：

| 威脅 | 表現 |
| --- | --- |
| **勒索軟體** | 加密你能訪問到的所有檔案。**掛載在同一台機器上的備份會被一起加密。** |
| **內部破壞 / 誤操作** | 管理員或插件一條 `rm -rf`，或者惡意的"合作者"刪庫跑路 |

**結論：備份的意義不只是"防硬體故障"，它是唯一能對抗勒索與破壞的手段——前提是備份不在攻擊者能碰到的地方。**

| 原則 | 做法 |
| --- | --- |
| **離線** | 至少有一份備份在**平時不掛載、不聯網**的介質上（外接硬碟、物件儲存的快照） |
| **異地** | 本機磁碟壞了、機房出事了，本地備份一起消失 |
| **版本化** | 只留最新一份，遇到"存檔早就壞了但沒發現"就無解 |
| **權限** | 備份檔案裡通常有完整口令與存檔，**不要放在 Web 可訪問目錄**，權限按第二節收緊 |

具體操作（一致性備份、`save-off` / `save-on`、保留策略、恢復流程）見 [備份與恢復](/tutorials/java/backup)。**沒驗證過恢復的備份不算備份。**

:::warn 備份目錄不要給服務端寫權限
如果服務端行程（或它載入的插件）能寫備份目錄，那麼一個被攻陷的插件就能**刪掉或加密你的所有備份**。把備份目錄放在服務端目錄之外，並且**不授予服務帳號寫權限**。
:::

## 六、審計與日常衛生

加固不是一次性動作。下面這些檢查建議**定期跑一遍**，或者至少在你改動過系統之後跑一遍。

### 6.1 檢查清單與指令

| 檢查項 | 指令 | 期望結果 |
| --- | --- | --- |
| **監聽埠** | `sudo ss -tlnp` | 只有你知道的服務在監聽；陌生埠要查清 |
| **UDP 監聽** | `sudo ss -ulnp` | 同上（基岩版 / Geyser 用 UDP） |
| **失敗登入** | `sudo lastb \| head` | 大量記錄說明在被爆破（需要 root；部分系統預設不記錄） |
| **成功登入** | `last -n 20` | 沒有你不認識的使用者或來源 IP |
| **UID 0 帳號** | `awk -F: '$3 == 0 {print $1}' /etc/passwd` | 只有 `root` |
| **可登入帳號** | `awk -F: '$7 !~ /(nologin\|false)$/ {print $1, $7}' /etc/passwd` | 只有你認識的人 |
| **sudo 權限** | `getent group sudo` / `getent group wheel` | 沒有離職或臨時帳號 |
| **計劃任務** | `sudo crontab -l`、`ls -l /etc/cron.*`、`systemctl list-timers --all` | 沒有你沒建過的任務 |
| **systemd 單元** | `systemctl list-units --type=service --state=running` | 沒有陌生服務 |
| **未使用軟體包** | `sudo apt autoremove --dry-run` / `sudo dnf autoremove` | 確認要刪的確實是沒用的 |
| **服務沙箱評分** | `systemd-analyze security minecraft.service` | 評分越低越好，逐項看建議 |

:::warn 陌生條目要當真
- **沒建過的 cron 任務或 systemd 單元**：可能是持久化後門，也可能是某個軟體包自帶的——**先查清來源再決定刪不刪**。
- **陌生監聽埠**：先 `sudo ss -tlnp` 找到行程 PID，再 `ps -p PID -o pid,user,cmd` 看它是什麼。
- **陌生帳號**：不要直接刪，先看家目錄、`authorized_keys` 和登入記錄，判斷是不是已經被用了。
:::

### 6.2 最小化安裝面

**裝的軟體越少，可能被利用的漏洞就越少。**

- **不裝桌面環境**。雲伺服器上裝桌面會帶來大量不必要的服務與埠（見 [作業系統的選擇](/tutorials/java/os)）。
- **不裝用不到的服務**：FTP、Samba、列印服務、資料庫（如果服務端用不到）。
- **確認服務狀態**：不需要的服務應該 `disable` 且 `stop`，而不是"裝著但沒啟動"——它可能被依賴鏈拉起來。用 `systemctl is-enabled <service-name>` 檢視，用 `sudo systemctl disable --now <service-name>` 停用。

### 6.3 一頁速查

- [ ] 服務端以**專用使用者**執行，不以 root（用 `ps -o user,cmd -C java` 或 `systemctl status` 確認）
- [ ] 服務端目錄屬主正確，**沒有 777**
- [ ] 含口令的檔案權限為 **600**，且不在 Web 目錄、不在 Git 倉庫裡
- [ ] 自動安全更新已啟用並**確認在執行**；**沒有**開啟無條件自動重啟
- [ ] systemd unit 設定了 `User=`、`WorkingDirectory=`、`Restart=`
- [ ] 已配置 `LimitNOFILE`，且 `MemoryMax` **明顯大於** `-Xmx`
- [ ] 已按需啟用 `NoNewPrivileges`、`PrivateTmp`、`ProtectSystem`、`ReadWritePaths`
- [ ] 重啟過一次機器，確認**服務能開機自啟**
- [ ] 有**離線 / 異地**備份，且服務帳號**無法寫**備份目錄
- [ ] 已把上面的審計指令排進定期複查

## 下一步

- 網路層面的防護（埠、防火牆、SSH）：見 [網路安全基礎](/tutorials/ops/network-security)
- 備份與恢復的具體操作：見 [備份與恢復](/tutorials/java/backup)
- 服務端與插件的安全配置：見 [[JAVA] 安全插件](/tutorials/ops/security-java) 與 [[BE] 安全插件](/tutorials/ops/security-be)
- 防破壞與記錄：見 [反作弊與防破壞](/tutorials/java/anticheat)

---

> 指令與配置以各軟體官方文件為準。不同發行版的軟體包名、服務名、systemd 版本與設定項預設值可能存在差異，請以你係統上的實際輸出為準。
