---
title: "[JAVA] Plugin bảo mật"
slug: security-java
cat: ops
level: 2
order: 3
minutes: 12
tags: [java, ops, an toàn, plugin, authme, coreprotect, luckperms, chống gian lận]
updated: 2026-10-04
draft: false
---

Máy chủ vừa công khai là an toàn chia ba lớp: **ai là ai** (danh tính), **có sự cố tra được không** (ghi chép và quay lui), **ai làm được gì** (quyền). Ba lớp này mỗi lớp có plugin chín, dưới đây chỉ giới thiệu mấy cái **có kho chính thức tra được**.

## Một, Xác thực danh tính: AuthMe

**AuthMeReloaded** là plugin xác thực danh tính cho họ Bukkit / Spigot (định vị của chính tác giả là "plugin xác thực hướng tới API Bukkit/Spigot").

- Kho: <https://github.com/AuthMe/AuthMeReloaded>
- **Khi nào cần nó**: chỉ **chế độ offline** (`online-mode=false`) mới cần. Máy chủ bản quyền thì tài khoản do Mojang xác thực, không cần đăng nhập thêm.
- **Nó giải quyết gì**: trong chế độ offline "ID có thể bị bất kỳ ai mạo danh", AuthMe dùng **đăng ký + đăng nhập bằng mật khẩu** để gắn ID với mật khẩu, kẻ mạo danh không vào được.
- **Nó không giải quyết được gì**: vấn đề gốc của chế độ offline (bị khóa thì đổi ID là lách được, skin và UUID không gắn được) vẫn còn. **Máy chủ công khai vẫn khuyến nghị bật xác thực bản quyền**.

:::warn Cái giá của chế độ offline không mất đi vì đã cài plugin đăng nhập
Plugin đăng nhập chỉ là "bù thêm một cửa cho chế độ offline", không biến máy chủ offline thành máy chủ bản quyền. An toàn tài khoản, skin, hiệu lực khóa đều vẫn bị chiết khấu.
:::

## Hai, Ghi chép và quay lui: CoreProtect

**CoreProtect** là công cụ ghi dữ liệu và chống phá hoại (định vị chính thức: *blazing fast data logging and anti-griefing tool*).

- Kho: <https://github.com/PlayPro/CoreProtect>
- **Nó ghi cái gì**: thao tác đặt/phá khối, lấy gửi trong vật chứa, thực thể và lệnh…, ghi vào cơ sở dữ liệu.
- **Nó làm được gì**: tra "mảnh đất này ai phá lúc nào", tra một người chơi gần đây đã làm gì, **quay lui hàng loạt** theo thời gian hoặc theo người chơi, khôi phục vùng bị phá về trạng thái cũ.
- **Vì sao nó là ưu tiên số một**: không có ghi chép, bạn đến "ai làm" cũng không biết, khóa và quay lui đều không nói được.

:::tip Cài càng sớm càng tốt
CoreProtect chỉ ghi được những việc xảy ra **sau khi cài**. Đợi bị phá rồi mới cài thì trước đó không tra được gì.
:::

## Ba, Quyền: LuckPerms

**LuckPerms** là plugin quyền cho máy chủ Minecraft (định vị chính thức: *A permissions plugin for Minecraft servers.*).

- Kho: <https://github.com/LuckPerms/LuckPerms>
- **Nó giải quyết gì**: bản gốc chỉ có "cấp OP hay không", mà OP quyền rất lớn. LuckPerms dùng **nhóm quyền + nút quyền** kiểm soát tinh, ai dùng được lệnh nào, động được khối nào, đều cấu hình riêng được.
- **Ý nghĩa an toàn**: tách "quản trị viên" thành nhiều vai trò (chăm sóc khách hàng, kiến trúc sư, người dẫn sự kiện), **mỗi người chỉ nhận đúng phần quyền mình cần**, tránh việc một người cầm toàn quyền rồi xảy ra chuyện.
- **Thói quen đi kèm**: định kỳ rà soát nhóm quyền và danh sách OP.

## Bốn, Chống gian lận: Grim

**Grim** là chống gian lận **mã nguồn mở, bất đồng bộ đa luồng, kiểu dự đoán** (định vị của tác giả còn ghi khoảng phiên bản hỗ trợ 1.8–1.21, cụ thể lấy mô tả hiện tại của kho làm chuẩn).

- Kho: <https://github.com/GrimAnticheat/Grim>
- **Cách nghĩ**: không đợi người chơi vi phạm thật, mà **dự đoán** người chơi lẽ ra nên ở vị trí/trạng thái nào, lệch là phán định, nên nhạy với loại gian lận "sửa gói" truyền thống.
- **Lợi ích của mã nguồn mở**: logic phán định tra được, kiểm được, không phải tin mù hộp đen.

:::warn Phán định sai của chống gian lận hại người chơi hơn bỏ sót
Dùng chống gian lận nào cũng vậy, **trước hết chạy chế độ "chỉ ghi không phạt" quan sát một thời gian**, xác nhận không làm oan rồi mới bật phạt. Người chơi bình thường bị đá, bị bật ngược thậm chí bị khóa sẽ rời đi thẳng.
:::

## Năm, Chọn theo loại, không theo danh tiếng

| Loại | Đại diện | Mức ưu tiên |
| --- | --- | --- |
| **Ghi chép và quay lui** | CoreProtect | Bắt buộc (ưu tiên số một) |
| **Quyền** | LuckPerms | Bắt buộc |
| **Xác thực danh tính** | AuthMe (chỉ cần chế độ offline) | Máy chủ offline bắt buộc, máy chủ bản quyền không cần |
| **Chống gian lận** | Loại Grim | Điểm cộng, cần cấu hình thận trọng |
| **Ngưỡng vào máy chủ** | Danh sách trắng / duyệt khi vào | Máy chủ nhỏ chất lượng cao rất khuyến nghị |

## Sáu, Nguyên tắc chung

1. **Chỉ tải từ kênh chính thức**: plugin là mã bên thứ ba chạy với quyền máy chủ, jar chuyển tay trong diễn đàn, tệp nhóm chat rủi ro cao nhất (có thể bị nhét backdoor).
2. **Thử ở máy chủ kiểm thử trước**: đừng cài thẳng plugin không rõ nguồn gốc lên máy chủ chính.
3. **Tối thiểu quyền**: không cần cấp OP thì đừng cấp, thay bằng nút quyền.
4. **Sao lưu là phòng tuyến cuối**: chống gian lận và ghi chép đều không chặn được "tình huống xấu nhất", sao lưu ngoài trạm vẫn không bỏ được (xem "Sao lưu và khôi phục").
5. **Thao tác quản lý phải để lại dấu vết**: ai khóa ai, ai cấp cái gì, đều phải tra được, tránh cáo buộc "quản lý lạm dụng quyền".

## Bước tiếp theo

- Phương án tương ứng của Bedrock Edition xem [[BE] Plugin bảo mật](/tutorials/ops/security-be)
- Nội quy và quản lý người chơi ở tầng vận hành xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java)
- Tra nhanh tìm lỗi xem [[JAVA] Câu hỏi thường gặp](/tutorials/faq/faq-java)

---

> Mô tả định vị của các plugin trong bài lấy từ hướng dẫn của **kho chính thức** của từng cái (liên kết xem trong bài), không đưa vào plugin không kiểm chứng được nguồn.
