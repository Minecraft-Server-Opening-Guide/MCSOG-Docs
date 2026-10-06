---
title: Attack Forensics and Incident Response
slug: incident-forensics
cat: ops
level: 3
order: 12
minutes: 18
tags: [incident-response, forensics, packet-capture, tcpdump, evidence, ddos, attribution]
updated: 2026-10-04
draft: false
---

At the moment an attack lands, two very different kinds of material exist on your machine: **evidence that can still be recorded**, and **state that will be gone within minutes**. This article is about the second kind - securing the scene before you restart, reinstall, or block anything. For prevention, read [Network Security Fundamentals](/tutorials/ops/network-security) and [Common Network Attacks and Defenses](/tutorials/ops/attack-defense).

:::warn This article is not legal advice
Forensic commands, log-retention duties, and personal-data rules **vary by operating system, distribution, provider, and jurisdiction**; anything environment-dependent is flagged explicitly below. Where player personal data is involved, or where a matter may become legal, **consult a professional and follow local law and your hosting provider's policy**.
:::

## 1. Why Capture Comes First

### 1.1 Evidence Disappears

The first thing most people do during an attack is **reboot** or **reinstall**. That is the worst possible move: **a reboot destroys almost all network-layer evidence.**

| Evidence | Location | How it disappears | Rough lifetime |
| --- | --- | --- | --- |
| Running processes, open sockets | Memory | Process exit, reboot | Seconds to minutes |
| Current connections (established) | Kernel socket table | Connection closes | Seconds |
| conntrack connection-tracking table | Kernel memory | Entry timeout (config-dependent) | Seconds to hours |
| ARP / neighbour table | Kernel memory | Entry expiry | Minutes |
| Interface packet and drop counters | Kernel counters | **Cleared on reboot or NIC reset** | Lost on reboot |
| Firewall rule hit counters | Kernel netfilter | **Cleared on reboot; `iptables -Z` also clears them** | Lost on reboot |
| Packet capture files (pcap) | Disk | Only if deleted or overwritten when the disk fills | Persistent |
| System and service logs | Disk | Compressed and deleted by rotation | Days to weeks |
| Application logs (`logs/latest.log`) | Disk | Rotated, overwritten by newer logs | Days |
| Configs, scripts, scheduled jobs | Disk | Overwritten when someone "fixes" them | Persistent but easily altered |
| Crash reports (`crash-reports/`) | Disk | Generally not deleted automatically | Persistent |
| Provider traffic graphs / attack reports | Provider side | Deleted at the end of the provider's retention window | Days to months |

The key distinction: **volatile evidence** lives in memory and dies with a reboot; **persistent evidence** lives on disk but can still be lost to rotation, overwrites, or careless edits. The order is always **secure the volatile first, then collect the persistent**.

### 1.2 What a Reboot Destroys

A single reboot wipes out, all at once: the current distribution of TCP connections and source IPs (which is how you tell a single-source attack from a distributed one), the conntrack table (who was talking to whom, and which rule handled each packet), the interface counters' accumulated totals and drop counts, the **firewall rule hit counters** (the only hard proof of how much your rules actually dropped), any suspicious processes in memory (if the attacker already reached the host, rebooting cleans up for them), and unflushed log buffers.

:::warn "Not rebooting" is not the same as "not responding"
You can mitigate while preserving the scene: add firewall rules, apply rate limits, move traffic behind scrubbing, block temporarily. **But record every change you make** (see section 3), because the changes themselves alter the evidence.
:::

### 1.3 The Correct Order

```text
1. Do not reboot, reinstall, or power off (unless the host is confirmed fully compromised)
2. Capture packets first (tcpdump) - network evidence is the most volatile
3. Capture kernel state (ss, conntrack, ip -s link, firewall counters)
4. Capture process and service state (ps, systemctl, journalctl)
5. Copy logs and configs (work on copies, never the originals)
6. Hash everything, write the incident log, record a timeline (single timezone)
7. Only then begin mitigation and hardening
```

## 2. What to Capture, and With Which Commands

:::warn Interface names and paths differ per system
This article uses `eth0` as the example interface. **Yours may be `ens3`, `enp1s0`, `eno1`, `bond0`, and so on**; confirm with `ip -br link` or `ip addr`. Likewise, log directories, service names, and firewall tooling all differ between distributions.
:::

```bash
ip -br link
# Example output (yours will differ):
# lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
# eth0             UP             aa:bb:cc:dd:ee:ff <BROADCAST,MULTICAST,UP,LOWER_UP>
```

### 2.1 Packet Capture with tcpdump

```bash
# Java Edition (TCP 25565)
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'port 25565'

# Bedrock Edition / Geyser (UDP 19132)
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap 'udp port 19132'
```

| Option | Meaning | Why it must be written this way |
| --- | --- | --- |
| `-i eth0` | Select the interface | **Replace it with your actual interface name**; without it tcpdump picks one itself and may pick wrong |
| `-nn` | No name resolution (IPs and ports stay numeric) | Reverse DNS **slows capture and causes drops**; worse, the attack traffic induces you to **fire off large numbers of DNS queries, effectively announcing that you are under attack** |
| `-s 0` | Capture full packets, no truncation | The default captures only the first bytes, and **a truncated payload cannot be analysed**; `0` means the full length |
| `-w FILE` | Write to a pcap file | See below |
| `'port 25565'` | BPF filter expression | Single quotes stop the shell from interpreting it; `port` matches both TCP and UDP |

**Why you must write to a file instead of printing to the terminal**: during an attack the packet rate can reach hundreds of thousands per second, and printing a parsed line per packet makes tcpdump **the bottleneck and causes heavy drops**, while the flood of text makes the terminal useless. `-w` writes binary directly and costs far less.

