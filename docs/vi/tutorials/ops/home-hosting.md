---
title: Mở máy chủ trên máy tính gia đình và bảo trì
slug: home-hosting
cat: ops
level: 3
order: 9
minutes: 18
tags: [ops, home-hosting, hardware, maintenance, uptime, power, monitoring]
updated: 2026-10-04
draft: false
---

Máy "chủ" đầu tiên của rất nhiều người khi mở máy chủ chính là chiếc máy tính trên bàn của mình. Nó rẻ, hiệu năng tốt, bạn kiểm soát hoàn toàn —— nhưng nó **không được thiết kế để chạy 7x24 giờ**. Bài này nói rõ: máy tính gia đình rốt cuộc có phù hợp để mở máy chủ hay không, và nếu bạn quyết định làm vậy thì **về lâu dài phải bảo trì thế nào mới không xảy ra chuyện**.

Nếu bạn chưa quyết định con đường, hãy xem so sánh ba con đường trong [Triển khai đến môi trường truy cập được](/tutorials/java/deploy).

## 1. Máy tính gia đình rốt cuộc có phù hợp để mở máy chủ không

Trước hết hãy tách "chạy được" và "phù hợp để chạy lâu dài". Máy gia đình chạy máy chủ MC **về hiệu năng thường dư sức** (hiệu năng đơn nhân của CPU desktop hiện đại thường mạnh hơn máy chủ cloud cùng tầm giá), điểm yếu thật sự nằm ở **độ tin cậy, mạng và chi phí vận hành**.

| Khía cạnh | Máy tính gia đình | VPS / máy chủ cloud |
| --- | --- | --- |
| Chi phí một lần | Đã có máy thì gần như bằng không | Không có, nhưng trả theo tháng |
| Chi phí duy trì | **Tiền điện** (xem dưới), mùa hè còn tiền điều hòa | Tiền thuê tháng, cấu hình càng cao càng đắt |
| Hiệu năng đơn nhân | Thường mạnh hơn, cùng tầm giá có ưu thế rõ rệt | Cùng tầm giá yếu hơn |
| IP công cộng | **Phần lớn băng thông rộng gia đình không có IPv4 công cộng** | Thường có sẵn |
| Điện | Nhà mất điện là mất kết nối, cần UPS | Phòng máy có UPS và máy phát |
| Mạng | Băng thông rộng gia đình có đường lên nhỏ, có thể bị nhà mạng bóp băng thông | Băng thông phòng máy lớn và đối xứng |
| Tiếng ồn / nhiệt | Trong phòng của bạn | Trong phòng máy |
| Bị tấn công | Đánh vào IP nhà bạn, ảnh hưởng mạng cả nhà | Đánh vào phòng máy, có thể thêm chống DDoS cao cấp |
| An toàn dữ liệu | Ổ cứng hỏng thì bạn tự chịu | Thường có snapshot, nhưng **nhà cung cấp có thể bỏ trốn** |

### Ai nên dùng thẳng VPS

Người thường xuyên không ở nhà (nhà có chuyện không xử lý từ xa được), người chơi đã hơn mười mấy người (băng thông đường lên sẽ không chịu nổi trước), không muốn bị DDoS kéo theo mạng cả nhà, nhạy cảm với tiếng ồn và nhiệt (ký túc xá / ở ghép / phòng ngủ), hoặc người **coi trọng dữ liệu hơn tiết kiệm tiền**, mua thẳng VPS sẽ nhàn hơn.

### Về "24/7": rốt cuộc cái gì đang ngắt nó

Máy gia đình không đạt được trực tuyến 24 giờ, thường không phải vì phần cứng kém, mà vì những thứ này:

| Nguồn gián đoạn | Mô tả | Cách giảm thiểu |
| --- | --- | --- |
| Hệ thống ngủ / ngủ đông | Kế hoạch nguồn mặc định sẽ ngủ khi rảnh, **máy chủ mất kết nối ngay** | Tắt chế độ ngủ (xem mục 2) |
| Mất điện | Nguyên nhân mất kết nối phổ biến nhất, và **có thể làm hỏng bản lưu** | UPS + BIOS tự bật khi có điện |
| Hệ thống tự cập nhật rồi khởi động lại | Windows mặc định tự khởi động lại ban đêm | Đặt giờ hoạt động / tự sắp xếp khung khởi động lại |
| Router khởi động lại hoặc quay số mất kết nối | Phổ biến với băng thông rộng gia đình | Kiểm tra định kỳ; DDNS ứng phó IP thay đổi |
| Quá nhiệt giảm xung hoặc tắt máy bảo vệ | Bụi bít, quạt ngừng quay | Vệ sinh bụi, giám sát nhiệt độ |
| Chính bạn lỡ tay | Đá vào vỏ máy, rút nhầm phích | An toàn vật lý (xem mục 8) |

:::warn Một lần tắt máy bất ngờ có thể đắt hơn bạn nghĩ
Mất điện đúng lúc máy chủ đang ghi chunk, trường hợp xấu nhất là **hỏng bản lưu**, chỉ còn cách quay về bản sao lưu khả dụng gần nhất. Nên mục 2 và [Sao lưu và khôi phục](/tutorials/java/backup) đi thành bộ: **bảo vệ nguồn điện và sao lưu không thể thiếu cái nào**.
:::

