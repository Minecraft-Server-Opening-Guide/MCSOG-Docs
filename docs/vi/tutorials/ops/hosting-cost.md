---
title: So sánh chi phí và lựa chọn phương án
slug: hosting-cost
cat: ops
level: 2
order: 24
minutes: 16
tags: [chi phí, lựa chọn, nhà cung cấp host, băng thông, sao lưu, ngân sách, vận hành]
updated: 2026-10-04
draft: false
---

"Mở một máy chủ tốn bao nhiêu tiền" là câu hỏi không có đáp án chuẩn, nhưng **cách hỏi sai** thì rất phổ biến. Thứ thật sự nên hỏi là ba câu: **quy mô của tôi là bao nhiêu? trong ngân sách của tôi cái nào là một lần, cái nào là hằng tháng? và tôi sẵn sàng bỏ bao nhiêu thời gian?**

Phản ứng đầu tiên của nhiều người là so giá: liệt kê giá gói của vài nhà rồi chọn cột rẻ nhất. Cách này thường khiến nửa năm sau phải trả giá cao hơn —— không phải vì mua đắt, mà vì **mua sai**, rồi lúc di chuyển, mất bản lưu, bị tấn công thì trả lại một lần hết số tiền đã tiết kiệm.

Bài này nói về cách tiêu tiền vào đúng chỗ thật sự quyết định trải nghiệm. Gia cố ở mức máy chủ xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security), cái giá của việc chuyển nhà xem [Di chuyển máy chủ](/tutorials/ops/server-migration), thực tế khi bị tấn công xem [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense).

:::warn Giá và gói cước lấy theo trang chính thức của nhà cung cấp
Bài này viết trong trạng thái không thể lên mạng đối chiếu, **mọi con số tiền, đơn vị và hình thái gói cước dưới đây chỉ là "minh họa bậc độ lớn", không phải báo giá**. Giá, cách tính phí, chính sách hoàn tiền, đơn giá vượt lưu lượng, phòng DDoS có tặng kèm hay không, **mỗi nhà một khác, và thay đổi bất cứ lúc nào**. Trước khi động tay hãy lấy trang giá chính thức và điều khoản hợp đồng của nhà cung cấp làm chuẩn.
:::

## 1. Bóc tách từ "chi phí" trước

Tổng chi phí một lần mở máy chủ do bốn loại cấu thành, tính chất hoàn toàn khác nhau:

| Loại | Ví dụ | Đặc điểm |
| --- | --- | --- |
| **Chi một lần** | Phần cứng, tên miền năm đầu, nhân công di chuyển, cấu hình ban đầu | Chỉ trả một lần lúc bắt đầu hoặc khi thay đổi lớn, dễ bị bỏ qua |
| **Chi cố định hằng tháng** | Phí thuê máy chủ, gói băng thông, lưu trữ sao lưu, bảng điều khiển | Tháng nào cũng trả, **quyết định gánh nặng dài hạn** |
| **Chi biến đổi** | Phí vượt lưu lượng, lưu trữ snapshot, phụ phí chống DDoS, tính theo dùng | Bình thường không thấy, có sự cố hoặc tăng trưởng thì đột nhiên to ra |
| **Chi phí thời gian** | Cập nhật, kiểm chứng sao lưu, quản lý người chơi, xử lý sự cố | **Đắt nhất và dễ bị tính bằng 0 nhất** |

**Tách bốn loại này ra tính thì việc chọn phương án đã rõ một nửa.** Nhiều phương án "trông rẻ" là rẻ ở loại thứ hai, cái giá giấu ở loại thứ ba và thứ tư.

:::note Một tiêu chuẩn phán đoán
Nếu hai phương án chênh lệch phí tháng không nhiều, **hãy chọn cái khiến sau này bạn dễ chuyển nhà hơn, dễ thêm sao lưu hơn, dễ đổi cấu hình hơn**. Với việc mở máy chủ, "khả năng di chuyển" và "khả năng quan sát" thường đáng giá hơn vài chục tệ tiết kiệm được.
:::

## 2. Yếu tố thật sự lái chi phí

### 2.1 Hiệu năng đơn nhân CPU (dễ bị đánh giá thấp nhất)

**Logic chính của Minecraft (vòng tick) cơ bản chạy trên một luồng.** Điều này nghĩa là:

- **Nhiều nhân không đồng nghĩa mượt.** Một máy 8 nhân nhưng đơn nhân yếu, chạy máy chủ bản gốc 20 người, rất có thể không bằng máy 2 nhân nhưng đơn nhân mạnh.
- **Nguyên nhân trực tiếp của tụt TPS thường là đơn nhân chạy full**, lúc đó mức sử dụng CPU toàn máy có thể chỉ 15%.
- Sinh thế giới, nạp chunk, tính toán thực thể và redstone đều làm tăng áp lực đơn nhân.

