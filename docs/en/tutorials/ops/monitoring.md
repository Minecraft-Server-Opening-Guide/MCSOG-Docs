---
title: Monitoring and Alerting
slug: monitoring
cat: ops
level: 3
order: 17
minutes: 16
tags: [monitoring, alerting, prometheus, grafana, uptime-kuma, tps, mspt, ops]
updated: 2026-10-04
draft: false
---

There are two typical ways a server goes wrong.

The first: a player says in the group chat that "the server is dead", you open the panel and indeed it will not start, and you start digging. **That is post-mortem analysis**, and the tool for it is [Analysing Server Performance with spark](/tutorials/ops/spark).

The second: the disk is down to 3% free, the backup script has failed three days running, memory has climbed until swap is in use, and **you have no idea** - until the world can no longer be written.

This article is about the second. There is really only one core question: **how do you make the machine come to you before something goes wrong, instead of waiting for you to go to it?**

This article and [Analysing Server Performance with spark](/tutorials/ops/spark) are complementary: spark answers "why was it lagging just now", while monitoring and alerting answer "is it about to break". For data safety see [Backup and Recovery](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup); for host hardening see [System Hardening](/tutorials/ops/system-security).

:::warn The configuration here follows the official documentation
The ports, paths, service names and configuration keys below **all vary with the distribution, the installation method and the software version**. The examples exist to show "what to configure"; they are **not a finished product you can copy verbatim**. Before you roll anything out, check it against the official documentation for Prometheus, node_exporter, Grafana, Uptime Kuma and NUT, and against the configuration files your own system actually generated.
:::

## 1. What Monitoring Actually Monitors

First separate two very different kinds of thing. Much of the frustration behind "monitoring is useless" comes from conflating them: **resource and service state** (CPU, memory, disk space and I/O, network, whether a service is running, whether a certificate is about to expire) consists of objective numbers you can plot as curves and is well suited to threshold alerts; **gameplay experience metrics** (TPS, MSPT, player count, login failure rate) must be exposed with the server's cooperation and are proxy indicators for "what players actually feel". The first category **must be monitored**, because its decline is gradual and invisible to the eye; the second is **worth monitoring**, but you have to know its limits: TPS is an average, so it flattens out spikes; when MSPT looks fine but players say it lags, the problem may be the network or the client.

### 1.1 The Checklist You Must Monitor

| Item | Why it is mandatory | How it typically goes bad |
| --- | --- | --- |
| Availability / uptime | A dead service that nobody notices is the most severe and most common incident | Process crash, killed by OOM, no autostart on boot |
| TPS / MSPT | Directly determines player experience, and is the basis for deciding whether to optimise | Entity pile-ups, plugin hotspots, chunk generation |
| CPU | The main thread is single-threaded, so **one core pegged at 100% drops TPS** even when the other cores are idle | More players, redstone machines, an oversold host |
| Memory | Both heap and resident memory creep up, and **climbing until swap is in use is the warning sign of disaster** | Memory leaks, a growing world, entities never collected |
| Disk space | **A full disk makes the server fail to save the world**, which puts it in the data-destroying category | Backup pile-ups, runaway logs, core dumps |
| Disk I/O | World saves, chunk loading and backups all consume I/O, and **while it is slow the CPU still looks idle** | Spinning disks, a nearly full SSD, backups competing with the game |
| Network | Saturated bandwidth and packet loss both knock players offline, and **the server's own metrics look completely normal** | Attacks, backup uploads saturating the uplink, a line fault |
| Player count | Both a business metric and **the most sensitive anomaly detector**: dropping to zero often precedes any alert | Server crash, attack, logins rejected |
| Whether backups succeed | When a backup fails you feel nothing, **until the day you need it** | Full disk, changed permissions, a script error nobody read |
| Certificate validity | For panels, status pages and websites over HTTPS, it **only surfaces on the day it expires** | Forgotten renewal, a failed auto-renewal job |

:::tip Why disk space comes first
Because it is the **only item on the list that directly destroys data**. High CPU or low TPS merely makes players uncomfortable; a full disk makes the server fail to save the world, and what you lose may be hours of progress or the whole save. So if you configure only one alert, configure the disk one.
:::

## 2. Post-Mortem Analysis vs. Pre-Emptive Alerting

The two terms are often used interchangeably, but they solve completely different problems.

