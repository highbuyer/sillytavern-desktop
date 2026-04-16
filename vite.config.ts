import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    fastRefresh: false,
    jsxRuntime: 'automatic',
  })],
  appType: 'spa',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: join(__dirname, 'index.html')
      },
      output: {
        format: 'iife',
        name: 'SillyTavern',
        // React 将被打包进 bundle，不需要 globals
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    historyApiFallback: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
