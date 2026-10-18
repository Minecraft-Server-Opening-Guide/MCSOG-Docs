---
title: "[Loạt bài kỹ thuật redstone] Vì sao không khuyến nghị chống gian lận"
slug: sd-anticheat
cat: java
level: 3
order: 36
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, chống gian lận, quyền, danh sách trắng, sao lưu]
updated: 2026-10-08
draft: false
---

Chống gian lận trên máy chủ sinh tồn thường là điểm cộng, nhưng trên máy chủ kỹ thuật redstone lại thường là lợi ích âm. Nguyên nhân không phải "chống gian lận không tốt", mà là **lối chơi bình thường của người chơi kỹ thuật redstone tự nó liên tục kích hoạt phán định chống gian lận**.

Còn một sự thật trực tiếp hơn: bản thân Carpet chính thức đã cung cấp quy tắc `antiCheatDisabled` (tác dụng là ngăn người chơi bị kéo ngược do di chuyển quá nhanh). Việc chính thức đưa công tắc này vào hệ thống quy tắc cho thấy máy chủ kỹ thuật redstone thực sự cần **tắt bộ phát hiện kéo ngược dành cho di chuyển nhanh của bản gốc**, chứ không phải thêm một lớp phán định nữa.

Bài này chỉ nói kết luận và phương án thay thế: vì sao xung đột, phán định sai từ đâu ra, và nếu không thêm chống gian lận thì bạn nên làm gì. [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) nói về hai lớp bảo vệ chung và cách cấu hình, bài này không lặp lại những nội dung đó.

## Một, tín hiệu ngược do chính thức đưa ra

Trước hết đưa ra sự thật có sức thuyết phục nhất.

| Quy tắc | Ý nghĩa |
| --- | --- |
| `antiCheatDisabled` | Tắt nó, hiện tượng người chơi bị kéo ngược do di chuyển quá nhanh sẽ không còn xảy ra |

Quy tắc này đáng đọc từng câu:

- Nó xử lý đúng một việc "**di chuyển quá nhanh bị kéo ngược**", tức là phát hiện của bản gốc dành cho di chuyển nhanh. "Phát hiện" ở đây chỉ hành vi của bản thân bản gốc, không phải chống gian lận bên thứ ba.
- Sự tồn tại của nó cho thấy: **máy chủ kỹ thuật redstone thực sự cần tắt lớp phát hiện kéo ngược của bản gốc**, chứ không phải thêm một lớp phán định lên trên nó.

## Hai, vì sao lối chơi bình thường lại kích hoạt phán định

Thao tác thường ngày của người chơi kỹ thuật redstone, trong mắt logic phán định gần như toàn là tín hiệu bất thường:

| Lối chơi kỹ thuật redstone | Trong mắt logic phán định trông như thế nào |
| --- | --- |
| Di chuyển tốc độ cao (elytra, đường băng, xe mỏ, piston bắn… các cách dịch chuyển) | Di chuyển quá tốc độ, vị trí không liên tục |
| Lượng lớn thực thể (tháp sinh quái, dàn TNT, vật rơi và cầu kinh nghiệm chất đống) | Hành vi thực thể bất thường và mật độ bất thường |
| Máy móc và tự động hóa (thiết bị bay, máy bắn liên tục, chạy dài không người trực) | Hành động tần suất cao, lặp lại, không khớp với thao tác tay người |

Then chốt ở hai chữ "liên tục": đây không phải thỉnh thoảng đụng một lần phán định, mà là **bản thân lối chơi lâu dài đi sát biên của phán định**. Kết quả là hai loại tổn thất:

1. **Phán định sai trực tiếp cắt ngang máy móc và kiểm thử**: bị kéo ngược, bị hủy thao tác, bị đá ra, một lần kiểm thử có thể thành công cốc.
2. **Phán định sai không tái hiện được**: nguyên nhân máy hỏng thường rất khó tra, nếu lại chồng thêm một lớp phán định can thiệp ngẫu nhiên vào di chuyển và thao tác, chi phí tìm lỗi sẽ tăng gấp bội.

