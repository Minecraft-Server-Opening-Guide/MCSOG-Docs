---
title: Plugin kinh tế và lối chơi: phân loại, chọn lựa và rủi ro
slug: gameplay-plugins
cat: ops
level: 2
order: 23
minutes: 16
tags: [kinh tế, plugins, vault, cửa hàng, nhiệm vụ, rút thăm, balance, hiệu năng]
updated: 2026-10-04
draft: false
---

Bài hướng dẫn kỹ thuật chỉ cần nói rõ "cài plugin thế nào, phụ thuộc những gì" là đủ, nhưng thứ thực sự quyết định máy chủ có giống một "trò chơi" hay không lại là **plugin kinh tế và lối chơi**: tiền từ đâu đến, cửa hàng định giá thế nào, nhiệm vụ thưởng gì, danh hiệu hiển thị ra sao, trong rương mở ra được cái gì.

Bài này đi theo **phân loại** để nói rõ mỗi loại plugin làm gì, cái giá phải trả là gì, rủi ro nằm ở đâu. Ở những đoạn có nêu tên plugin cụ thể, chỉ viết những khả năng có thể đối chiếu được từ **trang chính thức** của plugin đó (kho chính thức, trang tài liệu chính thức); phần không đối chiếu được thì chỉ mô tả loại, không bịa ra tên cụ thể. Kiến thức cơ bản về phụ thuộc xem [Nhập môn plugin](/tutorials/java/plugins) và [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps).
:::warn Plugin lối chơi là "mã", không phải "gói nội dung"
Mỗi plugin lối chơi bạn cài thêm là thêm một phần: mã cần theo dõi cập nhật, mã có thể xung đột với plugin khác, mã có thể bị lợi dụng để farm vật phẩm, và mã sẽ liên tục ăn hiệu năng luồng chính. **Plugin lối chơi không phải càng nhiều càng tốt**. Trước hết phải nghĩ rõ muốn giải quyết vấn đề gì rồi mới đi tìm plugin; đừng cài chỉ vì "máy chủ người ta có".
:::

## 1. Trước hết hãy dựng mô hình tư duy đúng

Trước khi chọn plugin, hãy nghĩ rõ bốn việc:

| Câu hỏi | Vì sao quan trọng |
| --- | --- |
| Plugin này giải quyết vấn đề gì | Không nói ra được thì đừng cài. Cài xong không ai dùng thì coi như trả tiền hiệu năng và rủi ro mà không được gì |
| Nó phụ thuộc gì | Thiếu phụ thuộc sẽ lỗi tải hoặc tính năng im lặng mất tác dụng, xem [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps) |
| Nó lưu dữ liệu ở đâu | Kiểu lưu bằng file thì hành vi khi đổi máy chủ, mở máy chủ con, sao lưu hoàn toàn khác nhau |
| Nó có bị người chơi lợi dụng được không | Bất kỳ plugin "sản xuất được vật phẩm hoặc tiền tệ" nào cũng là cửa vào tiềm năng để farm |

Rủi ro của plugin lối chơi có thể chia thô thành bốn loại, các mục sau sẽ nhắc lại nhiều lần:

- **Rủi ro kinh tế**: sản xuất tiền tệ hoặc vật phẩm giá trị cao từ hư không, dẫn đến lạm phát.
- **Rủi ro an ninh**: lỗi nhân bản, vượt quyền, chèn lệnh.
- **Rủi ro hiệu năng**: tính toán thêm mỗi tick, số lượng thực thể, tần suất truy vấn cơ sở dữ liệu.
- **Rủi ro vận hành**: người chơi thấy không công bằng, nội dung bị khai thác cạn, tác giả ngừng cập nhật khiến kẹt ở bản cũ.

## 2. Bảng tổng hợp phân loại

Nhìn toàn cục trước, rồi mở ra từng mục.

