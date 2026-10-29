import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { MENSAJES_LIMITE } from "@/constants/planes"
import type { EstiloPerfil } from "@/constants/onboarding"

// Solo para route handlers: usa cookies del request.

type ResultadoCuota =
  | { bloqueo: NextResponse; supabase?: never; userId?: never }
  | { bloqueo: null; supabase: SupabaseClient; userId: string }

/**
 * Identifica al usuario por la sesión (no por el user_id del body, que se
 * puede falsificar) y descuenta una unidad de su cuota IA.
 * Si `bloqueo` viene, hay que retornarlo tal cual.
 * shortcut: la cuota se descuenta antes de llamar a la IA, así que si la IA
 * falla se pierde esa unidad; agregar devolución si los fallos son frecuentes.
 */
export async function exigirCuota(tipo: "outfit" | "analisis"): Promise<ResultadoCuota> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { bloqueo: NextResponse.json({ error: MENSAJES_LIMITE.sinSesion }, { status: 401 }) }
  }

  const { data: permitido, error } = await supabase.rpc("consumir_cuota", { p_tipo: tipo })
  if (error) {
    console.error("[cuota]", error.message)
    return { bloqueo: NextResponse.json({ error: "No se pudo verificar tu plan" }, { status: 500 }) }
  }
  if (!permitido) {
    return { bloqueo: NextResponse.json({ error: MENSAJES_LIMITE[tipo], limite: tipo }, { status: 429 }) }
  }
  return { bloqueo: null, supabase, userId: user.id }
}

/** Perfil de estilo del usuario de la sesión; null si no lo llenó o falla la lectura. */
export async function leerEstilo(supabase: SupabaseClient, userId: string): Promise<EstiloPerfil | null> {
  const { data, error } = await supabase.from("perfiles").select("estilo").eq("user_id", userId).maybeSingle()
  if (error) console.error("[perfil]", error.message)
  return (data?.estilo as EstiloPerfil | null) ?? null
}
