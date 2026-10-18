---
title: "[JAVA] よくある質問"
slug: faq-java
cat: faq
level: 1
order: 1
minutes: 12
tags: [java, よくある質問, 切り分け, エラー]
updated: 2026-10-04
draft: false
---

Java 版のサーバー構築の各段階で最もよくあるエラーと落とし穴を、**現象から直接引ける形**でまとめます。各項目に出典の節を示してあるので、詳細が必要ならそこを開いてください。

## 1. 起動しない

| 現象 | 原因 | 対処 | 出典 |
| --- | --- | --- | --- |
| 起動後**すぐ終了**し、ログに EULA と出る | 契約に同意していない | `eula.txt` を `eula=true` に変更 | [サーバーの起動](/tutorials/java/start) |
| `UnsupportedClassVersionError ... class file version 65.0` | **Java のバージョンが違う**（65 = Java 21） | バージョン対照表に従って対応する Java に替える | [環境準備](/tutorials/java/environment) |
| `'java' は内部コマンドまたは外部コマンドではありません` / `java: command not found` | Java を入れていない、`PATH` が未設定、または**ウィンドウを開き直していない** | `PATH` を確認し、**新しく開いた**ターミナルで再試行 | [環境準備](/tutorials/java/environment) |
| 起動スクリプトをダブルクリックすると**ウィンドウが一瞬で消える** | エラー後にウィンドウが自動で閉じる | スクリプトの末尾に `pause` を足すか、ターミナルから実行 | [サーバーの起動](/tutorials/java/start) |
| `Address already in use` | 25565 が使用中 | `netstat -ano \| findstr :25565`（Win）/ `ss -tlnp \| grep 25565`（Linux）で PID を調べて終了 | [環境準備](/tutorials/java/environment) |
| `Could not reserve enough space for object heap` | `-Xmx` が使用可能メモリを超えている | `-Xmx` を小さくする | [環境準備](/tutorials/java/environment) |
| 初回起動が `Downloading mojang_x.x.x.jar` で止まる | 実行ファイルをダウンロード中 | 気長に待つ。国内回線で長時間止まるなら加速手段を用意する | [サーバーの起動](/tutorials/java/start) |

## 2. 他人がつながらない

| 現象 | 原因 | 対処 | 出典 |
| --- | --- | --- | --- |
| 自分からの `telnet` は通るが他人がつながらない | **本機のファイアウォールだけ設定し、クラウドのセキュリティグループを開放していない** | クラウドのコンソールで受信ルール `TCP 25565` を追加 | [アクセス可能な環境へのデプロイ](/tutorials/java/deploy) |
| ポート検査で閉じていると表示される | サーバーが**起動していない**とポートは待ち受けない | 先にサーバーを動かしてから測る | [環境準備](/tutorials/java/environment) |
| 自宅のルーターでマッピングしても通らない | 高い確率で**公衆 IPv4 がない** | ルーターの WAN 側 IP と「自分の公衆 IP」を比較。一致しなければ申請する／クラウドサーバーに変える／トンネリングを使う | [アクセス可能な環境へのデプロイ](/tutorials/java/deploy) |
| **スマホのプレイヤーがつながらない** | TCP しか開放していない | 統合版／クロスプレイでは **UDP 19132** の追加開放が必要 | [スマホプレイヤーの受け入れ](/tutorials/java/mobile) |

## 3. パスと権限

| 現象 | 原因 | 対処 | 出典 |
| --- | --- | --- | --- |
| プラグイン／MOD が奇妙なパスエラーを出す | ディレクトリに**日本語や空白**が含まれる | `C:\mcserver` や `/opt/mcserver` のような英数字のみの短いパスへ移す | [サーバーの構成](/tutorials/java/structure) |
| Linux で `Permission denied` | サーバーを root で作成し、一般ユーザーに書き込み権限がない | `sudo chown -R mcserver:mcserver /opt/mcserver` | [環境準備](/tutorials/java/environment) |
| ワールドファイルをいじったらセーブデータが壊れた | `region/` の中のファイルを手で変更した | ワールドファイルを**手で変更しない**。WorldEdit などのツールを使うか、先にサーバーを止める | [サーバーの構成](/tutorials/java/structure) |

## 4. プラグイン関連

| 現象 | 原因 | 対処 | 出典 |
| --- | --- | --- | --- |
| `/plugins` で**赤く**表示される | 読み込み失敗（サーバーは認識したが読み込めなかった） | コンソールでエラーを見る。通常は前提の欠落かバージョン不一致 | [プラグイン入門](/tutorials/java/plugins) |
| `/plugins` に**赤も出ない** | サーバーがプラグインとして**まったく認識していない** | `plugins/` に入れたか、拡張子が `.jar` か、コアの種類を間違えていないか確認 | [プラグイン入門](/tutorials/java/plugins) |
| プラグインが YAML エラーを出す | **タブでインデントしている**（YAML はスペースのみ） | スペースのインデントに変える | [プラグイン入門](/tutorials/java/plugins) |
| 設定の日本語が文字化けする | ファイルの文字コードが UTF-8 でない | VS Code で **UTF-8** として保存し直す | [プラグイン入門](/tutorials/java/plugins) |
| 設定を変えたのに反映されない | リロードが必要 | `/プラグイン名 reload`。非対応なら再起動（**バニラの `/reload` は使わない**） | [プラグイン入門](/tutorials/java/plugins) |
| サーバーが突然重くなる／奇妙なエラーが出る | 新しく入れたプラグイン | **直近に入れたプラグインをまず無効化**し、1 つずつ有効化して特定 | [プラグイン入門](/tutorials/java/plugins) |

