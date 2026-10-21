---
title: "Lên kế hoạch sự kiện và thiết kế lối chơi: giữ máy chủ luôn sôi động"
slug: events
cat: ops
level: 2
order: 29
minutes: 14
tags: [sự kiện, thiết kế lối chơi, giữ chân, cộng đồng, thiết kế phần thưởng, tính công bằng, lịch trình, nhìn lại]
updated: 2026-10-04
---

[Quảng bá và kéo người chơi](/tutorials/ops/promotion) giải quyết "người chơi tìm thấy bạn thế nào", [Plugin kinh tế và lối chơi](/tutorials/ops/gameplay-plugins) giải quyết "trong máy chủ có những hệ thống gì", [[JAVA] Quản lý vận hành](/tutorials/ops/management-java) giải quyết "đội ngũ và tiền bạc sắp xếp ra sao". Ba bài đó đều nói về **khung**. Bài này nói về thứ thực sự diễn ra trong khung đó: **một buổi tối nọ, một nhóm người cùng làm một việc gì đó trong máy chủ của bạn, làm xong vẫn muốn quay lại.**

Sự kiện không phải đồ trang trí của vận hành. Nó là con đường ngắn nhất biến một nhóm người chơi chưa hề quen nhau thành một cộng đồng, và cũng là một trong số ít cách để người chơi lâu năm có lý do quay lại. Đồng thời nó cũng là khâu dễ đổ xe nhất: đặt sai giờ, không viết quy tắc, chưa xây địa điểm, phát thưởng sụp, bất kỳ mục nào cũng có thể biến một sự kiện vốn không tệ thành làn sóng bỏ máy chủ.

Bài này không bàn đến việc chọn plugin cụ thể. Khi cần danh sách plugin thì xem [Nhập môn plugin](/tutorials/java/plugins) và [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps).

:::note Ranh giới của bài này
Bài này không đưa ra tên, lệnh hay khóa cấu hình của bất kỳ plugin sự kiện, plugin minigame hay plugin phần thưởng cụ thể nào. **Tên, tính năng, lệnh khả dụng và mục cấu hình của loại plugin này khác nhau rất nhiều, và thay đổi theo phiên bản**, nên bài này chỉ mô tả "cần làm loại việc gì, loại việc đó thường do loại công cụ nào đảm nhiệm". Cụ thể máy chủ của bạn cài được gì, viết cấu hình thế nào, hãy lấy tài liệu chính thức của từng plugin làm chuẩn.
:::

## 1. Vì sao sự kiện đáng làm

### 1.1 Người chơi mới quyết định ngay trong vài phút đầu

Vài phút đầu sau khi người mới vào máy chủ quyết định họ có ở lại hay không. Trong khoảng thời gian này, câu hỏi họ đối diện không phải "lối chơi có đủ nhiều không" mà là **"ở đây có ai không, tôi nên làm gì"**. Một điểm xuất phát trống trơn kèm một bản hướng dẫn dài dằng dặc, hiệu quả kém xa "tối nay tám giờ có thi parkour, vào chơi đi".

### 1.2 Người chơi quay lại cần một lý do cụ thể

"Máy chủ vẫn đang mở" không tạo thành lý do để quay lại. "Tối thứ bảy có cuộc thi xây dựng, căn nhà lần trước của bạn mang đi dự thi được" mới tạo thành lý do. Sự kiện cho một **mốc thời gian**, mà phản ứng của con người với mốc thời gian mạnh hơn hẳn với việc phán đoán trạng thái.

### 1.3 Sự kiện biến máy chủ thành cộng đồng

Quan hệ giữa người chơi không được dựng nên bằng quy tắc, mà bằng **trải nghiệm chung**. Cùng thua một trận raid, cùng tìm sai hướng trong trò tìm kho báu, cùng ngồi ngắm lâu đài người khác xây, đó mới là nguồn gốc của "chúng ta là người cùng một máy chủ".

| Trạng thái người chơi | Câu hỏi họ thực sự đang hỏi | Sự kiện có thể cung cấp gì |
| --- | --- | --- |
| Người mới vừa vào máy chủ | Ở đây có ai không? Tôi nên làm gì? | Một sự kiện tham gia được ngay, ngưỡng cực thấp |
| Người chơi được vài ngày | Ngoài xây nhà còn làm được gì? | Một mốc thời gian rõ ràng, có người chơi cùng |
| Người chơi lâu năm vài tuần | Ở lại đây có ý nghĩa gì? | Thân phận, vinh dự, một vị trí được cần đến |
| Người đã rời đi một thời gian | Có lý do để quay lại không? | Một thông báo sự kiện chính là lý do đó |
| Người chỉ nói chuyện trong nhóm chat | Tôi có tính là người của máy chủ này không? | Một cơ hội lộ diện và được nhớ đến |

:::tip Sản phẩm thật của sự kiện không phải phần thưởng
Phát thưởng xong là hết, **ký ức chung thì không**. Đánh giá một sự kiện thành công hay không, không nhìn "đã phát thưởng chưa", mà nhìn "sau khi sự kiện kết thúc kênh chat còn sôi nổi không, có ai hỏi lần sau là khi nào không". Nếu một sự kiện kết thúc là rơi ngay vào im lặng, thì nó giống một lần phát thưởng hơn là một sự kiện.
:::

