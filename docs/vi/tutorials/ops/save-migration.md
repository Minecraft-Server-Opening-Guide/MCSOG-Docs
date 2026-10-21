---
title: Chuyển bản lưu chơi đơn lên máy chủ
slug: save-migration
cat: ops
level: 2
order: 19
minutes: 14
tags: [bản lưu, di chuyển, level.dat, chiều không gian, dữ liệu người chơi, máy chủ, sao lưu, gỡ lỗi]
updated: 2026-10-04
draft: false
---

**Bê bản lưu chơi đơn mình đã chơi vài trăm giờ lên máy chủ là một trong những thao tác dễ "trông như thành công mà thực ra mất đồ" nhất.** Tên thư mục lệch một chữ cái là vào máy chủ thấy một thế giới trống hoàn toàn mới; thư mục Nether và End không bê theo là sau cổng dịch chuyển chỉ có địa hình chưa sinh; dữ liệu người chơi không đổi tên là người vào được nhưng túi đồ, thành tựu, thống kê về 0 hết. Bài này nói rõ cấu trúc thật của bản lưu, hai bộ bố cục thư mục, máy chủ rốt cuộc kỳ vọng gì, và một quy trình di chuyển đáng tin.

Trước khi di chuyển hãy đọc hết [Sao lưu và khôi phục](/tutorials/java/backup): bước đầu và bước cuối của cả quy trình đều là sao lưu. Quan hệ giữa thư mục máy chủ và tệp cấu hình xem [Cấu trúc máy chủ](/tutorials/java/structure) và [Cấu hình máy chủ](/tutorials/java/config).

## 1. Nhìn rõ trước: trong bản lưu chơi đơn có gì

