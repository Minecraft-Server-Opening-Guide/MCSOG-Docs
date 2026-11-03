import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const MANIFEST = join(ROOT, 'docslist.json')
const LANGS = ['zh', 'en', 'zh-TW', 'ja-JP', 'ru-RU', 'ar', 'vi']
const CATEGORIES = ['java', 'be', 'ops', 'faq']
const FOLDERS = { java: 'java', be: 'bedrock', ops: 'ops', faq: 'faq' }

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.md')) out.push(full)
  }
  return out
}
const metaOf = (file) => {
  const text = readFileSync(file, 'utf8')
  const end = text.startsWith('---') ? text.indexOf('\n---', 3) : -1
  if (end < 0) return {}
  const out = {}
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1).split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    else if (value === 'true' || value === 'false') value = value === 'true'
    else if (/^\d+$/.test(value)) value = Number(value)
    else value = value.replace(/^['"]|['"]$/g, '')
    out[m[1]] = value
  }
  return out
}

let nav = []
try {
  const current = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  if (Array.isArray(current.nav)) nav = current.nav
} catch {}

const out = { nav, docs: Object.fromEntries(CATEGORIES.map((cat) => [cat, {}])) }
for (const file of walk(DOCS).sort()) {
  const parts = relative(ROOT, file).split('\\').join('/').split('/')
  if (parts.length !== 5 || parts[2] !== 'tutorials') continue
  const lang = parts[1]
  const folder = parts[3]
  const cat = Object.keys(FOLDERS).find((key) => FOLDERS[key] === folder)
  if (!cat || !LANGS.includes(lang)) continue
  const slug = parts[4].replace(/\.md$/, '')
  const meta = metaOf(file)
  const item = {
    path: '/' + lang + '/tutorials/' + folder + '/' + slug,
    title: meta.title || '',
    slug,
    cat,
    updated: meta.updated || '',
    level: Number(meta.level || 1),
    minute: Number(meta.minutes || meta.minute || 0),
  }
  for (const key of ['order', 'mc', 'tags', 'draft']) if (meta[key] !== undefined) item[key] = meta[key]
  if (!out.docs[cat][lang]) out.docs[cat][lang] = []
  out.docs[cat][lang].push(item)
}
for (const cat of CATEGORIES) {
  const ordered = {}
  for (const lang of LANGS) {
    if (!out.docs[cat][lang]?.length) continue
    out.docs[cat][lang].sort((a, b) => Number(a.order || Number.MAX_SAFE_INTEGER) - Number(b.order || Number.MAX_SAFE_INTEGER))
    ordered[lang] = out.docs[cat][lang]
  }
  out.docs[cat] = ordered
}
writeFileSync(MANIFEST, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('docslist.json written (nav + tutorial docs only)')
