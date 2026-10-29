import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"

/**
 * Vuelta del login social y de los enlaces de correo (confirmar cuenta,
 * recuperar contraseña). Crea la sesión en cookies y redirige a la app.
 *
 * - `code`: login social (PKCE). Funciona en el mismo navegador que lo inició.
 * - `token_hash` + `type`: enlaces de correo. Funcionan aunque el correo se
 *   abra en otro dispositivo; requiere las plantillas de correo de la
 *   checklist en docs/tanda-registro-pwa/fase-1-registro-planes.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextParam = searchParams.get("next") ?? "/"
  // Solo rutas internas: evita usar el callback como redirección abierta a otro sitio.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"

  const supabase = await createClient()
  let error: { message: string } | null = null

  if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }))
  } else {
    error = { message: "faltan parámetros" }
  }

  if (error) {
    console.error("[auth/callback]", error.message)
    return NextResponse.redirect(`${origin}/?auth_error=1`)
  }
  return NextResponse.redirect(`${origin}${next}`)
}
