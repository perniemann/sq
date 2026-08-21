// Ensures every src/ui and src/components .tsx (excluding tests) is listed in
// component-manifest.ts. Run: node scripts/design-reference-coverage.mjs
import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function walkTsxFiles(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue
      await walkTsxFiles(p, out)
    } else if (e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx')) {
      out.push(p)
    }
  }
  return out
}

function posixRel(fullPath, baseDir) {
  return relative(baseDir, fullPath).split('\\').join('/')
}

async function main() {
  const srcRoot = join(ROOT, 'src')
  const dirs = [join(srcRoot, 'ui'), join(srcRoot, 'components')]

  const diskFiles = []
  for (const d of dirs) {
    await walkTsxFiles(d, diskFiles)
  }
  const rels = diskFiles.map((p) => posixRel(p, srcRoot)).sort()

  const manifestPath = join(
    ROOT,
    'src/dev/design-reference/component-manifest.ts',
  )
  const manifestSrc = readFileSync(manifestPath, 'utf8')

  const errors = []

  for (const f of rels) {
    const needle = `'${f}'`
    const needleDq = `"${f}"`
    if (!manifestSrc.includes(needle) && !manifestSrc.includes(needleDq)) {
      errors.push(`File not in component-manifest.ts: ${f}`)
    }
  }

  const listed = []
  const re = /file:\s*['"]((?:ui|components)\/[^'"]+\.tsx)['"]/g
  let m
  while ((m = re.exec(manifestSrc)) !== null) {
    listed.push(m[1])
  }

  for (const f of listed) {
    if (!rels.includes(f)) {
      errors.push(`Manifest lists missing file: ${f}`)
    }
  }

  if (errors.length) {
    console.error('design-reference coverage FAILED:')
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }

  console.log(
    `design-reference coverage OK: ${rels.length} modules (${listed.length} manifest entries)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
