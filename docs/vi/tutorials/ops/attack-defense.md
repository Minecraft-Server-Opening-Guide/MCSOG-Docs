---
title: Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft
slug: attack-defense
cat: ops
level: 3
order: 11
minutes: 20
tags: [ddos, udp-flood, bot-attack, firewall, rate-limit, bedrock, motd, ops]
updated: 2026-10-04
draft: false
---

[Cơ bản an toàn mạng](/tutorials/ops/network-security) nói về "đóng cửa cho chặt": chỉ mở cổng cần thiết, giới hạn nguồn, gia cố SSH. Bài này nói về tình huống khác: **cửa đã đóng chặt, nhưng có người đang lấy xe tải đâm vào cửa**.

Trước hết đưa ra một kết luận không dễ nghe nhưng buộc phải nói rõ: **tấn công kiểu lưu lượng (volumetric) không thể giải quyết bằng cấu hình máy chủ**. Bài này sẽ giải thích vì sao, và với tiền đề đó thì bạn **thực sự** làm được gì.

## 1. Phân loại kiểu tấn công

Chia thô theo tầng OSI, các cuộc tấn công bạn gặp gần như đều rơi vào hai loại này.

### 1.1 Tầng ba, tầng bốn: kiểu lưu lượng và kiểu giao thức

| Tấn công | Giao thức | Đặc điểm | Ảnh hưởng chính |
| --- | --- | --- | --- |
| **UDP flood** | UDP | Gói UDP khổng lồ dội vào một cổng hoặc cổng ngẫu nhiên | Băng thông bão hòa, card mạng và ngắt mềm bị đánh đầy |
| **SYN flood** | TCP | Chỉ gửi `SYN` mà không hoàn tất bắt tay, chiếm đầy bảng kết nối | Tạo kết nối mới thất bại, `backlog` tràn |
| **ICMP flood** | ICMP | Lượng lớn `echo request` (ping) | Băng thông và chi phí ngắt |
| **Phản xạ khuếch đại** | UDP | Giả mạo IP nguồn gửi truy vấn tới bên thứ ba, gói trả về dội vào bạn | Băng thông bão hòa, **và thứ bạn thấy là bên thứ ba vô can** |

Nguyên lý **phản xạ khuếch đại (reflection / amplification)** đáng nói riêng cho rõ: kẻ tấn công giả mạo **IP của bạn** làm địa chỉ nguồn, gửi tới lượng lớn dịch vụ mở (trình phân giải DNS, NTP, memcached, SSDP, CLDAP) một **yêu cầu rất nhỏ**, các máy chủ này gửi **phản hồi rất lớn** về cho "người yêu cầu", tức là bạn; lưu lượng bạn nhận = lưu lượng kẻ tấn công gửi đi × bội số khuếch đại.

**Bội số khuếch đại (amplification factor)** = số byte phản hồi / số byte yêu cầu. Nó tùy cấu hình dịch vụ bên thứ ba, khác nhau rất lớn giữa các giao thức, cách hiện thực, phiên bản, nên bảng dưới chỉ là **tham khảo bậc độ lớn**, đừng coi là giá trị chính xác:

| Nguồn phản xạ | Cổng thường gặp | Bậc độ lớn bội số | Mô tả |
| --- | --- | --- | --- |
| DNS | UDP `53` | Khoảng vài chục lần | Tùy kích thước phản hồi và có hỗ trợ EDNS hay không |
| NTP | UDP `123` | Khoảng vài trăm lần | Chủ yếu do truy vấn `monlist` trong lịch sử bị lạm dụng; NTP hiện đại mặc định đã hạn chế |
| memcached | UDP `11211` | Cực cao (có thể tới hàng vạn lần) | Ảnh hưởng rất lớn, nhưng tiền đề là có memcached bản UDP lộ ra Internet |
| SSDP | UDP `1900` | Khoảng vài chục lần | Dịch vụ UPnP của router gia đình và thiết bị thông minh |
| CLDAP | UDP `389` | Khoảng vài chục lần | Dịch vụ LDAP bị lộ |

:::warn Vì sao "IP nguồn là giả"
UDP là giao thức **không kết nối**: nhân hệ điều hành nhận một gói UDP sẽ không đi xác minh "địa chỉ nguồn này thực sự nhận được phản hồi", nên kẻ tấn công có thể điền IP nguồn tùy ý, **viết thành IP của bạn**.

Hậu quả rất then chốt: **địa chỉ nguồn của gói bạn bắt được là giả**. **Với lưu lượng UDP có IP nguồn giả mạo, truy nguyên và chặn IP cơ bản là vô nghĩa** —— chặn chỉ làm tổn thương bên thứ ba vô can.
:::

### 1.2 Tầng bảy: tấn công tầng ứng dụng (chuyên biệt Minecraft)

Tấn công tầng ứng dụng không đánh băng thông, mà đánh **năng lực xử lý của chương trình bạn**: mỗi yêu cầu đều tiêu tốn CPU, bộ nhớ hoặc kết nối cơ sở dữ liệu, mà chi phí của kẻ tấn công thấp hơn chi phí của bạn rất nhiều.

Tấn công tầng ứng dụng liên quan đến Minecraft chủ yếu có ba loại, mỗi loại có một mục riêng ở sau bài:

| Loại | Mô tả một câu | Xem |
| --- | --- | --- |
| **Lũ truy vấn trạng thái (MOTD ping)** | Liên tục làm mới danh sách máy chủ, buộc bạn dựng phản hồi hết lần này đến lần khác | Mục 4 |
| **Ép tải bằng người giả (bot / người giả)** | Lượng lớn bot vào máy chủ hoặc kết nối nửa mở, chiếm đầy slot và tài nguyên | Mục 5 |

### 1.3 Một khác biệt mang tính quyết định: có tìm được kẻ tấn công không

Đây là đường phân định quan trọng nhất của bài này:

| Loại lưu lượng | Có nhận diện được kẻ tấn công không | Nguyên nhân |
| --- | --- | --- |
| **Lưu lượng UDP giả mạo IP nguồn** | **Cơ bản là không** | Địa chỉ nguồn là giả, gói trả về không đến được kẻ tấn công |
| **Tấn công bot dựa trên TCP** | **Thường là được** | Muốn lập kết nối TCP bắt buộc phải hoàn tất bắt tay ba bước, bắt tay yêu cầu **IP của đối phương thực sự tiếp cận được** |
| **Tấn công kiểu đăng nhập / vào máy chủ** | **Thường là được** | Muốn đi đến sau bắt tay (handshake), trước hết phải có kết nối TCP thật |

**Ý nghĩa thực tế**:

