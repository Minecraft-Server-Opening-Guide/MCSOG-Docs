---
title: HTTPS Certificates and Automatic Renewal
slug: https
cat: ops
level: 3
order: 25
minutes: 16
tags: [https, tls, certificates, reverse-proxy, nginx, certbot, renewal, ops]
updated: 2026-10-04
draft: false
---

The panel will not open, the browser says "your connection is not private", the web map is a blank page - in a good share of these incidents the root cause is a single thing: **the certificate expired.** It is a failure that should be entirely avoidable, because it has a known expiry date and it can renew itself.

This article covers three things: **what TLS actually protects (and what it does not)**, **what a certificate and a private key are**, and **how to make renewal something you never have to remember**. For securing the panel itself see [Using and Securing Management Panels](/tutorials/ops/panels); for expiry alerting see [Monitoring and Alerting](/tutorials/ops/monitoring).

:::warn The configuration here follows the official documentation
The **package names, command arguments, configuration keys, default paths and directory layouts below all vary with the distribution, the installation method and the software version**. The examples exist to show "what to configure"; they are **not a finished product you can copy verbatim**. Before you roll anything out, check it against the official documentation for certbot, Let's Encrypt, nginx and your distribution, and against the files your own system actually generated.
:::

## 1. Draw the Boundary First: Game Traffic Is Not HTTPS

This is the most commonly confused point of all:

| Traffic | Protocol | Default port | Needs a TLS certificate? |
| --- | --- | --- | --- |
| Java Edition game traffic | Minecraft's own TCP protocol | 25565 | **No - a certificate does nothing for it** |
| Bedrock Edition game traffic | UDP (RakNet) | 19132 | **No** |
| Panel web UI | HTTPS | 443 (or your chosen port) | **Yes** |
| Web maps (Dynmap, Squaremap, BlueMap and friends) | HTTPS | 443 | **Yes** |
| Website, status page, MCDR web plugins, various APIs | HTTPS | 443 | **Yes** |
| RCON | Its own TCP protocol | 25575 | Not TLS; **do not expose it to the internet** |

**In short: an HTTPS certificate is for the web side.** Whether you install one has **nothing to do** with whether players can join, or with man-in-the-middle attacks on game traffic.

### 1.1 Then What Is the Encryption During Java Edition Login?

Java Edition does encrypt parts of the login exchange, but that is **Minecraft's own protocol mechanism**, defined by the game protocol and **unrelated to X.509 certificates or Let's Encrypt**. Treating an HTTPS certificate and "encrypting game traffic" as the same thing is where a lot of misdirected configuration starts.

### 1.2 Why the Web Side Still Needs TLS

Because the web side carries **credentials and identity**: panel passwords, session cookies, API keys and tokens - and **over plain HTTP anyone on the same network can read them**. On top of that, modern browsers label HTTP pages "not secure", and once panel users get used to ignoring that warning, the habit itself is a security problem. A panel exposed to the internet is scanned continuously; see [Common Network Attacks and Minecraft-Specific Defence](/tutorials/ops/attack-defense).

## 2. Certificates and Private Keys

### 2.1 What Each One Is

| | Certificate | Private key |
| --- | --- | --- |
| What it is | A public key plus identity information plus a CA signature | Key material that must stay secret |
| Can it be public? | **Yes** - it is meant to be handed to every visitor | **Absolutely not** |
| Consequence of exposure | None (it is public information anyway) | **Whoever holds it can impersonate your site** |
| Expiry | Has a validity period; **must be renewed** | Normally replaced together with the certificate; does not "expire" itself |

In one line: **the certificate is an ID card and the private key is a seal.** The ID card can be shown to anyone; losing the seal is a disaster.

### 2.2 The Usual Files and How They Relate

Using the output of a typical ACME client as an example (**exact filenames depend on your client**):

| File | Contents | Used for |
| --- | --- | --- |
| `fullchain.pem` | Your certificate plus intermediates | **`ssl_certificate` in the web server** |
| `privkey.pem` | The private key | **`ssl_certificate_key` in the web server** |
| `chain.pem` / `cert.pem` | Intermediates only / your certificate only | Normally not needed on their own |

**The classic mistake**: configuring `cert.pem` and omitting the intermediates, so "some browsers work and some do not". **Using `fullchain.pem` avoids this entirely.**

