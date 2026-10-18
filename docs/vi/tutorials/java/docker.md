---
title: Triển khai máy chủ Java Edition bằng Docker
slug: docker
cat: java
level: 3
order: 25
minutes: 16
tags: [Docker, compose, Java, paper, container, deployment, sao lưu]
updated: 2026-10-04
draft: false
---

Mấy bài trước đều là cài Java trực tiếp trên máy host, chạy thẳng jar máy chủ. Bài này đổi sang **container**: dùng một tệp `docker-compose.yml` mô tả máy chủ cùng môi trường chạy của nó, giao cho Docker chạy.

Container không bắt buộc, nhưng nó giải quyết được mấy rắc rối lâu dài: **máy host bị phiên bản Java làm bẩn, đổi máy phải làm lại từ đầu, nâng cấp lỗi xong không lùi về được**. Cái giá là bạn phải học thêm một tầng công cụ, và coi "volume và sao lưu" là kỷ luật phải thực thi.

## 1. Vì sao container hóa

### 1.1 Lợi ích

| Lợi ích | Biểu hiện cụ thể |
| --- | --- |
| **Môi trường sạch, không ảnh hưởng lẫn nhau** | Java runtime nằm trong image, máy host không cần cài JDK nào; mở đồng thời hai máy chủ 1.20 và 1.21 cũng không phải tranh phiên bản Java hệ thống |
| **Tái lập được** | Tag image, loại lõi, phiên bản, bộ nhớ, cổng đều viết trong một tệp, đổi máy chỉ cần mang tệp đó theo |
| **Quay lui dễ** | Sao lưu `/data` trước khi nâng cấp, nâng cấp xong có vấn đề thì đổi lại số phiên bản và khởi động lại; tag image cũng có thể cố định |
| **Quản lý tiến trình đỡ việc** | Tự khởi động lại khi sập, tự khởi động khi bật máy do chính sách `restart` lo, không phải tự viết unit systemd |
| **Xóa sạch** | Không muốn nữa thì xóa container và volume, không để lại thư mục và người dùng rải rác trên máy host |

### 1.2 Cái giá và tiền đề

| Cái giá | Giải thích |
| --- | --- |
| **Thêm một tầng phải học** | Không tránh được mấy khái niệm image, container, volume, mạng, Compose; có lỗi phải biết xem `docker compose logs` |
| **Kỷ luật volume và sao lưu** | Bản lưu không nằm trong "thư mục bạn quen", mà trong volume; không chủ động sao lưu tức là không có sao lưu |
| **Chi phí hiệu năng nhỏ nhưng không bằng không** | Mạng thêm một lớp NAT, hệ thống tệp thêm một lớp overlay, chi phí thường nhỏ hơn nhiều so với nút thắt của bản thân máy chủ; nhưng **đặt sai hạn mức bộ nhớ và CPU sẽ trực tiếp làm chậm hoặc giết máy chủ** |
| **Một số lõi/plugin phải điều chỉnh** | Plugin cần nhập console, cần cổng thêm, cần phiên bản Java cụ thể, phụ thuộc thư viện native có thể phải cấu hình thêm; chi tiết xem [Tối ưu hiệu năng](/tutorials/java/optimize) và [Quản lý plugin](/tutorials/java/plugin-manage) |

:::note Container không phải máy ảo
Container và máy host dùng chung kernel, nên "cách ly" ở đây là cách ly ở tầng tiến trình và hệ thống tệp, không phải ranh giới an toàn. root trong container không tự động bằng root trên máy host, nhưng **giao quyền Docker cho ai tức là giao root máy host cho người đó**.
:::

## 2. Cài Docker và plugin Compose

Đừng chép "script cài một phát" không rõ nguồn. Dưới đây đưa quy trình cài tay đầy đủ cho **Ubuntu / Debian** (mỗi lệnh đều giải thích tác dụng), bản phân phối khác và Windows / macOS xem cổng chính thức ở cuối mục này.

### 2.1 Cập nhật hệ thống và dọn phiên bản cũ

```bash
sudo apt update
sudo apt upgrade -y
```

Trước hết kiểm tra hệ thống đã từng cài các gói cũ như `docker.io`, `docker-compose`, `podman-docker`, `containerd`, `runc` chưa —— chúng sẽ **xung đột** với bản chính thức (tranh cổng, tranh tệp cấu hình, tranh phụ thuộc):

```bash
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)
```

Mổ xẻ lệnh: `dpkg --get-selections` liệt kê gói đã cài, `cut -f1` chỉ lấy tên gói, `apt remove` gỡ từng cái.

:::note Nhắc nhở
Nếu hệ thống chưa từng cài Docker, lệnh này sẽ báo "không tìm thấy các gói này", **là hiện tượng bình thường**, bỏ qua được.
:::

### 2.2 Cài phụ thuộc tiền đề

Kho chính thức của Docker đi qua HTTPS, cần hệ thống có khả năng kiểm chứng chứng chỉ và tải xuống:

```bash
sudo apt install -y ca-certificates curl
```

- `ca-certificates`: tập chứng chỉ gốc, giúp hệ thống xác minh danh tính trang HTTPS, tránh báo lỗi chứng chỉ khi tải khóa.
- `curl`: công cụ tải dòng lệnh, dùng để lấy khóa công khai GPG của Docker.

### 2.3 Thêm khóa GPG chính thức của Docker

Trình quản lý gói cần dùng "khóa công khai chữ ký số" để kiểm chứng nguồn phần mềm, phòng tải phải gói bị sửa.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Giải thích từng lệnh:

- `install -m 0755 -d /etc/apt/keyrings`: tạo thư mục chuyên chứa khóa của nguồn bên thứ ba, quyền `rwxr-xr-x`.
- `curl -fsSL ... -o ...`: tải khóa công khai và lưu. `-f` gặp lỗi thì im lặng thất bại (không ghi trang lỗi), `-s` im lặng, `-S` vẫn hiện khi lỗi, `-L` theo chuyển hướng, `-o` chỉ định đường dẫn đầu ra.
- `chmod a+r`: cấp quyền đọc cho mọi người dùng. **Bước này không bỏ được**, nếu không `apt update` đọc khóa sẽ thất bại.

