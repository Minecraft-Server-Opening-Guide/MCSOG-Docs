---
title: Vận hành tự động hóa
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [tự động hóa, script sao lưu, systemd, cron, Ansible, CI/CD, vận hành]
updated: 2026-10-04
draft: false
---

Mục tiêu của vận hành tự động hóa không phải "trông chuyên nghiệp", mà là **biến hành động lặp lại thành hành động không thể quên, không thể làm sai**. Trong các nguyên nhân khiến máy chủ gặp sự cố, thứ đứng đầu thường không phải "kỹ thuật quá khó", mà là "việc này tôi quên làm" "lần trước làm sót một bước" "ba giờ sáng làm thì run tay".

Bài này nói cách giao việc sao lưu, khởi động lại, cập nhật, dọn nhật ký và kiểm tra sức khỏe cho script và bộ hẹn giờ, cùng **những việc không được giao cho chúng**. Các bài liên quan: chiến lược sao lưu xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup), vấn đề hiệu năng xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark), quy trình cập nhật xem [Cập nhật và bảo trì máy chủ, plugin và MCDR](/tutorials/ops/updates), cảnh báo xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).

:::warn Lệnh và cấu hình lấy tài liệu chính thức của hệ thống và phần mềm bạn dùng làm chuẩn
**Tên gói, đường dẫn, người dùng và nhóm, tên dịch vụ, tham số module và tùy chọn systemd** xuất hiện dưới đây đều thay đổi theo **bản phân phối, phiên bản phần mềm và cách cài đặt**. Ví dụ ở đây nói rõ "nên viết gì, vì sao viết như vậy", **không phải sản phẩm copy-paste được**. Trước khi áp dụng hãy đối chiếu tài liệu của bản phân phối bạn dùng, tài liệu chính thức của máy chủ và plugin, cùng sổ tay chính thức của Ansible, systemd, cron (`man 5 crontab`, `man systemd.timer`, `man systemd.service`).
:::

## 1. Tự động hóa cái gì trước

Tiêu chuẩn phán đoán rất đơn giản: **việc này có cần "làm lặp lại theo thời gian" không?** Có thì đáng tự động hóa; không thì đừng động vào vội.

| Nhiệm vụ | Tần suất | Cách tự động hóa | Rủi ro |
| --- | --- | --- | --- |
| Sao lưu thế giới và cấu hình | Mỗi ngày / mỗi 6 giờ | cron hoặc systemd timer + script | Thấp (nhưng **bản sao lưu chưa kiểm chứng thì coi như không có**) |
| Đồng bộ ngoài vị trí | Mỗi ngày | `rsync` + khóa SSH | Trung bình (phía đích bị ghi đầy hoặc bị ghi đè) |
| Khởi động lại định giờ | Mỗi ngày / mỗi tuần | cron hoặc systemd timer | Thấp (nhưng **khởi động lại không phải cách giải quyết lag**) |
| Dọn và luân chuyển nhật ký | Mỗi ngày / mỗi tuần | `logrotate` hoặc script | Trung bình (xóa nhầm thư mục là không thể đảo ngược) |
| Kiểm tra sức khỏe và tự phục hồi | Mỗi phút / mỗi 5 phút | Script + bộ hẹn giờ + cảnh báo | Trung bình (**khởi động lại liên tục sẽ che lấp vấn đề thật**) |
| Kiểm tra cập nhật (chỉ thông báo) | Mỗi ngày | Script + thông báo | Thấp |
| Thực thi cập nhật (kèm quay lui) | Kích hoạt thủ công | Script + xác nhận của người | **Cao** (sẽ đổi tệp nhị phân và cấu hình) |
| Nâng cấp plugin | Thủ công | Kiểm chứng trên máy chủ thử trước | **Cao** (định dạng cấu hình và phụ thuộc sẽ đổi) |
| Nâng cấp phiên bản game | Thủ công | Thực hiện theo hướng dẫn nâng cấp chính thức | **Cao nhất** (định dạng thế giới có thể đổi một chiều) |
| Xóa bản lưu, xóa dữ liệu người chơi, reset thế giới | Tuyệt đối không tự động | Chỉ cho phép người thực hiện | **Không thể đảo ngược** |

