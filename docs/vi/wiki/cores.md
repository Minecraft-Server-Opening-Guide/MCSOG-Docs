---
title: Đối chiếu lõi, plugin và trình tải
slug: cores
cat: wiki
level: 2
order: 5
minutes: 14
tags: [lõi, plugin, mod, trình tải, paper, fabric, bedrock]
updated: 2026-10-04
draft: false
---

Bước đầu tiên khi mở máy chủ là chọn "chạy cái gì". Bước này dễ chọn sai vì bốn từ **lõi, plugin, mod, trình tải** thường bị dùng lẫn lộn. Trang này đặt chúng cạnh nhau để đối chiếu: họ lõi và trình tải mod của Java Edition, lõi chính thức và bên thứ ba của Bedrock, trình tải cộng đồng cho BDS, cuối cùng đưa ra một lối phán đoán "tôi nên chọn cái nào".

> Mỗi dự án hỗ trợ những phiên bản trò chơi nào, hỗ trợ đến mức nào, **đều thay đổi theo thời gian**: lõi sẽ ngừng bảo trì, trình tải sẽ đuổi theo phiên bản mới, plugin sẽ mất tác giả. Bài này chỉ đưa ra đối chiếu "họ và định vị", **khoảng phiên bản cụ thể và trạng thái hỗ trợ lấy theo kho và tài liệu chính thức của từng dự án làm chuẩn**.

## 1. Trước tiên tách bốn từ

| Từ | Là gì | Hình thái điển hình | Người chơi có phải cài gì không |
| --- | --- | --- | --- |
| Lõi (máy chủ) | Chương trình chạy thế giới, chạy logic | `paper-x.jar`, `bedrock_server.exe` | Không |
| Plugin | Gọi API do lõi cung cấp để mở rộng chức năng | Tệp jar hoặc phar bỏ vào `plugins/` | Không, client bản gốc là được |
| Mod | Sửa trực tiếp mã của bản thân trò chơi | Tệp jar bỏ vào `mods/` | **Phần lớn mod nội dung yêu cầu client cài cùng bộ** |
| Trình tải | Khung cho phép mod được nạp và chạy | Fabric, NeoForge, Forge, Quilt | Cả client và máy chủ đều phải cài |

Phân biệt trong một câu: **plugin thêm chức năng từ bên ngoài máy chủ, mod sửa nội dung từ bên trong trò chơi.** Khác biệt này quyết định người chơi có phải cài thêm hay không, và cũng quyết định mọi cách chẩn đoán lỗi về sau của bạn.

## 2. Lõi máy chủ Java Edition

Lõi của Java Edition là một chuỗi nhánh rõ ràng: Bukkit → Spigot → Paper → Purpur / Folia / Leaves / Leaf. **Khả năng tương thích plugin phần lớn được thừa hưởng theo nguồn**: plugin tương thích Paper thường cũng tương thích Purpur, nhưng chiều ngược lại thì không chắc.