:::warn Sự kiện không phải thuốc vạn năng
Sự kiện có thể khuếch đại một máy chủ vốn đã chơi được, **không thể vá một máy chủ không hay**. Nếu nguyên nhân người mới rời đi là điểm xuất phát khó hiểu, lag, không ai để ý đến họ, thì tổ chức sự kiện chỉ khiến nhiều người thấy những vấn đề đó nhanh hơn. Giải quyết trải nghiệm trước, rồi mới nói đến sự kiện.
:::

## 2. Tổng quan các loại sự kiện

Dưới đây liệt kê các sự kiện phổ biến theo phân loại. Cột "cần chuẩn bị gì" trong bảng chỉ ghi loại việc, cụ thể loại công cụ nào đảm nhiệm thì đối chiếu tài liệu chính thức của từng plugin để xác nhận.

| Loại | Ví dụ | Cần chuẩn bị gì | Số người phù hợp | Rủi ro |
| --- | --- | --- | --- | --- |
| Thi xây dựng | Thi xây theo chủ đề, xây nhanh một giờ, cải tạo điểm xuất phát | Một khu đất đã phân lô, tiêu chí chấm điểm, giám khảo, bảo vệ tác phẩm | 5 đến 50 người | Chấm điểm chủ quan gây tranh cãi; tác phẩm bị phá; quá giờ không kết thúc được |
| Thi đấu PvP | Đấu tay đôi 1v1, chiến trường đồng đội, đấu đài với trang bị thống nhất | Đấu trường, phương án trang bị thống nhất, trọng tài, chỗ xem, điểm hồi sinh | 8 đến 40 người | Trang bị và độ trễ không công bằng; lập đội farm thứ hạng; người xem làm phiền trận đấu |
| Đua parkour | Đường đua tính giờ, vượt ải giới hạn thời gian, tiếp sức đồng đội | Đường đua, cách tính giờ, checkpoint và cách xử lý khi rơi | 5 đến 30 người | Điểm kẹt trên đường đua bị lợi dụng; mất kết nối thì thành tích bị hủy; cách tính giờ không rõ |
| Tìm kho báu / giải đố | Bản đồ kho báu, câu đố tọa độ, tìm đồ giới hạn thời gian | Thiết kế manh mối, danh sách điểm giấu, người đối chiếu đáp án | 10 đến 100 người | Manh mối bị lộ trước; có người mở thẳng tệp bản đồ |
| Đêm Boss / raid | Cùng nhau thách thức kẻ địch mạnh, đánh giới hạn thời gian, chia đồ rơi | Địa điểm chiến đấu, độ khó khớp số người, quy tắc chia đồ rơi | 10 đến 30 người | Không đủ người thì không đánh nổi; cãi nhau khi chia đồ rơi; tải máy chủ cao |
| Sự kiện lễ hội | Halloween, năm mới, kỷ niệm máy chủ | Trang trí, lối chơi giới hạn thời gian, thưởng lễ hội | Toàn máy chủ | Trùng lịch; thay đổi trang trí ảnh hưởng lối chơi bình thường |
| Mục tiêu cộng đồng | Công trình cùng xây toàn máy chủ, mục tiêu thu thập tích lũy | Hiển thị tiến độ, ghi nhận đóng góp, thưởng theo giai đoạn | Toàn máy chủ | Số ít người làm hết; tiến độ kẹt giữa đường mất động lực |
| Buổi chào đón người mới | Chào đón tập thể, người cũ dẫn người mới, buổi riêng cho người mới | Người trực, quy trình giới thiệu, gói quà chào mừng | 5 đến 20 người | Người chơi cũ giành sân khấu; người mới không chen được lời; biến thành buổi thuyết giảng một chiều |
| Sự kiện cốt truyện / RP | Diễn kịch bản, đối kháng phe phái, sự kiện thế giới | Kịch bản, phân vai, địa điểm và đạo cụ, người dẫn dắt | 10 đến 30 người | Kịch bản bị ngắt; có người không đi theo thiết lập; khối lượng chuẩn bị rất lớn |

### 2.1 Điểm thiết kế của từng loại sự kiện

| Loại | Chỗ nên dồn tâm sức nhất trong thiết kế | Cách đổ xe phổ biến nhất |
| --- | --- | --- |
| Thi xây dựng | Tiêu chí chấm điểm phải công khai trước, và tách thành vài mục chấm được | Giám khảo chấm theo sở thích, người dự thi phản đối tại chỗ |
| Thi đấu PvP | Trang bị, phù phép, thuốc, độ trễ bốn mục phải thống nhất hoặc tuyên bố rõ | Có người mang trang bị tự tích cóp đến, trận đấu thành chèn ép một chiều |
| Đua parkour | Điểm bắt đầu và kết thúc tính giờ phải duy nhất và tái lập được | Có người đi tắt, mà quy tắc không ghi "bắt buộc qua checkpoint" |
| Tìm kho báu / giải đố | Độ khó manh mối phân tầng, bảo đảm 10 phút đầu ai cũng có việc làm | Câu đố đầu tiên làm kẹt tất cả, sự kiện tan trong mười phút |
| Đêm Boss / raid | Số người khớp độ khó, quy tắc chia đồ rơi nói rõ trước | Đánh xong cãi nhau khi chia đồ, còn tệ hơn là không đánh nổi |
| Sự kiện lễ hội | Trang trí và lối chơi giới hạn thời gian đều phải khôi phục được bằng một lệnh | Sau lễ hội trang trí còn lại ở thành chính, ảnh hưởng trải nghiệm lâu dài |
| Mục tiêu cộng đồng | Tiến độ phải nhìn thấy được, đóng góp cá nhân phải được ghi nhận | Mục tiêu đặt quá lớn, ba ngày sau không ai nhắc đến nữa |
| Buổi chào đón người mới | Để người mới làm nhân vật chính, người chơi cũ chỉ dẫn dắt | Biến thành buổi thuyết giảng một chiều của quản trị viên |
| Sự kiện cốt truyện / RP | Kịch bản để chỗ cho người chơi tự phát huy | Người chơi không đi theo kịch bản, người dẫn dắt đứng hình tại chỗ |

