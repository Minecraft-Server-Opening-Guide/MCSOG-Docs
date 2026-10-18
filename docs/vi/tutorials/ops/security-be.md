---
title: "[BE] Plugin bảo mật"
slug: security-be
cat: ops
level: 2
order: 4
minutes: 12
tags: [bedrock, ops, an toàn, danh sách trắng, quyền, chơi chéo]
updated: 2026-10-04
draft: false
---

Mô hình an toàn của Bedrock Edition **khác** Java Edition: xác thực bản quyền đi qua **Xbox Live**, máy chủ chính thức BDS **không có hệ thống plugin**. Nên bài này chia hai phần: **cơ chế có sẵn của BDS** (đáng tin, bắt buộc dùng) và **hệ thống plugin của lõi bên thứ ba** (linh hoạt, nhưng phải tự chịu).

## Một, ba cơ chế có sẵn của BDS (hãy dùng tốt chúng trước)

### 1. Danh sách trắng: `allowlist.json`

- Sau khi bật danh sách trắng trong `server.properties`, bản thân danh sách do **`allowlist.json`** trong thư mục máy chủ quản lý.
- Đây là ngưỡng **hiệu quả nhất** của Bedrock Edition: nhóm người chơi Bedrock Edition luân chuyển lớn, chi phí tạo tài khoản phụ thấp, **chặn rắc rối ở ngoài cửa** đỡ việc hơn nhiều so với khóa sau sự việc.
- Sửa danh sách xong thì theo hướng dẫn chính thức cho máy chủ đọc lại (hoặc khởi động lại) để có hiệu lực.

### 2. Quyền quản trị: `permissions.json`

- Quản trị viên (OP) và định nghĩa quyền của BDS nằm trong **`permissions.json`** (gồm UUID người chơi, tên và các mục quyền).
- Khuyến nghị: **chỉ cấp cho người thật sự cần**, và thu hồi kịp thời khi nhân sự thay đổi.

### 3. Xác thực bản quyền: `online-mode`

- `server.properties` của BDS có công tắc `online-mode`: bật thì người chơi phải qua **xác thực tài khoản Xbox Live**.
- **Máy chủ công khai không khuyến nghị tắt**: tắt xong bất kỳ ai cũng mạo danh tên người khác vào được, bị khóa cũng đổi tên là lách được.

:::warn Bedrock Edition không có "hệ sinh thái plugin đăng nhập chín như Java"
Máy chủ offline Java Edition có thể dùng plugin kiểu AuthMe bù thêm một cửa mật khẩu; Bedrock Edition **không có phương án chính thức/cộng đồng ngang hàng, phổ cập tương đương**. Nên cách đúng của Bedrock Edition là: **giữ xác thực bản quyền + dùng danh sách trắng làm ngưỡng**, chứ không trông vào "cài một plugin đăng nhập là an toàn".
:::

## Hai, hệ thống plugin của lõi bên thứ ba

Bản thân BDS không cài được plugin, muốn mở rộng chỉ có thể đổi lõi hoặc thêm loader cộng đồng (xem "Máy chủ BDS" và "Lõi bên thứ ba"):

| Con đường | Giải thích |
| --- | --- |
| **BDS + loader cộng đồng** | LeviLamina / EndStone / BDSX cung cấp năng lực plugin, làm được đăng nhập, quyền, quản lý… |
| **Họ Nukkit** (gồm PowerNukkitX) | Viết bằng Java, có hệ thống plugin gốc, hệ sinh thái và tư duy phía plugin gần với Java Edition |
| **PocketMine-MP** | Viết bằng PHP, số plugin nhiều nhất, đủ loại đăng nhập, quyền, quản lý… |

:::warn Bài này không nêu tên plugin bên thứ ba cụ thể
**Hệ sinh thái phân tán, cách đặt tên lộn xộn, mức độ hoạt động chênh lệch rất lớn** của plugin bên thứ ba Bedrock Edition, nhiều plugin thiếu nguồn chính thức kiểm chứng được lâu dài. Để tránh giới thiệu plugin đã ngừng cập nhật hoặc không rõ nguồn, bài này **chỉ nói con đường và loại**, plugin cụ thể xin tự phân biệt trên nền tảng chính thức của nó theo "thời gian cập nhật gần nhất + lượng tải + có mã nguồn mở không".
:::

### Bốn mục kiểm tra khi chọn plugin

1. **Còn cập nhật không**: giao thức Bedrock Edition vài phiên bản lại đổi, plugin ngừng cập nhật gặp bản mới là chắc chắn sập.
2. **Nguồn có chính thức không**: ưu tiên kho của tác giả hoặc nền tảng plugin chính thức, tránh tệp nén được chuyển tiếp lại.
3. **Có mã nguồn mở / kiểm được không**: plugin loại an toàn (đăng nhập, quyền) càng phải thấy được cách hiện thực.
4. **Có khớp phiên bản lõi của bạn không**: loader và plugin đều gắn chặt khoảng phiên bản (xem "Máy chủ BDS").

## Ba, điểm cần chú ý an toàn do chơi chéo (Geyser / Floodgate)

Nếu bạn dùng Geyser cho người chơi Bedrock vào máy chủ Java, an toàn cần chú ý thêm:

- **Tên người chơi Floodgate có tiền tố** (mặc định `.`), **khi viết tên trong danh sách trắng, lệnh khóa, lệnh thường phải kèm nó**, nếu không sẽ bỏ sót hoặc phán nhầm.
- Floodgate cho người chơi Bedrock **không cần tài khoản Java** là vào được, tức là nới một cửa xác thực, **bắt buộc phải đi với danh sách trắng hoặc duyệt**.
- Geyser cài ở **phía máy chủ Java**, chiều ngược lại (người chơi Java vào máy chủ Bedrock) **không có phương án chính thức**.

## Bốn, nguyên tắc chung (giống Java Edition)

1. **Ngưỡng đặt trước**: danh sách trắng / duyệt khi vào chặn được phần lớn phá hoại và gian lận.
2. **Nội quy viết ngắn**: người chơi Bedrock Edition chủ yếu dùng điện thoại, nội quy phải thẳng, làm được.
3. **Quản lý để lại dấu vết**: ai khóa ai, ai động vào quyền, đều phải tra được.
4. **Sao lưu là phòng tuyến cuối**: xem "Sao lưu và khôi phục" —— chú ý bản lưu của BDS đều trong `worlds/`, phải sao lưu cả thư mục.
5. **Đừng cưỡng chế dọn bộ nhớ**: bộ nhớ BDS tăng chậm, cưỡng chế dọn sẽ làm thanh tải resource pack/Addon của người chơi bị kẹt, chỉ khởi động lại mới giải quyết được (xem "Máy chủ BDS").

## Bước tiếp theo

- Phương án tương ứng của Java Edition xem [[JAVA] Plugin bảo mật](/tutorials/ops/security-java)
- Quản lý người chơi và vận hành xem [[BE] Quản lý vận hành](/tutorials/ops/management-be)
- Tra nhanh tìm lỗi xem [[BE] Câu hỏi thường gặp](/tutorials/faq/faq-be)

---

> Phần mô tả về `allowlist.json`, `permissions.json`, `online-mode` và `worlds/` của BDS trong bài lấy từ hành vi máy chủ BDS chính thức và Minecraft Wiki; phần nói về tiền tố Floodgate lấy từ FAQ chính thức của GeyserMC. Không đưa vào plugin bên thứ ba không kiểm chứng được nguồn.
