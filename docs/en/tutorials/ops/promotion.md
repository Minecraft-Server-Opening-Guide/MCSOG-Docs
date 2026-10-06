---
title: Promotion and Player Acquisition
slug: promotion
cat: ops
level: 2
order: 22
minutes: 16
tags: [promotion, community-growth, retention, marketing, server-list, video, onboarding, cold-start]
updated: 2026-10-04
draft: false
---

The previous articles were about whether your server can run. This one is about something else: **now that it runs, why would anyone know it exists, and why would they stay**.

This is a non-technical article. It is the companion to [[JAVA] Operations and Management](/tutorials/ops/management-java): that article covers what opening a server requires, how to split work across a team, and how to handle funding and players. This one focuses on just two of those areas, **promotion and community operation**. It contains no commands, no configuration and no plugin selection; when you need a plugin list, see [Getting Started with Plugins](/tutorials/java/plugins) and [Common Dependencies](/tutorials/java/plugin-deps).

:::note Set your expectations first
Promotion is not a one-off action where you post something and you are done. It is **continuous, content-driven work that lasts for months**. If you expect "one advertisement post, dozens of regular players", this article will disappoint you. Being disappointed early is exactly what keeps a server alive longer.
:::

## 1. "If I open it, players will come" is false

Many new owners carry this mental model: I get the server running, it is reachable from the internet, I publish the IP, and players will naturally show up. In reality: **nobody is obligated to discover you**.

You are facing the classic **cold-start problem**, and it comes with a self-reinforcing negative loop:

1. Your server has 0 players online.
2. A player sees "0/20" on a server list or in a group chat, concludes "this server is already dead", and scrolls past.
3. Because nobody clicks, list sites give you even less exposure.
4. So you still have 0 players.

The critical detail in that loop is this: **"0 players online" is itself a reason to leave**. Players are not unwilling to be the first one; they are unwilling to bet their time on a place that looks unmaintained. So the real goal of promotion is not "getting the word out" but **making the server look worth staying in at the exact moment somebody looks at it**.

A few facts you have to accept:

| Common belief | Reality |
| --- | --- |
| If the server is fun, players will come | Being fun is necessary for retention, not sufficient for exposure. If nobody knows you exist, nobody can judge whether you are fun |
| I am good with technology, so I can run a server | Technology only solves "it runs". Promotion and operations are separate crafts |
| Open it first, worry about promotion once people show up | If you wait for people to show up, they usually never do. Promotion material has to exist before launch |
| Buying ad slots is enough | An ad slot buys clicks, not retention. If the first day is bad, more traffic kills you faster |

:::warn Do not spam advertisements in other people's groups
**Pasting your server IP repeatedly into unrelated QQ groups, Discord servers, forums and message boards is one of the fastest ways to get kicked, blocked and publicly called out**, and it drags your server's name down with it. Players remember "that server that spams everywhere" and transfer that irritation to you. If you want to post in someone else's community, read the rules first, ask an administrator first, and be a person who actually chats there first. **A channel that allows you is a channel; a channel that does not is harassment.**
:::

## 2. Define your server in one sentence

Before writing any copy, finish this sentence:

```
This is a ______ (what kind of gameplay) server for ______ (whom),
and what makes it different from similar servers is ______.
```

All three blanks need something **specific**. If you cannot fill them in, your positioning is not clear yet, and promoting now only broadcasts that confusion to more people.

### 2.1 Common positioning types

| Positioning | Audience | What it forces you to decide |
| --- | --- | --- |
| Technical / redstone server | Players who love redstone, farms and mechanics research | Vanilla mechanics must not be broken by plugins; extremely sensitive to TPS and chunk loading |
| Vanilla survival server | Players who want to build up one world over months | The world must not be reset often; economy and claim systems must stay restrained |
| Minigames server | Players who want a quick round whenever they feel like it | Needs reliable queue sizes and match pacing; the lobby experience decides everything |
| Roleplay server | Players who want story and setting | Needs scripts, review and staff time, far more investment than a normal server |
| Bedrock / cross-play server | Phone and console players | The version and cross-play approach determine which plugins you can even use |
| Modded server | Players who want a modpack | Clients must install the same mods; your copy must state the pack and version |

