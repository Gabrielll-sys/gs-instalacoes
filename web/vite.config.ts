import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // O endereço da API vem em API_URL (no Vercel e no .env); o Vite só expõe ao site o que começa com estes prefixos.
  envPrefix: ['VITE_', 'API_URL'],
})
