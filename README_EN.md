# MCSOG-Docs

[中文](./README.md) | English

---

## English

The **public documentation repository** for the MCSOG Minecraft server-hosting guide. Community contributions are welcome.

Live site: <https://mcsog.ndpreforged.com>

### Repository layout

```
MCSOG-Docs/
├── README.md              this file
└── docs/
    ├── zh/                Simplified Chinese (source of truth)
    │   ├── tutorials/     tutorials
    │   │   ├── java/      Java Edition
    │   │   ├── bedrock/   Bedrock Edition
    │   │   ├── ops/       operations and security
    │   │   └── faq/       frequently asked questions
    │   ├── wiki/          wiki (version timeline, core comparison, commands)
    └── en/                English (mirrors the zh tree one to one)
        ├── tutorials/
        └── wiki/
```

### Path conventions

| Path | Content |
| --- | --- |
| `docs/zh/tutorials/<category>/<slug>.md` | Chinese tutorial, category is `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<category>/<slug>.md` | English tutorial, mirrors the Chinese path exactly |
| `docs/zh/wiki/<name>.md` | Chinese wiki entry |

### Writing rules

- **Markdown**; UTF-8 without BOM; **LF** line endings; exactly **one** trailing newline
- Start headings at `##` (`#` is reserved for the page title); section anchors are generated
  by the site as `mcsog-h-<heading>`
- Use **absolute** internal links (for example `/wiki/compare`); add an anchor to target a
  section (for example `/wiki/compare#mcsog-h-基岩版核心对比`)
- Keep Chinese and English **in sync**: when you edit `docs/zh/...`, update `docs/en/...` too
- Version numbers, commands and download URLs must match **official sources**, with a link to check
- When quoting third-party material, credit the source and its licence

### Content extensions

Besides standard Markdown, the site supports four custom blocks for steps and callouts. They are rendered as styled components:

| Syntax | Purpose |
| --- | --- |
| `:::step Title` ... `:::` | Step block. Consecutive blocks merge into a numbered step list |
| `:::note` ... `:::` | Note box, for side notes |
| `:::warn` ... `:::` | Warning box, for common pitfalls |
| `:::danger` ... `:::` | Danger box, for irreversible operations |

Example:

````markdown
:::step Install the runtime
Run `apt install openjdk-21-jre-headless`.
:::

:::step Start the service
Put the jar in `/opt/mc` and run the start script.
:::

:::warn
Do not run the server as root.
:::
````

Everything else is standard Markdown: headings (which build the table of contents), lists, tables, task lists, inline code and fenced code blocks with a language tag.

### HTML embed extension

`html.()` embeds raw HTML in Markdown while keeping HTML/JS execution. Content is isolated in Shadow DOM by default so its CSS cannot affect the site layout, spacing, or colors.

Full example:

```text
html.csp=[example.com,*.example.org].L=640.H=360.(<div>...</div>)
```

Parameters:

- `csp=[...]`: allowed domains, with `*.example.com` wildcard support. When present, content runs in an isolated iframe with a CSP; otherwise Shadow DOM is used.
- `L` / `H`: width / height in px. Both must be present; a single value is ignored and the size becomes automatic.
- Parameter names are case-insensitive.
- JavaScript inside `html.()` runs; only embed trusted content

### Sync rules

This repository and the main repository sync both ways every 30 minutes:

| Case | Result |
| --- | --- |
| Only one side changed a file | The change is copied to the other side |
| **Both sides changed the same file** | Treated as a conflict. Neither side is overwritten; the other version is stored in `docs/_conflicts/` in the main repository for an administrator to resolve |
| A file was added on one side | Copied to the other side |
| A file was deleted on one side | Deleted on the other side too (a copy is kept in `docs/_deleted/` first) |
| `docs/ad/`, `help/`, `news/` | **Not synced** |

So changes you make here reach the live site, and files you delete are really deleted.
If the main repository changed the same file at the same time, an administrator gets a conflict record in the site and resolves it; nothing is silently lost.

### Contributing

1. Fork this repository
2. Create a branch and edit `docs/zh/**` or `docs/en/**`
3. Open a pull request explaining **what** changed and **why**
4. After the maintainers merge it into `main`, it takes effect automatically:
   - synced into the main repository **within 30 minutes**
   - deployed to the live site **within 2 hours**

### Licence

Documentation is licensed under **CC BY-SA 4.0**; code samples are under **MIT**.
