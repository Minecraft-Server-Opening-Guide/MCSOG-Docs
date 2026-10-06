---
title: Hosting Costs and Choosing a Plan
slug: hosting-cost
cat: ops
level: 2
order: 24
minutes: 16
tags: [cost, hosting, selection, vps, bandwidth, backup, budget, ops]
updated: 2026-10-04
draft: false
---

"How much does it cost to run a server" has no standard answer, but it is very often **asked the wrong way**. The three questions that actually matter are: **what is my scale, which parts of my budget are one-off and which are monthly, and how much of my own time am I willing to spend?**

The first instinct is usually to compare price lists: line up a few plans and pick the cheapest row. That approach typically costs more six months later - not because you overpaid, but because you **bought the wrong thing**, and then paid back everything you saved during a migration, a lost world, or an attack.

This article is about spending money where it actually decides the experience. For hardening the host itself see [System Hardening](/tutorials/ops/system-security); for what moving really costs see [Server Migration](/tutorials/ops/server-migration); for the reality of being attacked see [Common Network Attacks and Minecraft-Specific Defence](/tutorials/ops/attack-defense).

:::warn Prices and plans are governed by the provider's official pages
This article was written without network access to verify anything, so **every amount, unit and plan shape below is an order-of-magnitude illustration, not a quote**. Prices, billing models, refund policies, overage rates and whether DDoS protection is included **differ between providers and change over time**. Before you commit, check the provider's official pricing page and contract terms.
:::

## 1. Take the Word "Cost" Apart First

The total cost of running a server has four components, and they behave completely differently:

| Category | Examples | Characteristics |
| --- | --- | --- |
| **One-off** | Hardware, first year of a domain, the labour of a migration, initial setup | Paid once at the start or at a big change; easily forgotten |
| **Fixed monthly** | Hosting fee, bandwidth package, backup storage, panel | Paid every month; **this is what sets your long-term burden** |
| **Variable** | Overage traffic, snapshot storage, high-protection add-ons, pay-as-you-go | Invisible normally, suddenly large when something breaks or grows |
| **Time** | Updates, backup verification, player management, incident handling | **The most expensive and the one most often counted as zero** |

**Separate these four and half of the selection problem solves itself.** Many plans that look cheap are cheap in the second category, with the price hiding in the third and fourth.

:::note One decision rule
When two options are close in monthly price, **pick the one that will be easier to move away from, easier to add backups to, and easier to reconfigure later**. In server hosting, "portability" and "observability" are usually worth more than the few dollars you save.
:::

## 2. The Real Cost Drivers

### 2.1 CPU Single-Core Performance (the most underrated)

Minecraft's **main logic (the tick loop) essentially runs on a single thread**. That means:

- **More cores do not mean smoother gameplay.** A host with 8 weak cores can easily be worse for a 20-player vanilla server than one with 2 strong cores.
- **The direct cause of dropping TPS is often one core at 100%**, while total CPU usage on the machine may be only 15%.
- World generation, chunk loading, entity and redstone work all add to that single-core pressure.

So when choosing a host, **single-core performance outranks core count**. This matters most with cheap plans: on an oversold host, the "3.0 GHz" you are sold is shared.

### 2.2 Memory

Memory decides how much you can run and how much you can load:

- Vanilla/Paper servers: a small server (a few players up to a dozen or so) often runs on a few GB of heap, **but the exact figure varies enormously with version, view distance, plugins and gameplay**.
- Modded servers and modpacks: memory needs are often several times vanilla; **follow the modpack author's and the loader's official guidance**.
- Panels, web maps, databases and proxies all consume memory too - **do not budget memory for the game server alone**.
- Too much memory also has a cost: a very large heap means longer pauses when GC runs. **"More memory is better" is false**; give it enough and watch GC and MSPT.

### 2.3 Disk: SSD and IOPS

World saves, chunk loading and backup packing are all disk work. **When the disk is slow the CPU still looks idle**, which makes this the hardest kind of lag to diagnose.

