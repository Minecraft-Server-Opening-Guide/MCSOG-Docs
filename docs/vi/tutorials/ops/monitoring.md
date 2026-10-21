---
title: Giám sát và cảnh báo
slug: monitoring
cat: ops
level: 3
order: 17
minutes: 16
tags: [giám sát, cảnh báo, Prometheus, Grafana, UptimeKuma, TPS, MSPT, vận hành]
updated: 2026-10-04
draft: false
---

Máy chủ gặp sự cố có hai tình huống điển hình.

Tình huống thứ nhất: người chơi nói trong nhóm "máy chủ nổ rồi", bạn mở bảng điều khiển ra thấy đúng là không khởi động được, rồi bắt đầu tra —— **đây là phân tích sau sự việc**, công cụ là [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

Tình huống thứ hai: đĩa còn 3% dung lượng, script sao lưu thất bại ba ngày liền, bộ nhớ leo dốc đến mức bắt đầu dùng swap, mà **bạn hoàn toàn không biết**, cho đến khi bản lưu không ghi vào được.

Bài này nói về tình huống thứ hai. Vấn đề cốt lõi chỉ có một: **làm sao để máy tự tìm đến bạn trước khi xảy ra chuyện, thay vì bạn phải đi tìm nó.**

Bài này và [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) bổ trợ cho nhau: spark trả lời "vừa nãy vì sao lag", giám sát cảnh báo trả lời "bây giờ có sắp xảy ra chuyện không". Bảo toàn dữ liệu xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup); gia cố máy chủ xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security).

:::warn Cấu hình trong bài này lấy tài liệu chính thức làm chuẩn
Cổng, đường dẫn, tên dịch vụ và khóa cấu hình xuất hiện dưới đây **đều thay đổi theo bản phân phối, cách cài đặt và phiên bản phần mềm**. Ví dụ ở đây có tác dụng nói rõ "nên cấu hình cái gì", **không phải sản phẩm chép nguyên được**; trước khi áp dụng hãy đối chiếu tài liệu chính thức của Prometheus, node_exporter, Grafana, Uptime Kuma và NUT, cùng tệp cấu hình thực tế được tạo trên hệ thống của bạn.
:::

## 1. Giám sát rốt cuộc đang giám sát cái gì

Trước hết phân biệt hai loại hoàn toàn khác nhau, rất nhiều cảm giác thất vọng "giám sát chẳng có ích" đến từ việc trộn hai loại này làm một: **tài nguyên và trạng thái dịch vụ** (CPU, bộ nhớ, dung lượng đĩa và I/O, mạng, dịch vụ có đang chạy không, chứng chỉ có sắp hết hạn không) là những con số khách quan, có thể vẽ thành đường cong, phù hợp để đặt ngưỡng cảnh báo; **chỉ số trải nghiệm chơi** (TPS, MSPT, số người chơi, tỷ lệ đăng nhập thất bại) cần máy chủ phối hợp để phơi ra, là chỉ số đại diện cho "cảm nhận thật của người chơi". Loại thứ nhất **bắt buộc phải giám sát**, vì sự xấu đi của chúng là dần dần, mắt thường không thấy; loại thứ hai **đáng giám sát**, nhưng phải biết giới hạn của nó: TPS là một đại lượng trung bình, sẽ san phẳng đỉnh; MSPT tốt mà người chơi nói lag thì vấn đề có thể ở mạng hoặc client.

### 1.1 Một danh sách bắt buộc phải giám sát

| Hạng mục | Vì sao bắt buộc | Cách xấu đi điển hình |
| --- | --- | --- |
| Khả dụng / thời gian trực tuyến | Dịch vụ sập mà không ai phát hiện, là sự cố nghiêm trọng nhất và cũng phổ biến nhất | Tiến trình sập, bị OOM giết, bật máy không tự chạy |
| TPS / MSPT | Trực tiếp quyết định trải nghiệm người chơi, cũng là căn cứ của "có nên tối ưu hay không" | Thực thể tích tụ, điểm nóng plugin, sinh chunk |
| CPU | Luồng chính là đơn luồng, **một nhân chạy hết là TPS tụt**, dù các nhân khác rảnh | Người chơi đông hơn, máy redstone, máy vật lý bán quá mức |
| Bộ nhớ | Cả heap và bộ nhớ thường trú đều leo chậm, **leo đến mức dùng swap là điềm báo thảm họa** | Rò rỉ bộ nhớ, thế giới lớn dần, thực thể không được thu hồi |
| Dung lượng đĩa | **Đĩa đầy khiến máy chủ ghi bản lưu thất bại**, thuộc loại phá dữ liệu | Sao lưu tích tụ, nhật ký tăng điên cuồng, core dump |
| I/O đĩa | Lưu thế giới, nạp chunk, sao lưu đều ăn I/O, **lúc nó chậm thì CPU trông vẫn còn rảnh** | Ổ cơ, SSD gần đầy, sao lưu tranh đĩa với game |
| Mạng | Băng thông hết và mất gói đều khiến người chơi mất kết nối, và **chỉ số của chính máy chủ hoàn toàn bình thường** | Bị tấn công, sao lưu tải lên chiếm hết đường lên, đường truyền sự cố |
| Số người chơi | Vừa là chỉ số vận hành, vừa là **máy dò bất thường nhạy nhất**: đột ngột về 0 thường đến trước mọi cảnh báo | Máy chủ sập, bị tấn công, đăng nhập bị từ chối |
| Sao lưu có thành công không | Khi sao lưu thất bại bạn không có cảm giác gì, **cho đến đúng ngày bạn cần nó** | Đĩa đầy, quyền thay đổi, lỗi script bị bỏ qua |
| Hiệu lực chứng chỉ | Khi bảng điều khiển, trang trạng thái, website dùng HTTPS, **chỉ đúng ngày hết hạn mới lộ ra** | Quên gia hạn, tác vụ gia hạn tự động thất bại |

