---
title: Máy chủ dạng rack, switch, tường lửa phần cứng và UPS
slug: hardware-rack
cat: ops
level: 3
order: 7
minutes: 18
tags: [ops, hardware, rack, server, switch, firewall, ups]
updated: 2026-10-04
draft: false
---

Mấy bài trước nói về tầng phần mềm: cài Java, chọn máy chủ, cấu hình plugin, làm sao lưu. Bài này nói về **tầng vật lý** —— những thứ thực sự quyết định "nó có chạy liên tục ba tháng mà không xảy ra chuyện hay không" sau khi bạn đặt máy chủ vào rack.

Đối tượng áp dụng từ **một chiếc máy tháp ở nhà** đến **máy 1U trong phòng máy**. Những tham số thay đổi theo model, hãng, phiên bản firmware, bài này đều ghi rõ "tùy model", không tự bịa ra một con số cụ thể cho bạn.

## 1. Trước hết phân biệt ba tầng

| Tầng | Bạn quan tâm cái gì | Biểu hiện khi có sự cố |
| --- | --- | --- |
| **Tầng ứng dụng** | Lõi máy chủ, plugin, cấu hình | Sập, lag, báo lỗi |
| **Tầng hệ thống** | Java, bộ nhớ, tường lửa, sao lưu | Không khởi động được, bị xâm nhập, mất dữ liệu |
| **Tầng vật lý** | Rack, nguồn điện, dây mạng, tản nhiệt, quản lý ngoài băng | **Cả máy mất điện, quá nhiệt giảm xung, không với tới được từ xa** |

Đặc điểm của tầng vật lý là: **bình thường hoàn toàn không cảm nhận được, lúc có sự cố thì khó cứu nhất**. Máy trong phòng máy một khi mất liên lạc, việc bạn làm được thường chỉ là gọi điện nhờ người nhấn nút nguồn. Nên tiền và thời gian ở tầng này, đầu tư vào "phòng ngừa" là đáng nhất.

## 2. Cơ bản về rack: 19 inch, chiều cao U và ray trượt

Rack tiêu chuẩn đến từ loạt quy chuẩn **EIA-310 / IEC 60297**, mấy con số then chốt:

| Hạng mục | Giá trị | Mô tả |
| --- | --- | --- |
| Chiều rộng lắp đặt | 19 inch = **482.6 mm** | Chiều rộng thông thủy giữa hai mặt bích lắp đặt hai bên |
| Chiều cao 1U | **44.45 mm** (1.75 inch) | Mọi số U đều là bội số của nó |
| Rack 42U toàn chiều cao | Khoảng **1866.9 mm** chiều cao lắp đặt khả dụng | Chiều cao ngoài tổng thể thường khoảng 2000 mm, tùy hãng |
| Độ sâu thường gặp | 600 / 800 / 1000 / 1200 mm | **Tủ rack cho máy chủ thường phải từ 800 mm trở lên** |

Kích thước thường gặp: **1U** (mỏng nhất, dư địa tản nhiệt nhỏ nhất, tốc độ quạt cao nhất, ồn nhất), **2U** (dư địa tản nhiệt và mở rộng tốt hơn rõ rệt, lắp được nhiều ổ cứng và card PCIe nửa chiều cao), **4U** (lắp được card toàn chiều cao, nhiều khay ổ, độ ồn gần với máy tháp). Dùng ở nhà hoặc quy mô nhỏ nên ưu tiên 2U/4U hoặc dùng thẳng máy tháp —— độ ồn của máy 1U (thường ở bậc 60–80 dBA, tùy model) không phù hợp đặt trong phòng ngủ.

Lỗ lắp đặt có hai loại:

- **Rack lỗ vuông**: dùng **đai ốc lồng (cage nut)** + vít M6, phổ biến nhất;
- **Rack lỗ ren**: vặn thẳng vít 10-32 hoặc M6, không cần đai ốc lồng.

Lỗ của EIA-310 **lặp theo nhóm ba lỗ** (khoảng cách 15.875 mm / 15.875 mm / 12.7 mm), khi lắp ray trượt bắt buộc phải căn đúng nhóm lặp này, nếu không thiết bị trên dưới sẽ lệch nhau.

**Ray trượt (rail kit)** là chỗ nhiều bẫy nhất:

- **Ray tĩnh**: đặt thiết bị lên là không kéo ra được, rẻ, chắc chắn;
- **Ray trượt**: kéo cả máy ra để bảo trì được, thường có **tay quản lý dây (CMA)**, giá cao hơn;
- Ray trượt phần lớn là **dành riêng cho hãng/model**, và **khoảng độ sâu hỗ trợ có hạn** —— trước khi mua tủ rack hãy xác nhận độ sâu tối thiểu/tối đa mà ray hỗ trợ, tủ 600 mm không chứa được nhiều máy chủ thân dài;
- Ray trượt phải chừa **dư dây cáp**, nếu không khi kéo ra sẽ giật đứt dây mạng dây nguồn.

Trong rack còn có **PDU 0U lắp dọc** không chiếm vị trí U (xem mục 15), cùng PDU lắp ngang chiếm 1U, tấm quản lý dây, tấm bịt.

## 3. Luồng gió: trước vào sau ra, hành lang nóng lạnh, và "đừng bao giờ chắn cửa gió vào"

Tuyệt đại đa số máy chủ dạng rack là **gió vào phía trước, gió ra phía sau**: khí lạnh hút từ mặt trước, khí nóng thải ra phía sau. Cách bố trí phòng máy cũng từ đó mà ra:

- **Hành lang lạnh**: mặt trước tủ rack, điều hòa thổi khí lạnh tới đây;
- **Hành lang nóng**: mặt sau tủ rack, khí nóng thiết bị thải ra tập trung ở đây để hồi;
- Trạng thái lý tưởng là **tách hành lang lạnh và nóng** (hành lang kín hoặc bố trí hợp lý), tránh khí nóng bị hút ngược lại vào cửa gió vào.

Mấy kỷ luật cứng:

1. **Tuyệt đối không chắn cửa gió vào**. Mặt trước bị chắn, bị nhét vào tủ kín, đặt sát tường, đều trực tiếp gây quá nhiệt giảm xung thậm chí chết máy.
2. **Vị trí U trống phải lắp tấm bịt (blanking panel)**. Chỗ trống sẽ khiến khí nóng từ phía sau tủ rack chảy ngược về phía trước, bị thiết bị phía trên hút vào lại.
3. **Lưới lọc bụi phải vệ sinh định kỳ**. Lưới lọc bị bít tức là chắn mất cửa gió vào.
4. **Cửa tủ rack phải đủ thoáng**. Thường yêu cầu tỷ lệ lỗ thoáng cao (phổ biến trên 60%, cụ thể xem thông số của hãng), cửa kính đặc là thảm họa với thiết bị mật độ cao.
5. **Chú ý model có hướng quạt**. Một số switch và nguồn hỗ trợ **đảo chiều luồng gió** (gió vào phía cổng hoặc gió ra phía cổng), thuộc **SKU khác nhau**, bắt buộc phải đặt hàng theo hướng luồng khí của tủ rack; lắp lẫn sẽ làm rối hành lang nóng lạnh.
6. **Xem nhiệt độ gió vào, đừng xem nhiệt độ phòng máy**. Cảm biến nhiệt độ phải đặt gần cửa gió vào của thiết bị; nhiệt độ môi trường phòng máy có khoảng cho phép theo khuyến nghị ASHRAE (khác nhau theo cấp A1–A4), nhưng **nhiệt độ gió vào của thiết bị** mới là đại lượng thực sự quyết định có giảm xung hay không.

Khi thuê đặt máy (colocation), bạn thường chỉ kiểm soát được mặt trước tủ rack: hãy tuân thủ quy định hành lang nóng lạnh của phòng máy, đừng vì tiện cho mình mà lắp ngược máy.

## 4. Chọn phần cứng máy chủ cho Minecraft: ưu tiên đơn nhân

Vòng tick của máy chủ Minecraft nhắm tới **20 TPS**, tức là mỗi tick có ngân sách **50 ms**. Luồng chính phụ trách phần lớn logic thế giới: thực thể, redstone, cập nhật khối, di chuyển người chơi, phần lớn việc điều phối nạp chunk. Vì vậy:

**Hiệu năng đơn nhân (xung × IPC) quan trọng hơn số nhân.**

| Loại tải công việc | Đặc điểm luồng |
| --- | --- |
| Vòng tick chính (thực thể, redstone, người chơi, phần lớn logic khối) | Cơ bản đơn luồng, quyết định TPS |
| Sinh chunk / chiếu sáng (sau khi Paper và tương tự chuyển sang bất đồng bộ) | Có thể đa luồng, nhiều nhân thì có lợi |
| Tác vụ bất đồng bộ của plugin/mod, cơ sở dữ liệu, render bản đồ | Có thể đa luồng |
| Mở nhiều instance máy chủ cùng lúc | Số nhân hưởng lợi tuyến tính trực tiếp |

Kết luận:

- Một máy chỉ chạy một máy chủ nguyên bản/Paper quy mô trung bình, **2–4 nhân xung cao** thường thắng 16 nhân xung thấp;
- Nhiều nhân **không phải lãng phí**, nhưng lợi ích biên cho một instance là giảm dần;
- Khi chọn CPU hãy xem **điểm benchmark đơn luồng** (điểm đơn nhân của các bộ benchmark), đừng chỉ xem "mấy nhân mấy luồng";
- **Nền tảng tiêu dùng vs nền tảng máy chủ**: nền tảng tiêu dùng (Ryzen, Core) thường đơn nhân mạnh hơn, rẻ hơn, êm hơn; nền tảng máy chủ (Xeon E, Xeon Silver, EPYC, v.v.) cung cấp ECC, IPMI, nguồn dự phòng, nhiều kênh bộ nhớ và khay ổ hơn. **Khác biệt giữa các thế hệ model rất lớn, hãy lấy trang thông số của hãng làm chuẩn.**

Về bộ nhớ: máy chủ nguyên bản nhỏ 4–8 GB, quy mô trung bình hoặc có plugin 8–16 GB, gói tổng hợp lớn trên 16 GB là khoảng thường gặp; **cấp bộ nhớ nhiều hơn không có lợi ích** (xem [Cấu hình máy chủ](/tutorials/java/config)), nhưng cấp thiếu sẽ GC liên tục gây lag.

## 5. ECC và không ECC

Bộ nhớ **ECC (Error-Correcting Code)** có thể sửa lỗi một bit, phát hiện lỗi hai bit (SEC-DED), và báo lên khi gặp lỗi không sửa được. Nó **không nâng hiệu năng**, nó nâng **độ tin cậy khi chạy dài hạn**:

- Một máy bật liên tục vài tháng, xác suất bộ nhớ bị lỗi không thấp; khi bộ nhớ không ECC bị lỗi thường biểu hiện là **hỏng dữ liệu âm thầm** —— tệp thế giới bị ghi hỏng, sau đó bạn hoàn toàn không biết nguyên nhân;
- ECC cần **CPU + mainboard + thanh bộ nhớ đồng thời hỗ trợ**, thiếu một cái là không được;
- **UDIMM (không buffer)** thường gặp ở nền tảng tiêu dùng/máy chủ phổ thông; **RDIMM / LRDIMM (có thanh ghi/giảm tải)** chỉ dùng được trên nền tảng máy chủ, dung lượng mỗi thanh lớn hơn, mỗi kênh cắm được nhiều thanh hơn;
- **ECC trên chip của DDR5 (on-die ECC) không bằng ECC đầu-cuối**: đó là cơ chế bên trong chip DDR5, không báo lên hệ thống, không thay thế được ECC ngoài băng;
- Lỗi ECC có thể giám sát qua nhật ký SEL của BMC/IPMI hoặc hệ thống con EDAC của Linux (`/sys/devices/system/edac/`, `edac-util`, v.v.).

**Kết luận**: dùng ở nhà làm máy chủ giải trí, không ECC chấp nhận được; **máy chủ mở ra Internet dài hạn, dữ liệu người chơi quan trọng thì nên dùng ECC**. Lưu ý ECC và không ECC, RDIMM và UDIMM **cắm lẫn thường không khởi động được**, trước khi nâng bộ nhớ hãy xem danh sách tương thích QVL của mainboard.

## 6. Lưu trữ: SSD / NVMe và độ bền

| Giao tiếp | Băng thông tuần tự điển hình | Ghi chú |
| --- | --- | --- |
| SATA SSD | Khoảng 500–560 MB/s | Bị giới hạn bởi SATA 6 Gb/s, hiệu năng ngẫu nhiên vẫn tốt hơn hẳn ổ cơ |
| NVMe PCIe 3.0 x4 | Khoảng 3.5 GB/s | Tùy model |
| NVMe PCIe 4.0 x4 | Khoảng 7 GB/s | Tùy model |
| NVMe PCIe 5.0 x4 | Khoảng 14 GB/s | Tùy model, tỏa nhiệt rõ rệt |

**Với Minecraft, băng thông tuần tự cơ bản không phải nút thắt**. Thứ thực sự ảnh hưởng trải nghiệm là:

- **Độ trễ và biểu hiện theo độ sâu hàng đợi của đọc ghi ngẫu nhiên 4K** (tệp chunk, nhật ký, cơ sở dữ liệu);
- **Khuếch đại ghi và việc tụt tốc sau khi cạn cache SLC** (khi lưu hoặc sao lưu lượng lớn);
- **Bảo vệ khi mất điện (PLP)**: ổ doanh nghiệp có PLP, khi mất điện có thể ghi nốt dữ liệu đang trên đường xuống đĩa; ổ tiêu dùng thường không có, **bù bằng UPS** (xem mục 13).

**Độ bền** được đo bằng **TBW (tổng số byte ghi)** hoặc **DWPD (số lần ghi toàn ổ mỗi ngày)**. Điểm cần chú ý:

- TLC bền và ghi liên tục tốt hơn QLC; ổ QLC tụt tốc rõ rệt sau khi ghi lượng lớn;
- **Ổ không có cache DRAM** (dựa vào HMB) thường yếu hơn dưới tải ngẫu nhiên, phù hợp tải nhẹ;
- Bản thân Minecraft lượng ghi không quá lớn: máy chủ lưu thế giới định kỳ (bản gốc khoảng 5 phút một lần, Spigot/Paper chỉnh được bằng `ticks-per.autosave` trong `spigot.yml`), cộng thêm nhật ký và dữ liệu người chơi;
- Nhưng **plugin sẽ khuếch đại lượng ghi rõ rệt**: plugin ghi nhật ký như CoreProtect, render bản đồ của Dynmap/BlueMap, sao lưu tự động thường xuyên, đều ghi đĩa liên tục;
- Vì vậy **tách ổ hệ thống và ổ dữ liệu**, **ghi sao lưu ra đĩa khác hoặc NAS/HDD** là cách làm phổ biến;
- **RAID không phải sao lưu**: RAID 1 chịu được hỏng một ổ, không chịu được xóa nhầm, ransomware và rm -rf, sao lưu ngoài vị trí vẫn bắt buộc phải làm (xem [Sao lưu và khôi phục](/tutorials/java/backup)).

## 7. Nguồn dự phòng (1+1) và môi trường thuê đặt máy

**Nguồn dự phòng 1+1** nghĩa là máy có hai module nguồn thay nóng, một cái hỏng thì cái kia vẫn gánh được toàn bộ tải của máy. Chú ý mấy điểm dễ hiểu nhầm:

- **Mỗi module đều phải gánh được một mình toàn bộ tải**, không phải "mỗi cái một nửa"; khi chọn cấu hình hãy chọn công suất module đơn theo công suất đỉnh của cả máy;
- Thứ thực sự có ý nghĩa là **cấp nguồn hai đường (nguồn A/B)**: nối nguồn A và nguồn B vào **PDU khác nhau / nhánh khác nhau**. Nếu hai module cắm cùng một ổ chia điện, ổ đó nhảy atomat là 1+1 coi như không có;
- Tủ rack thuê đặt thường cung cấp hai đường điện lưới A/B, **một số phòng máy tính thêm phí cho đường thứ hai**, hãy hỏi rõ trước khi ký hợp đồng;
- 1+1 phòng "module nguồn hỏng" và "một đường điện hỏng", **không phòng được cả hai đường cùng mất** —— việc đó phải nhờ UPS và máy phát;
- Nguồn dự phòng mang thêm tiếng ồn quạt và một chút tổn thất hiệu suất; cấp hiệu suất nguồn (các mức 80 PLUS) ảnh hưởng tiền điện và tỏa nhiệt, thuê đặt dài hạn thì đáng để quan tâm.

## 8. IPMI / BMC quản lý ngoài băng

