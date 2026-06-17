import { apiFetch } from '../utils/api';
import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, Chrome, ShieldAlert } from 'lucide-react';
import logo from '../logo_megafixa.png';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialEmail = searchParams.get('email') || '';
  const subRef = searchParams.get('ref') || '';

  const [nom, setNom] = React.useState('');
  const [schoolName, setSchoolName] = React.useState('');
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!subRef) {
      // If no subscription reference, force them to the pricing page
      navigate('/pricing');
    }
  }, [subRef, navigate]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // For signup, it's the same as login if the user is auto-approved
        // We can just redirect to ecole
        navigate('/ecole');
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Erreur lors de la connexion avec Google');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleGoogleSignup = async () => {
    try {
      const res = await apiFetch('/api/auth/google/url');
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.url,
        'google-signup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error("Google signup error:", err);
      setError('Erreur lors de l\'inscription avec Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, password, schoolName, subscription_ref: subRef })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Réponse serveur invalide');
      }
      
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.error || 'Erreur d\'inscription');
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message === 'Failed to fetch' ? 'Impossible de contacter le serveur' : `Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200 p-2">
            <img src={logo} alt="Logo MégafixaEduc" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">MégafixaEduc Pro</h1>
          <p className="text-slate-500 mt-2">Créez votre compte utilisateur</p>
        </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
            <div className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-primary-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <p className="text-sm font-black text-primary-900 uppercase tracking-tight">Abonnement Validé</p>
                <p className="text-xs text-primary-700 font-medium">Votre compte sera créé sous l'email : <strong>{email}</strong></p>
              </div>
            </div>

            {success ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto">
                <Shield size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Inscription réussie !</h2>
                <p className="text-slate-600 font-medium">
                  Votre compte a été créé avec succès. 
                </p>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm leading-relaxed">
                  Veuillez vérifier votre boîte mail. Un code de confirmation vous a été envoyé. Vous devrez l'utiliser lors de votre première connexion pour valider votre compte.
                </div>
              </div>
              <div className="pt-4">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 text-primary-600 font-bold hover:underline"
                >
                  Aller à la page de connexion
                  <ArrowRight size={20} />
                </Link>
              </div>
              <p className="text-xs text-slate-400 pt-4">Redirection automatique dans quelques secondes...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nom complet</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  required
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  placeholder="Jean Dupont"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nom de l'établissement</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  required
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  placeholder="Ex: École Internationale Mégafixa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  placeholder="jean@ecole.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
          )}

          {!success && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-medium">Ou s'inscrire avec</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignup}
                className="w-full bg-white text-slate-700 border border-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
              >
                <Chrome className="text-red-500" size={20} />
                Google
              </button>

              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                <p className="text-slate-500 text-sm">
                  Déjà un compte ?{' '}
                  <Link to="/login" className="text-primary-600 font-bold hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
