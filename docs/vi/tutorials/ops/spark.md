---
title: Phân tích hiệu năng máy chủ bằng spark
slug: spark
cat: ops
level: 3
order: 15
minutes: 16
tags: [spark, profiler, tps, mspt, lag, diagnostics, paper, performance]
updated: 2026-10-04
draft: false
---

Máy chủ "lag" là một hiện tượng, không phải một nguyên nhân. Người chơi nói lag, có thể do một plugin nào đó chiếm hết luồng chính, có thể do quá nhiều thực thể, có thể do người chơi chạy khám phá khiến chunk được sinh ra theo thời gian thực, cũng có thể do CPU của máy vật lý bị bóp xung hoặc bị bán quá mức. **Giá trị của spark là biến "lag" từ một cảm giác thành một bằng chứng có thể chỉ tay vào xem**: đường gọi nào, plugin nào, chiếm bao nhiêu phần trăm.

Bài này chỉ nói cách dùng bản thân spark. Hướng tinh chỉnh xem [Tối ưu hiệu năng](/tutorials/java/optimize), thực thể tích tụ xem [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag), sập và báo lỗi xem [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java).

:::warn Lệnh lấy tài liệu chính thức làm chuẩn
Các lệnh và tùy chọn liệt kê trong bài này lấy từ tài liệu chính thức của spark (spark.lucko.me/docs) và tài liệu PaperMC, và đã đối chiếu từng mục. **Các lệnh con và tùy chọn khả dụng của spark hơi khác nhau giữa các nền tảng và các phiên bản lớn**; trước khi làm hãy dùng `/spark` hoặc Tab completion để xác nhận phiên bản của bạn hỗ trợ tham số nào, đừng ghép tùy chọn theo trí nhớ.
:::

## 1. spark là gì, cài thế nào

### 1.1 Nó gồm ba phần

spark là một công cụ phân tích hiệu năng (profiler), tài liệu chính thức định vị nó là "trình phân tích hiệu năng cho phía client, máy chủ và proxy của Minecraft", gồm ba năng lực:

| Thành phần | Trả lời câu hỏi gì |
| --- | --- |
| Profiler (trình phân tích lấy mẫu) | Thời gian CPU dành cho những phương thức nào, những plugin nào? |
| Memory Inspection (kiểm tra bộ nhớ) | Trong heap cái gì chiếm nhiều nhất? GC dừng nhiều không? |
| Health Reporting (báo cáo sức khỏe) | TPS, CPU, bộ nhớ, đĩa ở trạng thái dài hạn thế nào? |

Đồng thời nó là một website: spark.lucko.me vừa là trang chính thức, vừa là trình xem báo cáo trực tuyến (viewer). Bạn chạy xong một lần lấy mẫu trong game, dữ liệu sẽ được tải lên, rồi nó cho bạn một liên kết, mở bằng trình duyệt là xem được cây gọi, biểu đồ lửa, v.v.

Mấy nhận thức cần dựng trước:

- **spark là trình phân tích kiểu lấy mẫu (sampling)**. Tài liệu chính thức trong "spark vs. others" nói rõ: phân tích lấy mẫu thường không chính xác bằng về mặt giá trị số so với chèn mã (instrumentation), nhưng nó gần như không làm chậm chương trình đích, nên trong thực tế thường phản ánh đúng hơn tình hình thực thi thật.
- **Nó ghi lại "mọi thứ"**. Tài liệu chính thức khi so với timings chỉ ra: timings cần người dùng định nghĩa trước vùng phân tích, nó đếm được số lần sự kiện, thân thiện hơn với người mới chưa quen profiler; còn spark không cần định nghĩa trước, sẽ ghi toàn bộ ngăn xếp gọi, nên phù hợp hơn để trả lời "rốt cuộc chậm ở dòng mã nào".
- **Nó không chỉ là plugin máy chủ**. spark cũng có thể gắn như Java agent vào bất kỳ chương trình JVM nào (gồm máy chủ vanilla), và sẽ tự động áp dụng bảng ánh xạ giải xáo trộn cho máy chủ vanilla.

### 1.2 Cài trên từng nền tảng

