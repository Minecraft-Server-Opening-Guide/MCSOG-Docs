---
title: Java 版のよくあるエラーとクラッシュの切り分け
slug: errors
cat: faq
level: 2
order: 3
minutes: 18
tags: [java, errors, crash, troubleshooting, plugins, logs, compatibility]
updated: 2026-10-04
draft: false
---

本記事は**エラーの読み方、非互換の特定方法**を扱います。すべての例外を網羅するのではなく、判断の順序を示します：まず「プラグインが例外を投げたがサーバーは生きている」と「サーバーがそのまま落ちた」を切り分け、次にスタックをたどって根本原因を見つけ、最後に最小構成のテストで確認します。

非互換は Java 版サーバーで最も時間を食う故障の種類です。**明確なヒントを出さない**か、出てくるクラス名が本当の原因と無関係であることがよくあるからです。本記事で確信が持てない箇所は、もっともらしい説明をでっち上げず「公式ドキュメントを優先」と書きます。

## 1. エラーの読み方

### 1.1 ログはどこにあるか

| 場所 | 内容 | いつ見るか |
| --- | --- | --- |
| `logs/latest.log` | 現在または直近の実行の完全なコンソール出力 | **第一現場**。サーバーが再起動するたびに上書きされるので、証拠を残すなら先にコピー |
| `logs/2026-10-04-1.log.gz` | 過去のログ。日付とサイズでローテーションされ圧縮される | 問題が数日前に起き、`latest.log` がすでに上書きされたとき |
| `crash-reports/crash-...-server.txt` | クラッシュレポート：完全なスタック、説明、そのときの実行環境 | サーバーが**異常終了**したときはまずここ |
| コンソールウィンドウそのもの | リアルタイム出力。流れが速い | 動かしながら見る。クラッシュ直前の内容は流れやすいので先にコピー |

ディレクトリ構成と各ファイルの役割は [サーバーの構成](/tutorials/java/structure) を参照。

:::tip 先にコピー、それから再起動
`logs/latest.log` は次回起動時に上書きされます。**サーバーを再起動する前に**、`logs/latest.log` と `crash-reports/` の最新のものを別の場所へコピーしてください。そうしないと切り分ける証拠が失われます。
:::

キーワードで素早く特定する（Linux）：

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

Windows PowerShell：

```powershell
Select-String -Path logs\latest.log -Pattern "ERROR|Exception|Caused by" | Select-Object -Last 40
Get-ChildItem crash-reports | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 1.2 プラグインの例外と致命的なクラッシュの違い

この 2 つは分けて扱わないと、無関係な赤字の山で迷子になります。

| | プラグインの例外（大多数） | 致命的なクラッシュ |
| --- | --- | --- |
| サーバーの状態 | 動き続け、プレイヤーもオンラインのまま | プロセスが終了し、ウィンドウが閉じるか systemd サービスが停止 |
| ログの末尾 | 例外のあとにも正常な tick の出力がある | 末尾が `This crash report has been saved to: ...` |
| 典型的なマーク | `Could not pass event ... to X`、`... has failed to load`、`... was disabled` | `Encountered an unexpected exception`、`Exception in server tick loop`、`Watching Server thread` |
| 影響範囲 | 1 つのプラグインまたは 1 つの機能 | サーバー全体 |
| 対処の方向 | プラグインを直す、更新する、またはまず無効化する | まずサーバーを起動させ、それからクラッシュレポートを読む |

以下は**あくまで例**（構造の説明用で、実在のログではない）のプラグイン例外で、サーバーは動き続けます：

```text
[12:00:01 ERROR]: Could not pass event PlayerJoinEvent to MyPlugin v1.2.3
java.lang.NullPointerException: Cannot invoke "java.lang.String.toLowerCase()" because "name" is null
        at com.example.myplugin.JoinListener.onJoin(JoinListener.java:42) ~[MyPlugin-1.2.3.jar:?]
        at org.bukkit.plugin.java.JavaPluginLoader$1.execute(JavaPluginLoader.java:315) ~[paper-api.jar:?]
        at org.bukkit.plugin.RegisteredListener.callEvent(RegisteredListener.java:70) ~[paper-api.jar:?]
        ... 20 more
