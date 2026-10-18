---
title: Gói tài nguyên và data pack: khác nhau, cài đặt và kiểm tra
slug: packs
cat: ops
level: 3
order: 21
minutes: 14
tags: [vận hành, gói tài nguyên, data pack, định dạng gói, sha1, gỡ lỗi, server-properties]
updated: 2026-10-04
draft: false
---

"Gói tài nguyên" và "data pack" nghe rất giống nhau, nhưng tác dụng hoàn toàn ngược nhau: **gói tài nguyên thay đổi thứ người chơi nhìn và nghe, data pack thay đổi hành vi của chính trò chơi**. Lẫn hai khái niệm này sẽ sinh ra kiểu câu hỏi "tôi cài gói texture rồi sao công thức chế tạo không đổi" hoặc "data pack sao không đổi được texture".

Bài này nói về gói tài nguyên và data pack của Java Edition: hai bên làm được gì, cài thế nào, máy chủ đẩy gói tài nguyên xuống thế nào, định dạng không tương thích thì kiểm tra ra sao. Bedrock Edition là một bộ cơ chế khác (gói tài nguyên + gói hành vi + gói phụ trợ), xem [Bắt đầu với lõi bên thứ ba của Bedrock Edition](/tutorials/bedrock/third-party-setup).

## 1. Hai thứ này là gì

| Khía cạnh | Gói tài nguyên (Resource Pack) | Data pack |
| --- | --- | --- |
| Vị trí tác dụng | **Client**: texture, model, âm thanh, tệp ngôn ngữ, font, GUI | **Máy chủ / bản lưu**: công thức, bảng chiến lợi phẩm, tiến trình, hàm, cấu trúc, tag |
| Ai thấy hiệu quả | Chỉ người chơi đã cài (hoặc được đẩy) gói đó | Mọi người chơi (dữ liệu nằm trên thế giới/máy chủ, không liên quan client) |
| Cài ở đâu | `resourcepacks/` của client, hoặc do máy chủ đẩy xuống | `datapacks/` trong thư mục bản lưu |
| Máy chủ có ép được không | Có thể đẩy và cưỡng chế (`require-resource-pack`) | Không cần đẩy, vốn đã nằm trên máy chủ |
| Có thay đổi cách chơi không | **Không**. Thứ thay đổi là ngoại hình và âm thanh | **Có**. Có thể đổi công thức, rơi đồ, sinh thế giới, chạy lệnh |
| Có chạy mã được không | **Không**. Chỉ có tư liệu và tệp cấu hình | **Có**. Trong hàm là một chuỗi lệnh, tương đương máy chủ chạy lệnh |
| Công dụng điển hình | Texture, UI, âm thanh, Việt hóa, font, model | Công thức tự định nghĩa, rơi đồ, thành tựu, logic minigame, sinh thế giới |
| Quan hệ với phiên bản | Số định dạng trong `pack.mcmeta` phải khớp phiên bản client | Số định dạng trong `pack.mcmeta` phải khớp phiên bản máy chủ |

Nhớ một câu: **gói tài nguyên là "đổi da", data pack là "đổi luật".**

### Đối chiếu cấu trúc thư mục

```text
gói tài nguyên/
  pack.mcmeta                 <- bắt buộc, đánh dấu đây là một gói
  pack.png                    <- tùy chọn, biểu tượng trong giao diện chọn
  assets/
    <không gian tên>/
      textures/               <- texture .png
      models/                 <- model .json
      sounds/                 <- âm thanh .ogg
      lang/                   <- bản dịch <mã ngôn ngữ>.json
      font/  blockstates/  gui/ ...

data pack/
  pack.mcmeta                 <- bắt buộc
  pack.png                    <- tùy chọn
  data/
    <không gian tên>/
      function/               <- hàm lệnh .mcfunction
      recipe/                 <- công thức .json
      loot_table/             <- bảng chiến lợi phẩm .json
      advancement/            <- tiến trình .json
      structure/              <- cấu trúc .nbt
      tags/                   <- tag (ví dụ function/tick.json)
      predicate/  item_modifier/  worldgen/ ...
```