### Tiền điện: tính một lượt rồi hãy quyết định

Tiền điện = công suất (kW) x thời gian (h) x giá điện (tệ/kWh). Đo thực tế bằng đồng hồ công suất (hoặc ổ cắm đo công suất) là chính xác nhất, dưới đây là **ước lượng bậc độ lớn**, thực tế khác rất nhiều:

| Tình huống | Công suất cả máy (bậc độ lớn) | Mỗi tháng (30 ngày) |
| --- | --- | --- |
| Máy nhỏ công suất thấp / laptop | 10 - 25 W | 7 - 18 kWh |
| Máy desktop chờ / tải nhẹ | 40 - 80 W | 29 - 58 kWh |
| Máy desktop chạy full tải liên tục (CPU xung cao + card rời chạy không tải) | 120 - 250 W | 86 - 180 kWh |

Lấy số kWh ở trên nhân với giá điện địa phương của bạn là ra chi phí tháng. **Card đồ họa rời ở trạng thái chờ cũng tốn điện** (thường 5 - 20 W, tùy model), nếu chỉ dùng để chạy máy chủ có thể cân nhắc dùng GPU tích hợp hoặc tháo card rời. Điều hòa vào mùa hè sẽ **khuếch đại lượng nhiệt này lên một đến hai lần** tiền điện làm mát.

## 2. Độ ổn định nguồn điện

### Vì sao "mất điện giữa lúc đang ghi bản lưu" rất nguy hiểm

Chunk của MC được **ghi thành từng tệp riêng**, mất điện trong lúc ghi có thể để lại **tệp ở trạng thái ghi dở**. Khi khôi phục, nhẹ thì mất vài chunk, nặng thì bản lưu không nạp được. Dù có `save-all` cũng không bảo đảm mọi tệp trên đĩa ở trạng thái nhất quán ngay lúc mất điện. **Đó chính là lý do UPS và sao lưu tồn tại** —— không phải để "không mất kết nối", mà để **cho máy chủ có cơ hội dừng an toàn**.

### UPS: dùng cho gia đình nên mua loại bao lớn

Mục tiêu của UPS không phải để bạn chơi tiếp vài giờ khi mất điện, mà là **vượt qua các lần chớp điện ngắn + tranh thủ vài phút để máy chủ tắt an toàn**.

Cách ước tính:

1. Đo công suất cả máy `P` (watt).
2. Quyết định thời gian dự phòng cần thiết `T` (phút), dùng cho gia đình **5 - 15 phút** thường là đủ.
3. Dung lượng cần thiết (Wh) ≈ `P x T / 60 / 0.6` (0.6 là hệ số thận trọng cho hiệu suất nghịch lưu và lão hóa ắc quy).
4. Quy đổi sang VA: quan hệ giữa VA danh định và W của UPS tùy hệ số công suất, UPS gia đình thường có PF khoảng 0.5 - 0.6, **hãy lấy W ghi trên nhãn sản phẩm làm chuẩn**.

Ví dụ: cả máy 80 W, muốn trụ 10 phút, thì cần khoảng `80 x 10 / 60 / 0.6 ≈ 22 Wh` dung lượng hiệu dụng, chọn một UPS loại dự phòng danh định **500 - 650 VA / khoảng 300 W** là có dư. **Dung lượng và cổng của từng model lấy theo bảng thông số của hãng**, đừng đặt hàng theo con số kinh nghiệm.

| Loại UPS | Đặc điểm | Phù hợp |
| --- | --- | --- |
| Loại dự phòng (Standby) | Rẻ, khi chuyển có vài mili giây gián đoạn | Máy nhỏ gia đình, nguồn điện tốt |
| Loại tương tác trực tuyến (Line-Interactive) | Có ổn áp AVR, chuyển nhanh hơn | Khu vực điện áp không ổn định, được khuyến nghị |
| Loại trực tuyến (Online / Double-Conversion) | Nghịch lưu cấp điện toàn thời gian, đầu ra sạch nhất, đắt nhất, tỏa nhiệt nhiều nhất | Thiết bị cực kỳ nhạy với nguồn điện |

### Vì sao "sóng sin thuần" quan trọng

Nguồn có PFC chủ động (Active PFC) **nhạy với dạng sóng đầu vào**. UPS xuất sóng vuông / sóng bậc thang (mô phỏng sin) có thể khiến nguồn PFC chủ động **nhận dạng sai, phát tiếng lạ, thậm chí tắt máy ngay** —— đúng vào lúc mất điện, lúc bạn cần nó hoạt động nhất. Vì vậy:

- Xác nhận đầu ra UPS là **sóng sin thuần (Pure Sine Wave)**, chứ không phải "sin mô phỏng / sóng bậc thang";
- Nếu công suất cả máy gần giới hạn trên của UPS thì rủi ro càng lớn;
- Khả năng tương thích cụ thể **tùy model nguồn và model UPS**, không thể nói chung, trước khi mua hãy xem mô tả của hãng.

