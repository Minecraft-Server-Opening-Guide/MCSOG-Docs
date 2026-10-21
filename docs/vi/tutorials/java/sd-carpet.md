---
title: "[Loạt bài kỹ thuật redstone] Carpet và các gói phụ trợ"
slug: sd-carpet
cat: java
level: 3
order: 30
minutes: 25
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, carpet, fabric, máy chủ]
updated: 2026-10-08
draft: false
---

Thứ mà máy chủ kỹ thuật redstone thực sự phải làm việc cùng hằng ngày là **Carpet**: nó biến một loạt hành vi chi tiết vốn bị viết cứng trong bản gốc thành **những quy tắc bật tắt được bằng lệnh**. Bài này nói rõ hệ thống quy tắc dùng thế nào, bốn gói phụ trợ phổ biến bổ sung những gì, và vài **quy tắc chống sập đã được kiểm chứng**.

## Một, Carpet là gì

`Carpet` có định vị là **mod phía máy chủ Fabric**, cung cấp một **hệ thống quy tắc**: dùng `/carpet <tên quy tắc> <giá trị>` để bật tắt những hành vi vốn bị viết cứng trong bản gốc.

Vài sự thật cơ bản:

- Hỗ trợ phiên bản từ `1.14.4` đến `26.3`, tổng cộng 179 mục phiên bản, lượng tải khoảng 11,25 triệu;
- Trong mã nguồn chính thức `CarpetSettings.java` có tổng cộng **91 quy tắc gắn chú thích `@Rule`**.

Nói cách khác, nó động được vào rất nhiều thứ, **"bật được" không có nghĩa là "nên bật"**: kỷ luật cơ bản của máy chủ kỹ thuật redstone là chỉ bật những quy tắc mà bạn hiểu hậu quả.

## Hai, cách dùng `/carpet`

Hệ thống quy tắc tương tác rất trực tiếp:

```
/carpet <tên quy tắc> <giá trị>        # sửa một quy tắc
```

Trên thực tế nên tuân thủ ba điều:

1. **Mỗi lần chỉ đổi một quy tắc**, đổi xong quan sát hành vi máy móc rồi mới động đến quy tắc tiếp theo;
2. **Ghi lại những quy tắc đã đổi** (viết vào nội quy máy chủ hoặc ghi chú vận hành), khi đổi lõi, nâng phiên bản thì rà lại từng điều;
3. Mọi quy tắc **làm thay đổi hành vi bản gốc** thì mặc định tắt khi mở máy chủ chính thức, chỉ bật khi kiểm thử một mình hoặc trong tình huống cụ thể.

Các tên quy tắc dưới đây lấy từ mã nguồn chính thức của Carpet, kèm giải thích từng điều.

## Ba, ví dụ về quy tắc

### Hiệu năng và thực thể

| Quy tắc | Giải thích |
| --- | --- |
| `optimizedTNT` | TNT nổ ở cùng một vị trí, trong chất lỏng gây ít lag hơn |
| `maxEntityCollisions` | Tùy chỉnh giới hạn va chạm thực thể, 0 nghĩa là không giới hạn |
| `lagFreeSpawning` | Sinh quái chỉ chiếm ít CPU và bộ nhớ hơn nhiều |
| `fastRedstoneDust` | Tối ưu lag dành cho bột redstone |
| `movableBlockEntities` | Piston có thể đẩy khối thực thể, ví dụ phễu, rương… |

### Nhóm thay đổi hành vi (mở máy chủ chính thức thì mặc định đừng bật)

| Quy tắc | Giải thích |
| --- | --- |
| `tntDoNotUpdate` | TNT đặt sát nguồn điện sẽ không bị cập nhật |
| `explosionNoBlockDamage` | Nổ không phá khối |
| `antiCheatDisabled` | Ngăn người chơi bị kéo ngược do di chuyển quá nhanh |
| `updateSuppressionBlock` | Đặt ray kích hoạt lên khối barrier, khi ray đổi hướng sẽ làm đầy ngăn xếp cập nhật lân cận |
| `stackableShulkerBoxes` | Hộp shulker rỗng khi thả xuống đất có thể xếp chồng |

