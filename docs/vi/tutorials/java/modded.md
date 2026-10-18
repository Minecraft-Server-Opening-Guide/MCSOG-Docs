---
title: Hướng dẫn đầy đủ máy chủ mod (Fabric / NeoForge)
slug: modded
cat: java
level: 3
order: 26
minutes: 16
tags: [mod, Fabric, NeoForge, Forge, loader mod, client và máy chủ, JVM, nhật ký sập]
updated: 2026-10-04
draft: false
---

Máy chủ plugin và máy chủ mod là hai thế giới khác nhau. Plugin "gắn thêm" chức năng vào phía máy chủ, người chơi dùng client bản gốc là vào được; mod sửa thẳng mã game, **phần lớn mod nội dung yêu cầu máy chủ và client cài cùng một bộ**, người chơi không cài là không vào được.

Bài này nói hết máy chủ mod từ số không đến mở được: chọn loader, cài máy chủ, căn khớp client, đặt mod, tìm lỗi không khớp, và những vấn đề riêng của máy chủ mod về hiệu năng, sao lưu và cập nhật. Nếu bạn còn đang phân vân "rốt cuộc mở máy chủ plugin hay máy chủ mod", xem [Chọn lõi máy chủ](/tutorials/java/core) trước.

## 1. Khác biệt giữa máy chủ plugin và máy chủ mod

| Mục so sánh | Máy chủ plugin (Paper / Purpur…) | Máy chủ mod (Fabric / NeoForge…) |
| --- | --- | --- |
| Cách mở rộng | Plugin gọi API do máy chủ cung cấp, không sửa bản thân game | Mod sửa thẳng mã game |
| Người chơi có phải cài gì không | Không cần, client bản gốc là được | Phần lớn phải cài **cùng loại loader + cùng một bộ mod** |
| Nội dung điển hình | Quản lý, minigame, kinh tế, bảo vệ lãnh thổ | Khối mới, vật phẩm mới, sinh vật mới, máy mới, chiều mới |
| Tốc độ cập nhật | Lõi cập nhật nhanh, plugin theo sát | Chậm, phụ thuộc tác giả từng mod |
| Tham số tinh chỉnh được | Cấu hình lõi + cấu hình plugin rất phong phú | Rất ít, chủ yếu dựa vào bản thân mod và JVM |
| Tìm lỗi khi có vấn đề | Xem danh sách plugin và cấu hình plugin | Xem **danh sách mod có hoàn toàn giống nhau không** và nhật ký sập |

**Cần nội dung lối chơi thì chọn mod, cần chức năng quản lý thì chọn plugin**. Phương án dùng lẫn cả hai (nền tảng lai) có tồn tại, nhưng tương thích và chi phí bảo trì đều cao hơn, không khuyến nghị người mới đụng ngay từ đầu.

### 1.1 Ba loại mod: chỉ client / chỉ máy chủ / bắt buộc cả hai

Mod không phải "cài là có ích", trước hết phải phân biệt nó thuộc loại nào, nếu không chắc chắn vấp bẫy:

| Loại | Ví dụ điển hình | Nên cài ở đâu | Cài sai thì thế nào |
| --- | --- | --- | --- |
| **Chỉ client (client-only)** | Loại render (Sodium…), bản đồ nhỏ, liên quan shader, tăng cường giao diện | Chỉ cài client | Ném sang máy chủ thường báo lỗi hoặc sập thẳng, phần lớn loader sẽ từ chối nạp |
| **Chỉ máy chủ (server-only)** | Mod logic/hiệu năng chỉ có hiệu lực phía máy chủ, một phần mod quản lý | Chỉ cài máy chủ (một số mod cài được cả hai đầu, nhưng cài ở client không có ý nghĩa) | Cài ở client thường không sập, nhưng có thể bị bắt tay phía máy chủ từ chối; máy chủ thiếu thì chức năng không tồn tại |
| **Bắt buộc cả hai (both-required)** | Mod nội dung thêm khối mới, vật phẩm mới, sinh vật mới, chiều mới, cơ chế mới | Cả client và máy chủ đều phải có | Thiếu bất kỳ bên nào: kết nối bị từ chối, hoặc registry không khớp gây báo lỗi |

