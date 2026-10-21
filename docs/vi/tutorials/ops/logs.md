---
title: Quản lý và luân chuyển nhật ký
slug: logs
cat: ops
level: 3
order: 18
minutes: 14
tags: [nhật ký, logrotate, journald, Docker, dung lượng đĩa, syslog, bảo trì, tìm lỗi]
updated: 2026-10-04
draft: false
---

**Nhật ký là bằng chứng duy nhất để tìm lỗi, cũng là nghi phạm số một làm đầy đĩa máy chủ.** Máy chủ, plugin, proxy, panel, systemd, Docker, nginx đều ghi lên đĩa, mà mặc định gần như không cái nào đặt hạn mức. Bài này nói rõ: nhật ký nằm ở đâu, đo trước rồi mới xử lý, cách viết logrotate đúng, hạn mức của journald và Docker, và một danh sách bảo trì làm theo được.

Cách đọc nhật ký khi tìm sự cố cụ thể xem [Giám sát và cảnh báo](/tutorials/ops/monitoring); đưa nhật ký cùng bản lưu ra khỏi phòng máy xem [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup).

## 1. Một máy chủ Minecraft có những nhật ký nào

Trước hết tách chữ "nhật ký" ra. Phần lớn sự cố "đĩa tự nhiên đầy" thủ phạm không nằm ở `logs/latest.log`.

| Nguồn | Đường dẫn điển hình | Giải thích |
| --- | --- | --- |
| Nhật ký chính của máy chủ | `logs/latest.log` | Nhật ký đang ghi hiện tại, UTF-8, Linux xuống dòng LF, Windows CRLF |
| Nhật ký lịch sử của máy chủ | `logs/YYYY-MM-DD-N.log.gz` | Nhật ký cũ do lõi tự luân chuyển, nén gzip |
| Báo cáo sập | `crash-reports/crash-YYYY-MM-DD_HH.MM.SS-server.txt` | Mỗi lần sập một tệp, stack rất dài, mỗi tệp vài trăm KB đến vài MB |
| Nhật ký plugin | `plugins/<plugin>/logs/*.log`, `plugins/<plugin>/*.log` | **Vị trí tùy plugin**, có cái ghi trong thư mục plugin, có cái ghi thẳng vào `logs/` của máy chủ |
| Nhật ký phía proxy | `<thư-mục-proxy>/logs/latest.log` | Velocity / BungeeCord có thư mục làm việc và `logs/` riêng |
| Nhật ký unit systemd | `journalctl -u minecraft.service` | Quản lý bằng systemd thì stdout/stderr mặc định vào journal |
| Nhật ký hệ thống | `/var/log/syslog`, `/var/log/messages`, `/var/log/kern.log` | Bản phân phối khác nhau tên khác nhau |
| Nhật ký đăng nhập và an toàn | `/var/log/auth.log` (họ Debian), `/var/log/secure` (họ RHEL) | Dấu vết dò SSH đều ở đây, máy công khai sẽ phình rất nhanh |
| Nhật ký nginx | `/var/log/nginx/access.log`, `error.log` | Panel, bản đồ, proxy web đi qua nginx thì chắc chắn có |
| Nhật ký panel | Thư mục của chính panel | MCSManager, Pterodactyl… mỗi panel tự ghi nhật ký, còn thường ghi cả cơ sở dữ liệu |
| Nhật ký Docker | `/var/lib/docker/containers/<ID-container>/<ID-container>-json.log` | Mặc định driver `json-file`, **mặc định không luân chuyển** |
| Tệp phía JVM | `logs/gc.log`, `hs_err_pid<pid>.log`, `*.jfr` | Sinh ra khi bật nhật ký GC, JFR hoặc JVM sập, dễ bị quên |

:::note Đừng quên thứ JVM tự ghi
Các tham số khởi động kiểu `-Xlog:gc*:file=logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M` sẽ đặt thêm một bản nhật ký GC trong `logs/`; JVM sập còn bỏ lại `hs_err_pid<pid>.log` trong thư mục làm việc. Chúng không nằm trong hệ thống luân chuyển của Minecraft, phải xử lý riêng.
:::

