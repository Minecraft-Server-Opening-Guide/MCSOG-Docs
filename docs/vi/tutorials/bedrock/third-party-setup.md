---
title: Bắt đầu với lõi bên thứ ba của Bedrock Edition
slug: third-party-setup
cat: bedrock
level: 3
order: 6
minutes: 13
mc: ["1.21.x"]
tags: [Bedrock Edition, nukkit, powernukkitx, pocketmine, php, bắt đầu]
updated: 2026-10-04
draft: false
---

Bài [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) nói về "chọn cái nào". Bài này nói về "chọn xong rồi làm sao cho nó chạy": cần chuẩn bị gì, thư mục trông thế nào, script khởi động viết ra sao, plugin đặt ở đâu, và bước dễ hỏng nhất —— **bản dựng của lõi không khớp với phiên bản giao thức Bedrock Edition**.

## Một, Trước khi bắt tay: xác nhận ba việc

| Cần xác nhận | Mô tả |
| --- | --- |
| **Họ lõi** | Họ Nukkit là chương trình **Java**, PocketMine-MP là chương trình **PHP**. Chọn sai họ thì toàn bộ môi trường chạy phía sau phải làm lại |
| **Môi trường chạy** | Họ Nukkit cài **Java**; PMMP cài **PHP**. Hai bên không thay thế nhau |
| **Căn phiên bản** | Bản dựng của lõi phải **khớp với phiên bản giao thức Bedrock Edition mà bạn muốn kết nối**, nếu không client không kết nối được |

### Môi trường Java (họ Nukkit)

Họ Nukkit giống máy chủ Java Edition ở chỗ đều là chương trình Java, cài theo cách của Java Edition là được, xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment).

Hai điểm cần lưu ý:

- **Phiên bản phải đủ**: nhánh mới thường yêu cầu Java khá mới (thường là Java 17 trở lên), cài quá cũ sẽ khởi động thất bại ngay, thông tin lỗi thường ghi rõ yêu cầu.
- **Số bit phải đúng**: hệ thống 64 bit thì dùng Java 64 bit. Cài thành 32 bit sẽ sụp khi khởi động hoặc giữa chừng do giới hạn bộ nhớ.

### Môi trường PHP (PocketMine-MP)

PMMP cần **PHP**, chứ không phải Java.

:::tip Dùng PHP do PMMP đóng gói, đừng tự ghép môi trường
Trang chủ PHP cung cấp bản **thuần**, mặc định không có những extension mà PMMP cần; tự bổ sung từng phần phụ thuộc rất phiền, và càng nhiều phiên bản càng dễ rối. **Khuyến nghị tải thẳng runtime PHP mà PMMP chính thức đóng gói cho từng hệ điều hành** (trong GitHub Releases của họ, chọn tệp tương ứng với hệ điều hành của bạn), giải nén là dùng được.
:::

:::warn Đừng dùng PHP có sẵn của hệ thống
PHP trong kho của các bản phân phối Linux thường khá cũ, trên Windows cũng có thể có PHP do phần mềm khác để lại. Hãy xác nhận lại đầu ra của `php -v` trước, bảo đảm khi khởi động máy chủ bạn dùng đúng **cái mà bạn định dùng**.
:::

## Hai, Cấu trúc thư mục: họ Nukkit vs PocketMine-MP

### Họ Nukkit

Sau lần khởi động đầu, thư mục gốc đại khái như sau (các nhánh khác nhau sẽ hơi khác):

| Tệp / thư mục | Tác dụng |
| --- | --- |
| Một tệp kiểu `nukkit-1.0-SNAPSHOT.jar` | **Bản thân chương trình lõi**, khởi động chính là nó |
| `start.bat` / `start.sh` / `start.command` | Script khởi động, tương ứng Windows / Linux / macOS |
| `server.properties` | Tệp cấu hình chính: tên máy chủ, cổng, số người tối đa, chế độ chơi, v.v. |
| `permissions.yml` | Định nghĩa quyền |
| `ops.txt` | Danh sách quản trị viên (OP) |
| `whitelist.txt` | Danh sách trắng (chỉ có hiệu lực sau khi bật danh sách trắng trong `server.properties`) |
| `banned-players.txt` / `banned-ips.txt` | Người chơi và IP bị cấm |
| `rcon_password.txt` | Mật khẩu điều khiển từ xa RCON |
| `worlds/` | **Thư mục tổng của bản lưu thế giới**, mỗi thế giới một thư mục con |
| `plugins/` | **Thư mục plugin**, đặt tệp `.jar` |
| `logs/` | Nhật ký chạy |

Bên trong thư mục thế giới `worlds/<世界名>/`:

| Tệp / thư mục | Nội dung |
| --- | --- |
| `level.dat` | Thiết lập cơ bản của thế giới |
| `region/` | **Dữ liệu chunk** (địa hình, công trình, khối lượng lớn nhất) |
| `entities/` | Dữ liệu thực thể |

:::warn Bản lưu thì sao lưu cả `worlds/`
Giống BDS, bản lưu của Bedrock Edition là **một khối tổng thể**. Khi sao lưu hãy chép cả thư mục `worlds/`, đừng chỉ chọn `region/`.
:::

### PocketMine-MP

Cách bố trí thư mục của PMMP tương tự, nhưng hình thức tệp khác:

| Tệp / thư mục | Tác dụng |
| --- | --- |
| `PocketMine-MP.phar` | **Bản thân chương trình lõi** (`.phar` là định dạng đóng gói của PHP) |
| Runtime PHP | Trình khởi động và tệp thực thi `php`; dùng bản đóng gói chính thức thì nằm cùng thư mục |
| `start.bat` / `start.sh` | Script khởi động |
| `server.properties` | Tệp cấu hình chính |
| `pocketmine.yml` | Cấu hình của chính PMMP |
| `plugins/` | **Thư mục plugin**, đặt tệp `.phar` |
| `worlds/` | Thư mục tổng của bản lưu thế giới |
| `players/` | Dữ liệu người chơi |
| `logs/` | Nhật ký chạy |

### Đối chiếu hai bên

| | Họ Nukkit | PocketMine-MP |
| --- | --- | --- |
| Tệp lõi | `.jar` | `.phar` |
| Môi trường chạy | Java | PHP |
| Phần mở rộng plugin | `.jar` | `.phar` |
| Thư mục plugin | `plugins/` | `plugins/` |
| Thư mục thế giới | `worlds/` | `worlds/` |
| Cấu hình chính | `server.properties` | `server.properties` |
| Danh sách quản trị viên | `ops.txt` | Do cấu hình lõi và lệnh quản lý |
| Cấu trúc bên trong thế giới | `level.dat` + `region/` + `entities/` | `level.dat` + `region/` + `entities/` |

:::note Cái bẫy chung: đường dẫn đừng có tiếng Trung và dấu cách
Dù là lõi nào, thư mục máy chủ cũng nên đặt ở đường dẫn **thuần tiếng Anh, không dấu cách**. Đường dẫn tiếng Trung trên một số nhánh và bảng điều khiển sẽ khiến đọc thế giới hoặc plugin thất bại, thông tin lỗi lại thường rất khó hiểu.
:::

## Ba, Khởi động máy chủ

### Họ Nukkit

Lệnh khởi động tối thiểu khả dụng chỉ là một dòng `java -jar`:

```bat
@echo off
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
pause
```

Cách viết tương đương trên Linux / macOS:

```sh
#!/bin/sh
java -Xms1G -Xmx4G -jar nukkit-1.0-SNAPSHOT.jar
```

Giải thích:

- `-Xms` là bộ nhớ heap ban đầu, `-Xmx` là bộ nhớ heap tối đa; **nên đặt hai cái bằng nhau**, tránh việc mở rộng lặp lại khi đang chạy.
- `-Xmx` không được vượt quá bộ nhớ vật lý của máy, nếu không hệ thống sẽ bắt đầu dùng phân vùng swap, càng thêm giật.
- Trên Windows thêm `pause` vào cuối tệp `.bat`, sụp rồi cửa sổ sẽ không biến mất ngay, bạn mới có cơ hội thấy thông tin lỗi.

### PocketMine-MP

```bat
@echo off
php PocketMine-MP.phar
pause
```

Trên Linux / macOS:

```sh
#!/bin/sh
./bin/php7/bin/php PocketMine-MP.phar
```

Giải thích:

- Đường dẫn cụ thể tùy vào bạn dùng PHP đóng gói chính thức hay môi trường tự cài. **Trước tiên dùng `php -v` xác nhận gọi được**, rồi mới viết vào script.
- Giới hạn bộ nhớ không dựa vào tham số dòng lệnh, mà cấu hình trong `pocketmine.yml` và `server.properties`.

:::tip Lần khởi động đầu xem gì
Lần đầu khởi động sẽ sinh tệp cấu hình và thế giới. Khởi động xong chú ý hai việc: **console có báo lỗi không**, và **thư mục có thực sự xuất hiện thêm `plugins/` và `worlds/` không**. Nếu thư mục không được sinh ra, nghĩa là lõi chưa chạy lên, đừng vội cài plugin.
:::

:::warn Đừng cấp hết bộ nhớ một lần
Máy chủ mới chưa có ai, hãy đặt `-Xmx` nhỏ một chút (ví dụ 2G), đợi người chơi lên rồi chỉnh. Cấp một lần đến giới hạn bộ nhớ vật lý sẽ khiến hệ thống và lõi tranh nhau bộ nhớ.
:::

