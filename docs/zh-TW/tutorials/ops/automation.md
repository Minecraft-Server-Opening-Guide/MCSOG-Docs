---
title: 自動化維運
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [自動化, 備份腳本, systemd, cron, Ansible, CI/CD, 維運]
updated: 2026-10-04
draft: false
---

自動化維運的目標不是"顯得專業"，而是**把重複動作變成不會忘、不會做錯的動作**。伺服器出事的原因裡，排在最前面的往往不是"技術太難"，而是"這件事我忘了做""上次做的時候漏了一步""凌晨三點做的時候手抖了"。

這一篇講怎麼把備份、重啟、更新、日誌清理與健康檢查交給腳本和定時器，以及**哪些事情不能交給它們**。相關篇目：備份策略見 [備份與恢復](/tutorials/java/backup) 與 [異地備份](/tutorials/ops/offsite-backup)，效能問題見 [用 spark 分析伺服器效能](/tutorials/ops/spark)，更新流程見 [服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates)，告警見 [監控與告警](/tutorials/ops/monitoring)。

:::warn 命令與配置以你所用的系統與軟體官方文件為準
下面出現的**包名、路徑、使用者與組、服務名、模組參數與 systemd 選項**都會隨**發行版、軟體版本與安裝方式**變化。示例說明的是"該寫什麼、為什麼這樣寫"，**不是可以直接複製貼上的成品**。落地前請對照你所用發行版的文件、服務端與插件官方文件，以及 Ansible、systemd、cron 的官方手冊（`man 5 crontab`、`man systemd.timer`、`man systemd.service`）。
:::

## 1. 先自動化什麼

判斷標準很簡單：**這件事是否需要"按時間重複做"？** 是，就值得自動化；不是，就先別碰。

| 任務 | 頻率 | 自動化方式 | 風險 |
| --- | --- | --- | --- |
| 世界與配置備份 | 每日 / 每 6 小時 | cron 或 systemd timer + 腳本 | 低（但**沒驗證過的備份等於沒有備份**） |
| 異地同步 | 每日 | `rsync` + SSH 金鑰 | 中（目標端被寫滿或被覆蓋） |
| 定時重啟 | 每日 / 每週 | cron 或 systemd timer | 低（但**重啟不是解決卡頓的手段**） |
| 日誌清理與輪轉 | 每日 / 每週 | `logrotate` 或腳本 | 中（刪錯目錄不可逆） |
| 健康檢查與自愈 | 每分鐘 / 每 5 分鐘 | 腳本 + 定時器 + 告警 | 中（**反覆重啟會掩蓋真實問題**） |
| 更新檢查（只通知） | 每日 | 腳本 + 通知 | 低 |
| 更新執行（含回滾） | 人工觸發 | 腳本 + 人工確認 | **高**（會改二進位制與配置） |
| 插件升級 | 人工 | 先在測試服驗證 | **高**（配置格式與依賴會變） |
| 遊戲版本升級 | 人工 | 按官方升級說明執行 | **最高**（世界格式可能單向變更） |
| 刪檔、清空玩家資料、重置世界 | 絕不自動 | 只允許人工執行 | **不可逆** |

結論：**自動化的價值集中在"低風險、高頻率、純機械"的動作上**；風險越高的動作，越應該把自動化用在"檢查、準備、驗證、回滾"這些環節，而不是"直接執行"。

## 2. 不要盲目自動化的事

**遊戲版本升級。** 跨大版本升級往往伴隨**世界資料的單向格式轉換**。新版本一旦開啟並儲存了世界，回退到舊版本通常不再可行。這類操作必須由人確認，並且**先備份、先在副本上試**。

**沒有測試過的插件升級。** 插件依賴（Vault、PlaceholderAPI、ProtocolLib、LuckPerms 這類前置）與配置格式會隨版本變化。自動升級的典型結局是：夜裡更新完成，早上玩家進不來，而你不知道是哪個插件導致的。

**任何不可逆操作。** 刪除、覆蓋、清空、遷移、`rm -rf`、資料庫 `DROP`。這些動作可以被腳本**準備**（列出將被刪除的內容、生成待確認清單），但不應該由定時器**直接執行**。

