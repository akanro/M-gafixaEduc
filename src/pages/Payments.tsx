import { apiFetch } from '../utils/api';
import React from 'react';
import { Plus, CreditCard, History, AlertCircle, Search, Filter, X, ChevronLeft, Printer, FileText, Download } from 'lucide-react';
import fedapayLogo from '../Logo_Fedapay.png';
import kkiapayLogo from '../Logo_Kkiapay.jpg';
import { generateReceiptPDF } from '../utils/receipt';
import { formatClassName } from '../utils/format';
import toast from 'react-hot-toast';

export default function Payments() {
  const [paiements, setPaiements] = React.useState([]);
  const [eleves, setEleves] = React.useState([]);
  const [classStats, setClassStats] = React.useState([]);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [selectedClassDetails, setSelectedClassDetails] = React.useState<any>(null);
  const [studentSearch, setStudentSearch] = React.useState('');
  const [showStudentResults, setShowStudentResults] = React.useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/paiements' : p.path === '/paiements'));
  const canWrite = ['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [formData, setFormData] = React.useState({
    eleve_id: '',
    type_paiement: 'Frais de scolarité',
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    annee_id: '',
    methode: 'Espèces'
  });

  React.useEffect(() => {
    if (schoolInfo?.active_year_id) {
      setFormData(prev => ({ ...prev, annee_id: schoolInfo.active_year_id }));
    }
  }, [schoolInfo]);

  const [selectedClassId, setSelectedClassId] = React.useState('');
  const [classes, setClasses] = React.useState([]);
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    const handleKkiapaySuccess = async (response: any) => {
      try {
        const res = await apiFetch('/api/paiements/kkiapay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: response.transactionId,
            eleve_id: formData.eleve_id,
            type_paiement: formData.type_paiement,
            montant: formData.montant,
            date_paiement: formData.date_paiement
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Paiement Kkiapay validé avec succès !");
          setShowModal(false);
          fetchPaiements();
          fetchClassStats();
          apiFetch('/api/eleves').then(res => res.json()).then(setEleves);
        } else {
          toast.error(data.error || "Erreur lors de la validation Kkiapay");
        }
      } catch (err) {
        toast.error("Erreur de connexion lors de la validation");
      }
    };

    if (window && (window as any).addKkiapayListener) {
      (window as any).addKkiapayListener('success', handleKkiapaySuccess);
    }

    return () => {
      if (window && (window as any).removeKkiapayListener) {
        (window as any).removeKkiapayListener('success', handleKkiapaySuccess);
      }
    };
  }, [formData]);

  const fetchPaiements = () => {
    apiFetch('/api/paiements')
      .then(res => res.json())
      .then(data => setPaiements(Array.isArray(data) ? data : []))
      .catch(() => setPaiements([]));
  };

  const fetchClassStats = () => {
    apiFetch('/api/stats/paiements-par-classe')
      .then(res => res.json())
      .then(data => setClassStats(Array.isArray(data) ? data : []))
      .catch(() => setClassStats([]));
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

  const fetchClasses = () => {
    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  };

  React.useEffect(() => {
    fetchPaiements();
    fetchClassStats();
    fetchSchoolInfo();
    fetchClasses();
    apiFetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
    apiFetch('/api/eleves')
      .then(res => res.json())
      .then(data => setEleves(Array.isArray(data) ? data : []))
      .catch(() => setEleves([]));
  }, []);

  const totalEncaisse = React.useMemo(() => {
    return paiements
      .filter((p: any) => p.status === 'Terminé' || p.status === 'completed')
      .reduce((sum, p: any) => sum + p.montant, 0);
  }, [paiements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.methode === 'Kkiapay') {
      if (!schoolInfo?.kkiapay_public_key) {
        toast.error("Kkiapay n'est pas configuré. Veuillez renseigner votre clé publique dans Infos École.");
        return;
      }

      if (!(window as any).openKkiapayWidget) {
        toast.error("Le module Kkiapay n'est pas chargé. Veuillez vérifier votre connexion.");
        return;
      }

      (window as any).openKkiapayWidget({
        amount: Number(formData.montant),
        position: "center",
        callback: "",
        sandbox: schoolInfo.kkiapay_mode !== 'live',
        key: schoolInfo.kkiapay_public_key,
        theme: "#10b981",
        data: `${formData.type_paiement} - ${formData.eleve_id}`
      });
      return;
    }

    if (formData.methode === 'Online') {
      try {
        const student = eleves.find((e: any) => e.id === parseInt(formData.eleve_id));
        const response = await apiFetch('/api/paiements/fedapay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, student_name: `${student.nom} ${student.prenom}` })
        });
        const data = await response.json();
        
        if (data.url) {
          window.open(data.url, '_blank');
          setShowModal(false);
          toast.success("Redirection vers la passerelle de paiement Fedapay en cours...");
          // Wait briefly, then re-fetch logic to update pending payment status.
          setTimeout(() => {
            fetchPaiements();
            fetchClassStats();
          }, 3000);
          return;
        } else {
          toast.error(data.error || 'Erreur lors de la création de la transaction Fedapay.');
          return;
        }
      } catch (error) {
        console.error("Fedapay error:", error);
        toast.error('Erreur de connexion à Fedapay.');
        return;
      }
    }

    apiFetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then((data) => {
      setShowModal(false);
      fetchPaiements();
      fetchClassStats();
      apiFetch('/api/eleves').then(res => res.json()).then(setEleves);
      
      // Find the student for the receipt
      const student = eleves.find((e: any) => e.id === parseInt(formData.eleve_id));
      setLastPayment({
        ...formData,
        id: data.id,
        eleve_nom: student?.nom,
        eleve_prenom: student?.prenom,
        eleve_matricule: student?.matricule,
        eleve_classe: student?.classe_nom,
        reste_scolarite: (student?.frais_scolarite || 0) - (student?.total_paye_scolarite || 0) - (formData.type_paiement === 'Frais de scolarité' ? (parseInt(formData.montant) || 0) : 0),
        reste_inscription: (student?.frais_inscription || 0) - (student?.total_paye_inscription || 0) - (formData.type_paiement === "Frais d'inscription" ? (parseInt(formData.montant) || 0) : 0),
        inscription_payee: (student?.total_paye_inscription || 0) + (formData.type_paiement === "Frais d'inscription" ? (parseInt(formData.montant) || 0) : 0) >= (student?.frais_inscription || 0)
      });
      setShowReceipt(true);

      setFormData({
        eleve_id: '', type_paiement: 'Frais de scolarité', montant: '',
        date_paiement: new Date().toISOString().split('T')[0], annee_id: schoolInfo?.active_year_id || '', methode: 'Espèces'
      });
      setStudentSearch('');
    });
  };

  const handlePrint = () => {
    const doc = generateReceiptPDF(lastPayment, schoolInfo);
    doc.autoPrint();
    const dataUri = doc.output('datauristring');
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe width='100%' height='100%' src='${dataUri}'></iframe>`);
    }
  };

  const handleSavePDF = () => {
    const doc = generateReceiptPDF(lastPayment, schoolInfo);
    doc.save(`recu_${lastPayment.eleve_nom}_${lastPayment.id}.pdf`);
  };


  const filteredEleves = eleves
    .filter((e: any) => {
      const matchesSearch = ((e.nom || '') + ' ' + (e.prenom || '')).toLowerCase().includes(studentSearch.toLowerCase()) ||
        (e.matricule || '').toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = selectedClassId ? e.classe_id === parseInt(selectedClassId) : true;
      return matchesSearch && matchesClass;
    })
    .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Paiements</h1>
          <p className="text-slate-500">Suivi des frais de scolarité et autres règlements.</p>
        </div>
        {canWrite && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            Enregistrer un paiement
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 border border-slate-800 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-primary-500/20 text-primary-400 rounded-xl flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Année en cours</p>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-1">Total Encaissé</p>
            <p className="text-3xl font-black text-white">{(stats?.totalRevenue || totalEncaisse).toLocaleString()} <span className="text-xs font-normal text-slate-400">FCFA</span></p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Détails des entrées</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-500 font-bold uppercase">Journalier</span>
                <span className="text-sm font-black text-slate-900">{(stats?.dailyRevenue || 0).toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-500 font-bold uppercase">Hebdomadaire</span>
                <span className="text-sm font-black text-slate-900">{(stats?.weeklyRevenue || 0).toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl border border-primary-100">
                <span className="text-xs text-primary-600 font-bold uppercase">Mensuel</span>
                <span className="text-sm font-black text-primary-700">{(stats?.monthlyRevenue || 0).toLocaleString()} <span className="text-[10px] font-normal">FCFA</span></span>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white text-red-600 rounded-xl flex items-center justify-center shadow-sm">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-bold text-red-900">Retards</h3>
            </div>
            <p className="text-2xl font-black text-red-700">
              {eleves.filter((e: any) => (e.frais_scolarite + e.frais_inscription) > (e.total_paye_scolarite + e.total_paye_inscription)).length} <span className="text-[10px] font-normal">Élèves</span>
            </p>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Paiement incomplet</p>
          </div>
        </div>

        {/* Class Summary Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-slate-400" />
              <h3 className="font-bold text-slate-800">Récapitulatif par classe</h3>
            </div>
          </div>
          
          {/* Mobile view for class stats */}
          <div className="md:hidden divide-y divide-slate-50">
            {classStats.map((c: any) => {
              const totalAttendu = c.nombre_eleves * (c.frais_scolarite + c.frais_inscription);
              const totalEncaisse = c.total_encaisse_scolarite + c.total_encaisse_inscription;
              const reste = totalAttendu - totalEncaisse;
              return (
                <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{formatClassName(c.nom)}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{c.nombre_eleves} élèves inscrits</p>
                    </div>
                    <button 
                      onClick={() => setSelectedClassDetails(c)}
                      className="text-xs bg-primary-50 text-primary-600 px-4 py-1.5 rounded-lg font-bold shadow-sm"
                    >
                      Détails
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Encaissé</p>
                      <p className="text-sm font-bold text-primary-600">{totalEncaisse.toLocaleString()} <span className="text-[10px]">{c.devise}</span></p>
                    </div>
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Reste</p>
                      <p className="text-sm font-bold text-red-500">{reste.toLocaleString()} <span className="text-[10px]">{c.devise}</span></p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop view for class stats */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Classe</th>
                  <th className="px-6 py-3 font-medium">Élèves</th>
                  <th className="px-6 py-3 font-medium">Total Attendu</th>
                  <th className="px-6 py-3 font-medium">Total Encaissé</th>
                  <th className="px-6 py-3 font-medium">Reste à percevoir</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classStats.map((c: any) => {
                  const totalAttendu = c.nombre_eleves * (c.frais_scolarite + c.frais_inscription);
                  const totalEncaisse = c.total_encaisse_scolarite + c.total_encaisse_inscription;
                  const reste = totalAttendu - totalEncaisse;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{formatClassName(c.nom)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{c.nombre_eleves}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{totalAttendu.toLocaleString()} {c.devise}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary-600">{totalEncaisse.toLocaleString()} {c.devise}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-500">{reste.toLocaleString()} {c.devise}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedClassDetails(c)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-lg font-bold transition-colors"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payments History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={20} className="text-slate-400" />
              <h3 className="font-bold text-slate-800">Historique des transactions</h3>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100">
                <Search size={18} />
              </button>
              <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100">
                <Filter size={18} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Élève</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Montant</th>
                  <th className="px-6 py-3 font-medium">Méthode</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paiements.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{p.nom} {p.prenom}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.type_paiement}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.montant.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.methode || "Espèces"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.status === 'Terminé' ? 'bg-green-100 text-green-700' : p.status === 'En cours' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status || 'Terminé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{p.date_paiement}</td>
                  </tr>
                ))}
                {paiements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      Aucun paiement enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Class Details Modal */}
      {selectedClassDetails && (
        <div className="fixed inset-0 z-[70] bg-slate-50 flex flex-col overflow-hidden">
          <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedClassDetails(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Détails des paiements : {selectedClassDetails.nom}</h2>
                <p className="text-sm text-slate-500">Liste des élèves et état de leurs dettes</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              {/* Mobile View for Student Details */}
              <div className="md:hidden space-y-4">
                {eleves
                  .filter((e: any) => e.classe_id === selectedClassDetails.id)
                  .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                  .map((e: any) => {
                    const resteScol = selectedClassDetails.frais_scolarite - e.total_paye_scolarite;
                    const resteInsc = selectedClassDetails.frais_inscription - e.total_paye_inscription;
                    const totalDu = resteScol + resteInsc;
                    
                    const studentPayments = paiements.filter((p: any) => 
                      p.eleve_id === e.id && 
                      (p.status === 'Terminé' || p.status === 'completed')
                    );
                    const lastStudentPayment = studentPayments.length > 0 ? studentPayments[0] : null;

                    return (
                      <div key={e.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800">{e.nom} {e.prenom}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{e.matricule}</p>
                          </div>
                          {lastStudentPayment && (
                            <button 
                              onClick={() => {
                                setLastPayment({
                                  ...lastStudentPayment,
                                  eleve_nom: e.nom,
                                  eleve_prenom: e.prenom,
                                  eleve_matricule: e.matricule,
                                  eleve_classe: selectedClassDetails.nom,
                                  reste_scolarite: resteScol,
                                  reste_inscription: resteInsc,
                                  inscription_payee: e.total_paye_inscription >= selectedClassDetails.frais_inscription
                                });
                                setShowReceipt(true);
                              }}
                              className="p-2 bg-primary-50 text-primary-600 rounded-xl"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Scolarité Payée</p>
                            <p className="text-sm font-bold text-primary-600">{e.total_paye_scolarite.toLocaleString()} <span className="text-[10px]">{selectedClassDetails.devise}</span></p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Inscription Payée</p>
                            <p className="text-sm font-bold text-blue-600">{e.total_paye_inscription.toLocaleString()} <span className="text-[10px]">{selectedClassDetails.devise}</span></p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Reste Scolarité</p>
                            <p className="text-sm font-bold text-red-500">{resteScol.toLocaleString()} <span className="text-[10px]">{selectedClassDetails.devise}</span></p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Reste Inscription</p>
                            <p className="text-sm font-bold text-red-500">{resteInsc.toLocaleString()} <span className="text-[10px]">{selectedClassDetails.devise}</span></p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Total Dû</span>
                          <span className="text-lg font-black text-slate-900">{totalDu.toLocaleString()} <span className="text-xs">{selectedClassDetails.devise}</span></span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Desktop View for Student Details */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-medium">Élève</th>
                      <th className="px-6 py-3 font-medium">Scolarité Payée</th>
                      <th className="px-6 py-3 font-medium">Inscription Payée</th>
                      <th className="px-6 py-3 font-medium">Reste Scolarité</th>
                      <th className="px-6 py-3 font-medium">Reste Inscription</th>
                      <th className="px-6 py-3 font-medium">Total Dû</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {eleves
                      .filter((e: any) => e.classe_id === selectedClassDetails.id)
                      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                      .map((e: any) => {
                        const resteScol = selectedClassDetails.frais_scolarite - e.total_paye_scolarite;
                      const resteInsc = selectedClassDetails.frais_inscription - e.total_paye_inscription;
                      const totalDu = resteScol + resteInsc;
                      
                      // Find last validated payment for this student to generate a receipt
                      const studentPayments = paiements.filter((p: any) => 
                        p.eleve_id === e.id && 
                        (p.status === 'Terminé' || p.status === 'completed')
                      );
                      const lastStudentPayment = studentPayments.length > 0 ? studentPayments[0] : null;

                      return (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700">{e.nom} {e.prenom}</td>
                          <td className="px-6 py-4 text-sm text-primary-600 font-bold">{e.total_paye_scolarite.toLocaleString()} {selectedClassDetails.devise}</td>
                          <td className="px-6 py-4 text-sm text-blue-600 font-bold">{e.total_paye_inscription.toLocaleString()} {selectedClassDetails.devise}</td>
                          <td className="px-6 py-4 text-sm text-red-500 font-bold">{resteScol.toLocaleString()} {selectedClassDetails.devise}</td>
                          <td className="px-6 py-4 text-sm text-red-500 font-bold">{resteInsc.toLocaleString()} {selectedClassDetails.devise}</td>
                          <td className="px-6 py-4 text-sm bg-slate-50 font-black text-slate-900">{totalDu.toLocaleString()} {selectedClassDetails.devise}</td>
                          <td className="px-6 py-4 text-right">
                            {lastStudentPayment ? (
                              <button 
                                onClick={() => {
                                  setLastPayment({
                                    ...lastStudentPayment,
                                    eleve_nom: e.nom,
                                    eleve_prenom: e.prenom,
                                    eleve_matricule: e.matricule,
                                    eleve_classe: selectedClassDetails.nom,
                                    reste_scolarite: resteScol,
                                    reste_inscription: resteInsc,
                                    inscription_payee: e.total_paye_inscription >= selectedClassDetails.frais_inscription
                                  });
                                  setShowReceipt(true);
                                }}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Voir le dernier reçu"
                              >
                                <FileText size={16} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Aucun paiement</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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
      {/* Students List with Installment Status */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">État des Tranches par Élève</h2>
          <div className="flex gap-2">
            <select 
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border-none rounded-xl text-xs px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Élève</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Tranche 1</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Tranche 2</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Tranche 3</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Reste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {eleves
                .filter((e: any) => !selectedClassId || String(e.classe_id) === selectedClassId)
                .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''))
                .map((e: any) => {
                  const totalPaye = e.total_paye_scolarite || 0;
                  const t1 = e.tranche1_montant || 0;
                  const t2 = e.tranche2_montant || 0;
                  const t3 = e.tranche3_montant || 0;

                  const isT1Paid = totalPaye >= t1;
                  const isT2Paid = totalPaye >= (t1 + t2);
                  const isT3Paid = totalPaye >= (t1 + t2 + t3);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{e.nom} {e.prenom}</span>
                          <span className="text-[10px] font-mono text-slate-400">{e.matricule}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600">{formatClassName(e.classe_nom)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isT1Paid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {isT1Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t1 > 0 && <span className="text-[9px] text-slate-400">{t1.toLocaleString()} {e.devise}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isT2Paid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {isT2Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t2 > 0 && <span className="text-[9px] text-slate-400">{t2.toLocaleString()} {e.devise}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isT3Paid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {isT3Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t3 > 0 && <span className="text-[9px] text-slate-400">{t3.toLocaleString()} {e.devise}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-bold ${(e.frais_scolarite - totalPaye) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {(e.frais_scolarite - totalPaye).toLocaleString()} {e.devise}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Encaisser un paiement</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Classe (Optionnel)</label>
                <select 
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    setStudentSearch('');
                    setFormData({...formData, eleve_id: ''});
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
                </select>
              </div>
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-700">Élève (Rechercher par nom ou matricule)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Saisir le nom de l'élève..."
                    value={studentSearch}
                    onFocus={() => setShowStudentResults(true)}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentResults(true);
                      if (!e.target.value) setFormData({...formData, eleve_id: ''});
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {showStudentResults && studentSearch && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredEleves.length > 0 ? (
                      filteredEleves.map((e: any) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, eleve_id: e.id.toString()});
                            setStudentSearch(`${e.nom} ${e.prenom}`);
                            setShowStudentResults(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between"
                        >
                          <span>{e.nom} {e.prenom}</span>
                          <span className="text-[10px] font-bold text-slate-400">{e.matricule}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-slate-400 italic">Aucun élève trouvé</div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de paiement</label>
                <select 
                  value={formData.type_paiement}
                  onChange={e => setFormData({...formData, type_paiement: e.target.value})}
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
                  value={formData.montant}
                  onChange={e => setFormData({...formData, montant: e.target.value})}
                  type="number" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de paiement</label>
                <input 
                  value={formData.date_paiement}
                  onChange={e => setFormData({...formData, date_paiement: e.target.value})}
                  type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Moyen de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Espèces', label: 'Espèces' },
                    { id: 'Chèque', label: 'Chèque' },
                    { id: 'Virement bancaire', label: 'Virement' },
                    { id: 'Online', label: 'FedaPay', logo: fedapayLogo },
                    { id: 'Kkiapay', label: 'Kkiapay', logo: kkiapayLogo }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({...formData, methode: m.id})}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        formData.methode === m.id 
                          ? 'border-primary-500 bg-primary-50 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      {m.logo ? (
                        <div className="h-6 flex items-center justify-center mb-1">
                          <img src={m.logo as string} alt={m.label} className="max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-6 flex items-center justify-center mb-1">
                          <span className="text-xs font-bold text-slate-600">{m.label}</span>
                        </div>
                      )}
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${
                        formData.methode === m.id ? 'text-primary-600' : 'text-slate-400'
                      }`}>
                        {m.label}
                      </span>
                    </button>
                  ))}
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
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  {formData.methode === 'Online' ? 'Payer avec FedaPay' : 
                   formData.methode === 'Kkiapay' ? 'Payer avec Kkiapay' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
