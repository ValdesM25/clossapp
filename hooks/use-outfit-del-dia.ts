"use client"

import { useEffect, useState } from "react"
import { obtenerClima, type Clima } from "@/services/clima.service"
import { generateOutfits, mapWardrobe } from "@/services/outfits.service"
import type { Plan } from "@/constants/planes"
import type { Prenda } from "@/types"

export interface OutfitDelDia {
  titulo: string
  descripcion: string
  prendas: Prenda[]
}

interface Guardado {
  clima: Clima | null
  titulo: string
  descripcion: string
  prenda_ids: string[]
}

const hoy = () => new Date().toLocaleDateString("en-CA") // YYYY-MM-DD en hora local

const coincide = (p: Prenda, re: RegExp) => re.test(`${p.category} ${p.name}`)
const TOPS = /top|camis|blusa|playera|su[eé]ter|polo|vestido/i
const BAJOS = /pantal|jean|falda|short|bermuda|vestido/i
const ZAPATOS = /zapat|tenis|sneaker|bot[ae]|sandal|calzado/i
const ABRIGO = /chaqueta|abrigo|blazer|sudadera|su[eé]ter|impermeable|gabardina/i

// shortcut: reglas simples por categoría y temperatura, sin IA; subir a IA solo para Premium.
function armarSimple(prendas: Prenda[], clima: Clima | null): Guardado {
  const dia = Math.floor(Date.now() / 86_400_000)
  const elegir = (re: RegExp) => {
    const l = prendas.filter((p) => coincide(p, re))
    return l.length ? l[dia % l.length] : undefined
  }
  const frio = clima ? clima.temp < 16 || clima.lluvia : false
  const calor = clima ? clima.temp >= 26 : false
  const top = elegir(TOPS)
  // Vestido ya cubre el cuerpo completo: no se le agrega pantalón.
  const bajo = top && /vestido/i.test(`${top.category} ${top.name}`) ? undefined : elegir(BAJOS)
  const piezas = [top, bajo, elegir(ZAPATOS), frio ? elegir(ABRIGO) : undefined]
    .filter((p): p is Prenda => !!p)
  const ids = piezas.length >= 2 ? piezas.map((p) => p.id) : prendas.slice(0, 3).map((p) => p.id)
  return {
    clima,
    titulo: frio ? "Look abrigado" : calor ? "Look fresco" : "Look del día",
    descripcion: frio
      ? "Con capas para el frío o la lluvia de hoy."
      : calor
        ? "Ligero para el calor de hoy."
        : "Una combinación cómoda con lo que ya tienes.",
    prenda_ids: ids,
  }
}

/**
 * Clima real + outfit del día, una sola vez por día (se guarda en localStorage).
 * Premium lo genera con IA; el plan gratis usa reglas simples para no gastar su outfit diario.
 * `activo` false (demo o sin prendas) no pide ubicación ni llama a nada.
 */
export function useOutfitDelDia(prendas: Prenda[], userId: string, plan: Plan | null, activo: boolean) {
  const [clima, setClima] = useState<Clima | null>(null)
  const [outfit, setOutfit] = useState<OutfitDelDia | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!activo || prendas.length === 0) return
    let vivo = true
    const key = `outfit-dia:${userId}:${hoy()}`

    const resolver = (g: Guardado): OutfitDelDia | null => {
      const piezas = g.prenda_ids.map((id) => prendas.find((p) => p.id === id)).filter((p): p is Prenda => !!p)
      return piezas.length >= 2 ? { titulo: g.titulo, descripcion: g.descripcion, prendas: piezas } : null
    }

    async function cargar() {
      try {
        const guardado = localStorage.getItem(key)
        if (guardado) {
          const g = JSON.parse(guardado) as Guardado
          const o = resolver(g)
          if (o) { if (vivo) { setClima(g.clima); setOutfit(o); setCargando(false) } return }
        }
      } catch { /* cache corrupto: se regenera */ }

      setCargando(true)
      const c = await obtenerClima()
      let g: Guardado | null = null
      if (plan === "premium") {
        try {
          const texto = c ? `${c.texto}, ${c.temp}°C` : ""
          const [primero] = await generateOutfits({ ocasion: "Día a día", clima: texto, destacada: "" }, mapWardrobe(prendas))
          if (primero) g = { clima: c, titulo: primero.titulo, descripcion: primero.descripcion, prenda_ids: primero.prenda_ids.map(String) }
        } catch (err) {
          console.error("[outfit-del-dia]", err instanceof Error ? err.message : err)
        }
      }
      if (!g || !resolver(g)) g = armarSimple(prendas, c)
      try { localStorage.setItem(key, JSON.stringify(g)) } catch { /* sin espacio: no pasa nada */ }
      if (vivo) { setClima(c); setOutfit(resolver(g)); setCargando(false) }
    }

    void cargar()
    return () => { vivo = false }
  }, [activo, prendas, userId, plan])

  return { clima, outfit, cargando }
}
