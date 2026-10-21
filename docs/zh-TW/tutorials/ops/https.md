---
title: HTTPS 憑證與自動續期
slug: https
cat: ops
level: 3
order: 25
minutes: 16
tags: [https, tls, 憑證, 反向代理, nginx, certbot, 自動續期, 維運]
updated: 2026-10-04
draft: false
---

面板打不開、瀏覽器報"你的連線不是私密連線"、網頁地圖一片空白——這類事故裡，**相當一部分的根因只有一個：憑證過期了。** 它本該是完全可以避免的故障，因為它有明確的到期時間，而且可以自動續期。

這一篇講清楚三件事：**TLS 到底保護什麼（以及不保護什麼）**、**憑證與私鑰分別是什麼**、**怎麼讓續期這件事永遠不需要你記住**。面板本身的安全配置見 [面板管理工具的使用與安全](/tutorials/ops/panels)，憑證到期的告警見 [監控與告警](/tutorials/ops/monitoring)。
:::warn 本文的配置以官方文件為準
下面出現的**包名、指令參數、配置鍵、預設路徑與目錄結構都會隨發行版、安裝方式與軟體版本變化**。示例的作用是說明"該配什麼"，**不是可以直接照抄的成品**。落地前請對照 certbot、Let's Encrypt、nginx 與你所用發行版的官方文件，以及你自己系統上實際生成的檔案。
:::

## 1. 先劃清範圍：遊戲流量不是 HTTPS

這是最容易搞混、也最常被誤解的一點：

| 流量 | 協議 | 預設埠 | 需要 TLS 憑證嗎 |
| --- | --- | --- | --- |
| Java 版遊戲流量 | Minecraft 自己的 TCP 協議 | 25565 | **不需要，憑證對它毫無作用** |
| 基岩版遊戲流量 | UDP（RakNet） | 19132 | **不需要** |
| 面板網頁 | HTTPS | 443（或你選的埠） | **需要** |
| 網頁地圖（Dynmap、Squaremap、BlueMap 等） | HTTPS | 443 | **需要** |
| 網站、狀態頁、MCDR 的 Web 插件、各類 API | HTTPS | 443 | **需要** |
| RCON | 它自己的 TCP 協議 | 25575 | 不是 TLS；**不要暴露到公網** |

**結論：HTTPS 憑證是給"Web 側"用的。** 裝不裝憑證，跟玩家能不能進服、會不會被中間人攻擊**沒有任何關係**。

### 1.1 那 Java 版登入時的加密算什麼

Java 版在登入階段確實有加密，但那是 **Minecraft 協議自己的機制**，由遊戲協議規定，**與 X.509 憑證、與 Let's Encrypt 無關**。把 HTTPS 憑證和"遊戲流量加密"當成一回事，是很多配置方向跑偏的起點。

### 1.2 為什麼 Web 側還是必須有 TLS

因為 Web 側傳的是**憑據和身份**：面板登入口令、會話 Cookie、API Key 與 Token，**明文 HTTP 下同網路的人可以直接看到**。此外現代瀏覽器會把 HTTP 頁面標註為"不安全"，而面板使用者一旦習慣了忽略警告，這個習慣本身就是安全問題。面板一旦對公網開放就會被持續掃描，見 [常見網路攻擊類型與 Minecraft 專項防禦](/tutorials/ops/attack-defense)。

## 2. 憑證與私鑰

### 2.1 它們分別是什麼

| | 憑證（certificate） | 私鑰（private key） |
| --- | --- | --- |
| 本質 | 公鑰 + 身份資訊 + CA 的簽名 | 一段必須保密的金鑰材料 |
| 能否公開 | **可以**，它本來就要發給每個訪問者 | **絕對不可以** |
| 洩露後果 | 無（本來就是公開資訊） | **拿到私鑰的人可以冒充你的網站** |
| 過期 | 有有效期，**必須續期** | 通常隨憑證一起更換，本身不"過期" |

**憑證是身份證，私鑰是印章。** 身份證可以給別人看，印章丟了就是災難。

### 2.2 常見檔案與它們的關係

