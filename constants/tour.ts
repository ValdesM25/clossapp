/**
 * Guiones del recorrido del modo demo. Cambiar un texto = editar aquí.
 * - ancla: valor de data-tour del elemento a resaltar (sin ancla = diapositiva centrada).
 * - clickAntes: data-tour de elementos a tocar antes del paso (abrir una sección, cerrar un modal).
 * - interactivo: deja tocar lo resaltado.
 */
export type PasoTour = {
  titulo: string
  texto: string
  etiqueta?: string
  ancla?: string
  clickAntes?: string[]
  interactivo?: boolean
}

export const PASOS_DEMO_USUARIO: PasoTour[] = [
  {
    etiqueta: "Bienvenida",
    titulo: "Esto es Clossapp",
    texto: "Tu armario digital: organiza tu ropa, arma outfits con inteligencia artificial y dale una segunda vida a lo que ya no usas. Te muestro cada parte con datos de ejemplo.",
  },
  {
    etiqueta: "Navegación",
    titulo: "Todo está a un toque",
    texto: "Desde esta barra llegas a cada sección: Inicio, Armario, Outfit, Shop, Stats y Planes.",
    ancla: "nav",
    clickAntes: ["nav-inicio"],
  },
  {
    etiqueta: "Inicio",
    titulo: "Tu outfit del día",
    texto: "Cada día Clossapp te propone qué ponerte usando solo ropa que ya tienes.",
    ancla: "inicio-outfit",
  },
  {
    etiqueta: "Armario",
    titulo: "Tu ropa, en tu teléfono",
    texto: "Aquí vive tu armario. Cada prenda tiene su foto, categoría, color y estilo.",
    ancla: "armario-prendas",
    clickAntes: ["nav-armario"],
  },
  {
    etiqueta: "Armario",
    titulo: "Agregar una prenda",
    texto: "En tu cuenta, con este botón tomas una foto y la IA llena los datos por ti. Si la compraste hace poco, ganas puntos cuando la usas. (En la demo está bloqueado.)",
    ancla: "armario-agregar",
  },
  {
    etiqueta: "Outfit",
    titulo: "Outfits con IA",
    texto: "Dile a dónde vas y cómo está el clima; Clossapp arma 3 outfits con tus prendas. Pruébalo: en la demo es instantáneo.",
    ancla: "simulador-form",
    clickAntes: ["nav-simulador"],
    interactivo: true,
  },
  {
    etiqueta: "Shop",
    titulo: "Vende, renta o dona",
    texto: "Lo que ya no usas puede venderse, rentarse o donarse. Las entregas pasan por un centro de acopio: el pago queda protegido hasta que la otra persona recibe la prenda.",
    ancla: "marketplace",
    clickAntes: ["nav-marketplace"],
  },
  {
    etiqueta: "Stats",
    titulo: "Conoce tus hábitos",
    texto: "Ve qué usas más y qué llevas meses sin ponerte. Esas prendas olvidadas son perfectas para donar o vender.",
    ancla: "estadisticas",
    clickAntes: ["nav-estadisticas"],
  },
  {
    etiqueta: "Planes",
    titulo: "Tus puntos valen",
    texto: "Donar ropa te da puntos que canjeas por descuentos en Clossapp Pro.",
    ancla: "planes-puntos",
    clickAntes: ["nav-planes"],
  },
  {
    etiqueta: "Listo",
    titulo: "Ahora explora tú",
    texto: "Todo lo que ves es de ejemplo y nada se guarda. Cuando quieras tu propio armario, crea tu cuenta gratis.",
    clickAntes: ["nav-inicio"],
  },
]

export const PASOS_DEMO_ACOPIO: PasoTour[] = [
  {
    etiqueta: "Bienvenida",
    titulo: "Así trabaja un centro de acopio",
    texto: "Los centros de acopio reciben donaciones de ropa y son el punto de entrega seguro del marketplace. Todo lo que verás es simulado.",
  },
  {
    etiqueta: "Áreas",
    titulo: "Tres tipos de trabajo",
    texto: "Donaciones, entregas de compras y entregas de rentas. Cada pestaña tiene su propio flujo.",
    ancla: "acopio-tabs",
    clickAntes: ["acopio-tab-donaciones"],
  },
  {
    etiqueta: "Donaciones",
    titulo: "Llega alguien con su bolsa",
    texto: "La persona trae su ropa y un código QR que generó en la app. Con este botón lo escaneas.",
    ancla: "acopio-escanear",
  },
  {
    etiqueta: "Donaciones",
    titulo: "Prueba con un QR de ejemplo",
    texto: "Toca \"Usar QR de ejemplo\": verás quién dona, cuántas prendas trae y los puntos que gana. Los puntos los calcula Clossapp, no el QR.",
    ancla: "acopio-qr-ejemplo",
    clickAntes: ["acopio-escanear"],
    interactivo: true,
  },
  {
    etiqueta: "Donaciones",
    titulo: "Metas del mes",
    texto: "Aquí el centro ve cuánto lleva recolectado y qué categorías necesita más.",
    ancla: "acopio-metas",
    clickAntes: ["acopio-cerrar-scanner"],
  },
  {
    etiqueta: "Donaciones",
    titulo: "Bitácora",
    texto: "Cada donación queda registrada: quién, cuántas prendas y cuándo. También se registran donaciones de personas sin la app.",
    ancla: "acopio-bitacora",
  },
  {
    etiqueta: "Compras",
    titulo: "Entregas del marketplace",
    texto: "Quien compra paga y el dinero queda en custodia. Cuando recoge aquí, escaneas su QR y el pago se libera a quien vendió.",
    ancla: "acopio-panel",
    clickAntes: ["acopio-tab-compras"],
  },
  {
    etiqueta: "Rentas",
    titulo: "Rentas con dos QR",
    texto: "Un QR al entregar la prenda y otro cuando la devuelven. Así el centro sabe siempre dónde está cada prenda.",
    ancla: "acopio-panel",
    clickAntes: ["acopio-tab-rentas"],
  },
  {
    etiqueta: "Listo",
    titulo: "¿Tu negocio puede ser centro de acopio?",
    texto: "Recibes visitas, apareces en el mapa de Clossapp y ayudas a que la ropa tenga otra vida. Explora el portal con los datos de ejemplo.",
    clickAntes: ["acopio-tab-donaciones"],
  },
]
