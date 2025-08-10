import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// main.tsx
import 'leaflet/dist/leaflet.css';


// Import global styles
import './index.css'
import './App.css'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
