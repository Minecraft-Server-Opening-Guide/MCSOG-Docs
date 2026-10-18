---
title: Các loại máy chủ Bedrock Edition
slug: type
cat: bedrock
level: 1
order: 1
minutes: 8
tags: [Bedrock Edition, loại máy chủ, addon, máy chủ plugin]
updated: 2026-10-04
draft: false
---

Trước khi mở máy chủ Bedrock Edition, hãy nghĩ rõ **bạn muốn mở loại máy chủ nào**. Loại quyết định bạn dùng được lõi nào, cài được gì, và chi phí bảo trì.

Bedrock Edition có năm loại chính:

## Một, Máy chủ thuần (máy chủ bản gốc)

Chạy **hoàn toàn theo quy tắc chính thức**, không thêm plugin cũng không thêm Addon.

- **Ưu**: nguyên vị, ổn định nhất, gần như không bảo trì (không phải lo tương thích và cập nhật plugin)
- **Nhược**: chức năng chỉ có chừng đó thứ của bản gốc
- Phù hợp: muốn cung cấp trải nghiệm bản gốc **công bằng ổn định**; dùng **BDS** là phù hợp nhất

## Hai, Máy chủ Addon (chỉ BDS)

Nạp **Addon** (gói hành vi / gói tài nguyên) mà chính thức hỗ trợ trên **BDS** chính thức để mở rộng nội dung.

- **Ưu**: chính thức hỗ trợ, tương thích phiên bản tốt, ảnh hưởng độ ổn định ít
- **Nhược**: khả năng tùy biến có hạn (thêm được nội dung như khối, vật phẩm, sinh vật, nhưng không sửa được logic máy chủ)
- Phù hợp: muốn giữ đặc tính chính thức, lại muốn thêm chút nội dung tự định nghĩa

## Ba, Máy chủ plugin

Dùng **lõi máy chủ bên thứ ba** (Nukkit / PowerNukkitX / PocketMine-MP…) để cài plugin, mở rộng chức năng mạnh.

- **Ưu**: tùy biến cao, nhiều loại plugin, nhiều hướng dẫn cộng đồng
- **Nhược**: có thể có vấn đề tương thích plugin và độ ổn định; **bản thân BDS chính thức không hỗ trợ plugin**, phải nhờ loader cộng đồng
- Phù hợp: muốn làm lối chơi đặc sắc, sẵn sàng bỏ thời gian chỉnh plugin

## Bốn, Máy chủ minigame (một loại máy chủ plugin)

Tập trung vào minigame như wall war, skyblock, mê cung.

- **Ưu**: tính giải trí cao, nhịp nhanh, phù hợp chơi thời gian ngắn
- **Nhược**: nội dung phải **cập nhật liên tục** mới giữ được người, chi phí vận hành cao
- Phù hợp: muốn làm hướng thi đấu/giải trí, và có nhân lực làm nội dung liên tục

## Năm, Máy chủ lai Addon + plugin (chỉ BDS)

Vừa dùng Addon chính thức, vừa mở rộng qua loader plugin cộng đồng.

- **Ưu**: được cả đặc tính chính thức lẫn tự do của plugin
- **Nhược**: cấu hình phức tạp, phải quản cả hai bên, vấn đề tương thích nhiều hơn, yêu cầu hiệu năng cao hơn
- Phù hợp: chủ máy chủ **có kinh nghiệm**, xử lý được vấn đề tương thích

## Chọn thế nào

| Mục tiêu của bạn | Gợi ý |
| --- | --- |
| Sinh tồn bản gốc, ổn định đỡ việc | **Máy chủ thuần + BDS** |
| Thêm nội dung nhưng không muốn động plugin | **Máy chủ Addon + BDS** |
| Muốn lối chơi phong phú, chịu khó vọc | **Máy chủ plugin** (Nukkit / PNX / PMMP) |
| Làm minigame | Máy chủ plugin + plugin minigame |
| Vừa muốn chính thức vừa muốn plugin | **BDS + loader plugin** |

Chọn xong loại, bước tiếp theo là chọn lõi cụ thể: xem [Chọn lõi Bedrock Edition](/tutorials/bedrock/cores).

---

> Một phần nội dung bài này tham khảo từ mục Bedrock Edition của [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
