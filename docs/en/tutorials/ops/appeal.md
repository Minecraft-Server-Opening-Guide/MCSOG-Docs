---
title: Player Bans and the Appeal Process
slug: appeal
cat: ops
level: 3
order: 27
minutes: 16
tags: [bans, appeals, server-rules, moderation, evidence, process]
updated: 2026-10-04
draft: false
---

A ban is the one routine action in server operations that **directly takes away a player's access**, and it is also the action most likely to start a fight. This page is not about tooling. It is about **process**: who may ban, on what grounds, for how long, how a player answers back, and how you reply.

For the tooling, see [NDPReforged Shared Ban System](/tutorials/ops/ndpr), which covers installing and configuring a cross-server ban list. For evidence collection, see [Anticheat and Anti-Griefing](/tutorials/java/anticheat) and [[JAVA] Security Plugins](/tutorials/ops/security-java). For day-to-day player management, see [[JAVA] Management](/tutorials/ops/management-java).

:::warn Commands and configuration here follow the official documentation
Plugin names, command syntax, paths, and service names below **change with server software, plugin versions, distribution, and install method**. The examples show *what to configure*, **not something to copy verbatim**. Before you apply anything, check the official documentation for the plugins and system you actually run, plus the configuration files your own machine generated.
:::

## 1. Why a written process matters

Most servers do not fail because they are too strict. They fail because **there is no rule to point at**. Writing the process down solves four problems.

**One: consistency.** The same behaviour gets a three-day ban today and a permanent ban tomorrow, and players tell each other: "It depends who you are." Once players believe outcomes are random, the rules stop constraining anyone. **Deterrence comes from predictability, not from severity.**

**Two: it blunts accusations of admin abuse.** If a ban is "what I felt at the time", any ban can be read as a personal grudge. "Rule 3.2, evidence is a CoreProtect lookup, decided by A, reviewed by B" is a **claim someone can check**. The accusation does not disappear, but you have something to show.

**Three: it removes pointless arguments.** Most ban disputes are really **information asymmetry**: the player does not know why they were banned, or knows only the word "violation". Requiring that every ban states a reason and a way to appeal removes a large share of those conversations.

**Four: it keeps you from making mistakes.** A cooling-off period, a second reviewer, a written record: all cheap, and all of them stop the "I was angry at 2 a.m. and typed /ban" mistake you would regret the next morning.

:::tip The minimum viable process
If you can only do one thing, do this: **every ban leaves a record with five fields — time, player, reason, where the evidence is, and who decided**. Even a single pinned channel in Discord beats having nothing.
:::

## 2. What counts as a bannable offence

Rules have to be **short, checkable, and not dependent on interpretation**. The list below can go straight onto your rules page; the parenthetical note is the test.

| Offence | How you judge it |
| --- | --- |
| Griefing | Modifying another player's build or a public area without permission, with block logs to check |
| Stealing | Taking items from another player's container; logging plugins give who, when, and which coordinates |
| Cheating and exploit use | Hacked clients, x-ray, auto-clickers, or abusing duplication, clipping, and item-duplication bugs |
| Hate speech | Attacks targeting race, gender, religion, sexual orientation, or origin |
| Advertising | Repeatedly posting other servers, paid services, or trades in public channels |
| Doxxing and threats | Publishing someone's real identity, or making real-world threats |
| Ban evasion | Returning on another account or IP; this is an **aggravating factor**, not a separate minor offence |

The list shares three properties, and that is exactly why it works: the behaviour is **observable** (a log or a screenshot exists), the rule was **published** (players could read it beforehand), and the outcome is **explainable** (you can name the clause).

One note on ban evasion: it usually means an **escalation from temporary to permanent**. The reason is not "you are worse now" but "you have demonstrated that a temporary measure does not work on you".

## 3. What should not be a ban

The boundary matters just as much. Banning in the cases below puts you on the wrong side of the argument.

