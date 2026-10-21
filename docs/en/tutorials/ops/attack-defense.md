---
title: Common Attack Types and Minecraft-Specific Defense
slug: attack-defense
cat: ops
level: 3
order: 11
minutes: 20
tags: [ddos, udp-flood, bot-attack, firewall, rate-limit, bedrock, motd, ops]
updated: 2026-10-04
draft: false
---

[Network Security Fundamentals](/tutorials/ops/network-security) is about closing the doors: opening only the ports you need, restricting sources, hardening SSH. This article covers a different situation: **the doors are shut, but someone is ramming a truck into them** — a network attack.

Start with an unwelcome but necessary conclusion: **a volumetric attack cannot be solved with server-side configuration.** The sections below explain why in detail, and what you can realistically do about it.

## 1. Attack Taxonomy

Roughly by OSI layer, almost everything you will face falls into one of two families.

### 1.1 Layers 3 and 4: Volumetric and Protocol Attacks

| Attack | Protocol | Signature | Main impact |
| --- | --- | --- | --- |
| **UDP flood** | UDP | A flood of UDP datagrams at one port or random ports | Link saturation, NIC and softirq exhaustion |
| **SYN flood** | TCP | `SYN` packets that never complete the handshake, filling the connection table | New connections fail, `backlog` overflows |
| **ICMP flood** | ICMP | A flood of `echo request` (ping) packets | Bandwidth and interrupt overhead |
| **Reflection/amplification** | UDP | Spoofed-source queries to third-party servers, whose replies hit you | Link saturation, **and the senders you see are innocent third parties** |

**Reflection and amplification** deserve a careful explanation: the attacker forges **your IP address** as the source and sends a **tiny request** to a large number of open services (DNS resolvers, NTP, memcached, SSDP, CLDAP); those servers send a **much larger response** back to the apparent requester, which is you; and the traffic you receive equals the traffic the attacker sent multiplied by the amplification factor.

The **amplification factor** is response bytes divided by request bytes. It depends on the third-party service's configuration, and varies enormously between protocols, implementations and versions, so the table below is an **order-of-magnitude reference only** — do not treat it as exact:

| Reflector | Common port | Amplification order of magnitude | Notes |
| --- | --- | --- | --- |
| DNS | UDP `53` | Tens | Depends on response size and EDNS support |
| NTP | UDP `123` | Hundreds | Historically the `monlist` query; modern NTP restricts it by default |
| memcached | UDP `11211` | Extreme (tens of thousands) | Devastating, but requires a UDP memcached exposed to the internet |
| SSDP | UDP `1900` | Tens | UPnP on home routers and smart devices |
| CLDAP | UDP `389` | Tens | Exposed LDAP services |

:::warn Why the source IP is usually spoofed
UDP is **connectionless**: when the kernel receives a datagram, it does not first verify that the claimed source address can actually receive a reply, so an attacker can write any source address into the packet — **including yours**.

The consequence matters: **the source addresses you capture are fake**, so **for spoofed UDP traffic, attribution and IP blocking are largely meaningless** — you would only hurt other people.
:::

### 1.2 Layer 7: Application Attacks (Minecraft-Specific)

Application attacks do not aim at bandwidth; they aim at **your program's processing capacity**. Every request consumes CPU, memory or a database connection, and the attacker's cost is far below yours.

Three families matter for Minecraft, each covered by its own section below:

| Type | One-line description | See |
| --- | --- | --- |
| **Status ping (MOTD) floods** | Refresh the server list relentlessly, forcing you to build responses | Section 4 |
| **Fake-player / bot floods** | Mass bots joining or half-open logins filling slots and resources | Section 5 |

### 1.3 The Decisive Distinction: Can You Identify the Attacker?

This is the single most important dividing line in this article:

| Traffic type | Attacker identifiable? | Why |
| --- | --- | --- |
| **UDP traffic with spoofed source** | **Generally no** | The source address is fake; replies never reach the attacker |
| **TCP-based bot attacks** | **Usually yes** | A TCP connection requires a completed three-way handshake, which requires a **genuinely reachable IP address** |
| **Login/join-stage attacks** | **Usually yes** | Reaching the handshake stage requires a real TCP connection first |

**Practical consequences:**

- Against UDP floods, your only levers are **rate limiting plus upstream scrubbing**; do not count on blocking IPs.
- Against TCP bot floods, **connection-level limits (connlimit, connection rate) and account-level verification (`online-mode`, whitelist) do work**, because the attacker must expose real addresses and — with authentication enabled — must hold real accounts.

