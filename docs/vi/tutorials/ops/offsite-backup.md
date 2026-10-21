---
title: Sao lưu ngoài vị trí: sử dụng, cấu hình và bảo trì
slug: offsite-backup
cat: ops
level: 3
order: 10
minutes: 20
tags: [ops, backup, offsite, rsync, restic, rclone, retention]
updated: 2026-10-04
draft: false
---

Sao lưu cục bộ cứu được "lỡ tay xóa bản lưu", không cứu được "ổ cứng hỏng" "máy bị trộm" "phòng máy gặp sự cố". **Sao lưu ngoài vị trí (offsite backup) giải quyết chính loại thảm họa "cả môi trường biến mất cùng lúc" này**. Bài này nói rõ nguyên lý, cấu hình và bảo trì của nó.

Kiến thức cơ bản về sao lưu cục bộ (sao lưu cái gì, yêu cầu nhất quán, quy trình khôi phục) xem [Sao lưu và khôi phục](/tutorials/java/backup); bài này giả định bạn đã có sao lưu cục bộ, giờ cần đưa bản sao ra ngoài.

## 1. Nguyên tắc 3-2-1

3-2-1 là một quy tắc kinh nghiệm về sao lưu được trích dẫn rộng rãi:

| Con số | Ý nghĩa | Áp dụng cho máy chủ MC |
| --- | --- | --- |
| **3** | Giữ ít nhất **3 bản** dữ liệu (1 bản sản xuất + 2 bản sao lưu) | Thư mục máy chủ đang chạy + đĩa sao lưu cục bộ + bản sao ngoài vị trí |
| **2** | Dùng ít nhất **2 loại phương tiện/lưu trữ khác nhau** | Ví dụ SSD gắn trong + ổ cứng ngoài + lưu trữ đối tượng |
| **1** | Ít nhất **1 bản ở nơi khác** | Lưu trữ cloud, một máy khác, một địa điểm vật lý khác |

### Vì sao "bản sao lưu trên cùng một ổ" không tính là sao lưu

Ghi bản sao lưu lên **cùng ổ cứng với máy chủ** chỉ phòng được một loại sự cố: xóa nhầm, sửa sai cấu hình, plugin ghi hỏng bản lưu. Nó không phòng được **bản thân ổ đĩa hỏng** (bản sao lưu mất cùng), **hỏng cả máy** (mainboard hoặc nguồn cháy, cả hai ổ đi cùng), **ransomware** (sẽ mã hóa mọi volume ghi được mà nó thấy), **phá hoại có chủ ý** (có người `rm -rf` cả thư mục, hoặc bê máy đi), cùng **hỏa hoạn, ngập nước, trộm cắp**.

### Ba tình huống thảm họa điển hình

| Tình huống | Sao lưu cục bộ có đủ không | Tác dụng của sao lưu ngoài vị trí |
| --- | --- | --- |
| Ổ cứng hỏng / cả máy hỏng | Không đủ (nếu bản sao lưu cùng ổ) | Khôi phục trực tiếp từ bản sao ngoài vị trí |
| Ransomware mã hóa mọi volume ghi được | **Không đủ** | Bản sao ngoài vị trí chỉ đọc hoặc bất biến là lối thoát duy nhất |
| Nhà cung cấp bỏ trốn / sự cố phòng máy / tài khoản bị chiếm | **Không đủ** | Bản sao nằm trên lưu trữ của chính bạn |

:::warn Bản sao ngoài vị trí phải "chương trình sao lưu ghi được vào, kẻ tấn công xóa không được"
Nếu lưu trữ ngoài vị trí dùng cùng một bộ thông tin xác thực, cùng một tài khoản ghi được, ransomware vẫn xóa được nó. **Làm được chỉ đọc/bất biến (object lock, WORM, append-only) thì làm**; lùi một bước, ít nhất hãy để tài khoản sao lưu chỉ có quyền ghi, không có quyền xóa.
:::

## 2. Sao lưu cái gì, không sao lưu cái gì

| Mức cần thiết | Nội dung | Mô tả |
| --- | --- | --- |
| Bắt buộc | `world/`, `world_nether/`, `world_the_end/` | **Bản thân bản lưu, quan trọng nhất**; tên thế giới tùy chỉnh lấy `level-name` làm chuẩn |
| Bắt buộc | `server.properties` | Cổng, độ khó, xác thực bản quyền, `level-name`, v.v. |
| Bắt buộc | `ops.json`, `whitelist.json`, `banned-ips.json`, `banned-players.json` | Danh sách quyền và danh sách cấm |
| Bắt buộc | `plugins/` (gồm cấu hình và cơ sở dữ liệu của từng plugin) | Bản thân plugin và cấu hình; lưu ý có plugin ghi dữ liệu ở chỗ khác |
| Bắt buộc | `mods/`, `config/` (phía mod) | Dành riêng cho phía mod; trong `config/` là cấu hình mod |
| Bắt buộc | Cấu hình của chính lõi (`bukkit.yml` / `spigot.yml` / `paper-*.yml`, v.v.) | Khác nhau theo lõi |
| Bắt buộc | Script khởi động, systemd unit, mục cron | **Dễ bị sót**, khôi phục mà thiếu nó thì không khởi động được |
| Tùy chọn | `logs/`, `crash-reports/` | Có ích khi xử lý sự cố, nhưng dung lượng sẽ rất lớn |
| Không cần | `libraries/`, `versions/`, `cache/` | Có thể tự dựng lại |

