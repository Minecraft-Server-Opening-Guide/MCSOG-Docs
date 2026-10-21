---
title: 異地備份：使用、配置與維護
slug: offsite-backup
cat: ops
level: 3
order: 10
minutes: 20
tags: [ops, backup, offsite, rsync, restic, rclone, retention]
updated: 2026-10-04
draft: false
---

本地備份能救"手滑刪檔"，救不了"硬碟壞了""機器被偷了""機房出事了"。**異地備份（offsite backup）解決的就是這一類"整個環境一起消失"的災難**。這一篇講清楚它的原理、配置和維護。

本地備份的基礎（備份什麼、一致性要求、回檔流程）見 [備份與恢復](/tutorials/java/backup)；本篇假設你已經有了本地備份，現在要把副本送出去。

## 1. 3-2-1 原則

3-2-1 是一條被廣泛引用的備份經驗法則：

| 數字 | 含義 | 對 MC 伺服器的落地 |
| --- | --- | --- |
| **3** | 至少保留 **3 份**資料副本（1 份生產 + 2 份備份） | 執行中的服務端目錄 + 本地備份盤 + 異地副本 |
| **2** | 至少使用 **2 種不同介質/儲存** | 例如內建 SSD + 外接硬碟 + 物件儲存 |
| **1** | 至少 **1 份在異地** | 雲端儲存、另一台機器、另一處物理位置 |

### 為什麼"同一塊盤上的備份"不算備份

把備份寫到**服務端所在的同一塊硬碟**上，只防住了一種故障：誤刪、改錯配置、插件寫壞存檔。它防不住**磁碟本身損壞**（備份一起沒）、**整機故障**（主機板或電源燒了，兩塊盤一起走）、**勒索軟體**（會加密它能看到的所有可寫卷）、**人為破壞**（有人 `rm -rf` 了整個目錄，或者拔走了機器），以及**火災、水淹、失竊**。

### 三種典型災難場景

| 場景 | 本地備份夠嗎 | 異地備份的作用 |
| --- | --- | --- |
| 硬碟損壞 / 整機報廢 | 不夠（若備份在同一塊盤） | 直接從異地副本恢復 |
| 勒索軟體加密所有可寫卷 | **不夠** | 只讀或不可變的異地副本是唯一齣路 |
| 服務商跑路 / 機房事故 / 帳號被盜 | **不夠** | 副本在你自己的儲存上 |

:::warn 異地副本必須"備份程式寫得進去，攻擊者刪不掉"
如果異地儲存用的是同一套憑證、同一個可寫帳號，勒索軟體一樣能刪掉它。**能做成只讀/不可變（object lock、WORM、append-only）就做**；退一步，至少讓備份帳號只有寫入權限、沒有刪除權限。
:::

## 2. 備份什麼、不備份什麼

| 必要性 | 內容 | 說明 |
| --- | --- | --- |
| 必須 | `world/`、`world_nether/`、`world_the_end/` | **存檔本體，最重要**；自定義世界名以 `level-name` 為準 |
| 必須 | `server.properties` | 埠、難度、正版驗證、`level-name` 等 |
| 必須 | `ops.json`、`whitelist.json`、`banned-ips.json`、`banned-players.json` | 權限與封禁名單 |
| 必須 | `plugins/`（含各插件的配置與資料庫） | 插件本體與配置；注意有些插件把資料寫在別處 |
| 必須 | `mods/`、`config/`（模組端） | 模組端專用；`config/` 裡是模組配置 |
| 必須 | 核心自己的配置（`bukkit.yml` / `spigot.yml` / `paper-*.yml` 等） | 隨核心不同而不同 |
| 必須 | 啟動腳本、systemd unit、cron 條目 | **容易漏**，恢復時沒有它起不來 |
| 可選 | `logs/`、`crash-reports/` | 排查問題有用，但體積會很大 |
| 不必 | `libraries/`、`versions/`、`cache/` | 可自動重建 |

:::tip 把"啟動方式"也當成要備份的資料
"存檔恢復了但服務起不來"是很常見的事故，原因就是啟動腳本、Java 參數、systemd unit、定時任務都沒備份。**把它們和配置一起納入備份範圍。**
:::

### 一致性：絕不在服務端寫盤時複製

**不要在服務端正在寫存檔時直接複製**——可能拷到寫了一半的區塊檔案，恢復後存檔損壞。兩種正確做法：

**方式 A：熱備份（不停服）**

