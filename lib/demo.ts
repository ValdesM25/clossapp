import { GUEST_PRENDAS } from "@/constants/demo-data"
import type { EscrowOrder } from "@/types/escrow"

/**
 * Modo demo (reemplaza al modo invitado). Todo es simulado: nada se escribe
 * en Supabase. Como varias pantallas guardan respaldo en localStorage con
 * claves "clossapp_*", la demo respalda esas claves al entrar y las restaura
 * al salir, para que una cuenta real en el mismo equipo no vea datos falsos.
 */
export type TipoDemo = "usuario" | "acopio"

const PREFIJO = "clossapp_"
const CLAVE_ACTIVA = "clossapp_demo_activo"
const CLAVE_RESPALDO = "clossapp_demo_respaldo"

// Estado del módulo: lo leen los servicios, que no tienen acceso al contexto de React.
let actual: TipoDemo | null = null

export function esDemo(): boolean {
  return actual !== null
}

function clavesApp(): string[] {
  const claves: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIJO) && k !== CLAVE_ACTIVA && k !== CLAVE_RESPALDO) claves.push(k)
  }
  return claves
}

/** Si la pestaña se cerró en plena demo, deja localStorage como estaba antes. Llamar al abrir la app. */
export function restaurarSiQuedoDemo(): void {
  if (typeof window === "undefined" || actual !== null) return
  if (localStorage.getItem(CLAVE_ACTIVA)) restaurar()
}

function restaurar(): void {
  const respaldo = localStorage.getItem(CLAVE_RESPALDO)
  clavesApp().forEach((k) => localStorage.removeItem(k))
  if (respaldo) {
    try {
      Object.entries(JSON.parse(respaldo) as Record<string, string>).forEach(([k, v]) => localStorage.setItem(k, v))
    } catch { /* respaldo dañado: mejor quedar limpio que con datos falsos */ }
  }
  localStorage.removeItem(CLAVE_RESPALDO)
  localStorage.removeItem(CLAVE_ACTIVA)
}

export function entrarDemo(tipo: TipoDemo): void {
  restaurarSiQuedoDemo()
  const respaldo: Record<string, string> = {}
  clavesApp().forEach((k) => { respaldo[k] = localStorage.getItem(k) ?? "" })
  localStorage.setItem(CLAVE_RESPALDO, JSON.stringify(respaldo))
  localStorage.setItem(CLAVE_ACTIVA, tipo)
  // Empieza limpia: sin datos reales de este equipo dentro de la demo.
  clavesApp().forEach((k) => localStorage.removeItem(k))
  actual = tipo
  sembrar(tipo)
}

export function salirDemo(): void {
  if (actual === null && !localStorage.getItem(CLAVE_ACTIVA)) return
  actual = null
  restaurar()
}

// Datos de ejemplo ---------------------------------------------------------------

export const QR_DONACION_EJEMPLO = "TKT-DEMO-0001"
export const QR_CUSTODIA_EJEMPLO = "ESC-QR-DEMO01"
export const QR_RENTA_EJEMPLO = "ESC-QR-DEMO02"

function hace(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString()
}

function sembrar(tipo: TipoDemo): void {
  if (tipo !== "acopio") return
  const [p1, p2, p3] = GUEST_PRENDAS
  const ordenes: EscrowOrder[] = [
    {
      id: "demo_orden_1", orderCode: "ESC-DEMO01", qrToken: QR_CUSTODIA_EJEMPLO,
      buyerUserId: "demo", buyerName: "Ana López (ejemplo)", buyerEmail: "ana@ejemplo.com",
      items: [{ id: "demo_item_1", prenda: p3, tipo: "compra", precio: 450, sellerName: "Sofía R." }],
      subtotal: 450, garantiaEscrow: 0, totalPagado: 450, metodoPago: "tarjeta", status: "pago_en_custodia",
      puntoAcopioId: "demo", puntoAcopioNombre: "Centro Demo Clossapp", createdAt: hace(1),
    },
    {
      id: "demo_orden_2", orderCode: "ESC-DEMO02", qrToken: QR_RENTA_EJEMPLO,
      buyerUserId: "demo", buyerName: "Luis Pérez (ejemplo)", buyerEmail: "luis@ejemplo.com",
      items: [{ id: "demo_item_2", prenda: p1, tipo: "renta", precio: 250, fechaRenta: hace(-3).slice(0, 10), sellerName: "Mariela M." }],
      subtotal: 250, garantiaEscrow: 0, totalPagado: 250, metodoPago: "tarjeta", status: "pago_en_custodia",
      puntoAcopioId: "demo", puntoAcopioNombre: "Centro Demo Clossapp", createdAt: hace(2),
    },
  ]
  localStorage.setItem("clossapp_escrow_orders_v1", JSON.stringify(ordenes))
  localStorage.setItem("clossapp_local_acopio_registros_v1", JSON.stringify([
    {
      id: "demo_reg_1", ticket_id: null, punto_acopio_id: "demo", punto_acopio_nombre: "Centro Demo Clossapp",
      donor_user_id: null, donor_name: "Carla Ruiz (ejemplo)", donor_email: "", cantidad_prendas: 5,
      puntos_otorgados: 140, fecha_registro: hace(3), observaciones: `Donación de ejemplo: ${p2.name}, ${p1.name} y 3 más`,
    },
  ]))
}

/** Puntos con la misma fórmula que la base (validar_donacion_qr). */
export function puntosPorDonacion(cantidad: number): number {
  const n = Math.min(Math.max(cantidad, 1), 30)
  return n >= 3 ? 100 + (n - 3) * 20 : 50
}
