import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_HOSTED': JSON.stringify(process.env.VERCEL === '1' ? 'true' : 'false'),
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4310' } },
});
