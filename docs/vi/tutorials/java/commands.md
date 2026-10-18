---
title: Lệnh máy chủ thường dùng
slug: commands
cat: java
level: 1
order: 9
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, lệnh, op, ban, whitelist, console]
updated: 2026-10-04
draft: false
---

Quản lý máy chủ hằng ngày, đi đi lại lại cũng chỉ những lệnh này. **Chạy trong console máy chủ thì không cần thêm `/`**, chạy trong ô chat trong game thì phải thêm `/`.

## Một, bật tắt và lưu

| Lệnh | Tác dụng |
| --- | --- |
| `stop` | **Tắt an toàn** máy chủ (lưu trước rồi thoát). **Luôn dùng nó để tắt máy chủ, đừng đóng thẳng cửa sổ** |
| `save-all` | Lưu ngay toàn bộ dữ liệu thế giới |
| `save-off` / `save-on` | Tắt / khôi phục tự động lưu (**trước khi sao lưu** hãy tắt, tránh sao lưu phải bản lưu ghi dở) |
| `reload` | Nạp lại gói dữ liệu và một phần cấu hình. **Dùng cẩn thận**: có thể làm trạng thái plugin rối loạn, dùng được `reload` của chính plugin thì đừng dùng nó |
| `restart` | Khởi động lại máy chủ (một số lõi hỗ trợ) |

:::tip Tư thế chuẩn khi tắt máy chủ
`save-all` → `save-off` → sao lưu → `stop`. Đóng thẳng cửa sổ có thể làm hỏng bản lưu hoặc quay lui dữ liệu.
:::

## Hai, quản lý người chơi

| Lệnh | Tác dụng |
| --- | --- |
| `list` | Liệt kê người chơi **đang trực tuyến** |
| `kick <người chơi> [lý do]` | Đá người chơi, **họ vẫn vào lại được** |
| `ban <người chơi> [lý do]` | Cấm người chơi, **không gỡ cấm thì không vào được** |
| `pardon <người chơi>` | Gỡ cấm người chơi (phiên bản cũ có thể là `unban`) |
| `ban-ip <IP>` | Cấm theo IP (**mọi người sau IP đó đều không vào được**, dùng cẩn thận) |
| `pardon-ip <IP>` | Gỡ cấm IP |
| `op <người chơi>` | Cấp quyền OP (quản trị viên) |
| `deop <người chơi>` | Thu quyền OP |

### Danh sách trắng

```
whitelist on                  开启白名单
whitelist add <玩家>          添加
whitelist remove <玩家>       移除
whitelist list                查看名单
whitelist reload              从 whitelist.json 重新读取
```

Sửa bằng lệnh xong danh sách sẽ được ghi vào `whitelist.json`; nếu bạn **sửa trực tiếp tệp này**, nhớ chạy `whitelist reload` để có hiệu lực.

## Ba, plugin và chẩn đoán

| Lệnh | Tác dụng |
| --- | --- |
| `plugins` (viết tắt `pl`) | Liệt kê plugin. **Xanh = đã nạp**, **đỏ = nạp thất bại** (vào console xem lỗi) |
| `version <plugin>` | Xem phiên bản plugin |
| `help` | Trợ giúp |

Nếu một plugin **đến cả màu đỏ cũng không có**, nghĩa là máy chủ hoàn toàn không nhận nó là plugin —— thường là tệp chưa bỏ vào `plugins/`, phần mở rộng không đúng, hoặc loại lõi không khớp.

### Không muốn người chơi thấy danh sách plugin

Ba lệnh `plugins`, `version`, `help` mặc định mở quyền, mọi người đều chạy được. Muốn tắt, đặt các nút quyền dưới đây thành `false`:

```
bukkit.command.plugins
bukkit.command.version
bukkit.command.help
```

:::warn Tắt lệnh không có nghĩa là giấu được
Một số client gian lận có thể suy ra plugin đã cài qua phản hồi **gợi ý Tab**. Nếu thực sự quan tâm, cần cài thêm plugin loại ẩn (như PluginHide) để xử lý.
:::

## Bốn, lệnh quản lý thường dùng trong game

| Lệnh | Tác dụng |
| --- | --- |
| `gamemode <chế độ> [người chơi]` | Đổi chế độ chơi |
| `tp <người chơi> <mục tiêu>` | Dịch chuyển |
| `give <người chơi> <vật phẩm> [số lượng]` | Trao vật phẩm |
| `time set day` / `weather clear` | Chỉnh thời gian / thời tiết |
| `difficulty <độ khó>` | Đổi độ khó |
| `gamerule <quy tắc> <giá trị>` | Đổi quy tắc trò chơi |
| `say <nội dung>` | Phát thông báo với tư cách máy chủ |
| `whitelist` / `op` v.v. | Như trên (trong game cần OP) |

## Năm, quyền và gợi ý Tab

- Máy chủ bản gốc dùng **cấp OP** để kiểm soát quyền; sau khi cài plugin quyền (như LuckPerms), chuyển sang kiểm soát chi tiết bằng **nút quyền + nhóm quyền**, an toàn hơn cấp OP nhiều.
- **Gợi ý Tab** có thể gợi ý lệnh và tham số, là cách nhanh nhất để chẩn đoán "lệnh này có tồn tại hay không"; phía người chơi cũng có thể dùng nó để phát hiện máy chủ đã cài plugin nào (xem ở trên).

## Bước tiếp theo

Lệnh đã thành thạo, thì đến lúc dùng công cụ và plugin: xem [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr) và [Nhập môn plugin](/tutorials/java/plugins).

---

> Một phần nội dung bài này tham khảo từ [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) và [kho GitHub của dự án](https://github.com/Cubic-Project/NitWikit), đã viết lại theo cấu trúc của trang này; nếu khác với nguồn thì lấy nguồn làm chuẩn.
