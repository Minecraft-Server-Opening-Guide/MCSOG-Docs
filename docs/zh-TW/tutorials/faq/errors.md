---
title: Java 版常見報錯與崩潰排查
slug: errors
cat: faq
level: 2
order: 3
minutes: 18
tags: [java, errors, crash, troubleshooting, plugins, logs, compatibility]
updated: 2026-10-04
draft: false
---

這一篇講的是**報錯怎麼讀、不相容怎麼定位**。它不打算窮舉所有異常，而是給你一套判斷順序：先分清「插件拋了個異常但服務端還活著」和「服務端直接崩了」，再順著堆疊找到根因，最後用最小化測試確認。

不相容是 Java 版服務端裡最費時間的一類故障，因為它經常**不給明確提示**，或者給出的類名和真正的原因毫無關係。凡是本文沒有把握的地方，都會寫「以官方文件為準」，而不是編一個看起來合理的解釋。

## 1. 怎麼讀一份報錯

### 1.1 日誌都在哪

| 位置 | 內容 | 什麼時候看 |
| --- | --- | --- |
| `logs/latest.log` | 當前或最近一次執行的完整控制台輸出 | **第一現場**。服務端每次重啟會覆蓋它，要留證據先複製走 |
| `logs/2026-10-04-1.log.gz` | 歷史日誌，按天與大小輪轉並壓縮 | 問題發生在幾天前、`latest.log` 已經被覆蓋時 |
| `crash-reports/crash-...-server.txt` | 崩潰報告：完整堆疊、描述、當時的執行環境 | 服務端**非正常退出**時優先看這裡 |
| 控制台視窗本身 | 即時輸出，滾動很快 | 邊跑邊看；崩潰前的內容很容易被沖掉，先複製 |

目錄結構與各檔案作用見 [服務端結構](/tutorials/java/structure)。

:::tip 先複製，再重啟
`logs/latest.log` 會在下一次啟動時被覆蓋。**在重啟服務端之前**，把 `logs/latest.log` 和 `crash-reports/` 裡最新的那份複製到別處，否則你要排查的證據就沒了。
:::

按關鍵字快速定位（Linux）：

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

Windows PowerShell：

```powershell
Select-String -Path logs\latest.log -Pattern "ERROR|Exception|Caused by" | Select-Object -Last 40
Get-ChildItem crash-reports | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 1.2 插件異常與致命崩潰的區別

這兩者要分開處理，否則很容易在一堆無關的紅字裡迷路。

| | 插件異常（多數情況） | 致命崩潰 |
| --- | --- | --- |
| 服務端狀態 | 繼續執行，玩家還線上 | 行程退出，視窗關閉或 systemd 服務停止 |
| 日誌結尾 | 異常之後還有正常的 tick 輸出 | 結尾是 `This crash report has been saved to: ...` |
| 典型標記 | `Could not pass event ... to X`、`... has failed to load`、`... was disabled` | `Encountered an unexpected exception`、`Exception in server tick loop`、`Watching Server thread` |
| 影響範圍 | 一個插件或一個功能 | 整個服務端 |
| 處理方向 | 修插件、更新插件或先停用它 | 先讓服務端起來，再讀崩潰報告 |

下面是一段**示意**（用於說明結構，不是某次真實日誌）的插件異常，服務端會繼續跑：

```text
[12:00:01 ERROR]: Could not pass event PlayerJoinEvent to MyPlugin v1.2.3
java.lang.NullPointerException: Cannot invoke "java.lang.String.toLowerCase()" because "name" is null
        at com.example.myplugin.JoinListener.onJoin(JoinListener.java:42) ~[MyPlugin-1.2.3.jar:?]
        at org.bukkit.plugin.java.JavaPluginLoader$1.execute(JavaPluginLoader.java:315) ~[paper-api.jar:?]
        at org.bukkit.plugin.RegisteredListener.callEvent(RegisteredListener.java:70) ~[paper-api.jar:?]
        ... 20 more
