---
title: So sánh lõi máy chủ
slug: compare
mc: [1.21.x, 1.20.4]
tags: [lõi, so sánh, paper, purpur, folia, leaves, leaf, fabric, forge, velocity, bds]
updated: 2026-10-04
---

Đối chiếu hiệu năng, hệ sinh thái và tình huống phù hợp của các lõi máy chủ khác nhau, chọn xong rồi xem hướng dẫn tương ứng.

> Cột "Hiệu năng" trong bảng là tham chiếu tương đối (biểu hiện thông thường trên cùng phần cứng, cùng số người chơi), không phải chỉ số tuyệt đối; biểu hiện thực tế phụ thuộc phiên bản, số plugin/mod và phần cứng.

## Đối chiếu lõi máy chủ

| Lõi | Loại | Hiệu năng | Plugin | Mod | Độ khó | Tình huống phù hợp |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla | Bản gốc chính thức | Mốc chuẩn | Không hỗ trợ | Không hỗ trợ | Nhập môn | Cách chơi nguyên bản, kiểm chứng hành vi bản gốc |
| Spigot | Nhánh Bukkit | Trung bình | Hệ sinh thái lớn (nguồn của Paper) | Không hỗ trợ | Nhập môn | Máy chủ ưu tiên tương thích plugin cũ |
| Paper | Nhánh Spigot (họ Bukkit) | Cao (chunk bất đồng bộ, tối ưu thực thể) | Hệ sinh thái lớn nhất | Không hỗ trợ | Nhập môn | Lựa chọn hàng đầu cho máy chủ sinh tồn, máy chủ plugin |
| Purpur | Nhánh Paper | Cao (gồm toàn bộ tối ưu của Paper) | Tương thích plugin Paper | Không hỗ trợ | Nâng cao | Cần nhiều công tắc điều chỉnh cách chơi |
| Leaf | Nhánh Paper | Cao | Tương thích plugin Paper | Không hỗ trợ | Nâng cao | Muốn cân bằng hiệu năng và cơ chế bản gốc |
| Leaves | Nhánh Paper | Cao | Tương thích plugin Paper | Không hỗ trợ | Nâng cao | **Kỹ thuật redstone** (khôi phục đặc tính bản gốc) + muốn dùng plugin |
| Folia | Nhánh Paper (đa nhân) | **Song song đa nhân** (đa luồng theo vùng) | Tương thích kém, phần lớn plugin chưa thích ứng | Không hỗ trợ | Nâng cao | Máy có **nhiều nhân, xung nhịp thấp** |
| Fabric | Trình tải mod nhẹ | Cao (gần bản gốc) | Cần cài cầu nối plugin máy chủ | Hệ sinh thái sôi động | Nâng cao | **Kỹ thuật redstone**, modpack nhẹ |
| Forge | Trình tải mod truyền thống | Trung bình (càng nhiều mod càng tốn hiệu năng) | Không hỗ trợ | Nhiều modpack lâu đời nhất | Nâng cao | Modpack kỹ thuật quy mô lớn |
| NeoForge | Nhánh cộng đồng của Forge | Trung bình | Không hỗ trợ | Lực lượng chính của phiên bản mới | Nâng cao | Máy chủ mod 1.20.2+ |
| Velocity | Proxy | Rất cao (chỉ chuyển tiếp, không chạy thế giới) | Plugin proxy | Không hỗ trợ | Nâng cao | Kết nối nhiều máy chủ con, đa máy chủ |
| BDS | Máy chủ chính thức của Bedrock | Trung bình | Không hỗ trợ (có thể thêm add-on) | Không hỗ trợ | Nhập môn | Người chơi Bedrock kết nối |

> Bản gốc và máy chủ plugin đều không tải được mod: bản gốc chỉ hỗ trợ gói dữ liệu (Data Pack), máy chủ plugin chỉ hỗ trợ plugin.

### Định vị chính thức của các lõi mới

| Lõi | Định vị chính thức (nguyên văn) |
| --- | --- |
| Folia | *Fork of Paper which adds regionised multithreading to the dedicated server.* |
| Leaves | *Fork of Paper aimed at repairing broken vanilla properties.* |
| Leaf | *A Paper fork focused on finding the balance between performance, vanilla mechanics, and stability.* |

## Chọn như thế nào

### Chọn theo phần cứng (điểm dễ chọn sai nhất)

Luồng chính của Minecraft là **đơn luồng**: thực thể, chunk, redstone và logic plugin đều dồn lên **một nhân**, nên **nhiều nhân không có nghĩa là nhanh**.

