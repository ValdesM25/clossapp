export const FIXED_CATS = ["Todas", "Top", "Bottom", "Outerwear", "Calzado", "Accesorio", "Vestido"] as const

export const CATEGORIAS_RENTA_PERMITIDAS = ["vestido", "accesorio", "accesorios", "bolsa", "joyería", "lentes"]

export function categoriaPermiteRenta(category: string) {
  return CATEGORIAS_RENTA_PERMITIDAS.some((c) => category.toLowerCase().includes(c))
}

export const LAYER_ORDER = ["Outerwear", "Top", "Bottom", "Calzado", "Accesorio"]

/** Categorías para estadísticas: las de FIXED_CATS (sin "Todas") más "Otro" para lo que no encaje. */
export type CategoriaStats = Exclude<(typeof FIXED_CATS)[number], "Todas"> | "Otro"

// Las categorías vienen de la IA o escritas a mano ("Tops", "Pantalones", "Chaquetas"…).
// Se prueban en este orden: "vestido" y "abrigo" antes que "top" para no confundirse.
const CATEGORIA_SINONIMOS: [CategoriaStats, string[]][] = [
  ["Vestido", ["vestido", "dress", "enterizo", "jumpsuit", "mono", "overol"]],
  ["Outerwear", ["outerwear", "chaqueta", "chamarra", "abrigo", "blazer", "saco", "gabardina", "trench", "cardigan", "sueter", "sudadera", "hoodie", "chaleco", "jacket", "coat"]],
  ["Calzado", ["calzado", "zapato", "tenis", "sneaker", "bota", "botin", "sandalia", "tacon", "mocasin", "flats", "shoe"]],
  ["Accesorio", ["accesorio", "bolso", "bolsa", "cartera", "mochila", "joyeria", "collar", "arete", "pulsera", "anillo", "lentes", "gafas", "cinturon", "bufanda", "gorra", "sombrero", "reloj", "panuelo"]],
  ["Bottom", ["bottom", "pantalon", "jean", "falda", "short", "bermuda", "legging", "jogger"]],
  ["Top", ["top", "blusa", "camisa", "playera", "camiseta", "polo", "crop", "body", "tank", "shirt"]],
]

export function normalizarCategoria(texto?: string | null): CategoriaStats {
  const t = (texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  for (const [cat, palabras] of CATEGORIA_SINONIMOS) {
    if (palabras.some((p) => t.includes(p))) return cat
  }
  return "Otro"
}

/** Nombre de cada categoría en las gráficas. */
export const ETIQUETA_CATEGORIA: Record<CategoriaStats, string> = {
  Top: "Tops",
  Bottom: "Pantalones y faldas",
  Vestido: "Vestidos",
  Outerwear: "Abrigos y chaquetas",
  Calzado: "Calzado",
  Accesorio: "Accesorios",
  Otro: "Otros",
}

/** Singular y plural para frases ("3 tops", "1 par de zapatos"). */
export const NOMBRE_CATEGORIA: Record<CategoriaStats, [string, string]> = {
  Top: ["top", "tops"],
  Bottom: ["prenda de abajo", "prendas de abajo"],
  Vestido: ["vestido", "vestidos"],
  Outerwear: ["prenda de abrigo", "prendas de abrigo"],
  Calzado: ["par de zapatos", "pares de zapatos"],
  Accesorio: ["accesorio", "accesorios"],
  Otro: ["prenda", "prendas"],
}
