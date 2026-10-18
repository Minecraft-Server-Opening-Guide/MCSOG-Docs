---
title: Gia cố an ninh hệ thống
slug: system-security
cat: ops
level: 3
order: 6
minutes: 16
tags: [hardening, permissions, systemd, updates, backups, audit, ops]
updated: 2026-10-04
draft: false
---

[Kiến thức cơ bản về an ninh mạng](/tutorials/ops/network-security) giải quyết "người bên ngoài có vào được không". Bài này giải quyết hướng vấn đề khác: **giả sử đã có người vào được (hoặc chính bạn thao tác sai), máy này chịu được bao nhiêu.**

Mục tiêu của gia cố hệ thống không phải "an toàn tuyệt đối" —— thứ đó không tồn tại —— mà là **thu nhỏ quyền, giảm cổng vào, để lại dấu vết**, để một lần sơ suất không biến thành cả máy bị chiếm.

## Một, Tài khoản và quyền

### 1.1 Vì sao tuyệt đối không chạy máy chủ bằng root

| Rủi ro khi chạy bằng root | Hậu quả cụ thể |
| --- | --- |
| **Lỗ hổng trực tiếp bằng cả máy bị chiếm** | Lỗ hổng của máy chủ, plugin, mod bị lợi dụng xong, kẻ tấn công thừa hưởng quyền root, có thể sửa tệp hệ thống, cài cửa sau, xóa sạch dữ liệu |
| **Plugin là mã bên thứ ba** | Tệp jar bạn tải từ diễn đàn chạy cùng quyền với máy chủ. **Chạy bằng root nghĩa là bạn giao cả máy cho một tác giả xa lạ.** |
| **Thao tác sai không cứu được** | Một lệnh xóa viết sai đường dẫn, chạy bằng người dùng thường cùng lắm phá thư mục máy chủ; chạy bằng root có thể phá cả hệ thống |
| **Chủ sở hữu tệp rối loạn** | `world/`, nhật ký, tệp cấu hình do root tạo, người dùng thường không sửa được, sau đó lần bảo trì nào cũng phải `sudo`, cuối cùng thành thói quen xấu "cái gì cũng dùng root" |

:::warn Bảng điều khiển chạy bằng root không có nghĩa máy chủ cũng nên chạy bằng root
Nhiều bảng điều khiển chạy bằng quyền cao để tiện quản lý, và khởi động máy chủ thay bạn. **Đây thuộc vấn đề ranh giới tin cậy của bảng điều khiển, không thể dùng làm lý do "máy chủ nên dùng root".** Nếu bảng điều khiển hỗ trợ chỉ định người dùng chạy, hãy chỉ định người dùng chuyên dụng.
:::

