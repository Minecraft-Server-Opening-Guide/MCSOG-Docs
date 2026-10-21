---
title: Di chuyển máy chủ: đổi máy và đổi phòng máy
slug: server-migration
cat: ops
level: 3
order: 20
minutes: 16
tags: [vận hành, di chuyển, rsync, DNS, chuyển đổi, quay lui, checklist, systemd]
updated: 2026-10-04
draft: false
---

Di chuyển (migration) nghĩa là **bê cả bộ máy chủ từ môi trường này sang môi trường khác**: đổi phần cứng tốt hơn, đổi nhà cung cấp, rời khỏi phòng máy chất lượng mạng kém, hoặc đơn giản là để tiết kiệm tiền. Nó nguy hiểm hơn "cài mới một máy chủ từ số 0" rất nhiều —— cài mới thất bại chỉ là tạm thời không có máy chủ, **di chuyển thất bại là máy chủ cũ đã dừng mà máy chủ mới không lên được**.

Bài này nói về quy trình đầy đủ và danh sách kiểm tra của việc di chuyển. Cần bê những tệp nào, tệp nào tuyệt đối không động vào, xem [Cấu trúc máy chủ](/tutorials/java/structure); phạm vi sao lưu và diễn tập khôi phục xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).

## 1. Khi nào nên di chuyển

| Nguyên nhân kích hoạt | Tín hiệu điển hình | Chỗ cần đặc biệt cẩn thận khi di chuyển |
| --- | --- | --- |
| Nâng cấp phần cứng | TPS lâu dài thấp, bộ nhớ căng, IO đĩa kịch, mà tối ưu không còn dư địa | Hiệu năng đơn nhân CPU của máy mới quan trọng hơn số nhân; xác nhận điểm nghẽn thật sự nằm ở phần cứng trước |
| Đổi nhà cung cấp | Ticket không ai trả lời, chia sẻ quá bán nghiêm trọng, tin đồn bỏ trốn, tính phí không minh bạch | Dữ liệu ra khỏi biên giới và tuân thủ, phí lưu lượng ra, xác nhận môi trường mới khả dụng trước khi trả máy |
| Rời vùng mạng kém | Người chơi độ trễ cao, đi đường vòng nghiêm trọng, mất gói, bị DDoS mà không có phòng thủ | Chất lượng đường truyền vùng đích phải **đo thực tế**, đừng chỉ xem quảng cáo của nhà bán |
| Giảm chi phí | Áp lực hóa đơn lớn, hoặc cấu hình để không quá cao | Máy rẻ thường chia sẻ CPU, đĩa chậm hơn, đo tải trước rồi mới bê |
| Điều chỉnh kiến trúc | Từ một máy sang máy chủ nhóm, thêm bảng điều khiển, thêm cơ sở dữ liệu | Đây không còn là "di chuyển" mà là "xây lại + bê dữ liệu", phải làm phương án riêng |

:::note Giải quyết tại chỗ được thì đừng di chuyển
Mỗi bước di chuyển đều có rủi ro dừng máy và rủi ro dữ liệu. **Nếu chỉ thiếu bộ nhớ, thêm bộ nhớ rẻ hơn di chuyển; nếu chỉ độ trễ cao, hãy kiểm tra xem có phải vấn đề định tuyến hoặc cấu hình proxy không.** Để việc di chuyển cho những tình huống "thật sự không giải quyết được".
:::

## 2. Danh sách kiểm tra trước khi di chuyển

Khâu dễ hỏng nhất của di chuyển không phải `rsync`, mà là **"trên máy cũ rốt cuộc đang chạy những gì, chính tôi cũng không nắm"**. Viết danh sách ra trước, rồi mới động tay.

