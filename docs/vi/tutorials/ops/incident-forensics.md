---
title: Điều tra chứng cứ tấn công và ứng phó sự cố
slug: incident-forensics
cat: ops
level: 3
order: 12
minutes: 18
tags: [incident-response, forensics, packet-capture, tcpdump, evidence, ddos, attribution]
updated: 2026-10-04
draft: false
---

Khoảnh khắc bị tấn công, trên máy đồng thời tồn tại hai loại thứ: **chứng cứ có thể ghi lại được**, và **trạng thái sẽ biến mất vĩnh viễn sau vài phút**. Bài này nói về loại thứ hai —— trước khi khởi động lại, cài lại, chặn bất cứ thứ gì, hãy cố định hiện trường trước. Nội dung phòng ngừa xem [Cơ bản an toàn mạng](/tutorials/ops/network-security) và [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense).

:::warn Bài này không thay thế ý kiến pháp lý
Lệnh điều tra chứng cứ, yêu cầu lưu giữ nhật ký và quy tắc xử lý dữ liệu cá nhân **khác nhau theo hệ điều hành, bản phân phối, nhà cung cấp và khu vực tài phán**; chỗ nào thay đổi theo môi trường, bài này đều ghi rõ. Khi liên quan đến dữ liệu cá nhân của người chơi hoặc có thể đi vào trình tự pháp lý, **hãy tham vấn chuyên gia và tuân thủ luật địa phương cùng chính sách phòng máy**.
:::

## 1. Vì sao "điều tra chứng cứ trước" là nguyên tắc sắt đầu tiên

### 1.1 Chứng cứ sẽ biến mất

Việc đầu tiên phần lớn người làm khi bị tấn công là **khởi động lại** hoặc **cài lại**. Đây là lựa chọn tệ nhất: **khởi động lại sẽ phá hủy gần như toàn bộ chứng cứ tầng mạng**.

| Chứng cứ | Vị trí | Cách biến mất | Thời gian tồn tại ước chừng |
| --- | --- | --- | --- |
| Tiến trình, socket đang mở | Bộ nhớ | Tiến trình kết thúc, khởi động lại | Bậc giây đến bậc phút |
| Kết nối hiện tại (established) | Bảng socket của nhân | Kết nối đóng | Bậc giây |
| Bảng theo dõi kết nối conntrack | Bộ nhớ nhân | Phần tử hết thời gian (tùy cấu hình) | Bậc giây đến bậc giờ |
| Bảng ARP / bảng láng giềng | Bộ nhớ nhân | Phần tử hết hạn | Bậc phút |
| Số đếm nhận gửi và mất gói của card mạng | Bộ đếm nhân | **Về 0 sau khi khởi động lại hoặc reset card mạng** | Mất khi khởi động lại |
| Số lần khớp của quy tắc tường lửa | netfilter của nhân | **Về 0 khi khởi động lại; `iptables -Z` cũng về 0** | Mất khi khởi động lại |
| Tệp bắt gói (pcap) | Đĩa | Chỉ mất khi bị xóa hoặc đĩa đầy ghi đè | Bền |
| Nhật ký hệ thống / nhật ký dịch vụ | Đĩa | Bị nén, xóa sau khi luân chuyển | Bậc ngày đến bậc tuần |
| Nhật ký ứng dụng (`logs/latest.log`) | Đĩa | Bị luân chuyển, bị nhật ký mới ghi đè | Bậc ngày |
| Cấu hình, script, tác vụ định giờ | Đĩa | Bị "tiện tay sửa cho xong" mà ghi đè | Bền nhưng dễ bị thay đổi |
| Báo cáo sự cố `crash-reports/` | Đĩa | Thường không tự xóa | Bền |
| Biểu đồ lưu lượng / báo cáo tấn công của nhà cung cấp | Phía nhà cung cấp | Bị dọn theo thời hạn lưu của nhà cung cấp | Bậc ngày đến bậc tháng |

**Phân biệt then chốt**: **chứng cứ dễ mất (volatile)** nằm trong bộ nhớ, khởi động lại là mất; **chứng cứ bền (persistent)** nằm trên đĩa, nhưng sẽ mất do luân chuyển, ghi đè, sửa nhầm. Thứ tự luôn là **cố định cái dễ mất trước, thu thập cái bền sau**.

### 1.2 Một lần khởi động lại phá hủy những gì

Một lần khởi động lại đồng thời phá hủy: toàn bộ kết nối TCP hiện tại và phân bố IP nguồn (phán đoán là một điểm hay phân tán chủ yếu dựa vào nó), bảng conntrack (ai nói chuyện với ai, gói bị quy tắc nào xử lý), giá trị tích lũy lịch sử của bộ đếm card mạng và số gói mất, **số lần khớp của quy tắc tường lửa** (bằng chứng cứng duy nhất cho "quy tắc của tôi rốt cuộc đã chặn được bao nhiêu"), tiến trình khả nghi trong bộ nhớ (nếu tấn công đã vào được máy chủ, khởi động lại tức là giúp đối phương dọn hiện trường), và bộ đệm nhật ký chưa ghi xuống đĩa.

:::warn "Không khởi động lại" không bằng "không xử lý"
Bạn có thể vừa giữ hiện trường vừa giảm nhẹ: thêm quy tắc tường lửa, giới hạn tốc độ, chuyển lưu lượng sang chống DDoS cao cấp, chặn tạm. **Nhưng mọi thay đổi đều phải ghi lại** (xem mục 3), vì bản thân việc sửa đổi sẽ làm thay đổi chứng cứ.
:::

### 1.3 Thứ tự đúng

```text
1. Đừng khởi động lại, đừng cài lại, đừng tắt máy (trừ khi đã xác nhận máy bị kiểm soát hoàn toàn)
2. Bắt gói trước (tcpdump) —— chứng cứ mạng dễ mất nhất
3. Ghi trạng thái nhân (ss, conntrack, ip -s link, bộ đếm tường lửa)
4. Ghi trạng thái tiến trình và dịch vụ (ps, systemctl, journalctl)
5. Copy nhật ký và cấu hình (thao tác trên bản sao, không động vào bản gốc)
6. Tính hash, viết nhật ký sự kiện, ghi dòng thời gian (thống nhất múi giờ)
7. Sau đó mới bắt đầu giảm nhẹ và gia cố
```

## 2. Cần ghi những gì (kèm lệnh đúng)

:::warn Tên giao diện và đường dẫn khác nhau theo hệ thống
Dưới đây dùng `eth0` làm tên card mạng ví dụ. **Thực tế có thể là `ens3`, `enp1s0`, `eno1`, `bond0`, v.v.**; hãy dùng `ip -br link` hoặc `ip addr` để xác nhận. Tương tự, thư mục nhật ký, tên dịch vụ, công cụ tường lửa đều khác nhau giữa các bản phân phối.
:::

```bash
ip -br link
# ví dụ đầu ra (của bạn sẽ khác):
# lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
# eth0             UP             aa:bb:cc:dd:ee:ff <BROADCAST,MULTICAST,UP,LOWER_UP>
```

### 2.1 Bắt gói: tcpdump

```bash
# Bản Java (TCP 25565)
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'port 25565'

# Bản Bedrock / Geyser (UDP 19132)
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'udp port 19132'
```

| Tham số | Ý nghĩa | Vì sao bắt buộc như vậy |
| --- | --- | --- |
| `-i eth0` | Chỉ định card mạng | **Đổi thành tên giao diện thực tế của bạn**; không chỉ định thì tcpdump tự chọn, có thể chọn sai |
| `-nn` | Không phân giải tên (IP và cổng giữ dạng số) | DNS ngược sẽ **làm chậm việc bắt gói và gây mất gói**; nghiêm trọng hơn là lưu lượng tấn công sẽ dụ bạn **phát ra lượng lớn truy vấn DNS, tức là báo cho đối phương "tôi đang bị tấn công"** |
| `-s 0` | Bắt gói đầy đủ, không cắt | Mặc định chỉ bắt vài byte đầu, **payload bị cắt thì không phân tích được nội dung giao thức**; `0` nghĩa là độ dài đầy đủ |
| `-w FILE` | Ghi ra tệp pcap | Xem giải thích bên dưới |
| `'port 25565'` | Biểu thức lọc BPF | Nháy đơn để shell không diễn giải; `port` khớp cả TCP và UDP |

