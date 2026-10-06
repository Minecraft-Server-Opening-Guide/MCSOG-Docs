---
title: Plugin Configuration Basics
slug: plugin-config
cat: java
level: 2
order: 18
minutes: 12
mc: ["1.21.x", "1.20.4", "1.18.2"]
tags: [java, configuration, yaml, color codes, encoding]
updated: 2026-10-04
draft: false
---

Dropping a plugin into `plugins/` only finishes the installation. What actually decides whether your server feels polished is the pile of `config.yml` files that comes next. Change them correctly and you get features; get one space wrong and an entire section silently fails to load.

This article covers three things: **how to write YAML, how colour codes work, and how to keep file encoding from turning your text into garbage**, followed by a repeatable workflow for editing configuration.

## 1. Where Plugin Configuration Lives

Almost every plugin keeps its files under `plugins/<plugin-name>/`. The usual categories:

| File / directory | Purpose |
| --- | --- |
| `config.yml` | The main configuration; nearly every plugin has one |
| `messages.yml`, `lang/` | User-facing text; editing these changes wording or localisation |
| `menus/`, `kits.yml` and similar | Module-specific configuration generated at startup |
| `data/`, `playerdata/`, `*.db` | Runtime data maintained by the plugin itself |

:::warn Do not hand-edit data files
`data/`, `playerdata/` and `*.db` are written by the plugin while it runs. Editing them by hand is overwritten at best and corrupts player data at worst. Change configuration, not data.
:::

## 2. Three Iron Rules of YAML

Nine out of ten "the config will not load" cases come down to these three.

### Indent with spaces, never tabs

YAML explicitly forbids tabs as indentation. The trouble is that a tab looks identical to a few spaces on screen:

```yaml
# Correct: spaces
options:
    enable: true

# Wrong: this line starts with a tab
options:
	enable: true
```

Most editors render a tab as an arrow or a dotted line, and VS Code shows the indentation mode in the bottom-right corner. **If a file already mixes tabs in, do not delete them one by one** — use the editor's "convert indentation to spaces" command.

### Always put a space after the colon

```yaml
enabled: true      # Correct: one space after the colon
enabled:true       # Wrong: the whole line becomes a string
```

`key:value` is not a key-value pair in YAML; it is a plain string. The plugin never sees a key called `enabled`, falls back to the default, and the symptom is usually "I changed it but nothing happened".

### Entries at the same level must be indented identically

```yaml
options:
    enable: true
    check: false
    drop-block: true
    other:
        money: 10
        welcome: "Welcome"
guide:
    show: true
```

`options` and `guide` sit at the same level; `enable`, `check`, `drop-block` and `other` sit at the next one; `money` is one level deeper again. Within a single level, **duplicate keys are not allowed**:

```yaml
options:
  enable: true
  enable: false     # Wrong: duplicate key at the same level
  check: false
```

An editor with YAML support will flag this in red. Even if it does not, the plugin will report an error when it reads the file.

## 3. Mappings, Lists and Nesting

YAML has only two building blocks: **key-value mappings** and **lists**. Everything else is those two nested inside each other.

### Mappings

```yaml
options:
  enable: true
  check: false
  money: 10
```

The inline form is handy for short entries:

```yaml
options: {enable: true, check: false}
```

### Lists

Lines starting with `-` form a list, ordered as written:

```yaml
worlds:
  - world
  - world_nether
  - world_the_end
```

Inline form:

```yaml
worlds: [world, world_nether, world_the_end]
```

### Lists of mappings

This is the structure that trips people up most often in plugin configuration. **The first key of an item follows the dash, and the item's other keys line up with it**:

```yaml
kits:
  - name: starter
    price: 0
    items:
      - STONE_SWORD
      - BREAD
  - name: vip
    price: 500
    items:
      - DIAMOND_SWORD
```

