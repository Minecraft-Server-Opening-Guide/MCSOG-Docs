---
title: "[JAVA] Câu hỏi thường gặp"
slug: faq-java
cat: faq
level: 1
order: 1
minutes: 12
tags: [java, câu hỏi thường gặp, kiểm tra, báo lỗi]
updated: 2026-10-04
draft: false
---

Ở đây tổng hợp các lỗi và cái bẫy phổ biến nhất ở từng khâu khi mở máy chủ Java Edition, **tra thẳng theo hiện tượng**. Mỗi mục đều ghi chương mục nguồn, cần chi tiết thì nhấp vào xem.

## Một, Không khởi động lên

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Khởi động xong **thoát ngay**, nhật ký báo EULA | Chưa đồng ý thỏa thuận | Đổi `eula.txt` thành `eula=true` | [Mở máy chủ](/tutorials/java/start) |
| `UnsupportedClassVersionError ... class file version 65.0` | **Sai phiên bản Java** (65 = Java 21) | Đổi sang Java tương ứng theo bảng đối chiếu phiên bản | [Chuẩn bị môi trường](/tutorials/java/environment) |
| `'java' 不是内部或外部命令` / `java: command not found` | Chưa cài Java, hoặc `PATH` chưa cấu hình đúng, hoặc **chưa mở lại cửa sổ** | Kiểm tra `PATH`, **mở mới** một terminal rồi thử lại | [Chuẩn bị môi trường](/tutorials/java/environment) |
| Nháy đúp script khởi động **cửa sổ lóe lên rồi mất** | Báo lỗi xong cửa sổ tự đóng | Thêm `pause` vào cuối script, hoặc chạy trong terminal | [Mở máy chủ](/tutorials/java/start) |
| `Address already in use` | 25565 bị chiếm | `netstat -ano \| findstr :25565` (Win) / `ss -tlnp \| grep 25565` (Linux) tìm PID rồi kết thúc | [Chuẩn bị môi trường](/tutorials/java/environment) |
| `Could not reserve enough space for object heap` | `-Xmx` vượt quá bộ nhớ khả dụng | Giảm `-Xmx` | [Chuẩn bị môi trường](/tutorials/java/environment) |
| Lần khởi động đầu kẹt ở `Downloading mojang_x.x.x.jar` | Đang tải tệp chạy | Kiên nhẫn chờ; mạng trong nước kẹt lâu dài thì cần tự chuẩn bị phương án tăng tốc | [Mở máy chủ](/tutorials/java/start) |

## Hai, Người khác không kết nối được

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Tự mình `telnet` thông, người khác không kết nối được | **Chỉ cấu hình tường lửa máy cục bộ, nhóm bảo mật cloud chưa mở** | Vào console cloud bổ sung quy tắc vào `TCP 25565` | [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) |
| Kiểm tra cổng hiển thị đóng | Khi máy chủ **chưa khởi động** cổng sẽ không lắng nghe | Chạy máy chủ lên trước rồi mới đo | [Chuẩn bị môi trường](/tutorials/java/environment) |
| Router ở nhà đã ánh xạ mà vẫn không thông | Khả năng cao **không có IPv4 công cộng** | So sánh IP cổng WAN của router với "IP công cộng của tôi"; không khớp thì cần xin/đổi sang máy chủ cloud/xuyên thấu mạng nội bộ | [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) |
| **Người chơi trên điện thoại không kết nối được** | Chỉ mở TCP | Bedrock Edition/chơi chéo cần mở thêm **UDP 19132** | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |

## Ba, Đường dẫn và quyền

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Plugin/mod báo lỗi đường dẫn kỳ lạ | Thư mục có **tiếng Trung hoặc dấu cách** | Chuyển đến đường dẫn ngắn thuần tiếng Anh kiểu `C:\mcserver` hoặc `/opt/mcserver` | [Cấu trúc máy chủ](/tutorials/java/structure) |
| Trên Linux báo `Permission denied` | Máy chủ do root tạo, người dùng thường không có quyền ghi | `sudo chown -R mcserver:mcserver /opt/mcserver` | [Chuẩn bị môi trường](/tutorials/java/environment) |
| Sửa tệp thế giới xong bản lưu hỏng | Tự sửa tệp trong `region/` | **Đừng tự sửa** tệp thế giới, dùng công cụ như WorldEdit, hoặc dừng máy chủ trước | [Cấu trúc máy chủ](/tutorials/java/structure) |

## Bốn, Liên quan đến plugin

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Trong `/plugins` **màu đỏ** | Nạp thất bại (máy chủ nhận ra nhưng chưa nạp lên) | Vào console xem báo lỗi, thường là thiếu phần phụ thuộc hoặc lệch phiên bản | [Nhập môn plugin](/tutorials/java/plugins) |
| Trong `/plugins` **đến màu đỏ cũng không có** | Máy chủ **hoàn toàn không nhận ra** nó là plugin | Kiểm tra xem có đặt vào `plugins/` không, đuôi có phải `.jar` không, có tải nhầm loại lõi không | [Nhập môn plugin](/tutorials/java/plugins) |
| Plugin báo lỗi YAML | **Dùng Tab để thụt lề** (YAML chỉ cho phép dấu cách) | Đổi sang thụt lề bằng dấu cách | [Nhập môn plugin](/tutorials/java/plugins) |
| Tiếng Trung trong cấu hình thành ký tự lỗi | Mã hóa tệp không phải UTF-8 | Dùng VS Code lưu thành **UTF-8** | [Nhập môn plugin](/tutorials/java/plugins) |
| Sửa cấu hình xong không có hiệu lực | Cần nạp lại | `/插件名 reload`; cái không hỗ trợ thì chỉ có thể khởi động lại (**đừng dùng `/reload` bản gốc**) | [Nhập môn plugin](/tutorials/java/plugins) |
| Máy chủ đột nhiên lag/báo lỗi kỳ lạ | Plugin mới cài | **Tắt plugin mới cài gần nhất trước** rồi bật lần lượt để định vị | [Nhập môn plugin](/tutorials/java/plugins) |

