---
title: Khác biệt giữa Java Edition và Bedrock Edition
slug: editions
mc: [1.21.x, 1.20.4]
tags: [java, bedrock, so sánh, cổng]
updated: 2026-10-04
---

Java Edition và Bedrock Edition không phải cùng một phiên bản trò chơi, redstone, lệnh và cơ chế mod đều có khác biệt; hãy phân biệt rõ trước khi quyết định mở máy chủ cho phiên bản nào.

> Số cổng và khác biệt redstone là thiết lập chính thức đã định; chi tiết giữa các phiên bản có thể được điều chỉnh, cụ thể lấy hướng dẫn chính thức của phiên bản tương ứng làm chuẩn.

## Bảng đối chiếu khác biệt

| Hạng mục | Java Edition | Bedrock Edition |
| --- | --- | --- |
| Redstone và lệnh | Cơ chế redstone đầy đủ (gồm cả đặc tính quasi-connectivity), chức năng lệnh đầy đủ nhất | Hành vi redstone có khác biệt (không có quasi-connectivity, piston và khối dính biểu hiện khác) |
| Mod và plugin | Hệ sinh thái Fabric / Forge / NeoForge cùng plugin | Chủ yếu là add-on |
| Lựa chọn máy chủ | Paper / Purpur / Fabric / Forge / Velocity | BDS / Nukkit / PocketMine-MP |
| Cổng mặc định | 25565 (TCP) | 19132 (UDP), IPv6 là 19133 (UDP) |
| Kết nối đa nền tảng | Máy chủ Java phải cài Geyser mới nhận người chơi Bedrock (kèm Floodgate có thể bỏ đăng nhập tài khoản Java) | Máy chủ Bedrock không thể cho người chơi Java Edition vào |
| Hiệu năng và tối ưu | Có nhiều nhánh tối ưu và tham số khởi động nhất | BDS chính thức ít tùy chọn tối ưu, chủ yếu dựa vào tinh chỉnh hệ thống |
| Phù hợp với | Ai muốn plugin, mod, tự động hóa và kết nối quy mô lớn | Người chơi điện thoại / máy chơi game, kết nối dùng ngay |

## Lưu ý

Máy chủ Bedrock dùng UDP 19132, Java Edition dùng TCP 25565. Chỉ mở TCP là nguyên nhân không kết nối được phổ biến nhất.

Công cụ đa nền tảng Geyser là một chiều: nó cho client Bedrock kết nối vào máy chủ Java Edition; chiều ngược lại (client Java vào máy chủ Bedrock) không có giải pháp chính thức. Geyser cần cài ở phía máy chủ Java Edition, máy chủ chính thức BDS của Bedrock không cài được.
