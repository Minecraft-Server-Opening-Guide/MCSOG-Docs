---
title: 用 Docker 部署 Java 版服务端
slug: docker
cat: java
level: 3
order: 25
minutes: 16
tags: [Docker, compose, Java, paper, container, deployment, 备份]
updated: 2026-10-04
draft: false
---

前面几篇都是在宿主机上直接装 Java、直接跑服务端 jar。这一篇换成**容器**：用一份 `docker-compose.yml` 把服务端连同它的运行环境一起描述出来，交给 Docker 去跑。

容器不是必须的，但它能解决几个长期存在的麻烦：**宿主机被 Java 版本污染、换机器要重来一遍、升级出错后回不去**。代价是你要多学一层工具，并且把「卷与备份」当成纪律来执行。

## 1. 为什么要容器化

### 1.1 收益

| 收益 | 具体表现 |
| --- | --- |
| **环境干净、互不干扰** | Java 运行时在镜像里，宿主机不需要装任何 JDK；同时开 1.20 与 1.21 两台服务端也不用抢系统 Java 版本 |
| **可复现** | 镜像标签、核心类型、版本、内存、端口全部写在一个文件里，换机器只要把这个文件带过去 |
| **回滚容易** | 升级前备份 `/data`，升级后有问题就改回版本号重启；镜像标签也可以固定 |
| **进程管理省心** | 崩溃自动重启、开机自启由 `restart` 策略负责，不用自己写 systemd 单元 |
| **删除干净** | 不想要了就是删容器和卷，不会在宿主机上留下散落的目录和用户 |

### 1.2 代价与前提

| 代价 | 说明 |
| --- | --- |
| **多一层要学** | 镜像、容器、卷、网络、Compose 这几个概念绕不开；出错时要会看 `docker compose logs` |
| **卷与备份纪律** | 存档不在「你熟悉的目录」里，而在卷里；不主动备份就等于没有备份 |
| **性能开销小但不为零** | 网络多一层 NAT、文件系统多一层 overlay，开销通常远小于服务端自身的瓶颈；但**内存与 CPU 的限额设错，会直接拖慢或杀死服务端** |
| **个别核心/插件要调整** | 需要控制台输入、需要额外端口、需要特定 Java 版本、依赖原生库的插件，可能要额外配置；详见 [性能优化](/tutorials/java/optimize) 与 [插件管理](/tutorials/java/plugin-manage) |

:::note 容器不是虚拟机
容器和宿主机共用内核，所以「隔离」指的是进程与文件系统层面的隔离，不是安全边界。容器里的 root 在宿主机上并不自动等于 root，但**把 Docker 权限给谁，就等于把宿主机 root 给了谁**。
:::

## 2. 安装 Docker 与 Compose 插件

不要复制来源不明的「一键安装脚本」。下面给出 **Ubuntu / Debian** 的完整手动安装流程（每个命令都说明作用），其它发行版与 Windows / macOS 见本节末尾的官方入口。

### 2.1 更新系统并清理旧版本

```bash
sudo apt update
sudo apt upgrade -y
```

先检查系统里是否装过 `docker.io`、`docker-compose`、`podman-docker`、`containerd`、`runc` 等旧包——它们会和官方版本**冲突**（抢端口、抢配置文件、抢依赖）：

```bash
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)
```

命令拆解：`dpkg --get-selections` 列出已安装包，`cut -f1` 只取包名，`apt remove` 逐个卸载。

:::note 提示
如果系统从未装过 Docker，这条命令会提示「找不到这些包」，**属于正常现象**，可以忽略。
:::

### 2.2 安装前置依赖

Docker 官方仓库走 HTTPS，需要系统具备证书校验与下载能力：

```bash
sudo apt install -y ca-certificates curl
```

- `ca-certificates`：根证书集合，让系统能验证 HTTPS 站点身份，避免下载密钥时报证书错误。
- `curl`：命令行下载工具，用于获取 Docker 的 GPG 公钥。

### 2.3 添加 Docker 官方 GPG 密钥

包管理器需要用「数字签名公钥」校验软件来源，防止下载到被篡改的包。

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

逐条说明：

