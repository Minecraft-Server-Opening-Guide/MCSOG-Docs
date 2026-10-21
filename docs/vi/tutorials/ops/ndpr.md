---
title: "Hệ thống cấm chung NDPReforged"
slug: ndpr
cat: ops
level: 3
order: 26
minutes: 16
tags: [cấm chung, NDPR, chống gian lận, plugin, cấu hình, vận hành]
updated: 2026-10-04
draft: false
---

**NDPReforged (NDPR)** là một **hệ thống cấm chung cho máy chủ Minecraft** đa nền tảng: nhiều máy chủ dùng chung một cơ sở dữ liệu cấm, làm được **cấm thống nhất, đồng bộ thời gian thực**. Nó xây trên RESTful API, tài liệu chính thức ở <https://ndpreforged.com/wiki.php>, trang chủ và bảng quản trị chủ máy chủ ở <https://ndpreforged.com/>.

Bài này tổng hợp theo tài liệu chính thức (phiên bản hiện tại **2.1.0**, tài liệu cập nhật lần cuối 2026-08-16), mọi mục cấu hình và giá trị mặc định đều lấy tài liệu chính thức làm chuẩn.

## Một, Nó giải quyết vấn đề gì

Nỗi đau của cấm cục bộ: bạn cấm một kẻ phá hoại ở máy chủ A, hắn sang máy chủ B vẫn chơi được; mấy chủ máy chủ với nhau chỉ còn cách gửi ảnh chụp và thông báo bằng miệng. NDPR đưa dữ liệu cấm lên cloud, mọi máy chủ kết nối vào **dùng chung một danh sách**.

Các đặc tính cốt lõi chính thức đưa ra:

| Đặc tính | Giải thích |
| --- | --- |
| Xác thực an toàn | Xác thực Token + kiểm soát quyền |
| Hỗ trợ đa nền tảng | MCDR, Bukkit/Paper, Mod (Fabric/Forge/NeoForge), Velocity/BungeeCord, Bedrock Edition |
| Đồng bộ thời gian thực | Dữ liệu cấm của nhiều máy chủ đồng bộ tức thời |
| Xác minh thiết bị HWID | Thu thập dấu vân tay trình duyệt, xác minh máy chống gian lận |
| Duyệt cấm | Gửi đơn cấm, cloud duyệt xong mới đồng bộ |
| Thống kê dữ liệu | Chức năng thống kê chặn đầy đủ |
| Tương thích bản cũ | Tương thích giao thức NDP bản cũ |

Về kiến trúc chia bốn tầng: **bảng quản trị (Web) → tầng dịch vụ API (xác thực Token / quản lý cấm / quản lý người dùng / đẩy dữ liệu / xác minh thiết bị HWID / duyệt) → tầng dữ liệu (MySQL)**.

## Hai, Ma trận hỗ trợ

| Máy chủ | Trạng thái hỗ trợ |
| --- | --- |
| MCDR 2.8+ | Đã hỗ trợ |
| Java: Spigot / Bukkit / Paper / Folia | Đã hỗ trợ |
| Fabric / Forge / NeoForge (Mod) | Đã hỗ trợ |
| Velocity / BungeeCord (phía proxy) | Đã hỗ trợ |
| Bedrock Edition: LeviLamina / BDSX / BDSpyrunner / gomint / Allay / Nukkit | Đã hỗ trợ |

:::tip Phía proxy là đỡ việc nhất
Cài một lần trên **Velocity hoặc BungeeCord**, **mọi máy chủ con phía sau tự động có bảo vệ cấm**, không phải cài client cho từng máy chủ con.
:::

## Ba, Cài đặt

### 1. MCDR (Java Edition)

Yêu cầu: **MCDR 2.8+**, **Python 3.8+**.

```bash
!!MCDR plugin install ndpr
```

Cũng có thể tải tay từ trang phát hành GitHub, bỏ tệp vào thư mục plugin của MCDR.

### 2. Phía plugin (Bukkit / Spigot / Paper / Folia)

