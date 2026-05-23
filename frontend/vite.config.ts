import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3001'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui':     ['lucide-react', 'sonner'],
            'vendor-socket': ['socket.io-client'],
            'vendor-http':   ['axios'],
          }
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true
        }
      }
    }
  }
})