:::tip Coi cả "cách khởi động" là dữ liệu cần sao lưu
"Bản lưu khôi phục được nhưng dịch vụ không khởi động" là sự cố rất phổ biến, nguyên nhân là script khởi động, tham số Java, systemd unit, tác vụ định giờ đều không được sao lưu. **Hãy đưa chúng vào phạm vi sao lưu cùng với cấu hình.**
:::

### Nhất quán: tuyệt đối không copy khi máy chủ đang ghi đĩa

**Đừng copy trực tiếp khi máy chủ đang ghi bản lưu** —— có thể copy phải tệp chunk ghi dở, khôi phục xong bản lưu hỏng. Hai cách đúng:

**Cách A: sao lưu nóng (không dừng máy chủ)**

```text
save-all        chuyển dữ liệu xuống đĩa trước
save-off        tắt tự động lưu (tránh tiếp tục ghi trong lúc sao lưu)
(lúc này thực hiện copy/đóng gói)
save-on         sao lưu xong bật lại tự động lưu
```

**Cách B: sao lưu khi dừng máy chủ (ổn định nhất)**

```text
stop            tắt máy chủ an toàn
(copy/đóng gói toàn bộ thư mục)
(khởi động lại)
```

Cách A cần **gửi lệnh tới console máy chủ**. Nếu dùng systemd quản lý và cách khởi động nhận được nhập từ console, có thể chèn qua `screen`/`tmux`, hoặc bật RCON rồi gửi lệnh từ xa (**cách cấu hình RCON khác nhau theo lõi và phiên bản, lấy tài liệu chính thức làm chuẩn**).

:::warn Công cụ đóng gói đọc tệp trong khi máy chủ vẫn đang ghi
`tar`, `rsync`, `restic` đều **vừa đọc vừa duyệt**. Dù bạn vừa chạy `save-all`, nếu không `save-off`, máy chủ vẫn sẽ ghi dữ liệu mới trong lúc duyệt, **bản lưu trữ có thể chứa tổ hợp không nhất quán**. Bước `save-off` không thể bỏ.
:::

## 3. rsync over SSH

`rsync` là phương án đồng bộ tăng dần ngoài vị trí kinh điển nhất: chỉ truyền phần thay đổi, đi qua kênh mã hóa SSH, gần như mọi bản phân phối Linux đều cài được.

### Một lệnh ví dụ đầy đủ

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

### Giải thích từng mục

| Tùy chọn | Tác dụng |
| --- | --- |
| `-a` | Chế độ lưu trữ, tương đương `-rlptgoD` (đệ quy, giữ liên kết tượng trưng, quyền, thời gian, nhóm sở hữu, tệp thiết bị) |
| `-H` | Giữ liên kết cứng (**nếu thư mục máy chủ có liên kết cứng, không thêm tùy chọn này sẽ bị bung thành nhiều bản**) |
| `-A` | Giữ ACL (danh sách kiểm soát truy cập) |
| `-X` | Giữ thuộc tính mở rộng (xattr) |
| `--delete` | Xóa các tệp ở phía đích "mà phía nguồn không còn", để đích khớp nguồn. **Đây là con dao hai lưỡi**: xóa nhầm ở nguồn sẽ bị đồng bộ sang |
| `--numeric-ids` | Ánh xạ theo UID/GID số thay vì theo tên người dùng/nhóm. Khi qua máy khác, đích không có người dùng cùng tên thì **bắt buộc phải thêm** |
| `--info=progress2` | Hiển thị tiến độ tổng thể (rsync 3.1 trở lên) |
| `--exclude` | Loại trừ thư mục không cần sao lưu |
| `--link-dest=DIR` | **Snapshot bằng liên kết cứng**: tệp có nội dung giống trong DIR không copy nữa, mà tạo liên kết cứng ở đích, nhờ đó thư mục của mỗi ngày trông như bản sao đầy đủ, thực tế chỉ chiếm dung lượng tăng thêm |

:::warn `-A` và `-X` cần cả hai bên hỗ trợ
Giữ ACL và xattr cần phiên bản rsync đủ mới, hệ thống tệp đích hỗ trợ các tính năng này, và **thường cần chạy bằng root** mới đọc được ACL/xattr của mọi tệp. Nếu hệ thống tệp đích (như một số lưu trữ mạng) không hỗ trợ, rsync sẽ báo lỗi hoặc âm thầm bỏ qua. **Không chắc thì bỏ `-A -X` trước**.
:::

### Chạy dry-run trước

**Mọi lệnh có `--delete`, lần đầu bắt buộc phải thêm `-n` (`--dry-run`) chạy một lượt**:

```bash
rsync -aHAX --delete --numeric-ids -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ backup@backup.example.com:/srv/backup/mcserver/
```

