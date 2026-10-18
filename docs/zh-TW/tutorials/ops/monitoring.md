---
title: 監控與告警
slug: monitoring
cat: ops
level: 3
order: 17
minutes: 16
tags: [監控, 告警, Prometheus, Grafana, UptimeKuma, TPS, MSPT, 維運]
updated: 2026-10-04
draft: false
---

伺服器出問題有兩種典型場景。

第一種：玩家在群裡說"服炸了"，你打開面板一看確實起不來了，然後開始查——**這是事後分析**，工具是 [用 spark 分析伺服器效能](/tutorials/ops/spark)。

第二種：磁碟還有 3% 空間、備份腳本連續三天失敗、記憶體一路爬到開始用 swap，而**你完全不知道**，直到存檔寫不進去為止。

這一篇講第二種。核心問題只有一個：**怎麼讓機器在出事之前主動來找你，而不是等你去找它。**

本篇與 [用 spark 分析伺服器效能](/tutorials/ops/spark) 是互補關係：spark 回答"剛才為什麼卡"，監控告警回答"現在是不是要出事"。資料保全見 [備份與恢復](/tutorials/java/backup) 與 [異地備份](/tutorials/ops/offsite-backup)；主機加固見 [系統安全加固](/tutorials/ops/system-security)。

:::warn 本文的配置以官方文件為準
下面出現的埠、路徑、服務名與配置鍵**都會隨發行版、安裝方式和軟體版本變化**。示例的作用是說明"該配什麼"，**不是可以直接照抄的成品**；落地前請對照 Prometheus、node_exporter、Grafana、Uptime Kuma 與 NUT 的官方文件，以及你自己系統上實際生成的設定檔。
:::

## 1. 監控到底在監控什麼

先分清兩類完全不同的東西，很多"監控沒用"的挫敗感都來自把兩者混為一談：**資源與服務狀態**（CPU、記憶體、磁碟空間與 I/O、網路、服務是否在跑、證書是否快過期）是客觀數字，可以畫成曲線，適合設閾值告警；**遊戲體驗指標**（TPS、MSPT、玩家數、登入失敗率）需要服務端配合暴露，是"玩家真實感受"的代理指標。第一類**必須監控**，因為它們的惡化是漸進的、肉眼看不見的；第二類**值得監控**，但要知道它的侷限：TPS 是一個平均量，會把尖峰攤平；MSPT 好而玩家說卡時，問題可能在網路或客戶端。

### 1.1 一張必須監控的清單

| 專案 | 為什麼必須 | 典型惡化方式 |
| --- | --- | --- |
| 可用性 / 線上時間 | 服務掛了但沒人發現，是最嚴重也最常見的事故 | 行程崩潰、OOM 被殺、開機沒自啟 |
| TPS / MSPT | 直接決定玩家體驗，也是"該不該動手最佳化"的依據 | 實體堆積、插件熱點、區塊生成 |
| CPU | 主執行緒是單執行緒的，**單核打滿就會掉 TPS**，哪怕其他核很閒 | 玩家變多、紅石機器、宿主超售 |
| 記憶體 | 堆與常駐記憶體都會緩慢爬升，**爬到開始用 swap 就是災難前兆** | 記憶體洩漏、世界變大、實體不回收 |
| 磁碟空間 | **磁碟滿會導致服務端寫存檔失敗**，屬於會毀資料的一類 | 備份堆積、日誌瘋漲、核心轉儲 |
| 磁碟 I/O | 世界儲存、區塊載入、備份都吃 I/O，**它慢的時候 CPU 看起來還很閒** | 機械盤、SSD 快滿、備份與遊戲搶盤 |
| 網路 | 頻寬打滿與丟包都會讓玩家掉線，且**服務端自身指標完全正常** | 攻擊、備份上傳佔滿上行、線路故障 |
| 玩家數 | 既是業務指標，也是**最靈敏的異常探測器**：突然歸零往往先於任何告警 | 崩服、被攻擊、登入被拒 |
| 備份是否成功 | 備份失敗時你不會有任何感覺，**直到你需要它的那一天** | 磁碟滿、權限變更、腳本報錯被忽略 |
| 證書有效期 | 面板、狀態頁、網站用 HTTPS 時，**過期當天才會暴露** | 忘記續期、自動續期任務失敗 |

