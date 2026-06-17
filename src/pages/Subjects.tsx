import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, BookOpen, Hash, Trash2, X, Search, ChevronDown, Edit2, Check, Loader2 } from 'lucide-react';

const SUGGESTED_SUBJECTS = [
  {
    category: "Littéraires",
    subjects: [
      "Français", 
      "Communication écrite", 
      "Lecture", 
      "Anglais", 
      "Espagnol", 
      "Allemand", 
      "Histoire-Géographie", 
      "Philosophie", 
      "Littérature", 
      "Latin", 
      "Grec"
    ]
  },
  {
    category: "Scientifiques",
    subjects: ["Mathématiques", "Physique Chimie et Technologie (PCT)", "Science de la Vie et de la Terre (SVT)", "Informatique", "Sciences de l'Ingénieur", "Technologie"]
  },
  {
    category: "Techniques",
    subjects: ["Comptabilité", "Économie", "Gestion", "Dessin Technique", "Mécanique", "Électricité", "Construction"]
  },
  {
    category: "Artistiques & Sportives",
    subjects: ["EPS", "Arts Plastiques", "Musique", "Théâtre", "Danse"]
  },
  {
    category: "Autres",
    subjects: ["ECM", "Religion", "Couture", "Cuisine"]
  }
];

export default function Subjects() {
  const { confirm } = useConfirm();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/matieres' : p.path === '/matieres'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [matieres, setMatieres] = React.useState([]);
  const [showModal, setShowModal] = React.useState(false);
  const [editingMatiere, setEditingMatiere] = React.useState<any>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isCustomCategory, setIsCustomCategory] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nom: '',
    categorie: '',
    coefficient: 1,
    parent_id: ''
  });

  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = React.useMemo(() => {
    const searchTerm = formData.nom.toLowerCase();
    
    return SUGGESTED_SUBJECTS.map(cat => ({
      ...cat,
      subjects: cat.subjects.filter(s => 
        s.toLowerCase().includes(searchTerm)
      )
    })).filter(cat => cat.subjects.length > 0);
  }, [formData.nom]);

  const [selectedSuggestions, setSelectedSuggestions] = React.useState<{subject: string, category: string}[]>([]);

  const toggleSuggestion = (subject: string, category: string) => {
    setSelectedSuggestions(prev => {
      const exists = prev.find(s => s.subject === subject && s.category === category);
      if (exists) {
        return prev.filter(s => !(s.subject === subject && s.category === category));
      }
      return [...prev, { subject, category }];
    });
  };

  const addSelectedSuggestions = () => {
    if (selectedSuggestions.length === 0) return;
    
    setLoading(true);
    Promise.all(selectedSuggestions.map(s => 
      apiFetch('/api/matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: s.subject, categorie: s.category, coefficient: 1 })
      })
    )).then(() => {
      setSelectedSuggestions([]);
      setShowSuggestions(false);
      fetchMatieres();
      setLoading(false);
    });
  };

  const selectSuggestion = (subject: string, category: string) => {
    setFormData({ ...formData, nom: subject, categorie: category });
    setIsCustomCategory(false);
    setShowSuggestions(false);
  };

  // Auto-set category if name matches a suggestion
  React.useEffect(() => {
    if (isCustomCategory) return;
    
    const matched = SUGGESTED_SUBJECTS.find(cat => 
      cat.subjects.some(s => s.toLowerCase() === formData.nom.toLowerCase())
    );
    
    if (matched && formData.categorie !== matched.category) {
      setFormData(prev => ({ ...prev, categorie: matched.category }));
    }
  }, [formData.nom, isCustomCategory]);

  const [expandedParents, setExpandedParents] = React.useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedParents(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const fetchMatieres = () => {
    apiFetch('/api/matieres').then(res => res.json()).then(setMatieres);
  };

  React.useEffect(() => {
    fetchMatieres();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingMatiere ? `/api/matieres/${editingMatiere.id}` : '/api/matieres';
    const method = editingMatiere ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => {
      setShowModal(false);
      setEditingMatiere(null);
      fetchMatieres();
      setFormData({ nom: '', categorie: '', coefficient: 1, parent_id: '' });
      setIsCustomCategory(false);
    });
  };

  const handleEdit = (m: any) => {
    setEditingMatiere(m);
    setFormData({ 
      nom: m.nom ?? '', 
      categorie: m.categorie ?? '', 
      coefficient: m.coefficient ?? 1,
      parent_id: m.parent_id ?? ''
    });
    setIsCustomCategory(!SUGGESTED_SUBJECTS.some(cat => cat.category === m.categorie));
    setShowModal(true);
  };

  const handleDelete = async (id: number, nom: string) => {
    const ok = await confirm({
      title: 'Supprimer la matière',
      message: `Voulez-vous vraiment supprimer la matière "${nom}" ? Cette action peut affecter les classes et les enseignants qui y sont rattachés.`,
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      apiFetch(`/api/matieres/${id}`, { method: 'DELETE' })
        .then(async res => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erreur lors de la suppression");
          }
          return res.json();
        })
        .then(() => fetchMatieres())
        .catch(err => alert(err.message));
    }
  };

  const groupedMatieres = React.useMemo(() => {
    const matieresArray = Array.isArray(matieres) ? matieres : [];
    const parents = matieresArray.filter((m: any) => !m.parent_id);
    const children = matieresArray.filter((m: any) => m.parent_id);
    
    return parents.map(p => {
      const subSubjects = children.filter((c: any) => c.parent_id === p.id);
      const subNames = subSubjects.map((s: any) => s.nom).join(' & ');
      return {
        ...p,
        displayName: subNames ? `${p.nom} (${subNames})` : p.nom,
        subSubjects
      };
    });
  }, [matieres]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Matières</h1>
          <p className="text-slate-500">Définissez les matières enseignées dans votre établissement.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            Ajouter une matière
          </button>
        )}
      </div>

      <div className="space-y-6">
        {groupedMatieres.map((parent: any) => (
          <div key={parent.id} className="space-y-3">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{parent.nom}</h3>
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Principale
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {parent.categorie && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {parent.categorie}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Hash size={12} />
                      Coef: {parent.coefficient}
                    </span>
                    {parent.subSubjects.length > 0 && (
                      <span className="text-primary-600 font-medium">
                        {parent.subSubjects.length} sous-matière(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {canWrite && (
                <div className="flex items-center gap-2">
                  {parent.subSubjects.length > 0 && (
                    <button 
                      onClick={() => toggleExpand(parent.id)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    >
                      <ChevronDown size={18} className={`transition-transform ${expandedParents.includes(parent.id) ? 'rotate-180' : ''}`} />
                      {expandedParents.includes(parent.id) ? 'Masquer' : 'Voir'} les sous-matières
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setFormData({ ...formData, parent_id: parent.id.toString(), categorie: parent.categorie });
                      setShowModal(true);
                    }}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    title="Ajouter une sous-matière"
                  >
                    <Plus size={16} />
                    Sous-matière
                  </button>
                  <button 
                    onClick={() => handleEdit(parent)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(parent.id, parent.nom)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {parent.subSubjects.length > 0 && expandedParents.includes(parent.id) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-12 animate-in slide-in-from-top-2 duration-200">
                {parent.subSubjects.map((child: any) => (
                  <div key={child.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-100">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-700">{child.nom}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Hash size={10} />
                            Coef: {child.coefficient}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(child)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(child.id, child.nom)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {matieres.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400">Aucune matière enregistrée.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingMatiere ? 'Modifier la Matière' : 'Nouvelle Matière'}</h2>
              <button onClick={() => { setShowModal(false); setEditingMatiere(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catégorie</label>
                <select 
                  value={isCustomCategory ? 'Autre' : formData.categorie}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Autre') {
                      setIsCustomCategory(true);
                      setFormData({ ...formData, categorie: '' });
                    } else {
                      setIsCustomCategory(false);
                      setFormData({ ...formData, categorie: val });
                    }
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {SUGGESTED_SUBJECTS.map(cat => (
                    <option key={cat.category} value={cat.category}>{cat.category}</option>
                  ))}
                  <option value="Autre">Autre (Saisir manuellement)</option>
                </select>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-700">Nom de la matière</label>
                <div className="relative">
                  <input 
                    required
                    autoComplete="off"
                    value={formData.nom}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    placeholder="ex: Mathématiques"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </div>
                </div>

                {showSuggestions && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-96 overflow-y-auto"
                  >
                    <div className="p-3 border-b bg-slate-50 sticky top-0 z-10 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suggestions par catégorie</span>
                      {selectedSuggestions.length > 0 && (
                        <button 
                          type="button"
                          onClick={addSelectedSuggestions}
                          disabled={loading}
                          className="bg-primary-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-700 transition-all flex items-center gap-2"
                        >
                          {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Ajouter ({selectedSuggestions.length})
                        </button>
                      )}
                    </div>
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((cat) => (
                        <div key={cat.category} className="border-b last:border-none border-slate-50">
                          <div className="px-4 py-2 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            {cat.category}
                            <button 
                              type="button"
                              onClick={() => {
                                const allInCat = cat.subjects.map(s => ({ subject: s, category: cat.category }));
                                setSelectedSuggestions(prev => {
                                  const otherCats = prev.filter(p => p.category !== cat.category);
                                  const alreadyAll = cat.subjects.every(s => prev.some(p => p.subject === s && p.category === cat.category));
                                  return alreadyAll ? otherCats : [...otherCats, ...allInCat];
                                });
                              }}
                              className="text-[10px] text-primary-600 hover:text-primary-700 font-bold"
                            >
                              {cat.subjects.every(s => selectedSuggestions.some(p => p.subject === s && p.category === cat.category)) 
                                ? 'Tout décocher' 
                                : 'Tout cocher'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-1 p-1">
                            {cat.subjects.map((s) => {
                              const isSelected = selectedSuggestions.some(p => p.subject === s && p.category === cat.category);
                              return (
                                <div
                                  key={s}
                                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                    isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                  onClick={() => toggleSuggestion(s, cat.category)}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-primary-600 border-primary-600 text-white' 
                                      : 'border-slate-200 bg-white group-hover:border-primary-300'
                                  }`}>
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                  </div>
                                  <span className="text-sm font-medium flex-1">{s}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-400 italic">
                        <Search size={24} className="mx-auto mb-2 opacity-20" />
                        Aucune suggestion trouvée.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isCustomCategory && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-medium text-slate-700">Nom de la catégorie personnalisée</label>
                  <input 
                    required
                    value={formData.categorie}
                    onChange={e => setFormData({...formData, categorie: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    placeholder="ex: Artistique"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Coefficient</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={formData.coefficient}
                  onChange={e => setFormData({...formData, coefficient: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matière Parente (Optionnel)</label>
                <select 
                  value={formData.parent_id}
                  onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Aucune (Matière indépendante)</option>
                  {matieres
                    .filter(m => !m.parent_id && m.id !== editingMatiere?.id)
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))
                  }
                </select>
                <p className="text-[10px] text-slate-400 italic">
                  Utilisez ceci pour regrouper des matières (ex: Français regroupant Lecture et Communication écrite)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingMatiere(null); }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingMatiere ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