## 2. Vì sao nhật ký có thể viết chết máy chủ

Nhật ký tăng có ba dạng điển hình, dạng thứ ba nguy hiểm nhất:

1. **Tăng bình thường**: người chơi ra vào, plugin ghi theo ngày, từ từ lớn lên.
2. **Tăng đột biến**: máy công khai bị quét, bị ép tải, bị spam kết nối, mỗi kết nối có thể ghi một dòng.
3. **Spam vòng lặp**: một plugin ném ngoại lệ trong `onTick`, hoặc một tác vụ thất bại mỗi giây —— **20 dòng mỗi giây**, một ngày là khoảng 1,7 triệu dòng, tính 150 byte mỗi dòng là **khoảng 250 MB/ngày**, và nó không tự dừng.

Đĩa đầy không đơn giản là "nhật ký hơi lớn", nó kéo theo phá hỏng thứ khác:

:::warn Triệu chứng đĩa đầy: bản lưu, plugin, panel cùng có chuyện
- **Lưu bản lưu thất bại**: nhật ký hiện `Failed to save chunk`, `java.io.IOException: No space left on device`, người chơi rớt mạng, chunk quay lui.
- **Plugin ghi cấu hình/cơ sở dữ liệu thất bại**: SQLite báo `database or disk is full`, MySQL báo `Disk full`, dữ liệu nhóm quyền, kinh tế, lãnh thổ có thể bị ghi nửa vời hỏng.
- **Máy chủ chết đúng lúc tệ nhất**: khi tắt máy chủ không ghi được `level.dat`, hoặc tiến trình sập thẳng, sau khi khởi động lại trạng thái thế giới và lần lưu thành công cuối cùng có khoảng trống.
- **Panel và SSH cùng hỏng**: panel không ghi được nhật ký và session, bạn đến cửa "lên xem" cũng không có.
- **inode cũng có thể bị ăn hết**: `df -h` hiện còn chỗ, nhưng `df -i` đã 100%, biểu hiện y như đĩa đầy.
:::

:::tip Cố gắng đừng để thư mục nhật ký và thư mục bản lưu trên cùng một phân vùng
Nếu điều kiện cho phép, đặt `logs/` (hoặc cả điểm mount nhật ký) lên phân vùng riêng hoặc ổ riêng. Như vậy dù nhật ký mất kiểm soát, bản lưu vẫn ghi được, tệ nhất là mất nhật ký chứ không mất bản lưu.
:::

## 3. Đo trước rồi xử lý: bốn lệnh nhìn rõ hiện trạng

Trước khi động tay hãy đo. Các lệnh dưới đây đều chỉ đọc, không phá gì.

```bash
# 1) thư mục nhật ký máy chủ lớn bao nhiêu
du -sh /opt/minecraft/server/logs

# 2) đĩa còn bao nhiêu chỗ, còn bao nhiêu inode
df -h
df -i

# 3) journald chiếm bao nhiêu (bắt buộc xem khi quản lý bằng systemd)
journalctl --disk-usage

# 4) tìm mọi tệp loại nhật ký vượt 100 MB
find /opt/minecraft/server -type f -name '*.log*' -size +100M

# bổ sung: thư mục nào chiếm nhiều nhất trên cả máy
sudo du -x -h -d 1 /var | sort -h | tail -n 10
```

Đọc kết quả chú ý ba việc:

- `du -sh` xem **mức chiếm hiện tại**, `find ... -size +100M` tìm **tệp lớn đơn lẻ**, kết hợp cả hai mới phân biệt được "nhiều tệp nhỏ" và "một tệp quái vật".
- Khi `IUse%` của `df -i` lên 100%, dù `df -h` hiện còn chỗ, máy chủ vẫn không ghi được gì.
- Kết quả `journalctl --disk-usage` là mức chiếm thật của thư mục journal; nó không bị `du -sh logs/` phản ánh, rất dễ bị bỏ sót.