:::tip 磁碟空間為什麼排在最前面
因為它是清單裡**唯一會直接毀掉資料**的一項。CPU 高、TPS 低，玩家只是難受；磁碟寫滿，服務端儲存世界失敗，可能丟的是幾個小時的進度甚至整個存檔。所以如果只配一條告警，配磁碟。
:::

## 2. 事後分析與事前告警

這兩個詞經常被混著用，但它們解決的是完全不同的問題。

| | 事後分析 | 事前告警 |
| --- | --- | --- |
| 觸發時機 | 問題已經發生、已經影響玩家 | 問題正在形成，或剛剛發生 |
| 典型工具 | spark、日誌、`crash-reports/` | Uptime Kuma、Prometheus + Alertmanager、systemd `OnFailure` |
| 回答的問題 | "剛才到底發生了什麼" | "現在是不是要出事" |
| 輸出 | 呼叫樹、火焰圖、錯誤棧 | 一條通知，附帶"該怎麼辦" |
| 侷限 | **只能解釋過去** | **只能發現你預先想到的問題** |

**兩者缺一不可，但優先順序不同。** 沒有事前告警，你會從玩家嘴裡知道伺服器掛了；沒有事後分析，你知道掛了但不知道為什麼，下次還會掛。

### 2.1 為什麼"看 spark 就夠了"是錯的

一個常見誤解是"我定期跑 spark 看健康報告就行了"。spark 的健康報告確實是長期狀態的好工具，但它是**你主動去看的**：凌晨三點磁碟寫滿時，沒有人會主動開啟 spark。告警的本質是**把"主動去看"變成"被動被通知"**，從而讓"沒有時間天天看"這件事不再致命。

:::note 別指望監控發現一切
監控只能發現**你已經想到並且採集了**的問題。第一次遇到"某個插件每天凌晨記憶體漲 200 MB"這種問題時，你通常沒有任何指標能證明它。**正確做法是：出一次事，補一條監控。** 監控體系是長出來的，不是一次配齊的。
:::

## 3. 先做最便宜的：三條零成本方案

在裝 Prometheus 之前，先把這三件事做了——它們能覆蓋大部分"伺服器掛了沒人知道"的場景，而且幾乎不花時間。

### 3.1 外部可用性檢查：Uptime Kuma

思路很簡單：**讓一台不在你伺服器上的機器，每隔一段時間來敲一次門**。為什麼必須是"不在你伺服器上"？因為伺服器整機斷電、網路中斷、系統卡死時，**跑在它自己身上的監控腳本會一起死掉**，什麼也報告不了——這一點是外部監控與本地監控最本質的區別。

Uptime Kuma 是一個自託管的監控工具，官方把它定位為"易於使用的自託管監控工具"：監控類型覆蓋 HTTP(S)、TCP、HTTP(S) 關鍵字與 JSON 查詢、WebSocket、Ping、DNS 記錄、Push、Steam 遊戲伺服器、Docker 容器等；官方 README 寫明支援 **20 秒**檢查間隔，通知渠道包括 Telegram、Discord、Gotify、Slack、Pushover、郵件（SMTP）等，官方稱有 **90 多個**通知服務；另外還有多語言、多個狀態頁、證書資訊、代理支援與 2FA。對 Minecraft 伺服器，最實用的三種監控是：

| 監控類型 | 監控什麼 | 注意 |
| --- | --- | --- |
| TCP 埠 | 服務端行程是否在監聽埠 | **行程活著但卡死時，埠仍然通**，它測不出"卡" |
| Ping | 主機是否可達 | 只能證明網路層活著 |
| HTTP(S) | 面板、狀態頁、網站是否可用 | 順便能看證書到期時間 |

**把監控放在另一台機器或另一家服務商上。** 放在同一台機器上，斷電時它和伺服器一起消失。

### 3.2 systemd：讓服務自己報告失敗

如果服務端是用 systemd 管理的（見 [系統安全加固](/tutorials/ops/system-security)），那麼"服務掛了"這件事 systemd 本來就知道，你只需要讓它告訴你。**先分清兩個經常被搞混的選項**：`Restart=on-failure` 在行程異常退出時**自動重啟**（所有長期執行的服務都該配，用來縮短故障時間），`OnFailure=` 在服務進入 failed 狀態時**觸發另一個 unit**（用來發通知、收集現場、執行清理）。

