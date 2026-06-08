import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

export async function fetchVentaItems(
  supabase: SupabaseClient
): Promise<Prenda[]> {
  const { data } = await supabase
    .from("prendas")
    .select("*")
    .eq("en_venta", true)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function fetchRentaItems(
  supabase: SupabaseClient
): Promise<Prenda[]> {
  const { data } = await supabase
    .from("prendas")
    .select("*")
    .eq("en_renta", true)
    .order("created_at", { ascending: false })
  return data ?? []
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

export async function apartarCompra(
  supabase: SupabaseClient,
  selectedItem: Prenda,
  userId: string
): Promise<void> {
  const { error: insertError } = await supabase.from("prendas").insert({
    user_id: userId,
    name: selectedItem.name,
    category: selectedItem.category,
    image_url: selectedItem.image_url,
    talla: selectedItem.talla,
    estado_uso: selectedItem.estado_uso,
    precio: selectedItem.precio,
    metadata: selectedItem.metadata,
    en_venta: false,
  })
  if (insertError) throw insertError
  await supabase.from("prendas").update({ en_venta: false }).eq("id", selectedItem.id)
}

export async function apartarRenta(
  supabase: SupabaseClient,
  selectedItem: Prenda,
  userId: string,
  fechaRenta: string
): Promise<void> {
  const { error: insertError } = await supabase.from("prendas").insert({
    user_id: userId,
    name: selectedItem.name,
    category: selectedItem.category,
    image_url: selectedItem.image_url,
    talla: selectedItem.talla,
    estado_uso: selectedItem.estado_uso,
    precio_renta: selectedItem.precio_renta,
    metadata: selectedItem.metadata,
    en_renta: true,
    fecha_renta: fechaRenta,
  })
  if (insertError) throw insertError
  await supabase.from("prendas").update({ en_renta: false }).eq("id", selectedItem.id)
}
