---
title: Quản lý thế giới
slug: world
cat: java
level: 3
order: 23
minutes: 13
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, world-management, worldedit, fawe, worldguard, multiverse]
updated: 2026-10-04
draft: false
---

"Thế giới" của máy chủ không chỉ là thư mục `world` trong thư mục máy chủ. Chỉ cần bạn muốn sửa địa hình, muốn bảo vệ một vùng, muốn chạy đồng thời sảnh chờ và thế giới tài nguyên, là sẽ dùng đến loại plugin **quản lý thế giới**. Chúng thường xuất hiện cùng nhau, và cũng thường có vấn đề cùng nhau.

## 1. Quản lý thế giới gồm những việc gì

| Nhu cầu | Plugin điển hình | Giải thích một câu |
| --- | --- | --- |
| Sửa địa hình và công trình | WorldEdit / FastAsyncWorldEdit | Dùng công cụ chọn vùng để đổi khối hàng loạt, sao chép dán công trình |
| Bảo vệ vùng và đặt quy tắc thế giới | WorldGuard | Khiến một số vùng chỉ người cụ thể mới động được |
| Chạy nhiều thế giới cùng lúc | Multiverse-Core | Tạo mới, xóa, nhập thế giới, quản lý dịch chuyển giữa các thế giới |

Ba việc này ăn khớp với nhau: WorldGuard phụ thuộc WorldEdit (hoặc FAWE), lệnh chọn vùng của WorldEdit là nền của việc khoanh vùng bảo vệ. Nên thường cài cả bộ, chứ không chọn một cái.

## 2. Cơ bản về WorldEdit

WorldEdit chính là cái thường được gọi là "thần sáng thế" hay "chiếc rìu gỗ nhỏ", gần như là điểm khởi đầu của mọi công việc xây dựng và quản lý. Khái niệm cốt lõi của nó chỉ có hai: **chọn vùng trước, thao tác sau**.

### Chọn vùng

```
//wand              lấy công cụ chọn vùng (mặc định là rìu gỗ)
//pos1  //pos2      đặt vị trí hiện tại làm góc thứ nhất / thứ hai
//hpos1 //hpos2     đặt khối mà tâm ngắm chỉ vào làm góc
//expand 10 up      mở rộng vùng chọn về một hướng vài ô
//size              xem kích thước vùng chọn và tổng số khối
//limit 100000      tự đặt giới hạn số khối mỗi lần thao tác
```

Chuột trái vào khối để chọn góc thứ nhất, chuột phải vào khối để chọn góc thứ hai, đây là cách dùng phổ biến nhất; `//pos1` / `//pos2` phù hợp khi cần đứng chính xác.

### Lệnh chỉnh sửa thường dùng

```
//set stone                 đổi toàn bộ trong vùng chọn thành đá
//replace dirt grass        chỉ đổi đất trong vùng chọn thành khối cỏ
//walls stone               chỉ lấp bốn mặt của vùng chọn (rất tiện làm tường)
//copy  //paste             sao chép vùng chọn / dán vào vị trí hiện tại
//undo  //redo              hoàn tác / làm lại
```

### Lưu và dán công trình (schematic)

```
//schem save tên-công-trình    lưu vùng chọn hiện tại thành tệp
//schem load tên-công-trình    đọc tệp đã lưu
//paste                        dán vào vị trí hiện tại
```

Tệp thường nằm dưới `plugins/WorldEdit/schematics/`, của FAWE tương ứng là `plugins/FastAsyncWorldEdit/schematics/`. Chú ý cách viết lệnh thay đổi theo phiên bản: 7.x dùng `//schem`, phiên bản sớm hơn dùng `//schematic`.

:::tip Trước khi động tay hãy //size
`//size` sẽ cho bạn biết vùng chọn này rốt cuộc có bao nhiêu khối. Tạo thói quen xem một cái trước rồi mới thực thi, tránh được phần lớn sự cố "lỡ tay đổi cả bản đồ thành đá".
:::

## 3. Vì sao WorldEdit làm lag máy chủ

Việc đổi khối của WorldEdit bản gốc **thực thi trên luồng chính**. Nghĩa là trong một lần `//set`, máy chủ gần như không còn sức xử lý việc khác:

- Vùng chọn hơi lớn là hàng trăm nghìn thậm chí hàng triệu khối, mỗi khối đều phải kích hoạt tính lại ánh sáng, cập nhật khối và đánh dấu chunk;
- Luồng chính bị chiếm suốt thời gian dài, mọi người chơi cùng lag, rớt mạng, nặng thì kích hoạt watchdog làm máy chủ sập thẳng;
- Áp lực bộ nhớ và CPU tăng vọt cùng lúc, khoảng cách hiển thị càng lớn, số người online càng nhiều, tình hình càng tệ;
- Nguyên nhân phổ biến nhất là **chưa xác nhận vùng chọn đã thực thi**, hoặc kéo vùng chọn ra cả bản đồ.

