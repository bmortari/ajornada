import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/chatnormas/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['chat.ajornada.top'],
    proxy: {
      '/api': {
        target: 'http://chatcnj-backend:8000',
        changeOrigin: true,
      },
    },
  },
});
