---
title: Chọn lõi Bedrock Edition
slug: cores
cat: bedrock
level: 2
order: 3
minutes: 12
tags: [Bedrock Edition, bds, nukkit, powernukkitx, pocketmine, lõi]
updated: 2026-10-04
draft: false
---

Hệ sinh thái lõi của Bedrock Edition nhỏ hơn Java Edition nhiều, chính có bốn cái:

| Lõi | Ngôn ngữ | Plugin | Một câu |
| --- | --- | --- | --- |
| **BDS** | C++ | Cần loader cộng đồng | Máy chủ chính thức, **tương thích tốt nhất** |
| **Nukkit (NK)** | Java | Gốc | Nhẹ, giống Bukkit của Bedrock Edition |
| **PowerNukkitX (PNX)** | Java | Gốc | Người kế thừa hiện đại của Nukkit, **tối ưu đa nhân** |
| **PocketMine-MP (PMMP)** | PHP | Gốc | Hệ sinh thái plugin khổng lồ, viết bằng PHP |

> Bảng đối chiếu từng mục đầy đủ (hiệu năng, plugin, hệ sinh thái, tình huống áp dụng) xem mục "So sánh lõi Bedrock Edition" trong **[So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E5%9F%BA%E5%B2%A9%E7%89%88%E6%A0%B8%E5%BF%83%E5%AF%B9%E6%AF%94)**.

## Một, BDS (chính thức)

Máy chủ Bedrock Edition chính thức do trang chủ Minecraft cung cấp, cùng trang với Vanilla của Java Edition.

**Ưu điểm**

- **Chính thức hỗ trợ**: theo cập nhật chính thức, tương thích với client bản mới nhất tốt nhất;
- **Ổn định**: sản phẩm chính thức, chạy đáng tin;
- **Sử dụng tài nguyên**: tối ưu cho Bedrock Edition, dùng tài nguyên máy chủ hiệu quả;
- **Cập nhật an toàn**: chính thức sửa vấn đề an toàn thường xuyên hơn.

**Nhược điểm**

- **Không hỗ trợ plugin**: bản thân máy chủ chính thức không có hệ thống plugin, muốn cài plugin chỉ có thể nhờ **loader plugin cộng đồng**;
- **Nút thắt đơn luồng**: **tính toán sinh vật chạy trên một luồng**, nên độ mượt **chủ yếu phụ thuộc hiệu năng đơn nhân CPU**; bản đồ càng lớn càng lag, tổng thể không bằng máy chủ Java hỗ trợ đa nhân;
- **Thiếu chức năng cao cấp**: sinh thế giới tự định nghĩa, quản lý quyền cao cấp… thường phải bên thứ ba mới làm được;
- **Bộ nhớ tăng chậm**: mức chiếm từ từ tăng, nặng thì như rò rỉ bộ nhớ. Chú ý **cưỡng chế dọn bộ nhớ sẽ làm thanh tiến trình khi người chơi tải resource pack/Addon bị kẹt**, chỉ khởi động lại máy chủ mới giải quyết được.

**Phù hợp**: máy chủ cần hỗ trợ chính thức và tương thích, không cần tùy biến phức tạp. **Lựa chọn đầu tiên cho máy chủ sinh tồn**.

## Hai, Nukkit (NK)

"Bukkit" của Bedrock Edition —— viết bằng **Java**, hệ sinh thái và tư duy phát triển đều rất giống phía plugin của Java Edition.

**Ưu điểm**: nhẹ (yêu cầu tài nguyên thấp), hiệu năng khá, **có hệ thống plugin gốc**, đa nền tảng (Windows/Linux/macOS), dễ làm quen.

**Nhược điểm**: **cập nhật chậm** (có thể không theo kịp bản mới nhất và đặc tính mới nhất), hệ sinh thái plugin nhỏ hơn Spigot/Paper, tối ưu đa nhân chưa đủ, tài liệu chất lượng cao ít, dự án mã nguồn mở đôi khi có vấn đề ổn định.

