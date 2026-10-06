---
title: Environment Setup (Windows and Linux)
slug: environment
cat: java
level: 1
order: 3
minutes: 20
mc: ["1.21.x", "1.20.4", "1.19.4", "1.18.2", "1.16.5"]
tags: [java, windows, linux, environment, java-version, ports, permissions]
updated: 2026-10-04
draft: false
---

This guide covers Windows and Linux together. Both require the **same four things**: **confirm the Java version → open the port → create the directories → install the right Java and configure it**.

The differences are only in command syntax, so every section gives two variants — **just follow the half that matches your system**.

## Step 1: Confirm the Version You Want to Run, Then Choose Java

**Get this step wrong and everything after it is wasted effort.** When the Java version does not match, the server crashes on startup and the log shows `UnsupportedClassVersionError`.

| Minecraft Java Edition | Java required officially | Details |
| --- | --- | --- |
| 26.1 and later | **Java 25** | The latest requirement (from 26.1) |
| 1.20.5 – 1.21.x | **Java 21** | 1.20.5 is the first full release requiring 21 |
| 1.18 – 1.20.4 | **Java 17** | The most common combination today |
| 1.17 – 1.17.1 | **Java 16** | Java 17 also starts normally |
| 1.12 – 1.16.5 | **Java 8** | Many older modpacks are still stuck on this tier |
| 1.7.10 and earlier | A lower official requirement | Java 8 is what people actually use |

:::note Source of the table above
The boundaries for 1.20.5 / 1.18 / 1.17 / 1.12 come from Mojang's official version manifest (the `javaVersion.majorVersion` field of each version at `piston-meta.mojang.com`); the Java 25 requirement from 26.1 comes from the version requirements list on the Minecraft Wiki. This is not guesswork.
:::

- **Paper, Purpur, Spigot, Fabric and Forge match the official requirements**: 1.20.5 and later need Java 21; 1.18–1.20.4 need Java 17.
- The table lists **minimum** requirements. A Java version that is too new can be incompatible with some plugins and mods, so **match the requirement exactly**.
- **Bedrock Edition (BDS) does not need Java** — it is a C++ program; just run `bedrock_server` (`bedrock_server.exe` on Windows).

## Step 2: Open the Port

| Port | Protocol | Purpose |
| --- | --- | --- |
| 25565 | TCP | Java Edition game connections (**required**) |
| 25565 | UDP | Server list query (Query, optional) |
| 25575 | TCP | RCON remote console (optional, **do not expose it to the public internet**) |
| 19132 | UDP | Default Bedrock port (IPv6 uses 19133; needed only for cross-platform setups) |

:::note Where the ports come from
Java Edition defaults to **TCP 25565**; Bedrock **BDS uses UDP**, **19132** by default on IPv4 and **19133** on IPv6 (both can be changed in `server.properties`).
:::

### Cloud Security Group (mandatory on a cloud host)

In the cloud console, add an inbound rule for `TCP 25565` with source `0.0.0.0/0` under "Security Group / Firewall". **However correct your local firewall is, nobody can connect while the security group stays closed.**

### System Firewall

**Windows (GUI)**: `Control Panel → Windows Defender Firewall → Advanced settings → Inbound Rules → New Rule` → select "Port" → "TCP" → local port `25565` → "Allow the connection" → tick all three profiles → name it and save.

**Windows (command line, administrator PowerShell)**:

```powershell
New-NetFirewallRule -DisplayName "Minecraft Java 25565" -Direction Inbound -Protocol TCP -LocalPort 25565 -Action Allow
Get-NetFirewallRule -DisplayName "Minecraft*" | Select-Object DisplayName, Enabled, Direction
```

**Linux (ufw, Ubuntu / Debian)**:

```bash
sudo ufw allow 25565/tcp
sudo ufw status
```

**Linux (firewalld, CentOS family)**:

```bash
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

:::warn With Docker, the host firewall cannot control container ports
If you plan to run the server with **Docker / Docker Compose** (see [Deploying Java Edition with Docker](/en/tutorials/java/docker)), then **`ufw` and `firewalld` have no effect on the ports described here**.

Docker writes its own forwarding and NAT rules into `iptables` and inserts them **ahead of** the host firewall rules. As a result, even after `sudo ufw deny 25565`, the outside world **can still reach a port published by a container**. This is intended Docker behaviour, not a misconfiguration.

Four workable approaches, **ordered by how much we recommend them**:

1. **Bind the port to loopback only** (safest and simplest): `-p 127.0.0.1:25565:25565`, so the container port is **never exposed publicly**; put a reverse proxy (Nginx `stream`, frp, an accelerator) on the host in front of it when external access is needed.
2. **Use the [ufw-docker](https://github.com/chaifeng/ufw-docker) script so UFW governs containers again** (**pick this when you want UFW to stay your single entry point**): one command to install, then `ufw route allow proto tcp from any to any port 25565` opens a container port and `ufw route delete allow …` closes it again — **without disabling Docker's iptables and without writing iptables rules by hand**. See [Deploying Java Edition with Docker → 5.2 The four correct approaches](/en/tutorials/java/docker#52-the-four-correct-approaches).
3. **Hand-write rules in the `DOCKER-USER` chain**: Docker reserves this chain for you and never overwrites it, which suits small source-restriction cases.
4. Set `"iptables": false` in `/etc/docker/daemon.json` and maintain forwarding yourself — **this also disables port publishing (unless you write the NAT rules yourself) and is not recommended for beginners**.

Full details: [Deploying Java Edition with Docker → Networking and Firewall](/en/tutorials/java/docker#5-networking-and-firewall-the-easiest-place-to-get-burned).
:::

### Verifying

```powershell
netstat -ano | findstr :25565
```

```bash
sudo ss -tlnp | grep 25565
```

External reachability must be tested from **another machine**: `telnet your.public.ip 25565`, or an online port-checking tool. **The port is not listening until the server is running**, so start the server first and test afterwards.

## Step 3: Create the Directories

:::warn Do not use non-ASCII characters or spaces in paths
Paths such as `C:\我的服务器\1.20 服务端\` or `/home/我的服务器/` make some startup scripts and plugin configs fail to parse, and the error messages are usually hard to understand. **Use short, pure-ASCII paths with no spaces.**
:::

Both systems use **the same layout**, so migrating from Windows to Linux later is just a matter of copying the whole tree:

```
mcserver/
├── survival/          # all files for a single server
│   ├── server.jar     # server core
│   ├── eula.txt       # must be accepted or the server will not start
│   ├── server.properties
│   ├── world/         # world data (always back this up separately)
│   ├── plugins/       # Paper / Purpur / Spigot
│   └── mods/          # Fabric / Forge
└── backups/           # backup directory; keeping it apart from the runtime directory is safer
```

**Windows**:

```powershell
New-Item -ItemType Directory -Force -Path C:\mcserver\survival, C:\mcserver\backups
```

**Linux** (use a dedicated user; never run the server as root):

```bash
sudo useradd -r -m -d /opt/mcserver mcserver
sudo mkdir -p /opt/mcserver/survival /opt/mcserver/backups
sudo chown -R mcserver:mcserver /opt/mcserver
sudo -iu mcserver
```

**After you put the server core into `survival`, the first launch generates `eula.txt`**; change `eula=false` to `eula=true` to accept the [Minecraft EULA](https://aka.ms/MinecraftEULA). **Leave it as it is and the server exits immediately after starting.**

## Step 4: Install Java and Configure the Environment

**Eclipse Temurin (Adoptium)** is recommended: free, open source and maintained long term, it is the most widely used OpenJDK distribution in the server community.

### Windows: Installation

Download the **JDK `.msi` installer** from the Adoptium website (the `.jar` build is the runtime; the `.msi` is the JDK with a wizard). Java 21 corresponds to `temurin-21-jdk`, Java 17 to `temurin-17-jdk` and Java 8 to `temurin-8-jdk`.

The installer includes a **`Set JAVA_HOME variable`** entry; set it to **Will be installed on local hard drive** and the environment variable is configured for you.

After installing, open a **new** PowerShell window and verify:

```powershell
java -version        # should print openjdk version "21.x.x" ...
```

### Linux: Installation

```bash
# Ubuntu / Debian: Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk-headless

# When Java 17 is needed
sudo apt install -y openjdk-17-jdk-headless
```

```bash
# CentOS family
sudo dnf install -y java-21-openjdk-headless
```

To switch the default when several versions are installed side by side:

```bash
sudo update-alternatives --config java
java -version
```

:::tip The headless build is enough
`-headless` ships without GUI components and uses less memory; a server has no use for a GUI, so **prefer headless**.
:::

### Configuring Environment Variables Manually (when the installer option was not ticked, or you use the portable ZIP build)

**GUI**: `This PC → right-click Properties → Advanced system settings → Environment Variables`, then under **System variables**:

1. Create `JAVA_HOME` with the JDK install directory as its value, for example `C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot` (**without** `\bin`)
2. Edit `Path` and add an entry `%JAVA_HOME%\bin`
3. Click OK to save, then open a **new** PowerShell window to verify

**Command line** (administrator rights required; `setx` only affects new windows):

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot" /M
setx Path "%Path%;%JAVA_HOME%\bin" /M
```