:::note Máy chủ nhỏ nên chọn loại "chi phí chuẩn bị thấp"
Khi ít người, đua parkour, tìm kho báu, buổi chào đón người mới có hiệu quả trên chi phí cao hơn hẳn sự kiện cốt truyện và raid quy mô lớn. **Quy mô sự kiện phải khớp với thời gian chuẩn bị bạn bỏ ra được**, chứ không phải khớp với quy mô máy chủ trong tưởng tượng của bạn.
:::

### 2.2 Chọn sự kiện theo loại máy chủ

Cùng một sự kiện đặt trên các loại máy chủ khác nhau có thể cho hiệu quả hoàn toàn trái ngược. Trước khi chọn loại, hãy xem định vị máy chủ của chính bạn (cách viết định vị xem [Quảng bá và kéo người chơi](/tutorials/ops/promotion)).

| Loại máy chủ | Sự kiện nên ưu tiên | Sự kiện nên tránh |
| --- | --- | --- |
| Máy chủ sinh tồn nguyên bản | Thi xây dựng, cùng xây cộng đồng, tìm kho báu, sự kiện lễ hội | Thi đấu PvP cường độ cao, lối chơi phá hỏng trạng thái thế giới |
| Máy chủ kỹ thuật redstone | Thi thách thức kỹ thuật, giải đố cơ chế, công trình cùng xây toàn máy chủ | Sự kiện hỗn chiến phụ thuộc lượng lớn thực thể và hiệu ứng |
| Máy chủ minigame | Đấu xếp hạng, giải tuần, luân phiên chế độ giới hạn thời gian | Sự kiện cần tích lũy lâu dài mới tham gia được |
| Máy chủ RP / nhập vai | Sự kiện cốt truyện, đối kháng phe phái, sự kiện thế giới | Loại thuần thi đấu, sự kiện giải trí không liên quan thiết lập |
| Máy chủ Bedrock / chơi chéo | Sự kiện ngưỡng thấp, không phụ thuộc mod phía client | Lối chơi phụ thuộc tính năng client cụ thể |
| Máy chủ mod | Sự kiện kết hợp với cơ chế mod | Sự kiện xung đột với cơ chế mod hoặc cần cấu hình client thêm |

## 3. Lên kế hoạch một sự kiện thế nào

### 3.1 Định thời gian: xác nhận người chơi ở múi giờ nào trước

Đây là bước dễ sai nhất, và cũng dễ bị bỏ qua nhất. Người chơi của bạn có thể phân bố ở nhiều múi giờ, hoặc tập trung ở một múi giờ mà bạn không sống ở đó.

- **Lấy người chơi làm chuẩn, không phải lấy bạn làm chuẩn**. Nếu nhóm người chơi cốt lõi ở múi giờ khác, giờ sự kiện nên định theo giờ sinh hoạt của họ, dù với bạn đó là rạng sáng.
- **Hỏi trước, rồi mới định**. Gửi một cuộc bình chọn đơn giản trong nhóm hiệu quả hơn hẳn việc bạn tự đoán.
- **Ghi rõ múi giờ**. Trong thông báo ghi "20:00" là không đủ, phải ghi "20:00 giờ Bắc Kinh", và quy đổi sang giờ của múi giờ người chơi chính.
- **Tránh ngày thường ban ngày, tuần thi cử và cao điểm đi lại dịp lễ**. Tối cuối tuần thường là lựa chọn ổn định nhất.
- **Dư thời gian báo trước**. Sự kiện nhỏ báo trước ít nhất 2 đến 3 ngày, sự kiện lớn trước 1 đến 2 tuần.

### 3.2 Công bố sớm và nhắc lại nhiều lần

Chỉ gửi một lần thông báo thì coi như không gửi. Người chơi không nhớ một tin nhắn ba ngày trước, nhưng sẽ nhớ cùng một mốc thời gian xuất hiện lặp lại.

- **Gửi ít nhất ba lượt**: một lần khi chốt lịch, một lần trước sự kiện một hai ngày, một lần nhắc lại trước khi bắt đầu một hai giờ.
- **Nội dung phải nhất quán**. Thời gian, địa điểm, quy tắc trong ba lượt thông báo không được có bất kỳ thay đổi nào; nếu phải đổi thì nói rõ "đã đổi chỗ nào".
- **Phủ nhiều kênh**: thông báo trong game, thông báo nhóm chat, phần giới thiệu ở trang danh sách máy chủ, tin nhắn chào mừng khi vào máy chủ. Cách chọn kênh truyền thông xem [Quảng bá và kéo người chơi](/tutorials/ops/promotion).
- **Ghi "tham gia thế nào" vào thông báo**. Người chơi không nên phải đi hỏi người khác mới biết cách đăng ký.