以 ACME 客戶端常見的輸出為例（**具體檔名以你的客戶端為準**）：

| 檔案 | 內容 | 用在哪 |
| --- | --- | --- |
| `fullchain.pem` | 你的憑證 + 中間憑證 | **Web 伺服器的 `ssl_certificate`** |
| `privkey.pem` | 私鑰 | **Web 伺服器的 `ssl_certificate_key`** |
| `chain.pem` / `cert.pem` | 中間憑證 / 只有你的憑證 | 一般不需要單獨使用 |

**最常見的坑**：只配置 `cert.pem` 而漏了中間憑證，結果"有些瀏覽器能開、有些不能"。**用 `fullchain.pem` 就不會有這個問題。**

### 2.3 SNI：一個 IP 上的多個網站

現代 TLS 客戶端在握手時會發送 **SNI（Server Name Indication）**，Web 伺服器據此選擇憑證。所以一台機器上放多個網站是可行的，各自用各自的憑證；而**用命令列檢查憑證時必須帶 SNI 參數**（`openssl s_client -servername ...`），否則你看到的可能是另一張憑證，從而得出錯誤結論（見第 8 節）。

## 3. Let's Encrypt、ACME 與"必須自動續期"

### 3.1 ACME 是什麼

**ACME 是一套自動簽發與續期憑證的協議。** Let's Encrypt 是最廣為人知的 ACME 憑證頒發機構（CA），它簽發的網域驗證（DV）憑證**免費**。關鍵在於"自動"：ACME 的設計目標就是讓"申請、驗證、簽發、續期、部署"整條流程無人值守地跑。除此之外也存在其他 ACME CA（**是否適合你以各自官方文件為準**）。

### 3.2 90 天不是問題，手動續期才是

Let's Encrypt 簽發的憑證**有效期是 90 天**（以官方文件為準）。很多人的第一反應是"太短了，好麻煩"——**這個反應本身就是問題所在**：

- 90 天是**故意的**：它把"忘記續期"從"幾年一次的意外"變成"必須自動化才能活下去的常態"。
- **任何"到期前我去手動續一下"的方案都會失敗**：一年四次、連續多年不出錯，靠人做不到；出差、換電腦、通知郵件進了垃圾箱，任何一件小事都會讓它在某天突然過期。
- 正確心態是：**把"憑證會不會過期"從"我要記住的事"變成"系統自己處理的事"**，然後**監控它**（見第 12 節）。

### 3.3 常見的 ACME 客戶端

certbot（官方文件最全、插件多）、acme.sh（純 shell、DNS API 支援廣）、lego（Go 單檔案），以及 Caddy 之類**內建 ACME 的 Web 伺服器**。本文以 certbot 為例。

**不要同時用兩個客戶端管同一套網域**：兩套自動任務會互相覆蓋配置，出問題時你會查很久。

## 4. certbot 實操

### 4.1 安裝：以官方說明為準

certbot 的安裝方式隨發行版和版本變化很大，**請以官方安裝說明為準**。常見來源有三種：**發行版倉庫**（最省事，版本往往偏舊）、**snap**（官方文件常推薦，版本較新）、**pip / 虛擬環境**（靈活，要自己處理依賴）。**用 nginx 插件還需要對應的插件包**（常見名字類似 `python3-certbot-nginx`，具體包名以你的發行版為準）。裝完用 `certbot --version` 確認，並注意**版本不同，子指令與參數可能不同**。

### 4.2 三種簽發方式與各自適用場景

| 指令 | 做什麼 | 適用 | 注意 |
| --- | --- | --- | --- |
| `certbot --nginx -d panel.example.com` | nginx 插件：自動改配置、自動配跳轉 | nginx 在跑、配置由你掌控 | **它會修改你的 nginx 配置**，改前先備份或納入版本管理 |
| `certbot certonly --standalone -d panel.example.com` | 自己起臨時服務佔用 80 埠 | 機器上還沒有 Web 服務 | **必須停掉 nginx**，否則 80 被佔用會失敗 |
| `certbot certonly --webroot -w /var/www/certbot -d panel.example.com` | 把校驗檔案寫進指定目錄，由現有 nginx 提供 | **反向代理場景最常用** | 需要在 nginx 裡配好 `.well-known/acme-challenge/` 的 location |

