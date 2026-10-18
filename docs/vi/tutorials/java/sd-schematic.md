---
title: "[Loạt bài kỹ thuật redstone] Chia sẻ schematic"
slug: sd-schematic
cat: java
level: 3
order: 31
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, schematic, litematica, syncmatica, fabric]
updated: 2026-10-08
draft: false
---

Lối chơi kỹ thuật redstone không thể tránh schematic: máy nuốt thế giới, tháp sinh quái, máy cắt cổng do người khác thiết kế, bạn không thể chép theo trí nhớ, phải dựa vào hình chiếu dựng từng lớp. Trong bản lưu một người thì việc này rất đơn giản, cài mod hình chiếu phía client là được; nhưng khi đến máy chủ nhiều người, schematic nằm rải rác trên máy tính của từng người, ai muốn dựng theo đều phải xin tác giả gốc một tệp trước.

`syncmatica` giải quyết đúng việc này. Nó là phần phối hợp đồng bộ cho Litematica, giúp schematic và vị trí đặt được chia sẻ thuận tiện.

Bài này chỉ nói ba việc: vì sao cần nó, nó cài ở phía nào, căn phiên bản thế nào. **Cụ thể tải lên thế nào, ai có quyền, dùng lệnh gì, xin lấy hướng dẫn chính thức của mod làm chuẩn, bài này không nhắc lại các bước thao tác** —— phần đó mỗi phiên bản đều có thể đổi, đi theo hướng dẫn quá hạn còn dễ sai hơn.

## Một, schematic trên máy chủ nhiều người vướng ở đâu

Trong bản lưu một người, tệp schematic và hình chiếu đều ở client của bạn, không tồn tại vấn đề "chia sẻ". Trên máy chủ nhiều người thì có ba tầng rắc rối:

| Rắc rối | Biểu hiện cụ thể |
| --- | --- |
| Tệp nằm trên máy cá nhân | Mỗi khi có người chơi mới, tác giả gốc lại phải gửi tệp một lần |
| Vị trí không khớp | Hình chiếu cần biết "schematic này đặt ở tọa độ nào trong thế giới", báo tọa độ bằng miệng rất dễ truyền sai |
| Phiên bản và nguồn lẫn lộn | Truyền qua truyền lại là không phân biệt được bản trong tay ai có phải mới nhất không |

`syncmatica` xử lý chính hai tầng đầu: biến schematic và vị trí đặt của nó thành thứ "chia sẻ được thuận tiện". Nó làm tầng đồng bộ và chia sẻ, chứ không làm hình chiếu thay bạn —— hiển thị hình chiếu vẫn là việc của Litematica.

> Muốn tìm hiểu trước vị trí của hình chiếu trong chuỗi công cụ kỹ thuật redstone, có thể xem lại bảng mod client trong [Kỹ thuật redstone và máy móc](/tutorials/java/redstone), và phần nói về các công cụ như MiniHUD, Litematica trong [Kỹ thuật redstone và máy móc nâng cao](/tutorials/java/redstone-advanced).

## Hai, mỗi phía cài gì

Đây là bảng cần nhớ nhất trong bài. Chia sẻ schematic không phải "cài một mod là xong", mà là **máy chủ và client đều phải cài Syncmatica, client còn phải cài thêm Litematica**.

| Vị trí | Cần cài | Giải thích |
| --- | --- | --- |
| Máy chủ | `syncmatica` | Nửa máy chủ của đồng bộ. Chỉ cài client thì không chia sẻ được |
| Client | `syncmatica` | Nửa client của đồng bộ, phối hợp với Litematica để chạy |
| Client | `litematica` | Mod thực sự lo hiển thị hình chiếu. `syncmatica` là phần phối hợp đồng bộ cho nó |

Ba cái bẫy dễ vấp:

1. **Chỉ cài Syncmatica cho người chơi**, máy chủ không cài, đồng bộ không thể xảy ra.
2. **Máy chủ cài Syncmatica nhưng không để người chơi cài Litematica**, schematic chia sẻ ra không có gì hiển thị nó.
3. **Hai bên phiên bản không khớp**, đây là vấn đề phổ biến nhất, mục ba nói riêng.

