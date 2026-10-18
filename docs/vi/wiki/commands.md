---
title: Tra cứu nhanh lệnh thường dùng (Java / Bedrock / tầng quản lý)
slug: commands
cat: wiki
level: 2
order: 3
minutes: 12
tags: [lệnh, tra cứu nhanh, java, bedrock, mcdr, console]
updated: 2026-10-04
draft: false
---

Trang này gom ba loại lệnh lại để tra cứu: **lệnh máy chủ Java Edition**, **lệnh Bedrock (BDS và lõi bên thứ ba)**, và **tầng quản lý bao ngoài máy chủ** (MCDR, console của panel, RCON).

Cột "Quyền" trong bảng ghi **mặc định của bản gốc**: Java Edition theo cấp OP, Bedrock theo tư cách người điều hành và công tắc "gian lận". Sau khi cài plugin quyền (như LuckPerms), quyền thực tế do nút quyền quyết định, có thể rộng hơn hoặc chặt hơn bản gốc.

> Lệnh có dùng được hay không, cấp quyền là bao nhiêu, **thay đổi theo phiên bản trò chơi và loại lõi**: cùng một tên có thể không tồn tại trên lõi khác, cũng có thể bị lõi viết lại. Trước khi ra lệnh vui lòng lấy tài liệu chính thức của máy chủ và phiên bản trò chơi bạn thực tế đang chạy làm chuẩn.

:::note Ba câu ghi nhớ trước
- **Trong console thường không cần gõ `/`**, trong ô chat trong game nhất định phải gõ `/`.
- **Tư cách console tương đương quyền cao nhất**, trong game phải xem bạn có OP hoặc nút quyền tương ứng hay không.
- **Java Edition và Bedrock là hai bộ lệnh khác nhau**: tên giống nhau không có nghĩa hành vi giống nhau, `save-all` trên Bedrock hoàn toàn không có tương đương.
:::

## 1. Trước khi đọc bảng: ba quy tắc

| Quy tắc | Giải thích |
| --- | --- |
| Liên quan phiên bản | Lệnh được thêm bớt theo phiên bản (ví dụ các lệnh mới như `/tick` chỉ có ở phiên bản khá mới), cách viết trong hướng dẫn cũ không nhất định còn dùng được |
| Liên quan lõi | Các lệnh như `plugins`, `version`, `tps`, `restart` **không phải lệnh bản gốc**, mà do lõi họ Spigot / Paper cung cấp; máy chủ bản gốc không có |
| Liên quan plugin | Sau khi cài plugin quyền, nút quyền bản gốc có thể bị viết lại; sau khi cài plugin bí danh lệnh, tên lệnh có thể bị thay thế |

Cách nhanh nhất để biết một lệnh có tồn tại hay không là **gõ `/` trong game rồi xem danh sách gợi ý Tab**, hoặc gõ vài chữ cái đầu trong console xem gợi ý. Không có trong gợi ý tức là lõi này không đăng ký lệnh đó.

## 2. Java Edition: vòng đời và bản lưu

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `stop` | Tắt máy chủ an toàn: lưu trước rồi thoát | OP 4 / console | **Tắt máy chủ chỉ dùng nó**, đừng đóng cửa sổ hay kill tiến trình |
| `save-all` | Lưu ngay toàn bộ dữ liệu thế giới | OP 4 / console | Có thể thêm tham số `flush` buộc ghi xuống ổ đĩa |
| `save-off` | Tắt tự động lưu | OP 4 / console | Tắt trước khi sao lưu, tránh sao lưu phải bản lưu ghi dở |
| `save-on` | Khôi phục tự động lưu | OP 4 / console | Sao lưu xong nhớ bật lại |
| `reload` | Nạp lại dữ liệu trong gói dữ liệu đang bật | OP 2 (có thể khác giữa các phiên bản) | **Không phải khởi động lại, cũng không nạp lại cấu hình máy chủ**, xem cảnh báo bên dưới |
| `restart` | Khởi động lại máy chủ | Tùy lõi | Họ Spigot / Paper cung cấp; bản gốc không có lệnh này |

