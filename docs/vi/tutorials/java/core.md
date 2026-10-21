---
title: Chọn lõi máy chủ
slug: core
cat: java
level: 1
order: 4
minutes: 12
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, lõi, paper, purpur, folia, leaves, fabric, kỹ thuật redstone, đa nhân]
updated: 2026-10-04
draft: false
---

Môi trường đã sẵn sàng, quyết định tiếp theo là **dùng lõi máy chủ nào**. Lõi quyết định ba việc: **giới hạn hiệu năng**, **có cài được plugin hay mod không**, và **redstone cùng các hành vi bản gốc có nhất quán không**.

Chọn sai không phải không mở được, mà là tốn tiền vô ích (CPU nhiều nhân chạy lõi đơn luồng) hoặc làm việc vô ích (dùng Paper cho kỹ thuật redstone).

## Một, trước tiên phân biệt ba loại lõi

| Loại | Đại diện | Cài plugin được | Cài mod được | Giải thích |
| --- | --- | --- | --- | --- |
| **Bản gốc** | Vanilla | Không | Không | Máy chủ chính thức, hành vi chuẩn nhất, nhưng không có tối ưu nào |
| **Máy chủ plugin** | Spigot → Paper → Purpur / Leaves / Leaf / Folia | Có | Không | Một dòng họ Bukkit, hệ sinh thái lớn nhất |
| **Máy chủ mod** | Fabric / Forge / NeoForge | Cần cầu nối | Có | Nạp mod, phù hợp modpack |

> Còn một loại nữa là **proxy** (Velocity / BungeeCord): nó tự không chạy thế giới, chỉ chuyển tiếp người chơi tới nhiều máy chủ con, chỉ cần khi "kết nối nhiều máy chủ".

Trong ba loại này, máy chủ kỹ thuật redstone đi theo con đường **máy chủ mod (Fabric)**. Trước khi mở máy chủ kỹ thuật redstone, bộ hướng dẫn này đáng đọc qua một lượt:

- [\[Loạt bài kỹ thuật redstone\] Chọn lõi máy chủ](/tutorials/java/sd-server): vì sao là Fabric cộng MCDR, và cái giá của từng con đường.
- [\[Loạt bài kỹ thuật redstone\] Carpet và các gói phụ trợ](/tutorials/java/sd-carpet): hệ thống quy tắc, bốn gói phụ trợ phổ biến và quy tắc chống sập.
- [\[Loạt bài kỹ thuật redstone\] Chia sẻ schematic](/tutorials/java/sd-schematic): dùng Syncmatica đồng bộ hình chiếu và đặt khối cho mọi người.
- [\[Loạt bài kỹ thuật redstone\] Mod tối ưu](/tutorials/java/sd-optimize): cái nào cài yên tâm, cái nào làm thay đổi thứ tự thời gian.
- [\[Loạt bài kỹ thuật redstone\] Bảo vệ bản lưu](/tutorials/java/sd-backup): quy trình sao lưu, Ledger và sao lưu ngoài trạm.
- [\[Loạt bài kỹ thuật redstone\] Tối ưu cấu hình](/tutorials/java/sd-config): máy chủ kỹ thuật redstone rốt cuộc có những công tắc nào động được.
- [\[Loạt bài kỹ thuật redstone\] Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine): kiểm soát rủi ro của máy nuốt thế giới và update suppression.
- [\[Loạt bài kỹ thuật redstone\] Vì sao không khuyến nghị chống gian lận](/tutorials/java/sd-anticheat): vì sao máy chủ kỹ thuật redstone không nên cài chống gian lận.

## Hai, chọn theo phần cứng: đây là điểm dễ chọn sai nhất

**Luồng chính của Minecraft là đơn luồng.** Thực thể, chunk, redstone, logic plugin gần như đều dồn lên **một nhân** —— nên nhiều nhân không có nghĩa là nhanh, **xung nhịp đơn nhân mới là then chốt**.