- Với lũ UDP, phương tiện của bạn chỉ còn "giới hạn tốc độ + làm sạch phía trên", **đừng mong chặn IP**;
- Với lũ bot TCP, **giới hạn ở tầng kết nối (connlimit, tần suất kết nối) và xác thực ở tầng tài khoản (`online-mode`, danh sách trắng) là có hiệu lực**, vì đối phương buộc phải lộ địa chỉ thật, và (nếu bật xác thực bản quyền) buộc phải có tài khoản thật.

## 2. Cơ bản về DDoS: vì sao "chặn IP kẻ tấn công" vô ích

### 2.1 DDoS là gì

**DoS** là dùng một luồng lưu lượng làm dịch vụ không dùng được; **DDoS (Distributed DoS)** là dùng **hàng nghìn hàng vạn máy** phân bố ở các mạng, các nhà mạng khác nhau tấn công bạn cùng lúc. Những máy này thường là thiết bị thường bị nhiễm, VPS giá rẻ hoặc thiết bị IoT, gọi chung là **máy bị lây nhiễm (botnet)**. Mấu chốt không phải "một máy mạnh đến đâu", mà là **băng thông tổng hợp**: 1000 thiết bị mỗi cái 10 Mbps là 10 Gbps.

### 2.2 Vì sao "chặn IP kẻ tấn công" không có tác dụng với tấn công kiểu lưu lượng

Đây là hiểu nhầm phổ biến nhất, đáng giải thích đầy đủ một lượt:

1. **Lưu lượng đã ở trên đường truyền của bạn.** Tường lửa của bạn (`iptables` / `nftables` / Windows Firewall) chạy **trên máy bạn hoặc router của bạn**. Khi lưu lượng tấn công đến card mạng này, **đường lên của bạn đã bị chiếm đầy**. Tường lửa chỉ làm được "bỏ các gói này", nhưng **bỏ gói không trả lại băng thông** —— đường truyền vẫn đầy, người chơi bình thường vẫn không kết nối được.
2. **Bản thân việc bỏ gói cũng tiêu tốn tài nguyên.** Lượng lớn gói nhỏ sẽ tiêu tốn nhiều CPU ở ngắt card mạng và ngắt mềm (softirq), nghiêm trọng thì đến SSH của bạn cũng không vào được, nhật ký cũng không ghi ra được.
3. **Số lượng IP nguồn rất lớn và luôn thay đổi.** Bạn không thể duy trì một danh sách đen hàng triệu dòng; mà với địa chỉ UDP giả mạo, danh sách đen toàn là người vô can.
4. **Đường lên của bạn mới là nút thắt.** Thứ quyết định bạn có chịu được hay không là **băng thông kết nối của phòng máy** và **nhà mạng/nhà cung cấp có làm sạch trước mặt bạn hay không**, chứ không phải quy tắc trên máy bạn.

### 2.3 Nhà cung cấp và phòng máy thực sự làm được gì

| Phương tiện | Có hiệu lực ở tầng nào | Mô tả |
| --- | --- | --- |
| **Dung lượng (capacity)** | Phía trên | Băng thông kết nối của phòng máy lớn hơn lưu lượng tấn công, cuộc tấn công "không đau". Đây là tầng căn bản nhất. |
| **Làm sạch phía trên (scrubbing)** | Phía trên | Lưu lượng được kéo về trung tâm làm sạch trước, lọc xong mới đưa lại cho bạn. **Đây là phương tiện chính để đối phó tấn công kiểu lưu lượng.** |
| **Giới hạn tốc độ ở biên (rate limiting)** | Phía trên hoặc biên của bạn | Giới hạn tốc độ trước khi vào máy bạn, bảo vệ phía sau. |
| **Điều chỉnh kiến trúc** | Thiết kế của bạn | Dùng proxy che máy gốc, đặt dịch vụ sau một cửa vào có bảo vệ, giao tài nguyên tĩnh cho CDN. |

:::warn Đừng giả định "máy chủ cloud có sẵn chống DDoS" là đủ
**Ngưỡng, cách làm sạch, điều kiện kích hoạt, có tính thêm phí hay không, có cung cấp IP chống DDoS cao cấp hay không** của các nhà cung cấp cloud khác nhau rất nhiều, và điều khoản sẽ thay đổi. **Trước khi mua hãy đọc tài liệu chính thức và điều khoản hợp đồng**, làm rõ: ngưỡng bảo vệ miễn phí, vượt ngưỡng thì bị blackhole (chặn thẳng IP của bạn) hay làm sạch, có sản phẩm chống DDoS cao cấp hay không, chính sách đổi IP. **Bài này không phỏng đoán những chi tiết đó, hãy lấy mô tả chính thức của nhà cung cấp bạn dùng làm chuẩn.**
:::

## 3. UDP flood và bề mặt lộ của bản Bedrock

### 3.1 Vì sao bản Bedrock tự nhiên dễ bị đánh hơn

| Sự thật | Hậu quả |
| --- | --- |
| Bản Bedrock dùng **UDP `19132`** (IPv6 là `19133`) | UDP không kết nối, dễ giả mạo, **vừa dễ đánh vừa khó truy nguyên** |
| **Geyser** cũng lắng nghe UDP (mặc định giống bản Bedrock, có thể cấu hình) | Máy chủ Java chỉ cần bật chơi chéo là có thêm một cửa vào UDP |
| UDP không có bắt tay | Kẻ tấn công không cần IP thật, cũng không cần hoàn tất thương lượng nào, **gửi một byte là một gói** |
| Máy chủ cần phản hồi | Một số yêu cầu kiểu truy vấn có chi phí xử lý cao hơn bản thân yêu cầu, tạo thành bề mặt khuếch đại tự nhiên |

### 3.2 Triệu chứng khi bị đánh

- **Đường cong băng thông đầy**, nhưng trong nhật ký máy chủ có thể không có bất thường gì;
- **TPS bình thường mà người chơi liên tục timeout**: bản thân máy chủ không lag, mà **đường mạng** bị chiếm đầy;
- Tốc độ nhận gói của card mạng vọt lên, mức chiếm `softirq` cao, SSH trở nên cực khó kết nối thậm chí hoàn toàn không kết nối được.

Lệnh để quan sát (đều là truy vấn chỉ đọc):

```bash
# Socket đang lắng nghe UDP (ss hiển thị socket, không phải lưu lượng)
ss -uanp

# Số gói nhận gửi tích lũy và số gói mất của card mạng (đổi sang tên card thực tế, như eth0 / ens3)
ip -s link show dev eth0

# Bộ đếm của nhân, so sánh hiệu số giữa hai lần lấy mẫu
cat /proc/net/dev

# Số lần khớp của quy tắc tường lửa (cần root)
sudo iptables -L INPUT -v -n

# nftables: xem quy tắc có bộ đếm hoặc tập động
sudo nft list ruleset
```

