"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, MapPin, Moon, Plus, Search, Sun, UtensilsCrossed, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buscarLugares, type Lugar } from "@/lib/clima"
import { obtenerDestinoReal, type DestinoReal } from "@/lib/destinos"
import { diasEntre, fechaCorta, MAX_DIAS_PLAN, prellenar, sumarDias, type Momento } from "@/lib/planificacion"
import type { DatosPlan } from "@/services/planificacion.service"
import {
  CIUDADES_DESTACADAS,
  FILTROS_LUGARES,
  INTERESES_VIAJE,
  ciudadCorta,
  formatearCoordenadas,
  rangoFechasEditorial,
  type CategoriaLugar,
  type LugarSugerido,
} from "@/constants/viajes-lugares"
import { ViajeStepper } from "./viaje-stepper"

const DESTINO_PREVIA_DEFAULT: Lugar = CIUDADES_DESTACADAS[2] // París, Francia

interface PlanDiaViaje {
  dia: LugarSugerido[]
  /** Si es distinto de null, el usuario activó un 2.º outfit (Noche) para ese día. */
  noche: LugarSugerido[] | null
}

const DIA_VACIO: PlanDiaViaje = { dia: [], noche: null }

/**
 * Flujo editorial en 2 pasos para crear un Viaje (Paso 1: Destino, Paso 2: Lugares por día).
 * Permite elegir 1 outfit por día o activar un 2.º outfit (Noche) en los días que la persona quiera.
 */