`updateSuppressionBlock` là cửa vào chính thức, có thể kiểm soát, cho update suppression (cộng đồng quen gọi là "cắt cổng"); các quy tắc chống sập đi kèm xem mục sáu.

### Nhóm đếm và gỡ lỗi

| Quy tắc | Giải thích |
| --- | --- |
| `hopperCounters` | Phễu hướng vào len sẽ đếm số vật phẩm đi qua |
| `commandTick` | Bật lệnh `/tick` để điều khiển đồng hồ trò chơi |

### Có tên nhưng không kèm mô tả

Các quy tắc sau thực sự tồn tại, nhưng ở đây chỉ liệt kê tên; hành vi cụ thể xin lấy mã nguồn của phiên bản bạn dùng hoặc kết quả `/carpet` trong game làm chuẩn:

`creativeNoClip`, `renewableSponges`, `persistentParrots`, `flippinCactus`, `xpNoCooldown`, `smoothClientAnimations`, `tntPrimerMomentumRemoved`, `commandPlayer`.

## Bốn, bốn gói phụ trợ phổ biến

Bản thân Carpet chỉ có bộ quy tắc chính, mở rộng chức năng nhờ gói phụ trợ. Địa chỉ kho, phiên bản hỗ trợ và số mục phiên bản dưới đây đều là dữ liệu chính thức của Modrinth.

| Tên | Kho | Phiên bản hỗ trợ | Số mục phiên bản | Định vị |
| --- | --- | --- | --- | --- |
| Carpet Extra | `gnembon/carpet-extra` | 1.14.4–26.2 | 87 | Hành vi máy phóng mới, cách lấy mới… |
| Carpet TIS Addition | `TISUnion/Carpet-TIS-Addition` | 1.14.4–26.3 | 141 | Gói mở rộng Fabric Carpet |
| Carpet AMS Addition | `Minecraft-AMS/Carpet-AMS-Addition` | 1.16.4–26.3 | 49 | Trang chủ `https://carpet.mcams.club` |
| Carpet Org Addition | `fcsailboat/Carpet-Org-Addition` | 1.19.4–26.3 | 34 | Gói mở rộng Carpet |

Gợi ý chọn gói:

- **Carpet Extra** và **TIS Addition** bao phủ khoảng phiên bản cũ nhất, thường gặp trong modpack phiên bản cũ;
- **AMS Addition** và **Org Addition** khởi đầu từ phiên bản mới hơn (1.16.4 và 1.19.4), nhưng đều theo đến 26.3;
- Quy tắc **bạn thực sự cần dùng** nằm trong gói nào thì cài gói đó, không cần cài hết.

:::warn Gói phụ trợ phải khớp phiên bản chính của Carpet mới có hiệu lực
Đây là nhắc nhở thuộc lẽ thường: gói phụ trợ phụ thuộc giao diện của bản thân Carpet, **phiên bản game khác nhau, phiên bản chính Carpet khác nhau thì gói phụ trợ có thể hoàn toàn không tải hoặc một phần quy tắc mất hiệu lực**. Trước khi cài hãy xác nhận khoảng phiên bản của gói đó bao phủ phiên bản máy chủ của bạn, cài xong vào game dùng `/carpet` xem quy tắc có thực sự xuất hiện không; khi nâng cấp Carpet cũng phải nâng cấp gói phụ trợ theo. Cụ thể lấy ghi chú phiên bản do từng gói phụ trợ công bố làm chuẩn.
:::

## Năm, các quy tắc chống sập đã được kiểm chứng

