---
title: Hướng dẫn dùng chế độ biên tập
slug: edit-mode
updated: 2026-10-03
---

Sau khi đăng nhập, nếu quyền của tài khoản có chứa **mcsog**, thanh trên cùng sẽ hiện nút chế độ biên tập. Khi bật, thanh công cụ biên tập xuất hiện ở cuối trang, mọi thay đổi đều được gửi vào kho GitHub và tự động đồng bộ lên môi trường trực tuyến.

## Có thể sửa những gì

:::step Nội dung chữ trên trang
Bấm "Nội dung" để mở danh sách từ điển (có thể tìm theo mục từ hoặc nội dung), cũng có thể **bấm trực tiếp vào bất kỳ câu chữ nào trên trang**, hệ thống sẽ tra ngược ra khóa từ điển tương ứng và mở hộp chỉnh sửa.
:::

:::step Tài liệu và thông báo
Tại trang hướng dẫn / thông báo / trợ giúp, bấm "Sửa bài này" sẽ mở trình biên tập Markdown, lưu là ghi trở lại vào `docs/` và gửi đi.
:::

:::step Tạo nội dung mới
"Tài liệu mới" chỉ cần điền loại, phân loại, ngôn ngữ, định danh và tiêu đề là tạo được, nội dung hỗ trợ `:::step`, `:::note`, `:::warn`, `:::danger`, khối mã và bảng.
:::

:::step Hình ảnh
"Ảnh" tải lên PNG / JPEG / WebP / GIF / AVIF, trả về địa chỉ có thể dẫn trực tiếp, đồng thời gửi vào kho.
:::

:::step Điều hướng
"Điều hướng" có thể thêm mục điều hướng cho bất kỳ khu vực nào, hoặc xóa mục hiện có (thay đổi ghi vào `nav.config.js`).
:::

:::warn
Ở chế độ biên tập, máy chủ sẽ commit và push bằng khóa đã cấu hình; trước khi phát triển cục bộ hãy `git pull` trước, tránh phân nhánh với commit trực tuyến.
:::

## Quyền và bảo mật

- Quyền đến từ trường `permission` do nhà cung cấp OAuth trả về, chỉ khi chứa token đã cấu hình (mặc định là `mcsog`) mới hiện lối vào biên tập;
- Giao diện ghi dữ liệu kiểm tra quyền lần hai ở máy chủ, và từ chối yêu cầu từ nguồn khác trang;
- Khóa riêng SSH dùng để push được lưu **mã hóa AES-256-GCM** trong `config/edit.php`, chỉ giải mã ra tệp tạm khi chạy (0600) và xóa ngay sau khi push;
- Tải ảnh giới hạn 2 MB và chỉ nhận đúng định dạng ảnh thật.