Thứ tự tắt máy chủ chuẩn là `save-all` → `save-off` → sao lưu → `stop`. Khi tiến trình đã thoát thì không cần `save-on` nữa.

:::warn `/reload` không phải "nạp lại tất cả", còn có thể làm hỏng plugin
`/reload` của Java Edition chỉ nạp lại **dữ liệu trong gói dữ liệu đang bật**. Nó **không**:

- đọc lại `server.properties` (đổi cổng, đổi độ khó phải khởi động lại mới có hiệu lực);
- khởi động lại tiến trình máy chủ, cũng không nạp lại mã plugin;
- đưa nội dung đăng ký của plugin về trạng thái sạch.

Ngược lại, nó **có thể** làm trạng thái plugin rối loạn: bảng điểm, listener, bộ đệm, lệnh đã đăng ký đều có thể còn lại nửa mới nửa cũ, triệu chứng là "nạp lại xong vài chức năng thành kỳ lạ". Việc nào giải quyết được bằng `/tên-plugin reload`, `/datapack enable`, `/datapack disable` của chính plugin thì đừng dùng `/reload` bản gốc; khi thay đổi lớn hoặc không rõ ảnh hưởng, hãy chọn cửa sổ bảo trì để khởi động lại.

Lệnh cùng tên của Bedrock có phạm vi hẹp hơn (nạp lại hàm và script trong gói hành vi), `reload` của cả hai phiên bản đều **không** phải nút "làm mới cấu hình máy chủ".
:::

## 3. Java Edition: người chơi, cấm và danh sách trắng

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `list` | Liệt kê người chơi đang trực tuyến | Mọi người | Lệnh "trong máy chủ có ai không" thường dùng nhất |
| `kick <người chơi> [lý do]` | Đá người chơi | OP 3 / console | Người bị đá **vẫn vào lại được** |
| `ban <người chơi> [lý do]` | Cấm người chơi | OP 3 / console | Không gỡ cấm thì không vào được |
| `pardon <người chơi>` | Gỡ cấm người chơi | OP 3 / console | Ở phiên bản rất cũ lệnh này tên là `unban` |
| `ban-ip <IP>` | Cấm theo IP | OP 3 / console | **Mọi người sau IP đó đều không vào được**, dùng cẩn thận |
| `pardon-ip <IP>` | Gỡ cấm IP | OP 3 / console | Trước khi gỡ cấm hãy xác nhận IP đó giờ thuộc về ai |
| `banlist [ips\|players]` | Xem danh sách cấm | OP 3 / console | Không ghi tham số thì liệt kê người chơi |
| `op <người chơi>` | Cấp quyền quản trị | OP 3 / console | Chỉ cấp cho người cần; cấp OP thô hơn nhiều so với cấp nút quyền |
| `deop <người chơi>` | Thu quyền quản trị | OP 3 / console | Trong môi trường có plugin quyền, OP vẫn có thể vượt qua nhóm quyền |
| `whitelist on` | Bật danh sách trắng | OP 3 / console | Bật trước hãy thêm chính mình vào |
| `whitelist add <người chơi>` | Thêm vào danh sách trắng | OP 3 / console | Ghi vào `whitelist.json` |
| `whitelist remove <người chơi>` | Bỏ khỏi danh sách trắng | OP 3 / console | Có hiệu lực thì lần kết nối sau của người đó bị từ chối |
| `whitelist list` | Xem danh sách trắng | OP 3 / console | Khớp với nội dung `whitelist.json` |
| `whitelist reload` | Đọc lại danh sách trắng từ tệp | OP 3 / console | **Sửa tay `whitelist.json` xong nhất định phải chạy nó** |

Tệp liên quan danh sách trắng là `whitelist.json`, danh sách cấm và danh sách OP lần lượt ở `banned-players.json`, `banned-ips.json`, `ops.json`. Sửa bằng lệnh thì ghi tệp ngay; sửa tệp bằng tay thì cần reload hoặc khởi động lại tương ứng.

