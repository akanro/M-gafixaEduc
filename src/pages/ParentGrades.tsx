import { apiFetch } from '../utils/api';
import React from 'react';
import { User, BookOpen, ClipboardList, GraduationCap, School, TrendingUp, Calendar, CreditCard, ChevronRight, CheckCircle2, AlertCircle as AlertIcon, X, History } from 'lucide-react';
import { motion } from 'motion/react';
import fedapayLogo from '../Logo_Fedapay.png';
import kkiapayLogo from '../Logo_Kkiapay.jpg';
import { getPrimaryColor } from '../utils/theme';

export default function ParentGrades() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedTrimestre, setSelectedTrimestre] = React.useState<number>(1);
  const [activeTab, setActiveTab] = React.useState<'grades' | 'payments'>('grades');
  const [isPaying, setIsPaying] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'fedapay' | 'kkiapay'>('fedapay');
  const [showAmountModal, setShowAmountModal] = React.useState(false);
  const [showTranchesModal, setShowTranchesModal] = React.useState(false);
  const [customAmount, setCustomAmount] = React.useState('');

  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    // Kkiapay Success Listener
    const handleKkiapaySuccess = async (response: any) => {
      if (!data?.student) return;
      setIsPaying(true);
      try {
        const res = await apiFetch('/api/paiements/kkiapay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: response.transactionId,
            eleve_id: data.student.id,
            type_paiement: 'Scolarité',
            montant: 0, // Backend uses transaction amount from verify
            date_paiement: new Date().toISOString().split('T')[0]
          })
        });
        const result = await res.json();
        if (result.success) {
          alert("Paiement validé avec succès !");
          fetchData();
        } else {
          alert("Erreur lors de la validation du paiement: " + (result.error || 'Erreur inconnue'));
        }
      } catch (err) {
        console.error(err);
        alert("Erreur de connexion lors de la validation");
      } finally {
        setIsPaying(false);
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
  }, [data?.student?.id]);

  const fetchData = () => {
    setLoading(true);
    apiFetch('/api/parent/child-data')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setData(data);
      })
      .catch(() => setError('Erreur de connexion au serveur'))
      .finally(() => setLoading(false));
  };

  const handleOnlinePayment = async (type: string, amount: number) => {
    if (!data?.student?.id) return;

    if (paymentMethod === 'kkiapay') {
      if (!data.student.kkiapay_public_key) {
        alert("Kkiapay n'est pas configuré pour cette école.");
        return;
      }
      if (!(window as any).openKkiapayWidget) {
        alert("Le module de paiement n'est pas chargé. Veuillez réessayer.");
        return;
      }
      (window as any).openKkiapayWidget({
        amount: Number(amount),
        position: "center",
        callback: "",
        sandbox: data.student.kkiapay_mode !== 'live',
        key: data.student.kkiapay_public_key,
        theme: getPrimaryColor(),
        data: `${type} - ${data.student.id}`
      });
      return;
    }

    setIsPaying(true);
    try {
      const res = await apiFetch('/api/paiements/fedapay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eleve_id: data.student.id,
          montant: amount,
          type_paiement: type,
          date_paiement: new Date().toISOString().split('T')[0],
          student_name: `${data.student.nom} ${data.student.prenom}`
        })
      });
      const result = await res.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert("Erreur lors de l'initialisation du paiement: " + (result.error || result.message || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
        <p className="font-bold">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl">Réessayer</button>
      </div>
    );
  }

  const { student, notes, payments } = data;
  const trimesters = [1, 2, 3];
  
  const filteredNotes = notes.filter((n: any) => n.trimestre === selectedTrimestre);
  
  // Group notes by subject
  const subjectMap: Record<number, any> = {};
  filteredNotes.forEach((n: any) => {
    if (!subjectMap[n.matiere_id]) {
      subjectMap[n.matiere_id] = {
        name: n.matiere_nom,
        coefficient: n.coefficient,
        evaluations: {}
      };
    }
    subjectMap[n.matiere_id].evaluations[n.type_evaluation] = n.note;
  });

  const subjects = Object.values(subjectMap).map((s: any) => {
    // Calculate average for this subject
    const evals = Object.values(s.evaluations).map(n => Number(n));
    const avg = evals.length > 0 ? evals.reduce((a, b) => a + b, 0) / evals.length : 0;
    return { ...s, average: avg };
  });

  const generalAverage = subjects.length > 0 
    ? subjects.reduce((acc, s) => acc + (s.average * s.coefficient), 0) / subjects.reduce((acc, s) => acc + s.coefficient, 0)
    : 0;

  // Include both registration and tuition fees
  const scolariteBase = Number(student.frais_scolarite || 0);
  const inscriptionBase = Number(student.frais_inscription || 0);
  const totalScolarite = scolariteBase + inscriptionBase;
  
  const totalPaye = (payments || []).filter((p: any) => p.status === 'completed' || p.status === 'Terminé').reduce((acc: number, p: any) => acc + (p.montant || 0), 0);
  const resteAPayer = Math.max(0, totalScolarite - totalPaye);

  return (
    <div className="space-y-8">
      {/* Student Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative">
          {student.photo ? (
            <img src={student.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={48} />
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-900">{student.nom} {student.prenom}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full text-sm">
              <GraduationCap size={16} />
              <span>{student.classe_nom} ({student.niveau})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full text-sm">
              <School size={16} />
              <span>{student.school_name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full text-sm">
              <Calendar size={16} />
              <span>Inscrit le: {new Date(student.created_at || '').toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
        
        {/* General Average Badge */}
        {subjects.length > 0 && (
          <div className="bg-primary-50 p-4 rounded-3xl border border-primary-100 text-center">
            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Moyenne Générale</p>
            <p className="text-3xl font-black text-primary-700">{generalAverage.toFixed(2)}</p>
          </div>
        )}
      </motion.div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('grades')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'grades' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={18} /> Notes & Bulletins
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'payments' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCard size={18} /> Scolarité & Paiements
        </button>
      </div>

      {activeTab === 'grades' && (
        <div className="space-y-6">
          {/* Trimester Selector */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
            {trimesters.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTrimestre(t)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedTrimestre === t 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t === 1 ? '1er Trimestre' : t === 2 ? '2ème Trimestre' : '3ème Trimestre'}
              </button>
            ))}
          </div>

          {/* Grades Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.length > 0 ? subjects.map((subj: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900">{subj.name}</h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">coeff: {subj.coefficient}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {['I1', 'I2', 'I3', 'I4'].map(type => (
                      <div key={type} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 capitalize">{type}</span>
                        <span className="font-bold text-slate-700">{subj.evaluations[type] ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl text-primary-900">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <ClipboardList size={14} /> Dev1
                    </span>
                    <span className="font-bold text-lg">{subj.evaluations.Dev1 ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl text-primary-900">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <ClipboardList size={14} /> Dev2
                    </span>
                    <span className="font-bold text-lg">{subj.evaluations.Dev2 ?? '-'}</span>
                  </div>

                  {/* Subject Average */}
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moyenne Matière</span>
                    <span className={`text-lg font-black ${subj.average >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                      {subj.average.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <TrendingUp size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400">Aucune note enregistrée pour ce trimestre.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Debug info (can be removed later) */}
          <div className="text-[10px] text-slate-300 flex gap-4 bg-slate-50 p-2 rounded-lg">
             <span>Fees: {totalScolarite}</span>
             <span>Paid: {totalPaye}</span>
             <span>Remaining: {resteAPayer}</span>
             <span>Class fees: {scolariteBase}/{inscriptionBase}</span>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Scolarité</p>
              <p className="text-2xl font-black text-slate-900">{totalScolarite.toLocaleString()} {student.devise || 'FCFA'}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-green-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Payé</p>
              <p className="text-2xl font-black text-green-600">{totalPaye.toLocaleString()} {student.devise || 'FCFA'}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-red-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reste à payer</p>
              <p className="text-2xl font-black text-red-600">{resteAPayer.toLocaleString()} {student.devise || 'FCFA'}</p>
            </div>
          </div>

          {/* Online Payment Card */}
          {totalScolarite > 0 ? (
            resteAPayer > 0 ? (
              <div className="bg-indigo-600 text-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard size={32} className="text-indigo-200" />
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Payer en ligne</h2>
                  </div>
                  <p className="text-indigo-100 mb-6 max-w-md">Réglez les frais de scolarité de votre enfant en toute sécurité via FedaPay (Mobile Money ou Carte Bancaire).</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <button
                      disabled={isPaying}
                      onClick={() => setShowTranchesModal(true)}
                      className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      Solder une tranche <ChevronRight size={18} />
                    </button>
                    <button
                      disabled={isPaying}
                      onClick={() => {
                        setCustomAmount(resteAPayer.toString());
                        setShowAmountModal(true);
                      }}
                      className="px-8 py-3 bg-indigo-500 text-white border border-indigo-400 rounded-2xl font-bold hover:bg-indigo-400 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      Montant personnalisé
                    </button>
                  </div>
                </div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>
            ) : (
              <div className="bg-green-600 text-white p-8 rounded-[2rem] shadow-xl shadow-green-100 relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Scolarité soldée</h2>
                    <p className="text-green-50 font-medium opacity-90">Toutes les contributions pour cette année ont été réglées avec succès. Merci !</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="bg-slate-100 p-8 rounded-[2rem] border border-dashed border-slate-300 text-center">
              <AlertIcon size={40} className="mx-auto text-slate-400 mb-4" />
              <h2 className="text-xl font-bold text-slate-700">Aucun frais défini</h2>
              <p className="text-slate-500 max-w-sm mx-auto">L'administration n'a pas encore configuré les frais pour cette classe. Veuillez contacter l'école pour plus d'informations.</p>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="text-slate-400" size={20} /> Historique des Paiements
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Montant</th>
                    <th className="px-6 py-4">Méthode</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments && payments.length > 0 ? (
                    payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{p.type_paiement}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.montant.toLocaleString()} {student.devise || 'FCFA'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            p.methode === 'FedaPay' || p.methode === 'Online' ? 'bg-indigo-50 text-indigo-600' : 
                            p.methode === 'Kkiapay' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {p.methode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(p.status === 'Terminé' || p.status === 'completed') ? (
                            <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs">
                              <CheckCircle2 size={14} /> Payé
                            </div>
                          ) : (p.status === 'En cours' || p.status === 'pending') ? (
                            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                              <AlertIcon size={14} /> En attente
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                              <X size={14} /> {p.status}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Aucun paiement enregistré pour l'année scolaire en cours.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="bg-primary-600 text-white p-6 rounded-3xl shadow-xl shadow-primary-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <TrendingUp size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Encouragez vos enfants</h3>
            <p className="text-primary-100 text-sm">Le suivi régulier des notes est la clé de la réussite scolaire.</p>
          </div>
        </div>
      </div>
      {/* Custom Amount Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Montant personnalisé</h3>
              <button onClick={() => setShowAmountModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => setPaymentMethod('fedapay')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'fedapay' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <img src={fedapayLogo} alt="FedaPay" className="h-6" />
                </button>
                <button
                  onClick={() => setPaymentMethod('kkiapay')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'kkiapay' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <img src={kkiapayLogo} alt="Kkiapay" className="h-6" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Montant à régler ({student.devise || 'FCFA'})</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-2xl font-bold outline-none transition-all"
                    placeholder="0"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 font-medium">Reste à payer : {resteAPayer.toLocaleString()} {student.devise || 'FCFA'}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowAmountModal(false)}
                  className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={isPaying || !customAmount || Number(customAmount) <= 0}
                  onClick={() => {
                    handleOnlinePayment('Scolarité', Number(customAmount));
                    setShowAmountModal(false);
                  }}
                  className="flex-1 px-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isPaying ? 'Traitement...' : 'Valider le paiement'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tranches Modal */}
      {showTranchesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Échéancier de paiement</h3>
              <button onClick={() => setShowTranchesModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl mb-4">
                <button
                  onClick={() => setPaymentMethod('fedapay')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'fedapay' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <img src={fedapayLogo} alt="FedaPay" className="h-6" />
                </button>
                <button
                  onClick={() => setPaymentMethod('kkiapay')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'kkiapay' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <img src={kkiapayLogo} alt="Kkiapay" className="h-6" />
                </button>
              </div>

              {[
                { id: 1, label: '1ère Tranche', amount: student.tranche1_montant, date: student.tranche1_date_limite },
                { id: 2, label: '2ème Tranche', amount: student.tranche2_montant, date: student.tranche2_date_limite },
                { id: 3, label: '3ème Tranche', amount: student.tranche3_montant, date: student.tranche3_date_limite }
              ].map((tranche) => (
                <div 
                  key={tranche.id}
                  className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-200 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-800">{tranche.label}</p>
                    {tranche.date && <p className="text-xs text-slate-500">Date limite : {new Date(tranche.date).toLocaleDateString('fr-FR')}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-black text-indigo-600">{Number(tranche.amount || 0).toLocaleString()} {student.devise || 'FCFA'}</p>
                    <button
                      disabled={isPaying || !tranche.amount || Number(tranche.amount) > resteAPayer}
                      onClick={() => {
                        handleOnlinePayment('Scolarité', Number(tranche.amount));
                        setShowTranchesModal(false);
                      }}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 active:scale-95"
                      title="Payer cette tranche"
                    >
                      <CreditCard size={18} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-900/60 uppercase tracking-wider">Reste à payer</span>
                  <span className="text-xl font-black text-indigo-600">{resteAPayer.toLocaleString()} {student.devise || 'FCFA'}</span>
                </div>
              </div>

              <button
                onClick={() => setShowTranchesModal(false)}
                className="w-full mt-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
