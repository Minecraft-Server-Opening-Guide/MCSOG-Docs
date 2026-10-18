---
title: 用 Docker 部署 Java 版服務端
slug: docker
cat: java
level: 3
order: 25
minutes: 16
tags: [Docker, compose, Java, paper, container, deployment, 備份]
updated: 2026-10-04
draft: false
---

前面幾篇都是在宿主機上直接裝 Java、直接跑服務端 jar。這一篇換成**容器**：用一份 `docker-compose.yml` 把服務端連同它的執行環境一起描述出來，交給 Docker 去跑。

容器不是必須的，但它能解決幾個長期存在的麻煩：**宿主機被 Java 版本汙染、換機器要重來一遍、升級出錯後回不去**。代價是你要多學一層工具，並且把「卷與備份」當成紀律來執行。

## 1. 為什麼要容器化

### 1.1 收益

| 收益 | 具體表現 |
| --- | --- |
| **環境乾淨、互不干擾** | Java 執行時在映像裡，宿主機不需要裝任何 JDK；同時開 1.20 與 1.21 兩台服務端也不用搶系統 Java 版本 |
| **可復現** | 映像標籤、核心類型、版本、記憶體、埠全部寫在一個檔案裡，換機器只要把這個檔案帶過去 |
| **回滾容易** | 升級前備份 `/data`，升級後有問題就改回版本號重啟；映像標籤也可以固定 |
| **行程管理省心** | 崩潰自動重啟、開機自啟由 `restart` 策略負責，不用自己寫 systemd 單元 |
| **刪除乾淨** | 不想要了就是刪容器和卷，不會在宿主機上留下散落的目錄和使用者 |

### 1.2 代價與前提

| 代價 | 說明 |
| --- | --- |
| **多一層要學** | 映像、容器、卷、網路、Compose 這幾個概念繞不開；出錯時要會看 `docker compose logs` |
| **卷與備份紀律** | 存檔不在「你熟悉的目錄」裡，而在卷裡；不主動備份就等於沒有備份 |
| **效能開銷小但不為零** | 網路多一層 NAT、檔案系統多一層 overlay，開銷通常遠小於服務端自身的瓶頸；但**記憶體與 CPU 的限額設錯，會直接拖慢或殺死服務端** |
| **個別核心/插件要調整** | 需要控制台輸入、需要額外埠、需要特定 Java 版本、依賴原生庫的插件，可能要額外配置；詳見 [效能最佳化](/tutorials/java/optimize) 與 [插件管理](/tutorials/java/plugin-manage) |

:::note 容器不是虛擬機器
容器和宿主機共用核心，所以「隔離」指的是行程與檔案系統層面的隔離，不是安全邊界。容器裡的 root 在宿主機上並不自動等於 root，但**把 Docker 權限給誰，就等於把宿主機 root 給了誰**。
:::

## 2. 安裝 Docker 與 Compose 插件

不要複製來源不明的「一鍵安裝腳本」。下面給出 **Ubuntu / Debian** 的完整手動安裝流程（每個指令都說明作用），其他發行版與 Windows / macOS 見本節末尾的官方入口。

### 2.1 更新系統並清理舊版本

```bash
sudo apt update
sudo apt upgrade -y
```

先檢查系統裡是否裝過 `docker.io`、`docker-compose`、`podman-docker`、`containerd`、`runc` 等舊包——它們會和官方版本**衝突**（搶埠、搶設定檔、搶依賴）：

```bash
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)
```

指令拆解：`dpkg --get-selections` 列出已安裝包，`cut -f1` 只取包名，`apt remove` 逐個解除安裝。

:::note 提示
如果系統從未裝過 Docker，這條指令會提示「找不到這些包」，**屬於正常現象**，可以忽略。
:::

### 2.2 安裝前置依賴

Docker 官方倉庫走 HTTPS，需要系統具備憑證校驗與下載能力：

```bash
sudo apt install -y ca-certificates curl
```

- `ca-certificates`：根憑證集合，讓系統能驗證 HTTPS 網站身份，避免下載金鑰時報憑證錯誤。
- `curl`：命令列下載工具，用於獲取 Docker 的 GPG 公鑰。

### 2.3 新增 Docker 官方 GPG 金鑰

包管理器需要用「數字簽名公鑰」校驗軟體來源，防止下載到被篡改的包。

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

逐條說明：

- `install -m 0755 -d /etc/apt/keyrings`：建立專門存放第三方源金鑰的目錄，權限 `rwxr-xr-x`。
- `curl -fsSL ... -o ...`：下載公鑰並儲存。`-f` 遇錯靜默失敗（不寫入錯誤頁）、`-s` 靜默、`-S` 出錯仍顯示、`-L` 跟隨跳轉、`-o` 指定輸出路徑。
- `chmod a+r`：給所有使用者讀權限。**這一步不能省**，否則 `apt update` 讀取金鑰時會失敗。

