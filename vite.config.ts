import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// @fontsource ships every face with font-display: swap, which paints text in
// the fallback font first and swaps to the real font once it downloads. The
// nav's uppercase, letter-spaced labels visibly reflow during that swap.
// `fallback` gives the font a short (~3s) window to swap in before locking,
// instead of `swap`'s unbounded later swap (the nav reflow) or `optional`'s
// instant lock to the fallback face if it's not ready within ~100ms — which
// made the serif hero headline (Cormorant Garamond, a less-warm face than
// Inter) render in a generic fallback serif's heavier synthesized weight
// whenever it missed that tiny window.
function fontsourceNoSwap(): Plugin {
  return {
    name: 'fontsource-font-display-fallback',
    transform(code, id) {
      if (id.includes('@fontsource') && id.endsWith('.css')) {
        return code.replace(/font-display:\s*swap/g, 'font-display: fallback');
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