[12:00:02 INFO]: Player Steve joined the game
```

關鍵點是最後一行：**異常之後服務端照常處理了下一個事件**，說明它是被框架捕獲的插件級錯誤。

### 1.3 Java 堆疊怎麼讀

一段帶 `Caused by` 鏈的**示意**堆疊：

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

逐行拆開看：

- `[12:00:05 ERROR]:` 是日誌字首（時間與級別），不是報錯內容本身。
- `java.lang.RuntimeException: Failed to load plugin data` 是**最外層異常**。它常常只是包裝，真正的資訊在下面。
- `at 包名.类名.方法名(文件名.java:行号)` 是呼叫鏈。**最上面那一行是異常丟擲的位置，越往下越接近呼叫它的上層框架**。
- `Caused by:` 才是根因鏈，可能有多層。**最後一層 `Caused by` 是最底層的原始原因**。
- `... 18 more` 表示省略了與上一層完全相同的棧幀，不是日誌被截斷。
- `~[MyPlugin-1.2.3.jar:?]` 是來源標記，說明這個棧幀來自哪個 jar；`~[?:?]` 表示來源未知。

:::tip 只看兩行
一份堆疊裡真正有用的是**第一個異常的標題行**和**最後一個 `Caused by` 的標題行**。中間幾十行 `at` 絕大多數是框架自己的呼叫鏈。找到這兩行之後，再回頭找**第一個 `at` 裡出現的、屬於你自己插件的包名**，那通常就是出問題的程式碼位置。
:::

行號是給作者定位程式碼用的：如果出錯的是你自己的插件，行號可以直接對著原始碼看；如果是第三方插件，行號只能幫你判斷「是哪個功能出的問題」，沒有更多用處。

另外，日誌裡的 `[MyPlugin]` 字首是插件自己列印的。**用插件名去搜日誌**，比通讀整份日誌快得多。

### 1.4 Mixin 與重對映錯誤長什麼樣

Mixin 是 SpongePowered 的位元組碼注入框架，Fabric、Forge、NeoForge、Sponge 以及部分混合端都用它；一些插件也會通過 Mixin 或直接引用服務端內部實現來「hook」遊戲邏輯。

這類錯誤的典型形態：

```text
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
Caused by: org.spongepowered.asm.mixin.throwables.MixinApplyError: Mixin [mymod.mixins.json:PlayerMixin] from mod [mymod] FAILED during APPLY
```

引用服務端內部實現（NMS）時的典型形態：

```text
java.lang.NoClassDefFoundError: net/minecraft/server/v1_20_R1/MinecraftServer
        at com.example.nmsplugin.NmsHook.<clinit>(NmsHook.java:17) ~[?:?]
