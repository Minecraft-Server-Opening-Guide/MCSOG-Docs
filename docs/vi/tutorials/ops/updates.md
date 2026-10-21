---
title: Cập nhật và bảo trì máy chủ, plugin và MCDR
slug: updates
cat: ops
level: 3
order: 13
minutes: 18
tags: [ops, updates, upgrade, rollback, backup, plugins, mcdr, maintenance]
updated: 2026-10-04
draft: false
---

"Cập nhật" là thao tác vừa giống việc thường ngày nhất, vừa dễ gây sự cố nhất trong vận hành. Cài plugin thất bại cùng lắm là thiếu một tính năng, **cập nhật thất bại có thể khiến bản lưu không mở được**. Bài này nối quy trình cập nhật lõi máy chủ, plugin, mod và MCDR thành một cách làm dùng lại được; trọng tâm không phải "bấm bước tiếp theo", mà là **đường lùi mà mỗi bước để lại**.

Trước khi bắt đầu nên đọc hai bài: [Sao lưu và khôi phục](/tutorials/java/backup) (trước khi cập nhật bắt buộc phải biết sao lưu và khôi phục), [Cấu trúc máy chủ](/tutorials/java/structure) (rõ mình định động vào những tệp nào).

## 1. Những nguyên tắc sắt của việc cập nhật

Sáu điều dưới đây xếp theo mức quan trọng. **Bỏ qua bất kỳ điều nào cũng có thể biến "mười phút cập nhật" thành "một ngày cứu chữa".**

### 1.1 Sao lưu trước, và kiểm chứng bản sao lưu

Sao lưu không phải "đóng gói cái là xong", phải xác nhận nó **thực sự dùng được**: tệp tồn tại, dung lượng hợp lý, liệt kê được nội dung, tốt nhất là thực sự giải nén một lần trong thư mục kiểm thử.

```bash
# Linux: xác nhận bản lưu trữ tồn tại, dung lượng hợp lý, liệt kê được nội dung
ls -lh /opt/mcserver/backups/world-20261004.tar.gz
tar -tzf /opt/mcserver/backups/world-20261004.tar.gz | head
```

```powershell
# Windows: giải ra thư mục tạm, xác nhận nội dung đầy đủ
Get-Item C:\mcserver\backups\world-20261004.zip | Select-Object Name, Length, LastWriteTime
Expand-Archive -Path C:\mcserver\backups\world-20261004.zip -DestinationPath C:\mcserver\verify -Force
Get-ChildItem C:\mcserver\verify | Select-Object Name
```

:::warn Bản sao lưu chưa kiểm chứng thì không tính là sao lưu
"Script sao lưu thực ra đã thất bại từ lâu" "gói là rỗng" "chỉ copy `db/` mà không copy `level.dat`" —— những điều này chỉ được phát hiện đúng vào ngày có sự cố thật. **Ít nhất mỗi tháng thực sự khôi phục một lần**, quy trình xem [Sao lưu và khôi phục](/tutorials/java/backup).
:::

### 1.2 Đọc nhật ký cập nhật

Trong nhật ký cập nhật cần tìm bốn thứ, chứ không phải số phiên bản trông có đẹp không:

| Tìm gì | Vì sao quan trọng |
| --- | --- |
| **Thay đổi phá vỡ tương thích** | Khóa cấu hình đổi tên, lệnh đổi tên, định dạng dữ liệu thay đổi, sẽ làm cấu hình hiện có mất hiệu lực ngay |
| **Yêu cầu tối thiểu mới** | Phiên bản Java của máy chủ và plugin, phiên bản loader, phiên bản plugin phụ thuộc |
| **Hướng dẫn chuyển dữ liệu** | Có phải chạy lệnh chuyển dữ liệu thủ công không, có phải nâng lên một phiên bản trung gian trước không |
| **Vấn đề đã biết** | Lỗi mà tác giả đã thừa nhận, giúp bạn tránh một bản vừa phát hành đã hỏng |

### 1.3 Thử trên instance riêng trước

Chuẩn bị một "instance kiểm thử": thư mục khác, cổng khác, bản sao thế giới khác. **Mọi bản cập nhật phải chạy thông trên instance kiểm thử trước, rồi mới động vào máy chủ sản xuất.**

```bash
# Linux: dùng bản sao lưu dựng thẳng một instance kiểm thử
mkdir -p /opt/mcserver/test
tar -xzf /opt/mcserver/backups/full-20261004.tar.gz -C /opt/mcserver/test
```

```powershell
# Windows: tương tự
New-Item -ItemType Directory -Force -Path C:\mcserver\test
Expand-Archive -Path C:\mcserver\backups\full-20261004.zip -DestinationPath C:\mcserver\test -Force
```

Trong instance kiểm thử phải đổi cổng (`server-port` trong `server.properties`), nếu không sẽ tranh cùng cổng với máy chủ đang chạy.

### 1.4 Chọn khung bảo trì

Chọn thời điểm ít người chơi nhất (thường là rạng sáng hoặc buổi sáng ngày thường), tránh các sự kiện như thi đấu hay khai hoang, **dự trù gấp đôi thời gian**, và xác nhận lúc có sự cố thì chính bạn có mặt —— có người nhìn console mới có thể quay lui kịp thời.

