---
title: 插件配置基礎
slug: plugin-config
cat: java
level: 2
order: 18
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, 配置, yaml, 顏色程式碼, 編碼]
updated: 2026-10-04
draft: false
---

把插件丟進 `plugins/` 只是安裝完成，真正決定伺服器"順不順手"的是接下來那幾十個 `config.yml`。配置改對了是功能，改錯一個空格就可能整段讀不出來。

這篇講三件事：**YAML 怎麼寫、顏色程式碼怎麼用、編碼怎麼不出亂碼**，最後給一套改配置的固定流程。

## 1. 插件配置放在哪裡

絕大多數插件把自己的檔案放在 `plugins/插件名/` 下，常見的幾類：

| 檔案 / 目錄 | 作用 |
| --- | --- |
| `config.yml` | 主配置，幾乎每個插件都有 |
| `messages.yml`、`lang/` | 提示文本，改這裡等於換措辭或漢化 |
| `menus/`、`kits.yml` 等 | 分模組配置，由插件在啟動時生成 |
| `data/`、`playerdata/`、`*.db` | 插件自己維護的執行資料 |

:::warn 不要手改資料檔案
`data/`、`playerdata/`、`*.db` 這類內容是插件執行時自己寫的。手動編輯輕則被覆蓋，重則讓玩家資料錯位。要改就改配置，不要碰資料。
:::

## 2. YAML 的三條鐵律

九成的"配置讀不出來"都出在下面三條上。

### 縮排只能用空格，不能用 Tab

YAML 明確規定縮排不得使用製表符。而 Tab 在編輯器裡看起來和幾個空格一模一樣，肉眼很難發現：

```yaml
# 正确：用空格
options:
    enable: true

# 错误：这一行开头是 Tab
options:
	enable: true
```

多數編輯器會直接把 Tab 顯示成一個箭頭或虛線，VS Code 右下角也能看到 `Tab Size` 與縮排方式。**如果配置裡已經混了 Tab，別手工一個個刪**，用編輯器的"將縮排轉換為空格"功能統一處理。

### 冒號後面必須有空格

```yaml
enabled: true      # 正确：冒号后一个空格
enabled:true       # 错误：整行被当成一个字符串
```

`key:value` 在 YAML 裡不是鍵值對，而是一個普通字串。插件讀不到 `enabled` 這個鍵，就會退回預設值，表現出來往往是"我明明改了卻沒生效"。

### 同一層級的縮排必須一致

```yaml
options:
    enable: true
    check: false
    drop-block: true
    other:
        money: 10
        welcome: "欢迎你"
guide:
    show: true
```

`options` 與 `guide` 同層，`enable`、`check`、`drop-block` 與 `other` 同層，而 `other` 下面的 `money` 又低一層。同一層裡**不允許出現重複的鍵**：

```yaml
options:
  enable: true
  enable: false     # 错误：同层重复键
  check: false
```

支援 YAML 語法的編輯器會把這種寫法標紅；即使編輯器不報，插件讀取時也會報錯。

## 3. 物件、陣列與巢狀

YAML 只有兩種基本結構：**鍵值對（物件）** 和 **列表（陣列）**，其餘都是它們套起來的結果。

### 物件

```yaml
options:
  enable: true
  check: false
  money: 10
```

也可以寫成行內形式，適合短配置：

```yaml
options: {enable: true, check: false}
```

### 列表

以 `-` 開頭的行構成一個列表，元素按順序排列：

```yaml
worlds:
  - world
  - world_nether
  - world_the_end
```

行內寫法：

```yaml
worlds: [world, world_nether, world_the_end]
```

### 列表裡放物件

這是插件配置裡最常見、也最容易寫錯的結構——**每個元素的第一個鍵跟在 `-` 後面，同元素的其他鍵要和它對齊**：

```yaml
kits:
  - name: starter
    price: 0
    items:
      - STONE_SWORD
      - BREAD
  - name: vip
    price: 500
    items:
      - DIAMOND_SWORD
```

注意 `name` 和 `price`、`items` 是同一個元素的三個鍵，縮排要對齊；而 `- STONE_SWORD` 又是 `items` 的下一層。

### 值的類型

插件配置裡常見的值有這麼幾類，寫法上要注意：

