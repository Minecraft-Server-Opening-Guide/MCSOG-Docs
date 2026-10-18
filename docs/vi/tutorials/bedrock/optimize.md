---
title: Tối ưu hiệu năng Bedrock Edition
slug: optimize
cat: bedrock
level: 3
order: 8
minutes: 16
tags: [Bedrock Edition, BDS, hiệu năng, khoảng cách nhìn, khoảng cách mô phỏng, bộ nhớ, khởi động lại, tinh chỉnh]
updated: 2026-10-04
draft: false
---

Cách tối ưu của Bedrock Edition gần như là hai bộ đồ khác hẳn Java Edition. Java Edition có plugin, có `spark`, có hàng chục mục cấu hình có thể chỉnh; máy chủ chính thức của Bedrock Edition (BDS) **có rất ít núm để vặn**, và không ít khóa trong các phiên bản khác nhau còn có tên khác nhau. Vì vậy trọng tâm "tối ưu" của Bedrock Edition nằm ở **thiết kế thế giới** và **phần cứng**, chứ không phải lục tìm trong tệp cấu hình.

Bài này chỉ nói về **BDS** chính thức. Nếu chưa chạy được máy chủ, xem trước [Máy chủ BDS](/tutorials/bedrock/bds). Nếu bạn dùng lõi bên thứ ba, có thể nhảy thẳng đến mục 7.

## 1. Mô hình hiệu năng của Bedrock Edition khác Java Edition

| Mục so sánh | Java Edition (Paper v.v.) | Bedrock Edition (BDS chính thức) |
| --- | --- | --- |
| Mô phỏng thế giới | Tick ở luồng chính, nhưng lõi cung cấp nhiều công tắc tối ưu | Mô phỏng thế giới cơ bản dồn vào **một luồng**, nhiều nhân không giúp được mấy |
| Hệ sinh thái plugin | Cực kỳ phong phú, nhiều việc tối ưu nhờ plugin | Máy chủ chính thức **không hỗ trợ plugin**, thay thế là gói phụ trợ và API script |
| Tham số có thể chỉnh | Cấu hình lõi cộng cấu hình plugin, hàng chục mục | Trong `server.properties` chỉ có vài mục liên quan hiệu năng |
| Kiểm soát bộ nhớ | Dùng `-Xmx` / `-Xms` tự chỉ định | **Không có tham số bộ nhớ**, chương trình tự xin hệ điều hành |
| Công cụ phân tích | Biểu đồ flame của `spark`, đủ loại profiler | **Không có `spark`**, cũng không có quy trình biểu đồ flame trưởng thành |
| Nạp lại nóng | Một số tình huống làm được | Không hỗ trợ `/reload`, sửa cấu hình chỉ có thể khởi động lại |

Điều then chốt nhất là **xung nhịp đơn nhân quyết định trần**:

- Mô phỏng thế giới chạy trên một luồng, các nhân dư chủ yếu chia sẻ mạng, ghi bản lưu và công việc ngoại vi;
- Nên máy "16 nhân 2.0 GHz" thường chạy không lại máy "4 nhân 4.5 GHz";
- Khi chọn máy hãy xem hiệu năng đơn nhân trước, rồi xem số nhân.
:::warn Kinh nghiệm tối ưu của Java Edition không thể bê nguyên
Những thứ dưới đây trên BDS **đều không tồn tại**, đừng làm theo hướng dẫn Java:

- Biểu đồ flame `spark` (không hỗ trợ BDS, chi tiết xem mục 8);
- Bộ cấu hình `paper.yml`, `spigot.yml` của Paper / Spigot;
- Các công tắc plugin hoặc lõi kiểu phạm vi kích hoạt thực thể, giới hạn sinh quái, số thực thể mỗi tick;
- Plugin tối ưu (máy chủ chính thức không có hệ thống plugin).

Chỉ có **khái niệm** là bê được: giảm số chunk nạp đồng thời, giảm thực thể, giảm redstone tần suất cao.
:::

## 2. Cái chỉnh được: `server.properties`
:::warn Có những khóa nào, giá trị mặc định là bao nhiêu, đều thay đổi theo phiên bản BDS
Ở các phiên bản BDS khác nhau, **tên khóa, phạm vi giá trị, giá trị mặc định của `server.properties` đều có thể khác nhau**: có khóa được thêm sau này, có khóa bị đổi tên hoặc tách thành nhiều khóa ở một phiên bản nào đó (nhóm kiểm tra di chuyển là ví dụ điển hình).

