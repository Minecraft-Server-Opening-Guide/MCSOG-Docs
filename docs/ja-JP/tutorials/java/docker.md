---
title: Docker で Java 版サーバーをデプロイする
slug: docker
cat: java
level: 3
order: 25
minutes: 16
tags: [Docker, compose, Java, paper, container, deployment, バックアップ]
updated: 2026-10-04
draft: false
---

これまでの記事はホストマシンに直接 Java を入れてサーバー jar を動かす話でした。本記事は**コンテナ**に切り替えます：`docker-compose.yml` 1 枚でサーバーとその実行環境をまとめて記述し、Docker に動かさせます。

コンテナは必須ではありませんが、長く存在するいくつかの面倒を解決します：**ホストが Java のバージョンで汚染される、マシンを替えるたびにやり直しになる、アップグレードで失敗すると戻れない**。代償は、ツールの層を 1 つ多く学ぶことと、「ボリュームとバックアップ」を規律として実行することです。

## 1. なぜコンテナ化するのか

### 1.1 利点

| 利点 | 具体的な現れ方 |
| --- | --- |
| **環境がきれいで互いに干渉しない** | Java ランタイムはイメージの中にあり、ホストに JDK を入れる必要がありません。1.20 と 1.21 の 2 台を同時に動かしても、システムの Java を取り合いません |
| **再現できる** | イメージタグ、コアの種類、バージョン、メモリ、ポートがすべて 1 つのファイルに書かれ、マシンを替えるときはそのファイルを持っていくだけ |
| **ロールバックが容易** | アップグレード前に `/data` をバックアップし、問題があればバージョン番号を戻して再起動するだけ。イメージタグも固定できます |
| **プロセス管理が楽** | クラッシュ時の自動再起動、起動時の自動開始は `restart` ポリシーが担当し、systemd ユニットを自分で書く必要がありません |
| **削除がきれい** | 不要になったらコンテナとボリュームを消すだけ。ホストに散らかったディレクトリやユーザーが残りません |

### 1.2 代償と前提

| 代償 | 説明 |
| --- | --- |
| **学ぶ層が 1 つ増える** | イメージ、コンテナ、ボリューム、ネットワーク、Compose という概念は避けられません。問題が出たら `docker compose logs` を読める必要があります |
| **ボリュームとバックアップの規律** | セーブデータは「見慣れたディレクトリ」ではなくボリュームの中にあります。自分からバックアップしなければバックアップは存在しません |
| **性能のオーバーヘッドは小さいがゼロではない** | ネットワークに NAT の層、ファイルシステムに overlay の層が増えます。通常はサーバー自身のボトルネックよりはるかに小さいですが、**メモリと CPU の上限設定を間違えると、サーバーを直接遅くしたり殺したりします** |
| **一部のコア／プラグインは調整が必要** | コンソール入力が必要、追加ポートが必要、特定の Java バージョンが必要、ネイティブライブラリに依存するプラグインなどは追加設定が要ることがあります。詳細は [パフォーマンス最適化](/tutorials/java/optimize) と [プラグイン管理](/tutorials/java/plugin-manage) |

:::note コンテナは仮想マシンではない
コンテナはホストとカーネルを共有するため、「隔離」とはプロセスとファイルシステムの層での隔離であり、セキュリティ境界ではありません。コンテナ内の root はホストの root と自動的に同じではありませんが、**Docker の権限を誰に与えるかは、ホストの root を誰に与えるかと同じ**です。
:::

## 2. Docker と Compose プラグインの導入

出所不明の「ワンクリックインストールスクリプト」をコピーしないでください。以下に **Ubuntu / Debian** の完全な手動導入手順を示します（各コマンドの役割も説明します）。他のディストリビューションと Windows / macOS は本節末尾の公式入口を参照してください。

### 2.1 システムを更新し旧バージョンを削除する

```bash
sudo apt update
sudo apt upgrade -y
```

まず `docker.io`、`docker-compose`、`podman-docker`、`containerd`、`runc` などの旧パッケージが入っていないか確認します —— これらは公式版と**衝突**します（ポート、設定ファイル、依存を取り合う）：

```bash
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)
```

コマンドの分解：`dpkg --get-selections` がインストール済みパッケージを列挙し、`cut -f1` がパッケージ名だけを取り、`apt remove` が 1 つずつ削除します。

:::note ヒント
Docker を一度も入れていないシステムでは、このコマンドは「これらのパッケージが見つからない」と表示します。**正常な動作**なので無視して構いません。
:::

### 2.2 前提の依存を導入する

Docker の公式リポジトリは HTTPS を使うため、システムに証明書の検証とダウンロードの能力が必要です：

```bash
sudo apt install -y ca-certificates curl
```

- `ca-certificates`：ルート証明書の集合。システムが HTTPS サイトの身元を検証でき、鍵のダウンロード時に証明書エラーが出るのを防ぎます。
- `curl`：コマンドラインのダウンロードツール。Docker の GPG 公開鍵を取得するのに使います。

### 2.3 Docker 公式の GPG 鍵を追加する

パッケージマネージャーは「デジタル署名の公開鍵」でソフトウェアの出所を検証し、改ざんされたパッケージのダウンロードを防ぎます。

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

1 つずつ説明：