### 2.3 SNI: Several Sites on One IP

Modern TLS clients send **SNI (Server Name Indication)** during the handshake, and the web server uses it to choose a certificate. So several sites on one machine are fine, each with its own certificate; and **when you check a certificate from the command line you must pass the SNI argument** (`openssl s_client -servername ...`), otherwise you may be looking at a different certificate and draw the wrong conclusion (see section 8).

## 3. Let's Encrypt, ACME and "Renewal Must Be Automatic"

### 3.1 What ACME Is

**ACME is a protocol for issuing and renewing certificates automatically.** Let's Encrypt is the best-known ACME certificate authority (CA), and the domain-validated (DV) certificates it issues are **free**. The important word is "automatically": ACME is designed so the whole chain - request, validation, issuance, renewal, deployment - can run unattended. Other ACME CAs exist as well (**check each one's official documentation** for suitability and limits).

### 3.2 Ninety Days Is Not the Problem; Manual Renewal Is

Certificates issued by Let's Encrypt are **valid for 90 days** (per the official documentation). The usual first reaction is "that is far too short, how annoying" - and **that reaction is itself the problem**:

- The 90 days are **deliberate**: they turn "forgetting to renew" from a once-every-few-years accident into a state you can only survive by automating.
- **Any plan of the form "I will renew it manually before it expires" will fail.** Not because you are careless, but because four times a year for years on end cannot be done by hand: a business trip, a new laptop, a lost notification email - any one small thing makes it expire one day.
- The right mindset is to **turn "will the certificate expire" from something you must remember into something the system handles**, and then **monitor it** (section 12).

### 3.3 Common ACME Clients

certbot (the most complete documentation and the widest plugin set), acme.sh (pure shell, broad DNS API support), lego (a single Go binary), and **web servers with ACME built in** such as Caddy. This article uses certbot.

**Do not run two clients against the same set of domains**: the two renewal jobs will overwrite each other's configuration, and you will spend a long time debugging it.

## 4. certbot in Practice

### 4.1 Installing: Follow the Official Instructions

certbot installation varies a great deal with distribution and version, so **follow the official installation instructions**. There are three common sources: **distribution repositories** (easiest, often an older version), **snap** (often what the official docs recommend, and newer), and **pip / a virtualenv** (flexible, but you manage dependencies). **The nginx plugin needs its own plugin package** (often named something like `python3-certbot-nginx`; the exact name depends on your distribution). Confirm with `certbot --version` afterwards, and note that **subcommands and arguments differ between versions**.

### 4.2 Three Ways to Issue, and When Each Fits

| Command | What it does | Suits | Caveat |
| --- | --- | --- | --- |
| `certbot --nginx -d panel.example.com` | nginx plugin: edits your config, adds the redirect | nginx running, you control the config | **It modifies your nginx configuration**; back it up or keep it in version control first |
| `certbot certonly --standalone -d panel.example.com` | Starts a temporary service on port 80 | A machine with no web server yet | **nginx must be stopped**, or port 80 is already taken and it fails |
| `certbot certonly --webroot -w /var/www/certbot -d panel.example.com` | Writes the challenge file into a directory your existing nginx serves | **The usual choice for a reverse proxy host** | Requires the `.well-known/acme-challenge/` location in nginx |

For a machine running "nginx in front of a panel", **prefer webroot or the nginx plugin**: the first changes your configuration least, the second is the least work. **standalone only fits a host with no web service yet, or one you are willing to take down briefly.** Issuance also asks for **an email address for expiry notices** (skippable, but **strongly recommended**: it is the one thing that may warn you when automatic renewal breaks).

### 4.3 Testing Renewal

**This step is not optional.** It verifies that "if automatic renewal runs 30 days from now, will it succeed":

```bash
# Rehearsal: does not replace the certificate and does not consume production issuance quota (it uses staging)
sudo certbot renew --dry-run

# Show the certificates currently managed, their paths and expiry
sudo certbot certificates
```

**`--dry-run` is the cheapest possible verification. Automatic renewal you have never rehearsed is not automatic renewal.**

:::warn Do not reach for --force-renewal
`--force-renewal` (and similar forcing flags) reissues immediately. **Frequent forced issuance can hit the CA's rate limits, so that when you genuinely need a certificate you cannot get one.** Prefer `--dry-run` when diagnosing; if you really must force it, understand the reason and the limits first (per the CA's official documentation).
:::