Vì vậy bài này chỉ giải thích các khóa ấy **đang làm gì**, chỉnh nó phải trả giá gì. **Hãy mở `server.properties` trong thư mục máy chủ của bạn ra đối chiếu từng mục**: trong tệp mặc định do chính thức sinh ra, phía trên mỗi khóa đều có một dòng chú thích ghi rõ ý nghĩa, phạm vi cho phép và giá trị mặc định, đó mới là cách nói chính xác nhất cho phiên bản của bạn.
:::

### 2.1 Các khóa hiệu năng chính

| Khóa | Tác dụng | Cái giá khi hạ thấp | Hướng khuyến nghị |
| --- | --- | --- | --- |
| `view-distance` | Máy chủ gửi dữ liệu chunk xa bao nhiêu đến người chơi, tức là "người chơi nhìn được xa bao nhiêu" (mặc định chính thức 32, giới hạn dưới 5) | Xa thì phủ sương, địa hình "nhảy ra", cảm giác xấu đi | **Mục nên động vào trước**: khi thiết bị người chơi phổ biến ở mức thường hoặc băng thông căng thì hạ xuống |
| `tick-distance` | Chunk quanh người chơi xa bao nhiêu **thực sự tham gia tính toán** (sinh quái, cây trồng, redstone, chất lỏng) (mặc định chính thức 4, phạm vi 4-12) | Máy móc, nông trại, mạch redstone ở xa có thể ngừng chạy | Ảnh hưởng CPU trực tiếp hơn khoảng cách nhìn; khi không có nhu cầu "máy móc từ xa" thì giữ giá trị nhỏ |
| `max-threads` | Máy chủ cố dùng tối đa bao nhiêu luồng (mặc định chính thức 8, 0 nghĩa là không giới hạn; một số phiên bản xóa khóa này cũng tương đương) | Đặt quá thấp có thể khiến các tác vụ ngoại vi như mạng, bản lưu phải xếp hàng | **Nó không tách mô phỏng thế giới ra nhiều nhân**; tăng lên không đồng nghĩa nhanh hơn, hãy giữ mặc định trước |
| `player-idle-timeout` | Người chơi treo máy bao nhiêu phút thì bị đá ra | Người chơi treo máy sẽ rớt mạng sớm hơn, ảnh hưởng nhu cầu treo máy | Cách giảm tải gần như không tốn kém, định theo quy tắc treo máy của bạn |
| `compression-threshold` | Gói mạng lớn bao nhiêu mới bắt đầu nén | Hạ thấp nghĩa là nén nhiều gói hơn, **ăn CPU hơn**, tiết kiệm băng thông hơn | Trước tiên xem điểm nghẽn ở đâu: băng thông căng thì hạ, CPU căng thì nâng |
| `compression-algorithm` | Thuật toán nén mạng (thường là các lựa chọn kiểu `zlib` / `snappy`) | Đổi sang thuật toán có tỷ lệ nén thấp hơn, tức là lấy băng thông đổi CPU | Băng thông dư thì chọn thuật toán nhanh hơn, băng thông căng thì chọn tỷ lệ nén cao hơn |

Về mấy mục này, có ba điểm cần nói rõ:

1. `view-distance` và `tick-distance` là **hai việc khác nhau**: cái trước quyết định "có nhìn thấy hay không", cái sau quyết định "có chạy tính toán hay không". Giảm khoảng cách nhìn chủ yếu ảnh hưởng cảm giác, giảm khoảng cách mô phỏng sẽ ảnh hưởng máy móc.
2. `max-threads` là **giới hạn luồng**, không phải "công tắc mô phỏng thế giới song song". Tăng nó lên không làm điểm nghẽn đơn nhân biến mất.
3. `player-idle-timeout` là một trong số ít mục giảm tải **gần như không có tác dụng phụ**: đá người chơi treo máy đi là nạp ít chunk hơn, tính ít thực thể hơn.

### 2.2 Các khóa liên quan đến kiểm tra di chuyển, chống gian lận

