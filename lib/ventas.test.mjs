import { test } from "node:test"
import assert from "node:assert/strict"
import { estadoVenta, netoVendedor, totales, fechaLegible, pesos, diasPublicada } from "./ventas.ts"

test("estadoVenta: cada estado de la orden", () => {
  assert.deepEqual(estadoVenta("pago_en_custodia", null, true), { etiqueta: "Llévala al centro de acopio", tono: "accion" })
  assert.deepEqual(estadoVenta("listo_en_punto", null, true), { etiqueta: "En el centro, esperando a quien compró", tono: "espera" })
  assert.deepEqual(estadoVenta("en_renta_cliente", null, true, "2026-11-15"), { etiqueta: "Rentada para el 15 de noviembre", tono: "espera" })
  assert.deepEqual(estadoVenta("cancelado", null, true), { etiqueta: "Cancelada", tono: "cancelado" })
})

test("estadoVenta: pendiente_pago no se muestra", () => {
  assert.equal(estadoVenta("pendiente_pago", null, true), null)
})

test("estadoVenta: entregada según el pago y la cuenta", () => {
  const listo = { etiqueta: "Depositado", tono: "listo" }
  assert.deepEqual(estadoVenta("entregado_y_liberado", { estado: "enviado" }, true), listo)
  // Si ya se depositó, la cuenta no importa.
  assert.deepEqual(estadoVenta("entregado_y_liberado", { estado: "enviado" }, false), listo)
  const camino = { etiqueta: "Entregada, depósito en camino", tono: "espera" }
  assert.deepEqual(estadoVenta("entregado_y_liberado", { estado: "pendiente" }, true), camino)
  assert.deepEqual(estadoVenta("entregado_y_liberado", null, true), camino)
  const conectar = { etiqueta: "Conecta tu cuenta para recibir tu dinero", tono: "accion" }
  assert.deepEqual(estadoVenta("entregado_y_liberado", { estado: "pendiente" }, false), conectar)
  assert.deepEqual(estadoVenta("entregado_y_liberado", null, false), conectar)
})

test("netoVendedor suma las prendas y deja el 85%", () => {
  assert.equal(netoVendedor([200]), 17000)
  assert.equal(netoVendedor([100, 80.5]), 15342)
  assert.equal(netoVendedor([]), 0)
})

test("totales: por cobrar, cobrado del mes y cobrado en total", () => {
  const ahora = new Date(2026, 10, 15, 12)
  const enviado = (neto, enviadoAt) => ({ estado: "enviado", netoCentavos: neto, enviadoAt })
  const r = totales([
    { status: "entregado_y_liberado", netoCentavos: 17000, pago: enviado(17000, new Date(2026, 10, 3, 12).toISOString()) },
    { status: "entregado_y_liberado", netoCentavos: 8500, pago: enviado(8500, new Date(2026, 9, 20, 12).toISOString()) },
    { status: "pago_en_custodia", netoCentavos: 5000, pago: null },
    { status: "entregado_y_liberado", netoCentavos: 4250, pago: { estado: "pendiente", netoCentavos: 4250, enviadoAt: null } },
    { status: "cancelado", netoCentavos: 9999, pago: null },
  ], ahora)
  assert.deepEqual(r, { porCobrarCentavos: 9250, cobradoMesCentavos: 17000, cobradoTotalCentavos: 25500 })
})

test("fechaLegible, pesos y diasPublicada", () => {
  assert.equal(fechaLegible("2026-01-05"), "5 de enero")
  assert.equal(pesos(17000), "$170.00")
  assert.equal(diasPublicada("2026-11-01T12:00:00Z", new Date("2026-11-11T13:00:00Z")), 10)
  assert.equal(diasPublicada("2026-11-12T12:00:00Z", new Date("2026-11-11T13:00:00Z")), 0)
})
