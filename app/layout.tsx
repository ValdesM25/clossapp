import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SerwistProvider } from '@serwist/turbopack/react'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Clossapp - Tu Armario Inteligente',
  description: 'Digitaliza tu guardarropa, recibe recomendaciones personalizadas con IA y optimiza tu estilo personal cada día.',
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
  maximumScale: 1,
  userScalable: false,
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
    <html lang="es">
      <body className="font-sans antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
        </SerwistProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
