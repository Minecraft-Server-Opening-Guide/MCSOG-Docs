---
title: Proxy đa máy chủ
slug: proxy
cat: java
level: 3
order: 13
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, nâng cao, velocity, bungeecord, proxy, đa máy chủ]
updated: 2026-10-04
draft: false
---

Khi máy chủ từ "một máy chủ" chuyển thành "một nhóm máy chủ" (sảnh chờ + sinh tồn + minigame…), cần **proxy** để thống nhất cửa vào.

## Một, proxy làm gì

Proxy **tự nó không chạy thế giới**, nó chỉ làm một việc: **nhận kết nối của người chơi, rồi chuyển tiếp tới một máy chủ con phía sau**.

```
Người chơi → Proxy (Velocity / BungeeCord)
              ├→ Máy chủ sảnh chờ
              ├→ Máy chủ sinh tồn
              └→ Máy chủ minigame
```

Lợi ích:

- **Cửa vào thống nhất**: người chơi chỉ nhớ một địa chỉ, chuyển máy chủ con không bị ngắt kết nối, không phải kết nối lại.
- **Xác thực tài khoản thống nhất**: xác thực bản quyền làm một lần ở proxy, phía sau toàn bộ đặt chế độ offline (tin cậy nội bộ).
- **Dễ bảo trì**: thêm một máy chủ con chỉ cần đăng ký một dòng trong cấu hình proxy, người chơi không cảm nhận.
- **Chia sẻ tài nguyên**: sảnh chờ, máy chủ đăng nhập, minigame có thể khởi động lại độc lập, không ảnh hưởng máy chủ khác.

## Hai, chọn cái nào

| Proxy | Giải thích |
| --- | --- |
| **Velocity** | Giải pháp hiện đại, **hiệu năng tốt hơn, sôi động hơn**, dự án mới ưu tiên nó. Hỗ trợ "modern forwarding", thông tin xác thực được truyền an toàn qua khóa |
| **BungeeCord** | Giải pháp lâu đời, hệ sinh thái chín muồi, tài liệu rất nhiều, nhiều hướng dẫn cũ dựa vào nó. Phù hợp bảo trì máy chủ cũ có sẵn |

> Hai bên cùng tư duy, khác nhau ở chi tiết cấu hình và cơ chế chuyển tiếp. **Mở máy chủ mới nên dùng Velocity**.

## Ba, điểm chính khi dựng

### 1. Proxy

- Tải jar proxy, để riêng một thư mục, viết script khởi động để chạy.
- Trong cấu hình đăng ký **danh sách máy chủ con** (tên + địa chỉ nội bộ + cổng).
- Xác thực bản quyền **chỉ bật ở proxy**: proxy `online-mode=true`, máy chủ con bắt buộc `online-mode=false`.

### 2. Máy chủ con

Máy chủ con phải "giao lòng tin" cho proxy, tức là **chỉ nhận kết nối từ proxy**:

- **Velocity**: dùng **modern forwarding**, cấu hình cùng một `forwarding.secret` trên proxy và máy chủ con, máy chủ con bật chế độ chuyển tiếp tương ứng.
- **BungeeCord**: bật `bungeecord: true` trong cấu hình máy chủ con (họ Spigot), và tắt xác thực bản quyền của chính máy chủ con.

### 3. Điểm bảo mật then chốt

:::warn Khóa chuyển tiếp chính là chìa khóa của máy chủ
Một khi máy chủ con tin cậy chuyển tiếp từ proxy, **bất kỳ ai biết khóa đều có thể giả mạo bất kỳ danh tính người chơi nào để vào**. Vì vậy:

- `forwarding.secret` **đừng để lộ, đừng commit lên kho công khai**;
- Cổng máy chủ con **đừng để lộ trực tiếp ra Internet**, chỉ cho máy chạy proxy truy cập (dùng tường lửa giới hạn nguồn).
:::

## Bốn, lưu ý

- **Plugin phải phân biệt vị trí**: có plugin cài ở proxy (chat đa máy chủ, quyền toàn cục), có cái bắt buộc cài ở máy chủ con. Cài sai vị trí sẽ có hiện tượng "lệnh có tồn tại nhưng không phản ứng".
- **Proxy thêm một chặng**: độ trễ của người chơi tăng nhẹ, thường bỏ qua được, nhưng đường truyền kém sẽ bị khuếch đại.
- **Máy chủ mod khó trộn**: chuyển tiếp của proxy hỗ trợ máy chủ mod có hạn, đa máy chủ cho máy chủ mod thường cần giải pháp riêng.
- **Đồng bộ túi đồ/dữ liệu**: khi đổi máy chủ, túi đồ, vị trí của người chơi do proxy và máy chủ con phối hợp xử lý, **đừng chia sẻ cùng một thư mục thế giới giữa các máy chủ con**.
- **Đừng coi proxy là "tối ưu hiệu năng"**: nó không nâng hiệu năng, chỉ là cửa vào thống nhất về **cấu trúc**. Máy chủ đơn không cần nó.

## Năm, khi nào nên dùng proxy

**Nên dùng**: có nhiều phân khu cách chơi, cần cửa vào thống nhất, người chơi cần tự do chuyển giữa các máy chủ, cần sảnh chờ và máy chủ đăng nhập.

**Không nên dùng**: chỉ có một máy chủ. **Thêm một tầng là thêm một điểm có thể hỏng**, máy chủ nhỏ dùng proxy thuần túy là tăng chi phí bảo trì.

## Bước tiếp theo

Muốn người chơi trên điện thoại (Bedrock) cũng vào được: xem [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
