---
title: Plugin phụ thuộc thường dùng
slug: plugin-deps
cat: java
level: 2
order: 19
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, phụ thuộc, vault, placeholderapi, quyền]
updated: 2026-10-04
draft: false
---

Cách lật xe phổ biến nhất khi cài plugin không phải tải nhầm phiên bản, mà là **cài thiếu phần phụ thuộc**: plugin rõ ràng đã bỏ vào `plugins/`, `/plugins` lại hiện đỏ, hoặc cài được nhưng chức năng thiếu một mảng.

Bài này nói rõ phần phụ thuộc là gì, thiếu thì thế nào, và bốn plugin hay bị phụ thuộc nhất Vault, PlaceholderAPI, ProtocolLib, LuckPerms mỗi cái làm gì.

## 1. Plugin phụ thuộc là gì

Các plugin có thể phụ thuộc lẫn nhau. Tác giả khi viết plugin, nếu không muốn làm lại bánh xe, sẽ khai báo "tôi cần năng lực do plugin khác cung cấp", cái được cần đến chính là **phần phụ thuộc (dependency)**.

Quan hệ phụ thuộc được viết trong `plugin.yml` bên trong jar của plugin, chia hai loại:

| Khai báo | Ý nghĩa | Thiếu thì thế nào |
| --- | --- | --- |
| `depend` (phụ thuộc cứng) | Không có nó là không làm việc được | Plugin **nạp thất bại**, trong `/plugins` hiện đỏ |
| `softdepend` (phụ thuộc mềm) | Có nó thì bật thêm chức năng, không có vẫn chạy được | Plugin nạp bình thường, **chức năng liên quan bị tắt lặng lẽ** |

Máy chủ khi khởi động sẽ nạp phần phụ thuộc trước, rồi mới nạp plugin phụ thuộc nó, đây cũng là lý do "phần phụ thuộc phải cài trước".

:::note Plugin nào cũng có thể là phần phụ thuộc
Phần phụ thuộc không phải một loại plugin đặc biệt. Về lý thuyết plugin nào cũng có thể được plugin khác khai báo là phụ thuộc, chỉ là mấy cái dưới đây vì bị phụ thuộc quá nhiều, dần dần có cách gọi chung là "plugin phụ thuộc".
:::

## 2. Thiếu phần phụ thuộc thì thế nào

Triệu chứng thường không trực tiếp như "báo lỗi", nhận đúng mấy biểu hiện này sẽ tiết kiệm rất nhiều thời gian:

| Hiện tượng | Giải thích |
| --- | --- |
| Trong `/plugins` hiện đỏ | Máy chủ nhận ra plugin này, nhưng nạp thất bại, console nhất định có nguyên nhân |
| Console báo `Unknown dependency` | Rõ ràng nhất: phần phụ thuộc cứng khai báo trong `plugin.yml` không có trong `plugins/` |
| Console báo `ClassNotFoundException` / `NoClassDefFoundError` | Trong mã có tham chiếu lớp do phần phụ thuộc cung cấp, nhưng lớp đó không tồn tại |
| Cài được plugin, nhưng một chức năng "không phản ứng" | Phần lớn là thiếu phụ thuộc mềm, chức năng bị tự động tắt |
| Biến hiển thị nguyên si thành `%player_name%` | Chưa cài PlaceholderAPI, hoặc chưa tải tiện ích biến tương ứng |
| Lệnh liên quan kinh tế báo không tìm thấy hệ thống kinh tế | Đã cài Vault, nhưng không có plugin thực sự cung cấp kinh tế |

:::warn Xem console trước, rồi hãy đoán
Nguyên nhân plugin nạp thất bại nhất định được ghi trong nhật ký khởi động. **Mở `logs/latest.log`, tìm tên plugin**, nhanh hơn nhiều so với mô tả trong nhóm chat "plugin của tôi hiện đỏ".
:::

## 3. Làm sao biết một plugin cần phần phụ thuộc

