"use client"

import { useState, useCallback } from "react"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { generateOutfits, mapWardrobe, registrarUso, incrementarOutfits } from "@/services/outfits.service"
import { DEMO_OUTFITS } from "@/constants/demo-data"
import type { Prenda } from "@/types"

interface Outfit {
  titulo: string
  descripcion: string
  prenda_ids: string[]
}

export function useOutfits(prendas: Prenda[], userId: string, userName: string, isGuest: boolean) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eligiendoIdx, setEligiendoIdx] = useState<number | null>(null)
  const [elegidoIdx, setElegidoIdx] = useState<number | null>(null)

  const supabase = createBrowserSupabaseClient()

  const generate = useCallback(async (contexto: { ocasion: string; clima: string; destacada: string }) => {
    setGenerating(true)
    setError(null)
    setOutfits([])
    try {
      if (isGuest) {
        await new Promise((r) => setTimeout(r, 1500))
        setOutfits(DEMO_OUTFITS.map((o) => ({
          titulo: o.titulo,
          descripcion: o.descripcion,
          prenda_ids: prendas.slice(0, 3).map((p) => p.id),
        })))
        return
      }
      const wardrobe = mapWardrobe(prendas)
      const resultados = await generateOutfits(contexto, wardrobe, userId)
      setOutfits(resultados)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar. Intenta de nuevo.")
    } finally {
      setGenerating(false)
    }
  }, [prendas, userId, isGuest])

  const elegir = useCallback(async (outfit: { titulo: string; prenda_ids: string[] }, idx: number) => {
    if (isGuest) return
    setEligiendoIdx(idx)
    await Promise.all([
      registrarUso(supabase, outfit.prenda_ids),
      incrementarOutfits(supabase, userName),
    ])
    setEligiendoIdx(null)
    setElegidoIdx(idx)
  }, [isGuest, supabase, userName])

  return { outfits, generating, error, eligiendoIdx, elegidoIdx, generate, elegir, setElegidoIdx }
}
