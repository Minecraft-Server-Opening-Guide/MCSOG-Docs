# MCSOG-Docs

[中文](#中文) | [English](#english)

---

## 中文

MCSOG 开服教程站的**公开文档仓库**，用于接收社区贡献。

线上站点：<https://mcsog.ndpreforged.com>

### 仓库结构

```
MCSOG-Docs/
├── README.md              本文件
└── docs/
    ├── zh/                简体中文文档（内容源文）
    │   ├── tutorials/     开服教程正文
    │   │   ├── java/      Java 版开服
    │   │   ├── bedrock/   基岩版开服
    │   │   ├── ops/       运维与安全
    │   │   └── faq/       常见问题
    │   ├── wiki/          版本百科（版本时间线、核心对比、指令等）
    │   ├── news/          更新公告
    │   └── help/          帮助页（隐私政策、服务条款等）
    ├── en/                英文文档（目录结构与 zh 一一对应）
    │   ├── tutorials/
    │   ├── wiki/
    │   ├── news/
    │   └── help/
```

### 路径约定

| 路径 | 内容 |
| --- | --- |
| `docs/zh/tutorials/<分类>/<slug>.md` | 中文教程正文，分类为 `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<分类>/<slug>.md` | 英文教程正文，路径与中文**一一对应** |
| `docs/zh/wiki/<名称>.md` | 中文百科条目 |
| `docs/zh/news/<名称>.md` | 中文更新公告 |
| `docs/zh/help/<名称>.md` | 中文帮助页 |

### 写作规范

- 使用 **Markdown**；文件编码 UTF-8 无 BOM；换行用 **LF**；结尾保留**一个**换行
- 标题层级从 `##` 开始（`#` 留给页面标题）；小节锚点由站点自动生成，格式为 `mcsog-h-<标题>`
- 站内链接写**绝对路径**（例如 `/wiki/compare`）；需要定位到小节时带锚点
  （例如 `/wiki/compare#mcsog-h-基岩版核心对比`）
- 中英文**同步维护**：改动 `docs/zh/...` 时请尽量同步修改 `docs/en/...`
- 版本号、命令、下载地址必须以**官方来源**为准，并给出可核对的链接
- 引用第三方内容请注明来源与许可证

### 贡献流程

1. Fork 本仓库
2. 新建分支，修改 `docs/zh/**` 或 `docs/en/**`
3. 提交 Pull Request，说明**改了什么**与**为什么改**
4. 维护者合并进 `main` 后自动生效：
   - **30 分钟内**同步进主仓库
   - **2 小时内**部署到线上站点


### 许可证

文档内容采用 **CC BY-SA 4.0**，其中的代码示例采用 **MIT**。

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
    │   ├── news/          release notes
    │   └── help/          help pages (privacy policy, terms of service)
    ├── en/                English (mirrors the zh tree one to one)
    │   ├── tutorials/
    │   ├── wiki/
    │   ├── news/
    │   └── help/
```

### Path conventions

| Path | Content |
| --- | --- |
| `docs/zh/tutorials/<category>/<slug>.md` | Chinese tutorial, category is `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<category>/<slug>.md` | English tutorial, mirrors the Chinese path exactly |
| `docs/zh/wiki/<name>.md` | Chinese wiki entry |
| `docs/zh/news/<name>.md` | Chinese release note |
| `docs/zh/help/<name>.md` | Chinese help page |

### Writing rules

- **Markdown**; UTF-8 without BOM; **LF** line endings; exactly **one** trailing newline
- Start headings at `##` (`#` is reserved for the page title); section anchors are generated
  by the site as `mcsog-h-<heading>`
- Use **absolute** internal links (for example `/wiki/compare`); add an anchor to target a
  section (for example `/wiki/compare#mcsog-h-基岩版核心对比`)
- Keep Chinese and English **in sync**: when you edit `docs/zh/...`, update `docs/en/...` too
- Version numbers, commands and download URLs must match **official sources**, with a link to check
- When quoting third-party material, credit the source and its licence

### Contributing

1. Fork this repository
2. Create a branch and edit `docs/zh/**` or `docs/en/**`
3. Open a pull request explaining **what** changed and **why**
4. After the maintainers merge it into `main`, it takes effect automatically:
   - synced into the main repository **within 30 minutes**
   - deployed to the live site **within 2 hours**


### Licence

Documentation is licensed under **CC BY-SA 4.0**; code samples are under **MIT**.
