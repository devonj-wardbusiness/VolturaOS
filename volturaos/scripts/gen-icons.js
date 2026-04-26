/**
 * Generates icon-192.png and icon-512.png for the VolturaOS PWA.
 * Dark navy background (#0a1628) with gold (#f5c842) lightning bolt.
 * Pure Node.js — no external deps.
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  return table
}
const CRC_TABLE = makeCrcTable()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

function generatePNG(size) {
  const bgR = 10,  bgG = 22,  bgB = 40   // #0a1628 dark navy
  const fgR = 245, fgG = 200, fgB = 66   // #f5c842 gold

  // Lightning bolt in normalized coords (-1 to 1)
  // Bold shape with clear top/bottom points
  const bolt = [
    [ 0.22, -0.70],  // top right
    [ 0.46,  0.04],  // mid right outer
    [ 0.06,  0.04],  // mid right inner
    [-0.22,  0.70],  // bottom left
    [-0.46, -0.04],  // mid left outer
    [-0.06, -0.04],  // mid left inner
  ]

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0 // filter: None
    const ny = (y / size) * 2 - 1 + (1 / size) // center pixel

    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 2 - 1 + (1 / size)
      const inBolt = pointInPolygon(nx, ny, bolt)
      const offset = 1 + x * 3
      if (inBolt) {
        row[offset]     = fgR
        row[offset + 1] = fgG
        row[offset + 2] = fgB
      } else {
        row[offset]     = bgR
        row[offset + 1] = bgG
        row[offset + 2] = bgB
      }
    }
    rows.push(row)
  }

  const rawData = Buffer.concat(rows)
  const compressedData = zlib.deflateSync(rawData, { level: 9 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type
  // bytes 10-12 = 0 (compression, filter, interlace)

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressedData), pngChunk('IEND', Buffer.alloc(0))])
}

const outDir = path.join(__dirname, '..', 'public')
;[192, 512].forEach(size => {
  const png = generatePNG(size)
  const out = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(out, png)
  console.log(`✓ icon-${size}.png  (${png.length} bytes)`)
})