### 3.3 Viết quy tắc ra

Quy tắc miệng biến mất đúng vào lúc tranh chấp xảy ra. **Quy tắc viết ra mạnh hơn mọi cuộc tranh cãi**.

- Ghi rõ "cho phép gì, cấm gì, ai phán quyết, hòa thì thế nào, vi phạm xử lý ra sao".
- Quy tắc phải công khai trước khi sự kiện bắt đầu, chứ không phải đợi sự kiện có vấn đề rồi bổ sung.
- Quy tắc phải ngắn. Quy tắc dài quá một màn hình không ai đọc, hãy đặt ba đến năm điều quan trọng nhất lên đầu.
- Khi xung đột với quy tắc chung của máy chủ thì lấy quy tắc chung làm chuẩn, xem [Quy chuẩn cộng đồng](/rules).

### 3.4 Địa điểm phải xây xong trước và nạp trước

**Tuyệt đối đừng đợi đến lúc sự kiện bắt đầu mới bắt tay xây địa điểm.** Dựng tại chỗ gần như chắc chắn bị trễ, và sẽ biến thời gian chờ của người chơi thành làn sóng rời đi.

- **Ưu tiên chuẩn bị địa điểm trong thế giới riêng hoặc instance**, sau đó mới đến "xây ở nơi rất xa điểm xuất phát". Cách trước có lợi: không ảnh hưởng thế giới chính, không chiếm việc nạp chunk của thế giới chính, kết thúc sự kiện có thể tắt toàn bộ.
- **Nếu chỉ có thể xây ở thế giới chính**, hãy chọn vị trí xa điểm xuất phát và khu xây dựng chính, tránh việc người chơi dịch chuyển đến kéo theo nạp lượng lớn chunk.
- **Nạp sẵn các chunk liên quan**. Nạp chunk lần đầu là một trong những thao tác đắt nhất; đi một vòng qua địa điểm trước khi sự kiện bắt đầu, để khu vực liên quan ở trạng thái đã nạp, có thể giảm rõ rệt lag lúc khai mạc. Cụ thể dùng cách nào để nạp trước thì tùy máy chủ và plugin bạn dùng.
- **Địa điểm phải được diễn tập trọn vẹn trước sự kiện**. Tự đi một lượt quy trình hiệu quả hơn mười lần diễn lại trong đầu.

### 3.5 Phân công đến từng người

Một người tổ chức sự kiện tức là không có phương án dự phòng. Ít nhất phải xác định rõ mấy vai trò dưới đây, thiếu người thì có thể một người kiêm nhiều vai, nhưng **phải có người chịu trách nhiệm**.

| Vai trò | Phụ trách gì | Cần mấy người | Lỗi phổ biến |
| --- | --- | --- | --- |
| Người dẫn dắt | Công bố quy trình, giữ nhịp, khai mạc và kết thúc | 1 người | Vừa dẫn vừa xử lý sự cố kỹ thuật, cả hai bên đều không xong |
| Trọng tài | Phán quyết thắng thua, xử lý vi phạm và tranh chấp | 1 đến 2 người | Trọng tài đồng thời dự thi, phán quyết mất uy tín |
| Xây dựng / địa điểm | Hoàn thành địa điểm và đạo cụ trước sự kiện | Từ 1 người trở lên | Ngày diễn ra sự kiện vẫn còn sửa địa điểm |
| Hỗ trợ kỹ thuật | Xử lý mất kết nối, lag, dịch chuyển thất bại, vấn đề quyền | 1 người | Không có ai phụ trách, có vấn đề thì tất cả im lặng |
| Ghi chép | Chụp ảnh, quay video, ghi kết quả và đóng góp | 1 người | Sự kiện xong rồi, không có lấy một tấm ảnh dùng được |

:::tip Trọng tài không được dự thi
Điều này nghe có vẻ khắt khe, nhưng là cách **ít tranh chấp nhất**. Nếu thực sự thiếu người, hãy để trọng tài né các lượt liên quan đến mình, và công khai quá trình phán quyết. Uy tín một khi đã mất, mọi sự kiện sau đó đều sẽ bị nghi ngờ.
:::

### 3.6 Phương án dự phòng

Ngày diễn ra sự kiện chắc chắn sẽ có vấn đề. Khác biệt chỉ ở chỗ bạn có chuẩn bị hay không.

| Vấn đề có thể xảy ra | Tại chỗ làm thế nào | Phải làm gì trước |
| --- | --- | --- |
| Máy chủ lag, TPS giảm | Tạm dừng hoặc rút ngắn quy trình, giảm thực thể và hiệu ứng chạy đồng thời | Kiểm thử tải trước, chuẩn bị sẵn quy trình rút gọn |
| Người chơi quan trọng mất kết nối | Cho thời gian chờ kết nối lại, quá giờ thì xử lý theo quy tắc | Ghi rõ trong quy tắc "mất kết nối thì thế nào" |
| Số người ít hơn dự kiến nhiều | Chuyển sang chia nhóm quy mô nhỏ, hoặc chuyển sang tham gia tự do | Chuẩn bị một phương án dự phòng "ít người vẫn chơi được" |
| Số người vượt dự kiến nhiều | Chia đợt, hoặc mở thêm địa điểm và lượt | Ước tính giới hạn chịu tải trước |
| Có người gian lận hoặc phá hoại | Cách ly ngay, xử lý theo quy tắc, để lại dấu vết sau đó | Quy tắc ghi rõ phán quyết và hình phạt |
| Thời gian sự kiện quá giờ nghiêm trọng | Cắt các khâu sau, bảo đảm có phần kết thúc trước | Đặt giới hạn thời gian cho từng khâu |
| Không phát được phần thưởng | Ghi lại danh sách, phát bù sau sự kiện | Xác nhận cách phát và quyền trước |

