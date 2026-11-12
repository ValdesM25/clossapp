import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { configurarPush, cronAutorizado, enviarLote } from "@/lib/push.server"

/**
 * Envía el recordatorio "¿compraste algo nuevo?" a quien lleva más de 14
 * días sin subir prendas (máx. uno cada 7 días). Lo dispara una vez al día
 * Vercel Cron (GET) o Supabase pg_cron (POST); ambos mandan
 * `Authorization: Bearer <CRON_SECRET>`.
 */
async function enviar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!configurarPush() || !serviceKey) {
    return NextResponse.json({ error: "Faltan variables de push" }, { status: 500 })
  }

  // Service role: necesita leer suscripciones y prendas de todas las cuentas.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
  const { data: pendientes, error } = await supabase.rpc("pendientes_recordatorio")
  if (error) {
    console.error("[push/enviar]", error.message)
    return NextResponse.json({ error: "No se pudo leer a quién avisar" }, { status: 500 })
  }

  const { enviados, vencidas } = await enviarLote(supabase, pendientes ?? [], {
    title: "¿Compraste algo nuevo?",
    body: "Súbelo a tu armario para que tus outfits estén al día.",
    url: "/",
  }, true)

  return NextResponse.json({ enviados, vencidas })
}

export const GET = enviar
export const POST = enviar
