---
title: Chuẩn bị môi trường (Windows và Linux)
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, môi trường, phiên bản java, cổng, quyền]
updated: 2026-10-04
draft: false
---

Bài này viết Windows và Linux chung với nhau. Hai bên cần làm **cùng bốn việc**: **xác nhận phiên bản Java → mở cổng → tạo thư mục → cài đúng Java và cấu hình môi trường**.

Khác biệt chỉ ở cách viết lệnh, nên mỗi mục nhỏ đều đưa hai bộ cách làm, **cứ theo hệ thống của bạn xem nửa đó là được**.

## Bước một: xác nhận phiên bản cần mở trước, rồi quyết định Java

**Bước này làm sai là phía sau làm trắng hết.** Phiên bản Java không khớp thì máy chủ khởi động là sập, trong nhật ký sẽ có `UnsupportedClassVersionError`.

| Minecraft Java Edition | Java chính thức yêu cầu | Giải thích |
| --- | --- | --- |
| 26.1 trở về sau | **Java 25** | Yêu cầu mới nhất (từ 26.1) |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 là bản chính thức đầu tiên yêu cầu 21 |
| 1.18 – 1.20.4 | **Java 17** | Tổ hợp được dùng phổ biến nhất hiện nay |
| 1.17 – 1.17.1 | **Java 16** | Java 17 cũng khởi động bình thường |
| 1.12 – 1.16.5 | **Java 8** | Rất nhiều modpack cũ vẫn dừng ở mức này |
| 1.7.10 trở về trước | Yêu cầu chính thức thấp hơn | Thực tế phổ biến dùng Java 8 |

:::note Nguồn của bảng trên
Các mốc 1.20.5 / 1.18 / 1.17 / 1.12… lấy từ danh sách phiên bản chính thức của Mojang (trường `javaVersion.majorVersion` của từng phiên bản trên `piston-meta.mojang.com`); yêu cầu Java 25 từ 26.1 lấy từ danh sách yêu cầu phiên bản của Minecraft Wiki. Không phải phỏng đoán theo kinh nghiệm.
:::

- **Yêu cầu của Paper, Purpur, Spigot, Fabric, Forge giống chính thức**: từ 1.20.5 trở lên cần Java 21, 1.18–1.20.4 cần Java 17.
- Bảng trên là **yêu cầu tối thiểu**. Khi phiên bản Java quá cao, một số plugin và mod có thể không tương thích, **khuyến nghị căn khớp chặt với yêu cầu**.
- **Bedrock Edition (BDS) không cần Java**, nó là chương trình C++, chạy thẳng `bedrock_server` (trên Windows là `bedrock_server.exe`) là được.

## Bước hai: mở cổng

| Cổng | Giao thức | Công dụng |
| --- | --- | --- |
| 25565 | TCP | Kết nối game Java Edition (**bắt buộc**) |
| 25565 | UDP | Truy vấn danh sách máy chủ (Query, tùy chọn) |
| 25575 | TCP | Console từ xa RCON (tùy chọn, **đừng để lộ ra internet**) |
| 19132 | UDP | Cổng mặc định của Bedrock Edition (IPv6 là 19133, chỉ cần khi dùng phương án đa nền tảng) |

:::note Nguồn cổng
Java Edition mặc định **TCP 25565**; Bedrock Edition **BDS dùng UDP**, IPv4 mặc định **19132**, IPv6 mặc định **19133** (sửa được trong `server.properties`).
:::

### Nhóm bảo mật của máy chủ cloud (bắt buộc với máy chủ cloud)

Vào "Nhóm bảo mật / Tường lửa" trong console cloud thêm quy tắc vào `TCP 25565`, nguồn `0.0.0.0/0`. **Tường lửa máy local cấu hình đúng đến đâu, nhóm bảo mật không mở thì người khác vẫn không kết nối được.**

### Tường lửa hệ thống

