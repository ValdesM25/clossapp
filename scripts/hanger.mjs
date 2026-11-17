/**
 * Geometria vectorial de la percha de Clossapp.
 *
 * Redibujada a mano sobre el imagotipo del PDF de marca (imagen de 944x612)
 * y ajustada superponiendola a su mascara: eje en x=456.5, trazo de 8px con
 * puntas y esquinas redondeadas, barra en y=298.
 *
 * Todo se expresa en ese espacio de 944x612 y luego se escala.
 */

// Linea central del trazo en el espacio de 944x612.
export const SOURCE = {
  strokeWidth: 8,
  // Cuerpo: contorno cerrado apice -> brazo izquierdo -> esquina redondeada ->
  // barra -> esquina redondeada -> brazo derecho -> apice.
  body: 'M 456.5 186 L 302 284 Q 290 292 296 296 Q 299 298 306 298 L 610 298 Q 617 298 620 296 Q 625 291 612 284 Z',
  // Gancho: circulo abierto de 3/4 de vuelta, curva en S y cuello vertical.
  hook: 'M 430.6 136 A 26 26 0 1 1 468.8 149 C 461 153 456.5 156 456.5 164 L 456.5 186',
  // Caja del trazo medida sobre las lineas centrales.
  box: { x: 294, y: 101, w: 327.5, h: 197 },
}

const round = (n) => Number(n.toFixed(3))

/**
 * Devuelve los paths de la percha escalados y centrados dentro de un lienzo
 * cuadrado.
 *
 * @param {object} opts
 * @param {number} opts.size        Lado del viewBox cuadrado.
 * @param {number} opts.markWidth   Ancho final de la marca dentro del lienzo.
 * @param {number} opts.strokeRatio Grosor del trazo como fraccion de markWidth.
 *                                  El original es 8/327.5 = 0.0244; los tamanos
 *                                  chicos necesitan mas peso para no evaporarse.
 */
export function hangerPaths({ size, markWidth, strokeRatio }) {
  const scale = markWidth / SOURCE.box.w
  const markHeight = SOURCE.box.h * scale
  const dx = (size - markWidth) / 2 - SOURCE.box.x * scale
  const dy = (size - markHeight) / 2 - SOURCE.box.y * scale

  return {
    transform: `translate(${round(dx)} ${round(dy)}) scale(${round(scale)})`,
    strokeWidth: round((markWidth * strokeRatio) / scale),
    body: SOURCE.body,
    hook: SOURCE.hook,
    markHeight: round(markHeight),
  }
}

/**
 * SVG completo de la percha sobre fondo solido.
 */
export function hangerSvg({
  size = 512,
  markWidth,
  strokeRatio = 0.026,
  background = '#E8E3DC',
  stroke = '#1F1F1F',
  title = 'Clossapp',
} = {}) {
  const width = markWidth ?? size * 0.76
  const p = hangerPaths({ size, markWidth: width, strokeRatio })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g transform="${p.transform}" fill="none" stroke="${stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="round" stroke-linecap="round">
    <path d="${p.body}"/>
    <path d="${p.hook}"/>
  </g>
</svg>
`
}