### 3.7 Mẫu kế hoạch sự kiện

Điền xong mẫu dưới đây là một sự kiện cơ bản đã sẵn sàng. **Chỗ trống nào không điền được chính là chỗ bạn chưa chuẩn bị xong.**

```
Tên sự kiện: ______ (một câu nói rõ là gì)
Thời gian: ______ (ngày + giờ bắt đầu + thời lượng dự kiến + múi giờ)
Địa điểm: ______ (thế giới / tọa độ / có phải instance không; người chơi đến bằng cách nào)
Cách tham gia: ______ (đăng ký thế nào, có được tham gia tại chỗ không, có lập đội không)
Quy tắc: ______ (cho phép và cấm, tiêu chí phán quyết, hòa thì thế nào)
Phần thưởng: ______ (thứ hạng và nội dung, cách phát và thời điểm phát)
Người phụ trách: ______ (dẫn dắt / trọng tài / xây dựng / hỗ trợ kỹ thuật / ghi chép, mỗi vai là ai)
Phương án dự phòng: ______ (lag, mất kết nối, số người bất thường, gian lận thì làm thế nào)
```

## 4. Phần thưởng và an toàn kinh tế

### 4.1 Vì sao phần thưởng có thể phá hỏng kinh tế

Phần thưởng là phần dễ mất kiểm soát nhất của sự kiện, vì nó trực tiếp bơm tài nguyên vào tài sản của người chơi. Điểm yếu và sự cố phổ biến của hệ thống kinh tế xem [Plugin kinh tế và lối chơi](/tutorials/ops/gameplay-plugins). Trong sự kiện, cần đặc biệt cảnh giác ba tình huống:

- **Quy mô phần thưởng mất kiểm soát**. Lượng phát ra trong một sự kiện, nếu vượt quá sản lượng vài ngày chơi bình thường của người chơi, thị trường sẽ bị đánh sập tại chỗ.
- **Phần thưởng bị farm lặp lại**. Chỉ cần sự kiện tham gia lại được và lần nào cũng phát cùng một thứ, nó biến từ "sự kiện" thành "instance tài nguyên".
- **Phần thưởng gắn với tài nguyên khan hiếm**. Lấy đồng tiền cứng trong hệ kinh tế làm giải thưởng sự kiện, tức là tự chôn một quả bom hẹn giờ dưới nền kinh tế.

### 4.2 Phần thưởng ngoại hình và phần thưởng vật chất

| Loại phần thưởng | Ví dụ | Ảnh hưởng đến kinh tế | Tình huống phù hợp |
| --- | --- | --- | --- |
| Loại ngoại hình | Danh hiệu, thú nuôi, vật phẩm trang trí, vị trí trưng bày công trình | Cơ bản không ảnh hưởng, và không bị quy đổi tiền lặp lại | Lựa chọn đầu tiên của gần như mọi sự kiện |
| Loại vinh dự | Thứ hạng bảng xếp hạng, tuyên dương trong thông báo, dấu hiệu thân phận riêng | Không ảnh hưởng | Sự kiện thi đấu, sự kiện cuộc thi |
| Loại kỷ niệm | Vật đánh dấu riêng của sự kiện, công trình kỷ niệm | Ảnh hưởng rất nhỏ, với điều kiện không giao dịch được hoặc số lượng có hạn | Sự kiện lễ hội, sự kiện kỷ niệm |
| Loại tiện ích | Dịch chuyển một lần, buff tạm thời, đạo cụ tiện lợi | Tùy độ mạnh và có giao dịch được không | Dùng thận trọng, tránh tích lũy lâu dài |
| Loại vật chất | Tiền tệ, nguyên liệu hiếm, trang bị mạnh | Ảnh hưởng trực tiếp đến kinh tế, có thể gây lạm phát | Số lượng ít, một lần, và kiểm soát chặt tổng lượng |

:::warn Máy chủ sinh tồn đừng phát vật phẩm chỉ có ở chế độ sáng tạo
**Phát vật phẩm chỉ lấy được qua chế độ sáng tạo trên máy chủ sinh tồn gần như chắc chắn sẽ có vấn đề.** Loại vật phẩm này không lấy được trong lối chơi bình thường, một khi xuất hiện trong tay người chơi sẽ thành hàng khan hiếm không thể nhân bản, từ đó sinh ra chợ đen, lừa đảo và cáo buộc "quản trị phát đồ cho người quen". Muốn phần thưởng trông đặc biệt, hãy dùng danh hiệu, trang trí và vị trí trưng bày, chứ đừng dùng vật phẩm phá vỡ ranh giới quy tắc.
:::

### 4.3 Phát thưởng phải để lại dấu vết

- **Xác định danh sách phần thưởng trước**, đừng tăng thêm tại chỗ.
- **Ghi lại từng người nhận và thời điểm phát**, tránh tranh chấp "tôi rõ ràng nhất mà không nhận được".
- **Kênh phát nên thống nhất**, giảm nghi ngờ "có người được phát riêng".
- **Công khai nội dung phần thưởng**. Danh sách phần thưởng công khai tự nó đã là một phần của sự công bằng.

