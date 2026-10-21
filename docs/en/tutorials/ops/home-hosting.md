---
title: Hosting on a Home PC: Setup and Long-Term Maintenance
slug: home-hosting
cat: ops
level: 3
order: 9
minutes: 18
tags: [ops, home-hosting, setup, maintenance, power, thermals, networking]
updated: 2026-10-04
draft: false
---

For many people the first "server" is the PC already sitting on their desk. It is cheap, fast, and entirely under your control, but it was **not designed to run 24/7**. This article covers two things: whether a home PC is the right choice at all, and, if you go ahead, **how to keep it alive over the long run**.

If you have not picked an approach yet, start with the three-route comparison in [Deploying to a Reachable Environment](/tutorials/java/deploy).

## 1. Is a Home PC Suitable for Hosting

Separate "it can run" from "it can run for months". A home machine running a Minecraft server is usually **more than fast enough** (modern desktop CPUs beat same-priced cloud instances on single-core performance). The real weaknesses are **reliability, networking, and the cost of operations**.

| Dimension | Home PC | VPS / cloud server |
| --- | --- | --- |
| Upfront cost | Nearly zero if you own the machine | None, but you pay monthly |
| Running cost | **Electricity** (see below), plus cooling in summer | Monthly fee, higher for better specs |
| Single-core speed | Usually stronger, clearly better value | Weaker at the same price |
| Public IP | **Most home connections have no public IPv4** | Normally included |
| Power | Your own outage takes it down; a UPS helps | The data centre has UPS and generators |
| Network | Small upload, possibly throttled by the ISP | Large, symmetric bandwidth |
| Noise and heat | In your room | In a data centre |
| Migration and scaling | You buy the hardware | A few clicks in a panel |
| Attacks | Your home IP is hit, the whole household suffers | The data centre is hit; protection can be bought |
| Data safety | A dead disk is your problem | Snapshots are common, but **providers do disappear** |

### When to Use a VPS Instead

Go straight to a VPS if you are often away from home (you cannot respond to a local outage remotely), if you already have more than a dozen players (upload bandwidth runs out first), if you do not want a DDoS aimed at your household connection, if noise and heat matter (dorm, shared flat, bedroom), or if **your data matters more than the money you save**.

### The "24/7" Requirement, and What Breaks It

A home machine fails to stay online around the clock not because the hardware is weak, but because of these:

| Cause of downtime | Explanation | Mitigation |
| --- | --- | --- |
| Sleep and hibernation | The default power plan sleeps after idle time and **the server simply drops offline** | Disable sleep (section 2) |
| Power outage | The most common cause, and it **can corrupt the world** | UPS plus BIOS restore-on-power |
| Automatic update reboots | Windows reboots at night by default | Set active hours, or schedule a reboot window |
| Router reboots or PPPoE drops | Common on home lines | Periodic checks; DDNS for changing IPs |
| Thermal throttling or protective shutdown | Dust blockage, stopped fan | Clean the machine, monitor temperatures |
| You, by accident | Kicking the case, unplugging the wrong cable | Physical safety (section 8) |

:::warn An unexpected shutdown costs more than you think
If the server is writing chunks when power is lost, the worst case is **a corrupted world**, recoverable only from the last usable backup. That is why section 2 and [Backup and Restore](/tutorials/java/backup) belong together: **power protection and backups are both mandatory**.
:::

### Electricity: Do the Math First

Cost = power (kW) x time (h) x your tariff per kWh. A plug-in power meter gives the real number; the figures below are **order-of-magnitude estimates** and vary widely:

| Scenario | Whole-system draw (order of magnitude) | Per month (30 days) |
| --- | --- | --- |
| Low-power mini PC or laptop | 10 - 25 W | 7 - 18 kWh |
| Desktop at idle or light load | 40 - 80 W | 29 - 58 kWh |
| Desktop under sustained load (fast CPU, idle discrete GPU) | 120 - 250 W | 86 - 180 kWh |

