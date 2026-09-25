import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

// Self-hosted fonts (same families/weights as the site design), avoiding the
// extra fonts.googleapis.com + fonts.gstatic.com round trips of a CDN @import.
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// font-black (weight 900, e.g. active nav links) has no matching @font-face
// without this: the browser fake-bolds the fallback font at 900 until Inter
// loads, then snaps to the nearest *registered* weight (700, real glyphs are
// narrower than the synthesized fallback), which reads as the text shrinking.
import '@fontsource/inter/900.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './index.css';

import { ErrorBoundary } from './components/ErrorBoundary.tsx';

console.log('[Main] Initializing app...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[Main] Root element not found!');
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('[Main] Render triggered successfully');
  } catch (error) {
    console.error('[Main] Critical render error:', error);
  }
}
