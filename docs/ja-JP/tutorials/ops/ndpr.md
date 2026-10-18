---
title: "NDPReforged 連合 BAN システム"
slug: ndpr
cat: ops
level: 3
order: 26
minutes: 16
tags: [連合 BAN, NDPR, チート対策, プラグイン, 設定, 運用]
updated: 2026-10-04
draft: false
---

**NDPReforged（NDPR）** はクロスプラットフォームの **Minecraft サーバー連合 BAN システム**です：複数のサーバーが同じ BAN データベースを共有し、**統一的な BAN とリアルタイム同期**を実現します。RESTful API を基盤に構築されており、公式ドキュメントは <https://ndpreforged.com/wiki.php>、公式サイトとサーバー運営者向けの管理画面は <https://ndpreforged.com/> にあります。

本記事は公式ドキュメント（現行バージョン **2.1.0**、ドキュメント最終更新 2026-08-16）に沿って整理したもので、設定項目と既定値はすべて公式ドキュメントを優先します。

## 1. 何を解決するのか

単体サーバーでの BAN の悩み：A サーバーで荒らしを BAN しても、その人は B サーバーで普通に遊べる。サーバー運営者同士はスクリーンショットと口頭の連絡しかない。NDPR は BAN データをクラウドに置き、接続するすべてのサーバーが**同じ名簿を共有**します。

公式が挙げる中核機能：

| 機能 | 説明 |
| --- | --- |
| セキュアな認証 | Token 認証 + 権限制御 |
| クロスプラットフォーム対応 | MCDR、Bukkit/Paper、MOD（Fabric/Forge/NeoForge）、Velocity/BungeeCord、統合版 |
| リアルタイム同期 | 複数サーバーの BAN データを即時同期 |
| HWID デバイス検証 | ブラウザフィンガープリントの収集による、チート対策のマシン検証 |
| BAN 審査 | BAN 申請を提出し、クラウドで審査後に同期 |
| データ統計 | 完全なブロック統計機能 |
| 旧版互換 | 旧 NDP プロトコルと互換 |

アーキテクチャは 4 層に分かれます：**管理画面（Web）→ API サービス層（Token 認証 / BAN 管理 / ユーザー管理 / データ配信 / HWID デバイス検証 / 審査）→ データ層（MySQL）**。

## 2. 対応マトリクス

| サーバー | 対応状況 |
| --- | --- |
| MCDR 2.8+ | 対応 |
| Java：Spigot / Bukkit / Paper / Folia | 対応 |
| Fabric / Forge / NeoForge（MOD） | 対応 |
| Velocity / BungeeCord（プロキシ） | 対応 |
| 統合版：LeviLamina / BDSX / BDSpyrunner / gomint / Allay / Nukkit | 対応 |

:::tip プロキシが最も手間が少ない
**Velocity か BungeeCord** に 1 回入れれば、**下流のすべてのサブサーバーが自動的に BAN 防御を得ます**。サブサーバーごとにクライアントを入れる必要はありません。
:::

## 3. インストール

### 1. MCDR（Java 版）

要件：**MCDR 2.8+**、**Python 3.8+**。

```bash
!!MCDR plugin install ndpr
```

GitHub のリリースページから手動でダウンロードし、MCDR のプラグインディレクトリに入れることもできます。

### 2. プラグイン系（Bukkit / Spigot / Paper / Folia）

要件：**MC 1.20.1+**、**Java 17+**。

1. `NDPR-Bukkit-2.1.0.jar` をサーバーの `plugins/` ディレクトリに入れる
2. サーバーを起動すると、プラグインが設定ファイルを自動生成する

**1 つの jar で Bukkit / Spigot / Paper / Folia すべてに対応します。**

### 3. MOD（Fabric / Forge / NeoForge）

対応バージョン：**1.20.4 / 1.20.6 / 1.21.1 / 1.21.4 / 1.21.6 / 1.21.9 / 1.21.11 / 26.2**。

`NDPR-MOD-2.1.0.jar` を `mods/` ディレクトリに入れ、ゲームまたはサーバーを起動します。**同じ jar が 3 つのローダーすべてに対応します。**

### 4. プロキシ（Velocity / BungeeCord）

要件：**Velocity 3.x** または **BungeeCord（MC 1.20.1+）**、**Java 17+**。

`ndpr-proxy.jar` をプロキシの `plugins/` ディレクトリに入れ、プロキシを再起動します。

### 5. 統合版

| プラットフォーム | インストール方法 |
| --- | --- |
| BDSpyrunner | `ndpr.py` を `plugins/` ディレクトリに入れる |
| BDSX | npm パッケージを `plugins/ndpr/` ディレクトリに入れる |
| LeviLamina | `plugins/ndpr/`（dll + `manifest.json`） |
| Nukkit / Allay / gomint | `ndpr.jar` を `plugins/` ディレクトリに入れる |

## 4. 設定（5 ステップ）

### ステップ 1：UUID を取得する

**MCDR 側**は 2 通りの方法があります：

方法 1：起動ログから探す：

```text
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: 服务器类型: xx
[MCDR] [20:21:33] [TaskExecutor/INFO] [ndpr]: UUID: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
[MCDR] [20:21:34] [TaskExecutor/INFO] [ndpr]: NDPR插件已加载
```

方法 2：2 回目の起動後に設定ファイルから読む。場所は `MCDRルート\config\ndpr\config.toml`：

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
```

**そのほかのすべてのプラットフォーム**（プラグイン系 / MOD / プロキシ / 統合版）は**初回起動時に UUID を自動取得して設定ファイルに書き込みます**。手動で記入する必要はありません。手動で確認したいときは次の表で探します：

| プラットフォーム | 設定ファイルの場所 | フィールド |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `uuid` |
| MOD | `.minecraft/config/ndpr.json` | `uuid` |
| Velocity | `plugins/ndpr/config.toml` | `uuid` |
| BungeeCord | `plugins/NDPReforged-Proxy/config.toml` | `uuid` |
| 統合版（BDSpyrunner/BDSX/LeviLamina/Nukkit/Allay/gomint） | `plugins/ndpr/config.json` | `uuid` |

### ステップ 2：Token を取得する

1. 公式サイト <https://ndpreforged.com/> を開き、上部か左上の **サーバー運営者向け管理** をクリック
2. ログインまたはアカウント登録（スライダー検証はゆっくり動かすと通りやすい）
3. 左側の **Token 管理** をクリック
4. 「新しい Token を作成」で前のステップの UUID を記入し、Token を生成
5. 任意：左側の **アップロード権限** で、Token の横からアップロード権限を申請して審査を待つ

### ステップ 3：Token を設定する

**MCDR 側**（`MCDRルート\config\ndpr\config.toml`）：

```toml
token = "xxxxxxxxxxxxxxxxxxxx"
```

ほかのプラットフォームのフィールド位置：

| プラットフォーム | 設定ファイル | フィールド |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `token` |
| MOD | `.minecraft/config/ndpr.json` | `token` |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `token` |
| 統合版 | `plugins/ndpr/config.json` | `token` |

:::warn Token を入れないのは、入れていないのと同じ
**Token は BAN 機能を有効にするためのもので、設定しないとプラグインは BAN のチェックを行いません。** プラグインを入れただけで Token を入れなければ、防御は空です。
:::

### ステップ 4：サーバーの種類を設定する

**MCDR 側**：

```toml
onlinemode = true   # true = 正規サーバー、false = オフラインサーバー
```

| プラットフォーム | 設定ファイル | フィールド |
| --- | --- | --- |
| Bukkit/Paper | `plugins/NDPR-Bukkit/config.yml` | `onlinemode`（必須） |
| MOD | `.minecraft/config/ndpr.json` | `onlinemode`（必須） |
| Velocity / BungeeCord | `plugins/ndpr/config.toml` | `onlinemode`（空欄ならプロキシ自身のモードを使う） |
| 統合版 | `plugins/ndpr/config.json` | `onlinemode`（統合版は Xbox ログインで統一され、そのまま透過する） |

:::warn Java 版は onlinemode が必須
**Java 版の各プラットフォームでは `onlinemode` が必須項目で、書かないとプラグインが正常に読み込まれません。**
:::

### ステップ 5：そのほかの設定項目

| 設定項目 | 説明 | 既定値 |
| --- | --- | --- |
| `api_url` | API のアドレス | `https://api.ndpreforged.com` |
| `language` | 言語（`zh_CN` / `en_us`） | `zh_CN` |
| `download_interval` | BAN データベースの自動更新間隔（秒）。`0` = 無効 | `900` |
| `check_hwid` | HWID デバイス検証を有効にする | `false` |
| `check_interval` | 検証通過後の免除日数 | `3` |
| `fail_closed` | BAN データベースが欠けているとき入場を拒否する（安全優先） | `false` |
| `verify_timeout` | HWID 検証のタイムアウト（秒、30〜600） | `60` |
| `freeze_interval` | 検証中の座標固定の間隔（秒、1〜60） | `1` |

**MCDR 側の完全な例**（`MCDRルート\config\ndpr\config.toml`）：

```toml
uuid = "xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
token = "xxxxxxxxxxxxxxxxxxxx"
onlinemode = true
api_url = "https://api.ndpreforged.com"
language = "zh_CN"
download_interval = 900
check_hwid = false
check_interval = 3
fail_closed = false
verify_timeout = 60
freeze_interval = 1
```

