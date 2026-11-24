// Constantes y utilidades de formato para la experiencia editorial de viajes.
// Las fotos de ciudades y lugares recomendados se obtienen en tiempo real desde
// Wikipedia / Wikimedia Commons (lib/destinos.ts), sin imágenes al azar.

export type CategoriaLugar = "Arte y cultura" | "Al aire libre" | "Barrios con encanto" | "Gastronomía"

export interface LugarSugerido {
  id: string
  nombre: string
  categoria: CategoriaLugar
  descripcion: string
  detalles: string
  imagen: string | null
}

export const INTERESES_VIAJE = [
  "Arte y cultura",
  "Paseos",
  "Gastronomía",
  "Al aire libre",
  "Barrios con encanto",
] as const

export const FILTROS_LUGARES: ("Para ti" | CategoriaLugar)[] = [
  "Para ti",
  "Arte y cultura",
  "Al aire libre",
  "Barrios con encanto",
  "Gastronomía",
]

export const CIUDADES_DESTACADAS = [
  { nombre: "Ciudad de México, México", lat: 19.4326, lon: -99.1332 },
  { nombre: "Oaxaca de Juárez, Oaxaca, México", lat: 17.0654, lon: -96.7236 },
  { nombre: "París, Francia", lat: 48.8566, lon: 2.3522 },
  { nombre: "Madrid, España", lat: 40.4168, lon: -3.7038 },
]

export function ciudadCorta(nombreCompleto: string): string {
  return nombreCompleto.split(",")[0]?.trim() || nombreCompleto
}

/** Convierte lat/lon decimales en formato editorial: 48°51' N  2°21' E */
export function formatearCoordenadas(lat: number, lon: number): string {
  const fmt = (val: number, pos: string, neg: string) => {
    const abs = Math.abs(val)
    const deg = Math.floor(abs)
    const min = Math.round((abs - deg) * 60)
    return `${deg}°${String(min).padStart(2, "0")}' ${val >= 0 ? pos : neg}`
  }
  return `${fmt(lat, "N", "S")}  ${fmt(lon, "E", "O")}`
}

const MESES_MAYUS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

/** "12–17 MAY 2027" o "28 ABR–2 MAY 2027" */
export function rangoFechasEditorial(inicio: string, fin: string): string {
  if (!inicio || !fin) return ""
  const a = new Date(`${inicio}T00:00:00Z`)
  const b = new Date(`${fin}T00:00:00Z`)
  const mesA = MESES_MAYUS[a.getUTCMonth()]
  const mesB = MESES_MAYUS[b.getUTCMonth()]
  const anio = b.getUTCFullYear()
  if (inicio === fin) return `${b.getUTCDate()} ${mesB} ${anio}`
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${mesB} ${anio}`
  }
  return `${a.getUTCDate()} ${mesA}–${b.getUTCDate()} ${mesB} ${anio}`
}
