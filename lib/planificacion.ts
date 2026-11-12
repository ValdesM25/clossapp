// Planificación de outfits (Elite): tipos y reglas puras.
// Lo importan el cliente, el servidor y `node --test`, que corre este .ts quitando
// los tipos: solo sintaxis borrable y sin imports con "@/" (ver docs/planificacion-outfits/fase-2-ia-y-clima.md).
import type { ClimaDia, Lugar } from "./clima"

export type TipoPlan = "semana" | "fecha" | "viaje"
export type Momento = "dia" | "noche"
export type EstadoMomento = "pendiente" | "listo" | "error"
export type OutfitPlan = { titulo: string; descripcion: string; prenda_ids: string[]; justificacion?: string }
export type Faltante = { categoria: string; motivo: string }
export type MomentoPlan = {
  id: string; plan_id: string; fecha: string; momento: Momento; actividad: string
  clima: ClimaDia | null; outfit: OutfitPlan | null; faltante: Faltante | null
  estado: EstadoMomento; generado_en: string | null; usado_en: string | null
}
export type PlanOutfit = {
  id: string; tipo: TipoPlan; nombre: string; fecha_inicio: string; fecha_fin: string
  lugar: Lugar | null; empacadas: string[]; created_at: string; momentos: MomentoPlan[]
}
export type Grupo = "arriba" | "abajo" | "completo" | "abrigo" | "calzado" | "accesorio" | "otro"

export const MAX_DIAS_PLAN = 30
export const MAX_DIAS_BLOQUE = 7
export const MAX_PRENDAS_OUTFIT = 7
export const MIN_PRENDAS_PLAN = 5
export const TEMP_ABRIGO = 12 // °C mínimos con los que el outfit debe llevar abrigo

// Mismo "hoy" que usar_dias_plan en la base: el día cambia a medianoche de México.
export const hoyMexico = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())

// Singular y plural: las prendas de ejemplo (GUEST_PRENDAS) vienen en plural.
const GRUPO_POR_PALABRA: Record<string, Grupo> = {
  top: "arriba", tops: "arriba", blusa: "arriba", blusas: "arriba", camisa: "arriba", camisas: "arriba",
  playera: "arriba", playeras: "arriba", sueter: "arriba", sueteres: "arriba",
  bottom: "abajo", pantalon: "abajo", pantalones: "abajo", falda: "abajo", faldas: "abajo",
  short: "abajo", shorts: "abajo", jeans: "abajo",
  outerwear: "abrigo", abrigo: "abrigo", abrigos: "abrigo", chamarra: "abrigo", chamarras: "abrigo",
  chaqueta: "abrigo", chaquetas: "abrigo",
  calzado: "calzado", zapatos: "calzado",
  accesorio: "accesorio", accesorios: "accesorio",
}

/** Grupo de una categoría de `prendas.category` (las del análisis y las viejas). */
export function grupoDe(categoria: string): Grupo {
  const c = categoria.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
  if (c.startsWith("vestido")) return "completo"
  return GRUPO_POR_PALABRA[c.split(/\s+/)[0]] ?? "otro"
}

/**
 * Categoría con la que se arma el outfit. El análisis a veces guarda un vestido como "Top";
 * si el nombre empieza con "Vestido", cuenta como vestido (si no, la revisión lo rechaza
 * por no llevar parte de abajo).
 */
export function categoriaDe(p: { category: string | null; name?: string | null }): string {
  return /^\s*vestido/i.test(p.name ?? "") ? "Vestido" : p.category ?? ""
}

const MS_DIA = 86_400_000
const aUtc = (f: string) => new Date(`${f}T00:00:00Z`)
export const sumarDias = (f: string, n: number) => new Date(aUtc(f).getTime() + n * MS_DIA).toISOString().slice(0, 10)

/** Todas las fechas del rango, incluidas las dos puntas. */
export function diasEntre(inicio: string, fin: string): string[] {
  const dias: string[] = []
  for (let f = inicio; f <= fin; f = sumarDias(f, 1)) dias.push(f)
  return dias
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** Fechas y nombre con que arranca el formulario según el tipo. */
export function prellenar(tipo: TipoPlan, hoy: string): { inicio: string; fin: string; nombre: string } {
  if (tipo === "fecha") return { inicio: hoy, fin: hoy, nombre: "" }
  if (tipo === "viaje") return { inicio: sumarDias(hoy, 7), fin: sumarDias(hoy, 10), nombre: "" }
  const diasAlLunes = (8 - aUtc(hoy).getUTCDay()) % 7 // 0 si hoy es lunes
  const inicio = sumarDias(hoy, diasAlLunes)
  const d = aUtc(inicio)
  return { inicio, fin: sumarDias(inicio, 6), nombre: `Mi semana del ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}` }
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

/** "lun 16 nov" */
export function fechaCorta(f: string): string {
  const d = aUtc(f)
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]}`
}

/** "16 al 22 nov", "30 nov al 2 dic" o "16 nov" si es un solo día. */
export function rangoFechas(inicio: string, fin: string): string {
  const a = aUtc(inicio), b = aUtc(fin)
  const mesB = MESES_CORTOS[b.getUTCMonth()]
  if (inicio === fin) return `${b.getUTCDate()} ${mesB}`
  const mismoMes = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()
  return `${a.getUTCDate()}${mismoMes ? "" : ` ${MESES_CORTOS[a.getUTCMonth()]}`} al ${b.getUTCDate()} ${mesB}`
}

/** En curso si hoy cae en el rango, próximo si empieza después, terminado si ya pasó. */
export function estadoPlan(plan: Pick<PlanOutfit, "fecha_inicio" | "fecha_fin">, hoy: string): "en_curso" | "proximo" | "terminado" {
  if (plan.fecha_fin < hoy) return "terminado"
  return plan.fecha_inicio > hoy ? "proximo" : "en_curso"
}

/** Por fecha y, en el mismo día, el de día antes que el de noche. */
export const ordenMomento = (a: MomentoPlan, b: MomentoPlan) =>
  a.fecha.localeCompare(b.fecha) || (a.momento === b.momento ? 0 : a.momento === "dia" ? -1 : 1)

/** Ids de los momentos sin outfit listo que caen en las primeras `maxDias` fechas, en orden. */
export function siguienteBloque(momentos: MomentoPlan[], maxDias: number): string[] {
  const fechas = new Set<string>()
  const ids: string[] = []
  for (const m of momentos.filter((m) => m.estado !== "listo").sort(ordenMomento)) {
    if (!fechas.has(m.fecha)) {
      if (fechas.size >= maxDias) break
      fechas.add(m.fecha)
    }
    ids.push(m.id)
  }
  return ids
}

/** Fechas distintas: es lo que se cobra de la cuota. */
export const diasDe = (momentos: { fecha: string }[]) => new Set(momentos.map((m) => m.fecha)).size

export type CuotaPerfil = {
  plan_dias_dia: number; plan_dias_dia_fecha: string | null
  plan_dias_mes: number; plan_dias_mes_inicio: string | null
}

/** Días que le quedan hoy y este mes; misma cuenta que usar_dias_plan. */
export function cuotaRestante(
  perfil: CuotaPerfil, limites: { plan_dias_dia: number; plan_dias_mes: number }, hoy: string
): { hoy: number; mes: number } {
  const usadoDia = perfil.plan_dias_dia_fecha === hoy ? perfil.plan_dias_dia : 0
  const usadoMes = perfil.plan_dias_mes_inicio === `${hoy.slice(0, 8)}01` ? perfil.plan_dias_mes : 0
  return { hoy: Math.max(0, limites.plan_dias_dia - usadoDia), mes: Math.max(0, limites.plan_dias_mes - usadoMes) }
}

type ResultadoValidacion = {
  validos: Record<string, { outfit: OutfitPlan; faltante: Faltante | null }>
  errores: Record<string, string>
}

const esTexto = (v: unknown): v is string => typeof v === "string"
const claveOutfit = (ids: string[]) => [...ids].sort().join(",")

function leerFaltante(v: unknown): Faltante | null {
  if (!v || typeof v !== "object") return null
  const { categoria, motivo } = v as Record<string, unknown>
  if (!esTexto(categoria) || !esTexto(motivo)) return null
  const c = categoria.trim(), m = motivo.trim()
  return c.length >= 1 && c.length <= 40 && m.length >= 1 && m.length <= 120 ? { categoria: c, motivo: m } : null
}

/**
 * Revisa lo que devolvió la IA para los momentos del bloque. `propuestas` es el
 * arreglo `outfits` de la respuesta, sin confiar en su forma. Los mensajes de error
 * se le reenvían a la IA, por eso van en español.
 */
export function validarOutfits({ propuestas, momentos, inventario, previos }: {
  propuestas: unknown
  momentos: MomentoPlan[]
  inventario: { id: string; category: string }[]
  previos: string[][]
}): ResultadoValidacion {
  const validos: ResultadoValidacion["validos"] = {}
  const errores: Record<string, string> = {}

  const grupoPorId = new Map(inventario.map((p) => [p.id, grupoDe(p.category)]))
  const enInventario = new Set(grupoPorId.values())
  const exigeBase = enInventario.has("completo") || (enInventario.has("arriba") && enInventario.has("abajo"))
  const usados = new Set(previos.map(claveOutfit))

  // 1. Forma y momento_id: se agrupan por momento para detectar repetidos.
  const porMomento = new Map<string, unknown[]>()
  const delBloque = new Set(momentos.map((m) => m.id))
  for (const p of Array.isArray(propuestas) ? propuestas : []) {
    const id = p && typeof p === "object" ? (p as Record<string, unknown>).momento_id : undefined
    if (esTexto(id) && delBloque.has(id)) porMomento.set(id, [...(porMomento.get(id) ?? []), p])
  }

  for (const momento of momentos) {
    const lista = porMomento.get(momento.id)
    const error = (msg: string) => { errores[momento.id] = msg }
    if (!lista) { error("Falta el outfit de este momento."); continue }
    if (lista.length > 1) { error("Mandaste más de un outfit para este momento."); continue }
    const { titulo, descripcion, prenda_ids, faltante, justificacion } = lista[0] as Record<string, unknown>
    if (!esTexto(titulo) || !esTexto(descripcion) || !Array.isArray(prenda_ids) || !prenda_ids.every(esTexto)) {
      error("El outfit no tiene la forma esperada."); continue
    }

    // 2. Textos: se recortan en vez de fallar.
    const t = titulo.trim().slice(0, 60), d = descripcion.trim().slice(0, 240)
    const j = esTexto(justificacion) ? justificacion.trim().slice(0, 400) : undefined
    if (!t || !d) { error("Falta el título o la descripción."); continue }

    // 3. Prendas reales y sin repetir.
    const ajenas = prenda_ids.filter((id) => !grupoPorId.has(id))
    if (ajenas.length) { error(`Usaste prendas que no están en el armario: ${ajenas.join(", ")}.`); continue }
    if (new Set(prenda_ids).size !== prenda_ids.length) { error("Repetiste una prenda dentro del outfit."); continue }

    // 4. Tamaño.
    if (prenda_ids.length < 2 || prenda_ids.length > MAX_PRENDAS_OUTFIT) {
      error(`El outfit debe tener entre 2 y ${MAX_PRENDAS_OUTFIT} prendas.`); continue
    }

    const grupos = prenda_ids.map((id) => grupoPorId.get(id))
    const cuenta = (g: Grupo) => grupos.filter((x) => x === g).length

    // 5. Base: arriba y abajo, o un vestido; nunca vestido con abajo.
    if (exigeBase) {
      if (cuenta("completo") && cuenta("abajo")) { error("No combines un vestido con una prenda de abajo."); continue }
      if (!cuenta("completo") && !(cuenta("arriba") && cuenta("abajo"))) {
        error("El outfit necesita una parte de arriba y una de abajo, o un vestido."); continue
      }
    }

    // 6. Calzado: exactamente uno si hay en el armario (si no hay, no puede venir).
    if (enInventario.has("calzado") && cuenta("calzado") !== 1) { error("Lleva exactamente un calzado."); continue }

    // 7. Abrigo con frío, si tiene alguno.
    if (momento.clima && momento.clima.min <= TEMP_ABRIGO && enInventario.has("abrigo") && !cuenta("abrigo")) {
      error(`La mínima es de ${momento.clima.min} °C: agrega un abrigo.`); continue
    }

    // 8. Sin repetir un outfit completo del bloque ni de los ya planeados.
    const clave = claveOutfit(prenda_ids)
    if (usados.has(clave)) { error("Este outfit repite otro ya planeado. Cambia al menos una prenda."); continue }
    usados.add(clave)

    // 9. Faltante: si no cumple, se guarda null.
    validos[momento.id] = {
      outfit: { titulo: t, descripcion: d, prenda_ids, ...(j ? { justificacion: j } : {}) },
      faltante: leerFaltante(faltante),
    }
  }
  return { validos, errores }
}

const GRUPOS_MALETA: [string, Grupo][] = [
  ["Abrigos y capas", "abrigo"], ["Prendas de arriba", "arriba"], ["Vestidos", "completo"],
  ["Prendas de abajo", "abajo"], ["Calzado", "calzado"], ["Accesorios", "accesorio"], ["Otros", "otro"],
]

/** Prendas únicas de los outfits listos, agrupadas para empacar. Salta las borradas. */
export function maletaDe<P extends { id: string; category: string; name?: string | null }>(
  plan: Pick<PlanOutfit, "momentos" | "empacadas">, prendas: P[]
): { grupos: { titulo: string; prendas: (P & { empacada: boolean })[] }[]; total: number; empacadas: number } {
  const porId = new Map(prendas.map((p) => [p.id, p]))
  const vistas = new Set<string>()
  const enMaleta: P[] = []
  for (const m of [...plan.momentos].sort(ordenMomento)) {
    if (m.estado !== "listo" || !m.outfit) continue
    for (const id of m.outfit.prenda_ids) {
      const p = porId.get(id)
      if (p && !vistas.has(id)) { vistas.add(id); enMaleta.push(p) }
    }
  }
  const grupos = GRUPOS_MALETA
    .map(([titulo, g]) => ({
      titulo,
      prendas: enMaleta.filter((p) => grupoDe(categoriaDe(p)) === g).map((p) => ({ ...p, empacada: plan.empacadas.includes(p.id) })),
    }))
    .filter((g) => g.prendas.length)
  return { grupos, total: enMaleta.length, empacadas: enMaleta.filter((p) => plan.empacadas.includes(p.id)).length }
}

/** Outfits listos para hoy, con su plan; primero los de día. */
export function momentosDeHoy(planes: PlanOutfit[], hoy: string): { plan: PlanOutfit; momento: MomentoPlan }[] {
  return planes
    .flatMap((plan) => plan.momentos.filter((m) => m.fecha === hoy && m.estado === "listo").map((momento) => ({ plan, momento })))
    .sort((a, b) => ordenMomento(a.momento, b.momento))
}

/** El plan en curso o el siguiente por empezar; null si no hay. */
export function proximoPlan(planes: PlanOutfit[], hoy: string): PlanOutfit | null {
  return planes
    .filter((p) => p.fecha_fin >= hoy)
    .reduce<PlanOutfit | null>((mejor, p) => (!mejor || p.fecha_inicio < mejor.fecha_inicio ? p : mejor), null)
}