- `install -m 0755 -d /etc/apt/keyrings`：第三者のリポジトリの鍵を置く専用ディレクトリを作る。権限は `rwxr-xr-x`。
- `curl -fsSL ... -o ...`：公開鍵をダウンロードして保存。`-f` はエラー時に静かに失敗（エラーページを書き込まない）、`-s` は静か、`-S` はエラー時に表示、`-L` はリダイレクトを追う、`-o` は出力先の指定。
- `chmod a+r`：すべてのユーザーに読み取り権限を与える。**この手順は省けません**。そうしないと `apt update` が鍵を読むときに失敗します。

`curl` がネットワークの問題で失敗する場合は `wget` に替えられます：

```bash
sudo wget -O /etc/apt/keyrings/docker.asc https://download.docker.com/linux/ubuntu/gpg
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### 2.4 Docker 公式の APT リポジトリを追加する

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

- これは **DEB822 形式**（Ubuntu 22.04 以降と比較的新しい Debian が対応）で、旧来の 1 行の `sources.list` より分かりやすい。
- `Suites` は `$(. /etc/os-release && echo ...)` で**マシンのバージョンコードネームを動的に読む**（`jammy`、`noble`、`bookworm` など）。リポジトリとシステムのバージョンが厳密に一致します。コードネームを直接書き込んでも構いません。
- `Signed-By` は先ほどの鍵を指し、このリポジトリからダウンロードしたパッケージがすべて Docker 公式の署名検証を通ることを保証します。

:::warn Debian ユーザーへの注意
Debian のリポジトリ URL は `https://download.docker.com/linux/debian` で、バージョンコードネームは `VERSION_CODENAME`（`bookworm` など）から取ります。書き方は上と同じで、`ubuntu` を `debian` に替えるだけです。
:::

### 2.5 Docker エンジンと Compose を導入する

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

各コンポーネントの役割：

| パッケージ名 | 役割 |
| --- | --- |
| `docker-ce` | Docker コミュニティ版の中核エンジン。コンテナの作成と管理を担う |
| `docker-ce-cli` | コマンドラインクライアント。`docker` コマンドを提供 |
| `containerd.io` | 下層のコンテナランタイム。コンテナのライフサイクルを管理 |
| `docker-buildx-plugin` | ビルドプラグイン。マルチプラットフォームのイメージビルドに対応 |
| `docker-compose-plugin` | Compose v2 プラグイン。`docker compose` コマンドを提供 |

### 2.6 起動と検証

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

`active (running)` が見えれば正常です（状態ページは `q` で終了）。`enable` で Docker が起動時に自動で立ち上がります。

そのうえで公式のテストイメージで「取得できる、動く」を検証します：

```bash
sudo docker run --rm hello-world
```

`Hello from Docker!` が出れば環境は正常です。

### 2.7 国内ミラーによる高速化を設定する（中国大陸のサーバーに推奨）

Docker Hub のイメージレイヤーは国内から直結すると遅い、あるいはタイムアウトすることがよくあります。**イメージ名を変えずに**アクセラレータを設定し、`docker pull` が自動的にミラーサイトを通るようにできます。

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

反映されたか確認：

```bash
docker info | grep -A5 "Registry Mirrors"
```

:::warn 第三者のミラーサイトについて
上に挙げたアクセラレータはすべて**コミュニティが維持する第三者サービス**で、可用性、速度制限の方針、安全性は随時変わり、ある日サービスが止まることもあります。

- **公開イメージの取得**にだけ使い、プライベートイメージや認証情報をこれらに通さないこと；
- あるサイトが使えなくなったら、リストから削除して `systemctl restart docker` するだけ；
- 本番環境でより確実なのは、自前のレジストリ（Harbor など）を立てるか、クラウド事業者のコンテナイメージサービスを使うことです。
:::

もう 1 つの一時的な方法は**イメージ名の前に接頭辞を付ける**こと（`docker run docker.1ms.run/hello-world` など）ですが、こうして取得したイメージ名は接頭辞付きになり、接頭辞なしの同名イメージとは**システム上で別のイメージとして扱われます**。重複取得とディスクの無駄につながるため、**長期的な使用は勧めません**。

### 2.8 docker グループについて

Linux ではユーザーを `docker` グループに追加すると `sudo` なしで使えます：

```bash
sudo usermod -aG docker $USER
# 再ログイン（または newgrp docker）しないと反映されない
```

:::warn これはそのユーザーにホストの root 権限を与えるのと同じ
任意のディレクトリをマウントでき、特権コンテナを起動でき、iptables も変更できます。個人のマシンなら許容できますが、**複数ユーザーのサーバーでは慎重に**。関連する強化は [システムセキュリティの強化](/tutorials/ops/system-security) を参照。
:::

### 2.9 他プラットフォームの公式入口

| プラットフォーム | 公式入口 |
| --- | --- |
| Linux（各ディストリビューション） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux の Compose プラグイン | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

入れたら 2 点を確認します：**Docker デーモンが使える**、**Compose が v2 プラグイン（`docker compose`、間はスペース。`docker-compose` ではない）**。

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::warn docker グループについて
Linux でユーザーを `docker` グループに入れると `sudo` なしで Docker を動かせますが、**これはそのユーザーにホストの root 権限を与えるのと同じ**です（任意のディレクトリをマウントでき、特権コンテナを起動できる）。個人のマシンなら許容できますが、複数ユーザーのサーバーでは慎重に。関連する強化は [システムセキュリティの強化](/tutorials/ops/system-security) を参照。
:::

## 3. イメージ：`itzg/minecraft-server`

