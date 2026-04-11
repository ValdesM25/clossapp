import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type PrendaAnalysis = {
  nombre: string
  categoria: string
  color_principal: string
  estilo: string
  descripcion: string
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, user_id } = await req.json()

    if (!user_id || user_id === "guest") {
      return NextResponse.json(
        { error: "Funciones de IA exclusivas para cuentas premium/registradas" },
        { status: 403 }
      )
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 requerido" }, { status: 400 })
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `Eres un analista de moda experto. Analiza la imagen de esta prenda y devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura: { "nombre": "Nombre descriptivo corto, ej. Blazer de Lino Negro", "categoria": "Top, Bottom, Calzado, Outerwear o Accesorio", "color_principal": "Color predominante", "estilo": "Ej. Minimalista, Business, Casual", "descripcion": "Breve descripción de corte y material" }. No incluyas markdown ni texto adicional.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: "Analiza esta prenda." },
          ],
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed: PrendaAnalysis = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[/api/analyze-prenda]", msg)
    return NextResponse.json({ error: "Error analizando la prenda" }, { status: 500 })
  }
}