**你沒讀懂過的腳本。** 從網上抄一段沒讀懂的 shell，配上 root 與定時器，等於給自己埋一顆不知道什麼時候響的雷。

:::warn 自動化的破壞力是"自動放大"的
人工操作出錯，影響範圍是那一次；自動化的錯誤會**按頻率重複**——一個寫錯目錄的清理腳本每天刪一次，一個判斷條件寫反的健康檢查每分鐘重啟一次。**先讓腳本以只讀方式跑夠久，確認它的判斷是對的，再給它寫權限。**
:::

## 3. 腳本衛生

同一個腳本，寫好與寫壞的區別不在功能，而在**出事時你能否看懂發生了什麼**。

### 3.1 開頭三件事

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **shebang**：`#!/usr/bin/env bash` 比 `#!/bin/bash` 更可移植（會在 `PATH` 裡找 bash）。**注意**：`sh` 不保證支援下面用到的 bash 語法，所以不要用 `#!/bin/sh`。
- **`set -e`**：命令失敗立即退出，避免"上一步失敗了還繼續往下跑"。
- **`set -u`**：引用未定義變數時報錯退出。最危險的 bug 之一就是變數為空導致 `rm -rf "$DIR/"` 變成 `rm -rf /`。
- **`set -o pipefail`**：管道中任一環失敗都算失敗。沒有它，`tar ... | gzip ...` 裡 tar 報錯也可能被當成成功。

### 3.2 日誌、退出碼與冪等

**日誌必須帶時間戳，不要只用 `echo`**：沒有時間戳的日誌在排查時價值極低，你不知道"備份失敗"是今天還是上週。

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

如果腳本由 systemd 託管，也可以不自己加時間戳，改用 `journalctl`（自帶時間戳與輪轉），**但兩種方式不要混用**。

**退出碼要有意義**：`0` 成功，非零表示失敗，並**區分不同失敗原因**，這樣告警才有資訊量——`1` 通用錯誤、`2` 用法錯誤、`3` 依賴缺失、`4` 鎖被佔用（上一次還在跑）、`5` 資料校驗失敗。

**冪等性**：冪等的腳本可以重複執行、結果一致，這是自動化最重要的性質——用 `mkdir -p` 而不是 `mkdir`，覆蓋式寫入而不是追加（除非日誌），用"檢查再動作"而不是"假設已經就緒"。**不冪等的腳本在重試時會破壞資料**，而重試是常態（機器重啟、cron 補跑、你手動再跑一次）。

### 3.3 引號、`--dry-run` 與版本控制

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

變數一律寫成 `"$VAR"` 而不是 `$VAR`，否則路徑裡有空格時會被拆成多個參數；`${VAR:?message}` 在變數為空或未設定時**直接報錯退出**，這是防誤刪最便宜的一道保險。給腳本加一個"只打印不執行"的模式，是成本最低的安全措施。

**腳本要進版本控制**：把腳本放進 Git 倉庫，理由不是"規範"，而是你能看到**上次改了什麼**、改動之後什麼時候開始出問題；誤刪可以恢復；多台伺服器共用同一份腳本，而不是各自演化出三個略有差異的版本。倉庫裡應當包含腳本、systemd 單元、cron 片段、Ansible 劇本與一份說明依賴的 README，**但絕不要包含金鑰**（見第 9 節）。

## 4. 一個完整的備份腳本

下面這份腳本把前面的原則都用上了：**鎖檔案防止重疊、RCON 關閉存檔寫入、帶日期的歸檔、校驗、保留策略、異地同步**。

