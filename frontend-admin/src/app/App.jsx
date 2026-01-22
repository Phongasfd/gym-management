import { useState } from 'react'
import './App.css'
import AppRoutes from './router.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx';

function App() {

  return (
    <>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
    </>

  )
}

export default App
