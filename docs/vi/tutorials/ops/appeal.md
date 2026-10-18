---
title: Quy trình chuẩn cho khiếu nại và cấm người chơi
slug: appeal
cat: ops
level: 3
order: 27
minutes: 16
tags: [cấm, khiếu nại, quy tắc máy chủ, quản lý vận hành, lưu chứng cứ, quy trình chuẩn]
updated: 2026-10-04
draft: false
---

Cấm là hành động **duy nhất trong vận hành máy chủ trực tiếp tước quyền lợi tài khoản của người chơi**, và cũng là hành động dễ gây cãi vã nhất. Bài này không nói về công cụ, mà nói về **quy trình**: ai có quyền cấm người, cấm dựa trên căn cứ gì, cấm bao lâu, người chơi biện hộ thế nào, bạn trả lời ra sao.

Về công cụ xem [Hệ thống cấm liên hợp NDPReforged](/tutorials/ops/ndpr) (nói về cài và cấu hình danh sách cấm đồng bộ giữa các máy chủ), thu thập chứng cứ xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) và [[JAVA] Plugin an ninh](/tutorials/ops/security-java), quản lý người chơi hằng ngày xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java).

:::warn Lệnh và cấu hình trong bài này lấy tài liệu chính thức làm chuẩn
Tên plugin, cú pháp lệnh, đường dẫn và tên dịch vụ xuất hiện dưới đây **thay đổi theo phần mềm máy chủ, phiên bản plugin, bản phân phối và cách cài đặt**. Ví dụ có tác dụng giải thích "cần làm gì", **không phải sản phẩm hoàn chỉnh có thể chép thẳng**; trước khi áp dụng hãy đối chiếu tài liệu chính thức của plugin và hệ thống bạn đã cài, cùng tệp cấu hình thực tế sinh ra trên máy chủ của bạn.
:::

## 1. Vì sao cần một quy trình viết ra giấy

Đa số máy chủ không "hỏng vì quản quá chặt", mà **hỏng vì không có quy tắc để theo**. Viết ra giấy ít nhất giải quyết được bốn việc.

**Thứ nhất, tính nhất quán.** Cùng một hành vi, hôm nay cấm ba ngày, mai cấm vĩnh viễn, người chơi sẽ truyền tai nhau: "tùy người mà xử." Một khi người chơi tin rằng kết quả xử lý là ngẫu nhiên, quy tắc mất đi sức ràng buộc —— **uy lực đến từ tính dự đoán được, chứ không phải mức độ nghiêm khắc**.

**Thứ hai, chặn cáo buộc "lạm dụng quyền quản trị".** Chỉ cần việc cấm là "phán đoán lúc đó của tôi", thì bất kỳ lần cấm nào cũng có thể bị hiểu thành ân oán cá nhân. Còn "căn cứ Điều 3.2, chứng cứ là bản ghi CoreProtect, do A quyết định, do B phúc tra" là **một phát biểu kiểm chứng được**. Cáo buộc không vì thế mà biến mất, nhưng bạn có thứ để đưa ra.

**Thứ ba, giảm cãi vã vô ích.** Đại đa số "tranh chấp cấm" thực ra là **bất đối xứng thông tin**: người chơi không biết vì sao bị cấm, hoặc chỉ biết một câu "vi phạm quy định". Quy trình quy định "khi cấm bắt buộc ghi rõ lý do và thông báo kênh khiếu nại" xóa được hơn nửa số cuộc đối thoại kiểu này.

**Thứ tư, giúp chính bạn ít sai hơn.** Thời gian làm nguội, phúc tra, lưu hồ sơ, chi phí của mấy cơ chế này rất thấp, nhưng chặn được kiểu thao tác "nửa đêm bị chọc tức, tiện tay /ban" rồi hối hận.

:::tip Phiên bản khả dụng tối thiểu của quy trình
Nếu mỗi lần chỉ làm được một việc, thì làm việc này: **mỗi lần cấm đều để lại bản ghi năm yếu tố "thời gian, người chơi, lý do, vị trí chứng cứ, người quyết định"**. Dù chỉ là một kênh cố định trong Discord, cũng tốt hơn không có gì rất nhiều.
:::