[12:00:02 INFO]: Player Steve joined the game
```

要点は最後の行です：**例外のあともサーバーは次のイベントを通常どおり処理している**ので、これはフレームワークに捕捉されたプラグイン単位のエラーだと分かります。

### 1.3 Java のスタックの読み方

`Caused by` の連鎖を含む**例**のスタック：

```text
[12:00:05 ERROR]: Encountered an unexpected exception
java.lang.RuntimeException: Failed to load plugin data
        at com.example.core.DataLoader.load(DataLoader.java:88) ~[?:?]
        at com.example.core.CorePlugin.onEnable(CorePlugin.java:31) ~[?:?]
        at org.bukkit.plugin.java.JavaPlugin.setEnabled(JavaPlugin.java:280) ~[paper-api.jar:?]
        ... 18 more
Caused by: java.lang.NoSuchMethodError: 'void org.bukkit.configuration.file.FileConfiguration.setDefaults(org.bukkit.configuration.file.FileConfiguration)'
        at com.example.core.DataLoader.load(DataLoader.java:71) ~[?:?]
        ... 18 more
Caused by: java.lang.ClassNotFoundException: com.example.lib.RequiredLib
        at java.net.URLClassLoader.findClass(URLClassLoader.java:445) ~[?:?]
        ... 21 more
```

1 行ずつ分解します：

- `[12:00:05 ERROR]:` はログのプレフィックス（時刻とレベル）で、エラーの中身そのものではありません。
- `java.lang.RuntimeException: Failed to load plugin data` は**最も外側の例外**。多くの場合ただのラッパーで、本当の情報は下にあります。
- `at パッケージ名.クラス名.メソッド名(ファイル名.java:行番号)` は呼び出しチェーン。**一番上の行が例外が投げられた位置で、下に行くほどそれを呼んだ上位のフレームワークに近づきます**。
- `Caused by:` が根本原因の連鎖で、複数層になることがあります。**最後の `Caused by` が最も下層の元の原因**です。
- `... 18 more` は、上の層と完全に同じスタックフレームを省略したという意味で、ログが切れているわけではありません。
- `~[MyPlugin-1.2.3.jar:?]` は出所のマークで、このスタックフレームがどの jar から来たかを示します。`~[?:?]` は出所不明。

:::tip 2 行だけ見る
スタックで本当に役に立つのは**最初の例外の見出し行**と**最後の `Caused by` の見出し行**です。間の数十行の `at` はほとんどがフレームワーク自身の呼び出しチェーン。この 2 行を見つけたら、次に**最初の `at` の中であなた自身のプラグインのパッケージ名**を探してください。それが問題のコードの位置であることが多いです。
:::

行番号は作者がコードを特定するためのものです：エラーが自分のプラグインなら、行番号からそのままソースを見られます。第三者のプラグインなら、行番号は「どの機能で問題が出たか」の判断にしか使えません。

なお、ログの `[MyPlugin]` プレフィックスはプラグイン自身が出力しています。**プラグイン名でログを検索する**ほうが、全体を通読するよりずっと速いです。

### 1.4 Mixin とリマップのエラーはどんな形か

Mixin は SpongePowered のバイトコード注入フレームワークで、Fabric、Forge、NeoForge、Sponge および一部のハイブリッドコアが使っています。一部のプラグインも Mixin やサーバー内部実装の直接参照でゲームロジックを「フック」します。

この類のエラーの典型形：

```text
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
Caused by: org.spongepowered.asm.mixin.throwables.MixinApplyError: Mixin [mymod.mixins.json:PlayerMixin] from mod [mymod] FAILED during APPLY
```

サーバー内部実装（NMS）を参照したときの典型形：

```text
java.lang.NoClassDefFoundError: net/minecraft/server/v1_20_R1/MinecraftServer
        at com.example.nmsplugin.NmsHook.<clinit>(NmsHook.java:17) ~[?:?]
