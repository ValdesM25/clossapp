import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

export async function fetchPrendas(
  supabase: SupabaseClient,
  userId: string
): Promise<Prenda[]> {
  const { data, error } = await supabase
    .from("prendas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertPrenda(
  supabase: SupabaseClient,
  payload: {
    user_id: string
    name: string
    category: string
    image_url: string
    talla: string | null
    estado_uso: string | null
    description: string | null
    color: string | null
    style: string | null
    metadata: Record<string, string>
  }
): Promise<void> {
  const { error } = await supabase.from("prendas").insert(payload)
  if (error) throw error
}
