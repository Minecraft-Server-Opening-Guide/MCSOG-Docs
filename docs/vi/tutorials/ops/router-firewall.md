---
title: Router mềm và chuyển tiếp cổng
slug: router-firewall
cat: ops
level: 3
order: 8
minutes: 16
tags: [ops, router, firewall, port-forward, nat, ipv6, openwrt]
updated: 2026-10-04
draft: false
---

Máy chủ chạy thông trên máy này, tường lửa cũng đã mở, người chơi vẫn không kết nối được —— vấn đề gần như luôn nằm ở **mấy chặng giữa mạng công cộng và máy của bạn**. Bài này nói rõ mỗi chặng phụ trách gì, cấu hình thế nào, và khi không kết nối được thì kiểm tra theo thứ tự nào.

Bài này đưa ra **khái niệm + ví dụ dòng lệnh**. Tên menu, vị trí và tùy chọn trên giao diện đồ họa khác nhau rất nhiều giữa các phiên bản, hãng và firmware, mọi nội dung loại này đều được ghi chú rõ, không giả vờ chúng giống nhau ở mọi nơi.

## 1. Router rốt cuộc làm gì

"Router" gia đình thực ra là một máy tích hợp, đồng thời làm năm việc. Hiểu tách ra thì khi kiểm tra sự cố mới không lẫn:

| Chức năng | Tác dụng | Biểu hiện khi có vấn đề |
| --- | --- | --- |
| **Định tuyến** | Chuyển gói IP giữa WAN và LAN | Hoàn toàn không lên mạng được |
| **NAT** | Chuyển địa chỉ nội bộ thành địa chỉ công cộng (SNAT), và chuyển ngược theo quy tắc (DNAT, tức chuyển tiếp cổng) | Mạng nội bộ lên mạng được, bên ngoài không kết nối vào |
| **DHCP** | Tự cấp IP, gateway, DNS cho thiết bị nội bộ | Thiết bị không nhận được địa chỉ hoặc địa chỉ đổi loạn |
| **DNS** | Chuyển tiếp/cache phân giải tên miền, cung cấp tên nội bộ | Ping được IP nhưng tên miền không thông |
| **Tường lửa** | Lọc có trạng thái, quyết định lưu lượng nào được qua | Quy tắc viết sai thì thông hết hoặc chặn hết |

**Chuyển tiếp cổng (port forwarding) bản chất là DNAT**: đổi địa chỉ và cổng đích của gói "gửi đến một cổng của IP công cộng" rồi chuyển cho một máy nội bộ. Nó và "mở trên tường lửa" là hai chuyện:

- **NAT quyết định gói đi đâu**;
- **quy tắc lọc quyết định gói có qua được không**.

Hai thứ phải đồng thời thành lập thì chuyển tiếp cổng mới có hiệu lực. Đây cũng là lý do trên hệ như pfSense "đã thêm chuyển tiếp cổng mà vẫn không thông" —— quy tắc lọc chưa mở (bản mới thường tự tạo quy tắc tương ứng, xem mục 5).

Tiền đề của chuyển tiếp cổng là **máy đích có IP nội bộ cố định**: hoặc làm **gán tĩnh DHCP** trên router (khuyến nghị), hoặc đặt IP tĩnh trên máy và loại địa chỉ đó khỏi bể DHCP. Nếu không, máy khởi động lại đổi IP là chuyển tiếp trỏ vào không khí.

## 2. Router gia đình và router mềm

| Phương án | Phù hợp | Ưu điểm | Cái giá |
| --- | --- | --- | --- |
| **Máy tích hợp gia đình** | Nhu cầu đơn giản | Cắm là dùng, tiêu thụ điện thấp, có Wi-Fi | Ít chức năng, mục cấu hình hạn chế, firmware hãng thường ngừng bảo trì |
| **OpenWrt** (cài trên router cứng được hỗ trợ hoặc x86) | Muốn kiểm soát sâu, chi phí thấp | Quản lý gói, cấu hình UCI script hóa được, cộng đồng sôi động | Phải tự bảo trì; cài firmware có rủi ro biến thành cục gạch; driver Wi-Fi tùy model khác nhau nhiều |
| **pfSense / OPNsense** (x86) | Muốn năng lực tường lửa/VPN đầy đủ | Tường lửa có trạng thái, NAT, IPsec/WireGuard/OpenVPN, biểu đồ lưu lượng, nhiều dải mạng | Cần một máy x86 và từ hai card mạng trở lên; nhiều chức năng cũng nghĩa là bề mặt cấu hình lớn hơn |

