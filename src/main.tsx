import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css';
import "./lib/leaflet-icon-fix";
console.log("[main] after icon fix import");

// 🔎 ENV DEBUG — remove after testing
console.log(
  "[env] VITE_SUPABASE_URL:",
  import.meta.env.VITE_SUPABASE_URL ?? "(undefined)"
);
console.log(
  "[env] VITE_SUPABASE_ANON_KEY present:",
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
);
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("⚠️ Supabase env vars missing. Make sure .env is in project root and restart the dev server.");
}

// Import global styles
import './index.css'
import './App.css'

import App from './App.tsx'
import AuthProvider from '@/context/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
