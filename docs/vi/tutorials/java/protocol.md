---
title: Giao thức mở máy chủ và khuyến nghị cấu hình
slug: protocol
cat: java
level: 1
order: 1
minutes: 10
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, giao thức, eula, cấu hình, phần cứng, RAM]
updated: 2026-10-04
draft: false
---

Trước khi mở máy chủ có hai việc phải chốt: **về giao thức có được mở như vậy không**, và **máy có chịu được không**. Hai việc này chưa rõ ràng thì việc cài môi trường, cài lõi phía sau đều là lãng phí thời gian và tiền.
:::note Bài này giải quyết gì
① Ranh giới của giao thức chính thức với việc cá nhân mở máy chủ; ② cấu hình tối thiểu và cấu hình khuyến nghị; ③ vì sao CPU then chốt hơn RAM.
:::

## Một, giao thức chính thức: được làm gì, không được làm gì

Máy chủ Java Edition khi khởi động bắt buộc phải đồng ý [Thỏa thuận cấp phép người dùng cuối Minecraft (EULA)](https://aka.ms/MinecraftEULA). Cách làm rất đơn giản: lần khởi động đầu sẽ sinh `eula.txt`, đổi `eula=false` thành `eula=true`. **Không đổi thì khởi động xong thoát ngay.**

| Hạng mục | Giải thích |
| --- | --- |
| Máy chủ cá nhân | Được tự do dựng, chơi giữa bạn bè không có giới hạn nào |
| Phân phối lại chương trình máy chủ | **Không được** phân phối lại jar máy chủ chính thức, chỉ được tải từ kênh chính thức hoặc kênh chính thức của lõi |
| Thu phí | Có thể thu phí với máy chủ, nhưng không được bán bản thân trò chơi, không được bán nội dung game bản gốc ảnh hưởng đến công bằng; cụ thể lấy điều khoản chính thức của từng lõi và nền tảng làm chuẩn |
| Dùng danh nghĩa chính thức | **Không được** khiến người chơi hiểu nhầm máy chủ của bạn do Mojang vận hành chính thức |
| Xác thực bản quyền | `online-mode=true` trong `server.properties` là giá trị mặc định, sẽ xác minh tài khoản bản quyền |
:::warn Về chế độ offline
`online-mode=false` (thường gọi là máy chủ offline) hạ thấp ngưỡng vào, nhưng đồng thời mất bảo vệ tài khoản: ai cũng có thể mạo danh bất kỳ ID nào để vào, cũng không dùng được skin bản quyền và liên kết UUID. **Chỉ dùng khi bạn hiểu hoàn toàn rủi ro và máy chủ không công khai ra ngoài.**
:::

## Hai, khuyến nghị cấu hình

### Cấu hình tối thiểu (1～3 người, máy chủ nhỏ thử nghiệm)

| Hạng mục | Yêu cầu | Giải thích |
| --- | --- | --- |
| CPU | **2 nhân** (khuyến nghị 3GHz+ xung nhịp đơn nhân cao) | Xem hiệu năng đơn nhân, không xem số nhân |
| RAM | **4GB** (hệ thống 1GB + MC 3GB) | Bắt buộc để dư cho hệ thống |
| Ổ đĩa | **20GB SSD** | Ổ cơ học tải rất chậm |
| Mạng | Băng thông lên **ít nhất 10Mbps** | Băng thông lên mới là điểm nghẽn, xuống lớn không có ích |

### Cấu hình khuyến nghị (dưới 10 người, mở ổn định lâu dài)

| Hạng mục | Yêu cầu | Giải thích |
| --- | --- | --- |
| CPU | **4 nhân** | Xung nhịp đơn nhân vẫn ưu tiên |
| RAM | **8GB** (cấp cho MC 6GB) | Phần còn lại để cho hệ thống và bộ đệm |
| Ổ đĩa | **50GB SSD** | Bản lưu, sao lưu, nhật ký đều tăng |
| Mạng | Băng thông lên **30Mbps+** | Đông người, cài plugin xong càng cần dư |

### Cấu hình máy chủ kỹ thuật redstone (chạy máy móc và máy nuốt thế giới)

| Hạng mục | Yêu cầu | Giải thích |
| --- | --- | --- |
| CPU | **8 nhân** (khuyến nghị 4.5GHz+ xung nhịp đơn nhân cao) | Máy nuốt thế giới, cắt cổng và máy lớn gần như đều dồn lên một nhân, số nhân chủ yếu để dư cho máy chủ con và tiến trình nền |
| RAM | **16~32GB** | Tính đến việc mở nhiều máy chủ con: mỗi máy chủ con phải cấp RAM riêng, hệ thống và bộ đệm cũng cần dư |
| Ổ đĩa | **120GB+** | Tính đến sao lưu: máy vừa động thổ, bản lưu và sao lưu tăng nhanh hơn nhiều so với máy chủ sinh tồn thường |
| Mạng | Băng thông lên **100Mbps+** | Đồng bộ hình chiếu, nhiều người cùng màn hình và lượng lớn gói dữ liệu thực thể đều đi qua băng thông lên, phải để đủ dư |

### Vì sao CPU then chốt hơn RAM

**Máy chủ Minecraft yêu cầu hiệu năng đơn nhân CPU cao hơn nhiều so với yêu cầu RAM.** Luồng chính phải xử lý tuần tự thực thể, chunk, redstone và logic plugin, những thứ này gần như đều dồn lên **một nhân** —— nhân nhiều đến đâu thì luồng chính vẫn chỉ có một.

Nên sẽ có tình huống: **một máy 2 nhân 4GB nhưng đơn nhân chạy 3.5GHz, thực tế mượt hơn máy 8 nhân 2GB.** Máy trước đơn nhân mạnh, luồng chính không lag; máy sau tuy nhiều nhân, nhưng vì xung nhịp thấp, RAM lại không đủ, TPS vẫn tụt.

Thứ tự ưu tiên khi chọn máy:

1. **Xung nhịp đơn nhân** (càng cao càng tốt, trên 3.5GHz trải nghiệm tốt rõ rệt)
2. **Dung lượng RAM** (đủ dùng là được, thiếu sẽ OOM hoặc GC liên tục)
3. **Loại ổ đĩa** (SSD là yêu cầu cứng, ảnh hưởng tải chunk và ghi bản lưu)
4. **Số nhân** (máy chủ plugin, mở nhiều thực thể, proxy mới cần nhiều nhân hơn)
:::tip RAM không phải càng lớn càng tốt
`-Xmx` cấp cho MC quá lớn mang lại hai tác dụng phụ: ① một lần dừng GC kéo dài hơn, biểu hiện là lag theo chu kỳ; ② RAM khả dụng của hệ thống bị chiếm, ngược lại chậm hơn. **Dưới 10 người cấp 4～6GB thường là đủ**, phần còn lại để cho hệ thống.
:::

### Các yếu tố khác ảnh hưởng trải nghiệm

- **IO ổ đĩa**: thế giới càng lớn, chạy bản đồ càng thường xuyên, áp lực IO càng lớn. SSD không chỉ "khởi động nhanh", nó ảnh hưởng trực tiếp đến lag khi chạy bản đồ.
- **Băng thông lên**: băng thông gia đình thường băng thông lên nhỏ hơn nhiều so với xuống. Trước khi mở máy chủ hãy xác nhận **băng thông lên** có bao nhiêu, đừng nhìn con số "500M" trên gói cước.
- **Độ trễ mạng**: khoảng cách vật lý giữa người chơi và máy chủ quyết định độ trễ cơ bản, người chơi trong nước chơi máy chủ ở phòng máy trong nước trải nghiệm tốt nhất.
- **Có trực tuyến lâu dài không**: máy tính gia đình ngủ hoặc mất điện là rớt mạng; định mở máy chủ lâu dài thì máy chủ đám mây hoặc máy chủ riêng phù hợp hơn.

## Ba, tiếp theo làm gì

1. **Chọn hệ điều hành**: xem [Chọn hệ điều hành](/tutorials/java/os) —— mở lâu dài ưu tiên Linux, chơi cục bộ với người quen thì Windows cũng đủ
2. **Cài môi trường**: xem [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment) —— cài đúng Java, mở cổng, tạo thư mục
3. **Chọn lõi**: xem [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) —— mở máy chủ lần đầu thường chọn thẳng Paper
:::note Tóm lại
Đồng ý điều khoản đầy đủ, **xung nhịp đơn nhân ưu tiên hơn số nhân và RAM**, SSD và băng thông lên đạt chuẩn —— đủ ba điểm này, máy đó mở máy chủ ổn định được.
:::
