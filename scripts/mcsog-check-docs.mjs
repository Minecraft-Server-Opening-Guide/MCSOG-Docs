import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const MANIFEST = join(ROOT, 'docslist.json')
const LANGS = ['zh', 'en', 'zh-TW', 'ja-JP', 'ru-RU', 'ar', 'vi']
const TYPES = ['help', 'tutorials', 'wiki']
const problems = []
const warnings = []

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.md')) out.push(full)
  }
  return out
}

const unquote = (value) => String(value == null ? '' : value).trim().replace(/^["']/, '').replace(/["']$/, '')
const frontMatter = (text) => {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---', 3)
  if (end < 0) return null
  const map = {}
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/)
    if (m) map[m[1]] = unquote(m[2])
  }
  return map
}

let manifest = null
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
} catch (error) {
  problems.push('docslist.json: 无法解析为 JSON: ' + String(error.message || error))
}

const listed = new Map()
const addList = (type, cat, lang, entries) => {
  if (!LANGS.includes(lang)) {
    problems.push('docslist.json: 不支持的语言 ' + lang)
    return
  }
  if (!Array.isArray(entries)) {
    problems.push('docslist.json: ' + type + '/' + cat + '/' + lang + ' 必须是数组')
    return
  }
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      problems.push('docslist.json: ' + type + '/' + cat + '/' + lang + ' 存在非对象条目')
      continue
    }
    const rel = String(entry.path || '').replace(/\\/g, '/').replace(/^\/+/, '')
    const parts = rel.split('/')
    if (parts.length < 4 || parts[0] !== 'docs') {
      problems.push('docslist.json: 非法路径 ' + rel)
      continue
    }
    if (parts[1] !== lang) problems.push('docslist.json: 语言层级与路径不一致: ' + rel)
    if (parts[2] !== type) problems.push('docslist.json: 类型层级与路径不一致: ' + rel)
    if (type === 'tutorials') {
      if (parts.length !== 5 || parts[3] !== cat) problems.push('docslist.json: 教程子分类层级与路径不一致: ' + rel)
    } else if (parts.length !== 4) {
      problems.push('docslist.json: 非教程路径应为 docs/<lang>/<type>/<slug>.md: ' + rel)
    }
    if (String(entry.slug || '') !== basename(rel, '.md')) problems.push('docslist.json: slug 与文件名不一致: ' + rel)
    if (!statSync(join(ROOT, rel), { throwIfNoEntry: false })?.isFile()) problems.push('docslist.json: 文件不存在 ' + rel)
    if (listed.has(rel)) problems.push('docslist.json: 重复条目 ' + rel)
    listed.set(rel, { type, cat: type === 'tutorials' ? cat : '', lang, slug: basename(rel, '.md') })
  }
}

if (manifest) {
  if (manifest.version !== 1) problems.push('docslist.json: version 必须为 1')
  for (const type of TYPES) {
    const groups = manifest[type]
    if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
      problems.push('docslist.json: 缺少 ' + type + ' 分类')
      continue
    }
    for (const [cat, langs] of Object.entries(groups)) {
      if (type !== 'tutorials' && cat !== 'general') problems.push('docslist.json: ' + type + ' 只允许 general 子分类，发现 ' + cat)
      if (type === 'tutorials' && cat === 'general') problems.push('docslist.json: tutorials 必须使用实际子分类，不能使用 general')
      if (!langs || typeof langs !== 'object' || Array.isArray(langs)) {
        problems.push('docslist.json: ' + type + '/' + cat + ' 必须是语言映射')
        continue
      }
      for (const [lang, entries] of Object.entries(langs)) addList(type, cat, lang, entries)
    }
  }
  for (const key of Object.keys(manifest)) {
    if (key !== 'version' && !TYPES.includes(key)) problems.push('docslist.json: 未知顶层分类 ' + key)
  }
}

const changedDocs = new Map()
const baseRef = String(process.env.GITHUB_BASE_REF || '').trim()
if (baseRef !== '') {
  try {
    const diff = execFileSync('git', ['diff', '--name-status', 'origin/' + baseRef + '...HEAD', '--', 'docs'], { cwd: ROOT, encoding: 'utf8' })
    for (const line of diff.split('\n')) {
      const bits = line.trim().split(/\s+/)
      if (bits.length < 2) continue
      if (bits[0].startsWith('R') && bits.length >= 3) {
        changedDocs.set(bits[1], 'D')
        changedDocs.set(bits[2], 'A')
      } else {
        changedDocs.set(bits[1], bits[0].charAt(0))
      }
    }
  } catch (error) {
    warnings.push('无法读取 PR 基线 diff，按完整 docslist 校验: ' + String(error.message || error).split('\n')[0])
  }
}