| Máy của bạn | Khuyến nghị | Lý do |
| --- | --- | --- |
| **Hiệu năng đơn nhân mạnh** (4~8 nhân, xung nhịp 3.5GHz+) | **Paper / Purpur / Leaf** | Các lõi này đã làm hết mức tối ưu đơn luồng có thể, đơn nhân càng mạnh lợi ích càng lớn |
| **Nhiều nhân nhưng xung nhịp thấp** (16 nhân+, <2.5GHz) | **Folia** | Đơn nhân là điểm yếu, chạy Paper sẽ lãng phí phần lớn số nhân; Folia tận dụng được hết đa nhân |
| Không chắc, muốn nhàn | **Paper** | Ổn định nhất, nhiều tài liệu nhất, tương thích plugin tốt nhất |

### Lõi đa nhân Folia là gì

Folia là một nhánh chính thức của Paper, thêm cho máy chủ **đa luồng theo vùng (regionised multithreading)**: chia thế giới thành nhiều vùng, các vùng **chạy tick song song**, nhờ đó thực sự dùng được đa nhân.

Cái giá cũng rõ ràng:

- **Tương thích plugin kém**: rất nhiều plugin chưa thích ứng Folia, cài vào có thể báo lỗi ngay hoặc chạy bất thường.
- **Hành vi khác Paper**: tương tác giữa các vùng (redstone, dịch chuyển, thực thể qua vùng) có quy tắc khác.
- Phù hợp tình huống **người chơi phân tán, máy đơn nhân yếu nhưng nhiều nhân**, không phù hợp kỹ thuật redstone.

### Đơn nhân mạnh thì chọn họ Paper

Paper và các hạ nguồn (Purpur, Leaf, Leaves) đều đi con đường **tối ưu đơn luồng**: tối ưu luồng chính triệt để, xung nhịp đơn nhân càng cao càng mượt.

- **Paper**: lựa chọn mốc chuẩn, hệ sinh thái lớn nhất.
- **Purpur**: Paper + rất nhiều công tắc cách chơi cấu hình được, phù hợp người muốn tinh chỉnh.
- **Leaf**: nhánh Paper, **tìm cân bằng giữa hiệu năng, cơ chế bản gốc và độ ổn định** (định vị chính thức).
- **Leaves**: nhánh Paper, nhưng hướng ngược lại —— **chuyên sửa các đặc tính bản gốc bị làm hỏng**, xem mục sau.

## Ba, kỹ thuật redstone (hướng kỹ thuật) chọn thế nào

Kỹ thuật redstone chỉ máy redstone, tháp sinh quái, nhân bản TNT, hành vi khối và thực thể chính xác. Nó **yêu cầu hành vi bản gốc nhất quán**, nên:

- **Fabric** đúng —— không cài mod tối ưu thì gần bản gốc nhất, là lựa chọn chính của máy chủ kỹ thuật redstone.
- **Leaves** đúng —— nhánh Paper, nhưng chuyên **sửa các đặc tính bản gốc bị Paper làm hỏng** (định vị chính thức: *repairing broken vanilla properties*), nên vừa giữ được hệ sinh thái Paper vừa khôi phục hành vi bản gốc.

:::warn Kỹ thuật redstone đừng dùng Paper / Purpur
Họ Paper đã thay đổi một phần hành vi bản gốc vì hiệu năng (thứ tự thời gian redstone, nhân bản TNT, quy tắc sinh quái và thực thể…), **sẽ làm máy dựa vào các cơ chế này mất tác dụng**. Máy chủ kỹ thuật redstone hãy dùng **Fabric** hoặc **Leaves**.
:::

## Bốn, tra nhanh lõi thường dùng

