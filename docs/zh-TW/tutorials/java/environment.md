---
title: 環境準備（Windows 與 Linux）
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, 環境, java版本, 埠, 權限]
updated: 2026-10-04
draft: false
---

這篇把 Windows 與 Linux 放在一起寫。兩邊要做的是**同樣四件事**：**確認 Java 版本 → 放行埠 → 建目錄 → 裝對 Java 並配好環境**。

差異只在命令寫法，所以每個小節裡都給兩套做法，**照著你自己的系統看那一半就行**。

## 第一步：先確認你要開的版本，再決定 Java

**這一步做錯，後面全白做。** Java 版本不匹配時服務端啟動即崩，日誌裡會出現 `UnsupportedClassVersionError`。

| Minecraft Java 版 | 官方要求的 Java | 說明 |
| --- | --- | --- |
| 26.1 及以後 | **Java 25** | 最新要求（26.1 起） |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 是最早要求 21 的正式版 |
| 1.18 – 1.20.4 | **Java 17** | 目前最常用的組合 |
| 1.17 – 1.17.1 | **Java 16** | Java 17 也可以正常啟動 |
| 1.12 – 1.16.5 | **Java 8** | 大量老整合包仍停留在這一檔 |
| 1.7.10 及更早 | 官方要求較低 | 實際普遍使用 Java 8 |

:::note 上表來源
1.20.5 / 1.18 / 1.17 / 1.12 等分界取自 Mojang 官方版本清單（`piston-meta.mojang.com` 每個版本的 `javaVersion.majorVersion` 欄位）；26.1 起要求 Java 25 取自 Minecraft Wiki 的版本要求列表。非經驗推測。
:::

- **Paper、Purpur、Spigot、Fabric、Forge 的要求與官方一致**：1.20.5 以上需要 Java 21，1.18–1.20.4 需要 Java 17。
- 上表是**最低要求**。Java 版本過高時，部分插件與模組可能不相容，**建議與要求嚴格對齊**。
- **基岩版（BDS）不需要 Java**，它是 C++ 程式，直接執行 `bedrock_server`（Windows 下為 `bedrock_server.exe`）即可。

## 第二步：放行埠

| 埠 | 協議 | 用途 |
| --- | --- | --- |
| 25565 | TCP | Java 版遊戲連線（**必須**） |
| 25565 | UDP | 伺服器列表查詢（Query，可選） |
| 25575 | TCP | RCON 遠端控制台（可選，**不要暴露給公網**） |
| 19132 | UDP | 基岩版預設埠（IPv6 為 19133，僅跨端方案才需要） |

:::note 埠來源
Java 版預設 **TCP 25565**；基岩版 **BDS 使用 UDP**，IPv4 預設 **19132**、IPv6 預設 **19133**（可在 `server.properties` 修改）。
:::

### 雲伺服器安全組（雲主機必做）

到雲控制台的「安全組 / 防火牆」新增入站規則 `TCP 25565`，來源 `0.0.0.0/0`。**本機防火牆配得再對，安全組沒開別人一樣連不上。**

### 系統防火牆

**Windows（圖形介面）**：`控制面板 → Windows Defender 防火墙 → 高级设置 → 入站规则 → 新建规则` → 選「埠」→「TCP」→ 本地埠填 `25565` →「允許連線」→ 三個設定檔全勾 → 命名儲存。

**Windows（命令列，管理員 PowerShell）**：

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux（ufw，Ubuntu / Debian）**：

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux（firewalld，CentOS 系）**：

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn 用 Docker 部署時，系統防火牆管不住容器
如果你打算用 **Docker / Docker Compose** 部署服務端（見 [用 Docker 部署 Java 版](/tutorials/java/docker)），那麼 **`ufw` 與 `firewalld` 對本節這些埠都不起作用**。

原因：Docker 啟動時會自己往 `iptables` 寫轉發與 NAT 規則，並且把這些規則插在系統防火牆規則**之前**。所以即使你執行了 `sudo ufw deny 25565`，外部**照樣能連上容器映射出來的埠**。這不是配置寫錯了，是 Docker 的既定行為。

四條可行做法，**按推薦程度排序**：

