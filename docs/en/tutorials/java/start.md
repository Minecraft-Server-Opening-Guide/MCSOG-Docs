---
title: Starting the Server
slug: start
cat: java
level: 1
order: 5
minutes: 14
mc: ["26.1+", "1.21.x", "1.20.4", "1.18.2", "1.16.5"]
tags: [java, startup-script, bat, sh, eula, auto-restart, wildcards]
updated: 2026-10-04
draft: false
---

The prerequisites are all in place: **Java is installed, the port is open, the directories exist, and the core is chosen and downloaded**. This guide gets the server actually running.

:::note New Forge and NeoForge can skip this guide
Once installed with the official **installer**, new versions of **Forge** and **NeoForge** **generate a startup script automatically** in the server directory (`run.bat` / `run.sh`). If you use them, just run that script — there is no need to write a startup script by hand.
:::

## 1. Writing a Startup Script

Put the downloaded server core (`.jar`) into the deployment directory, for example:

```
C:\mcserver\survival\        (on Linux: /opt/mcserver/survival/)
├── paper-1.21.4.jar         ← the core you downloaded
└── (the remaining files are generated automatically on first launch)
```

### Windows: `start.bat`

1. In this directory, create a new **text document** and rename it to `start.bat` (change the extension from `.txt` to `.bat`).
2. Right-click → open it with a text editor, write the following content and save:

```bat
@echo off
cd /d "%~dp0"
java -Xms2G -Xmx2G -jar <core-name>.jar --nogui
pause
```

Replace `<core-name>.jar` with your actual filename (for example `paper-1.21.4.jar`).

- `cd /d "%~dp0"` pins the working directory to the script's own directory, so double-clicking still finds the core file.
- `--nogui` means the server's built-in graphical window is not opened and all output goes to the command line (`nogui` is the older alias; the two are equivalent).
- `pause` stops the window from closing immediately after the server exits, which makes errors readable — see "Extras" below.

### Linux: `start.sh`

```bash
#!/bin/sh
cd "$(dirname "$0")"
exec java -Xms2G -Xmx2G -jar <core-name>.jar --nogui
```

Grant execute permission and run it:

```bash
chmod +x start.sh
./start.sh
```

## 2. First Launch: Let It Download, Then Accept the EULA

**The first launch downloads the files it needs to run**, and the command line shows output like `Downloading mojang_x.x.x.jar` — this is normal, so **just wait for it to finish** (if it stalls indefinitely on a mainland connection, you will need your own network acceleration).

Once the download finishes, the server **does not start directly**; instead it prints:

```
You need to agree to the EULA in order to run the server. Go to eula.txt for more info.
```

Now open the **automatically generated `eula.txt`** in the directory with a text editor and change:

```
eula=false
```

to:

```
eula=true
```

Save the file and **run the startup script again**. This action means you have read and accepted the [Minecraft EULA](https://aka.ms/MinecraftEULA).

:::warn It will not start until you change it
With `eula=false` the server **exits immediately after starting**, which is the most common stumbling block for beginners.
:::

## 3. What Counts as a Successful Start

When the command line shows the following line, the server **has started successfully**:

```
Done (6.554s)! For help, type "help"
```

The number of seconds in brackets varies by machine. At this point:

- On the **same machine** you can connect with `localhost:25565`;
- Others connect with **your public IP** (or domain name) plus the default port `25565`;
- Typing `stop` in the console **shuts the server down safely** (**do not just close the window**, it can corrupt the world).

## 4. Extras: Three Practical Tips

### 1. Add `pause` to See Logs When It Crashes

When a Windows `.bat` file is double-clicked and the server crashes, the window **flashes past** and you see nothing. Add `pause` as the **last line** of the script:

```bat
java -Xms2G -Xmx2G -jar <core-name>.jar --nogui
pause
```

The window then stays open after the server exits and you can read the error clearly (on Linux the equivalent is adding `read -n 1 -p "Press any key to continue..."` at the end of the script).

### 2. Use Wildcards So a Core Update Does Not Touch the Script

Editing the filename in the script on every core update is tedious. You can match with a **wildcard**:

```bash
java -jar *.jar
java -jar paper-*.jar
java -jar leaf-*.jar
```

:::warn Wildcards do not work in a Windows .bat file
This difference is **confirmed by testing**: **the Linux / macOS shell expands wildcards**, but **Windows cmd does not** — it passes your `*.jar` to Java verbatim, and Java then errors out because no such file exists.

On Windows, use a `for` loop to achieve the same effect:

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

Replace `paper-*.jar` with your core's prefix (such as `leaf-*.jar`) and you never have to edit the script for a version update.
:::

### 3. Automatic Restart After a Crash

**Windows** (`start.bat`):

```bat
@echo off
cd /d "%~dp0"
:start
java -Xmx4G -Xms1G -jar server.jar nogui
echo Server crashed, restarting in 3 seconds...
timeout /t 3
goto start
```

**Linux** (`start.sh`):

```bash
#!/bin/bash
cd "$(dirname "$0")"
while true; do
    java -Xmx4G -Xms1G -jar server.jar nogui
    echo "Server stopped, restarting in 3 seconds..."
    sleep 3
done
```

:::warn Think it through before enabling automatic restart
Automatic restart suits an **unattended long-running server**. But if the server fails to start because of a **configuration error** (a wrong Java version, an occupied port, for instance), it will **restart every 3 seconds and flood the screen**, hiding the real error instead. **Do not use automatic restart while debugging for the first time** — get it running manually first.
:::

:::tip systemd is preferable for long-term Linux hosting
The `while` loop above is killed when SSH disconnects. If you want the server to **start on boot, restart after a crash and survive an SSH logout**, systemd is the better fit — see step 5 of "Environment Setup (Windows and Linux)".
:::

## 5. Next Step

Once the server is running, continue in this order:

- **Understand the directory first**: see [Server Directory Structure](/tutorials/java/structure) — which files you can touch and back up
- **Then change the configuration**: see [Configuring the Server](/tutorials/java/config) — online mode, difficulty and view distance all live here
- **Let others connect too**: see [Deploying to a Reachable Environment](/tutorials/java/deploy)
- **Change cores / compare**: see [Choosing a Server Core](/tutorials/java/core) and [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison)
