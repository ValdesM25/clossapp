import type { SupabaseClient } from "@supabase/supabase-js"

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
  const displayName = data.user.email?.split("@")[0] ?? email.trim()
  return { uuid, displayName }
}