Java 版コミュニティで最もよく使われるイメージは **`itzg/minecraft-server`** です（活発に維持され、ドキュメントが揃い、Vanilla / Paper / Purpur / Fabric / NeoForge / Forge など多くのコアに対応）。「コアのダウンロード、設定の生成、EULA への同意、RCON の有効化」といった手順を環境変数にしてくれます。

```bash
docker pull itzg/minecraft-server
```

:::warn イメージは出所を選び、タグは固定する
公式または長期保守されているイメージからのみ取得してください。**本番で `latest` を使い続けない** —— `latest` はある日の `pull` で静かに新バージョンに変わり、問題が出たときに設定が変わったのかバージョンが変わったのか判断できなくなります。最新版を追うなら、バージョン番号を明示して書き、アップグレード前にバックアップしてください。
:::

## 4. 完全な `docker-compose.yml`

新しいディレクトリ（`~/mcsog-java` など）を作り、その中に `docker-compose.yml` を作成します：

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

Compose v2 はトップレベルの `version:` フィールドを**もう必要としません**。書いても無視されます（一部のバージョンはヒントを出します）。

項目ごとの説明：

| フィールド | 役割 |
| --- | --- |
| `image` | どのイメージを使うか。タグを省略すると `:latest` になり、勧めません |
| `container_name` | コンテナ名を固定。以降の `logs` / `exec` / `attach` でこれを使う。自動生成の名前より覚えやすい |
| `ports` | `ホストのポート:コンテナのポート/プロトコル`。Java 版は **TCP 25565** で、`"25565:25565/tcp"` と書くのが最も誤解が少ない |
| `environment` | イメージが読む設定。第 6 節の表を参照 |
| `volumes` | `ボリューム名:/data`。**セーブデータ、プラグイン、設定はすべて `/data`** にあり、このデプロイで唯一失ってはいけないもの |
| `stdin_open: true` | コンテナの標準入力を開いたままにする。そうしないとサーバーのコンソールに**文字を打てません** |
| `tty: true` | 疑似端末を割り当て、コンソールに正常な対話とエコーを持たせる（`docker attach` と併用） |
| `restart: unless-stopped` | クラッシュやホスト再起動のあと自動で立ち上げる。ただし**手動で `docker compose stop` したあとは自動で立ち上がりません**。直感どおりの挙動 |

`volumes` に `name: mcsog-java-data` を明示したのは、ボリューム名を**予測可能**にするためです。書かないと Compose がプロジェクト名の接頭辞を自動で付け（`mcsogjava_mcsog-java-data` など）、あとでバックアップコマンドを書くときにボリュームを指し間違えやすくなります。