Nên khi chọn máy chủ, **ưu tiên hiệu năng đơn nhân hơn số nhân**. Điểm này đặc biệt quan trọng với gói rẻ: trên máy chủ bị chia sẻ quá bán, "3.0 GHz" bạn nhận được là chia sẻ.

### 2.2 Bộ nhớ

Bộ nhớ quyết định "mở được lớn đến đâu, chứa được bao nhiêu thứ":

- Máy chủ bản gốc/Paper: quy mô nhỏ (vài người đến hơn chục người) thường vài GB heap là chạy được, **nhưng con số cụ thể khác nhau rất nhiều theo phiên bản, khoảng cách nhìn, plugin và cách chơi**.
- Máy chủ mod và modpack: nhu cầu bộ nhớ thường gấp vài lần bản gốc, **lấy tài liệu chính thức của tác giả modpack và loader làm chuẩn**.
- Bảng điều khiển, bản đồ web, cơ sở dữ liệu, phía proxy đều chiếm thêm bộ nhớ, **đừng chỉ tính bộ nhớ cho máy chủ**.
- Cấp quá nhiều bộ nhớ cũng có giá: heap quá lớn thì một lần GC dừng lâu hơn. **"Bộ nhớ càng lớn càng tốt" là sai**, cách đúng là cấp đủ và quan sát GC cùng MSPT.

### 2.3 Đĩa: SSD và IOPS

Lưu thế giới, nạp chunk, đóng gói sao lưu đều ăn đĩa. **Khi đĩa chậm, CPU trông vẫn còn rảnh**, đây là loại lag khó định vị nhất.

- **Bắt buộc SSD.** Đĩa cơ chạy máy chủ hiện đại trải nghiệm cực kém, nhất là nạp chunk.
- Quan trọng hơn "có phải SSD không" là **khả năng đọc ghi ngẫu nhiên (IOPS)** và **có chia sẻ với người thuê khác không**.
- **Đĩa đầy là hỏng dữ liệu**, nên dung lượng khả dụng phải để dư (sao lưu, nhật ký, core dump đều ăn chỗ).

### 2.4 Băng thông

- **Chiều lên (chiều ra) mới là điểm nghẽn**: người chơi tải chunk, nhận gói tài nguyên đều đi qua chiều lên của bạn.
- **Băng thông rộng gia đình thường không đối xứng**, chiều lên rất nhỏ; đường truyền phòng máy thường đối xứng.
- **Tính phí theo lưu lượng và theo băng thông là hai mô hình khác nhau**, cái trước quyết toán theo GB, cái sau theo Mbps đỉnh, rủi ro hóa đơn hoàn toàn khác.

### 2.5 Phòng DDoS

Với Minecraft, phòng thủ không phải "tùy chọn cao cấp":

- Java Edition đi TCP (mặc định 25565), Bedrock Edition đi **UDP** (mặc định 19132), **lũ UDP là hình thức tấn công điển hình nhất với Bedrock Edition**.
- Gói rẻ thường **không gồm** phòng thủ hiệu quả, hoặc chỉ tặng một lớp lọc rất mỏng.
- **Chống DDoS thường là phụ phí theo tháng, và giá gắn với băng thông phòng thủ**; hình thức và giá cụ thể lấy nhà cung cấp làm chuẩn.

Ý tưởng phòng thủ và các kiểu tấn công xem [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense).

### 2.6 Không gian sao lưu

**Chỗ sao lưu chiếm thường bằng cả thế giới của bạn, và cần nhiều bản.** Lỗi phổ biến là "mua máy chủ tiết kiệm, không có chỗ đặt sao lưu", kết quả script sao lưu âm thầm thất bại mấy tháng liền —— cho đến ngày bạn cần nó.

- Sao lưu phải **đặt ngoài máy chủ bạn thuê** (khác vị trí/lưu trữ đối tượng), xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
- Lưu lượng **lấy về (chiều xuống)** của lưu trữ đối tượng thường tính phí riêng, diễn tập khôi phục cũng tốn tiền.
- Chính sách lưu giữ (giữ mấy bản, giữ bao lâu) trực tiếp quyết định chi phí.

### 2.7 Thời gian của chính bạn

Đây là mục duy nhất **gần như ai cũng tính bằng 0**, mà nó thường là mục lớn nhất:

- Cập nhật hằng tuần, kiểm tra tương thích plugin, kiểm chứng sao lưu.
- Quản lý người chơi: danh sách trắng, khiếu nại, tranh chấp, người chơi phá hoại.
- Xử lý sự cố: bị tấn công, sập máy chủ, mất bản lưu, bị xâm nhập.

**Nếu thời gian của bạn không đáng tiền, đó là vì bạn chưa ghi nó vào sổ.** Một phương án cần bạn bỏ 5 giờ mỗi tuần, và một phương án đắt hơn 50 tệ mỗi tháng nhưng tiết kiệm 3 giờ, phương án sau thường lợi hơn.

