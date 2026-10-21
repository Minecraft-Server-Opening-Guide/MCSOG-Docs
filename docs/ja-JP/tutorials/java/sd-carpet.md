---
title: "[レッドストーン技術編]Carpet とそのアドオン"
slug: sd-carpet
cat: java
level: 3
order: 30
minutes: 25
mc: ["1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, レッドストーン技術, carpet, fabric, サーバー]
updated: 2026-10-08
draft: false
---

レッドストーン技術サーバーで毎日実際に付き合うのは **Carpet** です：バニラでハードコードされていた細かい挙動の多くを、**コマンドでオン／オフできるルール**に変えてくれます。本記事ではルールシステムの使い方、4 つの主要アドオンがそれぞれ何を補うか、そして**確認済みのクラッシュ防止ルール**を整理します。

## 1. Carpet とは

`Carpet` の位置づけは **Fabric サーバー MOD** で、**ルールシステム**を提供します：`/carpet <ルール名> <値>` で、バニラでハードコードされていた挙動をオン／オフします。

基本的事実：

- 対応バージョンは `1.14.4` から `26.3` まで、合計 179 のバージョンエントリ、ダウンロード数は約 1125 万；
- 公式ソース `CarpetSettings.java` には **`@Rule` アノテーション付きのルールが 91 条**あります。

つまり動かせるものが非常に多く、**「オンにできる」は「オンにすべき」ではありません**：レッドストーン技術サーバーの基本規律は、結果を理解しているルールだけをオンにすることです。

## 2. `/carpet` の使い方

ルールシステムの操作は非常に直接的です：

```
/carpet <ルール名> <値>        # ルールを 1 条変更する
```

運用上は 3 つを守ることを勧めます：

1. **1 回に 1 条だけ変える**。変えたら装置の挙動を観察してから次に進む；
2. **変えたルールを記録する**（サーバールールや運用ノートに書く）。コアを替えるとき、バージョンを上げるときに 1 条ずつ見直す；
3. **バニラの挙動を変える**ルールは、本番では既定でオフにし、シングルのテストや特定の場面だけでオンにする。

以下のルール名は Carpet の公式ソースから取り、1 条ずつ説明を付けます。

## 3. ルールの例

### 性能とエンティティ系

| ルール | 説明 |
| --- | --- |
| `optimizedTNT` | 同一位置・液体中の TNT の爆発によるラグを減らす |
| `maxEntityCollisions` | エンティティ衝突の上限をカスタム設定。0 は無制限 |
| `lagFreeSpawning` | スポーンが消費する CPU とメモリを大幅に減らす |
| `fastRedstoneDust` | レッドストーンダスト向けのラグ最適化 |
| `movableBlockEntities` | ピストンがブロックエンティティ（ホッパー、チェストなど）を押せるようにする |

### 挙動変更系（本番では既定でオフ）

| ルール | 説明 |
| --- | --- |
| `tntDoNotUpdate` | TNT を動力源の隣に置いても更新されない |
| `explosionNoBlockDamage` | 爆発がブロックを破壊しない |
| `antiCheatDisabled` | 移動が速すぎてプレイヤーが引き戻されるのを防ぐ |
| `updateSuppressionBlock` | バリアブロックの上にアクティベーターレールを置くと、レールが向きを変えるときに隣接更新スタックを埋める |
| `stackableShulkerBoxes` | 空のシュルカーボックスを地面に落としたときにスタックできる |

`updateSuppressionBlock` はアップデート抑制（コミュニティでの通称「ゲートカッティング」）の公式な制御された入口で、これと組み合わせるクラッシュ防止ルールは第 6 節を参照。

### カウントとデバッグ系

| ルール | 説明 |
| --- | --- |
| `hopperCounters` | 羊毛を指すホッパーが通過したアイテム数を数える |
| `commandTick` | `/tick` コマンドを有効にしてゲームクロックを制御する |

### 名前のみで説明なし

以下のルールは実在しますが、ここでは名前だけを挙げます。具体的な挙動は、使用しているバージョンのソースかゲーム内の `/carpet` 出力を優先してください：

`creativeNoClip`、`renewableSponges`、`persistentParrots`、`flippinCactus`、`xpNoCooldown`、`smoothClientAnimations`、`tntPrimerMomentumRemoved`、`commandPlayer`。

## 4. 4 つの主要アドオン

Carpet 本体は主なルールセットだけを担い、機能拡張はアドオンが担います。以下のリポジトリ URL、対応バージョン、バージョンエントリ数はすべて Modrinth の公式データです。

| 名前 | リポジトリ | 対応バージョン | バージョンエントリ数 | 位置づけ |
| --- | --- | --- | --- | --- |
| Carpet Extra | `gnembon/carpet-extra` | 1.14.4–26.2 | 87 | 新しいディスペンサーの挙動、新しい入手方法など |
| Carpet TIS Addition | `TISUnion/Carpet-TIS-Addition` | 1.14.4–26.3 | 141 | Fabric Carpet 拡張パック |
| Carpet AMS Addition | `Minecraft-AMS/Carpet-AMS-Addition` | 1.16.4–26.3 | 49 | 公式サイト `https://carpet.mcams.club` |
| Carpet Org Addition | `fcsailboat/Carpet-Org-Addition` | 1.19.4–26.3 | 34 | Carpet 拡張パック |

アドオンの選び方：

- **Carpet Extra** と **TIS Addition** は最も古いバージョン帯をカバーし、旧バージョンの MOD パックでよく使われる；
- **AMS Addition** と **Org Addition** は比較的新しいバージョンから始まる（1.16.4 と 1.19.4）が、どちらも 26.3 まで追随している；
- **実際に使いたいルール**がどのパックにあるかで入れればよく、全部入れる必要はない。

:::warn アドオンは Carpet のメジャーバージョンと一致しないと効かない
常識的な注意です：アドオンは Carpet 本体のインターフェースに依存するため、**ゲームバージョンが違う、Carpet のメジャーバージョンが違うと、アドオンがまったく読み込まれない、あるいは一部のルールが無効になる**ことがあります。入れる前に、そのアドオンのバージョン帯が自分のサーバーのバージョンをカバーしているか確認し、入れたらゲーム内で `/carpet` を実行してルールが本当に現れているか見てください。Carpet をアップグレードするときはアドオンも同期して上げます。詳細は各アドオンが公開しているバージョン説明を優先します。
:::

## 5. 確認済みのクラッシュ防止ルール

ワールドイーターやアップデート抑制のような遊び方は**極端なブロック更新とスタックオーバーフロー**を意図的に生み出し、サーバー側の直接の結果はクラッシュです。以下は今回確認できた、そうしたリスクを受け止めるための専用ルールです。

### Carpet TIS Addition

| ルール | 作用の方向 |
| --- | --- |
| `yeetUpdateSuppressionCrash` | アップデート抑制に起因するクラッシュを処理する |
| `updateSuppressionSimulator` | アップデート抑制のシミュレーション |
| `deobfuscateCrashReportStackTrace` | クラッシュレポートのコールスタックを難読化解除し、クラッシュログを読めるようにする |

### Carpet AMS Addition

| ルール | 選択できる値 |
| --- | --- |
| `amsUpdateSuppressionCrashFix` | `false` / `true` / `silence` |
| `customBlockUpdateSuppressor` | `none` / `minecraft:bone_block` / `minecraft:diamond_ore` / `minecraft:magma_block` |

`customBlockUpdateSuppressor` の役割は、指定したブロックを**アップデート抑制ブロック**に変えることです —— つまり「隣接更新スタックを埋める」役をどのブロックに担わせるかを自分で選べ、本体の `updateSuppressionBlock` しか使えないわけではありません。

なお：Carpet Org Addition には**抑制やクラッシュに関するルールは確認できなかった**ため、ここではそのルール名を挙げません。

## 6. ワールドイーターとゲートカッティングとの連携

- **「ゲートカッティング」はコミュニティが「アップデート抑制（update suppression）」系の操作を指す通称**で、ゲーム内の正式名称ではありません；
- 公式 Carpet が提供する制御された入口は `updateSuppressionBlock`、AMS の `customBlockUpdateSuppressor` は別のブロックに差し替えられるようにするものです；
- クラッシュのリスクは TIS の `yeetUpdateSuppressionCrash`、`updateSuppressionSimulator`、`deobfuscateCrashReportStackTrace` と AMS の `amsUpdateSuppressionCrashFix` が受け止めます；
- この 3 層は「**入口が制御できる + パラメータを差し替えられる + クラッシュを受け止められる**」関係で、どれが欠けてもトラブル対応が難しくなります。

装置をどう動かし、リスクをどう抑えるかの具体は第 7 篇 [ワールドイーターとゲートカッティング](/tutorials/java/sd-machine) を参照。そこの結論は：装置が強力なほど「バックアップ + 権限 + クラッシュ防止ルール」の三点セットが必要で、**クラッシュ防止ルールはまさに本節の数条**です。

## 7. 本記事の 3 つの一線

```
1. ルールは結果を理解しているものだけオンにする —— 変えたら毎回記録する
2. アドオンはメジャーバージョンと一致させる —— 入れたら /carpet でルールが本当にあるか確認する
3. クラッシュ防止ルールを先にオンにする —— ワールドイーターとアップデート抑制の前に、クラッシュを受け止める
```

## 次のステップ

ルールをオンにしたら、装置が動き出す前にリスク管理を読んでください：[ワールドイーターとゲートカッティング](/tutorials/java/sd-machine) を参照。全員が同じ投影を使えるようにしたいなら [共有スケマティック](/tutorials/java/sd-schematic)；性能の勘定に戻るなら [最適化 MOD](/tutorials/java/sd-optimize)、コアがなぜ Fabric でなければならないかは [サーバーコアの選択](/tutorials/java/sd-server) を参照。

---

> 本記事のルール名は Carpet の公式ソース、アドオンのリポジトリ URL・対応バージョン・バージョンエントリ数は Modrinth の公式データによります。ルールが存在するか、挙動がどうかは、使用しているバージョンのゲーム内 `/carpet` 出力を優先してください。