### 2.2 Why a server with no positioning attracts nobody

- **Players decide in about three seconds.** What they see is not your world, it is one line of title. A vague title is the same as no title.
- **Without positioning, you can only stack adjectives.** "Fun, exciting, generous, no pay-to-win" carries no information for anyone.
- **You will attract people who conflict.** Players who want to build quietly and players who want to fight constantly will both be unhappy, and both will leave.
- **Operations has no standard for saying no.** Somebody proposes PVP, somebody proposes tech mods, you have no basis to judge, and you end up with a little of everything.

:::tip Positioning is a list of trade-offs
When you write your positioning, also write down **what you are not doing**: "no PVP competition", "no paid power", "no main-world resets". **Clearly rejecting some players is what lets the others feel safe.**
:::

## 3. Where Chinese-language Minecraft players actually are

The categories below are deliberately described as **categories**, not as specific sites. The reason is simple: **these platforms rise and fall, redesign themselves and change their rules**, so a channel that works today may be closed or ban advertising next year. What you actually need is the ability to recognise "what kind of place do I look for players in" and "what must I check before posting there".

| Category | Typical form | Good for | Check before posting |
| --- | --- | --- | --- |
| General forums and communities | Player forums in the MCBBS tradition, with server and recruitment boards | Long-form ads, recruiting staff and builders | Whether it still operates, whether server ads are allowed, which board to use, whether a template is required |
| Video and article platforms | Video, article and feed features on platforms such as Bilibili | Showing real gameplay, building the impression that somebody is working on this seriously | Whether leaving an IP in the description or comments is allowed, whether it counts as commercial promotion, whether disclosure is required |
| Message boards | MC-related boards on tieba-style sites | Small-scale reach, question-driven interaction | Whether ads are banned, whether only a single megathread is allowed |
| Instant-messaging communities | QQ groups and Discord servers | Long-term companionship, event notices, support | Group rules, whether external links are allowed, whether you can talk to an admin first |
| Server lists and directories | Server list and directory sites, including this site | Passive traffic, being found by version and gameplay filters | Listing requirements, tag conventions, whether link exchange is required, whether top placement costs money |
| Friends, streamers, campus groups | Friends, classmates, small streamer audiences | The first handful of real players | The other person's willingness; never assume somebody will promote you for free |

A few practical rules:

- **Lurk before you speak.** Before posting anywhere, watch how people talk, how the moderators behave, and whether anyone has been punished for advertising.
- **Adapt the copy per channel.** Pasting one identical post everywhere usually fails on formatting: broken images, mangled layout, swallowed links.
- **Track channel performance.** If a channel produced no real joins after three attempts, drop it instead of posting more often.
- **Never fake your numbers.** Idle bots, inflated player counts and bought clicks may fool a list-site ranking for a while, but players will find out, and the "this server fakes its data" label never washes off.

## 4. What a good server advertisement post contains

The job of an ad post is not to describe how great your server is. It is to let a player answer four questions in ten seconds: what is this, is it for me, can I play right now, and how do I get in?

| Element | Why it is required | Common mistake |
| --- | --- | --- |
| One-sentence positioning | Decides whether the player keeps reading | Writing only "the best server" |
| Supported versions | A client version mismatch means they cannot connect | Claiming "all versions" when you support one or two |
| Premium or offline mode | Decides whether they can join at all, and whether they want to | Omitting it, or being vague |
| Gameplay highlights | Explains how you differ | Listing dozens of plugin names that mean nothing to a player |
| Hardware and stability notes | Players care whether it lags and whether it will shut down | Claiming "never lags" and then dropping frames on join |
| How to join | Lowers the barrier | Giving only a group number, with no IP or domain |
| Screenshots or video | The only proof that real people actually play | Creative-mode staged shots that set expectations you cannot meet |
| Link to the rules | Filters out the wrong people early | Rules that exist only inside a group chat where newcomers never see them |
| Contact information | Somebody to reach when things go wrong | An email address nobody reads |
| Online hours and launch date | Lets players judge how new you are and when it is busy | Omitting it, so players assume it is a dead server |