- **A first-time minor mistake.** Someone digs up a farm by accident, says the wrong thing in chat once, or puts a chest in the wrong place. A reminder and a request to restore the damage works better than a ban, and it is easier to accept.
- **"Breaking" a rule that was never published.** If a rule was never written anywhere a player can see, **it does not exist**. You cannot punish someone for a rule that only lives in your head. Publish the rule first, state the effective date, and apply it from then on.
- **A disagreement about interpretation.** A player reading the rule differently is a **signal that the rule is unclear**, not evidence of malice. Fix the rule instead of banning the reader.
- **Behaviour you simply dislike.** Being skilled, talkative, opinionated, or uninterested in your events is not a bannable offence.
- **Guilt by association.** "Their friend was abusive too" and "that IP was a problem last time" are not evidence. Punishment attaches to **a specific action by a specific account**.

:::note A useful self-check
Before you press the ban button, ask: **if this ban were posted publicly, could I justify it with nothing but the behaviour, a published rule, and the evidence?** If the answer needs "well, they are always like that" or "I never liked them", the ban has no case.
:::

## 4. The evidence requirement

**A ban without evidence hands the decision to whoever argues loudest.** The bar is not high, but agree on it in advance.

| Evidence | Where it fits | Caveats |
| --- | --- | --- |
| Block and container logs | Griefing, stealing | Strongest option: gives coordinates and timestamps; **only records what happened after it was installed** |
| Server console log | Command abuse, unusual logins | Disappears with log rotation, so save it promptly |
| Screenshot | Chat, advertising, build appearance | Easy to accuse of cropping; keep the surrounding context |
| Screen recording | Cheating, repeated behaviour | Large files; keep the original file and its timestamp |
| Anticheat plugin output | Movement and combat anomalies | **Supporting** evidence; on its own it is easy to get wrong |