| Mục kiểm tra | Tra thế nào | Tiêu chuẩn đạt |
| --- | --- | --- |
| Máy này chạy những dịch vụ nào | `systemctl list-units --type=service --state=running`, `ss -tlnp`, `docker ps`, `crontab -l` | Mỗi mục nói ra được công dụng, và biết có phải bê theo không |
| Phiên bản game và lõi | Nhật ký khởi động máy chủ, `/version`, tên tệp lõi | Ghi lại "phiên bản game + tên lõi + số bản dựng lõi" |
| Danh sách phiên bản plugin / mod | Danh sách thư mục `plugins/`, `mods/` | Có tệp danh sách (số phiên bản tái lập được), không chỉ bản thân thư mục |
| Phiên bản Java | `java -version` | Máy cũ và máy mới giống nhau; **nâng Java là việc khác, đừng làm cùng lúc với di chuyển** |
| Hệ điều hành và kernel | `cat /etc/os-release`, `uname -a` | Biết khác biệt (bản phân phối, glibc, hệ thống tệp) |
| Bản ghi DNS và TTL | `dig +noall +answer example.com`, `dig _minecraft._tcp.example.com SRV` | Loại bản ghi (A / AAAA / SRV) và TTL hiện tại đều có ghi lại |
| Ai có quyền truy cập | Khóa công khai SSH, tài khoản bảng điều khiển, tài khoản nhà cung cấp, danh sách đồng quản trị | Sau khi di chuyển **đối chiếu từng mục**, cái cần xóa thì xóa |
| Bản sao lưu có khôi phục được không | Thực sự làm một lần diễn tập khôi phục | Không phải "có tệp sao lưu", mà là "**đã khôi phục, lên được**" |
| Phụ thuộc bên ngoài | Cơ sở dữ liệu, lưu trữ đối tượng, API Key, Webhook, giám sát | Trên máy mới kết nối được, thông tin xác thực còn hiệu lực |

:::warn Di chuyển mà chưa kiểm chứng bản sao lưu là đánh bạc
`rsync --delete` viết sai đường dẫn, đĩa đầy, quyền sai, gói lưu bị cắt —— bất kỳ cái nào cũng khiến bạn phát hiện "không có bản sao dùng được" sau khi đã dừng máy chủ. **Trước khi động tay bắt buộc phải có một bản sao lưu ngoại tuyến đã kiểm chứng khôi phục được**, và trong khung giờ bảo trì đừng xóa nó. Sao lưu mà chưa kiểm chứng thì bằng không sao lưu.
:::

## 3. Cái gì bắt buộc phải bê

Mỗi dòng trong bảng dưới đây đều là thứ từng bị bỏ sót trong sự cố thật. **Bỏ sót thế giới là thảm họa, bỏ sót cách khởi động thì là "dữ liệu còn đủ mà dịch vụ không lên".**