:::tip Nhân tiện mua một ổ cắm có chống xung điện (Surge Protection)
Sét đánh và xung điện lưới là một loại sát thủ khác. UPS thường có sẵn chống xung điện, nếu không dùng UPS thì ít nhất phải dùng ổ cắm chống xung đạt chuẩn.
:::

### Để hệ thống không bao giờ ngủ

**Windows (PowerShell hoặc CMD với quyền quản trị)**

```bat
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change disk-timeout-ac 0
```

- `standby-timeout-ac 0` nghĩa là **không bao giờ vào chế độ ngủ khi dùng điện lưới** (`0` tức là "không bao giờ").
- Máy desktop thường không có pin, `-ac` (điện lưới) chính là mục bạn cần sửa; **laptop** còn phải sửa `-dc` (pin), nếu không rút điện ra vẫn ngủ như thường.
- Xem cài đặt hiện tại: `powercfg /query SCHEME_CURRENT SUB_SLEEP`.
- **Lưu ý**: "Khởi động nhanh" và "ngủ đông" của Windows là chuyện khác, chính sách doanh nghiệp hoặc phần mềm quản lý nguồn của hãng có thể ghi đè các giá trị này.

**Linux (systemd)**

Trước hết xem những target nào được "cho phép" kích hoạt:

```bash
systemctl status sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Chặn hệ thống ngủ:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

**Gập nắp laptop** do logind xử lý, sửa `/etc/systemd/logind.conf`:

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Sửa xong chạy `sudo systemctl restart systemd-logind` để có hiệu lực.

:::warn Tên khóa cụ thể và giá trị mặc định khác nhau theo bản phân phối và phiên bản systemd
Các giá trị khả dụng của `logind.conf` (`ignore` / `poweroff` / `suspend` / `hibernate` / `lock`) và hành vi mặc định không hoàn toàn giống nhau giữa các bản phân phối và phiên bản systemd, **trước khi sửa hãy đọc `man logind.conf`**, và xác nhận thay đổi không bị phần quản lý nguồn của môi trường desktop ghi đè. Các bản desktop (GNOME/KDE) thường còn có công tắc riêng "treo máy sau khi màn hình tắt".
:::

### BIOS: tự bật máy sau khi có điện trở lại

Sau khi điện trở lại, máy **mặc định không tự bật**, bạn phải tự tay nhấn nút nguồn —— nếu bạn đang ở xa thì dịch vụ sẽ dừng luôn.

Vào BIOS/UEFI, tìm các mục có tên tương tự dưới đây (**tên khác nhau theo hãng mainboard và phiên bản BIOS**, thường nằm trong mục `Power` / `Advanced` / `APM Configuration`):

| Tên thường gặp | Tác dụng |
| --- | --- |
| `Restore on AC Power Loss` | Hành vi sau khi có điện, chọn `Power On` / `Always On` |
| `AC Power Recovery` / `AC Recovery` | Như trên, Dell và một số hãng hay dùng tên này |
| `After Power Failure` | Như trên, thường gặp ở mainboard DIY |

Chọn **`Power On` / `Always On`** (đừng chọn `Last State`: nếu lúc mất điện máy đang bật thì nó cũng bật, nhưng nếu lần trước là đang tắt thì sẽ không bật).

Kiểm tra kèm theo:

- **Tắt "Khởi động nhanh"** (Fast Startup của Windows khiến tắt máy thành ngủ đông hỗn hợp, ảnh hưởng việc tự bật và tính nhất quán của đĩa);
- **Đặt mật khẩu superuser BIOS**, phòng sửa nhầm;
- Nếu máy phải chạy không người trực lâu dài, **bật tự khởi động khi có điện + tắt mọi tùy chọn "chờ tiết kiệm điện"**.

## 3. Tản nhiệt và bụi

### Luồng gió và cách đặt máy

- **Đầu vào gió phải có lưới lọc, đầu ra gió phải thông thoáng**. Bố trí hiệu quả phổ biến: gió vào phía trước / đáy, gió ra phía sau / đỉnh, giữ **lượng gió vào hơi lớn hơn lượng gió ra** (áp suất dương), bụi ít lọt qua khe hơn.
- **Đừng nhét vào tủ kín**, đừng sát tường, đừng đặt trên thảm. Chừa khoảng trống quanh máy.
- **Ổ cứng sợ nhất là rung động**: ổ cơ đừng đặt ở vị trí dễ bị đá, bị va (xem mục 8).

### Vệ sinh bụi

| Tần suất | Làm gì |
| --- | --- |
| Mỗi 1 - 3 tháng | Kiểm tra lưới lọc gió vào, thấy bụi rõ thì vệ sinh |
| Mỗi 3 - 6 tháng | Dùng khí nén / máy thổi bụi vệ sinh tản nhiệt, quạt, cửa gió vào của nguồn |
| Mỗi 6 - 12 tháng | Tùy mức bụi để quyết định có tra lại keo tản nhiệt hay không (**không bắt buộc**, nhiệt độ bình thường thì đừng động vào) |

Điểm cần chú ý khi vệ sinh bụi: **khi thổi quạt hãy dùng tay hoặc miếng nhựa chặn cánh quạt**, đừng để luồng khí làm quạt quay không tải tốc độ cao (có thể hỏng vòng bi); đừng dùng máy hút bụi áp sát bo mạch (nguy cơ tĩnh điện); sau khi vệ sinh **xác nhận mọi quạt đều quay** (gồm quạt nguồn, card đồ họa, vỏ máy).

### Giám sát nhiệt độ

**Linux**: `lm-sensors` là công cụ phổ biến để đọc cảm biến nhiệt độ mainboard/CPU. Có dùng được hay không, đọc được những cảm biến nào **tùy mainboard và trình điều khiển chipset**, một số nền tảng (nhất là laptop mới và một số mainboard) hỗ trợ không đầy đủ.

```bash
sudo apt install lm-sensors      # Debian / Ubuntu
sudo dnf install lm_sensors      # Fedora / dòng RHEL
sudo sensors-detect              # dò cảm biến khả dụng, trả lời tương tác
sensors                          # in ra số đọc hiện tại
watch -n 5 sensors               # làm mới mỗi 5 giây
```

**Windows**: trang "Hiệu năng" của Task Manager (`Ctrl+Shift+Esc`) có thể xem nhiệt độ CPU/GPU (**khả dụng tùy phần cứng và trình điều khiển**); cần số đọc chi tiết hơn (từng nhân, nhiệt độ SMART của ổ cứng, tốc độ quạt) thì dùng các công cụ như HWiNFO, HWMonitor.

### Biểu hiện quá nhiệt

| Hiện tượng | Ý nghĩa |
| --- | --- |
| TPS đột ngột giảm nhưng mức dùng CPU không cao | CPU bị giảm xung (thermal throttling) |
| Xung CPU thấp hơn xung cơ bản | Như trên, dùng `lscpu`/`cpupower` hoặc HWiNFO xem xung thời gian thực |
| Quạt chạy full tải lâu dài, tiếng to hơn | Bụi tích hoặc keo tản nhiệt lão hóa |
| Tắt máy / khởi động lại không lý do | Đã kích hoạt bảo vệ quá nhiệt, **đây là tín hiệu nghiêm trọng**, phải xử lý ngay |

Trong `dmesg` xuất hiện các thông tin như `CPU0: Core temperature above threshold`, `thermal throttling` nghĩa là đã kích hoạt bảo vệ. **Nội dung nhật ký cụ thể khác nhau theo nhân và phần cứng**, lấy đầu ra thực tế trên máy bạn làm chuẩn.

## 4. Mạng gia đình

### Vì sao Wi-Fi không phù hợp để mở máy chủ lâu dài

- **Dao động độ trễ (jitter) chí mạng hơn độ trễ trung bình**: MC nhạy với mất gói và dao động, người chơi sẽ thấy "bật ngược", "lag", "dịch chuyển tức thời".
- **Nhiễu kênh và Wi-Fi hàng xóm chật kênh**, buổi tối càng rõ.
- **Cơ chế tiết kiệm điện**: card mạng không dây sẽ vào chế độ tiết kiệm điện, gây đỉnh độ trễ theo chu kỳ.
- **Độ ổn định**: AP khởi động lại, lỗi firmware đều gây mất kết nối.

**Kết luận: cắm được dây mạng thì cắm dây mạng.** Nếu máy ở xa router, dùng bộ chuyển qua đường điện (chịu ảnh hưởng lớn của mạch điện), MoCA (cáp đồng trục) hoặc kéo hẳn một sợi dây mạng. Ba mục dưới nói rõ ba cái bẫy phổ biến nhất của băng thông rộng gia đình.

### Có IP IPv4 công cộng hay không: phán đoán thế nào

1. Đăng nhập router, tìm **IP cổng WAN**.
2. Trên máy, vào một trang tra "IP của tôi", hoặc chạy `curl -4 ifconfig.me`.
3. **Hai cái không khớp nhau**: nhiều khả năng bạn đang ở sau NAT của nhà mạng (CGNAT), **không có IPv4 công cộng**, có làm port mapping cũng vô ích.
4. Phán đoán bổ sung: IP WAN của CGNAT thường nằm trong dải `100.64.0.0/10` (không gian địa chỉ chia sẻ RFC 6598). **Đây không phải quy tắc cứng**, chỉ là đặc điểm thường gặp.

:::warn IPv6 là một con đường khác, nhưng không phải thuốc vạn năng
Một số khu vực băng thông rộng gia đình có IPv6 công cộng, về lý thuyết có thể kết nối trực tiếp, nhưng **môi trường mạng của người chơi không nhất thiết hỗ trợ IPv6**, nhiều client vẫn đi IPv4. Phương án chủ yếu dựa vào IPv6 phải xác nhận tính khả dụng phía người chơi.
:::

### IP động và DDNS

IP công cộng của băng thông rộng gia đình **sẽ thay đổi** (quay số lại, nhà mạng điều chỉnh). DDNS (phân giải tên miền động) giải quyết chính việc này:

1. Đăng ký một dịch vụ DDNS (hoặc dùng API của nhà bán tên miền).
2. Chạy client cập nhật trên router hoặc trên máy, **định kỳ báo IP công cộng hiện tại** lên DDNS.
3. Người chơi kết nối bằng **tên miền** chứ không phải IP.

Điểm cần chú ý:

- **DDNS chỉ giải quyết "IP đổi thì tìm bạn thế nào"**, không giải quyết được CGNAT —— không có IP công cộng thì DDNS cũng vô ích.
- Khoảng cập nhật đừng quá ngắn (sẽ bị giới hạn tần suất), vài phút một lần thường là đủ.
- Nếu bạn dùng xuyên thấu mạng nội bộ (frp, v.v.), cửa vào của người chơi là **IP của máy chủ trung chuyển**, khi đó DDNS không cần thiết nữa.

### Băng thông đường lên mới là nút thắt

Băng thông rộng gia đình thường **đường xuống vài trăm megabit, đường lên vài chục megabit hoặc ít hơn**. Lưu lượng của máy chủ MC gần như toàn bộ là **đường lên** (gửi dữ liệu thế giới cho người chơi).

Ước tính thô: nhu cầu băng thông của một người chơi khi chơi bình thường ở **bậc vài chục đến vài trăm kbps**, tùy khoảng cách hiển thị, số lượng thực thể, tốc độ nạp chunk, **dao động rất lớn**. Quy đổi đơn giản bằng `Mbps`:

| Băng thông đường lên | Giới hạn đồng thời lý thuyết (ước tính thận trọng 0.5 Mbps mỗi người chơi) |
| --- | --- |
| 10 Mbps | Khoảng 20 người |
| 20 Mbps | Khoảng 40 người |
| 50 Mbps | Khoảng 100 người |

**Đây chỉ là tham khảo bậc độ lớn**, thực tế tùy lối chơi (redstone / lượng lớn thực thể / khoảng cách hiển thị cao sẽ làm nhu cầu tăng rõ rệt). Nhất định phải **đo thực tế**: dùng router hoặc công cụ hệ thống quan sát mức chiếm đường lên của tiến trình máy chủ.

:::tip Đo trước rồi mới định giới hạn số người
Sau khi máy chủ chạy một thời gian, dùng `iftop`, `nload` (Linux) hoặc Task Manager / Resource Monitor (Windows) xem mức chiếm đường lên thực tế, rồi mới quyết định chịu được bao nhiêu người. **Đừng ước tính theo "đường xuống của tôi 500M".**
:::

## 5. Quy trình bảo trì hệ điều hành

### Chiến lược cập nhật

- **Cố định một khung bảo trì** (ví dụ mỗi tuần một lần), làm cập nhật hệ thống và khởi động lại trong khung đó.
- **Sao lưu trước khi cập nhật** (xem [Sao lưu và khôi phục](/tutorials/java/backup)), và xác nhận tệp sao lưu nằm ở **đĩa khác hoặc nơi khác**.
- **Đừng bật tự khởi động lại không người trực**: để nó khởi động lại vào thời điểm bạn chọn, chứ không phải nửa đêm.
- Sau khi nâng cấp nhân / phiên bản lớn của hệ thống, **khởi động lại một lần rồi xác nhận máy chủ bình thường**.

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove --purge
```