Biện pháp phòng ngừa khả thi:

- Dùng `//limit` tự đặt giới hạn số khối mỗi lần thao tác;
- Mỗi lần động tay trước hết `//size` xác nhận quy mô;
- Công trình lớn chia thành nhiều lần thao tác mảng nhỏ;
- Cấp quyền WorldEdit cho người chơi theo nhu cầu, đừng mở mặc định;
- Việc thật sự quy mô lớn thì đổi sang FAWE.

## 4. FastAsyncWorldEdit (FAWE)

**FastAsyncWorldEdit là bản tối ưu bất đồng bộ của WorldEdit**, đưa việc đổi khối từ luồng chính sang luồng bất đồng bộ và xử lý theo lô, nhờ đó tránh làm máy chủ kẹt lâu.

- Nó hiện thực giao diện của WorldEdit, nên **thường thay thế thẳng WorldEdit được**: đổi WorldEdit sang FAWE xong, plugin phụ thuộc WorldEdit thường vẫn chạy bình thường.
- Nó cũng có cấu hình riêng, giới hạn được số khối mỗi lần thao tác của từng người chơi, phù hợp mở cho người chơi dùng hơn bản gốc.

**Khi nào dùng FAWE**

- Cải tạo địa hình diện rộng, dán schematic hàng loạt;
- Nhiều quản trị viên thi công cùng lúc;
- Máy chủ đông người chơi, không chịu nổi việc luồng chính bị chiếm hết.

**Khi nào WorldEdit bản gốc cũng đủ**

- Chỉ thỉnh thoảng sửa phạm vi nhỏ;
- Một số plugin có vấn đề tương thích với FAWE, mà máy chủ của bạn lại đúng là phụ thuộc nó.

:::note Không phải chọn một trong hai
FAWE và WorldEdit là hai lựa chọn cho cùng một vị trí, đừng cài cả hai cùng lúc. Cài FAWE là coi như có năng lực của WorldEdit, WorldGuard cũng nhận ra nó bình thường.
:::

## 5. WorldGuard: bảo vệ vùng

WorldGuard là plugin bảo vệ vùng phía quản trị, **phụ thuộc là WorldEdit hoặc FastAsyncWorldEdit**. Mọi chức năng của nó mặc định tắt, cần gì bật đó.

Nó chủ yếu làm hai việc.

**Bảo vệ vùng**

- Ngăn người chơi đặt và phá khối trong vùng chỉ định;
- Chỉ cho người cụ thể xây dựng trong một vùng;
- Tắt PvP, TNT, sát thương quái… trong vùng.

**Điều chỉnh quy tắc thế giới**

- Ngăn phá khối do creeper và wither gây ra, sát thương rơi…;
- Tắt cơ chế lửa lan, dung nham bén lửa, đóng băng, enderman bê khối…;
- Đưa một số vật phẩm hoặc khối vào danh sách đen, hoặc cảnh báo quản trị viên khi dùng;
- Phòng một số lỗ hổng nhân bản vật phẩm lợi dụng cơ chế game;
- Cung cấp lệnh thực dụng kiểu "dừng ngay mọi lửa lan".

Cách dùng điển hình là khoanh một vùng ở điểm hồi sinh, phố cửa hàng, khu sự kiện, rồi đặt riêng một bộ quy tắc cho thế giới tài nguyên. Khác biệt giữa tư duy bảo vệ vùng và plugin lãnh thổ xem [Lãnh thổ và bảo vệ](/tutorials/java/protection).

## 6. Multiverse: chạy nhiều thế giới cùng lúc

Multiverse-Core là plugin đa thế giới lâu đời nổi tiếng, dùng để **tạo mới, xóa, nhập thế giới (chiều)**. Cách chia thế giới phổ biến là: một sảnh chờ, một thế giới chính sinh tồn, một thế giới tài nguyên tái tạo được, một thế giới sáng tạo.

Bản thân nó chỉ làm quản lý thế giới, lối chơi cụ thể nhờ plugin mở rộng bổ sung:

| Tiện ích mở rộng | Tác dụng |
| --- | --- |
| **Multiverse-NetherPortals** | Cho cổng Nether do người chơi xây dẫn tới thế giới được chỉ định |
| **Multiverse-Portals** | Tạo cổng dịch chuyển đến địa điểm chỉ định |
| **Multiverse-Inventories** | Cách ly kho đồ người chơi theo thế giới |
| **Multiverse-SignPortals** | Dùng biển báo làm điểm dịch chuyển |

Vài chi tiết thực dụng:

- **Cấm sinh thế giới mặc định**: thế giới chính không tắt được; Nether có thể đặt `allow-nether` thành `false` trong `server.properties`; End thì đặt `settings.allow-end` thành `false` trong `bukkit.yml`. Làm vậy thường vì máy chủ chỉ dùng làm sảnh chờ hoặc máy chủ minigame, không cần chiều thêm.
- **Định dạng tên thế giới quyết định cổng thuộc về đâu**: trong `plugins/Multiverse-Core/config.yml` có `world-name-format`, mặc định đặt tên Nether và End là `%overworld%_nether` và `%overworld%_the_end`. Nếu đổi định dạng này, hoặc tạo thế giới có tên không khớp, thì liên kết cổng Nether, cổng End giữa các thế giới này và thế giới chính sẽ đứt, cổng dù kích hoạt được cũng không đưa bạn tới.
- **Kênh tải**: bản trên GitHub mới hơn bản lấy được trên SpigotMC, muốn tính năng mới thì ưu tiên xem GitHub và Hangar.
- **Lỗ hổng gây sập**: phiên bản sớm có vấn đề ký tự đặc biệt kích hoạt `PatternSyntaxException` làm máy chủ sập, **Multiverse-Core 4.3.1 đã sửa**, xin dùng phiên bản mới nhất. Khi thật sự không nâng cấp được, cộng đồng đã từng cung cấp bản vá tương ứng.

## 7. Những cái bẫy thường gặp của đa thế giới

| Cái bẫy | Hiện tượng | Cách xử lý |
| --- | --- | --- |
| Kho đồ và chế độ chơi | Đổi thế giới xong kho đồ, kinh nghiệm, chế độ chơi thay đổi theo, hoặc bạn muốn tách mà không tách | Dùng **Multiverse-Inventories** cách ly kho đồ theo thế giới; chế độ chơi của từng thế giới đặt riêng trong cấu hình thế giới |
| Cổng nối loạn | Cổng xây ở Nether đưa người chơi sang thế giới khác | Dùng **Multiverse-NetherPortals** chỉ định rõ thế giới đích, và kiểm tra `world-name-format` |
| Tên thế giới tiếng Trung bị lỗi font | Tên thế giới hiển thị lỗi trong lệnh và thông báo | Tên thế giới nhất loạt dùng tiếng Anh; muốn hiển thị tiếng Trung thì đặt `alias` trong `worlds.yml` |
| Quá nhiều thế giới | Mức chiếm bộ nhớ và đĩa tăng, khởi động chậm | Chỉ giữ những thế giới thực sự cần; thế giới không dùng thì sao lưu rồi gỡ, chứ không treo mãi |
| Ký tự đặc biệt làm sập máy chủ | Đầu vào cụ thể làm máy chủ sập thẳng | Nâng lên 4.3.1 trở lên |
| Điểm hồi sinh không đúng | Người chơi mới lần đầu vào rơi vào vị trí lạ | Đặt điểm hồi sinh riêng cho từng thế giới, chứ không chỉ dựa vào điểm hồi sinh thế giới chính |
| Quyền vào thế giới | Người chơi ra vào thế giới không nên vào tùy tiện | Dùng nút quyền kiểm soát quyền vào từng thế giới, thế giới sáng tạo và thế giới sự kiện đặc biệt phải hạn chế |

:::warn Alias không phải đổi tên
`alias` chỉ ảnh hưởng hiển thị của plugin, tên thư mục thế giới và tên dùng trong lệnh vẫn là tên tiếng Anh. Muốn đổi tên tiếng Trung thì đổi alias, đổi thẳng tên thế giới sẽ làm dữ liệu đã lưu không tìm được thế giới tương ứng.
:::

## 8. Một tổ hợp được khuyến nghị

| Nhu cầu | Lựa chọn |
| --- | --- |
| Sửa địa hình và công trình phạm vi nhỏ | WorldEdit |
| Thi công diện rộng, dán hàng loạt | FastAsyncWorldEdit (thay thế WorldEdit) |
| Bảo vệ điểm hồi sinh, cửa hàng, khu sự kiện | WorldGuard (tùy chọn WorldGuard Extra Flags bổ sung thêm flag) |
| Sảnh chờ / thế giới tài nguyên / thế giới sáng tạo | Multiverse-Core, cài thêm tiện ích mở rộng theo nhu cầu |
| Có sự cố tra được, quay lui được | Plugin ghi chép kiểu CoreProtect |

Cài xong làm ba việc trước: khoanh điểm hồi sinh vào vùng WorldGuard, đặt quy tắc cho thế giới tài nguyên, xác nhận chính sách kho đồ và chế độ chơi từng thế giới đúng như dự kiến. Ba việc này không làm thì đa thế giới chỉ phóng to rắc rối.

## Bước tiếp theo

Thế giới đã sửa, địa hình đã đổi, thì phải nghĩ cách giữ thành quả: xem [Sao lưu và khôi phục](/tutorials/java/backup). Cơ bản về cài đặt và cấu hình plugin xem [Nhập môn plugin](/tutorials/java/plugins).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
