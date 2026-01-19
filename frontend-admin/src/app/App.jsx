import { useState } from 'react'
import './App.css'
import AppRoutes from './router.jsx'
import { BrowserRouter } from 'react-router-dom'

function App() {

  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>

  )
}

export default App
