---
title: Quản lý plugin và loại bỏ lỗi
slug: plugin-manage
cat: java
level: 3
order: 20
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, plugins, plugin-management, security, backdoor, hot-reload]
updated: 2026-10-04
draft: false
---

Plugin trên máy chủ chỉ có thể ngày càng nhiều. Ném một jar vào `plugins/` rất dễ, phiền là phần sau: plugin nào đó cần nâng cấp, plugin nào đó có vấn đề cần tắt tạm, jar nào đó trông không ổn. Bài này nói ba việc: quy trình cài gỡ chuẩn mực, biên năng lực của công cụ nạp nóng, và làm sao phán đoán một plugin có bị người khác động tay vào không.

Nếu bạn chưa từng cài plugin, khuyến nghị xem [Nhập môn plugin](/tutorials/java/plugins) trước.

## 1. Quy trình chuẩn mực khi cài, cập nhật và gỡ

### Cài

1. Xác nhận nguồn đáng tin (xem mục 5), tiện tay ghi lại số phiên bản và địa chỉ tải.
2. **Tắt máy chủ**. Phần lớn plugin lần đầu nạp không hỗ trợ nạp nóng.
3. Sao lưu thư mục `plugins/`, xem [Sao lưu và khôi phục](/tutorials/java/backup).
4. Bỏ `.jar` vào `plugins/`.
5. Khởi động máy chủ và quan sát console, thông tin nạp thành công và thất bại đều in ở đây.
6. Dùng lệnh `plugins` xác nhận trạng thái nạp.
7. Rồi mới sửa cấu hình, sửa xong ưu tiên dùng lệnh con `reload` có sẵn của plugin, chứ không dùng `/reload` bản gốc của máy chủ.

### Cập nhật

Cập nhật dễ xảy ra chuyện hơn cài, vì kết cấu cấu hình của phiên bản mới có thể đã đổi.

| Bước | Điểm chính |
| --- | --- |
| Đọc nhật ký cập nhật | Xác nhận có thay đổi định dạng cấu hình không, có dữ liệu cần chuyển đổi tay không |
| Sao lưu | Ít nhất sao lưu `plugins/<plugin-name>/`, liên quan cơ sở dữ liệu thì sao lưu cả cơ sở dữ liệu |
| Giữ jar cũ | Đổi tên bản cũ thành `.jar.bak` để đó, xác nhận bản mới bình thường rồi mới xóa |
| Tắt máy chủ rồi thay | Đừng ghi đè jar đang dùng khi đang chạy |
| Khởi động lại kiểm chứng | Xem console, rồi dùng `plugins` xác nhận trạng thái |
| Nhảy phiên bản lớn | Khi vượt phiên bản lớn (như 1.20 lên 1.21), plugin có thể cần nâng lên phiên bản trung gian trước |

### Gỡ

Gỡ không chỉ là "xóa cái jar đi".

1. Tắt máy chủ.
2. Dời jar đi.
3. Thư mục dữ liệu **đừng xóa ngay**, trước hết đổi tên thành `<plugin-name>.bak` quan sát một thời gian.
4. Kiểm tra có plugin khác lấy nó làm phần phụ thuộc không, có thì xử lý cùng.
5. Dọn các nút quyền nó để lại trong plugin quyền.
6. Dọn tác vụ định kỳ, lệnh tự định nghĩa, mục bảng điểm mà nó đăng ký.
7. Để ý vật phẩm hoặc khối tự định nghĩa nó để lại trong thế giới, khi thiếu plugin có thể báo lỗi.

:::warn Gỡ không có nghĩa là dọn sạch
Xóa jar chỉ giải quyết bước "nạp". Thư mục dữ liệu, nút quyền, bảng cơ sở dữ liệu, sự phụ thuộc của plugin khác vào nó, đều còn nguyên tại chỗ.
:::

## 2. Công cụ nạp nóng: PlugManX và ServerUtils

Loại công cụ này thường gọi là **plugin quản lý plugin**: chúng nạp, gỡ, nạp lại plugin khác trong khi máy chủ đã chạy.

### PlugManX

Công cụ quản lý plugin lâu đời, tiền thân là PlugMan, hiện do PlugManX được cộng đồng bảo trì tiếp tục cập nhật.

