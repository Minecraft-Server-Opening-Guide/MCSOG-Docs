---
title: プラグインとデータパック開発入門
slug: develop
cat: java
level: 3
order: 28
minutes: 19
tags: [java, プラグイン開発, データパック, paper, ビルドツール, api, テスト]
updated: 2026-10-04
draft: false
---

ここまでの記事は「他人のものを使う」話でした：プラグインを入れる、データパックを入れる、サーバーを設定する。本記事は**自分で書く**話です。

読者として 2 種類を想定します：サーバーに独自レシピや独自コマンドを 1 つ足したい運営者と、Bukkit / Paper のプラグイン開発をゼロから学びたいプレイヤー。目標は完成品を書けるようにすることではなく、**どんな道があるか、それぞれ何を用意するか、最初に動かせる最小の骨組みがどんな形か**を知ることです。

全篇を貫く原則が 1 つあります：**クラス名、メソッド名、パッケージ形式、ディレクトリ名はすべてバージョンで変わります。公式ドキュメントは常に、本記事を含むどのチュートリアルよりも優先されます。** 本記事は具体的な API 名やフォーマット番号を捏造しません。

## 1. まず道具を選ぶ：データパック / プラグイン / MOD

3 つの道は位置づけがまったく違います。まず比較表を見てください。

| 観点 | データパック（datapack） | プラグイン（plugin） | MOD（mod） |
| --- | --- | --- | --- |
| コードを書く必要 | 不要（JSON + mcfunction） | Java が必要 | Java が必要 |
| ビルドツール | 不要 | Maven か Gradle | ローダーのツールチェーン |
| バニラサーバーで動くか | 動く | 動かない | 動かない |
| Paper 系で動くか | 動く | 動く | 動かない（ブリッジが必要） |
| 何を変えられるか | ゲームがすでにデータとして公開しているもの：レシピ、ルートテーブル、進捗、関数、タグ、一部のワールド生成データ | API が公開しているすべて：コマンド、イベント、エンティティ、ブロック、GUI、ネットワーク | ゲームのコード自体：新しいブロック、新しいモブ、新しいディメンション |
| テスト方法 | `/reload` + `/datapack list` | サーバーを再起動 | クライアントとサーバーを再起動 |
| バージョンアップのコスト | 低い（フォーマット番号とディレクトリ名を変える） | 中（API は概ね安定だが、内部クラスを直接使うと壊れる） | 高い（ローダーと全 MOD の更新を待つ） |
| 典型的な用途 | ルール変更、レシピ追加、コマンド追加、軽量なロジック | 経済、領地、メニュー、クロスサーバー、本格的な遊びのシステム | コンテンツ追加、大型 MOD パック |

選ぶ順序の目安は：**データパックで解決できるならデータパック、データパックで無理ならプラグイン、ゲーム自体を変える必要があるなら MOD。** 判断基準：

- 変えたいものが**すでにデータとして公開されている**（レシピ、ドロップ、進捗、関数、タグ）→ データパック。
- やりたいことが**イベントの購読やプレイヤーとの対話を必要とする**（独自コマンド、GUI、経済、権限）→ プラグイン。
- 足したいものが**ゲームに元から存在しない**（新しいブロック、新しいモブ）→ MOD。

## 2. データパックの道

データパックは 3 つの道で最も敷居が低いです：**ビルドツールも依存も不要で、コンパイルもいらない**。JSON とテキストファイルをいくつか書けば動きます。

### 2.1 ディレクトリ構造

サーバーのデータパックは**セーブデータディレクトリ**の下の `datapacks/` に置きます。セーブデータのディレクトリ名は `server.properties` の `level-name` で決まり（既定は `world`）：

```text
world/
  datapacks/
    my_pack/
      pack.mcmeta
      data/
        my_pack/
          function/
            tick.mcfunction
            hello.mcfunction
          advancement/
          loot_table/
          tags/
            function/
              tick.json
              load.json
```

名前空間のディレクトリ名（上の `my_pack`）が、内容を参照するときのプレフィックスになります。たとえば `my_pack:hello`。**名前空間は小文字、数字、アンダースコアだけにすることを勧めます。**

データパックは `.zip` でも構いませんが、**zip の中に直接 `pack.mcmeta` がなければなりません**。フォルダを 1 層余計に包んではいけません。フォルダを右クリックで圧縮すると 1 層余計になりがちです。

