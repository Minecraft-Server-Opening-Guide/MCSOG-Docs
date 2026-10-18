---
title: Chứng chỉ HTTPS và tự động gia hạn
slug: https
cat: ops
level: 3
order: 25
minutes: 16
tags: [https, tls, chứng chỉ, reverse proxy, nginx, certbot, tự động gia hạn, vận hành]
updated: 2026-10-04
draft: false
---

Bảng điều khiển không mở được, trình duyệt báo "kết nối của bạn không phải kết nối riêng tư", bản đồ web trắng trơn —— trong những sự cố kiểu này, **khá nhiều trường hợp chỉ có một nguyên nhân gốc: chứng chỉ đã hết hạn.** Đây vốn là sự cố hoàn toàn tránh được, vì nó có thời điểm hết hạn rõ ràng, và có thể gia hạn tự động.

Bài này nói rõ ba việc: **TLS rốt cuộc bảo vệ cái gì (và không bảo vệ cái gì)**, **chứng chỉ và khóa riêng tư lần lượt là gì**, **làm sao để việc gia hạn không bao giờ cần bạn phải nhớ**. Cấu hình an toàn của bản thân bảng điều khiển xem [Sử dụng và bảo mật công cụ quản lý bảng điều khiển](/tutorials/ops/panels), cảnh báo chứng chỉ hết hạn xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).
:::warn Cấu hình trong bài này lấy tài liệu chính thức làm chuẩn
**Tên gói, tham số lệnh, khóa cấu hình, đường dẫn mặc định và cấu trúc thư mục xuất hiện dưới đây đều thay đổi theo bản phân phối, cách cài đặt và phiên bản phần mềm**. Ví dụ ở đây có tác dụng nói rõ "nên cấu hình cái gì", **không phải sản phẩm chép nguyên được**. Trước khi áp dụng hãy đối chiếu tài liệu chính thức của certbot, Let's Encrypt, nginx và bản phân phối bạn dùng, cùng các tệp thực tế được tạo trên hệ thống của bạn.
:::

## 1. Trước hết phân định phạm vi: lưu lượng trò chơi không phải HTTPS

Đây là điểm dễ nhầm nhất, và cũng bị hiểu sai nhiều nhất:

| Lưu lượng | Giao thức | Cổng mặc định | Có cần chứng chỉ TLS không |
| --- | --- | --- | --- |
| Lưu lượng game bản Java | Giao thức TCP riêng của Minecraft | 25565 | **Không cần, chứng chỉ không có tác dụng gì với nó** |
| Lưu lượng game bản Bedrock | UDP (RakNet) | 19132 | **Không cần** |
| Trang web bảng điều khiển | HTTPS | 443 (hoặc cổng bạn chọn) | **Cần** |
| Bản đồ web (Dynmap, Squaremap, BlueMap, v.v.) | HTTPS | 443 | **Cần** |
| Website, trang trạng thái, plugin Web của MCDR, các loại API | HTTPS | 443 | **Cần** |
| RCON | Giao thức TCP riêng của nó | 25575 | Không phải TLS; **đừng để lộ ra Internet** |

**Kết luận: chứng chỉ HTTPS là để dùng cho "phía Web".** Có cài chứng chỉ hay không **không có bất kỳ quan hệ nào** với việc người chơi có vào được máy chủ hay có bị tấn công xen giữa hay không.

### 1.1 Vậy phần mã hóa lúc đăng nhập bản Java là gì

Bản Java ở giai đoạn đăng nhập đúng là có mã hóa, nhưng đó là **cơ chế riêng của giao thức Minecraft**, do giao thức trò chơi quy định, **không liên quan đến chứng chỉ X.509 hay Let's Encrypt**. Coi chứng chỉ HTTPS và "mã hóa lưu lượng trò chơi" là một chuyện chính là khởi điểm khiến rất nhiều hướng cấu hình đi lệch.

### 1.2 Vì sao phía Web vẫn bắt buộc phải có TLS

Vì phía Web truyền **thông tin xác thực và thân phận**: mật khẩu đăng nhập bảng điều khiển, Cookie phiên, API Key và Token, **dưới HTTP không mã hóa thì người cùng mạng có thể thấy trực tiếp**. Ngoài ra trình duyệt hiện đại sẽ đánh dấu trang HTTP là "không an toàn", mà người dùng bảng điều khiển một khi đã quen bỏ qua cảnh báo thì chính thói quen đó là vấn đề an ninh. Bảng điều khiển một khi mở ra Internet sẽ bị quét liên tục, xem [Các kiểu tấn công mạng thường gặp và phòng thủ chuyên biệt cho Minecraft](/tutorials/ops/attack-defense).

## 2. Chứng chỉ và khóa riêng tư

### 2.1 Chúng lần lượt là gì

