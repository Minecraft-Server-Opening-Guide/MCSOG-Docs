---
title: "[Loạt bài kỹ thuật redstone] Tối ưu cấu hình"
slug: sd-config
cat: java
level: 3
order: 34
minutes: 16
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, carpet, cấu hình, tối ưu, quy tắc]
updated: 2026-10-08
draft: false
---

"Tối ưu" của máy chủ kỹ thuật redstone không giống tối ưu của máy chủ thường: máy chủ thường có thể kéo TPS lên bằng cách giảm khoảng cách hiển thị, đổi lõi, thêm plugin tối ưu, còn máy chủ kỹ thuật redstone mỗi lần động vào một công tắc đều phải hỏi trước một câu "cái này có làm thay đổi hành vi bản gốc không". Bài này trả lời **máy chủ kỹ thuật redstone rốt cuộc có những công tắc nào động được, động xong ai chịu trách nhiệm kiểm chứng lại**.

Tối ưu hiệu năng chung (thứ tự ưu tiên, khoảng cách hiển thị và khoảng cách mô phỏng, tham số JVM) xem [Tối ưu hiệu năng](/tutorials/java/optimize), chọn mod tối ưu xem [Mod tối ưu](/tutorials/java/sd-optimize), danh sách đầy đủ quy tắc Carpet và gói phụ trợ xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet). Bài này chỉ nói đánh đổi ở tầng cấu hình, và **không đưa bất kỳ tên trường cấu hình hay giá trị mặc định cụ thể nào** —— những thứ đó thay đổi theo phiên bản, phải lấy tài liệu chính thức của từng bên làm chuẩn.

## Một, ba tầng công tắc của máy chủ kỹ thuật redstone

| Tầng | Ví dụ điển hình | Đổi thì thế nào |
| --- | --- | --- |
| Quy tắc Carpet | `optimizedTNT`, `lagFreeSpawning`, `movableBlockEntities` | Có cái chỉ tiết kiệm hiệu năng, có cái **trực tiếp thay đổi hành vi bản gốc** |
| Cấu hình của mod tối ưu | `ferrite-core`, `modernfix`, `c2me-fabric`, `async` | Mỗi cái lo một mảng; đổi sai sẽ đưa vào lag, bug, hoặc thay đổi thứ tự thời gian |
| Cấu hình của bản thân máy chủ | Khoảng cách hiển thị, khoảng cách mô phỏng… | Thuộc tối ưu chung, xem [Tối ưu hiệu năng](/tutorials/java/optimize) |

Trong ba tầng, dễ vấp nhất là tầng một: **tên quy tắc của Carpet nghe đều giống "tối ưu", nhưng tính chất hoàn toàn khác**. Nên dưới đây tách nó ra trước.

## Hai, quy tắc Carpet: trước hết phân biệt "tối ưu thuần" và "đổi hành vi"

Carpet là mod phía máy chủ Fabric, cung cấp hệ thống quy tắc, dùng `/carpet <tên quy tắc> <giá trị>` để bật tắt hành vi chi tiết của bản gốc. Số quy tắc của nó không ít, máy chủ kỹ thuật redstone thực sự cần quan tâm thường là những cái dưới đây:

| Quy tắc | Tính chất |
| --- | --- |
| `optimizedTNT` | Tối ưu thuần |
| `lagFreeSpawning` | Tối ưu thuần |
| `fastRedstoneDust` | Tối ưu thuần, nhưng liên quan redstone, đổi xong phải kiểm chứng lại máy |
| `maxEntityCollisions` | Tinh chỉnh dạng giới hạn, sẽ thay đổi biểu hiện khi thực thể chen chúc |
| `movableBlockEntities` | **Thay đổi hành vi bản gốc**: cho một năng lực vốn không có |
| `commandTick` | Cửa vào gỡ lỗi, không phải mục tối ưu |
| `tntDoNotUpdate` | **Thay đổi hành vi bản gốc**, chỉ dùng khi kiểm thử |
| `explosionNoBlockDamage` | **Thay đổi hành vi bản gốc**, chỉ dùng khi kiểm thử |

Xử lý theo tính chất, chia mức:

| Mức | Quy tắc | Dùng thế nào |
| --- | --- | --- |
| Bật thường trực được | `optimizedTNT`, `lagFreeSpawning` | Bật ở máy chủ kiểm thử trước, quan sát máy móc và sinh quái có như thường không, rồi mới lên máy chủ chính |
| Đổi xong phải kiểm chứng lại | `fastRedstoneDust`, `maxEntityCollisions` | Ghi vào nhật ký thay đổi, thông báo nhóm kỹ thuật, tự kiểm chứng lại máy |
| Thay đổi hành vi bản gốc, bật theo nhu cầu | `movableBlockEntities` | Nó cho một năng lực bản gốc không có, trước khi bật phải xác nhận không có máy nào dựa vào việc "piston không đẩy được khối thực thể" |
| Chỉ bật ở máy chủ kiểm thử | `tntDoNotUpdate`, `explosionNoBlockDamage` | **Mở máy chủ chính thức thì đừng bật**; công dụng của chúng là kiểm thử và thử nghiệm |
| Loại công cụ | `commandTick` | Nó là cửa vào gỡ lỗi, đừng coi là mục tối ưu mà bật thường trực |

:::warn Đổi quy tắc là phải thông báo
Người chơi không phân biệt được "máy hỏng" là lỗi của mình hay do quy tắc bị đổi. **Mỗi lần thay đổi đều phải để lại ghi chép và thông báo**: đổi cái gì, đổi khi nào, ảnh hưởng loại máy nào. Kỷ luật này quan trọng hơn việc cụ thể bật quy tắc nào.
:::

## Ba, cấu hình mod tối ưu: mỗi cái lo một mảng, mỗi lần chỉ đổi một mục

Mục cấu hình của mod tối ưu phần lớn là **chuẩn bị cho các hệ thống con khác nhau**, nên phải biết mỗi mod lo mảng nào trước, rồi mới quyết định động vào ai:

| mod | Hướng phụ trách |
| --- | --- |
| `ferrite-core` | Mức chiếm bộ nhớ |
| `modernfix` | Đa hợp: hiệu năng, bộ nhớ, đồng thời sửa bug |
| `c2me-fabric` | Hiệu năng chunk |
| `async` | Đa luồng thực thể |
| `spark` | Công cụ đo (profiler), không phải mod tối ưu |

**Bài này cố ý không viết bất kỳ tên trường cấu hình hay giá trị mặc định cụ thể nào**: tùy chọn của các mod này thay đổi giữa các phiên bản, tên trường chép về có thể đã không còn tồn tại, chép nguyên giá trị mặc định lại càng dễ đổi luôn hành vi. Muốn chỉnh thì tra trong hướng dẫn chính thức của chính từng mod.

Kỷ luật khi đổi cấu hình chỉ có bốn điều, nhưng không điều nào bỏ được:

1. **Sao lưu tệp cấu hình trước khi đổi** (nguyên tắc và cách làm xem [Sao lưu và khôi phục](/tutorials/java/backup)) —— cấu hình đổi hỏng, ít nhất bạn còn quay về bản trước được.
2. **Mỗi lần chỉ đổi một mục**, đổi xong quan sát một thời gian. Một lần đổi năm mục, khi có sự cố bạn không phán đoán được mục nào gây ra.
3. **Dùng `spark` so sánh trước và sau khi đổi**, nói bằng dữ liệu, chứ không dựa vào "cảm giác mượt hơn".
4. **Kiểm chứng ở máy chủ kiểm thử hoặc thế giới kiểm thử trước**, nhất là các mục liên quan chunk và đa luồng như `c2me-fabric`, `async`.

:::tip Đa luồng sẽ thay đổi thứ tự thời gian
`c2me-fabric` và `async` tăng tốc xử lý chunk và thực thể, đa luồng tự nhiên sẽ thay đổi thứ tự thực thi và thứ tự thời gian, mà máy móc lại đúng là nhạy với thứ tự thời gian. Chỉ động vào chúng khi bạn biết rõ mình muốn gì và sẵn sàng chịu chi phí kiểm chứng lại.
:::

## Bốn, khác biệt phiên bản: danh sách cấu hình phải đổi theo phiên bản

Không có một "cấu hình tối ưu vạn năng" nào dùng chung qua các phiên bản. Hai ví dụ phải nhớ:

| mod | Thay đổi | Kết luận |
| --- | --- | --- |
| `memoryleakfix` | README chính thức ghi: sau Minecraft `1.20.5+`, mọi rò rỉ bộ nhớ mà nó từng sửa đều đã được chính thức sửa, mod này trên phiên bản mới **đã lỗi thời** | Trên phiên bản mới đừng cài nó để "tối ưu" nữa |
| `starlight` | Phiên bản hỗ trợ chỉ đến `1.20.4` (Fabric); README chính thức ghi trên `1.20` khoảng cách của nó với bản gốc đã rất nhỏ, và nó là bản viết lại động cơ ánh sáng **xâm nhập**, dễ xung đột với mod khác hơn | Nó không nên tiếp tục xuất hiện trong danh sách cấu hình của phiên bản mới |

Vì thế mỗi lần nâng phiên bản game, nâng mod hoặc đổi lõi, đều phải đối chiếu lại một lượt: **từng mục trong danh sách này trên phiên bản hiện tại còn tồn tại không, còn ý nghĩa không**. Mục đã lỗi thời để lại trong cấu hình thường không báo lỗi, chỉ lặng lẽ chiếm chỗ và tăng rủi ro tương thích.

## Năm, danh sách thứ tự ưu tiên thay đổi

Làm theo thứ tự thì hiệu quả trên chi phí cao nhất; đảo thứ tự dễ làm hỏng máy mà còn không tìm ra nguyên nhân.

```text
1. Đo đường cơ sở trước: lấy mẫu bằng spark, ghi lại TPS / MSPT lúc bình thường
2. Rồi động vào các mục "tối ưu thuần": optimizedTNT, lagFreeSpawning, và cấu hình mod tối ưu bộ nhớ
3. Tiếp theo là tinh chỉnh dạng giới hạn và phạm vi: loại maxEntityCollisions, đổi xong để máy tự kiểm chứng lại
4. Cuối cùng mới cân nhắc các mục đổi thứ tự thời gian: cấu hình liên quan chunk và đa luồng như c2me-fabric, async
5. Quy tắc thay đổi hành vi bản gốc (tntDoNotUpdate, explosionNoBlockDamage) chỉ dùng ở máy chủ kiểm thử
```

Cách làm đi kèm là "**sao lưu trước khi đổi, mỗi lần một mục, để lại ghi chép, thông báo người chơi**". Quản lý cấu hình của máy chủ kỹ thuật redstone, về bản chất là **quản lý phiên bản**: bạn đổi không phải một con số, mà là tiền đề vận hành của mọi máy móc.

## Sáu, bốn hiểu lầm thường gặp

| Cách làm thường gặp | Vấn đề |
| --- | --- |
| Bật hết các mục tối ưu nhìn thấy trong một lần | Có vấn đề không định vị được mục nào gây ra, chỉ còn cách tắt hết làm lại |
| Chép cấu hình tối ưu của người khác dùng thẳng | Phiên bản, tổ hợp mod và máy móc đều khác, người khác bật được không có nghĩa bạn bật được |
| Lấy "cảm giác nhanh hơn" làm kết luận | Không có đường cơ sở thì không có so sánh, lấy mẫu bằng `spark` trước rồi mới phán đoán |
| Đổi quy tắc không ghi chép, không thông báo | Máy hỏng không ai biết nguyên nhân, nhóm kỹ thuật chỉ còn cách coi nó là bug để tìm |

Để phán đoán một thay đổi có đáng giữ không, tiêu chuẩn chỉ có một: **có dữ liệu cho thấy nó tốt hơn**, chứ không phải "người khác đều bật thế".

## Bước tiếp theo

Danh sách đầy đủ ở tầng quy tắc và các gói phụ trợ (bao gồm quy tắc liên quan chống sập và update suppression) xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet); chọn mod tối ưu và "kết luận lỗi thời" xem [Mod tối ưu](/tutorials/java/sd-optimize); thứ tự tối ưu chung từ phần cứng, khoảng cách hiển thị đến JVM xem [Tối ưu hiệu năng](/tutorials/java/optimize).

---

> Tên quy tắc và phiên bản hỗ trợ mod trong bài đều lấy từ mã nguồn chính thức của Carpet, dữ liệu chính thức của Modrinth và README chính thức của từng mod; mục cấu hình cụ thể lấy hướng dẫn chính thức của phiên bản mod hiện tại làm chuẩn.
