---
title: 環境準備（Windows と Linux）
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, 環境, java バージョン, ポート, 権限]
updated: 2026-10-04
draft: false
---

この記事は Windows と Linux をまとめて扱います。どちらもやることは**同じ 4 つ**です：**Java のバージョンを確認 → ポートを開放 → ディレクトリを作成 → 正しい Java を入れて環境を設定**。

違いはコマンドの書き方だけなので、各節で 2 通りのやり方を示します。**自分の OS の側だけ読めば十分です**。

## ステップ 1：まず立てたいバージョンを確認し、それから Java を決める

**ここを間違えると、あとは全部無駄になります。** Java のバージョンが合わないとサーバーは起動直後に落ち、ログに `UnsupportedClassVersionError` が出ます。

| Minecraft Java 版 | 公式が要求する Java | 説明 |
| --- | --- | --- |
| 26.1 以降 | **Java 25** | 最新の要件（26.1 から） |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 が 21 を要求する最初の正式版 |
| 1.18 – 1.20.4 | **Java 17** | 現在最もよく使われる組み合わせ |
| 1.17 – 1.17.1 | **Java 16** | Java 17 でも正常に起動する |
| 1.12 – 1.16.5 | **Java 8** | 多くの旧 MOD パックが今もこの段階に留まる |
| 1.7.10 以前 | 公式の要件は低い | 実際には Java 8 が広く使われている |

:::note 上表の出典
1.20.5 / 1.18 / 1.17 / 1.12 などの区切りは Mojang の公式バージョン一覧（`piston-meta.mojang.com` の各バージョンの `javaVersion.majorVersion` フィールド）によります。26.1 以降が Java 25 を要求する点は Minecraft Wiki のバージョン要件一覧によります。経験からの推測ではありません。
:::

- **Paper、Purpur、Spigot、Fabric、Forge の要件は公式と同じ**：1.20.5 以上は Java 21、1.18–1.20.4 は Java 17。
- 上表は**最低要件**です。Java のバージョンが高すぎると一部のプラグインや MOD が非対応になることがあるため、**要件に厳密に合わせる**ことを勧めます。
- **統合版（BDS）に Java は不要**です。C++ のプログラムなので、`bedrock_server`（Windows では `bedrock_server.exe`）を直接実行するだけです。

## ステップ 2：ポートを開放する

| ポート | プロトコル | 用途 |
| --- | --- | --- |
| 25565 | TCP | Java 版のゲーム接続（**必須**） |
| 25565 | UDP | サーバーリストの照会（Query、任意） |
| 25575 | TCP | RCON 遠隔コンソール（任意、**公衆に晒さないこと**） |
| 19132 | UDP | 統合版の既定ポート（IPv6 は 19133。クロスプレイ構成でのみ必要） |

:::note ポートの出典
Java 版の既定は **TCP 25565**；統合版の **BDS は UDP** を使い、IPv4 の既定は **19132**、IPv6 の既定は **19133**（`server.properties` で変更可能）。
:::

### クラウドサーバーのセキュリティグループ（クラウド必須）

クラウドのコンソールの「セキュリティグループ / ファイアウォール」で、受信ルール `TCP 25565`、送信元 `0.0.0.0/0` を追加します。**ローカルのファイアウォールがどれだけ正しくても、セキュリティグループが開いていなければ他人はつながりません。**

### OS のファイアウォール

**Windows（GUI）**：`コントロールパネル → Windows Defender ファイアウォール → 詳細設定 → 受信の規則 → 新しい規則` → 「ポート」→「TCP」→ ローカルポートに `25565` →「接続を許可する」→ 3 つのプロファイルをすべてチェック → 名前を付けて保存。

**Windows（コマンドライン、管理者 PowerShell）**：

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux（ufw、Ubuntu / Debian）**：

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux（firewalld、CentOS 系）**：

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn Docker でデプロイすると、OS のファイアウォールはコンテナを制御できない
**Docker / Docker Compose** でサーバーをデプロイする場合（[Docker で Java 版をデプロイ](/tutorials/java/docker) を参照）、**`ufw` と `firewalld` は本節のポートに一切効きません**。

理由：Docker は起動時に自分で `iptables` へ転送と NAT のルールを書き込み、しかもそれらのルールを OS のファイアウォールのルール**より前**に挿入します。そのため `sudo ufw deny 25565` を実行しても、外部からは**コンテナがマッピングしたポートにそのまま接続できます**。設定ミスではなく、Docker の既定の挙動です。

実行可能な方法は 4 つ、**推奨度順**：

