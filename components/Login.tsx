
import React, { useState } from 'react';
import { authApi } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await authApi.login({ email, password });
      // Normalize role from DB (ADMIN/CLIENT) to Frontend (Admin/Cliente)
      const normalizedUser = {
        ...data.user,
        role: data.user.role === 'ADMIN' ? 'Admin' : 'Cliente'
      };
      onLoginSuccess(normalizedUser, data.token);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">
            MY <span className="text-gradient">VOICE</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
            Strategic Copywriting
          </p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tight">Acceso al Motor</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email corporativo</label>
              <input
                type="email"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                placeholder="nombre@grupolobueno.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña</label>
              <input
                type="password"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold px-4 py-3 rounded-xl border border-red-100 uppercase tracking-wide">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Iniciando...
                </span>
              ) : (
                'Entrar al Engine'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
          Propiedad Exclusiva de Grupo LoBueno
        </p>
      </div>
    </div>
  );
};

export default Login;