Trang tải chính thức (https://spark.lucko.me/download) phân phát gói khác nhau theo nền tảng. **Trước hết chọn đúng nền tảng của bạn, rồi mới tải**, đặt jar vào thư mục tương ứng, khởi động lại máy chủ là có hiệu lực.

| Nền tảng | Mục trên trang tải chính thức | Đặt ở đâu | Ghi chú |
| --- | --- | --- | --- |
| Bukkit / Spigot / Paper / Purpur | Bukkit (Paper/Spigot) | `plugins/` | Plugin máy chủ; Paper 1.21+ đã tích hợp sẵn, xem dưới |
| Fabric | Fabric | `mods/` | Dạng mod |
| Forge | Forge | `mods/` | Dạng mod |
| NeoForge | NeoForge | `mods/` | Dạng mod |
| Velocity | Velocity | `plugins/` | Phía proxy; tiền tố lệnh khác, xem 1.4 |
| BungeeCord | BungeeCord | `plugins/` | Phía proxy; tiền tố lệnh khác, xem 1.4 |
| Sponge | Sponge (API 12) | `mods/` | Trang tải chính thức liệt kê riêng |
| Client (Fabric/Forge, v.v.) | Gói nền tảng tương ứng | `mods/` | Phân tích lag phía client; lệnh dùng `/sparkc` |
| Chương trình JVM bất kỳ / máy chủ vanilla | Standalone (Java Agent) | Tham số khởi động | Xem 1.3 |

:::note Paper 1.21 trở lên đã tích hợp sẵn
Tài liệu cài đặt chính thức nói rõ: **Paper 1.21 hoặc mới hơn đã đóng gói spark vào máy chủ, không cần cài plugin nữa**. Chỉ khi bạn cần bản spark mới hơn bản tích hợp sẵn thì mới đặt jar plugin độc lập vào `plugins/`, và thêm `-Dpaper.preferSparkPlugin=true` vào tham số khởi động để ghi đè bản tích hợp.
:::

:::warn Chỉ tải từ trang chính thức
Đặt jar vào `plugins/` nghĩa là giao quyền kiểm soát cả máy chủ cho nó. **Hãy lấy từ trang tải chính thức https://spark.lucko.me/download**, đừng dùng gói đăng lại không rõ nguồn gốc hay tệp trên ổ đĩa mạng. Trang tải còn có "Other Platforms" (Folia, Geyser, Minestom, Nukkit, Hytale, v.v.), tài liệu chính thức nói những cái này do cộng đồng cung cấp, hỗ trợ theo nguyên trạng (as-is), trước khi dùng hãy tự đánh giá.
:::

### 1.3 Agent độc lập (Standalone Agent)

Khi đối tượng không phải "máy chủ tiêu chuẩn" (ví dụ máy chủ vanilla, chương trình Java tự phát triển), dùng cách gắn agent. Gắn lúc khởi động:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar -jar application.jar [application args]
```

Cũng có thể chỉ định cổng lắng nghe cho agent:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222 -jar application.jar [application args]
```

Tham số agent hỗ trợ (nhiều tham số cách nhau bằng dấu phẩy):

| Tham số | Ý nghĩa |
| --- | --- |
| `port={port}` | Cổng agent lắng nghe, mặc định `2222` |
| `start` | Gắn xong bắt đầu lấy mẫu ngay |
| `open` | Gắn xong in liên kết trình xem ra console/nhật ký |

Ví dụ:

```bash
java -javaagent:spark-x.y.z-standalone-agent.jar=port=2222,start,open -jar application.jar
```

Nếu chương trình **đang chạy rồi**, có thể gắn thẳng vào tiến trình (thay `<pid>` bằng số hiệu tiến trình):

```bash
java -jar spark-x.y.z-standalone-agent.jar <pid>
java -jar spark-x.y.z-standalone-agent.jar <pid> port=2222
```

Khi chạy jar này mà không kèm PID, nó sẽ liệt kê mọi tiến trình Java hiện có cùng PID. Gắn thành công thì **cách kết nối sẽ được in ra console/nhật ký của chính chương trình bị gắn**; theo hướng dẫn, dùng một phiên SSH kết nối vào là có thể chạy các lệnh spark thông thường, dùng `exit` để thoát phiên đó.

### 1.4 Xác nhận nó đã tải thành công

Cách kiểm chứng trực tiếp nhất: **chạy `/spark` không kèm tham số nào**, nó sẽ in phiên bản và danh sách lệnh con khả dụng. Nếu báo lệnh không xác định hoặc không có đầu ra, nghĩa là chưa tải thành công.

Kiểm tra theo thứ tự: jar có đặt đúng thư mục không (`plugins/` hay `mods/`), có chọn đúng gói nền tảng không, máy chủ có thực sự khởi động lại không, trong nhật ký khởi động có thông tin tải của spark không.

Tiền tố lệnh khác nhau theo nền tảng, tài liệu chính thức ghi chú riêng:

| Môi trường | Lệnh dùng |
| --- | --- |
| Máy chủ (dòng Bukkit, máy chủ Fabric/Forge) | `/spark` |
| BungeeCord | `/sparkb` |
| Velocity | `/sparkv` |
| **Client** Forge/Fabric | `/sparkc` |

Về quyền: cần quyền `spark`, hoặc dùng node quyền riêng của từng lệnh con. Các node quyền tài liệu chính thức liệt kê gồm `spark.profiler`, `spark.health`, `spark.ping`, `spark.tps`, `spark.tickmonitor`, `spark.gc`, `spark.gcmonitor`, `spark.heapsummary`, `spark.heapdump`, `spark.activity`. Đa số trường hợp **tự đặt mình làm OP** là đủ.

:::tip Một mục cấu hình dễ bị bỏ qua
Mục cấu hình `overrideTpsCommand` của spark mặc định là `true`, và **chỉ có hiệu lực trên máy chủ dòng Bukkit**: nghĩa là mặc định `/tps` sẽ do spark tiếp quản, đầu ra chính là giao diện TPS của spark.
:::

## 2. Xem sức khỏe tổng thể trước

### 2.1 TPS và MSPT rốt cuộc nghĩa là gì

Hiểu vòng tick trước (hướng dẫn chính thức "The Tick Loop"):

- Mục tiêu của máy chủ Minecraft là **thực thi 20 tick mỗi giây**, tức là **50 mili giây một tick**.
- Việc phải làm trong một tick gồm: xử lý gói dữ liệu người chơi gửi đến (di chuyển, đặt/đập khối, tấn công thực thể), cập nhật vị trí người chơi và thực thể khác, phát sóng thay đổi thế giới cho người chơi, sinh quái và xử lý AI cùng tìm đường, xử lý cập nhật redstone, v.v.
- Nếu một tick dùng **ít hơn** 50 mili giây, máy chủ sẽ "ngủ" trong thời gian còn lại, đến lúc nên bắt đầu tick tiếp theo thì chạy tiếp. **Ngủ là khỏe mạnh**.
- Nếu một tick dùng **nhiều hơn** 50 mili giây, tick tiếp theo chỉ có thể bị đẩy lùi, vì tick không thể thực thi song song. Mọi thứ sẽ "dịch sang phải", số tick hoàn thành trong cùng một giây giảm đi, người chơi cảm thấy chậm, lag.

Hai chỉ số từ đó mà ra:

| Chỉ số | Tên đầy đủ | Ý nghĩa | Giá trị mục tiêu |
| --- | --- | --- | --- |
| TPS | ticks per second | Trung bình mỗi giây hoàn thành bao nhiêu tick | **20** |
| MSPT | milliseconds per tick | Trung bình mỗi tick tốn bao nhiêu mili giây | **50 hoặc thấp hơn** |

Tài liệu chính thức nói đầu ra của `/spark tps` còn gồm **giá trị nhỏ nhất, trung vị, phân vị 95 và giá trị lớn nhất** của MSPT, và spark sẽ tự tô các con số này thành xanh, vàng hoặc đỏ theo mức tốt xấu.

**Vì sao giá trị lớn nhất quan trọng**: các chỉ số trên đều là giá trị trung bình hoặc thống kê. Tài liệu chính thức trong hướng dẫn vòng tick lưu ý riêng: hoàn toàn có thể xảy ra tình huống "phần lớn tick chỉ dùng 20 mili giây (khỏe mạnh), thỉnh thoảng có một tick dùng 300 mili giây (không khỏe mạnh)", đó là **đỉnh lag (lag spike)** —— giá trị trung bình sẽ san phẳng đỉnh, nên chỉ nhìn TPS trung bình sẽ bỏ sót vấn đề.

### 2.2 /spark tps

```text
/spark tps
```

Nó in TPS và mức sử dụng CPU. Đây là **bước đầu tiên** của mỗi lần truy nguyên: trước hết xác nhận "rốt cuộc có lag không", rồi mới quyết định có cần dùng profiler hay không.

### 2.3 /spark health

Lệnh con `health` tạo báo cáo sức khỏe máy chủ, **nội dung gồm TPS, CPU, bộ nhớ và mức chiếm đĩa**. Cách dùng theo tài liệu chính thức:

```text
/spark health
/spark health upload
/spark health show
/spark health show --memory
/spark health show --network
```

| Lệnh | Hành vi |
| --- | --- |
| `/spark health` | Mở trong trình xem, **chế độ live dashboard, dữ liệu tự làm mới mỗi 10 giây** |
| `/spark health upload` | Tải lên một báo cáo sức khỏe **tĩnh**, không tự cập nhật |
| `/spark health show` | In thẳng báo cáo cơ bản ra console, không mở trình duyệt |
| `/spark health show --memory` | Thêm thông tin sử dụng bộ nhớ JVM |
| `/spark health show --network` | Thêm thông tin sử dụng mạng của hệ thống |

### 2.4 /spark ping

```text
/spark ping
/spark ping --player <username>
```

Không kèm tham số thì xem **ping trung bình của mọi người chơi** (độ trễ khứ hồi RTT); kèm `--player` thì xem ping hiện tại của một người chơi.

**Vì sao liệt kê riêng**: người chơi nói "lag", có thể do tick máy chủ chậm, cũng có thể chỉ là đường mạng từ họ đến phòng máy kém. Ping cao mà MSPT bình thường thì vấn đề nằm trên đường mạng, sửa cấu hình máy chủ không có tác dụng. Bước này dùng để **tách vấn đề mạng khỏi vấn đề tick**.

### 2.5 Xem thay đổi theo thời gian thế nào

Một lần `/spark tps` chỉ là ảnh chụp. Muốn xem xu hướng, dùng live dashboard của `/spark health`: tài liệu chính thức nói nó tự cập nhật mỗi 10 giây, nên có thể coi nó như một dòng thời gian, quan sát TPS, MSPT, CPU là **liên tục thấp** hay **tụt định kỳ**.

| Hình thái | Mô tả | Bước tiếp theo |
| --- | --- | --- |
| TPS liên tục thấp, MSPT liên tục cao | Luồng chính dài hạn không theo kịp | Lên profiler tìm điểm nóng luôn |
| TPS phần lớn thời gian bình thường, thỉnh thoảng tụt | Đỉnh lag | Dùng tickmonitor định vị, rồi lấy mẫu bằng `--only-ticks-over` |

:::note Hiểu "TPS thấp + MSPT bình thường" thế nào
Suy ra từ cơ chế vòng tick: nếu MSPT thực sự bình thường (mỗi tick đều hoàn thành trong ngân sách 50 mili giây), TPS không nên thấp lâu dài, vì thời gian ngủ giữa các tick sẽ bù lại nhịp. Nên khi xuất hiện "TPS thấp nhưng MSPT bình thường", thứ cần nghi không phải "một plugin nào đó viết chậm", mà là **yếu tố bên ngoài**: máy chủ bị tạm dừng (ví dụ stop-the-world dài, lưu thế giới, máy vật lý bị treo hoặc di chuyển), CPU của máy vật lý bị bóp xung hoặc bị người thuê khác chiếm, hoặc **bản thân dữ liệu là sai**.

Điểm cuối có căn cứ chính thức: chỉ số của spark đều lấy từ sự kiện máy chủ và API Java/hệ thống, tài liệu chính thức trong "About spark metrics" nói rõ, **khi chạy trong container thì chỉ số như CPU/bộ nhớ đôi khi bị báo sai** (các môi trường như Pterodactyl), "nếu trông không đúng, rất có thể dữ liệu thô mà spark lấy được là sai". Cần nói rõ: **"TPS thấp + MSPT bình thường chỉ ra yếu tố bên ngoài" là suy luận của bài này dựa trên cơ chế vòng tick, tài liệu chính thức không trực tiếp đưa ra kết luận này**, hãy phán đoán kết hợp với mức sử dụng CPU, tải máy vật lý và nhật ký GC.
:::

## 3. Phân tích lấy mẫu (profiler)

### 3.1 Lệnh và tùy chọn

Các lệnh và tùy chọn dưới đây đều từ trang Command Usage chính thức.

Thao tác cơ bản:

| Lệnh | Tác dụng |
| --- | --- |
| `/spark profiler start` | Bắt đầu lấy mẫu ở chế độ mặc định |
| `/spark profiler stop` | Dừng và xem kết quả (mặc định sẽ tải lên và cho liên kết) |
| `/spark profiler cancel` | Dừng lấy mẫu và **không tải lên** kết quả |
| `/spark profiler open` | Khi việc lấy mẫu đã chạy nền, mở thẳng trang xem mà không dừng nó |
| `/spark profiler info` | Xem trạng thái lấy mẫu hiện tại |

Tùy chọn thường dùng:

| Tùy chọn | Tác dụng |
| --- | --- |
| `--timeout <seconds>` | Tự dừng khi hết thời gian |
| `--only-ticks-over <milliseconds>` | **Chỉ ghi các tick dài hơn mốc đó**, dùng để bắt đỉnh |
| `--thread *` | Theo dõi mọi luồng |
| `--thread <thread name>` | Chỉ theo dõi luồng chỉ định |
| `--thread <pattern> --regex` | Khớp tên luồng cần theo dõi bằng regex |
| `--interval <milliseconds>` | Khoảng lấy mẫu, mặc định 4 |
| `--alloc` | Phân tích **cấp phát bộ nhớ** (áp lực bộ nhớ) thay vì CPU |
| `--alloc --alloc-live-only` | Khi phân tích cấp phát, chỉ giữ các đối tượng còn chưa được thu hồi khi kết thúc |
| `--alloc --interval <bytes>` | Độ mịn lấy mẫu của phân tích cấp phát, mặc định `524287` (khoảng 512 KB) |
| `--combine-all` | Gộp mọi luồng dưới một nút gốc |
| `--not-combined` | Không gộp các luồng trong thread pool lại với nhau |
| `--ignore-sleeping` | Chỉ ghi mẫu của các luồng không ở trạng thái sleeping |
| `--force-java-sampler` | Ép dùng bộ lấy mẫu Java thay vì bộ lấy mẫu async |
| `stop --comment <comment>` | Kèm ghi chú khi dừng, sẽ hiển thị trong trình xem |
| `stop --save-to-file` | Lưu kết quả thành tệp trong thư mục cấu hình, **không tải lên** |

Ví dụ kết hợp (cách viết trong hướng dẫn chính thức và tài liệu Paper):

```text
/spark profiler start --timeout 60
/spark profiler start --timeout 600
/spark profiler start --only-ticks-over 150
/spark profiler stop --comment "đường cơ sở trước khi sửa"
/spark profiler stop --save-to-file
```

:::note Về "/spark profiler không kèm tham số"
Tài liệu chính thức viết cách thao tác profiler thành các lệnh con rõ ràng `start`, `stop`, `cancel`, `open`, `info`, và không mô tả việc chạy `/spark profiler` mà không kèm tham số như một hành động độc lập. Ngoài ra tài liệu cấu hình chính thức nói **profiler chạy nền của spark mặc định bật** (mục cấu hình `backgroundProfiler` mặc định `true`), trong trường hợp đó bạn có thể dùng thẳng `/spark profiler stop` hoặc `/spark profiler open` để thao tác trên **lần đang chạy sẵn**. Vì vậy: **hãy viết theo lệnh con, đừng giả định hành vi của lệnh trần**.
:::

### 3.2 Quy trình chuẩn

```text
1. Xác nhận vấn đề đang xảy ra (tài liệu chính thức nhấn mạnh: profiling phải làm khi vấn đề đang xảy ra, nếu không sẽ không lấy được gì)
2. Bắt đầu lấy mẫu: /spark profiler start --timeout 60
3. Để máy chủ chạy dưới tải thật 30 đến 60 giây (người chơi trực tuyến, thao tác tái hiện)
4. Hết giờ tự dừng; thanh chat hoặc console sẽ hiện một liên kết spark.lucko.me/xxxx
5. Mở liên kết này trong trình duyệt
6. Xem "Server thread" (luồng chính máy chủ) trước, bấm từ nút rộng nhất đi xuống
```

Chọn thời lượng thế nào: nếu vấn đề **đang xảy ra ngay lúc này**, 30 đến 60 giây là đủ; nếu vấn đề **gián đoạn**, dùng `--timeout` dài hơn (ví dụ tài liệu chính thức của Paper đưa là `--timeout 600`, tức 10 phút), hoặc đổi sang cách bắt đỉnh ở mục 3.6.

### 3.3 Đọc báo cáo trong trình xem

Trang "Using the viewer" chính thức giải thích cấu trúc trình xem rất rõ.

**Luồng (Threads)**: mở báo cáo ra trước hết thấy một danh sách luồng. Có thể hiểu luồng như "người thợ làm một việc gì đó trong chương trình". Với máy chủ, **thường chỉ có duy nhất một thứ thực sự cần quan tâm là "Server thread"**, tức luồng chính phụ trách chạy game. Nút gốc (bản thân luồng) luôn hiển thị 100%, vì 100% thời gian lấy mẫu đều nằm trong luồng này.

**Khung gọi / nút (Call frames)**: mỗi nút hiển thị ba thông tin —— **tên**, **phần trăm trên tổng thời gian của luồng đó**, và **số mili giây (hiện khi rê chuột)**. Bấm vào nút sẽ mở rộng các nút con của nó.

Hình dạng điển hình khi mở rộng luồng máy chủ (ví dụ chính thức):

```text
Server thread
  java.lang.Thread.run()
    MinecraftServer.run()
      MinecraftServer.tick()        <- nơi thực sự làm việc
      Thread.sleep()                <- ngủ, khỏe mạnh, có thể bỏ qua
```

**Tỷ lệ ngủ là thứ đầu tiên cần xem**. Tài liệu chính thức trong hướng dẫn vòng tick đưa giá trị kinh nghiệm:

| Tỷ lệ ngủ (waitForNextTick / sleep) | Ý nghĩa |
| --- | --- |
| Càng cao càng tốt (ví dụ chính thức là 81%) | Máy chủ còn dư địa, chịu được tải đột biến |
| Thấp hơn 20% | Máy chủ đã rất bận, một số tick có thể đã lag |
| Thấp hơn 5% | Cơ bản có thể coi là đang lag, không còn dư địa |

**Nhưng tất cả đều là giá trị trung bình**, tài liệu chính thức nhấn mạnh: đỉnh sẽ bị san phẳng, nên "tỷ lệ ngủ cao" không bằng "không có đỉnh lag".

**Ba chế độ xem** (chuyển ở thanh công cụ trên cùng):

| Chế độ xem | Nội dung | Dùng khi nào |
| --- | --- | --- |
| All (mặc định) | Cây gọi đầy đủ, mở rộng được | Đi theo phần trăm xuống dưới |
| Flat | Trải **250 lời gọi phương thức chậm nhất** lên tầng trên | Nhanh chóng xem "tổng thể ai tốn thời gian nhất" |
| Sources | **Cho từng plugin/mod một cây riêng**, tầng trên là lời gọi do nguồn đó phát ra | Định vị thẳng "là plugin nào" |

Chế độ xem Flat còn hai chiều: Display có thể chọn **Top Down** (hướng bình thường, mở rộng xem lời gọi con) và **Bottom Up** (đảo ngược, mở rộng xem "ai đã gọi nó"); Sort có thể chọn **Total Time** (tổng thời gian gồm lời gọi con) và **Self Time** (thời gian của chính phương thức).

**Biểu đồ lửa (Flame Graph)**: có thể bấm biểu tượng ngọn lửa trên cùng, hoặc bấm chuột phải vào một nút chọn "View as Flame Graph". Tài liệu chính thức nói: **chiều rộng nút tương ứng tỷ lệ thời gian nó chiếm**; bấm vào nút có thể "lấy nét" nó và cho nó phủ kín trang. Câu "xem dải rộng nhất" thường nói chính là chỗ này.

**Ánh xạ giải xáo trộn (Deobfuscation)**: client và máy chủ của Minecraft đã xáo trộn tên lớp và tên phương thức. Trình xem **mặc định tự nhận diện nên áp bảng ánh xạ nào**; nếu nhận không đúng, dùng menu thả xuống ở góc trên bên phải trang để chọn tay.

**Đánh dấu (bookmark)**: giữ `alt` và bấm vào một lời gọi phương thức, hoặc bấm chuột phải chọn "Toggle bookmark", phương thức đó sẽ được tô sáng, và **bookmark sẽ được mã hóa vào URL** —— gửi liên kết có bookmark này cho người khác, khi họ mở sẽ tự mở rộng và tô sáng đúng vị trí đó. Đây là cách nhàn nhất để "chỉ cho người khác xem".

### 3.4 Luồng máy chủ và luồng bất đồng bộ

- **Server thread**: luồng chính chứa vòng tick, tuyệt đại đa số vấn đề hiệu năng nằm ở đây.
- **Luồng bất đồng bộ (async threads)**: tác vụ bất đồng bộ của plugin, lưu chunk, IO mạng (Netty), luồng GC, v.v. Chúng **không trực tiếp chiếm ngân sách tick**, nhưng nếu chúng tranh CPU, hoặc tranh khóa với luồng chính, vẫn sẽ ảnh hưởng luồng chính.

Mô tả của tài liệu chính thức về `--thread *` là "theo dõi **mọi** luồng", nghĩa là mặc định không phải mọi luồng đều được đưa vào lấy mẫu. **Nếu bạn nghi một plugin nào đó ném việc nặng sang luồng bất đồng bộ** (biểu hiện là CPU rất cao nhưng luồng máy chủ trông không bận), hãy dùng rõ `--thread *` lấy mẫu lại một lần.

### 3.5 Quy thời gian về một plugin thế nào

Đây là chỗ spark thực dụng nhất so với timings: **trong báo cáo sẽ xuất hiện tên gói của chính plugin**.

Ví dụ trong luồng máy chủ xuất hiện một dải rất rộng:

```text
com.example.shop.ShopManager.tickShops()
```

Thì plugin `com.example.shop` chính là đang làm việc đó. Cách phán đoán:

1. Trong chế độ xem All, đi theo phần trăm mở rộng xuống, đến khi thấy một tên gói "trông giống plugin" (thường là tên miền đảo, như `me.lucko.`, `com.example.`).
2. Hoặc chuyển thẳng sang **chế độ xem Sources**, nó sẽ **dựng cây riêng theo plugin/mod**, cây của ai "béo" nhất thì người đó là đối tượng tình nghi.
3. Nếu tầng trên cùng là phương thức của chính máy chủ (NMS), đừng vội kết luận: dùng **Bottom Up** hoặc mở rộng tiếp, xem **ai đã gọi nó** —— rất có thể là một plugin kích hoạt đoạn mã máy chủ này qua sự kiện hoặc API.

### 3.6 Chuyên bắt đỉnh lag: tickmonitor cộng only-ticks-over

Đỉnh sẽ bị giá trị trung bình che lấp, nên tài liệu chính thức đưa một bộ đòn phối hợp riêng.

Bước một, dùng `tickmonitor` tìm ra "chậm bao nhiêu thì tính là bất thường":

| Lệnh | Tác dụng |
| --- | --- |
| `/spark tickmonitor` | **Bật/tắt** hệ thống giám sát (chạy lại một lần là tắt) |
| `/spark tickmonitor --threshold <percent>` | Chỉ báo các tick **dài hơn thời lượng tick trung bình theo phần trăm chỉ định** |
| `/spark tickmonitor --threshold-tick <milliseconds>` | Chỉ báo các tick **vượt quá số mili giây chỉ định** |
| `/spark tickmonitor --without-gc` | Bật giám sát, nhưng tắt báo cáo về hoạt động GC |

Tài liệu chính thức nói: ngưỡng mặc định là **100%**, tức "tick này tốn thời gian gấp đôi trung bình" mới báo. Muốn nhạy hơn thì hạ xuống, ví dụ:

```text
/spark tickmonitor --threshold-tick 50
/spark tickmonitor --threshold-tick 70
```

Bước hai, dùng `--only-ticks-over` chỉ lấy mẫu các tick bất thường đó:

```text
/spark profiler start --only-ticks-over 150
```

Kinh nghiệm tài liệu chính thức đưa: ngưỡng **nên lấy trong khoảng 50 đến 100, nhưng nhất định phải nhỏ hơn thời lượng thật của những tick "lag" của bạn**, nếu không sẽ lọc mất chính đỉnh. Hành động lag trong ví dụ chính thức vượt quá 300 mili giây, nên lấy 150 mili giây cho "chắc ăn".

Báo cáo lấy mẫu theo cách này sẽ lọc bỏ mọi công việc game "bình thường", còn lại chính là đỉnh, điểm nóng sẽ rất rõ.

## 4. Các công cụ chẩn đoán khác

| Lệnh | Trả lời câu hỏi gì | Dùng khi nào |
| --- | --- | --- |
| `/spark tps` | Rốt cuộc bây giờ có lag không? TPS, MSPT, CPU là bao nhiêu? | Bước đầu tiên của mỗi lần truy nguyên; so sánh trước và sau khi đổi cấu hình |
| `/spark health` | Sức khỏe tổng thể thế nào (TPS, CPU, bộ nhớ, đĩa)? | Cần quan sát liên tục; live dashboard làm mới mỗi 10 giây |
| `/spark health upload` | Như trên, nhưng cần một ảnh chụp tĩnh chia sẻ được | Gửi cho người khác xem, lưu hồ sơ |
| `/spark health show` | Không mở trình duyệt, xem thẳng trong console | Liếc nhanh trong môi trường SSH; thêm `--memory` hoặc `--network` |
| `/spark ping` | Độ trễ người chơi có cao không? Là vấn đề mạng hay vấn đề tick? | Người chơi báo "lag", phân biệt hai loại này trước |
| `/spark profiler start` | Thời gian CPU dành cho những phương thức nào, những plugin nào? | Sau khi xác nhận "thực sự lag" |
| `/spark tickmonitor` | Những tick nào chậm bất thường? Bao lâu xuất hiện một lần? | Lag gián đoạn, đỉnh |
| `/spark gc` | Lịch sử GC thế nào? Dừng có thường xuyên không? | Nghi bộ nhớ hoặc GC gây lag |
| `/spark gcmonitor` | Theo dõi GC liên tục, báo ra khi xảy ra | Nghi đỉnh GC; bật một lần, tái hiện, rồi tắt một lần |
| `/spark heapsummary` | Đối tượng nào trong heap chiếm nhiều nhất? | Nghi rò rỉ bộ nhớ; kết quả được tải lên trình xem |
| `/spark heapdump` | Ảnh chụp heap đầy đủ (`.hprof`) | Cần công cụ ngoại tuyến như MAT để đào sâu; tệp rất lớn |
| `/spark activity` | Gần đây ai đã dùng spark, làm gì? | Khi nhiều người cùng quản, xác nhận có phải người khác đang lấy mẫu; `--page <n>` để chuyển trang |

Dưới đây bổ sung vài chi tiết dễ dùng sai.

### 4.1 Liên quan GC: /spark gc và /spark gcmonitor

`/spark gc` in **lịch sử GC (thu gom rác)** của máy chủ, trả lời "GC có đang làm chậm máy chủ không".

`/spark gcmonitor` **bật/tắt** hệ thống giám sát GC (chạy lại một lần là tắt). Giá trị của nó nằm ở việc **căn thẳng với lag**: bật giám sát trước, tái hiện một lần lag, rồi xem đúng thời điểm lag có hoạt động GC tương ứng không. Nếu thời gian khớp nhau, hướng đi chuyển sang bộ nhớ và tham số GC, thay vì đi tìm điểm nóng plugin.

### 4.2 Liên quan bộ nhớ: /spark heapsummary và /spark heapdump

Khác biệt giữa hai cái rất quan trọng:

| Lệnh | Sản phẩm | Mục đích |
| --- | --- | --- |
| `/spark heapsummary` | **Bản tóm tắt** heap, tải lên trình xem | Nhanh chóng xem "loại đối tượng nào chiếm bộ nhớ nhiều nhất", dùng để phán đoán có nghi rò rỉ không |
| `/spark heapdump` | Tệp `.hprof` đầy đủ, ghi ra đĩa | Cần công cụ chuyên nghiệp ngoại tuyến để đào sâu chuỗi tham chiếu đối tượng |

Tùy chọn của `/spark heapdump` là `--compress <type>`, loại nén hỗ trợ là `gzip`, `xz`, `lzma`. Tài liệu chính thức đánh dấu `--include-non-live` (gồm đối tượng không tiếp cận được) và `--run-gc-before` (khuyên JVM chạy GC trước khi tạo) **là đã lỗi thời (deprecated)**; `--run-gc-before` của `heapsummary` cũng đã lỗi thời.

:::warn heapdump rất nặng
Bản kết xuất heap đầy đủ sẽ **ghi một tệp có độ lớn tương đương kích thước heap ra đĩa**, và quá trình này khiến JVM dừng rõ rệt. Trên môi trường sản xuất đừng tiện tay chạy vào giờ cao điểm, hãy xác nhận dung lượng đĩa trước.
:::

## 5. Định vị vấn đề từ báo cáo

### 5.1 Bảng quyết định

Trước hết nói rõ một tiền đề: **tên phương thức thay đổi theo phiên bản, cách hiện thực máy chủ và bộ ánh xạ**. Ví dụ trong trình xem chính thức dùng các tên như `WorldServer.doTick()`, `WorldServer.tickEntities()` (tương ứng bộ ánh xạ cũ hơn); trên phiên bản khác bạn có thể thấy `ServerLevel.tick`, `Level.tickEntities`, v.v. **Đừng học thuộc tên, hãy xem hình dạng và phần trăm**, và dùng tính năng tự giải xáo trộn của trình xem.

| Hiện tượng trong báo cáo | Kết luận nhiều khả năng | Bước tiếp theo |
| --- | --- | --- |
| **Tên gói của một plugin** (như `com.example.shop`) chiếm tỷ lệ cao nhất trong luồng máy chủ | Plugin đó chính là nút thắt | Nâng cấp, tìm cái thay thế, giới hạn tần suất kích hoạt; gửi liên kết báo cáo cho tác giả |
| `Entity.tick` hoặc `Level.tickEntities` (dưới ánh xạ cũ là `WorldServer.tickEntities`) chiếm phần lớn | **Quá nhiều thực thể** | Xem [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag): dọn vật rơi, giới hạn sinh quái, hạ khoảng cách hiển thị và cấu hình liên quan thực thể |
| Lời gọi liên quan chunk (`ChunkMap`, `ChunkGenerator`, v.v.) chiếm phần lớn | **Sinh hoặc nạp chunk** | Tạo bản đồ trước, giảm việc sinh theo thời gian thực khi người chơi khám phá vùng mới |
| Tick của phễu và khối thực thể (`hopper`, `LevelChunk.tickBlockEntities`, v.v.) | **Tải redstone, phễu và khối thực thể** | Giới hạn tốc độ phễu, gộp farm, giảm máy redstone trong các chunk luôn được nạp |
| Trên dòng thời gian xuất hiện các lần dừng GC dài | **Bộ nhớ hoặc cấu hình GC** | Chỉnh kích thước heap và tham số GC; dùng `heapsummary` loại trừ rò rỉ trước |
| Chỉ **một thế giới hoặc một vùng** chậm | Farm hoặc công trình cụ thể | Định vị tọa độ, tháo gỡ tại chỗ, giới hạn, hoặc tách sang máy chủ riêng |
| Tỷ lệ `waitForNextTick` hoặc sleep rất thấp (dưới 5%) | Máy chủ tổng thể không còn dư địa | Không phải vấn đề một điểm, mà là thiếu năng lực: giảm tải hoặc nâng hiệu năng đơn nhân |
| Tỷ lệ sleep cao, nhưng người chơi vẫn báo lag | Giá trị trung bình che mất đỉnh | Đi theo mục 3.6: `tickmonitor` cộng `--only-ticks-over` |

### 5.2 Hai hiểu nhầm phổ biến khi quy nguyên nhân

**Hiểu nhầm một: thấy phương thức NMS là cho rằng "lỗi của máy chủ".** Các phương thức như `Entity.tick` là mã của máy chủ, nhưng **thứ kích hoạt nó có thể là plugin, hành vi người chơi hoặc thiết kế farm**; dùng chế độ xem Flat với **Bottom Up** để mở rộng, tìm "ai đã gọi nó".

**Hiểu nhầm hai: chỉ nhìn Total Time là kết luận.** Một phương thức có Total Time cao, có thể chỉ vì nó gọi nhiều phương thức con (bản thân nó là "vỏ"); chuyển sang sắp xếp theo **Self Time**, xem phương thức **thực sự dành thời gian cho chính mình**, đó mới là chỗ cần sửa.

### 5.3 Nhất định phải so sánh trước và sau

Một báo cáo chỉ nói được "bây giờ là như vậy", không nói được "sửa cái này có tác dụng không". Cách đúng:

```text
1. Lấy mẫu A: /spark profiler stop --comment "đường cơ sở trước khi sửa"
2. Sửa và chỉ sửa một chỗ
3. Lấy mẫu B trong điều kiện giống nhất có thể (số người chơi, khung giờ, có cùng khu vực không)
4. So sánh thay đổi phần trăm của cùng một nút trong hai báo cáo
5. Nếu không tốt hơn, quay lui thay đổi này, thử giả thuyết tiếp theo
```

Mỗi lần chỉ đổi một biến, nếu không không thể quy nguyên nhân. Khi so sánh hãy xem **thay đổi phần trăm của cùng một nút**, chứ không phải giá trị tuyệt đối —— vì tổng thời lượng và số người chơi của hai lần lấy mẫu có thể khác nhau.

## 6. Quy trình thực chiến và điểm cần chú ý

### 6.1 Bản thân việc lấy mẫu có chi phí

spark là trình phân tích kiểu lấy mẫu, chi phí nhỏ hơn nhiều so với chèn mã, nhưng **không phải bằng không**:

- Profiler chạy nền **mặc định bật**, khoảng lấy mẫu mặc định **10 mili giây** (mục cấu hình `backgroundProfilerInterval`).
- Bộ máy lấy mẫu mặc định là `async` (async-profiler), tài liệu chính thức nói nó chính xác hơn bộ máy Java/WarmRoast (không bị lệch do lấy mẫu ở điểm an toàn), **sẽ tự dùng khi hệ thống hỗ trợ**. Nó yêu cầu Linux hoặc macOS với kiến trúc x86_64/aarch64; trong container có thể còn phải bổ sung `libstdc++`.
- **Phân tích cấp phát (`--alloc`) và heapdump nặng hơn**: cái trước cần ký hiệu gỡ lỗi HotSpot (Java 11 trở lên thường có sẵn), cái sau phải ghi tệp lớn và làm JVM dừng.

:::warn Đừng để profiler chạy mãi
Lấy mẫu là để trả lời một câu hỏi cụ thể, lấy xong là dừng. Dùng `--timeout` để nó tự dừng là cách nhàn nhất. **Treo profiler dài hạn trên một máy chủ đã lag chỉ làm tình hình tệ hơn.**
:::

### 6.2 Chia sẻ báo cáo và quyền riêng tư

Tài liệu chính thức nói về "chia sẻ" theo hướng tích cực: báo cáo sẽ tự động được tải lên trình xem và cho bạn một liên kết, **liên kết này có thể tự do gửi cho người khác** —— gửi cho người giúp bạn truy nguyên, hoặc gửi cho tác giả plugin và mod, để chỉ ra vấn đề. Cơ chế bookmark còn mã hóa "tôi đang nói tới dòng này" vào URL.

Nhưng có mấy việc phải rõ:

1. **Tải lên là hành vi mặc định**. `/spark profiler stop` mặc định tải lên; chỉ `/spark profiler stop --save-to-file` là **lưu thành tệp trong thư mục cấu hình mà không tải lên**.
2. **Tài liệu chính thức không mô tả công tắc "đặt báo cáo thành riêng tư"**. Trong các trang đã đối chiếu cho bài này, không có bất kỳ giải thích nào về kiểm soát truy cập hay báo cáo riêng tư. Nên **hãy coi liên kết báo cáo như "ai có nó cũng mở được"**.
3. **Dữ liệu thô lấy được**. Trang "Raw spark data" chính thức nói: thêm `?raw=1` vào liên kết sẽ được metadata JSON; thậm chí có thể gửi thẳng yêu cầu tới `https://spark-usercontent.lucko.me/<code>` để lấy dữ liệu thô (loại `application/x-spark-sampler`, `application/x-spark-heap`, `application/x-spark-health`). Nghĩa là, **chuỗi mã ngắn đó bản thân nó chính là thông tin xác thực truy cập**.
4. **Metadata có chứa thông tin thân phận**. Metadata trong ví dụ chính thức có tên người dùng và UUID của người phát động. Trước khi dán liên kết lên chỗ công khai, hãy nghĩ tới điểm này.
5. **Mở cục bộ**: khi không muốn tải lên, có thể kéo tệp `.sparkprofile` hoặc `.sparkheap` vào vùng thả của trang trình xem, xem tại chỗ.
6. Nếu mang đi nhờ giúp, gợi ý của tài liệu chính thức Paper là **mang báo cáo spark tới kênh Discord `#paper-help` của họ** (đây là kênh do Paper chính thức đưa ra).

### 6.3 Danh sách một lần lấy mẫu đầy đủ

```text
Chuẩn bị
[ ] Xác nhận đã tải: /spark
[ ] Ghi lại trạng thái hiện tại: /spark tps
[ ] Xác nhận vấn đề đang xảy ra (nếu không sẽ không lấy được gì)
[ ] Xác nhận dung lượng đĩa đủ (nhất là khi có thể phải heapdump)
Lấy mẫu
[ ] Lag liên tục toàn bộ   -> /spark profiler start --timeout 60
[ ] Đỉnh gián đoạn   -> trước /spark tickmonitor tìm ngưỡng, rồi /spark profiler start --only-ticks-over <ms> --timeout <s>
[ ] Nghi luồng bất đồng bộ -> thêm --thread *; nghi cấp phát bộ nhớ -> thêm --alloc (chi phí lớn hơn)
[ ] Đừng để nó chạy vô thời hạn
Đọc báo cáo
[ ] Xem tỷ lệ sleep của Server thread trước
[ ] Bấm từ nút rộng nhất đi xuống, đi theo phần trăm
[ ] Dùng chế độ xem Sources quy về plugin cụ thể
[ ] Dùng Flat cộng Self Time tìm phương thức "thực sự tự tốn thời gian"
[ ] Dùng Bottom Up tìm "ai đã gọi phương thức chậm này"
[ ] Với tình huống đỉnh, xác nhận --only-ticks-over có hiệu lực (báo cáo không nên có nhiều tick bình thường)
Kết luận và kiểm chứng lại
[ ] Ghi kết luận: plugin nào, loại thực thể nào, khu vực nào, hay thiếu năng lực
[ ] Mỗi lần chỉ sửa một chỗ, sửa xong lấy mẫu lại trong điều kiện giống nhau
[ ] Dùng --comment để gắn nhãn báo cáo, giữ liên kết để so sánh
```

### 6.4 Khi nào không nên dùng spark

Khi người chơi chỉ có độ trễ cao, hãy `/spark ping` trước, đó có thể là vấn đề đường mạng; khi máy chủ không khởi động được hoặc sập, hãy xem nhật ký và báo cáo sự cố, profiler không giúp được; khi TPS bình thường mà người chơi vẫn nói "lag", hãy xác nhận trước có phải do render phía client, khoảng cách hiển thị hay dao động mạng, đừng mù quáng dùng profiler.

Đọc kèm: [Tối ưu hiệu năng](/tutorials/java/optimize) (cấu hình và tinh chỉnh JVM), [Lag do thực thể và vật rơi tích tụ](/tutorials/faq/entity-lag) (quá nhiều thực thể), [Gia cố an ninh hệ thống](/tutorials/ops/system-security) (gia cố phía máy chủ), [Sao lưu và khôi phục](/tutorials/java/backup) (chốt chặn trước khi sửa đổi).

> Lệnh và tùy chọn của spark lấy tài liệu chính thức của nó làm chuẩn; các lệnh khả dụng hơi khác nhau giữa các nền tảng.
