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
