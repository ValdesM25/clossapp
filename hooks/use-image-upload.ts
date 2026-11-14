"use client"

import { useState, useRef, useCallback } from "react"
import { resizeImage } from "@/services/image.service"
import { analyzePrenda } from "@/services/analyze.service"
import { MENSAJES_LIMITE } from "@/constants/planes"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"

export interface ImageUploadForm {
  nombre: string
  categoria: string
  color_principal: string
  // La pone solo la IA; no se muestra ni se edita en el formulario.
  color_familia: string
  estilo: string
  descripcion: string
  talla: string
  estado_uso: string
  // Compra reciente (opcional): da puntos y alimenta estadísticas. "si" = marcada.
  comprada_reciente: string
  compra_lugar: string
  compra_tienda: string
  compra_precio: string
  compra_fecha: string
}

const FORM_VACIO: ImageUploadForm = {
  nombre: "", categoria: "", color_principal: "", color_familia: "", estilo: "", descripcion: "",
  talla: "", estado_uso: "",
  comprada_reciente: "", compra_lugar: "", compra_tienda: "", compra_precio: "", compra_fecha: "",
}

export function useImageUpload(userId: string, isGuest: boolean) {
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [previewForm, setPreviewForm] = useState<ImageUploadForm>(FORM_VACIO)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Un id por foto elegida: reintentos y dobles clics reutilizan la misma imagen y la misma fila.
  const clientIdRef = useRef<string>("")

  const supabase = createBrowserSupabaseClient()

  const selectFile = useCallback((file: File) => {
    if (isGuest) return
    clientIdRef.current = crypto.randomUUID()
    setPreview({ url: URL.createObjectURL(file), file })
    setPreviewForm(FORM_VACIO)
    setAnalyzeError(null)

    setAnalyzing(true)
    analyzePrenda(file, userId).then((data) => {
      setPreviewForm((f) => ({
        ...f,
        nombre: data.nombre ?? "",
        categoria: data.categoria ?? "",
        color_principal: data.color_principal ?? "",
        color_familia: data.color_familia ?? "",
        estilo: data.estilo ?? "",
        descripcion: data.descripcion ?? "",
      }))
    }).catch((err) => {
      console.error("[analyzePrenda]", err instanceof Error ? err.message : JSON.stringify(err))
      const msg = err instanceof Error ? err.message : ""
      setAnalyzeError(Object.values(MENSAJES_LIMITE).includes(msg)
        ? msg
        : "No se pudo analizar la imagen. Puedes completar los campos manualmente.")
    }).finally(() => setAnalyzing(false))
  }, [isGuest, userId])

  const updateForm = useCallback((field: keyof ImageUploadForm, value: string) => {
    setPreviewForm((f) => ({ ...f, [field]: value }))
  }, [])

  // Lanza si algo falla: quien llama decide cómo avisar al usuario.
  const upload = useCallback(async (): Promise<string | null> => {
    if (!preview) return null
    setUploading(true)
    try {
      const blob = await resizeImage(preview.file)
      const path = `${userId}/${clientIdRef.current}.jpg`
      // Sin upsert: closet-images solo deja insertar en la carpeta propia (sin SELECT ni UPDATE),
      // y upsert necesita los tres, así que fallaba con "violates row-level security". El nombre
      // es único por prenda (clientId): si un reintento choca con la foto que ya subió, sirve igual.
      const { error: uploadError } = await supabase.storage.from("closet-images").upload(path, blob, { contentType: "image/jpeg" })
      if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from("closet-images").getPublicUrl(path)
      return urlData.publicUrl
    } finally {
      setUploading(false)
    }
  }, [preview, userId, supabase])

  const cancel = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }, [preview])

  return {
    preview, previewForm, analyzing, analyzeError, uploading, clientIdRef,
    fileInputRef, selectFile, updateForm, upload, cancel,
  }
}
