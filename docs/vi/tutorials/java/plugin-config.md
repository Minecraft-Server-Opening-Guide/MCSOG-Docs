---
title: Cơ bản cấu hình plugin
slug: plugin-config
cat: java
level: 2
order: 18
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, cấu hình, yaml, mã màu, mã hóa]
updated: 2026-10-04
draft: false
---

Ném plugin vào `plugins/` chỉ là cài xong, thứ thực sự quyết định máy chủ "dùng có thuận tay không" là mấy chục tệp `config.yml` tiếp theo. Cấu hình sửa đúng là chức năng, sửa sai một dấu cách có thể làm cả đoạn không đọc được.

Bài này nói ba việc: **YAML viết thế nào, mã màu dùng thế nào, mã hóa làm sao không ra ký tự lỗi**, cuối cùng đưa một quy trình cố định khi sửa cấu hình.

## 1. Cấu hình plugin nằm ở đâu

Phần lớn plugin đặt tệp của mình dưới `plugins/tên-plugin/`, mấy loại thường gặp:

| Tệp / thư mục | Tác dụng |
| --- | --- |
| `config.yml` | Cấu hình chính, gần như plugin nào cũng có |
| `messages.yml`, `lang/` | Văn bản thông báo, sửa ở đây tức là đổi cách nói hoặc Việt hóa |
| `menus/`, `kits.yml`… | Cấu hình theo mô-đun, do plugin sinh ra khi khởi động |
| `data/`, `playerdata/`, `*.db` | Dữ liệu vận hành do plugin tự bảo trì |

:::warn Đừng sửa tay tệp dữ liệu
Những nội dung như `data/`, `playerdata/`, `*.db` là do plugin tự ghi khi chạy. Sửa tay nhẹ thì bị ghi đè, nặng thì làm dữ liệu người chơi lệch. Muốn đổi thì đổi cấu hình, đừng động vào dữ liệu.
:::

## 2. Ba quy tắc sắt của YAML

Chín phần mười "cấu hình không đọc được" đều nằm ở ba điều dưới đây.

### Thụt lề chỉ được dùng dấu cách, không được dùng Tab

YAML quy định rõ thụt lề không được dùng ký tự tab. Mà Tab trong trình soạn thảo trông y như vài dấu cách, mắt thường rất khó phát hiện:

```yaml
# Đúng: dùng dấu cách
options:
    enable: true

# Sai: đầu dòng này là Tab
options:
	enable: true
```

Phần lớn trình soạn thảo hiển thị Tab thành một mũi tên hoặc đường chấm, góc phải dưới của VS Code cũng thấy `Tab Size` và kiểu thụt lề. **Nếu cấu hình đã lẫn Tab, đừng xóa tay từng cái**, dùng chức năng "chuyển thụt lề thành dấu cách" của trình soạn thảo để xử lý một lượt.

### Sau dấu hai chấm phải có dấu cách

```yaml
enabled: true      # Đúng: sau dấu hai chấm có một dấu cách
enabled:true       # Sai: cả dòng bị coi là một chuỗi
```

`key:value` trong YAML không phải cặp khóa-giá trị, mà là một chuỗi bình thường. Plugin đọc không được khóa `enabled`, sẽ lùi về giá trị mặc định, biểu hiện thường là "rõ ràng tôi đã sửa mà không có hiệu lực".

### Thụt lề cùng một cấp phải nhất quán

```yaml
options:
    enable: true
    check: false
    drop-block: true
    other:
        money: 10
        welcome: "Chào mừng bạn"
guide:
    show: true
```

`options` và `guide` cùng cấp, `enable`, `check`, `drop-block` và `other` cùng cấp, còn `money` dưới `other` lại thấp hơn một cấp. Trong cùng một cấp **không được có khóa trùng nhau**:

```yaml
options:
  enable: true
  enable: false     # Sai: khóa trùng trong cùng cấp
  check: false
```

Trình soạn thảo hỗ trợ cú pháp YAML sẽ tô đỏ cách viết này; dù trình soạn thảo không báo, plugin khi đọc cũng sẽ báo lỗi.

## 3. Đối tượng, mảng và lồng nhau

