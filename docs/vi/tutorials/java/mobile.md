---
title: Hỗ trợ người chơi trên điện thoại
slug: mobile
cat: java
level: 2
order: 14
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, geyser, floodgate, bedrock, điện thoại, đa nền tảng, udp]
updated: 2026-10-04
draft: false
---

Rất nhiều người chơi chỉ chơi Minecraft trên **điện thoại / máy tính bảng / máy chơi game**, đó là **Bedrock Edition**. Mặc định người chơi Bedrock **không vào được máy chủ Java Edition** —— giao thức hai phiên bản hoàn toàn khác nhau.

Dùng **Geyser** có thể nối thông con đường này, để máy chủ Java của bạn cũng nhận được người chơi trên điện thoại.

## Một, Geyser là một chiều (phải làm rõ điểm này trước)

FAQ chính thức của Geyser viết rất rõ:

> **Có thể dùng Geyser để người chơi Java kết nối vào máy chủ Bedrock của tôi không?**
> **Không. Đây là công cụ chuyển đổi cho phép người chơi Bedrock kết nối vào máy chủ Java, chiều ngược lại không được.**

Nên:

| Chiều | Có khả thi không | Giải pháp |
| --- | --- | --- |
| Người chơi Bedrock → **máy chủ Java** | Khả thi | **Geyser** (+ Floodgate) |
| Người chơi Java → máy chủ Bedrock | Không có giải pháp chính thức | Không tồn tại |

**Geyser cài ở phía máy chủ Java**; máy chủ chính thức của Bedrock (BDS) **không cài được Geyser**.

## Hai, cài ở đâu, cài thế nào

Geyser có nhiều hình thức, chọn theo loại máy chủ Java của bạn:

- **Dạng plugin**: máy chủ plugin như Spigot / Paper / Purpur (phổ biến nhất)
- **Dạng proxy**: Velocity / BungeeCord (trong cấu trúc đa máy chủ thì cài ở proxy)
- **Dạng mod**: Fabric / NeoForge
- **Dạng độc lập (standalone)**: không phụ thuộc nền tảng trên, chạy riêng

Cài xong khởi động lại máy chủ, Geyser sẽ sinh tệp cấu hình của riêng nó.

## Ba, then chốt: phải mở cổng UDP

Đây là bước dễ bỏ sót nhất:

| Cổng | Giao thức | Mục đích |
| --- | --- | --- |
| `25565` | **TCP** | Người chơi Java kết nối |
| `19132` | **UDP** | **Người chơi Bedrock kết nối (Geyser lắng nghe)** |
| `19133` | UDP | Cổng mặc định IPv6 của Bedrock |

:::warn Chỉ mở TCP là nguyên nhân số một khiến người chơi điện thoại không kết nối được
Nhóm bảo mật của máy chủ đám mây và tường lửa hệ thống **cả hai nơi** đều phải mở **UDP 19132**. Nhiều người chỉ mở TCP 25565, rồi mãi thắc mắc "vì sao điện thoại không kết nối được".
:::

Người chơi điện thoại trong "Thêm máy chủ" điền: **Địa chỉ = IP hoặc tên miền của bạn, cổng = 19132**.

## Bốn, Floodgate: để người chơi điện thoại không cần tài khoản Java

Mặc định, máy chủ Java bật xác thực bản quyền, người chơi Bedrock **không có tài khoản Java**, sẽ bị chặn ngoài cửa.

**Floodgate** chính là để giải quyết việc này: nó cho người chơi Bedrock **vào thẳng bằng tài khoản Xbox**, không cần mua bản Java.

Các điểm chính:

- Floodgate thường cài kèm Geyser;
- Tên người chơi Bedrock sẽ có một **tiền tố** (mặc định `.`), dùng để phân biệt với người chơi Java;
- Vì vậy khi ghi tên trong **danh sách trắng, cấm, lệnh** cần chú ý tiền tố này, khi cần thì bọc trong dấu ngoặc kép;
- Cũng có thể dùng chức năng liên kết tài khoản của Floodgate để gắn tài khoản Bedrock với tài khoản Java sẵn có.

## Năm, hạn chế đã biết (báo trước cho người chơi)

- **Nền tảng máy chơi game bị hạn chế**: người chơi Xbox / PlayStation / Switch **không nhập IP trực tiếp để vào được**, thường chỉ kết nối được qua **DNS tùy chỉnh** hoặc **mạng LAN**.
- **Bất thường thị giác ở khoảng cách xa**: client Bedrock là 32 bit, Java là 64 bit, đi rất xa có thể gặp vấn đề vị trí/kết xuất kỳ lạ (cộng đồng có giải pháp giảm nhẹ không chính thức).
- **Một số plugin không tương thích**: Geyser mô phỏng client Java, tuyệt đại đa số plugin dùng được, nhưng số ít plugin can thiệp sâu vào đăng nhập/giao thức sẽ xung đột.
- **Gói tài nguyên phải chuyển định dạng**: gói tài nguyên Java Bedrock không đọc được, cần chuyển sang định dạng Bedrock rồi mới dùng cho Geyser.
- **Máy chủ mod có giới hạn**: nếu máy chủ yêu cầu client cài mod mới vào được, Geyser cũng không đưa vào được ("client bản gốc vào được thì Geyser mới vào được").

## Sáu, có nên mở đa nền tảng không

**Nên mở**: muốn mở rộng nguồn người chơi, trong máy chủ đã có nhóm người chơi điện thoại, cách chơi thiên về sinh tồn/xây dựng (không nhạy với redstone chính xác).

**Cân nhắc kỹ**: **máy chủ kỹ thuật redstone**. Hành vi redstone của Bedrock và Java Edition vốn đã khác nhau, người chơi đa nền tảng thấy cơ chế không nhất quán, dễ phát sinh tranh cãi.

## Bước tiếp theo

Dữ liệu là vô giá, hãy sao lưu trước: xem [Sao lưu và khôi phục](/tutorials/java/backup).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