**BMC (Baseboard Management Controller)** là một hệ thống nhỏ độc lập trên mainboard máy chủ, được cấp điện từ nguồn chờ, **vẫn trực tuyến khi hệ điều hành đã tắt thậm chí chưa cài hệ điều hành**. Tên gọi do hãng đặt khác nhau: Dell gọi iDRAC, HPE gọi iLO, Lenovo gọi XClarity Controller, Supermicro/ASRock Rack/Gigabyte thường gọi thẳng là BMC hoặc IPMI. Về giao thức, truyền thống là **IPMI 2.0**, thay thế hiện đại là **Redfish** (giao diện REST trên HTTPS).

Nó làm được những việc:

- **KVM từ xa**: nhìn màn hình, gõ bàn phím như ngồi trước máy, gồm cả vào BIOS;
- **Phương tiện ảo**: gắn ISO ở máy bạn thành ổ đĩa quang, dùng để cài hệ điều hành/cứu hộ;
- **Điều khiển nguồn**: bật, tắt, khởi động lại, cắt điện cưỡng bức;
- **Cảm biến và nhật ký**: nhiệt độ, quạt, điện áp, nhật ký sự kiện SEL;
- **Serial over LAN**: xem console qua chuyển hướng cổng nối tiếp.

Cổng thường gặp (**cổng và cách hiện thực cụ thể thay đổi theo hãng/model**):

| Mục đích | Cổng thường gặp |
| --- | --- |
| IPMI RMCP / RMCP+ | UDP 623 |
| Giao diện web BMC | TCP 80 / 443 |
| KVM từ xa (một số cách hiện thực) | TCP 5900 / 5901, v.v. |
| Redfish | TCP 443 |

:::warn Tuyệt đối không để IPMI lộ ra Internet
Đây không phải khuyến nghị thận trọng, mà là đồng thuận rõ ràng của ngành. Lý do: IPMI 2.0 trong lịch sử có lỗ hổng kiểu vượt qua xác thực (ví dụ vấn đề cipher 0 / RAKP nổi tiếng), firmware của nhiều hãng mang **tài khoản mật khẩu mặc định** (giá trị mặc định cụ thể thay đổi theo model và phiên bản firmware, nhất định phải tự đổi), một số cách hiện thực mã hóa lưu lượng quản lý yếu, giao diện web cũng từng có lượng lớn lỗ hổng. **Có được BMC tức là có được cả máy**: có thể bật máy từ xa, gắn image, cài lại hệ điều hành.

Cách làm đúng:
- BMC nối vào **dải mạng/VLAN quản lý riêng**, không dùng chung với cổng nghiệp vụ;
- Dải mạng đó **không có route ra Internet**, khi cần truy cập thì nối VPN hoặc máy nhảy trước;
- Đổi mật khẩu mặc định, tắt các dịch vụ không dùng (ví dụ không dùng IPMI over LAN thì tắt đi), giới hạn IP nguồn được truy cập;
- Cập nhật firmware BMC kịp thời (lỗ hổng firmware BMC là bề mặt tấn công thật);
- Ưu tiên dùng Redfish thay cho IPMI.
:::

## 9. Switch: không quản lý và có quản lý

| Khả năng | Không quản lý | Có quản lý (L2 / L2+) |
| --- | --- | --- |
| Cắm là chạy | Có | Cần cấu hình |
| VLAN (802.1Q) | Không | Có (cổng access / trunk) |
| Gộp liên kết (LACP, 802.3ad) | Không | Có |
| Gương cổng (SPAN) | Không | Có, bắt buộc phải có khi bắt gói để xử lý sự cố |
| Giám sát SNMP | Không | Có (v2c / v3) |
| Chống vòng STP / RSTP | Thường có cách hiện thực cơ bản | Có |
| IGMP snooping (tối ưu multicast) | Không | Có |
| Bảo mật cổng / chặn bão gói / DHCP snooping | Không | Có |

Cách chọn:

- **Ở nhà một hai máy, một mạng phẳng**: switch gigabit không quản lý là đủ, rẻ, không có điểm hỏng, hỏng thì thay;
- **Có tủ rack, cần tách dải nghiệp vụ/quản lý, cần gộp liên kết hoặc bắt gói**: dùng loại có quản lý. VLAN có thể tách BMC, lưu lượng nghiệp vụ, mạng khách ra, là tiền đề của yêu cầu an ninh ở mục 8.

Hai khái niệm bắt buộc phải nhớ:

1. **Switch không làm NAT, cũng không làm chuyển tiếp cổng**. Switch lớp hai chỉ chuyển tiếp theo MAC; switch lớp ba có thể định tuyến giữa các VLAN, nhưng **thường không làm NAT**. Chuyển tiếp cổng ra Internet bắt buộc phải do router/tường lửa thực hiện (xem [Router và tường lửa](/tutorials/ops/router-firewall)).
2. "Router" gia đình thực ra là máy tích hợp **định tuyến + chuyển mạch + AP không dây**; đừng coi nó là switch thuần.

## 10. Chọn tốc độ và tỷ lệ gộp đường lên

| Chuẩn | Phương tiện thường dùng | Khoảng cách |
| --- | --- | --- |
| 1000BASE-T (1GbE) | Cat5e / Cat6 | 100 m |
| 2.5GBASE-T / 5GBASE-T | Cat5e / Cat6 (802.3bz) | 100 m |
| 10GBASE-T | Cat6 khoảng 55 m; Cat6a 100 m | Tùy chuẩn đi dây và công bố của hãng |
| 10GBASE-SR | Cáp quang đa mode OM3 / OM4 | Khoảng 300 m / 400 m |
| 10GBASE-LR | Cáp quang đơn mode OS2 | Khoảng 10 km |
| SFP+ DAC / AOC | Cáp đồng nối trực tiếp / cáp quang có nguồn | Cự ly ngắn trong tủ rack, thường vài mét |

