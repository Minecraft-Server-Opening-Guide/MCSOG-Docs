---
title: 運用の自動化
slug: automation
cat: ops
level: 3
order: 28
minutes: 18
tags: [自動化, バックアップスクリプト, systemd, cron, Ansible, CI/CD, 運用]
updated: 2026-10-04
draft: false
---

運用の自動化の目標は「プロに見えること」ではなく、**繰り返す作業を、忘れず、間違えない作業に変えること**です。サーバーで事故が起きる理由の上位は「技術が難しすぎる」ではなく、「この作業を忘れた」「前回やったときにある手順を飛ばした」「深夜 3 時にやったら手が滑った」です。

この記事では、バックアップ、再起動、更新、ログの片付け、ヘルスチェックをスクリプトとタイマーに任せる方法と、**任せてはいけないこと**を扱います。関連記事：バックアップの方針は [バックアップと復元](/tutorials/java/backup) と [遠隔地バックアップ](/tutorials/ops/offsite-backup)、性能の問題は [spark でサーバー性能を分析する](/tutorials/ops/spark)、更新の流れは [サーバー、プラグイン、MCDR の更新保守](/tutorials/ops/updates)、アラートは [監視とアラート](/tutorials/ops/monitoring)。

:::warn コマンドと設定は、使用しているシステムとソフトウェアの公式ドキュメントに従ってください
以下に登場する**パッケージ名、パス、ユーザーとグループ、サービス名、モジュールの引数、systemd のオプション**は、**ディストリビューション、ソフトウェアのバージョン、導入方法**で変わります。サンプルが示すのは「何を書くべきか、なぜそう書くのか」であり、**そのままコピー＆ペーストできる完成品ではありません**。適用する前に、使用しているディストリビューションのドキュメント、サーバーとプラグインの公式ドキュメント、Ansible、systemd、cron の公式マニュアル（`man 5 crontab`、`man systemd.timer`、`man systemd.service`）と照合してください。
:::

## 1. まず何を自動化するか

判断基準は単純です。**その作業は「時間で繰り返す」必要があるか？** あるなら自動化する価値があり、ないならまず手を出さないこと。

| タスク | 頻度 | 自動化の方法 | リスク |
| --- | --- | --- | --- |
| ワールドと設定のバックアップ | 毎日 / 6 時間ごと | cron か systemd timer + スクリプト | 低（ただし**検証していないバックアップはバックアップがないのと同じ**） |
| 遠隔地への同期 | 毎日 | `rsync` + SSH 鍵 | 中（移行先が満杯になる、上書きされる） |
| 定時再起動 | 毎日 / 毎週 | cron か systemd timer | 低（ただし**再起動はラグの解決手段ではない**） |
| ログの片付けとローテーション | 毎日 / 毎週 | `logrotate` かスクリプト | 中（ディレクトリを間違えて削除すると不可逆） |
| ヘルスチェックと自動復旧 | 毎分 / 5 分ごと | スクリプト + タイマー + アラート | 中（**繰り返しの再起動は本当の問題を覆い隠す**） |
| 更新の検知（通知のみ） | 毎日 | スクリプト + 通知 | 低 |
| 更新の実行（ロールバックを含む） | 人が起動 | スクリプト + 人の確認 | **高**（バイナリと設定を変える） |
| プラグインのアップグレード | 人 | テストサーバーで先に検証 | **高**（設定形式と依存が変わる） |
| ゲームバージョンのアップグレード | 人 | 公式のアップグレード手順に従う | **最高**（ワールド形式が一方通行で変わり得る） |
| セーブデータの削除、プレイヤーデータの消去、ワールドのリセット | 絶対に自動化しない | 人の実行のみ許可 | **不可逆** |

結論：**自動化の価値は「低リスク、高頻度、純粋に機械的」な動作に集中します**。リスクが高い動作ほど、自動化は「検査、準備、検証、ロールバック」に使い、「直接実行」には使わないべきです。

## 2. むやみに自動化してはいけないもの

**ゲームバージョンのアップグレード。** メジャーバージョンをまたぐアップグレードは、しばしば**ワールドデータの一方通行の形式変換**を伴います。新バージョンが一度ワールドを開いて保存すると、旧バージョンへ戻すのは通常不可能です。この種の操作は人が確認し、**先にバックアップし、先にコピーで試す**必要があります。

