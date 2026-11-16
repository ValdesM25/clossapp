// Sin imports a propósito: se prueba con `node --test lib/prueba.test.mjs`.

export type EstadoPrueba = { tipo: "termina" | "termino"; dias: number }

const DIAS_AVISO_ANTES = 5
const DIAS_AVISO_DESPUES = 7

/**
 * Qué aviso le toca a una cuenta con prueba beta. `vence` es perfiles.prueba_vence
 * (null si nunca canjeó o si ya tiene suscripción real). Avisa los últimos 5 días
 * y, ya en gratis, una semana después de terminar.
 */
export function estadoPrueba(vence: string | null | undefined, plan: string | null, ahora = Date.now()): EstadoPrueba | null {
  if (!vence) return null
  const dias = Math.ceil((new Date(vence).getTime() - ahora) / 86_400_000)
  if (dias > DIAS_AVISO_ANTES) return null
  if (dias > 0) return plan === "gratis" ? null : { tipo: "termina", dias }
  // Mientras el cron no la baje a gratis, la prueba sigue viva: sin aviso.
  return plan === "gratis" && dias > -DIAS_AVISO_DESPUES ? { tipo: "termino", dias } : null
}

/** "16 de diciembre", para los avisos. */
export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "America/Mexico_City" })