:::tip Vì sao dung lượng đĩa đứng đầu danh sách
Vì nó là hạng mục **duy nhất trong danh sách trực tiếp phá hủy dữ liệu**. CPU cao, TPS thấp thì người chơi chỉ khó chịu; đĩa đầy, máy chủ lưu thế giới thất bại, có thể mất vài giờ tiến độ thậm chí cả bản lưu. Nên nếu chỉ cấu hình một cảnh báo duy nhất, hãy cấu hình cho đĩa.
:::

## 2. Phân tích sau sự việc và cảnh báo trước sự việc

Hai từ này thường bị dùng lẫn, nhưng chúng giải quyết những vấn đề hoàn toàn khác nhau.

| | Phân tích sau sự việc | Cảnh báo trước sự việc |
| --- | --- | --- |
| Thời điểm kích hoạt | Vấn đề đã xảy ra, đã ảnh hưởng người chơi | Vấn đề đang hình thành, hoặc vừa mới xảy ra |
| Công cụ điển hình | spark, nhật ký, `crash-reports/` | Uptime Kuma, Prometheus + Alertmanager, systemd `OnFailure` |
| Trả lời câu hỏi | "Vừa nãy rốt cuộc đã xảy ra chuyện gì" | "Bây giờ có sắp xảy ra chuyện không" |
| Đầu ra | Cây gọi, biểu đồ lửa, ngăn xếp lỗi | Một thông báo, kèm "nên làm gì" |
| Giới hạn | **Chỉ giải thích được quá khứ** | **Chỉ phát hiện được vấn đề bạn đã nghĩ tới trước** |

**Thiếu cái nào cũng không được, nhưng mức ưu tiên khác nhau.** Không có cảnh báo trước, bạn sẽ biết máy chủ sập từ miệng người chơi; không có phân tích sau, bạn biết nó sập nhưng không biết vì sao, lần sau vẫn sập.

### 2.1 Vì sao "chỉ xem spark là đủ" là sai

Một hiểu nhầm phổ biến là "tôi định kỳ chạy spark xem báo cáo sức khỏe là được". Báo cáo sức khỏe của spark đúng là công cụ tốt cho trạng thái dài hạn, nhưng nó là thứ **bạn chủ động đi xem**: ba giờ sáng đĩa đầy, không ai chủ động mở spark. Bản chất của cảnh báo là **biến "chủ động đi xem" thành "bị động được thông báo"**, nhờ đó chuyện "không có thời gian xem hằng ngày" không còn chí mạng.

:::note Đừng mong giám sát phát hiện mọi thứ
Giám sát chỉ phát hiện được vấn đề **bạn đã nghĩ tới và đã thu thập**. Lần đầu gặp vấn đề kiểu "một plugin nào đó mỗi đêm tăng 200 MB bộ nhớ", bạn thường không có chỉ số nào chứng minh được nó. **Cách đúng là: xảy ra một sự cố, bổ sung một mục giám sát.** Hệ thống giám sát mọc dần lên, không phải cấu hình đủ trong một lần.
:::

## 3. Làm cái rẻ nhất trước: ba phương án không tốn chi phí

Trước khi cài Prometheus, hãy làm ba việc này trước —— chúng phủ được phần lớn tình huống "máy chủ sập mà không ai biết", và gần như không tốn thời gian.

### 3.1 Kiểm tra khả dụng từ bên ngoài: Uptime Kuma

Cách nghĩ rất đơn giản: **để một máy không nằm trên máy chủ của bạn, định kỳ đến gõ cửa một lần**. Vì sao bắt buộc phải "không nằm trên máy chủ của bạn"? Vì khi cả máy mất điện, mạng đứt, hệ thống treo, **script giám sát chạy trên chính nó sẽ chết theo**, không báo được gì —— đây là khác biệt bản chất nhất giữa giám sát bên ngoài và giám sát cục bộ.

Uptime Kuma là công cụ giám sát tự host, tài liệu chính thức định vị nó là "công cụ giám sát tự host dễ dùng": loại giám sát gồm HTTP(S), TCP, từ khóa và truy vấn JSON của HTTP(S), WebSocket, Ping, bản ghi DNS, Push, máy chủ game Steam, container Docker, v.v.; README chính thức ghi rõ hỗ trợ khoảng kiểm tra **20 giây**, kênh thông báo gồm Telegram, Discord, Gotify, Slack, Pushover, email (SMTP), v.v., tài liệu chính thức nói có **hơn 90** dịch vụ thông báo; ngoài ra còn đa ngôn ngữ, nhiều trang trạng thái, thông tin chứng chỉ, hỗ trợ proxy và 2FA. Với máy chủ Minecraft, ba loại giám sát thực dụng nhất là:

| Loại giám sát | Giám sát cái gì | Lưu ý |
| --- | --- | --- |
| Cổng TCP | Tiến trình máy chủ có đang lắng nghe cổng không | **Khi tiến trình sống nhưng treo, cổng vẫn thông**, nó không đo được "lag" |
| Ping | Máy có tiếp cận được không | Chỉ chứng minh tầng mạng còn sống |
| HTTP(S) | Bảng điều khiển, trang trạng thái, website có dùng được không | Tiện xem luôn thời điểm hết hạn chứng chỉ |

**Đặt giám sát trên một máy khác hoặc một nhà cung cấp khác.** Đặt trên cùng máy, khi mất điện nó biến mất cùng máy chủ.

### 3.2 systemd: để dịch vụ tự báo thất bại

