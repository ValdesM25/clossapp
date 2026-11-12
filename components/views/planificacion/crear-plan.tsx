"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { es } from "react-day-picker/locale"
import { CalendarDays, ChevronLeft, ChevronRight, CopyCheck, Luggage, MapPin, Moon, Plus, Search, Star, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageProps } from "@/constants/animation"
import { Calendar } from "@/components/ui/calendar"
import { buscarLugares, type Lugar } from "@/lib/clima"
import { diasEntre, fechaCorta, MAX_DIAS_PLAN, prellenar, rangoFechas, sumarDias, type Momento, type TipoPlan } from "@/lib/planificacion"
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
          className="group border border-zinc-200 hover:border-zinc-900 bg-white p-4 text-left flex items-center gap-4 transition-[border-color,transform] active:scale-[0.98] sm:flex-col sm:items-start sm:p-5"
        >
          <span className="w-12 h-12 shrink-0 bg-zinc-900 text-white flex items-center justify-center">
            <Icono className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 flex flex-col gap-0.5">
            <span className="font-serif text-xl text-zinc-900">{titulo}</span>
            <span className="text-xs text-zinc-500">{texto}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 shrink-0 transition-colors sm:hidden" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

const EJEMPLO: Record<TipoPlan, string> = {
  semana: "Oficina, gym, algo casual…",
  fecha: "Boda, cena, entrevista…",
  viaje: "Pirámides de Teotihuacán, museo, cena…",
}
const ATAJOS: Record<TipoPlan, string[]> = {
  semana: ["Oficina", "Casual", "Cena", "Evento formal", "Deporte", "Reunión", "Salida"],
  fecha: ["Boda de día", "Boda de noche", "Cena formal", "Entrevista", "Graduación", "Coctel"],
  viaje: ["Turismo / Caminata", "Museo / Cultura", "Cena especial", "Paseo por el centro", "Excursión", "Playa", "Traslado"],
}

// text-base: con menos de 16 px, iOS acerca la página al enfocar el campo.
const input = "h-12 w-full border border-zinc-300 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
const etiqueta = "text-xs font-medium text-zinc-700"
const principal = "h-12 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-[background-color,transform] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
// Queda a la vista sobre la barra inferior aunque el formulario sea largo. El contenedor con scroll
// ya deja pb-40 abajo y sticky lo descuenta: el valor negativo la baja hasta quedar pegada a la barra.
const barraAccion = "sticky -bottom-20 z-10 -mx-4 px-4 pt-3 pb-7 bg-white/95 backdrop-blur border-t border-zinc-200 flex flex-col gap-2"

