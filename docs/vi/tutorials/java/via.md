---
title: Tương thích đa phiên bản
slug: via
cat: java
level: 3
order: 21
minutes: 11
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, via, cross-version, compatibility, protocol]
updated: 2026-10-04
draft: false
---

Người chơi không vào được, hiện thông báo "phiên bản không tương thích" hoặc "client quá cũ", là một trong những câu hỏi nhờ trợ giúp phổ biến nhất khi mở máy chủ. Nguyên nhân rất đơn giản: máy chủ và client nói các phiên bản khác nhau của cùng một bộ giao thức, hai bên không khớp được với nhau. Việc plugin đa phiên bản làm, chính là đứng ở giữa làm phiên dịch.

Bài này nói rõ bộ Via mỗi cái phụ trách hướng nào, cài ở đâu, ai phụ thuộc ai, và chúng không làm được gì. Kiến thức tiền đề xem [Nhập môn plugin](/tutorials/java/plugins).

## 1. Vì sao người chơi không vào được

Client và máy chủ Java Edition của Minecraft giao tiếp qua một bộ giao thức nhị phân. Mỗi phiên bản game đều sửa bộ giao thức này: thêm gói dữ liệu mới, đổi thứ tự trường, đổi nghĩa giá trị số. Phiên bản giao thức không khớp thì giai đoạn bắt tay sẽ thất bại, người chơi thường thấy một câu thông báo phiên bản không khớp.

Máy chủ chỉ nhận client đúng phiên bản của nó (và một ít phiên bản tương thích). Vì thế:

- Máy chủ là 1.20.4, người chơi dùng client 1.21: không vào được.
- Máy chủ là 1.21, người chơi dùng client 1.8: cũng không vào được.

Cách làm việc của plugin đa phiên bản là nhận gói dữ liệu của người chơi ở phía máy chủ, dịch chúng thành dạng máy chủ hiểu được, rồi dịch phản hồi của máy chủ trở lại phiên bản giao thức của người chơi. **Client của người chơi không cần cài gì cả.**

:::warn Đa phiên bản không phải giải pháp vạn năng
Nó dịch giao thức, không dịch lối chơi. Khoảng phiên bản càng lớn, thứ khớp được càng ít, trải nghiệm giảm càng rõ, chi tiết xem mục 5.
:::

## 2. Bộ ba Via mỗi cái lo gì

Bộ Via là một gia đình, ba plugin lần lượt phụ trách các hướng khác nhau. Cách nhớ hướng: **"lên" là để client mới hơn vào, "xuống" là để client cũ hơn vào.**

| Plugin | Hướng | Tác dụng | Phụ thuộc |
| --- | --- | --- | --- |
| **ViaVersion** | Tương thích lên | Cho client mới hơn máy chủ vào máy chủ | Không có, là lõi |
| **ViaBackwards** | Tương thích xuống | Cho client cũ hơn máy chủ vào máy chủ | Cần ViaVersion |
| **ViaRewind** | Tương thích xuống các phiên bản cũ hơn | Hỗ trợ client 1.7.x và 1.8.x | Cần ViaVersion, thường cài cùng ViaBackwards |

Ví dụ minh họa phạm vi bao phủ:

- Máy chủ 1.9.x, chỉ cài ViaVersion: cho client từ 1.9.x đến bản mới nhất vào máy chủ.
- Máy chủ 1.21.x, cài ViaVersion + ViaBackwards: cho client từ 1.9.x đến 1.20.x vào máy chủ.
- Thêm ViaRewind: phủ đến 1.7.x và 1.8.x.

Chồng cả ba lại, bản Via dạng plugin phủ đại khái cả đoạn từ 1.7 đến bản mới nhất.

### Kênh tải xuống

| Plugin | Trang phát hành |
| --- | --- |
| ViaVersion | SpigotMC tài nguyên 19254, Hangar, Modrinth, GitHub |
| ViaBackwards | SpigotMC tài nguyên 27448, Hangar, Modrinth, GitHub |
| ViaRewind | SpigotMC tài nguyên 52109, Hangar, Modrinth, GitHub |

Trang build chính thức là `ci.viaversion.com`, cần build mới nhất thì lấy ở đây.

:::note Hỗ trợ Java 8
Bộ Via phiên bản mới đã bỏ hỗ trợ Java 8, vì thế trên máy chủ rất cũ không dùng trực tiếp được. Nếu bạn muốn máy chủ từ 1.8 đến 1.21 đều dùng được, cần lấy bản nhánh Java 8 riêng từ trang build.
:::