Nếu máy chủ được quản lý bằng systemd (xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security)), thì việc "dịch vụ sập" systemd vốn đã biết, bạn chỉ cần bảo nó nói cho bạn. **Trước hết phân biệt hai tùy chọn hay bị lẫn**: `Restart=on-failure` **tự khởi động lại** khi tiến trình thoát bất thường (mọi dịch vụ chạy dài đều nên cấu hình, để rút ngắn thời gian sự cố), `OnFailure=` **kích hoạt một unit khác** khi dịch vụ vào trạng thái failed (để gửi thông báo, thu thập hiện trường, thực hiện dọn dẹp).

`Restart=` là "tự phục hồi", `OnFailure=` là "cảnh báo". **Phải cấu hình cả hai**, nhưng đừng mong `Restart=` thay thế được cảnh báo: nếu dịch vụ cứ sập-rồi-khởi-động-lại, `Restart=` chỉ khiến nó tiếp tục vòng lặp, còn bạn không biết gì. Một unit cảnh báo tối thiểu, cùng dòng tham chiếu nó trong unit máy chủ:

```ini
# /etc/systemd/system/mc-alert@.service
[Unit]
Description=Send an alert for a failed unit (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Đưa %i (tên dịch vụ bị lỗi) cho script thông báo của bạn
ExecStart=/usr/local/bin/mc-notify.sh "systemd unit %i entered the failed state"

# --- Dưới đây là đoạn [Unit] của unit máy chủ ---
# Khi dịch vụ vào trạng thái failed, khởi động instance mẫu mc-alert@<tên dịch vụ này>.service
OnFailure=mc-alert@%n.service
```

Sửa xong nhớ `systemctl daemon-reload`, rồi **thực sự làm nó sập một lần để kiểm chứng**. Cảnh báo chưa kiểm chứng thì cũng như không có cảnh báo.

:::warn Vòng lặp sập-rồi-khởi-động-lại sẽ che lấp vấn đề
`Restart=always` cộng với việc "người chơi không nhận ra" có thể khiến một máy chủ **mười phút sập một lần** trông hoàn toàn bình thường. **Cảnh báo phải phân biệt được "thỉnh thoảng khởi động lại" và "khởi động lại liên tục"**, nếu không bạn sẽ bị lừa trong im lặng rất lâu. Kiểm tra số lần khởi động lại và thời điểm thoát gần nhất trong `systemctl status`.
:::

### 3.3 Một dòng cron + một script kiểm tra

Phương án nguyên thủy nhất và cũng đáng tin nhất: để cron mỗi phút chạy một script, script phát hiện bất thường thì kết thúc bằng mã thoát khác 0, rồi email của cron hoặc script thông báo của bạn gửi kết quả đi.

**Quy ước then chốt: script dùng mã thoát để biểu đạt kết quả.** `0` nghĩa là mọi thứ bình thường, **khác 0 nghĩa là có chuyện**. Như vậy dù là cron, systemd timer hay bộ điều phối khác, đều dùng được cùng một logic phán đoán.

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-healthcheck.sh
# Quy ước mã thoát: 0 = bình thường, khác không = bất thường (bị cron / systemd coi là thất bại)
set -uo pipefail
PORT="25565"        # cổng máy chủ lắng nghe
WARN_DISK=85        # ngưỡng cảnh báo mức dùng đĩa (phần trăm)
fail=0
note() { printf '%s\n' "$*"; }
bad()  { printf 'FAIL: %s\n' "$*"; fail=1; }

# 1) Cổng TCP có ai lắng nghe không (biểu thức lọc của ss đặt trong nháy để shell không tách)
if command -v ss >/dev/null 2>&1; then
  if ss -lnt "( sport = :${PORT} )" | grep -q .; then
    note "port ${PORT}: listening"
  else
    bad "port ${PORT} is not listening"
  fi
fi
# 2) Tiến trình máy chủ có tồn tại không (cách viết ngoặc vuông tránh pgrep khớp chính nó; chỉnh theo tên tiến trình thực tế)
if pgrep -f '[s]erver\.jar' >/dev/null 2>&1; then
  note "server process: present"
else
  bad "server process not found"
fi
# 3) Mức dùng hệ thống tệp gốc (df -P bảo đảm định dạng đầu ra ổn định, tiện phân tích theo cột)
used="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ -n "${used}" ] && [ "${used}" -ge "${WARN_DISK}" ]; then
  bad "disk usage on / is ${used}% (threshold ${WARN_DISK}%)"
else
  note "disk usage on /: ${used:-unknown}%"
fi
exit "${fail}"
```

Đưa vào cron (mỗi phút một lần):

```bash
# crontab -e
* * * * * /usr/local/bin/mc-healthcheck.sh || /usr/local/bin/mc-notify.sh "healthcheck failed on $(hostname)"
```

:::warn Email của cron thường là hố đen
Trên nhiều hệ thống, email của cron hoặc chưa cấu hình MTA, hoặc rơi vào hộp thư không ai đọc. **Đừng giả định "cron sẽ thông báo cho tôi"**, nhất định phải tự kiểm chứng một lần: sửa script thành chắc chắn thất bại, xem thông báo có thực sự đến tay bạn không.

Ví dụ trên dùng `/usr/local/bin/mc-notify.sh`, **bạn phải tự hiện thực nó**: cách đơn giản nhất là gửi một POST tới Webhook, hoặc gọi địa chỉ giám sát Push của Uptime Kuma. Chọn kênh nào tùy công cụ bạn đã có, **giao diện cụ thể lấy tài liệu chính thức của công cụ đó làm chuẩn**.
:::

:::note Đưa TPS và MSPT vào script thế nào
Script trên không kiểm tra TPS và MSPT, vì **hai giá trị này không nằm ở tầng hệ điều hành**, chỉ có thể do máy chủ, plugin hoặc MCDR phơi ra. Lấy được giá trị rồi thì việc phán đoán rất đơn giản, lưu ý shell chỉ hỗ trợ so sánh số nguyên, số thực phải dùng `awk`:

```bash
mspt="$(your-command-to-read-mspt 2>/dev/null)"
if [ -n "${mspt}" ] && awk -v v="${mspt}" -v m="50" 'BEGIN {exit !(v > m)}'; then
  bad "MSPT ${mspt} exceeds 50"