**Fedora / dòng RHEL**

```bash
sudo dnf upgrade --refresh
sudo dnf autoremove
```

**Windows**: Cài đặt -> Windows Update -> Tùy chọn nâng cao, đặt "giờ hoạt động" ra ngoài khung bảo trì của bạn; cập nhật quan trọng thì tự khởi động lại thủ công.

### Sức khỏe ổ đĩa (SMART)

`smartmontools` là công cụ chuẩn để đọc dữ liệu SMART (`smartctl` là lệnh trong đó).

```bash
sudo apt install smartmontools
sudo smartctl -a /dev/sda
```

:::warn Tên thiết bị nhất định phải xác nhận
`/dev/sda` chỉ là **ví dụ**. Ổ NVMe thường là `/dev/nvme0n1`, ổ SATA có thể là `/dev/sdb`. **Dùng sai tên thiết bị sẽ đọc dữ liệu của ổ khác, thậm chí (khi thao tác ghi) gây phá hỏng.** Trước hết dùng `lsblk` để xác nhận:

```bash
lsblk -o NAME,SIZE,MODEL,MOUNTPOINT
```
:::

**Các thuộc tính cần xem trọng với ổ SATA** (tên và số hiệu thuộc tính do chuẩn ATA/SMART định nghĩa, cách mã hóa giá trị thô có thể khác giữa các hãng, **xem "VALUE/WORST/THRESH" và "RAW" phải kết hợp mô tả của hãng**):

| Thuộc tính | Ý nghĩa | Cách phán đoán |
| --- | --- | --- |
| `Reallocated_Sector_Ct` (ID 5) | Số sector hỏng đã được ánh xạ lại | **Khác 0 là phải cảnh giác**, tăng liên tục nghĩa là ổ đang thoái hóa |
| `Current_Pending_Sector` (ID 197) | Sector đang chờ xử lý (đọc lỗi nhưng chưa ánh xạ lại) | **Bất kỳ giá trị khác 0 nào đều phải sao lưu ngay** |
| `Offline_Uncorrectable` (ID 198) | Sector mà quét ngoại tuyến không sửa được | Khác 0 nghĩa là đã có lỗi không thể khôi phục |
| `UDMA_CRC_Error_Count` (ID 199) | Lỗi kiểm tra truyền dẫn | Tăng thường là **vấn đề dây/cổng**, không phải ổ hỏng |
| `Reported_Uncorrect` (ID 187) | Lỗi không sửa được đã báo cáo | Xem cùng 197/198 |