**Phù hợp**: người mới và máy chủ nhỏ. **Chú ý**: Nukkit gốc đã không còn hoạt động, thực tế khuyến nghị nhánh hiện đại của nó hơn (xem dưới).

## Ba, PowerNukkitX (PNX)

**Người kế thừa hiện đại** của Nukkit, hiện là lực lượng chính trong các lõi bên thứ ba của Bedrock Edition.

**Ưu điểm**

- **Hỗ trợ giao thức Bedrock Edition mới nhất**, theo kịp phiên bản mới;
- **Tối ưu đa nhân**: đây là ưu thế lớn nhất của nó so với BDS và Nukkit cũ;
- **Chiều cao thế giới 384 ô**;
- Tích hợp bộ sinh địa hình **Terra**, làm được địa hình phong phú;
- **Hoàn toàn mã nguồn mở, API mở**, hỗ trợ viết plugin bằng ngôn ngữ JVM như Java / Kotlin / Scala / Python / JavaScript / Lua;
- **Tương thích lượng lớn plugin của hệ sinh thái Nukkit**.

**Nhược điểm**: cường độ phát triển bị ảnh hưởng bởi biến động của đội Nukkit gốc; hệ sinh thái vẫn nhỏ hơn máy chủ Java chủ lưu; plugin nhiều, người mới học tốn công.

**Phù hợp**: chủ máy chủ cần **hiệu năng cao + tùy biến cao**.

## Bốn, PocketMine-MP (PMMP)

Máy chủ Bedrock Edition viết bằng **PHP**, hệ sinh thái plugin khổng lồ nhất.

**Ưu điểm**: hệ sinh thái plugin khổng lồ, đa nền tảng, **ngưỡng PHP thấp** (biết PHP là viết được plugin), cộng đồng sôi động, mức tùy biến cao.

**Nhược điểm**: **có nút thắt hiệu năng khi đông người chơi** (quản lý bộ nhớ và hiệu quả CPU); cập nhật chậm; cài nhiều plugin thì độ ổn định giảm; PHP là ngôn ngữ thông dịch, **tiêu tài nguyên rõ hơn**; cấu hình và quản lý plugin cần học.

**Phù hợp**: chủ máy chủ coi trọng **chức năng plugin và tùy biến**, và chấp nhận nhượng bộ hiệu năng nhất định.

## Năm, Chọn thế nào

```
Cần ổn định + tương thích chính thức + sinh tồn bản gốc
   → BDS (cần plugin thì lắp loader cộng đồng, xem "Máy chủ BDS")

Cần hiệu năng cao + đa nhân + tùy biến cao
   → PowerNukkitX

Cần hệ sinh thái plugin khổng lồ nhất, biết PHP
   → PocketMine-MP

Muốn bắt đầu từ đơn giản, chơi hệ sinh thái Nukkit
   → Họ Nukkit (nhưng ưu tiên nhánh đang hoạt động)
```

:::tip Kiểm chứng ở quy mô nhỏ nhất trước
Chốt lõi xong, **chạy thông ở quy mô nhỏ trước** (vài người, ít plugin) rồi mới mở ra ngoài. Bẫy tương thích của lõi Bedrock Edition nhiều hơn Java Edition, đừng đưa cả bộ plugin lên ngay từ đầu.
:::

## Bước tiếp theo

Xem loại máy chủ và chiến lược phiên bản trước, rồi mới động tay: xem [Các loại máy chủ Bedrock Edition](/tutorials/bedrock/type) và [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol).

---

> Một phần nội dung bài này tham khảo từ mục Bedrock Edition của [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.

## Tài nguyên liên quan

- [Tải tài nguyên · Lõi Bedrock Edition](/downloads/core) —— tập hợp bản build từ nguồn chính thức và cộng đồng, bấm vào và làm theo hướng dẫn đăng nhập là tải được.
