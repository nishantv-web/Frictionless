import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// Copy manifest
copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'))

// Copy icons
const iconsOut = join(dist, 'icons')
if (!existsSync(iconsOut)) mkdirSync(iconsOut)
cpSync(join(root, 'public', 'icons'), iconsOut, { recursive: true })

// Flatten HTML to dist root
const pages = ['popup', 'sidepanel']
for (const page of pages) {
  const src = join(dist, 'src', page, 'index.html')
  const dst = join(dist, `${page}.html`)
  if (existsSync(src)) copyFileSync(src, dst)
}

console.log('✓ Post-build: manifest, icons, and HTML files copied to dist/')