**テストしていないプラグインのアップグレード。** プラグインの依存（Vault、PlaceholderAPI、ProtocolLib、LuckPerms などの前提）と設定形式はバージョンで変わります。自動アップグレードの典型的な結末は、夜中に更新が終わり、朝にプレイヤーが入れず、どのプラグインが原因か分からない、というものです。

**あらゆる不可逆な操作。** 削除、上書き、消去、移行、`rm -rf`、データベースの `DROP`。こうした動作はスクリプトに**準備させる**（削除対象を列挙する、確認待ちの一覧を作る）ことはできますが、タイマーに**直接実行させる**べきではありません。

**自分が読んで理解していないスクリプト。** ネットから持ってきた、読んでもいない shell を root とタイマーに組み合わせるのは、いつ鳴るか分からない地雷を自分で埋めるのと同じです。

:::warn 自動化の破壊力は「自動で増幅」される
人の操作の誤りは影響範囲がその 1 回だけですが、自動化の誤りは**頻度のぶんだけ繰り返されます**。ディレクトリを書き間違えたクリーンアップスクリプトは毎日 1 回削除し、条件を逆に書いたヘルスチェックは毎分 1 回再起動します。**まずスクリプトを読み取り専用で十分に長く動かし、判断が正しいことを確認してから、書き込み権限を与えてください。**
:::

## 3. スクリプトの衛生

同じスクリプトでも、よく書けたものとそうでないものの違いは機能ではなく、**事故が起きたときに何が起きたかを読み取れるか**にあります。

### 3.1 冒頭の 3 つ

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **shebang**：`#!/usr/bin/env bash` は `#!/bin/bash` より移植性が高い（`PATH` から bash を探します）。**注意**：`sh` は以下で使う bash の構文に対応している保証がないので、`#!/bin/sh` を使わないこと。
- **`set -e`**：コマンドが失敗したら即座に終了し、「前の段階が失敗したのに続きを実行する」のを避けます。
- **`set -u`**：未定義の変数を参照したらエラーで終了します。最も危険なバグの 1 つは、変数が空のために `rm -rf "$DIR/"` が `rm -rf /` になることです。
- **`set -o pipefail`**：パイプのどこか 1 段が失敗すれば全体を失敗とみなします。これがないと、`tar ... | gzip ...` で tar がエラーを出しても成功と扱われることがあります。

### 3.2 ログ、終了コード、冪等性

**ログには必ずタイムスタンプを付け、`echo` だけで済ませない**：タイムスタンプのないログは調査での価値が極めて低く、「バックアップ失敗」が今日なのか先週なのか分かりません。

```bash
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
log INFO  "backup started"
log ERROR "rcon save-off failed"
```

スクリプトを systemd で管理するなら、自分でタイムスタンプを付けず `journalctl`（タイムスタンプとローテーションを内蔵）に任せることもできます。**ただし 2 つの方式を混ぜないでください**。

**終了コードに意味を持たせる**：`0` は成功、0 以外は失敗で、しかも**失敗の理由ごとに区別**します。そうして初めてアラートに情報量が出ます。`1` 一般的なエラー、`2` 使い方の誤り、`3` 依存の欠落、`4` ロックが使用中（前回がまだ実行中）、`5` データの検証失敗。

**冪等性**：冪等なスクリプトは繰り返し実行しても結果が同じで、これが自動化で最も重要な性質です。`mkdir` ではなく `mkdir -p`、追記ではなく上書き（ログを除く）、「準備できていると仮定する」ではなく「確認してから動作する」。**冪等でないスクリプトは再試行のときにデータを壊します**。そして再試行は常態です（マシンの再起動、cron の追い実行、自分でもう一度走らせる）。

### 3.3 引用符、`--dry-run`、バージョン管理

```bash
rm -rf "${BACKUP_DIR:?BACKUP_DIR is not set}/${STAMP}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
```

変数は必ず `"$VAR"` と書き、`$VAR` と書かないこと。さもないとパスに空白があるときに複数の引数へ分割されます。`${VAR:?message}` は変数が空か未設定のとき**直接エラーで終了**し、誤削除を防ぐ最も安価な保険です。スクリプトに「表示だけして実行しない」モードを付けるのは、最も低コストな安全策です。

**スクリプトはバージョン管理に入れる**：スクリプトを Git リポジトリに入れる理由は「規範だから」ではなく、**前回何を変えたか**、変更後にいつから問題が出たかが分かること、誤削除から復元できること、複数のサーバーで同じ 1 本を共有でき、それぞれが少しずつ違う 3 つの版に進化していかないことです。リポジトリにはスクリプト、systemd ユニット、cron の断片、Ansible のプレイブック、依存を説明する README を含めるべきですが、**秘密情報は絶対に入れないでください**（第 9 節を参照）。