### 4.1 Fill-in template

```
[Server name] ______
[One-sentence positioning] A ______ server for ______, different because ______
[Supported versions] Java ______; Bedrock supported: ______
[Account requirement] Premium / offline (state clearly if mixed login is supported)
[Gameplay highlights] 1. ______  2. ______  3. ______
[Hardware and stability] Hosting location: ______; usual peak concurrent players: ______; uptime over the past month: ______
[How to join] IP or domain: ______; port: ______; how to join the group: ______
[Launch date] ______ (if it is new, just say so; do not pretend to be an old server)
[Rules] ______ (link)
[Contact] ______
[Screenshots or video] ______
```

### 4.2 Common ways to lose points

- No real in-game screenshot at all, only a logo and a promotional banner.
- Unverifiable promises such as "the best ever", "absolutely no lag", "will never shut down".
- Treating a plugin list as a gameplay description, with dozens of plugin names.
- A layout so decorative that the IP is hard to read.
- Leaving contact information and then not replying for three days.

## 5. Video and short-video strategy

Video is currently **the most cost-effective way to show a server**, because it proves three things at once: real people are playing, what the world looks like, and whether the server lags.

### 5.1 The thirty-second hook

The first three seconds decide whether the viewer scrolls away. Effective openings usually show a result rather than an intro:

- Open directly on a visually strong scene: a large build, a redstone machine running, a chaotic event fight.
- Use one sentence to say what this is and why it is worth watching, for example "this is the night the first automatic sorting system on the server was finished".
- Do not open with a logo animation longer than five seconds, and do not open with a "promotional film of such-and-such server" title card.

### 5.2 Show real gameplay, not logos

Viewers can tell staged footage from live footage. **Put the camera on continuous first-person play**: mining, building, trading, fighting, joining an event. If what makes your server attractive is the community, film the chat interactions, the process of building something together, and people gathering before an event starts.

### 5.3 Why stable TPS affects your promotion

**Lag is visible on video**: entities twitching, blocks reappearing after being broken, players teleporting, delayed block breaking, piles of dropped items. Viewers may not know what TPS means, but they will absolutely feel that the server is laggy.

So before filming:

- Schedule recording away from backups, map rendering and large-scale world generation.
- Use [Profiling with spark](/tutorials/ops/spark) to confirm TPS and MSPT are healthy; do not film through a lag spike.
- Watch your own footage afterwards, paying attention to entity movement and block interaction smoothness.
- If there is a real performance weakness, narrow the scope of what you film instead of hiding it with editing.

:::tip Footage is a one-time investment you can reuse
One recording session can produce a thirty-second short, a three-minute video, several stills and an event recap. **Decide where the material will be reused before you decide what to film**, which is far less work than hunting for footage every time.
:::

## 6. Server list and directory submissions

The value of list sites is **passive traffic**: a player filtering by version, gameplay or player count may run into you. It will not produce explosive growth, but it is baseline exposure that keeps working while it sits there.

Typical listing requirements, which vary a lot between sites, so check each one:

| Requirement | Explanation |
| --- | --- |
| Accurate version and gameplay tags | A wrong version tag means players join and cannot connect; they leave, and you may get bad reviews |
| IP or domain and port | Must be something a player can connect to directly; a group number alone is not enough |
| Premium or offline mode | Must match the site's filter options |
| Screenshots | Usually real in-game screenshots |
| Description copy | Usually has a character limit, which tests your one-sentence positioning |
| Listing conditions | Some require link exchange, some require a minimum player count, some sell paid top placement |
| Keeping it current | Update after version changes and IP changes, or players cannot connect |

