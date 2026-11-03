import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const MANIFEST = join(ROOT, 'docslist.json')
const LANGS = ['zh', 'en', 'zh-TW', 'ja-JP', 'ru-RU', 'ar', 'vi']
const TYPES = ['help', 'tutorials', 'wiki']
const CATEGORIES = ['java', 'be', 'ops', 'faq']
const FOLDERS = { java: 'java', be: 'bedrock', ops: 'ops', faq: 'faq' }
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

const listed = new Set()
if (manifest) {
  if (!Array.isArray(manifest.nav)) problems.push('docslist.json: nav 必须是数组')
  else {
    const seen = new Set()
    for (const item of manifest.nav) {
      if (!item || typeof item !== 'object') { problems.push('docslist.json: nav 存在非对象条目'); continue }
      const key = String(item.key || '')
      if (!key || seen.has(key)) problems.push('docslist.json: nav key 缺失或重复: ' + key)
      seen.add(key)
      if (!String(item.path || '').startsWith('/')) problems.push('docslist.json: nav.path 必须是站内绝对路径: ' + key)
      if (!item.label || typeof item.label !== 'object' || Array.isArray(item.label)) problems.push('docslist.json: nav.label 必须是语言映射: ' + key)
      if (!item.sub || typeof item.sub !== 'object' || Array.isArray(item.sub)) problems.push('docslist.json: nav.sub 必须是语言映射: ' + key)
    }
  }
  if (!manifest.docs || typeof manifest.docs !== 'object' || Array.isArray(manifest.docs)) {
    problems.push('docslist.json: docs 必须是分类对象')
  } else {
    for (const key of Object.keys(manifest.docs)) {
      if (!CATEGORIES.includes(key)) problems.push('docslist.json: docs 只允许 java/be/ops/faq，发现 ' + key)
    }
    for (const cat of CATEGORIES) {
      const langs = manifest.docs[cat]
      if (!langs || typeof langs !== 'object' || Array.isArray(langs)) { problems.push('docslist.json: 缺少 docs.' + cat); continue }
      for (const [lang, entries] of Object.entries(langs)) {
        if (!LANGS.includes(lang)) { problems.push('docslist.json: 不支持的语言 ' + lang); continue }
        if (!Array.isArray(entries)) { problems.push('docslist.json: docs.' + cat + '.' + lang + ' 必须是数组'); continue }
        let lastOrder = -Infinity
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') { problems.push('docslist.json: docs.' + cat + '.' + lang + ' 存在非对象条目'); continue }
          const slug = String(entry.slug || '').trim()
          if (!slug) { problems.push('docslist.json: 条目缺少 slug (' + cat + '/' + lang + ')'); continue }
          const order = Number(entry.order)
          if (!Number.isFinite(order)) problems.push('docslist.json: ' + cat + '/' + lang + '/' + slug + ' 缺少数字 order')
          else if (order < lastOrder) problems.push('docslist.json: ' + cat + '/' + lang + ' 未按 order 升序排列: ' + slug)
          else lastOrder = order
          const folder = FOLDERS[cat]
          const rel = 'docs/' + lang + '/tutorials/' + folder + '/' + slug + '.md'
          const path = String(entry.path || '')
          if (path.startsWith('docs/') && path !== rel) problems.push('docslist.json: path 与分类/语言/slug 不一致: ' + path)
          if (path && !path.startsWith('/') && !path.startsWith('docs/')) problems.push('docslist.json: 非法 path: ' + path)
          if (!statSync(join(ROOT, rel), { throwIfNoEntry: false })?.isFile()) problems.push('docslist.json: 文件不存在 ' + rel)
          if (listed.has(rel)) problems.push('docslist.json: 重复条目 ' + rel)
          listed.add(rel)
        }
      }
    }
  }
  for (const key of Object.keys(manifest)) if (key !== 'nav' && key !== 'docs') problems.push('docslist.json: 未知顶层字段 ' + key)
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
  if (parts.length < 4 || parts[0] !== 'docs') { problems.push(rel + ': 只能放在 docs/<语言码>/<类型>/ 下'); continue }
  const lang = parts[1]
  const type = parts[2]
  if (!LANGS.includes(lang)) problems.push(rel + ': 不支持的语言目录 ' + lang)
  if (!TYPES.includes(type)) { problems.push(rel + ': 公开仓只允许 help/tutorials/wiki，发现 ' + type); continue }
  if (type === 'tutorials' && !listed.has(rel)) problems.push('docslist.json: 缺少教程条目 ' + rel)

  const raw = readFileSync(file)
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) problems.push(rel + ': 含 UTF-8 BOM，请去掉')
  const text = raw.toString('utf8')
  if (text.includes('\r\n')) problems.push(rel + ': 含 CRLF，请改为 LF')
  if (!text.endsWith('\n')) problems.push(rel + ': 文件结尾缺少换行')
  if (/\n\n+$/.test(text)) problems.push(rel + ': 文件结尾有多余空行')

  let inFence = false
  let depth = 0
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    if (!line.startsWith(':::')) continue
    if (line.trim() === ':::') depth -= 1
    else depth += 1
  }
  if (depth !== 0) warnings.push(rel + ': ::: 块可能未配对（差 ' + depth + '）')

  const fm = frontMatter(text)
  if (!fm) { problems.push(rel + ': 缺少 YAML front-matter'); continue }
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

for (const rel of listed) {
  if (!files.some((file) => relative(ROOT, file).split('\\').join('/') === rel)) problems.push('docslist.json: 指向不存在的文件 ' + rel)
}
for (const [rel, status] of changedDocs) {
  if (!rel.startsWith('docs/') || rel.split('/')[2] !== 'tutorials') continue
  if (status === 'A' && !listed.has(rel)) problems.push('docslist.json: 新增教程必须加入清单 ' + rel)
  if (status === 'D' && listed.has(rel)) problems.push('docslist.json: 删除教程后必须移除清单条目 ' + rel)
}
for (const p of zhSet) if (!enSet.has(p)) warnings.push('缺少英文版本: docs/en/' + p)
for (const p of enSet) if (!zhSet.has(p)) warnings.push('缺少中文版本: docs/zh/' + p)

console.log('检查了 ' + files.length + ' 个文档，docslist.json ' + listed.size + ' 条教程')
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