## 2. DDoS Fundamentals: Why "Block the Attacker IP" Fails

### 2.1 What a DDoS Is

A **DoS** attack makes a service unavailable with one stream of traffic. A **DDoS (Distributed DoS)** does it with **thousands of machines** across different networks and providers, all hitting you at once. Those machines are usually infected consumer devices, cheap VPS instances or IoT hardware — collectively a **botnet**. What matters is not how strong one machine is but **aggregate bandwidth**: 1,000 devices at 10 Mbps each is 10 Gbps.

### 2.2 Why "Block the Attacker IP" Fails Against Volumetric Attacks

This is the most common misunderstanding, so it is worth spelling out:

1. **The traffic is already on your link.** Your firewall (`iptables` / `nftables` / Windows Firewall) runs on **your machine or your router**. By the time attack traffic reaches that NIC, **your uplink is already saturated**. All the firewall can do is drop those packets — and **dropping packets does not give the bandwidth back**. The link stays full and legitimate players still cannot connect.
2. **Dropping packets costs resources too.** A flood of small packets burns CPU in NIC interrupts and softirq handling. In bad cases you cannot even SSH in, and logs stop being written.
3. **The source addresses are numerous and constantly changing.** You cannot maintain a million-entry blocklist, and with spoofed UDP sources most of that list would be innocent hosts.
4. **Your upstream is the bottleneck.** What determines whether you survive is the **capacity of your hosting link** and whether your provider **scrubs traffic ahead of you** — not the rules on your machine.

### 2.3 What a Host or Provider Can Actually Do

| Lever | Where it acts | Notes |
| --- | --- | --- |
| **Capacity** | Upstream | Hosting bandwidth larger than the attack. The most fundamental layer. |
| **Upstream scrubbing** | Upstream | Traffic is diverted to a scrubbing centre, filtered, and reinjected. **This is the primary answer to volumetric attacks.** |
| **Edge rate limiting** | Upstream or your border | Rate-limit before traffic reaches your machine, protecting the backend. |
| **Architecture changes** | Your design | Hide the origin behind a proxy, place the service behind a protected entry point, offload static assets to a CDN. |

:::warn Do not assume "my cloud provider includes DDoS protection" is enough
Free protection tiers differ enormously between providers in **threshold, scrubbing method, trigger conditions, extra cost and availability of dedicated high-protection IPs**, and the terms change over time. **Read the official documentation and contract before you buy**, and establish: what the free threshold is, whether traffic above it is scrubbed or blackholed (your IP simply cut off), whether dedicated protection products exist, and what the IP-change policy is. **This article does not guess at those details; your provider's official documentation governs.**
:::

## 3. UDP Floods and Why Bedrock Is Exposed

### 3.1 Why Bedrock Is Structurally Easier to Attack

| Fact | Consequence |
| --- | --- |
| Bedrock uses **UDP `19132`** (IPv6 `19133`) | UDP is connectionless and spoofable: **easy to flood and hard to attribute** |
| **Geyser** also listens on UDP (Bedrock-compatible by default, configurable) | A Java server with cross-play gains an extra UDP entry point |
| UDP has no handshake | The attacker needs neither a real IP nor any negotiation: **one byte is one packet** |
| The server must answer | Some query-style requests cost more to process than to send, creating a natural amplification surface |

### 3.2 Symptoms While Under Attack

- **The bandwidth graph is pinned** while server logs show nothing unusual;
- **TPS is fine but players keep timing out**: the server itself is not struggling; the **network path** is saturated;
- NIC receive rates spike, `softirq` usage climbs, and SSH becomes extremely difficult or impossible to reach.

Read-only commands for observation:

```bash
# UDP listening sockets (ss shows sockets, not traffic volume)
ss -uanp

# Cumulative per-NIC packet and drop counters (substitute your real NIC, e.g. eth0 / ens3)
ip -s link show dev eth0

# Kernel counters: compare two samples
cat /proc/net/dev

# Packets matched by your firewall rules (requires root)
sudo iptables -L INPUT -v -n

# nftables: rules carrying counters or dynamic sets
sudo nft list ruleset
```

