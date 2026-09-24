import React, { useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
  ArrowRight, ArrowUp, Building2, Camera, Check, ClipboardCheck, LayoutGrid, Lock, Mail,
  Megaphone, MessageCircle, PenTool, Radio, Receipt, ScanEye, Send, Sparkles, Type, Users,
} from 'lucide-react';
import { authApi } from '../services/api';
import Isotipo from './ui/Isotipo';

/*
 * La portada pública. Diseño validado en `design/MyVoice_Engine.pen`,
 * sección «§ Portada · propuesta».
 *
 * Habla como PRODUCTO, no como LoBueno: la ve el equipo de cualquier empresa
 * que tenga un espacio, así que nada de «3 agencias» ni de primera persona de
 * la agencia. LoBueno firma al pie. Los nombres de etapa son los de
 * `screens.ts`; si cambian allá, cambian acá.
 *
 * Cada afirmación está contrastada con el código: el puntaje 1–10 es el del
 * crítico (`criticService.ts`), los cuatro canales con instrucción de
 * producción son los que tienen esos slots en `server/src/channels/specs`.
 * Lo que no está construido —la pieza que vuelve al cliente— no se promete.
 */

interface HomePageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const ETAPAS = [
  { n: '01', etapa: 'Preparar', titulo: 'Cargá el ADN de la marca', desc: 'Voz, propuesta de valor, prohibiciones y ejemplos aprobados. Se extrae del manual en PDF.', Icon: Building2 },
  { n: '02', etapa: 'Escribir', titulo: 'Una campaña, catorce canales', desc: 'El motor define el concepto y escribe cada canal con sus formatos y límites.', Icon: Sparkles },
  { n: '03', etapa: 'Aprobar', titulo: 'El cliente revisa con un enlace', desc: 'Sin cuenta ni contraseña. Aprueba o comenta variación por variación.', Icon: ClipboardCheck },
  { n: '04', etapa: 'Producir', titulo: 'Diseño recibe una orden clara', desc: 'El copy aprobado pasa al tablero como pieza, con su orden de trabajo.', Icon: LayoutGrid },
  { n: '05', etapa: 'Auditar', titulo: 'La IA revisa la pieza final', desc: 'Contrasta el arte con el copy aprobado y con el ADN antes de publicar.', Icon: ScanEye },
];

/** Los seis pasos de `runGeneration`, contados sin la jerga interna de los agentes. */
const PASOS = [
  { t: 'Dirección', d: 'Define el concepto, el mensaje clave y los ángulos de toda la campaña.' },
  { t: 'Redacción por canal', d: 'Escribe cada canal con su formato, sus espacios y sus límites.' },
  { t: 'Validación', d: 'Mide caracteres, busca prohibiciones y cuida el registro. Sin IA: reglas.' },
  { t: 'Crítica', d: 'Puntúa cada variación de 1 a 10 y marca lo que falla.' },
  { t: 'Corrección', d: 'Reescribe solo lo marcado y lo vuelve a validar.' },
  { t: 'Coherencia', d: 'Lee la campaña entera: que ningún canal contradiga a otro.' },
];

const EJEMPLO = [
  { canal: 'Instagram Post', score: '9,4', copy: 'Una vez al año bajamos el precio. Hoy. Mañana sigue igual de justo.', Icon: Camera },
  { canal: 'Google Ads', score: '8,8', copy: 'Black Friday · 30% off · Solo hoy', Icon: Type },
  { canal: 'WhatsApp', score: '9,1', copy: 'Hola 👋 La única oferta del año es hoy. Ver el pack →', Icon: MessageCircle },
  { canal: 'Email', score: '9,2', copy: 'Asunto: La única oferta del año (no la repetimos)', Icon: Mail },
];

const GRUPOS_CANALES = [
  { grupo: 'Redes', Icon: Camera, canales: ['Instagram Post', 'Instagram Historia', 'Instagram Carrusel', 'Instagram Reel', 'TikTok'] },
  { grupo: 'Pauta digital', Icon: Megaphone, canales: ['Google Ads', 'Google Display', 'Rich Media', 'Pop-up'] },
  { grupo: 'Directo', Icon: Send, canales: ['Email', 'WhatsApp', 'Push Notification'] },
  { grupo: 'Video y audio', Icon: Radio, canales: ['YouTube', 'Cuña de Radio'] },
];

const EQUIPOS = [
  { titulo: 'Cada empresa, su espacio', desc: 'Marcas, piezas y aprobaciones de una empresa son invisibles para las demás. Cada una puede usar su propia clave de IA.', Icon: Lock },
  { titulo: 'Cada persona, su función', desc: 'Quién escribe, quién diseña y quién aprueba. A cada uno le llega lo que le toca, cuando le toca.', Icon: Users },
  { titulo: 'Cada generación, su costo', desc: 'Se registra el costo real de cada campaña, etapa por etapa. Sin sorpresas a fin de mes.', Icon: Receipt },
];