Các khóa này **không phải công tắc hiệu năng**, nhưng thường bị coi là "mục tối ưu" để chỉnh, nên nói riêng:

| Khóa | Tác dụng | Cái giá khi nới lỏng kiểm tra | Hướng khuyến nghị |
| --- | --- | --- | --- |
| `server-authoritative-movement` (một số phiên bản) | Di chuyển do máy chủ quyết định, nhận một trong vài chế độ kiểm tra, càng nghiêng về quyền máy chủ càng nghiêm | Nới lỏng nghĩa là ít chỉnh vị trí hơn, nhưng **dư địa gian lận lớn hơn** | Máy chủ công khai giữ mặc định hoặc nghiêm hơn |
| `server-authoritative-movement-strict` (một số phiên bản) | Kiểm tra vị trí người chơi nghiêm hơn, chỉnh sửa thường xuyên hơn | Tắt đi nghĩa là ít rung hơn, nhưng xuyên tường, dịch chuyển tức thời khó phát hiện hơn | Đừng tắt để "tiết kiệm hiệu năng" |
| `player-position-acceptance-threshold` | **Mức dung sai** vị trí giữa client và máy chủ | Hạ thấp nghĩa là chỉnh sửa thường xuyên hơn, người chơi độ trễ cao dễ bị "kéo về" | Chỉ nới nhẹ khi độ trễ phổ biến cao, người chơi thường xuyên bị kéo về, và phải hiểu rõ đây là đánh đổi an ninh |
:::warn Đừng coi chống gian lận là công tắc hiệu năng
Chỉnh vị trí đúng là có chi phí mạng, nhưng nó đổi lấy "người chơi không thể tùy tiện dịch chuyển tức thời". Nới lỏng kiểm tra để tiết kiệm chút CPU hay băng thông là kiểu được không bù mất điển hình. Chỉ khi **độ trễ phổ biến rất cao, người chơi thường xuyên bị kéo về** mới cân nhắc chỉnh nhẹ, và phải hiểu bạn đang lấy gì đổi gì.
:::

### 2.3 Các khóa khác có thể có

Ở các phiên bản khác nhau còn thấy vài khóa dính dáng đến hiệu năng, ví dụ:

- Công tắc giao việc **sinh chunk hiển thị** cho client: máy chủ làm ít việc hơn, cái giá là client cấu hình thấp càng giật;
- Các khóa liên quan đến **nhật ký nội dung** và **watchdog** của gói phụ trợ và script: dùng để phát hiện script báo lỗi, script chạy quá chậm, bộ nhớ vượt giới hạn.

Chúng **có tồn tại hay không, tên là gì, giá trị mặc định bao nhiêu đều thay đổi theo phiên bản**, ở đây không đưa ra tên khóa và giá trị cụ thể, hãy lấy tệp cục bộ của bạn và tài liệu chính thức làm chuẩn. Trước khi dùng hãy xác nhận phiên bản của bạn thực sự có các khóa này, đừng chép cấu hình của phiên bản khác trên mạng.

### 2.4 Một đoạn ví dụ

```properties
# Khoảng cách nhìn: hạ xuống trước, quan sát cảm giác và thay đổi CPU
view-distance=12

# Khoảng cách mô phỏng: không có nhu cầu máy móc từ xa thì giữ giá trị nhỏ
tick-distance=4

# Giới hạn luồng: giữ mặc định, đừng coi là công tắc tăng tốc
max-threads=8

# Đá người treo máy: định theo quy tắc treo máy của bạn
player-idle-timeout=15

# Nén: băng thông căng dùng mặc định, CPU căng có thể nâng ngưỡng
compression-threshold=1
compression-algorithm=zlib
```

Các giá trị trên **chỉ là ví dụ**, không phải giá trị mặc định cũng không phải giá trị khuyến nghị. Hãy đối chiếu chú thích trong tệp cục bộ của bạn, đổi thành giá trị phù hợp với bạn.
:::note Sửa xong bắt buộc phải khởi động lại
BDS không hỗ trợ `/reload`. Sửa xong `server.properties` phải dùng console `stop` bình thường rồi khởi động lại, đừng giết tiến trình trực tiếp.
:::

## 3. Phần lớn thật sự: thiết kế thế giới