:::note Counters only mean something as a delta
`/proc/net/dev`, `ip -s link` and `nft list ruleset` all report **cumulative** values. To judge whether you are under attack, look at the **increase per unit time**: sample twice about fifteen seconds apart, diff `RX bytes` / `RX packets`, and convert to Mbps and pps. A single sample tells you nothing.
:::

### 3.3 First Defense: Shrink the Exposure

**The most important rule: open only the UDP ports you genuinely need.** A pure Java server (no Geyser, no cross-play) **needs no UDP port exposed at all**; if you need Bedrock or Geyser, open only `19132` (plus IPv6 `19133` if you actually use it); and do not open a pile of UDP ports because a tutorial listed them — ports you do not need are attack surface you can simply delete.

### 3.4 Host-Side Rate Limiting with iptables hashlimit

The `hashlimit` module tracks rates per key — here, per source IP — and matches the rule once the rate is exceeded:

```bash
# 1) Log first, without dropping: use this to observe a real baseline (run it for a day or two)
sudo iptables -A INPUT -p udp --dport 19132 \
  -m hashlimit --hashlimit-above 200/sec --hashlimit-burst 400 \
  --hashlimit-mode srcip --hashlimit-name mc-udp-observe \
  -j LOG --log-prefix "MC-UDP-OVER: " --log-level 4

# 2) Once the threshold looks sane, add the rule that actually drops
sudo iptables -A INPUT -p udp --dport 19132 \
  -m hashlimit --hashlimit-above 200/sec --hashlimit-burst 400 \
  --hashlimit-mode srcip --hashlimit-name mc-udp \
  -j DROP
```

Options explained:

| Option | Meaning |
| --- | --- |
| `--hashlimit-above 200/sec` | Matches a single source IP exceeding 200 packets per second. **The unit suffix is required** (`/sec`, `/min`, `/hour`, `/day`); a bare number is rejected on most versions |
| `--hashlimit-burst 400` | Allowed burst. The first 400 packets in the burst window pass, absorbing normal jitter |
| `--hashlimit-mode srcip` | Count separately **per source IP** (alternatives include `srcport`, `dstport`) |
| `--hashlimit-name mc-udp` | The kernel-side table name. **Rules sharing a name share counters**, so the observation rule and the drop rule must use different names |
| `-j LOG` / `-j DROP` | The former writes to the kernel log (`dmesg` / `journalctl -k`) for observation; the latter silently discards. `-j REJECT` is possible, but on UDP it generates ICMP and is usually unnecessary |

:::warn Availability depends on your kernel and version
`hashlimit` requires kernel support for `xt_hashlimit`, and `iptables` must be able to load the module when you specify `-m hashlimit`. **The rule syntax is the same on the `iptables-legacy` and `iptables-nft` front ends, but persistence differs.** If you see a missing module or option error, check `iptables --version` and `modinfo xt_hashlimit` on your own system and consult your distribution's documentation. Also note that `iptables` rules **are not persistent by default** and vanish on reboot; see [Network Security Fundamentals](/tutorials/ops/network-security) for how to save them.
:::

### 3.5 Host-Side Rate Limiting with nftables: a Dynamic Set and `limit rate over`

The modern nftables approach is to build a **dynamic set keyed by source IP**, mark sources that exceed the threshold, and drop them.

Below is a **complete, loadable minimal example** (save it as `mc-udp-limit.nft` and load with `sudo nft -f mc-udp-limit.nft`):

```bash
#!/usr/sbin/nft -f

# Dropping any pre-existing table of the same name avoids duplicate-load errors;
# before running this, confirm nothing else depends on that table.
table inet mcguard
delete table inet mcguard

table inet mcguard {
    set udp_flood_v4 {
        type ipv4_addr
        flags dynamic, timeout
        timeout 10m
    }

    chain input {
        type filter hook input priority 0; policy accept;
        udp dport 19132 jump udp_guard
    }

    chain udp_guard {
        # Add any source exceeding 200/second (burst 400) to the set
        update @udp_flood_v4 { ip saddr limit rate over 200/second burst 400 packets }
        # Log the rate-limited source for observation, then drop it
        ip saddr @udp_flood_v4 log prefix "MC-UDP-OVER: " level warn
        ip saddr @udp_flood_v4 drop
    }
}
```

Key points:

| Syntax | Meaning |
| --- | --- |
| `set ... { type ipv4_addr; flags dynamic, timeout; timeout 10m; }` | A dynamic set whose entries expire automatically, so it **cannot grow without bound** |
| `limit rate over 200/second burst 400 packets` | Matches only when the rate is **above** 200/second (plain `limit rate` means "up to"). `over` is the keyword |
| `update @set { ... }` | On a match, **insert the key** (`ip saddr`) into the set |
| `ip saddr @set drop` | Drop everything whose source is in the set, so **once a source is caught it stays dropped until the set entry expires**; the example builds its set on `ip saddr` (IPv4) only, so **IPv6 needs a separate `ipv6_addr` set and rules** |

:::warn The nftables syntax above is version-dependent
`flags dynamic, timeout`, `limit rate over` and `update @set` are all relatively recent syntax. **Verify against `nft --version` on your own system and the official nftables wiki.** Before loading, run `sudo nft -c -f mc-udp-limit.nft` (`-c` checks syntax without applying it). **A broken ruleset can lock you out of your own machine** — confirm you have VNC or a rescue console at your provider first.
:::

### 3.6 The Cost of Rate Limiting: Real Players Get Caught Too

**Every rate limit is a potential false positive.** Normal players do not send 200 packets per second, but **network jitter, retransmissions, and bursty client or plugin behaviour** create short spikes; set the threshold too low and **real players get disconnected or stutter**, in ways that are hard to reproduce and hard to diagnose; set it too high and the attack traffic sails straight through.

The recommended workflow is therefore **observe first, drop later**:

1. Add only a `LOG` rule (iptables) or `log` statement (nftables), with a threshold several times your expected normal peak;
2. Watch it for a day or two and see how many entries come from apparently legitimate IPs; once you are satisfied the threshold will not misfire, switch to `DROP`;
3. After deployment, keep watching player reports and retune as needed.

:::tip Rate limiting reduces damage; it does not grant immunity
Host-side rate limiting meaningfully reduces the harm of **low-volume** floods, and delays the moment a large flood saturates your link. It **cannot** stop a 10 Gbps attack from filling a 1 Gbps link. The real answer is always upstream.
:::

## 4. MOTD and Status Ping Floods (Minecraft-Specific)

### 4.1 What the Status Protocol Is

The server list entry a Minecraft client shows — online count, MOTD, latency, version, icon — comes from a **status query**. Its defining property: **any client can query it, with no login, no account and no joining.**

| Platform | Query mechanism | Transport |
| --- | --- | --- |
| **Java Edition** | Server List Ping (the modern status request, on the game port) | **TCP**, default `25565` |
| **Bedrock Edition** | Unconnected Ping / Pong (RakNet) | **UDP**, default `19132` |

