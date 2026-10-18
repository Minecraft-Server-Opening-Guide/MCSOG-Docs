---
title: Kiến thức cơ bản về an ninh mạng
slug: network-security
cat: ops
level: 3
order: 5
minutes: 16
tags: [network-security, firewall, ssh, ddos, secrets, monitoring, ops]
updated: 2026-10-04
draft: false
---

Máy chủ có thể bị người khác kết nối được, nghĩa là **nó cũng có thể bị người khác quét thấy**. Từ ngày đầu mở máy chủ, IP công cộng của bạn sẽ bị trình quét cổng, script brute-force và các công cụ tấn công kiểu "rải lưới rộng" dò thử đi dò thử lại —— **không phải vì bạn đắc tội với ai, chỉ vì bạn phơi mình ra trên mạng công cộng**.

Bài này nói về phòng thủ ở lớp mạng: **nên mở những cổng nào, cấu hình tường lửa thế nào, gia cố SSH thế nào, bị đánh thì làm gì**. Gia cố bên trong hệ thống xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security).


:::warn Container Docker sẽ đi vòng qua tường lửa của máy
Mọi quy tắc `ufw` / `firewalld` trong trang này **không có hiệu lực với cổng mà container Docker ánh xạ ra**. Docker chèn quy tắc `iptables` của mình trước tường lửa hệ thống, nên `ufw deny` không chặn được cổng container.

Muốn giới hạn thật sự, hãy bind cổng vào loopback (`-p 127.0.0.1:25565:25565`) hoặc dùng chain `DOCKER-USER`. Chi tiết xem [Triển khai Java Edition bằng Docker → Mạng và tường lửa](/tutorials/java/docker).
:::

## Một, Nhận rõ bề mặt tấn công trước

### 1.1 Những cổng bạn thực sự cần mở

| Mục đích | Giao thức | Cổng mặc định | Có mở ra công cộng không |
| --- | --- | --- | --- |
| **Minecraft Java Edition** | TCP | `25565` | Có (cổng vào người chơi) |
| **Bedrock Edition / Geyser** | UDP | `19132` | Có (máy chủ chơi chéo cần) |
| **Giao thức query** | UDP | `25565` | Thường không cần |
| **RCON console từ xa** | TCP | `25575` | **Tuyệt đối không** |
| **Cơ sở dữ liệu** (MySQL / MariaDB) | TCP | `3306` | **Tuyệt đối không** |
| **Redis** | TCP | `6379` | **Tuyệt đối không** |
| **Bảng điều khiển** (các loại bảng quản lý web) | TCP | Tùy bảng điều khiển | **Tuyệt đối không** |
| **SSH** | TCP | `22` | Có, nhưng **giới hạn nguồn** |

:::warn Giá trị mặc định của cổng có thể đã bị đổi
Bảng trên là **giá trị xuất xưởng** của từng phần mềm. Nếu bạn đã đổi `server-port`, `query.port`, `rcon.port` trong `server.properties`, hoặc đổi cổng lắng nghe trong bảng điều khiển, **hãy lấy cấu hình thực tế của bạn làm chuẩn**. Quy tắc tường lửa phải khớp cổng thực tế, nếu không thì hoặc không kết nối được, hoặc để lại một lỗ hổng.
:::

### 1.2 Về RCON và cơ sở dữ liệu: vì sao phải khóa chết

- **RCON là "quyền quản trị không có giao diện"**. Nó đổi một mật khẩu lấy khả năng chạy lệnh tùy ý trong console. Một khi lộ ra công cộng, kẻ tấn công có thể `op` chính mình, xóa sạch bản lưu, đá hết người chơi. **Cách đúng là `enable-rcon=false`, cần quản trị từ xa thì đi qua tunnel SSH hoặc bảng điều khiển qua loopback.**
- **Lộ cổng cơ sở dữ liệu là cửa vào rò rỉ dữ liệu phổ biến nhất**. Khi MySQL cho phép `root` đăng nhập từ mọi máy (`root@%`), mật khẩu yếu sẽ bị brute-force thành công trong vài phút, tài khoản người chơi, hash mật khẩu, lịch sử mua hàng đều lộ hết.
- **Lộ cổng bảng điều khiển bằng cách treo quyền điều khiển cả máy lên mạng công cộng**. Bản thân bảng điều khiển có trang đăng nhập, nhưng trang đăng nhập cũng có thể có lỗ hổng, và nó thường chạy với quyền cao.