## 4. Chiến lược giữ nhật ký của chính Minecraft

Lõi máy chủ tự làm một lớp luân chuyển: `latest.log` hiện tại được cuộn thành `YYYY-MM-DD-N.log.gz` có ngày, `N` là số thứ tự trong ngày.

**Giữ bao nhiêu bản, và có cấu hình được hay không, hoàn toàn phụ thuộc lõi.** Có lõi chỉ giữ vài bản gần nhất và không có công tắc, có lõi cho khóa trong tệp cấu hình, tên khóa và giá trị mặc định mỗi cái một khác. Ở đây không đoán: **xin lấy tài liệu chính thức và tệp cấu hình của lõi bạn dùng làm chuẩn**, tìm mục cấu hình liên quan `log` trong thư mục lõi, hoặc tra thẳng chương "nhật ký" trong tài liệu lõi.

Nếu lõi không cung cấp cài đặt số bản giữ, hãy giao cho logrotate hoặc script dọn ở tầng hệ thống (các mục dưới). Ngoài ra chú ý: báo cáo sập trong `crash-reports/` **không tham gia** luân chuyển nhật ký của lõi, khi có vòng lặp sập sẽ chất đống vô hạn.

## 5. Dùng logrotate quản `logs/`

logrotate là công cụ chuẩn quản luân chuyển nhật ký trên Linux, gần như bản phân phối nào cũng cài sẵn, và mặc định chạy mỗi ngày một lần qua `logrotate.timer` (hoặc cron). Cấu hình đặt trong một tệp dưới `/etc/logrotate.d/`.

### 5.1 Cấu hình ví dụ đầy đủ

```conf
# /etc/logrotate.d/minecraft
# chú ý: tệp này không được để group hoặc world ghi được, nếu không logrotate vì an toàn sẽ từ chối nạp.

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

# tùy chọn: nhật ký do plugin tự ghi, đường dẫn chỉnh theo thực tế
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

Đổi `/opt/minecraft/server` và `minecraft` thành đường dẫn và tên người dùng thật trên máy bạn. Ký tự đại diện trong khối thứ hai là an toàn: tệp sau luân chuyển sẽ thành `*.log.1` hoặc `*.log.1.gz`, không bị `*.log` khớp lại nữa.

### 5.2 Mỗi chỉ thị làm gì

| Chỉ thị | Tác dụng |
| --- | --- |
| `daily` | Luân chuyển mỗi ngày một lần (với điều kiện logrotate được kích hoạt mỗi ngày, mặc định bản phân phối là vậy) |
| `rotate 14` | Giữ 14 bản lịch sử, bản thứ 15 (cũ nhất) bị xóa |
| `compress` | Tệp lịch sử nén gzip, thường tiết kiệm được hơn 90% dung lượng |
| `delaycompress` | Bản vừa luân chuyển **chưa nén**, đợi lần luân chuyển sau mới nén |
| `missingok` | Tệp không tồn tại thì không báo lỗi (rất hữu ích khi máy chủ chưa khởi động hoặc đã đổi thư mục) |
| `notifempty` | Tệp rỗng thì không luân chuyển, tránh tạo một đống bản lưu trữ rỗng |
| `copytruncate` | **Sao chép trước, rồi làm rỗng tệp gốc tại chỗ**, thay vì đổi tên tệp |
| `su minecraft minecraft` | Thực hiện luân chuyển với danh tính người dùng/nhóm chỉ định; khuyến nghị thêm khi thư mục nhật ký thuộc người dùng máy chủ |

### 5.3 Vì sao copytruncate rất quan trọng với máy chủ đang chạy

Cách luân chuyển mặc định là **rename**: logrotate đổi tên `latest.log` thành `latest.log.1`, rồi (theo chỉ thị `create`) tạo một `latest.log` rỗng mới. Vấn đề là **tiến trình Java đã cầm handle của tệp đó từ lúc khởi động**: sau khi đổi tên, máy chủ vẫn ghi vào "tệp đã bị đổi tên", còn `latest.log` mới thì mãi rỗng, nhật ký trông như "biến mất" cho đến khi máy chủ khởi động lại.

`copytruncate` làm cách khác: **sao chép nội dung một bản, rồi cắt tệp gốc về 0 byte**. inode không đổi, máy chủ tiếp tục ghi vào cùng handle đó, nhật ký mới tự nhiên xuất hiện trong `latest.log`, không cần khởi động lại máy chủ.

Cái giá của nó phải nói rõ:

- Giữa "sao chép xong" và "cắt" có một cửa sổ rất ngắn, **nhật ký mới ghi trong lúc đó sẽ mất** (thường chỉ vài dòng).
- Vì thế `copytruncate` và `create` loại trừ nhau (tệp gốc không đổi, nên không có thao tác tạo mới).
- Nếu nhật ký quan trọng đến mức không được mất một dòng, cách đúng là để máy chủ tự mở lại tệp nhật ký (phần lớn lõi không có giao diện tín hiệu này), hoặc chấp nhận mất vài dòng đó —— với máy chủ Minecraft, vài dòng đó thường chấp nhận được.

:::tip Nhân tiện: delaycompress là để đi với copytruncate
Một số chương trình sau khi luân chuyển vẫn còn giữ handle tệp cũ và tiếp tục ghi trong một khoảng ngắn. `delaycompress` giữ `latest.log.1` vừa luân chuyển ở trạng thái chưa nén, tránh "vừa ghi vừa nén" làm hỏng bản lưu trữ, lần luân chuyển sau mới nén.
:::

### 5.4 Kiểm chứng và tìm lỗi

Sửa cấu hình xong **hãy chạy thử khô trước, đừng đợi thẳng đến ngày mai**:

```bash
# chạy khô: chỉ in ra sẽ làm gì, không thực sự đổi tệp
sudo logrotate -d /etc/logrotate.d/minecraft

