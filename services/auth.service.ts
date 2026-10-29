import type { SupabaseClient } from "@supabase/supabase-js"

/** Nombre visible a partir del mail: todo lo que va antes de la arroba. */
export function displayNameFor(email: string | null | undefined, fallback: string): string {
  return email?.split("@")[0] || fallback
}

export type ProveedorSocial = "google" | "facebook"

/** Mínimo 8 caracteres con letras y números. Supabase aplica la misma regla del lado del servidor. */
export function validarPassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres."
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "La contraseña debe tener letras y números."
  return null
}

/** URL a la que vuelven los enlaces de correo y el login social. */
function callbackUrl(next?: string): string {
  const url = new URL("/auth/callback", window.location.origin)
  if (next) url.searchParams.set("next", next)
  return url.toString()
}

/** Traduce los errores de Supabase Auth a mensajes para la usuaria. */
function mensajeAuth(message: string | undefined, fallback: string): string {
  const m = (message ?? "").toLowerCase()
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada."
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos."
  if (m.includes("already registered")) return "Ese correo ya tiene cuenta. Entra o recupera tu contraseña."
  if (m.includes("captcha")) return "No pudimos verificar que no eres un robot. Intenta de nuevo."
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos."
  if (m.includes("password")) return "La contraseña no cumple los requisitos: mínimo 8 caracteres con letras y números."
  return fallback
}

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
  captchaToken?: string
): Promise<{ uuid: string; displayName: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
    options: { captchaToken },
  })
  if (error || !data.user) {
    throw new Error(mensajeAuth(error?.message, "Correo o contraseña incorrectos."))
  }
  const uuid = data.user.id
  const displayName = displayNameFor(data.user.email, email.trim())
  return { uuid, displayName }
}

/**
 * Crea la cuenta. Con la confirmación de correo activa no devuelve sesión:
 * la usuaria entra al abrir el enlace del correo.
 */
export async function signUp(
  supabase: SupabaseClient,
  email: string,
  password: string,
  captchaToken?: string
): Promise<{ requiereConfirmacion: boolean }> {
  const invalida = validarPassword(password)
  if (invalida) throw new Error(invalida)
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { captchaToken, emailRedirectTo: callbackUrl() },
  })
  if (error) throw new Error(mensajeAuth(error.message, "No se pudo crear la cuenta. Intenta de nuevo."))
  // Supabase no avisa si el correo ya existía (para no revelar cuentas): devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error("Ese correo ya tiene cuenta. Entra o recupera tu contraseña.")
  }
  return { requiereConfirmacion: !data.session }
}

/** Redirige a Google o Facebook; al volver, /auth/callback crea la sesión. */
export async function signInWithProvider(supabase: SupabaseClient, provider: ProveedorSocial): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  })
  if (error) throw new Error("No se pudo conectar con el proveedor. Intenta de nuevo.")
}

/** Manda el correo para elegir una contraseña nueva. */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  captchaToken?: string
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    captchaToken,
    redirectTo: callbackUrl("/restablecer"),
  })
  if (error) throw new Error(mensajeAuth(error.message, "No se pudo enviar el correo. Intenta de nuevo."))
}