Caused by: java.lang.ClassNotFoundException: net.minecraft.server.v1_20_R1.MinecraftServer
```

**認這兩個特徵就夠了**：

1. 報錯裡出現 `mixin`、`MixinApplyError`、`InvalidMixinException`、`MixinTransformerError`、`mixin config` 之類的字樣；
2. 報錯裡出現 `net.minecraft.server.v1_xx_Rx`、`org.bukkit.craftbukkit...` 這類**帶版本號或指向服務端內部**的包名。

這些名字本身就說明：這段程式碼是**針對某個具體版本、某個具體載入器**寫的，而它現在跑的環境不是它預期的那個。**這幾乎總是版本不匹配，而不是你的配置寫錯了。**

:::warn 別在這種錯誤上先懷疑配置
看到 Mixin 或 NMS 相關的類名，先去核對版本（遊戲版本、核心/載入器版本、插件或模組版本），不要去改 `config.yml`。具體的報錯措辭與支援範圍，**以對應載入器與插件的官方文件為準**。
:::

## 2. 插件不相容

### 2.1 症狀對照表

| 報錯或症狀 | 含義 | 常見原因 |
| --- | --- | --- |
| `NoClassDefFoundError: com/example/lib/Foo` | 執行時找不到這個類 | 缺少硬前置（`depend` 沒滿足）；插件是給**另一種服務端**編譯的；該類來自服務端內部實現 |
| `ClassNotFoundException: ...` | 同上，通常是顯式載入類時找不到 | 缺前置；插件是多 jar 結構而你沒放全；下載的檔案損壞 |
| `NoSuchMethodError: 'void a.b.C.d(...)'` | 類找到了，但**方法簽名對不上** | 插件編譯時依賴的 API 版本與當前服務端或前置不同（多半是插件比服務端新，或前置太舊） |
| `AbstractMethodError` | 介面新增了方法，實現類裡沒有 | 插件針對**更老**的 API 編譯，而當前服務端或前置已經改過介面 |
| `UnsupportedClassVersionError ... class file version 65.0` | 插件用**更新的 Java** 編譯 | 你的 Java 比插件要求的舊（65 = Java 21）；換 Java 或換插件版本 |
| `MixinApplyError` / `InvalidMixinException` / `MixinTransformerError` | Mixin 注入失敗 | 插件 hook 了它從未針對過的內部實現，屬於版本不匹配 |
| 插件載入成功，但它的指令毫無反應 | 功能被靜默關閉 | 軟前置（`softdepend`）沒滿足；對應的擴充或模組沒裝 |
| 插件在啟動時把自己停用了 | 作者主動做了版本檢查 | 當前版本不在支援範圍內，插件拒絕載入，日誌裡通常寫明它支援的版本 |

:::note NoClassDefFoundError 有時是「後遺症」
如果日誌裡前面還有一條 `ExceptionInInitializerError`，那麼 `NoClassDefFoundError` 只是靜態初始化失敗的後續結果，**真正的原因在前一條日誌裡**。
:::

### 2.2 修復順序

按下面的順序做，每一步都只改一個變數：

1. **先確認三個版本**：遊戲版本（1.20.4 / 1.21.x 等）、服務端軟體（Paper / Purpur / Spigot / Fabric / Forge / NeoForge）、Java 版本。Java 與遊戲版本的對應關係見 [環境準備（Windows 與 Linux）](/tutorials/java/environment)。
2. **查插件的支援範圍**：發佈頁的 Supported Versions、README，以及 jar 內 `plugin.yml` 裡的 `api-version`。
3. **補齊前置**：Vault、PlaceholderAPI、ProtocolLib、LuckPerms 這類最常被依賴的插件，見 [常用前置插件](/tutorials/java/plugin-deps)。
4. **更新或降級插件**：優先讓插件與核心版本對齊。很多插件同時維護多個分支或多個 jar，**先下對分支**，再談版本號。
5. **換掉停更插件**：如果插件最後支援的版本明顯低於你的核心版本，不要硬撐，找仍在維護的替代品。
6. **二分法定位**：上面幾步都做完還是不行，用下面的方法把範圍縮到一個插件。

### 2.3 二分法：把問題縮到一個插件

```text
1. 停服，把整个 plugins/ 目录复制一份备份
2. 只留下必要的前置和怀疑对象，其余全部移出 plugins/
3. 启动，尝试复现问题
   还报错 -> 问题在这几个里，继续对半拆
   不报错 -> 问题在被移出的那批里，移回一半，重复
4. 每轮都从「移出全部，加回一半」开始，最多 log2(N) 轮
5. 定位到单个插件后，再换它的不同版本试，而不是只试最新版
```

:::tip 不要一次換掉所有東西
「把所有插件升到最新版」會讓變數從 1 個變成 N 個，之後再想定位就得從頭再來。**一次只動一個變數。**
:::

### 2.4 `/plugins` 的顏色與控制台

在 Paper / Spigot 系服務端裡，`/plugins` 會用顏色區分狀態：**綠色是已啟用，紅色是載入失敗或被停用**。它只能告訴你有幾個紅的，**不會告訴你為什麼**。

原因一定寫在控制台和 `logs/latest.log` 裡，典型形式如下（示意）：

```text
[12:00:02 WARN]: [MyPlugin] Could not load 'plugins/MyPlugin.jar' in folder 'plugins'
org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [Vault]. Please download and install these plugins.
        at org.bukkit.plugin.java.JavaPluginLoader.loadPlugin(JavaPluginLoader.java:155) ~[paper-api.jar:?]
        ...