**Ổ NVMe** xem một nhóm trường khác:

```bash
sudo smartctl -a /dev/nvme0n1
```

Chú ý `Percentage Used` (phần trăm tuổi thọ đã dùng), `Available Spare` (khối dự phòng khả dụng), `Media and Data Integrity Errors`, `Critical Warning`.

**Tự kiểm tra định kỳ** (sẽ chiếm một ít thời gian, nên chạy trong khung bảo trì):

```bash
sudo smartctl -t short /dev/sda     # tự kiểm tra ngắn, thường 1-2 phút
sudo smartctl -t long  /dev/sda     # tự kiểm tra dài, có thể vài giờ
sudo smartctl -l selftest /dev/sda  # xem kết quả tự kiểm tra
```

**Gợi ý giám sát**: `smartd` có thể chạy thường trực và cảnh báo qua email; người dùng desktop ít nhất phải **tự xem mỗi quý một lần**.

### Tuổi thọ SSD

Tuổi thọ SSD do **lượng ghi (TBW)** quyết định, không phải thời gian cắm điện. Sao lưu toàn bộ thường xuyên, ghi nhật ký điên cuồng, `save-all` liên tục đều tiêu hao tuổi thọ. Dùng `Data_Units_Written` (SATA) hoặc `Data Units Written` (NVMe) của `smartctl` để ước tính tổng lượng ghi; **ghi nhật ký và sao lưu ra đĩa khác** có thể giảm rõ rệt lượng ghi lên đĩa hệ thống. SSD gần đầy thì hiệu năng và tuổi thọ đều xấu đi, **hãy chừa ít nhất 10% - 20% dung lượng trống**.

### Kiểm tra hệ thống tệp và nhật ký

- **ext4**: sau khi mất điện bất thường có thể yêu cầu `fsck`. **Đừng chạy `fsck` trên phân vùng gốc khi đang mount**; bản phân phối hiện đại tự kiểm tra khi khởi động. Kiểm tra thủ công phân vùng chưa mount bằng `sudo fsck -f /dev/sdb1` (`umount` trước).
- **Btrfs / ZFS**: có công cụ kiểm tra và làm sạch riêng (`btrfs scrub`, `zpool scrub`), **lệnh và cách dùng cụ thể khác nhau theo phiên bản, lấy tài liệu chính thức làm chuẩn**.
- **Nhật ký tăng trưởng**: dùng `journalctl --disk-usage` xem mức chiếm của nhật ký systemd, dùng `sudo journalctl --vacuum-size=500M` giới hạn kích thước; việc luân chuyển nhật ký do `logrotate` phụ trách, thường mặc định đã cấu hình sẵn.
- **Windows**: Event Viewer sẽ tăng vô hạn, có thể đặt kích thước tối đa và chính sách ghi đè trong "Event Viewer -> Windows Logs -> Properties"; `cleanmgr` có thể dọn tệp hệ thống.

### Dọn bản sao lưu cũ

**Đây là chỗ dễ làm đầy đĩa nhất**: thư mục máy chủ tăng liên tục, nếu chính sách giữ là "giữ tất cả" thì vài tháng là đầy đĩa —— **đĩa đầy sẽ khiến máy chủ ghi bản lưu thất bại**. Xác định rõ chính sách giữ (ví dụ 7 bản mỗi ngày + 4 bản mỗi tuần) và để script tự xóa bản sao lưu quá hạn, định kỳ `df -h` xác nhận dung lượng còn trống. Chi tiết chính sách giữ và cách tính dung lượng đĩa xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).

## 6. Quy trình bảo trì máy chủ trò chơi

### Khởi động lại theo kế hoạch

**Khởi động lại định kỳ** có thể thu hồi phân mảnh bộ nhớ, dọn tài nguyên chưa giải phóng, cách phổ biến là **mỗi ngày hoặc vài ngày một lần**, chọn lúc thấp điểm (rạng sáng). Cách khởi động lại: gửi `stop` qua console (**đừng kill tiến trình trực tiếp**), chờ tiến trình thoát hoàn toàn rồi mới khởi động; **trước khi khởi động lại phải xác nhận sao lưu thành công**. Khi dùng systemd quản lý, `systemctl restart minecraft.service` sẽ đi theo quy trình dừng bình thường (với điều kiện máy chủ nhận được `stop`; nếu cách khởi động không nhận được nhập từ console thì phải chuyển sang dùng `screen`/`tmux` hoặc RCON để gửi lệnh).

:::warn Khởi động lại kiểu ngắt điện trực tiếp rất nguy hiểm
`kill -9`, "End task" trong Task Manager, nhấn thẳng nút nguồn, đều có thể khiến máy chủ không kịp lưu. **Dùng được `stop` thì dùng `stop`.**
:::

