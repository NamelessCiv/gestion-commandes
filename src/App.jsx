import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ParametresProvider } from './contexts/ParametresContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import Commandes from './pages/Commandes'
import Parametres from './pages/Parametres'
import Vitrine from './pages/Vitrine'
import Clients from './pages/Clients'     // 👈 AJOUT
import Factures from './pages/Factures'   // 👈 AJOUT
import Rapports from './pages/Rapports'   // 👈 AJOUT
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <ParametresProvider>
        <Routes>
          {/* Route publique pour la vitrine client */}
          <Route path="/boutique/:lien_public" element={<Vitrine />} />

          {/* Route d'authentification */}
          <Route path="/login" element={<Login />} />

          {/* Routes de gestion de la boutique (Protégées) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stock" element={<Stock />} />
            <Route path="commandes" element={<Commandes />} />
            <Route path="clients" element={<Clients />} />     {/* 👈 AJOUT */}
            <Route path="factures" element={<Factures />} />   {/* 👈 AJOUT */}
            <Route path="rapports" element={<Rapports />} />   {/* 👈 AJOUT */}
            <Route path="parametres" element={<Parametres />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ParametresProvider>
    </Router>
  )
}

export default App