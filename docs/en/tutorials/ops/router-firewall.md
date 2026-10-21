---
title: Software Routers and Port Forwarding
slug: router-firewall
cat: ops
level: 3
order: 8
minutes: 16
tags: [ops, router, firewall, port-forward, nat, cgnat, wireguard]
updated: 2026-10-04
draft: false
---

The server runs locally, the host firewall has been opened, and players still cannot connect. The problem is almost always in **the hops between the public internet and your machine**. This guide explains what each of those hops does, how to configure it, and in what order to troubleshoot when it does not work.

What follows is **concepts plus command-line examples**. Menu names, locations and options in graphical interfaces differ enormously between versions, vendors and firmware builds, and anything version-dependent is marked as such rather than presented as universal.

## 1. What a Router Actually Does

A home "router" is really an all-in-one device doing five jobs. Understanding them separately is what keeps troubleshooting sane:

| Function | What it does | Symptom when broken |
| --- | --- | --- |
| **Routing** | Forwards IP packets between WAN and LAN | No internet at all |
| **NAT** | Translates internal addresses to a public address (SNAT) and back according to rules (DNAT, which is port forwarding) | LAN can reach out; nothing can reach in |
| **DHCP** | Hands out IP addresses, gateway and DNS to LAN devices | Devices get no address, or addresses change |
| **DNS** | Resolves, forwards and caches names, and provides local names | IP addresses work, names do not |
| **Firewall** | Stateful filtering that decides which traffic is allowed | A bad rule blocks everything or allows everything |

**Port forwarding is DNAT**: a packet addressed to the public IP on some port has its destination address and port rewritten and is sent to an internal machine. It is not the same thing as a firewall rule:

- **NAT decides where the packet goes.**
- **The filter rule decides whether it may pass.**

Both must hold for a forward to work. This is why on pfSense-style systems you can add a port forward and still get nothing: the filter rule was never permitted (recent versions usually create it automatically - see section 5).

Port forwarding also requires the target machine to have a **stable internal IP**: either a **DHCP reservation** on the router (recommended) or a static address on the host kept outside the DHCP pool. Otherwise a reboot changes the address and the forward points at nothing.

## 2. Home Routers Versus Software Routers

| Option | Suits | Strengths | Costs |
| --- | --- | --- | --- |
| **Home all-in-one router** | Simple needs | Works out of the box, low power, includes Wi-Fi | Limited configurability, vendor firmware often stops receiving updates |
| **OpenWrt** (on supported hardware or x86) | Deep control at low cost | Package manager, scriptable UCI configuration, active community | You maintain it; flashing carries a bricking risk; Wi-Fi driver quality varies by model |
| **pfSense / OPNsense** (x86) | Full firewall and VPN capability | Stateful firewall, NAT, IPsec/WireGuard/OpenVPN, traffic graphs, multiple segments | Needs an x86 box with two or more NICs; more features means more configuration surface |

:::note Menu paths are not knowledge
The interfaces of OpenWrt, pfSense and OPNsense have been rearranged repeatedly across versions: options renamed, moved, and defaults changed. **Remembering the concepts and the configuration file semantics outlives remembering which menu to click.** The command-line examples here target stable interfaces; for graphical steps, follow the official documentation for the version you actually run.
:::

## 3. OpenWrt: Port Forwarding with UCI

OpenWrt keeps firewall configuration in `/etc/config/firewall` and edits it with `uci`. This forwards public `TCP 25565` to `192.168.1.10:25565` on the LAN:

```bash
# 1. Add a new firewall section of type redirect
uci add firewall redirect

# 2. Set fields on that new section (the last item in the list)
uci set firewall.@redirect[-1].name='Minecraft'
uci set firewall.@redirect[-1].target='DNAT'
uci set firewall.@redirect[-1].src='wan'
uci set firewall.@redirect[-1].src_dport='25565'
uci set firewall.@redirect[-1].dest='lan'
uci set firewall.@redirect[-1].dest_ip='192.168.1.10'
uci set firewall.@redirect[-1].dest_port='25565'
uci set firewall.@redirect[-1].proto='tcp'

# 3. Commit and regenerate the firewall rules
uci commit firewall
/etc/init.d/firewall reload
```

What the fields mean:

| Field | Meaning |
| --- | --- |
| `name` | Rule label, for humans only; any string works |
| `target` | `DNAT` means destination NAT. **This is the default for a redirect section**; writing it explicitly is clearer |
| `src` | Source zone, here `wan` |
| `src_dport` | Port that is reached on the public side |
| `dest` | Destination zone, here `lan` |
| `dest_ip` | Internal target address |
| `dest_port` | Internal target port |
| `proto` | Protocol: `tcp`, `udp`, or `tcp udp` (the config parser accepts a space-separated list) |

Everyday operations and gotchas:

```bash
uci show firewall                 # inspect the configuration and confirm the rule landed
uci delete firewall.@redirect[0]  # remove redirect index 0 (check uci show for the real index)
uci commit firewall
/etc/init.d/firewall reload
```

- `uci set` only changes the in-memory configuration. **`uci commit` is what writes `/etc/config/firewall`.**
- `reload` regenerates and loads the rules; no router reboot is needed.
- **OpenWrt 22.03 and later use fw4 (the nftables backend)**; 21.02 and earlier used fw3 (iptables). The `/etc/config/firewall` syntax is essentially the same on both, but **tutorials that tell you to type `iptables` commands do not apply on newer releases** - the equivalent is `nft`.
- The external and internal ports **may differ** (change `src_dport`). Using a different external port reduces scanner noise, but it is **obfuscation, not security**.

For **Bedrock (UDP)**, or when both protocols must be forwarded, write the protocol as a list:

```bash
uci set firewall.@redirect[-1].proto='tcp udp'
```

## 4. OpenWrt: Static DHCP Leases

A forward target must keep its address. Bind a fixed IP to a MAC address on OpenWrt:

```bash
uci add dhcp host
uci set dhcp.@host[-1].name='mcserver'
uci set dhcp.@host[-1].mac='AA:BB:CC:DD:EE:FF'
uci set dhcp.@host[-1].ip='192.168.1.10'
uci set dhcp.@host[-1].dns='1'          # optional: also register the name in local DNS

uci commit dhcp
/etc/init.d/dnsmasq restart
```

Notes:

- Use the target machine's NIC MAC address; **case usually does not matter, but the format must be six colon-separated hex pairs**.
- The `ip` must sit inside the LAN subnet and **outside the dynamic DHCP pool** (OpenWrt's default pool often starts at `100`, so `192.168.1.10` is usually safe - verify against your own configuration).
- After changing `dhcp`, restart **dnsmasq**, not the firewall.
- You may instead configure a static address on the host, but **pick one approach only**; doing both invites conflicts.

## 5. pfSense / OPNsense: Same Concepts, Different Labels

Both systems are FreeBSD with the pf firewall. The concepts match OpenWrt, but the operating model is different: mostly a web interface, backed by `config.xml`. The core ideas:

| Concept | Explanation |
| --- | --- |
| **Interfaces** | Typically WAN and LAN, plus optional OPT interfaces; each maps to a NIC or a VLAN |
| **Port forward** | Under **Firewall > NAT > Port Forward**, add a mapping: interface, protocol, destination port, target IP and port |
| **Associated filter rule** | **NAT and filtering are separate.** Recent versions **create the matching pass rule automatically** when you save a forward; older releases exposed a checkbox such as "Add associated filter rule". **Behavior varies by version - always confirm the rule exists under `Firewall > Rules`.** |
| **Aliases** | Under **Firewall > Aliases** you can name a group of ports or addresses and reference the alias in rules, which keeps them maintainable |
| **Static mappings** | On the DHCP service page (pfSense: `Services > DHCP Server`; OPNsense: its DHCP pages), bind a fixed IP to a MAC address |
| **NAT reflection** | Lets internal clients reach an internal service through the public IP. Usually disabled by default; the options and their names change between versions |
| **Configuration backup** | pfSense: `Diagnostics > Backup & Restore`; OPNsense: `System > Configuration > Backups`. **Export after every change.** |

Version differences worth knowing:

- **OPNsense switched its default DHCP service from ISC dhcpd to Kea in 24.7**, which moved the static mapping pages;
- pfSense ships as CE and Plus lines, where the same feature may sit in different places;
- Both projects have renamed interface labels repeatedly over the years.

So: **follow the official documentation for your installed version**, but the five concepts - WAN/LAN interfaces, NAT port forwards, associated filter rules, aliases, and static mappings - hold in every version.

## 6. Public IPv4 Versus CGNAT

**Before configuring anything, confirm that you actually have a public IPv4 address.** The check is simple:

1. Read the **WAN address** your router received, on its status page.
2. From a different network (a phone on mobile data, for example), visit any "what is my IP" page and note **the address the outside world sees**.
3. Only if the two **match** and the address is not private do you have a public IPv4 address.

Diagnostic clues:

| Observation | Meaning |
| --- | --- |
| WAN address inside `10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16` | Carrier-internal address; classic multi-layer NAT |
| WAN address inside `100.64.0.0/10` | **The CGNAT range (RFC 6598)**; almost certainly no public IPv4 |
| The first `traceroute` hops are all private addresses | Carrier-grade NAT somewhere upstream |
| WAN address is public but nothing can reach in | Either the ISP blocks inbound ports, or your forward/filter rules are wrong - verify step by step |

:::warn Do not assume a phone call gets you a public IP
Policy varies widely by ISP, region and plan: some hand one out free, some charge, some refuse outright, and some reserve it for business lines. **Ask, but do not treat it as guaranteed** - have a fallback plan ready.
:::

Two more situations that look like "no public IP":

- **Double NAT**: the ISP modem also dials and performs NAT, and your router NATs again. Fix it by putting the modem into **bridge mode** (so your router dials), or by adding a second forward on the modem (both layers must forward).
- **ISP port blocking**: common for ports such as 80 and 443 in some regions. Using a non-standard port usually works around it, but **blocking policy depends on the ISP and region**.

## 7. Three Ways Forward Without a Public IPv4

| Approach | How it works | Cost |
| --- | --- | --- |
| **Request a public IP** | The ISP gives you an address that accepts inbound traffic | May be free, billed, or refused; not necessarily static |
| **Use IPv6** | In most regions IPv6 is publicly routable; just open the firewall (see section 8) | Players also need IPv6, and coverage varies widely |
| **VPS relay or tunnel** | A server with a public IP relays traffic back to your home | An extra hop; latency and stability depend on the relay; bandwidth costs money |

Common VPS relay patterns:

- **frp**: run `frpc` at home and `frps` on the VPS, mapping a VPS port to an internal service. Simple, and fine for forwarding a single port (see [Deploying to a Reachable Environment](/tutorials/java/deploy) for an example).
- **WireGuard plus DNAT**: build a tunnel between the home machine and the VPS, then DNAT inbound traffic on the VPS to the tunnel address. Flexible and encrypted, but you own the routing and forwarding rules.
- **Commercial tunnel services**: least effort, but usually rate- or bandwidth-limited and **of uneven quality**.

One thing to check when choosing: **Bedrock uses UDP**, and many tunnel offerings support TCP only, with UDP either unavailable or an extra-cost option. Relaying also adds **tens of milliseconds** of latency depending on geography, which matters for latency-sensitive play.

## 8. IPv6: The Forwarding Model Changes

The essential change with IPv6 is that **addresses are plentiful, so NAT is normally unnecessary**. Consequences:

- There is no port-forwarding (DNAT) layer; instead you **open the firewall for inbound traffic**.
- Each device usually has a **globally routable address** and is directly reachable.
- The firewall's default policy becomes the whole story: **OpenWrt and similar firmware reject inbound WAN connections by default**, so you must add an explicit pass rule.

Permitting `TCP 25565` to one host on OpenWrt:

```bash
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-Minecraft-v6'
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].dest='lan'
uci set firewall.@rule[-1].dest_ip='2001:db8:abcd:1::10'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='25565'
uci set firewall.@rule[-1].family='ipv6'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
/etc/init.d/firewall reload
```

**The prefix is the classic trap:**

- Home connections usually receive a prefix from the ISP through **DHCPv6-PD (prefix delegation)**, commonly `/56`, `/60` or `/64` depending on the ISP, which the router then distributes internally.
- **Many ISPs do not keep the prefix stable.** A reconnect, a modem reboot, or a change on the ISP side can all move it.
- When the prefix changes, the `dest_ip` in the rule above stops matching, and players lose access.
- Ways to cope: ask the ISP for a **static prefix** (not always offered); give the host a **stable interface identifier** (fix the suffix via SLAAC or DHCPv6) and use a script in `hotplug.d/iface` or a scheduled job to **rewrite the firewall rule** automatically; or use a prefix routed to you by a tunnel provider (a third-party arrangement whose reliability you must judge yourself).

Other IPv6 points:

- Clients must use **brackets** when connecting: `[2001:db8:abcd:1::10]:25565`.
- Leave `server-ip` empty in `server.properties` to listen on both IPv4 and IPv6 (empty means bind to all interfaces).
- **A significant number of players have no usable IPv6** (notably in some regions and on mobile networks), so treat IPv6 as a **supplement** to IPv4, not the only way in.
- ULA addresses (`fd00::/8`) give you stable internal addressing, but **external reachability still depends on the ISP's prefix**.

## 9. Edge Security: Forward Only What You Must

Every port forward is a door you open to the internet. The rules:

1. **Forward only what is required.** Minecraft needs `TCP 25565` (Bedrock also needs `UDP 19132`).
2. **Never forward these ports** - they are the most common way in:
   - `TCP 25575` RCON (the protocol is unencrypted; forwarding it hands over your console);
   - `TCP 3306` MySQL/MariaDB, `TCP 5432` PostgreSQL, `TCP 6379` Redis, `TCP 27017` MongoDB, `TCP 9200` Elasticsearch;
   - `TCP 2375` / `2376` Docker API;
   - `TCP 445` SMB;
   - `UDP 623` IPMI (see [Rack Servers, Switches, Hardware Firewalls and UPS](/tutorials/ops/hardware-rack));
   - `TCP 3493` NUT.
3. **Do not expose management panels directly.** Panels such as Pterodactyl or hosting control panels are high-value targets: a single vulnerability hands over the machine.
4. **Move management entry points such as RDP and SSH to a non-standard external port** (public `50022` to internal `22`, for example). This only reduces automated scanning; it **does not replace authentication and hardening**. Keys and second factors are still required.
5. **Prefer a VPN over exposure.** If you need the panel yourself, build a VPN and have the panel listen on an internal address only.
6. **Leave UPnP / NAT-PMP disabled at the edge** unless you truly need it. It lets internal applications punch their own holes, handing your edge policy to software.
7. **Add rate limiting on the firewall** (new connections to `25565`, for example) to blunt connection floods, and combine it with the server's own connection limits.
8. **Run fail2ban or equivalent on panel services**, and keep everything patched.

## 10. WireGuard: Safer Than Exposing a Port

The idea is simple: **do not publish a management port to the world; let remote devices join the internal network instead.** WireGuard is the cleanest option today - a kernel implementation on Linux since 5.6, short configuration, UDP-based.

Generate a key pair:

```bash
wg genkey | tee privatekey | wg pubkey > publickey
chmod 600 privatekey
```

Server side (the machine with a public IP: a VPS, or your software router):

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <server private key>

[Peer]
PublicKey = <client public key>
AllowedIPs = 10.10.0.2/32
```

Client side (your laptop or phone):

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.2/24
PrivateKey = <client private key>

[Peer]
PublicKey = <server public key>
Endpoint = vpn.example.com:51820
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
```

Key points:

- On the server, **`AllowedIPs` both permits which source addresses that peer may use and selects where traffic to those addresses is routed**. `10.10.0.2/32` is a single host. On the client, `10.10.0.0/24` routes **only VPN-destined traffic** through the tunnel (split tunnel), while `0.0.0.0/0, ::/0` makes it a full tunnel.
- **`PersistentKeepalive = 25` belongs on the side behind NAT**, keeping the mapping alive so the server can reach back.
- The client does not strictly need `Endpoint` (the server can initiate), but including it lets the client start the connection.
- Only the **server** needs `UDP 51820` opened (the port is configurable). Clients need no inbound port at all.
- To let VPN clients reach the whole internal network or the internet, the server must enable IP forwarding and apply MASQUERADE/NAT in nftables or iptables.
- On OpenWrt, WireGuard is configured through UCI (a `wireguard` interface section in `/etc/config/network`) or `luci-app-wireguard`, which **differs from the wg-quick format above** - but keys, `AllowedIPs` and `Endpoint` mean exactly the same thing.
- As always: **keep the private key file at mode `600` and never commit it to Git.**

## 11. Troubleshooting Order: Inside Out, One Layer at a Time

When players cannot connect, **do not start by blaming the ISP**. Work through this order; each step produces a yes or no answer.

**Step 1: Is the service actually listening on the host?**

```bash
ss -tlnp            # TCP listeners
ss -ulnp            # UDP listeners (Bedrock)
```

- Check the listening address. If it is `127.0.0.1:25565`, **only the local machine can connect**; it must listen on `0.0.0.0` (or be left unspecified, or bound to the internal address).
- In Java Edition's `server.properties`, an **empty `server-ip`** binds all interfaces. Setting it to `127.0.0.1` makes the server unreachable from outside.
- Confirm the server finished starting (a `Done` line and similar in the log) rather than hanging during startup.

**Step 2: Did the host firewall allow it?**

```bash
sudo ufw status verbose          # Ubuntu/Debian
sudo firewall-cmd --list-all     # RHEL/Fedora family
sudo nft list ruleset            # nftables
sudo iptables -S                 # older iptables setups
```

On Windows, check inbound rules and confirm the network profile is "Private" rather than "Public". **On a cloud server, also check the security group** - the security group and the OS firewall are two independent gates, and both must allow the traffic.

**Step 3: Is the port forward correct?**

- The rule exists and targets the machine's **current** IP (verify the DHCP reservation actually took effect).
- The protocol matches (TCP versus UDP).
- External and internal ports are not swapped.
- **Test from outside the LAN, not from inside.** Many routers have NAT reflection (hairpin) disabled by default, so reaching your public IP from inside fails even though the forward is fine. Verify with mobile data or an external port checker.

**Step 4: ISP / CGNAT**

- Repeat the check from section 6: does the WAN address match what the outside sees?
- Use `traceroute` (`tracert` on Windows) and look for private addresses in the first hops.
- If you are behind CGNAT, no amount of port forwarding will work; use one of the options in section 7.

**Step 5: The client side**

- Address and port typed correctly; does the domain resolve to the current IP (dynamic addresses change often)?
- Does the client's own firewall or corporate network block the port (some corporate networks allow only 80/443)?
- Is the player on IPv4 or IPv6, and does that match what the server exposes?
- Are client and server versions compatible? A protocol mismatch is rejected outright (see [Server Protocols and Recommended Configurations](/tutorials/java/protocol)).
- Is the server whitelisted, or failing `online-mode` authentication?

**Confirm with a packet capture.** On the server machine, run:

```bash
sudo tcpdump -ni any port 25565
```

Then have the external client connect. **Packets arriving** mean the forwarding chain works and the problem is on the host (firewall or listener). **No packets at all** mean the problem is further out (forwarding or ISP).

## 12. Pre-Launch Checklist

- [ ] Confirmed you **have a public IPv4 address**, or chose an alternative (IPv6, VPS relay, tunnel)
- [ ] The target machine has a **stable internal IP** (DHCP reservation or host static address - one, not both)
- [ ] Only `TCP 25565` is forwarded (plus `UDP 19132` for Bedrock)
- [ ] **RCON `25575`, database ports, the Docker API and IPMI are not exposed**
- [ ] Management panels are not directly reachable from the internet, or are reached over a VPN
- [ ] Router/firewall firmware is current, WAN-side administration is off, default passwords are changed
- [ ] Port reachability verified from **outside** the network, not from inside
- [ ] If IPv6 is used: prefix stability is understood and there is a way to update the rule
- [ ] Configuration exported as a backup (router and firewall)
- [ ] The host also runs a host firewall, and **both layers agree**

## Next Steps

- The physical layer: racks, power and out-of-band management in [Rack Servers, Switches, Hardware Firewalls and UPS](/tutorials/ops/hardware-rack)
- The complete path to a reachable server: [Deploying to a Reachable Environment](/tutorials/java/deploy)
- Securing the server itself: [Security Plugins](/tutorials/ops/security-java)
- The data safety baseline: [Backup and Restore](/tutorials/java/backup)

---

> Menu labels, defaults, service names and ISP port-blocking policies in this article all vary by firmware, distribution and carrier. **Defer to the official documentation for the version you run.** The command-line examples are based on OpenWrt's UCI and the standard WireGuard configuration format; equivalents on other systems should follow their own documentation.