### 2.8 Đường truyền và độ trễ

Con số băng thông quyết định "chứa được bao nhiêu người", **đường truyền và độ trễ quyết định "cảm giác chơi tốt không"**. Hai thứ không thay thế nhau được:

- **Độ trễ khứ hồi (RTT)** giữa người chơi và máy chủ ảnh hưởng trực tiếp cảm giác phản hồi khi đào, tấn công, di chuyển; độ trễ cao thì băng thông lớn cũng vô ích.
- **Vị trí phòng máy và chất lượng đường truyền** thường quan trọng hơn băng thông: cùng 100 Mbps, đường truyền khác nhau có thể khác rất nhiều với người chơi trong nước.
- **Truy cập chéo nhà mạng** là cái bẫy phổ biến: người chơi của một nhà rất nhanh, người chơi nhà khác cứ nhảy độ trễ.
- Cách đo là **dùng client thật, từ mạng của người chơi để kết nối**, chứ không chỉ `ping` gateway trên máy chủ: `mtr` / `traceroute` cho thấy mất gói xảy ra ở chặng nào.

### 2.9 Chu kỳ tính phí, hoàn tiền và hợp đồng

Các điều khoản này không ảnh hưởng hiệu năng, nhưng **quyết định "mua sai" tốn bao nhiêu**:

- **Tính theo giờ/theo dùng** phù hợp thử sai, nhưng đơn giá thường cao hơn; **trả tháng** là điểm cân bằng của đa số máy chủ cá nhân; **trả năm** chiết khấu lớn nhất, khóa sâu nhất.
- **Chính sách hoàn tiền** phải xem rõ: có nhà "hoàn bất cứ lúc nào", có nhà chỉ hoàn trong vài ngày sau lần mua đầu, có nhà quy đổi theo thời gian đã dùng.
- **Giá gia hạn có thể cao hơn giá lần đầu**, đây là cấu trúc khuyến mãi phổ biến, tính chi phí dài hạn phải xem giá gia hạn.

:::note Cách nhanh nhất để phán đoán "có thử được không"
Trước khi đặt hàng hãy hỏi một câu: **nếu ba ngày sau phát hiện hiệu năng không ổn, tôi lấy lại được bao nhiêu tiền?** Nhà nào trả lời mập mờ thì đổi "trả năm" thành "trả tháng" rồi hãy quyết.
:::

## 3. So sánh bảy phương án

Bảng dưới là **so sánh định tính**, không liên quan giá cụ thể. Khi đọc hãy chú ý hai cột cuối: **chi phí ẩn** và **khi nào đừng chọn nó**.

| Phương án | Quy mô phù hợp | Ưu điểm | Nhược điểm | Chi phí ẩn | Khi nào đừng chọn nó |
| --- | --- | --- | --- | --- | --- |
| Máy tính gia đình / băng thông rộng gia đình | Máy chủ nhỏ của bạn bè, thử nghiệm, mở tạm | Chi một lần, dữ liệu trong tay mình, muốn vọc lúc nào cũng được | Chiều lên nhỏ, có thể không có IP công cộng, mất điện và mất mạng là dừng máy chủ, mạng nhà bị tấn công sẽ ảnh hưởng cả nhà | Tiền điện, tiếng ồn và nhiệt, khấu hao phần cứng, phải tự bảo trì UPS và router, chi phí thời gian cao nhất | Hướng ra công cộng, cần 7x24 ổn định, cần chống tấn công, quy mô người chơi trên hơn chục người |
| Hosting ảo chia sẻ | Trang web tĩnh, site PHP | Rẻ, cắm là dùng | **Thường không chạy được tiến trình dài hạn, cũng không mở được cổng tùy chỉnh**, hạn mức tài nguyên nghiêm | Không có đường nâng cấp, chi phí di chuyển | **Về cơ bản đều không phù hợp máy chủ Minecraft**, trừ khi nhà bán nói rõ là máy chủ game |
| VPS | Quy mô vừa và nhỏ, máy chủ cá nhân, phía proxy | Giá vừa phải, có root, tự chọn hệ điều hành và kernel | Tài nguyên chia sẻ với hàng xóm, gói rẻ phổ biến chia sẻ quá bán, phòng thủ thường rất mỏng | Băng thông phần lớn là "chia sẻ" hoặc tính theo lưu lượng, snapshot tính phí riêng, bị tấn công có thể bị dừng máy | Cần modpack nhiều bộ nhớ, cần phòng thủ mạnh, cần hiệu năng vật lý độc quyền |
| Máy chủ riêng | Quy mô vừa và lớn, modpack, nhiều instance | Độc quyền vật lý, hiệu năng ổn định dự đoán được, tự chọn phần cứng | Phí tháng cao, khai thông chậm, phần cứng hỏng phải đợi phòng máy xử lý | Băng thông và phòng thủ thường tính riêng, phí IP và vị trí, bảo trì và linh kiện dự phòng | Chỉ vài người chơi, ngân sách nhạy cảm, bản thân không định làm vận hành |
| Máy chủ bảng điều khiển / nhà bán máy chủ game | Máy chủ vừa và nhỏ muốn ít vọc | Bảng điều khiển, sao lưu, tác vụ định kỳ có sẵn, bán theo bộ nhớ hoặc slot | Chỉ dùng được môi trường nó cấp, tùy biến hạn chế, chia sẻ quá bán phổ biến | Phụ phí bộ nhớ và sao lưu thêm, di chuyển bị giới hạn bởi công cụ nhà bán, hạn mức CPU không ghi trong quảng cáo | Cần hệ điều hành hoặc kernel tùy chỉnh, cần môi trường mod đặc biệt, cần quy mô lớn chi phí thấp lâu dài |
| Máy chủ cloud theo dùng | Tải dao động, hoạt động ngắn hạn, thử nghiệm | Co giãn, bật tắt theo nhu cầu, hệ sinh thái đầy đủ (snapshot, image, giám sát) | **Hóa đơn không dự đoán được**, cấu hình mặc định thường đắt, phải tự dựng mọi thứ | IP công cộng, lưu trữ snapshot, image, nhật ký, lưu lượng ra tính phí riêng; quên tắt máy là đốt tiền liên tục | Tải ổn định lâu dài (trả năm/trả tháng thường lợi hơn), nhóm không đặt cảnh báo ngân sách |
| Host / colocation | Phần cứng tự có, quy mô lớn, nhu cầu tuân thủ | Phần cứng tự chủ, chi phí đơn vị dài hạn có thể thấp hơn | Phải tự chuẩn bị phần cứng, ký hợp đồng, sự cố tự xử lý | Phí vị trí, phí điện, phí băng thông, phí remote hands, thời gian có mặt | Chỉ một máy, không có linh kiện dự phòng, không có năng lực vận hành |

