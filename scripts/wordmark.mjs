/**
 * Wordmark "clossapp" reconstruido como geometria monolineal.
 *
 * La tipografia del logo original es una mono geometrica: cada glifo es un
 * circulo/elipse o una recta con un trazo de grosor constante. Vectorizarla
 * con un tracer daba letras poligonales (la 'o' salia con forma de papa),
 * asi que se reconstruye a partir de las medidas subpixel de public/logo.png.
 *
 * Todas las coordenadas estan en el espacio original de 500x500.
 */

// Metricas medidas sobre el PNG original.
export const METRICS = {
  strokeWidth: 4,
  advance: 35.35,        // paso monoespaciado entre centros de glifo
  firstCenter: 166.0,    // centro de la 'c'
  bowlCenterY: 234.2,    // centro vertical de los glifos redondos
  rx: 12.2,              // los bowls son levemente mas altos que anchos
  ry: 12.8,
  baseline: 246.5,       // barra de la 'l'
  ascender: 210.5,       // bandera de la 'l'
  stemTop: 219.2,        // arranque de las astas de 'a' y 'p'
  descender: 261,        // pie de las astas de 'p'
}

const { advance, firstCenter, bowlCenterY: CY, rx, ry } = METRICS
const cx = (i) => firstCenter + i * advance
const n = (v) => Number(v.toFixed(2))

/** Punto sobre la elipse del bowl en un angulo dado (grados, antihorario). */
function onBowl(centerX, deg, rX = rx, rY = ry, centerY = CY) {
  const t = (deg * Math.PI) / 180
  return [n(centerX + rX * Math.cos(t)), n(centerY - rY * Math.sin(t))]
}

/** Elipse cerrada completa. */
function ellipse(centerX, centerY = CY, rX = rx, rY = ry) {
  return `M${n(centerX - rX)} ${n(centerY)}a${n(rX)} ${n(rY)} 0 1 1 ${n(rX * 2)} 0a${n(rX)} ${n(rY)} 0 1 1 ${n(-rX * 2)} 0`
}

/**
 * Arco abierto sobre el bowl, de startDeg a endDeg en sentido antihorario.
 */
function arc(centerX, startDeg, endDeg, rX = rx, rY = ry, centerY = CY) {
  const [x0, y0] = onBowl(centerX, startDeg, rX, rY, centerY)
  const [x1, y1] = onBowl(centerX, endDeg, rX, rY, centerY)
  let sweep = endDeg - startDeg
  while (sweep <= 0) sweep += 360
  const large = sweep > 180 ? 1 : 0
  // sweep-flag 0 = antihorario en el sistema de coordenadas de SVG (y hacia abajo)
  return `M${x0} ${y0}A${n(rX)} ${n(rY)} 0 ${large} 0 ${x1} ${y1}`
}

// --- glifos -----------------------------------------------------------------

// 'c': arco de ~320 grados, abierto a la derecha con terminales casi verticales.
const c = arc(cx(0), 20, -20)

// 'l': bandera superior izquierda, asta y barra de base.
const l = (() => {
  const x = cx(1)
  return (
    `M${n(x - 10)} ${METRICS.ascender}H${n(x)}` +
    `V${METRICS.baseline}` +
    `M${n(x - 10.5)} ${METRICS.baseline}H${n(x + 10.5)}`
  )
})()

// 'o': elipse completa.
const o = ellipse(cx(2))

/**
 * 's': dos arcos de bowl reducido encadenados. El superior baja por la
 * izquierda, la cintura cruza en diagonal y el inferior cierra por la derecha.
 */
function s(index) {
  const x = cx(index)
  const r = 8.75          // radio horizontal de cada arco
  const rv = 8.8          // radio vertical
  const upperY = CY - 4   // centro del arco superior
  const lowerY = CY + 4   // centro del arco inferior
  const [ax, ay] = onBowl(x, 8, r, rv, upperY)     // terminal superior derecho
  const [bx, by] = onBowl(x, 185, r, rv, upperY)   // fin del arco superior
  const [dx, dy] = onBowl(x, 8, r, rv, lowerY)     // inicio del arco inferior
  const [ex, ey] = onBowl(x, 185, r, rv, lowerY)   // terminal inferior izquierdo
  return (
    // sube por la derecha, cruza el techo y baja por la izquierda (177 grados)
    `M${ax} ${ay}A${r} ${rv} 0 0 0 ${bx} ${by}` +
    // cintura en diagonal
    `L${dx} ${dy}` +
    // baja por la derecha, cruza el piso y cierra a la izquierda (183 grados)
    `A${r} ${rv} 0 1 1 ${ex} ${ey}`
  )
}

// 'a': bowl completo mas asta derecha con un pequeno pie hacia afuera.
const a = (() => {
  const x = cx(5)
  const stem = n(x + rx - 0.7)
  return (
    ellipse(x) +
    `M${stem} ${METRICS.stemTop}V${n(METRICS.baseline - 2.5)}` +
    `q0 3.5 3 4.3`
  )
})()

// 'p': bowl completo mas asta izquierda que baja al descendente.
function p(index) {
  const x = cx(index)
  const stem = n(x - rx + 0.5)
  return ellipse(x) + `M${stem} ${METRICS.stemTop}V${METRICS.descender}`
}

/** Caja del wordmark medida sobre las lineas centrales del trazo. */
export const WORDMARK_BOX = {
  x: n(cx(0) - rx),
  y: METRICS.ascender,
  w: n(cx(7) + rx - (cx(0) - rx)),
  h: n(METRICS.descender - METRICS.ascender),
}

/** Path completo de "clossapp" pensado para dibujarse con stroke, no fill. */
export const WORDMARK_PATH = [c, l, o, s(3), s(4), a, p(6), p(7)].join('')
