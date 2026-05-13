import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

// Categorías permitidas para renta — solo vestidos y accesorios
const CATEGORIAS_RENTA = ["vestido", "accesorio", "accesorios", "bolsa", "joyería", "lentes"]

function categoriaPermiteRenta(category: string): boolean {
  const lower = category.toLowerCase()
  return CATEGORIAS_RENTA.some((c) => lower.includes(c))
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { prenda_id, precio_renta, user_id } = await req.json()

    if (!user_id || user_id === "guest") {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }
    if (!prenda_id || !precio_renta) {
      return NextResponse.json({ error: "prenda_id y precio_renta son requeridos" }, { status: 400 })
    }

    // Fetch the prenda to validate category
    const { data: prenda, error: fetchError } = await supabase
      .from("prendas").select("id, category, user_id").eq("id", prenda_id).single()

    if (fetchError || !prenda) {
      return NextResponse.json({ error: "Prenda no encontrada" }, { status: 404 })
    }
    if (prenda.user_id !== user_id) {
      return NextResponse.json({ error: "No tienes permiso sobre esta prenda" }, { status: 403 })
    }
    if (!categoriaPermiteRenta(prenda.category)) {
      return NextResponse.json(
        { error: "Solo vestidos y accesorios aplican para renta" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from("prendas")
      .update({ en_renta: true, precio_renta: parseFloat(precio_renta) })
      .eq("id", prenda_id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[/api/renta]", err)
    return NextResponse.json({ error: "Error al publicar para renta" }, { status: 500 })
  }
}