### 3.1 Máy tính gia đình / băng thông rộng gia đình

Định vị của nó rất rõ: **chi phí thấp nhất, khả năng kiểm soát cao nhất, độ tin cậy thấp nhất**. Phù hợp máy chủ nhỏ giữa bạn bè. Muốn biết dùng được không, xác nhận ba việc trước: **có IP công cộng không** (nhiều đường băng thông rộng gia đình là CGNAT, hoàn toàn không có), **chiều lên lớn bao nhiêu**, **điều khoản nhà mạng có cho phép phục vụ ra ngoài lâu dài không**. Cách làm và cái bẫy chi tiết xem [Mở máy chủ bằng máy tính gia đình và bảo trì](/tutorials/ops/home-hosting).

### 3.2 Hosting ảo chia sẻ

**Nó không phải lựa chọn cho Minecraft.** Hosting chia sẻ bán "môi trường chạy website": không có tiến trình thường trú dài hạn, không lắng nghe được cổng tùy ý, CPU và bộ nhớ có hạn mức cứng. Một số ít nhà bán gộp "máy chủ game" vào từ này, thực chất đó là máy chủ bảng điều khiển hoặc container, phán đoán theo 3.5.

### 3.3 VPS

Phương án phổ biến nhất với cá nhân và nhóm nhỏ. Điểm chính là: **"số nhân" của gói rẻ có giá trị tham khảo hạn chế, hiệu năng đơn nhân và IOPS đĩa mới là then chốt**; băng thông phải xem rõ là "độc quyền" hay "chia sẻ", là "không giới hạn lưu lượng nhưng giới hạn tốc độ" hay "tính theo lưu lượng".

### 3.4 Máy chủ riêng

Khi modpack, nhiều instance hoặc quy mô người chơi đẩy VPS vào góc tường, máy chủ riêng là bước tiếp theo tự nhiên. Giá trị của nó là **dự đoán được**: nhân vật lý, đĩa vật lý, băng thông vật lý. Cái giá là **phí tháng và trách nhiệm vận hành cùng tăng**.

### 3.5 Máy chủ bảng điều khiển / nhà bán máy chủ game

Phù hợp "tôi không muốn chạm vào Linux". Tiền chủ yếu chi vào **tiết kiệm thời gian**, nên tiêu chuẩn phán đoán là: **thời gian vận hành nó tiết kiệm có lớn hơn phần giá cao hơn không**. Chú ý hai điểm: **model CPU trên quảng cáo thường không bằng hiệu năng thực tế bạn được chia**; **công cụ di chuyển thường chỉ chuyển ra được định dạng của chính nó**, trước khi đi hãy xác nhận bản lưu và cấu hình của bạn có mang đi được đầy đủ không.

### 3.6 Máy chủ cloud theo dùng