| Phân loại | Thêm gì | Độ khó | Chi phí hiệu năng | Rủi ro chính |
| --- | --- | --- | --- | --- |
| Hệ thống kinh tế (API + triển khai) | Nền tảng cho tiền tệ, số dư, chuyển khoản | Trung bình | Thấp (ghi và truy vấn cơ sở dữ liệu) | Nguồn tiền mất kiểm soát gây lạm phát; dữ liệu hỏng |
| Cửa hàng | Kênh mua bán, nơi định giá | Trung bình | Thấp đến trung bình (tùy số cửa hàng và tần suất truy vấn) | Định giá sai, thu mua vô hạn, bị farm |
| Nhiệm vụ và thành tựu | Cảm giác có mục tiêu, giữ chân hằng ngày | Trung bình đến cao (chi phí thiết kế nội dung cao) | Thấp đến trung bình | Phần thưởng đánh sập kinh tế; nội dung bị khai thác cạn |
| Danh hiệu và tước hiệu | Thể hiện thân phận, biểu tượng xã hội | Thấp | Rất thấp | Gắn với độ mạnh trả phí sẽ tổn hại niềm tin |
| Rút thăm và rương | Phần thưởng ngẫu nhiên, kích thích ngắn hạn | Trung bình | Thấp đến trung bình (hiệu ứng và phát sóng) | Nghiện cờ bạc, vấn đề tuân thủ và đạo đức của thưởng ngẫu nhiên trả phí |
| Nghề nghiệp và kỹ năng | Tuyến phát triển dài hạn | Trung bình đến cao | Trung bình (lắng nghe sự kiện tần suất cao) | Sản lượng mất kiểm soát; xung đột với lối chơi sinh tồn |
| Minigame và parkour | Lối chơi độc lập, tương tác nhiều người | Cao | Trung bình đến cao (thế giới và instance riêng) | Thiếu người gây trống phòng; chi phí bảo trì cao |
| Lãnh thổ và bảo vệ | Cảm giác an toàn tài sản | Trung bình | Trung bình (sự kiện khối và truy vấn) | Quy tắc phức tạp, đẩy người mới đi; dễ mất cân bằng khi liên kết kinh tế |
| Lối chơi công nghệ quy mô lớn | Trải nghiệm chơi hoàn toàn khác | Rất cao | Cao (lượng lớn vật phẩm tùy chỉnh và logic máy móc) | Hiệu năng, nâng cấp phiên bản khó, ngưỡng tiếp cận cao |
| Chống gian lận và ghi nhật ký | Trật tự và khả năng truy vết | Trung bình | Trung bình (plugin ghi nhật ký liên tục ghi đĩa) | Ghi không đầy đủ; cài muộn thì không tra được lịch sử |
:::tip Dùng bảng này thế nào
"Độ khó" ở đây là **chi phí bạn bỏ ra để cấu hình và bảo trì nó**, không phải plugin phức tạp hay không. Một plugin có hàng nghìn dòng cấu hình, dù tài liệu đầy đủ đến đâu, cũng sẽ ngốn của bạn rất nhiều thời gian. **Tính ngân sách thời gian của mình trước, rồi mới tính ngân sách hiệu năng.**
:::

## 3. Hệ thống kinh tế: luôn có hai lớp

### 3.1 Phải hiểu tách biệt API và phần triển khai

Đây là cái bẫy người mới dễ giẫm nhất: **đã cài Vault mà vẫn không có hệ thống kinh tế**.

Định vị chính thức của Vault là **thư viện trừu tượng của Bukkit** (mô tả kho chính thức: *Vault of common APIs for Bukkit Plugins*; tiêu đề README: *Vault - Abstraction Library for Bukkit*). Bản thân nó không sinh ra tiền tệ nào, chỉ định nghĩa một bộ giao diện thống nhất để "plugin cần năng lực kinh tế" và "plugin thực sự cung cấp năng lực kinh tế" nói chuyện được với nhau. API dành cho nhà phát triển của nó đã tách sang kho VaultAPI riêng (theo README chính thức).

Vì vậy hệ thống kinh tế luôn là **hai lớp**:

| Lớp | Vai trò | Ví dụ (lấy trang chính thức làm chuẩn) |
| --- | --- | --- |
| Lớp trừu tượng | Định nghĩa giao diện "tra số dư, trừ tiền, cộng tiền" | Vault |
| Lớp triển khai | Thực sự giữ dữ liệu số dư, thực thi cộng trừ | Module kinh tế của EssentialsX, hệ thống kinh tế của CMI, XConomy, v.v. |

| Lớp trừu tượng như Vault cung cấp gì | Ai triển khai | Ai gọi |
| --- | --- | --- |
| Kinh tế (Economy) | Plugin kinh tế cụ thể | Cửa hàng, nhiệm vụ, rút thăm, phí duy trì lãnh thổ |
| Quyền (Permission) | Plugin quyền (như LuckPerms) | Plugin cần kiểm tra quyền |
| Chat (Chat) | Plugin loại chat | Plugin cần gửi hoặc định dạng chat |

Mấy sự thật cụ thể có thể đối chiếu:

- **EssentialsX** mô tả module chính thức ghi rõ: jar lõi chứa phần lớn lệnh, bảng hiệu, kit **và cả hệ thống kinh tế** (*signs, kits and the economy*). Nghĩa là cài bản thân EssentialsX là đã có phần triển khai kinh tế.
- **CMI** trang chính thức ghi rõ nó cung cấp **Economy system (kèm bảng xếp hạng số dư)** và **Cheque system (biến tiền thành vật phẩm)**; đồng thời nói rõ kinh tế của CMI muốn nối vào hệ Vault thì cần dùng bản Vault do chính nó cung cấp hoặc module tiêm kinh tế, và phải bật công tắc kinh tế trong tệp cấu hình.
- **XConomy** mô tả kho chính thức là "plugin kinh tế hỗ trợ đồng bộ dữ liệu nhiều máy chủ", phù hợp với tình huống nhiều máy chủ dùng chung một bộ số dư; trước khi dùng hãy tự xác nhận trạng thái bảo trì hiện tại của nó có đáp ứng yêu cầu phiên bản của bạn không.
- **Jobs Reborn** trang chính thức liệt kê **Vault** trong mục phụ thuộc —— đây là ví dụ điển hình của "plugin lối chơi gọi kinh tế qua lớp trừu tượng".
:::note Trước hết xác nhận "rốt cuộc ai đang giữ tiền"
Khi xử lý sự cố kinh tế, câu đầu tiên cần hỏi không phải "plugin cửa hàng có hỏng không" mà là "**hiện tại plugin nào thực sự cung cấp phần triển khai kinh tế**". Rất nhiều vấn đề "số dư về 0" "trừ tiền không có tác dụng" có gốc rễ là cài cùng lúc hai phần triển khai kinh tế, hoặc lớp trừu tượng trỏ vào một phần triển khai không có dữ liệu.
:::