## Ba, loader và khoảng phiên bản của ba mod

Dữ liệu dưới đây lấy từ mục chính thức trên Modrinth, đã đối chiếu khi viết. Hãy coi nó là điểm khởi đầu khi chọn phiên bản, trước khi tải thật hãy đối chiếu trang dự án một lần nữa.

| mod | loaders | Phiên bản hỗ trợ | Lượng tải (khoảng) |
| --- | --- | --- | --- |
| `syncmatica` | fabric, quilt | 1.16–26.3 | 839 nghìn |
| `litematica` | fabric, forge, liteloader, ornithe | 1.12–26.3 | 26,44 triệu |
| `servux` | fabric | 1.14.4–26.3 | 984 nghìn |

Vài bổ sung:

- Khoảng phiên bản của ba mod đều rất rộng, từ 1.12 / 1.14 / 1.16 phủ đến các phiên bản gần đây kiểu 26.x. **Khoảng rộng không có nghĩa là chọn đại một bản là dùng được**, thứ thực sự phải căn là "phiên bản game khớp nhau, Syncmatica hai bên cùng thuộc một khoảng phiên bản".
- Còn một mod thường được nhắc cùng: `servux`. Nó là **mod phía máy chủ**, cung cấp hỗ trợ và chức năng thêm cho một phần mod client. Nó không phải thứ bắt buộc để chia sẻ schematic, nhưng nó giải quyết cùng loại vấn đề —— "mod client muốn thêm dữ liệu thì máy chủ phải phối hợp".
- loaders của `litematica` có forge, liteloader, ornithe, cho thấy bản thân nó không chỉ có một con đường Fabric; nhưng `syncmatica` chỉ có fabric và quilt, **năng lực đồng bộ ở phía này chính là mắt làm hẹp phạm vi lựa chọn**.

## Bốn, căn phiên bản: phía này dễ sai nhất

Chia sẻ schematic là cơ chế hai phía phối hợp, nên "căn khớp" không phải khẩu hiệu, mà là bốn quan hệ phiên bản phải đồng thời đúng:

| Thứ cần đối chiếu | Yêu cầu |
| --- | --- |
| Phiên bản game | Client và máy chủ phải là cùng một phiên bản game |
| `syncmatica` (máy chủ) | Nằm trong khoảng hỗ trợ của phiên bản game đó |
| `syncmatica` (client) | Cùng khoảng phiên bản với ở trên, hai bên đừng dùng lẫn |
| `litematica` (client) | Khớp với phiên bản game đó |

Trên thực tế hai cách lật xe phổ biến nhất: một là **chỉ cập nhật một phía** (ví dụ chỉ đổi mod client, máy chủ vẫn dừng ở bản cũ), hai là **lùi phiên bản game để một mod nào đó chạy được**, kết quả mod phía bên kia lại không khớp.

Đưa ra một thứ tự thao tác chắc ăn:

1. Chốt phiên bản game trước, rồi theo bảng ở mục ba chọn cả ba mod.
2. `syncmatica` của máy chủ và client dùng tệp cùng khoảng phiên bản.
3. Cài xong trước hết xác nhận vào máy chủ bình thường, hình chiếu hiển thị được, rồi mới nói đến chia sẻ.
4. Khi có vấn đề, căn cứ đầu tiên luôn là **phiên bản**, không phải cấu hình.

## Năm, vì sao bài này chỉ nói "cài ở phía nào"

Chia sẻ schematic là cơ chế **hợp tác vắt qua hai phía**, bất kỳ bước nào lệch đều không báo lỗi rõ ràng, chỉ biểu hiện là "chia sẻ không phản ứng". Còn cách thao tác cụ thể —— đưa schematic lên thế nào, ai được đưa, quản lý bằng lệnh gì —— thuộc mặt chức năng của bản thân mod, sẽ thay đổi theo phiên bản.

Nên cách viết của bài này là:

1. **Nói rõ nguyên lý**: vì sao cần nó, dữ liệu chảy giữa hai phía nào.
2. **Nói rõ vị trí**: máy chủ cài gì, client cài gì, không thiếu một cái nào.
3. **Nói rõ căn phiên bản**: quan hệ phiên bản của ba thứ.
4. **Thao tác giao cho chính thức**: hướng dẫn chính thức của mod viết thế nào thì làm thế đó.