## Bốn, Plugin đặt ở đâu, nạp thế nào

1. Tải tệp đúng phiên bản từ trang phát hành của plugin: họ Nukkit cần `.jar`, PMMP cần `.phar`.
2. Đặt vào `plugins/` ở thư mục gốc máy chủ.
3. **Khởi động lại máy chủ**.
4. Xem đầu ra console, xác nhận plugin được nạp, không có báo lỗi.
5. Một số plugin sau lần nạp đầu sẽ sinh thư mục cấu hình riêng `plugins/插件名/`, sửa cấu hình xong khởi động lại một lần nữa.

Về việc nạp lại:

- Đa số plugin hỗ trợ một lệnh nạp lại, nhưng **nạp lại không bằng khởi động lại**. Khi đã sửa cấu hình lõi, đổi phiên bản plugin, hoặc plugin đăng ký sự kiện lẫn nhau, nạp lại thường để lại trạng thái cũ, sinh ra kiểu "rõ ràng đã sửa mà không có hiệu lực" thậm chí báo lỗi thẳng.
- Kết luận: **sửa cấu hình có thể nạp lại, cài/xóa/đổi plugin thì nhất loạt khởi động lại**.

:::warn Đừng nhét plugin của Java Edition vào đây
Tệp `.jar` của họ Nukkit và tệp `.jar` của Java Edition (Paper / Spigot) là hai thứ hoàn toàn khác nhau, **không dùng chung được**. Khi tải từ trang plugin hãy xác nhận trước nó ghi là Nukkit / PNX hay Paper, cài sai lõi thường chỉ báo một câu "tệp plugin không hợp lệ".
:::

## Năm, Bước dễ hỏng nhất: căn phiên bản

Đây là chỗ Bedrock Edition khắt khe hơn Java Edition rất nhiều, nên tách ra nói riêng.

Client Bedrock Edition **tự động cập nhật**, người chơi không thể ở lại phiên bản cũ như Java Edition. Vì vậy:

- Bản dựng của lõi phải **hỗ trợ phiên bản giao thức Bedrock Edition hiện tại**, nếu không người chơi sẽ thấy thông báo kiểu "máy chủ quá cũ", không kết nối được luôn.
- Lõi đúng phiên bản rồi, plugin cũng phải đúng: plugin đi theo API của lõi, **lõi nâng cấp một cái là plugin cũ có thể mất hiệu lực ngay**.
- Vì thế việc nâng cấp lõi bên thứ ba là **theo bộ**: lõi + plugin + cấu hình đổi cùng nhau, không thể chỉ đổi một thứ.

Thứ tự kiểm tra khi không kết nối được:

| Hiện tượng | Kiểm tra gì trước |
| --- | --- |
| Báo máy chủ phiên bản quá cũ | Bản dựng của lõi có hỗ trợ giao thức Bedrock Edition hiện tại không |
| Client kẹt ở "đang kết nối" | Cổng đã mở chưa, cổng trong `server.properties` và chuyển tiếp có khớp không |
| Vào được máy chủ nhưng plugin không phản ứng | Plugin đã nạp chưa, phiên bản có khớp lõi không |
| Vào máy chủ xong bị đá ngay | Danh sách trắng có bật không, có bị ghi trong `banned-*` không |

:::tip Sao lưu trước khi nâng cấp
**Độ tương thích bản lưu của lõi bên thứ ba kém hơn BDS chính thức**. Trước khi đổi lõi hoặc nâng cấp phiên bản lớn, hãy sao lưu cả `worlds/` và cấu hình trong `plugins/`, xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::

## Sáu, Danh sách kiểm tra bắt đầu

- [ ] Môi trường chạy đã cài và gọi được từ dòng lệnh (`java -version` / `php -v`)
- [ ] Bản dựng của lõi khớp với phiên bản giao thức Bedrock Edition mục tiêu
- [ ] Đường dẫn thư mục thuần tiếng Anh, không dấu cách
- [ ] Tham số bộ nhớ trong script khởi động hợp lý
- [ ] Lần khởi động đầu sinh `plugins/` và `worlds/`, console không báo lỗi
- [ ] Phần mở rộng plugin khớp với họ lõi
- [ ] `worlds/` đã được đưa vào kế hoạch sao lưu

## Bước tiếp theo

- Chi tiết thư mục và tệp: xem [Máy chủ BDS](/tutorials/bedrock/bds)
- Giao thức và quan hệ phiên bản: xem [Giao thức và phiên bản Bedrock Edition](/tutorials/bedrock/protocol)
- Quay lại việc chọn lõi: xem [Chọn lõi Bedrock Edition](/tutorials/bedrock/cores)

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