Một nguyên tắc cơ bản: **bất kỳ cổng nào không phải "dành cho người chơi dùng" đều không mở ra công cộng.** Khi cần tự truy cập từ xa, dùng tunnel SSH (xem mục bốn) chứ đừng phơi trực tiếp.

### 1.3 Hai việc tiện làm luôn

- **Xác nhận địa chỉ lắng nghe**: cơ sở dữ liệu, bảng điều khiển, RCON nên bind `127.0.0.1` chứ không phải `0.0.0.0`. Bind vào loopback rồi, dù tường lửa cấu hình sai thì bên ngoài cũng không kết nối được.
- **Xác nhận `online-mode`**: Java Edition giữ `online-mode=true` (`server.properties`). Chế độ ngoại tuyến cho phép bất kỳ ai mạo danh ID người khác, thuộc lỗ hổng ở lớp danh tính, tường lửa không vá được. Chi tiết xem [Cấu hình máy chủ](/tutorials/java/config).

## Hai, Tường lửa là hai lớp, không phải một

Đây là điểm người mới dễ bỏ sót nhất:

| Lớp | Vị trí | Ai quản | Ví dụ |
| --- | --- | --- | --- |
| **Nhóm bảo mật cloud / network ACL** | Ở phía nền tảng cloud, lưu lượng **chưa đến máy bạn** | Console nhà cung cấp cloud | Nhóm bảo mật Alibaba Cloud, Tencent Cloud, AWS Security Group |
| **Tường lửa máy chủ** | Trong hệ điều hành, `netfilter` / `nftables` | Bạn tự cấu hình trên máy | `ufw`, `firewalld`, `iptables`, `nftables` |

**Cả hai lớp đều phải cấu hình.** Chỉ cấu hình nhóm bảo mật thì khi máy bị chuyển sang mạng khác hoặc nhóm bảo mật bị nới rộng sẽ mất bảo vệ; chỉ cấu hình tường lửa máy chủ thì nhóm bảo mật mặc định của nhiều nền tảng cloud có thể đã rất rộng, tức là để mở toang cánh cửa đầu tiên.

:::warn Đường dẫn thao tác cụ thể của nền tảng cloud không viết ở đây
Tên menu, cấp bậc và thuật ngữ của console từng nhà cung cấp cloud đều khác nhau ("nhóm bảo mật""tường lửa""network ACL" dùng lẫn lộn), **bài này không đoán đường dẫn menu cụ thể**. Hãy lấy tài liệu chính thức của nhà cung cấp bạn dùng làm chuẩn. Điều có thể khẳng định là: **quy tắc vào (ingress) mặc định nên từ chối toàn bộ, chỉ mở những cổng bạn liệt kê.**
:::

### 2.1 ufw (phổ biến trên Ubuntu / Debian)

`ufw` là frontend của `iptables` / `nftables`, phù hợp cho kịch bản một máy.

```bash
sudo apt update
sudo apt install -y ufw

# Quan trọng: mở SSH trước, rồi mới bật mặc định từ chối, nếu không sẽ tự khóa mình ở ngoài
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp

sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 25565/tcp
sudo ufw allow 19132/udp

sudo ufw enable
sudo ufw status verbose
```

`sudo ufw status verbose` sẽ in ra chính sách và quy tắc hiện tại, bình thường sẽ thấy `Default: deny (incoming), allow (outgoing)` cùng các mục bạn đã mở.