Bản lưu chơi đơn là một thư mục dưới `.minecraft/saves/<tên thế giới>/` (trên Windows thường là `%APPDATA%\.minecraft\saves\<tên thế giới>\`). Nó không phải một tệp nguyên khối, mà là tổ hợp **từ vài chục đến vài vạn tệp**:

| Đường dẫn | Nội dung | Mô tả |
| --- | --- | --- |
| `level.dat` | Thông tin toàn cục của thế giới | Định dạng NBT, gồm tên thế giới, thiết lập sinh và seed, luật chơi, điểm sinh, thời gian, `DataVersion` v.v. |
| `level.dat_old` | Bản sao lưu của `level.dat` trước đó | Tự sinh khi nạp thế giới, có thể chép cùng |
| `level.dat_new` | Tệp tạm trong quá trình ghi | Bình thường sau khi đóng đúng cách sẽ không tồn tại, thấy nó nghĩa là lần ghi trước bị gián đoạn |
| `session.lock` | Khóa chiếm dụng thế giới | Từ 1.16 nội dung là một ký tự U+2603 (biểu tượng người tuyết); **đừng chép**, máy chủ sẽ tự tạo lại |
| `region/` | Tệp vùng của thế giới chính `r.<x>.<z>.mca` | Dữ liệu địa hình và khối, phần chiếm dung lượng lớn nhất |
| `entities/` | Dữ liệu thực thể của thế giới chính | Từ 1.17 tách ra khỏi `region/` để lưu riêng |
| `poi/` | Điểm quan tâm của thế giới chính | Có từ 1.14; giường và trạm làm việc của dân làng, cổng dịch chuyển, tổ ong, đá nam châm v.v. |
| `data/` | Dữ liệu lặt vặt cấp thế giới | Bảng điểm, cướp bóc, bản đồ, lưu trữ lệnh v.v. |
| `playerdata/<uuid>.dat` | Dữ liệu người chơi | Túi đồ, vị trí, máu, kinh nghiệm v.v., **tên tệp chính là UUID người chơi** |
| `advancements/<uuid>.json` | Tiến trình (thành tựu) | Cũng đặt tên theo UUID |
| `stats/<uuid>.json` | Thống kê | Cũng đặt tên theo UUID |
| `datapacks/` | Data pack cấp thế giới | Khác với data pack toàn cục, nó đi theo thế giới |
| `DIM-1/`, `DIM1/` | Nether và End | Bố cục cũ; tên đến từ ID chiều không gian dạng số của bản cũ (-1 và 1) |
| `dimensions/<không gian tên>/<đường dẫn>/` | Chiều không gian tự định nghĩa | Hỗ trợ từ 1.16; từ 26.1 ba chiều mặc định cũng chuyển vào đây |
| `resources.zip` | Gói tài nguyên đi kèm thế giới | Từ 26.1 chuyển vào thư mục con `resourcepacks/` |

:::note Không có `DIM-1/` không có nghĩa bản lưu có vấn đề
Thư mục Nether và End chỉ được **sinh ra lần đầu vào chiều không gian đó**. Nếu bạn chưa từng đến End, trong bản lưu sẽ không có `DIM1/` —— điều này bình thường, máy chủ sẽ tự tạo khi người chơi lần đầu vào.
:::

## 2. Hai bộ bố cục: thư mục `DIM` và `dimensions/`

Đây là chỗ dễ nhầm nhất trong cả việc di chuyển, phải xem tách theo phiên bản:

| Khoảng phiên bản | Thế giới chính | Nether | End | Chiều không gian tự định nghĩa |
| --- | --- | --- | --- | --- |
| 1.2.1 – 1.13 (từ Anvil) | Thư mục gốc bản lưu (`region/`, `data/` v.v.) | `DIM-1/` | `DIM1/` | Không hỗ trợ |
| 1.14 – 1.15 | Như trên, thêm `poi/` | `DIM-1/` | `DIM1/` | Không hỗ trợ |
| 1.16 – 26.0 | Như trên, từ 1.17 thêm `entities/` | `DIM-1/` | `DIM1/` | `dimensions/<không gian tên>/<đường dẫn>/` |
| 26.1 (snapshot 6) trở lên | `dimensions/minecraft/overworld/` | `dimensions/minecraft/the_nether/` | `dimensions/minecraft/the_end/` | `dimensions/<không gian tên>/<đường dẫn>/` |

Các điểm chính:

- **Bố cục cũ (1.16 – 26.0 và trước đó)**: hai chiều mặc định dùng tên thư mục cố định `DIM-1` (Nether, ID chiều `-1`) và `DIM1` (End, ID chiều `1`). Chúng nằm thẳng **dưới thư mục gốc bản lưu**, ngang cấp với `region/`.
- **Bố cục `dimensions/`**: sau khi 1.16 giới thiệu chiều tự định nghĩa, chiều không mặc định được lưu theo **vị trí tài nguyên**, tức `dimensions/<không gian tên>/<đường dẫn>/`, ví dụ `dimensions/mydatapack/skylands/`. Sau khi snapshot 6 của 26.1 tái cấu trúc, **ba chiều mặc định cũng dùng bộ bố cục này**, `DIM-1`/`DIM1` không còn dùng.
- Trong cùng một bản lưu 26.1, dữ liệu người chơi cũng chuyển từ thư mục gốc bản lưu sang `players/`: `players/data/<uuid>.dat`, `players/advancements/<uuid>.json`, `players/stats/<uuid>.json`.

## 3. Máy chủ rốt cuộc kỳ vọng thư mục nào

Máy chủ tìm thư mục do `level-name` trong `server.properties` chỉ định, dưới **thư mục làm việc** (có thể đổi đường dẫn gốc bằng `--universe`), mặc định là `world`. Nếu đường dẫn đó tồn tại và là một thế giới hợp lệ (có `level.dat`) thì nạp nó; **nếu không, máy chủ sẽ sinh một thế giới hoàn toàn mới tại đường dẫn đó** —— chú ý, nó không báo lỗi rồi dừng, đây chính là gốc rễ của "tôi rõ ràng đã chép bản lưu, vào máy chủ lại là thế giới trống".

Bản lưu chơi đơn nhét ba chiều vào một cây thư mục, còn máy chủ mặc định đặt ba chiều vào **ba thư mục ngang cấp**:

| Thứ trong bản lưu chơi đơn | Vị trí trên máy chủ | Mô tả |
| --- | --- | --- |
| Nội dung gốc bản lưu: `level.dat`, `region/`, `entities/`, `poi/`, `data/`, `playerdata/`, `advancements/`, `stats/`, `datapacks/` | `world/` | Thế giới chính, tức thư mục `level-name` trỏ tới |
| `DIM-1/` | `world_nether/` | Nether |
| `DIM1/` | `world_the_end/` | End |
| `dimensions/<không gian tên>/<đường dẫn>/` | Thư mục của chiều tương ứng | Chỉ có ý nghĩa khi máy chủ cũng cài cùng data pack/mod đó |
| `session.lock` | Không chép | Máy chủ tự tạo lại khi khởi động |
| `level.dat_old` | Vào `world/` cùng `level.dat` | Chỉ là bản sao lưu `level.dat` trước đó, giữ lại không hại |

Tên thư mục không hard-code: nó được suy ra từ `level-name` cộng hậu tố. Khi `level-name=myworld` thường là `myworld/`, `myworld_nether/`, `myworld_the_end/`.

:::warn Tuyệt đối không chép bản lưu khi máy chủ đang chạy
Chép khi máy chủ đang ghi `region/*.mca` rất có thể chép phải **tệp vùng ghi dở**, khôi phục xong biểu hiện là thiếu chunk, khối lộn xộn thậm chí thế giới không nạp được; `session.lock` cũng sẽ tồn tại ở cả hai bên, gây xung đột khóa. Thứ tự đúng luôn là: `stop` dừng máy chủ (hoặc chạy `save-all` → `save-off` trong console, nhưng tình huống di chuyển **rất khuyến nghị dừng máy chủ luôn**) → chép → rồi khởi động.
:::

:::tip Chiêu ổn nhất: để máy chủ tạo thư mục ra trước
Đừng đoán tên thư mục bằng tay. Trước tiên dùng `level-name` đích khởi động máy chủ một lần (sinh thế giới trống) → dừng máy chủ → xem nó thực sự tạo những thư mục nào → rồi **điền nội dung bản lưu vào các thư mục đó**. Như vậy dù lõi dùng `world_nether` hay đặt chiều vào `world/dimensions/`, bạn cũng không điền nhầm chỗ.
:::

## 4. Dữ liệu người chơi: vì sao không tự đi theo

Tên tệp trong `playerdata/`, `advancements/`, `stats/` **đều là UUID người chơi**. Máy chủ khi nạp người chơi tìm tệp theo UUID, tên tệp không khớp thì coi là người chơi mới: túi đồ trống, thành tựu không, thống kê không.

UUID đến từ đâu phụ thuộc máy chủ nhận diện người thế nào:

| Tình huống | Nguồn UUID | Kết quả |
| --- | --- | --- |
| Bản lưu chơi đơn | UUID người chơi cục bộ lưu trong thế giới (từ 26.1 là `singleplayer_uuid` của `level.dat`, phiên bản cũ hơn là tag `Player`), cũng chính là tên tệp trong `playerdata/` | Đây là "nguồn" |
| Máy chủ `online-mode=true` | UUID bản quyền của tài khoản Microsoft/Mojang | Thường **khác** UUID trong chơi đơn |
| Máy chủ `online-mode=false` (chế độ ngoại tuyến/không bản quyền) | Tính xác định từ tên người chơi: `UUID.nameUUIDFromBytes(("OfflinePlayer:" + tên).getBytes(UTF_8))`, là UUID phiên bản 3 (MD5) | **Khác** UUID bản quyền, và người chơi cùng tên có UUID giống nhau trên mọi máy chủ ngoại tuyến |

Nói cách khác: **trừ khi thế giới chơi đơn tình cờ được tạo bằng đúng UUID tài khoản đó, dữ liệu người chơi sẽ không tự có hiệu lực.**

Cách xử lý (theo thứ tự khuyến nghị):

1. **Cho người chơi vào máy chủ một lần trước**, để máy chủ tạo tệp dữ liệu cho UUID đó, và ghi nó vào `usercache.json` trong thư mục làm việc.
2. Dừng máy chủ, đọc **UUID đích** từ `usercache.json` (hoặc từ tên tệp mới xuất hiện trong `world/playerdata/`).
3. **Đổi tên** tệp nguồn thành UUID đích, chứ không ghi đè: `playerdata/<UUID cũ>.dat` → `playerdata/<UUID mới>.dat`, `advancements/`, `stats/` tương tự. Sao lưu tệp cũ trước, đổi sai còn quay lui được.
4. **Xác định `online-mode` trước khi di chuyển**: một khi đã chọn chế độ ngoại tuyến thì đừng đổi sang chế độ bản quyền nữa, nếu không toàn bộ người chơi ngoại tuyến đổi UUID, biểu hiện như "bản lưu bị quay lui".

Cũng được đánh chỉ mục theo UUID là `ops.json` và `whitelist.json`: chép thế giới không mang theo chúng, cần `/op`, `/whitelist add` lại ở phía máy chủ (hoặc sửa tay hai tệp JSON theo đúng UUID).

## 5. Các bước di chuyển

### 5.1 Ghi lại trước khi di chuyển

- **Phiên bản game** của bản lưu nguồn (`DataVersion` trong `level.dat`, hoặc số phiên bản ở menu chính client). **Phiên bản máy chủ không được thấp hơn phiên bản bản lưu**, nếu không sẽ từ chối nạp; hạ phiên bản thế giới là không an toàn.
- `level-name` đích (quyết định tên thư mục).
- Kích thước bản lưu nguồn: `du -sh`, xác nhận đĩa đích chứa đủ và còn chỗ cho sao lưu.
- Ghi lại vài sự thật kiểm chứng được trong thế giới: tọa độ điểm sinh, giá trị `/seed`, tọa độ một công trình, vị trí cổng dịch chuyển Nether.

### 5.2 Dừng máy chủ và sao lưu

```bash
# Phía máy chủ: dừng máy chủ an toàn trước
sudo systemctl stop minecraft
# Nếu không do systemd quản lý, chạy stop trong console, xác nhận tiến trình thực sự thoát

# Phía bản lưu nguồn: đóng gói lưu lại trước (trên máy client)
cd ~/.minecraft/saves
tar -czf MyWorld-20261004.tar.gz MyWorld

# Phía đích: đổi tên thư mục thế giới hiện tại (trống hoặc cũ) để lưu lại, đừng xóa thẳng
cd /opt/minecraft/server
mv world world_before_migration
```

Cách tương ứng trên Windows là bấm chuột phải nén thư mục `MyWorld` trong `%APPDATA%\.minecraft\saves`.

### 5.3 Chép tệp

Khuyến nghị dùng `rsync -a`: nó loại được thư mục không cần, tiếp tục được khi gián đoạn, và báo lỗi rõ ràng. **Dấu `/` ở cuối đường dẫn nguồn nghĩa là "chép nội dung trong thư mục"**, bỏ sót hoặc viết sai sẽ lồng thêm một lớp thư mục.

```bash
# Thế giới chính: loại hai thư mục chiều và tệp khóa, phần còn lại vào hết world/
rsync -a --exclude 'DIM-1' --exclude 'DIM1' --exclude 'session.lock' \
  "/home/you/.minecraft/saves/MyWorld/" /opt/minecraft/server/world/

# Nether và End: vào thư mục ngang cấp tương ứng
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM-1/" /opt/minecraft/server/world_nether/
rsync -a "/home/you/.minecraft/saves/MyWorld/DIM1/"  /opt/minecraft/server/world_the_end/
```

Nếu chỉ có ít thư mục cần bê, `cp -a` trực quan hơn. `-a` giữ dấu thời gian, quyền và liên kết tượng trưng:

```bash
# Chép từng mục (cái nào không tồn tại thì bỏ qua: ví dụ chưa từng đến End thì không có DIM1)
cd "/home/you/.minecraft/saves/MyWorld"
cp -a level.dat level.dat_old region entities poi data datapacks \
      playerdata advancements stats /opt/minecraft/server/world/ 2>/dev/null

cp -a DIM-1/. /opt/minecraft/server/world_nether/
cp -a DIM1/.  /opt/minecraft/server/world_the_end/
```

Trên Windows dùng `robocopy` (chú ý: mã thoát của `robocopy` **0–7 đều tính là thành công**, `1` nghĩa là "có tệp được chép", đừng coi là thất bại):

```bat
robocopy "%APPDATA%\.minecraft\saves\MyWorld" "C:\mc\server\world" /E /XD DIM-1 DIM1 /XF session.lock
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM-1" "C:\mc\server\world_nether" /E
robocopy "%APPDATA%\.minecraft\saves\MyWorld\DIM1"  "C:\mc\server\world_the_end" /E
```

Chép xong sửa chủ sở hữu (trên Linux chạy máy chủ bằng người dùng riêng thì bắt buộc, nếu không sẽ thấy `Failed to save`):

```bash
sudo chown -R minecraft:minecraft \
  /opt/minecraft/server/world \
  /opt/minecraft/server/world_nether \
  /opt/minecraft/server/world_the_end
```

:::tip Bản lưu lớn thì nén trước rồi truyền, đừng chép từ từ qua mạng
`region/` vài chục GB truyền từng tệp qua mạng sẽ rất chậm, mà gián đoạn một lần là phải làm lại. Cách ổn hơn là đóng gói trên máy nguồn trước (`tar -czf MyWorld.tar.gz MyWorld`, tỷ lệ nén dữ liệu chunk thường khá tốt), truyền xong rồi giải nén; `rsync -az --partial` cũng cung cấp nén khi truyền và tiếp tục từ chỗ gián đoạn.
:::

### 5.4 Sửa `level-name`

Mở `server.properties` của máy chủ, xác nhận tên thư mục và `level-name` **hoàn toàn trùng khớp** (Linux phân biệt chữ hoa thường, `MyWorld` và `myworld` là hai thư mục):

```properties
level-name=world
```

### 5.5 Khởi động và quan sát

```bash
sudo systemctl start minecraft
# Xem quá trình khởi động thời gian thực, trọng tâm là lỗi liên quan bản lưu
tail -f /opt/minecraft/server/logs/latest.log
# Nếu do systemd quản lý, stdout nằm trong journal
journalctl -u minecraft.service -f
```

Trong nhật ký khởi động cần xác nhận trọng tâm: không có `Failed to load`, không có ngoại lệ liên quan chiều không gian, `Preparing spawn area` kết thúc bình thường, không có `No space left on device`.

### 5.6 Vào máy chủ kiểm chứng

Xem danh sách kiểm chứng ở mục 10. **Đừng vội mở máy chủ cho mọi người**, dùng danh sách trắng chỉ cho một hai người vào xác nhận không sai.

### 5.7 Diễn tập một lần trước khi di chuyển chính thức

Nếu đây là thế giới quan trọng, **hãy dựng một instance thử nghiệm cục bộ với cổng khác và `level-name` tạm**, chạy hết quy trình một lần. Diễn tập phơi ra trước được vấn đề tên thư mục, phiên bản, quyền và UUID, mà hoàn toàn không ảnh hưởng môi trường sản xuất.

```properties
# server.properties của instance thử nghiệm (đặt ở thư mục khác instance sản xuất, tránh ảnh hưởng lẫn nhau)
level-name=world_test
server-port=25566
online-mode=false
white-list=false
```

```bash
cd /opt/minecraft/testserver
java -Xms2G -Xmx2G -jar server.jar --nogui
```

Diễn tập qua rồi, mới làm lại một lần cho instance sản xuất; thư mục thử nghiệm dùng xong xóa cả đi là được.

## 6. `level.dat` có nên động vào không

`level.dat` là "chứng minh thư + bảng thiết lập" của thế giới, chứa tên thế giới, thiết lập sinh và seed, luật chơi, điểm sinh, thời gian, độ khó, và danh sách data pack đã bật. Nội dung của nó là **NBT nhị phân**, thường còn qua nén gzip.

Kết luận rất đơn giản: **đừng sửa tay nó.**

- Mở bằng trình soạn thảo văn bản sẽ làm hỏng tệp luôn; dùng trình sửa NBT cũng phải đối mặt khác biệt phiên bản (ví dụ từ 26.1 luật chơi, thiết lập sinh thế giới v.v. đã được tách xuống `data/`).
- Sửa sai thì biểu hiện là thế giới không nạp được luôn, mà `level.dat_old` không nhất thiết cứu được.
- **Đại đa số thứ muốn đổi đều có cổng vào chính thức**: độ khó, chế độ chơi, khoảng cách nhìn, danh sách trắng đi qua `server.properties`; luật chơi, thời gian, thời tiết, điểm sinh, data pack đi qua lệnh trong game (`/gamerule`, `/time set`, `/weather clear`, `/setworldspawn`, `/datapack`).
- Chú ý `level-seed` **chỉ có hiệu lực khi tạo thế giới**, seed của thế giới đã có không đổi được bằng sửa cấu hình.
- Khi cần "xem bên trong có gì", dùng công cụ xem NBT mở **chỉ đọc**, và chép một bản sao trước.

Cách đúng trong tình huống di chuyển là: **bê `level.dat` nguyên trạng, đừng sửa nó trong quá trình di chuyển**; đợi thế giới chạy lên, kiểm chứng qua, sao lưu đầy đủ, rồi mới chỉnh thiết lập qua cấu hình và lệnh.

## 7. Data pack (`datapacks/`)

- Data pack cấp thế giới đặt trong `datapacks/` dưới thư mục thế giới (chơi đơn là `saves/<tên thế giới>/datapacks/`, máy chủ là `world/datapacks/`), nó đi theo thế giới, chép thế giới sẽ bê theo luôn.
- **Danh sách đã bật/đã tắt ghi trong `level.dat`**, nên bê sang thường không cần bật lại; dùng `/datapack list` xác nhận, khi cần thì `/datapack enable <tên>` / `/datapack disable <tên>`, sửa xong dùng `/reload` để có hiệu lực.
- **Phiên bản phải khớp**: data pack khai báo `pack_format` mục tiêu, phiên bản máy chủ không đúng sẽ bị từ chối nạp hoặc đưa cảnh báo.
- **Data pack thêm chiều không gian cần đặc biệt chú ý**: loại thế giới này sẽ có thư mục `dimensions/<không gian tên>/<đường dẫn>/`, chỉ khi máy chủ cũng cài cùng data pack đó thì những chiều ấy mới nạp ra được. Dữ liệu không vì thế mà bị xóa, nhưng người chơi sẽ không vào được.
- Gói tài nguyên đi kèm thế giới (bản cũ là `resources.zip`, từ 26.1 nằm dưới `resourcepacks/`) không tự gửi cho người chơi; muốn người chơi thấy texture tùy chỉnh thì cần cấu hình `resource-pack` trong `server.properties`.

## 8. Bản lưu mod, khác phiên bản và Bedrock Edition

### 8.1 Bản lưu mod (Forge/NeoForge/Fabric) chuyển sang phía plugin

Đây là cái bẫy lớn thứ hai sau tên thư mục. **Phía plugin (Spigot/Paper v.v.) không nhận ra khối, vật phẩm và thực thể do mod thêm vào.**

- Khối của mod trong thế giới sẽ thành khối không xác định (thường biểu hiện là không khí, đá hoặc khối thay thế); những chunk này **một khi bị nạp và lưu lại, dữ liệu gốc có thể bị ghi đè tại chỗ**, sau đó cài mod lại cũng chưa chắc cứu được.
- Vật phẩm của mod sẽ biến mất khỏi túi đồ và vật chứa, thực thể của mod (máy móc, sinh vật) bị bỏ.
- Chiều không gian của mod (`dimensions/<không gian tên mod>/...`) không nạp được khi không có mod tương ứng.

Cách đúng: **sao lưu trước, rồi nạp trên một bản sao dùng để bỏ**, đếm xem nhật ký xuất hiện bao nhiêu khối không xác định và báo lỗi liên quan registry; xác nhận tổn thất chấp nhận được rồi mới di chuyển chính thức. Nếu tổn thất không chấp nhận được thì tiếp tục dùng phía mod, hoặc mở lại từ đầu.

### 8.2 Khác phiên bản

- **Phiên bản bản lưu cao hơn máy chủ**: máy chủ sẽ từ chối nạp (kiểm tra `DataVersion`). Cách duy nhất an toàn là nâng cấp máy chủ, chứ không phải hạ phiên bản thế giới.
- **Phiên bản bản lưu thấp hơn máy chủ**: máy chủ sẽ nâng cấp thế giới qua sửa dữ liệu (DataFixer), thường khả thi, nhưng **nâng cấp là không thể đảo ngược**: một khi đã bị phiên bản mới nạp qua, phiên bản cũ không mở được nữa. Nên trước khi nâng cấp nhất định giữ một bản sao lưu chưa bị động vào.
- Khi vượt nhiều phiên bản lớn, nâng từng cấp sẽ ổn hơn (ví dụ 1.20 trước rồi 1.21), mỗi cấp đều kiểm chứng một lần, xem [Cập nhật phiên bản](/tutorials/ops/updates).

### 8.3 Bedrock Edition

Định dạng thế giới Java Edition và Bedrock Edition hoàn toàn khác nhau, **không nạp trực tiếp lẫn nhau được**, cần công cụ chuyển đổi bên thứ ba, và chuyển đổi thường có tổn thất (redstone, thực thể, hành vi một số khối). Cấu trúc thư mục máy chủ Bedrock Edition xem [Máy chủ BDS](/tutorials/bedrock/bds).

## 9. Các kiểu thất bại thường gặp

| Hiện tượng | Nguyên nhân gốc | Xử lý |
| --- | --- | --- |
| Vào máy chủ là thế giới trống hoàn toàn mới | Tên thư mục không khớp `level-name`, hoặc thư mục đó không có `level.dat`, nên máy chủ **tạo mới** một thế giới | Dừng máy chủ, đối chiếu tên thư mục; đổi tên thư mục cũ để lưu lại, chép lại |
| Vào được thế giới, nhưng Nether/End là địa hình hoàn toàn mới | `DIM-1/`, `DIM1/` không được bê sang `world_nether/`, `world_the_end/`, hoặc bê sai cấp (lồng thêm một lớp thư mục) | Dừng máy chủ rồi chép lại vào thư mục đúng |
| Vào được thế giới, nhưng người chơi "bắt đầu từ số 0" | Tên tệp dữ liệu người chơi (UUID) không khớp UUID máy chủ xác định | Đổi tên `playerdata/`, `advancements/`, `stats/` theo mục 4 |
| Máy chủ từ chối nạp thế giới | Phiên bản bản lưu (`DataVersion`) cao hơn phiên bản máy chủ | Nâng cấp máy chủ; **đừng** thử hạ phiên bản thế giới |
| Mất một phần chunk, khối lộn xộn | Khi chép máy chủ vẫn đang chạy, hoặc đĩa đầy | Chép lại từ bản sao lưu; giải quyết dung lượng đĩa trước |
| Nhật ký xuất hiện `Failed to save` | Chủ sở hữu/quyền tệp không đúng, người dùng máy chủ không ghi vào được | `chown -R` cho người dùng chạy máy chủ |
| Trên Linux "tệp rõ ràng có mà máy chủ nói không có" | Chữ hoa thường không khớp (`MyWorld` vs `myworld`) | Thống nhất tên thư mục và `level-name` |
| Khởi động kẹt ở `Preparing spawn area` rất lâu | Thế giới lớn, lần nạp đầu cần thời gian; cũng có thể là điểm nghẽn I/O đĩa | Kiên nhẫn chờ, quan sát mức chiếm CPU/đĩa; đừng khởi động lại lặp lại |
| Danh sách trắng/OP mất hiệu lực | `whitelist.json`, `ops.json` không nằm trong thế giới, cần xây lại | `/whitelist add`, `/op` lại, hoặc sửa tay theo đúng UUID |
| Sau di chuyển lag thường xuyên | Mô hình tải của chơi đơn và máy chủ khác nhau (khoảng cách nhìn, khoảng cách mô phỏng, số thực thể) | Chỉnh `view-distance`, `simulation-distance`, xem [Tối ưu](/tutorials/java/optimize) |

## 10. Danh sách kiểm chứng

Xác nhận từng mục, qua hết mới mở ra ngoài:

| Mục kiểm tra | Cách làm |
| --- | --- |
| Trong thư mục thế giới có `level.dat` | `ls -la /opt/minecraft/server/world/level.dat` |
| Số tệp vùng khớp nguồn | Hai bên mỗi bên chạy `find world/region -name '*.mca' \| wc -l` để so |
| Dung lượng ba thế giới đúng kỳ vọng | `du -sh /opt/minecraft/server/world*` |
| Nhật ký khởi động không có lỗi bản lưu | `grep -n -i "failed\|unknown dimension\|no space" logs/latest.log` |
| Seed khớp | `/seed` trong game, so với giá trị ghi trước khi di chuyển |
| Thời gian và luật chơi khớp | `/time query daytime`, `/gamerule keepInventory` v.v. |
| Điểm sinh khớp | Xem điểm sinh hiện tại trước khi `/setworldspawn`, so với trước di chuyển |
| Công trình then chốt tồn tại | Dịch chuyển đến tọa độ đã ghi để xác nhận bằng mắt |
| Nether khớp | `/execute in minecraft:the_nether run tp @s 0 64 0`, kiểm tra cổng dịch chuyển và địa hình đã biết |
| End khớp | Vào End, kiểm tra trạng thái ender dragon, cổng dịch chuyển End và cổng trở về |
| Tiến trình người chơi đã về | Kiểm tra túi đồ, kinh nghiệm, giao diện tiến trình và thống kê |
| Quyền và danh sách trắng đúng | Kiểm tra `/whitelist list`, `/op` |
| Máy chủ ghi được đĩa | `sudo -u minecraft test -w /opt/minecraft/server/world && echo writable` |
| Sao lưu đã có hiệu lực | Chạy tay script sao lưu một lần ngay, xác nhận thế giới mới đã nằm trong phạm vi sao lưu |

## 11. Sau khi di chuyển

- **Chốt `online-mode`, danh sách trắng, xác minh bản quyền** rồi mới bắt đầu tích lũy dữ liệu người chơi; đổi chế độ xác thực giữa chừng sẽ khiến UUID thay đổi.
- **Làm ngay một bản sao lưu đầy đủ**, và đưa nó vào bản sao khác vị trí/ngoại tuyến, xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).
- Đặt lại `view-distance`, `simulation-distance`, `max-players` theo tải máy chủ, bản lưu chơi đơn thường được sinh trong "khoảng cách nhìn một người", bê lên máy chủ có thể cần sinh lại các chunk xung quanh để khớp khoảng cách nhìn xa hơn.
- Thêm luân chuyển nhật ký và giám sát đĩa, tránh thế giới lớn vừa bê sang làm đầy đĩa, xem [Quản lý và luân chuyển nhật ký](/tutorials/ops/logs) và [Giám sát và cảnh báo](/tutorials/ops/monitoring).
- **Bedrock Edition (BDS) là chuyện khác**: thế giới Java Edition và thế giới Bedrock Edition là hai định dạng hoàn toàn khác nhau, không nạp trực tiếp lẫn nhau được, cần công cụ chuyển đổi bên thứ ba, và chuyển đổi thường có tổn thất. Cấu trúc thư mục máy chủ Bedrock Edition xem [Máy chủ BDS](/tutorials/bedrock/bds).

## 12. Bước tiếp theo

- Phân công giữa thư mục máy chủ và từng tệp: xem [Cấu trúc máy chủ](/tutorials/java/structure).
- Ý nghĩa và giá trị khuyến nghị của từng mục cấu hình: xem [Cấu hình máy chủ](/tutorials/java/config).
- Sao lưu và quay lui sau khi di chuyển xong: xem [Sao lưu và khôi phục](/tutorials/java/backup).
- Máy chủ Bedrock Edition: xem [Máy chủ BDS](/tutorials/bedrock/bds).

> Đường dẫn và bố cục thư mục cụ thể thay đổi theo phiên bản game và lõi, hãy lấy tài liệu chính thức làm chuẩn.