**Vì sao bắt buộc ghi ra tệp mà không in ra terminal**: trong lúc tấn công, tốc độ gói có thể tới hàng trăm nghìn gói mỗi giây, in kết quả phân tích ra terminal sẽ khiến **chính tcpdump thành nút thắt và mất gói hàng loạt**, đồng thời làm ngập màn hình khiến terminal mất ý nghĩa; `-w` ghi thẳng nhị phân, chi phí nhỏ hơn nhiều. **Đừng quên đĩa**: `-s 0` cộng lưu lượng tốc độ cao có thể ghi ra vài chục GB trong vài phút, hãy xem dung lượng còn trống trước, và dùng `-c` giới hạn số gói, hoặc dùng `-C` luân chuyển theo kích thước, `-W` giới hạn số tệp:

```bash
# Chỉ bắt 200000 gói rồi dừng
sudo tcpdump -i eth0 -nn -s 0 -c 200000 -w /var/log/incident-cap.pcap 'port 25565'

# Mỗi tệp 100 MB, tối đa 20 tệp (tổng khoảng 2 GB), tự luân chuyển
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap -C 100 -W 20 'port 25565'

df -h /var/log    # xem dung lượng còn trống trước
```

:::tip Không bắt được gói thì sao
**Quyền**: bắt gói cần `CAP_NET_RAW`, dùng `sudo` (`setcap` sẽ mở rộng bề mặt rủi ro, không khuyến nghị). **Chọn sai giao diện**: card mạng trong container khác với máy vật lý (thường là `docker0`, `veth*`, `br-*`), `eth0` trên máy vật lý chưa chắc thấy toàn bộ lưu lượng. **Lưu lượng đã bị làm sạch ở nhánh khác**: sau khi nhà cung cấp làm sạch, có thể chỉ còn lưu lượng bình thường đến card mạng của bạn —— đây chính là lý do phải yêu cầu nhà cung cấp cung cấp dữ liệu lưu lượng (xem 2.6). **Nhóm bảo mật của nền tảng cloud**: lưu lượng trên một số nền tảng đã bị bỏ trước khi đến instance, máy này không bắt được.
:::

Bắt xong hãy thống kê thô trước (đừng dùng `tcpdump -r` làm ngập màn hình từng gói); phân tích giao thức chi tiết hơn nên làm **ngoại tuyến** trên máy khác bằng Wireshark / `tshark`, **đừng vừa bắt vừa phân tích trên máy sản xuất**.

```bash
# Chỉ đếm số gói
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q | wc -l

# 20 IP nguồn xuất hiện nhiều nhất
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q 2>/dev/null \
  | awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -20
```

### 2.2 Trạng thái và bộ đếm tường lửa

```bash
sudo iptables -L -v -n
sudo iptables -t nat -L -v -n

sudo nft list ruleset
sudo nft list counters
```

- `-L` liệt kê quy tắc, `-v` hiển thị **số gói và số byte của từng quy tắc**, `-n` không phân giải tên (lý do như `-nn`); `-t nat` là bảng NAT (DNAT/SNAT/chuyển tiếp cổng), khi truy "lưu lượng bị chuyển đi đâu" bắt buộc phải xem nó.
- **Ý nghĩa của bộ đếm**: bộ đếm trên quy tắc `DROP`/`REJECT` **trực tiếp chứng minh quy tắc đã chặn được bao nhiêu lưu lượng**, là con số mạnh nhất khi nhìn lại và giải thích với nhà cung cấp. **Khởi động lại hoặc `iptables -Z` sẽ về 0**, phải ghi sớm trong quá trình xử lý.
- `nft list ruleset` xuất toàn bộ bộ quy tắc (gồm tập và bộ đếm); `nft list counters` chỉ liệt kê đối tượng counter có tên. **Chỉ quy tắc có định nghĩa rõ đối tượng counter mới có bộ đếm riêng**, bộ đếm nội tuyến của quy tắc thường xuất hiện dưới dạng `counter packets N bytes M` trong `list ruleset`. **Lệnh con và định dạng đầu ra của nft thay đổi theo phiên bản, lấy `man nft` và tài liệu bản phân phối làm chuẩn.**

```bash
sudo iptables -L -v -n        > /root/incident/fw-iptables.txt 2>&1
sudo iptables -t nat -L -v -n > /root/incident/fw-iptables-nat.txt 2>&1
sudo nft list ruleset         > /root/incident/fw-nft.txt 2>&1
```

### 2.3 Bảng kết nối

```bash
# Kết nối Java đã lập
ss -tan state established '( sport = :25565 )'

# Socket UDP (bản Bedrock không có khái niệm "kết nối", xem lắng nghe và hàng đợi nhận gửi)
ss -uan

# Tóm tắt tổng số socket (số đếm theo từng trạng thái, phán đoán có nhiều kết nối nửa mở không)
ss -s

# Gồm cả SYN-RECV, thấy được dấu vết của lũ kết nối
ss -tan '( dport = :25565 or sport = :25565 )'

# Thống kê số kết nối theo IP nguồn, tìm nguồn "tập trung một điểm"
ss -tan state established '( sport = :25565 )' | awk 'NR>1 {print $5}' \
  | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

Trong `ss -tan`, `t`=TCP, `a`=mọi trạng thái, `n`=dạng số (cũng để tránh phân giải DNS).

**conntrack** (cần `conntrack-tools` và nhân bật `nf_conntrack`):

```bash
sudo conntrack -L    # xuất toàn bộ kết nối đang được theo dõi
sudo conntrack -S    # số lỗi theo từng CPU
sudo conntrack -C    # số phần tử hiện tại (xem nó trước, rồi mới quyết định có -L không)
```

- `conntrack -L` **có thể rất chậm thậm chí treo khi số kết nối lớn**, nên trước hết dùng `conntrack -C` đánh giá quy mô.
- `conntrack -S` xuất `insert_failed`, `drop`, `early_drop`, `error`, v.v. **`insert_failed` hoặc `early_drop` tăng nghĩa là bảng theo dõi kết nối đã đầy**, lúc đó kết nối mới sẽ bị bỏ —— **bản thân điều này là một dạng từ chối dịch vụ có thể bị lợi dụng**, cũng là manh mối then chốt của "băng thông chưa đầy mà người chơi không kết nối được".

```bash
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

:::warn conntrack có thể hoàn toàn không tồn tại
Những trường hợp sau không thấy conntrack: **nhân chưa nạp module `nf_conntrack`**, **thuần nftables và chưa bật theo dõi kết nối**, **chưa cài `conntrack-tools`**, **namespace của container không thấy bảng của máy vật lý**, **một số nhân tùy chỉnh của nền tảng cloud đã lược bỏ tính năng này**. **Không phải bạn thao tác sai**, hãy đổi sang dùng `ss`, `ip -s link` và bộ đếm tường lửa. Ngược lại, một số máy nhiều bộ nhớ mặc định có `nf_conntrack_max` rất cao, **thời gian hết hạn phần tử cũng khác nhau theo bản phân phối và cấu hình, đừng bê nguyên con số ở nơi khác**.
:::

### 2.4 Bộ đếm và tốc độ card mạng

```bash
ip -s link show eth0
cat /proc/net/dev
```

Đoạn `RX`/`TX` của `ip -s link` đưa ra **bytes / packets / errors / dropped / overrun / mcast**. Trong đó **`dropped` và `overrun` là then chốt**: chúng cho thấy **lưu lượng đã vượt năng lực xử lý của card mạng hoặc nhân**, dù băng thông chưa đầy thì đã mất gói. `cat /proc/net/dev` đưa ra cùng bộ đếm cho mọi giao diện, phù hợp để chụp tổng thể (**giá trị tích lũy, khởi động lại về 0, chỉ hiệu số giữa hai lần lấy mẫu mới có ý nghĩa**).

```bash
# Khi đã cài sysstat, lấy mẫu liên tục để xem tốc độ (1 giây một lần, tổng 5 lần)
sar -n DEV 1 5
```

