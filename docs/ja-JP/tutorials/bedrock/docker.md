---
title: Docker で統合版サーバーをデプロイする
slug: docker
cat: bedrock
level: 3
order: 7
minutes: 16
tags: [Docker, compose, 統合版, BDS, udp, deployment, バックアップ]
updated: 2026-10-04
draft: false
---

統合版の公式サーバーは **BDS** で、プラグインの仕組みがなくディレクトリ構成も単純なので、コンテナに入れるのに非常に向いています：イメージが公式 BDS のダウンロード、EULA への同意、ポートのマッピングを担当し、あなたはボリューム 1 つと `docker-compose.yml` 1 枚を維持するだけです。

本記事は**コンテナで BDS を動かす**話です。BDS 自体のディレクトリ構成、メモリ特性、既知の落とし穴は [BDS サーバー](/tutorials/bedrock/bds) を参照してください。

:::warn まず 1 つ覚える：統合版は UDP
Java 版は **TCP 25565**、統合版は **UDP 19132**（IPv6 は `19133/udp`）を使います。**TCP だけを開放・マッピングすると、「サーバーは動いているのに誰もつながらない」という症状になり、しかもエラーが一切出ません。** 統合版のサーバー構築で最もよくある落とし穴で、本記事でも繰り返し強調します。
:::

## 1. なぜコンテナ化するのか

| 利点 | 具体的な現れ方 |
| --- | --- |
| **環境がきれい** | 公式 BDS はバイナリプログラムで、コンテナはそれを実行ライブラリごとパッケージする。ホストに依存を入れる必要がない |
| **再現できる** | バージョン、ポート、ゲームモード、難易度、ワールド名がすべて 1 つのファイルに書かれ、マシンを替えてもそのまま持っていける |
| **ロールバックが容易** | アップグレード前に `/data` をバックアップし、問題があれば `VERSION` を戻して再起動するだけ |
| **削除がきれい** | 不要になったらコンテナとボリュームを消すだけ。ホストに残留ファイルが残らない |
| **クロスプラットフォームで一貫** | 公式 BDS は Windows 版と Linux 版しかない。Windows 上でコンテナとして Linux 版 BDS を動かせば、操作はサーバー上とまったく同じ |

代償もあります：

| 代償 | 説明 |
| --- | --- |
| **学ぶ層が 1 つ増える** | イメージ、コンテナ、ボリューム、Compose の概念は避けられず、トラブル対応は `docker compose logs` から始まる |
| **ボリュームとバックアップの規律** | ワールドのセーブデータはボリュームの中。自分からバックアップしなければバックアップは存在しない |
| **性能のオーバーヘッドは小さいがゼロではない** | ネットワークに NAT の層、ファイルシステムに overlay の層。本当のボトルネックは通常 **BDS のシングルスレッドなワールドシミュレーション**なので、CPU の上限は十分に与えること |
| **プラグインのエコシステムがない** | BDS 自体がプラグイン非対応で、コンテナにしても変わりません。追加コンテンツはビヘイビアパック／リソースパックの形でデータディレクトリに入れるしかない |

## 2. Docker と Compose プラグインの導入

公式ドキュメントに従って入れ、出所不明のインストールスクリプトを使わないでください：

