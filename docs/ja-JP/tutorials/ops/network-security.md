---
title: ネットワークセキュリティの基礎
slug: network-security
cat: ops
level: 3
order: 5
minutes: 16
tags: [network-security, firewall, ssh, ddos, secrets, monitoring, ops]
updated: 2026-10-04
draft: false
---

サーバーが他人から接続できるということは、**同時に他人からスキャンされる**ということです。サーバーを開いた初日から、あなたの公衆 IP はポートスキャナ、総当たりスクリプト、「広く撒く」タイプの攻撃ツールに繰り返し探られます —— **誰かに恨まれているからではなく、単に公網に露出しているから**です。

本記事はネットワーク層の防御を扱います：**どのポートを開けるか、ファイアウォールをどう設定するか、SSH をどう強化するか、攻撃されたらどうするか**。システム内部の強化は [システムセキュリティの強化](/tutorials/ops/system-security) を参照。


:::warn Docker コンテナは本機のファイアウォールを迂回する
本ページの `ufw` / `firewalld` のルールは、**Docker コンテナがマッピングしたポートには無効**です。Docker は自分の `iptables` ルールを OS のファイアウォールより前に挿入するため、`ufw deny` ではコンテナのポートを止められません。

本当に制限したいなら、ポートをループバックに束縛する（`-p 127.0.0.1:25565:25565`）か `DOCKER-USER` チェーンを使ってください。詳細は [Docker で Java 版をデプロイ → ネットワークとファイアウォール](/tutorials/java/docker) を参照。
:::

## 1. まず攻撃面を認識する

### 1.1 本当に開放が必要なポート

| 用途 | プロトコル | 既定ポート | 公網に開放するか |
| --- | --- | --- | --- |
| **Minecraft Java 版** | TCP | `25565` | する（プレイヤーの入口） |
| **統合版 / Geyser** | UDP | `19132` | する（クロスプレイサーバーでは必要） |
| **クエリプロトコル（query）** | UDP | `25565` | 通常は不要 |
| **RCON 遠隔コンソール** | TCP | `25575` | **絶対にしない** |
| **データベース**（MySQL / MariaDB） | TCP | `3306` | **絶対にしない** |
| **Redis** | TCP | `6379` | **絶対にしない** |
| **パネル**（各種 Web 管理パネル） | TCP | パネルによる | **絶対にしない** |
| **SSH** | TCP | `22` | する。ただし**送信元を制限** |

:::warn 既定ポートは変更されているかもしれない
上表は各ソフトの**出荷時の既定値**です。`server.properties` で `server-port`、`query.port`、`rcon.port` を変えた、またはパネルで待ち受けポートを変えたなら、**実際の設定を優先**してください。ファイアウォールのルールは実際のポートと一致させる必要があり、そうしないとつながらないか、穴が残ります。
:::

### 1.2 RCON とデータベース：なぜ必ず閉じるのか

- **RCON は「画面のない管理者権限」**です。パスワード 1 つでコンソールから任意のコマンドを実行する能力と引き換えになります。公網に露出した瞬間、攻撃者は自分に `op` を付け、セーブデータを消し、プレイヤーを全員蹴れます。**正しいやり方は `enable-rcon=false` にし、遠隔管理が必要なら SSH トンネルかパネル経由でローカルループバックを通す**ことです。
- **データベースのポート露出は最もよくある情報漏洩の入口**です。MySQL が `root` の任意ホストからのログイン（`root@%`）を許していると、弱いパスワードは数分で総当たりに破られ、プレイヤーのアカウント、パスワードハッシュ、購入履歴がすべて漏れます。
- **パネルのポート露出は、マシン全体の制御権を公網に晒すのと同じ**です。パネル自体にログインページはありますが、そのページにも脆弱性がありえ、しかも通常は高い権限で動きます。

基本原則が 1 つ：**「プレイヤーが使うためのものではない」ポートは、どれも公網に開放しない。** 自分が遠隔アクセスする必要があるときは、直接露出するのではなく SSH トンネル（第 4 節）を使います。

### 1.3 ついでにやる 2 つのこと

- **待ち受けアドレスを確認**：データベース、パネル、RCON は `0.0.0.0` ではなく `127.0.0.1` に束縛すべきです。ループバックに束縛すれば、ファイアウォールを間違えても外部からはつながりません。
- **`online-mode` を確認**：Java 版は `online-mode=true` を保ちます（`server.properties`）。オフラインモードは誰でも他人の ID を騙れるようにする、身元の層の穴で、ファイアウォールでは埋められません。詳細は [サーバーの設定](/tutorials/java/config) を参照。