:::note Xem bộ đếm thế nào mới có ý nghĩa
`/proc/net/dev`, `ip -s link`, `nft list ruleset` đưa ra đều là **giá trị tích lũy**. Để phán đoán "có đang bị đánh không", phải xem **lượng tăng trong một đơn vị thời gian**: cách nhau hơn mười giây lấy mẫu hai lần, so hiệu số của `RX bytes` / `RX packets`, rồi quy đổi ra Mbps và pps. Một lần lấy mẫu không nói được gì.
:::

### 3.3 Phòng thủ: thu nhỏ bề mặt lộ trước

**Điều quan trọng nhất: chỉ mở cổng UDP bạn thực sự cần.** Máy chủ Java thuần (không Geyser, không chơi chéo) **không cần** bất kỳ cổng UDP nào mở ra Internet; khi cần bản Bedrock hoặc Geyser, chỉ mở `19132` (và `19133` IPv6 nếu thực sự cần); đừng vì "hướng dẫn có ghi" mà tiện tay mở một loạt cổng UDP, cổng không cần thì tắt đi, bề mặt tấn công biến mất luôn.

### 3.4 Giới hạn tốc độ phía máy chủ: iptables hashlimit

Module `hashlimit` thống kê tốc độ riêng theo "một khóa nào đó" (ở đây dùng IP nguồn), vượt ngưỡng là khớp quy tắc:

```bash
# 1) Trước hết "chỉ ghi không bỏ", để quan sát đường cơ sở lưu lượng thật (khuyến nghị chạy một hai ngày trước)
sudo iptables -A INPUT -p udp --dport 19132 \
  -m hashlimit --hashlimit-above 200/sec --hashlimit-burst 400 \
  --hashlimit-mode srcip --hashlimit-name mc-udp-observe \
  -j LOG --log-prefix "MC-UDP-OVER: " --log-level 4

# 2) Quan sát xác nhận ngưỡng hợp lý rồi mới thêm quy tắc bỏ thật
sudo iptables -A INPUT -p udp --dport 19132 \
  -m hashlimit --hashlimit-above 200/sec --hashlimit-burst 400 \
  --hashlimit-mode srcip --hashlimit-name mc-udp \
  -j DROP
```

Giải thích tham số:

| Tham số | Ý nghĩa |
| --- | --- |
| `--hashlimit-above 200/sec` | Một IP nguồn vượt 200 gói/giây là khớp. **Hậu tố đơn vị bắt buộc phải viết** (`/sec`, `/min`, `/hour`, `/day`), viết số trần trên phần lớn phiên bản sẽ báo lỗi |
| `--hashlimit-burst 400` | Lượng đột biến cho phép: 400 gói đầu trong cửa sổ đột biến được cho qua, để dung sai dao động tức thời bình thường |
| `--hashlimit-mode srcip` | Đếm riêng theo **IP nguồn** (cũng có thể dùng `srcport`, `dstport`, v.v.) |
| `--hashlimit-name mc-udp` | Tên bảng trong nhân, **các quy tắc cùng tên dùng chung bộ đếm**, nên quy tắc quan sát và quy tắc bỏ phải dùng tên khác nhau |
| `-j LOG` / `-j DROP` | Cái trước ghi vào nhật ký nhân (`dmesg` / `journalctl -k`) để quan sát; cái sau bỏ trong im lặng. Cũng có thể dùng `-j REJECT`, nhưng trên UDP thì REJECT sẽ trả ICMP, thường không cần thiết |

:::warn Tính khả dụng của các lệnh này tùy nhân và phiên bản
`hashlimit` cần nhân hỗ trợ module `xt_hashlimit`, và `iptables` phải tự nạp được nó khi gặp `-m hashlimit`. **Cú pháp quy tắc giống nhau giữa hai frontend `iptables-legacy` và `iptables-nft`, nhưng cách lưu bền khác nhau.** Nếu báo không tìm thấy module hoặc tùy chọn, hãy đối chiếu kết quả `iptables --version`, `modinfo xt_hashlimit` trên hệ thống bạn với tài liệu bản phân phối; ngoài ra quy tắc `iptables` **mặc định không được lưu bền**, khởi động lại là mất, cách lưu xem [Cơ bản an toàn mạng](/tutorials/ops/network-security).
:::

### 3.5 Giới hạn tốc độ phía máy chủ: tập động nftables + `limit rate over`

Cách làm hiện đại của `nftables` là **dựng một tập động theo IP nguồn**, đánh dấu các địa chỉ nguồn vượt ngưỡng, rồi bỏ.

Dưới đây là một ví dụ tối thiểu **nạp được đầy đủ** (lưu thành `mc-udp-limit.nft`, nạp bằng `sudo nft -f mc-udp-limit.nft`):

```bash
#!/usr/sbin/nft -f

# Xóa bảng cũ cùng tên trước, tránh nạp lặp báo lỗi; trước khi chạy hãy xác nhận không có quy tắc khác phụ thuộc nó
table inet mcguard
delete table inet mcguard

table inet mcguard {
    set udp_flood_v4 {
        type ipv4_addr
        flags dynamic, timeout
        timeout 10m
    }

    chain input {
        type filter hook input priority 0; policy accept;
        udp dport 19132 jump udp_guard
    }

    chain udp_guard {
        # Một nguồn vượt 200/giây (đột biến 400) thì thêm vào tập
        update @udp_flood_v4 { ip saddr limit rate over 200/second burst 400 packets }
        # Nguồn bị giới hạn ghi vào nhật ký nhân để tiện quan sát; rồi bỏ thẳng
        ip saddr @udp_flood_v4 log prefix "MC-UDP-OVER: " level warn
        ip saddr @udp_flood_v4 drop
    }
}
```

Giải thích điểm chính:

| Cú pháp | Ý nghĩa |
| --- | --- |
| `set ... { type ipv4_addr; flags dynamic, timeout; timeout 10m; }` | Tập động, phần tử tự hết hạn, **không tăng vô hạn** |
| `limit rate over 200/second burst 400 packets` | "**Vượt**" 200/giây mới khớp (so với `limit rate` là "không vượt"). `over` là từ khóa |
| `update @set { ... }` | Khi khớp thì **ghi khóa (`ip saddr`) vào tập** |
| `ip saddr @set drop` | Mọi địa chỉ nguồn trong tập đều bị bỏ, nên **khớp một lần là nguồn đó bị bỏ liên tục cho đến khi phần tử hết hạn**; ví dụ chỉ dựng tập theo `ip saddr` (IPv4), **IPv6 cần dựng thêm tập `ipv6_addr` và quy tắc tương ứng** |

