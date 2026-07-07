import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useParametres } from '../contexts/ParametresContext'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  ExternalLink,
  Menu,
  X
} from 'lucide-react'

export default function Layout() {
  const { parametres } = useParametres()
  const navigate = useNavigate()
  const [menuOuvert, setMenuOuvert] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const accentColor = parametres?.accent_color || '#635BFF'

  // Configuration des onglets avec leurs vrais chemins d'accès (routes)
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/stock', label: 'Mon Stock', icon: Package },
    { path: '/commandes', label: 'Commandes', icon: ShoppingCart },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/factures', label: 'Factures', icon: FileText },
    { path: '/rapports', label: 'Rapports', icon: BarChart3 },
    { path: '/parametres', label: 'Paramètres', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col md:flex-row text-gray-900 antialiased">
      
      {/* BARRE LATÉRALE DE NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col md:justify-between shrink-0 relative z-20">

        {/* --- BLOC DESKTOP (sidebar classique, inchangé) --- */}
        <div className="hidden md:block p-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-5 mb-5">
            {parametres?.logo_url ? (
              <img src={parametres.logo_url} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div style={{ backgroundColor: accentColor }} className="w-9 h-9 text-white font-bold rounded-xl flex items-center justify-center text-sm">
                {(parametres?.nom_boutique || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-gray-950 truncate">{parametres?.nom_boutique || 'Ma Boutique'}</h2>
              {parametres?.lien_public && (
                <a 
                  href={`/boutique/${parametres.lien_public}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] text-gray-400 font-medium flex items-center gap-1 hover:text-gray-600 mt-0.5"
                >
                  <span>Voir la vitrine</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icone = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => isActive ? { backgroundColor: `${accentColor}12`, color: accentColor } : {}}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                    ${isActive ? '' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icone size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="hidden md:block p-6 border-t border-gray-50 bg-neutral-50/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 h-11 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* --- BLOC MOBILE (top bar compacte + dropdown) --- */}
        <div className="md:hidden">
          {/* Top bar : hauteur fixe, padding propre, une seule bordure */}
          <div className="h-14 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {parametres?.logo_url ? (
                <img src={parametres.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
              ) : (
                <div style={{ backgroundColor: accentColor }} className="w-8 h-8 text-white font-bold rounded-lg flex items-center justify-center text-xs shrink-0">
                  {(parametres?.nom_boutique || 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="font-bold text-sm text-gray-950 truncate">{parametres?.nom_boutique || 'Ma Boutique'}</h2>
            </div>

            <button
              onClick={() => setMenuOuvert(!menuOuvert)}
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all"
              aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOuvert}
            >
              {menuOuvert ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Dropdown : n'existe dans le DOM que si ouvert, padding indépendant de la top bar */}
          {menuOuvert && (
            <nav className="px-3 pb-3 pt-1 border-t border-gray-100 flex flex-col gap-1">
              {parametres?.lien_public && (
                <a
                  href={`/boutique/${parametres.lien_public}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-gray-400 font-medium flex items-center gap-1 hover:text-gray-600 px-1 pt-2 pb-1"
                >
                  <span>Voir la vitrine</span>
                  <ExternalLink size={10} />
                </a>
              )}

              {menuItems.map((item) => {
                const Icone = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOuvert(false)}
                    style={({ isActive }) => isActive ? { backgroundColor: `${accentColor}12`, color: accentColor } : {}}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                      ${isActive ? '' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <Icone size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition-all cursor-pointer mt-1 border-t border-gray-50 pt-2"
              >
                <LogOut size={16} />
                <span>Déconnexion</span>
              </button>
            </nav>
          )}
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPALE (Affiche la page demandée) */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        <Outlet />
      </main>

    </div>
  )
}