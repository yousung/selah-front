import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

let gitVersion = 'dev'
try {
  gitVersion = execSync('git describe --tags --abbrev=0').toString().trim()
} catch {}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(gitVersion),
  },
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