Here `name`, `price` and `items` are the three keys of one item and must be aligned, while `- STONE_SWORD` is one level deeper again, under `items`.

### Value types

The value types you meet in plugin configuration, and how to write them:

```yaml
boolean: true          # true / false, case-insensitive
integer: 10
float: 3.14
text: "hello"          # quote values containing special characters
null_value: ~          # ~ means null
```

:::tip When quoting is mandatory
If a value contains `: `, `#`, `{`, `}`, `[`, `]`, `&`, `*`, `!`, `|` or `>`, or begins with one of them, wrap it in single or double quotes. Text with colour codes such as `&aHello` is safest written as `"&aHello"` so it cannot be misparsed.
:::

## 4. Common YAML Errors and What Causes Them

| Symptom | Actual cause | Fix |
| --- | --- | --- |
| Plugin fails to start with `while parsing` or `mapping values are not allowed here` | Missing space after a colon, or an unquoted `: ` inside a value | Add the space, or quote the value |
| `found character '\t' that cannot start any token` | A tab is used for indentation | Convert indentation to spaces |
| `duplicate key` | The same key appears twice at one level | Delete the extra entry |
| A change has no effect at all | Misspelled key, wrong nesting level, or the plugin does not read that file | Compare against the plugin's default configuration |
| Only one list item misbehaves | Keys inside that item are not aligned | Align the keys of the same item |
| The whole file fails, error on the first line | The file has a BOM, or is not UTF-8 | Save as UTF-8 without BOM |
| `expected <block end>` | A line is over- or under-indented | Walk the indentation levels one by one |

:::tip Let the editor check for you
The YAML extension for VS Code, or simply opening a `.yml` in Notepad++, highlights indentation and syntax problems live. **Look for the red squiggle before you save** — it is far faster than digging through logs afterwards.
:::

## 5. Colour and Formatting Codes

Server-side text (MOTD, chat, plugin messages, menu labels) is coloured with **formatting codes**. Vanilla uses the section sign `§`, but most plugins let you write `&` in configuration files and convert it themselves.

### Colours

```
&0 Black        &1 Dark Blue    &2 Dark Green   &3 Dark Aqua
&4 Dark Red     &5 Dark Purple  &6 Gold         &7 Gray
&8 Dark Gray    &9 Blue         &a Green        &b Aqua
&c Red          &d Light Purple &e Yellow       &f White
```

### Formats

```
&l Bold          &o Italic        &n Underline     &m Strikethrough
&k Obfuscated    &r Reset
```

Combine them freely:

```yaml
prefix: "&8[&aServer&8] &r"
message: "&aWelcome back, &e%player_name%&a!"
warning: "&c&lWARNING&r &7Do not build here"
```

`&r` only clears formatting **after** it, so place it wherever the text should return to default styling.

### Limitations to keep in mind

- **`&` is not universal**: it only works where the plugin converts it. A few places — the vanilla `motd` in `server.properties`, some vanilla commands — accept only a real `§` and will show `&` literally.
- **Only 16 colours**: `&` codes are a legacy mechanism with no true colour. Gradients and exact hex values need MiniMessage, described below.
- **You cannot type `§` directly**: normal clients cannot enter the symbol. Hold `Alt` and type `167` on the numeric keypad, or simply copy and paste it.
- **Which codes are supported is up to the plugin**: the same `&l` may work in a menu title in one plugin and be ignored elsewhere.

### MiniMessage (background knowledge)

MiniMessage, built on the Adventure library, describes styling with tags and supports true colour, gradients, hover text and click events:

```xml
<yellow>Hello <blue><bold>World</bold></blue>!</yellow>
<gradient:#f6d365:#fda085>Gradient text</gradient>
<rainbow>Rainbow text</rainbow>
```

Note that **native platform support does not mean plugin support**. Paper and its derivatives ship Adventure, so plugins built for Paper usually accept MiniMessage; plugins built against Bukkit (EssentialsX, for example) do not, unless they bundle the library themselves (as PlaceholderAPI does).

