---
title: Rack Servers, Switches, Hardware Firewalls and UPS
slug: hardware-rack
cat: ops
level: 3
order: 7
minutes: 18
tags: [ops, hardware, rack, switch, firewall, ups, colocation]
updated: 2026-10-04
draft: false
---

The earlier guides in this section cover software: installing Java, choosing a server jar, configuring plugins, taking backups. This one covers the **physical layer** - the things that decide whether a machine in a rack actually stays up for three months straight.

It applies whether you run a tower under a desk or a 1U server in a colocated cabinet. Wherever a value depends on the vendor, model or firmware version, this article says so instead of inventing a number.

## 1. Three Layers, and Why the Bottom One Is Different

| Layer | What you manage | How failure shows up |
| --- | --- | --- |
| **Application** | Server jar, plugins, configuration | Crashes, lag, errors |
| **System** | Java, memory, host firewall, backups | Won't start, compromised, data lost |
| **Physical** | Rack, power, cabling, cooling, out-of-band access | **Whole machine down, thermal throttling, no remote access at all** |

The physical layer is invisible while it works and hardest to fix when it fails. Once a colocated machine drops off the network, your only option is often to pay someone to walk over and press the power button. That is why money and effort spent here belong in prevention.

## 2. Rack Basics: 19 Inches, U Heights and Rails

Standard racks follow the **EIA-310 / IEC 60297** family of specifications. The numbers that matter:

| Item | Value | Notes |
| --- | --- | --- |
| Mounting width | 19 in = **482.6 mm** | Clear width between the two mounting flanges |
| 1U of height | **44.45 mm** (1.75 in) | Every U count is a multiple of this |
| 42U full-height rack | About **1866.9 mm** of usable mounting height | Overall cabinet height is typically around 2000 mm; vendor dependent |
| Common depths | 600 / 800 / 1000 / 1200 mm | **Server cabinets usually need 800 mm or more** |

Typical form factors: **1U** is the thinnest, has the least thermal headroom, runs the highest fan speeds and is the loudest; **2U** adds meaningful cooling and expansion room, more drive bays and half-height PCIe cards; **4U** takes full-height cards and many drives and approaches tower noise levels. For home or small deployments, 2U/4U or a tower chassis is usually the better choice - 1U servers commonly sit in the 60-80 dBA range depending on model, which is not bedroom-friendly.

Two mounting-hole styles exist:

- **Square holes**: use **cage nuts** with M6 screws. Most common.
- **Threaded holes**: screw directly into 10-32 or M6 threads; no cage nuts needed.

EIA-310 hole spacing repeats in **groups of three** (15.875 mm / 15.875 mm / 12.7 mm). Rails must align with that pattern, or equipment above and below will not line up.

**Rail kits** are where most surprises live:

- **Static rails** hold the chassis in place but do not let you pull it out. Cheaper and very solid.
- **Sliding rails** let you extend the server for maintenance, usually with a **cable management arm (CMA)**. More expensive.
- Rails are usually **specific to a vendor and chassis model**, and they support a **limited depth range**. Check the rail's minimum and maximum depth before buying a cabinet; a 600 mm cabinet will not accept many long chassis.
- Sliding rails need **cable slack**, or extending the server will rip out network and power cables.

A rack also contains **vertical 0U PDUs** that consume no U space (see section 15), plus 1U horizontal PDUs, cable managers and blanking panels.

## 3. Airflow: Front-to-Back, Hot and Cold Aisles, and Never Blocking the Intake

Almost all rack servers draw cool air in through the **front** and exhaust hot air out the **back**. Data center layout follows from that:

- The **cold aisle** is in front of the cabinets, where the cooling system delivers cold air.
- The **hot aisle** is behind the cabinets, where exhaust air collects and returns.
- The goal is **aisle separation** (containment or sensible layout) so exhaust air is not drawn straight back into intakes.

Hard rules:

1. **Never block the intake.** A blocked front panel, an enclosed cabinet, or a server pushed against a wall leads directly to thermal throttling and eventually shutdown.
2. **Fill empty U slots with blanking panels.** Open gaps let hot air from the rear recirculate to the front, where the equipment above re-inhales it.
3. **Clean dust filters.** A clogged filter is the same thing as a blocked intake.
4. **Cabinet doors must be perforated.** A high open area is expected (commonly 60 percent or more, per vendor specification); solid glass doors are a disaster for high-density equipment.
5. **Watch the airflow direction SKU.** Some switches and power supplies support **reversible airflow** (port-side intake or port-side exhaust) and are sold as **different SKUs**. Order the direction that matches your cabinet; mixing directions defeats the aisle design.
6. **Measure intake temperature, not room temperature.** Sensors belong near the equipment intake. Room-level ASHRAE recommended ranges differ by class (A1 through A4), but the **intake temperature at the device** is what drives throttling.

In colocation you typically control only the front of your own cabinet. Follow the provider's aisle rules rather than mounting equipment backwards for convenience.

## 4. Choosing Hardware for Minecraft: Single-Core First

The Minecraft server tick loop targets **20 TPS**, which gives each tick a budget of **50 ms**. The main thread handles most world logic: entities, redstone, block updates, player movement, and much of chunk load scheduling. Therefore:

**Single-core performance (clock speed times IPC) matters more than core count.**

| Workload | Threading characteristics |
| --- | --- |
| Main tick loop (entities, redstone, players, most block logic) | Essentially single-threaded; determines TPS |
| Chunk generation and lighting (async in Paper and similar) | Multi-threaded; benefits from more cores |
| Plugin/mod async tasks, databases, map rendering | Multi-threaded |
| Running several server instances side by side | Scales directly with core count |

Practical conclusions:

- For a single medium-sized vanilla or Paper server, **2-4 fast cores** often beat 16 slow ones.
- Extra cores are **not wasted**, but returns diminish for one instance.
- Choose CPUs by **single-thread benchmark scores**, not by core/thread counts.
- **Consumer versus server platforms**: consumer parts (Ryzen, Core) usually win on single-thread speed, price and noise; server platforms (Xeon E, Xeon Silver, EPYC and similar) bring ECC, IPMI, redundant power supplies, more memory channels and more drive bays. **Generations differ enormously - always check the vendor's specification page for the exact part.**

On memory: a small vanilla server commonly needs 4-8 GB, a medium server with plugins 8-16 GB, and large modpacks 16 GB or more. **Allocating more than needed gains nothing** (see [Server Configuration](/tutorials/java/config)), but too little causes constant GC pauses.

## 5. ECC Versus Non-ECC Memory

**ECC (Error-Correcting Code)** memory corrects single-bit errors, detects double-bit errors (SEC-DED) and reports uncorrectable events. It does **not** improve performance; it improves **long-run reliability**:

- A machine that stays up for months has a real chance of a memory error. Without ECC, such an error often shows up as **silent corruption** - a world file written wrong with no clue as to why.
- ECC requires **CPU, motherboard and DIMM to support it together**. All three, or it does not work.
- **UDIMM (unbuffered)** is common on consumer and entry server boards; **RDIMM / LRDIMM (registered / load-reduced)** works only on server platforms and allows larger DIMMs and more DIMMs per channel.
- **DDR5 on-die ECC is not the same as end-to-end ECC.** It is an internal DRAM mechanism that is not reported to the system and does not replace side-band ECC.
- ECC errors can be monitored through the BMC/IPMI system event log, or on Linux through the EDAC subsystem (`/sys/devices/system/edac/`, `edac-util` and similar).

**Recommendation:** for a home server used for fun, non-ECC is acceptable. For a **public server that runs long-term and holds player data, use ECC**. Note that mixing ECC with non-ECC, or RDIMM with UDIMM, **usually prevents the system from booting**; check the motherboard's qualified vendor list before expanding memory.

## 6. Storage: SSD, NVMe and Endurance

| Interface | Typical sequential bandwidth | Notes |
| --- | --- | --- |
| SATA SSD | About 500-560 MB/s | Limited by SATA 6 Gb/s; random performance still far ahead of spinning disks |
| NVMe PCIe 3.0 x4 | About 3.5 GB/s | Model dependent |
| NVMe PCIe 4.0 x4 | About 7 GB/s | Model dependent |
| NVMe PCIe 5.0 x4 | About 14 GB/s | Model dependent; significant heat |

**For Minecraft, sequential bandwidth is almost never the bottleneck.** What actually matters:

- **4K random read/write latency and queue-depth behavior** (region files, logs, databases).
- **Write amplification and post-SLC-cache falloff** during large saves or backups.
- **Power loss protection (PLP).** Enterprise drives have it and can flush in-flight writes on power loss; consumer drives usually do not, which is what a UPS compensates for (see section 13).