Ưu thế của tính theo dùng là co giãn, nhược điểm là **hóa đơn không dự đoán được**. Mở một máy để thử rất sướng, quên tắt một tháng cũng rất "sướng". Nếu định dùng, làm ba việc trước: đặt **cảnh báo ngân sách**, đặt **tự tắt máy hoặc nhắc hết hạn**, và xem rõ **cách tính phí IP công cộng và snapshot**.

### 3.7 Host / colocation

Đây là đáp án cho "tôi đã có phần cứng, cũng có năng lực vận hành". Chi phí đơn vị giảm theo quy mô, nhưng **ngưỡng và trách nhiệm cũng tăng theo quy mô**: phần cứng hỏng không có nhà cung cấp thay đĩa hộ, chỉ có bạn (hoặc remote hands trả phí).

## 4. Những mục chi phí dễ bỏ sót

| Mục chi phí | Vì sao dễ bỏ sót | Tránh thế nào |
| --- | --- | --- |
| IP công cộng / IP co giãn | Một số nhà tính IP riêng, IP để không cũng có thể bị tính phí | Trước khi đặt hàng xác nhận trên trang giá IP có gồm không, để không có tính phí không |
| Phí vượt lưu lượng | "Không giới hạn lưu lượng" thường kèm điều khoản sử dụng công bằng hoặc giới hạn tốc độ | Xem rõ là giới hạn tốc độ hay tính phí, đơn giá vượt là bao nhiêu |
| Lưu trữ sao lưu | Sao lưu không chiếm chỗ máy chủ, nhưng tốn tiền lưu trữ đối tượng | Tính kích thước thế giới x số bản trước, rồi chọn chính sách lưu giữ |
| Snapshot | Snapshot không phải sao lưu, và tính phí theo dung lượng | Dùng sao lưu thay snapshot làm biện pháp bảo toàn dữ liệu (xem mục 8) |
| Chống DDoS cao cấp | Băng thông phòng thủ càng lớn càng đắt, và thường là phụ phí theo tháng | Xác định rõ "phòng thủ cơ bản" chịu được gì, rồi mới quyết định có mua |
| Tên miền và chứng chỉ | Tên miền gia hạn theo năm, quên gia hạn là mất phân giải luôn | Bật tự động gia hạn; chứng chỉ xem [Chứng chỉ HTTPS và tự động gia hạn](/tutorials/ops/https) |
| Tiền điện và tiếng ồn (phương án gia đình) | Máy chạy 7x24, đồng hồ điện và tai đều biết | Ước tính theo giá điện địa phương (xem ví dụ bên dưới), và tính cả tản nhiệt, tiếng ồn |
| Chi phí thời gian | Không ai ghi nó vào bảng ngân sách | Ghi lại thời gian thực bỏ ra mỗi tuần, vài tháng sau bạn sẽ đổi ý |
| Chi phí di chuyển | Chuyển nhà không phải chép tệp, mà là **một khung giờ bảo trì** | Xem [Di chuyển máy chủ](/tutorials/ops/server-migration) |

:::tip Một ví dụ tính tiền điện
Một máy công suất trung bình khoảng 60 W chạy 7x24: 60 W x 24 h = 1.44 kWh/ngày, khoảng 43 kWh/tháng. Theo 0.6 tệ/kWh, khoảng **26 tệ/tháng**. Đây chỉ là ví dụ tính: **công suất và giá điện đều phải tính lại bằng số của bạn**, màn hình, router, UPS và điều hòa tính thêm riêng.
:::

## 5. Ước lượng quy mô một cách trung thực

### 5.1 Ước lượng thô từ số người chơi đến tài nguyên

Bảng dưới là **tham khảo bậc độ lớn, không phải bảng thông số**. Nhu cầu thật chịu ảnh hưởng rất lớn bởi phiên bản, lõi, khoảng cách nhìn, plugin, kích thước thế giới và cách chơi.

| Quy mô | CPU | Bộ nhớ (heap máy chủ) | Băng thông | Ghi chú |
| --- | --- | --- | --- | --- |
| 2 - 5 người, máy chủ bạn bè | Hai nhân có đơn nhân khá mạnh là đủ | Bậc 2 - 4 GB | Chiều lên băng thông rộng gia đình thường đủ | Máy tính gia đình thường là đủ |
| 10 - 20 người, bản gốc/ít plugin | Hiệu năng đơn nhân cao, 2 - 4 nhân | Bậc 4 - 8 GB | Bậc vài Mbps | Khoảng cách nhìn và số thực thể ảnh hưởng rất lớn |
| 30 - 50 người, máy chủ plugin | Đơn nhân cao + đa nhân bổ trợ | Bậc 8 - 16 GB | Bậc hơn chục Mbps | Cần SSD thật và đường truyền ổn định |
| Mod / modpack | Ưu tiên hiệu năng đơn nhân cao | Thường gấp vài lần bản gốc | Tùy lượng đồng bộ | **Lấy tài liệu chính thức của modpack làm chuẩn** |
| Nhiều instance / máy chủ nhóm | Đa nhân bắt đầu có ý nghĩa | Cộng từng instance rồi thêm proxy và cơ sở dữ liệu | Cộng dồn | Xem [Phía chuyển máy chủ](/tutorials/java/proxy) |

