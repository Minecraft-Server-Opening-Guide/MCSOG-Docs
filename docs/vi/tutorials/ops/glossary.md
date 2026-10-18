---
title: Bảng thuật ngữ và giải thích thuật ngữ
slug: glossary
cat: ops
level: 2
order: 16
minutes: 12
tags: [thuật ngữ, terminology, TPS, MSPT, paper, bản Bedrock, vận hành, reference]
updated: 2026-10-04
draft: false
---

Rất nhiều người bị kẹt trên đường mở máy chủ không phải vì không biết thao tác, mà vì **không hiểu người khác đang nói gì**. "MSPT của bạn bao nhiêu" "plugin này có phụ thuộc không" "bạn là máy chủ ngoại tuyến à" —— mỗi câu đều giấu một từ chưa từng được giải thích.

Bài này gom các thuật ngữ xuất hiện lặp lại trong các bài hướng dẫn của trang này lại và giải thích một lượt, **chia theo chủ đề**. Mỗi mục gồm tên tiếng Trung, từ tương ứng tiếng Anh, một hai câu nói rõ nó là gì, và nó được mở rộng ở bài nào.

## 0. Dùng bài này thế nào

| Tình huống của bạn | Đề xuất |
| --- | --- |
| Hoàn toàn mới, còn chưa chạy lên được | Đừng xem bài này vội, hãy làm theo [Chọn lõi máy chủ](/tutorials/java/core) và [Mở máy chủ](/tutorials/java/start) một lượt, gặp từ không hiểu thì quay lại tra |
| Chạy được rồi, nhưng không hiểu báo lỗi và lời khuyên của người khác | Chú ý mục 1, 2, 3, ba mục này có tần suất xuất hiện cao nhất trong trao đổi cộng đồng |
| Muốn mở máy chủ Bedrock | Chú ý mục 4, **thuật ngữ của bản Bedrock và bản Java gần như không dùng chung được** |
| Muốn làm máy chủ thiên kỹ thuật (kỹ thuật redstone) | Chú ý mục 5, nó quyết định bạn nên chọn lõi nào |
| Đã bảo trì máy chủ dài hạn | Chú ý mục 6, các từ ở mục này liên quan trực tiếp đến "dữ liệu có giữ được không" |

:::note Dùng như từ điển, đừng học thuộc
Giá trị của bảng thuật ngữ nằm ở **tra cứu**, không nằm ở ghi nhớ. Khi xem hướng dẫn gặp từ không biết, chỉ cần quay lại đây dùng tìm kiếm trong trang của trình duyệt một lần. Thứ duy nhất thực sự cần nhớ là: **gặp giá trị mặc định không chắc chắn, hãy tra tài liệu chính thức và tệp cấu hình được tạo trên máy bạn**.
:::

:::warn Khác biệt theo phiên bản và hãng
Trong hệ sinh thái máy chủ Minecraft, **giá trị mặc định, tên khóa cấu hình, lệnh khả dụng gần như đều thay đổi theo phiên bản và nhánh**. Bài này chỉ giải thích "từ này nghĩa là gì", **không cam kết giá trị mặc định cụ thể của một khóa trên phiên bản hiện tại**; khi sửa cấu hình, hãy lấy tài liệu chính thức của lõi bạn dùng và tệp cấu hình được tạo trên máy bạn làm chuẩn.
:::

## 1. Nhóm hiệu năng

