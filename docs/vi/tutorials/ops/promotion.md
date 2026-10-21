---
title: Quảng bá và kéo người chơi: làm sao để người chơi tìm thấy máy chủ của bạn
slug: promotion
cat: ops
level: 2
order: 22
minutes: 16
tags: [quảng bá, cộng đồng, chiến lược giữ chân, marketing, server-list, video, onboarding, tăng trưởng]
updated: 2026-10-04
draft: false
---

Phần trước nói về "máy chủ có chạy được không". Bài này nói về chuyện khác: **máy chủ chạy được rồi, người chơi dựa vào đâu để biết nó tồn tại, và dựa vào đâu để ở lại**.

Đây là bài phi kỹ thuật. Nó song hành với [[JAVA] Quản lý vận hành](/tutorials/ops/management-java): bài đó nói mở máy chủ cần gì, đội ngũ phân công thế nào, quản lý tiền và người chơi ra sao; bài này chỉ tập trung hai mảng trong đó —— **quảng bá kéo người** và **vận hành cộng đồng**. Nó không động đến lệnh, cấu hình hay chọn plugin; cần danh sách plugin thì xem [Nhập môn plugin](/tutorials/java/plugins) và [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps).

:::note Đặt kỳ vọng cho đúng trước
Quảng bá không phải hành động "đăng một bài là xong", mà là công việc hằng ngày **kéo dài vài tháng, do nội dung dẫn dắt**. Nếu bạn kỳ vọng "đăng một bài quảng bá là có vài chục người ở lại thường xuyên", bài này sẽ làm bạn thất vọng —— nhưng thất vọng càng sớm thì máy chủ sống càng lâu.
:::

## 1. "Mở máy chủ là có người đến" là sai

Mô hình trong đầu của nhiều chủ máy chủ mới là: tôi chạy máy chủ lên, mạng công cộng kết nối được, đưa IP ra, người chơi tự nhiên sẽ đến. Thực tế là: **không ai có nghĩa vụ phát hiện ra bạn**.

Bạn đối mặt với **vấn đề khởi động nguội** điển hình, và nó tự mang theo một vòng phản hồi tiêu cực:

1. Máy chủ của bạn có 0 người trực tuyến;
2. Người chơi thấy "0/20" trên trang danh sách máy chủ hoặc trong nhóm, phản ứng đầu tiên là "máy chủ này chết rồi", bỏ qua luôn;
3. Vì không ai nhấp vào, trang danh sách cấp cho bạn độ hiển thị càng thấp;
4. Thế là bạn vẫn 0 người.

Điểm then chốt nhất trong vòng này là: **"0 người trực tuyến" tự nó là một tín hiệu đuổi người**. Người chơi không phải không muốn làm người đầu tiên, mà không muốn đặt thời gian vào một nơi trông như không ai bảo trì. Nên mục tiêu thật của quảng bá không phải "đăng ra", mà là **vào đúng khoảnh khắc có người ghé xem, khiến máy chủ trông đáng để ở lại**.

Vài sự thật phải chấp nhận:

| Suy nghĩ thường gặp | Thực tế |
| --- | --- |
| Máy chủ hay thì người chơi tự đến | Hay là điều kiện cần để giữ chân, không phải điều kiện đủ để được thấy. Không ai biết bạn thì không ai đánh giá được bạn có hay không |
| Tôi có kỹ thuật nên mở được máy chủ | Kỹ thuật chỉ giải quyết "chạy được". Quảng bá và vận hành là hai nghề khác |
| Cứ mở đã, đông người rồi tính quảng bá | Đợi đến lúc đông người thường là không đợi được. Tư liệu quảng bá phải chuẩn bị trước khi mở máy chủ |
| Bỏ tiền mua vị trí quảng cáo là đủ | Vị trí quảng cáo mua được lượt nhấp, không mua được sự ở lại. Trải nghiệm ngày đầu kém thì lưu lượng càng lớn chết càng nhanh |