```text
save-all        先把数据刷到磁盘
save-off        关闭自动保存（避免备份过程中继续写入）
（此时执行复制/打包）
save-on         备份完恢复自动保存
```

**方式 B：停服備份（最穩）**

```text
stop            安全关服
（复制/打包整个目录）
（重新启动）
```

方式 A 需要**向服務端控制台傳送指令**。若用 systemd 託管且啟動方式能接收控制台輸入，可以用 `screen`/`tmux` 注入，或啟用 RCON 後遠端發指令（**RCON 配置方式隨核心與版本不同，以官方文件為準**）。

:::warn 打包工具讀檔案時服務端仍在寫
`tar`、`rsync`、`restic` 都會**一邊讀一邊遍歷**。即使你剛執行過 `save-all`，如果沒 `save-off`，服務端仍會在遍歷過程中寫入新資料，**歸檔裡可能出現不一致的組合**。`save-off` 這一步不能省。
:::

## 3. rsync over SSH

`rsync` 是最經典的異地增量同步方案：只傳變化的部分，走 SSH 加密通道，幾乎所有 Linux 發行版都能裝。

### 一次完整的示例指令

```bash
rsync -aHAX --delete --numeric-ids --info=progress2 \
  --exclude='logs/' \
  --exclude='crash-reports/' \
  --exclude='cache/' \
  --exclude='libraries/' \
  --exclude='versions/' \
  --exclude='*.tar.gz' \
  --link-dest=/srv/backup/mcserver/2026-10-03 \
  /opt/mcserver/ \
  backup@backup.example.com:/srv/backup/mcserver/2026-10-04/
```

### 逐項解釋

| 選項 | 作用 |
| --- | --- |
| `-a` | 歸檔模式，等價於 `-rlptgoD`（遞迴、保留符號連結、權限、時間、屬組、裝置檔案） |
| `-H` | 保留硬連結（**服務端目錄裡若有硬連結，不加會把它們展開成多份**） |
| `-A` | 保留 ACL（訪問控制列表） |
| `-X` | 保留擴充屬性（xattr） |
| `--delete` | 刪除目標端"源端已不存在"的檔案，使目標與源保持一致。**這是雙刃劍**：源端誤刪會被同步過去 |
| `--numeric-ids` | 按數字 UID/GID 而不是按使用者名/組名對映。跨機器、目標端沒有同名使用者時**必須加** |
| `--info=progress2` | 顯示整體進度（rsync 3.1 及以上） |
| `--exclude` | 排除不需要備份的目錄 |
| `--link-dest=DIR` | **硬連結快照**：與 DIR 中內容相同的檔案不再複製，而是在目標裡建立硬連結，從而讓每個日期的目錄看起來都是完整副本，實際只佔增量空間 |

:::warn `-A` 和 `-X` 需要雙方支援
保留 ACL 與 xattr 需要 rsync 版本足夠新、目標檔案系統支援這些特性，並且**通常需要以 root 執行**才能讀取所有檔案的 ACL/xattr。若目標檔案系統（如部分網路儲存）不支援，rsync 會報錯或靜默丟棄。**不確定就先去掉 `-A -X`**。
:::

### 先 dry-run

**任何帶 `--delete` 的指令，第一次都必須先加 `-n`（`--dry-run`）跑一遍**：

```bash
rsync -aHAX --delete --numeric-ids -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ backup@backup.example.com:/srv/backup/mcserver/
```

`-n`（`--dry-run`）只顯示會做什麼而不實際改動，`-i`（`--itemize-changes`）逐項列出變化，便於確認 `--delete` 會刪掉什麼。**確認輸出裡沒有"意外要刪的東西"再去掉 `-n`。**

### SSH 免密登入

備份腳本要能無人值守執行，所以用金鑰登入：

```bash
ssh-keygen -t ed25519 -C "mc-backup@home"
ssh-copy-id backup@backup.example.com
ssh backup@backup.example.com 'echo ok'
```

`ssh-keygen -t ed25519` 生成 Ed25519 金鑰對，預設放在 `~/.ssh/id_ed25519`（私鑰）與 `~/.ssh/id_ed25519.pub`（公鑰）。**給私鑰設口令（passphrase）更安全，但定時任務就需要 ssh-agent 或 `keychain` 才能免互動；無人值守的備份機通常不設口令，因此必須嚴格限制它的權限。** `ssh-copy-id` 把公鑰追加到目標機的 `~/.ssh/authorized_keys`；**部分平台（如 Windows 的 OpenSSH 或某些精簡系統）可能沒有這個指令**，那就手動追加公鑰內容。建議在目標機的 `authorized_keys` 裡限制這把金鑰：

