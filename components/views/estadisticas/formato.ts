export function formatoMoneda(n: number) {
  return `$${Math.round(n).toLocaleString("es-MX")}`
}

/** "Hoy", "Hace 3 días", "Hace 2 meses"… o "Nunca usada" si no hay registro. */
export function formatoUltimoUso(dias: number | null) {
  if (dias === null) return "Nunca usada"
  if (dias === 0) return "Hoy"
  if (dias === 1) return "Ayer"
  if (dias < 30) return `Hace ${dias} días`
  if (dias < 365) {
    const meses = Math.floor(dias / 30)
    return `Hace ${meses} ${meses === 1 ? "mes" : "meses"}`
  }
  const anios = Math.floor(dias / 365)
  return `Hace ${anios} ${anios === 1 ? "año" : "años"}`
}

/** Etiqueta corta para el badge de prendas olvidadas: "8 meses", "1+ año", "Nunca usada". */
export function formatoTiempoGuardada(dias: number | null) {
  if (dias === null) return "Nunca usada"
  if (dias < 365) {
    const meses = Math.max(1, Math.floor(dias / 30))
    return `${meses} ${meses === 1 ? "mes" : "meses"}`
  }
  const anios = Math.floor(dias / 365)
  return `${anios}+ ${anios === 1 ? "año" : "años"}`
}
