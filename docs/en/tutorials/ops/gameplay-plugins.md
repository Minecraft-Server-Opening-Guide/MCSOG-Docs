---
title: Economy and Gameplay Plugins: Categories, Choices and Risks
slug: gameplay-plugins
cat: ops
level: 2
order: 23
minutes: 16
tags: [economy, plugins, vault, shops, quests, crates, inflation, performance]
updated: 2026-10-04
draft: false
---

Technical articles can stop at "how to install a plugin and what its dependencies are". What actually makes a server feel like a game, however, is its **economy and gameplay plugins**: where money comes from, how shops price things, what quests reward, how titles are displayed, and what comes out of a crate.

This article goes through each of those **categories**, explaining what the plugins do, what they cost you, and where the risks are. Where a specific plugin is named, only capabilities that can be verified on that plugin's **official pages** (official repository, official documentation site) are stated; anything that cannot be verified is described as a category instead of inventing a name. For the basics of dependencies, see [Getting Started with Plugins](/tutorials/java/plugins) and [Common Dependencies](/tutorials/java/plugin-deps).

:::warn Gameplay plugins are code, not content packs
Every gameplay plugin you add brings more of the following: code you must keep updated, code that may conflict with other plugins, code that may be exploitable to duplicate items, and code that consumes main-thread performance continuously. **More gameplay plugins is not better.** Decide what problem you are solving, then look for a plugin; do not install something just because another server has it.
:::

## 1. Get the mental model right first

Before choosing anything, answer four questions:

| Question | Why it matters |
| --- | --- |
| What problem does this plugin solve? | If you cannot say it, do not install it. If nobody uses it afterwards, you paid performance and risk for nothing |
| What does it depend on? | Missing dependencies cause load failures or silently disabled features; see [Common Dependencies](/tutorials/java/plugin-deps) |
| Where does it store its data? | File-based storage behaves completely differently when you migrate hosts, split into multiple servers, or restore a backup |
| Can players exploit it? | Anything that can produce items or currency is a potential duplication entry point |

The risks of gameplay plugins fall into four rough groups, and they recur in every section below:

- **Economic risk**: creating currency or high-value items out of nothing, which causes inflation.
- **Security risk**: duplication exploits, permission bypasses, command injection.
- **Performance risk**: extra per-tick computation, entity counts, database query frequency.
- **Operational risk**: players perceiving unfairness, content being exhausted, or an author discontinuing the plugin and stranding you on an old version.

## 2. A category map

Look at the whole picture first, then dig into each section.

| Category | What it adds | Difficulty | Performance cost | Main risk |
| --- | --- | --- | --- | --- |
| Economy (API plus implementation) | Currency, balances, transfers | Medium | Low (database reads and writes) | Runaway money creation causing inflation; data corruption |
| Shops | A place to buy and sell, and to set prices | Medium | Low to medium (depends on shop count and query rate) | Misconfigured prices, unlimited buying, exploitation |
| Quests and achievements | Sense of purpose, daily retention | Medium to high (content design is the real cost) | Low to medium | Rewards that break the economy; content exhausted |
| Titles and prefixes | Identity display and social signalling | Low | Very low | Tying them to paid power damages trust |
| Crates and loot boxes | Random rewards, short-term excitement | Medium | Low to medium (animations and broadcasts) | Gambling and addiction concerns; legal and ethical issues with paid random rewards |
| Jobs and skills | Long-term progression | Medium to high | Medium (frequent event listeners) | Uncontrolled output; conflicts with survival gameplay |
| Minigames and parkour | Standalone gameplay, multiplayer interaction | High | Medium to high (separate worlds and instances) | Empty lobbies when the population is too small; high maintenance cost |
| Claims and protection | A feeling of property safety | Medium | Medium (block events and lookups) | Complex rules that scare newcomers; imbalance when tied to the economy |
| Large tech-style content | A completely different game experience | Very high | High (many custom items and machine logic) | Performance, difficult version upgrades, high barrier to entry |
| Anti-cheat and logging | Order and traceability | Medium | Medium (logging plugins write to disk continuously) | Incomplete records; installing too late means no history |

