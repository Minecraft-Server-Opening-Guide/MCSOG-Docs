import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const TYPES = ['help', 'tutorials', 'wiki']
const LANGS = ['zh', 'en', 'zh-TW', 'ja-JP', 'ru-RU', 'ar', 'vi']

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.md')) out.push(full)
  }
  return out
}

const out = { version: 1, help: {}, tutorials: {}, wiki: {} }
for (const file of walk(DOCS).sort()) {
  const parts = relative(ROOT, file).split('\\').join('/').split('/')
  if (parts.length < 4) continue
  const lang = parts[1]
  const type = parts[2]
  if (!TYPES.includes(type) || !LANGS.includes(lang)) continue
  let cat = 'general'
  let slug = ''
  if (type === 'tutorials') {
    if (parts.length !== 5) continue
    cat = parts[3]
    slug = parts[4].replace(/\.md$/, '')
  } else {
    if (parts.length !== 4) continue
    slug = parts[3].replace(/\.md$/, '')
  }
  if (!out[type][cat]) out[type][cat] = {}
  if (!out[type][cat][lang]) out[type][cat][lang] = []
  out[type][cat][lang].push({ path: parts.join('/'), slug })
}

for (const type of TYPES) {
  const groups = out[type]
  const ordered = {}
  for (const cat of Object.keys(groups).sort((a, b) => (a === 'general' ? -1 : b === 'general' ? 1 : a.localeCompare(b)))) {
    ordered[cat] = {}
    for (const lang of LANGS) {
      if (groups[cat][lang]?.length) ordered[cat][lang] = groups[cat][lang]
    }
  }
  out[type] = ordered
}

writeFileSync(join(ROOT, 'docslist.js'), 'module.exports = ' + JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('docslist.js written')