| プラットフォーム | 公式入口 |
| --- | --- |
| Linux（ディストリビューション別） | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Linux の Compose プラグイン | [Install the Compose plugin](https://docs.docker.com/compose/install/linux/) |
| Windows / macOS | [Docker Desktop](https://docs.docker.com/desktop/) |

```bash
docker --version
docker compose version
docker run --rm hello-world
```

:::note Windows での 2 つの道
Windows では公式の圧縮ファイルをダウンロードして中の exe を直接動かすこともできます（ダウンロードページは [Minecraft 公式 BDS ダウンロードページ](https://www.minecraft.net/en-us/download/server/bedrock)）。本記事のコンテナ方案を使うこともできます。コンテナ方案の利点は**Linux サーバー上での操作と完全に一致**し、将来移行するときに覚え直さなくて済むことです。
:::

## 3. イメージ：`itzg/minecraft-bedrock-server`

コミュニティでよく使われる統合版のイメージは **`itzg/minecraft-bedrock-server`** です（活発に維持され、Java 版のイメージと同じ作者のエコシステム）。

```bash
docker pull itzg/minecraft-bedrock-server
```

:::note 公式のダウンロードパッケージとの関係
公式の [BDS ダウンロードページ](https://www.minecraft.net/en-us/download/server/bedrock) は圧縮ファイルを提供し、解凍、設定変更、起動は自分で行う必要があります。**コミュニティのイメージがやることは：コンテナ起動時に公式 BDS を代わりにダウンロードし、環境変数を `server.properties` などの設定に書き込むこと**です。

したがって：**イメージが BDS をダウンロードする具体的な仕組み（ダウンロード先、バージョンの解決、キャッシュの方法）はイメージの公式ドキュメントを優先**し、イメージのバージョンによって異なることがあります。完全に自分で制御したいなら、公式の圧縮ファイルを使って [BDS サーバー](/tutorials/bedrock/bds) の手順で手動デプロイしてください。
:::

## 4. 完全な `docker-compose.yml`

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

Compose v2 はトップレベルの `version:` フィールドを**必要としません**。

| フィールド | 役割 |
| --- | --- |
| `image` | 使用するイメージ。本番ではタグを固定し、`latest` を使い続けないことを勧める |
| `container_name` | コンテナ名を固定し、`logs` / `attach` を楽にする |
| `ports` | **`/udp` は必須**。`19132` は IPv4 の主ポート、`19133` は IPv6 のポート（IPv6 のクライアントがいなければマッピングしなくてよいが、しても副作用はない） |

:::warn Docker は OS のファイアウォールを迂回する（統合版でも同じ）
`ufw` と `firewalld` のルールは**Docker コンテナがマッピングしたポートには無効**です：Docker は自分の `iptables` ルールを OS のファイアウォールより前に挿入するため、`ufw deny 19132/udp` でも外部からのアクセスは止まりません。

統合版は **UDP** なのでさらに見落とされやすく、必ず次の方法で絞ってください：

1. **ポートをループバックにだけ束縛**（推奨）：`-p 127.0.0.1:19132:19132/udp` とし、ホスト側のリバースプロキシで外部に出す；
2. **`DOCKER-USER` チェーン**で送信元を制限する；
3. クラウド事業者の**セキュリティグループ**で下限を守る（この層は Docker の影響を受けない）。

なお、サーバーを**LAN リスト**に表示させたい場合（統合版は UDP ブロードキャストで発見される）、`bridge` モードでは実現できず、`macvlan` か `host` ネットワークモードが必要です。

完全な説明（帯の衝突、ネットワークモードの比較、切り分け表を含む）は [Docker で Java 版をデプロイ → ネットワークとファイアウォール](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节) を参照。
:::
| `environment` | イメージが読む設定。第 6 節を参照 |
| `volumes` | `ボリューム名:/data`。**ワールド、設定、アドオンパックはすべて `/data`** に |
| `stdin_open: true` | 標準入力を開く。そうしないと BDS のコンソールに**コマンドを入力できない** |
| `tty: true` | 疑似端末を割り当て、`docker attach` と併用して対話できるコンソールを得る |
| `restart: unless-stopped` | クラッシュやホスト再起動のあと自動で立ち上げる。手動の `docker compose stop` のあとは自動で立ち上がらない |

`volumes` に `name:` を明示したのは、ボリューム名を**予測可能**にするためです（書かないと Compose がプロジェクト名の接頭辞を付ける）。そうすればバックアップコマンドでボリュームを指し間違えません。

:::note `EULA=TRUE` は法的な要件
`EULA: "TRUE"` は**あなたが [Minecraft エンドユーザーライセンス契約](https://aka.ms/MinecraftEULA) を読み同意した**ことを意味します。この変数を設定しないと BDS は起動直後に終了し、コンテナは再起動ループに入ります。
:::

:::tip 起動前にまず「健康診断」
compose ファイルを変えるたびに `docker compose config` を 1 回実行してください：ポート、ボリューム、環境変数が展開されて出力され、間違いはその場でエラーになります。**とくに `/udp` の書き忘れはここで分かります。**
:::

```bash
docker compose config
```

## 5. 起動、ログ、コンソール、停止

```bash
docker compose up -d
```

初回起動は BDS のダウンロードがあるので気長に待ちます：

```bash
docker compose logs -f
```

`[INFO] Server started.` のようなログが見えれば起動しています。`Ctrl+C` はログ追跡を終了するだけで、サーバーは止まりません。

統合版には **RCON がない**ため `rcon-cli` は使えず、コンソールに入るには `attach` しかありません：

```bash
docker attach mcsog-bedrock
```

attach したあとはローカルのウィンドウと同じように BDS のコマンドを入力できます。たとえば：

```text
list
say hello
save hold
save resume
stop
```

:::warn attach のキーの罠
`docker attach` の中で `Ctrl+C` を押すと、割り込みシグナルが BDS に送られ、**そのままサーバーが落ちます**（セーブデータが壊れる可能性があります）。正しい終了は `Ctrl+P` のあと `Ctrl+Q`（detach。コンテナは動き続ける）。本当にサーバーを止めたいときは `stop` コマンドを入力し、プロセスが終了するのを待ちます。
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
| `docker compose down` | 停止し、コンテナとネットワークを削除 | 保持 |
| `docker compose down -v` | 上記すべてに**ボリュームの削除**を追加 | **すべて失われる** |

:::danger 何気なく `-v` を付けない
`docker compose down -v` は `/data` ボリュームを削除し、ワールドのセーブデータも一緒に失われます。完全にやり直すと決めており、使えるバックアップがあると確認できたときだけ使ってください。
:::

## 6. 本記事の例で使う環境変数

| 変数 | 役割 | 例 |
| --- | --- | --- |
| `EULA` | Minecraft EULA に同意したことを宣言。未設定だと起動に失敗する | `"TRUE"` |
| `SERVER_NAME` | サーバー名（`server-name` に対応） | `"MCSOG Bedrock"` |
| `GAMEMODE` | 既定のゲームモード | `"survival"` / `"creative"` |
| `DIFFICULTY` | ゲームの難易度 | `"normal"` / `"peaceful"` |
| `LEVEL_NAME` | ワールド（レベル）名。**`worlds/` 下のフォルダ名も同時に決まる** | `"MCSOG"` |
| `ONLINE_MODE` | Xbox Live アカウントを検証するか | `"TRUE"` / `"FALSE"` |
| `TZ` | コンテナのタイムゾーン。ログの時刻に影響 | `"Asia/Shanghai"` |
| `VERSION` | BDS のバージョンを指定。書かないと通常は最新に追随 | `"LATEST"` |
| `SERVER_PORT` | IPv4 の待ち受けポート（既定 19132） | `"19132"` |
| `SERVER_PORT_V6` | IPv6 の待ち受けポート（既定 19133） | `"19133"` |
| `MAX_PLAYERS` | 最大プレイヤー数 | `"20"` |
| `VIEW_DISTANCE` | 描画距離 | `"12"` |
| `LEVEL_SEED` | ワールドのシード | 数値または文字列 |
| `ALLOW_LIST` | ホワイトリストを有効にするか | `"true"` / `"false"` |

:::note 既定値は変わる
表の括弧内の既定値は BDS の一般的な既定設定に対応しますが、**イメージのバージョンが上がると調整されることがあるため、必ずイメージの公式ドキュメントを優先**してください。本番の原則は：**重要な項目はすべて明示的に書き**、既定値に頼らないことです。
:::

:::warn 非 ASCII のサーバー名
`SERVER_NAME` は日本語も使えますが、一部の古いクライアントでは文字化けします。プレイヤーから文字化けの報告があったら、まず純粋な ASCII 名に戻して切り分けてください。`LEVEL_NAME` も ASCII を勧めます：ディレクトリ名になるので、特殊文字は不要な面倒を招きます。
:::

## 7. `/data` の中身

| パス | 内容 |
| --- | --- |
| `/data/worlds/<LEVEL_NAME>/` | **ワールドのセーブデータ**（`db/`、`level.dat`、`level_name.txt` など） |
| `/data/server.properties` | サーバー設定（ポート、難易度、モード、ホワイトリストのスイッチなど） |
| `/data/allowlist.json` | ホワイトリストのデータ |
| `/data/permissions.json` | 管理者（OP）のデータ |
| `/data/valid_known_packs.json` | 既知のアドオンパックの一覧 |
| `/data/behavior_packs/`、`/data/resource_packs/` | ビヘイビアパックとリソースパック（追加コンテンツの配置先） |

BDS のセーブデータは**すべて `worlds/` の下**にあり、ワールドごとに 1 つのサブディレクトリです。`LEVEL_NAME` に書いた名前がそのままディレクトリ名になります：

```text
/data/worlds/MCSOG/db/
```

:::warn `LEVEL_NAME` を変えるのはワールドを替えるのと同じ
`LEVEL_NAME` が変わると、BDS は新しい名前のディレクトリを探します。見つからなければ**まったく新しい空のワールドを生成**し、古いワールドは「消えた」ように見えます（実際はボリュームに残っています）。この名前を変える前に、セーブデータのディレクトリ名を確認してください。
:::

## 8. バックアップと復元

バックアップする対象は `/data`、重点は `/data/worlds/` です。最も確実なのは**サーバーを止めてから固める**ことです：

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

Windows PowerShell ではマウントのパスを `-v "${PWD}\backups:/backup"` に変えます（Docker Desktop）。

止められない場合、BDS は独自のセーブデータ整合性コマンドを提供しています（`docker attach` のコンソールで入力します）：

```text
save hold
save query
```

`save hold` はサーバーの書き込みを止めてファイルの一貫性を保ち、`save query` は現在バックアップすべきファイルを列挙します。コピーが終わったら戻します：

```text
save resume
```

:::note なぜ統合版は Java 版のやり方をそのまま真似できないのか
Java 版は `save-all` / `save-off` / `save-on` を使いますが、統合版の BDS は **`save hold` / `save query` / `save resume`** を使い、2 つのコマンド体系は互換しません。停止してのバックアップはどちらにも通用し、最も手間が少ないです。
:::

復元するときは先にコンテナを止め、ボリュームを空にしてから展開します：

```bash
docker compose stop
docker run --rm \
  -v mcsog-bedrock-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/mcsog-bedrock-20261004-1200.tar.gz -C /data"
docker compose start
```

:::warn コンテナはバックアップではない
ボリュームとコンテナは同じディスク上にあり、ボリュームの誤削除、ディスクの故障、ランサムウェアがまとめて持っていきます。少なくとも**オフラインか遠隔地**のコピーを 1 つ残してください。[バックアップと復元](/tutorials/java/backup) と [遠隔地バックアップ](/tutorials/ops/offsite-backup) を参照。**復元を検証していないバックアップはバックアップではありません。**
:::

## 9. イメージと BDS バージョンの更新

```bash
docker compose pull
docker compose up -d
```

順序はやはり：**先にバックアップ、次に pull、最後に up**。

| 変更 | 何が起きるか | 注意 |
| --- | --- | --- |
| `docker compose pull` | イメージの新バージョンを取得 | 取得後に `up -d` しないとコンテナは再作成されず反映されない |
| `VERSION` を変える | イメージが対応バージョンの BDS を再ダウンロード | クライアントと BDS のバージョンを合わせる必要がある。アップグレード前にセーブデータをバックアップ |
| `VERSION` を書かない | 通常は最新の BDS に追随 | 楽だが**再現できない**。問題が出たときにバージョンが変わったのか設定が変わったのか特定できない |

:::note バージョンの不一致が最もよくある「つながらない」
統合版のクライアントと BDS のバージョンが合わないと、プレイヤーは通常**サーバーは見えるが入れません**。`VERSION` を固定すれば再起動のたびに同じバージョンになります。最新に追随するなら「ある再起動でバージョンが変わった」ことを受け入れ、事前にプレイヤーへ告知してください。
:::

## 10. 追加コンテンツ：BDS にプラグインの仕組みはない

BDS は公式の**ビヘイビアパック（behavior packs）とリソースパック（resource packs）**しか対応しておらず、Bukkit のようなプラグイン体系はありません。コンテナにしても変わりません。プラグインの能力が必要ならサードパーティのサーバーに替えます。[BDS サーバー](/tutorials/bedrock/bds) と [サードパーティサーバーの方案](/tutorials/bedrock/third-party) を参照。

追加コンテンツの置き方：

| 内容 | 置き場所 |
| --- | --- |
| ビヘイビアパック | `/data/behavior_packs/` |
| リソースパック | `/data/resource_packs/` |
| ワールド専用のパック | `/data/worlds/<LEVEL_NAME>/` 下の対応ディレクトリ |

**方法 A：バインドマウント（ファイルの変更が最も楽）**

```yaml
    volumes:
      - ./data:/data
```

あとはホスト上で直接 `./data/behavior_packs/` を操作します。

**方法 B：ボリュームにコピーする**

```bash
docker cp ./MyAddon.mcpack mcsog-bedrock:/data/
docker compose restart
```

設定を変えた、パックを替えたあとは、**コンテナの再起動が最も確実**です：

```bash
docker compose restart
```

## 11. 性能とメモリ：統合版特有の 2 点

### 11.1 ワールドシミュレーションはシングルスレッド。CPU を絞りすぎない

BDS のモブ演算とワールドシミュレーションはほぼシングルスレッドで、**快適さはシングルコア性能で決まり**、マップが大きいほど苦しくなります。コンテナ自体のオーバーヘッドは小さいですが、**コンテナに低すぎる CPU クォータを与えるとサーバーが直接飢えます**：TPS が落ち、プレイヤーが重くなり、チャンクの読み込みが遅くなります。

```yaml
    cpus: "2.0"
```

:::warn 「リソース節約」のために CPU を制限しない
このマシンで他に何が動いているかを明確に把握し、負荷試験をした場合を除き、**BDS コンテナに CPU 上限を設けないでください**（`cpus: "0.5"` など）。BDS のシングルスレッド特性から、シングルコアの周波数と「いつでも使える 1 コア」に非常に敏感です。関連するチューニングは [パフォーマンス最適化](/tutorials/java/optimize) を参照。
:::

メモリについて：

```yaml
    mem_limit: "4g"
```

`mem_limit` はハード上限で、**実際の必要量より低く設定するとコンテナは OOM で殺されます**（症状はサーバーが前触れなく再起動する）。確信がなければまず上限を設けず、`docker stats` で実際の使用量を観察してから決めてください。

:::warn 無理にメモリを解放しない
BDS のメモリ使用量は時間とともにゆっくり増えます。**ツールで無理にメモリを解放しない**こと：プレイヤーがリソースパック／アドオンパックをダウンロードするとき進行バーが止まります。**正しい対処はサーバーの再起動**で、これは [BDS サーバー](/tutorials/bedrock/bds) の説明と同じです。
:::

## 12. トラブル対応

| 現象 | 原因 | 対処 |
| --- | --- | --- |
| コンテナが**再起動を繰り返す** | EULA 未同意、`LEVEL_NAME` に不正な文字、ポートの使用中、メモリ不足、`VERSION` が無効 | まず `docker compose logs --tail=200` を見る。ログの最初の画面で原因が示されるのが普通 |
| サーバーは動いているのに**誰もつながらない** | TCP しかマッピング／開放していない。セキュリティグループで **UDP** を開放していない | `ports` に `"19132:19132/udp"` を書き、**クラウドのセキュリティグループ**で UDP 19132 を開放。OS のファイアウォールはコンテナに無効。上の警告を参照 |
| LAN ではつながるが公網ではだめ | ポートマッピング／セキュリティグループの問題 | [アクセス可能な環境へのデプロイ](/tutorials/java/deploy) と [ルーターとファイアウォール](/tutorials/ops/router-firewall) を参照 |
| ワールドが「消え」、新しいマップが生成された | `LEVEL_NAME` を変えた、または誤ったボリュームをマウントした | `LEVEL_NAME` を元の名前に戻す。同じボリュームをマウントしているか確認 |
| プレイヤーはサーバーが見えるが入れない | クライアントと BDS のバージョン不一致、またはホワイトリスト／オンライン検証で止められている | `VERSION` を固定し、`ALLOW_LIST` と `ONLINE_MODE` を確認 |
| コンテナが `/data` に書き込めない（Linux のバインドマウント） | ホストのディレクトリの所有者とコンテナ内のユーザーが一致しない | ディレクトリの所有者を直す。必要ならイメージのドキュメントにあるユーザーマッピングを使う |
| サーバーが不可解に再起動する | メモリのハード上限が低すぎて OOM | `mem_limit` を上げるか外し、`docker stats` で観察 |
| コンソールに文字を打てない | `stdin_open: true` と `tty: true` がない | 追加してコンテナを作り直す |

日常の巡回（コンテナの状態、CPU／メモリ使用量、ディスクの余裕）は [監視とアラート](/tutorials/ops/monitoring) とあわせて行うことを勧めます。

## 13. 次のステップ

- BDS のディレクトリ構成と既知の落とし穴： [BDS サーバー](/tutorials/bedrock/bds)
- 公式 BDS のダウンロードと説明： [Minecraft 公式 BDS ダウンロードページ](https://www.minecraft.net/en-us/download/server/bedrock)
- 統合版のコア選択： [サーバーの種類](/tutorials/bedrock/type)
- セーブデータのバックアップの一般的な方法： [バックアップと復元](/tutorials/java/backup)
- 複数サーバーの一括管理： [パネル管理ツールの使い方と安全性](/tutorials/ops/panels)

---

> イメージ名、環境変数、既定ポートはイメージの公式ドキュメントを優先します。
