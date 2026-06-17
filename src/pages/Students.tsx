import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { Plus, Search, Filter, MoreVertical, UserPlus, UserCheck, GraduationCap, Phone, MapPin, ArrowRightLeft, X, Edit2, Eye, Camera, Trash2, CreditCard, Printer, FileText, Download, ShieldCheck, Key } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import * as XLSX from 'xlsx';
import { Mail } from 'lucide-react';

export default function Students() {
  const { confirm } = useConfirm();
  const [eleves, setEleves] = React.useState([]);
  const [classes, setClasses] = React.useState([]);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importWorkbook, setImportWorkbook] = React.useState<any>(null);
  const [importClasseId, setImportClasseId] = React.useState('');
  const [importSheetName, setImportSheetName] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [parentAccount, setParentAccount] = React.useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = React.useState<number[]>([]);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [showAccountsModal, setShowAccountsModal] = React.useState(false);
  const [generatedAccounts, setGeneratedAccounts] = React.useState<any[]>([]);
  const [generationErrors, setGenerationErrors] = React.useState<any[]>([]);
  const [isGeneratingAccounts, setIsGeneratingAccounts] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [newClasseId, setNewClasseId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedClassFilter, setSelectedClassFilter] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const excelInputRef = React.useRef<HTMLInputElement>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/eleves' : p.path === '/eleves'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));
  
  const [formData, setFormData] = React.useState({
    matricule: '',
    nom: '',
    prenom: '',
    sexe: 'M',
    date_naissance: '',
    classe_id: '',
    nom_parent: '',
    tel_parent: '',
    email_parent: '',
    adresse: '',
    photo: '',
    statut: 'Passant',
    provenance: 'Nouveau'
  });

  const [paymentFormData, setPaymentFormData] = React.useState({
    eleve_id: '',
    type_paiement: 'Frais d\'inscription',
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0]
  });

  const fetchEleves = () => {
    apiFetch('/api/eleves')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEleves(data);
        } else {
          setEleves([]);
        }
      })
      .catch(() => setEleves([]));
  };

  const fetchSchoolInfo = () => {
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
  };

  React.useEffect(() => {
    fetchEleves();
    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(() => setClasses([]));
    fetchSchoolInfo();
  }, []);

  const resetForm = () => {
    setFormData({
      matricule: '', nom: '', prenom: '', sexe: 'M', date_naissance: '',
      classe_id: '', nom_parent: '', tel_parent: '', email_parent: '', adresse: '', photo: '', statut: 'Passant', provenance: 'Nouveau'
    });
    setIsEditing(false);
    setSelectedStudent(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Matricule': 'MAT001',
        'Nom': 'DOE',
        'Prénom': 'John',
        'Sexe': 'M',
        'Classe': '6ème A',
        'Date de Naissance': '01/01/2010',
        'Adresse': 'Quartier Latin, Lomé',
        'Nom du Parent': 'DOE Senior',
        'Téléphone du Parent': '90000000',
        'Email du Parent': 'parent@example.com',
        'Statut Académique': 'Passant',
        'Provenance': 'Nouveau'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Eleves");
    XLSX.writeFile(wb, "template_import_eleves.xlsx");
  };

  const [openPaymentAfterSave, setOpenPaymentAfterSave] = React.useState(false);
  
  const handleSubmit = (e: React.FormEvent, shouldOpenPayment = false) => {
    if (e) e.preventDefault();
    const url = isEditing ? `/api/eleves/${selectedStudent.id}` : '/api/eleves';
    const method = isEditing ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then((data) => {
      setShowModal(false);
      fetchEleves();
      
      // If it was a new registration, we might want to offer payment
      if (!isEditing && data.id) {
        setPaymentFormData(prev => ({ ...prev, eleve_id: data.id.toString() }));
        if (shouldOpenPayment || openPaymentAfterSave) {
          setShowPaymentModal(true);
        }
      }
      resetForm();
      setOpenPaymentAfterSave(false);
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const p = lastPayment;
    const s = schoolInfo;

    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 20, 15, 25, 25);
    }
    doc.setFontSize(20);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(s?.nom || 'Établissement Scolaire', 50, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(s?.slogan || '', 50, 32);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 50, 38);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 50, 43);

    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);

    // Receipt Info
    doc.setFontSize(16);
    doc.text('REÇU DE PAIEMENT', 105, 65, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`N° Reçu: ${p.id || 'N/A'}`, 150, 65);
    doc.text(`Date: ${p.date_paiement}`, 150, 70);

    // Student Info
    doc.setFontSize(12);
    doc.text('INFORMATIONS ÉLÈVE', 20, 85);
    doc.setFontSize(10);
    doc.text(`Nom & Prénom: ${p.eleve_nom} ${p.eleve_prenom}`, 20, 95);
    doc.text(`Matricule: ${p.eleve_matricule}`, 20, 102);
    doc.text(`Classe: ${p.eleve_classe}`, 20, 109);

    // Payment Details
    autoTable(doc, {
      startY: 120,
      head: [['Désignation', 'Montant Payé']],
      body: [[p.type_paiement, `${p.montant} FCFA`]],
      theme: 'grid',
      headStyles: { fillColor: rgb as any }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Summary
    doc.setFontSize(11);
    doc.text(`Reste à payer (Scolarité): ${p.reste_scolarite} FCFA`, 20, finalY + 15);
    doc.text(`Reste à payer (Inscription): ${p.reste_inscription} FCFA`, 20, finalY + 22);
    doc.text(`Frais d'inscription: ${p.inscription_payee ? 'PAYÉS' : 'NON PAYÉS'}`, 20, finalY + 29);

    doc.setFontSize(10);
    doc.text('Signature du Comptable', 140, finalY + 50);
    
    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDF();
    doc.autoPrint();
    const dataUri = doc.output('datauristring');
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe width='100%' height='100%' src='${dataUri}'></iframe>`);
    }
  };

  const handleSavePDF = () => {
    const doc = generatePDF();
    doc.save(`recu_${lastPayment.eleve_nom}_${lastPayment.id}.pdf`);
  };

  const handlePrintList = () => {
    const doc = new jsPDF();
    const s = schoolInfo;
    const title = "Liste des Élèves";
    
    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 14, 10, 20, 20);
    }
    doc.setFontSize(16);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(s?.nom || 'Établissement Scolaire', 40, 18);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 40, 23);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 40, 27);
    
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.line(14, 32, 196, 32);
    
    doc.setFontSize(14);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(title, 105, 42, { align: 'center' });
    
    const filteredEleves = eleves
      .filter((eleve: any) => {
        const matchesSearch = 
          (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClassFilter === '' || eleve.classe_id.toString() === selectedClassFilter;
        return matchesSearch && matchesClass;
      })
      .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

    const tableData = filteredEleves.map((e: any, index: number) => [
      index + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      e.sexe,
      e.classe_nom || 'N/A',
      e.tel_parent || 'N/A',
      `${e.statut || 'Passant'} (${e.provenance || 'Nouveau'})`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Classe', 'Parent', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: rgb as any },
      styles: { fontSize: 8 }
    });

    doc.autoPrint();
    const dataUri = doc.output('datauristring');
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe width='100%' height='100%' src='${dataUri}'></iframe>`);
    }
  };

  const handleSaveListPDF = () => {
    const doc = new jsPDF();
    const s = schoolInfo;
    const title = "Liste des Élèves";
    
    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 14, 10, 20, 20);
    }
    doc.setFontSize(16);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(s?.nom || 'Établissement Scolaire', 40, 18);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 40, 23);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 40, 27);
    
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.line(14, 32, 196, 32);
    
    doc.setFontSize(14);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(title, 105, 42, { align: 'center' });
    
    const filteredEleves = eleves
      .filter((eleve: any) => {
        const matchesSearch = 
          (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClassFilter === '' || eleve.classe_id.toString() === selectedClassFilter;
        return matchesSearch && matchesClass;
      })
      .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

    const tableData = filteredEleves.map((e: any, index: number) => [
      index + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      e.sexe,
      e.classe_nom || 'N/A',
      e.tel_parent || 'N/A',
      `${e.statut || 'Passant'} (${e.provenance || 'Nouveau'})`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Classe', 'Parent', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: rgb as any },
      styles: { fontSize: 8 }
    });

    doc.save(`liste_eleves_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apiFetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentFormData)
    })
    .then(res => res.json())
    .then((data) => {
      setShowPaymentModal(false);
      
      // Find the student for the receipt
      const student = eleves.find((e: any) => e.id === parseInt(paymentFormData.eleve_id));
      setLastPayment({
        ...paymentFormData,
        id: data.id,
        eleve_nom: student?.nom,
        eleve_prenom: student?.prenom,
        eleve_matricule: student?.matricule,
        eleve_classe: student?.classe_nom,
        reste_scolarite: (student?.frais_scolarite || 0) - (student?.total_paye_scolarite || 0) - (paymentFormData.type_paiement === 'Frais de scolarité' ? parseInt(paymentFormData.montant) : 0),
        reste_inscription: (student?.frais_inscription || 0) - (student?.total_paye_inscription || 0) - (paymentFormData.type_paiement === "Frais d'inscription" ? parseInt(paymentFormData.montant) : 0),
        inscription_payee: (student?.total_paye_inscription || 0) + (paymentFormData.type_paiement === "Frais d'inscription" ? parseInt(paymentFormData.montant) : 0) >= (student?.frais_inscription || 0)
      });
      setShowReceipt(true);

      setPaymentFormData({
        eleve_id: '', type_paiement: 'Frais d\'inscription', montant: '',
        date_paiement: new Date().toISOString().split('T')[0]
      });
      alert('Paiement enregistré avec succès');
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newClasseId) return;

    apiFetch('/api/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eleve_id: selectedStudent.id,
        nouvelle_classe_id: newClasseId
      })
    }).then(() => {
      setShowTransferModal(false);
      setSelectedStudent(null);
      setNewClasseId('');
      fetchEleves();
    });
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer l\'élève',
      message: 'Êtes-vous sûr de vouloir supprimer cet élève ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      type: 'danger'
    });
    
    if (ok) {
      apiFetch(`/api/eleves/${id}`, { method: 'DELETE' }).then(() => {
        fetchEleves();
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleStudentSelection = (id: number) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    const visibleStudentIds = eleves
      .filter((eleve: any) => {
        const matchesSearch = 
          (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClassFilter === '' || eleve.classe_id.toString() === selectedClassFilter;
        return matchesSearch && matchesClass;
      })
      .map((e: any) => e.id);
    
    if (selectedStudents.length === visibleStudentIds.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(visibleStudentIds);
    }
  };

  const handleGenerateAccounts = async () => {
    if (selectedStudents.length === 0) return;
    
    const ok = await confirm({
      title: 'Générer des comptes',
      message: `Voulez-vous générer des comptes pour les ${selectedStudents.length} élèves sélectionnés ?`,
      confirmText: 'Générer',
      type: 'info'
    });

    if (!ok) return;

    setIsGeneratingAccounts(true);
    apiFetch('/api/eleves/generate-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: selectedStudents })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setGeneratedAccounts(data.results || []);
        setGenerationErrors(data.errors || []);
        setShowAccountsModal(true);
      } else {
        alert("Erreur lors de la génération des comptes: " + data.error);
      }
    })
    .catch(err => {
      console.error("Error generating accounts:", err);
      alert("Erreur réseau");
    })
    .finally(() => setIsGeneratingAccounts(false));
  };

  React.useEffect(() => {
    if (showDetailsModal && selectedStudent) {
      apiFetch(`/api/eleves/${selectedStudent.id}/parent-account`)
        .then(res => res.json())
        .then(data => setParentAccount(data.identifier))
        .catch(err => console.error("Error fetching parent account:", err));
    } else {
      setParentAccount(null);
    }
  }, [showDetailsModal, selectedStudent]);

  const openEditModal = (eleve: any) => {
    setSelectedStudent(eleve);
    setFormData({
      matricule: eleve.matricule ?? '',
      nom: eleve.nom ?? '',
      prenom: eleve.prenom ?? '',
      sexe: eleve.sexe ?? 'M',
      date_naissance: eleve.date_naissance ?? '',
      classe_id: eleve.classe_id ?? '',
      nom_parent: eleve.nom_parent ?? '',
      tel_parent: eleve.tel_parent ?? '',
      email_parent: eleve.email_parent ?? '',
      adresse: eleve.adresse ?? '',
      photo: eleve.photo ?? ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-primary-400">
            <div className="p-2 bg-primary-500 rounded-full">
              <UserPlus size={24} />
            </div>
            <span className="font-bold text-lg">Inscrit avec succès</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Élèves</h1>
          <p className="text-slate-500">Consultez et gérez la liste de tous les élèves inscrits.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <>
              <button 
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                Inscrire un élève
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <FileText size={20} />
                Importer élèves
              </button>
            </>
          )}
          {selectedStudents.length > 0 && (
            <>
              <button 
                onClick={() => setShowEmailModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
              >
                <Mail size={20} />
                Envoyer Email ({selectedStudents.length})
              </button>
              <button 
                onClick={handleGenerateAccounts}
                disabled={isGeneratingAccounts}
                className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100 disabled:opacity-50"
              >
                <ShieldCheck size={20} />
                {isGeneratingAccounts ? 'Génération...' : 'Générer Comptes'}
              </button>
              <button 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Marquer comme Nouveaux',
                    message: `Voulez-vous marquer les ${selectedStudents.length} élèves sélectionnés comme "Nouveaux" (Provenance) ?`,
                    confirmText: 'Confirmer',
                    type: 'info'
                  });
                  if (ok) {
                    Promise.all(selectedStudents.map(id => 
                      apiFetch(`/api/eleves/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...eleves.find((e: any) => e.id === id), provenance: 'Nouveau' })
                      })
                    )).then(() => {
                      fetchEleves();
                      setSelectedStudents([]);
                    });
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                <UserPlus size={20} />
                Marquer Nouveaux
              </button>
              <button 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Marquer comme Anciens',
                    message: `Voulez-vous marquer les ${selectedStudents.length} élèves sélectionnés comme "Anciens" (Provenance) ?`,
                    confirmText: 'Confirmer',
                    type: 'info'
                  });
                  if (ok) {
                    Promise.all(selectedStudents.map(id => 
                      apiFetch(`/api/eleves/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...eleves.find((e: any) => e.id === id), provenance: 'Ancien' })
                      })
                    )).then(() => {
                      fetchEleves();
                      setSelectedStudents([]);
                    });
                  }
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
              >
                <UserCheck size={20} />
                Marquer Anciens
              </button>
              <button 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Marquer Passants',
                    message: `Voulez-vous marquer les ${selectedStudents.length} élèves sélectionnés comme "Passants" (Statut Académique) ?`,
                    confirmText: 'Confirmer',
                    type: 'info'
                  });
                  if (ok) {
                    Promise.all(selectedStudents.map(id => 
                      apiFetch(`/api/eleves/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...eleves.find((e: any) => e.id === id), statut: 'Passant' })
                      })
                    )).then(() => {
                      fetchEleves();
                      setSelectedStudents([]);
                    });
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                <ArrowRightLeft size={20} />
                Passants
              </button>
              <button 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Marquer Redoublants',
                    message: `Voulez-vous marquer les ${selectedStudents.length} élèves sélectionnés comme "Redoublants" (Statut Académique) ?`,
                    confirmText: 'Confirmer',
                    type: 'info'
                  });
                  if (ok) {
                    Promise.all(selectedStudents.map(id => 
                      apiFetch(`/api/eleves/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...eleves.find((e: any) => e.id === id), statut: 'Redoublant' })
                      })
                    )).then(() => {
                      fetchEleves();
                      setSelectedStudents([]);
                    });
                  }
                }}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
              >
                <ArrowRightLeft size={20} className="rotate-180" />
                Redoublants
              </button>
              <button 
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Supprimer les élèves',
                    message: `Voulez-vous vraiment supprimer les ${selectedStudents.length} élèves sélectionnés ? Cette action est irréversible.`,
                    confirmText: 'Supprimer',
                    type: 'danger'
                  });
                  if (ok) {
                    Promise.all(selectedStudents.map(id => 
                      apiFetch(`/api/eleves/${id}`, {
                        method: 'DELETE'
                      })
                    )).then(() => {
                      fetchEleves();
                      setSelectedStudents([]);
                    });
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
              >
                <Trash2 size={20} />
                Supprimer
              </button>
            </>
          )}
          <button 
            onClick={selectAllStudents}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            {selectedStudents.length > 0 ? 'Désélectionner tout' : 'Tout sélectionner'}
          </button>
          <button 
            onClick={handlePrintList}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            <Printer size={20} />
            Imprimer
          </button>
          <button 
            onClick={handleSaveListPDF}
            className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-100 transition-colors"
          >
            <Download size={20} />
            PDF
          </button>
          <button 
            onClick={downloadTemplate}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            <Download size={20} />
            Template
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par nom, matricule..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eleves
          .filter((eleve: any) => {
            const matchesSearch = 
              (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
              (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesClass = selectedClassFilter === '' || eleve.classe_id.toString() === selectedClassFilter;
            
            return matchesSearch && matchesClass;
          })
          .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
          .map((eleve: any) => (
            <div 
              key={eleve.id} 
              onClick={() => toggleStudentSelection(eleve.id)}
              className={`bg-white p-5 rounded-2xl border transition-all relative group cursor-pointer ${
                selectedStudents.includes(eleve.id) 
                  ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' 
                  : 'border-slate-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="absolute top-4 right-4 flex flex-col gap-1 items-center" onClick={e => e.stopPropagation()}>
                <div className="relative group/menu">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <MoreVertical size={18} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 hidden group-hover/menu:block">
                    {canWrite && (
                      <>
                        <button 
                          onClick={() => openEditModal(eleve)}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 size={14} /> Modifier
                        </button>
                        <button 
                          onClick={() => handleDelete(eleve.id)}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {canWrite && (
                  <button 
                    onClick={() => {
                      setSelectedStudent(eleve);
                      setShowTransferModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Transférer l'élève"
                  >
                    <ArrowRightLeft size={18} />
                  </button>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative group/photo">
                  {eleve.photo ? (
                    <img src={eleve.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserPlus size={32} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{eleve.nom} {eleve.prenom}</h3>
                  <p className="text-xs font-mono text-primary-600 mb-2">{eleve.matricule}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <GraduationCap size={14} />
                    <span>{eleve.classe_nom || 'Non assigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Phone size={14} />
                    <span>{eleve.tel_parent}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      eleve.provenance === 'Nouveau' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {eleve.provenance || 'Nouveau'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      eleve.statut === 'Passant' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {eleve.statut || 'Passant'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className="text-slate-500">Payé:</span>
                      <span className="text-primary-600 font-bold">{(eleve.total_paye || 0).toLocaleString()} {eleve.devise || 'FCFA'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className="text-slate-500">Reste:</span>
                      <span className={`${(eleve.frais_scolarite - (eleve.total_paye || 0)) > 0 ? 'text-red-500' : 'text-slate-500'} font-bold`}>
                        {(eleve.frais_scolarite - (eleve.total_paye || 0)).toLocaleString()} {eleve.devise || 'FCFA'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MapPin size={12} />
                  <span className="truncate max-w-[150px]">{eleve.adresse}</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStudent(eleve);
                    setShowDetailsModal(true);
                  }}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  Détails
                </button>
              </div>
            </div>
          ))}
      </div>

      {eleves.filter((eleve: any) => {
        const matchesSearch = 
          (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClassFilter === '' || eleve.classe_id.toString() === selectedClassFilter;
        return matchesSearch && matchesClass;
      }).length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <UserPlus size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400">Aucun élève ne correspond à votre recherche.</p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Importer des élèves</h2>
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
                      console.log("File input changed", e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("File selected:", file.name, file.type, file.size);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            console.log("File read successfully");
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                            setImportWorkbook(workbook);
                            if (workbook.SheetNames.length > 0) {
                              setImportSheetName(workbook.SheetNames[0]);
                            }
                          } catch (err) {
                            console.error("Error reading excel file:", err);
                            alert("Erreur lors de la lecture du fichier Excel. Assurez-vous qu'il s'agit d'un fichier valide.");
                          }
                        };
                        reader.onerror = (err) => {
                          console.error("FileReader error:", err);
                          alert("Erreur lors de la lecture du fichier.");
                        };
                        reader.readAsArrayBuffer(file);
                      }
                    }} 
                    className="sr-only" 
                    id="excel-upload"
                  />
                  <label 
                    htmlFor="excel-upload"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Classe de destination</label>
                      <select 
                        onChange={(e) => setImportClasseId(e.target.value)} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Choisir la classe</option>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
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
                  </div>

                  <button 
                    onClick={() => {
                      const sheet = importWorkbook.Sheets[importSheetName];
                      const data = XLSX.utils.sheet_to_json(sheet);
                      
                      const errors: string[] = [];
                      const mappedData = data.map((row: any, index: number) => {
                        const rowNum = index + 2; // +1 for header, +1 for 0-index
                        const matricule = row.Matricule || row.matricule;
                        const nom = row.Nom || row.nom;
                        const prenom = row.Prénom || row.prenom || row.Prenom;
                        const sexe = row.Sexe || row.sexe;
                        const rawDate = row['Date de Naissance'] || row.date_naissance;
                        const className = row.Classe || row.classe;

                        if (!matricule) errors.push(`Ligne ${rowNum}: Matricule manquant`);
                        if (!nom) errors.push(`Ligne ${rowNum}: Nom manquant`);
                        if (!prenom) errors.push(`Ligne ${rowNum}: Prénom manquant`);
                        if (!sexe) errors.push(`Ligne ${rowNum}: Sexe manquant`);

                        // Find class ID if provided in Excel
                        let rowClasseId = null;
                        if (className) {
                          const foundClass = classes.find((c: any) => c.nom.toLowerCase() === String(className).toLowerCase());
                          if (foundClass) {
                            rowClasseId = (foundClass as any).id;
                          } else {
                            errors.push(`Ligne ${rowNum}: Classe "${className}" non trouvée`);
                          }
                        } else if (!importClasseId) {
                          errors.push(`Ligne ${rowNum}: Classe manquante (et aucune classe de destination sélectionnée)`);
                        }

                        // Date validation and formatting
                        let formattedDate = '';
                        if (rawDate) {
                          if (rawDate instanceof Date) {
                            formattedDate = rawDate.toISOString().split('T')[0];
                          } else if (typeof rawDate === 'number') {
                            // Handle Excel serial date
                            const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                            formattedDate = date.toISOString().split('T')[0];
                          } else {
                            const dateStr = String(rawDate).trim();
                            const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                            const match = dateStr.match(dateRegex);
                            if (match) {
                              const [_, day, month, year] = match;
                              formattedDate = `${year}-${month}-${day}`;
                            } else {
                              // Try standard Date parsing
                              const d = new Date(dateStr);
                              if (!isNaN(d.getTime())) {
                                formattedDate = d.toISOString().split('T')[0];
                              } else {
                                errors.push(`Ligne ${rowNum}: Format de date invalide (attendu: jj/mm/aaaa ou format standard)`);
                              }
                            }
                          }
                        } else {
                          errors.push(`Ligne ${rowNum}: Date de naissance manquante`);
                        }

                        return {
                          matricule,
                          nom,
                          prenom,
                          sexe,
                          date_naissance: formattedDate,
                          nom_parent: row['Nom du Parent'] || row.nom_parent,
                          tel_parent: row['Téléphone du Parent'] || row.tel_parent,
                          email_parent: row['Email du Parent'] || row.email_parent,
                          statut: row['Statut Académique'] || row['Statut'] || row.statut || 'Passant',
                          provenance: row['Provenance'] || row.provenance || 'Nouveau',
                          adresse: row.Adresse || row.adresse,
                          classe_id: rowClasseId
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
                        Veuillez fournir toutes les informations indispensables (Matricule, Nom, Prénom, Sexe) dans votre fichier Excel.
                      </p>
                    </div>
                  )}

                  {importData.length > 0 && importErrors.length === 0 && (
                    <div className="space-y-4">
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                            <tr>
                              <th className="px-3 py-2">Matricule</th>
                              <th className="px-3 py-2">Nom & Prénom</th>
                              <th className="px-3 py-2">Sexe</th>
                              <th className="px-3 py-2">Classe</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {importData.slice(0, 5).map((row, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-mono text-primary-600">{row.matricule}</td>
                                <td className="px-3 py-2 text-slate-700">{row.nom} {row.prenom}</td>
                                <td className="px-3 py-2 text-slate-500">{row.sexe}</td>
                                <td className="px-3 py-2 text-slate-500">
                                  {row.classe_id ? classes.find((c: any) => c.id === row.classe_id)?.nom : classes.find((c: any) => String(c.id) === importClasseId)?.nom || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importData.length > 5 && (
                          <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-400 italic">
                            + {importData.length - 5} autres élèves
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          apiFetch('/api/eleves/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ classe_id: importClasseId, eleves: importData })
                          }).then(res => res.json()).then(() => {
                            setShowImportModal(false);
                            setImportWorkbook(null);
                            setImportData([]);
                            fetchEleves();
                            setShowSuccessBanner(true);
                            setTimeout(() => setShowSuccessBanner(false), 5000);
                          });
                        }} 
                        className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
                      >
                        Confirmer l'importation ({importData.length} élèves)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportWorkbook(null);
                  setImportData([]);
                  setImportErrors([]);
                }} 
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Fiche de l'élève</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                  {selectedStudent.photo ? (
                    <img src={selectedStudent.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserPlus size={48} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.nom} {selectedStudent.prenom}</h3>
                  <p className="text-primary-600 font-mono font-bold">{selectedStudent.matricule}</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full uppercase">
                    {selectedStudent.classe_nom}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sexe</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date de naissance</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.date_naissance || 'Non renseignée'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.nom_parent}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Téléphone Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.tel_parent}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.email_parent || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Provenance</p>
                  <p className={`text-sm font-bold ${selectedStudent.provenance === 'Nouveau' ? 'text-blue-600' : 'text-slate-600'}`}>
                    {selectedStudent.provenance || 'Nouveau'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Statut Académique</p>
                  <p className={`text-sm font-bold ${
                    selectedStudent.statut === 'Passant' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedStudent.statut || 'Passant'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Scolarité</p>
                  <p className="text-sm font-bold text-slate-900">{(selectedStudent.frais_scolarite || 0).toLocaleString()} {selectedStudent.devise || 'FCFA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Payé</p>
                  <p className="text-sm font-bold text-primary-600">{(selectedStudent.total_paye || 0).toLocaleString()} {selectedStudent.devise || 'FCFA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reste à payer</p>
                  <p className={`text-sm font-bold ${(selectedStudent.frais_scolarite - (selectedStudent.total_paye || 0)) > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {(selectedStudent.frais_scolarite - (selectedStudent.total_paye || 0)).toLocaleString()} {selectedStudent.devise || 'FCFA'}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adresse</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.adresse}</p>
                </div>
              </div>

              {/* Parent Account Info */}
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-primary-400 tracking-wider">Compte Parent</p>
                    {parentAccount ? (
                      <p className="text-sm font-bold text-slate-900">{parentAccount}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucun compte généré</p>
                    )}
                  </div>
                </div>
                {!parentAccount && (
                  <button 
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: 'Générer un compte',
                        message: 'Voulez-vous vraiment générer un compte parent pour cet élève ?',
                        type: 'info'
                      });
                      if (isConfirmed) {
                        apiFetch('/api/eleves/generate-accounts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ studentIds: [selectedStudent.id] })
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.results.length > 0) {
                            setParentAccount(data.results[0].identifier);
                            // We use alert here for display, but ideally this would be another result modal
                            alert(`Compte créé ! Identifiant: ${data.results[0].identifier}, Mot de passe: ${data.results[0].password}`);
                          } else {
                            alert("Erreur: " + (data.error || "Impossible de créer le compte"));
                          }
                        });
                      }
                    }}
                    className="px-3 py-1 bg-white text-primary-600 border border-primary-200 rounded-lg text-[10px] font-bold hover:bg-primary-50 transition-colors"
                  >
                    Générer
                  </button>
                )}
              </div>

              <div className="pt-6 border-t flex gap-3">
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedStudent);
                  }}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} /> Modifier
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Modal */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Key size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Comptes Générés</h2>
                  <p className="text-sm text-slate-500">Voici les identifiants pour les parents</p>
                </div>
              </div>
              <button onClick={() => setShowAccountsModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {generatedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-2">Aucun compte n'a été généré.</p>
                  {generationErrors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl text-left">
                      <p className="text-xs font-bold text-red-600 mb-2">Erreurs rencontrées :</p>
                      <ul className="text-[10px] text-red-500 list-disc list-inside">
                        {generationErrors.map((err: any, i: number) => (
                          <li key={i}>{err.student}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2">(Il est possible que les comptes existent déjà pour ces élèves)</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {generatedAccounts.map((account, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900">{account.student}</p>
                        <p className="text-xs text-slate-500">Identifiant: <span className="font-mono text-primary-600 font-bold">{account.identifier}</span></p>
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Mot de passe</p>
                        <p className="font-mono font-bold text-amber-600">{account.password}</p>
                      </div>
                    </div>
                  ))}
                  {generationErrors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-xs font-bold text-red-600 mb-1">Non générés ({generationErrors.length}) :</p>
                      <ul className="text-[10px] text-red-500 list-disc list-inside">
                        {generationErrors.map((err: any, i: number) => (
                          <li key={i}>{err.student}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => {
                  const content = generatedAccounts.map(a => `${a.student}\nID: ${a.identifier}\nPWD: ${a.password}`).join('\n\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'comptes_eleves.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Télécharger (.txt)
              </button>
              <button 
                onClick={() => setShowAccountsModal(false)}
                className="flex-1 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                  <Mail size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Envoyer un email groupé</h2>
                  <p className="text-sm text-slate-500">{selectedStudents.length} destinataire(s) sélectionné(s)</p>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
              const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value;
              
              const recipients = eleves
                .filter((e: any) => selectedStudents.includes(e.id) && e.email_parent)
                .map((e: any) => e.email_parent);

              if (recipients.length === 0) {
                alert("Aucun des élèves sélectionnés n'a d'email parent renseigné.");
                return;
              }

              apiFetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients, subject, body })
              })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  alert(data.message || 'Email envoyé avec succès !');
                  setShowEmailModal(false);
                  setSelectedStudents([]);
                } else {
                  alert('Erreur: ' + data.error);
                }
              });
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Sujet</label>
                <input 
                  name="subject"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Retard de paiement / Réunion parents-profs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Message</label>
                <textarea 
                  name="body"
                  required
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Écrivez votre message ici..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  Envoyer le message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedStudent && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Transférer l'élève</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                <p className="text-sm text-primary-800">
                  Vous allez transférer <strong>{selectedStudent.nom} {selectedStudent.prenom}</strong> de la classe <strong>{selectedStudent.classe_nom}</strong> vers une nouvelle classe.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nouvelle Classe</label>
                <select 
                  required
                  value={newClasseId}
                  onChange={e => setNewClasseId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner la nouvelle classe</option>
                  {classes.filter((c: any) => c.id !== selectedStudent.classe_id).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {isEditing ? 'Modifier l\'élève' : 'Nouvelle Inscription'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e)} className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden relative group"
                >
                  {formData.photo ? (
                    <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={32} className="text-slate-300 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ajouter photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matricule</label>
                  <input 
                    required
                    value={formData.matricule}
                    onChange={e => setFormData({...formData, matricule: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={formData.classe_id}
                    onChange={e => setFormData({...formData, classe_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sexe</label>
                  <select 
                    value={formData.sexe}
                    onChange={e => setFormData({...formData, sexe: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date de naissance</label>
                  <input 
                    value={formData.date_naissance}
                    onChange={e => setFormData({...formData, date_naissance: e.target.value})}
                    type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Provenance</label>
                  <select 
                    value={formData.provenance}
                    onChange={e => setFormData({...formData, provenance: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Nouveau">Nouveau dans l'école</option>
                    <option value="Ancien">Déjà dans l'école (Ancien)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut Académique</label>
                  <select 
                    value={formData.statut}
                    onChange={e => setFormData({...formData, statut: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Passant">Passant(e)</option>
                    <option value="Redoublant(e)">Redoublant(e)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-bold text-slate-800 mb-4">Informations Parentales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nom du parent</label>
                    <input 
                      value={formData.nom_parent}
                      onChange={e => setFormData({...formData, nom_parent: e.target.value})}
                      type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Téléphone parent</label>
                    <input 
                      value={formData.tel_parent}
                      onChange={e => setFormData({...formData, tel_parent: e.target.value})}
                      type="tel" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email parent</label>
                    <input 
                      value={formData.email_parent}
                      onChange={e => setFormData({...formData, email_parent: e.target.value})}
                      type="email" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                      placeholder="parent@example.com"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Adresse</label>
                    <textarea 
                      value={formData.adresse}
                      onChange={e => setFormData({...formData, adresse: e.target.value})}
                      rows={2} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    ></textarea>
                  </div>
                </div>
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
                  {isEditing ? 'Enregistrer les modifications' : 'Inscrire l\'élève'}
                </button>
              </div>
              
              {!isEditing && (
                <div className="pt-4 mt-4 border-t border-dashed border-slate-200">
                  <button 
                    type="button"
                    onClick={() => {
                      handleSubmit(null as any, true);
                    }}
                    className="w-full px-4 py-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    Inscrire et Encaisser un paiement
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceipt && lastPayment && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText size={24} className="text-primary-600" />
                Aperçu du Reçu
              </h2>
              <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="border-2 border-slate-100 rounded-2xl p-8 space-y-8 bg-white shadow-sm">
                {/* School Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {schoolInfo?.logo && (
                      <img src={schoolInfo.logo} alt="Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">{schoolInfo?.nom || 'Établissement Scolaire'}</h3>
                      <p className="text-xs italic text-slate-500">{schoolInfo?.slogan}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {schoolInfo?.adresse} • {schoolInfo?.telephone}<br/>
                        {schoolInfo?.email} • {schoolInfo?.site_web}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-primary-600 text-white px-4 py-1 rounded-lg text-xs font-bold mb-1">REÇU N° {lastPayment.id}</div>
                    <p className="text-[10px] text-slate-400">{lastPayment.date_paiement}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Élève</p>
                    <p className="text-sm font-bold text-slate-800">{lastPayment.eleve_nom} {lastPayment.eleve_prenom}</p>
                    <p className="text-xs text-slate-500">Matricule: {lastPayment.eleve_matricule}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe</p>
                    <p className="text-sm font-bold text-slate-800">{lastPayment.eleve_classe}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{lastPayment.type_paiement}</span>
                    <span className="text-sm font-black text-slate-900">{parseInt(lastPayment.montant).toLocaleString()} FCFA</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">TOTAL PAYÉ</span>
                    <span className="text-lg font-black text-primary-600">{parseInt(lastPayment.montant).toLocaleString()} FCFA</span>
                  </div>
                </div>

                {/* Balance & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-400 uppercase">Reste à payer</p>
                    <p className="text-sm font-black text-red-700">{(lastPayment.reste_scolarite + lastPayment.reste_inscription).toLocaleString()} FCFA</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${lastPayment.inscription_payee ? 'bg-primary-50 border-primary-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Frais d'inscription</p>
                    <p className={`text-sm font-black ${lastPayment.inscription_payee ? 'text-primary-700' : 'text-amber-700'}`}>
                      {lastPayment.inscription_payee ? 'PAYÉS' : 'NON PAYÉS'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <div className="text-center">
                    <div className="w-32 h-px bg-slate-200 mb-2" />
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Signature / Cachet</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all"
              >
                Fermer
              </button>
              <button 
                onClick={handlePrint}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                Imprimer
              </button>
              <button 
                onClick={handleSavePDF}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
              >
                <Download size={20} />
                Enregistrer PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Encaisser un paiement</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Élève</label>
                <select 
                  required
                  value={paymentFormData.eleve_id}
                  onChange={e => setPaymentFormData({...paymentFormData, eleve_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un élève</option>
                  {eleves.map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de paiement</label>
                <select 
                  value={paymentFormData.type_paiement}
                  onChange={e => setPaymentFormData({...paymentFormData, type_paiement: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Frais d'inscription">Frais d'inscription</option>
                  <option value="Frais de scolarité">Frais de scolarité</option>
                  <option value="Frais d'examen">Frais d'examen</option>
                  <option value="Autres frais">Autres frais</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant (FCFA)</label>
                <input 
                  required
                  value={paymentFormData.montant}
                  onChange={e => setPaymentFormData({...paymentFormData, montant: e.target.value})}
                  type="number" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de paiement</label>
                <input 
                  value={paymentFormData.date_paiement}
                  onChange={e => setPaymentFormData({...paymentFormData, date_paiement: e.target.value})}
                  type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Valider le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