Còn một loại nằm giữa hai loại trên: **cài được cả hai đầu nhưng không bắt buộc** (ví dụ mod tối ưu bộ nhớ, tối ưu mạng). Trang phát hành của loại mod này sẽ ghi rõ "tùy chọn".

### 1.2 Làm sao biết một mod thuộc loại nào

Lấy **trang phát hành và hướng dẫn của chính mod** làm chuẩn, ưu tiên từ cao xuống thấp:

| Nguồn | Xem gì |
| --- | --- |
| Trang phát hành mod (Modrinth / CurseForge) | Nhãn môi trường. Modrinth hiện dùng trường `environment` (như `client_only`, `server_only`, `client_and_server`), `client_side` / `server_side` cũ có giá trị `required` / `optional` / `unsupported` |
| README mod / thông báo của tác giả | Tác giả thường viết thẳng "server-side only", "client-side only", "required on both sides" |
| Mod Fabric | Trường `environment` trong `fabric.mod.json`: `"*"` (mặc định, tính cả hai đầu), `"client"` (client), `"server"` (máy chủ độc lập, không gồm máy chủ tích hợp chế độ một người) |
| Mod NeoForge | Metadata của `META-INF/neoforge.mods.toml`, và điểm vào được đánh dấu chỉ nạp ở client trong mã (như `dist = Dist.CLIENT`) |
:::warn Đừng áp kinh nghiệm máy chủ plugin sang máy chủ mod
- `spigot.yml`, `paper-world-defaults.yml`, cả bộ plugin Bukkit **không tồn tại** trên máy chủ mod, làm theo hướng dẫn máy chủ plugin để chỉnh máy chủ mod chỉ tốn công vô ích.
- Máy chủ mod mặc định **không cài được plugin Bukkit** (muốn cài phải dùng nền tảng lai, thuộc phương án khác).
- Tham số JVM, plugin tối ưu, thói quen nạp nóng của máy chủ plugin đều không chép được (xem mục 10).
- Ngược lại cũng vậy: đừng áp kinh nghiệm máy chủ mod sang máy chủ plugin.
:::

## 2. Chọn loader: Fabric / NeoForge / Forge

| Loader | Định vị | Phù hợp với ai |
| --- | --- | --- |
| **Fabric** | Nhẹ, khởi động nhanh, theo phiên bản mới nhanh, bản thân loader tách khỏi API | Theo đuổi hiệu năng và cập nhật nhanh, mod chủ yếu loại tối ưu + ít mod nội dung |
| **NeoForge** | Dòng dõi Forge tiếp nối trên phiên bản hiện đại, API chức năng đầy đủ hơn | Modpack nội dung lớn phiên bản hiện đại, lối chơi máy móc/công nghệ |
| **Forge** | Loader lâu đời, modpack lịch sử và phiên bản cũ vẫn dùng nhiều | Cần chạy modpack cũ, hoặc buộc phải phụ thuộc mod cũ chỉ được bảo trì trên Forge |

**Phải nhìn rõ cục diện phiên bản**: "loader hỗ trợ những phiên bản Minecraft nào" thay đổi theo thời gian, bài này không liệt kê con số cụ thể, chỉ đưa cách phán đoán:

- Fabric: trang tải chính thức cho chọn đồng thời phiên bản game và phiên bản loader, trang sẽ đưa thẳng lệnh tải và lệnh khởi động. Tài liệu chính thức của Fabric ghi rõ hỗ trợ mọi bản chính thức từ 1.14 trở đi (và snapshot từ 18w43b trở đi).
- NeoForge: trang chủ đưa tệp installer tương ứng theo phiên bản Minecraft; tài liệu chính thức có các bước cài máy chủ.
- Forge: trang tải chính thức liệt kê build latest / recommended theo phiên bản, đến nay vẫn phát hành cho nhiều phiên bản (gồm cả phiên bản khá mới); nhưng một phần đáng kể hệ sinh thái mod của phiên bản mới đã chuyển sang NeoForge.

