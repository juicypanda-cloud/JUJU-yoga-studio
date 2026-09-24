import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// @fontsource ships every face with font-display: swap, which paints text in
// the fallback font first and swaps to the real font once it downloads. The
// nav's uppercase, letter-spaced labels visibly reflow during that swap.
// `optional` keeps the fallback for the whole render if the (self-hosted,
// same-origin, so already-fast) font isn't ready almost immediately, instead
// of swapping later and causing that reflow.
function fontsourceNoSwap(): Plugin {
  return {
    name: 'fontsource-font-display-optional',
    transform(code, id) {
      if (id.includes('@fontsource') && id.endsWith('.css')) {
        return code.replace(/font-display:\s*swap/g, 'font-display: optional');
      }
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), fontsourceNoSwap()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            motion: ['motion', 'motion/react'],
            ui: ['lucide-react', '@radix-ui/react-slot', '@base-ui/react/avatar', 'class-variance-authority'],
          },
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