:::tip How to use this table
"Difficulty" means **the cost to you of configuring and maintaining it**, not how complex the plugin is internally. A plugin with a thousand configuration options will eat your time even if its documentation is excellent. **Budget your time first, then your performance.**
:::

## 3. The economy is always two layers

### 3.1 The API and the implementation are separate things

This is the most common beginner trap: **you installed Vault and you still have no economy**.

Vault's official positioning is an **abstraction library for Bukkit** (its repository description reads *Vault of common APIs for Bukkit Plugins*, and its README is titled *Vault - Abstraction Library for Bukkit*). It creates no currency of its own. It defines a set of common interfaces so that plugins which need economic capability and plugins which actually provide it can talk to each other. Its developer API has been split into a separate VaultAPI repository, as the official README explains.

So an economy is always **two layers**:

| Layer | Role | Examples (verify on each official page) |
| --- | --- | --- |
| Abstraction | Defines "check balance, withdraw, deposit" | Vault |
| Implementation | Actually holds balances and performs the arithmetic | The EssentialsX economy module, the CMI economy system, XConomy, and similar |

| What an abstraction layer such as Vault provides | Who implements it | Who calls it |
| --- | --- | --- |
| Economy | A concrete economy plugin | Shops, quests, crates, claim upkeep |
| Permissions | A permissions plugin such as LuckPerms | Plugins that need to check permissions |
| Chat | A chat plugin | Plugins that need to send or format chat |

Some concrete facts you can verify:

- **EssentialsX** official module documentation states that the core jar includes most commands, signs, kits **and the economy** (*signs, kits and the economy*). In other words, installing EssentialsX itself already gives you an economy implementation.
- **CMI** official pages state that it provides an **economy system** with a top-balance feature and a **cheque system** that creates items containing money. The same pages explain that for CMI's economy to work through the Vault ecosystem you need the official Vault build or economy injector they provide, and that economy must be enabled in the configuration file.
- **XConomy** official repository describes it as an economy plugin that supports data synchronisation between multiple servers, which suits networks sharing one balance pool. Check its current maintenance status against your server version before relying on it.
- **Jobs Reborn** lists **Vault** among its dependencies on its official pages, which is a typical example of a gameplay plugin calling the economy through the abstraction layer.

:::note Establish who actually holds the money
When debugging an economy problem, the first question is not "is the shop plugin broken" but **"which plugin is currently providing the economy implementation"**. Plenty of "balances reset to zero" and "withdrawals do nothing" problems come from having two economy implementations installed at once, or from the abstraction layer pointing at an implementation that holds no data.
:::

### 3.2 Physical currency items

Some implementations support turning **currency into an item**. CMI's official documentation, for example, describes a cheque system that creates an item containing a sum of money which can circulate between players. This design has real trade-offs:

- Upside: transactions feel physical, which suits roleplay and offline handovers, and money can be delivered while a player is offline.
- Downside: if the item can be duplicated, obtained illegitimately, or lost during a cross-server transfer, your currency is out of control. Item-form money also bypasses plugin-level transaction records.

If you plan to use physical currency, you must solve three things at once: the item cannot be forged (which depends on item data validation), transactions are logged, and there is an appeal process for losses.

### 3.3 Is currency created by admins or earned by players?

This is the first and most important decision in economy design:

| Model | Where money comes from | Consequence |
| --- | --- | --- |
| Admin-created (grants, selling to the system) | Commands and shop buyback | Simple and direct, but inflation-prone; requires strong sinks |
| Player-earned (labour, trade, quests) | Gameplay output | Healthier, but costly to design; the output rate must be controllable |
| Hybrid | The system pays a base income, players circulate it | The most common real-world answer; the key is to manage system issuance as if it were money printing |

## 4. Shops

Shops are the **circulation channel** of the economy, and also where things break first, because they decide what anything is worth.

### 4.1 Interaction style: sign and chest shops versus GUI shops

| Style | Characteristics | Best for |
| --- | --- | --- |
| Sign and chest shops | A player places a chest in the world and prices it with a sign; no commands needed to trade | Player-run free markets, concentrated shopping districts |
| GUI shops | Browse categories and buy through a menu; the admin configures the item list | Admin shops, onboarding, buying across many categories |