Yêu cầu: **MC 1.20.1+**, **Java 17+**.

1. Bỏ `NDPR-Bukkit-2.1.0.jar` vào thư mục `plugins/` của máy chủ
2. Khởi động máy chủ, plugin tự sinh tệp cấu hình

**Một jar dùng chung cho Bukkit / Spigot / Paper / Folia.**

### 3. Mod (Fabric / Forge / NeoForge)

Phiên bản hỗ trợ: **1.20.4 / 1.20.6 / 1.21.1 / 1.21.4 / 1.21.6 / 1.21.9 / 1.21.11 / 26.2**.

Bỏ `NDPR-MOD-2.1.0.jar` vào thư mục `mods/`, khởi động game hoặc máy chủ. **Cùng một jar hỗ trợ đồng thời ba loader.**

### 4. Phía proxy (Velocity / BungeeCord)

Yêu cầu: **Velocity 3.x** hoặc **BungeeCord (MC 1.20.1+)**, **Java 17+**.

Bỏ `ndpr-proxy.jar` vào thư mục `plugins/` của proxy, khởi động lại proxy.

### 5. Bedrock Edition

| Nền tảng | Cách cài |
| --- | --- |
| BDSpyrunner | Bỏ `ndpr.py` vào thư mục `plugins/` |
| BDSX | Gói npm bỏ vào thư mục `plugins/ndpr/` |
| LeviLamina | `plugins/ndpr/` (dll + `manifest.json`) |
| Nukkit / Allay / gomint | Bỏ `ndpr.jar` vào thư mục `plugins/` |

## Bốn, Cấu hình (năm bước)

### Bước 1: Lấy UUID

**Phía MCDR**, hai cách:

Cách một, tìm trong nhật ký khởi động:

```text
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: Loại máy chủ: xx
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: UUID: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
[MCDR] [20:21:34] [TaskExecutor/INFO] [ndpr]: Plugin NDPR đã nạp
```

Cách hai, sau lần khởi động thứ hai đọc từ tệp cấu hình, thư mục `thư-mục-gốc-MCDR\config\ndpr\config.toml`:

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
```

**Mọi nền tảng khác** (phía plugin / Mod / phía proxy / Bedrock Edition) **lần khởi động đầu đều tự lấy UUID và ghi vào tệp cấu hình**, không cần điền tay. Khi cần xác nhận tay thì tìm theo bảng dưới:

| Nền tảng | Vị trí tệp cấu hình | Trường |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `uuid` |
| Mod | `.minecraft/config/ndpr.json` | `uuid` |
| Velocity | `plugins/ndpr/config.toml` | `uuid` |
| BungeeCord | `plugins/NDPReforged-Proxy/config.toml` | `uuid` |
| Bedrock Edition (BDSpyrunner/BDSX/LeviLamina/Nukkit/Allay/gomint) | `plugins/ndpr/config.json` | `uuid` |

### Bước 2: Lấy Token

1. Mở trang chủ <https://ndpreforged.com/>, bấm **Quản lý chủ máy chủ** ở phía trên hoặc góc trên bên trái
2. Đăng nhập hoặc đăng ký tài khoản (kéo slider chậm một chút dễ qua hơn)
3. Bấm **Quản lý Token** bên trái
4. Ở chỗ "Tạo Token mới" điền UUID của bước trên, tạo Token
5. Tùy chọn: bấm **Quyền tải lên** bên trái, xin quyền tải lên cạnh Token và đợi duyệt

### Bước 3: Cấu hình Token

**Phía MCDR** (`thư-mục-gốc-MCDR\config\ndpr\config.toml`):

```toml
token = "xxxxxxxxxxxxxxxxxxxx"
```

Vị trí trường ở các nền tảng khác:

| Nền tảng | Tệp cấu hình | Trường |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `token` |
| Mod | `.minecraft/config/ndpr.json` | `token` |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `token` |
| Bedrock Edition | `plugins/ndpr/config.json` | `token` |

:::warn Không điền Token tức là chưa cài
**Token dùng để bật chức năng cấm, không cấu hình thì plugin sẽ không thực hiện kiểm tra cấm.** Chỉ cài plugin mà không điền Token thì bảo vệ là rỗng.
:::

### Bước 4: Cấu hình loại máy chủ

**Phía MCDR**:

```toml
onlinemode = true   # true = máy chủ bản quyền, false = máy chủ offline
```

| Nền tảng | Tệp cấu hình | Trường |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `onlinemode` (bắt buộc) |
| Mod | `.minecraft/config/ndpr.json` | `onlinemode` (bắt buộc) |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `onlinemode` (để trống thì dùng chế độ của chính proxy) |
| Bedrock Edition | `plugins/ndpr/config.json` | `onlinemode` (Bedrock thống nhất đăng nhập Xbox, truyền thẳng) |

:::warn Java Edition bắt buộc phải điền onlinemode
**`onlinemode` của các nền tảng Java Edition là mục bắt buộc, nếu không plugin sẽ không nạp bình thường.**
:::

### Bước 5: Các mục cấu hình khác

| Mục cấu hình | Giải thích | Giá trị mặc định |
| --- | --- | --- |
| `api_url` | Địa chỉ API | `https://api.ndpreforged.com` |
| `language` | Ngôn ngữ (`zh_CN` / `en_us`) | `zh_CN` |
| `download_interval` | Khoảng cách tự cập nhật kho cấm (giây), `0` = tắt | `900` |
| `check_hwid` | Bật xác minh thiết bị HWID | `false` |
| `check_interval` | Số ngày miễn kiểm tra sau khi xác minh qua | `3` |
| `fail_closed` | Khi thiếu kho cấm thì từ chối vào máy chủ (ưu tiên an toàn) | `false` |
| `verify_timeout` | Thời gian chờ xác minh HWID (giây, 30~600) | `60` |
| `freeze_interval` | Khoảng cách ghim lại tọa độ trong lúc xác minh (giây, 1~60) | `1` |