## 4. 完全なバックアップスクリプト

次のスクリプトは、ここまでの原則をすべて使っています。**ロックファイルで重複を防ぎ、RCON でセーブデータの書き込みを止め、日付付きのアーカイブを作り、検証し、保持方針を適用し、遠隔地へ同期する**。

```bash
#!/usr/bin/env bash
set -euo pipefail
# Minecraft サーバーのバックアップスクリプト（Linux）。使い方：./mc-backup.sh [--dry-run]
SERVER_DIR="/srv/minecraft/server"
WORLD_DIRS=("world" "world_nether" "world_the_end")
BACKUP_DIR="/srv/backups/mc"
RETENTION_DAYS=14
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""                            # 空欄なら RCON を使わない
OFFSITE_TARGET=""                           # 例：backup@host:/srv/offsite/mc
MIN_FREE_GB=20
STAMP="$(date '+%Y%m%d-%H%M%S')"; TARBALL="${BACKUP_DIR}/mc-world-${STAMP}.tar.gz"
DRY_RUN=0; [[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
die() { log ERROR "$1"; exit "${2:-1}"; }
run() { if (( DRY_RUN )); then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
# 事前チェック
for cmd in tar flock find du df; do
  command -v "$cmd" >/dev/null 2>&1 || die "コマンドが見つかりません：$cmd" 3
done
[[ -d "$SERVER_DIR" ]] || die "サーバーのディレクトリがありません：$SERVER_DIR" 3
if [[ -n "$RCON_PASSWORD" ]] && ! command -v mcrcon >/dev/null 2>&1; then
  die "RCON を設定していますが mcrcon が見つかりません" 3
fi
# ロック：前回がまだ終わっていないのに重複して実行するのを防ぐ
LOCK="${STATE_DIRECTORY:-/run/lock}/mc-backup.lock"
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK" || die "ロックファイルを作成できません：$LOCK" 3
if ! flock -n 9; then log WARN "前回のバックアップが実行中です。今回はスキップします"; exit 4; fi
# どのように終了しても、セーブデータの書き込みを戻す
RCON_DISABLED=0
cleanup() {
  if (( RCON_DISABLED )); then
    mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-on" \
      || log ERROR "save-on に失敗しました。手動でセーブデータの書き込みが戻ったか確認してください"
  fi
}
trap cleanup EXIT
log INFO "バックアップ開始：${SERVER_DIR}"
run install -d -m 0750 "$BACKUP_DIR"

# 1) 自動保存を止める（RCON を推奨。RCON を使わない場合は screen でコマンドを送れる。例：
#    screen -S minecraft -p 0 -X stuff 'save-off\n'。その後 save-on を送るのを忘れずに）
if [[ -n "$RCON_PASSWORD" ]]; then
  if mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-off" \
     && mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "save-all flush"; then
    RCON_DISABLED=1; log INFO "save-off と save-all flush を実行しました"; sleep 5
  else
    log WARN "RCON が使えないため save-off を飛ばしてバックアップを続けます"
  fi
else
  log WARN "RCON が未設定のため save-off を飛ばします"
fi

# 2) ワールドディレクトリの存在を確認し、空のアーカイブを作らないようにする
TAR_ARGS=()
for d in "${WORLD_DIRS[@]}"; do
  if [[ -d "${SERVER_DIR}/${d}" ]]; then TAR_ARGS+=(-C "$SERVER_DIR" "$d")
  else log WARN "存在しないディレクトリを飛ばします：${SERVER_DIR}/${d}"; fi
done
(( ${#TAR_ARGS[@]} )) || die "アーカイブする世界ディレクトリがありません。中止します" 5
# 3) アーカイブする（pigz があれば並列圧縮に使う）
if command -v pigz >/dev/null 2>&1; then
  run tar --use-compress-program=pigz -cf "$TARBALL" "${TAR_ARGS[@]}"
else
  run tar -czf "$TARBALL" "${TAR_ARGS[@]}"
fi
# 4) アーカイブが読めることを検証する（この段階が「バックアップが存在するか」を決める）
if (( ! DRY_RUN )); then
  tar -tzf "$TARBALL" >/dev/null || die "アーカイブの検証に失敗しました：$TARBALL" 5
  log INFO "アーカイブの検証に成功：$(du -h "$TARBALL" | cut -f1)"
fi
# 5) 保持方針と空き容量の下限
run find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mc-world-*.tar.gz' \
  -mtime "+${RETENTION_DAYS}" -print -delete
FREE_GB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024/1024)}')"
(( FREE_GB < MIN_FREE_GB )) && log WARN "空き容量 ${FREE_GB}G が下限 ${MIN_FREE_GB}G"
# 6) 遠隔地への同期（rsync は失敗時に非 0 を返し、set -e と組み合わさって直接表面化する）
if [[ -n "$OFFSITE_TARGET" ]]; then
  log INFO "遠隔地へ同期：${OFFSITE_TARGET}"
  run rsync -a --partial --delete-after "$BACKUP_DIR/" "$OFFSITE_TARGET/"
fi
log INFO "バックアップ完了：${TARBALL}"
```

