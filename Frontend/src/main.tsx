import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { getEnv } from './env';
import './index.css';
// Web vitals now started only after explicit telemetry opt-in (see App.tsx)

const { VITE_CLERK_PUBLISHABLE_KEY: PUBLISHABLE_KEY } = getEnv();
const hasClerk = !!PUBLISHABLE_KEY;
if (!hasClerk && import.meta.env.DEV) {
  console.warn('[env] Clerk publishable key missing (set VITE_CLERK_PUBLISHABLE_KEY in .env.local). Running in fallback (no-auth) mode.');
}

// Expose flag so App can decide whether to render Clerk components
if (typeof window !== 'undefined') {
  (window as any).__HAS_CLERK__ = hasClerk;
}

const Root = (
  <StrictMode>
    {hasClerk ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY!} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(Root);

// Telemetry / web vitals intentionally not started here to respect opt-in.

// Service worker registration (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      if (import.meta.env.DEV) console.warn('[sw] registration failed', err);
    });
  });
}