`pack.mcmeta` là **tệp bắt buộc duy nhất**, trò chơi dựa vào nó để phán đoán một thư mục hoặc zip có phải "gói" không.

## 2. Mỗi bên không làm được gì

| Việc muốn làm | Gói tài nguyên | Data pack |
| --- | --- | --- |
| Đổi texture khối, đổi âm thanh, đổi font và ngôn ngữ | Được | **Không** (data pack không động vào tư liệu client) |
| Thêm một công thức chế tạo, đổi vật rơi | **Không** | Được |
| Đổi logic game, thêm luật minigame, chạy lệnh định kỳ | **Không** (không chạy mã được) | Được |
| Thêm một khối mới / vật phẩm mới | **Không** (chỉ đổi được tư liệu của nội dung có sẵn) | **Không** (cái này cần mod) |
| Cho mọi người chơi thấy cùng hiệu quả | Cần đẩy gói tài nguyên, người chơi vẫn có thể từ chối | Đương nhiên có hiệu lực với mọi người chơi |
| Thay đổi hiệu năng máy chủ | Gần như không ảnh hưởng máy chủ | **Có ảnh hưởng**: hàm chạy mỗi tick có thể làm máy chủ chậm đi |

:::note Vì sao "data pack không thêm được khối mới"
Data pack định nghĩa được **dữ liệu** như công thức, rơi đồ, tiến trình, sinh thế giới, nhưng việc đăng ký khối và vật phẩm được hard-code trong trò chơi. Muốn thêm khối/vật phẩm mới thật sự trên máy chủ thì cần mod (hoặc gói hành vi của Bedrock Edition). **Thấy hướng dẫn "data pack thêm quặng mới", phần nhiều là mượn ngoại hình và chất liệu của khối có sẵn.**
:::

## 3. Máy chủ đẩy gói tài nguyên cho client Java thế nào

Máy chủ bản gốc **đẩy** gói tài nguyên xuống client qua vài khóa trong `server.properties`. **Tên khóa phải chính xác từng chữ** (đây là một trong những nguyên nhân thất bại phổ biến nhất):

```properties
resource-pack=https://cdn.example.com/packs/survival-2026-10-04.zip
resource-pack-sha1=<SHA-1 thập lục phân chữ thường 40 ký tự>
require-resource-pack=false
resource-pack-prompt={"text":"Máy chủ này dùng gói texture tùy chỉnh, khuyến nghị bật lên.","color":"yellow"}
```

| Tên khóa | Kiểu | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `resource-pack` | Chuỗi (URL) | Rỗng | Địa chỉ tải gói tài nguyên. Để rỗng nghĩa là không đẩy gói nào; người chơi vào máy chủ có thể chọn có tải hay không. **Kích thước gói tối đa 250 MiB** |
| `resource-pack-sha1` | Chuỗi | Rỗng | SHA-1 của gói tài nguyên, **thập lục phân chữ thường**. Dùng để client kiểm tra tính toàn vẹn, **rất khuyến nghị điền** |
| `require-resource-pack` | Boolean | `false` | Khi là `true`, **người chơi từ chối dùng gói tài nguyên sẽ bị đá khỏi máy chủ** |
| `resource-pack-prompt` | Chuỗi | Rỗng | Văn bản nhắc tùy chỉnh hiển thị khi cưỡng chế gói tài nguyên. Dùng cú pháp thành phần chat (văn bản JSON), có thể nhiều dòng; để rỗng thì hiện nhắc mặc định |
| `resource-pack-id` | UUID | Rỗng | Tùy chọn, cấp cho gói tài nguyên một định danh; **chỉ phiên bản mới hơn mới có khóa này**, phiên bản cũ viết vào không có hiệu lực |

### Vài chi tiết bắt buộc phải biết

