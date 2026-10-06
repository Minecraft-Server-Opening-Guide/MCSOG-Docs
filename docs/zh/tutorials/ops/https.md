---
title: HTTPS 证书与自动续期
slug: https
cat: ops
level: 3
order: 25
minutes: 16
tags: [https, tls, 证书, 反向代理, nginx, certbot, 自动续期, 运维]
updated: 2026-10-04
draft: false
---

面板打不开、浏览器报"你的连接不是私密连接"、网页地图一片空白——这类事故里，**相当一部分的根因只有一个：证书过期了。** 它本该是完全可以避免的故障，因为它有明确的到期时间，而且可以自动续期。

这一篇讲清楚三件事：**TLS 到底保护什么（以及不保护什么）**、**证书与私钥分别是什么**、**怎么让续期这件事永远不需要你记住**。面板本身的安全配置见 [面板管理工具的使用与安全](/tutorials/ops/panels)，证书到期的告警见 [监控与告警](/tutorials/ops/monitoring)。
:::warn 本文的配置以官方文档为准
下面出现的**包名、命令参数、配置键、默认路径与目录结构都会随发行版、安装方式与软件版本变化**。示例的作用是说明"该配什么"，**不是可以直接照抄的成品**。落地前请对照 certbot、Let's Encrypt、nginx 与你所用发行版的官方文档，以及你自己系统上实际生成的文件。
:::

## 1. 先划清范围：游戏流量不是 HTTPS

这是最容易搞混、也最常被误解的一点：

| 流量 | 协议 | 默认端口 | 需要 TLS 证书吗 |
| --- | --- | --- | --- |
| Java 版游戏流量 | Minecraft 自己的 TCP 协议 | 25565 | **不需要，证书对它毫无作用** |
| 基岩版游戏流量 | UDP（RakNet） | 19132 | **不需要** |
| 面板网页 | HTTPS | 443（或你选的端口） | **需要** |
| 网页地图（Dynmap、Squaremap、BlueMap 等） | HTTPS | 443 | **需要** |
| 网站、状态页、MCDR 的 Web 插件、各类 API | HTTPS | 443 | **需要** |
| RCON | 它自己的 TCP 协议 | 25575 | 不是 TLS；**不要暴露到公网** |

**结论：HTTPS 证书是给"Web 侧"用的。** 装不装证书，跟玩家能不能进服、会不会被中间人攻击**没有任何关系**。

### 1.1 那 Java 版登录时的加密算什么

Java 版在登录阶段确实有加密，但那是 **Minecraft 协议自己的机制**，由游戏协议规定，**与 X.509 证书、与 Let's Encrypt 无关**。把 HTTPS 证书和"游戏流量加密"当成一回事，是很多配置方向跑偏的起点。

### 1.2 为什么 Web 侧还是必须有 TLS

因为 Web 侧传的是**凭据和身份**：面板登录口令、会话 Cookie、API Key 与 Token，**明文 HTTP 下同网络的人可以直接看到**。此外现代浏览器会把 HTTP 页面标注为"不安全"，而面板用户一旦习惯了忽略警告，这个习惯本身就是安全问题。面板一旦对公网开放就会被持续扫描，见 [常见网络攻击类型与 Minecraft 专项防御](/tutorials/ops/attack-defense)。

## 2. 证书与私钥

### 2.1 它们分别是什么

| | 证书（certificate） | 私钥（private key） |
| --- | --- | --- |
| 本质 | 公钥 + 身份信息 + CA 的签名 | 一段必须保密的密钥材料 |
| 能否公开 | **可以**，它本来就要发给每个访问者 | **绝对不可以** |
| 泄露后果 | 无（本来就是公开信息） | **拿到私钥的人可以冒充你的站点** |
| 过期 | 有有效期，**必须续期** | 通常随证书一起更换，本身不"过期" |

**证书是身份证，私钥是印章。** 身份证可以给别人看，印章丢了就是灾难。

### 2.2 常见文件与它们的关系

以 ACME 客户端常见的输出为例（**具体文件名以你的客户端为准**）：

| 文件 | 内容 | 用在哪 |
| --- | --- | --- |
| `fullchain.pem` | 你的证书 + 中间证书 | **Web 服务器的 `ssl_certificate`** |
| `privkey.pem` | 私钥 | **Web 服务器的 `ssl_certificate_key`** |
| `chain.pem` / `cert.pem` | 中间证书 / 只有你的证书 | 一般不需要单独使用 |

