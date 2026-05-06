import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PosNetX',
    short_name: 'PosNetX',
    description: 'Yeni Nesil POS Sistemi',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#07203eff',
    icons: [
      {
        src: '/PosnetxICON.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/PosnetxICON.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/PosnetxICON.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
