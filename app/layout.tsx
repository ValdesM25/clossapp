import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SerwistProvider } from '@serwist/turbopack/react'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
// Serif de los títulos: sin cargarla, cada teléfono dibujaba su serif del sistema.
// Variable con tamaño óptico: se ajusta sola entre títulos chicos y grandes.
const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-titulos" });

const TITULO = 'Clossapp · Tu armario inteligente'
const DESCRIPCION = 'Organiza tu ropa, arma outfits con IA usando lo que ya tienes y vende, renta o dona lo que ya no usas.'

export const metadata: Metadata = {
  // Las vistas previas al compartir necesitan URLs absolutas; el dominio sin www redirige aquí.
  metadataBase: new URL('https://www.clossapp.com'),
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Clossapp',
    url: '/',
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRIPCION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  applicationName: 'Clossapp',
  // Safari no lee el manifest: la pantalla completa y el titulo del icono en
  // iOS salen de aca.
  appleWebApp: {
    capable: true,
    title: 'Clossapp',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin bloquear el zoom (accesibilidad): el zoom al enfocar campos se evita con inputs de 16px.
  themeColor: '#ffffff',
  // Que el contenido llegue hasta los bordes en pantallas con notch; el
  // espacio del indicador de inicio lo maneja pb-safe en la barra inferior.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={fraunces.variable}>
      <body className="font-sans antialiased">
        {/* En desarrollo el service worker guarda páginas y chunks de compilaciones viejas:
            al reiniciar el servidor el navegador pide archivos que ya no existen y recarga en bucle. */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
          {children}
        </SerwistProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
