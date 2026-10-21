---
title: Cross-Version Compatibility
slug: via
cat: java
level: 3
order: 21
minutes: 11
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, via, cross-version, protocol, viaversion, compatibility]
updated: 2026-10-04
draft: false
---

"Version not supported" or "outdated client" is one of the most common cries for help when a server goes live. The reason is simple: the server and the client are speaking different versions of the same protocol and cannot understand each other. Cross-version plugins exist to translate between them.

This article explains what each member of the Via family does, which direction it translates, where it has to be installed, how the pieces depend on each other, and what they cannot do. For the basics of plugin installation, see [Getting Started with Plugins](/tutorials/java/plugins).

## 1. Why Players Cannot Join

The Java Edition client and server talk over a binary protocol. Every game version changes that protocol: packets are added, field orders change, values take on new meanings. When the protocol versions do not match, the handshake fails and the player usually sees a version-mismatch message.

A server only accepts clients on its own version, plus a small set of compatible ones. So:

- The server is on 1.20.4 and the player uses a 1.21 client: they cannot join.
- The server is on 1.21 and the player uses a 1.8 client: they cannot join either.

A cross-version plugin works on the server side. It receives the player's packets, translates them into something the server understands, and translates the server's replies back into the player's protocol version. **The player's client needs nothing installed.**

:::warn Cross-version support is not a cure-all
It translates the protocol, not the gameplay. The wider the gap between versions, the less lines up, and the more the experience suffers. See section 5.
:::

## 2. What Each Member of the Via Family Does

Via is a family, and its three plugins handle different directions. A useful way to remember the directions: **"upward" means newer clients joining, "downward" means older clients joining.**

| Plugin | Direction | What it does | Dependency |
| --- | --- | --- | --- |
| **ViaVersion** | Upward | Lets clients newer than the server join | None; this is the core |
| **ViaBackwards** | Downward | Lets clients older than the server join | Requires ViaVersion |
| **ViaRewind** | Further downward | Supports 1.7.x and 1.8.x clients | Requires ViaVersion, normally installed alongside ViaBackwards |

Some worked examples:

- Server on 1.9.x with ViaVersion alone: clients from 1.9.x up to the newest release may join.
- Server on 1.21.x with ViaVersion and ViaBackwards: clients from 1.9.x up to 1.20.x may join.
- Add ViaRewind and the range reaches down to 1.7.x and 1.8.x.

Together, the plugin editions of Via cover roughly everything from 1.7 up to the current release.

### Where to Download

| Plugin | Distribution |
| --- | --- |
| ViaVersion | SpigotMC resource 19254, Hangar, Modrinth, GitHub |
| ViaBackwards | SpigotMC resource 27448, Hangar, Modrinth, GitHub |
| ViaRewind | SpigotMC resource 52109, Hangar, Modrinth, GitHub |

The official build server is `ci.viaversion.com`; fetch the newest builds from there.

:::note Java 8 support
Recent Via releases have dropped Java 8, so they cannot be used directly on very old servers. If you need to cover servers from 1.8 through 1.21, take the dedicated Java 8 build from the build server.
:::

:::tip Keep the versions aligned
When installing ViaVersion and ViaBackwards together, pick builds from the same period. After upgrading a proxy, remember to upgrade the Via family as well, or you will end up with "cross-version support installed but still version not supported". Even without a proxy, update at least once a month.
:::

## 3. Server or Proxy?

Via runs on BungeeCord, Velocity and ordinary Minecraft servers alike, but where you install it changes both the result and the pitfalls.

| Installation point | Advantage | Cost |
| --- | --- | --- |
| Backend server | The backend sees the player's **real client version**, so anti-cheat and packet-handling plugins behave normally | Every backend needs its own copy and its own configuration |
| Proxy | Install once, and translation happens before the player reaches any backend | Backends see the **proxy's version**, not the player's real client version |

If you run anti-cheat or bot-detection plugins that process packets heavily, installing Via on the proxy tends to cause compatibility trouble, so be careful. Conversely, if you have a single backend, or you want translation to happen before server selection, the proxy is the more convenient place.

:::warn Cross-version support and modded servers
Cross-version solutions are a poor fit for modded servers. Mods change the protocol and the registries, and a cross-version plugin cannot translate those custom parts; mixing the two causes a great deal of trouble.
:::

