"use client"

import { useState, useRef, ChangeEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogOut, Camera, Lock, Mail, Phone, Check, Loader2, KeyRound } from "lucide-react"
import { useAuthContext } from "@/context/auth-context"
import { CenteredModal } from "@/components/shared/centered-modal"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserAvatarMenu() {
  const { userName, userEmail, userPhone, userAvatarUrl, userMode, isGuest, logout, updateProfile } = useAuthContext()

  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState(userEmail)
  const [phone, setPhone] = useState(userPhone)
  const [avatarPreview, setAvatarPreview] = useState(userAvatarUrl)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleOpenModal() {
    setName(userName)
    setEmail(userEmail)
    setPhone(userPhone)
    setAvatarPreview(userAvatarUrl)
    setPassword("")
    setConfirmPassword("")
    setSuccessMsg(null)
    setErrorMsg(null)
    setOpenModal(true)
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarPreview(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password && password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    try {
      await updateProfile({
        name,
        email,
        phone,
        avatarUrl: avatarPreview,
        password: password ? password : undefined,
      })
      setSuccessMsg("¡Perfil actualizado con éxito!")
      setTimeout(() => {
        setOpenModal(false)
        setSuccessMsg(null)
      }, 1200)
    } catch (err) {
      setErrorMsg("Error al actualizar la información")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Menú de perfil"
            className="relative group focus:outline-none rounded-full p-0.5 border-2 border-transparent hover:border-zinc-900 transition-colors"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 shadow-sm relative">
              <img
                src={avatarPreview || userAvatarUrl}
                alt={userName || "avatar"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <User className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-2 bg-white rounded-none border border-zinc-200 shadow-lg">
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex items-center gap-3">
              <img
                src={avatarPreview || userAvatarUrl}
                alt={userName}
                className="w-9 h-9 rounded-full object-cover border border-zinc-200"
              />
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-serif text-zinc-900 truncate">{userName || "Usuario"}</p>
                <p className="text-[11px] text-zinc-400 truncate">{userEmail || "sin@correo.com"}</p>
                <span className="mt-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-zinc-200 text-zinc-500 w-fit">
                  {isGuest ? "Modo Invitado" : "Cuenta Premium VIP"}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-zinc-100 my-1" />

          <DropdownMenuItem
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50 rounded-none transition-colors"
          >
            <User className="w-3.5 h-3.5 text-zinc-500" />
            <span>Editar información personal</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-zinc-100 my-1" />

          <DropdownMenuItem
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 font-medium cursor-pointer hover:bg-red-50 focus:bg-red-50 rounded-none transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de edición de perfil */}
      <CenteredModal open={openModal} onClose={() => setOpenModal(false)}>
        <div className="p-6 flex flex-col gap-5 max-w-md w-full">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Mi Cuenta</p>
            <h2 className="font-serif text-xl text-zinc-900 mt-0.5">Editar información personal</h2>
          </div>

          {/* Cambio de Foto */}
          <div className="flex flex-col items-center gap-2 py-2 border-y border-zinc-100">
            <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-900 shadow-md">
              <img src={avatarPreview} alt="Vista previa avatar" className="w-full h-full object-cover" />
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
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
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
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
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
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
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
                <KeyRound className="w-3 h-3 text-zinc-400" /> Cambiar Contraseña (Opcional)
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
      </CenteredModal>
    </>
  )
}