### 1.5 Luôn để lại đường lùi

**Nguyên tắc cốt lõi: mọi tệp bị thay thế đều phải được giữ lại với tên kèm số phiên bản.**

```text
server-1.21.1.jar            # lõi cũ, đổi lại được bất cứ lúc nào
MyPlugin-1.0.0.jar.bak       # plugin cũ
world-20261004/              # bản sao lưu thế giới trước khi cập nhật
config.yml.20261004.bak      # cấu hình trước khi cập nhật
```

:::tip Đường lùi phải nghĩ ra trước khi cập nhật
Trước khi cập nhật hãy tự hỏi một câu: "Nếu mười phút nữa tôi phải quay lui, cụ thể tôi gõ những lệnh nào?" **Không trả lời được thì đừng cập nhật vội.**
:::

### 1.6 Thông báo trước về việc dừng máy chủ

Trong nhóm chat, bảng thông báo, MOTD của máy chủ hãy nói rõ: mấy giờ bắt đầu, dự kiến bao lâu, cập nhật cái gì, có sự cố thì thế nào. Người chơi khó chịu nhất không phải việc dừng máy chủ, mà là **không biết vì sao không vào được, cũng không biết phải chờ bao lâu**.

### 1.7 Những tình huống có thể xảy ra sự cố

| Rủi ro | Biểu hiện điển hình | Hậu quả | Phòng ngừa |
| --- | --- | --- | --- |
| Thế giới bị phiên bản mới ghi lại | Phiên bản mới khởi động một lần, khi đổi về lõi cũ thì bản lưu báo lỗi hoặc không nạp được | **Không thể đảo ngược**, chỉ còn cách quay về bản sao lưu | Sao lưu đầy đủ trước lần khởi động đầu bằng phiên bản mới, và giữ lại lõi cũ cùng thư mục cũ |
| Phiên bản Java không khớp | Khởi động là sập, nhật ký xuất hiện `UnsupportedClassVersionError` | Dịch vụ không khởi động được | Căn Java theo bảng ở mục 2.2 |
| Plugin không tương thích với lõi mới | `/plugins` hiện chữ đỏ, hoặc console spam `NoSuchMethodError` | Thiếu tính năng, thậm chí không khởi động được | Xem phiên bản hỗ trợ và nhật ký cập nhật của plugin trước, thử trên instance kiểm thử trước |
| Khóa cấu hình bị đổi tên hoặc xóa | Plugin tạo lại cấu hình mặc định, thiết lập cũ "biến mất" | Tính năng chạy theo giá trị mặc định, ảnh hưởng người chơi | Sao lưu thư mục cấu hình trước khi cập nhật, sau khi cập nhật đối chiếu từng mục |
| Mod không khớp với loader | Khởi động sập, nhật ký liệt kê tên một mod kèm lỗi lớp | Phía mod hoàn toàn không khởi động được | Căn chỉnh cả ba: loader, phiên bản game, mod |
| Giao thức Bedrock không khớp | Cập nhật máy chủ xong người chơi không vào được, báo phải cập nhật client | Người chơi rời đi, người chơi iOS không thể hạ phiên bản | Trước khi cập nhật xác nhận client của người chơi theo kịp |
| Tải phải tệp bị sửa đổi | Lõi hoặc plugin chạy được nhưng hành vi bất thường | Sự cố an ninh | Chỉ tải từ trang phát hành chính thức hoặc được chính thức công nhận |
| Ước tính khung bảo trì sai | Người chơi đã hỏi trong nhóm "sao vẫn chưa vào được" | Uy tín và niềm tin bị tổn hại | Dự trù gấp đôi thời gian, thông báo trước |
| Đĩa đầy | Giải nén thất bại, hoặc bản lưu không ghi vào được | Bản lưu hỏng | Trước khi cập nhật xác nhận dung lượng còn trống |
| Quyền và chủ sở hữu thay đổi | Trên Linux tệp mới có chủ sở hữu là root, người dùng máy chủ không ghi được | Cấu hình plugin không lưu được | Sau khi cập nhật `chown -R` về người dùng riêng của máy chủ |

## 2. Cập nhật lõi máy chủ

### 2.1 Quy trình chung

1. **Dừng máy chủ**. Chạy `stop` trên console, chờ nó thoát bình thường, **đừng kill tiến trình trực tiếp**.
2. **Ghi lại phiên bản hiện tại** (số phiên bản lõi, số build, tên tệp jar trong script khởi động).
3. **Đổi tên lõi cũ để giữ lại**, thêm hậu tố phiên bản.
4. **Tải lõi mới từ nguồn chính thức**, đừng dùng jar trong gói tổng hợp của bên thứ ba.
5. **Đặt lõi mới vào**, tên tệp giữ khớp với script khởi động (nếu không script sẽ không tìm thấy tệp; cách viết script khởi động xem [Mở máy chủ](/tutorials/java/start)).
6. **Khởi động và nhìn console**, đừng khởi động xong là bỏ đi.
7. **Kiểm chứng**: console không báo lỗi, `/plugins` bình thường, tự vào máy chủ đi một vòng, và **quan sát một thời gian** rồi mới quyết định có xóa jar cũ không.

```text
stop
```

