---
title: "[Loạt bài kỹ thuật redstone] Máy nuốt thế giới và cắt cổng"
slug: sd-machine
cat: java
level: 3
order: 35
minutes: 22
mc: ["1.21.x", "1.20.4", "1.19.4", "1.16.5"]
tags: [java, kỹ thuật redstone, máy nuốt thế giới, update suppression, cắt cổng, carpet, tnt]
updated: 2026-10-08
draft: false
---

Máy nuốt thế giới (world eater) là loại máy gồm dàn TNT cộng thiết bị bay, dùng để xóa sạch từng mảng một vùng; còn "cắt cổng" là cách gọi quen thuộc của cộng đồng cho loại thao tác update suppression. Hai thứ này là lối chơi dễ làm máy chủ chết thẳng nhất trên máy chủ kỹ thuật redstone.

**Bài này chỉ nói kiểm soát rủi ro, không nói cách chế tạo.** Cách chế tạo không nằm trong phạm vi đã kiểm chứng, bản vẽ và các bước lưu truyền trên mạng cũng không bảo đảm đúng trên phiên bản của bạn, ở đây không viết, cũng không nhắc lại.

Nói rõ ranh giới trước: quy tắc Carpet chính thức liên quan trực tiếp đến máy nuốt thế giới chỉ có ba, trong đó hai quy tắc thay đổi hành vi bản gốc, mở máy chủ chính thức thì đừng bật. Thứ thực sự cần bạn cấu hình sẵn là quy tắc chống sập, và phải **vào quy tắc trước, động máy sau**.

## Một, máy nuốt thế giới là gì, rủi ro ở đâu

Cách làm của máy nuốt thế giới là dùng dàn TNT nổ liên tục, rồi nhờ thiết bị bay dịch chuyển cả kết cấu đi, dọc đường xóa sạch địa hình. Sản phẩm của nó là "một vùng bị đào rỗng", cái giá của nó là mấy thứ đắt nhất của máy chủ: lượng lớn thực thể TNT, tính toán nổ từng mảng, lượng cập nhật khối khổng lồ do khối bị phá, và thiết bị bay chạy suốt.

| Rủi ro | Nguồn |
| --- | --- |
| TPS bị kéo sụp | Cùng một thời điểm tồn tại lượng lớn thực thể TNT và tính toán nổ |
| Áp lực lên bản lưu và băng thông | Một lần chạy là đổi cả mảng lớn, lượng cập nhật khối khổng lồ |
| Mất kiểm soát khi không người trực | Máy tự tiến nhờ thiết bị bay, có vấn đề không chắc có người ở đó |
| Bản thân thao tác vượt biên | Update suppression ("cắt cổng") sẽ làm đầy ngăn xếp cập nhật lân cận, từ đó có thể làm máy chủ sập |

Đổi góc nhìn, cùng một cái máy lại mang nghĩa ngược nhau với người chơi và chủ máy chủ:

| Vai trò | Máy nuốt thế giới nghĩa là gì |
| --- | --- |
| Người chơi | Một dây chuyền lấy vùng trống lớn hiệu quả, sản phẩm thuộc về mình |
| Chủ máy chủ | Toàn bộ khối của một vùng bị đổi + một quãng tải cao liên tục + một phần rủi ro sập |

Vậy máy nuốt thế giới không phải vấn đề "có chế tạo được không", mà là vấn đề "có sự cố rồi bạn có dọn được không".

## Hai, các quy tắc chính thức liên quan trực tiếp đến máy nuốt thế giới

Carpet dùng `/carpet <tên quy tắc> <giá trị>` để bật tắt hành vi chi tiết của bản gốc. Liên quan trực tiếp đến máy nuốt thế giới chỉ có ba điều dưới đây:

| Quy tắc | Ảnh hưởng đến hành vi bản gốc |
| --- | --- |
| `optimizedTNT` | Không thay đổi bản thân hiệu ứng nổ, chỉ làm cho vụ nổ ở cùng vị trí và trong chất lỏng tốn ít tài nguyên hơn |
| `tntDoNotUpdate` | **Thay đổi hành vi bản gốc**: TNT đặt sát nguồn điện không còn bị cập nhật |
| `explosionNoBlockDamage` | **Thay đổi hành vi bản gốc**: nổ không còn phá khối |

Cách dùng:

- `optimizedTNT` mô tả là vụ nổ **cùng vị trí, trong chất lỏng** ít lag hơn, có ý nghĩa với cảnh "nổ đi nổ lại cùng một vùng" như máy nuốt thế giới; nó tối ưu chi phí, không phải hiệu ứng.
- `tntDoNotUpdate` và `explosionNoBlockDamage` **sẽ thay đổi hành vi bản gốc**, chỉ dùng khi kiểm thử hoặc trong tình huống cụ thể. Mở máy chủ chính thức thì đừng bật —— `tntDoNotUpdate` làm lối chơi "đặt TNT sát nguồn điện" mất hiệu lực, `explosionNoBlockDamage` thì trực tiếp bỏ sức phá hoại của vụ nổ, khả năng xóa vùng của máy cũng mất.

:::warn Hai quy tắc thay đổi hành vi bản gốc chỉ thuộc môi trường kiểm thử
`tntDoNotUpdate` và `explosionNoBlockDamage` phù hợp để kiểm chứng kết cấu, làm trình diễn vô hại ở máy chủ kiểm thử, **không phù hợp mở máy chủ chính thức**. Hành vi máy đo được khi bật chúng, và hành vi sau khi thật sự lên sóng là hai chuyện khác nhau.
:::

## Ba, định nghĩa chính xác của "cắt cổng"

**"Cắt cổng" là cách gọi quen thuộc của cộng đồng** cho loại thao tác "update suppression". Nó không chỉ một khối nào, một máy nào, mà là cả một loại kỹ thuật lợi dụng hiện tượng update suppression.

Carpet chính thức cho nó một cửa vào có thể kiểm soát, tên quy tắc là `updateSuppressionBlock`: **đặt ray kích hoạt lên khối barrier, khi ray đổi hướng sẽ làm đầy ngăn xếp cập nhật lân cận.**

Ở đây có hai điểm phải nhớ:

1. Nó là **cửa vào có thể kiểm soát do chính thức cung cấp**, nghĩa là việc này tự nó không cần mod thêm mới bật tắt được ở phía máy chủ.
2. Hậu quả của nó nằm trong câu "làm đầy ngăn xếp cập nhật lân cận" —— ngăn xếp cập nhật lân cận bị làm đầy, chính là nguồn gốc của rủi ro sập.

## Bốn, vì sao phải bật chống sập trước

Cơ chế của update suppression là **làm đầy ngăn xếp cập nhật lân cận**. Việc xảy ra sau khi đầy không do máy của bạn kiểm soát: **từ đó có thể làm máy chủ sập**.

Đây là câu trả lời cho vấn đề thứ tự. Nhiều người "động máy trước, sập rồi tìm quy tắc", nhưng sập không phải lần nào cũng kết thúc êm —— khoảnh khắc máy chủ chết, chunk đang ghi và trạng thái máy đang chạy đều không chắc còn nguyên. Nên thứ tự đúng là:

```
1. Vào quy tắc chống sập trước (mục này)
2. Rồi mới vào máy, rồi mới để người chơi khởi công
```

Các quy tắc chống sập đã kiểm chứng được như sau, chia hai nhóm theo nguồn. Tên quy tắc và giá trị tùy chọn đã liệt kê một lượt như danh sách trong [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet), **thứ cần bổ sung ở đây là thứ tự sử dụng**:

| Nguồn | Quy tắc | Giá trị tùy chọn |
| --- | --- | --- |
| Carpet AMS Addition | `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| Carpet AMS Addition | `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |
| Carpet TIS Addition | `yeetUpdateSuppressionCrash` | Xem hướng dẫn mod của phiên bản tương ứng |
| Carpet TIS Addition | `updateSuppressionSimulator` | Xem hướng dẫn mod của phiên bản tương ứng |

Vài giải thích:

- `amsUpdateSuppressionCrashFix` là **công tắc ba trạng thái**: `false` và `true` là tắt và bật thông thường, `silence` là cách xử lý ở mức thứ ba. Ngữ nghĩa chính xác của ba mức lấy hướng dẫn chính thức của mod làm chuẩn, ở đây không định nghĩa thay nó.
- Tác dụng của `customBlockUpdateSuppressor` là **biến khối được chỉ định thành khối chặn cập nhật**, giá trị tùy chọn chính là mấy khối trong bảng trên.
- `yeetUpdateSuppressionCrash` và `updateSuppressionSimulator` của Carpet TIS Addition bao phủ **hai hướng khác**: một cái ứng với xử lý sập, một cái ứng với mô phỏng. Hành vi cụ thể và giá trị dùng được của hai cái lấy hướng dẫn mod của phiên bản tương ứng làm chuẩn.

:::tip Xác nhận quy tắc thực sự có hiệu lực trước, rồi mới động máy
Quy tắc chống sập không phải "cài lên là mãi mãi an toàn", nó là một lớp đỡ đáy. Cách làm là: **cấu hình xong tự kích hoạt một lần update suppression xem biểu hiện**, xác nhận quy tắc thực sự chặn đúng như dự kiến, rồi mới để người chơi bắt đầu động máy.
:::

