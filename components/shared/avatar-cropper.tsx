"use client"

import { useState } from "react"
import Cropper, { type Area } from "react-easy-crop"

const SALIDA = 256

async function recortar(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("No se pudo leer la imagen."))
    i.src = src
  })
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SALIDA
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, SALIDA, SALIDA)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.9))
}

interface AvatarCropperProps {
  src: string
  onCancel: () => void
  onDone: (blob: Blob) => void
}

export function AvatarCropper({ src, onCancel, onDone }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function aceptar() {
    if (!area) return
    try { onDone(await recortar(src, area)) } catch (e) { setError(e instanceof Error ? e.message : "Error al recortar.") }
  }

  return (
    <div className="p-6 flex flex-col gap-4 max-w-md w-full">
      <div>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Foto de perfil</p>
        <h2 className="font-serif text-xl text-zinc-900 mt-0.5">Ajusta tu foto</h2>
        <p className="text-xs text-zinc-500 mt-1">Arrastra para mover y usa el control para acercar.</p>
      </div>

      <div className="relative w-full h-72 bg-zinc-900">
        <Cropper
          image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
          onCropChange={setCrop} onZoomChange={setZoom}
          onCropComplete={(_, px) => setArea(px)}
        />
      </div>

      <input
        type="range" min={1} max={3} step={0.01} value={zoom} aria-label="Zoom"
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full accent-zinc-900"
      />

      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-zinc-200 text-zinc-600 text-xs tracking-wide hover:border-zinc-400 transition-colors">
          Cancelar
        </button>
        <button type="button" onClick={aceptar} disabled={!area}
          className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-medium tracking-wide disabled:opacity-50">
          Usar foto
        </button>
      </div>
    </div>
  )
}