:::note Hai tiền đề của sar
1. **`sysstat` phải đã được cài** (Debian/Ubuntu: `sudo apt install sysstat`; dòng RHEL: `sudo dnf install sysstat`).
2. **Phải đã bật thu thập dữ liệu lịch sử** (thường do timer systemd hoặc cron của sysstat thu). **Khi chưa từng bật, `sar` chỉ thu được từ lúc này trở đi, không thấy tốc độ lịch sử lúc bị tấn công** —— đây chính là lý do bình thường đã phải bật giám sát. `sar -n DEV 1 5` có tham số khoảng thời gian thuộc **thu thập thời gian thực**, không bị ảnh hưởng bởi việc dữ liệu lịch sử có được bật hay không.
:::

`iftop` và `nload` là **công cụ quan sát thời gian thực tùy chọn**:

```bash
sudo iftop -i eth0    # hiển thị băng thông thời gian thực theo cặp kết nối
sudo nload eth0       # đường cong lưu lượng vào ra đơn giản
```

:::warn Công cụ thời gian thực không đựng được chứng cứ
`iftop` / `nload` là **đồng hồ đo thời gian thực trong terminal**, tắt đi là hết, **không dùng làm tài liệu chứng cứ được**. Khi ứng phó dùng chúng để nhanh chóng phán đoán hướng thì không sao, nhưng **bắt buộc phải đồng thời ghi xuống đĩa bằng tcpdump**. Loại công cụ này bản thân cũng mất gói ở tốc độ gói cao, **đừng lấy số của nó làm thống kê chính xác**. Tên gói cài khác nhau theo bản phân phối, một số bản phân phối cần bật thêm kho như EPEL trước.
:::

### 2.5 Chứng cứ tiến trình và dịch vụ

```bash
ps auxf
systemctl status <service>
journalctl -u <service> --since "1 hour ago"
```

- `ps auxf`: liệt kê mọi tiến trình theo **cây tiến trình**, xem có thứ không nên có không —— thợ đào coin bất thường, tệp thực thi chạy từ `/tmp`, tiến trình giả làm `java` nhưng trỏ tới đường dẫn kỳ lạ. **Trên máy đã bị chiếm, bản thân `ps` có thể đã bị thay hoặc bị chiếm quyền điều khiển, kết luận quan trọng phải kiểm chứng chéo bằng nhiều cách.**
- `systemctl status <service>`: trạng thái dịch vụ và vài dòng nhật ký gần nhất. Tên dịch vụ tùy cách triển khai, ví dụ `minecraft`, `mcserver`, `paper`, **không cố định**.
- `journalctl -u <service> --since "1 hour ago"`: nhật ký systemd, hỗ trợ `--since`/`--until`, có thể viết `"1 hour ago"`, `"2026-10-04 12:00:00"`, `"today"`. **Mặc định hiển thị theo múi giờ địa phương, thêm `--utc` để ép UTC**, khi điều tra chứng cứ rất khuyến nghị thống nhất dùng `--utc`. Khi nhật ký đã luân chuyển, dùng `journalctl -u <service> --since ... --no-pager > FILE` để xuất, hoặc dùng `journalctl --file` đọc tệp lưu trữ.

Phía Minecraft:

| Đường dẫn | Nội dung | Lưu ý |
| --- | --- | --- |
| `logs/latest.log` | Nhật ký hiện tại | **Bị ghi đè khi máy chủ khởi động lại**, trước khi khởi động lại bắt buộc phải copy đi |
| `logs/YYYY-MM-DD-N.log.gz` | Nhật ký lịch sử (luân chuyển theo ngày/số thứ tự) | Đã nén, vẫn là chứng cứ có hiệu lực |
| `crash-reports/` | Báo cáo sự cố | Thường không tự dọn, gồm stack và thông tin JVM |
| `plugins/*/` | Nhật ký và cơ sở dữ liệu của từng plugin | **Định dạng khác nhau theo plugin**, thường có bản ghi đăng nhập, kiểm toán lệnh, bản ghi cấm |
| `banned-ips.json` / `banned-players.json` | Danh sách cấm | Ghi lại bạn đã xử lý những gì, là một phần của dòng thời gian |
| `usercache.json` / `ops.json` | Ánh xạ người chơi và quản trị viên | Nối UUID với tên |

```bash
# Copy chứ không di chuyển, tuyệt đối không động vào bản gốc
sudo cp -a /srv/minecraft/logs /root/incident/mc-logs
sudo cp -a /srv/minecraft/crash-reports /root/incident/mc-crash-reports
```

`cp -a` giữ dấu thời gian và quyền, **điều này rất quan trọng với điều tra chứng cứ** —— `cp -r` sẽ đổi thời gian sửa thành thời gian hiện tại, phá hỏng dòng thời gian. **Nhật ký tầng ứng dụng thường hữu ích hơn tầng mạng**: tầng mạng chỉ nói được "có 4 vạn kết nối", tầng ứng dụng nói được "một tài khoản nào đó thử đăng nhập 900 lần trong 3 phút"; plugin nhóm quyền, đăng nhập, kinh tế, chống gian lận thường đều để lại bản ghi, **chúng là nguồn chính để định vị "ai, đã làm gì"**, vị trí và định dạng cụ thể xin xem tài liệu từng plugin.

### 2.6 Chứng cứ phía cloud / phòng máy

**Lưu lượng bạn thấy không bằng toàn bộ lưu lượng.** Nhà cung cấp ở phía trên hơn, thấy được lưu lượng vào của instance bạn **trước khi bị bỏ** (lưu lượng bị nhóm bảo mật/ACL mạng bỏ thì trên máy bạn hoàn toàn không thấy), **tổng băng thông và tốc độ gói của cuộc tấn công** (pps/Mbps) cùng việc có kích hoạt làm sạch không, phán đoán loại tấn công và phân bố nguồn, và năng lực nhật ký luồng (flow logs) phía nền tảng —— **có cung cấp hay không, có tính phí hay không, lưu bao lâu khác nhau rất nhiều giữa các nhà, lấy tài liệu nhà cung cấp làm chuẩn**.

**Việc cần làm: mở ticket ngay**, nói rõ bạn đang bị tấn công, yêu cầu cung cấp chi tiết lưu lượng và báo cáo tấn công, và hỏi xem có cần chuyển sang IP chống DDoS cao cấp hoặc bật làm sạch không. **Đừng chỉ viết "tôi bị đánh"**, nội dung cụ thể xem mục 5.

## 3. Bảo toàn chứng cứ đúng cách

### 3.1 Tính hash cho mọi chứng cứ

```bash
cd /root/incident
sha256sum incident-*.pcap > incident.sha256
```

**Tác dụng của hash là chứng minh "sau khi tôi thu thập, không ai sửa nó"**:

- **Tệp hash phải lưu tách khỏi tệp được hash** (thư mục khác, đĩa khác, tốt nhất lưu thêm một bản ở nơi khác). Đặt cùng thư mục thì người sửa được tệp cũng sửa được hash, giá trị chứng minh về 0.
- **Kiểm chứng**: `sha256sum -c incident.sha256`. **Tệp hash ghi đường dẫn tương đối hoặc tuyệt đối, đổi vị trí thì kiểm chứng sẽ thất bại** —— không phải tệp hỏng, mà là đường dẫn đã đổi.
- **Làm cho mọi chứng cứ**, không chỉ pcap:

```bash
find /root/incident -type f -print0 | sort -z | xargs -0 sha256sum > /root/incident.sha256
```

`find -print0` cộng `xargs -0` dùng để xử lý đúng tên tệp có dấu cách; `sort -z` bảo đảm thứ tự ổn định, tiện đối chiếu. **Tệp hash ghi ra ngoài thư mục chứng cứ**, và copy thêm một bản ra phương tiện ngoại tuyến.

### 3.2 Tuyệt đối không động vào bản gốc

- **Chỉ phân tích trên bản sao**. `tcpdump -r` là chỉ đọc, an toàn; mọi "sửa", "chuyển đổi", "gộp" đều nên làm trên bản sao.
- Khi điều tra chứng cứ cả ổ đĩa, cách làm chuẩn là `dd` ra image và tính hash cho image ngay:

```bash
# Lưu ý: dung lượng đích phải lớn hơn thiết bị nguồn; thao tác này sẽ ghi đè hoàn toàn thiết bị đích
sudo dd if=/dev/sda of=/mnt/evidence/sda.img bs=4M conv=noerror,sync status=progress
sha256sum /mnt/evidence/sda.img > /mnt/evidence/sda.img.sha256
```