**Endurance** is expressed as **TBW (terabytes written)** or **DWPD (drive writes per day)**:

- TLC generally outlasts and outperforms QLC under sustained writes; QLC drives slow down noticeably after a large burst.
- **DRAM-less drives** (relying on HMB) are usually weaker under random load and suit light workloads.
- Minecraft itself is not a write monster: the server saves the world periodically (roughly every 5 minutes in vanilla; Spigot/Paper expose `ticks-per.autosave` in `spigot.yml`), plus logs and player data.
- **Plugins amplify writes considerably**: logging plugins such as CoreProtect, map renderers such as Dynmap/BlueMap, and frequent automatic backups all write continuously.
- Common practice is therefore to **separate the system disk from the data disk** and to **write backups to another disk, a NAS or spinning media**.
- **RAID is not a backup.** RAID 1 survives a single disk failure but not accidental deletion, ransomware or `rm -rf`. Off-site backups remain mandatory (see [Backup and Restore](/tutorials/java/backup)).

## 7. Redundant Power Supplies (1+1) and Colocation

A **1+1 redundant power supply** means two hot-swap modules, where either one alone can carry the full system load. Common misunderstandings:

- **Each module must be rated for the entire load**, not half of it. Size each module against full system peak power.
- What actually matters is **dual-feed (A/B) power**: plug PSU A and PSU B into **different PDUs on different branch circuits**. If both modules share one power strip, a single tripped breaker makes the redundancy worthless.
- Colocated cabinets usually offer A/B feeds, and **the second feed is sometimes billed separately**. Ask before signing.
- 1+1 protects against **a failed PSU module** and **a failed feed**. It does **not** protect against both feeds failing at once - that requires UPS and generator.
- Redundant supplies add fan noise and a small efficiency penalty. Efficiency ratings (the 80 PLUS tiers) affect power cost and heat, which matters for long-term colocation.

## 8. IPMI / BMC Out-of-Band Management

The **BMC (Baseboard Management Controller)** is an independent small system on the server board, powered from standby voltage. It **stays reachable while the operating system is shut down, or even when no OS is installed**. Vendor names differ: Dell calls it iDRAC, HPE calls it iLO, Lenovo calls it XClarity Controller, and Supermicro, ASRock Rack and Gigabyte boards usually just say BMC or IPMI. The traditional protocol is **IPMI 2.0**; the modern replacement is **Redfish**, a REST interface over HTTPS.

What it gives you:

- **Remote KVM**: see the screen and type as if you were sitting in front of the machine, including BIOS setup.
- **Virtual media**: mount a local ISO as a virtual optical drive to install or rescue an OS.
- **Power control**: power on, power off, reset, forced power off.
- **Sensors and logs**: temperature, fans, voltages, and the SEL event log.
- **Serial over LAN**: console redirection over the network.

Common ports (**exact ports and behavior vary by vendor and model**):

| Purpose | Common port |
| --- | --- |
| IPMI RMCP / RMCP+ | UDP 623 |
| BMC web interface | TCP 80 / 443 |
| Remote KVM (some implementations) | TCP 5900 / 5901 and similar |
| Redfish | TCP 443 |

:::warn Never expose IPMI to the internet
This is not a cautious suggestion; it is an industry consensus. IPMI 2.0 has a history of authentication bypass issues (the well-known cipher 0 / RAKP problems, for example), many vendor firmwares ship with **default credentials** (the exact defaults vary by model and firmware version, so verify and change them), some implementations encrypt management traffic poorly, and web interfaces have had plenty of vulnerabilities. **Control of the BMC is control of the whole machine**: remote power, virtual media, OS reinstall.

Do this instead:
- Put the BMC on a **dedicated management network or VLAN**, never mixed with production traffic.
- Give that network **no route to the internet**; reach it through a VPN or a jump host.
- Change default passwords, disable services you do not use (turn off IPMI over LAN if unused), and restrict allowed source addresses.
- Keep BMC firmware updated; BMC firmware vulnerabilities are a real attack surface.
- Prefer Redfish over IPMI where the platform supports it.
:::

## 9. Switches: Unmanaged Versus Managed

