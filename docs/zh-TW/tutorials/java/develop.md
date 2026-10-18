---
title: 插件與資料包開發入門
slug: develop
cat: java
level: 3
order: 28
minutes: 19
tags: [java, 插件開發, 資料包, paper, 構建工具, api, 測試]
updated: 2026-10-04
draft: false
---

前面幾篇講的是"用別人的東西"：裝插件、裝資料包、配服務端。這一篇講**自己寫**。

寫給兩類人：想給伺服器加一條自定義配方或自定義指令的服主，和想從零學 Bukkit / Paper 插件開發的玩家。目標不是讓你寫出完整作品，而是讓你**知道有哪條路、每條路要準備什麼、第一次能跑起來的最小骨架長什麼樣**。

一條貫穿全篇的原則：**類名、方法名、包格式與目錄名都會隨版本變化，官方文件永遠優先於任何教學，包括本篇。** 本篇不編造任何具體的 API 名稱或格式號。

## 1. 先選對工具：資料包 / 插件 / 模組

三條路的定位完全不同，先看對比表。

| 維度 | 資料包（datapack） | 插件（plugin） | 模組（mod） |
| --- | --- | --- | --- |
| 要寫程式碼嗎 | 不需要（JSON + mcfunction） | 需要 Java | 需要 Java |
| 構建工具 | 不需要 | Maven 或 Gradle | 載入器工具鏈 |
| 能在原版服務端跑 | 能 | 不能 | 不能 |
| 能在 Paper 系跑 | 能 | 能 | 不能（需橋接） |
| 能改什麼 | 遊戲已經暴露的資料：配方、戰利品表、進度、函式、標籤、部分世界生成資料 | API 暴露的一切：指令、事件、實體、方塊、GUI、網路 | 遊戲程式碼本身：新方塊、新生物、新維度 |
| 怎麼測試 | `/reload` + `/datapack list` | 重啟服務端 | 重啟客戶端與服務端 |
| 升級版本的代價 | 低（改格式號與目錄名） | 中（API 大體穩定，直接用內部類會碎） | 高（要等載入器與每個模組都更新） |
| 典型用途 | 改規則、加配方、加指令、輕量邏輯 | 經濟、領地、選單、跨服、完整玩法系統 | 新增內容、大型整合包 |

選擇順序建議是：**能用資料包解決就用資料包；資料包做不到再寫插件；需要改遊戲本身才做模組。** 判斷標準：

- 你想改的東西**遊戲已經暴露成資料**（配方、掉落、進度、函式、標籤）→ 資料包。
- 你想做的事**需要監聽事件或與玩家互動**（自定義指令、GUI、經濟、權限）→ 插件。
- 你想加的東西**遊戲裡原本不存在**（新方塊、新生物）→ 模組。

## 2. 資料包路徑

資料包是三條路裡門檻最低的：**沒有構建工具、沒有依賴、不需要編譯**，寫幾個 JSON 和文字檔就能生效。

### 2.1 目錄結構

服務端的資料包放在**存檔目錄**下的 `datapacks/`，存檔目錄名由 `server.properties` 的 `level-name` 決定（預設是 `world`）：

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

名稱空間目錄名（上面的 `my_pack`）就是你引用內容時用的字首，例如 `my_pack:hello`。**名稱空間建議只用小寫字母、數字和下劃線。**

資料包也可以是 `.zip`，但**zip 裡必須直接就是 `pack.mcmeta`**，不能多套一層資料夾。從資料夾右鍵壓縮時最容易多出一層。

### 2.2 `pack.mcmeta` 與 `pack_format`

```json
{
  "pack": {
    "pack_format": 0,
    "description": "My first datapack"
  }
}
```

關於 `pack_format`，只有一條規則要記：

:::warn 不要照抄任何教學裡的格式號
`pack_format` 的數值**隨每個遊戲版本變化**，資料包與資源包各有一套編號。填錯的結果是"格式不相容"的提示，包不會被載入。

**請去查對應版本的官方 wiki 格式表**，而不是抄任何教學（包括本篇）裡的數字。上面示例裡的 `0` 是佔位符，不是可用值。

