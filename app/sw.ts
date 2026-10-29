/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker"
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
} from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const isSupabase = (url: URL) => url.hostname.endsWith(".supabase.co")

/**
 * Reglas propias, evaluadas antes que defaultCache (gana la primera que matchea).
 *
 * defaultCache trae un catch-all para cross-origin con NetworkFirst, que si no
 * lo interceptamos escribiria en disco las respuestas de Supabase, incluidas
 * las de auth. De ahi las dos primeras reglas.
 */
const clossappCache: RuntimeCaching[] = [
  {
    // Auth: nunca al disco. Cachear tokens o /auth/v1/user deja sesiones
    // fantasma y, tras cerrar sesion, datos de la usuaria anterior en el equipo.
    matcher: ({ url }) => isSupabase(url) && url.pathname.startsWith("/auth/v1/"),
    handler: new NetworkOnly(),
  },
  {
    // Datos del armario: siempre frescos. Servirlos offline es el trabajo de
    // una capa local (IndexedDB), que hoy no existe; cachearlos aca solo
    // mostraria un armario desactualizado sin avisar.
    matcher: ({ url }) => isSupabase(url) && url.pathname.startsWith("/rest/v1/"),
    handler: new NetworkOnly(),
  },
  {
    // Fotos de las prendas. El path lleva timestamp, asi que nunca cambian:
    // CacheFirst hace que la segunda visita cargue el armario al instante.
    matcher: ({ url }) =>
      isSupabase(url) && url.pathname.startsWith("/storage/v1/object/public/"),
    handler: new CacheFirst({
      cacheName: "supabase-prendas",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...clossappCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
})

serwist.addEventListeners()

// Recordatorios push (ver app/api/push/enviar).
self.addEventListener("push", (event) => {
  const datos = (() => {
    try { return event.data?.json() ?? {} } catch { return {} }
  })() as { title?: string; body?: string; url?: string }
  event.waitUntil(
    self.registration.showNotification(datos.title ?? "Clossapp", {
      body: datos.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: datos.url ?? "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => "focus" in v)
      return abierta ? abierta.focus() : self.clients.openWindow(url)
    })
  )
})
