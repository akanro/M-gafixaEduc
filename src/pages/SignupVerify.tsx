import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignupVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = React.useState('');

  const email = searchParams.get('email');
  const ref = searchParams.get('ref');

  React.useEffect(() => {
    if (!email || !ref) {
      setStatus('error');
      setError('Paramètres de vérification manquants.');
      return;
    }

    const checkSubscription = async () => {
      try {
        // We poll a bit or just check once if we expect the webhook to be fast
        const res = await apiFetch(`/api/auth/verify-subscription?email=${encodeURIComponent(email)}&reference=${encodeURIComponent(ref)}`);
        const data = await res.json();

        if (data.valid) {
          setStatus('success');
          // Automatically redirect after 3 seconds to give time to see the message
          setTimeout(() => {
            navigate('/login');
          }, 4000);
        } else {
          // Retry logic or show error
          setTimeout(() => {
             // Second attempt after 3 seconds in case of webhook delay
             apiFetch(`/api/auth/verify-subscription?email=${encodeURIComponent(email)}&reference=${encodeURIComponent(ref)}`)
              .then(res2 => res2.json())
              .then(data2 => {
                 if (data2.valid) {
                   setStatus('success');
                   setTimeout(() => navigate(`/signup?email=${encodeURIComponent(email)}&ref=${encodeURIComponent(ref)}`), 2000);
                 } else {
                   setStatus('error');
                   setError('Le paiement n\'a pas encore été validé. Veuillez patienter ou contacter le support.');
                 }
              });
          }, 3000);
        }
      } catch (err) {
        setStatus('error');
        setError('Erreur lors de la vérification de l\'abonnement.');
      }
    };

    checkSubscription();
  }, [email, ref, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {status === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <Loader2 className="animate-spin text-primary-600" size={60} strokeWidth={3} />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Vérification de votre paiement</h2>
              <p className="text-slate-500 font-medium italic">Cela ne prendra que quelques secondes...</p>
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center shadow-2xl shadow-primary-100">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Abonnement Activé !</h2>
              <p className="text-slate-500 font-medium">Votre compte a été créé avec succès.</p>
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 mt-4">
                <p className="text-sm text-primary-900 font-bold leading-relaxed">
                  Vérifiez vos emails pour récupérer votre <strong>clé de licence</strong> unique. Elle est requise pour votre première connexion.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="mt-6 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-tight flex items-center gap-2 hover:bg-slate-800 shadow-xl"
            >
              Aller à la Page de Connexion <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-100">
              <XCircle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Oups !</h2>
              <p className="text-red-500 font-bold">{error}</p>
            </div>
            <button 
              onClick={() => navigate('/pricing')}
              className="mt-6 px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200"
            >
              Retour aux tarifs
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