另外，`pack.mcmeta` 的欄位本身也在演進：較新的版本允許聲明一個支援的格式範圍（例如 `supported_formats` 一類欄位）。欄位集合隨版本變化，以官方 wiki 的 `pack.mcmeta` 頁面為準。
:::

### 2.3 目錄名的單複數隨版本變化

這是新手最容易踩、也最少被教學提到的坑：

| 內容類型 | 較早版本（1.20.x 及以前） | 1.21 起 |
| --- | --- | --- |
| 函式 | `data/<ns>/functions/` | `data/<ns>/function/` |
| 進度 | `data/<ns>/advancements/` | `data/<ns>/advancement/` |
| 戰利品表 | `data/<ns>/loot_tables/` | `data/<ns>/loot_table/` |
| 配方 | `data/<ns>/recipes/` | `data/<ns>/recipe/` |
| 謂詞 | `data/<ns>/predicates/` | `data/<ns>/predicate/` |
| 函式標籤 | `data/minecraft/tags/functions/` | `data/minecraft/tags/function/` |

也就是說，**從 1.21 起這些目錄改成了單數**。寫成複數在舊版本上是對的，在新版本上就是"內容不生效且沒有明顯報錯"。請以對應版本的官方 wiki 為準。

### 2.4 函式（`.mcfunction`）

- 一個函式就是**一行一條指令**的文字檔，**不要寫開頭的 `/`**；以 `#` 開頭的行是註釋。
- 函式可以被指令呼叫：`/function my_pack:hello`。
- 較新的版本支援**函式宏**：用 `$(名称)` 佔位，再用 `function <函数> with <数据源>` 傳入參數。宏是版本相關特性，用之前先確認你的版本支援。

```text
# 给 16 格内的玩家一点视觉效果
# 注意：一定要加过滤条件，不要无过滤地遍历所有实体
execute as @a[distance=..16] at @s run particle minecraft:flame ~ ~1 ~ 0 0 0 0 1
```

### 2.5 標籤（tags）

標籤用來把內容"掛"到遊戲的鉤子上。最常用的兩個函式標籤：

```json
{
  "values": [
    "my_pack:tick"
  ]
}
```

放在 `data/minecraft/tags/function/tick.json`（1.21 前是 `functions/`）時，裡面的函式**每遊戲刻執行一次**；放在 `load.json` 時，在**載入與 `/reload` 時執行一次**。這是"讓資料包持續做事"的標準做法，也是效能問題最常見的來源。

### 2.6 進度與戰利品表

進度（advancement）常被當作"自定義觸發器"使用：用一個無法自然達成的條件，再由函式手動發放，`rewards.function` 指定要呼叫的函式。戰利品表（loot table）控制方塊、生物或箱子的掉落：

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

具體可用的 `type`、條件與函式名以官方 wiki 的對應頁面為準，它們**每個版本都會增加或調整**。

### 2.7 測試：`/reload` 與 `/datapack list`

```bash
/datapack list
/datapack enable "file/my_pack"
/reload
/function my_pack:hello
```

要點：

- `/datapack list` 是"包到底被沒被識別"的第一診斷指令；
- `/reload` 過載的是**已啟用資料包的資料**（函式、標籤、進度、戰利品表、配方等），**不是重啟**；
- 世界生成、維度類型、部分登錄檔內容必須**重啟服務端**才生效；
- 大服上 `/reload` 本身就有成本，不要把它當熱更新按鈕頻繁使用；
- 更多關於包格式、放置位置與排查的內容見 [資源包與資料包](/tutorials/ops/packs)。

### 2.8 效能警告：掛在 tick 上的函式是"每刻成本"

:::warn 每刻執行 = 每秒 20 次
把函式掛到 `tick` 標籤上，等於讓它**每秒執行 20 次**。裡面每多一條指令、每多一次無過濾的實體遍歷，成本都會乘以 20。

常見的效能錯誤：