## 4. Java Edition: thế giới, thời gian và quy tắc trò chơi

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `tp <người chơi> <mục tiêu>` | Dịch chuyển người chơi | OP 2 / console | Tên đầy đủ là `teleport`; chạy từ console phải ghi cả hai tham số |
| `gamemode <chế độ> [người chơi]` | Đổi chế độ chơi | OP 2 / console | Giá trị `survival` / `creative` / `adventure` / `spectator` |
| `gamerule <quy tắc> <giá trị>` | Sửa quy tắc trò chơi | OP 2 / console | Tên quy tắc được thêm bớt theo phiên bản, **dùng gợi ý Tab để xác nhận** |
| `time set day` | Đặt thời gian | OP 2 / console | Cũng có thể dùng `noon` / `night` / `midnight` hoặc giá trị cụ thể |
| `time add <số lượng>` | Đẩy thời gian | OP 2 / console | Khi gỡ cơ chế ngày đêm dùng dễ hơn `set` |
| `weather clear` | Đặt thời tiết | OP 2 / console | Giá trị `clear` / `rain` / `thunder`, có thể kèm thời gian kéo dài |
| `difficulty <độ khó>` | Đặt độ khó | OP 2 / console | Giá trị `peaceful` / `easy` / `normal` / `hard` |
| `give <người chơi> <vật phẩm> [số lượng]` | Trao vật phẩm | OP 2 / console | ID vật phẩm và cú pháp component thay đổi theo phiên bản |
| `seed` | Hiển thị seed thế giới | OP 2 / console | Gắn với bản lưu, đổi thế giới thì giá trị khác |
| `say <nội dung>` | Phát thông báo với tư cách máy chủ | OP 2 / console | Người chơi thấy theo kiểu tin nhắn máy chủ |
| `tell <người chơi> <nội dung>` | Nhắn riêng | Mọi người | Bí danh `msg` / `w` |
| `datapack list` | Liệt kê gói dữ liệu | OP 2 / console | Dùng kèm `/reload` |

`gamerule` là lệnh dễ bị dùng sai nhất: **quy tắc cùng tên trên Java Edition và Bedrock có thể khác nghĩa, giữa các phiên bản cũng có thể bị đổi tên hoặc tách ra**. Trước khi sửa hãy xác nhận quy tắc tồn tại trong danh sách gợi ý, sửa xong quan sát nhật ký và phản hồi của người chơi.

## 5. Java Edition: trạng thái và chẩn đoán

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `tps` | Xem TPS | OP | **Không phải lệnh bản gốc**: họ Spigot / Paper có sẵn; khi cài spark có thể bị spark tiếp quản |
| `mspt` | Xem thời gian mỗi tick | OP | Họ Paper cung cấp; xem cùng TPS mới có ý nghĩa |
| `spark tps` | Xem TPS bằng spark | OP | Cây lệnh của spark chi tiết hơn lệnh có sẵn của lõi |
| `spark profiler start` | Bắt đầu lấy mẫu hiệu năng | OP | Kết quả mặc định sẽ được tải lên và cho liên kết, lưu ý rủi ro lộ dữ liệu |
| `spark profiler stop` | Kết thúc lấy mẫu và xem kết quả | OP | Chỉ muốn dừng mà không tải lên thì dùng `spark profiler cancel` |
| `plugins` | Liệt kê plugin | OP / nút quyền | Bí danh `pl`; màu xanh là đã nạp, màu đỏ là nạp thất bại |
| `version <plugin>` | Xem phiên bản plugin | OP / nút quyền | Báo bug thì người ta nhất định sẽ hỏi cái này |
| `help` | Xem trợ giúp lệnh | Mọi người | Xem theo trang, `/help <lệnh>` xem một lệnh |

Máy chủ bản gốc **không có** các lệnh `tps`, `mspt`, `plugins`, `version`. Bản gốc muốn xem hiệu năng chỉ có thể dựa vào nhật ký và công cụ bên ngoài, đó cũng là lý do nhiều người "đổi lõi là có lệnh mới". Quy trình chẩn đoán hiệu năng đầy đủ xem ở [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark).

:::tip Nút quyền cũng có thể đổi khả năng hiển thị lệnh
Nút quyền của `plugins`, `version`, `help` mặc định mở cho mọi người. Muốn tắt, đặt `bukkit.command.plugins`, `bukkit.command.version`, `bukkit.command.help` thành `false`. Nhưng **tắt lệnh không có nghĩa là giấu được**: một số client có thể suy ra plugin đã cài qua phản hồi gợi ý Tab.
:::

