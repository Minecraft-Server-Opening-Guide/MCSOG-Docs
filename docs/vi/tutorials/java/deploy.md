---
title: Triển khai ra môi trường truy cập được
slug: deploy
cat: java
level: 2
order: 8
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, triển khai, máy chủ cloud, ip công cộng, xuyên nội mạng, frp, tên miền]
updated: 2026-10-04
draft: false
---

Máy chủ chạy được trên máy local chỉ là bước đầu. **Để người khác cũng kết nối được** mới gọi là thật sự mở máy chủ. Điểm khó của bước này gần như toàn ở mạng, không phải bản thân Minecraft.

## Một, ba con đường, chọn một trước

| Phương án | Phù hợp | Ưu điểm | Cái giá |
| --- | --- | --- | --- |
| **Máy chủ cloud** | Muốn trực tuyến 24 giờ lâu dài | Có IP công cộng, ổn định, không sợ mất điện mất mạng | Tốn tiền, cấu hình càng tốt càng đắt |
| **Máy nhà + IP công cộng** | Nhà có IPv4 công cộng | Không tốn thêm tiền, hiệu năng kiểm soát được | Tiền điện/tiếng ồn/mất điện mất mạng, và **phần lớn mạng gia đình không có IPv4 công cộng** |
| **Xuyên nội mạng (frp…)** | Nhà không có IP công cộng | Không phải đổi đường truyền vẫn mở được | Thêm một lớp chuyển tiếp, độ trễ và độ ổn định phụ thuộc dịch vụ xuyên |

:::warn Xác nhận trước bạn có IPv4 công cộng không
Địa chỉ IPv4 khan hiếm, **nhiều đường truyền gia đình nhận được địa chỉ mạng nội bộ lớn của nhà mạng**, khi đó cấu hình port forwarding trên router kiểu gì cũng vô ích. Cách phán đoán: IP cổng WAN của router và kết quả tra "IP công cộng của tôi" **không khớp nhau** thì nghĩa là không có IPv4 công cộng.

Lựa chọn khi không có IP công cộng: xin nhà mạng (một số nơi miễn phí, một số thu phí, một số không cấp), đổi sang máy chủ cloud, hoặc dùng xuyên nội mạng.
:::

## Hai, con đường máy chủ cloud

1. **Mua máy**: chọn theo "Giao thức mở máy chủ và khuyến nghị cấu hình", chú trọng **xung nhịp đơn nhân**; hệ điều hành chọn bản Server của Ubuntu / Debian.
2. **Cài môi trường**: theo "Chuẩn bị môi trường (Windows và Linux)" cài Java phiên bản tương ứng, tạo người dùng riêng, tạo thư mục.
3. **Mở cổng**: nhóm bảo mật mở `TCP 25565`, tường lửa hệ thống (ufw / firewalld) cũng phải mở, **cả hai chỗ**.
4. **Tải máy chủ lên**: dùng SFTP hoặc `scp` chuyển cả thư mục máy chủ lên.
5. **Khởi động và chạy thường trực**: dùng systemd quản lý, làm được tự khởi động khi bật máy, tự khởi động lại khi sập (xem bước năm của "Chuẩn bị môi trường").
6. **Kiểm chứng**: từ **một máy khác** kết nối `IP-công-cộng-của-bạn:25565`.

## Ba, con đường máy nhà

1. **Xin/xác nhận IPv4 công cộng** (xem trên).
2. **Port forwarding trên router**: chuyển `25565` từ ngoài vào `25565` (TCP) của máy trong mạng nội bộ.
3. **Cố định IP nội bộ**: gán IP tĩnh cho máy này trong router, tránh khởi động lại IP đổi làm ánh xạ mất hiệu lực.
4. Tường lửa hệ thống mở `25565`.
5. **Bảo đảm không mất kết nối**: đặt tùy chọn nguồn thành **không bao giờ ngủ**, và tính đến rủi ro mất điện, mất mạng.

## Bốn, con đường xuyên nội mạng (frp)

Nguyên lý: bạn mở một cổng trên **máy có IP công cộng** (máy chủ frps), chuyển lưu lượng về máy trong mạng nội bộ nhà bạn (client frpc). Cách làm phổ biến là thuê một máy chủ cloud rẻ nhất làm frps.

