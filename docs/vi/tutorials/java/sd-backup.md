---
title: "[Loạt bài kỹ thuật redstone] Bảo vệ bản lưu"
slug: sd-backup
cat: java
level: 3
order: 33
minutes: 20
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, kỹ thuật redstone, sao lưu, mcdr, ledger, sao lưu ngoài trạm]
updated: 2026-10-08
draft: false
---

Thế giới của máy chủ kỹ thuật redstone **bị ghi đè liên tục trên quy mô lớn**: máy vừa chạy, địa hình, khối, thực thể đều biến đổi từng mảng. Một lần thao tác nhầm, một lần sập làm hỏng bản lưu, cái giá thường không phải "mất vài phút tiến độ" mà là "cả công trình làm trắng". Vì thế trên máy chủ kỹ thuật redstone, bảo vệ bản lưu không phải việc tiện tay làm, mà là một mắt phải được thiết kế vào quy trình.

Nguyên tắc sao lưu chung —— sao lưu cái gì, bảo đảm nhất quán thế nào, chính sách lưu giữ, quy trình khôi phục —— đã viết trong [Sao lưu và khôi phục](/tutorials/java/backup), bài này không lặp lại. Ở đây chỉ nói ba việc thêm vào trong bối cảnh kỹ thuật redstone: **biến sao lưu thành quy trình bằng plugin sao lưu của MCDR**, **dùng `Ledger` tìm rõ đã xảy ra chuyện gì**, **đặt ít nhất một bản sao lưu ra ngoài máy**.

## Một, vì sao máy chủ kỹ thuật redstone phải sao lưu dày hơn

| Đặc điểm của máy chủ kỹ thuật redstone | Yêu cầu với sao lưu |
| --- | --- |
| Máy vừa chạy là thế giới biến đổi cực lớn: thiết bị xóa sạch cả vùng, nông trại chạy liên tục, chỉ trong thời gian rất ngắn đã đổi được mảng lớn địa hình và thực thể | Khoảng cách sao lưu phải ngắn hơn tổn thất lớn nhất bạn chấp nhận được, đừng trông vào một bản sao lưu qua đêm để đỡ một công trình lớn |
| Quay lui là liên đới: khôi phục cả bản lưu sẽ xóa luôn tiến độ của **tất cả** người chơi trong cùng khung thời gian | Khi có sự cố trước hết cố sửa cục bộ, chỉ khi sửa không được mới khôi phục cả bản lưu |
| Công trình lớn đầu tư rất cao: từ chuẩn bị vật liệu, dựng đến gỡ lỗi, máy là "lấy thời gian đổi sản lượng" | Sao lưu giữ lại không phải vài ô khối, mà là khoảng thời gian đã bỏ vào đó |
| Bản lưu và bản sao lưu mặc định nằm trên cùng một máy, cùng một ổ đĩa | Ngoài sao lưu cục bộ, bắt buộc phải có một bản rời khỏi máy này |

:::warn Bản sao lưu chưa từng kiểm chứng khôi phục thì không tính là sao lưu
Câu này đặc biệt đúng với máy chủ kỹ thuật redstone: máy càng mạnh, quay lui càng đắt. Đợi đến đúng ngày xảy ra sự cố mới phát hiện bản sao lưu chưa từng thành công, tổn thất không cứu được. Cách diễn tập khôi phục xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::

## Hai, biến sao lưu thành quy trình bằng plugin sao lưu của MCDR

MCDR là trình quản lý Python **độc lập bên ngoài tiến trình máy chủ**, máy chủ sập nó vẫn còn, nên nó tự khởi động lại máy chủ được, cũng chạy được sao lưu khi sập —— đây chính là vị trí mà sao lưu nên ở. Cách cài đặt, cơ chế plugin và lệnh xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr).

Các tên thư mục plugin sao lưu **thực sự tồn tại** trong danh mục plugin chính thức của MCDR có thể chia theo hướng dùng thành bốn nhóm:

| Hướng | Tên thư mục plugin | Công dụng đại khái |
| --- | --- | --- |
| Sao lưu toàn bản lưu | `prime_backup`, `extra_prime_backup`, `quick_backup_multi`, `better_backup`, `permanent_backup`, `zip_backup`, `smart_backup`, `cushion_of_backup` | Sao lưu và lưu giữ theo đơn vị là cả bản lưu hoặc cả thư mục máy chủ |
| Sao lưu định kỳ | `timed_quick_backup_multi`, `auto_backup` | Tự kích hoạt theo khoảng thời gian, không phụ thuộc việc bạn nhớ chạy tay |
| Sao lưu theo chunk và theo vùng | `chunk_backup`, `region_backup` | Theo đơn vị chunk hoặc vùng, độ mịn hơn cả bản lưu |
| Sao lưu ngoài trạm | `ftp_backup`, `baidu_netdisk_backup` | Đưa bản sao lưu tới lưu trữ từ xa |

Trước và sau khi chọn plugin có ba việc phải xác nhận:

1. **Cách chia nhóm chỉ là hướng nhìn ra từ tên thư mục plugin**, chức năng cụ thể, mục cấu hình và quy tắc lưu giữ lấy hướng dẫn của từng plugin làm chuẩn; cài xong trước hết chạy thật một lượt "sao lưu → khôi phục" trong môi trường kiểm thử.
2. **Plugin không giải quyết nhất quán thay bạn**: dùng cái nào cũng phải xác nhận nó không chép phải bản lưu ghi dở, nguyên tắc xem [Sao lưu và khôi phục](/tutorials/java/backup).
3. **Đừng để sản phẩm sao lưu trên cùng một ổ đĩa**, nếu không những vấn đề nêu ở mục bốn và mục sáu vẫn xảy ra như thường.

Với máy chủ kỹ thuật redstone, tổ hợp khá thực dụng là "**một bản sao lưu toàn bộ định kỳ + một bản sao lưu theo chunk**": cái trước lo đỡ đáy, cái sau lo thu hẹp phạm vi quay lui xuống một vùng. Khi cài cả hai chú ý để chúng lệch giờ nhau, tránh đọc ghi đĩa cùng lúc.

## Ba, `Ledger`: trước hết tìm rõ "đã xảy ra chuyện gì"

`Ledger` là mod nhật ký phía máy chủ (loaders: `fabric`, `quilt`; phiên bản hỗ trợ `1.17-rc1` đến `26.3`).

Ở phía plugin, công cụ nổi tiếng nhất cùng loại là **CoreProtect** (loaders: `bukkit`, `folia`, `paper`, `purpur`, `spigot`; phiên bản hỗ trợ `1.14.1` đến `26.2`; nó là công cụ ghi dữ liệu và chống phá hoại phía plugin, hỗ trợ quay lui và khôi phục). `Ledger` có thể hiểu là **bản tương đương CoreProtect** trong hệ sinh thái Fabric: cũng ghi thao tác trên khối và vật chứa, cũng tra ngược được theo thời gian và vị trí; khác biệt là CoreProtect chạy phía plugin và có sẵn quay lui, còn `Ledger` chỉ lo ghi và truy vấn.

Nó và sao lưu trả lời hai câu hỏi khác nhau, không thể thay thế nhau:

| Mục so sánh | `Ledger` | Sao lưu |
| --- | --- | --- |
| Câu hỏi được trả lời | Đã xảy ra gì, ai làm, lúc nào, ảnh hưởng chỗ nào | Làm sao đưa cả thế giới lùi về một thời điểm |
| Hình thái dữ liệu | Bản ghi sự kiện | Bản sao của thư mục bản lưu |
| Độ mịn | Cấp sự kiện, tra được đến tận vị trí và vật chứa cụ thể | Cả bản lưu (cấp thư mục) |
| Khi có sự cố làm gì trước | Định vị và quy trách nhiệm, từ đó phán đoán "có thể chỉ quay lui hay sửa một mảng nhỏ không" | Đỡ đáy khi không định vị được: khôi phục cả bản lưu |
| Cái giá | Bản ghi tăng liên tục, cần bảo trì | Chiếm đĩa, quay lui sẽ xóa hết tiến độ cùng kỳ |

Vài lưu ý khi dùng:

- Định vị của `Ledger` là **ghi chép**, không phải phương tiện khôi phục. Nó cho bạn "phạm vi và người chịu trách nhiệm", còn thực sự đưa thế giới trở lại vẫn phải dựa vào sửa tay hoặc sao lưu.
- Lượng bản ghi cần bảo trì lâu dài: trong danh mục plugin chính thức của MCDR có `ledger_cleaner`, tác dụng chính là dọn dữ liệu của `Ledger`. Điều này cũng cho thấy dữ liệu của nó không thể để đó mặc kệ.
- `Ledger` là mod phía máy chủ, cần máy chủ Fabric. Nửa còn lại của chống phá hoại (quyền hạn và biện pháp thời gian thực) xem [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

**Thứ tự đúng của hai thứ là**: sau sự cố trước hết dùng `Ledger` thu phạm vi về một mảng nhỏ, sửa cục bộ được thì sửa cục bộ; không định vị được, hoặc phạm vi phá hoại quá lớn, mới dùng sao lưu khôi phục cả bản lưu. Làm ngược lại, bạn sẽ vì hành vi của một người mà xóa sạch tiến độ của cả máy chủ.

## Bốn, sao lưu ngoài trạm: bước này không được bỏ

Bản sao lưu cục bộ và máy chủ ở cùng một máy, nên những tình huống dưới đây sẽ **mang đi cả bản lưu và toàn bộ bản sao lưu của bạn cùng lúc**:

| Tình huống | Kết quả |
| --- | --- |
| Máy (hoặc ổ đĩa) hỏng | Bản lưu và bản sao lưu cục bộ mất cùng nhau |
| Hệ điều hành bị cài lại, ổ đĩa bị format, thư mục bị xóa nhầm | Như trên |
| Máy bị nhà cung cấp thu hồi, phòng máy gặp sự cố | Có thể bạn đến cả máy cũng không lấy lại được |

Ở tầng plugin đã có sẵn hướng đi ngoài trạm: `ftp_backup` và `baidu_netdisk_backup` đều là plugin **đưa bản sao lưu tới nơi xa**, nghĩa là sao lưu ngoài trạm không cần bạn viết script từ số không.

Nhưng "tải lên được" không có nghĩa là "lấy về được". Thông tin xác thực phía xa có hết hạn không, đường dẫn còn không, bản sao lưu có đầy đủ không, có khôi phục được không, đều phải kiểm chứng định kỳ; cách làm và bảo trì chung của sao lưu ngoài trạm xem [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup). Ngoài ra chú ý: sao lưu ngoài trạm truyền qua **cùng một đường truyền**, nếu bản thân sao lưu đã thất bại vì đầy đĩa hay vấn đề quyền, phía xa chỉ lặng lẽ thiếu đi một bản, nên nhật ký sao lưu cục bộ cũng phải xem.

## Năm, một danh sách kiểm tra làm theo được ngay

| Thời điểm | Hành động |
| --- | --- |
| Trước khi mở máy chủ | Cài một plugin sao lưu toàn bộ định kỳ, trỏ thư mục sao lưu sang ổ đĩa khác |
| Trước khi khởi công công trình lớn | Đánh tay một bản sao lưu toàn bộ, ghi lại thời điểm (mốc neo khi quay lui) |
| Trước mỗi lần đổi cấu hình hoặc thêm mod | Sao lưu cấu hình và bản lưu, đổi xong quan sát trước rồi mới tiếp |
| Hằng ngày | Xác nhận sản phẩm sao lưu thực sự được tạo (xem thư mục và nhật ký), chứ không chỉ xem plugin tải thành công |
| Định kỳ | Đưa một bản sao lưu tới nơi xa; rút một bản giải nén và khôi phục trong môi trường kiểm thử |
| Khi có sự cố | Trước hết tra `Ledger` định vị phạm vi, sửa cục bộ được thì sửa, không sửa được mới khôi phục cả bản lưu |

## Sáu, đặt sao lưu ở đâu: ba vị trí

| Vị trí | Chặn được gì | Không chặn được gì |
| --- | --- | --- |
| Cạnh bản lưu hoặc cùng ổ đĩa | Xóa nhầm tệp do lỡ tay, một bản sao lưu bị hỏng | Ổ đĩa hỏng, format, cả thư mục bị xóa nhầm |
| Ổ đĩa khác trên cùng máy | Một ổ đĩa hỏng | Cài lại hệ điều hành, máy hỏng toàn bộ, máy bị thu hồi |
| Nơi xa ngoài máy | Máy hỏng toàn bộ, format nhầm, máy bị thu hồi | Không có điểm yếu rõ rệt, nhưng điều kiện là bạn đã kiểm chứng lấy về được |

Những lỗi thường gặp nằm ngay trong bảng này:

- Thư mục sao lưu đặt bên trong `world/`, khi quay lui bị ghi đè luôn cả bản sao lưu;
- Sao lưu và bản lưu trên cùng ổ đĩa, ổ hỏng là mất cả hai;
- Chỉ giữ bản mới nhất, gặp tình huống "bản lưu đã hỏng nhưng chưa phát hiện" là hết cứu;
- Cài plugin sao lưu nhưng chưa từng xem nhật ký của nó, đến ngày xảy ra sự cố mới phát hiện nó thất bại suốt.

## Bảy, sao lưu không đứng một mình: bộ ba

Máy càng mạnh, càng phải đưa **sao lưu + quyền hạn + quy tắc chống sập** ba thứ lên cùng lúc. Mỗi thứ lo một khâu, thiếu khâu nào cũng sẽ lộ ra vào ngày xảy ra sự cố:

| Khâu | Giải quyết gì | Xem ở đâu |
| --- | --- | --- |
| Sao lưu | Đưa thế giới lùi lại sau sự cố | Bài này và [Sao lưu và khôi phục](/tutorials/java/backup) |
| Quyền hạn và danh sách trắng | Khiến người không nên động tay thì không động tay được | [Chống gian lận và chống phá hoại](/tutorials/java/anticheat) |
| Quy tắc chống sập | Khi làm thao tác kiểu update suppression, không để máy chủ sập thẳng | [Carpet và các gói phụ trợ](/tutorials/java/sd-carpet) |

## Bước tiếp theo

Máy càng mạnh, càng phải coi sao lưu là một phần của quy trình: kiểm soát rủi ro của những thao tác có sức phá hoại cao như máy nuốt thế giới và cắt cổng xem [Máy nuốt thế giới và cắt cổng](/tutorials/java/sd-machine). Cách cài và cơ chế plugin của bản thân MCDR xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr); nguyên tắc chung về nhất quán, chính sách lưu giữ và diễn tập khôi phục xem [Sao lưu và khôi phục](/tutorials/java/backup).

---

> Tên thư mục plugin và phiên bản hỗ trợ mod trong bài đều lấy từ danh mục plugin chính thức của MCDR và dữ liệu chính thức của Modrinth; chức năng và cấu hình cụ thể của từng plugin lấy hướng dẫn của chính nó làm chuẩn.
