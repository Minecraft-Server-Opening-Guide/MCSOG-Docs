---
title: 用 Docker 部署基岩版服务端
slug: docker
cat: bedrock
level: 3
order: 7
minutes: 16
tags: [Docker, compose, 基岩版, BDS, udp, deployment, 备份]
updated: 2026-10-04
draft: false
---

基岩版官方服务端是 **BDS**，它没有插件系统、目录结构简单，非常适合放进容器：镜像负责下载官方 BDS、接受 EULA、映射端口，你只需要维护一个卷和一个 `docker-compose.yml`。

这一篇讲的是**在容器里跑 BDS**。BDS 本身的目录结构、内存特性与已知坑，见 [BDS 服务端](/tutorials/bedrock/bds)。

:::warn 先记住一件事：基岩版是 UDP
Java 版走 **TCP 25565**，基岩版走 **UDP 19132**（IPv6 为 `19133/udp`）。**只放行或只映射 TCP，表现是「服务器明明在跑，但谁也连不上」，而且不会有任何报错。** 这是基岩版开服最常见的坑，本文会反复强调。
:::

## 1. 为什么要容器化

| 收益 | 具体表现 |
| --- | --- |
| **环境干净** | 官方 BDS 是二进制程序，容器把它和它的运行库一起打包，宿主机不需要装任何依赖 |
| **可复现** | 版本、端口、游戏模式、难度、世界名全写在一个文件里，换机器照搬即可 |
| **回滚容易** | 升级前备份 `/data`，出问题就把 `VERSION` 改回去重启 |
| **删除干净** | 不要了就删容器与卷，宿主机上不留残留文件 |
| **跨平台一致** | 官方 BDS 只提供 Windows 与 Linux 版；在 Windows 上用容器跑 Linux 版 BDS，操作方式与服务器上完全一致 |

代价同样存在：

| 代价 | 说明 |
| --- | --- |
| **多一层要学** | 镜像、容器、卷、Compose 的概念绕不开，排错从 `docker compose logs` 开始 |
| **卷与备份纪律** | 世界存档在卷里，不主动备份就等于没有备份 |
| **性能开销小但不为零** | 网络多一层 NAT、文件系统多一层 overlay；真正的瓶颈通常是 **BDS 的单线程世界模拟**，所以 CPU 限额一定要给够 |
| **没有插件生态** | BDS 本身不支持插件，容器也不会改变这一点；附加内容只能以行为包/资源包的形式放进数据目录 |

## 2. 安装 Docker 与 Compose 插件

按官方文档安装，不要用来源不明的安装脚本：