| Mục | Thông tin |
| --- | --- |
| Trang phát hành | SpigotMC tài nguyên 88135 |
| Mã nguồn | Test-Account666/PlugManX trên GitHub (bản cũ là ryan-clancy/PlugMan) |
| Lệnh con thường gặp | `load`, `unload`, `reload`, `list`, `info`, `check` |
| Cách dùng điển hình | `/plugman <subcommand> <plugin-name>` |

Tên lệnh con và tham số cụ thể thay đổi theo phiên bản, lấy thông tin trợ giúp có sẵn của plugin làm chuẩn.

### ServerUtils

| Mục | Thông tin |
| --- | --- |
| Trang phát hành | SpigotMC tài nguyên 79599, Modrinth |
| Mã nguồn | frankheijden/serverutils trên GitHub |
| Nền tảng hỗ trợ | Spigot, BungeeCord, Velocity |

Ngoài quản lý plugin, nó còn kèm vài công cụ xem trạng thái máy chủ… Vì hỗ trợ cả phía proxy, máy chủ nhóm có thể quản lý plugin thống nhất ở tầng proxy, không phải cài mỗi máy chủ phía sau một bộ.

### Biên thật sự của nạp nóng

Nạp nóng không phải "khỏi phải khởi động lại", nó có một loạt việc rõ ràng là không làm được:

| Tình huống | Nạp nóng giải quyết được không |
| --- | --- |
| Chỉ sửa cấu hình | Dùng `reload` có sẵn của plugin là được |
| Tạm tắt plugin có vấn đề | Được, đây là cách dùng giá trị nhất của nạp nóng |
| Đổi phiên bản plugin (đổi jar) | Không khuyến nghị, nên tắt máy chủ rồi thay |
| Plugin đã đăng ký lệnh, quyền, listener, công thức, bộ sinh thế giới, tiến trình | Gỡ xong thường để lại tàn dư, nạp lại dễ lỗi |
| Plugin sửa trực tiếp hiện thực bên trong máy chủ (NMS, reflection) | Cơ bản là không được |
| Plugin giữ kết nối cơ sở dữ liệu, thread pool hoặc nhiều cache tĩnh | Gỡ xong tài nguyên thường không được giải phóng |
| Nạp gỡ cùng một plugin nhiều lần | Class loader không thu hồi được, bộ nhớ tăng liên tục, cuối cùng OOM |
| Nền tảng lai hoặc phía mod | Trình quản lý plugin không quản được mod |
| `/reload` bản gốc của máy chủ | Không khuyến nghị, dễ làm trạng thái plugin rối loạn |

:::warn Máy chủ production đừng chỉ dựa vào nạp nóng
Nạp nóng phù hợp để "tắt tạm một plugin xem vấn đề có mất không" và thử cấu hình nhanh. Cập nhật phiên bản chính thức, thay đổi phụ thuộc, vẫn nên đi theo quy trình tắt máy chủ khởi động lại.
:::

:::tip Cách dùng đúng khi tìm lỗi
Trước hết dùng trình quản lý plugin `unload` plugin vừa cài gần nhất, quan sát hiện tượng có mất không; xác nhận là nó rồi mới tắt máy chủ xử lý chính thức. Cách này nhanh hơn nhiều so với đọc hết nhật ký.
:::

## 3. Đặc điểm thường gặp của plugin backdoor

Plugin là mã bên thứ ba chạy với quyền của máy chủ, một khi bị nhét backdoor thì coi như giao máy chủ vào tay người khác. Mấy tín hiệu dưới đây đáng cảnh giác.

| Tín hiệu | Biểu hiện cụ thể |
| --- | --- |
| Quyền và lệnh bất thường | Trong `plugin.yml` khai báo lệnh nguy hiểm không liên quan chức năng, ví dụ tự cấp OP, thực thi lệnh tùy ý, đọc ghi tệp tùy ý |
| Mã bị làm rối | Tên lớp là chữ cái đơn vô nghĩa hoặc kết cấu `a/b/c`; cả gói bị mã hóa, hoặc dùng class loader tự định nghĩa giải mã nạp lúc chạy |
| Lời gọi lúc chạy đáng ngờ | Khởi tiến trình con (`ProcessBuilder`, `Runtime.exec`), chủ động gọi ra ngoài (`URL.openConnection`, yêu cầu HTTP), sửa thẳng `ops.json`, dùng reflection nạp lớp từ xa |
| Giả dạng "trình cập nhật" | Tuyên bố tự cập nhật, thực tế tải tệp từ máy chủ của tác giả và ghi đè chính nó |
| Nguồn không rõ | Jar được chuyển tiếp trong tệp đính kèm diễn đàn, ổ đĩa mạng, tệp nhóm chat |
| "Plugin cao cấp miễn phí" | Plugin trả phí bị bẻ khóa đóng gói lại, người bẻ khóa thường tiện tay thêm vài thứ |
| Không khớp với nguồn gốc | Tên plugin và số phiên bản giống nhau, nhưng kích thước tệp hoặc hash không khớp, tác giả và địa chỉ web trong `plugin.yml` bị sửa |
| Cấu hình ẩn với tên vô hại | Các tùy chọn mặc định bật như `metrics`, `telemetry`, `update-check`, thực tế đang gửi dữ liệu ra ngoài |

