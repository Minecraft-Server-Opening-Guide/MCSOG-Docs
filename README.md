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
    └── en/                英文文档（目录结构与 zh 一一对应）
        ├── tutorials/
        └── wiki/
```

### 路径约定

| 路径 | 内容 |
| --- | --- |
| `docs/zh/tutorials/<分类>/<slug>.md` | 中文教程正文，分类为 `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<分类>/<slug>.md` | 英文教程正文，路径与中文**一一对应** |
| `docs/zh/wiki/<名称>.md` | 中文百科条目 |

### 写作规范

- 使用 **Markdown**；文件编码 UTF-8 无 BOM；换行用 **LF**；结尾保留**一个**换行
- 标题层级从 `##` 开始（`#` 留给页面标题）；小节锚点由站点自动生成，格式为 `mcsog-h-<标题>`
- 站内链接写**绝对路径**（例如 `/wiki/compare`）；需要定位到小节时带锚点
  （例如 `/wiki/compare#mcsog-h-基岩版核心对比`）
- 中英文**同步维护**：改动 `docs/zh/...` 时请尽量同步修改 `docs/en/...`
- 版本号、命令、下载地址必须以**官方来源**为准，并给出可核对的链接
- 引用第三方内容请注明来源与许可证

### 正文扩展语法

除了标准 Markdown，本站还支持四种自定义块，用于排版步骤与提示。它们在渲染时会转成带样式的组件：

| 语法 | 作用 |
| --- | --- |
| `:::step 标题` … `:::` | 步骤块。连续多个会自动合并成带序号的步骤条 |
| `:::note` … `:::` | 提示框，适合补充说明 |
| `:::warn` … `:::` | 警告框，适合容易踩坑的地方 |
| `:::danger` … `:::` | 危险框，适合不可逆操作（删库、覆盖配置等） |

写法示例：

````markdown
:::step 安装依赖
运行 `apt install openjdk-21-jre-headless`。
:::

:::step 启动服务
把 jar 放到 `/opt/mc` 后执行启动脚本。
:::

:::warn
不要用 root 直接跑服务端。
:::
````

其余为标准 Markdown：标题（自动生成右侧目录）、列表、表格、任务列表、行内代码、带语言标注的代码围栏。

### 同步规则

本仓库与主仓库之间每 30 分钟自动双向同步一次，规则如下：

| 情况 | 结果 |
| --- | --- |
| 只有一边改了文件 | 改动会同步到另一边 |
| **两边都改了同一个文件** | 判为冲突，不覆盖任何一方，另一方的版本会存进主仓库的 `docs/_conflicts/` 等管理员处理 |
| 一边新增了文件 | 复制到另一边 |
| 一边删除了文件 | 同步删除另一边（删除前会先备份到 `docs/_deleted/`） |
| `docs/ad/`、`help/`、`news/` | **不参与同步** |

也就是说：你在这里改的内容会进入正式站点；你删除的文件也会被真正删除。
如果同一个文件在你改的同时主仓库也改了，管理员会收到冲突记录并在站内处理，不会静默丢掉任何一方。

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