## 5. Công bằng và chống lạm dụng

Phòng chống gian lận và phá hoại ở mức kỹ thuật xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat); mục này nói về công bằng ở mức quy tắc sự kiện.

### 5.1 Đội phải cân bằng

Công bằng của sự kiện đồng đội được quyết định ngay từ lúc chia đội. Để mấy người mạnh nhất vào cùng một đội, trận đấu kết thúc ở giây thứ 30, số còn lại chỉ chạy cho có.

- **Chia đội theo năng lực chứ không theo quan hệ**. Để người chơi tự chọn đồng đội gần như chắc chắn xuất hiện "cao thủ bắt cặp".
- **Công khai căn cứ chia đội**. Dù chỉ là "chia kiểu rắn theo thứ tự đăng ký", viết ra vẫn đáng tin hơn thao tác kín.
- **Chuẩn bị cơ chế chấp đội**. Ví dụ đội yếu được thêm tài nguyên, giới hạn trần trang bị của đội mạnh.
- **Cho phép xem trận**. Người bị loại nếu chỉ ngồi chờ thì lần sau sẽ không đăng ký nữa.

### 5.2 Tài khoản phụ và dùng chung tài khoản

Đây là cách lạm dụng phổ biến nhất trong sự kiện, và cũng khó phát hiện nhất. Nó phá hỏng đồng thời bảng xếp hạng và việc phát thưởng.

- **Cấm rõ trong quy tắc** việc dùng nhiều tài khoản dự thi và dùng chung tài khoản, và ghi rõ cách phán định cùng hậu quả.
- **Thống kê theo người chơi chứ không theo tài khoản**. Nhiều tài khoản của cùng một người phải được coi là cùng một người.
- **Để ý dấu hiệu bất thường**: cùng IP, đăng nhập cùng thời điểm, chuyển vật phẩm giữa các tài khoản, tài khoản chỉ xuất hiện trong thời gian sự kiện.
- **Xử phạt phải có bằng chứng**. Nghi ngờ không bằng bằng chứng, xử phạt phải để lại dấu vết, nếu không sẽ làm tổn thương người chơi bình thường.

### 5.3 Người chơi tham gia muộn

Người vào máy chủ sau khi sự kiện đã bắt đầu, xử lý không khéo sẽ mất lòng cả hai phía.

- **Quy tắc ghi rõ trước**: có được tham gia giữa chừng không, tham gia rồi có tính thành tích không, có được nhận thưởng không.
- **Đưa ra cách nói thống nhất**. Cách phổ biến nhất là cho phép xem và tham gia tự do, nhưng thành tích tính từ lượt sau.
- **Đừng đổi quy tắc tại chỗ**. Đổi quy tắc vì một người là bất công với tất cả người đã tham gia.

### 5.4 Xử lý tranh chấp tại chỗ thế nào

Tranh chấp chắc chắn sẽ xảy ra, mấu chốt là có sẵn đường xử lý định trước hay không.

- **Xem quy tắc trước, xem hiện trường sau**. Có quy tắc thì phán theo quy tắc, đừng ứng biến tại chỗ.
- **Phán quyết phải công khai nêu lý do**, dù chỉ một câu.
- **Đừng ra quyết định trong lúc cảm xúc**. Có người mắng bạn, và việc họ có vi phạm hay không là hai chuyện.
- **Tranh chấp leo thang thì tạm dừng**. Thà tạm dừng năm phút còn hơn cãi nhau dưới con mắt cả hội trường.
- **Sau đó cùng nhìn lại**. Chỗ nào quy tắc chưa rõ thì lượt sau bổ sung; việc này có giá trị hơn tranh thắng thua tại chỗ.

## 6. Chuẩn bị kỹ thuật

### 6.1 Địa điểm

- **Ưu tiên thế giới riêng hoặc instance**, sau đó mới đến vị trí xa xôi ở thế giới chính. Lý do xem 3.4.
- **Đi trọn quy trình một lượt trước sự kiện**, gồm từng bước dịch chuyển, hồi sinh, tính giờ, phát thưởng.
- **Dọn dẹp sau khi sự kiện kết thúc**. Địa điểm tạm, quyền tạm, đạo cụ tạm đều phải khôi phục được bằng một lệnh, nếu không chúng sẽ nằm lại trong máy chủ mãi.
- **Đừng sửa thế giới chính vào sát sự kiện**. Rủi ro của thay đổi sẽ bùng phát dồn dập đúng ngày diễn ra.

### 6.2 Hệ thống minigame và máy chủ minigame riêng

- **Sự kiện quy mô nhỏ** thường chỉ cần một loại plugin "minigame / đấu trường" là đủ: chúng phụ trách cách ly địa điểm, đội, tính điểm và hồi sinh.
- **Sự kiện lớn hoặc tần suất cao** phù hợp hơn khi đặt trên máy chủ minigame riêng, đưa người chơi sang đó qua proxy, xem [Proxy đa máy chủ](/tutorials/java/proxy). Lợi ích là lối chơi sự kiện không làm nhiễm bẩn thế giới chính, tải cũng tách riêng.
- **Sự kiện qua proxy phải kiểm thử thêm một lượt**. Dịch chuyển qua máy chủ, kế thừa quyền, kênh chat, phát thưởng sau khi qua proxy đều có thể phát sinh vấn đề, những thứ này đều phải kiểm chứng trước sự kiện.
- **Tên plugin, lệnh và mục cấu hình cụ thể, hãy lấy tài liệu chính thức của từng plugin làm chuẩn.** Bài này không liệt kê chúng, vì chúng thay đổi theo phiên bản, và chép nguyên cấu hình thường nguy hiểm hơn là không viết.

