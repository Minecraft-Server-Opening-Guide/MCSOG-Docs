---
title: 日誌管理與輪轉
slug: logs
cat: ops
level: 3
order: 18
minutes: 14
tags: [日誌, logrotate, journald, Docker, 磁碟空間, syslog, 維護, 排錯]
updated: 2026-10-04
draft: false
---

**日誌是排查問題的唯一證據，也是把伺服器寫滿磁碟的頭號嫌疑人。** 服務端、插件、代理、面板、systemd、Docker、nginx 都會往磁碟上寫字，而它們預設幾乎都不設上限。這一篇講清楚：日誌都在哪、怎麼先量再治、logrotate 的正確寫法、journald 與 Docker 的容量限制，以及一套可以照著做的維護清單。

排查具體故障時怎麼讀日誌，見 [監控與告警](/tutorials/ops/monitoring)；把日誌和存檔一起送出機房，見 [異地備份](/tutorials/ops/offsite-backup)。

## 1. 一台 Minecraft 主機上到底有哪些日誌

先把"日誌"這個詞拆開。絕大多數"磁碟莫名其妙滿了"的事故，元兇並不在 `logs/latest.log`。

| 來源 | 典型路徑 | 說明 |
| --- | --- | --- |
| 服務端主日誌 | `logs/latest.log` | 當前正在寫的日誌，UTF-8，Linux 下 LF 行尾、Windows 下 CRLF |
| 服務端歷史日誌 | `logs/YYYY-MM-DD-N.log.gz` | 核心自己輪轉出來的舊日誌，gzip 壓縮 |
| 崩潰報告 | `crash-reports/crash-YYYY-MM-DD_HH.MM.SS-server.txt` | 一次崩潰一個檔案，堆疊很長，單個幾百 KB 到幾 MB |
| 插件日誌 | `plugins/<插件>/logs/*.log`、`plugins/<插件>/*.log` | **位置因插件而異**，有的寫在插件目錄，有的直接寫進服務端 `logs/` |
| 代理端日誌 | `<代理目录>/logs/latest.log` | Velocity / BungeeCord 有自己獨立的工作目錄與 `logs/` |
| systemd 單元日誌 | `journalctl -u minecraft.service` | 用 systemd 託管時，stdout/stderr 預設進 journal |
| 系統日誌 | `/var/log/syslog`、`/var/log/messages`、`/var/log/kern.log` | 發行版不同名字不同 |
| 登入與安全日誌 | `/var/log/auth.log`（Debian 系）、`/var/log/secure`（RHEL 系） | SSH 爆破痕跡都在這裡，公網機器會長得很快 |
| nginx 日誌 | `/var/log/nginx/access.log`、`error.log` | 面板、地圖、網頁代理走 nginx 時必然有 |
| 面板日誌 | 面板自己的目錄 | MCSManager、Pterodactyl 等面板各自寫日誌，還常常寫資料庫 |
| Docker 日誌 | `/var/lib/docker/containers/<容器ID>/<容器ID>-json.log` | 預設 `json-file` 驅動，**預設不輪轉** |
| JVM 側檔案 | `logs/gc.log`、`hs_err_pid<pid>.log`、`*.jfr` | 開了 GC 日誌、JFR 或 JVM 崩潰時產生，容易被忘記 |

:::note 別忘了 JVM 自己寫的東西
`-Xlog:gc*:file=logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M` 這類啟動參數會在 `logs/` 裡再放一份 GC 日誌；JVM 崩潰時還會在工作目錄丟下 `hs_err_pid<pid>.log`。它們不在 Minecraft 的輪轉體系裡，要單獨處理。
:::

## 2. 日誌為什麼能把伺服器寫死

日誌增長有三種典型形態，第三種最危險：

