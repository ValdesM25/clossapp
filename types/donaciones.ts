import type { Prenda } from "./prenda"

export type EstadoTicket = "pendiente" | "completado" | "expirado"

export interface DonacionTicket {
  id: string
  qrToken: string
  userId: string
  puntoAcopioId: string
  puntoAcopioNombre: string
  status: EstadoTicket
  prendas: Prenda[]
  cantidadPrendas: number
  puntosOtorgados: number
  createdAt: string
  validatedAt?: string
  validatedBy?: string
}

export interface PuntosHistorial {
  id: string
  puntos: number
  tipo: "donacion" | "canje_suscripcion" | "bono"
  descripcion: string
  createdAt: string
}

export interface OpcionCanjeSuscripcion {
  id: string
  titulo: string
  descripcion: string
  puntosCoste: number
  descuentoPorcentaje: number
  mesesGratis?: number
  codigo: string
}

export interface CanjeRealizado {
  id: string
  opcionId: string
  titulo: string
  codigo: string
  puntosUsados: number
  fecha: string
}
