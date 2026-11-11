import type { SupabaseClient } from "@supabase/supabase-js"
import type { Plan, MotivoLimite } from "@/constants/planes"
import type { Lugar } from "@/lib/clima"
import { cuotaRestante, hoyMexico, ordenMomento, type MomentoPlan, type Momento, type PlanOutfit, type TipoPlan } from "@/lib/planificacion"
import { registrarUso } from "@/services/outfits.service"

/** Planes del usuario de la sesión (la RLS filtra) con sus momentos en orden. */
export async function fetchPlanes(supabase: SupabaseClient): Promise<PlanOutfit[]> {
  const { data, error } = await supabase.from("planes_outfit").select("*, plan_momentos(*)").order("fecha_inicio")
  if (error) throw error
  return (data ?? []).map(({ plan_momentos, ...plan }) => ({
    ...plan,
    momentos: ((plan_momentos ?? []) as MomentoPlan[]).sort(ordenMomento),
  })) as PlanOutfit[]
}

/** Días de planificación que le quedan hoy y este mes; null si no se pudo leer. */
export async function fetchCuotaPlan(
  supabase: SupabaseClient, userId: string, plan: Plan
): Promise<{ hoy: number; mes: number } | null> {
  const [{ data: p }, { data: l }] = await Promise.all([
    supabase.from("perfiles")
      .select("plan_dias_dia, plan_dias_dia_fecha, plan_dias_mes, plan_dias_mes_inicio")
      .eq("user_id", userId).maybeSingle(),
    supabase.from("limites_plan").select("plan_dias_dia, plan_dias_mes").eq("plan", plan).maybeSingle(),
  ])
  if (!p || !l) return null
  return cuotaRestante(p, l, hoyMexico())
}

export type DatosPlan = {
  tipo: TipoPlan
  nombre: string
  inicio: string
  fin: string
  lugar: Lugar | null
  momentos: { fecha: string; momento: Momento; actividad: string }[]
}

// Errores de crear_plan_outfit y de los checks de la tabla, en texto para la pantalla.
const ERRORES_CREAR: [string, string][] = [
  ["SOLO_ELITE", "La planificación es parte de Elite."],
  ["FECHA_PASADA", "Elige fechas a partir de hoy."],
  ["DEMASIADOS_PLANES", "Tienes 10 planes activos. Borra alguno para crear otro."],
  ["FALTAN_DIAS", "Revisa los días del plan."],
  ["MOMENTOS_INVALIDOS", "Revisa los días del plan."],
  ["LUGAR_INVALIDO", "Elige el destino de la lista."],
  ["viaje_con_lugar", "Elige el destino de la lista."],
  ["planes_outfit_rango", "Un plan puede durar hasta 30 días."],
]

/** Crea el plan con sus momentos y devuelve su id. Lanza con un texto listo para mostrar. */
export async function crearPlan(supabase: SupabaseClient, datos: DatosPlan): Promise<string> {
  const lugar = datos.lugar ? { ...datos.lugar, nombre: datos.lugar.nombre.slice(0, 80) } : null
  const { data, error } = await supabase.rpc("crear_plan_outfit", {
    p_tipo: datos.tipo, p_nombre: datos.nombre, p_inicio: datos.inicio, p_fin: datos.fin,
    p_lugar: lugar, p_momentos: datos.momentos,
  })
  if (error) {
    console.error("[crearPlan]", error.message)
    const texto = ERRORES_CREAR.find(([clave]) => error.message.includes(clave))?.[1]
    throw new Error(texto ?? "No pudimos crear el plan. Intenta de nuevo.")
  }
  return data as string
}

export type RespuestaGenerar =
  | { generados: number; errores: number; pendientes: number }
  | { error: string; limite?: MotivoLimite }

/** Arma el siguiente bloque del plan o, con momentoId, otro outfit para ese momento. */
export async function generar(planId: string, momentoId?: string): Promise<RespuestaGenerar> {
  const res = await fetch("/api/planificacion/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, momentoId }),
  }).catch(() => null)
  const json = await res?.json().catch(() => null)
  if (!res?.ok || !json) return { error: json?.error ?? "No pudimos armar los outfits. Revisa tu conexión.", limite: json?.limite }
  return json
}

export async function borrarPlan(supabase: SupabaseClient, planId: string): Promise<void> {
  const { error } = await supabase.rpc("borrar_plan_outfit", { p_plan: planId })
  if (error) throw error
}

export async function marcarEmpacada(supabase: SupabaseClient, planId: string, prendaId: string, empacada: boolean): Promise<void> {
  const { error } = await supabase.rpc("marcar_empacada", { p_plan: planId, p_prenda: String(prendaId), p_empacada: empacada })
  if (error) throw error
}

/** "Me lo puse": suma el uso de las prendas solo la primera vez. */
export async function marcarUsado(supabase: SupabaseClient, momento: MomentoPlan): Promise<void> {
  const { data, error } = await supabase.rpc("marcar_momento_usado", { p_momento: momento.id })
  if (error) throw error
  if (data === true && momento.outfit) await registrarUso(supabase, momento.outfit.prenda_ids)
}