:::note Đường dẫn menu không phải kiến thức
Giao diện của OpenWrt, pfSense, OPNsense đã bị điều chỉnh nhiều lần giữa các phiên bản (đổi tên tùy chọn, dời vị trí, đổi giá trị mặc định). **Nhớ khái niệm và ngữ nghĩa của tệp cấu hình bền hơn nhớ "bấm menu nào"**. Các ví dụ dòng lệnh trong bài là giao diện ổn định; vị trí cụ thể trên giao diện đồ họa hãy đối chiếu tài liệu chính thức của phiên bản bạn cài.
:::

## 3. OpenWrt: cấu hình chuyển tiếp cổng bằng UCI

Cấu hình tường lửa của OpenWrt nằm ở `/etc/config/firewall`, sửa bằng `uci`. Dưới đây là cách viết chuẩn để chuyển `TCP 25565` từ mạng ngoài vào `192.168.1.10:25565` nội bộ:

```bash
# 1. Thêm một mục tường lửa loại redirect
uci add firewall redirect

# 2. Đặt trường cho mục mới này (mục cuối danh sách)
uci set firewall.@redirect[-1].name='Minecraft'
uci set firewall.@redirect[-1].target='DNAT'
uci set firewall.@redirect[-1].src='wan'
uci set firewall.@redirect[-1].src_dport='25565'
uci set firewall.@redirect[-1].dest='lan'
uci set firewall.@redirect[-1].dest_ip='192.168.1.10'
uci set firewall.@redirect[-1].dest_port='25565'
uci set firewall.@redirect[-1].proto='tcp'

# 3. Commit và cho tường lửa sinh lại quy tắc
uci commit firewall
/etc/init.d/firewall reload
```

Ý nghĩa các trường:

| Trường | Ý nghĩa |
| --- | --- |
| `name` | Tên quy tắc, chỉ để nhận diện, đặt gì cũng được |
| `target` | `DNAT` nghĩa là chuyển đổi địa chỉ đích. **Đây là giá trị mặc định của mục redirect**, viết rõ ra thì dễ hiểu hơn |
| `src` | Lưu lượng từ vùng nào, ở đây là `wan` |
| `src_dport` | Cổng bị truy cập ở phía công cộng |
| `dest` | Chuyển đến vùng nào, ở đây là `lan` |
| `dest_ip` | IP của máy đích nội bộ |
| `dest_port` | Cổng đích nội bộ |
| `proto` | Giao thức, `tcp` / `udp` / `tcp udp` (trình phân tích cấu hình nhận danh sách giao thức cách nhau bằng dấu cách) |

Thao tác thường dùng và điểm cần chú ý:

```bash
uci show firewall                 # Xem cấu hình hiện tại, xác nhận quy tắc thực sự đã ghi vào
uci delete firewall.@redirect[0]  # Xóa redirect thứ 0 (số thứ tự lấy theo đầu ra uci show)
uci commit firewall
/etc/init.d/firewall reload
```

- `uci set` chỉ sửa cấu hình trong bộ nhớ, **bắt buộc `uci commit` mới ghi vào `/etc/config/firewall`**;
- `reload` sẽ sinh lại và nạp quy tắc, không cần khởi động lại router;
- **OpenWrt 22.03 trở lên mặc định dùng fw4 (backend nftables)**, 21.02 trở xuống là fw3 (backend iptables). Cách viết `/etc/config/firewall` về cơ bản giống nhau giữa hai bên, nhưng **hướng dẫn gõ thẳng lệnh `iptables` không áp dụng được trên phiên bản mới**, tương ứng là `nft`;
- Cổng ngoài và cổng trong **có thể khác nhau** (đổi `src_dport` là được). Đổi cổng ngoài giảm được xác suất bị quét, nhưng **đây chỉ là giảm nhiễu, không phải biện pháp an ninh**.