Nếu `curl` thất bại vì vấn đề mạng, có thể đổi sang `wget`:

```bash
sudo wget -O /etc/apt/keyrings/docker.asc https://download.docker.com/linux/ubuntu/gpg
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 2.4 Thêm nguồn APT chính thức của Docker

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

- Đây là **định dạng DEB822** (Ubuntu 22.04+ và Debian mới hơn hỗ trợ), rõ ràng hơn `sources.list` một dòng cũ.
- `Suites` dùng `$(. /etc/os-release && echo ...)` để **đọc động tên phiên bản của máy** (như `jammy`, `noble`, `bookworm`), bảo đảm nguồn khớp chặt với phiên bản hệ thống; bạn cũng có thể viết cứng tên phiên bản.
- `Signed-By` trỏ tới khóa vừa thêm, bảo đảm mọi gói tải từ nguồn này đều qua xác minh chữ ký chính thức của Docker.

:::warn Người dùng Debian chú ý
Trên Debian địa chỉ kho là `https://download.docker.com/linux/debian`, tên phiên bản lấy từ `VERSION_CODENAME` (như `bookworm`), cách viết giống trên, chỉ đổi `ubuntu` thành `debian`.
:::

### 2.5 Cài Docker Engine và Compose

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Tác dụng của từng thành phần:

| Tên gói | Tác dụng |
| --- | --- |
| `docker-ce` | Engine lõi bản cộng đồng Docker, lo tạo và quản lý container |
| `docker-ce-cli` | Client dòng lệnh, cung cấp lệnh `docker` |
| `containerd.io` | Runtime container tầng dưới, quản lý vòng đời container |
| `docker-buildx-plugin` | Plugin build, hỗ trợ build image đa nền tảng |
| `docker-compose-plugin` | Plugin Compose v2, cung cấp lệnh `docker compose` |

### 2.6 Khởi động và kiểm chứng

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

Thấy `active (running)` là bình thường (bấm `q` để thoát trang trạng thái). `enable` làm Docker tự khởi động khi bật máy.

Rồi dùng image thử chính thức kiểm chứng "pull được, chạy được":

```bash
sudo docker run --rm hello-world
```

Hiện `Hello from Docker!` nghĩa là môi trường bình thường.

### 2.7 Cấu hình tăng tốc mirror trong nước (khuyến nghị với máy chủ Trung Quốc đại lục)

Các lớp image của Docker Hub khi kết nối trực tiếp trong nước thường rất chậm thậm chí timeout. Có thể cấu hình dịch vụ tăng tốc **mà không đổi tên image**, để `docker pull` tự đi qua trang gương.

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://hub.rat.dev",
    "https://dockerproxy.net"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Kiểm chứng có hiệu lực không:

```bash
docker info | grep -A5 "Registry Mirrors"
```

:::warn Về các trang gương bên thứ ba
Các trang tăng tốc liệt kê trên đều là **dịch vụ bên thứ ba do cộng đồng bảo trì**, khả năng dùng được, chính sách giới hạn tốc độ và an toàn sẽ thay đổi bất cứ lúc nào, cũng có thể một ngày nào đó ngừng hẳn.

- Chỉ dùng chúng để **pull image công khai**, đừng để image riêng tư hoặc thông tin xác thực đi qua chúng;
- Nếu một trang mất hiệu lực, xóa khỏi danh sách rồi `systemctl restart docker` là được;
- Cách ổn hơn cho môi trường production là tự dựng kho image (như Harbor), hoặc dùng dịch vụ image container của nhà cung cấp cloud.
:::

Một cách tạm thời khác là **thêm tiền tố trực tiếp trước tên image** (ví dụ `docker run docker.1ms.run/hello-world`), nhưng image pull về sẽ mang tiền tố, và cùng tên image không tiền tố **bị hệ thống coi là hai image khác nhau**, dễ gây pull trùng và lãng phí đĩa, **không khuyến nghị dùng lâu dài**.

### 2.8 Về nhóm người dùng docker

Trên Linux, thêm người dùng vào nhóm `docker` là khỏi phải `sudo`:

```bash
sudo usermod -aG docker $USER
# cần đăng nhập lại (hoặc newgrp docker) mới có hiệu lực
```

:::warn Điều này tương đương cấp quyền root máy host cho người dùng đó
Có thể mount thư mục bất kỳ, khởi container đặc quyền, sửa iptables. Máy cá nhân thì chấp nhận được, **trên máy chủ nhiều người dùng phải thận trọng**. Cách gia cố liên quan xem [Gia cố an toàn hệ thống](/tutorials/ops/system-security).
:::

### 2.9 Cổng chính thức của nền tảng khác

| Nền tảng | Cổng chính thức |
| --- | --- |
| Linux (các bản phân phối) | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Plugin Compose cho Linux | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

Cài xong xác nhận hai việc trước: **daemon Docker dùng được**, **Compose là plugin v2 (`docker compose`, ở giữa là dấu cách, không phải `docker-compose`)**.

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::warn Về nhóm người dùng docker
Trên Linux, thêm người dùng vào nhóm `docker` xong thì chạy Docker không cần `sudo`, nhưng **điều này tương đương cấp quyền root máy host cho người dùng đó** (mount thư mục bất kỳ, khởi container đặc quyền). Máy cá nhân thì chấp nhận được, trên máy chủ nhiều người dùng phải thận trọng. Cách gia cố liên quan xem [Gia cố an toàn hệ thống](/tutorials/ops/system-security).
:::

## 3. Image: `itzg/minecraft-server`

Image được dùng phổ biến nhất trong cộng đồng Java Edition là **`itzg/minecraft-server`** (bảo trì tích cực, tài liệu đầy đủ, hỗ trợ nhiều lõi như Vanilla / Paper / Purpur / Fabric / NeoForge / Forge). Nó biến các bước "tải lõi, sinh cấu hình, chấp nhận EULA, bật RCON" thành biến môi trường.

```bash
docker pull itzg/minecraft-server
```

