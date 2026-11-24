"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buscarLugares, type Lugar } from "@/lib/clima"
import { diasEntre, MAX_DIAS_PLAN, prellenar, sumarDias, type Momento } from "@/lib/planificacion"
import type { DatosPlan } from "@/services/planificacion.service"
import {
  CIUDADES_DESTACADAS,
  FILTROS_LUGARES,
  INTERESES_VIAJE,
  ciudadCorta,
  formatearCoordenadas,
  obtenerInfoDestino,
  rangoFechasEditorial,
  type CategoriaLugar,
  type LugarSugerido,
} from "@/constants/viajes-lugares"
import { ViajeStepper } from "./viaje-stepper"

const NUMEROS_TEXTO = ["NINGÚN LUGAR", "UN LUGAR", "DOS LUGARES", "TRES LUGARES", "CUATRO LUGARES", "CINCO LUGARES"]

function etiquetaCantidadLugares(n: number): string {
  const base = NUMEROS_TEXTO[n] ?? `${n} LUGARES`
  return `${base}, MUCHAS POSIBILIDADES.`
}

/**
 * Flujo editorial en 2 pasos para crear un Viaje (Paso 1: Destino, Paso 2: Lugares).
 * Al pulsar "Crear mis outfits", crea el plan en Supabase y pasa a Paso 3 (Outfits en PlanDetalle).
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
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [inicio, setInicio] = useState(inicial.inicio)
  const [fin, setFin] = useState(inicial.fin)
  const [intereses, setIntereses] = useState<string[]>(["Arte y cultura", "Paseos"])
  const [filtro, setFiltro] = useState<"Para ti" | CategoriaLugar>("Para ti")
  const [seleccionados, setSeleccionados] = useState<LugarSugerido[]>([])
  const [personalizado, setPersonalizado] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const infoDestino = useMemo(() => obtenerInfoDestino(lugar?.nombre ?? busqueda), [lugar?.nombre, busqueda])

  // Búsqueda de ciudades con Open-Meteo
  useEffect(() => {
    if (lugar) return
    let vigente = true
    const t = setTimeout(async () => {
      if (busqueda.trim().length < 2) {
        if (vigente) setResultados([])
        return
      }
      const r = await buscarLugares(busqueda)
      if (vigente) setResultados(r)
    }, 300)
    return () => { vigente = false; clearTimeout(t) }
  }, [busqueda, lugar])

  // Al cambiar de destino, preselecciona los 2 primeros lugares recomendados
  useEffect(() => {
    setSeleccionados(infoDestino.lugares.slice(0, 2))
    setFiltro("Para ti")
  }, [infoDestino])

  const maxFin = sumarDias(inicio, MAX_DIAS_PLAN - 1)
  const fechas = inicio && fin && fin >= inicio ? diasEntre(inicio, fin) : []
  const quedaHoy = cuota ? Math.min(cuota.hoy, cuota.mes) : null

  const errorPaso1 =
    !lugar ? "Elige una ciudad de la lista para conocer su clima."
    : !inicio || inicio < hoy ? "Elige fechas a partir de hoy."
    : !fin || fin < inicio ? "La fecha de vuelta no puede ser antes de la de ida."
    : fin > maxFin ? "Un viaje puede durar hasta 30 días."
    : null

  const toggleInteres = (item: string) => {
    setIntereses((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]))
  }

  const toggleLugar = (item: LugarSugerido) => {
    setSeleccionados((prev) =>
      prev.some((x) => x.id === item.id) ? prev.filter((x) => x.id !== item.id) : [...prev, item]
    )
  }

  const agregarPersonalizado = () => {
    const limpio = personalizado.trim()
    if (!limpio) return
    const nuevo: LugarSugerido = {
      id: `custom-${Date.now()}`,
      nombre: limpio,
      categoria: "Barrios con encanto",
      descripcion: "Plan personalizado añadido a tu itinerario.",
      detalles: "A tu ritmo · Personalizado",
      imagen: infoDestino.imagen,
    }
    setSeleccionados((prev) => [...prev, nuevo])
    setPersonalizado("")
  }

  const todosLosLugares = useMemo(() => {
    const idsCatalogo = new Set(infoDestino.lugares.map((l) => l.id))
    const extras = seleccionados.filter((s) => !idsCatalogo.has(s.id))
    return [...infoDestino.lugares, ...extras]
  }, [infoDestino.lugares, seleccionados])

  const lugaresFiltrados = useMemo(() => {
    if (filtro === "Para ti") return todosLosLugares
    return todosLosLugares.filter((l) => l.categoria === filtro)
  }, [todosLosLugares, filtro])

  const crear = async () => {
    if (!lugar || fechas.length === 0) return
    setEnviando(true)
    setError(null)
    const actividades = seleccionados.length > 0
      ? seleccionados.map((s) => s.nombre)
      : ["Paseo y exploración por el destino"]

    // Mapea los lugares seleccionados a los días del viaje (respetando unique (plan_id, fecha, momento))
    const momentos: { fecha: string; momento: Momento; actividad: string }[] = []
    fechas.forEach((f, idx) => {
      const actDia = actividades[idx % actividades.length]
      momentos.push({ fecha: f, momento: "dia", actividad: actDia.slice(0, 120) })
    })
    // Si seleccionó más lugares que días, los adicionales se agregan como momento de noche
    if (actividades.length > fechas.length) {
      const sobrantes = actividades.slice(fechas.length)
      sobrantes.forEach((act, idx) => {
        if (idx < fechas.length) {
          momentos.push({ fecha: fechas[idx], momento: "noche", actividad: act.slice(0, 120) })
        }
      })
    }

    const nombrePlan = `Viaje a ${ciudadCorta(lugar.nombre)}`.slice(0, 60)
    try {
      await onCrear({ tipo: "viaje", nombre: nombrePlan, inicio, fin, lugar, momentos })
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear tu viaje. Intenta de nuevo.")
      setEnviando(false)
    }
  }

  const coordenadas = lugar
    ? formatearCoordenadas(lugar.lat, lugar.lon)
    : formatearCoordenadas(48.8566, 2.3522)

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12 items-start">
          {/* Columna izquierda: formulario */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-terracota font-medium">
                Un viaje, muchas versiones de ti.
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] text-zinc-900 font-normal leading-[1.1] tracking-tight">
                Tu próximo destino,
                <br />
                tu próximo outfit.
              </h1>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-md">
                Descubre qué visitar y qué ponerte. Creamos looks con tu armario para cada plan de tu viaje.
              </p>
            </div>

            {/* Buscador de destino */}
            <div className="flex flex-col gap-1.5 relative">
              <label htmlFor="viaje-destino" className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                ¿A dónde viajas?
              </label>
              {lugar ? (
                <div className="h-12 w-full border border-zinc-300 bg-[#F4F0E9] px-3.5 flex items-center justify-between gap-2">
                  <span className="text-sm text-zinc-900 truncate">{lugar.nombre}</span>
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
                <div className="relative">
                  <input
                    id="viaje-destino"
                    type="search"
                    value={busqueda}
                    onFocus={() => setMostrarSugerencias(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 180)}
                    onChange={(e) => { setBusqueda(e.target.value); setMostrarSugerencias(true) }}
                    placeholder="París, Francia · Ciudad de México · Oaxaca…"
                    className="h-12 w-full border border-zinc-300 bg-[#F4F0E9] pl-3.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />

                  {mostrarSugerencias && (resultados.length > 0 || busqueda.trim().length < 2) && (
                    <ul
                      className="absolute z-20 left-0 right-0 top-full border border-t-0 border-zinc-300 bg-[#F4F0E9] shadow-md max-h-60 overflow-y-auto"
                      aria-label="Destinos sugeridos"
                    >
                      {(resultados.length > 0 ? resultados : CIUDADES_DESTACADAS).map((r) => (
                        <li key={`${r.lat},${r.lon}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setLugar(r); setBusqueda(r.nombre); setMostrarSugerencias(false) }}
                            className="w-full min-h-11 px-3.5 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 border-b border-zinc-200/60 last:border-b-0 flex items-center justify-between"
                          >
                            <span>{r.nombre}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
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
                  className="h-12 w-full border border-zinc-300 bg-[#F4F0E9] px-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-1.5">
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
                  className="h-12 w-full border border-zinc-300 bg-[#F4F0E9] px-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            {/* Cómo te gusta viajar */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">
                ¿Cómo te gusta viajar?
              </span>
              <div className="flex flex-wrap gap-2">
                {INTERESES_VIAJE.map((item) => {
                  const activo = intereses.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInteres(item)}
                      className={cn(
                        "h-9 px-3.5 text-xs font-medium flex items-center gap-1.5 border transition-colors",
                        activo
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-[#F4F0E9] text-zinc-700 border-zinc-300 hover:border-zinc-900"
                      )}
                    >
                      {activo ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Botón principal */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={!!errorPaso1}
                onClick={() => { setError(null); setPaso(2) }}
                className="h-12 w-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 flex items-center justify-between transition-colors disabled:opacity-45"
              >
                <span>Descubrir lugares</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              {errorPaso1 ? (
                <p className="text-xs text-zinc-500">{errorPaso1}</p>
              ) : (
                <p className="text-xs text-zinc-500">Tú eliges el plan. Tu armario hace el resto.</p>
              )}
            </div>
          </div>

          {/* Columna derecha: tarjeta editorial del destino */}
          <div className="bg-zinc-900 text-white flex flex-col overflow-hidden">
            <div className="pr-0 sm:pr-6 lg:pr-8 bg-zinc-900">
              <div className="aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/4.2] w-full overflow-hidden bg-zinc-800">
                <img
                  src={infoDestino.imagen}
                  alt={lugar?.nombre ?? "Destino destacado"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="p-5 sm:p-6 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">{coordenadas}</p>
                <p className="font-serif text-xl sm:text-2xl text-white font-normal mt-1.5 leading-snug">
                  {infoDestino.frase}
                </p>
                <p className="text-xs text-zinc-400 mt-1">{infoDestino.subtitulo}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-terracota shrink-0 mb-1" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: LUGARES */}
      {paso === 2 && lugar && (
        <div className="flex flex-col gap-6">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-terracota font-medium">
                {lugar.nombre.toUpperCase()} / {rangoFechasEditorial(inicio, fin)}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-normal leading-tight">
                ¿Qué te apetece descubrir?
              </h1>
              <p className="text-sm text-zinc-600">
                Elige los lugares de tu viaje. Nosotros pensamos en los outfits.
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

          {/* Filtros */}
          <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none] overscroll-x-contain">
            {FILTROS_LUGARES.map((cat) => {
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
              {lugaresFiltrados.length} {lugaresFiltrados.length === 1 ? "lugar recomendado" : "lugares recomendados"}
            </span>
          </div>

          {/* Cuadrícula de lugares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lugaresFiltrados.map((item) => {
              const estaSeleccionado = seleccionados.some((s) => s.id === item.id)
              return (
                <article
                  key={item.id}
                  onClick={() => toggleLugar(item)}
                  className={cn(
                    "group cursor-pointer bg-[#F4F0E9] border flex flex-col overflow-hidden transition-colors",
                    estaSeleccionado ? "border-terracota" : "border-zinc-200 hover:border-zinc-400"
                  )}
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100">
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] font-semibold">
                        <span className="text-zinc-500">{item.categoria}</span>
                        <span className={estaSeleccionado ? "text-terracota" : "text-zinc-500"}>
                          {estaSeleccionado ? "✓ Seleccionado" : "+ Añadir"}
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
                            Quitar de mi viaje
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            Añadir a mi viaje
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Añadir lugar personalizado */}
          <div className="border border-zinc-200 bg-[#F4F0E9] p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={personalizado}
              maxLength={80}
              onChange={(e) => setPersonalizado(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarPersonalizado() } }}
              placeholder="¿Tienes otro plan? Ej. Pirámides de Teotihuacán, cena especial…"
              className="h-10 flex-1 border border-zinc-300 bg-white px-3 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
            />
            <button
              type="button"
              onClick={agregarPersonalizado}
              disabled={!personalizado.trim()}
              className="h-10 px-4 border border-zinc-900 bg-white hover:bg-zinc-900 hover:text-white text-zinc-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Añadir lugar
            </button>
          </div>

          {/* Barra oscura inferior de resumen y acción */}
          <div className="bg-zinc-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="min-w-0 flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-terracota font-semibold">
                {etiquetaCantidadLugares(seleccionados.length)}
              </p>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal leading-snug truncate">
                {seleccionados.length > 0
                  ? seleccionados.map((s) => s.nombre).join(" + ")
                  : "Elige al menos un lugar"}
              </h2>
              <p className="text-xs text-zinc-400">
                Outfits pensados para caminar, explorar y disfrutar.
                {quedaHoy !== null && fechas.length > quedaHoy && ` Hoy armamos ${quedaHoy} ${quedaHoy === 1 ? "día" : "días"}.`}
              </p>
            </div>

            <button
              type="button"
              onClick={crear}
              disabled={enviando || seleccionados.length === 0}
              className="h-12 px-6 bg-terracota hover:bg-[#b86752] text-zinc-900 text-sm font-medium flex items-center justify-between sm:justify-center gap-4 transition-colors disabled:opacity-45 shrink-0"
            >
              <span>{enviando ? "Creando viaje…" : "Crear mis outfits"}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {error && <p role="alert" className="text-xs text-red-700 border border-red-200 bg-red-50 p-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
