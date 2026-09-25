import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Dev-only shape preview: http://localhost:5173/?gallery
const ShapeGallery =
  import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')
    ? lazy(() => import('./dev/ShapeGallery').then((m) => ({ default: m.ShapeGallery })))
    : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {ShapeGallery ? (
      <Suspense>
        <ShapeGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