:::warn Đừng spam quảng cáo trong nhóm người khác
**Dán đi dán lại IP máy chủ trong nhóm QQ, máy chủ Discord, tieba, diễn đàn không liên quan đến bạn là một trong những cách nhanh nhất bị đá, bị chặn, bị nêu tên công khai**, và còn liên lụy danh tiếng máy chủ —— người chơi sẽ nhớ "cái máy chủ spam khắp nơi đó", và chuyển sự khó chịu đó sang bạn. Muốn vào cộng đồng người khác quảng bá thì xem quy định nhóm trước, xin phép quản trị viên trước, làm một người sẵn lòng trò chuyện trước. **Kênh được quy định cho phép mới gọi là kênh, kênh không được phép gọi là quấy rối.**
:::

## 2. Định nghĩa máy chủ của bạn bằng một câu

Trước khi viết bất kỳ văn bản quảng bá nào, hoàn thành chỗ trống này trước:

```
Đây là máy chủ ______ (cách chơi gì) dành cho ______ (ai),
so với máy chủ cùng loại, điểm khác biệt của nó là ______.
```

Cả ba chỗ trống đều phải điền ra thứ **cụ thể**. Không điền được nghĩa là định vị chưa rõ, lúc đó làm quảng bá chỉ là phóng to "chưa rõ" cho nhiều người thấy hơn.

### 2.1 Các kiểu định vị thường gặp

| Định vị | Nhắm đến nhóm người | Định vị này buộc bạn phải quyết định |
| --- | --- | --- |
| Kỹ thuật redstone / máy chủ kỹ thuật | Người thích redstone, tháp sinh quái, nghiên cứu cơ chế | Cơ chế bản gốc không được để plugin làm hỏng; cực kỳ nhạy với TPS và nạp chunk |
| Máy chủ sinh tồn bản gốc | Người muốn vận hành lâu dài một thế giới | Thế giới không được reset thường xuyên; hệ kinh tế và lãnh thổ phải tiết chế |
| Máy chủ minigame | Người muốn chơi một ván bất cứ lúc nào | Cần số người mỗi ván và nhịp ghép trận ổn định; trải nghiệm sảnh chờ quyết định tất cả |
| Máy chủ RP / nhập vai | Người muốn diễn câu chuyện, xây setting | Cần kịch bản, duyệt và nhân lực quản lý, đầu tư cao hơn máy chủ thường rất nhiều |
| Bedrock Edition / máy chủ chơi chéo | Người chơi điện thoại, máy chơi game | Phiên bản và phương án chơi chéo quyết định phạm vi plugin dùng được |
| Máy chủ mod | Người muốn chơi modpack | Client phải cài cùng bộ mod; quảng bá bắt buộc ghi rõ modpack và phiên bản |

### 2.2 Vì sao không có định vị thì không ai đến

- **Người chơi phán đoán trong 3 giây**. Họ thấy không phải thế giới của bạn, mà một dòng tiêu đề. Tiêu đề mơ hồ bằng không có tiêu đề.
- **Không có định vị, quảng bá chỉ có thể chất đống tính từ**. "Hay, kích thích, nhiều ưu đãi, không nạp tiền" những từ này không tạo thành thông tin với bất kỳ ai.
- **Người kéo về sẽ xung đột nhau**. Người muốn yên tĩnh xây nhà và người muốn đánh nhau bất cứ lúc nào đặt cạnh nhau, cả hai bên đều không hài lòng, cả hai đều đi.
- **Vận hành không có tiêu chuẩn đánh đổi**. Có người đề nghị thêm PVP, có người đề nghị thêm mod công nghệ, bạn không có căn cứ phán đoán, cuối cùng thành "cái gì cũng có một chút" bốn không giống.

:::tip Định vị là một danh sách đánh đổi
Khi viết định vị, hãy viết cả "chúng tôi không làm gì". Ví dụ "không làm PVP thi đấu" "không bán sức mạnh" "không reset thế giới chính". **Từ chối rõ ràng một phần người chơi là tiền đề để phần còn lại yên tâm.**
:::

## 3. Người chơi MC tiếng Trung thực sự ở đâu

