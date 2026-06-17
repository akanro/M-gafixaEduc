import React from 'react';
import { apiFetch } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ArrowRight, 
  Loader2, 
  Mail, 
  ShieldCheck, 
  ArrowLeft, 
  User, 
  School, 
  Phone, 
  Calendar, 
  MapPin, 
  Lock,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../logo_megafixa.png';
import fedapayLogo from '../Logo_Fedapay.png';
import kkiapayLogo from '../Logo_Kkiapay.jpg';
import toast from 'react-hot-toast';

const PLANS = [
  {
    name: 'Essentiel',
    price: 35000,
    period: 'an',
    desc: 'Pour les petites écoles en croissance.',
    features: [
      'Jusqu\'à 200 élèves',
      'Gestion des classes',
      'Paiement Mobile Money',
      'Bulletins scolaires basics',
      'Support par email'
    ],
    color: 'bg-white',
    textColor: 'text-slate-900',
    btnColor: 'bg-slate-900 text-white'
  },
  {
    name: 'Institution',
    price: 75000,
    period: 'an',
    desc: 'La solution complète pour les grands établissements.',
    features: [
      'Élèves illimités',
      'Emploi du temps automatique',
      'Accès Parents personnalisé',
      'Gestion comptable complète',
      'Support prioritaire 24/7',
      'Audit logs & Sécurité avancée'
    ],
    color: 'bg-white',
    textColor: 'text-slate-900',
    btnColor: 'bg-slate-900 text-white'
  },
  {
    name: 'Élite',
    price: 120000,
    period: 'vie',
    desc: 'L\'expérience ultime sans frais récurrents.',
    features: [
      'Accès illimité à vie',
      'Élèves illimités',
      'Toutes les fonctionnalités Premium',
      'Support prioritaire direct 24/7',
      'Sauvegardes cloud automatiques',
      'Mises à jour incluses à vie'
    ],
    popular: true,
    color: 'bg-slate-900',
    textColor: 'text-white',
    btnColor: 'bg-primary-600 text-white shadow-lg shadow-primary-200'
  }
];

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [paymentMethod, setPaymentMethod] = React.useState<'fedapay' | 'kkiapay' | 'test'>('fedapay');
  const [kkiapayKey, setKkiapayKey] = React.useState('');
  const [kkiapayMode, setKkiapayMode] = React.useState('sandbox');

  // Form State
  const [formData, setFormData] = React.useState({
    nom: '',
    prenom: '',
    telephone: '',
    email_perso: '',
    date_naissance: '',
    sexe: 'M',
    nom_ecole: '',
    slogan: '',
    email_ecole: '',
    adresse_ecole: '',
    password: ''
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiFetch('/api/config/kkiapay');
        const data = await res.json();
        if (data.publicKey) {
          setKkiapayKey(data.publicKey);
          setKkiapayMode(data.mode);
        }
      } catch (err) {
        console.error("Error fetching Kkiapay config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSubscribe = (plan: any) => {
    setSelectedPlan(plan);
    setShowModal(true);
    setStep(1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const confirmSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email_perso || !formData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    if (paymentMethod === 'test') {
      try {
        const res = await apiFetch('/api/auth/subscribe-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_name: selectedPlan.name,
            amount: selectedPlan.price,
            ...formData
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          setShowModal(false);
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          toast.error(data.error || "Erreur de création de compte test.");
        }
      } catch (err) {
        toast.error("Erreur de connexion au serveur de test.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (paymentMethod === 'kkiapay') {
      if (!kkiapayKey) {
        setLoading(false);
        toast.error("Le service Kkiapay n'est pas encore configuré.");
        return;
      }

      try {
        // @ts-ignore
        const kkiapay = window.openKkiapayWidget;
        if (!kkiapay) {
          throw new Error("L'outil Kkiapay n'est pas chargé. Rechargez la page.");
        }

        kkiapay({
          amount: selectedPlan.price,
          position: 'center',
          callback: '',
          data: '',
          theme: '#10b981',
          key: kkiapayKey,
          sandbox: kkiapayMode === 'sandbox'
        });

        // @ts-ignore
        window.addKkiapayListener('success', async (response: any) => {
          console.log("Kkiapay success:", response);
          try {
            const res = await apiFetch('/api/auth/subscribe-kkiapay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId: response.transactionId,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                ...formData
              })
            });
            const data = await res.json();
            if (data.success) {
              toast.success(data.message);
              setShowModal(false);
              // Redirect to login after a delay
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            } else {
              toast.error(data.error || "Erreur lors de la création du compte.");
            }
          } catch (err) {
            toast.error("Une erreur système est survenue.");
            console.error(err);
          } finally {
            setLoading(false);
          }
        });
      } catch (error: any) {
        toast.error(error.message);
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/auth/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: selectedPlan.name,
          amount: selectedPlan.price,
          ...formData
        })
      });
      
      const data = await res.json();
      if (data.url) {
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <span>Redirection vers le paiement...</span>
              <a 
                href={data.url} 
                target="_top" 
                className="text-xs font-bold underline text-primary-200"
                onClick={() => toast.dismiss(t.id)}
              >
                Cliquez ici si la redirection automatique échoue
              </a>
            </div>
          ),
          { duration: 10000 }
        );

        // Try to redirect the top window to break out of the iframe
        setTimeout(() => {
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } catch (e) {
            console.error("Redirect catch:", e);
            window.location.href = data.url;
          }
        }, 1500);
      } else {
        const errorMsg = data.message || data.error || 'Erreur lors de l\'initiation du paiement';
        const detailMsg = data.details ? ` (${JSON.stringify(data.details)})` : '';
        toast.error(`${errorMsg}${detailMsg}`, { duration: 6000 });
        console.error("Payment initiation error:", data);
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </Link>
          <img src={logo} alt="Logo" className="h-8" />
        </div>

        <div className="text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]"
          >
            Choisissez votre <span className="text-primary-600">Plan</span>
          </motion.h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Abonnez-vous aujourd'hui pour transformer la gestion de votre établissement scolaire.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-10 rounded-[3rem] border shadow-2xl flex flex-col ${plan.color} ${plan.textColor} ${plan.popular ? 'border-primary-500 ring-4 ring-primary-50' : 'border-slate-100'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest leading-none">
                  Recommandé
                </div>
              )}

              <div className="space-y-4 mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{plan.price.toLocaleString()}</span>
                  <span className="text-sm font-bold opacity-60 uppercase tracking-widest">FCFA / {plan.period}</span>
                </div>
                <p className="text-sm opacity-70 font-medium leading-relaxed">{plan.desc}</p>
              </div>

              <div className="space-y-4 flex-1 mb-12">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading}
                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${plan.btnColor}`}
              >
                Commander ce plan
                <ArrowRight size={20} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Subscription Form Modal */}
      <AnimatePresence>
        {showModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Formulaire d'Abonnement</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Plan: {selectedPlan.name} • Étape {step}/3</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <ArrowLeft size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8">
                <form id="subscription-form" onSubmit={confirmSubscription} className="space-y-8">
                  {step === 1 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2 text-primary-600">
                        <User size={20} />
                        <h4 className="text-lg font-black uppercase tracking-tight">Informations du Fondateur</h4>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                          <input required name="nom" value={formData.nom} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                          <input required name="prenom" value={formData.prenom} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                          <input required type="tel" name="telephone" value={formData.telephone} onChange={handleChange} placeholder="90000000" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Personnel</label>
                          <input required type="email" name="email_perso" value={formData.email_perso} onChange={handleChange} placeholder="jean.dupont@gmail.com" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de naissance</label>
                          <input required type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label>
                          <select name="sexe" value={formData.sexe} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold">
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2 text-primary-600">
                        <School size={20} />
                        <h4 className="text-lg font-black uppercase tracking-tight">Informations de l'École</h4>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'école</label>
                        <input required name="nom_ecole" value={formData.nom_ecole} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slogan (Optionnel)</label>
                        <input name="slogan" value={formData.slogan} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de l'école</label>
                          <input required type="email" name="email_ecole" value={formData.email_ecole} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse de l'école</label>
                          <input required name="adresse_ecole" value={formData.adresse_ecole} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2 text-primary-600">
                        <Lock size={20} />
                        <h4 className="text-lg font-black uppercase tracking-tight">Sécurité du Compte</h4>
                      </div>
                      
                      <p className="text-sm text-slate-500 font-medium">Définissez le mot de passe pour votre compte administrateur.</p>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
                        <input required type="password" name="password" value={formData.password} onChange={handleChange} minLength={8} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" />
                        <p className="text-[10px] text-slate-400 mt-1">Au moins 8 caractères.</p>
                      </div>

                      <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="text-primary-500" size={24} />
                          <span className="text-sm font-black uppercase tracking-tight">Récapitulatif de sécurité</span>
                        </div>
                        <ul className="space-y-2">
                          <li className="text-xs font-bold text-slate-400">• Identifiant: <span className="text-white">{formData.email_perso}</span></li>
                          <li className="text-xs font-bold text-slate-400">• Rôle: <span className="text-white">Super Administrateur</span></li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('fedapay')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'fedapay' ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <img src={fedapayLogo} alt="FedaPay" className="h-6 object-contain" />
                            <span className={`text-[8px] font-black uppercase ${paymentMethod === 'fedapay' ? 'text-primary-700' : 'text-slate-400'}`}>FedaPay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('kkiapay')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'kkiapay' ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <img src={kkiapayLogo} alt="Kkiapay" className="h-6 object-contain" />
                            <span className={`text-[8px] font-black uppercase ${paymentMethod === 'kkiapay' ? 'text-primary-700' : 'text-slate-400'}`}>Kkiapay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('test')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'test' ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <Check className={`h-4 ${paymentMethod === 'test' ? 'text-primary-600' : 'text-slate-300'}`} />
                            <span className={`text-[8px] font-black uppercase ${paymentMethod === 'test' ? 'text-primary-700' : 'text-slate-400'}`}>Mode Test</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {step > 1 ? (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-tight flex items-center gap-2 hover:bg-slate-100 border border-slate-200 transition-all"
                  >
                    <ChevronLeft size={20} /> Précédent
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button 
                    onClick={() => {
                      if (step === 1 && (!formData.nom || !formData.prenom || !formData.email_perso)) {
                        toast.error('Remplissez les champs obligatoires');
                        return;
                      }
                      if (step === 2 && (!formData.nom_ecole || !formData.email_ecole)) {
                         toast.error('Remplissez les informations de l\'école');
                         return;
                      }
                      setStep(step + 1);
                    }}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-tight flex items-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    Suivant <ChevronRight size={20} />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    form="subscription-form"
                    disabled={loading}
                    className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-tight flex items-center gap-2 hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        Continuer au Paiement
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