### 3.2 Vật phẩm tiền tệ hữu hình

Một số phần triển khai hỗ trợ **biến tiền tệ thành vật phẩm** (ví dụ hệ thống Cheque / séc trong tài liệu chính thức của CMI: tạo một vật phẩm ghi số tiền, có thể luân chuyển giữa người chơi). Kiểu thiết kế này có cả lợi lẫn hại:

- Lợi: giao dịch có cảm giác vật chất, phù hợp RP và giao dịch ngoài đời; có thể giao hàng khi offline.
- Hại: một khi vật phẩm có thể bị nhân bản, bị lấy bất hợp pháp, hoặc mất khi chuyển giữa các máy chủ, thì coi như tiền tệ mất kiểm soát; đồng thời "tiền dưới dạng vật phẩm" lách qua ghi nhật ký giao dịch ở tầng plugin.

Nếu định dùng tiền tệ hữu hình, **phải giải quyết đồng thời ba việc**: vật phẩm không thể làm giả (dựa vào kiểm tra dữ liệu vật phẩm), giao dịch có ghi nhật ký, mất mát có quy trình khiếu nại.

### 3.3 Tiền tệ do quản trị viên tạo ra hay do người chơi kiếm được

Đây là quyết định đầu tiên của thiết kế kinh tế, và cũng là lá phiếu quan trọng nhất:

| Mô hình | Nguồn tiền | Hệ quả |
| --- | --- | --- |
| Quản trị viên tạo ra (phát tiền, bán đồ cho hệ thống) | Lệnh và thu hồi qua cửa hàng | Đơn giản trực tiếp, nhưng cực dễ lạm phát; phải đi kèm biện pháp thu hồi mạnh |
| Người chơi kiếm (lao động, giao dịch, nhiệm vụ) | Sản lượng từ lối chơi | Lành mạnh hơn, nhưng chi phí thiết kế cao; tốc độ sản xuất phải kiểm soát được |
| Kết hợp | Hệ thống phát thu nhập cơ bản, luân chuyển giữa người chơi | Phổ biến nhất trong thực tế; mấu chốt là quản lý lượng hệ thống phát ra như "lượng phát hành tiền tệ" |

## 4. Cửa hàng

Cửa hàng là **kênh lưu thông** của kinh tế, và cũng là nơi dễ xảy ra chuyện nhất —— vì nó trực tiếp quyết định "thứ gì đáng bao nhiêu tiền".

### 4.1 Hình thức tương tác: cửa hàng bảng hiệu / rương vs cửa hàng GUI

| Hình thức | Đặc điểm | Phù hợp |
| --- | --- | --- |
| Cửa hàng bảng hiệu / rương | Người chơi đặt rương trong thế giới, dùng bảng hiệu ghi giá; mua bán không cần lệnh | Chợ tự do giữa người chơi, khu thương mại tập trung |
| Cửa hàng GUI | Duyệt phân loại và mua qua giao diện menu; quản trị viên cấu hình bảng hàng hóa | Cửa hàng quản trị, hướng dẫn người mới, thu mua nhiều chủng loại |

Mô tả chính thức có thể đối chiếu:

- **ChestShop**: mô tả kho chính thức là *The original chest & sign shop plugin for Minecraft Servers running Bukkit/Spigot/Paper. Est. 2011* (plugin cửa hàng rương và bảng hiệu đầu tiên).
- **QuickShop-Hikari**: mô tả kho chính thức ghi rõ nó là "plugin cửa hàng cho phép người chơi mua bán vật phẩm từ rương mà không cần bất kỳ lệnh nào", và nhấn mạnh người chơi thực tế không cần dùng đến bất kỳ lệnh nào nó cung cấp.
- **Shopkeepers**: README chính thức ghi rõ nó cho phép chủ máy chủ thiết lập "cửa hàng dân làng tùy chỉnh", và **hỗ trợ đồng thời hai loại cửa hàng**: **cửa hàng quản trị (kho vô hạn)** và **cửa hàng người chơi (lấy hàng từ container)**.
- **Loại cửa hàng GUI**: plugin cửa hàng tương tác bằng menu (ví dụ EconomyShopGUI, kho chính thức Gypopo/EconomyShopGUI-API được mô tả là "The API of EconomyShopGUI", để plugin khác kết nối).

### 4.2 Cửa hàng người chơi vs cửa hàng quản trị

| Loại | Kho | Người định giá | Ý nghĩa kinh tế |
| --- | --- | --- | --- |
| Cửa hàng quản trị | Vô hạn | Chủ máy chủ | Vòi tiền và trạm thu hồi ở cấp hệ thống, quyết định trực tiếp lạm phát |
| Cửa hàng người chơi | Hàng của chính người chơi | Người chơi | Lưu thông giữa người chơi, chủ máy chủ chỉ cần cung cấp quy tắc và địa điểm |

### 4.3 "Bán cho máy chủ" và "giao dịch giữa người chơi" là hai việc khác nhau

Đây là điểm cần giải thích rõ nhất cho người chơi:

- **Bán cho máy chủ**: máy chủ thu mua vô hạn, tức là **phát hành tiền tệ**. Giá thu mua chính là giá phát hành, lượng thu mua chính là lượng phát hành.
- **Giao dịch giữa người chơi**: một bên trả tiền, một bên giao hàng, tổng lượng tiền không đổi, chỉ là chuyển dịch.

Rất nhiều máy chủ "kinh tế sụp" đều có vấn đề ở **giá thu mua vô hạn** của cửa hàng quản trị: chỉ cần một vật phẩm nào đó bán được cho hệ thống một cách ổn định và vô hạn, người chơi sẽ biến nó thành cỗ máy in tiền.

### 4.4 Con đường điển hình khiến kinh tế cửa hàng sụp đổ

| Cách sụp đổ | Cơ chế | Phòng ngừa |
| --- | --- | --- |
| Giá thu mua vô hạn quá cao | Người chơi farm hàng loạt vật phẩm đó bán cho hệ thống | Định kỳ rà soát bảng thu mua; đặt giới hạn lượng thu mua mỗi người chơi |
| Lỗi nhân bản | Số lượng vật phẩm tăng gấp đôi từ hư không, rồi bán cho hệ thống đổi tiền | Xem mục 9; mọi lối chơi sản xuất đều phải có ghi nhật ký |
| Ghi sai giá bán (thiếu một số 0) | Một giao dịch là đánh sập kinh tế | Sau khi đổi giá phải kiểm chứng trên máy chủ thử trước; giữ lại ghi nhật ký thay đổi cấu hình |
| Vật phẩm giá cao không ai bán | Tiền chỉ vào không ra, lạm phát | Thiết kế biện pháp thu hồi, xem mục 10 |
| Cửa hàng bị dùng để chuyển tiền giữa người chơi | Trở thành kênh rửa tiền hoặc trốn thuế | Quy tắc rõ ràng; đánh thuế giao dịch khi cần |
:::warn Bảng giá của cửa hàng là tệp cấu hình kinh tế, không phải bảng điền bừa
Trước khi đổi một giá thu mua, hãy tính một lượt: **một người chơi một giờ sản xuất được bao nhiêu vật phẩm đó? nhân với giá thu mua là ra tốc độ in tiền mỗi giờ của họ.** Nếu con số này lệch một bậc độ lớn so với "số tiền kiếm được khi chơi bình thường một giờ", kinh tế chắc chắn sẽ sụp trong vài ngày.
:::

## 5. Nhiệm vụ và thành tựu

Hệ thống nhiệm vụ giải quyết vấn đề **cảm giác có mục tiêu**: người chơi vào máy chủ có rõ "hôm nay làm gì".

Mô tả chính thức có thể đối chiếu:

- **Quests** (PikaMug): mô tả kho chính thức là "plugin dễ dùng, mã nguồn mở, dùng để tạo và thực thi nhiệm vụ trên máy chủ Minecraft".
- **BetonQuest**: mô tả kho chính thức là "plugin kịch bản nhiệm vụ cao cấp và mạnh mẽ", tích hợp sẵn hội thoại kiểu RPG, và tích hợp hơn 40 plugin khác. Nó phù hợp hơn với máy chủ nặng nội dung "có kịch bản, có hội thoại, có phân nhánh".

### 5.1 Nhiệm vụ hằng ngày / hằng tuần

- **Nhiệm vụ hằng ngày** cung cấp lý do đăng nhập ổn định, nhưng phần thưởng phải nhỏ. Mục tiêu thiết kế của thưởng hằng ngày là "đáng làm", không phải "buộc phải làm".
- **Nhiệm vụ hằng tuần** phù hợp để chứa phần thưởng lớn hơn, vì nó có giới hạn tự nhiên về tốc độ sản xuất (mỗi tuần một lần).
- **Đừng biến nhiệm vụ thành điểm danh phát tiền**. Kiểu "bấm một cái là nhận tiền" thuần túy sẽ biến kinh tế thành phát tiền theo thời gian.

### 5.2 Thiết kế phần thưởng không được đánh sập kinh tế

Phần thưởng nhiệm vụ có ba dạng an toàn:

| Dạng | Mô tả | Rủi ro |
| --- | --- | --- |
| Ngoại hình và danh hiệu | Không ảnh hưởng chỉ số | Thấp (với điều kiện danh hiệu không bán độ mạnh) |
| Vật phẩm tiêu hao và tiện ích | Thuốc, vé dịch chuyển, vé sửa chữa | Trung bình (phải tính rõ sản lượng mỗi giờ) |
| Tiền tệ và vật phẩm giá trị cao | Phát tiền trực tiếp, phát trang bị | Cao (phải suy ngược định giá từ giới hạn sản lượng mỗi giờ) |

Tiêu chuẩn phán đoán là: **phần thưởng nhiệm vụ phải so sánh được với các nguồn tiền bạn đã có trên cùng một bảng**. Nếu lợi nhuận mỗi giờ của nhiệm vụ cao hơn hẳn lối chơi khác, người chơi sẽ chỉ làm nhiệm vụ, toàn bộ nội dung khác bị bỏ hoang.

## 6. Danh hiệu và tước hiệu