Dưới đây mô tả theo **loại**, không nêu tên trang cụ thể. Lý do rất đơn giản: **các nền tảng này thịnh suy, đổi bản, đổi quy định**, kênh hiệu quả hôm nay sang năm có thể đã đóng hoặc cấm quảng bá. Thứ bạn thực sự cần nắm là "đi loại nơi nào tìm người" và "vào loại nơi đó thì xác nhận gì trước".

| Loại | Hình thái điển hình | Phù hợp làm gì | Phải xác nhận gì trước khi đăng |
| --- | --- | --- | --- |
| Diễn đàn / cộng đồng tổng hợp | Diễn đàn người chơi tiêu biểu là MCBBS, có mục máy chủ và mục tuyển người | Quảng bá bài dài, tuyển quản lý, tuyển kiến trúc sư | Còn hoạt động không, có cho quảng bá máy chủ không, đăng ở mục nào, có mẫu định dạng không |
| Video và chuyên mục | Video, chuyên mục, bài đăng trên nền tảng như Bilibili | Trình bày cách chơi thật, tạo ấn tượng "máy chủ này có người làm nghiêm túc" | Có cho để IP trong mô tả hoặc bình luận không, có tính là quảng cáo thương mại không, có cần ghi nhãn không |
| Tieba | Các tieba liên quan MC | Tiếp cận phạm vi nhỏ, tương tác kiểu hỏi đáp | Quy định điều hành có cấm quảng bá không, có chỉ cho đăng trong lầu tập trung không |
| Cộng đồng nhắn tin tức thời | Nhóm QQ, máy chủ Discord | Đồng hành lâu dài, thông báo hoạt động, chăm sóc khách | Quy định nhóm, có cho liên kết ngoài không, có trao đổi trước với quản trị viên được không |
| Trang danh sách / trang điều hướng máy chủ | Các trang danh sách và điều hướng máy chủ, gồm cả trang này | Lưu lượng thụ động, được lọc ra theo phiên bản và cách chơi | Yêu cầu thu thập, quy chuẩn nhãn, có cần liên kết chéo không, ghim có tính phí không |
| Người quen / streamer / cộng đồng trường học | Bạn bè, bạn học, nhóm người xem streamer nhỏ | Mấy người chơi thật đầu tiên | Ý muốn của họ; đừng mặc định người khác sẽ quảng bá giúp |

Vài nguyên tắc thực hành:

- **Lặn trước, nói sau**. Vào bất kỳ cộng đồng nào, xem trước họ thường trao đổi thế nào, quản trị viên thái độ ra sao, có ai vì đăng quảng cáo mà bị xử lý không.
- **Mỗi nơi một bản**. Dán thẳng cùng một bài quảng bá lên mọi nền tảng thường hỏng ở định dạng (ảnh chết, bố cục rối, liên kết bị nuốt).
- **Ghi lại hiệu quả kênh**. Cùng một kênh đăng ba lần mà không mang lại lần vào máy chủ hiệu quả nào thì nên bỏ, chứ không phải tăng tần suất.
- **Đừng giả tạo độ hot**. Treo người ảo, farm số trực tuyến, mua lượt nhấp, ngắn hạn lừa được xếp hạng trang danh sách, dài hạn nhất định bị người chơi phát hiện, mà nhãn "máy chủ này farm số liệu" không rửa được.

## 4. Một bài quảng bá máy chủ đạt chuẩn nên gồm gì

Nhiệm vụ của bài quảng bá không phải "mô tả máy chủ bạn tốt thế nào", mà là **để người chơi trong 10 giây trả lời bốn câu hỏi**: đây là gì? có phù hợp với tôi không? giờ chơi được chưa? vào thế nào?