:::note Do not assume it works
Seeing someone else use MiniMessage successfully does not mean your plugin understands it. Check the plugin's documentation first and confirm whether it accepts `&` codes, MiniMessage tags, or both.
:::

## 6. File Encoding and Garbled Text

If non-ASCII text turns into `???`, `Ã¦Â¬Â¢`, or a row of unrelated characters, the problem is almost always **encoding**, not a lack of language support.

| Symptom | Cause |
| --- | --- |
| Text becomes question marks or boxes | The file was saved as ANSI/GBK while the server reads UTF-8 |
| Text becomes a string of odd symbols | The file is UTF-8 but is being read as GBK, or the reverse |
| The first key cannot be read | The file starts with a BOM, and the parser treats it as part of the key name |

How to fix it:

1. Open the file in an editor such as VS Code or Notepad++.
2. Save it as **UTF-8** (in VS Code, pick `Save with Encoding` from the encoding menu in the status bar).
3. Make sure it has no BOM. Older versions of Windows Notepad default to "UTF-8 with BOM", which is the single most common trap here.
4. Reload the plugin and check both the console and the in-game text.

:::warn A quick save in Notepad is a risky operation
Opening a `.yml` in Windows Notepad and hitting Ctrl+S can turn a perfectly good UTF-8 file into ANSI. **Start with an editor that shows YAML syntax and the current encoding**, and always back up before editing.
:::

## 7. Editing Configuration Safely

Follow this order and far fewer things will break.

1. **Back up first.** Copy `config.yml` to `config.yml.bak` so you can restore it the moment something goes wrong.
2. **Edit while the server is stopped or quiet.** Some plugins write their in-memory state back to disk on shutdown, so changes made while running can be overwritten.
3. **Use an editor with YAML support**, keep the existing comments and structure, and do not reformat the whole file on a whim.
4. **Change one thing at a time** and verify it immediately. Twenty edits at once means you will not know which one broke it.
5. **Reload the configuration.** Prefer the plugin's own command:

| Method | Description |
| --- | --- |
| `/<plugin-name> reload` | Supported by most plugins and **preferred** (for example `/tab reload`, `/papi reload`) |
| Restart the server | The safest option, and the only one for plugins without hot reloading |
| `/reload` (vanilla command) | **Not recommended**; it easily leaves plugins in an inconsistent state |

6. **Watch the console and `logs/latest.log`.** A parse failure normally prints the file name and line number at load time, which usually points straight at the problem.
7. **Test on a test server if you are unsure.** Editing configuration is safer than installing plugins, but it can still affect saves and player data.

:::tip How to use the reported line number
When the log says something like `config.yml: 42`, **do not stare only at line 42**. YAML parse errors are frequently caused by an indentation or unclosed quote on the previous line, so read two or three lines above as well.
:::

## 8. Quick Reference

| Problem | Check first |
| --- | --- |
| Configuration had no effect | Key spelling, nesting level, whether you reloaded |
| Parse error on startup | Space after colon, tab indentation, duplicate keys |
| Garbled text | Whether the file is UTF-8 without BOM |
| Colour codes shown literally | Whether that spot accepts `&`, or needs MiniMessage tags |
| Changes keep reverting | Whether the plugin rewrites the file on shutdown |

## Next Step

Where do variables such as `%player_name%` come from? See [Common Dependency Plugins](/tutorials/java/plugin-deps). If you have not installed any plugins yet, start with [Getting Started with Plugins](/tutorials/java/plugins); the server's own configuration is covered in [Configuring the Server](/tutorials/java/config).

---

> Parts of this article reference [NitWikit (Cubic Wiki)](https://nitwikit.8aka.org/) and [its GitHub repository](https://github.com/Cubic-Project/NitWikit), rewritten to fit this site's structure; where it differs from upstream, upstream prevails.
