---
title: ログ管理とローテーション
slug: logs
cat: ops
level: 3
order: 18
minutes: 14
tags: [ログ, logrotate, journald, Docker, ディスク容量, syslog, 保守, 切り分け]
updated: 2026-10-04
draft: false
---

**ログはトラブル切り分けの唯一の証拠であり、サーバーのディスクを埋める最大の容疑者でもあります。** サーバー、プラグイン、プロキシ、パネル、systemd、Docker、nginx はすべてディスクに書き込み、しかも既定ではほとんど上限がありません。本記事では、ログがどこにあり、どう測ってから対処するか、logrotate の正しい書き方、journald と Docker の容量制限、そしてそのまま実行できる保守チェックリストを整理します。

具体的な故障のときにログをどう読むかは [監視とアラート](/tutorials/ops/monitoring)、ログとセーブデータを一緒にデータセンターの外へ出す方法は [遠隔地バックアップ](/tutorials/ops/offsite-backup) を参照。

## 1. Minecraft のホストにはどんなログがあるか

まず「ログ」という言葉を分解します。「ディスクが不可解に埋まった」事故の大半で、犯人は `logs/latest.log` ではありません。

| 出所 | 典型的なパス | 説明 |
| --- | --- | --- |
| サーバーの主ログ | `logs/latest.log` | 現在書き込んでいるログ。UTF-8、Linux は LF、Windows は CRLF |
| サーバーの過去ログ | `logs/YYYY-MM-DD-N.log.gz` | コア自身がローテーションした古いログ。gzip 圧縮 |
| クラッシュレポート | `crash-reports/crash-YYYY-MM-DD_HH.MM.SS-server.txt` | クラッシュ 1 回につき 1 ファイル。スタックが長く、1 つ数百 KB〜数 MB |
| プラグインのログ | `plugins/<プラグイン>/logs/*.log`、`plugins/<プラグイン>/*.log` | **場所はプラグイン次第**。プラグインディレクトリに書くものも、サーバーの `logs/` に直接書くものもある |
| プロキシのログ | `<プロキシディレクトリ>/logs/latest.log` | Velocity / BungeeCord は独立した作業ディレクトリと `logs/` を持つ |
| systemd ユニットのログ | `journalctl -u minecraft.service` | systemd で管理すると stdout/stderr は既定で journal に入る |
| システムログ | `/var/log/syslog`、`/var/log/messages`、`/var/log/kern.log` | ディストリビューションで名前が違う |
| ログインとセキュリティのログ | `/var/log/auth.log`（Debian 系）、`/var/log/secure`（RHEL 系） | SSH 総当たりの痕跡がここに。公網のマシンでは速く育つ |
| nginx のログ | `/var/log/nginx/access.log`、`error.log` | パネル、マップ、Web プロキシが nginx を通るなら必ずある |
| パネルのログ | パネル自身のディレクトリ | MCSManager、Pterodactyl などは独自にログを書き、データベースにも書くことが多い |
| Docker のログ | `/var/lib/docker/containers/<コンテナID>/<コンテナID>-json.log` | 既定は `json-file` ドライバで、**既定ではローテーションしない** |
| JVM 側のファイル | `logs/gc.log`、`hs_err_pid<pid>.log`、`*.jfr` | GC ログ、JFR、JVM クラッシュで生成され、忘れられやすい |

:::note JVM 自身が書くものも忘れない
`-Xlog:gc*:file=logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M` のような起動引数は `logs/` にもう 1 部 GC ログを置きます。JVM がクラッシュすると作業ディレクトリに `hs_err_pid<pid>.log` も残します。これらは Minecraft のローテーション体系の外なので、別に扱う必要があります。
:::

## 2. ログがサーバーを殺す仕組み

ログの増え方には 3 つの典型があり、3 番目が最も危険です：

1. **正常な増加**：プレイヤーの出入り、プラグインの日次記録で、ゆっくり大きくなる。
2. **突発的な増加**：公網のマシンがスキャン、負荷試験、接続の連打を受け、接続ごとに 1 行書かれる。
3. **ループで画面を埋める**：あるプラグインが `onTick` で例外を投げる、またはあるタスクが毎秒失敗する —— **毎秒 20 行**、1 日で約 170 万行、1 行 150 バイトとして**約 250 MB/日**、しかも自分では止まりません。