- **SSD is mandatory.** Running a modern server on a spinning disk is a bad experience, especially for chunk loading.
- What matters more than "is it an SSD" is **random read/write capability (IOPS)** and **whether it is shared with other tenants**.
- **A full disk destroys data**, so leave headroom (backups, logs and core dumps all consume space).

### 2.4 Bandwidth

- **The uplink (outbound) is the bottleneck**: players downloading chunks and resource packs all use your outbound direction.
- **Residential connections are usually asymmetric** with a small uplink; datacentre lines are usually symmetric.
- **Traffic-based billing and bandwidth-based billing are different models**: one settles per GB, the other caps a Mbps peak. The billing risk is completely different.

### 2.5 DDoS Protection

For Minecraft, protection is not an "advanced option":

- Java Edition uses TCP (default 25565); Bedrock Edition uses **UDP** (default 19132), and **UDP floods are the classic attack against Bedrock servers**.
- Cheap plans usually **do not include** effective protection, or include only a thin layer of scrubbing.
- **High-protection service is usually a monthly add-on priced against the protected bandwidth**; the exact form and price depend on the provider.

For attack types and defence thinking see [Common Network Attacks and Minecraft-Specific Defence](/tutorials/ops/attack-defense).

### 2.6 Backup Space

**Backups usually take as much space as your world, and you need several of them.** The classic mistake is to buy the cheapest host and leave no room for backups, so the backup script fails silently for months - until the day you need it.

- Backups must live **outside the host you rent** (offsite or object storage); see [Offsite Backup](/tutorials/ops/offsite-backup).
- Object storage **usually bills retrieval (egress) separately**, so even a restore drill costs money.
- Your retention policy (how many copies, kept how long) directly drives the cost.

### 2.7 Your Own Time

This is the one item **almost everyone counts as zero**, and it is usually the largest:

- Weekly updates, plugin compatibility debugging, backup verification.
- Player management: whitelists, appeals, disputes, griefers.
- Incident handling: attacks, crashes, lost worlds, intrusions.

**If your time is free, it is only because you have not put it in the ledger.** A plan that costs you five hours a week is often a worse deal than one that costs 50 more per month and saves three of those hours.

### 2.8 Routes and Latency

Bandwidth numbers decide how many players you can hold; **routes and latency decide whether it feels good**. One cannot substitute for the other:

- The **round-trip time (RTT)** between player and server directly shapes the feel of mining, attacking and movement; when latency is high, extra bandwidth does not help.
- **Datacentre location and route quality** often matter more than the bandwidth figure: the same 100 Mbps can feel very different depending on the route.
- **Cross-carrier access** is a common trap: players on one ISP are fine while players on another see constant latency spikes.
- Test with **a real client on the players' network**, not by pinging the gateway from the server: `mtr` / `traceroute` show which hop is dropping packets.

### 2.9 Billing Period, Refunds and Contracts

These terms do not affect performance, but they **decide what a wrong purchase costs you**:

- **Hourly or pay-as-you-go** suits experimentation but usually has a higher unit price; **monthly** is the balance point for most community servers; **annual** has the biggest discount and the deepest lock-in.
- Read the **refund policy**: some providers refund at any time, some only within a few days of the first purchase, some pro-rate by usage.
- **The renewal price can be higher than the introductory price.** That is a common promotional structure, so use the renewal price when you compute long-term cost.

:::note The fastest way to judge "can I try it"
Before ordering, ask: **if performance turns out to be bad in three days, how much of my money comes back?** With a vague answer, switch from annual to monthly before you decide.
:::

## 3. Seven Options Compared

The table below is a **qualitative comparison** with no prices. When you read it, focus on the last two columns: **hidden cost** and **when not to choose it**.