1. **正常增長**：玩家進進出出、插件按天寫記錄，慢慢變大。
2. **突發增長**：公網機器被掃描、被壓測、被刷連線，每個連線都可能寫一行。
3. **迴圈刷屏**：某個插件在 `onTick` 裡拋異常，或者某個任務每秒失敗一次——**每秒 20 行**，一天就是約 170 萬行，按每行 150 位元組算，**約 250 MB/天**，而且它不會自己停。

磁碟寫滿不是"日誌大了點"這麼簡單，它會連帶摧毀別的東西：

:::warn 磁碟寫滿的症狀：存檔、插件、面板一起出事
- **存檔儲存失敗**：日誌裡出現 `Failed to save chunk`、`java.io.IOException: No space left on device`，玩家掉線、區塊回滾。
- **插件寫配置/資料庫失敗**：SQLite 報 `database or disk is full`，MySQL 報 `Disk full`，權限組、經濟、領地資料可能半寫壞。
- **服務端在最糟的時刻死掉**：關服時 `level.dat` 寫不進去，或者行程直接崩，重啟後世界狀態與最後一次成功儲存之間出現斷層。
- **面板和 SSH 一起失靈**：面板寫不了日誌和 session，你連"上去看看"的入口都沒有。
- **inode 也可能被吃光**：`df -h` 顯示還有空間，但 `df -i` 已經 100%，表現和磁碟滿一樣。
:::

:::tip 日誌目錄和存檔目錄儘量不要放在同一個分區
如果條件允許，把 `logs/`（或整個日誌掛載點）放到獨立分區或獨立盤上。這樣即使日誌失控，存檔仍然寫得進去，最壞情況只是丟日誌而不是丟存檔。
:::

## 3. 先量後治：四條指令看清現狀

動手之前先測量。以下指令都只讀，不會破壞任何東西。

```bash
# 1) 服务端日志目录有多大
du -sh /opt/minecraft/server/logs

# 2) 磁盘还剩多少空间、还剩多少 inode
df -h
df -i

# 3) journald 占了多少（用 systemd 托管时必看）
journalctl --disk-usage

# 4) 找出所有超过 100 MB 的日志类文件
find /opt/minecraft/server -type f -name '*.log*' -size +100M

# 补充：整机上哪个目录最占地
sudo du -x -h -d 1 /var | sort -h | tail -n 10
```

讀結果時注意三件事：

- `du -sh` 看的是**當前佔用**，`find ... -size +100M` 找的是**單個大檔案**，兩者結合才能區分"很多小檔案"和"一個怪物檔案"。
- `df -i` 的 `IUse%` 到 100% 時，即使 `df -h` 顯示有剩餘空間，服務端一樣寫不進任何東西。
- `journalctl --disk-usage` 的輸出是 journal 目錄的實際佔用；它不受 `du -sh logs/` 影響，很容易被漏掉。

## 4. Minecraft 自己的日誌保留策略

服務端核心自己會做一層輪轉：當前的 `latest.log` 被滾成帶日期的 `YYYY-MM-DD-N.log.gz`，`N` 是當天的序號。

**保留多少份、以及能不能配置，完全取決於核心。** 有的核心只留最近若干份且不提供開關，有的核心在設定檔裡給了鍵值，鍵名和預設值各不相同。這裡不做猜測：**請以你所使用核心的官方文件與設定檔為準**，在核心目錄裡搜 `log` 相關設定項，或者直接查核心文件的"日誌"章節。

如果核心不提供保留數量設定，就把它交給系統層的 logrotate 或清理腳本（下面幾節）。另外注意：`crash-reports/` 裡的崩潰報告**不參與**核心的日誌輪轉，崩潰迴圈時會無限堆積。

## 5. 用 logrotate 管住 logs/

logrotate 是 Linux 上管理日誌輪轉的標準工具，幾乎所有發行版都預裝了它，並且預設通過 `logrotate.timer`（或 cron）每天執行一次。配置放在 `/etc/logrotate.d/` 下的一個檔案裡。

### 5.1 完整的示例配置