export function CrearViaje({
  hoy,
  cuota,
  onAtras,
  onCrear,
}: {
  hoy: string
  cuota: { hoy: number; mes: number } | null
  onAtras: () => void
  onCrear: (datos: DatosPlan) => Promise<void>
}) {
  const inicial = useMemo(() => prellenar("viaje", hoy), [hoy])
  const [paso, setPaso] = useState<1 | 2>(1)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<Lugar[]>([])
  const [buscandoCiudad, setBuscandoCiudad] = useState(false)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [inicio, setInicio] = useState(inicial.inicio)
  const [fin, setFin] = useState(inicial.fin)
  const [intereses, setIntereses] = useState<string[]>(["Arte y cultura", "Paseos"])
  const [filtro, setFiltro] = useState<"Para ti" | CategoriaLugar>("Para ti")
  const [destinoReal, setDestinoReal] = useState<DestinoReal | null>(null)
  const [cargandoDestino, setCargandoDestino] = useState(true)
  // Lugares elegidos POR DÍA (y opcionalmente 2.º outfit de Noche)
  const [diaActivoIdx, setDiaActivoIdx] = useState(0)
  const [momentoActivo, setMomentoActivo] = useState<Momento>("dia")
  const [planesPorDia, setPlanesPorDia] = useState<Record<string, PlanDiaViaje>>({})
  const [personalizado, setPersonalizado] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxFin = sumarDias(inicio, MAX_DIAS_PLAN - 1)
  const fechas = useMemo(() => (inicio && fin && fin >= inicio ? diasEntre(inicio, fin) : []), [inicio, fin])
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : null

  const idxDiaSeguro = Math.min(diaActivoIdx, Math.max(0, fechas.length - 1))
  const fechaActiva = fechas[idxDiaSeguro] ?? ""
  const planDiaActivo = planesPorDia[fechaActiva] ?? DIA_VACIO
  const tieneSegundoOutfit = planDiaActivo.noche !== null
  const momentoSeguro: Momento = momentoActivo === "noche" && tieneSegundoOutfit ? "noche" : "dia"
  const seleccionadosMomento = momentoSeguro === "noche" ? (planDiaActivo.noche ?? []) : planDiaActivo.dia

  // Búsqueda de ciudades reales con Open-Meteo
  useEffect(() => {
    if (lugar) return
    let vigente = true
    const t = setTimeout(async () => {
      if (busqueda.trim().length < 2) {
        if (vigente) { setResultados([]); setBuscandoCiudad(false) }
        return
      }
      setBuscandoCiudad(true)
      const r = await buscarLugares(busqueda)
      if (vigente) {
        setResultados(r)
        setBuscandoCiudad(false)
      }
    }, 280)
    return () => { vigente = false; clearTimeout(t) }
  }, [busqueda, lugar])

  // Foto real de la ciudad + lugares reales cercanos con sus fotografías reales
  const objetivoFoto = lugar ?? DESTINO_PREVIA_DEFAULT
  useEffect(() => {
    let vigente = true
    setCargandoDestino(true)
    obtenerDestinoReal(objetivoFoto)
      .then((info) => {
        if (!vigente) return
        setDestinoReal(info)
        setPlanesPorDia({})
        setDiaActivoIdx(0)
        setMomentoActivo("dia")
        setFiltro("Para ti")
      })
      .finally(() => {
        if (vigente) setCargandoDestino(false)
      })
    return () => { vigente = false }
  }, [objetivoFoto])

  const cambiarDia = (nuevoIdx: number) => {
    setDiaActivoIdx(nuevoIdx)
    setMomentoActivo("dia")
  }

  const activarSegundoOutfit = () => {
    if (!fechaActiva) return
    setPlanesPorDia((prev) => {
      const actual = prev[fechaActiva] ?? DIA_VACIO
      return { ...prev, [fechaActiva]: { ...actual, noche: actual.noche ?? [] } }
    })
    setMomentoActivo("noche")
  }

  const quitarSegundoOutfit = () => {
    if (!fechaActiva) return
    setPlanesPorDia((prev) => {
      const actual = prev[fechaActiva] ?? DIA_VACIO
      return { ...prev, [fechaActiva]: { ...actual, noche: null } }
    })
    setMomentoActivo("dia")
  }

  const errorPaso1 =
    !lugar ? "Elige una ciudad de la lista para conocer su clima y lugares."
    : !inicio || inicio < hoy ? "Elige fechas a partir de hoy."
    : !fin || fin < inicio ? "La fecha de vuelta no puede ser antes de la de ida."
    : fin > maxFin ? "Un viaje puede durar hasta 30 días."
    : null

  const toggleInteres = (item: string) => {
    setIntereses((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]))
  }

  const toggleLugarEnMomento = (item: LugarSugerido) => {
    if (!fechaActiva) return
    setPlanesPorDia((prev) => {
      const actual = prev[fechaActiva] ?? DIA_VACIO
      const lista = momentoSeguro === "noche" ? (actual.noche ?? []) : actual.dia
      const existe = lista.some((x) => x.id === item.id)
      const nuevaLista = existe ? lista.filter((x) => x.id !== item.id) : [...lista, item]
      return {
        ...prev,
        [fechaActiva]: momentoSeguro === "noche"
          ? { ...actual, noche: nuevaLista }
          : { ...actual, dia: nuevaLista },
      }
    })
  }

  const agregarPersonalizado = () => {
    const limpio = personalizado.trim()
    if (!limpio || !fechaActiva) return
    const nuevo: LugarSugerido = {
      id: `custom-${Date.now()}`,
      nombre: limpio,
      categoria: "Barrios con encanto",
      descripcion: "Plan personalizado añadido a este día.",
      detalles: "A tu ritmo · Personalizado",
      imagen: destinoReal?.imagen ?? null,
    }
    setPlanesPorDia((prev) => {
      const actual = prev[fechaActiva] ?? DIA_VACIO
      return {
        ...prev,
        [fechaActiva]: momentoSeguro === "noche"
          ? { ...actual, noche: [...(actual.noche ?? []), nuevo] }
          : { ...actual, dia: [...actual.dia, nuevo] },
      }
    })
    setPersonalizado("")
  }

  // Incluye los lugares del catálogo + personalizados añadidos al momento activo
  const todosLosLugares = useMemo(() => {
    const base = destinoReal?.lugares ?? []
    const idsBase = new Set(base.map((l) => l.id))
    const extras = seleccionadosMomento.filter((s) => !idsBase.has(s.id))
    return [...base, ...extras]
  }, [destinoReal?.lugares, seleccionadosMomento])

  const lugaresFiltrados = useMemo(() => {
    if (filtro === "Para ti") return todosLosLugares
    return todosLosLugares.filter((l) => l.categoria === filtro)
  }, [todosLosLugares, filtro])

  const diasConLugares = fechas.filter((f) => {
    const p = planesPorDia[f]
    return p && (p.dia.length > 0 || (p.noche?.length ?? 0) > 0)
  }).length

  const totalOutfits = fechas.reduce((acc, f) => acc + 1 + (planesPorDia[f]?.noche !== null && planesPorDia[f]?.noche !== undefined ? 1 : 0), 0)
  const totalLugaresElegidos = fechas.reduce(
    (acc, f) => acc + (planesPorDia[f]?.dia.length ?? 0) + (planesPorDia[f]?.noche?.length ?? 0),
    0
  )

  const crear = async () => {
    if (!lugar || fechas.length === 0) return
    setEnviando(true)
    setError(null)

    const momentos: { fecha: string; momento: Momento; actividad: string }[] = fechas.flatMap((f) => {
      const p = planesPorDia[f] ?? DIA_VACIO
      const actDia = p.dia.length > 0
        ? p.dia.map((l) => l.nombre).join(", ").slice(0, 120)
        : "Día libre y paseo casual"
      const lista: { fecha: string; momento: Momento; actividad: string }[] = [
        { fecha: f, momento: "dia", actividad: actDia },
      ]
      if (p.noche !== null) {
        const actNoche = p.noche.length > 0
          ? p.noche.map((l) => l.nombre).join(", ").slice(0, 120)
          : "Cena o salida de noche"
        lista.push({ fecha: f, momento: "noche", actividad: actNoche })
      }
      return lista
    })

    const nombrePlan = `Viaje a ${ciudadCorta(lugar.nombre)}`.slice(0, 60)
    try {
      await onCrear({ tipo: "viaje", nombre: nombrePlan, inicio, fin, lugar, momentos })
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear tu viaje. Intenta de nuevo.")
      setEnviando(false)
    }
  }

  const coordenadas = formatearCoordenadas(objetivoFoto.lat, objetivoFoto.lon)
  const fraseDestino = destinoReal?.frase ?? `${ciudadCorta(objetivoFoto.nombre)}, siempre es buena idea.`
  const subtituloDestino = destinoReal?.subtitulo ?? "Un café, un museo, una calle por descubrir."
  const etiquetaMomento = momentoSeguro === "noche" ? `Día ${idxDiaSeguro + 1} · Noche` : `Día ${idxDiaSeguro + 1}`

  return (
    <div className="flex flex-col gap-5 sm:gap-8 w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (paso === 2 ? setPaso(1) : onAtras())}
          className="h-10 pr-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {paso === 2 ? "Volver a destino" : "Mis planes"}
        </button>
      </div>

      <ViajeStepper pasoActual={paso} onPaso={(p) => { if (p === 1) setPaso(1) }} />

      {/* PASO 1: DESTINO */}
      {paso === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-6 sm:gap-8 lg:gap-12 items-start w-full min-w-0">
          {/* Columna izquierda: formulario */}
          <div className="flex flex-col gap-5 sm:gap-6 w-full min-w-0">
            <div className="flex flex-col gap-2.5 sm:gap-3 min-w-0">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-terracota font-medium">
                Un viaje, muchas versiones de ti.
              </p>
              <h1 className="font-serif text-[1.9rem] sm:text-4xl lg:text-[2.75rem] text-zinc-900 font-normal leading-[1.1] tracking-tight break-words">
                Tu próximo destino,
                <br />
                tu próximo outfit.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md">
                Descubre qué visitar y qué ponerte. Creamos looks con tu armario para cada día de tu viaje.
              </p>
            </div>

            {/* Buscador de destino */}
            <div className="flex flex-col gap-1.5 relative w-full min-w-0">
              <label htmlFor="viaje-destino" className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                ¿A dónde viajas?
              </label>
              {lugar ? (
                <div className="h-12 w-full min-w-0 border border-zinc-300 bg-[#F4F0E9] px-3.5 flex items-center justify-between gap-2 box-border">
                  <span className="text-sm text-zinc-900 truncate min-w-0">{lugar.nombre}</span>
                  <button
                    type="button"
                    onClick={() => { setLugar(null); setBusqueda(""); setMostrarSugerencias(true) }}
                    aria-label="Cambiar destino"
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 shrink-0"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="relative w-full min-w-0">
                  <input
                    id="viaje-destino"
                    type="search"
                    value={busqueda}
                    onFocus={() => setMostrarSugerencias(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 180)}
                    onChange={(e) => { setBusqueda(e.target.value); setMostrarSugerencias(true) }}
                    placeholder="Ciudad de México, Oaxaca, París…"
                    className="h-12 w-full min-w-0 max-w-full box-border border border-zinc-300 bg-[#F4F0E9] pl-3.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />

                  {mostrarSugerencias && (buscandoCiudad || resultados.length > 0 || busqueda.trim().length < 2) && (
                    <ul
                      className="absolute z-20 left-0 right-0 top-full w-full max-w-full border border-t-0 border-zinc-300 bg-[#F4F0E9] shadow-md max-h-60 overflow-y-auto overflow-x-hidden"
                      aria-label="Ciudades encontradas"
                    >
                      {buscandoCiudad ? (
                        <li className="px-3.5 py-3 text-xs text-zinc-500">Buscando ciudades…</li>
                      ) : (
                        (resultados.length > 0 ? resultados : CIUDADES_DESTACADAS).map((r) => (
                          <li key={`${r.lat},${r.lon}`} className="w-full min-w-0">
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setLugar(r); setBusqueda(r.nombre); setMostrarSugerencias(false) }}
                              className="w-full min-h-11 px-3.5 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 border-b border-zinc-200/60 last:border-b-0 flex items-center justify-between gap-2 min-w-0"
                            >
                              <span className="truncate min-w-0">{r.nombre}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
              <div className="flex flex-col gap-1.5 min-w-0 w-full">
                <label htmlFor="viaje-ida" className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                  Fecha de ida
                </label>
                <input
                  id="viaje-ida"
                  type="date"
                  min={hoy}
                  value={inicio}
                  onChange={(e) => {
                    const v = e.target.value
                    setInicio(v)
                    if (!fin || fin < v || fin > sumarDias(v, MAX_DIAS_PLAN - 1)) setFin(sumarDias(v, 3))
                  }}
                  className="h-12 w-full min-w-0 max-w-full box-border appearance-none border border-zinc-300 bg-[#F4F0E9] px-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0 w-full">
                <label htmlFor="viaje-vuelta" className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                  Fecha de vuelta
                </label>
                <input
                  id="viaje-vuelta"
                  type="date"
                  min={inicio || hoy}
                  max={maxFin}
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  className="h-12 w-full min-w-0 max-w-full box-border appearance-none border border-zinc-300 bg-[#F4F0E9] px-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>
            </div>

            {/* Cómo te gusta viajar */}
            <div className="flex flex-col gap-2 w-full min-w-0">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                ¿Cómo te gusta viajar?
              </span>
              <div className="flex flex-wrap gap-2 w-full min-w-0">
                {INTERESES_VIAJE.map((item) => {
                  const activo = intereses.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInteres(item)}
                      className={cn(
                        "h-9 px-3 text-xs font-medium flex items-center gap-1.5 border transition-colors max-w-full",
                        activo
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-[#F4F0E9] text-zinc-700 border-zinc-300 hover:border-zinc-900"
                      )}
                    >
                      {activo ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{item}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Botón principal */}
            <div className="flex flex-col gap-2 pt-1 w-full min-w-0">
              <button
                type="button"
                disabled={!!errorPaso1}
                onClick={() => { setError(null); cambiarDia(0); setPaso(2) }}
                className="h-12 w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 flex items-center justify-between transition-colors disabled:opacity-45"
              >
                <span>Descubrir lugares</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
              {errorPaso1 ? (
                <p className="text-xs text-zinc-500">{errorPaso1}</p>
              ) : (
                <p className="text-xs text-zinc-500">Tú eliges el plan de cada día. Tu armario hace el resto.</p>
              )}
            </div>
          </div>

          {/* Columna derecha: tarjeta editorial del destino con foto real */}
          <div className="bg-zinc-900 text-white flex flex-col overflow-hidden w-full min-w-0">
            <div className="pr-0 sm:pr-6 lg:pr-8 bg-zinc-900 w-full">
              <div className="aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/4.2] w-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                {cargandoDestino ? (
                  <div className="w-full h-full bg-zinc-800 animate-pulse" />
                ) : destinoReal?.imagen ? (
                  <img
                    src={destinoReal.imagen}
                    alt={objetivoFoto.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <MapPin className="w-6 h-6" aria-hidden="true" />
                    <span className="text-xs">{ciudadCorta(objetivoFoto.nombre)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6 flex items-end justify-between gap-4 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase truncate">{coordenadas}</p>
                <p className="font-serif text-xl sm:text-2xl text-white font-normal mt-1.5 leading-snug break-words">
                  {fraseDestino}
                </p>
                <p className="text-xs text-zinc-400 mt-1">{subtituloDestino}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-terracota shrink-0 mb-1" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: ELEGIR LUGARES POR DÍA (CON OPCIÓN DE 2 OUTFITS POR DÍA) */}
      {paso === 2 && lugar && (
        <div className="flex flex-col gap-5 sm:gap-6 w-full min-w-0">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-terracota font-medium truncate">
                {lugar.nombre.toUpperCase()} / {rangoFechasEditorial(inicio, fin)}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-normal leading-tight">
                ¿Qué visitarás cada día?
              </h1>
              <p className="text-sm text-zinc-600">
                Elige un día y selecciona sus lugares. Si necesitas cambio para la noche, puedes añadir un 2.º outfit en ese día.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="self-start sm:self-auto h-10 px-4 border border-zinc-300 hover:border-zinc-900 bg-[#F4F0E9] text-xs font-medium text-zinc-800 flex items-center gap-2 transition-colors shrink-0"
            >
              <span>Cambiar destino</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Selector de DÍAS del viaje */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
              Selecciona el día que estás planeando
            </span>
            <div className="w-full max-w-full flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] overscroll-x-contain">
              {fechas.map((f, idx) => {
                const esActivo = idx === idxDiaSeguro
                const p = planesPorDia[f] ?? DIA_VACIO
                const cuenta = p.dia.length + (p.noche?.length ?? 0)
                const outfitsDia = p.noche !== null ? 2 : 1
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={esActivo}
                    onClick={() => cambiarDia(idx)}
                    className={cn(
                      "shrink-0 px-3.5 py-2.5 border text-left flex flex-col gap-0.5 transition-colors min-w-[122px]",
                      esActivo
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : cuenta > 0
                          ? "bg-[#F4F0E9] text-zinc-900 border-terracota"
                          : "bg-[#F4F0E9] text-zinc-700 border-zinc-300 hover:border-zinc-900"
                    )}
                  >
                    <span className={cn("text-[10px] uppercase tracking-widest font-semibold", esActivo ? "text-terracota" : "text-zinc-500")}>
                      Día {idx + 1} · {fechaCorta(f)}
                    </span>
                    <span className={cn("text-xs font-medium", esActivo ? "text-white" : "text-zinc-800")}>
                      {cuenta === 0 ? "Sin lugares aún" : `${cuenta} ${cuenta === 1 ? "lugar" : "lugares"}`}
                      {outfitsDia === 2 && (
                        <span className={cn("ml-1.5 text-[10px]", esActivo ? "text-zinc-300" : "text-terracota")}>
                          · 2 outfits
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Control de 1 o 2 outfits para el día activo */}
          <div className="border border-zinc-200 bg-[#F4F0E9] p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            {tieneSegundoOutfit ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMomentoActivo("dia")}
                    className={cn(
                      "h-9 px-3.5 text-xs font-medium border flex items-center gap-1.5 transition-colors",
                      momentoSeguro === "dia"
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    Outfit 1 · Día ({planDiaActivo.dia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomentoActivo("noche")}
                    className={cn(
                      "h-9 px-3.5 text-xs font-medium border flex items-center gap-1.5 transition-colors",
                      momentoSeguro === "noche"
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    Outfit 2 · Noche ({planDiaActivo.noche?.length ?? 0})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={quitarSegundoOutfit}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Solo 1 outfit este día
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-zinc-700">
                  <Sun className="w-3.5 h-3.5 text-terracota shrink-0" aria-hidden="true" />
                  <span>Planeando <strong>1 outfit</strong> para el Día {idxDiaSeguro + 1}.</span>
                </div>
                <button
                  type="button"
                  onClick={activarSegundoOutfit}
                  className="h-9 px-3.5 border border-zinc-900 bg-white hover:bg-zinc-900 hover:text-white text-zinc-900 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  + Agregar 2.º outfit (Noche)
                </button>
              </>
            )}
          </div>

          {/* Filtros de categoría (solo muestra categorías con resultados disponibles) */}
          <div className="w-full max-w-full flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] overscroll-x-contain">
            {FILTROS_LUGARES.filter((cat) => cat === "Para ti" || todosLosLugares.some((l) => l.categoria === cat)).map((cat) => {
              const activo = filtro === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFiltro(cat)}
                  className={cn(
                    "shrink-0 h-9 px-3.5 text-xs font-medium border transition-colors",
                    activo
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-[#F4F0E9] text-zinc-700 border-zinc-300 hover:border-zinc-900"
                  )}
                >
                  {cat}
                </button>
              )
            })}
            <span className="text-xs text-zinc-500 pl-2 shrink-0">
              {cargandoDestino
                ? "Buscando lugares reales…"
                : `${lugaresFiltrados.length} ${lugaresFiltrados.length === 1 ? "lugar recomendado" : "lugares recomendados"}`}
            </span>
          </div>

          {/* Cuadrícula de lugares reales para el DÍA + MOMENTO ACTIVO */}
          {cargandoDestino ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
              {[0, 1, 2].map((k) => (
                <div key={k} className="bg-[#F4F0E9] border border-zinc-200 flex flex-col overflow-hidden">
                  <div className="aspect-[16/10] w-full bg-zinc-200 animate-pulse" />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-3 w-24 bg-zinc-200 animate-pulse" />
                    <div className="h-6 w-3/4 bg-zinc-200 animate-pulse" />
                    <div className="h-4 w-full bg-zinc-200 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : lugaresFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {lugaresFiltrados.map((item) => {
                const estaSeleccionado = seleccionadosMomento.some((s) => s.id === item.id)
                return (
                  <article
                    key={item.id}
                    onClick={() => toggleLugarEnMomento(item)}
                    className={cn(
                      "group cursor-pointer bg-[#F4F0E9] border flex flex-col overflow-hidden transition-colors",
                      estaSeleccionado ? "border-terracota" : "border-zinc-200 hover:border-zinc-400"
                    )}
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100 flex items-center justify-center">
                      {item.imagen ? (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : item.categoria === "Gastronomía" ? (
                        <UtensilsCrossed className="w-6 h-6 text-zinc-400" aria-hidden="true" />
                      ) : (
                        <MapPin className="w-6 h-6 text-zinc-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] font-semibold">
                          <span className="text-zinc-500 truncate">{item.categoria}</span>
                          <span className={cn("shrink-0", estaSeleccionado ? "text-terracota" : "text-zinc-500")}>
                            {estaSeleccionado ? `✓ ${etiquetaMomento}` : "+ Añadir"}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl sm:text-2xl text-zinc-900 font-normal leading-snug mt-0.5">
                          {item.nombre}
                        </h3>
                        <p className="text-xs text-zinc-600 leading-relaxed">{item.descripcion}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">{item.detalles}</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-200/80">
                        <span
                          className={cn(
                            "text-xs font-medium inline-flex items-center gap-1.5",
                            estaSeleccionado ? "text-terracota" : "text-zinc-800"
                          )}
                        >
                          {estaSeleccionado ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              Quitar de {etiquetaMomento}
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              Añadir a {etiquetaMomento}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="border border-zinc-200 bg-[#F4F0E9] p-6 text-center">
              <p className="text-sm text-zinc-700">No encontramos lugares en esta categoría para {ciudadCorta(lugar.nombre)}.</p>
              <p className="text-xs text-zinc-500 mt-1">Prueba con el filtro «Para ti» o escribe tu plan para {etiquetaMomento} abajo.</p>
            </div>
          )}

          {/* Añadir lugar personalizado para el día y momento activo */}
          <div className="border border-zinc-200 bg-[#F4F0E9] p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={personalizado}
              maxLength={80}
              onChange={(e) => setPersonalizado(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarPersonalizado() } }}
              placeholder={`¿Otro lugar para ${etiquetaMomento}? Ej. Cena en terraza, concierto…`}
              className="h-10 flex-1 min-w-0 border border-zinc-300 bg-white px-3 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 rounded-none"
            />
            <button
              type="button"
              onClick={agregarPersonalizado}
              disabled={!personalizado.trim()}
              className="h-10 px-4 border border-zinc-900 bg-white hover:bg-zinc-900 hover:text-white text-zinc-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Añadir a {etiquetaMomento}
            </button>
          </div>

          {/* Barra oscura inferior de resumen por día y acción */}
          <div className="bg-zinc-900 text-white p-5 sm:p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="min-w-0 flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-terracota font-semibold">
                {etiquetaMomento.toUpperCase()} · {diasConLugares} DE {fechas.length} DÍAS PLANEADOS
              </p>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal leading-snug truncate">
                {seleccionadosMomento.length > 0
                  ? seleccionadosMomento.map((s) => s.nombre).join(" + ")
                  : `Elige lugares para ${etiquetaMomento}`}
              </h2>
              <p className="text-xs text-zinc-400">
                Se armarán {totalOutfits} {totalOutfits === 1 ? "outfit" : "outfits"} en total para tu viaje.
                {quedaHoy !== null && fechas.length > quedaHoy && ` Hoy te quedan ${quedaHoy} ${quedaHoy === 1 ? "día" : "días"} de planificación.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {idxDiaSeguro < fechas.length - 1 && (
                <button
                  type="button"
                  onClick={() => cambiarDia(idxDiaSeguro + 1)}
                  className="h-12 px-5 border border-white/25 hover:border-white text-white text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-center gap-3 transition-colors"
                >
                  <span>Planear Día {idxDiaSeguro + 2}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={crear}
                disabled={enviando || totalLugaresElegidos === 0}
                className="h-12 px-6 bg-terracota hover:bg-[#b86752] text-zinc-900 text-sm font-medium flex items-center justify-between sm:justify-center gap-4 transition-colors disabled:opacity-45"
              >
                <span>{enviando ? "Creando viaje…" : "Crear mis outfits"}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-red-700 border border-red-200 bg-red-50 p-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