| Option | Scale it suits | Pros | Cons | Hidden cost | When not to choose it |
| --- | --- | --- | --- | --- | --- |
| Home PC / residential connection | Small server for friends, testing, temporary | One-off spend, data in your hands, total freedom to tinker | Small uplink, possibly no public IP, power or network loss stops the server, attacks hit your whole household | Electricity, noise and heat, hardware depreciation, maintaining a UPS and router yourself, highest time cost | Public-facing service, 24/7 stability, attack resistance, more than a dozen players |
| Shared web hosting | Static sites, PHP sites | Cheap, works out of the box | **Usually cannot run long-lived processes or expose custom ports**; strict resource limits | No upgrade path, migration cost | **Essentially never suitable for a Minecraft server**, unless the vendor is explicitly selling game hosting |
| VPS | Small to medium, personal servers, proxies | Moderate price, root access, choose your own OS and kernel | Resources shared with neighbours, cheap plans are commonly oversold, protection usually thin | Bandwidth is often "shared" or traffic-metered, snapshots billed separately, may be suspended when attacked | Large modpacks, strong protection needs, dedicated physical performance |
| Dedicated server | Medium to large, modpacks, many instances | Physically exclusive, stable and predictable performance, choose your hardware | High monthly cost, slow provisioning, hardware faults wait on the datacentre | Bandwidth and protection often priced separately, IP and rack fees, maintenance and spare parts | Only a few players, tight budget, no intention of doing operations |
| Game panel hosting | Small to medium servers with little patience for ops | Panel, backups and scheduled tasks included; sold per GB or per slot | Locked to their environment, limited customisation, overselling common | Extra memory and extra backup storage are upcharges, migration limited to their tools, CPU limits not in the advert | You need a custom OS or kernel, a special mod environment, or long-term low-cost scale |
| Cloud pay-as-you-go | Variable load, short events, testing | Elastic, start and stop on demand, rich ecosystem (snapshots, images, monitoring) | **Unpredictable bills**, default configurations usually expensive, you build everything | Public IP, snapshot storage, images, logs, egress traffic billed separately; forgetting to shut it down keeps burning money | Steady long-term load (monthly or annual is usually cheaper), teams without budget alerts |
| Colocation | Your own hardware, scale, compliance needs | Hardware autonomy, potentially lower unit cost at scale | You supply hardware, sign a contract, handle faults yourself | Rack space, power, bandwidth, remote-hands fees, travel time | A single machine, no spare parts, no ops capability |

### 3.1 Home PC / Residential Connection

Its position is clear: **lowest cost, highest control, lowest reliability.** It suits a small server among friends. Before assuming it works, confirm three things: **do you have a public IP** (many residential connections are behind CGNAT and have none), **how big is your uplink**, and **do your ISP's terms allow a long-running public service**. For the full method and the pitfalls see [Running a Server on a Home PC](/tutorials/ops/home-hosting).

### 3.2 Shared Web Hosting

**It is not a Minecraft option.** Shared hosting sells a website runtime: no long-lived processes, no listening on arbitrary ports, hard CPU and memory quotas. A few vendors lump "game servers" under the same word, but what they actually sell is panel or container hosting - judge it by 3.5.

### 3.3 VPS

The most common choice for individuals and small teams. The key points: **the "core count" of a cheap plan is of limited value; single-core performance and disk IOPS are what matter**; and read carefully whether bandwidth is dedicated or shared, and whether "unmetered" means rate-limited or traffic-billed.

### 3.4 Dedicated Server

When modpacks, multiple instances or player counts push a VPS into a corner, a dedicated server is the natural next step. Its value is **predictability**: physical cores, physical disks, physical bandwidth. The price is that **monthly cost and operational responsibility rise together**.

### 3.5 Game Panel Hosting

It suits "I do not want to touch Linux". You are mostly paying for **saved time**, so the test is: **does the ops time it saves exceed its premium?** Two cautions: **the CPU model in the advert is often not the performance you actually get**, and **migration tools usually only export their own format** - confirm before you leave that your world and configuration come out intact.

### 3.6 Cloud Pay-as-You-Go

Elasticity is the advantage; **unpredictable billing** is the drawback. Spinning up a machine for testing is great; forgetting to shut it down for a month is also "great". If you use it, do three things first: set **budget alerts**, set **auto-shutdown or expiry reminders**, and understand exactly **how the public IP and snapshots are billed**.

### 3.7 Colocation