Two things worth stating plainly:

- **Top placement and ad slots buy traffic, not retention.** You pay to bring people in, the first day is bad, they leave anyway, and when the money stops the traffic stops.
- **Ranking is often tied to player count and click-through rate.** That means promotion and retention are two faces of the same thing: if you cannot keep people, your ranking falls on its own.

## 7. Community operations

Promotion handles "arriving"; operations handles "staying". A server with no operations sees its promotion results decay by the day.

### 7.1 Rules

- **Few and clear.** Ten enforceable rules beat fifty that nobody remembers.
- **Publicly visible.** Rules must live somewhere a player can find without asking a human; see [Community Rules](/rules).
- **Graduated consequences.** Reminder, warning, temporary restriction, permanent ban, each with its trigger written down.
- **Staff follow the rules too.** A single accusation of staff abusing their powers damages player trust more than any cheat.

### 7.2 Onboarding and the first-day experience

The first five minutes decide whether a new player has a second five minutes. There is exactly one design goal: **let them accomplish something within ten minutes**.

- Give the spawn area clear visual guidance: signs, landmark builds, NPCs or notices that say where to go and what to do first.
- Provide a shortest growth path, for example "take the starter tools, mine in area A, return to spawn to hand in the task, receive your first bit of starting money".
- Starter benefits are fine, but **they must not break the economy**. Handing out too much money and too many items skips the entire early game and removes the sense of growth.
- Do not cover spawn with signs and teleport menus. Information overload equals no information.

### 7.3 Greeting new players

- **A real person saying hello** is worth a hundred times more than an automated welcome message. When somebody greets a newcomer by name in public chat, the odds they stay rise noticeably.
- Have a notion of duty shifts: at minimum, make sure somebody can answer questions during your peak hours.
- Do not use a bot that spams welcomes; it only tells newcomers that nobody is here.

### 7.4 Events and schedules

- **A fixed schedule beats random events.** For example "build contest every Saturday at 20:00" or "treasure hunt every Sunday at 21:00" lets players form expectations.
- Announce in advance, then remind people again ten minutes before it starts.
- Match event scale to your staffing. Promising an event you cannot run hurts more than not holding one.
- Keep records of events: screenshots, highlight reels, result announcements. They are both promotion material and community memory.

### 7.5 Feedback channels

- Keep **one** clear feedback entry point instead of making players shout in five different groups.
- Publish the outcome: received, fixed, or not fixing, with the reason. Players are not afraid of a refusal; they are afraid of silence.

## 8. Retention: why players leave in the first 10 minutes

Most departures happen **in the first ten minutes after joining**, and the cause is usually unrelated to "not enough content".

| Reason for leaving | What the player actually feels | What to change |
| --- | --- | --- |
| Spawn makes no sense | "I do not know what I am supposed to do" | Clear guidance and a shortest growth path |
| Lag and disconnects | "Is this server about to shut down?" | Fix performance before spending on promotion |
| Nobody is talking | "Nobody is here, it is dead" | Real people greeting newcomers, somebody on duty |
| No visible goal | "I built a house, now what?" | A clear progression and goal structure |
| Crushed by veterans | "I will never catch up" | Limit resource gaps, restrict raiding |
| Punished under unclear rules | "I got banned for no reason" | Public rules and documented enforcement |
| Feels like it may close at any time | "I do not want to invest time" | Publish your launch plans and stability notes |
| Paid power | "I cannot play without paying" | See below |

### 8.1 Do not build pay-to-win

Paid content may sell **cosmetics, convenience and supporter badges**. It must not sell **power**. The reason is not moral lecturing, it is that paid power directly destroys retention:

- Free players conclude "this server is not made for me", and leaving becomes the rational choice.
- Once players believe money solves everything, all of your gameplay design loses meaning.
- Broken trust is very hard to repair, and a server's reputation travels extremely fast through player communities.

### 8.2 The progression path must be visible