fi
```

**Cách lấy giá trị khác nhau theo lõi, phiên bản và plugin, hãy lấy tài liệu chính thức của phương án bạn dùng làm chuẩn.**
:::

## 4. Phương án chính quy: node_exporter + Prometheus + Grafana

Ba phương án không tốn chi phí cho biết "có sập không", nhưng không trả lời được "đĩa đã tăng lên thế nào" "bộ nhớ bắt đầu leo từ mấy giờ". Muốn làm được cái sau, cần một hệ thống **lưu dữ liệu lịch sử và vẽ thành đường cong**.

### 4.1 Ba thành phần làm gì

| Thành phần | Vai trò | Hiểu trong một câu |
| --- | --- | --- |
| node_exporter | Bộ thu thập (exporter) | Biến chỉ số CPU, bộ nhớ, đĩa, mạng của máy thành văn bản trên một giao diện HTTP, chờ người khác đến lấy |
| Prometheus | Cơ sở dữ liệu chuỗi thời gian + bộ thu thập | **Định kỳ chủ động đi lấy** chỉ số exporter phơi ra, lưu thành chuỗi thời gian, và phán đoán theo quy tắc xem có cần cảnh báo |
| Grafana | Trực quan hóa | Kết nối Prometheus, vẽ chuỗi thời gian thành đồ thị, ghép thành bảng |
| Alertmanager | Định tuyến cảnh báo | Sau khi Prometheus phán đoán "nên cảnh báo", nó phụ trách nhóm, khử trùng lặp, tạm im và gửi (xem mục 6) |

**Hiểu mô hình "kéo (pull)" rất quan trọng**: không phải exporter đẩy dữ liệu sang Prometheus, mà **Prometheus định kỳ đến kéo**. Tác dụng phụ rất hữu ích —— khi không kéo được một mục tiêu, Prometheus tự biết "nó sập rồi", chỉ số `up` này bản thân nó đã là giám sát khả dụng cơ bản nhất.

### 4.2 node_exporter và một systemd unit tối thiểu

node_exporter là một tệp nhị phân đơn, chạy lên là phơi chỉ số ở cổng mặc định. Cách kiểm chứng tài liệu chính thức đưa ra là:

```bash
./node_exporter                              # chạy trực tiếp ở tiền cảnh
curl http://localhost:9100/metrics           # xác nhận đọc được chỉ số (cổng mặc định 9100)
curl http://localhost:9100/metrics | grep "node_"   # chỉ xem chỉ số máy có tiền tố node_
```

Tài liệu chính thức nói chỉ số máy có tiền tố `node_`, ví dụ `node_cpu_seconds_total` (tổng thời gian tích lũy theo từng chế độ CPU, kết hợp `rate()` để ra mức sử dụng), `node_filesystem_avail_bytes` (số byte hệ thống tệp khả dụng cho người dùng không phải root), `node_network_receive_bytes_total` (số byte nhận tích lũy của card mạng). Unit mẫu của kho nguồn gốc dùng **kích hoạt bằng socket** (`Requires=node_exporter.socket` cộng `--web.systemd-socket`), nên tệp đó **không dùng độc lập được**, bắt buộc phải có socket unit đi kèm; dưới đây đưa một cách viết trực tiếp hơn, không phụ thuộc kích hoạt socket:

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
# Khi cài bằng gói của bản phân phối, người dùng và đường dẫn nhị phân thường do gói cung cấp (phổ biến là prometheus-node-exporter)
User=node_exporter
Group=node_exporter
# Đường dẫn nhị phân khác nhau theo cách cài: bản nhị phân nguồn gốc thường là /usr/local/bin/node_exporter
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Bật và kiểm chứng:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
systemctl status node_exporter --no-pager
curl -s http://127.0.0.1:9100/metrics | head
```

:::warn Đường dẫn, người dùng và cổng đều phải sửa theo thực tế
`User=`, đường dẫn `ExecStart=` và cổng lắng nghe ở trên **chỉ là minh họa**. Cài bằng gói bản phân phối và cài bằng nhị phân nguồn gốc có vị trí khác nhau, người dùng có tồn tại hay không cũng tùy gói; **cổng 9100 là giá trị mặc định, không phải giá trị quy định**, đổi xong thì địa chỉ mục tiêu trong Prometheus cũng phải đổi theo. Ngoài ra, một số bộ thu thập của node_exporter (nhất là những cái đọc systemd hoặc nhật ký) tốn không ít trên máy bận, **trong container thường còn phải mount thêm mới lấy được chỉ số của máy vật lý**; bật những bộ thu thập nào lấy tài liệu chính thức của phiên bản bạn cài và đầu ra `--help` làm chuẩn.
:::

### 4.3 Cấu hình tối thiểu của Prometheus

Dưới đây là cấu hình thu thập tối thiểu mà hướng dẫn node_exporter chính thức của Prometheus đưa ra, bổ sung thêm các trường cần cho đánh giá quy tắc và cảnh báo:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s      # mặc định chính thức 1m, ở đây đặt rõ là 15s
  scrape_timeout: 10s       # không được lớn hơn khoảng thu thập; mặc định chính thức 10s
  evaluation_interval: 1m   # khoảng đánh giá quy tắc; mặc định chính thức 1m