- `install -m 0755 -d /etc/apt/keyrings`：创建专门存放第三方源密钥的目录，权限 `rwxr-xr-x`。
- `curl -fsSL ... -o ...`：下载公钥并保存。`-f` 遇错静默失败（不写入错误页）、`-s` 静默、`-S` 出错仍显示、`-L` 跟随跳转、`-o` 指定输出路径。
- `chmod a+r`：给所有用户读权限。**这一步不能省**，否则 `apt update` 读取密钥时会失败。

如果 `curl` 因网络问题失败，可改用 `wget`：

```bash
sudo wget -O /etc/apt/keyrings/docker.asc https://download.docker.com/linux/ubuntu/gpg
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 2.4 添加 Docker 官方 APT 源

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

- 这是 **DEB822 格式**（Ubuntu 22.04+ 与较新 Debian 支持），比旧的单行 `sources.list` 更清晰。
- `Suites` 用 `$(. /etc/os-release && echo ...)` **动态读取本机版本代号**（如 `jammy`、`noble`、`bookworm`），保证源与系统版本严格匹配；你也可以把代号直接写死。
- `Signed-By` 指向刚才的密钥，确保从此源下载的包都经过 Docker 官方签名验证。

:::warn Debian 用户注意
Debian 上的仓库地址是 `https://download.docker.com/linux/debian`，版本代号取自 `VERSION_CODENAME`（如 `bookworm`），写法与上面一致，只是把 `ubuntu` 换成 `debian`。
:::

### 2.5 安装 Docker 引擎与 Compose

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

各组件作用：

| 包名 | 作用 |
| --- | --- |
| `docker-ce` | Docker 社区版核心引擎，负责创建与管理容器 |
| `docker-ce-cli` | 命令行客户端，提供 `docker` 命令 |
| `containerd.io` | 底层容器运行时，管理容器生命周期 |
| `docker-buildx-plugin` | 构建插件，支持多平台镜像构建 |
| `docker-compose-plugin` | Compose v2 插件，提供 `docker compose` 命令 |

### 2.6 启动并验证

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

看到 `active (running)` 即正常（按 `q` 退出状态页）。`enable` 让 Docker 开机自启。

然后用官方测试镜像验证「能拉取、能运行」：

```bash
sudo docker run --rm hello-world
```

出现 `Hello from Docker!` 说明环境正常。

### 2.7 配置国内镜像加速（中国大陆服务器建议）

Docker Hub 的镜像层在国内直连往往很慢甚至超时。可以在**不改变镜像名**的前提下配置加速器，让 `docker pull` 自动走镜像站。

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

验证是否生效：

```bash
docker info | grep -A5 "Registry Mirrors"
```

:::warn 关于第三方镜像站
上面列出的加速站都是**社区维护的第三方服务**，可用性、限速策略与安全性会随时变化，也可能某天直接停服。

- 只用它们**拉取公开镜像**，不要把私有镜像或凭据经过它们；
- 若某站失效，从列表里删掉再 `systemctl restart docker` 即可；
- 生产环境更稳的做法是自建镜像仓库（如 Harbor），或使用云厂商提供的容器镜像服务。
:::

另一种临时做法是**在镜像名前直接加前缀**（例如 `docker run docker.1ms.run/hello-world`），但这样拉下来的镜像名会带上前缀，与不带前缀的同名镜像**被系统视为两个不同镜像**，容易造成重复拉取与磁盘浪费，**不推荐长期使用**。

### 2.8 关于 docker 用户组

Linux 上把用户加入 `docker` 组后可以免 `sudo`：

```bash
sudo usermod -aG docker $USER
# 需要重新登录（或 newgrp docker）才生效
```

:::warn 这等价于给该用户宿主机 root 权限
能挂载任意目录、能起特权容器、能改 iptables。个人机器可以接受，**多用户服务器上要慎重**。相关加固见 [系统安全加固](/tutorials/ops/system-security)。
:::

### 2.9 其它平台的官方入口

| 平台 | 官方入口 |
| --- | --- |
| Linux（各发行版） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux 的 Compose 插件 | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

装完先确认两件事：**Docker 守护进程能用**，**Compose 是 v2 插件（`docker compose`，中间是空格，不是 `docker-compose`）**。

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::warn 关于 docker 用户组
Linux 上把用户加进 `docker` 组后，可以不用 `sudo` 跑 Docker，但**这等价于给该用户宿主机 root 权限**（能挂载任意目录、能起特权容器）。个人机器可以接受，多用户服务器上要慎重。相关加固见 [系统安全加固](/tutorials/ops/system-security)。
:::

