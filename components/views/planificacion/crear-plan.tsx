"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, Luggage, MapPin, Plus, Star, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { buscarLugares, type Lugar } from "@/lib/clima"
import { diasEntre, fechaCorta, MAX_DIAS_PLAN, prellenar, sumarDias, type Momento, type TipoPlan } from "@/lib/planificacion"
import type { DatosPlan } from "@/services/planificacion.service"

export const TIPOS: { tipo: TipoPlan; titulo: string; texto: string; icono: LucideIcon }[] = [
  { tipo: "semana", titulo: "Mi semana", texto: "Lo que te pondrás cada día, según tu agenda.", icono: CalendarDays },
  { tipo: "fecha", titulo: "Fecha importante", texto: "Una boda, una entrevista, una cena especial.", icono: Star },
  { tipo: "viaje", titulo: "Viaje", texto: "Outfits para cada día y tu maleta lista.", icono: Luggage },
]

/** Las tres opciones como tarjetas grandes (paso 1 y lista vacía). */
export function TarjetasTipo({ onElegir }: { onElegir: (tipo: TipoPlan) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TIPOS.map(({ tipo, titulo, texto, icono: Icono }) => (
        <button
          key={tipo}
          type="button"
          onClick={() => onElegir(tipo)}
          className="border border-zinc-200 hover:border-zinc-900 bg-white p-5 text-left flex flex-col gap-2 transition-colors"
        >
          <Icono className="w-5 h-5 text-zinc-900" aria-hidden="true" />
          <span className="font-serif text-xl text-zinc-900">{titulo}</span>
          <span className="text-xs text-zinc-500">{texto}</span>
        </button>
      ))}
    </div>
  )
}

const EJEMPLO: Record<TipoPlan, string> = {
  semana: "Oficina, gym, algo casual…",
  fecha: "Boda, cena, entrevista…",
  viaje: "Museos, playa, cena…",
}
const ATAJOS = ["Oficina", "Casual", "Cena", "Evento formal", "Playa", "Deporte", "Turismo"]

const input = "h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
const etiqueta = "text-xs font-medium text-zinc-700"

