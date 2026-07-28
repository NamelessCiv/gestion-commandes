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

  // Couleur dynamique de la boutique : utilisée UNIQUEMENT pour l'avatar
  // de secours (initiale) quand il n'y a pas de logo uploadé.
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
    <div className="min-h-screen bg-bg flex flex-col md:flex-row text-text antialiased">
      
      {/* BARRE LATÉRALE / HEADER */}
      <aside className="w-full md:w-64 bg-brand flex flex-col md:justify-between shrink-0 relative z-20">

        {/* --- BLOC DESKTOP (sidebar classique, inchangé) --- */}
        <div className="hidden md:block p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5 mb-5">
            {parametres?.logo_url ? (
              <img src={parametres.logo_url} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
            ) : (
              <div style={{ backgroundColor: accentColor }} className="w-9 h-9 text-white font-bold rounded-xl flex items-center justify-center text-sm shrink-0">
                {(parametres?.nom_boutique || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-white truncate">{parametres?.nom_boutique || 'Ma Boutique'}</h2>
              {parametres?.lien_public && (
                <a 
                  href={`/boutique/${parametres.lien_public}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] text-white/50 font-medium flex items-center gap-1 hover:text-white/80 mt-0.5"
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
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 h-10 rounded-lg text-xs transition-all
                    ${isActive ? 'bg-cta text-white font-semibold' : 'text-white/60 font-medium hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <Icone size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="hidden md:block p-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-xs font-medium text-white/60 hover:bg-error/10 hover:text-error transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* --- BLOC MOBILE (Top bar + Drawer latéral qui s'ouvre à GAUCHE) --- */}
        <div className="md:hidden">
          {/* Top bar Mobile : Menu à Gauche, Profil/Boutique à Droite */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
            
            {/* Bouton Menu Hamburger à GAUCHE */}
            <button
              onClick={() => setMenuOuvert(true)}
              className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10 transition-all"
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>

            {/* Titre / Logo au centre-gauche */}
            <div className="flex items-center gap-2 min-w-0 flex-1 ml-2">
              <h2 className="font-display font-bold text-sm text-white truncate">
                {parametres?.nom_boutique || 'Ma Boutique'}
              </h2>
            </div>

            {/* Profil / Avatar de la boutique à DROITE */}
            <div className="shrink-0 flex items-center">
              {parametres?.logo_url ? (
                <img 
                  src={parametres.logo_url} 
                  alt="Profil" 
                  className="w-8 h-8 rounded-full object-cover border border-white/20" 
                />
              ) : (
                <div 
                  style={{ backgroundColor: accentColor }} 
                  className="w-8 h-8 text-white font-bold rounded-full flex items-center justify-center text-xs shrink-0 border border-white/20"
                >
                  {(parametres?.nom_boutique || 'B').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* MENU LATÉRAL (Drawer glissant depuis la GAUCHE) */}
          {menuOuvert && (
            <div className="fixed inset-0 z-50 flex">
              
              {/* Fond sombre cliquable pour fermer le menu */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={() => setMenuOuvert(false)}
              />

              {/* Panneau de menu à GAUCHE */}
              <div className="relative w-4/5 max-w-xs bg-brand h-full shadow-2xl flex flex-col justify-between z-10 p-5">
                
                {/* En-tête du Drawer */}
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {parametres?.logo_url ? (
                        <img src={parametres.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div style={{ backgroundColor: accentColor }} className="w-8 h-8 text-white font-bold rounded-lg flex items-center justify-center text-xs shrink-0">
                          {(parametres?.nom_boutique || 'B').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <h2 className="font-display font-bold text-sm text-white truncate">
                        {parametres?.nom_boutique || 'Ma Boutique'}
                      </h2>
                    </div>

                    <button
                      onClick={() => setMenuOuvert(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
                      aria-label="Fermer le menu"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Lien voir la vitrine */}
                  {parametres?.lien_public && (
                    <a
                      href={`/boutique/${parametres.lien_public}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-white/50 font-medium flex items-center gap-1 hover:text-white/80 px-2 py-1.5 mb-2"
                    >
                      <span>Voir la vitrine</span>
                      <ExternalLink size={10} />
                    </a>
                  )}

                  {/* Liens de navigation */}
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const Icone = item.icon
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMenuOuvert(false)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-3 h-10 rounded-lg text-xs transition-all
                            ${isActive ? 'bg-cta text-white font-semibold' : 'text-white/60 font-medium hover:bg-white/10 hover:text-white'}
                          `}
                        >
                          <Icone size={16} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </nav>
                </div>

                {/* Bouton Déconnexion en bas du Drawer */}
                <div className="border-t border-white/10 pt-4">
                  <button
                    onClick={() => {
                      setMenuOuvert(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-xs font-medium text-white/60 hover:bg-error/10 hover:text-error transition-all cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        <Outlet />
      </main>

    </div>
  )
}