**Ước lượng thô băng thông**: ở trạng thái ổn định mỗi người chơi thường chỉ chiếm **bậc vài chục KB/s** (khoảng 0.2 - 1 Mbit/s), nhưng khoảng cách nhìn lớn, nhiều thực thể, người chơi bay nạp vùng mới sẽ cao hơn rõ rệt, **lưu lượng đột biến khi gửi chunk lúc vào máy chủ lớn hơn nhiều so với trạng thái ổn định**. Những con số này phụ thuộc rất nhiều vào phiên bản và cách chơi, **hãy lấy số đo thực tế của bạn làm chuẩn** (`vnstat`、`nload`, biểu đồ lưu lượng của bảng điều khiển đều được).

### 5.2 Chia sẻ quá bán là chuyện bình thường của gói rẻ

Những từ "loại chia sẻ" "loại đột biến" "sử dụng công bằng" phía sau thường là cùng một chuyện: **bạn mua một hạn ngạch, không phải một nhân độc quyền**. Bản thân đó không phải lừa dối, mà là lý do gói rẻ tồn tại; vấn đề là **nó khiến việc "xem thông số mua máy" trở nên không đáng tin**.

Khuyến nghị thực hành:

- Lấy **hiệu năng đơn nhân** làm chỉ số đầu tiên, chứ không phải số nhân hay con số xung nhịp.
- Kỳ vọng về "tải cao lâu dài" phải thận trọng: hạn ngạch đột biến phù hợp đỉnh, không phù hợp full tải 7x24.
- **Mua chu kỳ ngắn để kiểm chứng trước**, chạy lên rồi mới quyết định có dùng lâu dài.

### 5.3 Đừng chỉ xem đơn giá, hãy tính chi phí đơn vị

Khi so hai phương án, quy chúng về cùng một thước đo: **tổng chi mỗi tháng ÷ số người chơi có thể chịu ổn định**. Tính vậy, phương án "đắt hơn 30% nhưng chở được gấp đôi người chơi" thường lập tức trở nên lợi.

### 5.4 Mua nhỏ trước, lớn sau

Một chiến lược phản trực giác nhưng rất thực dụng: **mua một bậc nhỏ hơn rõ rệt trước, kiểm chứng điểm nghẽn thật, rồi thêm tiền theo điểm nghẽn.**

Lý do là **đa số người ta đánh giá quá cao quy mô của mình**. Trước khi mở máy chủ nghĩ là "sau này sẽ có 50 người", thực tế thường là ba tháng đầu trung bình 3 người trực tuyến. Nếu ngay từ đầu mua theo 50 người, bạn sẽ trả tiền cho những người chơi không tồn tại trong một thời gian dài.

Cách làm cụ thể:

1. Mua bậc khả dụng nhỏ nhất theo "quy mô hiện tại + một chút dư".
2. Dùng [Giám sát và cảnh báo](/tutorials/ops/monitoring) ghi lại đường cong thật của mức chiếm đơn nhân CPU, bộ nhớ, I/O đĩa và băng thông.
3. Có số liệu rồi mới nâng cấp: **nâng cấu hình thường dễ hơn hạ cấu hình**, và nhiều nhà hỗ trợ nâng cấu hình trực tuyến (**có hỗ trợ không, có phải khởi động lại không, lấy tài liệu nhà bán làm chuẩn**).
4. Nếu điểm nghẽn là I/O đĩa hoặc hiệu năng đơn nhân, **thêm bộ nhớ là vô ích** —— lúc đó phải tính đổi nhà bán chứ không phải nâng gói.

## 6. Đo thế nào trước khi mua

### 6.1 Hiệu năng đơn nhân quan trọng hơn số nhân

Điểm benchmark bên thứ ba (như điểm đơn luồng thường thấy) có thể dùng làm **sàng lọc thô**, để loại máy rõ ràng không ổn, nhưng nó **không đo ra chia sẻ quá bán, nhiễu hàng xóm và điểm nghẽn đĩa**. Nên điểm chỉ dùng để thu hẹp phạm vi, phán đoán cuối cùng phải dựa vào đo thực tế.

### 6.2 Cần dùng thử, hoặc mua chu kỳ ngắn nhất trước

- Ưu tiên nhà **có dùng thử hoặc tính phí theo giờ**, chạy một lần tải thật rồi mới quyết định.
- Không có dùng thử thì **mua chu kỳ ngắn nhất trước** (trả tháng thậm chí theo ngày), đừng trả năm ngay từ đầu.
- **Nhất định đo "kịch bản thật của bạn"**: bê máy chủ, plugin, bản lưu lên, gọi vài người vào chơi một lần, có sức thuyết phục hơn mọi điểm benchmark.

