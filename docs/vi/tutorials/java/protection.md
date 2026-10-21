---
title: Lãnh thổ và bảo vệ
slug: protection
cat: java
level: 3
order: 22
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, land-claim, protection, residence, dominion, worldguard]
updated: 2026-10-04
draft: false
---

Máy chủ vừa mở công khai là gần như chắc chắn gặp cùng một loại rắc rối: **có người phá công trình của người khác, có người lục hộp của người khác, có người đứng ở điểm sinh ra săn người mới**. Những việc này khó giải quyết bằng cách nói lý sau sự việc, cần phòng ngừa đồng thời ở hai tầng quy định và kỹ thuật. Bài này chỉ nói về **lãnh thổ và bảo vệ** ở tầng kỹ thuật.

## 1. Vì sao cần bảo vệ lãnh thổ

Vấn đề phổ biến nhất trong máy chủ công khai có thể gom thành ba loại:

| Loại vấn đề | Biểu hiện điển hình | Tác dụng của plugin bảo vệ | Tác dụng của plugin ghi vết |
| --- | --- | --- | --- |
| Phá hoại | Phá công trình, đốt rừng, đổ dung nham, san phẳng ruộng của người khác | Chặn người ngoài sửa khối | Tra ra ai làm, quay lui khu vực |
| Trộm cắp | Lục hộp, lấy đồ trong lò và phễu, dắt gia súc đi | Cấm người ngoài mở thùng chứa và lấy thực thể | Tra lịch sử lấy/đặt của thùng chứa |
| Tranh chấp | Giành quái, chặn cửa, PvP trước cửa nhà người khác | Cấm PvP và một phần tương tác trong khu vực | Khôi phục hiện trường, làm căn cứ xử phạt |

:::note Bảo vệ là phòng ngừa, ghi vết là truy vết
Hai thứ giải quyết hai vấn đề khác nhau. Plugin bảo vệ phụ trách **khiến phá hoại không xảy ra được**, plugin ghi vết phụ trách **truy rõ và khôi phục sau sự việc**. Máy chủ thực sự vững vàng cài cả hai, lý do xem mục 5.
:::

## 2. Hai con đường: người chơi tự khoanh đất và quản trị viên phân vùng

Plugin loại lãnh thổ chia thành hai loại có tư duy hoàn toàn khác nhau. Phân biệt điểm này trước thì chọn plugin phía sau mới không rối:

| | Người chơi tự khoanh đất | Quản trị viên bảo vệ vùng |
| --- | --- | --- |
| Ai vẽ ranh giới | **Chính người chơi**, dùng lệnh hoặc công cụ khoanh | **Quản trị viên**, dùng công cụ chọn vùng |
| Plugin điển hình | Residence, Dominion, GriefDefender | WorldGuard |
| Người chơi có phải học lệnh không | Có, và phải hiểu quy tắc khoanh đất | Cơ bản không cần |
| Độ chi tiết bảo vệ | Theo người chơi, theo lãnh thổ | Theo khu vực, theo thế giới |
| Tình huống phù hợp | Máy chủ sinh tồn, máy chủ cho tự do xây nhà | Điểm sinh ra, cửa hàng, khu sự kiện, công trình công cộng |
| Chi phí quản lý | Thấp, người chơi tự quản | Cao, mỗi khu vực đều cần quản trị viên duy trì |

**Tự khoanh đất là trao cho mỗi người chơi một cái khóa, phân vùng của quản trị viên là dựng hàng rào cho khu vực công cộng**. Hai bên không xung đột, máy chủ quy mô lớn hơn thường dùng đồng thời.

## 3. Plugin lãnh thổ cho người chơi tự quản

### Residence

Plugin lãnh thổ lâu đời, lịch sử phát triển hơn mười ba năm, ban đầu do bekvon duy trì, sau đó đội Zrips tiếp nhận, và chuyển sang mô hình **mã nguồn mở thu phí**.

- **Phụ thuộc**: cần CMIlib mới chạy được.
- **Phiên bản**: hỗ trợ máy chủ 1.8 trở lên, độ phủ rất rộng.
- **Bảo mật**: để tránh bị lợi dụng bởi lỗ hổng đã biết, **đừng dùng bản dưới 5.1.4.2**.
- Bản miễn phí vẫn tải được từ SpigotMC hoặc trang chủ Zrips.

Ưu thế lớn nhất của nó là **độ nổi tiếng**: rất nhiều máy chủ đã dùng, người chơi quen logic lệnh của nó, người chơi cũ học rất nhanh; tương thích hệ sinh thái cũng được kiểm chứng lâu dài, xác suất xung đột với plugin khác tương đối nhỏ.

