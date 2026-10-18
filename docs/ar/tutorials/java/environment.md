---
title: تجهيز البيئة (Windows وLinux)
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, البيئة, إصدار-java, المنفذ, الصلاحيات]
updated: 2026-10-04
draft: false
---

تضع هذه المقالة Windows وLinux معًا. والمطلوب على الجانبين **الأمور الأربعة نفسها**: **تأكيد إصدار Java ← فتح المنفذ ← إنشاء الدليل ← تثبيت Java الصحيح وضبط البيئة**.

والاختلاف في صياغة الأوامر فقط، لذا تجد في كل قسم طريقتين، **فاتبع النصف الخاص بنظامك أنت**.

## الخطوة الأولى: حدّد الإصدار الذي تريد فتحه، ثم اختر Java

**الخطأ في هذه الخطوة يُبطل كل ما بعدها.** فإذا لم يطابق إصدار Java، انهار الخادم عند الإقلاع، وظهر في السجل `UnsupportedClassVersionError`.

| Minecraft نسخة Java | Java المطلوب رسميًا | ملاحظات |
| --- | --- | --- |
| 26.1 وما بعده | **Java 25** | أحدث متطلب (من 26.1) |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 أول إصدار رسمي يطلب 21 |
| 1.18 – 1.20.4 | **Java 17** | التركيبة الأكثر استخدامًا حاليًا |
| 1.17 – 1.17.1 | **Java 16** | Java 17 يبدأ أيضًا بشكل طبيعي |
| 1.12 – 1.16.5 | **Java 8** | كثير من حزم المودات القديمة ما زالت في هذه الدرجة |
| 1.7.10 وما أقدم | المتطلب الرسمي أقل | والشائع فعليًا Java 8 |

:::note مصدر الجدول
الحدود الفاصلة عند 1.20.5 / 1.18 / 1.17 / 1.12 مأخوذة من قائمة الإصدارات الرسمية لـ Mojang (حقل `javaVersion.majorVersion` لكل إصدار في `piston-meta.mojang.com`)؛ ومتطلب Java 25 من 26.1 مأخوذ من قائمة متطلبات الإصدارات في Minecraft Wiki. وليس تخمينًا من التجربة.
:::

- **متطلبات Paper وPurpur وSpigot وFabric وForge مطابقة للرسمي**: ما فوق 1.20.5 يحتاج Java 21، و1.18–1.20.4 يحتاج Java 17.
- الجدول أعلاه هو **الحد الأدنى**. وإذا كان إصدار Java أعلى كثيرًا فقد تتعارض بعض الملحقات والمودات، **ويُستحسن المحاذاة الصارمة مع المتطلب**.
- **نسخة Bedrock (BDS) لا تحتاج Java**، فهي برنامج C++ يُشغّل `bedrock_server` مباشرةً (وفي Windows `bedrock_server.exe`).

## الخطوة الثانية: فتح المنفذ

| المنفذ | البروتوكول | الاستخدام |
| --- | --- | --- |
| 25565 | TCP | اتصال اللعب في نسخة Java (**ضروري**) |
| 25565 | UDP | استعلام قائمة الخوادم (Query، اختياري) |
| 25575 | TCP | الكونسول البعيد RCON (اختياري، **لا تكشفه للإنترنت**) |
| 19132 | UDP | المنفذ الافتراضي لنسخة Bedrock (وIPv6 هو 19133، ولا يُحتاج إليه إلا في حلول العبور بين النسختين) |

:::note مصدر المنافذ
نسخة Java الافتراضية **TCP 25565**؛ ونسخة Bedrock **تستخدم BDS بروتوكول UDP**، والافتراضي في IPv4 هو **19132** وفي IPv6 **19133** (ويمكن تعديله في `server.properties`).
:::

### مجموعة أمان الخادم السحابي (إلزامية في الخوادم السحابية)

اذهب إلى «مجموعة الأمان / جدار الحماية» في لوحة السحابة وأضف قاعدة واردة `TCP 25565` بمصدر `0.0.0.0/0`. **فمهما كان جدار الحماية المحلي مضبوطًا، لن يتصل الآخرون إن لم تُفتح مجموعة الأمان.**

### جدار حماية النظام