:::warn Cách viết nftables trên phụ thuộc phiên bản
`flags dynamic, timeout`, `limit rate over` và `update @set` đều là cú pháp khá mới, **hãy lấy `nft --version` trên hệ thống bạn và wiki chính thức của nftables làm chuẩn**. Trước khi nạp nên chạy `sudo nft -c -f mc-udp-limit.nft` (`-c` là kiểm tra cú pháp, không nạp thật). **Bộ quy tắc một khi viết sai có thể tự khóa mình ở ngoài cửa** —— nhất định phải xác nhận trước rằng bạn có VNC của nền tảng cloud hoặc console cứu hộ.
:::

### 3.6 Cái giá của giới hạn tốc độ: người chơi hợp lệ cũng bị tổn thương

**Mỗi quy tắc giới hạn tốc độ đều là một nguồn báo sai tiềm năng.** **Người chơi bình thường không chỉ gửi 200 gói/giây**, nhưng **dao động mạng, truyền lại do mất gói, hoặc hành vi đột biến của một số client/plugin** sẽ tạo đỉnh ngắn hạn; ngưỡng đặt quá thấp sẽ **làm tổn thương người chơi thật** và rất khó truy nguyên, đặt quá cao thì lưu lượng tấn công đã xuyên qua từ lâu.

Vì vậy cách làm được khuyến nghị là **quan sát trước, bỏ sau**:

1. Trước chỉ thêm quy tắc `LOG` (iptables) hoặc `log` (nftables), ngưỡng đặt ở **vài lần đỉnh bình thường bạn dự kiến**;
2. Quan sát một hai ngày, xem trong nhật ký có bao nhiêu IP "trông bình thường", xác nhận không tổn thương rồi mới đổi sang `DROP`;
3. Sau khi đưa lên, tiếp tục theo dõi phản hồi của người chơi, điều chỉnh bất cứ lúc nào.

:::tip Giới hạn tốc độ là "giảm sát thương", không phải "miễn nhiễm"
Giới hạn tốc độ phía máy chủ có thể giảm rõ rệt sát thương của lũ **cường độ thấp**, cũng có thể khiến lũ cường độ cao **đánh đầy đường truyền muộn hơn một chút**, nhưng **không thể** khiến cuộc tấn công 10 Gbps không chiếm đầy đường truyền 1 Gbps. Cách giải thực sự luôn nằm ở phía trên.
:::

## 4. Lũ MOTD / truy vấn trạng thái (chuyên biệt Minecraft)

### 4.1 Giao thức truy vấn trạng thái là gì

Client Minecraft hiển thị "số người trực tuyến / MOTD / độ trễ / phiên bản / biểu tượng" trong danh sách máy chủ là nhờ **truy vấn trạng thái**. Đặc điểm của nó là: **bất kỳ client nào cũng truy vấn được, không cần đăng nhập, không cần tài khoản, không cần vào máy chủ.**

| Nền tảng | Cách truy vấn | Truyền dẫn |
| --- | --- | --- |
| **Bản Java** | Server List Ping (yêu cầu trạng thái hiện đại, trên cổng game) | **TCP**, mặc định `25565` |
| **Bản Bedrock** | Unconnected Ping / Pong (RakNet) | **UDP**, mặc định `19132` |

Lý do kẻ tấn công thích nó rất trực tiếp: **chi phí gửi cực thấp** (một yêu cầu rất nhỏ), **chi phí phản hồi cao hơn** (máy chủ phải dựng MOTD, danh sách người chơi, biểu tượng, thông tin phiên bản), **có thể khuếch đại** (giả mạo IP nguồn thành địa chỉ nạn nhân, để phản hồi đánh người khác), **có thể dò đường** (trước dùng lượng lớn truy vấn đo năng lực phản hồi của bạn, xem số người trực tuyến, phán đoán sau lưng bạn có bảo vệ hay không, rồi mới quyết định đánh lớn đến đâu).

### 4.2 Tắt giao thức query: làm được, nhưng phải hiểu nó tắt cái gì

Trong `server.properties` nguyên bản có hai khóa liên quan:

```properties
enable-query=false
query.port=25565
```

:::warn Tắt query không bằng che MOTD
- **Giao thức query** (`enable-query`) là **giao thức truy vấn GameSpy4** di sản, đi **UDP**, cổng mặc định do `query.port` chỉ định, dùng để công cụ/website bên thứ ba truy vấn thông tin máy chủ;
- **Thông tin trạng thái thấy trong danh sách máy chủ (MOTD, số người, độ trễ)** đi theo **Server List Ping hiện đại**, trên bản Java là **yêu cầu trạng thái TCP trên cổng game**, và query là **hai thứ hoàn toàn khác nhau**.

Nên: **đặt `enable-query` thành `false` không khiến máy chủ của bạn biến mất khỏi danh sách máy chủ của người chơi, cũng không che MOTD**, nó chỉ tắt đi một cửa truy vấn thêm mà nhiều khả năng bạn hoàn toàn không cần. Khi không cần công cụ truy vấn bên thứ ba, tắt nó là việc tốt để giảm bề mặt lộ, nhưng đừng mong nó chặn được lũ ping.
:::

### 4.3 Giới hạn tốc độ cho cổng trạng thái

Cách nghĩ hoàn toàn giống mục 3, chỉ đổi sang TCP:

```bash
# Bản Java: giới hạn tốc độ "tạo kết nối mới" của một IP nguồn tới TCP 25565
# Lưu ý: quy tắc này chỉ có hiệu lực với kết nối mới, kết nối đã lập không bị ảnh hưởng, nên không ảnh hưởng người chơi đang chơi
sudo iptables -A INPUT -p tcp --dport 25565 --syn \
  -m hashlimit --hashlimit-above 10/sec --hashlimit-burst 20 \
  --hashlimit-mode srcip --hashlimit-name mc-ping \
  -j DROP
```

Điểm chính: `--syn` chỉ khớp gói **khởi tạo kết nối**, **không làm tổn thương người chơi đang trực tuyến**; ngưỡng (ví dụ 10/giây) phải chỉnh theo thực tế của bạn —— một người chơi bình thường chỉ truy vấn vài lần, nhưng **nhiều người chơi sau cùng một cửa ra NAT sẽ dùng chung IP nguồn**, trường học, quán net, mạng chia sẻ gia đình đều dễ bị tổn thương, nên đừng đặt thành `1/sec`. Cách viết tương đương của nftables là đổi loại tập ở mục 3.5 thành `ipv4_addr`, điều kiện khớp thành `tcp dport 25565` và thêm `tcp flags syn`.

### 4.4 Dùng proxy chắn phía sau

