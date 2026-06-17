import { apiFetch } from '../utils/api';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../logo_megafixa.png';

export default function ParentLogin() {
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user.role !== 'parent') {
          setError('Ce compte n\'est pas un compte parent.');
          return;
        }
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Identifiants incorrects.');
      }
    } catch (err: any) {
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200 p-2">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Espace Parents</h1>
          <p className="text-slate-500 mt-2">Suivez la scolarité de vos enfants en temps réel</p>
        </div>

        <div className="bg-white border-none shadow-xl shadow-indigo-200 rounded-3xl overflow-hidden">
          <div className="p-6 space-y-1 pb-6 bg-indigo-600 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Connexion Sécurisée</span>
            </div>
            <h2 className="text-2xl font-bold">Bienvenue</h2>
            <p className="text-indigo-100 text-sm">Entrez l'identifiant fourni par l'école</p>
          </div>
          
          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Identifiant Élève</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Nom&Prénom_ID@Ecole"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? 'Connexion...' : (
                  <>
                    Accéder aux notes <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-6 border-t border-slate-100 text-center">
              <Link to="/login" className="text-sm font-bold text-indigo-600 hover:underline">
                Accès Personnel Administratif
              </Link>
            </div>
          </div>
        </div>
        
        <p className="text-center text-slate-400 text-xs mt-8">
          © {new Date().getFullYear()} MégafixaEduc Pro • Tous droits réservés
        </p>
      </div>
    </div>
  );
}