:::warn Tính phá hoại của dd
`of=` của `dd` trỏ tới thiết bị nào là **ghi đè vô điều kiện** thiết bị đó. **Trước khi chạy nhất định phải dùng `lsblk` xác nhận tên thiết bị nguồn và đích, viết sai một chữ là hỏng dữ liệu.** Không chắc thì đừng chạy.
:::

### 3.3 Dòng thời gian: bắt buộc ghi rõ múi giờ

**Đây là lỗi phổ biến nhất và cũng nghiêm trọng nhất**: trộn giờ địa phương của `journalctl`, giờ UTC của nhà cung cấp, giờ trong nhật ký plugin vào cùng một bảng, thứ tự sự kiện rối loạn hoàn toàn, thậm chí đi đến kết luận ngược lại.

1. **Thống nhất ghi theo UTC**, và ghi rõ trong tài liệu "các thời gian dưới đây đều là UTC".
2. Đồng thời **ghi múi giờ máy và độ lệch UTC**, tiện đối chiếu với nhật ký địa phương.
3. Dùng định dạng ISO 8601, tránh cách viết mơ hồ như `10/04/2026`.

```bash
date -u +%FT%TZ      # ví dụ: 2026-10-04T09:32:21Z
date +%FT%T%:z       # ví dụ: 2026-10-04T17:32:21+08:00
timedatectl          # xem múi giờ hệ thống và trạng thái đồng bộ NTP
```

`date -u +%FT%TZ` xuất giờ UTC có hậu tố `Z`, **`Z` nghĩa là UTC, không phải viết tắt múi giờ** (đừng viết `CST`, nó ít nhất tương ứng ba múi giờ khác nhau).

:::warn Bản thân đồng hồ có thể đã sai
Khi đồng hồ máy không đúng hoặc NTP chưa đồng bộ, **mọi dấu thời gian trong nhật ký đều không đáng tin**. Dùng `timedatectl` kiểm tra `System clock synchronized` có phải `yes` không, và ghi lại độ lệch hiện tại. **Phát hiện trôi giờ phải ghi chú trong nhật ký sự kiện**, nếu không khi đối chiếu giữa các thiết bị sẽ đi đến kết luận sai.
:::

### 3.4 Viết nhật ký sự kiện (vừa xử lý vừa ghi)

| Mục ghi | Mô tả |
| --- | --- |
| Thời điểm phát hiện | Ai, phát hiện bằng cách nào (phản hồi người chơi, cảnh báo giám sát, tự thấy) |
| Hiện tượng | Biểu hiện cụ thể: lag, mất kết nối, không kết nối được, băng thông đầy |
| Thời gian từng hành động | **Kèm múi giờ**, ghi rõ "tôi đã làm gì" |
| Thay đổi bạn đã làm | Quy tắc tường lửa thêm vào, giới hạn tốc độ, IP bị chặn, phân giải đã đổi |
| Tên tệp chứng cứ | Mỗi tệp là gì, bắt lúc nào |
| Đã liên hệ ai | Số ticket nhà cung cấp, thời gian, điểm chính trong trả lời |
| Trạng thái hiện tại | Cuộc tấn công còn đang diễn ra không |

:::warn Bản thân biện pháp giảm nhẹ sẽ thay đổi chứng cứ
Mỗi quy tắc tường lửa bạn thêm để cắt lỗ đều **thay đổi đặc điểm lưu lượng bắt được sau đó** (gói lẽ ra đến nay bị bỏ, không bắt được nữa). Điều này không tránh được, nhưng **bắt buộc phải ghi lại**: ghi **thời điểm thêm quy tắc** (phân tích sau lấy đó làm mốc), cố gắng **bắt một lượt gói trước rồi mới đổi quy tắc** (dù chỉ bắt 30 giây), ghi **toàn bộ nội dung** quy tắc chứ không phải "tôi thêm một quy tắc giới hạn tốc độ". Nếu không, sau này không giải thích được "vì sao sau 14:05 lưu lượng tấn công đột nhiên biến mất".
:::

### 3.5 Quyền tệp và bảo vệ dữ liệu

```bash
chmod 700 /root/incident
chmod 600 /root/incident/*
chmod 600 /root/incident.sha256
```

- Chứng cứ chứa **IP người chơi, tên tài khoản, nội dung chat, thông tin đăng nhập có thể có**, **mặc định phải coi là dữ liệu nhạy cảm**. Thư mục `700` (chỉ chủ sở hữu vào được), tệp `600` (chỉ chủ sở hữu đọc ghi).
- **Đừng** vì "tiện xem" mà đặt chứng cứ vào thư mục Web hoặc `chmod 777`.
- **Truyền** bằng `scp` / `rsync -e ssh` (đi qua SSH mã hóa), đừng dùng FTP không mã hóa hay đính kèm email.
- **Bảo vệ dữ liệu**: khi liên quan dữ liệu cá nhân của người chơi **hãy chú ý quy định áp dụng** (như GDPR của EU, luật bảo vệ dữ liệu cá nhân các nơi) —— nhiều khu vực coi địa chỉ IP là dữ liệu cá nhân. Nguyên tắc là **chỉ thu thập phạm vi cần thiết, giới hạn mục đích (điều tra sự cố an ninh), hạn chế truy cập, xóa khi hết hạn**. **Nghĩa vụ cụ thể khác nhau theo quốc gia/khu vực, lấy luật địa phương và chính sách riêng tư của bạn làm chuẩn.**
- **Đừng** đăng chứng cứ (nhất là pcap chứa chat và IP người chơi) công khai lên diễn đàn hay nhóm chat để "nhờ xác định".

## 4. Quy nguyên nhân: tra được gì, không tra được gì

**Coi một bên thứ ba vô can là kẻ tấn công sẽ gây tổn thương thật, và cũng khiến khiếu nại của chính bạn mất độ tin cậy.**

### 4.1 Lưu lượng UDP giả mạo IP nguồn: cơ bản không thể quy nguyên nhân

UDP là giao thức **không kết nối**, **trường IP nguồn có thể giả mạo tùy ý**, và gói giả mạo không cần nhận bất kỳ phản hồi nào vẫn gửi đi được. Vì vậy:

- **IP nguồn trong lũ UDP (gồm tuyệt đại đa số UDP phản xạ khuếch đại) là giả mạo, thường hoàn toàn không thể quy nguyên nhân.**
- **Đừng** vì một IP xuất hiện nhiều nhất trong lũ UDP mà đi khiếu nại nó, chặn nó hoặc chỉ trích nó công khai —— **IP đó rất có thể là nạn nhân bị mạo danh**.
- Chặn một IP đơn lẻ với lưu lượng giả mạo **không có ý nghĩa** (đổi giá trị giả mạo là xong), cách đúng là **làm sạch lưu lượng phía trên, giới hạn tốc độ, lọc theo đặc điểm giao thức**.

Số ít manh mối còn tồn tại: nếu nhận diện được cuộc tấn công dùng một dịch vụ cụ thể (DNS, NTP, memcached, CLDAP, v.v.), **máy chủ đó là "máy chủ mở bị lợi dụng"**, không phải kẻ tấn công; IP nguồn và cổng nguồn nếu có quy luật ổn định thì vẫn có giá trị điều tra, nhưng **kết luận phải thận trọng**; thiết bị trung gian trên đường lưu lượng (phía nhà cung cấp) thấy được nhiều thông tin hơn.

### 4.2 Tấn công TCP: IP nguồn thường là thật, nhưng vẫn không bằng "kẻ tấn công"

TCP cần **bắt tay ba bước**, hoàn tất bắt tay tức là phải nhận được gói trả về, nên **tấn công TCP nhắm vào Minecraft** —— bot vào máy chủ hàng loạt (bot join), lũ kết nối, lũ truy vấn trạng thái (status ping) —— **IP nguồn nói chung là thật**, có thể điều tra. **Nhưng "IP thật" không bằng "bản thân kẻ tấn công"**: nó có thể là **máy chủ bên thứ ba bị xâm nhập** (VPS bị cài cửa hậu, router gia đình bị chiếm), **proxy / VPN / cửa ra của dịch vụ proxy**, **nút ra Tor**, hoặc **một người dùng sau NAT chia sẻ**. Cách nói đúng là: **"IP đó đã tham gia lưu lượng tấn công", chứ không phải "chủ sở hữu IP đó là kẻ tấn công".** Khác biệt này rất quan trọng khi khiếu nại.