```text
from="203.0.113.10",command="/usr/bin/rrsync -wo /srv/backup/mcserver/",no-port-forwarding,no-pty ssh-ed25519 AAAA... mc-backup@home
```

`rrsync` 是 rsync 自帶的受限包裝腳本，只允許寫入指定目錄。**`rrsync` 的路徑與可用性隨發行版而不同**（Debian/Ubuntu 在 `rsync` 包裡，路徑可能是 `/usr/bin/rrsync`），用之前先確認。

### cron 示例

```cron
0 4 * * * /usr/local/bin/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

五個欄位依次是：分、時、日、月、星期，所以 `0 4 * * *` 表示**每天 04:00**；`>> /var/log/mc-backup.log 2>&1` 把標準輸出與標準錯誤都追加到日誌，便於事後檢查退出碼與報錯。**cron 的環境變數非常少（`PATH` 很短），腳本裡要用絕對路徑**；需要日誌輪轉就在 `/etc/logrotate.d/` 下加一條規則，否則日誌會一直增長。

## 4. 備份腳本骨架

下面是一份**可直接使用的 bash 骨架**：它先凍結寫入，打包世界與配置，清理過期歸檔，再 rsync 到異地，並把結果寫進日誌。

```bash
#!/usr/bin/env bash
# 异地备份脚本骨架。请按你的环境修改变量。
set -euo pipefail

SERVER_DIR="/opt/mcserver"                 # 服务端目录（末尾不要加斜杠）
BACKUP_ROOT="/srv/backup/mcserver"         # 本地备份根目录（建议与 SERVER_DIR 不同盘）
LOG_FILE="/var/log/mc-backup.log"
KEEP_DAYS=14                               # 本地归档保留天数
REMOTE="backup@backup.example.com:/srv/backup/mcserver"   # 异地目标

STAMP="$(date +%F_%H%M%S)"
ARCHIVE="${BACKUP_ROOT}/mcserver-${STAMP}.tar.gz"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

# 脚本自身的输出也写进日志，cron 里的重定向只是双保险
exec >>"${LOG_FILE}" 2>&1
log "=== backup start ${STAMP} ==="

[ -d "${SERVER_DIR}" ] || fail "server directory not found: ${SERVER_DIR}"
mkdir -p "${BACKUP_ROOT}"

# 停服备份最稳。若不能停服，改成向控制台发送 save-all / save-off，打包后再 save-on
START_AFTER=0
if systemctl is-active --quiet minecraft.service; then
    log "stopping minecraft.service for a consistent backup"
    systemctl stop minecraft.service
    START_AFTER=1
fi

tar -czf "${ARCHIVE}" \
    --exclude='logs' \
    --exclude='crash-reports' \
    --exclude='cache' \
    --exclude='libraries' \
    --exclude='versions' \
    --exclude='*.tar.gz' \
    -C "${SERVER_DIR}" .

[ -s "${ARCHIVE}" ] || fail "archive is missing or empty: ${ARCHIVE}"
log "archive created: ${ARCHIVE} ($(du -h "${ARCHIVE}" | cut -f1))"

# 保留最近 KEEP_DAYS 天的本地归档，其余删除（首次运行建议先去掉 -delete 确认范围）
find "${BACKUP_ROOT}" -maxdepth 1 -name 'mcserver-*.tar.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete

# 同步到异地。刻意不使用 --delete，避免本地误删被同步过去
rsync -aHAX --numeric-ids --info=progress2 "${BACKUP_ROOT}/" "${REMOTE}/"
log "offsite sync finished"

if [ "${START_AFTER}" -eq 1 ]; then
    log "starting minecraft.service again"
    systemctl start minecraft.service
fi

