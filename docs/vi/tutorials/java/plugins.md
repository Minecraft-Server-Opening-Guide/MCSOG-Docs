---
title: Nhập môn plugin
slug: plugins
cat: java
level: 2
order: 11
minutes: 16
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, plugin, yaml, phụ thuộc, quyền, loại bỏ lỗi]
updated: 2026-10-04
draft: false
---

Plugin là giá trị lớn nhất của **máy chủ plugin** (Paper / Purpur / Spigot…): không sửa client, không bắt người chơi cài gì, vẫn thêm được chức năng cho máy chủ.

## Một, trước tiên phân biệt plugin và mod

| | Plugin | Mod |
| --- | --- | --- |
| Cài ở | `plugins/` của máy chủ | `mods/` của client + máy chủ |
| Người chơi có phải cài gì không | **Không** | Thường là có |
| Dùng cho | Lõi máy chủ plugin | Lõi máy chủ mod (Fabric / Forge / NeoForge) |
| Dùng lẫn được không | **Không**: máy chủ plugin không nạp được mod, máy chủ mod không nạp được plugin (trừ khi dùng máy chủ lai hoặc giải pháp cầu nối) |

## Hai, quy trình chuẩn cài plugin

1. Tải tệp `.jar` của plugin.
2. Bỏ vào thư mục `plugins/` ở thư mục gốc máy chủ.
3. **Khởi động lại máy chủ** (phần lớn plugin không hỗ trợ nạp nóng lần đầu).
4. Xem console: plugin khi khởi động thường in ra tên và phiên bản của nó, lỗi cũng ở đây.
5. Dùng lệnh `plugins` xác nhận trạng thái (xem dưới).

### Dùng `plugins` để phán đoán trạng thái nạp

```
plugins          (dạng ngắn: pl)
```

- **Xanh**: đã nạp —— được (lưu ý: chỉ nghĩa là **lần nạp này thành công**, không có nghĩa là lúc chạy không báo lỗi)
- **Đỏ**: nạp thất bại —— không (máy chủ nhận ra nó, nhưng nạp không thành công, vào console xem lỗi)
- **Hoàn toàn không có**: máy chủ **hoàn toàn không nhận ra** nó là plugin → kiểm tra tệp có thực sự ở `plugins/`, phần mở rộng có phải `.jar`, có tải nhầm loại lõi không (ví dụ cài mod như plugin)

## Ba, plugin phụ thuộc (dependency)

Nhiều plugin tự nó không làm gì, chỉ cung cấp năng lực chung, **phải cài nó trước**, nếu không plugin đích sẽ nạp thất bại:

| Phụ thuộc | Cung cấp gì |
| --- | --- |
| **Vault** | Giao diện thống nhất cho kinh tế / quyền / chat, rất nhiều plugin phụ thuộc |
| **PlaceholderAPI** (PAPI) | Biến placeholder (như hiển thị số dư người chơi, số người trực tuyến), giải pháp chung để plugin lấy dữ liệu lẫn nhau |
| **ProtocolLib** | Năng lực thao tác giao thức tầng thấp, phụ thuộc của nhiều plugin nâng cao |
| **LuckPerms** | Quản lý quyền, kiểm soát chi tiết ai dùng được lệnh nào |

## Bốn, tệp cấu hình và YAML

Cấu hình plugin cơ bản đều ở dưới `plugins/tên-plugin/`, thường là `config.yml`. Khi viết YAML, những bẫy dễ mắc nhất:

- **Thụt lề chỉ được dùng dấu cách, không được dùng Tab** (đây là nguồn lỗi YAML số một).
- Sau dấu hai chấm phải có một dấu cách, như `enabled: true`.
- Cấp bậc thể hiện bằng thụt lề, cùng một cấp phải thụt lề giống nhau.

:::warn Lỗi font tiếng Trung
Khi tệp cấu hình có tiếng Trung mà hiển thị thành ký tự lỗi, phần lớn là **mã hóa tệp không phải UTF-8** (Notepad của Windows khi lưu dạng khác dễ thành ANSI/GBK). Dùng trình biên tập như VS Code, lưu dạng **UTF-8** là được.
:::