Đặt **proxy (Velocity / BungeeCord) lên trước nhất**, máy chủ phía sau chỉ nhận kết nối từ proxy, là một bước hiệu quả trên chi phí rất cao:

- Kết nối của người chơi đánh vào proxy trước, **IP của máy chủ phía sau không xuất hiện trong danh sách của người chơi**, kẻ tấn công phải tìm ra địa chỉ thật trước;
- Proxy có thể giới hạn tần suất kết nối, kết hợp kiểm tra khóa chuyển tiếp, **kết nối không qua kiểm tra bị từ chối thẳng**; máy chủ phía sau cũng có thể cấu hình chỉ tin proxy (thiết lập liên quan chế độ chuyển tiếp, **tên khóa khác nhau theo phần mềm và phiên bản, hãy lấy tệp cấu hình bạn tự tạo và tài liệu chính thức làm chuẩn**).

Cách dựng proxy và cấu hình chuyển tiếp xem [Proxy đa máy chủ](/tutorials/java/proxy).

### 4.5 Dịch vụ lọc chuyên cho Minecraft

Trên thị trường có **dịch vụ lọc/bảo vệ hướng tới Minecraft** (ví dụ loại TCPShield): người chơi kết nối tới điểm vào của nhà cung cấp trước, nhà cung cấp nhận diện và lọc ở tầng giao thức, rồi chuyển lưu lượng sạch về phía sau của bạn.

**Loại dịch vụ này thường là "tùy chọn" chứ không phải "bắt buộc"**, vì: năng lực cụ thể (hỗ trợ những phiên bản nào, có hỗ trợ bản Bedrock/UDP không, có hỗ trợ Geyser không, có yêu cầu chế độ chuyển tiếp cụ thể không, giá và hạn mức lưu lượng) **khác nhau rất nhiều giữa các nhà, và thay đổi theo vòng đời sản phẩm**; đưa bên thứ ba vào nghĩa là **lưu lượng người chơi đi qua bên thứ ba**, cần đánh giá quyền riêng tư và niềm tin; cấu hình thường yêu cầu phía sau chỉ nhận kết nối từ IP của nhà cung cấp, **cấu hình sai sẽ khiến cả máy chủ không truy cập được**.

**Kết luận: hãy coi nó là một phương án có thể đánh giá, năng lực thực tế lấy tài liệu chính thức của nhà cung cấp làm chuẩn, bài này không cam kết thay họ.**

### 4.6 Kết luận trung thực về bản Bedrock

**Bản Bedrock không thể tắt hoàn toàn ping trạng thái**: client cần nó để hiển thị thông tin trong danh sách máy chủ, máy chủ buộc phải trả lời unconnected ping của RakNet. Nên chống lũ ping cho bản Bedrock chỉ có hai con đường:

1. **Bảo vệ / làm sạch phía trên** (hiệu quả nhất, tùy nhà cung cấp);
2. **Giới hạn tốc độ UDP theo IP nguồn ở biên hoặc trên máy chủ** (quy tắc ở mục 3.4 / 3.5, dùng `--dport 19132` là được).

## 5. Ép tải bằng người giả (bot / lũ người giả)

### 5.1 Nó là gì

**Ép tải bằng người giả** là dùng chương trình tự động tạo ra lượng lớn "người chơi" hoặc "người chơi nửa vời", mục đích là **chiếm đầy slot, đốt CPU và bộ nhớ, tạo rác chat, khiến người chơi thật không vào được**.

Các biến thể thường gặp:

| Biến thể | Cách làm | Tiêu hao chính |
| --- | --- | --- |
| **Lũ kết nối (connection flood)** | Chỉ hoàn tất kết nối TCP, không tương tác giao thức Minecraft nào | Bảng kết nối, file descriptor, chi phí bắt tay |
| **Lũ đăng nhập (login flood)** | Gửi bắt tay (handshake) và bắt đầu đăng nhập, nhưng không hoàn tất đăng nhập | CPU giai đoạn đăng nhập, yêu cầu xác thực, bộ nhớ |
| **Người giả treo máy (idle bots)** | Vào máy chủ đầy đủ rồi đứng yên | Slot người chơi, nạp thực thể/chunk, bộ nhớ |
| **Spam chat / lệnh** | Vào máy chủ rồi gửi chat hoặc lệnh tần suất cao | Phân tích ở luồng chính, IO nhật ký, quấy rối spam |
| **Spam yêu cầu vật phẩm / tương tác** | Gửi gói tần suất cao kích hoạt logic tương tác | Luồng chính máy chủ, chi phí plugin chống gian lận |

:::note Vì sao máy chủ game đặc biệt sợ người giả
Minecraft là dịch vụ **kết nối dài có trạng thái**. Máy chủ Web xử lý xong một yêu cầu là ngắt, chi phí có thể chia mỏng; còn Minecraft mỗi thêm một người chơi là phải **thường trú bộ nhớ, nạp chunk, đồng bộ thực thể, duy trì kết nối**. Cùng một chi phí tấn công, sát thương với máy chủ game lớn hơn nhiều so với website tĩnh.
:::

### 5.2 Phòng thủ (xếp theo mức hiệu quả)

#### Vị trí 1: `online-mode=true` (Java) / xác thực Xbox Live (Bedrock)

**Đây là biện pháp hiệu quả nhất trong từng biện pháp đơn lẻ.** Bật xác thực bản quyền xong, vào máy chủ bắt buộc phải có **tài khoản Mojang/Microsoft thật**, người làm bot phải chuẩn bị tài khoản thật cho từng người giả —— chi phí lập tức từ "gần như bằng không" thành "tính tiền theo tài khoản".

`server.properties` bản Java:

```properties
online-mode=true
```

:::warn Cái giá của chế độ ngoại tuyến phải nghĩ cho rõ
`online-mode=false` nghĩa là **bất kỳ ai cũng vào được bằng ID bất kỳ**, gồm mạo danh quản trị viên, mạo danh tên người chơi khác. Đây là lỗ ở tầng thân phận, tường lửa không vá được. **Chỉ khi bạn hoàn toàn rõ cái giá, và đã bù xác thực thân phận bằng danh sách trắng/plugin đăng nhập, mới cân nhắc chế độ ngoại tuyến.** Thảo luận liên quan xem [Cấu hình máy chủ](/tutorials/java/config).
:::

Bản Bedrock không có khóa `online-mode`, nó dùng **xác thực thân phận Xbox Live**. Tên công tắc cụ thể và giá trị mặc định **khác nhau theo phần mềm máy chủ (BDS chính thức và các loại máy chủ Bedrock bên thứ ba) và phiên bản**, hãy lấy `server.properties` bạn tự tạo và tài liệu chính thức làm chuẩn. **Nhưng về nguyên tắc: đừng vì "tiện" mà tắt xác thực thân phận.**