**Khi nào điều này quan trọng với Minecraft?**

- Băng thông một người chơi chiếm thực ra rất nhỏ (bậc vài chục đến vài trăm kbit/s, đột biến khi vào máy chủ nạp chunk), **một máy chủ 1GbE đủ gánh rất nhiều người chơi**;
- **1GbE là đáp án đúng cho tuyệt đại đa số tình huống mở máy chủ**;
- 2.5GbE/10GbE thực sự hữu ích khi: **lưu trữ/NAS/sao lưu, di chuyển máy ảo, lượng lớn lưu lượng nội bộ giữa các máy chủ**;
- Đừng vì "trông chuyên nghiệp" mà gắn 10GbE cho máy chủ MC, số tiền đó bỏ vào UPS hoặc ECC đáng hơn.

**Đường lên và tỷ lệ gộp (oversubscription)**: tỷ số giữa tổng băng thông cổng truy cập và băng thông đường lên. Ví dụ 24 cổng gigabit với 2 đường lên 10 gigabit = 24 Gb/s truy cập so với 20 Gb/s đường lên, khoảng 1.2:1; với 1 đường lên gigabit thì là 24:1. Tủ rack nhỏ dùng đường lên gigabit hoàn toàn đủ. Lưu ý **LACP gộp tổng băng thông, một luồng vẫn chỉ đi một liên kết** (chọn theo hash), nên một tác vụ sao lưu đơn lẻ chưa chắc chạy hết băng thông gộp.

**PoE chỉ liên quan đến điện thoại, camera, AP không dây**. Máy chủ không ăn PoE. Đối chiếu thông số: 802.3af khoảng 15.4 W mỗi cổng (phía nhận khoảng 12.95 W), 802.3at/PoE+ khoảng 30 W (khoảng 25.5 W), 802.3bt Type 3/4 khoảng 60 W / 90 W. Ngân sách tổng công suất PoE của cả máy có hạn (khác nhau rất nhiều theo model), trước khi gắn nhiều thiết bị công suất cao hãy tính ngân sách trước.

## 11. Tường lửa phần cứng: nó bù vào tầng "biên"

**Tường lửa trên máy chủ** (Windows Firewall, ufw, firewalld, nftables) chỉ bảo vệ **chính máy đó**, và chỉ có hiệu lực sau khi hệ điều hành khởi động. Nó không làm được:

- **Kiểm tra trạng thái** ở biên mạng (conntrack theo dõi trạng thái kết nối), loại bỏ trước khi lưu lượng đến bất kỳ máy nào;
- **NAT / chuyển tiếp cổng** (đây là việc của router/tường lửa);
- **VPN site-to-site** (nối mạng nội bộ hai địa điểm) và **VPN truy cập từ xa**;
- **Chính sách thống nhất**: định nghĩa quy tắc một chỗ, phủ cả dải mạng, thay vì cấu hình lặp trên từng máy;
- **Tập trung nhật ký và kiểm toán**: ai lúc nào thử kết nối cổng nào;
- **Phân đoạn DMZ**: tách dịch vụ lộ ra Internet khỏi máy nội bộ (xem mục 12);
- **Vẫn chặn được khi máy không bật, hệ thống sập, bị xâm nhập**.

Có hai dạng:

- **Thiết bị phần cứng chuyên dụng** (thiết bị tường lửa/UTM/NGFW của các hãng);
- **x86 + bản phân phối tường lửa**: pfSense (dòng FreeBSD), OPNsense, OpenWrt, v.v., chạy trên máy x86 thường, hiệu quả trên chi phí cao, tính năng đầy đủ, rất phù hợp tủ rack nhỏ. Cách chọn và cấu hình xem [Router và tường lửa](/tutorials/ops/router-firewall).

**Về các con số hiệu năng trên datasheet, nhất định phải thận trọng**:

| Chỉ số | Ý nghĩa |
| --- | --- |
| Firewall throughput | Thường là khả năng chuyển tiếp thuần với gói lớn, không kiểm tra sâu |
| IPS / NGFW throughput | Khả năng sau khi bật kiểm tra sâu, **thường chỉ còn một phần nhỏ của chuyển tiếp thuần** |
| VPN throughput | Thông lượng đường hầm mã hóa, liên quan đến thuật toán và CPU |
| Concurrent sessions | Dung lượng bảng kết nối đồng thời |
| New sessions/sec | Tốc độ tạo kết nối mới |

**Mỗi hãng có phương pháp đo khác nhau** (kích thước gói, giao thức, có bật tính năng hay không đều khác), so số trực tiếp giữa các hãng là vô nghĩa, **lấy điều kiện đo trong datasheet chính thức của hãng làm chuẩn**.

Với tình huống Minecraft, số kết nối chỉ vài trăm đến vài nghìn, nhu cầu băng thông thường dưới vài trăm Mbit/s, **một thiết bị phổ thông hoặc một router phần mềm x86 nhỏ là quá đủ**. Lý do mua NGFW cỡ lớn nên là VPN, phân đoạn và năng lực quản lý, chứ không phải "MC cần nhiều thông lượng".

## 12. Sơ đồ mạng và DMZ

Thứ tự tiêu chuẩn:

```text
Internet (WAN)
   |
Modem quang / ONT
   |
[ Tường lửa / Router ]        <- NAT, chuyển tiếp cổng, kiểm tra trạng thái, VPN đều ở đây
   |
[ Switch ]                 <- phân đoạn VLAN, gộp liên kết
   |----------|----------|
[ Máy chủ MC ] [ Máy quản lý ] [ Cổng quản lý BMC ]
```