如果 `curl` 因網路問題失敗，可改用 `wget`：

```bash
sudo wget -O /etc/apt/keyrings/docker.asc https://download.docker.com/linux/ubuntu/gpg
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 2.4 新增 Docker 官方 APT 源

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

- 這是 **DEB822 格式**（Ubuntu 22.04+ 與較新 Debian 支援），比舊的單行 `sources.list` 更清晰。
- `Suites` 用 `$(. /etc/os-release && echo ...)` **動態讀取本機版本代號**（如 `jammy`、`noble`、`bookworm`），保證源與系統版本嚴格匹配；你也可以把代號直接寫死。
- `Signed-By` 指向剛才的金鑰，確保從此源下載的包都經過 Docker 官方簽名驗證。

:::warn Debian 使用者注意
Debian 上的倉庫位址是 `https://download.docker.com/linux/debian`，版本代號取自 `VERSION_CODENAME`（如 `bookworm`），寫法與上面一致，只是把 `ubuntu` 換成 `debian`。
:::

### 2.5 安裝 Docker 引擎與 Compose

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

各元件作用：

| 包名 | 作用 |
| --- | --- |
| `docker-ce` | Docker 社群版核心引擎，負責建立與管理容器 |
| `docker-ce-cli` | 命令列客戶端，提供 `docker` 指令 |
| `containerd.io` | 底層容器執行時，管理容器生命週期 |
| `docker-buildx-plugin` | 構建插件，支援多平台映像構建 |
| `docker-compose-plugin` | Compose v2 插件，提供 `docker compose` 指令 |

### 2.6 啟動並驗證

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

看到 `active (running)` 即正常（按 `q` 退出狀態頁）。`enable` 讓 Docker 開機自啟。

然後用官方測試映像驗證「能拉取、能執行」：

```bash
sudo docker run --rm hello-world
```

出現 `Hello from Docker!` 說明環境正常。

### 2.7 配置國內映像加速（中國大陸伺服器建議）

Docker Hub 的映像層在國內直連往往很慢甚至逾時。可以在**不改變映像名**的前提下配置加速器，讓 `docker pull` 自動走映像站。

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

驗證是否生效：

```bash
docker info | grep -A5 "Registry Mirrors"
```

:::warn 關於第三方映像站
上面列出的加速站都是**社群維護的第三方服務**，可用性、限速策略與安全性會隨時變化，也可能某天直接停服。

- 只用它們**拉取公開映像**，不要把私有映像或憑據經過它們；
- 若某站失效，從列表裡刪掉再 `systemctl restart docker` 即可；
- 正式環境更穩的做法是自建映像倉庫（如 Harbor），或使用雲廠商提供的容器映像服務。
:::

另一種臨時做法是**在映像名前直接加字首**（例如 `docker run docker.1ms.run/hello-world`），但這樣拉下來的映像名會帶上字首，與不帶字首的同名映像**被系統視為兩個不同映像**，容易造成重複拉取與磁碟浪費，**不推薦長期使用**。

### 2.8 關於 docker 使用者組

Linux 上把使用者加入 `docker` 組後可以免 `sudo`：

```bash
sudo usermod -aG docker $USER
# 需要重新登录（或 newgrp docker）才生效
```

:::warn 這等價於給該使用者宿主機 root 權限
能掛載任意目錄、能起特權容器、能改 iptables。個人機器可以接受，**多使用者伺服器上要慎重**。相關加固見 [系統安全加固](/tutorials/ops/system-security)。
:::

### 2.9 其他平台的官方入口

| 平台 | 官方入口 |
| --- | --- |
| Linux（各發行版） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux 的 Compose 插件 | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

裝完先確認兩件事：**Docker 守護行程能用**，**Compose 是 v2 插件（`docker compose`，中間是空格，不是 `docker-compose`）**。

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::warn 關於 docker 使用者組
Linux 上把使用者加進 `docker` 組後，可以不用 `sudo` 跑 Docker，但**這等價於給該使用者宿主機 root 權限**（能掛載任意目錄、能起特權容器）。個人機器可以接受，多使用者伺服器上要慎重。相關加固見 [系統安全加固](/tutorials/ops/system-security)。
:::

## 3. 映像：`itzg/minecraft-server`

Java 版社群裡最常用的映像是 **`itzg/minecraft-server`**（維護活躍、文件齊全，支援 Vanilla / Paper / Purpur / Fabric / NeoForge / Forge 等多種核心）。它把「下載核心、生成配置、接受 EULA、開 RCON」這些步驟都做成了環境變數。

