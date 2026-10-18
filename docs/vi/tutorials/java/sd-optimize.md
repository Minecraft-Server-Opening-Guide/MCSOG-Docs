---
title: "[Loạt bài kỹ thuật redstone] Mod tối ưu"
slug: sd-optimize
cat: java
level: 3
order: 32
minutes: 18
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, tối ưu, mod, fabric, spark]
updated: 2026-10-08
draft: false
---

Máy chủ kỹ thuật redstone có nên cài mod tối ưu không, là câu hỏi dễ đi đến cực đoan: có người không cài cái nào, thà lag; có người nhét hết những gì tìm được vào `mods`, kết quả máy móc bắt đầu mất hiệu lực một cách khó hiểu. Hai cách đều không đúng —— **vấn đề không phải "cài hay không cài", mà là "cái giá của từng loại là gì"**.

Bài này chia 10 mod tối ưu thường gặp thành ba loại: cài yên tâm, phải xem phiên bản, đổi thứ tự thời gian phải thận trọng. Tiêu chuẩn phán đoán chỉ có một: **nó có khả năng thay đổi hành vi máy móc hay không**.

Quan hệ với loại tối ưu chỉnh cấu hình xem [Tối ưu hiệu năng](/tutorials/java/optimize): bài đó nói về tư duy tổng thể về cấu hình và thứ tự ưu tiên, bài này chỉ nói tầng mod.

## Một, nhìn qua cả 10 mod

loaders, phiên bản hỗ trợ và lượng tải dưới đây lấy từ mục chính thức trên Modrinth.

| mod | loaders | Phiên bản hỗ trợ | Lượng tải (khoảng) |
| --- | --- | --- | --- |
| `lithium` | fabric, neoforge, quilt | 1.16.2–26.3 | 133,7 triệu |
| `ferrite-core` | fabric, forge, neoforge, quilt | 1.16.5–26.3 | 157,4 triệu |
| `krypton` | fabric | 1.16.2–26.3 | 43,04 triệu |
| `c2me-fabric` | fabric | 1.17.1–26.4-snapshot-3 | 39,18 triệu |
| `modernfix` | fabric, forge, neoforge | 1.16.4–26.1.2 | 80,23 triệu |
| `memoryleakfix` | fabric, forge, quilt | 1.14.4–1.20.4 | 38,02 triệu |
| `starlight` | fabric | 1.17–1.20.4 | 16,06 triệu |
| `async` | fabric, neoforge, quilt | (mục chính thức không đưa ra khoảng cố định) | 717 nghìn |
| `spark` | fabric, forge, neoforge, quilt | 1.16.5–26.3 | 23,17 triệu |
| `chunky` | bukkit, fabric, folia, forge | 1.13.2–26.3 | 18,88 triệu |

Đọc bảng này có hai điểm cần chú ý:

- **Lượng tải cao không có nghĩa là "phải cài"**. Nó chỉ cho thấy nhiều người dùng, không có nghĩa nó phù hợp phần cứng và máy móc (thiết bị) của bạn.
- **Khoảng phiên bản của `async` không có cách ghi cố định trên mục chính thức**, nên bảng trên không tự đặt ra một khoảng cho nó. Lấy phiên bản game mà trang dự án hiện liệt kê làm chuẩn.

## Hai, cài yên tâm: bộ nhớ, khởi động, phân tích và tạo trước

Loại này "không liên quan hành vi": chỗ chúng tối ưu không phải logic và thứ tự của game, mà là mức chiếm bộ nhớ, quá trình khởi động, phương tiện quan sát và sinh chunk. Với máy chủ kỹ thuật redstone, loại này có cái giá thấp nhất.

| mod | Lý do cài yên tâm |
| --- | --- |
| `ferrite-core` | Động vào tầng chiếm bộ nhớ, không can thiệp logic tick |
| `modernfix` | Phạm vi là hiệu năng, bộ nhớ và sửa bug, không phải viết lại một cơ chế đơn lẻ |
| `spark` | Nó chỉ lo quan sát, không sửa hành vi game |
| `chunky` | Tạo xong chunk trước, tránh việc người chơi chạy bản đồ vừa chạy vừa sinh |

Vài bổ sung:

- **`spark` không phải mod tối ưu**, nó là công cụ phân tích. "Đo trước rồi mới đổi" nghĩa là: cài `spark` để **nhìn rõ nút thắt ở đâu**, chứ không trông nó làm máy chủ nhanh hơn. Cách đọc biểu đồ của nó xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).
- **`chunky` giải quyết lag giai đoạn sinh thế giới**, cùng một việc với mục "tạo trước thế giới" trong [Tối ưu hiệu năng](/tutorials/java/optimize), chỉ là được cung cấp dưới dạng mod. Máy chủ mở lâu dài gần như bắt buộc phải có.
- **Loại này không xung đột với nhau**: bộ nhớ, khởi động, phân tích, tạo trước mỗi cái lo một đoạn, dùng cùng được. Thứ thực sự cần cẩn thận là hai mod "trùng chức năng", ví dụ cả hai đều viết lại cách hiện thực động cơ ánh sáng.

## Ba, phải xem phiên bản: hai kết luận chính thức

Hai mod này không phải "không tốt", mà phạm vi áp dụng của chúng có biên rõ ràng, chính chính thức đã viết rõ biên đó. Chép nguyên kết luận là được:

### `memoryleakfix`: 1.20.5+ đã lỗi thời

Kết luận trong README chính thức là: **sau Minecraft 1.20.5+, mọi rò rỉ bộ nhớ mà mod này từng sửa đều đã được chính thức sửa**, vì thế nó trên phiên bản mới đã lỗi thời.

Dữ liệu tương ứng cũng cho thấy: phiên bản hỗ trợ của nó là 1.14.4–1.20.4, mà game phiên bản mới đã không nằm trong khoảng này. **Trên phiên bản mới tiếp tục cài nó là vô nghĩa**; chỉ trên 1.20.4 và sớm hơn, những rò rỉ nó sửa mới còn chỗ chính thức chưa sửa.

### `starlight`: chỉ đến 1.20.4, và chính thức đã nêu đánh đổi

README chính thức có bốn điểm chính, một điểm cụ thể hơn một điểm:

| Kết luận chính thức | Hàm ý với máy chủ kỹ thuật redstone |
| --- | --- |
| Hỗ trợ đến 1.20.4 (1.17–1.20.4) | Trên phiên bản mới căn bản không có tệp để cài |
| Trên 1.20, Starlight cách bản gốc đã rất nhỏ | Nâng lên 1.20 xong, lợi ích của việc cài nó đã không lớn |
| Hoàn toàn không tương thích với Phosphor | Hai bên không thể cùng tồn tại |
| Nó là bản viết lại động cơ ánh sáng **xâm nhập**, dễ xung đột với mod khác hơn | Tổ hợp mod của máy chủ kỹ thuật redstone thường không ít, rủi ro xung đột phải tính vào chi phí |
| Tiến triển tiếp theo sau 1.20 hướng tới Moonrise | Sứ mệnh lịch sử của nó đã được bàn giao |

Vậy cách dùng đúng của `starlight` là: **chỉ cân nhắc nó khi biết rõ mình dừng ở 1.20.4 hoặc sớm hơn, và không cài Phosphor**. Máy chủ máy móc phiên bản mới không cần băn khoăn về cái này nữa.

## Bốn, đổi thứ tự thời gian, phải thận trọng: bốn mod

Loại này là loại máy chủ kỹ thuật redstone thực sự phải dừng lại nghĩ. Điểm chung của chúng là **thay đổi thứ tự hoặc thời điểm xảy ra sự kiện**, mà tính đúng đắn của máy móc thường lại đặt trên thứ tự đó.

| mod | Rủi ro ở đâu |
| --- | --- |
| `lithium` | Phạm vi bao phủ rộng, động vào sinh quái, AI, hành vi khối… các đường logic; "tối ưu phổ quát" không có nghĩa là "vô hại với bạn" |
| `krypton` | Sửa tầng mạng. README chính thức nói rõ: **tác giả không bảo đảm gì về tính ổn định và tương thích với mod khác** |
| `c2me-fabric` | Xử lý chunk đa luồng hóa, thứ tự thời gian không còn như đơn luồng |
| `async` | Xử lý thực thể song song hóa (qua nhiều nhân CPU và luồng), thứ tự xử lý thực thể theo đó thay đổi |

Giải thích từng điều:

- **`lithium`** là cái được khuyến nghị nhiều nhất trong loại này, cũng là cái dễ khiến người ta mất cảnh giác nhất: nó được mô tả là tối ưu phổ quát, nhưng "cố gắng không thay đổi hành vi" và "tuyệt đối không thay đổi hành vi" là hai chuyện khác nhau. **Trước khi cài hãy thử thật trên máy** —— nhất là những thiết bị nhạy với sinh quái, AI, cập nhật khối.
- **`krypton`** có lập trường rõ nhất: README chính thức viết thẳng là không bảo đảm gì về tính ổn định và tương thích. Đây không phải "không dùng được", mà là "có vấn đề thì đừng trông tác giả đỡ". Dùng trên máy chủ công khai phải cân nhắc.
- **`c2me-fabric`** song song hóa xử lý chunk. Đa luồng sẽ thay đổi thời điểm tải, sinh và gỡ chunk, mà **vùng nạp thường trực và phần máy móc vắt qua chunk chính là chỗ dễ có vấn đề nhất vì việc này**.
- **`async`** đưa xử lý thực thể song song lên nhiều nhân CPU và luồng. Thực thể song song nghĩa là thứ tự tick không còn bắt đầu lần lượt, máy dựa vào thứ tự thực thể hoặc thứ tự thời gian va chạm là loại mong manh nhất.

