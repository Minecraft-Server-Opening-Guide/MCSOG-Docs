---
title: "[Loạt bài kỹ thuật redstone] Chọn lõi máy chủ"
slug: sd-server
cat: java
level: 3
order: 29
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, carpet, fabric, máy chủ]
updated: 2026-10-08
draft: false
---

Máy chủ kỹ thuật redstone cần không phải "một máy chủ mở được", mà là **cả một bộ cơ chế bản gốc có thể được quy tắc kiểm soát tinh vi**: máy móc chạy đúng như dự kiến, TNT và update suppression kiểm soát được, sập rồi kéo lên lại ngay. Bài này nói rõ cái giá của từng con đường trong ba con đường, và nói riêng thật kỹ về giao thức PCA.

## Một, nhìn qua ba con đường

| Con đường | Đại diện | Được gì | Cái giá |
| --- | --- | --- | --- |
| **Máy chủ Fabric + MCDR** (khuyến nghị nhất) | Fabric + `MCDR` | Carpet và toàn bộ gói phụ trợ, trình quản lý ngoài tiến trình, danh mục plugin chính thức | Phải tự cài mod, không có kiểu cắm là chạy của hệ sinh thái plugin |
| Phía tối ưu kỹ thuật redstone | Phía plugin như họ Paper | Tối ưu TPS, hệ sinh thái plugin | Sẽ đổi hành vi bản gốc, máy có thể không chạy |
| Phía đa luồng | `c2me-fabric`, `async` | Tăng tốc xử lý chunk và thực thể | Đa luồng thay đổi thứ tự thời gian, ảnh hưởng hành vi máy móc |

**Nói kết luận trước**: mở máy chủ kỹ thuật redstone thì chọn **máy chủ Fabric + MCDR**, hai con đường còn lại chỉ dùng khi biết rõ mình muốn gì.

## Hai, vì sao khuyến nghị nhất là máy chủ Fabric + MCDR

Đây không phải vấn đề sở thích, mà là kết quả chồng của ba sự thật cứng.

### Chuỗi công cụ kỹ thuật redstone đều trên Fabric

Bản thân `Carpet`, cùng bốn gói phụ trợ phổ biến của nó (`Carpet Extra`, `Carpet TIS Addition`, `Carpet AMS Addition`, `Carpet Org Addition`) **đều là mod phía máy chủ Fabric**. Nghĩa là hệ thống quy tắc mà người chơi kỹ thuật redstone thực sự dựa vào chỉ có hiện thực đầy đủ trên Fabric; chọn lõi khác tức là từ bỏ chuỗi công cụ này. Chi tiết quy tắc và gói phụ trợ xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet).

### MCDR độc lập bên ngoài tiến trình máy chủ

`MCDR` (MCDReforged) là trình quản lý máy chủ viết bằng Python.

Then chốt là **nó chạy bên ngoài tiến trình máy chủ**:

- Máy chủ sập, MCDR vẫn sống, có thể **tự khởi động lại**;
- Ngay khoảnh khắc sập nó vẫn còn khả năng thực thi, nên **chạy được sao lưu khi sập**;
- Nó tương tác với máy chủ qua console và nhật ký, không xâm nhập vào logic của bản thân máy chủ.

Ba điểm này đặc biệt quan trọng với máy chủ kỹ thuật redstone: máy nuốt thế giới, update suppression, dàn TNT quy mô lớn đều là lối chơi có thể làm máy chủ chết thẳng, trình quản lý phải "sống dai" hơn máy chủ. Cài đặt và lệnh xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr).

### MCDR có danh mục plugin chính thức

MCDR chính thức duy trì một danh mục plugin (`MCDReforged/PluginCatalogue`), đủ loại plugin sao lưu, truy vấn, quyền hạn. Riêng mảng sao lưu, trong danh mục tìm được các mục như `prime_backup`, `quick_backup_multi`, `timed_quick_backup_multi`, `better_backup`, `auto_backup`, `permanent_backup`, `zip_backup`, `chunk_backup`, `region_backup`, `ftp_backup`, `baidu_netdisk_backup`, `extra_prime_backup`, `smart_backup`, `cushion_of_backup`, trong đó `ftp_backup` và `baidu_netdisk_backup` thuộc hướng **sao lưu ngoài trạm**.

Nói cách khác: bạn không phải tự viết script quản lý, cài xong MCDR là có sẵn một hộp công cụ vận hành.

## Ba, hai loại lựa chọn còn lại, và cái giá của chúng

### Phía tối ưu kỹ thuật redstone (phía plugin)

