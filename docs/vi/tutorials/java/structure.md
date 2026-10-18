---
title: Cấu trúc máy chủ
slug: structure
cat: java
level: 1
order: 6
minutes: 10
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, thư mục, cấu trúc, sao lưu, thế giới, cấu hình]
updated: 2026-10-04
draft: false
---

Sau khi máy chủ chạy, trong thư mục sẽ mọc ra một đống tệp và thư mục. **Biết cái nào động được, cái nào tuyệt đối đừng chạm** là nền tảng cho mọi thao tác về sau (cài plugin, sao lưu, di chuyển).

Dưới đây lấy máy chủ plugin (các loại như Paper / Purpur) làm ví dụ.

## Một, thư mục

| Thư mục | Tác dụng | Có động được không |
| --- | --- | --- |
| `plugins/` | Plugin bỏ ở đây | Thường xuyên động |
| `world/` | Dữ liệu **thế giới chính** | Chỉ sao lưu nguyên khối, đừng sửa tay |
| `world_nether/` | Dữ liệu Nether | Như trên |
| `world_the_end/` | Dữ liệu End | Như trên |
| `logs/` | Nhật ký vận hành, chẩn đoán sự cố dựa vào nó | Có thể xóa bản cũ |
| `crash-reports/` | Báo cáo sập, có lỗi thì xem ở đây trước tiên | Có thể xóa bản cũ |
| `config/` | Cấu hình lõi của họ Paper (như `paper-world-defaults.yml`) | Sao lưu trước khi sửa |
| `libraries/` `versions/` `cache/` | Thư viện phụ thuộc và bộ đệm, **tự sinh** | Đừng động |
| `mods/` | Chỉ có ở **máy chủ mod** (Fabric / Forge) và máy chủ lai | Thường xuyên động |

## Hai, tệp quan trọng ở thư mục gốc

| Tệp | Tác dụng |
| --- | --- |
| `server.properties` | **Cấu hình máy chủ cơ bản nhất** (cổng, xác thực bản quyền, khoảng cách hiển thị…) |
| `eula.txt` | Tệp đồng ý điều khoản, phải là `eula=true` |
| `核心名.jar` | Bản thân lõi máy chủ |
| `ops.json` | Danh sách OP (quản trị viên) |
| `whitelist.json` | Danh sách trắng |
| `banned-players.json` / `banned-ips.json` | Danh sách cấm |
| `usercache.json` | Bộ đệm tên người chơi và UUID |
| `bukkit.yml` / `spigot.yml` | Cấu hình tầng Bukkit / Spigot (họ Paper đều có) |
| `purpur.yml` / `paper.yml` | Cấu hình riêng của lõi tương ứng (đổi lõi mới có) |
| `commands.yml` | Bí danh lệnh và ánh xạ chặn lệnh |
| `permissions.yml` | Định nghĩa quyền mặc định |

## Ba, trong thư mục thế giới có gì

Bên trong `world/` mới là bản lưu thật, **khi sao lưu hãy sao lưu cả thư mục `world`**:

| Thư mục con | Nội dung |
| --- | --- |
| `region/` | **Dữ liệu chunk** (khối, địa hình đều ở đây, kích thước lớn nhất) |
| `playerdata/` | Túi đồ, vị trí, lượng máu của người chơi |
| `entities/` | Dữ liệu thực thể (vật phẩm rơi, sinh vật, giao dịch dân làng…) |
| `poi/` | Điểm quan tâm (trạm làm việc của dân làng, giường…) |
| `data/` | Dữ liệu cấp thế giới (bản đồ, bảng điểm…) |
| `datapacks/` | Gói dữ liệu |
| `advancements/` `stats/` | Thành tựu và thống kê |

:::warn Đừng chỉnh sửa tệp thế giới bằng tay
Sửa thẳng tệp trong `region/` rất dễ **làm hỏng bản lưu**. Muốn sửa thế giới hãy dùng plugin như `WorldEdit`, hoặc tắt máy chủ rồi mới thao tác.
:::

## Bốn, cấu trúc này nói cho bạn ba điều

1. **Sao lưu cần sao lưu gì**: ba thư mục thế giới `world*` + cấu hình trong `plugins/` + `server.properties`, phần còn lại phần lớn có thể tự tái tạo. Xem chi tiết ở "Sao lưu và khôi phục".
2. **Di chuyển thế nào**: chép nguyên thư mục máy chủ sang máy mới, cài Java cùng phiên bản là được, đường dẫn đừng chứa tiếng Trung và dấu cách.
3. **Chẩn đoán xem ở đâu**: trước tiên xem `logs/latest.log`, sập rồi thì xem `crash-reports/`.

## Bước tiếp theo

Hiểu cấu trúc rồi, bắt đầu sửa cấu hình: xem [Cấu hình máy chủ](/tutorials/java/config).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