## 5. レッドストーン技術と仕組み

| 現象 | 原因 | 対処 | 出典 |
| --- | --- | --- | --- |
| レッドストーンの装置が不可解に動かない | **Paper 系がバニラの挙動を変えている** | レッドストーン技術なら **Fabric か Leaves**。Paper 系では軽度のレッドストーン技術にとどめ、設定を調整する | [レッドストーン技術とレッドストーン](/tutorials/java/redstone) |
| エンダーパールの回帰装置が動かない | チャンクのアンロード遅延 | `paper-world-defaults.yml` の `delay-chunk-unloads-by: 0s` | [レッドストーン技術とレッドストーン](/tutorials/java/redstone) |
| 密集したエンティティの装置が効かない | エンティティ衝突の上限 | `max-entity-collisions` を調整（**代償は性能**） | [レッドストーン技術とレッドストーン](/tutorials/java/redstone) |

## 6. 性能

| 現象 | 対処 | 出典 |
| --- | --- | --- |
| TPS が落ちて全体的に重い | まず **`simulation-distance`** を調整（描画距離を下げるよりずっと節約でき、見た目にも影響しない） | [パフォーマンス最適化](/tutorials/java/optimize) |
| どこが重いか分からない | **spark** でフレームグラフを生成し、最も幅の広い帯を見る | [パフォーマンス最適化](/tutorials/java/optimize) |
| プレイヤーが走り回ると重い | **ワールドのプリ生成**（Chunky など）を行う | [パフォーマンス最適化](/tutorials/java/optimize) |
| メモリを大量に割り当てても重い | `-Xmx` が大きすぎると GC の停止が長くなる | 10 人以内なら 4〜6GB で通常は十分 | [サーバー構築のプロトコルと推奨構成](/tutorials/java/protocol) |
| シングルコアが弱い | パラメータでは救えない。**シングルコアの強いマシンに替えるべき** | [サーバー構築のプロトコルと推奨構成](/tutorials/java/protocol) |

## 7. データとセキュリティ

| 現象 | 原因 / 対処 | 出典 |
| --- | --- | --- |
| セーブデータが壊れた／データが巻き戻った | ウィンドウを直接閉じてサーバーを落としたため | 停止は `stop` を使う。標準手順は `save-all` → `save-off` → バックアップ → `stop` | [よく使うサーバーコマンド](/tutorials/java/commands) |
| バックアップが壊れている | 書き込み中にコピーした | ホットバックアップなら先に `save-off`。またはサーバーを止めてから取る | [バックアップと復元](/tutorials/java/backup) |
| 荒らされたが誰か分からない | **記録プラグインを入れていない** | CoreProtect などを早めに入れる。**導入後**のことしか記録できない | [チート対策と破壊行為の防止](/tutorials/java/anticheat) |
| チート対策を入れたら正常なプレイヤーを傷つけた | 処罰を有効にするのが早すぎた | まず**記録モード**で観察。見逃しより誤爆を避ける | [チート対策と破壊行為の防止](/tutorials/java/anticheat) |
| オフラインモードのリスク | 誰でも ID を騙れ、BAN も回避できる | 公開サーバーでは正規アカウント認証を切るのは**勧めない** | [サーバーの設定](/tutorials/java/config) |
| 事業者が逃げた／データセンターで事故 | データが 1 台のマシンにしかない | **少なくとも定期的にバックアップを別の場所へダウンロード**する | [バックアップと復元](/tutorials/java/backup) |

## 8. クロスプレイとプロキシ

| 現象 | 原因 | 出典 |
| --- | --- | --- |
| 統合版のプレイヤーが入れない | Geyser を入れていない、または UDP を開放していない | [スマホプレイヤーの受け入れ](/tutorials/java/mobile) |
| Java のプレイヤーが統合版サーバーに入りたい | **できない**：Geyser は一方通行 | [スマホプレイヤーの受け入れ](/tutorials/java/mobile) |
| コンソール機（Xbox/PS/Switch）が入れない | IP を直接入力できない | [スマホプレイヤーの受け入れ](/tutorials/java/mobile) |
| クロスサーバーにしたらコマンドが反応しない | プラグインの導入位置が違う（プロキシ側かサブサーバー側か） | [プロキシ](/tutorials/java/proxy) |
| 転送用の鍵の漏洩が心配 | 漏洩 = 誰でも身元を偽造できる | 鍵は秘匿し、サブサーバーのポートを**公網に晒さない** | [プロキシ](/tutorials/java/proxy) |

> 問題が見つからない場合は、統合版は [[BE] よくある質問](/tutorials/faq/faq-be)、運営面は [[JAVA] 運用管理](/tutorials/ops/management-java) を参照。
