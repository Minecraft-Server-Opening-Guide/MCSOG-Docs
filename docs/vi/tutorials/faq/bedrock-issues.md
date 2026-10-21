---
title: Kiểm tra sự cố vận hành máy chủ Bedrock Edition
slug: bedrock-issues
cat: faq
level: 2
order: 5
minutes: 16
tags: [bedrock, troubleshooting, bds, pocketmine, nukkit, network, world, permissions]
updated: 2026-10-04
draft: false
---

"Không lên được / không kết nối được / vào được nhưng không đúng" khi mở máy chủ Bedrock Edition thường trông rất giống nhau: phía người chơi chỉ nói một câu "không vào được", còn phía máy chủ có khi đến tiến trình còn chưa lên. Bài này là bản đi sâu của [[BE] Câu hỏi thường gặp](/tutorials/faq/faq-be), triển khai theo thứ tự "phân loại trước, định vị sau", cố gắng viết rõ tiêu chí phán đoán của từng bước.
:::tip Bài này dùng thế nào
Trước tiên xem bảng phân loại ở mục 1, xác định bạn gặp loại nào, rồi nhảy thẳng đến chương tương ứng. Mục 5 đưa ra một trình tự kiểm tra hoàn chỉnh từ số 0; mục 6 nói khi cần trợ giúp thì nên cung cấp những thông tin gì.
:::

## 1. Phân loại trước: không kết nối được / không lên được / vào được nhưng bất thường

Tiêu chí phân loại là: **tiến trình máy chủ rốt cuộc có đang chạy không, có đang lắng nghe cổng không?**

| Hiện tượng | Thuộc loại nào | Xem mục nào |
| --- | --- | --- |
| Cửa sổ trình khởi động lóe lên rồi mất, hoặc dòng lệnh trở về dấu nhắc ngay | Không lên được | Mục 2 |
| Console tràn ra báo lỗi, tiến trình hoàn toàn không lên | Không lên được | Mục 2 |
| Tiến trình đang chạy, console cũng bình thường, nhưng người chơi không kết nối được | Không kết nối được | Mục 3 |
| Người chơi vào được, nhưng lag, bản lưu bất thường, quyền không đúng | Vào được nhưng bất thường | Mục 4 |
| Một phần người chơi vào được, phần khác không | Không kết nối được | Mục 3 (kiểm tra phiên bản giao thức và nền tảng client trước) |
| Công cụ kiểm tra cổng nói "qua", người chơi vẫn không vào được | Không kết nối được | Mục 3.2 (phần nhiều là công cụ chỉ đo TCP) |
| Hôm qua còn tốt, hôm nay mọi người đều không vào được | Không kết nối được | Mục 3.1 (client tự động cập nhật đổi giao thức) |
| Máy chủ lên được, nhưng chơi vài phút thì tự thoát | Vào được nhưng bất thường | Mục 4.1, 4.2 |
:::note Xác nhận trạng thái tiến trình trước, rồi mới nói chuyện khác
Đường kiểm tra của "không kết nối được" và "không lên được" hoàn toàn khác nhau. Bước đầu tiên luôn là xác nhận tiến trình còn đó, còn lắng nghe cổng (mục 5). Bỏ qua bước này thì mọi phán đoán phía sau chỉ là đoán.
:::

## 2. Máy chủ không lên (BDS và lõi bên thứ ba)

### 2.1 BDS: kiến trúc, thư viện chạy và yêu cầu hệ thống

BDS là chương trình **biên dịch native**, không phải script, nên nó kén hệ điều hành và thư viện chạy.

| Mục | Yêu cầu | Mô tả |
| --- | --- | --- |
| Kiến trúc | **x86-64** | Chính thức chỉ cung cấp bản dựng x86-64 cho Windows và Linux; thiết bị ARM (như Raspberry Pi) không nằm trong phạm vi hỗ trợ chính thức |
| Windows | Windows 10 10.0.15063 trở lên, hoặc Windows Server 2016 trở lên | Đồng thời cần **thư viện chạy Microsoft Visual C++** (VC++ Redistributable) |
| Linux | Chính thức chỉ hỗ trợ **Ubuntu 22.04 trở lên** | Các bản phân phối x86-64 khác chỉ cần đủ thư viện cũng chạy được, trong đó có **glibc 2.35 trở lên** |
| Bộ nhớ | Tối thiểu 4 GB | Trên 10 người chơi thường cần nhiều hơn; đĩa nên dự trữ 1 GB |

Về biểu hiện điển hình khi thiếu thư viện chạy: trên Windows BDS phụ thuộc thư viện chạy Microsoft Visual C++, **khi thiếu thường là báo thiếu một DLL nào đó ngay lúc khởi động, hoặc cửa sổ lóe lên rồi thoát**, console thường không có gì; trên Linux khi phiên bản glibc thấp, thường gặp là **nạp thư viện động thất bại** (kiểu `error while loading shared libraries`). Phiên bản thư viện chạy và libc cụ thể hãy lấy **trang tải chính thức của BDS và release notes** làm chuẩn, đừng chép số phiên bản trong hướng dẫn của bên thứ ba.
:::warn BDS không thể chỉ định bộ nhớ như Java Edition
Java Edition có thể dùng `-Xms` / `-Xmx` kiểm soát kích thước heap, **BDS không có tham số khởi động tương ứng**. Nó tự quản lý bộ nhớ, bạn chỉ có thể gián tiếp kiểm soát mức chiếm bằng cách giới hạn quy mô thế giới, số thực thể và số người chơi. Nên kiểu khuyến nghị "thêm tham số bộ nhớ cho BDS" là vô hiệu.
:::