Danh hiệu thuộc **lớp hiển thị**, giá trị của nó đến từ "người khác nhìn thấy", chứ không phải chỉ số.

| Loại | Cách thực hiện | Mô tả |
| --- | --- | --- |
| Tiền tố / hậu tố kiểu quyền | Plugin quyền lưu meta, plugin chat hoặc TAB hiển thị ra | Phổ biến nhất, gắn tự nhiên với nhóm quyền |
| Danh hiệu trang trí | Văn bản do người chơi tự chọn và hiển thị | Thường cần plugin danh hiệu riêng và điều kiện mở khóa |
| Tước hiệu trong lối chơi | Do chính plugin lối chơi cung cấp (ví dụ tên chức vụ mà plugin nghề nghiệp hiển thị) | Ví dụ tính năng Chat Titles trong tài liệu chính thức của Jobs Reborn |

Sự thật có thể đối chiếu: **LuckPerms** mô tả kho chính thức là "plugin quyền dành cho máy chủ Minecraft", nó chịu trách nhiệm lưu quyền và metadata tiền tố; còn **tài liệu module chính thức của EssentialsX** ghi rõ, muốn người chơi có tiền tố và hậu tố thì cần **Vault và LuckPerms**. Nghĩa là, **"ai lưu tiền tố" và "ai hiển thị tiền tố" thường không phải cùng một plugin** —— bước hiển thị do plugin loại chat hoặc loại TAB hoàn thành, chi tiết xem [Chat, menu và MOTD](/tutorials/java/cosmetic).

Hai đường đáy trong thiết kế:

- Danh hiệu có thể bán (như dấu hiệu của người ủng hộ), nhưng **không được mang độ mạnh**.
- Hệ thống danh hiệu phải thu hồi được. Sau khi người chơi vi phạm, bạn phải có thể gỡ danh hiệu của họ ngay lập tức.

## 7. Rút thăm và rương

Rương (Crates) là lối chơi "phần thưởng ngẫu nhiên", kích thích ngắn hạn rất mạnh, tranh cãi dài hạn rất lớn.

### 7.1 Bảng phần thưởng hoạt động thế nào

Cốt lõi của các plugin rương phổ biến đều là một **bảng phần thưởng có trọng số**:

- Mỗi phần thưởng có **trọng số (weight)**, trọng số càng cao càng dễ trúng.
- Phần thưởng thường được nhóm theo **độ hiếm (rarity)**, độ hiếm lại ảnh hưởng xác suất trúng.
- Chìa khóa chia thành **chìa khóa hữu hình** (giao dịch được, tặng được) và **chìa khóa ảo** (gắn với người chơi).
- Thường còn có các giới hạn như **chi phí mở, thời gian hồi, yêu cầu quyền, giới hạn số lần**.

Mô tả chính thức có thể đối chiếu:

- **CrazyCrates**: mô tả chính thức là "thêm cho máy chủ của bạn số lượng rương không giới hạn, cung cấp 11 kiểu rương"; trang tài liệu chính thức là docs.crazycrew.us, hướng dẫn cài đặt yêu cầu dùng máy chủ Paper trở lên, và cung cấp `/crazycrates debug` để kiểm thử phần thưởng.
- **ExcellentCrates**: Wiki chính thức liệt kê trọng số độ hiếm (rarity weights), trọng số phần thưởng (weights), chi phí mở (open cost), thời gian hồi, cột mốc, giới hạn số lần trúng (roll limits), và cung cấp rõ ràng **chìa khóa ảo** (mục đích theo mô tả chính thức là **ngăn chìa khóa bị chia sẻ, giao dịch hoặc bán**) cùng **nhật ký phần thưởng** (ghi mỗi lần rút vào tệp nhật ký riêng).

Hai điểm này có giá trị trực tiếp cho vận hành của bạn: **chìa khóa ảo** cho phép bạn kiểm soát "chìa khóa không bị mua bán", **nhật ký phần thưởng** cho phép bạn kiểm chứng khi có sự cố.

### 7.2 Cờ bạc và nghiện: vấn đề buộc phải đối diện

Phần thưởng ngẫu nhiên có cơ chế tâm lý rất giống cờ bạc: tăng cường theo tỉ lệ biến đổi, suýt trúng, chi phí chìm. Là chủ máy chủ, bạn cần chủ động đặt giới hạn:

- **Đừng dùng lời lẽ "rút thêm lần nữa là trúng"**. Đó là dẫn dụ có chủ ý.
- **Công khai xác suất**. Bảng phần thưởng và trọng số nên để người chơi thấy được, ít nhất là nói rõ trong quy tắc.
- **Đặt giới hạn**. Giới hạn số lần mở mỗi ngày/mỗi tuần, giới hạn phần thưởng mỗi người chơi, có thể giảm đáng kể rủi ro mất kiểm soát.
- **Bảo vệ người chưa thành niên**. Nếu nhóm người chơi của bạn trẻ, điểm này càng quan trọng.

