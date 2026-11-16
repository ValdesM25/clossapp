import { test } from "node:test"
import assert from "node:assert/strict"
import { estadoPrueba } from "./prueba.ts"

const DIA = 86_400_000
const ahora = Date.parse("2026-11-20T12:00:00Z")
const en = (dias) => new Date(ahora + dias * DIA).toISOString()

test("sin prueba o lejos de vencer no avisa", () => {
  assert.equal(estadoPrueba(null, "plus", ahora), null)
  assert.equal(estadoPrueba(en(20), "plus", ahora), null)
})

test("los últimos 5 días avisa que termina", () => {
  assert.deepEqual(estadoPrueba(en(5), "plus", ahora), { tipo: "termina", dias: 5 })
  assert.deepEqual(estadoPrueba(en(0.5), "elite", ahora), { tipo: "termina", dias: 1 })
})

test("vencida pero aún en plan de pago (el cron no ha corrido) no avisa", () => {
  assert.equal(estadoPrueba(en(-0.5), "plus", ahora), null)
})

test("ya en gratis avisa que terminó, solo una semana", () => {
  assert.deepEqual(estadoPrueba(en(-1), "gratis", ahora), { tipo: "termino", dias: -1 })
  assert.equal(estadoPrueba(en(-8), "gratis", ahora), null)
})