:::tip Phiên bản phải căn khớp
Khi cài đồng thời ViaVersion và ViaBackwards, cố gắng chọn bản cùng thời kỳ. Sau khi cập nhật proxy, cũng nhớ nâng bộ Via lên mới nhất cùng lúc, nếu không sẽ gặp tình huống "cài đa phiên bản rồi mà vẫn báo phiên bản không được hỗ trợ". Dù không dùng proxy, cũng nên cập nhật ít nhất mỗi tháng một lần.
:::

## 3. Cài ở đâu: máy chủ hay proxy

Bộ Via cài được trên BungeeCord, Velocity và đủ loại máy chủ Minecraft, nhưng vị trí cài khác nhau thì hiệu quả và bẫy cũng khác.

| Vị trí cài | Ưu điểm | Cái giá |
| --- | --- | --- |
| Máy chủ phía sau | Phía sau nhận được **phiên bản client thật** của người chơi, chống gian lận và plugin loại gói dữ liệu hoạt động bình thường | Mỗi máy chủ phía sau đều phải cài một bộ, cấu hình phải tự bảo trì riêng |
| Phía proxy | Chỉ cần cài một lần, người chơi hoàn tất dịch trước khi vào bất kỳ máy chủ phía sau nào | Máy chủ phía sau thấy phiên bản người chơi là **phiên bản của proxy**, không phải phiên bản thật của client người chơi |

Nếu bạn dùng chống gian lận, chống bot… loại plugin xử lý nhiều gói dữ liệu, cài Via ở phía proxy dễ gây vấn đề tương thích, cần thận trọng. Ngược lại, nếu bạn chỉ có một máy chủ phía sau, hoặc muốn người chơi hoàn tất dịch trước khi chọn máy chủ, cài ở phía proxy sẽ đỡ việc hơn.

:::warn Đa phiên bản và phía mod
Phương án đa phiên bản không phù hợp máy chủ mod. Mod sẽ sửa giao thức và nội dung registry, plugin đa phiên bản không dịch được những phần tự định nghĩa này, dùng lẫn sẽ ra rất nhiều vấn đề.
:::

## 4. Thứ tự cài và quan hệ lẫn nhau

Quan hệ của ba plugin là phụ thuộc từng lớp:

1. **Cài ViaVersion trước**. Nó là lõi, chỉ cài nó là đã có năng lực tương thích lên.
2. **Cần tương thích xuống thì thêm ViaBackwards**. Nó lùi giao thức phiên bản mới thành dạng phiên bản cũ hiểu được.
3. **Cần hỗ trợ 1.7 và 1.8 thì thêm ViaRewind**. Nó cần đi cùng ViaRewind Legacy Support mới phát huy đủ năng lực tương thích.

Về thứ tự nạp, để ViaVersion nạp trước, ViaBackwards và ViaRewind nạp sau là được, thường máy chủ tự xử lý theo quan hệ phụ thuộc, không cần can thiệp tay. Cài xong khởi động lại máy chủ, xác nhận ở console cả ba plugin đều nạp thành công.

## 5. Làm được gì, không làm được gì

Đây là phần dễ gây hiểu nhầm nhất: **Via dịch giao thức, không thêm nội dung.**

| Hiện tượng người chơi gặp | Nguyên nhân |
| --- | --- |
| Client phiên bản cao vào máy chủ phiên bản thấp, không dùng được chức năng của vật phẩm phiên bản cao | Máy chủ căn bản không có logic của những vật phẩm đó, chỉ có thể dùng vật phẩm phiên bản thấp có chất liệu gần giống để thay thế hiển thị |
| Client phiên bản thấp không thấy chất liệu của vật phẩm phiên bản cao | Client không có model và tài nguyên texture tương ứng, plugin chính thức không xử lý; từ 1.16 trở lên có cách lách, nhưng không phải năng lực chính thức |
| Client dưới 1.17 không thấy khối dưới y=0 | Giao thức và render của client cũ không hỗ trợ độ cao âm, chính thức nói rõ sẽ không sửa |
| Vào máy chủ xong hành vi kỳ lạ: bật ngược, động tác không đồng bộ, giao diện lệch | Khoảng phiên bản quá lớn, khái niệm hai bên khớp được quá ít |
| Báo gửi quá nhiều gói dữ liệu và bị đá ra | Chạm giới hạn pps của hai bên, xem dưới |