| | Post-mortem analysis | Pre-emptive alerting |
| --- | --- | --- |
| When it fires | The problem has already happened and already affected players | The problem is forming, or has just happened |
| Typical tools | spark, logs, `crash-reports/` | Uptime Kuma, Prometheus + Alertmanager, systemd `OnFailure` |
| The question it answers | "What actually happened just now" | "Is something about to break" |
| Output | Call tree, flame graph, error stack | One notification, with "what to do about it" |
| Limitation | **Can only explain the past** | **Can only find problems you thought of in advance** |

**You need both, but they have different priorities.** Without pre-emptive alerting you learn the server is down from your players; without post-mortem analysis you know it went down but not why, and it will go down again.

### 2.1 Why "spark Is Enough" Is Wrong

A common misconception is "I can just run spark periodically and read the health report". spark's health report is indeed a good tool for long-term state, but it is **something you go and look at**: when the disk fills up at three in the morning, nobody is going to open spark. The essence of alerting is **turning "go and look" into "be told"**, so that "no time to check every day" stops being fatal.

:::note Do not expect monitoring to find everything
Monitoring can only find problems **you already thought of and are already collecting**. The first time you meet something like "a certain plugin grows 200 MB of memory every night at 3 a.m.", you usually have no metric that proves it. **The right approach is: one incident, one new monitor.** A monitoring system is grown, not configured all at once.
:::

## 3. Start With the Cheapest: Three Zero-Cost Options

Before installing Prometheus, do these three things first - they cover most "the server is down and nobody knows" scenarios and cost almost no time.

### 3.1 External Availability Checks: Uptime Kuma

The idea is simple: **have a machine that is not your server knock on the door at regular intervals**. Why must it be "not your server"? Because when the whole machine loses power, loses its network or freezes, **a monitoring script running on it dies along with it** and can report nothing - this is the most fundamental difference between external and local monitoring.

Uptime Kuma is a self-hosted monitoring tool that its authors describe as "an easy-to-use self-hosted monitoring tool": monitor types cover HTTP(S), TCP, HTTP(S) keyword and JSON query, WebSocket, Ping, DNS records, Push, Steam game servers, Docker containers and more; the official README states support for a **20-second** check interval, with notification channels including Telegram, Discord, Gotify, Slack, Pushover and email (SMTP) - **more than 90** notification services according to the official description; there is also multi-language support, multiple status pages, certificate information, proxy support and 2FA. For a Minecraft server, the three most practical monitors are:

| Monitor type | What it watches | Caveat |
| --- | --- | --- |
| TCP port | Whether the server process is listening on the port | **When the process is alive but frozen, the port is still open**, so it cannot detect "frozen" |
| Ping | Whether the host is reachable | Only proves the network layer is alive |
| HTTP(S) | Whether the panel, status page or website is available | Also shows the certificate expiry date |

**Put the monitoring on another machine or with another provider.** On the same machine, it disappears together with the server when the power goes.

### 3.2 systemd: Let the Service Report Its Own Failure

If the server is managed by systemd (see [System Hardening](/tutorials/ops/system-security)), then systemd already knows when "the service is down", and you only have to make it tell you. **First separate two options that are often confused**: `Restart=on-failure` **restarts the process automatically** when it exits abnormally (every long-running service should have it, to shorten downtime), while `OnFailure=` **triggers another unit** when the service enters the failed state (to send notifications, collect evidence, run cleanup).

`Restart=` is "self-healing" and `OnFailure=` is "alerting". **Configure both**, but do not expect `Restart=` to replace alerting: if the service is stuck in a crash-restart loop, `Restart=` only keeps the loop going, and you never learn about it. A minimal alert unit, plus the line in the server unit that references it:

```ini
# /etc/systemd/system/mc-alert@.service
[Unit]
Description=Send an alert for a failed unit (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Pass %i (the failed unit name) to your notification script
ExecStart=/usr/local/bin/mc-notify.sh "systemd unit %i entered the failed state"

# --- the following is the [Unit] section of the server unit ---
# When the service enters the failed state, start the template instance mc-alert@<this-service-name>.service
OnFailure=mc-alert@%n.service
```

Remember to run `systemctl daemon-reload` after the change, and then **actually break it once to verify**. An alert that has never been verified is the same as no alert.