Multiply those kWh by your local tariff to get the monthly cost. **A discrete GPU draws power even at idle** (commonly 5 - 20 W depending on the model), so a dedicated server can use integrated graphics or drop the card entirely. In summer, air conditioning multiplies that heat into **one to two times more** electricity again.

## 2. Power Stability

### Why Losing Power Mid-Save Is Dangerous

Minecraft writes chunks **across many separate files**, so losing power during a write can leave **half-written files** behind. The mild outcome is a few missing chunks; the severe one is a world that will not load. Even `save-all` cannot guarantee that every file on disk is consistent at the instant power fails. **That is the reason a UPS and backups exist** - not to keep players online, but to **give the server a chance to shut down cleanly**.

### UPS Sizing for a Home Host

The goal is not to keep playing for hours. It is to **ride out short flickers and buy the few minutes needed for a clean shutdown**.

How to estimate:

1. Measure the whole-system draw `P` in watts.
2. Decide the runtime `T` you need in minutes; **5 - 15 minutes** is usually enough at home.
3. Required capacity (Wh) is roughly `P x T / 60 / 0.6`, where 0.6 is a conservative allowance for inverter losses and battery ageing.
4. Converting to VA depends on the power factor. Home UPS units commonly sit around 0.5 - 0.6 PF, so **trust the wattage printed on the unit's rating label**, not the VA figure.

Example: an 80 W system that must survive 10 minutes needs roughly `80 x 10 / 60 / 0.6 = 22 Wh` of usable capacity, so a **500 - 650 VA / around 300 W** standby unit has headroom. **Actual capacity and outlet configuration vary by model**, so check the vendor datasheet rather than buying from a rule of thumb.

| UPS type | Characteristics | Suitable for |
| --- | --- | --- |
| Standby | Cheapest; a few milliseconds of transfer time | Small home hosts with a decent PSU |
| Line-interactive | Includes AVR; faster transfer | Unstable mains areas; generally recommended |
| Online (double conversion) | Inverter runs continuously, cleanest output, most expensive and hottest | Equipment that is very sensitive to input |

### Why Pure Sine Wave Matters

An active-PFC power supply **is sensitive to the input waveform**. A square or stepped approximation of a sine wave can make an active-PFC PSU **misdetect the input, buzz audibly, or shut down outright** - exactly when the mains has failed and you need it most. Therefore:

- Confirm the UPS output is **pure sine wave**, not "simulated sine" or "stepped approximation".
- The risk grows as the load approaches the UPS rating.
- **Compatibility depends on the specific PSU and UPS models**, so check the vendor documentation before buying.

:::tip Add surge protection while you are at it
Lightning and mains surges are a separate killer. UPS units usually include surge protection; if you skip the UPS, at least use a proper surge-protected power strip.
:::

### Make the OS Never Sleep

**Windows (administrator PowerShell or Command Prompt)**

```bat
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change disk-timeout-ac 0
```

- `standby-timeout-ac 0` means **never sleep while on AC power** (`0` is "never").
- A desktop has no battery, so `-ac` is the setting that matters; on a **laptop** also set `-dc`, otherwise it still sleeps on battery.
- Inspect the current values with `powercfg /query SCHEME_CURRENT SUB_SLEEP`.
- Note that Windows Fast Startup and hibernation are separate features, and group policy or vendor power software can override these values.

**Linux (systemd)**

First see which targets are reachable:

```bash
systemctl status sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Then block them:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

**Closing the lid on a laptop** is handled by logind. Edit `/etc/systemd/logind.conf`:

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Apply the change with `sudo systemctl restart systemd-logind`.

:::warn Key names and defaults vary by distribution and systemd version
The accepted values in `logind.conf` (`ignore`, `poweroff`, `suspend`, `hibernate`, `lock`) and the default behaviour are not identical across distributions and systemd versions. **Read `man logind.conf` before editing**, and confirm that a desktop environment's own power settings will not override your change; GNOME and KDE both have their own "suspend after blank screen" switch.
:::

### BIOS: Power Back On After an Outage

After mains power returns, the machine **does not start by itself** unless you press the button - if you are away, the server simply stays down.

Open the BIOS/UEFI setup and look for an option with one of the names below (**the exact name depends on the motherboard vendor and BIOS version**, usually under `Power`, `Advanced`, or `APM Configuration`):

| Common name | Meaning |
| --- | --- |
| `Restore on AC Power Loss` | Behaviour after power returns; choose `Power On` / `Always On` |
| `AC Power Recovery` / `AC Recovery` | Same setting; common on Dell |
| `After Power Failure` | Same setting; common on DIY motherboards |

Choose **`Power On` / `Always On`**, not `Last State` (that only restores the previous state, so a machine that was off stays off).

Also check:

- **Disable Fast Startup** in Windows, which turns a shutdown into a hybrid hibernation and affects both auto-start and disk consistency.
- **Set a BIOS supervisor password** so nobody changes these settings by accident.
- For unattended machines, enable restore-on-power and disable every energy-saving standby option you find.

## 3. Thermals and Dust

### Airflow and Placement

- **Filter the intakes and keep the exhausts clear.** A layout that works well is front/bottom intake and rear/top exhaust, with **slightly more intake than exhaust** (positive pressure), which keeps dust from being pulled in through every gap.
- **Do not shut the machine in a closed cabinet**, against a wall, or on carpet. Leave space around it.
- **Hard drives hate vibration**: keep mechanical disks where they will not be kicked or knocked (section 8).

### Cleaning

| Interval | What to do |
| --- | --- |
| Every 1 - 3 months | Check the intake filters; clean them when visibly dusty |
| Every 3 - 6 months | Blow out the heatsink, fans, and PSU intake with compressed air |
| Every 6 - 12 months | Decide whether to repaste based on dust and temperatures (**not mandatory**; leave it alone if temperatures are fine) |

Cleaning notes: **hold the fan blades with a finger or a plastic strip while blowing**, so the airflow does not spin them up to high speed and damage the bearings; do not press a vacuum cleaner against circuit boards (static risk); after cleaning, **confirm every fan still turns**, including the PSU, GPU, and case fans.

### Temperature Monitoring

**Linux**: `lm-sensors` is the usual tool for reading motherboard and CPU temperature sensors. Whether it works and which sensors it exposes **depends on the motherboard and chipset drivers**; support is incomplete on some platforms, especially newer laptops and some boards.

```bash
sudo apt install lm-sensors      # Debian / Ubuntu
sudo dnf install lm_sensors      # Fedora / RHEL family
sudo sensors-detect              # probe for sensors, answer interactively
sensors                          # print current readings
watch -n 5 sensors               # refresh every 5 seconds
```

**Windows**: Task Manager (`Ctrl+Shift+Esc`) shows CPU and GPU temperature on the Performance tab (**availability depends on hardware and drivers**). For detail such as per-core values, disk SMART temperatures, and fan speeds, use a tool such as HWiNFO or HWMonitor.

### Symptoms of Overheating

| Symptom | Meaning |
| --- | --- |
| TPS drops suddenly while CPU usage stays low | The CPU is being throttled |
| CPU clock below its base frequency | Same cause; check live clocks with `lscpu`/`cpupower` or HWiNFO |
| Fans at full speed for long periods, louder than before | Dust build-up or dried thermal paste |
| Shutdowns or reboots with no explanation | Thermal protection tripped; **this is a serious signal**, act immediately |

Messages such as `CPU0: Core temperature above threshold` or `thermal throttling` in `dmesg` mean protection has already engaged. **The exact wording depends on your kernel and hardware**, so trust what your own machine prints.

## 4. Networking at Home

### Why Wi-Fi Is a Bad Idea for a Server

- **Latency jitter hurts more than average latency.** Minecraft is sensitive to loss and jitter; players experience it as rubber-banding, stutter, and teleporting.
- **Channel congestion** from neighbours gets worse in the evening.
- **Power saving** puts the wireless adapter to sleep, producing periodic latency spikes.
- **Stability**: access point reboots and firmware bugs all drop the link.

**Conclusion: use a cable whenever you can.** If the machine is far from the router, consider powerline adapters (heavily dependent on your wiring), MoCA over coax, or simply run a cable. The three subsections below cover the three most common home-connection traps.

### Do You Have a Public IPv4 Address?

1. Log in to the router and find the **WAN IP**.
2. From the machine, visit an "what is my IP" page, or run `curl -4 ifconfig.me`.
3. **If the two differ**, you are almost certainly behind carrier-grade NAT (CGNAT), **you have no public IPv4 address**, and port forwarding cannot help.
4. Supporting evidence: CGNAT WAN addresses often fall inside `100.64.0.0/10` (the RFC 6598 shared address space). **This is a common pattern, not a hard rule.**

:::warn IPv6 is an alternative, not a cure
Some home connections do get a public IPv6 prefix, which can work for direct connections, but **your players' networks may not support IPv6** and many clients still connect over IPv4. Confirm availability on the player side before relying on it.
:::

### Dynamic IPs and DDNS

Home public IP addresses **change** (redials, ISP reconfiguration). DDNS, dynamic DNS, exists for exactly this:

1. Register with a DDNS provider, or use your domain registrar's API.
2. Run an update client on the router or the machine that **reports the current public IP** at intervals.
3. Have players connect to the **hostname** instead of an IP.

Notes:

- **DDNS only solves "the IP changed, how do I find you"**; it cannot fix CGNAT. Without a public IP, DDNS is useless.
- Do not update too aggressively or you will be rate limited; a few minutes between updates is normally enough.
- If you use a tunnel such as frp, players connect to the **relay server's IP**, so DDNS is unnecessary.

### Upload Bandwidth Is the Bottleneck

Home connections typically offer **hundreds of megabits down but only tens up, sometimes less**. A Minecraft server's traffic is almost entirely **upload**, pushing world data to players.

As a rough guide, a player's bandwidth need is on the order of **tens to hundreds of kilobits per second**, depending heavily on view distance, entity count, and chunk loading speed, and it **fluctuates a great deal**. A crude conversion using Mbps:

| Upload bandwidth | Rough concurrent ceiling (assuming 0.5 Mbps per player) |
| --- | --- |
| 10 Mbps | around 20 players |
| 20 Mbps | around 40 players |
| 50 Mbps | around 100 players |

**This is an order-of-magnitude reference only.** Actual demand depends on gameplay; redstone, large entity counts, and high view distance push it up sharply. Always **measure**: watch the server process's upload usage in your router or OS tools.

:::tip Measure before you promise a player cap
After the server has been running a while, check real upload usage with `iftop` or `nload` on Linux, or Task Manager and Resource Monitor on Windows, and set your limit from that. **Do not estimate from your "500 Mbit down" figure.**
:::

## 5. Operating System Maintenance Routine

### Update Policy

- **Pick a fixed maintenance window** (weekly, for example) and do system updates and reboots inside it.
- **Back up before updating** (see [Backup and Restore](/tutorials/java/backup)) and confirm the backup is on **a different disk or offsite**.
- **Do not enable unattended automatic reboots.** Reboot when you chose to, not in the middle of the night.
- After a kernel or major-version upgrade, **reboot once and confirm the server is healthy**.

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt upgrade
sudo apt autoremove --purge
```

