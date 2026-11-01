# MCSOG-Docs

中文 | [English](./README_EN.md)

---

## 中文

MCSOG 开服教程站的**公开文档仓库**，用于接收社区贡献。

*线上站点每10分钟拉取一次仓库

线上站点：<https://mcsog.ndpreforged.com>

### 仓库结构

```
MCSOG-Docs/
├── README.md              本文件
├── README_EN.md           英文说明
├── docslist.json            文档层级清单（PR 新增页面必须更新）
└── docs/
    ├── zh/                简体中文（内容源文）
    │   ├── tutorials/     开服教程正文
    │   │   ├── java/      Java 版开服
    │   │   ├── bedrock/   基岩版开服
    │   │   ├── ops/       运维与安全
    │   │   └── faq/       常见问题
    │   ├── wiki/          版本百科（版本时间线、核心对比、指令等）
    │   └── help/          帮助与规范
    ├── en/                英文（与 zh 一一对应）
    ├── zh-TW/             繁體中文
    ├── ja-JP/             日本語
    ├── ru-RU/             Русский
    ├── ar/                العربية
    └── vi/                Tiếng Việt
```

除 `zh` 外，其余语言目录均采用与 `zh` 相同的 `tutorials/`、`wiki/`、`help/` 结构。

### docslist.json 层级

`docslist.json` 是公开文档的机器可读清单，层级固定为：

```text
类型 type
└── 子分类 category（help/wiki 使用 general，tutorials 使用 java/bedrock/ops/faq）
    └── 语言 locale
        └── 文档文件
```

示例：

```js
module.exports = {
  version: 1,
  help: {
    general: {
      zh: [{ path: 'docs/zh/help/quickstart.md', slug: 'quickstart' }]
    }
  },
  tutorials: {
    java: {
      zh: [{ path: 'docs/zh/tutorials/java/protocol.md', slug: 'protocol' }]
    }
  },
  wiki: {
    general: {
      zh: [{ path: 'docs/zh/wiki/cores.md', slug: 'cores' }]
    }
  }
}
```

新增/删除/重命名文档时，必须同步修改 `docslist.json`；CI 会校验清单和文件是否一致。

### 路径约定

| 路径 | 内容 |
| --- | --- |
| `docs/zh/tutorials/<分类>/<slug>.md` | 中文教程正文，分类为 `java` / `bedrock` / `ops` / `faq` |
| `docs/en/tutorials/<分类>/<slug>.md` | 英文教程正文，路径与中文**一一对应** |
| `docs/zh/wiki/<名称>.md` | 中文百科条目 |
| `docs/<locale>/...` | 其他语言同构目录：`en` / `zh-TW` / `ja-JP` / `ru-RU` / `ar` / `vi` |

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

### HTML 嵌入扩展

`html.()` 用于在 Markdown 中嵌入原始 HTML，并保留 HTML/JS 执行能力。内容默认放入 Shadow DOM，避免内部 CSS 影响网站排版、布局和颜色。

完整示例：

```text
html.csp=[example.com,*.example.org].L=640.H=360.(<div>...</div>)
```

参数：

- `csp=[...]`：允许加载的域名列表，支持 `*.example.com` 通配符；填写后会使用带 CSP 的隔离 iframe，不填则使用 Shadow DOM。
- `L` / `H`：宽度 / 高度，单位 px；必须同时出现，只填一个视为无效，自动适应。
- 参数名不区分大小写。
- `html.()` 内的 JS 会执行；只应嵌入可信内容。

### 同步规则

本仓库是公开文档源，主仓库只做单向接收：

```text
MCSOG-Docs/docs + docslist.json
        ↓ 每 10 分钟
私有主仓库 docs/ + docslist.json
        ↓
站点 release
```

- 公开仓新增/修改/删除文档，会同步到私有仓库
- `docs/*/news/` 不在公开仓维护，也不会被公开仓删除私有仓 news
- `docs/ad/` 不参与同步
- 批量删除有保护：默认一次最多允许删除 5 个文件，超过会中止并告警

### 贡献流程

1. Fork 本仓库
2. 新建分支，修改 `docs/<locale>/**`（`zh` / `en` / `zh-TW` / `ja-JP` / `ru-RU` / `ar` / `vi`）
3. 提交 Pull Request，说明**改了什么**与**为什么改**
4. 维护者合并进 `main` 后自动生效：
   - **10 分钟内**同步进主仓库
   - **2 小时内**部署到线上站点

### 许可证

文档内容采用 **CC BY-SA 4.0**，其中的代码示例采用 **MIT**。