// El calendario trabaja con Date local; el plan guarda "aaaa-mm-dd".
const aFecha = (f: string) => { const [a, m, d] = f.split("-").map(Number); return new Date(a, m - 1, d) }
const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Buscador de lugares con Open-Meteo: hay que elegir uno de la lista. */
function BuscadorLugar({ lugar, onElegir }: { lugar: Lugar | null; onElegir: (l: Lugar | null) => void }) {
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Lugar[]>([])
  // Texto de la última búsqueda terminada: sin él, "no hay resultados" saldría mientras se escribe.
  const [buscado, setBuscado] = useState("")

  useEffect(() => {
    if (lugar) return
    let vigente = true
    const t = setTimeout(async () => {
      const r = await buscarLugares(texto)
      if (vigente) { setResultados(r); setBuscado(texto) }
    }, 300)
    return () => { vigente = false; clearTimeout(t) }
  }, [texto, lugar])

  if (lugar) {
    return (
      <div className="flex items-center justify-between gap-2 border border-zinc-900 bg-white pl-3 min-h-12">
        <span className="text-sm text-zinc-900 flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{lugar.nombre}</span>
        </span>
        <button type="button" onClick={() => { onElegir(null); setTexto("") }} aria-label="Cambiar lugar" className="w-12 h-12 shrink-0 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Busca una ciudad"
          aria-label="Buscar lugar"
          autoComplete="off"
          className={cn(input, "pl-9")}
        />
      </div>
      {resultados.length > 0 && (
        <ul className="border border-t-0 border-zinc-300 bg-white divide-y divide-zinc-100" aria-label="Lugares encontrados">
          {resultados.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onClick={() => onElegir(r)} className="w-full min-h-12 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      {resultados.length === 0 && buscado === texto && texto.trim().length >= 3 && (
        <p className="text-xs text-zinc-500 mt-1.5">No encontramos «{texto.trim()}». Prueba con la ciudad más cercana.</p>
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
  // En el rango, el primer toque marca el inicio y el segundo el final.
  const [eligiendoFin, setEligiendoFin] = useState(false)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const [ubicando, setUbicando] = useState(false)
  const [filas, setFilas] = useState<Record<string, Fila>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elegirTipo = (t: TipoPlan) => {
    const p = prellenar(t, hoy)
    setTipo(t); setNombre(p.nombre); setInicio(p.inicio); setFin(p.fin); setEligiendoFin(false); setLugar(null); setError(null); setPaso(2)
  }

  const esFecha = tipo === "fecha"
  const esViaje = tipo === "viaje"
  const maxFin = sumarDias(inicio, MAX_DIAS_PLAN - 1)
  const fechas = inicio && fin && fin >= inicio ? diasEntre(inicio, fin) : []
  const fila = (f: string): Fila => filas[f] ?? { actividad: "", noche: null }
  const cambiar = (f: string, cambio: Partial<Fila>) => setFilas((fs) => ({ ...fs, [f]: { ...fila(f), ...cambio } }))
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : null

  const elegirDia = (f: string) => {
    if (!eligiendoFin || f < inicio) { setInicio(f); setFin(f); setEligiendoFin(true) }
    else { setFin(f > maxFin ? maxFin : f); setEligiendoFin(false) }
  }

  const elegirLugar = (l: Lugar | null) => {
    setLugar(l)
    // El nombre sugerido no pisa uno que la persona ya escribió.
    if (esViaje && l && (!nombre.trim() || nombre.startsWith("Viaje a "))) setNombre(`Viaje a ${l.nombre.split(",")[0]}`.slice(0, 60))
  }

  const errorDatos =
    esViaje && !lugar ? "Elige el destino de la lista."
    : !inicio || inicio < hoy ? "Elige fechas a partir de hoy."
    : !fin || fin < inicio ? "La fecha final no puede ser antes de la inicial."
    : fin > maxFin ? "Un plan puede durar hasta 30 días."
    : !nombre.trim() ? "Ponle nombre a tu plan."
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

  const calendario = {
    locale: es,
    defaultMonth: aFecha(inicio || hoy),
    startMonth: aFecha(hoy),
    showOutsideDays: false,
    className: "w-full p-0 bg-transparent [--cell-size:--spacing(10)] [&_button]:rounded-none! [&_td]:rounded-none! [&_td]:aspect-auto! [&_td_button]:aspect-auto! [&_td_button]:h-10!",
    classNames: { root: "w-full", week: "flex w-full mt-1", caption_label: "font-serif text-lg font-normal first-letter:uppercase select-none" },
  }

  const campoNombre = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="plan-nombre" className={etiqueta}>Nombre</label>
      <input id="plan-nombre" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} className={input}
        placeholder={esViaje ? "Escapada a Oaxaca" : esFecha ? "Boda de Ana" : "Mi semana"} />
    </div>
  )

  const campoFechas = (
    <div className="flex flex-col gap-2">
      <span className={etiqueta}>{esFecha ? "¿Qué día es?" : esViaje ? "¿Cuándo viajas?" : "¿Qué días?"}</span>
      <div className="border border-zinc-200 bg-white p-3">
        {esFecha ? (
          <Calendar mode="single" required selected={aFecha(inicio)} disabled={{ before: aFecha(hoy) }}
            onSelect={(d) => { const f = aTexto(d); setInicio(f); setFin(f) }} {...calendario} />
        ) : (
          <Calendar mode="range" selected={{ from: aFecha(inicio), to: aFecha(fin) }}
            disabled={eligiendoFin ? [{ before: aFecha(hoy) }, { after: aFecha(maxFin) }] : { before: aFecha(hoy) }}
            onSelect={(_, dia) => elegirDia(aTexto(dia))} {...calendario} />
        )}
      </div>
      <p aria-live="polite" className="text-sm text-zinc-900 first-letter:uppercase">
        {esFecha ? fechaCorta(inicio)
          : eligiendoFin ? <span className="text-zinc-500">{esViaje ? "Ahora toca el día de regreso." : "Ahora toca el último día."}</span>
          : <>{rangoFechas(inicio, fin)} <span className="text-zinc-500">· {fechas.length} {fechas.length === 1 ? "día" : "días"}</span></>}
      </p>
      {!esFecha && !eligiendoFin && (
        <p className="text-xs text-zinc-500">{esViaje ? "Toca el día de ida y luego el de regreso." : "Toca el primer día y luego el último."}</p>
      )}
    </div>
  )

  const campoLugar = (
    <div className="flex flex-col gap-1.5">
      <span className={etiqueta}>{esViaje ? "¿A dónde vas?" : "Lugar (opcional)"}</span>
      <BuscadorLugar lugar={lugar} onElegir={elegirLugar} />
      {!esViaje && !lugar && (
        <>
          <button type="button" onClick={usarUbicacion} disabled={ubicando} className="self-start h-10 px-3 border border-zinc-300 hover:border-zinc-900 bg-white text-xs font-medium text-zinc-800 flex items-center gap-1.5 disabled:opacity-50">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            {ubicando ? "Buscando…" : "Usar mi ubicación"}
          </button>
          <p className="text-xs text-zinc-500">Sin lugar no podemos tomar en cuenta el clima.</p>
        </>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={atras} className="h-10 pr-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 shrink-0">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {paso === 1 || (paso === 2 && tipoInicial) ? "Mis planes" : "Atrás"}
        </button>
        <div className="flex-1 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={paso} aria-label={`Paso ${paso} de 3`}>
          {[1, 2, 3].map((n) => <span key={n} className={cn("h-0.5 flex-1 transition-colors duration-300", n <= paso ? "bg-zinc-900" : "bg-zinc-200")} />)}
        </div>
        <span className="text-xs text-zinc-500 tabular-nums shrink-0" aria-hidden="true">{paso} de 3</span>
      </div>

      <motion.div key={paso} {...pageProps} className="flex flex-col gap-6">
        {paso === 1 && (
          <>
            <h1 className="font-serif text-3xl text-zinc-900 font-normal">¿Qué quieres planear?</h1>
            <TarjetasTipo onElegir={elegirTipo} />
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="font-serif text-3xl text-zinc-900 font-normal">{TIPOS.find((t) => t.tipo === tipo)?.titulo}</h1>
            {/* En un viaje todo parte del destino: de ahí salen el nombre sugerido y el clima. */}
            {esViaje ? <>{campoLugar}{campoFechas}{campoNombre}</> : <>{campoNombre}{campoFechas}{campoLugar}</>}
            <div className={barraAccion}>
              {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
              {errorDatos && <p className="text-xs text-zinc-500">{errorDatos}</p>}
              <button type="button" disabled={!!errorDatos || eligiendoFin} onClick={() => { setError(null); setPaso(3) }} className={principal}>
                Siguiente
              </button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <div>
              <h1 className="font-serif text-3xl text-zinc-900 font-normal">{fechas.length === 1 ? "¿Qué harás ese día?" : "¿Qué harás cada día?"}</h1>
              <p className="text-xs text-zinc-500 mt-1">Si dejas uno vacío, nos guiamos por el nombre del plan.</p>
            </div>
            <div className="flex flex-col gap-3">
              {fechas.map((f, i) => {
                const { actividad, noche } = fila(f)
                return (
                  <div key={f} className="flex flex-col gap-2.5 border border-zinc-200 bg-white p-4">
                    <label htmlFor={`act-${f}`} className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-lg text-zinc-900 first-letter:uppercase">{fechaCorta(f)}</span>
                      {fechas.length > 1 && <span className="text-xs text-zinc-400">Día {i + 1}</span>}
                    </label>
                    <input id={`act-${f}`} value={actividad} maxLength={120} placeholder={EJEMPLO[tipo]} className={input}
                      onChange={(e) => cambiar(f, { actividad: e.target.value })} />
                    <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] overscroll-x-contain">
                      {(ATAJOS[tipo] ?? ATAJOS.semana).map((a) => (
                        <button key={a} type="button" aria-pressed={actividad === a} onClick={() => cambiar(f, { actividad: actividad === a ? "" : a })}
                          className={cn("shrink-0 h-10 px-3 border text-xs transition-colors",
                            actividad === a ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900")}>
                          {a}
                        </button>
                      ))}
                    </div>
                    {noche !== null && (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Moon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          <input aria-label={`Noche del ${fechaCorta(f)}`} value={noche} maxLength={120} placeholder="Cena, fiesta, salida…" className={cn(input, "pl-9")}
                            onChange={(e) => cambiar(f, { noche: e.target.value })} />
                        </div>
                        <button type="button" onClick={() => cambiar(f, { noche: null })} aria-label="Quitar la noche" className="w-12 h-12 shrink-0 border border-zinc-300 flex items-center justify-center text-zinc-500 hover:text-zinc-900">
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4">
                      {noche === null && (
                        <button type="button" onClick={() => cambiar(f, { noche: "" })} className="h-10 text-xs font-medium text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Outfit de noche
                        </button>
                      )}
                      {i === 0 && fechas.length > 1 && actividad.trim() && (
                        <button type="button" onClick={() => setFilas((fs) => Object.fromEntries(fechas.map((d) => [d, { noche: fs[d]?.noche ?? null, actividad }])))}
                          className="h-10 text-xs font-medium text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                          <CopyCheck className="w-3.5 h-3.5" aria-hidden="true" /> Usar en todos los días
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={barraAccion}>
              {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
              <p className="text-xs text-zinc-600">
                Este plan usa {fechas.length} {fechas.length === 1 ? "día" : "días"} de planificación.
                {quedaHoy !== null && fechas.length > quedaHoy && ` Hoy armamos ${quedaHoy} ${quedaHoy === 1 ? "día" : "días"}; el resto lo completas mañana.`}
              </p>
              <button type="button" onClick={crear} disabled={enviando} className={principal}>
                {enviando ? "Creando…" : "Crear y armar outfits"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
