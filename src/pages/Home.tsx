import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  User,
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Calendar, 
  AlertCircle,
  Settings,
  Building2,
  History,
  ArrowRightCircle,
  Clock,
  UserSquare2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { motion } from 'motion/react';

export default function Home() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/', color: 'bg-blue-500' },
    { icon: GraduationCap, label: t('classes'), path: '/classes', color: 'bg-emerald-500' },
    { icon: Users, label: t('students'), path: '/eleves', color: 'bg-indigo-500' },
    { icon: ArrowRightCircle, label: t('promotions'), path: '/promotions', color: 'bg-orange-500' },
    { icon: UserSquare2, label: t('teachers'), path: '/enseignants', color: 'bg-rose-500' },
    { icon: BookOpen, label: t('subjects'), path: '/matieres', color: 'bg-amber-500' },
    { icon: ClipboardList, label: t('grades'), path: '/notes', color: 'bg-cyan-500' },
    { icon: User, label: 'Mon Enfant', path: '/mon-enfant', color: 'bg-blue-600' },
    { icon: CreditCard, label: t('payments'), path: '/paiements', color: 'bg-purple-500' },
    { icon: Calendar, label: t('timetable'), path: '/emploi-du-temps', color: 'bg-teal-500' },
    { icon: Clock, label: 'Demandes EDT', path: '/emploi-du-temps-requests', color: 'bg-slate-500' },
    { icon: AlertCircle, label: t('alerts'), path: '/alertes', color: 'bg-red-500' },
    { icon: History, label: t('audit_logs'), path: '/audit-logs', color: 'bg-slate-600' },
    { icon: Building2, label: t('school_info'), path: '/ecole', color: 'bg-sky-600' },
    { icon: Settings, label: t('settings'), path: '/parametres', color: 'bg-slate-400' },
  ];

  const filteredMenus = menuItems.filter(item => {
    if (!user) return false;
    
    // Role specific visibility
    if (item.path === '/mon-enfant') return user.role === 'parent';

    if (user.role === 'admin' || user.role === 'super_admin') return true;

    if (user.role === 'parent') {
      return ['/accueil', '/alertes'].includes(item.path);
    }
    
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.some((p: any) => (typeof p === 'string' ? p === item.path : p.path === item.path));
    }
    
    return false;
  });

  return (
    <div className="space-y-8 py-4">
      <header className="text-center space-y-2">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-slate-900"
        >
          Bienvenue, {user?.nom}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-lg"
        >
          Que souhaitez-vous faire aujourd'hui ?
        </motion.p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredMenus.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={item.path}
              className="group flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-center h-full"
            >
              <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <item.icon size={28} />
              </div>
              <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                {item.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