### 2.2 `pack.mcmeta` と `pack_format`

```json
{
  "pack": {
    "pack_format": 0,
    "description": "My first datapack"
  }
}
```

`pack_format` について覚えるべき規則は 1 つだけです：

:::warn どのチュートリアルのフォーマット番号もそのまま真似しない
`pack_format` の数値は**ゲームのバージョンごとに変わります**。データパックとリソースパックで番号体系が別です。間違えると「フォーマットが非互換」と表示され、パックは読み込まれません。

**対応バージョンの公式 wiki のフォーマット表を調べてください**。本記事を含むどのチュートリアルの数字も真似しないこと。上の例の `0` はプレースホルダーで、有効な値ではありません。

また `pack.mcmeta` のフィールド自体も進化しています：比較的新しいバージョンでは対応フォーマットの範囲を宣言できます（`supported_formats` のようなフィールド）。フィールドの集合はバージョンで変わるため、公式 wiki の `pack.mcmeta` のページを優先してください。
:::

### 2.3 ディレクトリ名の単数・複数はバージョンで変わる

これは初心者が最もつまずき、チュートリアルで最も触れられない落とし穴です：

| 内容の種類 | 古いバージョン（1.20.x 以前） | 1.21 から |
| --- | --- | --- |
| 関数 | `data/<ns>/functions/` | `data/<ns>/function/` |
| 進捗 | `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| ルートテーブル | `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| レシピ | `data/<ns>/recipes/` | `data/<ns>/recipe/` |
| 述語 | `data/<ns>/predicates/` | `data/<ns>/predicate/` |
| 関数タグ | `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

つまり**1.21 からこれらのディレクトリは単数形に変わりました**。複数形で書くと古いバージョンでは正しく、新しいバージョンでは「内容が反映されず、しかも目立ったエラーも出ない」状態になります。対応バージョンの公式 wiki を優先してください。

### 2.4 関数（`.mcfunction`）

- 関数は**1 行 1 コマンド**のテキストファイルで、**先頭に `/` は書きません**。`#` で始まる行はコメントです。
- 関数はコマンドから呼べます：`/function my_pack:hello`。
- 比較的新しいバージョンは**関数マクロ**に対応します：`$(名前)` でプレースホルダーを置き、`function <関数> with <データソース>` で引数を渡します。マクロはバージョン依存の機能なので、使う前に自分のバージョンが対応しているか確認してください。

```text
# 16 ブロック以内のプレイヤーに軽い視覚効果を出す
# 注意：必ずフィルタ条件を付け、フィルタなしで全エンティティを走査しないこと
execute as @a[distance=..16] at @s run particle minecraft:flame ~ ~1 ~ 0 0 0 0 1
```

### 2.5 タグ（tags）

タグは内容をゲームのフックに「引っかける」ために使います。最もよく使う 2 つの関数タグ：

```json
{
  "values": [
    "my_pack:tick"
  ]
}
```

`data/minecraft/tags/function/tick.json`（1.21 より前は `functions/`）に置くと、中の関数は**毎ゲーム tick 実行**されます。`load.json` に置くと、**読み込み時と `/reload` 時に 1 回実行**されます。これは「データパックに継続的に仕事をさせる」標準的なやり方で、性能問題の最もよくある発生源でもあります。

### 2.6 進捗とルートテーブル

進捗（advancement）は「独自トリガー」として使われることが多いです：自然には達成できない条件を作り、関数から手動で付与し、`rewards.function` で呼ぶ関数を指定します。ルートテーブル（loot table）はブロック、モブ、チェストのドロップを制御します：

```json
{
  "type": "minecraft:generic",
  "pools": [
    {
      "rolls": 1,
      "entries": [
        { "type": "minecraft:item", "name": "minecraft:diamond" }
      ]
    }
  ]
}
```

使用できる `type`、条件、関数名の具体は公式 wiki の該当ページを優先してください。それらは**バージョンごとに追加・調整されます**。

### 2.7 テスト：`/reload` と `/datapack list`

```bash
/datapack list
/datapack enable "file/my_pack"
/reload
/function my_pack:hello
```

要点：