log "=== backup ok ${STAMP} ==="
exit 0
```

### 使用說明

```bash
sudo install -m 750 mc-backup.sh /usr/local/bin/mc-backup.sh
sudo /usr/local/bin/mc-backup.sh
tail -20 /var/log/mc-backup.log
```

幾點必須知道的：

- `set -euo pipefail` 讓腳本**遇到錯誤立刻退出**，避免"備份失敗了但腳本繼續跑、最後報成功"。
- **停服備份是最穩的**；若不能停服，把 `systemctl stop` 換成向控制台傳送 `save-all` / `save-off`，打包完成後 `save-on`（見第 2 節）。
- `find ... -mtime "+${KEEP_DAYS}" -delete` **先列印再刪除**，第一次執行建議先把 `-delete` 去掉，確認匹配到的檔案是對的。
- **異地同步用追加而不是 `--delete`**，否則本地歸檔被誤刪時異地副本會同步消失。若你確實想要映像式同步，請確保本地刪除邏輯絕對可靠。
- `systemctl` 的 unit 名、`tar` 的排除路徑都要按你的實際目錄調整；**`tar` 的 `--exclude` 匹配的是歸檔內路徑，寫法與 rsync 不完全相同**。需要 GFS 式保留（每日/每週/每月）時，改用 restic 的 `forget --keep-*` 比手寫 `find` 更省事。

:::warn 腳本裡的 `--delete` 一定要想清楚
`rsync --delete` 讓目標端與源端完全一致。**如果源端因為權限、掛載失敗或路徑寫錯而變成空目錄，`--delete` 會把異地副本也清空。** 這是備份事故的經典成因。
:::

## 5. 其他工具與選擇

### restic：去重、加密、快照

restic 是寫快照式的備份工具，**自帶去重與加密**，適合"想保留很多歷史版本但不想佔很多空間"的場景。

```bash
# 1. 初始化仓库（只需一次）
export RESTIC_REPOSITORY="sftp:backup@backup.example.com:/srv/restic/mcserver"
export RESTIC_PASSWORD_FILE="/root/.config/restic/mcserver.pass"
restic init

# 2. 备份
restic -r "${RESTIC_REPOSITORY}" backup /opt/mcserver

# 3. 查看快照
restic snapshots

# 4. 保留策略：7 个每日、4 个每周，然后清理未引用的数据
restic forget --keep-daily 7 --keep-weekly 4 --prune
```

`RESTIC_PASSWORD_FILE` 指向一個 **`chmod 600` 的口令檔案**，不要寫進腳本。`restic forget` 只刪快照引用，**必須加 `--prune` 才真正回收空間**，而 `--prune` 耗時較長，建議放在維護視窗。恢復用 `restic restore latest --target /tmp/restore-test`。倉庫可以放在本地目錄、SFTP、S3 相容儲存等多種後端上（**後端支援列表以官方文件為準**）。

### rclone：雲端儲存同步

rclone 是"雲端儲存的 rsync"，支援大量物件儲存與網盤後端。

```bash
# 1. 交互式配置一个远端，名字例如 myremote
rclone config

# 2. 同步本地目录到远端（会删除远端多余文件，注意方向与语义）
rclone sync /srv/backup/mcserver myremote:mcserver-backup --progress

# 3. 校验两端一致
rclone check /srv/backup/mcserver myremote:mcserver-backup
```

`rclone sync` 讓目標與源**完全一致**，會刪除目標端多餘檔案；只想追加就用 `rclone copy`。`rclone check` 比較兩端檔案（預設比較大小與雜湊，**是否支援雜湊取決於後端**）。`rclone config` 是互動式的，無介面環境也可以手工寫設定檔（`rclone config file` 檢視路徑）；憑據就存在該檔案裡，**權限要收緊到 `chmod 600`**。

### 純 tar + scp

最簡單的組合，沒有任何額外依賴：

```bash
tar -czf /tmp/mcserver-$(date +%F).tar.gz -C /opt/mcserver .
scp /tmp/mcserver-$(date +%F).tar.gz backup@backup.example.com:/srv/backup/
```

適合**資料量很小、備份頻率很低**的場景。缺點是：**每次全量傳輸、沒有去重、沒有加密（除了 SSH 通道）、沒有校驗**，資料一大就不可用。

### 對比

| 工具 | 去重 | 加密 | 增量 | 雲支援 | 複雜度 | 適合 |
| --- | --- | --- | --- | --- | --- | --- |
| **rsync** | 否（靠 `--link-dest` 省空間） | 否（依賴 SSH 通道） | 是（按檔案） | 需掛載或配合其他工具 | 低 | 有 SSH 目標、結構簡單的目錄 |
| **restic** | **是** | **是（內建）** | 是（按塊） | 多種後端（S3、SFTP 等） | 中 | 想留很多歷史版本、需要加密 |
| **rclone** | 否 | 傳輸加密取決於後端 | 是（按檔案） | **最廣** | 中 | 目標是網盤/物件儲存 |
| **tar + scp** | 否 | 否 | 否（全量） | 需目標可 scp | **最低** | 資料量小、偶發備份 |

## 6. 加密與金鑰管理

**異地副本必須加密。** 副本放在別人的儲存上，等於把資料交給第三方；物件儲存的金鑰洩露、共享連結配錯、雲帳號被盜，都會直接暴露存檔（裡面往往還有玩家 IP、聊天記錄、可能的隱私資訊）。

- **restic 自帶加密**：倉庫用口令派生金鑰，**口令丟了資料就永久打不開**；**rsync / rclone / tar+scp 本身不加密內容**，要麼依賴傳輸層（SSH、HTTPS），要麼自己先加密：

```bash
# 用 gpg 对称加密一个归档（会交互式输入口令）
gpg --symmetric --cipher-algo AES256 mcserver-2026-10-04.tar.gz