### 2.2 Linux: quyền thực thi và thư mục làm việc

Hai nguyên nhân "không lên được" phổ biến nhất trên Linux đều ở mức thao tác. **Một là không có quyền thực thi** —— `bedrock_server` giải nén từ gói nén mặc định không có `+x`:

```bash
chmod +x bedrock_server
```

**Hai là thư mục làm việc không đúng** —— cách dùng chính thức của BDS là **chạy trong thư mục của chính nó**, và cho đường dẫn tìm thư viện động trỏ đến thư mục hiện tại:

```bash
cd /opt/bedrock-server
LD_LIBRARY_PATH=. ./bedrock_server
```

**Dữ liệu của BDS toàn bộ lưu trong thư mục làm việc**, và nó kỳ vọng các tệp ban đầu giải nén ra nằm ngay đó. Vì vậy: khi khởi động bằng systemd hoặc cách khác, nhất định phải đặt `WorkingDirectory`, nếu không thư mục làm việc của tiến trình có thể là `/`; chạy tệp nhị phân từ thư mục khác thì nhẹ là sinh ra một bộ cấu hình và thế giới mới trong thư mục sai, nặng là không tìm thấy thư viện cùng thư mục nên khởi động thất bại luôn. Còn chú ý dấu `.` trong `LD_LIBRARY_PATH=.` chỉ **thư mục làm việc hiện tại**, không phải thư mục chứa tệp nhị phân.
:::tip Lệnh đầu tiên để kiểm tra "không lên được"
Chạy thủ công một lần `LD_LIBRARY_PATH=. ./bedrock_server` trong thư mục máy chủ, đọc hết báo lỗi nguyên bản. Rất nhiều vấn đề lộ ra ngay ở bước này, nhanh hơn lục nhật ký nhiều.
:::

### 2.3 Cái bẫy của đổi tên và đường dẫn

Chương trình chính của BDS có thể đổi tên, nhưng **không khuyến nghị**. Sau khi đổi tên, mọi chỗ tham chiếu đến nó đều phải đổi theo: script khởi động (`.bat` / `.sh`), lối tắt trên desktop, lệnh khởi động cấu hình trong bảng điều khiển hoặc tiến trình giám sát, và cả chính lệnh `LD_LIBRARY_PATH=. ./bedrock_server` ở mục 2.2. Bỏ sót bất kỳ chỗ nào, kết quả là "bấm không phản ứng" hoặc "báo không tìm thấy tệp". Nếu đã đổi tên mà không lên được, hãy đổi về tên cũ để kiểm tra trước, rồi mới quyết định có sửa từng chỗ không.

Chỗ cũng dễ gặp vấn đề là **bản thân đường dẫn**: thư mục máy chủ nên đặt ở đường dẫn thuần tiếng Anh, không dấu cách, không ký tự đặc biệt. Đường dẫn tiếng Trung trên một số bảng điều khiển và script khởi động sẽ khiến đọc thất bại, và báo lỗi thường rất khó hiểu.

### 2.4 Họ Nukkit: căn phiên bản Java và bản dựng

Họ Nukkit (Nukkit / PowerNukkitX v.v.) là chương trình **Java**, cần xác nhận hai điểm:

- **Phiên bản Java có đủ không**: nhánh mới thường yêu cầu Java khá mới, cài quá cũ sẽ ném lỗi kiểu `UnsupportedClassVersionError` ngay lúc khởi động, trong báo lỗi thường ghi thẳng phiên bản nó cần, **lấy tài liệu chính thức của lõi đó làm chuẩn**.
- **Số bit có đúng không**: hệ thống 64 bit bắt buộc phải dùng Java 64 bit. Java 32 bit sẽ sụp lúc khởi động hoặc giữa chừng do giới hạn bộ nhớ.

Khó thấy hơn là **bản dựng và phiên bản giao thức không khớp**: bản thân bản dựng của lõi khởi động được, nhưng client không kết nối được, hoặc báo máy chủ phiên bản quá cũ. Lớp này hãy xem trước [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup), ở đó có giải thích căn phiên bản đầy đủ.

### 2.5 PocketMine-MP: phiên bản PHP và extension

PMMP là chương trình **PHP**, yêu cầu chính thức của nó là: **CPU 64 bit + hệ điều hành 64 bit**, bộ nhớ từ 1 GB; hai nhân trở lên chỉ là **khuyến nghị** chứ không bắt buộc; chính thức cố gắng hỗ trợ Windows, Linux, macOS, về nguyên tắc nền tảng nào chạy được PHP 64 bit và đủ extension đều được.

