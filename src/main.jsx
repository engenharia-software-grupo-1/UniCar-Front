import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function iniciarMocks() {
  // Mock total: nada sai para a rede (roda sem backend).
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser.js')
    await worker.start({ onUnhandledRequest: 'bypass' })
    return
  }

  // Modo híbrido: só os endpoints que a API ainda não tem são mockados;
  // /auth, /usuarios e /veiculos seguem para o backend real.
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_FALTANTES === 'true') {
    const { workerFaltantes } = await import('./mocks/browser.js')
    await workerFaltantes.start({ onUnhandledRequest: 'bypass' })
  }
}

iniciarMocks().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