| Yếu tố | Vì sao bắt buộc phải có | Lỗi thường gặp |
| --- | --- | --- |
| Định vị một câu | Quyết định người chơi có đọc tiếp không | Chỉ viết "máy chủ tốt nhất" |
| Phiên bản hỗ trợ | Client lệch phiên bản là không vào được | Viết "mọi phiên bản", thực tế chỉ hỗ trợ một hai |
| Bản quyền / ngoại tuyến | Quyết định người chơi vào được không, và có muốn vào không | Không viết, hoặc nói mập mờ |
| Đặc sắc cách chơi | Nói rõ khác biệt với người khác | Liệt kê vài chục tên plugin, người chơi không hiểu |
| Phần cứng và độ ổn định | Người chơi quan tâm có lag không, có đột ngột đóng không | Khoác "không bao giờ lag", vào là tụt FPS |
| Cách tham gia | Hạ thấp ngưỡng vào | Chỉ có số nhóm, không có IP hay tên miền |
| Ảnh chụp hoặc video | Thứ duy nhất chứng minh "thật có người đang chơi" | Dùng ảnh chụp dàn cảnh chế độ sáng tạo, vào là chênh lệch lớn |
| Liên kết quy tắc | Sàng lọc trước người không phù hợp | Quy tắc chỉ viết trong nhóm, người mới không thấy |
| Cách liên hệ | Có việc tìm được người | Để một email lâu ngày không xem |
| Giờ trực tuyến và giờ mở máy chủ | Để người chơi phán đoán "có phải máy chủ mới, khi nào đông" | Không viết, người chơi tưởng máy chủ zombie |

### 4.1 Mẫu điền chỗ trống

```
[Tên máy chủ] ______
[Định vị một câu] Đây là máy chủ ______ dành cho ______, khác biệt là ______
[Phiên bản hỗ trợ] Java phiên bản ______; có hỗ trợ Bedrock Edition không: ______
[Yêu cầu tài khoản] Bản quyền / ngoại tuyến (nếu hỗ trợ đăng nhập hỗn hợp hãy ghi rõ)
[Đặc sắc cách chơi] 1. ______  2. ______  3. ______
[Phần cứng và độ ổn định] Vị trí host: ______; đỉnh trực tuyến hằng ngày: ______; độ khả dụng tháng gần nhất: ______
[Cách tham gia] IP hoặc tên miền: ______; cổng: ______; cách vào nhóm: ______
[Giờ mở máy chủ] ______ (máy chủ mới hãy ghi thẳng "máy chủ mới", đừng giả làm máy chủ lâu năm)
[Quy tắc] ______ (liên kết)
[Cách liên hệ] ______
[Ảnh chụp hoặc video] ______
```

### 4.2 Những điểm trừ thường gặp

- Cả bài không có một ảnh chụp trong game thật, chỉ có logo máy chủ và ảnh quảng bá.
- Dùng những cam kết không kiểm chứng được như "tốt nhất trong lịch sử" "tuyệt đối không lag" "không bao giờ đóng".
- Coi danh sách plugin là giới thiệu cách chơi, viết vài chục tên plugin.
- Bố cục hoa mỹ đến mức không nhìn rõ IP.
- Để cách liên hệ, nhưng ba ngày không trả lời một tin.

## 5. Chiến lược video và video ngắn

Video là **cách trình bày hiệu quả nhất hiện nay về mặt hiệu quả trên chi phí**, vì nó đồng thời chứng minh ba việc: thật có người đang chơi, hình ảnh trông thế nào, máy chủ có lag không.

### 5.1 Móc câu ba mươi giây

3 giây đầu quyết định người xem có vuốt đi không. Mở đầu hiệu quả thường đưa thẳng kết quả hình ảnh, chứ không đưa đoạn nhạc hiệu:

- Đưa thẳng một cảnh có sức va chạm thị giác (công trình lớn, máy redstone đang chạy, hỗn chiến trong hoạt động).
- Dùng một câu nói rõ "đây là gì, vì sao đáng xem", ví dụ "đây là đêm cỗ máy phân loại tự động đầu tiên của cả máy chủ được hoàn thành".
- Đừng đặt animation logo dài hơn 5 giây, đừng đặt thẻ tiêu đề "phim quảng bá máy chủ X".

### 5.2 Trình bày cách chơi thật, không phải logo