- `/datapack list` は「パックが認識されているか」の第一診断コマンド；
- `/reload` が再読み込みするのは**有効なデータパックのデータ**（関数、タグ、進捗、ルートテーブル、レシピなど）であり、**再起動ではありません**；
- ワールド生成、ディメンションタイプ、一部のレジストリ内容は**サーバーの再起動**が必要；
- 大きなサーバーでは `/reload` 自体にコストがあるので、ホットアップデートのボタンのように頻繁に使わないこと；
- パックの形式、置き場所、切り分けの詳細は [リソースパックとデータパック](/tutorials/ops/packs) を参照。

### 2.8 性能警告：tick に載せた関数は「毎 tick のコスト」

:::warn 毎 tick 実行 = 毎秒 20 回
関数を `tick` タグに載せることは、**毎秒 20 回実行させる**ことと同じです。中にコマンドが 1 つ増え、フィルタなしのエンティティ走査が 1 回増えるたびに、コストは 20 倍になります。

よくある性能上の誤り：

- `execute as @e` にセレクタのフィルタを付けず、全サーバーのエンティティを走査する；
- 毎 tick 関数の中で大量のブロック照会や `data get` を行う；
- イベントやタグで代替できる「ポーリング式」のロジックを関数で書く。

`/spark` などのツールで関数によるラグを特定できます。**まず正しく書いてから最適化する**：`load` に置けるものは `tick` に置かず、フィルタ条件を付けられるものは省かないこと。
:::

コマンドの規模に関わるゲームルールも 2 つ知っておく価値があります：コマンドチェーン／再帰の長さを制限する `maxCommandChainLength` と、1 つのコマンドが変更できるブロック数を制限する `commandModificationBlockLimit`。どちらも既定値はバージョンで変わるので、大きな関数を書く前に調べてください。

## 3. プラグインの道

プラグインはデータパックよりはるかに強力ですが、代償として **JDK、ビルドツール、テスト用サーバー**が必要です。

### 3.1 何を用意するか

| 必要なもの | 説明 |
| --- | --- |
| JDK | バージョンはサーバーが要求する Java のバージョンと一致させる |
| ビルドツール | Maven か Gradle のどちらかでよい |
| 対象プラットフォームの API | Paper 系なら Paper API。コンパイル時に使い、**jar には含めない** |
| テスト用サーバー | 独立したディレクトリ、独立したポート、独立したワールドのコピー |

Java のバージョン要件は**ゲームのバージョンで変わり**、コアの分岐によっても異なることがあります。おおよその対応（**Paper の公式ドキュメントを優先し、そのまま真似しないこと**）：

| Minecraft のバージョン | 必要な Java |
| --- | --- |
| 1.16.5 以前 | Java 8 |
| 1.17.x | Java 16 |
| 1.18.x - 1.20.4 | Java 17 |
| 1.20.5 以降 | Java 21 |

サーバーの Java バージョンと、コンパイル時の `release` バージョンは**必ず一致**させてください。そうしないと `UnsupportedClassVersionError` のような起動失敗が起きます。

### 3.2 Maven：`pom.xml`

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>myplugin</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <repositories>
    <repository>
      <id>papermc</id>
      <url>https://repo.papermc.io/repository/maven-public/</url>
    </repository>
  </repositories>
  <dependencies>
    <dependency>
      <groupId>io.papermc.paper</groupId>
      <artifactId>paper-api</artifactId>
      <version>PUT-THE-VERSION-HERE</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

3 つの要点：

- `<scope>provided</scope>` は「このライブラリはサーバーが提供するので、自分の jar には入れない」という意味です。**この行は必ず書いてください**。そうしないと API 全体をプラグインに詰め込むことになります。
- `<version>` の書き方は `<Minecraft バージョン>-R0.1-SNAPSHOT` のような形で、**具体値はバージョンで変わります**。公式ドキュメントかリポジトリで現在の値を調べ、そのまま真似しないでください。
- 第三者のライブラリを使わないなら**shade プラグインを導入しない**。他人のライブラリを同梱すると衝突を招き、ライセンスの問題にも触れやすくなります。

### 3.3 Gradle：`build.gradle`

```groovy
plugins {
    id 'java'
}
group = 'com.example'
version = '1.0.0'
repositories {
    mavenCentral()
    maven {
        name = 'papermc'
        url = 'https://repo.papermc.io/repository/maven-public/'
    }
}
dependencies {
    compileOnly 'io.papermc.paper:paper-api:PUT-THE-VERSION-HERE'
}
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}
```

