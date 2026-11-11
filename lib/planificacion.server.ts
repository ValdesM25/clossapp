import Anthropic from "@anthropic-ai/sdk"
import { bloquePerfilPrompt } from "@/lib/estilo"
import type { EstiloPerfil } from "@/constants/onboarding"
import type { Lugar } from "@/lib/clima"
import { validarOutfits, type Momento, type MomentoPlan, type TipoPlan } from "@/lib/planificacion"

// Solo servidor: ningún componente cliente debe importar este archivo (ver types/analisis.ts).

export const MODELO_PLAN = "claude-sonnet-5-5"

// La ruta tiene maxDuration = 120: sin reintentos del SDK y con un plazo total,
// para que un corte lance dentro del try de la ruta y se devuelva la cuota.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 })
const PLAZO_MS = 100_000
const MIN_SEGUNDA_MS = 20_000

export class ErrorPlanIA extends Error {}

export type PrendaPlan = {
  id: number | string; name: string | null; category: string | null
  color: string | null; style: string | null; metadata: Record<string, unknown> | null
}
type YaPlaneado = { fecha: string; momento: Momento; titulo: string; prenda_ids: string[] }
type Propuesta = { momento_id: string; titulo: string; descripcion: string; prenda_ids: string[]; faltante: unknown }

const corto = (v: unknown, max = 60) => String(v ?? "").slice(0, max)
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

const SISTEMA = `Eres estilista. Armas un outfit por cada momento_id que te pasan, usando solo ids del inventario.
- Toma en cuenta la actividad, el clima (mínima, máxima, lluvia) y si es de día o de noche.
- Cada outfit lleva una parte de arriba y una de abajo, o un vestido; un solo calzado; abrigo si la mínima es de 12 °C o menos o si llueve; de 2 a 7 prendas.
- No repitas un outfit completo de los "ya planeados".
- En viajes, prefiere repetir prendas versátiles en días distintos para que la maleta sea ligera, sin repetir el outfit completo.
- Si para una actividad no hay nada adecuado en el armario (por ejemplo, ropa formal para una boda), arma lo mejor posible y llena "faltante" con la categoría y un motivo corto; si no falta nada, "faltante" es null.
- Título de hasta 40 caracteres y descripción de hasta 160, de tú, en español de México. No inventes prendas.`

const ESQUEMA = {
  type: "object", additionalProperties: false, required: ["outfits"],
  properties: {
    outfits: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["momento_id", "titulo", "descripcion", "prenda_ids", "faltante"],
        properties: {
          momento_id: { type: "string" },
          titulo: { type: "string" },
          descripcion: { type: "string" },
          prenda_ids: { type: "array", items: { type: "string" } },
          faltante: {
            anyOf: [
              { type: "null" },
              {
                type: "object", additionalProperties: false, required: ["categoria", "motivo"],
                properties: { categoria: { type: "string" }, motivo: { type: "string" } },
              },
            ],
          },
        },
      },
    },
  },
}

/** Inventario para el prompt. Las prendas llegan ya ordenadas (created_at e id descendentes) para que el caché funcione. */
function inventarioPrompt(prendas: PrendaPlan[]) {
  return prendas.map((p) => ({
    id: String(p.id),
    nombre: corto(p.name),
    categoria: corto(p.category),
    color: corto(p.color || p.metadata?.color_principal),
    estilo: corto(p.style || p.metadata?.estilo),
  }))
}

async function llamar(
  system: string, inventario: string, datos: string, timeout: number
): Promise<{ outfits: unknown; uso: Anthropic.Usage }> {
  const msg = await client.messages.create(
    {
      model: MODELO_PLAN,
      max_tokens: 16000,
      // Sin `thinking`: Sonnet 5.5 usa thinking adaptativo por defecto y "disabled" da 400.
      output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
      system,
      messages: [{
        role: "user",
        content: [
          // Primero y con caché: los bloques siguientes del mismo plan lo leen del caché.
          { type: "text", text: `Inventario:\n${inventario}`, cache_control: { type: "ephemeral" } },
          { type: "text", text: datos },
        ],
      }],
    },
    { timeout }
  )
  if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") {
    throw new ErrorPlanIA(`La IA no terminó: ${msg.stop_reason}`)
  }
  // Puede haber bloques "thinking" antes del texto.
  const texto = msg.content.find((b) => b.type === "text")?.text
  if (!texto) throw new ErrorPlanIA("La IA no devolvió texto")
  return { outfits: (JSON.parse(texto) as { outfits?: unknown }).outfits, uso: msg.usage }
}