:::warn Crash-restart loops hide problems
`Restart=always` plus "the players did not notice" can make a server that **crashes every ten minutes** look completely healthy. **Alerts must distinguish "restarts occasionally" from "keeps restarting"**, or you will be silently deceived for a long time. Check the restart counter and the most recent exit time in `systemctl status`.
:::

### 3.3 One cron Job Plus One Check Script

The crudest and most reliable approach: have cron run a script every minute, have the script exit non-zero when it finds something wrong, and let cron mail or your own notification script carry the result out.

**The key convention: the script expresses its result through its exit code.** `0` means everything is fine, **non-zero means something is wrong**. That way cron, a systemd timer or any other scheduler can all use the same logic.

```bash
#!/usr/bin/env bash
# /usr/local/bin/mc-healthcheck.sh
# Exit code convention: 0 = healthy, non-zero = problem (cron / systemd treats it as a failure)
set -uo pipefail
PORT="25565"        # port the server listens on
WARN_DISK=85        # disk usage alert threshold (percent)
fail=0
note() { printf '%s\n' "$*"; }
bad()  { printf 'FAIL: %s\n' "$*"; fail=1; }

# 1) Is anything listening on the TCP port (quote the ss filter expression so the shell does not split it)
if command -v ss >/dev/null 2>&1; then
  if ss -lnt "( sport = :${PORT} )" | grep -q .; then
    note "port ${PORT}: listening"
  else
    bad "port ${PORT} is not listening"
  fi
fi
# 2) Does the server process exist (the bracket form stops pgrep matching itself; adjust to your actual process name)
if pgrep -f '[s]erver\.jar' >/dev/null 2>&1; then
  note "server process: present"
else
  bad "server process not found"
fi
# 3) Root filesystem usage (df -P keeps the output format stable for column parsing)
used="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ -n "${used}" ] && [ "${used}" -ge "${WARN_DISK}" ]; then
  bad "disk usage on / is ${used}% (threshold ${WARN_DISK}%)"
else
  note "disk usage on /: ${used:-unknown}%"
fi
exit "${fail}"
```

Configure it in cron (once a minute):

```bash
# crontab -e
* * * * * /usr/local/bin/mc-healthcheck.sh || /usr/local/bin/mc-notify.sh "healthcheck failed on $(hostname)"
```

:::warn cron mail is often a black hole
On many systems cron mail either has no MTA configured or lands in a mailbox nobody reads. **Do not assume "cron will notify me"**; always verify it yourself: deliberately make the script fail and check that the notification really reaches you.

The example above uses `/usr/local/bin/mc-notify.sh`, which **you have to implement yourself**: the simplest approach is a POST to a webhook, or calling Uptime Kuma's Push monitor URL. Which channel to use depends on the tools you already have, and **the exact interface follows that tool's official documentation**.
:::

:::note How to get TPS and MSPT into the script
The script above does not check TPS or MSPT, because **those two values are not at the operating-system level**; only the server, a plugin or MCDR can expose them. Once you have the values, the comparison itself is simple; note that shell only compares integers, so use `awk` for floats:

```bash
mspt="$(your-command-to-read-mspt 2>/dev/null)"
if [ -n "${mspt}" ] && awk -v v="${mspt}" -v m="50" 'BEGIN {exit !(v > m)}'; then
  bad "MSPT ${mspt} exceeds 50"
fi
```

**How you obtain the values varies by core, version and plugins; follow the official documentation of whatever you use.**
:::

## 4. The Proper Setup: node_exporter + Prometheus + Grafana

The three zero-cost options tell you "whether it is down", but they cannot answer "how did the disk get this full" or "what time did memory start climbing". For that you need a system that **stores history and plots it as curves**.

### 4.1 What Each of the Three Components Does

| Component | Role | In one line |
| --- | --- | --- |
| node_exporter | Collector (exporter) | Turns host CPU, memory, disk, network and other metrics into text on an HTTP endpoint and waits to be scraped |
| Prometheus | Time-series database + scraper | **Periodically pulls** the metrics an exporter exposes, stores them as time series, and evaluates rules to decide whether to alert |
| Grafana | Visualisation | Connects to Prometheus and turns time series into graphs and dashboards |
| Alertmanager | Alert routing | Once Prometheus decides "this should alert", Alertmanager handles grouping, deduplication, silencing and delivery (see section 6) |

**It is important to understand the "pull" model**: exporters do not push data to Prometheus; **Prometheus pulls on a schedule**. The side effect is very useful - when it cannot scrape a target, Prometheus knows by itself that "it is down", and that `up` metric is the most basic availability monitoring there is.

