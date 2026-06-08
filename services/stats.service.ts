import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrendaExt } from "@/types"

export interface StatsResult {
  total: number
  usos: number
  outfits: number
  sinUsar: number
  topPrendas: PrendaExt[]
  olvidadas: PrendaExt[]
}

export async function fetchStats(
  supabase: SupabaseClient,
  userId: string,
  userName: string
): Promise<StatsResult> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [{ data: prendas }, { data: userData }] = await Promise.all([
    supabase.from("prendas").select("*").eq("user_id", userId),
    supabase.from("usuarios_permitidos").select("outfits_creados").eq("username", userName).single(),
  ])

  const all = (prendas ?? []) as PrendaExt[]
  const total = all.length
  const usos = all.reduce((sum, p) => sum + (p.usos ?? 0), 0)
  const outfits = (userData as { outfits_creados?: number } | null)?.outfits_creados ?? 0
  const sinUsar = all.filter((p) =>
    (p.usos ?? 0) === 0 || (p.ultimo_uso && new Date(p.ultimo_uso) < sixMonthsAgo)
  ).length

  const topPrendas = [...all].sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0)).slice(0, 3)
  const olvidadas = [...all]
    .filter((p) => (p.usos ?? 0) === 0 || (p.ultimo_uso && new Date(p.ultimo_uso) < sixMonthsAgo))
    .sort((a, b) => (a.ultimo_uso ? new Date(a.ultimo_uso).getTime() : 0) - (b.ultimo_uso ? new Date(b.ultimo_uso).getTime() : 0))
    .slice(0, 3)

  return { total, usos, outfits, sinUsar, topPrendas, olvidadas }
}