Trên Bedrock Edition, **bạn cấu hình được rất ít, nhưng bạn xây được rất nhiều**. Đại đa số "máy chủ lag" cuối cùng đều quy về bản đồ:

| Nguồn tải | Hướng xử lý |
| --- | --- |
| Nạp đồng thời quá nhiều chunk | Giảm `view-distance` và `tick-distance`, dùng vùng luôn nạp (ticking area) ở mức tối thiểu |
| Quá nhiều máy móc luôn nạp | Mỗi cỗ máy "không có ai cũng chạy" đều liên tục ăn CPU, cái không cần thì dỡ hoặc tắt |
| Đồng hồ redstone chạy mãi | Đồng hồ tần suất cao là nguồn tải điển hình, dùng được phương án tần suất thấp thì đừng dùng tần suất cao |
| Quá nhiều thực thể | Sinh vật, vật rơi, xe mỏ tích tụ; kiểm soát quy mô nông trại, kịp thời thu hoặc dọn vật rơi |
| Nông trại quá lớn | Nông trại có sản lượng vượt xa nhu cầu là gánh nặng thuần, thu nhỏ quy mô hoặc bật theo nhu cầu |
| Vật rơi tích tụ | Thiết kế thu và hủy không đúng sẽ khiến thực thể tồn tại lâu dài |

Vài điểm cần nói:

- **Vùng luôn nạp (ticking area)** khiến chunk chỉ định vẫn liên tục tính toán khi không có người chơi. Nó rất tiện, nhưng mỗi vùng đều liên tục tiêu CPU, **dùng xong thì xóa**.
- **Thực thể tích tụ** có triệu chứng điển hình: tổng CPU nhìn không cao, nhưng cả máy chủ cứ lag. Lúc này thứ cần xử lý là số lượng thực thể và chunk phức tạp, chứ không phải đi tìm thêm một tham số.
- **Ưu tiên làm phép trừ**: dỡ ba nông trại không dùng thường hiệu quả hơn chỉnh tệp cấu hình mười lần.
:::tip Làm phép trừ trước, rồi mới nói đến tham số
Trên Bedrock Edition, biện pháp đầu tiên của "tối ưu" là **xây ít, chạy ít, nạp ít**. Tham số chỉ giúp được trong một phạm vi rất nhỏ.
:::

Cách kiểm tra thực thể và vật rơi có thể xem [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag). Cần nhắc là: **công cụ chẩn đoán trong bài đó là của Java Edition** (ví dụ `spark`, chỉ số TPS và MSPT), Bedrock Edition không dùng được; nhưng **nguyên tắc thiết kế "ít thực thể, ít vật rơi, ít máy móc luôn nạp" là dùng chung**, có thể tham khảo trực tiếp.

### 3.1 Vùng luôn nạp và "máy móc ngoại tuyến"

Vùng luôn nạp (ticking area) là con dao hai lưỡi hiếm thấy của Bedrock Edition:

- **Lợi**: khi không có người chơi, redstone, chất lỏng, cây trồng, sinh vật trong chunk chỉ định vẫn tính toán như thường, máy móc có thể sản xuất ngoại tuyến;
- **Giá**: các chunk này **luôn luôn** chiếm thời gian luồng chính, không liên quan có người chơi trực tuyến hay không;
- **Khuyến nghị**: chỉ mở cho vùng thực sự cần, làm xong việc thì xóa; máy móc có thể đổi thành "có người mới chạy" thì đừng để luôn nạp.

Khi kiểm tra hãy tự hỏi ba câu: cỗ máy này còn cần không? Nó có nhất thiết phải chạy khi không có ai không? Sản lượng của nó có thật sự dùng được không? Trong ba câu chỉ cần một câu trả lời "không" là nên tắt nó đi.

## 4. Chunk, kích thước thế giới và sinh trước

Khoảng cách nhìn và quy mô thế giới là hai món nợ khác nhau:

- **Món nợ khoảng cách nhìn**: `view-distance` càng lớn, mỗi người chơi vào máy chủ, di chuyển, vượt vùng đều phải gửi xuống càng nhiều dữ liệu chunk, CPU và băng thông cùng tăng. Nó là đòn bẩy CPU và băng thông lớn nhất, đồng thời cũng là mục cảm giác mà người chơi cảm nhận trực tiếp nhất.
- **Món nợ kích thước thế giới**: vùng người chơi đã khám phá đều ghi vào bản lưu. Thế giới càng lớn, càng lâu năm, thư mục `worlds/` càng lớn, **khởi động, lưu, sao lưu đều chậm hơn**, áp lực I/O đĩa cũng lớn hơn.

