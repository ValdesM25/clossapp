import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

/**
 * Prendas publicadas por cualquier persona. La tabla prendas solo deja ver
 * las propias, así que se leen con marketplace_publico, que expone solo las
 * columnas para anunciar.
 */
async function fetchPublicadas(supabase: SupabaseClient, tipo: "venta" | "renta"): Promise<Prenda[]> {
  const { data, error } = await supabase.rpc("marketplace_publico", { p_tipo: tipo })
  if (error) throw error
  return ((data ?? []) as Array<Prenda & { id: number | string }>).map((p) => ({ ...p, id: String(p.id) }))
}

export async function fetchVentaItems(supabase: SupabaseClient): Promise<Prenda[]> {
  return fetchPublicadas(supabase, "venta")
}

export async function fetchRentaItems(supabase: SupabaseClient): Promise<Prenda[]> {
  return fetchPublicadas(supabase, "renta")
}

export async function publishForSale(
  supabase: SupabaseClient,
  prendaId: string,
  precio: number,
  talla: string | null,
  estadoUso: string | null
): Promise<Prenda[]> {
  await supabase.from("prendas").update({
    en_venta: true,
    precio,
    talla: talla || null,
    estado_uso: estadoUso || null,
  }).eq("id", prendaId)
  return fetchVentaItems(supabase)
}

export async function publishForRent(
  prendaId: string,
  precioRenta: number,
  userId: string
): Promise<Prenda[]> {
  const res = await fetch("/api/renta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prenda_id: prendaId, precio_renta: precioRenta, user_id: userId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return []
}