Caused by: java.lang.ClassNotFoundException: net.minecraft.server.v1_20_R1.MinecraftServer
```

**この 2 つの特徴を押さえれば十分**です：

1. エラーに `mixin`、`MixinApplyError`、`InvalidMixinException`、`MixinTransformerError`、`mixin config` のような文字列が出る；
2. エラーに `net.minecraft.server.v1_xx_Rx`、`org.bukkit.craftbukkit...` のような**バージョン番号付き、またはサーバー内部を指す**パッケージ名が出る。

これらの名前自体が示しているのは：そのコードが**特定のバージョン、特定のローダー向け**に書かれたもので、いま動いている環境が想定と違うということです。**これはほぼ常にバージョンの不一致であり、設定の書き間違いではありません。**

:::warn この種のエラーでまず設定を疑わない
Mixin や NMS 関連のクラス名を見たら、まずバージョン（ゲームバージョン、コア／ローダーのバージョン、プラグインや MOD のバージョン）を照合してください。`config.yml` をいじらないこと。具体的なエラーの文言と対応範囲は、**該当するローダーとプラグインの公式ドキュメントを優先**します。
:::

## 2. プラグインの非互換

### 2.1 症状の対照表

| エラーや症状 | 意味 | よくある原因 |
| --- | --- | --- |
| `NoClassDefFoundError: com/example/lib/Foo` | 実行時にこのクラスが見つからない | ハード前提（`depend`）が満たされていない；プラグインが**別のサーバー**向けにコンパイルされている；そのクラスがサーバー内部実装由来 |
| `ClassNotFoundException: ...` | 同上。通常はクラスを明示的に読み込むときに見つからない | 前提の欠落；プラグインが複数 jar 構成で一部を入れていない；ダウンロードしたファイルの破損 |
| `NoSuchMethodError: 'void a.b.C.d(...)'` | クラスは見つかったが、**メソッドのシグネチャが合わない** | プラグインがコンパイル時に依存した API のバージョンが、現在のサーバーや前提と違う（プラグインがサーバーより新しい、または前提が古すぎる、が多い） |
| `AbstractMethodError` | インターフェースにメソッドが追加され、実装クラスにない | プラグインが**より古い** API 向けにコンパイルされ、現在のサーバーや前提がインターフェースを変更済み |
| `UnsupportedClassVersionError ... class file version 65.0` | プラグインが**より新しい Java** でコンパイルされている | あなたの Java がプラグインの要求より古い（65 = Java 21）。Java かプラグインのバージョンを替える |
| `MixinApplyError` / `InvalidMixinException` / `MixinTransformerError` | Mixin の注入に失敗 | プラグインが想定していない内部実装をフックしている。バージョン不一致 |
| プラグインは読み込めたが、そのコマンドがまったく反応しない | 機能が静かに無効化されている | ソフト前提（`softdepend`）が満たされていない；対応する拡張やモジュールが入っていない |
| プラグインが起動時に自分を無効化する | 作者がバージョンチェックを実装している | 現在のバージョンが対応範囲外で、プラグインが読み込みを拒否。ログに対応バージョンが書かれているのが普通 |

:::note NoClassDefFoundError は「後遺症」のことがある
ログの前のほうに `ExceptionInInitializerError` がある場合、`NoClassDefFoundError` は静的初期化の失敗の後続結果にすぎず、**本当の原因は前のログにあります**。
:::

### 2.2 修復の順序

次の順で行い、各手順で変える変数は 1 つだけにします：

1. **まず 3 つのバージョンを確認**：ゲームバージョン（1.20.4 / 1.21.x など）、サーバーソフト（Paper / Purpur / Spigot / Fabric / Forge / NeoForge）、Java のバージョン。Java とゲームバージョンの対応は [環境準備（Windows と Linux）](/tutorials/java/environment) を参照。
2. **プラグインの対応範囲を調べる**：配布ページの Supported Versions、README、jar 内の `plugin.yml` の `api-version`。
3. **前提を補う**：Vault、PlaceholderAPI、ProtocolLib、LuckPerms など最も依存されるプラグインは [よく使う前提プラグイン](/tutorials/java/plugin-deps) を参照。
4. **プラグインを更新またはダウングレード**：まずプラグインとコアのバージョンを合わせる。多くのプラグインは複数の分岐や複数の jar を維持しているので、**先に正しい分岐を落とし**、それからバージョン番号を語る。
5. **更新停止したプラグインを替える**：最後に対応したバージョンがあなたのコアより明らかに低いなら、無理せず保守されている代替を探す。
6. **二分法で特定**：上の手順をすべてやっても駄目なら、次の方法で範囲を 1 つのプラグインに絞る。

### 2.3 二分法：問題を 1 つのプラグインに絞る

```text
1. サーバーを停止し、plugins/ ディレクトリ全体をコピーしてバックアップ
2. 必要な前提と疑わしい対象だけを残し、残りはすべて plugins/ から移す
3. 起動して問題を再現してみる
   まだエラー -> 問題はこの中。さらに半分に分ける
   エラーなし -> 問題は移した側。半分を戻して繰り返す
