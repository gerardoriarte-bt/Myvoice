import React, { useState } from 'react';
import { authApi } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';

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
      const normalizedUser = {
        ...data.user,
        role: data.user.role === 'ADMIN' ? 'Admin' : 'Cliente'
      };
      onLoginSuccess(normalizedUser, data.token);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#F5F5F7' }}>

      {/* Card */}
      <div className="w-full max-w-[340px]">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-[13px] bg-[#1D1D1F] flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] tracking-[-0.02em] leading-tight">My Voice</h1>
          <p className="text-[13px] text-[#6E6E73] mt-1">Accedé con tu cuenta corporativa</p>
        </div>

        {/* Form card */}
        <div className="apple-card p-6 space-y-4">

          {/* Google */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  setIsLoading(true);
                  setError('');
                  try {
                    const data = await authApi.googleLogin(credentialResponse.credential);
                    const normalizedUser = {
                      ...data.user,
                      role: data.user.role === 'ADMIN' ? 'Admin' : 'Cliente'
                    };
                    onLoginSuccess(normalizedUser, data.token);
                  } catch (err: any) {
                    setError(err.message || 'Error en autenticación con Google');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              onError={() => setError('Error al iniciar sesión con Google')}
              useOneTap
              theme="outline"
              shape="pill"
              text="signin_with"
              width="288"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
            <span className="text-[11px] text-[#86868B]">o</span>
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
          </div>

          {/* Email + password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="apple-input w-full px-4 py-2.5"
              />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="apple-input w-full px-4 py-2.5"
              />
            </div>

            {error && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 leading-snug">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="apple-btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Powered by */}
        <div className="flex flex-col items-center gap-2 mt-8">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#86868B]">Powered by</span>
          <img src="/LobuenoLogo.png" alt="LoBueno" className="h-[14px] w-auto opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default Login;