### 6.3 Đo I/O đĩa

Đĩa là chỗ gói rẻ dễ cắt xén nhất. Hai cách đo phổ biến:

```bash
# Kiểm tra ghi tuần tự: tạo tệp tạm trên hệ thống tệp đích, đo xong xóa đi
dd if=/dev/zero of=./io-test.bin bs=1M count=1024 conv=fdatasync status=progress
rm -f ./io-test.bin

# Kiểm tra đọc ngẫu nhiên (cần cài fio; ý nghĩa tham số lấy tài liệu chính thức fio làm chuẩn)
fio --name=randread --rw=randread --bs=4k --iodepth=32 \
    --size=1G --numjobs=1 --time_based --runtime=30s --group_reporting
```

Đọc kết quả cần chú ý: con số ghi tuần tự của `dd` **dễ lạc quan** (chịu ảnh hưởng cache và hệ thống tệp), IOPS đọc ngẫu nhiên mới gần với áp lực thật của nạp chunk và ghi bản lưu. **Việc đo sẽ tạo lượng ghi lớn trên đĩa, hãy làm trong thư mục tạm, đo xong xóa đi, đừng làm trong thư mục dữ liệu máy chủ.**

## 7. Cái bẫy "bây giờ rẻ, sau này đắt"

| Cái bẫy | Rẻ ở đâu | Đắt ở đâu | Tránh thế nào |
| --- | --- | --- | --- |
| Bỏ qua chi phí di chuyển | Chọn máy rẻ nhất | Chuyển nhà phải dừng máy một lần, còn phải xử lý DNS, danh sách trắng, sao lưu, giám sát | Ngay từ đầu chọn phương án **xuất được dữ liệu đầy đủ**, và coi chuyển nhà là sự kiện tất yếu; xem [Di chuyển máy chủ](/tutorials/ops/server-migration) |
| Không có chỗ sao lưu | Chỉ mua máy chủ, không mua lưu trữ | Mất bản lưu một lần là mất toàn bộ tiến trình | Sao lưu đặt ngoài máy chủ ngay từ đầu; xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Không có phòng DDoS | Tiết kiệm phí phòng thủ hằng tháng | Bị tấn công thì rớt mạng, bị nhà bán dừng máy, mất người chơi | Ít nhất xác nhận ranh giới năng lực của phòng thủ cơ bản; xem [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) |
| Hóa đơn vượt lưu lượng | Đơn giá theo dùng trông thấp | Một lần bị tấn công hoặc một lần phân phát gói tài nguyên là đốt hết ngân sách một tháng | Đặt cảnh báo ngân sách, ưu tiên chọn giới hạn tốc độ thay vì tính phí, đặt gói tài nguyên trên lưu trữ đối tượng |
| Khóa trả năm | Chiết khấu trả năm rất hấp dẫn | Nhà bán bỏ trốn, hiệu năng không đạt, muốn đổi cũng không đổi được | Năm đầu trả tháng, ổn định rồi mới tính dài hạn |
| Thời gian tính bằng 0 | Tự làm "không tốn tiền" | Vài giờ mỗi tuần bỏ ra liên tục | Ghi thời gian vào bảng ngân sách, rút kinh nghiệm định kỳ |

## 8. Giảm chi phí một cách hợp lý

Những cách này **không hy sinh độ tin cậy**, chỉ là tiêu tài nguyên vào đúng chỗ:

- **Giảm khoảng cách nhìn (view-distance)**: đây là tối ưu đơn mục hiệu quả nhất, trực tiếp giảm gửi chunk và xử lý thực thể.
- **Giảm thế giới thường trú**: mỗi chiều/thế giới thêm đều ăn bộ nhớ và I/O đĩa; cái không dùng thì tắt trước.
- **Khởi động lại định kỳ**: giảm nhẹ bộ nhớ tăng chậm và rò rỉ handle (**nhưng nó không phải sửa chữa, chỉ là che đi**; phải đồng thời tra nguyên nhân gốc).
- **Dùng sao lưu thay snapshot**: snapshot tính phí theo dung lượng và không bằng bản sao lưu khôi phục được; bảo toàn dữ liệu đúng cách xem [Sao lưu và khôi phục](/tutorials/java/backup).
- **Sinh trước thế giới**: dời chi phí sinh chunk ra trước khi mở máy chủ, giảm đỉnh đơn nhân lúc chạy.
- **Tự chạy bảng điều khiển**: máy chủ bảng điều khiển tiết kiệm thời gian, nếu bạn vốn biết Linux, tự dựng bảng điều khiển tiết kiệm được phần giá cao hơn (cái giá là thêm một thành phần phải bảo trì, xem [Cách dùng và an toàn của công cụ quản lý bảng điều khiển](/tutorials/ops/panels)).
- **Tắt dịch vụ không dùng**: bản đồ web, instance thêm, máy chủ thử nghiệm, đều chiếm tài nguyên liên tục.
- **Gộp giờ thấp điểm**: khi người chơi tập trung buổi tối, có thể chỉ mở instance cấu hình cao trong khung giờ đó.