### 7.3 Phần thưởng ngẫu nhiên trả phí: cảnh báo tuân thủ và đạo đức
:::warn Đừng làm phần thưởng ngẫu nhiên trả phí
**Gắn phần thưởng ngẫu nhiên với thanh toán bằng tiền thật (mở hộp trả phí / gacha), ở một số quốc gia và khu vực chịu ràng buộc của quy định pháp luật hoặc quy tắc nền tảng riêng, có thể bị xem là nội dung cờ bạc, cũng có thể vi phạm chính sách của kênh thanh toán và nền tảng.** Loại quy định này thay đổi, và khác nhau rất nhiều giữa các khu vực, bạn phải tự kiểm chứng luật pháp và yêu cầu nền tảng áp dụng cho mình, chứ không phải bê nguyên cách làm của người khác.

Từ góc độ vận hành còn có lý do thực tế hơn: **phần thưởng ngẫu nhiên trả phí là cỗ khuếch đại của "tranh cãi pay-to-win"**. Nó làm câu hỏi "bỏ tiền có mạnh lên được không" từ mơ hồ thành cụ thể, mà người chơi cực kỳ ít dung thứ cho điều đó. **Cách nên làm là: chìa khóa chỉ nhận qua lối chơi (sự kiện, nhiệm vụ, đóng góp), không bán bằng tiền thật.**
:::

## 8. Nhóm lối chơi

### 8.1 Nghề nghiệp và kỹ năng

- **Jobs Reborn**: trang chính thức mô tả là "plugin hoàn toàn cấu hình được, cho phép bạn nhận thù lao qua hành vi đập, đặt, giết, câu cá, chế tạo; dựa trên nghề nghiệp (class-based professions), nhận kinh nghiệm khi thực hiện công việc", trang chính thức đồng thời liệt kê các tính năng như phụ thuộc Vault, MySQL tùy chọn, kinh tế điểm tùy chỉnh, nhiệm vụ hằng ngày, danh hiệu chat.
- **mcMMO**: trang web chính thức định vị là "plugin RPG dành cho Spigot/Paper", cung cấp kỹ năng, nâng cấp, siêu kỹ năng, bảng xếp hạng và hệ thống đội (party), cùng lượng lớn mục cấu hình.

Rủi ro của loại này tập trung ở **sản lượng**: cấp kỹ năng tăng thu nhập, thưởng nghề nghiệp phát tiền trực tiếp, hai cái cộng lại rất dễ tạo vòng phản hồi dương "càng chơi càng giàu". Trước khi mở máy chủ nhất định phải ước tính **thu nhập mỗi giờ của người chơi đã đầy cấp**.

### 8.2 Minigame và parkour

Hai loại này thường cần **thế giới riêng hoặc instance riêng**, và có yêu cầu cứng về "số người online cùng lúc":

- Thiếu người thì ván không mở được, người chơi thấy phòng trống, còn tệ hơn là không có lối chơi này.
- Chi phí bảo trì cao: bản đồ, quy tắc, cân bằng, lỗ hổng, đều cần đầu tư liên tục.
- Nên cân nhắc sau khi máy chủ chính đã ổn định và có số người online ổn định, đừng đưa vào lô plugin đầu tiên khi mở máy chủ.

Không gian lựa chọn plugin cụ thể rất rộng và chất lượng khác nhau rõ rệt, **hãy lấy trang chính thức và nhật ký cập nhật của từng plugin làm chuẩn**, bài này không nêu tên để đề xuất.

### 8.3 Lãnh thổ, bảo vệ và liên kết kinh tế

Giá trị cốt lõi của hệ thống lãnh thổ là **cảm giác an toàn tài sản** —— không có nó, người chơi không muốn đầu tư xây dựng lâu dài. Mô tả chính thức có thể đối chiếu:

- **GriefPrevention**: mô tả kho chính thức là "plugin Bukkit chống phá hoại tự phục vụ chính thức dành cho máy chủ Minecraft từ năm 2011".
- **WorldGuard**: mô tả kho chính thức là "bảo vệ máy chủ Minecraft của bạn, và cho phép người chơi khoanh vùng khu vực".