Những việc có thể làm:

1. **Giới hạn phạm vi hoạt động**: dùng ý tưởng "biên giới thế giới" để tập trung người chơi vào vùng cần chơi, thay vì để thế giới mở rộng vô hạn. Phiên bản hoặc lõi của bạn có cung cấp lệnh biên giới sẵn hay không, dùng thế nào, hãy lấy tài liệu chính thức làm chuẩn.
2. **Không khuyến khích đi xa vô mục đích**: chạy bản đồ tự nó liên tục sinh chunk mới, mà sinh chunk mới là nguồn lag phổ biến.
3. **Giữ điểm sinh gọn gàng**: quanh điểm sinh thường là vùng nạp thường xuyên nhất, công trình, thực thể, redstone càng ít càng tốt.
4. **Định kỳ lưu trữ vùng cũ**: thế giới hoặc vùng không dùng nữa thì dọn kịp thời, **sao lưu trước** khi thao tác.

Về **sinh trước**, phải nói thật: **BDS chính thức không cung cấp công cụ sinh trước**, các biện pháp khả dụng ít hơn Java Edition rất nhiều.

| Biện pháp | BDS chính thức có hỗ trợ | Mô tả |
| --- | --- | --- |
| Lệnh sinh trước tích hợp | Không hỗ trợ | Máy chủ chính thức không có loại lệnh này |
| Quản trị viên chạy bản đồ trước | Hỗ trợ (chính là hành vi chơi bình thường) | Ổn nhất, không phụ thuộc gì, nhược điểm là tốn thời gian |
| Vùng luôn nạp | Hỗ trợ | Giải quyết "không có ai vẫn phải tính toán", **không phải** sinh trước, và liên tục tiêu hiệu năng |
| Công cụ Java Edition (như Chunky) | Không hỗ trợ BDS | Loại công cụ này nhắm đến máy chủ Java Edition và nền tảng mod |
| Công cụ sinh trước bên thứ ba | Ngoài phạm vi năng lực chính thức | Trước khi dùng hãy xác nhận nó hỗ trợ phiên bản BDS của bạn, và **sao lưu thế giới trước** |
:::warn Đừng tin "sinh trước một cú nhấp cho Bedrock Edition"
Những "plugin hoặc công cụ sinh trước" cho Bedrock Edition thấy trên mạng phần lớn thuộc lõi bên thứ ba hoặc công cụ cộng đồng, **không thuộc phạm vi năng lực của BDS chính thức**. Muốn dùng thì lấy tài liệu chính thức của chính nó làm chuẩn, đừng đoán theo bài này hoặc hướng dẫn của phiên bản khác.
:::

Biện pháp sinh trước của Bedrock Edition có hạn, chủ yếu dựa vào **chạy bản đồ trước** và **kiểm soát quy mô thế giới**.

## 5. Hành vi bộ nhớ

Hành vi bộ nhớ của Bedrock Edition hoàn toàn khác Java Edition:

- **Không có tham số bộ nhớ**. BDS không có công tắc kiểu `-Xmx`, bộ nhớ ban đầu và tối đa do chương trình tự xin hệ điều hành, bạn không thể chỉ định trong tham số khởi động.
- **Mức chiếm sẽ tăng chậm theo thời gian**. Chạy lâu sẽ cao hơn rõ rệt so với lúc vừa khởi động, đây là hiện tượng quan sát phổ biến.
- **Đừng cưỡng chế dọn bộ nhớ**. Dùng công cụ kiểu "dọn bộ nhớ""giải phóng cưỡng chế" để ép mức chiếm xuống sẽ khiến **thanh tiến trình kẹt khi người chơi tải gói tài nguyên hoặc gói phụ trợ**, còn có thể làm máy chủ mất ổn định. **Khởi động lại mới là cách giải**, điểm này thống nhất với giải thích trong [Máy chủ BDS](/tutorials/bedrock/bds).

Cách làm đúng là **sắp xếp khởi động lại định kỳ**:

| Cách làm | Mô tả |
| --- | --- |
| Khởi động lại định kỳ | Khởi động lại một lần vào giờ thấp điểm, trả bộ nhớ tích tụ lâu dài về hệ thống |
| Chu kỳ khởi động lại | **Không có giá trị khuyến nghị chính thức**, là câu hỏi phán đoán: xem số người chơi, kích thước thế giới, số gói phụ trợ và đường cong tăng bộ nhớ của bạn. Mỗi ngày một lần, vài ngày một lần đều có người dùng |
| Dừng êm | Dùng console `stop` tắt máy chủ bình thường rồi khởi động lại, tránh hỏng bản lưu và tệp thống kê |
| Thông báo trước | **Thông báo cho người chơi trong game và trong nhóm trước khi khởi động lại**, và để thời gian đệm, tránh việc người chơi đang chạy bản đồ hoặc đang đấu bị đá xuống đột ngột |
:::tip Khoảng cách khởi động lại định thế nào
Đừng chép "mỗi ngày khởi động lại ba lần" của người khác. Trước tiên ghi lại vài ngày: sau khi khởi động bao lâu thì bộ nhớ tăng đến mức máy không chịu nổi, người chơi đông nhất lúc nào. **Người chơi đông, nhiều gói phụ trợ thì khoảng cách ngắn hơn; máy chủ nhỏ, ít gói phụ trợ thì khoảng cách có thể dài hơn.**
:::

## 6. Phần cứng và lựa chọn nơi thuê

Nguyên tắc đầu tiên về phần cứng của Bedrock Edition vẫn là **ưu tiên hiệu năng đơn nhân**:

| Ưu tiên | Mục | Vì sao |
| --- | --- | --- |
| 1 | Xung nhịp và hiệu năng đơn nhân | Mô phỏng thế giới trên một luồng, đơn nhân yếu quyết định thẳng có lag hay không |
| 2 | SSD hoặc NVMe | Đọc ghi chunk, lưu bản lưu, sao lưu đều là I/O đĩa, đĩa cơ và lưu trữ mạng sẽ làm chậm rõ rệt |
| 3 | Dung lượng bộ nhớ | Phải để dư; càng nhiều người chơi, thế giới, gói phụ trợ thì cần càng nhiều |
| 4 | Số nhân | Có ích, nhưng xếp sau ba mục trên |

Vì sao "VPS rẻ lại lag không hiểu vì sao":

- Gói rẻ thường là CPU **xung nhịp thấp, nhiều nhân, chia sẻ quá bán**. BDS ăn đơn nhân, mà CPU chia sẻ sẽ bị hàng xóm chiếm, nên xuất hiện lag chu kỳ và độ trễ rung;
- Instance kiểu "hiệu năng đột biến" bình thường trông như rảnh, một khi hạn mức CPU cạn là toàn bộ chậm đi;
- Đĩa cơ hoặc lưu trữ mạng làm đọc ghi chunk chậm đi, thể hiện rõ nhất khi người chơi chạy bản đồ;
- Khi thiếu bộ nhớ hệ thống bắt đầu hoán trang, biểu hiện là "cả máy chủ giật từng nhịp".
:::warn Container và ảo hóa sẽ tranh thêm CPU
Nếu bạn đặt BDS vào container hoặc máy ảo để chạy, **hạn mức CPU (limit / quota) có thể làm BDS chết đói**: đơn nhân chạy full thì bị giới hạn luồng, biểu hiện là "giật một cái" theo chu kỳ. Hãy cấp đủ phần CPU, và tránh chen chúc cùng máy với dịch vụ tải nặng khác. Chi tiết triển khai bằng Docker xem [Triển khai máy chủ Bedrock Edition bằng Docker](/tutorials/bedrock/docker).
:::

### 6.1 Tra nhanh lựa chọn nơi thuê