| Lõi | Đặc điểm | Tương thích plugin | Phù hợp với ai |
| --- | --- | --- | --- |
| Vanilla (bản gốc) | Máy chủ chính thức, chỉ hỗ trợ gói dữ liệu; không cài bất kỳ thứ bên thứ ba nào | Không hỗ trợ plugin | Muốn kiểm chứng hành vi bản gốc, chạy cách chơi thuần bản gốc |
| Spigot | Tiếp nối của Bukkit, cũng là nguồn của Paper; nhịp cập nhật chậm hơn | Hệ sinh thái lớn, nhiều plugin cũ lấy nó làm chuẩn | Tình huống cần tương thích plugin cũ và không muốn dùng Paper |
| Paper | Nhánh Spigot; tối ưu chunk bất đồng bộ, thực thể và mạng chín muồi nhất | **Hệ sinh thái lớn nhất**, lựa chọn đầu tiên của tuyệt đại đa số plugin | **Lựa chọn đầu tiên khi mở máy chủ lần đầu**: ổn định, nhiều tài liệu, hiệu năng đủ |
| Purpur | Nhánh Paper, cung cấp rất nhiều công tắc cách chơi | Tương thích plugin Paper | Muốn tinh chỉnh cơ chế bản gốc mà không muốn viết mã |
| Folia | Nhánh Paper, đa luồng theo vùng | **Tương thích kém**: phần lớn plugin chưa thích ứng, cần hỗ trợ riêng | Máy nhiều nhân, xung nhịp thấp; **không phù hợp với kỹ thuật redstone** |
| Leaves | Nhánh Paper, mục tiêu là sửa lại đặc tính bản gốc bị tối ưu hiệu năng làm hỏng | Tương thích plugin Paper (lấy hướng dẫn của từng bên làm chuẩn) | **Kỹ thuật redstone (hướng kỹ thuật) + muốn dùng plugin** |
| Leaf | Nhánh Paper, theo đuổi cân bằng giữa hiệu năng, cơ chế bản gốc và độ ổn định | Tương thích plugin Paper (lấy hướng dẫn của từng bên làm chuẩn) | Muốn cân bằng hiệu năng và cảm giác bản gốc, nhưng không cần toàn bộ đặc tính của Leaves |

Ba lưu ý:

1. **Leaves và Leaf là hai dự án khác nhau**, tên chỉ khác một chữ cái. Khi tra tài liệu, tải lõi hãy nhìn kỹ chính tả, đừng cài nhầm.
2. **Folia không phải "Paper nhanh hơn"**. Nó chia thế giới thành các vùng để điều phối song song, hành vi tương tác giữa các vùng khác Paper; plugin chưa thích ứng sẽ báo lỗi ngay hoặc chạy bất thường. Trước khi chọn nó hãy xác nhận plugin bạn định dùng có tuyên bố hỗ trợ Folia hay không.
3. **Bản gốc chỉ hỗ trợ gói dữ liệu (Data Pack)**. Muốn dùng plugin thì phải đổi lõi, muốn dùng mod thì phải đổi trình tải.

### 2.1 Quan hệ kế thừa nhánh

Ghi nhớ chuỗi này là có thể tự phán đoán một nửa vấn đề tương thích plugin:

```text
Bukkit (API máy chủ sớm nhất)
  +- Spigot (kế thừa Bukkit)
       +- Paper (nhánh chính, hệ sinh thái plugin lớn nhất)
            +- Purpur (nhiều công tắc lối chơi nhất)
            +- Folia (đa luồng theo vùng, tương thích plugin kém)
            +- Leaves (khôi phục đặc tính bản gốc, hướng kỹ thuật)
            +- Leaf (cân bằng giữa hiệu năng / cơ chế bản gốc / độ ổn định)
```

Quy tắc là **tương thích xuống dưới, không bảo đảm lên trên**: plugin viết cho Paper thường chạy được trên Purpur; plugin viết cho Folia không nhất định thích ứng cho Paper; plugin cũ chỉ hỗ trợ Spigot trên Paper nói chung vẫn chạy được, nhưng có thể báo "đã dùng API lỗi thời".

Đối chiếu chi tiết từng mục và "chọn theo phần cứng như thế nào" xem ở [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7); hướng dẫn chọn đầy đủ theo cách chơi và phần cứng xem ở [Chọn lõi máy chủ](/tutorials/java/core).

## 3. Trình tải mod cho Java Edition

Máy chủ mod và máy chủ plugin là hai thế giới khác nhau. Trình tải quyết định bạn cài được những mod nào, và **cùng một mod thường chỉ hỗ trợ một trình tải**.

