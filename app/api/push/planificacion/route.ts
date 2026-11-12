import { NextResponse, type NextRequest } from "next/server"
import { avisar, configurarPush, cronAutorizado } from "@/lib/push.server"
import { supabaseAdmin } from "@/lib/stripe.server"

const LOTE = 10

/**
 * Avisos de planificación de las 21:00 (CDMX): el outfit de mañana y empacar para un viaje.
 * Lo dispara pg_cron (supabase/25-avisos-planificacion.sql) con `Authorization: Bearer <CRON_SECRET>`.
 */
async function enviar(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!configurarPush() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Faltan variables de push" }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin().rpc("avisos_planificacion")
  if (error) {
    console.error("[push/planificacion]", error.message)
    return NextResponse.json({ error: "No se pudo leer a quién avisar" }, { status: 500 })
  }

  const avisos = (data ?? []) as { user_id: string; title: string; body: string; url: string }[]
  // De 10 en 10 para no abrir cientos de conexiones a la vez; `avisar` nunca lanza.
  for (let i = 0; i < avisos.length; i += LOTE) {
    await Promise.all(avisos.slice(i, i + LOTE).map((a) => avisar(a.user_id, { title: a.title, body: a.body, url: a.url })))
  }
  return NextResponse.json({ avisos: avisos.length })
}

export const GET = enviar
export const POST = enviar