Hai cái bẫy dễ vấp nhất: **phiên bản PHP và extension** —— PMMP cần một phiên bản PHP cụ thể cùng một bộ extension, phiên bản không đúng hoặc extension chưa nạp thì khởi động sẽ báo lỗi, loại thường gặp là một extension PHP nào đó nạp thất bại (ví dụ `opcache`); **cụ thể cần những extension nào, phiên bản PHP tối thiểu là bao nhiêu, lấy mục Setup requirements trong tài liệu chính thức của PMMP làm chuẩn**. **Đừng tiện tay dùng PHP có sẵn của hệ thống** —— PHP trong kho của bản phân phối thường khá cũ, thiếu extension, trên Windows cũng có thể có PHP do phần mềm khác để lại; PMMP chính thức cung cấp **runtime PHP đóng gói cho từng hệ điều hành** (trong trang phát hành chọn tệp theo hệ điều hành), giải nén là dùng được. **Khuyến nghị dùng PHP đóng gói chính thức, chứ không phải PHP hệ thống bất kỳ.**
:::warn Trước tiên xác nhận bạn đang gọi PHP nào
Chạy `php -v`, xác nhận trong đầu ra là phiên bản và số bit bạn định dùng. Nếu trong script khởi động ghi `php` trần, nó đi theo cái đầu tiên trong `PATH`, rất có thể không phải cái bạn cài.
:::

### 2.6 Cổng bị chiếm

Biểu hiện của xung đột cổng là: tiến trình khởi động xong thoát ngay, console báo không bind được cổng.

Có một **cái bẫy riêng của Bedrock Edition**: `enable-lan-visibility` trong `server.properties` mặc định bật, tác dụng là phản hồi client tìm máy chủ trong mạng LAN. Khi bật, **dù bạn đã đổi `server-port` / `server-portv6` sang giá trị khác, máy chủ vẫn sẽ bind 19132 / 19133 mặc định**. Nên khi mở máy chủ Bedrock thứ hai trên cùng một máy, dù đã đổi cổng vẫn có thể xung đột; nếu không cần phát hiện mạng LAN thì có thể tắt tùy chọn này để tránh, hành vi cụ thể lấy tài liệu chính thức làm chuẩn. Ngoài ra chú ý phạm vi hợp lệ của `server-port` là số nguyên **1–65535**.

### 2.7 Viết sai server.properties

`server.properties` của Bedrock là **văn bản `key=value` từng dòng**, dòng bắt đầu bằng `#` là chú thích. Viết sai kiểu hoặc giá trị vượt phạm vi có thể khiến khởi động thất bại, hoặc tùy chọn bị bỏ qua mà "sửa rồi không có hiệu lực". Vài giá trị hợp lệ đã xác nhận có thể đối chiếu trực tiếp:

```properties
server-port=19132
server-portv6=19133
allow-list=true
gamemode=survival
difficulty=easy
default-player-permission-level=member
tick-distance=4
view-distance=32
max-players=10
compression-algorithm=zlib
```

| Khóa | Giá trị / phạm vi hợp lệ |
| --- | --- |
| `server-port` / `server-portv6` | Số nguyên 1–65535 |
| `allow-list` | `true` / `false` |
| `gamemode` | `survival` / `creative` / `adventure` |
| `difficulty` | `peaceful` / `easy` / `normal` / `hard` |
| `default-player-permission-level` | `visitor` / `member` / `operator` |
| `tick-distance` | Số nguyên 4–12 |
| `view-distance` | Số nguyên lớn hơn hoặc bằng 5 |
| `max-players` | Số nguyên dương |
| `compression-algorithm` | `zlib` / `snappy` |
:::warn Sao lưu trước khi sửa, và dùng trình soạn thảo văn bản thuần
Sửa bằng **trình soạn thảo văn bản thuần** như Notepad, đừng dùng trình soạn thảo có chèn định dạng (ví dụ phần mềm văn phòng có rich text), nếu không sẽ ghi vào ký tự vô hình khiến phân tích thất bại. Trước khi sửa hãy sao chép một bản `server.properties`. Một giá trị rốt cuộc cho phép gì, **lấy tài liệu chính thức làm chuẩn**.
:::

## 3. Không kết nối được (cannot connect)

### 3.1 Giao thức / phiên bản không khớp

Đây là nguyên nhân không kết nối được **phổ biến nhất** của Bedrock Edition, và phía người chơi gần như không có dư địa tự cứu: cửa hàng ứng dụng mặc định tự động cập nhật, client cập nhật một cái là giao thức đổi. Lớp này không nhắc lại ở đây, xem thẳng [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol). Chỉ có hai điểm cốt lõi: giao thức client phải **khớp** giao thức máy chủ mới vào được; người chơi iOS chỉ cài được bản mới nhất trên cửa hàng, nên con đường "để người chơi hạ phiên bản" bị chặn chết với nhóm iOS. Khi phiên bản client và máy chủ không khớp, người chơi sẽ thấy thông báo kiểu "máy chủ quá cũ", **văn bản thông báo cụ thể lấy chính thức làm chuẩn**.