#### Vị trí 2: danh sách trắng / danh sách cho phép

Với máy chủ nhỏ, **danh sách trắng là phương án triệt để hơn mọi giới hạn tốc độ**: người không quen biết căn bản không kết nối được, bot đến tư cách vào cửa cũng không có.

`server.properties` bản Java:

```properties
white-list=true
enforce-whitelist=true
```

| Khóa | Tác dụng |
| --- | --- |
| `white-list` | Chỉ cho người chơi trong danh sách đăng nhập |
| `enforce-whitelist` | Khi danh sách thay đổi, **đá ngay những người đang trực tuyến không có trong danh sách**. Không đổi khóa này, người mới thêm vào danh sách phải chờ họ kết nối lại mới có hiệu lực |

Danh sách được bảo trì bằng lệnh console/trong game (`whitelist add <玩家名>`, `whitelist list`, v.v., **cú pháp cụ thể lấy phiên bản máy chủ của bạn làm chuẩn**).

Bản Bedrock dùng **`allowlist.json`** ở thư mục gốc máy chủ, thường được duy trì tự động bằng các lệnh liên quan đến `allowlist`. **Định dạng tệp và tên khóa thay đổi theo phần mềm máy chủ và phiên bản, hãy lấy `allowlist.json` do máy chủ bạn tự tạo và tài liệu chính thức làm chuẩn, đừng chép tệp mẫu trong hướng dẫn.**

#### Vị trí 3: giới hạn tần suất kết nối (`spigot.yml`)

Trong `spigot.yml` của Spigot và các lõi phái sinh (Paper, Purpur, v.v.) có thiết lập hạn chế kết nối, đường dẫn khóa là:

```yaml
settings:
  connection-throttle: 4000
```

| Mục | Mô tả |
| --- | --- |
| `connection-throttle` | **Số mili giây bắt buộc phải cách nhau giữa hai lần kết nối từ cùng một địa chỉ nguồn**. Ví dụ `4000` = 4 giây; đặt `-1` thường nghĩa là **tắt** hạn chế |
| Giá trị mặc định | **Khác nhau theo lõi và phiên bản**, mặc định phổ biến là 4000 mili giây, nhưng đừng giả định của bạn chắc chắn là vậy |

**Nó chặn được gì**: script kết nối lại nhanh liên tục từ cùng một IP.
**Nó không chặn được gì**: người giả phân tán từ lượng lớn IP khác nhau (mỗi IP chỉ kết nối một lần, hạn chế hoàn toàn không kích hoạt).

:::warn Đừng đặt giá trị hạn chế quá lớn
Đặt thành vài chục giây sẽ **ảnh hưởng nghiêm trọng người chơi bình thường**: mất kết nối phải chờ rất lâu mới kết nối lại được, gia đình/quán net nhiều người dùng chung một IP cửa ra càng không vào được. Nên bắt đầu từ giá trị mặc định, chỉ chỉnh nhẹ khi thực sự cần.
:::

#### Vị trí 4: giới hạn số kết nối bằng tường lửa

Giới hạn **số kết nối đồng thời của một IP nguồn**, có hiệu lực với lũ kết nối và đăng nhập nửa mở:

```bash
# iptables: một địa chỉ IPv4 tối đa 8 kết nối đồng thời tới 25565
sudo iptables -A INPUT -p tcp --dport 25565 \
  -m connlimit --connlimit-above 8 --connlimit-mask 32 \
  -j REJECT --reject-with tcp-reset
```

| Tham số | Ý nghĩa |
| --- | --- |
| `--connlimit-above 8` | Vượt 8 kết nối đồng thời mới khớp |
| `--connlimit-mask 32` | Nhóm theo **/32**, tức "mỗi địa chỉ IPv4" đếm riêng |
| `-j REJECT --reject-with tcp-reset` | Từ chối thẳng và trả RST (cũng có thể dùng `-j DROP`, nhưng REJECT khiến client thất bại nhanh hơn thay vì bị treo) |

Cách viết tương đương của nftables (dùng đếm theo dõi kết nối):

```bash
#!/usr/sbin/nft -f

table inet mcguard
delete table inet mcguard

table inet mcguard {
    chain input {
        type filter hook input priority 0; policy accept;
        # Mỗi địa chỉ nguồn tối đa 8 kết nối TCP đã được theo dõi
        tcp dport 25565 ct count over 8 reject with tcp reset
    }
}
```

:::warn Số kết nối đồng thời phải định theo cách chơi thực tế của bạn
Một người chơi thật thường chỉ chiếm 1 kết nối (client có cài một số mod/plugin có thể nhiều hơn). Nhưng **nhiều người chơi cùng một cửa ra NAT dùng chung IP nguồn**, ngưỡng đặt thành 2 hoặc 3 sẽ đá thẳng người chơi bình thường. **8 chỉ là ví dụ, hãy chỉnh theo phân bố người chơi của bạn**; `ct count` cần theo dõi kết nối (`nf_conntrack`) hoạt động bình thường, hãy xác nhận không tắt module hoặc mục bảng liên quan đến `ct`.
:::

#### Vị trí 5: bộ giới hạn gói tin (packet limiter) của Paper

Paper cung cấp một bộ giới hạn gói tin trong **cấu hình toàn cục**: nó thống kê **tốc độ gói tin vào** theo từng người chơi, vượt ngưỡng có thể **đá người chơi đó** và ghi nhật ký. Nó có hiệu lực với tấn công "vào máy chủ rồi gửi gói nhỏ điên cuồng" (ví dụ spam vật phẩm/tương tác ở mục 5.1, một số hành vi người giả).

:::warn Đừng chép nguyên cấu trúc cấu hình trong hướng dẫn
**Tên khóa, phân cấp và giá trị mặc định của khối cấu hình này đã từng thay đổi giữa các phiên bản Paper và các nhánh khác nhau.** Cách đúng là: khởi động máy chủ bình thường một lần để nó **tự tạo** tệp cấu hình; mở tệp do chính bạn tạo, tìm khối liên quan giới hạn gói tin; **sửa theo cấu trúc thực tế trong tệp**, chứ không copy đoạn trên mạng; sửa xong xem nhật ký khởi động có cảnh báo phân tích cấu hình không.

Mục này vì vậy **cố ý không đưa tên khóa và giá trị cụ thể** —— viết một cấu trúc có thể đã lỗi thời còn nguy hiểm hơn là không viết.
:::

#### Vị trí 6: giấu phía sau vào sau proxy