**Thứ tự rất quan trọng**: nếu `sudo ufw enable` trước rồi mới mở SSH, mà kết nối của bạn đúng lúc bị cắt, thì chỉ còn cách vào qua VNC / console cứu hộ của nền tảng cloud.

### 2.2 firewalld (phổ biến trên RHEL / Rocky / AlmaLinux / Fedora)

```bash
sudo dnf install -y firewalld
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --permanent --add-port=19132/udp

# Chỉ cho IP quản trị truy cập SSH
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.10" port port="22" protocol="tcp" accept'

sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

`--permanent` ghi vào cấu hình lâu dài, **bắt buộc `--reload` (hoặc khởi động lại firewalld) mới có hiệu lực**. Thay đổi không có `--permanent` là ở mức chạy, khởi động lại sẽ mất —— hai cách đều có công dụng riêng, đừng dùng lẫn rồi tưởng đã cấu hình xong.

### 2.3 iptables (cách viết truyền thống)

```bash
# Mở kết nối đã thiết lập và loopback
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT

# Chỉ cho IP quản trị truy cập SSH
sudo iptables -A INPUT -p tcp -s 203.0.113.10 --dport 22 -j ACCEPT

# Cổng vào người chơi
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT

# Mặc định từ chối
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
```

Quy tắc `iptables` **mặc định không được lưu lâu dài**, khởi động lại là mất. Cần lưu:

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 2.4 nftables (cách viết hiện đại)

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 25565 accept
sudo nft add rule inet filter input udp dport 19132 accept
```

:::note Trên bản phân phối hiện đại, ufw và firewalld bên dưới chính là nftables
Trên kernel và bản phân phối mới hơn, `ufw` / `firewalld` đã mặc định dùng backend `nftables`. **Đừng bật hai frontend cùng lúc** (ví dụ vừa bật `ufw` vừa bật `firewalld`), chúng sẽ ghi đè quy tắc của nhau, kiểm tra rất khổ. **Chọn một bộ, cấu hình đến cùng.**
:::

### 2.5 "Mở cổng" và "giới hạn nguồn" là hai chuyện

| Cách viết | Ý nghĩa | Rủi ro |
| --- | --- | --- |
| `sudo ufw allow 22/tcp` | **Ai cũng kết nối được cổng 22** | Cả thế giới brute-force được SSH của bạn |
| `sudo ufw allow from 203.0.113.10 to any port 22 proto tcp` | **Chỉ `203.0.113.10` kết nối được cổng 22** | IP đó đổi thì phải sửa quy tắc |

Với cổng vào người chơi (`25565`) bạn **bắt buộc** phải mở rộng nguồn, vì người chơi đến từ khắp nơi. Nhưng với SSH, bảng điều khiển, RCON, cơ sở dữ liệu, những dịch vụ **chỉ mình bạn dùng**, **luôn nên giới hạn nguồn**.

:::tip Không có IP cố định thì sao
IP công cộng của băng thông rộng gia đình sẽ đổi. Phương án khả dụng: xin nhà mạng cấp IP cố định, dùng VPN / máy nhảy của nhà cung cấp cloud, hoặc dùng khóa SSH + fail2ban để giảm rủi ro. **Chú ý: giới hạn SSH vào một IP sẽ đổi sẽ khiến bạn không kết nối được sau khi IP đổi** —— nhất định xác nhận nền tảng cloud có kênh cứu hộ VNC trước.
:::

## Ba, Gia cố SSH

SSH là cổng vào quản trị, cũng là cổng bị brute-force nhiều nhất. Thứ tự gia cố khuyến nghị: **trước tiên xác nhận khóa đăng nhập được, rồi mới tắt đăng nhập bằng mật khẩu**.

### 3.1 Cấu hình đăng nhập bằng khóa trước

Tạo khóa trên máy của bạn (nếu chưa có):

