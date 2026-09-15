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

/** Opciones de canje de puntos por descuentos en suscripciones de ClossApp */
export const OPCIONES_CANJE_SUSCRIPCION: OpcionCanjeSuscripcion[] = [
  {
    id: "desc_20",
    titulo: "20% de Descuento en Suscripción Pro",
    descripcion: "Obtén un 20% de descuento en tu siguiente mes de ClossApp Pro.",
    puntosCoste: 400,
    descuentoPorcentaje: 20,
    codigo: "DONA20OFF",
  },
  {
    id: "desc_50",
    titulo: "50% de Descuento en Suscripción Pro",
    descripcion: "Ahorra el 50% en la suscripción mensual de ClossApp Pro.",
    puntosCoste: 800,
    descuentoPorcentaje: 50,
    codigo: "DONA50OFF",
  },
  {
    id: "mes_gratis",
    titulo: "1 Mes GRATIS de ClossApp Pro / VIP",
    descripcion: "¡Tu generosidad viste a otros! Disfruta de 1 mes completo de ClossApp Pro sin costo.",
    puntosCoste: 1500,
    descuentoPorcentaje: 100,
    mesesGratis: 1,
    codigo: "DONAFREE1M",
  },
]