```bash
docker pull itzg/minecraft-server
```

:::warn 映像要挑來源，標籤要固定
只從官方或長期維護的映像拉取；**正式環境不要永遠用 `latest`**——`latest` 會在某次 `pull` 後悄悄換成新版本，出問題時你無法判斷是配置變了還是版本變了。要跟最新版，就顯式寫版本號並在升級前備份。
:::

## 4. 一份完整的 `docker-compose.yml`

新建一個目錄（例如 `~/mcsog-java`），在裡面建立 `docker-compose.yml`：

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

Compose v2 **不再需要**頂層的 `version:` 欄位，寫了會被忽略（部分版本會給出提示）。

逐項說明：

| 欄位 | 作用 |
| --- | --- |
| `image` | 使用哪個映像。省略標籤等於 `:latest`，不推薦 |
| `container_name` | 固定容器名，後面 `logs` / `exec` / `attach` 都用它，比自動生成的名字好記 |
| `ports` | `宿主机端口:容器端口/协议`。Java 版是 **TCP 25565**，寫成 `"25565:25565/tcp"` 最不容易誤解 |
| `environment` | 映像讀取的配置，見第 6 節表格 |
| `volumes` | `卷名:/data`。**存檔、插件、配置全在 `/data`**，這是整個部署裡唯一不能丟的東西 |
| `stdin_open: true` | 保持容器的標準輸入開啟，否則你沒法往服務端控制台**打字** |
| `tty: true` | 分配一個偽終端，讓控制台有正常的互動與回顯（配合 `docker attach` 使用） |
| `restart: unless-stopped` | 崩潰或宿主機重啟後自動拉起；但**手動 `docker compose stop` 之後不會被自動拉起**，符合直覺 |

`volumes` 裡顯式寫了 `name: mcsog-java-data`，是為了讓卷名**可預測**。不寫的話 Compose 會自動加專案名字首（變成 `mcsogjava_mcsog-java-data` 之類），後面寫備份指令時很容易指錯卷。