Phía plugin như họ Paper tối ưu TPS rất tốt, hệ sinh thái plugin cũng chín, nhưng nhiều cấu hình mặc định của chúng **vốn đã được tối ưu**, không khớp hành vi bản gốc: va chạm thực thể, cách hiện thực redstone, độ trễ gỡ chunk, một khi những mục này bị đổi, máy có thể không chạy hoặc sản lượng không ổn định.

Loại lõi này phù hợp máy chủ sinh tồn thường, máy chủ minigame, máy chủ cần nhiều chức năng plugin; **mở máy chủ kỹ thuật redstone thì phải làm ngược lại, chỉnh từng mục ảnh hưởng hành vi bản gốc về bản gốc**. Mục nào cần chỉnh, chỉnh thế nào, trang này đã có hai bài riêng:

- [Chọn lõi máy chủ](/tutorials/java/core) —— chọn lõi chung và định vị từng lõi;
- [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) —— danh sách chỉnh đặc tính bản gốc phía plugin, và lõi chuyên dụng kiểu MCHPRS.

Bài này không lặp lại nội dung của hai bài đó.

### Phía đa luồng

Cách nghĩ của phía đa luồng là tách xử lý chunk hoặc thực thể ra nhiều luồng:

| mod | Vấn đề dưới góc nhìn kỹ thuật redstone |
| --- | --- |
| `c2me-fabric` | Xử lý chunk song song hóa, thứ tự thời gian khác bản gốc |
| `async` | Xử lý thực thể song song, thứ tự cập nhật mà máy dựa vào sẽ thay đổi |

Máy redstone và máy kỹ thuật redstone **dựa rất nhiều vào thứ tự cập nhật và thứ tự thời gian**. Đa luồng tăng tốc thông lượng, cái giá là làm cho "trong cùng một tick ai trước ai sau" trở nên không đoán được —— máy có thể thỉnh thoảng đúng, thỉnh thoảng sai, cái này còn khó tìm hơn là chậm một cách ổn định.

Kết luận: chỉ dùng phía đa luồng khi biết rõ mình muốn gì (ví dụ chỉ muốn chạy bản đồ không lag, và chấp nhận máy móc lệch hành vi).

## Bốn, máy chủ kỹ thuật redstone không khuyến nghị cài chống gian lận

Nói thẳng: **máy chủ kỹ thuật redstone không khuyến nghị cài plugin chống gian lận**.

Nguyên nhân là xung đột về logic:

- Lối chơi bình thường của người chơi kỹ thuật redstone tự nó liên tục kích hoạt phán định chống gian lận —— di chuyển tốc độ cao, lượng lớn thực thể, hành vi bất thường do máy móc và tự động hóa sinh ra, đều bị coi là đáng ngờ;
- Chống gian lận thường yêu cầu cài trên **phía plugin hoặc phía tối ưu**, mà hai loại lõi này tự nó đã đổi hành vi bản gốc, xung đột trực tiếp với mục tiêu kỹ thuật redstone;
- Bộ phát hiện và kéo ngược dành cho di chuyển nhanh của bản gốc, bản thân Carpet đã có công tắc: `antiCheatDisabled` (ngăn người chơi bị kéo ngược do di chuyển quá nhanh).

Thứ bạn thực sự cần là những phương án thay thế như **danh sách trắng và quyền, ghi chép và tra ngược thao tác, sao lưu định kỳ và ngoài trạm**, chứ không phải thêm một lớp phán định sẽ phán đoán sai. Lập luận đầy đủ xem [Vì sao không khuyến nghị chống gian lận](/tutorials/java/sd-anticheat), công cụ nhật ký và quay lui xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

## Năm, giao thức PCA