Kết luận: **giá trị của tự động hóa tập trung ở các hành động "rủi ro thấp, tần suất cao, thuần máy móc"**; hành động càng rủi ro thì càng nên dùng tự động hóa vào các khâu "kiểm tra, chuẩn bị, kiểm chứng, quay lui", chứ không phải "thực thi trực tiếp".

## 2. Những việc không nên tự động hóa mù quáng

**Nâng cấp phiên bản game.** Nâng qua phiên bản lớn thường đi kèm **chuyển đổi định dạng dữ liệu thế giới một chiều**. Phiên bản mới một khi đã mở và lưu thế giới, quay về phiên bản cũ thường không còn khả thi. Loại thao tác này bắt buộc phải do người xác nhận, và **sao lưu trước, thử trên bản sao trước**.

**Nâng cấp plugin chưa được kiểm thử.** Phụ thuộc của plugin (các phụ thuộc như Vault, PlaceholderAPI, ProtocolLib, LuckPerms) và định dạng cấu hình sẽ thay đổi theo phiên bản. Kết cục điển hình của nâng cấp tự động là: đêm cập nhật xong, sáng người chơi không vào được, mà bạn không biết plugin nào gây ra.

**Mọi thao tác không thể đảo ngược.** Xóa, ghi đè, xóa sạch, di chuyển, `rm -rf`, `DROP` cơ sở dữ liệu. Những hành động này có thể được script **chuẩn bị** (liệt kê nội dung sẽ bị xóa, tạo danh sách chờ xác nhận), nhưng không nên để bộ hẹn giờ **thực thi trực tiếp**.

**Script bạn chưa từng đọc hiểu.** Chép một đoạn shell trên mạng mà không hiểu, rồi gắn root và bộ hẹn giờ, tức là tự chôn một quả mìn không biết khi nào nổ.

:::warn Sức phá hoại của tự động hóa được "tự động khuếch đại"
Người thao tác sai, phạm vi ảnh hưởng là lần đó; lỗi của tự động hóa sẽ **lặp lại theo tần suất** —— một script dọn dẹp viết sai thư mục sẽ xóa mỗi ngày một lần, một kiểm tra sức khỏe viết ngược điều kiện sẽ khởi động lại mỗi phút một lần. **Trước hết hãy để script chạy đủ lâu ở chế độ chỉ đọc, xác nhận phán đoán của nó đúng, rồi mới cấp quyền ghi cho nó.**
:::

## 3. Vệ sinh script

Cùng một script, viết tốt hay viết dở khác nhau không ở tính năng, mà ở **khi có sự cố bạn có hiểu được chuyện gì đã xảy ra không**.

### 3.1 Ba việc ở đầu script

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **shebang**: `#!/usr/bin/env bash` dễ chuyển nền tảng hơn `#!/bin/bash` (sẽ tìm bash trong `PATH`). **Lưu ý**: `sh` không bảo đảm hỗ trợ cú pháp bash dùng bên dưới, nên đừng dùng `#!/bin/sh`.
- **`set -e`**: lệnh thất bại là thoát ngay, tránh "bước trước thất bại vẫn chạy tiếp".
- **`set -u`**: tham chiếu biến chưa định nghĩa thì báo lỗi và thoát. Một trong những bug nguy hiểm nhất là biến rỗng khiến `rm -rf "$DIR/"` thành `rm -rf /`.
- **`set -o pipefail`**: bất kỳ mắt nào trong ống lệnh thất bại đều tính là thất bại. Không có nó, trong `tar ... | gzip ...` thì tar báo lỗi vẫn có thể bị coi là thành công.

### 3.2 Nhật ký, mã thoát và tính idempotent