重要な設計：**`flock -n 9`** は前回が終わっていないときにスキップさせ、バックアップを 2 本並行してディスクと I/O を飽和させません。**`trap cleanup EXIT`** は、スクリプトがどう終了しても `save-on` を試みることを保証します。さもないと**サーバーがずっとディスクに書かなくなり**、これは非常に見つけにくい事故です。**`save-all flush` の後の `sleep 5`** は、メモリ上のチャンクがディスクへ落ちる時間をサーバーに与えます。**`tar -tzf` の検証**は「バックアップが有効か」の唯一の判断材料です。**`--delete-after`** は転送が成功してから古いファイルを消し、転送の失敗で遠隔地が空になるのを避けます。**`${STATE_DIRECTORY:-/run/lock}`** は systemd の `StateDirectory=`（4.2 を参照）と両立し、手動実行時は `/run/lock` にフォールバックします。

:::tip バックアップは定期的に「復元演習」をする
スクリプトが毎日成功していても、バックアップが使えるとは限りません。一定期間ごとに、**テスト用のマシンか一時ディレクトリで実際に展開して起動してみて**ください。復元の流れは [バックアップと復元](/tutorials/java/backup)、遠隔地のコピーの意味は [遠隔地バックアップ](/tutorials/ops/offsite-backup) を参照。
:::

### 4.1 対応する cron の書き方

```ini
# /etc/cron.d/mc-backup
# 分 時 日 月 曜   ユーザー       コマンド
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 4 * * *   minecraft   /opt/mc-ops/mc-backup.sh >> /var/log/mc-backup.log 2>&1
```

**cron の環境は自分がログインしている shell とまったく違います**。`PATH` は短く、`HOME` も思っているものではないかもしれません。だから crontab で `SHELL` と `PATH` を明示し、スクリプトでもできるだけ絶対パスを使ってください。**`>> log 2>&1` のリダイレクトは必須**です。さもないと出力はメールへ行きます（多くのマシンにはメールの仕組みがなく、ブラックホールと同じです）。`/etc/cron.d/` のファイルは**ユーザー名のフィールドが必要**ですが、`crontab -e` が書くのは現在のユーザーの表で**ユーザー名のフィールドはありません**。これが最もよくある cron の構文エラーです。**cron は逃したタスクを「追い実行」しません**。マシンが 4:30 に落ちていれば、その回のバックアップは起きません。

### 4.2 等価な systemd timer + service

```ini
# /etc/systemd/system/mc-backup.service
[Unit]
Description=Minecraft world backup
After=network-online.target

[Service]
Type=oneshot
User=minecraft
Group=minecraft
StateDirectory=mcbackup
StateDirectoryMode=0750
# スクリプトはサーバーのディレクトリを読み、バックアップのディレクトリへ書く必要がある
ReadWritePaths=/srv/minecraft/server /srv/backups/mc
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ExecStart=/opt/mc-ops/mc-backup.sh
Nice=10
IOSchedulingClass=idle
```

```ini
# /etc/systemd/system/mc-backup.timer
[Unit]
Description=Run Minecraft world backup every 6 hours

[Timer]
OnCalendar=*-*-* 00,06,12,18:30:00
# 発火時にマシンが停止していれば、起動後に 1 回追い実行する
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now mc-backup.timer
systemctl list-timers mc-backup.timer
journalctl -u mc-backup.service -n 50 --no-pager
```