1. **埠只綁本機迴環**（最安全、最簡單）：`-p 127.0.0.1:25565:25565`，容器埠因此**完全不暴露到公網**；需要對外時再由宿主機的反向代理（Nginx `stream`、frp、加速器等）轉發。
2. **用 [ufw-docker](https://github.com/chaifeng/ufw-docker) 腳本讓 UFW 重新管得住容器**（**想讓 UFW 繼續當統一入口時選它**）：一條命令裝好，之後就能用 `ufw route allow proto tcp from any to any port 25565` 放行容器埠、`ufw route delete allow …` 收回，**既不用停用 Docker 的 iptables，也不用自己寫 iptables 規則**。詳見 [用 Docker 部署 Java 版 → 5.2 正確的四種做法](/tutorials/java/docker#52-正确的四种做法)。
3. **用 `DOCKER-USER` 鏈手工寫規則**：這是 Docker 專門留給使用者的鏈，Docker 自己不會覆蓋它，適合只做少量來源限制的場景。
4. 在 `/etc/docker/daemon.json` 寫 `"iptables": false` 後自行維護轉發規則——**會同時失去埠對映能力（除非你自己配 NAT），不建議新手使用**。

完整說明見 [用 Docker 部署 Java 版 → 網路與防火牆](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节)。
:::

### 驗證

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

外部可達性必須從**另一台機器**測試：`telnet 你的公网IP 25565`，或使用線上埠檢測工具。**服務端沒啟動時埠不會監聽**，所以要先讓服務端跑起來再測。

## 第三步：建立目錄

:::warn 路徑不要帶中文和空格
`C:\我的服务器\1.20 服务端\` 或 `/home/我的服务器/` 這類路徑會讓部分啟動腳本、插件配置解析出錯，報錯資訊往往還很難懂。**統一用純英文、無空格的短路徑。**
:::

兩邊用**同一套結構**，將來從 Windows 遷到 Linux 只需整體拷過去：

```
mcserver/
├── survival/          # 单个服务端的全部文件
│   ├── server.jar     # 服务端核心
│   ├── eula.txt       # 必须同意才会启动
│   ├── server.properties
│   ├── world/         # 世界数据（务必单独备份）
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # 备份目录，与运行目录分开更安全
```

**Windows**：

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux**（用專用使用者，不要用 root 跑服務端）：

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**把服務端核心放進 `survival` 後，第一次啟動會生成 `eula.txt`**，把 `eula=false` 改成 `eula=true` 表示同意 [Minecraft EULA](https://aka.ms/MinecraftEULA)。**不改就是啟動後立刻退出。**

## 第四步：安裝 Java 並配置環境

推薦 **Eclipse Temurin（Adoptium）**：免費、開源、長期維護，是服務端社群使用最廣的 OpenJDK 發行版。

### Windows：安裝

到 Adoptium 官網下載 **JDK 的 `.msi` 安裝包**（`.jar` 版是執行時，`.msi` 才是帶嚮導的 JDK）。Java 21 對應 `temurin-21-jdk`，Java 17 換成 `temurin-17-jdk`，Java 8 換成 `temurin-8-jdk`。

安裝嚮導裡有一項 **`Set JAVA_HOME variable`**，設為 **Will be installed on local hard drive**，勾上它環境變數會自動配好。

裝完**新開一個** PowerShell 驗證：

```powershell
java -version        # 应输出 openjdk version "21.x.x" ...
```

### Linux：安裝

```bash
# Ubuntu / Debian：Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# 需要 Java 17 时
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# CentOS 系
sudo dnf install -y java-21-openjdk-headless
```

多版本共存時切換預設版本：

```bash
sudo update-alternatives --config java
java -version
```

:::tip headless 版本就夠
`-headless` 不含圖形元件，記憶體佔用更小；服務端用不到 GUI，**優先裝 headless**。
:::

### 手動配置環境變數（Windows 未勾選安裝選項，或使用免安裝 ZIP 版時）

**圖形介面**：`此电脑 → 右键属性 → 高级系统设置 → 环境变量`，在**系統變數**中：

1. 新建 `JAVA_HOME`，值填 JDK 安裝目錄，例如 `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot`（**不要**帶 `\bin`）
2. 編輯 `Path`，新增一項 `%JAVA_HOME%\bin`
3. 確定儲存，然後**新開** PowerShell 驗證

**命令列**（需管理員權限；`setx` 隻影響新視窗）：

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn 關於 setx 覆蓋 Path 的風險
`setx Path` 會寫入**當前**已解析的 Path。如果原 Path 過長或含變數引用，直接拼接可能截斷。**圖形介面編輯更安全。**
:::

**Linux** 下包管理器安裝的 JDK 通常已在 `PATH` 中；若使用免安裝 tar.gz，則在 `~/.bashrc` 或 `/etc/profile.d/` 中設定：

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**驗證**：

```powershell
echo $env:JAVA_HOME      # cmd：echo %JAVA_HOME%
java -version
where.exe java           # 应指向 %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### 多版本共存

**Windows** 沒有 `update-alternatives`，最穩的做法是：裝多個 JDK，不改系統預設，而是在每個服務端的啟動腳本裡寫死 `java.exe` 的絕對路徑。

`C:\mcserver\survival\start.bat`：

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **路徑一定要用雙引號包住**——`Program Files` 裡有空格，不加引號必然失敗
- `cd /d "%~dp0"` 讓工作目錄固定為腳本所在目錄
- `pause` 讓視窗在出錯時**不要立刻關閉**，否則看不到報錯

**Linux** 用 `update-alternatives` 切換，或在 `start.sh` 中寫死路徑：

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## 第五步（Linux 建議）：用 systemd 託管

手動 `./start.sh` 一關 SSH 就斷了，也做不到崩潰自動重啟。長期開服建議託管成服務：

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/bin/screen -DmS mcserver /usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
ExecStop=/usr/bin/screen -S mcserver -X stuff "stop\n"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note 需要 screen
上面的寫法藉助 `screen` 保留控制台，便於進服敲指令：`sudo apt install -y screen`，之後用 `screen -r mcserver` 回到控制台。
:::

## 常見問題排查

| 現象 | 原因 | 處理 |
| --- | --- | --- |
| `java: command not found` / `'java' 不是内部或外部命令` | 未安裝，或 `PATH` 沒配好，或視窗沒重開 | 檢查 `PATH`，**新開**視窗再試 |
| `UnsupportedClassVersionError ... class file version 65.0` | Java 版本過低（65 = Java 21） | 按上表換對應 Java 版本 |
| 雙擊啟動腳本視窗一閃而過 | 報錯後窗口自動關閉 | 腳本末尾加 `pause`，或在終端裡執行看輸出 |
| 啟動後立刻退出，日誌提示 EULA | 沒同意 EULA | 改 `eula.txt` 為 `eula=true` |
| `Address already in use` | 25565 被佔用 | Windows：`netstat -ano \| findstr :25565`；Linux：`ss -tlnp \| grep 25565`，查 PID 後結束 |
| `Could not reserve enough space for object heap` | `-Xmx` 超過可用記憶體 | 調小 `-Xmx`（例如 `-Xmx2G`） |
| 自己 telnet 通、別人連不上 | 只配了本機防火牆，雲安全組沒放行 | 到雲控制台補入站規則 |
| 插件/模組報奇怪的路徑錯誤 | 目錄含中文或空格 | 遷到 `C:\mcserver` 或 `/opt/mcserver` 這類純英文路徑 |
| Linux 下 `Permission denied` | 服務端由 root 建立，普通使用者無寫權限 | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Windows 電腦睡眠後掉線 | 系統休眠中斷了服務 | 電源選項設為「從不睡眠」，或改用長期線上的機器 |

## 下一步

環境就緒後即可安裝服務端核心：

- **服務端選擇**：見 [服務端選擇](/tutorials/java/core) —— 按硬體與玩法挑核心（多核低主頻選 Folia、單核強選 Paper 系、生電選 Fabric 或 Leaves）
- **逐項對照**：見 [服務端核心對比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) —— 效能、插件、模組、適用場景一覽

**開機前再確認兩件事**：Java 版本與目標 MC 版本匹配、25565 已在安全組與系統防火牆上都放行。

環境與核心都定好之後，寫啟動腳本把伺服器跑起來：見 [開啟服務端](/tutorials/java/start)。
