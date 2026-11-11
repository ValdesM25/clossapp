// Importa con .ts para poder probarse con `node --test lib/ventas.test.mjs`.
import { repartoPorVendedor } from "./marketplace.ts"

export type TonoVenta = "accion" | "espera" | "listo" | "cancelado"
export type PagoVenta = { estado: "pendiente" | "enviado"; netoCentavos: number; enviadoAt: string | null }
export type VentaResumen = { status: string; pago: PagoVenta | null; netoCentavos: number }

/** "2026-11-15" -> "15 de noviembre". Se lee en UTC para que la zona horaria no mueva el día. */
export function fechaLegible(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" })
}

export const pesos = (centavos: number) => (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" })

/** Qué le pasa a la venta y si la persona tiene que hacer algo. null si la orden aún no está pagada. */
export function estadoVenta(
  status: string,
  pago: Pick<PagoVenta, "estado"> | null,
  tieneCuentaActiva: boolean,
  fechaRenta?: string | null,
): { etiqueta: string; tono: TonoVenta } | null {
  switch (status) {
    case "pago_en_custodia": return { etiqueta: "Llévala al centro de acopio", tono: "accion" }
    case "listo_en_punto": return { etiqueta: "En el centro, esperando a quien compró", tono: "espera" }
    case "en_renta_cliente": return { etiqueta: fechaRenta ? `Rentada para el ${fechaLegible(fechaRenta)}` : "Rentada", tono: "espera" }
    case "entregado_y_liberado":
      if (pago?.estado === "enviado") return { etiqueta: "Depositado", tono: "listo" }
      return tieneCuentaActiva
        ? { etiqueta: "Entregada, depósito en camino", tono: "espera" }
        : { etiqueta: "Conecta tu cuenta para recibir tu dinero", tono: "accion" }
    case "cancelado": return { etiqueta: "Cancelada", tono: "cancelado" }
    default: return null
  }
}

/** Lo que le llega a un vendedor de las prendas de una orden, en centavos (85%). */
export function netoVendedor(precios: number[]): number {
  return repartoPorVendedor(precios.map((precio) => ({ sellerId: "yo", precio })))[0]?.netoCentavos ?? 0
}

export function totales(ventas: VentaResumen[], ahora: Date) {
  let porCobrarCentavos = 0, cobradoMesCentavos = 0, cobradoTotalCentavos = 0
  for (const v of ventas) {
    if (v.pago?.estado === "enviado") {
      cobradoTotalCentavos += v.pago.netoCentavos
      const d = v.pago.enviadoAt ? new Date(v.pago.enviadoAt) : null
      if (d && d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()) cobradoMesCentavos += v.pago.netoCentavos
    } else if (v.status !== "cancelado") {
      porCobrarCentavos += v.netoCentavos
    }
  }
  return { porCobrarCentavos, cobradoMesCentavos, cobradoTotalCentavos }
}

/** Días completos desde que se publicó la prenda. */
export const diasPublicada = (publicadaEn: string, ahora: Date) =>
  Math.max(0, Math.floor((ahora.getTime() - new Date(publicadaEn).getTime()) / 86_400_000))
