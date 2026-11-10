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
    const { prenda_id, precio_renta } = await req.json()
    // El dueño sale de la sesión, no del body (que se puede falsificar).
    const { data: { user } } = await supabase.auth.getUser()
    const user_id = user?.id

    if (!user_id) {
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
    // Los avisos del trigger de la base (plan o cuenta de cobro) llegan tal cual para que la app los explique.
    const msg = (err as { message?: string } | null)?.message ?? ""
    if (/SIN_CUENTA_COBRO|PLAN_SIN_MARKETPLACE/.test(msg)) return NextResponse.json({ error: msg }, { status: 403 })
    console.error("[/api/renta]", err)
    return NextResponse.json({ error: "Error al publicar para renta" }, { status: 500 })
  }
}