Attackers like it for straightforward reasons: it is **cheap to send** (one very small request), **more expensive to answer** (the server assembles MOTD, player list, icon and version data), **amplifiable** (forge the victim's source address and the response attacks them instead), and useful for **reconnaissance** (a burst of queries measures your responsiveness, reveals your player count, and hints at whether anything protects you — before a larger attack is chosen).

### 4.2 Turning the Query Protocol Off: Useful, but Understand What It Turns Off

Vanilla `server.properties` has two relevant keys:

```properties
enable-query=false
query.port=25565
```

:::warn Disabling query does not hide your MOTD
- The **query protocol** (`enable-query`) is the legacy **GameSpy4 query protocol** over **UDP**, on the port given by `query.port`, used by third-party tools and websites to poll server information;
- The **status information shown in the server list (MOTD, player count, latency)** comes from the **modern Server List Ping**, which on Java Edition is a **TCP status request on the game port**. It is an **entirely separate mechanism** from query.

So: **setting `enable-query=false` does not remove your server from the player's server list and does not hide the MOTD**, it merely closes an extra query entry point you almost certainly do not need. If you have no third-party query tooling, disabling it is good hygiene for reducing exposure — but do not expect it to stop a ping flood.
:::

### 4.3 Rate Limiting the Status Port

The approach is identical to section 3, but on TCP:

```bash
# Java Edition: limit the new-connection rate from a single source IP to TCP 25565.
# This matches new connections only, so players already in game are unaffected.
sudo iptables -A INPUT -p tcp --dport 25565 --syn \
  -m hashlimit --hashlimit-above 10/sec --hashlimit-burst 20 \
  --hashlimit-mode srcip --hashlimit-name mc-ping \
  -j DROP
```

Notes: `--syn` matches only connection-initiating packets, so **players already online are not affected**. Tune the threshold (10/sec here) to your situation: one player queries only a few times, but **multiple players behind the same NAT share a source IP** — schools, internet cafes and shared households are easy to hit by accident, so do not set it to `1/sec`. The nftables equivalent reuses the dynamic set from section 3.5, with the set typed as `ipv4_addr` and the match changed to `tcp dport 25565` plus a `tcp flags syn` test.

### 4.4 Put a Proxy in Front

Placing a **proxy (Velocity / BungeeCord) at the front**, with backends accepting connections only from the proxy, is a high-value step:

- Player connections terminate at the proxy, so **your backend IP never appears in the player's list**, and an attacker must first discover the real address;
- The proxy can enforce connection rate limits and verify a forwarding secret, **rejecting connections that fail the check**; backends can also be configured to trust only the proxy (forwarding-mode settings — **the exact keys differ between software and versions; rely on the configuration your own server generates and on the official documentation**).

See [Proxies](/tutorials/java/proxy) for setup and forwarding configuration.

### 4.5 Minecraft-Aware Filtering Services

There are **filtering and protection services aimed specifically at Minecraft** (TCPShield and similar): players connect to the provider's points of presence, the provider performs protocol-level inspection and filtering, and clean traffic is forwarded to your backend.

**Treat these as an option rather than a requirement**, because exact capabilities — supported versions, Bedrock/UDP support, Geyser support, required forwarding mode, pricing and traffic quotas — **vary widely between providers and change as products evolve**; because introducing a third party means **player traffic passes through them**, which is a privacy and trust decision; and because setup usually requires your backend to accept connections only from the provider's addresses, where **a mistake takes the whole server offline**.

**Conclusion: evaluate it as one candidate. Verify its real capabilities against the provider's own documentation; this article makes no promises on their behalf.**

### 4.6 The Honest Conclusion for Bedrock

**Bedrock cannot fully disable the status ping**: the client relies on it to display server list information, and the server must answer the RakNet unconnected ping. Bedrock therefore has exactly two paths against ping floods:

1. **Upstream protection or scrubbing** (most effective, and provider-dependent);
2. **Rate limiting UDP per source IP at the border or on the host** — reuse the rules from sections 3.4 and 3.5 with `--dport 19132`.

## 5. Bot and Fake-Player Floods

### 5.1 What It Is

A **fake-player flood** uses automation to manufacture large numbers of "players", or half-finished players, in order to **fill slots, burn CPU and memory, spam chat and lock real players out**.

Common variants:

| Variant | Method | Main cost |
| --- | --- | --- |
| **Connection flood** | Complete the TCP connection only, with no Minecraft protocol exchange | Connection table, file descriptors, handshake overhead |
| **Login flood** | Send the handshake and begin login, never finishing | Login-stage CPU, authentication requests, memory |
| **Idle bots** | Join fully, then do nothing | Player slots, entity/chunk loading, memory |
| **Chat / command spam** | High-frequency chat or commands after joining | Main-thread parsing, log I/O, harassment |
| **Item / interaction request spam** | High-frequency packets triggering interaction logic | Server main thread, anti-cheat plugin overhead |

:::note Why game servers suffer disproportionately
Minecraft is a **stateful, long-lived connection** service. A web server finishes a request and disconnects, spreading cost thin; every additional Minecraft player must be **held in memory, load chunks, synchronise entities and maintain a connection**. At equal attacker cost, the damage to a game server far exceeds that to a static website.
:::

### 5.2 Defenses, Ordered by Effectiveness

#### First: `online-mode=true` (Java) / Xbox Live verification (Bedrock)

**This is the single most effective measure.** With authentication on, joining requires a **genuine Mojang/Microsoft account**, so a bot herder must supply a real account per fake player — turning the cost from "nearly zero" into "per account".

Java Edition `server.properties`:

```properties
online-mode=true
```

:::warn Understand the price of offline mode
`online-mode=false` means **anyone can join under any ID**, including impersonating administrators and other players. That is an identity-layer hole no firewall can patch. **Only consider offline mode if you fully accept the consequences and compensate with a whitelist or a login plugin.** See [Server Configuration](/tutorials/java/config) for the related discussion.
:::

Bedrock has no `online-mode` key; it uses **Xbox Live authentication**. The exact switch name and default **differ between server software (the official BDS and third-party Bedrock servers) and versions**, so rely on the `server.properties` your own server generates and on the official documentation. **The principle stands: do not disable authentication for convenience.**

#### Second: Whitelist / Allowlist

For small servers, **a whitelist is more thorough than any rate limit**: unknown players simply cannot connect, so bots never even reach the door.

Java Edition `server.properties`:

```properties
white-list=true
enforce-whitelist=true
```

| Key | Effect |
| --- | --- |
| `white-list` | Only listed players may log in |
| `enforce-whitelist` | **Immediately kicks online players who are not on the list** when it changes. Without this, newly added entries only take effect after a reconnect |

Maintain the list with console or in-game commands (`whitelist add <player>`, `whitelist list` and so on). **Exact syntax depends on your server version.**

Bedrock uses **`allowlist.json`** in the server root directory, normally maintained through the allowlist-related commands. **The file format and the property key that enables it vary between server software and versions; rely on the `allowlist.json` your own server generates and on the official documentation, rather than copying an example file from a tutorial.**

#### Third: Connection Throttling (`spigot.yml`)

Spigot and its derivatives (Paper, Purpur and others) expose a connection throttle in `spigot.yml`, at this key path:

```yaml
settings:
  connection-throttle: 4000
```

| Item | Meaning |
| --- | --- |
| `connection-throttle` | **Milliseconds that must elapse between two connections from the same source address.** `4000` means four seconds; setting it to `-1` generally means the throttle is **disabled** |
| Default | **Varies by core and version.** 4000 ms is common, but do not assume yours matches |

**What it stops**: a script reconnecting rapidly from one IP.
**What it does not stop**: distributed bots from many different IPs, where each IP connects once and the throttle never triggers.

:::warn Do not set the throttle too high
Values of tens of seconds **badly hurt legitimate players**: reconnecting after a disconnect takes ages, and households or internet cafes sharing one egress IP may be locked out entirely. Start from the default and adjust only modestly when there is a real need.
:::

#### Fourth: Firewall Connection Limits

Limiting **concurrent connections per source IP** helps against connection floods and half-open logins:

```bash
# iptables: at most 8 concurrent connections to 25565 from one IPv4 address
sudo iptables -A INPUT -p tcp --dport 25565 \
  -m connlimit --connlimit-above 8 --connlimit-mask 32 \
  -j REJECT --reject-with tcp-reset
```

| Option | Meaning |
| --- | --- |
| `--connlimit-above 8` | Matches only above 8 concurrent connections |
| `--connlimit-mask 32` | Groups by **/32**, i.e. counts per individual IPv4 address |
| `-j REJECT --reject-with tcp-reset` | Rejects with an RST (`-j DROP` also works, but REJECT makes clients fail fast instead of hanging) |

The nftables equivalent (using connection tracking counters):

```bash
#!/usr/sbin/nft -f

table inet mcguard
delete table inet mcguard

table inet mcguard {
    chain input {
        type filter hook input priority 0; policy accept;
        # At most 8 tracked TCP connections per source address
        tcp dport 25565 ct count over 8 reject with tcp reset
    }
}
```

:::warn Tune the connection count to how your players actually connect
A real player normally holds one connection (clients with certain mods or plugins may hold more). But **multiple players behind one NAT share a source IP**, so a threshold of 2 or 3 will kick legitimate players. **8 is only an example; adjust it to your player distribution.** `ct count` requires connection tracking (`nf_conntrack`) to be working — make sure you have not disabled the relevant modules or table.
:::

#### Fifth: Paper's Packet Limiter

Paper provides a packet limiter in its **global configuration**: it measures **inbound packet rates per player** and, above a threshold, can **kick that player** and log the event. It helps against attacks that spam small packets after joining (the item/interaction spam in section 5.1, and some bot behaviour).

:::warn Do not copy the config structure from a tutorial
**Key names, nesting and defaults in this block have changed across Paper versions and forks.** The correct procedure is: start the server once normally and let it **generate** its own configuration files; open the configuration your own server generated and locate the packet-limiter block; edit **according to the structure actually present in your file**, rather than pasting a snippet from the internet; then check the startup log for configuration parsing warnings.

This section therefore **deliberately omits specific key names and values** — publishing a structure that may be out of date is more dangerous than publishing nothing.
:::

#### Sixth: Hide the Backend Behind a Proxy

As in section 4.4: **do not expose backend ports directly to the internet**; allow only the proxy's addresses. Even if someone learns your real IP, they must get past the proxy first. See [Proxies](/tutorials/java/proxy).

#### A Note on Anti-Bot Plugins

The community offers various anti-bot and join-verification plugins (captchas, command verification, throttling and so on). They **raise the attacker's cost**, especially against low-quality scripts; but they are all **application layer**, meaning the traffic has already reached your server and consumed handshake and partial login resources; and **quality varies**, with some carrying their own performance or compatibility problems.

**Evaluate them yourself**: is it still maintained, is it open source, is it compatible with your server version, and does it survive a load test on a staging server before you put it into production?

### 5.3 `max-players` Is a Soft Limit

```properties
max-players=20
```

`max-players` only sets **the number shown in the server list** and rejects players at the **login stage** once that many are online. It is **not** a flood defense: bots **consume CPU, authentication requests and memory during login**, and that cost is paid before the rejection; a connection flood that only opens TCP connections **never reaches this check at all**; and it affects neither bandwidth nor query floods.

**Treat `max-players` as a capacity statement, not a defense.**

## 6. Practical Defense Checklist

### 6.1 Layered Checklist (Must-Do to Nice-to-Have)

| Priority | Measure | Notes |
| --- | --- | --- |
| **Must** | `online-mode=true` (Java) / keep Xbox Live verification (Bedrock) | The single most effective anti-bot measure |
| **Must** | Open only the ports you truly need | A service that is not exposed cannot be attacked; be especially sparing with UDP |
| **Must** | Host firewall default-deny inbound, allow only listed ports | See [Network Security Fundamentals](/tutorials/ops/network-security) |
| **Must** | Keep the OS and software patched; tighten permissions | See [System Hardening](/tutorials/ops/system-security) |
| **Must** | Regular backups, with **at least one offline or offsite copy** | The last line against ransomware and sabotage; see [Backup and Restore](/tutorials/java/backup) |
| **Strongly recommended** | Whitelist / allowlist (small servers) | Unknown players simply cannot connect |
| **Strongly recommended** | Per-source-IP rate limits on game ports | The rules in sections 3.4, 3.5, 4.3 and 5.2 |
| **Strongly recommended** | Monitoring and alerting (bandwidth, connections, CPU, player count), plus a host or provider with clear protection terms | See section 6.3 |
| **Recommended** | Proxy in front; backend never directly exposed | See [Proxies](/tutorials/java/proxy) |
| **Recommended** | Plan entry points for Bedrock / cross-play players with [Mobile Player Support](/tutorials/java/mobile) | Cross-play adds UDP exposure |
| **Recommended** | A written incident response plan | See section 6.4 |
| **Nice to have** | Minecraft-aware filtering services | Capabilities vary by provider; pilot them first |
| **Nice to have** | Anti-bot plugins | Evaluate yourself; never the only layer |

### 6.2 Attack Type to Defense Mapping

| Attack type | What actually helps | What does not help |
| --- | --- | --- |
| **UDP flood (spoofed source)** | Upstream scrubbing and capacity, opening only needed UDP ports, per-source-IP edge rate limits | Blocking individual IPs, server plugins, `max-players` |
| **Reflection/amplification (DNS / NTP / memcached / SSDP / CLDAP)** | **Upstream scrubbing** (the only effective layer), hosting capacity | Any host-side rule (the link is already full), complaining to the third party (you are both victims) |
| **SYN flood** | Upstream scrubbing, kernel `syn`-related tuning, absorption at a load balancer or proxy | Application-layer rate limits, whitelists |
| **MOTD / status ping flood** | Per-source TCP connection rate limits, proxy in front, upstream filtering | Disabling `enable-query` (it governs something else), IP blocking (high volume, widely distributed) |
| **Bedrock ping flood** | Upstream protection, per-source rate limits on UDP `19132` | Disabling the ping (**not possible**), server-side configuration |
| **Connection flood / login flood (half-open logins)** | Firewall `connlimit` / `ct count`, `online-mode` or authentication, proxy in front, upstream scrubbing | `max-players`, chat filters, whitelists (in offline mode they apply after login) |
| **Idle bots / spam** | `online-mode` plus a whitelist, `connection-throttle`, packet limiter, staff action | Bandwidth protection (these attacks barely use bandwidth) |
| **Exploitation / privilege escalation** | Timely updates, least privilege, `online-mode` | Firewalls (the attack is at the application layer) |

### 6.3 Monitoring and Alerting: No Alerts Means No Monitoring

At minimum you must be able to answer "am I being attacked right now":

| Metric | Where to look | What abnormal looks like |
| --- | --- | --- |
| **Bandwidth / packet receive rate** | Provider traffic graphs, `/proc/net/dev`, `ip -s link`, `vnstat` | Far above historical peaks with no matching rise in players |
| **Connection count** | `ss -tan state established \| wc -l`, `ss -s` | Connection count spikes while player count does not |
| **CPU and softirq** | `top`, `mpstat -P ALL 1` | Few players but high `%soft` (typical of small-packet floods) |
| **Player count and login failures** | Server logs, panel | Many login attempts, many bogus IDs |
| **Firewall hit counters** | `iptables -L -v -n`, `nft list ruleset` | Rate-limit rules keep incrementing |

```bash
# Established connection count (pair with ss -s for the socket summary)
ss -tan state established | wc -l

# Per-core CPU including softirq, refreshed every second
mpstat -P ALL 1

# Cumulative NIC counters (diff two samples)
ip -s link show dev eth0

# Rate-limit hits recorded in the kernel log (paired with LOG / log rules)
sudo journalctl -k | grep -i 'MC-UDP-OVER' | tail -n 20
```

:::tip Let your provider's panel stand watch
Most cloud consoles offer **bandwidth graphs and alerting**. Set thresholds at "historical peak plus headroom" and get notified when they trip — **far more useful than reading logs after the fact**. The exact configuration path differs by provider; follow their official documentation.
:::

### 6.4 A One-Page Incident Response Plan

The moment you are under attack is not the moment to start thinking. Write this down in advance:

1. **Diagnose**: use the metrics in 6.3 to confirm whether this is an **attack** or **your own bug** (a plugin loop, a backup job saturating disk I/O, a corrupted world causing stalls).
2. **Stop the bleeding and call upstream**: absorb it if you can; if you cannot, temporarily **allow only whitelisted IPs or only the proxy's IP**, and open a ticket with your provider describing the timing, symptoms and traffic profile — ask whether scrubbing has triggered and whether an IP change is needed.
3. **Preserve evidence and recover**: save traffic graphs, logs and `ss` output, because **these are the only basis for a provider dispute and for your own post-mortem**; once the attack stops, verify server health (TPS, connection count, world integrity) before lifting temporary restrictions.
4. **Review**: how large was the attack? Which layer held and which did not? What should you buy or configure next time?

:::warn Backups are part of an attack, not an afterthought
**Ransomware and retaliatory deletion** are real attack outcomes. The first thing an attacker does after obtaining panel or RCON access is often to delete backups. So: **at least one backup must live on offline media or offsite, and not on a writable path on the game server itself.** See [Backup and Restore](/tutorials/java/backup).
:::

## 7. Honest Limits

1. **Server-side configuration cannot stop a large volumetric attack.** Whether it is `iptables`, `nftables`, a plugin or `max-players`, all of it runs **after the attack traffic has already arrived**. A 1 Gbps link facing a 10 Gbps attack will fall over no matter how perfect your configuration is. **The only real answer is upstream capacity and scrubbing.**
2. **Upstream capability is bought, not configured.** Read the DDoS terms when you choose a host: what the free threshold is, whether excess traffic is scrubbed or blackholed, whether UDP is covered, whether dedicated protection IPs exist, and what an IP change costs. **Asking those questions on the day you are attacked is too late.**
3. **Every rate limit is a potential false positive.** Rate limits hurt real players with bursty traffic and shared-egress networks such as internet cafes and households. **Observe first, drop later, keep tuning** — do not put a threshold copied from the internet straight into production.

## Next Steps

- Network-layer fundamentals (ports, firewalls, SSH): see [Network Security Fundamentals](/tutorials/ops/network-security)
- Hardening inside the operating system (accounts, permissions, systemd): see [System Hardening](/tutorials/ops/system-security)
- Making your server reachable: see [Deploying to a Reachable Environment](/tutorials/java/deploy)
- Proxies and backend isolation: see [Proxies](/tutorials/java/proxy)
- Bedrock and cross-play players: see [Mobile Player Support](/tutorials/java/mobile)
- Your last line of defence for data: see [Backup and Restore](/tutorials/java/backup)

---

> Commands and configuration follow each project's official documentation; the protection capability of carriers and hosting providers varies widely in practice.