| Tình huống của bạn | Khuyến nghị |
| --- | --- |
| Người chơi không nhiều, ngân sách có hạn | Một máy đơn nhân mạnh thường ổn hơn VPS nhiều nhân chia sẻ quá bán |
| Cần trực tuyến lâu dài, có người chơi cố định | Chọn gói ghi rõ xung nhịp CPU, không chia sẻ quá bán, chạy thử quy mô nhỏ trước rồi mở rộng |
| Triển khai bằng container | Cấp đủ phần CPU, tránh cùng máy với dịch vụ tải nặng, chú ý cổng và volume dữ liệu, xem [Triển khai máy chủ Bedrock Edition bằng Docker](/tutorials/bedrock/docker) |
| Muốn hệ sinh thái plugin | Vậy thì không phải con đường BDS, xem mục 7 trước |

## 7. Khác biệt hiệu năng của lõi bên thứ ba

Nếu bạn muốn plugin và đa nhân, thì đó không phải con đường BDS:

| Lõi | Ngôn ngữ | Đặc điểm hiệu năng |
| --- | --- | --- |
| Họ Nukkit (gồm PowerNukkitX) | Java | Chủ đánh đa nhân và tối ưu, có hệ thống plugin và nhiều mục có thể chỉnh |
| PocketMine-MP | PHP | Hệ sinh thái plugin lớn nhất, nhưng dưới tải cao điểm nghẽn rõ rệt, ngôn ngữ thông dịch tự nó có chi phí |

Mô hình hiệu năng, mục cấu hình và công cụ khả dụng của chúng đều khác BDS, **kinh nghiệm tối ưu không thể áp dụng lẫn nhau**. Ví dụ `spark` hỗ trợ Nukkit, nhưng **không hỗ trợ BDS**; bê nguyên bài tinh chỉnh của PMMP hoặc Nukkit lên BDS thường chỉ mất công vô ích.
:::warn Trước tiên xác nhận bạn muốn con đường nào
Chọn BDS là "chính thức, ổn định, ít mục có thể chỉnh"; chọn lõi bên thứ ba là "nhiều plugin, nhiều mục có thể chỉnh, nhưng không phải bản triển khai chính thức". Muốn hiểu đánh đổi và cách bắt đầu của chúng, xem [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) và [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup).
:::

## 8. Đo thế nào

Nói rõ trước: **Bedrock Edition không có `spark`**. `spark` hỗ trợ một loạt nền tảng của Java Edition và một số nền tảng cộng đồng, **Bedrock Dedicated Server không nằm trong đó**. Nên trên BDS đừng trông chờ biểu đồ flame, cũng đừng bê nguyên quy trình "xem TPS và MSPT" của Java Edition.

Các biện pháp dùng được:

| Biện pháp | Dùng thế nào |
| --- | --- |
| Giám sát cấp máy chủ | Xem CPU (đặc biệt **mức chiếm đơn nhân**), bộ nhớ, I/O đĩa, băng thông mạng. Cách làm xem [Giám sát và cảnh báo](/tutorials/ops/monitoring) |
| Đầu ra console BDS | Xem thông tin khởi động và tắt, báo lỗi, cảnh báo liên quan gói phụ trợ và script |
| Phản hồi người chơi | "Lúc nào lag, mấy người trực tuyến, lag ở vùng nào" thường trực tiếp hơn mọi chỉ số |
| So sánh trước và sau thay đổi | Mỗi lần chỉ đổi một mục, ghi lại mức chiếm CPU và cảm nhận người chơi trước và sau |
:::note Mỗi lần chỉ đổi một mục
Không có biểu đồ flame, cách đáng tin duy nhất là **kiểm soát biến**: đổi một mục, quan sát một khoảng thời gian có thể so sánh, ghi lại, rồi đổi mục tiếp theo. Đổi năm mục một lần, bạn mãi không biết mục nào có tác dụng, hoặc có tác dụng ngược.
:::

Kỷ luật đo lường, khuyến nghị làm theo cách này:

1. **Mỗi lần chỉ đổi một biến**, các thứ khác giữ nguyên;
2. **Đo trong khoảng thời gian có thể so sánh**: cùng khung giờ, số người trực tuyến gần nhau, cách chơi gần nhau (ví dụ đều đang chạy bản đồ, hoặc đều đang treo máy);
3. **Ghi vào nhật ký**: đã đổi gì, đổi lúc nào, chỉ số và cảm nhận người chơi trước và sau;
4. **Quan sát đủ lâu**: những hiện tượng như sinh chunk, tăng bộ nhớ cần thời gian mới thấy được, đổi xong kết luận ngay dễ đánh giá sai.