> **Trang này tải trực tiếp được** —— lõi loader (Fabric / NeoForge / Forge) xem **[Tải tài nguyên · Lõi máy chủ](/downloads/core)**; bản thân mod xem **[Tải tài nguyên · Mod](/downloads/mods)**; nếu cuối cùng quyết định đi đường máy chủ plugin, plugin xem **[Tải tài nguyên · Plugin](/downloads/plugins)**. Cả ba nơi đều tập hợp liên kết tải từ nguồn chính thức và cộng đồng, bấm nút "Tải xuống" và làm theo hướng dẫn đăng nhập là được, **trang này không lưu trữ bất kỳ tệp nào**.
:::note Các loader cơ bản không dùng chung được
Cùng một mod thường chỉ hỗ trợ một loader. Mod của Fabric không ném được vào máy chủ NeoForge, và ngược lại. Nên **chọn loader về bản chất là chọn "các mod bạn muốn cài nằm ở phía nào"**: trước hết vào trang phát hành mod xác nhận mod mục tiêu hỗ trợ loader nào, phiên bản game nào, rồi mới quyết định cài gì.
:::

Thứ tự phán đoán khuyến nghị:

```
Chốt lối chơi trước (cần những mod nào) → tra loader và phiên bản game mà các mod đó hỗ trợ
  → lấy loader + phiên bản game có giao lớn nhất → rồi cài máy chủ
```

## 3. Cài loader trên máy chủ

Giao diện installer và tên tệp thay đổi theo phiên bản, nên dưới đây chỉ nói **quy trình chung**, cách làm chính xác từng bước lấy tài liệu chính thức của loader làm chuẩn.

### 3.1 Xác nhận phiên bản Java trước

| Phiên bản Minecraft | Java cần |
| --- | --- |
| 1.16.5 trở về trước | 8 |
| 1.17.2 | 16 |
| 1.18.2 – 1.20.4 | 17 |
| 1.20.5 trở về sau | 21 |

Cài sai phiên bản Java là nguyên nhân phổ biến nhất của "installer không mở được/máy chủ không khởi động được", loại trừ nó trước.

### 3.2 Quy trình chung

1. Tạo một thư mục trống làm thư mục gốc máy chủ.
2. Vào trang tải chính thức của loader chọn phiên bản Minecraft và phiên bản loader, tải installer (`.jar`).
3. Chạy installer, chọn cách cài **máy chủ (Server)**. Cách dòng lệnh thường là thêm tham số `--installServer`.
4. Installer sẽ tạo ra một **script khởi động hoặc jar khởi động** (cùng thư mục thư viện cần để chạy).
5. **Khởi động một lần trước**. Lần khởi động đầu sẽ sinh `eula.txt`, `server.properties`, `mods/`, `config/`, `logs/`… rồi thoát vì chưa đồng ý EULA.
6. Mở `eula.txt`, đổi `eula=false` thành `eula=true` (biểu thị bạn đồng ý Minecraft EULA).
7. **Khởi động lại**, xác nhận máy chủ lên bình thường, console không có lỗi.
8. Lúc này mới bỏ mod vào `mods/`, rồi khởi động lại.

### 3.3 Fabric

- Trang tải máy chủ chính thức (trang server của fabricmc.net) cho chọn phiên bản, và đưa lệnh tải cùng lệnh khởi động; cứ theo **tên tệp và lệnh khởi động** hiển thị trên trang mà thực thi.
- Installer có tab Server, dùng để tạo trình khởi động máy chủ tại máy local.
- Phần lớn mod Fabric cần **Fabric API**, nó cũng là một mod, bỏ vào `mods/`.

```bash
# trang chính thức sẽ đưa lệnh tải và lệnh khởi động tương tự thế này, xin lấy hiển thị thực tế trên trang làm chuẩn
# 1) tải trình khởi động máy chủ
# 2) khởi động lần đầu
java -jar <tên-tệp-khởi-động-máy-chủ> nogui
```

### 3.4 NeoForge