`-n` (`--dry-run`) chỉ hiển thị sẽ làm gì mà không thực sự thay đổi, `-i` (`--itemize-changes`) liệt kê từng thay đổi, tiện xác nhận `--delete` sẽ xóa cái gì. **Xác nhận trong đầu ra không có "thứ bất ngờ bị xóa" rồi mới bỏ `-n`.**

### Đăng nhập SSH không mật khẩu

Script sao lưu phải chạy được không người trực, nên dùng đăng nhập bằng khóa:

```bash
ssh-keygen -t ed25519 -C "mc-backup@home"
ssh-copy-id backup@backup.example.com
ssh backup@backup.example.com 'echo ok'
```

`ssh-keygen -t ed25519` tạo cặp khóa Ed25519, mặc định đặt ở `~/.ssh/id_ed25519` (khóa riêng tư) và `~/.ssh/id_ed25519.pub` (khóa công khai). **Đặt cụm mật khẩu (passphrase) cho khóa riêng tư thì an toàn hơn, nhưng tác vụ định giờ sẽ cần ssh-agent hoặc `keychain` mới không phải nhập tay; máy sao lưu không người trực thường không đặt passphrase, vì vậy phải giới hạn quyền của nó thật chặt.** `ssh-copy-id` nối khóa công khai vào `~/.ssh/authorized_keys` của máy đích; **một số nền tảng (như OpenSSH trên Windows hoặc một số hệ thống rút gọn) có thể không có lệnh này**, khi đó hãy tự nối nội dung khóa công khai. Nên giới hạn khóa này trong `authorized_keys` của máy đích:

```text
from="203.0.113.10",command="/usr/bin/rrsync -wo /srv/backup/mcserver/",no-port-forwarding,no-pty ssh-ed25519 AAAA... mc-backup@home
```

`rrsync` là script bọc hạn chế đi kèm rsync, chỉ cho ghi vào thư mục chỉ định. **Đường dẫn và tính khả dụng của `rrsync` khác nhau theo bản phân phối** (Debian/Ubuntu nằm trong gói `rsync`, đường dẫn có thể là `/usr/bin/rrsync`), trước khi dùng hãy xác nhận.

### Ví dụ cron

```cron
0 4 * * * /usr/local/bin/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

Năm trường lần lượt là: phút, giờ, ngày, tháng, thứ, nên `0 4 * * *` nghĩa là **04:00 mỗi ngày**; `>> /var/log/mc-backup.log 2>&1` nối cả đầu ra chuẩn và lỗi chuẩn vào nhật ký, tiện kiểm tra mã thoát và lỗi về sau. **Biến môi trường của cron rất ít (`PATH` rất ngắn), trong script phải dùng đường dẫn tuyệt đối**; cần luân chuyển nhật ký thì thêm một quy tắc trong `/etc/logrotate.d/`, nếu không nhật ký sẽ tăng mãi.

## 4. Bộ khung script sao lưu

Dưới đây là một **bộ khung bash dùng được ngay**: nó đóng băng việc ghi trước, đóng gói thế giới và cấu hình, dọn bản lưu trữ quá hạn, rồi rsync ra ngoài vị trí, và ghi kết quả vào nhật ký.

```bash
#!/usr/bin/env bash
# Bộ khung script sao lưu ngoài vị trí. Hãy sửa biến theo môi trường của bạn.
set -euo pipefail

SERVER_DIR="/opt/mcserver"                 # Thư mục máy chủ (đừng thêm dấu gạch chéo ở cuối)
BACKUP_ROOT="/srv/backup/mcserver"         # Thư mục gốc sao lưu cục bộ (nên khác ổ với SERVER_DIR)
LOG_FILE="/var/log/mc-backup.log"
KEEP_DAYS=14                               # Số ngày giữ bản lưu trữ cục bộ
REMOTE="backup@backup.example.com:/srv/backup/mcserver"   # Đích ngoài vị trí

STAMP="$(date +%F_%H%M%S)"
ARCHIVE="${BACKUP_ROOT}/mcserver-${STAMP}.tar.gz"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

# Đầu ra của chính script cũng ghi vào nhật ký, chuyển hướng trong cron chỉ là bảo hiểm kép
exec >>"${LOG_FILE}" 2>&1
log "=== backup start ${STAMP} ==="

[ -d "${SERVER_DIR}" ] || fail "server directory not found: ${SERVER_DIR}"
mkdir -p "${BACKUP_ROOT}"

# Sao lưu khi dừng máy chủ là ổn định nhất. Nếu không dừng được, đổi sang gửi save-all / save-off tới console, đóng gói xong thì save-on
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

# Giữ bản lưu trữ cục bộ trong KEEP_DAYS ngày gần nhất, phần còn lại xóa đi (lần chạy đầu nên bỏ -delete để xác nhận phạm vi)
find "${BACKUP_ROOT}" -maxdepth 1 -name 'mcserver-*.tar.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete

# Đồng bộ ra ngoài vị trí. Cố ý không dùng --delete, tránh việc xóa nhầm cục bộ bị đồng bộ sang
rsync -aHAX --numeric-ids --info=progress2 "${BACKUP_ROOT}/" "${REMOTE}/"
log "offsite sync finished"

