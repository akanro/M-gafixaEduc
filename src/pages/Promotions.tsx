import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  ArrowRightCircle, 
  Users, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ChevronRight,
  UserCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatClassName } from '../utils/format';

export default function Promotions() {
  const [annees, setAnnees] = React.useState<any[]>([]);
  const [activeYear, setActiveYear] = React.useState<any>(null);
  
  const [sourceYearId, setSourceYearId] = React.useState<string>('');
  const [sourceClasseId, setSourceClasseId] = React.useState<string>('');
  const [targetYearId, setTargetYearId] = React.useState<string>('');
  const [targetClasseId, setTargetClasseId] = React.useState<string>('');
  
  const [sourceClasses, setSourceClasses] = React.useState<any[]>([]);
  const [targetClasses, setTargetClasses] = React.useState<any[]>([]);
  const [eleves, setEleves] = React.useState<any[]>([]);
  const [selectedEleveIds, setSelectedEleveIds] = React.useState<number[]>([]);
  
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = React.useState<'manual' | 'auto'>('manual');
  const [autoSuggestions, setAutoSuggestions] = React.useState<any[]>([]);
  const [autoLoading, setAutoLoading] = React.useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/promotions' : p.path === '/promotions'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  React.useEffect(() => {
    apiFetch('/api/annees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnees(data);
          const active = data.find((a: any) => a.est_active_effective);
          if (active) {
            setActiveYear(active);
            setTargetYearId(active.id.toString());
            // Default source to previous year if exists
            const activeIndex = data.findIndex((a: any) => a.id === active.id);
            if (activeIndex < data.length - 1) {
              setSourceYearId(data[activeIndex + 1].id.toString());
            } else {
              setSourceYearId(active.id.toString());
            }
          }
        } else {
          setAnnees([]);
        }
      })
      .catch(() => setAnnees([]));
  }, []);

  React.useEffect(() => {
    if (sourceYearId) {
      apiFetch(`/api/classes?annee_id=${sourceYearId}`)
        .then(res => res.json())
        .then(data => setSourceClasses(Array.isArray(data) ? data : []))
        .catch(() => setSourceClasses([]));
    }
  }, [sourceYearId]);

  React.useEffect(() => {
    if (targetYearId) {
      apiFetch(`/api/classes?annee_id=${targetYearId}`)
        .then(res => res.json())
        .then(data => setTargetClasses(Array.isArray(data) ? data : []))
        .catch(() => setTargetClasses([]));
    }
  }, [targetYearId]);

  React.useEffect(() => {
    if (sourceClasseId) {
      apiFetch(`/api/eleves/by-year/${sourceYearId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data
              .filter((e: any) => e.classe_id.toString() === sourceClasseId)
              .sort((a: any, b: any) => (b.moyenne || 0) - (a.moyenne || 0));
            setEleves(filtered);
            setSelectedEleveIds(filtered.map((e: any) => e.id));
            
            // Auto-match target class
            const sourceClasse = sourceClasses.find(c => c.id.toString() === sourceClasseId);
            if (sourceClasse) {
              const sequence = [
                'Petite Section', 'Moyenne Section', 'Grande Section',
                'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
                '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'
              ];
              const currentIndex = sequence.findIndex(level => sourceClasse.nom.startsWith(level));
              if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
                const nextLevel = sequence[currentIndex + 1];
                // Find a class that starts with nextLevel, preferably with the same suffix (e.g. "A")
                const suffix = sourceClasse.nom.replace(sequence[currentIndex], '').trim();
                const match = targetClasses.find(c => c.nom.startsWith(nextLevel) && (suffix ? c.nom.endsWith(suffix) : true)) 
                            || targetClasses.find(c => c.nom.startsWith(nextLevel));
                if (match) {
                  setTargetClasseId(match.id.toString());
                }
              }
            }
          } else {
            setEleves([]);
            setSelectedEleveIds([]);
          }
        })
        .catch(() => {
          setEleves([]);
          setSelectedEleveIds([]);
        });
    } else {
      setEleves([]);
      setSelectedEleveIds([]);
    }
  }, [sourceClasseId, sourceYearId, sourceClasses, targetClasses]);

  const handleToggleSelect = (id: number) => {
    setSelectedEleveIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedEleveIds.length === eleves.length) {
      setSelectedEleveIds([]);
    } else {
      setSelectedEleveIds(eleves.map(e => e.id));
    }
  };

  const handleSelectAdmitted = () => {
    const admittedIds = eleves
      .filter(e => (e.moyenne || 0) >= 10)
      .map(e => e.id);
    setSelectedEleveIds(admittedIds);
    showToast(`${admittedIds.length} élèves admis sélectionnés`);
  };

  const handlePromote = () => {
    if (selectedEleveIds.length === 0) {
      showToast("Veuillez sélectionner au moins un élève", "error");
      return;
    }
    if (!targetClasseId) {
      showToast("Veuillez sélectionner une classe de destination", "error");
      return;
    }

    setLoading(true);
    apiFetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eleve_ids: selectedEleveIds,
        target_classe_id: parseInt(targetClasseId)
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`${data.count} élèves promus avec succès`);
          // Refresh list
          setEleves(prev => prev.filter(e => !selectedEleveIds.includes(e.id)));
          setSelectedEleveIds([]);
        } else {
          throw new Error(data.error || "Erreur lors de la promotion");
        }
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  };

  const handleAutoMatch = () => {
    if (!sourceClasseId) return;
    const sourceClasse = sourceClasses.find(c => c.id.toString() === sourceClasseId);
    if (!sourceClasse) return;

    // Define level sequence
    const sequence = [
      'Petite Section', 'Moyenne Section', 'Grande Section',
      'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
      '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'
    ];

    const currentIndex = sequence.indexOf(sourceClasse.nom);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      const nextLevel = sequence[currentIndex + 1];
      const match = targetClasses.find(c => c.nom === nextLevel);
      if (match) {
        setTargetClasseId(match.id.toString());
        showToast(`Classe suivante suggérée : ${match.nom}`);
        return;
      }
    }

    // Fallback: same name
    const sameName = targetClasses.find(c => c.nom === sourceClasse.nom);
    if (sameName) {
      setTargetClasseId(sameName.id.toString());
      showToast(`Même classe suggérée : ${sameName.nom}`);
    } else {
      showToast("Aucune correspondance automatique trouvée", "error");
    }
  };

  const fetchAutoPreview = () => {
    if (!sourceYearId || !targetYearId) {
      showToast("Veuillez sélectionner les années source et destination", "error");
      return;
    }
    setAutoLoading(true);
    apiFetch(`/api/promotions/automatique/preview?source_year_id=${sourceYearId}&target_year_id=${targetYearId}`)
      .then(res => res.json())
      .then(data => setAutoSuggestions(data))
      .catch(err => showToast(err.message, "error"))
      .finally(() => setAutoLoading(false));
  };

  const executeAutoPromotion = () => {
    if (autoSuggestions.length === 0) return;
    
    setLoading(true);
    apiFetch('/api/promotions/automatique/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions: autoSuggestions })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`${data.count} élèves promus automatiquement`);
          setAutoSuggestions([]);
        } else {
          throw new Error(data.error);
        }
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8 relative pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Promotions</h1>
          <p className="text-slate-500">Transférez les élèves d'une classe à une autre pour la nouvelle année.</p>
        </div>
        <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl border border-primary-100">
          <Calendar size={18} className="text-primary-600" />
          <span className="text-sm font-bold text-primary-700">Année Active : {activeYear?.libelle}</span>
        </div>
      </header>

      <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Promotion Manuelle
        </button>
        <button 
          onClick={() => setActiveTab('auto')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'auto' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Promotion Automatique
        </button>
      </div>

      {activeTab === 'manual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Source Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Source (Départ)
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Année Scolaire</label>
                  <select 
                    value={sourceYearId}
                    onChange={e => setSourceYearId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une année</option>
                    {annees.map(a => (
                      <option key={a.id} value={a.id}>{a.libelle} {a.archivee ? '(Archivée)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Classe</label>
                  <select 
                    value={sourceClasseId}
                    onChange={e => setSourceClasseId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!sourceYearId}
                  >
                    <option value="">Sélectionner une classe</option>
                    {sourceClasses.map(c => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)} ({c.niveau})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightCircle size={20} className="text-primary-600" />
                Destination (Arrivée)
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Année Scolaire</label>
                  <select 
                    value={targetYearId}
                    onChange={e => setTargetYearId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {annees.map(a => (
                      <option key={a.id} value={a.id}>{a.libelle} {a.est_active_effective ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">Classe</label>
                    <button 
                      onClick={handleAutoMatch}
                      disabled={!sourceClasseId}
                      className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      <Zap size={10} /> Correspondance Auto
                    </button>
                  </div>
                  <select 
                    value={targetClasseId}
                    onChange={e => setTargetClasseId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={!targetYearId}
                  >
                    <option value="">Sélectionner une classe</option>
                    {targetClasses.map(c => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)} ({c.niveau})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {canWrite && (
              <button 
                onClick={handlePromote}
                disabled={loading || selectedEleveIds.length === 0 || !targetClasseId}
                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserCheck size={20} />
                    Promouvoir {selectedEleveIds.length} élève(s)
                  </>
                )}
              </button>
            )}
          </div>

          {/* Student Selection List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap size={20} className="text-slate-600" />
                Liste des élèves éligibles
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {eleves.length} au total
                </span>
              </h2>
              {eleves.length > 0 && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleSelectAdmitted}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <UserCheck size={16} />
                    Sélectionner admis (≥ 10)
                  </button>
                  <button 
                    onClick={handleSelectAll}
                    className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors"
                  >
                    {selectedEleveIds.length === eleves.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
              {!sourceClasseId ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Search size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Aucune classe sélectionnée</p>
                    <p className="text-sm text-slate-500">Choisissez une année et une classe source pour voir les élèves.</p>
                  </div>
                </div>
              ) : eleves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-300">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Tous les élèves ont été promus</p>
                    <p className="text-sm text-slate-500">Il n'y a plus d'élèves dans cette classe pour cette année.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {eleves.map((eleve) => (
                    <div 
                      key={eleve.id}
                      onClick={() => handleToggleSelect(eleve.id)}
                      className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                        selectedEleveIds.includes(eleve.id) ? 'bg-primary-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedEleveIds.includes(eleve.id) 
                          ? 'bg-primary-600 border-primary-600 text-white' 
                          : 'border-slate-200 bg-white'
                      }`}>
                        {selectedEleveIds.includes(eleve.id) && <CheckCircle2 size={14} />}
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                        {eleve.photo ? (
                          <img src={eleve.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          eleve.nom.charAt(0)
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{eleve.nom} {eleve.prenom}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-slate-500">Matricule: {eleve.matricule}</p>
                          {eleve.moyenne !== null && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              eleve.moyenne >= 10 ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                            }`}>
                              Moy: {eleve.moyenne.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                          {eleve.sexe === 'M' ? 'Garçon' : 'Fille'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-bold text-slate-700">Année Source (Année qui se termine)</label>
                <select 
                  value={sourceYearId}
                  onChange={e => setSourceYearId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner l'année source</option>
                  {annees.map(a => (
                    <option key={a.id} value={a.id}>{a.libelle} {a.archivee ? '(Archivée)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center pb-3">
                <ArrowRightCircle size={24} className="text-slate-300" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-bold text-slate-700">Année Destination (Nouvelle année)</label>
                <select 
                  value={targetYearId}
                  onChange={e => setTargetYearId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner l'année destination</option>
                  {annees.map(a => (
                    <option key={a.id} value={a.id}>{a.libelle} {a.est_active_effective ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={fetchAutoPreview}
                disabled={autoLoading || !sourceYearId || !targetYearId}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {autoLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap size={18} />}
                Générer l'aperçu
              </button>
            </div>

            {autoSuggestions.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-primary-900">{autoSuggestions.length} élèves analysés</p>
                      <p className="text-xs text-primary-700">
                        {autoSuggestions.filter(s => s.status === 'Passant').length} Passants • {autoSuggestions.filter(s => s.status === 'Redoublant').length} Redoublants
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={executeAutoPromotion}
                    disabled={loading}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 flex items-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={18} />}
                    Confirmer et Promouvoir
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Élève</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Moyenne</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Classe Actuelle</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Décision</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Classe Future</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {autoSuggestions.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{s.nom} {s.prenom}</p>
                            <p className="text-[10px] text-slate-400">{s.matricule}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-mono font-bold ${s.moyenne >= 10 ? 'text-primary-600' : 'text-red-600'}`}>
                              {s.moyenne?.toFixed(2) || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{formatClassName(s.source_classe_nom)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              s.status === 'Passant' ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${s.target_classe_id ? 'text-slate-900' : 'text-amber-600'}`}>
                                {formatClassName(s.target_classe_nom)}
                              </span>
                              {!s.target_classe_id && <AlertCircle size={14} className="text-amber-500" title="Classe non trouvée dans l'année de destination" />}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Important :</p>
          <p>La promotion déplace l'élève vers une nouvelle classe. Les notes et paiements de l'année précédente sont conservés dans l'historique du système, mais l'élève apparaîtra désormais dans sa nouvelle classe pour l'année active.</p>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-primary-900 border-primary-700 text-primary-50' 
                : 'bg-red-900 border-red-700 text-red-50'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} className="text-primary-400" /> : <AlertCircle size={20} className="text-red-400" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