### 4.3 Phản xạ / khuếch đại: nguồn là bên thứ ba vô can

Tấn công phản xạ khuếch đại có **hai nạn nhân**: bạn, và **những máy chủ mở bị lợi dụng**. Chúng bị lợi dụng vì quản trị viên **đã mở nhầm các dịch vụ UDP như DNS, NTP, memcached ra Internet**.

- **Đừng báo cáo nguồn phản xạ là kẻ tấn công**, mà nên báo cáo **"một dịch vụ trên IP nào đó là nguồn phản xạ mở, đang bị lạm dụng"**;
- Gửi thông báo tới `abuse@` của các IP đó **có ích** (quản trị viên sửa xong thì bề mặt phản xạ biến mất), nhưng **giọng điệu nên là "dịch vụ của bạn bị lạm dụng", không phải "bạn đang tấn công tôi"**;
- Căn cứ phán đoán: **gói phản hồi lớn hơn nhiều so với gói yêu cầu** (bội số khuếch đại), và **nguồn là cổng dịch vụ UDP ai cũng biết**.

### 4.4 Phân biệt "tập trung một điểm" và "phân tán"

| Đặc điểm quan sát được | Tính chất nhiều khả năng | Làm được gì |
| --- | --- | --- |
| **Một hoặc vài IP chiếm tuyệt đại đa số kết nối** | Tấn công một điểm, máy bị xâm nhập, quét thử nghiệm | Đáng điều tra IP đó; có thể chặn tạm để cắt lỗ |
| **Hàng nghìn hàng vạn IP, mỗi cái chỉ gửi lượng nhỏ** | Mạng bot phân tán hoặc nguồn giả mạo | Chặn IP vô hiệu; nhờ làm sạch phía trên và giới hạn tốc độ |
| **Bắt tay TCP hoàn tất, số kết nối tăng ổn định** | Nguồn thật (loại bot vào máy chủ) | Điều tra IP + bảo vệ phía trên + giới hạn tốc độ vào máy chủ |
| **Nhiều SYN nhưng không có bắt tay tiếp theo** | SYN flood (nguồn có thể giả mạo) | Bật SYN cookies, làm sạch phía trên |
| **Gói UDP lớn tràn vào, cổng nguồn cố định** | Phản xạ khuếch đại | Lọc theo giao thức/cổng, làm sạch phía trên, **đừng khiếu nại IP nguồn** |
| **Lưu lượng không lớn mà dịch vụ cực chậm** | Có thể là tấn công tầng ứng dụng hoặc cạn tài nguyên | Xem nhật ký ứng dụng, bảng theo dõi kết nối và tài nguyên máy |

**Phán đoán cốt lõi**: **ít IP tập trung = đáng theo; vô số IP phân tán = không theo được hoặc theo không hết, phải chuyển sang phòng thủ.**

### 4.5 Sau khi tra được IP thì làm gì

```bash
whois 203.0.113.10
```

Đầu ra `whois` thường gồm **quyền sở hữu dải mạng (netname/descr), tổ chức sở hữu, quốc gia, và email liên hệ `abuse`**. Lưu ý:

- **Client `whois` không chắc đã cài sẵn** (Debian/Ubuntu: `sudo apt install whois`; dòng RHEL: `sudo dnf install whois`);
- **Định dạng đầu ra của các RIR (tổ chức đăng ký Internet khu vực) khác nhau**, tên trường như `abuse-c`, `OrgAbuseEmail`, `abuse-mailbox` mỗi nơi một khác, **phải đọc bằng người, đừng viết script khớp cứng**;
- Khuyến nghị hơn là **RDAP** (Registration Data Access Protocol), nó là **bản thay thế HTTP hiện đại** của WHOIS, trả về JSON có cấu trúc, hỗ trợ truy vấn tự động. IANA cung cấp dịch vụ dẫn đường (`https://rdap.org/ip/<IP>` sẽ chuyển hướng tới RIR tương ứng), **URL và trường cụ thể của từng RIR lấy tài liệu của RIR đó làm chuẩn**.

**Quyền sở hữu ASN**: xác định IP đó thuộc hệ tự trị (AS) nào và nhà mạng/phòng máy nào, giúp phán đoán nó là "VPS trên một cloud nào đó" hay "băng thông rộng gia đình ở một nước". Cách tra có dịch vụ RDAP của từng RIR, `whois -h whois.radb.net`, v.v., **công cụ và nguồn dữ liệu nhiều và độ phủ khác nhau**, kết luận đừng chỉ dựa vào một nguồn.

**Cách liên hệ abuse**: **email `abuse@`** trong WHOIS/RDAP (hoặc biểu mẫu abuse) là **cửa vào khiếu nại đúng**: **phải gửi cho bộ phận abuse của phòng máy / nhà cung cấp dịch vụ lưu trữ (hosting provider) mà IP đó thuộc về, chứ không phải ISP băng thông rộng của một người chơi ngẫu nhiên** —— phòng máy có năng lực xử lý thật với máy trong dải mạng của mình (có thể tạm dừng dịch vụ), còn ISP với một router gia đình bị xâm nhập thường hành động rất chậm. **Kèm chứng cứ**: cửa sổ thời gian có múi giờ, giao thức và cổng, danh sách IP nguồn, số gói và tốc độ, giá trị hash pcap; **khiếu nại không có chứng cứ thường bị bỏ qua**. Khi liên quan nhiều dải mạng thì **khiếu nại riêng từng nơi**, đừng nêu tên công khai trong nhóm chat.

### 4.6 Pháp lý và ranh giới

- **Quy định khác nhau theo quốc gia/khu vực**: thế nào là phạm tội, phải giữ nhật ký nào, có được tự thu thập dữ liệu không, mỗi nước một khác. **Bài này không cấu thành ý kiến pháp lý.**
- **Thứ tự khuyến nghị**: trước hết liên hệ **nhà cung cấp** (làm sạch được lưu lượng, xem được dữ liệu phía trên, có quy trình abuse); với cuộc tấn công nghiêm trọng và kéo dài (tống tiền, đánh cắp dữ liệu, hành vi phạm tội rõ ràng) mới cân nhắc **báo cảnh sát / cơ quan báo cáo tội phạm mạng**, và giữ chuỗi chứng cứ đầy đủ.
- **Tuyệt đối không trả đũa**: phát động DDoS với nguồn tấn công (cái gọi là DDoS-back), xâm nhập máy đối phương hay "hack ngược lại", **bản thân nó là hành vi vi phạm pháp luật ở gần như mọi khu vực**, khiến bạn từ nạn nhân thành bị đơn, và phá hủy lập trường chính đáng vốn có của bạn.
- **Cũng đừng** tìm thông tin cá nhân / treo thưởng công khai IP kẻ tấn công: có thể làm tổn thương bên thứ ba vô can, cũng có thể cấu thành quấy rối hoặc xâm phạm quyền riêng tư.

## 5. Báo cáo và nâng cấp

**"Tôi bị tấn công rồi, xử lý nhanh đi" gần như sẽ không nhận được phản hồi hiệu quả.** Một ticket hiệu quả phải giúp đối phương trong 30 giây phán đoán được nên làm gì:

```text
Chủ đề: [DDoS/tấn công] Instance <instance-id>/<ip> đang bị tấn công, yêu cầu hỗ trợ và dữ liệu lưu lượng

1. Tài sản bị ảnh hưởng
   - IP công cộng: 203.0.113.10
   - Cổng/giao thức: 25565/TCP (bản Java), 19132/UDP (bản Bedrock)
   - ID instance / số đơn hàng: <điền vào>

2. Cửa sổ thời gian (xin ghi rõ múi giờ)
   - Bắt đầu: 2026-10-04 09:12 UTC (giờ địa phương 17:12, UTC+8)
   - Kết thúc: vẫn đang tiếp diễn / đã dừng lúc 09:40 UTC
   - Khoảng thời gian đỉnh: 09:20 - 09:35 UTC

3. Loại tấn công và quy mô (phần đã biết)
   - Phán đoán loại: UDP phản xạ khuếch đại (nghi NTP/DNS) / lũ kết nối TCP / bot vào máy chủ
   - Tốc độ quan sát được: khoảng XX Mbps, khoảng XX kpps (nguồn: bộ đếm ip -s link trên máy)
   - Mất gói card mạng: RX dropped từ 0 tăng lên XXXXX (cùng thời kỳ)

4. Biện pháp giảm nhẹ đã làm
   - 09:25 UTC thêm quy tắc iptables giới hạn số kết nối đồng thời mỗi IP
   - 09:30 UTC chặn IP nguồn (chỉ có hiệu lực với TCP)
   - Chưa khởi động lại, chưa cài lại, hiện trường đã được bảo toàn

5. Yêu cầu
   - Cung cấp thống kê lưu lượng vào instance này trong khoảng thời gian đó và báo cáo tấn công
   - Xác nhận có thể bật / đã bật làm sạch lưu lượng hoặc IP chống DDoS cao cấp không
   - Nếu có nhật ký luồng phía nền tảng, xin hỗ trợ xuất

6. Tệp chứng cứ
   - incident-2026-10-04-0915.pcap (sha256: <hash>)
   - fw-iptables.txt, ss-established.txt, conntrack.txt
   - Khi cần có thể cung cấp gói chứng cứ đầy đủ
```

| Yếu tố | Vì sao bắt buộc phải có |
| --- | --- |
| **Cửa sổ thời gian có múi giờ** | Đối phương phải định vị lưu lượng của bạn trong biển nhật ký, thời gian không đúng tức là không tra được |
| **Loại tấn công và quy mô** | Quyết định họ đi quy trình "làm sạch" hay "truy nguyên" |
| **IP / cổng bị ảnh hưởng** | Xác nhận đang đánh vào tài sản nào |
| **Có còn tiếp diễn không** | Quyết định mức khẩn cấp |
| **Biện pháp giảm nhẹ đã làm** | Tránh hai bên thao tác trùng lặp, ảnh hưởng lẫn nhau |
| **Tên tệp chứng cứ** | Giúp trao đổi có thể truy vết |

**Về khiếu nại abuse**: nhà cung cấp thường có email abuse hoặc biểu mẫu khiếu nại riêng, dùng để xử lý "máy trong dải mạng của họ đang tấn công người khác", **địa chỉ cụ thể lấy trang chính thức/bản ghi WHOIS của nhà cung cấp làm chuẩn**. **Họ thấy được lưu lượng bạn không thấy** (định tuyến phía trên, thiết bị làm sạch, nhật ký luồng nền tảng) —— bạn cung cấp góc nhìn đầu cuối, họ cung cấp góc nhìn mạng, hai bên hợp lại mới đầy đủ. **Giới hạn quyền riêng tư**: nhà cung cấp **có thể vì chính sách riêng tư hoặc pháp luật mà không thể nói cho bạn chi tiết về khách hàng khác**, đây là chuyện bình thường, **đừng vì đối phương "không chịu đưa danh sách IP" mà cho rằng họ không hành động**. Hãy theo dõi liên tục và ghi lại số ticket cùng thời gian từng lần trả lời, tạo thành dòng thời gian trao đổi đầy đủ (cũng là một phần của nhật ký sự kiện).

## 6. Sau sự cố

**Ứng phó sự cố mà không nhìn lại thì coi như làm không công.**

### 6.1 Những câu hỏi khi nhìn lại

| Câu hỏi | Xem cụ thể cái gì |
| --- | --- |
| **Cái gì có tác dụng?** | Quy tắc tường lửa nào đã khớp? Làm sạch có hiệu lực không? Ngưỡng giới hạn tốc độ có hợp lý không? |
| **Cái gì không có tác dụng?** | Biện pháp nào hoàn toàn vô hiệu? Biện pháp nào lại làm tổn thương người chơi bình thường? |
| **Bao lâu mới hồi phục?** | Thời gian thực tế từ phát hiện đến giảm nhẹ, nút thắt ở bước nào (phát hiện chậm? phán đoán chậm? không có phương án?) |
| **Kẻ tấn công có quay lại không?** | So sánh cửa sổ thời gian và phân bố nguồn, phán đoán là cùng một đợt hay đợt mới |
| **Có mất dữ liệu không?** | Bản lưu có toàn vẹn? Có khôi phục về bản cũ không? Bản sao lưu dùng được không? |
| **Đã lộ những gì?** | Có tài khoản, khóa, mật khẩu bảng điều khiển bị nhìn thấy hoặc lộ trong quá trình không? |

### 6.2 Hành động gia cố

- **Giới hạn tốc độ (rate limit)**: đặt trần cho tần suất kết nối, số kết nối đồng thời mỗi IP, tốc độ vào máy chủ. **Đây là tầng hiệu quả nhất và rẻ nhất**. Ví dụ module `hashlimit`/`connlimit` của `iptables`, hoặc giới hạn tốc độ vào máy chủ ở tầng plugin (**tên module và cú pháp cụ thể khác nhau theo nhân và bộ công cụ, trước khi cấu hình hãy xác nhận module khả dụng**).
- **Đưa proxy / chống DDoS cao cấp lên**: giấu IP thật (proxy loại TCPShield, IP chống DDoS cao cấp của nhà cung cấp, chuyển tiếp TCP của CDN). **Lưu ý**: proxy chặn được lũ tầng mạng, **không chặn được tấn công tầng ứng dụng (bot vào máy chủ, lỗ hổng giao thức)**, việc đó cần xác thực và giới hạn tốc độ phía máy chủ.
- **Đổi nhà cung cấp / đổi phòng máy**: khi nhà cung cấp không cung cấp làm sạch, hoặc cuộc tấn công nhắm vào mục tiêu cố định trong dải mạng đó, di chuyển là lựa chọn thực tế. **Trước khi chuyển hãy xác nhận nhà mới có phòng thủ DDoS và năng lực làm sạch không.**
- **Danh sách trắng**: máy chủ nhóm nhỏ người quen **bật thẳng `white-list=true` là phương án triệt để nhất** —— kẻ tấn công không vào được, thì không dùng được tấn công kiểu vào máy chủ để tiêu hao tài nguyên của bạn.
- **Giảm bề mặt lộ**: tắt cổng không cần thiết (RCON, query, bảng điều khiển), xem [Cơ bản an toàn mạng](/tutorials/ops/network-security); gia cố phía máy chủ xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security).
- **Giám sát và cảnh báo**: **lần tấn công sau, bạn muốn được giám sát đánh thức, chứ không phải bị người chơi chửi mà thức.** Ít nhất giám sát băng thông, số kết nối, TPS và sự sống của tiến trình.

### 6.3 Bản sao lưu có nguyên vẹn, có ngoại tuyến không

- **Kiểm chứng bản sao lưu thực sự khôi phục được**, chứ không chỉ "tệp tồn tại". Diễn tập khôi phục xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
- **Xác nhận ít nhất một bản sao là ngoại tuyến** (hoặc bất biến/chỉ đọc). Nếu cuộc tấn công đi kèm xâm nhập máy chủ, **bản sao lưu trực tuyến và ghi được có thể đã bị mã hóa hoặc xóa**.
- **Kiểm tra thời điểm của bản sao lưu**: nếu trong thời gian bị tấn công có khôi phục về bản cũ, phải nói rõ **khôi phục về thời điểm nào**, và dữ liệu người chơi sẽ lùi bao lâu.

### 6.4 Luân chuyển thông tin xác thực và khóa

**Chỉ cần có bất kỳ khả năng lộ, hãy giả định đã lộ, luân chuyển toàn bộ.**

| Đối tượng | Hành động |
| --- | --- |
| Mật khẩu tài khoản bảng điều khiển / backend | Đổi ngay, và bật xác thực hai bước (nếu có) |
| Khóa riêng tư SSH | Tạo lại cặp khóa, xóa khóa công khai cũ, kiểm tra `authorized_keys` có mục thừa không |
| Mật khẩu RCON | Đổi; xác nhận `enable-rcon` không mở ra Internet |
| Tài khoản cơ sở dữ liệu | Đổi mật khẩu, kiểm tra có cấp quyền quá rộng như `root@%` không |
| API Key / Access Key của nền tảng cloud | Thu hồi và tạo lại trên console, kiểm tra có bản ghi gọi bất thường không |
| Tài khoản dịch vụ / Token (plugin, sao lưu, giám sát) | Thu hồi và tạo lại từng cái |
| Tài khoản người chơi | Nếu cơ sở dữ liệu plugin bị lộ, **thông báo người chơi đổi mật khẩu** |