## 3. 镜像：`itzg/minecraft-server`

Java 版社区里最常用的镜像是 **`itzg/minecraft-server`**（维护活跃、文档齐全，支持 Vanilla / Paper / Purpur / Fabric / NeoForge / Forge 等多种核心）。它把「下载核心、生成配置、接受 EULA、开 RCON」这些步骤都做成了环境变量。

```bash
docker pull itzg/minecraft-server
```

:::warn 镜像要挑来源，标签要固定
只从官方或长期维护的镜像拉取；**生产环境不要永远用 `latest`**——`latest` 会在某次 `pull` 后悄悄换成新版本，出问题时你无法判断是配置变了还是版本变了。要跟最新版，就显式写版本号并在升级前备份。
:::

## 4. 一份完整的 `docker-compose.yml`

新建一个目录（例如 `~/mcsog-java`），在里面创建 `docker-compose.yml`：

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

Compose v2 **不再需要**顶层的 `version:` 字段，写了会被忽略（部分版本会给出提示）。

逐项说明：

| 字段 | 作用 |
| --- | --- |
| `image` | 使用哪个镜像。省略标签等于 `:latest`，不推荐 |
| `container_name` | 固定容器名，后面 `logs` / `exec` / `attach` 都用它，比自动生成的名字好记 |
| `ports` | `宿主机端口:容器端口/协议`。Java 版是 **TCP 25565**，写成 `"25565:25565/tcp"` 最不容易误解 |
| `environment` | 镜像读取的配置，见第 6 节表格 |
| `volumes` | `卷名:/data`。**存档、插件、配置全在 `/data`**，这是整个部署里唯一不能丢的东西 |
| `stdin_open: true` | 保持容器的标准输入打开，否则你没法往服务端控制台**打字** |
| `tty: true` | 分配一个伪终端，让控制台有正常的交互与回显（配合 `docker attach` 使用） |
| `restart: unless-stopped` | 崩溃或宿主机重启后自动拉起；但**手动 `docker compose stop` 之后不会被自动拉起**，符合直觉 |

`volumes` 里显式写了 `name: mcsog-java-data`，是为了让卷名**可预测**。不写的话 Compose 会自动加项目名前缀（变成 `mcsogjava_mcsog-java-data` 之类），后面写备份命令时很容易指错卷。