- **Bắt buộc là địa chỉ HTTPS mà client tải trực tiếp được.** Thực tế client bản gốc chỉ nhận liên kết HTTPS, địa chỉ HTTP thuần hoặc chứng chỉ có vấn đề sẽ khiến tải thất bại (kiểm tra phía client thay đổi theo phiên bản, lấy tài liệu chính thức làm chuẩn).
- **Tải thành công hay thất bại chỉ ghi trong nhật ký client, máy chủ không thấy.** Nên "máy chủ không báo lỗi" không có nghĩa người chơi đã nhận được gói —— khi kiểm tra nhất định phải xem `logs/latest.log` của client.
- Máy chủ **không** host tệp này thay bạn. Bạn cần đặt nó ở nơi mạng công cộng truy cập được (lưu trữ đối tượng, CDN, thư mục tĩnh Nginx v.v.), và xác nhận **không có chống hotlink, không có xác thực, không chuyển hướng sang trang HTML**.
- Máy chủ sẽ ghi lại `server.properties` khi khởi động: nó bổ sung khóa thiếu, đổi giá trị không hợp lệ về mặc định, và **escape một số ký tự đặc biệt** (ví dụ `:`). Nên viết tay JSON của `resource-pack-prompt` là khả thi, nhưng đừng thấy trong tệp xuất hiện dấu gạch chéo ngược mà tưởng viết sai.
- Đổi các khóa này **bắt buộc khởi động lại máy chủ** mới có hiệu lực (`server.properties` không được `/reload` đọc lại).

:::warn Cưỡng chế gói tài nguyên là con dao hai lưỡi
`require-resource-pack=true` sẽ khiến **người chơi từ chối tải không vào được luôn**. Nếu gói tài nguyên host trên máy nhỏ băng thông hạn chế của chính bạn, một lần cập nhật có thể khiến toàn bộ người chơi tải cùng lúc, đẩy băng thông lên kịch, thậm chí bị hiểu nhầm là "máy chủ không vào được". **Trước khi cưỡng chế hãy xác nhận băng thông và độ khả dụng của phía host, và giữ khả năng tắt cưỡng chế bất cứ lúc nào.**
:::

## 4. Tính SHA-1 đúng cách

Hash phải là SHA-1 của **nội dung tệp**, thập lục phân chữ thường, tổng cộng 40 ký tự.

```bash
# Linux / macOS
sha1sum survival-2026-10-04.zip
```

```powershell
# Windows PowerShell: Get-FileHash mặc định in chữ hoa, đổi sang chữ thường rồi điền
(Get-FileHash -Algorithm SHA1 .\survival-2026-10-04.zip).Hash.ToLower()
```

### Hash sai thì sao

| Tình huống | Hậu quả |
| --- | --- |
| Hash không khớp tệp thực tế | Client tải xong kiểm tra thất bại, **gói tài nguyên không được áp dụng**; thất bại chỉ xuất hiện trong nhật ký client, máy chủ hoàn toàn không biết |
| Hash không phải chuỗi thập lục phân 40 ký tự | Theo tài liệu giao thức, client sẽ không dùng nó để kiểm tra, **phí một lần băng thông tải** |
| Máy chủ khởi động báo `Invalid sha1 for resource-pack-sha1` | Giá trị này trong cấu hình không khớp gói thực tế (hoặc định dạng không hợp lệ), console sẽ có nhắc màu vàng |
| Đổi gói mà không cập nhật hash | Người chơi tải đi tải lại, thất bại đi thất bại lại; người chơi cũ có thể vẫn giữ gói cũ |

:::tip Ba cái bẫy dễ vấp nhất
1. **Đóng gói lại sẽ đổi hash**: dù nội dung tệp giống nhau, nén lại (dấu thời gian, mức nén khác nhau) cũng cho ra zip khác, hash theo đó đổi. **Giữ nguyên tệp zip bạn đã tính hash, đừng nén lại.**
2. **Có thể bị thay đổi trong lúc tải lên**: một số nền tảng tự nén, thêm watermark hoặc viết lại nội dung, sau khi tải lên phải **tải lại một lần** và kiểm tra hash có khớp cục bộ không.
3. **Chữ hoa chữ thường**: điền `ABC...` có thể không được nhận là hash hợp lệ, thống nhất dùng chữ thường.
:::

## 5. Data pack đặt ở đâu, cài thế nào

Data pack đặt trong `datapacks/` **dưới thư mục bản lưu**. Thư mục bản lưu của máy chủ do `level-name` trong `server.properties` quyết định (mặc định là `world`):