:::warn Đừng chỉ nhìn tên plugin
Plugin backdoor thường mạo danh thẳng tên và số phiên bản của plugin nổi tiếng. Căn cứ phán đoán phải là nguồn của tệp và nội dung thực tế, không phải tên tệp.
:::

## 4. Nguồn tải an toàn

| Kênh | Rủi ro |
| --- | --- |
| Các nền tảng phát hành chính như SpigotMC, Modrinth, Hangar, Bukkit Dev | Thấp, ưu tiên chọn |
| GitHub Releases của chính tác giả | Thấp, chú ý nhận đúng chủ sở hữu kho |
| Trang mua chính thức của plugin trả phí | Thấp, chú ý đừng mua nhầm "mua hộ" |
| Trang tải tổng hợp, trang gương | Trung bình, có thể đóng gói lại, khuyến nghị đối chiếu hash tệp |
| Tệp đính kèm diễn đàn, ổ đĩa mạng, tệp nhóm chat | Cao |
| "Plugin cao cấp miễn phí" trên sàn giao dịch đồ cũ | Rất cao, thuộc vùng tai họa nặng |

Tiêu chuẩn phán đoán thực ra rất đơn giản: **có truy ngược được về đúng tệp do chính tác giả phát hành và đối chiếu được không**. Một plugin xuất hiện trên bao nhiêu trang không chứng minh được nó an toàn.

:::tip Chỉ cài thứ bạn cần
Cài càng ít plugin, bề mặt tấn công càng nhỏ, tìm lỗi cũng càng dễ. Plugin trùng chức năng giữ một cái là đủ.
:::

## 5. Quy trình tìm lỗi khi nghi một plugin

1. **Ghi lại hiện tượng**: bắt đầu từ khi nào, console báo gì, có người chơi phản hồi bất thường không.
2. **Sao lưu trước**: trước khi động vào bất cứ thứ gì hãy sao lưu đầy đủ một lần, gồm `plugins/` và dữ liệu thế giới.
3. **Lập danh sách tình nghi**: những plugin được thêm hoặc cập nhật trong 24 đến 72 giờ gần nhất.
4. **Định vị chia đôi**: tắt máy chủ, vô hiệu hóa một nửa plugin tình nghi, khởi động lại quan sát; hiện tượng mất thì nằm ở nửa bị vô hiệu hóa, nếu không thì ở nửa còn lại.
5. **Tái hiện riêng lẻ**: thu hẹp về một plugin, dùng trình quản lý plugin chỉ `unload` nó, xác nhận hiện tượng có tái hiện không.
6. **Quét tĩnh**: quét một lượt jar theo cách ở mục 6.
7. **Xem tay `plugin.yml`**: đối chiếu `author`, `website`, `main`, `commands`, `permissions`, so với bản chính thức.
8. **Xem danh sách tệp lớp**: giải nén jar, để ý tên lớp vô nghĩa, và những lời gọi đáng ngờ trong bảng trên.
9. **So hash**: so kích thước, so hash với tệp tải chính thức.
10. **Xác nhận độc hại thì vào quy trình ứng cứu**.

Danh sách ứng cứu:

- Kiểm tra `ops.json` và `whitelist.json` có bị sửa không, có tài khoản lạ nào được cấp OP không.
- Kiểm tra có bản ghi đăng nhập bất thường, tệp dữ liệu người chơi lạ không.
- Đổi toàn bộ thông tin xác thực: mật khẩu RCON, mật khẩu panel, mật khẩu cơ sở dữ liệu, khóa SSH.
- Kiểm tra `plugins/` có bị nhét jar khác vào không, jar lõi máy chủ và script khởi động có bị thay không.
- Kiểm tra tác vụ định kỳ ở tầng hệ thống, xác nhận không bị thêm mục tự khởi động.
- Đọc hết nhật ký console và nhật ký plugin, tìm thời điểm backdoor hoạt động lần đầu.
- Tùy tình hình thông báo người chơi và quay lui, trước khi quay lui hãy giữ nguyên hiện trường để phân tích.

## 6. Quét tĩnh bằng McGuard

McGuard (gọi tắt MCG) là công cụ quét tĩnh bên thứ ba, tác giả là huzpsb. Nó có thể quét toàn bộ jar dưới `plugins/` **mà không cần khởi động máy chủ**, tìm ra tệp đáng ngờ.

### Chế độ console

Đặt jar của MCG vào thư mục gốc máy chủ, rồi chạy trong thư mục đó:

```
java -Xmx1G -jar MCG.jar
```

Khởi động xong sẽ nhắc chọn chế độ, thường chọn `0` (chế độ chuẩn) là được, ngoài ra còn chế độ chuyên gia và chế độ nhà phát triển.

Hình thức thể hiện kết quả quét là:

| Tình huống | Kết quả in ra |
| --- | --- |
| Không phát hiện bất thường | Chỉ in quá trình quét, không xuất khối kết quả |
| Phát hiện bất thường | Xuất khối kết quả, kèm mức độ nghiêm trọng và mô tả nguyên nhân từng mục |

Mô tả nguyên nhân sẽ chỉ ra loại hành vi bị khớp, ví dụ "có thể lấy OP bằng cách đặt bit quyền" hoặc "có thể thực thi lệnh từ xa bằng cách khởi tiến trình con".

:::warn MCG chỉ báo cáo, không xử lý
Nó không sửa cũng không xóa plugin nào, bạn phải tự dọn tay. Đồng thời cần chú ý, chế độ chuyên gia dùng đặc trưng mã độc đã biết để khớp và phân tích ý đồ mã, phủ được phần lớn mẫu không cố tình né quét, nhưng vẫn có báo nhầm.
:::

### Chế độ plugin

MCG cũng cài được như plugin Bukkit/Spigot, bảo vệ liên tục trong khi máy chủ chạy. Chính thức nói về định vị của nó là: sự bảo vệ này là tương đối, rất ít plugin độc hại vẫn có thể lách qua kiểm soát hành vi; **đừng vì đã cài MCG mà chạy máy chủ đã biết chứa plugin độc hại**.

:::warn Quét chỉ là phòng tuyến cuối cùng
Công cụ quét nào cũng không thể loại bỏ hết rủi ro, cách làm đúng vẫn là lấy plugin từ kênh chính thức. Nếu muốn chạy lõi máy chủ không rõ nguồn, khuyến nghị quét bằng chế độ console trước, rồi chạy thử trong môi trường cách ly như sandbox (ví dụ Sandboxie).
:::

## 7. Khuyến nghị bảo trì hằng ngày

- Mỗi tháng ít nhất kiểm tra cập nhật plugin một lần, nhất là plugin liên quan trực tiếp đến an toàn như tương thích đa phiên bản và chống gian lận.
- Duy trì một danh sách plugin, ghi tên, phiên bản, nguồn, địa chỉ tải, có vấn đề thì truy ngược nhanh được.
- Tách máy chủ production và máy chủ kiểm thử, plugin mới chạy thử ở máy chủ kiểm thử một thời gian trước.
- Đừng chạy tiến trình máy chủ bằng tài khoản root hoặc Administrator, hãy cho máy chủ một tài khoản riêng có quyền tối thiểu cần thiết.
- Theo dõi issue và thông báo ở kho của tác giả, plugin bị đầu độc thường được bàn luận trong cộng đồng trước.

## Bước tiếp theo

- Thao tác cơ bản khi cài plugin và phần phụ thuộc: [Nhập môn plugin](/tutorials/java/plugins)
- Bị phá hoại xong tra thế nào, chặn thế nào: [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)
- Có sự cố khôi phục thế nào: [Sao lưu và khôi phục](/tutorials/java/backup)
- Cho các phiên bản client khác nhau đều vào được: [Tương thích đa phiên bản](/tutorials/java/via)

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