It is the answer for "I already have hardware and I already have ops capability". Unit cost falls with scale, but **so does the barrier and the responsibility**: when a disk fails, no provider swaps it for you - only you, or paid remote hands.

## 4. Cost Items People Forget

| Cost item | Why it is forgotten | How to avoid it |
| --- | --- | --- |
| Public / elastic IP | Some providers bill the IP separately, and an idle IP may still cost money | Confirm on the pricing page whether the IP is included and whether idle IPs are billed |
| Traffic overage | "Unmetered" often comes with fair-use clauses or throttling | Check whether it throttles or bills, and what the overage rate is |
| Backup storage | Backups do not consume host disk, but they consume object storage | Estimate world size x number of copies, then choose a retention policy |
| Snapshots | Snapshots are not backups, and they are billed by capacity | Use backups rather than snapshots as your data-safety mechanism (see section 8) |
| DDoS protection | Larger protected bandwidth costs more, and it is usually a monthly add-on | Establish what the "basic protection" can absorb, then decide |
| Domain and certificate | Domains renew annually; missing renewal loses your DNS | Enable auto-renew; for certificates see [HTTPS Certificates and Automatic Renewal](/tutorials/ops/https) |
| Electricity and noise (home option) | A PC running 24/7 is noticed by the meter and by your ears | Estimate with your local tariff (example below) and consider cooling and noise |
| Time | Nobody puts it in the budget sheet | Log your actual weekly hours; a few months later you will change your mind |
| Migration cost | Moving is not copying files, it is **a maintenance window** | See [Server Migration](/tutorials/ops/server-migration) |

:::tip An electricity worked example
A machine drawing about 60 W on average, running 24/7: 60 W x 24 h = 1.44 kWh/day, roughly 43 kWh/month. At 0.6 per kWh that is about **26 per month**. This is only a worked example: **redo it with your own power draw and your own tariff**, and count the monitor, router, UPS and air conditioning separately.
:::

## 5. Sizing a Server Honestly

### 5.1 Rough Guidance from Player Count

The table below is **order-of-magnitude guidance, not a specification**. Real demand depends heavily on version, core, view distance, plugins, world size and gameplay.

| Scale | CPU | Memory (server heap) | Bandwidth | Notes |
| --- | --- | --- | --- | --- |
| 2 - 5 players, friends | Two cores with strong single-core | Order of 2 - 4 GB | A residential uplink is often enough | A home PC is frequently sufficient |
| 10 - 20 players, vanilla or light plugins | High single-core, 2 - 4 cores | Order of 4 - 8 GB | Order of a few Mbps | View distance and entity counts dominate |
| 30 - 50 players, plugin server | High single-core plus extra cores | Order of 8 - 16 GB | Order of ten-plus Mbps | Needs a real SSD and a stable route |
| Modded / modpacks | Single-core performance first | Often several times vanilla | Depends on sync volume | **Follow the modpack's official guidance** |
| Many instances / proxy network | Multiple cores start to matter | Sum of instances plus proxy and database | Adds up | See [Proxy Networks](/tutorials/java/proxy) |

