import { createClient } from "@supabase/supabase-js"
import { leerUserAgent, type Evento } from "@/lib/actividad"

// Solo servidor: usa la llave service_role, la única que puede escribir en public.actividad.

/** Headers del request (NextRequest.headers o el resultado de next/headers). */
type Cabeceras = Pick<Headers, "get">

function texto(valor: string | null, max = 120): string | null {
  if (!valor) return null
  try { valor = decodeURIComponent(valor) } catch { /* ya venía decodificado */ }
  return valor.slice(0, max) || null
}

/** IP, ubicación (headers de geolocalización de Vercel) y dispositivo del request. */
export function contextoRequest(h: Cabeceras) {
  const ua = h.get("user-agent") ?? ""
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")
  return {
    ip: texto(ip ?? null, 64),
    pais: texto(h.get("x-vercel-ip-country"), 8),
    region: texto(h.get("x-vercel-ip-country-region"), 16),
    ciudad: texto(h.get("x-vercel-ip-city")),
    user_agent: ua.slice(0, 500) || null,
    ...leerUserAgent(ua),
  }
}

/**
 * Guarda un evento en la bitácora. No lanza: un fallo aquí nunca debe tumbar
 * la acción del usuario. Sin SUPABASE_SERVICE_ROLE_KEY no registra nada.
 */
export async function guardarActividad(
  h: Cabeceras,
  userId: string | null,
  evento: Evento,
  detalle: Record<string, unknown> = {},
  extra: { pwa?: boolean } = {}
): Promise<void> {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!llave) return
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, llave, { auth: { persistSession: false } })
    const { error } = await db.from("actividad").insert({
      user_id: userId,
      evento,
      detalle,
      pwa: extra.pwa ?? null,
      ...contextoRequest(h),
    })
    if (error) console.error("[actividad]", error.message)
  } catch (err) {
    console.error("[actividad]", err instanceof Error ? err.message : err)
  }
}