| Mục | Vị trí (ví dụ `/opt/mcserver`) | Hậu quả nếu bỏ sót |
| --- | --- | --- |
| Bản lưu thế giới | `world/`, `world_nether/`, `world_the_end/` (tên lấy theo `level-name` trong `server.properties`) | **Nghiêm trọng nhất**: công trình, túi đồ, tiến trình của người chơi mất hết |
| Bản thân plugin / mod | `plugins/`, `mods/` | Vào máy chủ thiếu chức năng, hoặc client người chơi không vào được vì mod không khớp |
| Cấu hình plugin / mod | `plugins/<tên plugin>/`, `config/` | Quyền, kinh tế, lãnh thổ, điểm dịch chuyển, bể quay thưởng đều về mặc định |
| Cấu hình lõi | `server.properties` | Cổng, độ khó, xác minh bản quyền, khoảng cách nhìn, công tắc danh sách trắng đều về mặc định |
| Cấu hình của chính lõi | `bukkit.yml`, `spigot.yml`, `paper-*.yml`, `purpur.yml` | Tham số tối ưu, giá trị mặc định thế giới mất, hiệu năng có thể thay đổi rõ rệt |
| Tệp danh sách | `ops.json`, `whitelist.json`, `banned-players.json`, `banned-ips.json` | Mất quyền quản trị, hoặc cấm mất hiệu lực, danh sách trắng thành vô dụng |
| Bộ nhớ đệm tên người chơi | `usercache.json` | Thường xây lại được, nhưng ánh xạ UUID và tên hiển thị ở chế độ ngoại tuyến sẽ rối tạm thời |
| Script khởi động | `start.sh`, `start.bat`, tham số Java | **Mục bị bỏ sót phổ biến nhất**: dịch vụ không lên, hoặc tham số sai khiến bộ nhớ/hiệu năng bất thường |
| systemd unit | `/etc/systemd/system/minecraft.service` | Không tự khởi động khi boot, sập không tự khởi động lại; `WorkingDirectory` viết sai còn tạo ra một thế giới trống |
| Tác vụ định kỳ | `crontab -l`, `/etc/cron.d/`, systemd timer | Tác vụ sao lưu, khởi động lại, dọn dẹp mất hết, và **rất lâu sau mới phát hiện** |
| Quy tắc tường lửa | `ufw status`, `firewall-cmd --list-all`, nhóm bảo mật cloud | Cổng không thông, người chơi không kết nối được; hoặc thiếu quy tắc cũ dẫn đến lộ ngoài ý muốn |
| Chứng chỉ TLS | `/etc/letsencrypt/`, `/etc/ssl/` | Dịch vụ HTTPS như bảng điều khiển, bản đồ, gói tài nguyên bị gián đoạn hoặc cảnh báo chứng chỉ |
| Dữ liệu MCDR | `config.yml`, `permission.yml`, `plugins/` trong thư mục chạy MCDR | Quyền của bot, bí danh lệnh, trạng thái plugin mất (tên tệp và cấu trúc cụ thể lấy tài liệu chính thức MCDR làm chuẩn) |
| Dữ liệu bảng điều khiển | Cấu hình và thư mục định nghĩa instance của bảng điều khiển | Tệp máy chủ còn đó, nhưng trong bảng điều khiển "không còn gì"; chi tiết xem [Bảng điều khiển máy chủ](/tutorials/ops/panels) |
| Tệp thông tin xác thực | `.env`, `rcon.password`, mật khẩu cơ sở dữ liệu, khóa lưu trữ cloud | Dịch vụ không lên, hoặc lên rồi không kết nối được phụ thuộc |
| Cấu hình reverse proxy | Tệp site và đường dẫn chứng chỉ của Nginx / Caddy | Truy cập tên miền báo 502, và dễ bị hiểu nhầm là "máy chủ không lên" |
| Giám sát và cảnh báo | Probe, Agent, quy tắc cảnh báo | Có vấn đề mà **không ai nhận được thông báo**, đây là kiểu "thất bại im lặng" nguy hiểm nhất |

### Những thứ không cần bê

| Mục | Lý do |
| --- | --- |
| `logs/`, `crash-reports/` | Dung lượng lớn; khi cần tra vấn đề cũ thì lấy riêng |
| `cache/`, `libraries/`, `versions/` | Tự xây lại khi khởi động |
| `world/session.lock` | Tệp khóa lúc chạy, phía đích nên xóa, máy chủ sẽ tự tạo lại |
| Gói tạm trên máy cũ, `*.tar.gz` | Dễ đồng bộ luôn vài trăm GB tệp tạm sang |

## 4. Cách di chuyển

### 4.1 rsync qua SSH (ưu tiên)

`rsync` chỉ truyền phần thay đổi, giữ quyền và dấu thời gian, đi qua kênh mã hóa SSH, là cách di chuyển phổ biến nhất.

```bash
# Lần đầu: máy chủ vẫn đang chạy, làm "đồng bộ trước", bê phần lớn dữ liệu sang trước
rsync -aHAX --numeric-ids --delete --info=progress2 \
  --exclude='logs/' \
  --exclude='crash-reports/' \
  --exclude='cache/' \
  --exclude='libraries/' \
  --exclude='versions/' \
  --exclude='session.lock' \
  /opt/mcserver/ \
  mcserver@203.0.113.20:/opt/mcserver/
```

| Tùy chọn | Tác dụng |
| --- | --- |
| `-a` | Chế độ lưu trữ (tương đương `-rlptgoD`): đệ quy và giữ liên kết tượng trưng, quyền, thời gian, nhóm sở hữu, tệp thiết bị |
| `-H` | Giữ hard link |
| `-A` | Giữ ACL |
| `-X` | Giữ thuộc tính mở rộng (xattr) |
| `--numeric-ids` | Ánh xạ theo UID/GID số, **bắt buộc thêm khi khác máy**, nếu không chủ sở hữu sẽ rối |
| `--delete` | Cho phía đích khớp phía nguồn (**dao hai lưỡi**, nguồn xóa nhầm sẽ được đồng bộ sang) |
| `--info=progress2` | Hiển thị tiến trình tổng thể (rsync 3.1 trở lên) |

