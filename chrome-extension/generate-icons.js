#!/usr/bin/env node
// generate-icons.js — Génère les icônes PNG de l'extension Chrome
// Aucune dépendance npm — Node.js built-ins uniquement (zlib, fs, path)
// Usage : node generate-icons.js

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[i] = c >>> 0
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = (CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ─── PNG ENCODER ──────────────────────────────────────────────────────────────
function encodePNG(width, height, pixels) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii')
    const d = data
    const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(d.length, 0)
    const crcVal = crc32(Buffer.concat([t, d]))
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crcVal, 0)
    return Buffer.concat([lenBuf, t, d, crcBuf])
  }

  // IHDR: 8-bit RGBA (color type 6)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6

  // Raw scanlines: filter byte (0 = None) + RGBA per pixel
  const raw = []
  for (let y = 0; y < height; y++) {
    raw.push(0)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw))

  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ─── DRAWING ──────────────────────────────────────────────────────────────────
function setPixel(pix, w, h, x, y, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y)
  if (x < 0 || y < 0 || x >= w || y >= h) return
  const i = (y * w + x) * 4
  pix[i] = r; pix[i + 1] = g; pix[i + 2] = b; pix[i + 3] = a
}

function roundedRect(pix, w, h, rx, ry, rw, rh, radius, r, g, b) {
  const x1 = rx + radius, y1 = ry + radius
  const x2 = rx + rw - radius - 1, y2 = ry + rh - radius - 1
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      let inside = true
      if (x < x1 && y < y1) inside = Math.hypot(x - x1, y - y1) <= radius
      else if (x > x2 && y < y1) inside = Math.hypot(x - x2, y - y1) <= radius
      else if (x < x1 && y > y2) inside = Math.hypot(x - x1, y - y2) <= radius
      else if (x > x2 && y > y2) inside = Math.hypot(x - x2, y - y2) <= radius
      if (inside) setPixel(pix, w, h, x, y, r, g, b)
    }
  }
}

function drawLine(pix, w, h, x1, y1, x2, y2, r, g, b, t = 1) {
  x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2)
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1)
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1
  let err = dx - dy, x = x1, y = y1
  const half = Math.floor(t / 2)
  for (;;) {
    for (let ty = -half; ty <= half; ty++)
      for (let tx = -half; tx <= half; tx++)
        setPixel(pix, w, h, x + tx, y + ty, r, g, b)
    if (x === x2 && y === y2) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx) { err += dx; y += sy }
  }
}

// ─── ICON ─────────────────────────────────────────────────────────────────────
// Reproduit la favicon : rounded square #0C0C0C + ScanLine icon #F2F2F2
function generateIcon(size) {
  const pix = new Uint8Array(size * size * 4) // all transparent
  const BG = [12, 12, 12]
  const FG = [242, 242, 242]
  const bgRadius = Math.round(size * 0.18)

  // Background
  roundedRect(pix, size, size, 0, 0, size, size, bgRadius, ...BG)

  // Make background pixels fully opaque
  for (let i = 0; i < pix.length; i += 4) {
    if (pix[i] === BG[0] && pix[i + 1] === BG[1] && pix[i + 2] === BG[2] && pix[i + 3] === 0) {
      pix[i + 3] = 255
    }
  }

  // ScanLine icon: corner brackets + center horizontal line
  const pad = Math.round(size * 0.16)
  const arm = Math.round(size * 0.17)
  const t = Math.max(1, Math.round(size / 18))
  const s = pad
  const e = size - 1 - pad
  const mid = Math.round((size - 1) / 2)

  // Top-left corner
  drawLine(pix, size, size, s, s + arm, s, s, ...FG, t)
  drawLine(pix, size, size, s, s, s + arm, s, ...FG, t)
  // Top-right corner
  drawLine(pix, size, size, e - arm, s, e, s, ...FG, t)
  drawLine(pix, size, size, e, s, e, s + arm, ...FG, t)
  // Bottom-right corner
  drawLine(pix, size, size, e, e - arm, e, e, ...FG, t)
  drawLine(pix, size, size, e - arm, e, e, e, ...FG, t)
  // Bottom-left corner
  drawLine(pix, size, size, s, e - arm, s, e, ...FG, t)
  drawLine(pix, size, size, s, e, s + arm, e, ...FG, t)
  // Center horizontal line
  drawLine(pix, size, size, s + arm, mid, e - arm, mid, ...FG, t)

  return pix
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir)

for (const size of [16, 48, 128]) {
  const pixels = generateIcon(size)
  const png = encodePNG(size, size, pixels)
  const outPath = path.join(iconsDir, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`✓ icon${size}.png  (${png.length} bytes)`)
}
console.log('\nIcônes générées dans chrome-extension/icons/')