### 3.2 UDP và TCP: cổng, tường lửa, nhóm bảo mật

Bedrock Edition **đi UDP**, điểm này hoàn toàn khác Java Edition, và cũng là nguyên nhân số một của "kiểm tra cổng qua mà người chơi không vào được".

| Mục | Giá trị |
| --- | --- |
| Cổng IPv4 mặc định | **19132 / UDP** |
| Cổng IPv6 mặc định | **19133 / UDP** |
| Nơi cần mở | Tường lửa hệ thống **và** nhóm bảo mật cloud, cả hai chỗ |
| Chuyển tiếp cổng router | Giao thức bắt buộc chọn **UDP**; nếu chỉ chọn được TCP thì cần tạo riêng quy tắc UDP |
:::warn Công cụ chỉ đo TCP sẽ lừa bạn
Nhiều công cụ "kiểm tra cổng" trực tuyến mặc định chỉ dò TCP. Cổng TCP thông không có nghĩa cổng UDP thông. Khi xác nhận cổng Bedrock Edition, nhất định phải đo rõ là **UDP**.
:::

Ngoài ra, đa số dịch vụ xuyên thấu mạng nội bộ mặc định chỉ hỗ trợ TCP, khi chọn phương án phải xác nhận nó hỗ trợ **UDP**. Tình huống chơi chéo (cho người chơi điện thoại / Bedrock Edition vào máy chủ Java, hoặc ngược lại) xem [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile).

### 3.3 CGNAT / không có IPv4 công cộng / NAT hai lớp

Máy chủ chạy ngon lành, tường lửa cũng đã mở, bên ngoài vẫn không kết nối được, vấn đề thường nằm ở phía nhà mạng.

| Tình huống | Phán đoán | Hướng xử lý |
| --- | --- | --- |
| Cổng WAN của router nhận được **địa chỉ riêng hoặc địa chỉ chia sẻ** (CGNAT) | Bạn không có IPv4 công cộng độc quyền, chuyển tiếp cổng không có chỗ để chuyển | Xin nhà mạng cấp IP công cộng, hoặc đổi sang phương án tunnel / mạng LAN ảo hỗ trợ UDP |
| **NAT hai lớp**: sau modem quang lại nối thêm một router | Chuyển tiếp chỉ làm trên một trong hai | Chuyển tiếp phải làm trên thiết bị **nối trực tiếp với Internet**, và nối tiếp chuyển tiếp của chặng kế |
| IP công cộng là động | Địa chỉ sẽ đổi, người chơi không nhớ được | Dùng dịch vụ tên miền động, hoặc đổi sang phương án tunnel |
| Chỉ có IPv6 công cộng | Mạng của một số người chơi không hỗ trợ IPv6 | Đồng thời xác nhận khả năng tiếp cận phía IPv4 |

Khi không làm được chuyển tiếp cổng, một phương án thay thế phổ biến là **mạng LAN ảo**: cho máy chủ và người chơi cùng vào một mạng ảo, rồi người chơi kết nối bằng IP của mạng ảo. Cộng đồng thường dùng ZeroTier, Radmin VPN, Hamachi v.v., cấu hình cụ thể xem tài liệu chính thức của từng cái.

### 3.4 Phát hiện mạng LAN vs kết nối bằng IP

Hai cách kết nối này đi đường khác nhau, triệu chứng cũng khác nhau.

| | Phát hiện mạng LAN | Kết nối bằng IP / tên miền |
| --- | --- | --- |
| Người chơi cần làm gì | Không cần làm gì, máy chủ sẽ xuất hiện ở đầu giao diện "chơi" | Thêm máy chủ thủ công, điền địa chỉ và cổng |
| Tiền đề | Hai bên trong cùng một mạng LAN | Máy chủ tiếp cận được từ bên ngoài (chuyển tiếp cổng hoặc tunnel) |
| Bị ảnh hưởng bởi gì | `enable-lan-visibility`, UDP 19132/19133 có khả dụng không | IP công cộng, tường lửa, nhóm bảo mật, tunnel |

Vài điểm dễ bỏ qua: **Bedrock Edition bắt buộc chỉ định cổng**, nó không như Java Edition hỗ trợ bỏ cổng nhờ bản ghi SRV, nên ô địa chỉ và ô cổng đều phải điền đúng; phát hiện mạng LAN dựa vào broadcast / multicast, không hoạt động trong một số mạng ảo, mạng container hoặc mạng khác dải, lúc đó chỉ có thể đổi sang kết nối bằng IP; **kết nối chính mình trên cùng một máy** có thể thất bại do loopback hoặc quy tắc tường lửa, đổi sang thiết bị khác thử có thể nhanh chóng phân biệt là "máy chủ không tiếp cận được" hay "vấn đề của chính máy này".

### 3.5 Nền tảng máy chơi game (Xbox / PlayStation / Switch)