| Trình tải | Định vị | Hệ sinh thái | Nhịp phiên bản |
| --- | --- | --- | --- |
| Fabric | Nhẹ, khởi động nhanh; bản thân trình tải tách khỏi API, nhiều chức năng phải nhờ mod Fabric API bổ sung | Sôi động; nhiều mod tối ưu và mod nội dung nhẹ | Theo kịp phiên bản mới nhanh nhất |
| NeoForge | Dòng dõi Forge tiếp nối trên phiên bản hiện đại; API chức năng đầy đủ hơn | Lực lượng chính của modpack nội dung lớn và kỹ thuật trên phiên bản hiện đại | Tiến theo phiên bản chính |
| Forge | Trình tải lâu đời; modpack lịch sử và phiên bản cũ dùng rất nhiều | Modpack cũ nhiều nhất; hệ sinh thái phiên bản mới có phần đáng kể chuyển sang NeoForge | Vẫn phát hành bản dựng cho nhiều phiên bản, nhưng theo kịp phiên bản mới không bằng hai bên trên |
| Quilt | Tách nhánh từ Fabric, mục tiêu là quản trị cởi mở hơn và API mới | Nhỏ hơn Fabric rõ rệt; nạp được khá nhiều mod Fabric, nhưng **không phải tất cả** | Mức độ sôi động thấp hơn Fabric, trước khi chọn hãy xác nhận mod bạn cần có hay không |

Thứ tự phán đoán nên là **định cách chơi trước, định trình tải sau**:

```text
Liệt kê các mod bạn không thể thiếu
  -> xem mỗi mod hỗ trợ loader và phiên bản game nào
  -> chọn tổ hợp có giao lớn nhất
  -> rồi mới cài máy chủ
```

Làm ngược lại (cài trình tải trước rồi tìm mod) gần như chắc chắn phải làm lại. Quy trình cài đặt, căn chỉnh client và chẩn đoán xem ở [Bắt đầu đầy đủ với máy chủ mod (Fabric / NeoForge)](/tutorials/java/modded).

### 3.1 Đừng quên phiên bản môi trường chạy

Lõi và trình tải đều yêu cầu môi trường chạy Java tương ứng. Cài sai Java là nguyên nhân phổ biến nhất của "trình khởi động không mở được, máy chủ không khởi động được":

| Phiên bản Minecraft | Java thường cần |
| --- | --- |
| 1.16.5 và sớm hơn | 8 |
| 1.17.2 | 16 |
| 1.18.2 – 1.20.4 | 17 |
| 1.20.5 và mới hơn | 21 |

Bảng này là **tương ứng thông thường tại thời điểm viết**, phiên bản mới có thể nâng yêu cầu bất cứ lúc nào; lấy tài liệu chính thức của lõi và trình tải làm chuẩn.

### 3.2 Client cũng phải cài trình tải

Một hiểu lầm phổ biến về máy chủ mod là "cài xong phía máy chủ là được". Thực tế:

| Loại mod | Cài ở đâu | Hậu quả khi cài sai |
| --- | --- | --- |
| Chỉ client (kết xuất, bản đồ nhỏ, tăng cường giao diện) | Chỉ cài client | Bỏ sang máy chủ thường báo lỗi ngay hoặc bị trình tải từ chối |
| Chỉ máy chủ (logic và hiệu năng) | Chỉ cài máy chủ | Client cài cũng vô nghĩa; máy chủ thiếu thì chức năng không tồn tại |
| Bắt buộc hai phía (khối mới, vật phẩm mới, chiều không gian mới) | Cả client + máy chủ | Thiếu bất kỳ bên nào: kết nối bị từ chối, hoặc báo lỗi do registry không khớp |

Nên khi phát hành modpack, **phải đưa ra cả hai danh sách client và máy chủ**, và ghi rõ trong hướng dẫn những mod nào là tùy chọn.

## 4. Proxy: không phải lõi, nhưng thường xuất hiện khi chọn máy chủ

Proxy tự nó không chạy thế giới, chỉ chuyển tiếp người chơi tới máy chủ con phía sau. Nó thuộc thành phần của "cấu trúc nhiều máy chủ", **máy chủ đơn không cần nó**.

| Proxy | Định vị | Ghi chú |
| --- | --- | --- |
| Velocity | Proxy hiện đại, hiệu năng tốt, sôi động | Lựa chọn chính cho kết nối nhiều máy chủ con |
| BungeeCord | Proxy lâu đời | Hệ sinh thái cũ, nhiều tài liệu, dự án mới thường ưu tiên Velocity |