| 平台 | 官方入口 |
| --- | --- |
| Linux（按发行版） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux 的 Compose 插件 | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::note Windows 上的两条路
Windows 可以下载官方压缩包直接跑里面的 exe（下载页见 [Minecraft 官方 BDS 下载页](https://www.minecraft.net/en-us/download/server/bedrock)），也可以用本文的容器方案。容器方案的好处是**与 Linux 服务器上的操作完全一致**，将来迁移不用重学。
:::

## 3. 镜像：`itzg/minecraft-bedrock-server`

社区里常用的基岩版镜像是 **`itzg/minecraft-bedrock-server`**（维护活跃，与 Java 版镜像同一作者生态）。

```bash
docker pull itzg/minecraft-bedrock-server
```

:::note 它和官方下载包的关系
官方的 [BDS 下载页](https://www.minecraft.net/en-us/download/server/bedrock) 提供压缩包，需要你自己解压、改配置、启动。**社区镜像做的事是：在容器启动时替你下载官方 BDS，并把环境变量写进 `server.properties` 等配置。**

所以：**镜像下载 BDS 的具体机制（下载地址、版本解析、缓存方式）以镜像官方文档为准**，不同镜像版本可能不同。想要完全自己控制，就用官方压缩包按 [BDS 服务端](/tutorials/bedrock/bds) 手动部署。
:::

## 4. 一份完整的 `docker-compose.yml`

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

Compose v2 **不需要**顶层 `version:` 字段。

| 字段 | 作用 |
| --- | --- |
| `image` | 使用的镜像；生产环境建议固定标签，不要永远用 `latest` |
| `container_name` | 固定容器名，方便 `logs` / `attach` |
| `ports` | **`/udp` 必须写**。`19132` 是 IPv4 主端口，`19133` 是 IPv6 端口（没有 IPv6 客户端可以不映射，但映射了不会有副作用） |

:::warn Docker 会绕过系统防火墙（基岩版同样适用）
`ufw` 与 `firewalld` 的规则**对 Docker 容器映射出来的端口无效**：Docker 会把自己的 `iptables` 规则插在系统防火墙之前，所以 `ufw deny 19132/udp` 也挡不住外部访问。

基岩版走 **UDP**，更容易被忽略，务必按下面的方式收紧：

1. **端口只绑回环**（推荐）：`-p 127.0.0.1:19132:19132/udp`，再由宿主机反向代理对外；
2. **用 `DOCKER-USER` 链**做来源限制；
3. 用云厂商**安全组**兜底（这一层不受 Docker 影响）。

另外，若希望服务器出现在**局域网列表**里（基岩版靠 UDP 广播发现），`bridge` 模式做不到，需要 `macvlan` 或 `host` 网络模式。

完整说明（含网段冲突、网络模式对比、排查表）见 [用 Docker 部署 Java 版 → 网络与防火墙](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节)。
:::
| `environment` | 镜像读取的配置，见第 6 节 |
| `volumes` | `卷名:/data`。**世界、配置、附加包全在 `/data`** |
| `stdin_open: true` | 打开标准输入，否则无法向 BDS 控制台**输入指令** |
| `tty: true` | 分配伪终端，配合 `docker attach` 获得可交互的控制台 |
| `restart: unless-stopped` | 崩溃或宿主机重启后自动拉起；手动 `docker compose stop` 后不会自动拉起 |

`volumes` 里显式写 `name:` 是为了让卷名**可预测**（否则 Compose 会加项目名前缀），备份命令才不会指错卷。

:::note `EULA=TRUE` 是法律要求
`EULA: "TRUE"` 表示**你已阅读并同意 [Minecraft 最终用户许可协议](https://aka.ms/MinecraftEULA)**。不设置这个变量，BDS 会启动后立刻退出，容器就会进入重启循环。
:::

:::tip 启动前先做一次「体检」
每次改完 compose 文件先跑一次 `docker compose config`：端口、卷、环境变量会被展开打印出来，写错的地方会当场报错。**尤其是 `/udp`，漏写在这里就能看出来。**
:::

```bash
docker compose config
```

## 5. 启动、看日志、进控制台、停止

```bash
docker compose up -d
```

第一次启动要下载 BDS，耐心等：

```bash
docker compose logs -f
```

看到 `[INFO] Server started.` 一类的日志就说明起来了。`Ctrl+C` 只退出日志跟随，不会停服。

基岩版**没有 RCON**，所以没有 `rcon-cli` 可用，进控制台只能用 `attach`：

```bash
docker attach mcsog-bedrock
```

attach 之后就可以像在本地窗口里一样输入 BDS 指令，例如：

```text
list
say hello
save hold
save resume
stop
```

:::warn attach 的按键陷阱
在 `docker attach` 里按 `Ctrl+C` 会把中断信号发给 BDS，**等于直接关服**（存档可能损坏）。正确退出是 `Ctrl+P` 再 `Ctrl+Q`（detach，容器继续运行）。需要真正关服时，输入 `stop` 指令并等待进程退出。
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
| `docker compose down` | 停止并删除容器与网络 | 保留 |
| `docker compose down -v` | 上面全部 **加上删除卷** | **全部丢失** |

:::danger 不要随手加 `-v`
`docker compose down -v` 会删掉 `/data` 卷，也就是世界存档一起没。只在确认要彻底重来、且已有可用备份时才用。
:::

## 6. 本文示例用到的环境变量

| 变量 | 作用 | 示例值 |
| --- | --- | --- |
| `EULA` | 声明已同意 Minecraft EULA，未设置会启动失败 | `"TRUE"` |
| `SERVER_NAME` | 服务器名称（对应 `server-name`） | `"MCSOG Bedrock"` |
| `GAMEMODE` | 默认游戏模式 | `"survival"` / `"creative"` |
| `DIFFICULTY` | 游戏难度 | `"normal"` / `"peaceful"` |
| `LEVEL_NAME` | 世界（关卡）名称，**同时决定 `worlds/` 下的文件夹名** | `"MCSOG"` |
| `ONLINE_MODE` | 是否校验 Xbox Live 账号 | `"TRUE"` / `"FALSE"` |
| `TZ` | 容器时区，影响日志时间 | `"Asia/Shanghai"` |
| `VERSION` | 指定 BDS 版本；不写通常跟随最新 | `"LATEST"` |
| `SERVER_PORT` | IPv4 监听端口（默认 19132） | `"19132"` |
| `SERVER_PORT_V6` | IPv6 监听端口（默认 19133） | `"19133"` |
| `MAX_PLAYERS` | 最大玩家数 | `"20"` |
| `VIEW_DISTANCE` | 视距 | `"12"` |
| `LEVEL_SEED` | 世界种子 | 数字或字符串 |
| `ALLOW_LIST` | 是否启用白名单 | `"true"` / `"false"` |

:::note 默认值会变
表中括号里的默认值对应 BDS 的常见默认配置，**镜像版本更新后可能调整，务必以镜像官方文档为准**。生产环境的原则是：**关键项一律显式写出来**，不要依赖默认值。
:::

:::warn 非 ASCII 服务器名
`SERVER_NAME` 支持中文，但部分旧客户端会显示成乱码。玩家反馈乱码时，先换回纯 ASCII 名称排查。`LEVEL_NAME` 也建议用 ASCII：它会变成目录名，特殊字符会带来不必要的麻烦。
:::

## 7. `/data` 里有什么

| 路径 | 内容 |
| --- | --- |
| `/data/worlds/<LEVEL_NAME>/` | **世界存档**（`db/`、`level.dat`、`level_name.txt` 等） |
| `/data/server.properties` | 服务器配置（端口、难度、模式、白名单开关等） |
| `/data/allowlist.json` | 白名单数据 |
| `/data/permissions.json` | 管理员（OP）数据 |
| `/data/valid_known_packs.json` | 已知附加包列表 |
| `/data/behavior_packs/`、`/data/resource_packs/` | 行为包与资源包（附加内容的落地位置） |

BDS 的存档**全部在 `worlds/` 下**，每个世界一个子目录。`LEVEL_NAME` 写什么，目录就叫什么：

```text
/data/worlds/MCSOG/db/
```

:::warn 改 `LEVEL_NAME` 等于换世界
`LEVEL_NAME` 变了，BDS 会去找新名字的目录；找不到就**生成一个全新的空世界**，旧世界看起来「消失了」（其实还在卷里）。改这个名字之前先确认存档目录名。
:::

## 8. 备份与恢复

备份对象是 `/data`，重点是 `/data/worlds/`。最稳的做法是**停服再打包**：

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

Windows PowerShell 下把挂载路径换成 `-v "${PWD}\backups:/backup"`（Docker Desktop）。

不能停服时，BDS 提供了自己的存档一致性指令（需要在 `docker attach` 的控制台里输入）：

```text
save hold
save query
```

`save hold` 让服务端暂停写入并保持文件一致，`save query` 列出当前需要备份的文件。复制完成后恢复：

```text
save resume
```

:::note 为什么基岩版不能照抄 Java 版的做法
Java 版用 `save-all` / `save-off` / `save-on`，基岩版 BDS 用的是 **`save hold` / `save query` / `save resume`**，两套指令不通用。停服备份则两者都适用，也最省心。
:::

恢复时先停容器，清空卷再解包：

```bash
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-bedrock-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn 容器不是备份
卷和容器在同一块磁盘上，误删卷、磁盘损坏、勒索软件会一起带走。至少保留一份**离线或异地**的副本，见 [备份与恢复](/tutorials/java/backup) 与 [异地备份](/tutorials/ops/offsite-backup)。**没验证过恢复的备份不算备份。**
:::

## 9. 更新镜像与 BDS 版本

```bash
docker compose pull
docker compose up -d
```

顺序依旧是：**先备份，再 pull，再 up**。

| 变更 | 会发生什么 | 注意事项 |
| --- | --- | --- |
| `docker compose pull` | 拉取镜像新版本 | 拉完必须 `up -d` 才会重建容器并生效 |
| 改 `VERSION` | 镜像重新下载对应版本的 BDS | 客户端与 BDS 版本需要匹配；升级前备份存档 |
| 不写 `VERSION` | 通常跟随最新 BDS | 方便，但**不可复现**；出问题时无法确定是版本变了还是配置变了 |

:::note 版本不匹配是最常见的「连不上」
基岩版客户端与 BDS 版本不匹配时，玩家通常**能看到服务器但进不去**。固定 `VERSION` 可以让每次重启都拿到同一版本；要跟随最新，就接受「某次重启后版本变了」这件事，并提前通知玩家。
:::

## 10. 附加内容：BDS 没有插件系统

BDS 只支持官方的**行为包（behavior packs）与资源包（resource packs）**，没有 Bukkit 那样的插件体系，容器也不会改变这一点。需要插件能力时，要换第三方服务端，见 [BDS 服务端](/tutorials/bedrock/bds) 与 [第三方服务端方案](/tutorials/bedrock/third-party)。

附加内容放法：

| 内容 | 放置位置 |
| --- | --- |
| 行为包 | `/data/behavior_packs/` |
| 资源包 | `/data/resource_packs/` |
| 世界专属的包 | `/data/worlds/<LEVEL_NAME>/` 下对应目录 |

**方式 A：绑定挂载（改文件最方便）**

```yaml
    volumes:
      - ./data:/data
```

之后直接在宿主机上操作 `./data/behavior_packs/`。

**方式 B：拷进卷里**

```bash
docker cp ./MyAddon.mcpack mcsog-bedrock:/data/
docker compose restart
```

改完配置或换包之后，**重启容器最稳**：

```bash
docker compose restart
```

## 11. 性能与内存：基岩版特有的两点

### 11.1 世界模拟是单线程的，别把 CPU 掐太死

BDS 的生物运算与世界模拟基本是单线程的，**流畅度取决于单核性能**，地图越大越吃力。容器本身的开销很小，但**给容器设一个过低的 CPU 配额，会让服务端直接饿死**：表现为 TPS 掉、玩家卡顿、区块加载缓慢。

```yaml
    cpus: "2.0"
```

:::warn 不要为了「省资源」而限制 CPU
除非你明确知道这台机器上还跑着什么、并且做了压测，否则**不要给 BDS 容器设 CPU 上限**（例如 `cpus: "0.5"`）。BDS 的单线程特性决定了它对单核频率和「随时可用的一个核」非常敏感。相关调优见 [性能优化](/tutorials/java/optimize)。
:::

内存方面：

```yaml
    mem_limit: "4g"
```

`mem_limit` 是硬上限，**设得比实际需要还低，容器会被 OOM 杀掉**（表现是服务端毫无征兆地重启）。不确定就先不设上限，用 `docker stats` 观察实际占用后再定。

:::warn 不要强行清理内存
BDS 的内存占用会随时间缓慢增长，**不要用工具强行清内存**：会导致玩家下载材质包/附加包时进度条卡住。**正确的处理方式是重启服务端**，这一点与 [BDS 服务端](/tutorials/bedrock/bds) 的说明一致。
:::

## 12. 故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 容器**循环重启** | EULA 未同意、`LEVEL_NAME` 含非法字符、端口被占用、内存不足、`VERSION` 无效 | 先看 `docker compose logs --tail=200`，日志第一屏通常会直接点出原因 |
| 服务器在跑，但**谁都连不上** | 只映射/放行了 TCP；安全组没放行 **UDP** | `ports` 写 `"19132:19132/udp"`，并在**云安全组**放行 UDP 19132。系统防火墙对容器无效，见上方警告 |
| 局域网能连，公网不能 | 端口映射/安全组问题 | 见 [部署到可访问环境](/tutorials/java/deploy) 与 [路由器与防火墙](/tutorials/ops/router-firewall) |
| 世界「不见了」，生成了新地图 | 改了 `LEVEL_NAME`，或挂载错了卷 | 把 `LEVEL_NAME` 改回原来的名字；确认挂的是同一个卷 |
| 玩家能看到服务器但进不去 | 客户端与 BDS 版本不匹配，或白名单/在线验证拦截 | 固定 `VERSION`，检查 `ALLOW_LIST` 与 `ONLINE_MODE` |
| 容器写不了 `/data`（Linux 绑定挂载） | 宿主机目录属主与容器内用户不一致 | 修正目录属主；必要时使用镜像文档给出的用户映射方式 |
| 服务端莫名重启 | 内存硬上限过低触发 OOM | 提高或取消 `mem_limit`，用 `docker stats` 观察 |
| 控制台打不了字 | 少了 `stdin_open: true` 与 `tty: true` | 补上并重建容器 |

日常巡检（容器状态、CPU/内存占用、磁盘余量）建议配合 [监控与告警](/tutorials/ops/monitoring) 一起做。

## 13. 下一步

- BDS 的目录结构与已知坑： [BDS 服务端](/tutorials/bedrock/bds)
- 官方 BDS 下载与说明： [Minecraft 官方 BDS 下载页](https://www.minecraft.net/en-us/download/server/bedrock)
- 基岩版的核心选择： [服务端类型](/tutorials/bedrock/type)
- 存档备份的通用方法： [备份与恢复](/tutorials/java/backup)
- 多台服务端统一管理： [面板管理工具的使用与安全](/tutorials/ops/panels)

---

> 镜像名称、环境变量与默认端口以镜像官方文档为准。
