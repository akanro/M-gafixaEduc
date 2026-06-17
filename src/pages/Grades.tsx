import { apiFetch } from '../utils/api';
import React from 'react';
import { Plus, Download, Search, ClipboardList, User, BookOpen, X, Loader2, FileText, Eye, Printer, BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Save, Info, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import { formatClassName } from '../utils/format';
import * as XLSX from 'xlsx';

import { useConfirm } from '../contexts/ConfirmContext';

export default function Grades() {
  const { confirm } = useConfirm();
  const [classes, setClasses] = React.useState([]);
  const [selectedClasse, setSelectedClasse] = React.useState('');
  const [matieres, setMatieres] = React.useState([]);
  const [user, setUser] = React.useState<any>(null);
  const [eleves, setEleves] = React.useState([]);
  const [notes, setNotes] = React.useState([]);
  const [classeDetails, setClasseDetails] = React.useState<any>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showRapidEntryModal, setShowRapidEntryModal] = React.useState(false);
  const [modalFormData, setModalFormData] = React.useState({
    classe_id: '',
    eleve_id: '',
    matiere_id: '',
    trimestre: 1,
    date_evaluation: new Date().toISOString().split('T')[0],
  });

  const pathPermission = user?.permissions?.find((p: any) => (typeof p === 'string' ? p === '/notes' : p.path === '/notes'));
  const canWrite = user && (['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true)));

  const [notesInputs, setNotesInputs] = React.useState<Record<string, string>>({
    I1: '', I2: '', I3: '', I4: '',
    Dev1: '', Dev2: '',
    Composition: '', Examen: ''
  });

  const [classMatieres, setClassMatieres] = React.useState<any[]>([]);
  const [isLoadingClassMatieres, setIsLoadingClassMatieres] = React.useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = React.useState(false);

  React.useEffect(() => {
    if (modalFormData.classe_id) {
      setIsLoadingClassMatieres(true);
      apiFetch(`/api/classes/${modalFormData.classe_id}/details`)
        .then(res => res.json())
        .then(data => {
          // Filter by teacher if applicable
          const matieres = Array.isArray(data.matieres) ? data.matieres : [];
          if (user?.role === 'enseignant' && user?.enseignant_id) {
            setClassMatieres(matieres.filter((m: any) => m.enseignant_id === user.enseignant_id));
          } else {
            setClassMatieres(matieres);
          }
        })
        .finally(() => setIsLoadingClassMatieres(false));
    } else {
      setClassMatieres([]);
    }
  }, [modalFormData.classe_id, user]);

  React.useEffect(() => {
    if (modalFormData.eleve_id && modalFormData.matiere_id && modalFormData.trimestre) {
      setIsLoadingExisting(true);
      apiFetch(`/api/notes/eleve/${modalFormData.eleve_id}/matiere/${modalFormData.matiere_id}/trimestre/${modalFormData.trimestre}`)
        .then(res => res.json())
        .then(existingNotes => {
          const newInputs = {
            I1: '', I2: '', I3: '', I4: '',
            Dev1: '', Dev2: '',
            Composition: '', Examen: ''
          };
          existingNotes.forEach((n: any) => {
            if (n.type_evaluation in newInputs) {
              (newInputs as any)[n.type_evaluation] = n.note.toString();
            }
          });
          setNotesInputs(newInputs);
        })
        .finally(() => setIsLoadingExisting(false));
    } else {
      setNotesInputs({
        I1: '', I2: '', I3: '', I4: '',
        Dev1: '', Dev2: '',
        Composition: '', Examen: ''
      });
    }
  }, [modalFormData.eleve_id, modalFormData.matiere_id, modalFormData.trimestre]);

  const [viewMode, setViewMode] = React.useState<'grid' | 'stats'>('grid');
  const [selectedTrimestre, setSelectedTrimestre] = React.useState<number | null>(null);
  const [showGridModal, setShowGridModal] = React.useState(false);
  const [isLoadingGrid, setIsLoadingGrid] = React.useState(false);
  const [showAnnualStats, setShowAnnualStats] = React.useState(false);
  const [rapidEntryData, setRapidEntryData] = React.useState<any[]>([]);
  const [selectedMatiereRapid, setSelectedMatiereRapid] = React.useState('');
  const [selectedTrimestreRapid, setSelectedTrimestreRapid] = React.useState(1);
  const [rapidEntryDate, setRapidEntryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isSavingRapid, setIsSavingRapid] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importSheets, setImportSheets] = React.useState<Record<string, any[]>>({});
  const [selectedImportSheet, setSelectedImportSheet] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importMatiereId, setImportMatiereId] = React.useState('');
  const [importTrimestre, setImportTrimestre] = React.useState(1);
  const [importDate, setImportDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);
    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(allMatieres => {
        const matieresArray = Array.isArray(allMatieres) ? allMatieres : [];
        if (savedUser.role === 'enseignant' && savedUser.enseignant_id) {
          apiFetch('/api/enseignants')
            .then(res => res.json())
            .then(enseignants => {
              const enseignantsArray = Array.isArray(enseignants) ? enseignants : [];
              const teacher = enseignantsArray.find((e: any) => e.id === savedUser.enseignant_id);
              if (teacher && teacher.matieres_ids) {
                const ids = teacher.matieres_ids.split(',').map((id: string) => parseInt(id.trim()));
                setMatieres(matieresArray.filter((m: any) => ids.includes(m.id)));
              } else {
                setMatieres([]);
              }
            })
            .catch(() => setMatieres([]));
        } else {
          setMatieres(matieresArray);
        }
      })
      .catch(() => setMatieres([]));
    apiFetch('/api/eleves')
      .then(res => res.json())
      .then(data => setEleves(Array.isArray(data) ? data : []))
      .catch(() => setEleves([]));
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSchoolInfo(data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  React.useEffect(() => {
    if (selectedClasse) {
      apiFetch(`/api/notes/${selectedClasse}`)
        .then(res => res.json())
        .then(data => setNotes(Array.isArray(data) ? data : []))
        .catch(() => setNotes([]));
    }
  }, [selectedClasse]);

  const openGrid = (trimestre: number) => {
    if (!selectedClasse) return;
    setSelectedTrimestre(trimestre);
    setViewMode('grid');
    setIsLoadingGrid(true);
    apiFetch(`/api/classes/${selectedClasse}/details`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des détails');
        return res.json();
      })
      .then(data => {
        setClasseDetails(data);
        setShowGridModal(true);
      })
      .catch(err => {
        console.error(err);
        alert("Impossible de charger la grille des notes.");
      })
      .finally(() => setIsLoadingGrid(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;
    
    const notesToSave = (Object.entries(notesInputs) as [string, string][])
      .filter(([_, value]) => value !== '')
      .map(([type, value]) => ({
        type,
        note: parseFloat(value)
      }));

    if (notesToSave.length === 0) {
      alert("Veuillez saisir au moins une note.");
      return;
    }

    apiFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eleve_id: modalFormData.eleve_id,
        matiere_id: modalFormData.matiere_id,
        trimestre: modalFormData.trimestre,
        date_evaluation: modalFormData.date_evaluation,
        notes: notesToSave,
        enseignant_id 
      })
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'enregistrement des notes.");
        return;
      }
      setShowModal(false);
      if (selectedClasse) {
        apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()).then(setNotes);
      }
    });
  };

  const getAppreciation = (moy: number | null) => {
    if (moy === null) return '-';
    if (moy >= 16) return 'Très Bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez Bien';
    if (moy >= 10) return 'Passable';
    if (moy >= 8) return 'Médiocre';
    return 'Insuffisant';
  };

  const calculateStudentGrades = (eleveId: number, notes: any[], matieres: any[], trimestre: number) => {
    const calculateForTrimestre = (t: number) => {
      const studentNotes = notes.filter(n => n.eleve_id === eleveId && n.trimestre === t);
      
      const subjectsGrades = matieres.map(m => {
        const getNote = (type: string) => {
          const noteObj = studentNotes.find(n => n.matiere_id === m.matiere_id && n.type_evaluation === type);
          return noteObj ? noteObj.note : null;
        };

        const i1 = getNote('I1');
        const i2 = getNote('I2');
        const i3 = getNote('I3');
        const i4 = getNote('I4');
        const d1 = getNote('Dev1');
        const d2 = getNote('Dev2');

        const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
        const mi = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;

        const components = [mi, d1, d2].filter(n => n !== null) as number[];
        const moy = components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : null;
        const coef = m.coefficient || 1;
        const moyCoef = moy !== null ? moy * coef : null;

        return {
          matiere_id: m.matiere_id,
          matiere_nom: m.matiere_nom,
          parent_id: m.parent_id,
          categorie: m.categorie,
          mi,
          d1,
          d2,
          moy,
          coef: coef,
          moyCoef,
          appreciation: getAppreciation(moy)
        };
      });

      const finalGrades = subjectsGrades.map(sg => {
        const children = subjectsGrades.filter(other => other.parent_id === sg.matiere_id);
        if (children.length > 0) {
          const validChildren = children.filter(c => c.moy !== null);
          if (validChildren.length > 0) {
            const totalMoy = validChildren.reduce((acc, c) => acc + (c.moy || 0), 0);
            const avgMoy = totalMoy / validChildren.length;
            return {
              ...sg,
              moy: avgMoy,
              moyCoef: avgMoy * sg.coef,
              appreciation: getAppreciation(avgMoy),
              hasChildren: true
            };
          }
        }
        return sg;
      });

      // Filter out parents that have children (they don't count directly if children exist, 
      // but wait, the prompt says "Français" won't have grades, only sub-subjects.
      // So the parent's coefficient should be used for the group?
      // Usually, either the parent has a coef and children are sub-parts, 
      // or children have their own coefs.
      // The requirement says "Français" vertical grouping two lines.
      
      const validGrades = finalGrades.filter(sg => {
        const hasChildren = finalGrades.some(other => other.parent_id === sg.matiere_id);
        // If it's a parent with children, it counts if it has an average from children
        if (hasChildren) return sg.moyCoef !== null;
        // If it's a child, it doesn't count towards the global total directly if we count the parent
        // OR we count children and not the parent.
        // Let's count parents (with their averages from children) and independent subjects.
        return sg.moyCoef !== null && !sg.parent_id;
      });

      const totalMoyCoef = validGrades.reduce((acc, sg) => acc + (sg.moyCoef || 0), 0);
      const totalCoef = validGrades.reduce((acc, sg) => acc + (sg.coef || 0), 0);
      const globalMoy = totalCoef > 0 ? totalMoyCoef / totalCoef : 0;

      return {
        subjectsGrades: finalGrades,
        totalMoyCoef,
        totalCoef,
        globalMoy,
        hasData: totalCoef > 0
      };
    };

    const trim1 = calculateForTrimestre(1);
    const trim2 = calculateForTrimestre(2);
    const trim3 = calculateForTrimestre(3);

    const currentTrimGrades = calculateForTrimestre(trimestre);

    // Annual average considering only trimesters with data
    const averages = [trim1, trim2, trim3].filter(t => t.hasData).map(t => t.globalMoy);
    const annualMoy = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;

    // Annual subject averages
    const annualSubjectsGrades = matieres.map(m => {
      const subjectAverages = [trim1, trim2, trim3]
        .filter(t => t.hasData)
        .map(t => t.subjectsGrades.find((sg: any) => sg.matiere_id === m.matiere_id)?.moy)
        .filter(moy => moy !== null && moy !== undefined) as number[];
      
      const annualMoy = subjectAverages.length > 0 ? subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length : null;
      return {
        matiere_id: m.matiere_id,
        moy: annualMoy
      };
    });

    return {
      ...currentTrimGrades,
      t1: trim1.globalMoy,
      t2: trim2.globalMoy,
      t3: trim3.globalMoy,
      t1HasData: trim1.hasData,
      t2HasData: trim2.hasData,
      t3HasData: trim3.hasData,
      annualMoy,
      annualSubjectsGrades
    };
  };

  const generateBulletin = (eleve: any, preview: boolean = false) => {
    if (!classeDetails || !selectedTrimestre) return;

    const doc = new jsPDF() as any;
    const trimestre = selectedTrimestre;
    
    // Calculate all students grades to get ranks and statistics
    const allStudentsGrades = classeDetails.eleves.map((e: any) => ({
      id: e.id,
      ...calculateStudentGrades(e.id, classeDetails.notes, classeDetails.matieres, trimestre)
    }));

    const currentStudentGrades = allStudentsGrades.find(s => s.id === eleve.id);
    if (!currentStudentGrades) return;

    // Global Statistics
    const validMoys = allStudentsGrades.map(s => s.globalMoy).filter(m => m > 0);
    const forteMoyenne = validMoys.length > 0 ? Math.max(...validMoys) : 0;
    const faibleMoyenne = validMoys.length > 0 ? Math.min(...validMoys) : 0;
    const moyenneClasse = validMoys.length > 0 ? validMoys.reduce((a, b) => a + b, 0) / validMoys.length : 0;

    // Global Rank
    const sortedByMoy = [...allStudentsGrades].sort((a, b) => b.globalMoy - a.globalMoy);
    const globalRank = sortedByMoy.findIndex(s => s.id === eleve.id) + 1;

    // Previous Trimester Moyenne (if T2 or T3)
    let prevMoy = null;
    let prevRank = null;
    let prevAppreciation = '-';
    if (trimestre > 1) {
      const prevTrimGrades = classeDetails.eleves.map((e: any) => ({
        id: e.id,
        ...calculateStudentGrades(e.id, classeDetails.notes, classeDetails.matieres, trimestre - 1)
      }));
      const currentPrev = prevTrimGrades.find(s => s.id === eleve.id);
      prevMoy = currentPrev?.globalMoy || 0;
      prevAppreciation = getAppreciation(prevMoy);
      
      const sortedPrev = [...prevTrimGrades].sort((a, b) => b.globalMoy - a.globalMoy);
      prevRank = sortedPrev.findIndex(s => s.id === eleve.id) + 1;
    }

    // Header Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277); // Main border

    // School Info Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolInfo?.nom || 'Complexe Scolaire "MONT SINAÏ"', 105, 25, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const headerY = 35;
    doc.text(`ADD : ${schoolInfo?.adresse || 'Agonmey/Akassato/Ab-Calavi'}`, 60, headerY);
    doc.text(`TEL : ${schoolInfo?.telephone || '66 09 98 64 / 40 56 59 71'}`, 60, headerY + 5);
    doc.text(`EMAIL : ${schoolInfo?.email || 'monsinaida@gmail.com'}`, 60, headerY + 10);

    // Student Info Grid
    doc.setFontSize(10);
    const infoY = 60;
    doc.text(`Matricule : ${eleve.matricule}`, 15, infoY);
    doc.text(`Nom : ${eleve.nom}`, 15, infoY + 6);
    doc.text(`Prénom(s) : ${eleve.prenom}`, 15, infoY + 12);
    doc.text(`Sexe : ${eleve.sexe || 'M'}`, 15, infoY + 18);
    doc.text(`Statu : ${currentStudentGrades.globalMoy >= 10 ? 'Passant(e)' : 'Redoublant(e)'}`, 15, infoY + 24);

    doc.text(`Année Scolaire : 2023-2024`, 120, infoY);
    doc.text(`Classe : ${formatClassName(classeDetails.nom)}`, 120, infoY + 6);
    doc.text(`Effectif : ${classeDetails.eleves.length}`, 120, infoY + 12);
    doc.text(`Trimestre : ${trimestre}`, 120, infoY + 18);

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const trimText = trimestre === 1 ? 'PREMIER' : trimestre === 2 ? 'DEUXIEME' : 'TROISIEME';
    doc.text(`BULLETIN DE NOTES DE FIN DU ${trimText} TRIMESTRE`, 105, 95, { align: 'center' });

    // Group and sort subjects: Parent followed by its children
    const groupedSubjects: any[] = [];
    const parents = currentStudentGrades.subjectsGrades.filter(sg => !sg.parent_id);
    const children = currentStudentGrades.subjectsGrades.filter(sg => sg.parent_id);

    parents.forEach(p => {
      const subSubjects = children.filter(c => c.parent_id === p.matiere_id);
      if (subSubjects.length > 0) {
        // Parent is a group header
        groupedSubjects.push({
          ...p,
          isParent: true,
          subCount: subSubjects.length
        });
        subSubjects.forEach(s => {
          groupedSubjects.push({
            ...s,
            isChild: true,
            parentNom: p.matiere_nom
          });
        });
      } else {
        // Normal independent subject
        groupedSubjects.push(p);
      }
    });

    // Add orphaned children just in case
    children.forEach(c => {
      if (!parents.find(p => p.matiere_id === c.parent_id)) {
        groupedSubjects.push(c);
      }
    });

    // Grades Table
    const tableData: any[] = [];
    let currentParent: any = null;
    let parentRowIndex = -1;

    groupedSubjects.forEach((sg, index) => {
      const subjectRank = allStudentsGrades
        .map(s => ({ id: s.id, moy: s.subjectsGrades.find(ss => ss.matiere_id === sg.matiere_id)?.moy }))
        .filter(s => s.moy !== null)
        .sort((a, b) => (b.moy || 0) - (a.moy || 0))
        .findIndex(s => s.id === eleve.id) + 1;

      if (sg.isParent) {
        // Parent row (Vertical name)
        tableData.push([
          { content: sg.matiere_nom, rowSpan: sg.subCount, styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 10 * sg.subCount } },
          { content: '', styles: { fillColor: [245, 245, 245] } }, // Placeholder for child name
          '', '', '', '', '', '', ''
        ]);
        currentParent = sg;
        parentRowIndex = tableData.length - 1;
      } else if (sg.isChild) {
        if (currentParent && tableData[parentRowIndex]) {
          // Fill the first child in the parent row
          const row = tableData[parentRowIndex];
          row[1] = sg.matiere_nom.replace('   - ', '');
          row[2] = sg.mi !== null ? sg.mi.toFixed(2) : '-';
          row[3] = sg.d1 !== null ? sg.d1.toFixed(2) : '-';
          row[4] = sg.d2 !== null ? sg.d2.toFixed(2) : '-';
          row[5] = sg.moy !== null ? sg.moy.toFixed(2) : '-';
          row[6] = '-'; // Child coef is usually not shown if parent has one
          row[7] = '-';
          row[8] = subjectRank || '-';
          row[9] = sg.appreciation;
          currentParent = null; // Reset so next child creates new row
        } else {
          tableData.push([
            // No first column because of rowSpan
            sg.matiere_nom.replace('   - ', ''),
            sg.mi !== null ? sg.mi.toFixed(2) : '-',
            sg.d1 !== null ? sg.d1.toFixed(2) : '-',
            sg.d2 !== null ? sg.d2.toFixed(2) : '-',
            sg.moy !== null ? sg.moy.toFixed(2) : '-',
            '-',
            '-',
            subjectRank || '-',
            sg.appreciation
          ]);
        }
      } else {
        tableData.push([
          { content: sg.matiere_nom, colSpan: 2 },
          sg.mi !== null ? sg.mi.toFixed(2) : '-',
          sg.d1 !== null ? sg.d1.toFixed(2) : '-',
          sg.d2 !== null ? sg.d2.toFixed(2) : '-',
          sg.moy !== null ? sg.moy.toFixed(2) : '-',
          sg.coef.toString(),
          sg.moyCoef !== null ? sg.moyCoef.toFixed(2) : '-',
          subjectRank || '-',
          sg.appreciation
        ]);
      }
    });

    // Add Total Row
    tableData.push([
      { content: 'TOTAL:', colSpan: 2, styles: { fontStyle: 'bold' } },
      '', '', '',
      { content: currentStudentGrades.totalMoyCoef.toFixed(2), styles: { fontStyle: 'bold' } },
      { content: currentStudentGrades.totalCoef.toString(), styles: { fontStyle: 'bold' } },
      { content: currentStudentGrades.totalMoyCoef.toFixed(2), styles: { fontStyle: 'bold' } },
      '', ''
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['MATIERE', '', 'MI', 'DEV 1', 'DEV 2', 'MOY', 'COEF.', 'MOY.C OEF.', 'RANG', 'APP. DU PROF']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
        9: { halign: 'center' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary Boxes
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    
    // Rapport Trimestriel Box
    const rapportX = 15;
    const rapportW = 120;
    doc.rect(rapportX, finalY, rapportW, 35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT TRIMESTRIEL', rapportX + rapportW/2, finalY + 5, { align: 'center' });
    doc.line(rapportX, finalY + 7, rapportX + rapportW, finalY + 7);

    doc.setFontSize(9);
    const colW = rapportW / 3;
    const currentTrimLabel = `TRIMESTRE ${trimestre === 1 ? 'I' : trimestre === 2 ? 'II' : 'III'}`;
    const prevTrimLabel = trimestre > 1 ? `TRIMESTRE ${trimestre === 2 ? 'I' : 'II'}` : '';
    
    // If T2, show T1 summary
    if (trimestre > 1) {
      doc.text(prevTrimLabel, rapportX + colW/2, finalY + 12, { align: 'center' });
      doc.text('RANG', rapportX + colW + colW/2, finalY + 12, { align: 'center' });
      doc.text('APPRECIATION', rapportX + 2*colW + colW/2, finalY + 12, { align: 'center' });
      doc.line(rapportX, finalY + 14, rapportX + rapportW, finalY + 14);

      doc.setFontSize(11);
      doc.text(prevMoy !== null ? prevMoy.toFixed(2) : '-', rapportX + colW/2, finalY + 22, { align: 'center' });
      doc.text(prevRank !== null ? prevRank.toString() : '-', rapportX + colW + colW/2, finalY + 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(prevAppreciation, rapportX + 2*colW + colW/2, finalY + 22, { align: 'center' });
    } else {
      doc.text(currentTrimLabel, rapportX + colW/2, finalY + 12, { align: 'center' });
      doc.text('RANG', rapportX + colW + colW/2, finalY + 12, { align: 'center' });
      doc.text('APPRECIATION', rapportX + 2*colW + colW/2, finalY + 12, { align: 'center' });
      doc.line(rapportX, finalY + 14, rapportX + rapportW, finalY + 14);

      doc.setFontSize(11);
      doc.text(currentStudentGrades.globalMoy.toFixed(2), rapportX + colW/2, finalY + 22, { align: 'center' });
      doc.text(globalRank.toString(), rapportX + colW + colW/2, finalY + 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(getAppreciation(currentStudentGrades.globalMoy), rapportX + 2*colW + colW/2, finalY + 22, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.text(`Forte moyenne: ${forteMoyenne.toFixed(2)}`, rapportX + 5, finalY + 28);
    doc.text(`Faible moyenne: ${faibleMoyenne.toFixed(2)}`, rapportX + 5, finalY + 32);
    doc.text(`Moyenne Classe: ${moyenneClasse.toFixed(2)}`, rapportX + colW + 5, finalY + 30);

    // Bilan Box
    const bilanX = rapportX + rapportW + 5;
    const bilanW = 55;
    doc.rect(bilanX, finalY, bilanW, 35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN', bilanX + bilanW/2, finalY + 5, { align: 'center' });
    doc.line(bilanX, finalY + 7, bilanX + bilanW, finalY + 7);

    const calculateCategoryAverage = (grades: any[], category: string) => {
      const catGrades = grades.filter(g => {
        if (category === 'Littéraire') return g.categorie === 'Littéraires';
        if (category === 'Scientifique') return g.categorie === 'Scientifiques';
        if (category === 'Autres') return !['Littéraires', 'Scientifiques'].includes(g.categorie);
        return false;
      }).filter(g => g.moy !== null);
      
      if (catGrades.length === 0) return '-';
      return (catGrades.reduce((acc, g) => acc + g.moy, 0) / catGrades.length).toFixed(2);
    };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Littéraire', bilanX + 5, finalY + 12);
    doc.text('Scientifique', bilanX + 5, finalY + 18);
    doc.text('Autres', bilanX + 5, finalY + 24);

    doc.setFont('helvetica', 'bold');
    doc.text(calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Littéraire'), bilanX + bilanW - 15, finalY + 12);
    doc.text(calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Scientifique'), bilanX + bilanW - 15, finalY + 18);
    doc.text(calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Autres'), bilanX + bilanW - 15, finalY + 24);

    // Bottom Row Summary Boxes
    const conseilY = finalY + 40;
    
    if (trimestre === 3) {
      // Bilan Annuel Box (Left)
      const bilanAnnuelX = 15;
      const bilanAnnuelW = 95;
      doc.rect(bilanAnnuelX, conseilY, bilanAnnuelW, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BILAN ANNUEL', bilanAnnuelX + bilanAnnuelW/2, conseilY + 5, { align: 'center' });
      doc.line(bilanAnnuelX, conseilY + 7, bilanAnnuelX + bilanAnnuelW, conseilY + 7);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Moyenne T1:', bilanAnnuelX + 5, conseilY + 12);
      doc.text(currentStudentGrades.t1HasData ? currentStudentGrades.t1.toFixed(2) : '-', bilanAnnuelX + 35, conseilY + 12);
      doc.text('Moyenne T2:', bilanAnnuelX + 5, conseilY + 18);
      doc.text(currentStudentGrades.t2HasData ? currentStudentGrades.t2.toFixed(2) : '-', bilanAnnuelX + 35, conseilY + 18);
      doc.text('Moyenne T3:', bilanAnnuelX + 5, conseilY + 24);
      doc.text(currentStudentGrades.t3HasData ? currentStudentGrades.t3.toFixed(2) : '-', bilanAnnuelX + 35, conseilY + 24);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MOY. ANNUELLE:', bilanAnnuelX + 5, conseilY + 32);
      doc.text(currentStudentGrades.annualMoy.toFixed(2), bilanAnnuelX + 35, conseilY + 32);

      // Decision
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Décision du conseil des profs :', bilanAnnuelX + bilanAnnuelW/2, conseilY + 15, { align: 'center' });
      
      const decision = currentStudentGrades.annualMoy >= 10 ? 'ADMIS(E)' : 'REDOUBLE';
      if (decision === 'ADMIS(E)') {
        doc.setTextColor(16, 185, 129); // Emerald
      } else {
        doc.setTextColor(239, 68, 68); // Red
      }
      doc.setFontSize(16);
      doc.text(decision, bilanAnnuelX + bilanAnnuelW/2, conseilY + 28, { align: 'center' });
      doc.setTextColor(0); // Reset to black
      
      // Conseil de Classe Box (Right)
      const conseilX = 115;
      const conseilW = 80;
      doc.rect(conseilX, conseilY, conseilW, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONSEIL DE CLASSE', conseilX + conseilW/2, conseilY + 5, { align: 'center' });
      doc.line(conseilX, conseilY + 7, conseilX + conseilW, conseilY + 7);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const items = ['Assiduité', 'Discipline', 'Blâme', 'Tableau d\'Honneur', 'Félicitations'];
      items.forEach((item, i) => {
        doc.text(item, conseilX + 2, conseilY + 12 + (i * 6));
        doc.rect(conseilX + conseilW - 20, conseilY + 8 + (i * 6), 15, 5);
      });
    } else {
      // Normal Conseil de Classe Box (Left)
      const conseilX = 15;
      const conseilW = 60;
      doc.rect(conseilX, conseilY, conseilW, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONSEIL DE CLASSE', conseilX + conseilW/2, conseilY + 5, { align: 'center' });
      doc.line(conseilX, conseilY + 7, conseilX + conseilW, conseilY + 7);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const items = ['Assiduité', 'Discipline', 'Blâme', 'Tableau d\'Honneur', 'Félicitations'];
      items.forEach((item, i) => {
        doc.text(item, conseilX + 2, conseilY + 12 + (i * 6));
        doc.rect(conseilX + conseilW - 20, conseilY + 8 + (i * 6), 15, 5);
      });
    }

    // Footer Signatures
    const footerY = conseilY + 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MENTION SPECIALE', 50, footerY, { align: 'center' });
    doc.text('VISA DU CHEF', 150, footerY, { align: 'center' });
    doc.text("D'ETABLISSEMENT", 150, footerY + 5, { align: 'center' });

    if (preview) {
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`bulletin_${eleve.nom}_${eleve.prenom}_T${trimestre}.pdf`);
    }
  };

  const generateStatsPDF = () => {
    if (!classeDetails || !selectedClasse) return;
    
    const doc = new jsPDF();
    const className = classes.find((c: any) => (c as any).id === parseInt(selectedClasse))?.nom || '';
    const trimestre = selectedTrimestre;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(getPrimaryColor());
    doc.text(`Statistiques de Performance - ${className}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Trimestre ${trimestre} | Année Scolaire: ${schoolInfo?.annee_active || '2025-2026'}`, 105, 30, { align: 'center' });
    
    // Calculate Stats
    const allGrades = classeDetails.eleves.map((e: any) => ({
      ...e,
      ...calculateStudentGrades(e.id, classeDetails.notes, classeDetails.matieres, selectedTrimestre || 1)
    }));

    const isT3 = selectedTrimestre === 3;

    const validMoys = allGrades.map(s => s.globalMoy).filter(m => m > 0);
    const passCount = allGrades.filter(s => s.globalMoy >= 10).length;
    const passRate = allGrades.length > 0 ? (passCount / allGrades.length) * 100 : 0;
    const avgMoy = validMoys.length > 0 ? validMoys.reduce((a, b) => a + b, 0) / validMoys.length : 0;

    // Summary Table
    autoTable(doc, {
      startY: 40,
      head: [['Indicateur', `Valeur (T${trimestre})`, ...(isT3 ? ['Valeur (Annuelle)'] : [])]],
      body: [
        ['Nombre d\'élèves', allGrades.length.toString(), ...(isT3 ? [allGrades.length.toString()] : [])],
        ['Taux de réussite', `${passRate.toFixed(2)}%`, ...(isT3 ? [`${(allGrades.filter(s => s.annualMoy >= 10).length / allGrades.length * 100).toFixed(2)}%`] : [])],
        ['Moyenne générale de classe', avgMoy.toFixed(2), ...(isT3 ? [(allGrades.map(s => s.annualMoy).reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2)] : [])],
        ['Plus forte moyenne', validMoys.length > 0 ? Math.max(...validMoys).toFixed(2) : '-', ...(isT3 ? [Math.max(...allGrades.map(s => s.annualMoy)).toFixed(2)] : [])],
        ['Plus faible moyenne', validMoys.length > 0 ? Math.min(...validMoys).toFixed(2) : '-', ...(isT3 ? [Math.min(...allGrades.map(s => s.annualMoy)).toFixed(2)] : [])],
      ],
      theme: 'striped',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Gender Stats Table
    const maleStudents = allGrades.filter(s => s.sexe === 'M');
    const femaleStudents = allGrades.filter(s => s.sexe === 'F');
    const malePassCount = maleStudents.filter(s => s.globalMoy >= 10).length;
    const femalePassCount = femaleStudents.filter(s => s.globalMoy >= 10).length;
    
    const maleAnnualPassCount = maleStudents.filter(s => s.annualMoy >= 10).length;
    const femaleAnnualPassCount = femaleStudents.filter(s => s.annualMoy >= 10).length;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Sexe', 'Effectif', `Admis (T${trimestre})`, `Taux (T${trimestre})`, ...(isT3 ? ['Admis (Annuel)', 'Taux (Annuel)'] : [])]],
      body: [
        [
          'Garçons', 
          maleStudents.length.toString(), 
          malePassCount.toString(), 
          `${maleStudents.length > 0 ? ((malePassCount / maleStudents.length) * 100).toFixed(2) : 0}%`,
          ...(isT3 ? [maleAnnualPassCount.toString(), `${maleStudents.length > 0 ? ((maleAnnualPassCount / maleStudents.length) * 100).toFixed(2) : 0}%`] : [])
        ],
        [
          'Filles', 
          femaleStudents.length.toString(), 
          femalePassCount.toString(), 
          `${femaleStudents.length > 0 ? ((femalePassCount / femaleStudents.length) * 100).toFixed(2) : 0}%`,
          ...(isT3 ? [femaleAnnualPassCount.toString(), `${femaleStudents.length > 0 ? ((femaleAnnualPassCount / femaleStudents.length) * 100).toFixed(2) : 0}%`] : [])
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Distribution Table
    const distribution = [
      { range: '0-5', count: allGrades.filter(s => s.globalMoy < 5 && s.globalMoy > 0).length, annualCount: allGrades.filter(s => s.annualMoy < 5 && s.annualMoy > 0).length },
      { range: '5-10', count: allGrades.filter(s => s.globalMoy >= 5 && s.globalMoy < 10).length, annualCount: allGrades.filter(s => s.annualMoy >= 5 && s.annualMoy < 10).length },
      { range: '10-12', count: allGrades.filter(s => s.globalMoy >= 10 && s.globalMoy < 12).length, annualCount: allGrades.filter(s => s.annualMoy >= 10 && s.annualMoy < 12).length },
      { range: '12-14', count: allGrades.filter(s => s.globalMoy >= 12 && s.globalMoy < 14).length, annualCount: allGrades.filter(s => s.annualMoy >= 12 && s.annualMoy < 14).length },
      { range: '14-16', count: allGrades.filter(s => s.globalMoy >= 14 && s.globalMoy < 16).length, annualCount: allGrades.filter(s => s.annualMoy >= 14 && s.annualMoy < 16).length },
      { range: '16-20', count: allGrades.filter(s => s.globalMoy >= 16).length, annualCount: allGrades.filter(s => s.annualMoy >= 16).length },
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Tranche de Moyenne', `Nombre (T${trimestre})`, ...(isT3 ? ['Nombre (Annuel)'] : [])]],
      body: distribution.map(d => [d.range, d.count.toString(), ...(isT3 ? [d.annualCount.toString()] : [])]),
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Subject Performance Table
    const sortedMatieres: any[] = [];
    const parents = (classeDetails?.matieres || []).filter((m: any) => !m.parent_id);
    const children = (classeDetails?.matieres || []).filter((m: any) => m.parent_id);
    parents.forEach((p: any) => {
      const subMatieres = children.filter((c: any) => c.parent_id === p.matiere_id);
      if (subMatieres.length > 0) subMatieres.forEach((s: any) => sortedMatieres.push(s));
      else sortedMatieres.push(p);
    });
    children.forEach((c: any) => {
      if (!parents.find((p: any) => p.matiere_id === c.parent_id)) sortedMatieres.push(c);
    });

    const subjectData = sortedMatieres.map(m => {
      const subjectMoys = allGrades.map(s => {
        const sm = s.subjectsGrades.find((sm: any) => sm.matiere_id === m.matiere_id);
        return sm ? sm.moy : null;
      }).filter(n => n !== null) as number[];
      
      const avg = subjectMoys.length > 0 ? subjectMoys.reduce((a, b) => a + b, 0) / subjectMoys.length : 0;
      const pass = subjectMoys.filter(n => n >= 10).length;
      const rate = subjectMoys.length > 0 ? (pass / subjectMoys.length) * 100 : 0;
      
      return [m.matiere_nom, avg.toFixed(2), `${rate.toFixed(2)}%`];
    });

    doc.text("Performance par Matière", 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Matière', 'Moyenne', 'Taux de Réussite']],
      body: subjectData,
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    doc.save(`Statistiques_${className}_Trimestre_${trimestre}.pdf`);
  };

  const generateAllBulletins = () => {
    if (!classeDetails || !selectedTrimestre) return;
    
    classeDetails.eleves.forEach((eleve: any, index: number) => {
      // Add a small delay to avoid browser blocking multiple downloads
      setTimeout(() => {
        generateBulletin(eleve, false);
      }, index * 500);
    });
  };

  const openRapidEntry = () => {
    if (!selectedClasse) {
      alert("Veuillez sélectionner une classe d'abord.");
      return;
    }
    setIsLoadingGrid(true);
    apiFetch(`/api/classes/${selectedClasse}/details`)
      .then(res => res.json())
      .then(data => {
        setClasseDetails(data);
        // Initialize rapid entry data with students and empty notes
        const initialData = data.eleves.map((e: any) => ({
          id: e.id,
          nom: `${e.nom} ${e.prenom}`,
          notes: { I1: '', I2: '', I3: '', I4: '', Dev1: '', Dev2: '', Composition: '', Examen: '' }
        }));
        setRapidEntryData(initialData);
        setShowRapidEntryModal(true);
      })
      .finally(() => setIsLoadingGrid(false));
  };

  const handlePasteGrades = (e: React.ClipboardEvent, studentIndex: number, noteType: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    
    if (rows.length > 1) {
      // Multi-row paste (from Excel/Table)
      const newRapidData = [...rapidEntryData];
      rows.forEach((row, i) => {
        const targetIdx = studentIndex + i;
        if (targetIdx < newRapidData.length) {
          const cells = row.split(/\t/); // Split by tab for Excel
          if (cells.length > 1) {
            // Multi-column paste
            const types = ['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'];
            const startTypeIdx = types.indexOf(noteType);
            cells.forEach((cell, j) => {
              const typeIdx = startTypeIdx + j;
              if (typeIdx < types.length) {
                const val = cell.trim().replace(',', '.');
                if (!isNaN(parseFloat(val)) || val === '') {
                  newRapidData[targetIdx].notes[types[typeIdx]] = val;
                }
              }
            });
          } else {
            // Single column paste across multiple students
            const val = row.trim().replace(',', '.');
            if (!isNaN(parseFloat(val)) || val === '') {
              newRapidData[targetIdx].notes[noteType] = val;
            }
          }
        }
      });
      setRapidEntryData(newRapidData);
    } else {
      // Single cell paste
      const val = pasteData.trim().replace(',', '.');
      if (!isNaN(parseFloat(val)) || val === '') {
        const newRapidData = [...rapidEntryData];
        newRapidData[studentIndex].notes[noteType] = val;
        setRapidEntryData(newRapidData);
      }
    }
  };

  const handleRapidSubmit = async () => {
    if (!selectedMatiereRapid) {
      alert("Veuillez sélectionner une matière.");
      return;
    }
    
    setIsSavingRapid(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;

    try {
      const bulkData = rapidEntryData.map(student => ({
        eleve_id: student.id,
        notes: Object.entries(student.notes)
          .filter(([_, value]) => value !== '')
          .map(([type, value]) => ({
            type,
            note: parseFloat(value as string)
          }))
      })).filter(s => s.notes.length > 0);

      if (bulkData.length === 0) {
        alert("Aucune note à enregistrer.");
        setIsSavingRapid(false);
        return;
      }

      const response = await apiFetch('/api/notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: bulkData,
          matiere_id: selectedMatiereRapid,
          trimestre: selectedTrimestreRapid,
          date_evaluation: rapidEntryDate,
          enseignant_id 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'enregistrement");
      }
      
      setShowRapidEntryModal(false);
      if (selectedClasse) {
        apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()).then(setNotes);
      }
      alert("Notes enregistrées avec succès !");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSavingRapid(false);
    }
  };

  const downloadTemplate = () => {
    if (!selectedClasse) {
      alert("Veuillez sélectionner une classe d'abord.");
      return;
    }

    const className = classes.find((c: any) => c.id === parseInt(selectedClasse))?.nom || 'Classe';
    const studentsInClass = eleves
      .filter((e: any) => e.classe_id === parseInt(selectedClasse))
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const wb = XLSX.utils.book_new();

    // Get subjects for this class
    apiFetch(`/api/classes/${selectedClasse}/details`)
      .then(res => res.json())
      .then(data => {
        const classMatieres = data.matieres || [];
        
        if (classMatieres.length === 0) {
          // Fallback to a single sheet if no subjects found
          const templateData = studentsInClass.map(e => ({
            'Matricule': e.matricule,
            'Nom': e.nom,
            'Prénom': e.prenom,
            'Classe': className,
            'I1': '',
            'I2': '',
            'I3': '',
            'I4': '',
            'Dev1': '',
            'Dev2': '',
            'Composition': '',
            'Examen': ''
          }));
          const ws = XLSX.utils.json_to_sheet(templateData);
          XLSX.utils.book_append_sheet(wb, ws, "Notes");
        } else {
          // Create a sheet for each subject
          classMatieres.forEach((m: any) => {
            const templateData = studentsInClass.map(e => ({
              'Matricule': e.matricule,
              'Nom': e.nom,
              'Prénom': e.prenom,
              'Classe': className,
              'I1': '',
              'I2': '',
              'I3': '',
              'I4': '',
              'Dev1': '',
              'Dev2': '',
              'Composition': '',
              'Examen': ''
            }));
            const ws = XLSX.utils.json_to_sheet(templateData);
            // Sheet names must be <= 31 chars and no special chars
            const sheetName = m.matiere_nom.substring(0, 30).replace(/[\\/?*[\]]/g, '_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          });
        }

        XLSX.writeFile(wb, `Template_Notes_${className.replace(/\s+/g, '_')}.xlsx`);
      })
      .catch(err => {
        console.error(err);
        alert("Erreur lors de la génération du template.");
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const allSheets: Record<string, any[]> = {};
        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          allSheets[name] = XLSX.utils.sheet_to_json(ws);
        });

        if (Object.keys(allSheets).length === 0) {
          alert("Le fichier est vide.");
          return;
        }

        setImportSheets(allSheets);
        const firstSheet = wb.SheetNames[0];
        setSelectedImportSheet(firstSheet);
        setImportData(allSheets[firstSheet]);
        
        // Try to auto-select subject based on sheet name
        const matchedMatiere = matieres.find((m: any) => 
          m.nom.toLowerCase() === firstSheet.toLowerCase() || 
          firstSheet.toLowerCase().includes(m.nom.toLowerCase())
        );
        if (matchedMatiere) {
          setImportMatiereId(matchedMatiere.id.toString());
        }

        setShowImportModal(true);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  React.useEffect(() => {
    if (selectedImportSheet && importSheets[selectedImportSheet]) {
      setImportData(importSheets[selectedImportSheet]);
      
      // Try to auto-select subject based on sheet name
      const matchedMatiere = matieres.find((m: any) => 
        m.nom.toLowerCase() === selectedImportSheet.toLowerCase() || 
        selectedImportSheet.toLowerCase().includes(m.nom.toLowerCase())
      );
      if (matchedMatiere) {
        setImportMatiereId(matchedMatiere.id.toString());
      }
    }
  }, [selectedImportSheet, importSheets, matieres]);

  React.useEffect(() => {
    if (importData.length > 0) {
      const preview = importData.map((row: any) => {
        const student = eleves.find(e => e.matricule === row.Matricule);
        const nameMatches = student ? (
          student.nom.toLowerCase() === (row.Nom || '').toLowerCase() &&
          student.prenom.toLowerCase() === (row.Prénom || '').toLowerCase()
        ) : false;

        const studentNotes: any = {};
        const types = ['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'];
        let hasNotes = false;
        
        types.forEach(type => {
          const val = row[type];
          if (val !== undefined && val !== null && val !== '') {
            const note = parseFloat(val.toString().replace(',', '.'));
            if (!isNaN(note)) {
              studentNotes[type] = note;
              hasNotes = true;
            }
          }
        });

        return {
          matricule: row.Matricule,
          nom: row.Nom,
          prenom: row.Prénom,
          classe: row.Classe,
          studentId: student?.id,
          exists: !!student,
          nameMatches,
          hasNotes,
          notes: studentNotes,
          status: !student ? 'error' : (!nameMatches ? 'warning' : 'success')
        };
      });
      setImportPreview(preview);
    } else {
      setImportPreview([]);
    }
  }, [importData, eleves]);

  const handleImportSubmit = async () => {
    if (!importMatiereId) {
      alert("Veuillez sélectionner une matière.");
      return;
    }

    const validData = importPreview.filter(p => p.exists && p.hasNotes);

    if (validData.length === 0) {
      alert("Aucune note valide à importer.");
      return;
    }

    const warningCount = importPreview.filter(p => p.exists && !p.nameMatches).length;
    if (warningCount > 0) {
      const isConfirmed = await confirm({
        title: 'Attention: Noms incohérents',
        message: `${warningCount} élèves ont des noms qui ne correspondent pas exactement au matricule. Voulez-vous continuer ?`,
        type: 'warning'
      });
      if (!isConfirmed) return;
    }

    setIsImporting(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;

    try {
      const bulkData = validData.map(p => ({
        eleve_id: p.studentId,
        notes: Object.entries(p.notes).map(([type, note]) => ({
          type,
          note
        }))
      }));

      const response = await apiFetch('/api/notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: bulkData,
          matiere_id: importMatiereId,
          trimestre: importTrimestre,
          date_evaluation: importDate,
          enseignant_id 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'importation");
      }
      
      setShowImportModal(false);
      if (selectedClasse) {
        apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()).then(setNotes);
      }
      alert(`${bulkData.length} élèves importés avec succès !`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Une erreur est survenue lors de l'importation.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes & Bulletins</h1>
          <p className="text-slate-500">Saisie des notes et génération des bulletins scolaires.</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && (
            <>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Upload size={20} className="text-indigo-600" />
                Importer Excel
              </button>
              <button 
                onClick={openRapidEntry}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <ClipboardList size={20} className="text-primary-600" />
                Saisie Rapide
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                Saisir une note
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Filtrer par classe</label>
          <select 
            value={selectedClasse}
            onChange={e => setSelectedClasse(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={downloadTemplate}
            className="w-full md:w-auto px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            Template Import
          </button>
          <button className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            <Download size={18} />
            Exporter tout
          </button>
        </div>
      </div>

      {selectedClasse ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                onClick={() => openGrid(t)}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group text-left"
              >
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {isLoadingGrid && selectedTrimestre === t ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <ClipboardList size={24} />
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">Trimestre {t}</h3>
                <p className="text-slate-500 text-sm mt-1">Voir la grille des notes</p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-slate-900">Dernières notes saisies</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Élève</th>
                  <th className="px-6 py-3 font-medium">Matière</th>
                  <th className="px-6 py-3 font-medium">Trim.</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Note</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {notes.map((n: any) => (
                  <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                          {n.nom[0]}{n.prenom[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{n.nom} {n.prenom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{n.matiere_nom}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">T{n.trimestre}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">{n.type_evaluation}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${(n.note || 0) >= 10 ? 'text-primary-600' : 'text-red-600'}`}>
                        {typeof n.note === 'number' ? n.note.toFixed(2) : '0.00'} / 20
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{n.date_evaluation}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => generateBulletin(n)}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Générer Bulletin"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {notes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      Aucune note enregistrée pour cette classe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <ClipboardList size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400">Veuillez sélectionner une classe pour voir les notes.</p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Importation des Notes</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Feuille Excel</label>
                  <select 
                    value={selectedImportSheet}
                    onChange={e => setSelectedImportSheet(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.keys(importSheets).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matière</label>
                  <select 
                    required
                    value={importMatiereId}
                    onChange={e => setImportMatiereId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner une matière</option>
                    {matieres.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Trimestre</label>
                  <select 
                    value={importTrimestre}
                    onChange={e => setImportTrimestre(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>Trimestre 1</option>
                    <option value={2}>Trimestre 2</option>
                    <option value={3}>Trimestre 3</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date d'évaluation</label>
                  <input 
                    type="date"
                    value={importDate}
                    onChange={e => setImportDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye size={18} className="text-primary-600" />
                  Aperçu de l'importation
                </h3>
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2">Statut</th>
                        <th className="px-4 py-2">Matricule</th>
                        <th className="px-4 py-2">Nom & Prénom (Excel)</th>
                        <th className="px-4 py-2">Notes détectées</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importPreview.map((p, idx) => (
                        <tr key={idx} className={p.status === 'error' ? 'bg-red-50' : (p.status === 'warning' ? 'bg-amber-50' : '')}>
                          <td className="px-4 py-2">
                            {p.status === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Prêt" />}
                            {p.status === 'warning' && <div className="w-2 h-2 rounded-full bg-amber-500" title="Nom différent" />}
                            {p.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" title="Inconnu" />}
                          </td>
                          <td className="px-4 py-2 font-mono">{p.matricule}</td>
                          <td className="px-4 py-2">
                            {p.nom} {p.prenom}
                            {p.status === 'warning' && (
                              <p className="text-[10px] text-amber-600 mt-0.5 italic">
                                Devrait être: {eleves.find(e => e.id === p.studentId)?.nom} {eleves.find(e => e.id === p.studentId)?.prenom}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {p.hasNotes ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(p.notes).map(([type, note]) => (
                                  <span key={type} className="bg-white border px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {type}: {note}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Aucune note</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{importPreview.filter(p => p.status === 'success').length} OK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{importPreview.filter(p => p.status === 'warning').length} Alertes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{importPreview.filter(p => p.status === 'error').length} Erreurs</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleImportSubmit}
                  disabled={isImporting || !importMatiereId || importPreview.filter(p => p.exists && p.hasNotes).length === 0}
                  className="px-8 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isImporting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Lancer l'importation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Saisie de Notes</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={modalFormData.classe_id}
                    onChange={e => setModalFormData({...modalFormData, classe_id: e.target.value, eleve_id: ''})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Élève</label>
                  <select 
                    required
                    disabled={!modalFormData.classe_id}
                    value={modalFormData.eleve_id}
                    onChange={e => setModalFormData({...modalFormData, eleve_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="">Sélectionner un élève</option>
                    {eleves
                      .filter((e: any) => e.classe_id === parseInt(modalFormData.classe_id))
                      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                      .map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matière</label>
                  <div className="relative">
                    <select 
                      required
                      disabled={!modalFormData.classe_id || isLoadingClassMatieres}
                      value={modalFormData.matiere_id}
                      onChange={e => setModalFormData({...modalFormData, matiere_id: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <option value="">Sélectionner une matière</option>
                      {classMatieres.map((m: any) => (
                        <option key={m.matiere_id} value={m.matiere_id}>{m.matiere_nom}</option>
                      ))}
                    </select>
                    {isLoadingClassMatieres && (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-primary-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Trimestre</label>
                  <select 
                    value={modalFormData.trimestre || 1}
                    onChange={e => setModalFormData({...modalFormData, trimestre: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>Trimestre 1</option>
                    <option value={2}>Trimestre 2</option>
                    <option value={3}>Trimestre 3</option>
                  </select>
                </div>
              </div>

              {modalFormData.matiere_id && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Évaluations (Notes / 20)</h3>
                    {isLoadingExisting && <Loader2 size={16} className="animate-spin text-primary-600" />}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map((type) => (
                      <div key={type} className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">{type}</label>
                        <input 
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={notesInputs[type]}
                          onChange={e => setNotesInputs({...notesInputs, [type]: e.target.value})}
                          placeholder="-"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!modalFormData.eleve_id || !modalFormData.matiere_id}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Enregistrer tout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Rapid Entry Modal */}
      {showRapidEntryModal && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl my-4 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Saisie Rapide des Notes</h2>
                <p className="text-sm text-slate-500">Classe: {classes.find((c: any) => c.id === parseInt(selectedClasse))?.nom}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-2">
                  <Info size={14} />
                  <span>Astuce: Copiez-collez depuis Excel (Tabulation entre colonnes)</span>
                </div>
                <button onClick={() => setShowRapidEntryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Matière</label>
                <select 
                  value={selectedMatiereRapid}
                  onChange={e => setSelectedMatiereRapid(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Sélectionner une matière</option>
                  {classeDetails?.matieres?.map((m: any) => (
                    <option key={m.matiere_id} value={m.matiere_id}>{m.matiere_nom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Trimestre</label>
                <select 
                  value={selectedTrimestreRapid}
                  onChange={e => setSelectedTrimestreRapid(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value={1}>Trimestre 1</option>
                  <option value={2}>Trimestre 2</option>
                  <option value={3}>Trimestre 3</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Date d'évaluation</label>
                <input 
                  type="date"
                  value={rapidEntryDate}
                  onChange={e => setRapidEntryDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[200px]">Élève</th>
                    {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map(type => (
                      <th key={type} className="border border-slate-200 p-3 text-center w-24">{type}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapidEntryData.map((student, sIdx) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-200 p-3 font-medium sticky left-0 bg-white z-10">
                        {student.nom}
                      </td>
                      {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map(type => (
                        <td key={type} className="border border-slate-200 p-1">
                          <input 
                            type="text"
                            value={student.notes[type]}
                            onChange={e => {
                              const val = e.target.value.replace(',', '.');
                              if (!isNaN(parseFloat(val)) || val === '') {
                                const newData = [...rapidEntryData];
                                newData[sIdx].notes[type] = val;
                                setRapidEntryData(newData);
                              }
                            }}
                            onPaste={(e) => handlePasteGrades(e, sIdx, type)}
                            placeholder="-"
                            className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 transition-colors"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {rapidEntryData.length} élèves chargés.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRapidEntryModal(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleRapidSubmit}
                  disabled={isSavingRapid || !selectedMatiereRapid}
                  className="px-8 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingRapid ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enregistrer toutes les notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Modal */}
      {showGridModal && classeDetails && (() => {
        const sortedMatieres: any[] = [];
        const parents = (classeDetails?.matieres || []).filter((m: any) => !m.parent_id);
        const children = (classeDetails?.matieres || []).filter((m: any) => m.parent_id);

        parents.forEach((p: any) => {
          const subMatieres = children.filter((c: any) => c.parent_id === p.matiere_id);
          if (subMatieres.length > 0) {
            // If it has children, only show children
            subMatieres.forEach((s: any) => {
              sortedMatieres.push(s);
            });
          } else {
            // If no children, show the parent itself
            sortedMatieres.push(p);
          }
        });

        // Add orphaned children
        children.forEach((c: any) => {
          if (!parents.find((p: any) => p.matiere_id === c.parent_id)) {
            sortedMatieres.push(c);
          }
        });

        return (
          <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full h-full max-w-[95vw] max-h-[95vh] rounded-3xl shadow-2xl my-4 overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{viewMode === 'grid' ? 'Grille des Notes' : 'Statistiques'} - Trimestre {selectedTrimestre}</h2>
                <p className="text-slate-500">{classes.find((c: any) => c.id === parseInt(selectedClasse))?.nom}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-200 p-1 rounded-xl mr-4">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Grille
                  </button>
                  <button 
                    onClick={() => setViewMode('stats')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'stats' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Statistiques
                  </button>
                </div>
                {viewMode === 'stats' ? (
                  <button 
                    onClick={generateStatsPDF}
                    className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                    <Download size={20} />
                    Télécharger les statistiques
                  </button>
                ) : (
                  <button 
                    onClick={generateAllBulletins}
                    className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                    <FileText size={20} />
                    Générer tous les bulletins
                  </button>
                )}
                <button onClick={() => setShowGridModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {viewMode === 'grid' ? (
                <table className="w-full border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 sticky left-0 z-20 min-w-[200px]">Élèves</th>
                      <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 sticky left-[200px] z-20 min-w-[120px]">Bulletins</th>
                      <th rowSpan={2} className="border border-slate-200 bg-primary-600 text-white p-2 sticky left-[320px] z-20 min-w-[100px]">Moy. Gén.</th>
                      {selectedTrimestre === 3 && (
                        <>
                          <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 min-w-[80px]">Moy. T1</th>
                          <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 min-w-[80px]">Moy. T2</th>
                          <th rowSpan={2} className="border border-slate-200 bg-indigo-600 text-white p-2 min-w-[100px]">Moy. Ann.</th>
                          <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 min-w-[100px]">Décision</th>
                        </>
                      )}
                      {sortedMatieres.map((m: any) => {
                        const hasChildren = (classeDetails?.matieres || []).some((other: any) => other.parent_id === m.matiere_id);
                        const isChild = !!m.parent_id;
                        
                        if (hasChildren) {
                          const subMatieres = (classeDetails?.matieres || []).filter((c: any) => c.parent_id === m.matiere_id);
                          return (
                            <th key={m.matiere_id} colSpan={9 * subMatieres.length} className="border border-slate-200 bg-primary-50 p-2 text-center">
                              <div className="flex flex-col items-center justify-center h-full">
                                <span className="rotate-0">{m.matiere_nom}</span>
                              </div>
                            </th>
                          );
                        }
                        if (isChild) {
                          return (
                            <th key={m.matiere_id} colSpan={9} className="border border-slate-200 bg-slate-50 p-2 text-center text-[10px]">
                              {m.matiere_nom}
                            </th>
                          );
                        }
                        return (
                          <th key={m.matiere_id} colSpan={9} className="border border-slate-200 bg-primary-50 p-2 text-center">
                            {m.matiere_nom}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {sortedMatieres.map((m: any) => {
                        const hasChildren = (classeDetails?.matieres || []).some((other: any) => other.parent_id === m.matiere_id);
                        if (hasChildren) return null; // Headers are handled by children

                        return (
                          <React.Fragment key={m.matiere_id}>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I1</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I2</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I3</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I4</th>
                            <th className="border border-slate-200 bg-amber-50 p-1 text-center w-12 font-bold text-amber-700">MI</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">D1</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">D2</th>
                            <th className="border border-slate-200 bg-blue-50 p-1 text-center w-12 font-bold text-blue-700">Moy</th>
                            <th className="border border-slate-200 bg-indigo-50 p-1 text-center w-12 font-bold text-indigo-700 border-r-[3px] border-r-slate-400">Moy C.</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...classeDetails.eleves].sort((a: any, b: any) => a.nom.localeCompare(b.nom)).map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-2 font-medium sticky left-0 bg-white z-10 border-r-[3px] border-r-slate-400">
                          {e.nom} {e.prenom}
                        </td>
                        <td className="border border-slate-200 p-2 sticky left-[200px] bg-white z-10 border-r-[3px] border-r-slate-400">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => generateBulletin(e, false)}
                              className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                              title="Télécharger"
                            >
                              <Download size={14} />
                            </button>
                            <button 
                              onClick={() => generateBulletin(e, true)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Afficher"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                        {(() => {
                          const studentGrades = calculateStudentGrades(e.id, classeDetails.notes, classeDetails.matieres, selectedTrimestre || 1);
                          return (
                            <>
                              <td className="border border-slate-200 p-2 sticky left-[320px] bg-primary-50 z-10 font-bold text-primary-700 text-center border-r-[3px] border-r-slate-400">
                                {studentGrades.globalMoy.toFixed(2)}
                              </td>
                              {selectedTrimestre === 3 && (
                                <>
                                  <td className="border border-slate-200 p-2 text-center bg-slate-50">{studentGrades.t1.toFixed(2)}</td>
                                  <td className="border border-slate-200 p-2 text-center bg-slate-50">{studentGrades.t2.toFixed(2)}</td>
                                  <td className="border border-slate-200 p-2 text-center bg-indigo-50 font-bold text-indigo-700">{studentGrades.annualMoy.toFixed(2)}</td>
                                  <td className="border border-slate-200 p-2 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${studentGrades.annualMoy >= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {studentGrades.annualMoy >= 10 ? 'Passage' : 'Redouble'}
                                    </span>
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                        {sortedMatieres.map((m: any) => {
                          const hasChildren = (classeDetails?.matieres || []).some((other: any) => other.parent_id === m.matiere_id);
                          if (hasChildren) return null;

                          const getNote = (type: string) => {
                            const noteObj = classeDetails.notes.find((n: any) => 
                              n.eleve_id === e.id && 
                              n.matiere_id === m.matiere_id && 
                              n.trimestre === selectedTrimestre &&
                              n.type_evaluation === type
                            );
                            return noteObj ? noteObj.note : null;
                          };

                          const i1 = getNote('I1');
                          const i2 = getNote('I2');
                          const i3 = getNote('I3');
                          const i4 = getNote('I4');
                          const d1 = getNote('Dev1');
                          const d2 = getNote('Dev2');

                          const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
                          const mi = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;

                          const components = [mi, d1, d2].filter(n => n !== null) as number[];
                          const moy = components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : null;
                          const moyCoef = moy !== null ? moy * (m.coefficient || 1) : null;

                          return (
                            <React.Fragment key={m.matiere_id}>
                              <td className="border border-slate-200 p-1 text-center">{i1 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i2 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i3 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i4 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-amber-50 font-bold text-amber-700">{mi !== null ? mi.toFixed(2) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{d1 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{d2 ?? '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-blue-50 font-bold text-blue-700">{moy !== null ? moy.toFixed(2) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-indigo-50 font-bold text-indigo-700 border-r-[3px] border-r-slate-400">{moyCoef !== null ? moyCoef.toFixed(2) : '-'}</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (() => {
                // Calculate Statistics
                const allGrades = classeDetails.eleves.map((e: any) => ({
                  ...e,
                  ...calculateStudentGrades(e.id, classeDetails.notes, classeDetails.matieres, selectedTrimestre || 1)
                }));

                const statsToUse = showAnnualStats && selectedTrimestre === 3 ? 
                  allGrades.map(s => ({ ...s, globalMoy: s.annualMoy })) : 
                  allGrades;

                const validMoys = statsToUse.map(s => s.globalMoy).filter(m => m > 0);
                const passCount = statsToUse.filter(s => s.globalMoy >= 10).length;
                const failCount = statsToUse.length - passCount;
                const passRate = statsToUse.length > 0 ? (passCount / statsToUse.length) * 100 : 0;

                const maleStudents = statsToUse.filter(s => s.sexe === 'M');
                const femaleStudents = statsToUse.filter(s => s.sexe === 'F');
                const malePassCount = maleStudents.filter(s => s.globalMoy >= 10).length;
                const femalePassCount = femaleStudents.filter(s => s.globalMoy >= 10).length;

                const distribution = [
                  { range: '0-5', count: statsToUse.filter(s => s.globalMoy < 5 && s.globalMoy > 0).length },
                  { range: '5-10', count: statsToUse.filter(s => s.globalMoy >= 5 && s.globalMoy < 10).length },
                  { range: '10-12', count: statsToUse.filter(s => s.globalMoy >= 10 && s.globalMoy < 12).length },
                  { range: '12-14', count: statsToUse.filter(s => s.globalMoy >= 12 && s.globalMoy < 14).length },
                  { range: '14-16', count: statsToUse.filter(s => s.globalMoy >= 14 && s.globalMoy < 16).length },
                  { range: '16-20', count: statsToUse.filter(s => s.globalMoy >= 16).length },
                ];

                const subjectStats = sortedMatieres.map(m => {
                  const subjectMoys = statsToUse.map(s => {
                    if (showAnnualStats && selectedTrimestre === 3) {
                      return s.annualSubjectsGrades.find((ss: any) => ss.matiere_id === m.matiere_id)?.moy;
                    }
                    const sg = s.subjectsGrades.find((ss: any) => ss.matiere_id === m.matiere_id);
                    return sg ? sg.moy : null;
                  }).filter(m => m !== null) as number[];

                  const avg = subjectMoys.length > 0 ? subjectMoys.reduce((a, b) => a + b, 0) / subjectMoys.length : 0;
                  const pass = subjectMoys.filter(m => m >= 10).length;
                  const rate = subjectMoys.length > 0 ? (pass / subjectMoys.length) * 100 : 0;

                  return {
                    name: m.matiere_nom,
                    average: parseFloat(avg.toFixed(2)),
                    passRate: parseFloat(rate.toFixed(2))
                  };
                });

                const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

                return (
                  <div className="space-y-8 pb-12">
                    {selectedTrimestre === 3 && (
                      <div className="flex justify-center mb-6">
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                          <button
                            onClick={() => setShowAnnualStats(false)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!showAnnualStats ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Trimestre 3
                          </button>
                          <button
                            onClick={() => setShowAnnualStats(true)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${showAnnualStats ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Bilan Annuel
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Effectif</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{allGrades.length}</div>
                        <div className="text-xs text-slate-500 mt-1">{maleStudents.length} Garçons / {femaleStudents.length} Filles</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Taux de Réussite</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-600">{passRate.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500 mt-1">{passCount} admis sur {allGrades.length}</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Moyenne Classe</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                          {(validMoys.reduce((a, b) => a + b, 0) / (validMoys.length || 1)).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Sur 20</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Extrêmes</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-emerald-600">{validMoys.length > 0 ? Math.max(...validMoys).toFixed(2) : '-'}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-2xl font-bold text-red-600">{validMoys.length > 0 ? Math.min(...validMoys).toFixed(2) : '-'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Plus forte / Plus faible</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Distribution Chart */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <BarChart3 size={20} className="text-primary-600" />
                          Distribution des Moyennes
                        </h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                              />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Nombre d'élèves" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gender Success Rate */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <PieChartIcon size={20} className="text-primary-600" />
                          Réussite par Sexe
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-2xl">
                            <span className="text-sm font-bold text-blue-600 uppercase mb-2">Garçons</span>
                            <div className="text-4xl font-bold text-blue-900">
                              {maleStudents.length > 0 ? ((malePassCount / maleStudents.length) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="text-xs text-blue-600 mt-1">{malePassCount} admis / {maleStudents.length}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-6 bg-pink-50 rounded-2xl">
                            <span className="text-sm font-bold text-pink-600 uppercase mb-2">Filles</span>
                            <div className="text-4xl font-bold text-pink-900">
                              {femaleStudents.length > 0 ? ((femalePassCount / femaleStudents.length) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="text-xs text-pink-600 mt-1">{femalePassCount} admises / {femaleStudents.length}</span>
                          </div>
                        </div>
                        <div className="mt-8 h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Admis', value: passCount },
                                  { name: 'Échecs', value: failCount }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Subject Performance */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-600" />
                        Performance par Matière
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-3 font-medium">Matière</th>
                              <th className="px-6 py-3 font-medium text-center">Moyenne</th>
                              <th className="px-6 py-3 font-medium text-center">Taux de Réussite</th>
                              <th className="px-6 py-3 font-medium">Progression</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {subjectStats.map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.name}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-bold ${s.average >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {s.average.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-bold ${s.passRate >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {s.passRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${s.passRate >= 70 ? 'bg-emerald-500' : s.passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${s.passRate}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