# xác nhận không sai thì ép chạy một lần, kiểm chứng kết quả ngay
sudo logrotate -f /etc/logrotate.d/minecraft

# xem kết quả: phải xuất hiện latest.log và latest.log.1 (hoặc .1.gz)
ls -lh /opt/minecraft/server/logs
```

Bẫy thường gặp:

- **Cấu hình không có hiệu lực**: xác nhận hệ thống đang chạy `logrotate.timer`, kiểm tra bằng `systemctl list-timers logrotate.timer`.
- **Báo lỗi quyền**: `/etc/logrotate.d/minecraft` không được để group/world ghi được; thư mục nhật ký phải cho người dùng do `su` chỉ định ghi được.
- **Nhật ký dưới `/etc` hoặc `/usr` không quay được**: `logrotate.service` của bản phân phối mặc định có `ProtectSystem=full`, chặn sửa tệp trong hai thư mục này —— nên đặt máy chủ và nhật ký ở chỗ như `/opt`, `/srv` sẽ đỡ việc hơn.
- **Tệp vẫn lớn lên mà không luân chuyển**: `notifempty` không chặn tệp có nội dung luân chuyển, nhưng điều kiện `daily` có hiệu lực là "thời điểm luân chuyển lần trước", xem đầu ra của `-d` là thấy logic phán định.

## 6. Hạn mức dung lượng của systemd và journald

Khi quản lý máy chủ bằng systemd, stdout/stderr mặc định bị journald thu. journald có hạn mức toàn cục, cấu hình trong `/etc/systemd/journald.conf`:

```ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1month
```

| Mục cấu hình | Ý nghĩa |
| --- | --- |
| `Storage=` | `persistent` ghi xuống đĩa vào `/var/log/journal`, `volatile` chỉ trong bộ nhớ, `auto` xem thư mục có tồn tại không, `none` không lưu |
| `SystemMaxUse=` | journal chiếm tối đa bao nhiêu trên đĩa (mặc định khoảng 10% hệ thống tệp, trần 4G) |
| `SystemMaxFileSize=` | Hạn mức một tệp journal (mặc định khoảng 1/8 của `SystemMaxUse`, trần 128M) |
| `MaxRetentionSec=` | Mục được giữ lâu nhất bao lâu, `0` nghĩa là tắt xóa theo chiều thời gian |
| `SystemKeepFree=` | Ít nhất chừa bao nhiêu chỗ cho việc khác; journald lấy cái chặt hơn giữa nó và `SystemMaxUse` |

Sửa xong phải khởi động lại dịch vụ và thu hồi tay một lần:

```bash
sudo systemctl restart systemd-journald

