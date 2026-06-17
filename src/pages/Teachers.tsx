import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, Search, Mail, Phone, MapPin, MoreVertical, GraduationCap, BookOpen, Download, FileText, UserPlus, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Teachers() {
  const { confirm } = useConfirm();
  const [enseignants, setEnseignants] = React.useState([]);
  const [matieres, setMatieres] = React.useState([]);
  const [showModal, setShowModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterMatiere, setFilterMatiere] = React.useState('');
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importWorkbook, setImportWorkbook] = React.useState<any>(null);
  const [importSheetName, setImportSheetName] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<any>(null);
  const [teacherUser, setTeacherUser] = React.useState<any>(null);
  const [generatedCredentials, setGeneratedCredentials] = React.useState<any>(null);
  const excelInputRef = React.useRef<HTMLInputElement>(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/enseignants' : p.path === '/enseignants'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [formData, setFormData] = React.useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    matiere_id: ''
  });

  const fetchEnseignants = () => {
    apiFetch('/api/enseignants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEnseignants(data);
        } else {
          setEnseignants([]);
        }
      })
      .catch(() => setEnseignants([]));
  };

  const fetchMatieres = () => {
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMatieres(data);
        } else {
          setMatieres([]);
        }
      })
      .catch(() => setMatieres([]));
  };

  React.useEffect(() => {
    fetchEnseignants();
    fetchMatieres();
  }, []);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nom': 'DOE',
        'Prénom': 'John',
        'Téléphone': '90000000',
        'Email': 'john.doe@example.com',
        'Adresse': 'Lomé, Togo',
        'Matière': 'Mathématiques'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Enseignants");
    XLSX.writeFile(wb, "template_import_enseignants.xlsx");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTeacher ? `/api/enseignants/${editingTeacher.id}` : '/api/enseignants';
    const method = editingTeacher ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => {
      setShowModal(false);
      setEditingTeacher(null);
      fetchEnseignants();
      setFormData({ nom: '', prenom: '', telephone: '', email: '', adresse: '', matiere_id: '' });
    });
  };

  const handleEdit = (prof: any) => {
    setEditingTeacher(prof);
    setFormData({
      nom: prof.nom,
      prenom: prof.prenom,
      telephone: prof.telephone,
      email: prof.email,
      adresse: prof.adresse,
      matiere_id: prof.matiere_id
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer l\'enseignant',
      message: 'Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible et supprimera également ses affectations.',
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      apiFetch(`/api/enseignants/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchEnseignants();
          } else {
            alert(data.error || 'Erreur lors de la suppression');
          }
        })
        .catch(err => console.error('Delete error:', err));
    }
  };

  const mainMatieres = React.useMemo(() => {
    return (Array.isArray(matieres) ? matieres : []).filter((m: any) => !m.parent_id);
  }, [matieres]);

  const filteredEnseignants = enseignants.filter((prof: any) => {
    const matchesSearch = (prof.nom || '' + ' ' + prof.prenom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (prof.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMatiere = filterMatiere === '' || prof.matiere_id === parseInt(filterMatiere);
    return matchesSearch && matchesMatiere;
  }).sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

  return (
    <div className="space-y-6 relative">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-primary-400">
            <div className="p-2 bg-primary-500 rounded-full">
              <UserPlus size={24} />
            </div>
            <span className="font-bold text-lg">Enseignants importés avec succès</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Enseignants</h1>
          <p className="text-slate-500">Gérez le corps professoral et leurs affectations.</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <button 
                onClick={downloadTemplate}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Download size={20} />
                Template
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-100 transition-colors"
              >
                <FileText size={20} />
                Importer
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                Ajouter un enseignant
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un enseignant (nom, email...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-slate-400" />
          <select 
            value={filterMatiere}
            onChange={(e) => setFilterMatiere(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-slate-700 min-w-[200px]"
          >
            <option value="">Toutes les matières</option>
            {mainMatieres.map((m: any) => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEnseignants.map((prof: any) => (
          <div key={prof.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
            <button 
              onClick={() => {
                setSelectedTeacher(prof);
                apiFetch(`/api/users/enseignant/${prof.id}`).then(res => res.json()).then(setTeacherUser);
                setGeneratedCredentials(null);
                setShowDetailsModal(true);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <MoreVertical size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
                {prof.nom[0]}{prof.prenom[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{prof.nom} {prof.prenom}</h3>
                <p className="text-xs text-primary-600 font-medium uppercase tracking-wider">
                  {prof.matieres_noms || 'Enseignant'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span>{prof.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" />
                <span>{prof.telephone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-slate-400" />
                <span className="truncate">{prof.adresse}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <GraduationCap size={14} className="text-slate-400" />
                <span>0 Classes assignées</span>
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(prof)}
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(prof.id)}
                    className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Détails Enseignant</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-2xl">
                  {selectedTeacher.nom[0]}{selectedTeacher.prenom[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{selectedTeacher.nom} {selectedTeacher.prenom}</h3>
                  <p className="text-sm text-primary-600 font-medium">{selectedTeacher.matieres_noms}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <p><strong>Email:</strong> {selectedTeacher.email}</p>
                <p><strong>Téléphone:</strong> {selectedTeacher.telephone}</p>
                <p><strong>Adresse:</strong> {selectedTeacher.adresse}</p>
              </div>

              <div className="pt-4 border-t">
                {teacherUser || generatedCredentials ? (
                  <div className="bg-primary-50 p-4 rounded-xl space-y-2">
                    <p className="text-sm font-bold text-primary-900">Compte Enseignant</p>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border">
                      <span className="text-sm font-mono">{generatedCredentials?.username || teacherUser?.email}</span>
                      <button onClick={() => navigator.clipboard.writeText(generatedCredentials?.username || teacherUser?.email)} className="text-primary-600 hover:text-primary-700">Copier</button>
                    </div>
                    {generatedCredentials && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs">
                        <p className="font-bold mb-1">Compte créé avec succès !</p>
                        <p>Un email d'activation a été envoyé à l'enseignant avec un lien pour configurer son mot de passe.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      apiFetch('/api/users/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enseignant_id: selectedTeacher.id })
                      }).then(res => res.json()).then(setGeneratedCredentials);
                    }}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                  >
                    Générer compte enseignant
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingTeacher ? 'Modifier l\'enseignant' : 'Nouvel Enseignant'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {editingTeacher && (
                <div className="bg-primary-50 p-4 rounded-xl space-y-1">
                  <p className="text-sm font-medium text-primary-900">Identifiant (Email): {editingTeacher.email}</p>
                  <p className="text-xs text-primary-700">Mot de passe: Généré lors de la création</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom</label>
                  <input 
                    required
                    value={formData.nom}
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prénom</label>
                  <input 
                    required
                    value={formData.prenom}
                    onChange={e => setFormData({...formData, prenom: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email (Optionnel)</label>
                <input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  type="email" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <input 
                  required
                  value={formData.telephone}
                  onChange={e => setFormData({...formData, telephone: e.target.value})}
                  type="tel" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matière enseignée</label>
                <select 
                  required
                  value={formData.matiere_id}
                  onChange={e => setFormData({...formData, matiere_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une matière</option>
                  {mainMatieres.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Adresse</label>
                <textarea 
                  value={formData.adresse}
                  onChange={e => setFormData({...formData, adresse: e.target.value})}
                  rows={2} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Importer des enseignants</h2>
              <button onClick={() => {
                setShowImportModal(false);
                setImportWorkbook(null);
                setImportData([]);
                setImportErrors([]);
              }} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Upload Zone */}
              {!importWorkbook ? (
                <div className="border-2 border-dashed border-primary-300 bg-primary-50 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Glissez-déposez votre fichier Excel ici ou cliquez pour parcourir</p>
                  <input 
                    type="file" 
                    ref={excelInputRef}
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                    onChange={(e) => {
                      console.log("Teacher file input changed", e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Teacher file selected:", file.name, file.type, file.size);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            console.log("Teacher file read successfully");
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                            setImportWorkbook(workbook);
                            if (workbook.SheetNames.length > 0) {
                              setImportSheetName(workbook.SheetNames[0]);
                            }
                          } catch (err) {
                            console.error("Error reading teacher excel file:", err);
                            alert("Erreur lors de la lecture du fichier Excel. Assurez-vous qu'il s'agit d'un fichier valide.");
                          }
                        };
                        reader.onerror = (err) => {
                          console.error("Teacher FileReader error:", err);
                          alert("Erreur lors de la lecture du fichier.");
                        };
                        reader.readAsArrayBuffer(file);
                      }
                    }} 
                    className="sr-only" 
                    id="excel-upload-teacher"
                  />
                  <label 
                    htmlFor="excel-upload-teacher"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-700 transition-colors active:scale-95"
                  >
                    Choisir un fichier
                  </label>
                </div>
              ) : (
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Fichier chargé avec succès</span>
                  </div>
                  <button 
                    onClick={() => {
                      setImportWorkbook(null);
                      setImportData([]);
                      setImportErrors([]);
                    }}
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    Changer
                  </button>
                </div>
              )}
              
              {importWorkbook && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feuille Excel</label>
                    <select 
                      value={importSheetName}
                      onChange={(e) => setImportSheetName(e.target.value)} 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {importWorkbook.SheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={() => {
                      const sheet = importWorkbook.Sheets[importSheetName];
                      const data = XLSX.utils.sheet_to_json(sheet);
                      
                      const errors: string[] = [];
                      const mappedData = data.map((row: any, index: number) => {
                        const rowNum = index + 2;
                        
                        // Helper to find value regardless of case or accents in key
                        const getVal = (keys: string[]) => {
                          const foundKey = Object.keys(row).find(k => 
                            keys.some(key => k.toLowerCase().trim() === key.toLowerCase())
                          );
                          return foundKey ? String(row[foundKey]).trim() : '';
                        };

                        const nom = getVal(['nom', 'name', 'last name']);
                        const prenom = getVal(['prénom', 'prenom', 'first name']);
                        const telephone = getVal(['téléphone', 'telephone', 'phone', 'tel']);
                        const email = getVal(['email', 'e-mail', 'mail']);
                        const matiere_nom = getVal(['matière', 'matiere', 'subject']);

                        if (!nom) errors.push(`Ligne ${rowNum}: Nom manquant`);
                        if (!prenom) errors.push(`Ligne ${rowNum}: Prénom manquant`);
                        if (!telephone) errors.push(`Ligne ${rowNum}: Téléphone manquant`);
                        if (!email) errors.push(`Ligne ${rowNum}: Email manquant`);
                        if (!matiere_nom) errors.push(`Ligne ${rowNum}: Matière manquante`);

                        return {
                          nom,
                          prenom,
                          telephone,
                          email,
                          adresse: getVal(['adresse', 'address']) || '',
                          matiere_nom
                        };
                      });

                      setImportErrors(errors);
                      setImportData(mappedData);
                    }} 
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                  >
                    Afficher l'aperçu
                  </button>
                  
                  {importErrors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-sm font-bold text-red-600 mb-2">Informations manquantes :</p>
                      <ul className="text-xs text-red-500 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                        {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                      <p className="text-xs text-red-600 mt-2 font-medium italic">
                        Veuillez fournir toutes les informations indispensables (Nom, Prénom, Téléphone, Email, Matière) dans votre fichier Excel.
                      </p>
                    </div>
                  )}

                  {importData.length > 0 && importErrors.length === 0 && (
                    <div className="space-y-4">
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                            <tr>
                              <th className="px-3 py-2">Nom & Prénom</th>
                              <th className="px-3 py-2">Matière</th>
                              <th className="px-3 py-2">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {importData.slice(0, 5).map((row, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-slate-700 font-bold">{row.nom} {row.prenom}</td>
                                <td className="px-3 py-2 text-primary-600">{row.matiere_nom}</td>
                                <td className="px-3 py-2 text-slate-500">{row.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importData.length > 5 && (
                          <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-400 italic">
                            + {importData.length - 5} autres enseignants
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          apiFetch('/api/enseignants/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enseignants: importData })
                          })
                          .then(res => {
                            if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Erreur d'importation") });
                            return res.json();
                          })
                          .then((data) => {
                            setShowImportModal(false);
                            setImportWorkbook(null);
                            setImportData([]);
                            fetchEnseignants();
                            setShowSuccessBanner(true);
                            setTimeout(() => setShowSuccessBanner(false), 5000);
                            if (data.skipped > 0) {
                              alert(`${data.count} enseignants importés, ${data.skipped} déjà existants (ignorés).`);
                            }
                          })
                          .catch(err => {
                            console.error("Import error:", err);
                            alert("Erreur lors de l'importation: " + err.message);
                          });
                        }} 
                        className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
                      >
                        Confirmer l'importation ({importData.length} enseignants)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