`Restart=` 是"自愈"，`OnFailure=` 是"告警"。**兩個都要配**，但不要指望 `Restart=` 能替代告警：如果服務一直在崩潰-重啟迴圈，`Restart=` 只會讓它繼續迴圈，而你什麼都不會知道。一個最小的告警 unit，以及服務端 unit 裡引用它的那一行：

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

改完記得 `systemctl daemon-reload`，然後**真的把它弄掛一次驗證**。沒驗證過的告警和沒有告警是一樣的。

:::warn 崩潰-重啟迴圈會掩蓋問題
`Restart=always` 加上"玩家沒察覺"，可能讓一台**每十分鐘崩一次**的伺服器看起來完全正常。**告警要能區分"偶爾重啟"和"一直在重啟"**，否則你會被靜默地騙很久。檢查 `systemctl status` 裡的重啟計數與最近退出時間。
:::

### 3.3 一條 cron + 一個檢查腳本

最原始也最可靠的方案：讓 cron 每分鐘跑一個腳本，腳本發現異常就以非零退出碼結束，再由 cron 的郵件或你的通知腳本把結果送出去。

**關鍵約定：腳本用退出碼錶達結果。** `0` 表示一切正常，**非零表示出事了**。這樣無論是 cron、systemd timer 還是別的排程器，都能用同一套判斷邏輯。

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

配到 cron 裡（每分鐘一次）：

```bash
# crontab -e
* * * * * /usr/local/bin/mc-healthcheck.sh || /usr/local/bin/mc-notify.sh "healthcheck failed on $(hostname)"
```

:::warn cron 的郵件經常是黑洞
很多系統上 cron 的郵件要麼沒配 MTA、要麼進了沒人看的信箱。**不要假設"cron 會通知我"**，一定要自己驗證一次：手動把腳本改成必然失敗，看通知有沒有真的送到你手上。

上面的示例裡用到了 `/usr/local/bin/mc-notify.sh`，**它需要你自己實現**：最簡單的做法是往一個 Webhook 發一條 POST，或者呼叫 Uptime Kuma 的 Push 監控位址。選擇哪個渠道取決於你已有的工具，**具體介面以該工具的官方文件為準**。
:::

:::note TPS 與 MSPT 怎麼進腳本
上面的腳本沒有檢查 TPS 與 MSPT，因為**這兩個值不在作業系統層面**，只能由服務端、插件或 MCDR 暴露出來。取到值之後判斷本身很簡單，注意 shell 只支援整數比較，浮點要用 `awk`：

```bash
mspt="$(your-command-to-read-mspt 2>/dev/null)"
if [ -n "${mspt}" ] && awk -v v="${mspt}" -v m="50" 'BEGIN {exit !(v > m)}'; then
  bad "MSPT ${mspt} exceeds 50"
fi
```

**取值方式隨核心、版本與插件而異，請以你所用方案的官方文件為準。**
:::

## 4. 正規方案：node_exporter + Prometheus + Grafana

三條零成本方案能告訴你"掛了沒有"，但回答不了"磁碟是怎麼漲上來的""記憶體是幾點開始爬的"。要做到後者，需要一套能**存歷史資料並畫成曲線**的體系。

### 4.1 三個元件各幹什麼

| 元件 | 角色 | 一句話理解 |
| --- | --- | --- |
| node_exporter | 採集器（exporter） | 把主機的 CPU、記憶體、磁碟、網路等指標變成一個 HTTP 介面上的文本，等別人來抓 |
| Prometheus | 時序資料庫 + 抓取器 | **定期主動去抓** exporter 暴露的指標，存成時間序列，並按規則判斷是否要告警 |
| Grafana | 視覺化 | 連線 Prometheus，把時間序列畫成圖、拼成面板 |
| Alertmanager | 告警路由 | Prometheus 判定"該告警了"之後，由它負責分組、去重、靜默和傳送（見第 6 節） |

**理解"拉（pull）"這個模型很重要**：不是 exporter 往 Prometheus 推資料，而是 **Prometheus 定時去拉**。副作用很有用——抓不到某個目標時 Prometheus 自己就知道"它掛了"，這個 `up` 指標本身就是最基礎的可用性監控。

