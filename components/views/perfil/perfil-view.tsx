"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogOut, Camera, Mail, Phone, Check, Loader2, KeyRound, Sparkles, Bell, Store, ShieldCheck, Crown, Gift, BarChart3, ChevronRight, Wallet, type LucideIcon } from "lucide-react"
import { useAuthContext } from "@/context/auth-context"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"
import { activarPush, pushActivo, pushDisponible } from "@/lib/push"
import { navegarA } from "@/lib/navegar"
import { validarPassword } from "@/services/auth.service"
import { abrirCuentaCobro } from "@/services/marketplace.service"
import { NOMBRE_PLAN, esDePago } from "@/constants/planes"
import { CenteredModal } from "@/components/shared/centered-modal"
import { AvatarCropper } from "@/components/shared/avatar-cropper"
import { Input } from "@/components/ui/input"
import { pageProps } from "@/constants/animation"

/** Pestaña Perfil: cuenta, estilo, estadísticas, planes y recordatorios, cada opción con lo que hace. */
export function PerfilView() {
  const { userName, userEmail, userPhone, userAvatarUrl, userMode, isGuest, plan, logout, updateProfile, abrirOnboarding, userId, esAdmin, cobrosActivos } = useAuthContext()
  const [abriendoCobros, setAbriendoCobros] = useState(false)

  // Alta de la cuenta de cobro o, si ya está activa, el panel de Stripe con sus depósitos.
  async function irACobros() {
    setAbriendoCobros(true)
    try {
      const r = await abrirCuentaCobro()
      if (r.url) return window.location.assign(r.url)
      window.location.reload()
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : "No se pudo abrir tu cuenta de cobro.")
      setAbriendoCobros(false)
    }
  }
  const [pushOn, setPushOn] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  useEffect(() => { pushActivo().then(setPushOn).catch(() => setPushOn(false)) }, [])

  async function handleActivarPush() {
    const msg = await activarPush(createBrowserSupabaseClient(), userId)
    setPushMsg(msg)
    setTimeout(() => setPushMsg(null), 6000)
    setPushOn(await pushActivo().catch(() => false))
  }

  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [phone, setPhone] = useState(userPhone)
  const [avatarPreview, setAvatarPreview] = useState(userAvatarUrl)
  // Foto recortada pendiente de subir, y la foto cruda mientras se ajusta.
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleOpenModal() {
    setName(userName)
    setEmail(userEmail)
    setPhone(userPhone)
    setAvatarPreview(userAvatarUrl)
    setAvatarBlob(null)
    setCropSrc(null)
    setPassword("")
    setConfirmPassword("")
    setSuccessMsg(null)
    setErrorMsg(null)
    setOpenModal(true)
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCropSrc(URL.createObjectURL(file))
    // Permite volver a elegir el mismo archivo.
    e.target.value = ""
  }

  function handleCropDone(blob: Blob) {
    setAvatarBlob(blob)
    setAvatarPreview(URL.createObjectURL(blob))
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function handleSave() {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password && password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden")
      return
    }
    const invalida = password ? validarPassword(password) : null
    if (invalida) {
      setErrorMsg(invalida)
      return
    }

    setLoading(true)
    try {
      await updateProfile({
        name,
        phone,
        avatarBlob: avatarBlob ?? undefined,
        password: password ? password : undefined,
      })
      setSuccessMsg("¡Perfil actualizado con éxito!")
      setTimeout(() => {
        setOpenModal(false)
        setSuccessMsg(null)
      }, 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error && /password/i.test(err.message)
        ? "Se guardaron tus datos, pero no la contraseña. Prueba con otra distinta a la actual."
        : "Error al actualizar la información")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div {...pageProps} className="flex flex-col gap-8 pb-36 px-4 pt-8">
      {pushMsg && (
        <p role="status" className="fixed top-4 inset-x-4 z-[120] mx-auto max-w-sm bg-zinc-900 text-white text-xs px-4 py-3 shadow-lg"
          onClick={() => setPushMsg(null)}>
          {pushMsg}
        </p>
      )}
      <header className="flex items-center gap-4">
        {avatarPreview || userAvatarUrl
          ? <img src={avatarPreview || userAvatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-zinc-200 shrink-0" />
          : <span aria-hidden="true" className="w-16 h-16 rounded-full border border-zinc-200 shrink-0 text-2xl flex items-center justify-center bg-zinc-100 text-zinc-700 font-serif">{userName.charAt(0).toUpperCase()}</span>}
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-zinc-900 truncate">{userName || "Tu perfil"}</h1>
          <p className="text-sm text-zinc-500 truncate">{userEmail}</p>
          <span className="mt-1.5 inline-block text-[11px] uppercase tracking-widest px-1.5 py-0.5 border border-zinc-200 text-zinc-600">
            {isGuest ? "Modo demo" : plan ? `Plan ${NOMBRE_PLAN[plan]}` : "Plan Esencial"}
          </span>
        </div>
      </header>

      <Grupo titulo="Tu actividad">
        <Fila icono={BarChart3} titulo="Mis estadísticas" dataTour="perfil-estadisticas"
          texto="Qué usas más, qué llevas meses sin ponerte y cuántos outfits has armado."
          onClick={() => navegarA("estadisticas")} />
        {/* Quien paga ya no tiene planes que comparar: ve sus puntos y desde ahí administra su suscripción. */}
        {esDePago(plan) ? (
          <Fila icono={Gift} titulo="Mis puntos y suscripción" dataTour="perfil-planes"
            texto="Los puntos que ganas al donar ropa, el canje por descuentos y tu suscripción."
            onClick={() => navegarA("planes")} />
        ) : (
          <Fila icono={Crown} titulo="Planes y puntos" dataTour="perfil-planes"
            texto="Tu plan, los puntos que ganas al donar ropa y cómo canjearlos por descuentos."
            onClick={() => navegarA("planes")} />
        )}
        {/* Vender y rentar es de planes de pago: ahí se cobra. */}
        {userMode === "VIP" && esDePago(plan) && (
          <Fila icono={Wallet} titulo={cobrosActivos ? "Mis cobros" : "Cobrar mis ventas"}
            texto={cobrosActivos
              ? "Tus depósitos en Stripe: recibes el 85% de cada venta o renta al entregarse la prenda."
              : "Conecta tu cuenta de cobro en Stripe para vender y rentar. Te pide identificación y CLABE."}
            estado={abriendoCobros ? "Abriendo…" : undefined}
            onClick={abriendoCobros ? undefined : () => void irACobros()} />
        )}
      </Grupo>

      <Grupo titulo="Tu cuenta">
        <Fila icono={User} titulo="Información personal"
          texto="Nombre, teléfono, foto y contraseña. El correo no se puede cambiar."
          onClick={handleOpenModal} />
        {userMode === "VIP" && (
          <Fila icono={Sparkles} titulo="Mi estilo"
            texto="Tus colores, ocasiones y clima. Con esto la IA arma outfits que se parecen a ti."
            onClick={() => abrirOnboarding()} />
        )}
        {userMode === "VIP" && pushDisponible() && (
          <Fila icono={Bell} titulo="Recordatorios"
            texto={pushOn
              ? "Activados. Te avisamos cuando tu armario lleve tiempo sin prendas nuevas."
              : "Te avisamos cuando tu armario lleve tiempo sin prendas nuevas, para tenerlo al día."}
            estado={pushOn ? "Activados" : "Activar"}
            onClick={pushOn ? undefined : () => void handleActivarPush()} />
        )}
      </Grupo>

      {(userMode === "VIP" || esAdmin) && (
        <Grupo titulo="Más">
          {userMode === "VIP" && (
            <Fila icono={Store} titulo="Quiero ser centro de acopio" href="/centros"
              texto="Recibe donaciones y entregas del marketplace en tu negocio." />
          )}
          {esAdmin && (
            <Fila icono={ShieldCheck} titulo="Panel de admin" href="/admin"
              texto="Revisa las solicitudes de centros de acopio." />
          )}
        </Grupo>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void logout()}
          className="h-12 border border-zinc-200 text-sm text-red-600 font-medium flex items-center justify-center gap-2 hover:border-red-300 transition-colors">
          <LogOut className="w-4 h-4" aria-hidden="true" /> {isGuest ? "Salir de la demo" : "Cerrar sesión"}
        </button>
        {isGuest && <p className="text-xs text-zinc-500 text-center">En la demo puedes probar todo, pero nada se guarda.</p>}
      </div>

      {/* Modal de edición de perfil */}
      <CenteredModal open={openModal} onClose={() => setOpenModal(false)}>
        {cropSrc ? (
          <AvatarCropper src={cropSrc} onCancel={() => setCropSrc(null)} onDone={handleCropDone} />
        ) : (
        <div className="p-6 flex flex-col gap-5 max-w-md w-full">
          <div>
            <h2 className="font-serif text-xl text-zinc-900">Editar información personal</h2>
          </div>

          {/* Cambio de Foto */}
          <div className="flex flex-col items-center gap-2 py-2 border-y border-zinc-100">
            <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-900 shadow-md">
              {avatarPreview
                ? <img src={avatarPreview} alt="Vista previa avatar" className="w-full h-full object-cover" />
                : <span aria-hidden="true" className="w-full h-full text-3xl flex items-center justify-center bg-zinc-100 text-zinc-700 font-serif">{userName.charAt(0).toUpperCase()}</span>}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[9px] uppercase tracking-wider">Cambiar</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-zinc-600 underline hover:text-zinc-900 transition-colors"
            >
              Seleccionar nueva foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Formulario */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">
                Nombre de usuario
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="pl-9 h-10 rounded-none border-zinc-200 text-xs focus-visible:ring-0 focus-visible:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={email}
                  readOnly
                  disabled
                  type="email"
                  className="pl-9 h-10 rounded-none border-zinc-200 text-xs focus-visible:ring-0 focus-visible:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">
                Número de teléfono
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 844 000 0000"
                  type="tel"
                  className="pl-9 h-10 rounded-none border-zinc-200 text-xs focus-visible:ring-0 focus-visible:border-zinc-900"
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-zinc-500" /> Cambiar Contraseña (Opcional)
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    type="password"
                    className="h-10 rounded-none border-zinc-200 text-xs focus-visible:ring-0 focus-visible:border-zinc-900"
                  />
                </div>
                <div>
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar"
                    type="password"
                    className="h-10 rounded-none border-zinc-200 text-xs focus-visible:ring-0 focus-visible:border-zinc-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 border border-red-200 bg-red-50 p-2 text-center">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 p-2 text-center flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" /> {successMsg}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 text-xs tracking-wide hover:border-zinc-400 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {loading ? "Guardando..." : "Guardar cambios"}
            </motion.button>
          </div>
        </div>
        )}
      </CenteredModal>
    </motion.div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{titulo}</h2>
      <div className="border border-zinc-200 divide-y divide-zinc-100">{children}</div>
    </section>
  )
}

interface FilaProps {
  icono: LucideIcon
  titulo: string
  texto: string
  onClick?: () => void
  href?: string
  /** Texto corto a la derecha en lugar de la flecha (ej. "Activados"). */
  estado?: string
  dataTour?: string
}

function Fila({ icono: Icono, titulo, texto, onClick, href, estado, dataTour }: FilaProps) {
  const contenido = (
    <>
      <Icono className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-zinc-900">{titulo}</span>
        <span className="block text-xs text-zinc-500 mt-0.5 leading-relaxed">{texto}</span>
      </span>
      {estado
        ? <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{estado}</span>
        : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" aria-hidden="true" />}
    </>
  )
  const clase = "w-full min-h-16 px-4 py-3.5 flex items-start gap-3 text-left hover:bg-zinc-50 transition-colors disabled:hover:bg-transparent"
  if (href) return <a href={href} data-tour={dataTour} className={clase}>{contenido}</a>
  return <button type="button" onClick={onClick} disabled={!onClick} data-tour={dataTour} className={clase}>{contenido}</button>
}