Sau khi thêm proxy, đường kết nối của người chơi thành "client → proxy → máy chủ con phía sau", plugin phải phân biệt "cài ở proxy" hay "cài ở phía sau", plugin đa phiên bản cài ở phía nào cũng có cái giá khác nhau. Xem chi tiết ở [Tương thích đa phiên bản](/tutorials/java/via) và các hướng dẫn liên quan đến proxy.

## 5. Bedrock: lõi chính thức và lõi bên thứ ba

Hệ sinh thái lõi của Bedrock nhỏ hơn Java Edition, phổ biến là bốn cái.

| Lõi | Ngôn ngữ | Hệ sinh thái plugin | Ghi chú |
| --- | --- | --- | --- |
| BDS (chính thức) | C++ | **Bản thân không hỗ trợ plugin**, phải nhờ trình tải cộng đồng | Máy chủ chính thức, tương thích tốt nhất; tính toán sinh vật dồn trên đơn luồng, độ mượt chủ yếu nhìn hiệu năng đơn nhân |
| Nukkit | Java | Hệ thống plugin nguyên bản, hệ sinh thái nhỏ hơn | Nhẹ, dễ bắt đầu; **dự án gốc đã ngừng hoạt động**, thực tế nên ưu tiên nhánh còn hoạt động |
| PowerNukkitX | Java | Tương thích rất nhiều plugin của hệ sinh thái Nukkit, hệ sinh thái trung bình | Nhánh chủ lực hiện đại của Nukkit: hỗ trợ giao thức mới hơn, tối ưu đa nhân, chiều cao thế giới 384 ô, trình tạo địa hình Terra tích hợp |
| PocketMine-MP | PHP | **Lớn nhất** (plugin PHP nhiều nhất) | Biết PHP là viết được plugin; tải cao có điểm nghẽn hiệu năng, cập nhật tương đối chậm |

Kinh nghiệm chọn:

- **Cần tương thích và ổn định chính thức**: BDS, khi cần plugin thì bổ sung trình tải cộng đồng;
- **Cần hiệu năng cao và tùy biến sâu**: PowerNukkitX;
- **Cần nhiều plugin có sẵn nhất và quen PHP**: PocketMine-MP;
- **Muốn bắt đầu từ đơn giản**: chạy thông bằng BDS trước, rồi mới tính đến lõi bên thứ ba.

Đối chiếu từng mục và lối bắt đầu cho lõi Bedrock xem ở [Chọn lõi máy chủ Bedrock](/tutorials/bedrock/cores) và [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party).

### 5.1 Môi trường chạy của lõi bên thứ ba

Trước khi chọn lõi hãy xác nhận trên máy đã cài môi trường chạy gì, nếu không bước đầu tiên đã bị chặn:

| Họ lõi | Cần gì | Lưu ý |
| --- | --- | --- |
| BDS | Không cần Java / PHP, giải nén là dùng | Gói nén nền tảng và tên tệp thực thi lấy theo trang tải chính thức |
| Họ Nukkit (gồm PNX) | **Java**, yêu cầu phiên bản thường khá mới | Hệ điều hành 64 bit đi với Java 64 bit, nếu không sẽ sập giữa chừng do giới hạn bộ nhớ |
| PocketMine-MP | **PHP** (khuyến nghị dùng môi trường chạy đóng gói sẵn chính thức) | PHP trong kho của bản phân phối thường cũ, thiếu tiện ích mở rộng, hãy xác nhận `php -v` trước |

Cài nhầm họ (ví dụ cài Java cho PMMP, cài PHP cho Nukkit) không phải "tạm chạy được", mà là khởi động thất bại ngay.

## 6. Trình tải plugin cho BDS

BDS chính thức bản thân không có hệ thống plugin. Muốn dùng plugin trên BDS thì phải cài trình tải cộng đồng, và **trình tải gắn chặt với phiên bản trò chơi**: trước khi nâng cấp máy chủ hãy xác nhận trình tải đã theo kịp.