Danh tính chính xác của `PCA` là `plusls-carpet-addition` (Plusls Carpet Addition), một mod mở rộng của Carpet. Trong cộng đồng nói "thêm giao thức PCA cho máy chủ" chính là chỉ việc này, thường được gọi tắt là **PCA Protect**; tài liệu giao thức xem [plusls/plusls-carpet-addition](https://github.com/plusls/plusls-carpet-addition).

### Nó là gì

Giao thức đồng bộ PCA là giao thức dùng để đồng bộ Entity, BlockEntity giữa máy chủ và client, hiện được MasaGadget dùng để hiện thực xem trước vật chứa trong chế độ nhiều người.

Tách ra thì có ba tầng nghĩa:

1. Nó là giao thức **giữa máy chủ và client**, hai đầu đều phải có hỗ trợ tương ứng;
2. Đối tượng nó đồng bộ là dữ liệu của **Entity và BlockEntity**;
3. Công dụng chính hiện nay là **MasaGadget dùng nó để hiện thực xem trước vật chứa trong chế độ nhiều người** —— xem nội dung bên trong rương, phễu, máy của người khác trong môi trường nhiều người.

### Hai quy tắc

| Quy tắc | Kiểu | Giá trị mặc định | Giá trị tùy chọn | Giải thích |
| --- | --- | --- | --- | --- |
| `pcaSyncProtocol` | `boolean` | `false` | `true` / `false` | Công tắc của giao thức đồng bộ, phân loại là `PCA`, `protocal` |
| `pcaSyncPlayerEntity` | `enum` | `OPS` | `NOBODY` / `BOT` / `OPS` / `OPS_AND_SELF` / `EVERYONE` | Quyết định dữ liệu của những người chơi nào sẽ được giao thức đồng bộ PCA đồng bộ |

Chú ý `pcaSyncProtocol` **mặc định tắt**: giao thức là năng lực, không phải hành vi mặc định, trước khi dùng phải tự nghĩ rõ đồng bộ cho ai xem.

### Tình trạng bảo trì (đoạn này phải đọc kỹ)

| Dự án | Trạng thái |
| --- | --- |
| `plusls/plusls-carpet-addition` (dự án gốc) | Ngừng cập nhật năm 2022 |
| `Nyan-Work/plusls-carpet-addition` (một trong các fork) | Ngừng cập nhật năm 2024 |
| `pca-protocol` | Hiện dùng được. Modrinth, `fabric`, 1.14.4–26.3, tác giả fallen-breath. |
| `pca-protocol-plugin` | Hiện dùng được. Modrinth, `bukkit` / `paper` / `purpur` / `spigot`, 1.17–1.21.8. |

Nghĩa là: dự án gốc và fork của nó đều đã ngừng cập nhật, **hiện dùng được là hai fork tinh gọn chỉ giữ chức năng giao thức** —— `pca-protocol` cho máy chủ Fabric, `pca-protocol-plugin` cho máy chủ họ Spigot.

### Thêm giao thức PCA cho máy chủ (PCA Protect)

Cộng đồng gọi tắt việc "làm cho máy chủ nói giao thức PCA" là **PCA Protect**, cách làm chính là cài đúng một trong hai fork tinh gọn ở trên:

- **Máy chủ Fabric**: cài `pca-protocol` (mã nguồn: [Fallen-Breath/pca-protocol](https://github.com/Fallen-Breath/pca-protocol)), nó không cần bất kỳ thành phần phụ thuộc nào thêm, chỉ cần Fabric Loader.
- **Máy chủ họ Spigot** (`bukkit` / `paper` / `purpur` / `spigot`): cài `pca-protocol-plugin`.
- **Client**: máy chủ chỉ "biết nói", muốn dùng thật vẫn phải cài ở client một mod dùng giao thức này, ví dụ `MasaGadget` (xem trước vật chứa nhiều người chính là nó hiện thực).

Cài xong giao thức vẫn **mặc định tắt**: phải mở tay `pcaSyncProtocol`, và dùng `pcaSyncPlayerEntity` để quyết định phạm vi đồng bộ.

:::warn Fork tinh gọn xung đột với bản đầy đủ
Chính thức nói rõ: fork tinh gọn **xung đột** với `plusls-carpet-addition` đầy đủ. Nghĩa là, hoặc dùng bản đầy đủ (có chức năng khác, nhưng đã ngừng cập nhật), hoặc dùng bản tinh gọn (chỉ có giao thức, vẫn được bảo trì), **đừng cài cả hai cùng lúc**.
:::

## Sáu, ba nguyên tắc tối thiểu của bài này

```
1. Lõi chọn Fabric —— chuỗi công cụ kỹ thuật redstone chỉ đầy đủ ở đây
2. Quản lý giao cho MCDR —— nó ở ngoài tiến trình máy chủ, sập vẫn cứu được
3. Không thêm chống gian lận —— phán định sai là tất yếu, thay bằng quyền, nhật ký và sao lưu
```

## Bước tiếp theo

Sau khi chốt lõi, bước tiếp theo là cài hệ thống quy tắc: xem [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet). Trước khi máy khởi công hãy đọc kiểm soát rủi ro, xem [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine); vì sao chống gian lận trên máy chủ kỹ thuật redstone là lợi ích âm, xem [Vì sao không khuyến nghị chống gian lận](/tutorials/java/sd-anticheat). Chọn lõi chung và những chi tiết bị bỏ qua xem [Chọn lõi máy chủ](/tutorials/java/core) và [Kỹ thuật redstone và máy móc](/tutorials/java/redstone).

---

> Mod loader, phiên bản hỗ trợ và tên thư mục plugin trong bài đều lấy từ dữ liệu chính thức của Modrinth và danh mục plugin chính thức của MCDR; cấu hình cụ thể lấy hướng dẫn chính thức của từng dự án làm chuẩn.
