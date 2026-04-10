import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { clima, ocasion, prendas } = await req.json()

    const prendasContext =
      prendas?.length > 0
        ? `El usuario tiene estas prendas en su armario: ${prendas
          .map((p: { name: string; category: string }) => `${p.name} (${p.category})`)
          .join(", ")}.`
        : "El usuario aún no tiene prendas cargadas. Sugiere outfits genéricos de lujo y tendencia."

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `Eres una estilista experta de Clossapp. Tu tono es girly, cool y aesthetic. 
Analiza las prendas del usuario y sugiere 3 outfits basados en el clima y la ocasión indicados.
Responde SIEMPRE en formato JSON puro, sin texto adicional, sin markdown, sin bloques de código.
Estructura exacta requerida:
{"outfits":[{"titulo":"","descripcion":"","prendas_usadas":[""]},{"titulo":"","descripcion":"","prendas_usadas":[""]},{"titulo":"","descripcion":"","prendas_usadas":[""]}]}`,
      messages: [
        {
          role: "user",
          content: `Clima: ${clima}. Ocasión: ${ocasion}. ${prendasContext} Genera exactamente 3 outfits.`,
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error("[/api/recommend]", err)
    return NextResponse.json(
      { error: "Nuestra estilista está tomando un matcha, intenta en un momento ☕" },
      { status: 500 }
    )
  }
}