つまずきやすい点が 2 つ：**`OnCalendar` の曜日と月は英語の略号**（`Mon`、`Sun`、`Jan`）で、時刻は既定でローカルタイムゾーンとして解釈されるので、タイムゾーンを変えると発火時刻も変わります（文法は `man systemd.time`）。**`ProtectSystem=strict` はファイルシステム全体を読み取り専用でマウント**し、書き込み可能なのは `StateDirectory`、`CacheDirectory`、`LogsDirectory`、`RuntimeDirectory` と明示した `ReadWritePaths` だけです。スクリプトが別の場所に書くなら追加する必要があり、さもないと「権限は合っているのに書けない」という状態になります。

:::tip cron と systemd timer のどちらを選ぶか
「毎日スクリプトを 1 本走らせる」だけなら、どちらでもよく、慣れているほうを選べばよい。**ログの集約、起動時の追い実行、資源の制限、失敗時の再試行**が必要なら systemd timer。**ディストリビューションをまたいで同じ**にしたい（BSD、コンテナを含む）なら cron のほうが汎用的です。
:::

## 5. 定時再起動

定時再起動は多くのサーバーの日常的な運用ですが、まず明確にしてください。**再起動はラグの解決手段ではありません。** 再起動が対処できるのは、メモリの緩やかなリーク、長期稼働で溜まった一時的な状態、あるプラグインの小さな不具合です。**できない**のは、TPS が低い、チャンクの読み込みが遅い、プレイヤーがラグる、といった問題で、それらは原因を突き止める必要があります（[spark でサーバー性能を分析する](/tutorials/ops/spark) を参照）。そして「毎日 1 回落ちるから毎日 1 回再起動する」は、**本当の障害を永遠に見つからなくします**。

定時再起動が必要だと決めたら、手順には必ず**事前の告知**を含めます。

```bash
#!/usr/bin/env bash
set -euo pipefail
RCON_HOST="127.0.0.1"; RCON_PORT="25575"
RCON_PASSWORD=""            # より安全なのは、権限を絞ったファイルか環境変数から読むこと
SERVICE="minecraft.service"
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
rcon() { mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "$1"; }

rcon "say サーバーは 5 分後に再起動します。進行状況を保存してください"
sleep 240
rcon "say サーバーは 1 分後に再起動します"
sleep 60
rcon "save-all flush"
sleep 5
log INFO "再起動 ${SERVICE}"
systemctl restart "$SERVICE"
```

```ini
# ファイル 1：/etc/systemd/system/mc-restart.timer
[Unit]
Description=Restart Minecraft server on weekdays at 05:00

[Timer]
OnCalendar=Mon..Fri 05:00:00
Persistent=false
AccuracySec=30s

[Install]
WantedBy=timers.target

# ファイル 2：/etc/systemd/system/mc-restart.service
[Unit]
Description=Announce and restart the Minecraft server
After=network-online.target

[Service]
Type=oneshot
User=minecraft
ExecStart=/opt/mc-ops/mc-restart.sh
```

パネル（Pterodactyl、AMP、MCSManager の類）を使っているなら、**パネル内蔵の再起動スケジュールを優先**してください。パネルはプロセスを優雅に止める方法を知っています。スクリプトでパネル管理下のプロセスを直接 `kill` すると、パネルの状態が乱れることがあります。パネルの比較は [サーバーパネル](/tutorials/ops/panels) を参照。

:::warn kill -9 でサーバーを止めない
プロセスを強制終了すると、ワールドが**保存する間もなく**終わったり、書き込みの途中で中断されたりします。正しい順序は常に、`save-all flush` → 正常な停止（`stop` コマンドか `systemctl stop`）→ プロセスの終了を待つ。強制終了を考えるのはプロセスが完全に固まったときだけで、しかも**事後にセーブデータの完全性を確認**してください。
:::

## 6. 更新の自動化を安全に進める方法

更新は自動化のなかでリスクが最も高い種類です。実行可能なやり方は、**自動化を「準備と検証」に使い、実行は人の確認に残す**ことです。新しいバージョンを検知する（自動、通知のみ）→ `staging/` へダウンロードする（自動、**動いている jar を直接上書きしない**）→ 公式のハッシュを検証する（自動）→ バックアップしアーカイブが読めることを確認する（自動）→ 切り替える（人の確認後に実行、旧 jar は改名して残す）→ 再起動してポート、ログ、プラグインの読み込みを検証する → 失敗したら旧 jar に戻して**アラート**。

「検査とダウンロード」だけを行うチェッカーは、破壊力がないので最も価値のある自動化です。