## 5. コマンド

### MCDR 側

メインコマンドは `!!NDPR` または `!!ndpr`。

| コマンド | 説明 |
| --- | --- |
| `ban <ID> <理由>` | プレイヤーを BAN する |
| `check <ID>` | プレイヤーの BAN 状態を確認する |
| `download` / `d` | BAN データを更新する |
| `checkupdate` / `cu` | アップデートを確認する |
| `help` | ヘルプを表示する |
| `reload` | 設定ファイルを再読み込みする |
| `auth <プレイヤー>` | プレイヤーのデバイス検証を強制実行する |

### そのほかのプラットフォーム（プラグイン系 / MOD / プロキシ / 統合版）

コマンドのプレフィックスは `/ndpr` で統一です（プロキシと統合版には `!!` プレフィックスのコマンドはありません）。

| コマンド | 説明 | 権限 |
| --- | --- | --- |
| `/ndpr`、`/ndpr help` | ヘルプ | 全員 |
| `/ndpr d`、`/ndpr download` | BAN データベースを手動でダウンロード | `ndpr.admin` |
| `/ndpr ban <プレイヤー> <理由>` | BAN の審査を申請する | `ndpr.admin` |
| `/ndpr check <ID/IP/UUID>` | BAN 状態を確認する（該当なしのときは曖昧な候補を示す） | 全員 |
| `/ndpr reload` | 設定を再読み込みし、BAN データベースを再ダウンロード | `ndpr.admin` |
| `/ndpr cu`、`/ndpr checkupdate` | プラグインの更新を確認 | `ndpr.admin` |
| `/ndpr auth <プレイヤー>` | プレイヤーのデバイス検証を強制実行する | `ndpr.admin` |

`ndpr.admin` は既定で **OP**（MCDR では権限レベル 2）に付与されます。

## 6. 自分で天秤にかけるべき点

1. **`fail_closed`：安全性 vs 可用性**。既定は `false` —— クラウドの BAN データベースを取得できないとき**通す**ので、サーバーは通常どおり使えます。`true` にすると**入場を拒否**し安全優先になりますが、クラウド障害時にプレイヤーが門前で止められます。公開サーバーと身内サーバーで選択が逆になりえます。
2. **`check_hwid`：チート対策 vs プライバシー**。有効にすると**ブラウザフィンガープリントの収集**でマシン検証を行います（`verify_timeout` の検証タイムアウト、`freeze_interval` の検証中の座標固定間隔、`check_interval` の免除日数と併用）。これは**IP より強い識別手段**ですが、プレイヤーのデバイス情報の収集を伴います —— 公式ドキュメントが用途を説明しているので、**サーバーのルールでプレイヤーに説明してから**有効にしてください。
3. **`download_interval`**：既定は 900 秒（15 分）ごとの同期です。小さくしすぎるとリクエスト頻度が増え、大きくしすぎると BAN の反映が遅くなります。`0` は自動更新の無効（`/ndpr d` での手動取得のみ）。
4. **プロキシ優先**：Velocity/BungeeCord 構成なら、プロキシに 1 回入れればすべてのサブサーバーをカバーでき、サブサーバーごとに入れるより漏れが少なくなります。

## 7. トラブル対応の早見表

| 現象 | まず確認すること |
| --- | --- |
| プラグインは読み込まれたのに何もブロックしない | **Token を記入したか**（未記入 = チェックしない） |
| プラグインが読み込まれない／効かない | Java 版では **`onlinemode` を記入したか**（必須） |
| BAN データベースが取得できない | `api_url` が正しいか（既定 `https://api.ndpreforged.com`）、`download_interval` が `0` でないか、ホストが外部に接続できるか |
| BAN されたプレイヤーがまだ入れる | **プロキシ**に入れたか、サブサーバーがプロキシを迂回して直結していないか、BAN データベースが同期済みか |
| 名簿を手動で更新したい | `/ndpr d`（MCDR では `!!ndpr d`） |
| 設定を変えてすぐ反映したい | `/ndpr reload`（設定を再読み込みし、BAN データベースも再ダウンロードする） |

## 次のステップ

- サーバーが攻撃されたとき、負荷試験を受けたときの対処：[よくあるネットワーク攻撃の種類と Minecraft 向け防御](/tutorials/ops/attack-defense)
- 記録とロールバック、権限とログインのプラグイン：[[JAVA] セキュリティプラグイン](/tutorials/ops/security-java)
- プレイヤーと運営の管理：[[JAVA] 運用管理](/tutorials/ops/management-java)

---

> 本記事の内容と設定項目の既定値は NDPReforged の公式ドキュメント（<https://ndpreforged.com/wiki.php>、バージョン 2.1.0）によります。公式が更新されたあとは公式ドキュメントを優先してください。
