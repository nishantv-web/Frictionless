import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installChromeMock } from './lib/chrome-mock'
import { SidePanelApp } from './components/SidePanelApp'

// Install chrome mock for dev/preview environments
installChromeMock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: 400, margin: '0 auto', minHeight: '100vh', border: '1px solid #e5e7eb' }}>
      <SidePanelApp />
    </div>
  </StrictMode>,
)
