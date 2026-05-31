import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// NOTE: StrictMode intentionally removed. Its dev-only double-mount creates two
// NGL WebGL Stages (black canvas / "CifParser already exists"). StrictMode is a
// no-op in production, so this only aligns dev with prod behavior.
createRoot(document.getElementById('root')!).render(<App />)
