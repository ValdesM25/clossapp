import type { SupabaseClient } from "@supabase/supabase-js"

/** Nombre visible a partir del mail: todo lo que va antes de la arroba. */
export function displayNameFor(email: string | null | undefined, fallback: string): string {
  return email?.split("@")[0] || fallback
}

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ uuid: string; displayName: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  })
  if (error || !data.user) {
    throw new Error("Código no reconocido. Intenta de nuevo.")
  }
  const uuid = data.user.id
  const displayName = displayNameFor(data.user.email, email.trim())
  return { uuid, displayName }
}