## 6. Bedrock: cùng những lệnh đó trên BDS ra sao

Bedrock (BDS và lõi bên thứ ba) có bộ lệnh riêng. **Khả năng dùng được chịu ảnh hưởng đồng thời của hai việc**: bạn có tư cách người điều hành hay không, và máy chủ có bật gian lận hay không.

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `stop` | Tắt máy chủ an toàn | console | Cùng tên cùng nghĩa với Java Edition, là lệnh đáng nhớ nhất |
| `save hold` | Tạm dừng ghi và giữ tệp nhất quán | console | Bước đầu tiên khi sao lưu trên Bedrock |
| `save query` | Liệt kê các tệp cần sao lưu hiện tại | console | Sao chép theo danh sách nó đưa ra |
| `save resume` | Khôi phục ghi | console | Chạy sau khi sao chép xong |
| `whitelist on` / `off` | Bật tắt danh sách trắng | người điều hành | Tệp tương ứng là `allowlist.json` |
| `whitelist add` / `remove` / `list` / `reload` | Bảo trì danh sách trắng | người điều hành | Sửa tệp bằng tay xong phải reload |
| `op` / `deop` | Cấp / thu quyền quản trị | người điều hành | Kết quả ghi vào `permissions.json` |
| `permission list` | Xem quyền hiện tại | người điều hành | Tương ứng với `permissions.json` |
| `permission reload` | Đọc lại tệp quyền | người điều hành | Chạy sau khi sửa tay `permissions.json` |
| `kick <người chơi> [lý do]` | Đá người chơi | người điều hành | Ý nghĩa giống Java Edition |
| `ban` / `pardon` | Cấm / gỡ cấm người chơi | người điều hành | Cấm theo người chơi (gamertag / XUID), **không có lệnh tương đương cấm theo IP** |
| `tp` / `teleport` | Dịch chuyển | người điều hành | Cú pháp gần Java Edition nhưng không hoàn toàn giống |
| `gamemode` | Đổi chế độ chơi | người điều hành | Giá trị tương tự Java Edition |
| `gamerule` | Sửa quy tắc trò chơi | người điều hành | Tập quy tắc **khác** Java Edition, quy tắc cùng tên cũng có thể khác nghĩa |
| `time set` / `time add` | Đặt / đẩy thời gian | người điều hành | Bedrock cũng có lệnh kiểu `daylock` để khóa thời gian |
| `weather clear` / `rain` / `thunder` | Đặt thời tiết | người điều hành | Còn có `toggledownfall` |
| `difficulty` | Đặt độ khó | người điều hành | Cùng tên với Java Edition |
| `list` | Liệt kê người chơi trực tuyến | người điều hành | Một số phiên bản mở cho người chơi thường, lấy gợi ý làm chuẩn |

Trong bảng có một số lệnh **chỉ được thêm ở phiên bản khá mới** (`ban` / `pardon` thể hiện rõ nhất), trên máy chủ Bedrock cũ hơn, danh sách gợi ý có thể hoàn toàn không có chúng. **Cách đáng tin duy nhất để biết một lệnh có tồn tại trên phiên bản của bạn hay không là xem gợi ý Tab và tài liệu chính thức**, đừng chép số phiên bản ở nơi khác.

Trong cấu hình BDS có một mục liên quan trực tiếp đến lệnh: `allow-cheats` trong `server.properties`. Khi nó tắt, lệnh trong game sẽ bị hạn chế; giá trị mặc định lấy theo `server.properties` sinh ra trên máy bạn, sửa xong phải khởi động lại máy chủ mới có hiệu lực. **Rất nhiều trường hợp "lệnh không dùng được" trên Bedrock có nguyên nhân là công tắc gian lận hoặc tư cách người điều hành, không phải viết sai lệnh.**

Quy trình sao lưu của Bedrock hoàn toàn khác Java Edition, có thể chép thẳng:

```text
save hold
save query
# 按 query 输出的清单复制文件（worlds/ 要整体拷走）
save resume
```

