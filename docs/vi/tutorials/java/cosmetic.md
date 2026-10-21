---
title: Trò chuyện, menu và MOTD
slug: cosmetic
cat: java
level: 3
order: 24
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, trò chuyện, menu, motd, hologram, plugin]
updated: 2026-10-04
draft: false
---

Mấy bài trước nói về "máy chủ có chạy được không" và "có chặn được phá hoại không". Bài này nói về một loại plugin khác: chúng không đổi quy tắc lối chơi, nhưng trực tiếp quyết định **giao diện mà người chơi nhìn thấy** —— khung trò chuyện, menu dạng rương, hai dòng chữ trong danh sách máy chủ, và chữ lơ lửng bay trên trời ở thành chính.

Loại plugin này cài sai thường không làm sập máy chủ, chỉ "trông không đúng", nên dễ bị bỏ qua nhất. Nhưng chúng lại đúng là thứ đầu tiên người chơi tiếp xúc sau khi vào máy chủ.

## Một, plugin trò chuyện: không chỉ để đẹp

Tác dụng của plugin trò chuyện là **tiếp quản thông tin chat do người chơi gửi ra**, rồi lắp ráp lại theo quy tắc và phát đi.

Năng lực trực quan nhất là định dạng: thêm tiền tố, hậu tố, danh hiệu cho tin nhắn, hoặc đổi văn bản thuần thành nội dung có màu. Nhưng thứ thực sự khiến plugin trò chuyện thành **công cụ quản lý** là mấy loại chức năng dưới đây:

| Năng lực | Giải quyết vấn đề gì |
| --- | --- |
| Nhiều kênh | Kênh thường, toàn cầu, riêng tư, quản trị tách nhau; lời quản trị viên nói phân biệt được với người chơi thường |
| Lọc từ nhạy cảm | Tự động chặn chửi bậy và quảng cáo, **không giới hạn ở chat**, phủ luôn các chỗ nhập như biển gỗ, đặt tên ở đe |
| Giãn cách chat | Giới hạn khoảng cách phát ngôn, chống spam |
| Nhắc khi được gọi tên (@) | Khi người chơi bị gọi tên thì nhắc bằng âm thanh, tiêu đề, tránh bỏ sót |
| Nghe tin nhắn riêng | Quản trị viên bật được chế độ nghe, tra quấy rối và tranh chấp giao dịch trong tin nhắn riêng |
| Quyền dùng màu | Ai dùng được mã màu nào do quyền kiểm soát, chứ không phải "cầu vồng spam" ai cũng dùng được |
| Hiển thị vật phẩm | Hiển thị vật phẩm trong tay, kho đồ thậm chí rương Ender trong chat, giao dịch và nhờ giúp đỡ đỡ phải mô tả rất nhiều |
| Hỗ trợ biến | Sau khi nối PlaceholderAPI, chat hiển thị được số dư, số người online… dữ liệu thời gian thực |

**Plugin trò chuyện là biện pháp kiểm duyệt rẻ nhất trong máy chủ**. Không có nó, bạn chỉ còn cách có người ngồi nhìn màn hình; có nó, quy tắc do cấu hình thực thi.

### So sánh plugin trò chuyện phổ biến

| Plugin | Định vị | Điểm đáng chú ý |
| --- | --- | --- |
| **TrChat** | Hệ thống chat cao cấp đầy đủ chức năng nhất | Nhiều kênh, kho từ nhạy cảm trên cloud, hiển thị vật phẩm, gọi tên @, đa máy chủ (Bukkit / BungeeCord / Velocity), thay thế bằng regex, PlaceholderAPI; phiên bản phủ 1.8 đến mới nhất |
| **Carbon** | Plugin chat thiết kế hiện đại | Kết cấu rõ ràng, khả năng mở rộng tốt, phù hợp cảnh muốn "hiện thực sạch" thay vì "chồng chức năng" |
| **InteractiveChat** | **Tăng cường** chat, thường dùng cùng plugin định dạng khác | Lõi là tương tác: từ khóa `[item]`, `[inv]`, `[ender]`…, hover và click tự định nghĩa, tương tác tên người chơi, nhắc đa máy chủ, màu RGB |
| **HuskChat** | Chat đa máy chủ | Đã ngừng phát triển, dự án mới không khuyến nghị chọn làm ưu tiên |
:::tip Nghĩ rõ mình cần gì trước
Nếu bạn chỉ muốn chat "có tiền tố, có màu", thực ra **plugin cơ bản** (loại EssentialsX / CMI) làm được, không cần cài thêm plugin trò chuyện. Thứ thực sự cần plugin trò chuyện riêng là ba nhu cầu này: **nhiều kênh**, **lọc nội dung**, **đa máy chủ**.
:::
:::warn Đừng quên phần phụ thuộc
Plugin trò chuyện gần như đều dùng đến biến. Muốn viết nội dung kiểu "số dư", "số người online" trong định dạng, trước hết cài **PlaceholderAPI** và cài tiện ích mở rộng tương ứng, nếu không placeholder sẽ hiển thị nguyên si thành một đoạn chữ. Chi tiết xem [Plugin phụ thuộc và quan hệ phụ thuộc](/tutorials/java/plugin-deps).
:::