:::warn Image phải chọn nguồn, tag phải cố định
Chỉ pull từ image chính thức hoặc được bảo trì lâu dài; **môi trường production đừng dùng `latest` mãi** —— `latest` sẽ lặng lẽ đổi sang phiên bản mới sau một lần `pull` nào đó, có vấn đề bạn không phân biệt được là cấu hình đổi hay phiên bản đổi. Muốn theo bản mới nhất thì viết rõ số phiên bản và sao lưu trước khi nâng cấp.
:::

## 4. Một tệp `docker-compose.yml` đầy đủ

Tạo một thư mục mới (ví dụ `~/mcsog-java`), trong đó tạo `docker-compose.yml`:

```yaml
services:
  minecraft:
    image: itzg/minecraft-server
    container_name: mcsog-java
    ports:
      - "25565:25565/tcp"
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
      VERSION: "1.21.11"
      MEMORY: "4G"
      ONLINE_MODE: "TRUE"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "change-me-to-a-long-random-string"
      TZ: "Asia/Shanghai"
    volumes:
      - mcsog-java-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  mcsog-java-data:
    name: mcsog-java-data
```

Compose v2 **không còn cần** trường `version:` ở tầng đầu, viết vào sẽ bị bỏ qua (một số phiên bản sẽ nhắc).

Giải thích từng mục:

| Trường | Tác dụng |
| --- | --- |
| `image` | Dùng image nào. Bỏ tag tức là `:latest`, không khuyến nghị |
| `container_name` | Cố định tên container, sau này `logs` / `exec` / `attach` đều dùng nó, dễ nhớ hơn tên tự sinh |
| `ports` | `cổng máy host:cổng container/giao thức`. Java Edition là **TCP 25565**, viết `"25565:25565/tcp"` ít bị hiểu nhầm nhất |
| `environment` | Cấu hình image đọc, xem bảng mục 6 |
| `volumes` | `tên volume:/data`. **Bản lưu, plugin, cấu hình đều trong `/data`**, đây là thứ duy nhất không được mất trong cả bản triển khai |
| `stdin_open: true` | Giữ stdin của container mở, nếu không bạn không **gõ** được vào console máy chủ |
| `tty: true` | Cấp một pseudo-terminal, để console có tương tác và hiển thị bình thường (dùng cùng `docker attach`) |
| `restart: unless-stopped` | Tự kéo lên sau khi sập hoặc máy host khởi động lại; nhưng **sau khi `docker compose stop` bằng tay thì không tự kéo lên**, đúng như trực giác |

Trong `volumes` viết rõ `name: mcsog-java-data` là để tên volume **đoán được**. Không viết thì Compose sẽ tự thêm tiền tố tên dự án (thành `mcsogjava_mcsog-java-data`…), sau này viết lệnh sao lưu rất dễ chỉ sai volume.