Một ví dụ đơn giản về ghi chép cấp máy chủ (Linux, chỉ để minh họa):

```bash
# Cứ 5 giây lấy mẫu tải tổng thể và từng nhân, tiện phát hiện "tổng không cao nhưng đơn nhân chạy full"
top -b -d 5 -n 60 > cpu-sample.log
```

Trên Windows có thể dùng Task Manager hoặc Performance Monitor để xem cùng thứ đó, **trọng tâm là đường cong đơn nhân, chứ không phải tổng mức chiếm**.

## 9. Thứ tự tinh chỉnh

Làm theo thứ tự này thì hiệu quả trên chi phí cao nhất; đảo thứ tự dễ tốn tiền vô ích:

1. **Thiết kế thế giới**: làm phép trừ trước, nạp ít, ít máy móc luôn nạp, tắt nông trại không cần, tiết chế đồng hồ redstone, kiểm soát thực thể và vật rơi. Lợi ích lớn nhất và không tốn tiền.
2. **Khoảng cách nhìn và khoảng cách mô phỏng**: chỉnh `view-distance`, `tick-distance`, `player-idle-timeout` và các khóa liên quan nén. Gần như miễn phí, thấy ngay.
3. **Phần cứng**: ưu tiên hiệu năng đơn nhân, sau đó bộ nhớ, SSD, số nhân. Tốn tiền nhưng hiệu quả.
4. **Kế hoạch khởi động lại**: định một chu kỳ khởi động lại phù hợp và thông báo trước. Chữa triệu chứng, nhưng giải quyết được tích tụ bộ nhớ lâu dài.
5. **Đổi lõi**: chỉ khi bốn mục trước đã làm xong, bạn thực sự cần plugin hoặc đa nhân mới cân nhắc họ Nukkit hoặc PMMP.

### 9.1 Danh sách kiểm tra kết thúc

| # | Mục kiểm tra | Tiêu chuẩn hoàn thành |
| --- | --- | --- |
| 1 | Xác nhận phiên bản có những khóa nào | Mở `server.properties` cục bộ, đã đối chiếu từng tên khóa và giá trị mặc định |
| 2 | Thiết kế thế giới | Nông trại và máy móc không dùng đã tắt, vùng luôn nạp đã dọn, redstone tần suất cao đã thu gọn |
| 3 | Khoảng cách nhìn và khoảng cách mô phỏng | `view-distance` và `tick-distance` đã chỉnh theo thiết bị và băng thông người chơi, và không làm hỏng máy móc |
| 4 | Treo máy và nén | `player-idle-timeout` đã đặt, các khóa liên quan nén đã chỉnh theo hướng điểm nghẽn |
| 5 | Phần cứng | Hiệu năng đơn nhân và I/O đĩa là điểm nghẽn thì giải quyết trước; container có đủ phần CPU |
| 6 | Kế hoạch khởi động lại | Có chu kỳ, có thông báo, dùng `stop` tắt máy chủ êm |
| 7 | Ghi chép đo lường | Mỗi thay đổi đều có ghi chép trước và sau, và mỗi lần chỉ đổi một mục |
| 8 | Chống gian lận | Không vì tiết kiệm hiệu năng mà nới lỏng kiểm tra di chuyển, hoặc đã xác nhận rõ ràng chấp nhận rủi ro |

Tối ưu Bedrock Edition nói cho cùng chỉ ba câu: **xung nhịp đơn nhân quyết định trần, thiết kế thế giới quyết định sàn, khởi động lại định kỳ quyết định ổn định lâu dài.**

Đọc thêm:

- Bản thân máy chủ: [Máy chủ BDS](/tutorials/bedrock/bds)
- Triển khai container: [Triển khai máy chủ Bedrock Edition bằng Docker](/tutorials/bedrock/docker)
- Lõi bên thứ ba: [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party), [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup)
- Quan sát và kiểm tra: [Giám sát và cảnh báo](/tutorials/ops/monitoring)
- Thực thể và vật rơi (công cụ là của Java Edition, nguyên tắc thiết kế dùng chung): [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag)

> Các khóa khả dụng và giá trị mặc định của server.properties thay đổi theo phiên bản BDS, hãy lấy tệp do máy bạn sinh ra và tài liệu chính thức làm chuẩn.