## 2. ファイアウォールは 2 層であって 1 層ではない

これが初心者が最も見落とす点です：

| 層 | 位置 | 誰が管理するか | 例 |
| --- | --- | --- | --- |
| **クラウドのセキュリティグループ / ネットワーク ACL** | クラウド側。トラフィックは**まだあなたのマシンに届いていない** | クラウド事業者のコンソール | 阿里雲のセキュリティグループ、Tencent Cloud のセキュリティグループ、AWS Security Group |
| **ホストのファイアウォール** | OS の中。`netfilter` / `nftables` | 自分でマシン上に設定 | `ufw`、`firewalld`、`iptables`、`nftables` |

**両方を設定する必要があります。** セキュリティグループだけだと、マシンが別のネットワークに移されたりグループが緩められたりしたときに保護を失います；ホストのファイアウォールだけだと、多くのクラウドの既定セキュリティグループがすでに緩く、最初の扉を開けているのと同じです。

:::warn クラウドプラットフォームの具体的な操作手順は書きません
各クラウドのコンソールはメニュー名、階層、用語が異なります（「セキュリティグループ」「ファイアウォール」「ネットワーク ACL」が混用されています）。**本記事は具体的なメニューの経路を推測しません**。使っている事業者の公式ドキュメントを優先してください。確かなのは：**受信ルール（ingress）は既定ですべて拒否にし、列挙したポートだけを開放する**ことです。
:::

### 2.1 ufw（Ubuntu / Debian で一般的）

`ufw` は `iptables` / `nftables` のフロントエンドで、単一マシンの場面に向きます。

```bash
sudo apt update
sudo apt install -y ufw

# 重要：先に SSH を許可し、そのあと既定拒否を有効にする。逆にすると自分を締め出す
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp

sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 25565/tcp
sudo ufw allow 19132/udp

sudo ufw enable
sudo ufw status verbose
```

`sudo ufw status verbose` は現在の方針とルールを出力します。正常なら `Default: deny (incoming), allow (outgoing)` と、開放した項目が見えます。

**順序が重要**です：先に `sudo ufw enable` してから SSH を許可すると、あなたの接続がちょうど切られた場合、クラウドの VNC / レスキューコンソールから入るしかなくなります。

### 2.2 firewalld（RHEL / Rocky / AlmaLinux / Fedora で一般的）

```bash
sudo dnf install -y firewalld
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --permanent --add-port=19132/udp

# 管理 IP からのみ SSH を許可
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.10" port port="22" protocol="tcp" accept'

sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

`--permanent` は永続設定に書き込み、**`--reload`（または firewalld の再起動）をしないと反映されません**。`--permanent` を付けない変更は実行時のもので、再起動で消えます —— 2 つの方式にはそれぞれ用途があり、混ぜて使って設定できたつもりにならないこと。

### 2.3 iptables（従来の書き方）

```bash
# 確立済みの接続とループバックを許可
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT

# 管理 IP からのみ SSH を許可
sudo iptables -A INPUT -p tcp -s 203.0.113.10 --dport 22 -j ACCEPT

# プレイヤーの入口
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT

# 既定で拒否
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
```

`iptables` のルールは**既定では永続化されず**、再起動で失われます。保存が必要なら：

```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 2.4 nftables（現代的な書き方）

```bash
sudo nft add table inet filter
sudo nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 25565 accept
sudo nft add rule inet filter input udp dport 19132 accept
```

:::note 現代のディストリビューションでは ufw も firewalld も中身は nftables
新しいカーネルとディストリビューションでは、`ufw` / `firewalld` は既定で `nftables` バックエンドを使います。**2 つのフロントエンドを同時に有効にしない**こと（`ufw` と `firewalld` の両方を開くなど）。ルールを上書きし合い、切り分けが非常に苦しくなります。**1 つ選んで、最後までそれで設定する。**
:::

### 2.5 「ポートを開放する」と「送信元を制限する」は別物

| 書き方 | 意味 | リスク |
| --- | --- | --- |
| `sudo ufw allow 22/tcp` | **誰でも 22 番ポートに接続できる** | 世界中があなたの SSH を総当たりできる |
| `sudo ufw allow from 203.0.113.10 to any port 22 proto tcp` | **`203.0.113.10` だけが 22 番に接続できる** | その IP が変わったらルールを変える必要がある |

プレイヤーの入口（`25565`）は、プレイヤーが各地から来るので**送信元を開ける必要があります**。しかし SSH、パネル、RCON、データベースといった**自分だけが使う**サービスは、**常に送信元を制限すべき**です。