:::note `EULA=TRUE` là yêu cầu pháp lý, không phải công tắc kỹ thuật
`EULA: "TRUE"` biểu thị **bạn đã đọc và đồng ý [Thỏa thuận người dùng cuối của Minecraft](https://aka.ms/MinecraftEULA)**. Đây là điều kiện tiên quyết để dùng phần mềm máy chủ, image chỉ ghi tuyên bố của bạn vào `eula.txt`. Không viết biến này (hoặc viết `FALSE`), máy chủ sẽ khởi động xong thoát ngay. Hãy thật sự đọc một lượt thỏa thuận rồi mới điền.
:::

:::tip Sửa xong làm một lần "khám sức khỏe"
Mỗi lần sửa tệp compose xong hãy chạy `docker compose config` một lần: nó in ra cổng, volume, biến môi trường đã mở rộng, chỗ viết sai sẽ báo lỗi ngay, nhanh hơn nhiều so với lật nhật ký sau khi khởi động.
:::

```bash
docker compose config
```

## 5. Mạng và tường lửa (mục dễ vấp nhất)

Mục này là phần quan trọng nhất của bài. Hành vi mạng của Docker **hoàn toàn khác trực giác "cài phần mềm, mở cổng"**, rất nhiều vấn đề "tường lửa rõ ràng đã mở mà vẫn bị quét", "mạng nội bộ tự nhiên không thông", "đổi máy là không kết nối được" đều có gốc ở đây.

### 5.1 Tường lửa hệ thống không quản được Docker

**Nói kết luận trước: mấy quy tắc bạn tự viết trong `ufw`, `firewalld`, `iptables` đều không có hiệu lực với cổng do container Docker ánh xạ ra.**

Nguyên nhân nằm ở thứ tự khởi động và vị trí quy tắc của Docker:

- Daemon Docker khi khởi động sẽ **tự tạo** quy tắc `iptables`, gồm chain `DOCKER` của bảng `nat` và các chain `DOCKER`, `DOCKER-ISOLATION`, `DOCKER-USER` của bảng `filter`.
- Những quy tắc này được chèn **trước** quy tắc tường lửa hệ thống (đầu chain `FORWARD`), và Docker chủ động cho qua trên chain `FORWARD`.
- Kết quả: gói tin trước khi tới quy tắc của `ufw` đã bị quy tắc của Docker xử lý xong.

Cách kiểm chứng (**khuyến nghị thật sự làm một lần, nhớ nhất**):

```bash
# 1. từ chối rõ ràng cổng đó trước
sudo ufw deny 25565/tcp

# 2. xác nhận quy tắc đã có hiệu lực
sudo ufw status numbered

# 3. khởi một container có ánh xạ cổng đó
docker run -d --name test-web -p 25565:80 nginx

# 4. truy cập từ một máy khác
#    telnet IP-công-cộng-của-bạn 25565
#    → sẽ thành công. Quy tắc deny của ufw bị vòng qua hoàn toàn.
```

### 5.2 Bốn cách làm đúng

**Cách một: chỉ bind cổng vào loopback (khuyến nghị, an toàn nhất và đơn giản nhất)**

```yaml
services:
  mc:
    ports:
      - "127.0.0.1:25565:25565/tcp"
```

Sau khi thêm tiền tố `127.0.0.1:`, máy host chỉ lắng nghe cổng này trên **card loopback**, internet **không thể kết nối trực tiếp**. Cần mở ra ngoài thì để reverse proxy trên máy host chuyển tiếp:

```nginx
# /etc/nginx/nginx.conf (mô-đun stream, chuyển tiếp tầng 4)
stream {
    upstream mc_backend {
        server 127.0.0.1:25565;
    }
    server {
        listen 25565;
        proxy_pass mc_backend;
        proxy_timeout 300s;
    }
}
```

Như vậy quy tắc tường lửa lại có hiệu lực: bên ngoài chỉ đánh được tới Nginx, Nginx chuyển tiếp tới container trên loopback máy local. **Bedrock Edition (UDP) cũng áp dụng được, chỉ cần `listen 19132 udp;`.**

**Cách hai: dùng chain `DOCKER-USER`**

`DOCKER-USER` là chain do Docker chính thức để dành, và **không bị chính Docker ghi đè**, phù hợp để giới hạn nguồn:

```bash
# chỉ cho nguồn chỉ định truy cập 25565, còn lại bỏ
sudo iptables -I DOCKER-USER -p tcp --dport 25565 ! -s 203.0.113.0/24 -j DROP

# xem quy tắc
sudo iptables -L DOCKER-USER -n --line-numbers
```

Chú ý:

- Dùng `-I` (chèn lên đầu) chứ không `-A`, tránh bị quy tắc cho qua phía trước giành trước.
- Quy tắc **mất sau khi khởi động lại**, cần đi với `iptables-persistent` hoặc script khởi động để lưu lại.
- Chain này chỉ xử lý lưu lượng **chuyển tiếp**, không có hiệu lực với chế độ mạng `host` (xem 5.4).

**Cách ba: dùng [ufw-docker](https://github.com/chaifeng/ufw-docker) để UFW quản lại được container (khuyến nghị cho người "muốn tiếp tục dùng UFW làm cửa vào thống nhất")**

Hai cách đầu hoặc đổi cách bind cổng (cách một), hoặc phải tự bảo trì quy tắc iptables (cách hai). **Nếu bạn muốn tiếp tục dùng `ufw` làm một công cụ duy nhất quản lý mọi quy tắc tường lửa**, dùng script này là đỡ việc nhất:

Cách nghĩ của nó không phải "vòng qua" hay "tắt", mà là **nối chain `DOCKER-USER` mà Docker để dành trở về chain chuyển tiếp của UFW**, như vậy lệnh `ufw route` quản trực tiếp được cổng container.

**Cài đặt (ba lệnh)**:

```bash
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
sudo ufw-docker install
```

`ufw-docker install` làm hai việc: **sao lưu** `/etc/ufw/after.rules`, rồi **nối thêm** quy tắc vào cuối tệp (quy tắc cốt lõi là `-A DOCKER-USER -j ufw-user-forward`). Nó **không** sửa cấu hình Docker của bạn, Docker vẫn tự quản mạng.

Cài xong kiểm tra một cái:

```bash
ufw-docker check     # kiểm tra quy tắc đã được ghi chưa
ufw-docker status    # xem quy tắc chuyển tiếp đang được mở
```

:::warn Cài xong hãy khởi động lại máy chủ một lần
Tác giả nhắc rõ: **có khi khởi động lại UFW xong quy tắc không có hiệu lực**, lúc đó khởi động lại máy chủ là được. Môi trường production hãy sắp cửa sổ bảo trì.
:::

**Cách dùng hằng ngày** (lấy Java Edition 25565 làm ví dụ):

```bash
# cho phép bên ngoài truy cập cổng container 25565 (chú ý: điền 【cổng container】, không phải cổng máy host)
sudo ufw route allow proto tcp from any to any port 25565

# không cho phép nữa (thu hồi)
sudo ufw route delete allow proto tcp from any to any port 25565

# chỉ xem quy tắc của một container
ufw-docker list mc

# cho qua thẳng theo tên container (cách viết tiện mà script cung cấp)
sudo ufw-docker allow mc 25565
sudo ufw-docker allow mc 25565/tcp

# thu hồi quy tắc của một container
sudo ufw-docker delete allow mc 25565
```

**Bedrock Edition (UDP) tương tự**:

```bash
sudo ufw route allow proto udp from any to any port 19132
sudo ufw-docker allow mc-bedrock 19132/udp
```

**IP container đổi thì làm sao**: container tạo lại thì IP đổi, script cung cấp một lệnh nạp lại:

```bash
sudo ufw-docker reload
```

**Vì sao dùng `ufw route` (chain chuyển tiếp) mà không dùng `ufw allow` (chain đầu vào)**:

| Lệnh | Phạm vi tác dụng | Rủi ro |
| --- | --- | --- |
| `ufw allow 25565` | **Đồng thời** cho qua 25565 của 【máy host】 và 【container】 | Có thể tiện thể để lộ luôn dịch vụ trên máy host |
| `ufw route allow … port 25565` | **Chỉ** cho qua lưu lượng chuyển tiếp tới container | 25565 trên máy host vẫn không mở, ranh giới rõ ràng |

**Tùy chọn: tự định nghĩa dải mạng được phép truy cập container**

Mặc định chỉ tin dải mạng riêng tiêu chuẩn (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). Nếu mạng nội bộ của bạn là dải khác:

```bash
# tự nhận diện dải mạng của mọi mạng Docker (thêm xóa mạng xong phải chạy lại)
sudo ufw-docker install --docker-subnets

# hoặc chỉ định rõ
sudo ufw-docker install --docker-subnets 192.168.207.0/24 10.207.0.0/16
```

**Không dùng nữa thì gỡ thế nào**:

```bash
sudo ufw-docker uninstall   # hoàn nguyên cấu hình UFW và xóa các tệp đã cài
```

**Lợi ích và cái giá của phương án này**:

| | Giải thích |
| --- | --- |
| ✓ Không phải tắt iptables của Docker | Container vẫn truy cập được internet, thêm mạng Docker mới cũng không phải bảo trì quy tắc bằng tay |
| ✓ Một công cụ quản tới cùng | Cổng máy host dùng `ufw allow`, cổng container dùng `ufw route allow`, đều thấy trong `ufw status` |
| ✓ Hỗ trợ IPv6 và Swarm | Tự cập nhật `after6.rules` khi cần; ở chế độ Swarm quản lý thống nhất được từ node quản lý |
| ✗ Là script bên thứ ba | Không phải thành phần chính thức của Docker hay Canonical, nâng cấp/kiểm toán phải tự để ý (script rất ngắn, khuyến nghị đọc một lượt) |
| ✗ Điền là cổng container | Khi `-p 8080:80` thì phải dùng `80`, không phải `8080`, điểm này dễ viết sai nhất |
| ✗ Cài lần đầu xong cần khởi động lại máy chủ | Xem cảnh báo ở trên |

**Cách bốn: tắt quản lý iptables của Docker (không khuyến nghị người mới)**

```json
// /etc/docker/daemon.json
{
  "iptables": false
}
```

Sửa xong `sudo systemctl restart docker`. Cái giá là:

- **Ánh xạ cổng (`-p`) mất hiệu lực**, vì quy tắc NAT không còn được tự sinh;
- Container mặc định không truy cập được internet, bạn phải tự cấu hình SNAT;
- Giao tiếp giữa container qua cầu mạng cũng bị ảnh hưởng.

Chỉ làm vậy khi bạn hoàn toàn rõ mình sẽ tự tiếp quản NAT.

### 5.3 Ba cách viết ánh xạ cổng và khác biệt

| Cách viết | Địa chỉ lắng nghe | Ai truy cập được | Tình huống áp dụng |
| --- | --- | --- | --- |
| `-p 25565:25565` | `0.0.0.0` (mọi card mạng) | **Toàn bộ internet + mạng nội bộ** | Chỉ chấp nhận được khi bạn đã có nhóm bảo mật/tường lửa cloud đỡ đáy |
| `-p 127.0.0.1:25565:25565` | Chỉ loopback | **Chỉ máy local** | **Khuyến nghị**: đi với reverse proxy hoặc tunnel SSH |
| `-p 192.168.1.10:25565:25565` | Card mạng chỉ định | Chỉ dải mạng đó | Máy chủ thuần nội bộ/LAN |

**Điểm mấu chốt**: hành vi mặc định của `-p 25565:25565` là bind `0.0.0.0`, tức là **một khi ánh xạ là coi như mở ra internet** (nhóm bảo mật của nhà cung cấp cloud là một cửa chặn khác, nhưng đó không phải tường lửa máy local). Nhiều người tưởng "tôi không động vào tường lửa nên an toàn", thực tế cổng đã mở toang.

### 5.4 Chọn chế độ mạng nào trong năm chế độ

| Chế độ | Giải thích | Ưu điểm | Nhược điểm | Khi nào dùng |
| --- | --- | --- | --- | --- |
| `bridge` (mặc định) | Container nối vào cầu mạng `docker0`, ra ngoài qua NAT | Cách ly tốt, cổng kiểm soát được | Thêm một lớp NAT; phải có `-p` mới tới được | **Phần lớn tình huống** |
| `host` | Container **dùng thẳng stack mạng của máy host**, không tạo cầu, không NAT | Hiệu năng tốt nhất, độ trễ thấp nhất | **Mất hoàn toàn cách ly mạng**; xung đột cổng; `-p` bị bỏ qua; quy tắc tường lửa của Docker cũng không áp dụng | Tình huống cần hiệu năng cực đại hoặc cổng phức tạp |
| `macvlan` | Cấp cho container MAC riêng và IP LAN, trông như một máy thật trong LAN | **Trong LAN phát hiện được trực tiếp** (danh sách LAN của Bedrock, quảng bá LAN của Java) | Cần switch/router phối hợp; một số môi trường cloud không hỗ trợ | Chơi LAN, tình huống cần phát hiện bằng quảng bá |
| `overlay` | Mạng ảo vắt qua nhiều máy host (Swarm dùng) | Cụm nhiều máy | Độ phức tạp cao | Triển khai nhiều máy |
| `none` | Không có mạng | Cách ly hoàn toàn | Container không lên mạng được | Tác vụ tính toán thuần offline |

```yaml
# ví dụ chế độ host (chú ý: lúc này mục ports vô nghĩa)
services:
  mc:
    network_mode: host
    environment:
      SERVER_PORT: "25565"
```

:::warn Ở chế độ host tường lửa lại "có hiệu lực", nhưng cổng cũng thật sự mở toang
Chế độ `host` không đi qua quy tắc NAT của Docker, nên lúc này `ufw` **chặn được** cổng. Nhưng container chiếm thẳng cổng máy host, **chỉ cần máy chủ đang lắng nghe là internet kết nối được**, an toàn hoàn toàn phụ thuộc tường lửa hệ thống và nhóm bảo mật của bạn. Trước khi dùng nhất định xác nhận quy tắc viết đúng.
:::

### 5.5 Xung đột dải mạng `docker0` (nguyên nhân số một khiến mạng nội bộ tự nhiên không thông)

Docker mặc định cấp cho cầu `docker0` **`172.17.0.0/16`**, mỗi lần tạo một mạng tự định nghĩa lại lần lượt chiếm `172.18.0.0/16`, `172.19.0.0/16`…

**Vấn đề là**: nếu **mạng nội bộ công ty, VPN, mạng nội bộ của nhà cung cấp cloud** của bạn cũng dùng `172.17.x.x`, máy host sẽ đồng thời có hai route trỏ tới cùng một dải mạng, biểu hiện là:

- Container truy cập dịch vụ nội bộ bị timeout;
- Máy host truy cập một số địa chỉ nội bộ lúc được lúc không;
- SSH sang máy khác tự nhiên đứt.

**Tìm lỗi**:

```bash
ip route | grep 172
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**Sửa** (đổi dải địa chỉ mặc định của Docker, **cần khởi động lại Docker, sẽ gián đoạn ngắn mọi container**):

```json
// /etc/docker/daemon.json
{
  "default-address-pools": [
    { "base": "10.201.0.0/16", "size": 24 }
  ]
}
```

```bash
sudo systemctl restart docker
# mạng tự định nghĩa đã có sẽ không tự đổi, cần xóa và tạo lại
docker network ls
docker network rm <tên-mạng>
```

Nguyên tắc chọn dải địa chỉ: **tránh mọi dải mạng nội bộ của bạn** (thường phải tránh phần bạn thực sự dùng trong `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). Nếu mạng nội bộ đã chiếm `10.x`, có thể đổi sang dải NAT cấp nhà mạng như `100.64.0.0/16`.

### 5.6 Các container truy cập nhau thế nào

**Trong cùng một mạng tự định nghĩa, dùng "tên dịch vụ" làm tên máy chủ, đừng dùng `localhost`.**

```yaml
services:
  mc:
    networks: [mcnet]
  backup:
    networks: [mcnet]
    environment:
      TARGET: "mc:25565"     # đúng: tên dịch vụ
      # TARGET: "127.0.0.1:25565"  # sai: đó là chính container backup
networks:
  mcnet:
    driver: bridge
```

Điểm bổ sung:

- **Mạng `bridge` mặc định không hỗ trợ phân giải tên dịch vụ**, phải tự tạo một mạng (`docker network create` hoặc dùng `networks` của Compose). Compose mặc định tạo một mạng cho dự án, nên dùng Compose thường không vấn đề.
- **IP container sẽ đổi sau khi tạo lại**, nên trong mọi cấu hình đừng viết IP container, nhất loạt viết tên dịch vụ.
- Muốn container truy cập dịch vụ trên **máy host** (ví dụ MySQL trên máy host), dùng `host.docker.internal` (Linux cần thêm `host-gateway` trong `extra_hosts`), hoặc dùng `--network host`.

### 5.7 Tra nhanh các bẫy thường gặp về mạng

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `ufw` cho qua/từ chối mà hành vi cổng container không đổi | Docker vòng qua tường lửa hệ thống | Dùng `-p 127.0.0.1:` hoặc chain `DOCKER-USER` |
| Không định mở cổng mà vẫn truy cập được từ internet | `-p` mặc định bind `0.0.0.0`; tường lửa hệ thống lại không quản được container | Đổi thành `-p 127.0.0.1:cổng-máy-host:cổng-container`, chi tiết xem §5.3 |
| Container truy cập dịch vụ nội bộ timeout | Dải mạng `docker0` xung đột với mạng nội bộ | Đổi `default-address-pools` và tạo lại mạng |
| Trong danh sách LAN không thấy máy chủ Bedrock | Chế độ `bridge` không chuyển tiếp quảng bá | Đổi sang chế độ `macvlan` hoặc `host` |
| Sau khi tạo lại container địa chỉ kết nối mất hiệu lực | IP container đã đổi | Đổi sang tên dịch vụ, đừng viết IP |
| Trong container không kết nối được dịch vụ trên máy host | `localhost` chỉ chính container | Dùng `host.docker.internal` hoặc mạng `host` |
| Ở chế độ `host`, `ports` không có hiệu lực | Chế độ `host` không dùng ánh xạ cổng | Sửa thẳng cổng lắng nghe của máy chủ |
| Truyền gói lớn thỉnh thoảng lag/timeout | MTU không khớp (một số nhà cung cấp cloud) | Đặt `"mtu": 1400` trong `daemon.json` hoặc theo giá trị nhà cung cấp khuyến nghị |
| Sau khởi động lại quy tắc `DOCKER-USER` mất | Quy tắc iptables chưa được lưu lại | Dùng `iptables-persistent` hoặc script khởi động |

### 5.8 Một danh sách mở ra ngoài an toàn

Kiểm tra theo thứ tự dưới đây, bất kỳ mục nào không thỏa đều có thể dẫn tới "tưởng là chưa mở, thực tế mở toang":

1. **Nhóm bảo mật của nhà cung cấp cloud**: chỉ mở cổng và nguồn thật sự cần (dùng được nguồn cố định thì đừng dùng `0.0.0.0/0`).
2. **Bind cổng**: `-p 127.0.0.1:...` chứ không `-p ...`.
3. **Reverse proxy**: để Nginx `stream` / frp… ra ngoài, cổng container không ra khỏi máy local.
4. **Tường lửa hệ thống**: vẫn có hiệu lực với dịch vụ **không phải container**, cấu hình như thường.
5. **Thử thật**: từ **một máy khác** chạy `telnet IP-công-cộng cổng`, hoặc dùng công cụ quét cổng trực tuyến xác nhận cổng **chưa mở** thật sự không tới được.
6. **RCON tuyệt đối đừng ánh xạ ra internet** (xem ghi chú dưới bảng biến môi trường §6).

## 6. Khởi động, xem nhật ký, vào console, dừng

```bash
docker compose up -d
```

Lần khởi động đầu phải tải lõi máy chủ và sinh thế giới, **vài phút đến hơn mười phút đều bình thường**, đừng tưởng là kẹt chết:

```bash
docker compose logs -f
```

Thấy dòng tương tự `Done (xx.xxxs)! For help, type "help"` là đã lên. `Ctrl+C` chỉ thoát theo dõi nhật ký, **không dừng máy chủ**.

Vào console thực thi lệnh (image có sẵn `rcon-cli`, sẽ tự đăng nhập bằng `RCON_PASSWORD`):

```bash
docker compose exec -it mcsog-java rcon-cli
docker compose exec -it mcsog-java rcon-cli list
docker compose exec -it mcsog-java rcon-cli save-all
```

Cần console tương tác thật (gõ liên tục được, thấy hiển thị thời gian thực) thì dùng `attach`:

```bash
docker attach mcsog-java
```

:::warn Hai cái bẫy phím khi dùng attach
Trong `docker attach`, bấm `Ctrl+C` sẽ gửi tín hiệu ngắt tới tiến trình máy chủ, **tức là tắt máy chủ thẳng** (bản lưu có thể hỏng). Cách thoát đúng là `Ctrl+P` rồi `Ctrl+Q` (detach, container tiếp tục chạy). Thực thi một lệnh lẻ hằng ngày thì ưu tiên dùng `rcon-cli`.
:::

Dừng và xóa:

```bash
docker compose stop
docker compose down
```

| Lệnh | Đã làm gì | Dữ liệu trong volume |
| --- | --- | --- |
| `docker compose stop` | Dừng container, container vẫn còn | Giữ lại |
| `docker compose start` | Khởi động container đã dừng | Giữ lại |
| `docker compose down` | Dừng và **xóa container cùng mạng** | Giữ lại |
| `docker compose down -v` | Tất cả trên **cộng thêm xóa volume** | **Mất hết** |

:::danger Đừng tiện tay thêm `-v`
`docker compose down -v` sẽ xóa volume `/data`, tức là bản lưu, plugin, cấu hình mất cùng nhau. Chỉ dùng khi bạn xác nhận muốn "làm lại từ đầu" và đã có bản sao lưu dùng được.
:::

## 7. Các biến môi trường dùng trong ví dụ bài này

Bảng dưới liệt kê các biến dùng trong tệp compose trên, cùng vài mục bổ sung thường dùng nhất. **Giá trị mặc định thay đổi theo phiên bản image, nhất định lấy tài liệu chính thức của image làm chuẩn.**

| Biến | Tác dụng | Giá trị ví dụ |
| --- | --- | --- |
| `EULA` | Khai báo đã đồng ý Minecraft EULA, không đặt sẽ khởi động thất bại | `"TRUE"` |
| `TYPE` | Loại lõi máy chủ | `"PAPER"`, `"VANILLA"`, `"FABRIC"`, `"NEOFORGE"` |
| `VERSION` | Phiên bản Minecraft, phải là phiên bản lõi đó hỗ trợ | `"1.21.11"`, `"LATEST"` |
| `MEMORY` | Bộ nhớ heap JVM cấp cho máy chủ | `"4G"` |
| `ONLINE_MODE` | Có xác thực tài khoản chính hãng không (tương ứng `online-mode`) | `"TRUE"` / `"FALSE"` |
| `ENABLE_RCON` | Có bật console từ xa RCON không | `"true"` |
| `RCON_PASSWORD` | Mật khẩu RCON, **bắt buộc tự đổi thành mật khẩu mạnh** | Chuỗi ngẫu nhiên dài |
| `RCON_PORT` | Cổng lắng nghe RCON (mặc định 25575, **đừng ánh xạ ra internet**) | `"25575"` |
| `TZ` | Múi giờ container, ảnh hưởng thời gian nhật ký | `"Asia/Shanghai"` |
| `DIFFICULTY` | Độ khó game | `"normal"` |
| `MOTD` | Mô tả hiển thị trong danh sách máy chủ | `"MCSOG Java"` |
| `MAX_PLAYERS` | Số người chơi tối đa | `"20"` |
| `OPS` | Tên người chơi được cấp thẳng quyền quản trị, phân cách bằng dấu phẩy | `"Alice,Bob"` |
| `WHITELIST` | Tên người chơi trong danh sách trắng, phân cách bằng dấu phẩy | `"Alice,Bob"` |
| `ENFORCE_WHITELIST` | Có bắt buộc danh sách trắng không | `"TRUE"` |
| `PUID` / `PGID` | Chạy với danh tính người dùng/nhóm chỉ định (dùng cho vấn đề chủ sở hữu của bind mount, **cách dùng lấy tài liệu image làm chuẩn**) | `"1000"` |

:::note RCON là "quyền quản trị không có giao diện"
`ENABLE_RCON: "true"` chỉ lắng nghe `25575` bên trong container. **Đừng ánh xạ `25575` ra internet**: giao thức RCON không mã hóa, một mật khẩu là bằng cả console. Cần quản lý từ xa thì đi qua tunnel SSH hoặc panel, xem [Cơ bản an toàn mạng](/tutorials/ops/network-security).
:::

## 8. Trong `/data` có gì

Container là "dùng một lần", volume thì không. Những thứ dưới đây đều nằm trong `/data`:

| Đường dẫn | Nội dung |
| --- | --- |
| `/data/world/` | Bản lưu thế giới chính (Nether, End mỗi cái có thư mục riêng) |
| `/data/plugins/` | Jar plugin và cấu hình của chúng |
| `/data/mods/` | Mod (dùng khi `TYPE` là lõi mod) |
| `/data/server.properties` | Cấu hình máy chủ (cổng, độ khó, `online-mode`…) |
| `/data/eula.txt` | Tuyên bố EULA, do biến `EULA` ghi vào |
| `/data/logs/` | Nhật ký máy chủ |

Vậy nên: **container xóa được tùy thích, volume thì không.** Muốn xác nhận volume ở đâu:

```bash
docker volume ls
docker volume inspect mcsog-java-data
```

## 9. Sao lưu và khôi phục

Đối tượng sao lưu là `/data`, không phải container. Cách chắc nhất là **tắt máy chủ rồi mới đóng gói**:

```bash
mkdir -p backups
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/mcsog-java-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker compose start
```

Trên Windows PowerShell đổi đường dẫn mount thành `-v "${PWD}\backups:/backup"` (Docker Desktop).

Khi bắt buộc phải giữ trực tuyến, không tắt máy chủ được, dùng lệnh console để bảo đảm nhất quán:

```bash
docker compose exec -it mcsog-java rcon-cli save-all
docker compose exec -it mcsog-java rcon-cli save-off
```

`save-all` ghi dữ liệu trong bộ nhớ xuống đĩa, `save-off` tắt lưu tự động, như vậy trong lúc đóng gói sẽ không có ghi mới. Đóng gói xong thì bật lại:

```bash
docker compose exec -it mcsog-java rcon-cli save-on
```

Khi khôi phục thì **dừng container trước**, làm trống volume rồi giải nén (bước này sẽ ghi đè nội dung hiện có trong volume):

```bash
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-java-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn Container không phải bản sao lưu
Chạy máy chủ trong container **không có nghĩa là** dữ liệu đã an toàn. Volume và container nằm trên cùng một ổ đĩa, xóa nhầm volume, ổ đĩa hỏng, ransomware mã hóa đều mang đi cùng. Giữ ít nhất một bản **offline hoặc ngoài trạm**, cách làm xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài trạm](/tutorials/ops/offsite-backup). **Bản sao lưu chưa kiểm chứng khôi phục không tính là sao lưu.**
:::

## 10. Cập nhật image, đổi lõi và phiên bản

Nâng cấp image (ví dụ sửa bug hoặc theo phiên bản mới):

```bash
docker compose pull
docker compose up -d
```

Thứ tự rất quan trọng: **sao lưu trước, rồi pull, rồi up**. `docker compose up -d` khi phát hiện image hoặc cấu hình thay đổi sẽ tạo lại container, nhưng volume được mount lại nguyên vẹn, nên bản lưu không mất —— với điều kiện bạn không xóa volume.

Đổi loại lõi hoặc phiên bản, chỉ đổi biến môi trường, rồi `up -d` lại:

```yaml
    environment:
      TYPE: "FABRIC"
      VERSION: "1.21.11"
```

| Thay đổi | Sẽ xảy ra gì | Điểm cần chú ý |
| --- | --- | --- |
| Chỉ đổi `VERSION` | Image tải lõi phiên bản mới | **Nâng định dạng bản lưu là một chiều**, bản lưu mới thường không mở được bằng bản cũ; nâng cấp trước bắt buộc phải sao lưu |
| Đổi `TYPE` (giữa các lõi plugin) | Đổi một jar lõi, `plugins/` tiếp tục dùng | Plugin và lõi/phiên bản phải tương thích |
| Đổi `TYPE` (từ lõi plugin sang lõi mod) | Máy chủ bắt đầu đọc `mods/` | `plugins/` vốn có sẽ không có hiệu lực, thế giới cũng có thể cần xử lý tương thích thêm |
| Đổi `MEMORY` | Tạo lại container, cấp lại bộ nhớ heap | Đừng vượt tỉ lệ hợp lý của bộ nhớ khả dụng trên máy host |

## 11. Thêm plugin và mod

Ba cách, chọn một theo thói quen của bạn.

**Cách A: bind mount (sửa tệp tiện nhất)**

Đổi `volumes` thành thư mục trên máy host:

```yaml
    volumes:
      - ./data:/data
```

Sau đó thao tác trực tiếp trên máy host với `./data/plugins/`, `./data/server.properties`. Trên Linux chú ý vấn đề chủ sở hữu (xem mục 11).

**Cách B: chép tệp vào volume (giữ named volume)**

```bash
docker cp ./MyPlugin.jar mcsog-java:/data/plugins/
docker compose restart
```

**Cách C: giao cho image tự tải**

Image còn cung cấp biến tự pull plugin/mod theo nguồn (ví dụ cài plugin theo số tài nguyên Spiget, cài mod theo dự án Modrinth). Tên và giá trị của các biến này **lấy tài liệu chính thức của image làm chuẩn**, trước khi dùng hãy đối chiếu.

Sửa cấu hình xong, phần lớn plugin hỗ trợ nạp lại trong game, nhưng **khởi động lại là chắc nhất**:

```bash
docker compose restart
```

## 12. Các bẫy thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| Khởi động xong thoát ngay, nhật ký nhắc EULA | Chưa đặt `EULA: "TRUE"` | Bổ sung biến và `docker compose up -d` |
| Container bị hệ thống giết, nhật ký hiện OOM | `MEMORY` đặt nhiều hơn máy host có thể cấp | Giảm `MEMORY`, hoặc thêm bộ nhớ; máy host cũng phải chừa dư |
| Internet không kết nối được, trong container mọi thứ bình thường | Chưa ánh xạ cổng, hoặc nhóm bảo mật chưa mở | `ports` viết `25565/tcp`; **nhóm bảo mật cloud** mở. Chú ý: **tường lửa hệ thống (ufw/firewalld) không có hiệu lực với cổng container**, chi tiết xem §5.1 |
| Trong container không ghi được `/data`, nhật ký báo lỗi quyền | Chủ sở hữu của bind mount trên Linux không khớp người dùng trong container | Sửa chủ sở hữu thư mục trên máy host, hoặc dùng biến ánh xạ người dùng image cung cấp (`PUID`/`PGID`, **lấy tài liệu image làm chuẩn**) |
| Sau khi tạo lại container bản lưu "biến mất" | Đã xóa volume (như `down -v`), hoặc quên mount `/data` | Dừng tay ngay, khôi phục từ bản sao lưu; sau này cố định tên volume và đưa vào quy trình sao lưu |
| Console không gõ được | Thiếu `stdin_open: true` và `tty: true` | Bổ sung và tạo lại container |
| `docker compose` báo không phải lệnh | Đang cài `docker-compose` bản cũ (v1) | Cài plugin Compose v2 theo tài liệu chính thức, lệnh là `docker compose` |
| Sửa cấu hình xong không có hiệu lực | Chỉ sửa tệp mà không tạo lại container | `docker compose up -d` để cấu hình có hiệu lực |

Kiểm tra hằng ngày (trạng thái container, mức chiếm tài nguyên, dung lượng đĩa còn) khuyến nghị làm cùng [Giám sát và cảnh báo](/tutorials/ops/monitoring).

## 13. Bước tiếp theo

- Tìm hiểu từ đầu thư mục và tệp của máy chủ: [Cấu trúc máy chủ](/tutorials/java/structure)
- Quy trình đầy đủ lần đầu mở máy chủ: [Khởi động máy chủ](/tutorials/java/start)
- Chiến lược sao lưu bản lưu, plugin và cấu hình: [Sao lưu và khôi phục](/tutorials/java/backup)
- Tìm lag và tinh chỉnh tham số: [Tối ưu hiệu năng](/tutorials/java/optimize)
- Dùng panel quản lý thống nhất nhiều máy chủ: [Cách dùng và an toàn của công cụ quản lý panel](/tutorials/ops/panels)

---

> Tên image, biến môi trường và cổng mặc định lấy tài liệu chính thức của image làm chuẩn.