**最常见的坑**：只配置 `cert.pem` 而漏了中间证书，结果"有些浏览器能开、有些不能"。**用 `fullchain.pem` 就不会有这个问题。**

### 2.3 SNI：一个 IP 上的多个站点

现代 TLS 客户端在握手时会发送 **SNI（Server Name Indication）**，Web 服务器据此选择证书。所以一台机器上放多个站点是可行的，各自用各自的证书；而**用命令行检查证书时必须带 SNI 参数**（`openssl s_client -servername ...`），否则你看到的可能是另一张证书，从而得出错误结论（见第 8 节）。

## 3. Let's Encrypt、ACME 与"必须自动续期"

### 3.1 ACME 是什么

**ACME 是一套自动签发与续期证书的协议。** Let's Encrypt 是最广为人知的 ACME 证书颁发机构（CA），它签发的域名验证（DV）证书**免费**。关键在于"自动"：ACME 的设计目标就是让"申请、验证、签发、续期、部署"整条流程无人值守地跑。除此之外也存在其他 ACME CA（**是否适合你以各自官方文档为准**）。

### 3.2 90 天不是问题，手动续期才是

Let's Encrypt 签发的证书**有效期是 90 天**（以官方文档为准）。很多人的第一反应是"太短了，好麻烦"——**这个反应本身就是问题所在**：

- 90 天是**故意的**：它把"忘记续期"从"几年一次的意外"变成"必须自动化才能活下去的常态"。
- **任何"到期前我去手动续一下"的方案都会失败**：一年四次、连续多年不出错，靠人做不到；出差、换电脑、通知邮件进了垃圾箱，任何一件小事都会让它在某天突然过期。
- 正确心态是：**把"证书会不会过期"从"我要记住的事"变成"系统自己处理的事"**，然后**监控它**（见第 12 节）。

### 3.3 常见的 ACME 客户端

certbot（官方文档最全、插件多）、acme.sh（纯 shell、DNS API 支持广）、lego（Go 单文件），以及 Caddy 之类**内置 ACME 的 Web 服务器**。本文以 certbot 为例。

**不要同时用两个客户端管同一套域名**：两套自动任务会互相覆盖配置，出问题时你会查很久。

## 4. certbot 实操

### 4.1 安装：以官方说明为准

certbot 的安装方式随发行版和版本变化很大，**请以官方安装说明为准**。常见来源有三种：**发行版仓库**（最省事，版本往往偏旧）、**snap**（官方文档常推荐，版本较新）、**pip / 虚拟环境**（灵活，要自己处理依赖）。**用 nginx 插件还需要对应的插件包**（常见名字类似 `python3-certbot-nginx`，具体包名以你的发行版为准）。装完用 `certbot --version` 确认，并注意**版本不同，子命令与参数可能不同**。

### 4.2 三种签发方式与各自适用场景

| 命令 | 做什么 | 适用 | 注意 |
| --- | --- | --- | --- |
| `certbot --nginx -d panel.example.com` | nginx 插件：自动改配置、自动配跳转 | nginx 在跑、配置由你掌控 | **它会修改你的 nginx 配置**，改前先备份或纳入版本管理 |
| `certbot certonly --standalone -d panel.example.com` | 自己起临时服务占用 80 端口 | 机器上还没有 Web 服务 | **必须停掉 nginx**，否则 80 被占用会失败 |
| `certbot certonly --webroot -w /var/www/certbot -d panel.example.com` | 把校验文件写进指定目录，由现有 nginx 提供 | **反向代理场景最常用** | 需要在 nginx 里配好 `.well-known/acme-challenge/` 的 location |

对"nginx 反代面板"的机器，**推荐 webroot 或 nginx 插件**：前者对配置改动最小，后者最省事。**standalone 只适合还没有 Web 服务、或你愿意短暂停服的情况。** 签发时会要求一个**用于到期提醒的邮箱**（可跳过，但**强烈建议填**：它是自动续期失败时唯一可能提前告诉你的人）。

### 4.3 测试续期

**这一步不能省。** 它验证的是"如果 30 天后自动续期真的跑起来，它会不会成功"：

```bash
# 演练：不会真的替换证书，也不会消耗正式环境的签发额度（使用测试环境）
sudo certbot renew --dry-run

# 查看当前管理的证书、路径与到期时间
sudo certbot certificates
```

