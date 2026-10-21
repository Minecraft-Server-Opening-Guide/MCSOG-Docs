---
title: How to Read the Version Timeline
slug: versions-guide
cat: wiki
level: 2
order: 4
minutes: 13
tags: [versions, timeline, protocol, versioning, bedrock, upgrades, clients]
updated: 2026-10-04
draft: false
---

The site's **version timeline** ([/wiki/versions](/wiki/versions)) lists Java Edition and Bedrock Edition releases in reverse chronological order. It is the first place to look for questions such as "which version should I run", "when should I upgrade" and "why can a player not connect".

The timeline itself only gives you a **version number, a date and a one-line note**. This page explains what those fields mean, which intuitions about them are wrong, and how to turn the timeline into an actual upgrade decision.

> Version naming, protocol versions and release cadence are decided by the vendor and can change at any time. This page only explains **how to read this site's timeline**; what a specific release supports or requires is governed by the official release notes.

:::note Four questions this page answers
- What each field on a timeline row means;
- How to break down a Java Edition and a Bedrock Edition version number;
- What the LTS and CROSS-PLAY tags do and do not claim;
- Why a release date can never answer "can my client join".
:::

## 1. Where the Timeline Lives and What a Row Contains

| Page | Content |
| --- | --- |
| [/wiki/versions](/wiki/versions) | Opens the Java Edition timeline by default |
| [/wiki/versions/java](/wiki/versions/java) | Java Edition timeline |
| [/wiki/versions/bedrock](/wiki/versions/bedrock) | Bedrock Edition timeline |

The two editions have **separate** timelines, switched with two tabs on the page. Every row has the same shape:

| Field | Meaning |
| --- | --- |
| Version number | The release version as the game displays it |
| Tags | Only shown when an entry carries a marker (LTS, CROSS-PLAY); not every row has one |
| Date | The release date of that version |
| One-line note | What the release is (major updates name themselves; minor ones usually say bug fixes and stability) |

A few reading facts:

- **Newest first**: the timeline is sorted by date descending, so the top row is the most recent release and older entries are further down.
- **Releases only**: snapshots, previews and betas are not listed, so "it is not on the timeline" does not mean "the vendor never shipped it".
- **The two editions differ greatly in volume**: Java Edition runs from 1.0 up to the latest 26.x, while Bedrock Edition ships far more revisions, so its list is close to three times as long and takes noticeably more scrolling.
- **Bedrock rows carry an extra field**: Bedrock's server (BDS) has its own build number, which the timeline data records separately so you can line up a client version with a server build.

## 2. Reading a Java Edition Version Number

Java Edition has long used the `1.x.y` form:

| Position | Meaning | Example |
| --- | --- | --- |
| `1.x` | Major version; drives content and mechanic changes | 1.21 |
| `.y` | Revision within that major version | 1.21.9, 1.21.10, 1.21.11 |

**The most common misreading sits right here**: `1.21.10` is **newer** than `1.21.9`, because `.10` is the number ten, not "one point one zero". **Compare numerically, never as strings**: string ordering puts `1.21.10` before `1.21.9` and makes it look older, when the opposite is true.

### 2.1 The New 26.x Naming

