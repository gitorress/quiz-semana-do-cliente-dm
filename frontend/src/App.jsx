import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Hub from './pages/Hub.jsx';
import Fase from './pages/Fase.jsx';
import Ranking from './pages/Ranking.jsx';
import Admin from './pages/Admin.jsx';
import { estaAutenticado, obterUsuario } from './api.js';

function RotaPrivada({ children }) {
  if (!estaAutenticado()) return <Navigate to="/" replace />;
  return children;
}

function RotaAdmin({ children }) {
  const usuario = obterUsuario();
  if (!estaAutenticado()) return <Navigate to="/" replace />;
  if (!usuario?.is_admin) return <Navigate to="/hub" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/hub" element={<RotaPrivada><Hub /></RotaPrivada>} />
        <Route path="/fase/:chave" element={<RotaPrivada><Fase /></RotaPrivada>} />
        <Route path="/ranking" element={<RotaPrivada><Ranking /></RotaPrivada>} />
        <Route path="/admin" element={<RotaAdmin><Admin /></RotaAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