**Mọi lệnh có `--delete`, lần đầu đều phải chạy thử với `-n` (`--dry-run`) và `-i` (liệt kê từng thay đổi) trước**, xác nhận nó không xóa thứ không nên xóa:

```bash
rsync -aHAX --numeric-ids --delete -n -i \
  --exclude='logs/' --exclude='cache/' \
  /opt/mcserver/ mcserver@203.0.113.20:/opt/mcserver/
```

:::warn Dấu gạch chéo cuối đường dẫn nguồn không được viết tùy tiện
`/opt/mcserver/` (có gạch chéo) nghĩa là "đồng bộ nội dung trong thư mục này"; `/opt/mcserver` (không gạch chéo) nghĩa là "tạo thư mục `mcserver` ở phía đích rồi đặt vào". **Kết hợp `--delete` mà viết sai có thể làm rối toàn bộ cấu trúc thư mục phía đích.**
:::

### 4.2 tar + scp (dữ liệu ít, không có rsync)

Khi không có `rsync` hoặc dữ liệu rất ít, có thể đóng gói và truyền thẳng qua ống, không sinh tệp trung gian:

```bash
# Chạy trên máy cũ: đóng gói và giải qua SSH sang máy mới
tar -C /opt/mcserver -czf - \
  --exclude='logs' --exclude='crash-reports' --exclude='cache' \
  --exclude='libraries' --exclude='versions' --exclude='session.lock' \
  . | ssh mcserver@203.0.113.20 'mkdir -p /opt/mcserver && tar -C /opt/mcserver -xzf -'
```

Cũng có thể tạo tệp rồi mới truyền:

```bash
tar -czf /tmp/mcserver-2026-10-04.tar.gz -C /opt/mcserver .
scp /tmp/mcserver-2026-10-04.tar.gz mcserver@203.0.113.20:/tmp/
```

Nhược điểm là **mỗi lần đều toàn bộ, không tăng dần, gián đoạn phải làm lại**, bản lưu vài trăm GB không phù hợp.

### 4.3 Snapshot cấp nhà cung cấp / sao chép ổ (nhanh nhất)

Khi di chuyển trong cùng một nhà cung cấp, thường có thể **tạo snapshot cho đĩa hệ thống hoặc đĩa dữ liệu, rồi gắn snapshot vào instance mới**, hoặc gỡ ổ cloud khỏi instance cũ và gắn sang instance mới. Cách này nhanh hơn sao chép tệp qua mạng vài bậc độ lớn.

Phải chú ý:

- **Tính nhất quán của snapshot tùy vào lúc tạo snapshot máy chủ có đang ghi đĩa không.** Muốn snapshot đáng tin, dừng máy chủ trước (hoặc ít nhất `save-all` + `save-off`), tạo xong rồi `save-on`.
- Đường dẫn gắn ổ, tên thiết bị, UUID hệ thống tệp có thể thay đổi, `/etc/fstab` phải dùng UUID hoặc cấu hình lại, nếu không instance mới không khởi động lên.
- Khác nhà cung cấp, khác vùng thường **không** gắn ổ trực tiếp được, chỉ có thể sao chép qua mạng.
- Snapshot chứa khóa host SSH của máy cũ, cấu hình IP cũ, thông tin xác thực bảng điều khiển —— **sau khi di chuyển phải xoay thông tin xác thực**.

### 4.4 Vì sao bắt buộc đồng bộ hai lần

| Giai đoạn | Trạng thái máy chủ | Mục đích |
| --- | --- | --- |
| Đồng bộ lần một | **Đang chạy** | Bê vài chục đến hàng trăm GB dữ liệu tồn sang trước, ép khung giờ bảo trì từ "vài giờ" xuống "vài phút" |
| Đồng bộ lần hai | **Đã dừng máy chủ** | Chỉ truyền phần thay đổi, cho phía đích khớp dữ liệu tại khoảnh khắc dừng máy chủ |

