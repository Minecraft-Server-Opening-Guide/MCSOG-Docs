---
title: Cách đọc dòng thời gian phiên bản
slug: versions-guide
cat: wiki
level: 2
order: 4
minutes: 13
tags: [phiên bản, dòng thời gian, giao thức, số phiên bản, bedrock, nâng cấp, client]
updated: 2026-10-04
draft: false
---

**Dòng thời gian phiên bản** của trang này ([/wiki/versions](/wiki/versions)) liệt kê các bản chính thức của Java Edition và Bedrock Edition theo thứ tự thời gian đảo ngược. Đây là lối tra cứu đầu tiên cho những câu hỏi kiểu "tôi nên mở phiên bản nào, khi nào nâng cấp, vì sao người chơi không vào được".

Nhưng bản thân dòng thời gian chỉ đưa ra **số phiên bản, ngày tháng và một dòng mô tả**. Trang này giải thích rõ: mỗi trường đó nghĩa là gì, những trực giác nào là sai, và làm thế nào biến nó thành một quyết định nâng cấp cụ thể.

> Quy tắc đặt tên số phiên bản, phiên bản giao thức và nhịp phát hành do chính thức quyết định, có thể điều chỉnh bất cứ lúc nào. Bài này chỉ giải thích **cách đọc dòng thời gian của trang này**; một phiên bản cụ thể hỗ trợ gì, yêu cầu gì, lấy ghi chú phát hành chính thức làm chuẩn.
:::note Trang này giải quyết bốn câu hỏi
- Mỗi dòng trên dòng thời gian, từng trường nghĩa là gì;
- Số phiên bản của Java Edition và Bedrock Edition được tách ra thế nào;
- Nhãn LTS / CROSS-PLAY đại diện cho điều gì, và không đại diện cho điều gì;
- Vì sao "ngày phát hành" không thể trả lời "client của tôi có vào được không".
:::

## 1. Dòng thời gian ở đâu, mỗi dòng là gì

| Trang | Nội dung |
| --- | --- |
| [/wiki/versions](/wiki/versions) | Mặc định mở dòng thời gian Java Edition |
| [/wiki/versions/java](/wiki/versions/java) | Dòng thời gian Java Edition |
| [/wiki/versions/bedrock](/wiki/versions/bedrock) | Dòng thời gian Bedrock Edition |

Dòng thời gian của hai phiên bản là **riêng biệt**, trên trang dùng hai tab để chuyển. Cấu trúc mỗi dòng cố định:

| Trường | Giải thích |
| --- | --- |
| Số phiên bản | Số phiên bản chính thức mà phiên bản đó hiển thị trong trò chơi |
| Nhãn | Chỉ xuất hiện khi mục được đánh dấu (ví dụ LTS, CROSS-PLAY), không phải dòng nào cũng có |
| Ngày | Ngày phát hành của phiên bản đó |
| Một dòng mô tả | Phiên bản này là gì (bản lớn sẽ ghi tên cập nhật, bản nhỏ nói chung là sửa lỗi và cải thiện độ ổn định) |

Vài sự thật về cách đọc:

- **Bản mới ở trên**: dòng thời gian sắp xếp theo ngày đảo ngược, dòng đầu là phiên bản mới nhất, càng xuống càng cũ.
- **Chỉ thu bản chính thức**: snapshot (Snapshot), bản xem trước (Preview) và bản thử nghiệm không nằm trong dòng thời gian, nên "không có trên dòng thời gian" không có nghĩa là "chính thức chưa từng phát hành".
- **Số lượng hai phiên bản chênh lệch rất lớn**: Java Edition ghi từ 1.0 đến 26.x mới nhất; Bedrock Edition phát hành bản sửa đổi thường xuyên hơn nhiều, số mục gần gấp ba Java Edition, nên dòng thời gian Bedrock cuộn xuống sẽ dài rõ rệt.
- **Mục Bedrock có thêm một trường**: máy chủ Bedrock (BDS) có số bản dựng riêng, dữ liệu dòng thời gian ghi thêm nó, dùng để đối chiếu "phiên bản client" với "bản dựng máy chủ".

## 2. Đọc số phiên bản Java Edition thế nào

Java Edition trong thời gian dài dùng dạng `1.x.y`:

| Vị trí | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `1.x` | Phiên bản chính, quyết định thay đổi nội dung và cách chơi | 1.21 |
| `.y` | Bản sửa đổi dưới phiên bản chính đó | 1.21.9, 1.21.10, 1.21.11 |