:::tip 固定 IP がない場合
家庭回線の公衆 IP は変わります。選択肢：事業者に固定 IP を申請する、クラウド事業者の VPN / 踏み台サーバーを使う、SSH 鍵 + fail2ban でリスクを下げる。**注意：SSH を変動する特定の IP に制限すると、IP が変わったあと接続できなくなります** —— 必ずクラウド側に VNC のレスキュー経路があることを確認してください。
:::

## 3. SSH の強化

SSH は管理の入口であり、最も総当たりされるポートでもあります。強化の順序は：**まず鍵でログインできることを確認し、それからパスワードログインを切る**。

### 3.1 まず鍵ログインを設定する

ローカルで鍵を生成（まだなければ）：

```bash
ssh-keygen -t ed25519 -C "mc-admin"
```

公開鍵をサーバーへ送る：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub mcadmin@203.0.113.10
```

**検証**：新しいターミナルを開き、鍵でログインできてから次の手順へ。

### 3.2 sshd の設定を変更する

`/etc/ssh/sshd_config` を編集（`sudo` で）：

```ini
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

| 設定項目 | 役割 |
| --- | --- |
| `PubkeyAuthentication yes` | 公開鍵認証を許可（鍵ログインの基礎） |
| `PasswordAuthentication no` | **パスワード認証を切る**。総当たりスクリプトは目標を失う |
| `PermitRootLogin no` | **root の直接ログインを禁止**。攻撃者はまず一般ユーザー名を当てる必要がある |
| `KbdInteractiveAuthentication no` | キーボード対話認証を切り、`PasswordAuthentication no` を迂回されないようにする |

:::warn 変更後は必ず構文を検証してからリロード
まず `sudo sshd -t` で設定の構文を確認し、**通ってから** `sudo systemctl reload ssh`（ディストリビューションによっては `sshd`）。設定に誤りがあるまま SSH を再起動すると、完全に締め出される可能性があります。
:::

**現在有効な値を確認**（設定が `Include` の断片に上書きされていることがあります）：