Khoảng phiên bản càng lớn, trải nghiệm giảm càng rõ. Trừ khi bạn có khả năng cho người chơi phiên bản thấp cũng có trải nghiệm khá, đừng mù quáng theo đuổi "ăn hết mọi phiên bản".

### Mục cấu hình thường gặp

| Mục cấu hình | Công dụng |
| --- | --- |
| `serverside-blockconnections` | Khi chất liệu khối hoặc texture nối hiển thị không đúng, thử đổi thành `true` |
| `max-pps` | Chỉnh khi người chơi bị đá do gửi quá nhiều gói dữ liệu; dùng nhánh Paper thì có thể đặt thẳng `-1`, rồi chỉnh riêng giới hạn pps của bản thân Paper |
| `fix-1_13-face-player` | Chuyển gói dữ liệu skin 1.13 cho người chơi 1.12, cần bộ đệm thêm |
| `handle-pings-as-inv-acknowledgements` | Gửi gói xác nhận kho đồ thay cho ping với client dưới 1.17, có ích cho tương thích chống gian lận |
| `replace-adventure` | Tùy chọn của ViaRewind, quyết định hạt của 1.9 có được thay bằng hạt gần giống của 1.8 và thấp hơn không |

:::warn Đừng tắt thẳng giới hạn pps
Nâng giới hạn gói dữ liệu là để người chơi bình thường không bị đá nhầm, nhưng tắt hẳn sẽ cho người chơi ác ý cơ hội tấn công bằng gói dữ liệu làm lag máy chủ. Chỉnh đến mức "người chơi bình thường không chạm tới" là được.
:::

## 6. Bản độc lập: ViaProxy

Nếu bạn đến việc đổi lõi máy chủ cũng không tiện, còn một phương án độc lập: **ViaProxy**. Nó là chương trình proxy độc lập, hỗ trợ client phiên bản bất kỳ kết nối máy chủ phiên bản bất kỳ, không cần cài plugin trong máy chủ.

Phạm vi bao phủ của nó rộng hơn bản plugin nhiều, gồm cả các phiên bản Alpha, Beta, Classic xa xưa, snapshot Cá tháng tư, snapshot thử chiến đấu, thậm chí có thể qua Geyser cho người chơi Bedrock Edition vào. Tải ở GitHub Releases của ViaVersion và trang build chính thức.

:::note Khi nào dùng nó
Khi bạn muốn client hiện đại vào máy chủ cũ mười năm trước, hoặc chỉ muốn tạm kiểm chứng tương thích của một phiên bản nào đó, ViaProxy đỡ việc hơn nhiều so với cải tạo máy chủ. Nhưng nó là tiến trình độc lập, thêm một lớp chuyển tiếp, cũng nghĩa là thêm một chỗ phải bảo trì và tìm lỗi.
:::

## 7. Tra cứu nhanh khi tìm lỗi

| Hiện tượng | Tra gì trước |
| --- | --- |
| Cài xong vẫn báo phiên bản không được hỗ trợ | Bộ Via có phải mới nhất không; nâng cấp proxy xong có nâng Via cùng lúc không |
| Một phần người chơi không vào được, người khác bình thường | Phiên bản client của những người chơi này có vượt phạm vi bao phủ của plugin hiện tại không |
| Chất liệu hoặc texture hiển thị bất thường | `serverside-blockconnections`; client phiên bản thấp không thấy chất liệu phiên bản cao là hành vi dự kiến |
| Người chơi bị đá, báo quá nhiều gói dữ liệu | `max-pps` và giới hạn pps của Paper |
| Chống gian lận báo nhầm hoặc hành vi bất thường | Via có cài ở phía proxy không; phía sau nhận phiên bản proxy chứ không phải phiên bản thật của người chơi |
| Người chơi phiên bản thấp bật ngược liên tục dưới y=0 | Hạn chế đã biết, sẽ không sửa |

## Bước tiếp theo

- Cài đặt và cấu hình cơ bản của plugin: [Nhập môn plugin](/tutorials/java/plugins)
- Dựng máy chủ nhóm và chuyển tiếp gói dữ liệu: [Proxy đa máy chủ](/tutorials/java/proxy)
- Khái niệm cơ bản về giao thức và gói dữ liệu: [Giao thức mở máy chủ và khuyến nghị cấu hình](/tutorials/java/protocol)
- Cho người chơi điện thoại và Bedrock Edition cũng vào được: [Hỗ trợ người chơi trên điện thoại](/tutorials/java/mobile)

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
