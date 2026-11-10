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
  const { error } = await supabase.from("prendas").update({
    en_venta: true,
    precio,
    talla: talla || null,
    estado_uso: estadoUso || null,
  }).eq("id", prendaId)
  if (error) throw error
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

/** Cuenta de cobro en Stripe: devuelve a dónde ir (alta o panel de depósitos) o `listo` si ya quedó activa. */
export async function abrirCuentaCobro(): Promise<{ url?: string; listo?: boolean }> {
  const res = await fetch("/api/stripe/connect", { method: "POST" }).catch(() => null)
  const json = await res?.json().catch(() => null)
  if (!res?.ok || !json) throw new Error(json?.error ?? "No se pudo conectar. Revisa tu conexión e intenta de nuevo.")
  return json
}
