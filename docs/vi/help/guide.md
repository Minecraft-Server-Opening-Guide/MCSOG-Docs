---
title: Hướng dẫn biên tập
slug: guide
updated: 2026-10-06
---

Nội dung của trang này được lưu dưới dạng Markdown, toàn bộ nằm trong kho công khai [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs), bất kỳ ai cũng có thể gửi chỉnh sửa.

## Thư mục và cách đặt tên

| Loại | Đường dẫn |
| --- | --- |
| Hướng dẫn | `docs/zh/tutorials/<phân loại>/<slug>.md`, phân loại là `java` / `bedrock` / `ops` / `faq` |
| Bách khoa | `docs/zh/wiki/<tên>.md` |
| Thông báo | `docs/zh/news/<tên>.md` |
| Trợ giúp | `docs/zh/help/<tên>.md` |

Tệp tiếng Anh và tiếng Trung **tương ứng một một về đường dẫn**, chỉ đổi `zh` thành `en`.
`<slug>` dùng chữ thường tiếng Anh và dấu gạch nối, sẽ trở thành đoạn cuối của URL trang; tên tệp và `slug` phải giống nhau.

Đầu tệp hướng dẫn cần có YAML front-matter:

```yaml
---
title: Triển khai máy chủ Paper trên Linux
slug: linux-paper
cat: java
level: 2
minutes: 15
mc: ["1.21.x", "1.20.4"]
tags: [linux, paper, systemd]
updated: 2026-10-06
draft: false
---
```

| Trường | Ý nghĩa |
| --- | --- |
| `title` | Tiêu đề trang và tiêu đề trong danh sách |
| `slug` | Tên tệp bỏ `.md`, đồng thời là một đoạn của URL |
| `cat` | Thư mục phân loại: `java` / `bedrock` / `ops` / `faq` |
| `level` | Độ khó 1–3, hiển thị dưới dạng nhãn |
| `minutes` | Số phút đọc dự kiến |
| `mc` | Phiên bản Minecraft áp dụng |
| `tags` | Nhãn, tìm kiếm trong trang cũng dùng đến |
| `updated` | `YYYY-MM-DD`, danh sách sắp xếp theo trường này |
| `draft` | Đặt là `true` thì trang không lên trực tuyến |

## Mở rộng phần thân

:::step Khối bước
Bắt đầu bằng `:::step tiêu đề`, kết thúc bằng một dòng `:::` riêng. Nhiều khối bước liên tiếp sẽ tự động gộp thành thanh bước có đánh số.
:::

:::note
`:::note` hộp ghi chú, phù hợp để bổ sung giải thích.
:::

:::warn
`:::warn` hộp cảnh báo, phù hợp cho những chỗ dễ mắc lỗi.
:::

:::danger
`:::danger` hộp nguy hiểm, phù hợp cho thao tác không thể đảo ngược (xóa dữ liệu, ghi đè cấu hình…).
:::

Ngoài ra hỗ trợ Markdown chuẩn: tiêu đề (tự tạo mục lục bên phải), danh sách, bảng, danh sách công việc, mã trong dòng, khối mã có ghi ngôn ngữ.

## Cách gửi

:::step Tạo nhánh trong kho
Fork [MCSOG-Docs](https://github.com/Minecraft-Server-Opening-Guide/MCSOG-Docs) rồi tạo nhánh mới, thêm tệp theo thư mục và cách đặt tên ở trên.
:::

:::step Gửi Pull Request
Nêu rõ **phạm vi thay đổi** trong PR.
:::

:::note
Sau khi merge vào `main` sẽ tự động có hiệu lực: trong 30 phút đồng bộ vào kho chính, trong 2 giờ lên trực tuyến.
:::

Quy định viết và trích dẫn xem ở [Đóng góp và quy định](/help/contribute).
