---
title: Sử dụng và bảo mật công cụ quản lý bảng điều khiển
slug: panels
cat: ops
level: 3
order: 14
minutes: 18
tags: [panel, mcsmanager, pterodactyl, security, reverse-proxy, hardening, ops]
updated: 2026-10-04
draft: false
---

Mấy bài trước đều nói về "bạn đăng nhập máy, tự gõ lệnh". Bài này nói về một cách vận hành phổ biến khác: **giao máy chủ cho một bảng điều khiển Web quản lý** —— mở trình duyệt là có thể bật tắt instance, xem console, truyền tệp, sửa cấu hình.

Bảng điều khiển đúng là tiện, nhưng nó là **dịch vụ có quyền cao nhất và cũng dễ thành mục tiêu nhất trên máy này**. Nên trọng tâm của bài không phải "bảng điều khiển làm được gì", mà là **dùng bảng điều khiển xong thì bề mặt tấn công tăng thêm những gì, và thu hẹp nó lại thế nào**.

:::note Định vị của bài này
Bài này chỉ nói **cách dùng và ranh giới an toàn**, không thay thế tài liệu cài đặt chính thức của từng bảng điều khiển. Lệnh cài đặt, cổng mặc định, cấu trúc thư mục **nhất loạt lấy tài liệu chính thức làm chuẩn**; bài này chỉ đưa các giá trị mặc định đã đối chiếu với nguồn chính thức, và ghi rõ xuất xứ.
:::

## 1. Bảng điều khiển làm được gì, cái giá là gì

### 1.1 Những năng lực bảng điều khiển thường cung cấp

| Năng lực | Biểu hiện cụ thể | Khi nào thực sự nhàn |
| --- | --- | --- |
| **Giao diện quản lý Web** | Bật tắt, khởi động lại, xem trạng thái ngay trong trình duyệt, không phải nhớ một đống lệnh | Khởi động lại khẩn cấp được cả trên điện thoại |
| **Quản lý nhiều instance** | Một máy chạy đồng thời nhiều máy chủ, chuyển đổi thống nhất | Máy chủ sinh tồn, sáng tạo, thử nghiệm cùng tồn tại |
| **Truy cập console** | Xem nhật ký thời gian thực trong trang, gửi lệnh trực tiếp | Truy nguyên nguyên nhân sập máy chủ từ xa |
| **Trình quản lý tệp** | Tải lên, tải xuống, sửa jar, cấu hình và tệp thế giới | Đổi modpack, thêm plugin cho người chơi |
| **Tác vụ định giờ** | Khởi động lại định giờ, sao lưu định giờ, chạy lệnh định giờ | Mỗi đêm khởi động lại để giải phóng bộ nhớ |
| **Quyền người dùng và người dùng con** | Phân quyền thao tác trên một phần instance cho quản trị viên, quản trị phụ | Cho quản trị phụ khởi động lại máy chủ, nhưng không cho SSH |
| **Thống kê tài nguyên** | Đường cong CPU, bộ nhớ, đĩa, số người trực tuyến | Phán đoán là do cấu hình hay do máy không đủ |
| **Tích hợp Docker** | Dùng container cách ly instance, giới hạn tài nguyên | Nhiều instance không ảnh hưởng nhau |

:::note Tập tính năng khác nhau theo bảng điều khiển
Bảng trên là năng lực thường gặp của "loại công cụ bảng điều khiển", **một bảng điều khiển cụ thể có cung cấp hay không, lối vào ở đâu, hãy lấy tài liệu chính thức của bảng điều khiển đó và giao diện thực tế của bạn làm chuẩn**.
:::

### 1.2 Danh sách cái giá

| Cái giá | Mô tả |
| --- | --- |
| **Thêm một dịch vụ phải bảo trì** | Bản thân bảng điều khiển là ứng dụng Web, phải cập nhật, phải xem thông báo an ninh, phải sao lưu dữ liệu của chính nó |
| **Bề mặt tấn công lớn hơn** | Thêm một cổng lắng nghe, thêm một hệ tài khoản, thêm một API |
| **Quyền tập trung cao** | Bảng điều khiển (nhất là tiến trình daemon) có thể khởi động tiến trình bất kỳ, đọc ghi thư mục instance, có được nó tức là có được mọi máy chủ trên máy này |
| **Reverse proxy phức tạp hơn** | Bảng điều khiển thường cần WebSocket; một số bảng điều khiển còn yêu cầu trình duyệt kết nối trực tiếp tới daemon (xem 3.1) |
| **Bề mặt sự cố lớn hơn** | Bảng điều khiển hỏng không có nghĩa máy chủ hỏng, nhưng bạn có thể tạm thời mất công cụ quản lý |

:::warn Hiểu rủi ro trong một câu
**Bảng điều khiển không phải "một phần mềm khác", mà là "công tắc tổng của mọi máy chủ trò chơi trên máy này".** Trang đăng nhập của nó mở ra Internet tức là treo quyền quản lý cả máy lên Internet.
:::

### 1.3 Trước hết vẽ rõ ranh giới tin cậy

Trước khi dùng bảng điều khiển, hãy vẽ rõ đường ranh này trong đầu:

- **Thứ bảng điều khiển điều khiển được = thứ danh tính chạy nó điều khiển được.**
- Bảng điều khiển chạy bằng root, thì bất kỳ lỗ hổng thực thi mã từ xa nào của nó cũng tương đương cả máy bị chiếm.
- **API của daemon bản thân nó chính là giao diện "thực thi lệnh"** —— đó là lý do nó tồn tại. Nên một khi nó lộ ra, tương đương treo một shell lên Internet.

## 2. MCSManager (MCSM)

### 2.1 Định vị chính thức

