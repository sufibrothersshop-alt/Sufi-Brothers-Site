import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sufi Brothers | Fresh Fast Food in Ghouri Town',
    short_name: 'Sufi Brothers',
    description: 'Order fresh burgers, shawarmas, roll parathas and deals from Sufi Brothers in Ghouri Town, Islamabad.',
    start_url: '/',
    display: 'standalone',
    background_color: '#b00b1a',
    theme_color: '#b00b1a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