Theo độ tin cậy từ cao xuống thấp:

1. **Xem trang phát hành plugin**. Mô tả trên SpigotMC, Modrinth, Hangar, GitHub thường ghi mục `Requires`, `Dependencies` hoặc mục phụ thuộc.
2. **Xem `plugin.yml` trong jar**. Mở jar bằng phần mềm nén, tìm `plugin.yml`, hai dòng `depend` và `softdepend` bên trong chính là đáp án, đáng tin nhất.
3. **Xem lỗi ở console**. Khởi động báo thiếu cái nào thì bổ sung cái đó.
4. **Xem màu trong `/plugins`**. Mục đỏ thì nghi phần phụ thuộc trước, rồi nghi phiên bản không khớp.
5. **Xem tài liệu plugin hoặc mục issue**. Tác giả thường ghi rõ phụ thuộc và yêu cầu phiên bản.

## 4. Vault

**Nó là gì**: Vault là một **thư viện trừu tượng** hướng tới máy chủ họ Bukkit. Bản thân nó không làm chức năng cụ thể nào, chỉ định nghĩa một bộ giao diện, để "plugin cần năng lực kinh tế/quyền/chat" và "plugin thực sự hiện thực những năng lực đó" nói chuyện được với nhau.

**Nó không phải plugin kinh tế**. Điều này dễ hiểu nhầm nhất: bản thân Vault không sinh ra đồng tiền nào, nó chỉ là một giao diện thống nhất. Muốn thực sự có hệ thống kinh tế, bạn còn phải cài một plugin kinh tế (như XConomy, mô-đun kinh tế của EssentialsX, CMI), do nó đăng ký dịch vụ với Vault, các plugin khác rồi qua Vault truy cập số dư.

| Giao diện Vault cung cấp | Ai hiện thực | Ai gọi |
| --- | --- | --- |
| Kinh tế (Economy) | Plugin kinh tế | Cửa hàng, điểm danh, quay thưởng… |
| Quyền (Permission) | Plugin quyền (như LuckPerms) | Plugin cần phán đoán quyền người chơi |
| Chat (Chat) | Plugin trò chuyện | Plugin cần gửi/định dạng chat |

**Ai cần nó**: chỉ cần trong danh sách plugin của bạn có mục "phụ thuộc Vault" thì cài nó. Chủ máy chủ không cần cấu hình gì của Vault, cài vào là được.

:::tip Có thể bỏ qua nhãn phiên bản
Vault hỗ trợ đồng thời Minecraft phiên bản cũ và mới, không cần để ý phiên bản áp dụng ghi trên trang SpigotMC.
:::

## 5. PlaceholderAPI

**Nó là gì**: PlaceholderAPI (gọi tắt PAPI) là một hệ thống placeholder biến. Nó thay văn bản dạng `%tên-tiện-ích_tham-số%` bằng thông tin do plugin khác cung cấp.

```
%player_name%        tên người chơi
%player_level%       cấp người chơi
%vault_eco_balance%  số dư người chơi
%server_online%      số người online
```

Lấy `%player_name%` làm ví dụ, `player` là tên tiện ích biến, `name` là tham số, nghĩa là "lấy tên người chơi".

**Tiện ích biến**: bản thân PAPI gần như không cung cấp biến, biến do từng **tiện ích mở rộng** cung cấp. Tiện ích tải được trong game từ eCloud, hiện có hàng trăm cái, phủ EssentialsX, LuckPerms, Vault… rất nhiều plugin.

```
/papi ecloud download Player     tải tiện ích Player
/papi list                       xem các tiện ích đã cài
/papi info <tên-tiện-ích>        xem một tiện ích cung cấp những biến nào
/papi reload                     nạp lại PAPI và các tiện ích
```

**Gỡ lỗi**: viết xong biến thì kiểm chứng một lượt trong game trước, đừng đợi người chơi báo lỗi.

```
/papi parse me %player_name%
```