```bash
ssh-keygen -t ed25519 -C "mc-admin"
```

Đưa khóa công khai lên máy chủ:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub mcadmin@203.0.113.10
```

**Kiểm chứng**: mở một terminal mới, đăng nhập thành công bằng khóa, rồi mới đi bước tiếp theo.

### 3.2 Sửa cấu hình sshd

Sửa `/etc/ssh/sshd_config` (dùng `sudo`):

```ini
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

| Mục cấu hình | Tác dụng |
| --- | --- |
| `PubkeyAuthentication yes` | Cho phép xác thực khóa công khai (nền tảng của đăng nhập bằng khóa) |
| `PasswordAuthentication no` | **Tắt xác thực mật khẩu**, script brute-force mất mục tiêu luôn |
| `PermitRootLogin no` | **Cấm root đăng nhập trực tiếp**, kẻ tấn công phải đoán ra một tên người dùng thường trước |
| `KbdInteractiveAuthentication no` | Tắt xác thực tương tác bàn phím, tránh đi vòng qua `PasswordAuthentication no` |

:::warn Sửa xong bắt buộc kiểm tra cú pháp rồi mới nạp lại
Trước tiên dùng `sudo sshd -t` kiểm tra cú pháp cấu hình, **qua rồi** mới `sudo systemctl reload ssh` (một số bản phân phối là `sshd`). Nếu cấu hình sai mà khởi động lại SSH luôn, bạn có thể bị khóa hẳn ở ngoài.
:::

**Kiểm tra giá trị đang có hiệu lực** (cấu hình có thể bị đoạn `Include` ghi đè):