**Windows (giao diện đồ họa)**: `Control Panel → Windows Defender Firewall → Advanced settings → Inbound Rules → New Rule` → chọn "Port" → "TCP" → cổng local điền `25565` → "Allow the connection" → tích cả ba profile → đặt tên và lưu.

**Windows (dòng lệnh, PowerShell quản trị)**:

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux (ufw, Ubuntu / Debian)**:

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux (firewalld, họ CentOS)**:

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn Khi triển khai bằng Docker, tường lửa hệ thống không quản được container
Nếu bạn định dùng **Docker / Docker Compose** triển khai máy chủ (xem [Triển khai Java Edition bằng Docker](/tutorials/java/docker)), thì **`ufw` và `firewalld` đều không có tác dụng với các cổng trong mục này**.

Nguyên nhân: Docker khi khởi động tự ghi quy tắc chuyển tiếp và NAT vào `iptables`, và chèn những quy tắc này **trước** quy tắc tường lửa hệ thống. Nên dù bạn chạy `sudo ufw deny 25565`, bên ngoài **vẫn kết nối được vào cổng mà container ánh xạ ra**. Đây không phải cấu hình viết sai, mà là hành vi đã định của Docker.

Bốn cách làm khả thi, **xếp theo mức độ khuyến nghị**:

1. **Chỉ bind cổng vào loopback máy local** (an toàn nhất, đơn giản nhất): `-p 127.0.0.1:25565:25565`, cổng container vì thế **hoàn toàn không lộ ra internet**; cần mở ra ngoài thì để reverse proxy của máy host (Nginx `stream`, frp, dịch vụ tăng tốc…) chuyển tiếp.
2. **Dùng script [ufw-docker](https://github.com/chaifeng/ufw-docker) để UFW quản lại được container** (**chọn cái này nếu muốn UFW tiếp tục làm cửa vào thống nhất**): một lệnh cài xong, sau đó có thể dùng `ufw route allow proto tcp from any to any port 25565` mở cổng container, `ufw route delete allow …` thu hồi, **không phải tắt iptables của Docker, cũng không phải tự viết quy tắc iptables**. Chi tiết xem [Triển khai Java Edition bằng Docker → 5.2 Bốn cách làm đúng](/tutorials/java/docker#52-正确的四种做法).
3. **Tự viết quy tắc bằng chain `DOCKER-USER`**: đây là chain Docker dành riêng cho người dùng, Docker không tự ghi đè nó, phù hợp cảnh chỉ cần giới hạn nguồn một chút.
4. Viết `"iptables": false` trong `/etc/docker/daemon.json` rồi tự bảo trì quy tắc chuyển tiếp —— **sẽ mất luôn khả năng ánh xạ cổng (trừ khi bạn tự cấu hình NAT), không khuyến nghị người mới dùng**.

Giải thích đầy đủ xem [Triển khai Java Edition bằng Docker → Mạng và tường lửa](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节).
:::

### Kiểm chứng

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

Khả năng truy cập từ ngoài phải kiểm tra từ **một máy khác**: `telnet IP-công-cộng-của-bạn 25565`, hoặc dùng công cụ kiểm tra cổng trực tuyến. **Khi máy chủ chưa chạy thì cổng không lắng nghe**, nên phải cho máy chủ chạy trước rồi mới đo.

## Bước ba: tạo thư mục

:::warn Đường dẫn đừng có tiếng Trung và dấu cách
Những đường dẫn như `C:\我的服务器\1.20 服务端\` hay `/home/我的服务器/` sẽ làm một số script khởi động, phân tích cấu hình plugin bị lỗi, thông tin lỗi thường còn rất khó hiểu. **Nhất loạt dùng đường dẫn ngắn, thuần tiếng Anh, không dấu cách.**
:::

Hai bên dùng **cùng một kết cấu**, sau này chuyển từ Windows sang Linux chỉ cần chép nguyên cả khối:

```
mcserver/
├── survival/          # toàn bộ tệp của một máy chủ
│   ├── server.jar     # lõi máy chủ
│   ├── eula.txt       # phải đồng ý mới khởi động
│   ├── server.properties
│   ├── world/         # dữ liệu thế giới (nhất định phải sao lưu riêng)
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # thư mục sao lưu, tách khỏi thư mục chạy thì an toàn hơn
```

**Windows**:

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux** (dùng người dùng riêng, đừng chạy máy chủ bằng root):

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**Sau khi bỏ lõi máy chủ vào `survival`, lần khởi động đầu sẽ sinh ra `eula.txt`**, đổi `eula=false` thành `eula=true` là biểu thị đồng ý [Minecraft EULA](https://aka.ms/MinecraftEULA). **Không đổi thì khởi động xong thoát ngay.**

## Bước bốn: cài Java và cấu hình môi trường

Khuyến nghị **Eclipse Temurin (Adoptium)**: miễn phí, mã nguồn mở, bảo trì lâu dài, là bản phân phối OpenJDK được cộng đồng máy chủ dùng rộng nhất.

### Windows: cài đặt

Vào trang chủ Adoptium tải **gói cài `.msi` của JDK** (bản `.jar` là runtime, `.msi` mới là JDK có wizard). Java 21 tương ứng `temurin-21-jdk`, Java 17 đổi thành `temurin-17-jdk`, Java 8 đổi thành `temurin-8-jdk`.

Trong wizard cài có một mục **`Set JAVA_HOME variable`**, đặt thành **Will be installed on local hard drive**, tích vào là biến môi trường tự được cấu hình.

Cài xong **mở một** PowerShell mới để kiểm chứng:

```powershell
java -version        # sẽ in ra openjdk version "21.x.x" ...
```

### Linux: cài đặt

```bash
# Ubuntu / Debian: Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# khi cần Java 17
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# họ CentOS
sudo dnf install -y java-21-openjdk-headless
```

Khi nhiều phiên bản cùng tồn tại, đổi phiên bản mặc định:

```bash
sudo update-alternatives --config java
java -version
```

:::tip Bản headless là đủ
`-headless` không gồm thành phần đồ họa, chiếm bộ nhớ ít hơn; máy chủ không dùng GUI, **ưu tiên cài headless**.
:::

### Cấu hình tay biến môi trường (Windows không tích tùy chọn cài, hoặc dùng bản ZIP không cần cài)

**Giao diện đồ họa**: `This PC → chuột phải Properties → Advanced system settings → Environment Variables`, trong **System variables**:

1. Tạo mới `JAVA_HOME`, giá trị điền thư mục cài JDK, ví dụ `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot` (**đừng** kèm `\bin`)
2. Sửa `Path`, thêm một mục `%JAVA_HOME%\bin`
3. Xác nhận lưu, rồi **mở cửa sổ mới** PowerShell kiểm chứng

**Dòng lệnh** (cần quyền quản trị; `setx` chỉ ảnh hưởng cửa sổ mới):

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn Về rủi ro setx ghi đè Path
`setx Path` sẽ ghi vào Path **đang** được phân tích hiện tại. Nếu Path gốc quá dài hoặc chứa tham chiếu biến, ghép thẳng có thể bị cắt. **Sửa bằng giao diện đồ họa an toàn hơn.**
:::

**Linux** thì JDK cài bằng trình quản lý gói thường đã có trong `PATH`; nếu dùng bản tar.gz không cần cài, thì đặt trong `~/.bashrc` hoặc `/etc/profile.d/`:

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**Kiểm chứng**:

```powershell
echo $env:JAVA_HOME      # cmd: echo %JAVA_HOME%
java -version
where.exe java           # sẽ trỏ tới %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### Nhiều phiên bản cùng tồn tại

**Windows** không có `update-alternatives`, cách chắc nhất là: cài nhiều JDK, không đổi mặc định hệ thống, mà viết cứng đường dẫn tuyệt đối của `java.exe` trong script khởi động của từng máy chủ.

`C:\mcserver\survival\start.bat`:

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **Đường dẫn nhất định phải bọc trong nháy kép** —— `Program Files` có dấu cách, không thêm nháy là chắc chắn thất bại
- `cd /d "%~dp0"` giữ thư mục làm việc cố định là thư mục chứa script
- `pause` để cửa sổ **không đóng ngay** khi có lỗi, nếu không sẽ không thấy lỗi

**Linux** dùng `update-alternatives` để đổi, hoặc viết cứng đường dẫn trong `start.sh`:

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## Bước năm (khuyến nghị với Linux): quản lý bằng systemd

Chạy tay `./start.sh` thì đóng SSH là đứt, cũng không tự khởi động lại khi sập. Mở máy chủ lâu dài nên giao cho dịch vụ quản lý:

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/bin/screen -DmS mcserver /usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
ExecStop=/usr/bin/screen -S mcserver -X stuff "stop\n"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note Cần screen
Cách viết trên nhờ `screen` giữ console, tiện vào gõ lệnh: `sudo apt install -y screen`, sau đó dùng `screen -r mcserver` quay lại console.
:::

## Tìm lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `java: command not found` / `'java' 不是内部或外部命令` | Chưa cài, hoặc `PATH` chưa cấu hình đúng, hoặc cửa sổ chưa mở lại | Kiểm tra `PATH`, **mở cửa sổ mới** rồi thử lại |
| `UnsupportedClassVersionError ... class file version 65.0` | Phiên bản Java quá thấp (65 = Java 21) | Theo bảng trên đổi sang phiên bản Java tương ứng |
| Nháy đúp script khởi động, cửa sổ lóe lên rồi mất | Báo lỗi xong cửa sổ tự đóng | Thêm `pause` ở cuối script, hoặc chạy trong terminal để xem đầu ra |
| Khởi động xong thoát ngay, nhật ký nhắc EULA | Chưa đồng ý EULA | Đổi `eula.txt` thành `eula=true` |
| `Address already in use` | 25565 bị chiếm | Windows: `netstat -ano \| findstr :25565`; Linux: `ss -tlnp \| grep 25565`, tra PID rồi kết thúc |
| `Could not reserve enough space for object heap` | `-Xmx` vượt bộ nhớ khả dụng | Giảm `-Xmx` (ví dụ `-Xmx2G`) |
| Mình telnet được, người khác không kết nối được | Chỉ cấu hình tường lửa máy local, nhóm bảo mật cloud chưa mở | Vào console cloud bổ sung quy tắc vào |
| Plugin/mod báo lỗi đường dẫn kỳ lạ | Thư mục có tiếng Trung hoặc dấu cách | Dời sang đường dẫn thuần tiếng Anh như `C:\mcserver` hoặc `/opt/mcserver` |
| Trên Linux `Permission denied` | Máy chủ do root tạo, người dùng thường không có quyền ghi | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Máy Windows ngủ xong bị mất kết nối | Hệ thống ngủ đã ngắt dịch vụ | Đặt tùy chọn nguồn thành "Không bao giờ ngủ", hoặc đổi sang máy trực tuyến lâu dài |

## Bước tiếp theo

Môi trường sẵn sàng là cài được lõi máy chủ:

- **Chọn lõi máy chủ**: xem [Chọn lõi máy chủ](/tutorials/java/core) —— chọn lõi theo phần cứng và lối chơi (nhiều nhân xung thấp chọn Folia, đơn nhân mạnh chọn họ Paper, kỹ thuật redstone chọn Fabric hoặc Leaves)
- **Đối chiếu từng mục**: xem [So sánh lõi máy chủ](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) —— nhìn qua hiệu năng, plugin, mod, tình huống áp dụng

**Trước khi mở máy xác nhận thêm hai việc**: phiên bản Java khớp phiên bản MC mục tiêu, 25565 đã được mở trên cả nhóm bảo mật và tường lửa hệ thống.

Môi trường và lõi đều chốt xong, viết script khởi động chạy máy chủ lên: xem [Khởi động máy chủ](/tutorials/java/start).
