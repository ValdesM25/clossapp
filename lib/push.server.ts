import { timingSafeEqual } from "node:crypto"
import webpush from "web-push"
import type { SupabaseClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/stripe.server"

// Solo servidor: envío de notificaciones push con las llaves VAPID.

export type Aviso = { title: string; body: string; url: string }
type Suscripcion = { id: string; endpoint: string; p256dh: string; auth: string }

/** true si la petición trae `Authorization: Bearer <CRON_SECRET>` (Vercel Cron o pg_cron). */
export function cronAutorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET
  const recibido = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "")
  const esperado = Buffer.from(secreto ?? "")
  return !!secreto && recibido.length === esperado.length && timingSafeEqual(recibido, esperado)
}

/** Configura VAPID; false si faltan variables. */
export function configurarPush(): boolean {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: publica, VAPID_PRIVATE_KEY: privada, VAPID_SUBJECT: sujeto } = process.env
  if (!publica || !privada || !sujeto) return false
  webpush.setVapidDetails(sujeto, publica, privada)
  return true
}

/**
 * Manda el aviso a cada suscripción y borra las que el navegador dio de baja (404/410).
 * `marcarEnvio` apunta `ultimo_envio` solo en las avisadas: lo usa el recordatorio periódico, que lo necesita para espaciarse.
 */
export async function enviarLote(db: SupabaseClient, subs: Suscripcion[], aviso: Aviso, marcarEnvio = false): Promise<{ enviados: number; vencidas: number }> {
  const payload = JSON.stringify(aviso)
  const vencidas: string[] = []
  const avisadas: string[] = []
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      avisadas.push(s.id)
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // 404/410: el navegador dio de baja la suscripción; ya no sirve.
      if (status === 404 || status === 410) vencidas.push(s.id)
      else console.error("[push] fallo", status, err instanceof Error ? err.message : err)
    }
  }
  if (marcarEnvio && avisadas.length) {
    await db.from("push_suscripciones").update({ ultimo_envio: new Date().toISOString() }).in("id", avisadas)
  }
  if (vencidas.length) {
    await db.from("push_suscripciones").delete().in("id", vencidas)
  }
  return { enviados: avisadas.length, vencidas: vencidas.length }
}

/** Avisa a todos los dispositivos de una persona. Nunca lanza: un push fallido no debe romper quien lo pide. */
export async function avisar(userId: string, aviso: Aviso): Promise<void> {
  try {
    if (!configurarPush()) return console.error("[push] faltan variables VAPID")
    const db = supabaseAdmin()
    const { data, error } = await db.from("push_suscripciones").select("id, endpoint, p256dh, auth").eq("user_id", userId)
    if (error) throw error
    if (data?.length) await enviarLote(db, data, aviso)
  } catch (err) {
    console.error("[push] no se pudo avisar", userId, err instanceof Error ? err.message : err)
  }
}
