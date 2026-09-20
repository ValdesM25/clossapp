import type { Prenda } from "@/types"

export type TipoItemCarrito = "compra" | "renta"

export interface CartItem {
  id: string
  prenda: Prenda
  tipo: TipoItemCarrito
  precio: number
  fechaRenta?: string
  sellerId?: string
  sellerName?: string
}

export type EscrowStatus = "pago_en_custodia" | "listo_en_punto" | "entregado_y_liberado" | "cancelado"
export type MetodoPagoEscrow = "tarjeta" | "puntos" | "saldo"

export interface EscrowOrder {
  id: string
  orderCode: string
  qrToken: string
  buyerUserId: string
  buyerName: string
  buyerEmail?: string
  items: CartItem[]
  subtotal: number
  garantiaEscrow: number
  totalPagado: number
  metodoPago: MetodoPagoEscrow
  status: EscrowStatus
  puntoAcopioId: string
  puntoAcopioNombre: string
  createdAt: string
  validatedAt?: string
  validatedBy?: string
}