| Capability | Unmanaged | Managed (L2 / L2+) |
| --- | --- | --- |
| Plug and play | Yes | Requires configuration |
| VLANs (802.1Q) | No | Yes (access and trunk ports) |
| Link aggregation (LACP, 802.3ad) | No | Yes |
| Port mirroring (SPAN) | No | Yes; essential for packet capture |
| SNMP monitoring | No | Yes (v2c / v3) |
| STP / RSTP loop prevention | Usually basic | Yes |
| IGMP snooping (multicast control) | No | Yes |
| Port security, storm control, DHCP snooping | No | Yes |

How to choose:

- **One or two machines on a flat home network**: an unmanaged gigabit switch is enough. Cheap, no failure points, replace it if it dies.
- **A cabinet where you need separated management/production segments, link aggregation or packet capture**: go managed. VLANs keep BMC, production traffic and guest networks apart, which is a prerequisite for the security requirements in section 8.

Two concepts to keep straight:

1. **A switch does not do NAT and does not port-forward.** A layer 2 switch forwards by MAC address. A layer 3 switch can route between VLANs but **usually does not perform NAT**. Public port forwarding must happen on a router or firewall (see [Software Routers and Port Forwarding](/tutorials/ops/router-firewall)).
2. A home "router" is really a **router, switch and wireless access point in one box**. Do not confuse it with a plain switch.

## 10. Link Speeds and Oversubscription

| Standard | Common media | Distance |
| --- | --- | --- |
| 1000BASE-T (1GbE) | Cat5e / Cat6 | 100 m |
| 2.5GBASE-T / 5GBASE-T | Cat5e / Cat6 (802.3bz) | 100 m |
| 10GBASE-T | Cat6 about 55 m; Cat6a 100 m | Per cabling standard and vendor claims |
| 10GBASE-SR | OM3 / OM4 multimode fiber | About 300 m / 400 m |
| 10GBASE-LR | OS2 single-mode fiber | About 10 km |
| SFP+ DAC / AOC | Direct attach copper / active optical cable | Short in-rack runs, usually a few meters |

**When does this matter for Minecraft?**

- A single player uses very little bandwidth (tens to a few hundred kbit/s on average, bursting while loading chunks). **One 1GbE server link serves a lot of players.**
- **1GbE is the correct answer for nearly every Minecraft deployment.**
- 2.5GbE and 10GbE earn their place with **storage, NAS, backups, virtual machine migration and heavy inter-server traffic**.
- Do not buy 10GbE to look professional; that money buys more value in a UPS or ECC memory.

**Uplinks and oversubscription** describe the ratio of total access-port bandwidth to uplink bandwidth. Twenty-four gigabit ports with two 10GbE uplinks means 24 Gb/s of access against 20 Gb/s of uplink, roughly 1.2:1; with a single gigabit uplink it is 24:1. A small cabinet is fine on gigabit uplinks. Remember that **LACP aggregates total bandwidth, but a single flow still uses one link** (hash-based selection), so one backup job may not exceed a single link's speed.

**PoE only concerns phones, cameras and wireless access points.** Servers do not take PoE. For reference: 802.3af delivers about 15.4 W per port (about 12.95 W at the device), 802.3at / PoE+ about 30 W (about 25.5 W), and 802.3bt Type 3/4 about 60 W / 90 W. The switch's total PoE budget is limited and varies widely by model; do the math before attaching several high-power devices.

## 11. Hardware Firewalls: What They Add at the Edge

A **host firewall** (Windows Firewall, ufw, firewalld, nftables) protects only **the machine it runs on**, and only after the operating system has booted. It cannot:

- Perform **stateful inspection** at the network edge (connection tracking that drops traffic before it reaches any host).
- Do **NAT or port forwarding** - that is the router's or firewall's job.
- Build **site-to-site VPNs** between two locations or **remote-access VPNs**.
- Enforce a **single policy** across a whole segment instead of repeating rules on every machine.
- **Centralize logging and auditing** of who tried to reach which port and when.
- Provide **DMZ segmentation**, keeping internet-facing services away from internal machines (see section 12).
- Keep filtering while a host is powered off, crashed, or already compromised.

Two forms exist:

- **Dedicated appliances** from various firewall/UTM/NGFW vendors.
- **x86 hardware running a firewall distribution**: pfSense (FreeBSD-based), OPNsense, OpenWrt and similar. These are cost-effective, fully featured and well suited to a small cabinet. See [Software Routers and Port Forwarding](/tutorials/ops/router-firewall) for selection and configuration.