4. 各回とも「全部移して、半分戻す」から始める。最大 log2(N) 回
5. 単一のプラグインまで絞れたら、そのプラグインの別バージョンも試す。最新版だけを試さない
```

:::tip 一度に全部を入れ替えない
「すべてのプラグインを最新版に上げる」と、変数が 1 個から N 個になります。あとで特定しようとすると最初からやり直しです。**一度に動かす変数は 1 つだけ。**
:::

### 2.4 `/plugins` の色とコンソール

Paper / Spigot 系のサーバーでは、`/plugins` が色で状態を区別します：**緑は有効、赤は読み込み失敗または無効化**。赤がいくつあるかは分かりますが、**なぜかは教えてくれません**。

理由は必ずコンソールと `logs/latest.log` に書かれています。典型的な形（例）：

```text
[12:00:02 WARN]: [MyPlugin] Could not load 'plugins/MyPlugin.jar' in folder 'plugins'
org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [Vault]. Please download and install these plugins.
        at org.bukkit.plugin.java.JavaPluginLoader.loadPlugin(JavaPluginLoader.java:155) ~[paper-api.jar:?]
        ...
[12:00:02 WARN]: [MyPlugin] Disabling MyPlugin v1.2.3
```

プラグイン名でログを検索すれば、通常は数秒で理由が見えます。前提の詳細は [よく使う前提プラグイン](/tutorials/java/plugin-deps)、プラグインの導入と読み込みの基礎は [プラグイン入門](/tutorials/java/plugins) を参照。

## 3. コアの非互換

### 3.1 API の家族：Bukkit 系は一本の線

Bukkit、Spigot、Paper、Purpur、Leaves、Leaf、Folia は同じ API ファミリーで、**層を下るほど互換**という関係です：上位向けに書いたプラグインは通常下流で動きますが、逆は成り立ちません。

| プラグインがコンパイル時に想定した API | Spigot | Paper / Purpur | Folia |
| --- | --- | --- | --- |
| Bukkit / Spigot API | 可 | 可 | プラグインが Folia 対応を宣言する必要あり |
| Paper API | 通常不可（クラスやメソッドが欠ける） | 可 | プラグインの適応が必要 |
| NMS または特定分岐専用 API | 対応バージョンのみ | 対応バージョンのみ | 通常不可 |

:::note 表の「可」は API 層の判断にすぎない
プラグインの実際の挙動が必ず正しいという意味ではありません。**プラグインがあなたのコアで動くかは、プラグインの公式説明を優先**します。
:::

Folia は特例です：ワールドを区域に切って並列 tick するため、**プラグインが `plugin.yml` で Folia 対応を明示的に宣言**する必要があり、なければ読み込みを拒否されます。具体的なフィールドと制限は Folia の公式ドキュメントを優先。

### 3.2 NMS を使うプラグインが更新のたびに壊れる理由

NMS は `net.minecraft.server`、つまりサーバーの**内部実装**を指します。Mojang はこの部分の安定性を約束したことがなく、クラス名、メソッド名、フィールド名がバージョン間で変わりえます。

- Bukkit / Paper の**公開 API** だけを使うプラグインは、マイナーバージョンをまたぐアップグレードでも通常は問題ありません。
- NMS を参照するプラグインは、**ゲームバージョンごとに作者が再適応する必要**があり、中間バージョンを飛ばすとほぼ必ず壊れます。
- Spigot 時代はリマップで内部実装を `v1_20_R1` のような**バージョン番号付き**のパッケージに入れていたため、プラグインはバージョンが変わるとクラスが見つからなくなります。
- Paper は 1.20.5 から Mojang 公式マッピングに切り替え、NMS プラグインの書き方が以前と異なります。**具体的な変更は Paper の公式告知を優先**。

エラーの特徴は揃っています：`NoClassDefFoundError`、`NoSuchMethodError`、`NoSuchFieldError` で、クラス名に `net.minecraft` か `org.bukkit.craftbukkit` が含まれます。

### 3.3 プラグイン系と MOD 系は交換できない

| あなたのサーバー | プラグインを読めるか | MOD を読めるか |
| --- | --- | --- |
| Paper / Purpur / Spigot | 可 | 不可 |
| Fabric / Forge / NeoForge | 不可（ブリッジが必要） | 可 |
| ハイブリッドコア（Arclight、Mohist、Youer など） | 通常は両方可 | 通常は両方可 |

- **Fabric / Forge / NeoForge の MOD はプラグイン系では読み込めません**；逆にプラグインを MOD 系にそのまま入れても駄目です。
- ハイブリッドコアは両方を読み込めますが、**互換性はハイブリッドコア自身が維持**しており、どちらのエコシステムでも問題が出ることがあります。ハイブリッドコアでプラグインのエラーが出たら、まずハイブリッドコアの公式ドキュメントでどのプラグインと MOD に対応しているか確認してください。
- プロキシ（Velocity、BungeeCord）は**第 3 の API** です：Bukkit プラグインは Velocity に入れられず、Velocity プラグインも Paper に入れられません。関連する説明は [プロキシ](/tutorials/java/proxy) を参照。

詳細と取捨選択は [プラグイン入門](/tutorials/java/plugins) と [サーバーコアの選択](/tutorials/java/core) を参照。

### 3.4 MOD サーバーの三者一致

MOD サーバーは 3 つを同時に合わせる必要があります：**ゲームバージョン + ローダーのバージョン + 各 MOD**。1 つでも合わないと、ローダーは起動時に起動を拒否し、問題の MOD を列挙します。

Fabric の典型的な形（例。実際の文言は Fabric 公式ドキュメントを優先）：

```text
Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Mod resolution encountered an incompatible mod set!
A potential solution has been determined:
         - Replace mod 'Sodium' (sodium) 0.5.8 with a version that supports minecraft 1.20.1
