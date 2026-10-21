---
title: Deploying to a Public Environment
slug: deploy
cat: java
level: 2
order: 8
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, deployment, cloud-server, public-ip, tunneling, frp, domain]
updated: 2026-10-04
draft: false
---

Getting the server to run on your own machine is only the first step. **Letting other people connect** is what actually counts as opening a server. Nearly all the difficulty here lies in networking, not in Minecraft itself.

## 1. Three Routes: Pick One First

| Option | Best for | Advantages | Cost |
| --- | --- | --- | --- |
| **Cloud server** | Wanting long-term 24/7 uptime | Public IP, stable, immune to home power and network outages | Costs money, and the better the specs the more it costs |
| **Home PC + public IP** | You have a public IPv4 at home | No extra hosting cost, performance fully under your control | Electricity, noise, power and network outages — and **most home broadband has no public IPv4** |
| **Tunneling (frp, etc.)** | No public IP at home | You can host without changing your broadband plan | Adds a forwarding hop; latency and stability depend on the tunnel service |

:::warn First confirm whether you have a public IPv4
IPv4 addresses are scarce, and **many home broadband connections are given a carrier-grade NAT address**, in which case no amount of router port forwarding will help. How to tell: if your router's WAN IP and the result of a "what is my IP" lookup **do not match**, you do not have a public IPv4.

If you have no public IP, your options are to ask your ISP (free in some regions, charged in others, refused in others), switch to a cloud server, or use a tunnel.
:::

## 2. The Cloud Server Route

1. **Buy a machine**: choose according to "Hosting Protocol and Recommended Configuration", paying close attention to **single-core clock speed**; pick the Server edition of Ubuntu or Debian.
2. **Set up the environment**: follow "Environment Setup (Windows and Linux)" to install the matching Java version, create a dedicated user and create the directory.
3. **Open the port**: allow `TCP 25565` in the security group and in the system firewall (ufw / firewalld) — **both are required**.
4. **Upload the server**: transfer the whole server directory with SFTP or `scp`.
5. **Start it and keep it running**: manage it with systemd so it starts on boot and restarts after a crash (see step 5 of "Environment Setup").
6. **Verify**: connect to `<your-public-ip>:25565` from **another machine**.

## 3. The Home PC Route

1. **Request or confirm a public IPv4** (see above).
2. **Router port forwarding**: forward external `25565` to `25565` (TCP) on the machine inside your LAN.
3. **Pin the LAN IP**: bind a static IP for this machine in the router, so the forwarding rule does not break when the address changes after a reboot.
4. **Allow `25565`** in the system firewall.
5. **Keep it online**: set the power options to **never sleep**, and take power and network outages into account.

## 4. The Tunneling Route (frp)

How it works: you open a port on a **machine that has a public IP** (the frps server) and forward traffic back to the machine inside your home network (the frpc client). The usual approach is to rent the cheapest cloud server you can find and run frps on it.

```ini
# frps.ini (on the server with a public IP)
[common]
bind_port = 7000
```

```ini
# frpc.ini (on the machine inside your home network)
[common]
server_addr = <your-public-server-ip>
server_port = 7000

[minecraft]
type = tcp
local_ip = 127.0.0.1
local_port = 25565
remote_port = 25565
```

Start order: run `frps` first, then `frpc`; after that players simply connect to **the public server's IP:25565**.

:::tip You can also use an off-the-shelf tunnel service
If you would rather not maintain your own node, use a commercial tunneling service. It is less work, but usually comes with traffic and bandwidth limits and **varies widely in quality** — when choosing, first check whether it supports **TCP** (UDP normally costs extra and is needed only for Bedrock Edition or cross-platform play).
:::

## 5. Domain Names (Optional but Recommended)

With a domain, players do not have to remember an IP:

- **A record**: `mc.your-domain.com` → the server's public IPv4.
- **SRV record**: to spare players from typing a port, point `_minecraft._tcp` at your actual port with an SRV record. Then players only need the domain to get in.

Note: **servers in mainland China usually need an ICP filing before a domain will resolve to them**, while overseas servers do not.

## DNS and SRV Records

The previous section said that a domain saves players from memorising an IP. Making that real is a matter of DNS records. This section covers the record types a server owner needs, the exact way to write an SRV record, and how to verify that it works.

### The records a server owner needs

| Record | Purpose | Example | Notes |
| --- | --- | --- | --- |
| `A` | Hostname to IPv4 address | `mc.example.com` → `203.0.113.10` | The basic record; a name may have several A records |
| `AAAA` | Hostname to IPv6 address | `mc.example.com` → `2001:db8::10` | Needed only if the server has IPv6; check here first when IPv6 players cannot connect |
| `CNAME` | An alias pointing at another hostname | `mc.example.com` → `node1.example.net` | **Cannot coexist with any other record on the same name**: once a CNAME exists you cannot also have A / AAAA / TXT, and a root domain usually cannot be a CNAME at all |
| `SRV` | Declares which host and port a service lives on | `_minecraft._tcp.example.com` | Java Edition only, see below |
| `TXT` | Free-form text, usually for verification | the value for `_acme-challenge.example.com` | Common for domain ownership checks and mail configuration; it does not affect hosting directly |

**TTL** is a record's cache lifetime in seconds: it decides how long the rest of the world takes to see a change. Day to day you can keep it large (for example `3600`); **lower it before a migration** (for example to `300`), wait for the old TTL to expire, and only then switch, so you can switch back quickly if something goes wrong. For the full procedure see [Server Migration](/tutorials/ops/server-migration).

