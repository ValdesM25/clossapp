import type { OpcionCanjeSuscripcion } from "@/types/donaciones"

/**
 * Módulo de donaciones y sistema de recompensas con QR.
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

/** Impacto acumulado */
export const IMPACTO_DEMO = {
  prendasDonadas: 252,
  familiasApoyadas: 65,
}

/** Mínimo de prendas requeridas para ganar puntos por donación */
export const MIN_PRENDAS_PUNTOS = 3

/**
 * Calcula los Puntos ClossApp obtenidos por donar una cantidad dada de prendas.
 * - Menos de 3 prendas: 0 puntos
 * - 3 prendas: 100 puntos base
 * - Cada prenda extra (>3): +20 puntos adicionales
 */
export function calcularPuntosDonacion(cantidadPrendas: number): number {
  if (cantidadPrendas < MIN_PRENDAS_PUNTOS) return 0
  const prendasExtra = cantidadPrendas - MIN_PRENDAS_PUNTOS
  return 100 + (prendasExtra * 20)
}

/** Canje de puntos por descuentos en Plus o Elite. Cupones de Stripe: canje_<id> (ver supabase/19). */
export const OPCIONES_CANJE_SUSCRIPCION: OpcionCanjeSuscripcion[] = [
  {
    id: "desc_20",
    titulo: "20% de descuento en tu plan",
    descripcion: "20% menos en tu próximo mes de Plus o Elite.",
    puntosCoste: 400,
    descuentoPorcentaje: 20,
  },
  {
    id: "desc_50",
    titulo: "50% de descuento en tu plan",
    descripcion: "La mitad de tu próximo mes de Plus o Elite.",
    puntosCoste: 800,
    descuentoPorcentaje: 50,
  },
  {
    id: "mes_gratis",
    titulo: "Un mes gratis",
    descripcion: "Tu próximo mes de Plus o Elite sin costo. Tu generosidad viste a otros.",
    puntosCoste: 1500,
    descuentoPorcentaje: 100,
    mesesGratis: 1,
  },
]