**Do not forget disk space**: `-s 0` plus a high-rate attack can produce tens of GB in minutes. Check free space first, and cap the capture with `-c`, or rotate by size with `-C` and limit the file count with `-W`:

```bash
# Stop after 200000 packets
sudo tcpdump -i eth0 -nn -s 0 -c 200000 -w /var/log/incident-cap.pcap 'port 25565'

# 100 MB per file, at most 20 files (about 2 GB total), rotating automatically
sudo tcpdump -i eth0 -nn -s 0 -w /var/log/incident-$(date +%F-%H%M).pcap -C 100 -W 20 'port 25565'

df -h /var/log    # check free space first
```

:::tip If you capture nothing
**Permissions**: capturing needs `CAP_NET_RAW`, so use `sudo` (`setcap` widens the attack surface and is not recommended). **Wrong interface**: container interfaces differ from the host's (commonly `docker0`, `veth*`, `br-*`), so the host's `eth0` may not see all the traffic. **Traffic already scrubbed upstream**: once your provider filters it, **only clean traffic may reach your NIC** - which is exactly why you ask the provider for traffic data (see 2.6). **Cloud security groups**: some platforms drop traffic before it reaches the instance, so the host never sees it.
:::

Do a rough count before anything else (do not scroll through packets with `tcpdump -r`); for detailed protocol analysis, work **offline** on another machine with Wireshark / `tshark`, and **never capture and analyse simultaneously on the production host**.

```bash
# Count packets only
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q | wc -l

# Top 20 source IPs by packet count
sudo tcpdump -nn -r /var/log/incident-2026-10-04-1200.pcap -q 2>/dev/null \
  | awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -20
```

### 2.2 Firewall State and Counters

```bash
sudo iptables -L -v -n
sudo iptables -t nat -L -v -n

sudo nft list ruleset
sudo nft list counters
```

- `-L` lists rules, `-v` shows **per-rule packet and byte counters**, and `-n` disables name resolution (same reasoning as `-nn`); `-t nat` is the NAT table (DNAT/SNAT/port forwarding), which you must inspect to answer "where is this traffic being redirected".
- **What the counters are for**: the counts on `DROP`/`REJECT` rules are **direct proof of how much traffic your rules discarded**, the strongest number you have for the post-incident review and for your provider ticket. **A reboot or `iptables -Z` clears them**, so capture them early.
- `nft list ruleset` prints the full ruleset including sets and counters; `nft list counters` lists only named counter objects. **Only rules that explicitly define a counter object have independent counters**; inline counters on ordinary rules appear in `list ruleset` as `counter packets N bytes M`. **nft subcommands and output format change between versions - check `man nft` and your distribution's documentation.**

```bash
sudo iptables -L -v -n        > /root/incident/fw-iptables.txt 2>&1
sudo iptables -t nat -L -v -n > /root/incident/fw-iptables-nat.txt 2>&1
sudo nft list ruleset         > /root/incident/fw-nft.txt 2>&1
```

### 2.3 Connection Tables

