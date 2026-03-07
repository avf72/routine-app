import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { handleCallback } from './lib/googleCalendar.js'

// OAuth-Callback sofort verarbeiten, bevor React rendert
const gcNav = await handleCallback()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App gcNav={gcNav} />
  </StrictMode>,
)