:::note `EULA=TRUE` 是法律要求，不是技術開關
`EULA: "TRUE"` 表示**你已閱讀並同意 [Minecraft 最終使用者許可協議](https://aka.ms/MinecraftEULA)**。這是使用服務端軟體的前提條件，映像只是把你的聲明寫進 `eula.txt`。不寫這個變數（或寫成 `FALSE`），服務端會啟動後立刻退出。請先真的讀一遍協議再填。
:::

:::tip 改完先做一次「體檢」
每次改完 compose 檔案先跑一次 `docker compose config`：它會把埠、卷、環境變數展開列印出來，寫錯的地方會當場報錯，比啟動之後翻日誌快得多。
:::

```bash
docker compose config
```

## 5. 網路與防火牆（最容易踩坑的一節）

這一節是本篇最重要的部分。Docker 的網路行為**和「裝個軟體、開個埠」的直覺完全不同**，很多「防火牆明明放行了卻還是被掃到」「內網突然不通」「換台機器就連不上」的問題，根源都在這裡。

### 5.1 系統防火牆管不住 Docker

**結論先說：`ufw`、`firewalld`、`iptables` 裡你手寫的那幾條規則，對 Docker 容器對映出來的埠全部無效。**

原因在於 Docker 的啟動順序與規則位置：

- Docker 守護行程啟動時，會**自己建立** `iptables` 規則，包括 `nat` 表的 `DOCKER` 鏈和 `filter` 表的 `DOCKER`、`DOCKER-ISOLATION`、`DOCKER-USER` 鏈。
- 這些規則會被插入到系統防火牆規則的**前面**（`FORWARD` 鏈的最前端），並且 Docker 會主動在 `FORWARD` 鏈上放行。
- 結果：資料包在到達 `ufw` 的規則之前，就已經被 Docker 的規則處理掉了。

驗證方法（**建議實際做一遍，印象最深**）：

```bash
# 1. 先明确拒绝该端口
sudo ufw deny 25565/tcp

# 2. 确认规则已生效
sudo ufw status numbered

# 3. 启动一个映射了该端口的容器
docker run -d --name test-web -p 25565:80 nginx

# 4. 从另一台机器访问
#    telnet 你的公网IP 25565
#    → 会成功。ufw 的 deny 被完全绕过。
```

### 5.2 正確的四種做法

**做法一：埠只綁回環（推薦，最安全也最簡單）**

```yaml
services:
  mc:
    ports:
      - "127.0.0.1:25565:25565/tcp"
```

加了 `127.0.0.1:` 字首後，宿主機只會在**迴環網路卡**上監聽這個埠，公網**根本無法直連**。要對外提供訪問，再由宿主機上的反向代理轉發：

```nginx
# /etc/nginx/nginx.conf（stream 模块，四层转发）
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

這樣防火牆規則重新變得有效：外部只能打到 Nginx，Nginx 再轉到本機迴環上的容器。**基岩版（UDP）同樣適用，`listen 19132 udp;` 即可。**

**做法二：使用 `DOCKER-USER` 鏈**

`DOCKER-USER` 是 Docker 官方預留、且**不會被 Docker 自己覆蓋**的鏈，適合做來源限制：

```bash
# 只允许指定来源访问 25565，其余丢弃
sudo iptables -I DOCKER-USER -p tcp --dport 25565 ! -s 203.0.113.0/24 -j DROP

# 查看规则
sudo iptables -L DOCKER-USER -n --line-numbers
```

注意：

- 用 `-I`（插入到最前）而不是 `-A`，避免被前面的放行規則搶先。
- 規則**重啟後會丟失**，需要配合 `iptables-persistent` 或開機腳本持久化。
- 這條鏈只處理**轉發**流量，對 `host` 網路模式無效（見 5.4）。

**做法三：用 [ufw-docker](https://github.com/chaifeng/ufw-docker) 讓 UFW 重新管得住容器（推薦給"想繼續用 UFW 當統一入口"的人）**

前兩種做法要麼改變埠繫結方式（做法一），要麼要自己維護 iptables 規則（做法二）。**如果你希望繼續用 `ufw` 這一個工具管理所有防火牆規則**，用這個腳本是最省心的：

它的思路不是"繞過"或"停用"，而是**把 Docker 預留的 `DOCKER-USER` 連結回 UFW 的轉發鏈**，這樣 `ufw route` 指令就能直接管容器埠。

**安裝（三條指令）**：

```bash
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
sudo ufw-docker install
```

`ufw-docker install` 會做兩件事：**備份** `/etc/ufw/after.rules`，然後把規則**追加**到檔案末尾（核心一條是 `-A DOCKER-USER -j ufw-user-forward`）。它**不會**改動你的 Docker 配置，Docker 依然自己管理網路。

裝完檢查一下：

```bash
ufw-docker check     # 检查规则是否已写入
ufw-docker status    # 查看当前放行的转发规则
```

:::warn 裝完請重啟一次伺服器
作者明確提示：**有時重啟 UFW 後規則不生效**，此時重啟伺服器即可。正式環境請安排維護視窗。
:::

**日常用法**（以 Java 版 25565 為例）：

```bash
# 允许外部访问容器端口 25565（注意：填【容器端口】，不是宿主端口）
sudo ufw route allow proto tcp from any to any port 25565

# 不再允许（撤销）
sudo ufw route delete allow proto tcp from any to any port 25565

# 只看某个容器的规则
ufw-docker list mc

# 直接按容器名放行（脚本提供的便捷写法）
sudo ufw-docker allow mc 25565
sudo ufw-docker allow mc 25565/tcp

# 收回某个容器的规则
sudo ufw-docker delete allow mc 25565
```

**基岩版（UDP）同理**：

```bash
sudo ufw route allow proto udp from any to any port 19132
sudo ufw-docker allow mc-bedrock 19132/udp
```

**容器 IP 變了怎麼辦**：容器重建後 IP 會變，腳本提供了一條過載指令：

```bash
sudo ufw-docker reload
```

**為什麼用 `ufw route`（轉發鏈）而不是 `ufw allow`（輸入鏈）**：

| 指令 | 作用範圍 | 風險 |
| --- | --- | --- |
| `ufw allow 25565` | **同時**放行【宿主機】和【容器】的 25565 | 可能順帶把宿主機的服務也暴露了 |
| `ufw route allow … port 25565` | **只**放行轉發到容器的流量 | 宿主機上的 25565 仍然不開，邊界清晰 |

**可選：自定義允許訪問容器的網段**

預設只信任標準私網段（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`）。若你的內網是別的網段：

```bash
# 自动识别所有 Docker 网络的网段（增删网络后要重新执行）
sudo ufw-docker install --docker-subnets

# 或显式指定
sudo ufw-docker install --docker-subnets 192.168.207.0/24 10.207.0.0/16
```

**不用了怎麼解除安裝**：

```bash
sudo ufw-docker uninstall   # 还原 UFW 配置并删除安装的文件
```

**這個方案的好處與代價**：

| | 說明 |
| --- | --- |
| ✓ 不用停用 Docker 的 iptables | 容器照樣能訪問外網，新增 Docker 網路也不用手工維護規則 |
| ✓ 一個工具管到底 | 宿主埠用 `ufw allow`、容器埠用 `ufw route allow`，都在 `ufw status` 裡看得到 |
| ✓ 支援 IPv6 與 Swarm | 需要時自動更新 `after6.rules`；Swarm 模式下可在管理節點統一管理 |
| ✗ 是第三方腳本 | 不是 Docker 或 Canonical 官方元件，升級/審計要自己關注（腳本很短，建議讀一遍） |
| ✗ 填的是容器埠 | `-p 8080:80` 時要用 `80`，不是 `8080`，這點最容易寫錯 |
| ✗ 首次安裝後需重啟伺服器 | 見上面的警告 |

**做法四：關閉 Docker 的 iptables 管理（不推薦新手）**

```json
// /etc/docker/daemon.json
{
  "iptables": false
}
```

改完 `sudo systemctl restart docker`。代價是：

- **埠對映（`-p`）會失效**，因為 NAT 規則不再自動生成；
- 容器預設無法存取外網，需要你自己配 SNAT；
- 容器之間跨網橋通訊也會受影響。

只有在你完全清楚要自己接管 NAT 時才這樣做。

### 5.3 埠對映的三種寫法與區別

| 寫法 | 監聽位址 | 誰能訪問 | 適用場景 |
| --- | --- | --- | --- |
| `-p 25565:25565` | `0.0.0.0`（所有網路卡） | **公網 + 內網全部** | 只有在你已用安全組/雲防火牆兜底時才可接受 |
| `-p 127.0.0.1:25565:25565` | 僅迴環 | **僅本機** | **推薦**：配反向代理或 SSH 隧道 |
| `-p 192.168.1.10:25565:25565` | 指定網路卡 | 僅該網段 | 純內網/區域網路伺服器 |

**關鍵點**：`-p 25565:25565` 的預設行為是綁 `0.0.0.0`，也就是**一旦對映就等於對公網開放**（雲廠商安全組是另一道閘，但那不是本機防火牆）。很多人以為「我沒動防火牆所以是安全的」，其實埠已經全開了。

### 5.4 五種網路模式怎麼選

| 模式 | 說明 | 優點 | 缺點 | 什麼時候用 |
| --- | --- | --- | --- | --- |
| `bridge`（預設） | 容器接在 `docker0` 網橋上，通過 NAT 出網 | 隔離好、埠可控 | 多一層 NAT；`-p` 才可達 | **絕大多數場景** |
| `host` | 容器**直接使用宿主機網路棧**，不建網橋、不做 NAT | 效能最好、延遲最低 | **完全失去網路隔離**；埠衝突；`-p` 被忽略；Docker 的防火牆規則也不適用 | 極致效能或埠複雜的場景 |
| `macvlan` | 給容器分配獨立 MAC 與區域網路 IP，看起來像區域網路裡的一台真機 | **區域網路內可直接發現**（基岩版區域網路列表、Java 版 LAN 廣播） | 需要交換器/路由器配合；部分雲環境不支援 | 區域網路連線、需要廣播發現的場景 |
| `overlay` | 跨多台宿主機的虛擬網路（Swarm 用） | 多機叢集 | 複雜度高 | 多機部署 |
| `none` | 無網路 | 完全隔離 | 容器不能聯網 | 純離線計算任務 |

```yaml
# host 模式示例（注意：此时 ports 段无意义）
services:
  mc:
    network_mode: host
    environment:
      SERVER_PORT: "25565"
```

:::warn host 模式下防火牆反而"有效"了，但埠也真的全開
`host` 模式不經過 Docker 的 NAT 規則，所以 `ufw` 這時**能**擋住埠。但容器直接佔用宿主埠，**只要服務端在監聽，公網就能連**，安全性完全依賴你的系統防火牆與安全組。用之前務必確認規則寫對。
:::

### 5.5 `docker0` 網段衝突（內網突然不通的頭號原因）

Docker 預設給 `docker0` 網橋分配 **`172.17.0.0/16`**，每建一個自定義網路再依次佔用 `172.18.0.0/16`、`172.19.0.0/16`……

**問題在於**：如果你的**公司內網、VPN、雲廠商內網**也在用 `172.17.x.x`，宿主機就會同時存在兩條指向同一網段的路由，表現為：

- 容器訪問內網服務逾時；
- 宿主機訪問某些內網位址時好時壞；
- SSH 到別的機器突然斷開。

**排查**：

```bash
ip route | grep 172
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**修復**（改 Docker 的預設位址池，**需要重啟 Docker，會短暫中斷所有容器**）：

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
# 已有的自定义网络不会自动改，需要删除重建
docker network ls
docker network rm <网络名>
```

選擇位址池的原則：**避開你所有內網網段**（常見要避開 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 中你實際在用的部分）。若內網已佔用 `10.x`，可改用 `100.64.0.0/16` 這類運營商級 NAT 段。

### 5.6 容器之間怎麼互相訪問

**同一個自定義網路裡，用「服務名」當主機名，不要用 `localhost`。**

```yaml
services:
  mc:
    networks: [mcnet]
  backup:
    networks: [mcnet]
    environment:
      TARGET: "mc:25565"     # 正确：服务名
      # TARGET: "127.0.0.1:25565"  # 错误：那是 backup 容器自己
networks:
  mcnet:
    driver: bridge
```

補充要點：

- **預設的 `bridge` 網路不支援服務名解析**，必須自己建一個網路（`docker network create` 或用 Compose 的 `networks`）。Compose 預設會為專案建立一個網路，所以用 Compose 通常沒問題。
- **容器 IP 會在重建後變化**，所以任何配置裡都不要寫容器 IP，一律寫服務名。
- 想讓容器訪問**宿主機**上的服務（例如宿主機的 MySQL），用 `host.docker.internal`（Linux 需在 `extra_hosts` 裡加 `host-gateway`），或用 `--network host`。

### 5.7 網路相關常見坑速查

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| `ufw` 放行/拒絕了，容器埠行為都不變 | Docker 繞過系統防火牆 | 用 `-p 127.0.0.1:` 或 `DOCKER-USER` 鏈 |
| 埠沒想開卻能從公網訪問 | `-p` 預設綁 `0.0.0.0`；系統防火牆又管不住容器 | 改成 `-p 127.0.0.1:宿主机端口:容器端口`，詳見 §5.3 |
| 容器訪問內網服務逾時 | `docker0` 網段與內網衝突 | 改 `default-address-pools` 並重建網路 |
| 區域網路列表裡看不到基岩版伺服器 | `bridge` 模式不做廣播轉發 | 改用 `macvlan` 或 `host` 模式 |
| 重建容器後連線位址失效 | 容器 IP 變了 | 改用服務名，別寫 IP |
| 容器裡連不上宿主機的服務 | `localhost` 指容器自己 | 用 `host.docker.internal` 或 `host` 網路 |
| `host` 模式下 `ports` 不生效 | `host` 模式不使用埠對映 | 直接改服務端監聽埠 |
| 大包傳輸偶發卡頓/逾時 | MTU 不匹配（部分雲廠商） | 在 `daemon.json` 設 `"mtu": 1400` 或按廠商建議值 |
| 重啟後 `DOCKER-USER` 規則丟失 | iptables 規則未持久化 | 用 `iptables-persistent` 或開機腳本 |

### 5.8 一份安全的對外暴露清單

按下面的順序檢查，任何一條不滿足都可能導致「以為沒開，其實全開」：

1. **雲廠商安全組**：只放行確實需要的埠與來源（能用固定來源就別用 `0.0.0.0/0`）。
2. **埠繫結**：`-p 127.0.0.1:...` 而不是 `-p ...`。
3. **反向代理**：由 Nginx `stream` / frp 等對外，容器埠不出本機。
4. **系統防火牆**：對**非容器**的服務仍然有效，照常配置。
5. **實測**：從**另一台機器**執行 `telnet 公网IP 端口`，或用線上埠掃描工具確認**未開放**的埠確實不可達。
6. **RCON 永遠不要對映到公網**（見 §6 環境變量表下方說明）。

## 6. 啟動、看日誌、進控制台、停止

```bash
docker compose up -d
```

第一次啟動要下載服務端核心並生成世界，**幾分鐘到十幾分鍾都正常**，不要以為卡死了：

```bash
docker compose logs -f
```

看到類似 `Done (xx.xxxs)! For help, type "help"` 就說明起來了。`Ctrl+C` 只是退出日誌跟隨，**不會停止服務端**。

進入控制台執行指令（映像內建 `rcon-cli`，會用 `RCON_PASSWORD` 自動登入）：

```bash
docker compose exec -it mcsog-java rcon-cli
docker compose exec -it mcsog-java rcon-cli list
docker compose exec -it mcsog-java rcon-cli save-all
```

需要真正的互動式控制台（能連續輸入、能看到即時回顯）時，用 `attach`：

```bash
docker attach mcsog-java
```

:::warn 用 attach 時的兩個按鍵陷阱
`docker attach` 裡按 `Ctrl+C` 會把中斷訊號發給服務端行程，**等於直接關服**（存檔可能損壞）。正確退出方式是 `Ctrl+P` 然後 `Ctrl+Q`（detach，容器繼續跑）。日常執行單條指令，優先用 `rcon-cli`。
:::

停止與刪除：

```bash
docker compose stop
docker compose down
```

| 指令 | 做了什麼 | 卷裡的資料 |
| --- | --- | --- |
| `docker compose stop` | 停止容器，容器還在 | 保留 |
| `docker compose start` | 啟動已停止的容器 | 保留 |
| `docker compose down` | 停止並**刪除容器與網路** | 保留 |
| `docker compose down -v` | 上面全部 **加上刪除卷** | **全部丟失** |

:::danger 不要隨手加 `-v`
`docker compose down -v` 會刪掉 `/data` 卷，也就是存檔、插件、配置一起沒。只有在你確認要「徹底重來」並且已有可用備份時才用它。
:::

## 7. 本文示例用到的環境變數

下表列出上面 compose 檔案裡用到的變數，以及幾個最常用的補充項。**預設值隨映像版本變化，務必以映像官方文件為準。**

| 變數 | 作用 | 示例值 |
| --- | --- | --- |
| `EULA` | 聲明已同意 Minecraft EULA，未設定會啟動失敗 | `"TRUE"` |
| `TYPE` | 服務端核心類型 | `"PAPER"`、`"VANILLA"`、`"FABRIC"`、`"NEOFORGE"` |
| `VERSION` | Minecraft 版本，必須是該核心支援的版本 | `"1.21.11"`、`"LATEST"` |
| `MEMORY` | 分配給服務端的 JVM 堆記憶體 | `"4G"` |
| `ONLINE_MODE` | 是否校驗正版帳號（對應 `online-mode`） | `"TRUE"` / `"FALSE"` |
| `ENABLE_RCON` | 是否啟用 RCON 遠端控制台 | `"true"` |
| `RCON_PASSWORD` | RCON 口令，**必須自己改成強口令** | 長隨機字串 |
| `RCON_PORT` | RCON 監聽埠（預設 25575，**不要對映到公網**） | `"25575"` |
| `TZ` | 容器時區，影響日誌時間 | `"Asia/Shanghai"` |
| `DIFFICULTY` | 遊戲難度 | `"normal"` |
| `MOTD` | 伺服器列表裡顯示的描述 | `"MCSOG Java"` |
| `MAX_PLAYERS` | 最大玩家數 | `"20"` |
| `OPS` | 直接授予管理員權限的玩家名，逗號分隔 | `"Alice,Bob"` |
| `WHITELIST` | 白名單玩家名，逗號分隔 | `"Alice,Bob"` |
| `ENFORCE_WHITELIST` | 是否強制白名單 | `"TRUE"` |
| `PUID` / `PGID` | 以指定使用者/組身份執行（用於繫結掛載的屬主問題，**用法以映像文件為準**） | `"1000"` |

:::note RCON 是「沒有介面的管理員權限」
`ENABLE_RCON: "true"` 只在容器內部監聽 `25575`。**不要把 `25575` 對映到公網**：RCON 協議不加密，一條口令就等於控制台。需要遠端管理就走 SSH 隧道或面板，見 [網路安全基礎](/tutorials/ops/network-security)。
:::

## 8. `/data` 裡有什麼

容器是「一次性」的，卷不是。下面這些全部位於 `/data`：

| 路徑 | 內容 |
| --- | --- |
| `/data/world/` | 主世界存檔（下界、末地各有獨立目錄） |
| `/data/plugins/` | 插件 jar 與它們的配置 |
| `/data/mods/` | 模組（`TYPE` 為模組核心時使用） |
| `/data/server.properties` | 服務端配置（埠、難度、`online-mode` 等） |
| `/data/eula.txt` | EULA 聲明，由 `EULA` 變數寫入 |
| `/data/logs/` | 服務端日誌 |

所以：**容器可以隨便刪，卷不能刪。** 想確認卷在哪：

```bash
docker volume ls
docker volume inspect mcsog-java-data
```

## 9. 備份與恢復

備份的物件是 `/data`，不是容器。最穩的做法是**先停服再打包**：

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

Windows PowerShell 下把掛載路徑換成 `-v "${PWD}\backups:/backup"`（Docker Desktop）。

必須保持線上、不能停服時，用控制台指令保證一致性：

```bash
docker compose exec -it mcsog-java rcon-cli save-all
docker compose exec -it mcsog-java rcon-cli save-off
```

`save-all` 把記憶體裡的資料落盤，`save-off` 關掉自動儲存，這樣打包過程中不會有新的寫入。打完包再恢復：

```bash
docker compose exec -it mcsog-java rcon-cli save-on
```

恢復時**先停容器**，清空卷再解包（這一步會覆蓋卷裡現有內容）：

```bash
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-java-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn 容器不是備份
把服務端跑在容器裡，**不等於**資料就安全了。卷和容器在同一塊磁碟上，誤刪卷、磁碟損壞、勒索軟體加密，都會一起帶走。至少保留一份**離線或異地**的副本，方法見 [備份與恢復](/tutorials/java/backup) 與 [異地備份](/tutorials/ops/offsite-backup)。**沒驗證過恢復的備份不算備份。**
:::

## 10. 更新映像、切換核心與版本

升級映像（例如修 bug 或跟新版本）：

```bash
docker compose pull
docker compose up -d
```

順序很重要：**先備份，再 pull，再 up**。`docker compose up -d` 在檢測到映像或配置變化時會重建容器，但卷會原樣掛回，所以存檔不會丟——前提是你沒刪卷。

改核心類型或版本，只改環境變數，然後重新 `up -d`：

```yaml
    environment:
      TYPE: "FABRIC"
      VERSION: "1.21.11"
```

| 變更 | 會發生什麼 | 注意事項 |
| --- | --- | --- |
| 只改 `VERSION` | 映像下載新版本核心 | **存檔格式升級是單向的**，新版存檔通常無法被舊版開啟；升級前必須備份 |
| 改 `TYPE`（插件核心之間） | 換一個核心 jar，`plugins/` 繼續用 | 插件與核心/版本必須相容 |
| 改 `TYPE`（插件核心到模組核心） | 服務端開始讀 `mods/` | 原有的 `plugins/` 不會生效，世界也可能需要額外相容處理 |
| 改 `MEMORY` | 重建容器，重新分配堆記憶體 | 不要超過宿主機可用記憶體的合理比例 |

## 11. 加插件與模組

三種方式，按你的習慣選一種即可。

**方式 A：繫結掛載（改檔案最方便）**

把 `volumes` 改成宿主機目錄：

```yaml
    volumes:
      - ./data:/data
```

之後直接在宿主機上操作 `./data/plugins/`、`./data/server.properties`。Linux 上注意屬主問題（見第 11 節）。

**方式 B：往卷裡拷檔案（保持命名卷）**

```bash
docker cp ./MyPlugin.jar mcsog-java:/data/plugins/
docker compose restart
```

**方式 C：交給映像自動下載**

映像還提供按來源自動拉取插件/模組的變數（例如按 Spiget 資源號裝插件、按 Modrinth 專案裝模組）。這些變數的名字與取值**以映像官方文件為準**，用之前先核對。

改完配置後，多數插件支援遊戲內過載，但**重啟最穩**：

```bash
docker compose restart
```

## 12. 常見坑

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| 啟動後立刻退出，日誌提到 EULA | 沒設 `EULA: "TRUE"` | 補上變數並 `docker compose up -d` |
| 容器被系統殺掉，日誌出現 OOM | `MEMORY` 設得比宿主機能給的多 | 調小 `MEMORY`，或加記憶體；宿主機也要留出餘量 |
| 外網連不上，容器裡一切正常 | 埠沒對映，或安全組沒放行 | `ports` 寫 `25565/tcp`；**雲安全組**放行。注意：**系統防火牆（ufw/firewalld）對容器埠無效**，詳見 §5.1 |
| 容器裡寫不了 `/data`，日誌報權限錯誤 | Linux 繫結掛載的屬主與容器內使用者不一致 | 修正宿主機目錄屬主，或用映像提供的使用者對映變數（`PUID`/`PGID`，**以映像文件為準**） |
| 重建容器後存檔「沒了」 | 刪了卷（如 `down -v`），或忘了掛載 `/data` | 立刻停手，從備份恢復；以後固定卷名並納入備份 |
| 控制台打不了字 | 少了 `stdin_open: true` 與 `tty: true` | 補上並重建容器 |
| `docker compose` 提示不是指令 | 裝的是舊版 `docker-compose`（v1） | 按官方文件安裝 Compose v2 插件，指令是 `docker compose` |
| 改完配置沒生效 | 只改了檔案沒重建容器 | `docker compose up -d` 讓配置生效 |

日常巡檢（容器狀態、資源佔用、磁碟餘量）建議配合 [監控與告警](/tutorials/ops/monitoring) 一起做。

## 13. 下一步

- 從零認識服務端目錄與檔案： [服務端結構](/tutorials/java/structure)
- 第一次開服的完整流程： [開啟服務端](/tutorials/java/start)
- 存檔、插件與配置的備份策略： [備份與恢復](/tutorials/java/backup)
- 卡頓排查與參數調優： [效能最佳化](/tutorials/java/optimize)
- 用面板統一管理多台服務端： [面板管理工具的使用與安全](/tutorials/ops/panels)

---

> 映像名稱、環境變數與預設埠以映像官方文件為準。