Nền tảng máy chơi game **không thể nhập IP trực tiếp trong game để vào máy chủ**. Hai con đường phổ biến là: **DNS tùy chỉnh** (trỏ phân giải tên miền đến máy chủ của bạn, để máy chơi game vào bằng tên miền), và **mạng LAN** (cho máy chơi game và máy chủ trong cùng một mạng LAN, vào bằng phát hiện mạng LAN).
:::note Chính sách nền tảng sẽ thay đổi, và mỗi nền tảng một khác
Giới hạn phía máy chơi game **thay đổi theo chính sách nền tảng và phiên bản**. Có tài liệu chỉ ra phiên bản máy chơi game nhìn chung nghiêng về chỉ đi được mạng LAN, trong đó phạm vi lựa chọn của Switch còn hẹp hơn (có thể chỉ giới hạn Realms / máy chủ được chính thức khuyến nghị). **Một nền tảng cụ thể hiện hỗ trợ gì, lấy tài liệu chính thức và giải thích của nền tảng làm chuẩn**, đừng chép hướng dẫn cũ.
:::

### 3.6 Kiểm tra phía client

Hãy loại trừ những khả năng rẻ nhất trước, rồi mới động vào máy chủ: về **định dạng địa chỉ**, ô địa chỉ chỉ điền IP hoặc tên miền, **cổng điền vào ô cổng**, nhét cả `ip:port` vào ô địa chỉ trên một số phiên bản sẽ phân tích thất bại; **cổng** mặc định 19132, máy chủ đã đổi cổng thì người chơi cũng phải đổi; **có phải cùng một phiên bản không** —— client Bedrock Edition **không thể** vào thẳng máy chủ Java Edition (và ngược lại), chơi chéo phải nhờ phương án thêm, xem [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile); **phiên bản client phải giống phiên bản máy chủ**, Bedrock Edition không hỗ trợ client phiên bản cũ nối máy chủ phiên bản mới. Cuối cùng **đổi một thiết bị, đổi một mạng thử**, có thể phân biệt ngay là vấn đề máy chủ, vấn đề mạng của người chơi, hay vấn đề thiết bị của người chơi.

### 3.7 Tình huống riêng của lõi bên thứ ba

Lõi bên thứ ba **không nhất thiết triển khai đủ toàn bộ đặc tính giao thức và nội dung game của máy chủ chính thức**, nên "cùng một client, vào máy chủ chính thức bình thường, vào máy chủ của tôi thì không đúng" là hiện tượng bình thường, không nhất thiết là cấu hình sai. Lấy PocketMine-MP làm ví dụ, tài liệu chính thức nói rõ: PMMP **không** triển khai toàn bộ đặc tính chơi của Minecraft, nguyên nhân là nhà phát triển bảo trì nghiệp dư, khó theo kịp tốc độ cập nhật chính thức; ở thời điểm viết, các đặc tính còn thiếu gồm **sinh vật (mobs), redstone, xe mỏ và chiều không gian**.

Một điểm nữa là **căn bản dựng của lõi với phiên bản giao thức**: phiên bản mà lõi báo cho client phải được client chấp nhận, nếu không người chơi sẽ thấy thông báo kiểu "máy chủ phiên bản quá cũ". Cách xử lý trong FAQ chính thức của PMMP là: chạy lệnh `version` trong console máy chủ, xem phiên bản Minecraft mà lõi hiện hỗ trợ, rồi từ đó chọn bản dựng lõi mới hơn; chính thức cũng nói rõ, **giữa các phiên bản vá mới hơn đôi khi (nhưng không luôn luôn) không cần cập nhật lõi vẫn tương thích**.

## 4. Vào được nhưng bất thường (works but behaves oddly)

### 4.1 Lag và bộ nhớ

**Tiêu chí đầu tiên của lag là hiệu năng đơn nhân.** Tính toán sinh vật của BDS hoàn thành trên một luồng, nên độ mượt chủ yếu phụ thuộc hiệu năng đơn nhân, bản đồ càng lớn càng lag, điểm này có giải thích trong [Máy chủ BDS](/tutorials/bedrock/bds).

| Hướng có thể chỉnh | Mô tả |
| --- | --- |
| Giảm `tick-distance` | Phạm vi hợp lệ 4–12, mặc định 4. Giá trị càng lớn, càng nhiều chunk tham gia tính toán |
| Giảm `view-distance` | Cần lớn hơn hoặc bằng 5, mặc định 32. Chủ yếu ảnh hưởng phạm vi gửi xuống |
| Giảm quy mô thực thể / nông trại sinh vật | Thực thể là tải chính của tính toán đơn luồng |
| Đổi máy đơn nhân mạnh hơn | Trực tiếp nhất, nhưng chi phí cao nhất |
| `max-threads` | Bedrock có mục này (số luồng tối đa), nhưng nó **không thay đổi được điểm nghẽn đơn luồng**, đừng trông chờ nó giải quyết lag |

Về lõi PHP: tài liệu chính thức của PMMP nói rõ nó "nổi tiếng kém" trong việc dùng đa nhân, nếu mua máy để chạy PMMP thì **nên ưu tiên xung nhịp cao chứ không phải nhiều nhân**.

