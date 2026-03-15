import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { cpSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ビルド後にレガシーアプリ（CVCreator/ResumeCreator等）をdistにコピー */
function copyLegacyApps() {
  return {
    name: 'copy-legacy-apps',
    closeBundle() {
      const src = resolve(__dirname, '../apps');
      const dest = resolve(__dirname, 'dist/apps');
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
        console.log('✓ レガシーアプリを dist/apps/ にコピーしました');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyLegacyApps()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'vendor';
          if (id.includes('node_modules/pdf-lib') || id.includes('fontkit')) return 'pdf';
        },
      },
    },
  },
});