Kho chính thức của MCSManager mô tả về mình là: **"bảng điều khiển quản lý máy chủ game Minecraft và Steam hiện đại, cài đặt nhanh, kiến trúc phân tán, nhiều người dùng"** (bản tiếng Anh là "Quick deployment, distributed, multi-user, modern management panel for Minecraft and Steam game servers"). Tài liệu chính thức nói thêm: nó là **mã nguồn mở, phân tán, triển khai một lệnh**, bảng điều khiển hỗ trợ máy chủ game Minecraft và Steam, có thể giúp bạn quản lý tập trung nhiều máy chủ vật lý, tạo máy chủ game trên bất kỳ máy nào, và cung cấp hệ thống phân quyền nhiều người dùng an toàn đáng tin cậy.

Ba từ khóa trong đoạn này chính là định vị của nó:

| Từ khóa | Ý nghĩa |
| --- | --- |
| **Triển khai một lệnh** | Cung cấp script cài đặt, tự đăng ký thành dịch vụ hệ thống |
| **Phân tán** | Một bảng điều khiển quản lý được **nhiều** máy |
| **Nhiều người dùng** | Có sẵn hệ tài khoản và quyền, có thể phân quyền cho quản trị phụ thay vì cho SSH |

### 2.2 Kiến trúc: một bảng điều khiển + một hoặc nhiều daemon

Tài liệu chính thức chia MCSManager thành hai phần:

| Thành phần | Trách nhiệm theo mô tả chính thức |
| --- | --- |
| **Panel (bảng điều khiển Web)** | Quản lý người dùng, kết nối daemon, xác thực quyền cho phần lớn thao tác, API |
| **Daemon (tiến trình daemon)** | Quản lý tiến trình (nơi instance thực sự chạy), quản lý image Docker, quản lý tệp, giao tiếp terminal thời gian thực |

Ý nghĩa của "phân tán" nằm ở đây: **bản thân bảng điều khiển không chạy máy chủ**, nó gửi chỉ thị xuống daemon trên từng máy, daemon khởi động và quản lý instance tại chỗ. Nên bạn có thể là "một bảng điều khiển + N nút daemon".

:::warn Tên thành phần, lệnh cài đặt, cổng mặc định, cấu trúc thư mục lấy tài liệu chính thức làm chuẩn
Tên dịch vụ, địa chỉ script cài đặt, cổng mặc định và thư mục dữ liệu của MCSManager có thể thay đổi theo phiên bản. **Các con số liệt kê trong bài này chỉ đại diện giá trị mặc định trong tài liệu chính thức tại thời điểm viết, hãy lấy tài liệu chính thức và tệp cấu hình thực tế trên máy bạn làm chuẩn.** Môi trường sản xuất đừng chép bất kỳ cổng hay đường dẫn nào chưa được đối chiếu.
:::

**Các giá trị mặc định trong bài này đã đối chiếu với tài liệu chính thức (để tham chiếu, vẫn nên tự xác nhận):**

| Hạng mục | Giá trị mặc định trong tài liệu chính thức | Ghi chú |
| --- | --- | --- |
| Cổng Web của bảng điều khiển | `23333` | Sửa được ở `httpPort` trong tệp cấu hình Web |
| Cổng daemon | `24444` | Sửa được ở `port` trong tệp cấu hình daemon |
| Tên dịch vụ trên Linux | `mcsm-web`, `mcsm-daemon` | Dịch vụ systemd |
| Thư mục cài đặt bằng script | `/opt/mcsmanager` | Đường dẫn ví dụ trong tài liệu chính thức |
| Tệp cấu hình Web | `<Web 安装目录>/data/SystemConfig/config.json` | Gồm `httpPort`, `httpIp`, `loginCheckIp`, v.v. |
| Tệp cấu hình daemon | `<Daemon 安装目录>/data/Config/global.json` | Gồm `port`, `key`, `defaultInstancePath`, v.v. |
| Khóa của daemon | Trường `key` trong `global.json` nói trên | Khi khởi động daemon cũng in ra |

:::tip Một cảnh báo chính thức rất dễ bị bỏ qua
Tài liệu "triển khai phân tán" chính thức ghi rõ: trên nút chỉ chạy daemon, **bắt buộc phải dừng và vô hiệu hóa dịch vụ Web trước**, nếu không **bất kỳ ai cũng truy cập được trang thiết lập ban đầu và chiếm máy chủ của bạn**:

```bash
systemctl stop mcsm-web
systemctl disable mcsm-web
```

Cảnh báo này đáng để nhớ riêng: **"cái dịch vụ Web bị quên tắt" chính là một lần bị chiếm trọn vẹn.**
:::

### 2.3 Cài đặt và đăng nhập lần đầu

Script cài đặt một lệnh chính thức cho Linux (tài liệu chính thức nhấn mạnh: vì phải đăng ký vào dịch vụ hệ thống, **bắt buộc phải chạy bằng quyền root**):

```bash
sudo su -c "wget -qO- https://script.mcsmanager.com/setup.sh | bash"
```

:::note Địa chỉ script trong tài liệu tiếng Trung và tiếng Anh khác nhau
Tài liệu tiếng Anh chính thức dùng `setup.sh`, tài liệu tiếng Trung dùng `setup_cn.sh`. **Hãy lấy địa chỉ do tài liệu chính thức của phiên bản ngôn ngữ bạn đọc cung cấp làm chuẩn**, đừng ghép URL script theo trí nhớ. Tài liệu chính thức còn có chương cài đặt bằng Docker và cách ly môi trường (Docker), các bước cụ thể cũng lấy tài liệu chính thức làm chuẩn.
:::

Sau khi cài, khởi động hai dịch vụ theo tài liệu chính thức (tài liệu chính thức nhấn mạnh thiếu một cái là không được):

```bash
# Khởi động daemon trước, rồi khởi động dịch vụ Web
systemctl start mcsm-daemon.service
systemctl start mcsm-web.service

# Khi cần tự khởi động cùng máy
systemctl enable mcsm-web.service
systemctl enable mcsm-daemon.service
```