### Xác nhận bản sao lưu thực sự đang chạy

**Đây là mục dễ bị bỏ qua nhất và cũng chí mạng nhất trong danh sách bảo trì.** Kiểm tra **thời gian sửa và kích thước của tệp sao lưu** (không phải kiểm tra "script có tồn tại"), kiểm tra **mã thoát trong nhật ký** (khác 0 là thất bại), và định kỳ **thực sự khôi phục một lần** (xem phần diễn tập khôi phục trong [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)).

```bash
ls -lh /backup/mcserver/ | tail -5
tail -20 /var/log/mc-backup.log
```

### Xem nhật ký và báo cáo sự cố

- **`logs/latest.log`**: nhật ký của lần chạy hiện tại / gần nhất. Tìm `WARN`, `ERROR`, `Exception`, `Caused by`.
- **`crash-reports/`**: báo cáo sự cố, gồm đầy đủ stack và thông tin môi trường lúc đó, **là tư liệu trực tiếp để truy nguyên sự cố**.
- Tín hiệu thường gặp: thiếu bộ nhớ (`OutOfMemoryError`), plugin báo lỗi, nạp chunk thất bại, cổng bị chiếm.

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

### Dùng spark xem TPS

**spark** là plugin/mod phân tích hiệu năng phổ biến (dòng Bukkit, Fabric, Forge, v.v. đều có bản tương ứng), có thể lấy mẫu TPS, MSPT và nguồn gây lag. Lệnh thường dùng `/spark tps`, `/spark profiler start` / `/spark profiler stop` (**lệnh con cụ thể lấy tài liệu chính thức của spark làm chuẩn**, các phiên bản hơi khác nhau). **TPS thấp hơn 20 lâu dài nghĩa là máy chủ không theo kịp**, **MSPT liên tục cao hơn 50 ms** cũng nghĩa là một tick bị quá thời gian. Trước hết dùng `/spark tps` phán đoán "có thực sự lag không", rồi dùng profiler tìm "ai đang làm lag"; xử lý toàn diện xem [Tối ưu hiệu năng](/tutorials/java/optimize).

### Quan sát mức tăng bộ nhớ

**Bộ nhớ heap Java không phải "dùng hết là hỏng"**: GC sẽ giữ lại một phần, mấu chốt là xem **thế hệ cũ có hạ xuống được sau Full GC hay không**. Nếu sau Full GC mức chiếm **liên tục tăng lên** và không hạ, rất có thể là **rò rỉ bộ nhớ** (thường gặp ở plugin). Cách xử lý: thêm nhật ký GC (JDK 9+ dùng `-Xlog:gc*`, JDK 8 dùng `-XX:+PrintGCDetails -XX:+PrintGCDateStamps`), hoặc để spark lấy mẫu. **Đừng dùng "tăng -Xmx" để che rò rỉ**, làm vậy chỉ trì hoãn sự cố.

### Cập nhật máy chủ một cách an toàn

Quy trình cố định, đừng bỏ bước nào:

1. **Sao lưu đầy đủ** (bản lưu + plugin + cấu hình), và xác nhận tệp sao lưu tồn tại với kích thước bình thường.
2. **Đọc changelog và xác nhận yêu cầu phiên bản Java**: để ý thay đổi phá vỡ tương thích (đổi định dạng cấu hình, plugin không tương thích, nâng yêu cầu phiên bản Java).
3. **Chạy trên bản sao thử nghiệm trước**: copy một bản thư mục máy chủ, khởi động bằng phiên bản mới, xác nhận khởi động được, plugin tải bình thường.
4. **Chuyển vào lúc thấp điểm**: dừng máy chủ -> thay jar -> khởi động -> quan sát nhật ký -> để người chơi kiểm chứng, và **giữ lại phiên bản cũ** để quay về.

:::tip Trước khi cập nhật hãy viết "phương án quay về" ra
"Nếu phiên bản mới không khởi động được, tôi sẽ chạy những lệnh nào" —— viết rõ ra. Khi có sự cố người ta hoảng, dựa vào trí nhớ dễ sót bước.
:::

## 7. Khác biệt giữa Windows và Linux

| Hạng mục | Windows | Linux |
| --- | --- | --- |
| Chặn chế độ ngủ | `powercfg /change standby-timeout-ac 0` | `systemctl mask sleep.target ...`; laptop cấu hình thêm `logind.conf` |
| Chạy thường trực | Task Scheduler / wrapper loại NSSM / vòng lặp `start.bat` | systemd unit (khuyến nghị) |
| Tác vụ định giờ | Task Scheduler (GUI) | cron / systemd timer |
| Cập nhật | Windows Update, để ý "giờ hoạt động" và tự khởi động lại | `apt` / `dnf`, tự quyết định khi nào khởi động lại |
| Sức khỏe ổ đĩa | Công cụ của hãng + Event Viewer | `smartctl` + `smartd` |
| Nhiệt độ | Task Manager / loại HWiNFO | `lm-sensors` (mức hỗ trợ tùy mainboard) |
| Nhật ký | Event Viewer, phải tự đặt giới hạn | `journalctl` + `logrotate` |
| Phân biệt chữ hoa chữ thường | **Không phân biệt** (`World` và `world` là một) | **Phân biệt** (`World` và `world` là hai cái) |
| Ký tự xuống dòng | CRLF có thể khiến script không chạy được trên Linux | LF |