Lệnh này trả thẳng kết quả phân tích cho bạn, `me` nghĩa là lấy chính mình làm ngữ cảnh.

**Lồng biến**: khi nhét kết quả phân tích của một biến vào tham số của biến khác, lớp trong dùng `{}` thay cho `%%`:

```
%math_2_{player_health}%
```

Ví dụ trên cần tiện ích math, tác dụng là giữ máu người chơi hai chữ số thập phân.

**Ngoài biến còn làm được gì**: một số tiện ích cung cấp năng lực vượt ngoài "lấy giá trị", ví dụ Math (tính toán), CheckItem (phán đoán vật phẩm người chơi), JavaScript (chạy script), Progress (tạo thanh tiến trình).

**Ai cần nó**: những plugin kiểu TAB, bảng điểm, hologram, menu, định dạng chat, MOTD —— loại "cần hiển thị dữ liệu của plugin khác" gần như đều dựa vào PAPI. Nó là một trong những plugin phía plugin đáng cài sẵn nhất.

## 6. ProtocolLib

**Nó là gì**: ProtocolLib cung cấp năng lực truy cập tầng thấp vào giao thức mạng (gói dữ liệu) của Minecraft, cho plugin chặn, sửa hoặc chủ động gửi gói dữ liệu, làm những việc mà bản thân Bukkit API không mở ra.

**Ai cần nó**: nó là **thứ dành cho nhà phát triển plugin**. Là chủ máy chủ, bạn không cần cấu hình gì cho nó —— nếu plugin nào yêu cầu ProtocolLib thì cài vào là được.

| Mục | Giải thích |
| --- | --- |
| Có cần cấu hình không | Không cần, cài vào là dùng |
| Chọn phiên bản | 1.8 đến 1.19.4 dùng 5.0.0; phiên bản cao hơn dùng bản mới nhất |
| Cấu hình thường gặp | Trong `plugins/ProtocolLib/config.yml` có thể đổi `auto updater.notify` thành `false` để tắt thông báo cập nhật |

:::warn Phiên bản bắt buộc phải khớp
ProtocolLib thao tác trực tiếp vào cách hiện thực bên trong máy chủ, **khi phiên bản không khớp, biểu hiện có thể là cả máy chủ báo lỗi thậm chí sập**, chứ không phải plugin tự có vấn đề. Khi nâng cấp lõi máy chủ, nhớ kiểm tra nó cùng lúc.
:::

## 7. LuckPerms

**Nó là gì**: LuckPerms là **plugin quyền** phổ biến nhất hiện nay, dùng để quản lý "ai dùng được lệnh gì, ai vào được thế giới nào, hiển thị tiền tố gì". Nó hỗ trợ nhiều nền tảng như Bukkit/Spigot/Paper, BungeeCord, Velocity, Sponge, Fabric.

**Khái niệm cốt lõi**:

| Khái niệm | Tác dụng |
| --- | --- |
| Nút quyền (permission) | Đơn vị nhỏ nhất, dạng `essentials.fly`, `true` là cho phép, `false` là từ chối |
| Nhóm (group) | Tập hợp một bộ quyền, như `default`, `vip`, `admin` |
| Kế thừa (inheritance) | Nhóm kế thừa được nhóm khác, `admin` kế thừa `vip` thì không phải cấu hình lại |
| Ngữ cảnh (context) | Cho quyền chỉ có hiệu lực trong thế giới, máy chủ hoặc chế độ cụ thể |
| Tiền tố / hậu tố (meta) | Thông tin hiển thị cho plugin chat, TAB… đọc |

**Lệnh thường dùng**:

```
/lp user <người chơi> permission set <nút> true
/lp group <nhóm> permission set <nút> true
/lp group <nhóm> parent add <nhóm-cha>
/lp user <người chơi> parent add <nhóm>
/lp editor
```

`/lp editor` sẽ tạo một liên kết trình biên tập web, sửa quyền bằng giao diện trực quan hơn gõ lệnh nhiều, sửa xong bấm lưu là có hiệu lực.