Verifiable official descriptions:

- **ChestShop**: the official repository describes it as *The original chest & sign shop plugin for Minecraft Servers running Bukkit/Spigot/Paper. Est. 2011*.
- **QuickShop-Hikari**: the official repository describes it as a shop plugin that lets players easily buy and sell any items from a chest without any commands, noting that players never actually need any of the commands it provides.
- **Shopkeepers**: the official README states that it lets you set up custom villager shopkeepers that sell exactly what you want, and that it supports **two kinds of shops**: **admin shops with infinite supply** and **player shops that pull supply from a container**.
- **GUI shop category**: shop plugins built around menu interfaces, for example EconomyShopGUI, whose official repository EconomyShopGUI-API is described as *The API of EconomyShopGUI* for other plugins to integrate with.

### 4.2 Player shops versus admin shops

| Type | Supply | Who sets prices | Economic meaning |
| --- | --- | --- | --- |
| Admin shop | Infinite | The owner | A system-level money tap and money sink that directly determines inflation |
| Player shop | The player's own goods | The player | Circulation between players; the owner only supplies rules and space |

### 4.3 "Selling to the server" and "trading between players" are different things

This is the point most worth explaining clearly to your players:

- **Selling to the server**: the server buys without limit, which means **money creation**. The buyback price is the issuance price, and the buyback volume is the issuance volume.
- **Trading between players**: one side pays, the other delivers, so the total money supply is unchanged; it only moves.

Many servers whose "economy collapsed" trace the problem to an **unlimited admin buyback price**. As long as an item can be farmed and sold to the system indefinitely, players will turn it into a money printer.

### 4.4 How a shop economy breaks

| Failure mode | Mechanism | Prevention |
| --- | --- | --- |
| Buyback price set too high | Players farm the item and sell it in bulk | Review the buyback table regularly; cap buyback per player |
| Duplication exploit | Item counts double out of nowhere, then get sold to the system | See section 9; every output-capable feature needs logging |
| Typo in a sell price (a missing zero) | A single trade breaks the economy | Validate price changes on a test server first; keep a record of config changes |
| Nothing expensive to buy | Money flows in but never out, causing inflation | Design sinks, see section 10 |
| Shops used as player-to-player transfer | Becomes a laundering or tax-evasion channel | State the rules clearly; tax trades if necessary |

:::warn A shop price table is an economy configuration file, not a form to fill in casually
Before changing a buyback price, do the arithmetic: **how many of that item can one player produce in an hour, multiplied by the buyback price, is their hourly money-printing rate.** If that number is an order of magnitude away from what a normal hour of play earns, the economy will break within days.
:::

## 5. Quests and achievements

A quest system solves the **sense of purpose** problem: when a player logs in, they know what to do today.

Verifiable official descriptions:

- **Quests** (PikaMug): the official repository describes it as an easy-to-use, open-source plugin for the creation and execution of quests on Minecraft servers.
- **BetonQuest**: the official repository describes it as an advanced and powerful quest scripting plugin with built-in RPG-style conversations and integration for more than 40 other plugins. It suits heavier, story-driven servers with dialogue and branching.

### 5.1 Daily and weekly quests

- **Daily quests** provide a steady reason to log in, but their rewards must be small. The design target is "worth doing", not "mandatory".
- **Weekly quests** can carry larger rewards because they impose a natural cap on the output rate.
- **Do not turn quests into a check-in that pays money.** A pure "click to claim" turns your economy into a money printer running on a timer.

### 5.2 Reward design must not break the economy

There are three safe shapes of quest reward:

| Shape | Description | Risk |
| --- | --- | --- |
| Cosmetics and titles | No effect on power | Low, provided titles do not sell power |
| Consumables and convenience | Potions, teleport passes, repair vouchers | Medium; you must compute hourly output |
| Currency and high-value items | Direct money or gear | High; pricing must be derived backwards from an hourly output cap |

There is one test: **quest rewards must be comparable, on the same table, with your other money sources.** If quests pay far more per hour than anything else, players will only do quests and every other system will be abandoned.

