---
title: 開啟服務端
slug: start
cat: java
level: 1
order: 5
minutes: 14
mc: ["26.1+", "1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, 啟動腳本, bat, sh, eula, 自動重啟, 萬用字元]
updated: 2026-10-04
draft: false
---

前置條件已經就緒：**Java 裝好了、埠放行了、目錄建好了、核心也選好並下載了**。這一篇把伺服器真正跑起來。

:::note 新版 Forge 與 NeoForge 可以跳過這一篇
新版 **Forge** 與 **NeoForge** 用官方**安裝器**安裝後，會在服務端目錄**自動生成啟動腳本**（`run.bat` / `run.sh`）。用它們的話直接執行那個腳本即可，不需要手寫啟動腳本。
:::

## 一、編寫啟動腳本

把下載好的服務端核心（`.jar`）放進部署目錄，例如：

```
C:\mcserver\survival\        （Linux 下对应 /opt/mcserver/survival/）
├── paper-1.21.4.jar         ← 你下载的核心
└── （其余文件首次启动后自动生成）
```

### Windows：`start.bat`

1. 在這個目錄裡新建一個**文本文件**，把檔名改成 `start.bat`（副檔名從 `.txt` 改成 `.bat`）。
2. 右鍵 → 用文本編輯器開啟，寫入下面內容並儲存：

```bat
@echo off
cd /d "%~dp0"
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

把 `核心名.jar` 換成你實際的檔名（例如 `paper-1.21.4.jar`）。

- `cd /d "%~dp0"` 讓工作目錄固定為腳本所在目錄，避免雙擊時找不到核心檔案。
- `--nogui` 表示不開啟伺服器自帶的圖形視窗，全部輸出走命令列（`nogui` 是它的舊別名，兩者等價）。
- `pause` 讓視窗在伺服器退出後**不要立刻關閉**，方便看報錯，詳見下文「拓展」。

### Linux：`start.sh`

```bash
#!/bin/sh
cd "$(dirname "$0")"
exec java -Xms2G -Xmx2G -jar 核心名.jar --nogui
```

賦予執行權限後執行：

```bash
chmod +x start.sh
./start.sh
```

## 二、第一次啟動：等它下載，然後同意 EULA

**首次啟動會先下載執行所需檔案**，命令列裡會出現類似 `Downloading mojang_x.x.x.jar` 的輸出——這是正常的，**耐心等它下載完**即可（國內網路如果一直卡住，需要自備網路加速手段）。

下載完成後，伺服器**不會直接啟動**，而是提示：

```
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

這時用文本編輯器開啟目錄裡**自動生成的 `eula.txt`**，把：

```
eula=false
```

改成：

```
eula=true
```

儲存後**重新執行啟動腳本**。這個操作表示你已閱讀並同意 [Minecraft EULA](https://aka.ms/MinecraftEULA)。

:::warn 不改就起不來
`eula=false` 時伺服器會**啟動後立刻退出**，這是最常見的新手卡點。
:::

## 三、怎麼算啟動成功

當命令列出現下面這行，說明伺服器**已經成功開啟**：

```
Done (6.554s)! For help, type "help"
```

括號裡的秒數因機器而異。此時：

- 在**本機**可用 `localhost:25565` 進入；
- 別人用**你的公網 IP**（或域名）加預設埠 `25565` 進入；
- 在控制台輸入 `stop` 可以**安全關閉**伺服器（**不要直接叉掉視窗**，容易損壞存檔）。

## 四、拓展：三個實用技巧

### 1. 加 `pause`，崩潰時能看到日誌

Windows 的 `.bat` 雙擊執行時，如果伺服器崩潰，視窗會**一閃而過**，你什麼都看不到。在腳本**最後一行**加 `pause` 即可：

```bat
java -Xms2G -Xmx2G -jar 核心名.jar --nogui
pause
```

這樣伺服器退出後窗口會停住，報錯資訊就能看清了（Linux 下等價做法是在腳本末尾加 `read -n 1 -p "按任意键继续..."`）。

### 2. 用萬用字元，換核心版本不用改腳本

每次更新核心都要改腳本裡的檔名很煩。可以用**萬用字元**匹配：

```bash
java -jar *.jar
java -jar paper-*.jar
java -jar leaf-*.jar
```

:::warn 萬用字元在 Windows 的 .bat 裡不生效
這是**實測確認**的差異：**Linux / macOS 的 shell 會展開萬用字元**，但 **Windows 的 cmd 不會**——它會把你寫的 `*.jar` 原樣傳給 Java，Java 找不到這個檔案就會報錯。

Windows 下要用 `for` 迴圈來達到同樣效果：

```bat
@echo off
cd /d "%~dp0"
for %%f in (paper-*.jar) do (
  java -Xms2G -Xmx2G -jar "%%f" --nogui
  goto :done
)
:done
pause
```

把 `paper-*.jar` 換成你的核心字首（如 `leaf-*.jar`）即可，更新版本時不用改腳本。
:::

### 3. 崩潰後自動重啟

**Windows**（`start.bat`）：

```bat
@echo off
cd /d "%~dp0"
:start
java -Xmx4G -Xms1G -jar server.jar nogui
echo 服务器崩溃，3 秒后重启...
timeout /t 3
goto start
```

**Linux**（`start.sh`）：

```bash
#!/bin/bash
cd "$(dirname "$0")"
while true; do
    java -Xmx4G -Xms1G -jar server.jar nogui
    echo "服务器已关闭，3 秒后重启..."
    sleep 3
done
```

:::warn 自動重啟前先想清楚
自動重啟適合**無人值守的長期服**。但如果伺服器是因為**配置錯誤**（比如 Java 版本不對、埠被佔用）而啟動失敗，它會**每 3 秒重啟一次並刷屏**，反而掩蓋真正的錯誤。**第一次除錯時不要用自動重啟**，先手動跑通再說。
:::

:::tip Linux 長期開服更推薦 systemd
上面的 `while` 迴圈在 SSH 斷開後會被殺掉。想讓伺服器**開機自啟、崩潰自動重啟、退出 SSH 也不停**，用 systemd 託管更合適——見「環境準備（Windows 與 Linux）」第五步。
:::

## 五、下一步

伺服器跑起來之後，建議按這個順序繼續：

- **先看懂目錄**：見 [服務端結構](/tutorials/java/structure) —— 哪些檔案能動能備份
- **再改配置**：見 [配置服務端](/tutorials/java/config) —— 正版驗證、難度、視距都在這裡
- **讓別人也能連上**：見 [部署到可存取環境](/tutorials/java/deploy)
- **換核心 / 對照**：見 [服務端選擇](/tutorials/java/core) 與 [服務端核心對比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)