:::note `EULA=TRUE` 是法律要求，不是技术开关
`EULA: "TRUE"` 表示**你已阅读并同意 [Minecraft 最终用户许可协议](https://aka.ms/MinecraftEULA)**。这是使用服务端软件的前提条件，镜像只是把你的声明写进 `eula.txt`。不写这个变量（或写成 `FALSE`），服务端会启动后立刻退出。请先真的读一遍协议再填。
:::

:::tip 改完先做一次「体检」
每次改完 compose 文件先跑一次 `docker compose config`：它会把端口、卷、环境变量展开打印出来，写错的地方会当场报错，比启动之后翻日志快得多。
:::

```bash
docker compose config
```

## 5. 网络与防火墙（最容易踩坑的一节）

这一节是本篇最重要的部分。Docker 的网络行为**和「装个软件、开个端口」的直觉完全不同**，很多「防火墙明明放行了却还是被扫到」「内网突然不通」「换台机器就连不上」的问题，根源都在这里。

### 5.1 系统防火墙管不住 Docker

**结论先说：`ufw`、`firewalld`、`iptables` 里你手写的那几条规则，对 Docker 容器映射出来的端口全部无效。**

原因在于 Docker 的启动顺序与规则位置：

- Docker 守护进程启动时，会**自己创建** `iptables` 规则，包括 `nat` 表的 `DOCKER` 链和 `filter` 表的 `DOCKER`、`DOCKER-ISOLATION`、`DOCKER-USER` 链。
- 这些规则会被插入到系统防火墙规则的**前面**（`FORWARD` 链的最前端），并且 Docker 会主动在 `FORWARD` 链上放行。
- 结果：数据包在到达 `ufw` 的规则之前，就已经被 Docker 的规则处理掉了。

验证方法（**建议实际做一遍，印象最深**）：

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

### 5.2 正确的四种做法

**做法一：端口只绑回环（推荐，最安全也最简单）**

```yaml
services:
  mc:
    ports:
      - "127.0.0.1:25565:25565/tcp"
```

加了 `127.0.0.1:` 前缀后，宿主机只会在**回环网卡**上监听这个端口，公网**根本无法直连**。要对外提供访问，再由宿主机上的反向代理转发：

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

这样防火墙规则重新变得有效：外部只能打到 Nginx，Nginx 再转到本机回环上的容器。**基岩版（UDP）同样适用，`listen 19132 udp;` 即可。**

**做法二：使用 `DOCKER-USER` 链**

`DOCKER-USER` 是 Docker 官方预留、且**不会被 Docker 自己覆盖**的链，适合做来源限制：

```bash
# 只允许指定来源访问 25565，其余丢弃
sudo iptables -I DOCKER-USER -p tcp --dport 25565 ! -s 203.0.113.0/24 -j DROP

# 查看规则
sudo iptables -L DOCKER-USER -n --line-numbers
```

注意：

- 用 `-I`（插入到最前）而不是 `-A`，避免被前面的放行规则抢先。
- 规则**重启后会丢失**，需要配合 `iptables-persistent` 或开机脚本持久化。
- 这条链只处理**转发**流量，对 `host` 网络模式无效（见 5.4）。

**做法三：用 [ufw-docker](https://github.com/chaifeng/ufw-docker) 让 UFW 重新管得住容器（推荐给"想继续用 UFW 当统一入口"的人）**

前两种做法要么改变端口绑定方式（做法一），要么要自己维护 iptables 规则（做法二）。**如果你希望继续用 `ufw` 这一个工具管理所有防火墙规则**，用这个脚本是最省心的：

它的思路不是"绕过"或"禁用"，而是**把 Docker 预留的 `DOCKER-USER` 链接回 UFW 的转发链**，这样 `ufw route` 命令就能直接管容器端口。

**安装（三条命令）**：

```bash
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
sudo ufw-docker install
```

`ufw-docker install` 会做两件事：**备份** `/etc/ufw/after.rules`，然后把规则**追加**到文件末尾（核心一条是 `-A DOCKER-USER -j ufw-user-forward`）。它**不会**改动你的 Docker 配置，Docker 依然自己管理网络。

装完检查一下：

```bash
ufw-docker check     # 检查规则是否已写入
ufw-docker status    # 查看当前放行的转发规则
```

:::warn 装完请重启一次服务器
作者明确提示：**有时重启 UFW 后规则不生效**，此时重启服务器即可。生产环境请安排维护窗口。
:::

**日常用法**（以 Java 版 25565 为例）：

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

**容器 IP 变了怎么办**：容器重建后 IP 会变，脚本提供了一条重载命令：

```bash
sudo ufw-docker reload
```

**为什么用 `ufw route`（转发链）而不是 `ufw allow`（输入链）**：

| 命令 | 作用范围 | 风险 |
| --- | --- | --- |
| `ufw allow 25565` | **同时**放行【宿主机】和【容器】的 25565 | 可能顺带把宿主机的服务也暴露了 |
| `ufw route allow … port 25565` | **只**放行转发到容器的流量 | 宿主机上的 25565 仍然不开，边界清晰 |

**可选：自定义允许访问容器的网段**

默认只信任标准私网段（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`）。若你的内网是别的网段：

```bash
# 自动识别所有 Docker 网络的网段（增删网络后要重新执行）
sudo ufw-docker install --docker-subnets

# 或显式指定
sudo ufw-docker install --docker-subnets 192.168.207.0/24 10.207.0.0/16
```

**不用了怎么卸载**：

```bash
sudo ufw-docker uninstall   # 还原 UFW 配置并删除安装的文件
```

**这个方案的好处与代价**：

| | 说明 |
| --- | --- |
| ✓ 不用禁用 Docker 的 iptables | 容器照样能访问外网，新增 Docker 网络也不用手工维护规则 |
| ✓ 一个工具管到底 | 宿主端口用 `ufw allow`、容器端口用 `ufw route allow`，都在 `ufw status` 里看得到 |
| ✓ 支持 IPv6 与 Swarm | 需要时自动更新 `after6.rules`；Swarm 模式下可在管理节点统一管理 |
| ✗ 是第三方脚本 | 不是 Docker 或 Canonical 官方组件，升级/审计要自己关注（脚本很短，建议读一遍） |
| ✗ 填的是容器端口 | `-p 8080:80` 时要用 `80`，不是 `8080`，这点最容易写错 |
| ✗ 首次安装后需重启服务器 | 见上面的警告 |

**做法四：关闭 Docker 的 iptables 管理（不推荐新手）**

```json
// /etc/docker/daemon.json
{
  "iptables": false
}
```

改完 `sudo systemctl restart docker`。代价是：

- **端口映射（`-p`）会失效**，因为 NAT 规则不再自动生成；
- 容器默认无法访问外网，需要你自己配 SNAT；
- 容器之间跨网桥通信也会受影响。

只有在你完全清楚要自己接管 NAT 时才这样做。

### 5.3 端口映射的三种写法与区别

| 写法 | 监听地址 | 谁能访问 | 适用场景 |
| --- | --- | --- | --- |
| `-p 25565:25565` | `0.0.0.0`（所有网卡） | **公网 + 内网全部** | 只有在你已用安全组/云防火墙兜底时才可接受 |
| `-p 127.0.0.1:25565:25565` | 仅回环 | **仅本机** | **推荐**：配反向代理或 SSH 隧道 |
| `-p 192.168.1.10:25565:25565` | 指定网卡 | 仅该网段 | 纯内网/局域网服务器 |

**关键点**：`-p 25565:25565` 的默认行为是绑 `0.0.0.0`，也就是**一旦映射就等于对公网开放**（云厂商安全组是另一道闸，但那不是本机防火墙）。很多人以为「我没动防火墙所以是安全的」，其实端口已经全开了。

### 5.4 五种网络模式怎么选

| 模式 | 说明 | 优点 | 缺点 | 什么时候用 |
| --- | --- | --- | --- | --- |
| `bridge`（默认） | 容器接在 `docker0` 网桥上，通过 NAT 出网 | 隔离好、端口可控 | 多一层 NAT；`-p` 才可达 | **绝大多数场景** |
| `host` | 容器**直接使用宿主机网络栈**，不建网桥、不做 NAT | 性能最好、延迟最低 | **完全失去网络隔离**；端口冲突；`-p` 被忽略；Docker 的防火墙规则也不适用 | 极致性能或端口复杂的场景 |
| `macvlan` | 给容器分配独立 MAC 与局域网 IP，看起来像局域网里的一台真机 | **局域网内可直接发现**（基岩版局域网列表、Java 版 LAN 广播） | 需要交换机/路由器配合；部分云环境不支持 | 局域网联机、需要广播发现的场景 |
| `overlay` | 跨多台宿主机的虚拟网络（Swarm 用） | 多机集群 | 复杂度高 | 多机部署 |
| `none` | 无网络 | 完全隔离 | 容器不能联网 | 纯离线计算任务 |

```yaml
# host 模式示例（注意：此时 ports 段无意义）
services:
  mc:
    network_mode: host
    environment:
      SERVER_PORT: "25565"
```

:::warn host 模式下防火墙反而"有效"了，但端口也真的全开
`host` 模式不经过 Docker 的 NAT 规则，所以 `ufw` 这时**能**挡住端口。但容器直接占用宿主端口，**只要服务端在监听，公网就能连**，安全性完全依赖你的系统防火墙与安全组。用之前务必确认规则写对。
:::

### 5.5 `docker0` 网段冲突（内网突然不通的头号原因）

Docker 默认给 `docker0` 网桥分配 **`172.17.0.0/16`**，每建一个自定义网络再依次占用 `172.18.0.0/16`、`172.19.0.0/16`……

**问题在于**：如果你的**公司内网、VPN、云厂商内网**也在用 `172.17.x.x`，宿主机就会同时存在两条指向同一网段的路由，表现为：

- 容器访问内网服务超时；
- 宿主机访问某些内网地址时好时坏；
- SSH 到别的机器突然断开。

**排查**：

```bash
ip route | grep 172
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**修复**（改 Docker 的默认地址池，**需要重启 Docker，会短暂中断所有容器**）：

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

选择地址池的原则：**避开你所有内网网段**（常见要避开 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 中你实际在用的部分）。若内网已占用 `10.x`，可改用 `100.64.0.0/16` 这类运营商级 NAT 段。

### 5.6 容器之间怎么互相访问

**同一个自定义网络里，用「服务名」当主机名，不要用 `localhost`。**

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

补充要点：

- **默认的 `bridge` 网络不支持服务名解析**，必须自己建一个网络（`docker network create` 或用 Compose 的 `networks`）。Compose 默认会为项目创建一个网络，所以用 Compose 通常没问题。
- **容器 IP 会在重建后变化**，所以任何配置里都不要写容器 IP，一律写服务名。
- 想让容器访问**宿主机**上的服务（例如宿主机的 MySQL），用 `host.docker.internal`（Linux 需在 `extra_hosts` 里加 `host-gateway`），或用 `--network host`。

### 5.7 网络相关常见坑速查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `ufw` 放行/拒绝了，容器端口行为都不变 | Docker 绕过系统防火墙 | 用 `-p 127.0.0.1:` 或 `DOCKER-USER` 链 |
| 端口没想开却能从公网访问 | `-p` 默认绑 `0.0.0.0`；系统防火墙又管不住容器 | 改成 `-p 127.0.0.1:宿主机端口:容器端口`，详见 §5.3 |
| 容器访问内网服务超时 | `docker0` 网段与内网冲突 | 改 `default-address-pools` 并重建网络 |
| 局域网列表里看不到基岩版服务器 | `bridge` 模式不做广播转发 | 改用 `macvlan` 或 `host` 模式 |
| 重建容器后连接地址失效 | 容器 IP 变了 | 改用服务名，别写 IP |
| 容器里连不上宿主机的服务 | `localhost` 指容器自己 | 用 `host.docker.internal` 或 `host` 网络 |
| `host` 模式下 `ports` 不生效 | `host` 模式不使用端口映射 | 直接改服务端监听端口 |
| 大包传输偶发卡顿/超时 | MTU 不匹配（部分云厂商） | 在 `daemon.json` 设 `"mtu": 1400` 或按厂商建议值 |
| 重启后 `DOCKER-USER` 规则丢失 | iptables 规则未持久化 | 用 `iptables-persistent` 或开机脚本 |

### 5.8 一份安全的对外暴露清单

按下面的顺序检查，任何一条不满足都可能导致「以为没开，其实全开」：

1. **云厂商安全组**：只放行确实需要的端口与来源（能用固定来源就别用 `0.0.0.0/0`）。
2. **端口绑定**：`-p 127.0.0.1:...` 而不是 `-p ...`。
3. **反向代理**：由 Nginx `stream` / frp 等对外，容器端口不出本机。
4. **系统防火墙**：对**非容器**的服务仍然有效，照常配置。
5. **实测**：从**另一台机器**执行 `telnet 公网IP 端口`，或用在线端口扫描工具确认**未开放**的端口确实不可达。
6. **RCON 永远不要映射到公网**（见 §6 环境变量表下方说明）。

## 6. 启动、看日志、进控制台、停止

```bash
docker compose up -d
```

第一次启动要下载服务端核心并生成世界，**几分钟到十几分钟都正常**，不要以为卡死了：

```bash
docker compose logs -f
```

看到类似 `Done (xx.xxxs)! For help, type "help"` 就说明起来了。`Ctrl+C` 只是退出日志跟随，**不会停止服务端**。

进入控制台执行指令（镜像内置 `rcon-cli`，会用 `RCON_PASSWORD` 自动登录）：

```bash
docker compose exec -it mcsog-java rcon-cli
docker compose exec -it mcsog-java rcon-cli list
docker compose exec -it mcsog-java rcon-cli save-all
```

需要真正的交互式控制台（能连续输入、能看到实时回显）时，用 `attach`：

```bash
docker attach mcsog-java
```

:::warn 用 attach 时的两个按键陷阱
`docker attach` 里按 `Ctrl+C` 会把中断信号发给服务端进程，**等于直接关服**（存档可能损坏）。正确退出方式是 `Ctrl+P` 然后 `Ctrl+Q`（detach，容器继续跑）。日常执行单条指令，优先用 `rcon-cli`。
:::

停止与删除：

```bash
docker compose stop
docker compose down
```

| 命令 | 做了什么 | 卷里的数据 |
| --- | --- | --- |
| `docker compose stop` | 停止容器，容器还在 | 保留 |
| `docker compose start` | 启动已停止的容器 | 保留 |
| `docker compose down` | 停止并**删除容器与网络** | 保留 |
| `docker compose down -v` | 上面全部 **加上删除卷** | **全部丢失** |

:::danger 不要随手加 `-v`
`docker compose down -v` 会删掉 `/data` 卷，也就是存档、插件、配置一起没。只有在你确认要「彻底重来」并且已有可用备份时才用它。
:::

## 7. 本文示例用到的环境变量

下表列出上面 compose 文件里用到的变量，以及几个最常用的补充项。**默认值随镜像版本变化，务必以镜像官方文档为准。**

| 变量 | 作用 | 示例值 |
| --- | --- | --- |
| `EULA` | 声明已同意 Minecraft EULA，未设置会启动失败 | `"TRUE"` |
| `TYPE` | 服务端核心类型 | `"PAPER"`、`"VANILLA"`、`"FABRIC"`、`"NEOFORGE"` |
| `VERSION` | Minecraft 版本，必须是该核心支持的版本 | `"1.21.11"`、`"LATEST"` |
| `MEMORY` | 分配给服务端的 JVM 堆内存 | `"4G"` |
| `ONLINE_MODE` | 是否校验正版账号（对应 `online-mode`） | `"TRUE"` / `"FALSE"` |
| `ENABLE_RCON` | 是否启用 RCON 远程控制台 | `"true"` |
| `RCON_PASSWORD` | RCON 口令，**必须自己改成强口令** | 长随机字符串 |
| `RCON_PORT` | RCON 监听端口（默认 25575，**不要映射到公网**） | `"25575"` |
| `TZ` | 容器时区，影响日志时间 | `"Asia/Shanghai"` |
| `DIFFICULTY` | 游戏难度 | `"normal"` |
| `MOTD` | 服务器列表里显示的描述 | `"MCSOG Java"` |
| `MAX_PLAYERS` | 最大玩家数 | `"20"` |
| `OPS` | 直接授予管理员权限的玩家名，逗号分隔 | `"Alice,Bob"` |
| `WHITELIST` | 白名单玩家名，逗号分隔 | `"Alice,Bob"` |
| `ENFORCE_WHITELIST` | 是否强制白名单 | `"TRUE"` |
| `PUID` / `PGID` | 以指定用户/组身份运行（用于绑定挂载的属主问题，**用法以镜像文档为准**） | `"1000"` |

:::note RCON 是「没有界面的管理员权限」
`ENABLE_RCON: "true"` 只在容器内部监听 `25575`。**不要把 `25575` 映射到公网**：RCON 协议不加密，一条口令就等于控制台。需要远程管理就走 SSH 隧道或面板，见 [网络安全基础](/tutorials/ops/network-security)。
:::

## 8. `/data` 里有什么

容器是「一次性」的，卷不是。下面这些全部位于 `/data`：

| 路径 | 内容 |
| --- | --- |
| `/data/world/` | 主世界存档（下界、末地各有独立目录） |
| `/data/plugins/` | 插件 jar 与它们的配置 |
| `/data/mods/` | 模组（`TYPE` 为模组核心时使用） |
| `/data/server.properties` | 服务端配置（端口、难度、`online-mode` 等） |
| `/data/eula.txt` | EULA 声明，由 `EULA` 变量写入 |
| `/data/logs/` | 服务端日志 |

所以：**容器可以随便删，卷不能删。** 想确认卷在哪：

```bash
docker volume ls
docker volume inspect mcsog-java-data
```

## 9. 备份与恢复

备份的对象是 `/data`，不是容器。最稳的做法是**先停服再打包**：

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

Windows PowerShell 下把挂载路径换成 `-v "${PWD}\backups:/backup"`（Docker Desktop）。

必须保持在线、不能停服时，用控制台命令保证一致性：

```bash
docker compose exec -it mcsog-java rcon-cli save-all
docker compose exec -it mcsog-java rcon-cli save-off
```

`save-all` 把内存里的数据落盘，`save-off` 关掉自动保存，这样打包过程中不会有新的写入。打完包再恢复：

```bash
docker compose exec -it mcsog-java rcon-cli save-on
```

恢复时**先停容器**，清空卷再解包（这一步会覆盖卷里现有内容）：

```bash
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-java-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn 容器不是备份
把服务端跑在容器里，**不等于**数据就安全了。卷和容器在同一块磁盘上，误删卷、磁盘损坏、勒索软件加密，都会一起带走。至少保留一份**离线或异地**的副本，方法见 [备份与恢复](/tutorials/java/backup) 与 [异地备份](/tutorials/ops/offsite-backup)。**没验证过恢复的备份不算备份。**
:::

## 10. 更新镜像、切换核心与版本

升级镜像（例如修 bug 或跟新版本）：

```bash
docker compose pull
docker compose up -d
```

顺序很重要：**先备份，再 pull，再 up**。`docker compose up -d` 在检测到镜像或配置变化时会重建容器，但卷会原样挂回，所以存档不会丢——前提是你没删卷。

改核心类型或版本，只改环境变量，然后重新 `up -d`：

```yaml
    environment:
      TYPE: "FABRIC"
      VERSION: "1.21.11"
```

| 变更 | 会发生什么 | 注意事项 |
| --- | --- | --- |
| 只改 `VERSION` | 镜像下载新版本核心 | **存档格式升级是单向的**，新版存档通常无法被旧版打开；升级前必须备份 |
| 改 `TYPE`（插件核心之间） | 换一个核心 jar，`plugins/` 继续用 | 插件与核心/版本必须兼容 |
| 改 `TYPE`（插件核心到模组核心） | 服务端开始读 `mods/` | 原有的 `plugins/` 不会生效，世界也可能需要额外兼容处理 |
| 改 `MEMORY` | 重建容器，重新分配堆内存 | 不要超过宿主机可用内存的合理比例 |

## 11. 加插件与模组

三种方式，按你的习惯选一种即可。

**方式 A：绑定挂载（改文件最方便）**

把 `volumes` 改成宿主机目录：

```yaml
    volumes:
      - ./data:/data
```

之后直接在宿主机上操作 `./data/plugins/`、`./data/server.properties`。Linux 上注意属主问题（见第 11 节）。

**方式 B：往卷里拷文件（保持命名卷）**

```bash
docker cp ./MyPlugin.jar mcsog-java:/data/plugins/
docker compose restart
```

**方式 C：交给镜像自动下载**

镜像还提供按来源自动拉取插件/模组的变量（例如按 Spiget 资源号装插件、按 Modrinth 项目装模组）。这些变量的名字与取值**以镜像官方文档为准**，用之前先核对。

改完配置后，多数插件支持游戏内重载，但**重启最稳**：

```bash
docker compose restart
```

## 12. 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 启动后立刻退出，日志提到 EULA | 没设 `EULA: "TRUE"` | 补上变量并 `docker compose up -d` |
| 容器被系统杀掉，日志出现 OOM | `MEMORY` 设得比宿主机能给的多 | 调小 `MEMORY`，或加内存；宿主机也要留出余量 |
| 外网连不上，容器里一切正常 | 端口没映射，或安全组没放行 | `ports` 写 `25565/tcp`；**云安全组**放行。注意：**系统防火墙（ufw/firewalld）对容器端口无效**，详见 §5.1 |
| 容器里写不了 `/data`，日志报权限错误 | Linux 绑定挂载的属主与容器内用户不一致 | 修正宿主机目录属主，或用镜像提供的用户映射变量（`PUID`/`PGID`，**以镜像文档为准**） |
| 重建容器后存档「没了」 | 删了卷（如 `down -v`），或忘了挂载 `/data` | 立刻停手，从备份恢复；以后固定卷名并纳入备份 |
| 控制台打不了字 | 少了 `stdin_open: true` 与 `tty: true` | 补上并重建容器 |
| `docker compose` 提示不是命令 | 装的是旧版 `docker-compose`（v1） | 按官方文档安装 Compose v2 插件，命令是 `docker compose` |
| 改完配置没生效 | 只改了文件没重建容器 | `docker compose up -d` 让配置生效 |

日常巡检（容器状态、资源占用、磁盘余量）建议配合 [监控与告警](/tutorials/ops/monitoring) 一起做。

## 13. 下一步

- 从零认识服务端目录与文件： [服务端结构](/tutorials/java/structure)
- 第一次开服的完整流程： [开启服务端](/tutorials/java/start)
- 存档、插件与配置的备份策略： [备份与恢复](/tutorials/java/backup)
- 卡顿排查与参数调优： [性能优化](/tutorials/java/optimize)
- 用面板统一管理多台服务端： [面板管理工具的使用与安全](/tutorials/ops/panels)

---

> 镜像名称、环境变量与默认端口以镜像官方文档为准。
