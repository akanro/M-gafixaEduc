import { apiFetch } from '../utils/api';
import React from 'react';
import logo from '../logo_megafixa.png';
import { 
  LayoutDashboard, 
  Users, 
  User,
  UserSquare2, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Calendar, 
  ArrowRightCircle,
  AlertCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Clock,
  Phone,
  Mail,
  History,
  Chrome,
  Download,
  Home as HomeIcon,
  Heart
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [activeYear, setActiveYear] = React.useState<any>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchActiveYear = () => {
    const token = localStorage.getItem('token');
    apiFetch(`/api/annees/active?t=${Date.now()}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => setActiveYear(data))
      .catch(err => {
        if (err instanceof TypeError && err.message === 'Failed to fetch') return;
        console.error('Error fetching active year:', err);
      });
  };

  const fetchSchoolInfo = () => {
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => setSchoolInfo(data))
      .catch(err => {
        if (err instanceof TypeError && err.message === 'Failed to fetch') return;
        console.error('Error fetching school info:', err);
      });
  };

  React.useEffect(() => {
    fetchActiveYear();
    fetchSchoolInfo();
    
    // Listen for custom events
    window.addEventListener('academicYearChanged', fetchActiveYear);
    window.addEventListener('schoolInfoChanged', fetchSchoolInfo);
    return () => {
      window.removeEventListener('academicYearChanged', fetchActiveYear);
      window.removeEventListener('schoolInfoChanged', fetchSchoolInfo);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const sidebarItems = [
    { icon: HomeIcon, label: 'Accueil', path: '/accueil' },
    { icon: LayoutDashboard, label: t('dashboard'), path: '/tableau-de-bord' },
    { icon: GraduationCap, label: t('classes'), path: '/classes' },
    { icon: Users, label: t('students'), path: '/eleves' },
    { icon: ArrowRightCircle, label: t('promotions'), path: '/promotions' },
    { icon: UserSquare2, label: t('teachers'), path: '/enseignants' },
    { icon: BookOpen, label: t('subjects'), path: '/matieres' },
    { icon: ClipboardList, label: t('grades'), path: '/notes' },
    { icon: User, label: 'Mon Enfant', path: '/mon-enfant' },
    { icon: CreditCard, label: t('payments'), path: '/paiements' },
    { icon: Calendar, label: t('timetable'), path: '/emploi-du-temps' },
    { icon: Clock, label: t('timetable_requests') || 'Demandes EDT', path: '/emploi-du-temps-requests' },
    { icon: AlertCircle, label: t('alerts'), path: '/alertes' },
    { icon: History, label: t('audit_logs'), path: '/audit-logs' },
    { icon: Building2, label: t('school_info'), path: '/ecole' },
    { icon: Settings, label: t('settings'), path: '/parametres' },
    { icon: Heart, label: 'À propos', path: '/a-propos' },
  ];

  const filteredSidebarItems = sidebarItems.filter(item => {
    const currentUser = user || { role: 'user' };
    
    // Role specific visibility
    if (item.path === '/mon-enfant') return currentUser.role === 'parent';

    // Admin has access to everything else
    if (['admin', 'super_admin'].includes(currentUser.role)) return true;

    // Parent role specific items
    if (currentUser.role === 'parent') {
      return ['/accueil', '/alertes', '/mon-enfant'].includes(item.path);
    }

    // Accueil and About are always visible to everyone logged in
    if (['/accueil', '/a-propos'].includes(item.path)) return true;

    // If user has explicit permissions set, check them
    if (currentUser.permissions && Array.isArray(currentUser.permissions)) {
      const hasExplicitPermission = currentUser.permissions.some((p: any) => {
        const pPath = typeof p === 'string' ? p : p.path;
        // Map '/' to '/tableau-de-bord' for permission check
        if (item.path === '/tableau-de-bord' && (pPath === '/' || pPath === '/tableau-de-bord')) return true;
        return pPath === item.path;
      });
      if (hasExplicitPermission) return true;
    }
    
    // No fallback - only admin or explicit permissions
    return false;
  });

  // Apply school styles
  React.useEffect(() => {
    if (schoolInfo) {
      document.documentElement.style.setProperty('--school-primary', schoolInfo.couleur_primaire || '#10b981');
      
      const fontFamilies: Record<string, string> = {
        inter: '"Inter", sans-serif',
        roboto: '"Roboto", sans-serif',
        playfair: '"Playfair Display", serif',
        mono: '"JetBrains Mono", monospace'
      };
      
      document.documentElement.style.setProperty('--school-font', fontFamilies[schoolInfo.police] || '"Inter", sans-serif');
    }
  }, [schoolInfo]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row font-school">
      {/* Mobile Header */}
      <header className="sm:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          {schoolInfo?.logo ? (
            <img src={schoolInfo.logo} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <img src={logo} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" referrerPolicy="no-referrer" />
          )}
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 truncate max-w-[150px] text-sm leading-tight">{schoolInfo?.nom || import.meta.env.VITE_SCHOOL_NAME || 'MégafixaEduc'}</span>
            {activeYear && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{activeYear.libelle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r transition-all duration-300 ease-in-out py-0 shrink-0 z-40",
        // Desktop/Tablet styles
        "sm:relative sm:translate-x-0",
        // Mobile styles
        "fixed inset-y-0 left-0 shadow-xl sm:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className="h-full flex flex-col justify-between">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sidebar Toggle (Desktop) */}
            <div className="hidden sm:flex items-center justify-between p-4 border-b">
              {!isCollapsed && (
                <div className="flex items-center gap-3 overflow-hidden">
                  {schoolInfo?.logo ? (
                    <img src={schoolInfo.logo} alt="Logo" className="w-10 h-10 object-contain shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <img src={logo} alt="Logo" className="w-10 h-10 object-contain shrink-0" referrerPolicy="no-referrer" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-slate-900 leading-tight truncate text-sm">{schoolInfo?.nom || import.meta.env.VITE_SCHOOL_NAME || 'MégafixaEduc'}</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold truncate">Application</p>
                  </div>
                </div>
              )}
              <button 
                onClick={toggleCollapsed}
                className={cn(
                  "p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500",
                  isCollapsed && "mx-auto"
                )}
                title={isCollapsed ? "Développer" : "Réduire"}
              >
                <Menu size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
              {filteredSidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group relative",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-primary",
                      isCollapsed && "justify-center px-0"
                    )}
                    title={isCollapsed ? item.label : ""}
                  >
                    <item.icon size={20} className={cn(
                      "shrink-0",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors"
                    )} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {isCollapsed && isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t bg-slate-50/50">
            <div className={cn(
              "flex items-center gap-3 px-2 py-2 mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
              isCollapsed && "justify-center px-0"
            )}>
              <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm relative shrink-0 border-2 border-white shadow-sm">
                {user?.nom?.charAt(0).toUpperCase()}
                {user?.google_id && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-50">
                    <Chrome size={10} className="text-red-500" />
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.nom}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 w-full text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-all",
                    isCollapsed && "justify-center px-0"
                  )}
                  title="Installer l'application"
                >
                  <Download size={18} />
                  {!isCollapsed && <span>Installer</span>}
                </button>
              )}

              <button 
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 w-full text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all",
                  isCollapsed && "justify-center px-0"
                )}
                title="Déconnexion"
              >
                <LogOut size={18} />
                {!isCollapsed && <span>Déconnexion</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Desktop Header */}
        <div className="hidden sm:flex items-center justify-between px-8 py-4 bg-white border-b sticky top-0 z-30">
          <div>
            {activeYear && (
              <div className="px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                <span className="text-xs font-bold text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Année : {activeYear.libelle}
                </span>
              </div>
            )}
          </div>
          <NotificationBell />
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
          
          {/* Global Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 text-slate-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-12">
                <div className="flex items-center gap-3 grayscale opacity-60">
                  <img src={logo} alt="Mégafixa Tech" className="w-8 h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
                  <span className="text-sm font-bold tracking-tight">MEGAFIXA TECH</span>
                </div>
                <div className="h-px w-12 bg-slate-200 hidden sm:block" />
                <p className="text-[10px] font-medium max-w-xs text-center sm:text-left leading-relaxed opacity-70">
                  La technologie et le numérique au service de l'excellence éducative.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2 text-[10px]">
                  <Phone size={14} className="text-primary/60" />
                  <span>01 41 26 42 38 / 01 61 10 79 18 / 01 29 55 01 51</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <Mail size={14} className="text-primary/60" />
                  <span>megafixatecheduc@gmail.com</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-1 px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {[
          { icon: HomeIcon, label: 'Accueil', path: '/accueil' },
          { icon: LayoutDashboard, label: 'Bord', path: '/tableau-de-bord' },
          { icon: GraduationCap, label: 'Classes', path: '/classes' },
          { icon: Users, label: 'Élèves', path: '/eleves' },
          { icon: Menu, label: 'Menu', action: () => setIsSidebarOpen(!isSidebarOpen) }
        ].filter(item => {
          if (item.action) return true;
          if (item.path === '/accueil') return true;
          if (user?.role === 'admin') return true;
          
          if (user?.permissions && Array.isArray(user.permissions)) {
            return user.permissions.some((p: any) => {
              const pPath = typeof p === 'string' ? p : p.path;
              if (item.path === '/tableau-de-bord' && pPath === '/') return true;
              return pPath === item.path;
            });
          }
          
          if (user?.role === 'enseignant') {
            return ['/eleves'].includes(item.path || '');
          }

          return !['/tableau-de-bord'].includes(item.path || '');
        }).map((item: any, idx) => {
          const isActive = location.pathname === item.path;
          if (item.action) {
            return (
              <button
                key={idx}
                onClick={item.action}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-1.5 min-w-[60px] transition-colors",
                  isSidebarOpen ? "text-primary" : "text-slate-500"
                )}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 p-1.5 min-w-[60px] transition-colors",
                isActive ? "text-primary" : "text-slate-500"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
