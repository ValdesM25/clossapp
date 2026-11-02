export interface Clima {
  temp: number
  texto: string
  lluvia: boolean
}

// Códigos WMO de Open-Meteo agrupados; el detalle fino no aporta a elegir ropa.
function describir(codigo: number): { texto: string; lluvia: boolean } {
  if (codigo === 0) return { texto: "Despejado", lluvia: false }
  if (codigo <= 3) return { texto: "Nublado", lluvia: false }
  if (codigo === 45 || codigo === 48) return { texto: "Niebla", lluvia: false }
  if (codigo >= 71 && codigo <= 77) return { texto: "Nieve", lluvia: true }
  if (codigo >= 95) return { texto: "Tormenta", lluvia: true }
  if (codigo >= 51) return { texto: "Lluvia", lluvia: true }
  return { texto: "Nublado", lluvia: false }
}

function posicion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Sin geolocalización"))
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 3600_000 })
  })
}

/** Clima actual de donde está el usuario; null si niega la ubicación o falla la red. */
export async function obtenerClima(): Promise<Clima | null> {
  try {
    const { coords } = await posicion()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const { current } = await res.json()
    return { temp: Math.round(current.temperature_2m), ...describir(current.weather_code) }
  } catch {
    return null
  }
}