**Về bộ nhớ tăng liên tục**: BDS có vấn đề đã biết là bộ nhớ tăng chậm. Lời nhắc then chốt là ——
:::warn Đừng cưỡng chế dọn bộ nhớ
Cưỡng chế dọn bộ nhớ sẽ khiến **thanh tiến trình kẹt** khi người chơi tải gói tài nguyên / Addon, và **chỉ có khởi động lại máy chủ** mới hồi phục được. Cách đúng là lập kế hoạch khung giờ khởi động lại định kỳ, chứ không phải "thấy bộ nhớ cao là đi dọn một cái".
:::

### 4.2 Vấn đề chunk và dữ liệu thế giới

Dữ liệu thế giới của BDS nằm dưới thư mục **`worlds/`**, mỗi thế giới một thư mục con. Có một hành vi rất then chốt:

> Khi khởi động, máy chủ sẽ vào `worlds/` tìm thư mục **trùng tên với `level-name` trong `server.properties`**. Tìm thấy thì dùng nó; **không tìm thấy thì tạo thế giới mới**.

Điều này có nghĩa **`level-name` viết sai một chữ cái, máy chủ sẽ không báo lỗi, mà lặng lẽ sinh ra một thế giới mới** —— người chơi thấy là "bản lưu của tôi mất rồi". Nên khi phát hiện "bản lưu thay đổi", việc đầu tiên là đối chiếu `level-name` với tên thư mục trong `worlds/`.

| Hiện tượng | Nguyên nhân có thể | Xử lý |
| --- | --- | --- |
| Nạp thế giới thất bại / khởi động báo lỗi liên quan thế giới | Bản lưu hỏng, hoặc lần lưu trước bị gián đoạn | **Dừng khởi động lặp lại**, khôi phục từ bản sao lưu |
| Đổi lõi xong không đọc được thế giới | Độ tương thích bản lưu của lõi bên thứ ba kém hơn BDS chính thức | Khôi phục lõi cũ, hoặc di chuyển theo tài liệu của lõi |
| Nhập thế giới xong không có hiệu lực | Tên thư mục không khớp `level-name` | Đổi tên thư mục thế giới thành giá trị của `level-name` |
| Mất toàn bộ bản lưu | Chỉ sao lưu một phần tệp | Sao lưu **cả thư mục** `worlds/` |

Quy trình đầy đủ khôi phục từ bản sao lưu xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::tip Tắt máy chủ bình thường trước khi sao chép hoặc sao lưu
Chạy `stop` trong console, đợi tiến trình thực sự thoát rồi mới chép `worlds/`. Chép khi tiến trình còn đang ghi tệp thì rất có thể nhận được bản lưu "trông đầy đủ nhưng thực chất hỏng".
:::

### 4.3 Gói phụ trợ và gói tài nguyên

Hai tiền đề: **bắt buộc là gói định dạng Bedrock Edition** —— data pack / resource pack của Java Edition và gói phụ trợ của Bedrock Edition là hai thứ khác nhau, không dùng chung được; **gói phải được đặt đúng chỗ và đăng ký** —— chỉ chép tệp vào thì máy chủ không tự bật nó. Thư mục và cách đăng ký đã xác nhận như sau:

| Loại | Thư mục đặt |
| --- | --- |
| Gói hành vi (Behavior Pack) | `development_behavior_packs` |
| Gói tài nguyên (Resource Pack) | `development_resource_packs` |

Muốn một thế giới bật gói, cần tạo tệp kê tương ứng trong **thư mục làm việc của thế giới đó**, ghi UUID và phiên bản của gói; UUID đến từ `manifest.json` của chính gói:

```json
[
    {
        "pack_id": "33556fcf-d192-4d5f-96a0-29357702af7b",
        "version": [ 1, 0, 0 ]
    }
]
```

Trong đó: gói hành vi ghi vào `world_behavior_packs.json`, gói tài nguyên ghi vào `world_resource_packs.json`; khi nhiều gói xung đột, **gói xếp trước được ưu tiên**.

Các điểm khác: **`texturepack-required=true`** sẽ cưỡng chế client tải gói tài nguyên của máy chủ, sau khi bật thì gói tài nguyên phía client mà người chơi tự bật (kể cả gói trên Marketplace) sẽ mất hiệu lực; **gói trên Marketplace không áp dụng được cho máy chủ**; thư mục gốc máy chủ còn có **`valid_known_packs.json`**, nó là **danh sách gói đã biết** do máy chủ duy trì, máy chủ dựa vào đó để kiểm tra, định dạng chính xác và quy trình bảo trì của nó **lấy tài liệu chính thức làm chuẩn**, thao tác hằng ngày chỉ cần đi theo quy trình "đặt vào thư mục + viết world_*_packs.json" ở trên; **client kẹt ở tải gói tài nguyên**, ngoài vấn đề của chính gói, cũng có thể do trạng thái bộ nhớ máy chủ gây ra (xem 4.1), lúc đó khởi động lại máy chủ thường hồi phục được.

Với PMMP còn một vấn đề đã biết chính thức: **máy chủ dùng gói tài nguyên lớn sẽ gặp vấn đề kết nối** (chính thức lấy ví dụ gói lớn hơn 1 MB). Cách kiểm tra chính thức đưa ra là gỡ gói lớn rồi thử lại; một cách vòng có thể hiệu quả là giảm dần `network.max-mtu-size` trong `pocketmine.yml` (ví dụ mỗi lần giảm 100 rồi đo), nhưng chính thức cũng nói đây chỉ là **cách vòng**, sẽ giảm hiệu quả băng thông, vẫn nên tìm ra nguyên nhân gốc.

