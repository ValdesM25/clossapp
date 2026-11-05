import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prenda } from "@/types"

export async function registrarUso(
  supabase: SupabaseClient,
  prendaIds: string[]
): Promise<void> {
  if (!prendaIds.length) return
  const now = new Date().toISOString()
  await Promise.all(
    prendaIds.map((id) =>
      supabase.from("prendas").update({ ultimo_uso: now }).eq("id", id)
        .then(() =>
          supabase.rpc("incrementar_uso", { prenda_id_input: id })
        )
    )
  )
}

export async function incrementarOutfits(
  supabase: SupabaseClient,
  userName: string
): Promise<void> {
  const { error } = await supabase.rpc("incrementar_outfits", { username_input: userName })
  if (error) {
    const { data } = await supabase
      .from("usuarios_permitidos")
      .select("outfits_creados")
      .eq("username", userName)
      .single()
    await supabase
      .from("usuarios_permitidos")
      .update({ outfits_creados: (data?.outfits_creados ?? 0) + 1 })
      .eq("username", userName)
  }
}

export async function generateOutfits(
  contexto: { ocasion: string; clima: string; destacada: string },
  wardrobe: { id: string; name: string; category: string; metadata: Record<string, string> | null }[],
  userId: string
): Promise<Array<{ titulo: string; descripcion: string; prenda_ids: string[] }>> {
  const contextoStr = [
    contexto.ocasion && `Ocasión: ${contexto.ocasion}`,
    contexto.clima && `Clima: ${contexto.clima}`,
    contexto.destacada && `Prenda destacada: ${contexto.destacada}`,
  ].filter(Boolean).join(". ") || "Outfit casual del día"

  const res = await fetch("/api/generate-outfits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexto: contextoStr, wardrobe, user_id: userId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Error en la API")
  return data.outfits ?? []
}

export function mapWardrobe(prendas: Prenda[]) {
  return prendas.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    metadata: p.metadata ?? null,
  }))
}
