import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/lib/stripe.server"
import { leerEstilo } from "@/lib/cuota.server"
import { MENSAJES_LIMITE, type MotivoLimite } from "@/constants/planes"
import { climaParaFechas } from "@/lib/clima"
import {
  cuotaRestante, diasDe, hoyMexico, siguienteBloque, validarOutfits,
  MAX_DIAS_BLOQUE, MIN_PRENDAS_PLAN, type MomentoPlan, type PlanOutfit,
} from "@/lib/planificacion"
import { generarOutfitsPlan, type PrendaPlan, type UsoIA } from "@/lib/planificacion.server"

export const maxDuration = 120

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const error = (msg: string, status: number) => NextResponse.json({ error: msg }, { status })
const limite = (m: MotivoLimite, status: number) => NextResponse.json({ error: MENSAJES_LIMITE[m], limite: m }, { status })

async function registrarUsos(userId: string, usos: UsoIA[]) {
  try {
    const { error: e } = await supabaseAdmin().from("uso_ia_registro").insert(usos.map(({ modelo, uso: u }) => ({
      user_id: userId,
      ruta: "planificacion/generar",
      modelo, // el que respondió: con respaldo puede no ser Sonnet 5.5
      entrada: u.input_tokens,
      salida: u.output_tokens,
      cache_lectura: u.cache_read_input_tokens ?? 0,
      cache_escritura: u.cache_creation_input_tokens ?? 0,
    })))
    if (e) throw e
  } catch (err) {
    console.error("[planificacion] uso_ia_registro", err)
  }
}

async function devolverDias(userId: string, dias: number) {
  if (dias < 1) return
  try {
    const { error: e } = await supabaseAdmin().rpc("devolver_dias_plan", { p_uid: userId, p_dias: dias })
    if (e) throw e
  } catch (err) {
    console.error("[planificacion] devolver_dias_plan", userId, dias, err)
  }
}

