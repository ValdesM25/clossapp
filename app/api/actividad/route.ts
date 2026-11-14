import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { EVENTOS_CLIENTE, type Evento } from "@/lib/actividad"
import { guardarActividad } from "@/lib/actividad.server"

/**
 * Eventos que reporta el navegador (login, logout, subir foto...). El user_id
 * sale de la sesión, nunca del body; IP, ubicación y dispositivo, de los headers.
 */
export async function POST(req: NextRequest) {
  let body: { evento?: string; detalle?: unknown; pwa?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const evento = body.evento as Evento
  if (!EVENTOS_CLIENTE.includes(evento)) {
    return NextResponse.json({ error: "Evento no permitido" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // La demo y las visitas sin sesión solo cuentan como "probó la demo".
  if (!user && evento !== "demo_iniciada" && evento !== "sesion_cerrada") {
    return new NextResponse(null, { status: 204 })
  }

  // Detalle chico y plano: solo textos, números y booleanos cortos.
  const detalle: Record<string, string | number | boolean> = {}
  if (body.detalle && typeof body.detalle === "object") {
    for (const [k, v] of Object.entries(body.detalle).slice(0, 10)) {
      if (typeof v === "string") detalle[k.slice(0, 40)] = v.slice(0, 300)
      else if (typeof v === "number" || typeof v === "boolean") detalle[k.slice(0, 40)] = v
    }
  }

  await guardarActividad(req.headers, user?.id ?? null, evento, detalle, { pwa: body.pwa === true })
  return new NextResponse(null, { status: 204 })
}
