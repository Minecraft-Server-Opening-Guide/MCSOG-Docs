---
title: Khởi động máy chủ
slug: start
cat: java
level: 1
order: 5
minutes: 14
mc: ["26.1+", "1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, script khởi động, bat, sh, eula, tự động khởi động lại, ký tự đại diện]
updated: 2026-10-04
draft: false
---

Điều kiện tiên quyết đã sẵn sàng: **đã cài Java, đã mở cổng, đã tạo thư mục, đã chọn và tải lõi**. Bài này đưa máy chủ thực sự chạy.

:::note Forge và NeoForge phiên bản mới có thể bỏ qua bài này
**Forge** và **NeoForge** phiên bản mới sau khi cài bằng **trình cài đặt** chính thức sẽ **tự sinh script khởi động** trong thư mục máy chủ (`run.bat` / `run.sh`). Nếu dùng chúng thì chạy thẳng script đó, không cần tự viết script khởi động.
:::

## Một, viết script khởi động

Đặt lõi máy chủ đã tải (`.jar`) vào thư mục triển khai, ví dụ:

```
C:\mcserver\survival\        （Linux 下对应 /opt/mcserver/survival/）
├── paper-1.21.4.jar         ← 你下载的核心
└── （其余文件首次启动后自动生成）
```

### Windows: `start.bat`

1. Trong thư mục này tạo một **tài liệu văn bản**, đổi tên tệp thành `start.bat` (đổi phần mở rộng từ `.txt` sang `.bat`).
2. Bấm chuột phải → mở bằng trình soạn thảo văn bản, ghi nội dung dưới đây rồi lưu:

```bat
@echo off
cd /d "%~dp0"
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

Đổi `核心名.jar` thành tên tệp thực tế của bạn (ví dụ `paper-1.21.4.jar`).

- `cd /d "%~dp0"` cố định thư mục làm việc là thư mục chứa script, tránh việc bấm đúp không tìm thấy tệp lõi.
- `--nogui` nghĩa là không mở cửa sổ đồ họa sẵn có của máy chủ, toàn bộ đầu ra đi qua dòng lệnh (`nogui` là bí danh cũ của nó, hai cái tương đương).
- `pause` để cửa sổ **không đóng ngay** sau khi máy chủ thoát, tiện xem lỗi, xem chi tiết ở mục "Mở rộng" bên dưới.

### Linux: `start.sh`

```bash
#!/bin/sh
cd "$(dirname "$0")"
exec java -Xms2G -Xmx2G -jar 核心名.jar --nogui
```

Cấp quyền thực thi rồi chạy:

```bash
chmod +x start.sh
./start.sh
```

## Hai, lần khởi động đầu tiên: chờ nó tải, rồi đồng ý EULA

**Lần khởi động đầu tiên sẽ tải các tệp cần thiết trước**, dòng lệnh sẽ hiện đầu ra tương tự `Downloading mojang_x.x.x.jar` —— đây là bình thường, **cứ kiên nhẫn chờ nó tải xong** (nếu mạng trong nước bị kẹt mãi, cần tự chuẩn bị phương án tăng tốc mạng).

Tải xong, máy chủ **sẽ không khởi động ngay**, mà báo:

```
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

Lúc này dùng trình soạn thảo văn bản mở **tệp `eula.txt` được tự sinh** trong thư mục, đổi:

```
eula=false
```

thành:

```
eula=true
```

Lưu xong **chạy lại script khởi động**. Thao tác này nghĩa là bạn đã đọc và đồng ý [Minecraft EULA](https://aka.ms/MinecraftEULA).

:::warn Không đổi thì không khởi động được
Khi `eula=false`, máy chủ **thoát ngay sau khi khởi động**, đây là chỗ vướng phổ biến nhất của người mới.
:::

## Ba, thế nào là khởi động thành công

Khi dòng lệnh hiện dòng dưới đây, nghĩa là máy chủ **đã mở thành công**:

```
Done (6.554s)! For help, type "help"
```

Số giây trong ngoặc khác nhau tùy máy. Lúc này:

- Trên **máy này** có thể vào bằng `localhost:25565`;
- Người khác dùng **IP công cộng của bạn** (hoặc tên miền) cộng cổng mặc định `25565` để vào;
- Trong console gõ `stop` có thể **tắt an toàn** máy chủ (**đừng đóng thẳng cửa sổ**, dễ hỏng bản lưu).

## Bốn, mở rộng: ba mẹo thực dụng

### 1. Thêm `pause`, để thấy nhật ký khi sập

Khi bấm đúp chạy `.bat` trên Windows, nếu máy chủ sập, cửa sổ sẽ **lóe lên rồi tắt**, bạn không thấy gì. Thêm `pause` ở **dòng cuối** của script là được:

```bat
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

Như vậy sau khi máy chủ thoát cửa sổ sẽ dừng lại, thấy rõ thông tin lỗi (cách tương đương trên Linux là thêm `read -n 1 -p "按任意键继续..."` vào cuối script).

### 2. Dùng ký tự đại diện, đổi phiên bản lõi không cần sửa script

Mỗi lần cập nhật lõi lại phải sửa tên tệp trong script rất phiền. Có thể dùng **ký tự đại diện** để khớp:

```bash
java -jar *.jar
java -jar paper-*.jar
java -jar leaf-*.jar
```

:::warn Ký tự đại diện không có tác dụng trong .bat của Windows
Đây là khác biệt **đã kiểm chứng thực tế**: **shell của Linux / macOS sẽ mở rộng ký tự đại diện**, nhưng **cmd của Windows thì không** —— nó truyền nguyên `*.jar` bạn viết cho Java, Java không tìm thấy tệp này sẽ báo lỗi.

Trên Windows muốn đạt hiệu quả tương tự phải dùng vòng `for`:

```bat
@echo off
cd /d "%~dp0"
for %%f in (paper-*.jar) do (
  java -Xms2G -Xmx2G -jar "%%f" --nogui
  goto :done
)
:done
pause
```

Đổi `paper-*.jar` thành tiền tố lõi của bạn (như `leaf-*.jar`) là được, cập nhật phiên bản không cần sửa script.
:::

### 3. Tự động khởi động lại sau khi sập

**Windows** (`start.bat`):

```bat
@echo off
cd /d "%~dp0"
:start
java -Xmx4G -Xms1G -jar server.jar nogui
echo 服务器崩溃，3 秒后重启...
timeout /t 3
goto start
```

**Linux** (`start.sh`):

```bash
#!/bin/bash
cd "$(dirname "$0")"
while true; do
    java -Xmx4G -Xms1G -jar server.jar nogui
    echo "服务器已关闭，3 秒后重启..."
    sleep 3
done
```

:::warn Nghĩ rõ trước khi bật tự động khởi động lại
Tự động khởi động lại phù hợp với **máy chủ dài hạn không người trực**. Nhưng nếu máy chủ khởi động thất bại vì **cấu hình sai** (ví dụ sai phiên bản Java, cổng bị chiếm), nó sẽ **khởi động lại mỗi 3 giây và làm ngập màn hình**, ngược lại che mất lỗi thật. **Lần gỡ lỗi đầu tiên đừng dùng tự động khởi động lại**, chạy tay thông đã rồi tính.
:::

:::tip Linux mở máy chủ lâu dài nên dùng systemd
Vòng `while` ở trên sẽ bị kill khi SSH ngắt. Muốn máy chủ **tự khởi động cùng máy, tự khởi động lại khi sập, thoát SSH vẫn không dừng**, dùng systemd trông coi phù hợp hơn —— xem bước năm trong "Chuẩn bị môi trường (Windows và Linux)".
:::

## Năm, bước tiếp theo

Sau khi máy chủ chạy được, nên tiếp tục theo thứ tự này:

- **Hiểu thư mục trước**: xem [Cấu trúc máy chủ](/tutorials/java/structure) —— tệp nào động được, tệp nào sao lưu được
- **Rồi sửa cấu hình**: xem [Cấu hình máy chủ](/tutorials/java/config) —— xác thực bản quyền, độ khó, khoảng cách hiển thị đều ở đây
- **Để người khác cũng kết nối được**: xem [Triển khai tới môi trường truy cập được](/tutorials/java/deploy)
- **Đổi lõi / đối chiếu**: xem [Chọn lõi máy chủ](/tutorials/java/core) và [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)