- `execute as @e` 不帶任何選擇器過濾，遍歷全服實體；
- 在每刻函數裡做大量方塊查詢或 `data get`；
- 用函式寫"輪詢式"邏輯，本可以用事件或標籤代替。

用 `/spark` 一類工具可以定位到函式造成的卡頓。**先寫對，再最佳化**：能放在 `load` 裡的不要放在 `tick` 裡，能加過濾條件的不要省。
:::

另外兩個與指令規模相關的遊戲規則值得知道：限制一條指令鏈/遞迴長度的 `maxCommandChainLength`，以及限制單條指令能改動方塊數量的 `commandModificationBlockLimit`。兩者的預設值隨版本變化，寫大型函式前先查一下。

## 3. 插件路徑

插件比資料包強大得多，代價是你需要 **JDK、構建工具、一個測試服務端**。

### 3.1 需要準備什麼

| 需要 | 說明 |
| --- | --- |
| JDK | 版本必須與服務端要求的 Java 版本一致 |
| 構建工具 | Maven 或 Gradle，二選一即可 |
| 目標平台的 API | Paper 系用 Paper API，編譯時使用，**不打包進你的 jar** |
| 一個測試服務端 | 獨立的目錄、獨立的埠、獨立的世界副本 |

Java 版本要求**隨遊戲版本變化**，各核心分支也可能不同。大致對應關係（**請以 Paper 官方文件為準，不要照抄**）：

| Minecraft 版本 | 需要的 Java |
| --- | --- |
| 1.16.5 及更早 | Java 8 |
| 1.17.x | Java 16 |
| 1.18.x - 1.20.4 | Java 17 |
| 1.20.5 及以後 | Java 21 |

服務端的 Java 版本與編譯時用的 `release` 版本**必須對得上**，否則會出現 `UnsupportedClassVersionError` 一類的啟動失敗。

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

三個要點：

- `<scope>provided</scope>` 表示"服務端已經提供了這個庫，不要打進我的 jar"。**這行必須寫**，否則你會把整個 API 打進插件裡。
- `<version>` 的寫法類似 `<Minecraft 版本>-R0.1-SNAPSHOT`，**具體值隨版本變化**，請到官方文件或倉庫裡查當前值，不要照抄。
- 沒有用到第三方庫時**不要引入 shade 插件**。打包別人的庫會帶來衝突，也容易踩到許可證問題。

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

`compileOnly` 就是 Gradle 裡的 `provided`：**編譯時可見，打包時不包含**。構建產物在 `build/libs/`。

### 3.4 `plugin.yml` 與 `api-version`

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

| 欄位 | 作用 |
| --- | --- |
| `name` | 插件名，用於日誌字首與資料資料夾名；不要帶空格 |
| `main` | 主類的**完整類名**（含包名），該類必須繼承 `JavaPlugin` |
| `version` | 插件版本，出現在日誌與 `/plugins` 裡 |
| `api-version` | 聲明插件按哪個 API 版本編寫 |

**`api-version` 為什麼重要**：服務端會據此決定以哪種模式載入你的插件。官方文件的說明是——**服務端版本低於插件聲明的 API 版本時會拒絕載入**；而**不填寫該欄位時，插件會以舊式（legacy）方式載入並列印警告**。它還會影響一些相容性轉換行為，所以新插件應當明確填寫。

它**不是**版本保證：寫了 `api-version` 只代表你聲明了目標版本，不代表你的程式碼在新版本上一定正常。較新的 Paper 還支援另一種清單檔案（`paper-plugin.yml`）與不同的插件載入模型，具體寫法以對應版本的官方文件為準。

### 3.5 生命週期：`onEnable` 與 `onDisable`

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

- `onEnable()` 在插件被啟用時呼叫。服務端啟動時，它發生在服務端自身初始化之後、玩家可以進服之前。
- **不要在 `onEnable()` 裡做耗時的阻塞操作**（下載檔案、連線遠端服務、遍歷整個世界），那會直接拖慢服務端啟動。
- `onDisable()` 裡應該儲存配置、取消你自己排程的任務、關閉你開啟的資源。
- 服務端在停用插件時會**自動登出監聽器並取消該插件排程的任務**，但**不會**替你儲存資料或關閉你開啟的檔案與連線。