### 4.2 node_exporter 與一個最小的 systemd unit

node_exporter 是一個單獨的二進位制檔案，跑起來之後在預設埠上暴露指標。官方文件給出的驗證方式是：

```bash
./node_exporter                              # 前台直接运行
curl http://localhost:9100/metrics           # 确认指标能被读到（默认端口 9100）
curl http://localhost:9100/metrics | grep "node_"   # 只看 node_ 前缀的主机指标
```

官方文件說明主機指標以 `node_` 為字首，例如 `node_cpu_seconds_total`（CPU 各模式累計時間，配合 `rate()` 得到使用率）、`node_filesystem_avail_bytes`（檔案系統對非 root 使用者可用的位元組數）、`node_network_receive_bytes_total`（網絡卡累計接收位元組數）。上游倉庫的示例 unit 使用 **socket 啟用**（`Requires=node_exporter.socket` 加 `--web.systemd-socket`），因此那個檔案**不能單獨使用**，必須配套 socket unit；下面給一個不依賴 socket 啟用、更直白的寫法：

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

啟用並驗證：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
systemctl status node_exporter --no-pager
curl -s http://127.0.0.1:9100/metrics | head
```

:::warn 路徑、使用者與埠都要按實際情況改
上面的 `User=`、`ExecStart=` 路徑和監聽埠**只是示意**。發行版包安裝與上游二進位制安裝的位置不同，使用者是否存在也取決於包；**埠 9100 是預設值，不是規定值**，改過之後 Prometheus 的目標位址也要同步改。另外，node_exporter 的某些採集器（尤其是讀取 systemd 或日誌的那些）在繁忙機器上開銷不小，**在容器裡往往還需要額外掛載才能拿到宿主機指標**；啟用哪些採集器以你所裝版本的官方文件與 `--help` 輸出為準。
:::

### 4.3 Prometheus 的最小配置

下面是 Prometheus 官方 node_exporter 指南給出的最小抓取配置，並補上規則評估與告警所需的欄位：

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

校驗並重載配置：

```bash
# 用官方自带的校验工具，避免带着语法错误重启
promtool check config /etc/prometheus/prometheus.yml
# 重载（需要启动时启用了 --web.enable-lifecycle）
curl -X POST http://127.0.0.1:9090/-/reload
```

:::note 埠與路徑都是預設值
`9090`（Prometheus）與 `9093`（Alertmanager）是這兩個專案的**預設埠**，可以在啟動參數或配置裡修改。設定檔路徑隨發行版與安裝方式不同，`/etc/prometheus/` 只是 Debian 系的常見位置。**別照抄，先看你係統上檔案到底在哪。**
:::

### 4.4 Grafana

Grafana 的角色是把 Prometheus 裡的資料畫出來，預設埠是 `3000`，配置與資料目錄位置隨安裝方式變化。對 Minecraft 主機，先做四張圖就夠用了：磁碟使用率（`node_filesystem_avail_bytes` 與 `node_filesystem_size_bytes`）、CPU 使用率（`rate(node_cpu_seconds_total[5m])`）、記憶體與 swap（`node_memory_*`）、磁碟 I/O 等待（`rate(node_cpu_seconds_total{mode="iowait"}[5m])`）。

:::tip 面板要能回答"和上週比怎麼樣"
只有一條當前值的面板幾乎沒有價值。**每張圖都要能切換時間範圍**，這樣你才能看出"磁碟從哪天開始加速下降""記憶體是哪個版本更新後開始漲"。這也是為什麼必須存歷史資料，而不是隻看當下。
:::

## 5. 告警閾值：設多少，為什麼

閾值不是越靈敏越好。**設得太鬆，事故已經發生；設得太緊，你會在第三天開始忽略所有通知。** 下面給出的是社群常用的起點，請按你自己的基線調整。

| 專案 | 建議起點 | 為什麼是這個值 | 常見誤報原因 |
| --- | --- | --- | --- |
| 磁碟使用率 | **超過 85%** | 留出足夠時間在寫滿之前處理；寫滿會直接導致儲存失敗 | 臨時備份檔案佔位、日誌輪轉滯後 |
| MSPT | **持續超過 50 ms** | 50 ms 是 20 TPS 對應的單 tick 預算，長期超過它意味著 TPS 已經守不住 | 單次尖峰被平均值掩蓋，所以要加"持續"條件 |
| 備份任務失敗 | **任意一次失敗即告警** | 備份失敗時不會有任何其他症狀，只能靠它自己報告 | 腳本退出碼沒寫對、磁碟暫時滿 |
| 服務未執行 | **`systemd` 狀態為 failed 或非 active** | 最基礎的可用性，必須有人知道 | 計劃內重啟沒有加維護視窗 |
| 記憶體高且開始用 swap | **swap 使用量持續大於 0** | 一旦開始換頁，延遲會斷崖式惡化；**"記憶體高但沒有 swap"通常只是浪費了記憶體，不一定要告警** | 系統本來就有少量 swap 活動 |
| CPU 持續高 | **持續接近單核滿載** | Minecraft 主執行緒是單執行緒的，**一個核打滿就足以掉 TPS**，與其他核是否空閒無關 | 備份、世界生成等正常高峰 |
| 證書到期 | **剩餘不足 14 天** | 留出足夠時間處理自動續期失敗 | 多域名證書只監控了其中一個 |

### 5.1 一條真正可用的告警規則

"超過 50"這個條件本身有問題：一次瞬時尖峰就會觸發。要表達"持續超過"，需要配合 `for`：

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

**注意 `for` 與 `expr` 的分工**：`expr` 判斷"現在是不是滿足條件"，`for` 判斷"已經滿足了多久"。**沒有 `for` 的告警幾乎一定會吵。**

:::warn TPS 與 MSPT 需要你自己接進來
上面的規則只用了 node_exporter 的指標，**它看不到 TPS 和 MSPT**。要監控遊戲內指標，你需要一個能把它們暴露成 Prometheus 指標的東西（服務端插件、MCDR 腳本或自建 exporter）。**具體方案隨核心、版本與插件而異，本文不給出具體實現，請以你所用方案的官方文件為準。**
:::

### 5.2 服務是否在執行

服務級監控有三種寫法，**而且可以疊加**：systemd `OnFailure`（簡單、不依賴額外元件，但**只覆蓋 failed 狀態**，卡死卻沒退出的行程測不到）、外部埠探測（能發現"行程在但服務不通"，需要另一台機器）、自建腳本 + cron（靈活，能檢查任意條件，但要自己維護）。三種成本都很低，覆蓋的場景卻不同。

## 6. 告警疲勞：怎麼讓通知還有意義

這是監控體系裡**最容易被低估**的一環。一個每十分鐘響一次、但每次都是誤報的告警，會在幾天內訓練你徹底忽略所有通知——**那時候監控體系在事實上已經失效了，只是你還沒意識到。**

### 6.1 告警症狀，而不是原因

| 反例（告警原因） | 正例（告警症狀） |
| --- | --- |
| "CPU 使用率超過 80%" | "TPS 低於 15 持續 5 分鐘" |
| "磁碟 I/O 等待偏高" | "磁碟剩餘空間不足 15%" |
| "某個行程重啟了" | "服務在 1 小時內重啟超過 3 次" |
| "記憶體使用率超過 70%" | "已開始使用 swap" |

原因是：**原因不一定影響玩家，症狀一定影響玩家。** CPU 高但 TPS 正常，說明這台機器還撐得住；而 TPS 掉了，無論原因是什麼，玩家都在難受。

### 6.2 去重、分組、靜默

告警系統需要三種基本能力，否則一次事故會變成一百條通知：

| 能力 | 作用 | 例子 |
| --- | --- | --- |
| 去重（deduplication） | 同一個問題只通知一次 | 磁碟滿了之後，所有寫盤的操作都會失敗，但你應該只收到一條"磁碟滿" |
| 分組（grouping） | 把相關告警合併成一條 | 一次斷電會讓十台機器同時離線，應該合併成一條而不是十條 |
| 靜默（silencing） | 計劃維護期間不通知 | 你正在重啟服務端，不需要為此收到告警 |

Prometheus 生態裡，這三件事由 **Alertmanager** 負責，而不是 Prometheus 本身。**這是很多人漏掉的一環**：只裝 Prometheus 不裝 Alertmanager，你得到的是一堆各自為政的通知。

### 6.3 只留一個渠道，並且每條告警都要有人能處理

一條實用的紀律：**所有告警走同一個渠道。** 原因很實際：如果有三個渠道，你會開始"這個渠道的通知不重要"地分類對待，最後三個都不看。**一個渠道、一條規則、一個地方看**，才能形成"響了一定有事"的條件反射。

上線一條告警之前，再問自己一個問題：**它響了之後，我要做什麼？** 如果答案是"不知道，先看看"，那這條告警**現在還不該上線**。先想清楚處理步驟，再開啟它——這就是下一節的執行手冊。

## 7. 告警響了之後：執行手冊

**執行手冊（runbook）** 是針對"某條告警響了該怎麼辦"預先寫好的步驟。它不是形式主義，因為告警最可能在你最沒狀態的時候響——半夜、通勤路上、正在做別的事。

一份最小可用的執行手冊，每條告警只需要四行：

```text
告警名：HostDiskSpaceLow
含义：主机某个挂载点可用空间低于 15%
第一步：df -h 确认是哪个挂载点、涨得有多快
第二步：找出占用最大的目录：du -sh /srv/minecraft/* | sort -h
        常见元凶：备份堆积、日志未轮转、核心转储文件
第三步：清理可安全删除的内容（过期备份、旧日志），确认服务端仍能写盘
第四步：如果无法立刻清理，先停掉会持续写盘的任务，并通知玩家
```

### 7.1 四條通用處置原則

| 原則 | 為什麼 |
| --- | --- |
| **先止損，再找原因** | 玩家還在受影響時，先把服務恢復起來；排查可以之後做 |
| **保留現場** | 重啟之前先複製日誌與狀態，見 [應急與取證](/tutorials/ops/incident-forensics) |
| **不要只重啟了事** | 重啟只是把世界重新載入一次，**如果根因還在，問題會以同樣的速度回來** |
| **記錄處置過程** | 下次同樣的告警響時，你需要的正是這次的記錄 |

### 7.2 一個真實的處理順序

以"TPS 掉到 10"為例，合理的順序是：**確認現象（TPS、MSPT、玩家數、`uptime`）→ 判斷是服務端側還是宿主機側 → 服務端側跑一次 spark profiler 拿呼叫樹，宿主機側看 CPU 限流、記憶體與磁碟 I/O → 先上應急手段讓玩家能玩 → 最後復盤並補一條監控**。前兩步的判據見 [用 spark 分析伺服器效能](/tutorials/ops/spark)。

## 8. 家用主機怎麼監控

家用主機與機房環境的差別，主要在於**它有一堆機房替你解決的問題**：市電、空調、門禁、值守。相關背景見 [家用電腦開服與維護](/tutorials/ops/home-hosting)。

### 8.1 斷電檢測與自動關機：NUT

家用主機最典型的故障是**市電中斷**。它和"服務端崩潰"不同：崩潰通常不損壞存檔，而**寫入過程中的硬掉電可能留下半寫的檔案**，輕則丟區塊，重則存檔無法載入。所以 UPS 的定位是"爭取安全停機的時間"，而**NUT（Network UPS Tools）** 是 Linux 上最通用的監控方案：它分三層——**驅動與 UPS 通訊、`upsd` 是服務端、`upsmon` 是監控客戶端**，`upsmon` 從 `upsd` 讀取狀態並在需要時觸發關機。讀取狀態的命令是 `upsc`（只讀客戶端）：

```bash
upsc -l                       # 列出所有已配置的 UPS 名称
upsc myups                    # 查看某台 UPS 的全部变量
upsc myups ups.status         # 只看状态：OL 市电 / OB 电池 / LB 低电量
upsc myups battery.charge     # 剩余电量百分比
upsc myups battery.runtime    # 预计续航秒数
```

把 UPS 狀態接到告警裡很簡單：判斷 `ups.status` 是否包含 `OB`（on battery）即可——**取不到狀態時不要靜默放過**，而應當按"未知"告警。

:::warn NUT 的細節隨發行版與版本變化
包名與服務名在不同發行版上不同（Debian 系常見 `nut-server`、`nut-client`，RHEL 系常見 `nut-server`、`nut-monitor`），配置目錄也有 `/etc/nut/` 與 `/etc/ups/` 兩種；**NUT 2.8.0 起把 `master`/`slave` 改名為 `primary`/`secondary`**，舊寫法仍被相容接受。變數名也可能隨驅動與機型變化，**先用 `upsc` 把實際變數列出來再寫腳本**。完整配置見 [機架、交換機與 UPS](/tutorials/ops/hardware-rack)。
:::

### 8.2 斷電之後能不能自己起來、會不會過熱

監控能告訴你"停電了"，但**恢復供電後機器能否自己啟動取決於 BIOS/UEFI 設定**，與監控無關；這一項要在裝機時就配好，否則每次停電都得親自去按開機鍵。家用環境也沒有機房空調，**夏天高溫是真實的故障源**：CPU 與風扇轉速可以用 `lm-sensors` 的 `sensors` 命令讀取，硬碟溫度通常在 `smartctl -a` 的 SMART 屬性裡，**能讀到哪些感測器取決於主機板與感測器晶片**。

:::note 溫度閾值因硬體而異
不同 CPU 的正常工作溫度差別很大，**不存在一個通用的告警溫度**。正確做法是查你所用型號的規格書，把閾值設在"明顯高於日常、但低於降頻點"的位置：先跑幾天記錄基線，再設閾值。
:::

家用主機還該盯四件事：**上游鏈路**（家寬會重播 PPPoE、會臨時抖動，服務端指標正常但玩家全掉線）、**公網 IP 變化**（沒有固定 IP 時 DDNS 更新失敗會讓玩家連不上）、**磁碟 SMART 屬性**（家用盤沒有企業盤的冗餘設計，提前發現壞道能救一次資料）、**睡眠與休眠**（系統進入睡眠後服務端就停了，必須確認相關設定已關閉）。

## 9. 落地順序與檢查清單

不要一次把整套棧都裝上。按這個順序做，每一步都能獨立產生價值：**外部探測 + 一個通知渠道**（解決"伺服器掛了但沒人知道"）→ **systemd `OnFailure` 與 `Restart=`**（服務崩潰的自動恢復與通知）→ **一條 cron 健康檢查腳本**（磁碟將滿、行程消失）→ **node_exporter + Prometheus + Grafana**（看到趨勢，能回答"從什麼時候開始變壞"）→ **告警規則 + Alertmanager**（從"看圖"變成"被通知"）→ **給每條告警寫執行手冊**（半夜收到通知時知道該做什麼）。

### 9.1 上線前檢查清單

| 檢查項 | 為什麼必須確認 |
| --- | --- |
| 監控本身不在被監控的機器上 | 整機斷電時，本機監控會一起消失 |
| 通知渠道真的驗證過一次 | 沒驗證過的告警等於沒有告警 |
| 告警能區分"持續"與"瞬時" | 用 `for` 之類的條件，否則一定會吵 |
| 每條告警都有對應的執行手冊 | 否則它只是把你叫醒 |
| 磁碟告警的閾值低於"寫滿"還有餘量 | 磁碟滿是會毀資料的一類故障 |
| 備份失敗會告警 | 備份失敗沒有任何其他症狀 |
| 監控了證書到期 | 過期當天才會暴露 |
| 計劃維護時有靜默機制 | 否則重啟一次就收一堆通知 |
| 有歷史資料可回看 | 單點快照說明不了趨勢 |
| 知道去哪看日誌與指標 | 見 [日誌與報錯排查](/tutorials/faq/errors) |

### 9.2 常見錯誤

| 錯誤 | 後果 |
| --- | --- |
| 只監控 CPU 與記憶體 | 漏掉磁碟、備份、證書這三類"不會自己喊"的故障 |
| 告警直接綁在原始指標上 | 每次瞬時波動都通知，很快被忽略 |
| 通知發到三個渠道 | 三個都不認真看 |
| 裝完就不管 | 閾值隨業務變化，半年後全部失效 |
| 只監控不演練 | 真出事時才發現通知發不出去 |
| 把監控放在同一台機器 | 最需要它的那次故障中，它不在 |

:::tip 最後一條建議
**監控體系的正確規模是"你願意維護的規模"。** 一條被認真對待的磁碟告警，比二十條被靜音的面板有用得多。從最小可用開始，出一次事補一條，比一次配齊再全部放棄要現實。
:::

> 各軟體的安裝與配置以官方文件為準。