**Đây là chỗ đọc nhầm phổ biến nhất**: `1.21.10` **mới hơn** `1.21.9`, vì `.10` là số mười, không phải "một chấm một không". **So sánh theo số, đừng so sánh theo chuỗi**: sắp xếp chuỗi sẽ đặt `1.21.10` trước `1.21.9`, trông như cũ hơn, thực tế ngược lại.

### 2.1 Cách đặt tên mới: 26.x

Trong dòng thời gian có thể thấy, Java Edition sau năm 2026 xuất hiện số phiên bản dạng `26.x` (trong dòng thời gian của trang, 26.1 ghi là 2026-03-24, 26.2 ghi là 2026-06-16, 26.3 ghi là 2026-09-15).

Đây thuộc về việc **chính thức điều chỉnh cách đặt tên phiên bản**, không phải "bản sửa đổi thứ 26 của 1.21", cũng không thể dùng trực giác `1.x.y` để suy ra quan hệ lớn nhỏ của nó với số phiên bản cũ. Gặp dạng số phiên bản không quen, cách làm đúng là **xem ngày, đừng đoán số**:

- Muốn biết cái nào mới hơn: so ngày.
- Muốn biết có cài được plugin nào đó không: xem danh sách hỗ trợ của plugin, không xem hình thức số phiên bản.
- Muốn biết giao thức có tương thích không: xem phiên bản giao thức, không xem số phiên bản.

### 2.2 Khác biệt giữa bản sửa đổi và phiên bản chính

| Loại | Mức thay đổi | Rủi ro nâng cấp |
| --- | --- | --- |
| Bản sửa đổi (như 1.21.9 → 1.21.11) | Thường chỉ sửa bug và độ ổn định | Thấp; nhưng plugin vẫn có thể bị ảnh hưởng, vẫn phải sao lưu |
| Phiên bản chính (như 1.21 → 26.1) | Nội dung, cơ chế, định dạng dữ liệu đều có thể đổi | Cao; định dạng thế giới cơ bản là một chiều, hạ cấp có cái giá rất lớn |

## 3. Đọc số phiên bản Bedrock Edition thế nào

`1.x.y` của Bedrock **giống hình thức mà khác bản chất** với Java Edition: đoạn thứ ba không có nghĩa là "bản sửa đổi nhỏ thứ mấy", mà tăng theo nhịp riêng của Bedrock.

| Dạng | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `1.x.y` | Bản chính thức của Bedrock | 1.20.10, 1.21.100 |
| `1.x.y.z` (bốn đoạn) | Số bản dựng BDS, dùng cho máy chủ | BDS 1.20.62.03 |

Ba điểm chính:

1. **`1.20.1` và `1.20.10` không phải cùng một việc**, cũng không phải "đổi một chữ số". Đoạn thứ ba của Bedrock thường nhảy mười một lần (nhịp như 1.20.10, 1.20.20 rất phổ biến trong dòng thời gian), nên thấy `1.21.100` đừng tưởng là gõ nhầm.
2. **Số bản dựng BDS có bốn đoạn**: ví dụ `BDS 1.20.62.03`. Đây là số bản dựng riêng của máy chủ, **không phải cùng một chuỗi** với số phiên bản client hiển thị, nhưng trong cùng một lần phát hành chúng tương ứng với nhau.
3. **Không tra được số bản dựng thì để chỗ trống**: trong dữ liệu của trang, mục Bedrock không tra được số bản dựng chính xác sẽ được ghi dạng `BDS <phiên bản>.w` (`w` là chỗ giữ số bản dựng), nghĩa là "số bản dựng của lần phát hành này chưa được xác nhận", không có nghĩa là phiên bản đó không có máy chủ.

### 3.1 26.x của Bedrock Edition

Bedrock Edition cũng đã bước vào cách đặt tên `26.x` (trong dòng thời gian của trang, 26.0 ghi là 2026-02-10). Giống Java Edition, **đừng so sánh số giữa hai hệ đặt tên khác nhau**, hãy xem ngày.

### 3.2 Client và máy chủ phát hành cùng ngày

Trong mô tả dòng thời gian Bedrock thường thấy những câu như "phát hành cùng ngày với client", điều này phản ánh nhịp thực tế của Bedrock: **cập nhật client và bản dựng máy chủ thường tiến triển đồng bộ**. Từ đó có hai hệ quả:

- Máy chủ theo kịp chậm tức là người chơi (đặc biệt người chơi tự động cập nhật) không vào được;
- Người chơi iOS **chỉ cài được bản mới nhất trên cửa hàng**, không thể quay về phiên bản chỉ định, nên con đường "giữ máy chủ ở phiên bản cũ" có cái giá lớn hơn Java Edition rất nhiều.

## 4. Nhãn LTS và CROSS-PLAY đại diện cho điều gì

Nhãn trên dòng thời gian là **gợi ý do chính trang này thêm vào**, không phải phân loại chính thức, cũng không có bất kỳ cam kết chính thức nào. Chúng chỉ hiển thị khi mục được đánh dấu.

| Nhãn | Trang này dùng nó để chỉ | Nó **không** chỉ |
| --- | --- | --- |
| LTS | Phiên bản mà trang cho là đáng dừng lại lâu dài, phù hợp làm mốc ổn định | Chính thức sẽ cung cấp cập nhật lâu dài cho nó; cũng không có nghĩa nó "an toàn nhất" |
| CROSS-PLAY | Gợi ý phiên bản liên quan đến kết nối đa nền tảng | Cài nó là Java và Bedrock thông nhau được; cũng không bảo đảm mọi nền tảng đều vào được |

Vài điểm nhất định phải phân biệt:

- **LTS không phải thuật ngữ chính thức của Minecraft**. Chính thức không có khái niệm "phiên bản hỗ trợ dài hạn", bất kỳ phiên bản nào cũng có thể ngừng nhận sửa lỗi sau lần cập nhật tiếp theo.
- **CROSS-PLAY cũng không bằng kết nối đa nền tảng**. Các nền tảng của Bedrock thông nhau là năng lực sẵn có của nó; **kết nối giữa Java Edition và Bedrock Edition bắt buộc phải dựa vào công cụ như Geyser**, không liên quan đến máy chủ là phiên bản nào (xem [Khác biệt giữa Java Edition và Bedrock Edition](/wiki/editions)).
- **Nhãn sẽ thay đổi**. Trang này có thể thêm hoặc bỏ đánh dấu cho mục bất cứ lúc nào, nên việc "một phiên bản có nhãn LTS" tự nó là phán đoán của trang, không phải sự thật cứng. Lấy hiển thị hiện tại trên trang làm chuẩn.

## 5. Ngày phát hành không bằng "có vào được máy chủ hay không"

Đây là điểm dòng thời gian dễ bị dùng sai nhất. Ngày chỉ trả lời "phiên bản này phát hành khi nào", **hoàn toàn không trả lời** "client của bạn có vào được máy chủ này hay không".

Thứ thực sự quyết định vào được hay không là **phiên bản giao thức**: client và máy chủ đối thoại bằng số giao thức trong giai đoạn bắt tay, không khớp là không vào được, không liên quan đến số phiên bản, ngày phát hành hay nội dung cập nhật.