```bash
#!/usr/bin/env bash
set -euo pipefail
# Minecraft 服务端备份脚本（Linux）。用法：./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # 留空表示不使用 RCON
OFFSITE_TARGET=""                           # 例：backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# 前置检查
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "缺少命令：$cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "服务端目录不存在：$SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "配置了 RCON 但找不到 mcrcon" 3
fi
# 锁：防止上一次还没跑完就重叠执行
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "无法创建锁文件：$LOCK" 3
if ! flock -n 9; then log WARN "上一次备份仍在运行，本次跳过"; exit 4; fi
# 无论怎么退出，都要恢复存档写入
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on 失败，请手动确认存档写入已恢复"
  fi
}
trap cleanup EXIT
log INFO "备份开始：${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"

# 1) 关闭自动保存（推荐 RCON；不用 RCON 时可用 screen 发送命令，例如
#    screen -S minecraft -p 0 -X stuff 'save-off\n'，随后记得再发 save-on）
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "已执行 save-off 与 save-all flush"; sleep 5
  else
    log WARN "RCON 不可用，跳过 save-off，继续备份"
  fi
else
  log WARN "未配置 RCON，跳过 save-off"
fi

# 2) 校验世界目录存在，避免打包出一个空归档
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "跳过不存在的目录：${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "没有任何世界目录存在，中止" 5
# 3) 打包（有 pigz 就用它并行压缩）
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) 校验归档可读（这一步决定"备份是否存在"）
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "归档校验失败：$TARBALL" 5
  log INFO "归档校验通过：$(du -h "$TARBALL" | cut -f1)"
fi
# 5) 保留策略与空间下限
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "剩余空间 ${FREE_GB}G 低于下限 ${MIN_FREE_GB}G"
# 6) 异地同步（rsync 失败返回非零，配合 set -e 直接暴露）
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "同步到异地：${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "备份完成：${TARBALL}"
```

關鍵設計：**`flock -n 9`** 讓上一次沒跑完時直接跳過，而不是並行執行兩份備份把磁碟與 I/O 打滿；**`trap cleanup EXIT`** 保證無論腳本怎麼退出都嘗試恢復 `save-on`，否則**服務端會一直不寫盤**，這是很隱蔽的事故；**`save-all flush` 後 `sleep 5`** 給服務端時間把記憶體中的區塊落盤；**`tar -tzf` 校驗**是"備份是否有效"的唯一判據；**`--delete-after`** 先傳輸成功再刪除舊檔案，避免傳輸失敗導致異地被清空；**`${STATE_DIRECTORY:-/run/lock}`** 相容 systemd 的 `StateDirectory=`（見 4.2），手動執行時回退到 `/run/lock`。

:::tip 備份要定期做一次"恢復演練"
腳本每天成功，不代表備份可用。每隔一段時間，**在一台測試機或臨時目錄裡真正解壓並啟動一次**。恢復流程見 [備份與恢復](/tutorials/java/backup)，異地副本的意義見 [異地備份](/tutorials/ops/offsite-backup)。
:::

### 4.1 對應的 cron 寫法

```ini
# /etc/cron.d/mc-backup
# 分 时 日 月 周   用户       命令
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**cron 的環境與你登入的 shell 完全不同**：`PATH` 很短，`HOME` 可能不是你以為的那個，所以要在 crontab 裡顯式設定 `SHELL` 與 `PATH`，腳本裡也儘量用絕對路徑；**必須重定向 `>> log 2>&1`**，否則輸出會進郵件（很多機器上根本沒有郵件系統，等於黑洞）；`/etc/cron.d/` 的檔案**需要使用者名稱欄位**，而 `crontab -e` 寫的是當前使用者的表、**沒有使用者名稱欄位**，這是最常見的 cron 語法錯誤；**cron 不會"補跑"錯過的任務**，機器在 4:30 關機，這次備份就不會發生。

### 4.2 等價的 systemd timer + service

```ini
# /etc/systemd/system/mc-backup.service
[Unit]
Description=Minecraft world backup
After=network-online.target