Khi cài thủ công, cách khởi động mà tài liệu chính thức đưa ra là `./install.sh`, `./start-daemon.sh`, `./start-web.sh`, và lưu ý khởi động thủ công cần công cụ như screen tiếp quản, nếu không sau khi SSH ngắt tiến trình sẽ bị hệ thống kết thúc. Bản Windows theo mô tả chính thức là tải gói nén về giải nén rồi chạy (nếu trong gói có trình khởi động thì cũng có thể dùng trình khởi động).

**Những việc bắt buộc phải làm khi đăng nhập lần đầu (đừng đảo thứ tự):**

1. Đăng nhập bảng điều khiển bằng tài khoản quản trị (thông tin tài khoản ban đầu lấy theo tài liệu chính thức và đầu ra cài đặt của bạn).
2. **Đổi ngay mật khẩu mặc định**, và dùng mật khẩu dài khác với các trang khác.
3. Đặt nó sau reverse proxy HTTPS theo cách ở 3.5, hoặc ít nhất giới hạn IP nguồn.
4. Kiểm tra địa chỉ lắng nghe và cổng, xác nhận không để daemon lộ trực tiếp ra Internet.

### 2.4 Quy trình điển hình: từ cài xong đến chạy được một instance

Quy trình mà tài liệu chính thức "dựng bản Java" đưa ra đại khái như sau (chi tiết lấy tài liệu chính thức làm chuẩn):

| Bước | Làm gì | Lưu ý |
| --- | --- | --- |
| 1 | Cài bảng điều khiển + daemon (hoặc dùng Docker theo tài liệu chính thức) | Trên máy nút chỉ để lại dịch vụ daemon |
| 2 | Đăng nhập và đổi mật khẩu mặc định | Xem 2.3 |
| 3 | Xác nhận hoặc thêm nút daemon trong bảng điều khiển | Cần địa chỉ và khóa; tài liệu chính thức nói địa chỉ hỗ trợ IP, tên miền, và cả tiền tố `ws://` / `wss://` |
| 4 | Bấm "tạo" ở trang "instance" | Có thể chọn cài từ chợ, hoặc "tạo trực tiếp" và chọn nút muốn chạy |
| 5 | Điền lệnh khởi động | Ví dụ chính thức: `java -Dfile.encoding=UTF-8 -jar "paper-<version>.jar"`, có thể thêm `-Xms` / `-Xmx` |
| 6 | Tải tệp máy chủ lên | Dùng "quản lý tệp" của bảng điều khiển để tải jar lõi lên |
| 7 | Bấm "khởi động" ở console instance và quan sát nhật ký | Lần khởi động đầu thường còn phải sửa `eula.txt` thành `eula=true` trong "tệp cấu hình" |
| 8 | Tạo tài khoản con cho quản trị phụ, chỉ cấp quyền trên instance cần thiết | Đừng cho "mọi instance + quản lý tệp" |

Tài liệu chính thức còn nói: dữ liệu instance mặc định nằm ở `<Daemon 安装目录>/data/InstanceData/<实例 ID>/`, cấu hình instance nằm ở `<Daemon 安装目录>/data/InstanceConfig/<实例 ID>.json` (trong đó có lệnh khởi động và các cấu hình khác). **Hai chỗ này là thứ "mất rồi rất khó dựng lại", bắt buộc phải đưa vào sao lưu.**

:::warn Tham số bộ nhớ trong lệnh khởi động đừng tham lam
Tài liệu chính thức cảnh báo riêng: **đừng chia toàn bộ bộ nhớ của máy cho JVM**, bản thân hệ điều hành cũng cần tài nguyên, nếu không có thể cả máy sập. `-Xmx` phải nhỏ hơn rõ rệt so với bộ nhớ vật lý của máy.
:::

### 2.5 Khi nào bảng điều khiển thực sự giúp bạn

- **Nhiều instance**: hàng chục máy chủ mà khởi động lại từng cái qua SSH là không thực tế.
- **Cho quản trị phụ quyền hạn chế**: để quản trị phụ khởi động lại, xem nhật ký, nhưng **không cho SSH** —— đây là lợi ích an ninh lớn nhất của bảng điều khiển.
- **Khởi động lại và sao lưu định giờ**: công cụ loại bảng điều khiển thường có năng lực tác vụ định giờ, **MCSManager có cung cấp hay không, lối vào ở đâu, cấu hình thế nào, lấy tài liệu chính thức và giao diện thực tế của bạn làm chuẩn**.
- **Quản lý nhiều máy**: một bảng điều khiển + nhiều daemon, một cửa vào thống nhất.
- **Cho người không quen dòng lệnh dùng**: giới hạn thao tác trong phạm vi tính năng của bảng điều khiển thường an toàn hơn là đưa thẳng một shell.

## 3. Bảo mật bảng điều khiển (quan trọng nhất)

### 3.1 Nguyên tắc thứ nhất: API của bảng điều khiển và daemon tuyệt đối không lộ trực tiếp ra Internet

Điều này quan trọng hơn tất cả các điều khác cộng lại:

:::warn Tuyệt đối không để cổng daemon lộ ra Internet
Trách nhiệm của API daemon chính là **khởi động tiến trình, đọc ghi tệp, thực thi lệnh** —— bản chất nó là một **giao diện thực thi mã từ xa**, chỉ là bọc ngoài một lớp xác thực. **Một khi nó lộ ra, kẻ tấn công chỉ cần một lần lộ khóa, một lần vượt qua xác thực hoặc một lỗ hổng chưa vá là có thể thực thi lệnh bất kỳ trên máy bạn.** Phía Web của bảng điều khiển cũng vậy, chỉ là nó ít nhất còn có một trang đăng nhập.
:::

Cách làm đúng:

1. **Bảng điều khiển**: bind vào `127.0.0.1` hoặc địa chỉ nội bộ, đưa ra ngoài qua reverse proxy HTTPS, rồi thêm một lớp giới hạn nguồn (VPN, danh sách trắng IP hoặc quy tắc tường lửa).
2. **Daemon**: chỉ cho máy chủ bảng điều khiển (và các client cần kết nối trực tiếp) truy cập.
3. **Đừng vì "tiện" mà mở cổng daemon ra `0.0.0.0`.**

:::note Chỗ đặc biệt của MCSManager: trình duyệt cần kết nối trực tiếp tới daemon
Tài liệu "kiến trúc mạng" chính thức của MCSManager nói rõ: để tránh bảng điều khiển thành nút thắt của lưu lượng lớn (tải tệp, nhật ký console), **những lưu lượng này do trình duyệt giao tiếp trực tiếp với daemon**. Vì vậy tài liệu chính thức chỉ ra địa chỉ của daemon **không được là địa chỉ mạng nội bộ**, nếu không trạng thái daemon sẽ dừng mãi ở "đang kết nối".

Điều này dẫn đến hai hậu quả bắt buộc phải biết:

- Nếu bạn nâng bảng điều khiển lên HTTPS, **mỗi daemon cũng phải cấu hình reverse proxy HTTPS riêng**, và đổi địa chỉ trong bảng điều khiển thành `wss://...`; tài liệu chính thức nói rõ trình duyệt sẽ **từ chối** kết nối WebSocket không qua HTTPS tới daemon.
- Lời khuyên chung "daemon chỉ ở mạng nội bộ" trên MCSManager phải thực hiện theo kiến trúc mạng trong tài liệu chính thức: **hoặc cấu hình theo phương án reverse proxy HTTPS mà tài liệu chính thức đưa ra, hoặc dùng VPN hay đường hầm bảo vệ đường "trình duyệt tới daemon"**, đừng đơn giản là mở cổng ra Internet.

**Cụ thể cấu hình thế nào, lấy hai bài "Kiến trúc mạng" và "Dùng HTTPS qua NGINX" trong tài liệu chính thức làm chuẩn.**
:::

### 3.2 Đừng chạy bằng root

| Tình huống | Sự thật (từ tài liệu chính thức) | Đề xuất |
| --- | --- | --- |
| Script một lệnh của MCSManager | Tài liệu chính thức nói **vì phải đăng ký dịch vụ hệ thống, script bắt buộc phải chạy bằng quyền root** | Cài đặt có thể dùng root, nhưng **instance nên cách ly bằng người dùng riêng hoặc container**; tài liệu chính thức còn có bài "cách ly môi trường (Docker)" |
| Pterodactyl Wings | Trong systemd unit mà tài liệu chính thức đưa ra là `User=root` | Đây là thiết kế chính thức (Wings cần điều khiển Docker); **cách ly instance bằng container chính là biện pháp giảm thiểu của nó** |
| Bảng điều khiển máy chủ phổ thông | Thường cần quyền cao để quản lý dịch vụ hệ thống và website | Đừng trộn máy chủ game và loại bảng điều khiển này vào cùng một ranh giới tin cậy (xem 4.2) |

Nguyên tắc: **không cần root thì đừng dùng; khi buộc phải dùng quyền cao, hãy dùng cách ly (người dùng riêng, container, máy riêng) để khoanh vùng bán kính vụ nổ.**

### 3.3 Thông tin xác thực và tài khoản

- **Đổi ngay mật khẩu mặc định.** Mật khẩu mặc định là mục tiêu đầu tiên của các trình quét tự động.
- Dùng mật khẩu **dài và duy nhất**, tốt nhất do trình quản lý mật khẩu tạo. **Lộ mật khẩu bảng điều khiển = mọi instance bị chiếm.**
- **Nếu bảng điều khiển hỗ trợ xác thực hai bước thì nhất định phải bật**; có hỗ trợ hay không, bật thế nào, **lấy tài liệu chính thức làm chuẩn**.
- **Định kỳ rà soát người dùng con và quyền**: ai còn? còn cần không? quyền có cấp quá không? "Quản lý tệp + mọi instance" gần như tương đương cho một shell.
- **Xóa các tài khoản không còn cần**, gồm quản trị phụ đã rời đi, tài khoản thử nghiệm và API Key không dùng nữa.
- Đừng viết mật khẩu bảng điều khiển vào ảnh chụp, lịch sử chat, kho Git, hay tệp văn bản trong thư mục máy chủ.

### 3.4 Giữ bản thân bảng điều khiển luôn cập nhật

Bảng điều khiển là ứng dụng Web, **có lịch sử lỗ hổng của riêng nó**. Việc cần làm:

- Theo dõi Release và thông báo an ninh của kho chính thức.
- Nâng cấp theo quy trình trong chương "cập nhật" của tài liệu chính thức.
- Trước khi nâng cấp **sao lưu dữ liệu của chính bảng điều khiển** (xem 3.7).

:::warn Một cái bẫy khi nâng cấp MCSManager
Tài liệu "cập nhật và đặt lại" chính thức lưu ý: cập nhật bằng script một lệnh sẽ **tự động bật lại `mcsm-web`**. Nếu trên máy nút bạn đã cố ý vô hiệu hóa dịch vụ Web (xem 2.2), sau khi cập nhật **bắt buộc phải tự tay dừng và vô hiệu hóa nó lần nữa**, nếu không trang thiết lập ban đầu lại lộ ra.
:::

### 3.5 Địa chỉ lắng nghe và reverse proxy (ví dụ nginx)

Cách nghĩ là: **bảng điều khiển chỉ bind địa chỉ loopback, để nginx cung cấp HTTPS ra ngoài.** Cổng dưới đây là **placeholder**, hãy thay bằng cổng bảng điều khiển của bạn.