## 7. Những lệnh Bedrock không có (hoặc nghĩa khác)

| Lệnh Java Edition | Tình hình trên Bedrock | Giải thích |
| --- | --- | --- |
| `save-all` | Không tồn tại | Dùng `save hold` / `save query` / `save resume` |
| `save-off` / `save-on` | Không tồn tại | Bedrock không có cặp công tắc "tắt tự động lưu" |
| `ban-ip` / `pardon-ip` | Không tồn tại | Bedrock cấm theo người chơi, không có lệnh cấm theo IP |
| `plugins` / `version <plugin>` | Không tồn tại | Lõi Bedrock không có lệnh liệt kê plugin thống nhất, xem đầu ra console |
| `tps` / `mspt` | Không tồn tại | Bedrock không có lệnh TPS; hiệu năng chỉ phán đoán từ nhật ký và quan sát bên ngoài |
| `reload` | Có nhưng **nghĩa khác** | Bedrock nạp lại hàm và script trong gói hành vi, **không nạp lại `server.properties`**, cũng không phải khởi động lại |
| `gamerule` | Có nhưng **tập quy tắc khác** | Quy tắc cùng tên ở hai phiên bản có thể khác nghĩa, chép giữa các phiên bản sẽ mắc lỗi |
| `difficulty` / `time` / `weather` | Có | Mấy lệnh này hai phiên bản đều có, cú pháp gần nhau |

:::warn Câu "Bedrock không có /reload" phải tách ra mà xem
Câu cộng đồng hay nói "Bedrock không có `/reload`" thực ra là **không có reload nạp lại cấu hình máy chủ** —— điều này đúng: Bedrock sửa `server.properties` chỉ có thể khởi động lại máy chủ (dùng console `stop` bình thường rồi khởi động, đừng kill tiến trình).

Nhưng Bedrock thực sự có một lệnh tên `reload`, phạm vi tác dụng là hàm và script trong gói hành vi, **không phải cùng một việc với nạp lại gói dữ liệu của Java Edition**, cũng không khiến máy chủ đọc lại tệp cấu hình. Cả hai phiên bản đều đừng dùng `reload` như "nút làm mới vạn năng"; phạm vi dùng được và hành vi cụ thể thay đổi theo phiên bản, lấy tài liệu chính thức làm chuẩn.
:::

## 8. Tầng quản lý: lệnh con `!!MCDR` của MCDR

MCDReforged (MCDR) là **trình quản lý bao ngoài máy chủ**: nó trông coi tiến trình lõi, phân tích đầu ra console, và cung cấp một bộ lệnh có tiền tố `!!`. Bộ lệnh này **không phải lệnh trò chơi**, do chính MCDR xử lý, không truyền xuống máy chủ.

| Lệnh | Tác dụng | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `!!MCDR` | Lệnh chính, liệt kê các lệnh con có sẵn | Do hệ thống quyền của MCDR kiểm soát | Tiền tố `!!` có thể đổi trong cấu hình |
| `!!MCDR status` | Xem trạng thái MCDR | Quyền MCDR | Chẩn đoán "trình quản lý còn sống không" |
| `!!MCDR reload config` | Nạp lại cấu hình MCDR | Quyền MCDR | Có dạng viết tắt, như `!!MCDR r cfg` |
| `!!MCDR reload plugin` | Nạp lại plugin | Quyền MCDR | Tách riêng với nạp lại cấu hình |
| `!!MCDR reload permission` | Nạp lại dữ liệu quyền | Quyền MCDR | Dùng sau khi sửa tệp quyền |
| `!!MCDR reload all` | Nạp lại toàn bộ | Quyền MCDR | Có sự cố thì ưu tiên dùng nó |
| `!!MCDR plugin list` | Liệt kê plugin đã nạp | Quyền MCDR | Khác hoàn toàn với `/plugins` của Java Edition |
| `!!MCDR plugin load <plugin>` | Nạp plugin | Quyền MCDR | Tham số là id plugin |
| `!!MCDR plugin reload <plugin>` | Nạp lại một plugin | Quyền MCDR | Nhẹ hơn khởi động lại toàn bộ |
| `!!MCDR plugin unload <plugin>` | Gỡ nạp plugin | Quyền MCDR | Gỡ nạp không có nghĩa là xóa tệp |
| `!!MCDR plugin install <plugin>` | Cài plugin từ kho chính thức | Quyền MCDR | Ví dụ: `!!MCDR plugin install ndpr` |
| `!!MCDR permission list` | Xem quyền | Quyền MCDR | Xem theo người chơi và nhóm quyền |
| `!!MCDR permission set` | Đặt quyền | Quyền MCDR | Cú pháp lấy tài liệu chính thức làm chuẩn |
| `!!MCDR permission remove` | Xóa quyền | Quyền MCDR | |
| `!!MCDR checkupdate` | Kiểm tra cập nhật MCDR | Quyền MCDR | Có tự động kiểm tra hay không do mục cấu hình quyết định |

