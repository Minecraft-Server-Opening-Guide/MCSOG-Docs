---
title: Trình quản lý máy chủ MCDR
slug: mcdr
cat: java
level: 2
order: 10
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, mcdr, python, plugin, quản lý, tự động hóa]
updated: 2026-10-04
draft: false
---

MCDReforged (gọi tắt **MCDR**) là một **trình quản lý máy chủ** rất phổ biến trong cộng đồng mở máy chủ. Nó không thay thế lõi máy chủ của bạn, mà **bao bọc bên ngoài lõi**: nó khởi động và quản lý tiến trình lõi, đọc đầu ra console, nhờ đó mở rộng chức năng **mà không sửa bản thân máy chủ**.

## Một, nó giải quyết vấn đề gì

Máy chủ bản gốc / Paper chỉ mở rộng được bằng "plugin", còn MCDR cung cấp năng lực ở **một tầng khác**:

| Năng lực | Giải thích |
| --- | --- |
| **Hệ sinh thái plugin** | Viết plugin bằng **Python**, làm được nhiều việc mà plugin Java không tiện làm (chuyển tiếp giữa máy chủ, kết nối API bên ngoài, vận hành tự động) |
| **Hướng sự kiện** | Phân tích đầu ra máy chủ rồi phát sự kiện (người chơi ra vào, chat, chết, lệnh…), plugin chỉ cần đăng ký nhận |
| **Nạp lại nóng** | Plugin thường nạp lại được, không cần khởi động lại cả máy chủ |
| **Hệ thống quyền** | Có sẵn bộ kiểm soát quyền theo người chơi/nhóm, dùng cùng lệnh tiền tố `!!` |
| **Canh gác (watchdog)** | Lõi sập có thể tự khởi động lại |
| **Đa máy chủ** | Một bộ MCDR quản lý được nhiều thực thể máy chủ |

## Hai, nó hoạt động thế nào

Sau khi khởi động, MCDR **trông coi tiến trình máy chủ**: nó đọc đầu ra console của máy chủ và phân tích thành sự kiện, đồng thời chặn các lệnh `!!xxx` bạn gõ trong ô chat để giao cho plugin xử lý, thay vì đưa cho máy chủ bản gốc.

Nên:

- **Bản thân** máy chủ vẫn là lõi cũ, hành vi không đổi;
- Bạn có thêm một lớp "vỏ", **khi chẩn đoán sự cố phải xem thêm một lớp nhật ký** (nhật ký của MCDR + nhật ký máy chủ).

## Ba, cài đặt

MCDR viết bằng **Python 3**, phụ thuộc Python và pip:

| Phiên bản MCDR | Python cần |
| --- | --- |
| < 2.10 | ≥ 3.6 |
| ≥ 2.10 | ≥ 3.8 |
| ≥ 2.15 | **≥ 3.9** |

Cài bản mới nhất thì dùng **pip**:

```bash
pip install mcdreforged
```

:::warn Đừng tải zip mã nguồn về để chạy
Nhiều hướng dẫn trên mạng bảo bạn lên GitHub tải gói nén giải nén ra dùng —— **đó là cách làm lỗi thời**. MCDR từ bản 1.0 (đầu 2021) đã không còn cài theo kiểu mã nguồn. Trừ khi bạn là nhà phát triển và biết rõ mình đang làm gì, hãy cài bằng pip.
:::

## Bốn, quy trình khởi động

1. **Khởi tạo**: chạy lệnh khởi tạo một lần, MCDR sẽ sinh tệp cấu hình và cấu trúc thư mục của riêng nó.
2. **Cấu hình**: điền **lệnh khởi động máy chủ** và **thư mục làm việc** vào cấu hình của MCDR (tức là việc mà script khởi động trong "Khởi động máy chủ" làm, giờ giao cho MCDR).
3. **Khởi động**: chạy MCDR, nó sẽ kéo máy chủ lên và tiếp quản console.
4. **Xác nhận loại máy chủ**: MCDR thích ứng các loại lõi khác nhau qua **bộ xử lý máy chủ** (bản gốc / họ Paper / máy chủ mod…), chọn sai sẽ làm phân tích sự kiện bất thường.

:::tip Lệnh con dòng lệnh lấy tài liệu chính thức làm chuẩn
Giao diện dòng lệnh của MCDR (tham số toàn cục, lệnh con) được điều chỉnh giữa các phiên bản, **cách viết cụ thể hãy đối chiếu tài liệu CLI chính thức**, đừng chép nguyên hướng dẫn cũ.
:::

## Năm, lệnh và quyền

Lệnh của MCDR dùng chung tiền tố `!!` (gõ trong ô chat trong game là được):

| Lệnh | Tác dụng |
| --- | --- |
| `!!MCDR` | Lệnh chính, quản lý chính MCDR (trạng thái, plugin, nạp lại, quyền…) |
| `!!help` | Xem trợ giúp các lệnh đã đăng ký |

- Quyền chạy lệnh do **hệ thống quyền** của MCDR kiểm soát, có thể cấp theo người chơi hoặc nhóm quyền.
- Người chơi chưa được cấp quyền chạy sẽ nhận thông báo từ chối, không ảnh hưởng đến bản thân máy chủ.

## Sáu, plugin

- Plugin bỏ vào thư mục `plugins/` của MCDR, nạp / nạp lại qua các lệnh con liên quan `!!MCDR`.
- Có một **kho plugin** chính thức để tìm plugin có sẵn; cũng có thể tự viết (plugin một tệp, nhiều tệp, plugin dạng thư mục…).
- Cốt lõi khi phát triển plugin là **metadata + lắng nghe sự kiện + cây lệnh**: khai báo thông tin plugin, đăng ký sự kiện quan tâm, dựng lệnh `!!` của riêng bạn.

## Bảy, khi nào nên dùng MCDR

**Phù hợp**: muốn vận hành tự động (khởi động lại định kỳ, kéo dậy khi sập, sao lưu liên động), muốn đưa trạng thái máy chủ sang nền tảng bên ngoài (nhóm QQ, Discord, trang web), hoặc cần viết plugin Python cho logic tùy biến.

**Không nhất thiết cần**: chỉ mở một máy chủ plugin nhỏ, dùng plugin sẵn có của lõi + systemd trông coi là đủ. **Thêm một tầng là thêm một tầng chi phí bảo trì**, đừng dùng chỉ để dùng.

## Bước tiếp theo

Mở rộng cách chơi của máy chủ chủ yếu dựa vào plugin: xem [Nhập môn plugin](/tutorials/java/plugins).

---

> Cách cài đặt và yêu cầu phiên bản của MCDR trong bài tham khảo từ [tài liệu tiếng Trung chính thức của MCDReforged](https://docs.mcdreforged.com/zh-cn/), đã viết lại theo cấu trúc của trang này; lệnh và tham số cụ thể lấy tài liệu chính thức làm chuẩn.