**Fedora / RHEL family**

```bash
sudo dnf upgrade --refresh
sudo dnf autoremove
```

**Windows**: Settings, Windows Update, Advanced options. Set active hours outside your maintenance window and restart manually for important updates.

### Disk Health (SMART)

`smartmontools` is the standard package for reading SMART data; `smartctl` is the command inside it.

```bash
sudo apt install smartmontools
sudo smartctl -a /dev/sda
```

:::warn Always confirm the device name
`/dev/sda` is only an **example**. NVMe drives are usually `/dev/nvme0n1`, and a SATA disk may be `/dev/sdb`. **Using the wrong name reads another disk's data and, for write operations, can destroy it.** Confirm first:

```bash
lsblk -o NAME,SIZE,MODEL,MOUNTPOINT
```
:::

**Attributes worth watching on SATA drives** (the attribute names and IDs come from the ATA/SMART standard, but vendors encode raw values differently, so **read VALUE/WORST/THRESH and RAW together with the vendor documentation**):

| Attribute | Meaning | How to read it |
| --- | --- | --- |
| `Reallocated_Sector_Ct` (ID 5) | Sectors remapped to spares | **Any non-zero value is a warning**; a rising count means the drive is degrading |
| `Current_Pending_Sector` (ID 197) | Sectors that failed to read and are not yet remapped | **Any non-zero value means back up now** |
| `Offline_Uncorrectable` (ID 198) | Sectors that offline scans could not correct | Non-zero means unrecoverable errors already exist |
| `UDMA_CRC_Error_Count` (ID 199) | Interface transfer errors | A rising count usually means **a cable or connector problem**, not a failing disk |
| `Reported_Uncorrect` (ID 187) | Uncorrectable errors reported to the host | Read it together with 197 and 198 |