:::warn Lệnh con của MCDR thay đổi theo phiên bản
Lệnh con và dạng viết tắt của MCDR được điều chỉnh giữa các phiên bản (các dạng viết tắt như `!!MCDR reload config` đặc biệt dễ nhớ nhầm), **cách viết cụ thể lấy tài liệu chính thức của MCDR và phần trợ giúp do `!!MCDR` xuất ra trên máy bạn làm chuẩn**. Ngoài ra, quyền của MCDR là hệ thống riêng của nó, không liên quan đến cấp OP trong game; người chơi chạy được những lệnh `!!` nào trong ô chat phụ thuộc cấu hình quyền của MCDR.
:::

## 9. Tầng quản lý: console của panel và RCON

Console web của panel (như MCSManager, Pterodactyl) về bản chất là một **đầu vào chuẩn từ xa**: nội dung bạn gõ được đưa nguyên vẹn vào tiến trình máy chủ, không khác gì bạn ngồi trước máy gõ console.

| Kênh | Có phải gõ `/` không | Quyền | Ghi chú |
| --- | --- | --- | --- |
| Console máy cục bộ | Thường không cần | Quyền cao nhất | Console bản gốc không bị giới hạn bởi cấp OP |
| Console web của panel | Phần lớn panel nhận cả hai | Quyền cao nhất | Có panel tự bỏ `/` ở đầu, lấy hành vi của panel làm chuẩn |
| RCON | Thường không cần | Quyền cao nhất | Cần bật trong `server.properties` và đặt mật khẩu |
| Ô chat trong game | Nhất định phải gõ `/` | Theo cấp OP hoặc nút quyền | Chịu ảnh hưởng của danh sách trắng, cấm, plugin quyền |

Ba khuyến nghị thực hành:

1. **Dừng máy chủ luôn dùng `stop` (Bedrock cũng vậy)**, đừng bấm "kết thúc tiến trình" trên panel. Kết thúc cưỡng bức có thể mất dữ liệu hoặc hỏng bản lưu.
2. **Đừng để RCON lộ ra Internet**. Nó là kênh "chạy lệnh tùy ý" không cần đăng nhập, chỉ lắng nghe địa chỉ loopback hoặc mạng nội bộ, mật khẩu phải dài và duy nhất.
3. **Lệnh chạy trong console của panel tương đương quyền cao nhất**, trước khi cấp tài khoản panel cho người phụ quản hãy nghĩ rõ điều này.

## 10. Console vs trong game: danh sách khác biệt

| Khác biệt | Console / RCON | Ô chat trong game |
| --- | --- | --- |
| Dấu gạch chéo đầu | Thường không cần ghi | Bắt buộc ghi |
| Nguồn quyền | Tư cách tiến trình, tương đương quyền cao nhất | Cấp OP hoặc nút quyền |
| Ngữ cảnh người thực thi | **Không có người thực thi**: `@s`, tọa độ tương đối, `tp` không chỉ định mục tiêu đều không dùng được | Có người thực thi, dùng được selector và tọa độ tương đối |
| Nơi xuất đầu ra | Terminal và tệp nhật ký | Ô chat và thanh hành động |
| Gợi ý Tab | Thường có; một số panel không có | Có |
| Mã hóa ký tự | Console Windows sai bảng mã thì tiếng Trung bị lỗi font | Bình thường |
| Khả năng người chơi thấy | Người chơi không thấy bạn gõ gì | Một số lệnh sẽ phát cho người chơi |

