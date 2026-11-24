import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/utils/supabase/server"
import type { LugarSugerido } from "@/constants/viajes-lugares"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 })

const cacheGastro = new Map<string, LugarSugerido[]>()
const ARCHIVO_INVALIDO = /\.svg|gif(\?|$)|portrait|chef|person|owner|author|actress|actor|singer|writer|logo|menu|sign|map|mapa|flag|escudo|coat_of_arms|grave|tomb|stamp|coin|book|cover|poster/i

const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

interface CommonsPage {
  title?: string
  imageinfo?: { thumburl?: string; url?: string; width?: number; height?: number }[]
}

/**
 * Busca fotografías reales (horizontales) de lugares en Wikimedia Commons (namespace File:),
 * descartando retratos verticales, personas, mapas, logos y archivos SVG.
 */
async function buscarFotosCommons(query: string, limite = 6): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}&gsrlimit=${limite}&prop=imageinfo&iiprop=url|size&iiurlwidth=720&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    const pages = Object.values((data.query?.pages ?? {}) as Record<string, CommonsPage>)
    const salida: string[] = []
    for (const p of pages) {
      const ii = p.imageinfo?.[0]
      const foto = ii?.thumburl ?? ii?.url
      if (!foto || !ii?.width || !ii?.height) continue
      // Solo fotos horizontales o cuadradas (evita retratos de personas) y sin palabras prohibidas
      if (ii.width < ii.height * 0.95) continue
      if (ARCHIVO_INVALIDO.test(p.title ?? "") || ARCHIVO_INVALIDO.test(foto)) continue
      salida.push(foto)
    }
    return salida
  } catch {
    return []
  }
}

/**
 * Devuelve restaurantes y cafés reales recomendados para una ciudad usando Claude Haiku
 * y fotografías reales de los lugares desde Wikimedia Commons.
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

  const ciudadSimple = ciudad.split(",")[0]?.trim() || ciudad

  try {
    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1600,
      output_config: { effort: "low" },
      system: `Eres un guía gastronómico experto. Recomienda 7 restaurantes, cafés o mercados gastronómicos REALES, icónicos y muy conocidos para visitar en la ciudad indicada (variando entre café/desayuno, comida típica y cena). Prioriza lugares emblemáticos y famosos de la ciudad.
Devuelve ÚNICAMENTE un JSON válido sin markdown con esta estructura:
{
  "restaurantes": [
    {
      "nombre": "Nombre real del restaurante o café",
      "descripcion": "Frase corta y editorial en español de México (máx. 90 caracteres) sobre su cocina y ambiente.",
      "detalles": "Código de vestimenta y espacio (máx. 45 caracteres, ej. Casual chic · Terraza)"
    }
  ]
}
Solo lugares reales que existan en esa ciudad. Nunca inventes nombres.`,
      messages: [{ role: "user", content: `Ciudad: ${ciudad}` }],
    })

    const raw = message.content.find((b) => b.type === "text")?.text.trim() ?? ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean) as {
      restaurantes?: { nombre?: string; descripcion?: string; detalles?: string }[]
    }

    const lista = Array.isArray(parsed?.restaurantes)
      ? parsed.restaurantes.filter((r) => typeof r.nombre === "string" && r.nombre.trim().length > 1).slice(0, 7)
      : []

    // Buscar fotos reales de cada lugar en Wikimedia Commons en paralelo + fotos reales de restaurantes/cafés de la ciudad como respaldo
    const [fotosPorLugar, fotosAmbienteCiudad] = await Promise.all([
      Promise.all(
        lista.map(async (r) => {
          const nombre = r.nombre!.trim().slice(0, 80)
          const fotos = await buscarFotosCommons(`${nombre} ${ciudadSimple}`, 4)
          return { r, nombre, fotoExacta: fotos[0] ?? null }
        })
      ),
      buscarFotosCommons(`restaurant OR cafe ${ciudadSimple}`, 8),
    ])

    const urlsUsadas = new Set<string>()
    const conFotoExacta: LugarSugerido[] = []
    const sinFotoExacta: { r: { descripcion?: string; detalles?: string }; nombre: string; idx: number }[] = []

    fotosPorLugar.forEach(({ r, nombre, fotoExacta }, idx) => {
      if (fotoExacta && !urlsUsadas.has(fotoExacta)) {
        urlsUsadas.add(fotoExacta)
        conFotoExacta.push({
          id: `gastro-${clave.slice(0, 16)}-${idx}`,
          nombre,
          categoria: "Gastronomía",
          descripcion: (r.descripcion ?? "Restaurante recomendado en tu destino.").trim().slice(0, 110),
          detalles: (r.detalles ?? "Casual chic · Restaurante").trim().slice(0, 50),
          imagen: fotoExacta,
        })
      } else {
        sinFotoExacta.push({ r, nombre, idx })
      }
    })

    // Priorizar los que tienen foto exacta del restaurante; completar hasta 4 con fotos reales de restaurantes/cafés de la misma ciudad
    const lugares: LugarSugerido[] = [...conFotoExacta.slice(0, 4)]
    for (const item of sinFotoExacta) {
      if (lugares.length >= 4) break
      const fotoRespaldo = fotosAmbienteCiudad.find((u) => !urlsUsadas.has(u)) ?? null
      if (fotoRespaldo) urlsUsadas.add(fotoRespaldo)
      lugares.push({
        id: `gastro-${clave.slice(0, 16)}-${item.idx}`,
        nombre: item.nombre,
        categoria: "Gastronomía",
        descripcion: (item.r.descripcion ?? "Restaurante recomendado en tu destino.").trim().slice(0, 110),
        detalles: (item.r.detalles ?? "Casual chic · Restaurante").trim().slice(0, 50),
        imagen: fotoRespaldo,
      })
    }

    if (lugares.length > 0) cacheGastro.set(clave, lugares)
    return NextResponse.json({ lugares })
  } catch (err) {
    console.error("[/api/planificacion/gastronomia]", err)
    return NextResponse.json({ lugares: [] })
  }
}