**Lưu trữ**: mặc định dùng lưu trữ dạng tệp (H2/SQLite), dữ liệu ở dưới `plugins/LuckPerms/`. **Khi nhiều máy chủ dùng chung một bộ quyền, bắt buộc phải đổi sang cơ sở dữ liệu như MySQL/MariaDB**, nếu không mỗi máy chủ tự quản riêng.

**Quan hệ với Vault**: LuckPerms đăng ký dịch vụ quyền với Vault, nên những plugin "phán đoán quyền qua Vault" cài LuckPerms xong là chạy bình thường, không cần cấu hình thêm.

:::note Ai hiển thị tiền tố
LuckPerms chỉ lo lưu tiền tố, **không lo hiển thị nó ra**. Thứ thực sự làm tiền tố xuất hiện trong khung chat hoặc TAB là plugin trò chuyện (như TrChat, Carbon) hoặc plugin loại TAB, chúng đọc thông tin meta trong LuckPerms.
:::

## 8. Thứ tự cài và phối hợp

Phần phụ thuộc phải **cài trước, khởi động lại trước**, rồi mới cài plugin phụ thuộc nó. Một thứ tự khởi đầu thường gặp:

| Thứ tự | Plugin | Lý do |
| --- | --- | --- |
| 1 | LuckPerms | Quyền là nền để plugin khác phán đoán "dùng được không" |
| 2 | Plugin kinh tế (XConomy / EssentialsX / CMI) | Cung cấp hiện thực kinh tế thật cho Vault |
| 3 | Vault | Cho kinh tế, quyền, chat có giao diện thống nhất để dùng |
| 4 | PlaceholderAPI | Cài xong rồi tải tiện ích biến theo nhu cầu |
| 5 | ProtocolLib | Chỉ cài khi có plugin yêu cầu rõ ràng |
| 6 | Plugin chức năng khác | Cửa hàng, menu, danh hiệu, TAB… |

:::tip Cài xong kiểm chứng rồi mới tiếp
Mỗi lần cài một phần phụ thuộc thì khởi động lại một lần, xác nhận trong `/plugins` là màu xanh. Ném cả chục plugin vào một lúc, khi có vấn đề chi phí tìm lỗi tăng gấp bội.
:::

## 9. Danh sách kiểm tra

| Mục kiểm tra | Xác nhận thế nào |
| --- | --- |
| Phần phụ thuộc có thực sự trong `plugins/` không | Xem tên tệp và đuôi có phải `.jar` không |
| Có phải thiếu phụ thuộc cứng không | Tìm `Unknown dependency` trong console |
| Có phải thiếu phụ thuộc mềm không | Chức năng không phản ứng nhưng plugin màu xanh, lật tài liệu plugin xác nhận nó phụ thuộc ai |
| Phiên bản có khớp không | Đối chiếu phiên bản máy chủ và phiên bản phần phụ thuộc ghi trên trang phát hành plugin |
| Biến không phân tích được | Xác nhận đã cài PAPI, đã tải tiện ích tương ứng, rồi dùng `/papi parse me` kiểm chứng |
| Kinh tế không dùng được | Xác nhận đã cài Vault **và** một plugin kinh tế thật |
| Quyền không có hiệu lực | Dùng `/lp user <người chơi> permission check <nút>` xem kết quả phán định |
| Sửa xong không có hiệu lực | Dùng lệnh reload của chính plugin, hoặc khởi động lại thẳng |

## Bước tiếp theo

Cài xong phần phụ thuộc, tiếp theo là sửa cấu hình của chúng: xem [Cơ bản cấu hình plugin](/tutorials/java/plugin-config). Nếu chưa từng cài plugin, bắt đầu từ [Nhập môn plugin](/tutorials/java/plugins); cách chơi đầy đủ với quyền có thể xem cùng [Lệnh máy chủ thường dùng](/tutorials/java/commands).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