**Đồng thời kiểm tra**: `~/.ssh/authorized_keys`, `/etc/passwd` và `/etc/shadow` có tài khoản mới không, `crontab -l` và `/etc/cron.*` có tác vụ định giờ khả nghi không, systemd có unit bất thường không. **Những kiểm tra này phải làm sau khi hoàn tất điều tra chứng cứ, và ghi lại phát hiện.**

### 6.5 Danh sách kinh nghiệm

```text
[ ] Phát hiện có kịp thời không? Cảnh báo giám sát có phủ băng thông, số kết nối, TPS, sự sống tiến trình không?
[ ] Có phương án bằng văn bản chưa? (ai phán đoán, ai liên hệ nhà cung cấp, ai thông báo người chơi)
[ ] Bắt gói có kịp thời không? Có bị mất chứng cứ vì khởi động lại trước không?
[ ] Dòng thời gian đã thống nhất múi giờ chưa?
[ ] Hash đã được tính và lưu tách khỏi chứng cứ chưa?
[ ] Có xảy ra chặn nhầm người chơi bình thường không? Chặn nhầm được gỡ thế nào?
[ ] Ticket nhà cung cấp có ghi đầy đủ dòng thời gian và chứng cứ không?
[ ] Bản sao lưu đã kiểm chứng khôi phục được chưa, có bản ngoại tuyến không?
[ ] Mọi thông tin xác thực có thể đã lộ đã được luân chuyển chưa?
[ ] Có viết "những gì học được lần này" vào tài liệu, thay vì để trong đầu không?
```

## 7. Script điều tra chứng cứ dùng được ngay

Script dưới đây gom phần **dễ mất** ở mục 2 vào một thư mục có dấu thời gian trong một lần, tính hash và in tóm tắt. **Cách dùng: `sudo bash capture-evidence.sh`** (bắt gói và conntrack cần root). **Trước khi chạy hãy xác nhận** tên giao diện (script tự dò giao diện của tuyến mặc định), thư mục chứng cứ (mặc định `/root/incident`), thời lượng bắt gói và giới hạn số gói. **Script chỉ thu thập chỉ đọc, không sửa cấu hình nào, không khởi động lại dịch vụ nào.**

```bash
#!/usr/bin/env bash
#
# capture-evidence.sh - thu thập chứng cứ dễ mất khi máy chủ Minecraft bị tấn công
#
# Cách dùng: sudo bash capture-evidence.sh
#
# Đặc điểm:
#   - thu thập chỉ đọc, không sửa cấu hình hệ thống, không khởi động lại dịch vụ
#   - công cụ tùy chọn dùng command -v để phán đoán, thiếu thì ghi lại và bỏ qua
#   - mọi kết quả thu thập đều tính SHA-256, tóm tắt ghi vào tệp riêng
#
# Lưu ý: tên giao diện, tên dịch vụ, đường dẫn nhật ký khác nhau theo hệ thống, hãy sửa các biến bên dưới theo nhu cầu.

set -u

# ---------------- Tham số điều chỉnh được ----------------
IFACE="${IFACE:-}"                            # để trống thì tự dò giao diện của tuyến mặc định
CAPTURE_SECONDS="${CAPTURE_SECONDS:-60}"      # số giây bắt gói
CAPTURE_PACKETS="${CAPTURE_PACKETS:-200000}"  # giới hạn số gói bắt, tránh ghi đầy đĩa
MC_TCP_PORT="${MC_TCP_PORT:-25565}"           # cổng bản Java
MC_UDP_PORT="${MC_UDP_PORT:-19132}"           # cổng bản Bedrock / Geyser
MC_SERVICE="${MC_SERVICE:-}"                  # tên dịch vụ systemd, để trống thì bỏ qua
MC_DIR="${MC_DIR:-}"                          # thư mục máy chủ, để trống thì bỏ qua việc copy nhật ký
BASE_DIR="${BASE_DIR:-/root/incident}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BASE_DIR%/}/incident-${STAMP}"

# ---------------- Kiểm tra điều kiện tiên quyết ----------------
if [ "$(id -u)" -ne 0 ]; then
  echo "Lỗi: cần quyền root (bắt gói và conntrack cần quyền này). Hãy chạy bằng sudo." >&2
  exit 1
fi

mkdir -p "$OUT" || { echo "Lỗi: không tạo được $OUT" >&2; exit 1; }
chmod 700 "$BASE_DIR" 2>/dev/null || true
chmod 700 "$OUT" 2>/dev/null || true

if [ -z "$IFACE" ]; then
  IFACE="$(ip route show default 2>/dev/null | awk '/default/ {print $5; exit}')"
fi
if [ -z "$IFACE" ]; then
  IFACE="eth0"
  echo "Cảnh báo: không tự dò được giao diện của tuyến mặc định, lùi về eth0. Hãy dùng IFACE=... để ghi đè." >&2
fi

echo "==> Thư mục chứng cứ: $OUT"
echo "==> Giao diện thu thập: $IFACE"
echo "==> Thời điểm thu thập: $STAMP (UTC)"
echo "==> Dung lượng đĩa còn trống:"
df -h "$OUT" 2>/dev/null || true

# ---------------- Hàm thu thập ----------------
capture() {
  _name="$1"
  shift
  echo "  - $_name"
  "$@" > "${OUT}/${_name}.txt" 2>&1 || echo "    (lệnh trả mã khác không, đầu ra vẫn được lưu)"
}

{
  echo "Bắt đầu thu thập (UTC): $(date -u +%FT%TZ)"
  echo "Giờ địa phương: $(date +%FT%T%:z)"
  echo "Tên máy: $(hostname)"
  echo "Nhân: $(uname -a)"
  echo "Thời gian hoạt động: $(uptime)"
  echo "Giao diện: $IFACE"
  echo "Cổng Java: $MC_TCP_PORT  Cổng UDP: $MC_UDP_PORT"
} > "${OUT}/meta.txt" 2>&1
chmod 600 "${OUT}/meta.txt" 2>/dev/null || true

echo "==> Thu thập trạng thái hệ thống và tiến trình"
capture ps-auxf ps auxf
capture ss-summary ss -s
capture ss-tcp-all ss -tan
capture ss-udp ss -uan
capture ss-tcp-listen ss -tlnp
capture ip-addr ip -br addr
capture ip-route ip route show
capture ip-neigh ip neigh show
capture uptime uptime
capture date-utc date -u +%FT%TZ
capture timedatectl timedatectl
capture df-h df -h

if command -v ss >/dev/null 2>&1; then
  echo "  - ss-java-established"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" \
    > "${OUT}/ss-java-established.txt" 2>&1 || true
  echo "  - ss-source-ranking"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" 2>/dev/null \
    | awk 'NR>1 {print $5}' | cut -d: -f1 \
    | sort | uniq -c | sort -rn | head -50 \
    > "${OUT}/ss-source-ranking.txt" 2>&1 || true
fi

echo "==> Thu thập bộ đếm card mạng"
if command -v ip >/dev/null 2>&1; then
  echo "  - ip-s-link"
  ip -s link show "$IFACE" > "${OUT}/ip-s-link.txt" 2>&1 || true
fi
[ -r /proc/net/dev ] && capture proc-net-dev cat /proc/net/dev
if command -v sar >/dev/null 2>&1; then
  capture sar-dev sar -n DEV 1 5
else
  echo "sar chưa được cài, bỏ qua lấy mẫu tốc độ thời gian thực (sysstat cung cấp sar)" > "${OUT}/sar-dev.txt"
fi

echo "==> Thu thập trạng thái và bộ đếm tường lửa"
if command -v iptables >/dev/null 2>&1; then
  capture fw-iptables iptables -L -v -n
  capture fw-iptables-nat iptables -t nat -L -v -n
else
  echo "iptables không khả dụng" > "${OUT}/fw-iptables.txt"
fi
if command -v nft >/dev/null 2>&1; then
  capture fw-nft nft list ruleset
  capture fw-nft-counters nft list counters
else
  echo "nft không khả dụng" > "${OUT}/fw-nft.txt"
fi

echo "==> Thu thập bảng theo dõi kết nối (nếu có)"
if command -v conntrack >/dev/null 2>&1; then
  capture conntrack-list conntrack -L
  capture conntrack-stats conntrack -S
  capture conntrack-count conntrack -C
else
  echo "lệnh conntrack không khả dụng (cần conntrack-tools, và nhân cần bật nf_conntrack)" \
    > "${OUT}/conntrack-list.txt"
fi
[ -r /proc/sys/net/netfilter/nf_conntrack_count ] \
  && capture conntrack-sysctl cat /proc/sys/net/netfilter/nf_conntrack_count
[ -r /proc/sys/net/netfilter/nf_conntrack_max ] \
  && capture conntrack-max cat /proc/sys/net/netfilter/nf_conntrack_max

echo "==> Thu thập dịch vụ và nhật ký"
if [ -n "$MC_SERVICE" ] && command -v systemctl >/dev/null 2>&1; then
  capture systemctl-status systemctl status "$MC_SERVICE" --no-pager
  if command -v journalctl >/dev/null 2>&1; then
    capture journalctl-1h \
      journalctl -u "$MC_SERVICE" --since "1 hour ago" --utc --no-pager
  fi
else
  echo "chưa chỉ định MC_SERVICE, bỏ qua thu thập trạng thái dịch vụ (cách dùng: MC_SERVICE=minecraft sudo -E bash $0)" \
    > "${OUT}/systemctl-status.txt"
fi

if [ -n "$MC_DIR" ] && [ -d "$MC_DIR" ]; then
  echo "  - copy nhật ký máy chủ (-a giữ dấu thời gian)"
  [ -d "${MC_DIR}/logs" ] && cp -a "${MC_DIR}/logs" "${OUT}/mc-logs" 2>/dev/null || true
  [ -d "${MC_DIR}/crash-reports" ] \
    && cp -a "${MC_DIR}/crash-reports" "${OUT}/mc-crash-reports" 2>/dev/null || true
else
  echo "chưa chỉ định MC_DIR, bỏ qua copy nhật ký máy chủ (cách dùng: MC_DIR=/srv/minecraft sudo -E bash $0)" \
    > "${OUT}/mc-logs-note.txt"
fi

echo "==> Bắt gói ngắn ${CAPTURE_SECONDS}s / tối đa ${CAPTURE_PACKETS} gói"
if command -v tcpdump >/dev/null 2>&1; then
  PCAP="${OUT}/capture-${STAMP}.pcap"
  timeout "$CAPTURE_SECONDS" tcpdump -i "$IFACE" -nn -s 0 \
    -c "$CAPTURE_PACKETS" -w "$PCAP" \
    "port ${MC_TCP_PORT} or udp port ${MC_UDP_PORT}" 2>"${OUT}/tcpdump.log" || true
  echo "  - tệp bắt gói: $PCAP"
  echo "  - thống kê số gói:"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | wc -l | tee "${OUT}/pcap-packet-count.txt" || true
  echo "  - xếp hạng IP nguồn (30 cái đầu):"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | awk '{print $3}' | cut -d. -f1-4 \
    | sort | uniq -c | sort -rn | head -30 > "${OUT}/pcap-source-ranking.txt" || true
else
  echo "tcpdump chưa được cài, không bắt gói được. Hãy cài sớm rồi thu thập lại (Debian/Ubuntu: apt install tcpdump)" \
    > "${OUT}/tcpdump.log"
fi

echo "==> Tính SHA-256"
find "$OUT" -type f ! -name 'SHA256SUMS' -print0 \
  | sort -z | xargs -0 sha256sum > "${OUT}/SHA256SUMS" 2>/dev/null || true
# Lưu thêm một bản checksum ra ngoài thư mục chứng cứ, tránh bị sửa cùng lúc
cp "${OUT}/SHA256SUMS" "${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt" 2>/dev/null || true
find "$OUT" -type f -exec chmod 600 {} + 2>/dev/null || true

echo
echo "=================== Tóm tắt thu thập ==================="
echo "Thư mục chứng cứ : $OUT"
echo "Thời điểm bắt đầu : $(head -n 1 "${OUT}/meta.txt" 2>/dev/null)"
echo "Giao diện     : $IFACE"
echo "Số tệp : $(find "$OUT" -type f | wc -l)"
echo "Dung lượng : $(du -sh "$OUT" 2>/dev/null | cut -f1)"
echo "Tệp bắt gói : $(ls -1 "${OUT}"/*.pcap 2>/dev/null | head -n 1)"
echo "Tệp kiểm chứng : ${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt"
echo "------------------------------------------------"
echo "Bước tiếp theo (quan trọng):"
echo "  1. Đừng khởi động lại, đừng cài lại hệ thống, chứng cứ dễ mất sẽ mất khi khởi động lại."
echo "  2. Copy chứng cứ sang máy khác hoặc phương tiện ngoại tuyến ngay:"
echo "     scp -r root@<IP-của-máy>:$OUT ./evidence/"
echo "  3. Ghi nhật ký sự kiện, thống nhất dùng UTC, và ghi rõ độ lệch múi giờ của máy."
echo "  4. Liên hệ nhà cung cấp mở ticket, kèm cửa sổ thời gian và tên tệp chứng cứ (xem mục 5 của tài liệu)."
echo "================================================"
```