**Rough bandwidth estimate**: in steady state each player usually consumes only **tens of KB/s** (roughly 0.2 - 1 Mbit/s), but it rises noticeably with a large view distance, many entities, and players flying and loading new chunks. **The burst when a player joins and receives chunks is far larger than the steady state.** These figures depend heavily on version and gameplay, so **measure your own** (`vnstat`, `nload`, or your panel's traffic graph).

### 5.2 Overselling Is Normal in Cheap Plans

Behind words like "shared", "burstable" and "fair use" is usually the same thing: **you buy a quota, not an exclusive core**. That is not fraud; it is why cheap plans can exist. The problem is that **it makes buying from a spec sheet unreliable**.

Practical advice:

- Treat **single-core performance** as the primary metric, not core count or a clock-speed number.
- Be conservative about "sustained high load": burst credits suit peaks, not 24/7 saturation.
- **Buy a short term first**, get it running, and only then commit longer.

### 5.3 Do Not Compare Unit Prices - Compare Unit Cost

To compare two options, convert both to the same basis: **total monthly spend divided by the number of players it can hold steadily**. Done that way, the option that is "30% more expensive but holds twice the players" usually becomes the obvious choice.

### 5.4 Start Small, Then Grow

A counter-intuitive but very practical strategy: **buy a tier that is clearly too small, find the real bottleneck, then spend against that bottleneck.**

The reason is that **most people overestimate their own scale**. Before launch you imagine 50 concurrent players; the reality is often 3 for the first three months. Buy for 50 up front and you pay for non-existent players for a long time.

The method:

1. Buy the smallest usable tier for your current scale plus a little headroom.
2. Record real curves for single-core CPU, memory, disk I/O and bandwidth with [Monitoring and Alerting](/tutorials/ops/monitoring).
3. Let the data decide the upgrade: **scaling up is usually easier than scaling down**, and many providers allow online resizing (**whether they do, and whether it requires a reboot, is per the provider's documentation**).
4. If the bottleneck is disk I/O or single-core performance, **more memory will not help** - that is a signal to change provider, not plan.

## 6. How to Benchmark Before You Buy

### 6.1 Single-Core Beats Core Count

Third-party benchmark scores (a common single-thread rating, for example) work as a **coarse filter** to rule out obviously bad machines, but they **cannot detect overselling, noisy neighbours or a disk bottleneck**. Use scores to narrow the field; the final decision comes from real testing.

### 6.2 Ask for a Trial, or Buy the Shortest Term

- Prefer providers that offer **a trial or hourly billing**, and run a real load before deciding.
- Without a trial, **buy the shortest term** (monthly, or even daily). Never start with an annual commitment.
- **Test your actual workload**: move the server, plugins and world onto it, invite a few people to play once. That is worth more than any benchmark.

### 6.3 Test Disk I/O

The disk is where cheap plans cut corners most easily. Two common tests:

```bash
# Sequential write: create a temp file on the target filesystem, delete it afterwards
dd if=/dev/zero of=./io-test.bin bs=1M count=1024 conv=fdatasync status=progress
rm -f ./io-test.bin

# Random read (requires fio; for argument meanings see the fio documentation)
fio --name=randread --rw=randread --bs=4k --iodepth=32 \
    --size=1G --numjobs=1 --time_based --runtime=30s --group_reporting
```

When reading the results: `dd`'s sequential figure is **easily optimistic** (caching and the filesystem flatter it), while random-read IOPS is much closer to the real pressure from chunk loading and world saves. **The test writes a lot of data, so run it in a temporary directory, delete the file afterwards, and never run it inside the server's data directory.**

## 7. The "Cheap Now, Expensive Later" Traps

| Trap | Where it looks cheap | Where it gets expensive | How to avoid it |
| --- | --- | --- | --- |
| Ignoring migration cost | You picked the cheapest machine | Moving requires downtime and touches DNS, allowlists, backups and monitoring | Choose a plan that **exports your complete data** from day one and treat moving as inevitable; see [Server Migration](/tutorials/ops/server-migration) |
| No backup space | You bought only the host, not storage | One lost world is all your progress | Put backups outside the host from the start; see [Offsite Backup](/tutorials/ops/offsite-backup) |
| No DDoS protection | You saved the protection fee | Attacks take you offline, the provider suspends you, players leave | At minimum establish the limits of the basic protection; see [Common Network Attacks and Minecraft-Specific Defence](/tutorials/ops/attack-defense) |
| Traffic overage bills | The metered unit price looks low | One attack or one resource-pack distribution can burn a month of budget | Set budget alerts, prefer throttling over metering, host resource packs on object storage |
| Annual lock-in | The annual discount is attractive | The provider disappears, performance is not as promised, and you cannot leave | Pay monthly for the first year; consider a longer term only once it is stable |
| Time counted as zero | Doing it yourself "costs nothing" | Several hours of ongoing work every week | Put time in the budget sheet and review it periodically |

## 8. Reducing Cost Legitimately

These measures **do not sacrifice reliability**; they just aim resources at what matters:

- **Lower the view distance**: the single most effective optimisation, cutting both chunk sending and entity work.
- **Reduce resident worlds**: every extra dimension or world consumes memory and disk I/O; turn off the ones you do not use.
- **Scheduled restarts**: they relieve slow memory growth and leaked handles (**but they are a workaround, not a fix** - investigate the root cause as well).
- **Backups instead of snapshots**: snapshots are billed by capacity and are not the same as a recoverable backup; see [Backup and Recovery](/tutorials/java/backup).
- **Pregenerate the world**: move chunk generation cost before launch and reduce runtime single-core spikes.
- **Run the panel yourself**: panel hosting sells saved time, so if you already know Linux, a self-hosted panel removes the premium (at the cost of one more component to maintain; see [Using and Securing Management Panels](/tutorials/ops/panels)).
- **Turn off unused services**: web maps, extra instances and test servers all consume resources continuously.
- **Consolidate off-peak**: if players only appear in the evening, run the expensive instance only during those hours.

:::warn Two red lines when cutting cost
**Do not cut backups, and do not cut protection.** The money saved on those two is usually repaid with interest in the first incident. Downgrade specs, move to a cheaper machine - but **recoverable data** and **absorbable attacks** are the floor.
:::

## 9. Budget Planning Worksheet

Copy this table into your notes and fill it in for your own situation. **Use the notes column to record your reasoning, so that months later you can still see why you chose what you chose.**

| Item | One-off | Monthly | Notes |
| --- | --- | --- | --- |
| Host / server |  |  | Spec, single-core performance, whether it is oversold |
| Public IP and bandwidth |  |  | Dedicated or shared, throttled or metered |
| DDoS protection |  |  | What the basic protection absorbs, whether high protection is needed |
| Backup storage |  |  | World size x retention count, offsite or not |
| Domain |  |  | Renewed annually; enable auto-renew |
| Certificate |  |  | Free ACME certificates are normally zero cost; see [HTTPS Certificates and Automatic Renewal](/tutorials/ops/https) |
| Panel / management tooling |  |  | Self-hosting saves money and costs time |
| Electricity (home option) |  |  | Power draw x tariff; see the example in section 4 |
| Hardware and spares |  |  | Disks, memory, UPS, cabling |
| Migration and maintenance windows |  |  | Downtime impact, announcements, labour |
| Time invested |  |  | Hours per week, converted into money |
| Buffer (10% - 20%) |  |  | Incidents, upgrades, overage |

## 10. Summary

- **Estimate scale first, then choose an option.** Player count, whether you run mods, and whether the server is public decide which options you need not even consider.
- **Single-core performance over core count**, and **disk IOPS over disk capacity** (once capacity is sufficient).
- **Keep one-off, monthly, variable and time costs separate**; most hidden cost lives in the third and fourth.
- **The best answer for a small server is usually simple**: for friends, a home PC or the cheapest VPS that works is fine - and the priority is **backups**.
- **A public server is a different problem**: once it faces the internet, **real protection and real offsite backups stop being optional**, and the hosting budget has to be set on that basis.
- **Confirm your ability to move while you are buying**, not when you need to move.

## Next Steps

- The complete home option: [Running a Server on a Home PC](/tutorials/ops/home-hosting)
- Publishing it to the internet and ports: [Deploying to a Reachable Environment](/tutorials/java/deploy)
- What a move actually involves: [Server Migration](/tutorials/ops/server-migration)
- Data safety: [Backup and Recovery](/tutorials/java/backup) and [Offsite Backup](/tutorials/ops/offsite-backup)
- Security and defence: [System Hardening](/tutorials/ops/system-security) and [Common Network Attacks and Minecraft-Specific Defence](/tutorials/ops/attack-defense)
- The web side, certificates and panels: [HTTPS Certificates and Automatic Renewal](/tutorials/ops/https) and [Using and Securing Management Panels](/tutorials/ops/panels)

---

> Prices, plans and the configuration of each piece of software are governed by the provider and by the official documentation.