**NVMe drives** report a different set of fields:

```bash
sudo smartctl -a /dev/nvme0n1
```

Watch `Percentage Used` (endurance consumed), `Available Spare`, `Media and Data Integrity Errors`, and `Critical Warning`.

**Periodic self-tests** take time, so run them in a maintenance window:

```bash
sudo smartctl -t short /dev/sda     # short test, usually 1-2 minutes
sudo smartctl -t long  /dev/sda     # long test, may take hours
sudo smartctl -l selftest /dev/sda  # show self-test results
```

**Monitoring advice**: `smartd` can run as a daemon and send alerts by mail. On a desktop, at minimum **check the values manually once a quarter**.

### SSD Endurance

SSD life is determined by **bytes written (TBW)**, not powered-on hours. Frequent full backups, chatty logging, and frequent `save-all` calls all consume it. Estimate total writes from `Data_Units_Written` (SATA) or `Data Units Written` (NVMe) in `smartctl`. **Writing logs and backups to a different disk** cuts system-disk writes substantially. Performance and endurance both degrade as an SSD fills, so **keep at least 10 - 20 percent free**.

### Filesystem Checks and Logs

- **ext4**: an unclean shutdown may require `fsck`. **Never run `fsck` on a mounted root filesystem**; modern distributions check automatically at boot. To check an unmounted partition manually, `umount` it first and then run `sudo fsck -f /dev/sdb1`.
- **Btrfs / ZFS**: each has its own check and scrub tools (`btrfs scrub`, `zpool scrub`). **Commands and usage differ between versions, so follow the official documentation.**
- **Log growth**: check systemd journal usage with `journalctl --disk-usage` and cap it with `sudo journalctl --vacuum-size=500M`. Rotation is handled by `logrotate`, which is configured by default on most systems.
- **Windows**: Event Viewer logs grow without limit. Set a maximum size and an overwrite policy under Event Viewer, Windows Logs, Properties; `cleanmgr` clears system files.

### Cleaning Up Old Backups

**This is where disks most often fill up.** The server directory keeps growing, and a policy of "keep everything" fills the disk within months - and **a full disk makes the server fail to save the world**. Set an explicit retention policy (seven daily copies plus four weekly, for example), have the script delete expired archives, and check free space with `df -h` regularly. See [Offsite Backup](/tutorials/ops/offsite-backup) for retention design and disk-space math.