### 6.3 Sao lưu cả trước và sau sự kiện

Sự kiện là khoảng thời gian "trạng thái thế giới thay đổi tập trung nhất": có người phá địa điểm, có người lấy phần thưởng, có người mất kết nối ở chỗ kỳ lạ. Cách sao lưu và cách kiểm chứng xem [Sao lưu và khôi phục](/tutorials/java/backup).

- **Sao lưu trước sự kiện**: có sự cố thì quay thẳng về trạng thái trước sự kiện.
- **Sao lưu sau sự kiện**: cố định thành quả sự kiện (công trình, ghi chép, việc phát thưởng).
- **Sao lưu phải được kiểm chứng khôi phục được**. Bản sao lưu chưa kiểm chứng thì không tính là sao lưu.

### 6.4 Rủi ro lag

:::warn Sự kiện lớn là lúc máy chủ dễ lag nhất
**Một sự kiện đông người, nhiều thực thể, nhiều hiệu ứng là thời điểm máy chủ dễ lag thậm chí sập nhất trong cả năm.** Lượng lớn người chơi tập trung ở cùng một khu vực, đồng thời sinh ra lượng lớn thực thể và hạt, đồng thời kích hoạt lượng lớn logic plugin, tải sẽ vượt xa đỉnh bình thường.

Vì vậy: **kiểm thử trước**. Diễn tập một lần với số người và quy trình gần thực tế, quan sát thay đổi TPS và MSPT; nếu diễn tập đã tụt khung hình thì sự kiện chính thức chỉ tệ hơn. Cách phân tích xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark). Đồng thời chuẩn bị một bộ "quy trình rút gọn" để chuyển sang ngay khi lag.
:::

Kiểm tra kỹ thuật trước sự kiện có thể lần lượt đi qua từng mục theo bảng này:

| Mục kiểm tra | Vì sao quan trọng |
| --- | --- |
| Chunk của địa điểm đã được nạp trước | Tránh việc nạp chunk dồn dập lúc khai mạc gây lag |
| Dịch chuyển người chơi và điểm hồi sinh đã kiểm thử | Dịch chuyển thất bại sẽ khiến sự kiện gián đoạn ngay |
| Quyền và thân phận tạm đã cấu hình | Người dẫn dắt và trọng tài cần quyền tương ứng |
| Quy trình phát thưởng đã diễn tập | Không phát được còn khó coi hơn là không phát |
| Kênh xem trận và dự thính đã chuẩn bị | Để người bị loại cũng có việc làm |
| Sao lưu trước và sau sự kiện đã sắp xếp | Có sự cố thì quay về trạng thái đã biết |
| Quy trình dự phòng đã sẵn sàng | Lag hoặc số người bất thường thì chuyển ngay được |
| Người ghi chép đã vào vị trí | Sau đó cần ảnh chụp, kết quả và phản hồi |

## 7. Sau sự kiện

Khoảnh khắc sự kiện kết thúc, công việc mới xong một nửa. **Sự kiện không có phần kết thúc thì coi như chưa tổ chức.**

### 7.1 Công bố kết quả và ảnh chụp

- Công bố thứ hạng, danh sách người thắng và căn cứ phán quyết.
- Đăng ảnh chụp hoặc video. Đây là thứ duy nhất chứng minh "sự kiện thực sự đã diễn ra, thực sự có người đến", và cũng là tư liệu quảng bá tốt nhất cho sự kiện sau.
- Cố định kết quả ở một vị trí truy cập được lâu dài, chứ đừng để nó chìm trong lịch sử chat.

### 7.2 Cảm ơn những người đã giúp

- Cảm ơn công khai người dẫn dắt, trọng tài, xây dựng và hỗ trợ kỹ thuật. **Người sẵn lòng giúp là nguồn lực khan hiếm nhất của bạn**, họ cần được nhìn thấy.
- Ghi lại ai đã làm gì. Lần tổ chức sau, danh sách này chính là đội nòng cốt của bạn.
- Với người tham gia cũng phải có phản hồi, dù chỉ là một câu tổng kết.

### 7.3 Thu thập phản hồi

- **Hỏi câu hỏi cụ thể**, đừng chỉ hỏi "có vui không". Hỏi "khâu nào chán nhất" "chỗ nào bị kẹt" "lần sau muốn chơi gì".
- **Cho một kênh phản hồi cố định**, đừng để ý kiến rải rác ở các nhóm chat.
- **Phân biệt "ý kiến" và "cảm xúc"**. Có người chửi, không có nghĩa ý kiến của họ vô giá trị, nhưng cũng không có nghĩa bạn buộc phải làm theo.

### 7.4 Ghi chép nhìn lại

Sau mỗi sự kiện hãy viết một bản ghi ngắn, nội dung gồm:

- Số người tham gia thực tế lệch bao nhiêu so với dự kiến;
- Khâu nào quá giờ, khâu nào không ai chơi;
- Đã xảy ra những vấn đề kỹ thuật nào, giải quyết ra sao;
- Tranh chấp được phán thế nào, quy tắc chỗ nào chưa rõ;
- Ba việc cần sửa cho lần sau.

