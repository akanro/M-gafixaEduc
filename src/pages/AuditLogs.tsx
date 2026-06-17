import { apiFetch } from '../utils/api';
import React from 'react';
import { History, Search, Filter, Calendar as CalendarIcon, User, Tag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: number;
  utilisateur_id: number;
  utilisateur_nom: string;
  action: string;
  entite_type: string;
  entite_id: number;
  details: string;
  date_activite: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterAction, setFilterAction] = React.useState('');
  const [filterEntity, setFilterEntity] = React.useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      
      const response = await apiFetch('/api/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Session expirée ou accès refusé.");
        }
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse du serveur n'est pas au format JSON.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        console.error('Expected array of logs, got:', data);
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.utilisateur_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entite_type || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === '' || log.action === filterAction;
    const matchesEntity = filterEntity === '' || log.entite_type === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDetails = (detailsStr: string) => {
    try {
      const details = JSON.parse(detailsStr);
      return Object.entries(details).map(([key, value]) => (
        <span key={key} className="inline-block mr-2 text-xs">
          <span className="font-semibold text-slate-500 uppercase">{key}:</span> {String(value)}
        </span>
      ));
    } catch (e) {
      return detailsStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="text-primary" />
            Journal d'Audit
          </h1>
          <p className="text-slate-500">Historique des actions effectuées sur la plateforme</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par utilisateur, détails..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <option value="">Toutes les actions</option>
                  <option value="CREATE">Création</option>
                  <option value="UPDATE">Modification</option>
                  <option value="DELETE">Suppression</option>
                  <option value="LOGIN">Connexion</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
              >
                <option value="">Toutes les entités</option>
                <option value="ELEVE">Élève</option>
                <option value="ENSEIGNANT">Enseignant</option>
                <option value="CLASSE">Classe</option>
                <option value="PAIEMENT">Paiement</option>
                <option value="ACTIVITE">Activité</option>
                <option value="USER">Utilisateur</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entité</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 text-sm">Chargement du journal...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Info size={48} strokeWidth={1} />
                      <p>Aucune activité trouvée</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarIcon size={14} className="text-slate-400" />
                        {format(new Date(log.date_activite), 'Pp', { locale: fr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {(log.utilisateur_nom || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{log.utilisateur_nom || 'Utilisateur inconnu'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                        getActionColor(log.action)
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-600">{log.entite_type}</span>
                      <span className="ml-2 text-xs text-slate-400">#{log.entite_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-md">
                        {formatDetails(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
