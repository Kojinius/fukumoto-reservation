import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor';
          if (id.includes('pdf-lib') || id.includes('fontkit')) return 'pdf';
        },
      },
    },
  },
  server: {
    port: 5174,
    open: true,
  },
});
