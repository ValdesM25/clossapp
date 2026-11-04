export async function resizeImage(file: File, maxWidth = 1000, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    // Sin esto, un archivo que el navegador no puede leer (p. ej. HEIC) deja la promesa colgada.
    const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error("La imagen tardó demasiado en procesarse.")) }, 20000)
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer la imagen. Prueba con otra foto (JPG o PNG)."))
    }
    img.onload = () => {
      clearTimeout(timer)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement("canvas")
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))),
        "image/jpeg",
        quality,
      )
    }
    img.src = url
  })
}