## 2. Hành vi nào tính là có thể cấm

Quy tắc phải **ngắn, kiểm tra được, không dựa vào giải thích**. Danh sách dưới đây chép thẳng vào trang quy tắc của bạn được, trong ngoặc là điểm phán đoán.

| Hành vi | Điểm phán đoán |
| --- | --- |
| Phá công trình (Griefing) | Sửa công trình của người khác hoặc khu vực công cộng khi chưa được phép, có bản ghi khối để tra |
| Trộm cắp | Lấy vật phẩm từ vật chứa của người khác; plugin ghi chép cho ra "ai, khi nào, tọa độ nào" |
| Gian lận và lợi dụng lỗ hổng | Dùng hack, xuyên tường, auto click, hoặc lợi dụng lỗ hổng nhân bản, kẹt tường, farm vật phẩm |
| Phát ngôn thù địch | Phát ngôn công kích nhắm vào chủng tộc, giới tính, tôn giáo, xu hướng tính dục, vùng miền |
| Spam quảng cáo | Liên tục đăng máy chủ khác, máy chủ riêng hoặc thông tin giao dịch trên kênh công cộng |
| Doxxing và đe dọa | Công khai thông tin danh tính thật của người khác, hoặc đe dọa ngoài đời |
| Trốn cấm | Đổi tài khoản, đổi IP để vào tiếp; đây là **tình tiết tăng nặng**, không phải lỗi nhỏ độc lập |

Danh sách này có ba đặc trưng chung, cũng là lý do nó dùng được: **hành vi quan sát được** (có bản ghi hoặc ảnh chụp), **quy tắc đã công bố** (người chơi thấy trước được), **cách xử lý giải thích được** (bạn nói ra được vi phạm điều nào).

Nói thêm một câu về "trốn cấm": nó thường có nghĩa **nâng từ tạm thời lên vĩnh viễn**. Lý do không phải "bạn tệ hơn", mà là "bạn đã chứng minh biện pháp tạm thời không hiệu quả với bạn".

## 3. Cái gì không nên cấm

Điều quan trọng không kém là **ranh giới**. Cấm người trong những tình huống dưới đây là tự đẩy mình sang phía lý lẽ yếu.

- **Sai sót nhẹ lần đầu.** Lần đầu đào nhầm ruộng người khác, lần đầu nói sai trên kênh công cộng, lần đầu đặt đồ sai chỗ —— nhắc trước, yêu cầu khôi phục trước, hiệu quả hơn cấm thẳng, cũng dễ được chấp nhận hơn.
- **"Vi phạm" quy tắc chưa công bố.** Nếu một quy tắc chưa từng được viết ở nơi người chơi thấy được, thì **nó không tồn tại**. Bạn không thể phạt người khác vì họ không biết một quy định trong đầu bạn. Muốn phạt thì bổ sung quy tắc trước, và nói rõ "có hiệu lực từ hôm nay".
- **Bất đồng về cách hiểu quy tắc.** Người chơi hiểu quy tắc khác bạn, đây là tín hiệu **quy tắc viết chưa đủ rõ**, không phải ác ý. Phản ứng đúng là sửa quy tắc, không phải cấm người.
- **Hành vi bạn không thích.** Giỏi kỹ thuật, nói nhiều, hay góp ý, không tham gia hoạt động của bạn —— đều không phải hành vi có thể cấm.
- **Liên đới.** "Bạn của nó cũng chửi người" "IP này lần trước có vấn đề" không phải chứng cứ. Xử phạt nhắm vào **hành vi cụ thể của tài khoản cụ thể**.

:::note Một câu tự kiểm tra hữu dụng
Trước khi bấm cấm hãy tự hỏi: **nếu lần cấm này bị đăng công khai, tôi có thể chỉ dùng ba thứ "hành vi + quy tắc đã công bố + chứng cứ" để giải thích rõ không?** Nếu câu trả lời cần bổ sung "nó vốn đã thế" "tôi đã ngứa mắt nó từ lâu", thì lý do lần cấm này không đứng được.
:::