```nginx
# /etc/nginx/conf.d/panel.conf
# <panel-port> là placeholder, hãy thay bằng cổng nội bộ mà bảng điều khiển thực sự lắng nghe.
# Đường dẫn chứng chỉ do công cụ chứng chỉ của bạn quyết định, đừng chép đường dẫn ví dụ dưới đây.

server {
    listen 80;
    server_name panel.example.com;
    # Chỉ làm chuyển hướng; cách cấp và gia hạn chứng chỉ lấy tài liệu công cụ chứng chỉ bạn dùng làm chuẩn
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name panel.example.com;

    # Do công cụ chứng chỉ của bạn tạo và gia hạn, hãy thay bằng đường dẫn thực tế (ví dụ đầu ra của certbot)
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    # Console của bảng điều khiển phụ thuộc WebSocket, bắt buộc phải chuyển tiếp header Upgrade
    location / {
        proxy_pass http://127.0.0.1:<panel-port>;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Bảng điều khiển có thể phải tải lên tệp máy chủ hoặc gói tổng hợp khá lớn; 0 nghĩa là không giới hạn
        client_max_body_size 0;

        # Console là kết nối dài, đừng để nó bị đệm hoặc bị cắt quá sớm
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Mấy điểm cần nói:

- `proxy_http_version 1.1` cộng với ba header `Upgrade` / `Connection` là then chốt của WebSocket, **thiếu một cái là console có thể không kết nối được**.
- **Đường dẫn** của `ssl_certificate` và `ssl_certificate_key` **đến từ công cụ chứng chỉ của bạn** (certbot, v.v.), công cụ khác nhau, cách triển khai khác nhau thì đường dẫn khác nhau, **đừng chép nguyên**.
- Nếu tài liệu chính thức của bảng điều khiển có ví dụ reverse proxy riêng (MCSManager chính thức có ba bài NGINX, IIS, Caddy), **lấy tài liệu chính thức làm chuẩn** —— vì đường của daemon thường còn phải cấu hình riêng.
- Sửa xong cấu hình thì kiểm tra cú pháp trước rồi mới nạp lại (tài liệu chính thức của MCSManager cũng yêu cầu kiểm chứng trước khi nạp lại):

```bash
sudo nginx -t
sudo nginx -s reload
```

### 3.6 Tường lửa

Chỉ mở cái bắt buộc, còn lại mặc định từ chối:

| Cổng | Mở cho ai | Mô tả |
| --- | --- | --- |
| 80 / 443 | Internet | Cửa vào bảng điều khiển (hoặc cổng HTTPS bạn chọn); 80 chỉ dùng để chuyển hướng và xác thực chứng chỉ |
| Cổng nội bộ của bảng điều khiển | **Chỉ máy này** | Khi bảng điều khiển bind vào `127.0.0.1` thì không cần mở ra ngoài |
| Cổng daemon | **Chỉ máy chủ bảng điều khiển** (hoặc giới hạn nguồn theo yêu cầu kiến trúc chính thức) | Tuyệt đối không mở ra Internet; cổng cụ thể lấy tài liệu chính thức làm chuẩn |
| Cổng game | Internet (theo nhu cầu) | Cửa vào của người chơi |
| SSH | IP quản lý của bạn | Nên chỉ cho đăng nhập bằng khóa |

Ví dụ (cổng và dải mạng đều là **placeholder**, hãy thay theo cấu hình thực tế của bạn; cú pháp lệnh đối chiếu tài liệu bản phân phối của bạn):

```bash
# ví dụ ufw
sudo ufw default deny incoming
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
# chỉ cho máy chủ bảng điều khiển truy cập cổng daemon
sudo ufw allow from <panel-host-ip> to any port <daemon-port> proto tcp
sudo ufw enable
sudo ufw status verbose
```

Cách nghĩ đầy đủ về cổng và quy tắc xem [Cơ bản an toàn mạng](/tutorials/ops/network-security) và [Router và tường lửa](/tutorials/ops/router-firewall).

### 3.7 Sao lưu dữ liệu của chính bảng điều khiển

**Thư mục dữ liệu của bảng điều khiển chứa định nghĩa của mọi instance, người dùng và cấu hình. Mất nó, tệp máy chủ vẫn còn, nhưng trong bảng điều khiển "không còn gì cả".**

| Sao lưu gì | Mô tả |
| --- | --- |
| Cơ sở dữ liệu và thư mục cấu hình của bảng điều khiển | Người dùng, quyền, định nghĩa instance, tác vụ định giờ |
| Cấu hình của daemon | Cổng, khóa, cấu hình instance |
| Thư mục dữ liệu instance | Thế giới, plugin, cấu hình (thường có dung lượng lớn nhất) |

:::warn Đường dẫn lấy tài liệu chính thức làm chuẩn
Vị trí thư mục dữ liệu của mỗi bảng điều khiển khác nhau, **bắt buộc phải xác nhận từ tài liệu chính thức rồi mới viết vào script sao lưu**, đừng viết đường dẫn theo phỏng đoán.

Lấy MCSManager làm ví dụ, vị trí liên quan mà tài liệu chính thức đưa ra là: cấu hình Web ở `<Web 安装目录>/data/SystemConfig/config.json`, cấu hình daemon ở `<Daemon 安装目录>/data/Config/global.json`, dữ liệu instance ở `<Daemon 安装目录>/data/InstanceData/<实例 ID>/`, cấu hình instance ở `<Daemon 安装目录>/data/InstanceConfig/<实例 ID>.json`. Tài liệu "cập nhật và đặt lại" chính thức thì khuyên thẳng: **trước khi nâng cấp hãy sao lưu hai thư mục `web/data` và `daemon/data` ra chỗ khác.**
:::

Đề xuất sao lưu:

- Bản sao lưu dữ liệu bảng điều khiển phải để **ngoại tuyến hoặc ngoài vị trí**, và **tiến trình của chính bảng điều khiển không ghi được** vào vị trí đó (nếu không khi bảng điều khiển bị xâm nhập, bản sao lưu sẽ bị xóa cùng).
- Bản sao lưu chứa cơ sở dữ liệu và khóa của bảng điều khiển, **bắt buộc phải mã hóa hoặc siết quyền chặt**.
- Định kỳ làm một lần **diễn tập khôi phục** —— chỉ sao lưu mà không khôi phục thì coi như không sao lưu. Cách cụ thể xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup).

### 3.8 Nếu bảng điều khiển bị xâm nhập thì sao

Viết rõ tình huống xấu nhất, mới biết cần phòng cái gì:

| Kẻ tấn công có được | Hậu quả |
| --- | --- |
| Tài khoản bảng điều khiển | Điều khiển **mọi instance**: xóa bản lưu, sửa cấu hình, đá người, tự cấp op cho mình |
| Bảng điều khiển + quản lý tệp | Tải lên jar hoặc plugin độc hại, đưa cửa hậu vào máy chủ |
| API daemon | **Thực thi lệnh bất kỳ trên máy** (đây vốn là tính năng của nó), thường tương đương thẳng một shell |
| Cơ sở dữ liệu hoặc khóa của bảng điều khiển | Truy cập lâu dài: dù bạn đã đổi mật khẩu, API Key và phiên cũ vẫn có thể còn hiệu lực |
| Quyền ghi thư mục sao lưu | **Xóa bản sao lưu của bạn**, khiến bạn không khôi phục được (thủ đoạn phổ biến của tống tiền và xóa bản lưu để trả đũa) |

Nên: **một khi nghi bảng điều khiển bị xâm nhập, hãy xử lý như "cả máy đã bị chiếm".**

1. Cắt ngay cửa vào Internet của bảng điều khiển và daemon (sửa tường lửa, chứ không phải chỉ đổi mật khẩu).
2. Thay **mọi** thông tin xác thực: tài khoản bảng điều khiển, khóa daemon, mật khẩu RCON trong máy chủ, mật khẩu cơ sở dữ liệu, API Key của nhà cung cấp cloud.
3. Kiểm tra có xuất hiện tài khoản quản trị mới, API Key mới, tác vụ định giờ bất thường không.
4. Kiểm tra trong thư mục máy chủ có bị nhét jar, plugin và script định giờ khả nghi không.
5. Khôi phục từ bản sao lưu **đã biết là sạch**, chứ đừng "dọn một chút rồi dùng tiếp" trên máy đã bị xâm nhập.
6. Nhìn lại nguyên nhân lộ (lộ cổng, mật khẩu yếu, hay chưa vá lỗi), xem [Cơ bản an toàn mạng](/tutorials/ops/network-security) và [Gia cố an ninh hệ thống](/tutorials/ops/system-security).

Quy trình xử lý đầy đủ xem [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics).

## 4. Các bảng điều khiển khác và cách chọn

### 4.1 Pterodactyl

Pterodactyl mô tả về mình là: **bảng điều khiển quản lý máy chủ game miễn phí, mã nguồn mở, xây bằng PHP, React và Go; được thiết kế cho an toàn, mọi máy chủ game chạy trong container Docker cách ly**, và cung cấp giao diện Web trực quan cho người dùng cuối. Đây là dự án mã nguồn mở giấy phép MIT, tài liệu chính thức nhấn mạnh hash mật khẩu bcrypt, mã hóa AES-256-CBC và hỗ trợ HTTPS ngay khi cài.

Kiến trúc của nó cùng loại "bảng điều khiển + daemon trên nút" với MCSManager. Định nghĩa trong bảng thuật ngữ chính thức là:

| Thuật ngữ | Ý nghĩa chính thức |
| --- | --- |
| **Panel** | Bản thân bảng điều khiển Pterodactyl, dùng để thêm nút và máy chủ |
| **Node** | Máy vật lý chạy instance Wings |
| **Wings** | Dịch vụ thế hệ mới viết bằng Go, kết nối với Docker và Panel, điều khiển máy chủ một cách an toàn qua bảng điều khiển |
| **Server** | Instance do bảng điều khiển tạo, chạy trên nút; một nút có thể có nhiều |
| **Docker / Image / Container** | Môi trường chạy cách ly; mỗi máy chủ chạy trong container riêng, để giới hạn CPU, bộ nhớ và tránh ảnh hưởng nhau |
| **Nest / Egg** | Nest thường tương ứng một game hoặc dịch vụ, Egg lưu cấu hình cụ thể của một loại game |
| **Yolks** | Bộ image Docker lõi đi kèm hệ thống Egg |

Điểm cần chú ý (đều từ tài liệu chính thức):

- Wings **chỉ hỗ trợ Linux**, tài liệu chính thức nói rõ môi trường Windows không chạy được; cần hệ thống chạy được Docker, các loại ảo hóa như OpenVZ, LXC thường không được (tài liệu chính thức khuyên tự kiểm tra bằng `systemd-detect-virt`).
- Quy trình cài đặt chính thức là: trước hết tạo nút trong bảng điều khiển, rồi dán cấu hình do bảng điều khiển tạo vào `/etc/pterodactyl/config.yml` trên nút (hoặc dùng lệnh do "tạo token" cung cấp), sau đó chạy Wings dưới dạng dịch vụ systemd.
- Trong systemd unit mà tài liệu chính thức đưa ra là `User=root`, đây là thiết kế chính thức.
- Tài liệu chính thức nói: **khi bảng điều khiển bật SSL, Wings cũng phải cấu hình chứng chỉ cho FQDN của nó.**
- Nút cần cấu hình allocation (tổ hợp IP và cổng), mỗi máy chủ ít nhất phải có một; tài liệu chính thức lưu ý **đừng dùng `127.0.0.1`**.

:::note Những nội dung chưa đối chiếu từng mục
**Lệnh cài đặt cụ thể, cổng mặc định, cấu trúc thư mục và yêu cầu phiên bản của Pterodactyl thay đổi theo phiên bản**, bài này không liệt kê từng mục, **nhất loạt lấy tài liệu chính thức làm chuẩn**: cài bảng điều khiển xem Getting Started của Panel chính thức, daemon trên nút xem tài liệu Installing Wings của Wings chính thức.
:::

### 4.2 Bảng điều khiển máy chủ phổ thông (1Panel, BT, v.v.)

Loại công cụ này **không phải bảng điều khiển máy chủ game**, chúng quản lý **những thứ ở tầng hệ điều hành**: website, cơ sở dữ liệu, container, tệp, tác vụ định giờ, tường lửa, v.v.

Lấy 1Panel làm ví dụ, định vị chính thức là **"bảng điều khiển quản lý vận hành máy chủ Linux hiện đại, mã nguồn mở"** (cũng là nền tảng quản lý AI nhẹ), cung cấp giao diện quản lý Web trực quan dễ dùng, quản lý được giám sát máy, tệp, cơ sở dữ liệu, container và tác vụ định giờ, tích hợp sâu các chương trình dựng web như WordPress, Halo; tài liệu chính thức còn cung cấp năng lực an ninh như WAF, kiểm toán nhật ký và sao lưu.

**Khác biệt giữa nó và bảng điều khiển game:**

| Khía cạnh | Bảng điều khiển máy chủ game | Bảng điều khiển máy chủ phổ thông |
| --- | --- | --- |
| Đối tượng quản lý | Instance game (tiến trình hoặc container) | Dịch vụ hệ thống, website, cơ sở dữ liệu, container |
| Có hiểu game không | Xem được console, truyền plugin, cấu hình lệnh khởi động | Thường không hiểu, chỉ quản như tiến trình hoặc container bình thường |
| Phạm vi quyền | Instance và daemon | **Thường là cả hệ thống** |
| Mục đích điển hình | Nhiều instance, phân quyền cho quản trị phụ | Dựng web, chạy dịch vụ, quản Docker |

**Rủi ro khi dùng bảng điều khiển phổ thông để quản máy chủ game:**

- **Quyền lớn hơn**: loại bảng điều khiển này thường cần quản lý dịch vụ hệ thống và tệp, một khi bị xâm nhập, phạm vi ảnh hưởng lớn hơn bảng điều khiển game.
- **Không hiểu game**: nó không xử lý hộ bạn những chi tiết như "gửi stop trước, chờ thế giới lưu xong", dễ giết cưỡng bức máy chủ như một tiến trình bình thường.
- **Thêm một lớp**: bạn tương đương phải bảo trì đồng thời hai bộ "cách triển khai máy chủ game" và "bảng điều khiển phổ thông", bề mặt tấn công cộng dồn.
- **Trong lịch sử từng có lỗ hổng nghiêm trọng**: bảng điều khiển phổ thông là mục tiêu trọng điểm của quét từ Internet. **Mọi bảng điều khiển đều nên được đối xử như "hạ tầng hướng ra Internet"** —— cập nhật kịp thời, giới hạn nguồn, bật xác thực mạnh. **Thông tin lỗ hổng cụ thể hãy lấy thông báo an ninh chính thức của từng hãng làm chuẩn, đừng dựa vào tin đồn bên thứ ba.**

:::tip Tổ hợp ổn hơn
Nếu thực sự cần bảng điều khiển phổ thông (ví dụ cùng máy còn có website), **hãy đặt máy chủ game ở máy riêng, người dùng riêng hoặc container riêng**, đừng để quyền của bảng điều khiển phổ thông và instance game trộn trong cùng một ranh giới tin cậy. Gia cố ở tầng hệ thống xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security).
:::

### 4.3 Bảng so sánh

| Bảng điều khiển | Định vị | Có cần daemon riêng không | Phù hợp với ai | Rủi ro chính |
| --- | --- | --- | --- | --- |
| **MCSManager** | Bảng điều khiển quản lý máy chủ game Minecraft và Steam mã nguồn mở, phân tán, nhiều người dùng | **Có** (Panel + Daemon, nhiều nút được) | Chủ máy chủ có nhiều instance, nhiều máy, cần phân quyền cho quản trị phụ | Daemon là bề mặt thực thi mã từ xa; trình duyệt cần kết nối trực tiếp tới daemon, reverse proxy phức tạp hơn; nâng cấp có thể bật lại dịch vụ Web |
| **Pterodactyl** | Bảng điều khiển máy chủ game miễn phí mã nguồn mở, instance chạy trong container Docker cách ly | **Có** (Panel + Wings mỗi nút) | Tình huống muốn dùng container cách ly, hướng tới nhiều người dùng và nhiều nút | Phụ thuộc Docker và Linux; Wings chính thức chạy bằng root; ngưỡng cài đặt và bảo trì cao hơn; cách cài và cổng lấy tài liệu chính thức làm chuẩn |
| **1Panel** | Bảng điều khiển quản lý vận hành máy chủ Linux hiện đại, mã nguồn mở (phổ thông) | Không (bản thân nó là bảng điều khiển quản lý cấp hệ thống) | Dựng web, quản cơ sở dữ liệu và container, vận hành phổ thông | **Quyền cấp hệ thống**, bề mặt tấn công lớn; không hiểu riêng máy chủ game; ảnh hưởng của lỗ hổng lớn |
| **Bảng điều khiển phổ thông như BT** | Bảng điều khiển vận hành máy chủ phổ thông | Không | Dựng web và vận hành phổ thông | Cùng loại 1Panel; **lệnh cài đặt, cổng mặc định và đặc tính an ninh lấy tài liệu chính thức làm chuẩn** |
| **Không dùng bảng điều khiển (SSH + systemd)** | Quản lý trực tiếp | Không | Một máy, ít instance | Không có bề mặt tấn công thêm; nhưng unit, nhật ký, cập nhật đều phải tự bảo trì |

## 5. Đề xuất thực hành

### 5.1 Thứ tự cài đặt

1. **Gia cố hệ thống trước** (người dùng riêng, khóa SSH, tường lửa, tự động cập nhật), xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security).
2. **Rồi mới cài bảng điều khiển**, cài xong đổi ngay mật khẩu mặc định.
3. **Đặt bảng điều khiển sau reverse proxy HTTPS**, và giới hạn nguồn (VPN, danh sách trắng IP hoặc quy tắc tường lửa).
4. **Cuối cùng mới nối nút daemon**, trên nút chỉ giữ dịch vụ daemon, tắt các dịch vụ Web thừa.
5. Tạo instance, tải tệp lên, chạy thông console.
6. Cấu hình tác vụ định giờ và sao lưu.
7. Tạo tài khoản con cho quản trị phụ, cấp quyền theo mức tối thiểu.

**Đừng** chạy cho xong trong trạng thái "trần truồng trên Internet" rồi tính sau —— bảng điều khiển lộ ra Internet mỗi phút đều đang bị quét.

### 5.2 Danh sách gia cố

- [ ] Bảng điều khiển và daemon đều **không truy cập trực tiếp được từ Internet**
- [ ] Bảng điều khiển truy cập qua HTTPS, và WebSocket bình thường
- [ ] Mật khẩu mặc định đã đổi; cái nào hỗ trợ xác thực hai bước thì đã bật
- [ ] Quyền của tệp cấu hình bảng điều khiển và daemon đã siết (tệp chứa khóa hoặc mật khẩu không được ai cũng đọc được)
- [ ] Instance chạy bằng người dùng riêng hoặc container, không chạy bằng root
- [ ] Dữ liệu bảng điều khiển đã sao lưu, và vị trí sao lưu thì bảng điều khiển không ghi được
- [ ] Đã theo dõi thông báo an ninh chính thức, và đã xác định quy trình cập nhật của mình
- [ ] Quyền của người dùng con đã được rà soát
- [ ] Trên máy nút không còn trang thiết lập ban đầu sót lại
- [ ] Đã biết các bước ứng phó khi bị xâm nhập

### 5.3 Nên giám sát cái gì

| Mục giám sát | Vì sao |
| --- | --- |
| **Số lần đăng nhập bảng điều khiển thất bại** | Tín hiệu đầu tiên của dò mật khẩu. Một số bảng điều khiển có sẵn mục cấu hình kiểu "chặn IP khi đăng nhập thất bại" (trong cấu hình Web của MCSManager có `loginCheckIp`, **ý nghĩa và hành vi cụ thể lấy tài liệu chính thức làm chuẩn**) |
| **Instance mới bất thường** | Kẻ tấn công thường tạo instance mới để chạy thứ khác |
| **Tác vụ định giờ bất thường** | Tác vụ định giờ là thủ đoạn phổ biến để duy trì truy cập |
| **Quản trị viên hoặc API Key mới thêm** | Cửa hậu duy trì truy cập |
| **Tài nguyên tăng vọt** | CPU, bộ nhớ, băng thông bị lấy đi đào coin hoặc phát gói |
| **Phiên bản của bảng điều khiển và daemon** | Vá lỗi kịp thời |
| **Kết nối ra ngoài bất thường** | Máy chủ game thường không nên chủ động kết nối ra lượng lớn địa chỉ |

Vị trí nhật ký và lệnh kiểm toán xem [Gia cố an ninh hệ thống](/tutorials/ops/system-security); cách xử lý sau khi bị xâm nhập xem [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics).

### 5.4 Khi nào không nên dùng bảng điều khiển

Bảng điều khiển không phải lựa chọn mặc định. Những trường hợp sau **thường không cần** bảng điều khiển:

- **Chỉ một máy, một máy chủ**: SSH + systemd đơn giản hơn, cũng bớt một bề mặt tấn công. Tham khảo [Triển khai đến môi trường truy cập được](/tutorials/java/deploy).
- **Chỉ bạn dùng, và bạn quen dòng lệnh**: lợi ích của bảng điều khiển (trực quan hóa, phân quyền) bạn không dùng tới, còn cái giá (thêm một dịch vụ, thêm một hệ tài khoản) thì vẫn phải trả.
- **Máy yếu về hiệu năng**: bản thân bảng điều khiển cũng chiếm bộ nhớ, trên máy ít RAM là không đáng.
- **Bạn không định bảo trì nó**: **bảng điều khiển không cập nhật còn nguy hiểm hơn không có bảng điều khiển.**

Ngược lại, chỉ cần thỏa bất kỳ điều nào dưới đây thì bảng điều khiển thường đáng dùng: nhiều instance, nhiều máy, cần cấp quyền hạn chế cho quản trị phụ, cần tác vụ định giờ, cần cho người không quen dòng lệnh sử dụng.

## Bước tiếp theo

- Gia cố ở tầng máy chủ và tài khoản: [Gia cố an ninh hệ thống](/tutorials/ops/system-security)
- Cổng, tường lửa và bề mặt lộ ra: [Cơ bản an toàn mạng](/tutorials/ops/network-security)
- Cách nghĩ về quy tắc trên router và tường lửa: [Router và tường lửa](/tutorials/ops/router-firewall)
- Chiến lược sao lưu: [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)
- Nhịp cập nhật và bảo trì: [Cập nhật và bảo trì máy chủ, plugin và MCDR](/tutorials/ops/updates)
- Cách triển khai khi không dùng bảng điều khiển: [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) và [Trình quản lý máy chủ MCDR](/tutorials/java/mcdr)
- Xử lý sau khi bị xâm nhập: [Điều tra sự cố và rút kinh nghiệm](/tutorials/ops/incident-forensics)

---

> Lệnh cài đặt, cổng mặc định và cấu trúc thư mục của từng bảng điều khiển lấy tài liệu chính thức làm chuẩn.