| | Chứng chỉ (certificate) | Khóa riêng tư (private key) |
| --- | --- | --- |
| Bản chất | Khóa công khai + thông tin thân phận + chữ ký của CA | Một đoạn vật liệu khóa phải giữ bí mật |
| Có thể công khai | **Được**, vốn dĩ nó phải gửi cho mỗi người truy cập | **Tuyệt đối không** |
| Hậu quả khi lộ | Không có (vốn là thông tin công khai) | **Người có được khóa riêng tư có thể giả mạo trang của bạn** |
| Hết hạn | Có thời hạn, **phải gia hạn** | Thường được thay cùng chứng chỉ, bản thân nó không "hết hạn" |

**Chứng chỉ là chứng minh thư, khóa riêng tư là con dấu.** Chứng minh thư có thể cho người khác xem, con dấu mất là thảm họa.

### 2.2 Các tệp thường gặp và quan hệ giữa chúng

Lấy ví dụ đầu ra thường gặp của client ACME (**tên tệp cụ thể lấy client của bạn làm chuẩn**):

| Tệp | Nội dung | Dùng ở đâu |
| --- | --- | --- |
| `fullchain.pem` | Chứng chỉ của bạn + chứng chỉ trung gian | **`ssl_certificate` của máy chủ Web** |
| `privkey.pem` | Khóa riêng tư | **`ssl_certificate_key` của máy chủ Web** |
| `chain.pem` / `cert.pem` | Chứng chỉ trung gian / chỉ chứng chỉ của bạn | Thường không cần dùng riêng |

**Cái bẫy phổ biến nhất**: chỉ cấu hình `cert.pem` mà thiếu chứng chỉ trung gian, kết quả "có trình duyệt mở được, có trình duyệt không". **Dùng `fullchain.pem` thì không có vấn đề này.**

### 2.3 SNI: nhiều trang trên một IP

Client TLS hiện đại khi bắt tay sẽ gửi **SNI (Server Name Indication)**, máy chủ Web dựa vào đó để chọn chứng chỉ. Nên đặt nhiều trang trên một máy là khả thi, mỗi trang dùng chứng chỉ riêng; còn **khi kiểm tra chứng chỉ bằng dòng lệnh thì bắt buộc phải có tham số SNI** (`openssl s_client -servername ...`), nếu không bạn có thể đang nhìn một chứng chỉ khác và đi đến kết luận sai (xem mục 8).

## 3. Let's Encrypt, ACME và "bắt buộc gia hạn tự động"

### 3.1 ACME là gì

**ACME là một bộ giao thức tự động cấp và gia hạn chứng chỉ.** Let's Encrypt là tổ chức cấp chứng chỉ (CA) ACME được biết đến rộng rãi nhất, chứng chỉ xác thực tên miền (DV) do nó cấp là **miễn phí**. Mấu chốt nằm ở "tự động": mục tiêu thiết kế của ACME chính là để cả quy trình "xin, xác thực, cấp, gia hạn, triển khai" chạy không cần người trực. Ngoài ra cũng có các CA ACME khác (**có phù hợp với bạn hay không thì lấy tài liệu chính thức của từng bên làm chuẩn**).

### 3.2 90 ngày không phải vấn đề, gia hạn thủ công mới là

Chứng chỉ do Let's Encrypt cấp **có thời hạn 90 ngày** (lấy tài liệu chính thức làm chuẩn). Phản ứng đầu tiên của nhiều người là "ngắn quá, phiền quá" —— **chính phản ứng đó là vấn đề**:

- 90 ngày là **có chủ ý**: nó biến "quên gia hạn" từ "sự cố vài năm một lần" thành "trạng thái bình thường mà không tự động hóa thì không sống nổi".
- **Mọi phương án "gần hết hạn tôi vào gia hạn tay" đều sẽ thất bại**: một năm bốn lần, liên tục nhiều năm không sai sót, dựa vào con người là không làm được; đi công tác, đổi máy, email thông báo vào thư rác, bất kỳ việc nhỏ nào cũng khiến nó đột ngột hết hạn vào một ngày nào đó.
- Tâm thế đúng là: **biến "chứng chỉ có hết hạn không" từ "việc tôi phải nhớ" thành "việc hệ thống tự xử lý"**, rồi **giám sát nó** (xem mục 12).

### 3.3 Các client ACME thường gặp

certbot (tài liệu chính thức đầy đủ nhất, nhiều plugin), acme.sh (shell thuần, hỗ trợ DNS API rộng), lego (một tệp Go duy nhất), và các **máy chủ Web tích hợp sẵn ACME** như Caddy. Bài này lấy certbot làm ví dụ.

**Đừng dùng hai client cùng quản một bộ tên miền**: hai bộ tác vụ tự động sẽ ghi đè cấu hình của nhau, có sự cố bạn sẽ phải tra rất lâu.

## 4. Thực hành với certbot

### 4.1 Cài đặt: lấy hướng dẫn chính thức làm chuẩn