**Nhật ký bắt buộc phải có dấu thời gian, đừng chỉ dùng `echo`**: nhật ký không có dấu thời gian có giá trị rất thấp khi truy nguyên, bạn không biết "sao lưu thất bại" là hôm nay hay tuần trước.

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

Nếu script do systemd quản lý, cũng có thể không tự thêm dấu thời gian, đổi sang dùng `journalctl` (có sẵn dấu thời gian và luân chuyển), **nhưng đừng trộn hai cách**.

**Mã thoát phải có ý nghĩa**: `0` thành công, khác 0 nghĩa là thất bại, và **phân biệt các nguyên nhân thất bại khác nhau**, như vậy cảnh báo mới có thông tin —— `1` lỗi chung, `2` lỗi cách dùng, `3` thiếu phụ thuộc, `4` khóa đang bị chiếm (lần trước còn chạy), `5` kiểm chứng dữ liệu thất bại.

**Tính idempotent**: script idempotent có thể chạy lặp lại với kết quả như nhau, đây là tính chất quan trọng nhất của tự động hóa —— dùng `mkdir -p` chứ không phải `mkdir`, ghi đè chứ không nối thêm (trừ nhật ký), dùng "kiểm tra rồi hành động" chứ không "giả định đã sẵn sàng". **Script không idempotent sẽ phá dữ liệu khi thử lại**, mà thử lại là chuyện thường (máy khởi động lại, cron chạy bù, bạn tự chạy lại một lần).

### 3.3 Dấu nháy, `--dry-run` và quản lý phiên bản

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

Biến luôn viết `"$VAR"` chứ không phải `$VAR`, nếu không đường dẫn có dấu cách sẽ bị tách thành nhiều tham số; `${VAR:?message}` khi biến rỗng hoặc chưa đặt sẽ **báo lỗi và thoát ngay**, đây là lớp bảo hiểm rẻ nhất chống xóa nhầm. Thêm cho script một chế độ "chỉ in không thực thi" là biện pháp an toàn có chi phí thấp nhất.

**Script phải được đưa vào quản lý phiên bản**: đặt script vào kho Git, lý do không phải "cho đúng chuẩn", mà là bạn thấy được **lần trước đã đổi cái gì**, đổi xong thì từ khi nào bắt đầu có vấn đề; xóa nhầm thì khôi phục được; nhiều máy chủ dùng chung một bản script, thay vì mỗi máy tiến hóa thành ba bản hơi khác nhau. Trong kho nên có script, systemd unit, đoạn cron, playbook Ansible và một README ghi phụ thuộc, **nhưng tuyệt đối không được chứa khóa bí mật** (xem mục 9).

## 4. Một script sao lưu hoàn chỉnh

Script dưới đây dùng hết các nguyên tắc ở trên: **file khóa chống chồng lấn, RCON tắt ghi bản lưu, bản lưu trữ có ngày, kiểm chứng, chính sách giữ, đồng bộ ngoài vị trí**.

