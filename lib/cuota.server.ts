import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { MENSAJES_LIMITE } from "@/constants/planes"

// Solo para route handlers: usa cookies del request.

/**
 * Identifica al usuario por la sesión (no por el user_id del body, que se
 * puede falsificar) y descuenta una unidad de su cuota IA.
 * Devuelve la respuesta de error lista para retornar, o null si puede seguir.
 * shortcut: la cuota se descuenta antes de llamar a la IA, así que si la IA
 * falla se pierde esa unidad; agregar devolución si los fallos son frecuentes.
 */
export async function exigirCuota(tipo: "outfit" | "analisis"): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: MENSAJES_LIMITE.sinSesion }, { status: 401 })
  }

  const { data: permitido, error } = await supabase.rpc("consumir_cuota", { p_tipo: tipo })
  if (error) {
    console.error("[cuota]", error.message)
    return NextResponse.json({ error: "No se pudo verificar tu plan" }, { status: 500 })
  }
  if (!permitido) {
    return NextResponse.json({ error: MENSAJES_LIMITE[tipo], limite: tipo }, { status: 429 })
  }
  return null
}