**DMZ** là một **dải mạng/giao diện/VLAN độc lập**, dùng để chứa các dịch vụ "bắt buộc phải mở ra Internet" (như bảng điều khiển, dịch vụ Web). Cách nghĩ về quy tắc:

- WAN đến DMZ: chỉ cho qua những cổng thực sự cần;
- **DMZ đến LAN: mặc định từ chối** (hoặc chỉ cho qua rất ít lưu lượng cần thiết);
- LAN đến DMZ: cho phép quản lý;
- Như vậy dù dịch vụ công khai bị chiếm, kẻ tấn công cũng bị nhốt trong DMZ, không với tới được cơ sở dữ liệu nội bộ và các máy khác.

:::warn "DMZ host" trên router tiêu dùng là chuyện khác
Tính năng "DMZ" của nhiều router gia đình là chuyển tiếp **mọi cổng** vô điều kiện cho một máy nội bộ. Đó không phải phân đoạn, mà là để một máy lộ hoàn toàn ra Internet. **Đừng dùng tính năng này**, hãy chuyển tiếp từng cổng một.
:::

Kỷ luật biên khác: tắt giao diện quản lý phía WAN, đổi mật khẩu mặc định, không cần thì tắt UPnP/NAT-PMP, bật nhật ký, sao lưu cấu hình tường lửa định kỳ. Ngoài ra, **tường lửa không chặn được lỗ hổng tầng ứng dụng** —— lỗ hổng của chính máy chủ, RCE của plugin phải nhờ vá lỗi và quản lý quyền (xem [Plugin an ninh](/tutorials/ops/security-java)).

## 13. UPS: nó thực sự bảo vệ cái gì

| Mối đe dọa | UPS có giải quyết không | Mô tả |
| --- | --- | --- |
| Mất điện hoàn toàn | Có (thời gian hữu hạn) | Nhờ ắc quy trụ đến khi tắt máy êm hoặc máy phát khởi động |
| Sụt áp / thiếu áp (brownout) | Có | Model có AVR có thể tăng áp bù |
| Xung / đỉnh điện | Một phần | Có khả năng kẹp, nhưng **sét đánh trực tiếp không thuộc phạm vi bảo đảm** |
| Dao động tần số/điện áp | Tùy model | Loại trực tuyến triệt để nhất |
| Quá tải | Không | Quá tải sẽ chuyển thẳng sang bypass hoặc tắt |
| Ắc quy lão hóa | Không | Cần thay định kỳ |

**Khác biệt giữa VA và W**: VA là công suất biểu kiến (điện áp × dòng điện), W là công suất thực, tỷ số hai cái là hệ số công suất (PF). Datasheet thường ghi cả hai (ví dụ 1500 VA / 900 W). **Chọn theo W**, và chừa dư: giữ tải dài hạn trong 60%–80% W danh định; đồng thời xác nhận trần VA cũng không vượt.

**Thời gian trụ không tuyến tính**: tải giảm một nửa, thời gian trụ **không đúng là gấp đôi** (hiệu ứng Peukert của ắc quy chì-axit và tổn thất cố định của nghịch lưu), và ắc quy còn lão hóa theo thời gian và nhiệt độ. **Lấy đường cong thời gian trụ của hãng làm chuẩn**, đừng tự ước tính tuyến tính.

**Dạng sóng**:

- Loại dự phòng và phần lớn loại tương tác trực tuyến khi chạy bằng ắc quy xuất ra **sin mô phỏng (sóng bậc thang)**;
- Loại trực tuyến (biến đổi kép) xuất **sóng sin thuần**;
- **Nguồn PFC chủ động được thiết kế cho đầu vào sin**, gặp sóng bậc thang có thể phát tiếng ù, chuyển mạch thất bại thậm chí tắt máy —— **có dùng được hay không tùy model nguồn**, lấy thông số của hãng nguồn làm chuẩn;
- Kết luận: **nguồn PFC chủ động nên đi với UPS sóng sin thuần**; tải loại có động cơ cũng nên dùng sin thuần.

**Ba kiểu cấu trúc**:

| Loại | Thời gian chuyển | Dạng sóng ra | Đặc điểm |
| --- | --- | --- | --- |
| Dự phòng / ngoại tuyến | Thường vài mili giây đến hơn mười mili giây | Phần lớn là sóng bậc thang | Rẻ nhất, năng lực bảo vệ yếu nhất |
| Tương tác trực tuyến | Thường 2–10 ms | Phần lớn sóng bậc thang, một số model sin thuần | Phổ biến nhất ở tủ rack nhỏ, có AVR |
| Trực tuyến / biến đổi kép | 0 (nghịch lưu liên tục) | Sin thuần | Ổn áp cách ly tốt nhất, tỏa nhiệt, tiếng ồn, điện năng, giá đều cao hơn |

Thời gian chuyển và dạng sóng **đều thay đổi theo model**, hãy xem datasheet cụ thể.

**Ước tính thô tải**: máy chủ 1U 250–400 W (tùy CPU và số khay ổ), switch 30–60 W, tường lửa 20–40 W, cộng lại rồi chừa thêm 30% dư, sau đó chọn theo **W danh định** của UPS, và xác nhận thời gian trụ đáp ứng "ít nhất đủ để hoàn tất tự động tắt máy" (thường 10–15 phút là đủ).

## 14. Giám sát UPS và tự động tắt máy bằng NUT

UPS chỉ có ý nghĩa khi **báo được cho máy chủ** —— nếu không, khi mất điện bạn chỉ trụ thêm mười phút rồi vẫn mất điện cứng như thường. Cách kết nối:

| Cách | Mô tả |
| --- | --- |
| USB HID | Phổ biến nhất ở UPS hiện đại, driver `usbhid-ups` hỗ trợ trực tiếp |
| USB chuyển cổng nối tiếp | Một số model dùng giao thức cổng nối tiếp, thường dùng driver như `nutdrv_qx` |
| Cổng nối tiếp RS-232 | **Thứ tự dây thường là riêng của hãng**, ví dụ một số model APC dùng dây chuyên dụng cụ thể (loại 940-0024C); dây chéo thường không chắc dùng được, **tùy model** |
| Card quản lý SNMP | UPS doanh nghiệp có thể gắn card mạng, giám sát qua mạng, **model card thay đổi theo hãng** |

**NUT (Network UPS Tools)** là phương án phổ biến nhất trên Linux, chia ba tầng: **driver phụ trách giao tiếp với UPS, upsd là phía dịch vụ, upsmon là client giám sát**. upsmon đọc trạng thái từ upsd, và kích hoạt tắt máy khi cần.

Tên gói cài và tên dịch vụ **khác nhau theo bản phân phối**: Debian/Ubuntu thường là `nut-server` (upsd) và `nut-client` (upsmon), bản mới còn dùng `nut-driver-enumerator` / `nut-driver@myups`; dòng RHEL/Fedora tên dịch vụ thường là `nut-server` và `nut-monitor`; thư mục cấu hình của dòng Debian là `/etc/nut/`, một số bản phân phối (như dòng SUSE) là `/etc/ups/`. **Các ví dụ dưới đây đưa theo đường dẫn của Debian/Ubuntu**.

`/etc/nut/ups.conf`:

```ini
# Định nghĩa một UPS tên là myups
[myups]
    driver = usbhid-ups
    port = auto
    desc = "Rack UPS"
```

`/etc/nut/upsd.users` (tài khoản để `upsmon` đăng nhập vào upsd):

```ini
[monuser]
    password = secret
    upsmon primary
```

`/etc/nut/upsmon.conf` (cấu hình tối thiểu dùng được):

```conf
MONITOR myups@localhost 1 monuser secret master
MINSUPPLIES 1
SHUTDOWNCMD "/sbin/shutdown -h +0"
POLLFREQ 5
POLLFREQALERT 5
HOSTSYNC 15
DEADTIME 15
POWERDOWNFLAG /etc/killpower
```

Giải thích và điểm cần chú ý:

- Định dạng dòng `MONITOR` là `MONITOR <ups> <powervalue> <username> <password> <mode>`; `1` nghĩa là UPS này cấp 1 nguồn cho hệ thống, `master` nghĩa là máy này phụ trách phát động tắt máy trước khi ắc quy cạn;
- **Từ NUT 2.8.0, `master`/`slave` được đổi tên thành `primary`/`secondary`**, cách viết cũ vẫn được chấp nhận để tương thích; tài liệu và ví dụ bản mới dùng `primary` nhiều hơn, **lấy tài liệu chính thức của phiên bản bạn cài làm chuẩn**;
- `/etc/nut/upsd.users` và `upsmon.conf` chứa mật khẩu, dòng Debian nên đặt `root:nut` và quyền `640`, nếu không `upsmon` có thể từ chối khởi động;
- `upsd` mặc định lắng nghe **TCP 3493**. Nếu chỉ giám sát máy này thì **đừng để nó lộ ra mạng**; khi thực sự cần giám sát nhiều máy, hãy dùng tường lửa giới hạn địa chỉ nguồn.

Lệnh thường dùng:

```bash
upsc myups                     # liệt kê mọi biến của UPS
upsc myups ups.status          # chỉ xem trạng thái, như OL (điện lưới) / OB (ắc quy) / LB (ắc quy yếu)
upscmd -l myups                # liệt kê các lệnh tức thời mà UPS này hỗ trợ
upsrw -l myups                 # liệt kê các biến ghi được
systemctl restart nut-server   # khởi động lại sau khi đổi cấu hình (tên dịch vụ thay đổi theo bản phân phối)
upsmon -c fsd                  # diễn tập tắt máy cưỡng bức, dùng thận trọng
```

**Thay ắc quy và tự kiểm tra**:

- Tuổi thọ ắc quy chì-axit kín van (VRLA/AGM) thường gặp thường **3–5 năm**; **nhiệt độ môi trường càng cao tuổi thọ càng ngắn** (theo kinh nghiệm kỹ thuật, mỗi lần tăng khoảng 10 độ C thì tuổi thọ gần như giảm một nửa, đây là quy luật kinh nghiệm);
- Nhiều UPS tự kiểm tra hai tuần một lần, cũng có thể kích hoạt thủ công (nút trên mặt máy hoặc `upscmd myups test.battery.start.quick`, tên lệnh tùy model);
- **Khi tự kiểm tra thất bại hoặc thời gian trụ thấp hơn yêu cầu của bạn thì nên thay ắc quy**; một chuỗi ắc quy phải thay cả bộ;
- Model dùng ắc quy lithium (như LiFePO4) thường có tuổi thọ dài hơn, nhưng **tùy model cụ thể**;
- Ắc quy cũ hãy thu hồi theo quy định địa phương, đừng vứt bừa.

## 15. Dây cáp và an toàn nguồn điện

**Nguồn điện**

