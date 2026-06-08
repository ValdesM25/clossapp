import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReparacionDB } from "@/types"

export async function fetchReparaciones(
  supabase: SupabaseClient,
  userId: string
): Promise<ReparacionDB[]> {
  const { data } = await supabase
    .from("reparaciones")
    .select("*")
    .eq("user_id", userId)
    .eq("completado", false)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function createReparacion(
  supabase: SupabaseClient,
  payload: {
    user_id: string
    prenda_id: string
    prenda: string
    tarea: string
    prioridad: ReparacionDB["prioridad"]
    completado: boolean
  }
): Promise<ReparacionDB[]> {
  await supabase.from("reparaciones").insert(payload)
  return fetchReparaciones(supabase, payload.user_id)
}

export async function completeReparacion(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await supabase.from("reparaciones").update({ completado: true }).eq("id", id)
}
