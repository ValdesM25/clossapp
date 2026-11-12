import { test } from "node:test"
import assert from "node:assert/strict"
import {
  grupoDe, categoriaDe, diasEntre, prellenar, fechaCorta, rangoFechas, estadoPlan, cuentaRegresiva, siguienteBloque, diasDe, cuotaRestante, validarOutfits, maletaDe, momentosDeHoy, proximoPlan,
} from "./planificacion.ts"
import { fuenteParaFecha, restarUnAnio } from "./clima.ts"

const momento = (id, fecha, m = "dia", extra = {}) => ({
  id, plan_id: "p", fecha, momento: m, actividad: "", clima: null, outfit: null, faltante: null,
  estado: "pendiente", generado_en: null, usado_en: null, ...extra,
})

test("grupoDe con las categorías reales", () => {
  assert.equal(grupoDe("Top"), "arriba")
  assert.equal(grupoDe("Bottom"), "abajo")
  assert.equal(grupoDe("Outerwear"), "abrigo")
  assert.equal(grupoDe("Calzado"), "calzado")
  assert.equal(grupoDe("Accesorio"), "accesorio")
  assert.equal(grupoDe("Vestido"), "completo")
  assert.equal(grupoDe("Vestido short"), "completo")
  assert.equal(grupoDe("Blusa"), "arriba")
  assert.equal(grupoDe(" Camisa "), "arriba")
  assert.equal(grupoDe("Suéter"), "arriba")
  assert.equal(grupoDe("Pantalón"), "abajo")
  // Plurales de las prendas de ejemplo.
  assert.equal(grupoDe("Tops"), "arriba")
  assert.equal(grupoDe("Pantalones"), "abajo")
  assert.equal(grupoDe("Chaquetas"), "abrigo")
  assert.equal(grupoDe("Vestidos"), "completo")
  assert.equal(grupoDe("Zapatos"), "calzado")
  assert.equal(grupoDe("Accesorios"), "accesorio")
  assert.equal(grupoDe("Sombrero raro"), "otro")
})

test("categoriaDe: un vestido guardado como Top cuenta como vestido", () => {
  assert.equal(categoriaDe({ category: "Top", name: "Vestido Largo Satinado Verde" }), "Vestido")
  assert.equal(categoriaDe({ category: "Top", name: "Top Negro con Pedrería" }), "Top")
  assert.equal(categoriaDe({ category: "Bottom", name: null }), "Bottom")
  assert.equal(categoriaDe({ category: null }), "")
})