if [ "${START_AFTER}" -eq 1 ]; then
    log "starting minecraft.service again"
    systemctl start minecraft.service
fi

log "=== backup ok ${STAMP} ==="
exit 0
```

### Hướng dẫn sử dụng

```bash
sudo install -m 750 mc-backup.sh /usr/local/bin/mc-backup.sh
sudo /usr/local/bin/mc-backup.sh
tail -20 /var/log/mc-backup.log
```

Mấy điểm bắt buộc phải biết:

- `set -euo pipefail` khiến script **thoát ngay khi gặp lỗi**, tránh "sao lưu thất bại nhưng script vẫn chạy tiếp, cuối cùng báo thành công".
- **Sao lưu khi dừng máy chủ là ổn định nhất**; nếu không dừng được, thay `systemctl stop` bằng việc gửi `save-all` / `save-off` tới console, đóng gói xong thì `save-on` (xem mục 2).
- `find ... -mtime "+${KEEP_DAYS}" -delete` **in ra trước rồi mới xóa**, lần chạy đầu nên bỏ `-delete` trước, xác nhận các tệp khớp được là đúng.
- **Đồng bộ ngoài vị trí dùng nối thêm chứ không dùng `--delete`**, nếu không khi bản lưu trữ cục bộ bị xóa nhầm thì bản sao ngoài vị trí sẽ biến mất theo. Nếu bạn thực sự muốn đồng bộ kiểu gương, hãy bảo đảm logic xóa cục bộ tuyệt đối đáng tin.
- Tên unit của `systemctl`, đường dẫn loại trừ của `tar` đều phải điều chỉnh theo thư mục thực tế của bạn; **`--exclude` của `tar` khớp theo đường dẫn bên trong bản lưu trữ, cách viết không hoàn toàn giống rsync**. Khi cần giữ kiểu GFS (ngày/tuần/tháng), đổi sang `forget --keep-*` của restic sẽ nhàn hơn tự viết `find`.

:::warn `--delete` trong script nhất định phải nghĩ cho kỹ
`rsync --delete` làm đích hoàn toàn khớp nguồn. **Nếu phía nguồn vì quyền, mount thất bại hay đường dẫn viết sai mà thành thư mục rỗng, `--delete` sẽ xóa sạch cả bản sao ngoài vị trí.** Đây là nguyên nhân kinh điển của sự cố sao lưu.
:::

## 5. Các công cụ khác và cách chọn

### restic: khử trùng lặp, mã hóa, snapshot

restic là công cụ sao lưu kiểu ghi snapshot, **có sẵn khử trùng lặp và mã hóa**, phù hợp tình huống "muốn giữ nhiều phiên bản lịch sử nhưng không muốn chiếm nhiều dung lượng".

```bash
# 1. Khởi tạo kho (chỉ một lần)
export RESTIC_REPOSITORY="sftp:backup@backup.example.com:/srv/restic/mcserver"
export RESTIC_PASSWORD_FILE="/root/.config/restic/mcserver.pass"
restic init

# 2. Sao lưu
restic -r "${RESTIC_REPOSITORY}" backup /opt/mcserver

# 3. Xem snapshot
restic snapshots

# 4. Chính sách giữ: 7 bản ngày, 4 bản tuần, rồi dọn dữ liệu không còn được tham chiếu
restic forget --keep-daily 7 --keep-weekly 4 --prune
```

`RESTIC_PASSWORD_FILE` trỏ tới một **tệp mật khẩu `chmod 600`**, đừng viết vào script. `restic forget` chỉ xóa tham chiếu snapshot, **bắt buộc thêm `--prune` mới thực sự thu hồi dung lượng**, mà `--prune` tốn khá nhiều thời gian, nên đặt trong khung bảo trì. Khôi phục bằng `restic restore latest --target /tmp/restore-test`. Kho có thể đặt trên nhiều loại backend như thư mục cục bộ, SFTP, lưu trữ tương thích S3 (**danh sách backend hỗ trợ lấy tài liệu chính thức làm chuẩn**).

### rclone: đồng bộ lưu trữ cloud

rclone là "rsync của lưu trữ cloud", hỗ trợ lượng lớn backend lưu trữ đối tượng và ổ đĩa mạng.

```bash
# 1. Cấu hình tương tác một remote, tên ví dụ myremote
rclone config

# 2. Đồng bộ thư mục cục bộ lên remote (sẽ xóa tệp thừa ở remote, chú ý hướng và ngữ nghĩa)
rclone sync /srv/backup/mcserver myremote:mcserver-backup --progress

