"use client"

import { useState, useRef, useCallback } from "react"
import { resizeImage } from "@/services/image.service"
import { analyzePrenda } from "@/services/analyze.service"
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client"

export interface ImageUploadForm {
  nombre: string
  categoria: string
  color_principal: string
  estilo: string
  descripcion: string
  talla: string
  estado_uso: string
}

export function useImageUpload(userId: string, isGuest: boolean) {
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [previewForm, setPreviewForm] = useState<ImageUploadForm>({
    nombre: "", categoria: "", color_principal: "", estilo: "", descripcion: "",
    talla: "", estado_uso: "",
  })
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserSupabaseClient()

  const selectFile = useCallback((file: File) => {
    if (isGuest) return
    setPreview({ url: URL.createObjectURL(file), file })
    setPreviewForm({ nombre: "", categoria: "", color_principal: "", estilo: "", descripcion: "", talla: "", estado_uso: "" })
    setAnalyzeError(null)

    setAnalyzing(true)
    analyzePrenda(file, userId).then((data) => {
      setPreviewForm((f) => ({
        ...f,
        nombre: data.nombre ?? "",
        categoria: data.categoria ?? "",
        color_principal: data.color_principal ?? "",
        estilo: data.estilo ?? "",
        descripcion: data.descripcion ?? "",
      }))
    }).catch((err) => {
      console.error("[analyzePrenda]", err instanceof Error ? err.message : JSON.stringify(err))
      setAnalyzeError("No se pudo analizar la imagen. Puedes completar los campos manualmente.")
    }).finally(() => setAnalyzing(false))
  }, [isGuest, userId])

  const updateForm = useCallback((field: keyof ImageUploadForm, value: string) => {
    setPreviewForm((f) => ({ ...f, [field]: value }))
  }, [])

  const upload = useCallback(async (): Promise<string | null> => {
    if (!preview) return null
    setUploading(true)
    try {
      const blob = await resizeImage(preview.file)
      const path = `${userId}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from("closet-images").upload(path, blob, { contentType: "image/jpeg" })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from("closet-images").getPublicUrl(path)
      return urlData.publicUrl
    } catch (err) {
      console.error("Error subiendo imagen:", err instanceof Error ? err.message : JSON.stringify(err))
      return null
    } finally {
      setUploading(false)
    }
  }, [preview, userId, supabase])

  const cancel = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }, [preview])

  return {
    preview, previewForm, analyzing, analyzeError, uploading,
    fileInputRef, selectFile, updateForm, upload, cancel,
  }
}