YAML chỉ có hai kết cấu cơ bản: **cặp khóa-giá trị (đối tượng)** và **danh sách (mảng)**, còn lại đều là kết quả lồng chúng vào nhau.

### Đối tượng

```yaml
options:
  enable: true
  check: false
  money: 10
```

Cũng có thể viết dạng trong dòng, phù hợp cấu hình ngắn:

```yaml
options: {enable: true, check: false}
```

### Danh sách

Dòng bắt đầu bằng `-` tạo thành một danh sách, các phần tử xếp theo thứ tự:

```yaml
worlds:
  - world
  - world_nether
  - world_the_end
```

Cách viết trong dòng:

```yaml
worlds: [world, world_nether, world_the_end]
```

### Đặt đối tượng trong danh sách

Đây là kết cấu phổ biến nhất và cũng dễ viết sai nhất trong cấu hình plugin —— **khóa đầu tiên của mỗi phần tử đứng sau `-`, các khóa khác của cùng phần tử phải căn với nó**:

```yaml
kits:
  - name: starter
    price: 0
    items:
      - STONE_SWORD
      - BREAD
  - name: vip
    price: 500
    items:
      - DIAMOND_SWORD
```

Chú ý `name` và `price`, `items` là ba khóa của cùng một phần tử, thụt lề phải căn nhau; còn `- STONE_SWORD` lại là cấp dưới của `items`.

### Kiểu giá trị

Các giá trị thường gặp trong cấu hình plugin có mấy loại, cách viết cần chú ý:

```yaml
boolean: true          # true / false, không phân biệt hoa thường
integer: 10
float: 3.14
text: "hello"          # có ký tự đặc biệt thì bọc trong dấu nháy
null_value: ~          # ~ nghĩa là giá trị rỗng
```

:::tip Khi nào bắt buộc phải thêm dấu nháy
Khi trong giá trị xuất hiện các ký hiệu như `: `, `#`, `{`, `}`, `[`, `]`, `&`, `*`, `!`, `|`, `>`, hoặc giá trị bắt đầu bằng chúng, bọc trong nháy đơn hoặc nháy kép là chắc nhất. Ví dụ văn bản mã màu kiểu `&aXin chào`, viết thành `"&aXin chào"` sẽ không bị phân tích nhầm.
:::

## 4. Lỗi YAML thường gặp và nguyên nhân

| Hiện tượng | Nguyên nhân thật | Cách xử lý |
| --- | --- | --- |
| Plugin báo ngay khi khởi động `while parsing`, `mapping values are not allowed here` | Sau dấu hai chấm không có dấu cách, hoặc trong giá trị xuất hiện `: ` không bọc nháy | Thêm dấu cách, hoặc thêm nháy cho giá trị |
| `found character '\t' that cannot start any token` | Trong thụt lề lẫn Tab | Chuyển toàn bộ thụt lề thành dấu cách |
| `duplicate key` | Cùng một cấp viết hai khóa giống nhau | Xóa cái thừa đi |
| Sửa cấu hình mà hoàn toàn không có hiệu lực | Tên khóa viết sai, đặt sai cấp, hoặc plugin căn bản không đọc tệp này | Đối chiếu từng mục với cấu hình mặc định của plugin |
| Chỉ một mục trong danh sách mất hiệu lực | Các khóa trong mục danh sách thụt lề không căn nhau | Cho các khóa cùng phần tử căn trái với nhau |
| Cả tệp không đọc được, báo lỗi ngay dòng đầu | Tệp có BOM hoặc mã hóa không phải UTF-8 | Lưu thành UTF-8 không BOM |
| Báo `expected <block end>` | Một dòng nào đó thụt lề thiếu hoặc thừa | Kiểm tra độ rộng thụt lề từng cấp |

:::tip Để trình soạn thảo kiểm tra thay bạn
VS Code cài tiện ích YAML, Notepad++ mở `.yml`, đều đánh dấu thời gian thực vấn đề thụt lề và cú pháp. **Trước khi lưu hãy xem có đường gợn sóng đỏ không**, nhanh hơn nhiều so với lật nhật ký sau đó.
:::

## 5. Màu và mã định dạng