| Mục | Mô tả |
| --- | --- |
| `set -u` chứ không `set -e` | Script thu thập cần **cố gắng gom hết những gì gom được**, một lệnh tùy chọn thất bại không nên làm gián đoạn cả quá trình |
| Bảo vệ bằng `command -v` | Chỉ dùng cho **công cụ tùy chọn** (`sar`, `nft`, `conntrack`, `tcpdump`, `systemctl`); lệnh cốt lõi (`ip`, `ss`) giả định có sẵn |
| `timeout` | Giới hạn thời lượng bắt gói; **`timeout` thuộc GNU coreutils, phần lớn bản phân phối Linux có sẵn**, ảnh tối giản có thể không có |
| `-c "$CAPTURE_PACKETS"` | Giới hạn số gói, tránh ghi đầy đĩa trong lúc bị tấn công; **thời lượng hay số gói, cái nào đạt trước thì có hiệu lực** |
| `cp -a` | Giữ **dấu thời gian và quyền** của nhật ký gốc, đây là yêu cầu cơ bản của điều tra chứng cứ |
| Bộ lọc bắt gói | `'port 25565 or udp port 19132'`: **`port` khớp cả TCP/UDP**, nên viết `port 25565` cộng `udp port 19132`, tránh bắt luôn TCP của 19132 |
| Checksum | Để một bản trong thư mục, **và lưu thêm một bản dưới `BASE_DIR`**; tình huống thực sự nghiêm ngặt nên lưu checksum và chứng cứ ở máy khác nhau |
| Tên dịch vụ và đường dẫn | `MC_SERVICE`, `MC_DIR` **bắt buộc điền theo cách triển khai của bạn**, script không đoán được |
| Môi trường container | Khi chạy trong container, `IFACE` và `MC_DIR` đều phải trỏ tới giao diện và đường dẫn **trong namespace mạng của container** |

:::warn Script thu thập không thay thế được phán đoán
Script chịu trách nhiệm **ghi chứng cứ dễ mất xuống đĩa**, nhưng **việc phán đoán "đây là loại tấn công gì, có nên khiếu nại, có nên chuyển sang chống DDoS cao cấp" vẫn phải do người làm**. Chạy xong script hãy tiếp tục theo quy trình mục 1 đến mục 6, nhất là đừng quên **viết nhật ký sự kiện** và **liên hệ nhà cung cấp**.
:::

Đọc kèm: [Cơ bản an toàn mạng](/tutorials/ops/network-security) (cổng và tường lửa), [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) (loại tấn công và phòng ngừa), [Gia cố an ninh hệ thống](/tutorials/ops/system-security) (gia cố phía máy chủ), [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) và [Sao lưu và khôi phục](/tutorials/java/backup) (bảo toàn dữ liệu và diễn tập khôi phục).

> Lệnh điều tra chứng cứ và yêu cầu tuân thủ khác nhau theo hệ thống và khu vực, hãy lấy luật địa phương và chính sách phòng máy làm chuẩn.