### 4.2 node_exporter and a Minimal systemd Unit

node_exporter is a single binary that exposes metrics on a default port once it runs. The official documentation's way to verify it is:

```bash
./node_exporter                              # run it in the foreground
curl http://localhost:9100/metrics           # confirm the metrics can be read (default port 9100)
curl http://localhost:9100/metrics | grep "node_"   # only the host metrics with the node_ prefix
```

The official documentation states that host metrics carry the `node_` prefix, for example `node_cpu_seconds_total` (cumulative time per CPU mode; combine with `rate()` to get utilisation), `node_filesystem_avail_bytes` (bytes available to non-root users on a filesystem) and `node_network_receive_bytes_total` (cumulative bytes received by a network interface). The example unit in the upstream repository uses **socket activation** (`Requires=node_exporter.socket` plus `--web.systemd-socket`), so that file **cannot be used on its own** and needs the matching socket unit; here is a more direct version that does not rely on socket activation:

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
# With a distribution package, the user and binary path are usually provided by the package (commonly prometheus-node-exporter)
User=node_exporter
Group=node_exporter
# The binary path depends on how you installed it: the upstream binary is commonly /usr/local/bin/node_exporter
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Enable and verify:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
systemctl status node_exporter --no-pager
curl -s http://127.0.0.1:9100/metrics | head
```

:::warn Paths, users and ports all have to be adapted
The `User=`, the `ExecStart=` path and the listening port above **are only illustrative**. Distribution packages and upstream binaries install to different locations, and whether the user exists depends on the package; **port 9100 is a default, not a requirement**, and if you change it you must change the Prometheus target to match. Some node_exporter collectors (especially those reading systemd or logs) are not cheap on a busy machine, and **inside a container you often need extra mounts to see host metrics**; which collectors to enable is governed by the official documentation and `--help` output of the version you installed.
:::

### 4.4 A Minimal Prometheus Configuration

Below is the minimal scrape configuration from Prometheus's official node_exporter guide, with the fields needed for rule evaluation and alerting added:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s      # official default is 1m; set explicitly to 15s here
  scrape_timeout: 10s       # must not exceed the scrape interval; official default is 10s
  evaluation_interval: 1m   # rule evaluation interval; official default is 1m

rule_files:                 # alert rule files (section 5 gives example contents)
  - /etc/prometheus/rules/*.yml

alerting:                   # who handles an alert once it fires (section 6)
  alertmanagers:
    - static_configs:
        - targets:
            - 127.0.0.1:9093

scrape_configs:
  - job_name: node          # host metrics: the minimal example from the official guide
    static_configs:
      - targets: ['localhost:9100']

  - job_name: prometheus    # scrapes itself, so you can confirm it is healthy
    static_configs:
      - targets: ['localhost:9090']
```

Validate and reload the configuration:

```bash
# Use the official validation tool so you do not restart with a syntax error
promtool check config /etc/prometheus/prometheus.yml
# Reload (requires --web.enable-lifecycle at startup)
curl -X POST http://127.0.0.1:9090/-/reload
```

:::note The ports and paths are all defaults
`9090` (Prometheus) and `9093` (Alertmanager) are the **default ports** of those two projects and can be changed in startup arguments or configuration. Configuration file paths differ by distribution and installation method; `/etc/prometheus/` is merely the common location on Debian-family systems. **Do not copy them blindly - first check where the files actually are on your system.**
:::

### 4.5 Grafana

Grafana's role is to draw the data in Prometheus. Its default port is `3000`, and the configuration and data directory locations vary with the installation method. For a Minecraft host, four graphs are enough to start with: disk usage (`node_filesystem_avail_bytes` and `node_filesystem_size_bytes`), CPU usage (`rate(node_cpu_seconds_total[5m])`), memory and swap (`node_memory_*`), and disk I/O wait (`rate(node_cpu_seconds_total{mode="iowait"}[5m])`).

:::tip Panels must be able to answer "how does this compare with last week"
A panel showing a single current value is nearly worthless. **Every graph must let you switch the time range**, so that you can see "which day the disk started falling faster" or "which version update memory started climbing after". This is also why you must store history rather than only looking at the present.
:::

## 5. Alert Thresholds: What to Set and Why

