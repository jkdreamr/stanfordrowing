import type { MetadataRoute } from 'next';

/** Web app manifest — enables "Add to Home Screen" as a standalone app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cardinal Row',
    short_name: 'Cardinal',
    description: 'Stanford Rowing — summer training, kept honest.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1110',
    theme_color: '#0d1110',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
