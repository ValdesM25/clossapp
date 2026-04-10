import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type GeneratedOutfit = {
  titulo: string
  descripcion: string
  prenda_ids: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { contexto, wardrobe } = await req.json()

    if (!wardrobe?.length) {
      return NextResponse.json({ error: "Wardrobe vacío" }, { status: 400 })
    }

    const wardrobeJson = JSON.stringify(
      wardrobe.map((p: { id: string; name: string; category: string; metadata?: Record<string, string> | null }) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        ...(p.metadata ?? {}),
      }))
    )

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `Eres un estilista de alta moda. Recibirás un contexto (clima/evento) y un inventario en JSON. Crea 3 opciones de outfits coherentes usando SOLO las prendas del inventario. Devuelve ÚNICAMENTE un objeto JSON con esta estructura: { "outfits": [ { "titulo": "Nombre del look", "descripcion": "Por qué funciona este conjunto", "prenda_ids": ["id1", "id2"] } ] }. No uses markdown.`,
      messages: [
        {
          role: "user",
          content: `Contexto: ${contexto}\n\nInventario: ${wardrobeJson}`,
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error("[/api/generate-outfits]", err)
    return NextResponse.json({ error: "Error generando outfits" }, { status: 500 })
  }
}