[Service]
Type=oneshot
User=minecraft
Group=minecraft
StateDirectory=mcbackup
StateDirectoryMode=0750
# 脚本需要读服务端目录、写备份目录
ReadWritePaths=/srv/minecraft/server /srv/backups/mc
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ExecStart=/opt/mc-ops/mc-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/mc-backup.timer
[Unit]
Description=Run Minecraft world backup every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:30:00
# 机器在触发点关机时，开机后补跑一次
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mc-backup.timer
systemctl list-timers mc-backup.timer
journalctl -u mc-backup.service -n 50 --no-pager
```

兩個容易踩的點：**`OnCalendar` 的星期與月份用英文縮寫**（`Mon`、`Sun`、`Jan`），時間預設按本地時區解釋，改時區後觸發時間會跟著變（語法見 `man systemd.time`）；**`ProtectSystem=strict` 會把整個檔案系統掛成只讀**，可寫路徑只有 `StateDirectory`、`CacheDirectory`、`LogsDirectory`、`RuntimeDirectory` 與顯式列出的 `ReadWritePaths`——腳本要寫別的地方就必須加進去，否則你會看到"權限明明對，就是寫不進去"。

:::tip cron 與 systemd timer 怎麼選
只是"每天跑個腳本"：兩者都行，選你更熟的。需要**日誌歸集、開機補跑、資源限制、失敗重試**：選 systemd timer。需要**跨發行版一致**（含 BSD、容器）：cron 更通用。
:::

## 5. 定時重啟

定時重啟是很多伺服器的日常操作，但要先明確：**重啟不是解決卡頓的手段。** 重啟能處理的是記憶體緩慢洩漏、長期執行積累的臨時狀態、某個插件的小毛病；**不能**處理 TPS 低、區塊載入慢、玩家卡頓——那些要找出原因，見 [用 spark 分析伺服器效能](/tutorials/ops/spark)；而"每天崩一次所以每天重啟一次"會讓**真實故障永遠不被發現**。

確定需要定時重啟時，流程上必須包含**提前公告**：

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # 更安全的做法是从受限权限的文件或环境变量读取
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say 服务器将在 5 分钟后重启，请及时保存进度"
sleep 240
rcon "say 服务器将在 1 分钟后重启"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "重启 ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# 文件一：/etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# 文件二：/etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

如果你用面板（Pterodactyl、AMP、MCSManager 一類），**優先用面板自帶的重啟計劃**，因為面板知道如何優雅地停止行程；用腳本直接 `kill` 面板管理的行程可能讓面板狀態錯亂。面板對比見 [伺服器面板](/tutorials/ops/panels)。

:::warn 不要用 kill -9 停止服務端
強制殺死行程可能讓世界**來不及儲存**，或在寫入過程中被中斷。正確順序永遠是：`save-all flush` → 正常停止（`stop` 命令或 `systemctl stop`）→ 等行程退出。只有行程卡死時才考慮強制終止，並且**事後檢查存檔完整性**。
:::

## 6. 更新自動化要怎麼做才安全

更新是自動化裡風險最高的一類。可行做法是**把自動化用在"準備與驗證"，把執行留給人工確認**：檢查新版本（自動，只做通知）→ 下載到 `staging/`（自動，**不要直接覆蓋正在執行的 jar**）→ 校驗官方雜湊（自動）→ 備份並確認歸檔可讀（自動）→ 切換（人工確認後執行，舊 jar 重新命名保留）→ 重啟並驗證埠、日誌與插件載入 → 失敗則換回舊 jar 並**告警**。

一個只做"檢查與下載"的檢查器是最有價值的自動化，因為它沒有破壞力：

```bash
#!/usr/bin/env bash
set -euo pipefail
# 只检查与下载，不替换、不重启
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # 替换为官方地址
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # 替换为官方校验和地址
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) 下载到暂存目录
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) 校验（必须使用官方发布的哈希）
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "校验和不匹配，丢弃下载"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) 与当前版本比较，只报告
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "已是最新版本"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "发现新版本，已放入暂存目录，等待人工确认后切换"
fi
```

**關鍵原則：自動化只負責"把東西準備好並說清楚"，替換與重啟由人按下按鈕。** 完整的更新與回滾細節（含插件、Mod 與 MCDR）見 [服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates)。

## 7. 健康檢查驅動的自動化

健康檢查的價值在於**在玩家發現問題之前發現它**。判斷依據應當儘量客觀：行程是否在跑（`systemctl is-active`，但行程活著不等於服務可用）；埠是否監聽（`nc -z` / `ss -ltn`，最快的可用性檢查）；是否還能響應命令（RCON 查詢，能響應說明主執行緒沒有完全卡死）；TPS / MSPT（**不同服務端命令不同**，需按官方文件確認）；磁碟與記憶體（更適合告警，不適合"自動重啟"）。

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # 例：/opt/mc-ops/notify.sh，接收一个消息参数
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# 冷却：避免崩溃-重启循环
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "处于冷却期，跳过自动重启"; exit 0; fi
fi
# 1) 端口检查（3 秒超时）
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "端口 ${PORT} 无响应"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "重启失败，需要人工介入"; exit 1; fi
  exit 0
fi
# 2) TPS 检查（需要 RCON 且服务端支持对应命令）
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} 低于阈值 ${MIN_TPS}（请用 spark 分析，不要盲目重启）"
  fi
fi
log INFO "健康检查通过"
```

