/**
 * Familias de color.
 *
 * Cada prenda guarda dos colores:
 * - `metadata.color_principal`: el nombre detallado que da la IA ("Camel", "Chocolate").
 *   Es lo que ve el usuario y puede editarlo.
 * - `metadata.color_familia`: la familia, siempre una de las claves de abajo ("cafe").
 *   La elige solo la IA (el usuario no la ve en el formulario) y sirve para agrupar
 *   en estadísticas. Para prendas viejas o si la IA falla, se calcula con `normalizarColor`.
 *
 * Módulo neutral: lo importan la ruta de la IA y los componentes cliente.
 */

export const FAMILIAS_COLOR = {
  negro: { nombre: "Negro", hex: "#18181b" },
  blanco: { nombre: "Blanco", hex: "#fafafa" },
  gris: { nombre: "Gris", hex: "#9ca3af" },
  beige: { nombre: "Beige", hex: "#e7d8bf" },
  cafe: { nombre: "Café", hex: "#7c4a2d" },
  azul_marino: { nombre: "Azul marino", hex: "#1e2a4a" },
  azul: { nombre: "Azul", hex: "#3b6fb6" },
  verde: { nombre: "Verde", hex: "#4d7c4a" },
  rojo: { nombre: "Rojo", hex: "#b42323" },
  rosa: { nombre: "Rosa", hex: "#e8a3b8" },
  morado: { nombre: "Morado", hex: "#6d4c9f" },
  amarillo: { nombre: "Amarillo", hex: "#e8c547" },
  naranja: { nombre: "Naranja", hex: "#e07b39" },
  metalico: { nombre: "Metálico", hex: "linear-gradient(135deg, #d4af37, #f5f5f4 50%, #a8a29e)" },
  estampado: { nombre: "Estampado", hex: "repeating-linear-gradient(45deg, #18181b 0 3px, #f4f4f5 3px 7px)" },
  multicolor: { nombre: "Multicolor", hex: "conic-gradient(#b42323, #e8c547, #4d7c4a, #3b6fb6, #6d4c9f, #b42323)" },
} as const

export type FamiliaColor = keyof typeof FAMILIAS_COLOR

export const CLAVES_FAMILIA = Object.keys(FAMILIAS_COLOR) as FamiliaColor[]

export function esFamiliaColor(valor: unknown): valor is FamiliaColor {
  return typeof valor === "string" && valor in FAMILIAS_COLOR
}

/** Texto para el prompt de la IA: las claves válidas, separadas por coma. */
export const LISTA_FAMILIAS_PROMPT = CLAVES_FAMILIA.join(", ")

// Patrones y combinaciones mandan sobre el color base: "azul con rayas" es estampado.
const PATRONES: [FamiliaColor, string[]][] = [
  ["multicolor", ["multicolor", "multi color", "varios colores", "arcoiris", "tie dye", "tiedye"]],
  ["estampado", ["estampad", "floral", "flores", "rayas", "rayado", "cuadros", "cuadrille", "animal print", "leopardo", "cebra", "print", "lunares", "patron", "pattern", "camuflaje", "paisley", "tartan", "plaid"]],
]

// Nombres compuestos que contienen otra familia ("azul marino" no es azul, "palo de rosa" no es rosa fuerte).
const COMPUESTOS: [FamiliaColor, string[]][] = [
  ["azul_marino", ["azul marino", "azul oscuro", "azul noche"]],
  ["metalico", ["rose gold", "oro rosa"]],
  ["beige", ["off white", "blanco roto"]],
]

// Para el resto gana la palabra que aparece primero: en español el color base va
// antes del matiz, así "gris perla" es gris y "blanco hueso" es blanco.
const SINONIMOS: [FamiliaColor, string[]][] = [
  ["azul_marino", ["marino", "navy", "indigo"]],
  ["metalico", ["metalic", "dorado", "oro", "gold", "plateado", "plata", "silver", "bronce", "cobre", "glitter", "lentejuela"]],
  ["beige", ["beige", "crema", "hueso", "arena", "nude", "ecru", "crudo", "khaki", "kaki", "caqui", "avena", "taupe", "piedra", "champagne", "champan", "marfil", "ivory"]],
  ["cafe", ["cafe", "marron", "camel", "chocolate", "caramelo", "cognac", "conac", "tabaco", "moka", "mocha", "terracota", "oxido", "brown", "tan", "canela", "habano", "chestnut", "castano"]],
  ["blanco", ["blanco", "blanca", "white", "nieve", "perla"]],
  ["negro", ["negro", "negra", "black", "azabache", "carbon"]],
  ["gris", ["gris", "grey", "gray", "plomo", "grafito", "humo", "ceniza", "antracita", "jaspeado"]],
  ["morado", ["morado", "morada", "purpura", "violeta", "lila", "lavanda", "berenjena", "uva", "malva", "purple", "magenta", "ciruela"]],
  ["rosa", ["rosa", "rosado", "rosada", "pink", "fucsia", "fiusha", "palo de rosa", "salmon", "coral", "durazno", "blush"]],
  ["rojo", ["rojo", "roja", "red", "vino", "tinto", "burdeos", "borgo", "bordo", "guinda", "cereza", "carmesi", "granate", "escarlata", "marsala"]],
  ["naranja", ["naranja", "orange", "mandarina", "calabaza", "ladrillo"]],
  ["amarillo", ["amarillo", "amarilla", "yellow", "mostaza", "limon", "ocre", "canario", "vainilla", "mantequilla"]],
  ["verde", ["verde", "green", "oliva", "militar", "menta", "esmeralda", "jade", "salvia", "pistache", "kiwi", "musgo", "botella", "lima"]],
  ["azul", ["azul", "blue", "celeste", "cielo", "turquesa", "denim", "mezclilla", "rey", "cobalto", "petroleo", "aqua", "cian", "zafiro"]],
]

function limpiar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()
}

/** Posición de la palabra en el texto, o -1. Las cortas ("tan", "oro", "rey") solo como palabra completa. */
function posicion(texto: string, palabra: string) {
  if (palabra.length > 4) return texto.indexOf(palabra)
  const m = new RegExp(`(^| )${palabra}( |$)`).exec(texto)
  return m ? m.index + m[1].length : -1
}

function primeraFamilia(texto: string, tabla: [FamiliaColor, string[]][]): FamiliaColor | null {
  let mejor: { familia: FamiliaColor; pos: number } | null = null
  for (const [familia, palabras] of tabla) {
    for (const palabra of palabras) {
      const pos = posicion(texto, palabra)
      if (pos >= 0 && (!mejor || pos < mejor.pos)) mejor = { familia, pos }
    }
  }
  return mejor?.familia ?? null
}

/** Devuelve la familia de un color escrito libremente, o null si no se reconoce. */
export function normalizarColor(texto?: string | null): FamiliaColor | null {
  if (!texto) return null
  const t = limpiar(texto)
  if (!t) return null
  const clave = t.replace(/ /g, "_")
  if (esFamiliaColor(clave)) return clave
  return primeraFamilia(t, PATRONES) ?? primeraFamilia(t, COMPUESTOS) ?? primeraFamilia(t, SINONIMOS)
}

/**
 * Familia de una prenda: la que guardó la IA o, si falta o no es válida,
 * la deducida del color detallado.
 */
export function familiaDePrenda(p: { color?: string | null; metadata?: Record<string, string> | null }): FamiliaColor | null {
  const m = p.metadata ?? {}
  if (esFamiliaColor(m.color_familia)) return m.color_familia
  return normalizarColor(m.color_principal || p.color)
}
