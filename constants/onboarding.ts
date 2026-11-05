/**
 * Preguntas del recorrido de estilo que se muestra al registrarse.
 * Las respuestas se guardan en perfiles.estilo (jsonb) y una parte entra al
 * prompt de outfits (ver lib/estilo.ts). Agregar una pregunta = agregar un
 * campo aquí; la pantalla se arma sola.
 */
export type EstiloPerfil = {
  ropa?: string
  estilos?: string[]
  colores_favoritos?: string[]
  colores_evitar?: string[]
  ocasiones?: string[]
  nunca_usaria?: string
  cuerpo?: string
  talla_superior?: string
  talla_inferior?: string
  talla_calzado?: string
  ciudad?: string
  clima?: string
  presupuesto?: string
  iconos?: string
  // Solo estadística: no entran al prompt.
  frecuencia_compra?: string
  lugares_compra?: string[]
}

export type CampoOnboarding = {
  key: keyof EstiloPerfil
  label: string
  tipo: "uno" | "varios" | "texto"
  opciones?: string[]
  /** Opciones que no se muestran a quien elige ropa masculina. */
  noMasculina?: string[]
  placeholder?: string
}

export type PasoOnboarding = {
  titulo: string
  subtitulo: string
  campos: CampoOnboarding[]
  /** No va en el registro: se pide después desde Inicio para que el alta sea corta. */
  despues?: boolean
}

/** inicial = al registrarse; despues = las preguntas pospuestas; todo = desde "Mi estilo". */
export type ModoOnboarding = "inicial" | "despues" | "todo"

export function pasosDe(modo: ModoOnboarding): PasoOnboarding[] {
  return modo === "todo" ? PASOS_ONBOARDING : PASOS_ONBOARDING.filter((p) => !!p.despues === (modo === "despues"))
}

/** true si no contestó ninguna de las preguntas pospuestas. */
export function faltanPreguntasDespues(estilo: EstiloPerfil | null): boolean {
  return pasosDe("despues").every((p) => p.campos.every((c) => {
    const v = estilo?.[c.key]
    return Array.isArray(v) ? v.length === 0 : !v
  }))
}

const COLORES = [
  "Negro", "Blanco", "Gris", "Beige / nude", "Café", "Azul marino", "Azul",
  "Verde", "Rojo", "Rosa", "Morado", "Amarillo", "Naranja", "Estampados",
]

export const PASOS_ONBOARDING: PasoOnboarding[] = [
  {
    titulo: "Tu estilo",
    subtitulo: "Así sabemos por dónde empezar a combinar.",
    campos: [
      { key: "ropa", label: "¿Qué ropa usas principalmente?", tipo: "uno", opciones: ["Femenina", "Masculina", "Mixta / sin género"] },
      {
        key: "estilos", label: "¿Qué estilos van contigo? Elige los que quieras.", tipo: "varios",
        opciones: ["Casual", "Formal / oficina", "Urbano / streetwear", "Minimalista", "Deportivo", "Clásico", "Bohemio", "Femenino / delicado", "Vanguardista"],
        noMasculina: ["Bohemio", "Femenino / delicado"],
      },
    ],
  },
  {
    titulo: "Colores",
    subtitulo: "Para que los outfits se parezcan a ti.",
    campos: [
      { key: "colores_favoritos", label: "Colores que te encantan", tipo: "varios", opciones: COLORES },
      { key: "colores_evitar", label: "Colores que prefieres evitar", tipo: "varios", opciones: COLORES },
    ],
  },
  {
    titulo: "Tu día a día",
    subtitulo: "Para pensar outfits para lo que de verdad haces.",
    campos: [
      {
        key: "ocasiones", label: "¿Para qué ocasiones te vistes seguido?", tipo: "varios",
        opciones: ["Trabajo / oficina", "Escuela", "Fiestas / noche", "Citas", "Eventos formales", "Gym / deporte", "Viajes", "Casa / día relajado"],
      },
      { key: "nunca_usaria", label: "¿Hay algo que nunca usarías?", tipo: "texto", placeholder: "Ej. cuadros, colores neón, cuello de tortuga" },
    ],
  },
  {
    titulo: "Cuerpo y tallas",
    subtitulo: "Opcional. Ayuda a sugerir cortes que te favorezcan.",
    despues: true,
    campos: [
      {
        key: "cuerpo", label: "¿Cómo describirías tu tipo de cuerpo?", tipo: "uno",
        opciones: ["Reloj de arena", "Triángulo (pera)", "Triángulo invertido", "Rectángulo", "Óvalo (manzana)", "Prefiero no decir"],
        noMasculina: ["Reloj de arena", "Triángulo (pera)"],
      },
      { key: "talla_superior", label: "Talla de parte de arriba", tipo: "texto", placeholder: "Ej. M" },
      { key: "talla_inferior", label: "Talla de parte de abajo", tipo: "texto", placeholder: "Ej. 30 o 7" },
      { key: "talla_calzado", label: "Talla de calzado", tipo: "texto", placeholder: "Ej. 24.5" },
    ],
  },
  {
    titulo: "Dónde vives",
    subtitulo: "El clima cambia todo lo que tiene sentido ponerse.",
    campos: [
      { key: "ciudad", label: "Ciudad", tipo: "texto", placeholder: "Ej. Saltillo" },
      { key: "clima", label: "¿Cómo es el clima casi siempre?", tipo: "uno", opciones: ["Caluroso", "Templado", "Frío", "Lluvioso", "Muy variable"] },
    ],
  },
  {
    titulo: "Inspiración",
    subtitulo: "Para afinar el tono de las sugerencias.",
    despues: true,
    campos: [
      {
        key: "presupuesto", label: "¿Cuánto sueles gastar por prenda?", tipo: "uno",
        opciones: ["Menos de $500", "$500 a $1,500", "$1,500 a $3,000", "Más de $3,000"],
      },
      { key: "iconos", label: "Alguien cuyo estilo te inspire", tipo: "texto", placeholder: "Ej. Zendaya, Bad Bunny, tu hermana" },
    ],
  },
  {
    titulo: "Cómo compras",
    subtitulo: "Nos ayuda a mejorar Clossapp para ti.",
    despues: true,
    campos: [
      {
        key: "frecuencia_compra", label: "¿Cada cuánto compras ropa nueva?", tipo: "uno",
        opciones: ["Cada semana", "Cada mes", "Cada 2 o 3 meses", "Pocas veces al año", "Casi nunca"],
      },
      {
        key: "lugares_compra", label: "¿Dónde compras? Elige los que quieras.", tipo: "varios",
        opciones: ["Tiendas físicas / plazas", "Tiendas en línea", "Segunda mano / bazar", "Marketplaces (Shein, Amazon…)", "Diseñadores locales"],
      },
    ],
  },
]