**Treat datasheet performance numbers with care:**

| Rating | Meaning |
| --- | --- |
| Firewall throughput | Usually bare forwarding with large packets and no deep inspection |
| IPS / NGFW throughput | Throughput with deep inspection enabled; **often a fraction of the bare figure** |
| VPN throughput | Encrypted tunnel throughput; depends on algorithms and CPU |
| Concurrent sessions | Connection table capacity |
| New sessions per second | Connection setup rate |

**Vendors test differently** (packet sizes, protocols and enabled features all vary), so comparing numbers across vendors is meaningless. **Use each vendor's published test conditions.**

For Minecraft, connection counts run in the hundreds to low thousands and bandwidth needs usually stay under a few hundred Mbit/s, so **an entry-level appliance or a small x86 software router is more than enough**. Buy a large NGFW for VPN, segmentation and manageability - not because Minecraft needs throughput.

## 12. Topology and the DMZ

The standard order:

```text
Internet (WAN)
   |
Modem / ONT
   |
[ Firewall / Router ]      <- NAT, port forwarding, stateful inspection, VPN
   |
[ Switch ]                 <- VLAN segmentation, link aggregation
   |----------|----------|
[ MC server ] [ Admin ] [ BMC management port ]
```

A **DMZ** is a **separate network, interface or VLAN** holding services that must be reachable from the internet (a control panel or web service, for example). The rule pattern:

- WAN to DMZ: allow only the ports that are genuinely required.
- **DMZ to LAN: deny by default** (or permit a very short list).
- LAN to DMZ: allow for administration.
- Then, if a public-facing service is compromised, the attacker is confined to the DMZ and cannot reach internal databases or other machines.

:::warn The "DMZ host" feature on consumer routers is something else entirely
Many home routers implement "DMZ" by forwarding **every port** unconditionally to one internal machine. That is not segmentation; it is total exposure. **Do not use it.** Forward individual ports instead.
:::

Other edge discipline: disable WAN-side administration, change default passwords, turn off UPnP/NAT-PMP unless you truly need it, enable logging, and back up the firewall configuration. Also remember that **a firewall does not stop application-layer bugs** - server exploits and plugin RCE are handled by patching and permissions (see [Security Plugins](/tutorials/ops/security-java)).

## 13. UPS: What It Actually Protects Against

| Threat | Covered by a UPS | Notes |
| --- | --- | --- |
| Total outage | Yes (for a limited time) | Battery carries the load until graceful shutdown or generator start |
| Voltage sag / brownout | Yes | Units with AVR boost the voltage |
| Surges and spikes | Partly | Clamping capability exists, but **a direct lightning strike is out of scope** |
| Frequency and voltage variation | Model dependent | Online (double-conversion) units handle this best |
| Overload | No | Overload trips to bypass or shuts down |
| Battery aging | No | Requires periodic replacement |

**VA versus W**: VA is apparent power (volts times amps), W is real power, and their ratio is the power factor (PF). Datasheets list both (1500 VA / 900 W, for example). **Size by W**, keep headroom - load at 60 to 80 percent of rated W - and confirm the VA limit is respected too.

**Runtime is not linear.** Halving the load does **not** double runtime (lead-acid Peukert effect plus fixed inverter overhead), and batteries age with time and temperature. **Use the vendor's runtime chart**, not a linear estimate.

**Waveform:**

- Standby and most line-interactive units output a **simulated (stepped) sine wave** on battery.
- Online (double-conversion) units output a **true sine wave**.
- **Active-PFC power supplies are designed for a sine input** and may buzz, fail to transfer, or shut down on a stepped wave. **Whether a specific PSU tolerates it depends on the model** - the PSU vendor's specification is authoritative.
- Conclusion: **pair active-PFC supplies with a pure sine wave UPS**, and use pure sine for anything with a motor.

**Three topologies:**

| Type | Transfer time | Output waveform | Characteristics |
| --- | --- | --- | --- |
| Standby / offline | Commonly a few ms up to about 10 ms | Usually stepped | Cheapest, weakest protection |
| Line-interactive | Commonly 2-10 ms | Usually stepped; some models pure sine | Most common for small cabinets; includes AVR |
| Online / double-conversion | 0 (inverter always running) | Pure sine | Best regulation and isolation; more heat, noise, energy use and cost |