| Hiện tượng | Nguyên nhân thực sự | Xem ở đâu |
| --- | --- | --- |
| Người chơi báo "phiên bản không tương thích" (Java) | Giao thức client không khớp máy chủ | [Tương thích đa phiên bản](/tutorials/java/via) |
| Người chơi báo cần cập nhật lên bản mới nhất (Bedrock) | Giao thức client không khớp bản dựng máy chủ | [Phiên bản giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| Dòng thời gian báo hôm qua vừa ra bản mới, người chơi vẫn không vào được | Bạn chưa cập nhật máy chủ, hoặc người chơi đã tự cập nhật lên bản mới hơn | Xác nhận phiên bản hai bên trước, rồi quyết định có theo không |
| Dòng thời gian báo phiên bản rất cũ, nhưng người chơi vẫn vào được | Phiên bản client đó vẫn nằm trong phạm vi máy chủ chấp nhận | Đừng suy ngược tương thích giao thức từ "vào được" |

### 5.1 Một ví dụ cụ thể

Máy chủ chạy 1.21.11, người chơi báo client là 1.21.9:

| Câu hỏi | Trả lời |
| --- | --- |
| Dòng thời gian đọc thế nào | Cả hai dòng đều có, 1.21.11 mới hơn 1.21.9 (so theo số: 10, 11 lớn hơn 9) |
| Vì sao người chơi không vào được | Không thể giải thích bằng bốn chữ "phiên bản quá cũ": phải xem máy chủ 1.21.11 có chấp nhận giao thức của 1.21.9 hay không |
| Nên làm gì | Trước tiên xem lỗi bắt tay trong nhật ký máy chủ; cài dòng Via có thể cho client cũ hơn vào, xem [Tương thích đa phiên bản](/tutorials/java/via) |
| Dòng thời gian trả lời được không | Không. Nó chỉ cho biết hai phiên bản này cái nào phát hành trước |

**Dòng thời gian trả lời "cái nào mới cái nào cũ", giao thức trả lời "có kết nối được không"**, hai việc này phải tra riêng.

## 6. Vì sao phiên bản giao thức quan trọng hơn số phiên bản tiếp thị

"Số phiên bản tiếp thị" là số phiên bản như `1.21.x`, `26.x` hiển thị trên trang; **phiên bản giao thức** là số hiệu thực tế được hai bên dùng khi giao tiếp. Hai thứ này không phải một:

- Dưới cùng một số phiên bản tiếp thị, giao thức có thể đã đổi nhiều lần (Bedrock thể hiện rõ nhất);
- Chính thức đôi khi đổi giao thức giữa các bản sửa đổi, cũng có khi **không đổi** giao thức giữa các bản sửa đổi;
- Việc phán đoán tương thích của plugin, trình tải và công cụ đa phiên bản phần lớn dựa vào giao thức và phiên bản nội bộ, chứ không phải con số hiển thị trên trang.

**Bedrock khắt khe hơn**: giao thức client phải khớp bản dựng máy chủ, lệch một số giao thức là không kết nối được. **Java Edition có tầng dịch**: plugin dòng Via có thể dịch giao thức ở phía máy chủ, cho client cũ hơn hoặc mới hơn vào, nhưng cách càng xa thì càng ít thứ khớp được, trải nghiệm giảm càng rõ.

Kết luận: **để phán đoán "có vào được không", luôn xem giao thức trước, rồi xem số phiên bản; số phiên bản chỉ là cái tên để người đọc**. Hướng dẫn đầy đủ về hai con đường xem ở [Phiên bản giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) và [Tương thích đa phiên bản](/tutorials/java/via).

### 6.1 Thái độ của hai phiên bản với giao thức khác nhau

| Khía cạnh | Java Edition | Bedrock Edition |
| --- | --- | --- |
| Khi giao thức không khớp | Bắt tay thất bại, báo phiên bản không tương thích | Bắt tay thất bại, báo cần cập nhật lên bản mới nhất |
| Có tầng dịch hay không | Có: dòng Via dịch giao thức ở phía máy chủ | Cơ bản không có: hệ sinh thái plugin đa phiên bản của cộng đồng rất nhỏ |
| Client tự động cập nhật | Chỉ trong trình khởi động chính thức, người chơi có thể cố định phiên bản | Cửa hàng ứng dụng mặc định tự cập nhật, người chơi thường "bị nâng cấp" |
| Cái giá của việc cố định phiên bản cũ | Tương đối kiểm soát được | Rất cao: người chơi iOS chỉ cài được bản mới nhất |
| Chiến lược mặc định vì thế | Có thể quyết định khi nào nâng cấp theo hệ sinh thái plugin | **Mặc định theo bản mới nhất** |

## 7. Dùng dòng thời gian để quyết định khi nào nâng cấp

Dòng thời gian cho bạn **ngày tháng và thứ tự**, quyết định nâng cấp phải dựa vào nó cộng với "máy chủ của bạn đang chạy gì". Thứ tự đề xuất:

1. **Tra phạm vi hỗ trợ trước, rồi mới xem phiên bản mới**. Lõi, plugin, trình tải mod của bạn mỗi thứ hỗ trợ đến phiên bản nào? Viết ra giao của chúng, đó là mức cao nhất bạn nâng lên được. Ràng buộc phiên bản của trình tải và lõi xem ở [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7).
2. **Xem sau phiên bản mục tiêu có mấy bản sửa đổi**. Phiên bản chính vừa phát hành thường còn đang hoàn thiện; đợi một hai bản sửa đổi ra rồi mới động, rủi ro rõ ràng thấp hơn.
3. **Xem hệ sinh thái plugin của bạn đã theo kịp chưa**. Lõi hỗ trợ bản mới không có nghĩa là plugin hỗ trợ bản mới.
4. **Sao lưu, và kiểm chứng bản sao lưu**. Nâng cấp định dạng thế giới cơ bản là một chiều, chỉ đổi lõi mà không đổi thế giới thì không có chuyện quay lui.
5. **Thử trong một thực thể độc lập**. Chạy thử bằng một bản sao của bản lưu, đừng lấy thực thể đang vận hành ra làm thí nghiệm.
6. **Chọn cửa sổ bảo trì và thông báo trước**.

| Tình huống | Khuyến nghị |
| --- | --- |
| Chỉ là bản sửa đổi sửa bug, và lõi cùng plugin đều đã hỗ trợ | Có thể theo, vẫn phải sao lưu trước |
| Phiên bản chính vừa phát hành | Đợi bản sửa đổi thứ nhất hoặc thứ hai |
| Plugin của bạn có cái chỉ hỗ trợ phiên bản cũ | Dừng ở bản cũ, hoặc tìm plugin thay thế trước |
| Bedrock Edition | Mặc định theo bản mới nhất; cố định bản cũ là từ bỏ người chơi iOS |
| Không chắc | Không động. Chi phí ở lại phiên bản hiện tại thường thấp hơn một lần nâng cấp thất bại |

Quy trình nâng cấp đầy đủ, rủi ro hạ cấp và cách quay lui xem ở [Cập nhật và bảo trì máy chủ, plugin, MCDR](/tutorials/ops/updates).

## 8. Thứ tự chẩn đoán khi "không vào được"

| Thứ tự | Hạng mục kiểm tra | Tra thế nào |
| --- | --- | --- |
| 1 | Phiên bản client | Yêu cầu người chơi báo đúng số phiên bản (xem mục sau) |
| 2 | Phiên bản và giao thức máy chủ | Nhật ký máy chủ, đầu ra phiên bản của lõi |
| 3 | Cổng và giao thức | Java Edition là TCP 25565; Bedrock là UDP 19132 (IPv6 là 19133) |
| 4 | Danh sách trắng và cấm | `whitelist list`, `banlist players` (Bedrock xem `allowlist.json`) |
| 5 | Xác thực bản quyền và cách đăng nhập | Cấu hình kiểu `online-mode` sẽ thay đổi trực tiếp "có vào được hay không" |
| 6 | Plugin đa phiên bản | Cài dòng Via mà vẫn báo không hỗ trợ phiên bản thì hãy cập nhật chính plugin đó trước |

Hai bước đầu đã cần số phiên bản, nên **hỏi phiên bản trước, rồi mới bàn chuyện khác**, tiết kiệm được hơn nửa số lần trao đổi qua lại.

## 9. Xác nhận phiên bản client trước
:::tip Khi người chơi nói "không vào được", việc đầu tiên là lấy số phiên bản
Yêu cầu người chơi báo **đúng số phiên bản client** (chụp ảnh là gọn nhất), rồi mới đối chiếu dòng thời gian và giao thức. Không có bước này, mọi chẩn đoán phía sau đều là phỏng đoán.

- **Java Edition**: góc dưới bên trái menu chính hiển thị số phiên bản; trong trình khởi động cũng thấy phiên bản tương ứng của bản cài; vào game rồi bấm `F3`, phía trên giao diện gỡ lỗi sẽ hiển thị phiên bản.
- **Bedrock Edition**: trong trang kiểu "Giới thiệu" của phần cài đặt có thể thấy số phiên bản (vị trí giao diện khác nhau giữa các nền tảng, thiết bị di động và máy chơi game đặc biệt khác).

Lấy được số phiên bản rồi, đặt phiên bản người chơi và phiên bản máy chủ lên dòng thời gian đối chiếu ngày tháng và thứ tự, là có thể phán đoán đây là "máy chủ quá cũ" hay "client quá mới".
:::

## 10. Những điểm dễ đọc nhầm trên dòng thời gian

| Đọc nhầm | Thực tế |
| --- | --- |
| So sánh số phiên bản theo chuỗi | `1.21.10` mới hơn `1.21.9`; giữa hai hệ đặt tên (1.x và 26.x) càng không thể so số, chỉ so ngày |
| Tưởng dòng thời gian có thu snapshot | Chỉ thu bản chính thức; snapshot và bản xem trước không nằm trong đó |
| Tưởng "ngày phát hành gần" là "phải nâng" | Nhịp phát hành và hệ sinh thái plugin của bạn là hai việc khác nhau |
| Tưởng có nhãn LTS là mãi an toàn | LTS là nhãn của trang này, không phải cam kết chính thức |
| Tưởng `1.20.1` và `1.20.10` của Bedrock chỉ kém một bản nhỏ | Đoạn thứ ba của Bedrock nhảy theo nhịp riêng, hai cái là hai lần phát hành khác nhau |
| Tưởng một ngày chỉ có một phiên bản | Trên dòng thời gian, cùng một ngày xuất hiện nhiều phiên bản là chuyện bình thường |
| Tưởng "mới nhất là phù hợp nhất" | Bản mới nhất thân thiện với plugin mới, không thân thiện với plugin cũ; phải xem bạn thực tế cài gì |

### 10.1 Những câu dòng thời gian không trả lời

| Câu hỏi của bạn | Dòng thời gian trả lời được không | Nên đi đâu |
| --- | --- | --- |
| Phiên bản này phát hành khi nào | Được | Chính dòng thời gian |
| Client của tôi có vào được không | Không | Phiên bản giao thức: xem [Phiên bản giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol) |
| Plugin của tôi có hỗ trợ không | Không | Danh sách hỗ trợ trên trang phát hành plugin |
| Lõi của tôi đã theo kịp chưa | Không | Trang tải chính thức và kho chính thức của lõi |
| Phiên bản này cập nhật những gì | Một phần | Dòng mô tả trong dòng thời gian; chi tiết xem nhật ký cập nhật chính thức |
| Tải máy chủ ở đâu | Không | Khu tải xuống của trang và trang tải chính thức |

## 11. Tra cứu một trang

```text
我要开新服
  → 选最新正式版，然后确认核心与插件都支持它

玩家说进不来
  → 先要客户端版本号 → 比协议 → 再查端口、白名单、正版验证

我想升级
  → 查核心/插件/加载器的支持交集 → 等修订版 → 备份并验证
  → 独立实例试跑 → 挑维护窗口 → 公告

我看到一个不认识的版本号
  → 看日期，不看数字大小
```

## 12. Dùng dòng thời gian như hồ sơ phiên bản

Ngoài "xem bản mới nhất", dòng thời gian còn ba cách dùng thực dụng hơn.

### 12.1 Tra một phiên bản lịch sử thuộc phiên bản chính nào

Muốn biết "1.20.4 thuộc bản lớn nào, sau nó còn những bản sửa đổi nào", hãy định vị dòng đó trong dòng thời gian, rồi **đọc lên trên**: các bản sửa đổi dưới cùng phiên bản chính thường xuất hiện liên tiếp. Khi cần "quay về một phiên bản đã biết là dùng được", thao tác này nhanh hơn nhiều so với tra tài liệu.

### 12.2 Phán đoán một phiên bản chính cũ còn được cập nhật không

Thứ tự trên dòng thời gian cho bạn một trực giác: nếu sau một phiên bản chính đã xuất hiện phiên bản chính mới, phiên bản chính cũ thường chỉ nhận sửa lỗi khi cần thiết. **Đây chỉ là quan sát, không phải cam kết chính thức**; có tiếp tục cập nhật hay không lấy ghi chú phát hành chính thức làm chuẩn.

### 12.3 Với Bedrock, dùng nó đối chiếu client và máy chủ

Mục Bedrock đồng thời ghi phiên bản client và số bản dựng BDS, nên sau khi người chơi báo phiên bản client, có thể tìm thẳng dòng tương ứng trên dòng thời gian để xem bản dựng máy chủ của nó là gì. Đây là bước nhanh nhất khi chẩn đoán "client đã cập nhật, máy chủ chưa theo kịp".

## Bước tiếp theo

- Giao thức và lựa chọn phiên bản cho Bedrock: xem [Phiên bản giao thức và lựa chọn phiên bản](/tutorials/bedrock/protocol)
- Giải pháp đa phiên bản cho Java Edition: xem [Tương thích đa phiên bản](/tutorials/java/via)
- Nâng cấp, hạ cấp và quay lui: xem [Cập nhật và bảo trì máy chủ, plugin, MCDR](/tutorials/ops/updates)
- Ràng buộc phiên bản của lõi và trình tải: xem [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) và [Chọn lõi máy chủ](/tutorials/java/core)

> Chi tiết lệnh và phiên bản lấy theo tài liệu chính thức của máy chủ và trò chơi tương ứng.