### 4.4 Automatic Renewal: systemd Timer or cron

**certbot normally ships its own renewal job, and you do not need to write another one.** It comes in one of two forms: a **systemd timer** (such as `certbot.timer`, the route most distributions and snap installs take) or a **cron job** (such as `/etc/cron.d/certbot`, the older arrangement). All you have to do is **confirm it exists and is running**:

```bash
# systemd route
systemctl list-timers | grep -i certbot

# cron route
ls -l /etc/cron.d/ | grep -i certbot
```

**Writing your own cron entry as well just leaves two jobs fighting each other.** The default behaviour is usually to **check once or twice a day and actually renew only when fewer than about 30 days remain** (the exact threshold and schedule depend on your client and its documentation) - so "it runs every day" does not mean "it issues every day".

### 4.5 Reload the Web Server After Renewal

Renewal only replaces files on disk; **a running nginx does not pick up the new certificate by itself** (it reads certificates at start or reload). So configure a deployment hook:

```bash
# Option 1: pass a deploy hook on the renewal command (example)
sudo certbot renew --deploy-hook "systemctl reload nginx"

# Option 2: drop a script into the hooks directory; it runs after any successful renewal
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Remember to make the hook script executable. **The best way to verify the hook really works is to run `--dry-run` and watch whether nginx reloads** (how `--dry-run` treats hooks can differ between versions; **follow the official documentation**).

## 5. The nginx TLS Configuration

### 5.1 A Complete Example

Below is a **structurally complete** configuration for a machine running "nginx in front of a panel" (domain, port and paths are placeholders):

```nginx
# /etc/nginx/conf.d/panel.conf
# <panel-port> is a placeholder for the local port your panel actually listens on.