### 1.2 Tạo người dùng hệ thống chuyên dụng

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
```

| Tham số | Tác dụng |
| --- | --- |
| `-r` | Tạo **người dùng hệ thống** (UID cấp từ dải dành riêng của hệ thống, thường không tạo mật khẩu, không hết hạn) |
| `-m` | Đồng thời tạo thư mục home (`-r` mặc định **không** tạo, phải chỉ định rõ) |
| `-d /opt/mcserver` | Chỉ định thư mục home là `/opt/mcserver` |
| `mcserver` | Tên người dùng |

**Tạo thư mục và giao chủ sở hữu cho nó**:

```bash
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo chmod 750 /opt/mcserver
```

`chown -R` đổi chủ sở hữu và nhóm sở hữu của thư mục cùng **nội dung đã có** thành `mcserver` (chỉ dùng `-R` khi cần đệ quy); `chmod 750` cho chủ sở hữu đọc ghi thực thi, cùng nhóm đọc thực thi, người khác không quyền. Dùng `id mcserver` và `ls -ld /opt/mcserver` xác nhận người dùng và chủ sở hữu thư mục.

:::tip Cho người dùng chuyên dụng không đăng nhập được
Nếu tài khoản này chỉ dùng chạy dịch vụ, không cần đăng nhập tương tác, có thể cấm shell của nó:

```bash
sudo usermod -s /usr/sbin/nologin mcserver
```

**Chú ý**: `nologin` sẽ chặn kiểu chuyển đổi `sudo -iu mcserver`. Nếu bạn còn cần chuyển vào để bảo trì, có thể đổi sang `/bin/bash` và kiểm soát bằng khóa cùng quyền, hoặc tạm đổi lại khi cần. **Trên hệ thống, đường dẫn `nologin` có thể là `/usr/sbin/nologin` hoặc `/sbin/nologin`, xác nhận trước rồi mới sửa.**
:::

### 1.3 Dùng sudo có ý thức

Giá trị của `sudo` nằm ở **mỗi lần nâng quyền đều để lại dấu vết** (ghi vào nhật ký hệ thống), và có thể chi tiết đến "một người dùng chỉ chạy được vài lệnh nhất định".

- **Đừng `sudo su -` rồi ngồi luôn trong đó**. Nó làm mất lớp ghi chép "lệnh nào do ai chạy lúc nào".
- **Nâng quyền theo nhu cầu**: một lệnh thì dùng `sudo 命令`, đừng để cả phiên đều dưới root.
- **Dùng `visudo` sửa sudoers**. Nó kiểm tra cú pháp; sửa thẳng `/etc/sudoers` sai một ký tự có thể khiến mọi người không nâng quyền được.

```bash
sudo visudo
```

**Cách làm khuyến nghị**: không sửa thẳng tệp chính `/etc/sudoers`, mà đặt đoạn riêng dưới `/etc/sudoers.d/`, và dùng `sudo visudo -f /etc/sudoers.d/mcadmin` để sửa nhằm có kiểm tra cú pháp. Trong đoạn có thể chi tiết đến lệnh, ví dụ chỉ cho một quản trị viên khởi động lại máy chủ:

```
mcadmin ALL=(root) /usr/bin/systemctl restart minecraft
mcadmin ALL=(root) /usr/bin/systemctl status minecraft
```

**Kiểm toán ai có quyền sudo**:

```bash
getent group sudo    # Nhóm sudo của Debian / Ubuntu
getent group wheel   # Nhóm wheel của hệ RHEL
sudo grep -rHv '^#\|^$' /etc/sudoers /etc/sudoers.d/
```

:::warn Rà soát định kỳ, đừng cấu hình xong là quên
**Quản trị viên đã nghỉ, người bạn giúp tạm thời, tài khoản thêm lúc thử nghiệm ban đầu**, đều sẽ nằm trong nhóm sudo lâu dài. Khuyến nghị định kỳ rà soát một lần, gỡ những người không còn cần (`sudo deluser USERNAME sudo` hoặc `sudo gpasswd -d USERNAME wheel`).
:::

### 1.4 Vô hiệu hóa tài khoản không cần

- **Kiểm tra mọi tài khoản đăng nhập được** (chỉ tài khoản lấy được shell mới là cổng vào thật):

```bash
awk -F: '$7 !~ /(nologin|false)$/ {print $1, $3, $7}' /etc/passwd
```

- **Khóa tài khoản không còn cần**:

```bash
sudo usermod -L USERNAME          # Khóa mật khẩu
sudo usermod -s /usr/sbin/nologin USERNAME   # Đồng thời cấm đăng nhập
```

- **Trọng tâm rà soát**: tài khoản có UID là `0` trong `/etc/passwd` **chỉ được có một cái là `root`**. Cái dư ra là cửa sau:

```bash
awk -F: '$3 == 0 {print $1}' /etc/passwd
```

## Hai, Quyền tệp: quyền tối thiểu áp xuống thư mục

### 2.1 Hiểu bit quyền trước

Cột đầu của `ls -l`, như `-rwxr-x---`, chia ba nhóm: **chủ sở hữu / nhóm sở hữu / người khác**, mỗi nhóm ba vị trí (đọc `r`=4, ghi `w`=2, thực thi `x`=1).

| Quyền | Số | Áp dụng |
| --- | --- | --- |
| `rwx------` | `700` | Thư mục riêng chỉ chủ sở hữu dùng |
| `rwxr-x---` | `750` | Thư mục gốc máy chủ: chủ sở hữu ghi được, cùng nhóm vào được, người khác hoàn toàn không thấy |
| `rw-r-----` | `640` | Tệp cấu hình chủ sở hữu đọc ghi, cùng nhóm chỉ đọc |
| `rw-------` | `600` | **Tệp chứa mật khẩu**, chỉ chủ sở hữu xem được |
| `rwxrwxrwx` | `777` | **Bất cứ lúc nào cũng đừng** |

### 2.2 Vì sao `777` nguy hiểm

`chmod -R 777` là "cách vạn năng" lan truyền rộng nhất trên mạng —— gặp `Permission denied` là 777. Ý nghĩa thật của nó là: **bất kỳ người dùng nào trên hệ thống, bất kỳ tiến trình dịch vụ nào bị chiếm, đều đọc, sửa, xóa được mọi thứ trong thư mục này.**

| Hậu quả | Mô tả |
| --- | --- |
| **Bất kỳ tài khoản cục bộ nào cũng sửa được máy chủ** | Một dịch vụ quyền thấp bị chiếm (ví dụ một ứng dụng web) có thể nhét thẳng một jar cửa sau vào `plugins/`, đợi lần khởi động lại sau là có hiệu lực |
| **Tệp mật khẩu ai cũng thấy** | Mật khẩu RCON trong `server.properties`, mật khẩu cơ sở dữ liệu trong `.env` phơi ra hết |
| **Bản lưu bị phá tùy ý** | Bất kỳ tiến trình nào cũng xóa được `world/` |
| **Che mất vấn đề thật** | Nguyên nhân gốc của báo lỗi quyền thường là "sai chủ sở hữu", `777` chỉ che triệu chứng, vấn đề vẫn còn |

:::warn Cách sửa đúng không phải nới quyền, mà là sửa chủ sở hữu
Gặp `Permission denied`, xem trước **ai đang chạy, cần động tệp nào**:

```bash
ls -l /opt/mcserver/survival/server.properties
```

Nếu chủ sở hữu là `root`, mà dịch vụ chạy bằng `mcserver`, cách đúng là:

```bash
sudo chown mcserver:mcserver /opt/mcserver/survival/server.properties
```

**Không phải** `chmod 777`. **Đổi quyền đệ quy (`chmod -R 777`) trên máy chủ là thao tác nguy hiểm, đừng chạy.**
:::

### 2.3 Quyền khuyến nghị cho thư mục máy chủ

```bash
# Cả thư mục máy chủ thuộc người dùng chuyên dụng
sudo chown -R mcserver:mcserver /opt/mcserver

