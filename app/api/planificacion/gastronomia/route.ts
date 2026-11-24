import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/utils/supabase/server"
import type { LugarSugerido } from "@/constants/viajes-lugares"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 })

const cacheGastro = new Map<string, LugarSugerido[]>()
const IMAGEN_INVALIDA = /\.svg|gif(\?|$)|escudo|coat_of_arms|flag_of|bandera|logo|map|mapa|locator|location|diagram|blank|portrait|signature/i

const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

async function buscarFotoWiki(query: string): Promise<string | null> {
  for (const lang of ["es", "en"] as const) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=720&format=json`
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
      if (!res.ok) continue
      const data = await res.json()
      const pages = Object.values((data.query?.pages ?? {}) as Record<string, { thumbnail?: { source?: string } }>)
      for (const p of pages) {
        if (p.thumbnail?.source && !IMAGEN_INVALIDA.test(p.thumbnail.source)) {
          return p.thumbnail.source
        }
      }
    } catch {
      // continuar
    }
  }
  return null
}

/**
 * Devuelve restaurantes y cafés reales recomendados para una ciudad usando Claude Haiku
 * y fotos reales de Wikimedia Commons (del restaurante o de su cocina típica).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ lugares: [] }, { status: 401 })

  const body = await req.json().catch(() => null)
  const ciudad = typeof body?.ciudad === "string" ? body.ciudad.trim().slice(0, 120) : ""
  if (ciudad.length < 2) return NextResponse.json({ lugares: [] }, { status: 400 })

  const clave = normalizar(ciudad)
  const enCache = cacheGastro.get(clave)
  if (enCache) return NextResponse.json({ lugares: enCache })

  try {
    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: `Eres un guía gastronómico experto. Recomienda exactamente 4 restaurantes o cafés REALES, conocidos y bien valorados para visitar en la ciudad indicada (variando entre desayuno/café, comida típica y cena).
Devuelve ÚNICAMENTE un JSON válido sin markdown con esta estructura:
{
  "restaurantes": [
    {
      "nombre": "Nombre real del restaurante o café",
      "descripcion": "Frase corta y editorial en español de México (máx. 95 caracteres) sobre su cocina y ambiente.",
      "detalles": "Código de vestimenta y espacio (ej. Casual chic · Terraza / Relajado · Café y panadería)",
      "busqueda_foto": "Nombre exacto del platillo típico principal o tipo de cocina para foto real (ej. Mole oaxaqueño, Croissant café, Tacos al pastor)"
    }
  ]
}
Solo restaurantes reales que existan en esa ciudad. Nunca inventes nombres.`,
      messages: [{ role: "user", content: `Ciudad: ${ciudad}` }],
    })

    const raw = message.content.find((b) => b.type === "text")?.text.trim() ?? ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean) as {
      restaurantes?: { nombre?: string; descripcion?: string; detalles?: string; busqueda_foto?: string }[]
    }

    const lista = Array.isArray(parsed?.restaurantes) ? parsed.restaurantes.slice(0, 4) : []
    const lugares: LugarSugerido[] = await Promise.all(
      lista
        .filter((r) => typeof r.nombre === "string" && r.nombre.trim().length > 1)
        .map(async (r, idx) => {
          const nombre = r.nombre!.trim().slice(0, 80)
          const fotoRestaurante = await buscarFotoWiki(`${nombre} ${ciudad.split(",")[0]}`)
          const fotoPlato = !fotoRestaurante && r.busqueda_foto ? await buscarFotoWiki(r.busqueda_foto) : null
          return {
            id: `gastro-${clave.slice(0, 16)}-${idx}`,
            nombre,
            categoria: "Gastronomía" as const,
            descripcion: (r.descripcion ?? "Restaurante recomendado en tu destino.").trim().slice(0, 115),
            detalles: (r.detalles ?? "Casual chic · Restaurante").trim().slice(0, 60),
            imagen: fotoRestaurante ?? fotoPlato,
          }
        })
    )

    if (lugares.length > 0) cacheGastro.set(clave, lugares)
    return NextResponse.json({ lugares })
  } catch (err) {
    console.error("[/api/planificacion/gastronomia]", err)
    return NextResponse.json({ lugares: [] })
  }
}