Những lối chơi như máy nuốt thế giới và update suppression chủ động tạo ra **cập nhật khối cực đoan và tràn ngăn xếp**, hậu quả trực tiếp với máy chủ là sập. Các quy tắc dưới đây là những quy tắc đã được kiểm chứng lần này, chuyên dùng để đỡ loại rủi ro đó.

### Carpet TIS Addition

| Quy tắc | Hướng tác dụng |
| --- | --- |
| `yeetUpdateSuppressionCrash` | Xử lý sập do update suppression gây ra |
| `updateSuppressionSimulator` | Mô phỏng update suppression |
| `deobfuscateCrashReportStackTrace` | Giải xáo trộn ngăn xếp gọi trong báo cáo sập, giúp nhật ký sập đọc được |

### Carpet AMS Addition

| Quy tắc | Giá trị tùy chọn |
| --- | --- |
| `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |

Tác dụng của `customBlockUpdateSuppressor` là biến khối được chỉ định thành **khối chặn cập nhật** —— nói cách khác, bạn tự chọn loại khối nào đảm nhận vai trò "làm đầy ngăn xếp cập nhật lân cận", thay vì chỉ dùng `updateSuppressionBlock` của bản thân.

Ngoài ra: Carpet Org Addition **chưa kiểm chứng được quy tắc liên quan đến chặn cập nhật hay sập**, nên ở đây không ghi tên quy tắc của nó.

## Sáu, phối hợp với máy nuốt thế giới và cắt cổng thế nào

- **"Cắt cổng" là cách gọi quen thuộc của cộng đồng** cho loại thao tác "update suppression", không phải thuật ngữ chính thức trong game;
- Cửa vào có thể kiểm soát mà Carpet chính thức cung cấp chính là `updateSuppressionBlock`; còn `customBlockUpdateSuppressor` của AMS cho phép đổi sang khối khác;
- Rủi ro sập được đỡ bởi `yeetUpdateSuppressionCrash`, `updateSuppressionSimulator`, `deobfuscateCrashReportStackTrace` của TIS và `amsUpdateSuppressionCrashFix` của AMS;
- Ba lớp này có quan hệ "**cửa vào kiểm soát được + tham số thay được + sập đỡ được**", thiếu một lớp là việc tìm lỗi khó hơn.

Cụ thể máy móc bật thế nào, rủi ro kiểm soát ra sao, xem bài 7 [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine). Kết luận ở đó là: máy càng mạnh, càng cần bộ ba "sao lưu + quyền hạn + quy tắc chống sập", và **quy tắc chống sập chính là mấy điều trong mục này**.

## Bảy, ba nguyên tắc tối thiểu của bài này

```
1. Quy tắc chỉ bật cái bạn hiểu hậu quả —— mỗi lần đổi đều ghi lại
2. Gói phụ trợ khớp phiên bản chính —— cài xong dùng /carpet xác nhận quy tắc thực sự có
3. Bật quy tắc chống sập trước —— trước khi dùng máy nuốt thế giới và update suppression, đỡ sập trước đã
```

## Bước tiếp theo

Sau khi bật quy tắc xong, máy vừa động đất là phải đọc kiểm soát rủi ro trước: xem [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine). Muốn mọi người dùng chung một bản hình chiếu, xem [Chia sẻ schematic](/tutorials/java/sd-schematic); quay lại tính bài toán hiệu năng xem [Mod tối ưu](/tutorials/java/sd-optimize), vì sao lõi bắt buộc phải là Fabric xem [Chọn lõi máy chủ](/tutorials/java/sd-server).

---

> Tên quy tắc trong bài lấy từ mã nguồn chính thức của Carpet, địa chỉ kho, phiên bản hỗ trợ và số mục phiên bản của các gói phụ trợ lấy từ dữ liệu chính thức của Modrinth; quy tắc có tồn tại hay không, hành vi thế nào, xin lấy kết quả `/carpet` trong game của phiên bản bạn dùng làm chuẩn.