ディスクが埋まるのは「ログが少し大きくなった」程度では済まず、他のものも巻き添えにします：

:::warn ディスクが埋まったときの症状：セーブデータ、プラグイン、パネルが一緒に壊れる
- **セーブデータの保存失敗**：ログに `Failed to save chunk`、`java.io.IOException: No space left on device` が出て、プレイヤーが落ち、チャンクが巻き戻る。
- **プラグインの設定／データベース書き込み失敗**：SQLite は `database or disk is full`、MySQL は `Disk full`。権限グループ、経済、領地のデータが中途半端に壊れうる。
- **サーバーが最悪の瞬間に落ちる**：停止時に `level.dat` が書けず、またはプロセスがそのまま落ち、再起動後にワールドの状態と最後に成功した保存の間に断層ができる。
- **パネルと SSH が一緒に効かなくなる**：パネルがログとセッションを書けず、「入って見る」入口すらなくなります。
- **inode も食い尽くされうる**：`df -h` は空きがあるのに `df -i` が 100% で、症状はディスク満杯と同じ。
:::

:::tip ログディレクトリとセーブデータはなるべく別パーティションに
可能なら、`logs/`（またはログのマウントポイント全体）を独立したパーティションか独立したディスクに置いてください。ログが暴走してもセーブデータは書け、最悪でもログを失うだけで済みます。
:::

## 3. まず測ってから対処：現状を見る 4 つのコマンド

手を動かす前に測ります。以下のコマンドはすべて読み取り専用で、何も壊しません。

```bash
# 1) サーバーのログディレクトリのサイズ
du -sh /opt/minecraft/server/logs

# 2) ディスクの残り容量と残り inode
df -h
df -i

# 3) journald がどれだけ使っているか（systemd 管理なら必ず見る）
journalctl --disk-usage

# 4) 100 MB を超えるログ系ファイルをすべて探す
find /opt/minecraft/server -type f -name '*.log*' -size +100M

# 補足：マシン全体でどのディレクトリが最も場所を食っているか
sudo du -x -h -d 1 /var | sort -h | tail -n 10
```

結果を読むときの注意が 3 点：

- `du -sh` は**現在の占有**、`find ... -size +100M` は**単一の大きなファイル**。両者を組み合わせて初めて「小さなファイルが多数」と「怪物ファイルが 1 つ」を区別できます。
- `df -i` の `IUse%` が 100% になると、`df -h` に空きがあってもサーバーは何も書き込めません。
- `journalctl --disk-usage` の出力は journal ディレクトリの実際の占有で、`du -sh logs/` には現れず、見落としやすいです。

## 4. Minecraft 自身のログ保持方針

サーバーコアは自分で 1 層のローテーションを行います：現在の `latest.log` が日付付きの `YYYY-MM-DD-N.log.gz` に回され、`N` はその日の通し番号です。

**何部保持するか、設定できるかは、完全にコア次第です。** 最近の数部だけ残しスイッチを提供しないコアもあれば、設定ファイルにキーを用意しているコアもあり、キー名も既定値もまちまちです。ここで推測はしません：**使っているコアの公式ドキュメントと設定ファイルを優先**し、コアのディレクトリで `log` 関連の設定項目を探すか、コアのドキュメントの「ログ」の章を直接見てください。

コアが保持数の設定を提供しないなら、システム層の logrotate かクリーンアップスクリプトに任せます（以下の節）。なお `crash-reports/` のクラッシュレポートはコアのログローテーションに**参加しません**。クラッシュループになると無限に積み上がります。

## 5. logrotate で logs/ を管理する

logrotate は Linux でログローテーションを管理する標準ツールで、ほぼすべてのディストリビューションに最初から入っており、既定では `logrotate.timer`（または cron）で 1 日 1 回動きます。設定は `/etc/logrotate.d/` 下の 1 ファイルに置きます。

### 5.1 完全な設定例

