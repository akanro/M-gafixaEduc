import { apiFetch } from '../utils/api';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import logo from '../logo_megafixa.png';

export default function SetupPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const navigate = useNavigate();

  const email = searchParams.get('email') || '';
  const otp = searchParams.get('otp') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Compte activé !</h1>
            <p className="text-slate-500 mb-8">Votre mot de passe a été configuré avec succès. Vous allez être redirigé vers la page de connexion.</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
            >
              Aller à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200 p-2">
            <img src={logo} alt="Logo MégafixaEduc" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Activation du compte</h1>
          <p className="text-slate-500 mt-2">Configurez votre mot de passe pour {email}</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nouveau mot de passe</label>
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

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <Shield className="text-amber-600 shrink-0" size={20} />
              <p className="text-xs text-amber-700 leading-relaxed">
                Votre compte est vérifié par le code <strong>{otp}</strong> inclus dans votre lien d'activation.
              </p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              {loading ? 'Activation...' : 'Activer mon compte'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