```yaml
boolean: true          # true / false，大小写不敏感
integer: 10
float: 3.14
text: "hello"          # 含特殊字符时用引号包起来
null_value: ~          # ~ 表示空值
```

:::tip 什麼時候必須加引號
值裡出現 `: `、`#`、`{`、`}`、`[`、`]`、`&`、`*`、`!`、`|`、`>` 等符號，或者值以它們開頭時，用單引號或雙引號包起來最穩。比如 `&a你好` 這類顏色程式碼文本，寫成 `"&a你好"` 就不會被誤解析。
:::

## 4. 常見的 YAML 報錯與原因

| 現象 | 真實原因 | 處理 |
| --- | --- | --- |
| 插件啟動即報 `while parsing`、`mapping values are not allowed here` | 冒號後沒空格，或值裡出現了未加引號的 `: ` | 補空格，或給值加引號 |
| `found character '\t' that cannot start any token` | 縮排裡混了 Tab | 把縮排統一轉換為空格 |
| `duplicate key` | 同一層級寫了兩個相同的鍵 | 刪掉多餘的那個 |
| 改了配置卻毫無效果 | 鍵名拼錯、層級放錯、或插件根本沒讀這個檔案 | 對照插件預設配置逐項核對 |
| 只有某個列表項失效 | 列表項內各鍵縮排沒對齊 | 讓同一元素的鍵左對齊 |
| 整個檔案讀不出來，第一行就報錯 | 檔案帶了 BOM 或編碼不是 UTF-8 | 另存為 UTF-8 無 BOM |
| 報 `expected <block end>` | 某一行少縮排或多縮排 | 逐層檢查縮排寬度 |

:::tip 讓編輯器替你檢查
VS Code 裝 YAML 擴充、Notepad++ 開啟 `.yml`，都會即時標出縮排和語法問題。**在儲存之前先看有沒有紅波浪線**，比事後翻日誌快得多。
:::

## 5. 顏色與格式程式碼

服務端文本（MOTD、聊天、插件提示、選單名稱）靠**格式程式碼**上色。原版使用的是分節符號 `§`，但多數插件為了方便，允許在配置裡直接寫 `&`，由插件自己轉換。

### 顏色

```
&0 黑色 &1 深蓝 &2 深绿 &3 深青
&4 深红 &5 深紫 &6 金色 &7 灰色
&8 深灰 &9 蓝色 &a 绿色 &b 青色
&c 红色 &d 粉红 &e 黄色 &f 白色
```

### 格式

```
&l 加粗     &o 斜体     &n 下划线   &m 删除线
&k 随机字符 &r 重置
```

組合使用即可，例如：

```yaml
prefix: "&8[&a服务器&8] &r"
message: "&a欢迎 &e%player_name% &a回到服务器"
warning: "&c&l警告&r &7请不要在此处建造"
```

`&r` 只清除它**之後**的格式，所以一段文字想恢復預設樣式，就在那裡寫 `&r`。

### 幾點限制

- **`&` 不是萬能的**：它需要插件主動轉換。少數地方（原版 `server.properties` 的 `motd`、部分原版指令）只認真正的 `§` 符號，寫 `&` 會原樣顯示。
- **只有 16 種顏色**：`&` 程式碼是舊版機制，沒有真彩色。需要漸變或精確色值，得用下面說的 MiniMessage。
- **打不出 `§` 怎麼辦**：正常客戶端無法直接輸入這個符號，可以按住 `Alt` 在小鍵盤依次輸入 `167`，或直接複製貼上。
- **支援的程式碼範圍由插件決定**：同一個 `&l`，有的插件在選單標題裡生效，有的地方會被忽略。

### MiniMessage（瞭解即可）

基於 Adventure 庫的 MiniMessage 用標籤描述樣式，支援真彩色、漸變、懸停與點選事件：

```xml
<yellow>你好 <blue><bold>世界</bold></blue>!</yellow>
<gradient:#f6d365:#fda085>渐变色文字</gradient>
<rainbow>彩虹文字</rainbow>
```

要注意的是：**平台原生支援不等於插件支援**。Paper 及其衍生端自帶 Adventure，所以基於 Paper 開發的插件多半能用 MiniMessage；而基於 Bukkit 開發的插件（如 EssentialsX）預設並不支援，除非它自己引入了這個庫（如 PlaceholderAPI）。