Trong lần đồng bộ đầu máy chủ vẫn ghi đĩa, nên bản sao đó **tự nó không nhất quán** —— giá trị của nó chỉ là "phần lớn tệp đã vào chỗ", tính đúng đắn hoàn toàn dựa vào lần đồng bộ thứ hai. Vì vậy:

- Lần đồng bộ thứ hai **bắt buộc sau khi dừng máy chủ**, và sau khi dừng thì đừng khởi động lại máy cũ (nếu không lại phải đồng bộ lại).
- `rsync` mặc định dựa vào "kích thước + thời gian sửa" để quyết định có truyền lại không. Muốn so sánh theo nội dung chặt hơn, lần hai có thể thêm `--checksum` (`-c`): **chậm hơn, nhưng không bỏ sót tệp "cùng kích thước, dấu thời gian được giữ, nhưng nội dung khác".**
- Đồng bộ lần hai xong, **làm một lần kiểm tra nữa (xem mục sau)**, đừng chỉ vì "lệnh không báo lỗi" mà mở máy chủ.

## 5. Khung giờ bảo trì: thao tác từng bước

Thông báo trước thời gian bảo trì (và nói rõ thời lượng dự kiến cùng phương án đền bù), rồi thực hiện theo thứ tự dưới đây. **Mỗi bước xác nhận kết quả rồi mới sang bước tiếp.**

1. **Đóng băng thay đổi**: thông báo đồng quản trị không sửa cấu hình, không cài plugin nữa; xác nhận không có tác vụ sao lưu/dọn dẹp đang chạy xung đột với di chuyển.

2. **Xác nhận lại một lần bản sao lưu khả dụng**: xác nhận bản sao lưu ngoại tuyến tồn tại, kiểm tra qua, và **không** nằm trên đường dẫn bạn sắp xóa hoặc ghi đè.

3. **Giảm TTL DNS**: nếu chưa giảm thì giờ giảm xuống 60 - 300 giây (có hiệu lực cần đợi TTL cũ hết hạn, nên bước này thực ra phải **làm trước 24 - 48 giờ**, xem mục 6).

4. **Dừng máy chủ**:

```bash
sudo systemctl stop minecraft
pgrep -a java          # phải không có đầu ra, xác nhận tiến trình thực sự thoát
```

5. **Đồng bộ lần cuối** (lệnh ở mục 4.1 bỏ những thứ không nên loại trong `--exclude`, và thêm `-c`):

```bash
rsync -aHAX --numeric-ids --delete --checksum --info=progress2 \
  /opt/mcserver/ mcserver@203.0.113.20:/opt/mcserver/
```

6. **Kiểm tra**: hai đầu mỗi bên tạo một bản danh sách rồi so sánh. Đường dẫn phải là **đường dẫn tương đối**, nếu không tên tệp không khớp.

```bash
# Máy cũ
cd /opt/mcserver && find . -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/old.sha256

# Máy mới (cùng lệnh, xuất ra /tmp/new.sha256), rồi:
diff /tmp/old.sha256 /tmp/new.sha256 && echo "kiểm tra qua"
```

Trên Windows có thể dùng `Get-FileHash -Algorithm SHA256` so từng tệp; khi dữ liệu ít cũng có thể chỉ so kích thước và số tệp:

```powershell
Get-ChildItem -Recurse -File C:\mcserver | Measure-Object -Property Length -Sum
```

7. **Dọn tàn dư lúc chạy trên máy mới**:

```bash
rm -f /opt/mcserver/world/session.lock
```

8. **Xác nhận môi trường máy mới**: phiên bản Java giống máy cũ (`java -version`), chủ sở hữu thư mục đúng, cổng trong `server.properties` không xung đột dịch vụ khác.

9. **Cài và khởi động dịch vụ quản lý**:

```bash
sudo cp minecraft.service /etc/systemd/system/minecraft.service
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
journalctl -u minecraft -n 50 --no-pager
```

10. **Đo thực tế bằng cùng một client**: trước tiên dùng IP mới kết nối trực tiếp (xem mục 6), vào máy chủ kiểm tra công trình then chốt, nội dung vật chứa, túi đồ, quyền, lệnh plugin có bình thường không.

