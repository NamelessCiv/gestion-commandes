import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { ParametresProvider } from './contexts/ParametresContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import Commandes from './pages/Commandes'
import Rapports from './pages/Rapports'
import Factures from './pages/Factures'
import Clients from './pages/Clients'
import Parametres from './pages/Parametres'

function App() {
  const [session, setSession] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChargement(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-text-secondary text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route
            element={
              <ParametresProvider>
                <Layout />
              </ParametresProvider>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/commandes" element={<Commandes />} />
            <Route path="/rapports" element={<Rapports />} />
            <Route path="/factures" element={<Factures />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App