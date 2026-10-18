---
title: Подготовка среды (Windows и Linux)
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, среда, версия java, порт, права]
updated: 2026-10-04
draft: false
---

Здесь Windows и Linux разобраны вместе. В обеих системах нужно сделать **одни и те же четыре вещи**: **определить версию Java → открыть порт → создать каталоги → установить нужную Java и настроить среду**.

Различается только запись команд, поэтому в каждом подразделе даны два варианта — **читайте половину, относящуюся к вашей системе**.

## Шаг 1: сначала определите версию сервера, потом выбирайте Java

**Ошибка на этом шаге обнуляет всё дальнейшее.** При несовпадении версии Java сервер падает сразу при запуске, а в логах появляется `UnsupportedClassVersionError`.

| Версия Minecraft Java | Требуемая официально Java | Описание |
| --- | --- | --- |
| 26.1 и позже | **Java 25** | Новейшее требование (с 26.1) |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 — первая стабильная версия, требующая 21 |
| 1.18 – 1.20.4 | **Java 17** | Самое распространённое сочетание сейчас |
| 1.17 – 1.17.1 | **Java 16** | Java 17 тоже запускается нормально |
| 1.12 – 1.16.5 | **Java 8** | Множество старых сборок остаются на этом уровне |
| 1.7.10 и раньше | Официально требования ниже | На практике обычно используется Java 8 |

:::note Источник таблицы
Границы 1.20.5 / 1.18 / 1.17 / 1.12 взяты из официального списка версий Mojang (поле `javaVersion.majorVersion` каждой версии на `piston-meta.mojang.com`); требование Java 25 с 26.1 — из списка требований Minecraft Wiki. Это не догадки.
:::

- **Требования Paper, Purpur, Spigot, Fabric и Forge совпадают с официальными**: для 1.20.5 и выше нужна Java 21, для 1.18–1.20.4 — Java 17.
- Таблица выше — **минимальные требования**. При слишком высокой версии Java часть плагинов и модов может быть несовместима; **рекомендуется строго придерживаться требований**.
- **Bedrock Edition (BDS) не требует Java** — это программа на C++, достаточно запустить `bedrock_server` (в Windows — `bedrock_server.exe`).

## Шаг 2: откройте порты

| Порт | Протокол | Назначение |
| --- | --- | --- |
| 25565 | TCP | Подключение игры Java Edition (**обязательно**) |
| 25565 | UDP | Запрос списка серверов (Query, необязательно) |
| 25575 | TCP | Удалённая консоль RCON (необязательно, **не открывайте в интернет**) |
| 19132 | UDP | Порт Bedrock по умолчанию (для IPv6 — 19133, нужен только при кроссплатформе) |

:::note Источник портов
Java Edition по умолчанию **TCP 25565**; **BDS использует UDP**, для IPv4 по умолчанию **19132**, для IPv6 — **19133** (можно изменить в `server.properties`).
:::

### Security group облачного сервера (обязательно для облачных машин)

В консоли облака в разделе «Security group / Firewall» добавьте входящее правило `TCP 25565` с источником `0.0.0.0/0`. **Как бы правильно ни был настроен локальный firewall, без открытого security group другие не подключатся.**

### Системный firewall

**Windows (графический интерфейс)**: `Панель управления → Брандмауэр Защитника Windows → Дополнительные параметры → Правила для входящих подключений → Создать правило` → выбрать «Порт» → «TCP» → локальный порт `25565` → «Разрешить подключение» → отметить все три профиля → задать имя и сохранить.

**Windows (командная строка, PowerShell от администратора)**:

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux (ufw, Ubuntu / Debian)**:

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux (firewalld, семейство CentOS)**:

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn При развёртывании в Docker системный firewall не управляет контейнерами
Если вы собираетесь разворачивать сервер в **Docker / Docker Compose** (см. [Развёртывание Java Edition в Docker](/tutorials/java/docker)), то **`ufw` и `firewalld` не действуют на порты из этого раздела**.

Причина: при запуске Docker сам пишет в `iptables` правила пересылки и NAT и вставляет их **перед** правилами системного firewall. Поэтому даже после `sudo ufw deny 25565` извне **всё равно можно подключиться к опубликованному порту контейнера**. Это не ошибка конфигурации, а штатное поведение Docker.

Четыре рабочих подхода, **в порядке предпочтения**:

1. **Привязать порт только к loopback** (безопаснее и проще всего): `-p 127.0.0.1:25565:25565` — порт контейнера **полностью закрыт от интернета**; для внешнего доступа его пересылает обратный прокси на хосте (Nginx `stream`, frp, ускорители и т. п.).
2. **Вернуть UFW контроль над контейнерами скриптом [ufw-docker](https://github.com/chaifeng/ufw-docker)** (**выбирайте, если хотите оставить UFW единой точкой управления**): устанавливается одной командой, после чего `ufw route allow proto tcp from any to any port 25565` разрешает порт контейнера, а `ufw route delete allow …` отзывает правило; **не нужно ни отключать iptables Docker, ни писать свои правила iptables**. Подробнее — в [Развёртывании Java Edition в Docker → 5.2 Четыре правильных подхода](/tutorials/java/docker#52-%E6%AD%A3%E7%A1%AE%E7%9A%84%E5%9B%9B%E7%A7%8D%E5%81%9A%E6%B3%95).
3. **Писать правила вручную в цепочке `DOCKER-USER`**: это цепочка, специально оставленная Docker пользователю, сам Docker её не перезаписывает; подходит для небольшого ограничения источников.
4. Записать `"iptables": false` в `/etc/docker/daemon.json` и самому поддерживать правила пересылки — **при этом теряется и проброс портов (если не настроить NAT самостоятельно); новичкам не рекомендуется**.

Полное описание — в [Развёртывании Java Edition в Docker → Сеть и firewall](/tutorials/java/docker#5-%E7%BD%91%E7%BB%9C%E4%B8%8E%E9%98%B2%E7%81%AB%E5%A2%99%E6%9C%80%E5%AE%B9%E6%98%93%E8%B8%A9%E5%9D%91%E7%9A%84%E4%B8%80%E8%8A%82).
:::

### Проверка

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

Внешнюю доступность нужно проверять **с другой машины**: `telnet <ваш публичный IP> 25565` или онлайн-инструментом проверки портов. **Пока сервер не запущен, порт не слушается**, поэтому сначала поднимите сервер, потом проверяйте.

## Шаг 3: создайте каталоги

:::warn В путях не должно быть не-ASCII символов и пробелов
Пути вроде `C:\Мой сервер\1.20 сервер\` или `/home/Мой сервер/` ломают разбор в некоторых скриптах запуска и конфигурациях плагинов, а сообщения об ошибках бывают малопонятными. **Используйте короткие пути только из латиницы, без пробелов.**
:::

В обеих системах используется **одна и та же структура**, чтобы при переезде с Windows на Linux достаточно было скопировать всё целиком:

```
mcserver/
├── survival/          # все файлы одного сервера
│   ├── server.jar     # серверное ядро
│   ├── eula.txt       # без согласия сервер не запустится
│   ├── server.properties
│   ├── world/         # данные мира (обязательно копировать отдельно)
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # каталог копий; отдельно от рабочего — безопаснее
```

**Windows**:

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux** (отдельный пользователь; не запускайте сервер от root):

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**После того как положите ядро в `survival`, первый запуск создаст `eula.txt`**; замените `eula=false` на `eula=true`, подтверждая принятие [Minecraft EULA](https://aka.ms/MinecraftEULA). **Без этого сервер сразу завершится после запуска.**

## Шаг 4: установите Java и настройте среду

Рекомендуется **Eclipse Temurin (Adoptium)**: бесплатный, открытый, долго поддерживаемый; самый распространённый в серверном сообществе дистрибутив OpenJDK.

### Windows: установка

На официальном сайте Adoptium скачайте **`.msi` установщик JDK** (`.jar` — это runtime, а `.msi` — JDK с мастером установки). Java 21 соответствует `temurin-21-jdk`, для Java 17 — `temurin-17-jdk`, для Java 8 — `temurin-8-jdk`.

В мастере установки есть пункт **`Set JAVA_HOME variable`** — выберите **Will be installed on local hard drive**, и переменная окружения настроится автоматически.

После установки **откройте новый** PowerShell и проверьте:

```powershell
java -version        # должно вывести openjdk version "21.x.x" ...
```

### Linux: установка

```bash
# Ubuntu / Debian: Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# если нужна Java 17
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# семейство CentOS
sudo dnf install -y java-21-openjdk-headless
```

Переключение версии по умолчанию при нескольких установленных:

```bash
sudo update-alternatives --config java
java -version
```

:::tip Версии headless достаточно
`-headless` не содержит графических компонентов и потребляет меньше памяти; серверу GUI не нужен, **ставьте headless**.
:::

### Ручная настройка переменных окружения (если в Windows не отмечен пункт установки или используется ZIP без установки)

**Графический интерфейс**: `Этот компьютер → Свойства → Дополнительные параметры системы → Переменные среды`, в **системных переменных**:

1. создайте `JAVA_HOME` со значением каталога установки JDK, например `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot` (**без** `\bin`)
2. отредактируйте `Path`, добавив `%JAVA_HOME%\bin`
3. сохраните и **откройте новый** PowerShell для проверки

**Командная строка** (нужны права администратора; `setx` влияет только на новые окна):

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn О риске перезаписи Path через setx
`setx Path` записывает **текущий** развёрнутый Path. Если исходный Path слишком длинный или содержит ссылки на переменные, прямое склеивание может его обрезать. **Редактирование через графический интерфейс безопаснее.**
:::

В **Linux** JDK из пакетного менеджера обычно уже в `PATH`; если используется tar.gz без установки, пропишите в `~/.bashrc` или `/etc/profile.d/`:

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**Проверка**:

```powershell
echo $env:JAVA_HOME      # cmd: echo %JAVA_HOME%
java -version
where.exe java           # должно указывать на %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### Несколько версий одновременно

В **Windows** нет `update-alternatives`; надёжнее всего установить несколько JDK, не менять системную по умолчанию, а прописать абсолютный путь к `java.exe` в скрипте запуска каждого сервера.

`C:\mcserver\survival\start.bat`:

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **Путь обязательно заключайте в двойные кавычки** — в `Program Files` есть пробел, без кавычек запуск точно не удастся
- `cd /d "%~dp0"` фиксирует рабочий каталог в папке скрипта
- `pause` не даёт окну **закрыться сразу** при ошибке, иначе сообщение не увидеть

В **Linux** переключайтесь через `update-alternatives` или прописывайте путь в `start.sh` жёстко:

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## Шаг 5 (рекомендуется для Linux): управление через systemd

При ручном `./start.sh` сервер обрывается при закрытии SSH, и автоперезапуска после краша нет. Для долгой работы рекомендуется оформить его как службу:

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

:::note Нужен screen
Запись выше использует `screen`, чтобы сохранить консоль для ввода команд: `sudo apt install -y screen`, затем возвращайтесь в консоль через `screen -r mcserver`.
:::

## Диагностика частых проблем

| Симптом | Причина | Что делать |
| --- | --- | --- |
| `java: command not found` / `'java' не является внутренней или внешней командой` | Не установлена, не настроен `PATH` или окно не перезапущено | Проверьте `PATH`, **откройте новое** окно и повторите |
| `UnsupportedClassVersionError ... class file version 65.0` | Версия Java слишком низкая (65 = Java 21) | Замените Java по таблице выше |
| Окно при двойном щелчке по скрипту мелькает | После ошибки окно закрывается автоматически | Добавьте `pause` в конец скрипта или запустите из терминала, чтобы увидеть вывод |
| Сразу завершается после запуска, в логах EULA | EULA не принята | Замените в `eula.txt` на `eula=true` |
| `Address already in use` | Порт 25565 занят | Windows: `netstat -ano \| findstr :25565`; Linux: `ss -tlnp \| grep 25565`; найдите PID и завершите процесс |
| `Could not reserve enough space for object heap` | `-Xmx` превышает доступную память | Уменьшите `-Xmx` (например, `-Xmx2G`) |
| У себя telnet проходит, другие не подключаются | Настроен только локальный firewall, security group облака не открыт | Добавьте входящее правило в консоли облака |
| Плагин/мод выдаёт странную ошибку пути | В каталоге не-ASCII символы или пробелы | Перейдите на путь только из латиницы, например `C:\mcserver` или `/opt/mcserver` |
| В Linux `Permission denied` | Сервер создан от root, у обычного пользователя нет прав на запись | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Windows засыпает, и связь пропадает | Сон системы прерывает службу | Установите в питании «никогда не засыпать» или используйте постоянно включённую машину |

## Следующий шаг

Когда среда готова, можно ставить серверное ядро:

- **Выбор ядра**: см. [Выбор серверного ядра](/tutorials/java/core) — подбирайте по железу и геймплею (много ядер с низкой частотой — Folia, сильное одно ядро — семейство Paper, технический Minecraft — Fabric или Leaves)
- **Подробное сравнение**: см. [Сравнение серверных ядер](/wiki/compare#mcsog-h-%E6%A0%B8%E5%BF%83%E5%AF%B9%E7%85%A7) — производительность, плагины, моды, сценарии

**Перед запуском ещё раз проверьте две вещи**: версия Java соответствует целевой версии MC, порт 25565 открыт и в security group, и в системном firewall.

Когда среда и ядро определены, напишите скрипт запуска и поднимите сервер: см. [Запуск сервера](/tutorials/java/start).