/** Buscador de lugares con Open-Meteo: hay que elegir uno de la lista. */
function BuscadorLugar({ lugar, onElegir }: { lugar: Lugar | null; onElegir: (l: Lugar | null) => void }) {
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Lugar[]>([])

  useEffect(() => {
    if (lugar) return
    let vigente = true
    const t = setTimeout(async () => {
      const r = await buscarLugares(texto)
      if (vigente) setResultados(r)
    }, 300)
    return () => { vigente = false; clearTimeout(t) }
  }, [texto, lugar])

  if (lugar) {
    return (
      <div className="flex items-center justify-between gap-2 border border-zinc-900 bg-white px-3 min-h-11">
        <span className="text-sm text-zinc-900 flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{lugar.nombre}</span>
        </span>
        <button type="button" onClick={() => { onElegir(null); setTexto("") }} aria-label="Cambiar lugar" className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Busca una ciudad"
        aria-label="Buscar lugar"
        className={input}
      />
      {resultados.length > 0 && (
        <ul className="border border-t-0 border-zinc-300 bg-white" aria-label="Lugares encontrados">
          {resultados.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onClick={() => onElegir(r)} className="w-full min-h-11 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50">
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Fila = { actividad: string; noche: string | null }

/** Formulario en tres pasos: tipo, datos y qué harás cada día. */
export function CrearPlan({ hoy, tipoInicial, cuota, onCancelar, onCrear }: {
  hoy: string
  tipoInicial: TipoPlan | null
  cuota: { hoy: number; mes: number } | null
  onCancelar: () => void
  onCrear: (datos: DatosPlan) => Promise<void>
}) {
  const [paso, setPaso] = useState<1 | 2 | 3>(tipoInicial ? 2 : 1)
  const [tipo, setTipo] = useState<TipoPlan>(tipoInicial ?? "semana")
  const [nombre, setNombre] = useState(() => tipoInicial ? prellenar(tipoInicial, hoy).nombre : "")
  const [inicio, setInicio] = useState(() => prellenar(tipoInicial ?? "semana", hoy).inicio)
  const [fin, setFin] = useState(() => prellenar(tipoInicial ?? "semana", hoy).fin)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const [ubicando, setUbicando] = useState(false)
  const [filas, setFilas] = useState<Record<string, Fila>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elegirTipo = (t: TipoPlan) => {
    const p = prellenar(t, hoy)
    setTipo(t); setNombre(p.nombre); setInicio(p.inicio); setFin(p.fin); setLugar(null); setError(null); setPaso(2)
  }

  const maxFin = sumarDias(inicio, MAX_DIAS_PLAN - 1)
  const fechas = inicio && fin && fin >= inicio ? diasEntre(inicio, fin) : []
  const fila = (f: string): Fila => filas[f] ?? { actividad: "", noche: null }
  const cambiar = (f: string, cambio: Partial<Fila>) => setFilas((fs) => ({ ...fs, [f]: { ...fila(f), ...cambio } }))
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : null

  const errorDatos =
    !nombre.trim() ? "Ponle nombre a tu plan."
    : !inicio || inicio < hoy ? "Elige fechas a partir de hoy."
    : !fin || fin < inicio ? "La fecha final no puede ser antes de la inicial."
    : fin > maxFin ? "Un plan puede durar hasta 30 días."
    : tipo === "viaje" && !lugar ? "Elige el destino de la lista."
    : null

  const usarUbicacion = () => {
    if (!navigator.geolocation) { setError("Tu navegador no comparte la ubicación."); return }
    setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLugar({ nombre: "Tu ubicación", lat: coords.latitude, lon: coords.longitude }); setUbicando(false) },
      () => { setError("No pudimos leer tu ubicación. Búscala en la lista."); setUbicando(false) },
      { timeout: 8000, maximumAge: 3_600_000 },
    )
  }

  const crear = async () => {
    setEnviando(true)
    setError(null)
    const momentos = fechas.flatMap((f) => {
      const { actividad, noche } = fila(f)
      const lista: { fecha: string; momento: Momento; actividad: string }[] = [{ fecha: f, momento: "dia", actividad: actividad.trim() }]
      if (noche !== null) lista.push({ fecha: f, momento: "noche", actividad: noche.trim() })
      return lista
    })
    try {
      await onCrear({ tipo, nombre: nombre.trim(), inicio, fin, lugar, momentos })
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear el plan. Intenta de nuevo.")
      setEnviando(false)
    }
  }

  const atras = () => paso === 1 || (paso === 2 && tipoInicial) ? onCancelar() : setPaso((p) => (p - 1) as 1 | 2)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={atras} className="h-10 pr-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {paso === 1 ? "Mis planes" : "Atrás"}
        </button>
        <span className="text-xs text-zinc-400 ml-auto">Paso {paso} de 3</span>
      </div>

      {paso === 1 && (
        <>
          <h1 className="font-serif text-3xl text-zinc-900 font-normal">¿Qué quieres planear?</h1>
          <TarjetasTipo onElegir={elegirTipo} />
        </>
      )}

      {paso === 2 && (
        <>
          <h1 className="font-serif text-3xl text-zinc-900 font-normal">{TIPOS.find((t) => t.tipo === tipo)?.titulo}</h1>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-nombre" className={etiqueta}>Nombre</label>
            <input id="plan-nombre" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} className={input}
              placeholder={tipo === "viaje" ? "Escapada a Oaxaca" : tipo === "fecha" ? "Boda de Ana" : "Mi semana"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="plan-inicio" className={etiqueta}>Desde</label>
              <input id="plan-inicio" type="date" min={hoy} value={inicio} className={input} onChange={(e) => {
                const v = e.target.value
                setInicio(v)
                if (tipo === "fecha" || !fin || fin < v || fin > sumarDias(v, MAX_DIAS_PLAN - 1)) setFin(v)
              }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="plan-fin" className={etiqueta}>Hasta</label>
              <input id="plan-fin" type="date" min={inicio || hoy} max={maxFin} value={fin} className={input} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={etiqueta}>{tipo === "viaje" ? "Destino" : "Lugar (opcional)"}</span>
            <BuscadorLugar lugar={lugar} onElegir={setLugar} />
            {tipo !== "viaje" && !lugar && (
              <>
                <button type="button" onClick={usarUbicacion} disabled={ubicando} className="self-start h-10 px-3 border border-zinc-300 hover:border-zinc-900 bg-white text-xs font-medium text-zinc-800 flex items-center gap-1.5 disabled:opacity-50">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {ubicando ? "Buscando…" : "Usar mi ubicación"}
                </button>
                <p className="text-xs text-zinc-500">Sin lugar no podemos tomar en cuenta el clima.</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" disabled={!!errorDatos} onClick={() => { setError(null); setPaso(3) }} className="h-11 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium disabled:opacity-50">
              Siguiente
            </button>
            {errorDatos && <p className="text-xs text-zinc-500">{errorDatos}</p>}
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          </div>
        </>
      )}

      {paso === 3 && (
        <>
          <div>
            <h1 className="font-serif text-3xl text-zinc-900 font-normal">¿Qué harás cada día?</h1>
            <p className="text-xs text-zinc-500 mt-1">Si dejas uno vacío, armamos algo casual.</p>
          </div>
          <div className="flex flex-col gap-5">
            {fechas.map((f) => {
              const { actividad, noche } = fila(f)
              return (
                <div key={f} className="flex flex-col gap-2 border-b border-zinc-100 pb-5">
                  <label htmlFor={`act-${f}`} className="text-sm font-medium text-zinc-900 first-letter:uppercase">{fechaCorta(f)}</label>
                  <input id={`act-${f}`} value={actividad} maxLength={120} placeholder={EJEMPLO[tipo]} className={input}
                    onChange={(e) => cambiar(f, { actividad: e.target.value })} />
                  <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] overscroll-x-contain">
                    {ATAJOS.map((a) => (
                      <button key={a} type="button" onClick={() => cambiar(f, { actividad: a })}
                        className={cn("shrink-0 h-10 px-3 border text-xs transition-colors",
                          actividad === a ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900")}>
                        {a}
                      </button>
                    ))}
                  </div>
                  {noche === null ? (
                    <button type="button" onClick={() => cambiar(f, { noche: "" })} className="self-start h-10 text-xs font-medium text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Noche
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input aria-label={`Noche del ${fechaCorta(f)}`} value={noche} maxLength={120} placeholder="Cena, fiesta, salida…" className={input}
                        onChange={(e) => cambiar(f, { noche: e.target.value })} />
                      <button type="button" onClick={() => cambiar(f, { noche: null })} aria-label="Quitar la noche" className="w-11 h-11 shrink-0 border border-zinc-300 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-700">
              Este plan usa {fechas.length} {fechas.length === 1 ? "día" : "días"} de planificación.
              {quedaHoy !== null && fechas.length > quedaHoy && ` Hoy armamos ${quedaHoy} ${quedaHoy === 1 ? "día" : "días"}; el resto lo completas mañana.`}
            </p>
            <button type="button" onClick={crear} disabled={enviando} className="h-11 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium disabled:opacity-50">
              {enviando ? "Creando…" : "Crear y armar outfits"}
            </button>
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}