```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

:::note Cách viết tệp cấu hình thay đổi theo phiên bản
OpenSSH mới hơn hỗ trợ đặt đoạn `.conf` trong `/etc/ssh/sshd_config.d/`, và **thiết lập trong đoạn thường được ưu tiên hơn tệp chính**. Nếu bản phân phối của bạn có thư mục này, trước khi sửa hãy `ls /etc/ssh/sshd_config.d/` xem có mục ghi đè không. **Thứ tự ưu tiên cụ thể lấy đầu ra thực tế của `sshd -T` trên hệ thống bạn và tài liệu chính thức OpenSSH làm chuẩn.**
:::

### 3.3 Đổi cổng mặc định: tùy chọn, tác dụng có hạn

Đổi cổng SSH từ `22` sang cổng khác (ví dụ `2222`):

```ini
Port 2222
```

**Nó mang lại gì**: trình quét tự động phần lớn chỉ quét `22`, đổi cổng giảm rõ rệt nhiễu nhật ký và brute-force vô ích.

**Nó không mang lại gì**: **không phải biện pháp an ninh**. Việc quét có chủ đích có thể tìm ra SSH của bạn trong toàn bộ dải cổng. Nên đổi cổng **không thể thay thế** đăng nhập bằng khóa và giới hạn nguồn.

Nếu đã đổi cổng, nhớ cập nhật đồng bộ quy tắc tường lửa, và **giữ mở cổng cũ cho đến khi cổng mới kiểm chứng thành công**, nếu không cũng sẽ tự khóa mình.

### 3.4 fail2ban: bổ sung tùy chọn

**Khái niệm**: fail2ban đọc nhật ký, phát hiện một IP xác thực thất bại nhiều lần trong thời gian ngắn thì **tạm thời** dùng quy tắc tường lửa chặn nó.

**Khái niệm cốt lõi là jail (nhà tù)**: một jail = một nhật ký + một bộ quy tắc khớp + một nhóm tham số chặn. Các jail được bật ghi trong tệp `.conf` dưới `/etc/fail2ban/jail.d/` hoặc `/etc/fail2ban/jail.local`.

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

- `maxretry`: số lần thất bại cho phép; `findtime`: cửa sổ thống kê; `bantime`: thời gian chặn.
- `backend = systemd` phù hợp với bản phân phối hiện đại có nhật ký do systemd-journald thu thập; nếu bản phân phối của bạn ghi `/var/log/auth.log`, cần đổi sang `logpath` tương ứng theo tài liệu chính thức.

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

:::warn Đừng coi fail2ban là bùa hộ mệnh
- Nó chỉ chặn được IP **đã từng thất bại**, thuộc **cứu chữa sau sự việc**, không ngăn được đợt thử đầu tiên.
- **Chặn nhầm IP sẽ khiến chính bạn không vào được**, `bantime` đừng đặt quá dài (ví dụ vài tháng).
- Mục cấu hình và giá trị mặc định **thay đổi theo bản phân phối và phiên bản**, trên chỉ là cách viết thường gặp, hãy đối chiếu tài liệu chính thức của phiên bản bạn dùng.
- Cài fail2ban **không** cho phép bạn mở lại `PasswordAuthentication`.
:::

## Bốn, DDoS và lạm dụng: bạn làm được gì, không làm được gì

### 4.1 Vì sao máy chủ game bị đánh

- **Ngưỡng cực thấp**: dịch vụ tấn công bán theo lượng, vài đô là phát động được một lần.
- **Động cơ đơn giản**: cạnh tranh cùng ngành, người chơi trả thù, chỉ để "vui", hoặc chỉ là bị trình quét quét trúng.
- **Máy chủ game đặc biệt mong manh**: Minecraft là **kết nối dài có trạng thái**, một lần bắt tay TCP đã chiếm tài nguyên máy chủ. Cùng băng thông đó đánh vào dịch vụ web có thể chỉ chậm đi, đánh vào máy chủ game có thể treo hoặc sập luôn.

### 4.2 Bạn làm được gì

| Biện pháp | Mô tả |
| --- | --- |
| **Phòng thủ phía thượng nguồn / nhà cung cấp** | Nhà cung cấp cloud thường có lọc DDoS cơ bản. **Đây là lớp hiệu quả nhất**, vì lưu lượng được xử lý trước khi đến máy bạn. |
| **Giới hạn tốc độ và số kết nối** | Giới hạn số kết nối và tốc độ tạo mới của từng IP ở tầng tường lửa hoặc reverse proxy, chặn được lũ lụt cường độ thấp. |
| **Chuyển tiếp qua proxy để ẩn máy chủ gốc** | Cho người chơi nối proxy, máy chủ thật chỉ nhận kết nối từ proxy (kèm khóa chuyển tiếp). Xem [Phía chuyển máy chủ](/tutorials/java/proxy). |
| **Danh sách trắng / duyệt trước khi vào** | Biện pháp triệt để nhất cho máy chủ quy mô nhỏ: **người không quen biết hoàn toàn không kết nối được**. |
| **Giới hạn tần suất ở tầng ứng dụng** | Giới hạn tần suất kết nối ở tầng máy chủ hoặc plugin, giảm nhẹ kiểu quấy rối "vào là ngắt". |

### 4.3 Bạn không làm được gì, và một hiểu lầm phổ biến

:::warn "Chặn IP kẻ tấn công" vô hiệu với tấn công lưu lượng
Đây là hiểu lầm phổ biến nhất. Đặc trưng của tấn công lưu lượng (volumetric) là:

- IP nguồn **hàng nghìn hàng vạn và liên tục thay đổi** (nhiều cái đến từ thiết bị bị nhiễm), bạn chặn không hết;
- **Tường lửa của bạn nằm sau lưu lượng tấn công** —— khi quy tắc chặn gói có hiệu lực, băng thông đã bị chiếm đầy. Đúng lúc đường truyền tắc, máy bạn đến việc "thực thi quy tắc chặn" cũng làm không tốt.

**Kết luận**: chặn IP có hiệu quả với kẻ quấy rối đơn lẻ, gần như vô hiệu với tấn công lưu lượng. **Chỉ lọc ở thượng nguồn mới giải quyết được**, điều này cũng có nghĩa: **khi chọn mua dịch vụ phải xem rõ điều khoản phòng DDoS của nhà cung cấp**, chứ đừng đợi đến ngày bị đánh mới tìm cách.
:::

:::note Bị đánh thì làm gì trước
1. **Xác nhận có phải bị tấn công thật không**: xem đường cong băng thông, số kết nối, CPU, phân biệt "bị đánh" với "bug của chính mình gây vòng lặp vô hạn".
2. **Liên hệ nhà cung cấp**: trình bày tình hình, hỏi xem có kích hoạt lọc không, có cần đổi IP không.
3. **Giữ mạng trước**: khi cần thì tạm thời danh sách trắng, cho máy chủ sống đã.
4. **Giữ chứng cứ**: lưu nhật ký và biểu đồ lưu lượng, tiện khiếu nại với nhà cung cấp.
:::

## Năm, Vệ sinh khóa và thông tin xác thực

Trong thư mục máy chủ nằm rất nhiều thông tin nhạy cảm: mật khẩu RCON trong `server.properties`, mật khẩu cơ sở dữ liệu, tài khoản bảng điều khiển, API Key của nhà cung cấp cloud.

| Quy tắc | Cách làm |
| --- | --- |
| **Tuyệt đối không commit lên Git** | Cấu hình có mật khẩu, `.env`, tệp khóa đều phải vào `.gitignore`. **Commit một lần là lộ vĩnh viễn**, lịch sử vẫn còn. |
| **Siết quyền tệp thông tin xác thực** | `chmod 600` (chỉ chủ sở hữu đọc ghi), khi cần thì `chmod 640` (chủ sở hữu đọc ghi, cùng nhóm chỉ đọc). |
| **Dùng tệp môi trường thay vì hard-code** | Đưa giá trị nhạy cảm vào tệp kiểu `.env`, mã chỉ đọc biến môi trường. |
| **Lộ rồi thì đổi, đừng "xóa đi là xong"** | Xóa tệp **không** làm mật khẩu đã lộ mất hiệu lực. **Bắt buộc vào dịch vụ tương ứng tạo lại / thu hồi.** |

```bash
# Tệp thông tin xác thực chỉ cho chủ sở hữu đọc ghi
chmod 600 /opt/mcserver/survival/.env