Văn bản phía máy chủ (MOTD, chat, thông báo plugin, tên menu) lên màu nhờ **mã định dạng**. Bản gốc dùng ký hiệu phân đoạn `§`, nhưng phần lớn plugin để tiện cho phép viết thẳng `&` trong cấu hình, plugin tự chuyển đổi.

### Màu

```
&0 Đen &1 Xanh đậm &2 Xanh lá đậm &3 Xanh mòng két đậm
&4 Đỏ đậm &5 Tím đậm &6 Vàng kim &7 Xám
&8 Xám đậm &9 Xanh dương &a Xanh lá &b Xanh mòng két
&c Đỏ &d Hồng &e Vàng &f Trắng
```

### Định dạng

```
&l In đậm     &o In nghiêng     &n Gạch chân   &m Gạch ngang
&k Ký tự ngẫu nhiên &r Đặt lại
```

Kết hợp dùng là được, ví dụ:

```yaml
prefix: "&8[&aMáy chủ&8] &r"
message: "&aChào mừng &e%player_name% &ađã trở lại máy chủ"
warning: "&c&lCảnh báo&r &7Xin đừng xây dựng ở đây"
```

`&r` chỉ xóa định dạng **phía sau** nó, nên muốn một đoạn văn bản trở về kiểu mặc định thì viết `&r` ở đó.

### Vài hạn chế

- **`&` không phải vạn năng**: nó cần plugin chủ động chuyển đổi. Một số chỗ (`motd` trong `server.properties` bản gốc, một phần lệnh bản gốc) chỉ nhận ký hiệu `§` thật, viết `&` sẽ hiển thị nguyên si.
- **Chỉ có 16 màu**: mã `&` là cơ chế cũ, không có màu thật. Cần chuyển màu hoặc giá trị màu chính xác thì phải dùng MiniMessage nói dưới đây.
- **Không gõ được `§` thì sao**: client bình thường không nhập trực tiếp được ký hiệu này, có thể giữ `Alt` rồi gõ lần lượt `167` trên bàn phím số, hoặc chép dán thẳng.
- **Phạm vi mã được hỗ trợ do plugin quyết định**: cùng một `&l`, có plugin áp dụng trong tiêu đề menu, có chỗ bị bỏ qua.

### MiniMessage (chỉ cần biết)

MiniMessage dựa trên thư viện Adventure mô tả kiểu bằng tag, hỗ trợ màu thật, chuyển màu, sự kiện hover và click:

```xml
<yellow>Xin chào <blue><bold>thế giới</bold></blue>!</yellow>
<gradient:#f6d365:#fda085>Chữ chuyển màu</gradient>
<rainbow>Chữ cầu vồng</rainbow>
```

Cần chú ý: **nền tảng hỗ trợ sẵn không có nghĩa là plugin hỗ trợ**. Paper và các nhánh phái sinh có sẵn Adventure, nên plugin phát triển trên Paper phần lớn dùng được MiniMessage; còn plugin phát triển trên Bukkit (như EssentialsX) mặc định không hỗ trợ, trừ khi nó tự đưa thư viện này vào (như PlaceholderAPI).

:::note Đừng gượng áp
Thấy người khác dùng MiniMessage hiệu quả không có nghĩa plugin của bạn cũng nhận. Trước khi viết hãy lật tài liệu plugin, xác nhận nó hỗ trợ mã `&`, tag MiniMessage, hay cả hai.
:::

## 6. Mã hóa tệp và ký tự lỗi

Trong cấu hình viết tiếng Trung mà hiển thị thành `???`, `鍑虹幇`, `æ¬¢è¿`… gần như đều là **mã hóa không đúng**, chứ không phải plugin không hỗ trợ tiếng Trung.

| Hiện tượng | Nguyên nhân |
| --- | --- |
| Tiếng Trung thành dấu hỏi hoặc ô vuông | Tệp bị lưu thành ANSI / GBK, mà máy chủ đọc theo UTF-8 |
| Tiếng Trung thành một chuỗi ký hiệu lạ | Tệp là UTF-8 nhưng bị đọc như GBK (hoặc ngược lại) |
| Không đọc được tên khóa ở dòng đầu | Đầu tệp có BOM, một số bộ phân tích coi BOM là một phần tên khóa |

Cách xử lý:

1. Mở tệp bằng trình soạn thảo như VS Code, Notepad++.
2. Khi lưu chọn **UTF-8** (ở chỗ mã hóa góc phải dưới của VS Code chọn `Save with Encoding`).
3. Xác nhận không có BOM. Notepad của Windows ở phiên bản cũ mặc định lưu thành "UTF-8 có BOM", là cái bẫy phổ biến nhất.
4. Lưu xong nạp lại plugin, quan sát console và văn bản trong game.

:::warn Lưu một lần bằng Notepad là thao tác nguy hiểm
Notepad của Windows mở `.yml` rồi tiện tay Ctrl+S, rất dễ đổi tệp UTF-8 vốn bình thường thành ANSI. **Khuyến nghị ngay từ đầu dùng trình soạn thảo hỗ trợ YAML và hiển thị mã hóa**, và sao lưu trước khi sửa.
:::

## 7. Sửa cấu hình an toàn: một quy trình cố định

Đi theo thứ tự này, xác suất có vấn đề sẽ thấp hơn nhiều.

1. **Sao lưu trước**. Sao một bản `config.yml` thành `config.yml.bak`, sửa hỏng là khôi phục được ngay.
2. **Cố gắng sửa khi tắt máy chủ hoặc giờ thấp điểm**. Một số plugin khi đóng sẽ ghi trạng thái bộ nhớ của mình trở lại tệp, nội dung sửa khi đang chạy có thể bị ghi đè.
3. **Dùng trình soạn thảo hỗ trợ YAML**, giữ nguyên chú thích và kết cấu vốn có, đừng tiện tay format cả tệp.
4. **Mỗi lần chỉ sửa một chỗ**, sửa xong kiểm chứng ngay. Một lần sửa hai mươi dòng, có vấn đề là không biết dòng nào.
5. **Nạp lại**. Ưu tiên dùng lệnh của chính plugin:

| Cách | Giải thích |
| --- | --- |
| `/tên-plugin reload` | Phần lớn plugin hỗ trợ, **ưu tiên** (như `/tab reload`, `/papi reload`) |
| Khởi động lại máy chủ | Chắc nhất, plugin không hỗ trợ nạp nóng thì chỉ còn cách này |
| `/reload` (lệnh bản gốc) | **Không khuyến nghị**, dễ làm trạng thái plugin rối loạn |

6. **Xem console và `logs/latest.log`**. Phân tích cấu hình thất bại thường in ra tên tệp và số dòng khi nạp, theo số dòng quay lại tìm cơ bản là thấy ngay.
7. **Không chắc thì thử ở máy chủ kiểm thử trước**. Sửa cấu hình plugin an toàn hơn cài plugin, nhưng vẫn có thể ảnh hưởng bản lưu hoặc dữ liệu người chơi.

:::tip Dùng số dòng báo lỗi thế nào
Khi nhật ký hiện gợi ý kiểu `config.yml: 42`, **đừng chỉ nhìn dòng 42**. Lỗi phân tích YAML thường do dòng trước thụt lề hoặc dấu nháy chưa đóng, hãy nhìn lên thêm hai ba dòng.
:::

## 8. Tra cứu nhanh

| Vấn đề | Kiểm tra trước |
| --- | --- |
| Cấu hình không có hiệu lực | Cách viết tên khóa, vị trí cấp, đã chạy reload chưa |
| Plugin báo lỗi phân tích khi khởi động | Dấu cách sau dấu hai chấm, thụt lề Tab, khóa trùng cùng cấp |
| Tiếng Trung bị lỗi ký tự | Tệp có phải UTF-8 không BOM không |
| Mã màu hiển thị nguyên si | Chỗ đó có hỗ trợ `&` không, hoặc cần tag MiniMessage |
| Sửa rồi lại quay về cũ | Plugin có ghi đè cấu hình khi tắt máy chủ không |

## Bước tiếp theo

Biến kiểu `%player_name%` thường thấy trong cấu hình từ đâu ra? Xem [Plugin phụ thuộc thường dùng](/tutorials/java/plugin-deps). Nếu bạn chưa cài plugin, xem [Nhập môn plugin](/tutorials/java/plugins) trước; cấu hình của bản thân máy chủ thì ở [Cấu hình máy chủ](/tutorials/java/config).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