## 4. Yêu cầu về chứng cứ

**Cấm không có chứng cứ bằng giao quyền quyết định cho cuộc cãi vã.** Yêu cầu không cao, nhưng phải thỏa thuận trước:

| Loại chứng cứ | Tình huống áp dụng | Lưu ý |
| --- | --- | --- |
| Nhật ký (bản ghi khối / vật chứa) | Phá hoại, trộm cắp | Mạnh nhất, cho ra tọa độ và thời gian; **chỉ ghi được việc sau khi cài** |
| Nhật ký console máy chủ | Lạm dụng lệnh, đăng nhập bất thường | Sẽ mất theo luân chuyển nhật ký, cần lưu kịp thời |
| Ảnh chụp màn hình | Chat, quảng cáo, ngoại hình công trình | Dễ bị chất vấn là cắt xén, cố gắng giữ ngữ cảnh |
| Quay màn hình | Gian lận, hành vi liên tục | Dung lượng lớn, khuyến nghị giữ tệp gốc và dấu thời gian |
| Đầu ra plugin chống gian lận | Di chuyển bất thường, tấn công bất thường | Là chứng cứ **bổ trợ**, dùng riêng dễ phán đoán sai |

**Plugin ghi chép là nền móng của chuỗi chứng cứ.** Phương án phổ biến là **CoreProtect** (định vị chính thức: công cụ ghi dữ liệu và chống phá hoại dành cho máy chủ Minecraft, kho <https://github.com/PlayPro/CoreProtect>), sản phẩm thay thế cùng loại có **Prism** v.v. Hai giới hạn then chốt của nó phải nhớ:

1. **Nó chỉ ghi được việc xảy ra sau khi cài.** Bị phá rồi mới cài thì trước đó tra không ra gì.
2. **Nó ghi hành vi ở mức khối và vật chứa**, không ghi "ý định".

Đầu ra của plugin chống gian lận phải **dùng thận trọng**: phán đoán sai là có thật, nhất là khi mạng người chơi rung, TPS tụt rất thấp. Hãy coi nó là "tín hiệu đáng để người phúc tra xem lại", không phải "bản án". Phân công của cả hệ phòng thủ xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat), cấu hình quyền và plugin ghi chép xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java).

:::tip Chứng cứ phải lưu ra ngoài, chứ không để trên máy chủ
Ảnh chụp, quay màn hình, kết quả truy vấn xuất ra nên **chép ngay ra ngoài máy chủ** (máy của bạn, ổ đĩa mạng, kho riêng). Nhật ký sẽ bị luân chuyển, thế giới sẽ bị quay lui, dữ liệu plugin sẽ bị dọn, mà khiếu nại có thể một tháng sau mới đến.
:::

## 5. Thang xử lý theo mức độ

Cấm không nên là biện pháp duy nhất. **Ý nghĩa của thang là "cho hình phạt khớp với tình tiết"**, đồng thời cho người chơi cơ hội sửa.

| Tình tiết | Xử lý | Thời hạn | Cách ghi |
| --- | --- | --- | --- |
| Vi phạm nhẹ lần đầu (đào nhầm, lỡ lời trên kênh công cộng) | Nhắc nhở miệng/nhắn riêng | Không | Ghi chú trong nhật ký quản trị |
| Vi phạm nhẹ lặp lại, spam, xúc phạm nhẹ | Cấm chat (Mute) | 1 giờ ~ 24 giờ | Bản ghi plugin + nhật ký quản trị |
| Phá hoại, trộm cắp, tình tiết và giá trị có hạn | Cấm tạm thời | 1 ngày ~ 7 ngày | Bản ghi cấm + lưu chứng cứ |
| Phá hoại quy mô lớn, gian lận, phát ngôn thù địch, doxxing | Cấm dài hạn | 30 ngày ~ vĩnh viễn | Bản ghi cấm + lưu chứng cứ + phúc tra |
| Trốn cấm, phá hoại để trả thù | Cấm vĩnh viễn | Vĩnh viễn | Bản ghi cấm + lưu chứng cứ + phúc tra |
| Phán đoán sai / thiếu chứng cứ | Hủy bỏ và xin lỗi | Ngay | Ghi lý do hủy |