Transfer times and waveforms **both vary by model**. Check the specific datasheet.

**Rough load estimate:** a 1U server 250-400 W (depending on CPU and drives), a switch 30-60 W, a firewall 20-40 W. Add about 30 percent headroom, then select a UPS by its **W rating** and confirm the runtime covers a full automatic shutdown (10-15 minutes is usually plenty).

## 14. UPS Monitoring and Automatic Shutdown with NUT

A UPS only helps if it can **notify the host**. Otherwise an outage just buys you ten extra minutes before an unclean power loss. Connection options:

| Method | Notes |
| --- | --- |
| USB HID | Most common on modern UPS units; supported directly by the `usbhid-ups` driver |
| USB-to-serial | Some models speak a serial protocol; often handled by `nutdrv_qx` and similar drivers |
| RS-232 serial | **Pinouts are frequently vendor-specific.** Some APC models use a dedicated cable type (such as the 940-0024C family); an ordinary null-modem cable may not work. **Model dependent.** |
| SNMP management card | Enterprise UPS units accept a network card for monitoring; **card models vary by vendor** |

**NUT (Network UPS Tools)** is the most portable option on Linux. It has three parts: **a driver talks to the UPS, upsd is the server, and upsmon is the monitoring client**. upsmon reads state from upsd and triggers shutdown when needed.

Package and service names **differ by distribution**: Debian and Ubuntu generally ship `nut-server` (upsd) and `nut-client` (upsmon), with newer versions also using `nut-driver-enumerator` and `nut-driver@myups`; RHEL and Fedora commonly use `nut-server` and `nut-monitor`; the configuration directory is `/etc/nut/` on Debian-family systems and `/etc/ups/` on some others (SUSE family, for example). **The examples below use Debian/Ubuntu paths.**

`/etc/nut/ups.conf`:

```ini
# Define a UPS named myups
[myups]
    driver = usbhid-ups
    port = auto
    desc = "Rack UPS"
```

`/etc/nut/upsd.users` (the account `upsmon` uses to log in to upsd):

```ini
[monuser]
    password = secret
    upsmon primary
```

`/etc/nut/upsmon.conf` (a minimal working configuration):

```conf
MONITOR myups@localhost 1 monuser secret master
MINSUPPLIES 1
SHUTDOWNCMD "/sbin/shutdown -h +0"
POLLFREQ 5
POLLFREQALERT 5
HOSTSYNC 15
DEADTIME 15
POWERDOWNFLAG /etc/killpower
```

Notes and gotchas:

- The `MONITOR` line format is `MONITOR <ups> <powervalue> <username> <password> <mode>`. The `1` means this UPS supplies one power source for the system, and `master` means this host initiates shutdown before the battery is exhausted.
- **NUT 2.8.0 renamed `master`/`slave` to `primary`/`secondary`.** The older spelling is still accepted for compatibility, while current documentation and examples mostly use `primary`. **Follow the official documentation for the version you install.**
- `/etc/nut/upsd.users` and `upsmon.conf` contain passwords. On Debian-family systems set them to `root:nut` with mode `640`, or `upsmon` may refuse to start.
- `upsd` listens on **TCP 3493** by default. If you only monitor the local host, **do not expose it to the network**. For genuine multi-host monitoring, restrict source addresses with a firewall.

Useful commands:

```bash
upsc myups                     # list all UPS variables
upsc myups ups.status          # status only: OL (on line), OB (on battery), LB (low battery)
upscmd -l myups                # list instant commands supported by this UPS
upsrw -l myups                 # list writable variables
systemctl restart nut-server   # restart after config changes (service name varies by distro)
upsmon -c fsd                  # forced shutdown drill; use with care
```

**Battery replacement and self-tests:**

- Common valve-regulated lead-acid (VRLA/AGM) batteries last roughly **3-5 years**, and **higher ambient temperature shortens that** (a widely used rule of thumb is that life halves for every 10 degrees Celsius above nominal, though it is only a rule of thumb).
- Many UPS units self-test automatically every two weeks, and most allow a manual test (front-panel button or `upscmd myups test.battery.start.quick`; the command name depends on the model).
- **Replace batteries when a self-test fails or runtime falls below your requirement.** Replace all batteries in a string together.
- Lithium-based units (LiFePO4, for example) generally last longer, but **this depends on the specific model**.
- Recycle old batteries according to local regulations.