# xem mức chiếm hiện tại
journalctl --disk-usage

# thu hồi tay (chọn một trong ba, cũng có thể kết hợp)
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-files=20
```

:::warn journald chỉ xóa tệp "đã lưu trữ"
`--vacuum-*` và `SystemMaxUse=` đều chỉ xóa tệp journal **đã lưu trữ**, tệp đang hoạt động (đang ghi) không bị xóa. Nên sau khi thu hồi mức chiếm **có thể vẫn hơi cao hơn hạn mức bạn đặt**, đây là hiện tượng bình thường, không phải cấu hình không có hiệu lực.
:::

## 7. Luân chuyển nhật ký container Docker

Driver `json-file` mặc định của Docker **không luân chuyển gì cả**: container chạy càng lâu, `/var/lib/docker/containers/<ID>/<ID>-json.log` càng lớn, và nó là handle do daemon Docker giữ, `rm` thẳng không giải phóng chỗ ngay.

Giới hạn khi khởi động một container:

```bash
docker run -d --name mc \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  your-minecraft-image
```

Giá trị mặc định ở mức daemon, viết vào `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Sửa xong cần khởi động lại daemon, và **container đã tồn tại phải tạo lại mới có hiệu lực**:

```bash
sudo systemctl restart docker

# xem cấu hình nhật ký và đường dẫn tệp nhật ký hiện tại của một container
docker inspect --format='{{.HostConfig.LogConfig}}' mc
docker inspect --format='{{.LogPath}}' mc

# tình huống khẩn cấp thì cắt trước rồi từ từ tìm lỗi (cũng có hiệu lực với container đang chạy)
sudo truncate -s 0 "$(docker inspect --format='{{.LogPath}}' mc)"

# xem nhật ký hằng ngày
docker logs --tail 200 -f mc
docker system df
```

Dùng Docker Compose thì viết dưới service:

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

## 8. Nhật ký của nginx, panel và proxy

- **nginx**: `/var/log/nginx/access.log` và `error.log`. Gói nginx của bản phân phối **có sẵn** cấu hình logrotate, thường đã luân chuyển; nếu panel bị quét từ internet, `access.log` sẽ phình bất thường, có thể tắt nhật ký truy cập cho tài nguyên tĩnh, hoặc chỉ định tệp nhật ký riêng cho trang panel và thêm `maxsize 200M`.
- **Panel**: thư mục nhật ký của chính panel + cơ sở dữ liệu. Nhật ký panel thường không nằm trong `logs/` của bạn, đừng tưởng dọn `logs/` là xong chuyện.
- **Phía proxy**: Velocity / BungeeCord mỗi cái có thư mục làm việc và `logs/` riêng, cần **thêm riêng** một khối logrotate hoặc quy tắc dọn.
- **Nhật ký truy cập của reverse proxy và panel có IP người chơi**: loại nhật ký này khi tập trung hóa và gửi ra ngoài phải xử lý như dữ liệu riêng tư, tham khảo [An toàn hệ thống](/tutorials/ops/system-security).

## 9. Tập trung nhật ký về một chỗ (tùy chọn)

Tìm lỗi trên một máy là đủ, nhưng máy nhiều lên, hoặc muốn "máy chết rồi nhật ký vẫn còn", thì cần tập trung hóa.

**Cách A: chuyển tiếp rsyslog** (hệ syslog truyền thống, đơn giản trực tiếp)

```conf
# /etc/rsyslog.d/50-forward.conf
# @@ là TCP, @ là UDP; môi trường production dùng TCP
*.* @@10.0.0.5:514
```