**`--dry-run` 是最便宜的验证方式。没跑过它的自动续期，等于没有自动续期。**
:::warn 不要随手用 --force-renewal
`--force-renewal`（以及类似的强制参数）会立刻重新签发。**频繁强制签发可能触发 CA 的速率限制，导致你在真正需要的时候反而签不出来。** 排查问题时优先用 `--dry-run`；确实需要强制时，先确认原因与限制规则（以 CA 官方文档为准）。
:::

### 4.4 自动续期：systemd timer 还是 cron

**certbot 通常会自带一个自动续期任务，你不需要再手写一个。** 常见形式有两种：**systemd timer**（如 `certbot.timer`，多数发行版与 snap 安装走这条）与 **cron 任务**（如 `/etc/cron.d/certbot`，较老的安装方式）。要做的只是**确认它存在并且在跑**：

```bash
# systemd 路线
systemctl list-timers | grep -i certbot

# cron 路线
ls -l /etc/cron.d/ | grep -i certbot
```

**如果你自己又写了一条 cron，结果就是两套任务互相打架。** 自动续期的默认行为通常是**每天检查一到两次，只在剩余有效期少于约 30 天时才真的续期**（确切阈值与调度以客户端与官方文档为准）——所以"它每天都跑"不等于"它每天都在签发"。

### 4.5 续期之后要让 Web 服务器重新加载

续期只换了磁盘上的文件，**正在运行的 nginx 不会自动读取新证书**（它只在启动或重载时读）。所以要配一个部署钩子：

```bash
# 方式一：写进续期命令的 deploy hook（示例）
sudo certbot renew --deploy-hook "systemctl reload nginx"

# 方式二：把脚本放进钩子目录，任何续期成功后都会执行
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

钩子脚本记得给可执行权限。**验证钩子是否真的生效，最好的办法是跑一次 `--dry-run` 并观察 nginx 是否被重载**（`--dry-run` 对钩子的处理方式可能随版本不同，**以官方文档为准**）。

## 5. nginx 的 TLS 配置

### 5.1 完整示例

下面是一台"nginx 反代面板"的机器上，一个**结构完整**的配置（域名、端口与路径都是占位符）：

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

改完务必先测语法再重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 逐行说明（只讲容易错的）

| 配置 | 为什么 |
| --- | --- |
| `listen 443 ssl;` | **`ssl` 参数不能少**，否则 nginx 不会在这条 server 上启用 TLS |
| `ssl_certificate` / `ssl_certificate_key` | 前者用 `fullchain.pem`，后者用 `privkey.pem`；路径**由你的客户端决定**，不要照抄 |
| `ssl_protocols TLSv1.2 TLSv1.3;` | 现代浏览器的底线是 TLS 1.2；显式写出来比依赖默认值更清楚 |
| `ssl_prefer_server_ciphers off;` | 现代推荐让客户端选择；TLS 1.3 的密码套件本来就不受这个选项影响 |
| `.well-known/acme-challenge/` 的 location | HTTP-01 校验的落点；用 `--webroot` 时**必须**与 `-w` 的路径一致 |
| `location / { return 301 ...; }` | HTTP 到 HTTPS 的跳转；注意它**放在 challenge 的 location 之后**（nginx 会优先匹配更具体的前缀） |
| `X-Forwarded-Proto` | 少了它，面板可能生成 `http://` 链接、或拒绝设置安全 Cookie |
| `http2 on;` | **版本相关**：nginx 1.25.1 起才有这个独立指令 |
:::tip 证书路径为什么用 live 目录
ACME 客户端通常把每次签发的真实文件放在类似 `archive/` 的目录里（带序号），再在 `live/` 下建立**符号链接**指向最新一份。**配置里应该引用 `live/` 下的路径**：它会在续期后自动指向新文件，而 `archive/` 下的具体文件名每次续期都会变。
:::

### 5.3 关于密码套件与"默认值通常够用"

网上流传的 nginx TLS 配置里，往往有一大段 `ssl_ciphers`。**多数情况下你不需要它**：