## 4. Installation Order and Dependencies

The three plugins depend on one another in layers:

1. **Install ViaVersion first.** It is the core, and on its own it already provides upward compatibility.
2. **Add ViaBackwards when you need downward compatibility.** It downgrades newer protocol traffic into a form older clients understand.
3. **Add ViaRewind when you need 1.7 and 1.8 support.** It needs ViaRewind Legacy Support alongside it to reach its full compatibility range.

As for load order, let ViaVersion load first and ViaBackwards and ViaRewind after it. The server normally resolves this automatically from the declared dependencies, so no manual intervention is required. Restart the server afterwards and confirm in the console that all three loaded successfully.

## 5. What It Can and Cannot Do

This is where misunderstandings are most common: **Via translates the protocol; it does not add content.**

| What the player experiences | Why |
| --- | --- |
| A newer client on an older server cannot use the functionality of newer items | The server simply has no logic for those items; it substitutes lower-version items with similar textures |
| An older client cannot see textures for newer items | The client has no matching models or textures. The official plugin does not handle this; workarounds exist for 1.16 and above but are not an official capability |
| Clients below 1.17 cannot see blocks below y=0 | The older protocol and renderer have no negative-height support, and upstream has stated this will not be fixed |
| Odd behaviour after joining: rubber-banding, desynchronised actions, misplaced interfaces | The version gap is so large that too few concepts line up |
| Kicked for sending too many packets | The packets-per-second limits on either side were tripped; see below |

The wider the version gap, the worse the experience gets. Unless you can give players on older versions a genuinely decent experience, do not chase "every version at once" for its own sake.

### Common Configuration Options

| Option | Purpose |
| --- | --- |
| `serverside-blockconnections` | Try setting this to `true` when block textures or connection textures look wrong |
| `max-pps` | Adjust when players are kicked for sending too many packets. On Paper forks you can set it to `-1` and tune Paper's own pps limit separately |
| `fix-1_13-face-player` | Converts 1.13 skin data packets for 1.12 players; needs some extra caching |
| `handle-pings-as-inv-acknowledgements` | Sends inventory acknowledgement packets to clients below 1.17 instead of pings, which helps with anti-cheat compatibility |
| `replace-adventure` | A ViaRewind option controlling whether 1.9 particles are replaced with approximations from 1.8 and older |

:::warn Do not simply disable the pps limit
Raising the packet limit stops legitimate players being kicked by mistake, but disabling it entirely lets malicious players attack the server with packet floods. Raise it only to a level ordinary players will not reach.
:::

## 6. The Standalone Option: ViaProxy

If you would rather not touch the server core at all, there is a standalone route: **ViaProxy**. It is a separate proxy program that lets any client version connect to any server version, with no plugin installed on the server.

Its coverage is much broader than the plugin editions, including ancient Alpha, Beta and Classic versions, April Fools snapshots and combat test snapshots, and it can even accept Bedrock players through Geyser. Downloads are on ViaVersion's GitHub releases and the official build server.

:::note When to reach for it
If you want a modern client to reach a server from a decade ago, or you just want to check a version's compatibility temporarily, ViaProxy is far less work than reworking the server. It is a separate process, though, so it adds another hop to forward traffic and another thing to maintain and debug.
:::

## 7. Troubleshooting Quick Reference

| Symptom | Check first |
| --- | --- |
| Still told the version is unsupported after installing | Whether the Via family is current, and whether upgrading the proxy also upgraded Via |
| Some players cannot join while others can | Whether those players' client versions fall outside the installed plugins' coverage |
| Textures or materials look wrong | `serverside-blockconnections`; older clients not seeing newer textures is expected |
| Players kicked for too many packets | `max-pps` and Paper's pps limit |
| Anti-cheat false positives or odd behaviour | Whether Via is installed on the proxy; backends then see the proxy's version, not the player's real one |
| Players on older versions rubber-band violently below y=0 | A known limitation that will not be fixed |

## Next Steps

- The basics of installing and configuring plugins: [Getting Started with Plugins](/tutorials/java/plugins)
- Building a network and forwarding player data: [Proxies](/tutorials/java/proxy)
- Background on protocols and packets: [Hosting Protocol and Recommended Configuration](/tutorials/java/protocol)
- Letting mobile and Bedrock players join: [Supporting Mobile Players](/tutorials/java/mobile)

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