```

Forge / NeoForge の典型的な形（例）：

```text
Missing or unsupported mandatory dependencies:
        Mod ID: 'create', Requested by: 'mymod', Expected range: '[0.5.1,)', Actual version: '0.5.0'
```

MOD はメタデータで依存を宣言します：Fabric は `fabric.mod.json` の `depends`、Forge / NeoForge は `mods.toml` の `[[dependencies]]`。さらに**クライアント専用**、**サーバー専用**、**両側共通**の区別が必要です：クライアント専用の MOD をサーバーの `mods/` に入れても同じくエラーになります。

### 3.5 コアの非互換を診断する方法

1. **コンソールで最初にクラス名、パッケージ名、MOD ID に言及したエラーを読む**。後続のエラーはほとんどその連鎖反応です。
2. **`plugin.yml` の `api-version` を見る**（Paper / Spigot プラグイン）。これは**ヒント**で、作者が宣言した対象 API バージョンを示しますが、**あなたのコアで正常に動く保証はありません**。フィールドがない場合、サーバーは通常「古いプラグイン」として扱いヒントを出します。具体的な挙動はサーバーの公式ドキュメントを優先。
3. **きれいなテストサーバーで再現**：同じバージョンのコア、そのプラグインだけ（必要な前提込み）、新しいワールド。それでも同じエラーなら、プラグインとコアまたはバージョンの問題で、あなたの設定の問題ではありません。
4. **公式の対応マトリクスと照合**：プラグインの配布ページ、コアの公式ドキュメント、MOD のページの 3 か所を見る。
5. **異なる家族のものを混ぜていないか確認**：プラグインディレクトリに MOD がある、プロキシのプラグインをサブサーバーに入れた、などは意味不明なエラーを生みます。

### 3.6 アップグレードとダウングレードの戦略

- **アップグレード前にバックアップ**：少なくとも `world` 系のディレクトリ、プラグイン設定、`server.properties` を含め、**現在のすべてのプラグインと MOD のバージョン番号を記録**する。
- **前のコア jar を残す**：問題が出たらすぐ戻せる。現場で切り分けるよりずっと速い。
- **プラグインのバージョンを固定**：コアを上げたあと、すべてのプラグインを同時に最新にしない。まずコアが正常に起動することを確認し、それからまとめて少しずつ上げる。
- **先にワールドを上げない**：ワールドが高いバージョンで開かれると、古いコアに戻しても読めないことがあります。**まずコアを新バージョンで動かし、残すと決めてからワールドに触る。**
- **段階的に進める**：コア → 前提 → 前提に依存するプラグイン → その他のプラグイン。各段階で起動して検証する。
- **プロキシも同じ**：まずサブサーバーを上げ、問題がないと確認してからプロキシを上げる。

:::warn ダウングレードの前提は「アップグレード前のバックアップ」
ワールドデータが新しいバージョンで書き込まれると、古いバージョンは読み込みを拒否することがあります。**アップグレード前の完全なバックアップがないなら、アップグレードしないでください。**
:::

## 4. そのほかの頻出エラー

### 4.1 UnsupportedClassVersionError（Java のバージョン違い）

```text
java.lang.UnsupportedClassVersionError: com/example/Plugin has been compiled by a more recent
version of the Java Runtime (class file version 65.0), this version of the Java Runtime only
recognizes class file versions up to 61.0
```

括弧内の 2 つの数字は**クラスファイルのバージョン番号**で、Java のバージョン番号ではありません。対応：

| クラスファイルのバージョン | 対応する Java |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |
| 69 | Java 25 |

- **プラグインがこのエラーを出す**：プラグインのコンパイルに使われた Java があなたのランタイムより新しい。Java かプラグインのバージョンを替える。
- **サーバーコアがこのエラーを出す**：コアが要求する Java があなたのランタイムより新しい。
- どの Java を使うべきかは、ゲームバージョンから [環境準備（Windows と Linux）](/tutorials/java/environment) の対照表で調べる。**感覚で最新を入れないこと**。
- `-Xmx` を変える、設定を変える、プラグインを入れ直す、いずれも無意味です。メモリや設定の問題ではありません。

:::note Java が高すぎても問題が出る
要求より高い Java では通常このエラーは出ませんが、一部のプラグインや MOD の互換問題を引き起こすことがあります。**要件に厳密に合わせる**ことを勧めます。詳細はコアとプラグインの公式ドキュメントを優先。
:::

### 4.2 Address already in use（ポートが使用中）

```text
[12:00:00 ERROR]: **** FAILED TO BIND TO PORT!
[12:00:00 ERROR]: The exception was: java.net.BindException: Address already in use: bind
[12:00:00 ERROR]: Perhaps a server is already running on that port?
```

原因は 25565（または設定したポート）が別のプロセスに使われていることです：別のサーバーインスタンス、前回終了しきらなかったプロセス、あるいは別のプログラム。

Windows：

```powershell
netstat -ano | findstr :25565
taskkill /PID <PID> /F
```

Linux：

```bash
sudo ss -tlnp | grep 25565
kill <PID>
```

同じマシンで複数のサーバーを動かすなら、インスタンスごとに異なる `server-port` を割り当てる必要があります。ポート関連の切り分け手順は [環境準備（Windows と Linux）](/tutorials/java/environment) を参照。

### 4.3 EULA 未同意による終了

```text
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