Thresholds are not "the more sensitive the better". **Set them too loose and the incident has already happened; set them too tight and by day three you are ignoring every notification.** What follows are common community starting points; adjust them to your own baseline.

| Item | Suggested starting point | Why this value | Common causes of false positives |
| --- | --- | --- | --- |
| Disk usage | **Above 85%** | Leaves enough time to act before it fills; filling up directly causes save failures | Temporary backup files, lagging log rotation |
| MSPT | **Sustained above 50 ms** | 50 ms is the per-tick budget corresponding to 20 TPS; sustained exceedance means TPS can no longer hold | A single spike hidden by the average, hence the "sustained" condition |
| Backup job failure | **Alert on any single failure** | A failed backup has no other symptom; only it can report itself | A wrong exit code in the script, a temporarily full disk |
| Service not running | **`systemd` state is failed or not active** | The most basic availability; somebody must know | A planned restart without a maintenance window |
| High memory with swap in use | **Swap usage sustained above 0** | Once paging starts, latency degrades sharply; **"high memory but no swap" usually just means memory is being wasted, and does not necessarily need an alert** | The system normally has a little swap activity |
| Sustained high CPU | **Sustained near single-core saturation** | The Minecraft main thread is single-threaded; **one saturated core is enough to drop TPS**, regardless of whether the other cores are idle | Normal peaks such as backups or world generation |
| Certificate expiry | **Less than 14 days remaining** | Leaves enough time to handle a failed auto-renewal | A multi-domain certificate where only one is monitored |

### 5.1 One Genuinely Useful Alert Rule

"Above 50" is a problematic condition in itself: a single momentary spike triggers it. To express "sustained above", you need `for`:

```yaml
# /etc/prometheus/rules/minecraft.yml
groups:
  - name: minecraft-host
    rules:
      - alert: HostDiskSpaceLow
        # available disk ratio below 15% (that is, usage above 85%)
        expr: |
          (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
            / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) < 0.15
        for: 15m          # fire only after this long, to ride out temporary fluctuations
        labels:
          severity: critical
        annotations:
          summary: "Less than 15% disk space remaining (mountpoint {{ $labels.mountpoint }})"
          description: "Free space on host {{ $labels.instance }} is low; a full disk prevents the server from saving the world."

      - alert: HostHighMemoryWithSwap
        # used swap sustained above 0
        expr: node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Host has started using swap"

      - alert: NodeExporterDown
        # scrape failure: the target is unreachable or the exporter is down
        expr: up{job="node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Cannot scrape host metrics ({{ $labels.instance }})"
```

**Note the division of labour between `for` and `expr`**: `expr` decides "is the condition true right now", `for` decides "how long has it been true". **An alert without `for` will almost certainly be noisy.**

:::warn TPS and MSPT have to be wired in by you
The rules above use only node_exporter metrics, and **it cannot see TPS or MSPT**. To monitor in-game metrics you need something that exposes them as Prometheus metrics (a server plugin, an MCDR script or an exporter of your own). **The exact approach varies by core, version and plugins; this article does not give an implementation, so follow the official documentation of whatever you use.**
:::

### 5.2 Whether the Service Is Running

Service-level monitoring can be written three ways, **and they can be combined**: systemd `OnFailure` (simple, no extra components, but it **only covers the failed state**, so a frozen process that has not exited is invisible), an external port probe (detects "process alive but service unreachable"; needs another machine), and your own script + cron (flexible, can check any condition, but you maintain it). All three cost little and cover different scenarios.

## 6. Alert Fatigue: Keeping Notifications Meaningful

This is the **most underrated** part of a monitoring system. An alert that fires every ten minutes and is a false positive every time will train you to ignore all notifications within days - **at which point the monitoring system has in practice already failed, you just have not noticed.**

### 6.1 Alert on Symptoms, Not Causes

| Counter-example (alerting on a cause) | Good example (alerting on a symptom) |
| --- | --- |
| "CPU usage above 80%" | "TPS below 15 for 5 minutes" |
| "Disk I/O wait is high" | "Less than 15% disk space remaining" |
| "Some process restarted" | "The service restarted more than 3 times in an hour" |
| "Memory usage above 70%" | "Swap has started to be used" |

The reason: **a cause does not necessarily affect players, but a symptom always does.** High CPU with normal TPS means the machine is still coping; when TPS drops, whatever the cause, players are suffering.

### 6.2 Deduplication, Grouping and Silencing