Vài quy tắc sử dụng:

1. **Nâng mức phải có căn cứ.** Từ nhắc nhở đến cấm, ở giữa phải có bản ghi "lần trước đã nhắc". Không có bản ghi thì không nâng mức.
2. **Cấm vĩnh viễn bắt buộc qua người thứ hai phúc tra** (xem mục sau).
3. **Thời hạn phải ghi rõ**. Sau `/ban` người chơi thấy là "bạn đã bị cấm", nên **bắt buộc đồng thời thông báo thời hạn và lý do**, nếu không khi khiếu nại bạn không tự chứng minh được.
4. **Ghi chép và xử lý xảy ra cùng lúc**. "Bản ghi" bổ sung sau khi việc đã rồi gần như vô hiệu trong tranh chấp.

Cú pháp lệnh cụ thể **tùy vào plugin cấm bạn dùng** (định dạng tham số `/ban`、`/tempban`、`/mute` của các plugin khác nhau), hãy lấy tài liệu chính thức của plugin đó làm chuẩn.

## 6. Ai ra quyết định

**"Ai cũng là quản trị viên" là điểm khởi đầu của sự sụp đổ quản trị máy chủ.** Không phải vì nó không tin người, mà vì nó khiến **trách nhiệm không định vị được, tiêu chuẩn không thống nhất được**.

Phân công tối thiểu khuyến nghị:

| Vai trò | Trách nhiệm | Mô tả |
| --- | --- | --- |
| Người quyết định (một người) | Phán đoán tình tiết, chọn cách xử lý, viết bản ghi | Mỗi vụ **chỉ có một** người quyết định, tránh "ai ra tay trước thì người đó nói" |
| Người phúc tra (một người khác) | Phúc tra cấm vĩnh viễn và vụ tranh chấp | **Không được cùng người với người quyết định**; chỉ xem chứng cứ và quy tắc, không xem tình cảm |
| Người tiếp nhận khiếu nại | Nhận khiếu nại, đối chiếu chứng cứ, trả lời | Có thể là người ngoài người quyết định, giảm cảm giác "tự xử chính mình" |
| Người giữ hồ sơ | Duy trì hồ sơ cấm và khiếu nại | Bảo đảm bản ghi không mất, tra được |

Vì sao "ai cũng là quản trị viên" phá hỏng tính nhất quán:

- **Tiêu chuẩn khác nhau.** Có người thấy spam không sao, có người thấy phải cấm vĩnh viễn.
- **Quyền không truy vết được.** Có vấn đề thì không xác định được ai đã quyết định, cũng không sửa được.
- **Bản thân quyền trở thành rủi ro.** Giá trị của plugin quyền (như LuckPerms) nằm ở **cấp quyền chi tiết theo node**, chứ không phải cho tất cả mọi người OP. Quyền OP bản gốc cực lớn, một khi tài khoản bị chiếm hoặc cảm xúc mất kiểm soát, phá hoại là toàn cục. Cấu hình xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java).
- **Áp lực tình cảm dồn vào số ít người.** Khi phân công rõ ràng, "bạn tôi bị cấm có thể nhân nhượng không" có một câu trả lời chuẩn: "tôi không phúc tra được, phải đi khiếu nại."

:::note Cách làm thực tế của máy chủ nhỏ
Nếu máy chủ chỉ có một mình bạn, không làm được "người thứ hai phúc tra", thì dùng **thời gian** thay người: cấm vĩnh viễn **thực thi sau 24 giờ**, và trong 24 giờ đó sắp xếp lại chứng cứ một lần. Cách một ngày rồi xem lại, nhiều quyết định bốc đồng tự biến mất.
:::

## 7. Kênh khiếu nại

Kênh khiếu nại phải **công khai, cố định, truy vết được**. Ba hình thức thường gặp:

| Hình thức | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Hộp thư riêng (như `appeal@example.com`) | Đơn giản, không cần hệ thống thêm, tự nhiên có lưu hồ sơ | Người chơi có thể gửi nhầm, định dạng nội dung không thống nhất |
| Trang diễn đàn/biểu mẫu | Trường kiểm soát được, tra công khai được (sau khi bỏ thông tin riêng) | Cần duy trì trang |
| Kênh ticket Discord | Ngưỡng thấp, trả lời nhanh | Dễ bị spam, cần quyền quản lý |

**Đừng dùng "nhắn riêng chủ máy chủ" làm kênh duy nhất.** Nhắn riêng không có bản ghi, không có xếp hàng, dễ bị cảm xúc dẫn dắt, cũng không chứng minh được bạn đã xử lý.

### 7.1 Các trường bắt buộc

Dù dùng kênh nào, biểu mẫu đều nên yêu cầu các trường sau. Thiếu một mục là trả lại, bản thân đó cũng là một cách sàng lọc.

| Trường | Bắt buộc | Mô tả |
| --- | --- | --- |
| Tên người chơi (ID trong game) | Có | Dùng để đối chiếu bản ghi cấm |
| Ngày và giờ bị cấm (kèm múi giờ) | Có | Tiện định vị bản ghi |
| Lý do hệ thống hiển thị | Có | Để người chơi nhắc lại lý do bạn viết, kiểm chứng được họ đã xem chưa |
| Trình bày của người chơi | Có | Đã xảy ra gì, vì sao cho rằng xử lý sai |
| Liên kết chứng cứ liên quan | Không | Ảnh chụp hoặc quay màn hình người chơi tự chuẩn bị |
| Cách liên hệ | Có | Dùng để trả lời, và **chỉ lưu nội bộ** |

### 7.2 Một mẫu khiếu nại dùng được ngay

```text
【Tên máy chủ】Mẫu khiếu nại cấm

1. ID trong game:
2. Ngày và giờ bị cấm (ghi rõ múi giờ):
3. Lý do hệ thống hiển thị khi cấm (chép nguyên văn):
4. Trình bày của bạn (ghi rõ diễn biến, trong 500 chữ):
5. Lý do bạn cho rằng xử lý sai (có thể chọn nhiều):
   [ ] Không phải tôi làm
   [ ] Tình huống không khớp bản ghi
   [ ] Hình phạt quá nặng
   [ ] Quy tắc chưa công bố / tôi không biết
   [ ] Khác (ghi rõ)
6. Liên kết chứng cứ (tùy chọn):
7. Cách liên hệ khả dụng (chỉ quản trị viên thấy):

Sau khi gửi, chúng tôi sẽ trả lời trong 72 giờ. Đừng gửi lại nhiều lần, gửi lại không làm nhanh hơn.
```

### 7.3 Thời hạn phản hồi (SLA)

**Đưa ra một cam kết thời gian rõ ràng, và cố gắng làm được.** Khuyến nghị:

- **Trả lời lần đầu: trong 72 giờ** (gồm cả trả lời trung gian kiểu "chúng tôi đã nhận, đang đối chiếu chứng cứ").
- **Vụ phức tạp (cấm vĩnh viễn, liên quan nhiều người): tối đa 7 ngày**, và trong 72 giờ phải báo "cần thêm thời gian".
- **Khi quá hạn chưa trả lời, người chơi có quyền thúc một lần**, và lần thúc này phải được ưu tiên xử lý.

Ý nghĩa của SLA không chỉ là lịch sự: **khiếu nại không có thời hạn bằng khiếu nại không tồn tại**, người chơi trong lúc chờ sẽ chuyển bất mãn sang cả cộng đồng.

:::warn Đừng cam kết thời hạn bạn làm không được
Viết "trả lời trong 24 giờ" rất đẹp, nhưng một lần lỡ trả lời là cả bộ quy tắc mất tín nhiệm. **Thà viết 72 giờ và làm ổn định.**
:::

## 8. Nhận được khiếu nại thì xử lý thế nào

Hành động cố định, đi theo thứ tự:

1. **Đăng ký.** Ghi thời gian nhận, người khiếu nại, mã bản ghi cấm tương ứng. **Đăng ký trước rồi mới phán đoán**, tránh "xem rồi quên".
2. **Đối chiếu chứng cứ.** Quay về chứng cứ gốc: kết quả truy vấn của plugin ghi chép, đoạn nhật ký, ảnh chụp nguyên bản. **Đừng dựa vào trí nhớ, cũng đừng dựa vào kết luận người khác kể lại.**
3. **Xác nhận căn cứ quy tắc.** Tìm điều khoản quy tắc được dẫn lúc đó. Nếu không tìm thấy, bản thân đó là vấn đề (xem mục 11).
4. **Ra kết luận**, chỉ có ba loại:
   - **Giữ nguyên (Uphold)**: chứng cứ đầy đủ, xử lý khớp tình tiết. Khi trả lời đưa ra lý do và tóm tắt chứng cứ.
   - **Giảm nhẹ (Reduce)**: hành vi thành lập, nhưng hình phạt quá nặng hoặc đã gần hết hạn. Đổi thành thời hạn ngắn hơn hoặc nhắc nhở.
   - **Hủy bỏ (Lift)**: thiếu chứng cứ, phán đoán sai, quy tắc chưa công bố. Gỡ ngay và giải thích.
5. **Trả lời bằng văn bản.** Trả lời qua kênh người chơi cung cấp, gồm: kết luận, quy tắc làm căn cứ, tóm tắt chứng cứ (không cần công khai toàn bộ chi tiết), các bước tiếp theo. **Không dùng giọng mỉa mai, không trích lời người chơi để phản bác họ.**
6. **Lưu hồ sơ.** Ghi nguyên văn khiếu nại, kết luận của bạn, dấu thời gian vào cùng một bản ghi. **Bước này dễ bị bỏ qua nhất, và cũng then chốt nhất** —— nó là tham chiếu khi lần sau bạn gặp vụ tương tự.
7. **Thống kê.** Định kỳ xem một lần: lượng khiếu nại, tỷ lệ giữ nguyên, tỷ lệ hủy. Tỷ lệ hủy cao nghĩa là khâu phán đoán phía trước có vấn đề; lượng khiếu nại đột nhiên tăng thường cho thấy quy tắc hoặc truyền thông có vấn đề.

:::tip Mẫu trả lời (giữ nguyên)
"Chúng tôi đã đối chiếu bản ghi khối ngày <ngày>: <số lượng> khối tại <tọa độ> đã bị tài khoản của bạn gỡ vào <thời gian>, hành vi này vi phạm điều <số> của quy tắc. Vì vậy lần cấm này được giữ nguyên, thời hạn đến <ngày>. Nếu bạn cho rằng bản ghi có sai, có thể bổ sung giải thích."
:::

## 9. Công khai và minh bạch

Minh bạch không phải "công khai mọi thứ", mà là **để quy tắc và tiêu chuẩn xử lý có thể bị kiểm chứng**.

| Cách làm | Khuyến nghị | Mô tả |
| --- | --- | --- |
| Trang quy tắc | Bắt buộc có | Công khai, liên kết ổn định, ghi ngày cập nhật cuối và ngày có hiệu lực |
| Danh sách cấm | Tùy chọn | Công khai "tên người chơi + lý do + thời hạn" là đủ, xem ranh giới riêng tư bên dưới |
| Tổng hợp định kỳ | Khuyến nghị | Ví dụ mỗi tháng một dòng: "tháng này cấm N vụ, trong đó vĩnh viễn M vụ, hủy K vụ" |
| Thống kê khiếu nại | Khuyến nghị | Cho người chơi thấy kênh này có hiệu lực, giảm ấn tượng "khiếu nại vô ích" |

**Ranh giới riêng tư (bắt buộc tuân thủ):**