Giống mục 4.4: **cổng của máy chủ phía sau đừng mở trực tiếp ra Internet**, chỉ cho IP của proxy kết nối vào. Như vậy dù có người lấy được IP thật của bạn, cũng phải phá được lớp proxy trước. Cấu hình xem [Proxy đa máy chủ](/tutorials/java/proxy).

#### Về plugin chống bot

Cộng đồng có đủ loại plugin "chống người giả / chống bot / xác thực khi vào máy chủ" (xác thực hình ảnh, xác thực lệnh, giới hạn tốc độ, v.v.). Chúng **có thể nâng chi phí tấn công**, nhất là với script chất lượng thấp; nhưng chúng **đều ở tầng ứng dụng**: lưu lượng tấn công đã đến máy chủ của bạn, đã tiêu tốn bắt tay và một phần tài nguyên đăng nhập; hơn nữa **chất lượng không đồng đều**, một số plugin bản thân có vấn đề hiệu năng hoặc tương thích.

**Đề xuất tự đánh giá**: xem nó còn được bảo trì không, có mã nguồn mở không, có tương thích phiên bản máy chủ của bạn không, ép tải một lần trên máy chủ thử rồi mới lên sản xuất.

### 5.3 `max-players` là giới hạn mềm

```properties
max-players=20
```

`max-players` chỉ quyết định **giới hạn hiển thị trong danh sách máy chủ**, và từ chối số người chơi tương ứng ở **giai đoạn đăng nhập**. Nó **không phải** biện pháp chống lũ: bot **đã tiêu tốn CPU, yêu cầu xác thực và bộ nhớ ngay ở giai đoạn đăng nhập**, chi phí đã trả trước khi bị từ chối; lũ kết nối (chỉ lập kết nối TCP) **hoàn toàn không đi đến bước phán đoán này**; nó cũng không ảnh hưởng băng thông và lũ truy vấn.

**Hãy coi `max-players` là tuyên bố dung lượng, đừng coi là phương tiện phòng thủ.**

## 6. Danh sách phòng thủ thực chiến

### 6.1 Danh sách phân tầng (từ "bắt buộc làm" đến "làm thêm thì tốt")

| Mức ưu tiên | Biện pháp | Mô tả |
| --- | --- | --- |
| **Bắt buộc** | `online-mode=true` (Java) / giữ xác thực Xbox Live (Bedrock) | Biện pháp chống người giả hiệu quả nhất trong từng biện pháp đơn lẻ |
| **Bắt buộc** | Chỉ mở cổng thực sự cần | Dịch vụ không lộ thì không bị đánh; cổng UDP đặc biệt phải tiết chế |
| **Bắt buộc** | Tường lửa máy chủ mặc định từ chối vào, chỉ cho qua cổng trong danh sách trắng | Xem [Cơ bản an toàn mạng](/tutorials/ops/network-security) |
| **Bắt buộc** | Hệ thống và phần mềm cập nhật kịp thời, siết quyền | Xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security) |
| **Bắt buộc** | Sao lưu định kỳ, và **ít nhất một bản ngoại tuyến/ngoài vị trí** | Phòng tuyến cuối chống tống tiền và xóa bản lưu trả đũa, xem [Sao lưu và khôi phục](/tutorials/java/backup) |
| **Rất khuyến nghị** | Danh sách trắng / danh sách cho phép (máy chủ nhỏ) | Người không quen biết căn bản không kết nối được |
| **Rất khuyến nghị** | Giới hạn tốc độ theo IP nguồn cho cổng game | Quy tắc ở mục 3.4 / 3.5 / 4.3 / 5.2 |
| **Rất khuyến nghị** | Giám sát và cảnh báo (băng thông, số kết nối, CPU, số người chơi), và chọn nhà cung cấp có điều khoản bảo vệ rõ ràng | Xem mục 6.3 |
| **Khuyến nghị** | Proxy ở trước, phía sau không lộ trực tiếp | Xem [Proxy đa máy chủ](/tutorials/java/proxy) |
| **Khuyến nghị** | Người chơi Bedrock / chơi chéo tham khảo [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) để quy hoạch cửa vào | Chơi chéo sẽ đưa vào bề mặt lộ UDP thêm |
| **Khuyến nghị** | Một bản phương án ứng phó sự cố bằng văn bản | Xem mục 6.4 |
| **Làm thêm thì tốt** | Dịch vụ lọc chuyên cho Minecraft | Năng lực tùy nhà cung cấp, hãy kiểm chứng trong phạm vi nhỏ trước |
| **Làm thêm thì tốt** | Plugin chống bot | Tự đánh giá, đừng coi là phòng tuyến duy nhất |

### 6.2 Bảng tương ứng kiểu tấn công

| Kiểu tấn công | Thực sự có ích | Cơ bản vô ích |
| --- | --- | --- |
| **UDP flood (giả mạo IP nguồn)** | Làm sạch và dung lượng phía trên, chỉ mở cổng UDP cần thiết, giới hạn tốc độ theo IP nguồn ở biên | Chặn từng IP, plugin máy chủ, `max-players` |
| **Phản xạ khuếch đại (DNS / NTP / memcached / SSDP / CLDAP)** | **Làm sạch phía trên** (đây là tầng duy nhất có hiệu lực), dung lượng phòng máy | Mọi quy tắc phía máy chủ (đường truyền đã đầy), khiếu nại bên thứ ba (bạn cũng là nạn nhân) |
| **SYN flood** | Làm sạch phía trên, tinh chỉnh tham số `syn` của nhân, hấp thụ ở tầng cân bằng tải/proxy | Giới hạn tốc độ tầng ứng dụng, danh sách trắng |
| **Lũ MOTD / ping trạng thái** | Giới hạn tốc độ kết nối TCP theo nguồn, proxy ở trước, lọc phía trên | Tắt `enable-query` (nó không quản cái này), chặn IP (lượng lớn và phân tán) |
| **Lũ ping bản Bedrock** | Bảo vệ phía trên, giới hạn tốc độ UDP `19132` theo IP nguồn | Tắt ping (**không làm được**), cấu hình máy chủ |
| **Lũ kết nối / lũ đăng nhập (đăng nhập nửa mở)** | `connlimit` / `ct count` của tường lửa, `online-mode` hoặc xác thực thân phận, proxy ở trước, làm sạch phía trên | `max-players`, lọc chat, danh sách trắng (ở chế độ ngoại tuyến danh sách trắng chỉ có hiệu lực sau khi đăng nhập) |
| **Người giả treo máy / spam** | `online-mode` + danh sách trắng, `connection-throttle`, giới hạn gói tin, xử lý bằng lệnh quản trị | Bảo vệ băng thông (loại tấn công này gần như không chiếm băng thông) |
| **Khai thác lỗ hổng / nâng quyền** | Cập nhật kịp thời, quyền tối thiểu, `online-mode` | Tường lửa (đánh vào tầng ứng dụng) |