`compileOnly` は Gradle における `provided` です：**コンパイル時には見え、パッケージには含まれない**。ビルド成果物は `build/libs/` にできます。

### 3.4 `plugin.yml` と `api-version`

```yaml
name: MyPlugin
version: 1.0.0
main: com.example.myplugin.MyPlugin
api-version: '1.21'
author: YourName
description: An example plugin.
commands:
  hello:
    description: Says hello.
    usage: /hello
    permission: myplugin.hello
permissions:
  myplugin.hello:
    description: Allows the use of /hello
    default: op
```

| フィールド | 役割 |
| --- | --- |
| `name` | プラグイン名。ログのプレフィックスとデータフォルダ名に使われる。空白を入れない |
| `main` | メインクラスの**完全修飾クラス名**（パッケージ名を含む）。そのクラスは `JavaPlugin` を継承している必要がある |
| `version` | プラグインのバージョン。ログと `/plugins` に出る |
| `api-version` | プラグインがどの API バージョン向けに書かれたかを宣言する |

**`api-version` がなぜ重要か**：サーバーはこれに基づいてプラグインをどのモードで読み込むかを決めます。公式ドキュメントの説明は —— **サーバーのバージョンがプラグインの宣言した API バージョンより低いと読み込みを拒否する**；そして**このフィールドを書かないと、プラグインは旧式（legacy）の方法で読み込まれ警告が出る**。一部の互換性変換の挙動にも影響するため、新しいプラグインは明示的に書くべきです。

これは**バージョンの保証ではありませ**ん：`api-version` を書いても、目標バージョンを宣言しただけで、新しいバージョンでコードが必ず正常に動くわけではありません。比較的新しい Paper は別のマニフェストファイル（`paper-plugin.yml`）と異なるプラグイン読み込みモデルにも対応しており、具体的な書き方は該当バージョンの公式ドキュメントを優先します。

### 3.5 ライフサイクル：`onEnable` と `onDisable`

```text
package com.example.myplugin;

import org.bukkit.plugin.java.JavaPlugin;

public final class MyPlugin extends JavaPlugin {
    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(new PlayerJoinListener(this), this);
        getLogger().info("MyPlugin enabled.");
    }
    @Override
    public void onDisable() {
        getLogger().info("MyPlugin disabled.");
    }
}
```

- `onEnable()` はプラグインが有効化されるときに呼ばれます。サーバー起動時なら、サーバー自身の初期化のあと、プレイヤーが入れるようになる前に起きます。
- **`onEnable()` の中で時間のかかるブロッキング処理をしない**（ファイルのダウンロード、遠隔サービスへの接続、ワールド全体の走査）。サーバーの起動を直接遅くします。
- `onDisable()` では設定を保存し、自分がスケジュールしたタスクをキャンセルし、開いたリソースを閉じるべきです。
- サーバーはプラグインを無効化するとき、**リスナーを自動で解除し、そのプラグインがスケジュールしたタスクをキャンセルします**が、データの保存や、開いたファイル・接続のクローズは**代わりにやってくれません**。

### 3.6 コマンドとリスナーの登録

コマンド実行部：

```text
package com.example.myplugin;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;

public final class HelloCommand implements CommandExecutor {
    private final MyPlugin plugin;
    public HelloCommand(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        sender.sendMessage("Hello, " + sender.getName() + "!");
        return true;
    }
}
```

- 戻り値は「このコマンドが正しく処理されたか」を表します。`false` を返すとサーバーはそのコマンドの `usage` を出力します。
- `args.length` の確認を忘れないこと。そうしないとプレイヤーが引数を 1 つ少なく打っただけで配列外参照が投げられます。
- 補完が必要なら `TabCompleter` を実装し、`setTabCompleter(...)` で登録します。

イベントリスナー：

```text
package com.example.myplugin;

import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public final class PlayerJoinListener implements Listener {
    private final MyPlugin plugin;
    public PlayerJoinListener(MyPlugin plugin) {
        this.plugin = plugin;
    }
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        player.sendMessage("Welcome to the server!");
    }
}
```

リスナーの登録には**必ず** `registerEvents(listener, plugin)` を呼ぶ必要があり、`Listener` を実装するだけでは足りません。`onEnable()` でコマンドをバインドするときは null チェックを忘れずに：

```text
if (getCommand("hello") == null) {
    getLogger().severe("Command 'hello' is missing from plugin.yml!");
    return;
}
getCommand("hello").setExecutor(new HelloCommand(this));
```