```bash
sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

:::note 設定ファイルの書き方はバージョンで変わる
新しい OpenSSH は `/etc/ssh/sshd_config.d/` に `.conf` の断片を置け、**断片の設定は通常メインファイルより優先**されます。ディストリビューションにこのディレクトリがあるなら、変更前に `ls /etc/ssh/sshd_config.d/` で上書き項目がないか見てください。**具体的な優先順位は、あなたのシステムの `sshd -T` の実際の出力と OpenSSH 公式ドキュメントを優先**します。
:::

### 3.3 既定ポートの変更：任意、効果は限定的

SSH のポートを `22` から別の値（`2222` など）に変える：

```ini
Port 2222
```

**何が得られるか**：自動スキャナの多くは `22` しか探らないので、ポート変更でログのノイズと無効な総当たりを大幅に減らせます。

**何が得られないか**：**セキュリティ対策ではありません**。狙いを定めたスキャンは全ポート範囲であなたの SSH を見つけられます。だからポート変更は鍵ログインと送信元制限の**代替にはなりません**。

ポートを変えたら、ファイアウォールのルールも同期して更新し、**新しいポートで検証が成功するまで古いポートの開放を残して**ください。そうしないとまた自分を締め出します。

### 3.4 fail2ban：任意の補助

**概念**：fail2ban はログを読み、ある IP が短時間に何度も認証に失敗すると、**一時的に**ファイアウォールのルールでそれを塞ぎます。

**中核の概念は jail**：1 つの jail = 1 つのログ + 1 組のマッチ規則 + 1 組の BAN パラメータ。有効にする jail は `/etc/fail2ban/jail.d/` 下の `.conf` か `/etc/fail2ban/jail.local` に書きます。

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

- `maxretry`：許容する失敗回数；`findtime`：集計の窓；`bantime`：BAN の長さ。
- `backend = systemd` はログを systemd-journald が集める現代のディストリビューション向けです。`/var/log/auth.log` に書くディストリビューションなら、公式ドキュメントに従って対応する `logpath` に変えてください。

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

:::warn fail2ban をお守りだと思わない
- 封じられるのは**すでに失敗した** IP だけで、**事後の補救**であり、最初の一波は止めません。
- **IP を間違えて封じると自分が入れなくなります**。`bantime` を長くしすぎないこと（数か月など）。
- 設定項目と既定値は**ディストリビューションとバージョンで変わります**。上はよくある書き方にすぎず、使うバージョンの公式ドキュメントと照合してください。
- fail2ban を入れても、`PasswordAuthentication` を再び有効にしていいことには**なりません**。
:::

## 4. DDoS と濫用：できること、できないこと

### 4.1 なぜゲームサーバーが狙われるのか

- **敷居が極端に低い**：攻撃サービスは従量制で売られ、数ドルで 1 回発動できます。
- **動機が単純**：同業の競争、プレイヤーの報復、単なる「面白半分」、あるいはスキャナに巻き込まれただけ。
- **ゲームサーバーはとくに脆い**：Minecraft は**ステートフルな長接続**で、1 回の TCP ハンドシェイクがサーバーのリソースを占めます。同じ帯域が Web サービスなら遅くなるだけでも、ゲームサーバーならそのまま固まるか落ちます。

### 4.2 できること

| 手段 | 説明 |
| --- | --- |
| **上流 / 事業者側の防御** | クラウド事業者は通常、基礎的な DDoS クリーニングを提供します。**これが最も効果的な層**で、トラフィックがあなたのマシンに届く前に処理されます。 |
| **速度制限と接続数制限** | ファイアウォールやリバースプロキシの層で IP ごとの接続数と新規接続レートを制限すれば、低強度のフラッドは止められます。 |
| **プロキシ転送でオリジンを隠す** | プレイヤーはプロキシに接続し、実際のサーバーはプロキシからの接続だけを受ける（転送鍵と併用）。[プロキシ](/tutorials/java/proxy) を参照。 |
| **ホワイトリスト / 入場審査** | 小規模サーバーで最も徹底した手段：**知らない人はそもそも接続できない**。 |
| **アプリケーション層のレート制限** | サーバーやプラグイン層の接続頻度制限で、「入ってすぐ切る」類の嫌がらせを軽減できます。 |

### 4.3 できないこと、そしてよくある誤解

:::warn 「攻撃者の IP を封じる」は帯域型攻撃には無効
これが最も一般的な誤解です。帯域型攻撃（volumetric）の特徴は：

- 送信元 IP が**数千から数万、しかも変化し続ける**（多くは感染した端末）。封じ切れません；
- **あなたのファイアウォールは攻撃トラフィックの後ろにある** —— パケットのルールが効く時点で、帯域はすでに埋まっています。回線が詰まった瞬間、あなたのマシンは「BAN ルールを実行する」ことすらうまくできません。

**結論**：IP を封じるのは個別の嫌がらせには有効ですが、帯域型攻撃にはほぼ無効です。**上流のクリーニングでしか解決できません**。つまり：**サービスを選ぶときに事業者の DDoS 防御の条項をよく確認する**ことであって、攻撃された日に何とかすることではありません。
:::

:::note 攻撃されたときにまず何をするか
1. **本当に攻撃か確認する**：帯域の曲線、接続数、CPU を見て、「攻撃」と「自分のバグによる無限ループ」を区別する。
2. **事業者に連絡する**：状況を説明し、クリーニングが発動しているか、IP を替える必要があるかを尋ねる。
3. **生存優先**：必要なら一時的にホワイトリストにして、まずサーバーを生かす。
4. **証拠を残す**：ログとトラフィックのグラフを保存し、事業者への申し立てに使う。
:::

## 5. 鍵と認証情報の衛生

サーバーのディレクトリには大量の機密情報があります：`server.properties` の RCON パスワード、データベースのパスワード、パネルのアカウント、クラウド事業者の API Key。

| ルール | やり方 |
| --- | --- |
| **絶対に Git にコミットしない** | パスワードを含む設定、`.env`、鍵ファイルはすべて `.gitignore` へ。**一度コミットしたら永久に漏洩**で、履歴に残ります。 |
| **認証情報ファイルの権限を絞る** | `chmod 600`（所有者のみ読み書き）。必要なら `chmod 640`（所有者が読み書き、同グループが読み取り）。 |
| **ハードコードではなく環境ファイルを使う** | 機密値を `.env` などのファイルに入れ、コードは環境変数を読むだけにする。 |
| **漏れたら差し替える。「消したから大丈夫」にしない** | ファイルを消しても、すでに漏れたパスワードは**無効になりません**。**該当サービスで再生成／失効させる必要があります。** |

```bash
# 認証情報ファイルは所有者のみ読み書き
chmod 600 /opt/mcserver/survival/.env

