# MCSOG-Docs

[中文](./README.md) | English

---

## English

The **public documentation repository** for the MCSOG Minecraft server-hosting guide. Community contributions are welcome.

*Online sites pull from the repository every 10 minutes.

Live site: <https://mcsog.ndpreforged.com>

### Repository layout

```
MCSOG-Docs/
├── README.md              this file
├── README_EN.md           English README
├── docslist.json          page manifest (required for new pages)
└── docs/
    ├── zh/                Simplified Chinese (source of truth)
    │   ├── tutorials/     tutorials
    │   │   ├── java/      Java Edition
    │   │   ├── bedrock/   Bedrock Edition
    │   │   ├── ops/       operations and security
    │   │   └── faq/       frequently asked questions
    │   ├── wiki/          wiki (version timeline, core comparison, commands)
    │   ├── help/          help and policies
    ├── en/                English (mirrors the zh tree one to one)
    ├── zh-TW/             Traditional Chinese
    ├── ja-JP/             Japanese
    ├── ru-RU/             Russian
    ├── ar/                Arabic
    └── vi/                Vietnamese
```

All locales other than `zh` use the same `tutorials/`, `wiki/`, and `help/` layout as `zh`.

### docslist.json structure

`docslist.json` manages tutorial content only. Its top level contains only `nav` and `docs`; the old `type → category → language` manifest format is no longer supported.

- `nav`: tutorial navigation entries matching the site sidebar (Overview, Java Server, Bedrock Server, Ops & Security, FAQ)
- `docs`: tutorial document index with exactly four categories: `java`, `be`, `ops`, `faq` (`be` maps to the on-disk `bedrock` directory)

```json
{
  "nav": [
    {
      "key": "tutorials",
      "icon": "book-open",
      "path": "/tutorials",
      "label": { "zh": "教程总览", "en": "Overview" },
      "sub": { "zh": "OVERVIEW", "en": "OVERVIEW" }
    }
  ],
  "docs": {
    "java": {
      "en": [
        {
          "path": "/en/tutorials/java/example",
          "title": "Example tutorial",
          "slug": "example",
          "cat": "java",
          "updated": "2026-11-03",
          "level": 1,
          "minute": 10,
          "order": 1
        }
      ]
    }
  }
}
```

Every document entry requires `path`, `slug`, `title`, `cat`, `updated`, `level`, `minute`, and `order`; optional fields include `mc`, `tags`, and `draft`. Entries are ordered by ascending `order`.

Add, delete, or rename a tutorial together with its `docslist.json` entry. The site reads this file; `help`, `wiki`, and `news` are loaded by filesystem scan and are not written here. Legacy full-manifest format is no longer supported.

The site syncs documents and `docslist.json` from this repository every 10 minutes. If both the private repository and the public repository changed `docslist.json`, the local version is kept and the conflict is handed to the site's built-in conflict manager instead of being silently overwritten.

### Path conventions

| Path | Content |
| --- | --- |
| `docs/zh/tutorials/<category>/<slug>.md` | Chinese tutorial, category is `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<category>/<slug>.md` | English tutorial, mirrors the Chinese path exactly |
| `docs/zh/wiki/<name>.md` | Chinese wiki entry |
| `docs/<locale>/...` | Same tree for `en` / `zh-TW` / `ja-JP` / `ru-RU` / `ar` / `vi` |

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

This repository is the public source. The private main repository receives it one way:

```text
MCSOG-Docs/docs + docslist.json
        ↓ every 10 minutes
private main repository docs/ + docslist.json
        ↓
site release
```

- Added/modified/deleted public documents are mirrored into the private repository.
- `docs/*/news/` is not maintained here and is never deleted from the private repository by this mirror.
- `docs/ad/` is not synced.
- Destructive mirrors are guarded: more than five deletions abort the sync.
### Contributing

1. Fork this repository
2. Create a branch and edit `docs/<locale>/**` (`zh` / `en` / `zh-TW` / `ja-JP` / `ru-RU` / `ar` / `vi`)
3. Open a pull request explaining **what** changed and **why**
4. After the maintainers merge it into `main`, it takes effect automatically:
   - synced into the main repository **within 10 minutes**
   - deployed to the live site **within 2 hours**

### Licence

Documentation is licensed under **CC BY-SA 4.0**; code samples are under **MIT**.
