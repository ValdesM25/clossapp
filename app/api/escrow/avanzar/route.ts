import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { registrarPagosVendedores } from "@/lib/marketplace.server"

/** El centro de acopio entrega una renta o libera una orden; al liberar se paga a los vendedores. */
export async function POST(req: NextRequest) {
  const { token, accion } = await req.json().catch(() => ({}))
  if (typeof token !== "string" || (accion !== "liberar" && accion !== "entregar_renta")) {
    return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 })
  }
  const supabase = await createClient()
  // La base revisa que sea un centro de acopio y que la orden esté pagada.
  const { data: orden, error } = await supabase.rpc("escrow_avanzar", { p_token: token, p_accion: accion })
  if (error || !orden) return NextResponse.json({ error: error?.message ?? "No se pudo procesar la orden." }, { status: 409 })

  if (orden.status === "entregado_y_liberado") {
    try {
      await registrarPagosVendedores(orden.id)
    } catch (err) {
      // La entrega ya quedó; el pago se reintenta en la próxima liberación o cuando el vendedor conecte su cuenta.
      console.error("[escrow/avanzar] pagos a vendedores", orden.id, err instanceof Error ? err.message : err)
    }
  }
  return NextResponse.json(orden)
}
