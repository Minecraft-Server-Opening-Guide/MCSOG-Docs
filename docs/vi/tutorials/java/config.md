---
title: Cấu hình máy chủ
slug: config
cat: java
level: 1
order: 7
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, cấu hình, server.properties, xác thực bản quyền, khoảng cách hiển thị, gamerule]
updated: 2026-10-04
draft: false
---

Sau lần khởi động đầu tiên của máy chủ, thư mục gốc sẽ sinh ra `server.properties`. **Sửa xong bắt buộc phải khởi động lại máy chủ mới có hiệu lực** (nó không phải loại nạp lại nóng).

Mở nó bằng trình soạn thảo văn bản, dưới đây là các mục hay sửa nhất.

## Một, các mục hay sửa nhất

| Mục | Mặc định | Giải thích |
| --- | --- | --- |
| `server-port` | `25565` | Cổng máy chủ lắng nghe, đổi thì phải đổi cả tường lửa/nhóm bảo mật |
| `online-mode` | `true` | **Xác thực bản quyền**. Giữ `true` thì client không bản quyền không vào được; đổi `false` là chế độ offline |
| `max-players` | `20` | Số người trực tuyến tối đa cùng lúc |
| `motd` | — | Dòng chữ hiển thị trong danh sách máy chủ (hỗ trợ mã màu) |
| `difficulty` | `easy` | `peaceful`/`easy`/`normal`/`hard` (cũng nhận `0`~`3`) |
| `gamemode` | `survival` | Chế độ mặc định của người chơi mới: `survival`/`creative`/`adventure`/`spectator` |
| `force-gamemode` | `false` | Đặt `true` thì mỗi lần vào máy chủ người chơi bị buộc đổi về chế độ mặc định |
| `pvp` | `true` | Có cho phép người chơi tấn công nhau hay không |
| `allow-flight` | `false` | Chế độ sinh tồn có cho phép bay hay không (cài plugin bay nên bật) |
| `spawn-protection` | `16` | Bán kính bảo vệ điểm sinh ra, chỉ OP mới phá/đặt được trong phạm vi này; `0` là tắt |
| `allow-nether` | `true` | Có cho phép đến Nether hay không (`false` sẽ vô hiệu hóa Nether) |
| `generate-structures` | `true` | Chunk mới có sinh ra công trình như làng hay không |
| `level-seed` | trống | Seed thế giới, để trống là ngẫu nhiên |
| `enable-command-block` | `false` | Có bật khối lệnh hay không, **nói chung không khuyến nghị bật** (xem dưới) |
| `white-list` | `false` | Có bật danh sách trắng hay không |
| `view-distance` | `10` | **Khoảng cách hiển thị**, một trong những mục ảnh hưởng hiệu năng nhất |
| `simulation-distance` | `10` | **Khoảng cách mô phỏng**, quyết định thực thể/redstone trong phạm vi bao xa vẫn còn tính toán |

### Về khoảng cách hiển thị và khoảng cách mô phỏng

Hai nút này là **hai nút tốn hiệu năng nhất**, hiệu quả tức thì hơn cả việc đổi lõi:

- `view-distance` quyết định người chơi "nhìn" được bao xa, hạ xuống tiết kiệm rõ băng thông và CPU, nhưng phía xa sẽ mờ sương.
- `simulation-distance` quyết định chunk trong phạm vi bao xa vẫn **tính toán thật** (sinh quái, redstone, cây trồng mọc). Hạ nó tiết kiệm nhiều hơn hạ khoảng cách hiển thị, mà không ảnh hưởng cảm quan.

:::tip Chỉnh hai mục này trước, rồi mới tính nâng phần cứng
Rất nhiều trường hợp "máy chủ lag" thực ra chỉ cần hạ `simulation-distance` từ 10 xuống 6 là giảm rõ.
:::

### Về khối lệnh

`enable-command-block` mặc định tắt, và **đa số trường hợp không khuyến nghị bật**: khối lệnh có hiệu suất triển khai trên máy chủ thấp, trong khi hầu hết chức năng của nó đều có thể làm hiệu quả hơn bằng plugin (và plugin còn kiểm soát quyền và ghi vết được). Khi thực sự cần cách chơi khối lệnh bản gốc thì mới bật.

## Hai, xác thực bản quyền và chế độ offline

- `online-mode=true` (mặc định): sẽ xác minh tài khoản với Mojang, client không bản quyền không vào được.
- `online-mode=false`: ai cũng vào được, nhưng **ai cũng có thể mạo danh bất kỳ ID nào**, cũng không dùng được skin bản quyền và liên kết UUID.

Nếu vì lý do đặc biệt buộc phải dùng chế độ offline, thường còn phải cấu hình thêm plugin skin như `SkinsRestorer` để bù lại việc hiển thị skin.

:::warn Cái giá của chế độ offline
Trong chế độ offline, tài khoản không có bảo đảm nào: cấm có thể lách bằng cách đổi ID, quyền quản trị cũng dễ bị mạo danh. **Máy chủ công khai không nên tắt xác thực bản quyền.**
:::

## Ba, quy tắc trò chơi (gamerule)

Độ khó, bảo vệ điểm sinh ra thì sửa trong `server.properties`; còn **quy tắc trò chơi phải sửa bằng lệnh**:

```
/gamerule keepInventory true         Giữ vật phẩm khi chết
/gamerule doDaylightCycle false      Tắt chu kỳ ngày/đêm
/gamerule mobGriefing false          Creeper không phá khối
/gamerule announceAdvancements false Không thông báo khi đạt tiến trình
```

Chạy trong console hoặc trong game (cần OP), **có hiệu lực ngay và được lưu lại**.

## Bốn, tư thế chung khi sửa cấu hình

1. **Tắt máy chủ trước** rồi mới sửa `server.properties` (khi sửa cấu hình liên quan đến thế giới càng phải tắt, tránh xung đột ghi bản lưu).
2. Sửa xong **sao lưu tệp gốc trước**, có sự cố khôi phục ngay được.
3. Sau khi khởi động lại xem `logs/latest.log` để xác nhận không có lỗi cấu hình.
4. Cấu hình plugin nằm ở `plugins/tên-plugin/config.yml`, phần lớn hỗ trợ `/tên-plugin reload` nạp lại nóng —— nhưng **cấu hình của chính máy chủ thì không hỗ trợ**.

## Bước tiếp theo

Cấu hình xong, hãy triển khai tới môi trường để người khác truy cập được: xem [Triển khai tới môi trường truy cập được](/tutorials/java/deploy).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