**Bedrock Edition (UDP) hoặc cần chuyển tiếp cả TCP/UDP** thì viết giao thức thành danh sách:

```bash
uci set firewall.@redirect[-1].proto='tcp udp'
```

## 4. OpenWrt: gán tĩnh DHCP

IP đích của chuyển tiếp cổng phải ổn định. Trên OpenWrt gán IP cố định theo địa chỉ MAC:

```bash
uci add dhcp host
uci set dhcp.@host[-1].name='mcserver'
uci set dhcp.@host[-1].mac='AA:BB:CC:DD:EE:FF'
uci set dhcp.@host[-1].ip='192.168.1.10'
uci set dhcp.@host[-1].dns='1'          # Tùy chọn: đăng ký luôn tên này vào DNS cục bộ

uci commit dhcp
/etc/init.d/dnsmasq restart
```

Lưu ý:

- `mac` dùng MAC card mạng của máy đích, **phân biệt chữ hoa thường thường không quan trọng, nhưng định dạng phải là sáu nhóm thập lục phân cách nhau bằng dấu hai chấm**;
- `ip` phải nằm trong dải LAN, và **đừng rơi vào phạm vi bể động DHCP** (bể động mặc định của OpenWrt thường bắt đầu từ `100`, `192.168.1.10` thường an toàn, nhưng lấy cấu hình thực tế của bạn làm chuẩn);
- Sửa cấu hình `dhcp` thì cần khởi động lại **dnsmasq**, không phải firewall;
- Cũng có thể đặt IP tĩnh ở phía máy, nhưng **chỉ chọn một cách**, cấu hình cả hai bên dễ xung đột.

## 5. pfSense / OPNsense: khái niệm giống, nhãn sẽ đổi

Hai hệ này đều là FreeBSD + tường lửa pf, khái niệm thông với OpenWrt, nhưng cách thao tác hoàn toàn khác (chủ yếu qua giao diện web, cũng có config.xml). Khái niệm cốt lõi:

| Khái niệm | Mô tả |
| --- | --- |
| **Cổng mạng (Interfaces)** | Thường có WAN, LAN, và cổng OPT tùy chọn; mỗi cổng tương ứng một card mạng hoặc một VLAN |
| **Chuyển tiếp cổng** | Thêm ánh xạ trong **Firewall > NAT > Port Forward**: chỉ định cổng mạng, giao thức, cổng đích, IP và cổng đích |
| **Quy tắc lọc liên kết** | **NAT và lọc là hai chuyện**. Phiên bản mới hơn **tự tạo quy tắc mở tương ứng** khi lưu chuyển tiếp; giao diện bản cũ có tùy chọn kiểu "Add associated filter rule". **Hành vi cụ thể thay đổi theo phiên bản, hãy xác nhận trong `Firewall > Rules` rằng quy tắc thực sự tồn tại.** |
| **Bí danh (Aliases)** | **Firewall > Aliases** có thể định nghĩa nhiều cổng hoặc nhiều IP thành một tên, quy tắc tham chiếu bí danh, tiện bảo trì |
| **Ánh xạ tĩnh** | Trong trang dịch vụ DHCP (pfSense là `Services > DHCP Server`; OPNsense là trang liên quan DHCP) gán IP cố định theo MAC |
| **NAT quay vòng (reflection)** | Cho máy nội bộ cũng truy cập dịch vụ nội bộ bằng IP công cộng. Mặc định thường tắt, cách bật và tên tùy chọn thay đổi theo phiên bản |
| **Sao lưu cấu hình** | pfSense ở `Diagnostics > Backup & Restore`; OPNsense ở `System > Configuration > Backups`. **Sửa xong nhất định phải xuất cấu hình** |

Khác biệt phiên bản cần chú ý thêm:

- **OPNsense từ 24.7 đổi dịch vụ DHCP mặc định từ ISC dhcpd sang Kea**, vị trí menu ánh xạ tĩnh theo đó thay đổi;
- pfSense chia hai dòng CE và Plus, cùng một chức năng có thể ở vị trí khác nhau;
- Nhãn giao diện của cả hai nhà đã đổi tên nhiều lần qua nhiều năm.

Vì vậy: **đường dẫn menu lấy tài liệu chính thức của phiên bản bạn cài làm chuẩn**, nhưng năm khái niệm "cổng WAN/LAN, chuyển tiếp cổng NAT, quy tắc lọc liên kết, bí danh, ánh xạ tĩnh" đều đúng ở mọi phiên bản.

## 6. IPv4 công cộng và CGNAT

**Trước khi cấu hình chuyển tiếp cổng, hãy xác nhận bạn rốt cuộc có IPv4 công cộng không.** Cách rất đơn giản:

1. Xem **IP cổng WAN nhận được** trên trang trạng thái router;
2. Dùng thiết bị khác (ví dụ dữ liệu di động) truy cập bất kỳ trang "IP của tôi là gì", xem **IP mà bên ngoài thấy**;
3. Hai cái **giống nhau**, và địa chỉ đó không phải địa chỉ riêng, mới chứng tỏ bạn có IPv4 công cộng.

Manh mối phán đoán:

| Hiện tượng | Ý nghĩa |
| --- | --- |
| IP WAN rơi vào `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | Địa chỉ nội bộ của nhà mạng, NAT nhiều lớp điển hình |
| IP WAN rơi vào `100.64.0.0/10` | **Dải địa chỉ dành riêng CGNAT (RFC 6598)**, gần như chắc chắn không có IPv4 công cộng |
| Vài chặng đầu `traceroute` đều là địa chỉ riêng | Ở giữa còn NAT cấp nhà mạng |
| IP WAN là địa chỉ công cộng, nhưng bên ngoài vẫn không kết nối được | Có thể nhà mạng chặn cổng vào, cũng có thể chuyển tiếp/tường lửa của bạn chưa cấu hình đúng, cần kiểm chứng từng bước |

:::warn Đừng giả định "gọi điện là xin được IP công cộng"
Chính sách khác nhau rất nhiều giữa nhà mạng, khu vực và gói cước: có nơi cho miễn phí, có nơi thu phí, có nơi nói rõ không cung cấp, có nơi chỉ cấp cho băng thông rộng doanh nghiệp. **Có thể xin, nhưng đừng coi đó là phương án chắc chắn có được**, hãy chuẩn bị đường thay thế.
:::

Hai tình huống "trông như không có mạng công cộng" thường gặp khác:

- **NAT hai lớp**: modem quang tự quay số và làm NAT, router của bạn NAT thêm một lần. Cách giải là đổi modem quang sang **chế độ bridge** (để router của bạn quay số), hoặc làm chuyển tiếp cổng thêm một lần trên modem quang (cả hai lớp đều phải chuyển).
- **Nhà mạng chặn cổng**: thường gặp với các cổng như 80/443 ở một số khu vực. Đổi sang cổng không chuẩn thường đi vòng được, **chính sách chặn cụ thể tùy nhà mạng và khu vực**.

## 7. Ba lối ra khi không có IPv4 công cộng

| Phương án | Nguyên lý | Cái giá |
| --- | --- | --- |
| **Xin IP công cộng** | Để ISP cấp thẳng một địa chỉ nhận được lưu lượng vào | Có thể miễn phí, có thể thu phí, có thể bị từ chối; không nhất thiết cho địa chỉ tĩnh |
| **Chuyển sang IPv6** | Ở đa số khu vực IPv6 truy cập được từ công cộng, chỉ cần mở tường lửa (xem mục 8) | Phía người chơi cũng cần IPv6; độ phủ khác nhau rất nhiều giữa các mạng |
| **Trung chuyển VPS / tunnel** | Dùng một máy chủ có IP công cộng làm bàn đạp, chuyển lưu lượng về nhà bạn | Thêm một chặng, độ trễ và độ ổn định tùy nút trung chuyển; có chi phí băng thông |

Cách làm phổ biến với trung chuyển VPS:

- **frp**: chạy `frpc` trong nhà, chạy `frps` trên VPS, ánh xạ cổng của VPS vào dịch vụ nội bộ. Cấu hình đơn giản, phù hợp chuyển tiếp một cổng (ví dụ xem [Triển khai đến môi trường truy cập được](/tutorials/java/deploy));
- **WireGuard + DNAT**: máy trong nhà và VPS tạo tunnel, trên VPS DNAT lưu lượng vào về địa chỉ nội bộ trong tunnel. Linh hoạt, mã hóa, nhưng phải tự bảo trì định tuyến và quy tắc chuyển tiếp;
- **Dịch vụ tunnel thương mại**: nhàn, nhưng thường có giới hạn lưu lượng/băng thông, và **chất lượng không đồng đều**.

Khi chọn cần chú ý: **Bedrock Edition dùng UDP**, nhiều phương án tunnel mặc định chỉ hỗ trợ TCP, UDP cần xác nhận thêm hoặc trả phí. Ngoài ra trung chuyển làm tăng độ trễ **cấp vài chục mili giây** (tùy khoảng cách địa lý), cách chơi nhạy cảm độ trễ phải đánh giá trước.

## 8. IPv6: logic chuyển tiếp cổng đã thay đổi

Thay đổi cốt lõi của IPv6 là **địa chỉ đủ nhiều, thường không cần NAT nữa**. Vì vậy:

- Không còn lớp "chuyển tiếp cổng" (DNAT), thay vào đó là **mở lưu lượng vào trên tường lửa**;
- Mỗi thiết bị thường có **địa chỉ định tuyến toàn cục**, truy cập trực tiếp được;
- Chính sách mặc định của tường lửa mới là then chốt: **các firmware như OpenWrt mặc định từ chối kết nối vào từ phía WAN**, bạn bắt buộc phải thêm một quy tắc mở rõ ràng.

Trên OpenWrt mở `TCP 25565` cho một máy:

```bash
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-Minecraft-v6'
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].dest='lan'
uci set firewall.@rule[-1].dest_ip='2001:db8:abcd:1::10'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='25565'
uci set firewall.@rule[-1].family='ipv6'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
/etc/init.d/firewall reload
```

**Vấn đề prefix** là cái bẫy phổ biến nhất khi mở máy chủ bằng IPv6:

- Băng thông rộng gia đình thường nhận một prefix từ ISP qua **DHCPv6-PD (ủy quyền prefix)** (thường là `/56`、`/60` hoặc `/64`, tùy ISP), rồi router chia cho mạng nội bộ;
- **Prefix của nhiều ISP không cố định**, quay số lại, khởi động lại modem quang, nhà mạng điều chỉnh đều có thể đổi prefix;
- Prefix đổi một cái là `dest_ip` trong quy tắc trên mất hiệu lực, người chơi cũng không kết nối được;
- Hướng xử lý: xin ISP **prefix tĩnh** (không nhất thiết được cấp); hoặc cho máy dùng **định danh cổng ổn định** (ví dụ cố định hậu tố trong SLAAC/DHCPv6), rồi dùng script trong `hotplug.d/iface` hoặc tác vụ định kỳ **tự cập nhật quy tắc tường lửa**; cũng có thể dùng prefix định tuyến do nhà cung cấp tunnel cấp (thuộc phương án bên thứ ba, phải tự đánh giá độ ổn định).

Các điểm khác về IPv6:

- Người chơi kết nối phải viết **dấu ngoặc vuông**: `[2001:db8:abcd:1::10]:25565`;
- `server-ip` trong `server.properties` của máy chủ để rỗng là lắng nghe cả IPv4/IPv6 (để rỗng = bind mọi cổng mạng);
- **Khá nhiều người chơi không có IPv6 khả dụng** (nhất là ở một số khu vực và mạng di động), nên IPv6 tốt nhất là **bổ sung** ngoài IPv4, không phải cổng vào duy nhất;
- Mạng nội bộ có thể dùng địa chỉ ULA (`fd00::/8`) để đánh địa chỉ nội bộ ổn định, nhưng **truy cập được từ bên ngoài vẫn phụ thuộc prefix ISP cấp**.

## 9. An ninh biên: chỉ chuyển tiếp thứ bạn thực sự cần

Mỗi quy tắc chuyển tiếp cổng là một cánh cửa bạn mở trên mạng công cộng. Nguyên tắc:

1. **Chỉ chuyển tiếp cổng bắt buộc**. Minecraft chỉ cần `TCP 25565` (Bedrock Edition `UDP 19132`).
2. **Tuyệt đối không chuyển tiếp những cổng này** (đây là cửa vào xâm nhập phổ biến nhất):
   - `TCP 25575` RCON (giao thức tự nó không mã hóa, bằng cách giao console ra ngoài);
   - `TCP 3306` MySQL/MariaDB、`TCP 5432` PostgreSQL、`TCP 6379` Redis、`TCP 27017` MongoDB、`TCP 9200` Elasticsearch;
   - `TCP 2375` / `2376` Docker API;
   - `TCP 445` SMB;
   - `UDP 623` IPMI (xem [Máy chủ dạng rack, switch, tường lửa phần cứng và UPS](/tutorials/ops/hardware-rack));
   - `TCP 3493` NUT.
3. **Đừng phơi trực tiếp bảng điều khiển quản trị**. Các bảng điều khiển như Pterodactyl, Baota là mục tiêu nguy hiểm: phạm vi ảnh hưởng của lỗ hổng lớn, một khi bị chiếm là cả máy.
4. **Cổng vào quản trị như RDP / SSH đổi sang cổng ngoài không chuẩn** (ví dụ chuyển `50022` ngoài vào `22` nội bộ). Cách này chỉ giảm quét tự động, **không thay thế được xác thực và gia cố** —— cần dùng khóa vẫn phải dùng khóa, cần bật xác thực hai lớp vẫn phải bật.
5. **Ưu tiên VPN thay vì phơi ra**. Muốn dùng bảng điều khiển cho mình, cách ổn nhất là dựng một VPN, bảng điều khiển chỉ lắng nghe địa chỉ nội bộ.
6. **Đừng bật UPnP / NAT-PMP ở biên**, trừ khi bạn thực sự cần. Nó cho chương trình nội bộ tự đục lỗ trên tường lửa, bằng cách giao chính sách biên cho ứng dụng.
7. **Làm giới hạn tốc độ trên tường lửa** (ví dụ giới hạn tốc độ kết nối mới tới `25565`), giảm được một phần lũ kết nối; dùng kèm giới hạn kết nối phía máy chủ.
8. **Dịch vụ bảng điều khiển nên có chặn đăng nhập kiểu fail2ban**, và cập nhật kịp thời.

## 10. WireGuard: cách an toàn hơn phơi cổng

Ý tưởng: **không phơi cổng quản trị ra cả thế giới, mà cho thiết bị ngoài vào mạng nội bộ trước**. WireGuard là lựa chọn gọn nhất hiện nay —— triển khai ở kernel (vào mainline từ Linux 5.6), cấu hình ngắn, dựa trên UDP.

Tạo cặp khóa:

```bash
wg genkey | tee privatekey | wg pubkey > publickey
chmod 600 privatekey
```

Máy chủ (phía có IP công cộng, ví dụ VPS hoặc router mềm của bạn):

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <khóa riêng máy chủ>

[Peer]
PublicKey = <khóa công khai client>
AllowedIPs = 10.10.0.2/32
```