rule_files:                 # tệp quy tắc cảnh báo (mục 5 đưa nội dung ví dụ)
  - /etc/prometheus/rules/*.yml

alerting:                   # sau khi phán đoán cảnh báo thì giao cho ai xử lý (mục 6)
  alertmanagers:
    - static_configs:
        - targets:
            - 127.0.0.1:9093

scrape_configs:
  - job_name: node          # chỉ số máy: ví dụ tối thiểu trong hướng dẫn chính thức
    static_configs:
      - targets: ['localhost:9100']

  - job_name: prometheus    # tự thu thập chính mình, tiện xác nhận nó có khỏe không
    static_configs:
      - targets: ['localhost:9090']
```

Kiểm chứng và nạp lại cấu hình:

```bash
# Dùng công cụ kiểm chứng có sẵn chính thức, tránh khởi động lại với lỗi cú pháp
promtool check config /etc/prometheus/prometheus.yml
# Nạp lại (cần bật --web.enable-lifecycle khi khởi động)
curl -X POST http://127.0.0.1:9090/-/reload
```

:::note Cổng và đường dẫn đều là giá trị mặc định
`9090` (Prometheus) và `9093` (Alertmanager) là **cổng mặc định** của hai dự án này, sửa được trong tham số khởi động hoặc cấu hình. Đường dẫn tệp cấu hình khác nhau theo bản phân phối và cách cài, `/etc/prometheus/` chỉ là vị trí phổ biến của dòng Debian. **Đừng chép nguyên, hãy xem tệp trên hệ thống bạn thực sự nằm ở đâu.**
:::

### 4.4 Grafana

Vai trò của Grafana là vẽ dữ liệu trong Prometheus ra, cổng mặc định là `3000`, vị trí thư mục cấu hình và dữ liệu thay đổi theo cách cài. Với máy chủ Minecraft, làm bốn đồ thị trước là đủ dùng: mức dùng đĩa (`node_filesystem_avail_bytes` và `node_filesystem_size_bytes`), mức dùng CPU (`rate(node_cpu_seconds_total[5m])`), bộ nhớ và swap (`node_memory_*`), độ trễ chờ I/O đĩa (`rate(node_cpu_seconds_total{mode="iowait"}[5m])`).

:::tip Bảng phải trả lời được "so với tuần trước thế nào"
Bảng chỉ có một giá trị hiện tại gần như không có giá trị. **Mỗi đồ thị đều phải chuyển được khoảng thời gian**, như vậy bạn mới thấy được "đĩa bắt đầu giảm nhanh từ ngày nào" "bộ nhớ bắt đầu tăng từ bản cập nhật nào". Đó cũng là lý do bắt buộc phải lưu dữ liệu lịch sử, thay vì chỉ nhìn hiện tại.
:::

## 5. Ngưỡng cảnh báo: đặt bao nhiêu, vì sao

Ngưỡng không phải càng nhạy càng tốt. **Đặt quá lỏng thì sự cố đã xảy ra; đặt quá chặt thì đến ngày thứ ba bạn bắt đầu bỏ qua mọi thông báo.** Dưới đây là điểm khởi đầu phổ biến trong cộng đồng, hãy điều chỉnh theo đường cơ sở của bạn.

| Hạng mục | Điểm khởi đầu đề xuất | Vì sao là giá trị này | Nguyên nhân báo sai thường gặp |
| --- | --- | --- | --- |
| Mức dùng đĩa | **Vượt 85%** | Chừa đủ thời gian xử lý trước khi đầy; đầy sẽ trực tiếp khiến lưu thất bại | Tệp sao lưu tạm chiếm chỗ, luân chuyển nhật ký chậm |
| MSPT | **Liên tục vượt 50 ms** | 50 ms là ngân sách một tick tương ứng 20 TPS, vượt lâu dài nghĩa là TPS đã không giữ được | Đỉnh đơn lẻ bị giá trị trung bình che, nên phải thêm điều kiện "liên tục" |
| Tác vụ sao lưu thất bại | **Bất kỳ lần thất bại nào cũng cảnh báo** | Khi sao lưu thất bại không có triệu chứng nào khác, chỉ có thể nhờ nó tự báo | Mã thoát script viết sai, đĩa tạm thời đầy |
| Dịch vụ không chạy | **Trạng thái `systemd` là failed hoặc không active** | Khả dụng cơ bản nhất, phải có người biết | Khởi động lại theo kế hoạch mà không thêm khung bảo trì |
| Bộ nhớ cao và bắt đầu dùng swap | **Lượng dùng swap liên tục lớn hơn 0** | Một khi bắt đầu hoán trang, độ trễ sẽ xấu đi theo kiểu vách đá; **"bộ nhớ cao nhưng không swap" thường chỉ là lãng phí bộ nhớ, không nhất thiết phải cảnh báo** | Hệ thống vốn có một ít hoạt động swap |
| CPU cao liên tục | **Liên tục gần đầy một nhân** | Luồng chính của Minecraft là đơn luồng, **một nhân đầy là đủ làm TPS tụt**, không liên quan các nhân khác rảnh hay không | Sao lưu, sinh thế giới và các đỉnh bình thường khác |
| Chứng chỉ hết hạn | **Còn dưới 14 ngày** | Chừa đủ thời gian xử lý khi gia hạn tự động thất bại | Chứng chỉ nhiều tên miền chỉ giám sát một cái |

### 5.1 Một quy tắc cảnh báo thực sự dùng được

Điều kiện "vượt 50" tự nó có vấn đề: một đỉnh tức thời là kích hoạt. Muốn biểu đạt "liên tục vượt", cần phối hợp `for`:

```yaml
# /etc/prometheus/rules/minecraft.yml
groups:
  - name: minecraft-host
    rules:
      - alert: HostDiskSpaceLow
        # Tỷ lệ đĩa khả dụng dưới 15% (tức mức dùng trên 85%)
        expr: |
          (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
            / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) < 0.15
        for: 15m          # duy trì lâu như vậy mới cảnh báo, tránh dao động tạm thời
        labels:
          severity: critical
        annotations:
          summary: "Dung lượng đĩa còn lại dưới 15% (điểm mount {{ $labels.mountpoint }})"
          description: "Máy {{ $labels.instance }} có dung lượng khả dụng thấp, đĩa đầy sẽ khiến máy chủ không lưu được thế giới."

      - alert: HostHighMemoryWithSwap
        # Swap đã dùng liên tục lớn hơn 0
        expr: node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Máy bắt đầu dùng swap"

      - alert: NodeExporterDown
        # Thu thập thất bại: nghĩa là mục tiêu không tiếp cận được hoặc exporter đã sập
        expr: up{job="node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Không thu thập được chỉ số máy ({{ $labels.instance }})"
```

**Chú ý phân công giữa `for` và `expr`**: `expr` phán đoán "bây giờ có thỏa điều kiện không", `for` phán đoán "đã thỏa bao lâu rồi". **Cảnh báo không có `for` gần như chắc chắn sẽ ồn.**

:::warn TPS và MSPT cần bạn tự nối vào
Các quy tắc trên chỉ dùng chỉ số của node_exporter, **nó không thấy được TPS và MSPT**. Muốn giám sát chỉ số trong game, bạn cần một thứ có thể phơi chúng thành chỉ số Prometheus (plugin máy chủ, script MCDR hoặc exporter tự dựng). **Phương án cụ thể khác nhau theo lõi, phiên bản và plugin, bài này không đưa cách hiện thực cụ thể, hãy lấy tài liệu chính thức của phương án bạn dùng làm chuẩn.**
:::

### 5.2 Dịch vụ có đang chạy không

Giám sát cấp dịch vụ có ba cách viết, **và có thể cộng dồn**: systemd `OnFailure` (đơn giản, không phụ thuộc thành phần thêm, nhưng **chỉ phủ trạng thái failed**, tiến trình treo mà chưa thoát thì không đo được), dò cổng từ bên ngoài (phát hiện được "tiến trình còn nhưng dịch vụ không thông", cần máy khác), script tự viết + cron (linh hoạt, kiểm tra được điều kiện bất kỳ, nhưng phải tự bảo trì). Cả ba chi phí đều thấp, nhưng phủ những tình huống khác nhau.

## 6. Mệt mỏi vì cảnh báo: làm sao để thông báo còn ý nghĩa

Đây là khâu **dễ bị đánh giá thấp nhất** trong hệ thống giám sát. Một cảnh báo mười phút kêu một lần, mà lần nào cũng báo sai, sẽ luyện cho bạn bỏ qua toàn bộ thông báo trong vài ngày —— **lúc đó hệ thống giám sát trên thực tế đã mất hiệu lực, chỉ là bạn chưa nhận ra.**

### 6.1 Cảnh báo triệu chứng, chứ không phải nguyên nhân

| Phản ví dụ (cảnh báo nguyên nhân) | Ví dụ đúng (cảnh báo triệu chứng) |
| --- | --- |
| "Mức dùng CPU vượt 80%" | "TPS dưới 15 kéo dài 5 phút" |
| "Độ trễ chờ I/O đĩa cao" | "Dung lượng đĩa còn lại dưới 15%" |
| "Một tiến trình đã khởi động lại" | "Dịch vụ khởi động lại hơn 3 lần trong 1 giờ" |
| "Mức dùng bộ nhớ vượt 70%" | "Đã bắt đầu dùng swap" |

Lý do là: **nguyên nhân không nhất thiết ảnh hưởng người chơi, triệu chứng thì chắc chắn ảnh hưởng người chơi.** CPU cao mà TPS bình thường nghĩa là máy này còn chịu được; còn TPS tụt thì dù nguyên nhân là gì, người chơi đều đang khó chịu.

### 6.2 Khử trùng lặp, nhóm, tạm im

Hệ thống cảnh báo cần ba năng lực cơ bản, nếu không một sự cố sẽ thành một trăm thông báo:

| Năng lực | Tác dụng | Ví dụ |
| --- | --- | --- |
| Khử trùng lặp (deduplication) | Cùng một vấn đề chỉ thông báo một lần | Sau khi đĩa đầy, mọi thao tác ghi đĩa đều thất bại, nhưng bạn chỉ nên nhận một thông báo "đĩa đầy" |
| Nhóm (grouping) | Gộp cảnh báo liên quan thành một | Một lần mất điện khiến mười máy cùng offline, nên gộp thành một chứ không phải mười |
| Tạm im (silencing) | Không thông báo trong thời gian bảo trì theo kế hoạch | Bạn đang khởi động lại máy chủ, không cần nhận cảnh báo vì việc đó |

Trong hệ sinh thái Prometheus, ba việc này do **Alertmanager** phụ trách, chứ không phải bản thân Prometheus. **Đây là khâu nhiều người bỏ sót**: chỉ cài Prometheus mà không cài Alertmanager, bạn nhận được một mớ thông báo mỗi cái một kiểu.

### 6.3 Chỉ để một kênh, và mỗi cảnh báo phải có người xử lý được

Một kỷ luật thực dụng: **mọi cảnh báo đi cùng một kênh.** Lý do rất thực tế: nếu có ba kênh, bạn sẽ bắt đầu phân loại kiểu "thông báo ở kênh này không quan trọng", cuối cùng cả ba đều không xem. **Một kênh, một quy tắc, một chỗ để xem** mới hình thành được phản xạ "kêu là chắc có chuyện".

Trước khi đưa một cảnh báo lên, hãy tự hỏi thêm một câu: **nó kêu xong thì tôi làm gì?** Nếu câu trả lời là "không biết, xem đã", thì cảnh báo đó **chưa nên đưa lên lúc này**. Hãy nghĩ rõ các bước xử lý trước, rồi mới bật nó —— đó chính là sổ tay vận hành ở mục sau.

## 7. Sau khi cảnh báo kêu: sổ tay vận hành

**Sổ tay vận hành (runbook)** là các bước viết sẵn cho "một cảnh báo kêu thì làm gì". Nó không phải hình thức, vì cảnh báo dễ kêu nhất vào lúc bạn không có tinh thần nhất —— nửa đêm, trên đường đi làm, đang làm việc khác.

Một sổ tay vận hành tối thiểu dùng được, mỗi cảnh báo chỉ cần bốn dòng:

```text
Tên cảnh báo: HostDiskSpaceLow
Ý nghĩa: Dung lượng khả dụng của một điểm mount trên máy dưới 15%
Bước một: df -h xác nhận là điểm mount nào, tăng nhanh đến mức nào
Bước hai: tìm thư mục chiếm nhiều nhất: du -sh /srv/minecraft/* | sort -h
        Thủ phạm thường gặp: sao lưu tích tụ, nhật ký chưa luân chuyển, tệp core dump
Bước ba: dọn những nội dung xóa an toàn được (sao lưu quá hạn, nhật ký cũ), xác nhận máy chủ vẫn ghi được đĩa
Bước bốn: nếu không dọn ngay được, hãy dừng các tác vụ ghi đĩa liên tục trước, và thông báo cho người chơi
```

### 7.1 Bốn nguyên tắc xử lý chung

| Nguyên tắc | Vì sao |
| --- | --- |
| **Cắt lỗ trước, tìm nguyên nhân sau** | Khi người chơi còn đang bị ảnh hưởng, hãy khôi phục dịch vụ trước; truy nguyên làm sau |
| **Giữ hiện trường** | Copy nhật ký và trạng thái trước khi khởi động lại, xem [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics) |
| **Đừng chỉ khởi động lại là xong** | Khởi động lại chỉ nạp lại thế giới một lần, **nếu nguyên nhân gốc còn đó, vấn đề sẽ quay lại với tốc độ y như cũ** |
| **Ghi lại quá trình xử lý** | Lần sau cùng cảnh báo đó kêu, thứ bạn cần chính là bản ghi lần này |

### 7.2 Một thứ tự xử lý thật

Lấy ví dụ "TPS tụt còn 10", thứ tự hợp lý là: **xác nhận hiện tượng (TPS, MSPT, số người chơi, `uptime`) → phán đoán là phía máy chủ hay phía máy vật lý → phía máy chủ chạy một lần spark profiler lấy cây gọi, phía máy vật lý xem bóp xung CPU, bộ nhớ và I/O đĩa → dùng biện pháp ứng phó trước để người chơi chơi được → cuối cùng nhìn lại và bổ sung một mục giám sát**. Căn cứ của hai bước đầu xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

## 8. Máy chủ tại nhà giám sát thế nào

Khác biệt giữa máy chủ tại nhà và môi trường phòng máy chủ yếu nằm ở chỗ **nó có một đống việc mà phòng máy đã giải quyết hộ bạn**: điện lưới, điều hòa, kiểm soát ra vào, người trực. Bối cảnh liên quan xem [Mở máy chủ trên máy tính gia đình và bảo trì](/tutorials/ops/home-hosting).

### 8.1 Phát hiện mất điện và tự động tắt máy: NUT

Sự cố điển hình nhất của máy chủ tại nhà là **điện lưới bị cắt**. Nó khác "máy chủ sập": sập thường không làm hỏng bản lưu, còn **mất điện cứng trong lúc đang ghi có thể để lại tệp ghi dở**, nhẹ thì mất chunk, nặng thì bản lưu không nạp được. Nên định vị của UPS là "tranh thủ thời gian tắt an toàn", và **NUT (Network UPS Tools)** là phương án giám sát phổ biến nhất trên Linux: nó chia ba tầng —— **driver giao tiếp với UPS, `upsd` là phía dịch vụ, `upsmon` là client giám sát**, `upsmon` đọc trạng thái từ `upsd` và kích hoạt tắt máy khi cần. Lệnh đọc trạng thái là `upsc` (client chỉ đọc):

```bash
upsc -l                       # liệt kê mọi tên UPS đã cấu hình
upsc myups                    # xem mọi biến của một UPS
upsc myups ups.status         # chỉ xem trạng thái: OL điện lưới / OB ắc quy / LB ắc quy yếu
upsc myups battery.charge     # phần trăm điện còn lại
upsc myups battery.runtime    # số giây trụ dự kiến
```

Nối trạng thái UPS vào cảnh báo rất đơn giản: phán đoán `ups.status` có chứa `OB` (on battery) hay không —— **khi không lấy được trạng thái thì đừng bỏ qua trong im lặng**, mà nên cảnh báo theo "không xác định".

:::warn Chi tiết của NUT thay đổi theo bản phân phối và phiên bản
Tên gói và tên dịch vụ khác nhau giữa các bản phân phối (dòng Debian phổ biến là `nut-server`, `nut-client`, dòng RHEL phổ biến là `nut-server`, `nut-monitor`), thư mục cấu hình cũng có hai loại `/etc/nut/` và `/etc/ups/`; **từ NUT 2.8.0, `master`/`slave` được đổi tên thành `primary`/`secondary`**, cách viết cũ vẫn được chấp nhận để tương thích. Tên biến cũng có thể thay đổi theo driver và model, **hãy dùng `upsc` liệt kê biến thực tế rồi mới viết script**. Cấu hình đầy đủ xem [Rack, switch và UPS](/tutorials/ops/hardware-rack).
:::

### 8.2 Sau khi mất điện có tự khởi động được không, có quá nhiệt không

Giám sát cho bạn biết "mất điện rồi", nhưng **sau khi có điện lại, máy có tự khởi động được hay không phụ thuộc thiết lập BIOS/UEFI**, không liên quan giám sát; mục này phải cấu hình từ lúc lắp máy, nếu không mỗi lần mất điện đều phải tự tay đi nhấn nút nguồn. Môi trường tại nhà cũng không có điều hòa phòng máy, **nhiệt độ cao mùa hè là nguồn sự cố thật**: nhiệt độ CPU và tốc độ quạt đọc được bằng lệnh `sensors` của `lm-sensors`, nhiệt độ ổ cứng thường nằm trong thuộc tính SMART của `smartctl -a`, **đọc được những cảm biến nào tùy mainboard và chip cảm biến**.

:::note Ngưỡng nhiệt độ khác nhau theo phần cứng
Nhiệt độ làm việc bình thường của các CPU khác nhau rất nhiều, **không tồn tại một ngưỡng nhiệt độ cảnh báo dùng chung**. Cách đúng là tra bảng thông số của model bạn dùng, đặt ngưỡng ở vị trí "cao hơn rõ rệt so với hằng ngày, nhưng thấp hơn điểm giảm xung": chạy vài ngày ghi đường cơ sở trước, rồi mới đặt ngưỡng.
:::

Máy chủ tại nhà còn phải để mắt bốn việc: **đường truyền phía trên** (băng thông rộng gia đình sẽ quay lại PPPoE, sẽ dao động tạm thời, chỉ số máy chủ bình thường nhưng người chơi mất kết nối hết), **IP công cộng thay đổi** (khi không có IP tĩnh, cập nhật DDNS thất bại sẽ khiến người chơi không kết nối được), **thuộc tính SMART của ổ đĩa** (ổ dùng tại nhà không có thiết kế dư thừa như ổ doanh nghiệp, phát hiện sớm sector hỏng có thể cứu được một lần dữ liệu), **ngủ và ngủ đông** (hệ thống vào chế độ ngủ là máy chủ dừng, phải xác nhận các thiết lập liên quan đã tắt).

## 9. Thứ tự triển khai và danh sách kiểm tra

Đừng cài cả bộ stack trong một lần. Hãy làm theo thứ tự này, mỗi bước đều tự tạo ra giá trị: **dò từ bên ngoài + một kênh thông báo** (giải quyết "máy chủ sập mà không ai biết") → **systemd `OnFailure` và `Restart=`** (tự phục hồi và thông báo khi dịch vụ sập) → **một script kiểm tra sức khỏe bằng cron** (đĩa sắp đầy, tiến trình biến mất) → **node_exporter + Prometheus + Grafana** (thấy xu hướng, trả lời được "bắt đầu xấu đi từ khi nào") → **quy tắc cảnh báo + Alertmanager** (từ "xem đồ thị" thành "được thông báo") → **viết sổ tay vận hành cho từng cảnh báo** (nửa đêm nhận thông báo thì biết phải làm gì).

### 9.1 Danh sách kiểm tra trước khi đưa vào dùng

| Mục kiểm tra | Vì sao bắt buộc xác nhận |
| --- | --- |
| Bản thân giám sát không nằm trên máy bị giám sát | Khi cả máy mất điện, giám sát cục bộ sẽ biến mất theo |
| Kênh thông báo đã thực sự kiểm chứng một lần | Cảnh báo chưa kiểm chứng thì cũng như không có |
| Cảnh báo phân biệt được "liên tục" và "tức thời" | Dùng điều kiện như `for`, nếu không chắc chắn sẽ ồn |
| Mỗi cảnh báo có sổ tay vận hành tương ứng | Nếu không nó chỉ đánh thức bạn dậy |
| Ngưỡng cảnh báo đĩa thấp hơn "đầy" còn dư | Đĩa đầy là loại sự cố phá dữ liệu |
| Sao lưu thất bại sẽ cảnh báo | Sao lưu thất bại không có triệu chứng nào khác |
| Đã giám sát chứng chỉ hết hạn | Chỉ đúng ngày hết hạn mới lộ ra |
| Có cơ chế tạm im khi bảo trì theo kế hoạch | Nếu không mỗi lần khởi động lại là nhận một đống thông báo |
| Có dữ liệu lịch sử để xem lại | Ảnh chụp một điểm không nói được xu hướng |
| Biết vào đâu xem nhật ký và chỉ số | Xem [Đọc nhật ký và tìm nguyên nhân sập](/tutorials/faq/errors) |

### 9.2 Lỗi thường gặp

| Lỗi | Hậu quả |
| --- | --- |
| Chỉ giám sát CPU và bộ nhớ | Bỏ sót ba loại sự cố "không tự kêu": đĩa, sao lưu, chứng chỉ |
| Cảnh báo gắn thẳng vào chỉ số thô | Mỗi dao động tức thời đều thông báo, rất nhanh bị bỏ qua |
| Gửi thông báo tới ba kênh | Cả ba đều không xem nghiêm túc |
| Cài xong là không đụng tới | Ngưỡng thay đổi theo nghiệp vụ, nửa năm sau tất cả mất hiệu lực |
| Chỉ giám sát mà không diễn tập | Đến lúc có sự cố thật mới phát hiện thông báo không gửi được |
| Đặt giám sát trên cùng một máy | Trong lần sự cố cần nó nhất, nó không có mặt |

:::tip Lời khuyên cuối cùng
**Quy mô đúng của hệ thống giám sát là "quy mô bạn sẵn lòng bảo trì".** Một cảnh báo đĩa được đối xử nghiêm túc hữu ích hơn hai mươi bảng bị tắt tiếng. Bắt đầu từ mức tối thiểu dùng được, xảy ra một sự cố thì bổ sung một mục, thực tế hơn là cấu hình đủ rồi bỏ hết.
:::

> Việc cài đặt và cấu hình từng phần mềm lấy tài liệu chính thức làm chuẩn.