Đầu nhận cũng phải chạy rsyslog (và cho phép kết nối từ máy đó). Nhật ký có tên người chơi, IP và có thể cả nội dung chat, **chỉ chuyển tiếp trong mạng tin cậy, hoặc thêm TLS/RELP**.

**Cách B: chuyển tiếp journald** (hệ systemd)

```ini
# /etc/systemd/journald.conf
[Journal]
ForwardToSyslog=yes
ForwardToSocket=10.0.0.5:4444
```

Đầu nhận dùng `systemd-journal-remote` để thu. Chú ý nhắc nhở của tài liệu chính thức: **chuyển tiếp diễn ra đồng bộ**, đầu nhận chậm sẽ kéo journald chậm, rồi kéo dịch vụ ghi nhật ký chậm —— môi trường production thận trọng với `ForwardToConsole=`, tương tự cũng phải đánh giá `ForwardToSocket=`.

**Cách C: chuyển định kỳ** (đỡ việc nhất, cũng ít xảy ra chuyện nhất)

Dùng `rsync` / `rclone` đồng bộ `logs/`, `crash-reports/` mỗi ngày sang máy khác hoặc lưu trữ đối tượng, giữ vài ngày. Nó không thời gian thực, nhưng không cần dịch vụ thường trú, cũng không ảnh hưởng hiệu năng máy chủ, cách làm cụ thể xem [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup).

## 10. Tìm kiếm nhật ký hiệu quả

Nhật ký vài GB là chuyện thường, chiến lược tìm kiếm quan trọng hơn bản thân lệnh: **thu hẹp phạm vi bằng khoảng thời gian hoặc tên tệp trước, rồi mới khớp văn bản.**

| Mục đích | Lệnh |
| --- | --- |
| Theo dõi nhật ký hiện tại thời gian thực | `tail -f logs/latest.log` |
| Xem 200 dòng cuối | `tail -n 200 logs/latest.log` |
| Tìm ngoại lệ kèm số dòng | `grep -n "Exception" logs/latest.log` |
| Đếm số lần xuất hiện | `grep -c "OutOfMemoryError" logs/latest.log` |
| Tìm trong nhật ký nén | `zgrep -n "Exception" logs/2026-10-01-1.log.gz` |
| Tìm qua mọi nhật ký lịch sử | `zgrep -c "Exception" logs/*.log.gz` |
| Tra nhật ký unit theo khoảng thời gian | `journalctl -u minecraft.service --since "2026-10-01" --until "2026-10-02"` |
| Chỉ xem cảnh báo trở lên | `journalctl -u minecraft.service -p warning -n 100 --no-pager` |
| Theo dõi unit thời gian thực | `journalctl -u minecraft.service -f` |
| Lọc nội dung (systemd 237+) | `journalctl -u minecraft.service -g "Exception" --since today` |
| Xem nhật ký lần khởi động trước | `journalctl -b -1` |

Vài thói quen thực chiến:

- **Đừng `grep` thẳng trên `latest.log` 5 GB**: `tail -n 5000` trước, hoặc chọn `*.log.gz` theo ngày, tốc độ khác một bậc.
- `zgrep` đọc thẳng `.gz`, đừng `gunzip` trước —— tệp giải nén sẽ chiếm thêm một bản trên đĩa, đặc biệt nguy hiểm khi đĩa đã căng.
- Dùng `journalctl -o short-iso` để dấu thời gian có múi giờ, so sánh giữa các máy không tính nhầm.
- Định vị được plugin đang spam thì **xử lý nguyên nhân gốc trước** (tắt debug, nâng cấp plugin, tạm vô hiệu hóa), rồi mới dọn nhật ký, nếu không dọn xong lại mọc ra.

## 11. Script dọn và tác vụ định kỳ

logrotate lo "luân chuyển", còn cần một script xử lý thứ nó không với tới: `.log.gz` do lõi tự luân chuyển, báo cáo sập chất đống, và cảnh báo dung lượng.

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-log-cleanup.sh
set -euo pipefail

