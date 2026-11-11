import { test } from "node:test"
import assert from "node:assert/strict"
import { bloqueaNuevoPago, planDeSuscripcion } from "./plan-stripe.ts"

const precios = { price_plus: "plus", price_elite: "elite" }

test("activa o en prueba da el plan del precio", () => {
  assert.equal(planDeSuscripcion("active", "price_plus", precios), "plus")
  assert.equal(planDeSuscripcion("trialing", "price_elite", precios), "elite")
})

test("pago atrasado conserva el plan mientras Stripe reintenta", () => {
  assert.equal(planDeSuscripcion("past_due", "price_elite", precios), "elite")
})

test("cancelada, impagada o incompleta regresa a gratis", () => {
  for (const estado of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
    assert.equal(planDeSuscripcion(estado, "price_plus", precios), "gratis", estado)
  }
})

test("precio desconocido o ausente da gratis", () => {
  assert.equal(planDeSuscripcion("active", "price_otro", precios), "gratis")
  assert.equal(planDeSuscripcion("active", null, precios), "gratis")
})

test("una suscripción viva o a medio cobrar bloquea otro pago", () => {
  for (const estado of ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]) {
    assert.equal(bloqueaNuevoPago(["canceled", estado]), true, estado)
  }
})

test("sin suscripciones o solo terminadas se puede pagar", () => {
  assert.equal(bloqueaNuevoPago([]), false)
  assert.equal(bloqueaNuevoPago(["canceled", "incomplete_expired"]), false)
})
