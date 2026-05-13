import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingSide from './pages/LandingSide.jsx'
import SokSide from './pages/SokSide.jsx'
import ProfilSide from './pages/ProfilSide.jsx'
import VerifiserSide from './pages/VerifiserSide.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingSide />} />
        <Route path="/sok" element={<SokSide />} />
        <Route path="/fysioterapeut/:orgnr" element={<ProfilSide />} />
        <Route path="/verifiser/:token" element={<VerifiserSide />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