## 6. Titles and prefixes

Titles belong to the **display layer**. Their value comes from being seen, not from stats.

| Type | How it works | Notes |
| --- | --- | --- |
| Permission-based prefix and suffix | The permissions plugin stores metadata; a chat or tab plugin renders it | The most common approach, naturally tied to permission groups |
| Cosmetic titles | Text the player chooses and displays | Usually needs a dedicated title plugin plus unlock conditions |
| In-gameplay titles | Provided by a gameplay plugin itself, such as a job name | For example the Chat Titles feature documented by Jobs Reborn |

A verifiable fact: **LuckPerms** is described in its official repository as a permissions plugin for Minecraft servers, and it stores permission and prefix metadata. **EssentialsX official module documentation** states that giving players prefixes and suffixes requires **Vault and LuckPerms**. In other words, **the plugin that stores a prefix and the plugin that displays it are usually not the same one**; the display step is done by a chat or tab plugin, covered in [Chat, Menus and MOTD](/tutorials/java/cosmetic).

Two hard lines in design:

- Titles can be sold as a supporter badge, but **they must never carry power**.
- The title system must be revocable. When a player breaks the rules, you must be able to remove their title immediately.

## 7. Crates and loot boxes

Crates are a random-reward feature. They create strong short-term excitement and long-term controversy.

### 7.1 How a reward table works

The core of a mainstream crate plugin is a **weighted reward table**:

- Each reward has a **weight**; higher weight means a higher chance.
- Rewards are often grouped by **rarity**, which itself affects the roll chance.
- Keys come as **physical keys** (tradable, giftable) or **virtual keys** (bound to a player).
- There are usually additional limits: opening cost, cooldown, permission requirements and roll limits.

Verifiable official descriptions:

- **CrazyCrates**: the official description is "add unlimited crates to your server with 11 different crate types to choose from". Its official documentation lives at docs.crazycrew.us, its installation notes require Paper or above, and it provides `/crazycrates debug` for testing rewards.
- **ExcellentCrates**: the official wiki lists rarity weights, reward weights, open cost, cooldowns, milestones and roll limits, and it explicitly provides **virtual keys** (documented as a way to **prevent keys from being shared, traded or sold**) and **reward logs** (recording every roll to a dedicated log file).

Both details have direct operational value: **virtual keys** let you stop keys from being traded, and **reward logs** let you investigate when something goes wrong.

### 7.2 Gambling and addiction: face the problem

Random rewards are psychologically very close to gambling: variable-ratio reinforcement, near misses, sunk cost. As an owner, you need to impose limits yourself:

- **Do not use "one more roll and you will get it" framing.** That is deliberate manipulation.
- **Publish the odds.** The reward table and weights should be visible to players, at minimum described in the rules.
- **Set caps.** A daily or weekly opening limit and a per-player reward limit measurably reduce the risk of runaway behaviour.
- **Protect minors.** This matters especially if your player base skews young.

### 7.3 Paid random rewards: a legal and ethical warning

:::warn Do not sell random rewards
**Tying random rewards to real-money payment, such as paid loot boxes or gacha, is subject to dedicated regulation or platform rules in some countries and regions. It may be treated as gambling-related content, and it may violate payment-processor and platform policies.** These rules change, and they differ substantially between jurisdictions. You must verify the requirements that apply to you rather than copying what someone else does.

There is also a more practical operational reason: **paid random rewards are an amplifier for pay-to-win controversy**. They turn "can money make you stronger" from a vague worry into a concrete fact, and player tolerance for that is extremely low. **The recommended approach is that keys are earned through gameplay only (events, quests, contributions) and are never sold for real money.**
:::

## 8. Gameplay categories

### 8.1 Jobs and skills

- **Jobs Reborn**: the official pages describe it as a fully configurable plugin that pays you for breaking, placing, killing, fishing, crafting and more, using class-based professions where you gain experience as you work. The same pages list Vault as a dependency, MySQL as optional, and features including a custom point economy, daily quests and chat titles.
- **mcMMO**: the official site positions it as an RPG plugin for Spigot and Paper, offering skills, levelling, super abilities, leaderboards and a party system, with a large number of configuration options.