Người xem phân biệt được dàn cảnh và máy thật. **Đặt ống kính vào quá trình chơi liên tục từ góc nhìn người chơi**: đào mỏ, xây nhà, giao dịch, đánh quái, tham gia hoạt động. Nếu thứ hấp dẫn nhất của máy chủ là "không khí cộng đồng", thì quay tương tác trong khung chat, quá trình cùng xây nhà, tập hợp trước khi hoạt động bắt đầu.

### 5.3 Vì sao TPS ổn định ảnh hưởng đến hiệu quả quảng bá của bạn

**Lag trong video là nhìn thấy được**: thực thể giật, khối bật lại, người chơi dịch chuyển tức thời, phá khối chậm, vật rơi tích tụ. Người xem có thể không biết TPS là gì, nhưng nhất định cảm được "máy chủ này lag".

Nên trước khi quay phim quảng bá, xác nhận trạng thái máy chủ trước:

- Khung giờ quay tránh sao lưu, render bản đồ, sinh thế giới quy mô lớn.
- Dùng [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) xác nhận TPS và MSPT bình thường, đừng cố quay trong lúc lag.
- Quay xong tự xem lại một lần, trọng tâm là chuyển động thực thể và tương tác khối có mượt không.
- Nếu thật có điểm yếu hiệu năng, thà thu nhỏ phạm vi quay, chứ đừng dùng dựng phim che đi.

:::tip Tư liệu là đầu tư một lần, dùng lại được
Một lần quay có thể cắt ra: một video ngắn 30 giây, một video dài 3 phút, vài ảnh chụp, một đoạn tổng kết hoạt động. **Nghĩ trước tư liệu sẽ dùng lại ở đâu, rồi mới quyết định quay gì**, tiết kiệm hơn nhiều so với mỗi lần đi tìm tư liệu.
:::

## 6. Gửi bài lên trang danh sách và trang điều hướng máy chủ

Giá trị của trang danh sách nằm ở **lưu lượng thụ động**: khi người chơi lọc theo phiên bản, cách chơi, số trực tuyến có thể gặp bạn. Nó không mang lại tăng trưởng bùng nổ, nhưng là độ hiển thị nền "treo ở đó lâu dài".

Yêu cầu thu thập điển hình (các trang khác nhau rất nhiều, đối chiếu từng mục trước khi gửi):

| Yêu cầu | Mô tả |
| --- | --- |
| Nhãn phiên bản và cách chơi chính xác | Ghi sai phiên bản sẽ khiến người chơi vào rồi phát hiện không vào được, mất luôn và có thể bị đánh giá xấu |
| IP / tên miền và cổng | Phải là địa chỉ người chơi kết nối trực tiếp được, không thể chỉ đưa số nhóm |
| Ghi rõ bản quyền / ngoại tuyến | Tương ứng điều kiện lọc của trang danh sách |
| Ảnh chụp | Thường yêu cầu ảnh chụp thật trong game |
| Văn bản giới thiệu | Có giới hạn số chữ, thử thách định vị một câu của bạn |
| Điều kiện thu thập | Có nơi yêu cầu liên kết chéo, có nơi yêu cầu đạt số trực tuyến tối thiểu, có nơi có vị trí ghim tính phí |
| Duy trì thông tin | Cập nhật phiên bản, đổi IP phải chủ động sửa, nếu không người chơi không kết nối được |

Hai điểm cần nói rõ:

- **Ghim và vị trí quảng cáo mua được lưu lượng, không mua được sự ở lại.** Bỏ tiền kéo người vào, trải nghiệm ngày đầu kém, người vẫn đi, mà tiền hết thì lưu lượng đứt.
- **Xếp hạng thường liên quan số trực tuyến, tỷ lệ nhấp.** Điều này nghĩa là "quảng bá" và "giữ chân" là hai mặt của cùng một việc: không giữ được người, thứ hạng tự tụt xuống.

## 7. Vận hành cộng đồng

Quảng bá giải quyết "đến", vận hành giải quyết "ở lại". Một máy chủ không vận hành, hiệu quả quảng bá sẽ suy giảm theo đơn vị ngày.

### 7.1 Quy tắc