```conf
# /etc/logrotate.d/minecraft
# 注意：本文件不能是 group 或 world 可写，否则 logrotate 出于安全会拒绝加载。

/opt/minecraft/server/logs/latest.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su minecraft minecraft
}

# 可选：插件自己写的日志，路径按实际情况调整
/opt/minecraft/server/plugins/*/logs/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

把 `/opt/minecraft/server` 和 `minecraft` 換成你機器上的真實路徑與使用者名。第二個塊裡的萬用字元是安全的：輪轉後的檔案會變成 `*.log.1` 或 `*.log.1.gz`，不會再被 `*.log` 匹配到。

### 5.2 每條指令在做什麼

| 指令 | 作用 |
| --- | --- |
| `daily` | 每天輪轉一次（前提是 logrotate 本身每天被觸發，發行版預設如此） |
| `rotate 14` | 保留 14 份歷史，第 15 份（最舊的）被刪除 |
| `compress` | 歷史檔案用 gzip 壓縮，通常能省下 90% 以上的空間 |
| `delaycompress` | 剛輪轉出來的那一份**先不壓縮**，等下一次輪轉時再壓 |
| `missingok` | 檔案不存在時不報錯（服務端還沒啟動、或換了目錄時很有用） |
| `notifempty` | 檔案為空時不輪轉，避免製造一堆空歸檔 |
| `copytruncate` | **先複製、再把原檔案原地清空**，而不是把檔案改名 |
| `su minecraft minecraft` | 以指定使用者/組身份執行輪轉；當日誌目錄屬於服務端使用者時推薦加上 |

### 5.3 為什麼 copytruncate 對執行中的服務端很重要

預設的輪轉方式是 **rename**：logrotate 把 `latest.log` 改名成 `latest.log.1`，然後（按 `create` 指令）新建一個空的 `latest.log`。問題在於 **Java 行程在啟動時已經拿到了那個檔案的控制代碼**：改名之後，服務端仍然往"已經被改名的那個檔案"裡寫，新的 `latest.log` 永遠是空的，日誌看起來"消失"了，直到服務端重啟。

`copytruncate` 換了一種做法：**先複製一份內容，再把原檔案截斷為 0 位元組**。inode 沒變，服務端繼續往同一個檔案控制代碼寫，新日誌自然出現在 `latest.log` 裡，不需要重啟服務端。

它的代價必須說清楚：

- 在"複製完成"和"截斷"之間存在一個極短的時間窗，**這期間新寫入的少量日誌會丟失**（通常只有幾行）。
- 因此 `copytruncate` 與 `create` 互斥（原檔案不動，所以沒有新建動作）。
- 如果日誌重要到一行都不能丟，正確做法是讓服務端自己重開日誌檔案（多數核心沒有這個訊號介面），或者接受這幾行的損失——對 Minecraft 服務端來說，這幾行通常可以接受。

:::tip 順帶一提：delaycompress 是為了配合 copytruncate
有些程式在輪轉後的一小段時間裡仍然持有舊檔案控制代碼並繼續寫入。`delaycompress` 讓剛輪轉出來的 `latest.log.1` 保持未壓縮狀態，避免"邊寫邊壓"導致歸檔損壞，下一次輪轉再壓。
:::

### 5.4 驗證與排錯

改完配置後**先幹跑，不要直接等第二天**：

```bash
# 干跑：只打印将要做什么，不实际改动文件
sudo logrotate -d /etc/logrotate.d/minecraft

# 确认无误后强制跑一次，立刻验证结果
sudo logrotate -f /etc/logrotate.d/minecraft