# Chủ sở hữu toàn quyền; cùng nhóm chỉ đọc và vào; người khác không quyền
sudo chmod -R u=rwX,g=rX,o= /opt/mcserver

# Bản thân thư mục không cấp quyền nào cho người khác
sudo chmod 750 /opt/mcserver
```

`u=rwX,g=rX,o=` là **chế độ ký hiệu**: `X` (chữ hoa) nghĩa là "chỉ thêm quyền thực thi cho thư mục, hoặc cho tệp đã có bit thực thi", sát với nguyên tắc "tệp không nên thực thi" hơn `-R 755` mù quáng. **Đừng dùng `chmod -R 777`, cũng đừng dùng `o+w` (người khác ghi được) trên thư mục máy chủ.**

### 2.4 Đối tượng cần bảo vệ trọng điểm

| Đối tượng | Vì sao | Khuyến nghị |
| --- | --- | --- |
| `world/`, `world_nether/`, `world_the_end/` | Bản lưu là toàn bộ đầu tư của người chơi, bị phá là không cứu được | Chủ sở hữu `mcserver`, người khác không quyền; **sao lưu ngoại tuyến định kỳ** (xem mục năm) |
| `server.properties` | Chứa mật khẩu RCON, cổng, `online-mode` và các công tắc then chốt | `640`, chủ sở hữu `mcserver` |
| `.env`, script chứa mật khẩu | Mật khẩu cơ sở dữ liệu, API Key | **`600`**, chỉ chủ sở hữu đọc ghi |
| `ops.json`, `whitelist.json` | Quyết định ai có quyền quản trị | `640`, sửa xong rà soát lại nội dung |
| Tệp khóa riêng (`id_ed25519` v.v.) | Lộ là giao quyền đăng nhập | **`600`**, thư mục `.ssh` là `700` |
| Tệp sao lưu | Thường chứa mật khẩu và bản lưu đầy đủ | **Đừng đặt ở thư mục web truy cập được**; một bản khác vị trí |

```bash
# Tệp thông tin xác thực chỉ cho chủ sở hữu
chmod 600 /opt/mcserver/survival/.env
ls -l /opt/mcserver/survival/.env
# Kỳ vọng: -rw------- 1 mcserver mcserver ... .env
```

:::note Sao lưu sẽ đổi quyền, khi khôi phục phải hoàn nguyên chủ sở hữu
Sao lưu bằng cách **giữ thuộc tính** như `cp -a`, `tar`, `rsync -a`, khôi phục xong chủ sở hữu và quyền mới đúng. Nếu chỉ chép nội dung, khôi phục xong có thể thành chủ sở hữu root, máy chủ lại không ghi được bản lưu —— khôi phục xong nhớ dùng `ls -ld` kiểm tra một lần.
:::

## Ba, Cập nhật hệ thống

**Đại đa số xâm nhập lợi dụng lỗ hổng "đã được vá nhưng bạn chưa vá".** Giữ cập nhật là biện pháp có hiệu quả trên chi phí cao nhất trong mọi biện pháp gia cố.

### 3.1 Khái niệm tự động hóa cập nhật bảo mật

Ý tưởng của cập nhật tự động là: **bản vá bảo mật tự cài, các cập nhật còn lại bạn tự quyết định**.

| Bản phân phối | Công cụ | Tệp cấu hình |
| --- | --- | --- |
| Ubuntu / Debian | `unattended-upgrades` | `/etc/apt/apt.conf.d/20auto-upgrades`, `/etc/apt/apt.conf.d/50unattended-upgrades` |
| RHEL / Rocky / AlmaLinux / Fedora | `dnf-automatic` | `/etc/dnf/automatic.conf` |

**Ubuntu / Debian**:

```bash
sudo apt update
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Nội dung thường thấy của `20auto-upgrades`:

```ini
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

- `Update-Package-Lists "1"`: làm mới chỉ mục gói mỗi ngày một lần.
- `Unattended-Upgrade "1"`: tự cài bản nâng cấp phù hợp mỗi ngày (**mặc định chỉ gồm cập nhật bảo mật**, phạm vi cụ thể do `Unattended-Upgrade::Allowed-Origins` trong `50unattended-upgrades` quyết định).

**Hệ RHEL**:

```bash
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer
```

Các thiết lập thường thấy trong `/etc/dnf/automatic.conf` liên quan "chỉ cài cập nhật bảo mật, tự áp dụng":

```ini
[commands]
upgrade_type = security
apply_updates = yes
```

**Kiểm chứng có đang chạy không**: `systemctl status unattended-upgrades` (Debian / Ubuntu) hoặc `systemctl status dnf-automatic.timer` (hệ RHEL).

:::warn Mục cấu hình và giá trị mặc định cụ thể thay đổi theo phiên bản
Trên chỉ là cách viết thường gặp. **Tên tệp cấu hình, tên tùy chọn và phạm vi mặc định có thể khác nhau giữa bản phân phối và phiên bản** (ví dụ "có gồm cập nhật không bảo mật không" "có tự dọn kernel cũ không"). Trước khi sửa hãy đối chiếu tài liệu chính thức của phiên bản bạn dùng, và dùng `systemctl status` xác nhận dịch vụ thực sự đang chạy. **Đã cấu hình không bằng đã có hiệu lực.**
:::

### 3.2 Đừng tự động khởi động lại mù quáng

**Cài** bản vá tự động và **khởi động lại** là hai chuyện. Cập nhật các thành phần như kernel, glibc, systemd **chỉ thực sự có hiệu lực sau khi khởi động lại**. **Đừng bật khởi động lại tự động vô điều kiện**, lý do là:

- **Máy chủ game có người chơi**. Khởi động lại nửa đêm sẽ khiến người chơi đang chơi rớt mạng, có thể mất tiến trình, cũng có thể kích hoạt vấn đề bản lưu.
- **Khởi động lại thất bại là downtime dài**. Nếu kernel mới không tương thích driver hoặc môi trường của bạn, máy không lên, mà có thể hôm sau bạn mới phát hiện.
- **Sau khởi động lại máy chủ không nhất thiết tự lên**. Điều này phụ thuộc dịch vụ có `enable` không (xem mục bốn).

**Cách làm khuyến nghị**:

| Cách làm | Mô tả |
| --- | --- |
| **Khung giờ bảo trì** | Cố định một khung giờ ít người chơi (ví dụ rạng sáng thứ Ba), thông báo trước, khởi động lại thủ công |
| **Thông báo trước rồi khởi động lại** | Dùng lệnh máy chủ phát đếm ngược, cho người chơi xuống an toàn |
| **Giữ kernel cũ** | Đừng tự xóa kernel cũ, có vấn đề còn quay lui |
| **Kiểm chứng ngay sau khởi động lại** | Dịch vụ có đang chạy không, cổng có kết nối được không, nhật ký có bất thường không |

Dùng `[ -f /var/run/reboot-required ] && cat /var/run/reboot-required` (Debian / Ubuntu) hoặc `sudo dnf needs-restarting -r` (hệ RHEL) kiểm tra có đang chờ khởi động lại không.

:::tip Khởi động lại một lần trước, xác nhận nó tự lên được
Vào lúc **không có người chơi**, khởi động lại máy một lần thủ công, kiểm chứng "dịch vụ tự khởi động khi boot" thực sự có hiệu lực. **Tự khởi động chưa kiểm chứng thì bằng không có tự khởi động.**
:::

## Bốn, Gia cố dịch vụ (systemd)

### 4.1 Một unit cơ bản

`/etc/systemd/system/minecraft.service`:

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

| Chỉ thị | Tác dụng |
| --- | --- |
| `User=` / `Group=` | **Chạy bằng người dùng chuyên dụng**. Không viết thì mặc định chạy bằng root —— đây là lỗ hổng gia cố phổ biến nhất. |
| `WorkingDirectory=` | Thư mục làm việc của máy chủ. Đường dẫn tương đối (`world/`, `plugins/`) đều lấy nó làm gốc. |
| `ExecStart=` | Lệnh khởi động. **Bắt buộc viết đường dẫn tuyệt đối**, systemd không phân tích `PATH`. |
| `Restart=on-failure` | Khởi động lại khi thoát bất thường. `stop` bình thường không kích hoạt. |
| `RestartSec=10` | Đợi 10 giây trước khi khởi động lại, tránh quay vòng làm ngập nhật ký khi sập. |

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note Unit trong hướng dẫn hiện có dùng screen
Ví dụ trong [Chuẩn bị môi trường](/tutorials/java/environment) dùng `screen` để giữ console, tiện vào máy chủ gõ lệnh. **Hai cách viết đều được**; ví dụ trong bài này dùng `Type=simple` chạy trực tiếp tiến trình Java, phù hợp hơn để chồng các tùy chọn gia cố bên dưới. **Chú ý: khi kết hợp `screen` với các gia cố như `ProtectSystem=strict`, phải xác nhận thư mục socket mà `screen` cần là ghi được.**
:::

### 4.2 Giới hạn tài nguyên

Giới hạn tài nguyên vừa chống "rò rỉ bộ nhớ kéo sập cả máy", vừa chống "bị tấn công làm máy ăn full".

```ini
[Service]
LimitNOFILE=65535
MemoryMax=6G
```

| Chỉ thị | Tác dụng | Lưu ý |
| --- | --- | --- |
| `LimitNOFILE` | Giới hạn số mô tả tệp mở được | Nhiều người chơi, nhiều chunk nạp, giá trị mặc định có thể không đủ, biểu hiện là "kết nối bị từ chối" hoặc lỗi IO khó hiểu |
| `MemoryMax` | **Giới hạn cứng bộ nhớ** của dịch vụ | Vượt sẽ bị kernel OOM giết. **Bắt buộc lớn hơn `-Xmx` rõ rệt**, vì bản thân JVM, metaspace, stack luồng, bộ nhớ trực tiếp đều nằm ngoài đó |

:::warn Đặt `MemoryMax` nhỏ hơn cả `-Xmx` là lỗi điển hình
`-Xmx4G` chỉ giới hạn heap Java. Một máy chủ Minecraft heap tối đa 4G, **bộ nhớ thường trú thực tế có thể lên trên 5G**. Nếu `MemoryMax` đặt `4G`, dịch vụ sẽ bị giết và khởi động lại liên tục, mà từ nhật ký bạn chỉ thấy "tiến trình đột nhiên biến mất".

**Khuyến nghị**: `MemoryMax` để dư ít nhất 30% (ví dụ `-Xmx4G` đi với `MemoryMax=6G`), và quan sát mức chiếm bộ nhớ thực tế trong `systemctl status` rồi chỉnh.
:::

### 4.3 Giới hạn quyền và bảo vệ hệ thống tệp

Các chỉ thị này khiến dịch vụ **chỉ chạm được thứ nó nên chạm**. Dù máy chủ hoặc plugin bị chiếm, phá hoại kẻ tấn công gây ra cũng bị đóng khung.

```ini
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/mcserver/survival
```

| Chỉ thị | Tác dụng |
| --- | --- |
| `NoNewPrivileges=yes` | Cấm tiến trình nâng quyền qua chương trình setuid / setgid. **Mục gia cố gần như không tác dụng phụ, khuyến nghị đều thêm.** |
| `PrivateTmp=yes` | Cấp cho dịch vụ **`/tmp` và `/var/tmp` riêng**, không thấy cũng không ảnh hưởng tệp tạm của tiến trình khác |
| `ProtectSystem=strict` | **Gắn toàn bộ hệ thống tệp thành chỉ đọc** (trừ `/dev`, `/proc`, `/sys`). Dịch vụ chỉ ghi được đường dẫn trong `ReadWritePaths` |
| `ProtectHome=yes` | Làm `/home`, `/root`, `/run/user` **không thấy được** với dịch vụ (tương đương thư mục trống) |
| `ReadWritePaths=` | Kết hợp với `ProtectSystem=strict`, **liệt kê rõ đường dẫn được ghi**. **Không có mục này, máy chủ đến bản lưu cũng không ghi được.** |

:::warn Thêm `ProtectSystem=strict` xong dịch vụ không lên, xem đây trước
Nguyên nhân thường gặp:

1. **Quên `ReadWritePaths`**, hoặc đường dẫn viết sai (phải là đường dẫn tuyệt đối, và khớp `WorkingDirectory`).
2. **Script sao lưu hoặc plugin cần ghi chỗ khác** (như `/var/log`, `/srv`), cần thêm vào `ReadWritePaths` cùng lúc.
3. **Java cần ghi thư mục tạm**: `PrivateTmp=yes` thường đã đủ, nhưng nếu máy chủ cấu hình rõ một đường dẫn tạm cố định, phải thêm nó vào.

**Cách kiểm tra**: `sudo systemctl status minecraft` và `sudo journalctl -u minecraft -n 100` sẽ chỉ thẳng đường dẫn "bị từ chối quyền".
:::

:::note Khả năng dùng được của tùy chọn gia cố tùy phiên bản systemd
Các chỉ thị trên đều dùng được trên systemd mới hơn, nhưng **mức hỗ trợ cụ thể thay đổi theo phiên bản**. Dùng `systemd-analyze security minecraft.service` có thể xem thiết lập sandbox thực sự có hiệu lực của dịch vụ: nó cho điểm "mức phơi nhiễm" và giải thích từng mục, đáng tin hơn thêm chỉ thị theo cảm giác. Tiêu chuẩn cho điểm và tên mục có thể khác nhau giữa các phiên bản, **lấy đầu ra thực tế trên hệ thống bạn làm chuẩn**.
:::

## Năm, Sao lưu cũng là biện pháp an ninh

Mấy mục trên chống "hệ thống bị điều khiển", nhưng còn hai loại đe dọa, **mọi gia cố đều không chặn được**:

| Đe dọa | Biểu hiện |
| --- | --- |
| **Ransomware** | Mã hóa mọi tệp bạn truy cập được. **Bản sao lưu gắn trên cùng máy sẽ bị mã hóa cùng.** |
| **Phá hoại nội bộ / thao tác sai** | Một lệnh `rm -rf` của quản trị viên hoặc plugin, hoặc "cộng tác viên" ác ý xóa dữ liệu rồi bỏ đi |

**Kết luận: ý nghĩa của sao lưu không chỉ là "chống hỏng phần cứng", nó là biện pháp duy nhất chống được ransomware và phá hoại —— với tiền đề bản sao lưu không nằm ở nơi kẻ tấn công chạm tới.**

| Nguyên tắc | Cách làm |
| --- | --- |
| **Ngoại tuyến** | Ít nhất một bản sao lưu trên phương tiện **bình thường không gắn, không kết mạng** (ổ cứng ngoài, snapshot lưu trữ đối tượng) |
| **Khác vị trí** | Đĩa máy này hỏng, phòng máy có sự cố, bản sao lưu cục bộ mất cùng |
| **Có phiên bản** | Chỉ giữ bản mới nhất, gặp "bản lưu đã hỏng từ lâu mà không phát hiện" là hết cách |
| **Quyền** | Tệp sao lưu thường có mật khẩu và bản lưu đầy đủ, **đừng đặt ở thư mục web truy cập được**, quyền siết theo mục hai |

Thao tác cụ thể (sao lưu nhất quán, `save-off` / `save-on`, chính sách lưu giữ, quy trình khôi phục) xem [Sao lưu và khôi phục](/tutorials/java/backup). **Sao lưu chưa kiểm chứng khôi phục không tính là sao lưu.**

:::warn Đừng cấp quyền ghi thư mục sao lưu cho máy chủ
Nếu tiến trình máy chủ (hoặc plugin nó nạp) ghi được thư mục sao lưu, thì một plugin bị chiếm có thể **xóa hoặc mã hóa toàn bộ bản sao lưu của bạn**. Đặt thư mục sao lưu ngoài thư mục máy chủ, và **không cấp quyền ghi cho tài khoản dịch vụ**.
:::

## Sáu, Kiểm toán và vệ sinh hằng ngày

Gia cố không phải hành động một lần. Các kiểm tra dưới đây khuyến nghị **chạy định kỳ**, hoặc ít nhất chạy sau khi bạn đã thay đổi hệ thống.

### 6.1 Danh sách kiểm tra và lệnh

| Mục kiểm tra | Lệnh | Kết quả kỳ vọng |
| --- | --- | --- |
| **Cổng lắng nghe** | `sudo ss -tlnp` | Chỉ dịch vụ bạn biết đang lắng nghe; cổng lạ phải tra rõ |
| **Lắng nghe UDP** | `sudo ss -ulnp` | Như trên (Bedrock Edition / Geyser dùng UDP) |
| **Đăng nhập thất bại** | `sudo lastb \| head` | Nhiều bản ghi nghĩa là đang bị brute-force (cần root; một số hệ thống mặc định không ghi) |
| **Đăng nhập thành công** | `last -n 20` | Không có người dùng hoặc IP nguồn bạn không biết |
| **Tài khoản UID 0** | `awk -F: '$3 == 0 {print $1}' /etc/passwd` | Chỉ có `root` |
| **Tài khoản đăng nhập được** | `awk -F: '$7 !~ /(nologin\|false)$/ {print $1, $7}' /etc/passwd` | Chỉ có người bạn biết |
| **Quyền sudo** | `getent group sudo` / `getent group wheel` | Không có tài khoản đã nghỉ hoặc tạm thời |
| **Tác vụ định kỳ** | `sudo crontab -l`, `ls -l /etc/cron.*`, `systemctl list-timers --all` | Không có tác vụ bạn không tạo |
| **Unit systemd** | `systemctl list-units --type=service --state=running` | Không có dịch vụ lạ |
| **Gói phần mềm không dùng** | `sudo apt autoremove --dry-run` / `sudo dnf autoremove` | Xác nhận thứ sắp xóa thật sự không dùng |
| **Điểm sandbox dịch vụ** | `systemd-analyze security minecraft.service` | Điểm càng thấp càng tốt, xem gợi ý từng mục |

:::warn Mục lạ phải coi trọng
- **Tác vụ cron hoặc unit systemd bạn không tạo**: có thể là cửa sau duy trì, cũng có thể do một gói phần mềm mang theo —— **tra rõ nguồn trước rồi mới quyết định xóa hay không**.
- **Cổng lắng nghe lạ**: trước tiên `sudo ss -tlnp` tìm PID tiến trình, rồi `ps -p PID -o pid,user,cmd` xem nó là gì.
- **Tài khoản lạ**: đừng xóa thẳng, xem thư mục home, `authorized_keys` và bản ghi đăng nhập trước, phán đoán có bị dùng rồi không.
:::

### 6.2 Tối thiểu hóa bề mặt cài đặt

**Càng ít phần mềm cài, càng ít lỗ hổng có thể bị lợi dụng.**

- **Đừng cài môi trường desktop**. Cài desktop trên máy chủ cloud mang theo rất nhiều dịch vụ và cổng không cần thiết (xem [Chọn hệ điều hành](/tutorials/java/os)).
- **Đừng cài dịch vụ không dùng**: FTP, Samba, dịch vụ in, cơ sở dữ liệu (nếu máy chủ không cần).
- **Xác nhận trạng thái dịch vụ**: dịch vụ không cần nên `disable` và `stop`, chứ không phải "cài mà chưa khởi động" —— nó có thể bị chuỗi phụ thuộc kéo lên. Dùng `systemctl is-enabled <service-name>` xem, dùng `sudo systemctl disable --now <service-name>` vô hiệu hóa.

### 6.3 Tra nhanh một trang

- [ ] Máy chủ chạy bằng **người dùng chuyên dụng**, không phải root (dùng `ps -o user,cmd -C java` hoặc `systemctl status` xác nhận)
- [ ] Chủ sở hữu thư mục máy chủ đúng, **không có 777**
- [ ] Quyền tệp chứa mật khẩu là **600**, và không ở thư mục web, không ở kho Git
- [ ] Cập nhật bảo mật tự động đã bật và **xác nhận đang chạy**; **không** bật khởi động lại tự động vô điều kiện
- [ ] Unit systemd đã đặt `User=`, `WorkingDirectory=`, `Restart=`
- [ ] Đã cấu hình `LimitNOFILE`, và `MemoryMax` **lớn hơn rõ rệt** `-Xmx`
- [ ] Đã bật `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem`, `ReadWritePaths` theo nhu cầu
- [ ] Đã khởi động lại máy một lần, xác nhận **dịch vụ tự khởi động khi boot**
- [ ] Có sao lưu **ngoại tuyến / khác vị trí**, và tài khoản dịch vụ **không ghi được** thư mục sao lưu
- [ ] Đã đưa các lệnh kiểm toán trên vào lịch rà soát định kỳ

## Bước tiếp theo

- Phòng thủ ở lớp mạng (cổng, tường lửa, SSH): xem [Kiến thức cơ bản về an ninh mạng](/tutorials/ops/network-security)
- Thao tác cụ thể sao lưu và khôi phục: xem [Sao lưu và khôi phục](/tutorials/java/backup)
- Cấu hình an ninh của máy chủ và plugin: xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java) và [[BE] Plugin an ninh](/tutorials/ops/security-be)
- Chống phá hoại và ghi chép: xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)

---

> Lệnh và cấu hình lấy theo tài liệu chính thức của từng phần mềm. Tên gói, tên dịch vụ, phiên bản systemd và giá trị mặc định của mục cấu hình có thể khác nhau giữa các bản phân phối, hãy lấy đầu ra thực tế trên hệ thống bạn làm chuẩn.