```bash
# Linux
cd /opt/mcserver/survival
mv server.jar server-1.21.1.jar                 # đổi tên lõi cũ để giữ lại
cp ~/downloads/server-1.21.4.jar ./server.jar   # đổi sang tệp do trang tải chính thức cung cấp
./start.sh
```

```powershell
# Windows
Set-Location C:\mcserver\survival
Rename-Item server.jar server-1.21.1.jar
Copy-Item "$env:USERPROFILE\Downloads\server-1.21.4.jar" .\server.jar
.\start.bat
```

Thao tác kiểm chứng sau khi vào máy chủ:

```text
/version        xem phiên bản máy chủ
/plugins        xem trạng thái tải plugin (màu đỏ là tải thất bại)
```

:::tip Đừng xóa lõi cũ vội
Ít nhất hãy giữ đến sau khi "phiên bản mới chạy trọn một chu kỳ bảo trì và thế giới mọi thứ bình thường". Một jar vài trăm MB, đổi lại là khả năng quay lui bất cứ lúc nào.
:::

### 2.2 Nhảy phiên bản không miễn phí: căn Java trước

**Khi phiên bản Java không khớp, máy chủ khởi động là sập ngay**, nhật ký sẽ xuất hiện `UnsupportedClassVersionError`. Bảng dưới đây giữ nhất quán với [Chuẩn bị môi trường (Windows và Linux)](/tutorials/java/environment), dùng lại trực tiếp:

| Minecraft bản Java | Java mà chính thức yêu cầu | Mô tả |
| --- | --- | --- |
| 26.1 trở đi | **Java 25** | Yêu cầu mới nhất (từ 26.1) |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 là bản chính thức đầu tiên yêu cầu 21 |
| 1.18 – 1.20.4 | **Java 17** | Tổ hợp được dùng phổ biến nhất hiện nay |
| 1.17 – 1.17.1 | **Java 16** | Java 17 cũng khởi động bình thường |
| 1.12 – 1.16.5 | **Java 8** | Rất nhiều gói tổng hợp cũ vẫn dừng ở mức này |
| 1.7.10 trở về trước | Yêu cầu chính thức thấp hơn | Thực tế phổ biến dùng Java 8 |

:::note Nguồn của bảng trên
Các mốc 1.20.5 / 1.18 / 1.17 / 1.12 lấy từ danh mục phiên bản chính thức của Mojang (trường `javaVersion.majorVersion` của từng phiên bản trên `piston-meta.mojang.com`); yêu cầu Java 25 từ 26.1 lấy từ danh sách yêu cầu phiên bản của Minecraft Wiki. Không phải suy đoán theo kinh nghiệm.
:::

- **Paper, Purpur, Spigot, Fabric, Forge có yêu cầu giống chính thức**: từ 1.20.5 trở lên cần Java 21, 1.18 – 1.20.4 cần Java 17.
- Bảng trên là **yêu cầu tối thiểu**, khi phiên bản Java quá cao thì một số plugin và mod có thể không tương thích, **khuyến nghị căn đúng theo yêu cầu**.
- **Bản Bedrock (BDS) không cần Java**, nó là chương trình C++, chạy thẳng `bedrock_server` (trên Windows là `bedrock_server.exe`).

**Khi vượt nhiều phiên bản lớn thì đừng nhảy một bước.** Các phiên bản trung gian có thể đã thay đổi định dạng cấu hình, định dạng thế giới và API plugin, khi cần hãy nâng từng phiên bản (ví dụ 1.19 → 1.20 → 1.21), mỗi lần nâng xong đều kiểm chứng một lượt.

### 2.3 Định dạng thế giới: nâng cấp cơ bản là đường một chiều

:::warn Thế giới đã bị phiên bản mới mở thì không bảo đảm mở được bằng phiên bản cũ
Sau khi đã khởi động máy chủ bằng phiên bản mới, dữ liệu chunk và thực thể trong thế giới có thể đã **bị ghi lại theo định dạng mới**. Khi đổi lõi về phiên bản cũ, nhẹ thì báo lỗi ngập màn hình, nặng thì **thế giới không nạp được**. Việc này là một chiều, không có công cụ chính thức nào "chuyển ngược về định dạng cũ".
:::

Vì vậy:

- Trước lần khởi động đầu bằng phiên bản mới, **hãy sao lưu đầy đủ một lần** (`world/`, `world_nether/`, `world_the_end/`, tên thế giới tùy chỉnh lấy `level-name` trong `server.properties` làm chuẩn).
- Khi quay lui **phải quay lui cả thế giới**: đổi về lõi cũ **đồng thời** dùng bản sao lưu trước khi cập nhật ghi đè thế giới, chứ không chỉ đổi jar về.
- Muốn kiểm chứng tương thích trước thì chạy phiên bản mới trong instance kiểm thử, **đừng lấy thế giới sản xuất ra thử**.

### 2.4 Paper / Purpur / Leaves / Leaf

Cách cập nhật của nhóm lõi này hoàn toàn giống nhau: **thay jar**. Chúng chia sẻ cùng một định dạng thế giới với bản gốc chính thức, nên kết luận ở mục 2.3 cũng áp dụng.

Chỉ cần chú ý phần cấu hình:

| Tình huống | Mô tả |
| --- | --- |
| Cấu hình có khóa mới | Lần khởi động đầu lõi sẽ **ghi giá trị mặc định** cho các khóa còn thiếu và thêm vào tệp cấu hình |
| Cấu hình bị xóa hoặc đổi tên | Khóa cũ có thể được giữ lại nhưng không còn hiệu lực, cũng có thể bị bỏ qua; hành vi có thể âm thầm thay đổi |
| Số build thay đổi | Các build khác nhau của cùng một phiên bản game cũng có thể mang thay đổi hành vi, hãy đọc nhật ký build |

Cách làm: trước khi cập nhật copy toàn bộ thư mục máy chủ (ít nhất là các tệp `*.yml`), sau khi cập nhật so sánh khác biệt.

```bash
# Linux: so sánh cấu hình trước và sau khi cập nhật
diff -u paper-global.yml.bak paper-global.yml
```

```powershell
# Windows: so sánh cấu hình trước và sau khi cập nhật
Compare-Object (Get-Content .\paper-global.yml.bak) (Get-Content .\paper-global.yml)
```

:::tip Nguồn chính thức
Paper xem <https://papermc.io/>, Purpur xem <https://purpurmc.org/>. Các lõi như Leaves, Leaf hãy lấy trang phát hành chính thức của từng bên làm chuẩn, **đừng dùng jar từ trang tổng hợp hay ổ đĩa mạng**.
:::

### 2.5 Fabric / Forge / NeoForge

Phía mod "kẹt" chặt hơn phía plugin: **phiên bản loader, phiên bản game, từng mod, cả ba phải khớp nhau**.

| Thành phần | Phải khớp với gì | Triệu chứng khi không khớp |
| --- | --- | --- |
| Loader (Fabric / Forge / NeoForge) | Gắn với phiên bản game, chỉ hỗ trợ một khoảng phiên bản nhất định | Không cài được loader, hoặc máy chủ không khởi động được |
| Từng mod | Khớp với phiên bản game, phiên bản loader, và các mod khác mà nó phụ thuộc | Khởi động sập, nhật ký liệt kê tên mod kèm lỗi lớp |
| Mod phía máy chủ và phía client | Mod cần cả hai bên cài thì phải giống nhau | Người chơi không vào được, hoặc vào xong bị đá ngay |

**Nâng loader thường đòi hỏi mod phải cập nhật theo**: mod được biên dịch cho API của một phiên bản loader cụ thể. Triệu chứng thất bại điển hình là **khởi động là sập**, trong nhật ký thấy tên mod kèm lỗi lớp, ví dụ `NoClassDefFoundError`, `ClassNotFoundException`, `NoSuchMethodError`; dòng Forge còn báo thẳng thiếu phụ thuộc bắt buộc (`Missing or unsupported mandatory dependencies`), client có thể báo tập mod không tương thích.

Thứ tự cập nhật được đề xuất:

1. Trước hết xác nhận phiên bản game đích đã có phiên bản loader khả dụng.
2. Nâng loader trong instance kiểm thử, xác nhận khởi động được (lúc này có thể chuyển hết mod ra trước).
3. Đưa mod về theo từng lô (mỗi lô cập nhật xong khởi động một lần, tiện xác định mod nào gây vấn đề), cuối cùng cập nhật cả máy chủ và client, danh sách mod hai bên căn khớp.

### 2.6 Bản Bedrock BDS

Ràng buộc phiên bản của bản Bedrock khác bản Java: **giao thức client phải khớp với build máy chủ**, giao thức đổi là client cũ không kết nối được luôn (nguyên lý xem [Phiên bản giao thức và chọn phiên bản](/tutorials/bedrock/protocol)).

| Điểm cần chú ý | Mô tả |
| --- | --- |
| Giao thức client | Sau khi cập nhật máy chủ, người chơi phải dùng client khớp phiên bản; không khớp sẽ báo cần cập nhật |
| Giới hạn iOS | Người chơi iOS **chỉ cài được phiên bản mới nhất trên cửa hàng**, không cài được phiên bản cũ chỉ định. Nên "ghim phiên bản cũ" tức là từ bỏ người chơi iOS |
| Vị trí bản lưu | Bản lưu của BDS nằm toàn bộ trong `worlds/`, **trước khi cập nhật bắt buộc phải sao lưu toàn bộ** |
| Tệp cấu hình | `server.properties`, `allowlist.json`, `permissions.json`, `valid_known_packs.json` đều là dữ liệu của bạn, không được để gói mới ghi đè |

Các bước cập nhật: lấy gói nén cho nền tảng tương ứng từ trang tải chính thức, **giải nén vào thư mục tạm**, chỉ lấy tệp thực thi đặt vào thư mục gốc.

```bash
# Linux: giải nén vào thư mục tạm, chỉ thay tệp nhị phân (đổi tên tệp theo số phiên bản thực tế)
unzip bedrock-server-new.zip -d /tmp/bds-new
mv bedrock_server bedrock_server-old
cp /tmp/bds-new/bedrock_server .
chmod +x bedrock_server
```

```powershell
# Windows: tương tự (trong gói nén còn có DLL đi kèm, đừng bỏ sót)
Expand-Archive -Path "$env:USERPROFILE\Downloads\bedrock-server-new.zip" -DestinationPath C:\bds-new -Force
Rename-Item .\bedrock_server.exe bedrock_server-old.exe
Copy-Item C:\bds-new\bedrock_server.exe .
```