Cái bẫy điển hình nhất là "chạy `/tp ~ ~10 ~` trong console" —— console không có vị trí, lệnh này nhất định thất bại. Khi console chạy lệnh dịch chuyển, **cả người chơi và mục tiêu đều phải ghi rõ**.

## 11. Quyền đến từ đâu

| Hệ thống | Áp dụng | Kiểm soát thế nào |
| --- | --- | --- |
| Cấp OP | Java Edition bản gốc | `/op` cấp đến cấp 4; cấp 1 đến 4 tương ứng các nhóm lệnh khác nhau, có thể dùng nút quyền chi tiết hóa |
| Nút quyền | Máy chủ plugin Java Edition | Plugin quyền (như LuckPerms) phân theo nút và nhóm quyền, an toàn hơn cấp OP |
| Người điều hành + công tắc gian lận | Bedrock | `permissions.json` quyết định ai là người điều hành; `allow-cheats` trong `server.properties` quyết định lệnh có dùng được |
| Quyền MCDR | Máy chủ có cài MCDR | Hệ thống quyền riêng của MCDR, kiểm soát lệnh `!!` theo người chơi và nhóm quyền |

**Nguyên tắc cấp quyền**: cấp được quyền của một lệnh thì đừng cấp cả OP; cấp được quyền có thời hạn thì đừng cấp vĩnh viễn. OP là sự tin cậy ở mức "cả máy chủ", nút quyền mới là cấp quyền tối thiểu.

## 12. Tổ hợp có thể chép thẳng

Quy trình chuẩn trước khi bảo trì (Java Edition):

```text
say 服务器将在 5 分钟后进入维护
save-all
save-off
# 此时在外部打包世界目录与插件目录
stop
```

Danh sách trắng từ con số không đến dùng được (Java Edition):

```text
whitelist add 你的ID
whitelist on
whitelist list
```

Sao lưu và khôi phục trên Bedrock:

```text
save hold
save query
# 复制 query 列出的文件，worlds/ 整体拷走
save resume
```

Những lệnh gõ đầu tiên khi chẩn đoán "người chơi không vào được":

```text
list
whitelist list
banlist players
plugins
```

## 13. Dùng sai thường gặp

| Dùng sai | Hậu quả | Cách làm đúng |
| --- | --- | --- |
| Đóng thẳng cửa sổ hoặc bấm "kết thúc tiến trình" | Bản lưu có thể hỏng hoặc quay lui | Chạy `stop` trong console |
| Dùng `/reload` như khởi động lại | Trạng thái plugin rối loạn, cấu hình không có hiệu lực | Dùng reload của chính plugin; khởi động lại khi cần |
| Không `save-off` trước khi sao lưu | Sao lưu phải bản lưu ghi dở | `save-all` rồi `save-off` trước |
| Dùng tọa độ tương đối `~` trong console | Lệnh thất bại ngay | Ghi rõ người chơi và tọa độ |
| Mở cổng RCON ra Internet | Tức là trao máy chủ cho trình quét | Chỉ lắng nghe loopback hoặc mạng nội bộ, đặt mật khẩu mạnh |
| Sửa `whitelist.json` xong không reload | Thay đổi không có hiệu lực | Chạy `whitelist reload` |
| Dùng tên `gamerule` của Bedrock sang Java Edition | Quy tắc không tồn tại hoặc nghĩa khác | Dùng gợi ý Tab xác nhận tên quy tắc |
| Tưởng Bedrock có `save-all` | Lệnh không tồn tại | Dùng `save hold` / `save query` / `save resume` |

## Bước tiếp theo

- Cấu hình và tinh chỉnh sau khi nắm lệnh: xem [Cấu hình máy chủ](/tutorials/java/config) và [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)
- Dùng MCDR để vận hành tự động: xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr)
- Dữ liệu thấy từ các lệnh hiệu năng đọc thế nào: xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark)

> Chi tiết lệnh và phiên bản lấy theo tài liệu chính thức của máy chủ và trò chơi tương ứng.