Cần cẩn thận khi liên kết với kinh tế: **phí lãnh thổ (mua, gia hạn, tính theo diện tích) là biện pháp thu hồi tiền tệ cực tốt, nhưng nếu định giá quá cao sẽ đẩy thẳng người chơi mới ra ngoài**. Nên căn giá lãnh thổ theo "số tiền người mới kiếm được trong vài giờ đầu", chứ không phải theo "số dư của người chơi lâu năm". Phân công của hệ thống bảo vệ xem thêm [Lãnh thổ và bảo vệ](/tutorials/java/protection) và [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

### 8.4 Lối chơi công nghệ quy mô lớn (kiểu Slimefun)

Mô tả kho chính thức của **Slimefun4** là "một plugin Spigot/Paper độc đáo, chơi như một modpack", từ năm 2013 cung cấp lượng lớn nội dung như ba lô, jetpack, lò phản ứng.

Loại plugin này tương đương **cài thêm một trò chơi vào máy chủ**:

| Cái giá | Biểu hiện cụ thể |
| --- | --- |
| Hiệu năng | Lượng lớn vật phẩm tùy chỉnh, logic máy móc và tác vụ định giờ |
| Nâng cấp phiên bản | Phụ thuộc phiên bản máy chủ, nâng cấp thường phải chờ thích ứng |
| Ngưỡng tiếp cận | Người chơi mới đối diện cả một hệ thống mới, dễ bị đẩy đi |
| Khả năng tương thích | Dễ xung đột với plugin khác về vật phẩm, chế tạo, rơi đồ |

Nếu bạn chắc chắn muốn làm máy chủ công nghệ, **hãy quy hoạch theo quy cách "đây là một trò chơi mới"**: hướng dẫn riêng, giáo trình riêng, ngân sách hiệu năng riêng, chứ đừng coi nó là "thêm một plugin nữa".

## 9. Chống gian lận và an toàn kinh tế

**Lỗi nhân bản (dupe) là sát thủ số một của hệ thống kinh tế**: nó không thay đổi quy tắc, chỉ thay đổi số lượng, mà số lượng một khi mất kiểm soát thì giá cả, cửa hàng, thưởng nhiệm vụ đều mất ý nghĩa.

### 9.1 Nguyên tắc

- **Mọi lối chơi sản xuất đều phải có nhật ký**. Không có nhật ký, bạn đến "có bị farm hay không" cũng không phán đoán được.
- **Ghi lại từng giao dịch**. Ai, lúc nào, với ai, giao dịch cái gì, số tiền bao nhiêu. Truy tra về sau hoàn toàn dựa vào những ghi chép này.
- **Giữ lại dấu vết kiểm toán**. Cấm, khôi phục bản lưu, phát tiền thủ công đều phải để lại dấu vết, tránh bị cáo buộc "lạm dụng quản trị", cũng tiện cho việc nhìn lại.
- **Tối thiểu hóa quyền**. Cho được node quyền thì đừng cho OP; chỉ cho một thế giới được thì đừng cho toàn máy chủ, xem [[JAVA] Plugin an ninh](/tutorials/ops/security-java).
- **Có phương án khôi phục**. Sau sự cố có khôi phục được về một thời điểm nào đó hay không tùy thuộc chiến lược sao lưu của bạn, xem [Sao lưu và khôi phục](/tutorials/java/backup).

Sự thật có thể đối chiếu: mô tả kho chính thức của **CoreProtect** là "công cụ ghi dữ liệu và chống phá hoại cực nhanh dành cho máy chủ Minecraft". Nó ghi lại **hành vi ở tầng khối và container**, là bằng chứng trực tiếp để truy "đồ đạc mất kiểu gì"; [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) nói về vị trí của nó trong toàn bộ hệ phòng thủ.

### 9.2 Rủi ro vật phẩm cấm xâm nhập vào kinh tế

Cái gọi là "vật phẩm cấm" là những vật phẩm được sinh ra qua lỗ hổng, lệnh hoặc lỗi plugin, đáng lẽ không nên tồn tại (phù phép bất thường, số lượng không hợp lệ, đạo cụ phá vỡ cân bằng). Tác hại của chúng là:

- Một khi lọt vào tay người chơi, **chúng bị coi là tài sản bình thường và tham gia giao dịch**, làm nhiễm bẩn toàn bộ nền kinh tế.
- Phát hiện càng muộn, cái giá khôi phục càng lớn (có thể phải khôi phục hàng chục người chơi).
- Khi xử lý phải có căn cứ: **tra nhật ký xác nhận nguồn trước, rồi mới quyết định phạm vi thu hồi**, đừng cấm người theo cảm tính.

Đề xuất: xây cơ chế "truy được nguồn gốc" cho vật phẩm giá trị cao, và ghi rõ trong quy tắc "vật phẩm cấm một mực thu hồi".

## 10. Thiết kế cân bằng kinh tế

Bản chất của hệ thống kinh tế là một **bể nước**: lượng nước vào và ra phải tương đối cân bằng.

| Chiều | Biện pháp | Mô tả |
| --- | --- | --- |
| Nguồn tiền (nước vào) | Thu mua của cửa hàng quản trị, thưởng nhiệm vụ, thu nhập nghề nghiệp, thưởng sự kiện | Mỗi nguồn đều phải tính được "mỗi giờ sản xuất ra bao nhiêu tiền" |
| Thu hồi tiền tệ (nước ra) | Bán hàng ở cửa hàng (người chơi mua đồ của hệ thống), thuế giao dịch, mua và gia hạn lãnh thổ, phí sửa chữa, phí dịch chuyển, chìa khóa rút thăm | Nước ra không đủ tất yếu lạm phát, đây là thiếu sót thiết kế phổ biến nhất |

### 10.1 Triệu chứng điển hình của lạm phát

- Số dư người chơi lâu năm cao đến mức "cái gì cũng mua được", cửa hàng mất ý nghĩa.
- Người chơi mới thấy "mãi mãi không đuổi kịp", bỏ đi luôn.
- Vật phẩm giá cao bị vét sạch, giá tiếp tục tăng.
- Giao dịch giữa người chơi bắt đầu dùng "đổi hàng lấy hàng" để lách tiền tệ.

### 10.2 Biện pháp thu hồi bắt buộc phải có

Chuẩn bị ít nhất ba đến bốn loại, và để chúng **hòa tự nhiên vào lối chơi** chứ không phải "phạt tiền":

- **Thuế giao dịch**: trích phần trăm khi cửa hàng người chơi giao dịch thành công, tự động thu hồi, và tương quan thuận với mức độ hoạt động.
- **Phí duy trì lãnh thổ**: thu theo diện tích hoặc theo thời gian, để "chiếm đất" có chi phí.
- **Chi phí sửa chữa và phù phép**: bảo trì trang bị tiêu hao tiền tệ, lượng thu hồi tăng theo tiến độ chơi.
- **Dịch vụ tiện ích**: dịch vụ thu phí như dịch chuyển, đổi điểm, đổi tên.
:::tip Dùng dữ liệu chứ đừng dùng cảm giác để chỉnh kinh tế
Ghi định kỳ: tổng lượng tiền của máy chủ, tỉ trọng số dư của 10% người chơi đứng đầu, lượng tiền phát sinh mỗi ngày, lượng thu hồi mỗi ngày. **Khi "phát sinh mỗi ngày" liên tục lớn hơn "thu hồi mỗi ngày" thì lạm phát đã đang diễn ra**, chỉ là chưa hiện ra ở giá cả.
:::

## 11. Thứ tự triển khai

Đừng cài đủ lối chơi trong một lần. Thứ tự tối thiểu khả dụng được đề xuất:

1. **Kinh tế tối thiểu**: chỉ cài một phần triển khai kinh tế (kèm lớp trừu tượng), xác nhận số dư lưu được lấy được, dữ liệu nằm ở đâu, sao lưu có phủ tới không.
2. **Thu hồi cơ bản**: làm ra một trong các khoản phí dịch chuyển, phí sửa chữa hoặc phí lãnh thổ trước. **Nền kinh tế chưa có biện pháp thu hồi thì đừng mở ra cho người chơi.**
3. **Cửa hàng**: làm cửa hàng quản trị trước (định giá kiểm soát được), xác nhận bảng thu mua không biến thành máy in tiền; khi cần chợ tự do thì mới thêm cửa hàng người chơi.
4. **Nhiệm vụ**: sau khi đã có nguồn tiền và thu hồi ổn định, dùng nhiệm vụ để dẫn người chơi trải nghiệm nội dung bạn muốn họ trải nghiệm.
5. **Ngoại hình và danh hiệu**: làm lớp hiển thị sau cùng. Nó không ảnh hưởng chỉ số, nhưng nâng rõ rệt cảm giác thuộc về của người chơi lâu năm.
6. **Rút thăm và rương**: để cuối cùng, và kiên trì "chìa khóa chỉ do lối chơi sản xuất".

Mỗi bước thêm vào, quan sát một đến hai tuần: tổng lượng tiền, hành vi người chơi, TPS. **Có vấn đề thì lùi lại bước trước, chứ không phải tiếp tục thêm.**

## 12. Danh sách kiểm tra trước khi mở máy chủ

- [ ] Mỗi plugin lối chơi đều nói rõ được "nó giải quyết vấn đề gì"
- [ ] Phụ thuộc đã cài đủ, console không có lỗi tải
- [ ] Kinh tế chỉ có **một** phần triển khai thật sự, các plugin còn lại gọi qua lớp trừu tượng
- [ ] Mọi nguồn tiền đều ước tính được "giới hạn sản lượng mỗi giờ"
- [ ] Có ít nhất ba đến bốn biện pháp thu hồi tiền tệ, và đã thực sự có hiệu lực
- [ ] Bảng thu mua của cửa hàng quản trị đã qua một lần tính "tốc độ in tiền"
- [ ] Phần thưởng nhiệm vụ đã được so sánh với nguồn tiền trên cùng một bảng thu nhập
- [ ] Danh hiệu và ngoại hình không cung cấp bất kỳ độ mạnh chỉ số nào
- [ ] Chìa khóa rút thăm chỉ nhận qua lối chơi, không bán bằng tiền thật
- [ ] Mọi lối chơi sản xuất và giao dịch đều có nhật ký
- [ ] Plugin ghi nhật ký (loại như CoreProtect) đã được cài **trước** khi mở máy chủ
- [ ] Chiến lược sao lưu phủ tới cơ sở dữ liệu kinh tế và dữ liệu người chơi
- [ ] Quy trình xử lý vật phẩm cấm đã được ghi vào quy tắc
- [ ] Có phương án khôi phục, và đã diễn tập một lần
- [ ] Mỗi lần thêm một plugin lối chơi, đều ghi lại thay đổi TPS và MSPT trước và sau khi cài

## Bước tiếp theo

- Phụ thuộc và xử lý lỗi tải: [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps)
- Cài đặt plugin và quản lý phiên bản: [Nhập môn plugin](/tutorials/java/plugins)
- Ghi nhật ký, khôi phục và chống gian lận: [Chống gian lận và chống phá hoại](/tutorials/java/anticheat)
- Chat, tiền tố và hiển thị menu: [Chat, menu và MOTD](/tutorials/java/cosmetic)
- Phân công của hệ thống bảo vệ: [Lãnh thổ và bảo vệ](/tutorials/java/protection)
- Cách đo hiệu năng: [Phân tích hiệu năng bằng spark](/tutorials/ops/spark)
- Góc nhìn vận hành và đội ngũ: [[JAVA] Quản lý vận hành](/tutorials/ops/management-java)
- Quy tắc và trật tự: [Quy chuẩn cộng đồng](/rules)

---

> Tên, tính năng và trạng thái bảo trì của từng plugin cụ thể lấy trang chính thức của plugin đó làm chuẩn.