On the timeline you can see Java Edition using `26.x` version numbers from 2026 onwards (this site's timeline records 26.1 as 2026-03-24, 26.2 as 2026-06-16 and 26.3 as 2026-09-15).

This reflects a **vendor change to version naming**. It is not "the twenty-sixth revision of 1.21", and you cannot infer its ordering against older numbers from the `1.x.y` pattern. When you meet an unfamiliar form, **read the date instead of guessing at numbers**:

- To see which is newer: compare dates.
- To see whether a plugin supports it: read the plugin's support list, not the number format.
- To see whether protocols match: read the protocol version, not the marketing number.

### 2.2 Revisions Versus Major Versions

| Type | Scale of change | Upgrade risk |
| --- | --- | --- |
| Revision (1.21.9 to 1.21.11) | Usually bug fixes and stability only | Low, but plugins can still be affected, so back up anyway |
| Major version (1.21 to 26.1) | Content, mechanics and data formats may all change | High; world format upgrades are essentially one-way, and downgrades are very costly |

## 3. Reading a Bedrock Edition Version Number

Bedrock's `1.x.y` looks like Java's but **behaves differently**: the third component is not "the nth small revision" but follows Bedrock's own cadence.

| Form | Meaning | Example |
| --- | --- | --- |
| `1.x.y` | Bedrock Edition release | 1.20.10, 1.21.100 |
| `1.x.y.z` (four parts) | BDS build number, used by the server | BDS 1.20.62.03 |

Three things to keep in mind:

1. **`1.20.1` and `1.20.10` are not the same thing**, and the difference is not "one digit". Bedrock's third component often jumps by ten (1.20.10, 1.20.20 and so on are common on the timeline), so `1.21.100` is not a typo.
2. **A BDS build number has four parts**, for example `BDS 1.20.62.03`. It is the server's own build identifier, not the same string as the client version, but the two correspond within one release.
3. **A placeholder is used when the build number is unknown**: in this site's data, a Bedrock entry whose exact build number has not been confirmed is written as `BDS <version>.w` (`w` standing in for the build number). That means "the build number for this release was not confirmed", not "this release had no server".

### 3.1 Bedrock's 26.x

Bedrock has also moved to the `26.x` naming (this site's timeline records 26.0 as 2026-02-10). As with Java, **do not compare numbers across naming systems**; compare dates.

### 3.2 Client and Server Ship on the Same Day

Bedrock timeline notes often say "released the same day as the client", which reflects the real cadence: **the client update and the server build move together**. Two consequences follow:

- If the server lags behind, players cannot join, especially players whose clients auto-update;
- iOS players **can only install the latest version from the store** and cannot roll back to a chosen build, so pinning a server to an old version costs far more than it does on Java Edition.

## 4. What the LTS and CROSS-PLAY Tags Mean

The tags on the timeline are **hints added by this site**. They are not an official classification and carry no vendor promise. They appear only on entries that carry the marker.

| Tag | What this site uses it for | What it does **not** mean |
| --- | --- | --- |
| LTS | A version this site considers worth staying on as a stable baseline | That the vendor will keep updating it, or that it is the "safest" option |
| CROSS-PLAY | A hint about cross-platform play for that version | That installing it enables Java and Bedrock interoperability, or that every platform can join |

Points to keep straight:

- **LTS is not a Minecraft term.** There is no official "long-term support" version; any release may stop receiving fixes after the next update.
- **CROSS-PLAY is not interoperability by itself.** Cross-play between Bedrock platforms is a property of Bedrock itself, while **Java to Bedrock play requires a tool such as Geyser** regardless of which version the server runs (see [Differences Between Java Edition and Bedrock Edition](/wiki/editions)).
- **Tags change.** This site may add or remove a marker at any time, so "version X carries LTS" is this site's judgement, not a hard fact. Trust what the page currently shows.

## 5. A Release Date Does Not Mean "My Client Can Join"

This is where the timeline is misused most. A date answers "when was this released" and **says nothing** about whether your client can join a given server.

What decides that is the **protocol version**: client and server negotiate with protocol numbers during the handshake, and if they disagree the connection fails, regardless of version number, release date or update contents.

| Symptom | Real cause | Where to look |
| --- | --- | --- |
| "Incompatible version" (Java) | Client protocol does not match the server | [Cross-Version Compatibility](/tutorials/java/via) |
| "Please update to the latest version" (Bedrock) | Client protocol does not match the server build | [Protocol Versions and Version Choice](/tutorials/bedrock/protocol) |
| A new release appeared yesterday and players cannot join | You have not updated the server, or players auto-updated past it | Confirm both versions first, then decide whether to follow |
| The timeline shows an old version but players can still join | That client version is still within the range the server accepts | Never infer protocol compatibility from "it works" |

### 5.1 A Concrete Example

The server runs 1.21.11 and a player reports client 1.21.9:

| Question | Answer |
| --- | --- |
| How to read the timeline | Both rows exist, and 1.21.11 is newer than 1.21.9 (compare numerically: 10 and 11 are greater than 9) |
| Why can the player not join | "The version is too old" is not the whole story: it depends on whether a 1.21.11 server accepts the 1.21.9 protocol |
| What to do | Read the handshake error in the server log first; installing the Via family lets older clients in, see [Cross-Version Compatibility](/tutorials/java/via) |
| Can the timeline answer it | No. It only tells you which of the two was released first |

In one line: **the timeline says which is newer, the protocol says whether a client can connect**, and those are two separate checks.

## 6. Why the Protocol Version Matters More Than the Marketing Version

The "marketing version" is the `1.21.x` or `26.x` number shown on screen; the **protocol version** is the number the two sides actually speak. They are not the same thing:

- Under one marketing version the protocol may have changed several times, especially on Bedrock;
- The vendor sometimes changes the protocol between revisions, and sometimes leaves it untouched;
- Plugin, loader and cross-version tooling usually reasons about the protocol and internal versions, not the number on the screen.

**Bedrock is stricter**: the client protocol must match the server build, and one protocol number apart means no connection. **Java has a translation layer**: the Via family translates protocols on the server side so that older or newer clients can join, but the wider the gap, the less lines up and the worse the experience.

The conclusion: **to decide whether a client can join, look at the protocol first and the version number second; the version number is just a human-readable name.** The full picture is in [Protocol Versions and Version Choice](/tutorials/bedrock/protocol) and [Cross-Version Compatibility](/tutorials/java/via).

### 6.1 The Two Editions Treat Protocols Differently

| Dimension | Java Edition | Bedrock Edition |
| --- | --- | --- |
| On a protocol mismatch | The handshake fails with an incompatible-version message | The handshake fails with an "update to the latest version" message |
| Is there a translation layer | Yes: the Via family translates protocols on the server side | Essentially no: the community cross-version ecosystem is tiny |
| Client auto-update | Only through the official launcher, so players can pin a version | App stores auto-update by default, so players are upgraded without asking |
| Cost of pinning an old version | Relatively manageable | High: iOS players can only install the latest |
| Default strategy | You can let the plugin ecosystem decide when to upgrade | **Follow the latest by default** |

## 7. Using the Timeline to Decide When to Upgrade

The timeline gives you **dates and ordering**; the decision needs that plus "what your server currently runs". A workable order:

1. **Check support ranges before checking new releases.** Which version does your core, your plugins and your mod loader each support? Write down the intersection; that is the ceiling you can reach. Version constraints are covered in [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison).
2. **See how many revisions followed the target version.** A brand-new major version is often still settling; waiting for one or two revisions clearly lowers the risk.
3. **See where your plugin ecosystem stands.** The core supporting a version does not mean your plugins do.
4. **Back up, and verify the backup.** World format upgrades are essentially one-way, so rolling back the core without rolling back the world is not a rollback.
5. **Try it on a separate instance.** Run a copy of the world once; do not experiment on production.
6. **Pick a maintenance window and announce it.**

| Situation | Recommendation |
| --- | --- |
| A bug-fix revision, with the core and plugins already supporting it | Safe to follow, but back up first |
| A freshly released major version | Wait for the first or second revision |
| One of your plugins only supports the old version | Stay, or find a replacement plugin first |
| Bedrock Edition | Follow the latest by default; pinning an old version means losing iOS players |
| Unsure | Do not move. Staying put usually costs less than a failed upgrade |

The full upgrade procedure, downgrade risks and rollback method are in [Updating and Maintaining the Server Core, Plugins and MCDR](/tutorials/ops/updates).

## 8. Troubleshooting Order for "I Cannot Connect"

| Order | Check | How |
| --- | --- | --- |
| 1 | Client version | Have the player report the exact version (see the next section) |
| 2 | Server version and protocol | Server log and core version output |
| 3 | Port and transport | Java uses TCP 25565; Bedrock uses UDP 19132 (IPv6 19133) |
| 4 | Allowlist and bans | `whitelist list` and `banlist players` on Java; `allowlist.json` on Bedrock |
| 5 | Authentication and login mode | Settings such as `online-mode` change who can join at all |
| 6 | Cross-version plugins | If Via is installed and the version error persists, update the plugin itself first |

The first two steps need version numbers, so **ask for the version before anything else** and you will save most of the back and forth.

## 9. Confirm the Client Version First

:::tip When a player says "I cannot connect", ask for the version first
Have the player report the **exact client version** (a screenshot is easiest) before comparing anything against the timeline and the protocol. Without that step, every later check is guesswork.

- **Java Edition**: the version is shown in the lower-left corner of the main menu, and the launcher shows which version an installation points at; in game, press `F3` and the debug screen shows the version at the top.
- **Bedrock Edition**: the version appears on an "About" style page in the settings (the exact location differs per platform, and mobile and console differ most).

Once you have the number, place the player's version and the server version on the timeline and compare dates and ordering; that tells you whether the server is behind or the client is ahead.
:::

## 10. Easy Ways to Misread the Timeline

| Misreading | Reality |
| --- | --- |
| Comparing version numbers as strings | `1.21.10` is newer than `1.21.9`, and across naming systems (1.x and 26.x) you cannot compare numbers at all, only dates |
| Assuming snapshots are listed | Only releases are listed; snapshots and previews are not |
| Assuming a recent release date means you must upgrade | Release cadence and your plugin ecosystem are separate things |
| Assuming LTS means permanently safe | LTS is this site's marker, not a vendor promise |
| Assuming Bedrock `1.20.1` and `1.20.10` are one revision apart | Bedrock's third component moves to its own rhythm; they are different releases |
| Assuming one release per day | Several entries sharing a date is normal on the timeline |
| Assuming the newest is always the best fit | The newest release suits new plugins and troubles old ones; what matters is what you actually run |

### 10.1 What the Timeline Does Not Answer

| Your question | Can the timeline answer it | Where to go |
| --- | --- | --- |
| When was this released | Yes | The timeline itself |
| Can my client join | No | Protocol versions: see [Protocol Versions and Version Choice](/tutorials/bedrock/protocol) |
| Do my plugins support it | No | The support list on each plugin's release page |
| Has my core caught up | No | The core's official download page and repository |
| What changed in this release | Partly | The one-line note; details in the official changelog |
| Where do I download the server | No | The site's download section and the official download page |

## 11. One-Page Quick Reference

```text
Starting a new server
  -> pick the latest release, then confirm the core and plugins support it

A player cannot connect
  -> get the client version first -> compare protocols -> then ports, allowlist, auth

Planning an upgrade
  -> intersect core / plugin / loader support -> wait for a revision -> back up and verify
  -> trial on a separate instance -> pick a maintenance window -> announce it

Meeting an unfamiliar version number
  -> read the date, not the size of the number
```

## 12. Using the Timeline as a Version Archive

Beyond "what is the latest", the timeline has three more practical uses.

### 12.1 Find Which Major Version a Historical Release Belongs To

To learn which major line 1.20.4 belongs to, and which revisions followed it, locate that row and **read upwards**: revisions of the same major version usually appear consecutively. When you need to fall back to a known-good release, this is far faster than searching the web.

### 12.2 Judge Whether an Old Major Line Will Still Receive Updates

The ordering gives you a feel for it: once a newer major version exists, the older line usually receives fixes only when necessary. **This is an observation, not a vendor promise**; whether updates continue is governed by the official release notes.

### 12.3 Bedrock: Line Up Client and Server

Bedrock entries record both the client version and the BDS build number, so when a player reports a client version you can find that row directly and read off the matching server build. It is the fastest first step when the client has updated and the server has not.

## Next Steps

- Bedrock protocols and version choice: see [Protocol Versions and Version Choice](/tutorials/bedrock/protocol)
- Java cross-version options: see [Cross-Version Compatibility](/tutorials/java/via)
- Upgrades, downgrades and rollbacks: see [Updating and Maintaining the Server Core, Plugins and MCDR](/tutorials/ops/updates)
- Version constraints for cores and loaders: see [Server Core Comparison](/wiki/compare#mcsog-h-Core%20comparison) and [Choosing a Server Core](/tutorials/java/core)

> Command and version details follow the official documentation for the corresponding server software and the game.
