export const FIXED_CATS = ["Todas", "Top", "Bottom", "Outerwear", "Calzado", "Accesorio", "Vestido"]

export const CATEGORIAS_RENTA_PERMITIDAS = ["vestido", "accesorio", "accesorios", "bolsa", "joyería", "lentes"]

export function categoriaPermiteRenta(category: string) {
  return CATEGORIAS_RENTA_PERMITIDAS.some((c) => category.toLowerCase().includes(c))
}

export const LAYER_ORDER = ["Outerwear", "Top", "Bottom", "Calzado", "Accesorio"]