server {
    listen 80;
    listen [::]:80;
    server_name panel.example.com;

    # The validation path: keep this consistent with certbot's --webroot directory
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Everything else goes to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name panel.example.com;

    # Issued and renewed by your ACME client; use your real paths
    # Use the symlinks under live/, never the versioned files under archive/
    ssl_certificate     /etc/letsencrypt/live/panel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.example.com/privkey.pem;

    # Modern TLS only; TLS 1.0/1.1 are deprecated by mainstream browsers
    ssl_protocols TLSv1.2 TLSv1.3;
    # Let the client choose the cipher suite (the modern recommendation; TLS 1.3 ignores it anyway)
    ssl_prefer_server_ciphers off;

    # Optional session reuse; whether to enable it and with which values is per the nginx docs
    ssl_session_cache shared:SSL:10m;

    # HTTP/2: a standalone directive from nginx 1.25.1; older versions write listen 443 ssl http2;
    http2 on;

    location / {
        proxy_pass http://127.0.0.1:<panel-port>;

        # The panel console depends on WebSocket, so the Upgrade header must be forwarded
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # The panel uses this to know the outside world is HTTPS, so it builds correct links and cookies
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Always test the syntax before reloading:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 Line by Line (Only the Easy Mistakes)

| Directive | Why |
| --- | --- |
| `listen 443 ssl;` | **The `ssl` parameter is not optional**; without it nginx does not enable TLS on this server block |
| `ssl_certificate` / `ssl_certificate_key` | `fullchain.pem` for the first, `privkey.pem` for the second; the paths **come from your client**, do not copy them |
| `ssl_protocols TLSv1.2 TLSv1.3;` | TLS 1.2 is the modern browser floor; writing it explicitly is clearer than relying on defaults |
| `ssl_prefer_server_ciphers off;` | The modern recommendation lets the client choose; TLS 1.3 cipher suites are unaffected either way |
| The `.well-known/acme-challenge/` location | Where HTTP-01 validation lands; with `--webroot` it **must** match the `-w` directory |
| `location / { return 301 ...; }` | The HTTP-to-HTTPS redirect; it goes **after** the challenge location (nginx prefers the more specific prefix) |
| `X-Forwarded-Proto` | Without it a panel may generate `http://` links or refuse to set secure cookies |
| `http2 on;` | **Version dependent**: the standalone directive exists from nginx 1.25.1 |

:::tip Why the certificate path uses live/
ACME clients usually keep the real files for each issuance in something like an `archive/` directory (with a serial number) and create **symlinks** under `live/` pointing at the newest one. **Reference the paths under `live/`**: they follow the renewal automatically, whereas the exact filenames under `archive/` change every time.
:::

### 5.3 Cipher Suites and "the Defaults Are Usually Fine"

TLS configuration snippets circulating online often carry a long `ssl_ciphers` line. **In most cases you do not need it**:

- **nginx's own defaults are usually safe on modern versions**, and they are updated with the version.
- Copying a cipher list from a few years ago **can exclude the newer, better suites**.
- When you do need fine control, take it from a long-maintained source such as Mozilla's SSL configuration generator, **not from a random blog post**.

:::note The current state of OCSP stapling
Historically it was common to recommend `ssl_stapling on;` with `ssl_stapling_verify on;` (plus `ssl_trusted_certificate`). **However, Let's Encrypt has announced that it is ending OCSP support in favour of CRLs**, so configuring OCSP stapling for LE certificates no longer serves a purpose. **For the exact timeline and current state, follow Let's Encrypt's official announcements** rather than old tutorials.
:::

## 6. Validation: HTTP-01 and DNS-01

ACME has to prove that you control the domain. Two methods dominate:

| | HTTP-01 | DNS-01 |
| --- | --- | --- |
| How it proves control | Put a file with specified content at `http://domain/.well-known/acme-challenge/<token>` | Add a TXT record with specified content at `_acme-challenge.domain` |
| Network requirement | **Port 80 must be reachable from the internet** (redirects may be followed) | No inbound port needed at all |
| Wildcards | **No** | **Yes** |
| Automation difficulty | Low (webroot or the nginx plugin) | Needs DNS provider API credentials |
| Main risk | Port 80 blocked by a firewall or security group, intercepted by a CDN, or a broken redirect | **Leaked API credentials equal leaked control of the domain** |

### 6.1 Common HTTP-01 Failures

**The cloud security group does not allow port 80** (most common: the host firewall is open but the cloud security group is not); **port 80 is already in use** (nginx still running during `--standalone`); **a redirect swallows the validation request** (the challenge location must come before the redirect, or the redirect must let `/.well-known/` through); **a CDN or reverse proxy sits in front** (the request never reaches your origin; handle it per the CDN's documentation).

### 6.2 DNS-01 Caveats

The record name is usually `_acme-challenge` (**check your DNS provider's and client's documentation**); **DNS propagation takes time**, so do not click validate immediately after adding a manual record; **scope API credentials to the minimum**, granting only the records that need changing rather than an account-wide key; and when credentials live on the server, **tighten their permissions** and keep them out of Git.

### 6.3 When DNS-01 Is Required

- You need a **wildcard certificate**.
- **Port 80 cannot be exposed** (blocked by the ISP, behind CGNAT, restricted corporate network).
- The domain **does not point directly at this machine** (a CDN, load balancer or multiple origins in front).
- You want **issuance to be entirely independent of the web server** (for example, a certificate for a non-HTTP service).

## 7. Wildcard Certificates

A wildcard certificate covers one level of subdomains, at the cost of **requiring DNS-01**:

```bash
# Note: *.example.com does not include example.com itself, so usually list both
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

Key points:

- **`*.example.com` does not match `example.com`**, nor `a.b.example.com` (a wildcard covers a single level). Add the ones you need to `-d`.
- A wildcard is **convenient but widens the blast radius**: if the private key leaks, every subdomain is affected at once.
- `--manual` means **renewal is manual too** - unless you replace it with a DNS API plugin. **Manual wildcard plus a forgotten renewal is a very common combination.**
- If you only have a handful of subdomains, **issuing them individually (with automatic HTTP-01 renewal) is often less trouble than one wildcard**.

## 8. What Happens After a Missed Renewal

### 8.1 Symptoms

| Symptom | Cause |
| --- | --- |
| The browser blocks the whole page, warning about an expired/insecure certificate | The certificate has expired |
| The panel cannot be logged into, or every API client errors out | Same; some clients give you no "continue anyway" option |
| The web map will not load | Its static assets are served over HTTPS |
| "It worked yesterday, it broke this morning" | Expiry happens **instantly**; there is no gradual decline |

### 8.2 How to Check

```bash
# Who issued this certificate and when does it expire? (-servername is required, or you may see another site's certificate)
echo | openssl s_client -connect panel.example.com:443 -servername panel.example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# To see the full chain (including intermediates)
openssl s_client -connect panel.example.com:443 -servername panel.example.com -showcerts </dev/null
```

In the output, look at two dates: **`notBefore` and `notAfter`**. If `notAfter` is already in the past, the problem is confirmed.

**Also check the expiry of the local file** (you may have been looking at a certificate on a CDN rather than your origin's):

```bash
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -subject -dates
sudo certbot certificates
```

:::warn Restarting the service does nothing
After expiry, **restarting nginx does not make the certificate new**. The correct order is: **make the renewal succeed first** (`sudo certbot renew`, and fix whatever it reports), **then reload nginx**. Doing it the other way round just wastes time.
:::

### 8.3 HSTS Makes It Worse

If you enabled HSTS (the `Strict-Transport-Security` response header), browsers **force HTTPS for a period and do not let the user click through**, so an expired certificate becomes an error you **cannot bypass at all**. HSTS is a good thing (it prevents downgrade attacks), but remember its price: **it turns "the certificate should always be valid" from a preference into a hard requirement.** Confirm that automatic renewal and monitoring are in place before enabling it.

## 9. Certificate Files and Permissions

The private key is the only thing in this system that genuinely has to stay secret:

```bash
# Only the owner may read the private key; tighten the directories too
sudo chmod 700 /etc/letsencrypt/archive /etc/letsencrypt/live
sudo chmod 600 /etc/letsencrypt/archive/<domain>/privkey*.pem
sudo chown root:root /etc/letsencrypt/archive/<domain>/privkey*.pem

# Sanity check: nothing should be group- or world-readable
ls -l /etc/letsencrypt/live/<domain>/
```

Points to remember:

- **`chmod 600` with root as the owner** is the common, safe arrangement. ACME clients usually set sensible permissions themselves, so **look before you change anything**.
- **Never copy the private key into a web root, a temporary directory, a chat tool or a Git repository.** If another service needs it, use a group or an ACL rather than `chmod 644`.
- nginx's **master process normally starts as root**, so it can read a root-owned private key; **if your deployment differs (containers, non-root), make sure the user reading the certificate has access**, otherwise the symptom is "the configuration is right but the service will not start".
- **`chmod -R 777 /etc/letsencrypt` is simply wrong**: it fixes the permission error and hands the private key to every user on the machine.
- **Include certificates in your backup planning**, and **keep the private key inside those backups encrypted** (see [Offsite Backup](/tutorials/ops/offsite-backup)).

## 10. Reverse Proxy Chains

When nginx terminates HTTPS and forwards the request to the panel, **"the protocol" becomes two different things along the chain**:

```text
player's browser  --HTTPS-->  nginx (terminates TLS)  --HTTP(127.0.0.1)-->  panel
```

Three common consequences:

| Problem | Symptom | Fix |
| --- | --- | --- |
| The panel generates `http://` links | Resources or redirects get blocked by the browser | Forward `X-Forwarded-Proto $scheme` and configure the "external URL / trusted proxy" settings per the panel's documentation |
| The panel thinks the connection is insecure and refuses to set cookies | You are logged out immediately after logging in | Same as above; some panels need HTTPS declared explicitly |
| WebSocket will not connect | The console stays blank or spins forever | Forward the `Upgrade` and `Connection` headers and set `proxy_http_version 1.1` |

**If a CDN sits in front** (Cloudflare and similar), the chain becomes "browser -> CDN (TLS terminates) -> origin (another TLS leg)", and **each end needs its own certificate and configuration**; **whether the origin certificate is verified, and in which mode, is the CDN provider's behaviour - follow its documentation.** In such chains, the `-servername` check from section 8 is the fastest way to establish whose certificate expired.

For the full panel-side configuration see [Using and Securing Management Panels](/tutorials/ops/panels).

## 11. Self-Signed Certificates: When They Are Acceptable

A self-signed certificate (you act as your own CA) is **not "free HTTPS"**. Its proper place is:

| Scenario | Acceptable? |
| --- | --- |
| Only you, on an internal network (the LAN case in [Hosting on a Home PC](/tutorials/ops/home-hosting)), and you can install your own CA into your own devices' trust stores | **Yes** |
| Temporary testing before a domain is bound | **Yes**, but be clear it will be replaced |
| Public-facing, for players or co-admins | **No**: everyone will see a browser warning |
| For API clients, bots or plugins | **Usually not**: many clients reject untrusted certificates by default, and **disabling verification is a worse choice** |

Realities you must accept:

- **The browser warning cannot be "configured away"**: the user sees "your connection is not private" and must click through Advanced. **That trains users to ignore warnings, which is itself a security problem.**
- To avoid the warning you **must import your CA into every client device**. Past a handful of devices, that maintenance costs more than a free certificate.
- If an internal CA is genuinely needed, tools built for it such as **mkcert** or **step-ca** are far less error-prone than hand-writing `openssl req` (**follow their official documentation**).
- **Never** enable HSTS on a site using a self-signed certificate.

## 12. Monitoring and Checklist

**Certificate expiry is a failure you can see coming**, so it should be monitored rather than hoped about. The minimum requirement: **alert when fewer than 14 days remain.** Do both of these:

1. **External HTTPS checks**: have monitoring on a different machine request the panel URL every few minutes and inspect the certificate expiry. Many tools (Uptime Kuma, for example) display certificate information in their HTTPS monitor. See [Monitoring and Alerting](/tutorials/ops/monitoring).
2. **Local expiry checks**: read the certificate file on the server, compute the remaining days, and publish it as a metric or a notification.

```bash
# One-liner: print the days remaining (date -d is the GNU form; use your system's date command otherwise)
sudo openssl x509 -in /etc/letsencrypt/live/panel.example.com/fullchain.pem -noout -enddate \
  | cut -d= -f2 \
  | xargs -I{} date -d "{}" +%s \
  | awk -v now="$(date +%s)" '{ printf "%d days remaining\n", ($1 - now) / 86400 }'
```

:::tip The alert must also catch "renewal did not succeed"
Watching only "how many days are left" is not enough - **it will warn you 30 days out, and you will learn to ignore it**. A better combination is **an alert on renewal job failure** (the timer or cron failure notification) **plus** a "fewer than 14 days remaining" alert. The first tells you "automatic renewal is broken"; the second is the last line of defence.
:::

### 12.1 Go-Live Checklist

| Check | How | Pass condition |
| --- | --- | --- |
| Certificate issued | `certbot certificates` | Correct domain, expiry in the future |
| Full chain in use | Inspect `ssl_certificate` in nginx | Points at `fullchain.pem`, not a bare `cert.pem` |
| Protocol versions correct | A browser, or `openssl s_client` | Negotiates TLS 1.2 / 1.3 |
| HTTP redirects to HTTPS | Visit the `http://` URL once | 301/308, with no mixed-content warnings |
| Validation path works | `curl -I http://domain/.well-known/acme-challenge/<test file>` | Returns 200 (not swallowed by the redirect) |
| Renewal job present | `systemctl list-timers` or `/etc/cron.d/` | Exactly one renewal job |
| Renewal rehearsal passes | `certbot renew --dry-run` | No errors |
| Reload happens after renewal | Inspect the deploy hook | nginx really reloads after a successful renewal |
| Private key locked down and not copied elsewhere | `ls -l` + `stat`, plus a search of the disk and Git history | Not readable by others; the key exists only in the certificate directory and its encrypted backup |
| Expiry alert configured | The monitoring dashboard | Deliberately widen the threshold once and confirm the alert fires |
| The panel and map actually work | Visit once in a browser | Login, console and map all work with no certificate warning |

## Next Steps

- Panel-side security and reverse proxying: [Using and Securing Management Panels](/tutorials/ops/panels)
- Expiry alerting and the monitoring system: [Monitoring and Alerting](/tutorials/ops/monitoring)
- Hardening the host: [System Hardening](/tutorials/ops/system-security)
- Publishing to the internet and ports: [Deploying to a Reachable Environment](/tutorials/java/deploy)
- What to do with certificates when you move machines: [Server Migration](/tutorials/ops/server-migration)
- Backups and recovery (including the certificate directory): [Offsite Backup](/tutorials/ops/offsite-backup)

---

> Prices, plans and the configuration of each piece of software are governed by the provider and by the official documentation.