Bản ghi này không cần dài, nhưng **phải viết ra**. Ba tháng sau bạn sẽ không nhớ vì sao hôm đó lag năm phút.

### 7.5 Dựng nhịp điệu cố định

Sự kiện lẻ tẻ dựa vào nhiệt huyết, sự kiện bền vững dựa vào nhịp điệu. Để người chơi biết "khi nào chắc chắn có việc gì đó diễn ra" hiệu quả hơn hẳn việc mỗi lần thông báo tùy hứng.

| Nhịp | Quy mô | Mục đích | Lưu ý |
| --- | --- | --- | --- |
| Sự kiện nhỏ mỗi tuần một lần | 30 đến 60 phút, chi phí chuẩn bị thấp | Giữ hoạt động hằng ngày, cho người mới một cửa vào | Phải luân phiên loại, đừng tuần nào cũng parkour |
| Sự kiện lớn mỗi tháng một lần | Trên 2 giờ, cần chuẩn bị trước | Tạo chủ đề bàn tán, kéo người đã rời đi quay lại | Quảng bá trước 1 đến 2 tuần |
| Sự kiện lễ hội / kỷ niệm | Theo lễ hội ngoài đời | Mượn đà thu hút lưu lượng và người quay lại | Lịch tránh các sự kiện lớn khác |
| Mục tiêu cộng đồng dài hạn | Kéo dài vài tuần | Cho toàn máy chủ một mục tiêu chung | Tiến độ phải nhìn thấy được |

:::tip Nhịp điệu quan trọng hơn sáng tạo
Người chơi không nhớ bạn đã tổ chức sự kiện nào, nhưng sẽ nhớ "máy chủ này tối thứ bảy nào cũng có sự kiện". **Bản thân sự đáng đoán trước đã là sức hút.** Thà mỗi tuần tổ chức một sự kiện nhỏ đơn giản, còn hơn ba tháng làm một cái hoành tráng rồi biến mất.
:::

## 8. Danh sách một trang cho sự kiện

### 8.1 Trước sự kiện

- [ ] Loại sự kiện đã xác định, và khớp với thời gian chuẩn bị bỏ ra được
- [ ] Thời gian đã định theo múi giờ người chơi chính, và ghi rõ múi giờ
- [ ] Đã bắt đầu quảng bá trước ít nhất 2 đến 3 ngày (sự kiện lớn 1 đến 2 tuần)
- [ ] Quảng bá đã gửi ít nhất ba lượt, nội dung nhất quán
- [ ] Quy tắc đã thành văn bản, đã công khai, gồm tiêu chí phán quyết và cách xử lý hòa
- [ ] Địa điểm đã xây xong trong thế giới riêng hoặc instance, và đã nạp trước
- [ ] Quy trình trọn vẹn đã diễn tập một lượt, gồm dịch chuyển, tính giờ và phát thưởng
- [ ] Người dẫn dắt, trọng tài, xây dựng, hỗ trợ kỹ thuật, ghi chép đã xác định đến từng người
- [ ] Trọng tài không dự thi (hoặc đã né các lượt liên quan)
- [ ] Danh sách phần thưởng đã xác định, quy mô đã được đánh giá ảnh hưởng đến kinh tế
- [ ] Máy chủ sinh tồn không phát vật phẩm chỉ có ở chế độ sáng tạo
- [ ] Cách chia đội đã xác định và công khai, cơ chế cố gắng cân bằng
- [ ] Cách phán định nhiều tài khoản và dùng chung tài khoản đã ghi vào quy tắc
- [ ] Cách xử lý tham gia giữa chừng, mất kết nối, quá giờ đã ghi vào quy tắc
- [ ] Phương án dự phòng đã chuẩn bị: lag, mất kết nối, số người bất thường, gian lận
- [ ] Sao lưu trước sự kiện đã xong, và đã kiểm chứng khôi phục được
- [ ] Sao lưu sau sự kiện đã sắp xếp
- [ ] Kênh cho người chơi quan trọng và người xem đã chuẩn bị

### 8.2 Trong sự kiện

- [ ] Khai mạc nói rõ quy trình, quy tắc và giới hạn thời gian
- [ ] Kiểm soát thời lượng từng khâu, quá giờ thì sang khâu tiếp
- [ ] Tranh chấp phán theo quy tắc, và công khai nêu lý do
- [ ] Lag thì chuyển ngay sang quy trình rút gọn
- [ ] Ghi chép suốt quá trình: ảnh chụp, video, thứ hạng, danh sách người thắng

### 8.3 Sau sự kiện

- [ ] Kết quả và danh sách người thắng đã công bố, kèm căn cứ phán quyết
- [ ] Ảnh chụp hoặc video đã đăng
- [ ] Người đã giúp đã được cảm ơn công khai
- [ ] Phần thưởng đã phát theo danh sách, và có ghi chép
- [ ] Phản hồi đã thu thập, và phân biệt ý kiến với cảm xúc
- [ ] Bản ghi nhìn lại đã viết, gồm ba việc cần sửa cho lần sau
- [ ] Địa điểm tạm, quyền tạm, đạo cụ tạm đã dọn
- [ ] Thời gian sự kiện tiếp theo đã công bố

---

> Tên và cấu hình của plugin sự kiện cụ thể lấy tài liệu chính thức của từng plugin làm chuẩn.