- **Ít mà rõ**. Mười điều quy tắc thực thi được tốt hơn năm mươi điều không ai nhớ.
- **Công khai dễ thấy**. Quy tắc phải ở nơi người chơi thấy được mà không cần hỏi ai, tham khảo [Quy chuẩn cộng đồng](/rules).
- **Xử phạt có bậc**. Nhắc nhở, cảnh cáo, hạn chế tạm thời, cấm vĩnh viễn, mỗi bậc đều phải ghi rõ điều kiện kích hoạt.
- **Quản trị viên cũng phải tuân quy tắc**. Một khi xuất hiện cáo buộc lạm dụng quyền, nó tổn thương niềm tin người chơi hơn bất kỳ gian lận nào.

### 7.2 Hướng dẫn người mới và trải nghiệm ngày đầu

Năm phút đầu tiên người chơi mới vào máy chủ quyết định họ có năm phút tiếp theo không. Mục tiêu thiết kế chỉ một: **để họ trong 10 phút làm xong một việc**.

- Điểm sinh phải có hướng dẫn thị giác rõ ràng: biển chỉ đường, công trình mốc, NPC hoặc bảng thông báo, nói cho họ "đi hướng nào, làm gì trước".
- Cung cấp một lộ trình phát triển ngắn nhất: ví dụ "nhận dụng cụ người mới trước, rồi đến khu A đào mỏ, quay về điểm sinh nộp nhiệm vụ, cuối cùng nhận khoản vốn khởi đầu đầu tiên".
- Ưu đãi người mới có thể có, nhưng **đừng phá kinh tế**. Cho quá nhiều tiền và vật tư bằng cách để người mới bỏ qua toàn bộ giai đoạn đầu của trò chơi, cũng khiến họ không cảm nhận được sự trưởng thành.
- Đừng chất đầy biển thông báo và menu dịch chuyển ở điểm sinh, quá tải thông tin bằng không có thông tin.

### 7.3 Đón người mới

- **Người thật chào hỏi** hữu ích gấp trăm lần câu chào tự động. Có người gọi tên người mới trên kênh công cộng, xác suất họ ở lại tăng rõ rệt.
- Đặt khái niệm "trực ca": ít nhất bảo đảm có người trả lời được câu hỏi trong một khung giờ nào đó.
- Đừng dùng bot chào kiểu spam, nó chỉ khiến người mới thấy ở đây không có ai.

### 7.4 Hoạt động và lịch định kỳ

- **Lịch cố định** tốt hơn tổ chức hoạt động ngẫu nhiên. Ví dụ "20:00 thứ Bảy hằng tuần thi xây dựng" "21:00 Chủ Nhật hằng tuần tìm kho báu", người chơi hình thành được kỳ vọng.
- Thông báo trước, và nhắc lại một lần 10 phút trước khi hoạt động bắt đầu.
- Quy mô hoạt động phải khớp nhân lực của bạn. Hoạt động đã cam kết mà không làm được còn tổn thương hơn không tổ chức hoạt động.
- Giữ ghi chép hoạt động (ảnh chụp, tuyển tập, thông báo kết quả), chúng vừa là tư liệu quảng bá, vừa là ký ức cộng đồng.

### 7.5 Kênh phản hồi

- Chỉ để **một** cổng phản hồi rõ ràng, đừng để người chơi phải hét ở năm nhóm khác nhau.
- Công khai kết quả xử lý: đã nhận, đã sửa, không sửa (và nói rõ lý do). Người chơi không sợ bị từ chối, sợ là không có hồi âm.

## 8. Giữ chân: vì sao người chơi rời đi trong 10 phút đầu

Đại đa số mất người xảy ra **trong mười phút đầu sau khi vào máy chủ**, và nguyên nhân thường không liên quan "cách chơi không đủ nhiều".

