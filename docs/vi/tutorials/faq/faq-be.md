---
title: "[BE] Câu hỏi thường gặp"
slug: faq-be
cat: faq
level: 1
order: 2
minutes: 10
tags: [Bedrock Edition, câu hỏi thường gặp, kiểm tra, giao thức, bds]
updated: 2026-10-04
draft: false
---

Những cái bẫy khi mở máy chủ Bedrock Edition **rất khác** Java Edition —— khác biệt lớn nhất là **phiên bản/giao thức**. Dưới đây tổng hợp theo hiện tượng, có ghi chương mục nguồn.

## Một, Người chơi không kết nối được (phổ biến nhất)

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Báo "**mọi người chơi đều nên cập nhật lên phiên bản mới nhất**" | **Phiên bản giao thức không khớp** | Giao thức máy chủ phải khớp với client: cập nhật máy chủ lên bản mới nhất, hoặc để người chơi ghim phiên bản | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| Hôm qua còn được, hôm nay người chơi đều không vào được | Client người chơi **tự động cập nhật** đổi giao thức | Theo kịp cập nhật máy chủ (cửa hàng ứng dụng mặc định tự động cập nhật, không thể trông chờ người chơi hạ phiên bản) | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| **Người chơi iOS không vào được** | iOS **chỉ cài được bản mới nhất trên cửa hàng**, không cài được phiên bản chỉ định | Trừ khi bỏ nhóm người chơi iOS, nếu không chỉ có thể để máy chủ theo kịp bản mới nhất | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| Kiểm tra cổng đã qua nhưng vẫn không kết nối được | **Số giao thức** của client và máy chủ khác nhau | Đối chiếu số giao thức (lấy bảng phiên bản của Minecraft Wiki làm chuẩn) | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |

## Hai, Cổng và mạng

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Máy chủ rõ ràng đang mở, không ai vào được | **Bedrock Edition dùng UDP** | Mở **UDP 19132** (IPv6 là 19133); nhóm bảo mật và tường lửa hệ thống **cả hai chỗ đều phải mở** | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |
| Nền tảng máy chơi game (Xbox / PS / Switch) không vào được | Chúng **không thể nhập IP trực tiếp để vào** | Chỉ có thể kết nối qua **DNS tùy chỉnh** hoặc **mạng LAN** | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |
| Muốn dùng xuyên thấu mạng nội bộ nhưng không kết nối được | Đa số dịch vụ xuyên thấu mặc định chỉ hỗ trợ TCP | Chọn phương án xuyên thấu hỗ trợ **UDP** | [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) |

## Ba, Liên quan đến BDS

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| BDS **không cài được plugin** | Máy chủ chính thức **không có hệ thống plugin** | Dùng loader cộng đồng (LeviLamina / EndStone / BDSX) | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Đã cài loader mà không khởi động lên | **Loader gắn chặt với phiên bản game** | Trước tiên xác nhận phiên bản máy chủ nằm trong danh sách loader hỗ trợ | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Bản đồ càng lớn càng lag | BDS **tính toán sinh vật đơn luồng** | Độ mượt phụ thuộc **hiệu năng đơn nhân**; chỉ có thể đổi máy đơn nhân mạnh hơn hoặc thu nhỏ quy mô bản đồ | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Bộ nhớ cứ tăng chậm mãi | Vấn đề đã biết của BDS (kiểu rò rỉ bộ nhớ) | **Đừng cưỡng chế dọn bộ nhớ** → sẽ khiến **thanh tiến trình kẹt** khi người chơi tải gói tài nguyên/Addon, chỉ có thể khởi động lại máy chủ | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Đổi tên `bedrock_server.exe` xong khởi động thất bại | Đường dẫn trong script khởi động/bảng điều khiển chưa đổi theo | Đổi về tên cũ, hoặc sửa đồng bộ đường dẫn khởi động | [Máy chủ BDS](/tutorials/bedrock/bds) |

## Bốn, Chọn lõi

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Dùng Nukkit mà không theo kịp phiên bản mới | Nukkit bản gốc **đã ngừng hoạt động** | Đổi sang **PowerNukkitX** (hỗ trợ giao thức mới nhất + tối ưu đa nhân) | [Lõi bên thứ ba](/tutorials/bedrock/third-party) |
| Người chơi đông là lag (PMMP) | Lõi PHP **có điểm nghẽn dưới tải cao** | Giảm plugin, nâng cấp phần cứng, hoặc đổi sang PowerNukkitX / BDS | [Lõi bên thứ ba](/tutorials/bedrock/third-party) |
| Không biết nên chọn lõi nào | — | Sinh tồn bản gốc chọn **BDS**; cần hiệu năng + tùy biến chọn **PNX**; cần nhiều plugin nhất và biết PHP chọn **PMMP** | [Chọn lõi Bedrock Edition](/tutorials/bedrock/cores) |
| Nhiều máy chủ con muốn thống nhất cổng vào | Cần **phía proxy** | Dùng **WaterDogPE** (tương ứng Velocity của Java Edition) | [Lõi bên thứ ba](/tutorials/bedrock/third-party) |

## Năm, Bản lưu và sao lưu

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Đổi lõi xong không đọc được bản lưu | Độ tương thích bản lưu của lõi bên thứ ba kém hơn chính thức | **Sao lưu trước khi nâng cấp/đổi lõi**; cố gắng nâng cấp trong cùng lõi | [Lõi bên thứ ba](/tutorials/bedrock/third-party) |
| Bản sao lưu không đầy đủ | Chỉ chép một phần tệp | Bản lưu của BDS nằm toàn bộ trong **`worlds/`**, sao lưu cả thư mục | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Tệp sao lưu rất lớn và ngày càng nhiều | Chưa có chính sách lưu giữ | Giữ vài ngày bản hằng ngày + vài tuần bản hằng tuần, và dọn gói cũ | [Sao lưu và khôi phục](/tutorials/java/backup) |
| Nhà cung cấp bỏ trốn mất hết dữ liệu | Dữ liệu chỉ ở một máy | **Ít nhất định kỳ tải bản sao lưu về nơi khác** | [Sao lưu và khôi phục](/tutorials/java/backup) |

## Sáu, Người chơi và vận hành

| Hiện tượng | Xử lý | Nguồn |
| --- | --- | --- |
| Người chơi nhỏ tuổi nhiều, xung đột nhiều | Viết quy tắc ngắn gọn, đưa danh sách trắng/duyệt trước lên trước, có người trực cùng khung giờ | [[BE] Quản lý vận hành](/tutorials/ops/management-be) |
| Người chơi không biết cài client (appx/apk) | Viết trước **hướng dẫn có hình theo từng nền tảng** | [[BE] Quản lý vận hành](/tutorials/ops/management-be) |
| Người chơi Android nói rất lag | Từ một phiên bản nào đó phía Android có lag nghiêm trọng, cộng đồng lâu dài không có cách giải | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| Người chơi nói không dùng được shader | Từ 1.18.30 client triển khai **RenderDragon**, shader truyền thống không dùng được | [Giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |

> Liên quan Java Edition xem [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java); đối chiếu lõi đầy đủ xem [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7).