/**
 * Pide los outfits de un bloque; si alguno no pasa la revisión, hace una segunda
 * llamada solo con esos momentos. Devuelve las propuestas mezcladas sin validar
 * (la ruta las vuelve a revisar) y el `usage` de cada llamada.
 */
export async function generarOutfitsPlan(datos: {
  plan: { nombre: string; tipo: TipoPlan; lugar: Lugar | null }
  momentos: MomentoPlan[]
  prendas: PrendaPlan[]
  yaPlaneados: YaPlaneado[]
  previos: string[][]
  estilo: EstiloPerfil | null
}): Promise<{ propuestas: unknown; usos: Anthropic.Usage[] }> {
  const fin = Date.now() + PLAZO_MS
  const system = SISTEMA + bloquePerfilPrompt(datos.estilo)
  const inventario = JSON.stringify(inventarioPrompt(datos.prendas))
  const paraValidar = datos.prendas.map((p) => ({ id: String(p.id), category: p.category ?? "" }))

  const datosBloque = (momentos: MomentoPlan[], yaPlaneados: YaPlaneado[], correcciones = "") =>
    JSON.stringify({
      plan: { nombre: datos.plan.nombre, tipo: datos.plan.tipo, lugar: datos.plan.lugar?.nombre ?? null },
      ya_planeados: yaPlaneados,
      momentos: momentos.map((m) => ({
        momento_id: m.id,
        fecha: m.fecha,
        dia_semana: DIAS[new Date(`${m.fecha}T00:00:00Z`).getUTCDay()],
        momento: m.momento,
        actividad: m.actividad.trim() || "Día casual",
        clima: m.clima ? { min: m.clima.min, max: m.clima.max, texto: m.clima.texto, lluvia: m.clima.lluvia } : null,
      })),
    }) + correcciones

  const primera = await llamar(system, inventario, datosBloque(datos.momentos, datos.yaPlaneados), fin - Date.now())
  const { validos, errores } = validarOutfits({
    propuestas: primera.outfits, momentos: datos.momentos, inventario: paraValidar, previos: datos.previos,
  })
  const buenas: Propuesta[] = Object.entries(validos).map(([momento_id, v]) => ({ momento_id, ...v.outfit, faltante: v.faltante }))
  const fallidos = datos.momentos.filter((m) => errores[m.id])
  if (!fallidos.length) return { propuestas: buenas, usos: [primera.uso] }

  if (fin - Date.now() < MIN_SEGUNDA_MS) {
    console.error("[planificacion] sin tiempo para corregir", Object.keys(errores).length)
    return { propuestas: buenas, usos: [primera.uso] }
  }
  const correcciones = "\n\nCorrige estos problemas:\n" + fallidos.map((m) => `- ${m.id}: ${errores[m.id]}`).join("\n")
  const planeados = [
    ...datos.yaPlaneados,
    ...datos.momentos.filter((m) => validos[m.id]).map((m) => ({
      fecha: m.fecha, momento: m.momento, titulo: validos[m.id].outfit.titulo, prenda_ids: validos[m.id].outfit.prenda_ids,
    })),
  ]
  try {
    const segunda = await llamar(system, inventario, datosBloque(fallidos, planeados, correcciones), fin - Date.now())
    const deFallidos = new Set(fallidos.map((m) => m.id))
    const nuevas = (Array.isArray(segunda.outfits) ? segunda.outfits : []).filter(
      (p) => deFallidos.has((p as { momento_id?: unknown })?.momento_id as string)
    )
    return { propuestas: [...buenas, ...nuevas], usos: [primera.uso, segunda.uso] }
  } catch (err) {
    // Lo bueno de la primera ya está pagado: se guarda y solo se pierde la corrección.
    console.error("[planificacion] falló la corrección", err)
    return { propuestas: buenas, usos: [primera.uso] }
  }
}