The risk in this category concentrates on **output**: higher skill levels increase income, and job rewards pay money directly. Together they easily form a positive feedback loop where playing more makes you richer. Before launch, estimate **the hourly income of a maxed-out player**.

### 8.2 Minigames and parkour

Both usually require **separate worlds or instances**, and both have hard requirements on concurrent population:

- With too few players, matches never start and newcomers see empty arenas, which is worse than not having the mode at all.
- Maintenance cost is high: maps, rules, balance and exploits all need continuous attention.
- Wait until your main server is stable and your concurrent player count is reliable before considering these. Do not make them part of your first plugin batch.

Plugin options in this space vary widely in quality and maintenance. **Judge each candidate by its own official pages and update history**; this article deliberately does not recommend specific names here.

### 8.3 Claims, protection and economy integration

The core value of a claim system is **a feeling of property safety**. Without it, players will not invest in long-term building. Verifiable official descriptions:

- **GriefPrevention**: the official repository describes it as the official self-service anti-griefing Bukkit plugin for Minecraft servers since 2011.
- **WorldGuard**: the official repository describes it as protecting your Minecraft server and letting players claim areas.

Be careful when tying claims to the economy. **Claim costs (purchase, renewal, per-area fees) are an excellent money sink, but pricing them too high locks new players out entirely.** Align claim prices with what a newcomer can earn in their first few hours, not with what veteran players already hold. For how the protection stack fits together, see [Land Claims and Protection](/tutorials/java/protection) and [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat).

### 8.4 Large tech-style content (Slimefun-style plugins)

**Slimefun4** is described in its official repository as a unique Spigot/Paper plugin that looks and feels like a modpack, offering backpacks, jetpacks, reactors and much more since 2013.

A plugin like this amounts to **installing a second game inside your server**:

| Cost | How it shows up |
| --- | --- |
| Performance | Large numbers of custom items, machine logic and scheduled tasks |
| Version upgrades | Tied to the server version; upgrades often wait on upstream adaptation |
| Barrier to entry | Newcomers face an entire new system and are easily discouraged |
| Compatibility | Frequent conflicts with other plugins over items, crafting and drops |

If you are committed to a tech server, **plan it as a new game**: separate onboarding, separate tutorials, separate performance budget. Do not treat it as "one more plugin".

## 9. Anti-cheat and economy security

**Duplication exploits are the number one killer of an economy.** They do not change the rules, only the quantities, and once quantities run away, prices, shops and quest rewards all lose meaning.

### 9.1 Principles

- **Every output-capable feature needs logging.** Without logs you cannot even tell whether you are being farmed.
- **Log every transaction.** Who traded what with whom, when, and for how much. Post-incident investigation depends entirely on these records.
- **Keep an audit trail.** Bans, rollbacks and manual grants should all leave a record, which protects you from accusations of staff abuse and makes reviews possible.
- **Minimise permissions.** Grant a permission node instead of OP, and scope to one world instead of the whole server; see [Security Plugins](/tutorials/ops/security-java).
- **Have a rollback plan.** Whether you can restore to a point in time depends on your backup strategy; see [Backups and Recovery](/tutorials/java/backup).

A verifiable fact: **CoreProtect** is described in its official repository as a blazing fast data logging and anti-griefing tool for Minecraft servers. It records **block and container level activity**, which makes it your first source of evidence when investigating "where did my stuff go"; [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat) explains where it sits in the wider protection stack.

### 9.2 The risk of banned items leaking into the economy

"Banned items" here means items that should not exist, produced through exploits, commands or plugin bugs: abnormal enchantments, illegal stack sizes, balance-breaking tools. Their danger is that:

- Once they reach players, **they are treated as legitimate assets and traded**, contaminating the entire economy.
- The later you notice, the more expensive the rollback becomes, potentially affecting dozens of players.
- Handling must be evidence-based: **check the logs to establish the source first, then decide the scope of removal**. Do not ban people on a hunch.

A sensible measure is to make high-value items traceable to their origin, and to state in the rules that banned items will always be removed.

## 10. Economy balance design