# 解密
gpg --decrypt mcserver-2026-10-04.tar.gz.gpg > mcserver-2026-10-04.tar.gz
```

### 口令放在哪裡

**絕不放在備份倉庫/目標儲存本身**，也**不要和備份腳本放在同一個可寫目錄裡**。可接受的做法是**記在密碼管理器裡**（人可讀），並**放在備份機上權限嚴格的檔案裡**（腳本可讀）：

```bash
sudo install -d -m 700 -o root -g root /root/.config/restic
sudo sh -c 'printf "%s" "你的口令" > /root/.config/restic/mcserver.pass'
sudo chmod 600 /root/.config/restic/mcserver.pass
sudo chown root:root /root/.config/restic/mcserver.pass
```

**口令要有一份離線記錄**（寫在紙上鎖起來、或放在另一台裝置的密碼管理器裡）。**加密備份 + 丟失口令 = 資料全丟**，而且比沒加密更徹底。金鑰檔案（SSH 私鑰、rclone 配置）同樣 `chmod 600`，並且**只給備份專用的最小權限帳號**。

:::warn 加密不是"設了密碼就完事"
口令強度、口令保管、金鑰輪換都要考慮。**一個寫在腳本裡的弱口令，安全性約等於零。** 另外：加密後**壓縮率會下降**（密文不可壓縮），先壓縮再加密。
:::

## 7. 雲端與物件儲存目標

| 類型 | 例子 | 特點 |
| --- | --- | --- |
| 另一台機器 / NAS | 朋友家的 NAS、第二台 VPS | 便宜、可控，但要自己維護 |
| S3 相容物件儲存 | 各類 S3 相容服務、自建 MinIO | 標準 API，restic/rclone 直接支援 |
| 冷儲存 / 歸檔儲存 | 各家"歸檔""冷"級別 | **單價極低，取回慢且可能按取回量計費** |
| 網盤 | rclone 支援的網盤後端 | 便宜甚至免費，但**限速、可能封號、不適合作為唯一副本** |

### 必須注意的成本陷阱

- **出口流量費（egress）**：很多物件儲存**上傳免費、下載收費**。恢復一次幾百 GB 的備份可能比存一年還貴。**買之前先看計價頁的取回與出口價格。**
- **請求費**：按請求數計費的後端，小檔案多時費用會上升。
- **最低儲存時長**：部分歸檔級別要求資料至少存 30/90/180 天，提前刪除仍按整段收費。
- **取回延遲**：歸檔級別的恢復可能需要數小時，**不適合"出事了馬上要恢復"**，建議至少保留一份"能立即恢復"的副本。

### 生命週期與保留規則

物件儲存通常支援**生命週期規則（lifecycle rule）**，用來把超過 N 天的物件**轉到更便宜的儲存級別**、在 N 天后**自動刪除**以實現保留策略，以及清理未完成的分片上傳（multipart upload）殘留——**後者是隱藏費用的常見來源**。**具體規則語法、支援的級別名稱與最短期限隨服務商不同，以各服務商文件為準**，不要照搬別家的示例。

## 8. 保留策略設計

### 保留多少份

| 層級 | 常見數量 | 用途 |
| --- | --- | --- |
| 每日 | 7 - 14 份 | 應對"昨天/前天寫壞了" |
| 每週 | 4 - 8 份 | 應對"幾週後才發現的問題" |
| 每月 / 每年 | 每月 6 - 12 份、每年 1 - 3 份 | 長期留檔、應對緩慢發生的損壞 |

原則：**"能覆蓋你發現問題所需的最長時間"**。存檔損壞往往**不是當天就被發現的**，所以要留足夠久。

### 磁碟空間估算

設世界大小為 `W`，壓縮後約為 `0.4W - 0.7W`（**壓縮率取決於內容，region 檔案壓縮效果一般，實測為準**）。

| 方案 | 空間佔用 |
| --- | --- |
| 每次獨立 `tar.gz`，保留 `N` 份 | 約 `N x 0.5W` |
| rsync `--link-dest` 硬連結快照 | 約 `0.5W + delta x (N-1)`，**變化量才是關鍵** |
| restic 去重快照 | 與硬連結快照同量級或更省，取決於去重粒度 |

例子：世界 5 GB，保留 14 份獨立歸檔，按 0.5 壓縮率約需 `14 x 2.5 = 35 GB`；換成 `--link-dest` 快照，若每天變化 100 MB，則約 `2.5 GB + 13 x 0.1 GB = 3.8 GB`。**差距很大，值得為此改用快照方案。**

### 安全地清理舊備份

- **絕不在驗證新備份可用之前刪除舊備份**。順序永遠是：**生成新備份 -> 校驗新備份 -> 確認無誤 -> 才清理舊備份**。
- **保留至少一份"最老但已知可用"的副本**（應對"損壞已經存在很久"），清理動作**先 dry-run 或先列印檔案列表**確認匹配範圍。
- 異地端的清理**要比本地更保守**（多留幾份、延後刪除），因為異地副本是最後一道防線。

:::warn 自動清理是"刪資料的自動化"
一個寫錯的 `find ... -delete` 或 `--delete` 可能一次清掉所有歷史。**任何清理邏輯上線前都要在測試目錄上跑一遍，並確認它不會匹配到不該刪的檔案。**
:::

## 9. 維護

### 沒恢復過的備份不算備份

這條規則怎麼強調都不過分。**備份腳本每天"成功"執行，和備份真的能恢復，是兩件完全不同的事。** 常見情況是：腳本因為權限、路徑、磁碟滿而失敗了幾週，沒人發現；或者打包出來的歸檔是空的；或者加密口令早就不對了。

### 季度恢復演練流程

1. **選一份副本**：最好選**異地副本**，這樣連"傳輸過程有沒有壞"一起驗證。
2. **恢復到一個隔離的測試目錄**，絕不覆蓋生產目錄：

```bash
mkdir -p /tmp/restore-test
tar -xzf /srv/backup/mcserver/mcserver-2026-10-04_040001.tar.gz -C /tmp/restore-test
ls -la /tmp/restore-test
```

3. **檢查關鍵檔案是否存在且非空**：`world/level.dat`、`server.properties`、`plugins/` 下的配置。
4. **用不同埠啟動測試實例**：複製一份測試目錄，把 `server.properties` 裡的埠改成別的值（例如 `server-port=25566`、`query.port=25566`、`rcon.port=25567`），啟動並觀察日誌；進服後檢查關鍵建築、容器內容、玩家背包與權限，確認沒有區塊或存檔相關報錯。
5. **記錄並清理**：寫下演練日期、用時與遇到的問題（**這是你唯一能證明備份可用的證據**），然後刪掉測試實例，保留記錄。

:::tip 把恢復步驟寫成文件
出事當天不是研究"怎麼恢復"的時候。**提前把指令寫成一頁紙**，演練時照著走、發現問題就更新它。
:::

### 校驗完整性

| 手段 | 指令 | 說明 |
| --- | --- | --- |
| restic 倉庫檢查 | `restic check` | 校驗倉庫結構與元資料；加 `--read-data` 會**讀取全部資料塊**，慢但更徹底 |
| 列出 tar 內容 | `tar -tzf archive.tar.gz >/dev/null` | 讀取並解壓列表，能發現**截斷或損壞的歸檔** |
| 校驗和比對 | `sha256sum archive.tar.gz` | 與備份時記錄的雜湊比對，確認傳輸後內容一致 |
| rclone 校驗 | `rclone check src dst` | 比較兩端檔案（能力取決於後端是否支援雜湊） |
| 試解壓 | `tar -xzf archive.tar.gz -C /tmp/check` | 最直接的驗證：能不能真的解出來 |

**校驗和要單獨儲存**（例如隨歸檔寫一個 `.sha256` 檔案），否則"用備份自己的雜湊校驗備份"沒有意義。

### 監控備份是否真的跑了

**看退出碼**（cron 失敗時日誌裡會有非 0 退出碼；`set -e` 的腳本遇到錯誤會提前退出）、**看日誌**（`tail -20 /var/log/mc-backup.log` 確認最後一行是成功標記）、**看產物**（新歸檔的時間戳是今天，大小在合理範圍，不是 0 位元組也不是異常小）。更重要的是**主動告警**：讓腳本失敗時發郵件或發訊息（`mail`、`curl` 調 Webhook 等）。**"沒有訊息"不等於"一切正常"**，最好做**心跳式監控**——每天成功就上報一次，沒上報就告警。

### 常見失敗原因

| 現象 | 常見原因 | 排查方向 |
| --- | --- | --- |
| 磁碟滿 / 歸檔 0 位元組 | 本地備份盤寫滿、保留策略沒生效 | `df -h`、檢查清理邏輯 |
| SSH 認證失敗 | 金鑰被換、`authorized_keys` 權限不對、帳號被鎖 | 手動跑一次 `ssh backup@host 'echo ok'` |
| 主機金鑰變更告警 | 目標機重灌或 IP 複用，`known_hosts` 記錄過期 | **先確認對方身份**，再更新 `known_hosts` |
| 權限錯誤（Permission denied） | 備份帳號讀不到原始檔、目標目錄不可寫 | 檢查目錄權限與屬主，必要時用 root 跑 |
| 憑據過期 / 加密口令不對 | 雲端儲存金鑰到期；口令輪換後腳本沒更新 | 更新金鑰，並手動 `restic snapshots` 驗證 |
| 歸檔內容不完整 | 忘了 `save-off`、`--exclude` 寫錯排除了關鍵目錄 | 用 `tar -tzf` 列內容核對 |
| 同步把好資料刪了 | 源端路徑寫錯 + `--delete` | 立即停用同步，從更早的副本恢復 |

:::warn 報錯日誌要看，不要只看"有沒有檔案生成"
檔案生成 ≠ 內容正確。**歸檔大小、退出碼、校驗和，三者至少要檢查兩項。**
:::

## 10. 檢查清單

| 專案 | 要求 | 檢查頻率 |
| --- | --- | --- |
| 3-2-1 覆蓋 | 至少 3 份副本、2 種介質、1 份異地 | 每季度複核 |
| 備份範圍 | 世界、配置、名單、插件/模組與配置、啟動腳本 | 每次改配置後 |
| 一致性 | 停服備份，或 `save-all` + `save-off` -> 打包 -> `save-on` | 每次備份 |
| 自動化 | cron / systemd timer 定時執行，有日誌 | 部署時 |
| 加密與權限 | 異地副本加密、口令離線留存、口令與私鑰 `chmod 600`、帳號最小權限 | 每季度複核 |
| 保留策略 | 每日/每週/每月份數明確，清理邏輯經過測試 | 每季度複核 |
| 空間 | 本地與異地剩餘空間充足 | 每週 |
| 校驗 | `restic check` / `tar -tzf` / 校驗和比對通過 | 每月 |
| 監控 | 失敗會告警，成功有心跳 | 部署時，每月複核 |
| 恢復演練 | 恢復到測試目錄並用不同埠啟動驗證 | **每季度** |
| 異地可用性 | 確認能下載/恢復，出口費用可接受 | 每季度 |
| 文件 | 恢復步驟、口令位置、目標位址有書面記錄 | 每半年 |

## 11. 小結

- **同盤備份不算備份**：真正救命的副本必須在別處，而且最好不可被遠端刪除。
- **一致性優先於速度**：不在服務端寫盤時複製。
- **加密 + 口令離線留存**：異地副本必須加密，口令丟了就全丟了。
- **保留策略要經過測試**：清理邏輯是"刪資料的自動化"，上線前必須驗證。
- **每季度真的恢復一次**：這是唯一能證明備份有效的方法。

配套閱讀：[備份與恢復](/tutorials/java/backup)（備份範圍與回檔流程）、[服務端結構](/tutorials/java/structure)（哪些檔案該備）、[家用電腦開服與維護](/tutorials/ops/home-hosting)（硬體與供電風險）。

> 指令與配置以各軟體官方文件為準；物件儲存的計價、生命週期規則與取回策略以各服務商文件為準。