An alerting system needs three basic capabilities, or one incident becomes a hundred notifications:

| Capability | What it does | Example |
| --- | --- | --- |
| Deduplication | Notify once per problem | After the disk fills, every write fails, but you should receive one "disk full" |
| Grouping | Merge related alerts into one | A power cut takes ten machines offline at once; merge them into one rather than ten |
| Silencing | Stay quiet during planned maintenance | You are restarting the server; you do not need an alert about it |

In the Prometheus ecosystem these three are handled by **Alertmanager**, not by Prometheus itself. **This is the step many people miss**: install Prometheus without Alertmanager and you get a pile of unrelated notifications.

### 6.3 Keep One Channel, and Make Every Alert Actionable

A practical discipline: **send all alerts through the same channel.** The reason is pragmatic: with three channels you start classifying them as "notifications from this one do not matter", and end up reading none of them. **One channel, one rule, one place to look** is what builds the reflex that "if it fired, something is wrong".

Before putting an alert into production, ask one more question: **once it fires, what do I do?** If the answer is "I do not know, I will take a look", then that alert **should not go live yet**. Work out the response steps first, then turn it on - which is the runbook in the next section.

## 7. After an Alert Fires: Runbooks

A **runbook** is a set of pre-written steps for "what to do when a particular alert fires". It is not bureaucracy, because alerts are most likely to fire when you are least able to think - in the middle of the night, on a commute, in the middle of something else.

A minimal usable runbook needs only four lines per alert:

```text
Alert name: HostDiskSpaceLow
Meaning: free space on one of the host's mountpoints is below 15%
Step 1: df -h to confirm which mountpoint it is and how fast it is growing
Step 2: find the largest directories: du -sh /srv/minecraft/* | sort -h
        Common culprits: piled-up backups, logs that were never rotated, core dump files
Step 3: delete what is safe to delete (expired backups, old logs) and confirm the server can still write to disk
Step 4: if you cannot clean up immediately, stop the jobs that keep writing to disk and notify players
```

### 7.1 Four General Response Principles

| Principle | Why |
| --- | --- |
| **Stop the bleeding first, then find the cause** | While players are still affected, restore the service first; investigation can wait |
| **Preserve the scene** | Copy logs and state before restarting; see [Incident Response and Forensics](/tutorials/ops/incident-forensics) |
| **Do not just restart and call it done** | A restart only reloads the world once; **if the root cause is still there, the problem comes back at the same speed** |
| **Record what you did** | The next time the same alert fires, this record is exactly what you need |

### 7.2 A Realistic Response Order

Take "TPS has dropped to 10" as an example. A sensible order is: **confirm the symptom (TPS, MSPT, player count, `uptime`) -> decide whether it is the server side or the host side -> on the server side run a spark profiler to get the call tree, on the host side look at CPU throttling, memory and disk I/O -> apply emergency measures so players can play -> finally do a post-mortem and add a monitor**. For the criteria in the first two steps see [Analysing Server Performance with spark](/tutorials/ops/spark).

## 8. Monitoring a Home Host

The difference between a home host and a datacentre environment is mainly that **it has a pile of problems the datacentre solves for you**: mains power, air conditioning, access control, on-site staff. For background see [Hosting on a Home PC](/tutorials/ops/home-hosting).

### 8.1 Power-Loss Detection and Automatic Shutdown: NUT

The most typical failure of a home host is **a mains power interruption**. It differs from "the server crashed": a crash usually does not corrupt the save, whereas **a hard power loss in the middle of a write can leave half-written files**, costing you a chunk at best or an unloadable save at worst. So the role of a UPS is "buy time for a clean shutdown", and **NUT (Network UPS Tools)** is the most common monitoring solution on Linux: it has three layers - **the driver talks to the UPS, `upsd` is the server, and `upsmon` is the monitoring client**; `upsmon` reads state from `upsd` and triggers a shutdown when needed. The command to read state is `upsc` (a read-only client):

```bash
upsc -l                       # list the names of all configured UPS devices
upsc myups                    # show every variable of one UPS
upsc myups ups.status         # status only: OL mains / OB battery / LB low battery
upsc myups battery.charge     # remaining charge percentage
upsc myups battery.runtime    # estimated runtime in seconds
```

Wiring UPS state into alerting is simple: check whether `ups.status` contains `OB` (on battery) - and **do not silently ignore a missing status**; alert on "unknown" instead.