:::note 不要硬套
看到別人用 MiniMessage 效果好，不代表你的插件也認。寫之前先翻插件文件，確認它支援的是 `&` 程式碼、MiniMessage 標籤，還是兩者都支援。
:::

## 6. 檔案編碼與亂碼

配置裡寫中文後顯示成 `???`、`鍑虹幇`、`æ¬¢è¿` 之類，幾乎都是**編碼不對**，而不是插件不支援中文。

| 現象 | 原因 |
| --- | --- |
| 中文變成問號或方塊 | 檔案被存成了 ANSI / GBK，而服務端按 UTF-8 讀 |
| 中文變成一串奇怪符號 | 檔案是 UTF-8，但被當成 GBK 讀（或反過來） |
| 第一行鍵名讀不出來 | 檔案開頭帶了 BOM，個別解析器會把 BOM 當成鍵名的一部分 |

處理辦法：

1. 用 VS Code、Notepad++ 之類的編輯器開啟檔案。
2. 在儲存時選擇 **UTF-8**（VS Code 右下角編碼處選 `Save with Encoding`）。
3. 確認不要帶 BOM。Windows 記事本在舊版本里預設存成"UTF-8 帶 BOM"，是最常見的坑。
4. 儲存後重新載入插件，觀察控制台與遊戲內文本。

:::warn 先用記事本存一次是危險操作
Windows 記事本開啟 `.yml` 後隨手 Ctrl+S，很容易把原本正常的 UTF-8 檔案改成 ANSI。**建議一開始就用支援 YAML 與編碼顯示的編輯器**，並且改之前先備份。
:::

## 7. 安全地改配置：一套固定流程

按這個順序走，出問題的機率會低很多。

1. **先備份**。複製一份 `config.yml` 為 `config.yml.bak`，改壞了立刻能還原。
2. **儘量在停服或低峰期改**。部分插件會在關閉時把自己的記憶體狀態寫回檔案，執行中改的內容可能被覆蓋。
3. **用帶 YAML 支援的編輯器**，保留原有的註釋和結構，不要順手格式化整個檔案。
4. **一次只改一處**，改完立刻驗證。一次改二十行，出問題就不知道是哪一行。
5. **重新載入**。優先用插件自己的指令：

| 方式 | 說明 |
| --- | --- |
| `/插件名 reload` | 多數插件支援，**首選**（如 `/tab reload`、`/papi reload`） |
| 重啟服務端 | 最保險，不支援熱過載的插件只能這樣 |
| `/reload`（原版指令） | **不推薦**，容易讓插件狀態錯亂 |

6. **看控制台和 `logs/latest.log`**。配置解析失敗通常會在載入時列印檔名與行號，按行號回去找基本一眼就能看到。
7. **不確定就先在測試服試**。改插件配置比裝插件安全，但仍然可能影響存檔或玩家資料。

:::tip 報錯行號怎麼用
日誌裡出現 `config.yml: 42` 這樣的提示時，**不要只盯第 42 行**。YAML 的解析錯誤經常是前一行縮排或引號沒閉合導致的，往上多看兩三行。
:::

## 8. 速查

| 問題 | 先檢查 |
| --- | --- |
| 配置沒生效 | 鍵名拼寫、層級位置、是否執行了 reload |
| 插件啟動報解析錯誤 | 冒號後空格、Tab 縮排、同層重複鍵 |
| 中文亂碼 | 檔案是否為 UTF-8 無 BOM |
| 顏色程式碼原樣顯示 | 該位置是否支援 `&`，或需要 MiniMessage 標籤 |
| 改了又變回去 | 插件是否在關服時重寫了配置 |

## 下一步

配置裡常出現的 `%player_name%` 這類變數從哪來？見 [常用前置插件](/tutorials/java/plugin-deps)。如果你還沒裝插件，先看 [插件入門](/tutorials/java/plugins)；服務端自身的配置則在 [配置服務端](/tutorials/java/config)。

---

> 本篇部分內容參考自 [NitWikit（Cubic Wiki）](https://nitwikit.8aka.org/) 與 [其 GitHub 倉庫](https://github.com/Cubic-Project/NitWikit)，已按本站結構重寫；如與上游不一致以上游為準。