### What SRV records are for

Minecraft listens on port `25565` by default. If your service runs on another port, or on a different machine entirely, players would have to type `mc.example.com:25566`. **An SRV record removes the port**: it tells the client which host and port the Minecraft service behind that name actually uses, so players only type the domain.

Java Edition always queries `_minecraft._tcp.<your-domain>`. In a zone file it looks like this:

```dns
; Players type mc.example.com; the service actually runs on node1.example.com:25566
_minecraft._tcp.example.com.  3600  IN  SRV  10 5 25566 node1.example.com.
node1.example.com.            3600  IN  A    203.0.113.10
```

The four numbers mean:

| Field | Example | Meaning |
| --- | --- | --- |
| `priority` | `10` | **The lowest value wins**; only records with equal priority share traffic |
| `weight` | `5` | Weight, used only among equal priorities; selection is proportional, so a larger value is picked more often |
| `port` | `25566` | **The port the service actually listens on**, not 25565 |
| `target` | `node1.example.com.` | The hostname the service actually runs on; it **must resolve on its own** |

Two hard rules apply to `target`: it must be a hostname, and it should normally point at a name that has `A` / `AAAA` records. Do not point it at a CNAME, and never chain a CNAME to another CNAME.

:::warn Never put an IP literal in target
Setting `target` to an IP address (for example `SRV 10 5 25566 203.0.113.10.`) is **invalid**. Clients ignore the record, even if your DNS panel happily accepts it. Create an `A` / `AAAA` record for the host and point `target` at that hostname instead.
:::

:::warn The most common mistake: a missing trailing dot
In most DNS provider UIs, `target` must be written as a fully qualified name **with a trailing dot** (`node1.example.com.`). Without it the panel treats the value as relative to the current zone, and you end up with `node1.example.com.example.com.` — the record is useless, and **nothing reports an error**.
:::

### Bedrock Edition does not use SRV

This point needs to be stated plainly:

- **Java Edition clients do query `_minecraft._tcp` SRV records**, so Java players can join with the bare domain.
- **Bedrock Edition clients do not use SRV records at all.** Bedrock players must type `host:port` (for example `mc.example.com:19132`), or use a DNS name that resolves directly to the right address with the right port.

SRV is therefore a **Java-only convenience**. If your server serves both editions, one SRV record will not cover everyone — Bedrock players still have to include the port.

### Verifying that the records actually work

```bash
# Check the SRV record (Linux / macOS)
dig +short SRV _minecraft._tcp.example.com

# Check the SRV record (Windows, or a machine without dig)
nslookup -type=SRV _minecraft._tcp.example.com

# Check the A record
dig +short A example.com
```

- A healthy `dig +short SRV` returns four fields such as `10 5 25566 node1.example.com.`; an empty answer means the record is not live, the name is misspelled, or you are not querying an authoritative server.
- Then run `dig +short A node1.example.com` to confirm that **the target itself resolves** — this is the step people skip most often.
- Finally, test from the client: add the server in-game, type only the domain, and see whether the client fills in the port and connects.

DNS changes are not instant; you have to wait for the old TTL to expire. While troubleshooting, query the authoritative server directly (`dig @ns1.example.com ...`) to confirm the record is correct, then wait for caches to expire. **The nastiest property of a broken SRV record is that it fails silently**: the client simply cannot connect, and never tells you that SRV is the problem.

### Common failures

| Symptom | Cause | How to check |
| --- | --- | --- |
| Works by IP, fails by domain | The SRV `target` does not resolve, or `port` is wrong | `dig +short SRV _minecraft._tcp.your-domain`, then `dig +short A` on the target |
| Connects, but to a different server | A stale record, or the change has not passed the TTL yet | Compare the `dig` output with the real IP and port; lower the TTL first if you need to change it |
| Bedrock players cannot use the short address | Bedrock Edition has no SRV support | Tell them to use `host:port`, or provide a second name that resolves directly |
| The record was added but nothing changed | The TTL has not expired, or you edited the wrong zone (changing `example.com` while players query `mc.example.com`) | Query the authoritative server; confirm the record sits in the right zone |
| The name resolves but connections fail | DNS is fine; the firewall or security group is blocking the port | Test from an external machine with `telnet <domain> <port>` or `nc -vz <domain> <port>` |

### Extra records for proxies and panels

- If you run a **Velocity / BungeeCord proxy**, the SRV `target` should point at the **proxy** and `port` should be the proxy's listening port, not a backend server.
- If you use a **panel** (MCSManager, Pterodactyl and similar), the panel's own address is a separate concern: it usually needs its own subdomain (such as `panel.example.com`) behind a reverse proxy. **That is independent of the game's SRV record** — do not try to combine them into one record.
- Some providers or data centres also require extra verification records (`TXT`, `CNAME`); add them exactly as instructed.

## 6. Pre-Launch Security Checklist

- [ ] `online-mode` left at `true` (unless you fully understand the risks)
- [ ] Console / RCON port (such as `25575`) **never exposed to the internet**
- [ ] On Linux, **do not run the server as root** — use a dedicated user
- [ ] A whitelist or join review is configured (test with a small group before going public)
- [ ] **Automatic backups** are enabled (see "Backup and Recovery")
- [ ] **Anti-grief and logging plugins** are installed (see "Plugins" and "Anti-Cheat")
- [ ] Port reachability has been verified from an external machine

## Next Step

Once the server is running, learn the most common commands first: see [Common Server Commands](/tutorials/java/commands).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