## 15. Cabling and Power Safety

**Power**

- **Never daisy-chain power strips** (a strip plugged into another strip). Chaining raises contact resistance, defeats breaker coordination and can overload a single wall outlet. Use a **rack PDU** inside a cabinet.
- PDUs come as horizontal 1U or vertical 0U units. Common outlets are **IEC 60320 C13 (roughly a 10 A class)** and **C19 (roughly 16 A class)**, with C14/C20 inlets. Metered or remotely switched PDUs make troubleshooting and remote power cycling much easier.
- **Feed the PDU from the UPS and connect protected equipment to that PDU.** Do not plug critical gear straight into the wall.
- **Know the branch circuit.** A common 10 A / 250 V socket in China is about 2200 W; a North American NEMA 5-15 on a 15 A / 120 V branch is about 1800 VA with a code-required continuous load limit of 80 percent (about 1440 W); UK BS 1363 is 13 A. **The actual installation and a qualified electrician govern - never run at the limit.**
- **Grounding**: never defeat the earth pin, never use "cheater" adapters, and bond the cabinet to building ground. A floating ground is a shock and fire hazard and causes intermittent faults that are painful to diagnose.

**Cabling**

- **Label both ends of every cable**: one end names the far-end device and port, the other names the way back. In a data center, an unlabeled cable is a cable you cannot trust.
- Keep a simple topology diagram or table (which machine port connects to which switch port).
- Bundle with **hook-and-loop (Velcro) straps**, not zip ties. Zip ties crush cables and must be cut to make changes.
- **Respect fiber bend radius** (commonly at least 10 times the cable diameter; check the vendor specification) and never kink it. Copper also dislikes tight, permanent bends.
- Route power and data cabling separately where practical. Leave slack for sliding rails and consider a cable management arm.
- **Keep spares**: a patch cable of each length, C13/C19 power cords, an SFP+/DAC module, cage nuts and screws, and a spare drive. In colocation, one remote-hands visit usually costs more than all of these combined.

## 16. Pre-Rack Checklist

- [ ] Cabinet depth matches the rail kit's supported range; U positions are planned with maintenance room
- [ ] Empty U slots have blanking panels; front intakes are clear; dust filters are clean
- [ ] PSU A and PSU B go to different PDUs on different branch circuits, both behind UPS protection
- [ ] Total branch load is calculated and within rating, with headroom
- [ ] Grounding is correct and no ground-defeating adapter is in use
- [ ] BMC default password changed, placed on a dedicated management network, **confirmed unreachable from the internet**
- [ ] Switch has production, management and guest VLANs (if a managed switch is used)
- [ ] Only required ports are open publicly (Java `TCP 25565`, Bedrock `UDP 19132`); **RCON `TCP 25575` and database ports are not exposed**
- [ ] Firewall/router configuration exported as a backup; WAN-side administration disabled
- [ ] UPS is monitored and **an automatic shutdown has actually been rehearsed once**
- [ ] Every cable is labeled at both ends and the topology record is current
- [ ] Spares (patch cables, power cords, optics, a drive) are on site

Port quick reference (defaults; all are configurable):

| Purpose | Protocol / port |
| --- | --- |
| Java Edition game traffic | TCP 25565 |
| Bedrock Edition game traffic | UDP 19132 |
| Query (optional) | UDP 25565 |
| RCON (**never expose**) | TCP 25575 |
| IPMI / BMC | UDP 623 and others |
| SNMP | UDP 161 / 162 |
| NUT | TCP 3493 |

## Next Steps

- How to configure the network edge and forward ports: see [Software Routers and Port Forwarding](/tutorials/ops/router-firewall)
- Making the server reachable from the internet: see [Deploying to a Reachable Environment](/tutorials/java/deploy)
- The data safety baseline: see [Backup and Restore](/tutorials/java/backup)
- Securing the server itself: see [Security Plugins](/tutorials/ops/security-java)

---

> Every specific value in this article (cabinet depths, airflow direction, ports, performance and runtime figures, default credentials and so on) varies by vendor, model and firmware version. **Defer to the official documentation for your equipment**, and have a qualified electrician confirm anything involving power distribution or grounding.
