---
title: Sao lưu và khôi phục
slug: backup
cat: java
level: 2
order: 15
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, nâng cao, sao lưu, khôi phục, quay lui bản lưu, tác vụ định kỳ]
updated: 2026-10-04
draft: false
---

**Sao lưu là việc duy nhất không thể bỏ qua khi mở máy chủ.** Phần cứng hỏng, nhà cung cấp bỏ trốn, người chơi phá hoại, plugin ghi hỏng bản lưu —— có sự cố thật thì mọi thứ khác làm lại được, riêng bản lưu mất là mất thật.

## Một, cần sao lưu những gì

| Mức cần thiết | Nội dung |
| --- | --- |
| Bắt buộc | `world/`, `world_nether/`, `world_the_end/` (**bản thân bản lưu, quan trọng nhất**) |
| Bắt buộc | `plugins/` (plugin và cấu hình), `mods/` (máy chủ mod) |
| Bắt buộc | `server.properties`, `ops.json`, `whitelist.json`, `banned-*.json` |
| Bắt buộc | Cấu hình của chính lõi (`bukkit.yml` / `spigot.yml` / `paper-*.yml` / tệp yml của lõi tương ứng) |
| Tùy chọn | `logs/`, `crash-reports/` (tùy chọn, có ích khi chẩn đoán) |
| Không cần | `libraries/`, `versions/`, `cache/` (tự tái tạo được, không cần sao lưu) |

## Hai, nguyên tắc quan trọng nhất: sao lưu phải "nhất quán"

**Đừng chép trực tiếp khi máy chủ đang ghi bản lưu** —— có thể chép phải tệp chunk ghi dở, khôi phục xong bản lưu bị hỏng.

Tư thế đúng (hai cách):

**Cách A: sao lưu nóng (không tắt máy chủ)**

```
save-all        ghi dữ liệu xuống đĩa trước
save-off        tắt lưu tự động (để không ghi gì trong lúc sao lưu)
(ở đây thực hiện sao chép/đóng gói)
save-on         bật lại lưu tự động khi sao lưu xong
```

**Cách B: sao lưu khi tắt máy chủ (chắc chắn nhất)**

```
stop            tắt máy chủ an toàn
(sao chép/đóng gói toàn bộ thư mục)
(khởi động lại)
```

:::tip Script sao lưu định kỳ nên dùng cách A
Kết hợp tác vụ định kỳ, chạy vào giờ thấp điểm theo trình tự "`save-all` → `save-off` → đóng gói → `save-on`", người chơi gần như không cảm nhận được.
:::

## Ba, tự động hóa

**Linux (cron)**: viết một script sao lưu (đóng gói + đặt tên theo ngày + dọn gói cũ), dùng `crontab -e` để chạy định kỳ.

**Windows (Task Scheduler)**: biến script khởi động thành "script sao lưu", đặt trong Task Scheduler chạy vào giờ cố định hằng ngày.

**Giải pháp plugin**: cũng có plugin sao lưu chuyên dụng, tự động sao lưu theo chu kỳ và giữ vài bản lịch sử, khỏi phải tự viết script. **Lưu ý**: sao lưu bằng plugin cũng phải bảo đảm nhất quán, và **đừng để tệp sao lưu trên cùng một ổ đĩa**.

## Bốn, chiến lược lưu giữ

- **Giữ nhiều bản**: chỉ giữ bản mới nhất thì gặp trường hợp "bản lưu đã hỏng nhưng chưa phát hiện" là hết cách. Khuyến nghị giữ **vài ngày cho bản ngày + vài tuần cho bản tuần**.
- **Chú ý ổ đĩa**: tệp thế giới tăng liên tục, **định kỳ dọn bản sao lưu cũ**, đừng để đầy ổ (đầy ổ làm máy chủ ghi bản lưu thất bại, hậu quả nghiêm trọng).
- **Một bản ngoài trạm**: ổ đĩa máy này hỏng thì bản sao lưu cục bộ cũng mất theo.

:::warn Nhà cung cấp có thể bỏ trốn, phòng máy có thể xảy ra sự cố
Để toàn bộ dữ liệu chỉ trên một máy bạn thuê là giao mạng sống cho người khác. **Ít nhất định kỳ tải bản sao lưu về máy của mình hoặc nơi lưu khác**.
:::

## Năm, quy trình khôi phục (quay lui bản lưu)

1. **Tắt máy chủ** (nhất định phải `stop` trước).
2. **Đổi tên bản lưu hiện tại để giữ lại** (ví dụ `world_broken_20261004`), **đừng xóa thẳng** —— lỡ bản sao lưu mới cũng có vấn đề thì còn quay lui được.
3. Giải nén bản sao lưu, đặt `world*` trở lại thư mục máy chủ.
4. Khởi động máy chủ, kiểm tra nhật ký xem có lỗi liên quan đến bản lưu không.
5. Để người chơi xác nhận công trình và vật phẩm quan trọng còn bình thường không.

## Sáu, một lời nhắc cuối

> **Bản sao lưu chưa kiểm chứng khôi phục được thì không tính là sao lưu.**

Định kỳ (ví dụ mỗi tháng một lần) lấy một bản sao lưu **khôi phục thật trong môi trường thử nghiệm**. Nhiều người đến đúng ngày có sự cố mới phát hiện: script sao lưu đã thất bại từ lâu vì vấn đề quyền/đường dẫn, hoặc tệp đóng gói ra là tệp rỗng.

## Bước tiếp theo

Chặn phá hoại do con người: xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