# Xác nhận quyền
ls -l /opt/mcserver/survival/.env
# Đầu ra kỳ vọng dạng: -rw------- 1 mcserver mcserver ... .env
```

:::warn Thứ tự xử lý sau khi lộ mật khẩu
1. **Xoay ngay**: đặt lại mật khẩu / thu hồi khóa trên dịch vụ tương ứng (bước này mới thật sự cầm máu).
2. **Xem phạm vi ảnh hưởng**: xem nhật ký, xác nhận có bị dùng chưa.
3. **Dọn lịch sử**: gỡ khỏi lịch sử Git (công cụ như `git filter-repo`), nhưng **đừng trông chờ nó cứu được giá trị đã lộ**.
4. **Rút kinh nghiệm**: vì sao bị commit? Thêm `.gitignore`, thêm kiểm tra trước khi commit.
:::

Mật khẩu cơ sở dữ liệu còn nên tuân theo: **mỗi dịch vụ dùng tài khoản riêng** (đừng dùng `root` cho tất cả), **chỉ cấp quyền cho cơ sở dữ liệu cần dùng**, **giới hạn nguồn là máy cục bộ hoặc mạng nội bộ**.

## Sáu, Giám sát: phát hiện có người dò thử bạn thế nào

**Bạn không cần nhìn màn hình 24/7**, nhưng cần biết "chỗ nào thấy được bất thường".

### 6.1 Nên xem gì

| Vị trí | Thấy được gì |
| --- | --- |
| `/var/log/auth.log` (Debian / Ubuntu) | Bản ghi đăng nhập SSH thành công và thất bại |
| `/var/log/secure` (hệ RHEL) | Như trên |
| `journalctl -u ssh` | Nhật ký SSH do systemd thu thập |
| `sudo fail2ban-client status sshd` | Số IP đang bị chặn và danh sách |
| `sudo lastb` | Lần đăng nhập thất bại (**cần root, và một số hệ thống mặc định không ghi**) |
| `ss -tlnp` | Các cổng đang lắng nghe, dùng để phát hiện dịch vụ lộ ngoài ý muốn |

```bash
# Xem tình hình SSH thất bại gần đây (Debian / Ubuntu)
sudo grep 'Failed password' /var/log/auth.log | tail -n 20