對"nginx 反代面板"的機器，**推薦 webroot 或 nginx 插件**：前者對配置改動最小，後者最省事。**standalone 只適合還沒有 Web 服務、或你願意短暫停服的情況。** 簽發時會要求一個**用於到期提醒的信箱**（可跳過，但**強烈建議填**：它是自動續期失敗時唯一可能提前告訴你的人）。

### 4.3 測試續期

**這一步不能省。** 它驗證的是"如果 30 天后自動續期真的跑起來，它會不會成功"：

```bash
# 演练：不会真的替换证书，也不会消耗正式环境的签发额度（使用测试环境）
sudo certbot renew --dry-run

# 查看当前管理的证书、路径与到期时间
sudo certbot certificates
```

**`--dry-run` 是最便宜的驗證方式。沒跑過它的自動續期，等於沒有自動續期。**
:::warn 不要隨手用 --force-renewal
`--force-renewal`（以及類似的強制參數）會立刻重新簽發。**頻繁強制簽發可能觸發 CA 的速率限制，導致你在真正需要的時候反而籤不出來。** 排查問題時優先用 `--dry-run`；確實需要強制時，先確認原因與限制規則（以 CA 官方文件為準）。
:::

### 4.4 自動續期：systemd timer 還是 cron

**certbot 通常會自帶一個自動續期任務，你不需要再手寫一個。** 常見形式有兩種：**systemd timer**（如 `certbot.timer`，多數發行版與 snap 安裝走這條）與 **cron 任務**（如 `/etc/cron.d/certbot`，較老的安裝方式）。要做的只是**確認它存在並且在跑**：

```bash
# systemd 路线
systemctl list-timers | grep -i certbot

# cron 路线
ls -l /etc/cron.d/ | grep -i certbot
```

**如果你自己又寫了一條 cron，結果就是兩套任務互相打架。** 自動續期的預設行為通常是**每天檢查一到兩次，只在剩餘有效期少於約 30 天時才真的續期**（確切閾值與排程以客戶端與官方文件為準）——所以"它每天都跑"不等於"它每天都在簽發"。

### 4.5 續期之後要讓 Web 伺服器重新載入

續期只換了磁碟上的檔案，**正在執行的 nginx 不會自動讀取新憑證**（它只在啟動或過載時讀）。所以要配一個部署鉤子：

```bash
# 方式一：写进续期命令的 deploy hook（示例）
sudo certbot renew --deploy-hook "systemctl reload nginx"

# 方式二：把脚本放进钩子目录，任何续期成功后都会执行
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

鉤子腳本記得給可執行權限。**驗證鉤子是否真的生效，最好的辦法是跑一次 `--dry-run` 並觀察 nginx 是否被過載**（`--dry-run` 對鉤子的處理方式可能隨版本不同，**以官方文件為準**）。

## 5. nginx 的 TLS 配置

### 5.1 完整示例

下面是一台"nginx 反代面板"的機器上，一個**結構完整**的配置（網域、埠與路徑都是佔位符）：

```nginx
# /etc/nginx/conf.d/panel.conf
# 端口 <panel-port> 是占位符，请替换成面板实际监听的本地端口。

