import type { SupabaseClient } from "@supabase/supabase-js"

const VAPID_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

/** El navegador soporta push y hay llave configurada. En iPhone solo con la app instalada. */
export function pushDisponible(): boolean {
  return typeof window !== "undefined" && !!VAPID_PUBLICA &&
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// La llave VAPID viene en base64url; pushManager.subscribe la quiere en bytes.
function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4)
  const binario = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

/** ¿Este dispositivo ya está suscrito? */
export async function pushActivo(): Promise<boolean> {
  if (!pushDisponible() || Notification.permission !== "granted") return false
  const reg = await navigator.serviceWorker.ready
  return !!(await reg.pushManager.getSubscription())
}

/**
 * Pide permiso (debe llamarse desde un clic) y guarda la suscripción de este
 * dispositivo. Devuelve un mensaje para mostrar.
 */
export async function activarPush(supabase: SupabaseClient, userId: string): Promise<string> {
  if (!pushDisponible()) {
    return "Tu navegador no admite notificaciones. En iPhone, primero instala Clossapp en tu pantalla de inicio."
  }
  const permiso = await Notification.requestPermission()
  if (permiso !== "granted") return "Sin permiso no podemos avisarte. Puedes activarlo en los ajustes del navegador."

  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlABytes(VAPID_PUBLICA) }))
  const json = sub.toJSON()
  const { error } = await supabase.from("push_suscripciones").insert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
  // 23505 = ya estaba guardada (mismo endpoint): no es un error para la usuaria.
  if (error && error.code !== "23505") {
    console.error("[push]", error.message)
    return "No se pudo activar. Intenta de nuevo."
  }
  return "Listo: te avisaremos si pasan dos semanas sin prendas nuevas."
}