- **Tuyệt đối không nối tiếp ổ chia điện** (ổ chia cắm vào ổ chia). Nối tiếp sẽ tăng điện trở tiếp xúc, làm mất tác dụng phối hợp của atomat, và có thể khiến một ổ cắm tường bị quá tải. Trong tủ rack hãy dùng **PDU dạng rack**.
- PDU có hai loại lắp ngang 1U và lắp dọc 0U; ổ cắm thường gặp **IEC 60320 C13 (cấp khoảng 10 A)** và **C19 (cấp khoảng 16 A)**, đầu vào là C14/C20. Chọn PDU **loại đo được hoặc điều khiển từ xa** để tiện truy nguyên và khởi động lại từ xa.
- **Nối đầu ra UPS vào PDU, nối thiết bị cần bảo vệ vào PDU đó**; đừng cắm thiết bị then chốt trực tiếp vào ổ tường.
- **Rõ dung lượng nhánh điện**: ổ cắm 10 A / 250 V phổ biến ở Trung Quốc khoảng 2200 W; NEMA 5-15 ở Bắc Mỹ trên nhánh 15 A / 120 V khoảng 1800 VA, và theo quy chuẩn tải liên tục thường chỉ lấy 80% (khoảng 1440 W); BS 1363 của Anh là 13 A. **Thực tế lấy thiết kế điện hiện trường và phán đoán của thợ điện làm chuẩn, đừng chạy sát trần.**
- **Nối đất**: đừng bẻ chân dây đất, đừng dùng đầu chuyển "ba sang hai", tủ rack phải nối đẳng thế. Thả nổi đất vừa là rủi ro điện giật và cháy, vừa gây ra những sự cố gián đoạn khó hiểu.

**Dây cáp**

- **Dán nhãn cả hai đầu**: một đầu ghi thiết bị và cổng đối diện, đầu kia ghi ngược lại. Trong phòng máy, dây không có nhãn tức là không có dây.
- Giữ một sơ đồ hoặc bảng tô-pô đơn giản (máy nào cổng nào nối vào cổng switch nào).
- Bó dây bằng **dây dính ma thuật** chứ không phải dây rút: dây rút sẽ siết hại cáp, và mỗi lần sửa phải cắt đi.
- **Cáp quang chú ý bán kính uốn** (thường không nhỏ hơn 10 lần đường kính cáp, cụ thể xem thông số của hãng), đừng gập gãy; cáp đồng cũng đừng uốn gập quá mức lâu dài.
- Cố gắng tách đường điện mạnh và đường tín hiệu; khi dùng ray trượt hãy chừa đủ dư dây, và cân nhắc tay quản lý dây.
- **Dự phòng vật tư**: mỗi loại chiều dài dây mạng một sợi, dây nguồn C13/C19, module SFP+/DAC, đai ốc lồng và vít, một ổ cứng dự phòng. Trong môi trường thuê đặt máy, một lần gọi "tay người" đến tận nơi thường đắt hơn mấy món dự phòng này nhiều.

## 16. Danh sách kiểm tra trước khi lắp lên rack

- [ ] Độ sâu tủ rack khớp khoảng hỗ trợ của ray trượt, vị trí U đã quy hoạch và chừa chỗ bảo trì
- [ ] Vị trí U trống đã lắp tấm bịt, cửa gió vào mặt trước không bị chắn, lưới lọc bụi sạch
- [ ] Nguồn A/B nối vào PDU khác nhau / nhánh khác nhau, và mỗi đường đều đi qua UPS
- [ ] Tổng tải nhánh điện đã tính, chưa vượt giá trị danh định (kể cả dư)
- [ ] Nối đất bình thường, không dùng bất kỳ đầu chuyển nào phá dây đất
- [ ] BMC đã đổi mật khẩu mặc định, nối vào dải mạng quản lý riêng, **xác nhận từ Internet không với tới được**
- [ ] Trên switch đã chia VLAN nghiệp vụ / quản lý / khách (nếu dùng switch có quản lý)
- [ ] Internet chỉ mở những cổng cần thiết (Java `TCP 25565`; Bedrock `UDP 19132`), **RCON `TCP 25575` và cổng cơ sở dữ liệu chưa bị lộ**
- [ ] Cấu hình tường lửa/router đã xuất sao lưu, quản lý phía WAN đã tắt
- [ ] UPS đã vào giám sát, **đã thực sự diễn tập một lần tự động tắt máy**
- [ ] Mọi dây cáp đã dán nhãn hai đầu, hồ sơ tô-pô đã cập nhật
- [ ] Vật tư dự phòng (dây mạng, dây nguồn, module, ổ cứng) đã sẵn sàng

Tra nhanh cổng (giá trị mặc định, đều có thể đổi):

| Mục đích | Giao thức/cổng |
| --- | --- |
| Game bản Java | TCP 25565 |
| Game bản Bedrock | UDP 19132 |
| Query (tùy chọn) | UDP 25565 |
| RCON (**cấm để lộ**) | TCP 25575 |
| IPMI / BMC | UDP 623, v.v. |
| SNMP | UDP 161 / 162 |
| NUT | TCP 3493 |

## Bước tiếp theo

- Cấu hình biên mạng thế nào, chuyển tiếp cổng ra sao: xem [Router và tường lửa](/tutorials/ops/router-firewall)
- Để người khác kết nối được vào máy chủ của bạn: xem [Triển khai đến môi trường truy cập được](/tutorials/java/deploy)
- Đường đáy của an toàn dữ liệu: xem [Sao lưu và khôi phục](/tutorials/java/backup)
- Cấu hình an ninh của chính máy chủ: xem [Plugin an ninh](/tutorials/ops/security-java)

---

> Mọi con số cụ thể trong bài này (độ sâu tủ rack, hướng luồng gió, cổng, chỉ số hiệu năng và thời gian trụ, thông tin đăng nhập mặc định, v.v.) đều thay đổi theo hãng, model và phiên bản firmware, **hãy lấy tài liệu chính thức của thiết bị làm chuẩn**; các thao tác liên quan đến nguồn điện và nối đất, hãy để thợ điện có chứng chỉ xác nhận.
