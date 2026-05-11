import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../services/api';

interface HomePageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const CHANNELS = [
  'Instagram Post', 'Instagram Historia', 'Instagram Carrusel', 'Instagram Reel',
  'TikTok', 'YouTube', 'Google Ads', 'Google Display',
  'Rich Media', 'Email', 'WhatsApp', 'Push Notification', 'Pop-up', 'Cuña de Radio',
];

const STEPS = [
  {
    n: '01',
    title: 'Campaign Director',
    desc: 'Analiza el ADN de la marca y construye el concepto paraguas, tono y ángulos creativos.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Especialistas por Canal',
    desc: 'Cada plataforma tiene su agente propio con conocimiento de formatos, límites y convenciones.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Critic',
    desc: 'Evalúa cada pieza contra los pilares de marca, mide prohibiciones y asigna un score 0–10.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    n: '04',
    title: 'AutoFixer',
    desc: 'Si una pieza no pasa el umbral, la reescribe automáticamente antes de presentarla.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    n: '05',
    title: 'SuperCritic',
    desc: 'Audita todas las piezas juntas: detecta contradicciones de tono y oportunidades perdidas.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: 'Brand Voice',
    desc: 'Registrá el ADN estratégico de cada marca: voz, propuesta de valor, keywords, prohibiciones y ejemplos aprobados. El motor aprende con cada generación.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    title: 'Generate',
    desc: 'Seleccioná marca, campaña y canales. La IA orquesta 5 capas especializadas y entrega piezas puntuadas, corregidas y auditadas — en segundos.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Content Selection',
    desc: 'Biblioteca de contenidos aprobados por proyecto y marca. Aprobá, etiquetá y descargá. El feedback negativo se inyecta automáticamente en futuras generaciones.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
];

const LoginForm: React.FC<{ onLoginSuccess: (user: any, token: string) => void }> = ({ onLoginSuccess }) => {
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
      onLoginSuccess({ ...data.user, role: data.user.role === 'ADMIN' ? 'Admin' : 'Cliente' }, data.token);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="apple-card p-7 w-full max-w-[340px]">
      <div className="mb-6">
        <h2 className="text-[17px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">Accedé al motor</h2>
        <p className="text-[13px] text-[#6E6E73] mt-1">Con tu cuenta corporativa</p>
      </div>

      {/* Google */}
      <div className="flex justify-center mb-5">
        <GoogleLogin
          onSuccess={async (cr) => {
            if (!cr.credential) return;
            setIsLoading(true); setError('');
            try {
              const data = await authApi.googleLogin(cr.credential);
              onLoginSuccess({ ...data.user, role: data.user.role === 'ADMIN' ? 'Admin' : 'Cliente' }, data.token);
            } catch (err: any) {
              setError(err.message || 'Error con Google');
            } finally { setIsLoading(false); }
          }}
          onError={() => setError('Error al iniciar sesión con Google')}
          useOneTap theme="outline" shape="pill" text="signin_with" width="288"
        />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
        <span className="text-[11px] text-[#86868B]">o</span>
        <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="email" required autoComplete="email" placeholder="Email corporativo"
          value={email} onChange={e => setEmail(e.target.value)}
          className="apple-input w-full px-4 py-2.5" />
        <input type="password" required autoComplete="current-password" placeholder="Contraseña"
          value={password} onChange={e => setPassword(e.target.value)}
          className="apple-input w-full px-4 py-2.5" />
        {error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>
        )}
        <button type="submit" disabled={isLoading} className="apple-btn-primary w-full py-2.5 flex items-center justify-center gap-2">
          {isLoading ? (
            <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Ingresando...</>
          ) : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};

const HomePage: React.FC<HomePageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>

      {/* NAV */}
      <nav style={{ background: 'rgba(246,246,248,0.92)', backdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        className="sticky top-0 z-50 h-[52px] flex items-center px-8">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] bg-[#1D1D1F] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">My Voice</span>
          </div>
          <span className="text-[12px] text-[#86868B]">Motor de Contenido IA · Grupo LoBueno</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: copy */}
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[rgba(0,0,0,0.08)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-[#1D1D1F] tracking-tight">Motor activo · 14 canales</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-[44px] font-bold text-[#1D1D1F] tracking-[-0.03em] leading-[1.05]">
              Copy estratégico.<br />
              <span style={{ color: '#6E6E73' }}>End-to-end.</span>
            </h1>
            <p className="text-[17px] text-[#6E6E73] leading-relaxed max-w-[460px]">
              My Voice orquesta un equipo IA completo — director estratégico, especialistas por canal, editor y auditor — para generar campañas coherentes en segundos.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 pt-2">
            {[
              { v: '14', l: 'canales' },
              { v: '5', l: 'capas IA' },
              { v: '3', l: 'agencias' },
            ].map(s => (
              <div key={s.l}>
                <div className="text-[28px] font-bold text-[#1D1D1F] tracking-[-0.03em] leading-none">{s.v}</div>
                <div className="text-[12px] text-[#86868B] mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Channel chips */}
          <div className="flex flex-wrap gap-1.5 max-w-[480px]">
            {CHANNELS.map(c => (
              <span key={c} className="text-[11px] text-[#6E6E73] bg-white border border-[rgba(0,0,0,0.08)] px-2.5 py-1 rounded-full font-medium">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Right: login card */}
        <div className="flex justify-center lg:justify-end">
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: 'white', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <div className="section-label mb-3">Cómo funciona</div>
            <h2 className="text-[28px] font-semibold text-[#1D1D1F] tracking-[-0.02em]">El motor en 5 capas</h2>
            <p className="text-[15px] text-[#6E6E73] mt-2 max-w-xl">Cada generación pasa por un pipeline orquestado de agentes especializados. No es un chatbot — es un equipo creativo IA.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-[22px] left-[calc(100%+0px)] w-4 h-px bg-[rgba(0,0,0,0.1)] z-10" />
                )}
                <div className="apple-card p-5 h-full space-y-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#F5F5F7] flex items-center justify-center text-[#1D1D1F]">
                      {step.icon}
                    </div>
                    <span className="text-[11px] font-semibold text-[#86868B] tabular-nums">{step.n}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#1D1D1F] leading-snug">{step.title}</div>
                    <p className="text-[12px] text-[#6E6E73] mt-1.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <div className="section-label mb-3">Módulos</div>
            <h2 className="text-[28px] font-semibold text-[#1D1D1F] tracking-[-0.02em]">Todo en un mismo lugar</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="apple-card p-7 space-y-4 relative overflow-hidden">
                {/* Subtle number watermark */}
                <div className="absolute -top-3 -right-1 text-[80px] font-bold text-[rgba(0,0,0,0.03)] select-none leading-none">
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-[10px] bg-[#F5F5F7] flex items-center justify-center text-[#1D1D1F]">
                  {f.icon}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">{f.title}</div>
                  <p className="text-[13px] text-[#6E6E73] mt-2 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CARD */}
      <section style={{ background: 'white', borderTop: '1px solid rgba(0,0,0,0.07)' }} className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="rounded-2xl bg-[#1D1D1F] p-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">Output real del motor</div>
              <h3 className="text-[24px] font-semibold text-white tracking-[-0.02em] leading-snug">
                "Una vez al año bajamos el precio. Hoy."
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Concepto paraguas generado por el Director Estratégico para una campaña de Black Friday. A partir de este concepto, el motor escribe todas las piezas manteniendo coherencia.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { platform: 'Instagram Post', score: 9.4, type: 'Urgencia', preview: 'Una vez al año bajamos el precio. Hoy. Mañana sigue igual de justo.' },
                { platform: 'Google Ads', score: 8.8, type: 'Beneficio', preview: 'Black Friday · 30% off · Solo hoy · Avena+ Original' },
                { platform: 'WhatsApp', score: 9.1, type: 'Urgencia', preview: 'Hola 👋 La única oferta del año es hoy. *Ver pack* →' },
                { platform: 'Email', score: 9.2, type: 'Curiosidad', preview: 'Asunto: La única oferta del año (no la repetimos)' },
              ].map(card => (
                <div key={card.platform} className="bg-white/[0.06] rounded-xl p-4 space-y-2 border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-white/40 truncate">{card.platform}</span>
                    <span className="text-[11px] font-semibold text-emerald-400 shrink-0 ml-1">{card.score}</span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed">{card.preview}</p>
                  <span className="inline-block text-[9px] font-medium text-white/30 uppercase tracking-wide">{card.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }} className="py-10">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-[5px] bg-[#1D1D1F] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[13px] font-medium text-[#1D1D1F]">My Voice</span>
            <span className="text-[13px] text-[#86868B]">— Motor de Contenido IA</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#86868B]">Powered by</span>
            <img src="/LobuenoLogo.png" alt="LoBueno" className="h-[13px] w-auto opacity-40" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