```text
/opt/mcserver/
  server.properties          <- level-name=world
  world/
    datapacks/
      my-tweaks/             <- data pack dạng thư mục
      economy.zip            <- data pack dạng zip
    level.dat
    region/
```

Các bước cài:

1. Tải data pack (bản trang này tuyển chọn ở [Tải data pack](/downloads/datapacks)), xác nhận nó là **`.zip` hoặc thư mục**.
2. Đặt nó vào `<level-name>/datapacks/`. **Trong zip phải trực tiếp là `pack.mcmeta`, không được lồng thêm một lớp thư mục** —— nén bằng cách bấm chuột phải vào thư mục dễ sinh thêm một lớp nhất.
3. Nếu máy chủ đang chạy: chạy `/reload`, hoặc dùng `/datapack enable <tên>` để bật (một số nội dung bắt buộc khởi động lại, xem mục 6).
4. Kiểm tra đã nạp thành công chưa:

```text
/datapack list             liệt kê toàn bộ data pack
/datapack list enabled     chỉ liệt kê cái đã bật
/datapack list available   chỉ liệt kê cái khả dụng nhưng chưa bật
```

Trong đầu ra phải thấy tên gói của bạn (dạng zip sẽ hiển thị là `file/<tên tệp>`). Rê chuột trong danh sách sẽ thấy `description` ghi trong `pack.mcmeta`.

### Bật, tắt và thứ tự

```text
/datapack enable <tên>
/datapack disable <tên>
/datapack enable <tên> first        đặt vào ưu tiên thấp nhất
/datapack enable <tên> last         đặt vào ưu tiên cao nhất
/datapack enable <tên> before <gói có sẵn>
/datapack enable <tên> after  <gói có sẵn>
```

- **Thứ tự rất quan trọng**: tệp cùng tên **gói nạp sau ghi đè gói nạp trước**; tệp tag mặc định sẽ gộp, trừ khi ghi `"replace": true`.
- Mức quyền: `list` / `enable` / `disable` cần mức quyền 2; `create` cần mức 4.
- Danh sách gói đã bật lưu trong **bản lưu** (`level.dat`), nên **đổi bản lưu, quay lui bản lưu sẽ thay đổi luôn những data pack đã bật**.

:::note Đường dẫn của máy chủ và bản lưu chơi đơn khác nhau
Bản lưu chơi đơn ở `.minecraft/saves/<tên bản lưu>/datapacks/`; máy chủ ở `<level-name>/datapacks/` **trong thư mục làm việc**. Đặt nhầm chỗ là nguyên nhân phổ biến nhất của "data pack không có hiệu lực".
:::

## 6. `/reload` rốt cuộc nạp lại cái gì

Tác dụng của `/reload` trong Java Edition là **nạp lại dữ liệu trong các data pack đang bật**. Nó **không** vạn năng, cũng không bằng khởi động lại:

| Nội dung | `/reload` có hiệu lực không |
| --- | --- |
| Tag của registry (tags) | Có nạp lại |
| Bảng chiến lợi phẩm (loot table) | Có nạp lại |
| Công thức (recipe) | Có nạp lại |
| Tiến trình (advancement) | Có nạp lại |
| Bộ sửa vật phẩm, predicate | Có nạp lại |
| Hàm (function, `.mcfunction`) | Có nạp lại |
| Mẫu cấu trúc (structure) | Có nạp lại |
| Phần dùng registry động / nội dung thử nghiệm (ví dụ chiều không gian, quần xã sinh vật, sinh thế giới, phù phép v.v., phạm vi cụ thể thay đổi theo phiên bản) | **Không**, bắt buộc khởi động lại máy chủ (chơi đơn thì thoát ra vào lại thế giới) |
| Cấu hình lõi như `server.properties` | **Không**, bắt buộc khởi động lại |
| Tiến trình máy chủ, trạng thái plugin | **Không**, và có thể bị `/reload` làm rối |

Hai hành vi bắt buộc phải nhớ:

1. **Khi data pack có dữ liệu không hợp lệ, thay đổi sẽ không được áp dụng**, trò chơi tiếp tục dùng dữ liệu trước đó. Nên "tôi `/reload` rồi mà không đổi" đôi khi là bản thân gói viết sai, chứ không phải nạp lại không có hiệu lực.
2. **Trên máy chủ có plugin hãy cẩn thận khi dùng `/reload`.** Nó có thể làm trạng thái plugin rối loạn (ví dụ bảng điểm, listener, cache). Khi có thể giải quyết bằng `/datapack enable` / `/datapack disable` hoặc khởi động lại, hãy chọn cách sau.

## 7. Định dạng gói: `pack.mcmeta` và `pack_format`

`pack.mcmeta` là tệp metadata của gói, gói tài nguyên và data pack đều dùng nó, nhưng **số định dạng hai bên yêu cầu khác nhau**.

```json
{
  "pack": {
    "pack_format": <số nguyên mà phiên bản này yêu cầu>,
    "description": "Data pack ví dụ"
  }
}
```

:::warn `<số nguyên mà phiên bản này yêu cầu>` ở trên là chỗ giữ chỗ, không phải JSON dùng được ngay
**Đừng chép số định dạng trong bất kỳ hướng dẫn nào**, kể cả bài này. Giá trị `pack_format` thay đổi theo từng phiên bản Minecraft, gói tài nguyên và data pack mỗi bên một bộ; điền sai sẽ nhận thông báo "định dạng không tương thích", gói không được nạp.
:::

### Tra phiên bản của bạn phải điền bao nhiêu

| Cách tra | Mô tả |
| --- | --- |
| Bảng định dạng gói trong tài liệu chính thức / Minecraft Wiki | Trong bảng liệt kê số định dạng của gói tài nguyên và data pack theo phiên bản, **lấy nó làm chuẩn** |
| Tài liệu của lõi máy chủ bạn dùng | Một số lõi ghi rõ trong tài liệu định dạng tương ứng phiên bản hiện tại |
| Gợi ý do trò chơi đưa ra | Gợi ý khi nạp thất bại thường đưa ra đồng thời "định dạng gói khai báo" và "định dạng phiên bản hiện tại kỳ vọng" (văn bản cụ thể thay đổi theo phiên bản) |
| Suy ngược từ gói chính thức của phiên bản hiện tại | Xem thẳng `pack.mcmeta` trong gói tài nguyên/data pack tích hợp chính thức ghi gì |

### Các trường khác liên quan đến phiên bản

`pack.mcmeta` không chỉ có một trường `pack_format`, và **bản thân các trường cũng đang tiến hóa theo phiên bản**:

| Trường | Tác dụng | Lưu ý |
| --- | --- | --- |
| `pack.pack_format` | Số định dạng chính của gói | Ở phiên bản mới hơn đã thành tùy chọn; phiên bản cũ bắt buộc |
| `pack.supported_formats` | Khai báo một khoảng định dạng (như `[42, 45]`) | Giới thiệu từ 1.20.2; **đã bị gỡ ở phiên bản mới hơn**, chỉ giữ khi cần tương thích phiên bản cũ |
| `pack.min_format` / `pack.max_format` | Định dạng hỗ trợ nhỏ nhất/lớn nhất do phiên bản mới giới thiệu (có thể kèm số phiên bản phụ) | Thay thế vai trò của `supported_formats` |
| `pack.description` | Văn bản hiển thị khi rê chuột, hỗ trợ thành phần văn bản | Cả gói tài nguyên và data pack đều dùng |
| `pack.filter` | Lọc tệp trong gói có ưu tiên thấp hơn (regex) | Giới thiệu từ 1.19 |
| `pack.overlays` | Chồng thư mục con theo khoảng phiên bản | Giới thiệu từ 1.20.2 |
| `features.enabled` | Bật cờ tính năng thử nghiệm | Cần công tắc thử nghiệm tương ứng |

**Tên trường, có bắt buộc không, và giá trị số định dạng đều lấy tài liệu chính thức làm chuẩn**, đừng lấy bài này hay bất kỳ hướng dẫn bên thứ ba làm chuẩn.

## 8. Hiệu năng và an ninh

### Data pack là "mã máy chủ"

Trong hàm là một chuỗi lệnh **do máy chủ thực thi**, vì vậy:

- **Chỉ cài data pack từ nguồn bạn tin.** Một hàm có thể làm mọi thứ lệnh làm được: cho vật phẩm, dịch chuyển, đổi thế giới, xóa sạch vật chứa, thậm chí ném người chơi vào hư không.
- Trước khi cài **mở zip xem một lần**: trong `data/<không gian tên>/function/` có lệnh bạn không muốn chạy không; `description` trong `pack.mcmeta` có khớp nội dung thực tế không.
- Mức quyền của hàm do `function-permission-level` trong `server.properties` quyết định (mặc định 2), nó quyết định hàm chạy được lệnh "cao cấp" đến đâu.

### Hàm chạy mỗi tick sẽ làm máy chủ chậm đi

- Hàm được tag hàm `minecraft:tick` tham chiếu **chạy một lần mỗi tick (20 lần mỗi giây)**. Một lần duyệt vài trăm thực thể, hoặc mỗi tick đặt/phá khối, đều ăn MSPT một cách ổn định.
- Hàm được `minecraft:load` tham chiếu chỉ chạy một lần khi (nạp lại) nạp, cái giá nhỏ hơn nhiều.
- Khi dùng cơ chế như `/schedule`, `execute if` để "thăm dò", phải tính rõ **mỗi giây thực sự chạy bao nhiêu lần**.
- Có lag thì định lượng trước rồi mới sửa: xem [Phân tích hiệu năng bằng spark](/tutorials/ops/spark).

```text
# Phán đoán một gói có đầu vào mỗi tick không: xem nó có tệp này không
data/<không gian tên>/tags/function/tick.json
```

### Lưu ý về gói tài nguyên

- Gói tài nguyên thực thi trên client là **thay thế tư liệu**, không chạy mã được, nên rủi ro ở mức "an ninh" thấp; nhưng **chi phí tải và lưu trữ** là thật: gói tối đa 250 MiB, mỗi lần cập nhật người chơi đều phải tải lại.
- Gói lớn sẽ kéo dài rõ rệt thời gian vào máy chủ của người chơi, người chơi mạng yếu có thể bỏ luôn. **Cái gì giải quyết được bằng vài MB thì đừng dùng vài chục MB.**
- Gói tài nguyên thay thế được mọi texture, nên **cũng có thể bị dùng để đánh lừa người chơi** (ví dụ vẽ quặng thường thành quặng kim cương). Trong máy chủ nhiều người, đây là vấn đề công bằng, không chỉ là vấn đề kỹ thuật.
- Máy chủ đẩy gói tài nguyên **không có nghĩa** người chơi nhất định dùng nó: trừ khi `require-resource-pack=true`, người chơi có thể từ chối; thứ tự gói tài nguyên trên client của người chơi cũng có thể ghi đè gói bạn đẩy.

## 9. Bảng kiểm tra