### Dominion

Plugin lãnh thổ **hoàn toàn mã nguồn mở, miễn phí** do nhà phát triển trong nước viết, ngay từ đầu đã thiết kế cho phiên bản cao.

- **Yêu cầu phiên bản**: chỉ hỗ trợ 1.20.1 trở lên (Bukkit / Spigot / Paper / Folia), **máy chủ dưới 1.20 không dùng được**.
- **Môi trường chạy**: cần Java 21.
- Tuy tương thích Spigot, nhưng tác giả rất khuyến nghị dùng Paper hoặc các nhánh của nó (như Purpur) để có trải nghiệm hiệu năng tốt hơn.
- Hỗ trợ nhập phần lớn dữ liệu của Residence, chi phí di chuyển thấp.
- Dự án hiện vẫn đánh dấu là beta, nên cập nhật rất thường xuyên: lợi là sửa lỗi nhanh, giá là nhịp nâng cấp cũng nhanh.

### GriefDefender

Cũng là plugin bảo vệ lãnh thổ, có tài liệu tiếng Anh và tiếng Trung. Cần lưu ý: **mã nguồn mở dừng ở năm 2021**, sau đó không công khai tiếp, tình trạng bảo trì lâu dài cần tự đánh giá.

## 4. Bảo vệ vùng phía quản trị: WorldGuard

Định vị của WorldGuard khác ba cái trên: nó không hướng tới người chơi tự khoanh đất, mà để **quản trị viên vạch khu vực và đặt quy tắc**.

- **Phụ thuộc**: bắt buộc cài WorldEdit hoặc FastAsyncWorldEdit.
- **Trạng thái mặc định**: mọi chức năng mặc định tắt, chỉ bật phần bạn thực sự cần.

Việc nó làm được chia thành hai loại.

**Bảo vệ khu vực**

- Chặn người chơi đặt và phá khối trong khu vực chỉ định;
- Chỉ cho người cụ thể xây trong một khu vực;
- Cấm PvP, TNT, sát thương quái trong khu vực.

**Điều chỉnh quy tắc thế giới**

- Chặn phá khối do creeper và wither gây ra, cùng sát thương ngã;
- Tắt lan lửa, dung nham bén lửa, đóng băng, enderman bê khối…;
- Đưa một số vật phẩm hoặc khối vào danh sách đen, khiến không dùng được;
- Cảnh báo cho quản trị viên khi có người dùng vật phẩm hoặc khối chỉ định;
- Ngăn một số lỗ hổng nhân bản vật phẩm lợi dụng cơ chế trò chơi;
- Cung cấp lệnh quản trị thực dụng kiểu "dừng ngay mọi lan lửa".

WorldGuard là **công cụ của phía vận hành**, không phải công cụ của người chơi. Nó phù hợp dùng ở điểm sinh ra, phố cửa hàng, khu sự kiện, và những thế giới cần quy tắc thống nhất, ví dụ thế giới tài nguyên cấm PvP, cấm đặt khối.

## 5. Quan hệ giữa lãnh thổ và plugin ghi vết/quay lui

Nhiều người tưởng cài plugin lãnh thổ rồi thì không cần quan tâm ghi vết, đây là hiểu lầm phổ biến:

- **Lãnh thổ chỉ bảo vệ nơi đã được khoanh**. Vùng hoang, khu công cộng, đất trống chưa khoanh đều không có bảo vệ.
- **Lãnh thổ không bảo vệ được việc gây án bên trong**. Nếu người chơi cấp quyền cho đồng đội không đáng tin, hoặc chia sẻ lãnh thổ ra ngoài, plugin không ngăn người đó dọn sạch hộp.
- **Plugin lãnh thổ thường không có quay lui**. Hành vi nó chặn được thì đã chặn, những gì không chặn được (nổ, phá hoại ngoài lãnh thổ, cấu hình quyền sai) vẫn cần plugin ghi vết để khôi phục.

Nên tổ hợp chuẩn là: **plugin lãnh thổ phụ trách phòng ngừa, plugin ghi vết như CoreProtect phụ trách truy vết và quay lui**. Phân công và chi tiết cấu hình của hai bên xem ở [Chống gian lận và chống phá hoại](/tutorials/java/anticheat).

:::warn Plugin ghi vết phải cài sớm
Nó chỉ ghi được những việc **sau khi cài đặt**. Đợi bị phá rồi mới cài thì ghi vết trước đó hoàn toàn không có.
:::