| Nguyên nhân rời đi | Cảm nhận thật của người chơi | Có thể sửa thế nào |
| --- | --- | --- |
| Điểm sinh không hiểu | "Tôi không biết phải làm gì" | Hướng dẫn rõ ràng và lộ trình phát triển ngắn nhất |
| Lag, rớt mạng | "Máy chủ này sắp đóng rồi à" | Giải quyết hiệu năng trước, rồi mới nói quảng bá |
| Không ai nói chuyện | "Đây không có ai, máy chủ chết" | Người thật đón người mới, bảo đảm có người trực |
| Không tìm thấy mục tiêu | "Xây cái nhà rồi sao nữa" | Hệ thống trưởng thành và mục tiêu rõ ràng |
| Bị người chơi cũ áp đảo | "Tôi mãi không đuổi kịp" | Kiểm soát chênh lệch tài nguyên, hạn chế cướp bóc |
| Quy tắc không rõ bị xử phạt | "Tự nhiên bị cấm" | Quy tắc công khai, xử phạt có lưu vết |
| Cảm giác sắp đóng máy chủ | "Không muốn đầu tư thời gian" | Công khai kế hoạch mở máy chủ và giải thích độ ổn định |
| Mức độ nạp tiền | "Không bỏ tiền là không chơi được" | Xem bên dưới |

### 8.1 Đừng làm pay-to-win

Thu phí có thể bán **ngoại hình, tiện lợi, nhãn người ủng hộ**, không bán **sức mạnh**. Lý do không phải thuyết giáo đạo đức, mà vì nó trực tiếp phá hủy việc giữ chân:

- Nạp tiền mạnh hơn khiến người chơi miễn phí kết luận "máy chủ này không dành cho tôi", rời đi là lựa chọn lý trí.
- Một khi người chơi tin "tiền giải quyết được mọi thứ", mọi thiết kế cách chơi của bạn mất ý nghĩa.
- Niềm tin vỡ rất khó sửa, mà danh tiếng máy chủ lan truyền trong cộng đồng người chơi cực nhanh.

### 8.2 Lộ trình phát triển phải nhìn thấy được

Cho người chơi một lộ trình tự trả lời được "bước tiếp theo làm gì": mục tiêu ngắn hạn (hôm nay làm xong), mục tiêu trung hạn (tuần này làm xong), mục tiêu dài hạn (tháng này thậm chí lâu hơn). Lộ trình không cần phức tạp, nhưng phải **viết ở nơi người chơi thấy được**.

## 9. Quản lý và xử lý xung đột ở mức cộng đồng

Chống phá hoại về kỹ thuật xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) và [[JAVA] Plugin an ninh](/tutorials/ops/security-java); ở đây nói về phần **giữa người với người**.

- **Xử lý phải có lưu vết**. Cấm, quay lui, xử phạt đều để lại bản ghi, tránh cáo buộc "lạm dụng quyền". Plugin ghi chép cung cấp được chứng cứ.
- **Cố định quy trình**: nhắc riêng, cảnh cáo công khai, xử phạt tạm thời, xử phạt vĩnh viễn, nâng dần từng bậc. Nhảy bậc xử phạt sẽ gây tranh cãi.
- **Không ra quyết định trong lúc cảm xúc**. Người chơi chửi bạn, và việc họ có vi phạm quy tắc hay không là hai chuyện.
- **Xử lý tranh chấp công khai**. Công khai căn cứ quy tắc và kết quả xử lý hữu ích hơn cãi trăm câu trong nhóm.
- **Nội bộ đội ngũ cũng phải có quy tắc**. Quản trị viên không được mở đèn xanh cho bạn bè mình; đây là nguyên nhân phổ biến nhất khiến cộng đồng sụp đổ.

Thảo luận thêm về phân công đội ngũ, tiền và quản lý người chơi, xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java).

## 10. Những số liệu đáng theo dõi

Không cần nền tảng dữ liệu phức tạp, một bảng là đủ. **Xem xu hướng, đừng xem điểm đơn lẻ.**