```ini
# /etc/systemd/system/mc-health.timer
[Unit]
Description=Check Minecraft server health every 2 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
```

:::warn 反覆重啟會掩蓋真實問題
如果健康檢查每天都要重啟一次伺服器，你得到的不是"穩定的伺服器"，而是"**一個每天都崩但沒人知道的伺服器**"。自動重啟的腳本**必須同時發告警**，冷卻時間要足夠長；持續觸發時應當**停掉自動重啟、轉人工排查**。
:::

指標採集、閾值設定與告警渠道的完整做法見 [監控與告警](/tutorials/ops/monitoring)。

## 8. 配置管理：Ansible 的概念與最小示例

當伺服器超過一台，"登入上去手動改"就開始失控：三台機器的配置慢慢不一樣，而你不知道哪台是對的。配置管理工具（Ansible、Salt、Puppet、Chef）解決的就是這個問題：**把機器的期望狀態寫成檔案，放進版本控制，由工具去收斂。** Ansible 門檻最低，因為它**只需要 SSH 與 Python，不需要在被管機器上裝 agent**。

```ini
# inventory.ini
[mcservers]
mc1.example.com ansible_user=deploy
mc2.example.com ansible_user=deploy

[mcservers:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# playbook.yml
---
- name: Provision a Minecraft host
  hosts: mcservers
  become: true
  vars:
    mc_user: minecraft
    mc_group: minecraft
    mc_home: /srv/minecraft
    # 发行版差异：Debian/Ubuntu 上通常是 openjdk-21-jre-headless，
    # RHEL 系通常是 java-21-openjdk-headless。务必按你的发行版核实。
    java_package: openjdk-21-jre-headless
  tasks:
    - name: Install a Java runtime
      ansible.builtin.package:
        name: "{{ java_package }}"
        state: present
    - name: Create the service user and group
      ansible.builtin.user:
        name: "{{ mc_user }}"
        group: "{{ mc_group }}"
        home: "{{ mc_home }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: true
        state: present
    - name: Deploy the systemd unit
      ansible.builtin.template:
        src: templates/minecraft.service.j2
        dest: /etc/systemd/system/minecraft.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart the server
  handlers:
    - name: Reload systemd and restart the server
      ansible.builtin.systemd:
        name: minecraft.service
        daemon_reload: true
        state: restarted
```

```bash
ansible-playbook -i inventory.ini playbook.yml --check --diff
ansible-playbook -i inventory.ini playbook.yml
```

:::warn 模組參數以 Ansible 官方文件為準
上面每個模組（`package`、`user`、`template`、`systemd`）的**參數名、取值與行為會隨 Ansible 版本變化**，模組在較新版本中也會被重新命名或遷移到 collection。**照抄示例是常見的事故來源**：先用 `--check`（只報告不改動）跑一遍，再對照 Ansible 官方文件逐個確認參數含義。
:::

三條經驗：**先管住"配置"，再管住"部署"**（把 `server.properties`、插件配置、systemd 單元納入版本控制，價值遠大於讓 Ansible 幫你下載 jar）；**`--check` 是你的朋友**（任何劇本先跑 `--check --diff`）；**敏感值不進倉庫**（密碼、Token、RCON 密碼用 `ansible-vault` 或環境變數注入）。

## 9. CI/CD 的概念（以及為什麼金鑰不能進倉庫）

CI/CD 用在 Minecraft 伺服器上，最有價值的不是"自動部署"，而是**自動檢查**。務實做法是：把伺服器配置放進 Git 倉庫，讓流水線在每次提交時做三件事——**語法校驗、結構解析、腳本靜態檢查**。