test("diasEntre cruza fin de mes y de año", () => {
  assert.deepEqual(diasEntre("2026-11-29", "2026-12-02"), ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"])
  assert.deepEqual(diasEntre("2026-12-31", "2027-01-01"), ["2026-12-31", "2027-01-01"])
  assert.deepEqual(diasEntre("2026-11-11", "2026-11-11"), ["2026-11-11"])
})

test("prellenar: semana en lunes y en miércoles, fecha y viaje", () => {
  assert.deepEqual(prellenar("semana", "2026-11-16"), { inicio: "2026-11-16", fin: "2026-11-22", nombre: "Mi semana del 16 de noviembre" })
  assert.deepEqual(prellenar("semana", "2026-11-11"), { inicio: "2026-11-16", fin: "2026-11-22", nombre: "Mi semana del 16 de noviembre" })
  assert.deepEqual(prellenar("semana", "2026-12-29"), { inicio: "2027-01-04", fin: "2027-01-10", nombre: "Mi semana del 4 de enero" })
  assert.deepEqual(prellenar("fecha", "2026-11-11"), { inicio: "2026-11-11", fin: "2026-11-11", nombre: "" })
  assert.deepEqual(prellenar("viaje", "2026-11-28"), { inicio: "2026-12-05", fin: "2026-12-08", nombre: "" })
})

test("siguienteBloque: salta listos, respeta el máximo de fechas y ordena día antes que noche", () => {
  const ms = [
    momento("c-noche", "2026-11-13", "noche"),
    momento("a-dia", "2026-11-11", "dia", { estado: "listo" }),
    momento("b-noche", "2026-11-12", "noche"),
    momento("c-dia", "2026-11-13", "dia"),
    momento("b-dia", "2026-11-12", "dia", { estado: "error" }),
    momento("d-dia", "2026-11-14", "dia"),
  ]
  assert.deepEqual(siguienteBloque(ms, 2), ["b-dia", "b-noche", "c-dia", "c-noche"])
  assert.deepEqual(siguienteBloque(ms, 7), ["b-dia", "b-noche", "c-dia", "c-noche", "d-dia"])
  assert.deepEqual(siguienteBloque(ms.map((m) => ({ ...m, estado: "listo" })), 7), [])
  assert.equal(diasDe(ms), 4)
})

test("cuotaRestante: mismo día, día nuevo y mes nuevo", () => {
  const lim = { plan_dias_dia: 14, plan_dias_mes: 30 }
  const perfil = { plan_dias_dia: 10, plan_dias_dia_fecha: "2026-11-11", plan_dias_mes: 25, plan_dias_mes_inicio: "2026-11-01" }
  assert.deepEqual(cuotaRestante(perfil, lim, "2026-11-11"), { hoy: 4, mes: 5 })
  assert.deepEqual(cuotaRestante(perfil, lim, "2026-11-12"), { hoy: 14, mes: 5 })
  assert.deepEqual(cuotaRestante(perfil, lim, "2026-12-01"), { hoy: 14, mes: 30 })
  assert.deepEqual(cuotaRestante({ plan_dias_dia: 0, plan_dias_dia_fecha: null, plan_dias_mes: 0, plan_dias_mes_inicio: null }, lim, "2026-11-11"), { hoy: 14, mes: 30 })
  assert.deepEqual(cuotaRestante({ ...perfil, plan_dias_mes: 31 }, lim, "2026-11-11"), { hoy: 4, mes: 0 })
})

// Armario completo: 1-2 arriba, 3-4 abajo, 5 vestido, 6-7 calzado, 8 abrigo, 9 accesorio.
const inventario = [
  { id: "1", category: "Top" }, { id: "2", category: "Blusa" }, { id: "3", category: "Bottom" }, { id: "4", category: "Bottom" },
  { id: "5", category: "Vestido" }, { id: "6", category: "Calzado" }, { id: "7", category: "Calzado" },
  { id: "8", category: "Outerwear" }, { id: "9", category: "Accesorio" },
]
const propuesta = (momento_id, prenda_ids, extra = {}) => ({
  momento_id, titulo: "Look", descripcion: "Va bien.", prenda_ids, faltante: null, ...extra,
})
const validar = (propuestas, momentos = [momento("m1", "2026-11-11")], inv = inventario, previos = []) =>
  validarOutfits({ propuestas, momentos, inventario: inv, previos })

test("validarOutfits: caso válido, recorta textos y limpia faltante", () => {
  const largo = "x".repeat(500)
  const r = validar([propuesta("m1", ["1", "3", "6", "9"], {
    titulo: `  ${largo}`,
    descripcion: largo,
    justificacion: `  Caminar en Teotihuacán requiere tenis cómodos y capas.  `,
    faltante: { categoria: "Formal", motivo: "No hay traje." },
  })])
  assert.deepEqual(r.errores, {})
  assert.equal(r.validos.m1.outfit.titulo.length, 60)
  assert.equal(r.validos.m1.outfit.descripcion.length, 240)
  assert.equal(r.validos.m1.outfit.justificacion, "Caminar en Teotihuacán requiere tenis cómodos y capas.")
  assert.deepEqual(r.validos.m1.faltante, { categoria: "Formal", motivo: "No hay traje." })
  // Faltante inválido: no es error, se guarda null.
  const r2 = validar([propuesta("m1", ["5", "6"], { faltante: { categoria: "", motivo: "x" } })])
  assert.deepEqual(r2.errores, {})
  assert.equal(r2.validos.m1.faltante, null)
})

test("validarOutfits regla 1: forma, momento ajeno, repetido y faltante", () => {
  assert.equal(validar("no es arreglo").errores.m1, "Falta el outfit de este momento.")
  assert.equal(validar([propuesta("otro", ["1", "3", "6"])]).errores.m1, "Falta el outfit de este momento.")
  assert.equal(validar([propuesta("m1", ["1", "3", "6"]), propuesta("m1", ["2", "4", "7"])]).errores.m1, "Mandaste más de un outfit para este momento.")
  assert.equal(validar([{ momento_id: "m1", titulo: "a", descripcion: "b", prenda_ids: [1, 3] }]).errores.m1, "El outfit no tiene la forma esperada.")
})

test("validarOutfits reglas 2 a 4: textos, prendas y tamaño", () => {
  assert.equal(validar([propuesta("m1", ["1", "3", "6"], { titulo: "   " })]).errores.m1, "Falta el título o la descripción.")
  assert.equal(validar([propuesta("m1", ["1", "3", "99", "98"])]).errores.m1, "Usaste prendas que no están en el armario: 99, 98.")
  assert.equal(validar([propuesta("m1", ["1", "3", "3", "6"])]).errores.m1, "Repetiste una prenda dentro del outfit.")
  assert.equal(validar([propuesta("m1", ["5"])], undefined, inventario).errores.m1, "El outfit debe tener entre 2 y 7 prendas.")
  const muchas = [...inventario, ...["10", "11", "12"].map((id) => ({ id, category: "Accesorio" }))]
  assert.equal(validar([propuesta("m1", ["1", "3", "6", "8", "9", "10", "11", "12"])], undefined, muchas).errores.m1, "El outfit debe tener entre 2 y 7 prendas.")
})

test("validarOutfits regla 5: base", () => {
  assert.equal(validar([propuesta("m1", ["1", "6"])]).errores.m1, "El outfit necesita una parte de arriba y una de abajo, o un vestido.")
  assert.equal(validar([propuesta("m1", ["5", "3", "6"])]).errores.m1, "No combines un vestido con una prenda de abajo.")
  // Armario sin base posible (solo arriba): no se exige.
  const soloArriba = [{ id: "1", category: "Top" }, { id: "2", category: "Blusa" }, { id: "6", category: "Calzado" }]
  assert.deepEqual(validar([propuesta("m1", ["1", "6"])], undefined, soloArriba).errores, {})
})

test("validarOutfits regla 6: calzado", () => {
  assert.equal(validar([propuesta("m1", ["1", "3"])]).errores.m1, "Lleva exactamente un calzado.")
  assert.equal(validar([propuesta("m1", ["1", "3", "6", "7"])]).errores.m1, "Lleva exactamente un calzado.")
  // Armario sin calzado: no se exige.
  const sinCalzado = inventario.filter((p) => p.category !== "Calzado")
  assert.deepEqual(validar([propuesta("m1", ["1", "3"])], undefined, sinCalzado).errores, {})
})

test("validarOutfits regla 7: abrigo con frío", () => {
  const frio = [momento("m1", "2026-11-11", "noche", { clima: { min: 8, max: 15, texto: "Nublado", lluvia: false, fuente: "pronostico" } })]
  assert.equal(validar([propuesta("m1", ["1", "3", "6"])], frio).errores.m1, "La mínima es de 8 °C: agrega un abrigo.")
  assert.deepEqual(validar([propuesta("m1", ["1", "3", "6", "8"])], frio).errores, {})
  // Frío sin abrigo en el armario: no se exige.
  const sinAbrigo = inventario.filter((p) => p.category !== "Outerwear")
  assert.deepEqual(validar([propuesta("m1", ["1", "3", "6"])], frio, sinAbrigo).errores, {})
})

test("validarOutfits regla 8: sin repetir outfits", () => {
  const dos = [momento("m1", "2026-11-11"), momento("m2", "2026-11-12")]
  const r = validar([propuesta("m1", ["1", "3", "6"]), propuesta("m2", ["6", "3", "1"])], dos)
  assert.ok(r.validos.m1)
  assert.equal(r.errores.m2, "Este outfit repite otro ya planeado. Cambia al menos una prenda.")
  assert.equal(validar([propuesta("m1", ["1", "3", "6"])], undefined, inventario, [["6", "1", "3"]]).errores.m1,
    "Este outfit repite otro ya planeado. Cambia al menos una prenda.")
})

test("maletaDe: sin duplicados, en orden de grupos, marca empacadas y salta borradas", () => {
  const outfit = (prenda_ids) => ({ titulo: "t", descripcion: "d", prenda_ids })
  const plan = {
    empacadas: ["3", "8"],
    momentos: [
      momento("a", "2026-11-11", "dia", { estado: "listo", outfit: outfit(["1", "3", "6", "borrada"]) }),
      momento("b", "2026-11-11", "noche", { estado: "listo", outfit: outfit(["5", "6", "8", "9"]) }),
      momento("c", "2026-11-12", "dia", { estado: "error", outfit: outfit(["2", "4", "7"]) }),
    ],
  }
  const m = maletaDe(plan, inventario)
  assert.deepEqual(m.grupos.map((g) => g.titulo), ["Abrigos y capas", "Prendas de arriba", "Vestidos", "Prendas de abajo", "Calzado", "Accesorios"])
  assert.deepEqual(m.grupos.flatMap((g) => g.prendas.map((p) => p.id)), ["8", "1", "5", "3", "6", "9"])
  assert.deepEqual(m.grupos.flatMap((g) => g.prendas.filter((p) => p.empacada).map((p) => p.id)), ["8", "3"])
  assert.deepEqual({ total: m.total, empacadas: m.empacadas }, { total: 6, empacadas: 2 })
})

test("momentosDeHoy y proximoPlan", () => {
  const plan = (id, fecha_inicio, fecha_fin, momentos = []) => ({ id, tipo: "semana", nombre: id, fecha_inicio, fecha_fin, lugar: null, empacadas: [], created_at: "", momentos })
  const a = plan("a", "2026-11-10", "2026-11-12", [
    momento("n", "2026-11-11", "noche", { estado: "listo" }),
    momento("d", "2026-11-11", "dia", { estado: "listo" }),
    momento("x", "2026-11-11", "dia", { estado: "pendiente" }),
  ])
  const viejo = plan("viejo", "2026-11-01", "2026-11-05")
  const luego = plan("luego", "2026-11-20", "2026-11-22")
  assert.deepEqual(momentosDeHoy([a, luego], "2026-11-11").map((r) => r.momento.id), ["d", "n"])
  assert.equal(proximoPlan([luego, viejo, a], "2026-11-11").id, "a")
  assert.equal(proximoPlan([luego, viejo], "2026-11-11").id, "luego")
  assert.equal(proximoPlan([viejo], "2026-11-11"), null)
})

test("clima: fuente por fecha y año anterior", () => {
  assert.equal(fuenteParaFecha("2026-11-26", "2026-11-11"), "pronostico")
  assert.equal(fuenteParaFecha("2026-11-27", "2026-11-11"), "historico")
  assert.equal(restarUnAnio("2028-02-29"), "2027-02-28")
  assert.equal(restarUnAnio("2027-01-05"), "2026-01-05")
})

test("fechaCorta, rangoFechas y estadoPlan", () => {
  assert.equal(fechaCorta("2026-11-16"), "lun 16 nov")
  assert.equal(rangoFechas("2026-11-16", "2026-11-22"), "16 al 22 nov")
  assert.equal(rangoFechas("2026-11-30", "2026-12-02"), "30 nov al 2 dic")
  assert.equal(rangoFechas("2026-12-30", "2027-01-02"), "30 dic al 2 ene")
  assert.equal(rangoFechas("2026-11-16", "2026-11-16"), "16 nov")
  const plan = { fecha_inicio: "2026-11-16", fecha_fin: "2026-11-22" }
  assert.equal(estadoPlan(plan, "2026-11-15"), "proximo")
  assert.equal(estadoPlan(plan, "2026-11-16"), "en_curso")
  assert.equal(estadoPlan(plan, "2026-11-22"), "en_curso")
  assert.equal(estadoPlan(plan, "2026-11-23"), "terminado")
  assert.equal(cuentaRegresiva(plan, "2026-11-09"), "Faltan 7 días")
  assert.equal(cuentaRegresiva(plan, "2026-11-15"), "Mañana")
  assert.equal(cuentaRegresiva(plan, "2026-11-16"), "Hoy · día 1 de 7")
  assert.equal(cuentaRegresiva(plan, "2026-11-22"), "Hoy · día 7 de 7")
  assert.equal(cuentaRegresiva(plan, "2026-11-23"), "Terminado")
  assert.equal(cuentaRegresiva({ fecha_inicio: "2026-11-16", fecha_fin: "2026-11-16" }, "2026-11-16"), "Hoy")
})