/** Arma el siguiente bloque del plan o, con `momentoId`, regenera ese momento ("Otro outfit"). */
export async function POST(req: NextRequest) {
  // 1. Forma del body.
  const body = await req.json().catch(() => null)
  const planId: unknown = body?.planId
  const momentoId: unknown = body?.momentoId
  if (typeof planId !== "string" || !UUID.test(planId)
    || (momentoId !== undefined && (typeof momentoId !== "string" || !UUID.test(momentoId)))) {
    return error("Datos inválidos.", 400)
  }

  // 2. Sesión: el usuario sale de la cookie, nunca del body.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return limite("sin_sesion", 401)

  // 3. Plan del usuario antes que el plan de outfits: quien no es Elite no puede
  // tener planes, así que debe ver el 403 y no un 404.
  const [{ data: perfil, error: ePerfil }, { data: limites, error: eLimites }] = await Promise.all([
    supabase.from("perfiles")
      .select("plan, plan_dias_dia, plan_dias_dia_fecha, plan_dias_mes, plan_dias_mes_inicio")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("limites_plan").select("plan_dias_dia, plan_dias_mes").eq("plan", "elite").maybeSingle(),
  ])
  if (ePerfil || eLimites || !limites) {
    console.error("[planificacion] perfil", ePerfil?.message ?? eLimites?.message)
    return error("No se pudo verificar tu plan", 500)
  }
  if (perfil?.plan !== "elite") return limite("solo_elite", 403)

  // 4. El plan con sus momentos; la RLS ya filtra por usuario.
  const { data: fila, error: ePlan } = await supabase
    .from("planes_outfit").select("*, plan_momentos(*)").eq("id", planId).maybeSingle()
  if (ePlan) {
    console.error("[planificacion] plan", ePlan.message)
    return error("No pudimos leer el plan.", 500)
  }
  if (!fila) return error("No encontramos el plan.", 404)
  const { plan_momentos, ...resto } = fila as Omit<PlanOutfit, "momentos"> & { plan_momentos: MomentoPlan[] }
  const plan = resto as Omit<PlanOutfit, "momentos">
  const momentos = plan_momentos
  const hoy = hoyMexico()

  // 5. Bloque a armar.
  let bloque: MomentoPlan[]
  if (typeof momentoId === "string") {
    const m = momentos.find((x) => x.id === momentoId)
    if (!m) return error("No encontramos ese momento.", 404)
    bloque = [m]
  } else {
    const restante = cuotaRestante(perfil, limites, hoy)
    const maxDias = Math.min(restante.hoy, restante.mes)
    if (maxDias < 1) return limite(restante.hoy < 1 ? "plan_dia" : "plan_mes", 429)
    const ids = new Set(siguienteBloque(momentos, Math.min(MAX_DIAS_BLOQUE, maxDias)))
    bloque = momentos.filter((m) => ids.has(m.id))
    if (!bloque.length) return NextResponse.json({ generados: 0, errores: 0, pendientes: 0 })
  }
  const dias = diasDe(bloque)

  // 6. Inventario sin donadas. El orden es fijo para que el caché del prompt funcione.
  const { data: filas, error: ePrendas } = await supabase
    .from("prendas").select("id, name, category, color, style, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(300)
  if (ePrendas) {
    console.error("[planificacion] prendas", ePrendas.message)
    return error("No pudimos leer tu armario.", 500)
  }
  const prendas = ((filas ?? []) as PrendaPlan[]).filter((p) => {
    const donada = p.metadata?.donada
    return donada !== true && donada !== "true"
  })
  if (prendas.length < MIN_PRENDAS_PLAN) return error("Agrega al menos 5 prendas a tu armario para planear.", 400)

  // 7. Cobro.
  // shortcut: dos pestañas pidiendo el mismo bloque a la vez cobran dos veces; la pantalla deshabilita el botón mientras genera. Si se ve en uso_ia_registro, bloquear con un estado "generando" por momento.
  const { data: motivo, error: eCuota } = await supabase.rpc("usar_dias_plan", { p_dias: dias })
  if (eCuota) {
    console.error("[planificacion] usar_dias_plan", eCuota.message)
    return error("No se pudo verificar tu plan", 500)
  }
  if (motivo !== "ok") {
    const m = (motivo in MENSAJES_LIMITE ? motivo : "plan_dia") as MotivoLimite
    return limite(m, m === "solo_elite" ? 403 : m === "sin_sesion" ? 401 : 429)
  }

  // 8. Desde aquí, si algo lanza se devuelven todos los días cobrados.
  let validos: ReturnType<typeof validarOutfits>["validos"]
  try {
    // 9. Clima del lugar, si el plan tiene.
    const climas = plan.lugar
      ? await climaParaFechas(plan.lugar, [...new Set(bloque.map((m) => m.fecha))], hoy)
      : {}
    bloque = bloque.map((m) => ({ ...m, clima: climas[m.fecha] ?? m.clima ?? null }))

    // 10. Lo ya planeado fuera del bloque; al regenerar, también el outfit actual para no repetirlo.
    const fuera = momentos.filter((m) => m.estado === "listo" && m.outfit && !bloque.some((b) => b.id === m.id))
    if (typeof momentoId === "string" && bloque[0].outfit) fuera.push(bloque[0])
    const yaPlaneados = fuera.map((m) => ({
      fecha: m.fecha, momento: m.momento, titulo: m.outfit!.titulo, prenda_ids: m.outfit!.prenda_ids,
    }))
    const previos = yaPlaneados.map((p) => p.prenda_ids)

    const { propuestas, usos } = await generarOutfitsPlan({
      plan: { nombre: plan.nombre, tipo: plan.tipo, lugar: plan.lugar },
      momentos: bloque, prendas, yaPlaneados, previos,
      estilo: await leerEstilo(supabase, user.id),
    })
    // 14. Tokens reales; si falla, solo se registra en consola.
    await registrarUsos(user.id, usos)

    // 11. Revisión final sobre la mezcla.
    validos = validarOutfits({
      propuestas, momentos: bloque, previos,
      inventario: prendas.map((p) => ({ id: String(p.id), category: p.category ?? "" })),
    }).validos

    // 12. Guardar. Al regenerar con error no se toca el momento: se queda el outfit anterior.
    const admin = supabaseAdmin()
    const ahora = new Date().toISOString()
    const cambios = bloque
      .map((m) => {
        const v = validos[m.id]
        if (v) return { id: m.id, datos: { outfit: v.outfit, faltante: v.faltante, clima: m.clima, estado: "listo", generado_en: ahora } }
        return typeof momentoId === "string" ? null : { id: m.id, datos: { clima: m.clima, estado: "error" } }
      })
      .filter((c) => c !== null)
    const resultados = await Promise.all(cambios.map((c) =>
      admin.from("plan_momentos").update(c.datos).eq("id", c.id).eq("user_id", user.id)
    ))
    const eGuardar = resultados.find((r) => r.error)?.error
    if (eGuardar) throw eGuardar
  } catch (err) {
    console.error("[/api/planificacion/generar]", err)
    await devolverDias(user.id, dias)
    return error("No pudimos armar los outfits. No se descontó de tu cuota.", 500)
  }

  // 13. Se devuelven los días del bloque que quedaron sin ningún outfit listo.
  const conOutfit = new Set(bloque.filter((m) => validos[m.id]).map((m) => m.fecha))
  await devolverDias(user.id, dias - conOutfit.size)

  // 15. Resumen.
  const generados = bloque.filter((m) => validos[m.id]).length
  const pendientes = momentos.filter((m) => !validos[m.id] && m.estado !== "listo").length
  return NextResponse.json({ generados, errores: bloque.length - generados, pendientes })
}
