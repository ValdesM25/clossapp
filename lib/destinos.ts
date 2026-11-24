// Consulta real de fotos de ciudades y lugares turísticos cercanos usando
// Wikipedia / Wikimedia Commons (gratis, sin API key y con CORS oficial).

import type { Lugar } from "./clima"
import type { CategoriaLugar, LugarSugerido } from "@/constants/viajes-lugares"
import { ciudadCorta } from "@/constants/viajes-lugares"

export interface DestinoReal {
  imagen: string | null
  frase: string
  subtitulo: string
  lugares: LugarSugerido[]
}

interface WikiPage {
  pageid?: number
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string; width?: number; height?: number }
}

const cacheDestinos = new Map<string, DestinoReal>()

const IMAGEN_INVALIDA = /\.(svg|gif)(\?|$)|escudo|coat_of_arms|flag_of|bandera|logo|map|mapa|locator|location|diagram|blank|portrait|signature/i
const TITULO_EXCLUIDO = /\b(universidad|escuela|colegio|instituto tecnol|hospital|clínica|aeropuerto|estación|metro |municipio|estado de |ayuntamiento|gobierno|prisión|cárcel|cementerio|panteón|estadio|arena |elecciones|arquidiócesis|diócesis|radio |televisión|periódico|batalla de|sitio de|masacre|terremoto|sismo|línea \d|anexo:)\b/i

function esFotoValida(url: string | undefined): url is string {
  if (!url) return false
  return !IMAGEN_INVALIDA.test(url)
}

function limpiarTitulo(titulo: string): string {
  return titulo.replace(/\s*\([^)]*\)\s*$/, "").trim()
}

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function clasificarLugar(titulo: string, texto: string): { categoria: CategoriaLugar; detalles: string; prioridad: number } {
  const s = normalizar(`${titulo} ${texto}`)

  if (/(mercado|gastronomia|restaurante|cafe |cafeteria|bodega|vinedo|cantina|cocina)/.test(s)) {
    return { categoria: "Gastronomía", detalles: "Paseo urbano · Interior y terraza", prioridad: 3 }
  }
  if (/(piramide|zona arqueologica|ruinas|parque|jardin|bosque|playa|mirador|lago|laguna|cascada|volcan|montana|malecon|isla|cenote|reserva|alameda)/.test(s)) {
    return { categoria: "Al aire libre", detalles: "Caminata media · Exterior", prioridad: 4 }
  }
  if (/(museo|galeria|teatro|palacio|catedral|templo|basilica|iglesia|exconvento|convento|castillo|monumento|biblioteca|centro cultural|bellas artes|arte|opera)/.test(s)) {
    return { categoria: "Arte y cultura", detalles: "Caminata suave · Interior y arquitectura", prioridad: 4 }
  }
  if (/(barrio|colonia|centro historico|plaza|zocalo|calle|avenida|paseo|puente|fuente|pueblo|callejon|arco|torre|portales|andador)/.test(s)) {
    return { categoria: "Barrios con encanto", detalles: "Caminata larga · Exterior", prioridad: 3 }
  }
  return { categoria: "Arte y cultura", detalles: "Paseo urbano · Destacado", prioridad: 1 }
}

function resumirDescripcion(page: WikiPage, categoria: CategoriaLugar): string {
  const raw = (page.description || page.extract || "").replace(/\s+/g, " ").trim()
  if (!raw) {
    if (categoria === "Al aire libre") return "Recorrido al aire libre con prendas cómodas y capas ligeras."
    if (categoria === "Gastronomía") return "Sabores locales y un look relajado con estilo."
    if (categoria === "Barrios con encanto") return "Calles con historia ideales para recorrer a pie."
    return "Arte, arquitectura y un look cómodo a la altura."
  }
  const primera = raw.split(/(?<=[.!?])\s+/)[0] || raw
  const capitalizada = primera.charAt(0).toUpperCase() + primera.slice(1)
  return capitalizada.length > 110 ? `${capitalizada.slice(0, 107).trim()}…` : capitalizada
}

