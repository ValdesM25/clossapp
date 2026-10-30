/**
 * "Volver a" después de entrar: /centros manda a "/?volver=/centros" y, al
 * terminar el login (también con Google, que redirige en la misma pestaña),
 * la app regresa ahí. Se guarda en sessionStorage para sobrevivir la redirección.
 */
const CLAVE = "clossapp_volver_a"

/** Solo rutas internas ("/algo"), nunca otro sitio ("//otro.com" o "https://…"). */
export function rutaInternaSegura(ruta: string | null | undefined): string | null {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\")) return null
  return ruta
}

export function guardarVolverA(ruta: string | null): void {
  const segura = rutaInternaSegura(ruta)
  if (segura) sessionStorage.setItem(CLAVE, segura)
}

/** Devuelve la ruta pendiente (una sola vez) o null. */
export function tomarVolverA(): string | null {
  const ruta = rutaInternaSegura(sessionStorage.getItem(CLAVE))
  sessionStorage.removeItem(CLAVE)
  return ruta
}