## Năm, khác biệt phiên bản: phiên bản mới phải nhờ mod cộng đồng khôi phục

Đây là sự thật phải viết đúng: **phiên bản chính thức đã sửa update suppression**. Nghĩa là, trên phiên bản mới muốn làm thao tác cùng loại thì cần mod khôi phục hoặc hỗ trợ do cộng đồng cung cấp, mà khoảng phiên bản chúng bao phủ khác nhau:

| mod | loaders | Khoảng phiên bản bao phủ |
| --- | --- | --- |
| `update-depression` | fabric, quilt | 1.19.4–1.21.1 |
| `better-update-suppression` | fabric | 1.21.10–26.2 |
| `suppressed` | fabric | 26.1.1–26.2 |
| `lithonate` | fabric | Chỉ 1.16.5 |

Cách đọc bảng này cho đúng:

- Đây không phải danh sách "chọn đại một cái", mà là **bốn khoảng phiên bản khác nhau và không chồng lên nhau**. Bạn phải chốt phiên bản game trước, rồi xem phiên bản đó rơi vào khoảng của ai.
- Khoảng của `suppressed` và `better-update-suppression` đều ở vùng 26.x, `update-depression` bao phủ khoảng cũ hơn từ 1.19.4 đến 1.21.1, `lithonate` chỉ bao phủ 1.16.5.
- **Một khi đổi phiên bản, bộ lựa chọn này phải làm lại.** Máy có chạy được không, phải cài mod nào, đều lấy phiên bản làm tiền đề, đừng trông "nâng cấp xong vẫn dùng như cũ".

## Sáu, bộ ba: sao lưu, quyền hạn, quy tắc chống sập

Máy càng mạnh, ba việc này càng không được bỏ. Chúng tương ứng với ba bài trên trang này:

| Việc | Tác dụng | Xem chi tiết |
| --- | --- | --- |
| **Sao lưu** | Sau khi máy chủ sập, thao tác nhầm, máy mất kiểm soát vẫn quay về được trạng thái dùng được trước đó | [Bảo vệ bản lưu](/tutorials/java/sd-backup) |
| **Quyền hạn** | Quyết định ai được động máy, ai được dùng thao tác rủi ro cao như update suppression | [Lãnh thổ và bảo vệ](/tutorials/java/protection) |
| **Quy tắc chống sập** | Ép thao tác như update suppression từ "có thể làm máy chủ chết" về phạm vi kiểm soát được | Mục bốn của bài này |

Bổ sung một bài đọc liên quan trực tiếp đến hành vi máy móc: vì sao máy hỏng, vì sao chậm, phụ thuộc mô hình tick và thứ tự cập nhật trong cùng một khoảnh khắc, xem [Kỹ thuật redstone và máy móc nâng cao](/tutorials/java/redstone-advanced).

## Bảy, nguyên tắc tối thiểu của bài này

```
1. Quy tắc chính thức chỉ tính ba điều: `optimizedTNT` giữ được, hai điều còn lại đổi bản gốc, máy chủ chính thức không bật
2. Cắt cổng = cách gọi quen thuộc của cộng đồng cho update suppression, cửa vào kiểm soát được của chính thức là `updateSuppressionBlock`
3. Vào quy tắc chống sập trước, động máy sau —— đảo thứ tự là lấy bản lưu ra đánh cược
4. Trên phiên bản mới làm thao tác cùng loại, trước hết chọn mod khôi phục/hỗ trợ theo phiên bản
```

## Bước tiếp theo

Máy vừa động đất, thứ phải bảo đảm trước nhất là có sự cố thì quay về được: xem [Bảo vệ bản lưu](/tutorials/java/sd-backup). Ai được động máy do quyền hạn quyết định, xem [Lãnh thổ và bảo vệ](/tutorials/java/protection); vì sao máy hỏng, vì sao chậm, xem [Kỹ thuật redstone và máy móc nâng cao](/tutorials/java/redstone-advanced), vì sao chống gian lận trên máy chủ kỹ thuật redstone là lợi ích âm xem [Vì sao không khuyến nghị chống gian lận](/tutorials/java/sd-anticheat).

---

> Tên quy tắc, tên mod và khoảng phiên bản trích dẫn trong bài đều lấy mã nguồn và hướng dẫn chính thức của Carpet, Carpet AMS Addition, Carpet TIS Addition, cùng mục chính thức của các dự án liên quan trên Modrinth làm chuẩn; cách chế tạo cụ thể và thiết kế máy không thuộc phạm vi bài này.