11. **Chuyển DNS**: xác nhận máy chủ mới bình thường rồi trỏ bản ghi sang IP mới.

12. **Giữ máy cũ một thời gian**: **đừng trả máy hay cài lại ngay**, nó là mục tiêu quay lui của bạn (xem mục 9).

## 6. DNS và chuyển đổi

### TTL phải giảm trước

Bản ghi DNS có thời gian cache (TTL). Nếu TTL là 24 giờ, sau khi bạn chuyển bản ghi **trong tối đa 24 giờ vẫn sẽ có người chơi được phân giải về IP cũ**.

```bash
# Xem phân giải hiện tại và TTL
dig +noall +answer mc.example.com
dig +noall +answer mc.example.com AAAA
dig +noall +answer _minecraft._tcp.mc.example.com SRV
```

**Quy trình là**: trước khi di chuyển 24 - 48 giờ giảm TTL xuống 60 - 300 giây -> đợi TTL cũ hết hạn -> di chuyển -> chuyển bản ghi -> xác nhận ổn định rồi chỉnh TTL về giá trị lớn hơn (giảm áp lực phân giải).

### Kiểm tra máy chủ mới thế nào trước khi chuyển

**Đừng đổi DNS khi chưa kiểm chứng máy chủ mới.** Hai cách kiểm tra an toàn:

| Cách | Làm thế nào | Áp dụng |
| --- | --- | --- |
| Tệp hosts | Trỏ tên miền về IP mới trong hosts của máy | Chỉ ảnh hưởng chính mình, phù hợp để chủ máy chủ và đồng quản trị kiểm tra trước |
| Kết nối trực tiếp IP mới | Client điền thẳng `203.0.113.20:25565` | Mọi người dùng được, **không phụ thuộc DNS** |

```text
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux / macOS: /etc/hosts
203.0.113.20  mc.example.com
```

:::tip Nhất định phải "dùng cùng một client" để đo
Đổi máy tính, đổi mạng, đổi phiên bản game để đo thì đo ra đều không phải trải nghiệm thật của người chơi. **Dùng đúng client bạn vẫn chơi, kết nối một lần trên cùng đường mạng**, mới tính là kiểm chứng.
:::

### Đừng quên bản ghi SRV

Nhiều máy chủ dùng bản ghi SRV để người chơi chỉ điền tên miền (không ghi cổng). Khi di chuyển **phải đổi cả đích SRV trỏ tới**, nếu không người chơi vẫn bị dẫn về máy cũ:

```text
_minecraft._tcp.mc.example.com. 300 IN SRV 0 5 25565 mc.example.com.
```

### Máy cũ phải giữ làm mục tiêu quay lui

Sau khi chuyển **giữ ít nhất một khung giờ bảo trì đầy đủ** (cách làm phổ biến là 24 - 72 giờ, tùy quy mô người chơi và thời gian dừng máy chủ bạn chấp nhận được):

- Giữ máy cũ **khởi động được bất cứ lúc nào** (cấu hình, dữ liệu, môi trường Java đều đừng động vào).
- Nhưng **đừng** để hai máy cùng phục vụ một tên miền ra ngoài —— nó khiến dữ liệu người chơi phân liệt sang hai thế giới, sau này không gộp được.
- Nếu máy cũ vẫn bị DNS phân giải tới (TTL chưa hết), có thể cân nhắc **giữ máy chủ trên máy cũ ở trạng thái dừng**, chỉ khởi động khi cần quay lui.

## 7. IP đổi, ảnh hưởng kéo theo là gì

IP đổi một cái là mọi thứ "lấy IP làm chuẩn" đều mất hiệu lực. **Bỏ sót mục này, triệu chứng thường là "người chơi vào được máy chủ, nhưng một chức năng nào đó tự nhiên không hoạt động".**