```ini
# frps.ini (đặt trên máy chủ có IP công cộng)
[common]
bind_port = 7000
```

```ini
# frpc.ini (đặt trên máy trong mạng nội bộ nhà bạn)
[common]
server_addr = IP máy chủ công cộng của bạn
server_port = 7000

[minecraft]
type = tcp
local_ip = 127.0.0.1
local_port = 25565
remote_port = 25565
```

Thứ tự khởi động: chạy `frps` trước, rồi chạy `frpc`, sau đó người chơi kết nối **IP máy chủ công cộng:25565** là được.

:::tip Cũng có thể dùng dịch vụ xuyên có sẵn
Không muốn tự bảo trì node, có thể dùng dịch vụ xuyên nội mạng thương mại, đỡ việc nhưng thường có giới hạn lưu lượng/băng thông, và **chất lượng không đều** —— khi chọn trước hết xem có hỗ trợ **TCP** không (UDP thường phải trả thêm, chỉ cần với Bedrock Edition hoặc đa nền tảng).
:::

## Năm, tên miền (tùy chọn nhưng khuyến nghị)

Có tên miền rồi người chơi khỏi nhớ IP:

- **Bản ghi A**: `mc.ten-mien-cua-ban.com` → IPv4 công cộng của máy chủ.
- **Bản ghi SRV**: muốn người chơi khỏi nhập cổng, có thể dùng SRV trỏ `_minecraft._tcp` tới cổng thật của bạn. Như vậy người chơi chỉ điền tên miền là vào được.

Chú ý: **máy chủ trong nước phân giải tên miền thường cần đăng ký ICP**, máy chủ nước ngoài thì không.

## DNS và bản ghi SRV

Mục trước nói "có tên miền rồi người chơi khỏi nhớ IP", hiện thực thật sự dựa vào bản ghi DNS. Mục này nói rõ một lượt các loại bản ghi dùng khi mở máy chủ, cách viết đúng của SRV và cách tìm lỗi.

### Các loại bản ghi dùng khi mở máy chủ

| Loại bản ghi | Tác dụng | Ví dụ | Điểm cần chú ý |
| --- | --- | --- | --- |
| `A` | Tên miền → địa chỉ IPv4 | `mc.example.com` → `203.0.113.10` | Bản ghi cơ bản nhất; cùng một tên có thể có nhiều bản ghi A |
| `AAAA` | Tên miền → địa chỉ IPv6 | `mc.example.com` → `2001:db8::10` | Chỉ cần khi máy chủ có IPv6; người chơi dùng IPv6 không kết nối được thì tra ở đây trước |
| `CNAME` | Bí danh, trỏ tới tên miền khác | `mc.example.com` → `node1.example.net` | **Không thể cùng tồn tại với bản ghi khác trên cùng một tên**: có CNAME là không được có A / AAAA / TXT… nữa; tên miền gốc thường cũng không cho phép |
| `SRV` | Khai báo một dịch vụ nằm ở máy chủ nào, cổng nào | `_minecraft._tcp.example.com` | Dành riêng cho Java Edition, xem dưới |
| `TXT` | Bản ghi văn bản, thường dùng để xác minh và khai báo | Giá trị xác minh của `_acme-challenge.example.com` | Thường dùng xác minh quyền sở hữu tên miền, cấu hình email; không ảnh hưởng trực tiếp đến việc mở máy chủ |

**TTL** là thời gian cache của mỗi bản ghi, đơn vị giây, quyết định "sửa bản ghi xong thì cả thế giới mất bao lâu mới thấy giá trị mới". Hằng ngày có thể đặt lớn hơn (như `3600`); **trước khi định di chuyển hãy giảm TTL xuống** (như `300`), đợi TTL cũ hết hạn rồi mới chuyển, có vấn đề mới chuyển lại nhanh được. Quy trình đầy đủ của việc di chuyển xem [Di chuyển máy chủ](/tutorials/ops/server-migration).

### Bản ghi SRV để làm gì