- **nginx 自带的默认值在现代版本上通常是安全的**，而且会随版本更新。
- 手抄一段几年前的密码套件列表，**可能反而把新的、更好的套件排除掉**。
- 需要精细控制时，参考 Mozilla 的 SSL 配置生成器这类长期维护的来源，**而不是随便一篇博客**。
:::note OCSP stapling 的现状
历史上常推荐配置 `ssl_stapling on;` 与 `ssl_stapling_verify on;`（配合 `ssl_trusted_certificate`）。**但 Let's Encrypt 已宣布停止 OCSP 服务、转向 CRL**，因此针对 LE 证书配置 OCSP stapling 已经没有意义。**确切的时间点与现状以 Let's Encrypt 官方公告为准**，不要照抄老教程。
:::

## 6. 校验方式：HTTP-01 与 DNS-01

ACME 需要证明"你控制这个域名"。两种主流方式：

| | HTTP-01 | DNS-01 |
| --- | --- | --- |
| 怎么证明 | 在 `http://域名/.well-known/acme-challenge/<token>` 放一个指定内容的文件 | 在 `_acme-challenge.域名` 添加一条指定内容的 TXT 记录 |
| 网络要求 | **80 端口必须能从公网访问**（可跟随跳转） | 不需要任何入站端口 |
| 能否签通配符 | **不能** | **能** |
| 自动化难度 | 低（webroot / nginx 插件即可） | 需要 DNS 服务商的 API 凭据 |
| 主要风险 | 80 被防火墙/安全组挡住、被 CDN 拦截、跳转配错 | **API 凭据泄露等于域名控制权泄露** |

### 6.1 HTTP-01 的常见失败原因

**云安全组没放行 80**（最常见：本机防火墙开了、云平台安全组没开）；**80 被别的服务占用**（`--standalone` 时 nginx 还在跑）；**跳转把校验请求也跳走了**（challenge 的 location 必须排在跳转之前，或跳转规则放行 `/.well-known/`）；**前面有 CDN / 反向代理**（校验请求没到源站，需按 CDN 的说明处理）。

### 6.2 DNS-01 的注意点

记录名通常是 `_acme-challenge`（**以你的 DNS 服务商与客户端文档为准**）；**DNS 生效需要时间**，手动加完记录不要立刻点校验；**API 凭据要用最小权限**，只给需要修改的那几个记录，不要用账号全局密钥；凭据存在服务器上时**权限要收紧**，也不要提交进 Git。

### 6.3 什么时候必须用 DNS-01

- 要签**通配符证书**。
- **80 端口无法对外开放**（被运营商封锁、在 CGNAT 后面、公司网络限制）。
- 域名**不是直接指向这台机器**（前置 CDN、负载均衡、多台源站）。
- 你希望**证书签发完全不依赖 Web 服务**（例如签给非 HTTP 的服务）。

## 7. 通配符证书

通配符证书能覆盖一个层级的子域名，代价是**只能用 DNS-01**：

```bash
# 注意：*.example.com 不包含 example.com 本身，通常两个都要写
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

要点：

- **`*.example.com` 不匹配 `example.com`**，也不匹配 `a.b.example.com`（通配符只覆盖一层）。需要就一起写进 `-d`。
- 通配符**方便，但也扩大了爆炸半径**：私钥泄露时，所有子域一起受影响。
- 用了 `--manual` 就意味着**续期也需要人工**——除非你把它换成 DNS API 的自动插件。**手动通配符 + 忘记续期，是一个很常见的组合事故。**
- 如果你的子域数量不多，**逐个签发（HTTP-01 自动续期）往往比一张通配符更省心**。

## 8. 续期失败之后会发生什么

### 8.1 症状

| 现象 | 原因 |
| --- | --- |
| 浏览器整页拦截，提示证书过期/不安全 | 证书已过期 |
| 面板登不进去，或 API 客户端全部报错 | 同上；有些客户端不会给你"继续访问"的选项 |
| 网页地图加载不出来 | 地图的静态资源走 HTTPS |
| "以前能用，某天早上突然不行" | 到期是**瞬间发生**的，不会有渐变 |

### 8.2 怎么查

```bash
# 看这张证书是谁签的、什么时候到期（必须带 -servername，否则可能看到别的站点的证书）
echo | openssl s_client -connect panel.example.com:443 -servername panel.example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# 想看完整链（包括中间证书）
openssl s_client -connect panel.example.com:443 -servername panel.example.com -showcerts </dev/null
```

在输出里重点看两个日期：**`notBefore`（生效）与 `notAfter`（到期）**。如果 `notAfter` 已经是过去时间，问题就确认了。

**同时要看本地文件的到期时间**（可能你看到的是 CDN 上那张证书，而不是源站的）：

```bash
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -subject -dates
sudo certbot certificates
```
:::warn 只重启服务是没用的
证书过期后，**重启 nginx 不会让它变新**。正确顺序是：**先让续期成功**（`sudo certbot renew`，并解决它报的错），**再重载 nginx**。反过来做只会浪费时间。
:::

### 8.3 HSTS 会让事情更糟

如果你启用了 HSTS（`Strict-Transport-Security` 响应头），浏览器会**在一段时间内强制使用 HTTPS，并且不允许用户点"继续访问"**，证书过期时页面会变成**完全无法绕过**的错误。HSTS 本身是好东西（它防止降级攻击），但要记住它的代价：**它把"证书必须一直有效"从"最好"变成了"硬性要求"**。启用前先确认自动续期与监控都到位。

## 9. 证书文件与权限

私钥是这套体系里唯一需要真正保密的东西：

```bash
# 私钥只允许属主读取；目录同样收紧
sudo chmod 700 /etc/letsencrypt/archive /etc/letsencrypt/live
sudo chmod 600 /etc/letsencrypt/archive/<域名>/privkey*.pem
sudo chown root:root /etc/letsencrypt/archive/<域名>/privkey*.pem

