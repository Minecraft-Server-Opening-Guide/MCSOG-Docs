---
title: Quick Start
slug: quickstart
updated: 2026-10-03
---

This page helps you find the right guide or download within ten minutes. Every guide on this site is written in Markdown and available in both Chinese and English. When a translation is missing, the page falls back to Chinese and shows a badge in the corner.

## Pick your edition first

- **Java Edition**: the desktop edition on Windows, macOS and Linux. It has the widest choice of server cores (Paper, Purpur, Fabric, Forge, Velocity).
- **Bedrock Edition**: phones, consoles and Windows. The official server is BDS; community options include Nukkit and PocketMine-MP.

Geyser plus Floodgate lets Bedrock players join a Java server.

## Recommended reading order

:::step Check your runtime
Start with "JDK and version matrix" to pick the right Java version, then choose a server core.
:::

:::step Deploy the server
Follow "Deploying a Paper server on Linux" or "BDS dedicated server setup" to reach a first successful boot.
:::

:::step Finish basic configuration
Read "server.properties explained" and "Ports, firewall and tunneling" so players can actually connect.
:::

:::step Operate it long term
Set up "Backup and rollback" and learn "TPS and MSPT diagnostics".
:::

:::note
Downloads require signing in. This site only indexes and links to resources; all rights stay with the original authors.
:::

## Learning Roadmap

The section above answers "where do I look". This one answers "in what order do I read". The site has dozens of guides, and working through them in phases keeps you from jumping around: understand the vocabulary first, then decide what kind of server to run, get it running locally, let other people in, add plugins, operate it properly, and only then think about running a community.

| Phase | Goal | Read these, in order | What you should be able to do afterwards |
|---|---|---|---|
| Phase 0 | Learn the vocabulary | [Glossary](/tutorials/ops/glossary), [Java vs Bedrock](/wiki/editions) | Tell Java Edition and Bedrock Edition apart, and follow the terms used in later guides |
| Phase 1 | Decide what kind of server to run | [Bedrock Server Types](/tutorials/bedrock/type) or [Hosting Protocol and Recommended Configuration](/tutorials/java/protocol), [Choosing an Operating System](/tutorials/java/os), [Choosing a Server Core](/tutorials/java/core) | Pick an edition, a core and an OS, and know how large a machine you need |
| Phase 2 | Get it running locally | [Environment setup (Windows and Linux)](/tutorials/java/environment), [Starting the server](/tutorials/java/start), [Server directory structure](/tutorials/java/structure), [Configuring the server](/tutorials/java/config), [Common server commands](/tutorials/java/commands) | Start the server on your own machine, join it, shut it down cleanly, and read its directory layout and config |
| Phase 3 | Let other people in | [Deploying to a Public Environment](/tutorials/java/deploy), [Supporting Mobile Players](/tutorials/java/mobile) | Outside players can connect by IP or domain name; Bedrock and mobile players can join too when you need cross-play |
| Phase 4 | Plugins and gameplay | [Getting Started with Plugins](/tutorials/java/plugins), [Plugin Configuration Basics](/tutorials/java/plugin-config), [Common Dependency Plugins](/tutorials/java/plugin-deps), [Plugin Management and Security Hygiene](/tutorials/java/plugin-manage) | Choose plugins, install their dependencies, edit their config, and pin down which plugin is at fault when something breaks |
| Phase 5 | Make it last | [Backup and Recovery](/tutorials/java/backup), [Offsite Backup](/tutorials/ops/offsite-backup), [Updating and Maintaining the Server Core, Plugins and MCDR](/tutorials/ops/updates), [Monitoring and alerting](/tutorials/ops/monitoring) | Keep backups you have actually restored from, know how to roll back before an update, and get warned before a problem becomes an outage |
| Phase 6 | When things go wrong | [[JAVA] Troubleshooting FAQ](/tutorials/faq/faq-java), [Java Edition Error and Crash Troubleshooting](/tutorials/faq/errors), [Lag from Entity and Dropped-Item Accumulation](/tutorials/faq/entity-lag), [Analysing Server Performance with spark](/tutorials/ops/spark), [Bedrock Server Runtime Troubleshooting](/tutorials/faq/bedrock-issues) | Know where to look first when you see an error, and tell whether lag comes from config, plugins or gameplay |
| Phase 7 | Security and operations | [Network Security Fundamentals](/tutorials/ops/network-security), [System Hardening](/tutorials/ops/system-security), [Common Attack Types and Minecraft-Specific Defense](/tutorials/ops/attack-defense) | Expose only the ports you need, never run the server as root, and know what to do first when you are attacked |
| Phase 8 | Running a community | [[JAVA] Operations & Management](/tutorials/ops/management-java), [Promotion and community management](/tutorials/ops/promotion) | Have basic rules, moderation and promotion plans, and understand what keeps players around |

In one line: phases 0 to 3 are "get it online", phases 4 and 5 are "keep it online", and phases 6 to 8 are "stay calm when it breaks, and attract players". You do not have to follow the order strictly, but **do not skip phase 0 or phase 5**.

### The three most common mistakes

1. **Updating without a backup**: back up before you update the core, a plugin or MCDR, and make sure the backup **actually restores**. See [Backup and Recovery](/tutorials/java/backup) and [Updating and Maintaining the Server Core, Plugins and MCDR](/tutorials/ops/updates).
2. **Going public before setting a whitelist and online-mode**: handing out your address before `online-mode` and the whitelist are configured is the same as handing the server to strangers. See [Configuring the Server](/tutorials/java/config) and [Network Security Fundamentals](/tutorials/ops/network-security).
3. **Upgrading the world without testing the new core**: once a new version has opened your world, going back to the old version is very hard. Test on a copy first, then touch the real save. See [Updating and Maintaining the Server Core, Plugins and MCDR](/tutorials/ops/updates) and [Java Edition Error and Crash Troubleshooting](/tutorials/faq/errors).

### Only want a Bedrock server?

You can skip the long chain of Java Edition plugin guides and follow this line instead:

1. [Bedrock Server Types](/tutorials/bedrock/type) — understand how BDS differs from community cores.
2. [Choosing a Bedrock Core](/tutorials/bedrock/cores) — decide which core to use.
3. [BDS Server](/tutorials/bedrock/bds) or [Getting Started with Bedrock Third-Party Cores](/tutorials/bedrock/third-party-setup) — deploy the core you picked.
4. [Deploying to a Public Environment](/tutorials/java/deploy) — make it reachable from the internet (the networking part is the same).
5. [Bedrock Server Runtime Troubleshooting](/tutorials/faq/bedrock-issues), [[BE] Troubleshooting FAQ](/tutorials/faq/faq-be) — read these two first when something breaks.
6. [Backup and Recovery](/tutorials/java/backup) — backups are mandatory on every edition.

## Quick links

| Goal | Where |
|---|---|
| Find a guide | Sidebar "Tutorials" |
| Download a core | Sidebar "Downloads / Server Cores" |
| Check versions | Sidebar "Wiki / Version timeline" |
| Troubleshoot an error | Sidebar "FAQ" |