## 6. Game Server Maintenance Routine

### Scheduled Restarts

**Periodic restarts** reclaim memory fragmentation and release resources that were never freed, so a restart every day or every few days at a low-traffic hour is common practice. Restart by sending `stop` to the console (**never kill the process**), wait for it to exit fully, then start it again, and **confirm the backup succeeded first**. Under systemd, `systemctl restart minecraft.service` performs a normal stop (provided the server receives `stop`; if your launch method cannot take console input, send the command through `screen`/`tmux` or RCON instead).

:::warn Killing the process is not a restart
`kill -9`, "End task" in Task Manager, and pressing the power button can all leave the server without time to save. **If `stop` is available, use `stop`.**
:::

### Confirm That Backups Really Run

**This is the most frequently skipped and most damaging item on any maintenance list.** Check the **modification time and size of the backup files** (not that a script exists), check the **exit code in the log** (non-zero means failure), and periodically **perform a real restore** (see the restore drill in [Offsite Backup](/tutorials/ops/offsite-backup)).

```bash
ls -lh /backup/mcserver/ | tail -5
tail -20 /var/log/mc-backup.log
```

### Reading Logs and Crash Reports

- **`logs/latest.log`** is the log for the current or most recent run. Search for `WARN`, `ERROR`, `Exception`, and `Caused by`.
- **`crash-reports/`** holds crash reports with full stack traces and environment details; **this is the primary source when diagnosing a crash**.
- Signals worth recognising: out of memory (`OutOfMemoryError`), plugin errors, failed chunk loads, and port conflicts.

```bash
grep -nE "ERROR|Exception|Caused by" logs/latest.log | tail -40
ls -lt crash-reports/ | head
```

### Checking TPS with spark