# 3. Kiểm chứng hai bên nhất quán
rclone check /srv/backup/mcserver myremote:mcserver-backup
```

`rclone sync` làm đích **hoàn toàn khớp** nguồn, sẽ xóa tệp thừa ở đích; chỉ muốn nối thêm thì dùng `rclone copy`. `rclone check` so sánh tệp hai bên (mặc định so kích thước và hash, **có so hash được hay không tùy backend**). `rclone config` là tương tác, môi trường không có giao diện cũng có thể viết tay tệp cấu hình (`rclone config file` để xem đường dẫn); thông tin xác thực nằm ngay trong tệp đó, **quyền phải siết xuống `chmod 600`**.

### Thuần tar + scp

Tổ hợp đơn giản nhất, không có phụ thuộc thêm:

```bash
tar -czf /tmp/mcserver-$(date +%F).tar.gz -C /opt/mcserver .
scp /tmp/mcserver-$(date +%F).tar.gz backup@backup.example.com:/srv/backup/
```

Phù hợp tình huống **lượng dữ liệu rất nhỏ, tần suất sao lưu rất thấp**. Nhược điểm là: **mỗi lần truyền toàn bộ, không khử trùng lặp, không mã hóa (ngoài kênh SSH), không kiểm chứng**, dữ liệu lớn lên là không dùng được.

### So sánh

| Công cụ | Khử trùng lặp | Mã hóa | Tăng dần | Hỗ trợ cloud | Độ phức tạp | Phù hợp |
| --- | --- | --- | --- | --- | --- | --- |
| **rsync** | Không (tiết kiệm nhờ `--link-dest`) | Không (dựa vào kênh SSH) | Có (theo tệp) | Cần mount hoặc kết hợp công cụ khác | Thấp | Có đích SSH, thư mục cấu trúc đơn giản |
| **restic** | **Có** | **Có (tích hợp sẵn)** | Có (theo khối) | Nhiều backend (S3, SFTP, v.v.) | Trung bình | Muốn giữ nhiều phiên bản lịch sử, cần mã hóa |
| **rclone** | Không | Mã hóa truyền tùy backend | Có (theo tệp) | **Rộng nhất** | Trung bình | Đích là ổ đĩa mạng/lưu trữ đối tượng |
| **tar + scp** | Không | Không | Không (toàn bộ) | Cần đích scp được | **Thấp nhất** | Dữ liệu nhỏ, sao lưu không thường xuyên |

## 6. Mã hóa và quản lý khóa

**Bản sao ngoài vị trí bắt buộc phải mã hóa.** Đặt bản sao trên lưu trữ của người khác tức là giao dữ liệu cho bên thứ ba; khóa của lưu trữ đối tượng bị lộ, liên kết chia sẻ cấu hình sai, tài khoản cloud bị chiếm, đều làm lộ thẳng bản lưu (trong đó thường còn có IP người chơi, lịch sử chat, thông tin riêng tư có thể có).

- **restic có sẵn mã hóa**: kho dùng mật khẩu để dẫn xuất khóa, **mất mật khẩu là dữ liệu vĩnh viễn không mở được**; **rsync / rclone / tar+scp bản thân không mã hóa nội dung**, hoặc dựa vào tầng truyền (SSH, HTTPS), hoặc tự mã hóa trước:

```bash
# Mã hóa đối xứng một bản lưu trữ bằng gpg (sẽ nhập mật khẩu tương tác)
gpg --symmetric --cipher-algo AES256 mcserver-2026-10-04.tar.gz