| Trình tải | Viết plugin bằng gì | Hệ sinh thái | Ghi chú |
| --- | --- | --- | --- |
| LeviLamina | C++ (tiền thân là LiteLoaderBDS) | Hiện là chín muồi nhất, hệ sinh thái tốt nhất | Chỉ hỗ trợ một khoảng phiên bản nhất định, trước khi nâng cấp BDS hãy đối chiếu |
| BDSX | Node.js / TypeScript | Thời gian bảo trì dài, cách chơi thiên về tầng thấp (Hook và gói mạng) | Phạm vi hỗ trợ rộng, phù hợp với người sẵn lòng viết mã |
| EndStone | C++ / Python, phong cách API gần Bukkit | Hệ sinh thái rất nhỏ, nhưng hướng đi rõ ràng | Phù hợp với tình huống muốn trải nghiệm phát triển kiểu Bukkit |
| BDSpyrunner | Python | Nhỏ hơn | Hình thái cụ thể và phiên bản hỗ trợ lấy theo kho chính thức của dự án |

Trong cộng đồng còn có một số **máy chủ thay thế** (không phải trình tải cho BDS): ví dụ gomint và Dragonfly viết bằng ngôn ngữ Go, máy chủ cộng đồng Allay, và proxy cho Bedrock là WaterDogPE. Điểm chung của chúng là **hệ sinh thái và tài liệu đều mỏng**, gặp vấn đề khó nhờ trợ giúp; trừ khi có lý do rõ ràng, người mới không nên chọn ngay từ đầu.

:::warn Trình tải gắn chặt với phiên bản trò chơi
Bản dựng máy chủ của Bedrock gắn chặt với giao thức, trình tải cộng đồng thường chỉ hỗ trợ **một khoảng phiên bản rất hẹp**. "Nâng BDS lên mới nhất trước, rồi đi tìm trình tải" là thứ tự sai phổ biến nhất; thứ tự đúng là **xác nhận trình tải hỗ trợ đến bản dựng nào trước, rồi quyết định nâng máy chủ lên đâu**.
:::

## 7. Tôi nên chọn cái nào

```text
Người chơi dùng client bản gốc, và bạn cần plugin quản lý/lối chơi
  -> Paper (lựa chọn đầu tiên)
  -> muốn chỉnh cơ chế bản gốc: Purpur
  -> kỹ thuật + plugin: Leaves hoặc Leaf (xem kỹ tên)
  -> nhiều nhân, xung thấp: cân nhắc Folia (xác nhận plugin hỗ trợ trước)

Người chơi muốn cài mod, muốn nội dung mới
  -> chốt danh sách mod trước -> Fabric (nhẹ/tối ưu) hoặc NeoForge (gói nội dung hiện đại)
  -> modpack cũ: Forge
  -> chỉ khi có mod độc quyền cho Quilt: mới cân nhắc Quilt

Người chơi dùng bản Bedrock
  -> sinh tồn bản gốc, cần tương thích chính thức: BDS (cần plugin thì thêm loader)
  -> hiệu năng cao + tuỳ biến: PowerNukkitX
  -> nhiều plugin sẵn nhất, biết PHP: PocketMine-MP

Cần nhiều máy chủ liên kết với nhau
  -> thêm một lớp proxy (ưu tiên Velocity)
```

## 8. Plugin và mod là hai thế giới

:::warn Plugin và mod không phải một, hiểu lẫn sẽ mắc lỗi mãi
**Plugin** gọi API do lõi cung cấp, cài ở máy chủ; người chơi dùng **client bản gốc** là vào được. Nội dung điển hình là quản lý, kinh tế, lãnh thổ, minigame.

**Mod** sửa trực tiếp bản thân trò chơi, cài trên **trình tải**; tuyệt đại đa số mod nội dung yêu cầu **client và máy chủ cài cùng bộ**, người chơi không cài thì không vào được. Nội dung điển hình là khối mới, vật phẩm mới, sinh vật mới, chiều không gian mới.

Từ đó suy ra vài quy tắc cứng:

- **Máy chủ plugin không cài được mod**: lõi họ Paper không có khả năng nạp mod, thư mục `mods/` không tồn tại.
- **Máy chủ mod mặc định không cài được plugin**: máy chủ Fabric / NeoForge không nhận plugin Bukkit; thư mục `plugins/` không tồn tại, bộ cấu hình `spigot.yml`, `paper-world-defaults.yml` cũng không tồn tại.
- **Kinh nghiệm tinh chỉnh của hai bên không thể chép lẫn nhau**: tham số JVM, plugin tối ưu, thói quen nạp lại nóng của máy chủ plugin mang sang máy chủ mod cơ bản vô hiệu, và ngược lại.
- **Cùng một "chức năng" được hiện thực hoàn toàn khác nhau ở hai bên**: ví dụ bảo vệ lãnh thổ, máy chủ plugin dựa vào plugin, máy chủ mod dựa vào mod, cấu hình và lệnh đều không dùng chung.
:::

## 9. Cái giá của máy chủ lai

**Máy chủ lai (Hybrid)** là dự án máy chủ cố gắng đồng thời cung cấp API plugin và khả năng nạp mod. Nó thực sự cho "plugin + mod" chạy trên cùng một máy chủ, nhưng cái giá phải nói rõ:

| Cái giá | Giải thích |
| --- | --- |
| Theo kịp nguồn chậm | Phải đồng thời thích ứng phiên bản Minecraft, trình tải mod và API plugin, hỗ trợ phiên bản mới thường chậm |
| Vấn đề tương thích có ở cả hai bên | Plugin và mod đều có thể trục trặc, mà khó xác định do bên nào gây ra |
| Khó nhờ trợ giúp | Quy mô người dùng nhỏ, gặp vấn đề gần như không có câu trả lời sẵn, tác giả cũng có hạn |
| Rủi ro nâng cấp và quay lui cao | Định dạng thế giới, dữ liệu mod và dữ liệu plugin trộn lẫn, quay lui phức tạp hơn nhiều so với máy chủ plugin thuần hay máy chủ mod thuần |

:::warn Đừng bắt đầu bằng máy chủ lai
Máy chủ lai giải quyết nhu cầu "tôi muốn cả hai", nhưng nó cộng dồn rủi ro của hai hệ thống. **Người mới đừng động vào khi bắt đầu**; khi thực sự cần, hãy chạy ổn máy chủ plugin thuần hoặc máy chủ mod thuần trước, rồi đánh giá xem máy chủ lai có đáng hay không, và lấy tài liệu chính thức của dự án đó làm chuẩn. Lịch sử từng có nhiều dự án máy chủ lai, trạng thái hỗ trợ và tình hình bảo trì khác nhau, trước khi chọn nhất định phải xem bản phát hành mới nhất và phiên bản được hỗ trợ của nó.
:::

## 10. Cách đối chiếu phiên bản và hệ sinh thái

Đừng chọn lõi theo trí nhớ. Mỗi lần quyết định hãy làm bốn bước đối chiếu:

| Bước | Xem gì | Xem ở đâu |
| --- | --- | --- |
| 1 | Với phiên bản trò chơi mục tiêu, lõi đã phát hành bản dựng chưa | Trang tải chính thức hoặc kho chính thức của lõi |
| 2 | Plugin/mod bạn định dùng có tuyên bố hỗ trợ lõi và phiên bản đó không | Trang phát hành và danh sách hỗ trợ của plugin/mod |
| 3 | Trình tải (nếu có) hỗ trợ đến khoảng phiên bản nào | Tài liệu chính thức của trình tải |
| 4 | Phiên bản môi trường chạy Java / PHP cần thiết | Tài liệu chính thức của lõi và trình tải |

Dòng thời gian chỉ cho bạn biết "phiên bản phát hành khi nào", nó không cho biết "lõi của bạn đã theo kịp chưa". Hai việc này phải tra riêng, tham khảo [Cách đọc dòng thời gian phiên bản](/wiki/versions-guide).