```bash
#!/usr/bin/env bash
set -euo pipefail
# 検査とダウンロードのみ。置き換えも再起動もしない
STAGING="/srv/minecraft/staging"
CURRENT="/srv/minecraft/server/server.jar"
DOWNLOAD_URL="https://example.invalid/server.jar"          # 公式のアドレスに置き換える
CHECKSUM_URL="https://example.invalid/server.jar.sha256"   # 公式のチェックサムのアドレスに置き換える
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
install -d -m 0750 "$STAGING"

# 1) 一時ディレクトリへダウンロードする
curl -fsSL --retry 3 -o "${STAGING}/server.jar.new" "$DOWNLOAD_URL"

# 2) 検証する（公式が公開しているハッシュを使うこと）
expected="$(curl -fsSL "$CHECKSUM_URL" | awk '{print $1}')"
actual="$(sha256sum "${STAGING}/server.jar.new" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  log ERROR "チェックサムが一致しません。ダウンロードを破棄します"; rm -f "${STAGING}/server.jar.new"; exit 5
fi

# 3) 現在のバージョンと比較し、報告するだけ
if [[ "$(sha256sum "$CURRENT" | awk '{print $1}')" == "$actual" ]]; then
  log INFO "すでに最新バージョンです"; rm -f "${STAGING}/server.jar.new"
else
  log WARN "新しいバージョンを検出しました。一時ディレクトリに置いたので、人の確認後に切り替えてください"
fi
```

**重要な原則：自動化は「ものを用意して状況を説明する」ところまで。置き換えと再起動は人がボタンを押します。** 更新とロールバックの詳細（プラグイン、MOD、MCDR を含む）は [サーバー、プラグイン、MCDR の更新保守](/tutorials/ops/updates) を参照してください。

## 7. ヘルスチェックによる自動化

