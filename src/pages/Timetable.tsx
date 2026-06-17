import { apiFetch } from '../utils/api';
import React from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Printer, Download, X as XIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatClassName } from '../utils/format';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = [
  '07h - 08h', '08h - 09h', '09h - 10h', '10h - 11h', '11h - 12h',
  '12h - 13h', '13h - 14h', '14h - 15h', '15h - 16h', '16h - 17h',
  '17h - 18h', '18h - 19h'
];

const HEURES_VALS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

import { useConfirm } from '../contexts/ConfirmContext';

export default function Timetable() {
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = React.useState([]);
  const [selectedClasse, setSelectedClasse] = React.useState(searchParams.get('classeId') || '');
  const [matieres, setMatieres] = React.useState([]);
  const [classMatieres, setClassMatieres] = React.useState([]);
  const [emplois, setEmplois] = React.useState([]);
  const [schoolConfig, setSchoolConfig] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [requestDescription, setRequestDescription] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState({
    classe_id: '',
    jour: '',
    heure_debut: '',
    heure_fin: '',
    matiere_id: ''
  });

  const pathPermission = user?.permissions?.find((p: any) => (typeof p === 'string' ? p === '/emplois-du-temps' : p.path === '/emplois-du-temps'));
  const canWrite = user && (['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true)));

  const fetchEmplois = (classeId: string) => {
    apiFetch(`/api/emplois/${classeId}`)
      .then(res => res.json())
      .then(data => setEmplois(Array.isArray(data) ? data : []))
      .catch(() => setEmplois([]));
  };

  React.useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(data => setMatieres(Array.isArray(data) ? data : []))
      .catch(() => setMatieres([]));
    apiFetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSchoolConfig(data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleRequest = () => {
    apiFetch('/api/timetable-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enseignant_id: user.enseignant_id, description: requestDescription })
    }).then(() => {
      setShowRequestModal(false);
      setRequestDescription('');
      alert("Demande envoyée.");
    });
  };

  React.useEffect(() => {
    if (selectedClasse) {
      fetchEmplois(selectedClasse);
      apiFetch(`/api/classes/${selectedClasse}/details`)
        .then(res => res.json())
        .then(data => setClassMatieres(data.matieres || []));
    } else {
      setClassMatieres([]);
    }
  }, [selectedClasse]);

  const checkConflict = (jour: string, debut: string, fin: string, excludeId?: number) => {
    const start = parseInt(debut.split('h')[0]);
    const end = parseInt(fin.split('h')[0]);

    return emplois.some((e: any) => {
      if (excludeId && e.id === excludeId) return false;
      if (e.jour !== jour) return false;

      const eStart = parseInt(e.heure_debut.split('h')[0]);
      const eEnd = parseInt(e.heure_fin.split('h')[0]);

      // Overlap check: (start < eEnd) && (end > eStart)
      return (start < eEnd) && (end > eStart);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (checkConflict(formData.jour, formData.heure_debut, formData.heure_fin, editingId || undefined)) {
      alert("Attention : Ce créneau horaire est déjà occupé par un autre cours !");
      return;
    }

    const url = editingId ? `/api/emplois/${editingId}` : '/api/emplois';
    const method = editingId ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, classe_id: selectedClasse })
    }).then(() => {
      setShowModal(false);
      setEditingId(null);
      fetchEmplois(selectedClasse);
      setFormData({
        classe_id: '', jour: '', heure_debut: '', heure_fin: '', matiere_id: ''
      });
    });
  };

  const handleEdit = (course: any) => {
    setEditingId(course.id);
    setFormData({
      classe_id: course.classe_id.toString(),
      jour: course.jour || '',
      heure_debut: course.heure_debut || '',
      heure_fin: course.heure_fin || '',
      matiere_id: course.matiere_id.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Supprimer le cours',
      message: 'Voulez-vous vraiment supprimer ce cours de l\'emploi du temps ?',
      type: 'danger'
    });
    if (isConfirmed) {
      apiFetch(`/api/emplois/${id}`, { method: 'DELETE' }).then(() => fetchEmplois(selectedClasse));
    }
  };

  const generatePDF = (autoPrint: boolean = false) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const classe = classes.find((c: any) => c.id.toString() === selectedClasse) as any;
    
    // School Info
    if (schoolConfig?.logo) {
      doc.addImage(schoolConfig.logo, 'PNG', 10, 10, 20, 20);
    }
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text(schoolConfig?.nom || "Établissement Scolaire", 35, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(schoolConfig?.slogan || "", 35, 23);
    doc.text(`${schoolConfig?.adresse || ""} | ${schoolConfig?.contacts || ""}`, 35, 28);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`EMPLOI DU TEMPS - ${classe?.nom || ""}`, 148, 45, { align: 'center' });

    const tableData: any[] = [];
    
    HEURES.forEach((heure, hIndex) => {
      const row: any[] = [{ content: heure, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }];
      
      JOURS.forEach(jour => {
        if (isHourCovered(jour, heure)) return;
        
        const course = getCourse(jour, heure);
        const span = getCourseSpan(jour, heure);
        
        if (course) {
          row.push({
            content: `${course.matiere_nom}\n(${course.enseignant_nom ? `${course.enseignant_nom} ${course.enseignant_prenom}` : 'Aucun prof'})\n${course.heure_debut} - ${course.heure_fin}`,
            rowSpan: span,
            styles: { fillColor: [209, 250, 229], textColor: [6, 78, 59] }
          });
        } else {
          row.push('');
        }
      });
      tableData.push(row);
    });

    autoTable(doc, {
      startY: 55,
      head: [['Heure', ...JOURS]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', overflow: 'linebreak' },
      styles: { 
        fontSize: 7, 
        cellPadding: 2, 
        halign: 'center', 
        valign: 'middle', 
        overflow: 'linebreak',
        cellWidth: 'auto',
        minCellHeight: 10
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 42 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 42 },
        5: { cellWidth: 42 },
        6: { cellWidth: 42 }
      }
    });

    if (autoPrint) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Emploi_du_temps_${classe?.nom || "classe"}.pdf`);
    }
  };

  const getCourse = (jour: string, heure: string) => {
    const [hStart] = heure.split(' - ');
    return emplois.find((e: any) => e.jour === jour && e.heure_debut === hStart);
  };

  const getCourseSpan = (jour: string, heure: string) => {
    const [hStart] = heure.split(' - ');
    const course = emplois.find((e: any) => e.jour === jour && e.heure_debut === hStart);
    if (!course) return 1;

    const start = parseInt(course.heure_debut.split('h')[0]);
    const end = parseInt(course.heure_fin.split('h')[0]);
    return end - start;
  };

  const isHourCovered = (jour: string, heure: string) => {
    const [hStart] = heure.split(' - ');
    const currentH = parseInt(hStart.split('h')[0]);

    return emplois.some((e: any) => {
      if (e.jour !== jour) return false;
      const eStart = parseInt(e.heure_debut.split('h')[0]);
      const eEnd = parseInt(e.heure_fin.split('h')[0]);
      return currentH > eStart && currentH < eEnd;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emploi du Temps</h1>
          <p className="text-slate-500">Planifiez les cours par classe et par jour.</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'enseignant' && (
            <button 
              onClick={() => setShowRequestModal(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors"
            >
              <Clock size={20} />
              Demander modification
            </button>
          )}
          {canWrite && (
            <button 
              onClick={() => setShowModal(true)}
              disabled={!selectedClasse}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Plus size={20} />
              Ajouter un cours
            </button>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Demander une modification</h2>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea 
                value={requestDescription}
                onChange={e => setRequestDescription(e.target.value)}
                className="w-full h-32 px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Décrivez les modifications souhaitées..."
              />
              <button 
                onClick={handleRequest}
                className="w-full px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <select 
              value={selectedClasse}
              onChange={e => setSelectedClasse(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => generatePDF(true)}
              disabled={!selectedClasse}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={16} />
              Imprimer
            </button>
            <button 
              onClick={() => generatePDF(false)}
              disabled={!selectedClasse}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              PDF
            </button>
          </div>
        </div>
      </div>

      {selectedClasse ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="p-4 bg-slate-50 border-b border-r text-slate-500 text-xs uppercase font-bold w-24">Heure</th>
                  {JOURS.map(jour => (
                    <th key={jour} className="p-4 bg-slate-50 border-b border-r text-slate-900 text-sm font-bold w-[15%]">
                      {jour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEURES.map(heure => (
                  <tr key={heure}>
                    <td className="p-4 border-b border-r bg-slate-50/50 text-xs font-bold text-slate-500 flex items-center gap-2">
                      <Clock size={14} />
                      {heure}
                    </td>
                    {JOURS.map(jour => {
                      if (isHourCovered(jour, heure)) return null;
                      
                      const course = getCourse(jour, heure);
                      const span = getCourseSpan(jour, heure);
                      
                      return (
                        <td 
                          key={`${jour}-${heure}`} 
                          rowSpan={span}
                          className={`p-2 border-b border-r group relative min-h-[80px] ${course ? 'bg-primary-50/30' : ''}`}
                        >
                          {course ? (
                            <div className="bg-primary-50 border border-primary-100 p-3 rounded-xl relative group/item h-full flex flex-col justify-center overflow-hidden">
                              <p className="text-xs font-black text-primary-900 leading-tight whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{course.matiere_nom}</p>
                              <p className="text-[10px] text-primary-600 font-medium mt-1 break-words">
                                {course.enseignant_nom ? `${course.enseignant_nom} ${course.enseignant_prenom}` : 'Aucun prof'}
                              </p>
                              <p className="text-[9px] text-primary-400 mt-1 font-bold">
                                {course.heure_debut} - {course.heure_fin}
                              </p>
                              {canWrite && (
                                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                                  <button 
                                    onClick={() => handleEdit(course)}
                                    className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                  >
                                    <Plus size={12} className="rotate-45" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(course.id)}
                                    className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                if (!canWrite) return;
                                const [start, end] = heure.split(' - ');
                                setFormData({ ...formData, jour, heure_debut: start, heure_fin: end });
                                setShowModal(true);
                              }}
                              className={`h-full min-h-[60px] rounded-lg border border-dashed border-slate-100 flex items-center justify-center transition-colors ${canWrite ? 'group-hover:bg-slate-50 cursor-pointer' : ''}`}
                            >
                              {canWrite && <Plus size={16} className="text-slate-200 group-hover:text-primary-400" />}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <CalendarIcon size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400">Sélectionnez une classe pour afficher son emploi du temps.</p>
        </div>
      )}
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Modifier le cours' : 'Ajouter un cours'}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Jour</label>
                <select 
                  required
                  value={formData.jour}
                  onChange={e => setFormData({...formData, jour: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un jour</option>
                  {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heure Début</label>
                  <select 
                    required
                    value={formData.heure_debut}
                    onChange={e => setFormData({...formData, heure_debut: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Début</option>
                    {HEURES.map(h => h.split(' - ')[0]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heure Fin</label>
                  <select 
                    required
                    value={formData.heure_fin}
                    onChange={e => setFormData({...formData, heure_fin: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Fin</option>
                    {HEURES.map(h => h.split(' - ')[1]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matière</label>
                <select 
                  required
                  value={formData.matiere_id}
                  onChange={e => setFormData({...formData, matiere_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une matière</option>
                  {classMatieres.map((m: any) => <option key={m.matiere_id} value={m.matiere_id}>{m.matiere_nom}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