[12:00:02 WARN]: [MyPlugin] Disabling MyPlugin v1.2.3
```

用插件名搜日誌，一般幾秒鐘就能看到原因。前置相關的細節見 [常用前置插件](/tutorials/java/plugin-deps)，插件安裝與載入的基礎見 [插件入門](/tutorials/java/plugins)。

## 3. 核心不相容

### 3.1 API 家族：Bukkit 系是一條線

Bukkit、Spigot、Paper、Purpur、Leaves、Leaf、Folia 屬於同一個 API 家族，是**逐層向下相容**的關係：針對上層寫的插件通常能在下游執行，反之不成立。

| 插件編譯時針對的 API | Spigot | Paper / Purpur | Folia |
| --- | --- | --- | --- |
| Bukkit / Spigot API | 可以 | 可以 | 需插件聲明支援 Folia |
| Paper API | 通常不行（缺類或方法） | 可以 | 需插件適配 |
| NMS 或某個分支專有 API | 僅限對應版本 | 僅限對應版本 | 通常不行 |

:::note 表裡的「可以」只是 API 層面的判斷
它不代表插件的實際行為一定正確。**插件能不能跑在你的核心上，以插件官方說明為準。**
:::

Folia 是特例：它把世界切成區域並行 tick，因此**要求插件在 `plugin.yml` 裡顯式聲明支援 Folia**，否則會被直接拒絕載入。具體欄位與限制以 Folia 官方文件為準。

### 3.2 為什麼用 NMS 的插件每次更新都會壞

NMS 指的是 `net.minecraft.server`，也就是服務端的**內部實現**。Mojang 從來沒有承諾這部分穩定：類名、方法名、欄位名在版本之間都可能變化。

- 只使用 Bukkit / Paper **公開 API** 的插件，跨小版本升級通常沒問題。
- 引用 NMS 的插件，**每個遊戲版本都要作者重新適配**，跳過中間版本基本必壞。
- Spigot 時代通過重對映把內部實現放進 `v1_20_R1` 這類**帶版本號**的包裡，所以插件一換版本就會找不到類。
- Paper 從 1.20.5 起改用 Mojang 官方對映，NMS 插件的寫法與以前不同，**具體變更以 Paper 官方公告為準**。

報錯特徵很統一：`NoClassDefFoundError`、`NoSuchMethodError`、`NoSuchFieldError`，並且類名裡帶 `net.minecraft` 或 `org.bukkit.craftbukkit`。

### 3.3 插件端與模組端不能互換

| 你的服務端 | 能載入插件 | 能載入模組 |
| --- | --- | --- |
| Paper / Purpur / Spigot | 是 | 否 |
| Fabric / Forge / NeoForge | 否（需橋接） | 是 |
| 混合端（Arclight、Mohist、Youer 等） | 通常兩者都可 | 通常兩者都可 |

- **Fabric / Forge / NeoForge 的模組，插件端載入不了**；反過來，插件也不能直接丟進模組端。
- 混合端能同時載入兩邊，但**相容性由混合端自己維護**，兩邊生態都可能出問題。在混合端上遇到插件報錯，先去混合端官方文件確認它支援哪些插件與模組。
- 代理端（Velocity、BungeeCord）是**第三套 API**：Bukkit 插件不能放進 Velocity，Velocity 插件也不能放進 Paper。相關說明見 [跨服端](/tutorials/java/proxy)。

細節與取捨見 [插件入門](/tutorials/java/plugins) 與 [服務端選擇](/tutorials/java/core)。

### 3.4 模組服的三方匹配

模組服要同時對上三樣東西：**遊戲版本 + 載入器版本 + 每一個模組**。少對一樣，載入器就會在啟動時拒絕啟動並列出問題模組。

Fabric 的典型形式（示意，實際措辭以 Fabric 官方文件為準）：

```text
Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Mod resolution encountered an incompatible mod set!
A potential solution has been determined:
         - Replace mod 'Sodium' (sodium) 0.5.8 with a version that supports minecraft 1.20.1
```

Forge / NeoForge 的典型形式（示意）：

```text
Missing or unsupported mandatory dependencies:
        Mod ID: 'create', Requested by: 'mymod', Expected range: '[0.5.1,)', Actual version: '0.5.0'