:::warn Bài này không bàn bất kỳ ngưỡng phán định cụ thể nào
Các chống gian lận khác nhau có cách hiện thực và ngưỡng khác nhau, ở đây không liệt kê, không so sánh, cũng không bình luận sản phẩm cụ thể nào. Cần phán đoán là **xung đột về logic**: một bộ phán định lấy "thao tác bình thường của con người" làm chuẩn, gặp lối chơi lấy "phá vỡ giới hạn thao tác của con người" làm mục tiêu, xung đột là tất yếu.
:::

## Ba, cài ở phía nào, cái giá là gì

Chống gian lận thường yêu cầu cài trên **phía plugin hoặc phía tối ưu**. Vấn đề là phía tối ưu tự nó đã đổi hành vi bản gốc, mà hai việc này xung đột trực tiếp với mục tiêu kỹ thuật redstone:

| Điểm xung đột | Giải thích |
| --- | --- |
| Xung đột nền tảng | Chống gian lận chủ yếu hướng tới hệ sinh thái phía plugin, còn chuỗi công cụ kỹ thuật redstone (Carpet và các gói phụ trợ) nằm trên Fabric |
| Xung đột hành vi | Cấu hình mặc định của phía tối ưu tự nó lệch khỏi hành vi bản gốc, máy có thể không chạy hoặc sản lượng không ổn định |
| Xung đột mục tiêu | Chống gian lận muốn "hạn chế bất thường", kỹ thuật redstone muốn "lợi dụng bất thường", hướng của hai bên ngược nhau |

Chọn lõi và đánh đổi ở phía tối ưu xem [Chọn lõi máy chủ](/tutorials/java/core); vì sao phía plugin phải chỉnh từng mục về hành vi bản gốc xem [Kỹ thuật redstone và máy móc](/tutorials/java/redstone). Bài này chỉ đưa một kết luận: **linh kiện có hướng ngược nhau, cài lên chỉ triệt tiêu lẫn nhau.**

## Bốn, không thêm chống gian lận thì cài gì

Hỏi ngược lại sẽ hữu ích hơn: **rốt cuộc bạn muốn chống cái gì?** Tách câu hỏi này ra, mỗi loại đều có biện pháp ổn hơn chống gian lận:

| Việc muốn chống | Biện pháp nên dùng | Giải thích |
| --- | --- | --- |
| Người lạ làm bậy | Danh sách trắng và quyền | Đặt ngưỡng trước khi vào máy chủ rẻ hơn nhiều so với phán định sau sự việc |
| Phá hoại và trộm cắp | `ledger` ghi chép và tra ngược | Nó là mod ghi chép phía máy chủ, tương đương CoreProtect phía plugin |
| Tình huống xấu nhất | Sao lưu định kỳ và ngoài trạm | Có sự cố khôi phục được toàn bộ, đây là phòng tuyến cuối cùng |
| Kiểu người chơi đào xuyên như máy khoan, tự động phá đá gốc | `playerOperationLimiter` | Mỗi gt người chơi đặt được 2 khối, phá được 1 khối mỗi giây; hai thao tác này mỗi gt chỉ được làm một loại, dùng để chống kiểu người đào xuyên và mod tự động phá đá gốc của người chơi |

Vài bổ sung:

- **Danh sách trắng và quyền**: máy chủ kỹ thuật redstone thường là vòng quen biết, kiểm soát "ai vào được" hiệu quả hơn nhiều so với phán định thời gian thực trong máy chủ. Cách phân tách cấu hình quyền xem [Lãnh thổ và bảo vệ](/tutorials/java/protection).
- **Ghi chép và tra ngược**: `ledger` (tương đương CoreProtect phía plugin) thuộc loại công cụ ghi chép, nó không chặn thời gian thực, nhưng **trả lời được "ai, lúc nào, động vào cái gì"**. Không có ghi chép, bạn đến căn cứ xử lý cũng không có.
- **Sao lưu**: sao lưu định kỳ và sao lưu ngoài trạm giải quyết tình huống "mọi thứ phía trước đều mất hiệu lực", chính sách đầy đủ và quy trình khôi phục xem [Bảo vệ bản lưu](/tutorials/java/sd-backup).
- **`playerOperationLimiter`**: chú ý nó là **biện pháp hạn chế phía máy chủ**, tác dụng trên chính máy chủ, không cần người chơi cài gì. Nó giới hạn thao tác đặt và phá mỗi gt, nhắm vào lạm dụng tự động hóa, chứ không phải chấm điểm người chơi bình thường. Nó thuộc quy tắc do một dự án phụ trợ Carpet cung cấp, **trước khi cài hãy xác nhận dùng được theo phiên bản game và tổ hợp mod của bạn**.

## Năm, nên làm thế nào: một danh sách thuận

Thay vì lặp đi lặp lại việc lập luận "đừng cài chống gian lận", chi bằng làm thẳng theo đây:

1. **Ngưỡng vào máy chủ trước**: danh sách trắng hoặc duyệt khi vào, kiểm soát nguồn.
2. **Rồi phân cấp quyền**: người chơi thường, nhóm kỹ thuật, quyền quản trị tách nhau, không dễ dàng cấp OP; ai được động máy, ai được dùng thao tác rủi ro cao, viết rõ trước.
3. **Cài công cụ ghi chép**: mod ghi chép kiểu `ledger` càng sớm càng tốt, nó chỉ ghi những gì xảy ra sau khi cài.
4. **Cấu hình sao lưu cho tốt**: sao lưu định kỳ cộng sao lưu ngoài trạm, và **diễn tập thật một lần quy trình khôi phục** —— bản sao lưu chưa kiểm chứng không tính là sao lưu.
5. **Dùng hạn chế phía máy chủ thay cho phán định thời gian thực**: ví dụ biện pháp có hiệu lực ngay trên máy chủ, không phụ thuộc client người chơi như `playerOperationLimiter`.
6. **Viết rõ quy tắc**: cho phép gì, cấm gì, xử lý thế nào, viết ở chỗ người chơi nhìn thấy.
7. **Khi cần phát hiện kéo ngược của bản gốc, dùng `antiCheatDisabled` tắt nó đi**: đây là công tắc do hệ thống quy tắc chính thức đưa ra, kiểm soát được hơn cài linh kiện bên thứ ba, cũng dễ giải thích với người chơi hơn.

## Sáu, nguyên tắc tối thiểu của bài này

```
1. Chính thức đã cung cấp antiCheatDisabled —— máy chủ kỹ thuật redstone cần tắt kéo ngược của bản gốc, không phải thêm một lớp
2. Lối chơi bình thường của kỹ thuật redstone liên tục kích hoạt phán định, phán định sai là tất yếu, không phải ngẫu nhiên
3. Chống gian lận phải cài ở phía plugin/phía tối ưu, ngược hướng với mục tiêu kỹ thuật redstone
4. Phương án thay thế: danh sách trắng và quyền + ghi chép ledger + sao lưu ngoài trạm định kỳ + hạn chế phía máy chủ
```

## Bước tiếp theo

Hai lớp bảo vệ chung và cách cấu hình xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat); ai được động máy, ai quản quyền xem [Lãnh thổ và bảo vệ](/tutorials/java/protection); có sự cố quay về thế nào xem [Bảo vệ bản lưu](/tutorials/java/sd-backup), kiểm soát rủi ro trước khi máy khởi công xem [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine).

---

> Tên quy tắc trích dẫn trong bài lấy từ mã nguồn chính thức của Carpet, định vị mod lấy từ mục chính thức của `ledger` trên Modrinth, và `playerOperationLimiter` trong hướng dẫn chính thức của Plusls Carpet Addition (plusls-carpet-addition); bài này không đề cập cách hiện thực và ngưỡng của bất kỳ sản phẩm chống gian lận cụ thể nào, cũng không lặp lại nội dung đã có trong [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).
