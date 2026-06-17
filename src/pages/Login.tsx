import { apiFetch } from '../utils/api';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Chrome, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../logo_megafixa.png';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [licenseKey, setLicenseKey] = React.useState('');
  const [requiresOtp, setRequiresOtp] = React.useState(false);
  const [requiresLicense, setRequiresLicense] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotMode, setForgotMode] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotLicense, setForgotLicense] = React.useState('');
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [forgotSuccess, setForgotSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user: userData } = event.data;
        login(token, userData);
        navigate('/');
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Erreur lors de la connexion avec Google');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, navigate]);

  const handleGoogleLogin = async () => {
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
        'google-login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error("Google login error:", err);
      setError('Erreur lors de la connexion avec Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          otp: requiresOtp ? otp : undefined,
          license_key: requiresLicense ? licenseKey : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.user);
        navigate('/');
      } else if (data.requiresOtp) {
        setRequiresOtp(true);
        setRequiresLicense(false);
        setError(data.message || "Vérification requise");
      } else if (data.requiresLicense) {
        setRequiresLicense(true);
        setRequiresOtp(false);
        setError(data.message || "Activation requise");
      } else {
        setError(data.error || 'Identifiants incorrects.');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotSuccess('');
    setError('');

    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, license_key: forgotLicense })
      });
      const data = await response.json();
      if (data.success) {
        setForgotSuccess(data.message);
      } else {
        setError(data.error || "Une erreur est survenue.");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {forgotMode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Réinitialisation</h2>
            <p className="text-slate-500 text-sm mb-6">Saisissez votre email et votre clé de licence pour recevoir un lien de réinitialisation.</p>
            
            {forgotSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-700 text-sm mb-6">
                {forgotSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {error && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-amber-700 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email enregistré</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm pl-10 focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Clé de licence Mégafixa</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="MGX-XXXX-XXXX-XXXX"
                      value={forgotLicense}
                      onChange={e => setForgotLicense(e.target.value.toUpperCase())}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm pl-10 focus:ring-2 focus:ring-primary-600 outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-12 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50"
                >
                  {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            )}

            <button 
              onClick={() => {
                setForgotMode(false);
                setForgotSuccess('');
                setError('');
              }}
              className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200 p-2">
            <img src={logo} alt="Logo MégafixaEduc" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">MégafixaEduc Pro</h1>
          <p className="text-slate-500 mt-2">Connectez-vous à votre espace administratif</p>
        </div>

        <div className="bg-white border-none shadow-xl shadow-slate-200 rounded-3xl overflow-hidden">
          <div className="p-6 space-y-1 pb-6">
            <h2 className="text-2xl font-bold">Connexion</h2>
            <p className="text-sm text-slate-500">
              Entrez vos identifiants pour accéder à votre compte
            </p>
          </div>
          <div className="p-6 pt-0 grid gap-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className={`p-3 border text-sm rounded-xl font-medium ${requiresLicense ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    id="email"
                    type="email"
                    placeholder="admin@ecole.com"
                    required
                    disabled={requiresOtp || requiresLicense}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-none bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mot de passe</label>
                  <button 
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={requiresOtp || requiresLicense}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-none bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {requiresOtp && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label htmlFor="otp" className="text-sm font-medium leading-none">Code de confirmation OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      id="otp"
                      type="text"
                      placeholder="Ex: 123456"
                      required
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="flex h-12 w-full rounded-xl border-none bg-indigo-50 px-3 py-2 text-sm ring-offset-background placeholder:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 pl-10 text-indigo-900 font-bold tracking-widest"
                    />
                  </div>
                </div>
              )}

              {requiresLicense && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label htmlFor="license" className="text-sm font-medium leading-none">Clé de connexion unique</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      id="license"
                      type="text"
                      placeholder="Ex: MGX-XXXX-XXXX-XXXX"
                      required
                      value={licenseKey}
                      onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                      className="flex h-12 w-full rounded-xl border-none bg-indigo-50 px-3 py-2 text-sm ring-offset-background placeholder:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 pl-10 text-indigo-900 font-bold tracking-widest uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold text-center">Consultez vos emails pour récupérer votre clé envoyée avec votre fiche d'abonnement.</p>
                </div>
              )}

              <button 
                type="submit" 
                className="inline-flex items-center justify-center whitespace-nowrap bg-primary-600 text-white hover:bg-primary-700 w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary-100 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? 'Connexion...' : (requiresOtp || requiresLicense ? 'Valider et se connecter' : 'Se connecter')}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link to="/parent-login" className="text-sm font-bold text-primary-600 hover:underline">
                  Compte parent
                </Link>
              </div>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Ou continuer avec</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex items-center justify-center whitespace-nowrap bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 w-full h-12 rounded-xl font-bold text-base transition-colors gap-3"
            >
              <Chrome className="text-red-500" size={20} />
              Google
            </button>
          </div>
          <div className="flex flex-col space-y-4 border-t border-slate-50 p-6 pt-6">
            <div className="text-sm text-center text-slate-500">
              Pas encore de compte ?{' '}
              <Link 
                to="/pricing"
                className="text-primary-600 font-bold hover:underline"
              >
                S'abonner
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