:::warn Đừng giải nén cả gói rồi ghi đè lên
Gói nén chính thức cũng mang theo một bộ `server.properties`, `allowlist.json`, `permissions.json` mặc định. **Ghi đè cả gói sẽ ghi đè cấu hình và danh sách trắng của bạn.** Chỉ lấy tệp chương trình, giữ nguyên dữ liệu và cấu hình, và xác nhận `worlds/` không bị thay thế.
:::

Cấu trúc thư mục và ràng buộc phiên bản của loader xem [Máy chủ BDS](/tutorials/bedrock/bds): loader bên thứ ba cũng chỉ hỗ trợ một khoảng phiên bản nhất định, **trước khi nâng máy chủ hãy xác nhận loader đã theo kịp**.

### 2.7 Hạ phiên bản: tổn thất dữ liệu do con người gây ra phổ biến nhất

:::warn Sau khi thế giới đã bị bản mới mở, hạ lõi tức là mất dữ liệu
"Cập nhật xong thấy plugin không tương thích, vội đổi lõi cũ về" là thao tác tự làm hại mình phổ biến nhất trong vận hành. **Lõi đổi về được, thế giới thì không chắc.**
Cách đúng là: quay lui lõi **đồng thời** dùng bản sao lưu đầy đủ trước khi cập nhật để quay lui cả thế giới; chỉ đổi jar mà không đổi thế giới rất dễ nhận về một bản lưu không mở được.
:::

Nếu sau khi cập nhật thực sự phải hạ phiên bản, thứ tự là:

1. Dừng máy chủ.
2. Đổi tên thư mục thế giới **hiện tại** (đã bị bản mới ghi lại) để giữ lại, đừng xóa thẳng —— nó là bằng chứng để truy nguyên vấn đề.
3. Giải nén bản sao lưu thế giới trước khi cập nhật, đặt lại đúng vị trí.
4. Đổi về jar lõi cũ.
5. Khởi động, kiểm tra nhật ký và bản lưu.
6. Để người chơi xác nhận công trình và vật phẩm then chốt bình thường.

## 3. Cập nhật plugin

Cập nhật plugin thường xuyên hơn cập nhật lõi, và cũng dễ gặp sự cố hơn vì **cấu trúc cấu hình thay đổi**. Thao tác cơ bản xem [Nhập môn plugin](/tutorials/java/plugins).

### 3.1 Kiểm tra bốn việc trước khi cập nhật

| Mục kiểm tra | Xem ở đâu | Không xem thì sao |
| --- | --- | --- |
| Phiên bản máy chủ được hỗ trợ | Danh sách phiên bản tương thích trên trang phát hành plugin | Tải thất bại, `/plugins` hiện chữ đỏ |
| Phiên bản Java được hỗ trợ | Trang phát hành plugin hoặc nhật ký cập nhật | Khi tải báo lỗi phiên bản lớp |
| Phụ thuộc đã đủ chưa, phiên bản đã đủ mới chưa | Requires / Dependencies trong mô tả plugin, xem [Các plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps) | Thiếu phụ thuộc cứng thì plugin tải thất bại ngay |
| Thay đổi phá vỡ tương thích trong nhật ký cập nhật | changelog / release notes trên trang phát hành | Cấu hình mất hiệu lực, dữ liệu chưa được chuyển |

Mấy phụ thuộc được dùng nhiều nhất là **Vault, PlaceholderAPI, ProtocolLib, LuckPerms**: chúng được lượng lớn plugin coi là phụ thuộc cứng hoặc mềm, trước khi cập nhật hãy xác nhận chúng có mặt và phiên bản đáp ứng yêu cầu.

### 3.2 Quy trình

1. **Dừng máy chủ** (hoặc chấp nhận rõ ràng giới hạn năng lực của hot reload, xem 3.5).
2. **Sao lưu** thư mục `plugins/<plugin-name>/`; plugin có liên quan đến cơ sở dữ liệu thì sao lưu cả cơ sở dữ liệu.
3. **Đổi tên jar cũ để giữ lại**, thêm số phiên bản.
4. **Đặt jar mới vào**.
5. **Khởi động, xem console**.
6. **`/plugins` xác nhận trạng thái** (màu đỏ nghĩa là plugin được nhận diện nhưng tải thất bại), rồi **thử lệnh của chính plugin** để xác nhận tính năng thực sự dùng được.

```powershell
# Windows
Set-Location C:\mcserver\survival\plugins
Rename-Item MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
Copy-Item "$env:USERPROFILE\Downloads\MyPlugin-1.1.0.jar" .
```

```bash
# Linux
cd /opt/mcserver/survival/plugins
mv MyPlugin-1.0.0.jar MyPlugin-1.0.0.jar.bak
cp ~/downloads/MyPlugin-1.1.0.jar .
```

```text
/plugins
```

:::note Mục màu đỏ thì xem console trước
Nguyên nhân tải thất bại chắc chắn được in ra console và `logs/latest.log`. **Mở nhật ký tìm tên plugin** nhanh hơn nhiều so với mô tả trong nhóm "plugin của tôi bị đỏ".
:::

### 3.3 Chuyển cấu hình

