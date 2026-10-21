---
title: Máy chủ BDS
slug: bds
cat: bedrock
level: 2
order: 4
minutes: 12
tags: [Bedrock Edition, bds, cấu trúc thư mục, loader plugin, levilamina, endstone, bdsx]
updated: 2026-10-04
draft: false
---

**BDS** chính thức là lựa chọn ổn định nhất của Bedrock Edition, nhưng **bản thân nó không hỗ trợ plugin**. Bài này nói rõ cấu trúc thư mục của nó, và cách dùng loader cộng đồng bù thêm năng lực plugin.

## Một, Cấu trúc thư mục

BDS giải nén ra là một bộ thư mục "chạy ngay", nhận biết mấy cái này là đủ:

| Tệp / thư mục | Tác dụng | Có động được không |
| --- | --- | --- |
| `bedrock_server.exe` | **Chương trình khởi động máy chủ** (trên Linux không có `.exe`) | Đổi tên được, nhưng **không khuyến nghị** —— đổi tên xong đường dẫn khởi động trong script/panel đều phải đổi theo, dễ sai |
| `server.properties` | Cấu hình máy chủ (cổng, độ khó, chế độ…) | Hay sửa |
| `allowlist.json` | Danh sách **danh sách trắng** (bật danh sách trắng trong `server.properties` rồi quản ở đây) | Sửa được |
| `permissions.json` | Dữ liệu **quản trị viên (OP)** (UUID, tên, quyền) | Sửa được |
| `valid_known_packs.json` | Danh sách gói bổ trợ đã biết (gói hành vi / gói tài nguyên), máy chủ dựa vào đây để xác minh | Thường không cần động |
| `worlds/` | **Bản lưu thế giới** (mỗi thế giới một thư mục con) | Chỉ sao lưu nguyên khối |
| `bedrock_server.pdb` | Tệp cơ sở dữ liệu chương trình dùng để gỡ lỗi | Đừng động |
| `bedrock_server_how_to.html` | Hướng dẫn sử dụng chính thức | Đọc được |
| `release-notes.txt` | Nhật ký cập nhật phiên bản | Đọc được |

### Trong thư mục thế giới có gì

Dưới `worlds/<tên-thế-giới>/`:

| Tệp / thư mục | Nội dung |
| --- | --- |
| `db/` | **Dữ liệu bản lưu** (tệp cơ sở dữ liệu của thế giới, kích thước lớn nhất) |
| `level.dat` | Thiết lập và thuộc tính cơ bản của thế giới (game rule, thời gian, thời tiết…) |
| `level.dat_old` | Thiết lập bản lưu cũ (dùng khi cập nhật hoặc sao lưu) |
| `level_name.txt` | Tên thế giới |

:::warn Sao lưu là sao lưu `worlds/`
Bản lưu của BDS đều trong `worlds/`, **sao lưu cả thư mục**. Đừng chỉ chép `db/`, nếu không sẽ mất thiết lập.
:::

## Hai, Thêm plugin cho BDS: ba loader chính

BDS chính thức không có hệ thống plugin, cộng đồng làm loader để bù. Hiện có ba cái chính:

### LeviLamina (tên khác LLL / LLv3) —— **khuyến nghị nhất**

- Tác giả: LiteLDev (tiền thân chính là **LiteLoaderBDS**)
- Định vị: loader plugin BDS nhẹ, mô-đun hóa, đa chức năng
- **Mức khuyến nghị: rất khuyến nghị** —— hệ sinh thái plugin tốt nhất, tiếp nối đỉnh cao thời LiteLoader
- Phiên bản hỗ trợ: 1.20.61 – 1.21.3 (vẫn cập nhật)

### EndStone —— có tiềm năng

- Tác giả: EndStoneMC
- Định vị: cung cấp **API thân thiện kiểu Bukkit**, viết plugin được bằng **C++ hoặc Python**
- **Mức khuyến nghị: khá khuyến nghị** —— hiện hệ sinh thái plugin rất ít, nhưng cộng đồng có tiếng nói tham gia phát triển, về sau có thể đuổi kịp LeviLamina
- Phiên bản hỗ trợ: 1.20.71 – 1.21.2 (vẫn cập nhật)

### BDSX —— lâu đời ổn định

- Định vị: bản sửa đổi BDS hỗ trợ **Node.js**, dựa trên BDS chính thức, giữ toàn bộ đặc tính bản gốc, và hỗ trợ hook hàm cùng gói dữ liệu mạng
- **Mức khuyến nghị: khá khuyến nghị** —— plugin trong nước không nhiều, nhưng người dùng không ít, tác giả bảo trì từ 2019 đến nay
- Phiên bản hỗ trợ: 1.12 – mới nhất (vẫn cập nhật)

> Ngoài ba cái này, chính thức cũng cung cấp **loader script** (dựa trên Script API chính thức), năng lực yếu hơn loader bên thứ ba, nhưng được cái là chính thức hỗ trợ.

### Chọn thế nào

| Tình huống của bạn | Gợi ý |
| --- | --- |
| Muốn plugin có sẵn, ưu tiên hệ sinh thái | **LeviLamina** |
| Biết C++ / Python, muốn tự viết | **EndStone** |
| Quen Node.js / cần hook tầng thấp | **BDSX** |
| Chỉ muốn dùng năng lực chính thức, không thêm bên thứ ba | Loader script chính thức |

:::warn Loader gắn chặt với phiên bản game
Loader chỉ hỗ trợ **khoảng phiên bản cụ thể**. **Xác nhận phiên bản máy chủ của bạn nằm trong danh sách hỗ trợ** rồi mới cài, nếu không sẽ nạp thất bại thậm chí không khởi động được. Trước khi nâng phiên bản game cũng phải xác nhận loader đã theo kịp chưa.
:::

## Ba, Hai cái bẫy đã biết của BDS

1. **Nút thắt đơn nhân**: tính toán sinh vật chạy một luồng → độ mượt phụ thuộc **hiệu năng đơn nhân**, bản đồ càng lớn càng lag.
2. **Bộ nhớ tăng chậm**: mức chiếm sẽ từ từ tăng. Chú ý **đừng cưỡng chế dọn bộ nhớ** —— sẽ làm thanh tiến trình khi người chơi tải resource pack/Addon bị kẹt, **chỉ khởi động lại máy chủ** mới giải quyết được.

## Bước tiếp theo

Dựng một máy chủ BDS từ số không trên Windows: xem [Dựng máy chủ BDS trên Windows](/tutorials/bedrock/windows-bds).

---

> Một phần nội dung bài này tham khảo từ mục Bedrock Edition của [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