SERVER_DIR="/opt/minecraft/server"
LOG_DIR="$SERVER_DIR/logs"
CRASH_DIR="$SERVER_DIR/crash-reports"

# 1) xóa nhật ký nén do lõi tự luân chuyển, quá 30 ngày
find "$LOG_DIR" -type f -name '*.log.gz' -mtime +30 -delete

# 2) báo cáo sập chỉ giữ 20 bản mới nhất
if [ -d "$CRASH_DIR" ]; then
    ls -1t "$CRASH_DIR"/crash-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f
fi

# 3) liệt kê nhật ký vẫn vượt 100 MB, để người xác nhận
find "$SERVER_DIR" -type f -name '*.log*' -size +100M -exec ls -lh {} +
```

```bash
chmod +x /usr/local/bin/mc-log-cleanup.sh
```

**Định kỳ bằng cron (mỗi ngày 04:15):**

```bash
# crontab -e  (hoặc /etc/cron.d/mc-log-cleanup, chú ý cách sau cần ghi tên người dùng)
15 4 * * * /usr/local/bin/mc-log-cleanup.sh >> /var/log/mc-log-cleanup.log 2>&1
```

**Định kỳ bằng systemd timer (khuyến nghị, có nhật ký, tra được trạng thái, lần chạy bị lỡ có thể chạy bù):**

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

:::tip Script dọn phải "xóa thứ mình sinh ra trước, rồi mới báo động"
Script đừng mở đầu bằng `rm -rf logs/*`: đó là xóa luôn bằng chứng. Thứ tự đúng là **xóa bản lưu trữ theo tuổi → kiểm soát số báo cáo sập → báo ra tệp lớn bất thường hoặc mới bất thường**. Thứ thực sự cần người xem chính là "hôm nay nhật ký tăng 3 GB" — bản thân việc đó.
:::

## 12. Danh sách bảo trì

| Tần suất | Hành động | Lệnh / vị trí |
| --- | --- | --- |
| Hằng ngày (tự động) | logrotate luân chuyển nhật ký máy chủ và plugin | `logrotate.timer`, cấu hình ở `/etc/logrotate.d/minecraft` |
| Hằng ngày (tự động) | Script dọn xóa bản lưu trữ cũ, kiểm soát số báo cáo sập | `mc-log-cleanup.timer` |
| Hằng tuần | Xem mức đĩa và inode | `df -h`, `df -i` |
| Hằng tuần | Xem mức chiếm journal và tệp nhật ký lớn nhất | `journalctl --disk-usage`, `find ... -size +100M` |
| Hằng tuần | Kiểm tra báo cáo sập có tăng theo lô không (có thể là vòng lặp sập) | `ls -1t crash-reports/ \| head` |
| Hằng tháng | Rà lại cấu hình logrotate và số bản giữ còn phù hợp không | `logrotate -d /etc/logrotate.d/minecraft` |
| Hằng tháng | Xác nhận nhật ký tập trung/ngoài trạm thật sự có dữ liệu mới đến | Thời gian sửa đổi ở thư mục đầu nhận hoặc lưu trữ đối tượng |
| Sau mỗi thay đổi | Đổi đường dẫn, tên người dùng, tên unit xong chạy thử khô một lần | `sudo logrotate -d` |
| Khi có sự cố | Lưu trữ hiện trường trước rồi mới dọn | Sao `latest.log` và `crash-reports/` liên quan ra ngoài, rồi mới động tay |

## 13. Bước tiếp theo

- Cho nhật ký và chỉ số cùng báo động, thay vì có người ngồi nhìn: xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).
- Tính nhất quán của nhật ký và bản lưu, chính sách giữ: xem [Sao lưu và khôi phục](/tutorials/java/backup).
- Đưa bản sao nhật ký ra khỏi máy: xem [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup).
- Tổng quan kết cấu thư mục máy chủ: xem [Cấu trúc máy chủ](/tutorials/java/structure).

> Đường dẫn và bố cục thư mục cụ thể thay đổi theo phiên bản game và lõi, xin lấy tài liệu chính thức làm chuẩn.
