// Tipos y utilidades de la bitácora de actividad compartidos entre cliente y servidor.
// La tabla y sus funciones viven en supabase/26-actividad.sql.

export const EVENTOS = {
  sesion_iniciada: "Inició sesión",
  sesion_social: "Entró con Google/Facebook",
  cuenta_confirmada: "Confirmó su correo",
  registro: "Creó cuenta",
  sesion_cerrada: "Cerró sesión",
  app_abierta: "Abrió la app",
  demo_iniciada: "Probó la demo",
  prenda_subida: "Subió una prenda",
  prenda_analizada: "Analizó una foto con IA",
  outfits_generados: "Generó outfits",
  outfit_elegido: "Eligió un outfit",
  perfil_actualizado: "Editó su perfil",
  foto_perfil_subida: "Cambió su foto de perfil",
} as const

export type Evento = keyof typeof EVENTOS

/** Eventos que el navegador puede reportar a /api/actividad. Los demás solo los escribe el servidor. */
export const EVENTOS_CLIENTE: readonly Evento[] = [
  "sesion_iniciada", "registro", "sesion_cerrada", "app_abierta", "demo_iniciada",
  "prenda_subida", "outfit_elegido", "perfil_actualizado", "foto_perfil_subida",
]

export interface Dispositivo {
  dispositivo: "movil" | "tablet" | "escritorio" | "bot"
  so: string | null
  navegador: string | null
}

/** Lectura simple del User-Agent: suficiente para estadísticas, sin dependencias. */
export function leerUserAgent(ua: string): Dispositivo {
  const s = ua || ""
  const bot = /bot|crawler|spider|preview|curl|wget|headless/i.test(s)
  const ipad = /iPad/.test(s) || (/Macintosh/.test(s) && /Mobile/.test(s))
  const tablet = ipad || (/Android/.test(s) && !/Mobile/.test(s)) || /Tablet/i.test(s)
  const movil = !tablet && /Mobi|iPhone|iPod|Android/i.test(s)

  let so: string | null = null
  const ios = s.match(/(?:iPhone|iPad|iPod).*?OS (\d+)/)
  const android = s.match(/Android (\d+)/)
  if (ios) so = `iOS ${ios[1]}`
  else if (ipad) so = "iPadOS"
  else if (android) so = `Android ${android[1]}`
  else if (/Windows/.test(s)) so = "Windows"
  else if (/CrOS/.test(s)) so = "ChromeOS"
  else if (/Mac OS X|Macintosh/.test(s)) so = "macOS"
  else if (/Linux/.test(s)) so = "Linux"

  let navegador: string | null = null
  if (/Edg\//.test(s)) navegador = "Edge"
  else if (/OPR\/|Opera/.test(s)) navegador = "Opera"
  else if (/SamsungBrowser/.test(s)) navegador = "Samsung Internet"
  else if (/FBAN|FBAV|Instagram/.test(s)) navegador = "Facebook/Instagram"
  else if (/CriOS|Chrome\//.test(s)) navegador = "Chrome"
  else if (/FxiOS|Firefox\//.test(s)) navegador = "Firefox"
  else if (/Safari\//.test(s)) navegador = "Safari"

  return { dispositivo: bot ? "bot" : tablet ? "tablet" : movil ? "movil" : "escritorio", so, navegador }
}

/**
 * Reporta un evento desde el navegador. Nunca lanza ni bloquea la UI:
 * si la bitácora falla, la app sigue igual.
 */
export function registrarActividad(evento: Evento, detalle: Record<string, unknown> = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  try {
    const pwa = window.matchMedia?.("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const body = JSON.stringify({ evento, detalle, pwa })
    // keepalive: el aviso de "cerró sesión" sale aunque la página cambie enseguida.
    return fetch("/api/actividad", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
      .then(() => {}, () => {})
  } catch {
    // sin bitácora no pasa nada
    return Promise.resolve()
  }
}