```conf
# /etc/logrotate.d/minecraft
# 注意：このファイルは group か world が書き込み可能であってはならない。logrotate は安全のため読み込みを拒否する。

/opt/minecraft/server/logs/latest.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su minecraft minecraft
}

# 任意：プラグイン自身が書くログ。パスは実際に合わせて調整する
/opt/minecraft/server/plugins/*/logs/*.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

`/opt/minecraft/server` と `minecraft` を、あなたのマシンの実際のパスとユーザー名に変えてください。2 つ目のブロックのワイルドカードは安全です：ローテーション後のファイルは `*.log.1` か `*.log.1.gz` になり、`*.log` に再びマッチしません。

### 5.2 各ディレクティブの役割

| ディレクティブ | 役割 |
| --- | --- |
| `daily` | 1 日 1 回ローテーション（logrotate 自体が毎日起動されることが前提。ディストリビューションの既定はそう） |
| `rotate 14` | 履歴を 14 部保持し、15 部目（最も古い）を削除 |
| `compress` | 履歴ファイルを gzip 圧縮。通常 90% 以上の容量を節約できる |
| `delaycompress` | ローテーション直後の 1 部は**圧縮せず**、次のローテーションで圧縮する |
| `missingok` | ファイルがなくてもエラーにしない（サーバー未起動やディレクトリ変更時に便利） |
| `notifempty` | ファイルが空ならローテーションしない。空のアーカイブを量産しない |
| `copytruncate` | **先にコピーし、元ファイルをその場で空にする**。ファイルを改名しない |
| `su minecraft minecraft` | 指定したユーザー／グループとしてローテーションを実行。ログディレクトリがサーバーのユーザー所有なら付けることを勧める |

### 5.3 稼働中のサーバーで copytruncate が重要な理由

既定のローテーションは **rename** です：logrotate が `latest.log` を `latest.log.1` に改名し、（`create` ディレクティブに従って）空の `latest.log` を新規作成します。問題は **Java プロセスが起動時にそのファイルのハンドルをすでに持っている**ことです：改名後もサーバーは「改名されたほうのファイル」に書き続け、新しい `latest.log` は永遠に空のまま。ログは「消えた」ように見え、サーバーを再起動するまで直りません。

`copytruncate` は別のやり方です：**先に内容をコピーし、元ファイルを 0 バイトに切り詰める**。inode は変わらず、サーバーは同じファイルハンドルに書き続けるので、新しいログは自然に `latest.log` に現れ、サーバーの再起動は不要です。

その代償は明確にしておかなければなりません：

- 「コピー完了」と「切り詰め」の間にごく短い時間窓があり、**その間に書き込まれた少量のログは失われます**（通常は数行）。
- そのため `copytruncate` と `create` は排他です（元ファイルを動かさないので新規作成の動作がない）。
- 1 行も失えないほどログが重要なら、正しいのはサーバー自身にログファイルを開き直させること（多くのコアにはそのシグナルインターフェースがない）か、数行の損失を受け入れることです —— Minecraft サーバーなら通常は受け入れられます。

:::tip ついでに：delaycompress は copytruncate と組み合わせるため
一部のプログラムはローテーション直後の短い間、古いファイルハンドルを持ったまま書き続けます。`delaycompress` はローテーション直後の `latest.log.1` を未圧縮のままにし、「書きながら圧縮」でアーカイブが壊れるのを避け、次のローテーションで圧縮します。
:::

### 5.4 検証と切り分け

設定を変えたら**まず dry-run し、翌日を待たない**こと：

```bash
# dry-run：何をするかだけを表示し、実際にはファイルを変更しない
sudo logrotate -d /etc/logrotate.d/minecraft

# 問題ないと確認できたら 1 回強制実行し、その場で結果を検証
sudo logrotate -f /etc/logrotate.d/minecraft