**Ví dụ đầy đủ phía MCDR** (`thư-mục-gốc-MCDR\config\ndpr\config.toml`):

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
token = "xxxxxxxxxxxxxxxxxxxx"
onlinemode = true
api_url = "https://api.ndpreforged.com"
language = "zh_CN"
download_interval = 900
check_hwid = false
check_interval = 3
fail_closed = false
verify_timeout = 60
freeze_interval = 1
```

## Năm, Lệnh

### Phía MCDR

Lệnh chính `!!NDPR` hoặc `!!ndpr`.

| Lệnh | Mô tả |
| --- | --- |
| `ban <ID> <lý do>` | Cấm người chơi |
| `check <ID>` | Kiểm tra trạng thái cấm của người chơi |
| `download` / `d` | Cập nhật dữ liệu cấm |
| `checkupdate` / `cu` | Kiểm tra cập nhật |
| `help` | Hiện thông tin trợ giúp |
| `reload` | Nạp lại tệp cấu hình |
| `auth <người chơi>` | Cưỡng chế kích hoạt xác minh thiết bị của người chơi |

### Các nền tảng khác (phía plugin / Mod / phía proxy / Bedrock Edition)

Tiền tố lệnh thống nhất là `/ndpr` (phía proxy và Bedrock Edition không có lệnh tiền tố `!!`).

| Lệnh | Mô tả | Quyền |
| --- | --- | --- |
| `/ndpr`, `/ndpr help` | Thông tin trợ giúp | Mọi người |
| `/ndpr d`, `/ndpr download` | Tải tay cơ sở dữ liệu cấm | `ndpr.admin` |
| `/ndpr ban <người chơi> <lý do>` | Gửi duyệt cấm | `ndpr.admin` |
| `/ndpr check <ID/IP/UUID>` | Kiểm tra trạng thái cấm (không khớp thì đưa gợi ý mờ) | Mọi người |
| `/ndpr reload` | Nạp lại cấu hình và tải lại kho cấm | `ndpr.admin` |
| `/ndpr cu`, `/ndpr checkupdate` | Kiểm tra cập nhật plugin | `ndpr.admin` |
| `/ndpr auth <người chơi>` | Cưỡng chế kích hoạt xác minh thiết bị của người chơi | `ndpr.admin` |

`ndpr.admin` mặc định cấp cho **OP** (với MCDR là cấp quyền 2).

## Sáu, Mấy điểm bạn phải tự cân nhắc

1. **`fail_closed`: an toàn vs khả dụng**. Mặc định `false` —— khi không tải được kho cấm từ cloud thì **cho qua**, máy chủ vẫn dùng bình thường; đổi thành `true` thì **từ chối vào máy chủ**, ưu tiên an toàn, nhưng cloud gặp sự cố thì người chơi bị chặn ngoài cửa. Máy chủ công khai và máy chủ bạn bè có thể chọn ngược nhau.
2. **`check_hwid`: chống gian lận vs quyền riêng tư**. Bật lên sẽ dùng **thu thập dấu vân tay trình duyệt** để xác minh máy (đi kèm `verify_timeout` thời gian chờ xác minh, `freeze_interval` khoảng cách ghim lại tọa độ trong lúc xác minh, `check_interval` số ngày miễn kiểm tra). Đây là **biện pháp nhận diện mạnh hơn IP**, nhưng cũng liên quan đến thu thập thông tin thiết bị người chơi —— tài liệu chính thức đã nói rõ mục đích, **bạn nên nói rõ với người chơi trong nội quy máy chủ** rồi mới bật.
3. **`download_interval`**: mặc định 900 giây (15 phút) đồng bộ một lần. Đặt quá nhỏ sẽ tăng tần suất yêu cầu, đặt quá lớn thì cấm có hiệu lực chậm; `0` nghĩa là tắt tự cập nhật (khi đó chỉ còn cách dùng `/ndpr d` tải tay).
4. **Ưu tiên phía proxy**: nếu kiến trúc là Velocity/BungeeCord, cài một lần ở phía proxy là phủ toàn bộ máy chủ con, khó sót hơn cài từng máy chủ con.

## Bảy, Tra nhanh khi tìm lỗi

| Hiện tượng | Tra gì trước |
| --- | --- |
| Plugin đã nạp nhưng không chặn gì | **Đã điền Token chưa** (không điền = không kiểm tra) |
| Plugin không nạp / không có hiệu lực | Bản Java Edition **đã điền `onlinemode` chưa** (bắt buộc) |
| Không tải được kho cấm | `api_url` có đúng không (mặc định `https://api.ndpreforged.com`), `download_interval` có phải `0` không, và máy chủ có truy cập được internet không |
| Người chơi bị cấm vẫn vào được | Có cài ở **phía proxy** không, máy chủ con có vòng qua proxy kết nối trực tiếp không, kho cấm đã đồng bộ chưa |
| Muốn làm mới danh sách bằng tay | `/ndpr d` (MCDR dùng `!!ndpr d`) |
| Muốn sửa cấu hình xong có hiệu lực ngay | `/ndpr reload` (sẽ nạp lại cấu hình và tải lại kho cấm) |

## Bước tiếp theo

- Máy chủ bị tấn công, bị ép tải thì làm sao: xem [Các loại tấn công mạng thường gặp và phòng thủ chuyên cho Minecraft](/tutorials/ops/attack-defense)
- Ghi chép và quay lui, quyền và plugin đăng nhập: xem [[JAVA] Plugin bảo mật](/tutorials/ops/security-java)
- Quản lý người chơi và vận hành: xem [[JAVA] Quản lý vận hành](/tutorials/ops/management-java)

---

> Nội dung và giá trị mặc định của các mục cấu hình trong bài lấy từ tài liệu chính thức của NDPReforged (<https://ndpreforged.com/wiki.php>, phiên bản 2.1.0); sau khi chính thức cập nhật xin lấy tài liệu chính thức làm chuẩn.
