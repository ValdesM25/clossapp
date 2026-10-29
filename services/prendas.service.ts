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
): Promise<string> {
  const { data, error } = await supabase.from("prendas").insert(payload).select("id").single()
  if (error) throw error
  return String(data.id)
}

export type LugarCompra = "tienda" | "online" | "segunda_mano"

/**
 * Guarda los datos de compra de una prenda recién subida. La base valida
 * (prenda propia, fecha de los últimos 60 días) y da 10 puntos, con tope de
 * 100 al mes. Devuelve los puntos otorgados (0 si ya llegó al tope).
 */
export async function registrarCompraReciente(
  supabase: SupabaseClient,
  input: { prendaId: string; lugar: LugarCompra; tienda: string; precio: number; fecha: string }
): Promise<number> {
  const { data, error } = await supabase.rpc("registrar_compra_reciente", {
    p_prenda_id: Number(input.prendaId),
    p_lugar: input.lugar,
    p_tienda: input.tienda,
    p_precio: input.precio,
    p_fecha: input.fecha,
  })
  if (error) throw new Error(error.message.includes("FECHA_INVALIDA")
    ? "La fecha de compra debe ser de los últimos 60 días."
    : "No se pudieron guardar los datos de compra.")
  return Number(data) || 0
}

export async function deletePrenda(
  supabase: SupabaseClient,
  prendaId: string
): Promise<void> {
  const { error } = await supabase.from("prendas").delete().eq("id", prendaId)
  if (error) throw error
}

