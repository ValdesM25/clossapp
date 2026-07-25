/**
 * Datos de demostración del módulo de donaciones.
 *
 * El módulo es una SIMULACIÓN: no escribe en Supabase ni coordina logística real.
 * Existe para mostrar la intención de operar como Empresa Socialmente Responsable,
 * no sólo como marketplace con fin de lucro.
 *
 * Los puntos de acopio son genéricos a propósito. Sustituirlos por organizaciones
 * reales sólo cuando exista convenio firmado con cada una.
 */

export type PuntoAcopio = {
  id: string
  nombre: string
  zona: string
  horario: string
}

export const PUNTOS_ACOPIO: PuntoAcopio[] = [
  { id: "centro", nombre: "Punto de acopio Centro", zona: "Saltillo Centro", horario: "Lun a Vie · 9:00 a 18:00" },
  { id: "norte", nombre: "Punto de acopio Norte", zona: "Zona Norte", horario: "Lun a Sáb · 10:00 a 17:00" },
  { id: "republica", nombre: "Punto de acopio República", zona: "Fracc. República", horario: "Mar a Dom · 11:00 a 19:00" },
]

export type ModoEntrega = "acopio" | "recoleccion"

export const CAUSAS = [
  "Ropa de abrigo para invierno",
  "Vestimenta para búsqueda de empleo",
  "Apoyo a albergues locales",
] as const

/** Impacto acumulado ficticio, para ilustrar la métrica en la interfaz. */
export const IMPACTO_DEMO = {
  prendasDonadas: 248,
  familiasApoyadas: 63,
}