# 确认一下：不应该出现 group/other 可读
ls -l /etc/letsencrypt/live/<域名>/
```

要点：

- **`chmod 600` + 属主为 root** 是常见且安全的做法。ACME 客户端通常会自己设好合理权限，**先看现状再改**。
- **不要把私钥复制到 Web 根目录、临时目录、聊天工具或 Git 仓库里。** 需要给别的服务用时，考虑权限组或 ACL，而不是 `chmod 644`。
- nginx 的 **master 进程通常以 root 启动**，因此能读取 root 属主的私钥；**如果你的部署方式不同（容器、非 root 运行），要确保读证书的那个用户有权限**，否则表现是"配置正确但启动失败"。
- **`chmod -R 777 /etc/letsencrypt` 是绝对错误的**：它解决了权限报错，同时把私钥交给了机器上的每个用户。
- **备份要连证书一起考虑**，但**备份里的私钥同样要加密保管**（见 [异地备份](/tutorials/ops/offsite-backup)）。

## 10. 反向代理链

当 HTTPS 由 nginx 终结、请求再转发给面板时，**"协议"这件事在链路里变成了两个不同的概念**：

```text
玩家浏览器  --HTTPS-->  nginx（终结 TLS）  --HTTP(127.0.0.1)-->  面板
```

由此产生的三个常见问题：

| 问题 | 表现 | 处理 |
| --- | --- | --- |
| 面板生成的链接是 `http://` | 页面里的资源或跳转被浏览器拦下 | 转发 `X-Forwarded-Proto $scheme`，并按面板官方文档配置"外部地址/受信任代理" |
| 面板认为"连接不安全"，拒绝设 Cookie | 登录后立刻掉线 | 同上；部分面板需要在配置里显式声明 HTTPS |
| WebSocket 连不上 | 控制台空白、一直转圈 | 转发 `Upgrade` 与 `Connection` 头，并设置 `proxy_http_version 1.1` |

**如果前面还有一层 CDN**（Cloudflare 之类），链路会变成"浏览器 → CDN（TLS 终结）→ 源站（又一段 TLS）"，两端**各自需要自己的证书与配置**；**源站证书是否校验、用什么模式，是 CDN 服务商的行为，以官方文档为准**。这类链路里排查"到底是谁的证书过期"，第 8 节的 `-servername` 检查方法会很有用。

面板侧的完整配置见 [面板管理工具的使用与安全](/tutorials/ops/panels)。

## 11. 自签证书：什么时候可以接受

自签证书（自己当 CA 签给自己）**不是"免费的 HTTPS"**，它的定位是：

| 场景 | 是否可用 |
| --- | --- |
| 只有你自己在内网访问（例如 [家用电脑开服与维护](/tutorials/ops/home-hosting) 里的内网场景）、且你能把自签 CA 装进自己设备的信任库 | **可以** |
| 临时测试、还没绑定域名的阶段 | **可以**，但要清楚它随时会被替换 |
| 面向公网、给玩家或协管使用 | **不可以**：所有人都会看到浏览器警告 |
| 给 API 客户端、机器人、插件调用 | **通常不行**：很多客户端默认拒绝不受信任的证书，且**改配置去忽略校验是更糟的选择** |

