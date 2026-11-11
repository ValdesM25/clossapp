import { test } from "node:test"
import assert from "node:assert/strict"
import { repartoPorVendedor, estadoCuenta } from "./marketplace.ts"

test("un vendedor recibe 85% y Clossapp 15%", () => {
  assert.deepEqual(repartoPorVendedor([{ sellerId: "a", precio: 200 }]), [
    { vendedorId: "a", brutoCentavos: 20000, comisionCentavos: 3000, netoCentavos: 17000 },
  ])
})

test("agrupa las prendas de cada vendedor", () => {
  const r = repartoPorVendedor([{ sellerId: "a", precio: 100 }, { sellerId: "b", precio: 50 }, { sellerId: "a", precio: 80.5 }])
  assert.deepEqual(r.map((p) => [p.vendedorId, p.brutoCentavos, p.netoCentavos]), [["a", 18050, 15342], ["b", 5000, 4250]])
})

test("neto + comisión suma exacto lo pagado, también con centavos impares", () => {
  for (const precio of [0.01, 9.99, 33.33, 199.95, 1234.57]) {
    const [p] = repartoPorVendedor([{ sellerId: "a", precio }])
    assert.equal(p.netoCentavos + p.comisionCentavos, Math.round(precio * 100), String(precio))
  }
})

test("estadoCuenta: activa, requiere_datos, en_revision y sin_cuenta", () => {
  const lista = { payouts_enabled: true, capabilities: { transfers: "active" }, details_submitted: true }
  assert.equal(estadoCuenta(lista), "activa")
  // Lista manda aunque Stripe aún liste datos opcionales por vencer.
  assert.equal(estadoCuenta({ ...lista, requirements: { currently_due: ["x"] } }), "activa")
  assert.equal(estadoCuenta({ details_submitted: true, requirements: { currently_due: ["individual.id_number"] } }), "requiere_datos")
  assert.equal(estadoCuenta({ details_submitted: true, requirements: { past_due: ["external_account"] } }), "requiere_datos")
  assert.equal(estadoCuenta({ details_submitted: true, requirements: { disabled_reason: "requirements.past_due" } }), "requiere_datos")
  assert.equal(estadoCuenta({ details_submitted: true, requirements: { currently_due: [], past_due: [], disabled_reason: null } }), "en_revision")
  assert.equal(estadoCuenta({ details_submitted: false, requirements: { currently_due: [] } }), "sin_cuenta")
  assert.equal(estadoCuenta({}), "sin_cuenta")
})
