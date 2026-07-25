/**
 * Geometria vectorial de la percha de Clossapp.
 *
 * Redibujada a mano a partir de public/logo.png (500x500). Las coordenadas
 * salen de medir el trazo del PNG original pixel a pixel: eje de simetria en
 * x=145, trazo uniforme de 3px, barra en y=301 entre x=38.5 y x=251.5.
 *
 * Todo se expresa en el espacio original de 500x500 y luego se escala.
 */

// Linea central del trazo en el espacio original de 500x500.
export const SOURCE = {
  strokeWidth: 3,
  // Cuerpo: barra inferior, postes verticales de los extremos y hombros.
  // Es un contorno cerrado: barra -> poste derecho -> hombro -> apice ->
  // hombro -> poste izquierdo -> cierre.
  body: 'M 38.5 301 L 251.5 301 L 251.5 294 L 145 238 L 38.5 294 Z',
  // Gancho: semicirculo superior, bajada recta, codo en S y cuello vertical.
  hook: 'M 130.25 197 A 12.75 12.75 0 0 1 155.75 197 L 155.75 206 C 155.75 212, 147 217, 145 220 L 145 238',
  // Caja del trazo medida sobre las lineas centrales.
  box: { x: 38.5, y: 184.25, w: 213, h: 116.75 },
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
 *                                  El original es 3/213 = 0.0141; los tamanos
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
  background = '#FFFFFF',
  stroke = '#3F3F41',
  title = 'Clossapp',
} = {}) {
  const width = markWidth ?? size * 0.76
  const p = hangerPaths({ size, markWidth: width, strokeRatio })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g transform="${p.transform}" fill="none" stroke="${stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="miter" stroke-linecap="butt" stroke-miterlimit="10">
    <path d="${p.body}"/>
    <path d="${p.hook}"/>
  </g>
</svg>
`
}