Quy trình tài liệu chính thức của NeoForge đưa ra (lấy dòng 21.x làm ví dụ):

```bash
# 1) tải installer (số phiên bản theo trang chủ)
wget https://maven.neoforged.net/releases/net/neoforged/neoforge/<phiên bản>/neoforge-<phiên bản>-installer.jar

# 2) cài máy chủ
java -jar neoforge-<phiên bản>-installer.jar --installServer

# 3) khởi động lần đầu (sẽ thoát vì EULA)
./run.sh        # Windows dùng run.bat
```

Điểm chính:

- Sau khi cài sẽ sinh `run.sh` / `run.bat` và **`user_jvm_args.txt`**. **Muốn đổi bộ nhớ thì sửa `user_jvm_args.txt`, đừng sửa tay `run.sh`**.
- Sau lần khởi động đầu sẽ có thư mục `mods`, mod bỏ vào đây.
- Cập nhật NeoForge chỉ cần dùng installer phiên bản mới chạy lại đúng lệnh đó; chính thức nhắc rõ: **sao lưu thế giới trước khi cập nhật**.

### 3.5 Forge (phiên bản cũ / modpack cũ)

```bash
java -jar forge-<phiên bản>-installer.jar --installServer
```

- Forge mới hơn giống NeoForge, sẽ sinh `run.sh` / `run.bat` và `user_jvm_args.txt`.
- Phiên bản cũ hơn sẽ sinh một `forge-<phiên bản>.jar` khởi động được trực tiếp, khởi động bằng `java -jar`.
- Mod của phiên bản cũ thường chỉ được bảo trì trên Forge, khi đó không có nhiều lựa chọn.
:::tip Không khởi động được thì xem nhật ký trước
Cài loader thất bại, mod sập, nhật ký đều ở trong `logs/latest.log`, `logs/debug.log` và `crash-reports/`. Cách định vị xem [Lỗi thường gặp và tìm nguyên nhân sập](/tutorials/faq/errors).
:::

## 4. Phía client: người chơi bắt buộc cài cùng một bộ

"Không vào được" ở máy chủ mod phần lớn không phải vấn đề mạng, mà là **danh sách mod của client và máy chủ không khớp nhau**.

Cách đúng của người chơi:

1. Cài **cùng một loader**, và **cùng một phiên bản Minecraft**.
2. Cài **cùng một bộ mod** (gồm mọi phụ thuộc, ví dụ Fabric API).
3. Phiên bản mod cũng phải căn khớp (xem mục 6).

### 4.1 Vì sao danh sách không khớp là không vào được

Khi vào máy chủ, client và máy chủ sẽ "bắt tay" một lần: trao đổi thông tin loader, danh sách mod và một phần nội dung registry. Chỉ cần xảy ra bất kỳ tình huống nào dưới đây là bị từ chối hoặc báo lỗi thẳng:

- Mod **bắt buộc cả hai** mà máy chủ có, client không có;
- Mod cùng loại mà client có, máy chủ không có;
- Cùng một mod nhưng **phiên bản khác nhau**;
- Thiếu mod phụ thuộc.

### 4.2 Người chơi sẽ thấy gì

| Loader | Biểu hiện |
| --- | --- |
| NeoForge / Forge | Kết nối bị từ chối, và hiện ra một **giao diện liệt kê các mod bị từ chối** (cộng đồng thường gọi "mod rejections" / giao diện mod không tương thích), đưa lý do từng mục, ví dụ "máy chủ không có mod này" "phiên bản không khớp". Nội dung chữ và bố cục cụ thể thay đổi theo phiên bản |
| Fabric | Khi giai đoạn nạp thiếu phụ thuộc, loader sẽ đưa giao diện lỗi kiểu "Incompatible mod set!", và liệt kê mod thiếu/xung đột trong nhật ký; tài liệu chính thức của Fabric có trang riêng về báo cáo sập và ghi đè phụ thuộc |
:::tip Cách giúp người chơi đỡ vấp
- Đóng gói `mods/` phía client thành tệp nén gửi cho người chơi, hoặc phát hành gói client và gói máy chủ trên nền tảng modpack.
- Ghi rõ trong thông báo nhóm: loader, phiên bản Minecraft, phiên bản loader, số phiên bản của danh sách mod.
- Sau khi máy chủ cập nhật mod, **cập nhật gói client cùng lúc**, nếu không client cũ sẽ lập tức không vào được.
:::

