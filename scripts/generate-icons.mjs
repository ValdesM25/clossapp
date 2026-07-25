#!/usr/bin/env node
/**
 * Genera los iconos de marca de Clossapp a partir de la geometria vectorial
 * de scripts/hanger.mjs y scripts/wordmark.mjs.
 *
 *   node scripts/generate-icons.mjs
 *
 * Los SVG se escriben siempre. Los PNG y el .ico requieren rsvg-convert e
 * ImageMagick en el PATH; si faltan, se avisa y se omiten (los archivos ya
 * generados estan versionados, asi que no hace falta correr esto para buildear).
 *
 * El grosor del trazo se ajusta por tamano: el logo original es una linea muy
 * fina (1.4% del ancho de la marca) que a 32px directamente desaparece, asi que
 * los tamanos chicos llevan mas peso optico.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hangerSvg, hangerPaths, SOURCE } from './hanger.mjs'
import { WORDMARK_PATH, WORDMARK_BOX, METRICS } from './wordmark.mjs'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const STROKE = '#3A3A3B' // gris del trazo, medido sobre el PNG original
const INK = '#000000'    // negro del wordmark

/** Lockup completo: percha + "clossapp", recortado al arte. */
function lockupSvg() {
  const pad = 2
  const x = Math.min(SOURCE.box.x, WORDMARK_BOX.x) - SOURCE.strokeWidth / 2 - pad
  const y = Math.min(SOURCE.box.y, WORDMARK_BOX.y) - METRICS.strokeWidth / 2 - pad
  const right = Math.max(SOURCE.box.x + SOURCE.box.w, WORDMARK_BOX.x + WORDMARK_BOX.w) + METRICS.strokeWidth / 2 + pad
  const bottom = Math.max(SOURCE.box.y + SOURCE.box.h, WORDMARK_BOX.y + WORDMARK_BOX.h) + METRICS.strokeWidth / 2 + pad
  const w = +(right - x).toFixed(2)
  const h = +(bottom - y).toFixed(2)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Clossapp">
  <title>Clossapp</title>
  <g fill="none" stroke="${STROKE}" stroke-width="${SOURCE.strokeWidth}" stroke-linejoin="miter" stroke-linecap="butt" stroke-miterlimit="10">
    <path d="${SOURCE.body}"/>
    <path d="${SOURCE.hook}"/>
  </g>
  <path d="${WORDMARK_PATH}" fill="none" stroke="${INK}" stroke-width="${METRICS.strokeWidth}" stroke-linecap="butt" stroke-linejoin="round"/>
</svg>
`
}

// Un icono maskable pierde todo lo que caiga fuera del circulo central del 80%.
// La percha es ancha (relacion ~1.8:1), asi que se achica para entrar entera.
const MASKABLE_MARK = 0.66

const svgTargets = [
  // El icon.svg es el favicon moderno: se dibuja a 16-32px, por eso lleva
  // trazo grueso y menos margen.
  { file: 'icon.svg', svg: () => hangerSvg({ size: 512, markWidth: 512 * 0.86, strokeRatio: 0.045, stroke: STROKE }) },
  // Marca sola, peso normal, para usar dentro de la interfaz.
  { file: 'logo-mark.svg', svg: () => hangerSvg({ size: 512, markWidth: 512 * 0.76, strokeRatio: 0.024, stroke: STROKE }) },
  { file: 'logo.svg', svg: lockupSvg },
]

const pngTargets = [
  { file: 'icon-192.png', size: 192, mark: 0.76, ratio: 0.026 },
  { file: 'icon-512.png', size: 512, mark: 0.76, ratio: 0.024 },
  { file: 'apple-icon.png', size: 180, mark: 0.74, ratio: 0.030 },
  { file: 'icon-maskable-192.png', size: 192, mark: MASKABLE_MARK, ratio: 0.032 },
  { file: 'icon-maskable-512.png', size: 512, mark: MASKABLE_MARK, ratio: 0.030 },
]

function has(bin) {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

for (const { file, svg } of svgTargets) {
  writeFileSync(join(PUBLIC, file), svg())
  console.log('svg  ', file)
}

if (!has('rsvg-convert') || !has('magick')) {
  console.warn('\nFaltan rsvg-convert o ImageMagick: se omiten los PNG y el .ico.')
  process.exit(0)
}

const tmp = mkdtempSync(join(tmpdir(), 'clossapp-icons-'))
try {
  for (const { file, size, mark, ratio } of pngTargets) {
    const src = join(tmp, file.replace(/\.png$/, '.svg'))
    writeFileSync(src, hangerSvg({ size: 512, markWidth: 512 * mark, strokeRatio: ratio, stroke: STROKE }))
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), src, '-o', join(PUBLIC, file)])
    console.log('png  ', file, `${size}x${size}`)
  }

  // favicon.ico multi-resolucion para navegadores y bookmarks viejos.
  const icoSrc = join(tmp, 'ico.svg')
  writeFileSync(icoSrc, hangerSvg({ size: 512, markWidth: 512 * 0.88, strokeRatio: 0.05, stroke: STROKE }))
  const layers = [16, 32, 48].map((s) => {
    const out = join(tmp, `ico-${s}.png`)
    execFileSync('rsvg-convert', ['-w', String(s), '-h', String(s), icoSrc, '-o', out])
    return out
  })
  // El icono es gris sobre blanco: 64 colores cubren de sobra el antialiasing
  // y bajan el .ico a la mitad.
  execFileSync('magick', [...layers, '-colors', '64', join(PUBLIC, 'favicon.ico')])
  console.log('ico   favicon.ico 16/32/48')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