:::warn The risk of overwriting Path with setx
`setx Path` writes the Path resolved **at that moment**. If the original Path is very long or contains variable references, appending directly can truncate it. **Editing through the GUI is safer.**
:::

On **Linux**, a JDK installed through the package manager is usually already on `PATH`; if you use a portable tar.gz, set it in `~/.bashrc` or under `/etc/profile.d/`:

```bash
export JAVA_HOME=/opt/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

**Verify**:

```powershell
echo $env:JAVA_HOME      # cmd: echo %JAVA_HOME%
java -version
where.exe java           # should point to %JAVA_HOME%\bin\java.exe
```

```bash
echo $JAVA_HOME
java -version
which java
```

### Running Multiple Versions Side by Side

**Windows** has no `update-alternatives`. The most reliable approach is to install several JDKs, leave the system default alone, and hard-code the absolute path to `java.exe` in each server's startup script.

`C:\mcserver\survival\start.bat`:

```bat
@echo off
cd /d "%~dp0"
"C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\bin\java.exe" -Xms2G -Xmx4G -jar server.jar nogui
pause
```

- **Always wrap the path in double quotes** — `Program Files` contains a space, and the command fails without them
- `cd /d "%~dp0"` pins the working directory to the script's own directory
- `pause` stops the window from closing immediately when something goes wrong, so you can read the error

**Linux** uses `update-alternatives` to switch, or hard-codes the path in `start.sh`:

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Xms2G -Xmx4G -jar server.jar nogui
```

```bash
chmod +x start.sh
./start.sh
```

## Step 5 (Recommended on Linux): Manage the Server with systemd

A manual `./start.sh` dies the moment you close SSH, and it cannot restart the server after a crash. For long-term hosting, run it as a service:

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

:::note screen is required
The unit above uses `screen` to keep the console available so you can type commands in game: `sudo apt install -y screen`, then use `screen -r mcserver` to return to the console.
:::

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `java: command not found` / `'java' is not recognized as an internal or external command` | Java is not installed, `PATH` is misconfigured, or the window was not reopened | Check `PATH` and try again in a **new** window |
| `UnsupportedClassVersionError ... class file version 65.0` | The Java version is too old (65 = Java 21) | Switch to the matching Java version from the table above |
| The startup script window flashes past on a double-click | The window closes automatically after an error | Add `pause` at the end of the script, or run it in a terminal to see the output |
| The server exits immediately and the log mentions the EULA | The EULA was not accepted | Set `eula=true` in `eula.txt` |
| `Address already in use` | Port 25565 is taken | Windows: `netstat -ano \| findstr :25565`; Linux: `ss -tlnp \| grep 25565`, find the PID and end it |
| `Could not reserve enough space for object heap` | `-Xmx` exceeds available memory | Lower `-Xmx` (for example `-Xmx2G`) |
| You can telnet in yourself but others cannot connect | Only the local firewall was configured; the cloud security group is still closed | Add the inbound rule in the cloud console |
| Plugins/mods report strange path errors | The directory contains non-ASCII characters or spaces | Move to a pure-ASCII path such as `C:\mcserver` or `/opt/mcserver` |
| `Permission denied` on Linux | The server files were created by root and a normal user cannot write to them | `sudo chown -R mcserver:mcserver /opt/mcserver` |
| Windows drops the connection after the PC sleeps | Sleep interrupted the service | Set the power plan to "Never" sleep, or switch to a machine that stays online |

## Next Step

With the environment ready, you can install the server core:

- **Choosing a server**: see [Choosing a Server Core](/tutorials/java/core) — pick a core by hardware and playstyle (Folia for many slow cores, the Paper family for a strong single core, Fabric or Leaves for technical play)
- **Item-by-item details**: see [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison) — performance, plugins, mods and use cases at a glance

**Confirm two things before you start**: the Java version matches the target MC version, and 25565 is open in both the security group and the system firewall.

Once the environment and the core are settled, write a startup script and get the server running: see [Starting the Server](/tutorials/java/start).