| Thứ bị ảnh hưởng | Triệu chứng | Xử lý |
| --- | --- | --- |
| Danh sách trắng của dịch vụ khác | Cơ sở dữ liệu, lưu trữ đối tượng, API bên thứ ba từ chối kết nối | Thêm IP mới vào danh sách cho phép, gỡ IP cũ |
| Danh sách IP cho phép của RCON / bảng điều khiển | Bảng điều khiển hiển thị instance offline, RCON không kết nối được | Cập nhật cả allowlist của bảng điều khiển và tiến trình giám sát (mục cấu hình lấy tài liệu chính thức từng bảng điều khiển làm chuẩn) |
| Tường lửa / nhóm bảo mật cloud | Cổng không thông, hoặc reverse proxy không kết nối được backend | Thêm quy tắc cho máy mới, **nhớ đóng lại trên máy cũ**, tránh để lại bề mặt lộ |
| Chứng chỉ TLS và reverse proxy | HTTPS báo lỗi, chứng chỉ không khớp tên miền | Bê chứng chỉ theo máy hoặc cấp lại; đổi upstream của proxy sang IP mới |
| Geyser / Floodgate và máy chủ nhóm | Người chơi Bedrock Edition không vào được, hoặc IP người chơi đều thành IP proxy | Cấu hình chuyển tiếp phải bê theo; chi tiết xem [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup) và [Phía chuyển máy chủ](/tutorials/java/proxy) |
| Danh sách cấm IP | Mục trong `banned-ips.json` có thể trỏ môi trường cũ; hoặc vì cấu hình chuyển tiếp đổi, **mọi người chơi đều hiện là IP proxy, cấm một cái là cấm cả máy chủ** | Sau khi di chuyển kiểm tra chuyển tiếp có hiệu lực không, rồi mới quyết định có dọn cấm IP |
| Giám sát và cảnh báo | Probe vẫn nhìn IP cũ, máy chủ mới chết không ai biết | Cập nhật mục tiêu probe, và **cố ý kích hoạt một lần cảnh báo** xác nhận đường truyền thông |
| Tác vụ sao lưu | Sao lưu vẫn lấy dữ liệu từ máy cũ, hoặc máy mới chưa cấu hình sao lưu | Xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Người chơi Bedrock Edition trong danh sách trắng | Danh tính người chơi Bedrock Edition gắn với XUID, thường **không bị ảnh hưởng bởi đổi IP** | Thường không cần sửa; nhưng nếu plugin chuyển tiếp/quyền phụ thuộc IP thì vẫn phải phúc tra |

:::note Về cấm IP
Cấm IP vốn không phù hợp dùng lâu dài (IP băng thông rộng gia đình sẽ đổi, IP phòng máy bị tái sử dụng). Trước và sau di chuyển nếu thấy danh sách cấm có nhiều mục IP, **hãy xác nhận chúng còn hiệu lực rồi mới quyết định giữ**, đừng bê nguyên.
:::

## 8. Danh sách kiểm chứng sau di chuyển

| Mục kiểm chứng | Kiểm thế nào | Tiêu chuẩn đạt |
| --- | --- | --- |
| Người chơi vào được | Dùng client thật (gồm cả Bedrock Edition, nếu có bật chơi chéo) vào mỗi loại một lần | Vào được, chat được, di chuyển và tương tác bình thường |
| TPS / MSPT bình thường | `/tps`, `/spark tps` hoặc lệnh có sẵn của lõi | Cùng mức với máy cũ, không tụt tick liên tục |
| Plugin / mod nạp đủ | Tìm `Enabling`, `Loaded`, từ khóa báo lỗi trong nhật ký khởi động | Không có `Could not load`, không có không tương thích phiên bản |
| Cấu hình có hiệu lực | Kiểm tra mẫu quyền, kinh tế, lãnh thổ, điểm dịch chuyển | Giống trước khi di chuyển |
| Danh sách đúng | `/whitelist list`, lệnh liên quan `/op` hoặc xem thẳng tệp danh sách | Quản trị viên và danh sách trắng giống máy chủ cũ |
| Sao lưu chạy trên máy mới | Chạy tay script sao lưu một lần | Gói lưu được tạo, kích thước hợp lý, **và thật sự giải ra được** |
| Giám sát đã cập nhật | Xem bảng giám sát | IP mới có nhịp tim, cảnh báo IP cũ đã tắt |
| Tác vụ định kỳ | `crontab -l`, `systemctl list-timers` | Tác vụ sao lưu, khởi động lại, dọn dẹp đều có, thời gian đúng |
| Hiệu năng và đĩa | `df -h`, `iostat`, mức chiếm bộ nhớ | Đĩa còn dư, không có điểm nghẽn IO rõ rệt |
| Máy cũ xuống sóng | Xem bên dưới | **Chỉ sau khi khung quay lui kết thúc** mới trả máy hoặc cài lại |