```bash
# Established Java connections
ss -tan state established '( sport = :25565 )'

# UDP sockets (Bedrock has no notion of a connection; watch the listen and queue state)
ss -uan

# Socket summary (counts per state; reveals a flood of half-open connections)
ss -s

# Includes SYN-RECV, which shows the signature of a connection flood
ss -tan '( dport = :25565 or sport = :25565 )'

# Connection count per source IP, to find a single dominant source
ss -tan state established '( sport = :25565 )' | awk 'NR>1 {print $5}' \
  | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

In `ss -tan`, `t` means TCP, `a` means all states, and `n` means numeric output (again avoiding DNS lookups).

**conntrack** (requires `conntrack-tools` and a kernel with `nf_conntrack` enabled):

```bash
sudo conntrack -L    # dump every tracked connection
sudo conntrack -S    # per-CPU error counters
sudo conntrack -C    # current entry count (check this before deciding to run -L)
```

- `conntrack -L` **can be very slow or stall when the table is large**, which is why you check the scale with `conntrack -C` first.
- `conntrack -S` reports `insert_failed`, `drop`, `early_drop`, `error`, and similar. **Growing `insert_failed` or `early_drop` means the connection-tracking table is full**, at which point new connections are dropped - **this is itself an exploitable denial of service**, and it is the key clue when "the pipe is not saturated but players cannot connect".

```bash
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
```

:::warn conntrack may not exist at all
You will see no conntrack when **the `nf_conntrack` module is not loaded**, **the system uses pure nftables without connection tracking**, **`conntrack-tools` is not installed**, **a container namespace cannot see the host table**, or **a provider's custom kernel has the feature trimmed out**. **That is not a mistake on your part** - fall back to `ss`, `ip -s link`, and the firewall counters. Conversely, some large-memory hosts ship a very high default `nf_conntrack_max`, and **entry timeouts also differ by distribution and configuration, so do not copy numbers from someone else's setup**.
:::

### 2.4 Interface Counters and Rate

```bash
ip -s link show eth0
cat /proc/net/dev
```

The `RX`/`TX` sections of `ip -s link` give **bytes / packets / errors / dropped / overrun / mcast**. **`dropped` and `overrun` are the important ones**: they show that **traffic already exceeds what the NIC or kernel can process**, meaning you are losing packets even though the link is not saturated. `cat /proc/net/dev` gives the same counters for every interface and is a good whole-system snapshot (**these are cumulative values cleared by a reboot, so only the difference between two samples is meaningful**).

```bash
# With sysstat installed, sample the rate continuously (once per second, five times)
sar -n DEV 1 5
```

:::note Two prerequisites for sar
1. **`sysstat` must be installed** (Debian/Ubuntu: `sudo apt install sysstat`; RHEL family: `sudo dnf install sysstat`).
2. **Historical data collection must already be enabled** (usually by the sysstat systemd timer or a cron job). **If it was never enabled, `sar` can only start collecting now and cannot show the rate during the attack** - which is precisely why monitoring belongs on from day one. An invocation with an interval such as `sar -n DEV 1 5` is **live sampling** and does not depend on historical collection being enabled.
:::

`iftop` and `nload` are **optional live tools**:

```bash
sudo iftop -i eth0    # live bandwidth per connection pair
sudo nload eth0       # simple in/out traffic graph
```

:::warn Live tools do not preserve evidence
`iftop` / `nload` are **dashboards in a terminal**: close the terminal and they are gone, so they are **useless as forensic material**. Using them to get a fast read on the attack's direction is fine, but **you must capture to disk with tcpdump at the same time**. These tools also drop packets themselves under high packet rates, so **do not treat their numbers as precise statistics**. Package names differ per distribution, and some distributions require an extra repository such as EPEL first.
:::

### 2.5 Process and Service Evidence

```bash
ps auxf
systemctl status <service>
journalctl -u <service> --since "1 hour ago"
```

- `ps auxf`: lists every process as a **tree**, so you can spot things that should not be there - an unexpected miner, an executable running out of `/tmp`, a process masquerading as `java` but pointing at an odd path. **On a compromised host `ps` itself may be replaced or hooked, so confirm important conclusions through more than one method.**
- `systemctl status <service>`: service state plus the last few log lines. The unit name depends on how you deployed it - `minecraft`, `mcserver`, `paper` are all plausible and **none of them is universal**.
- `journalctl -u <service> --since "1 hour ago"`: systemd logs. `--since`/`--until` accept `"1 hour ago"`, `"2026-10-04 12:00:00"`, `"today"`. **Output is in local time by default; add `--utc` to force UTC**, which is strongly recommended for forensics. If the journal has already rotated, export with `journalctl -u <service> --since ... --no-pager > FILE`, or read an archived journal file with `journalctl --file`.

Minecraft-side evidence:

| Path | Contents | Notes |
| --- | --- | --- |
| `logs/latest.log` | The current log | **Overwritten when the server restarts**, so copy it before any restart |
| `logs/YYYY-MM-DD-N.log.gz` | Rotated historical logs | Compressed, still valid evidence |
| `crash-reports/` | Crash reports | Generally not cleaned up automatically; contain stack traces and JVM details |
| `plugins/*/` | Each plugin's own logs and databases | **Format varies by plugin**; commonly login records, command audits, ban records |
| `banned-ips.json` / `banned-players.json` | Ban lists | Record what you did in response, and are part of the timeline |
| `usercache.json` / `ops.json` | Player and operator mappings | Used to tie UUIDs back to names |

```bash
# Copy, never move, and never modify the originals
sudo cp -a /srv/minecraft/logs /root/incident/mc-logs
sudo cp -a /srv/minecraft/crash-reports /root/incident/mc-crash-reports
```

`cp -a` preserves timestamps and permissions, **which matters for forensics** - `cp -r` resets modification times to now and destroys the timeline. **Application logs are often more useful than network logs**: the network layer can only say "there were 40,000 connections", whereas the application layer can say "one account attempted to log in 900 times in three minutes". Permission, login, economy, and anti-cheat plugins usually keep records, and **they are your primary source for establishing who did what**; check each plugin's own documentation for locations and formats.

### 2.6 Evidence on the Cloud or Provider Side

**The traffic you can see is not all the traffic.** Sitting further upstream, your provider can see inbound traffic **before it is dropped** (whatever a security group or network ACL discards never reaches your machine at all), the **total attack bandwidth and packet rate** (pps/Mbps) and whether scrubbing was triggered, their own attack classification and source distribution, and platform flow logs - **whether these exist, whether they cost extra, and how long they are retained varies widely, so check the provider's documentation**.

**What to do: open a ticket immediately**, state that you are under attack, ask for the traffic details and the attack report, and ask whether a scrubbing service or a protected IP is available. **Do not just write "I am being attacked"** - see section 5 for what to include.

## 3. Preserving Evidence Correctly

### 3.1 Hash Everything You Collect

```bash
cd /root/incident
sha256sum incident-*.pcap > incident.sha256
```

**The hash proves that nobody altered the evidence after you collected it**:

- **Keep the hash file separate from the files it covers** (a different directory, a different disk, ideally a copy elsewhere as well). Stored in the same directory, anyone who can alter a file can also alter the hash, and the proof is worth nothing.
- **Verification**: `sha256sum -c incident.sha256`. **The hash file records relative or absolute paths, so verification fails after you move things** - that is a path change, not corruption.
- **Do this for all evidence, not just pcaps**:

```bash
find /root/incident -type f -print0 | sort -z | xargs -0 sha256sum > /root/incident.sha256
```

`find -print0` with `xargs -0` handles filenames containing spaces correctly; `sort -z` keeps the order stable so two runs can be compared. **Write the hash file outside the evidence directory**, and copy it to offline media as well.

### 3.2 Never Touch the Originals

- **Analyse copies only.** `tcpdump -r` is read-only and safe; any "repair", "convert", or "merge" belongs on a copy.
- For whole-disk forensics the standard approach is `dd` to an image and an immediate hash of that image:

```bash
# Note: the destination must be larger than the source device; this completely overwrites the destination
sudo dd if=/dev/sda of=/mnt/evidence/sda.img bs=4M conv=noerror,sync status=progress
sha256sum /mnt/evidence/sda.img > /mnt/evidence/sda.img.sha256
```

:::warn dd is destructive
Whatever device you name in `of=` is **overwritten unconditionally**. **Confirm both device names with `lsblk` before running it; one wrong letter destroys data.** If you are not certain, do not run it.
:::

### 3.3 Timelines: Always State the Timezone

**This is the most common and most serious mistake**: mixing `journalctl` local times, provider UTC times, and plugin log timestamps in one table scrambles the order of events and can lead to the opposite conclusion.

1. **Record everything in UTC**, and state explicitly in the document that "all times below are UTC".
2. **Also record the host timezone and the UTC offset**, so local-time logs can be correlated.
3. Use ISO 8601 and avoid ambiguous forms such as `10/04/2026`.

```bash
date -u +%FT%TZ      # e.g. 2026-10-04T09:32:21Z
date +%FT%T%:z       # e.g. 2026-10-04T17:32:21+08:00
timedatectl          # show system timezone and NTP synchronisation state
```

`date -u +%FT%TZ` prints a UTC timestamp with a `Z` suffix, and **`Z` means UTC - it is not a timezone abbreviation** (never write `CST`, which maps to at least three different zones).

:::warn The clock itself may be wrong
If the host clock is inaccurate or NTP is not synchronised, **every log timestamp is untrustworthy**. Use `timedatectl` to check whether `System clock synchronized` is `yes` and note the current offset. **If you find drift, record it in the incident log**, or cross-device correlation will produce wrong conclusions.
:::

### 3.4 Keep a Written Incident Log

| Entry | What to record |
| --- | --- |
| Discovery time | Who noticed, and how (player report, monitoring alert, your own observation) |
| Symptoms | What it looked like: lag, disconnects, inability to connect, saturated bandwidth |
| Time of every action | **With timezone**, stating what you did |
| Changes you made | Firewall rules added, rate limits, IPs blocked, DNS switched |
| Evidence filenames | What each file is and when it was captured |
| Who you contacted | Provider ticket number, times, and the substance of their replies |
| Current status | Whether the attack is still ongoing |

:::warn Your mitigation changes the evidence
Every firewall rule you add to stop the bleeding **changes the traffic characteristics captured afterwards** (packets that used to arrive are now dropped and never captured). That is unavoidable, but **you must record it**: note **the exact time each rule was added** (later analysis is bounded by it), try to **capture a round of packets before changing rules** (even 30 seconds helps), and record the **full rule text** rather than "I added a rate limit". Otherwise you will be unable to explain later why the attack traffic suddenly vanished at 14:05.
:::

### 3.5 File Permissions and Data Protection

```bash
chmod 700 /root/incident
chmod 600 /root/incident/*
chmod 600 /root/incident.sha256
```

- Evidence contains **player IPs, account names, chat content, and possibly credentials**, so **treat it as sensitive by default**. Directory `700` (only the owner may enter), files `600` (only the owner may read and write).
- **Do not** put evidence in a web directory or `chmod 777` it for convenience.
- **Transfer** with `scp` / `rsync -e ssh` (encrypted over SSH), never plaintext FTP or an email attachment.
- **Data protection**: where player personal data is involved, **mind the applicable law** (for example the EU GDPR or regional personal-information statutes) - many jurisdictions treat an IP address as personal data. The principles are **collect only what is necessary, restrict the purpose to security incident investigation, limit access, and delete when no longer needed**. **Specific obligations differ by country and region; follow local law and your own privacy policy.**
- **Do not** post evidence publicly - especially a pcap containing player chat and IPs - asking a forum or group to "take a look".

## 4. Attribution: What Is and Is Not Knowable

**Accusing an innocent third party causes real harm, and it also destroys the credibility of your own complaints.**

### 4.1 UDP Traffic with Forged Source IPs Cannot Generally Be Attributed

UDP is **connectionless**, so **the source IP field can be forged freely**, and a forged packet needs no reply to be sent. Therefore:

- **The source IPs in a UDP flood - including almost all UDP reflection and amplification - are forged and generally cannot be attributed at all.**
- **Do not** complain about, block, or publicly name the IP that appears most often in a UDP flood - **that IP is very likely a victim being impersonated**.
- Blocking a single IP is **pointless** against forged traffic (the attacker just changes the forged value); the correct response is **upstream scrubbing, rate limiting, and filtering on protocol characteristics**.

A few clues do survive: if you can identify the specific service being abused (DNS, NTP, memcached, CLDAP, and so on), **that server is a misused open server, not the attacker**; a stable pattern in source IPs and ports is still worth investigating, but **conclusions must be cautious**; and devices on the traffic path (at your provider) can see more than you can.

### 4.2 TCP Attacks: The Source IP Is Usually Real, but Still Not the Attacker

TCP requires a **three-way handshake**, and completing it requires receiving the replies, so:

- **TCP attacks against Minecraft** - bot joins, connection floods, status-ping floods - **usually have genuine source IPs** and can be investigated.
- **But a real IP is not the attacker**: it may be **a compromised third-party host** (a backdoored VPS, a hacked home router), **a proxy, VPN, or commercial exit node**, **a Tor exit node**, or **a user behind shared NAT**.

The correct phrasing is **"this IP participated in the attack traffic", not "the owner of this IP is the attacker".** That distinction matters a great deal when you file a complaint.

### 4.3 Reflection and Amplification: The Sources Are Innocent Third Parties

A reflection or amplification attack has **two sets of victims**: you, and **the open servers being abused**. They are abused because their administrators **wrongly exposed UDP services such as DNS, NTP, or memcached to the internet**.

- **Do not report reflection sources as attackers**; report that **"a service on this IP is an open reflector and is being abused"**.
- Notifying those IPs' `abuse@` contacts **does help** (once the administrator fixes it, that reflection surface disappears), but **the tone should be "your service is being abused", not "you are attacking me"**.
- The indicators are **a response far larger than the request** (the amplification factor) and **a source port belonging to a well-known UDP service**.

### 4.4 Telling "Concentrated" from "Distributed"

| What you observe | More likely explanation | What you can do |
| --- | --- | --- |
| **One or a few IPs hold the vast majority of connections** | Single-source attack, compromised host, exploratory scanning | Worth investigating that IP; a temporary block stops the bleeding |
| **Thousands of IPs, each sending a little** | Distributed botnet, or forged sources | Blocking IPs is useless; rely on upstream scrubbing and rate limits |
| **Handshakes complete and the connection count climbs steadily** | Genuine sources (bot joins) | Investigate IPs + upstream protection + join rate limiting |
| **Many SYNs with no completed handshake** | SYN flood (sources possibly forged) | Enable SYN cookies, request upstream scrubbing |
| **Large UDP packets arriving from fixed source ports** | Reflection / amplification | Filter by protocol and port, request upstream scrubbing, **do not complain about the source IPs** |
| **Little traffic but very slow service** | Possibly an application-layer attack or resource exhaustion | Read application logs, the connection table, and host resource usage |

**The core rule: a few concentrated IPs are worth pursuing; a vast spread of IPs cannot be pursued at all, so shift to protection.**

### 4.5 What to Do Once You Have an IP

```bash
whois 203.0.113.10
```

`whois` output usually contains the **network block (netname/descr), the owning organisation, the country, and an `abuse` contact address**. Note that:

- **The `whois` client is not always preinstalled** (Debian/Ubuntu: `sudo apt install whois`; RHEL family: `sudo dnf install whois`);
- **Output formats differ between RIRs** (Regional Internet Registries), and field names such as `abuse-c`, `OrgAbuseEmail`, and `abuse-mailbox` vary, so **read it by hand rather than pattern-matching in a script**;
- **RDAP** (Registration Data Access Protocol) is now preferable: it is the **modern HTTP replacement for WHOIS**, returns structured JSON, and supports automated queries. IANA runs a bootstrap service (`https://rdap.org/ip/<IP>` redirects to the responsible RIR); **each RIR's exact URLs and fields are documented by that RIR**.

**ASN ownership**: determining which autonomous system (AS) and which operator or data centre owns the IP helps you judge whether it is "a VPS on some cloud" or "a residential line in some country". Options include each RIR's RDAP service and `whois -h whois.radb.net`; **tools and data sources are numerous and differ in coverage**, so do not rest a conclusion on a single source.

**Abuse contacts**: the **`abuse@` address** (or abuse form) in WHOIS/RDAP is **the correct reporting channel**:

- **Send it to the abuse desk of the hosting provider that owns the IP, not to the broadband ISP of some random player.** A hosting provider can actually act on machines in its own ranges (including suspending service), whereas an ISP tends to move slowly on one compromised home router.
- **Attach evidence**: the time window with timezone, protocols and ports, the source IP list, packet counts and rates, and the pcap hash. **Complaints without evidence are usually ignored.**
- **If several networks are involved, file separate reports**, and never name and shame in public.

### 4.6 Legal Boundaries

- **Rules differ by country and region**: what counts as an offence, which logs you must retain, and whether you may obtain data yourself all vary. **This article is not legal advice.**
- **Recommended order**: contact your **provider** first (they can scrub, they can see upstream data, and they have an abuse process); for serious and sustained attacks (extortion, data theft, clear criminal conduct), consider **law enforcement or a national cybercrime reporting body**, keeping the evidence chain intact.
- **Never retaliate**: launching a DDoS at the source (so-called DDoS-back), intruding into their host, or "hacking back" **is itself illegal in nearly every jurisdiction**, turns you from victim into defendant, and destroys the legitimacy of your original position.
- **Do not dox or publicly bounty** attacker IPs either: it can harm innocent third parties and may amount to harassment or a privacy violation.

## 5. Reporting and Escalation

**"I am being attacked, please fix it" almost never gets an effective response.** A good ticket lets the reader decide what to do within 30 seconds:

```text
Subject: [DDoS/attack] Instance <instance ID/IP> under attack - requesting assistance and traffic data

1. Affected assets
   - Public IP: 203.0.113.10
   - Ports/protocols: 25565/TCP (Java Edition), 19132/UDP (Bedrock Edition)
   - Instance ID / order number: <fill in>

2. Time window (state the timezone)
   - Start: 2026-10-04 09:12 UTC (local 17:12, UTC+8)
   - End: still ongoing / stopped at 09:40 UTC
   - Peak: 09:20 - 09:35 UTC

3. Attack type and rough volume (what is known)
   - Classification: UDP reflection/amplification (suspected NTP/DNS) / TCP connection flood / bot joins
   - Observed rate: roughly XX Mbps, roughly XX kpps (source: local ip -s link counters)
   - Interface drops: RX dropped rose from 0 to XXXXX (same period)

4. Mitigation already applied
   - 09:25 UTC added iptables rules limiting concurrent connections per IP
   - 09:30 UTC blocked source IPs (effective against TCP only)
   - No reboot, no reinstall; the scene has been preserved

5. Requests
   - Provide the traffic statistics and attack report for this instance during that window
   - Confirm whether traffic scrubbing or a protected IP can be or has been enabled
   - If platform-side flow logs exist, please export them

6. Evidence files
   - incident-2026-10-04-0915.pcap (sha256: <hash>)
   - fw-iptables.txt, ss-established.txt, conntrack.txt
   - A full evidence package is available on request
```

| Element | Why it is mandatory |
| --- | --- |
| **A time window with timezone** | They must locate your traffic among enormous logs; wrong times mean they cannot find it |
| **Attack type and volume** | Determines whether they follow a scrubbing or a troubleshooting path |
| **Affected IPs and ports** | Confirms which asset is being hit |
| **Whether it is ongoing** | Determines the urgency |
| **Mitigation already applied** | Prevents duplicated or conflicting actions on both sides |
| **Evidence filenames** | Makes the exchange traceable |

**On abuse reports**: providers normally have their own abuse mailbox or form for "a host in our ranges is attacking someone"; **check the provider's site or the WHOIS record for the exact address**. **They can see traffic you cannot** (upstream routing, scrubbing equipment, platform flow logs) - you supply the endpoint view, they supply the network view, and only together are they complete. **Privacy limits**: a provider **may be unable to disclose details about another customer because of privacy policy or law**. That is normal, and **you should not conclude they are doing nothing just because they will not hand over an IP list**. Track the ticket number and the time of every reply so you end up with a complete communication timeline - which is part of the incident log too.

## 6. After the Incident

**An incident response with no review is a wasted exercise.**

### 6.1 Questions the Review Must Answer

| Question | What to look at |
| --- | --- |
| **What worked?** | Which firewall rule matched? Did scrubbing take effect? Were the rate limits sensible? |
| **What did not?** | Which measures achieved nothing? Which ones hurt legitimate players instead? |
| **How long did recovery take?** | The real elapsed time from discovery to mitigation, and where the bottleneck was (slow detection? slow diagnosis? no playbook?) |
| **Did the attacker come back?** | Compare time windows and source distributions to tell one wave from the next |
| **Was any data lost?** | Is the world intact? Was there a rollback? Are the backups usable? |
| **What was exposed?** | Were any accounts, keys, or panel passwords seen or leaked during the incident? |

### 6.2 Hardening Actions

- **Rate limits**: cap connection frequency, concurrent connections per IP, and join rate. **This is the most effective and cheapest layer.** Examples include the `iptables` `hashlimit`/`connlimit` modules, or join throttling in a server-side plugin (**exact module names and syntax differ by kernel and toolchain, so verify the module is available before configuring it**).
- **A proxy or scrubbing service**: hide the real IP (a TCPShield-style proxy, a provider's protected IP, or TCP forwarding through a CDN). **Note** that a proxy stops network-layer floods but **not application-layer attacks** such as bot joins or protocol exploits - those need server-side verification and throttling.
- **Change provider or data centre**: if your provider offers no scrubbing, or the attack targets a fixed address in that range, migrating is a realistic option. **Before migrating, confirm the new home has DDoS protection and scrubbing.**
- **Whitelisting**: if the server is a small circle of friends, **`white-list=true` is the most thorough option** - attackers cannot connect, so they cannot consume your resources with join-based attacks.
- **Reduce the attack surface**: close unnecessary ports (RCON, query, panels); see [Network Security Fundamentals](/tutorials/ops/network-security). For host-side hardening see [System Hardening](/tutorials/ops/system-security).
- **Monitoring and alerting**: **next time, you want to be woken by monitoring, not by angry players.** At minimum watch bandwidth, connection counts, TPS, and process liveness.

### 6.3 Are the Backups Intact, and Are They Offline?

- **Verify that the backups actually restore**, not merely that files exist. Restore drills are covered in [Backup and Restore](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup).
- **Confirm at least one copy is offline** (or immutable/read-only). If the attack involved a host compromise, **an online writable backup may already have been encrypted or deleted**.
- **Check the backup point in time**: if a rollback happened during the incident, state **exactly which point you restored to** and how far back player data was rolled.

### 6.4 Credential and Key Rotation

**If exposure was possible at all, assume compromise and rotate everything.**

| Item | Action |
| --- | --- |
| Panel / admin account passwords | Change immediately, and enable two-factor authentication where available |
| SSH private keys | Generate a new key pair, remove the old public key, and check `authorized_keys` for extra entries |
| RCON password | Change it, and confirm `enable-rcon` is not exposed to the internet |
| Database accounts | Change passwords and check for overly broad grants such as `root@%` |
| Cloud API keys / access keys | Revoke and recreate in the console, and review for unusual calls |
| Service accounts and tokens (plugins, backups, monitoring) | Revoke and recreate each one |
| Player accounts | If a plugin database leaked, **tell players to change their passwords** |

**Also check** `~/.ssh/authorized_keys`, `/etc/passwd` and `/etc/shadow` for new accounts, `crontab -l` and `/etc/cron.*` for suspicious scheduled jobs, and systemd for unexpected units. **Do this after the evidence collection is complete, and record what you find.**

### 6.5 Lessons-Learned Checklist

```text
[ ] Was detection timely? Does alerting cover bandwidth, connections, TPS, and process liveness?
[ ] Is there a written playbook? (who diagnoses, who contacts the provider, who informs players)
[ ] Was the packet capture timely? Was evidence lost by rebooting first?
[ ] Is the timeline recorded in a single timezone?
[ ] Are hashes computed and stored separately from the evidence?
[ ] Did you wrongly block legitimate players? How are those blocks lifted?
[ ] Does the provider ticket contain the full timeline and evidence?
[ ] Are backups verified restorable, and is there an offline copy?
[ ] Have all possibly exposed credentials been rotated?
[ ] Did you write down what you learned, instead of keeping it in your head?
```

## 7. A Ready-to-Use Capture Script

The script below collects the **volatile** evidence from section 2 into a timestamped directory in one pass, hashes everything, and prints a summary. **Usage: `sudo bash capture-evidence.sh`** (packet capture and conntrack require root). **Before running it, confirm** the interface (the script auto-detects the default-route interface), the evidence directory (default `/root/incident`), and the capture duration and packet cap. **The script is read-only: it changes no configuration and restarts no service.**

```bash
#!/usr/bin/env bash
#
# capture-evidence.sh - collect volatile evidence from an attacked Minecraft server
#
# Usage: sudo bash capture-evidence.sh
#
# Properties:
#   - read-only collection; changes no system configuration and restarts nothing
#   - optional tools are guarded with command -v and skipped when missing
#   - every collected file is hashed with SHA-256 and the summary is written separately
#
# Note: interface names, service names, and log paths differ per system;
#       adjust the variables below as needed.

set -u

# ---------------- tunables ----------------
IFACE="${IFACE:-}"                            # empty: auto-detect the default-route interface
CAPTURE_SECONDS="${CAPTURE_SECONDS:-60}"      # capture duration in seconds
CAPTURE_PACKETS="${CAPTURE_PACKETS:-200000}"  # packet cap, so the disk cannot fill up
MC_TCP_PORT="${MC_TCP_PORT:-25565}"           # Java Edition port
MC_UDP_PORT="${MC_UDP_PORT:-19132}"           # Bedrock / Geyser port
MC_SERVICE="${MC_SERVICE:-}"                  # systemd unit name; empty: skip
MC_DIR="${MC_DIR:-}"                          # server directory; empty: skip log copy
BASE_DIR="${BASE_DIR:-/root/incident}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BASE_DIR%/}/incident-${STAMP}"

# ---------------- preflight ----------------
if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: root is required (packet capture and conntrack need it). Run with sudo." >&2
  exit 1
fi

mkdir -p "$OUT" || { echo "ERROR: cannot create $OUT" >&2; exit 1; }
chmod 700 "$BASE_DIR" 2>/dev/null || true
chmod 700 "$OUT" 2>/dev/null || true

if [ -z "$IFACE" ]; then
  IFACE="$(ip route show default 2>/dev/null | awk '/default/ {print $5; exit}')"
fi
if [ -z "$IFACE" ]; then
  IFACE="eth0"
  echo "WARN: could not auto-detect the default-route interface; falling back to eth0. Override with IFACE=..." >&2
fi

echo "==> evidence directory: $OUT"
echo "==> interface: $IFACE"
echo "==> capture time: $STAMP (UTC)"
echo "==> free disk space:"
df -h "$OUT" 2>/dev/null || true

# ---------------- capture helper ----------------
capture() {
  _name="$1"
  shift
  echo "  - $_name"
  "$@" > "${OUT}/${_name}.txt" 2>&1 || echo "    (command returned non-zero; output was still saved)"
}

{
  echo "capture start (UTC): $(date -u +%FT%TZ)"
  echo "local time: $(date +%FT%T%:z)"
  echo "hostname: $(hostname)"
  echo "kernel: $(uname -a)"
  echo "uptime: $(uptime)"
  echo "interface: $IFACE"
  echo "java port: $MC_TCP_PORT  udp port: $MC_UDP_PORT"
} > "${OUT}/meta.txt" 2>&1
chmod 600 "${OUT}/meta.txt" 2>/dev/null || true

echo "==> collecting system and process state"
capture ps-auxf ps auxf
capture ss-summary ss -s
capture ss-tcp-all ss -tan
capture ss-udp ss -uan
capture ss-tcp-listen ss -tlnp
capture ip-addr ip -br addr
capture ip-route ip route show
capture ip-neigh ip neigh show
capture uptime uptime
capture date-utc date -u +%FT%TZ
capture timedatectl timedatectl
capture df-h df -h

if command -v ss >/dev/null 2>&1; then
  echo "  - ss-java-established"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" \
    > "${OUT}/ss-java-established.txt" 2>&1 || true
  echo "  - ss-source-ranking"
  ss -tan state established "( sport = :${MC_TCP_PORT} )" 2>/dev/null \
    | awk 'NR>1 {print $5}' | cut -d: -f1 \
    | sort | uniq -c | sort -rn | head -50 \
    > "${OUT}/ss-source-ranking.txt" 2>&1 || true
fi

echo "==> collecting interface counters"
if command -v ip >/dev/null 2>&1; then
  echo "  - ip-s-link"
  ip -s link show "$IFACE" > "${OUT}/ip-s-link.txt" 2>&1 || true
fi
[ -r /proc/net/dev ] && capture proc-net-dev cat /proc/net/dev
if command -v sar >/dev/null 2>&1; then
  capture sar-dev sar -n DEV 1 5
else
  echo "sar not installed; skipping live rate sampling (provided by sysstat)" > "${OUT}/sar-dev.txt"
fi

echo "==> collecting firewall state and counters"
if command -v iptables >/dev/null 2>&1; then
  capture fw-iptables iptables -L -v -n
  capture fw-iptables-nat iptables -t nat -L -v -n
else
  echo "iptables unavailable" > "${OUT}/fw-iptables.txt"
fi
if command -v nft >/dev/null 2>&1; then
  capture fw-nft nft list ruleset
  capture fw-nft-counters nft list counters
else
  echo "nft unavailable" > "${OUT}/fw-nft.txt"
fi

echo "==> collecting the connection-tracking table (if available)"
if command -v conntrack >/dev/null 2>&1; then
  capture conntrack-list conntrack -L
  capture conntrack-stats conntrack -S
  capture conntrack-count conntrack -C
else
  echo "conntrack command unavailable (needs conntrack-tools and a kernel with nf_conntrack)" \
    > "${OUT}/conntrack-list.txt"
fi
[ -r /proc/sys/net/netfilter/nf_conntrack_count ] \
  && capture conntrack-sysctl cat /proc/sys/net/netfilter/nf_conntrack_count
[ -r /proc/sys/net/netfilter/nf_conntrack_max ] \
  && capture conntrack-max cat /proc/sys/net/netfilter/nf_conntrack_max

echo "==> collecting service state and logs"
if [ -n "$MC_SERVICE" ] && command -v systemctl >/dev/null 2>&1; then
  capture systemctl-status systemctl status "$MC_SERVICE" --no-pager
  if command -v journalctl >/dev/null 2>&1; then
    capture journalctl-1h \
      journalctl -u "$MC_SERVICE" --since "1 hour ago" --utc --no-pager
  fi
else
  echo "MC_SERVICE not set; skipping service state (usage: MC_SERVICE=minecraft sudo -E bash $0)" \
    > "${OUT}/systemctl-status.txt"
fi

if [ -n "$MC_DIR" ] && [ -d "$MC_DIR" ]; then
  echo "  - copying server logs (-a preserves timestamps)"
  [ -d "${MC_DIR}/logs" ] && cp -a "${MC_DIR}/logs" "${OUT}/mc-logs" 2>/dev/null || true
  [ -d "${MC_DIR}/crash-reports" ] \
    && cp -a "${MC_DIR}/crash-reports" "${OUT}/mc-crash-reports" 2>/dev/null || true
else
  echo "MC_DIR not set; skipping server log copy (usage: MC_DIR=/srv/minecraft sudo -E bash $0)" \
    > "${OUT}/mc-logs-note.txt"
fi

echo "==> short capture: ${CAPTURE_SECONDS}s / at most ${CAPTURE_PACKETS} packets"
if command -v tcpdump >/dev/null 2>&1; then
  PCAP="${OUT}/capture-${STAMP}.pcap"
  timeout "$CAPTURE_SECONDS" tcpdump -i "$IFACE" -nn -s 0 \
    -c "$CAPTURE_PACKETS" -w "$PCAP" \
    "port ${MC_TCP_PORT} or udp port ${MC_UDP_PORT}" 2>"${OUT}/tcpdump.log" || true
  echo "  - capture file: $PCAP"
  echo "  - packet count:"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | wc -l | tee "${OUT}/pcap-packet-count.txt" || true
  echo "  - top source IPs (first 30):"
  tcpdump -nn -r "$PCAP" -q 2>/dev/null | awk '{print $3}' | cut -d. -f1-4 \
    | sort | uniq -c | sort -rn | head -30 > "${OUT}/pcap-source-ranking.txt" || true
else
  echo "tcpdump is not installed, so no capture was taken. Install it and re-run (Debian/Ubuntu: apt install tcpdump)" \
    > "${OUT}/tcpdump.log"
fi

echo "==> computing SHA-256"
find "$OUT" -type f ! -name 'SHA256SUMS' -print0 \
  | sort -z | xargs -0 sha256sum > "${OUT}/SHA256SUMS" 2>/dev/null || true
# keep a second copy of the checksums outside the evidence directory so both cannot be altered together
cp "${OUT}/SHA256SUMS" "${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt" 2>/dev/null || true
find "$OUT" -type f -exec chmod 600 {} + 2>/dev/null || true

echo
echo "=================== capture summary ==================="
echo "evidence dir : $OUT"
echo "start time   : $(head -n 1 "${OUT}/meta.txt" 2>/dev/null)"
echo "interface    : $IFACE"
echo "file count   : $(find "$OUT" -type f | wc -l)"
echo "size on disk : $(du -sh "$OUT" 2>/dev/null | cut -f1)"
echo "capture file : $(ls -1 "${OUT}"/*.pcap 2>/dev/null | head -n 1)"
echo "checksum file: ${BASE_DIR%/}/SHA256SUMS-${STAMP}.txt"
echo "-------------------------------------------------------"
echo "Next steps (important):"
echo "  1. Do not reboot or reinstall; volatile evidence dies with a reboot."
echo "  2. Copy the evidence to another machine or offline media now:"
echo "     scp -r root@<this-host-ip>:$OUT ./evidence/"
echo "  3. Write the incident log, keep all times in UTC, and note the local UTC offset."
echo "  4. Open a provider ticket with the time window and evidence filenames (see section 5)."
echo "======================================================="
```

| Item | Explanation |
| --- | --- |
| `set -u` rather than `set -e` | A collection script should **gather as much as it can**; one optional command failing must not abort the whole run |
| `command -v` guards | Used only for **optional tools** (`sar`, `nft`, `conntrack`, `tcpdump`, `systemctl`); the core commands (`ip`, `ss`) are assumed present |
| `timeout` | Bounds the capture duration; **`timeout` ships with GNU coreutils and is present on most Linux distributions**, but may be missing from minimal images |
| `-c "$CAPTURE_PACKETS"` | Packet cap so the disk cannot fill during an attack; **whichever of duration or packet count is reached first wins** |
| `cp -a` | Preserves the **timestamps and permissions** of the original logs, which forensics requires |
| Capture filter | `'port 25565 or udp port 19132'`: **`port` matches both TCP and UDP**, so it is written as `port 25565` plus `udp port 19132` to avoid also capturing TCP on 19132 |
| Checksums | One copy inside the directory and **another under `BASE_DIR`**; in a strict setting the checksums belong on a separate machine from the evidence |
| Service and paths | `MC_SERVICE` and `MC_DIR` **must be filled in for your deployment**; the script cannot guess them |
| Containers | Inside a container, point `IFACE` and `MC_DIR` at the interface and paths **within the container's network namespace** |

:::warn The script does not replace judgement
The script **writes volatile evidence to disk**, but **deciding what the attack is, whether to file a complaint, and whether to move behind scrubbing is still a human job**. When it finishes, continue with sections 1 to 6 - and in particular do not forget to **write the incident log** and **contact your provider**.
:::

Related reading: [Network Security Fundamentals](/tutorials/ops/network-security) (ports and firewalls), [Common Network Attacks and Defenses](/tutorials/ops/attack-defense) (attack types and prevention), [System Hardening](/tutorials/ops/system-security) (host-side hardening), [Offsite Backup](/tutorials/ops/offsite-backup) and [Backup and Restore](/tutorials/java/backup) (data preservation and restore drills).

> Forensic commands and compliance requirements vary by system and region; follow local law and your hosting provider's policy.