Nhóm từ này trả lời cùng một câu hỏi: **máy chủ bây giờ có lag không, lag ở đâu.**

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| Tick / nhịp | tick | Một lần thực thi của vòng lặp chính máy chủ. Bản gốc nhắm tới 20 lần mỗi giây, tức một tick khoảng 50 mili giây; thực thể, redstone, cập nhật khối, di chuyển người chơi, phần lớn việc điều phối chunk đều hoàn thành trong vòng lặp này | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| TPS | Ticks Per Second | Số tick thực sự hoàn thành mỗi giây. Trần bản gốc là 20, khi máy chủ không tính kịp sẽ thấp hơn 20. **Nó là "kết quả", không phải "nguyên nhân"** | [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |
| MSPT | Milliseconds Per Tick | Số mili giây trung bình mỗi tick tốn, còn gọi là thời lượng tick. Nó và TPS là hai mặt của cùng một việc: **thời lượng dài hạn vượt 50 ms thì TPS không giữ được 20** | [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |
| Ngân sách 50 ms | 50 ms budget | Trần thời gian một tick suy ra từ 20 tick mỗi giây. Lưu ý nó là **ngân sách theo nghĩa trung bình**: thỉnh thoảng một tick tốn 200 ms, các tick còn lại rất nhanh, TPS vẫn có thể gần 20, nhưng người chơi sẽ cảm thấy lag tức thời | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Lag / giật | lag | Cảm nhận chủ quan của người chơi, **không phải chỉ số**. Có thể do tick máy chủ chậm, do mạng dao động, do vấn đề render phía client. Bước đầu tiên của truy nguyên là dịch nó thành chỉ số cụ thể | [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |
| Dừng GC | GC pause | Khoảng thời gian luồng ứng dụng có thể bị tạm dừng khi Java thu gom rác. Heap càng lớn, bộ thu gom càng không phù hợp, một lần dừng có thể càng dài, biểu hiện là **giật theo chu kỳ** chứ không phải chậm dần đều | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| TPS giảm và đỉnh MSPT | TPS drop vs MSPT spike | Hai hiện tượng khác nhau: **TPS giảm** thường là thiếu tài nguyên kéo dài (CPU bị bóp xung, quá nhiều thực thể); **đỉnh MSPT** là thời lượng đột biến ngắn hạn (sinh chunk, redstone quy mô lớn, GC). Phân biệt được chúng mới chọn đúng cách sửa | [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |

### 1.1 Vì sao nói "lag" không phải một chỉ số

"Lag" ít nhất có thể tương ứng bốn hiện tượng hoàn toàn khác nhau, và cách sửa của chúng khác nhau:

| Hiện tượng | Đặc điểm điển hình | Xem gì trước |
| --- | --- | --- |
| Luồng chính tính không kịp | TPS thấp hơn 20 lâu dài, MSPT ổn định cao | Cây gọi profiler của spark |
| Đỉnh tức thời | TPS trung bình còn được, nhưng người chơi nói "giật từng cơn" | Phân bố thời lượng tick của spark, bản ghi GC |
| Tài nguyên máy vật lý thiếu | Tiến trình máy chủ không chậm, nhưng CPU bị bóp xung, đĩa chậm, bộ nhớ bị hoán trang | `uptime`, `free -h`, giám sát máy vật lý |
| Vấn đề mạng | Máy chủ mọi thứ bình thường, chỉ một số người chơi có độ trễ cao | `/spark ping`, đường truyền giữa người chơi và phòng máy |

**Tách bốn loại này ra là bước quan trọng nhất khi truy nguyên lag.** Cách làm liên quan xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

### 1.2 Ngưỡng không phải con số thần kỳ

Câu cộng đồng hay nói "TPS dưới 20 là có vấn đề" "MSPT vượt 50 là phải xem" là **ngưỡng kinh nghiệm**, dùng để kích hoạt "đi xem một chút", không phải "chắc chắn hỏng". Căn cứ phán đoán thật là **đường cơ sở lịch sử của chính bạn**: nếu máy chủ của bạn bình thường MSPT đã ở 35, thì đột nhiên lên 45 là đáng tra; nếu bình thường đã 48 thì 50 lại là bình thường. Cách dựng đường cơ sở xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).

### 1.3 Vì sao TPS và MSPT "không đồng bộ"

Một thắc mắc phổ biến là: "TPS hiển thị 20, mà người chơi vẫn nói lag." Điều này không mâu thuẫn, ít nhất có ba nguyên nhân:

| Tình huống | Vì sao TPS trông bình thường |
| --- | --- |
| Giá trị trung bình che mất đỉnh | TPS là **trung bình trong một khoảng thời gian**, các tick dài ngẫu nhiên bị lượng lớn tick bình thường san phẳng |
| Lag ở client | Tick máy chủ hoàn toàn bình thường, nhưng máy người chơi render không kịp khung hình, hoặc mở khoảng cách hiển thị quá lớn |
| Lag ở mạng | Máy chủ mọi thứ bình thường, nhưng đường từ người chơi tới phòng máy dao động hoặc mất gói |
| Lag ở máy vật lý | Tiến trình máy chủ bị bóp xung CPU hoặc bị hoán trang bộ nhớ, nhưng bản thân nó "cảm thấy" chỉ chậm đi một chút |

Nên thứ tự phán đoán nên là: **trước hết xác nhận là phía máy chủ hay không phải phía máy chủ, rồi mới đi vào truy nguyên cụ thể**. `/spark ping`, CPU và bộ nhớ của máy vật lý, độ trễ của người chơi phân bố ở các khu vực khác nhau, đều là đầu vào của bước này. Cách làm xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

### 1.4 Tác dụng phụ của tick và "thời gian trong máy chủ"

Vì tuyệt đại đa số logic thế giới đều tiến triển trong vòng tick, **tick chậm đi sẽ làm chậm luôn rất nhiều thứ trong game**: cây trồng lớn, tiến độ lò nung, thời điểm redstone, sinh vật di chuyển. Đó cũng là lý do "TPS tụt còn 15" với cảm nhận của người chơi còn tệ hơn nhiều so với "chậm đi 25%" —— mọi cơ chế phụ thuộc thời gian đều chậm đi cùng, mà những cỗ máy phụ thuộc thời điểm chính xác có thể hỏng hẳn. Cơ chế liên quan xem [Kỹ thuật redstone và máy móc](/tutorials/java/redstone).

:::tip Xem cái nào trước
Người chơi nói lag, **xem TPS và MSPT trước, rồi xem mức chiếm CPU**. Nếu TPS thấp mà MSPT bình thường, vấn đề thường không ở luồng chính máy chủ, mà phải xem CPU máy vật lý, thu hồi bộ nhớ hoặc mạng. Suy luận liên quan và lưu ý chính thức về môi trường container xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).
:::

## 2. Nhóm máy chủ

Nhóm từ này trả lời: **rốt cuộc bạn đang chạy chương trình gì, nó gồm những phần nào.**

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| Lõi / lõi máy chủ | server core / server software | Chương trình máy chủ bạn thực sự khởi động bằng `java -jar`, như Paper, Fabric, BDS. **"Lõi" không phải thuật ngữ chính thức**, mà là cách gọi quen thuộc của cộng đồng trong nước đối với phần hiện thực máy chủ | [Chọn lõi máy chủ](/tutorials/java/core) |
| Plugin | plugin | Chương trình chạy trong tiến trình máy chủ, mở rộng tính năng qua API do máy chủ cung cấp, thường là `.jar`, đặt vào `plugins/`. **Chỉ phía plugin (dòng Paper) mới hỗ trợ** | [Nhập môn plugin](/tutorials/java/plugins) |
| Mod | mod | Phần mở rộng sửa trực tiếp mã game, đặt vào `mods/`, bắt buộc phải tương ứng chính xác với phiên bản game. **Chỉ phía mod (Fabric, Forge, NeoForge) mới hỗ trợ** | [Chọn lõi máy chủ](/tutorials/java/core) |
| Phụ thuộc | dependency | Một plugin hoặc mod khác bắt buộc phải cài cùng trước khi plugin/mod này chạy. Biểu hiện điển hình khi thiếu phụ thuộc là **tải thất bại, và trong nhật ký ghi rõ thiếu cái gì** | [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps) |
| Proxy / phía chuyển máy chủ | proxy | Người chơi kết nối vào nó trước, rồi nó chuyển tiếp kết nối tới máy chủ thật phía sau. Dùng để chuyển qua lại giữa nhiều máy chủ, thống nhất cửa vào, thống nhất đăng nhập | [Proxy đa máy chủ](/tutorials/java/proxy) |
| BungeeCord | BungeeCord | Phần hiện thực proxy trưởng thành sớm nhất, kênh tin nhắn plugin của nó sau này được các proxy khác tương thích, trở thành một trong những chuẩn thực tế | [Proxy đa máy chủ](/tutorials/java/proxy) |
| Velocity | Velocity | Phần hiện thực proxy hiện đại, thiết kế hiệu năng và an ninh tốt hơn. **Chuyển tiếp hiện đại (modern forwarding)** yêu cầu proxy và phía sau chia sẻ khóa, cấu hình sai là không vào được máy chủ | [Proxy đa máy chủ](/tutorials/java/proxy) |
| Máy chủ phía sau | backend server | Instance máy chủ thực sự chứa lối chơi nằm sau proxy. Người chơi "chuyển máy chủ" trên proxy, thực chất là ngắt kết nối với một phía sau rồi nối sang cái khác | [Proxy đa máy chủ](/tutorials/java/proxy) |
| Sảnh chờ | lobby | Một loại máy chủ phía sau đặc biệt: người chơi đăng nhập xong rơi vào đây trước, rồi qua NPC hoặc lệnh vào từng máy chủ lối chơi. Thường rất ít plugin, cấu hình nhẹ | [Proxy đa máy chủ](/tutorials/java/proxy) |
| MCDR | MCDReforged | **Khung quản lý máy chủ** gắn bên cạnh máy chủ, làm việc bằng cách phân tích đầu ra console và gửi lệnh. Nó không sửa bản thân máy chủ, nên không bị giới hạn bởi loại lõi | [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr) |

### 2.1 "Phía plugin" và "phía mod" là hai đường song song

Người mới dễ nhầm nhất chính là hai từ này. Chúng không phải "hai cách gọi của cùng một thứ", mà là **hai bộ cơ chế mở rộng không tương thích nhau**:

| | Plugin (plugin) | Mod (mod) |
| --- | --- | --- |
| Vị trí tải | `plugins/` | `mods/` |
| Lõi điển hình | Paper, Spigot, Purpur, Folia | Fabric, Forge, NeoForge |
| Cách mở rộng | Gọi API do máy chủ cung cấp | Sửa trực tiếp mã game |
| Tương ứng phiên bản | Tương đối lỏng, thường dùng được qua phiên bản nhỏ | Cực kỳ chặt, bắt buộc phải tương ứng hoàn toàn |
| Mục đích điển hình | Quản lý, quyền, kinh tế, minigame | Nội dung mới, cơ chế mới, tính năng client |

**Dùng plugin Bukkit trên Fabric, hoặc dùng mod Forge trên Paper, mặc định đều không thành lập**, cần phương án cầu nối thêm, và thường phải hy sinh tương thích hoặc hiệu năng. Khi chọn lõi hãy nghĩ rõ bạn muốn phía nào, xem [Chọn lõi máy chủ](/tutorials/java/core).

### 2.2 Proxy không phải "bộ tăng tốc"

Từ "phía chuyển máy chủ" dễ khiến người ta nghĩ nó giảm được độ trễ. **Nó không tối ưu đường mạng**, tác dụng của nó là làm nhiều máy chủ trông như một: địa chỉ cửa vào thống nhất, người chơi chuyển giữa các máy chủ mà không phải kết nối lại IP mới, đăng nhập và quyền được quản lý tập trung. Đồng thời nó đưa vào độ phức tạp mới (khóa chuyển tiếp, xác thực phía sau, đồng bộ dữ liệu người chơi), trước khi cấu hình hãy đọc [Proxy đa máy chủ](/tutorials/java/proxy).

:::warn Đã cài proxy thì đừng để phía sau lộ trực tiếp
Máy chủ phía sau nên chỉ nhận kết nối từ proxy. **Nếu cổng phía sau mở ra Internet, người chơi có thể bỏ qua proxy kết nối thẳng**, toàn bộ kiểm tra đăng nhập, giới hạn quyền, danh sách trắng trên proxy đều mất hiệu lực. Cấu hình cổng và tường lửa liên quan xem [Cơ bản an toàn mạng](/tutorials/ops/network-security).
:::

## 3. Khái niệm bản Java

Nhóm từ này là "tiếng lóng" của hệ sinh thái bản Java, tần suất xuất hiện cao nhất.

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| Bukkit | Bukkit | Dự án đầu tiên cung cấp API plugin cho máy chủ nguyên bản. Các máy chủ sau này cơ bản đều lấy API của nó làm tiếng nói chung, nên plugin thường được gọi là "plugin Bukkit" | [Chọn lõi máy chủ](/tutorials/java/core) |
| Spigot | Spigot | Nhánh kế thừa của Bukkit, từ lâu là chuẩn thực tế của phía plugin, cũng là khởi điểm của nhiều nhánh sau này | [Chọn lõi máy chủ](/tutorials/java/core) |
| Paper | Paper | Nhánh Spigot phổ biến nhất hiện nay, đã làm lượng lớn sửa lỗi hiệu năng và cơ chế và được bảo trì liên tục. **Đã thay đổi một phần hành vi bản gốc vì hiệu năng**, đây là gốc rễ xung đột của nó với kỹ thuật redstone | [Chọn lõi máy chủ](/tutorials/java/core) |
| Purpur | Purpur | Nhánh dựa trên Paper, cung cấp thêm lượng lớn tùy chọn lối chơi có thể cấu hình | [Chọn lõi máy chủ](/tutorials/java/core) |
| Folia | Folia | Nhánh dựa trên Paper, chia thế giới thành khu vực để tick song song. **Đổi tương thích plugin lấy việc dùng nhiều nhân**, và hành vi tương tác giữa các khu vực khác Paper | [Chọn lõi máy chủ](/tutorials/java/core) |
| API | Application Programming Interface | Giao diện lập trình mà máy chủ cung cấp cho plugin gọi. **Plugin viết bằng API tương đối ổn định qua các phiên bản**, còn đụng trực tiếp vào phần hiện thực bên trong thì ngược lại | [Nhập môn plugin](/tutorials/java/plugins) |
| NMS | net.minecraft.server | Tên gói chứa các lớp bên trong của máy chủ, được mượn để chỉ "bỏ qua API gọi thẳng phần hiện thực bên trong". **Các cấu trúc bên trong này không có bảo đảm tương thích**, nâng phiên bản là có thể mất hiệu lực | [Nhập môn plugin](/tutorials/java/plugins) |
| api-version | api-version | Trường trong `plugin.yml`, khai báo plugin được viết theo phiên bản Paper API nào. Tài liệu chính thức nói: **máy chủ có phiên bản thấp hơn giá trị đó sẽ từ chối tải plugin**; không điền sẽ bị coi là plugin kiểu cũ và in cảnh báo | [Nhập môn plugin](/tutorials/java/plugins) |
| YAML | YAML Ain't Markup Language | Định dạng mà phần lớn plugin và tệp cấu hình dòng Paper dùng. **Thụt lề chính là cú pháp**, dùng dấu cách, đừng dùng Tab, thụt lề sai là phân tích thất bại luôn | [Cấu hình máy chủ](/tutorials/java/config) |
| Xác thực bản quyền | online-mode | `online-mode` trong `server.properties`. Khi bật, máy chủ sẽ xác thực thân phận người chơi với dịch vụ phiên của Mojang | [Cấu hình máy chủ](/tutorials/java/config) |
| Máy chủ ngoại tuyến | offline-mode / cracked server | Máy chủ có `online-mode=false`. Tên người chơi điền tùy ý, **bất kỳ ai cũng mạo danh được tên người khác**, cũng không lấy được UUID chính thức | [Cấu hình máy chủ](/tutorials/java/config) |
| UUID | Universally Unique Identifier | Định danh duy nhất của người chơi. Máy chủ bản quyền do dịch vụ phiên Mojang cấp; máy chủ ngoại tuyến do máy chủ suy ra theo tên, **cùng tên là cùng UUID, đổi tên là đổi thân phận** | [Lệnh máy chủ thường dùng](/tutorials/java/commands) |
| Danh sách trắng | whitelist | Cơ chế chỉ cho người chơi trong danh sách vào. Khóa liên quan là `white-list`, tệp danh sách là `whitelist.json`; `enforce-whitelist` quyết định có đá những người đang trực tuyến không có trong danh sách sau khi nạp lại hay không | [Cấu hình máy chủ](/tutorials/java/config) |
| OP / quản trị viên | operator | Người chơi có quyền dùng lệnh quản trị máy chủ, được ghi trong `ops.json`. **Cho OP tức là cho một quyền rất lớn**, trước khi cho hãy nghĩ cho rõ | [Lệnh máy chủ thường dùng](/tutorials/java/commands) |
| RCON | Remote Console | Giao thức gửi lệnh console tới máy chủ qua mạng, cổng mặc định 25575. **Nó không mã hóa**, mật khẩu và lệnh đều có thể bị chặn bắt, **chỉ nên dùng trên máy này hoặc trong đường hầm mã hóa** | [Cơ bản an toàn mạng](/tutorials/ops/network-security) |

### 3.1 Các lõi này có quan hệ gì

Chúng không phải năm lựa chọn ngang hàng, mà là một **chuỗi kế thừa**:

```text
Máy chủ nguyên bản (vanilla)
  └─ Bukkit / CraftBukkit  cung cấp API plugin
       └─ Spigot           hiệu năng và sửa lỗi
            └─ Paper       lượng lớn tối ưu và sửa lỗi (phổ biến hiện nay)
                 ├─ Purpur thêm tùy chọn lối chơi
                 └─ Folia  tick song song theo khu vực
```

Hiểu chuỗi này có ích ở chỗ: **trong tệp cấu hình của Paper sẽ xuất hiện khóa của Spigot và Bukkit** (`spigot.yml`, `bukkit.yml`), vì chúng được kế thừa từ phía trên. Khi thấy tên tệp không quen, hãy nghĩ xem nó thuộc tầng nào trên chuỗi.

### 3.2 Quan hệ giữa xác thực bản quyền, UUID và danh sách trắng

Ba từ này hay được bàn cùng nhau, vì chúng **quyết định lẫn nhau**:

- **Máy chủ bản quyền** (`online-mode=true`): thân phận người chơi do dịch vụ phiên Mojang xác nhận, UUID là cấp tài khoản, **đổi tên không ảnh hưởng thân phận**. Danh sách trắng, quyền, dữ liệu kinh tế đều gắn trên UUID này.
- **Máy chủ ngoại tuyến** (`online-mode=false`): máy chủ suy ra UUID theo tên người chơi, **đổi tên là đổi thành người khác**, mà mạo danh tên người khác tức là giả làm người khác.

Đổi một máy chủ bản quyền thành ngoại tuyến (hoặc ngược lại), **UUID của người chơi hiện có sẽ thay đổi**, hậu quả là danh sách trắng, quyền, dữ liệu kinh tế, lãnh thổ đều không khớp người. Đây không phải việc nhỏ "đổi một công tắc", trước khi chuyển nhất định phải sao lưu và đối chiếu ánh xạ thân phận, xem [Sao lưu và khôi phục](/tutorials/java/backup).

:::warn Đừng để RCON lộ ra Internet
Mục tiêu thiết kế của RCON là quản lý từ xa trong máy này hoặc mạng tin cậy, **bản thân giao thức không mã hóa**. Mapping nó ra Internet tức là giao console cho trình quét. Khi cần dùng từ xa, hãy đi qua đường hầm SSH hoặc VPN, xem [Cơ bản an toàn mạng](/tutorials/ops/network-security).
:::

### 3.3 Tệp cấu hình chia ba loại, đừng trộn lẫn

Nguồn hỗn loạn phổ biến nhất của người mới là coi các tệp cấu hình ở tầng khác nhau là một. Thực ra phân công của chúng rất rõ:

| Loại | Tệp điển hình | Ai tạo ra | Sửa sai thì sao |
| --- | --- | --- | --- |
| Cấu hình bản thân máy chủ | `server.properties` | Máy chủ tạo khi khởi động lần đầu | Tên khóa viết sai sẽ bị bỏ qua hoặc lùi về mặc định, **thay đổi cần khởi động lại mới có hiệu lực** |
| Cấu hình nhánh máy chủ | `spigot.yml`, `bukkit.yml`, `paper-world-defaults.yml`, v.v. | Nhánh tương ứng tạo khi khởi động lần đầu | Ảnh hưởng cơ chế và hiệu năng, **đặc biệt nhạy trong tình huống kỹ thuật redstone** |
| Cấu hình plugin | `plugins/<插件名>/config.yml`, v.v. | Plugin tạo khi tải lần đầu | Định dạng sai khiến plugin tải thất bại, **nguyên nhân thường được ghi trong nhật ký** |

Một kinh nghiệm thực dụng: **trước khi sửa bất kỳ tệp cấu hình nào hãy copy một bản**. Tệp cấu hình là văn bản thuần, dung lượng rất nhỏ, chi phí sao lưu gần như bằng không, nhưng chi phí truy nguyên sau khi sửa hỏng thì rất cao. Phạm vi sao lưu và quy trình quay lui xem [Sao lưu và khôi phục](/tutorials/java/backup).

### 3.4 Danh sách trắng và OP là hai việc khác nhau

Hai từ này hay được đặt cạnh nhau, nhưng chúng kiểm soát những thứ hoàn toàn khác nhau:

| | Danh sách trắng (whitelist) | OP (operator) |
| --- | --- | --- |
| Kiểm soát cái gì | **Ai được vào máy chủ** | **Vào rồi thì làm được gì** |
| Vị trí lưu | `whitelist.json` | `ops.json` |
| Công tắc liên quan | `white-list`, `enforce-whitelist` | `op-permission-level` quyết định cấp quyền mặc định của OP |
| Hiểu nhầm thường gặp | Tưởng bật danh sách trắng là an toàn | Tưởng cho OP chỉ là "thêm vài lệnh" |

**Cho OP tức là cho một quyền rất lớn**, gồm khả năng thực thi các lệnh làm thay đổi thế giới. Trước khi cho hãy nghĩ rõ đối phương là ai, và quyền này có thu hồi được không. Lệnh liên quan xem [Lệnh máy chủ thường dùng](/tutorials/java/commands).

## 4. Khái niệm bản Bedrock

Hệ sinh thái bản Bedrock gần như không trùng với bản Java, thuật ngữ cũng tự thành một bộ.

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| BDS | Bedrock Dedicated Server | Máy chủ chuyên dụng cho bản Bedrock do Microsoft phát hành chính thức, **không mã nguồn mở**, năng lực plugin có hạn, thường mở rộng bằng gói hành vi và script | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Phiên bản giao thức | protocol version | Phiên bản định dạng dữ liệu giao tiếp giữa client và máy chủ. **Client bản Bedrock tự động cập nhật**, máy chủ không theo kịp là không kết nối được, đây là sự cố phổ biến nhất của máy chủ Bedrock | [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol) |
| Addon | add-on | Cách gọi chung cho nội dung mở rộng của bản Bedrock, gồm gói hành vi, gói tài nguyên, v.v., được tải qua thiết lập thế giới | [Các loại máy chủ Bedrock Edition](/tutorials/bedrock/type) |
| Gói hành vi | behavior pack | Phần phụ trách logic và quy tắc trong Addon: có thể thêm thực thể, đổi đồ rơi, viết script | [Các loại máy chủ Bedrock Edition](/tutorials/bedrock/type) |
| Gói tài nguyên | resource pack | Phần phụ trách ngoại hình và âm thanh trong Addon: vật liệu, model, âm thanh, chữ trên giao diện | [Các loại máy chủ Bedrock Edition](/tutorials/bedrock/type) |
| allowlist.json | allowlist.json | Tệp danh sách trắng của máy chủ bản Bedrock, tương ứng công tắc `allow-list` trong `server.properties`. **Tên tệp khác với `whitelist.json` của bản Java** | [Máy chủ BDS](/tutorials/bedrock/bds) |
| permissions.json | permissions.json | Tệp máy chủ bản Bedrock dùng để chỉ định cấp quyền người chơi, cấp gồm visitor, member, operator; `default-player-permission-level` trong `server.properties` quyết định cấp mặc định của người chơi mới | [Máy chủ BDS](/tutorials/bedrock/bds) |
| Xác thực Xbox Live | Xbox Live authentication | Hệ tài khoản của bản Bedrock. **Kết nối máy chủ từ xa (không phải mạng nội bộ) luôn cần xác thực Xbox Live**, `online-mode` chủ yếu ảnh hưởng tình huống cục bộ và mạng nội bộ | [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol) |
| Nukkit | Nukkit | Phần hiện thực máy chủ Bedrock viết bằng Java, cung cấp API plugin tương tự Bukkit. Mức hoạt động của dự án gốc đã giảm mạnh | [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) |
| PMMP | PocketMine-MP | Phần hiện thực máy chủ Bedrock viết bằng PHP, hệ sinh thái plugin trưởng thành, cộng đồng lớn | [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) |
| PNX | PowerNukkitX | Một trong những nhánh kế thừa còn hoạt động của Nukkit, mục tiêu là tiếp tục bảo trì và theo kịp phiên bản mới | [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party) |

### 4.1 Vì sao máy chủ Bedrock hay "cập nhật xong là không vào được"

Vì **client tự động cập nhật, còn máy chủ thì không**. Nhịp cập nhật của BDS chính thức gắn với phiên bản client, các phần hiện thực bên thứ ba theo kịp thường chậm hơn. Client trên điện thoại của người chơi lên phiên bản mới, máy chủ còn dừng ở phiên bản giao thức cũ, kết quả là không kết nối được.

Điều này cũng giải thích vì sao từ "phiên bản giao thức" xuất hiện với tần suất rất cao trong bản Bedrock. Cách ứng phó và tình hình theo kịp của từng phần hiện thực xem [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol).

### 4.2 Phần hiện thực bên thứ ba phải tự đánh giá

Nukkit, PMMP, PNX đều **không phải máy chủ chính thức**, mức độ tái hiện cơ chế bản gốc, tốc độ cập nhật, chất lượng plugin khác nhau rất nhiều. Trước khi chọn hãy xác nhận ba việc: **đã theo kịp phiên bản giao thức bạn cần chưa**, **hệ sinh thái plugin có đáp ứng nhu cầu không**, **dự án gần đây còn được bảo trì không**. Xem [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup).

:::note Đừng áp thuật ngữ qua phiên bản khác
`whitelist.json` (bản Java) và `allowlist.json` (bản Bedrock) là hai tệp khác nhau; "plugin" của bản Java và "gói hành vi" của bản Bedrock không phải cùng loại. **Khi hỏi trong nhóm hãy nói rõ là phiên bản nào trước**, sẽ tiết kiệm được rất nhiều lượt qua lại.
:::

## 5. Nhóm kỹ thuật redstone và kỹ thuật

Nhóm từ này là sinh hoạt hằng ngày của người chơi "sinh tồn thiên kỹ thuật" (kỹ thuật redstone), và cũng là loại nhu cầu **dễ xung đột với tối ưu hiệu năng nhất**.

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| Kỹ thuật redstone | technical Minecraft | "Sinh tồn + mạch điện", chỉ kiểu sinh tồn thiên kỹ thuật lấy máy redstone, tháp sinh quái, hành vi khối và thực thể chính xác làm lối chơi cốt lõi. **Cực kỳ nhạy với việc hành vi bản gốc có bị thay đổi hay không** | [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) |
| Tháp sinh quái | mob farm / mob grinder | Thiết bị dùng cơ chế sinh quái để tập trung sinh và giết sinh vật nhằm lấy đồ rơi. Nó đồng thời là **hộ tiêu thụ hiệu năng lớn**: nhiều thực thể, nhiều đồ rơi, chunk thường trực được nạp | [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |
| Đồng hồ redstone | redstone clock | Mạch xuất tín hiệu redstone theo chu kỳ, dùng để kích hoạt thiết bị khác theo nhịp. **Đồng hồ tần số cao là nguồn đỉnh MSPT điển hình** | [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) |
| Nhân bản TNT | TNT duplication | Kỹ thuật dùng cơ chế của phiên bản cụ thể để nhân bản thực thể TNT, là nền tảng của nhiều công trình lớn. **Một số nhánh máy chủ đã thay đổi hành vi liên quan vì hiệu năng hoặc cân bằng**, khiến việc nhân bản mất hiệu lực | [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) |
| Phạm vi kích hoạt thực thể | entity activation range | Cơ chế do dòng Spigot đưa vào: **thực thể vượt quá một khoảng cách không phải không được nạp, mà bị giảm tần suất tick**. Giảm nhỏ tiết kiệm CPU, nhưng khiến máy ở xa biểu hiện bất thường | [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |
| Nạp chunk / nạp cưỡng bức | chunk loading / force load | Chunk chỉ tick khi được nạp. Người chơi, chunk điểm xuất phát, cổng dịch chuyển, `/forceload` và plugin đều có thể duy trì việc nạp; **nạp cưỡng bức nghĩa là để nó được nạp lâu dài do con người**, cái giá là chi phí CPU và bộ nhớ thường trực | [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |
| Trần sinh quái | mob cap | Trần số sinh vật tồn tại đồng thời trong một thế giới. Nó được cấu hình ở `spawn-limits` trong `bukkit.yml` và các vị trí khác, dòng Paper còn có thể ghi đè theo thế giới, hoặc đổi thành tính riêng theo người chơi | [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |

### 5.1 "Nạp" và "tick" không phải một chuyện

Người mới hay dùng lẫn hai từ này, nhưng chúng mô tả các giai đoạn khác nhau:

| Giai đoạn | Ý nghĩa | Chi phí điển hình |
| --- | --- | --- |
| Nạp (load) | Dữ liệu chunk tồn tại trong bộ nhớ, đọc ghi được | Bộ nhớ, I/O đĩa |
| Tick | Thực thể, khối thực thể, random tick trong chunk tiến triển theo quy tắc | CPU (luồng chính) |

Một chunk **có thể được nạp mà không được tick** (ví dụ vượt khoảng cách mô phỏng), cũng có thể vì nạp cưỡng bức mà **vừa được nạp vừa được tick lâu dài**. Bản thân vật rơi không khiến chunk được nạp, nhưng chỉ cần chunk đó vì lý do khác mà được nạp, vật rơi bên trong sẽ tick mãi, tích tụ mãi. Khác biệt này là then chốt khi truy "thực thể càng chất càng nhiều", xem [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag).

### 5.2 Tối ưu và kỹ thuật redstone thường loại trừ nhau

"Giảm phạm vi kích hoạt, hạ trần sinh quái, nới lỏng kiểm tra phễu" có thể làm TPS trông đẹp, nhưng **cũng khiến farm và máy móc mất hiệu lực luôn**: dân làng không bổ sung hàng, tháp sinh quái không ra hàng, thiết bị phụ thuộc tách vật phẩm rối loạn. Máy chủ kỹ thuật redstone nên làm ngược lại —— chỉnh những mục ảnh hưởng hành vi bản gốc về như bản gốc, hoặc đổi thẳng sang lõi gần với bản gốc. Xem [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) và [Tối ưu hiệu năng](/tutorials/java/optimize).

:::warn Sao lưu trước khi sửa cấu hình
Mọi thay đổi "vì hiệu năng" đều có thể thay đổi cơ chế game. **Sửa trước thì sao lưu tệp cấu hình, sửa xong thì chạy lại thử máy móc**, là quy trình cố định của máy chủ kỹ thuật redstone. Phạm vi sao lưu xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::

## 6. Nhóm vận hành

Nhóm từ này là những thứ nhất định sẽ gặp sau khi "coi máy chủ là việc phải bảo trì lâu dài".

| Thuật ngữ | Tiếng Anh | Giải thích | Tài liệu liên quan |
| --- | --- | --- | --- |
| Sao lưu | backup | Copy thế giới và cấu hình thành một bản có thể khôi phục khi có sự cố. **Chỉ copy mà không kiểm chứng khôi phục thì không tính là sao lưu** | [Sao lưu và khôi phục](/tutorials/java/backup) |
| Sao lưu ngoài vị trí | offsite backup | Đặt bản sao lưu ở **vị trí vật lý khác hoặc nhà cung cấp khác với máy chủ**. Khi cả máy hỏng, bị xâm nhập hoặc phòng máy gặp sự cố, bản sao lưu trên máy sẽ biến mất cùng | [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Nguyên tắc 3-2-1 | 3-2-1 rule | Một quy tắc kinh nghiệm sao lưu phổ quát: **ít nhất 3 bản sao, đặt trên 2 loại phương tiện khác nhau, trong đó 1 bản ở nơi khác**. Đây là tổng kết kinh nghiệm, không phải tiêu chuẩn | [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Ngoài vị trí | off-site | Vị trí lưu trữ không cùng vị trí vật lý với máy chủ, không chịu cùng một sự cố. **Thư mục khác trên cùng máy, ổ khác trên cùng máy đều không tính là ngoài vị trí** | [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| UPS | Uninterruptible Power Supply | Nguồn điện không gián đoạn. Giá trị chính của nó không phải "mất điện vẫn chơi tiếp", mà là **tranh thủ vài phút cho máy chủ hoàn tất tắt an toàn**, tránh mất điện cứng trong lúc ghi làm hỏng bản lưu | [Rack, switch và UPS](/tutorials/ops/hardware-rack) |
| Bảng điều khiển | panel / control panel | Công cụ quản lý máy chủ bằng giao diện web, cung cấp bật tắt, console, quản lý tệp, sao lưu, v.v., phổ biến như Pterodactyl, MCSManager. **Đồng thời nó là một bề mặt tấn công mới** | [Quản lý bảng điều khiển](/tutorials/ops/panels) |
| Tiến trình daemon | daemon | Chương trình thường trực ở nền, phụ trách thực thi nhiệm vụ cụ thể. Trong kiến trúc bảng điều khiển thường có một daemon chạy trên mỗi máy bị quản lý, **giao tiếp giữa nó và phía web cần được gia cố trọng điểm** | [Quản lý bảng điều khiển](/tutorials/ops/panels) |
| DDoS | Distributed Denial of Service | Tấn công từ chối dịch vụ phân tán: dùng lưu lượng từ lượng lớn nguồn chiếm đầy băng thông hoặc tài nguyên kết nối của mục tiêu. **Phía máy chủ làm được rất ít, thường cần nhà cung cấp làm sạch ở phía trên** | [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) |
| Giới hạn tốc độ | rate limiting | Chủ động giới hạn số kết nối hoặc số yêu cầu trong một đơn vị thời gian, tránh lượng nhỏ nguồn làm cạn tài nguyên. **Nó là phương tiện giảm nhẹ, không phải phương tiện trị tận gốc**, và đặt quá chặt sẽ làm tổn thương người chơi bình thường | [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) |
| Điều tra chứng cứ | forensics | Trước khi khởi động lại, cài lại, cấm, hãy cố định **hiện trường sẽ biến mất vĩnh viễn sau vài phút**: tiến trình, kết nối, nhật ký, dòng thời gian. **Sai thứ tự là mất chứng cứ** | [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics) |
| Phân tích sau sự việc | post-mortem analysis | Sau khi có sự cố mới đi tra "lúc đó đã xảy ra chuyện gì". **Nó chỉ giải thích được quá khứ, không ngăn được lần sau** | [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |
| Cảnh báo trước sự việc | alerting | Trước khi vấn đề ảnh hưởng người chơi, hệ thống chủ động thông báo cho bạn. Nó và phân tích sau sự việc là quan hệ bổ trợ, không phải thay thế | [Giám sát và cảnh báo](/tutorials/ops/monitoring) |
| Chờ I/O đĩa | I/O wait | Tỷ lệ thời gian CPU quay không trong khi chờ đĩa hoàn tất đọc ghi. **Lúc nó cao, máy chủ trông "không tính toán gì" mà vẫn chậm** | [Rack, switch và UPS](/tutorials/ops/hardware-rack) |
| Sổ tay vận hành | runbook | Các bước xử lý viết sẵn cho "một cảnh báo kêu thì làm gì". **Cảnh báo không có sổ tay vận hành tức là nửa đêm đánh thức bạn dậy xem một vấn đề bạn không biết xử lý thế nào** | [Giám sát và cảnh báo](/tutorials/ops/monitoring) |

### 6.1 Từ "sao lưu" bị dùng sai quá nhiều

Trong hội thoại hằng ngày, "tôi sao lưu rồi" ít nhất có thể chỉ bốn việc khác nhau:

| Cách nói | Ý nghĩa thật | Có đủ không |
| --- | --- | --- |
| "Tôi copy thư mục world rồi" | Có một bản sao trên cùng máy | Chặn được xóa nhầm, không chặn được hỏng cả máy |
| "Script sao lưu chạy mỗi ngày" | Có một tác vụ chạy định giờ | **Không xem mã thoát thì không biết nó có thành công không** |
| "Tệp sao lưu còn đó" | Trên đĩa có tệp lưu trữ | **Chưa kiểm chứng khôi phục thì không tính là sao lưu** |
| "Đã khôi phục thử một lần" | Thực sự khôi phục ở chỗ khác và khởi động thành công | Đây mới là bản sao lưu dùng được |

Trong bốn tầng, chỉ tầng cuối mới thực sự cứu mạng. **Cách kiểm chứng khôi phục** xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).

### 6.2 Vì sao UPS được tính là từ vận hành

Vì mất điện và "máy chủ sập" là hai việc có tính chất khác nhau. **Máy chủ sập thường không làm hỏng bản lưu** (tiến trình thoát bất thường, nhưng hệ thống tệp vẫn nhất quán); còn **mất điện cứng trong lúc đang ghi có thể để lại tệp ghi dở**, nhẹ thì mất chunk, nặng thì bản lưu không nạp được.

Nên định vị của UPS là "cho máy chủ cơ hội tắt an toàn", chứ không phải "để người chơi mất điện vẫn chơi được". Cách chọn, giám sát NUT và cấu hình tự động tắt máy xem [Rack, switch và UPS](/tutorials/ops/hardware-rack) và [Mở máy chủ trên máy tính gia đình và bảo trì](/tutorials/ops/home-hosting).

:::tip Một điều dễ bị bỏ sót nhất
Trong các từ trên, thứ thực sự bị bỏ qua lặp đi lặp lại là **"kiểm chứng khôi phục"**. Tệp sao lưu tồn tại, mã thoát script là 0, đều không có nghĩa là khôi phục được máy chủ. Hãy định kỳ thực sự khôi phục một lần, xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
:::

## 7. Lệnh thường dùng tương ứng với thuật ngữ

Thuật ngữ chỉ có ích khi gắn được vào lệnh cụ thể. Bảng dưới nối các từ phổ biến nhất ở các mục trên với lệnh "xem một chút hiện trạng". **Định dạng đầu ra cụ thể của các lệnh này thay đổi theo bản phân phối và phiên bản, hãy lấy đầu ra thực tế trên hệ thống bạn làm chuẩn.**

| Muốn xác nhận từ | Lệnh | Xem gì |
| --- | --- | --- |
| Tải tổng thể của máy vật lý | `uptime` | Ba số cuối là tải trung bình 1, 5, 15 phút; **phải xem cùng số nhân CPU**, một nhân đầy là 1.00 |
| Bộ nhớ và trao đổi | `free -h` | Chú ý cột `available`, nó gần với "còn dùng được bao nhiêu" hơn `free` |
| Dung lượng đĩa | `df -h` | Xem dung lượng còn lại của điểm mount tương ứng; **đĩa đầy sẽ khiến máy chủ ghi bản lưu thất bại** |
| Sức khỏe ổ đĩa | `smartctl -a /dev/sdX` | Thời gian cắm điện, lượng ghi, sector được ánh xạ lại và các thuộc tính khác; lệnh đến từ `smartmontools` |
| Tổng quan kết nối mạng | `ss -s` | Tổng số các loại socket; **số kết nối tăng bất thường thường xuất hiện trước khi bộ nhớ cạn** |
| Cổng đang lắng nghe | `ss -lntp` / `ss -lunp` | TCP / UDP đang nghe những cổng nào, do tiến trình nào giữ |
| Trạng thái dịch vụ | `systemctl status <服务名>` | Có active không, các lần thoát gần nhất, đoạn nhật ký gần nhất |
| Nhật ký dịch vụ | `journalctl -u <服务名>` | Dùng `--since "1 hour ago"` để thu hẹp phạm vi; **khi điều tra chứng cứ thêm `--utc`** |
| Khả dụng HTTP | `curl -s -o /dev/null -w '%{http_code}' <URL>` | Chỉ xuất mã trạng thái, phù hợp nhét vào script để phán đoán |
| Trạng thái UPS | `upsc <ups名>` | `ups.status` là `OL` nghĩa là điện lưới, `OB` nghĩa là chạy bằng ắc quy; tên biến lấy tài liệu NUT và model làm chuẩn |

:::tip Đừng chỉ xem một lần kết quả
`free -h` và `df -h` là **ảnh chụp**, một lần kết quả gần như không nói được gì. Thứ thực sự hữu ích là **xu hướng**: đĩa có tăng mỗi tuần không, bộ nhớ có leo mỗi ngày không. Xu hướng phải nhờ thu thập định giờ, xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).
:::

## 8. Quan hệ giữa các thuật ngữ

Học thuộc các danh từ rời rạc thì vô ích, **nối chúng thành vài chuỗi nhân quả** mới có ích:

| Việc bạn muốn làm | Thuật ngữ cần hiểu trước | Vì sao |
| --- | --- | --- |
| Phán đoán máy chủ có lag không | tick, TPS, MSPT, ngân sách 50 ms | Chỉ khi dịch được "lag" thành chỉ số mới bắt đầu truy nguyên được |
| Chọn lõi máy chủ | plugin, mod, kỹ thuật redstone, proxy | Lõi quyết định bạn dùng được phần mở rộng nào, và hành vi bản gốc có bị thay đổi không |
| Cấu hình plugin | YAML, phụ thuộc, API, NMS, api-version | Phần lớn "plugin bị đỏ" đều nằm ở mấy từ này |
| Quản lý người chơi | online-mode, UUID, danh sách trắng, OP | Thân phận và quyền đều gắn trên UUID |
| Mở máy chủ Bedrock | BDS, phiên bản giao thức, gói hành vi, allowlist.json | Bản Bedrock tự thành một bộ, kinh nghiệm bản Java không dùng chung được |
| Giữ được dữ liệu | sao lưu, ngoài vị trí, 3-2-1, UPS, điều tra chứng cứ | Khi có sự cố, chỉ mấy thứ này cứu được bạn |
| Bảo trì dài hạn | bảng điều khiển, daemon, DDoS, giới hạn tốc độ, giám sát cảnh báo | Coi máy chủ là việc cần trông nom liên tục |

## 9. Bước tiếp theo

Đã hiểu thuật ngữ, tiếp theo chỉ cần làm mấy việc này theo thứ tự:

| Việc muốn làm | Đi bài nào |
| --- | --- |
| Trước hết chọn một lõi phù hợp | [Chọn lõi máy chủ](/tutorials/java/core) |
| Chạy máy chủ lên | [Mở máy chủ](/tutorials/java/start) |
| Có sự cố mà không biết xem ở đâu | [Báo lỗi và kiểm tra crash thường gặp của Java Edition](/tutorials/faq/errors) |
| Máy chủ lag | [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |
| Giữ được dữ liệu | [Sao lưu và khôi phục](/tutorials/java/backup), [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Gia cố máy | [Gia cố an ninh hệ thống](/tutorials/ops/system-security) |
| Có sự cố thì làm gì | [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics) |
| Cài một bộ giám sát và cảnh báo | [Giám sát và cảnh báo](/tutorials/ops/monitoring) |

## 10. Bảng đối chiếu triệu chứng

Cuối cùng đưa một bảng "tra ngược": **từ hiện tượng tìm ra thuật ngữ tương ứng**. Bảng này không thay thế được truy nguyên, nhưng giúp bạn biết nên tìm theo hướng nào.

| Hiện tượng bạn thấy | Nghĩ tới thuật ngữ nào trước | Đi đâu xem |
| --- | --- | --- |
| Người chơi nói "lag", mà TPS hiển thị 20 | Render phía client, dao động mạng, đỉnh MSPT | Mục 1; [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark) |
| TPS thấp hơn 20 lâu dài, MSPT ổn định cao | Thực thể tích tụ, trần sinh quái, nạp chunk, điểm nóng plugin | Mục 1, 5; [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) |
| Cách một lúc lại "giật một cái" | Dừng GC, tự động lưu, tác vụ định giờ | Mục 1; [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Máy chủ đột nhiên tự tắt | watchdog, `OutOfMemoryError`, đĩa đầy | [Báo lỗi và kiểm tra crash thường gặp của Java Edition](/tutorials/faq/errors) |
| Bản lưu không nạp được / mất chunk | Mất điện cứng, tệp ghi dở, UPS | Mục 6; [Sao lưu và khôi phục](/tutorials/java/backup) |
| Plugin vừa khởi động đã báo đỏ | Phụ thuộc, api-version, NMS, không khớp phiên bản | Mục 2, 3; [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps) |
| Người chơi không vào được, báo xác thực thất bại | online-mode, UUID, xác thực bản quyền | Mục 3; [Cấu hình máy chủ](/tutorials/java/config) |
| Người chơi Bedrock vào không được hàng loạt | Phiên bản giao thức, client tự động cập nhật | Mục 4; [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol) |
| Máy redstone đột nhiên không hoạt động | Kỹ thuật redstone, nhân bản TNT, phạm vi kích hoạt thực thể, thay đổi của nhánh máy chủ | Mục 5; [Kỹ thuật redstone và máy móc](/tutorials/java/redstone) |
| Script sao lưu "đã chạy", mà tệp không đúng | Mã thoát, ngoài vị trí, kiểm chứng khôi phục | Mục 6; [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup) |
| Không vào được bảng điều khiển / không kết nối được console | Daemon, cổng, chứng chỉ | Mục 6; [Quản lý bảng điều khiển](/tutorials/ops/panels) |
| Băng thông bị đánh đầy, SSH cũng không vào được | DDoS, giới hạn tốc độ, làm sạch phía trên | Mục 6; [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense) |

> Việc cài đặt và cấu hình từng phần mềm lấy tài liệu chính thức làm chuẩn.