```bash
#!/usr/bin/env bash
set -euo pipefail
# Script sao lưu máy chủ Minecraft (Linux). Cách dùng: ./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # để trống nghĩa là không dùng RCON
OFFSITE_TARGET=""                           # ví dụ: backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# Kiểm tra điều kiện tiên quyết
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "thiếu lệnh: $cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "thư mục máy chủ không tồn tại: $SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "đã cấu hình RCON nhưng không tìm thấy mcrcon" 3
fi
# Khóa: tránh chồng lấn khi lần trước chưa chạy xong
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "không tạo được file khóa: $LOCK" 3
if ! flock -n 9; then log WARN "lần sao lưu trước vẫn đang chạy, lần này bỏ qua"; exit 4; fi
# Dù thoát thế nào cũng phải bật lại việc ghi bản lưu
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on thất bại, hãy tự xác nhận việc ghi bản lưu đã được bật lại"
  fi
}
trap cleanup EXIT
log INFO "bắt đầu sao lưu: ${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"

# 1) Tắt tự động lưu (khuyến nghị dùng RCON; khi không dùng RCON có thể gửi lệnh qua screen, ví dụ
#    screen -S minecraft -p 0 -X stuff 'save-off\n', sau đó nhớ gửi lại save-on)
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "đã thực hiện save-off và save-all flush"; sleep 5
  else
    log WARN "RCON không dùng được, bỏ qua save-off, tiếp tục sao lưu"
  fi
else
  log WARN "chưa cấu hình RCON, bỏ qua save-off"
fi

# 2) Kiểm tra thư mục thế giới tồn tại, tránh đóng gói ra một bản lưu trữ rỗng
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "bỏ qua thư mục không tồn tại: ${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "không có thư mục thế giới nào tồn tại, dừng lại" 5
# 3) Đóng gói (có pigz thì dùng nó để nén song song)
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) Kiểm chứng bản lưu trữ đọc được (bước này quyết định "bản sao lưu có tồn tại hay không")
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "kiểm chứng bản lưu trữ thất bại: $TARBALL" 5
  log INFO "kiểm chứng bản lưu trữ đạt: $(du -h "$TARBALL" | cut -f1)"
fi
# 5) Chính sách giữ và ngưỡng dung lượng tối thiểu
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "dung lượng còn lại ${FREE_GB}G thấp hơn ngưỡng ${MIN_FREE_GB}G"
# 6) Đồng bộ ngoài vị trí (rsync thất bại trả mã lỗi, kết hợp set -e là lộ ra ngay)
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "đồng bộ ra ngoài vị trí: ${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "sao lưu xong: ${TARBALL}"
```

Thiết kế then chốt: **`flock -n 9`** khiến lần trước chưa chạy xong thì bỏ qua luôn, thay vì chạy song song hai bản sao lưu làm đầy đĩa và I/O; **`trap cleanup EXIT`** bảo đảm dù script thoát thế nào cũng cố gắng bật lại `save-on`, nếu không **máy chủ sẽ không ghi đĩa mãi**, đây là sự cố rất khó thấy; **`save-all flush` rồi `sleep 5`** cho máy chủ thời gian ghi các chunk trong bộ nhớ xuống đĩa; **kiểm chứng bằng `tar -tzf`** là tiêu chí duy nhất của "bản sao lưu có hiệu lực hay không"; **`--delete-after`** truyền xong mới xóa tệp cũ, tránh truyền thất bại làm phía ngoài vị trí bị xóa sạch; **`${STATE_DIRECTORY:-/run/lock}`** tương thích với `StateDirectory=` của systemd (xem 4.2), khi chạy thủ công thì lùi về `/run/lock`.

:::tip Bản sao lưu phải định kỳ làm một lần "diễn tập khôi phục"
Script thành công mỗi ngày không có nghĩa bản sao lưu dùng được. Định kỳ **thực sự giải nén và khởi động một lần trên máy kiểm thử hoặc thư mục tạm**. Quy trình khôi phục xem [Sao lưu và khôi phục](/tutorials/java/backup), ý nghĩa của bản sao ngoài vị trí xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
:::

### 4.1 Cách viết cron tương ứng