# Giải mã
gpg --decrypt mcserver-2026-10-04.tar.gz.gpg > mcserver-2026-10-04.tar.gz
```

### Đặt mật khẩu ở đâu

**Tuyệt đối không đặt trong kho sao lưu/lưu trữ đích**, cũng **đừng đặt trong cùng thư mục ghi được với script sao lưu**. Cách làm chấp nhận được là **ghi trong trình quản lý mật khẩu** (người đọc được), và **đặt trong một tệp có quyền chặt trên máy sao lưu** (script đọc được):

```bash
sudo install -d -m 700 -o root -g root /root/.config/restic
sudo sh -c 'printf "%s" "mật khẩu của bạn" > /root/.config/restic/mcserver.pass'
sudo chmod 600 /root/.config/restic/mcserver.pass
sudo chown root:root /root/.config/restic/mcserver.pass
```

**Mật khẩu phải có một bản ghi ngoại tuyến** (viết ra giấy rồi khóa lại, hoặc để trong trình quản lý mật khẩu của thiết bị khác). **Sao lưu mã hóa + mất mật khẩu = mất toàn bộ dữ liệu**, và còn triệt để hơn là không mã hóa. Tệp khóa (khóa riêng tư SSH, cấu hình rclone) cũng `chmod 600`, và **chỉ cấp cho tài khoản quyền tối thiểu dành riêng cho sao lưu**.

:::warn Mã hóa không phải "đặt mật khẩu là xong"
Độ mạnh mật khẩu, bảo quản mật khẩu, luân chuyển khóa đều phải tính. **Một mật khẩu yếu viết trong script thì độ an toàn gần như bằng không.** Ngoài ra: sau khi mã hóa **tỷ lệ nén sẽ giảm** (bản mã không nén được), hãy nén trước rồi mã hóa.
:::

## 7. Đích cloud và lưu trữ đối tượng

| Loại | Ví dụ | Đặc điểm |
| --- | --- | --- |
| Một máy khác / NAS | NAS nhà bạn bè, VPS thứ hai | Rẻ, kiểm soát được, nhưng phải tự bảo trì |
| Lưu trữ đối tượng tương thích S3 | Các dịch vụ tương thích S3, MinIO tự dựng | API chuẩn, restic/rclone hỗ trợ trực tiếp |
| Lưu trữ lạnh / lưu trữ lưu trữ dài hạn | Các mức "archive" "cold" của từng nhà | **Đơn giá cực thấp, lấy ra chậm và có thể tính phí theo lượng lấy ra** |
| Ổ đĩa mạng | Các backend ổ đĩa mạng mà rclone hỗ trợ | Rẻ thậm chí miễn phí, nhưng **giới hạn tốc độ, có thể bị khóa tài khoản, không phù hợp làm bản sao duy nhất** |

### Cái bẫy chi phí bắt buộc phải chú ý

- **Phí lưu lượng ra (egress)**: nhiều lưu trữ đối tượng **tải lên miễn phí, tải xuống tính phí**. Khôi phục một lần bản sao vài trăm GB có thể đắt hơn lưu một năm. **Trước khi mua hãy xem giá lấy ra và giá lưu lượng ra trên trang bảng giá.**
- **Phí yêu cầu**: backend tính phí theo số yêu cầu, khi nhiều tệp nhỏ thì chi phí sẽ tăng.
- **Thời gian lưu tối thiểu**: một số mức lưu trữ yêu cầu dữ liệu phải lưu ít nhất 30/90/180 ngày, xóa sớm vẫn bị tính phí cả khoảng.
- **Độ trễ lấy ra**: khôi phục từ mức lưu trữ có thể mất vài giờ, **không phù hợp "có sự cố là phải khôi phục ngay"**, nên giữ ít nhất một bản sao "khôi phục được ngay".

### Vòng đời và quy tắc giữ

Lưu trữ đối tượng thường hỗ trợ **quy tắc vòng đời (lifecycle rule)**, dùng để **chuyển đối tượng quá N ngày sang mức lưu trữ rẻ hơn**, **tự động xóa** sau N ngày để thực hiện chính sách giữ, và dọn phần dư của các lần tải lên phân mảnh (multipart upload) chưa hoàn thành —— **cái sau là nguồn phí ẩn phổ biến**. **Cú pháp quy tắc cụ thể, tên các mức được hỗ trợ và thời hạn tối thiểu khác nhau theo nhà cung cấp, lấy tài liệu của từng nhà làm chuẩn**, đừng bê nguyên ví dụ của nhà khác.

## 8. Thiết kế chính sách giữ

### Giữ bao nhiêu bản

| Tầng | Số lượng thường dùng | Mục đích |
| --- | --- | --- |
| Hằng ngày | 7 - 14 bản | Ứng phó "hôm qua/hôm kia ghi hỏng" |
| Hằng tuần | 4 - 8 bản | Ứng phó "vấn đề vài tuần sau mới phát hiện" |
| Hằng tháng / hằng năm | 6 - 12 bản mỗi tháng, 1 - 3 bản mỗi năm | Lưu trữ dài hạn, ứng phó hỏng hóc xảy ra chậm |

Nguyên tắc: **"phủ được khoảng thời gian dài nhất cần để bạn phát hiện vấn đề"**. Bản lưu hỏng thường **không được phát hiện ngay trong ngày**, nên phải giữ đủ lâu.

### Ước tính dung lượng đĩa

Đặt kích thước thế giới là `W`, sau nén khoảng `0.4W - 0.7W` (**tỷ lệ nén tùy nội dung, tệp region hiệu quả nén bình thường, lấy đo thực tế làm chuẩn**).

| Phương án | Dung lượng chiếm |
| --- | --- |
| Mỗi lần một `tar.gz` riêng, giữ `N` bản | Khoảng `N x 0.5W` |
| Snapshot liên kết cứng `--link-dest` của rsync | Khoảng `0.5W + delta x (N-1)`, **lượng thay đổi mới là mấu chốt** |
| Snapshot khử trùng lặp của restic | Cùng bậc hoặc tiết kiệm hơn snapshot liên kết cứng, tùy độ mịn khử trùng lặp |

Ví dụ: thế giới 5 GB, giữ 14 bản lưu trữ riêng, với tỷ lệ nén 0.5 cần khoảng `14 x 2.5 = 35 GB`; đổi sang snapshot `--link-dest`, nếu mỗi ngày thay đổi 100 MB thì khoảng `2.5 GB + 13 x 0.1 GB = 3.8 GB`. **Chênh lệch rất lớn, đáng để đổi sang phương án snapshot.**

### Dọn bản sao lưu cũ một cách an toàn

- **Tuyệt đối không xóa bản sao lưu cũ trước khi kiểm chứng bản mới dùng được**. Thứ tự luôn là: **tạo bản mới -> kiểm chứng bản mới -> xác nhận không sai -> mới dọn bản cũ**.
- **Giữ ít nhất một bản "cũ nhất nhưng đã biết là dùng được"** (ứng phó "hỏng hóc đã tồn tại từ lâu"), thao tác dọn **hãy dry-run trước hoặc in danh sách tệp trước** để xác nhận phạm vi khớp.
- Việc dọn ở phía ngoài vị trí **phải thận trọng hơn cục bộ** (giữ nhiều bản hơn, xóa muộn hơn), vì bản sao ngoài vị trí là phòng tuyến cuối cùng.

:::warn Dọn tự động là "tự động hóa việc xóa dữ liệu"
Một `find ... -delete` hay `--delete` viết sai có thể xóa sạch toàn bộ lịch sử trong một lần. **Mọi logic dọn dẹp trước khi đưa vào dùng đều phải chạy thử trên thư mục kiểm thử, và xác nhận nó không khớp tới tệp không nên xóa.**
:::

## 9. Bảo trì

### Bản sao lưu chưa từng khôi phục thì không tính là sao lưu

Quy tắc này nhấn mạnh bao nhiêu cũng không thừa. **Script sao lưu chạy "thành công" mỗi ngày, và bản sao lưu thực sự khôi phục được, là hai chuyện hoàn toàn khác nhau.** Tình huống thường gặp là: script thất bại vì quyền, đường dẫn, đĩa đầy suốt vài tuần mà không ai phát hiện; hoặc bản lưu trữ đóng gói ra là rỗng; hoặc mật khẩu mã hóa đã sai từ lâu.

### Quy trình diễn tập khôi phục hằng quý

1. **Chọn một bản sao**: tốt nhất chọn **bản sao ngoài vị trí**, như vậy kiểm chứng luôn cả "quá trình truyền có hỏng không".
2. **Khôi phục vào một thư mục kiểm thử cách ly**, tuyệt đối không ghi đè thư mục sản xuất:

```bash
mkdir -p /tmp/restore-test
tar -xzf /srv/backup/mcserver/mcserver-2026-10-04_040001.tar.gz -C /tmp/restore-test
ls -la /tmp/restore-test
```

3. **Kiểm tra các tệp then chốt có tồn tại và không rỗng**: `world/level.dat`, `server.properties`, cấu hình trong `plugins/`.
4. **Khởi động instance kiểm thử ở cổng khác**: copy thư mục kiểm thử, đổi cổng trong `server.properties` sang giá trị khác (ví dụ `server-port=25566`, `query.port=25566`, `rcon.port=25567`), khởi động và quan sát nhật ký; vào máy chủ rồi kiểm tra công trình then chốt, nội dung container, ba lô và quyền của người chơi, xác nhận không có lỗi liên quan đến chunk hay bản lưu.
5. **Ghi lại và dọn dẹp**: ghi ngày diễn tập, thời gian dùng và vấn đề gặp phải (**đây là bằng chứng duy nhất chứng minh bản sao lưu dùng được**), rồi xóa instance kiểm thử, giữ lại bản ghi.

:::tip Viết quy trình khôi phục thành tài liệu
Ngày xảy ra sự cố không phải lúc nghiên cứu "khôi phục thế nào". **Hãy viết các lệnh ra một trang giấy trước**, diễn tập thì làm theo, phát hiện vấn đề thì cập nhật nó.
:::

### Kiểm chứng tính toàn vẹn

| Cách làm | Lệnh | Mô tả |
| --- | --- | --- |
| Kiểm tra kho restic | `restic check` | Kiểm chứng cấu trúc kho và metadata; thêm `--read-data` sẽ **đọc toàn bộ khối dữ liệu**, chậm nhưng triệt để hơn |
| Liệt kê nội dung tar | `tar -tzf archive.tar.gz >/dev/null` | Đọc và giải nén danh sách, có thể phát hiện **bản lưu trữ bị cắt cụt hoặc hỏng** |
| So sánh checksum | `sha256sum archive.tar.gz` | So với hash ghi lại lúc sao lưu, xác nhận nội dung sau truyền là nhất quán |
| Kiểm chứng bằng rclone | `rclone check src dst` | So sánh tệp hai bên (khả năng tùy backend có hỗ trợ hash không) |
| Thử giải nén | `tar -xzf archive.tar.gz -C /tmp/check` | Kiểm chứng trực tiếp nhất: có thực sự giải ra được không |

**Checksum phải lưu riêng** (ví dụ ghi một tệp `.sha256` đi kèm bản lưu trữ), nếu không thì "dùng hash của chính bản sao lưu để kiểm chứng bản sao lưu" là vô nghĩa.

### Giám sát xem sao lưu có thực sự chạy không

**Xem mã thoát** (khi cron thất bại, nhật ký sẽ có mã thoát khác 0; script có `set -e` gặp lỗi sẽ thoát sớm), **xem nhật ký** (`tail -20 /var/log/mc-backup.log` xác nhận dòng cuối là dấu hiệu thành công), **xem sản phẩm** (dấu thời gian của bản lưu trữ mới là hôm nay, kích thước trong khoảng hợp lý, không phải 0 byte cũng không nhỏ bất thường). Quan trọng hơn là **cảnh báo chủ động**: để script gửi email hoặc tin nhắn khi thất bại (`mail`, `curl` gọi Webhook, v.v.). **"Không có tin nhắn" không bằng "mọi thứ bình thường"**, tốt nhất là làm **giám sát kiểu nhịp tim** —— mỗi ngày thành công thì báo một lần, không báo thì cảnh báo.

### Nguyên nhân thất bại thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Hướng truy |
| --- | --- | --- |
| Đĩa đầy / bản lưu trữ 0 byte | Đĩa sao lưu cục bộ đầy, chính sách giữ không có hiệu lực | `df -h`, kiểm tra logic dọn dẹp |
| Xác thực SSH thất bại | Khóa bị thay, quyền `authorized_keys` sai, tài khoản bị khóa | Chạy tay một lần `ssh backup@host 'echo ok'` |
| Cảnh báo khóa máy chủ thay đổi | Máy đích cài lại hoặc IP được dùng lại, bản ghi `known_hosts` đã cũ | **Xác nhận thân phận bên kia trước**, rồi mới cập nhật `known_hosts` |
| Lỗi quyền (Permission denied) | Tài khoản sao lưu không đọc được tệp nguồn, thư mục đích không ghi được | Kiểm tra quyền và chủ sở hữu thư mục, cần thì chạy bằng root |
| Thông tin xác thực hết hạn / mật khẩu mã hóa sai | Khóa lưu trữ cloud hết hạn; luân chuyển mật khẩu xong script không được cập nhật | Cập nhật khóa, và chạy tay `restic snapshots` để kiểm chứng |
| Nội dung bản lưu trữ không đầy đủ | Quên `save-off`, `--exclude` viết sai loại trừ thư mục then chốt | Dùng `tar -tzf` liệt kê nội dung để đối chiếu |
| Đồng bộ xóa mất dữ liệu tốt | Đường dẫn nguồn viết sai + `--delete` | Dừng đồng bộ ngay, khôi phục từ bản sao sớm hơn |

:::warn Nhật ký lỗi phải xem, đừng chỉ xem "có tệp được tạo không"
Có tệp được tạo ≠ nội dung đúng. **Kích thước bản lưu trữ, mã thoát, checksum, ít nhất phải kiểm tra hai trong ba.**
:::

## 10. Danh sách kiểm tra

| Hạng mục | Yêu cầu | Tần suất kiểm tra |
| --- | --- | --- |
| Phủ 3-2-1 | Ít nhất 3 bản sao, 2 loại phương tiện, 1 bản ngoài vị trí | Rà lại mỗi quý |
| Phạm vi sao lưu | Thế giới, cấu hình, danh sách, plugin/mod và cấu hình, script khởi động | Sau mỗi lần đổi cấu hình |
| Nhất quán | Sao lưu khi dừng máy chủ, hoặc `save-all` + `save-off` -> đóng gói -> `save-on` | Mỗi lần sao lưu |
| Tự động hóa | cron / systemd timer chạy định giờ, có nhật ký | Khi triển khai |
| Mã hóa và quyền | Bản sao ngoài vị trí được mã hóa, mật khẩu lưu ngoại tuyến, mật khẩu và khóa riêng tư `chmod 600`, tài khoản quyền tối thiểu | Rà lại mỗi quý |
| Chính sách giữ | Số bản mỗi ngày/tuần/tháng rõ ràng, logic dọn dẹp đã qua kiểm thử | Rà lại mỗi quý |
| Dung lượng | Dung lượng trống cục bộ và ngoài vị trí đủ | Mỗi tuần |
| Kiểm chứng | `restic check` / `tar -tzf` / so sánh checksum đều qua | Mỗi tháng |
| Giám sát | Thất bại có cảnh báo, thành công có nhịp tim | Khi triển khai, rà lại mỗi tháng |
| Diễn tập khôi phục | Khôi phục vào thư mục kiểm thử và khởi động kiểm chứng ở cổng khác | **Mỗi quý** |
| Khả dụng ngoài vị trí | Xác nhận tải về/khôi phục được, phí lưu lượng ra chấp nhận được | Mỗi quý |
| Tài liệu | Quy trình khôi phục, vị trí mật khẩu, địa chỉ đích có ghi chép bằng văn bản | Mỗi nửa năm |

## 11. Tóm lại

- **Sao lưu cùng ổ không tính là sao lưu**: bản sao thực sự cứu mạng phải ở nơi khác, và tốt nhất là không thể bị xóa từ xa.
- **Nhất quán ưu tiên hơn tốc độ**: không copy khi máy chủ đang ghi đĩa.
- **Mã hóa + lưu mật khẩu ngoại tuyến**: bản sao ngoài vị trí bắt buộc phải mã hóa, mất mật khẩu là mất hết.
- **Chính sách giữ phải qua kiểm thử**: logic dọn dẹp là "tự động hóa việc xóa dữ liệu", trước khi đưa vào dùng bắt buộc phải kiểm chứng.
- **Mỗi quý thực sự khôi phục một lần**: đây là cách duy nhất chứng minh bản sao lưu có hiệu lực.

Đọc kèm: [Sao lưu và khôi phục](/tutorials/java/backup) (phạm vi sao lưu và quy trình khôi phục), [Cấu trúc máy chủ](/tutorials/java/structure) (tệp nào nên sao lưu), [Mở máy chủ trên máy tính gia đình và bảo trì](/tutorials/ops/home-hosting) (rủi ro phần cứng và nguồn điện).

> Lệnh và cấu hình lấy tài liệu chính thức của từng phần mềm làm chuẩn; cách tính giá, quy tắc vòng đời và chính sách lấy ra của lưu trữ đối tượng lấy tài liệu của từng nhà cung cấp làm chuẩn.