# 看结果：应出现 latest.log 与 latest.log.1（或 .1.gz）
ls -lh /opt/minecraft/server/logs
```

常見坑：

- **配置沒生效**：確認系統裡跑的是 `logrotate.timer`，用 `systemctl list-timers logrotate.timer` 檢查。
- **報權限錯誤**：`/etc/logrotate.d/minecraft` 不能是 group/world 可寫；日誌目錄要能被 `su` 指定的使用者寫入。
- **`/etc` 或 `/usr` 下的日誌轉不動**：發行版的 `logrotate.service` 預設帶 `ProtectSystem=full`，會阻止修改這兩個目錄下的檔案——所以服務端和日誌放在 `/opt`、`/srv` 這類位置更省事。
- **檔案還在變大卻沒輪轉**：`notifempty` 不會阻止有內容的檔案輪轉，但如果 `daily` 生效前提是"上次輪轉時間"，用 `-d` 的輸出能看到判定邏輯。

## 6. systemd 與 journald 的容量上限

用 systemd 託管服務端時，stdout/stderr 預設被 journald 收走。journald 有全域上限，配置在 `/etc/systemd/journald.conf`：

```ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1month
```

| 設定項 | 含義 |
| --- | --- |
| `Storage=` | `persistent` 落盤到 `/var/log/journal`，`volatile` 只在記憶體，`auto` 看目錄是否存在，`none` 不儲存 |
| `SystemMaxUse=` | journal 在磁碟上最多佔多少（預設約為檔案系統的 10%，上限 4G） |
| `SystemMaxFileSize=` | 單個 journal 檔案的上限（預設約為 `SystemMaxUse` 的 1/8，上限 128M） |
| `MaxRetentionSec=` | 條目最長保留多久，`0` 表示關閉時間維度的刪除 |
| `SystemKeepFree=` | 至少給別的用途留出多少空間；journald 取它與 `SystemMaxUse` 中更嚴格的一個 |

改完要重啟服務並手工回收一次：

```bash
sudo systemctl restart systemd-journald

# 看当前占用
journalctl --disk-usage

# 手工回收（三选一，也可组合）
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-files=20
```

:::warn journald 只刪"已歸檔"的檔案
`--vacuum-*` 和 `SystemMaxUse=` 都只刪除**已歸檔**的 journal 檔案，當前正在寫的活動檔案不會被刪。所以回收後佔用**可能仍然略高於你設定的上限**，這是正常現象，不是配置沒生效。
:::

## 7. Docker 容器日誌輪轉

Docker 預設的 `json-file` 驅動**不做任何輪轉**：容器跑得越久，`/var/lib/docker/containers/<ID>/<ID>-json.log` 越大，而且它是被 Docker 守護行程持有的檔案控制代碼，直接 `rm` 不會立刻釋放空間。

單個容器啟動時限制：

```bash
docker run -d --name mc \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  your-minecraft-image
```

守護行程級別的預設值，寫進 `/etc/docker/daemon.json`：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

改完需要重啟守護行程，並且**已經存在的容器要重建才會生效**：

```bash
sudo systemctl restart docker

# 查看某个容器当前的日志配置与日志文件路径
docker inspect --format='{{.HostConfig.LogConfig}}' mc
docker inspect --format='{{.LogPath}}' mc

# 紧急情况下先截断再慢慢排查（对运行中的容器也有效）
sudo truncate -s 0 "$(docker inspect --format='{{.LogPath}}' mc)"

# 日常看日志
docker logs --tail 200 -f mc
docker system df
```

用 Docker Compose 時寫在服務下：

```yaml
services:
  mc:
    image: your-minecraft-image
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## 8. nginx、面板與代理的日誌

- **nginx**：`/var/log/nginx/access.log` 與 `error.log`。發行版的 nginx 包**自帶** logrotate 配置，通常已經輪轉；如果面板被公網掃描，`access.log` 會異常膨脹，可以考慮把靜態資源關掉訪問日誌，或單獨為面板網站指定日誌檔案並加 `maxsize 200M`。
- **面板**：面板自己的日誌目錄 + 資料庫。面板日誌通常不在你的 `logs/` 裡，別以為清了 `logs/` 就萬事大吉。
- **代理端**：Velocity / BungeeCord 各有獨立工作目錄與 `logs/`，需要**單獨**加一份 logrotate 塊或清理規則。
- **反代與面板的訪問日誌裡含有玩家 IP**：這類日誌在集中化和外發時要按隱私資料處理，參考 [系統安全](/tutorials/ops/system-security)。

