import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

/**
 * main.jsx — the entry point React renders from.
 *
 * BrowserRouter: gives us URL-based routing (react-router-dom).
 * Without it: no <Link>, no useNavigate, no route-based pages.
 *
 * Toaster: react-hot-toast notification system.
 * Place it here at the root so any component can trigger a toast.
 * Usage anywhere: import toast from 'react-hot-toast'; toast.success('Done!')
 *
 * StrictMode: in development only, renders components twice to catch bugs.
 * Has no effect in production builds.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '14px',
            borderRadius: '8px',
          },
          success: { iconTheme: { primary: '#185FA5', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)