これはクラッシュではなく、サーバーが正常に起動を拒否しているだけです。サーバーディレクトリの `eula.txt` を `eula=true` に変えて再起動すれば済みます。**これは実際に Minecraft EULA を読み同意する場合にのみ行ってください**。契約の原文は公式ページを優先します。

### 4.4 メモリ関連のエラー

| エラー | 意味 | 対処の方向 |
| --- | --- | --- |
| `java.lang.OutOfMemoryError: Java heap space` | ヒープが足りない | `-Xmx` を適度に増やす。同時に描画距離、エンティティ数、プラグインのリークを確認 |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | GC が大量の時間を使っているのにメモリを回収できない | 本質はヒープが小さいかメモリリーク。上と同じ |
| `Could not reserve enough space for object heap` | JVM の**起動段階**で失敗し、ヒープを確保できない | `-Xmx` が使用可能メモリを超えている、または 32 ビット Java。`-Xmx` を下げて 64 ビット Java に変える |
| `Error occurred during initialization of VM` | JVM の初期化失敗。通常は引数かメモリの問題 | 起動引数の `-Xms` / `-Xmx` が妥当か確認 |

- `-Xms` は初期ヒープ、`-Xmx` は最大ヒープ。同じ値にすると実行中のヒープ拡張のコストを減らせますが、**物理メモリを超えない**こと。OS と他のプロセスのために余裕を残します。
- **`-Xmx` を増やすのは万能薬ではありません**：メモリがプラグインや MOD にリークされているなら、増やすのはクラッシュの時期を後ろにずらすだけです。**spark** などのツールでメモリとフレームグラフを見てください。方法は [パフォーマンス最適化](/tutorials/java/optimize) を参照。
- メモリとプレイヤーの推奨配分は [サーバー構築のプロトコルと推奨構成](/tutorials/java/protocol) を参照。

### 4.5 セーブデータとチャンクの破損

現れ方はバージョン依存で、よくあるのはチャンク読み込み時の IO 例外です。たとえば（例。実際の文言はログ原文と公式ドキュメントを優先）：