**`getCommand()` はコマンドが `plugin.yml` に書かれていないと `null` を返します**。そのまま `setExecutor` を呼ぶと起動即クラッシュです。これが初心者に最も多い最初のクラッシュです。比較的新しい Paper は Brigadier ベースのコマンド登録（ライフサイクルイベント経由の登録）を提供し、複雑なコマンドに向いています。プラットフォーム固有の API で書き方はバージョンで変わるため、公式ドキュメントを優先してください。

### 3.7 ログ：`getLogger()` を使う

```text
getLogger().info("Loaded " + count + " entries.");
getLogger().warning("Config value is missing, using the default.");
getLogger().log(java.util.logging.Level.WARNING, "Failed to save data", exception);
```

- `getLogger()` はプラグイン名をプレフィックスにしたロガーを返し、ログはサーバーのコンソールとログファイルに入ります。
- **例外を握りつぶさない**：捕捉したら少なくとも `log` に出し、例外オブジェクトも添えてください。そうしないと切り分け時に「エラーが出た」しか残りません。
- `System.out.println` を使わない：ログシステムを迂回し、プラグイン名とレベルを失い、ログツールでフィルタもできません。比較的新しい Paper は SLF4J 形式のロガーも提供しており、書き方は公式ドキュメントを優先します。

### 3.8 ビルドとデプロイ

```bash
mvn -q package          # Maven。成果物は target/
gradle build            # Gradle。成果物は build/libs/
```

デプロイ手順：

```bash
stop                                              # テストサーバーのコンソールで実行
cp target/myplugin-1.0.0.jar /path/to/testserver/plugins/
java -Xms2G -Xmx2G -jar paper.jar --nogui         # 再起動後、onEnable のログと /plugins の状態を見る
```

2 点注意：

- shade 系のプラグインを使った場合、`original-` で始まる jar は**デプロイするファイルではありません**。
- **`/reload` でプラグインをホットアップデートしない。** プラグインのホットリロードはサポートされた使い方ではなく、状態が残留し、クラスローダーが漏れ、最終的にさまざまな不可解な問題として現れます。開発段階ではテストサーバーをそのまま再起動してください。

## 4. API をどこで学ぶか

これが本記事で最も強調したい節です：**記憶でメソッド名を書かない。**

| リソース | 用途 |
| --- | --- |
| 公式 Paper ドキュメントサイト | 入門チュートリアル、イベントとコマンドの推奨の書き方、プラットフォーム機能の説明 |
| 公式 Paper Javadoc | **メソッド名とクラス名の唯一の権威**。目標バージョンごとに参照できる |
| Bukkit / Spigot の Javadoc | 基礎 API の参考。Paper の API の大部分はこれと互換 |
| 使用コアの公式リポジトリとドキュメント | ある挙動が Paper 固有か Bukkit 共通かを確認する |

具体的なやり方：

1. まず**どの Minecraft バージョン向けに開発するか**を決め、Javadoc でそのバージョンを選ぶ。
2. ある機能を使いたいとき、**まず Javadoc でそのクラスを探し**、メソッドのシグネチャを確認してからコードを書く。
3. **クラス名、イベント名、列挙値はすべてバージョンで変わります**。ブログや古いチュートリアルの書き方はすでに無効なことがよくあります。
4. **API と内部実装を区別する**：`org.bukkit.*`、`io.papermc.paper.*` は互換性の約束がある API です。サーバーの内部クラス（しばしば NMS と呼ばれる）は**互換性の保証が一切なく**、使うことはプラグインを特定のバージョンに縛り付けることと同じです。
5. 「メソッドが存在しない」というコンパイルエラーに遭ったら、まずバージョン違いを疑い、コンパイルが通る代替の書き方を検索しないこと。

## 5. テストの規律

プラグイン開発で最も起きやすい事故は、書けないことではなく、**本番サーバーで試すこと**です。

