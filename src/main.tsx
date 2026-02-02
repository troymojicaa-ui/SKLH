import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import 'leaflet/dist/leaflet.css';
import "./lib/leaflet-icon-fix";
console.log("[main] after icon fix import");

console.log("[env] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL ?? "(undefined)");
console.log("[env] VITE_SUPABASE_ANON_KEY present:", Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY));
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("⚠️ Supabase env vars missing. Make sure .env is in project root and restart the dev server.");
}

import "./index.css";
import "./App.css";

import App from "./App";
// IMPORTANT: use the named export from the Provider we added (with inactivity auto-logout)
import AuthProvider from '@/context/AuthProvider'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