:::warn NUT details vary by distribution and version
Package and service names differ across distributions (the Debian family commonly uses `nut-server` and `nut-client`, the RHEL family commonly `nut-server` and `nut-monitor`), and the configuration directory is either `/etc/nut/` or `/etc/ups/`; **NUT 2.8.0 renamed `master`/`slave` to `primary`/`secondary`**, and the old spelling is still accepted for compatibility. Variable names can change with the driver and the model too, so **list the actual variables with `upsc` before writing a script**. Full configuration is in [Racks, Switches and UPS](/tutorials/ops/hardware-rack).
:::

### 8.2 Whether It Comes Back After an Outage, and Whether It Overheats

Monitoring can tell you "the power went out", but **whether the machine starts by itself once power returns depends on BIOS/UEFI settings**, which has nothing to do with monitoring; configure it when you build the machine, or you will have to press the power button in person after every outage. A home environment has no datacentre air conditioning either, and **high summer temperatures are a real source of failure**: CPU and fan speeds can be read with the `sensors` command from `lm-sensors`, and disk temperatures usually appear among the SMART attributes of `smartctl -a`; **which sensors you can read depends on the motherboard and the sensor chip**.

:::note Temperature thresholds vary by hardware
Normal operating temperatures differ greatly between CPUs, and **there is no universal alert temperature**. The right approach is to look up the datasheet for your model and set the threshold "clearly above your daily baseline but below the throttling point": run for a few days to record a baseline, then set the threshold.
:::

A home host should also watch four more things: **the upstream link** (a home connection re-establishes PPPoE and jitters from time to time, so the server's metrics look normal while every player is disconnected), **public IP changes** (without a static IP, a failed DDNS update leaves players unable to connect), **disk SMART attributes** (consumer disks lack the redundancy of enterprise drives, and catching bad sectors early can save your data once), and **sleep and hibernation** (once the system sleeps the server stops, so confirm the relevant settings are disabled).

## 9. Rollout Order and Checklists

Do not install the whole stack at once. Work through this order; every step produces value on its own: **external probes + one notification channel** (solves "the server is down but nobody knows") -> **systemd `OnFailure` and `Restart=`** (automatic recovery from service crashes, and notification) -> **one cron health-check script** (a disk about to fill, a process that vanished) -> **node_exporter + Prometheus + Grafana** (seeing trends; answering "when did it start getting worse") -> **alert rules + Alertmanager** (going from "looking at graphs" to "being notified") -> **a runbook for every alert** (knowing what to do when a notification arrives at night).

### 9.1 Pre-Launch Checklist

| Check | Why it must be confirmed |
| --- | --- |
| The monitoring is not on the machine being monitored | When the machine loses power, on-box monitoring vanishes with it |
| The notification channel has really been verified once | An unverified alert is no alert |
| Alerts distinguish "sustained" from "momentary" | Use conditions such as `for`, or they will certainly be noisy |
| Every alert has a matching runbook | Otherwise it only wakes you up |
| The disk alert threshold leaves headroom below "full" | A full disk is the class of failure that destroys data |
| Backup failures raise an alert | A failed backup has no other symptom |
| Certificate expiry is monitored | It only surfaces on the day it expires |
| There is a silencing mechanism for planned maintenance | Otherwise one restart brings a pile of notifications |
| There is historical data to look back at | A single snapshot cannot show a trend |
| You know where to look at logs and metrics | See [Logs and Error Triage](/tutorials/faq/errors) |

### 9.2 Common Mistakes

| Mistake | Consequence |
| --- | --- |
| Monitoring only CPU and memory | Missing the three classes that "will not shout on their own": disk, backups, certificates |
| Alerting directly on raw metrics | Every momentary fluctuation notifies, and it is soon ignored |
| Sending notifications to three channels | None of the three is read carefully |
| Setting it up and forgetting it | Thresholds change with the workload, and half a year later everything is stale |
| Monitoring without drills | You only discover that notifications do not get out when something really happens |
| Putting the monitoring on the same machine | In the one outage where you need it most, it is not there |

:::tip One last piece of advice
**The right size for a monitoring system is the size you are willing to maintain.** One disk alert that is taken seriously is far more useful than twenty muted dashboards. Start from the minimum that works and add one monitor per incident; that is more realistic than configuring everything at once and then abandoning all of it.
:::

> Installation and configuration of each piece of software are governed by its official documentation.
