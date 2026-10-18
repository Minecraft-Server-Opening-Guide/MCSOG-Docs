---
title: Triển khai máy chủ Bedrock Edition bằng Docker
slug: docker
cat: bedrock
level: 3
order: 7
minutes: 16
tags: [Docker, compose, Bedrock Edition, BDS, udp, triển khai, sao lưu]
updated: 2026-10-04
draft: false
---

Máy chủ chính thức của Bedrock Edition là **BDS**, nó không có hệ thống plugin, cấu trúc thư mục đơn giản, rất phù hợp để đưa vào container: image chịu trách nhiệm tải BDS chính thức, chấp nhận EULA, ánh xạ cổng, bạn chỉ cần duy trì một volume và một `docker-compose.yml`.

Bài này nói về **chạy BDS trong container**. Cấu trúc thư mục, đặc tính bộ nhớ và những cái bẫy đã biết của bản thân BDS, xem [Máy chủ BDS](/tutorials/bedrock/bds).

:::warn Trước hết nhớ một việc: Bedrock Edition dùng UDP
Java Edition đi **TCP 25565**, Bedrock Edition đi **UDP 19132** (IPv6 là `19133/udp`). **Chỉ mở hoặc chỉ ánh xạ TCP thì biểu hiện là "máy chủ rõ ràng đang chạy mà không ai kết nối được", và sẽ không có bất kỳ báo lỗi nào.** Đây là cái bẫy phổ biến nhất khi mở máy chủ Bedrock Edition, bài này sẽ nhắc đi nhắc lại.
:::

## 1. Vì sao phải container hóa

| Lợi ích | Biểu hiện cụ thể |
| --- | --- |
| **Môi trường sạch** | BDS chính thức là chương trình nhị phân, container đóng gói nó cùng thư viện chạy, máy chủ vật lý không cần cài phụ thuộc nào |
| **Có thể tái lập** | Phiên bản, cổng, chế độ chơi, độ khó, tên thế giới đều ghi trong một tệp, đổi máy chỉ việc bê sang |
| **Dễ quay lui** | Sao lưu `/data` trước khi nâng cấp, có vấn đề thì đổi `VERSION` về cũ rồi khởi động lại |
| **Xóa sạch** | Không cần nữa thì xóa container và volume, máy chủ vật lý không để lại tệp rác |
| **Đa nền tảng nhất quán** | BDS chính thức chỉ cung cấp bản Windows và Linux; chạy BDS bản Linux bằng container trên Windows thì cách thao tác hoàn toàn giống trên máy chủ |

Cái giá cũng tồn tại:

| Cái giá | Mô tả |
| --- | --- |
| **Thêm một lớp phải học** | Khái niệm image, container, volume, Compose không tránh được, gỡ lỗi bắt đầu từ `docker compose logs` |
| **Kỷ luật volume và sao lưu** | Bản lưu thế giới nằm trong volume, không chủ động sao lưu thì coi như không có sao lưu |
| **Chi phí hiệu năng nhỏ nhưng không bằng không** | Mạng thêm một lớp NAT, hệ thống tệp thêm một lớp overlay; điểm nghẽn thật thường là **mô phỏng thế giới đơn luồng của BDS**, nên hạn mức CPU nhất định phải đủ |
| **Không có hệ sinh thái plugin** | Bản thân BDS không hỗ trợ plugin, container cũng không đổi được điều đó; nội dung bổ sung chỉ có thể đưa vào thư mục dữ liệu dưới dạng gói hành vi/gói tài nguyên |

## 2. Cài Docker và plugin Compose

Cài theo tài liệu chính thức, đừng dùng script cài đặt không rõ nguồn gốc:

| Nền tảng | Cổng vào chính thức |
| --- | --- |
| Linux (theo bản phân phối) | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Plugin Compose của Linux | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::note Hai con đường trên Windows
Windows có thể tải gói nén chính thức và chạy thẳng tệp exe bên trong (trang tải xem [Trang tải BDS chính thức của Minecraft](https://www.minecraft.net/en-us/download/server/bedrock)), cũng có thể dùng phương án container của bài này. Lợi ích của phương án container là **hoàn toàn giống thao tác trên máy chủ Linux**, sau này di chuyển không phải học lại.
:::

## 3. Image: `itzg/minecraft-bedrock-server`

Image Bedrock Edition thường dùng trong cộng đồng là **`itzg/minecraft-bedrock-server`** (bảo trì tích cực, cùng hệ sinh thái tác giả với image Java Edition).

```bash
docker pull itzg/minecraft-bedrock-server
```

:::note Quan hệ của nó với gói tải chính thức
[Trang tải BDS](https://www.minecraft.net/en-us/download/server/bedrock) chính thức cung cấp gói nén, bạn phải tự giải nén, sửa cấu hình, khởi động. **Việc image cộng đồng làm là: khi container khởi động thì tải BDS chính thức thay bạn, và ghi biến môi trường vào các cấu hình như `server.properties`.**

Vì vậy: **cơ chế cụ thể mà image tải BDS (địa chỉ tải, phân giải phiên bản, cách cache) lấy theo tài liệu chính thức của image**, các phiên bản image khác nhau có thể khác. Muốn tự kiểm soát hoàn toàn thì dùng gói nén chính thức và triển khai thủ công theo [Máy chủ BDS](/tutorials/bedrock/bds).
:::

## 4. Một tệp `docker-compose.yml` đầy đủ

```yaml
services:
  bedrock:
    image: itzg/minecraft-bedrock-server
    container_name: mcsog-bedrock
    ports:
      - "19132:19132/udp"
      - "19133:19133/udp"
    environment:
      EULA: "TRUE"
      SERVER_NAME: "MCSOG Bedrock"
      GAMEMODE: "survival"
      DIFFICULTY: "normal"
      LEVEL_NAME: "MCSOG"
      ONLINE_MODE: "TRUE"
      TZ: "Asia/Shanghai"
    volumes:
      - mcsog-bedrock-data:/data
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  mcsog-bedrock-data:
    name: mcsog-bedrock-data
```

Compose v2 **không cần** trường `version:` ở cấp cao nhất.

| Trường | Tác dụng |
| --- | --- |
| `image` | Image sử dụng; môi trường sản xuất nên ghim tag, đừng mãi dùng `latest` |
| `container_name` | Tên container cố định, tiện cho `logs` / `attach` |
| `ports` | **`/udp` bắt buộc phải ghi**. `19132` là cổng chính IPv4, `19133` là cổng IPv6 (không có client IPv6 thì có thể không ánh xạ, nhưng ánh xạ cũng không có tác dụng phụ) |

:::warn Docker sẽ đi vòng qua tường lửa của hệ thống (Bedrock Edition cũng vậy)
Quy tắc của `ufw` và `firewalld` **không có hiệu lực với cổng mà container Docker ánh xạ ra**: Docker chèn quy tắc `iptables` của mình trước tường lửa hệ thống, nên `ufw deny 19132/udp` cũng không chặn được truy cập từ ngoài.

Bedrock Edition đi **UDP**, càng dễ bị bỏ qua, nhất định phải siết theo cách dưới đây:

1. **Chỉ bind cổng vào loopback** (khuyến nghị): `-p 127.0.0.1:19132:19132/udp`, rồi để máy chủ vật lý làm reverse proxy ra ngoài;
2. **Dùng chain `DOCKER-USER`** để giới hạn nguồn;
3. Dùng **nhóm bảo mật** của nhà cung cấp cloud làm lớp chặn cuối (lớp này không bị Docker ảnh hưởng).

Ngoài ra, nếu muốn máy chủ xuất hiện trong **danh sách mạng LAN** (Bedrock Edition phát hiện qua broadcast UDP), chế độ `bridge` không làm được, cần chế độ mạng `macvlan` hoặc `host`.

Giải thích đầy đủ (gồm xung đột dải mạng, so sánh chế độ mạng, bảng kiểm tra) xem [Triển khai Java Edition bằng Docker → Mạng và tường lửa](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节).
:::
| `environment` | Cấu hình mà image đọc, xem mục 6 |
| `volumes` | `卷名:/data`. **Thế giới, cấu hình, gói phụ trợ đều nằm trong `/data`** |
| `stdin_open: true` | Mở đầu vào chuẩn, nếu không sẽ không thể **nhập lệnh** vào console BDS |
| `tty: true` | Cấp pseudo-terminal, kết hợp `docker attach` để có console tương tác |
| `restart: unless-stopped` | Tự kéo lên sau khi sụp hoặc máy chủ khởi động lại; sau khi `docker compose stop` thủ công thì không tự kéo lên |

Ghi rõ `name:` trong `volumes` là để tên volume **có thể dự đoán** (nếu không Compose sẽ thêm tiền tố tên dự án), lệnh sao lưu mới không chỉ nhầm volume.

:::note `EULA=TRUE` là yêu cầu pháp lý
`EULA: "TRUE"` nghĩa là **bạn đã đọc và đồng ý [Thỏa thuận cấp phép người dùng cuối của Minecraft](https://aka.ms/MinecraftEULA)**. Không đặt biến này, BDS sẽ thoát ngay sau khi khởi động, container sẽ rơi vào vòng lặp khởi động lại.
:::

:::tip Trước khi khởi động hãy "khám sức khỏe" một lần
Mỗi lần sửa xong tệp compose hãy chạy `docker compose config` trước: cổng, volume, biến môi trường sẽ được mở ra in ra, chỗ viết sai sẽ báo lỗi ngay tại chỗ. **Đặc biệt là `/udp`, thiếu ở đây là nhìn ra được.**
:::

```bash
docker compose config
```

## 5. Khởi động, xem nhật ký, vào console, dừng

```bash
docker compose up -d
```

Lần khởi động đầu phải tải BDS, kiên nhẫn chờ:

```bash
docker compose logs -f
```

Thấy nhật ký kiểu `[INFO] Server started.` là đã lên. `Ctrl+C` chỉ thoát việc theo dõi nhật ký, không dừng máy chủ.

Bedrock Edition **không có RCON**, nên không có `rcon-cli` để dùng, vào console chỉ có thể dùng `attach`:

```bash
docker attach mcsog-bedrock
```

Sau khi attach là có thể nhập lệnh BDS như trong cửa sổ cục bộ, ví dụ:

```text
list
say hello
save hold
save resume
stop
```

:::warn Cái bẫy phím của attach
Trong `docker attach`, nhấn `Ctrl+C` sẽ gửi tín hiệu ngắt đến BDS, **tức là tắt máy chủ luôn** (bản lưu có thể hỏng). Cách thoát đúng là `Ctrl+P` rồi `Ctrl+Q` (detach, container tiếp tục chạy). Khi thật sự cần tắt máy chủ, hãy nhập lệnh `stop` và chờ tiến trình thoát.
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
| `docker compose down` | Dừng và xóa container cùng mạng | Giữ lại |
| `docker compose down -v` | Tất cả ở trên **cộng thêm xóa volume** | **Mất toàn bộ** |

:::danger Đừng tiện tay thêm `-v`
`docker compose down -v` sẽ xóa volume `/data`, tức là bản lưu thế giới mất cùng. Chỉ dùng khi đã xác nhận muốn làm lại từ đầu và đã có bản sao lưu dùng được.
:::

## 6. Các biến môi trường dùng trong ví dụ bài này

| Biến | Tác dụng | Giá trị ví dụ |
| --- | --- | --- |
| `EULA` | Tuyên bố đã đồng ý Minecraft EULA, không đặt sẽ khởi động thất bại | `"TRUE"` |
| `SERVER_NAME` | Tên máy chủ (tương ứng `server-name`) | `"MCSOG Bedrock"` |
| `GAMEMODE` | Chế độ chơi mặc định | `"survival"` / `"creative"` |
| `DIFFICULTY` | Độ khó trò chơi | `"normal"` / `"peaceful"` |
| `LEVEL_NAME` | Tên thế giới (màn chơi), **đồng thời quyết định tên thư mục dưới `worlds/`** | `"MCSOG"` |
| `ONLINE_MODE` | Có xác minh tài khoản Xbox Live hay không | `"TRUE"` / `"FALSE"` |
| `TZ` | Múi giờ container, ảnh hưởng thời gian nhật ký | `"Asia/Shanghai"` |
| `VERSION` | Chỉ định phiên bản BDS; không ghi thường đi theo bản mới nhất | `"LATEST"` |
| `SERVER_PORT` | Cổng lắng nghe IPv4 (mặc định 19132) | `"19132"` |
| `SERVER_PORT_V6` | Cổng lắng nghe IPv6 (mặc định 19133) | `"19133"` |
| `MAX_PLAYERS` | Số người chơi tối đa | `"20"` |
| `VIEW_DISTANCE` | Khoảng cách nhìn | `"12"` |
| `LEVEL_SEED` | Seed thế giới | Số hoặc chuỗi |
| `ALLOW_LIST` | Có bật danh sách trắng hay không | `"true"` / `"false"` |

:::note Giá trị mặc định sẽ thay đổi
Giá trị mặc định trong ngoặc ở bảng trên tương ứng cấu hình mặc định thường thấy của BDS, **có thể được điều chỉnh sau khi image cập nhật phiên bản, nhất định lấy tài liệu chính thức của image làm chuẩn**. Nguyên tắc của môi trường sản xuất là: **mục quan trọng nhất loạt ghi rõ ra**, đừng dựa vào giá trị mặc định.
:::

:::warn Tên máy chủ không phải ASCII
`SERVER_NAME` hỗ trợ tiếng Trung, nhưng một số client cũ sẽ hiển thị thành ký tự lỗi. Khi người chơi phản ánh lỗi font, trước tiên đổi về tên thuần ASCII để kiểm tra. `LEVEL_NAME` cũng nên dùng ASCII: nó sẽ thành tên thư mục, ký tự đặc biệt mang lại phiền phức không cần thiết.
:::

## 7. Trong `/data` có gì

| Đường dẫn | Nội dung |
| --- | --- |
| `/data/worlds/<LEVEL_NAME>/` | **Bản lưu thế giới** (`db/`, `level.dat`, `level_name.txt` v.v.) |
| `/data/server.properties` | Cấu hình máy chủ (cổng, độ khó, chế độ, bật/tắt danh sách trắng v.v.) |
| `/data/allowlist.json` | Dữ liệu danh sách trắng |
| `/data/permissions.json` | Dữ liệu quản trị viên (OP) |
| `/data/valid_known_packs.json` | Danh sách gói phụ trợ đã biết |
| `/data/behavior_packs/`, `/data/resource_packs/` | Gói hành vi và gói tài nguyên (nơi chứa nội dung bổ sung) |

Bản lưu của BDS **toàn bộ nằm dưới `worlds/`**, mỗi thế giới một thư mục con. `LEVEL_NAME` ghi gì thì thư mục tên đó:

```text
/data/worlds/MCSOG/db/
```

:::warn Đổi `LEVEL_NAME` là đổi thế giới
`LEVEL_NAME` đổi thì BDS sẽ tìm thư mục tên mới; không tìm thấy là **sinh ra một thế giới trống hoàn toàn mới**, thế giới cũ trông như "biến mất" (thực ra vẫn còn trong volume). Trước khi đổi tên này hãy xác nhận tên thư mục bản lưu.
:::

## 8. Sao lưu và khôi phục

Đối tượng sao lưu là `/data`, trọng tâm là `/data/worlds/`. Cách ổn nhất là **dừng máy chủ rồi đóng gói**:

```bash
mkdir -p backups
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/mcsog-bedrock-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker compose start
```

Trên Windows PowerShell đổi đường dẫn gắn thành `-v "${PWD}\backups:/backup"` (Docker Desktop).

Khi không thể dừng máy chủ, BDS có lệnh nhất quán bản lưu riêng (cần nhập trong console `docker attach`):

```text
save hold
save query
```

`save hold` để máy chủ tạm dừng ghi và giữ tệp nhất quán, `save query` liệt kê các tệp hiện cần sao lưu. Sao chép xong thì khôi phục:

```text
save resume
```

:::note Vì sao Bedrock Edition không thể chép nguyên cách của Java Edition
Java Edition dùng `save-all` / `save-off` / `save-on`, BDS của Bedrock Edition dùng **`save hold` / `save query` / `save resume`**, hai bộ lệnh không dùng chung được. Sao lưu khi dừng máy chủ thì cả hai đều áp dụng, và cũng nhẹ nhàng nhất.
:::

Khi khôi phục thì dừng container trước, xóa trống volume rồi giải nén:

```bash
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-bedrock-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn Container không phải bản sao lưu
Volume và container nằm trên cùng một đĩa, xóa nhầm volume, đĩa hỏng, ransomware sẽ cuốn đi cùng. Ít nhất giữ một bản **ngoại tuyến hoặc khác vị trí**, xem [Sao lưu và khôi phục](/tutorials/java/backup) và [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup). **Bản sao lưu chưa từng kiểm chứng khôi phục thì không tính là sao lưu.**
:::

## 9. Cập nhật image và phiên bản BDS

```bash
docker compose pull
docker compose up -d
```

Thứ tự vẫn là: **sao lưu trước, rồi pull, rồi up**.

| Thay đổi | Sẽ xảy ra gì | Lưu ý |
| --- | --- | --- |
| `docker compose pull` | Kéo phiên bản mới của image | Kéo xong phải `up -d` mới tái tạo container và có hiệu lực |
| Đổi `VERSION` | Image tải lại BDS đúng phiên bản | Client và BDS cần khớp phiên bản; sao lưu bản lưu trước khi nâng cấp |
| Không ghi `VERSION` | Thường đi theo BDS mới nhất | Tiện, nhưng **không thể tái lập**; có vấn đề thì không xác định được là do đổi phiên bản hay đổi cấu hình |

:::note Lệch phiên bản là nguyên nhân "không kết nối được" phổ biến nhất
Khi client Bedrock Edition và BDS lệch phiên bản, người chơi thường **thấy được máy chủ nhưng không vào được**. Ghim `VERSION` giúp mỗi lần khởi động lại đều nhận cùng một phiên bản; muốn đi theo bản mới nhất thì chấp nhận việc "sau một lần khởi động lại nào đó phiên bản đã đổi", và thông báo trước cho người chơi.
:::

## 10. Nội dung bổ sung: BDS không có hệ thống plugin

BDS chỉ hỗ trợ **gói hành vi (behavior packs) và gói tài nguyên (resource packs)** chính thức, không có hệ thống plugin kiểu Bukkit, container cũng không đổi được điều này. Khi cần năng lực plugin thì phải đổi sang máy chủ bên thứ ba, xem [Máy chủ BDS](/tutorials/bedrock/bds) và [Phương án máy chủ bên thứ ba](/tutorials/bedrock/third-party).

Cách đặt nội dung bổ sung:

| Nội dung | Vị trí đặt |
| --- | --- |
| Gói hành vi | `/data/behavior_packs/` |
| Gói tài nguyên | `/data/resource_packs/` |
| Gói riêng của thế giới | Thư mục tương ứng dưới `/data/worlds/<LEVEL_NAME>/` |

**Cách A: gắn bind mount (sửa tệp tiện nhất)**

```yaml
    volumes:
      - ./data:/data
```

Sau đó thao tác trực tiếp trên máy chủ vật lý tại `./data/behavior_packs/`.

**Cách B: chép vào volume**

```bash
docker cp ./MyAddon.mcpack mcsog-bedrock:/data/
docker compose restart
```

Sau khi sửa cấu hình hoặc đổi gói, **khởi động lại container là ổn nhất**:

```bash
docker compose restart
```

## 11. Hiệu năng và bộ nhớ: hai điểm riêng của Bedrock Edition

### 11.1 Mô phỏng thế giới là đơn luồng, đừng bóp CPU quá chặt

Tính toán sinh vật và mô phỏng thế giới của BDS cơ bản là đơn luồng, **độ mượt phụ thuộc vào hiệu năng đơn nhân**, bản đồ càng lớn càng đuối. Bản thân container tốn rất ít, nhưng **đặt hạn mức CPU quá thấp cho container sẽ khiến máy chủ chết đói ngay**: biểu hiện là TPS tụt, người chơi giật, tải chunk chậm.

```yaml
    cpus: "2.0"
```

:::warn Đừng giới hạn CPU để "tiết kiệm tài nguyên"
Trừ khi bạn biết rõ máy này còn chạy gì và đã làm bài kiểm tra tải, nếu không **đừng đặt giới hạn CPU cho container BDS** (ví dụ `cpus: "0.5"`). Đặc tính đơn luồng của BDS quyết định nó rất nhạy với xung nhịp đơn nhân và "một nhân luôn sẵn sàng". Tinh chỉnh liên quan xem [Tối ưu hiệu năng](/tutorials/java/optimize).
:::

Về bộ nhớ:

```yaml
    mem_limit: "4g"
```

`mem_limit` là giới hạn cứng, **đặt thấp hơn nhu cầu thực tế thì container sẽ bị OOM giết** (biểu hiện là máy chủ khởi động lại không dấu hiệu). Không chắc thì trước tiên đừng đặt giới hạn, dùng `docker stats` quan sát mức chiếm thực rồi tính.

:::warn Đừng cưỡng chế dọn bộ nhớ
Mức chiếm bộ nhớ của BDS tăng chậm theo thời gian, **đừng dùng công cụ cưỡng chế dọn bộ nhớ**: sẽ khiến thanh tiến trình kẹt khi người chơi tải gói tài nguyên/gói phụ trợ. **Cách xử lý đúng là khởi động lại máy chủ**, điểm này thống nhất với giải thích ở [Máy chủ BDS](/tutorials/bedrock/bds).
:::

## 12. Xử lý sự cố

| Hiện tượng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| Container **khởi động lại vòng lặp** | Chưa đồng ý EULA, `LEVEL_NAME` chứa ký tự không hợp lệ, cổng bị chiếm, thiếu bộ nhớ, `VERSION` không hợp lệ | Trước tiên xem `docker compose logs --tail=200`, màn hình đầu của nhật ký thường chỉ thẳng nguyên nhân |
| Máy chủ đang chạy, nhưng **không ai kết nối được** | Chỉ ánh xạ/mở TCP; nhóm bảo mật chưa mở **UDP** | `ports` ghi `"19132:19132/udp"`, và mở UDP 19132 trong **nhóm bảo mật cloud**. Tường lửa hệ thống không có hiệu lực với container, xem cảnh báo phía trên |
| Mạng LAN kết nối được, mạng công cộng không | Vấn đề ánh xạ cổng/nhóm bảo mật | Xem [Triển khai đến môi trường truy cập được](/tutorials/java/deploy) và [Router và tường lửa](/tutorials/ops/router-firewall) |
| Thế giới "biến mất", sinh ra bản đồ mới | Đã đổi `LEVEL_NAME`, hoặc gắn nhầm volume | Đổi `LEVEL_NAME` về tên cũ; xác nhận đang gắn đúng một volume |
| Người chơi thấy máy chủ nhưng không vào được | Client và BDS lệch phiên bản, hoặc bị danh sách trắng/xác minh trực tuyến chặn | Ghim `VERSION`, kiểm tra `ALLOW_LIST` và `ONLINE_MODE` |
| Container không ghi được `/data` (bind mount trên Linux) | Chủ sở hữu thư mục trên máy chủ vật lý khác người dùng trong container | Sửa chủ sở hữu thư mục; nếu cần thì dùng cách ánh xạ người dùng mà tài liệu image đưa ra |
| Máy chủ tự khởi động lại không rõ lý do | Giới hạn cứng bộ nhớ quá thấp gây OOM | Tăng hoặc bỏ `mem_limit`, quan sát bằng `docker stats` |
| Console không gõ được chữ | Thiếu `stdin_open: true` và `tty: true` | Bổ sung rồi tái tạo container |

Việc kiểm tra định kỳ hằng ngày (trạng thái container, mức chiếm CPU/bộ nhớ, dung lượng đĩa còn lại) nên làm cùng [Giám sát và cảnh báo](/tutorials/ops/monitoring).

## 13. Bước tiếp theo

- Cấu trúc thư mục và các cái bẫy đã biết của BDS: [Máy chủ BDS](/tutorials/bedrock/bds)
- Tải và giải thích BDS chính thức: [Trang tải BDS chính thức của Minecraft](https://www.minecraft.net/en-us/download/server/bedrock)
- Chọn lõi của Bedrock Edition: [Các loại máy chủ](/tutorials/bedrock/type)
- Cách sao lưu bản lưu phổ biến: [Sao lưu và khôi phục](/tutorials/java/backup)
- Quản lý thống nhất nhiều máy chủ: [Cách dùng và an toàn của công cụ quản lý bảng điều khiển](/tutorials/ops/panels)

---

> Tên image, biến môi trường và cổng mặc định lấy theo tài liệu chính thức của image.
