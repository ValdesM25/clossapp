import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { MAX_IMAGENES, MIN_IMAGENES } from "@/constants/tasacion"
import type { PrendaAnalysis, PrendaVentaAnalysis } from "@/types/analisis"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Nada de este módulo debe importarse desde un componente cliente: arrastraría
// el SDK de Anthropic al bundle del navegador. Las constantes viven en
// @/constants/tasacion y los tipos en @/types/analisis.

type Modo = "alta" | "venta"
type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

const SISTEMA_ALTA = `Eres un analista de moda experto. Analiza la imagen de esta prenda y devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura: { "nombre": "Nombre descriptivo corto, ej. Blazer de Lino Negro", "categoria": "Top, Bottom, Calzado, Outerwear o Accesorio", "color_principal": "Color predominante", "estilo": "Ej. Minimalista, Business, Casual", "descripcion": "Breve descripción de corte y material" }. No incluyas markdown ni texto adicional.`

const SISTEMA_VENTA = `Eres un analista de moda experto tasando una prenda de segunda mano para un marketplace mexicano. Recibirás varias fotos de LA MISMA prenda, tomadas desde distintos ángulos: frente, espalda, lateral y etiqueta, y posiblemente acercamientos adicionales. Úsalas en conjunto — cada ángulo revela desperfectos que los otros no muestran.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "nombre": "Nombre descriptivo corto, ej. Blazer de Lino Negro",
  "categoria": "Top, Bottom, Calzado, Outerwear o Accesorio",
  "color_principal": "Color predominante",
  "estilo": "Ej. Minimalista, Business, Casual",
  "descripcion": "Breve descripción de corte y material",
  "descripcion_venta": "Descripción de 2 a 3 frases orientada a quien va a comprar: material, corte, caída, con qué combina y estado general. Honesta, sin exagerar.",
  "precio_estimado_mxn": { "min": 0, "max": 0, "sugerido": 0 },
  "defectos": [ { "descripcion": "Qué se ve y en qué parte de la prenda", "severidad": "leve" } ],
  "etiquetas_originalidad": ["Texto de etiquetas de marca, talla o composición que alcances a leer en las fotos"],
  "aptitud": { "apto_venta": true, "apto_donacion": true, "motivo": "Una frase explicando el veredicto" }
}

Reglas de inspección:
- Revisa cada foto buscando: manchas, decoloración, pilling, deshilachados, roturas, costuras abiertas, cierres o botones dañados, estiramiento y desgaste en puños, cuellos y dobladillos.
- Reporta sólo lo que efectivamente veas en las fotos. Nunca inventes un desperfecto ni lo supongas por el tipo de prenda.
- Si un ángulo sale borroso o mal iluminado y no te permite evaluar esa zona, dilo en el "motivo" en vez de asumir que está en buen estado.

Reglas de tasación:
- Todos los precios van en PESOS MEXICANOS (MXN), como números enteros, sin símbolo ni separadores.
- Estima el precio de reventa realista en México para una prenda usada en ese estado, no el precio de retail nuevo.
- Los defectos SÍ afectan el precio: descuenta según su severidad. "leve" es desgaste normal, "moderado" se nota de cerca, "notorio" es visible a primera vista.
- "sugerido" debe quedar entre "min" y "max".
- Las etiquetas de originalidad son SÓLO informativas: transcríbelas si las ves, pero NO ajustes el precio por ellas.
- Si no detectas defectos, devuelve un arreglo vacío. Si no ves etiquetas legibles, devuelve un arreglo vacío.

Reglas de aptitud:
- "apto_venta" es false cuando el deterioro es tal que ponerla a la venta decepcionaría a quien la compre: roturas, manchas que no salen, deformación permanente o varios desperfectos notorios juntos.
- "apto_donacion" es false sólo si la prenda ya no está en condiciones dignas de uso. El estándar es más bajo que el de venta: una prenda con desgaste visible pero íntegra sigue sirviendo para donar.
- Cuando "apto_venta" sea false pero "apto_donacion" true, el "motivo" debe sugerir explícitamente la donación como alternativa.
- El "motivo" es una sola frase, directa y sin rodeos, dirigida a la persona dueña de la prenda.

No incluyas markdown ni texto adicional.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imagesBase64, mediaType, user_id, modo } = await req.json()

    if (!user_id || user_id === "guest") {
      return NextResponse.json(
        { error: "Funciones de IA exclusivas para cuentas premium/registradas" },
        { status: 403 }
      )
    }

    // Acepta una sola imagen (alta de prenda) o varias (publicación en venta).
    const imagenes: string[] = Array.isArray(imagesBase64) && imagesBase64.length
      ? imagesBase64
      : imageBase64
        ? [imageBase64]
        : []

    if (!imagenes.length) {
      return NextResponse.json({ error: "imageBase64 requerido" }, { status: 400 })
    }

    if (imagenes.length > MAX_IMAGENES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_IMAGENES} fotos por prenda` },
        { status: 400 }
      )
    }

    const esVenta = (modo as Modo) === "venta"

    // Con menos ángulos la inspección de desperfectos no es confiable, y un
    // veredicto de aptitud a ciegas es peor que no darlo.
    if (esVenta && imagenes.length < MIN_IMAGENES) {
      return NextResponse.json(
        { error: `Se necesitan al menos ${MIN_IMAGENES} fotos para tasar` },
        { status: 400 }
      )
    }

    const media = (mediaType ?? "image/jpeg") as MediaType

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: esVenta ? 1024 : 512,
      system: esVenta ? SISTEMA_VENTA : SISTEMA_ALTA,
      messages: [
        {
          role: "user",
          content: [
            ...imagenes.map((data: string) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: media, data },
            })),
            {
              type: "text" as const,
              text: esVenta
                ? `Analiza y tasa esta prenda a partir de ${imagenes.length === 1 ? "esta foto" : `estas ${imagenes.length} fotos`}.`
                : "Analiza esta prenda.",
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean)

    return NextResponse.json(esVenta ? normalizarVenta(parsed) : (parsed as PrendaAnalysis))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[/api/analyze-prenda]", msg)
    return NextResponse.json({ error: "Error analizando la prenda" }, { status: 500 })
  }
}

/**
 * El precio es una sugerencia editable, nunca un avalúo — pero aun así no debe
 * llegar incoherente a la interfaz. Ordena el rango y encierra el sugerido
 * dentro de él por si el modelo devuelve valores cruzados.
 */
function normalizarVenta(parsed: PrendaVentaAnalysis): PrendaVentaAnalysis {
  const p = parsed.precio_estimado_mxn ?? { min: 0, max: 0, sugerido: 0 }
  const min = Math.max(0, Math.round(Number(p.min) || 0))
  const max = Math.max(min, Math.round(Number(p.max) || 0))
  const sugerido = Math.min(max, Math.max(min, Math.round(Number(p.sugerido) || 0)))

  const a = parsed.aptitud

  return {
    ...parsed,
    precio_estimado_mxn: { min, max, sugerido },
    defectos: Array.isArray(parsed.defectos) ? parsed.defectos : [],
    etiquetas_originalidad: Array.isArray(parsed.etiquetas_originalidad)
      ? parsed.etiquetas_originalidad
      : [],
    // Ante una respuesta incompleta se asume apta: el veredicto es una ayuda,
    // no un bloqueo, y no debe impedir publicar por un fallo del modelo.
    aptitud: {
      apto_venta: a?.apto_venta !== false,
      apto_donacion: a?.apto_donacion !== false,
      motivo: typeof a?.motivo === "string" ? a.motivo : "",
    },
  }
}