### 4.4 Quyền và danh sách trắng

Quyền và danh sách trắng của BDS là **hai tệp độc lập**, trường cũng khác nhau, rất dễ lẫn. **Quản trị viên (OP) nằm trong `permissions.json`**, mục gồm `xuid` và `permission`:

```json
[
    {
        "permission": "operator",
        "xuid": "451298348"
    }
]
```

- Giá trị hợp lệ của `permission` chỉ có ba: **`operator` / `member` / `visitor`**.
- **`online-mode` bắt buộc phải bật**, vì XUID cần xác minh tài khoản trực tuyến.
- Đã sửa tệp này khi máy chủ đang chạy thì cần chạy **`permission reload`** mới có hiệu lực; `permission list` có thể xem quyền hiện tại.
- Người chơi mới không nằm trong danh sách sẽ áp dụng thiết lập `default-player-permission-level`. Ngoài sửa tệp, cũng có thể **sửa thẳng trong game**.

**Danh sách trắng nằm trong `allowlist.json`**, các trường của mục là:

| Trường | Ý nghĩa |
| --- | --- |
| `name` | **Tên game / biệt danh (gamertag)** của người chơi, phải hoàn toàn trùng khớp |
| `xuid` | XUID của người chơi; **nếu đã điền `name` thì có thể bỏ trường này** |
| `ignoresPlayerLimit` | Khi là `true`, người chơi này vẫn vào được khi đã đủ người |

Vài hành vi then chốt: khi chỉ điền `name`, **sau khi người chơi cùng tên kết nối thì XUID sẽ được tự động bổ sung**, tức là điền sai tên thì người này mãi không vào được, và sẽ không tự sửa; **danh sách trắng chỉ có hiệu lực khi `online-mode` bật**, tắt xác minh bản quyền xong người chơi có thể mượn tên trong danh sách trắng để vào, danh sách trắng thành vô dụng; sau khi người chơi **đổi gamertag**, mục của tên cũ sẽ không còn khớp, cần cập nhật; khi sửa tệp thủ công mà máy chủ còn đang chạy, cần dùng lệnh reload tương ứng để thay đổi có hiệu lực.

| Hiện tượng | Nguyên nhân có thể | Xử lý |
| --- | --- | --- |
| Người đáng là OP lại không phải OP | Mục chưa ghi vào `permissions.json`, hoặc ghi rồi mà chưa reload | Bổ sung mục và reload, hoặc đặt thẳng trong game |
| Thêm vào `permissions.json` mà không có hiệu lực | `online-mode` tắt, XUID không xác minh được | Bật `online-mode` |
| Người trong danh sách trắng không vào được | `name` không hoàn toàn trùng với gamertag thực tế (chữ hoa thường, dấu cách, đổi tên) | Đối chiếu tên chính xác, hoặc điền thẳng XUID |
| Ai cũng vào được | Danh sách trắng chưa bật, hoặc `online-mode` tắt | Kiểm tra `allow-list` và `online-mode` |
:::note Tên trường lấy tài liệu chính thức làm chuẩn
Các tên trường và hành vi trên lấy từ giải thích chính thức. **Giữa các phiên bản có thể điều chỉnh trường hoặc giá trị mặc định**, thực tế lấy tài liệu chính thức của BDS (và `bedrock_server_how_to.html` đi kèm gói) làm chuẩn.
:::

### 4.5 Khác biệt hành vi với Java Edition

Nhiều "bug" người chơi báo thực ra là **hai phiên bản vốn đã khác nhau**: cơ chế redstone, quy tắc sinh sinh vật v.v. đều có khác biệt. Lớp này không giải thích lại ở đây, xem thẳng [JAVA VS Bedrock](/wiki/editions).

## 5. Trình tự kiểm tra

Đi theo thứ tự dưới đây, mỗi bước đều có thể cắt bớt một nửa khả năng. **Đừng nhảy bước**.

1. **Xác nhận tiến trình máy chủ thực sự đang chạy.** Xem cửa sổ console còn không, tiến trình còn trong danh sách tiến trình không.
2. **Xác nhận nó đang lắng nghe cổng.** Lệnh Linux và Windows xem bên dưới.
3. **Xác nhận cổng và giao thức.** Số cổng có đúng không, thứ được mở có phải **UDP** không (mặc định 19132, IPv6 là 19133).
4. **Xác nhận phiên bản client.** Phiên bản client phải khớp phiên bản máy chủ, xem [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol).
5. **Xác nhận đường đi mạng.** Mạng LAN / IP công cộng / tunnel, ba cái đi đường khác nhau; có CGNAT hay NAT hai lớp không.
6. **Xem console và nhật ký máy chủ.** Văn bản lỗi gốc đáng giá hơn mọi phỏng đoán. Khởi động và báo lỗi của BDS đều in ra console.
7. **Xác nhận quyền và danh sách trắng.** Người chơi bị đá, hay hoàn toàn chưa kết nối được? Bị đá thường thấy nguyên nhân trong console.
8. **Xác nhận tính toàn vẹn của thế giới và gói phụ trợ.** `level-name` có khớp tên thư mục dưới `worlds/` không; gói có đặt đúng thư mục và đăng ký không.