## 9. 把日誌集中到一處（可選）

單機排查夠用，但機器一多、或者想要"機器掛了日誌還在"，就需要集中化。

**方式 A：rsyslog 轉發**（傳統 syslog 體系，簡單直接）

```conf
# /etc/rsyslog.d/50-forward.conf
# @@ 表示 TCP，@ 表示 UDP；生产环境用 TCP
*.* @@10.0.0.5:514
```

接收端也要跑 rsyslog（並允許來自該主機的連線）。日誌裡有玩家名、IP 和可能的聊天內容，**只在可信網路裡轉發，或加 TLS/RELP**。

**方式 B：journald 轉發**（systemd 體系）

```ini
# /etc/systemd/journald.conf
[Journal]
ForwardToSyslog=yes
ForwardToSocket=10.0.0.5:4444
```

接收端用 `systemd-journal-remote` 收取。注意官方文件的提醒：**轉發是同步進行的**，接收端慢會拖住 journald，進而拖住寫日誌的服務——正式環境慎用 `ForwardToConsole=`，同理也要評估 `ForwardToSocket=`。

**方式 C：定期搬運**（最省事，也最不容易出事）

把 `logs/`、`crash-reports/` 用 `rsync` / `rclone` 每天同步到另一台機器或物件儲存，保留若干天。它不即時，但不需要常駐服務，也不會影響服務端效能，具體做法見 [異地備份](/tutorials/ops/offsite-backup)。

## 10. 高效檢索日誌

日誌動輒幾個 GB，檢索策略比指令本身更重要：**先用時間範圍或檔名把範圍縮小，再做文本匹配。**

| 目的 | 指令 |
| --- | --- |
| 即時跟蹤當前日誌 | `tail -f logs/latest.log` |
| 看最後 200 行 | `tail -n 200 logs/latest.log` |
| 帶行號找異常 | `grep -n "Exception" logs/latest.log` |
| 統計出現次數 | `grep -c "OutOfMemoryError" logs/latest.log` |
| 在壓縮日誌裡搜 | `zgrep -n "Exception" logs/2026-10-01-1.log.gz` |
| 跨所有歷史日誌搜 | `zgrep -c "Exception" logs/*.log.gz` |
| 按時間範圍查單元日誌 | `journalctl -u minecraft.service --since "2026-10-01" --until "2026-10-02"` |
| 只看警告及以上 | `journalctl -u minecraft.service -p warning -n 100 --no-pager` |
| 即時跟隨單元 | `journalctl -u minecraft.service -f` |
| 內容過濾（systemd 237+） | `journalctl -u minecraft.service -g "Exception" --since today` |
| 看上一次開機的日誌 | `journalctl -b -1` |

幾個實戰習慣：

- **別在 5 GB 的 `latest.log` 上直接 `grep`**：先 `tail -n 5000` 或按日期挑 `*.log.gz`，速度差一個數量級。
- `zgrep` 直接讀 `.gz`，不要先 `gunzip`——解壓出來的檔案會再佔一份磁碟，在磁碟已經告急時尤其危險。
- 用 `journalctl -o short-iso` 讓時間戳帶時區，跨機器比對時不會算錯。
- 定位到某個插件的刷屏後，**先處理根因**（關掉除錯、升級插件、臨時停用），再清日誌，否則清完還會長回來。

## 11. 清理腳本與定時任務

logrotate 管的是"輪轉"，還需要一個腳本處理它管不到的東西：核心自己輪轉出的 `.log.gz`、堆積的崩潰報告、以及體積告警。

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-log-cleanup.sh
set -euo pipefail

