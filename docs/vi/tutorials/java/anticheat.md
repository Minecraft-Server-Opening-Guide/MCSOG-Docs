---
title: Chống gian lận và chống phá hoại
slug: anticheat
cat: java
level: 3
order: 16
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, nâng cao, chống gian lận, chống phá hoại, coreprotect, quay lui, quyền]
updated: 2026-10-04
draft: false
---

Máy chủ vừa công khai là sẽ gặp hai loại vấn đề: **có người phá hoại/trộm đồ**, và **có người dùng client gian lận**. Hai loại này phải dùng biện pháp khác nhau.

## Một, trước tiên phân biệt hai tầng bảo vệ

| Tầng | Mục tiêu | Biện pháp | Ưu tiên |
| --- | --- | --- | --- |
| **Ghi vết và truy vết** | Có sự cố tra được, quay lui được | Plugin ghi vết như CoreProtect / Prism |  **Bắt buộc** |
| **Chống gian lận thời gian thực** | Chặn ngay hành vi gian lận | Plugin chống gian lận (phát hiện di chuyển, chiến đấu, gói tin) | Điểm cộng |
| **Quyền và kiểm toán** | Chống "lạm dụng quản trị" | Nhóm quyền + lưu vết thao tác |  Bắt buộc |
| **Ngưỡng vào máy chủ** | Giảm nguồn phiền phức | Danh sách trắng / duyệt khi vào | Tùy quy mô |

**Thứ tự rất quan trọng**: làm tốt "ghi vết và truy vết" trước, rồi mới tính đến chống gian lận. Vì **không có ghi vết, bạn đến "ai làm" cũng không biết**; còn chống gian lận mạnh đến đâu vẫn có kẻ lọt.

## Hai, ghi vết và truy vết (chống phá hoại)

Nguyên lý của loại plugin này là **ghi toàn bộ thao tác lên khối, thùng chứa, thực thể, lệnh… vào cơ sở dữ liệu**, sau đó có thể:

- Tra một khối **bị ai phá/đặt vào lúc nào**;
- Tra một người chơi **gần đây đã làm gì**;
- **Quay lui hàng loạt** theo thời gian hoặc theo người chơi (khôi phục khu vực bị phá về nguyên trạng);
- Tra lịch sử lấy/đặt của thùng chứa (hộp), phán đoán có trộm hay không.

Cách làm khuyến nghị:

- **CoreProtect**: plugin ghi vết khối phổ biến nhất, dùng cùng lệnh truy vấn và lệnh quay lui của nó.
- Cũng có thể dùng kèm plugin loại **InvSee** để xem túi đồ người chơi (truy tang vật).
- Loại **Prism** là giải pháp thay thế tương đương.

:::tip Plugin ghi vết phải cài sớm
Nó chỉ ghi được những việc xảy ra **sau khi cài**. Đợi bị phá rồi mới cài thì mọi việc trước đó không tra được.
:::

## Ba, chống gian lận thời gian thực

Giải pháp phổ biến là **plugin chống gian lận phía máy chủ**, phân tích hành vi gửi gói tin của người chơi để phán đoán bất thường (như di chuyển quá nhanh, dịch chuyển tức thời, khoảng cách tấn công vượt giới hạn, tự ngắm…). Thường thấy có Grim, Matrix, Vulcan, Spartan.

Khi chọn và cấu hình chú ý:

- **Chạy chế độ ghi vết trước**: tuyệt đại đa số chống gian lận hỗ trợ "chỉ ghi không xử phạt", **quan sát một thời gian** rồi mới bật xử phạt.
- **Phán đoán sai gây hại cho người chơi hơn là bỏ lọt**: người chơi bình thường bị đá, bị kéo lại, thậm chí bị cấm, sẽ bỏ đi ngay và để lại đánh giá xấu. **Thà bỏ lọt một chút, còn hơn gây oan hàng loạt**.
- **Chế độ offline thì chống gian lận ít ý nghĩa**: đổi ID là làm lại được, sức răn đe của việc cấm tài khoản giảm mạnh.
- **Chống gian lận phía client**: số ít máy chủ yêu cầu người chơi cài client chuyên dụng để xác minh, bảo vệ mạnh hơn nhưng **ngưỡng vào rất cao**, phù hợp máy chủ khép kín theo hướng thi đấu.
- **Xung đột plugin**: plugin chống gian lận can thiệp khá sâu vào giao thức, dễ xung đột với một số plugin (nhất là loại sửa logic di chuyển/chiến đấu), **cài xong phải quan sát nhật ký**.

## Bốn, quyền và quản lý nội bộ

Chặn được bên ngoài, nhưng nội bộ lật thuyền cũng chí mạng:

- **Đừng tùy tiện cấp OP**: quyền OP bản gốc rất lớn. Dùng plugin quyền (LuckPerms) cấp quyền chi tiết theo **nút quyền**, an toàn hơn cấp OP nhiều.
- **Thao tác quản trị phải lưu vết**: ai cấm, ai trao vật phẩm, ai sửa thế giới, đều phải tra được.
- **Tránh độc tài một người**: quyền quản trị dồn vào một người, một khi người đó có vấn đề hoặc bỏ đi, máy chủ sẽ rất bị động.
- **Định kỳ rà soát**: kiểm tra danh sách OP, nhóm quyền, danh sách trắng có người không nên có hay không.

## Năm, đưa ngưỡng lên trước

Đỡ phiền hơn "xử lý sau" là **để ít phiền phức đi vào**:

- **Danh sách trắng / duyệt khi vào**: máy chủ quy mô nhỏ, chất lượng cao thường dùng; chặn được phần lớn phá hoại và gian lận.
- **Quy định rõ ràng**: viết rõ điều cấm và cách xử phạt, khi xử lý mới có chỗ đứng.
- **Thời gian quan sát người chơi mới**: hạn chế một phần quyền với tài khoản mới (như tạm thời không dùng được một số thùng chứa), giảm rủi ro phá hoại một lần.

## Sáu, một kết luận thực tế

**Không có chống gian lận nào chặn được 100% gian lận**, cũng không có bảo vệ nào chống được 100% phá hoại. Nên thứ thực sự đáng tin là tổ hợp ba việc:

```
Cài plugin ghi log sớm (để tra cứu và khôi phục)
   + Cấu hình chống gian lận cẩn thận (đừng làm oan người chơi)
   + Sao lưu định kỳ ở nơi khác (tình huống xấu nhất vẫn khôi phục toàn bộ được)
```

Trong ba việc này, **sao lưu là tuyến phòng thủ cuối cùng** (xem "Sao lưu và khôi phục").

## Bước tiếp theo

Bước cuối là tối ưu hiệu năng đến mức hợp lý: xem [Tối ưu hiệu năng](/tutorials/java/optimize).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