An economy is fundamentally a **reservoir**: inflow and outflow must roughly balance.

| Direction | Tools | Notes |
| --- | --- | --- |
| Money sources (inflow) | Admin buyback, quest rewards, job income, event prizes | Every source must let you compute "how much money per hour" |
| Money sinks (outflow) | Selling to shops (players buying from the system), trade tax, claim purchase and renewal, repair costs, teleport fees, crate keys | Insufficient outflow always means inflation; this is the most commonly missing design element |

### 10.1 Symptoms of inflation

- Veteran balances are so high that "I can afford anything", and shops lose meaning.
- New players feel they can never catch up and leave.
- Expensive items are bought out and prices keep climbing.
- Player-to-player trade starts using barter to bypass currency altogether.

### 10.2 Sinks you must have

Prepare at least three or four, and make them **part of normal gameplay** rather than a fine:

- **Trade tax**: a cut taken when player shops complete a sale. It recovers money automatically and scales with activity.
- **Claim upkeep**: charged by area or by time, so holding land has a cost.
- **Repair and enchant costs**: gear maintenance consumes currency, and the recovered amount grows with progression.
- **Convenience services**: teleports, respecs, renames and similar paid services.

:::tip Tune the economy with data, not with feelings
Track these regularly: total currency in circulation, the share held by the top 10 percent of players, daily money created, and daily money recovered. **When daily creation consistently exceeds daily recovery, inflation is already happening**, even before it shows up in prices.
:::

## 11. Rollout order

Do not install everything at once. The recommended minimum viable order:

1. **Minimal economy**: install one economy implementation plus the abstraction layer, and confirm balances can be stored and read, where the data lives, and whether backups cover it.
2. **Basic sinks**: implement one of teleport fees, repair costs or claim costs first. **Do not open an economy to the public without at least one sink.**
3. **Shops**: start with admin shops where you control pricing, and confirm the buyback table cannot become a money printer; add player shops only when you need a free market.
4. **Quests**: once money sources and sinks are stable, use quests to guide players through the content you want them to experience.
5. **Cosmetics and titles**: add the display layer last. It does not affect power, but it noticeably improves long-term players' sense of belonging.
6. **Crates**: last of all, and stick to "keys come from gameplay only".

After each step, watch for one to two weeks: total currency, player behaviour, TPS. **If something breaks, roll back that step instead of adding another one.**

## 12. Pre-launch checklist

- [ ] You can state what problem each gameplay plugin solves
- [ ] All dependencies are installed and the console shows no load errors
- [ ] Exactly **one** plugin actually provides the economy, and the rest call it through the abstraction layer
- [ ] Every money source has an estimated hourly output ceiling
- [ ] At least three or four money sinks exist and are actually working
- [ ] The admin shop buyback table has been run through a money-printing calculation
- [ ] Quest rewards have been compared against money sources on the same income table
- [ ] Titles and cosmetics grant no power whatsoever
- [ ] Crate keys are earned through gameplay only and are not sold for real money
- [ ] Every output-capable feature and every transaction is logged
- [ ] A logging plugin such as CoreProtect was installed **before** launch
- [ ] The backup strategy covers the economy database and player data
- [ ] The banned-item handling process is written into the rules
- [ ] A rollback plan exists and has been rehearsed once
- [ ] Every gameplay plugin added has a recorded before-and-after TPS and MSPT measurement

## Next steps

- Dependencies and load-failure troubleshooting: [Common Dependencies](/tutorials/java/plugin-deps)
- Plugin installation and version management: [Getting Started with Plugins](/tutorials/java/plugins)
- Logging, rollback and anti-cheat: [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat)
- Chat, prefixes and menu display: [Chat, Menus and MOTD](/tutorials/java/cosmetic)
- How the protection stack is divided: [Land Claims and Protection](/tutorials/java/protection)
- How to measure performance: [Profiling with spark](/tutorials/ops/spark)
- The operations and team perspective: [[JAVA] Operations and Management](/tutorials/ops/management-java)
- Rules and order: [Community Rules](/rules)

---

> The exact names, features, and maintenance status of specific plugins are subject to each plugin's official pages.