Cách cài certbot thay đổi rất nhiều theo bản phân phối và phiên bản, **hãy lấy hướng dẫn cài đặt chính thức làm chuẩn**. Có ba nguồn phổ biến: **kho của bản phân phối** (nhàn nhất, phiên bản thường cũ), **snap** (tài liệu chính thức hay khuyến nghị, phiên bản mới hơn), **pip / môi trường ảo** (linh hoạt, phải tự xử lý phụ thuộc). **Dùng plugin nginx thì còn cần gói plugin tương ứng** (tên thường gặp kiểu `python3-certbot-nginx`, tên gói cụ thể lấy bản phân phối của bạn làm chuẩn). Cài xong dùng `certbot --version` để xác nhận, và lưu ý **phiên bản khác nhau thì lệnh con và tham số có thể khác nhau**.

### 4.2 Ba cách cấp chứng chỉ và tình huống phù hợp của từng cách

| Lệnh | Làm gì | Phù hợp | Lưu ý |
| --- | --- | --- | --- |
| `certbot --nginx -d panel.example.com` | Plugin nginx: tự sửa cấu hình, tự cấu hình chuyển hướng | nginx đang chạy, cấu hình do bạn kiểm soát | **Nó sẽ sửa cấu hình nginx của bạn**, trước khi sửa hãy sao lưu hoặc đưa vào quản lý phiên bản |
| `certbot certonly --standalone -d panel.example.com` | Tự dựng dịch vụ tạm chiếm cổng 80 | Trên máy chưa có dịch vụ Web | **Bắt buộc phải dừng nginx**, nếu không cổng 80 bị chiếm sẽ thất bại |
| `certbot certonly --webroot -w /var/www/certbot -d panel.example.com` | Ghi tệp xác thực vào thư mục chỉ định, để nginx hiện có phục vụ | **Phổ biến nhất trong tình huống reverse proxy** | Cần cấu hình sẵn location cho `.well-known/acme-challenge/` trong nginx |

Với máy "nginx reverse proxy bảng điều khiển", **khuyến nghị dùng webroot hoặc plugin nginx**: cách trước thay đổi cấu hình ít nhất, cách sau nhàn nhất. **standalone chỉ phù hợp khi chưa có dịch vụ Web, hoặc bạn sẵn sàng dừng dịch vụ một lúc.** Khi cấp chứng chỉ sẽ yêu cầu một **email dùng để nhắc hết hạn** (có thể bỏ qua, nhưng **rất khuyến nghị điền**: đó là thứ duy nhất có thể báo trước cho bạn khi gia hạn tự động thất bại).

### 4.3 Kiểm thử gia hạn

**Bước này không thể bỏ.** Nó kiểm chứng "nếu 30 ngày sau việc gia hạn tự động thực sự chạy, liệu nó có thành công không":

```bash
# Diễn tập: không thực sự thay chứng chỉ, cũng không tiêu hạn mức cấp của môi trường chính thức (dùng môi trường thử)
sudo certbot renew --dry-run

# Xem các chứng chỉ đang quản lý, đường dẫn và thời điểm hết hạn
sudo certbot certificates
```

**`--dry-run` là cách kiểm chứng rẻ nhất. Gia hạn tự động mà chưa từng chạy nó thì coi như không có gia hạn tự động.**
:::warn Đừng tiện tay dùng --force-renewal
`--force-renewal` (và các tham số ép buộc tương tự) sẽ cấp lại ngay lập tức. **Cấp ép buộc thường xuyên có thể kích hoạt giới hạn tần suất của CA, khiến đúng lúc bạn thực sự cần thì lại không cấp được.** Khi xử lý sự cố hãy ưu tiên dùng `--dry-run`; khi thực sự cần ép buộc, trước hết hãy xác nhận nguyên nhân và quy tắc giới hạn (lấy tài liệu chính thức của CA làm chuẩn).
:::

### 4.4 Gia hạn tự động: systemd timer hay cron

**certbot thường có sẵn một tác vụ gia hạn tự động, bạn không cần tự viết thêm.** Có hai dạng phổ biến: **systemd timer** (như `certbot.timer`, phần lớn bản phân phối và cách cài bằng snap đi theo hướng này) và **tác vụ cron** (như `/etc/cron.d/certbot`, cách cài cũ hơn). Việc cần làm chỉ là **xác nhận nó tồn tại và đang chạy**:

```bash
# hướng systemd
systemctl list-timers | grep -i certbot

# hướng cron
ls -l /etc/cron.d/ | grep -i certbot
```

**Nếu bạn tự viết thêm một dòng cron nữa, kết quả là hai bộ tác vụ đánh nhau.** Hành vi mặc định của gia hạn tự động thường là **kiểm tra một đến hai lần mỗi ngày, chỉ thực sự gia hạn khi thời hạn còn lại ít hơn khoảng 30 ngày** (ngưỡng và lịch chính xác lấy client và tài liệu chính thức làm chuẩn) —— nên "nó chạy mỗi ngày" không bằng "nó cấp mỗi ngày".

### 4.5 Sau khi gia hạn phải để máy chủ Web nạp lại

Gia hạn chỉ thay tệp trên đĩa, **nginx đang chạy sẽ không tự đọc chứng chỉ mới** (nó chỉ đọc khi khởi động hoặc nạp lại). Nên phải cấu hình một hook triển khai:

```bash
# Cách một: ghi vào deploy hook của lệnh gia hạn (ví dụ)
sudo certbot renew --deploy-hook "systemctl reload nginx"

# Cách hai: đặt script vào thư mục hook, mọi lần gia hạn thành công đều sẽ thực thi
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Nhớ cấp quyền thực thi cho script hook. **Cách tốt nhất để kiểm chứng hook có thực sự có hiệu lực là chạy một lần `--dry-run` và quan sát xem nginx có được nạp lại không** (cách `--dry-run` xử lý hook có thể khác theo phiên bản, **lấy tài liệu chính thức làm chuẩn**).

## 5. Cấu hình TLS cho nginx

### 5.1 Ví dụ đầy đủ

Dưới đây là một cấu hình **có cấu trúc đầy đủ** trên máy "nginx reverse proxy bảng điều khiển" (tên miền, cổng và đường dẫn đều là placeholder):

```nginx
# /etc/nginx/conf.d/panel.conf
# Cổng <panel-port> là placeholder, hãy thay bằng cổng nội bộ mà bảng điều khiển thực sự lắng nghe.

server {
    listen 80;
    listen [::]:80;
    server_name panel.example.com;

    # Tệp xác thực chứng chỉ: giữ khớp với đường dẫn --webroot của certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Các yêu cầu còn lại đều chuyển hướng sang HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name panel.example.com;

    # Do client ACME của bạn cấp và gia hạn, hãy dùng đường dẫn thực tế
    # Lưu ý dùng liên kết tượng trưng trong thư mục live, chứ không phải tệp thật có số phiên bản trong archive
    ssl_certificate     /etc/letsencrypt/live/panel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.example.com/privkey.pem;

    # Chỉ cho phép TLS hiện đại; TLS 1.0/1.1 đã bị trình duyệt phổ biến ngừng hỗ trợ
    ssl_protocols TLSv1.2 TLSv1.3;
    # Để client quyết định bộ mã hóa (cách làm hiện đại được khuyến nghị; TLS 1.3 vốn không xem tùy chọn này)
    ssl_prefer_server_ciphers off;

    # Tái sử dụng phiên tùy chọn; có bật hay không và tham số lấy tài liệu chính thức của nginx làm chuẩn
    ssl_session_cache shared:SSL:10m;

    # HTTP/2: nginx 1.25.1 trở đi dùng chỉ thị riêng; phiên bản cũ hơn viết là listen 443 ssl http2;
    http2 on;

    location / {
        proxy_pass http://127.0.0.1:<panel-port>;

        # Console của bảng điều khiển phụ thuộc WebSocket, bắt buộc phải chuyển tiếp header Upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Bảng điều khiển dựa vào đó phán đoán "bên ngoài là HTTPS", từ đó tạo liên kết và Cookie bảo mật đúng
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Sửa xong nhất định phải kiểm tra cú pháp rồi mới nạp lại:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 Giải thích từng dòng (chỉ nói chỗ dễ sai)

| Cấu hình | Vì sao |
| --- | --- |
| `listen 443 ssl;` | **Không được thiếu tham số `ssl`**, nếu không nginx sẽ không bật TLS trên server này |
| `ssl_certificate` / `ssl_certificate_key` | Cái trước dùng `fullchain.pem`, cái sau dùng `privkey.pem`; đường dẫn **do client của bạn quyết định**, đừng chép nguyên |
| `ssl_protocols TLSv1.2 TLSv1.3;` | Đường đáy của trình duyệt hiện đại là TLS 1.2; viết rõ ra thì rõ ràng hơn là dựa vào giá trị mặc định |
| `ssl_prefer_server_ciphers off;` | Hiện đại khuyến nghị để client chọn; bộ mã hóa của TLS 1.3 vốn không chịu ảnh hưởng của tùy chọn này |
| location của `.well-known/acme-challenge/` | Điểm rơi của xác thực HTTP-01; khi dùng `--webroot` **bắt buộc** phải khớp đường dẫn của `-w` |
| `location / { return 301 ...; }` | Chuyển hướng HTTP sang HTTPS; lưu ý nó **đặt sau location của challenge** (nginx sẽ ưu tiên khớp tiền tố cụ thể hơn) |
| `X-Forwarded-Proto` | Thiếu nó, bảng điều khiển có thể tạo liên kết `http://`, hoặc từ chối đặt Cookie bảo mật |
| `http2 on;` | **Phụ thuộc phiên bản**: chỉ từ nginx 1.25.1 mới có chỉ thị riêng này |
:::tip Vì sao đường dẫn chứng chỉ dùng thư mục live
Client ACME thường đặt tệp thật của mỗi lần cấp vào thư mục kiểu `archive/` (có số thứ tự), rồi tạo **liên kết tượng trưng** trong `live/` trỏ đến bản mới nhất. **Trong cấu hình nên tham chiếu đường dẫn trong `live/`**: nó sẽ tự trỏ đến tệp mới sau khi gia hạn, còn tên tệp cụ thể trong `archive/` thì mỗi lần gia hạn đều đổi.
:::

### 5.3 Về bộ mã hóa và "giá trị mặc định thường là đủ"

Trong các cấu hình TLS nginx lan truyền trên mạng, thường có một đoạn `ssl_ciphers` dài. **Đa số trường hợp bạn không cần nó**:

- **Giá trị mặc định có sẵn của nginx trên các phiên bản hiện đại thường là an toàn**, và sẽ được cập nhật theo phiên bản.
- Chép tay một danh sách bộ mã hóa của vài năm trước, **có thể lại loại bỏ những bộ mới và tốt hơn**.
- Khi cần kiểm soát chi tiết, hãy tham khảo những nguồn được duy trì lâu dài như trình tạo cấu hình SSL của Mozilla, **chứ không phải một bài blog bất kỳ**.
:::note Tình trạng hiện nay của OCSP stapling
Trong quá khứ thường được khuyến nghị cấu hình `ssl_stapling on;` và `ssl_stapling_verify on;` (kèm `ssl_trusted_certificate`). **Nhưng Let's Encrypt đã tuyên bố dừng dịch vụ OCSP, chuyển sang CRL**, vì vậy cấu hình OCSP stapling cho chứng chỉ LE đã không còn ý nghĩa. **Thời điểm chính xác và tình trạng hiện nay lấy thông báo chính thức của Let's Encrypt làm chuẩn**, đừng chép nguyên các hướng dẫn cũ.
:::

## 6. Cách xác thực: HTTP-01 và DNS-01

ACME cần chứng minh "bạn kiểm soát tên miền này". Hai cách chính:

| | HTTP-01 | DNS-01 |
| --- | --- | --- |
| Chứng minh thế nào | Đặt một tệp có nội dung chỉ định tại `http://域名/.well-known/acme-challenge/<token>` | Thêm một bản ghi TXT có nội dung chỉ định tại `_acme-challenge.域名` |
| Yêu cầu mạng | **Cổng 80 phải truy cập được từ Internet** (có thể đi theo chuyển hướng) | Không cần bất kỳ cổng vào nào |
| Có cấp được wildcard không | **Không** | **Có** |
| Độ khó tự động hóa | Thấp (webroot / plugin nginx là đủ) | Cần thông tin xác thực API của nhà cung cấp DNS |
| Rủi ro chính | Cổng 80 bị tường lửa/nhóm bảo mật chặn, bị CDN chặn, chuyển hướng cấu hình sai | **Lộ thông tin xác thực API tức là lộ quyền kiểm soát tên miền** |

### 6.1 Nguyên nhân thất bại thường gặp của HTTP-01

**Nhóm bảo mật của cloud chưa mở cổng 80** (phổ biến nhất: tường lửa trên máy đã mở, nhóm bảo mật của nền tảng cloud chưa mở); **cổng 80 bị dịch vụ khác chiếm** (khi dùng `--standalone` mà nginx vẫn đang chạy); **chuyển hướng cuốn luôn cả yêu cầu xác thực đi** (location của challenge phải đứng trước chuyển hướng, hoặc quy tắc chuyển hướng cho đi qua `/.well-known/`); **phía trước có CDN / reverse proxy** (yêu cầu xác thực không đến được máy gốc, phải xử lý theo hướng dẫn của CDN).

### 6.2 Điểm cần chú ý của DNS-01

Tên bản ghi thường là `_acme-challenge` (**lấy tài liệu của nhà cung cấp DNS và client làm chuẩn**); **DNS có hiệu lực cần thời gian**, thêm bản ghi thủ công xong đừng bấm xác thực ngay; **thông tin xác thực API phải dùng quyền tối thiểu**, chỉ cấp cho vài bản ghi cần sửa, đừng dùng khóa toàn cục của tài khoản; khi thông tin xác thực lưu trên máy chủ thì **phải siết quyền**, cũng đừng commit vào Git.

### 6.3 Khi nào bắt buộc phải dùng DNS-01

- Cần cấp **chứng chỉ wildcard**.
- **Cổng 80 không thể mở ra ngoài** (bị nhà mạng chặn, ở sau CGNAT, mạng công ty hạn chế).
- Tên miền **không trỏ trực tiếp đến máy này** (CDN phía trước, cân bằng tải, nhiều máy gốc).
- Bạn muốn **việc cấp chứng chỉ hoàn toàn không phụ thuộc dịch vụ Web** (ví dụ cấp cho dịch vụ không phải HTTP).

## 7. Chứng chỉ wildcard

Chứng chỉ wildcard có thể phủ một cấp tên miền con, cái giá là **chỉ dùng được DNS-01**:

```bash
# Lưu ý: *.example.com không bao gồm bản thân example.com, thường phải viết cả hai
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

Điểm cần chú ý:

- **`*.example.com` không khớp `example.com`**, cũng không khớp `a.b.example.com` (wildcard chỉ phủ một cấp). Cần thì viết cả vào `-d`.
- Wildcard **tiện, nhưng cũng mở rộng bán kính vụ nổ**: khi khóa riêng tư lộ, mọi tên miền con cùng bị ảnh hưởng.
- Dùng `--manual` nghĩa là **việc gia hạn cũng cần người làm** —— trừ khi bạn đổi sang plugin tự động dùng DNS API. **Wildcard thủ công + quên gia hạn là một tổ hợp sự cố rất phổ biến.**
- Nếu số tên miền con không nhiều, **cấp từng cái (HTTP-01 gia hạn tự động) thường nhàn hơn một chứng chỉ wildcard**.

## 8. Điều gì xảy ra sau khi gia hạn thất bại

### 8.1 Triệu chứng

| Hiện tượng | Nguyên nhân |
| --- | --- |
| Trình duyệt chặn cả trang, báo chứng chỉ hết hạn/không an toàn | Chứng chỉ đã hết hạn |
| Không đăng nhập được bảng điều khiển, hoặc toàn bộ client API báo lỗi | Như trên; một số client không cho bạn tùy chọn "tiếp tục truy cập" |
| Bản đồ web không tải được | Tài nguyên tĩnh của bản đồ đi qua HTTPS |
| "Trước dùng được, một sáng nọ tự nhiên không được" | Hết hạn là **xảy ra tức thời**, không có chuyển dần |

### 8.2 Cách tra

```bash
# Xem chứng chỉ này do ai ký, khi nào hết hạn (bắt buộc có -servername, nếu không có thể thấy chứng chỉ của trang khác)
echo | openssl s_client -connect panel.example.com:443 -servername panel.example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# Muốn xem chuỗi đầy đủ (gồm chứng chỉ trung gian)
openssl s_client -connect panel.example.com:443 -servername panel.example.com -showcerts </dev/null
```

Trong đầu ra hãy chú ý hai ngày: **`notBefore` (có hiệu lực) và `notAfter` (hết hạn)**. Nếu `notAfter` đã là thời gian trong quá khứ thì đã xác nhận được vấn đề.

**Đồng thời phải xem thời điểm hết hạn của tệp cục bộ** (có thể bạn đang nhìn chứng chỉ trên CDN chứ không phải của máy gốc):

```bash
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -subject -dates
sudo certbot certificates
```
:::warn Chỉ khởi động lại dịch vụ là vô ích
Sau khi chứng chỉ hết hạn, **khởi động lại nginx không làm nó mới ra**. Thứ tự đúng là: **trước hết làm gia hạn thành công** (`sudo certbot renew`, và xử lý lỗi nó báo), **rồi mới nạp lại nginx**. Làm ngược lại chỉ mất thời gian.
:::

### 8.3 HSTS sẽ làm mọi thứ tệ hơn

Nếu bạn bật HSTS (header `Strict-Transport-Security`), trình duyệt sẽ **buộc dùng HTTPS trong một khoảng thời gian, và không cho người dùng bấm "tiếp tục truy cập"**, khi chứng chỉ hết hạn trang sẽ thành lỗi **hoàn toàn không thể lách qua**. Bản thân HSTS là thứ tốt (nó chống tấn công hạ cấp), nhưng phải nhớ cái giá của nó: **nó biến "chứng chỉ phải luôn còn hiệu lực" từ "nên" thành "bắt buộc cứng"**. Trước khi bật hãy xác nhận gia hạn tự động và giám sát đều đã vào guồng.

## 9. Tệp chứng chỉ và quyền

Khóa riêng tư là thứ duy nhất trong hệ thống này thực sự cần giữ bí mật:

```bash
# Khóa riêng tư chỉ cho chủ sở hữu đọc; thư mục cũng siết tương tự
sudo chmod 700 /etc/letsencrypt/archive /etc/letsencrypt/live
sudo chmod 600 /etc/letsencrypt/archive/<域名>/privkey*.pem
sudo chown root:root /etc/letsencrypt/archive/<域名>/privkey*.pem

# Xác nhận một chút: không được có group/other đọc được
ls -l /etc/letsencrypt/live/<域名>/
```

Điểm cần chú ý:

- **`chmod 600` + chủ sở hữu là root** là cách làm phổ biến và an toàn. Client ACME thường tự đặt quyền hợp lý, **hãy xem hiện trạng trước rồi mới sửa**.
- **Đừng copy khóa riêng tư vào thư mục gốc Web, thư mục tạm, công cụ chat hay kho Git.** Khi cần cho dịch vụ khác dùng, hãy cân nhắc nhóm quyền hoặc ACL, chứ không phải `chmod 644`.
- **Tiến trình master của nginx thường khởi động bằng root**, nên đọc được khóa riêng tư thuộc root; **nếu cách triển khai của bạn khác (container, chạy không phải root), phải bảo đảm người dùng đọc chứng chỉ có quyền**, nếu không biểu hiện sẽ là "cấu hình đúng nhưng khởi động thất bại".
- **`chmod -R 777 /etc/letsencrypt` là tuyệt đối sai**: nó giải quyết lỗi quyền, đồng thời giao khóa riêng tư cho mọi người dùng trên máy.
- **Sao lưu phải tính cả chứng chỉ**, nhưng **khóa riêng tư trong bản sao lưu cũng phải được bảo quản mã hóa** (xem [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)).

## 10. Chuỗi reverse proxy

Khi HTTPS do nginx kết thúc, yêu cầu lại được chuyển tiếp cho bảng điều khiển, **khái niệm "giao thức" trong chuỗi trở thành hai thứ khác nhau**:

```text
Trình duyệt người chơi  --HTTPS-->  nginx (kết thúc TLS)  --HTTP(127.0.0.1)-->  bảng điều khiển
```

Ba vấn đề phổ biến phát sinh từ đó:

| Vấn đề | Biểu hiện | Cách xử lý |
| --- | --- | --- |
| Liên kết bảng điều khiển tạo ra là `http://` | Tài nguyên hoặc chuyển hướng trong trang bị trình duyệt chặn | Chuyển tiếp `X-Forwarded-Proto $scheme`, và cấu hình "địa chỉ bên ngoài / proxy được tin cậy" theo tài liệu chính thức của bảng điều khiển |
| Bảng điều khiển cho rằng "kết nối không an toàn", từ chối đặt Cookie | Đăng nhập xong mất kết nối ngay | Như trên; một số bảng điều khiển cần khai báo rõ HTTPS trong cấu hình |
| Không kết nối được WebSocket | Console trắng, quay vòng mãi | Chuyển tiếp header `Upgrade` và `Connection`, và đặt `proxy_http_version 1.1` |

**Nếu phía trước còn một lớp CDN** (kiểu Cloudflare), chuỗi sẽ thành "trình duyệt → CDN (kết thúc TLS) → máy gốc (lại một đoạn TLS)", hai đầu **mỗi bên cần chứng chỉ và cấu hình riêng**; **máy gốc có kiểm tra chứng chỉ hay không, dùng chế độ nào là hành vi của nhà cung cấp CDN, lấy tài liệu chính thức làm chuẩn**. Trong chuỗi kiểu này, để truy "rốt cuộc chứng chỉ của ai hết hạn", cách kiểm tra bằng `-servername` ở mục 8 sẽ rất hữu ích.

Cấu hình đầy đủ phía bảng điều khiển xem [Sử dụng và bảo mật công cụ quản lý bảng điều khiển](/tutorials/ops/panels).

## 11. Chứng chỉ tự ký: khi nào có thể chấp nhận

Chứng chỉ tự ký (tự làm CA ký cho mình) **không phải "HTTPS miễn phí"**, định vị của nó là:

| Tình huống | Có dùng được không |
| --- | --- |
| Chỉ có bạn tự truy cập trong mạng nội bộ (ví dụ tình huống mạng nội bộ trong [Mở máy chủ trên máy tính gia đình và bảo trì](/tutorials/ops/home-hosting)), và bạn có thể cài CA tự ký vào kho tin cậy của thiết bị mình | **Được** |
| Kiểm thử tạm thời, giai đoạn chưa gắn tên miền | **Được**, nhưng phải rõ nó sẽ bị thay bất cứ lúc nào |
| Hướng ra Internet, cho người chơi hoặc quản trị phụ dùng | **Không được**: mọi người đều sẽ thấy cảnh báo của trình duyệt |
| Cho client API, bot, plugin gọi | **Thường không được**: nhiều client mặc định từ chối chứng chỉ không được tin cậy, và **sửa cấu hình để bỏ qua kiểm tra là lựa chọn còn tệ hơn** |

Thực tế buộc phải biết:

- **Cảnh báo trình duyệt không thể "cấu hình cho mất đi"**: người dùng thấy "kết nối của bạn không phải kết nối riêng tư", phải tự bấm "Nâng cao → Tiếp tục". **Điều này sẽ luyện cho người dùng thói quen bỏ qua cảnh báo, bản thân nó đã là một vấn đề an ninh.**
- Muốn chứng chỉ tự ký không báo cảnh báo, **bắt buộc phải nhập CA tự ký vào từng thiết bị client**; thiết bị nhiều lên thì chi phí bảo trì việc này sẽ vượt chi phí xin một chứng chỉ miễn phí.
- Tình huống nội bộ nếu thực sự cần, hãy dùng các công cụ chuyên làm CA nội bộ như **mkcert**, **step-ca**, ít sai sót hơn gõ tay `openssl req` (**cách dùng cụ thể lấy tài liệu chính thức của từng công cụ làm chuẩn**).
- **Tuyệt đối không** bật HSTS trên trang dùng chứng chỉ tự ký.

## 12. Giám sát và danh sách kiểm tra

**Chứng chỉ hết hạn là sự cố "hoàn toàn có thể biết trước"**, nên nó cần được giám sát, chứ không phải được cầu nguyện. Yêu cầu tối thiểu: **cảnh báo khi thời hạn còn lại ít hơn 14 ngày**. Có hai cách, **khuyến nghị làm cả hai**:

1. **Kiểm tra HTTPS từ bên ngoài**: để một bộ giám sát không nằm trên máy này vài phút một lần gửi yêu cầu tới địa chỉ bảng điều khiển, và kiểm tra thời điểm hết hạn của chứng chỉ. Nhiều công cụ giám sát (như Uptime Kuma) có giám sát HTTPS hiển thị thẳng thông tin chứng chỉ. Xem [Giám sát và cảnh báo](/tutorials/ops/monitoring).
2. **Kiểm tra hết hạn cục bộ**: trên máy chủ đọc tệp chứng chỉ, tính số ngày còn lại, ghi vào chỉ số giám sát hoặc gửi thông báo trực tiếp.

```bash
# Bản một dòng: in số ngày còn lại (tùy chọn -d của date là cách viết của GNU, hệ thống khác hãy dùng lệnh ngày tương ứng)
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -enddate \
  | cut -d= -f2 \
  | xargs -I{} date -d "{}" +%s \
  | awk -v now="$(date +%s)" '{ printf "còn %d ngày\n", ($1 - now) / 86400 }'
```
:::tip Cảnh báo phải phát hiện được "gia hạn không thành công"
Chỉ giám sát "chứng chỉ còn mấy ngày" là không đủ —— **nó sẽ báo "sắp hết hạn" trước 30 ngày, rồi có thể bạn quen với cảnh báo đó**. Tổ hợp tốt hơn là: **cảnh báo tác vụ gia hạn thất bại** (thông báo thất bại của timer/cron) **cộng với** cảnh báo "số ngày còn lại < 14 ngày". Cái trước cho bạn biết "gia hạn tự động đã hỏng", cái sau là chốt chặn cuối cùng.
:::

### 12.1 Danh sách kiểm tra trước khi đưa vào dùng

| Mục kiểm tra | Làm thế nào | Tiêu chuẩn đạt |
| --- | --- | --- |
| Chứng chỉ đã được cấp | `certbot certificates` | Tên miền đúng, thời điểm hết hạn ở tương lai |
| Dùng chuỗi đầy đủ | Xem `ssl_certificate` trong cấu hình nginx | Trỏ tới `fullchain.pem`, không phải `cert.pem` riêng lẻ |
| Phiên bản giao thức đúng | Kiểm tra bằng trình duyệt hoặc `openssl s_client` | Thương lượng được TLS 1.2 / 1.3 |
| HTTP chuyển hướng sang HTTPS | Truy cập một lần bằng `http://` | Chuyển hướng 301/308, và không xuất hiện cảnh báo nội dung hỗn hợp |
| Đường dẫn xác thực khả dụng | `curl -I http://域名/.well-known/acme-challenge/<测试文件>` | Trả về 200 (đừng để bị chuyển hướng nuốt mất) |
| Tác vụ gia hạn tự động đang chạy | `systemctl list-timers` hoặc xem `/etc/cron.d/` | Có và chỉ có một tác vụ gia hạn |
| Diễn tập gia hạn đã qua | `certbot renew --dry-run` | Không báo lỗi |
| Sau gia hạn có nạp lại | Kiểm tra deploy hook | Gia hạn thành công thì nginx thực sự được nạp lại |
| Quyền khóa riêng tư đã siết và không có bản sao lộ ra | `ls -l` + `stat`, và tìm một lượt trên đĩa cùng lịch sử Git | Người không phải chủ sở hữu không đọc được, khóa riêng tư chỉ tồn tại trong thư mục chứng chỉ và bản sao lưu mã hóa của nó |
| Cảnh báo hết hạn đã cấu hình | Bảng giám sát | Cố tình nâng ngưỡng lên để kiểm chứng một lần cảnh báo gửi được |
| Bảng điều khiển / bản đồ thực sự dùng được | Dùng trình duyệt truy cập thực tế một lần | Đăng nhập, console, bản đồ đều bình thường, không có cảnh báo chứng chỉ |

## Bước tiếp theo

- An toàn và reverse proxy phía bảng điều khiển: [Sử dụng và bảo mật công cụ quản lý bảng điều khiển](/tutorials/ops/panels)
- Cảnh báo hết hạn và hệ thống giám sát: [Giám sát và cảnh báo](/tutorials/ops/monitoring)
- Gia cố máy chủ: [Gia cố an ninh hệ thống](/tutorials/ops/system-security)
- Công bố ra ngoài và cổng: [Triển khai đến môi trường truy cập được](/tutorials/java/deploy)
- Xử lý chứng chỉ thế nào khi đổi máy: [Di chuyển máy chủ](/tutorials/ops/server-migration)
- Sao lưu và khôi phục (gồm thư mục chứng chỉ): [Sao lưu ngoài vị trí](/tutorials/ops/offsite-backup)

---

> Giá, gói cước và cấu hình của từng phần mềm lấy nhà cung cấp và tài liệu chính thức làm chuẩn.