| Tình huống | Cách làm được đề xuất |
| --- | --- |
| Chỉ thêm mục cấu hình | Để plugin tự tạo giá trị mặc định là được, thường không cần can thiệp |
| Khóa cấu hình bị đổi tên hoặc tái cấu trúc | **Giữ bản sao cấu hình cũ**, đối chiếu nhật ký cập nhật để chuyển từng mục |
| Cấu hình bị tách thành nhiều tệp | Cũng giữ tệp cũ, chuyển theo hướng dẫn chính thức |
| Dữ liệu cần chuyển (cơ sở dữ liệu, dữ liệu người chơi) | Thực hiện theo hướng dẫn chuyển chính thức, **sao lưu cơ sở dữ liệu trước** |

:::tip Để plugin tự tạo lại cấu hình mặc định trước
So với việc gộp tay hai tệp YAML, thứ tự ổn hơn là: **để phiên bản mới tự tạo một bản cấu hình mặc định đầy đủ**, rồi đối chiếu cấu hình cũ để điền lại giá trị của mình từng mục. Gộp tay rất dễ sai ở thụt lề, khóa trùng, kiểu (chuỗi và số), mà thông báo lỗi của YAML thường rất khó hiểu.
:::

### 3.4 Ưu tiên phụ thuộc: cập nhật phụ thuộc trước

**Cập nhật phụ thuộc trước, rồi mới cập nhật plugin phụ thuộc nó.** Làm ngược lại sẽ xuất hiện `NoSuchMethodError` / `NoClassDefFoundError` kiểu "giao diện của phụ thuộc đã đổi, plugin tầng trên vẫn gọi giao diện cũ".

Tương tự, nếu một plugin được nhiều plugin coi là phụ thuộc, một lần cập nhật của nó có thể ảnh hưởng đồng thời nhiều plugin, sau khi cập nhật phải bấm thử hết các tính năng liên quan.

### 3.5 Trình quản lý plugin: làm được gì, không làm được gì

Các "plugin quản lý plugin" như PlugManX, ServerUtils có thể tải, gỡ, nạp lại plugin khác khi máy chủ đang chạy. **Ranh giới năng lực** của chúng rất rõ:

| Tình huống | Có giải quyết được bằng hot reload không |
| --- | --- |
| Chỉ sửa cấu hình | Dùng `reload` có sẵn của plugin là được |
| Tạm tắt một plugin đang gây vấn đề | Được, đây là cách dùng có giá trị nhất của hot reload |
| Đổi phiên bản plugin (đổi jar) | Không khuyến nghị, nên dừng máy chủ rồi thay |
| Plugin đã đăng ký lệnh, quyền, listener, công thức, trình sinh thế giới | Gỡ xong thường còn sót, nạp lại dễ sinh lỗi |
| Plugin giữ kết nối cơ sở dữ liệu, thread pool hoặc lượng lớn cache tĩnh | Gỡ xong tài nguyên thường không được giải phóng |
| Nạp và gỡ cùng một plugin nhiều lần | Class loader không thu hồi được, bộ nhớ tăng liên tục |
| Phía mod | Trình quản lý plugin không quản được mod |
| `/reload` gốc của máy chủ | Không khuyến nghị, dễ làm trạng thái plugin rối loạn |

:::warn Máy chủ sản xuất đừng chỉ dựa vào hot reload
Hot reload phù hợp với việc "tạm tắt một plugin xem vấn đề có biến mất không" và thử cấu hình nhanh. **Cập nhật phiên bản chính thức, thay đổi phụ thuộc thì vẫn nên đi theo quy trình dừng máy chủ rồi khởi động lại.** Quy trình tháo gỡ chi tiết hơn xem [Quản lý và tháo gỡ plugin](/tutorials/java/plugin-manage).
:::

### 3.6 Chỉ tải từ nguồn chính thức

:::warn Đừng dùng jar do bên không chính thức đăng lại
Plugin "bản Việt hóa" "bản bẻ khóa" "bản tổng hợp" trên trang tải tổng hợp, ổ đĩa mạng, tệp trong nhóm chat rất có thể đã bị đóng gói lại. **Tên tệp và số phiên bản giống nhau, nội dung có thể đã khác.**
Ưu tiên dùng trang phát hành chính thức: SpigotMC, Modrinth, Hangar, GitHub Releases của chính tác giả. Có cung cấp hash thì đối chiếu hash; plugin trả phí hãy đi theo trang mua chính thức.
:::

## 4. Cập nhật MCDR

MCDR (MCDReforged) là trình quản lý bọc bên ngoài lõi máy chủ, viết bằng Python 3. Cập nhật nó **không động vào lõi và thế giới của bạn**, rủi ro chủ yếu rơi vào **cấu hình của chính nó và plugin Python**. Khái niệm cơ bản xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr).

### 4.1 Cách cài: dùng pip, đừng dùng zip mã nguồn

MCDR đã được phát hành lên PyPI, cách cài mà tài liệu chính thức đưa ra là pip:

```bash
# Windows
pip install mcdreforged

# Linux
pip3 install mcdreforged
```

