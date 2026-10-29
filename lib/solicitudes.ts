/** Solicitudes para ser centro de acopio. Las reglas repiten los checks de supabase/10-solicitudes-acopio.sql. */
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada"

export type SolicitudDB = {
  id: string
  user_id: string
  nombre: string
  direccion: string
  ciudad: string
  horario: string
  capacidad_bolsas: number
  contacto_nombre: string
  telefono: string
  tipo_negocio: string | null
  mensaje: string | null
  estado: EstadoSolicitud
  nota_admin: string | null
  created_at: string
  revisada_at: string | null
}

export type SolicitudForm = {
  nombre: string
  direccion: string
  ciudad: string
  horario: string
  capacidad_bolsas: string
  contacto_nombre: string
  telefono: string
  tipo_negocio: string
  mensaje: string
}

export const SOLICITUD_VACIA: SolicitudForm = {
  nombre: "", direccion: "", ciudad: "", horario: "", capacidad_bolsas: "",
  contacto_nombre: "", telefono: "", tipo_negocio: "", mensaje: "",
}

/** Devuelve el primer problema en lenguaje claro, o null si todo está bien. */
export function validarSolicitud(f: SolicitudForm): string | null {
  const largo = (v: string, min: number, max: number) => v.trim().length >= min && v.trim().length <= max
  if (!largo(f.nombre, 2, 80)) return "Escribe el nombre del negocio."
  if (!largo(f.direccion, 5, 200)) return "Escribe la dirección completa."
  if (!largo(f.ciudad, 2, 60)) return "Escribe la ciudad."
  if (!largo(f.horario, 3, 120)) return "Escribe el horario de atención."
  const cap = Number(f.capacidad_bolsas)
  if (!Number.isInteger(cap) || cap < 1 || cap > 1000) return "La capacidad debe ser un número de bolsas entre 1 y 1000."
  if (!largo(f.contacto_nombre, 2, 80)) return "Escribe el nombre de la persona responsable."
  if (!/^[0-9+() -]{8,20}$/.test(f.telefono.trim())) return "Escribe un teléfono válido (solo números, de 8 a 20 dígitos)."
  if (f.tipo_negocio.length > 60) return "El tipo de negocio es muy largo."
  if (f.mensaje.length > 600) return "El mensaje es muy largo (máximo 600 caracteres)."
  return null
}