# 結果を見る：latest.log と latest.log.1（または .1.gz）が現れるはず
ls -lh /opt/minecraft/server/logs
```

よくある落とし穴：

- **設定が効かない**：システムで動いているのが `logrotate.timer` か確認する。`systemctl list-timers logrotate.timer` で調べる。
- **権限エラーが出る**：`/etc/logrotate.d/minecraft` は group/world が書き込み可能であってはならない。ログディレクトリは `su` で指定したユーザーが書き込める必要がある。
- **`/etc` や `/usr` 下のログが回らない**：ディストリビューションの `logrotate.service` は既定で `ProtectSystem=full` を持ち、これら 2 つのディレクトリ下のファイル変更を妨げます —— だからサーバーとログは `/opt`、`/srv` のような場所に置くほうが楽です。
- **ファイルは大きくなるのにローテーションされない**：`notifempty` は内容のあるファイルのローテーションを妨げませんが、`daily` が効く前提は「前回のローテーション時刻」です。`-d` の出力で判定ロジックが見えます。

## 6. systemd と journald の容量上限

systemd でサーバーを管理すると、stdout/stderr は既定で journald に取り込まれます。journald には全体の上限があり、`/etc/systemd/journald.conf` で設定します：

```ini
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=1month
```

| 設定項目 | 意味 |
| --- | --- |
| `Storage=` | `persistent` は `/var/log/journal` に書き出す、`volatile` はメモリのみ、`auto` はディレクトリの有無で決める、`none` は保存しない |
| `SystemMaxUse=` | journal がディスク上で最大どれだけ使うか（既定はファイルシステムの約 10%、上限 4G） |
| `SystemMaxFileSize=` | journal の 1 ファイルの上限（既定は `SystemMaxUse` の約 1/8、上限 128M） |
| `MaxRetentionSec=` | エントリの最長保持期間。`0` は時間軸での削除を無効にする |
| `SystemKeepFree=` | 他の用途に最低どれだけ空けるか。journald はこれと `SystemMaxUse` の厳しいほうを採る |

変更後はサービスを再起動し、手動で 1 回回収します：

```bash
sudo systemctl restart systemd-journald

# 現在の占有を見る
journalctl --disk-usage

# 手動で回収（3 つのうち 1 つ、組み合わせも可）
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-files=20
```

:::warn journald が消すのは「アーカイブ済み」のファイルだけ
`--vacuum-*` と `SystemMaxUse=` は**アーカイブ済み**の journal ファイルだけを削除し、現在書き込み中のアクティブファイルは削除しません。だから回収後の占有は**設定した上限より少し高いまま**のことがあり、これは正常で設定が効いていないわけではありません。
:::

## 7. Docker コンテナのログローテーション

Docker の既定の `json-file` ドライバは**ローテーションを一切しません**：コンテナが長く動くほど `/var/lib/docker/containers/<ID>/<ID>-json.log` が大きくなり、しかもそれは Docker デーモンが保持するファイルハンドルなので、直接 `rm` してもすぐには容量が解放されません。

単一コンテナの起動時に制限する：

```bash
docker run -d --name mc \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  your-minecraft-image
```

デーモン全体の既定値は `/etc/docker/daemon.json` に書きます：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

変更後はデーモンの再起動が必要で、しかも**既存のコンテナは作り直さないと反映されません**：

```bash
sudo systemctl restart docker

# あるコンテナの現在のログ設定とログファイルのパスを見る
docker inspect --format='{{.HostConfig.LogConfig}}' mc
docker inspect --format='{{.LogPath}}' mc

# 緊急時はまず切り詰めてからゆっくり調べる（稼働中のコンテナにも有効）
sudo truncate -s 0 "$(docker inspect --format='{{.LogPath}}' mc)"

# 日常のログ確認
docker logs --tail 200 -f mc
docker system df
```

Docker Compose ではサービス配下に書きます：

```yaml
services:
  mc:
    image: your-minecraft-image
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## 8. nginx、パネル、プロキシのログ

- **nginx**：`/var/log/nginx/access.log` と `error.log`。ディストリビューションの nginx パッケージは logrotate 設定を**同梱**しており、通常はすでにローテーションされます。パネルが公網からスキャンされると `access.log` が異常に膨らむので、静的リソースのアクセスログを切る、またはパネルサイト専用のログファイルを指定して `maxsize 200M` を付けることを検討してください。
- **パネル**：パネル自身のログディレクトリ + データベース。パネルのログは通常あなたの `logs/` にはありません。`logs/` を消せば万事OKと思わないこと。
- **プロキシ**：Velocity / BungeeCord はそれぞれ独立した作業ディレクトリと `logs/` を持ち、**別途** logrotate のブロックかクリーンアップ規則が必要です。
- **リバースプロキシとパネルのアクセスログにはプレイヤーの IP が入ります**：この類のログは集約や外部送信の際にプライバシーデータとして扱ってください。[システムセキュリティ](/tutorials/ops/system-security) を参照。