### Mã màu

Văn bản máy chủ (MOTD, chat, thông báo của plugin) dùng `&` cộng một chữ cái để biểu thị màu và kiểu, ví dụ:

```
&aXanh lá  &cĐỏ  &lĐậm  &oNghiêng  &rĐặt lại
```

Phạm vi hỗ trợ cụ thể tùy phiên bản máy chủ và plugin.

## Năm, sửa cấu hình xong làm sao có hiệu lực

| Cách | Giải thích |
| --- | --- |
| `/tên-plugin reload` hoặc `/viết-tắt-plugin reload` | Phần lớn plugin hỗ trợ, **ưu tiên** (như `/tab reload`) |
| Khởi động lại máy chủ | Chắc chắn nhất, nhưng plugin không hỗ trợ nạp nóng chỉ còn cách này |
| `/reload` (lệnh bản gốc) | **Không khuyến nghị**, dễ làm trạng thái plugin rối loạn |

## Sáu, chọn plugin theo mục đích

| Mục đích | Lựa chọn phổ biến |
| --- | --- |
| Quyền | LuckPerms |
| Chức năng cơ bản (nhà, dịch chuyển, kit) | EssentialsX, CMI |
| **Chống phá hoại và truy vết** | CoreProtect (tra lịch sử khối, có sự cố biết ai làm) |
| Bảo vệ lãnh thổ | Residence, Dominion, GriefDefender |
| Chỉnh sửa thế giới | WorldEdit, WorldGuard (bảo vệ khu vực) |
| Đa thế giới | Multiverse-Core |
| Định dạng chat | TrChat, Carbon |
| Menu / GUI | DeluxeMenus, TrMenu |
| MOTD và danh sách máy chủ | MiniMOTD |
| Skin (bắt buộc khi offline) | SkinsRestorer |
| Đăng nhập (khi offline) | AuthMe, LibreLogin |
| Tương thích đa phiên bản | ViaVersion + ViaBackwards |
| Quản lý nóng plugin | PlugManX |

Một bộ khởi đầu phổ biến: **LuckPerms + EssentialsX + CoreProtect + WorldEdit/WorldGuard + Vault + PlaceholderAPI**, rồi thêm theo cách chơi.

## Bảy, bảo mật: plugin cũng có "thuốc độc"

Plugin là **mã bên thứ ba chạy với quyền của máy chủ**, cài nhầm hậu quả rất nghiêm trọng:

- **Chỉ tải từ nguồn đáng tin**: kênh phát hành chính thức (như SpigotMC, Modrinth, Hangar) hoặc kho của tác giả. Tệp jar chuyền tay trong diễn đàn, tệp nhóm có rủi ro cao nhất.
- **Cảnh giác cửa hậu**: có người đóng gói lại plugin bình thường, nhét vào mã kiểu chạy lệnh tùy ý, cấp OP cho người chơi chỉ định, tải tệp lên…
- **Chú ý tình trạng bảo trì**: plugin lâu không cập nhật, tác giả bỏ đi, gặp phiên bản mới có thể sập máy chủ ngay.
- **Không chắc thì thử trên máy chủ thử nghiệm trước**: đừng cài thẳng plugin không rõ nguồn gốc lên máy chủ chính.

:::tip Có sự cố thì nghi plugin trước
Máy chủ đột nhiên lag hoặc báo lỗi kỳ lạ, **hãy tắt các plugin vừa cài gần đây trước**, rồi bật lại từng cái để xác định —— cách này nhanh hơn đọc nhật ký nhiều.
:::

## Bước tiếp theo

Muốn máy redstone và cơ chế bản gốc hoạt động bình thường, máy chủ plugin cần tinh chỉnh thêm: xem [Kỹ thuật redstone và máy móc](/tutorials/java/redstone).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.

## Tài nguyên liên quan

- [Tải tài nguyên · Plugin](/downloads/plugins) —— tập hợp bản dựng từ nguồn chính thức và cộng đồng, bấm vào rồi đăng nhập theo hướng dẫn là tải được.