ヘルスチェックの価値は、**プレイヤーが問題に気づく前に見つける**ことです。判断の根拠はできるだけ客観的にします。プロセスが動いているか（`systemctl is-active`。ただしプロセスが生きていることはサービスが使えることを意味しません）、ポートを待ち受けているか（`nc -z` / `ss -ltn`。最も速い可用性の検査）、コマンドに応答するか（RCON の問い合わせ。応答すればメインスレッドが完全に固まっていないと分かる）、TPS / MSPT（**サーバーによってコマンドが違う**ので公式ドキュメントで確認する）、ディスクとメモリ（アラート向きで「自動再起動」向きではありません）。

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="127.0.0.1"; PORT="25565"; SERVICE="minecraft.service"
RCON_HOST="127.0.0.1"; RCON_PORT="25575"; RCON_PASSWORD=""
MIN_TPS="10"; COOLDOWN_MIN=15
ALERT_CMD=""                 # 例：/opt/mc-ops/notify.sh。メッセージを 1 つ受け取る
log() { printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$1" "$2"; }
alert() { log WARN "$1"; if [[ -n "$ALERT_CMD" ]]; then "$ALERT_CMD" "$1" || true; fi; }
# クールダウン：クラッシュと再起動のループを避ける
STAMP_FILE="/run/mc-health.last-restart"
now="$(date +%s)"
if [[ -f "$STAMP_FILE" ]]; then
  last="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"
  if (( now - last < COOLDOWN_MIN * 60 )); then log WARN "クールダウン中です。自動再起動をスキップします"; exit 0; fi
fi
# 1) ポートの検査（3 秒のタイムアウト）
if ! timeout 3 bash -c "</dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  alert "ポート ${PORT} が応答しません"
  if systemctl restart "$SERVICE"; then printf '%s\n' "$now" > "$STAMP_FILE"
  else alert "再起動に失敗しました。人の対応が必要です"; exit 1; fi
  exit 0
fi
# 2) TPS の検査（RCON が必要で、サーバーが対応するコマンドを持つ場合）
if [[ -n "$RCON_PASSWORD" ]] && command -v mcrcon >/dev/null 2>&1; then
  tps_raw="$(mcrcon -H "$RCON_HOST" -P "$RCON_PORT" -p "$RCON_PASSWORD" "tps" 2>/dev/null || true)"
  tps="$(printf '%s' "$tps_raw" | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  if [[ -n "$tps" ]] && awk -v t="$tps" -v m="$MIN_TPS" 'BEGIN { exit !(t < m) }'; then
    alert "TPS ${tps} がしきい値 ${MIN_TPS} を下回っています（spark で分析してください。むやみに再起動しないこと）"
  fi
fi
log INFO "ヘルスチェックに合格"
```

```ini
# /etc/systemd/system/mc-health.timer
[Unit]
Description=Check Minecraft server health every 2 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
AccuracySec=15s

[Install]
WantedBy=timers.target
```

:::warn 繰り返しの再起動は本当の問題を覆い隠す
ヘルスチェックが毎日 1 回サーバーを再起動しているなら、あなたが得ているのは「安定したサーバー」ではなく、**毎日落ちているのに誰も知らないサーバー**です。自動再起動のスクリプトは**必ず同時にアラートを出す**必要があり、クールダウンは十分に長くします。発動が続くなら、**自動再起動を止めて人の調査に切り替える**べきです。
:::

指標の収集、しきい値の設定、アラートの経路の完全なやり方は [監視とアラート](/tutorials/ops/monitoring) を参照してください。

## 8. 構成管理：Ansible の概念と最小例

サーバーが 2 台を超えると、「ログインして手で変える」が制御できなくなります。3 台の設定が少しずつ違い、どれが正しいか分からない。構成管理ツール（Ansible、Salt、Puppet、Chef）が解決するのはこの問題です。**マシンの望ましい状態をファイルに書き、バージョン管理に入れ、ツールに収束させる。** Ansible は最も敷居が低く、**SSH と Python だけが必要で、管理対象のマシンにエージェントを入れません**。

```ini
# inventory.ini
[mcservers]
mc1.example.com ansible_user=deploy
mc2.example.com ansible_user=deploy

[mcservers:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# playbook.yml
---
- name: Provision a Minecraft host
  hosts: mcservers
  become: true
  vars:
    mc_user: minecraft
    mc_group: minecraft
    mc_home: /srv/minecraft
    # ディストリビューション差：Debian/Ubuntu では通常 openjdk-21-jre-headless、
    # RHEL 系では通常 java-21-openjdk-headless。必ず自分のディストリビューションで確認すること。
    java_package: openjdk-21-jre-headless
  tasks:
    - name: Install a Java runtime
      ansible.builtin.package:
        name: "{{ java_package }}"
        state: present
    - name: Create the service user and group
      ansible.builtin.user:
        name: "{{ mc_user }}"
        group: "{{ mc_group }}"
        home: "{{ mc_home }}"
        system: true
        shell: /usr/sbin/nologin
        create_home: true
        state: present
    - name: Deploy the systemd unit
      ansible.builtin.template:
        src: templates/minecraft.service.j2
        dest: /etc/systemd/system/minecraft.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart the server
  handlers:
    - name: Reload systemd and restart the server
      ansible.builtin.systemd:
        name: minecraft.service
        daemon_reload: true
        state: restarted
```

```bash
ansible-playbook -i inventory.ini playbook.yml --check --diff
ansible-playbook -i inventory.ini playbook.yml
```

:::warn モジュールの引数は Ansible の公式ドキュメントに従ってください
上の各モジュール（`package`、`user`、`template`、`systemd`）の**引数名、値、挙動は Ansible のバージョンで変わり**、新しいバージョンではモジュールが改名されたり collection へ移ったりもします。**サンプルをそのまま写すのはよくある事故の原因です**。まず `--check`（報告のみで変更しない）で流し、それから Ansible の公式ドキュメントと照らして引数の意味を 1 つずつ確認してください。
:::

3 つの経験則：**まず「設定」を管理し、それから「デプロイ」を管理する**（`server.properties`、プラグインの設定、systemd ユニットをバージョン管理に入れる価値は、Ansible に jar をダウンロードさせるよりはるかに大きい）。**`--check` は味方**（どんなプレイブックもまず `--check --diff` で流す）。**機密値はリポジトリに入れない**（パスワード、トークン、RCON のパスワードは `ansible-vault` か環境変数で注入する）。

## 9. CI/CD の概念（そしてなぜ鍵をリポジトリに入れてはいけないか）

CI/CD を Minecraft サーバーに使うとき、最も価値があるのは「自動デプロイ」ではなく**自動検査**です。実務的なやり方は、サーバーの設定を Git リポジトリに入れ、パイプラインにコミットのたびに 3 つのことをさせることです。**構文の検証、構造の解析、スクリプトの静的検査**。

```yaml
# .github/workflows/validate.yml
name: Validate server configuration
on:
  push:
    branches: [main]
  pull_request:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repository
        uses: actions/checkout@v4
      - name: Lint YAML configuration
        run: |
          pip install --disable-pip-version-check yamllint
          yamllint -c .yamllint.yml config/
      - name: Parse YAML and TOML files
        run: |
          python3 - <<'PY'
          import pathlib, sys, tomllib, yaml
          parsers = {"*.yml": yaml.safe_load, "*.toml": tomllib.loads}
          failed = False
          for pattern, parse in parsers.items():
              for path in sorted(pathlib.Path("config").rglob(pattern)):
                  try:
                      parse(path.read_text(encoding="utf-8"))
                  except Exception as exc:
                      failed = True
                      print(f"{path}: {exc}")
          sys.exit(1 if failed else 0)
          PY
      - name: ShellCheck the operations scripts
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          shellcheck -x scripts/*.sh
```

:::note バージョン差：`tomllib` は Python 3.11 以降が必要
標準ライブラリに `tomllib` が入るのは Python 3.11 からです。それより古い版では `tomli` を入れて `import tomli as tomllib` に変える必要があります。実行環境に合わせて確認してください。
:::

**「サーバーへの同期」の段階は慎重に。** 実行可能な順序は、CI は**検証とパッケージング**だけを担い、デプロイは人が起動し、デプロイの前に自動でバックアップする、というものです。**コミットのたびに本番サーバーを直接再起動させないでください。**

**パスワード、トークン、RCON のパスワード、SSH の秘密鍵をリポジトリにコミットしてはいけません。** 具体的な結果が 3 つ：**Git の履歴に永久に残る**（ファイルを消しても解決しません。古いコミットに残り、クローンした人の手元にもあります。完全に消すには履歴の書き換えが必要で、しかも**漏れた資格情報をすべて交換**しなければなりません）。**公開リポジトリは自動でスキャンされる**（公開リポジトリの鍵を専門に収集する人がいて、コミットから悪用まで数分のこともあります）。**リポジトリと一緒に拡散する**（クローン、フォーク、CI のログのそれぞれに 1 部残り得ます）。

| 場面 | やり方 |
| --- | --- |
| CI で鍵が必要 | プラットフォームの Secrets（GitHub Actions の repository secrets など）を使い、環境変数で注入する |
| サーバー上で鍵が必要 | 権限を絞ったファイルに置く（`chmod 600`、所有者はサービスユーザー）、または systemd の `EnvironmentFile=` を使う |
| Ansible で鍵が必要 | `ansible-vault` で暗号化する、または環境変数から読む |
| ローカル開発 | `.gitignore` で本物の設定を除外し、リポジトリには `.example` のテンプレートだけを置く |

**公開の前に、鍵のスキャンツール（gitleaks、trufflehog など）で Git の履歴全体を 1 回検査する**ほうが、事後の対応よりはるかに安く済みます。

## 10. 導入の順序の提案

一度にすべてを自動化しないでください。リスクの低い順、価値の高い順に進めます。**まずバックアップスクリプトがあり、復元を 1 回検証した**（第 4 節）→ **バックアップをタイマーに載せ**、成功と失敗がログで見えることを確認する → **ヘルスチェック + アラートを足す**（第 7 節）。まずはアラートだけで、自動再起動はしない → **ログの片付けとローテーションを足し**、ディスク容量を制御する → **スクリプトと設定を Git に入れる**（第 3.3、9 節）→ **最後に自動更新を検討する**。しかも「ダウンロード + 検証 + 通知」までに留める（第 6 節）。

:::warn バックアップのない自動的な破壊操作は、データ喪失の定番の筋書き
クリーンアップスクリプトがディレクトリを間違える、`rsync --delete` の向きが逆、更新スクリプトがワールドファイルを上書きする。これらの事故に共通するのは、**それが起きる前に使えるバックアップがなかった**ことです。**データを削除、上書き、移動する自動化は、必ずバックアップが存在し復元できることを確認してから**動かしてください。それができないなら、自動で走らせないこと。セーブデータを失うとたいてい取り戻せませんが、スクリプトは書き直せます。
:::

## 次のステップ

- バックアップの方針と復元の流れ：[バックアップと復元](/tutorials/java/backup)
- 遠隔地のコピーの作り方：[遠隔地バックアップ](/tutorials/ops/offsite-backup)
- 指標、しきい値、アラートの経路：[監視とアラート](/tutorials/ops/monitoring)
- ラグの原因を特定する方法（再起動ではなく）：[spark でサーバー性能を分析する](/tutorials/ops/spark)
- 更新とロールバックの完全な流れ：[サーバー、プラグイン、MCDR の更新保守](/tutorials/ops/updates)
- パネル内蔵のタスクスケジュール：[サーバーパネル](/tutorials/ops/panels)

---

> スクリプトと設定は、使用しているシステムとソフトウェアの公式ドキュメントに従ってください。