## 9. ログを 1 か所に集める（任意）

単一マシンの切り分けなら十分ですが、マシンが増えたとき、あるいは「マシンが落ちてもログは残る」ようにしたいときは集約が必要です。

**方法 A：rsyslog で転送**（従来の syslog 体系。単純で直接的）

```conf
# /etc/rsyslog.d/50-forward.conf
# @@ は TCP、@ は UDP。本番では TCP を使う
*.* @@10.0.0.5:514
```

受信側でも rsyslog を動かします（そのホストからの接続を許可する）。ログにはプレイヤー名、IP、場合によってはチャット内容が入るので、**信頼できるネットワーク内でのみ転送するか、TLS/RELP を付けて**ください。

**方法 B：journald で転送**（systemd 体系）

```ini
# /etc/systemd/journald.conf
[Journal]
ForwardToSyslog=yes
ForwardToSocket=10.0.0.5:4444
```

受信側は `systemd-journal-remote` で受けます。公式ドキュメントの注意：**転送は同期的に行われる**ので、受信側が遅いと journald を引きずり、ひいてはログを書くサービスを引きずります —— 本番では `ForwardToConsole=` を慎重に使い、同じ理由で `ForwardToSocket=` も評価してください。

**方法 C：定期的に運ぶ**（最も手間が少なく、最も事故りにくい）

`logs/`、`crash-reports/` を `rsync` / `rclone` で毎日別のマシンかオブジェクトストレージへ同期し、数日分保持します。リアルタイムではありませんが、常駐サービスも不要でサーバーの性能にも影響しません。具体的なやり方は [遠隔地バックアップ](/tutorials/ops/offsite-backup) を参照。

## 10. ログを効率よく検索する

ログは数 GB になることが多く、検索の戦略がコマンド自体より重要です：**まず時間範囲かファイル名で範囲を絞り、それからテキストを照合する。**

| 目的 | コマンド |
| --- | --- |
| 現在のログをリアルタイムで追う | `tail -f logs/latest.log` |
| 最後の 200 行を見る | `tail -n 200 logs/latest.log` |
| 行番号付きで例外を探す | `grep -n "Exception" logs/latest.log` |
| 出現回数を数える | `grep -c "OutOfMemoryError" logs/latest.log` |
| 圧縮ログの中を検索 | `zgrep -n "Exception" logs/2026-10-01-1.log.gz` |
| すべての過去ログを横断して検索 | `zgrep -c "Exception" logs/*.log.gz` |
| 時間範囲でユニットのログを調べる | `journalctl -u minecraft.service --since "2026-10-01" --until "2026-10-02"` |
| 警告以上だけを見る | `journalctl -u minecraft.service -p warning -n 100 --no-pager` |
| ユニットをリアルタイムで追う | `journalctl -u minecraft.service -f` |
| 内容で絞る（systemd 237+） | `journalctl -u minecraft.service -g "Exception" --since today` |
| 前回起動時のログを見る | `journalctl -b -1` |

実戦での習慣：

- **5 GB の `latest.log` に直接 `grep` しない**：まず `tail -n 5000` か、日付で `*.log.gz` を選ぶ。速度が桁違いです。
- `zgrep` は `.gz` を直接読む。先に `gunzip` しないこと —— 展開したファイルがさらにディスクを食い、ディスクが危ないときに特に危険です。
- `journalctl -o short-iso` でタイムスタンプにタイムゾーンを付け、マシンをまたいだ比較で計算を間違えないようにする。
- あるプラグインの画面埋めを特定したら、**まず根本原因を処理**（デバッグを切る、プラグインを上げる、一時的に無効化）してからログを消す。順序を逆にすると消してもまた増えます。

## 11. クリーンアップスクリプトと定時タスク

logrotate が担うのは「ローテーション」で、それが届かないものには別のスクリプトが必要です：コア自身がローテーションした `.log.gz`、積み上がるクラッシュレポート、そして容量のアラート。

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-log-cleanup.sh
set -euo pipefail