Kết luận mục này: **lợi ích của bốn loại mod này là thật, rủi ro máy mất hiệu lực cũng là thật, nên chỉ còn cách "thử trên máy trước".**

## Năm, ba nguyên tắc cài mod tối ưu trên máy chủ kỹ thuật redstone

Gom nội dung trên lại thành ba nguyên tắc làm được:

```
1. Ưu tiên loại không liên quan hành vi     —— bộ nhớ, khởi động, phân tích, tạo trước cài trước
2. Loại đổi thứ tự thời gian thì thử trên máy trước   —— mỗi lần chỉ thêm một, thêm xong kiểm chứng ngay trên máy
3. Dùng spark để so sánh    —— đo một lần trước khi thêm, một lần sau khi thêm, xem dữ liệu chứ không xem cảm giác
```

Nói rộng ra một chút:

1. **Ưu tiên loại không liên quan hành vi**. Cài nhóm ở mục hai trước, chúng gần như không ảnh hưởng hành vi máy móc, lợi ích cũng trực tiếp nhất. Vấn đề của nhiều máy chủ đến bước này đã giảm được phần lớn.
2. **Loại đổi thứ tự thời gian thì thử trên máy trước**. Bốn mod ở mục bốn đừng đưa hết lên một lần, **mỗi lần chỉ thêm một**, thêm xong chạy ngay một lượt trên máy tiêu biểu —— tháp sinh quái còn ra hàng không, máy còn chạy như dự kiến không. Có vấn đề thì lùi đúng cái này, chứ không đạp đổ tất cả.
3. **Mỗi lần chỉ thêm một và so sánh bằng `spark`**. `spark` là công cụ phân tích, giá trị của nó là cho bạn biết "thêm vào rồi rốt cuộc có nhanh hơn không". **Mod tối ưu không có dữ liệu chống đỡ đều chỉ là an ủi tâm lý**.

Hai thói quen vận hành nữa, không liên quan bản thân mod nhưng cũng quan trọng như nhau:

- Trước khi cài mod hoặc đổi mod **sao lưu thế giới trước**, quy trình liên quan xem [Sao lưu và khôi phục](/tutorials/java/backup).
- Có vấn đề thì **gỡ mod vừa thêm gần nhất trước**, đây là cách định vị nhanh nhất.

## Sáu, kết nối với các bài khác

- **Tối ưu ở tầng cấu hình** (khoảng cách hiển thị, khoảng cách mô phỏng, JVM, tư duy tạo trước): [Tối ưu hiệu năng](/tutorials/java/optimize)
- **Cách dùng công cụ phân tích**: [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark)
- **Loader và tìm lỗi của máy chủ mod**: [Hướng dẫn đầy đủ máy chủ mod](/tutorials/java/modded)
- **Vì sao máy chủ kỹ thuật redstone ưu tiên chọn Fabric**, và đánh đổi của phía đa luồng: [Chọn lõi máy chủ](/tutorials/java/sd-server)
- **Vì sao hành vi bản gốc lại quan trọng đến thế**: [Kỹ thuật redstone và máy móc](/tutorials/java/redstone), [Kỹ thuật redstone và máy móc nâng cao](/tutorials/java/redstone-advanced)

## Bước tiếp theo

Tối ưu phải có dữ liệu chống đỡ, trước hết dùng `spark` biến kết luận thành con số: xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark). Tư duy tổng thể xem [Tối ưu hiệu năng](/tutorials/java/optimize); chọn lõi máy chủ xem [Chọn lõi máy chủ](/tutorials/java/sd-server) và [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet).

---

> Danh sách mod, loader, phiên bản hỗ trợ và lượng tải trong bài đều lấy từ mục chính thức trên Modrinth; kết luận về `memoryleakfix`, `starlight`, `krypton` trích từ README chính thức của từng mod. Trước khi cài hãy đối chiếu lại trang dự án một lần nữa, phiên bản và mô tả sẽ thay đổi theo cập nhật của dự án.
