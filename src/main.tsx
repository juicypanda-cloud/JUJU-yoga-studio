import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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
