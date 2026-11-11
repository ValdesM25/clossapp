import { describir } from "@/lib/clima"

export interface Clima {
  temp: number
  texto: string
  lluvia: boolean
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