1. **ポートをローカルのループバックにだけ束縛する**（最も安全で最も簡単）：`-p 127.0.0.1:25565:25565` とすれば、コンテナのポートは**公衆にまったく露出しません**。外部に出す必要があるときは、ホスト側のリバースプロキシ（Nginx の `stream`、frp、アクセラレータなど）で転送します。
2. **[ufw-docker](https://github.com/chaifeng/ufw-docker) スクリプトで UFW にコンテナを再度制御させる**（**UFW を引き続き統一的な入口にしたいならこれ**）：コマンド 1 つで導入でき、その後は `ufw route allow proto tcp from any to any port 25565` でコンテナのポートを開放し、`ufw route delete allow …` で取り消せます。**Docker の iptables を無効にする必要も、自分で iptables ルールを書く必要もありません**。詳細は [Docker で Java 版をデプロイ → 5.2 正しい 4 つの方法](/tutorials/java/docker#52-正确的四种做法)。
3. **`DOCKER-USER` チェーンに手でルールを書く**：Docker がユーザー向けに用意したチェーンで、Docker 自身は上書きしません。送信元を少し制限したいだけの場面に向きます。
4. `/etc/docker/daemon.json` に `"iptables": false` を書いて転送ルールを自分で維持する —— **ポートマッピングの能力も同時に失います（自分で NAT を設定しない限り）。初心者には勧めません**。

完全な説明は [Docker で Java 版をデプロイ → ネットワークとファイアウォール](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节) を参照。
:::

### 検証

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

外部からの到達性は必ず**別のマシン**から試します：`telnet あなたの公衆IP 25565`、またはオンラインのポート検査ツールを使います。**サーバーが起動していないとポートは待ち受けません**ので、先にサーバーを動かしてから測ってください。

## ステップ 3：ディレクトリを作成する

:::warn パスに日本語や空白を入れない
`C:\私のサーバー\1.20 サーバー\` や `/home/私のサーバー/` のようなパスは、一部の起動スクリプトやプラグイン設定の解析を失敗させ、エラーメッセージも分かりにくいことが多いです。**英数字のみ、空白なしの短いパスに統一してください。**
:::

どちらも**同じ構造**を使うので、将来 Windows から Linux へ移すときは丸ごとコピーするだけです：

```
mcserver/
├── survival/          # サーバー 1 つ分の全ファイル
│   ├── server.jar     # サーバーコア
│   ├── eula.txt       # 同意しないと起動しない
│   ├── server.properties
│   ├── world/         # ワールドデータ（必ず別途バックアップ）
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # バックアップ用。実行ディレクトリと分けると安全
```

**Windows**：

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux**（専用ユーザーを使い、root でサーバーを動かさない）：

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**サーバーコアを `survival` に入れて初回起動すると `eula.txt` が生成されます**。`eula=false` を `eula=true` に変えて [Minecraft EULA](https://aka.ms/MinecraftEULA) への同意を表明します。**変えないと起動直後に終了します。**

## ステップ 4：Java をインストールし環境を設定する

**Eclipse Temurin（Adoptium）** を勧めます：無料、オープンソース、長期保守で、サーバー界隈で最も広く使われている OpenJDK ディストリビューションです。

### Windows：インストール

Adoptium の公式サイトで **JDK の `.msi` インストーラー**をダウンロードします（`.jar` 版はランタイム、`.msi` がウィザード付きの JDK）。Java 21 なら `temurin-21-jdk`、Java 17 なら `temurin-17-jdk`、Java 8 なら `temurin-8-jdk` です。

インストーラーの **`Set JAVA_HOME variable`** の項目を **Will be installed on local hard drive** にすると、環境変数が自動で設定されます。

インストール後、**新しく開いた** PowerShell で検証します：

```powershell
java -version        # openjdk version "21.x.x" ... と出力されるはず
```

### Linux：インストール

```bash
# Ubuntu / Debian：Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# Java 17 が必要なとき
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# CentOS 系
sudo dnf install -y java-21-openjdk-headless
```

複数バージョンが共存する場合の既定バージョン切り替え：

```bash
sudo update-alternatives --config java
java -version
```

:::tip headless 版で十分
`-headless` は GUI コンポーネントを含まず、メモリ使用量が少なくなります。サーバーに GUI は不要なので、**headless を優先して入れてください**。
:::

### 環境変数を手動で設定する（Windows でインストール項目を外した場合、または展開不要の ZIP 版を使う場合）

**GUI**：`PC → 右クリックでプロパティ → システムの詳細設定 → 環境変数` で、**システム環境変数**に：

1. `JAVA_HOME` を新規作成し、JDK のインストールディレクトリを設定。例：`C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot`（`\bin` は**付けない**）
2. `Path` を編集し、`%JAVA_HOME%\bin` を 1 行追加
3. OK で保存し、**新しく開いた** PowerShell で検証

**コマンドライン**（管理者権限が必要。`setx` は新しいウィンドウにのみ反映される）：

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn setx が Path を上書きするリスク
`setx Path` は**その時点で**解決された Path を書き込みます。元の Path が長すぎる場合や変数参照を含む場合、単純な連結では切り詰められる可能性があります。**GUI で編集するほうが安全です。**
:::

**Linux** ではパッケージマネージャーで入れた JDK は通常すでに `PATH` にあります。展開不要の tar.gz を使う場合は `~/.bashrc` か `/etc/profile.d/` で設定します：

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**検証**：

```powershell
echo $env:JAVA_HOME      # cmd では echo %JAVA_HOME%
java -version
where.exe java           # %JAVA_HOME%\bin\java.exe を指すはず
```

```bash
echo $JAVA_HOME
java -version
which java
```

### 複数バージョンの共存

**Windows** には `update-alternatives` がないため、最も確実なのは：複数の JDK を入れ、システムの既定は変えず、各サーバーの起動スクリプトに `java.exe` の絶対パスを直接書くことです。

`C:\mcserver\survival\start.bat`：

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **パスは必ず二重引用符で囲む** —— `Program Files` に空白があるため、引用符がないと確実に失敗します
- `cd /d "%~dp0"` で作業ディレクトリをスクリプトのあるディレクトリに固定
- `pause` でエラー時にウィンドウが**すぐ閉じない**ようにする。閉じるとエラーが見えません

**Linux** では `update-alternatives` で切り替えるか、`start.sh` にパスを直接書きます：

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## ステップ 5（Linux 推奨）：systemd で管理する

手動の `./start.sh` は SSH を切ると止まり、クラッシュ時の自動再起動もできません。長期運営ならサービスとして管理することを勧めます：

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

:::note screen が必要
上記の書き方は `screen` でコンソールを保持し、サーバー内でコマンドを打てるようにします：`sudo apt install -y screen`、その後 `screen -r mcserver` でコンソールに戻れます。
:::

## よくあるトラブルの切り分け

| 現象 | 原因 | 対処 |
| --- | --- | --- |
| `java: command not found` / `'java' は内部コマンドまたは外部コマンドではありません` | 未インストール、`PATH` の設定漏れ、ウィンドウを開き直していない | `PATH` を確認し、**新しく開いた**ウィンドウで再試行 |
| `UnsupportedClassVersionError ... class file version 65.0` | Java のバージョンが低すぎる（65 = Java 21） | 上表に従って対応する Java に変える |
| 起動スクリプトをダブルクリックするとウィンドウが一瞬で消える | エラー後にウィンドウが自動で閉じる | スクリプトの末尾に `pause` を足すか、ターミナルから実行して出力を見る |
| 起動直後に終了し、ログに EULA と出る | EULA に同意していない | `eula.txt` を `eula=true` に変更 |
| `Address already in use` | 25565 が使用中 | Windows：`netstat -ano \| findstr :25565`；Linux：`ss -tlnp \| grep 25565` で PID を調べて終了 |
| `Could not reserve enough space for object heap` | `-Xmx` が使用可能メモリを超えている | `-Xmx` を小さくする（例：`-Xmx2G`） |
| 自分からの telnet は通るが他人がつながらない | ローカルのファイアウォールだけ設定し、クラウドのセキュリティグループを開放していない | クラウドのコンソールで受信ルールを追加 |
| プラグイン / MOD が奇妙なパスエラーを出す | ディレクトリに日本語や空白が含まれる | `C:\mcserver` や `/opt/mcserver` のような英数字のみのパスへ移す |
| Linux で `Permission denied` | サーバーを root で作成し、一般ユーザーに書き込み権限がない | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Windows PC がスリープして切断される | システムの休止がサービスを中断した | 電源オプションを「スリープしない」にするか、常時稼働のマシンに変える |

## 次のステップ

環境が整ったらサーバーコアを導入できます：

- **サーバーコアの選択**：[サーバーコアの選択](/tutorials/java/core) を参照 —— ハードウェアと遊び方でコアを選ぶ（コアが多くクロックが低いなら Folia、シングルコアが強いなら Paper 系、レッドストーン技術なら Fabric か Leaves）
- **項目別の対照**：[サーバーコア比較](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) を参照 —— 性能、プラグイン、MOD、用途の一覧

**起動前にもう一度 2 点確認**：Java のバージョンが対象の MC バージョンと合っているか、25565 がセキュリティグループと OS のファイアウォールの両方で開放されているか。

環境とコアが決まったら、起動スクリプトを書いてサーバーを動かします：[サーバーの起動](/tutorials/java/start) を参照。
