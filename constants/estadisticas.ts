/**
 * En qué punto de rotación está cada prenda:
 * - activa: usada en los últimos 30 días
 * - ocasional: usada hace 1 a 6 meses
 * - dormida: más de 6 meses sin usarse, o nunca usada
 * - nueva: nunca usada pero agregada hace menos de 30 días (aún no cuenta en contra)
 */
export const ORDEN_ROTACION = ["activa", "ocasional", "dormida", "nueva"] as const
export type Rotacion = (typeof ORDEN_ROTACION)[number]

/** Límites en días de cada grupo de rotación. */
export const DIAS_ACTIVA = 30
export const DIAS_OCASIONAL = 180
export const DIAS_NUEVA = 30

export const ROTACION_INFO: Record<Rotacion, { nombre: string; detalle: string }> = {
  activa: { nombre: "Activas", detalle: "Usadas este mes" },
  ocasional: { nombre: "Ocasionales", detalle: "Hace 1 a 6 meses" },
  dormida: { nombre: "Dormidas", detalle: "Más de 6 meses o nunca" },
  nueva: { nombre: "Nuevas", detalle: "Agregadas este mes" },
}