```yaml
# .github/workflows/validate.yml
name: Validate server configuration
on:
  push:
    branches: [main]
  pull_request:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v4
      - name: Lint YAML configuration
        run: |
          pip install --disable-pip-version-check yamllint
          yamllint -c .yamllint.yml config/
      - name: Parse YAML and TOML files
        run: |
          python3 - <<'PY'
          import pathlib, sys, tomllib, yaml
          parsers = {"*.yml": yaml.safe_load, "*.toml": tomllib.loads}
          failed = False
          for pattern, parse in parsers.items():
              for path in sorted(pathlib.Path("config").rglob(pattern)):
                  try:
                      parse(path.read_text(encoding="utf-8"))
                  except Exception as exc:
                      failed = True
                      print(f"{path}: {exc}")
          sys.exit(1 if failed else 0)
          PY
      - name: ShellCheck the operations scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck -x scripts/*.sh
```

:::note 版本差異：`tomllib` 需要 Python 3.11+
Python 3.11 起標準庫才有 `tomllib`。更早的版本需要安裝 `tomli` 並改為 `import tomli as tomllib`。請按你的執行環境核實。
:::

**"同步到伺服器"這一步要謹慎。** 可行的順序是：CI 只負責**校驗與打包**，部署由人觸發，並且部署前自動備份。**不要讓每次提交都直接重啟生產服。**

**絕不要把密碼、Token、RCON 密碼、SSH 私鑰提交進倉庫。** 三個具體後果：**Git 歷史會永久保留它**（刪掉檔案不解決問題，舊提交裡還有，克隆過的人手裡也有；徹底清除需要重寫歷史，並且必須**更換所有已洩露的憑據**）；**公開倉庫會被自動掃描**（有人專門爬取公開倉庫裡的金鑰，從提交到被濫用可能只有幾分鐘）；**它會跟著倉庫擴散**（每個克隆、每個 fork、每個 CI 日誌裡都可能留下一份）。

| 場景 | 做法 |
| --- | --- |
| CI 裡需要金鑰 | 使用平台提供的 Secrets（如 GitHub Actions 的 repository secrets），通過環境變數注入 |
| 伺服器上需要金鑰 | 放在權限受限的檔案裡（`chmod 600`、屬主為服務使用者），或用 systemd 的 `EnvironmentFile=` |
| Ansible 需要金鑰 | `ansible-vault` 加密，或從環境變數讀取 |
| 本地開發 | `.gitignore` 掉真實配置，倉庫裡只放 `.example` 模板 |

**上線前用一次金鑰掃描工具（如 gitleaks、trufflehog）檢查整個 Git 歷史**，比事後補救便宜得多。

## 10. 落地順序建議

不要一次把所有東西都自動化。按風險從低到高、價值從高到低推進：**先有備份腳本，並且驗證過一次恢復**（第 4 節）→ **把備份掛上定時器**，確認日誌能看到成功與失敗 → **加健康檢查 + 告警**（第 7 節），先只告警、不自動重啟 → **加日誌清理與輪轉**，把磁碟空間控制住 → **把腳本與配置放進 Git**（第 3.3、9 節）→ **最後才考慮自動更新**，而且只自動到"下載 + 校驗 + 通知"這一步（第 6 節）。

:::warn 沒有備份的自動破壞性操作，就是丟檔的標準劇本
一個清理腳本寫錯目錄、一個 `rsync --delete` 寫錯方向、一個更新腳本覆蓋了世界檔案——這些事故的共同點是**在它們發生之前，沒有一份可用的備份**。**任何會刪除、覆蓋、行動數據的自動化，都必須先確認備份存在且可恢復**；做不到這一點，就不要讓它自動執行。存檔丟了通常找不回來，而腳本可以重寫。
:::

## 下一步

- 備份策略與恢復流程：見 [備份與恢復](/tutorials/java/backup)
- 異地副本怎麼做：見 [異地備份](/tutorials/ops/offsite-backup)
- 指標、閾值與告警渠道：見 [監控與告警](/tutorials/ops/monitoring)
- 卡頓時如何定位原因（而不是重啟）：見 [用 spark 分析伺服器效能](/tutorials/ops/spark)
- 更新與回滾的完整流程：見 [服務端、插件與 MCDR 的更新維護](/tutorials/ops/updates)
- 面板自帶的任務計劃：見 [伺服器面板](/tutorials/ops/panels)

---

> 腳本與配置以你所用的系統與軟體官方文件為準。
