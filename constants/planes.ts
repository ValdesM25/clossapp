/**
 * Planes y mensajes de límite. Los números viven en la tabla `limites_plan`
 * (supabase/15-limites-plan.sql); LIMITES_GRATIS.prendas es una copia solo
 * para el contador del armario. Si cambia allá, cambiarlo aquí.
 */
export type Plan = "gratis" | "premium"

export const LIMITES_GRATIS = {
  /** Prendas a la vez en el armario. Borrar una libera el lugar. */
  prendas: 50,
} as const

/** Motivos que devuelve `usar_ia` cuando niega la IA. */
export type MotivoLimite = "sin_sesion" | "outfit_dia" | "analisis_dia" | "analisis_total" | "global"

// Sin "pásate a Premium": los usuarios premium también ven estos avisos.
export const MENSAJES_LIMITE: Record<MotivoLimite | "prendas", string> = {
  sin_sesion: "Inicia sesión para usar las funciones de IA.",
  outfit_dia: "Ya usaste tus outfits con IA de hoy. Vuelve mañana.",
  analisis_dia: "Llegaste al tope de análisis con IA de hoy. Puedes llenar los datos a mano o volver mañana.",
  analisis_total: "Usaste todos los análisis con IA de tu plan. Puedes llenar los datos a mano.",
  global: "La IA gratis llegó a su tope de hoy. Vuelve mañana.",
  prendas: "El plan gratis permite hasta 50 prendas. Borra alguna o pásate a Premium.",
}
