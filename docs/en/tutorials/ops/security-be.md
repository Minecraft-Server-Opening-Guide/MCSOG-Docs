---
title: "[BE] Security Plugins"
slug: security-be
cat: ops
level: 2
order: 4
minutes: 12
tags: [bedrock, ops, security, whitelist, permissions, cross-platform]
updated: 2026-10-04
draft: false
---

Bedrock Edition's security model is **different** from Java Edition: premium verification goes through **Xbox Live**, and the official server BDS **has no plugin system**. So this article has two parts: **the mechanisms BDS ships with** (reliable, and you should use them) and **the plugin ecosystems of third-party cores** (flexible, but your own responsibility).

## 1. Three Mechanisms BDS Ships With (Use Them Well First)

### 1. Whitelist: `allowlist.json`

- After you enable the whitelist in `server.properties`, the list itself is managed by **`allowlist.json`** in the server directory.
- This is Bedrock's **most effective** gate: the Bedrock player base churns heavily and alt accounts are cheap, so **keeping trouble outside the door** saves far more work than banning people afterwards.
- After editing the list, have the server re-read it as described in the official documentation (or restart it) for the change to take effect.

### 2. Administrator Permissions: `permissions.json`

- BDS administrators (OP) and permission definitions live in **`permissions.json`** (player UUIDs, names, and permission entries).
- Recommendation: **grant it only to people who genuinely need it**, and revoke it promptly when staffing changes.

### 3. Premium Verification: `online-mode`

- BDS's `server.properties` has an `online-mode` switch: when it is enabled, players must authenticate with an **Xbox Live account**.
- **Do not disable it on a public server**: once disabled, anyone can enter under someone else's gamertag, and a ban can be bypassed by simply changing the name.

:::warn Bedrock has no "mature login-plugin ecosystem like Java's"
An offline Java server can add a password gate with a plugin such as AuthMe; Bedrock **has no equally established or equally widespread official/community solution**. So the right approach for Bedrock is **keep premium verification on + use a whitelist as the gate**, rather than hoping that "installing a login plugin makes you safe".
:::

## 2. The Plugin Ecosystem of Third-Party Cores

BDS itself cannot run plugins; to extend it you must switch cores or add a community loader (see "BDS Server" and "Third-Party Cores"):

| Route | Description |
| --- | --- |
| **BDS + community loader** | LeviLamina / EndStone / BDSX provide plugin capability for login, permissions, management, and more |
| **Nukkit family** (including PowerNukkitX) | Written in Java with a native plugin system; its ecosystem works much like Java Edition plugin servers |
| **PocketMine-MP** | Written in PHP with the largest number of plugins, covering login, permissions, management, and other categories |

:::warn This article does not name specific third-party plugins
The Bedrock third-party plugin **ecosystem is fragmented, inconsistently named, and varies wildly in activity**, and many plugins lack an official source that can be verified over time. To avoid recommending plugins that are abandoned or of unclear origin, this article **describes only routes and categories**; for specific plugins, judge for yourself on their official platforms by "most recent update + download count + whether it is open source".
:::

### Four Checks When Choosing a Plugin

1. **Is it still maintained**: the Bedrock protocol changes every few versions, so an abandoned plugin will certainly break on a new version.
2. **Is the source official**: prefer the author's repository or an official plugin platform, and avoid reuploaded archives.
3. **Is it open source / auditable**: for security-related plugins (login, permissions) especially, you should be able to see the implementation.
4. **Does it match your core version**: both loaders and plugins are tightly bound to version ranges (see "BDS Server").

## 3. Security Notes for Cross-Platform Play (Geyser / Floodgate)

If you use Geyser to let Bedrock players join a Java server, take extra care with security:

- **Floodgate player names carry a prefix** (`.` by default), and **you must include it when writing names in whitelists, bans, and commands**, or players will be missed or misjudged.
- Floodgate lets Bedrock players join **without a Java account**, which effectively relaxes one layer of verification, so **it must be paired with a whitelist or review**.
- Geyser is installed on the **Java server side**; the reverse direction (Java players joining a Bedrock server) **has no official solution**.

## 4. General Principles (Same as Java Edition)

1. **Gate up front**: a whitelist / entry review blocks the vast majority of griefing and cheating.
2. **Keep the rules short**: Bedrock players are mostly on phones, so rules must be plain and enforceable.
3. **Keep an audit trail**: who banned whom and who changed permissions must all be traceable.
4. **Backups are the last line of defense**: see "Backup and Restore" — note that BDS saves all live under `worlds/`, so back up the whole directory.
5. **Do not force-clear memory**: BDS memory grows slowly; force-clearing it makes players stall while downloading resource packs/Addons, and only a restart fixes it (see "BDS Server").

## Next Step

- For the Java Edition equivalent, see [[JAVA] Security Plugins](/tutorials/ops/security-java)
- For player and operations management, see [[BE] Operations and Management](/tutorials/ops/management-be)
- For a quick troubleshooting reference, see [[BE] Troubleshooting FAQ](/tutorials/faq/faq-be)

---

> The descriptions of BDS's `allowlist.json`, `permissions.json`, `online-mode`, and `worlds/` in this article are based on the official BDS server behavior and the Minecraft Wiki; the notes on the Floodgate prefix are based on the official GeyserMC FAQ. Third-party plugins whose source cannot be verified are not included.