## 9. Phương án quay lui

Quay lui không phải "bê ngược lại", mà là "**quay về một trạng thái đã biết là dùng được**". Nên phương án quay lui phải viết **trước** khi di chuyển:

1. **Định nghĩa điều kiện kích hoạt**: trong tình huống nào thì quay lui? (Ví dụ: máy chủ mới trong 2 giờ không khởi động ổn định được, kiểm tra bản lưu thất bại, plugin then chốt không hoạt động, TPS chỉ bằng nửa máy cũ mà không định vị được nguyên nhân.)
2. **Nói rõ hành động quay lui**: trỏ DNS về IP cũ -> khởi động dịch vụ trên máy cũ -> thông báo giải thích -> phân tích sau.
3. **Giữ mục tiêu quay lui**: thư mục máy chủ, môi trường Java, systemd unit, quy tắc tường lửa của máy cũ **giữ nguyên**, cho đến khi khung quay lui kết thúc.
4. **Chuẩn bị quy tắc đánh đổi dữ liệu**: nếu máy chủ mới đã chạy một thời gian, người chơi đã chơi trên đó, **tiến trình của thế giới cũ là lạc hậu**. Quay lui nghĩa là mất tiến trình trong khoảng đó, hoặc phải chuyển tay bản lưu thế giới mới về (lúc đó "thế giới mới" mới là dữ liệu mới nhất). **Quyết định này phải rõ trước khi quay lui, không thể vừa quay lui vừa nghĩ.**
5. **Quay lui cũng phải kiểm tra**: trước khi khởi động từ máy cũ, xác nhận dữ liệu của nó giống lúc dừng máy chủ (không bị script sao lưu sửa, không bị xóa nhầm).

:::warn Trường hợp tệ nhất là "cả hai bên cùng chạy"
Nếu hai máy chủ cũ và mới cùng phục vụ ra ngoài (ví dụ cache DNS khiến một phần người chơi nối máy cũ, một phần nối máy mới), **dữ liệu người chơi sẽ phân liệt sang hai thế giới**. Sự phân liệt này thường không gộp tự động được, chỉ có thể chấp nhận mất một phần dữ liệu. **Dừng máy chủ cũ trước khi chuyển là cách đơn giản nhất để tránh sự cố này.**
:::

## 10. Tóm lại

- **Kiểm kê trước, rồi mới động tay**: di chuyển thất bại phần nhiều không phải vấn đề kỹ thuật, mà là "quên mất mình còn đang chạy cái gì".
- **Sao lưu phải được kiểm chứng**: sao lưu chưa kiểm chứng không phải sao lưu, mà là liều thuốc an ủi tinh thần.
- **Đồng bộ hai lần**: một lần hâm nóng (đang chạy), một lần chốt (sau khi dừng), ở giữa đừng khởi động lại máy cũ.
- **Đo trước rồi mới chuyển**: kiểm chứng máy chủ mới bằng tệp hosts hoặc kết nối trực tiếp IP, rồi mới đổi DNS.
- **Giảm TTL trước**: đây là bước duy nhất "bắt buộc làm trước", giảm TTL vào phút chót là không kịp.
- **Giữ mục tiêu quay lui**: máy cũ không phải rác, nó là đường lùi của bạn.

Đọc kèm: [Cấu trúc máy chủ](/tutorials/java/structure) (cần bê những tệp nào), [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) (phát hành ra ngoài của máy mới), [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) (lưới an toàn trước di chuyển), [Gói tài nguyên và data pack](/tutorials/ops/packs) (sau di chuyển phải kiểm tra cả liên kết gói tài nguyên và data pack).

> Lệnh di chuyển, tên khóa cấu hình và cấu trúc thư mục của từng dịch vụ thay đổi theo phiên bản phần mềm, hãy lấy tài liệu chính thức làm chuẩn.