server {
    listen 80;
    listen [::]:80;
    server_name panel.example.com;

    # 证书校验文件：与 certbot 的 --webroot 路径保持一致
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 其余请求一律跳转到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name panel.example.com;

    # 由你的 ACME 客户端签发与续期，请使用实际路径
    # 注意用 live 目录下的符号链接，而不是 archive 下带版本号的真实文件
    ssl_certificate     /etc/letsencrypt/live/panel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.example.com/privkey.pem;

    # 只允许现代 TLS；TLS 1.0/1.1 已被主流浏览器弃用
    ssl_protocols TLSv1.2 TLSv1.3;
    # 让客户端决定密码套件（现代推荐做法；TLS 1.3 本来就不看这个选项）
    ssl_prefer_server_ciphers off;

    # 可选的会话复用；是否启用与参数以 nginx 官方文档为准
    ssl_session_cache shared:SSL:10m;

    # HTTP/2：nginx 1.25.1 及以后用独立指令；更老的版本写作 listen 443 ssl http2;
    http2 on;

    location / {
        proxy_pass http://127.0.0.1:<panel-port>;

        # 面板控制台依赖 WebSocket，必须转发 Upgrade 头
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # 面板据此判断"外部是 HTTPS"，从而生成正确的链接与安全 Cookie
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

改完務必先測語法再過載：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 逐行說明（只講容易錯的）

| 配置 | 為什麼 |
| --- | --- |
| `listen 443 ssl;` | **`ssl` 參數不能少**，否則 nginx 不會在這條 server 上啟用 TLS |
| `ssl_certificate` / `ssl_certificate_key` | 前者用 `fullchain.pem`，後者用 `privkey.pem`；路徑**由你的客戶端決定**，不要照抄 |
| `ssl_protocols TLSv1.2 TLSv1.3;` | 現代瀏覽器的底線是 TLS 1.2；顯式寫出來比依賴預設值更清楚 |
| `ssl_prefer_server_ciphers off;` | 現代推薦讓客戶端選擇；TLS 1.3 的密碼套件本來就不受這個選項影響 |
| `.well-known/acme-challenge/` 的 location | HTTP-01 校驗的落點；用 `--webroot` 時**必須**與 `-w` 的路徑一致 |
| `location / { return 301 ...; }` | HTTP 到 HTTPS 的跳轉；注意它**放在 challenge 的 location 之後**（nginx 會優先匹配更具體的字首） |
| `X-Forwarded-Proto` | 少了它，面板可能生成 `http://` 連結、或拒絕設定安全 Cookie |
| `http2 on;` | **版本相關**：nginx 1.25.1 起才有這個獨立指令 |
:::tip 憑證路徑為什麼用 live 目錄
ACME 客戶端通常把每次簽發的真實檔案放在類似 `archive/` 的目錄裡（帶序號），再在 `live/` 下建立**符號連結**指向最新一份。**配置裡應該引用 `live/` 下的路徑**：它會在續期後自動指向新檔案，而 `archive/` 下的具體檔名每次續期都會變。
:::

### 5.3 關於密碼套件與"預設值通常夠用"

網上流傳的 nginx TLS 配置裡，往往有一大段 `ssl_ciphers`。**多數情況下你不需要它**：

- **nginx 自帶的預設值在現代版本上通常是安全的**，而且會隨版本更新。
- 手抄一段幾年前的密碼套件列表，**可能反而把新的、更好的套件排除掉**。
- 需要精細控制時，參考 Mozilla 的 SSL 配置生成器這類長期維護的來源，**而不是隨便一篇部落格**。
:::note OCSP stapling 的現狀
歷史上常推薦配置 `ssl_stapling on;` 與 `ssl_stapling_verify on;`（配合 `ssl_trusted_certificate`）。**但 Let's Encrypt 已宣佈停止 OCSP 服務、轉向 CRL**，因此針對 LE 憑證配置 OCSP stapling 已經沒有意義。**確切的時間點與現狀以 Let's Encrypt 官方公告為準**，不要照抄老教學。
:::

## 6. 校驗方式：HTTP-01 與 DNS-01

ACME 需要證明"你控制這個網域"。兩種主流方式：

| | HTTP-01 | DNS-01 |
| --- | --- | --- |
| 怎麼證明 | 在 `http://domain/.well-known/acme-challenge/<token>` 放一個指定內容的檔案 | 在 `_acme-challenge.domain` 新增一條指定內容的 TXT 記錄 |
| 網路要求 | **80 埠必須能從公網訪問**（可跟隨跳轉） | 不需要任何入站埠 |
| 能否籤萬用字元 | **不能** | **能** |
| 自動化難度 | 低（webroot / nginx 插件即可） | 需要 DNS 服務商的 API 憑據 |
| 主要風險 | 80 被防火牆/安全組擋住、被 CDN 攔截、跳轉配錯 | **API 憑據洩露等於網域控制權洩露** |

### 6.1 HTTP-01 的常見失敗原因

**雲安全組沒放行 80**（最常見：本機防火牆開了、雲平台安全組沒開）；**80 被別的服務佔用**（`--standalone` 時 nginx 還在跑）；**跳轉把校驗請求也跳走了**（challenge 的 location 必須排在跳轉之前，或跳轉規則放行 `/.well-known/`）；**前面有 CDN / 反向代理**（校驗請求沒到源站，需按 CDN 的說明處理）。

### 6.2 DNS-01 的注意點

記錄名通常是 `_acme-challenge`（**以你的 DNS 服務商與客戶端文件為準**）；**DNS 生效需要時間**，手動加完記錄不要立刻點校驗；**API 憑據要用最小權限**，只給需要修改的那幾個記錄，不要用帳號全域金鑰；憑據存在伺服器上時**權限要收緊**，也不要提交進 Git。

### 6.3 什麼時候必須用 DNS-01

- 要籤**萬用字元憑證**。
- **80 埠無法對外開放**（被運營商封鎖、在 CGNAT 後面、公司網路限制）。
- 網域**不是直接指向這台機器**（前置 CDN、負載均衡、多台源站）。
- 你希望**憑證簽發完全不依賴 Web 服務**（例如籤給非 HTTP 的服務）。

## 7. 萬用字元憑證

萬用字元憑證能覆蓋一個層級的子網域，代價是**只能用 DNS-01**：

```bash
# 注意：*.example.com 不包含 example.com 本身，通常两个都要写
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

要點：

- **`*.example.com` 不匹配 `example.com`**，也不匹配 `a.b.example.com`（萬用字元只覆蓋一層）。需要就一起寫進 `-d`。
- 萬用字元**方便，但也擴大了爆炸半徑**：私鑰洩露時，所有子域一起受影響。
- 用了 `--manual` 就意味著**續期也需要人工**——除非你把它換成 DNS API 的自動插件。**手動萬用字元 + 忘記續期，是一個很常見的組合事故。**
- 如果你的子域數量不多，**逐個簽發（HTTP-01 自動續期）往往比一張萬用字元更省心**。

## 8. 續期失敗之後會發生什麼

### 8.1 症狀

| 現象 | 原因 |
| --- | --- |
| 瀏覽器整頁攔截，提示憑證過期/不安全 | 憑證已過期 |
| 面板登不進去，或 API 客戶端全部報錯 | 同上；有些客戶端不會給你"繼續訪問"的選項 |
| 網頁地圖載入不出來 | 地圖的靜態資源走 HTTPS |
| "以前能用，某天早上突然不行" | 到期是**瞬間發生**的，不會有漸變 |

### 8.2 怎麼查

```bash
# 看这张证书是谁签的、什么时候到期（必须带 -servername，否则可能看到别的站点的证书）
echo | openssl s_client -connect panel.example.com:443 -servername panel.example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# 想看完整链（包括中间证书）
openssl s_client -connect panel.example.com:443 -servername panel.example.com -showcerts </dev/null
```

在輸出裡重點看兩個日期：**`notBefore`（生效）與 `notAfter`（到期）**。如果 `notAfter` 已經是過去時間，問題就確認了。

**同時要看本地檔案的到期時間**（可能你看到的是 CDN 上那張憑證，而不是源站的）：

```bash
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -subject -dates
sudo certbot certificates
```
:::warn 只重啟服務是沒用的
憑證過期後，**重啟 nginx 不會讓它變新**。正確順序是：**先讓續期成功**（`sudo certbot renew`，並解決它報的錯），**再過載 nginx**。反過來做只會浪費時間。
:::

### 8.3 HSTS 會讓事情更糟

如果你啟用了 HSTS（`Strict-Transport-Security` 響應頭），瀏覽器會**在一段時間內強制使用 HTTPS，並且不允許使用者點"繼續訪問"**，憑證過期時頁面會變成**完全無法繞過**的錯誤。HSTS 本身是好東西（它防止降級攻擊），但要記住它的代價：**它把"憑證必須一直有效"從"最好"變成了"硬性要求"**。啟用前先確認自動續期與監控都到位。

## 9. 憑證檔案與權限

私鑰是這套體系裡唯一需要真正保密的東西：

```bash
# 私钥只允许属主读取；目录同样收紧
sudo chmod 700 /etc/letsencrypt/archive /etc/letsencrypt/live
sudo chmod 600 /etc/letsencrypt/archive/<domain>/privkey*.pem
sudo chown root:root /etc/letsencrypt/archive/<domain>/privkey*.pem

# 确认一下：不应该出现 group/other 可读
ls -l /etc/letsencrypt/live/<domain>/
```

要點：

- **`chmod 600` + 屬主為 root** 是常見且安全的做法。ACME 客戶端通常會自己設好合理權限，**先看現狀再改**。
- **不要把私鑰複製到 Web 根目錄、臨時目錄、聊天工具或 Git 倉庫裡。** 需要給別的服務用時，考慮權限組或 ACL，而不是 `chmod 644`。
- nginx 的 **master 行程通常以 root 啟動**，因此能讀取 root 屬主的私鑰；**如果你的部署方式不同（容器、非 root 執行），要確保讀憑證的那個使用者有權限**，否則表現是"配置正確但啟動失敗"。
- **`chmod -R 777 /etc/letsencrypt` 是絕對錯誤的**：它解決了權限報錯，同時把私鑰交給了機器上的每個使用者。
- **備份要連憑證一起考慮**，但**備份裡的私鑰同樣要加密保管**（見 [異地備份](/tutorials/ops/offsite-backup)）。

## 10. 反向代理鏈

當 HTTPS 由 nginx 終結、請求再轉發給面板時，**"協議"這件事在鏈路裡變成了兩個不同的概念**：

```text
玩家浏览器  --HTTPS-->  nginx（终结 TLS）  --HTTP(127.0.0.1)-->  面板
```

由此產生的三個常見問題：

| 問題 | 表現 | 處理 |
| --- | --- | --- |
| 面板生成的連結是 `http://` | 頁面裡的資源或跳轉被瀏覽器攔下 | 轉發 `X-Forwarded-Proto $scheme`，並按面板官方文件配置"外部位址/受信任代理" |
| 面板認為"連線不安全"，拒絕設 Cookie | 登入後立刻掉線 | 同上；部分面板需要在配置裡顯式聲明 HTTPS |
| WebSocket 連不上 | 控制台空白、一直轉圈 | 轉發 `Upgrade` 與 `Connection` 頭，並設定 `proxy_http_version 1.1` |

**如果前面還有一層 CDN**（Cloudflare 之類），鏈路會變成"瀏覽器 → CDN（TLS 終結）→ 源站（又一段 TLS）"，兩端**各自需要自己的憑證與配置**；**源站憑證是否校驗、用什麼模式，是 CDN 服務商的行為，以官方文件為準**。這類鏈路裡排查"到底是誰的憑證過期"，第 8 節的 `-servername` 檢查方法會很有用。

面板側的完整配置見 [面板管理工具的使用與安全](/tutorials/ops/panels)。

## 11. 自籤憑證：什麼時候可以接受

自籤憑證（自己當 CA 籤給自己）**不是"免費的 HTTPS"**，它的定位是：

| 場景 | 是否可用 |
| --- | --- |
| 只有你自己在內網訪問（例如 [家用電腦開服與維護](/tutorials/ops/home-hosting) 裡的內網場景）、且你能把自籤 CA 裝進自己裝置的信任庫 | **可以** |
| 臨時測試、還沒繫結網域的階段 | **可以**，但要清楚它隨時會被替換 |
| 面向公網、給玩家或協管使用 | **不可以**：所有人都會看到瀏覽器警告 |
| 給 API 客戶端、機器人、插件呼叫 | **通常不行**：很多客戶端預設拒絕不受信任的憑證，且**改配置去忽略校驗是更糟的選擇** |

必須知道的現實：

- **瀏覽器警告無法"配置掉"**：使用者看到的是"你的連線不是私密連線"，需要手動點"高階 → 繼續"。**這會訓練使用者忽略警告，本身就是一個安全問題。**
- 想讓自籤憑證不報警告，**必須把自籤 CA 匯入每台客戶端裝置**；裝置一多，這件事的維護成本會超過申請一張免費憑證。
- 內部場景如果確實需要，用 **mkcert**、**step-ca** 這類專門做內部 CA 的工具，比手敲 `openssl req` 更不容易出錯（**具體用法以各自官方文件為準**）。
- **絕不要**在自籤憑證的網站上啟用 HSTS。

## 12. 監控與清單

**憑證過期是"完全可以提前知道"的故障**，所以它應該被監控，而不是被祈禱。最低要求：**在剩餘有效期少於 14 天時告警**。做法有兩種，**建議都做**：

1. **外部 HTTPS 檢查**：讓一台不在本機的監控每隔幾分鐘請求一次面板位址，並檢查憑證到期時間。很多監控工具（如 Uptime Kuma）的 HTTPS 監控會直接顯示憑證資訊。見 [監控與告警](/tutorials/ops/monitoring)。
2. **本地到期檢查**：在伺服器上讀憑證檔案算剩餘天數，寫入監控指標或直接發通知。

```bash
# 一行版：打印剩余天数（date 的 -d 选项是 GNU 的写法，其他系统请用对应的日期命令）
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -enddate \
  | cut -d= -f2 \
  | xargs -I{} date -d "{}" +%s \
  | awk -v now="$(date +%s)" '{ printf "剩余 %d 天\n", ($1 - now) / 86400 }'
```
:::tip 告警要能發現"續期沒成功"
只監控"憑證還有幾天"是不夠的——**它會提前 30 天就報"快到期"，然後你可能習慣了這條告警**。更好的組合是：**續期任務失敗告警**（timer/cron 的失敗通知）**加上**"剩餘天數 < 14 天"告警。前者告訴你"自動續期壞了"，後者是最後的兜底。
:::

### 12.1 上線檢查清單

| 檢查項 | 怎麼做 | 通過標準 |
| --- | --- | --- |
| 憑證已簽發 | `certbot certificates` | 網域正確，到期時間在未來 |
| 用的是完整鏈 | 看 nginx 配置裡的 `ssl_certificate` | 指向 `fullchain.pem`，不是單獨的 `cert.pem` |
| 協議版本正確 | 瀏覽器或 `openssl s_client` 檢查 | 協商到 TLS 1.2 / 1.3 |
| HTTP 跳轉到 HTTPS | 用 `http://` 訪問一次 | 301/308 跳轉，且不出現混合內容告警 |
| 校驗路徑可用 | `curl -I http://domain/.well-known/acme-challenge/<test-file>` | 返回 200（不要被跳轉吃掉） |
| 自動續期任務在跑 | `systemctl list-timers` 或看 `/etc/cron.d/` | 有且只有一個續期任務 |
| 續期演練通過 | `certbot renew --dry-run` | 無報錯 |
| 續期後會過載 | 檢查 deploy hook | 續期成功後 nginx 真的過載 |
| 私鑰權限收緊且無外洩副本 | `ls -l` + `stat`，並搜一遍磁碟與 Git 歷史 | 非屬主不可讀，私鑰只存在於憑證目錄與其加密備份中 |
| 到期告警已配 | 監控面板 | 故意把閾值調大驗證一次告警能發出來 |
| 面板/地圖真的能用 | 用瀏覽器實際訪問一次 | 登入、控制台、地圖都正常，無憑證警告 |

## 下一步

- 面板側的安全與反代：[面板管理工具的使用與安全](/tutorials/ops/panels)
- 到期告警與監控體系：[監控與告警](/tutorials/ops/monitoring)
- 主機加固：[系統安全加固](/tutorials/ops/system-security)
- 對外發佈與埠：[部署到可存取環境](/tutorials/java/deploy)
- 換機器時憑證怎麼處理：[伺服器遷移](/tutorials/ops/server-migration)
- 備份與恢復（含憑證目錄）：[異地備份](/tutorials/ops/offsite-backup)

---

> 價格、套餐與各軟體的配置以服務商與官方文件為準。