**Windows (الواجهة الرسومية)**: `لوحة التحكم ← جدار حماية Windows Defender ← إعدادات متقدمة ← قواعد الواردة ← قاعدة جديدة` ← اختر «المنفذ» ← «TCP» ← املأ المنفذ المحلي `25565` ← «السماح بالاتصال» ← ضع علامة على ملفات التعريف الثلاثة ← سمّها واحفظ.

**Windows (سطر الأوامر، PowerShell كمسؤول)**:

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux (ufw، Ubuntu / Debian)**:

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux (firewalld، عائلة CentOS)**:

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn عند النشر بـ Docker لا يضبط جدار حماية النظام الحاويات
إن كنت تنوي نشر الخادم بـ **Docker / Docker Compose** (انظر [نشر نسخة Java بـ Docker](/tutorials/java/docker))، فإن **`ufw` و`firewalld` لا تعملان على منافذ هذا القسم إطلاقًا**.

السبب: Docker يكتب عند إقلاعه قواعد تحويل وNAT في `iptables` بنفسه، ويُدخلها **قبل** قواعد جدار حماية النظام. فحتى لو نفّذت `sudo ufw deny 25565`، **يظل بإمكان الخارج الاتصال بالمنفذ الذي تعرضه الحاوية**. وهذا ليس خطأً في الإعداد، بل سلوك Docker المقرّر.

وأمامك أربعة حلول عملية، **مرتبة حسب درجة التوصية**:

1. **اربط المنفذ بواجهة الاسترجاع المحلية فقط** (الأكثر أمانًا وأبسطها): `-p 127.0.0.1:25565:25565`، فيصبح منفذ الحاوية **غير مكشوف للإنترنت إطلاقًا**؛ وعند الحاجة للخارج يحوّله وكيل عكسي على المضيف (Nginx `stream` أو frp أو مُسرّع).
2. **استخدم سكربت [ufw-docker](https://github.com/chaifeng/ufw-docker) ليعود UFW يضبط الحاويات** (**اختره إن أردت أن يبقى UFW المدخل الموحّد**): يُثبَّت بأمر واحد، ثم تستطيع بـ `ufw route allow proto tcp from any to any port 25565` فتح منفذ الحاوية، وبـ `ufw route delete allow …` سحبه، **بلا تعطيل iptables في Docker ولا كتابة قواعد iptables بنفسك**. التفاصيل في [نشر نسخة Java بـ Docker ← 5.2 الحلول الأربعة الصحيحة](/tutorials/java/docker#52-正确的四种做法).
3. **كتابة القواعد يدويًا في سلسلة `DOCKER-USER`**: وهي السلسلة التي خصّصها Docker للمستخدم ولا يغطيها هو، وتناسب حالات تقييد مصادر قليلة فقط.
4. كتابة `"iptables": false` في `/etc/docker/daemon.json` ثم صيانة قواعد التحويل بنفسك — **تفقد معها قدرة تعيين المنافذ (إلا إذا أعددت NAT بنفسك)، ولا يُنصح بها للمبتدئين**.

والشرح الكامل في [نشر نسخة Java بـ Docker ← الشبكة وجدار الحماية](/tutorials/java/docker#5-网络与防火墙最容易踩坑的一节).
:::

### التحقق

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

ويجب اختبار الوصول من الخارج من **جهاز آخر**: `telnet IP-العام-الخاص-بك 25565`، أو باستخدام أداة فحص منافذ على الإنترنت. و**المنفذ لا يُستمع عليه إن لم يبدأ الخادم**، فابدأ الخادم أولًا ثم اختبر.

## الخطوة الثالثة: إنشاء الدليل

:::warn لا تجعل المسار يحتوي على محارف غير لاتينية أو مسافات
مسارات مثل `C:\我的服务器\1.20 服务端\` أو `/home/我的服务器/` تجعل بعض سكربتات التشغيل وإعدادات الملحقات تفشل في التحليل، ورسائل الخطأ تكون غالبًا عصيّة على الفهم. **استخدم مسارات قصيرة بالإنجليزية وحدها وبلا مسافات.**
:::

استخدم على الجانبين **البنية نفسها**، وحين تنتقل من Windows إلى Linux لاحقًا يكفي نقلها كاملةً:

```
mcserver/
├── survival/          # كل ملفات خادم واحد
│   ├── server.jar     # نواة الخادم
│   ├── eula.txt       # لا يبدأ إلا بعد الموافقة
│   ├── server.properties
│   ├── world/         # بيانات العالم (احرص على نسخها احتياطيًا منفصلة)
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # دليل النسخ الاحتياطي، وفصله عن دليل التشغيل أأمن
```

**Windows**:

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux** (بمستخدم مخصص، ولا تشغّل الخادم بـ root):

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**بعد وضع نواة الخادم في `survival` سيُولّد التشغيل الأول `eula.txt`**، فغيّر `eula=false` إلى `eula=true` إعلانًا للموافقة على [Minecraft EULA](https://aka.ms/MinecraftEULA). **وإن لم تغيّرها خرج الخادم فور بدئه.**

## الخطوة الرابعة: تثبيت Java وضبط البيئة

الموصى به **Eclipse Temurin (Adoptium)**: مجاني ومفتوح المصدر ومدعوم طويلًا، وهو أكثر توزيعات OpenJDK استخدامًا في مجتمع الخوادم.

### Windows: التثبيت

نزّل من موقع Adoptium **حزمة `.msi` الخاصة بـ JDK** (نسخة `.jar` هي وقت التشغيل، و`.msi` هي JDK ذات المعالج). وJava 21 يقابلها `temurin-21-jdk`، وJava 17 `temurin-17-jdk`، وJava 8 `temurin-8-jdk`.

وفي معالج التثبيت خيار **`Set JAVA_HOME variable`**، اجعله **Will be installed on local hard drive**، فبمجرد تحديده يُضبط متغير البيئة تلقائيًا.

وبعد التثبيت **افتح نافذة PowerShell جديدة** وتحقق:

```powershell
java -version        # يجب أن يُخرج openjdk version "21.x.x" ...
```

### Linux: التثبيت

```bash
# Ubuntu / Debian: Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# عند الحاجة إلى Java 17
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# عائلة CentOS
sudo dnf install -y java-21-openjdk-headless
```

وعند تعايش إصدارات متعددة، بدّل الإصدار الافتراضي:

```bash
sudo update-alternatives --config java
java -version
```

:::tip نسخة headless تكفي
`-headless` لا تضم مكوّنات رسومية، فاستهلاكها للذاكرة أقل؛ والخادم لا يحتاج واجهة GUI، **فثبّت headless بالأولوية**.
:::

### ضبط متغيرات البيئة يدويًا (عند عدم تحديد خيار التثبيت في Windows، أو استخدام نسخة ZIP المحمولة)

**الواجهة الرسومية**: `هذا الكمبيوتر ← خصائص (بالنقر الأيمن) ← إعدادات النظام المتقدمة ← متغيرات البيئة`، وفي **متغيرات النظام**:

1. أنشئ `JAVA_HOME` بقيمة دليل تثبيت JDK، مثل `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot` (**بلا** `\bin`)
2. عدّل `Path` وأضف بندًا جديدًا `%JAVA_HOME%\bin`
3. أكّد الحفظ، ثم **افتح** PowerShell جديدة وتحقق

**سطر الأوامر** (يحتاج صلاحيات المسؤول؛ و`setx` يؤثر في النوافذ الجديدة فقط):

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn عن خطر أن يغطي setx على Path
`setx Path` يكتب في الـ Path **المحلَّل حاليًا**. وإذا كان الـ Path الأصلي طويلًا أو يحوي إشارات إلى متغيرات، فقد يقتطع الدمج المباشر جزءًا منه. **والتحرير من الواجهة الرسومية أأمن.**
:::

**في Linux** يكون JDK المثبَّت بمدير الحزم عادةً في `PATH` أصلًا؛ وإن استخدمت tar.gz محمولًا فاضبطه في `~/.bashrc` أو `/etc/profile.d/`:

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**التحقق**:

```powershell
echo $env:JAVA_HOME      # cmd: echo %JAVA_HOME%
java -version
where.exe java           # يجب أن يشير إلى %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### تعايش إصدارات متعددة

**Windows** لا يملك `update-alternatives`، وأضمن طريقة: ثبّت عدة JDK، ولا تغيّر الافتراضي في النظام، بل اكتب المسار المطلق لـ `java.exe` صريحًا في سكربت تشغيل كل خادم.

`C:\mcserver\survival\start.bat`:

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **ضع المسار بين علامتي تنصيص دائمًا** — ففي `Program Files` مسافة، وبدون التنصيص يفشل حتمًا
- `cd /d "%~dp0"` يثبّت دليل العمل على دليل السكربت
- `pause` يجعل النافذة **لا تُغلق فورًا** عند الخطأ، وإلا لم ترَ الخطأ

**في Linux** استخدم `update-alternatives` للتبديل، أو اكتب المسار صريحًا في `start.sh`:

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## الخطوة الخامسة (مُستحسنة في Linux): الإدارة بـ systemd

تشغيل `./start.sh` يدويًا ينقطع بمجرد إغلاق SSH، ولا يحقق إعادة التشغيل التلقائية بعد الانهيار. وللعمل الطويل يُستحسن إدارته كخدمة:

```ini
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=mcserver
WorkingDirectory=/opt/mcserver/survival
ExecStart=/usr/bin/screen -DmS mcserver /usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
ExecStop=/usr/bin/screen -S mcserver -X stuff "stop\n"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minecraft
sudo systemctl status minecraft
```

:::note تحتاج screen
الطريقة أعلاه تستعين بـ `screen` للاحتفاظ بالكونسول، لتسهيل إدخال الأوامر: `sudo apt install -y screen`، ثم تعود إلى الكونسول بـ `screen -r mcserver`.
:::

## تشخيص المشكلات الشائعة

| العَرَض | السبب | المعالجة |
| --- | --- | --- |
| `java: command not found` / `'java' ليس أمرًا داخليًا أو خارجيًا معروفًا` | Java غير مثبّت، أو `PATH` غير مضبوط، أو النافذة لم تُفتح من جديد | افحص `PATH`، وأعد المحاولة في نافذة **جديدة** |
| `UnsupportedClassVersionError ... class file version 65.0` | إصدار Java أقل من المطلوب (65 = Java 21) | بدّل إلى إصدار Java المقابل في الجدول أعلاه |
| نافذة سكربت التشغيل تظهر وتختفي عند النقر المزدوج | النافذة تُغلق تلقائيًا بعد الخطأ | أضف `pause` في آخر السكربت، أو شغّله داخل طرفية لترى الخرج |
| يخرج فور البدء ويشير السجل إلى EULA | لم توافق على EULA | غيّر `eula.txt` إلى `eula=true` |
| `Address already in use` | المنفذ 25565 مشغول | Windows: `netstat -ano \| findstr :25565`؛ Linux: `ss -tlnp \| grep 25565`، ثم أنهِ العملية بعد معرفة PID |
| `Could not reserve enough space for object heap` | `-Xmx` يتجاوز الذاكرة المتاحة | قلّل `-Xmx` (مثل `-Xmx2G`) |
| telnet يعمل منك والآخرون لا يتصلون | ضبطت جدار الحماية المحلي فقط، ولم تفتح مجموعة أمان السحابة | أضف قاعدة واردة في لوحة السحابة |
| الملحق/المود يشتكي من أخطاء مسارات غريبة | الدليل يحوي محارف غير لاتينية أو مسافات | انقله إلى مسار إنجليزي مثل `C:\mcserver` أو `/opt/mcserver` |
| `Permission denied` في Linux | الخادم أُنشئ بـ root، والمستخدم العادي لا يملك صلاحية الكتابة | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| انقطاع بعد نوم حاسوب Windows | نوم النظام قطع الخدمة | اجعل خيارات الطاقة «بلا نوم أبدًا»، أو انتقل إلى جهاز يبقى متصلًا |

## الخطوة التالية

بعد جاهزية البيئة يمكنك تثبيت نواة الخادم:

- **اختيار الخادم**: انظر [اختيار نواة الخادم](/tutorials/java/core) — اختر النواة بحسب العتاد ونمط اللعب (أنوية كثيرة وتردد منخفض ← Folia، نواة واحدة قوية ← سلسلة Paper، آلات تقنية ← Fabric أو Leaves)
- **المقارنة بندًا بندًا**: انظر [مقارنة نوى الخادم](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) — الأداء والملحقات والمودات وحالات الاستخدام في لمحة

**وتأكد أمرين قبل التشغيل**: تطابق إصدار Java مع إصدار MC المستهدف، وفتح 25565 في مجموعة الأمان وجدار حماية النظام معًا.

وبعد تحديد البيئة والنواة، اكتب سكربت التشغيل وشغّل الخادم: انظر [تشغيل الخادم](/tutorials/java/start).