**spark** is the common profiling plugin/mod for Bukkit-family, Fabric, and Forge servers, sampling TPS, MSPT, and the source of lag. Typical commands are `/spark tps` and `/spark profiler start` / `/spark profiler stop` (**check spark's official documentation for exact subcommands**, which differ slightly between versions). **TPS below 20 for a sustained period means the server cannot keep up**, and **MSPT above 50 ms** means a single tick is overrunning. Use `/spark tps` to decide whether there is a problem at all, then the profiler to find what causes it; for systematic diagnosis see [Performance Tuning](/tutorials/java/optimize).

### Watching for Memory Growth

**A Java heap that looks full is not necessarily broken**: the collector retains some of it. What matters is whether **the old generation falls back after a full GC**. If usage **keeps climbing** after full GCs and never drops, you probably have **a memory leak** (commonly a plugin). Investigate with GC logging (JDK 9 and later use `-Xlog:gc*`; JDK 8 uses `-XX:+PrintGCDetails -XX:+PrintGCDateStamps`) or a spark sample. **Do not paper over a leak by raising `-Xmx`**; that only postpones the crash.

### Updating the Server Software Safely

Follow this sequence and skip no step:

1. **Take a full backup** (world, plugins, configuration) and verify the files exist with a sane size.
2. **Read the changelog and confirm the Java requirement**, watching for breaking changes such as configuration format changes, incompatible plugins, and a raised Java version.
3. **Test on a copy first**: duplicate the server directory, start it with the new build, and confirm it boots and loads plugins.
4. **Switch at a low-traffic hour**: stop the server, replace the jar, start it, watch the log, let players verify, and **keep the old build** so you can roll back immediately.

:::tip Write down the rollback plan before you update
"If the new build will not start, these are the commands I run" - write it out. Under pressure, memory misses steps.
:::

## 7. Windows-Specific and Linux-Specific Notes

| Topic | Windows | Linux |
| --- | --- | --- |
| Prevent sleep | `powercfg /change standby-timeout-ac 0` | `systemctl mask sleep.target ...`; laptops also need `logind.conf` |
| Keep the server running | Task Scheduler, a wrapper such as NSSM, or a `start.bat` loop | A systemd unit (recommended) |
| Scheduled jobs | Task Scheduler (GUI) | cron or systemd timers |
| Updates | Windows Update; watch active hours and automatic reboots | `apt` / `dnf`; you choose when to reboot |
| Disk health | Vendor tools plus Event Viewer | `smartctl` plus `smartd` |
| Temperatures | Task Manager, HWiNFO, or similar | `lm-sensors` (board support varies) |
| Logs | Event Viewer, size limit must be set manually | `journalctl` plus `logrotate` |
| Case sensitivity | **Insensitive** (`World` and `world` are the same) | **Sensitive** (`World` and `world` are different) |
| Line endings | CRLF can make scripts unrunnable on Linux | LF |

:::warn Case sensitivity is the classic cross-platform trap
Copy a working server directory from Windows to Linux and **a wrongly cased path in a plugin config** immediately turns into "file not found". Check the whole tree before migrating.
:::

## 8. Physical Security

Where the machine sits decides whether it gets interrupted:

- **Do not put it where it can be kicked or where cables can be tripped over** (walkways, under-desk foot space, beside the bed), and keep it away from drinks, aquariums, and windowsills; liquid inside a case is a write-off.
- **Avoid sockets that are easy to unplug by mistake** (a strip shared with a hairdryer or kettle is especially risky), and **set the case somewhere stable**; mechanical disks are sensitive to vibration.
- **Label the cables**: which one is power, which is Ethernet, which is the display. Fix the Ethernet run so the connector cannot be pulled out.
- Where possible, **keep the machine away from your everyday desk** so "I will just shut it down" and "I will just unplug that" happen less often.

:::tip Make a do-not-unplug label
Tape a note to the plug and the case: "This machine is a server. Do not cut power or unplug cables." If anyone else lives with you, that note is worth a great deal.
:::

## 9. Maintenance Calendar

Treat the table below as a minimum, and tighten or relax it to fit your situation.

| Period | Tasks |
| --- | --- |
| **Daily** | Confirm the server is online; scan `logs/latest.log` for ERROR lines; confirm last night's backup file was created |
| **Weekly** | Check free disk space (`df -h`); check the backup log exit code; check TPS (`/spark tps`); confirm there were no unexpected reboots |
| **Monthly** | Check the key SMART attributes (`smartctl -a`); review memory trends and full-GC behaviour; delete expired backups; review system updates and schedule a reboot inside the window |
| **Quarterly** | **Restore drill** (a real restore plus a start-up check); clean dust and check fans; check UPS battery status; review port forwarding, DDNS, and firewall rules; review disk growth and adjust retention |
| **Yearly** | Replace UPS batteries (model and condition dependent); assess hardware ageing (disk powered-on hours, SSD writes); re-verify that retention and offsite copies still work |

:::warn The restore drill is not optional
"the backup script runs every day" and "the backup can be restored" are two different claims. **A backup whose restore has never been tested is not a backup**; see [Offsite Backup](/tutorials/ops/offsite-backup).
:::

## 10. Summary

Hosting on a home PC **works, provided you treat reliability as something you actively maintain**: disable sleep, add a UPS and restore-on-power, use a cable, update and inspect the disks on a schedule, and genuinely restore a backup now and then. Do those things and a home machine will run for a long time.

Further reading: [Deploying to a Reachable Environment](/tutorials/java/deploy), [Server Directory Structure](/tutorials/java/structure), [Starting the Server](/tutorials/java/start), [Performance Tuning](/tutorials/java/optimize), [Backup and Restore](/tutorials/java/backup), [Offsite Backup](/tutorials/ops/offsite-backup).

> Commands and configuration are governed by each project's official documentation; motherboard, PSU, and UPS behaviour is governed by the vendor's specifications.
