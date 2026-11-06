import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { exigirCuota, leerEstilo } from "@/lib/cuota.server"
import { bloquePerfilPrompt } from "@/lib/estilo"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// shortcut: con más de 100 prendas solo entran las más recientes; si premium
// arma armarios grandes, elegir por categoría en vez de por fecha.
const MAX_PRENDAS_PROMPT = 100
const corto = (v: unknown, max = 120) => String(v ?? "").slice(0, max)

export type GeneratedOutfit = {
  titulo: string
  descripcion: string
  prenda_ids: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { contexto } = await req.json()

    const { bloqueo, supabase, userId } = await exigirCuota("outfit")
    if (bloqueo) return bloqueo

    // El armario sale de la base y no del body: así nadie infla el prompt
    // mandando un inventario gigante. Los campos se recortan porque el usuario
    // puede escribir lo que quiera en sus propias prendas.
    const { data: prendas, error } = await supabase
      .from("prendas")
      .select("id, name, category, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_PRENDAS_PROMPT)
    if (error) throw error
    if (!prendas?.length) {
      return NextResponse.json({ error: "Agrega prendas a tu armario primero" }, { status: 400 })
    }
    const perfil = bloquePerfilPrompt(await leerEstilo(supabase, userId))

    const wardrobeJson = JSON.stringify(
      prendas.map((p) => ({
        id: p.id,
        name: corto(p.name),
        category: corto(p.category),
        ...Object.fromEntries(
          Object.entries((p.metadata ?? {}) as Record<string, unknown>).slice(0, 6).map(([k, v]) => [corto(k, 30), corto(v)])
        ),
      }))
    )

    const message = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      system: `Eres un estilista de alta moda. Recibirás un contexto (clima/evento) y un inventario en JSON. Crea 3 opciones de outfits coherentes usando SOLO las prendas del inventario. Devuelve ÚNICAMENTE un objeto JSON con esta estructura: { "outfits": [ { "titulo": "Nombre del look", "descripcion": "Por qué funciona este conjunto", "prenda_ids": ["id1", "id2"] } ] }. No uses markdown.${perfil}`,
      messages: [
        {
          role: "user",
          content: `Contexto: ${corto(contexto, 300) || "Outfit casual del día"}\n\nInventario: ${wardrobeJson}`,
        },
      ],
    })

    // Con razonamiento activo el primer bloque puede ser "thinking": se toma el de texto.
    const raw = message.content.find((b) => b.type === "text")?.text.trim() ?? ""
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error("[/api/generate-outfits]", err)
    return NextResponse.json({ error: "Error generando outfits" }, { status: 500 })
  }
}