Viết như vậy không phải lười, mà là tránh viết cứng giao diện và lệnh của một phiên bản nào đó ở đây, đợi mod cập nhật xong lại dẫn bạn đi sai.

## Sáu, nó và Carpet có quan hệ gì

**Cùng thuộc hộp công cụ kỹ thuật redstone, nhưng giải quyết vấn đề khác nhau**.

| | Carpet | Syncmatica |
| --- | --- | --- |
| Giải quyết gì | Dùng quy tắc bật tắt hành vi chi tiết của bản gốc | Giúp schematic và vị trí đặt được chia sẻ thuận tiện |
| Hình thái | Mod phía máy chủ Fabric, cung cấp hệ thống quy tắc | Mod đồng bộ, máy chủ và client mỗi bên một nửa |
| Cách dùng điển hình | `/carpet <tên quy tắc> <giá trị>` | Phối hợp với Litematica để chia sẻ schematic |

Điểm chung của hai bên là đều lấy Fabric làm chính: Carpet và toàn bộ gói phụ trợ đều là Fabric, loaders của `syncmatica` cũng là fabric và quilt. Đây cũng là một trong những lý do [Chọn lõi máy chủ](/tutorials/java/sd-server) khuyến nghị máy chủ Fabric + MCDR —— chuỗi công cụ ở cùng một phía, không phải làm cầu nối.

Định vị và cách dùng quy tắc của bản thân Carpet, xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet).

## Bảy, phối hợp với máy nuốt thế giới, cắt cổng thế nào

Công dụng điển hình nhất của hình chiếu là dựng máy lớn: máy nuốt thế giới là loại máy gồm dàn TNT cộng thiết bị bay, xóa sạch vùng theo mảng, kích thước lớn, kết cấu lặp lại, yêu cầu độ chính xác vị trí cao, nhớ bằng đầu người là không thể dựng đúng. Quy trình bình thường là: **có schematic trước, rồi dùng hình chiếu dựng theo**.

Chia sẻ schematic trong quy trình này giải quyết vấn đề hợp tác: một máy nuốt thế giới thường không phải một người dựng xong, cần mấy người chia mảng thi công; hình chiếu khớp nhau thì khối của mấy người mới ghép được.

Còn một khi máy bắt đầu chạy, trọng tâm không còn là hình chiếu, mà là kiểm soát rủi ro: [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine) nói về việc máy càng mạnh càng cần bộ ba "sao lưu + quyền hạn + quy tắc chống sập", và sự thật là trên phiên bản mới, update suppression (cộng đồng quen gọi "cắt cổng") phải nhờ mod cộng đồng khôi phục. Trước khi dựng máy hãy đọc xong bài đó.

## Tám, danh sách nguyên tắc tối thiểu

```
Máy chủ cài Syncmatica + client cài Syncmatica + client cài Litematica
Rồi căn khớp ba phần phiên bản —— thiếu một mục là chia sẻ không thành
```

- **Đừng quên phía máy chủ**: chỉ cấu hình client là lỗi phổ biến nhất của người mới.
- **Thao tác theo chính thức**: đừng chép bước của người khác khi chưa đối chiếu hướng dẫn chính thức của mod.
- **Căn phiên bản trước rồi mới cài**: khoảng phiên bản xem bảng ở mục ba, trước khi cài đối chiếu trang dự án.

## Bước tiếp theo

Nền của hộp công cụ kỹ thuật redstone là hệ thống quy tắc: xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet). Vì sao máy chủ bắt buộc phải là Fabric xem [Chọn lõi máy chủ](/tutorials/java/sd-server); hình chiếu cuối cùng phải thành máy móc, trước khi động tay hãy đọc [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine). Hiệu năng chung và tìm lỗi xem [Tối ưu hiệu năng](/tutorials/java/optimize) và [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

---

> Định vị mod, loader và khoảng phiên bản trong bài đều lấy mục chính thức trên Modrinth và hướng dẫn chính thức của từng mod làm chuẩn; cách thao tác cụ thể xin lấy hướng dẫn chính thức của mod làm chuẩn.