## Hai, plugin menu: biến lệnh thành giao diện rương

Việc plugin menu (còn gọi là menu GUI, menu dạng rương) làm là: **dùng tệp cấu hình mô tả một giao diện rương**, mỗi ô bên trong là một biểu tượng, bấm một cái là thực thi một hành động.

Nó giải quyết một vấn đề rất thực tế —— người chơi không nhớ nổi lệnh. Thay vì để người mới học thuộc `/warp shop`, `/kit starter`, chi bằng cho họ một cái rương, bấm biểu tượng là xong.

Cách dùng điển hình:

- **Điều hướng máy chủ**: từ menu chính bấm vào cửa hàng, dịch chuyển, sự kiện, quy tắc
- **Cửa hàng và đổi thưởng**: đổi vật lấy vật, trừ tiền rồi giao hàng, giới hạn mua
- **Gói quà và điểm danh**: phát vật phẩm theo quyền hoặc thời gian hồi
- **Bảng thông tin người chơi**: hiển thị thống kê, số dư, danh hiệu của mình

### So sánh plugin menu

NitWikit xếp plugin menu theo độ mạnh chức năng thành một dòng: **ChestCommands < DeluxeMenus < TrMenu**.

| Plugin | Độ mạnh | Giải thích |
| --- | --- | --- |
| **ChestCommands** | Cấp nhập môn | Ra đời rất sớm, cơ bản chỉ phù hợp máy chủ cũ 1.7 / 1.8; trên phiên bản cao chức năng rõ ràng không đủ dùng |
| **DeluxeMenus** | Cấp chủ lực | Điều khiển bằng cấu hình, tài liệu đầy đủ, lựa chọn "đủ dùng" của phần lớn máy chủ |
| **TrMenu** | Cấp cao | Chức năng và hiệu năng đều mạnh, hỗ trợ phán đoán điều kiện, biểu tượng con, script Kether; v2 đã ngừng cập nhật, **dùng v3 do cộng đồng bảo trì** |
| **Invero** | Hướng hình ảnh | Cung cấp hiệu ứng cửa sổ cuộn, hoạt ảnh từng khung, ô tương tác…, phù hợp làm giao diện "trông không giống rương bản gốc" |
:::note Về trình biên tập trực quan
Plugin menu **không có** trình biên tập trực quan, cũng không cần. Dùng trình soạn thảo văn bản viết tệp cấu hình theo tài liệu là được. Cái gọi là "trình biên tập menu" hoặc là công cụ phụ tạo YAML, hoặc sẽ chôn cho bạn một đống cấu hình không hiểu nổi.
:::
:::tip Plugin menu phụ thuộc biến và quyền
Hiệu ứng kiểu "hiển thị số dư", "chỉ VIP thấy được" trong menu dựa vào **PlaceholderAPI** và plugin quyền. Trước khi cài plugin menu hãy đặt nền hai cái này cho tốt, nếu không menu mở được nhưng nội dung toàn là chết.
:::

## Ba, MOTD: ấn tượng đầu tiên trong danh sách máy chủ

Người chơi chưa vào máy chủ, thứ họ thấy trước là dòng máy chủ của bạn trong **danh sách chơi nhiều người**: biểu tượng, tên, hai dòng mô tả, số người online. Mấy thứ này gộp lại chính là **MOTD**.

`server.properties` bản gốc chỉ viết được hai dòng văn bản thuần, màu cũng bị hạn chế. Plugin MOTD bù đúng phần này:

- **Chữ chuyển màu và chữ có màu**, cùng kiểu in đậm, in nghiêng
- **Nội dung nhiều dòng** và tự động luân phiên
- **Luân phiên ngẫu nhiên**: mỗi lần làm mới danh sách hiển thị một MOTD khác, dùng để lần lượt trình bày thông báo
- **Giả số người online**: làm con số trong danh sách hiển thị giá trị khác
- **Hiển thị theo điều kiện**: người chơi khác nhau, trạng thái khác nhau thấy nội dung khác nhau

| Plugin | Giải thích |
| --- | --- |
| **MiniMOTD** | Plugin MOTD có phạm vi hỗ trợ rộng, dùng được trên họ Bukkit / Spigot / Paper và phía proxy, luân phiên ngẫu nhiên là cách dùng phổ biến của nó |
:::warn Đừng chỉ đổi tên
MOTD là **căn cứ nhanh nhất để người chơi phán đoán "máy chủ này còn sống không"**. Máy chủ để hai dòng trống, ghi "máy chủ chưa đặt tên", hoặc hiển thị 0 người, dù nội dung làm tốt đến đâu cũng ít ai bấm vào. Bỏ mười phút viết một MOTD rõ ràng (**loại máy chủ + đặc điểm + cách liên hệ**) là một trong những thay đổi đáng giá nhất.
:::

## Bốn, hologram: điểm tô tùy chọn

Hologram (chữ lơ lửng) là văn bản lơ lửng cố định ở một vị trí, luôn hướng về phía người chơi, cũng có thể gồm thực thể và vật phẩm để trưng bày.

Nó thuộc loại **thêm hoa trên gấm**, cách dùng thường gặp:

- Lời chào và tóm tắt nội quy ở điểm hồi sinh thành chính
- Ghi giá thẳng trên biển hiệu cửa hàng, đỡ phải thêm một biển báo
- Bảng xếp hạng, đếm ngược sự kiện
- Đánh dấu điểm dịch chuyển và mốc địa danh

| Plugin | Giải thích |
| --- | --- |
| **DecentHolograms** | Nhẹ nhưng chức năng đầy đủ, nhiều mục cấu hình, còn có tính năng tùy chọn như hiển thị sát thương, hiển thị hồi máu; **lựa chọn ưu tiên hiện tại** |
| **HolographicDisplays** | Plugin hologram lâu đời, kho đã lưu trữ, không còn commit mới; máy chủ cũ có thể vẫn dùng, dự án mới khuyến nghị chọn thẳng DecentHolograms |
:::note Một số hạn chế đến từ chính game
Mấy "tật" của hologram không phải lỗi plugin, mà là hạn chế của Minecraft: văn bản **luôn hướng về phía người chơi**, không chỉnh riêng được cỡ chữ và font; một số thực thể (ví dụ biểu tượng vật phẩm lơ lửng) tự xoay và lên xuống, còn phát ra âm thanh. Ở tầng plugin không giải quyết được, chỉ còn cách dùng resource pack làm font tùy chỉnh… để lách.
:::

## Năm, xếp thứ tự trước khi cài

Giữa mấy loại plugin này có quan hệ phụ thuộc, khuyến nghị cài theo thứ tự dưới đây:

1. **Phụ thuộc**: PlaceholderAPI, plugin quyền, plugin kinh tế (xem [Plugin phụ thuộc và quan hệ phụ thuộc](/tutorials/java/plugin-deps))
2. **Plugin cơ bản**: cung cấp các lệnh được menu gọi như warp, kit
3. **Plugin trò chuyện**: chốt định dạng chat, và chừa chỗ cho biến
4. **Plugin menu**: gói lệnh thành giao diện
5. **Plugin MOTD**: cuối cùng chỉnh phần trưng bày ra ngoài
6. **Hologram**: đợi chốt vị trí thế giới và cửa hàng rồi mới làm, nếu không mỗi lần đổi lại phải dời một lần
:::tip Mỗi lần chỉ cài một
Loại plugin này đều sửa văn bản người chơi nhìn thấy. Cài ba cái cùng lúc rồi gỡ lỗi, bạn không phân biệt được plugin nào đang xuất ra. Cài một, khởi động lại, xem hiệu quả, rồi cài cái tiếp.
:::

## Bước tiếp theo

Làm xong giao diện, quay lại kiểm tra tổng thể một lượt: xem [Nhập môn plugin](/tutorials/java/plugins), [Cơ bản cấu hình plugin](/tutorials/java/plugin-config) và [Quản lý plugin và loại bỏ lỗi](/tutorials/java/plugin-manage).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