SERVER_DIR="/opt/minecraft/server"
LOG_DIR="$SERVER_DIR/logs"
CRASH_DIR="$SERVER_DIR/crash-reports"

# 1) 删除核心自己轮转出来的、超过 30 天的压缩日志
find "$LOG_DIR" -type f -name '*.log.gz' -mtime +30 -delete

# 2) 崩溃报告只保留最新的 20 份
if [ -d "$CRASH_DIR" ]; then
    ls -1t "$CRASH_DIR"/crash-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f
fi

# 3) 把仍然超过 100 MB 的日志列出来，交给人工确认
find "$SERVER_DIR" -type f -name '*.log*' -size +100M -exec ls -lh {} +
```

```bash
chmod +x /usr/local/bin/mc-log-cleanup.sh
```

**用 cron 定時（每天 04:15）：**

```bash
# crontab -e  （或用 /etc/cron.d/mc-log-cleanup，注意后者需要写用户名）
15 4 * * * /usr/local/bin/mc-log-cleanup.sh >> /var/log/mc-log-cleanup.log 2>&1
```

**用 systemd timer 定時（推薦，有日誌、可查狀態、錯過的執行可補跑）：**

```ini
# /etc/systemd/system/mc-log-cleanup.service
[Unit]
Description=Clean up Minecraft server logs

[Service]
Type=oneshot
User=minecraft
Group=minecraft
ExecStart=/usr/local/bin/mc-log-cleanup.sh
```

```ini
# /etc/systemd/system/mc-log-cleanup.timer
[Unit]
Description=Run Minecraft log cleanup daily

[Timer]
OnCalendar=*-*-* 04:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mc-log-cleanup.timer
systemctl list-timers mc-log-cleanup.timer
journalctl -u mc-log-cleanup.service -n 50 --no-pager
```

:::tip 清理腳本要"先刪自己生成的，再報警"
腳本不要一上來就 `rm -rf logs/*`：那是把證據一起刪掉。正確的順序是**按年齡刪歸檔 → 控制崩潰報告數量 → 把異常大或異常新的檔案報出來**。真正需要人看的，是"日誌今天長了 3 GB"這件事本身。
:::

## 12. 維護清單

| 頻率 | 動作 | 指令 / 位置 |
| --- | --- | --- |
| 每天（自動） | logrotate 輪轉服務端與插件日誌 | `logrotate.timer`，配置在 `/etc/logrotate.d/minecraft` |
| 每天（自動） | 清理腳本刪舊歸檔、控制崩潰報告數量 | `mc-log-cleanup.timer` |
| 每週 | 看磁碟與 inode 水位 | `df -h`、`df -i` |
| 每週 | 看 journal 佔用與最大的日誌檔案 | `journalctl --disk-usage`、`find ... -size +100M` |
| 每週 | 檢查崩潰報告是否在成批增加（可能是崩潰迴圈） | `ls -1t crash-reports/ \| head` |
| 每月 | 複查 logrotate 配置與保留份數是否仍然合適 | `logrotate -d /etc/logrotate.d/minecraft` |
| 每月 | 確認集中化/異地日誌確實有新資料到達 | 接收端目錄或物件儲存的修改時間 |
| 每次變更後 | 改了路徑、使用者名、unit 名之後幹跑一次 | `sudo logrotate -d` |
| 出事後 | 先歸檔現場再清理 | 把相關 `latest.log` 與 `crash-reports/` 複製出去，再動手 |

## 13. 下一步

- 讓日誌和指標一起報警，而不是靠人盯：見 [監控與告警](/tutorials/ops/monitoring)。
- 日誌與存檔的一致性、保留策略：見 [備份與恢復](/tutorials/java/backup)。
- 把日誌副本送出本機：見 [異地備份](/tutorials/ops/offsite-backup)。
- 服務端目錄結構總覽：見 [服務端結構](/tutorials/java/structure)。

> 具體路徑與目錄佈局隨遊戲版本與核心而異，請以官方文件為準。