| Lõi | Loại | Một câu | Phù hợp |
| --- | --- | --- | --- |
| **Vanilla** | Bản gốc | Máy chủ chính thức, không tối ưu | Trải nghiệm thuần, kiểm chứng hành vi bản gốc |
| **Spigot** | Plugin | Nguồn của Paper, tương thích plugin cũ | Máy chủ cũ ưu tiên tương thích |
| **Paper** | Plugin | Hệ sinh thái lớn nhất, mốc chuẩn ổn định nhất | Phần lớn máy chủ sinh tồn, máy chủ plugin |
| **Purpur** | Plugin | Paper + vô số công tắc cách chơi | Muốn tinh chỉnh cách chơi |
| **Leaf** | Plugin | Cân bằng hiệu năng và cơ chế bản gốc | Muốn Paper mà ít thay đổi hành vi bản gốc |
| **Leaves** | Plugin | Sửa đặc tính bản gốc | **Kỹ thuật redstone + muốn dùng plugin** |
| **Folia** | Đa nhân | Đa luồng theo vùng, tận dụng hết đa nhân | **Nhiều nhân, xung nhịp thấp**, chấp nhận giới hạn plugin |
| **Fabric** | Mod | Nhẹ, gần bản gốc | **Kỹ thuật redstone**, modpack nhẹ |
| **Forge** | Mod | Lâu đời, nhiều modpack nhất | Modpack kỹ thuật quy mô lớn |
| **NeoForge** | Mod | Nhánh cộng đồng của Forge, lực lượng chính phiên bản mới | Máy chủ mod 1.20.2+ |
| **Velocity** | Proxy | Chỉ chuyển tiếp, không chạy thế giới | Kết nối nhiều máy chủ con, đa máy chủ |

> Các mô tả thuộc nhóm "hiệu năng" trong bảng là tham chiếu tương đối, biểu hiện thực tế phụ thuộc phiên bản, số plugin/mod và phần cứng.

## Năm, bảng đối chiếu đầy đủ

Trên đây là tra nhanh, đối chiếu từng mục (hiệu năng, plugin, mod, độ khó, tình huống phù hợp) xem ở:

**→ [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)**

## Sáu, bước tiếp theo

Chọn xong lõi, tải jar máy chủ phiên bản tương ứng từ kênh chính thức của lõi đó, đặt vào thư mục `survival` đã tạo ở "Chuẩn bị môi trường", rồi **viết script khởi động để chạy nó**:

> **Trang này đã tập hợp lối tải các lõi này** —— mở **[Tải tài nguyên · Lõi máy chủ](/downloads/core)**, trong đó liệt kê toàn bộ bản dựng theo tên lõi (Vanilla, Paper, Folia, Velocity, Purpur, Leaf, Leaves, Fabric, NeoForge, Forge, Spigot, BungeeCord và BDS của Bedrock), bấm nút "Tải" và đăng nhập theo hướng dẫn là được. Nơi đây tập hợp liên kết tải từ nguồn chính thức và cộng đồng, **trang này không lưu trữ tệp nào**.

**→ [Khởi động máy chủ](/tutorials/java/start)** —— script khởi động, đồng ý EULA, phán đoán khởi động thành công, tự động khởi động lại

- **Paper / Purpur / Leaf / Leaves / Folia**: lấy jar ở trang tải chính thức
- **Fabric / Forge / NeoForge**: cài trình cài đặt máy chủ của trình tải tương ứng trước (Forge / NeoForge phiên bản mới sẽ **tự sinh script khởi động**)
- **Bản gốc Vanilla**: jar máy chủ chính thức

Trước khi khởi động xác nhận lại một lần: **phiên bản Java khớp phiên bản MC mục tiêu**, **cổng `25565` đã được mở**.

## Tài nguyên liên quan

Trang này tập hợp ba loại tài nguyên, đều là **liên kết tải** từ nguồn chính thức và cộng đồng (không lưu trữ tệp nào), bấm nút "Tải" và đăng nhập theo hướng dẫn là được:

- **[Tải tài nguyên · Lõi máy chủ](/downloads/core)** —— toàn bộ bản dựng của 13 lõi (Vanilla, Paper, Folia, Velocity, Purpur, Leaf, Leaves, Fabric, NeoForge, Forge, Spigot, BungeeCord, BDS của Bedrock).
- **[Tải tài nguyên · Mod](/downloads/mods)** —— mục mod trên Modrinth, lọc được theo trình tải (Fabric / Forge / NeoForge / Quilt) và phiên bản trò chơi; con đường máy chủ mod xem [Bắt đầu đầy đủ với máy chủ mod](/tutorials/java/modded).
- **[Tải tài nguyên · Plugin](/downloads/plugins)** —— plugin máy chủ, hỗ trợ Java Edition (lọc Paper / Spigot / Folia / Purpur / Bukkit) và Bedrock Edition, còn có plugin MCDR; con đường máy chủ plugin xem [Nhập môn plugin](/tutorials/java/plugins).