const files = walk(DOCS)
const zhSet = new Set()
const enSet = new Set()

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/')
  const parts = rel.split('/')
  if (parts.length < 4 || parts[0] !== 'docs') {
    problems.push(rel + ': 只能放在 docs/<语言码>/<类型>/ 下')
    continue
  }
  const lang = parts[1]
  const type = parts[2]
  if (!LANGS.includes(lang)) problems.push(rel + ': 不支持的语言目录 ' + lang)
  if (!TYPES.includes(type)) {
    problems.push(rel + ': 公开仓只允许 help/tutorials/wiki，发现 ' + type)
    continue
  }
  if (!listed.has(rel)) problems.push('docslist.json: 缺少条目 ' + rel)

  const raw = readFileSync(file)
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) problems.push(rel + ': 含 UTF-8 BOM，请去掉')
  const text = raw.toString('utf8')
  if (text.includes('\r\n')) problems.push(rel + ': 含 CRLF，请改为 LF')
  if (!text.endsWith('\n')) problems.push(rel + ': 文件结尾缺少换行')
  if (/\n\n+$/.test(text)) problems.push(rel + ': 文件结尾有多余空行')

  let inFence = false
  let depth = 0
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (!line.startsWith(':::')) continue
    if (line.trim() === ':::') depth -= 1
    else depth += 1
  }
  if (depth !== 0) warnings.push(rel + ': ::: 块可能未配对（差 ' + depth + '）')

  const fm = frontMatter(text)
  if (!fm) {
    problems.push(rel + ': 缺少 YAML front-matter')
    continue
  }
  if (!fm.title) problems.push(rel + ': front-matter 缺少 title')
  if (!fm.slug) problems.push(rel + ': front-matter 缺少 slug')

  const slug = basename(file, '.md')
  if (fm.slug && fm.slug !== slug) problems.push(rel + ': slug「' + fm.slug + '」与文件名「' + slug + '」不一致')
  if (type === 'tutorials') {
    if (!fm.cat) problems.push(rel + ': 教程缺少 cat')
    else if (fm.cat !== parts[3]) problems.push(rel + ': cat「' + fm.cat + '」与目录「' + parts[3] + '」不一致')
  }

  if (lang === 'zh') zhSet.add(rel.replace('docs/zh/', ''))
  else if (lang === 'en') enSet.add(rel.replace('docs/en/', ''))
}

for (const rel of listed.keys()) {
  if (!files.some((file) => relative(ROOT, file).split('\\').join('/') === rel)) {
    problems.push('docslist.json: 指向不存在的文件 ' + rel)
  }
}
for (const [rel, status] of changedDocs) {
  if (status === 'A' && !listed.has(rel)) problems.push('docslist.json: 新增文档必须加入清单 ' + rel)
  if (status === 'D' && listed.has(rel)) problems.push('docslist.json: 删除文档后必须移除清单条目 ' + rel)
}
for (const p of zhSet) if (!enSet.has(p)) warnings.push('缺少英文版本: docs/en/' + p)
for (const p of enSet) if (!zhSet.has(p)) warnings.push('缺少中文版本: docs/zh/' + p)

console.log('检查了 ' + files.length + ' 个文档，docslist.json ' + listed.size + ' 条')
if (problems.length) {
  console.log('')
  console.log('错误:')
  for (const p of problems) console.log('  x ' + p)
}
if (warnings.length) {
  console.log('')
  console.log('提示:')
  for (const p of warnings.slice(0, 40)) console.log('  - ' + p)
  if (warnings.length > 40) console.log('  ...另有 ' + (warnings.length - 40) + ' 条')
}
console.log('')
if (problems.length) {
  console.log('失败: ' + problems.length + ' 个错误, ' + warnings.length + ' 个提示')
  process.exit(1)
}
console.log('通过: 0 个错误, ' + warnings.length + ' 个提示')