### 3.6 註冊指令與監聽器

指令執行器：

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

- 返回值表示"這條指令是否被正確處理"：返回 `false` 時服務端會列印該指令的 `usage`。
- 記得檢查 `args.length`，否則玩家少打一個參數就會拋陣列越界。
- 需要補全時實現 `TabCompleter` 並用 `setTabCompleter(...)` 註冊。

事件監聽器：

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

註冊監聽器**必須**呼叫 `registerEvents(listener, plugin)`，只實現 `Listener` 是不夠的。在 `onEnable()` 裡繫結指令時，記得判空：

```text
if (getCommand("hello") == null) {
    getLogger().severe("Command 'hello' is missing from plugin.yml!");
    return;
}
getCommand("hello").setExecutor(new HelloCommand(this));
```

**`getCommand()` 在指令沒有寫進 `plugin.yml` 時會返回 `null`**，直接呼叫 `setExecutor` 就是啟動即崩。這是新手最常見的第一個崩潰。較新的 Paper 版本提供了基於 Brigadier 的指令註冊方式（通過生命週期事件註冊），對複雜指令更友好；它屬於平台特有 API，寫法隨版本變化，請以官方文件為準。

### 3.7 日誌：用 `getLogger()`

```text
getLogger().info("Loaded " + count + " entries.");
getLogger().warning("Config value is missing, using the default.");
getLogger().log(java.util.logging.Level.WARNING, "Failed to save data", exception);
```

- `getLogger()` 返回一個以插件名作為字首的日誌器，日誌會進入服務端控制台與日誌檔案。
- **不要把異常吞掉**：捕獲後至少要 `log` 出來，並帶上異常物件，否則排查時只剩一句"出錯了"。
- 不要用 `System.out.println`：它繞過日誌系統，丟失插件名與級別，也沒法被日誌工具過濾。較新的 Paper 還提供 SLF4J 風格的日誌器，寫法以官方文件為準。

### 3.8 構建與部署

```bash
mvn -q package          # Maven，产物在 target/
gradle build            # Gradle，产物在 build/libs/
```

部署步驟：

```bash
stop                                              # 在测试服控制台执行
cp target/myplugin-1.0.0.jar /path/to/testserver/plugins/
java -Xms2G -Xmx2G -jar paper.jar --nogui         # 重启后看 onEnable 日志与 /plugins 状态
```

注意兩點：

- 如果你用了 shade 一類插件，`original-` 開頭的那個 jar **不是**要部署的檔案。
- **不要用 `/reload` 來熱更新插件。** 插件熱過載不是受支援的用法，很容易殘留狀態、洩漏類載入器，最終表現為各種詭異問題。開發階段直接重啟測試服。

## 4. 去哪裡學 API

這是本篇最想強調的一節：**不要憑記憶寫方法名。**

| 資源 | 用途 |
| --- | --- |
| 官方 Paper 文件站 | 入門教學、事件與指令的推薦寫法、平台特性說明 |
| 官方 Paper Javadoc | **方法名與類名的唯一權威**，可以按你目標版本檢視 |
| Bukkit / Spigot 的 Javadoc | 基礎 API 的參考，Paper 大部分 API 與之相容 |
| 你所用核心的官方倉庫與文件 | 確認某個行為是 Paper 特有還是 Bukkit 通用 |

具體做法：

1. 先確定你**要針對哪個 Minecraft 版本**開發，然後在 Javadoc 裡選對應版本。
2. 想用某個功能時，**先在 Javadoc 裡搜到那個類**，確認方法簽名，再寫程式碼。
3. **類名、事件名、列舉值都會隨版本變化**，部落格與舊教學裡的寫法經常已經失效。
4. **區分 API 與內部實現**：`org.bukkit.*`、`io.papermc.paper.*` 是有相容承諾的 API；服務端內部類（常被稱作 NMS）**沒有任何相容保證**，用它等於把插件綁死在某個版本上。
5. 遇到"方法不存在"的編譯錯誤，先懷疑版本不對，而不是去搜一個能編過的替代寫法。

