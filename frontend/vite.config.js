import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to backend during development
    // This means /api/auth/login in frontend → http://localhost:5000/api/auth/login
    // No CORS issues, no hardcoded backend URL in every fetch call
    proxy: {
      '/api': {
        target: 'https://examportal-xrtd.onrender.com/api',
        changeOrigin: true,
      },
    },
  },
})
