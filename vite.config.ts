import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    tailwindcss(),
    react(),
    mode === 'singlefile' ? viteSingleFile() : undefined,
  ].filter(Boolean),
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: mode === 'singlefile' ? 'dist-preview' : 'dist',
  },
}))
