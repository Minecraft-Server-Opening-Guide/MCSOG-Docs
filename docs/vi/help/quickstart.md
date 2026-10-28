---
title: Bắt đầu nhanh
slug: quickstart
updated: 2026-10-05
---

## Trước tiên hãy xác định phiên bản của bạn

- **Java Edition**: phiên bản chính thức trên Windows / macOS / Linux, có nhiều lựa chọn lõi máy chủ nhất (Paper, Purpur, Fabric, Forge, Velocity).
- **Bedrock Edition**: phiên bản trên điện thoại, máy chơi game và Windows, máy chủ chính thức là BDS, giải pháp cộng đồng có Nukkit, PocketMine-MP.

Hai phiên bản có thể kết nối với nhau bằng Geyser + Floodgate, để người chơi bản Bedrock kết nối trực tiếp vào máy chủ Java Edition.

## Thứ tự đọc đề xuất
:::step Xác định môi trường chạy
Trước tiên xem "Mở máy chủ Java Edition → JDK và phiên bản tương ứng" để xác định phiên bản Java, rồi quyết định dùng bộ lõi máy chủ nào.
:::
:::step Triển khai máy chủ
Chạy thông lần khởi động đầu từ đầu theo "Triển khai máy chủ Paper trên Linux" hoặc "Triển khai máy chủ chính thức BDS".
:::
:::step Hoàn thành cấu hình cơ bản
Đọc "Giải thích chi tiết server.properties" và "Cổng, tường lửa và xuyên thấu NAT" để người chơi có thể kết nối vào.
:::
:::step Vận hành lâu dài
Cấu hình "Sao lưu và quay lui", và học cách dùng "Chẩn đoán TPS / MSPT" để xác định lag.
:::
:::note
Tải tài nguyên cần đăng nhập. Trang này chỉ tập hợp và chuyển hướng, bản quyền tài nguyên thuộc về tác giả gốc.
:::

## Lộ trình học tập

Phần trên trả lời "tìm ở đâu", phần dưới trả lời "đọc theo thứ tự nào". Trang này có hàng chục bài hướng dẫn, tiến theo từng giai đoạn mới không bị rối: trước hết hiểu các thuật ngữ, rồi quyết định mở loại máy chủ nào, sau đó chạy thông cục bộ, để người khác vào được, cài plugin, làm vận hành, cuối cùng mới bàn đến khai thác.

| Giai đoạn | Mục tiêu | Đọc các tài liệu này theo thứ tự | Sau khi đọc bạn nên làm được gì |
|---|---|---|---|
| Giai đoạn 0 | Hiểu thuật ngữ trước | [Bảng thuật ngữ](/tutorials/ops/glossary), [JAVA VS Bedrock](/wiki/editions) | Phân biệt được Java Edition và Bedrock Edition, hiểu các thuật ngữ xuất hiện trong các hướng dẫn sau |
| Giai đoạn 1 | Quyết định mở loại máy chủ nào | [Các loại máy chủ Bedrock](/tutorials/bedrock/type) hoặc [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol), [Chọn hệ điều hành](/tutorials/java/os), [Chọn lõi máy chủ](/tutorials/java/core) | Chọn được phiên bản, lõi và hệ điều hành, đồng thời biết nên mua máy cấu hình bao lớn |
| Giai đoạn 2 | Chạy được cục bộ | [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment), [Khởi động máy chủ](/tutorials/java/start), [Cấu trúc máy chủ](/tutorials/java/structure), [Cấu hình máy chủ](/tutorials/java/config), [Lệnh máy chủ thường dùng](/tutorials/java/commands) | Khởi động được máy chủ trên máy của mình, vào được máy chủ, tắt máy chủ đúng cách, hiểu thư mục và cấu hình máy chủ |
| Giai đoạn 3 | Để người khác vào được | [Triển khai tới môi trường truy cập được](/tutorials/java/deploy), [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) | Người chơi bên ngoài kết nối được bằng IP hoặc tên miền; khi cần cho cả người chơi Bedrock/điện thoại vào (kết nối đa nền tảng) |
| Giai đoạn 4 | Cài plugin và cách chơi | [Nhập môn plugin](/tutorials/java/plugins), [Cơ bản cấu hình plugin](/tutorials/java/plugin-config), [Plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps), [Quản lý plugin và loại bỏ lỗi](/tutorials/java/plugin-manage) | Biết chọn plugin, cài plugin phụ thuộc, sửa cấu hình, khi plugin có vấn đề xác định được là cái nào |
| Giai đoạn 5 | Làm cho nó ổn định | [Sao lưu và khôi phục](/tutorials/java/backup), [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup), [Cập nhật và bảo trì máy chủ, plugin, MCDR](/tutorials/ops/updates), [Giám sát và cảnh báo](/tutorials/ops/monitoring) | Có bản sao lưu đã kiểm chứng khôi phục được, biết cách quay lui trước khi cập nhật, nhận được nhắc nhở trước khi máy chủ có sự cố |
| Giai đoạn 6 | Khi gặp sự cố | [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java), [Lỗi thường gặp và chẩn đoán sập trên Java Edition](/tutorials/faq/errors), [Lag do thực thể và vật phẩm rơi tích tụ](/tutorials/faq/entity-lag), [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark), [Chẩn đoán sự cố vận hành máy chủ Bedrock](/tutorials/faq/bedrock-issues) | Thấy lỗi biết xem ở đâu trước; phân biệt được lag do cấu hình, plugin hay do cách chơi |
| Giai đoạn 7 | Bảo mật và vận hành | [Cơ bản bảo mật mạng](/tutorials/ops/network-security), [Gia cố bảo mật hệ thống](/tutorials/ops/system-security), [Các kiểu tấn công mạng phổ biến và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) | Chỉ mở cổng cần thiết, không chạy máy chủ bằng root, khi bị tấn công biết làm gì trước |
| Giai đoạn 8 | Khai thác | [[JAVA] Quản lý vận hành](/tutorials/ops/management-java), [Quảng bá và thu hút người chơi / Vận hành cộng đồng](/tutorials/ops/promotion) | Có quy định, quản lý và ý tưởng quảng bá cơ bản, biết máy chủ giữ chân người chơi bằng gì |

