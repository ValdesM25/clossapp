// Catálogo curado de destinos y lugares sugeridos para la experiencia editorial de viajes.
// Si el usuario elige una ciudad que no está en el catálogo, se generan recomendaciones
// adaptadas al nombre de la ciudad para que el flujo funcione con cualquier destino del mundo.

export type CategoriaLugar = "Arte y cultura" | "Al aire libre" | "Barrios con encanto" | "Gastronomía"

export interface LugarSugerido {
  id: string
  nombre: string
  categoria: CategoriaLugar
  descripcion: string
  detalles: string
  imagen: string
}

export interface InfoDestino {
  imagen: string
  frase: string
  subtitulo: string
  lugares: LugarSugerido[]
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
  { nombre: "París, Francia", lat: 48.8566, lon: 2.3522 },
  { nombre: "Ciudad de México, México", lat: 19.4326, lon: -99.1332 },
  { nombre: "Oaxaca de Juárez, México", lat: 17.0654, lon: -96.7236 },
  { nombre: "Madrid, España", lat: 40.4168, lon: -3.7038 },
]

const CATALOGO: Record<string, InfoDestino> = {
  paris: {
    imagen: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=80",
    frase: "París, siempre es buena idea.",
    subtitulo: "Un café, un museo, una calle por descubrir.",
    lugares: [
      {
        id: "louvre",
        nombre: "Museo del Louvre",
        categoria: "Arte y cultura",
        descripcion: "Arte, arquitectura y un look a la altura.",
        detalles: "Caminata suave · Interior",
        imagen: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "montmartre",
        nombre: "Montmartre",
        categoria: "Barrios con encanto",
        descripcion: "Calles con historia y paradas para un café.",
        detalles: "Caminata larga · Adoquines",
        imagen: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "tullerias",
        nombre: "Jardín de las Tullerías",
        categoria: "Al aire libre",
        descripcion: "Una pausa verde en el corazón de París.",
        detalles: "Paseo tranquilo · Exterior",
        imagen: "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "le-marais",
        nombre: "Cafés en Le Marais",
        categoria: "Gastronomía",
        descripcion: "Boulangeries, galerías y terrazas con estilo.",
        detalles: "Paseo urbano · Interior y terraza",
        imagen: "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  cdmx: {
    imagen: "https://images.unsplash.com/photo-1518659526054-190340b32735?auto=format&fit=crop&w=1000&q=80",
    frase: "CDMX, siempre es buena idea.",
    subtitulo: "Historia, galerías y sobremesas sin prisa.",
    lugares: [
      {
        id: "teotihuacan",
        nombre: "Pirámides de Teotihuacán",
        categoria: "Al aire libre",
        descripcion: "Recorrido arqueológico con sol directo y viento matutino.",
        detalles: "Caminata larga · Terreno irregular",
        imagen: "https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "coyoacan",
        nombre: "Museo Frida Kahlo y Coyoacán",
        categoria: "Arte y cultura",
        descripcion: "Arte, plazas arboladas y un paseo relajado.",
        detalles: "Caminata media · Interior y exterior",
        imagen: "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "roma-condesa",
        nombre: "Roma Norte y Condesa",
        categoria: "Barrios con encanto",
        descripcion: "Arquitectura art déco, librerías y paradas para café.",
        detalles: "Paseo urbano · Exterior",
        imagen: "https://images.unsplash.com/photo-1568402102990-bc541580b59f?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "polanco",
        nombre: "Cena en Polanco",
        categoria: "Gastronomía",
        descripcion: "Cocina de autor y un look elevado para la noche.",
        detalles: "Dress code casual chic · Interior",
        imagen: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  oaxaca: {
    imagen: "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=1000&q=80",
    frase: "Oaxaca, siempre es buena idea.",
    subtitulo: "Cantera, textiles y atardeceres en terraza.",
    lugares: [
      {
        id: "monte-alban",
        nombre: "Visita a Monte Albán",
        categoria: "Al aire libre",
        descripcion: "Ruinas zapotecas en lo alto del valle con viento fresco.",
        detalles: "Caminata larga · Escalinatas",
        imagen: "https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "santo-domingo",
        nombre: "Centro y Santo Domingo",
        categoria: "Barrios con encanto",
        descripcion: "Calles empedradas, galerías y patios coloniales.",
        detalles: "Caminata media · Empedrado",
        imagen: "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "museo-textil",
        nombre: "Museo Textil de Oaxaca",
        categoria: "Arte y cultura",
        descripcion: "Diseño tradicional y arquitectura contemporánea.",
        detalles: "Caminata suave · Interior",
        imagen: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "cena-terraza",
        nombre: "Cena en terraza colonial",
        categoria: "Gastronomía",
        descripcion: "Gastronomía oaxaqueña bajo las estrellas.",
        detalles: "Noche fresca · Terraza",
        imagen: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export function ciudadCorta(nombreCompleto: string): string {
  return nombreCompleto.split(",")[0]?.trim() || nombreCompleto
}

export function obtenerInfoDestino(nombreDestino: string | null | undefined): InfoDestino {
  const n = normalizar(nombreDestino ?? "")
  if (n.includes("paris")) return CATALOGO.paris
  if (n.includes("ciudad de mexico") || n.includes("cdmx") || n.includes("mexico city")) return CATALOGO.cdmx
  if (n.includes("oaxaca")) return CATALOGO.oaxaca

  const ciudad = nombreDestino ? ciudadCorta(nombreDestino) : "París"
  if (!nombreDestino) return CATALOGO.paris

  return {
    imagen: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1000&q=80",
    frase: `${ciudad}, siempre es buena idea.`,
    subtitulo: "Un café, un museo, una calle por descubrir.",
    lugares: [
      {
        id: "centro-historico",
        nombre: `Centro histórico de ${ciudad}`,
        categoria: "Barrios con encanto",
        descripcion: "Recorrido a pie por las plazas y calles emblemáticas.",
        detalles: "Caminata larga · Exterior",
        imagen: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "museo-principal",
        nombre: "Museos y galerías",
        categoria: "Arte y cultura",
        descripcion: "Arte, arquitectura y un look cómodo a la altura.",
        detalles: "Caminata suave · Interior",
        imagen: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "parque-mirador",
        nombre: "Parque y mirador",
        categoria: "Al aire libre",
        descripcion: "Una pausa al aire libre con vistas de la ciudad.",
        detalles: "Paseo tranquilo · Exterior",
        imagen: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "cena-local",
        nombre: "Cena y gastronomía local",
        categoria: "Gastronomía",
        descripcion: "Sabores del destino con un toque elevado para la noche.",
        detalles: "Casual chic · Interior y terraza",
        imagen: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      },
    ],
  }
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