- **Đừng công bố họ tên thật, địa chỉ, số điện thoại, email, tài khoản mạng xã hội, nơi làm việc** hay bất kỳ thông tin danh tính cá nhân nào.
- **Đừng công khai địa chỉ IP đầy đủ của người chơi**. Khi cần nói rõ thì dùng mặt nạ (ví dụ chỉ giữ dải mạng), và chỉ dùng giá trị đầy đủ trong bản ghi nội bộ.
- **Đừng kèm toàn bộ ngữ cảnh của đoạn chat gốc trong giải thích công khai**, chỉ trích phần liên quan trực tiếp đến phán đoán.
- **Thông tin của người chơi chưa thành niên đặc biệt nhạy cảm**, mọi nội dung định vị được đến cá nhân đều không nên công khai.
- **Khi công khai lý do cấm hãy diễn đạt bằng điều khoản quy tắc** ("phá công trình người khác"), chứ không phải mô tả cảm tính ("tái phạm, nhân phẩm kém").

:::warn Công bố thông tin cá nhân của người chơi tự nó là vấn đề
Dán họ tên thật, địa chỉ, số điện thoại, tài khoản mạng xã hội hoặc IP đầy đủ của người chơi lên kênh công khai hay diễn đàn, **bất kể đối phương đã làm gì, đều là việc không được làm**. Nó biến máy chủ của bạn từ "bên xử lý vi phạm" thành "bên gây tổn hại", có thể vi phạm điều khoản nền tảng và pháp luật địa phương, cũng khiến người chơi khác ngừng tin bạn ngay lập tức. Người chơi vi phạm thì xử theo quy tắc; **dùng thông tin riêng tư làm công cụ trả thù là một trong những sai lầm nghiêm trọng nhất của người vận hành**. Nếu loại thông tin này đã bị đăng: xóa ngay, cố gắng thông báo cho người liên quan, ghi lại chuyện đã xảy ra, và nói rõ trong nội bộ "không ai được làm thế".
:::

## 10. Điều kiện gỡ cấm và thời gian theo dõi

Cấm vĩnh viễn cũng không nên là "mãi mãi không có lối ra". Đưa ra **lối ra kiểm chứng được** làm giảm rõ rệt tranh chấp dài hạn.

| Loại | Điều kiện gỡ | Thời gian theo dõi |
| --- | --- | --- |
| Cấm tạm thời | Hết hạn tự động gỡ | Không (nhưng giữ bản ghi) |
| Cấm dài hạn (trên 30 ngày) | Hết hạn + trong khiếu nại thừa nhận hành vi và cam kết không tái phạm | Tái phạm trong 30 ngày là vĩnh viễn |
| Cấm vĩnh viễn (lần đầu, không ác tính) | Sau 6~12 tháng khiếu nại, trình bày thay đổi | 60~90 ngày, trong thời gian đó mọi vi phạm quay lại vĩnh viễn |
| Cấm vĩnh viễn (doxxing, đe dọa ngoài đời, phá hoại trả thù) | Thường không gỡ | — |
| Phán đoán sai | Gỡ ngay và xin lỗi | Không |

Viết rõ "thời gian theo dõi" có lợi hai chiều: người chơi biết cái giá, bạn biết **lần sau không cần thảo luận lại**.

:::note Gỡ cấm không bằng xóa bản ghi
Gỡ cấm nên **thêm một bản ghi** ("ngày X gỡ cấm, lý do: khiếu nại thông qua / hết hạn"), chứ không xóa bản ghi gốc. Xóa bản ghi sẽ khiến bạn mất tham chiếu ở vụ tương tự lần sau, cũng không thống kê được tỷ lệ hủy.
:::

## 11. Cấm nhầm thì làm gì

**Phán đoán sai nhất định sẽ xảy ra.** Thứ quyết định danh tiếng máy chủ không phải "không bao giờ sai", mà là **sau khi sai thì làm thế nào**.