## 11. Lỗi chọn lõi thường gặp

| Lỗi | Hậu quả | Cách làm đúng |
| --- | --- | --- |
| Bỏ mod vào máy chủ plugin | Máy chủ hoàn toàn không nạp nó, thậm chí báo lỗi | Phân biệt plugin và mod trước, chọn lõi hoặc trình tải tương ứng |
| Cài trình tải trước rồi tìm mod | Mod nội dung bạn cần không hỗ trợ trình tải này, chỉ còn cách làm lại | Lập danh sách mod trước, rồi định trình tải |
| Cài lẫn Leaves với Leaf | Hành vi và mức khôi phục đặc tính bản gốc không như mong đợi | Nhìn kỹ tên dự án và hướng dẫn chính thức |
| Tưởng Folia là "Paper nhanh hơn" | Plugin không tương thích hàng loạt | Xác nhận từng plugin có tuyên bố hỗ trợ Folia hay không |
| Chỉ nhìn "hiệu năng" không nhìn hệ sinh thái | Lõi rất nhanh, nhưng không có plugin bạn cần | Hệ sinh thái và hỗ trợ plugin ưu tiên hơn con số hiệu năng |
| Dùng máy chủ lai để một bước hoàn thành | Vấn đề tương thích cộng dồn, nâng cấp khó | Chạy máy chủ plugin thuần hoặc mod thuần trước |
| Nâng thẳng BDS lên mới nhất | Trình tải cộng đồng chưa theo kịp, plugin mất tác dụng toàn bộ | Xác nhận khoảng hỗ trợ của trình tải trước, rồi nâng máy chủ |

## 12. Ngoài hiệu năng: ba loại chi phí

Khi chọn lõi dễ bị hai chữ "hiệu năng" dẫn lệch. Thứ thực sự quyết định trải nghiệm là ba loại chi phí, chúng chỉ tới những phần cứng khác nhau:

| Chi phí | Do gì quyết định | Triệu chứng | Lựa chọn tương ứng |
| --- | --- | --- | --- |
| Hiệu năng đơn nhân | Logic chính của Minecraft cơ bản chạy trên đơn luồng: thực thể, chunk, redstone và logic plugin đều dồn lên **một nhân** | Đông người chơi là lag, TPS tụt, tải chunk chậm | Máy đơn nhân mạnh chọn họ Paper; nhiều nhân nhưng xung nhịp thấp mới tính Folia |
| Bộ nhớ | Khoảng cách hiển thị, số thực thể, bộ đệm plugin và số mod | GC lag thường xuyên, sập OOM | Giảm khoảng cách hiển thị và giới hạn thực thể trước, rồi tăng bộ nhớ; bộ nhớ không thay thế được đơn nhân |
| Ổ đĩa và mạng | Đọc ghi chunk, tự động lưu, gửi chunk khi người chơi ra vào | Lưu là toàn máy chủ lag, người chơi vào chậm | Ưu tiên SSD; tối ưu mạng là một hướng khác |

Vì vậy "máy này mấy nhân" kém quan trọng hơn nhiều so với "**đơn nhân nhanh đến đâu**". Số plugin, số mod và thiết lập khoảng cách hiển thị thường ảnh hưởng trải nghiệm nhiều hơn lợi ích từ việc đổi lõi.

## Bước tiếp theo

- Chọn xong cài và tinh chỉnh thế nào: xem [Chọn lõi máy chủ](/tutorials/java/core) và [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)
- Bắt đầu đầy đủ với máy chủ mod: xem [Bắt đầu đầy đủ với máy chủ mod (Fabric / NeoForge)](/tutorials/java/modded)
- Lõi Bedrock và lõi bên thứ ba: xem [Chọn lõi máy chủ Bedrock](/tutorials/bedrock/cores) và [Lõi bên thứ ba (Nukkit / PNX / PMMP)](/tutorials/bedrock/third-party)

> Chi tiết lệnh và phiên bản lấy theo tài liệu chính thức của máy chủ và trò chơi tương ứng.