```ini
# /etc/cron.d/mc-backup
# phút giờ ngày tháng thứ   người dùng       lệnh
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**Môi trường của cron hoàn toàn khác shell bạn đăng nhập**: `PATH` rất ngắn, `HOME` có thể không phải cái bạn nghĩ, nên phải đặt rõ `SHELL` và `PATH` trong crontab, trong script cũng cố gắng dùng đường dẫn tuyệt đối; **bắt buộc phải chuyển hướng `>> log 2>&1`**, nếu không đầu ra sẽ vào email (nhiều máy không có hệ thống email, tức là hố đen); tệp trong `/etc/cron.d/` **cần trường tên người dùng**, còn `crontab -e` ghi bảng của người dùng hiện tại, **không có trường tên người dùng**, đây là lỗi cú pháp cron phổ biến nhất; **cron không "chạy bù" nhiệm vụ bị lỡ**, máy tắt lúc 4:30 thì lần sao lưu đó sẽ không xảy ra.

### 4.2 systemd timer + service tương đương

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
# Script cần đọc thư mục máy chủ, ghi thư mục sao lưu
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
# Máy tắt đúng lúc điểm hẹn thì chạy bù một lần sau khi bật máy
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

Hai chỗ dễ giẫm: **thứ và tháng trong `OnCalendar` dùng chữ viết tắt tiếng Anh** (`Mon`, `Sun`, `Jan`), thời gian mặc định được hiểu theo múi giờ địa phương, đổi múi giờ thì thời điểm kích hoạt cũng đổi theo (cú pháp xem `man systemd.time`); **`ProtectSystem=strict` sẽ mount toàn bộ hệ thống tệp thành chỉ đọc**, đường dẫn ghi được chỉ có `StateDirectory`, `CacheDirectory`, `LogsDirectory`, `RuntimeDirectory` và các `ReadWritePaths` liệt kê rõ —— script muốn ghi chỗ khác thì bắt buộc phải thêm vào, nếu không bạn sẽ thấy "quyền rõ ràng đúng mà vẫn không ghi được".

:::tip Chọn cron hay systemd timer
Chỉ là "mỗi ngày chạy một script": cả hai đều được, chọn cái bạn quen hơn. Cần **tập trung nhật ký, chạy bù sau khi bật máy, giới hạn tài nguyên, thử lại khi thất bại**: chọn systemd timer. Cần **nhất quán giữa các bản phân phối** (gồm BSD, container): cron phổ quát hơn.
:::

## 5. Khởi động lại định giờ

Khởi động lại định giờ là thao tác thường ngày của nhiều máy chủ, nhưng phải nói rõ trước: **khởi động lại không phải cách giải quyết lag.** Khởi động lại xử lý được rò rỉ bộ nhớ chậm, trạng thái tạm tích lũy sau thời gian dài chạy, một lỗi nhỏ của plugin nào đó; **không** xử lý được TPS thấp, nạp chunk chậm, người chơi lag —— những thứ đó phải tìm nguyên nhân, xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark); còn "mỗi ngày sập một lần nên mỗi ngày khởi động lại một lần" sẽ khiến **sự cố thật không bao giờ được phát hiện**.

Khi đã xác định cần khởi động lại định giờ, quy trình bắt buộc phải có **thông báo trước**:

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # cách an toàn hơn là đọc từ tệp có quyền hạn chế hoặc biến môi trường
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say Máy chủ sẽ khởi động lại sau 5 phút, hãy lưu tiến độ kịp thời"
sleep 240
rcon "say Máy chủ sẽ khởi động lại sau 1 phút"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "khởi động lại ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# Tệp một: /etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# Tệp hai: /etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

Nếu bạn dùng bảng điều khiển (Pterodactyl, AMP, MCSManager, v.v.), **ưu tiên dùng lịch khởi động lại có sẵn của bảng điều khiển**, vì bảng điều khiển biết cách dừng tiến trình một cách êm ái; dùng script `kill` thẳng tiến trình do bảng điều khiển quản lý có thể làm trạng thái bảng điều khiển rối loạn. So sánh bảng điều khiển xem [Bảng điều khiển máy chủ](/tutorials/ops/panels).

:::warn Đừng dùng kill -9 để dừng máy chủ
Giết cưỡng bức tiến trình có thể khiến thế giới **không kịp lưu**, hoặc bị ngắt giữa lúc đang ghi. Thứ tự đúng luôn là: `save-all flush` → dừng bình thường (lệnh `stop` hoặc `systemctl stop`) → chờ tiến trình thoát. Chỉ khi tiến trình treo hẳn mới cân nhắc kết thúc cưỡng bức, và **sau đó kiểm tra tính toàn vẹn của bản lưu**.
:::

## 6. Tự động hóa cập nhật phải làm thế nào mới an toàn

Cập nhật là loại rủi ro cao nhất trong tự động hóa. Cách làm khả thi là **dùng tự động hóa vào "chuẩn bị và kiểm chứng", để việc thực thi cho người xác nhận**: kiểm tra phiên bản mới (tự động, chỉ thông báo) → tải về `staging/` (tự động, **đừng ghi đè thẳng jar đang chạy**) → kiểm chứng hash chính thức (tự động) → sao lưu và xác nhận bản lưu trữ đọc được (tự động) → chuyển đổi (sau khi người xác nhận, jar cũ đổi tên giữ lại) → khởi động lại và kiểm chứng cổng, nhật ký và việc tải plugin → thất bại thì đổi về jar cũ và **cảnh báo**.

Một bộ kiểm tra chỉ làm "kiểm tra và tải về" là tự động hóa có giá trị nhất, vì nó không có sức phá hoại:

```bash
#!/usr/bin/env bash
set -euo pipefail
# Chỉ kiểm tra và tải về, không thay thế, không khởi động lại
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # thay bằng địa chỉ chính thức
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # thay bằng địa chỉ checksum chính thức
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) Tải về thư mục tạm
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) Kiểm chứng (bắt buộc dùng hash do chính thức phát hành)
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "checksum không khớp, hủy bản tải về"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) So với phiên bản hiện tại, chỉ báo cáo
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "đã là phiên bản mới nhất"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "phát hiện phiên bản mới, đã đặt vào thư mục tạm, chờ người xác nhận rồi chuyển đổi"
fi
```

**Nguyên tắc then chốt: tự động hóa chỉ chịu trách nhiệm "chuẩn bị đồ và nói rõ", việc thay thế và khởi động lại do người bấm nút.** Chi tiết đầy đủ về cập nhật và quay lui (gồm plugin, Mod và MCDR) xem [Cập nhật và bảo trì máy chủ, plugin và MCDR](/tutorials/ops/updates).

## 7. Tự động hóa dựa trên kiểm tra sức khỏe

Giá trị của kiểm tra sức khỏe là **phát hiện vấn đề trước khi người chơi phát hiện**. Căn cứ phán đoán nên càng khách quan càng tốt: tiến trình có đang chạy không (`systemctl is-active`, nhưng tiến trình sống không bằng dịch vụ dùng được); cổng có đang lắng nghe không (`nc -z` / `ss -ltn`, kiểm tra khả dụng nhanh nhất); còn phản hồi lệnh được không (truy vấn RCON, phản hồi được nghĩa là luồng chính chưa treo hẳn); TPS / MSPT (**lệnh khác nhau giữa các máy chủ**, phải xác nhận theo tài liệu chính thức); đĩa và bộ nhớ (phù hợp để cảnh báo hơn là "tự khởi động lại").

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # ví dụ: /opt/mc-ops/notify.sh, nhận một tham số tin nhắn
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# Thời gian chờ: tránh vòng lặp sập-rồi-khởi-động-lại
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "đang trong thời gian chờ, bỏ qua tự khởi động lại"; exit 0; fi
fi
# 1) Kiểm tra cổng (hết giờ sau 3 giây)
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "cổng ${PORT} không phản hồi"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "khởi động lại thất bại, cần người can thiệp"; exit 1; fi
  exit 0
fi
# 2) Kiểm tra TPS (cần RCON và máy chủ hỗ trợ lệnh tương ứng)
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} thấp hơn ngưỡng ${MIN_TPS} (hãy dùng spark phân tích, đừng khởi động lại mù quáng)"
  fi
fi
log INFO "kiểm tra sức khỏe đạt"
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

:::warn Khởi động lại liên tục sẽ che lấp vấn đề thật
Nếu kiểm tra sức khỏe ngày nào cũng phải khởi động lại máy chủ một lần, thứ bạn nhận được không phải "máy chủ ổn định", mà là "**một máy chủ ngày nào cũng sập mà không ai biết**". Script tự khởi động lại **bắt buộc phải gửi cảnh báo cùng lúc**, thời gian chờ phải đủ dài; khi liên tục kích hoạt thì nên **tắt tự khởi động lại, chuyển sang người truy nguyên**.
:::

Cách làm đầy đủ về thu thập chỉ số, đặt ngưỡng và kênh cảnh báo xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).

## 8. Quản lý cấu hình: khái niệm và ví dụ tối thiểu với Ansible

Khi số máy chủ vượt quá một, "đăng nhập vào sửa tay" bắt đầu mất kiểm soát: cấu hình ba máy dần khác nhau, mà bạn không biết máy nào đúng. Công cụ quản lý cấu hình (Ansible, Salt, Puppet, Chef) giải quyết chính việc này: **viết trạng thái mong muốn của máy thành tệp, đưa vào quản lý phiên bản, để công cụ hội tụ về đó.** Ansible có ngưỡng thấp nhất, vì nó **chỉ cần SSH và Python, không cần cài agent trên máy bị quản lý**.

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
    # Khác biệt giữa các bản phân phối: trên Debian/Ubuntu thường là openjdk-21-jre-headless,
    # dòng RHEL thường là java-21-openjdk-headless. Nhất định phải xác nhận theo bản phân phối của bạn.
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

:::warn Tham số module lấy tài liệu chính thức của Ansible làm chuẩn
**Tên tham số, giá trị và hành vi** của từng module ở trên (`package`, `user`, `template`, `systemd`) **thay đổi theo phiên bản Ansible**, module ở các phiên bản mới hơn cũng bị đổi tên hoặc chuyển sang collection. **Chép nguyên ví dụ là nguồn sự cố phổ biến**: trước hết chạy `--check` (chỉ báo cáo không thay đổi) một lượt, rồi đối chiếu tài liệu chính thức của Ansible để xác nhận ý nghĩa từng tham số.
:::

Ba kinh nghiệm: **quản cấu hình trước, quản triển khai sau** (đưa `server.properties`, cấu hình plugin, systemd unit vào quản lý phiên bản, giá trị lớn hơn nhiều so với để Ansible tải jar hộ); **`--check` là bạn của bạn** (mọi playbook hãy chạy `--check --diff` trước); **giá trị nhạy cảm không vào kho** (mật khẩu, Token, mật khẩu RCON dùng `ansible-vault` hoặc tiêm qua biến môi trường).

## 9. Khái niệm CI/CD (và vì sao khóa bí mật không được vào kho)

Dùng CI/CD cho máy chủ Minecraft, thứ giá trị nhất không phải "tự động triển khai", mà là **tự động kiểm tra**. Cách làm thực dụng là: đưa cấu hình máy chủ vào kho Git, để pipeline làm ba việc mỗi lần commit —— **kiểm tra cú pháp, phân tích cấu trúc, kiểm tra tĩnh script**.

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

:::note Khác biệt phiên bản: `tomllib` cần Python 3.11+
Từ Python 3.11 thư viện chuẩn mới có `tomllib`. Phiên bản sớm hơn phải cài `tomli` và đổi thành `import tomli as tomllib`. Hãy xác nhận theo môi trường chạy của bạn.
:::

**Bước "đồng bộ lên máy chủ" phải thận trọng.** Thứ tự khả thi là: CI chỉ chịu trách nhiệm **kiểm chứng và đóng gói**, việc triển khai do người kích hoạt, và trước khi triển khai thì tự động sao lưu. **Đừng để mỗi lần commit là khởi động lại thẳng máy chủ sản xuất.**

**Tuyệt đối không commit mật khẩu, Token, mật khẩu RCON, khóa riêng tư SSH vào kho.** Ba hậu quả cụ thể: **lịch sử Git sẽ giữ nó vĩnh viễn** (xóa tệp không giải quyết được, commit cũ vẫn còn, người đã clone cũng có; muốn xóa triệt để phải viết lại lịch sử, và bắt buộc phải **thay mọi thông tin xác thực đã lộ**); **kho công khai sẽ bị quét tự động** (có người chuyên thu thập khóa trong kho công khai, từ lúc commit đến lúc bị lạm dụng có thể chỉ vài phút); **nó sẽ lan theo kho** (mỗi bản clone, mỗi fork, mỗi nhật ký CI đều có thể lưu lại một bản).

| Tình huống | Cách làm |
| --- | --- |
| CI cần khóa bí mật | Dùng Secrets do nền tảng cung cấp (như repository secrets của GitHub Actions), tiêm qua biến môi trường |
| Trên máy chủ cần khóa bí mật | Đặt trong tệp có quyền hạn chế (`chmod 600`, chủ sở hữu là người dùng dịch vụ), hoặc dùng `EnvironmentFile=` của systemd |
| Ansible cần khóa bí mật | Mã hóa bằng `ansible-vault`, hoặc đọc từ biến môi trường |
| Phát triển cục bộ | `.gitignore` cấu hình thật, trong kho chỉ để mẫu `.example` |

**Trước khi đưa vào dùng, hãy chạy một lần công cụ quét khóa bí mật (như gitleaks, trufflehog) trên toàn bộ lịch sử Git**, rẻ hơn nhiều so với khắc phục sau.

## 10. Gợi ý thứ tự triển khai

Đừng tự động hóa mọi thứ trong một lần. Hãy đi theo hướng rủi ro từ thấp đến cao, giá trị từ cao đến thấp: **trước hết có script sao lưu, và đã kiểm chứng khôi phục một lần** (mục 4) → **gắn bộ hẹn giờ cho việc sao lưu**, xác nhận nhật ký thấy được thành công và thất bại → **thêm kiểm tra sức khỏe + cảnh báo** (mục 7), trước chỉ cảnh báo, không tự khởi động lại → **thêm dọn và luân chuyển nhật ký**, kiểm soát dung lượng đĩa → **đưa script và cấu hình vào Git** (mục 3.3, 9) → **cuối cùng mới cân nhắc tự động cập nhật**, và chỉ tự động đến bước "tải về + kiểm chứng + thông báo" (mục 6).

:::warn Thao tác phá hoại tự động mà không có sao lưu chính là kịch bản mất bản lưu tiêu chuẩn
Một script dọn dẹp viết sai thư mục, một `rsync --delete` viết sai hướng, một script cập nhật ghi đè tệp thế giới —— điểm chung của những sự cố này là **trước khi chúng xảy ra, không có một bản sao lưu nào dùng được**. **Mọi tự động hóa có xóa, ghi đè, di chuyển dữ liệu đều phải xác nhận bản sao lưu tồn tại và khôi phục được trước**; không làm được điều đó thì đừng để nó chạy tự động. Bản lưu mất thường không tìm lại được, còn script thì viết lại được.
:::

## Bước tiếp theo

- Chiến lược sao lưu và quy trình khôi phục: xem [Sao lưu và khôi phục](/tutorials/java/backup)
- Bản sao ngoài vị trí làm thế nào: xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)
- Chỉ số, ngưỡng và kênh cảnh báo: xem [Giám sát và cảnh báo](/tutorials/ops/monitoring)
- Khi lag thì xác định nguyên nhân thế nào (chứ không phải khởi động lại): xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark)
- Quy trình đầy đủ của cập nhật và quay lui: xem [Cập nhật và bảo trì máy chủ, plugin và MCDR](/tutorials/ops/updates)
- Lịch tác vụ có sẵn của bảng điều khiển: xem [Bảng điều khiển máy chủ](/tutorials/ops/panels)

---

> Script và cấu hình lấy tài liệu chính thức của hệ thống và phần mềm bạn dùng làm chuẩn.
