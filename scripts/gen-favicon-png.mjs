import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public', 'sq-favicon.svg'))
await sharp(svg)
  .resize(32, 32)
  .png()
  .toFile(join(root, 'public', 'sq-favicon-32.png'))
console.log('Generated public/sq-favicon-32.png')