# 権限を確認
ls -l /opt/mcserver/survival/.env
# 期待される出力は -rw------- 1 mcserver mcserver ... .env のような形
```

:::warn パスワード漏洩後の処理順
1. **すぐローテーション**：該当サービスでパスワードをリセット／鍵を失効させる（これが本当の止血）。
2. **影響範囲を調べる**：ログを見て、使われた形跡がないか確認する。
3. **履歴を整理**：Git の履歴から除去する（`git filter-repo` などのツール）。ただし**すでに漏れた値の補救にはならない**と心得る。
4. **振り返り**：なぜコミットされたのか？ `.gitignore` を足し、コミット前のチェックを足す。
:::

データベースのパスワードはさらに：**サービスごとに独立したアカウント**（全部 `root` にしない）、**必要なデータベースだけを許可**、**送信元をホストのローカルか内部ネットワークに限定**、に従うべきです。

## 6. 監視：誰かが探っていることに気づく方法

**24 時間画面を見張る必要はありません**が、「どこで異常が見えるか」は知っておく必要があります。

### 6.1 何を見るか

| 場所 | 何が分かるか |
| --- | --- |
| `/var/log/auth.log`（Debian / Ubuntu） | SSH ログインの成功と失敗の記録 |
| `/var/log/secure`（RHEL 系） | 同上 |
| `journalctl -u ssh` | systemd が集める SSH のログ |
| `sudo fail2ban-client status sshd` | 現在 BAN されている IP の数と一覧 |
| `sudo lastb` | 失敗したログイン試行（**root が必要。一部のシステムでは既定で記録しない**） |
| `ss -tlnp` | 現在待ち受けているポート。意図しない露出の発見に使う |

```bash
# 直近の SSH 失敗を見る（Debian / Ubuntu）
sudo grep 'Failed password' /var/log/auth.log | tail -n 20

# 失敗回数が多い送信元 IP を集計
sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head

# 誰がポートを待ち受けているか
sudo ss -tlnp
```

### 6.2 何が異常か

- **短時間に大量の `Failed password`**：典型的な総当たり。
- **自分が知らない時間／送信元 IP でのログイン成功**：**これが最も危険な信号**で、認証情報が漏れている可能性があります。
- **自分が作っていないユーザーが現れる**：バックドアのアカウントを立てられている可能性。
- **見知らぬ待ち受けポート**：マイニングプログラムやバックドアを入れられている可能性。
- **プレイヤーがいないのに CPU／帯域が異常に高い**：攻撃元として使われている可能性。

:::tip ログに当番をさせる
毎日ログを漁りたくないなら、`logwatch`、`journalctl` の定時サマリ、あるいは重要イベントにアラートを設定します。**鍵は「誰かが見る」こと** —— 誰も見ないログはログがないのと同じです。
:::

## 7. 公開前のチェックリスト

- [ ] クラウドのセキュリティグループとホストのファイアウォールの**両層を設定済み**、受信は既定で拒否
- [ ] 実際に必要なポートだけを開放（Java `TCP 25565`、統合版 / Geyser `UDP 19132`）
- [ ] `enable-rcon` は `false` のまま、または RCON は `127.0.0.1` のみで待ち受け
- [ ] データベース、パネルのポートを**公網に開放していない**
- [ ] SSH は鍵ログインを設定済み、`PasswordAuthentication no`、`PermitRootLogin no` が有効（`sshd -T` で確認）
- [ ] SSH は送信元 IP を制限済み、または少なくとも fail2ban の保険がある
- [ ] パスワードを含むファイルの権限が `600` で、**Git リポジトリに入っていない**
- [ ] `online-mode` は `true` のまま（オフラインモードの代償を明確に理解している場合を除く）
- [ ] 事業者の DDoS 防御の条項を把握し、攻撃されたときに誰に連絡するか知っている
- [ ] **外部のマシン**でポートの到達性を検証済み

## 次のステップ

- システム内部の強化（アカウント、権限、systemd）：[システムセキュリティの強化](/tutorials/ops/system-security)
- サーバーとプラグインのセキュリティ設定：[[JAVA] セキュリティプラグイン](/tutorials/ops/security-java) と [[BE] セキュリティプラグイン](/tutorials/ops/security-be)
- 破壊対策と記録：[チート対策と破壊行為の防止](/tutorials/java/anticheat)
- データの最後の防衛線：[バックアップと復元](/tutorials/java/backup)

---

> コマンドと設定は各ソフトの公式ドキュメントを優先します。ディストリビューションによってパッケージ名、サービス名、設定項目の既定値が異なることがあるため、あなたのシステム上の実際の出力を優先してください。
