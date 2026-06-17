import { apiFetch } from '../utils/api';
import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import logo from '../logo_megafixa.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          new_password: password, 
          confirm_password: confirmPassword 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Lien invalide</h1>
          <p className="text-slate-500 mb-6">Ce lien de réinitialisation est manquant ou incorrect.</p>
          <Link to="/login" className="text-primary-600 font-bold hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200 p-2">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">MégafixaEduc Pro</h1>
        </div>

        <div className="bg-white border-none shadow-xl shadow-slate-200 rounded-3xl p-8">
          {success ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Succès !</h2>
                <p className="text-slate-500 mt-2">Votre mot de passe a été réinitialisé avec succès.</p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
              >
                Se connecter maintenant
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h2>
                <p className="text-slate-500 text-sm mt-1">Choisissez un mot de passe sécurisé pour votre compte.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 caractères"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm pl-10 pr-10 focus:ring-2 focus:ring-primary-600 outline-none"
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm pl-10 focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? 'Réinitialisation...' : 'Changer le mot de passe'}
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