async function fetchFotoCiudad(nombreLugar: string, lang: "es" | "en"): Promise<string | null> {
  const ciudad = ciudadCorta(nombreLugar)
  const queries = [nombreLugar, ciudad]
  for (const q of queries) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
      if (!res.ok) continue
      const data = await res.json()
      const pages = Object.values((data.query?.pages ?? {}) as Record<string, WikiPage>)
      for (const p of pages) {
        if (esFotoValida(p.thumbnail?.source)) return p.thumbnail.source
      }
    } catch {
      // continuar con siguiente consulta
    }
  }
  return null
}

async function fetchLugaresWiki(lat: number, lon: number, ciudad: string, lang: "es" | "en"): Promise<LugarSugerido[]> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=40&prop=pageimages|description|extracts&piprop=thumbnail&pithumbsize=720&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const pages = Object.values((data.query?.pages ?? {}) as Record<string, WikiPage>)
    const ciudadNorm = normalizar(ciudad)

    const candidatos: (LugarSugerido & { _score: number })[] = []
    const titulosVistos = new Set<string>()

    for (const p of pages) {
      if (!p.title || !esFotoValida(p.thumbnail?.source)) continue
      const limpio = limpiarTitulo(p.title)
      const norm = normalizar(limpio)
      if (!limpio || norm === ciudadNorm || norm === `${ciudadNorm} de juarez` || titulosVistos.has(norm)) continue
      if (TITULO_EXCLUIDO.test(p.title) || TITULO_EXCLUIDO.test(p.description ?? "")) continue

      const { categoria, detalles, prioridad } = clasificarLugar(limpio, `${p.description ?? ""} ${p.extract ?? ""}`)
      titulosVistos.add(norm)
      candidatos.push({
        id: `wiki-${lang}-${p.pageid ?? norm}`,
        nombre: limpio,
        categoria,
        descripcion: resumirDescripcion(p, categoria),
        detalles,
        imagen: p.thumbnail.source,
        _score: prioridad,
      })
    }

    return candidatos
      .sort((a, b) => b._score - a._score)
      .slice(0, 9)
      .map(({ _score: _, ...item }) => item)
  } catch {
    return []
  }
}

/** Obtiene foto real de la ciudad y lugares reales cercanos con sus fotografías reales. */
export async function obtenerDestinoReal(lugar: Lugar): Promise<DestinoReal> {
  const clave = `${lugar.lat.toFixed(3)},${lugar.lon.toFixed(3)}`
  const enCache = cacheDestinos.get(clave)
  if (enCache) return enCache

  const ciudad = ciudadCorta(lugar.nombre)
  const [fotoEs, lugaresEs] = await Promise.all([
    fetchFotoCiudad(lugar.nombre, "es"),
    fetchLugaresWiki(lugar.lat, lugar.lon, ciudad, "es"),
  ])

  const imagen = fotoEs ?? (await fetchFotoCiudad(lugar.nombre, "en"))
  let lugares = lugaresEs
  if (lugares.length < 4) {
    const lugaresEn = await fetchLugaresWiki(lugar.lat, lugar.lon, ciudad, "en")
    const vistos = new Set(lugares.map((l) => normalizar(l.nombre)))
    for (const l of lugaresEn) {
      if (!vistos.has(normalizar(l.nombre))) {
        lugares.push(l)
        vistos.add(normalizar(l.nombre))
      }
      if (lugares.length >= 9) break
    }
  }

  const resultado: DestinoReal = {
    imagen: imagen ?? lugares[0]?.imagen ?? null,
    frase: `${ciudad}, siempre es buena idea.`,
    subtitulo: "Un café, un museo, una calle por descubrir.",
    lugares,
  }
  cacheDestinos.set(clave, resultado)
  return resultado
}
