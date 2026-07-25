/**
 * Datos de contacto y enlaces institucionales.
 *
 * LEGAL_CONTACTO debe apuntar SIEMPRE a un buzón que exista y se lea: es la
 * dirección por la que llegan las solicitudes de derechos ARCO, y la LFPDPPP
 * obliga a responderlas en 20 días hábiles. Cambiar a support@clossapp.com
 * únicamente cuando el dominio esté registrado y el buzón activo.
 */
export const LEGAL_CONTACTO = "support@clossapp.com"

/** Fecha de última actualización del aviso de privacidad y los términos. */
export const LEGAL_VIGENCIA = "25 de julio de 2026"

export type RedSocial = { id: string; label: string; url: string }

/**
 * Sólo se renderizan las redes con `url` no vacía. Llenar conforme se abran
 * las cuentas; dejar en "" mantiene el enlace fuera del footer.
 */
export const REDES: RedSocial[] = [
  { id: "instagram", label: "Instagram", url: "" },
  { id: "tiktok", label: "TikTok", url: "" },
  { id: "facebook", label: "Facebook", url: "" },
]

export const REDES_ACTIVAS = REDES.filter((r) => r.url.length > 0)