```text
[12:00:00 ERROR]: Error loading chunk [12, 34]: java.io.IOException: Region file is corrupted
[12:00:00 ERROR]: Failed to load chunk at 12, 34
```

処理の原則：

1. **`region/` の中のファイルを手で編集しない**。直接変更すると破損範囲を広げる可能性が非常に高い。
2. **バックアップからの復元を優先**。これが最も確実です。[バックアップと復元](/tutorials/java/backup) を参照。
3. 1 つのチャンクだけ壊れていて、セーブデータ全体をロールバックしたくない場合は、**MCA Selector**、**NBTExplorer** などのサードパーティツールでそのチャンクを削除・置換できます。**代償はそのチャンク内のすべてが一緒に消えること**。
4. 同じディスクで繰り返し破損するなら、まずハードウェアとファイルシステム（ディスクの健全性、カーネルログ）を疑い、ハードウェアを直してから復旧を語る。

### 4.6 Ticking entity / Ticking block entity のクラッシュ

この類のクラッシュの見出し行は `Description: Ticking entity` または `Description: Ticking block entity`（`Ticking player` もあります）で、**あるエンティティまたはブロックエンティティが tick 時に例外を投げた**という意味です。通常はある MOD 由来か、あるチャンクのデータが破損しています。

クラッシュレポートには問題のオブジェクトの位置が書かれます（例）：

```text
Description: Ticking entity

java.lang.NullPointerException: Cannot invoke "net.minecraft.world.entity.Entity.getType()" because "entity" is null
        at com.example.mymod.TickHandler.onTick(TickHandler.java:64) ~[?:?]

-- Entity being ticked --
    Entity Type: minecraft:pig (net.minecraft.world.entity.animal.Pig)
    Entity's Exact location: 123.45, 64.00, -67.89
    Entity's Block location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; contains blocks 112,0,-80 to 127,255,-65)
```

ブロックエンティティの場合は似た形です：

```text
Description: Ticking block entity

-- Block entity being ticked --
    Name: minecraft:chest
    Block type: minecraft:chest
    Location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; ...)
```

**座標からファイルを特定する**：

- チャンク座標 = `floor(x) >> 4`、`floor(z) >> 4`。上の例では `x=123` がチャンク `7`、`z=-68` がチャンク `-5` で、レポートの `in 7,-5` と一致します。
- リージョンファイル = `r.<floor(チャンクX/32)>.<floor(チャンクZ/32)>.mca`。例のチャンク `7` と `-5` は `r.0.-1.mca` に入り、レポートの Region フィールドと一致します。

**安全な処理の順序**：

1. **サーバーを停止し、ワールドを完全にバックアップ**。この手順は省けません。
2. **MCA Selector**、**NBTExplorer** などのツールで該当のリージョンファイルを開き、**そのエンティティまたはブロックエンティティだけを削除**する。損失が最小になります。
3. 具体的なエンティティが見つからない、またはツールで扱えない場合に初めて、チャンク全体の削除を検討する。**チャンクを削除するとそのチャンク内の建築、チェスト、すべてのエンティティも一緒に消えます。**
4. 処理後にまず起動して検証し、もう落ちないことを確認してから、新しいバックアップを取る。
5. 問題が MOD のエンティティなら、第 3 節に戻って「ゲームバージョン + ローダーのバージョン + MOD のバージョン」を照合する。**バージョンの不一致が根本原因であることが多い**。

:::warn サーバーの稼働中にセーブデータのファイルを変更しない
サーバーの稼働中に `region/` のファイルを変更すると二次破損を招きます。**停止、バックアップ、それから操作。**
:::

### 4.7 Linux での権限とポートのエラー

| エラー | 原因 | 対処 |
| --- | --- | --- |
| `java.io.FileNotFoundException: ... (Permission denied)` | サーバーディレクトリの所有者が違う（以前 root で動かしたなど） | `sudo chown -R mcserver:mcserver /opt/mcserver` とし、専用ユーザーで動かす |
| `java.net.BindException: Permission denied` | 1024 未満の特権ポートを root 以外で束縛した | 1024 以上のポートに変える、または必要に応じて束縛権限を与える（リスクを理解してから） |
| プレイヤーがつながらないが、ログにエラーがない | ファイアウォールかクラウドのセキュリティグループが開放されていない | ネットワーク層の問題。[環境準備（Windows と Linux）](/tutorials/java/environment) を参照 |