1. **Gỡ cấm ngay**, đừng đợi quy trình khiếu nại chạy xong. Khi thiếu chứng cứ, "gỡ trước rồi bàn" là thứ tự đúng.
2. **Xin lỗi rõ ràng**, dùng từ trực tiếp: "lần này chúng tôi phán đoán sai, xin lỗi." Đừng dùng kiểu né tránh "nếu gây bất tiện cho bạn, chúng tôi lấy làm tiếc" —— nó còn đau hơn là không xin lỗi.
3. **Nói rõ nguyên nhân** (ngắn gọn là được): dữ liệu plugin ghi chép bị đọc nhầm, chống gian lận báo sai, nhầm tài khoản trùng tên. Cho người chơi thấy bạn **biết** sai ở đâu.
4. **Đánh dấu hủy trong bản ghi**, ghi rõ ngày và lý do. Đây là căn cứ cho thống kê và cải tiến quy trình sau này.
5. **Vá quy trình**, chứ không chỉ vá lần này:
   - Chống gian lận báo sai nhiều → chỉnh ngưỡng phán đoán, đổi thành "phúc tra thủ công rồi mới cấm".
   - Nhầm tài khoản trùng tên → yêu cầu mọi bản ghi cấm **lấy UUID làm chuẩn**, không chỉ ghi tên người chơi.
   - Một người quyết → thêm phúc tra hoặc thời gian làm nguội 24 giờ cho cấm vĩnh viễn.
   - Quy tắc chưa công bố → bổ sung trang quy tắc và thông báo ngày có hiệu lực.

**Một lỗi được thừa nhận công khai giữ được người chơi hơn mười lời tuyên bố "chúng tôi không bao giờ sai".**

## 12. Danh sách quy trình một trang

In ra hoặc dán trong kênh quản trị. **Mỗi bước đều phải trả lời được "đã để lại cái gì".**

**Trước khi cấm**

- [ ] Hành vi tương ứng điều khoản quy tắc đã công bố (nói ra được điều thứ mấy)
- [ ] Đã có chứng cứ, và đã chép ra ngoài máy chủ
- [ ] Đã loại trừ hai tình huống "sai sót nhẹ lần đầu" và "quy tắc chưa công bố"
- [ ] Đã xác nhận hình phạt khớp tình tiết (đối chiếu thang ở mục 5)

**Khi cấm**

- [ ] Đã điền đủ năm yếu tố thời gian, tên người chơi (kèm UUID), lý do, vị trí chứng cứ, người quyết định
- [ ] Lý do ghi là **hành vi**, không phải đánh giá
- [ ] Đã thông báo cho người chơi thời hạn và kênh khiếu nại
- [ ] Cấm vĩnh viễn đã vào phúc tra (hoặc đã đặt thời gian làm nguội 24 giờ)

**Khi nhận khiếu nại**

- [ ] Đã đăng ký (thời gian nhận + bản ghi cấm tương ứng)
- [ ] Đã quay về chứng cứ gốc đối chiếu, không dựa vào trí nhớ
- [ ] Đã xác nhận căn cứ quy tắc thực sự tồn tại và đã công bố
- [ ] Kết luận là một trong ba: giữ nguyên / giảm nhẹ / hủy bỏ, không có "để xem đã"
- [ ] Đã trả lời bằng văn bản trong SLA
- [ ] Nguyên văn khiếu nại và kết luận đã được lưu hồ sơ

**Công khai và rút kinh nghiệm**

- [ ] Trang quy tắc có liên kết, có ngày cập nhật
- [ ] Nội dung công khai không chứa họ tên thật, cách liên hệ, IP đầy đủ và thông tin cá nhân khác
- [ ] Bản ghi đã hủy có đánh dấu lý do
- [ ] Đã thống kê lượng khiếu nại, tỷ lệ giữ nguyên, tỷ lệ hủy
- [ ] Đã vá khâu phán đoán nhắm vào tỷ lệ hủy cao

## Bước tiếp theo

- Cài và cấu hình danh sách cấm thống nhất giữa các máy chủ: xem [Hệ thống cấm liên hợp NDPReforged](/tutorials/ops/ndpr)
- Phân công tổng thể giữa chống gian lận, ghi chép và quay lui: xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)
- Cấu hình cụ thể của plugin quyền, đăng nhập và ghi chép: xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java)
- Quản lý người chơi và vận hành hằng ngày: xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java)
- Sau khi có sự cố thì thu thập chứng cứ và rút kinh nghiệm thế nào: xem [Thu thập chứng cứ sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics)

---

> Script và cấu hình lấy theo tài liệu chính thức của hệ thống và phần mềm bạn dùng.
