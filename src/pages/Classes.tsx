import { apiFetch } from '../utils/api';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, Search, BookOpen, User, Trash2, Edit2, GraduationCap, X, ChevronLeft, Calendar, Printer, FileText, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NIVEAU_TYPES = ["Maternelle", "Primaire", "Secondaire"];

const CLASSES_BY_NIVEAU: Record<string, string[]> = {
  "Maternelle": ["Maternelle I", "Maternelle II"],
  "Primaire": ["CI", "CP", "CE1", "CE2", "CM1", "CM2"],
  "Premier Cycle": ["6ème", "5ème", "4ème", "3ème"],
  "Second Cycle": ["2nd", "1ère", "Tle"],
  "Technique": ["1ère Technique", "Tle Technique"]
};

const CYCLES_SECONDAIRE = ["Premier Cycle", "Second Cycle"];
const CLASSES_PREMIER_CYCLE = CLASSES_BY_NIVEAU["Premier Cycle"];
const CLASSES_SECOND_CYCLE = CLASSES_BY_NIVEAU["Second Cycle"];
const SERIES = ["A", "C", "D", "G"];

export default function Classes() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [classes, setClasses] = React.useState([]);
  const [view, setView] = React.useState<'main' | 'mat_primaire' | 'secondaire'>('main');
  const [showModal, setShowModal] = React.useState(false);
  const [allowedNiveaux, setAllowedNiveaux] = React.useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [showSeriesModal, setShowSeriesModal] = React.useState(false);
  const [seriesInput, setSeriesInput] = React.useState("");
  const [pendingGeneration, setPendingGeneration] = React.useState<{niveau: string, classList: string[]} | null>(null);
  const [editingClasse, setEditingClasse] = React.useState<any>(null);
  const [viewingClasse, setViewingClasse] = React.useState<any>(null);
  const [classeDetails, setClasseDetails] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState("eleves");
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/classes' : p.path === '/classes'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [allMatieres, setAllMatieres] = React.useState([]);
  const [allEnseignants, setAllEnseignants] = React.useState([]);
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null);

  const [assignData, setAssignData] = React.useState({
    matiere_id: '',
    matiere_ids: [] as number[],
    enseignant_id: '',
    heures_hebdo: 0,
    coefficient: 1,
    assignments: {} as Record<number, { enseignant_id: string, heures_hebdo: number, coefficient: number }>
  });

  const [teachersByMatiere, setTeachersByMatiere] = React.useState<Record<number, any[]>>({});

  const fetchTeachersForMatiere = (matiereId: number) => {
    if (teachersByMatiere[matiereId]) return;
    apiFetch(`/api/enseignants/par-matiere/${matiereId}`)
      .then(res => res.json())
      .then(data => {
        setTeachersByMatiere(prev => ({ ...prev, [matiereId]: data }));
      });
  };

  const handleToggleMatiere = (id: number) => {
    const matiere = allMatieres.find((m: any) => m.id === id);
    const isPremierCycle = viewingClasse?.niveau === "Premier Cycle" || CLASSES_BY_NIVEAU["Premier Cycle"].includes(viewingClasse?.niveau);
    
    setAssignData(prev => {
      const exists = prev.matiere_ids.includes(id);
      let newMatiereIds = [...prev.matiere_ids];
      let newAssignments = { ...prev.assignments };

      if (exists) {
        newMatiereIds = newMatiereIds.filter(i => i !== id);
        delete newAssignments[id];
        
        // If it's a parent subject, also remove children
        const children = allMatieres.filter((m: any) => m.parent_id === id);
        if (children.length > 0) {
          children.forEach((c: any) => {
            newMatiereIds = newMatiereIds.filter(i => i !== c.id);
            delete newAssignments[c.id];
          });
        }
      } else {
        newMatiereIds.push(id);
        newAssignments[id] = { enseignant_id: '', heures_hebdo: 0, coefficient: 1 };
        fetchTeachersForMatiere(id);
        
        // If it's a parent subject, also add children
        const children = allMatieres.filter((m: any) => m.parent_id === id);
        if (children.length > 0) {
          children.forEach((c: any) => {
            if (!newMatiereIds.includes(c.id)) {
              newMatiereIds.push(c.id);
              newAssignments[c.id] = { enseignant_id: '', heures_hebdo: 0, coefficient: 1 };
              fetchTeachersForMatiere(c.id);
            }
          });
        }
      }

      return {
        ...prev,
        matiere_ids: newMatiereIds,
        assignments: newAssignments
      };
    });
  };

  const matieresByCategory = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    allMatieres.forEach((m: any) => {
      const cat = m.categorie || "Autres";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [allMatieres]) as Record<string, any[]>;
  const [selectedClasse, setSelectedClasse] = React.useState("");
  const [selectedCycle, setSelectedCycle] = React.useState("");
  const [selectedSerie, setSelectedSerie] = React.useState("");
  const [niveauType, setNiveauType] = React.useState("");
  const [suffixe, setSuffixe] = React.useState("");
  const [sectionsInput, setSectionsInput] = React.useState("");
  const [selectedSections, setSelectedSections] = React.useState<{section: string, frais_scolarite: number, frais_inscription: number}[]>([]);

  const [formData, setFormData] = React.useState({
    nom: '',
    niveau: '',
    frais_scolarite: 0,
    frais_inscription: 0,
    tranche1_montant: 0,
    tranche1_date_limite: '',
    tranche2_montant: 0,
    tranche2_date_limite: '',
    tranche3_montant: 0,
    tranche3_date_limite: '',
    devise: 'FCFA',
    annee_id: 1
  });

  const filteredClasses = React.useMemo(() => {
    if (view === 'main') return [];
    
    return classes.filter((c: any) => {
      const niveau = c.niveau || "";
      const niveauLower = niveau.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (view === 'mat_primaire') {
        const isMatOrPrim = ["maternelle", "primaire"].some(n => niveauLower.includes(n));
        const isInMatList = CLASSES_BY_NIVEAU["Maternelle"].includes(niveau);
        const isInPrimList = CLASSES_BY_NIVEAU["Primaire"].includes(niveau);
        return isMatOrPrim || isInMatList || isInPrimList;
      } else if (view === 'secondaire') {
        const isSec = ["secondaire", "premier cycle", "second cycle", "technique"].some(n => niveauLower.includes(n));
        const isInPremCycle = CLASSES_BY_NIVEAU["Premier Cycle"].includes(niveau);
        const isInSecCycle = CLASSES_BY_NIVEAU["Second Cycle"].includes(niveau);
        const isInTech = CLASSES_BY_NIVEAU["Technique"].includes(niveau);
        return isSec || isInPremCycle || isInSecCycle || isInTech;
      }
      return false;
    });
  }, [classes, view]);

  const sortClasses = (a: any, b: any) => {
    const allNiveaux = [
      ...CLASSES_BY_NIVEAU["Maternelle"],
      ...CLASSES_BY_NIVEAU["Primaire"],
      ...CLASSES_BY_NIVEAU["Premier Cycle"],
      ...CLASSES_BY_NIVEAU["Second Cycle"],
      ...CLASSES_BY_NIVEAU["Technique"]
    ];
    
    const indexA = allNiveaux.findIndex(n => a.niveau === n || a.nom.includes(n));
    const indexB = allNiveaux.findIndex(n => b.niveau === n || b.nom.includes(n));
    
    if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
      return indexA - indexB;
    }
    
    return a.nom.localeCompare(b.nom);
  };

  const groupedClasses = React.useMemo(() => {
    if (view === 'main') return [];
    
    const groups: { title: string, classes: any[] }[] = [];
    
    if (view === 'mat_primaire') {
      groups.push({ 
        title: "Maternelle", 
        classes: filteredClasses.filter((c: any) => c.niveau.includes("Maternelle") || CLASSES_BY_NIVEAU["Maternelle"].includes(c.niveau)).sort(sortClasses) 
      });
      groups.push({ 
        title: "Primaire", 
        classes: filteredClasses.filter((c: any) => c.niveau.includes("Primaire") || CLASSES_BY_NIVEAU["Primaire"].includes(c.niveau)).sort(sortClasses) 
      });
    } else if (view === 'secondaire') {
      groups.push({ 
        title: "Premier Cycle", 
        classes: filteredClasses.filter((c: any) => c.niveau.includes("Premier Cycle") || CLASSES_BY_NIVEAU["Premier Cycle"].includes(c.niveau)).sort(sortClasses) 
      });
      
      // Group Second Cycle by series
      const secondCycleClasses = filteredClasses.filter((c: any) => c.niveau.includes("Second Cycle") || CLASSES_BY_NIVEAU["Second Cycle"].includes(c.niveau));
      const series = Array.from(new Set(secondCycleClasses.map((c: any) => c.nom.split(' ').pop()))).sort();
      series.forEach(s => {
          groups.push({ title: `Série ${s}`, classes: secondCycleClasses.filter((c: any) => c.nom.endsWith(s)).sort(sortClasses) });
      });
      
      groups.push({ 
        title: "Technique", 
        classes: filteredClasses.filter((c: any) => c.niveau.includes("Technique") || CLASSES_BY_NIVEAU["Technique"].includes(c.niveau)).sort(sortClasses) 
      });
    }

    return groups.filter(g => g.classes.length > 0);
  }, [filteredClasses, view]);

  const fetchClasses = () => {
    apiFetch('/api/classes')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement classes");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(err => {
        console.error("fetchClasses error:", err);
        setClasses([]);
      });
  };

  React.useEffect(() => {
    fetchClasses();
    apiFetch('/api/matieres')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement matières");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAllMatieres(data);
        } else {
          setAllMatieres([]);
        }
      })
      .catch(err => {
        console.error("fetchMatieres error:", err);
        setAllMatieres([]);
      });
    apiFetch('/api/enseignants')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement enseignants");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAllEnseignants(data);
        } else {
          setAllEnseignants([]);
        }
      })
      .catch(err => {
        console.error("fetchEnseignants error:", err);
        setAllEnseignants([]);
      });
  }, []);

  // Update final class name and level whenever selections change
  React.useEffect(() => {
    if (!niveauType && !selectedClasse && !selectedCycle && !selectedSerie && !suffixe) return;

    let finalNiveau = selectedClasse;
    if (niveauType === "Secondaire" && selectedCycle === "Second Cycle" && selectedSerie) {
      finalNiveau = `${selectedClasse} ${selectedSerie}`;
    }
    
    const finalNom = suffixe ? `${finalNiveau} ${suffixe}` : finalNiveau;
    
    setFormData(prev => ({
      ...prev,
      nom: finalNom || prev.nom,
      niveau: finalNiveau || prev.niveau
    }));
  }, [niveauType, selectedClasse, selectedCycle, selectedSerie, suffixe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClasse) {
        const res = await apiFetch(`/api/classes/${editingClasse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur lors de la modification");
        }
      } else {
        if (selectedSections.length > 0) {
          for (const s of selectedSections) {
            const nom = `${formData.niveau} ${s.section}`.trim();
            const res = await apiFetch('/api/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...formData, nom, niveau: formData.niveau, frais_scolarite: s.frais_scolarite, frais_inscription: s.frais_inscription })
            });
            if (!res.ok) {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la création");
              } else {
                const text = await res.text();
                console.error("Non-JSON error response:", text);
                throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
              }
            }
          }
        } else {
          const res = await apiFetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              throw new Error(data.error || "Erreur lors de la création");
            } else {
              const text = await res.text();
              console.error("Non-JSON error response:", text);
              throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
            }
          }
        }
      }
      
      setShowModal(false);
      fetchClasses();
      resetForm();
    } catch (err: any) {
      console.error("Submit error:", err);
      alert(err.message);
    }
  };

  const handleEdit = (c: any) => {
    setEditingClasse(c);
    
    // Parsing logic to pre-fill fields
    let foundNiveauType = "";
    let foundSelectedClasse = "";
    let foundSelectedCycle = "";
    let foundSelectedSerie = "";
    let foundSuffixe = "";

    const checkNiveau = (niveau: string) => {
      if (CLASSES_BY_NIVEAU["Maternelle"].includes(niveau)) return { type: "Maternelle", cycle: "" };
      if (CLASSES_BY_NIVEAU["Primaire"].includes(niveau)) return { type: "Primaire", cycle: "" };
      if (CLASSES_BY_NIVEAU["Premier Cycle"].includes(niveau)) return { type: "Secondaire", cycle: "Premier Cycle" };
      if (CLASSES_BY_NIVEAU["Second Cycle"].includes(niveau)) return { type: "Secondaire", cycle: "Second Cycle" };
      if (CLASSES_BY_NIVEAU["Technique"].includes(niveau)) return { type: "Technique", cycle: "" };
      return null;
    };

    const res = checkNiveau(c.niveau);
    if (res) {
      foundNiveauType = res.type;
      foundSelectedCycle = res.cycle;
      foundSelectedClasse = c.niveau;
    } else {
      // Try to split if it's Second Cycle with serie
      const parts = c.niveau.split(' ');
      if (parts.length > 1) {
        const base = parts[0];
        const serie = parts[1];
        const res2 = checkNiveau(base);
        if (res2 && res2.cycle === "Second Cycle") {
          foundNiveauType = res2.type;
          foundSelectedCycle = res2.cycle;
          foundSelectedClasse = base;
          foundSelectedSerie = serie;
        }
      }
    }

    // Extract suffixe from nom
    if (c.nom.startsWith(c.niveau)) {
      foundSuffixe = c.nom.replace(c.niveau, "").trim();
    }

    setNiveauType(foundNiveauType);
    setSelectedCycle(foundSelectedCycle);
    setSelectedClasse(foundSelectedClasse);
    setSelectedSerie(foundSelectedSerie);
    setSuffixe(foundSuffixe);

    setFormData({
      nom: c.nom ?? '',
      niveau: c.niveau ?? '',
      frais_scolarite: c.frais_scolarite ?? 0,
      frais_inscription: c.frais_inscription ?? 0,
      tranche1_montant: c.tranche1_montant ?? 0,
      tranche1_date_limite: c.tranche1_date_limite ?? '',
      tranche2_montant: c.tranche2_montant ?? 0,
      tranche2_date_limite: c.tranche2_date_limite ?? '',
      tranche3_montant: c.tranche3_montant ?? 0,
      tranche3_date_limite: c.tranche3_date_limite ?? '',
      devise: c.devise ?? 'FCFA',
      annee_id: c.annee_id ?? 1
    });
    
    setShowModal(true);
  };

  const fetchDetails = (id: number) => {
    apiFetch(`/api/classes/${id}/details`)
      .then(res => res.json())
      .then(setClasseDetails);
  };

  const handleOpen = (c: any) => {
    setViewingClasse(c);
    setClasseDetails(null);
    fetchDetails(c.id);
  };

  const handleAssignMatiere = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment && assignData.matiere_ids.length === 0) {
      alert("Veuillez sélectionner au moins une matière.");
      return;
    }

    const payload = editingAssignment ? {
      enseignant_id: assignData.enseignant_id,
      heures_hebdo: assignData.heures_hebdo,
      coefficient: assignData.coefficient
    } : {
      assignments: Object.entries(assignData.assignments).map(([mId, data]) => {
        const d = data as { enseignant_id: string, heures_hebdo: number, coefficient: number };
        return {
          matiere_id: parseInt(mId),
          enseignant_id: d.enseignant_id,
          heures_hebdo: d.heures_hebdo,
          coefficient: d.coefficient
        };
      })
    };

    const url = editingAssignment 
      ? `/api/classes/${viewingClasse.id}/matieres/${editingAssignment.matiere_id}` 
      : `/api/classes/${viewingClasse.id}/matieres`;
    const method = editingAssignment ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de l'assignation");
      }
      
      // If it's a parent subject, also update children
      if (editingAssignment) {
        const children = allMatieres.filter((m: any) => m.parent_id === editingAssignment.matiere_id);
        if (children.length > 0) {
          const childUpdates = children.map(child => {
            return apiFetch(`/api/classes/${viewingClasse.id}/matieres/${child.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          });
          await Promise.all(childUpdates);
        }
      }
      
      setShowAssignModal(false);
      setEditingAssignment(null);
      fetchDetails(viewingClasse.id);
      setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1, assignments: {} });
    }).catch(err => {
      alert(err.message);
    });
  };

  const handleEditAssignment = (m: any) => {
    setEditingAssignment(m);
    setAssignData({
      matiere_id: m.matiere_id,
      matiere_ids: [m.matiere_id],
      enseignant_id: m.enseignant_id || '',
      heures_hebdo: m.heures_hebdo || 0,
      coefficient: m.coefficient || 1,
      assignments: {
        [m.matiere_id]: {
          enseignant_id: m.enseignant_id || '',
          heures_hebdo: m.heures_hebdo || 0,
          coefficient: m.coefficient || 1
        }
      }
    });
    setShowAssignModal(true);
  };

  const handleDeleteAssignment = async (matiereId: number) => {
    const ok = await confirm({
      title: 'Retirer la matière',
      message: 'Voulez-vous vraiment retirer cette matière de la classe ?',
      confirmText: 'Retirer',
      type: 'danger'
    });

    if (ok) {
      await apiFetch(`/api/classes/${viewingClasse.id}/matieres/${matiereId}`, {
        method: 'DELETE'
      });

      // If it's a parent subject, also remove children
      const children = allMatieres.filter((m: any) => m.parent_id === matiereId);
      if (children.length > 0) {
        const childDeletes = children.map(child => {
          return apiFetch(`/api/classes/${viewingClasse.id}/matieres/${child.id}`, {
            method: 'DELETE'
          });
        });
        await Promise.all(childDeletes);
      }
      
      fetchDetails(viewingClasse.id);
    }
  };

  const handleExportPDF = () => {
    if (!classeDetails || !viewingClasse) return;
    
    const doc = new jsPDF();
    const title = `Liste des élèves - ${viewingClasse.nom}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Année scolaire: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 14, 30);
    
    const sortedEleves = [...classeDetails.eleves].sort((a, b) => a.nom.localeCompare(b.nom));
    
    const tableData = sortedEleves.map((e, index) => [
      index + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      e.sexe
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: '#10b981', textColor: '#ffffff' }
    });
    
    doc.save(`liste_eleves_${viewingClasse.nom.replace(/\s+/g, '_')}.pdf`);
  };

  const handlePrint = () => {
    if (!classeDetails || !viewingClasse) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const sortedEleves = [...classeDetails.eleves].sort((a, b) => a.nom.localeCompare(b.nom));
    
    const html = `
      <html>
        <head>
          <title>Liste des élèves - ${viewingClasse.nom}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header-info { margin-bottom: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>Liste des élèves - ${viewingClasse.nom}</h1>
            <p>Année scolaire: 2025-2026</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Matricule</th>
                <th>Nom & Prénoms</th>
                <th>Sexe</th>
              </tr>
            </thead>
            <tbody>
              ${sortedEleves.map((e, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${e.matricule}</td>
                  <td>${e.nom} ${e.prenom}</td>
                  <td>${e.sexe}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const resetForm = () => {
    setEditingClasse(null);
    setNiveauType("");
    setSelectedClasse("");
    setSelectedCycle("");
    setSelectedSerie("");
    setSuffixe("");
    setSectionsInput("");
    setSelectedSections([]);
    setFormData({ nom: '', niveau: '', frais_scolarite: 0, frais_inscription: 0, devise: 'FCFA', annee_id: 1 });
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer la classe',
      message: 'Voulez-vous vraiment supprimer cette classe ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      apiFetch(`/api/classes/${id}`, { method: 'DELETE' }).then(() => fetchClasses());
    }
  };

  const handleGenerateClasses = async (niveau: string, classList: string[]) => {
    const ok = await confirm({
      title: 'Générer des classes',
      message: `Voulez-vous vraiment générer les classes pour ${niveau} ?`,
      confirmText: 'Générer',
      type: 'info'
    });

    if (!ok) return;

    if (niveau === "Second Cycle") {
      setPendingGeneration({ niveau, classList });
      setShowSeriesModal(true);
      return;
    }

    await performGeneration(niveau, classList);
  };

  const performGeneration = async (niveau: string, classList: string[], serie?: string) => {
    try {
      for (const nom of classList) {
        const finalNom = serie ? `${nom} ${serie}` : nom;
        // Check if exists
        if (classes.some((c: any) => c.nom === finalNom)) continue;

        const res = await apiFetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: finalNom,
            niveau: nom,
            frais_scolarite: 0, // Default value 0
            frais_inscription: 0, // Default value 0
            devise: 'FCFA',
            annee_id: 1
          })
        });
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            throw new Error(data.error || "Erreur lors de la génération");
          } else {
            const text = await res.text();
            console.error("Non-JSON error response:", text);
            throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
          }
        }
      }
      fetchClasses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'main' ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Gestion des Classes</h1>
          <button onClick={() => setView('mat_primaire')} className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-lg transition-all text-center text-xl font-bold text-slate-900">
            Maternelle & Primaire
          </button>
          <button onClick={() => setView('secondaire')} className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-lg transition-all text-center text-xl font-bold text-slate-900">
            Secondaire
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('main')} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{view === 'mat_primaire' ? 'Maternelle & Primaire' : 'Secondaire'}</h1>
                <p className="text-slate-500">Gérez les classes de ce niveau.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canWrite && view === 'mat_primaire' && (
                <>
                  <button onClick={() => handleGenerateClasses("Maternelle", CLASSES_BY_NIVEAU["Maternelle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Maternelle</button>
                  <button onClick={() => handleGenerateClasses("Primaire", CLASSES_BY_NIVEAU["Primaire"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Primaire</button>
                </>
              )}
              {canWrite && view === 'secondaire' && (
                <>
                  <button onClick={() => handleGenerateClasses("Premier Cycle", CLASSES_BY_NIVEAU["Premier Cycle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">1er Cycle</button>
                  <button onClick={() => handleGenerateClasses("Second Cycle", CLASSES_BY_NIVEAU["Second Cycle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">2nd Cycle</button>
                  <button onClick={() => handleGenerateClasses("Technique", CLASSES_BY_NIVEAU["Technique"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Technique</button>
                </>
              )}
              {canWrite && (
                <button 
                  onClick={() => {
                    resetForm();
                    setAllowedNiveaux(view === 'mat_primaire' ? ["Maternelle", "Primaire"] : ["Secondaire"]);
                    setShowModal(true);
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
                >
                  <Plus size={20} />
                  Créer une classe
                </button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {groupedClasses.map((group) => (
              <div key={group.title} className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  {group.title}
                  <div className="h-px flex-1 bg-slate-100"></div>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.classes.map((c: any) => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                          <BookOpen size={20} />
                        </div>
                        <div className="flex gap-1">
                          {canWrite && (
                            <>
                              <button 
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Modifier les frais"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{c.nom}</h3>
                      <p className="text-sm text-slate-500 mb-2">{c.niveau}</p>
                      <div className="flex flex-col gap-1 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Scolarité</p>
                        <p className="text-xs font-bold text-primary-600">
                          {c.frais_scolarite?.toLocaleString()} {c.devise || 'FCFA'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Inscription</p>
                        <p className="text-xs font-bold text-blue-600">
                          {c.frais_inscription?.toLocaleString()} {c.devise || 'FCFA'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User size={14} className="text-slate-400" />
                          <span>{c.nombre_eleves || 0} Élèves</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <GraduationCap size={14} className="text-slate-400" />
                          <span>0 Profs</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => handleOpen(c)}
                          className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          Ouvrir la classe
                        </button>
                        <button 
                          onClick={() => navigate(`/emploi-du-temps?classeId=${c.id}`)}
                          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors"
                          title="Emploi du temps"
                        >
                          <Calendar size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredClasses.length === 0 && (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400">Aucune classe créée pour ce niveau.</p>
              </div>
            )}
          </div>
        </>
      )}


      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {editingClasse ? 'Modifier la Classe' : 'Nouvelle Classe'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 border-2 border-[#150f0f]">
              {/* 1: Niveau Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Niveau</label>
                <select 
                  required
                  value={niveauType}
                  onChange={e => {
                    setNiveauType(e.target.value);
                    setSelectedClasse("");
                    setSelectedCycle("");
                    setSelectedSerie("");
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un niveau</option>
                  {NIVEAU_TYPES.filter(n => allowedNiveaux.length === 0 || allowedNiveaux.includes(n)).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* 2: Cycle (if Secondaire) */}
              {niveauType === "Secondaire" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cycle</label>
                  <select 
                    required
                    value={selectedCycle}
                    onChange={e => {
                      setSelectedCycle(e.target.value);
                      setSelectedClasse("");
                      setSelectedSerie("");
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner le cycle</option>
                    {CYCLES_SECONDAIRE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* 3: Classe */}
              {((niveauType && niveauType !== "Secondaire") || (niveauType === "Secondaire" && selectedCycle)) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={selectedClasse}
                    onChange={e => setSelectedClasse(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner la classe</option>
                    {niveauType === "Maternelle" && CLASSES_BY_NIVEAU["Maternelle"].map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Primaire" && CLASSES_BY_NIVEAU["Primaire"].map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Secondaire" && selectedCycle === "Premier Cycle" && CLASSES_PREMIER_CYCLE.map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Secondaire" && selectedCycle === "Second Cycle" && CLASSES_SECOND_CYCLE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* 4: Série (if Second Cycle) */}
              {niveauType === "Secondaire" && selectedCycle === "Second Cycle" && selectedClasse && selectedClasse !== "2nd" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Série</label>
                  <select 
                    required
                    value={selectedSerie}
                    onChange={e => setSelectedSerie(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner la série</option>
                    {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* 5: Sections / Suffixe */}
              {selectedClasse && (
                <div className="space-y-2">
                  {editingClasse ? (
                    <>
                      <label className="text-sm font-medium text-slate-700">Suffixe / Section (ex: A, B, Rouge)</label>
                      <input 
                        type="text"
                        placeholder="Ex: A"
                        value={suffixe}
                        onChange={e => setSuffixe(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-slate-700">Sections (Séparées par des virgules, ex: A, B, C)</label>
                      <input 
                        type="text"
                        placeholder="Ex: A, B, C"
                        value={sectionsInput}
                        onChange={e => {
                            setSectionsInput(e.target.value);
                            const sections = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                            // Update selectedSections while keeping existing fees
                            const newSelectedSections = sections.map(s => {
                                const existing = selectedSections.find(x => x.section === s);
                                return existing ? existing : {section: s, frais_scolarite: formData.frais_scolarite, frais_inscription: formData.frais_inscription};
                            });
                            setSelectedSections(newSelectedSections);
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {selectedSections.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {selectedSections.map(s => (
                                <div key={s.section} className="grid grid-cols-3 gap-2 items-center">
                                    <span className="font-bold">{s.section}</span>
                                    <input type="number" value={s.frais_scolarite} onChange={e => setSelectedSections(selectedSections.map(x => x.section === s.section ? {...x, frais_scolarite: parseFloat(e.target.value)} : x))} className="px-2 py-1 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                                    <input type="number" value={s.frais_inscription} onChange={e => setSelectedSections(selectedSections.map(x => x.section === s.section ? {...x, frais_inscription: parseFloat(e.target.value)} : x))} className="px-2 py-1 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Aperçu du nom */}
              {selectedClasse && (
                <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100 space-y-1">
                  <p className="text-[10px] font-bold text-primary-600 uppercase">Aperçu du nom final</p>
                  <p className="text-lg font-bold text-primary-700">{formData.nom}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Frais de scolarité</label>
                  <input 
                    required
                    type="number"
                    value={formData.frais_scolarite}
                    onChange={e => setFormData(prev => ({...prev, frais_scolarite: parseFloat(e.target.value) || 0}))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Frais d'inscription</label>
                  <input 
                    required
                    type="number"
                    value={formData.frais_inscription}
                    onChange={e => setFormData(prev => ({...prev, frais_inscription: parseFloat(e.target.value) || 0}))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configuration des Tranches</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 1 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche1_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche1_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 1 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche1_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche1_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 2 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche2_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche2_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 2 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche2_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche2_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 3 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche3_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche3_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 3 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche3_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche3_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 italic">
                  Total tranches: {(formData.tranche1_montant + formData.tranche2_montant + formData.tranche3_montant).toLocaleString()} {formData.devise} 
                  { (formData.tranche1_montant + formData.tranche2_montant + formData.tranche3_montant) !== formData.frais_scolarite && 
                    <span className="text-amber-600 ml-1">(!= Frais de scolarité)</span>
                  }
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Devise</label>
                <select 
                  value={formData.devise}
                  onChange={e => setFormData(prev => ({...prev, devise: e.target.value}))}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="FCFA">FCFA</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GNF">GNF</option>
                </select>
              </div>

              {/* Preview */}
              {formData.nom && (
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-xs text-primary-600 font-bold uppercase mb-1">Aperçu du nom :</p>
                  <p className="text-primary-900 font-bold">{formData.nom}</p>
                </div>
              )}

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
                  disabled={!formData.nom}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingClasse ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View */}
      {viewingClasse && (
        <div className="fixed inset-0 z-[70] bg-slate-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingClasse(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewingClasse.nom}</h2>
                <p className="text-sm text-slate-500">{viewingClasse.niveau}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/emploi-du-temps?classeId=${viewingClasse.id}`)}
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors"
              >
                <Calendar size={16} />
                Emploi du temps
              </button>
              <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide max-w-[calc(100vw-2rem)] sm:max-w-none">
                {[
                  { id: "eleves", label: "Élèves" },
                  { id: "matieres", label: "Matières & Enseignants" },
                  { id: "notes", label: "Notes" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!classeDetails ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                {activeTab === "eleves" && (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Printer size={18} />
                        Imprimer
                      </button>
                      <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold hover:bg-primary-100 transition-colors"
                      >
                        <FileText size={18} />
                        Enregistrer en PDF
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Matricule</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nom & Prénoms</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sexe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...classeDetails.eleves].sort((a, b) => a.nom.localeCompare(b.nom)).map((e: any) => (
                            <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono text-slate-600">{e.matricule}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-900">{e.nom} {e.prenom}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{e.sexe}</td>
                            </tr>
                          ))}
                          {classeDetails.eleves.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Aucun élève dans cette classe</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "matieres" && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setShowAssignModal(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 transition-colors"
                      >
                        <Plus size={18} />
                        Assigner une matière
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Matière</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Enseignant</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Heures / Sem</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Coef</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classeDetails.matieres
                          .filter((m: any) => !m.parent_id)
                          .map((m: any) => (
                          <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                              {m.matiere_nom}
                              {m.categorie && (
                                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">
                                  {m.categorie}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {m.enseignant_nom ? `${m.enseignant_nom} ${m.enseignant_prenom}` : 'Non assigné'}
                            </td>
                            <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">{m.heures_hebdo}h</td>
                            <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">{m.coefficient}</td>
                            <td className="px-6 py-4 text-sm text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => handleEditAssignment(m)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAssignment(m.matiere_id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {classeDetails.matieres.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Aucune matière assignée</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

                {activeTab === "notes" && (
                  <div className="space-y-8">
                    {[1, 2, 3].map(trim => (
                      <div key={trim} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm">{trim}</span>
                          Trimestre {trim}
                        </h3>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Élève</th>
                                {classeDetails.matieres
                                  .filter((m: any) => !classeDetails.matieres.some((other: any) => other.parent_id === m.matiere_id))
                                  .map((m: any) => (
                                  <th key={m.id} colSpan={6} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center border-l border-slate-200">
                                    {m.matiere_nom}
                                  </th>
                                ))}
                              </tr>
                              <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-2 sticky left-0 bg-slate-50 z-10"></th>
                                {classeDetails.matieres
                                  .filter((m: any) => !classeDetails.matieres.some((other: any) => other.parent_id === m.matiere_id))
                                  .map((m: any) => (
                                  <React.Fragment key={m.id}>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center border-l border-slate-200">I1</th>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I2</th>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I3</th>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I4</th>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">D1</th>
                                    <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">D2</th>
                                  </React.Fragment>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[...classeDetails.eleves].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((e: any) => (
                                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-sm font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 whitespace-nowrap">
                                    {e.nom} {e.prenom}
                                  </td>
                                  {classeDetails.matieres
                                    .filter((m: any) => !classeDetails.matieres.some((other: any) => other.parent_id === m.matiere_id))
                                    .map((m: any) => {
                                    const getNote = (type: string) => {
                                      return classeDetails.notes.find((n: any) => 
                                        n.eleve_id === e.id && 
                                        n.matiere_id === m.matiere_id && 
                                        n.trimestre === trim && 
                                        n.type_evaluation === type
                                      )?.note;
                                    };
                                    return (
                                      <React.Fragment key={m.id}>
                                        <td className="px-1 py-3 text-xs text-center border-l border-slate-100">{getNote('I1') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I2') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I3') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I4') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center font-bold text-primary-600">{getNote('Dev1') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center font-bold text-primary-600">{getNote('Dev2') ?? '-'}</td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Matiere Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAssignment ? 'Modifier l\'assignation' : 'Assigner une Matière'}
              </h2>
              <button 
                onClick={() => {
                  setShowAssignModal(false);
                  setEditingAssignment(null);
                  setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1 });
                }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignMatiere} className="p-6 space-y-6">
              {!editingAssignment && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Matières & Enseignants</label>
                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {Object.entries(matieresByCategory).map(([category, matieres]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">
                          {category}
                        </h3>
                        <div className="space-y-3">
                          {matieres
                            .filter((m: any) => !m.parent_id)
                            .map((m: any) => {
                            const isSelected = assignData.matiere_ids.includes(m.id);
                            return (
                              <div key={m.id} className="space-y-2">
                                <div 
                                  onClick={() => handleToggleMatiere(m.id)}
                                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-primary-600 border-primary-600 text-white' 
                                      : 'border-slate-200 bg-white'
                                  }`}>
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                  </div>
                                  <span className="text-sm font-medium">{m.nom}</span>
                                </div>

                                {isSelected && (
                                  <div className="ml-8 p-3 bg-white border border-primary-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase">Enseignant</label>
                                      <select 
                                        value={assignData.assignments[m.id]?.enseignant_id || ''}
                                        onChange={e => {
                                          const enseignant_id = e.target.value;
                                          const children = allMatieres.filter((mat: any) => mat.parent_id === m.id);
                                          
                                          setAssignData(prev => {
                                            const newAssignments = { ...prev.assignments };
                                            newAssignments[m.id] = { ...newAssignments[m.id], enseignant_id };
                                            
                                            // Apply same teacher to children
                                            children.forEach((c: any) => {
                                              if (newAssignments[c.id]) {
                                                newAssignments[c.id] = { ...newAssignments[c.id], enseignant_id };
                                              }
                                            });
                                            
                                            return { ...prev, assignments: newAssignments };
                                          });
                                        }}
                                        className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                      >
                                        <option value="">Sélectionner un enseignant</option>
                                        {(teachersByMatiere[m.id] || [])
                                          .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                                          .map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)
                                        }
                                      </select>
                                      {(!teachersByMatiere[m.id] || teachersByMatiere[m.id].length === 0) && (
                                        <p className="text-[9px] text-amber-600 italic">Aucun enseignant trouvé pour cette matière.</p>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Heures / Sem</label>
                                        <input 
                                          type="number"
                                          min="0"
                                          value={assignData.assignments[m.id]?.heures_hebdo || 0}
                                          onChange={e => setAssignData({
                                            ...assignData,
                                            assignments: {
                                              ...assignData.assignments,
                                              [m.id]: { ...assignData.assignments[m.id], heures_hebdo: parseInt(e.target.value) || 0 }
                                            }
                                          })}
                                          className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Coefficient</label>
                                        <input 
                                          type="number"
                                          min="1"
                                          value={assignData.assignments[m.id]?.coefficient || 1}
                                          onChange={e => setAssignData({
                                            ...assignData,
                                            assignments: {
                                              ...assignData.assignments,
                                              [m.id]: { ...assignData.assignments[m.id], coefficient: parseInt(e.target.value) || 1 }
                                            }
                                          })}
                                          className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingAssignment && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Matière</p>
                    <p className="text-lg font-bold text-slate-900">{editingAssignment.matiere_nom}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Enseignant</label>
                    <select 
                      value={assignData.enseignant_id}
                      onChange={e => setAssignData({...assignData, enseignant_id: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Sélectionner un enseignant</option>
                      {allEnseignants.sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Heures / Sem</label>
                      <input 
                        required
                        type="number"
                        min="0"
                        value={assignData.heures_hebdo}
                        onChange={e => setAssignData({...assignData, heures_hebdo: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Coefficient</label>
                      <input 
                        required
                        type="number"
                        min="1"
                        value={assignData.coefficient}
                        onChange={e => setAssignData({...assignData, coefficient: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setEditingAssignment(null);
                    setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1, assignments: {} });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!editingAssignment && assignData.matiere_ids.length === 0}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingAssignment ? 'Enregistrer' : `Assigner ${assignData.matiere_ids.length > 0 ? `(${assignData.matiere_ids.length})` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSeriesModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Entrer la série</h2>
            <input 
              type="text"
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              placeholder="Ex: A1, C, D"
              value={seriesInput}
              onChange={e => setSeriesInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSeriesModal(false)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={() => {
                if (pendingGeneration) {
                  performGeneration(pendingGeneration.niveau, pendingGeneration.classList, seriesInput);
                  setShowSeriesModal(false);
                  setSeriesInput("");
                  setPendingGeneration(null);
                }
              }} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl">Générer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