SERVER_DIR="/opt/minecraft/server"
LOG_DIR="$SERVER_DIR/logs"
CRASH_DIR="$SERVER_DIR/crash-reports"

# 1) コア自身がローテーションした 30 日超の圧縮ログを削除
find "$LOG_DIR" -type f -name '*.log.gz' -mtime +30 -delete

# 2) クラッシュレポートは最新 20 部だけ残す
if [ -d "$CRASH_DIR" ]; then
    ls -1t "$CRASH_DIR"/crash-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f
fi

# 3) まだ 100 MB を超えるログを列挙し、人手の確認に回す
find "$SERVER_DIR" -type f -name '*.log*' -size +100M -exec ls -lh {} +
```

```bash
chmod +x /usr/local/bin/mc-log-cleanup.sh
```

**cron で定時実行（毎日 04:15）：**

```bash
# crontab -e  （または /etc/cron.d/mc-log-cleanup。後者はユーザー名の記入が必要）
15 4 * * * /usr/local/bin/mc-log-cleanup.sh >> /var/log/mc-log-cleanup.log 2>&1
```

**systemd timer で定時実行（推奨。ログがあり、状態を確認でき、逃した実行を補える）：**

```ini
# /etc/systemd/system/mc-log-cleanup.service
[Unit]
Description=Clean up Minecraft server logs

[Service]
Type=oneshot
User=minecraft
Group=minecraft
ExecStart=/usr/local/bin/mc-log-cleanup.sh
```

```ini
# /etc/systemd/system/mc-log-cleanup.timer
[Unit]
Description=Run Minecraft log cleanup daily

[Timer]
OnCalendar=*-*-* 04:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mc-log-cleanup.timer
systemctl list-timers mc-log-cleanup.timer
journalctl -u mc-log-cleanup.service -n 50 --no-pager
```

:::tip クリーンアップは「自分の生成物を消してから警告する」
スクリプトはいきなり `rm -rf logs/*` にしてはいけません：証拠も一緒に消えます。正しい順序は**古さでアーカイブを消す → クラッシュレポートの数を抑える → 異常に大きい／新しいファイルを報告する**。人が見るべきなのは「今日ログが 3 GB 増えた」という事実そのものです。
:::

## 12. 保守チェックリスト

| 頻度 | 動作 | コマンド / 場所 |
| --- | --- | --- |
| 毎日（自動） | logrotate でサーバーとプラグインのログを回す | `logrotate.timer`。設定は `/etc/logrotate.d/minecraft` |
| 毎日（自動） | クリーンアップスクリプトで古いアーカイブを削除し、クラッシュレポートの数を抑える | `mc-log-cleanup.timer` |
| 毎週 | ディスクと inode の水位を見る | `df -h`、`df -i` |
| 毎週 | journal の占有と最大のログファイルを見る | `journalctl --disk-usage`、`find ... -size +100M` |
| 毎週 | クラッシュレポートがまとめて増えていないか（クラッシュループの可能性） | `ls -1t crash-reports/ \| head` |
| 毎月 | logrotate の設定と保持数が今も適切か見直す | `logrotate -d /etc/logrotate.d/minecraft` |
| 毎月 | 集約／遠隔地ログに本当に新しいデータが届いているか確認 | 受信側ディレクトリやオブジェクトストレージの更新時刻 |
| 変更のたび | パス、ユーザー名、unit 名を変えたら dry-run | `sudo logrotate -d` |
| 事故のあと | まず現場を保全してから整理 | 関連する `latest.log` と `crash-reports/` をコピーしてから手を動かす |

## 13. 次のステップ

- ログと指標を一緒にアラートし、人が見張らないようにする：[監視とアラート](/tutorials/ops/monitoring)。
- ログとセーブデータの整合性、保持方針：[バックアップと復元](/tutorials/java/backup)。
- ログのコピーを本機の外へ出す：[遠隔地バックアップ](/tutorials/ops/offsite-backup)。
- サーバーのディレクトリ構成の概観：[サーバーの構成](/tutorials/java/structure)。

> 具体的なパスとディレクトリ配置はゲームバージョンとコアによって異なります。公式ドキュメントを優先してください。
