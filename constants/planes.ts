/**
 * Planes y mensajes de límite. Los números viven en la tabla `limites_plan`
 * (supabase/15-limites-plan.sql y 17-suscripciones.sql); TOPE_PRENDAS es una
 * copia solo para el contador del armario. Si cambia allá, cambiarlo aquí.
 */
export type Plan = "gratis" | "plus" | "elite"

export const TOPE_PRENDAS: Record<Plan, number> = { gratis: 50, plus: 200, elite: 500 }

// "premium" sigue llegando hasta que se aplique 17-suscripciones.sql; cuenta como elite.
export function normalizarPlan(plan: string | null | undefined): Plan | null {
  if (plan === "premium") return "elite"
  return plan === "gratis" || plan === "plus" || plan === "elite" ? plan : null
}

export const esDePago = (plan: Plan | null) => plan === "plus" || plan === "elite"

export const NOMBRE_PLAN: Record<Plan, string> = { gratis: "Esencial", plus: "Plus", elite: "Elite" }

/** Lo que se muestra de cada plan; precios en MXN al mes, iguales a la landing y a Stripe. */
export const PLANES: { id: Plan; precio: number; resumen: string; incluye: string[] }[] = [
  {
    id: "gratis",
    precio: 0,
    resumen: "Para ordenar tu clóset y donar.",
    incluye: ["Hasta 50 prendas", "1 outfit con IA al día", "Donar ropa y ganar puntos"],
  },
  {
    id: "plus",
    precio: 89,
    resumen: "Para usar más y pasar lo que no usas.",
    incluye: ["Hasta 200 prendas", "Outfits con IA con uso justo", "Comprar, vender y rentar en el Shop", "Estadísticas avanzadas"],
  },
  {
    id: "elite",
    precio: 159,
    resumen: "Para planear cada look.",
    incluye: ["Hasta 500 prendas", "Todo lo de Plus", "Modelos de IA frontier", "Planificación de outfits"],
  },
]

/** Motivos que devuelve `usar_ia` cuando niega la IA. */
export type MotivoLimite = "sin_sesion" | "outfit_dia" | "analisis_dia" | "analisis_total" | "global"

// Sin "cambia de plan": los planes de pago también ven estos avisos.
export const MENSAJES_LIMITE: Record<MotivoLimite, string> = {
  sin_sesion: "Inicia sesión para usar las funciones de IA.",
  outfit_dia: "Ya usaste tus outfits con IA de hoy. Vuelve mañana.",
  analisis_dia: "Llegaste al tope de análisis con IA de hoy. Puedes llenar los datos a mano o volver mañana.",
  analisis_total: "Usaste todos los análisis con IA de tu plan. Puedes llenar los datos a mano.",
  global: "La IA gratis llegó a su tope de hoy. Vuelve mañana.",
}

export const mensajeTopePrendas = (plan: Plan) =>
  `Tu plan permite hasta ${TOPE_PRENDAS[plan]} prendas. Borra alguna${plan === "elite" ? "" : " o cambia de plan"}.`
