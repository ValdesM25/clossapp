import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

/**
 * Envía el recordatorio "¿compraste algo nuevo?" a quien lleva más de 14
 * días sin subir prendas (máx. uno cada 7 días). Lo dispara una vez al día
 * Vercel Cron (GET) o Supabase pg_cron (POST); ambos mandan
 * `Authorization: Bearer <CRON_SECRET>`.
 */
async function enviar(req: NextRequest) {
  const secreto = process.env.CRON_SECRET
  const recibido = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "")
  const esperado = Buffer.from(secreto ?? "")
  if (!secreto || recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: publica, VAPID_PRIVATE_KEY: privada, VAPID_SUBJECT: sujeto } = process.env
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!publica || !privada || !sujeto || !serviceKey) {
    return NextResponse.json({ error: "Faltan variables de push" }, { status: 500 })
  }
  webpush.setVapidDetails(sujeto, publica, privada)

  // Service role: necesita leer suscripciones y prendas de todas las cuentas.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
  const { data: pendientes, error } = await supabase.rpc("pendientes_recordatorio")
  if (error) {
    console.error("[push/enviar]", error.message)
    return NextResponse.json({ error: "No se pudo leer a quién avisar" }, { status: 500 })
  }

  const payload = JSON.stringify({
    title: "¿Compraste algo nuevo?",
    body: "Súbelo a tu armario para que tus outfits estén al día.",
    url: "/",
  })

  let enviados = 0
  const vencidas: string[] = []
  const avisadas: string[] = []
  for (const s of pendientes ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      avisadas.push(s.id)
      enviados++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // 404/410: el navegador dio de baja la suscripción; ya no sirve.
      if (status === 404 || status === 410) vencidas.push(s.id)
      else console.error("[push/enviar] fallo", status, err instanceof Error ? err.message : err)
    }
  }

  if (avisadas.length) {
    await supabase.from("push_suscripciones").update({ ultimo_envio: new Date().toISOString() }).in("id", avisadas)
  }
  if (vencidas.length) {
    await supabase.from("push_suscripciones").delete().in("id", vencidas)
  }

  return NextResponse.json({ enviados, vencidas: vencidas.length })
}

export const GET = enviar
export const POST = enviar