Giai đoạn 0 đến giai đoạn 3 là "mở được máy chủ", giai đoạn 4 đến giai đoạn 5 là "mở được lâu dài", giai đoạn 6 đến giai đoạn 8 là "có sự cố không hoảng, có người đến chơi". Không nhất thiết phải theo đúng thứ tự, nhưng **đừng bỏ qua giai đoạn 0 và giai đoạn 5**.

### Ba cái bẫy dễ vấp nhất

1. **Không sao lưu trước khi cập nhật**: sao lưu trước khi cập nhật lõi, plugin hoặc MCDR, và xác nhận bản sao lưu đó **thực sự khôi phục được**. Xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Cập nhật và bảo trì máy chủ, plugin, MCDR](/tutorials/ops/updates).
2. **Công khai địa chỉ khi chưa cấu hình danh sách trắng và xác thực bản quyền**: khi `online-mode` và danh sách trắng chưa xong đã phát IP ra ngoài, tức là trao máy chủ cho người lạ. Xem [Cấu hình máy chủ](/tutorials/java/config) và [Cơ bản bảo mật mạng](/tutorials/ops/network-security).
3. **Nâng cấp thế giới ngay khi chưa thử lõi mới**: một khi thế giới đã được mở bằng phiên bản mới, rất khó quay về phiên bản cũ. Hãy thử trên bản sao trước, rồi mới động vào bản lưu chính thức. Xem [Cập nhật và bảo trì máy chủ, plugin, MCDR](/tutorials/ops/updates) và [Lỗi thường gặp và chẩn đoán sập trên Java Edition](/tutorials/faq/errors).

### Chỉ muốn mở máy chủ Bedrock?

Có thể bỏ qua cả loạt hướng dẫn plugin của Java Edition, đi theo lối này là được:

1. [Các loại máy chủ Bedrock](/tutorials/bedrock/type) — trước hết hiểu rõ khác biệt giữa BDS và lõi bên thứ ba.
2. [Chọn lõi máy chủ Bedrock](/tutorials/bedrock/cores) — quyết định dùng lõi nào.
3. [Máy chủ BDS](/tutorials/bedrock/bds) hoặc [Bắt đầu với lõi bên thứ ba cho Bedrock](/tutorials/bedrock/third-party-setup) — triển khai theo lõi bạn chọn.
4. [Triển khai tới môi trường truy cập được](/tutorials/java/deploy) — để mạng ngoài kết nối được (phần mạng là dùng chung).
5. [Chẩn đoán sự cố vận hành máy chủ Bedrock](/tutorials/faq/bedrock-issues), [[BE] Câu hỏi thường gặp](/tutorials/faq/faq-be) — có sự cố xem hai bài này trước.
6. [Sao lưu và khôi phục](/tutorials/java/backup) — dù là phiên bản nào, sao lưu đều là bắt buộc.

## Lối vào thường dùng

| Muốn làm gì | Đi đâu |
|---|---|
| Tìm hướng dẫn | Thanh bên "Hướng dẫn mở máy chủ" |
| Tải lõi | Thanh bên "Tải tài nguyên → Lõi máy chủ" |
| Tra phiên bản | Thanh bên "Bách khoa phiên bản → Dòng thời gian phiên bản" |
| Gặp lỗi | Thanh bên "Câu hỏi thường gặp" |