| Chỉ số | Hiểu thế nào | Mô tả |
| --- | --- | --- |
| Giữ chân ngày hôm sau | Người mới đến hôm nay, mai có đến không | Chỉ số phản ánh trải nghiệm ngày đầu tốt nhất |
| Giữ chân 7 ngày | Một tuần sau còn ở không | Phản ánh lộ trình phát triển và không khí cộng đồng |
| Đỉnh số trực tuyến | Một ngày có nhiều nhất bao nhiêu người cùng trực tuyến | Cả sức chịu tải máy chủ và xếp hạng trang danh sách đều xem nó |
| Thời lượng trực tuyến trung bình | Người chơi vào một lần ở bao lâu | Ngắn mà thường xuyên nghĩa là nội dung không đủ; dài mà ổn định nghĩa là có độ bám |
| Tỷ lệ rời đi ngày đầu | Tỷ lệ vào máy chủ xong thoát ra rất nhanh | Xem cùng điểm sinh và hướng dẫn |
| Nguồn kênh | Người chơi biết bạn từ đâu | Quyết định lần sau dồn sức vào đâu |
| Mức hoạt động chat | Có bao nhiêu người đang nói | Máy chủ im lặng trông như máy chủ chết |

Hai lời nhắc:

- **Mẫu nhỏ đừng suy diễn quá mức.** Một ngày 5 người đến, 3 người đi, không tạo thành kết luận nào. Ít nhất xem xu hướng hai tuần.
- **Số liệu phải khớp được với hành động.** Giữ chân kém thì đi xem điểm sinh và hướng dẫn, chứ không phải đi đăng thêm vài bài quảng cáo. **Quảng bá phóng to trải nghiệm, không bù đắp trải nghiệm.**

## 11. Danh sách tuần lên sóng

Từ một tuần trước khi mở máy chủ đến một tuần sau, đối chiếu từng mục theo bảng dưới.

- [ ] Định vị một câu đã viết xong, và dùng nó lọc được người chơi không phù hợp
- [ ] Phiên bản hỗ trợ, bản quyền / ngoại tuyến, có chơi chéo không đã xác định và viết vào mọi văn bản
- [ ] Máy chủ đã chạy ổn định liên tục đủ lâu trước khi mở, không sập thường xuyên
- [ ] Hiệu năng đã xác nhận (TPS, MSPT, bộ nhớ, ghi đĩa), khung giờ quay tránh sao lưu và render
- [ ] Điểm sinh có hướng dẫn rõ ràng, người mới trong 10 phút làm xong một việc
- [ ] Quy tắc đã thành văn bản và truy cập công khai được
- [ ] Ít nhất một người thật trực được trong khung giờ mở máy chủ để giải đáp
- [ ] Tư liệu bài quảng bá đầy đủ: định vị, phiên bản, yêu cầu tài khoản, đặc sắc cách chơi, giải thích độ ổn định, cách tham gia, ảnh chụp hoặc video, liên kết quy tắc, cách liên hệ
- [ ] Các kênh mục tiêu đã xác nhận quy định từng nơi, và được quản trị viên đồng ý (nếu cần)
- [ ] Thông tin trên trang danh sách / trang điều hướng máy chủ đã gửi và đối chiếu không sai
- [ ] Ít nhất một video 30 giây hoặc một bộ ảnh chụp thật đã chuẩn bị
- [ ] Lịch hoạt động đã định, và công bố trước khi mở máy chủ
- [ ] Cổng phản hồi duy nhất và có người xem
- [ ] Danh sách nội dung thu phí đã kiểm tra: chỉ bán ngoại hình và tiện lợi, không bán sức mạnh
- [ ] Bảng ghi số liệu đã lập, đã thỏa thuận thời gian cố định mỗi tuần rút kinh nghiệm một lần

## Bước tiếp theo

- Góc nhìn tổng thể về đội ngũ, tiền và quản lý người chơi: [[JAVA] Quản lý vận hành](/tutorials/ops/management-java)
- Cần xây nền kỹ thuật vững trước: [Nhập môn plugin](/tutorials/java/plugins), [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps)
- Chat, menu và ấn tượng đầu khi vào máy chủ: [Chat, menu và MOTD](/tutorials/java/cosmetic)
- Quy tắc và trật tự cộng đồng: [Quy chuẩn cộng đồng](/rules)
- Sau khi có sự cố thì tra thế nào: [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)

---

> Tên, chức năng và tình trạng bảo trì của từng plugin cụ thể lấy theo trang chính thức của plugin đó.