```

模組在後設資料裡聲明依賴：Fabric 在 `fabric.mod.json` 的 `depends`，Forge / NeoForge 在 `mods.toml` 的 `[[dependencies]]`。另外要分清**僅客戶端**、**僅服務端**和**兩端通用**的模組：把僅客戶端的模組放進服務端 `mods/`，同樣會報錯。

### 3.5 怎麼診斷核心不相容

1. **讀控制台裡第一個提到類名、包名或模組 ID 的錯誤**。後面的錯誤大多是它的連鎖反應。
2. **看 `plugin.yml` 的 `api-version`**（Paper / Spigot 插件）。它是個**提示**：說明作者聲明的目標 API 版本，但**不保證**能在你的核心上正常跑。欄位缺失時，服務端通常按「老插件」處理並給出提示，具體行為以服務端官方文件為準。
3. **在乾淨測試服上覆現**：同版本核心、只放這一個插件（加必要前置）、用一個新世界。如果照樣報錯，那就是插件與核心或版本的問題，不是你的配置問題。
4. **對照官方支援矩陣**：插件發佈頁、核心官方文件、模組頁面三處都看一眼。
5. **檢查是否混裝了不同家族的東西**：插件目錄裡出現模組、代理端插件丟進子服，都會產生看不懂的報錯。

### 3.6 升級與降級策略

- **升級前先備份**：至少包含 `world` 系列目錄、插件配置、`server.properties`，並**記錄當前所有插件與模組的版本號**。
- **保留上一個核心 jar**：出問題直接換回來，比現場排查快得多。
- **插件版本釘死**：升級核心之後，不要同時把所有插件升到最新；先確認核心能正常啟動，再一批一批升插件。
- **不要先升級世界**：世界一旦被更高版本開啟，降級回舊核心可能無法讀回。**先讓核心在新版本上跑通並確認要留下，再動世界。**
- **分批推進**：核心 -> 前置 -> 依賴前置的插件 -> 其他插件，每批都啟動驗證一次。
- **代理端同理**：先升子服，確認沒問題再升代理。

:::warn 降級的前提是「升級前的備份」
世界資料被新版本寫入後，舊版本可能直接拒絕載入。**沒有升級前的完整備份，就不要做升級。**
:::

## 4. 其他高頻報錯

### 4.1 UnsupportedClassVersionError（Java 版本不對）

```text
java.lang.UnsupportedClassVersionError: com/example/Plugin has been compiled by a more recent
version of the Java Runtime (class file version 65.0), this version of the Java Runtime only
recognizes class file versions up to 61.0
```

括號裡的兩個數字是**類檔案版本號**，不是 Java 版本號。對照關係：

| 類檔案版本 | 對應 Java |
| --- | --- |
| 52 | Java 8 |
| 55 | Java 11 |
| 61 | Java 17 |
| 65 | Java 21 |
| 69 | Java 25 |

- **插件報這個錯**：插件編譯用的 Java 比你的執行時新，換 Java 或換插件版本。
- **服務端核心報這個錯**：核心要求的 Java 比你的執行時新。
- 該用哪個 Java，按遊戲版本查 [環境準備（Windows 與 Linux）](/tutorials/java/environment) 裡的對照表，**不要憑感覺裝最新的**。
- 改 `-Xmx`、改配置、重灌插件都沒用，這不是記憶體或配置問題。

:::note Java 過高也會出問題
Java 版本高於要求時通常不會報這個錯，但可能觸發部分插件或模組的相容問題。**建議與要求嚴格對齊**，具體以核心與插件的官方文件為準。
:::

### 4.2 Address already in use（埠被佔用）

```text
[12:00:00 ERROR]: **** FAILED TO BIND TO PORT!
[12:00:00 ERROR]: The exception was: java.net.BindException: Address already in use: bind
[12:00:00 ERROR]: Perhaps a server is already running on that port?
```

原因是 25565（或你配置的埠）已經被別的行程佔用：另一個服務端實例、上一次沒退乾淨的行程，或別的程式。

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

同一台機器跑多個服務端時，必須給每個實例不同的 `server-port`。埠相關的排查步驟見 [環境準備（Windows 與 Linux）](/tutorials/java/environment)。

### 4.3 EULA 未同意導致退出

```text
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

這不是崩潰，而是服務端的正常拒絕啟動。把服務端目錄下的 `eula.txt` 改成 `eula=true` 後重啟即可。**只有在你確實閱讀並同意 Minecraft EULA 的前提下才這麼做**，協議原文以官方頁面為準。

### 4.4 記憶體相關報錯

| 報錯 | 含義 | 處理方向 |
| --- | --- | --- |
| `java.lang.OutOfMemoryError: Java heap space` | 堆記憶體不夠 | 適當調大 `-Xmx`；同時檢查視距、實體數量與插件是否洩漏 |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | GC 花掉大量時間卻回收不到記憶體 | 本質仍是堆太小或記憶體洩漏，同上 |
| `Could not reserve enough space for object heap` | JVM **啟動階段**就失敗，堆要不到 | `-Xmx` 超過可用記憶體，或用的是 32 位 Java；調小 `-Xmx` 並改用 64 位 Java |
| `Error occurred during initialization of VM` | JVM 初始化失敗，通常是參數或記憶體問題 | 檢查啟動參數裡的 `-Xms` / `-Xmx` 是否合理 |

