import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
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

const files = walk(DOCS)
const zhSet = new Set()
const enSet = new Set()

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/')
  const lang = rel.startsWith('docs/zh/') ? 'zh' : (rel.startsWith('docs/en/') ? 'en' : null)
  if (!lang) {
    problems.push(rel + ': 只能放在 docs/zh 或 docs/en 下')
    continue
  }

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

  const parts = rel.split('/')
  if (parts[1] === 'tutorials') {
    if (!fm.cat) problems.push(rel + ': 教程缺少 cat')
    else if (fm.cat !== parts[2]) problems.push(rel + ': cat「' + fm.cat + '」与目录「' + parts[2] + '」不一致')
  }

  if (lang === 'zh') zhSet.add(rel.replace('docs/zh/', ''))
  else enSet.add(rel.replace('docs/en/', ''))
}

for (const p of zhSet) if (!enSet.has(p)) warnings.push('缺少英文版本: docs/en/' + p)
for (const p of enSet) if (!zhSet.has(p)) warnings.push('缺少中文版本: docs/zh/' + p)

console.log('检查了 ' + files.length + ' 个文档')
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