:::warn Hai lằn ranh đỏ khi giảm chi phí
**Đừng tiết kiệm sao lưu, đừng tiết kiệm phòng thủ.** Tiền tiết kiệm hai mục này thường được trả lại cả gốc lẫn lãi trong sự cố đầu tiên. Có thể hạ cấu hình, có thể đổi máy rẻ hơn, nhưng **dữ liệu khôi phục được** và **tấn công chịu được** là đáy.
:::

## 9. Bảng tính hoạch định ngân sách

Chép bảng dưới vào ghi chú của bạn, điền theo tình hình thực tế. **Cột "mô tả" ghi rõ căn cứ, vài tháng sau bạn vẫn hiểu vì sao lúc đó chọn vậy.**

| Mục | Một lần | Hằng tháng | Mô tả |
| --- | --- | --- | --- |
| Máy chủ / server |  |  | Thông số, hiệu năng đơn nhân, có chia sẻ quá bán không |
| IP công cộng và băng thông |  |  | Độc quyền hay chia sẻ, giới hạn tốc độ hay tính phí |
| Phòng DDoS |  |  | Phòng thủ cơ bản chịu được gì, có cần chống cao cấp không |
| Lưu trữ sao lưu |  |  | Kích thước thế giới x số bản giữ, có khác vị trí không |
| Tên miền |  |  | Gia hạn theo năm, nhớ bật tự động gia hạn |
| Chứng chỉ |  |  | Chứng chỉ ACME miễn phí thường là 0, xem [Chứng chỉ HTTPS và tự động gia hạn](/tutorials/ops/https) |
| Bảng điều khiển / công cụ quản lý |  |  | Tự dựng tiết kiệm phí tháng, tốn thời gian |
| Tiền điện (phương án gia đình) |  |  | Công suất x giá điện, xem ví dụ ở mục 4 |
| Phần cứng và linh kiện dự phòng |  |  | Đĩa, bộ nhớ, UPS, dây mạng |
| Di chuyển và khung giờ bảo trì |  |  | Ảnh hưởng của dừng máy, thông báo và nhân công |
| Thời gian bỏ ra |  |  | Mấy giờ mỗi tuần, quy ra tiền |
| Dự phòng đệm (10% - 20%) |  |  | Sự cố, thêm cấu hình, vượt lưu lượng |

## 10. Tóm lại

- **Ước lượng quy mô trước, rồi chọn phương án.** Số người chơi, có mod hay không, có mở công khai hay không, quyết định những lựa chọn bạn hoàn toàn không cần cân nhắc.
- **Hiệu năng đơn nhân > số nhân**, **IOPS đĩa > dung lượng đĩa** (với điều kiện đủ dùng).
- **Tách bốn loại chi phí một lần, hằng tháng, biến đổi, thời gian ra tính**, chi phí ẩn phần lớn ở loại thứ ba và thứ tư.
- **Phương án tối ưu cho máy chủ nhỏ thường rất đơn giản**: chơi giữa bạn bè, máy tính gia đình hoặc VPS rẻ nhất đủ dùng là tốt, trọng tâm là **sao lưu**.
- **Máy chủ công khai là chuyện khác**: một khi mở ra công cộng, **phòng thủ thật và sao lưu khác vị trí thật không còn là tùy chọn**, ngân sách máy chủ cũng phải định theo tiền đề đó.
- **Khả năng chuyển nhà phải xác nhận lúc mua**, chứ không phải lúc cần chuyển mới phát hiện.

## Bước tiếp theo

- Cách làm đầy đủ của phương án gia đình: [Mở máy chủ bằng máy tính gia đình và bảo trì](/tutorials/ops/home-hosting)
- Phát hành ra ngoài và cổng: [Triển khai đến môi trường truy cập được](/tutorials/java/deploy)
- Chuyển nhà thì có chuyện gì: [Di chuyển máy chủ](/tutorials/ops/server-migration)
- Bảo toàn dữ liệu: [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)
- An ninh và phòng thủ: [Gia cố an ninh hệ thống](/tutorials/ops/system-security) và [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense)
- Chứng chỉ và bảng điều khiển phía web: [Chứng chỉ HTTPS và tự động gia hạn](/tutorials/ops/https) và [Cách dùng và an toàn của công cụ quản lý bảng điều khiển](/tutorials/ops/panels)

---

> Giá, gói cước và cấu hình của từng phần mềm lấy theo nhà cung cấp và tài liệu chính thức làm chuẩn.