**root でサーバーを直接動かさない**：サーバーやプラグインが悪用されると、攻撃者が手にするのはマシン全体です。権限とセキュリティの実践は [[JAVA] セキュリティプラグイン](/tutorials/ops/security-java) を参照。

## 5. 切り分けの流れとチェックリスト

### 5.1 この順で進む

1. **ログを読む**。まず「プラグインの例外でサーバーは生きている」のか「サーバーがもう落ちた」のかを確認し、`logs/latest.log` を見るか `crash-reports/` を見るかを決める。
2. **最初のエラーを見つける**。最初の `ERROR` か `Exception` から読み、最後の行から逆に推測しない。
3. **3 つのバージョンを照合**。ゲームバージョン、コアまたはローダーのバージョン、Java のバージョン。まず最も基本的な不一致を除外する。
4. **きれいなテストサーバーで再現**。同じバージョンのコア + 疑わしいプラグインだけ + 新しいワールドで、「あなたの設定の問題」と「プラグイン自体の問題」を分ける。
5. **二分法で特定**。2.3 の方法で範囲を 1 つのプラグインまたは MOD に絞る。
6. **修正を適用**。「前提を補う → バージョンを調整 → 代替に替える」の順で、一度に動かす変数は 1 つだけ。
7. **検証**。再起動後にそのエラーがログに出ないことを確認し、実際に関連機能を 1 回動かす。
8. **記録**。「エラー + 原因 + 対処」を自分の運用ノートに書き、次に同じエラーに出会ったときすぐ引けるようにする。

### 5.2 切り分けチェックリスト

| 手順 | 何をするか | 判断基準 |
| --- | --- | --- |
| 1 | `logs/latest.log` と最新の `crash-reports/` のファイルをコピー | 証拠が保存され、再起動で失われない |
| 2 | 例外の種類を判断 | プラグイン単位の例外か致命的クラッシュかを言える |
| 3 | 最初の例外と最後の `Caused by` を見つける | 2 つの見出し行を入手した |
| 4 | ゲームバージョン、コアのバージョン、Java のバージョンを照合 | 3 者が互いに一致している |
| 5 | プラグインの対応バージョンと前提を照合 | プラグインが現在のコアに対応し、前提が揃っている |
| 6 | きれいなテストサーバーで再現 | 安定して再現できる、またはあなたの設定と無関係だと示せる |
| 7 | 二分法で範囲を絞る | 単一のプラグインまたは MOD に特定できた |
| 8 | 修正して検証 | ログにそのエラーがなく、機能が正常 |
| 9 | 記録してバックアップ | ノートがあり、ロールバックできるバックアップがある |

### 5.3 助けを求めるときに何を出すか

グループや issue で聞く前に、これらを用意してください。情報が完全なほど、他の人が一目で問題を見抜ける可能性が上がります：

- **完全なログの断片**：最初の `ERROR` か `Exception` からその例外の終わりまで、**すべての `Caused by` を含める**。3 行だけ切り取ったり、スマホで画面を撮ったりしない。
- **クラッシュレポート**：クラッシュなら `crash-reports/` の該当ファイルを添付する。バージョンと環境の情報がすでに入っています。
- **バージョン情報**：ゲームバージョン、コア名とビルド番号、`java -version` の出力。
- **プラグインまたは MOD の一覧**：`/plugins` の出力、または `plugins/`、`mods/` ディレクトリのファイル名とバージョン番号。
- **最近何を変えたか**：コアを上げた、プラグインを入れた、どの設定を変えた。**この項目がそのまま答えになることがよくあります。**
- **再現手順**：いつ必ず落ちるか、いつ落ちないか。
- **すでに試したこと**：他の人に、すでに除外した操作を繰り返させないため。

## 関連ドキュメント

- [環境準備（Windows と Linux）](/tutorials/java/environment)：Java のバージョン対照、ポートと権限
- [プラグイン入門](/tutorials/java/plugins)：プラグインをどこに置き、どう読み込まれるか
- [よく使う前提プラグイン](/tutorials/java/plugin-deps)：Vault、PlaceholderAPI、ProtocolLib、LuckPerms
- [サーバーコアの選択](/tutorials/java/core)：各コアの位置づけと互換範囲
- [パフォーマンス最適化](/tutorials/java/optimize)：spark でメモリとラグを見る
- [[JAVA] よくある質問](/tutorials/faq/faq-java)：現象から直接引ける早見表

> エラーメッセージと設定キー名は、対応するプラグインとコアの公式ドキュメントを優先します。
