// scripts/gen-icons.mjs
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#1A1F6E'
  ctx.fillRect(0, 0, size, size)

  // Gold "V"
  ctx.fillStyle = '#C9A227'
  ctx.font = `bold ${Math.floor(size * 0.6)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('V', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

const publicDir = join(__dirname, '..', 'public')
writeFileSync(join(publicDir, 'icon-192.png'), generateIcon(192))
writeFileSync(join(publicDir, 'icon-512.png'), generateIcon(512))
console.log('Icons generated!')