# Thống kê IP nguồn thất bại nhiều nhất
sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head

# Xem ai đang lắng nghe cổng
sudo ss -tlnp
```

### 6.2 Cái gì tính là bất thường

- **Lượng lớn `Failed password` trong thời gian ngắn**: brute-force điển hình.
- **Đăng nhập thành công vào thời điểm / IP nguồn mà bạn không biết**: **đây là tín hiệu nguy hiểm nhất**, nghĩa là thông tin xác thực có thể đã lộ.
- **Xuất hiện người dùng bạn chưa từng tạo**: có thể đã bị cài tài khoản cửa sau.
- **Cổng lắng nghe lạ**: có thể đã bị cài chương trình đào coin hoặc cửa sau.
- **CPU / băng thông cao bất thường khi không có người chơi**: có thể đang bị dùng làm nguồn tấn công.

:::tip Cho nhật ký trực thay bạn
Nếu không muốn ngày ngày lục nhật ký, dùng `logwatch`, tóm tắt định kỳ của `journalctl`, hoặc đặt cảnh báo cho sự kiện then chốt. **Điểm then chốt là "có người xem"** —— nhật ký không ai xem bằng không có nhật ký.
:::

## Bảy, Danh sách kiểm tra trước khi lên sóng

- [ ] Nhóm bảo mật cloud và tường lửa máy chủ **cả hai lớp đều đã cấu hình**, vào mặc định từ chối
- [ ] Chỉ mở những cổng thực sự cần (Java `TCP 25565`, Bedrock / Geyser `UDP 19132`)
- [ ] `enable-rcon` giữ `false`, hoặc RCON chỉ lắng nghe `127.0.0.1`
- [ ] Cổng cơ sở dữ liệu, bảng điều khiển **chưa mở ra công cộng**
- [ ] SSH đã cấu hình đăng nhập bằng khóa, `PasswordAuthentication no`, `PermitRootLogin no` đã có hiệu lực (dùng `sshd -T` xác nhận)
- [ ] SSH đã giới hạn IP nguồn, hoặc ít nhất có fail2ban chặn cuối
- [ ] Quyền tệp chứa mật khẩu là `600`, và **không nằm trong kho Git**
- [ ] `online-mode` giữ `true` (trừ khi hiểu rõ cái giá của chế độ ngoại tuyến)
- [ ] Đã hiểu điều khoản phòng DDoS của nhà cung cấp, biết bị đánh thì tìm ai
- [ ] Đã dùng **máy bên ngoài** kiểm chứng khả năng kết nối cổng

## Bước tiếp theo

- Gia cố bên trong hệ thống (tài khoản, quyền, systemd): xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security)
- Cấu hình an ninh của máy chủ và plugin: xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java) và [[BE] Plugin an ninh](/tutorials/ops/security-be)
- Chống phá hoại và ghi chép: xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)
- Phòng tuyến cuối của dữ liệu: xem [Sao lưu và khôi phục](/tutorials/java/backup)

---

> Lệnh và cấu hình lấy theo tài liệu chính thức của từng phần mềm. Tên gói, tên dịch vụ và giá trị mặc định của mục cấu hình có thể khác nhau giữa các bản phân phối, hãy lấy đầu ra thực tế trên hệ thống bạn làm chuẩn.