**Logging plugins are the foundation of the evidence chain.** The mainstream option is **CoreProtect** (described officially as a blazing fast data logging and anti-griefing tool for Minecraft servers, repository <https://github.com/PlayPro/CoreProtect>), with alternatives such as **Prism**. Two limits matter:

1. **It only records what happened after installation.** Install it after a grief and you will find nothing about that grief.
2. **It records block and container level actions**, not intent.

Treat anticheat output **carefully**: false positives are real, especially when a player's connection is unstable or TPS has dropped very low. Use it as a signal that deserves human review, not as a verdict. For how the pieces fit together, see [Anticheat and Anti-Griefing](/tutorials/java/anticheat); for configuring permissions and logging plugins, see [[JAVA] Security Plugins](/tutorials/ops/security-java).

:::tip Store evidence off the server
Copy screenshots, recordings, and exported query results **off the server immediately** (your own machine, cloud storage, a private repository). Logs rotate, worlds get rolled back, plugin data gets pruned, and the appeal may arrive a month later.
:::

## 5. The tiered punishment ladder

A ban should not be the only tool. **The ladder exists so that the punishment matches the offence** and so that players have a way back.

| Circumstances | Action | Duration | How it is recorded |
| --- | --- | --- | --- |
| First minor offence (accidental digging, one bad message) | Verbal or private warning | None | Note in the staff log |
| Repeated minor offences, spam, mild abuse | Mute | 1 hour to 24 hours | Plugin record plus staff log |
| Griefing or stealing, limited scale and value | Temporary ban | 1 day to 7 days | Ban record plus archived evidence |
| Large-scale griefing, cheating, hate speech, doxxing | Long ban | 30 days to permanent | Ban record, archived evidence, review |
| Ban evasion, retaliatory griefing | Permanent ban | Permanent | Ban record, archived evidence, review |
| Wrongful ban or insufficient evidence | Lift and apologise | Immediately | Record the reason for lifting |

How to use it:

1. **Escalation needs a paper trail.** Moving from a warning to a ban should point at a record saying the warning already happened. No record, no escalation.
2. **Every permanent ban gets a second reviewer** (see the next section).
3. **State the duration.** After a ban command the player usually sees only "you are banned", so **you must also communicate the duration and the reason**, or you cannot defend the decision at appeal time.
4. **Record and act at the same time.** A record written afterwards carries almost no weight in a dispute.

The exact command syntax **depends on the punishment plugin you run** (different plugins take different arguments for ban, temporary ban, and mute), so follow that plugin's official documentation.

## 6. Who decides

**"Everyone is an admin" is where server moderation starts to fall apart.** Not because you distrust people, but because it makes **responsibility untraceable and standards inconsistent**.

A minimal division of labour:

| Role | Responsibility | Notes |
| --- | --- | --- |
| Decider (one person) | Judge the offence, choose the action, write the record | **Exactly one** decider per case, so "whoever got there first" does not set policy |
| Reviewer (a different person) | Review permanent bans and disputed cases | **Must not be the decider**; reads evidence and rules, not friendships |
| Appeal handler | Receive appeals, check evidence, reply | Can be someone other than the decider, which avoids the appearance of self-review |
| Record keeper | Maintain ban and appeal archives | Keeps records complete and searchable |

Why "everyone is an admin" breaks consistency:

- **Different standards.** One person thinks spamming is harmless; another thinks it deserves a permanent ban.
- **Untraceable authority.** When something goes wrong you cannot tell who decided, so you cannot correct it.
- **Permissions become the risk.** The point of a permissions plugin such as LuckPerms is **granting narrow permission nodes** rather than handing out OP. Vanilla OP is enormous: if that account is compromised or its owner loses their temper, the damage is server-wide. See [[JAVA] Security Plugins](/tutorials/ops/security-java).
- **Social pressure concentrates.** With defined roles, "my friend got banned, can you let it go" has a standard answer: "I cannot review that; it goes through the appeal channel."

:::note A realistic approach for small servers
If you are the only staff member, you cannot have a second reviewer, so use **time** instead of a person: hold permanent bans for **24 hours before executing them**, and spend that day organising the evidence. A day later, many impulsive decisions disappear on their own.
:::

## 7. The appeal channel

The appeal channel must be **public, fixed, and traceable**. Three common shapes:

| Shape | Advantages | Drawbacks |
| --- | --- | --- |
| Dedicated mailbox (for example `appeal@example.com`) | Simple, no extra system, archives itself | Players send the wrong thing; formats vary |
| Forum or form page | Controllable fields, publicly searchable once redacted | Needs maintaining |
| Discord ticket channel | Low friction, fast replies | Easy to spam, needs moderation permissions |

**Do not make "DM the owner" the only channel.** DMs leave no record, have no queue, invite emotional decisions, and cannot prove you handled anything.

### 7.1 Required fields

Whatever the channel, the form should require the fields below. Rejecting an incomplete form is itself a filter.

| Field | Required | Purpose |
| --- | --- | --- |
| In-game name | Yes | Match the ban record |
| Ban date and time (with time zone) | Yes | Locate the record |
| The reason the system showed | Yes | Makes the player restate your reason, which shows whether they read it |
| The player's statement | Yes | What happened, and why they think the decision was wrong |
| Links to evidence | No | Screenshots or recordings the player supplies |
| Contact method | Yes | Used to reply, and **kept internal only** |

### 7.2 A template you can use directly

```text
[SERVER NAME] Ban appeal form

1. In-game name:
2. Ban date and time (please state the time zone):
3. The reason shown to you at the time (copy it exactly):
4. Your statement (what happened, 500 words or fewer):
5. Why you believe the decision was wrong (tick all that apply):
   [ ] It was not me
   [ ] The record does not match what happened
   [ ] The punishment was too harsh
   [ ] The rule was not published / I did not know it
   [ ] Other (please explain)
6. Links to evidence (optional):
7. Contact method (visible to staff only):

We reply within 72 hours. Please do not submit twice; duplicates do not speed anything up.
```

### 7.3 Response SLA

**Give a concrete time commitment and try to keep it.** A workable baseline:

- **First reply within 72 hours**, including an acknowledgement such as "we have your appeal and are checking the evidence".
- **Complex cases (permanent bans, multiple players): up to 7 days**, with a message inside 72 hours saying it will take longer.
- **If the SLA passes with no reply, the player may follow up once**, and that follow-up should be handled first.

An SLA is not just politeness: **an appeal with no deadline is not an appeal**, and players who wait will redirect their frustration at the whole community.

:::warn Do not promise a deadline you cannot keep
"Replies within 24 hours" looks great until you miss one, and then the whole rules page loses credibility. **Write 72 hours and hit it consistently.**
:::

## 8. How to handle an appeal

Fixed steps, in order:

1. **Log it.** Record the time received, who appealed, and the ban record ID. **Log before judging**, or it will be forgotten.
2. **Check the evidence.** Go back to the original material: the logging plugin query, the log excerpt, the original screenshot. **Do not rely on memory or on someone else's summary of the conclusion.**
3. **Confirm the rule basis.** Find the clause that was cited. If you cannot find it, that is a problem in itself (see section 11).
4. **Reach one of exactly three conclusions:**
   - **Uphold**: the evidence holds and the punishment matches the offence. State the reason and a summary of the evidence in your reply.
   - **Reduce**: the behaviour happened, but the punishment was excessive or is nearly served. Shorten it or downgrade it to a warning.
   - **Lift**: insufficient evidence, a mistake, or an unpublished rule. Remove the ban immediately and say why.
5. **Reply in writing**, through the channel the player provided, including the conclusion, the rule relied on, a summary of the evidence (you need not publish every detail), and what happens next. **Do not use a mocking tone and do not quote the player's own words back at them.**
6. **Archive it.** Put the original appeal, your conclusion, and the timestamps into the same record. **This is the step people skip and the one that matters most**: it is your reference for the next similar case.
7. **Track the numbers.** Review appeal volume, uphold rate, and lift rate periodically. A high lift rate means front-end decisions are weak; a sudden spike in appeals usually means the rules or the communication around them changed for the worse.

:::tip Reply template (uphold)
"We checked the block logs for <date>: <count> blocks at <coordinates> were removed by your account at <time>, which violates rule <number>. The ban therefore stands, until <date>. If you believe the record is wrong, you can add more detail."
:::

## 9. Transparency in public

Transparency is not "publish everything". It is **making the rules and the standards checkable**.

| Practice | Recommendation | Notes |
| --- | --- | --- |
| Rules page | Required | Public, stable link, with a last-updated and effective date |
| Ban list | Optional | Player name, reason, and duration are enough; see the privacy limits below |
| Periodic summary | Recommended | For example, monthly: "N bans this month, M permanent, K lifted" |
| Appeal statistics | Recommended | Shows players the channel works, which reduces "appeals do nothing" |

**Privacy boundaries (mandatory):**

- Never publish **real names, addresses, phone numbers, email addresses, social accounts, or employers**. This is personal identifying information.
- Never publish **full IP addresses**. When you must refer to one, use a masked form such as a network prefix, and keep the full value in internal records only.
- **Do not quote full chat context** in public explanations; quote only the part relevant to the decision.
- **Data about minors is especially sensitive.** Nothing that can be traced to a person should be published.
- Write the public reason as the **rule clause**: "griefing another player's build", not "repeat offender, bad person".

:::warn Publishing a player's personal information is itself the problem
Posting a player's real name, address, phone number, social accounts, or full IP address in a public channel or forum is **something you do not do, whatever that player did**. It turns your server from the party handling a violation into the party causing harm, it may violate platform terms and local law, and every other player will stop trusting you the moment they see it. If a player breaks the rules, handle it under the rules; **using privacy as a weapon is one of the most serious mistakes an operator can make**. If such information has already been posted: delete it immediately, notify the person concerned as far as you can, record what happened, and make it explicit internally that nobody may do this.
:::

## 10. Unban conditions and probation

Even a permanent ban should not be a door with no handle. A **verifiable exit** dramatically reduces long-running disputes.

| Type | Unban condition | Probation |
| --- | --- | --- |
| Temporary ban | Expires automatically | None, though the record stays |
| Long ban (30 days or more) | Expiry plus an appeal that acknowledges the behaviour and commits to stopping | Permanent on any repeat within 30 days |
| Permanent ban (first offence, not malicious) | Appeal after 6 to 12 months explaining what changed | 60 to 90 days; any violation returns to permanent |
| Permanent ban (doxxing, real-world threats, retaliatory griefing) | Normally no unban | Not applicable |
| Wrongful ban | Lift immediately and apologise | None |

Spelling out probation helps both sides: the player knows the cost, and you know that **the next decision does not need to be argued from scratch**.

:::note Unbanning is not erasing the record
An unban should **append a record** ("unbanned on <date>, reason: appeal granted / term served") rather than delete the original. Deleting it costs you your reference for the next similar case and makes the lift rate impossible to measure.
:::

## 11. What to do about a wrongful ban

**Wrongful bans will happen.** What decides your reputation is not never making one, but **what you do afterwards**.

1. **Lift the ban immediately.** Do not wait for the appeal process to finish. When evidence is insufficient, "lift first, discuss after" is the correct order.
2. **Apologise plainly**: "We got this one wrong. Sorry." Avoid hedges such as "we regret any inconvenience", which lands worse than no apology at all.
3. **Say what went wrong**, briefly: misread logging data, an anticheat false positive, two players with similar names. Let the player see that you **know** where the error was.
4. **Mark the reversal in the record** with the date and the reason. This is the input for later statistics and process fixes.
5. **Fix the process, not just this case:**
   - Frequent anticheat false positives: adjust thresholds and require human review before banning.
   - Name collisions: require every ban record to identify the player by UUID, not just by name.
   - One person deciding alone: add review or a 24-hour cooling-off period to permanent bans.
   - Unpublished rules: publish the rules page and announce the effective date.

**One publicly acknowledged mistake keeps more players than ten statements that you never get anything wrong.**

## 12. One-page process checklist

Print it, or pin it in the staff channel. **Every step should answer "what did it leave behind".**

**Before banning**

- [ ] The behaviour maps to a published rule (you can name the clause)
- [ ] Evidence is in hand and copied off the server
- [ ] Ruled out "first minor mistake" and "rule was never published"
- [ ] The punishment matches the offence (checked against the ladder in section 5)

**While banning**

- [ ] Record has all five fields: time, player name (with UUID), reason, evidence location, decider
- [ ] The reason describes **behaviour**, not character
- [ ] The player was told the duration and the appeal channel
- [ ] Permanent bans went to review, or a 24-hour cooling-off period is set

**When an appeal arrives**

- [ ] Logged (time received plus the matching ban record)
- [ ] Went back to the original evidence rather than memory
- [ ] Confirmed the rule basis exists and was published
- [ ] Conclusion is uphold, reduce, or lift; never "we will see"
- [ ] Written reply sent inside the SLA
- [ ] Original appeal and conclusion archived

**Public communication and review**

- [ ] Rules page is linked and has an update date
- [ ] Public material contains no real names, contact details, or full IP addresses
- [ ] Lifted bans are annotated with a reason
- [ ] Appeal volume, uphold rate, and lift rate are tracked
- [ ] A high lift rate has led to a fix in the decision step

## Next steps

- Installing and configuring a shared cross-server ban list: [NDPReforged Shared Ban System](/tutorials/ops/ndpr)
- How anticheat, logging, and rollback fit together: [Anticheat and Anti-Griefing](/tutorials/java/anticheat)
- Configuring permissions, login, and logging plugins: [[JAVA] Security Plugins](/tutorials/ops/security-java)
- Day-to-day player and community management: [[JAVA] Management](/tutorials/ops/management-java)
- Evidence handling and review after an incident: [Incident Forensics and Review](/tutorials/ops/incident-forensics)

---

> Scripts and configuration are governed by the official documentation for your own system and software.