必须知道的现实：

- **浏览器警告无法"配置掉"**：用户看到的是"你的连接不是私密连接"，需要手动点"高级 → 继续"。**这会训练用户忽略警告，本身就是一个安全问题。**
- 想让自签证书不报警告，**必须把自签 CA 导入每台客户端设备**；设备一多，这件事的维护成本会超过申请一张免费证书。
- 内部场景如果确实需要，用 **mkcert**、**step-ca** 这类专门做内部 CA 的工具，比手敲 `openssl req` 更不容易出错（**具体用法以各自官方文档为准**）。
- **绝不要**在自签证书的站点上启用 HSTS。

## 12. 监控与清单

**证书过期是"完全可以提前知道"的故障**，所以它应该被监控，而不是被祈祷。最低要求：**在剩余有效期少于 14 天时告警**。做法有两种，**建议都做**：

1. **外部 HTTPS 检查**：让一台不在本机的监控每隔几分钟请求一次面板地址，并检查证书到期时间。很多监控工具（如 Uptime Kuma）的 HTTPS 监控会直接显示证书信息。见 [监控与告警](/tutorials/ops/monitoring)。
2. **本地到期检查**：在服务器上读证书文件算剩余天数，写入监控指标或直接发通知。

```bash
# 一行版：打印剩余天数（date 的 -d 选项是 GNU 的写法，其他系统请用对应的日期命令）
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -enddate \
  | cut -d= -f2 \
  | xargs -I{} date -d "{}" +%s \
  | awk -v now="$(date +%s)" '{ printf "剩余 %d 天\n", ($1 - now) / 86400 }'
```
:::tip 告警要能发现"续期没成功"
只监控"证书还有几天"是不够的——**它会提前 30 天就报"快到期"，然后你可能习惯了这条告警**。更好的组合是：**续期任务失败告警**（timer/cron 的失败通知）**加上**"剩余天数 < 14 天"告警。前者告诉你"自动续期坏了"，后者是最后的兜底。
:::

### 12.1 上线检查清单

| 检查项 | 怎么做 | 通过标准 |
| --- | --- | --- |
| 证书已签发 | `certbot certificates` | 域名正确，到期时间在未来 |
| 用的是完整链 | 看 nginx 配置里的 `ssl_certificate` | 指向 `fullchain.pem`，不是单独的 `cert.pem` |
| 协议版本正确 | 浏览器或 `openssl s_client` 检查 | 协商到 TLS 1.2 / 1.3 |
| HTTP 跳转到 HTTPS | 用 `http://` 访问一次 | 301/308 跳转，且不出现混合内容告警 |
| 校验路径可用 | `curl -I http://域名/.well-known/acme-challenge/<测试文件>` | 返回 200（不要被跳转吃掉） |
| 自动续期任务在跑 | `systemctl list-timers` 或看 `/etc/cron.d/` | 有且只有一个续期任务 |
| 续期演练通过 | `certbot renew --dry-run` | 无报错 |
| 续期后会重载 | 检查 deploy hook | 续期成功后 nginx 真的重载 |
| 私钥权限收紧且无外泄副本 | `ls -l` + `stat`，并搜一遍磁盘与 Git 历史 | 非属主不可读，私钥只存在于证书目录与其加密备份中 |
| 到期告警已配 | 监控面板 | 故意把阈值调大验证一次告警能发出来 |
| 面板/地图真的能用 | 用浏览器实际访问一次 | 登录、控制台、地图都正常，无证书警告 |

## 下一步

- 面板侧的安全与反代：[面板管理工具的使用与安全](/tutorials/ops/panels)
- 到期告警与监控体系：[监控与告警](/tutorials/ops/monitoring)
- 主机加固：[系统安全加固](/tutorials/ops/system-security)
- 对外发布与端口：[部署到可访问环境](/tutorials/java/deploy)
- 换机器时证书怎么处理：[服务器迁移](/tutorials/ops/server-migration)
- 备份与恢复（含证书目录）：[异地备份](/tutorials/ops/offsite-backup)

---

> 价格、套餐与各软件的配置以服务商与官方文档为准。