- `-Xms` 是初始堆，`-Xmx` 是最大堆。兩者設成相同值可以減少執行時擴堆的開銷，但**不要超過實體記憶體**，要給作業系統和其他行程留出空間。
- **調大 `-Xmx` 不是萬能藥**：如果記憶體是被插件或模組洩漏掉的，調大隻是把崩潰時間往後推。用 **spark** 這類工具看記憶體與火焰圖，方法見 [效能最佳化](/tutorials/java/optimize)。
- 記憶體與玩家的推薦配比見 [開服協議與配置推薦](/tutorials/java/protocol)。

### 4.5 存檔與區塊損壞

表現形式與版本相關，常見的是載入區塊時報 IO 異常，例如（示意，實際措辭以日誌原文與官方文件為準）：

```text
[12:00:00 ERROR]: Error loading chunk [12, 34]: java.io.IOException: Region file is corrupted
[12:00:00 ERROR]: Failed to load chunk at 12, 34
```

處理原則：

1. **不要手動編輯 `region/` 裡的檔案**，直接改極可能把損壞範圍擴大。
2. **優先用備份恢復**，這是最可靠的做法，見 [備份與恢復](/tutorials/java/backup)。
3. 只有一個區塊壞、又不想回滾整個存檔時，可以用 **MCA Selector**、**NBTExplorer** 這類第三方工具刪除或替換該區塊，**代價是該區塊內的所有內容一起消失**。
4. 如果同一塊磁碟反覆出現損壞，先懷疑硬體與檔案系統（磁碟健康狀態、核心日誌），修好硬體再談恢復。

### 4.6 Ticking entity / Ticking block entity 崩潰

這類崩潰的標題行是 `Description: Ticking entity` 或 `Description: Ticking block entity`（也有 `Ticking player`），意思是**某個實體或方塊實體在 tick 時拋了異常**，通常來自某個模組，或者某個區塊資料已經損壞。

崩潰報告裡會寫明出問題物件的位置（示意）：

```text
Description: Ticking entity

java.lang.NullPointerException: Cannot invoke "net.minecraft.world.entity.Entity.getType()" because "entity" is null
        at com.example.mymod.TickHandler.onTick(TickHandler.java:64) ~[?:?]

-- Entity being ticked --
    Entity Type: minecraft:pig (net.minecraft.world.entity.animal.Pig)
    Entity's Exact location: 123.45, 64.00, -67.89
    Entity's Block location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; contains blocks 112,0,-80 to 127,255,-65)
```

方塊實體的形式類似：

```text
Description: Ticking block entity

-- Block entity being ticked --
    Name: minecraft:chest
    Block type: minecraft:chest
    Location: World: (123,64,-68), Chunk: (at 11,12 in 7,-5; ...)
```

**從座標定位到檔案**：

- 區塊座標 = `floor(x) >> 4`、`floor(z) >> 4`。上面例子裡 `x=123` 對應區塊 `7`，`z=-68` 對應區塊 `-5`，與報告裡寫的 `in 7,-5` 一致。
- 區域檔案 = `r.<floor(区块X/32)>.<floor(区块Z/32)>.mca`。例子裡區塊 `7` 與 `-5` 落在 `r.0.-1.mca`，與報告裡的 Region 欄位一致。

**安全的處理順序**：

1. **停服並完整備份世界**。這一步不能省。
2. 用 **MCA Selector**、**NBTExplorer** 等工具開啟對應區域檔案，**只刪除那一個實體或方塊實體**，這樣損失最小。
3. 找不到具體實體、或者工具無法處理時，才考慮刪除整個區塊。**刪除區塊會連帶刪掉該區塊內的建築、箱子與所有實體。**
4. 處理完先啟動驗證，確認不再崩，再做一次新的備份。
5. 如果出問題的是模組實體，回到第 3 節核對「遊戲版本 + 載入器版本 + 模組版本」，**版本不匹配往往才是根因**。

:::warn 不要在服務端執行時改存檔檔案
服務端執行中修改 `region/` 檔案會造成二次損壞。**停服、備份、再操作。**
:::

### 4.7 Linux 下的權限與埠報錯

