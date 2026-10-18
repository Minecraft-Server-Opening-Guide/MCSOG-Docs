---
title: "[BE] 常見問題"
slug: faq-be
cat: faq
level: 1
order: 2
minutes: 10
tags: [基岩版, 常見問題, 排查, 協議, bds]
updated: 2026-10-04
draft: false
---

基岩版開服的坑和 Java 版**很不一樣**——最大的區別是**版本/協議**。這裡按現象彙總，標註了出處章節。

## 一、玩家連不上（最常見）

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 提示"**所有玩家都應更新到最新版本**" | **協議版本不匹配** | 服務端協議必須與客戶端一致：把服務端更新到最新版，或讓玩家固定版本 | [協議版本與版本選擇](/tutorials/bedrock/protocol) |
| 昨天還好，今天玩家全進不來 | 玩家客戶端**自動更新**換了協議 | 跟進更新服務端（應用商店預設自動更新，無法指望玩家降級） | [協議版本與版本選擇](/tutorials/bedrock/protocol) |
| **iOS 玩家進不來** | iOS **只能裝商店最新版**，無法安裝指定版本 | 除非放棄 iOS 群體，否則只能讓服務端跟進最新版 | [協議版本與版本選擇](/tutorials/bedrock/protocol) |
| 埠檢測通過但還是連不上 | 客戶端與服務端**協議號不同** | 核對協議號（以 Minecraft Wiki 版本表為準） | [協議版本與版本選擇](/tutorials/bedrock/protocol) |

## 二、埠與網路

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 伺服器明明開著，誰都進不來 | **基岩版用 UDP** | 放行 **UDP 19132**（IPv6 為 19133）；安全組與系統防火牆**兩處都要** | [手機玩家支援](/tutorials/java/mobile) |
| 主機平台（Xbox / PS / Switch）進不來 | 它們**不能直接輸 IP 加入** | 只能通過**自定義 DNS** 或**區域網路**方式連線 | [手機玩家支援](/tutorials/java/mobile) |
| 想用內網穿透但連不上 | 多數穿透服務預設只支援 TCP | 選支援 **UDP** 的穿透方案 | [部署到可存取環境](/tutorials/java/deploy) |

## 三、BDS 相關

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| BDS **裝不了插件** | 官方服務端**沒有插件系統** | 用社群載入器（LeviLamina / EndStone / BDSX） | [BDS 服務端](/tutorials/bedrock/bds) |
| 裝了載入器卻起不來 | **載入器與遊戲版本強繫結** | 先確認服務端版本在載入器支援列表內 | [BDS 服務端](/tutorials/bedrock/bds) |
| 地圖越大越卡 | BDS **生物運算單執行緒** | 流暢度取決於**單核效能**；只能換單核更強的機器或減小地圖規模 | [BDS 服務端](/tutorials/bedrock/bds) |
| 記憶體一直緩慢上漲 | BDS 已知問題（類似記憶體洩漏） | **不要強行清理記憶體** → 會導致玩家下載材質包/Addon 時**進度條卡住**，只能重啟服務端 | [BDS 服務端](/tutorials/bedrock/bds) |
| 改了 `bedrock_server.exe` 名字後啟動失敗 | 啟動腳本/面板裡的路徑沒同步改 | 改回原名，或同步修改啟動路徑 | [BDS 服務端](/tutorials/bedrock/bds) |

## 四、核心選擇

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 用了 Nukkit 卻跟不上新版本 | 原版 Nukkit **已不活躍** | 換 **PowerNukkitX**（支援最新協議 + 多核最佳化） | [第三方核心](/tutorials/bedrock/third-party) |
| 玩家一多就卡（PMMP） | PHP 核心**高負載有瓶頸** | 減少插件、升級硬體，或改用 PowerNukkitX / BDS | [第三方核心](/tutorials/bedrock/third-party) |
| 不知道該選哪個核心 | — | 原版生存選 **BDS**；要效能+自定義選 **PNX**；要最多插件且會 PHP 選 **PMMP** | [基岩版核心選擇](/tutorials/bedrock/cores) |
| 多子服想統一入口 | 需要**代理端** | 用 **WaterDogPE**（對應 Java 版的 Velocity） | [第三方核心](/tutorials/bedrock/third-party) |

## 五、存檔與備份

| 現象 | 原因 | 處理 | 出處 |
| --- | --- | --- | --- |
| 換核心後存檔讀不出來 | 第三方核心的存檔相容性不如官方 | **升級/換核心前先備份**；儘量同核心內升級 | [第三方核心](/tutorials/bedrock/third-party) |
| 備份不完整 | 只拷了部分檔案 | BDS 的存檔全在 **`worlds/`**，整個目錄一起備份 | [BDS 服務端](/tutorials/bedrock/bds) |
| 備份檔案很大且越來越多 | 沒做保留策略 | 保留若干天每日 + 若干週每週，並清理舊包 | [備份與恢復](/tutorials/java/backup) |
| 服務商跑路資料全丟 | 資料只在一台機器 | **至少定期把備份下載到別處** | [備份與恢復](/tutorials/java/backup) |

## 六、玩家與運營

| 現象 | 處理 | 出處 |
| --- | --- | --- |
| 低齡玩家多、衝突多 | 規則寫短、白名單/審核前置、同時段有人值守 | [[BE] 經營管理](/tutorials/ops/management-be) |
| 玩家不會裝客戶端（appx/apk） | 提前寫好**分平台圖文教學** | [[BE] 經營管理](/tutorials/ops/management-be) |
| 安卓玩家說很卡 | 某版本起安卓端存在嚴重卡頓，社群長期無解 | [協議版本與版本選擇](/tutorials/bedrock/protocol) |
| 玩家說光影用不了 | 1.18.30 起客戶端實裝**渲染龍**，傳統光影不可用 | [協議版本與版本選擇](/tutorials/bedrock/protocol) |

> Java 版相關見 [[JAVA] 常見問題](/tutorials/faq/faq-java)；完整的核心對照見 [服務端核心對比](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7)。