| Hiện tượng | Nguyên nhân thường gặp | Kiểm tra thế nào |
| --- | --- | --- |
| Gói tài nguyên hoàn toàn không được đẩy | `resource-pack` rỗng hoặc viết sai; URL không truy cập được; sửa xong chưa khởi động lại máy chủ | Kiểm tra chính tả tên khóa và URL trong `server.properties`; dùng trình duyệt/`curl -I` xác nhận tải trực tiếp được zip |
| Người chơi vào máy chủ báo tải thất bại | Không phải HTTPS, chứng chỉ không hợp lệ, cần xác thực, bị chống hotlink, trả về HTML thay vì zip | **Xem nhật ký client** (máy chủ không ghi tải thất bại) |
| Kiểm tra hash thất bại, gói tải lại liên tục | `resource-pack-sha1` không khớp tệp thực tế; đã đóng gói lại mà chưa cập nhật hash; hash viết chữ hoa hoặc sai độ dài | Tính lại theo cách ở mục 4, xác nhận tải về đúng cùng một tệp |
| Console máy chủ xuất hiện `Invalid sha1 for resource-pack-sha1` | Giá trị khóa này không khớp gói thực tế hoặc định dạng không hợp lệ | Tính lại và cập nhật; không chắc thì để rỗng trước (sẽ mất kiểm tra) |
| Người chơi từ chối xong không vào được | `require-resource-pack=true` | Đổi thành `false` và khởi động lại; hoặc sửa xong vấn đề tải rồi mới cưỡng chế |
| Texture không đổi | Đường dẫn hoặc không gian tên trong gói viết sai; thiếu `pack.mcmeta` hoặc sai số định dạng; bị gói ưu tiên cao hơn ghi đè; gói client của người chơi ghi đè nó | Xác nhận đường dẫn `assets/<không gian tên>/textures/...` đúng; đặt gói lên trên cùng danh sách gói tài nguyên; dùng client bản gốc kiểm tra riêng |
| Chỉ có hiệu lực với một phần người chơi | Người chơi từ chối tải, hoặc dùng gói tài nguyên của chính họ | Cần toàn máy chủ nhất quán thì bật `require-resource-pack`, và giải quyết băng thông host trước |
| Data pack không xuất hiện trong `/datapack list` | Đặt nhầm thư mục (phải ở `<level-name>/datapacks/`); trong zip lồng thêm một lớp thư mục; không phải `.zip` cũng không phải thư mục | Xác nhận `pack.mcmeta` nằm ngay thư mục gốc của gói; dùng `unzip -l` xem cấu trúc |
| Data pack xuất hiện nhưng không có hiệu quả | Chưa bật; hàm không được tag `tick` / `load` tham chiếu; không gian tên hoặc đường dẫn viết sai; thuộc nội dung bắt buộc khởi động lại mới có hiệu lực | `/datapack list enabled` xác nhận đã bật; `/reload` xong xem nhật ký báo lỗi; khi cần thì khởi động lại |
| Báo "định dạng không tương thích" | `pack_format` không khớp phiên bản hiện tại (số định dạng gói tài nguyên và data pack khác nhau, đừng dùng nhầm) | Tra bảng định dạng chính thức theo mục 7; cập nhật về đúng số định dạng |
| `/reload` xong cấu hình không đổi | Nội dung đó thuộc phần bắt buộc khởi động lại; hoặc trong gói có dữ liệu không hợp lệ khiến thay đổi bị bỏ toàn bộ | Xem nhật ký máy chủ có lỗi nạp không; khởi động lại để kiểm chứng trực tiếp |
| Cài data pack xong lag rõ rệt | Có hàm gắn trên `minecraft:tick` và mỗi tick tốn kém | Kiểm tra `tags/function/tick.json`; dùng [spark](/tutorials/ops/spark) định vị |

## 10. Tóm lại

- **Gói tài nguyên đổi ngoại hình, data pack đổi luật**; một cái ở client, một cái ở máy chủ.
- **Máy chủ đẩy gói tài nguyên dựa vào bốn khóa trong `server.properties`**: `resource-pack`、`resource-pack-sha1`、`require-resource-pack`、`resource-pack-prompt` (phiên bản mới hơn còn có `resource-pack-id`), sửa xong phải khởi động lại.
- **Hash phải khớp tệp thực tế và là 40 ký tự thập lục phân chữ thường**; tính xong đừng đóng gói lại, tải lên xong phải kiểm tra lại.
- **Data pack đặt ở `<level-name>/datapacks/`**, dùng `/datapack list` kiểm chứng; `/reload` chỉ nạp lại một phần nội dung, registry động và cấu hình lõi bắt buộc khởi động lại.
- **Số định dạng thay đổi theo phiên bản**, nhất loạt tra bảng chính thức, đừng chép hướng dẫn.
- **Data pack là mã máy chủ**: chỉ cài nguồn tin cậy; hàm gắn trên `tick` sẽ liên tục tiêu hiệu năng.

Tải tài nguyên: [Tải data pack](/downloads/datapacks). Đọc thêm: [Cấu trúc máy chủ](/tutorials/java/structure) (`datapacks/` ở đâu), [Cấu hình máy chủ](/tutorials/java/config) (các khóa khác của `server.properties`), [Phân tích hiệu năng bằng spark](/tutorials/ops/spark) (định vị lag do hàm gây ra), [Sao lưu và khôi phục](/tutorials/java/backup) (đổi bản lưu thì data pack đã bật cũng đổi theo).

> Phiên bản định dạng gói và tên khóa cấu hình thay đổi theo phiên bản game, hãy lấy tài liệu chính thức làm chuẩn.
