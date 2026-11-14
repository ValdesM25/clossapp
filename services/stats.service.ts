import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrendaExt } from "@/types"
import { FAMILIAS_COLOR, familiaDePrenda, type FamiliaColor } from "@/constants/colores"
import { NOMBRE_CATEGORIA, normalizarCategoria, type CategoriaStats } from "@/constants/categories"
import { DIAS_ACTIVA, DIAS_NUEVA, DIAS_OCASIONAL, type Rotacion } from "@/constants/estadisticas"

const DIA = 86_400_000

export interface CategoriaResumen {
  categoria: CategoriaStats
  total: number
  enUso: number
  usos: number
}

export interface ColorResumen {
  familia: FamiliaColor
  total: number
}

export interface PrendaConRotacion extends PrendaExt {
  rotacion: Rotacion
  diasSinUso: number | null
  costoPorUso: number | null
}

export interface StatsResult {
  total: number
  usos: number
  outfits: number
  /** 0–100: de las prendas que ya tuvieron oportunidad, cuántas se usaron en 6 meses. null si no hay base. */
  salud: number | null
  rotacion: Record<Rotacion, number>
  categorias: CategoriaResumen[]
  colores: ColorResumen[]
  sinColor: number
  /** Promedio de costo por uso entre las prendas con precio de compra y al menos un uso. */
  costoPorUso: number | null
  conCompra: number
  valorEnVenta: number
  enVenta: number
  /** Todas, con su rotación calculada, para filtrar por segmento en la vista. */
  prendas: PrendaConRotacion[]
  topPrendas: PrendaConRotacion[]
  olvidadas: PrendaConRotacion[]
  /** Dormidas que no están publicadas (la lista de olvidadas muestra solo las primeras 9). */
  totalOlvidadas: number
  insights: string[]
}

function diasDesde(iso: string | null | undefined, ahora: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((ahora - t) / DIA))
}

export function rotacionDe(p: PrendaExt, ahora = Date.now()): Rotacion {
  const dias = (p.usos ?? 0) > 0 ? diasDesde(p.ultimo_uso, ahora) : null
  if (dias !== null) {
    if (dias <= DIAS_ACTIVA) return "activa"
    if (dias <= DIAS_OCASIONAL) return "ocasional"
    return "dormida"
  }
  const antiguedad = diasDesde(p.created_at, ahora)
  return antiguedad !== null && antiguedad <= DIAS_NUEVA ? "nueva" : "dormida"
}

function plural(n: number, [uno, varios]: [string, string]) {
  return `${n} ${n === 1 ? uno : varios}`
}