:::warn Phân biệt chữ hoa chữ thường là cái bẫy kinh điển khi chuyển nền tảng
Copy nguyên thư mục máy chủ đang chạy tốt trên Windows sang Linux, **chữ hoa chữ thường ghi sai trong cấu hình plugin** sẽ lộ ra ngay thành "không tìm thấy tệp". Trước khi chuyển hãy kiểm tra thống nhất một lượt.
:::

## 8. An toàn vật lý

Đặt máy chủ ở đâu quyết định trực tiếp nó có bị gián đoạn hay không:

- **Đừng đặt ở nơi dễ bị đá, vấp dây** (lối đi, chỗ duỗi chân dưới bàn, cạnh giường), cũng đừng đặt gần cốc nước, đồ uống, bể cá, bậu cửa sổ —— nước vào vỏ máy là sự cố mức báo phế.
- **Đừng dùng ổ cắm dễ bị rút nhầm** (ổ chia chung với máy sấy tóc, ấm đun nước đặc biệt nguy hiểm); **đặt vỏ máy cho vững**, ổ cơ đặc biệt sợ rung.
- **Dán nhãn cho dây cáp**: dây nguồn, dây mạng, dây màn hình là sợi nào, ghi rõ, và chống kéo cho đầu dây mạng (cố định đường đi dây).
- Nếu có điều kiện, **tách máy ra khỏi bàn làm việc hằng ngày**, giảm xác suất "tiện tay tắt máy" "tiện tay rút dây".

:::tip Làm một nhãn "cấm cắt điện"
Dán một mẩu giấy lên phích cắm và vỏ máy: "Máy này là máy chủ, xin đừng cắt điện / rút dây". Khi nhà có người khác, mẩu giấy này có giá trị rất cao.
:::

## 9. Lịch bảo trì

Hãy coi bảng dưới đây là yêu cầu tối thiểu, tùy tình hình thực tế mà làm dày hơn hoặc nới lỏng.

| Chu kỳ | Nhiệm vụ |
| --- | --- |
| **Hằng ngày** | Xem một lần máy chủ có trực tuyến không; liếc `logs/latest.log` xem có ERROR không; xác nhận tệp sao lưu tối qua đã được tạo |
| **Hằng tuần** | Kiểm tra dung lượng đĩa còn trống (`df -h`); kiểm tra mã thoát trong nhật ký sao lưu; xem một lần TPS (`/spark tps`); xác nhận không có bản ghi khởi động lại bất thường |
| **Hằng tháng** | Kiểm tra thuộc tính then chốt của SMART (`smartctl -a`); kiểm tra xu hướng bộ nhớ và biểu hiện Full GC; dọn bản sao lưu quá hạn; kiểm tra cập nhật hệ thống và sắp xếp khởi động lại trong khung |
| **Hằng quý** | **Diễn tập khôi phục** (thực sự khôi phục một lần và khởi động kiểm chứng); vệ sinh bụi và kiểm tra quạt; kiểm tra trạng thái ắc quy UPS; rà soát port mapping / DDNS / quy tắc tường lửa; kiểm tra xu hướng tăng dung lượng đĩa và điều chỉnh chính sách giữ |
| **Hằng năm** | Thay ắc quy UPS (tùy model và trạng thái); đánh giá lão hóa phần cứng (thời gian cắm điện của ổ cứng, lượng ghi của SSD); rà lại chính sách giữ và bản sao ở nơi khác còn hiệu lực không |

:::warn Diễn tập khôi phục không phải tùy chọn
"Script sao lưu chạy hằng ngày" và "bản sao lưu khôi phục được" là hai chuyện. **Bản sao lưu chưa kiểm chứng khôi phục thì không tính là sao lưu**, chi tiết xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
:::

## 10. Tóm lại

Mở máy chủ bằng máy tính gia đình **không phải là không được, mà là phải coi "độ tin cậy" như một việc cần chủ động bảo trì**: tắt chế độ ngủ, cấu hình UPS và tự bật khi có điện, cắm dây mạng, cập nhật và kiểm tra đĩa theo chu kỳ, định kỳ thực sự khôi phục một lần bản sao lưu. Làm được những điều này, một chiếc máy gia đình có thể chạy ổn định rất lâu.

Đọc thêm: [Triển khai đến môi trường truy cập được](/tutorials/java/deploy), [Cấu trúc máy chủ](/tutorials/java/structure), [Mở máy chủ](/tutorials/java/start), [Tối ưu hiệu năng](/tutorials/java/optimize), [Sao lưu và khôi phục](/tutorials/java/backup), [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).

> Lệnh và cấu hình lấy tài liệu chính thức của từng phần mềm làm chuẩn; hành vi cụ thể của mainboard, nguồn, UPS lấy bảng thông số của hãng làm chuẩn.