## 6. Bảng so sánh

| Plugin | Ai khoanh đất | Độ khó bắt đầu | Yêu cầu phiên bản | Mục đích điển hình |
| --- | --- | --- | --- | --- |
| **Residence** | Người chơi tự quản | Thấp, lâu đời và nhiều hướng dẫn | 1.8+ | Máy chủ sinh tồn cho tự do xây nhà; máy chủ cũ đông người chơi |
| **Dominion** | Người chơi tự quản | Thấp đến trung bình | 1.20.1+, cần Java 21 | Máy chủ sinh tồn phiên bản cao mới mở, muốn dùng giải pháp mã nguồn mở |
| **GriefDefender** | Người chơi tự quản | Trung bình | Tùy phiên bản | Quản lý lãnh thổ cần phân cấp quyền chi tiết |
| **WorldGuard** | Quản trị viên | Trung bình đến cao, phải học chọn vùng và flag | Theo WorldEdit / FAWE | Điểm sinh ra, cửa hàng, khu sự kiện, quy tắc cấp thế giới |

## 7. Chọn thế nào

Có thể phán đoán theo thứ tự sau:

1. **Phiên bản máy chủ có trên 1.20.1 không?**
   - Có: Residence và Dominion đều cân nhắc được. Muốn mã nguồn mở, cập nhật sôi động thì chọn Dominion; muốn người chơi quen, tương thích vững thì chọn Residence.
   - Không: loại thẳng Dominion, chọn giữa Residence và GriefDefender.
2. **Người chơi chủ yếu là người cũ hay người mới?**
   - Nhiều người chơi cũ: hiểu biết sẵn có về Residence tiết kiệm được nhiều công giải đáp.
   - Nhóm người chơi hoàn toàn mới: thiết kế lệnh của Dominion gần với thói quen dùng phiên bản cao hơn.
3. **Có cần đặt quy tắc cho khu vực công cộng không?**
   - Cần: dù chọn plugin lãnh thổ nào, cũng cài thêm WorldGuard.
4. **Có nhu cầu đa phiên bản hoặc lõi đặc biệt không?**
   - Có: ưu tiên giải pháp tương thích rộng hơn, tài liệu đầy đủ hơn, và kiểm chứng trên máy chủ thử nghiệm trước.

:::tip Đừng cài đồng thời hai plugin lãnh thổ tự quản
Residence, Dominion, GriefDefender giải quyết cùng một vấn đề. Cài đồng thời hai cái, người chơi sẽ không biết dùng cái nào, logic chọn vùng của hai plugin còn dễ can thiệp lẫn nhau. **Chọn một cái là đủ**; WorldGuard thuộc một tầng khác, có thể cùng tồn tại.
:::

## 8. Bẫy thường gặp khi triển khai

- **Không giới hạn hạn mức khoanh đất**: kích thước và số lượng lãnh thổ cấp cho người chơi phải cấu hình tốt, nếu không một người có thể khoanh hết quanh điểm sinh ra. Phần lớn plugin hỗ trợ cấp hạn mức khác nhau theo nhóm quyền.
- **Chưa cấu hình nút quyền**: lệnh của plugin lãnh thổ đều do nút quyền kiểm soát. Không cấu hình tốt thì hoặc người chơi không dùng được, hoặc ai cũng là quản trị viên.
- **Lãnh thổ chồng lấn và sát nhau**: xác nhận trước plugin xử lý lãnh thổ chồng lấn, sát nhau thế nào, và ghi kết luận vào quy định máy chủ.
- **Dịch chuyển lãnh thổ bị lạm dụng**: dịch chuyển lãnh thổ là chức năng phổ biến, nhưng phải giới hạn tần suất và thời gian chờ, tránh bị dùng như phương tiện đi lại miễn phí giữa các bản đồ.
- **Chỉ có hiệu lực ở thế giới chính**: bảo vệ của nhiều plugin lãnh thổ được cấu hình theo thế giới. Sau khi mở đa thế giới, nhớ kiểm tra thế giới tài nguyên, thế giới sáng tạo có bảo vệ không, hoặc có **cố ý** không đặt bảo vệ không —— thế giới tài nguyên thường là nơi cho người ta đào tùy thích.

## Bước tiếp theo

Lãnh thổ và bảo vệ khu vực phải dựa vào công cụ để vạch ra, mà bộ công cụ này cùng nhóm với chỉnh sửa thế giới và quản lý đa thế giới: xem [Quản lý thế giới](/tutorials/java/world).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