:::warn Đừng tải zip mã nguồn về chạy
Trên mạng không ít hướng dẫn bảo bạn vào GitHub tải gói nén về giải nén dùng —— **tài liệu chính thức nói rõ đó là cách làm đã lỗi thời**. MCDR từ v1.0 đầu năm 2021 đã không còn dùng cách cài từ mã nguồn. Trừ khi bạn là nhà phát triển MCDR và biết rõ mình đang làm gì, còn không hãy cài bằng pip.
:::

### 4.2 Yêu cầu phiên bản Python

Quan hệ tương ứng theo tài liệu chính thức:

| Phiên bản MCDR | Phụ thuộc Python |
| --- | --- |
| < 2.10 | >= 3.6 |
| >= 2.10 | >= 3.8 |
| >= 2.15 | **>= 3.9** |

Trước khi nâng MCDR hãy xác nhận phiên bản Python của bạn đáp ứng yêu cầu của phiên bản đích; nếu Python hệ thống quá cũ thì phải nâng Python trước (hoặc đổi sang cách dùng môi trường cách ly mà tài liệu chính thức khuyến nghị).

### 4.3 Lệnh cập nhật

**Hãy nâng cấp bằng đúng trình thông dịch đang chạy MCDR**, lệnh cụ thể tùy vào cách cài ban đầu:

```bash
# pip toàn cục (Windows, -U tức --upgrade)
pip install mcdreforged -U

# pip toàn cục (Linux)
pip3 install mcdreforged -U

# Môi trường cách ly do pipx quản lý
pipx upgrade mcdreforged

# Môi trường ảo: kích hoạt trước, rồi nâng cấp
# source venv/bin/activate        (POSIX)
# venv\Scripts\Activate.ps1       (Windows PowerShell)
pip install mcdreforged -U
```

Kiểm chứng phiên bản, đầu ra có dạng `MCDReforged v2.16.0`:

```bash
mcdreforged -V
```

:::warn Có thể bạn vừa nâng cấp bản khác với bản MCDR đang dùng
Khi trên hệ thống đồng thời có Python hệ thống, môi trường ảo, môi trường pipx thì `pip install -U` chưa chắc đã nâng đúng bản MCDR thực sự dùng —— **nâng xong `mcdreforged -V` vẫn là số phiên bản cũ, thường là vì lý do này**. Trước hết xác nhận MCDR được khởi động thế nào (trình thông dịch nào, môi trường nào), rồi nâng cấp trong chính môi trường đó.
:::

:::note Các cách cài khác
- **pipx**: nâng cấp bằng `pipx upgrade mcdreforged`; muốn cài phụ thuộc Python cho nó thì dùng `pipx inject mcdreforged <package>`.
- **Docker**: đổi tag image theo tài liệu image chính thức, cách viết cụ thể lấy chương Docker của tài liệu chính thức làm chuẩn.
- **Mạng trong nước**: có thể thêm `-i https://pypi.tuna.tsinghua.edu.cn/simple` vào lệnh để dùng mirror tăng tốc, đây là cách làm được tài liệu chính thức đưa ra.
- **Trình quản lý gói của hệ thống**: tài liệu chính thức **rất không khuyến nghị** dùng nó để cài MCDR, vì rất khó quản lý phụ thuộc của plugin.
:::

### 4.4 Trước khi nâng phiên bản lớn hãy đọc hướng dẫn chuyển đổi

Tài liệu chính thức có chương "hướng dẫn chuyển đổi" riêng, gồm hai phần **0.x sang 1.x** và **1.x sang 2.x**.

Nâng phiên bản lớn có thể thay đổi định dạng tệp cấu hình (các tùy chọn trong `config.yml` cũ bị đổi tên hoặc bỏ), API plugin (plugin MCDR phụ thuộc API cũ có thể tải thất bại hoặc hành vi bất thường), cùng lệnh và giao diện dòng lệnh (tham số khởi động, lệnh con có thể được điều chỉnh). **Nên nâng MCDR thường cũng có nghĩa là phải cập nhật cả plugin MCDR.** Trước khi nâng hãy đọc một lượt tài liệu chuyển đổi tương ứng, làm theo các bước trong đó, đừng chép lại hướng dẫn cũ theo trí nhớ.

### 4.5 Sao lưu gì trước khi nâng cấp

| Nội dung | Vị trí |
| --- | --- |
| Cấu hình của chính MCDR | `config.yml`, nằm trong **thư mục làm việc của MCDR** |
| Plugin của MCDR | Mặc định trong `plugins/`, thực tế lấy mục cấu hình `plugin_directories` làm chuẩn |
| Tệp quyền và nhật ký | Có ích khi xử lý sự cố, nên lưu trữ kèm |

:::note MCDR tự bổ sung mục cấu hình
Tài liệu chính thức nói rõ: khi khởi động MCDR sẽ nạp `config.yml`, và **nối các tùy chọn còn thiếu** vào cuối tệp cấu hình; nếu tệp cấu hình không tồn tại thì tạo cấu hình mặc định rồi thoát. Nên sau khi nâng cấp, cấu hình xuất hiện khóa mới là hiện tượng bình thường —— nhưng **đừng** vì thế mà cho rằng cấu hình cũ chắc chắn đã được chuyển đúng, vẫn phải đối chiếu hướng dẫn chuyển đổi và nhật ký cập nhật.
:::

