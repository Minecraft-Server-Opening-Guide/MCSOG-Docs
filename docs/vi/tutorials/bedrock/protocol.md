---
title: Phiên bản giao thức và chọn phiên bản
slug: protocol
cat: bedrock
level: 2
order: 2
minutes: 10
tags: [Bedrock Edition, phiên bản giao thức, chọn phiên bản, tự động cập nhật, ios]
updated: 2026-10-04
draft: false
---

Cái bẫy dễ vấp nhất khi mở máy chủ Bedrock Edition không phải cấu hình, mà là **phiên bản**. Bài này nói rõ hai việc: phiên bản giao thức là gì, và nên chọn phiên bản game nào.

## Một, Phiên bản giao thức: "ngôn ngữ" giữa client và máy chủ

Hãy hiểu phiên bản giao thức là **phiên bản ngôn ngữ hai bên dùng để nói chuyện**:

> 1.20.50 nói "tiếng Hán cổ" (giao thức **630**), 1.20.60 nói "tiếng Hán hiện đại" (giao thức **649**).
> Hai người khác ngôn ngữ thì **không hiểu nhau** —— nên client 1.20.60 **không kết nối được** máy chủ chạy giao thức 1.20.50, sẽ báo "mọi người chơi nên cập nhật lên phiên bản mới nhất rồi thử lại".

Nghĩa là: **giao thức client phải khớp giao thức máy chủ** mới vào được. Điều này khác logic "tương thích phiên bản" của Java Edition, Bedrock Edition chặt hơn nhiều.

### Khi nào giao thức đổi

- **Thông thường**: khi chữ số hàng chục của số sửa đổi đổi thì giao thức đổi. Ví dụ `1.20.10`–`1.20.15` cùng là **594**; từ `1.20.30` thành **618**; từ `1.20.40` thành **622**.
- **Ngoại lệ**: chính thức đôi khi đổi giao thức ngay trong cùng hàng chục. Ví dụ `1.19.60`–`62` và `1.19.63` giao thức khác nhau; `1.21.0`–`1.21.1` và `1.21.2`–`1.21.3` cũng khác.
- Đại khái **khoảng mỗi năm tuần** lại có một phiên bản đổi giao thức.

:::tip Tra số giao thức
Phiên bản cụ thể ứng với số giao thức nào, lấy danh sách phiên bản trên **Minecraft Wiki** làm chuẩn.
:::

## Hai, Nên chọn phiên bản game nào

**Nói kết luận trước**: không có nhu cầu cụ thể thì **chọn bản mới nhất**. Máy chủ bản mới nhất thường hỗ trợ client bản mới nhất.

### Vài thay đổi phía client ảnh hưởng lớn đến người chơi

Những cập nhật này chính thức nói nhẹ nhàng, nhưng ảnh hưởng đến việc mở máy chủ không nhỏ:

| Phiên bản | Ảnh hưởng |
| --- | --- |
| **1.20.50** | Nhiều khối bị "làm phẳng", mã được tái cấu trúc → **tương thích plugin đa phiên bản dưới phiên bản này kém đi** |
| **1.20.40** | Bố cục cảm ứng mới cho phép tự định nghĩa vị trí |
| **1.20.x** (khoảng) | Android xuất hiện vấn đề **lag nghiêm trọng**, cộng đồng lâu dài không có cách giải |
| **1.19.50** | Thêm bố cục cảm ứng mới |
| **1.18.30** | Client đưa **render dragon** vào → **shader truyền thống không dùng được nữa**, chỉ còn hardware ray tracing hoặc deferred rendering |

### Chú ý "tự động cập nhật" mới là cái bẫy lớn nhất

Các cửa hàng ứng dụng lớn mặc định **tự động cập nhật** client. Bedrock Edition vài phiên bản lại đổi giao thức, thế là:

> Client của người chơi tự cập nhật lúc bạn không biết → **giao thức đổi** → họ **không vào được máy chủ của bạn**

Java Edition hiếm gặp vì tự động cập nhật chỉ có trong trình khởi động chính thức, mà người chơi không nhất thiết dùng trình khởi động chính thức.

**Chỉ có hai con đường ứng phó**:

1. **Liên tục theo bản mới nhất** (cập nhật cả máy chủ lên bản mới nhất) —— khuyến nghị, cũng là cách làm mặc định của cộng đồng;
2. **Yêu cầu người chơi cố định phiên bản** —— nhưng cách này kéo theo vấn đề dưới đây.

### Cái giá của việc cưỡng chế cố định phiên bản

Nếu bạn chọn cố định một phiên bản cũ nào đó:

- **Mất gần như toàn bộ người chơi iOS**: cơ chế của iOS quyết định họ **chỉ cài được bản mới nhất**, không cài được gói cài chỉ định (cộng đồng đến nay chưa có cách giải hoàn hảo);
- **Mất toàn bộ người chơi chỉ chơi bản mới nhất**: máy chủ theo bản mới nhất và nhóm người chơi đó đều rất đông;
- Chăm sóc khách hàng phải **hướng dẫn tay** những người không biết cài apk / appx.

Ngoài ra, bản thân người chơi cũng nghiêng về bản mới nhất: cửa hàng ứng dụng bên thứ ba ưu tiên cung cấp gói cài bản mới nhất; thông tin cộng đồng cũng xoay quanh bản mới nhất; và Bedrock Edition **chuyển phiên bản giữa các nền tảng rất phiền**, nên cộng đồng hình thành sự ăn ý "cả nhóm theo bản mới nhất".

:::warn Trước khi chọn cố định phiên bản hãy tính rõ tổn thất
Chỉ khi những tổn thất trên **không ảnh hưởng nghiêm trọng đến độ nổi tiếng của máy chủ** thì mới cân nhắc cố định phiên bản. Nếu không, hãy giữ máy chủ ở bản mới nhất.
:::

## Bước tiếp theo

Chốt chiến lược phiên bản rồi, hãy đi chọn lõi: xem [Chọn lõi Bedrock Edition](/tutorials/bedrock/cores).

---

> Một phần nội dung bài này tham khảo từ mục Bedrock Edition của [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
