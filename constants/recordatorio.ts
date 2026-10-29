/**
 * Recordatorio de "¿compraste algo nuevo?". Lo usan el banner de Inicio y el
 * envío de notificaciones push (app/api/push/enviar).
 */
export const DIAS_SIN_SUBIR = 14
export const DIAS_DESCARTE = 7
export const CLAVE_DESCARTE = "clossapp_recordatorio_descartado_hasta"

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * true si la prenda más nueva tiene más de DIAS_SIN_SUBIR días.
 * Sin prendas no recuerda nada: el armario vacío ya invita a subir la primera.
 */
export function necesitaRecordatorio(fechasCreacion: (string | null | undefined)[], ahora = Date.now()): boolean {
  const tiempos = fechasCreacion.map((f) => (f ? Date.parse(f) : NaN)).filter((t) => !Number.isNaN(t))
  if (tiempos.length === 0) return false
  return ahora - Math.max(...tiempos) > DIAS_SIN_SUBIR * DIA_MS
}

export function finDescarte(ahora = Date.now()): number {
  return ahora + DIAS_DESCARTE * DIA_MS
}