## 5. 測試紀律

開發插件最容易出的事故不是寫不出來，而是**在生產服上試**。

| 紀律 | 說明 |
| --- | --- |
| 用獨立測試服 | 獨立目錄、獨立埠、世界用副本，**永遠不要拿主服當試驗場** |
| 對齊環境 | 測試服的**核心版本、構建號、Java 版本**要和生產一致，否則你測的不是同一個環境 |
| 先備份世界 | 插件會改資料，出問題時備份是唯一的退路，見 [備份與恢復](/tutorials/java/backup) |
| 一次只改一件事 | 同時改插件、配置與核心版本，出問題就無從定位 |
| 讀控制台堆疊 | 崩潰時看**第一行 + `Caused by` 鏈 + 你自己包名的那一行**，方法見 [Java 版常見報錯與崩潰排查](/tutorials/faq/errors) |
| 用普通玩家帳號測一遍 | 權限相關的 bug 只有非 OP 帳號才測得出 |
| 上線前灰度 | 先在小服或非高峰時段啟用，觀察 TPS 與日誌 |

## 6. 安全提醒

**插件不是沙箱。** 一個插件執行在服務端同一個 JVM 裡，擁有服務端的全部權限：讀寫檔案、開啟網路連線、執行系統指令、訪問記憶體中的資料。平台不會限制它。

由此推出三條結論：

- **別人插件裡的後門，就是你機器上的後門。** 只從官方發佈渠道獲取插件，留意被二次打包、改名、加殼的版本。
- **資料包也一樣。** 一個函式能做任何指令能做的事：發物品、傳送玩家、清空容器、把玩家丟進虛空。只裝可信來源的包。
- **你自己的插件也不要信任玩家輸入。** 校驗指令參數、別把玩家提供的字串直接當檔案路徑拼接、別把配置裡的字串當代碼執行、傳送給玩家的文本注意轉義。

插件的安裝、審計與排毒流程見 [插件管理與排毒](/tutorials/java/plugin-manage)。

## 7. 小結

- **先選工具**：資料包 → 插件 → 模組，能用簡單的就不要用複雜的。
- 資料包**門檻最低**：`pack.mcmeta` 的格式號必須查官方表格，目錄名的單複數隨版本變化。
- 插件需要 **JDK + 構建工具 + 測試服**；編譯時用 `provided` / `compileOnly` 引用 API，**不要打包 API**。
- `plugin.yml` 裡 **`api-version` 決定載入模式**，不填會被當作舊式插件並告警；指令必須寫進 `plugin.yml`，否則 `getCommand()` 返回 `null`。
- **`onEnable` 裡不要做耗時操作**，`onDisable` 裡儲存狀態並釋放資源。
- **方法名以官方 Javadoc 為準**，類名與事件名隨版本變化。
- **開發永遠在測試服**，一次只改一件事，崩潰先讀堆疊。
- **插件擁有服務端全部權限**，來源不明的插件就是來源不明的後門。

:::tip 最快的學法：讀一個現成的開源插件
從零想"我該呼叫哪個方法"是最慢的路徑。更快的做法是：找一個**功能和你目標相似的開源插件**，讀它的 `plugin.yml`、主類、一個指令類和一個監聽器類，把最小骨架抄下來，改成你要的功能。你會在半小時裡學到比看十篇教學更多的東西。

讀的時候帶著三個問題：**它在哪個生命週期階段註冊了什麼、它怎麼處理玩家輸入、它把資料存在哪裡。** 這三點搞清楚了，插件開發的門就開了。
:::

相關閱讀：[資源包與資料包](/tutorials/ops/packs)（包格式與放置位置）、[插件基礎](/tutorials/java/plugins)（安裝與載入）、[插件管理與排毒](/tutorials/java/plugin-manage)、[Java 版常見報錯與崩潰排查](/tutorials/faq/errors)、[備份與恢復](/tutorials/java/backup)。

> 遊戲機制、API 與包格式版本以對應官方文件為準。
