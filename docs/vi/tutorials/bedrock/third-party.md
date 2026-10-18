---
title: Lõi bên thứ ba (Nukkit / PNX / PMMP)
slug: third-party
cat: bedrock
level: 3
order: 5
minutes: 12
tags: [Bedrock Edition, nukkit, powernukkitx, pocketmine, php, lõi bên thứ ba]
updated: 2026-10-04
draft: false
---

BDS chính thức ổn định nhưng khó mở rộng. Muốn plugin, muốn đa nhân, muốn tùy biến thì phải dùng lõi bên thứ ba. Bài này trình bày rõ **đường vào** của ba lõi bên thứ ba phổ biến nhất.

## Một, Họ Nukkit

Nukkit là "Bukkit của Bedrock Edition": **viết bằng Java**, có hệ thống plugin gốc, cấu hình đơn giản. Nó sinh ra một loạt nhánh, khi dùng thực tế **ưu tiên nhánh đang hoạt động**:

| Nhánh | Mô tả |
| --- | --- |
| **Nukkit (bản gốc)** | Thượng nguồn sớm nhất, đã ngừng hoạt động, không khuyến nghị cho dự án mới |
| **PowerNukkitX (PNX)** | Nhánh chủ lực hiện đại, **hỗ trợ giao thức mới nhất + tối ưu đa nhân**, lựa chọn hàng đầu |
| **NukkitX** | Nhánh lịch sử |
| **NukkitMot** | Nhánh lịch sử |
| **PM1E** | Nhánh lịch sử liên quan đến PocketMine (cộng đồng còn tranh cãi về lịch sử của nó) |
| **PNX** | Tức viết tắt của PowerNukkitX |

**Chuẩn bị**: họ Nukkit là chương trình Java, **cần cài Java** (tương tự Java Edition, xem mục Java trong "Chuẩn bị môi trường (Windows và Linux)").

**Bắt đầu**: tải lõi jar → đặt vào thư mục → viết script khởi động (`java -jar 核心名.jar`) → lần chạy đầu sinh tệp cấu hình → cài plugin vào `plugins/`.

### Vì sao PowerNukkitX đáng chọn

- **Tối ưu đa nhân** —— đây là ưu thế lớn nhất của nó so với BDS, tính toán của BDS cơ bản dồn vào một nhân;
- **Hỗ trợ giao thức Bedrock Edition mới nhất**, không phải chờ lâu;
- **Chiều cao thế giới 384 khối**, tích hợp trình sinh địa hình **Terra**;
- **Hoàn toàn mã nguồn mở, API mở**, có thể viết plugin bằng Java / Kotlin / Scala / Python / JavaScript / Lua;
- **Tương thích với lượng lớn plugin của hệ sinh thái Nukkit**.

Cái giá: nhiều plugin, nhiều mục cấu hình, **đường cong học tập khá dốc với người mới**; nhịp phát triển chịu ảnh hưởng từ thay đổi của nhóm thượng nguồn.

## Hai, PocketMine-MP (PMMP)

Máy chủ Bedrock Edition viết bằng **PHP**, **hệ sinh thái plugin lớn nhất**.

**Chuẩn bị**: cần **môi trường chạy PHP** (không phải Java). Nên cài đúng phiên bản PHP theo tài liệu chính thức và cấu hình đầy đủ các extension liên quan.

**Bắt đầu**: tải PMMP (thường là tệp `.phar`) → khởi động bằng PHP (`php PocketMine-MP.phar`) → sinh cấu hình và thư mục → đặt plugin vào `plugins/`.

**Ưu điểm**: plugin cực nhiều, đa nền tảng, **biết PHP là viết được plugin**, cộng đồng sôi động, mức tùy biến cao.

**Nhược điểm**: **có điểm nghẽn hiệu năng dưới tải cao** (quản lý bộ nhớ và hiệu suất CPU); cập nhật chậm; cài nhiều plugin thì độ ổn định giảm; PHP là ngôn ngữ thông dịch nên **chiếm tài nguyên rõ rệt hơn**.

:::tip Chọn họ Nukkit hay PMMP?
- Bạn **quen Java**, muốn **hiệu năng tốt hơn** → **PowerNukkitX**
- Bạn **quen PHP**, muốn **nhiều plugin có sẵn nhất** → **PocketMine-MP**
- Không quen cả hai → chạy thông **BDS** trước, rồi mới tính đến bên thứ ba
:::

## Ba, Các máy chủ khác

Ngoài những cái trên, cộng đồng còn vài lõi ít phổ biến hoặc chuyên dụng:

| Lõi | Định vị |
| --- | --- |
| **Allay** | Máy chủ Bedrock Edition do cộng đồng phát triển |
| **Dragonfly** | Máy chủ Bedrock Edition viết bằng Go, thiên về hiệu năng |
| **MCPEServer** | Máy chủ Bedrock Edition thời kỳ đầu |
| **WaterDogPE** | **Phía proxy** (tương ứng Velocity / BungeeCord của Java Edition), dùng để nối nhiều máy chủ con |

> Lõi ít phổ biến thường **hệ sinh thái plugin và tài liệu rất mỏng**, gặp vấn đề khó tìm trợ giúp. Trừ khi có lý do rõ ràng, **không khuyến nghị người mới chọn**.

### WaterDogPE: chỉ cần khi có nhiều máy chủ con

Giống Java Edition, Bedrock Edition cũng có **phía proxy**: bản thân nó không chạy thế giới, chỉ chuyển tiếp người chơi đến máy chủ con phía sau. Phù hợp cấu trúc nhiều máy chủ kiểu "sảnh chờ + sinh tồn + minigame". **Máy chủ đơn không cần nó**, thêm một lớp là thêm một điểm lỗi.

## Bốn, Khuyến nghị chung

1. **Căn phiên bản**: lõi, giao thức, plugin cả ba phải căn khớp, Bedrock Edition khắt khe hơn Java Edition nhiều ở điểm này.
2. **Nhỏ trước lớn sau**: chạy thông một máy chủ tối thiểu khả dụng trước, rồi thêm plugin dần.
3. **Xem mức độ hoạt động**: ưu tiên lõi và plugin **vẫn còn cập nhật gần đây**, cái lâu không cập nhật gặp bản mới chắc chắn sụp.
4. **Sao lưu trước**: độ tương thích bản lưu của lõi bên thứ ba kém hơn chính thức, **nhất định sao lưu trước khi nâng cấp/đổi lõi** (xem "Sao lưu và khôi phục").

## Bước tiếp theo

Xem lại toàn bộ việc chọn: xem [Chọn lõi Bedrock Edition](/tutorials/bedrock/cores) và [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E5%9F%BA%E5%B2%A9%E7%89%88%E6%A0%B8%E5%BF%83%E5%AF%B9%E6%AF%94).

---

> Một phần nội dung bài này tham khảo từ mục Bedrock Edition của [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
