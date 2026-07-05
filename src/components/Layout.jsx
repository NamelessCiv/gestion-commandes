import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, FileText, Users, BarChart3, Settings, LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/commandes', label: 'Commandes', icon: ShoppingCart },
  { to: '/rapports', label: 'Rapports', icon: BarChart3 },
  { to: '/factures', label: 'Factures', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
]

function MenuProfil() {
  const [ouvert, setOuvert] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { parametres } = useParametres()

  useEffect(() => {
    function gererClicExterieur(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', gererClicExterieur)
    return () => document.removeEventListener('mousedown', gererClicExterieur)
  }, [])

  const initiale = parametres.nom_boutique?.charAt(0).toUpperCase() || 'B'
  const estPremium = parametres.plan === 'premium'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm overflow-hidden shrink-0"
      >
        {parametres.logo_url ? (
          <img src={parametres.logo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          initiale
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-20">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-medium text-text truncate">{parametres.nom_boutique}</p>
            <span
              className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                estPremium ? 'text-accent bg-accent/10' : 'text-text-secondary bg-bg'
              }`}
            >
              {estPremium ? 'Premium' : 'Gratuit'}
            </span>
          </div>
          <button
            onClick={() => { setOuvert(false); navigate('/parametres') }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg hover:text-text transition-colors"
          >
            <Settings size={16} />
            Paramètres
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg hover:text-error transition-colors"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

function Layout() {
  const { parametres } = useParametres()

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Sidebar - visible uniquement sur grand écran */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:bg-card lg:h-screen lg:sticky lg:top-0">
        <div className="px-6 py-6">
          <h1 className="text-lg font-semibold text-text truncate">{parametres.nom_boutique}</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg hover:text-text'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 pb-20 lg:pb-0">
        {/* Barre du haut - profil en haut à droite, sur mobile et desktop */}
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 lg:px-8 py-3 flex items-center justify-end">
          <MenuProfil />
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Navigation basse - visible uniquement sur mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-10">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout