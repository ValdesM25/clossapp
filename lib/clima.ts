// Clima de Open-Meteo (gratis, sin llave). Módulo neutral: sin `navigator` ni React,
// lo usan el servidor (planificación) y el cliente (buscar lugares, clima actual).

export type FuenteClima = "pronostico" | "historico"
export type ClimaDia = { min: number; max: number; texto: string; lluvia: boolean; fuente: FuenteClima }
export type Lugar = { nombre: string; lat: number; lon: number; zona?: string }

// Códigos WMO de Open-Meteo agrupados; el detalle fino no aporta a elegir ropa.
export function describir(codigo: number): { texto: string; lluvia: boolean } {
  if (codigo === 0) return { texto: "Despejado", lluvia: false }
  if (codigo <= 3) return { texto: "Nublado", lluvia: false }
  if (codigo === 45 || codigo === 48) return { texto: "Niebla", lluvia: false }
  if (codigo >= 71 && codigo <= 77) return { texto: "Nieve", lluvia: true }
  if (codigo >= 95) return { texto: "Tormenta", lluvia: true }
  if (codigo >= 51) return { texto: "Lluvia", lluvia: true }
  return { texto: "Nublado", lluvia: false }
}

const MS_DIA = 86_400_000
const utc = (f: string) => new Date(`${f}T00:00:00Z`).getTime()

/** El pronóstico de Open-Meteo cubre 16 días (hoy + 15); más lejos se usa el año pasado. */
export function fuenteParaFecha(fecha: string, hoy: string): FuenteClima {
  return (utc(fecha) - utc(hoy)) / MS_DIA <= 15 ? "pronostico" : "historico"
}

/** Misma fecha un año antes; el 29 de febrero pasa a 28. */
export function restarUnAnio(fecha: string): string {
  const [a, m, d] = fecha.split("-")
  const anio = String(Number(a) - 1).padStart(4, "0")
  return m === "02" && d === "29" ? `${anio}-02-28` : `${anio}-${m}-${d}`
}

type Diario = { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] }

async function pedirDiario(url: string): Promise<Diario | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  return (await res.json()).daily ?? null
}

/**
 * Clima por fecha del plan, con como máximo dos llamadas (pronóstico e histórico).
 * Nunca lanza: si una llamada falla, esas fechas quedan sin clima.
 */
export async function climaParaFechas(lugar: Lugar, fechas: string[], hoy: string): Promise<Record<string, ClimaDia>> {
  const resultado: Record<string, ClimaDia> = {}
  const base = `latitude=${lugar.lat}&longitude=${lugar.lon}&timezone=auto`
  const rango = (fs: string[]) => {
    const orden = [...fs].sort()
    return `start_date=${orden[0]}&end_date=${orden[orden.length - 1]}`
  }

  const pronostico = fechas.filter((f) => fuenteParaFecha(f, hoy) === "pronostico")
  const historico = fechas.filter((f) => fuenteParaFecha(f, hoy) === "historico")

  const pedirPronostico = async () => {
    if (!pronostico.length) return
    const daily = await pedirDiario(
      `https://api.open-meteo.com/v1/forecast?${base}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&${rango(pronostico)}`
    ) as (Diario & { precipitation_probability_max: (number | null)[] }) | null
    if (!daily) return
    for (const f of pronostico) {
      const i = daily.time.indexOf(f)
      if (i < 0 || daily.temperature_2m_min[i] == null) continue
      const d = describir(daily.weather_code[i])
      resultado[f] = {
        min: Math.round(daily.temperature_2m_min[i]),
        max: Math.round(daily.temperature_2m_max[i]),
        texto: d.texto,
        lluvia: d.lluvia || (daily.precipitation_probability_max[i] ?? 0) >= 50,
        fuente: "pronostico",
      }
    }
  }

  const pedirHistorico = async () => {
    if (!historico.length) return
    const pasadas = historico.map(restarUnAnio)
    const daily = await pedirDiario(
      `https://archive-api.open-meteo.com/v1/archive?${base}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&${rango(pasadas)}`
    ) as (Diario & { precipitation_sum: (number | null)[] }) | null
    if (!daily) return
    historico.forEach((f, k) => {
      const i = daily.time.indexOf(pasadas[k])
      if (i < 0 || daily.temperature_2m_min[i] == null) return
      const d = describir(daily.weather_code[i])
      // La llave es la fecha del plan, no la del año pasado.
      resultado[f] = {
        min: Math.round(daily.temperature_2m_min[i]),
        max: Math.round(daily.temperature_2m_max[i]),
        texto: d.texto,
        lluvia: d.lluvia || (daily.precipitation_sum[i] ?? 0) >= 2,
        fuente: "historico",
      }
    })
  }

  await Promise.all([pedirPronostico().catch(() => {}), pedirHistorico().catch(() => {})])
  return resultado
}

/** Lugares para el formulario del plan; [] con menos de 2 letras o si falla. */
export async function buscarLugares(texto: string): Promise<Lugar[]> {
  const q = texto.trim()
  if (q.length < 2) return []
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es&format=json`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const { results } = await res.json()
    return ((results ?? []) as { name?: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }[])
      .map((r) => {
        const partes: string[] = []
        for (const p of [r.name, r.admin1, r.country]) if (p && !partes.includes(p)) partes.push(p)
        return { nombre: partes.join(", "), lat: r.latitude, lon: r.longitude, zona: r.timezone }
      })
  } catch {
    return []
  }
}
