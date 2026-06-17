import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { 
  Users, 
  GraduationCap, 
  School, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatClassName } from '../utils/format';

export default function Dashboard() {
  const { confirm } = useConfirm();
  const [stats, setStats] = React.useState<any>({
    elevesCount: 0,
    enseignantsCount: 0,
    classesCount: 0,
    registrationStats: [],
    inscriptionsByClass: []
  });
  const [alertes, setAlertes] = React.useState([]);
  const [showAlertModal, setShowAlertModal] = React.useState(false);
  const [editingAlerte, setEditingAlerte] = React.useState<any>(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/' : p.path === '/'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [alerteForm, setAlerteForm] = React.useState({
    titre: '',
    description: '',
    importance: 'normal'
  });

  const [selectedAlerte, setSelectedAlerte] = React.useState<any>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const fetchAlertes = () => {
    apiFetch('/api/alertes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlertes(data);
        } else {
          setAlertes([]);
        }
      })
      .catch(() => setAlertes([]));
  };

  React.useEffect(() => {
    apiFetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStats(data);
        }
      })
      .catch(err => console.error("Fetch stats error:", err));

    fetchAlertes();
  }, []);

  const handleViewDetails = (alerte: any) => {
    setSelectedAlerte(alerte);
    setShowDetailModal(true);
  };

  const handleAlerteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAlerte ? `/api/alertes/${editingAlerte.id}` : '/api/alertes';
    const method = editingAlerte ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alerteForm)
    }).then(() => {
      setShowAlertModal(false);
      setEditingAlerte(null);
      setAlerteForm({ titre: '', description: '', importance: 'normal' });
      fetchAlertes();
    });
  };

  const handleEditAlerte = (alerte: any) => {
    setEditingAlerte(alerte);
    setAlerteForm({
      titre: alerte.titre ?? '',
      description: alerte.description ?? '',
      importance: alerte.importance ?? 'normal'
    });
    setShowAlertModal(true);
  };

  const handleDeleteAlerte = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer l\'alerte',
      message: 'Voulez-vous vraiment supprimer cette alerte ?',
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      apiFetch(`/api/alertes/${id}`, { method: 'DELETE' }).then(() => fetchAlertes());
    }
  };

  return (
    <div className="space-y-8 pb-16 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
        <p className="text-slate-500">Bienvenue dans votre espace d'administration scolaire.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Élèves" 
          value={stats.elevesCount} 
          icon={Users} 
          trend="+12%" 
          trendUp={true} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Enseignants" 
          value={stats.enseignantsCount} 
          icon={GraduationCap} 
          trend="+2" 
          trendUp={true} 
          color="bg-primary-500"
        />
        <StatCard 
          title="Classes" 
          value={stats.classesCount} 
          icon={School} 
          trend="Stable" 
          trendUp={true} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Anciens Élèves" 
          value={Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Passant')?.count || 0 : 0} 
          icon={Users} 
          trend="Historique" 
          trendUp={true} 
          color="bg-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Analysis */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Analyse des Inscriptions</h2>
                <p className="text-sm text-slate-500">Répartition Nouveaux vs Anciens par classe</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.inscriptionsByClass || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="classe_nom" 
                    tickFormatter={(val) => formatClassName(val)}
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 20 }} />
                  <Bar dataKey="nouveaux" name="Nouveaux" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="anciens" name="Anciens" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Répartition Globale</h2>
                <p className="text-sm text-slate-500">Proportion des inscriptions</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full h-[250px] md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Nouveaux', value: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Nouveau')?.count || 0 : 0 },
                        { name: 'Anciens', value: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Passant')?.count || 0 : 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full md:w-1/2 space-y-6">
                {[
                  { label: 'Nouveaux Élèves', count: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Nouveau')?.count || 0 : 0, color: 'bg-blue-500', percent: stats.elevesCount > 0 ? Math.round(((stats as any).registrationStats?.find((s: any) => s.statut === 'Nouveau')?.count || 0) / stats.elevesCount * 100) : 0 },
                  { label: 'Anciens Élèves (Passants)', count: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Passant')?.count || 0 : 0, color: 'bg-slate-400', percent: stats.elevesCount > 0 ? Math.round(((stats as any).registrationStats?.find((s: any) => s.statut === 'Passant')?.count || 0) / stats.elevesCount * 100) : 0 }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Alertes Importantes</h3>
            {canWrite && (
              <button 
                onClick={() => { setEditingAlerte(null); setAlerteForm({ titre: '', description: '', importance: 'normal' }); setShowAlertModal(true); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-primary-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {(Array.isArray(alertes) ? alertes : []).map((alerte: any) => (
              <AlertItem 
                key={alerte.id}
                type={alerte.importance === 'high' ? 'error' : alerte.importance === 'medium' ? 'warning' : 'info'} 
                title={alerte.titre} 
                desc={alerte.description}
                isManual={alerte.type === 'manual' || !alerte.type}
                onViewDetails={() => handleViewDetails(alerte)}
                onEdit={canWrite ? () => handleEditAlerte(alerte) : undefined}
                onDelete={canWrite ? () => handleDeleteAlerte(alerte.id) : undefined}
              />
            ))}
            {(!Array.isArray(alertes) || alertes.length === 0) && (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 space-y-2">
                <AlertCircle size={32} className="opacity-20" />
                <p className="text-sm italic">Aucune alerte</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAlerte && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Détails de l'alerte</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedAlerte.importance === 'high' ? "bg-red-100 text-red-600" :
                  selectedAlerte.importance === 'medium' ? "bg-amber-100 text-amber-600" :
                  "bg-blue-100 text-blue-600"
                )}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedAlerte.titre}</h3>
                  <p className="text-sm text-slate-500">Importance: {selectedAlerte.importance.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedAlerte.description}</p>
              </div>

              <button 
                onClick={() => setShowDetailModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerte Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingAlerte ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</h2>
              <button onClick={() => setShowAlertModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAlerteSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Titre</label>
                <input 
                  type="text"
                  required
                  value={alerteForm.titre}
                  onChange={e => setAlerteForm({...alerteForm, titre: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Retard de paiement"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  required
                  value={alerteForm.description}
                  onChange={e => setAlerteForm({...alerteForm, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                  placeholder="Détails de l'alerte..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Importance</label>
                <select 
                  value={alerteForm.importance}
                  onChange={e => setAlerteForm({...alerteForm, importance: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="normal">Normale (Bleu)</option>
                  <option value="medium">Moyenne (Orange)</option>
                  <option value="high">Haute (Rouge)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingAlerte ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", color)}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-xl font-bold text-slate-900">{value}</h4>
          <span className={cn("text-xs font-medium flex items-center", trendUp ? "text-primary-600" : "text-red-600")}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ type, title, desc, isManual, onViewDetails, onEdit, onDelete }: any) {
  const colors = {
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    info: "bg-blue-50 text-blue-700 border-blue-100",
    error: "bg-red-50 text-red-700 border-red-100"
  };
  return (
    <div className={cn("p-4 rounded-xl border flex flex-col gap-3 group relative", colors[type as keyof typeof colors])}>
      <div className="flex gap-3">
        <AlertCircle size={20} className="shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs opacity-80 line-clamp-2">{desc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <button 
          onClick={onViewDetails}
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/50 rounded-lg hover:bg-white transition-colors"
        >
          Voir détails
        </button>
        {isManual && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
               <button onClick={onEdit} className="p-1 hover:bg-white/50 rounded text-slate-600">
                <Plus size={14} className="rotate-45" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1 hover:bg-white/50 rounded text-red-600">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
