import type { Prenda } from "./prenda"

export type EstadoTicket = "pendiente" | "completado" | "expirado"

export interface DonacionTicket {
  id: string
  qrToken: string
  userId: string
  donorName?: string
  donorEmail?: string
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

export interface AcopioRegistroDB {
  id: string
  ticket_id: string | null
  punto_acopio_id: string
  punto_acopio_nombre: string
  donor_user_id: string | null
  donor_name: string
  donor_email?: string | null
  cantidad_prendas: number
  puntos_otorgados: number
  fecha_registro: string
  observaciones?: string | null
}

export interface PuntoAcopioDB {
  id: string
  nombre: string
  zona: string
  horario: string
  direccion?: string | null
  activo?: boolean
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