| 報錯 | 原因 | 處理 |
| --- | --- | --- |
| `java.io.FileNotFoundException: ... (Permission denied)` | 服務端目錄屬主不對（比如曾經用 root 跑過） | `sudo chown -R mcserver:mcserver /opt/mcserver`，並用專用使用者執行 |
| `java.net.BindException: Permission denied` | 綁定了 1024 以下的特權埠且不是 root | 換用 1024 以上的埠，或按需授予繫結權限（瞭解風險後再做） |
| 玩家連不上，但日誌裡沒有任何報錯 | 防火牆或雲安全組沒放行 | 屬於網路層問題，見 [環境準備（Windows 與 Linux）](/tutorials/java/environment) |

**不要用 root 直接跑服務端**：一旦服務端或插件被利用，攻擊者拿到的是整台機器。權限與安全實踐見 [[JAVA] 安全插件](/tutorials/ops/security-java)。

## 5. 排查流程與清單

### 5.1 按這個順序走

1. **讀日誌**。先確認是「插件異常，服務端還活著」還是「服務端已經崩了」，決定看 `logs/latest.log` 還是 `crash-reports/`。
2. **找出第一個錯誤**。從第一條 `ERROR` 或 `Exception` 開始讀，不要從最後一條倒著猜。
3. **核對三個版本**。遊戲版本、核心或載入器版本、Java 版本，先排除最基本的不匹配。
4. **在乾淨測試服上覆現**。同版本核心 + 只放可疑插件 + 新世界，把「你的配置問題」和「插件本身的問題」分開。
5. **二分定位**。用 2.3 的方法把範圍縮到一個插件或模組。
6. **應用修復**。按「補前置 -> 調版本 -> 換替代品」的順序，一次只改一個變數。
7. **驗證**。重啟後確認日誌裡不再有該錯誤，並實際觸發一次相關功能。
8. **記錄**。把「報錯 + 原因 + 處理」寫進自己的維運筆記，下次遇到同樣的錯誤能直接查。

### 5.2 排查清單

| 步驟 | 做什麼 | 判斷標準 |
| --- | --- | --- |
| 1 | 複製 `logs/latest.log` 與最新的 `crash-reports/` 檔案 | 證據已儲存，重啟不會丟 |
| 2 | 判斷異常類型 | 能說出是插件級異常還是致命崩潰 |
| 3 | 找到第一個異常與最後一個 `Caused by` | 拿到兩個標題行 |
| 4 | 核對遊戲版本、核心版本、Java 版本 | 三者互相匹配 |
| 5 | 核對插件的支援版本與前置 | 插件支援當前核心，前置齊全 |
| 6 | 乾淨測試服復現 | 能穩定復現，或能證明與你的配置無關 |
| 7 | 二分法縮範圍 | 鎖定到單個插件或模組 |
| 8 | 修復並驗證 | 日誌無該錯誤，功能正常 |
| 9 | 記錄並備份 | 有筆記，有可回滾的備份 |

### 5.3 去求助時該給什麼

在群裡或 issue 裡問之前，把這些準備好。資訊越全，別人越可能一眼看出問題：

- **完整的日誌片段**：從第一個 `ERROR` 或 `Exception` 開始，到該異常結束，**包含所有 `Caused by`**。不要只截三行，也不要用手機拍螢幕。
- **崩潰報告**：如果是崩潰，附上 `crash-reports/` 裡對應的那份檔案，它已經包含版本與環境資訊。
- **版本資訊**：遊戲版本、核心名稱與構建號、`java -version` 的輸出。
- **插件或模組列表**：`/plugins` 的輸出，或者 `plugins/`、`mods/` 目錄的檔名與版本號。
- **最近改了什麼**：升級了核心、裝了新插件、改了哪份配置。**這一條經常直接就是答案。**
- **復現步驟**：什麼時候必崩，什麼時候不崩。
- **已經試過什麼**：避免別人讓你重複做一遍已經排除的操作。

## 相關文件

- [環境準備（Windows 與 Linux）](/tutorials/java/environment)：Java 版本對照、埠與權限
- [插件入門](/tutorials/java/plugins)：插件放在哪、怎麼被載入
- [常用前置插件](/tutorials/java/plugin-deps)：Vault、PlaceholderAPI、ProtocolLib、LuckPerms
- [服務端選擇](/tutorials/java/core)：各核心的定位與兼容範圍
- [效能最佳化](/tutorials/java/optimize)：用 spark 看記憶體與卡頓
- [[JAVA] 常見問題](/tutorials/faq/faq-java)：按現象直接查的速查表

> 報錯資訊與配置鍵名以對應插件與核心的官方文件為準。