## Năm, Kỹ thuật redstone và cơ chế

| Hiện tượng | Nguyên nhân | Xử lý | Nguồn |
| --- | --- | --- | --- |
| Máy redstone tự nhiên mất tác dụng | **Hệ Paper đã sửa hành vi bản gốc** | Kỹ thuật redstone hãy dùng **Fabric hoặc Leaves**; hệ Paper chỉ làm được kỹ thuật redstone nhẹ và phải chỉnh cấu hình | [Kỹ thuật redstone và redstone](/tutorials/java/redstone) |
| Thiết bị hồi truyền ngọc Ender không hoạt động | Độ trễ gỡ nạp chunk | Trong `paper-world-defaults.yml` đặt `delay-chunk-unloads-by: 0s` | [Kỹ thuật redstone và redstone](/tutorials/java/redstone) |
| Thiết bị thực thể dày đặc không có hiệu lực | Giới hạn va chạm thực thể | Chỉnh `max-entity-collisions` (**cái giá là hiệu năng**) | [Kỹ thuật redstone và redstone](/tutorials/java/redstone) |

## Sáu, Hiệu năng

| Hiện tượng | Xử lý | Nguồn |
| --- | --- | --- |
| TPS tụt, tổng thể lag | Trước tiên chỉnh **`simulation-distance`** (tiết kiệm hơn chỉnh khoảng cách nhìn nhiều và không ảnh hưởng cảm giác) | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Không biết lag ở đâu | Dùng **spark** tạo biểu đồ flame, xem dải nào rộng nhất | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Người chơi chạy bản đồ là lag | Làm **sinh trước thế giới** (kiểu Chunky) | [Tối ưu hiệu năng](/tutorials/java/optimize) |
| Cấp rất nhiều bộ nhớ mà vẫn lag | `-Xmx` quá lớn sẽ khiến GC dừng lâu hơn | Dưới 10 người thường 4~6GB là đủ | [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol) |
| Đơn nhân rất yếu | Chỉnh tham số không cứu được, **nên đổi máy đơn nhân mạnh hơn** | [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol) |

## Bảy, Dữ liệu và an ninh

| Hiện tượng | Nguyên nhân / xử lý | Nguồn |
| --- | --- | --- |
| Bản lưu hỏng / dữ liệu quay lui | Do đóng máy chủ bằng cách bấm dấu X cửa sổ | Đóng máy chủ hãy dùng `stop`; tư thế chuẩn: `save-all` → `save-off` → sao lưu → `stop` | [Các lệnh máy chủ thường dùng](/tutorials/java/commands) |
| Sao lưu ra thì hỏng | Vừa ghi vừa chép | Sao lưu nóng cần `save-off` trước; hoặc dừng máy chủ rồi sao lưu | [Sao lưu và khôi phục](/tutorials/java/backup) |
| Bị phá mà không tra được là ai | **Chưa cài plugin ghi chép** | Cài sớm loại CoreProtect, nó chỉ ghi được **những việc sau khi cài** | [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) |
| Cài chống gian lận lại làm oan người chơi | Hình phạt bật quá sớm | Chạy **chế độ ghi chép** quan sát trước; thà bỏ sót còn hơn làm oan | [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) |
| Rủi ro của chế độ ngoại tuyến | Ai cũng có thể mạo danh ID, cấm có thể bị vượt qua | Máy chủ công khai **không khuyến nghị** tắt xác minh bản quyền | [Cấu hình máy chủ](/tutorials/java/config) |
| Nhà cung cấp bỏ trốn / phòng máy có sự cố | Dữ liệu chỉ tồn tại trên một máy | **Ít nhất định kỳ tải bản sao lưu về nơi khác** | [Sao lưu và khôi phục](/tutorials/java/backup) |

## Tám, Chơi chéo và proxy

| Hiện tượng | Nguyên nhân | Nguồn |
| --- | --- | --- |
| Người chơi Bedrock Edition không vào được | Chưa cài Geyser, hoặc chưa mở UDP | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |
| Người chơi Java muốn vào máy chủ Bedrock Edition | **Không làm được**: Geyser là một chiều | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |
| Nền tảng máy chơi game (Xbox/PS/Switch) không vào được | Chúng không nhập IP trực tiếp được | [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile) |
| Qua máy chủ khác xong lệnh không phản ứng | Plugin cài nhầm vị trí (phía proxy vs máy chủ con) | [Phía chuyển máy chủ](/tutorials/java/proxy) |
| Lo khóa chuyển tiếp bị lộ | Lộ = ai cũng có thể giả mạo danh tính | Khóa phải giữ bí mật, cổng máy chủ con **không được để lộ ra công cộng** | [Phía chuyển máy chủ](/tutorials/java/proxy) |

> Không tìm thấy vấn đề của bạn? Liên quan Bedrock Edition xem [[BE] Câu hỏi thường gặp](/tutorials/faq/faq-be); vấn đề ở mức vận hành xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java).