/** Todo el cálculo, sin red: sirve igual para el usuario real y para el modo demo. */
export function computeStats(all: PrendaExt[], outfits: number, ahora = Date.now()): StatsResult {
  const prendas: PrendaConRotacion[] = all.map((p) => {
    const usos = p.usos ?? 0
    const compra = Number(p.compra_precio)
    return {
      ...p,
      rotacion: rotacionDe(p, ahora),
      diasSinUso: usos > 0 ? diasDesde(p.ultimo_uso, ahora) : null,
      costoPorUso: compra > 0 && usos > 0 ? compra / usos : null,
    }
  })

  const total = prendas.length
  const usos = prendas.reduce((s, p) => s + (p.usos ?? 0), 0)

  const rotacion: Record<Rotacion, number> = { activa: 0, ocasional: 0, dormida: 0, nueva: 0 }
  for (const p of prendas) rotacion[p.rotacion]++
  const evaluables = total - rotacion.nueva
  const salud = evaluables > 0 ? Math.round(((rotacion.activa + rotacion.ocasional) / evaluables) * 100) : null

  const porCategoria = new Map<CategoriaStats, CategoriaResumen>()
  for (const p of prendas) {
    const categoria = normalizarCategoria(p.category)
    const c = porCategoria.get(categoria) ?? { categoria, total: 0, enUso: 0, usos: 0 }
    c.total++
    if (p.rotacion === "activa" || p.rotacion === "ocasional") c.enUso++
    c.usos += p.usos ?? 0
    porCategoria.set(categoria, c)
  }
  const categorias = [...porCategoria.values()].sort((a, b) => b.total - a.total || b.usos - a.usos)

  const porColor = new Map<FamiliaColor, number>()
  let sinColor = 0
  for (const p of prendas) {
    const f = familiaDePrenda(p)
    if (f) porColor.set(f, (porColor.get(f) ?? 0) + 1)
    else sinColor++
  }
  const colores = [...porColor.entries()].map(([familia, total]) => ({ familia, total })).sort((a, b) => b.total - a.total)

  const conCosto = prendas.filter((p) => p.costoPorUso !== null)
  const costoPorUso = conCosto.length ? conCosto.reduce((s, p) => s + (p.costoPorUso ?? 0), 0) / conCosto.length : null
  const conCompra = prendas.filter((p) => Number(p.compra_precio) > 0).length

  const publicadas = prendas.filter((p) => p.en_venta && Number(p.precio) > 0)
  const valorEnVenta = publicadas.reduce((s, p) => s + Number(p.precio), 0)

  const topPrendas = prendas.filter((p) => (p.usos ?? 0) > 0).sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0)).slice(0, 5)

  // Primero las nunca usadas (más antiguas primero), luego por más días sin uso.
  const olvidadasTodas = prendas.filter((p) => p.rotacion === "dormida" && !p.en_venta)
  const olvidadas = olvidadasTodas
    .sort((a, b) => {
      if (a.diasSinUso === null && b.diasSinUso !== null) return -1
      if (b.diasSinUso === null && a.diasSinUso !== null) return 1
      if (a.diasSinUso === null || b.diasSinUso === null) return (diasDesde(b.created_at, ahora) ?? 0) - (diasDesde(a.created_at, ahora) ?? 0)
      return b.diasSinUso - a.diasSinUso
    })
    .slice(0, 9)

  return {
    total, usos, outfits, salud, rotacion, categorias, colores, sinColor,
    costoPorUso, conCompra, valorEnVenta, enVenta: publicadas.length,
    prendas, topPrendas, olvidadas, totalOlvidadas: olvidadasTodas.length,
    insights: generarInsights(categorias, colores, rotacion, total),
  }
}

function generarInsights(
  categorias: CategoriaResumen[],
  colores: ColorResumen[],
  rotacion: Record<Rotacion, number>,
  total: number,
): string[] {
  const out: string[] = []
  if (total < 3) return out

  // La categoría con peor proporción de uso, si tiene volumen suficiente para importar.
  const floja = categorias
    .filter((c) => c.total >= 3 && c.categoria !== "Otro")
    .map((c) => ({ ...c, ratio: c.enUso / c.total }))
    .filter((c) => c.ratio <= 0.5)
    .sort((a, b) => a.ratio - b.ratio || b.total - a.total)[0]
  if (floja) {
    out.push(floja.enUso === 0
      ? `Tienes ${plural(floja.total, NOMBRE_CATEGORIA[floja.categoria])} y llevan más de 6 meses sin usarse.`
      : `Tienes ${plural(floja.total, NOMBRE_CATEGORIA[floja.categoria])}, pero solo usas ${floja.enUso}.`)
  }

  const favorita = [...categorias].filter((c) => c.usos > 0 && c.categoria !== "Otro").sort((a, b) => b.usos - a.usos)[0]
  if (favorita && favorita.categoria !== floja?.categoria) {
    out.push(`Lo que más rotas: ${NOMBRE_CATEGORIA[favorita.categoria][1]} (${favorita.usos} usos).`)
  }

  const color = colores[0]
  const conColor = colores.reduce((s, c) => s + c.total, 0)
  if (color && conColor >= 4 && color.total / conColor >= 0.35) {
    out.push(`El ${Math.round((color.total / conColor) * 100)}% de tu armario es ${FAMILIAS_COLOR[color.familia].nombre.toLowerCase()}. Es tu color firma.`)
  }

  if (rotacion.dormida >= 3) {
    out.push(`${rotacion.dormida} prendas llevan más de 6 meses guardadas. Dales una segunda vida.`)
  }

  return out.slice(0, 3)
}

export async function fetchStats(
  supabase: SupabaseClient,
  userId: string,
  userName: string
): Promise<StatsResult> {
  const [{ data: prendas, error }, { data: userData }] = await Promise.all([
    supabase.from("prendas").select("*").eq("user_id", userId),
    supabase.from("usuarios_permitidos").select("outfits_creados").eq("username", userName).maybeSingle(),
  ])
  if (error) throw error

  const outfits = (userData as { outfits_creados?: number } | null)?.outfits_creados ?? 0
  return computeStats((prendas ?? []) as PrendaExt[], outfits)
}
