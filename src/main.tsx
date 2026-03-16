import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const mountEl = document.getElementById('autoindex-root')
if (mountEl) {
  createRoot(mountEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
