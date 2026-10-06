---
title: Proxies
slug: proxy
cat: java
level: 3
order: 13
minutes: 14
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, advanced, velocity, bungeecord, proxy, multi-server]
updated: 2026-10-04
draft: false
---

Once a server grows from "one server" into "a group of servers" (lobby + survival + minigames…), you need a **proxy** to present a single entry point.

## 1. What a Proxy Does

A proxy **runs no world of its own**. It does exactly one thing: **it accepts the player's connection and forwards it to one of the backend servers**.

```
Player → Proxy (Velocity / BungeeCord)
              ├→ Lobby server
              ├→ Survival server
              └→ Minigame server
```

The benefits:

- **One entry point**: players memorise a single address, and switching between backend servers does not drop the connection or require reconnecting.
- **One place for authentication**: premium (Mojang) authentication happens once at the proxy, and every backend runs in offline mode, trusting each other internally.
- **Easier maintenance**: adding a backend server means registering one entry in the proxy configuration, and players notice nothing.
- **Resource isolation**: the lobby, the login server and a minigame server can each be restarted independently without affecting the others.

## 2. Which One to Pick

| Proxy | Notes |
| --- | --- |
| **Velocity** | The modern option: **better performance, more active development**, and the first choice for new projects. Supports "modern forwarding", where authentication data is passed securely via a secret |
| **BungeeCord** | The veteran option with a mature ecosystem and a huge amount of documentation; many older tutorials are built on it. Suited to maintaining an existing legacy server |

> The two take the same approach; they differ in configuration details and forwarding mechanism. **For a new server, Velocity is the recommendation.**

## 3. Key Setup Points

### 1. The Proxy

- Download the proxy jar, put it in a directory of its own, and write a startup script to run it.
- Register the **backend server list** in the configuration (name + internal address + port).
- Premium authentication is **enabled only on the proxy**: the proxy has `online-mode=true`, and every backend must have `online-mode=false`.

### 2. The Backend Servers

A backend server has to "hand over its trust" to the proxy, meaning **it accepts connections only from the proxy**:

- **Velocity**: use **modern forwarding**, configure the same `forwarding.secret` on the proxy and on the backend, and enable the corresponding forwarding mode on the backend.
- **BungeeCord**: enable `bungeecord: true` in the backend configuration (on the Spigot family), and turn off the backend's own premium authentication.

### 3. The Critical Security Point

:::warn The forwarding secret is the key to your server
Once a backend trusts proxy forwarding, **anyone who knows the secret can forge any player's identity and get in**. Therefore:

- `forwarding.secret` must **never leak and never be committed to a public repository**;
- backend ports must **never be exposed directly to the internet**; allow only the machine running the proxy to reach them (restrict the source with a firewall).
:::

## 4. Things to Watch Out For

- **Plugins belong in different places**: some plugins go on the proxy (cross-server chat, global permissions), while others must go on the backend servers. Installing one in the wrong place produces "the command exists but nothing happens".
- **The proxy adds a hop**: player latency rises slightly, usually negligible, but it gets amplified on a poor route.
- **Modded servers do not mix well**: proxy forwarding has limited support for modded servers, and cross-server setups for modded servers usually need a dedicated solution.
- **Inventory / data synchronisation**: across servers, a player's inventory and position are handled by the proxy and the backend together, so **never share one world folder between backend servers**.
- **Do not treat a proxy as "performance optimisation"**: it does not improve performance, it only gives you a unified entry point at the **structural** level. A single server does not need one.

## 5. When to Add a Proxy

**Add one when**: you have several gameplay partitions, you need a single entry point, players should move freely between servers, or you want a lobby and a login server.

**Do not add one when**: you have only one server. **Every extra layer is another failure point**, and putting a proxy in front of a small server only adds maintenance cost.

## Next Step

To let phone (Bedrock Edition) players join as well: see [Supporting Mobile Players](/tutorials/java/mobile).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