Lệnh của bước 2: Linux dùng `ss -ulnp | grep 19132` (`-u` chỉ xem UDP); Windows dùng `netstat -ano | findstr 19132` (`-a` tất cả kết nối và lắng nghe, `-n` không phân giải tên, `-o` hiển thị số tiến trình); trong PowerShell trực quan hơn là `Get-NetUDPEndpoint -LocalPort 19132`.

```bash
ss -ulnp | grep 19132
```

```bat
netstat -ano | findstr 19132
```

**Bảng đối chiếu hiện tượng:**

| Hiện tượng | Kiểm tra gì trước | Nguyên nhân thường gặp |
| --- | --- | --- |
| Tiến trình không có | Văn bản lỗi gốc trong console | Thiếu thư viện chạy, sai phiên bản Java / PHP, cổng bị chiếm, cấu hình viết sai |
| Tiến trình có, cổng không lắng nghe | Nhật ký khởi động có bind thất bại không | Cổng bị chiếm, `enable-lan-visibility` giành bind 19132/19133 |
| Cổng đang lắng nghe, máy này kết nối được, bên ngoài không | Khả năng tiếp cận công cộng | Nhóm bảo mật / tường lửa chưa mở UDP, CGNAT, NAT hai lớp |
| Kiểm tra cổng qua nhưng người chơi không vào được | Công cụ đo là TCP hay UDP | Chỉ mở TCP |
| Báo máy chủ phiên bản quá cũ | Phiên bản client và máy chủ | Giao thức không khớp; bản dựng lõi bên thứ ba quá cũ |
| Vào được nhưng vừa vào là rớt | Console có nguyên nhân đá ra không | Danh sách trắng, quyền, giới hạn số người |
| Vào được nhưng lag đặc biệt | Mức chiếm đơn nhân, `tick-distance`, số thực thể | Điểm nghẽn đơn nhân, bản đồ quá lớn |
| Bản lưu "biến mất" | `level-name` và tên thư mục trong `worlds/` | `level-name` viết sai, máy chủ tạo thế giới mới |
| Gói phụ trợ không có hiệu lực | Loại gói và thư mục đặt | Đặt nhầm thư mục, chưa viết world_*_packs.json |

## 6. Khi cần trợ giúp nên cung cấp gì

Cung cấp một lần hết những thứ dưới đây, tiết kiệm được mấy vòng qua lại:

| Thông tin cần cung cấp | Vì sao cần |
| --- | --- |
| **Lõi máy chủ và phiên bản bản dựng** | Số phiên bản của BDS, hoặc tên lõi và số bản dựng của họ Nukkit / PMMP. Lõi khác nhau thì đường kiểm tra khác nhau |
| **Phiên bản game / phiên bản giao thức** | Client và máy chủ mỗi bên là phiên bản nào, đây là mục kiểm tra đầu tiên của Bedrock Edition |
| **Hệ điều hành và kiến trúc** | Windows hay Linux, bản phân phối và phiên bản, có 64 bit không, có x86-64 không |
| **Văn bản lỗi đầy đủ trong console** | **Đừng kể lại, đừng chỉ cắt một nửa**. Từ khóa trong văn bản lỗi gốc định vị được vấn đề trực tiếp |
| **Gần đây đã đổi gì** | Nâng cấp lõi? Đổi cổng? Thêm gói phụ trợ? Sửa `server.properties`? |
| **Trước đây có bình thường không** | "Chưa từng thành công" và "hôm qua còn tốt" là hai đường kiểm tra hoàn toàn khác nhau |
| **Đã thử những gì** | Tránh khuyến nghị lặp lại; cũng cho biết hướng nào đã bị loại trừ |
| **Tình hình mạng** | Mạng LAN hay công cộng, có IP công cộng không, dùng tunnel gì, chuyển tiếp cổng cấu hình thế nào |
:::tip Văn bản lỗi gốc cung cấp thế nào
Chép thẳng đầu ra console thành văn bản, hoặc dán tệp nhật ký. **Chụp ảnh, chụp màn hình, chỉ dán dòng cuối** đều làm việc kiểm tra chậm đi. Nếu đầu ra rất dài, giữ vài dòng trước và sau chỗ báo lỗi, chứ đừng chỉ giữ một câu.
:::

Tài liệu liên quan: [[BE] Câu hỏi thường gặp](/tutorials/faq/faq-be), [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol), [Máy chủ BDS](/tutorials/bedrock/bds), [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party), [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup), [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile), [Sao lưu và khôi phục](/tutorials/java/backup), [JAVA VS Bedrock](/wiki/editions).

> Cổng, tên trường và cấu trúc thư mục lấy theo tài liệu chính thức của BDS và tài liệu chính thức của từng lõi.
