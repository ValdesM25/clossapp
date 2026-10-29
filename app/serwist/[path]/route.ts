import { createSerwistRoute } from "@serwist/turbopack"

/**
 * Compila app/sw.ts y lo sirve en /serwist/sw.js con el manifest de precache
 * inyectado. Es una ruta estatica: se genera una vez por build.
 */

// La revision versiona la pagina precacheada. En Vercel usa el SHA del commit,
// asi que cada deploy invalida el fallback viejo; en local, la hora del build.
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    // Por defecto precachea todo public/, y ahi hay medio mega que nadie
    // necesita al instalar: la foto del login (solo se ve en escritorio), los
    // PNG originales del logo (ya reemplazados por SVG) y los placeholders.
    // Si alguno se usa de verdad, el runtime caching lo guarda igual.
    globIgnores: [
      "**/logo.png",
      "**/logo_f.png",
      "**/img_login_1mitad.jpg",
      "**/placeholder*.{jpg,png,svg}",
    ],
    // Usa el esbuild nativo (esta en devDependencies) en vez de la variante
    // wasm, que habria que instalar aparte y compila mas lento.
    useNativeEsbuild: true,
  })
