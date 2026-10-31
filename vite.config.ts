import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({ plugins: [react(), VitePWA({ registerType: 'autoUpdate',
  manifest: { name: 'FieldOS', short_name: 'FieldOS', display: 'standalone', start_url: '/', background_color: '#0b1f1c', theme_color: '#0284c7' } })] })