Cổng mặc định của Minecraft là `25565`. Nếu dịch vụ chạy ở cổng khác, hoặc căn bản ở máy khác, người chơi phải nhập địa chỉ kèm cổng kiểu `mc.example.com:25566`. **Bản ghi SRV chính là để khỏi nhập cổng**: nó báo cho client "dịch vụ Minecraft ứng với tên miền này thật ra ở máy nào, cổng nào", người chơi chỉ điền tên miền là vào được.

Tên truy vấn SRV của Java Edition là cố định `_minecraft._tcp.<tên-miền-của-bạn>`. Viết trong tệp zone thì như thế này:

```dns
; người chơi nhập mc.example.com, dịch vụ thật ra chạy ở cổng 25566 của node1.example.com
_minecraft._tcp.example.com.  3600  IN  SRV  10 5 25566 node1.example.com.
node1.example.com.            3600  IN  A    203.0.113.10
```

Ý nghĩa của bốn trường số:

| Trường | Ví dụ | Ý nghĩa |
| --- | --- | --- |
| `priority` | `10` | Độ ưu tiên, **số nhỏ nhất được ưu tiên**; chỉ các bản ghi cùng độ ưu tiên mới chia tải cho nhau |
| `weight` | `5` | Trọng số, chỉ có hiệu lực khi độ ưu tiên giống nhau, phân chia theo tỉ lệ, số càng lớn xác suất được chọn càng cao |
| `port` | `25566` | **Cổng dịch vụ thật sự lắng nghe**, không phải 25565 |
| `target` | `node1.example.com.` | Tên máy chủ nơi dịch vụ thật sự ở, nó **phải tự phân giải được** |

Về `target` có hai yêu cầu cứng: nó phải là tên máy chủ, và thường phải trỏ tới một bản ghi `A` / `AAAA`; đừng để nó trỏ tới một CNAME, càng đừng để CNAME lại trỏ tới CNAME.

:::warn target không được viết thành IP literal
Điền `target` thành IP (ví dụ `SRV 10 5 25566 203.0.113.10.`) là **không hợp lệ** theo giao thức, client sẽ không dùng bản ghi này, dù một số panel cho phép bạn điền vào. Cách đúng là tạo một bản ghi `A` / `AAAA` cho máy đích, rồi để `target` trỏ tới tên máy chủ đó.
:::

:::warn Lỗi phổ biến nhất: target thiếu dấu chấm ở cuối
Trong console của phần lớn nhà cung cấp DNS, `target` phải viết thành tên miền đầy đủ **có dấu chấm ở cuối** (`node1.example.com.`). Thiếu dấu chấm này, console sẽ coi nó là tên "tương đối với zone hiện tại", thế là thành `node1.example.com.example.com.` —— bản ghi coi như viết vô ích, và **không có bất kỳ báo lỗi nào**.
:::

### Bedrock Edition không hỗ trợ SRV

Điểm này phải nói rõ:

- **Client Java Edition sẽ truy vấn bản ghi SRV của `_minecraft._tcp`**, nên người chơi Java chỉ điền tên miền là vào được.
- **Client Bedrock Edition không dùng bản ghi SRV**. Người chơi Bedrock phải nhập `máy-chủ:cổng` (ví dụ `mc.example.com:19132`), hoặc dùng một tên miền phân giải thẳng tới địa chỉ đúng và cổng cũng khớp.

Vậy SRV là **sự tiện lợi riêng của Java Edition**. Khi máy chủ phục vụ đồng thời hai phiên bản, đừng trông một bản ghi SRV giải quyết mọi người chơi —— phía Bedrock vẫn phải ghi cổng.

### Cách kiểm chứng bản ghi đã có hiệu lực

```bash
# tra bản ghi SRV (Linux / macOS)
dig +short SRV _minecraft._tcp.example.com

# tra bản ghi SRV (Windows hoặc máy không cài dig)
nslookup -type=SRV _minecraft._tcp.example.com

# tra bản ghi A
dig +short A example.com
```