Client (laptop hoặc điện thoại của bạn):

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.2/24
PrivateKey = <khóa riêng client>

[Peer]
PublicKey = <khóa công khai máy chủ>
Endpoint = vpn.example.com:51820
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
```

Các điểm chính:

- **`AllowedIPs` ở phía máy chủ đồng thời là "cho phép peer này dùng những địa chỉ nguồn nào" và "lưu lượng đi đến những địa chỉ này thì gửi cho peer này"**, viết `10.10.0.2/32` là một máy; phía client viết `10.10.0.0/24` nghĩa là **chỉ cho lưu lượng đến dải VPN đi qua tunnel** (chia luồng), viết `0.0.0.0/0, ::/0` là **proxy toàn cục**;
- **`PersistentKeepalive = 25` đặt ở phía nằm sau NAT**, dùng để duy trì ánh xạ, cho máy chủ chủ động kết nối ngược lại;
- Phía client không cần `Endpoint` cũng chạy được (khi máy chủ chủ động nối tới), nhưng thường vẫn viết để khởi phát trước;
- Chỉ cần mở `UDP 51820` trên **máy chủ** (cổng có thể tùy chỉnh), client không cần cổng vào nào;
- Nếu muốn client VPN truy cập cả mạng nội bộ hoặc truy cập internet, máy chủ cần bật chuyển tiếp IP và làm MASQUERADE/NAT trong nftables/iptables;
- Trên OpenWrt cấu hình WireGuard qua UCI (mục `wireguard` trong `/etc/config/network`) hoặc `luci-app-wireguard`, **khác định dạng wg-quick ở trên**, nhưng khóa, `AllowedIPs`, `Endpoint` những khái niệm này hoàn toàn giống;
- Cũng đừng quên: **quyền tệp khóa riêng đặt `600`, đừng commit lên kho Git**.

## 11. Thứ tự kiểm tra: từ trong ra ngoài, kiểm chứng từng lớp

Khi người chơi không kết nối được, **đừng nghi nhà mạng ngay**. Tra theo thứ tự này, mỗi bước đều cho ra kết luận "có/không":

**Bước 1: dịch vụ trên máy có thực sự đang lắng nghe không**

```bash
ss -tlnp            # Lắng nghe TCP
ss -ulnp            # Lắng nghe UDP (Bedrock Edition dùng)
```

- Xem địa chỉ lắng nghe: nếu là `127.0.0.1:25565`, **chỉ máy này kết nối được**, phải đổi sang lắng nghe `0.0.0.0` (hoặc để rỗng/chỉ định IP nội bộ);
- Trong `server.properties` của Java Edition **`server-ip` để rỗng** là bind mọi cổng mạng, điền `127.0.0.1` sẽ khiến mạng ngoài không truy cập được;
- Xác nhận máy chủ thực sự khởi động xong (thấy nhật ký kiểu `Done`), chứ không kẹt ở giai đoạn khởi động.

**Bước 2: tường lửa trên máy đã mở chưa**

```bash
sudo ufw status verbose          # Ubuntu/Debian
sudo firewall-cmd --list-all     # hệ RHEL/Fedora
sudo nft list ruleset            # nftables
sudo iptables -S                 # iptables bản cũ
```

Trên Windows kiểm tra quy tắc vào, và xác nhận vị trí mạng đó được nhận là "mạng riêng" chứ không phải "mạng công cộng". **Máy chủ cloud còn phải kiểm tra thêm nhóm bảo mật** —— nhóm bảo mật và tường lửa hệ thống là hai chỗ mở độc lập, thiếu một cái là không được.

**Bước 3: quy tắc chuyển tiếp cổng có đúng không**

- Quy tắc tồn tại, IP đích là IP **hiện tại** của máy đó (xác nhận gán tĩnh DHCP có hiệu lực trước);
- Giao thức đúng (TCP hay UDP);
- Cổng ngoài và cổng trong không viết ngược;
- **Đo từ mạng ngoài, đừng đo từ mạng nội bộ**: NAT quay vòng (hairpin) của nhiều router mặc định tắt, trong mạng nội bộ dùng IP công cộng truy cập chính mình sẽ thất bại, nhưng điều đó không có nghĩa chuyển tiếp chưa cấu hình đúng. Dùng dữ liệu di động hoặc công cụ kiểm tra bên ngoài để kiểm chứng.

**Bước 4: ISP / CGNAT**

- Quay lại cách ở mục 6, xác nhận IP WAN giống IP bên ngoài thấy;
- Dùng `traceroute` (Windows dùng `tracert`) xem vài chặng đầu có địa chỉ riêng không;
- Nếu xác nhận nằm sau CGNAT, chuyển tiếp cổng cấu hình kiểu gì cũng không có hiệu lực, chỉ có thể đi theo lối ở mục 7.

**Bước 5: phía client**

- Địa chỉ và cổng có viết sai không, tên miền phân giải ra có phải IP hiện tại không (IP động đổi địa chỉ rất thường);
- Tường lửa của client/mạng công ty có chặn cổng đó không (một số mạng doanh nghiệp chỉ mở 80/443);
- Người chơi dùng IPv4 hay IPv6, có khớp ngăn xếp máy chủ mở không;
- Phiên bản client và máy chủ có tương thích không (lệch phiên bản giao thức sẽ bị từ chối thẳng, xem [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol));
- Máy chủ có bật danh sách trắng không, có đang ở trạng thái xác minh `online-mode` thất bại không.

**Bắt gói để xác nhận**: chạy trên máy chủ

```bash
sudo tcpdump -ni any port 25565
```

Rồi cho client bên ngoài kết nối. **Thấy gói đi vào** nghĩa là chuỗi chuyển tiếp phía trước thông, vấn đề ở phía máy (tường lửa/lắng nghe); **hoàn toàn không có gói** nghĩa là vấn đề ở phía ngoài hơn (chuyển tiếp/ISP).

## 12. Danh sách kiểm tra trước khi lên sóng

- [ ] Đã xác nhận mình **có IPv4 công cộng**, hoặc đã chọn phương án thay thế (IPv6 / trung chuyển VPS / tunnel)
- [ ] Máy đích đã có **IP nội bộ cố định** (gán tĩnh DHCP hoặc địa chỉ tĩnh trên máy, chỉ chọn một)
- [ ] Chỉ chuyển tiếp `TCP 25565` (Bedrock Edition thêm `UDP 19132`)
- [ ] **RCON `25575`, cổng cơ sở dữ liệu, Docker API, IPMI đều không bị phơi ra**
- [ ] Bảng điều khiển quản trị không nối trực tiếp từ công cộng, hoặc đã truy cập qua VPN
- [ ] Firmware router/tường lửa đã cập nhật, quản trị phía WAN đã tắt, mật khẩu mặc định đã đổi
- [ ] Đã kiểm chứng khả năng kết nối cổng từ **mạng ngoài** (không phải mạng nội bộ)
- [ ] Nếu dùng IPv6: đã xác nhận prefix có đổi không, và có cách cập nhật quy tắc
- [ ] Cấu hình đã xuất sao lưu (cả router và tường lửa)
- [ ] Phía máy chủ cũng có tường lửa máy, và **hai chỗ mở nhất quán**

## Bước tiếp theo

- Kiến thức lớp vật lý về rack, nguồn điện và quản trị ngoài băng: xem [Máy chủ dạng rack, switch, tường lửa phần cứng và UPS](/tutorials/ops/hardware-rack)
- Lộ trình đầy đủ để người khác kết nối được máy chủ: xem [Triển khai đến môi trường truy cập được](/tutorials/java/deploy)
- Cấu hình an ninh của chính máy chủ: xem [Plugin an ninh](/tutorials/ops/security-java)
- Đáy an toàn của dữ liệu: xem [Sao lưu và khôi phục](/tutorials/java/backup)

---

> Tên menu giao diện đồ họa, giá trị mặc định, tên dịch vụ và chính sách chặn cổng trong bài đều thay đổi theo firmware/bản phân phối/nhà mạng, **hãy lấy tài liệu chính thức của phiên bản tương ứng làm chuẩn**; ví dụ dòng lệnh dựa trên UCI của OpenWrt và định dạng cấu hình WireGuard chuẩn, thao tác tương đương trên hệ khác hãy đối chiếu tài liệu của hệ đó.