| 規律 | 説明 |
| --- | --- |
| 独立したテストサーバーを使う | 独立したディレクトリ、独立したポート、ワールドはコピー。**本番サーバーを実験場にしない** |
| 環境を揃える | テストサーバーの**コアのバージョン、ビルド番号、Java のバージョン**を本番と一致させる。そうしないと同じ環境をテストしていないことになる |
| まずワールドをバックアップ | プラグインはデータを変える。問題が出たときバックアップが唯一の退路。[バックアップと復元](/tutorials/java/backup) を参照 |
| 1 回に 1 つだけ変える | プラグイン、設定、コアのバージョンを同時に変えると、問題が出ても特定できない |
| コンソールのスタックを読む | クラッシュ時は**最初の行 + `Caused by` の連鎖 + 自分のパッケージ名の行**を見る。方法は [Java 版のよくあるエラーとクラッシュの切り分け](/tutorials/faq/errors) |
| 一般プレイヤーのアカウントで 1 回試す | 権限関連のバグは非 OP アカウントでしか見つからない |
| 公開前に段階的に | まず小規模サーバーか閑散時間に有効化し、TPS とログを観察 |

## 6. セキュリティの注意

**プラグインはサンドボックスではありません。** プラグインはサーバーと同じ JVM で動き、サーバーのすべての権限を持ちます：ファイルの読み書き、ネットワーク接続の開始、OS コマンドの実行、メモリ上のデータへのアクセス。プラットフォームはそれを制限しません。

そこから 3 つの結論が出ます：

- **他人のプラグインのバックドアは、あなたのマシンのバックドアです。** プラグインは公式の配布チャネルからのみ入手し、二次パッケージ、改名、難読化された版に注意してください。
- **データパックも同じです。** 関数はコマンドにできることなら何でもできます：アイテムの付与、プレイヤーのテレポート、コンテナの空化、プレイヤーを奈落へ落とすこと。信頼できる出所のパックだけを入れてください。
- **自分のプラグインでもプレイヤーの入力を信頼しない。** コマンド引数を検証し、プレイヤーが提供した文字列をそのままファイルパスに連結せず、設定の文字列をコードとして実行せず、プレイヤーへ送るテキストのエスケープに注意してください。

プラグインの導入、監査、安全対策の流れは [プラグイン管理と安全対策](/tutorials/java/plugin-manage) を参照。

## 7. まとめ

- **まず道具を選ぶ**：データパック → プラグイン → MOD。簡単なもので済むなら複雑なものを使わない。
- データパックは**敷居が最も低い**：`pack.mcmeta` のフォーマット番号は必ず公式の表で調べ、ディレクトリ名の単数・複数はバージョンで変わる。
- プラグインには **JDK + ビルドツール + テストサーバー**が必要。コンパイル時は `provided` / `compileOnly` で API を参照し、**API をパッケージしない**。
- `plugin.yml` の **`api-version` が読み込みモードを決め**、書かないと旧式プラグインとして扱われ警告が出る。コマンドは必ず `plugin.yml` に書き、そうしないと `getCommand()` は `null` を返す。
- **`onEnable` で時間のかかる処理をしない**。`onDisable` で状態を保存しリソースを解放する。
- **メソッド名は公式 Javadoc を優先**。クラス名とイベント名はバージョンで変わる。
- **開発は常にテストサーバーで**。1 回に 1 つだけ変え、クラッシュしたらまずスタックを読む。
- **プラグインはサーバーの全権限を持つ**。出所不明のプラグインは出所不明のバックドア。

:::tip 最速の学び方：既存のオープンソースプラグインを読む
ゼロから「どのメソッドを呼ぶべきか」と考えるのは最も遅い道です。より速いのは：**機能が自分の目標に近いオープンソースプラグイン**を見つけ、その `plugin.yml`、メインクラス、コマンドクラス 1 つ、リスナークラス 1 つを読み、最小の骨組みを写して目的の機能に変えること。30 分でチュートリアル 10 本より多くを学べます。

読むときは 3 つの問いを持って：**どのライフサイクル段階で何を登録したか、プレイヤーの入力をどう扱うか、データをどこに保存するか。** この 3 点が分かれば、プラグイン開発の扉は開きます。
:::

関連する読み物：[リソースパックとデータパック](/tutorials/ops/packs)（パックの形式と置き場所）、[プラグインの基礎](/tutorials/java/plugins)（導入と読み込み）、[プラグイン管理と安全対策](/tutorials/java/plugin-manage)、[Java 版のよくあるエラーとクラッシュの切り分け](/tutorials/faq/errors)、[バックアップと復元](/tutorials/java/backup)。

> ゲームの仕組み、API、パック形式のバージョンは対応する公式ドキュメントを優先します。