- `dig +short SRV` bình thường sẽ trả về bốn đoạn như `10 5 25566 node1.example.com.`; trả về rỗng nghĩa là bản ghi chưa có hiệu lực, tên viết sai, hoặc bạn đang tra không phải máy chủ có thẩm quyền.
- Rồi dùng `dig +short A node1.example.com` xác nhận **bản thân target phân giải được** —— bước này dễ bị bỏ sót nhất.
- Cuối cùng **thử thật trên client**: thêm máy chủ trong game, chỉ điền tên miền, xem client có tự bù cổng và kết nối được không.

Sửa DNS không có hiệu lực ngay, phải đợi TTL cũ hết hạn. Khi tìm lỗi có thể dùng `dig @ns1.example.com ...` hỏi thẳng máy chủ có thẩm quyền, xác nhận bản ghi đã viết đúng, rồi đợi cache hết hạn. **Chỗ hiểm nhất của việc viết sai SRV là "không báo lỗi"**: client chỉ biểu hiện là không kết nối được, chứ không nhắc bạn SRV có vấn đề.

### Bảng đối chiếu sự cố thường gặp

| Hiện tượng | Nguyên nhân | Cách kiểm tra |
| --- | --- | --- |
| Dùng IP kết nối được, dùng tên miền không kết nối được | `target` của SRV không phân giải được, hoặc `port` điền sai | `dig +short SRV _minecraft._tcp.tên-miền-của-bạn`, rồi `dig +short A` tra target |
| Kết nối được, nhưng vào nhầm máy chủ khác | Bản ghi còn cũ, hoặc sửa xong chưa đợi TTL hết hạn | So kết quả `dig` với IP / cổng thực tế; cần thì giảm TTL trước rồi sửa |
| Người chơi Bedrock dùng địa chỉ ngắn không vào được | Bedrock Edition không hỗ trợ SRV | Để người chơi điền `máy-chủ:cổng`, hoặc chuẩn bị thêm một tên miền kết nối thẳng |
| Thêm bản ghi rồi mà không có gì thay đổi | TTL chưa hết hạn, hoặc sửa nhầm zone (ví dụ sửa `example.com`, mà người chơi tra `mc.example.com`) | Tra thẳng máy chủ có thẩm quyền; xác nhận bản ghi thêm dưới zone đúng |
| Tên miền phân giải bình thường nhưng không kết nối được | DNS không vấn đề, là tường lửa hoặc nhóm bảo mật chưa mở | Từ máy bên ngoài thử `telnet tên-miền cổng` hoặc `nc -vz tên-miền cổng` |

### Bản ghi thêm cho proxy và panel

- Khi phía trước có **proxy Velocity / BungeeCord**, `target` của SRV phải trỏ tới địa chỉ **của proxy**, `port` điền cổng lắng nghe của proxy, không phải một máy chủ con phía sau.
- Khi dùng **panel** (MCSManager, Pterodactyl…), địa chỉ truy cập panel là chuyện khác: nó thường cần tên miền con riêng (như `panel.example.com`) đi với reverse proxy, **không ảnh hưởng lẫn nhau với bản ghi SRV dùng cho game**, đừng trộn vào cùng một bản ghi.
- Một số nhà cung cấp hoặc phòng máy còn yêu cầu bản ghi xác minh thêm (`TXT`, `CNAME`), cứ theo hướng dẫn họ đưa mà thêm.

## Sáu, danh sách kiểm tra an toàn trước khi lên sóng

- [ ] `online-mode` giữ `true` (trừ khi biết rõ rủi ro)
- [ ] Cổng console/RCON (như `25575`) **tuyệt đối không lộ ra internet**
- [ ] Trên Linux **đừng chạy máy chủ bằng root**, dùng người dùng riêng
- [ ] Đã cấu hình danh sách trắng hoặc duyệt khi vào (thử phạm vi nhỏ trước khi công khai)
- [ ] Đã bật **sao lưu tự động** (xem "Sao lưu và khôi phục")
- [ ] Đã cài **plugin chống phá hoại/ghi chép** (xem "Plugin" và "Chống gian lận")
- [ ] Đã dùng máy bên ngoài kiểm chứng cổng truy cập được

## Bước tiếp theo

Sau khi máy chủ chạy được, trước hết nắm mấy lệnh thường dùng nhất: xem [Lệnh máy chủ thường dùng](/tutorials/java/commands).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