## 5. Đặt mod ở đâu

> **Tìm mod ở đâu** —— trang này tập hợp các mục mod trên Modrinth, xem **[Tải tài nguyên · Mod](/downloads/mods)**, lọc được theo loader (Fabric / Forge / NeoForge / Quilt) và phiên bản game, bấm nút "Tải xuống" và làm theo hướng dẫn đăng nhập là có liên kết tải chính thức. Trước khi đặt vào nhất định phải xác nhận nó thuộc loại "chỉ client / chỉ máy chủ / bắt buộc cả hai" nào (xem [1.1](#11-三类模组仅客户端--仅服务端--双端必需)).

| Vị trí | Giải thích |
| --- | --- |
| `mods/` phía máy chủ | Toàn bộ mod máy chủ nạp (`.jar`) |
| `.minecraft/mods/` phía client | Toàn bộ mod client người chơi nạp |
| `config/` | Tệp cấu hình của chính mod, phần lớn sinh ra **sau lần khởi động đầu**, không nằm trong `mods/` |
| `defaultconfigs/` | Thư mục mà một số loader/modpack dùng để đặt "cấu hình mặc định cho thế giới mới" |
:::warn Mod chỉ client đừng đặt ở máy chủ, và ngược lại
Đây là một trong những nguyên nhân sập phổ biến nhất của máy chủ mod:

- Ném **mod chỉ client** loại render/giao diện vào `mods/` của máy chủ, máy chủ khởi động là báo lỗi thậm chí sập (máy chủ không có lớp phía client).
- Đưa **mod chỉ máy chủ** cho client, nhẹ thì vô dụng, nặng thì vì thiếu lớp mà client sập.
- Chỉ cài một nửa **mod bắt buộc cả hai**, kết quả là người chơi không kết nối được.

Cách phán đoán quay về mục 1.2: lấy nhãn môi trường trên trang phát hành mod và hướng dẫn của tác giả làm chuẩn.
:::

## 6. Quy tắc khớp ba bên

Máy chủ mod có chạy được không phụ thuộc vào ba thứ khớp nhau cùng lúc:

| Mục khớp | Yêu cầu |
| --- | --- |
| Phiên bản game | Máy chủ, client, từng mod đều phải hỗ trợ cùng một phiên bản Minecraft |
| Phiên bản loader | Client và máy chủ dùng cùng một loader; phiên bản loader cố gắng giống nhau (ít nhất đều trong khoảng mod yêu cầu) |
| Phiên bản mod | Cùng một mod ở hai đầu bắt buộc **cùng phiên bản**; mod phụ thuộc phải tồn tại và thỏa khoảng phiên bản |

### 6.1 Chẩn đoán không khớp từ nhật ký

| Hiện tượng/đầu mối nhật ký | Ý nghĩa | Cách xử lý |
| --- | --- | --- |
| Khởi động là sập, báo cáo sập liệt kê tên một mod | Mod đó không tương thích phiên bản game/loader hiện tại, hoặc thiếu phụ thuộc | Đổi sang phiên bản tương ứng, hoặc bổ sung phụ thuộc |
| Nhật ký hiện "missing dependency" / phân giải phụ thuộc thất bại | Phụ thuộc mod khai báo chưa cài hoặc phiên bản không khớp | Theo nhật ký bổ sung phụ thuộc |
| Nhật ký hiện nạp mod thất bại, không tìm thấy lớp | Thường là đặt mod chỉ client sang máy chủ (hoặc ngược lại) | Gỡ khỏi phía sai |
| Người chơi bị từ chối kết nối, giao diện liệt kê mod | Danh sách/phiên bản hai đầu không khớp | Căn khớp mod hai đầu |
| Trong báo cáo sập có `Is Modded: Definitely; ... brand changed to 'fabric'/'neoforge'` | Chỉ cho biết đang là môi trường mod, bản thân không phải lỗi | Đọc tiếp xuống stack ngoại lệ thật sự |

Ngữ nghĩa phụ thuộc (đặc tả Fabric, NeoForge tương tự):

| Khai báo | Ý nghĩa |
| --- | --- |
| `depends` | Phụ thuộc cứng, thiếu là thất bại thẳng |
| `recommends` | Phụ thuộc mềm, thiếu chỉ cảnh báo |
| `conflicts` / `breaks` | Xung đột, khớp là báo lỗi |

### 6.2 Không tìm ra mod nào đang gây rối

Dùng **cách chia đôi** (cách được tài liệu chính thức của NeoForge khuyến nghị):

1. Dời một nửa mod ra khỏi `mods/` (chú ý giữ phụ thuộc đầy đủ).
2. Khởi động, xem vấn đề còn không.
3. Còn → tiếp tục chia đôi nửa hiện tại; không còn → đổi nửa kia vào thử.
4. Lặp đến khi định vị được mod cụ thể.

## 7. Mod hiệu năng (nhận biết theo loại)

Tối ưu hiệu năng máy chủ mod chủ yếu dựa vào "cài đúng mod", chứ không phải chỉnh tệp cấu hình. Những cái dưới đây là loại xác nhận được là có tồn tại và được dùng rộng rãi (tình trạng hỗ trợ loader lấy từ trang dự án của từng cái, sẽ thay đổi theo phiên bản, trước khi cài hãy xác nhận lại một lần):

| Loại | Mod | Tác dụng | Loader | Ghi chú |
| --- | --- | --- | --- | --- |
| Tối ưu logic game | **Lithium** | Tối ưu hiệu năng logic game (sinh quái, AI, hành vi khối…), cố gắng không đổi hành vi | Fabric, NeoForge, Quilt | Cài được cả hai đầu, lợi ích phía máy chủ rõ rệt |
| Mức chiếm bộ nhớ | **FerriteCore** | Giảm mức chiếm bộ nhớ (cấu trúc dữ liệu như trạng thái khối) | Fabric, Forge, NeoForge, Quilt | Rất thực dụng với máy chủ mod thiếu bộ nhớ |
| Tối ưu mạng | **Krypton** | Tối ưu tầng mạng, giảm băng thông và chi phí CPU | Fabric | Chủ yếu hướng tới máy chủ và chơi nhiều người |
| Động cơ ánh sáng | **Starlight** | Viết lại động cơ ánh sáng, sửa hiệu năng và lỗi ánh sáng | Fabric | Dự án đã lưu trữ, hỗ trợ cao nhất đến 1.20.4; hướng dẫn của nó cũng ghi trên 1.20 khoảng cách với bản gốc đã rất nhỏ. **Phiên bản mới đừng gượng cài** |
| Tạo trước chunk | **Chunky** | Tạo chunk trước, giảm lag khi người chơi chạy bản đồ | Fabric, Forge, NeoForge, và cả Paper/Spigot… | Máy chủ mở lâu dài gần như bắt buộc |
| Render phía client | **Sodium** | Tối ưu render phía client (tăng FPS) | Fabric, NeoForge, Quilt | **Chỉ client**, máy chủ đừng cài |
:::note Hai kỷ luật về "mod tối ưu"
- **Đừng cài đồng thời nhiều mod tối ưu trùng chức năng** (ví dụ hai bản viết lại ánh sáng), xác suất chúng xung đột với nhau rất cao.
- Mod tối ưu sẽ thay đổi hành vi bên trong game, **máy chủ kỹ thuật redstone/máy chính xác phải thận trọng**: thà chậm một chút, còn hơn để máy mất hiệu lực.
:::

## 8. Tương thích thế giới và dữ liệu: xóa mod là không thể đảo ngược

Khối, vật phẩm, thực thể, chiều, quần xã sinh vật do mod thêm đều được ghi vào bản lưu thế giới. **Sau khi gỡ mod, dữ liệu tương ứng với những nội dung này vẫn còn trong bản lưu, nhưng game đã không còn nhận ra chúng**:

- Nhẹ thì thành "khối thiếu/thực thể rỗng", trông như không khí, thực tế dữ liệu vẫn còn;
- Nặng thì nạp chunk báo lỗi, thậm chí làm bản lưu không mở được;
- Khi cài lại **cùng một mod và phiên bản tương thích**, thường khôi phục được.
:::warn Sao lưu trước, rồi mới động vào mod
- Trước mọi thao tác "thêm mod, xóa mod, đổi loader, đổi phiên bản game", **sao lưu đầy đủ thư mục thế giới trước** (cách sao lưu xem [Sao lưu và khôi phục](/tutorials/java/backup)).
- Bản lưu của máy chủ mod **không hạ cấp trực tiếp được**: đem thế giới của máy chủ mod mở bằng bản gốc hoặc phiên bản thấp hơn, rủi ro rất cao.
- Muốn "cài thử một mod xem sao"? Hãy thử trên **bản sao**, đừng thử trên bản lưu chính thức.
:::

## 9. Cập nhật an toàn máy chủ mod / modpack

Quy trình khuyến nghị (thứ tự đừng bỏ):

1. **Sao lưu**: thế giới + `config/` + danh sách mod.
2. **Đóng băng thay đổi**: tắt máy chủ trước, hoặc làm trong cửa sổ bảo trì.
3. **Cập nhật loader trước**, khởi động một lần xác nhận bản thân máy chủ không vấn đề (lúc này mod cũ có thể báo lỗi, là bình thường).
4. **Cập nhật từng mod một**, đừng đổi hết một lần. Cập nhật theo lô tiện định vị mod có vấn đề.
5. **Căn khớp gói client**: đóng gói lại và phát hành `mods/` (phía client) đã cập nhật.
6. **Quan sát**: sau khi lên máy chủ xem `logs/latest.log` có bất thường không, chạy trực tuyến một thời gian rồi xem TPS và lỗi (dùng được cách trong [Tối ưu hiệu năng](/tutorials/java/optimize)).
7. **Giữ gói quay lui**: giữ thư mục máy chủ và gói client của phiên bản trước, có vấn đề lùi lại ngay được.

## 10. Bộ nhớ và tham số JVM

Đặc điểm bộ nhớ của máy chủ mod và máy chủ plugin không giống nhau:

| Mục | Máy chủ plugin | Máy chủ mod |
| --- | --- | --- |
| Nhu cầu bộ nhớ heap | Tương đối thấp | **Cao hơn rõ rệt**: registry mod, model, công thức, dữ liệu máy đều ăn bộ nhớ |
| Thời gian khởi động | Ngắn | Dài (với vài trăm mod, khởi động vài phút là thường) |
| Nút thắt chính | Luồng chính + chất lượng plugin | Luồng chính + chất lượng mod + bộ nhớ/GC |
| Nguồn tham số | Tổ hợp được khuyến nghị trong tài liệu chính thức của lõi | **Hướng dẫn của tệp khởi động do chính loader cung cấp** |

Gợi ý thực hành:

- **Cấp đủ bộ nhớ nhưng đừng quá mức**. Heap mở quá lớn, thời gian dừng GC lại dài ra; trước hết cấp một giá trị hợp lý theo số người chơi thực tế và quy mô mod (ví dụ máy chủ mod nhỏ bắt đầu 4–8 GB, chỉnh dần), rồi quan sát.
- NeoForge / Forge mới hơn: sửa `user_jvm_args.txt` (sinh ra khi cài, trong tệp có sẵn chú thích), đừng sửa tay `run.sh`.
- Cách khởi động khác: dùng `-Xms` / `-Xmx` trong script khởi động chỉ định bộ nhớ.
- **Đừng chép tổ hợp tham số của máy chủ plugin**. Tổ hợp thiết kế cho Paper/Spigot giả định tải và hành vi GC khác; máy chủ mod hãy ưu tiên tham khảo tài liệu chính thức của loader và hướng dẫn của tác giả mod.
- Tham số chỉ giải quyết vấn đề tầng bộ nhớ/GC, **không cứu được nút thắt đơn nhân**, cũng không cứu được mod viết quá kém.

```bash
# minh họa: viết tham số bộ nhớ trong script khởi động hoặc user_jvm_args.txt
# giá trị cụ thể chỉnh theo quy mô mod và số người chơi của bạn
-Xms4G
-Xmx8G
```

## 11. Bảng tra nhanh khi tìm lỗi

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Máy chủ khởi động là sập, nhật ký điểm tên một mod | Phiên bản mod không khớp game/loader, hoặc thiếu phụ thuộc | Đổi phiên bản tương ứng, bổ sung phụ thuộc |
| Giao diện/nhật ký báo "Incompatible mod set!" hoặc liệt kê mod bị từ chối | Danh sách mod hoặc phiên bản hai đầu không khớp | Căn khớp mod và phiên bản hai đầu |
| Sau khi xóa mod, trong thế giới xuất hiện khối/thực thể thiếu | Dữ liệu mod còn sót, game không còn nhận ra | Cài lại phiên bản tương thích để khôi phục; **sao lưu trước**, đừng tiếp tục ghi vào bản lưu |
| Người chơi không vào được, máy chủ không báo lỗi rõ ràng | Client thiếu mod/thiếu phụ thuộc/phiên bản khác | Để người chơi dùng cùng một gói client |
| Máy chủ lên được nhưng rất lag | Bản thân mod hiệu năng kém, quá nhiều thực thể/máy, thiếu bộ nhớ | Dùng profiler định vị (xem [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark)), rồi xử lý có mục tiêu |
| Khởi động kẹt ở nạp mod rất lâu | Nhiều mod, lần đầu sinh cấu hình, đĩa chậm | Là hiện tượng bình thường; dùng SSD, và kiên nhẫn đợi |
| Cài mod chỉ client vào máy chủ | Máy chủ thiếu lớp phía client | Gỡ khỏi `mods/` của máy chủ |

## Kết luận

Độ phức tạp của máy chủ mod đến từ một quy tắc sắt "hai đầu phải giống nhau": **chốt lối chơi và phiên bản trước, rồi cài loader, cuối cùng mới thêm mod**. Mỗi lần thêm một mod thì khởi động một lần, mỗi lần động vào mod thì sao lưu trước, tiết kiệm được rất nhiều thời gian làm lại.

Bài đọc liên quan:

- Chọn lõi và lối chơi: [Chọn lõi máy chủ](/tutorials/java/core)
- Con đường tương ứng của máy chủ plugin (so sánh sẽ rõ hơn): [Nhập môn plugin](/tutorials/java/plugins), [Cơ bản cấu hình plugin](/tutorials/java/plugin-config)
- Hiệu năng và tìm lỗi: [Tối ưu hiệu năng](/tutorials/java/optimize), [Lỗi thường gặp và tìm nguyên nhân sập](/tutorials/faq/errors), [Phân tích hiệu năng máy chủ bằng spark](/tutorials/ops/spark)
- Vận hành lâu dài: [Giám sát và cảnh báo](/tutorials/ops/monitoring)

> Phiên bản loader, tương thích mod và tên khóa cấu hình lấy tài liệu chính thức của từng bên làm chuẩn.

## Tài nguyên liên quan

- [Tải tài nguyên · Lõi máy chủ](/downloads/core) —— bản build chính thức của lõi loader như Fabric / NeoForge / Forge.
- [Tải tài nguyên · Mod](/downloads/mods) —— mục mod trên Modrinth, lọc được theo loader và phiên bản game.
- [Tải tài nguyên · Plugin](/downloads/plugins) —— plugin máy chủ (gồm plugin MCDR); đường máy chủ plugin xem [Nhập môn plugin](/tutorials/java/plugins).

Cả ba nơi trên đều tập hợp liên kết tải từ nguồn chính thức và cộng đồng, bấm nút "Tải xuống" và làm theo hướng dẫn đăng nhập là được, **trang này không lưu trữ bất kỳ tệp nào**.
