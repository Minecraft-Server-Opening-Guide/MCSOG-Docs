---
title: Java and Bedrock Cross-Play Cheat Sheet
slug: cross-play
cat: ops
level: 2
order: 30
minutes: 8
tags: [cross-play, bedrock, geyser, floodgate, networking, ports]
updated: 2026-10-04
draft: false
---

Many players want to join a Java server from a Bedrock client. We collected the whole setup into a single-page cheat sheet.

## Key points

:::step How it works
Geyser translates the Bedrock protocol into the Java protocol, and Floodgate lets Bedrock players authenticate without a Java account.
:::

:::step Where to install it
It works on a proxy (Velocity, BungeeCord) or a single Paper server. Installing it on the proxy keeps things centralised.
:::

:::step Ports to open
Java defaults to 25565 TCP and Bedrock defaults to 19132 UDP. Both must be allowed in the firewall and the cloud security group.
:::

:::danger
Never disable online mode on a public server to "fix" logins; that lets anyone join with any name. Use Floodgate properly instead.
:::

Full steps are in "Bedrock Edition / Geyser and Floodgate cross play".