:::note `EULA=TRUE` は法的な要件であり、技術的なスイッチではない
`EULA: "TRUE"` は**あなたが [Minecraft エンドユーザーライセンス契約](https://aka.ms/MinecraftEULA) を読み同意した**ことを意味します。これはサーバーソフトを使う前提条件で、イメージはあなたの宣言を `eula.txt` に書くだけです。この変数を書かない（または `FALSE` にする）と、サーバーは起動直後に終了します。記入する前に本当に一度契約を読んでください。
:::

:::tip 変更したらまず「健康診断」
compose ファイルを変えるたびに `docker compose config` を 1 回実行してください：ポート、ボリューム、環境変数を展開して出力し、間違いはその場でエラーになります。起動後にログを漁るよりずっと速いです。
:::

```bash
docker compose config
```

## 5. ネットワークとファイアウォール（最もつまずきやすい節）

この節が本記事で最も重要な部分です。Docker のネットワーク挙動は**「ソフトを入れてポートを開ける」という直感とはまったく違います**。「ファイアウォールで許可したのにスキャンされる」「社内ネットワークが突然通らない」「マシンを替えたらつながらない」という問題の多くは、ここに原因があります。

### 5.1 OS のファイアウォールは Docker を制御できない

**結論から：`ufw`、`firewalld`、`iptables` に自分で書いたルールは、Docker コンテナがマッピングしたポートにはすべて無効です。**

理由は Docker の起動順序とルールの位置にあります：

- Docker デーモンは起動時に**自分で** `iptables` のルールを作ります。`nat` テーブルの `DOCKER` チェーン、`filter` テーブルの `DOCKER`、`DOCKER-ISOLATION`、`DOCKER-USER` チェーンなどです。
- これらのルールは OS のファイアウォールのルール**より前**（`FORWARD` チェーンの先頭）に挿入され、しかも Docker が `FORWARD` チェーンで積極的に許可します。
- 結果：パケットは `ufw` のルールに到達する前に、すでに Docker のルールで処理されています。

検証方法（**実際に 1 回やってみることを勧めます。最も印象に残ります**）：

```bash
# 1. まずそのポートを明確に拒否する
sudo ufw deny 25565/tcp

# 2. ルールが反映されたことを確認
sudo ufw status numbered

# 3. そのポートをマッピングしたコンテナを起動
docker run -d --name test-web -p 25565:80 nginx

# 4. 別のマシンからアクセス
#    telnet あなたの公衆IP 25565
#    → 成功する。ufw の deny は完全に迂回される。
```

### 5.2 正しい 4 つの方法

**方法 1：ポートをループバックにだけ束縛する（推奨。最も安全で最も簡単）**

```yaml
services:
  mc:
    ports:
      - "127.0.0.1:25565:25565/tcp"
```

`127.0.0.1:` の接頭辞を付けると、ホストは**ループバックインターフェース**でしかそのポートを待ち受けず、公衆からは**直結できません**。外部に提供するには、ホスト上のリバースプロキシで転送します：

```nginx
# /etc/nginx/nginx.conf（stream モジュール、レイヤー 4 転送）
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

こうすればファイアウォールのルールが再び有効になります：外部は Nginx にしか届かず、Nginx が本機のループバック上のコンテナへ転送します。**統合版（UDP）も同じで、`listen 19132 udp;` とすれば動きます。**

**方法 2：`DOCKER-USER` チェーンを使う**

`DOCKER-USER` は Docker が公式に用意し、**Docker 自身が上書きしない**チェーンで、送信元の制限に向いています：

```bash
# 指定した送信元だけに 25565 へのアクセスを許可し、他は破棄
sudo iptables -I DOCKER-USER -p tcp --dport 25565 ! -s 203.0.113.0/24 -j DROP

# ルールを表示
sudo iptables -L DOCKER-USER -n --line-numbers
```

注意：

- `-A` ではなく `-I`（先頭に挿入）を使い、前の許可ルールに先を越されないようにする。
- ルールは**再起動で失われます**。`iptables-persistent` や起動スクリプトで永続化が必要です。
- このチェーンは**転送**トラフィックだけを扱い、`host` ネットワークモードには効きません（5.4 を参照）。

**方法 3：[ufw-docker](https://github.com/chaifeng/ufw-docker) で UFW にコンテナを再び制御させる（「UFW を統一的な入口にし続けたい」人に推奨）**

前の 2 つは、ポートの束縛方法を変える（方法 1）か、iptables ルールを自分で維持する（方法 2）かのどちらかでした。**`ufw` という 1 つのツールでファイアウォールのルールをすべて管理し続けたい**なら、このスクリプトが最も手間が少ないです。

考え方は「迂回」でも「無効化」でもなく、**Docker が用意した `DOCKER-USER` チェーンを UFW の転送チェーンへつなぎ戻す**ことです。これにより `ufw route` コマンドでコンテナのポートを直接管理できます。

**インストール（3 つのコマンド）**：

```bash
sudo wget -O /usr/local/bin/ufw-docker \
  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
sudo chmod +x /usr/local/bin/ufw-docker
sudo ufw-docker install
```

`ufw-docker install` は 2 つのことをします：`/etc/ufw/after.rules` を**バックアップ**し、ルールをファイル末尾に**追記**します（中核は `-A DOCKER-USER -j ufw-user-forward` の 1 行）。Docker の設定は**変更しません**。Docker は依然として自分でネットワークを管理します。

入れたら確認：

```bash
ufw-docker check     # ルールが書き込まれたか確認
ufw-docker status    # 現在許可している転送ルールを表示
```

:::warn 入れたらサーバーを 1 回再起動してください
作者が明確に注意しています：**UFW を再起動してもルールが効かないことがある**。その場合はサーバーを再起動すれば解決します。本番環境ではメンテナンス時間を確保してください。
:::

**日常の使い方**（Java 版 25565 を例に）：

```bash
# 外部からコンテナのポート 25565 へのアクセスを許可（注意：【コンテナのポート】を書く。ホストのポートではない）
sudo ufw route allow proto tcp from any to any port 25565

# 許可を取り消す
sudo ufw route delete allow proto tcp from any to any port 25565

# あるコンテナのルールだけを見る
ufw-docker list mc

# コンテナ名で直接許可する（スクリプトが提供する簡便な書き方）
sudo ufw-docker allow mc 25565
sudo ufw-docker allow mc 25565/tcp

# あるコンテナのルールを取り消す
sudo ufw-docker delete allow mc 25565
```

**統合版（UDP）も同様**：

```bash
sudo ufw route allow proto udp from any to any port 19132
sudo ufw-docker allow mc-bedrock 19132/udp
```

**コンテナの IP が変わったら**：コンテナを再作成すると IP が変わります。スクリプトは再読み込みのコマンドを提供しています：

```bash
sudo ufw-docker reload
```

**なぜ `ufw allow`（入力チェーン）ではなく `ufw route`（転送チェーン）を使うのか**：

| コマンド | 作用範囲 | リスク |
| --- | --- | --- |
| `ufw allow 25565` | 【ホスト】と【コンテナ】の 25565 を**同時に**許可する | ホスト側のサービスまで晒してしまうことがある |
| `ufw route allow … port 25565` | コンテナへ転送されるトラフィック**だけ**を許可 | ホスト上の 25565 は開かないままで、境界が明確 |

**任意：コンテナへのアクセスを許可するネットワーク帯を指定する**

既定では標準のプライベート帯（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`）だけを信頼します。社内ネットワークが別の帯なら：

```bash
# すべての Docker ネットワークの帯を自動認識（ネットワークを追加・削除したら再実行）
sudo ufw-docker install --docker-subnets

# または明示的に指定
sudo ufw-docker install --docker-subnets 192.168.207.0/24 10.207.0.0/16
```

**不要になったときのアンインストール**：

```bash
sudo ufw-docker uninstall   # UFW の設定を戻し、インストールしたファイルを削除
```

**この方案の利点と代償**：

| | 説明 |
| --- | --- |
| ✓ Docker の iptables を無効にしなくてよい | コンテナは外部にアクセスでき、Docker ネットワークを追加してもルールを手で維持しなくてよい |
| ✓ 1 つのツールで管理し切れる | ホストのポートは `ufw allow`、コンテナのポートは `ufw route allow`。どちらも `ufw status` で見える |
| ✓ IPv6 と Swarm に対応 | 必要に応じて `after6.rules` を自動更新。Swarm モードでは管理ノードで一括管理できる |
| ✗ 第三者のスクリプト | Docker や Canonical の公式コンポーネントではない。アップグレードと監査は自分で気にする必要がある（スクリプトは短いので一読を勧める） |
| ✗ 書くのはコンテナのポート | `-p 8080:80` なら `80` を使う。`8080` ではない。ここが最も間違えやすい |
| ✗ 初回インストール後にサーバーの再起動が必要 | 上の警告を参照 |

**方法 4：Docker の iptables 管理を切る（初心者には非推奨）**

```json
// /etc/docker/daemon.json
{
  "iptables": false
}
```

変更後に `sudo systemctl restart docker`。代償は：

- **ポートマッピング（`-p`）が効かなくなる**。NAT ルールが自動生成されなくなるため；
- コンテナは既定で外部にアクセスできず、SNAT を自分で設定する必要がある；
- コンテナ間のブリッジ越しの通信にも影響する。

自分で NAT を引き受けると完全に理解しているときだけ、こうしてください。

### 5.3 ポートマッピングの 3 つの書き方と違い

| 書き方 | 待ち受けアドレス | 誰がアクセスできるか | 向いている場面 |
| --- | --- | --- | --- |
| `-p 25565:25565` | `0.0.0.0`（すべての NIC） | **公衆 + 内部のすべて** | セキュリティグループやクラウドのファイアウォールで下限を守っている場合のみ許容 |
| `-p 127.0.0.1:25565:25565` | ループバックのみ | **本機のみ** | **推奨**：リバースプロキシか SSH トンネルと組み合わせる |
| `-p 192.168.1.10:25565:25565` | 指定した NIC | その帯のみ | 純粋な内部／LAN サーバー |

**要点**：`-p 25565:25565` の既定の挙動は `0.0.0.0` への束縛で、つまり**マッピングした時点で公衆に開放**されます（クラウドのセキュリティグループは別の関門ですが、それは本機のファイアウォールではありません）。「ファイアウォールを触っていないから安全」と思っている人が多いですが、実際にはポートは全開です。

### 5.4 5 つのネットワークモードの選び方

| モード | 説明 | 利点 | 欠点 | いつ使うか |
| --- | --- | --- | --- | --- |
| `bridge`（既定） | コンテナを `docker0` ブリッジに接続し、NAT で外に出る | 隔離がよく、ポートを制御できる | NAT の層が増える。`-p` がないと到達できない | **ほとんどの場面** |
| `host` | コンテナが**ホストのネットワークスタックを直接使う**。ブリッジも NAT も作らない | 性能が最高、遅延が最小 | **ネットワークの隔離を完全に失う**。ポート衝突。`-p` が無視される。Docker のファイアウォールルールも適用されない | 極限の性能やポートが複雑な場面 |
| `macvlan` | コンテナに独立した MAC と LAN の IP を割り当て、LAN 内の実機のように見せる | **LAN 内から直接発見できる**（統合版の LAN リスト、Java 版の LAN ブロードキャスト） | スイッチ／ルーターの対応が必要。一部のクラウド環境では非対応 | LAN でのマルチプレイ、ブロードキャスト発見が必要な場面 |
| `overlay` | 複数ホストをまたぐ仮想ネットワーク（Swarm 用） | マルチホストのクラスタ | 複雑度が高い | マルチホストのデプロイ |
| `none` | ネットワークなし | 完全な隔離 | コンテナは通信できない | 純粋なオフライン計算タスク |

```yaml
# host モードの例（注意：このとき ports の記述は無意味）
services:
  mc:
    network_mode: host
    environment:
      SERVER_PORT: "25565"
```

:::warn host モードではファイアウォールが逆に「効く」が、ポートも本当に全開になる
`host` モードは Docker の NAT ルールを通らないため、`ufw` はこのとき**ポートを塞げます**。しかしコンテナがホストのポートを直接占有するので、**サーバーが待ち受けている限り公衆から接続できます**。安全性は完全に OS のファイアウォールとセキュリティグループ次第です。使う前にルールが正しいことを必ず確認してください。
:::

### 5.5 `docker0` の帯の衝突（内部ネットワークが突然通らなくなる最大の原因）

Docker は既定で `docker0` ブリッジに **`172.17.0.0/16`** を割り当て、カスタムネットワークを作るたびに `172.18.0.0/16`、`172.19.0.0/16`……と順に占有します。

**問題は**：**社内ネットワーク、VPN、クラウド事業者の内部ネットワーク**も `172.17.x.x` を使っていると、ホストに同じ帯を指すルートが 2 本同時に存在することになり、次の形で現れます：

- コンテナから内部サービスへのアクセスがタイムアウトする；
- ホストから一部の内部アドレスへのアクセスが不安定になる；
- 別のマシンへの SSH が突然切れる。

**切り分け**：

```bash
ip route | grep 172
docker network inspect bridge --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**修正**（Docker の既定アドレスプールを変える。**Docker の再起動が必要で、すべてのコンテナが一時的に中断します**）：

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
# 既存のカスタムネットワークは自動では変わらない。削除して作り直す
docker network ls
docker network rm <ネットワーク名>
```

アドレスプールを選ぶ原則：**自分のすべての内部ネットワーク帯を避ける**（よくあるのは `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` のうち実際に使っている部分を避ける）。内部がすでに `10.x` を使っているなら、`100.64.0.0/16` のようなキャリアグレード NAT の帯に変えられます。

### 5.6 コンテナ同士が互いにアクセスする方法

**同じカスタムネットワーク内では、「サービス名」をホスト名として使い、`localhost` を使わない。**

```yaml
services:
  mc:
    networks: [mcnet]
  backup:
    networks: [mcnet]
    environment:
      TARGET: "mc:25565"     # 正しい：サービス名
      # TARGET: "127.0.0.1:25565"  # 誤り：それは backup コンテナ自身
networks:
  mcnet:
    driver: bridge
```

補足：

- **既定の `bridge` ネットワークはサービス名の解決に対応していません**。自分でネットワークを作る必要があります（`docker network create` か Compose の `networks`）。Compose は既定でプロジェクト用のネットワークを作るので、Compose を使うなら通常は問題ありません。
- **コンテナの IP は再作成で変わります**。どの設定にもコンテナ IP を書かず、必ずサービス名を書いてください。
- コンテナから**ホスト**上のサービス（ホストの MySQL など）にアクセスしたいときは `host.docker.internal`（Linux では `extra_hosts` に `host-gateway` を追加）か `--network host` を使います。

### 5.7 ネットワーク関連のよくある落とし穴の早見表

| 現象 | 原因 | 対処 |
| --- | --- | --- |
| `ufw` で許可しても拒否しても、コンテナのポートの挙動が変わらない | Docker が OS のファイアウォールを迂回する | `-p 127.0.0.1:` か `DOCKER-USER` チェーンを使う |
| 開けるつもりのないポートに公衆からアクセスできる | `-p` の既定が `0.0.0.0` への束縛。しかも OS のファイアウォールはコンテナを制御できない | `-p 127.0.0.1:ホストのポート:コンテナのポート` に変える。§5.3 を参照 |
| コンテナから内部サービスへのアクセスがタイムアウトする | `docker0` の帯が内部ネットワークと衝突 | `default-address-pools` を変え、ネットワークを作り直す |
| LAN リストに統合版サーバーが見えない | `bridge` モードはブロードキャストを転送しない | `macvlan` か `host` モードに変える |
| コンテナを作り直したら接続先が無効になった | コンテナの IP が変わった | サービス名を使い、IP を書かない |
| コンテナからホストのサービスにつながらない | `localhost` はコンテナ自身を指す | `host.docker.internal` か `host` ネットワークを使う |
| `host` モードで `ports` が効かない | `host` モードはポートマッピングを使わない | サーバーの待ち受けポートを直接変える |
| 大きなパケットの転送でたまにラグやタイムアウトが出る | MTU の不一致（一部のクラウド事業者） | `daemon.json` に `"mtu": 1400` か事業者の推奨値を設定 |
| 再起動後に `DOCKER-USER` のルールが消える | iptables のルールが永続化されていない | `iptables-persistent` か起動スクリプトを使う |

### 5.8 安全な外部公開のチェックリスト

次の順に確認してください。1 つでも満たさないと「開けていないつもりが、実は全開」になりえます：

1. **クラウド事業者のセキュリティグループ**：本当に必要なポートと送信元だけを許可（固定の送信元が使えるなら `0.0.0.0/0` を使わない）。
2. **ポートの束縛**：`-p 127.0.0.1:...` を使い、`-p ...` にしない。
3. **リバースプロキシ**：Nginx の `stream` や frp などで外部に出し、コンテナのポートを本機の外に出さない。
4. **OS のファイアウォール**：**コンテナ以外**のサービスには依然として有効なので、通常どおり設定する。
5. **実測**：**別のマシン**から `telnet 公衆IP ポート` を実行するか、オンラインのポートスキャンツールで**開けていない**ポートが本当に到達不能か確認する。
6. **RCON は絶対に公衆へマッピングしない**（§6 の環境変数表の下の説明を参照）。

## 6. 起動、ログ、コンソール、停止

```bash
docker compose up -d
```

初回起動はサーバーコアのダウンロードとワールド生成で、**数分から十数分かかるのが正常**です。固まったと思わないでください：

```bash
docker compose logs -f
```

`Done (xx.xxxs)! For help, type "help"` のような表示が出れば起動しています。`Ctrl+C` はログ追跡を終了するだけで、**サーバーは止まりません**。

コンソールに入ってコマンドを実行（イメージに `rcon-cli` が入っており、`RCON_PASSWORD` で自動ログインします）：

```bash
docker compose exec -it mcsog-java rcon-cli
docker compose exec -it mcsog-java rcon-cli list
docker compose exec -it mcsog-java rcon-cli save-all
```

本当の対話型コンソール（連続入力でき、リアルタイムのエコーが見える）が必要なときは `attach` を使います：

```bash
docker attach mcsog-java
```

:::warn attach での 2 つのキーの罠
`docker attach` の中で `Ctrl+C` を押すと、割り込みシグナルがサーバープロセスに送られ、**そのままサーバーが落ちます**（セーブデータが壊れる可能性があります）。正しい終了方法は `Ctrl+P` のあと `Ctrl+Q`（detach。コンテナは動き続ける）。日常的に単発のコマンドを実行するなら `rcon-cli` を優先してください。
:::

停止と削除：

```bash
docker compose stop
docker compose down
```

| コマンド | 何をしたか | ボリューム内のデータ |
| --- | --- | --- |
| `docker compose stop` | コンテナを停止。コンテナは残る | 保持 |
| `docker compose start` | 停止したコンテナを起動 | 保持 |
| `docker compose down` | 停止し、**コンテナとネットワークを削除** | 保持 |
| `docker compose down -v` | 上記すべてに**ボリュームの削除**を追加 | **すべて失われる** |

:::danger 何気なく `-v` を付けない
`docker compose down -v` は `/data` ボリュームを削除し、セーブデータ、プラグイン、設定がまとめて失われます。「完全にやり直す」と決めており、使えるバックアップがあると確認できたときだけ使ってください。
:::

## 7. 本記事の例で使う環境変数

下表は上の compose ファイルで使った変数と、よく使う補足項目です。**既定値はイメージのバージョンで変わるため、必ずイメージの公式ドキュメントを優先してください。**

| 変数 | 役割 | 例 |
| --- | --- | --- |
| `EULA` | Minecraft EULA に同意したことを宣言。未設定だと起動に失敗する | `"TRUE"` |
| `TYPE` | サーバーコアの種類 | `"PAPER"`、`"VANILLA"`、`"FABRIC"`、`"NEOFORGE"` |
| `VERSION` | Minecraft のバージョン。そのコアが対応するバージョンであること | `"1.21.11"`、`"LATEST"` |
| `MEMORY` | サーバーに割り当てる JVM ヒープ | `"4G"` |
| `ONLINE_MODE` | 正規アカウントを検証するか（`online-mode` に対応） | `"TRUE"` / `"FALSE"` |
| `ENABLE_RCON` | RCON 遠隔コンソールを有効にするか | `"true"` |
| `RCON_PASSWORD` | RCON のパスワード。**必ず自分で強いものに変える** | 長いランダム文字列 |
| `RCON_PORT` | RCON の待ち受けポート（既定 25575。**公衆へマッピングしない**） | `"25575"` |
| `TZ` | コンテナのタイムゾーン。ログの時刻に影響 | `"Asia/Shanghai"` |
| `DIFFICULTY` | ゲームの難易度 | `"normal"` |
| `MOTD` | サーバーリストに表示される説明 | `"MCSOG Java"` |
| `MAX_PLAYERS` | 最大プレイヤー数 | `"20"` |
| `OPS` | 管理者権限を直接与えるプレイヤー名。カンマ区切り | `"Alice,Bob"` |
| `WHITELIST` | ホワイトリストのプレイヤー名。カンマ区切り | `"Alice,Bob"` |
| `ENFORCE_WHITELIST` | ホワイトリストを強制するか | `"TRUE"` |
| `PUID` / `PGID` | 指定したユーザー／グループとして実行（バインドマウントの所有者問題用。**使い方はイメージのドキュメントを優先**） | `"1000"` |

:::note RCON は「画面のない管理者権限」
`ENABLE_RCON: "true"` はコンテナ内部で `25575` を待ち受けるだけです。**`25575` を公衆へマッピングしないでください**：RCON プロトコルは暗号化されず、パスワード 1 つでコンソールそのものです。遠隔管理が必要なら SSH トンネルかパネルを使ってください。[ネットワークセキュリティの基礎](/tutorials/ops/network-security) を参照。
:::

## 8. `/data` の中身

コンテナは「使い捨て」ですが、ボリュームは違います。以下はすべて `/data` にあります：

| パス | 内容 |
| --- | --- |
| `/data/world/` | メインワールドのセーブデータ（ネザー、エンドはそれぞれ独立したディレクトリ） |
| `/data/plugins/` | プラグインの jar とその設定 |
| `/data/mods/` | MOD（`TYPE` が MOD 系コアのとき使う） |
| `/data/server.properties` | サーバー設定（ポート、難易度、`online-mode` など） |
| `/data/eula.txt` | EULA の宣言。`EULA` 変数が書き込む |
| `/data/logs/` | サーバーのログ |

したがって：**コンテナはいくらでも削除できるが、ボリュームは削除できない。** ボリュームがどこにあるか確認するには：

```bash
docker volume ls
docker volume inspect mcsog-java-data
```

## 9. バックアップと復元

バックアップする対象は `/data` で、コンテナではありません。最も確実なのは**先にサーバーを止めてから固める**ことです：

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

Windows PowerShell ではマウントのパスを `-v "${PWD}\backups:/backup"` に変えます（Docker Desktop）。

オンラインのまま止められない場合は、コンソールのコマンドで整合性を保ちます：

```bash
docker compose exec -it mcsog-java rcon-cli save-all
docker compose exec -it mcsog-java rcon-cli save-off
```

`save-all` はメモリ上のデータをディスクに書き出し、`save-off` は自動保存を切ります。これで固めている間に新しい書き込みが起きません。固めたら元に戻します：

```bash
docker compose exec -it mcsog-java rcon-cli save-on
```

復元するときは**先にコンテナを止め**、ボリュームを空にしてから展開します（この手順はボリュームの現在の中身を上書きします）：

```bash
docker compose stop
docker run --rm \
  -v mcsog-java-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-java-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn コンテナはバックアップではない
サーバーをコンテナで動かすことは、データが安全であることと**同じではありません**。ボリュームとコンテナは同じディスク上にあり、ボリュームの誤削除、ディスクの故障、ランサムウェアによる暗号化は、まとめて持っていかれます。少なくとも**オフラインか遠隔地**のコピーを 1 つ残してください。方法は [バックアップと復元](/tutorials/java/backup) と [遠隔地バックアップ](/tutorials/ops/offsite-backup) を参照。**復元を検証していないバックアップはバックアップではありません。**
:::

## 10. イメージの更新、コアとバージョンの切り替え

イメージを上げる（バグ修正や新バージョンへの追随）：

```bash
docker compose pull
docker compose up -d
```

順序が重要です：**先にバックアップ、次に pull、最後に up**。`docker compose up -d` はイメージや設定の変化を検出するとコンテナを作り直しますが、ボリュームはそのまま付け直されるのでセーブデータは失われません —— ボリュームを消していなければ。

コアの種類やバージョンを変えるときは、環境変数だけ変えて `up -d` し直します：

```yaml
    environment:
      TYPE: "FABRIC"
      VERSION: "1.21.11"
```

| 変更 | 何が起きるか | 注意 |
| --- | --- | --- |
| `VERSION` だけ変える | イメージが新バージョンのコアをダウンロード | **セーブデータの形式アップグレードは一方通行**。新しい形式のセーブデータは通常古いバージョンで開けない。アップグレード前のバックアップが必須 |
| `TYPE` を変える（プラグイン系コア同士） | コアの jar が変わり、`plugins/` はそのまま使える | プラグインとコア／バージョンが互換であること |
| `TYPE` を変える（プラグイン系から MOD 系へ） | サーバーが `mods/` を読むようになる | 既存の `plugins/` は効かず、ワールドにも追加の互換対応が要ることがある |
| `MEMORY` を変える | コンテナを作り直し、ヒープを再割り当て | ホストの使用可能メモリの妥当な割合を超えないこと |

## 11. プラグインと MOD の追加

3 つの方法があり、自分の習慣で 1 つ選べば十分です。

**方法 A：バインドマウント（ファイルの変更が最も楽）**

`volumes` をホストのディレクトリに変えます：

```yaml
    volumes:
      - ./data:/data
```

あとはホスト上で直接 `./data/plugins/`、`./data/server.properties` を操作します。Linux では所有者の問題に注意（第 11 節）。

**方法 B：ボリュームにファイルをコピーする（名前付きボリュームを維持）**

```bash
docker cp ./MyPlugin.jar mcsog-java:/data/plugins/
docker compose restart
```

**方法 C：イメージに自動ダウンロードさせる**

イメージは出所を指定してプラグイン／MOD を自動で取得する変数も提供しています（Spiget のリソース番号でプラグインを入れる、Modrinth のプロジェクトで MOD を入れるなど）。これらの変数の名前と値は**イメージの公式ドキュメントを優先**し、使う前に確認してください。

設定を変えたら、多くのプラグインはゲーム内でのリロードに対応しますが、**再起動が最も確実**です：

```bash
docker compose restart
```

## 12. よくある落とし穴

| 現象 | 原因 | 対処 |
| --- | --- | --- |
| 起動直後に終了し、ログに EULA が出る | `EULA: "TRUE"` を設定していない | 変数を補って `docker compose up -d` |
| コンテナがシステムに殺され、ログに OOM が出る | `MEMORY` がホストの出せる量より多い | `MEMORY` を小さくするかメモリを増やす。ホスト側にも余裕を残す |
| 外部からつながらないが、コンテナ内は正常 | ポートをマッピングしていない、またはセキュリティグループが許可していない | `ports` に `25565/tcp` を書き、**クラウドのセキュリティグループ**で許可する。注意：**OS のファイアウォール（ufw/firewalld）はコンテナのポートに無効**。§5.1 を参照 |
| コンテナで `/data` に書き込めず、ログに権限エラー | Linux のバインドマウントの所有者とコンテナ内のユーザーが一致しない | ホストのディレクトリの所有者を直すか、イメージが提供するユーザーマッピング変数（`PUID`/`PGID`、**イメージのドキュメントを優先**）を使う |
| コンテナを作り直したらセーブデータが「消えた」 | ボリュームを削除した（`down -v` など）、または `/data` のマウントを忘れた | すぐに手を止め、バックアップから復元する。以後はボリューム名を固定しバックアップに含める |
| コンソールに文字を打てない | `stdin_open: true` と `tty: true` がない | 追加してコンテナを作り直す |
| `docker compose` がコマンドではないと言われる | 旧版の `docker-compose`（v1）が入っている | 公式ドキュメントに従って Compose v2 プラグインを入れ、コマンドは `docker compose` |
| 設定を変えたのに反映されない | ファイルを変えただけでコンテナを作り直していない | `docker compose up -d` で設定を反映 |

日常の巡回（コンテナの状態、リソース使用量、ディスクの余裕）は [監視とアラート](/tutorials/ops/monitoring) とあわせて行うことを勧めます。

## 13. 次のステップ

- サーバーのディレクトリとファイルをゼロから知る：[サーバーの構成](/tutorials/java/structure)
- 初めてのサーバー構築の完全な流れ：[サーバーの起動](/tutorials/java/start)
- セーブデータ、プラグイン、設定のバックアップ戦略：[バックアップと復元](/tutorials/java/backup)
- ラグの切り分けとパラメータ調整：[パフォーマンス最適化](/tutorials/java/optimize)
- パネルで複数のサーバーを一括管理：[パネル管理ツールの使い方と安全性](/tutorials/ops/panels)

---

> イメージ名、環境変数、既定ポートはイメージの公式ドキュメントを優先します。