### 6.3 Giám sát và cảnh báo: không có cảnh báo tức là không có giám sát

Ít nhất phải trả lời được "bây giờ có đang bị đánh không":

| Chỉ số | Xem ở đâu | Đặc điểm bất thường |
| --- | --- | --- |
| **Băng thông / tốc độ nhận gói** | Biểu đồ lưu lượng trên console nhà cung cấp, `/proc/net/dev`, `ip -s link`, `vnstat` | Vượt xa đỉnh lịch sử, mà số người chơi không tăng tương ứng |
| **Số kết nối** | `ss -tan state established \| wc -l`, `ss -s` | Số kết nối vọt lên mà số người chơi không đổi |
| **CPU và ngắt mềm** | `top`, `mpstat -P ALL 1` | Người chơi không nhiều mà `%soft` rất cao (thường là lũ gói nhỏ) |
| **Số người chơi và đăng nhập thất bại** | Nhật ký máy chủ, bảng điều khiển | Lượng lớn lần thử đăng nhập, lượng lớn ID bất thường |
| **Số lần khớp của tường lửa** | `iptables -L -v -n`, `nft list ruleset` | Số lần khớp quy tắc giới hạn tốc độ tăng liên tục |

```bash
# Số kết nối đã lập (kết hợp ss -s xem tổng quan socket)
ss -tan state established | wc -l

# CPU từng nhân (gồm ngắt mềm) làm mới mỗi giây
mpstat -P ALL 1

# Số đếm tích lũy của card mạng (xem hiệu số giữa hai lần lấy mẫu)
ip -s link show dev eth0

# Bản ghi khớp giới hạn tốc độ trong nhật ký nhân (kết hợp quy tắc LOG / log)
sudo journalctl -k | grep -i 'MC-UDP-OVER' | tail -n 20
```

:::tip Để bảng điều khiển của nhà cung cấp trực thay bạn
Phần lớn console cloud cung cấp **đường cong băng thông và cảnh báo**. Hãy đặt ngưỡng ở "đỉnh lịch sử + dư", một khi kích hoạt là nhận được thông báo —— **việc này hữu ích hơn nhiều so với lật nhật ký sau đó**. Đường dẫn cấu hình cụ thể tùy nhà cung cấp, hãy lấy tài liệu chính thức làm chuẩn.
:::

### 6.4 Phương án ứng phó sự cố (một trang giấy)

Khoảnh khắc bị đánh không phải lúc để suy nghĩ. Hãy viết trước:

1. **Phán đoán**: đối chiếu chỉ số ở 6.3, trước hết xác nhận là **tấn công** hay **lỗi của chính bạn** (plugin vòng lặp vô hạn, tác vụ sao lưu chiếm hết IO đĩa, tệp thế giới hỏng gây lag).
2. **Cắt lỗ và cầu cứu**: chịu được thì chịu; khi không chịu nổi thì tạm thời **chỉ cho IP trong danh sách trắng / chỉ cho IP proxy**, đồng thời báo sự cố cho nhà cung cấp, nói rõ thời gian, hiện tượng, đặc điểm lưu lượng, hỏi xem có kích hoạt làm sạch không, có cần đổi IP không.
3. **Lưu chứng cứ và khôi phục**: lưu biểu đồ lưu lượng, nhật ký, đầu ra `ss` —— **đây là căn cứ duy nhất để khiếu nại và nhìn lại**; sau khi tấn công dừng, xác nhận TPS, số kết nối và tính toàn vẹn của thế giới, rồi mới gỡ bỏ giới hạn tạm thời.
4. **Nhìn lại**: quy mô tấn công lớn đến đâu? Tầng nào chịu được, tầng nào không? Lần sau cần mua gì, cấu hình gì?

:::warn Sao lưu là một phần của phòng thủ, không phải mục thêm vào
**Tống tiền và xóa bản lưu trả đũa** là phương thức tấn công có thật. Kẻ tấn công lấy được quyền bảng điều khiển hoặc RCON xong, việc đầu tiên thường làm là xóa bản sao lưu. Nên: **ít nhất một bản sao lưu phải ở phương tiện ngoại tuyến hoặc ngoài vị trí, và không nằm trên đường dẫn ghi được của máy chủ.** Phương án cụ thể xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::

## 7. Ranh giới trung thực

Viết ba câu ở đây, để bạn không kỳ vọng sai vào bài này:

1. **Cấu hình máy chủ không thể chặn tấn công kiểu lưu lượng quy mô lớn.** Dù là `iptables`, `nftables`, plugin hay `max-players`, đều chạy **sau khi lưu lượng tấn công đã đến**. Đường truyền 1 Gbps đối diện cuộc tấn công 10 Gbps, cấu hình hoàn hảo đến đâu cũng vô ích. **Cách giải thực sự duy nhất là dung lượng và năng lực làm sạch phía trên.**
2. **Năng lực phía trên là bạn mua được, không phải bạn cấu hình ra.** Khi chọn dịch vụ đã phải xem rõ điều khoản DDoS: ngưỡng bảo vệ miễn phí bao nhiêu, vượt ngưỡng là làm sạch hay blackhole, có hỗ trợ UDP không, có IP chống DDoS cao cấp không, đổi IP có tính phí không. **Những câu hỏi này hỏi vào đúng ngày bị đánh là quá muộn.**
3. **Mỗi giới hạn tốc độ đều là nguy cơ tổn thương nhầm.** Giới hạn tốc độ sẽ làm tổn thương người chơi thật có lưu lượng đột biến, quán net và mạng gia đình dùng chung IP cửa ra. **Quan sát trước, bỏ sau, điều chỉnh liên tục**, đừng đưa ngưỡng chép trên mạng lên sản xuất luôn.

## Bước tiếp theo

- Phòng thủ cơ bản ở tầng mạng (cổng, tường lửa, SSH): xem [Cơ bản an toàn mạng](/tutorials/ops/network-security)
- Gia cố bên trong hệ thống (tài khoản, quyền, systemd): xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security)
- Để người chơi kết nối được vào máy chủ của bạn: xem [Triển khai đến môi trường truy cập được](/tutorials/java/deploy)
- Proxy và cách ly phía sau: xem [Proxy đa máy chủ](/tutorials/java/proxy)
- Người chơi Bedrock và chơi chéo: xem [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile)
- Phòng tuyến cuối của dữ liệu: xem [Sao lưu và khôi phục](/tutorials/java/backup)

---

> Lệnh và cấu hình lấy tài liệu chính thức của từng phần mềm làm chuẩn; năng lực bảo vệ thực tế của nhà mạng và phòng máy khác nhau rất nhiều.
