---
title: Kỹ thuật redstone và máy móc
slug: redstone
cat: java
level: 2
order: 12
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, redstone, fabric, leaves, paper, đặc tính bản gốc]
updated: 2026-10-04
draft: false
---

"Kỹ thuật redstone" (sinh tồn + mạch điện) chỉ lối chơi sinh tồn hướng kỹ thuật lấy máy redstone, tháp sinh quái, hành vi khối chính xác làm cốt lõi. Khác biệt lớn nhất với máy chủ sinh tồn thường là: **cực kỳ nhạy với việc "hành vi bản gốc có bị thay đổi không"**.

Một thứ tự cập nhật khối bị tối ưu mất, một đặc tính nhân bản bị sửa đi, là đủ làm cả máy hỏng.

## Một, máy chủ plugin không làm được 100% bản gốc

Tài liệu chính thức của Paper tự viết rõ:

> *Unfortunately, it currently is not possible to get a 100% Vanilla experience in Paper.*

Nói cách khác, **chạy kỹ thuật redstone bằng Paper / Purpur, về bản chất là đang chiết khấu**. Nên hãy chọn đúng lõi trước, rồi mới bàn cấu hình.

| Mục tiêu của bạn | Lõi khuyến nghị |
| --- | --- |
| **Kỹ thuật redstone thuần / hướng kỹ thuật** | **Fabric** (gần bản gốc nhất khi không cài mod tối ưu), **Leaves** (nhánh Paper, chuyên sửa đặc tính bản gốc bị làm hỏng) |
| Kiểm chứng bản gốc / tối giản | **Vanilla** (máy chủ bản gốc chính thức) |
| **Kỹ thuật redstone nhẹ**, đồng thời muốn dùng plugin | Họ Paper + bộ tinh chỉnh cấu hình dưới đây |

> Vì sao `Leaves` đáng nhắc riêng: định vị của nó chính là "sửa đặc tính bản gốc", có thể vừa giữ hệ sinh thái Paper (plugin, hiệu năng) vừa khôi phục những hành vi đã bị thay đổi, là lựa chọn thực tế hơn khi "vừa muốn plugin vừa muốn kỹ thuật redstone".

## Hai, tinh chỉnh đặc tính bản gốc trên máy chủ plugin

Nếu bạn xác định dùng họ Paper cho **kỹ thuật redstone nhẹ**, trọng tâm là chỉnh mấy chỗ này (tệp: `config/paper-world-defaults.yml`).

### Độ trễ gỡ chunk

```yaml
chunks:
  delay-chunk-unloads-by: 0s
```

Mặc định sẽ có độ trễ nhất định. Đặt `0s` mới khiến các thiết bị dựa vào "chunk được gỡ kịp thời" như **ngọc ender tồn lưu quay về** hoạt động bình thường.

### Va chạm thực thể

```yaml
collisions:
  allow-player-cramming-damage: true
  max-entity-collisions: 2147483647
```

- `allow-player-cramming-damage`: người chơi có bị sát thương khi bị quá nhiều thực thể chèn ép hay không, muốn giống bản gốc thì đặt `true`.
- `max-entity-collisions`: vượt số này máy chủ sẽ **ngừng xử lý va chạm thực thể**. Thiết bị nhiều thực thể dày đặc (như tháp sinh quái quy mô lớn) cần chỉnh nó lên rất lớn, **cái giá là hiệu năng giảm**.

### Hành vi thực thể

```yaml
entities:
  behavior:
    # Thời gian hồi thất bại khi ong rời tổ; liên quan đến hành vi bản gốc
```

Paper vì hiệu năng đã thêm "thời gian chờ" hoặc giới hạn cho một phần hành vi thực thể, tình huống kỹ thuật redstone cần đối chiếu từng mục và tắt đi.

### Cách hiện thực redstone

Paper hỗ trợ chuyển đổi **cách hiện thực redstone**. Hãy **giữ cách hiện thực vanilla** —— đổi sang cách khác (đã tối ưu vì hiệu năng) sẽ thay đổi hành vi cập nhật redstone, máy móc hỏng ngay.
:::warn Sao lưu trước khi chỉnh cấu hình
Sửa sai tệp dưới `config/` sẽ làm máy chủ khởi động bất thường. **Sao chép một bản trước khi sửa**, có sự cố khôi phục ngay.
:::

## Ba, mod thường dùng cho kỹ thuật redstone (phía mod)

Người chơi kỹ thuật redstone thường cài một bộ mod client, phía máy chủ cũng cần hỗ trợ tương ứng:

| Mod | Tác dụng |
| --- | --- |
| **Carpet** | Kiểm soát quy tắc phía máy chủ, máy chủ kỹ thuật redstone gần như bắt buộc (bật tắt được rất nhiều chi tiết hành vi bản gốc) |
| **MiniHUD** | HUD hiển thị tọa độ, quần xã sinh vật, độ sáng… |
| **Litematica** | Hình chiếu schematic, xây máy theo bản vẽ |
| **Tweakeroo** | Một loạt điều chỉnh tiện lợi |
| **Servux** | Giúp phần hiển thị công trình và dán schematic của MiniHUD hoạt động trên máy chủ |
| **Syncmatica** | Tải schematic lên máy chủ chia sẻ cho người chơi khác |
| **BBOR** | Hiển thị phạm vi công trình tự nhiên, biên giới quần xã 3D, chunk slime |
| **Jade / JEI (hoặc REI)** | Xem thông tin khối / công thức chế tạo |
| **Xaero's Minimap / World Map** | Bản đồ nhỏ và bản đồ thế giới |
| **AppleSkin** | Hiển thị độ đói và mức hồi phục độ no |
| **EasyAuth** | Mod đăng nhập phía máy chủ |
| **Fuji** | Mod quản lý đa chức năng |

> Nhiều mod có một phần chức năng **cần máy chủ cũng cài** mới hiển thị đúng con số (như độ no chính xác của AppleSkin), khi mở máy chủ kỹ thuật redstone phải thống nhất phiên bản với người chơi.

## Bốn, máy chủ chuyên cho redstone

Nếu chỉ quan tâm **bản thân mạch redstone** (ví dụ làm máy tính quy mô lớn, kiểm chứng thứ tự thời gian của máy), còn có lõi máy chủ tối ưu riêng cho redstone (như **MCHPRS**): nó cắt bỏ gánh nặng liên quan đến sinh tồn, đẩy tốc độ tính toán redstone lên rất cao.

Cái giá là **nó không phải máy chủ sinh tồn bình thường**, nhiều cơ chế bản gốc không đầy đủ. Phù hợp **thử máy**, không phù hợp mở máy chủ cho người chơi.

## Năm, tóm lại việc chọn

```
Kỹ thuật redstone thật (máy phải chính xác)
   → Fabric / Leaves / Vanilla
   → Dù chỉnh thế nào, máy chủ plugin cũng không đạt 100% bản gốc

Kỹ thuật redstone nhẹ + vẫn muốn dùng plugin
   → Họ Paper + phần chỉnh cấu hình ở mục 2
   → Chấp nhận "một số máy có thể vẫn không chạy"

Chỉ để thử mạch redstone
   → Lõi chuyên dụng như MCHPRS
```

## Bước tiếp theo

Chạy thông về kỹ thuật rồi, máy chủ có bền lâu hay không là nhờ vận hành: xem [Quản lý vận hành](/tutorials/ops/management-java).

## Loạt bài kỹ thuật redstone

Bài này nói về nguyên tắc chung của kỹ thuật redstone. Những thứ cần triển khai thật khi mở một máy chủ kỹ thuật redstone được viết thành bộ bài dưới đây:

- [[Loạt bài kỹ thuật redstone] Chọn lõi máy chủ](/tutorials/java/sd-server): Fabric cộng MCDR, đánh đổi giữa lõi tối ưu kỹ thuật redstone và lõi đa luồng.
- [[Loạt bài kỹ thuật redstone] Carpet và các gói phụ trợ](/tutorials/java/sd-carpet): hệ thống quy tắc, bốn gói phụ trợ phổ biến và quy tắc chống sập.
- [[Loạt bài kỹ thuật redstone] Chia sẻ schematic](/tutorials/java/sd-schematic): đồng bộ hình chiếu và đặt khối cho mọi người.
- [[Loạt bài kỹ thuật redstone] Mod tối ưu](/tutorials/java/sd-optimize): cái nào cài yên tâm, cái nào làm đổi thứ tự thời gian.
- [[Loạt bài kỹ thuật redstone] Bảo vệ bản lưu](/tutorials/java/sd-backup): quy trình sao lưu, Ledger và sao lưu ngoài trạm.
- [[Loạt bài kỹ thuật redstone] Tối ưu cấu hình](/tutorials/java/sd-config): máy chủ kỹ thuật redstone rốt cuộc có những công tắc nào động được.
- [[Loạt bài kỹ thuật redstone] Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine): kiểm soát rủi ro của máy nuốt thế giới và update suppression.
- [[Loạt bài kỹ thuật redstone] Vì sao không khuyến nghị chống gian lận](/tutorials/java/sd-anticheat): vì sao máy chủ kỹ thuật redstone không nên cài chống gian lận.

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