MCDR còn có mục cấu hình `check_update` (mặc định `true`), sẽ kiểm tra cập nhật 24 giờ một lần; khi đang chạy có thể dùng `!!MCDR reload config` (viết tắt `!!MCDR r cfg`) để nạp lại cấu hình. **Tương thích plugin mới là rủi ro chính của việc nâng MCDR**, không phải bản thân MCDR.

### 4.6 Quay lui

Khi có vấn đề có thể ghim MCDR về phiên bản trước:

```bash
# Trước hết vào trang dự án mcdreforged trên PyPI xác nhận số phiên bản cụ thể muốn quay về
pip install mcdreforged==2.15.0
mcdreforged -V
```

- **Số phiên bản nhất định phải xác nhận trên PyPI**, đừng viết theo trí nhớ; môi trường pipx có thể dùng `pipx install --force mcdreforged==<version>` để cài đè (cách viết cụ thể lấy tài liệu chính thức của pipx làm chuẩn).
- Nếu khi nâng cấp đã cập nhật cả plugin MCDR thì **plugin cũng phải quay lui theo**, nếu không plugin mới đi với MCDR cũ cũng sẽ lỗi.

## 5. Danh sách kiểm tra cập nhật

| Đối tượng cập nhật | Trước khi cập nhật | Kiểm chứng sau khi cập nhật | Cách quay lui |
| --- | --- | --- | --- |
| **Lõi máy chủ** | Sao lưu đầy đủ (thế giới + cấu hình + plugin); xác nhận Java mà phiên bản đích yêu cầu; đổi tên jar cũ để giữ lại; đọc nhật ký cập nhật | Console không báo lỗi; `/plugins` bình thường; `/version` đúng; tự vào máy chủ đi một vòng; quan sát 10 đến 30 phút | Dừng máy chủ, đổi về jar cũ; nếu phiên bản mới đã khởi động thì **quay lui cả thế giới bằng bản sao lưu** |
| **Plugin** | Sao lưu `plugins/<plugin-name>/` và cơ sở dữ liệu; xác nhận phiên bản máy chủ, phiên bản Java và phụ thuộc được hỗ trợ; đọc thay đổi phá vỡ tương thích trong nhật ký cập nhật | `/plugins` không có chữ đỏ; console không có ngoại lệ như `NoSuchMethodError`; lệnh của chính plugin dùng được; bấm thử các tính năng liên quan | Dừng máy chủ, đổi `.jar.bak` cũ về tên gốc; cấu hình cũng quay lui về bản sao cũ |
| **Mod và loader** | Sao lưu `mods/` và `config/`; xác nhận loader hỗ trợ phiên bản game đích; liệt kê phiên bản đích của từng mod | Khởi động không sập; nhật ký không có lỗi lớp của mod; client vào được và không báo thiếu mod | Đổi về loader cũ và thư mục `mods/` cũ; client cũng quay lui theo |
| **MCDR** | Ghi lại phiên bản hiện tại (`mcdreforged -V`); sao lưu `config.yml` và thư mục plugin; phiên bản lớn thì đọc hướng dẫn chuyển đổi trước | `mcdreforged -V` hiện phiên bản mới; MCDR khởi động bình thường và khởi động được máy chủ; plugin MCDR tải bình thường | `pip install mcdreforged==<phiên bản cũ>` (số phiên bản lấy PyPI làm chuẩn); plugin MCDR quay lui theo |
| **Gói phần mềm hệ điều hành** | Ghi lại phiên bản hiện tại; xác nhận không nằm trong khung bảo trì; có điều kiện thì tạo snapshot hoặc ảnh hệ thống trước | Sau khi khởi động lại máy chủ tự lên được; **xác nhận Java không bị nâng theo**; cổng và quy tắc tường lửa không đổi | Dùng tính năng hạ phiên bản của bản phân phối hoặc snapshot hệ thống; khi cần thì ghim gói Java (ví dụ `apt-mark hold`) |

### Gợi ý nhịp bảo trì

**Mỗi tháng một lần** kiểm tra định kỳ lõi, plugin, mod, MCDR và gói hệ thống; **ưu tiên việc liên quan an ninh** (xác thực đăng nhập, quyền, chống gian lận có bản sửa thì theo càng sớm càng tốt); **không cần thiết thì đừng cập nhật** —— phiên bản đang chạy ổn định và không có vấn đề an ninh thì có thể để nguyên, lợi ích của cập nhật phải lớn hơn rủi ro nó mang lại; mỗi lần cập nhật **ghi lại hồ sơ** (khi nào, từ phiên bản nào sang phiên bản nào, ai làm, có quay lui không), lần sau có sự cố mới truy ngược nhanh được.

## Bước tiếp theo

- Sao lưu và khôi phục bắt buộc phải biết trước khi cập nhật: [Sao lưu và khôi phục](/tutorials/java/backup)
- Bản sao lưu phải đưa ra một bản: [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)
- Cài gỡ và tháo gỡ plugin: [Quản lý và tháo gỡ plugin](/tutorials/java/plugin-manage)
- Thích ứng plugin và cấu hình sau khi cập nhật lõi: [Cấu hình plugin](/tutorials/java/plugin-config)
- Máy chủ Bedrock và giao thức: [Máy chủ BDS](/tutorials/bedrock/bds)

> Cách cập nhật của từng phần mềm lấy tài liệu chính thức làm chuẩn.