Give players a path where they can answer "what is next" themselves: a short-term goal they can finish today, a mid-term goal for this week, and a long-term goal for this month or longer. The path does not need to be complicated, but it **must be written where players can see it**.

## 9. Community-level moderation and conflict handling

For the technical side of anti-griefing, see [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat) and [Security Plugins](/tutorials/ops/security-java). This section is about **people**.

- **Leave a paper trail.** Bans, rollbacks and punishments should all be recorded, which also protects you from accusations of staff abuse. Logging plugins provide the evidence.
- **Fix the process**: private reminder, public warning, temporary punishment, permanent punishment, escalating in order. Skipping steps causes disputes.
- **Do not decide while emotional.** A player insulting you and a player breaking the rules are two different matters.
- **Handle disputes publicly.** Publishing the rule you applied and the outcome is worth more than a hundred messages of arguing in a group chat.
- **The staff team needs rules too.** Staff must not give their friends a pass; this is the single most common way a community rots.

For more on team structure, funding and player management, see [[JAVA] Operations and Management](/tutorials/ops/management-java).

## 10. Metrics worth watching

You do not need a data platform. One table is enough. **Watch trends, not single points.**

| Metric | How to read it | Notes |
| --- | --- | --- |
| Day-1 retention | Of the newcomers today, how many come back tomorrow | The best single signal of first-day experience |
| Day-7 retention | Are they still here a week later | Reflects the progression path and community atmosphere |
| Peak concurrent players | The highest simultaneous count in a day | Used both for capacity planning and list-site ranking |
| Average session length | How long one visit lasts | Short and frequent suggests thin content; long and stable suggests stickiness |
| First-day churn | The share who quit soon after joining | Read it together with spawn design and onboarding |
| Acquisition channel | Where players heard about you | Decides where to spend effort next time |
| Chat activity | How many people are talking | A silent server looks like a dead server |

Two reminders:

- **Do not over-read small samples.** Five arrivals and three departures in one day proves nothing. Look at a trend over at least two weeks.
- **Data must map to actions.** If retention is bad, look at spawn and onboarding, not at posting more ads. **Promotion amplifies an experience; it does not substitute for one.**

## 11. Launch week checklist

Work through this from one week before launch to one week after.

- [ ] The one-sentence positioning is written and can be used to filter out the wrong players
- [ ] Supported versions, premium or offline mode, and cross-play are decided and stated in every piece of copy
- [ ] The server ran stably for long enough before launch, without frequent crashes
- [ ] Performance is confirmed (TPS, MSPT, memory, disk writes) and recording sessions avoid backups and rendering
- [ ] Spawn gives clear guidance and a newcomer can accomplish something within ten minutes
- [ ] The rules are written down and publicly reachable
- [ ] At least one real person can be on duty to answer questions during your launch hours
- [ ] Ad material is complete: positioning, versions, account requirements, gameplay highlights, stability notes, how to join, screenshots or video, rules link, contact
- [ ] Every target channel has been checked for its rules and, where required, an admin has agreed
- [ ] Server list and directory entries are submitted and verified as correct
- [ ] At least one thirty-second video or a set of real screenshots is ready
- [ ] The event schedule is set and published before launch
- [ ] There is exactly one feedback entry point and somebody reads it
- [ ] The paid content list has been reviewed: cosmetics and convenience only, no power
- [ ] A metrics sheet exists, and a fixed weekly review time is agreed

## Next steps

- The wider view of team, funding and player management: [[JAVA] Operations and Management](/tutorials/ops/management-java)
- If the technical foundation still needs work: [Getting Started with Plugins](/tutorials/java/plugins) and [Common Dependencies](/tutorials/java/plugin-deps)
- Chat, menus and the first impression on join: [Chat, Menus and MOTD](/tutorials/java/cosmetic)
- Rules and community order: [Community Rules](/rules)
- How to investigate after an incident: [Anti-Cheat and Anti-Grief](/tutorials/java/anticheat)

---

> The exact names, features, and maintenance status of specific plugins are subject to each plugin's official pages.
