import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import './index.css'

// The same build serves both surfaces. The admin dashboard loads on the
// admin.* subdomain (admin.esraomer.com) or under the /admin path for local
// testing; everything else is the guest site.
const isAdmin =
  window.location.hostname.startsWith('admin.') || window.location.pathname.startsWith('/admin')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>{isAdmin ? <AdminApp /> : <App />}</BrowserRouter>
  </React.StrictMode>,
)