| Máy của bạn | Khuyến nghị | Lý do |
| --- | --- | --- |
| **Hiệu năng đơn nhân mạnh** (4~8 nhân, 3.5GHz+) | **Paper / Purpur / Leaf** | Tối ưu đơn luồng tốt nhất, đơn nhân càng mạnh lợi ích càng lớn |
| **Nhiều nhân nhưng xung nhịp thấp** (16 nhân+, <2.5GHz) | **Folia** | Đơn nhân là điểm yếu, chạy Paper sẽ lãng phí nhân; Folia dùng đa luồng theo vùng để tận dụng hết đa nhân |
| Không chắc | **Paper** | Ổn định nhất, hệ sinh thái lớn nhất, nhiều tài liệu nhất |

> Cái giá của Folia: **tương thích plugin kém** (nhiều plugin chưa thích ứng), và hành vi tương tác giữa các vùng khác Paper, **không phù hợp với kỹ thuật redstone**.

### Chọn theo cách chơi

- **Mở máy chủ lần đầu**: dùng thẳng Paper —— hệ sinh thái lớn nhất, tài liệu đầy đủ nhất, hiệu năng đủ.
- **Muốn tinh chỉnh cách chơi chi tiết**: Purpur (Paper + vô số công tắc).
- **Kỹ thuật redstone (hướng kỹ thuật)**: **Fabric** hoặc **Leaves** —— cả hai đều bảo đảm hành vi bản gốc nhất quán; **đừng dùng Paper / Purpur**, chúng đã thay đổi một phần hành vi bản gốc vì hiệu năng, sẽ làm máy redstone mất tác dụng.
- **Cài mod**: Fabric (nhẹ) hoặc NeoForge (lực lượng chính từ 1.20.2+), Forge (modpack lâu đời).
- **Kết nối nhiều máy chủ**: thêm proxy Velocity.

## So sánh lõi máy chủ Bedrock

Hệ sinh thái lõi máy chủ Bedrock nhỏ hơn Java Edition rất nhiều, phổ biến là bốn cái dưới đây. **Khả năng tương thích phiên bản của Bedrock nghiêm ngặt hơn Java Edition rất nhiều**: giao thức client phải trùng với giao thức máy chủ mới vào được (xem "Phiên bản giao thức và lựa chọn phiên bản").

| Lõi | Ngôn ngữ | Plugin | Đa nhân | Theo kịp giao thức | Hệ sinh thái plugin | Độ khó | Tình huống phù hợp |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **BDS** | C++ | Cần trình tải của cộng đồng | Đơn luồng | Chính thức là mới nhất | Chính thức ổn định nhất | Nhập môn | Sinh tồn nguyên bản, cần tương thích chính thức |
| **Nukkit** | Java | Nguyên bản | Trung bình | Chậm | Nhỏ hơn | Nhập môn | Học tập, máy chủ nhỏ (bản gốc đã ngừng hoạt động) |
| **PowerNukkitX** | Java | Nguyên bản | **Tối ưu đa nhân** | Hỗ trợ mới nhất | Trung bình (tương thích plugin Nukkit) | Nâng cao | Hiệu năng cao + tùy biến sâu |
| **PocketMine-MP** | PHP | Nguyên bản | Trung bình (tải cao có điểm nghẽn) | Chậm | **Lớn nhất** (plugin PHP nhiều nhất) | Nâng cao | Ưu tiên cách chơi plugin, biết PHP |

### Trình tải plugin cho Bedrock (dành riêng cho BDS)

BDS chính thức **bản thân không hỗ trợ plugin**, phải nhờ trình tải của cộng đồng bổ sung:

| Trình tải | Viết plugin bằng gì | Mức khuyến nghị | Phiên bản hỗ trợ |
| --- | --- | --- | --- |
| **LeviLamina** (LLL / LLv3) | C++ (tiền thân LiteLoaderBDS) | **Rất khuyến nghị** (hệ sinh thái tốt nhất) | 1.20.61 – 1.21.3 |
| **EndStone** | C++ / Python (API kiểu Bukkit) | Khá khuyến nghị (hệ sinh thái rất ít, tiềm năng lớn) | 1.20.71 – 1.21.2 |
| **BDSX** | Node.js (Hook + gói mạng) | Khá khuyến nghị (duy trì từ 2019 đến nay) | 1.12 – mới nhất |

> Khác biệt giữa Bedrock và Java Edition xem ở [JAVA VS Bedrock](/wiki/editions); quy trình mở máy chủ Bedrock xem loạt tài liệu bắt đầu từ "Các loại máy chủ Bedrock".

## Bước tiếp theo

Chọn xong lõi, trước tiên xem hướng dẫn để chuẩn bị môi trường, rồi tải lõi tương ứng:

- **Chọn lõi máy chủ**: xem [Chọn lõi máy chủ](/tutorials/java/core) —— hướng dẫn đầy đủ chọn lõi theo phần cứng và cách chơi
- **Chuẩn bị môi trường**: xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment) —— cài đúng Java, mở cổng, tạo thư mục