/** Gutter y ancho máximo compartidos por todas las secciones. */
const CONTENEDOR = 'max-w-[1248px] mx-auto px-4 sm:px-8 lg:px-12';

/** Token de invitación que viaja en el enlace del email: /?invite=<token>. */
const readInviteToken = () =>
  new URLSearchParams(window.location.search).get('invite') || undefined;

const Eyebrow: React.FC<{ children: React.ReactNode; oscuro?: boolean }> = ({ children, oscuro }) => (
  <div className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${oscuro ? 'text-white/45' : 'text-[#86868B]'}`}>
    {children}
  </div>
);

const LoginForm: React.FC<{
  onLoginSuccess: (user: any, token: string) => void;
  emailRef: React.RefObject<HTMLInputElement | null>;
}> = ({ onLoginSuccess, emailRef }) => {
  const inviteToken = readInviteToken();
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
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="acceso" className="scroll-mt-24 w-full max-w-[400px] bg-white rounded-[20px] p-7 sm:p-9 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold text-ink tracking-[-0.02em]">Entrá a tu espacio</h2>
        <p className="text-[14px] text-[#6E6E73] mt-1.5 leading-snug">
          {inviteToken
            ? 'Usá el mismo correo al que te llegó la invitación.'
            : 'Con la cuenta de tu empresa o el correo de tu invitación.'}
        </p>
      </div>

      <div className="flex justify-center mb-5">
        <GoogleLogin
          onSuccess={async (cr) => {
            if (!cr.credential) return;
            setIsLoading(true); setError('');
            try {
              const data = await authApi.googleLogin(cr.credential, inviteToken);
              onLoginSuccess(data.user, data.token);
            } catch (err: any) {
              setError(err.message || 'Error con Google');
            } finally { setIsLoading(false); }
          }}
          onError={() => setError('Error al iniciar sesión con Google')}
          useOneTap theme="outline" shape="pill" text="continue_with" width="288"
        />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-black/10" />
        <span className="text-[12px] text-[#86868B]">o con tu correo</span>
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input ref={emailRef} type="email" required autoComplete="email" placeholder="nombre@empresa.com"
          aria-label="Correo"
          value={email} onChange={e => setEmail(e.target.value)}
          className="apple-input w-full px-4 py-3" />
        <input type="password" required autoComplete="current-password" placeholder="Contraseña"
          aria-label="Contraseña"
          value={password} onChange={e => setPassword(e.target.value)}
          className="apple-input w-full px-4 py-3" />
        {error && (
          <div role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>
        )}
        <button type="submit" disabled={isLoading}
          className="w-full h-12 rounded-full bg-ink hover:bg-ink-hover text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
          {isLoading ? (
            <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Ingresando…</>
          ) : (<>Ingresar <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      <p className="text-[12px] text-[#86868B] text-center mt-5 leading-snug">
        ¿No tenés cuenta? Pedí una invitación a quien administra tu espacio.
      </p>
    </div>
  );
};

const HomePage: React.FC<HomePageProps> = ({ onLoginSuccess }) => {
  const emailRef = useRef<HTMLInputElement>(null);

  /** Todos los «Ingresar» llevan a la tarjeta y dejan el cursor en el correo. */
  const irAlAcceso = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('acceso')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Enfocar en el mismo tick corta el scroll suave en Chrome: se enfoca al llegar.
    window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 700);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-ink antialiased">

      {/* HERO — oscuro, con el acceso a la derecha */}
      <header
        className="relative overflow-hidden text-white"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 85% 15%, rgba(59,58,92,0.45), transparent 70%),' +
            'radial-gradient(ellipse 55% 60% at 5% 100%, rgba(16,185,129,0.14), transparent 70%),' +
            '#0E0E10',
        }}
      >
        <nav className={`${CONTENEDOR} h-[72px] flex items-center justify-between border-b border-white/[0.08]`}>
          <a href="#" className="flex items-center gap-2.5" aria-label="My Voice, inicio">
            <Isotipo size={30} tono="claro" />
            <span className="text-[16px] font-semibold tracking-[-0.01em]">My Voice</span>
          </a>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-[14px] text-white/65">
              <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
              <a href="#canales" className="hover:text-white transition-colors">Canales</a>
              <a href="#equipos" className="hover:text-white transition-colors">Para equipos</a>
            </div>
            <a href="#acceso" onClick={irAlAcceso}
              className="px-4 py-2 rounded-full border border-white/20 text-[14px] font-medium hover:bg-white/10 transition-colors">
              Ingresar
            </a>
          </div>
        </nav>

        <div className={`${CONTENEDOR} pt-10 sm:pt-14 lg:pt-24 pb-16 sm:pb-20 lg:pb-28 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 sm:gap-14 lg:gap-20 items-center`}>
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[13px] font-medium text-white/80">Motor de copy multimarca · 14 canales</span>
            </div>

            <h1 className="text-[40px] sm:text-[56px] lg:text-[68px] font-bold tracking-[-0.038em] leading-[1.02]">
              La voz de cada marca,<br />
              <span className="text-white/40">en cada canal que toca.</span>
            </h1>

            <p className="text-[17px] sm:text-[19px] text-white/65 leading-[1.55] max-w-[600px]">
              My Voice aprende el ADN de cada marca, escribe la campaña completa para catorce canales y
              la acompaña hasta la pieza final: revisión con el cliente, producción con diseño y
              auditoría antes de publicar.
            </p>

            {/* En celular se ocultan: la tarjeta de acceso es lo que se viene a buscar y no puede quedar a dos pantallas. */}
            <dl className="hidden sm:flex flex-wrap gap-x-12 gap-y-6 pt-2">
              {[
                { v: '14', l: 'canales con reglas propias' },
                { v: '6', l: 'pasos por generación' },
                { v: '1', l: 'enlace para que el cliente apruebe' },
              ].map(s => (
                <div key={s.l} className="w-[140px]">
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="text-[36px] font-semibold tracking-[-0.03em] leading-none">{s.v}</dd>
                  <dd className="text-[13px] text-white/50 mt-2 leading-snug">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LoginForm onLoginSuccess={onLoginSuccess} emailRef={emailRef} />
          </div>
        </div>
      </header>

      <main>
        {/* CÓMO FUNCIONA — las cinco etapas */}
        <section id="como-funciona" className="scroll-mt-4 py-20 lg:py-28">
          <div className={CONTENEDOR}>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14 lg:mb-16">
              <div className="max-w-[720px] space-y-4">
                <Eyebrow>Cómo funciona</Eyebrow>
                <h2 className="text-[34px] sm:text-[48px] font-bold tracking-[-0.035em] leading-[1.08]">
                  Del ADN de la marca a la pieza publicada.
                </h2>
              </div>
              <p className="text-[16px] text-[#6E6E73] leading-[1.55] max-w-[380px]">
                Cinco etapas en una sola herramienta. Lo que antes se repartía entre chats, planillas,
                correos y carpetas compartidas.
              </p>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-10 lg:gap-y-0">
              {ETAPAS.map(({ n, etapa, titulo, desc, Icon }, i) => (
                <li key={n} className={`lg:px-7 ${i === 0 ? 'lg:pl-0' : 'lg:border-l lg:border-black/10'} ${i === ETAPAS.length - 1 ? 'lg:pr-0' : ''} sm:pr-6`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border border-black/[0.06] ${
                      i === ETAPAS.length - 1 ? 'bg-ink text-white' : 'bg-white text-ink'
                    }`}>
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <span className="text-[13px] font-medium text-[#86868B] tabular-nums">{n}</span>
                  </div>
                  <div className="pt-8 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6E6E73]">{etapa}</div>
                    <h3 className="text-[19px] font-semibold tracking-[-0.02em] leading-[1.25]">{titulo}</h3>
                    <p className="text-[14px] text-[#6E6E73] leading-[1.55]">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* EL MOTOR — los seis pasos y un ejemplo */}
        <section className="bg-[#0E0E10] text-white py-20 lg:py-28">
          <div className={`${CONTENEDOR} grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-10 sm:gap-14 lg:gap-20 items-center`}>
            <div className="space-y-10">
              <div className="space-y-4">
                <Eyebrow oscuro>El motor</Eyebrow>
                <h2 className="text-[34px] sm:text-[44px] font-bold tracking-[-0.035em] leading-[1.08]">
                  No es un chat. Es un equipo editorial.
                </h2>
                <p className="text-[16px] text-white/60 leading-[1.55]">
                  Cada generación pasa por seis pasos. Lo que no cumple las reglas de la marca se
                  corrige antes de que lo veas.
                </p>
              </div>
              <ol>
                {PASOS.map((p, i) => (
                  <li key={p.t} className="flex gap-5 py-4 border-t border-white/[0.08]">
                    <span className="w-6 shrink-0 text-[13px] font-medium text-white/35 tabular-nums pt-px">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="space-y-1">
                      <div className="text-[15px] font-semibold">{p.t}</div>
                      <p className="text-[14px] text-white/55 leading-[1.5]">{p.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <figure className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  Ejemplo · Black Friday · Marca de alimentos
                </span>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/[0.12] text-emerald-400 text-[12px] font-medium">
                  <Check className="w-3 h-3" /> Coherente
                </span>
              </div>
              <div className="rounded-2xl bg-white text-ink px-6 py-5 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868B]">Concepto de campaña</div>
                <blockquote className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.02em] leading-[1.25]">
                  «Una vez al año bajamos el precio. Hoy.»
                </blockquote>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EJEMPLO.map(({ canal, score, copy, Icon }) => (
                  <div key={canal} className="rounded-2xl bg-white/[0.05] border border-white/[0.08] p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-white/60">
                        <Icon className="w-3.5 h-3.5" /> {canal}
                      </span>
                      <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">{score}</span>
                    </div>
                    <p className="text-[15px] text-white/90 leading-[1.45]">{copy}</p>
                  </div>
                ))}
              </div>
              <figcaption className="text-[12px] text-white/35">
                Puntaje de la crítica, de 1 a 10. Ejemplo ilustrativo.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* CANALES */}
        <section id="canales" className="scroll-mt-4 bg-white py-20 lg:py-28">
          <div className={CONTENEDOR}>
            <div className="max-w-[760px] space-y-4 mb-12 lg:mb-14">
              <Eyebrow>Canales</Eyebrow>
              <h2 className="text-[34px] sm:text-[48px] font-bold tracking-[-0.035em] leading-[1.08]">
                Catorce canales. Cada uno con sus reglas.
              </h2>
              <p className="text-[17px] text-[#6E6E73] leading-[1.55]">
                Un titular de buscador no se escribe como una historia de Instagram. Cada canal tiene
                sus espacios, sus límites de caracteres y sus convenciones, y el motor los respeta sin
                que se los recuerdes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GRUPOS_CANALES.map(({ grupo, Icon, canales }) => (
                <div key={grupo} className="rounded-[20px] bg-[#F5F5F7] p-7">
                  <div className="flex items-center justify-between mb-5">
                    <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} /> {grupo}
                    </span>
                    <span className="text-[13px] font-medium text-[#86868B] tabular-nums">{canales.length}</span>
                  </div>
                  <ul>
                    {canales.map((c, i) => (
                      <li key={c} className={`py-2.5 text-[14px] text-[#3A3A3C] ${i ? 'border-t border-black/[0.06]' : ''}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-10 flex items-start gap-2.5 text-[14px] text-[#6E6E73] leading-[1.5]">
              <PenTool className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              Instagram Post, Instagram Reel, Rich Media y Cuña de Radio entregan, además del copy, la
              instrucción de producción para diseño o audio.
            </p>
          </div>
        </section>

        {/* PARA EQUIPOS */}
        <section id="equipos" className="scroll-mt-4 py-20 lg:py-28">
          <div className={CONTENEDOR}>
            <div className="max-w-[720px] space-y-4 mb-12 lg:mb-14">
              <Eyebrow>Para equipos</Eyebrow>
              <h2 className="text-[34px] sm:text-[48px] font-bold tracking-[-0.035em] leading-[1.08]">
                Pensado para quien maneja varias marcas a la vez.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EQUIPOS.map(({ titulo, desc, Icon }, i) => (
                <div key={titulo}
                  className={`rounded-[20px] p-8 min-h-[260px] flex flex-col gap-16 border border-black/5 ${
                    i === 0 ? 'bg-ink text-white' : 'bg-white'
                  }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-white/10' : 'bg-[#F5F5F7]'}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{titulo}</h3>
                    <p className={`text-[15px] leading-[1.55] ${i === 0 ? 'text-white/65' : 'text-[#6E6E73]'}`}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section
          className="text-white text-center py-24 lg:py-28"
          style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(59,58,92,0.5), transparent 75%), #0E0E10' }}
        >
          <div className={`${CONTENEDOR} flex flex-col items-center gap-8`}>
            <h2 className="text-[34px] sm:text-[52px] font-bold tracking-[-0.038em] leading-[1.08]">
              ¿Te invitaron a un espacio?
            </h2>
            <p className="text-[17px] sm:text-[18px] text-white/65 leading-[1.55] max-w-[560px]">
              Entrá con el mismo correo de la invitación y llegás directo a tu equipo y a tus marcas.
            </p>
            <a href="#acceso" onClick={irAlAcceso}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-ink text-[15px] font-semibold hover:bg-white/90 transition-colors">
              Ingresar a My Voice <ArrowUp className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-[#0E0E10] border-t border-white/[0.08]">
        <div className={`${CONTENEDOR} py-7 flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5">
            <Isotipo size={22} tono="claro" />
            <span className="text-[14px] font-semibold text-white">My Voice</span>
            <span className="text-[14px] text-white/40">Motor de copy multimarca</span>
          </div>
          <span className="text-[13px] text-white/40">Un producto de LoBueno</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
