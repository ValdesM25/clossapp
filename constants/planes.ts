/**
 * Límites del plan gratis. Premium no tiene límites.
 *
 * La base aplica los mismos números (supabase/05-perfiles.sql); si se cambia
 * uno aquí hay que cambiarlo también allá.
 */
export type Plan = "gratis" | "premium"

export const LIMITES_GRATIS = {
  /** Prendas a la vez en el armario. Borrar una libera el lugar. */
  prendas: 50,
  /** Análisis IA de fotos, de por vida. */
  analisis: 50,
  /** Outfits / recomendaciones IA por día (hora de México). */
  outfitsPorDia: 1,
} as const

export const MENSAJES_LIMITE = {
  sinSesion: "Inicia sesión para usar las funciones de IA.",
  outfit: "Ya usaste tu outfit del día del plan gratis. Vuelve mañana o pásate a Premium.",
  analisis: "Usaste tus 50 análisis con IA del plan gratis. Puedes llenar los datos a mano o pasarte a Premium.",
  prendas: "El plan gratis permite hasta 50 prendas. Borra alguna o pásate a Premium.",
} as const
