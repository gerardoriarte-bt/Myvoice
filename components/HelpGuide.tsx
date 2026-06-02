import React, { useState } from 'react';

/* ─── Primitives ──────────────────────────────────────────────────── */

const Badge = ({ children, color = '#0071E3' }: { children: React.ReactNode; color?: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
    background: color + '18', color,
  }}>
    {children}
  </span>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
    background: '#EFF6FF', border: '1px solid #BFDBFE', marginTop: 12,
  }}>
    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
    <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>{children}</p>
  </div>
);

const Warning = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
    background: '#FFFBEB', border: '1px solid #FDE68A', marginTop: 12,
  }}>
    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
    <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>{children}</p>
  </div>
);

const FieldRow = ({ name, desc, required }: { name: string; desc: string; required?: boolean }) => (
  <div style={{
    display: 'flex', gap: 12, padding: '10px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  }}>
    <div style={{ minWidth: 160, flexShrink: 0 }}>
      <code style={{
        fontSize: 12, fontFamily: 'ui-monospace, monospace',
        background: '#F5F5F7', padding: '2px 7px', borderRadius: 5,
        color: '#1D1D1F', fontWeight: 500,
      }}>{name}</code>
      {required && <span style={{ marginLeft: 4, fontSize: 10, color: '#DC2626', fontWeight: 700 }}>REQ</span>}
    </div>
    <p style={{ margin: 0, fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>{desc}</p>
  </div>
);

const StepNumber = ({ n, active }: { n: number; active?: boolean }) => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    background: active ? '#1D1D1F' : '#E5E5EA',
    color: active ? '#fff' : '#6E6E73',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  }}>{n}</div>
);

/* ─── Accordion ───────────────────────────────────────────────────── */

const Section = ({ id, title, badge, children, open, onToggle }: {
  id: string; title: string; badge?: string;
  children: React.ReactNode; open: boolean; onToggle: () => void;
}) => (
  <div style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.09)', overflow: 'hidden', marginBottom: 12 }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: open ? '#fff' : '#FAFAFA', border: 'none', cursor: 'pointer',
        borderBottom: open ? '1px solid rgba(0,0,0,0.07)' : 'none',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', textAlign: 'left' }}>{title}</span>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    {open && <div style={{ padding: '20px 24px', background: '#fff' }}>{children}</div>}
  </div>
);

/* ─── Pipeline visualization ──────────────────────────────────────── */

const LAYERS = [
  { name: 'Director', role: 'Estratega', desc: 'Define la espina de campaña: concepto, tono, mensaje clave, CTA hero y 3 ángulos creativos distintos.', color: '#6366F1', icon: '🎯' },
  { name: 'Writer', role: 'Copywriter', desc: 'Especialista por canal. Escribe las variaciones respetando slots, budget de caracteres/palabras y prohibiciones.', color: '#0EA5E9', icon: '✍️' },
  { name: 'Critic', role: 'Editor', desc: 'Re-evalúa cada pieza con rúbrica estricta (identidad de marca, budget, unicidad). Puede bajar el score del Writer.', color: '#F59E0B', icon: '🔍' },
  { name: 'Fixer', role: 'Corrector', desc: 'Si una pieza rompió reglas duras (presupuesto o prohibición), la reescribe automáticamente sin cambiar su intent.', color: '#10B981', icon: '🔧' },
  { name: 'SuperCritic', role: 'Director Creativo', desc: 'Audita la coherencia cross-channel de toda la campaña. Emite un score global y detecta derive de tono o concepto.', color: '#EC4899', icon: '🏆' },
];

const Pipeline = () => (
  <div style={{ display: 'flex', gap: 8, marginTop: 20, marginBottom: 4, overflowX: 'auto', paddingBottom: 4 }}>
    {LAYERS.map((l, i) => (
      <React.Fragment key={l.name}>
        <div style={{
          flex: '0 0 auto', width: 148,
          borderRadius: 12, border: `1.5px solid ${l.color}22`,
          background: l.color + '08', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{l.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: l.color }}>{l.name}</div>
          <div style={{ fontSize: 11, color: '#6E6E73', marginBottom: 6 }}>{l.role}</div>
          <p style={{ margin: 0, fontSize: 12, color: '#3D3D3F', lineHeight: 1.5 }}>{l.desc}</p>
        </div>
        {i < LAYERS.length - 1 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ─── Channel grid ────────────────────────────────────────────────── */

const CHANNELS: { group: string; items: { id: string; name: string; desc: string }[] }[] = [
  {
    group: 'Social',
    items: [
      { id: 'instagramPost', name: 'Instagram Post', desc: 'Imagen o carrusel estático. Slots: caption + CTA. Budget: 2200 car.' },
      { id: 'instagramHistoria', name: 'Instagram Story', desc: 'Contenido vertical efímero. Copy corto + sticker de acción.' },
      { id: 'instagramCarrusel', name: 'Instagram Carrusel', desc: 'Narrativa en diapositivas (hasta 10). Slots por slide.' },
      { id: 'instagramReel', name: 'Instagram Reel', desc: 'Video corto. Hook (3 seg), desarrollo y cierre.' },
      { id: 'tiktok', name: 'TikTok', desc: 'Hook visual + narración + CTA. Tono más conversacional.' },
      { id: 'youtube', name: 'YouTube', desc: 'Título, descripción y guión de intro para video largo.' },
    ],
  },
  {
    group: 'Publicidad',
    items: [
      { id: 'googleAds', name: 'Google Ads', desc: 'Titulares (30 car) + descripciones (90 car). Múltiples variaciones para pruebas.' },
      { id: 'googleDisplay', name: 'Google Display', desc: 'Headline + copy de banner para red de display.' },
      { id: 'richMedia', name: 'Rich Media', desc: 'Banners interactivos con secuencia narrativa.' },
      { id: 'popUp', name: 'Pop-Up', desc: 'Titular + subtítulo + CTA para overlay de sitio web.' },
    ],
  },
  {
    group: 'Directo',
    items: [
      { id: 'email', name: 'Email', desc: 'Asunto, preheader, saludo, cuerpo y firma. Slots completos.' },
      { id: 'pushNotification', name: 'Push Notification', desc: 'Título corto + cuerpo breve. Urgencia alta.' },
      { id: 'whatsapp', name: 'WhatsApp', desc: 'Mensaje conversacional con estructura natural y CTA suave.' },
    ],
  },
  {
    group: 'Audio',
    items: [
      { id: 'cunaRadio', name: 'CUNA Radio', desc: 'Guión de cuña radial: apertura, desarrollo y cierre con locutor.' },
    ],
  },
];

const ChannelGrid = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
    {CHANNELS.map(g => (
      <div key={g.group}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.group}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {g.items.map(ch => (
            <div key={ch.id} style={{
              padding: '10px 12px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>{ch.name}</div>
              <p style={{ margin: 0, fontSize: 12, color: '#6E6E73', lineHeight: 1.4 }}>{ch.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ─── Glossary ────────────────────────────────────────────────────── */

const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Espina de Campaña', def: 'El esqueleto estratégico generado por el Director. Contiene concepto creativo, mensaje clave, tono, CTA hero y 3 ángulos creativos. Actúa como "ancla" para que todos los canales hablen con una sola voz.' },
  { term: 'Concepto de Campaña', def: 'Frase tagline (máx. ~12 palabras) que resume la idea creativa central. Si lo escribís vos, el sistema lo usa verbatim sin modificarlo. Si lo dejás vacío, el Director lo genera.' },
  { term: 'ADN de Marca', def: 'El conjunto de campos globales de una marca (voz, propuesta de valor, guías, keywords, prohibiciones) que se inyectan en cada generación. Es el "quién sos" de la marca.' },
  { term: 'Perfil de ADN / Campaña', def: 'Una instancia de campaña específica dentro de una marca. Tiene su propio producto, audiencia, objetivo y brief. Una marca puede tener múltiples perfiles para distintas campañas simultáneas.' },
  { term: 'Voice Fingerprint', def: 'Análisis lingüístico de ejemplos reales de la marca. Detecta arquetipo, longitud de oraciones, puntuación, tics lingüísticos, palabras favoritas y a evitar. Se inyecta en el prompt del Writer para que el copy suene más auténtico.' },
  { term: 'Slot', def: 'Unidad mínima de copy dentro de un canal. Por ejemplo, en un Email: Asunto, Preheader, Saludo, Cuerpo, CTA, Firma. Cada slot tiene un budget propio de caracteres o palabras.' },
  { term: 'Budget', def: 'Límite de caracteres o palabras por slot. Si el Writer excede el límite, el Critic lo penaliza y el Fixer lo reescribe automáticamente.' },
  { term: 'Writer Score / Editor Score', def: 'El Writer se autoasigna un puntaje (generoso). El Critic lo reevalúa con una rúbrica más estricta. En los resultados, si ambos difieren, verás los dos valores.' },
  { term: 'Editor Flags', def: 'Etiquetas que el Critic asigna a cada pieza para señalar problemas: generic, concept-drift, tone-mismatch, prohibition-paraphrase, budget-violation, redundant, weak-cta, agency-speak.' },
  { term: 'Coherence Score', def: 'Puntaje 1-10 del SuperCritic que mide si toda la campaña se siente como UNA sola voz o como N marcas distintas. Disponible cuando generás 2+ canales.' },
  { term: 'Etapa del Funnel', def: 'Awareness (TOFU), Consideration (MOFU), Conversion (BOFU), Retention. Define el tono y los CTAs apropiados para cada etapa del journey del cliente.' },
  { term: 'Bucle de Feedback', def: 'Los contenidos que aprobás en la biblioteca se reinyectan automáticamente como ejemplos few-shot en la próxima generación de esa marca. El motor "aprende" qué estilo te gusta.' },
  { term: 'Prohibiciones', def: 'Palabras o frases que el motor debe evitar. Se aplican tanto en la generación original como en la revisión del Critic (que también detecta paráfrasis semánticamente cercanas).' },
  { term: 'Auto-fix', def: 'Si una variación rompe reglas duras (presupuesto excedido o prohibición usada), el Fixer la reescribe automáticamente antes de mostrarte los resultados. Las piezas corregidas llevan el ícono 🔧.' },
];

/* ─── Main component ──────────────────────────────────────────────── */

const ALL_SECTIONS = [
  'intro', 'motor', 'marca', 'campana', 'generar', 'resultados', 'biblioteca', 'ia', 'canales', 'glosario',
];

export default function HelpGuide() {
  const [open, setOpen] = useState<string>('intro');

  const toggle = (id: string) => setOpen(prev => prev === id ? '' : id);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.025em' }}>
          Guía de uso · My Voice
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: '#6E6E73', lineHeight: 1.5 }}>
          Todo lo que necesitás saber para generar campañas multicanal con IA, de principio a fin.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: '14 canales', color: '#6366F1' },
            { label: '5 capas IA', color: '#0EA5E9' },
            { label: 'Multi-proveedor', color: '#10B981' },
            { label: 'Bucle de feedback', color: '#F59E0B' },
          ].map(b => <span key={b.label}><Badge color={b.color}>{b.label}</Badge></span>)}
        </div>
      </div>

      {/* ── 1. ¿Qué es My Voice? ── */}
      <Section id="intro" title="¿Qué es My Voice?" badge="Inicio" open={open === 'intro'} onToggle={() => toggle('intro')}>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          <strong>My Voice</strong> es una plataforma de generación de copy publicitario multicanal impulsada por IA. Está diseñada para agencias y equipos de marketing que necesitan producir contenido de marca coherente, a escala y con control creativo.
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          A diferencia de un chatbot genérico, My Voice orquesta <strong>cinco agentes especializados</strong> que trabajan en secuencia: un Director estratégico define el ancla creativa, Writers especializados producen el copy canal por canal, un Critic lo audita con rúbrica estricta, un Fixer corrige violaciones automáticamente, y un SuperCritic audita la coherencia de toda la campaña.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Todo el sistema opera sobre el ADN de tu marca — voz, propuesta de valor, guías, prohibiciones — para que el output siempre suene <em>inconfundiblemente</em> a tu marca, no a copy genérico de agencia.
        </p>

      </Section>

      {/* ── 2. El motor en 5 capas ── */}
      <Section id="motor" title="El motor en 5 capas" badge="Arquitectura IA" open={open === 'motor'} onToggle={() => toggle('motor')}>
        <p style={{ margin: '0 0 4px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Cada generación dispara una pipeline de 5 agentes IA en secuencia. Entender cómo funciona cada uno te ayuda a interpretar los resultados.
        </p>
        <Pipeline />
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F5F5F7', fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>
            <strong>¿Cuánto cuesta una generación?</strong> Cada canal dispara llamadas al Writer + Critic + Fixer (si hay errores). El SuperCritic se ejecuta una vez al final. Típicamente: 2–5 canales ≈ 5.000–15.000 tokens por generación con GPT-4o / Claude Sonnet.
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F5F5F7', fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>
            <strong>¿Los canales se generan en paralelo?</strong> Sí. El Director corre primero y luego todos los canales se generan simultáneamente. La barra de progreso muestra el estado de cada canal en tiempo real.
          </div>
        </div>
      </Section>

      {/* ── 3. Configurar una marca ── */}
      <Section id="marca" title="Paso 1 · Configurar tu marca" badge="Brand Voice" open={open === 'marca'} onToggle={() => toggle('marca')}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { n: 1, text: 'Creá la marca' },
            { n: 2, text: 'Completá el ADN' },
            { n: 3, text: 'Subí el PDF (opcional)' },
            { n: 4, text: 'Computá el Fingerprint' },
          ].map(s => (
            <div key={s.n} style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <StepNumber n={s.n} active />
              <span style={{ fontSize: 13, color: '#1D1D1F', fontWeight: 500, lineHeight: 1.4, paddingTop: 2 }}>{s.text}</span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 10px' }}>Campos del ADN Global de Marca</h3>
        <FieldRow name="Nombre" required desc="Nombre comercial de la marca tal como aparece en comunicaciones." />
        <FieldRow name="Industria" required desc="Categoría o sector. Permite al motor contextualizar el tipo de lenguaje esperado." />
        <FieldRow name="Logo" desc="Imagen de la marca. Se muestra en la interfaz y en los mockups visuales de los resultados." />
        <FieldRow name="Voz" required desc="Arquetipo de voz de marca (ej. 'Directo y honesto', 'Sofisticado', 'Cercano y humano'). Es el registro global que el Writer debe mantener en todos los canales." />
        <FieldRow name="Propuesta de Valor" required desc="Una o dos oraciones que expresan el beneficio único de la marca. El Director la usa para construir ángulos creativos diferenciadores." />
        <FieldRow name="Guías de Voz de Marca" desc="Instrucciones estilísticas detalladas: qué palabras usar/evitar, si tutear o no, si usar signos de exclamación, longitud de oraciones, etc. Cuanto más específicas, mejor el output." />
        <FieldRow name="Keywords (Globales)" desc="Palabras clave que el Writer debe favorecer en los textos. Se acumulan con las keywords de nivel campaña." />
        <FieldRow name="Prohibiciones (Globales)" desc="Palabras o frases completamente vetadas para esta marca. El Critic también detecta paráfrasis semánticamente cercanas." />

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>PDF de Guía de Marca</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Si tu marca tiene un Brand Book o manual de identidad en PDF, podés subirlo directamente. La IA extrae automáticamente voz, propuesta de valor, keywords y prohibiciones, y los carga en los campos correspondientes.
        </p>
        <Warning>
          La extracción de PDF es un punto de partida. Revisá siempre los campos extraídos antes de generar, especialmente las prohibiciones. La IA puede malinterpretar ejemplos negativos en el manual como cosas a replicar.
        </Warning>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Voice Fingerprint</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          El Fingerprint es un análisis lingüístico de ejemplos reales de copy de la marca. Se genera pulsando el botón <strong>"Calcular Fingerprint"</strong> en la pantalla de marca.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          El resultado incluye: arquetipo de marca, persona gramatical predominante, longitud media de oraciones, densidad de puntuación, tics lingüísticos frecuentes, palabras favoritas y palabras a evitar. Todo esto se inyecta en el prompt del Writer como contexto adicional.
        </p>
        <Tip>
          Para calcular el Fingerprint necesitás al menos 3–5 ejemplos de copy guardados en la biblioteca de esa marca (variaciones aprobadas). Cuantos más ejemplos, más preciso el análisis.
        </Tip>
      </Section>

      {/* ── 4. Crear perfil de campaña ── */}
      <Section id="campana" title="Paso 2 · Crear un perfil de campaña (ADN)" badge="Brand Voice" open={open === 'campana'} onToggle={() => toggle('campana')}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Un <strong>Perfil de ADN</strong> es una instancia de campaña dentro de una marca. Una marca puede tener múltiples perfiles activos simultáneamente (ej. "Campaña verano 2026", "Lanzamiento producto X", "Retención clientes premium").
        </p>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 10px' }}>Campos del perfil</h3>
        <FieldRow name="Nombre" required desc="Identificador interno de la campaña. No aparece en el copy generado." />
        <FieldRow name="Concepto de Campaña" desc="La idea creativa central expresada en una frase tagline. Si lo completás, el Director lo usa verbatim como ancla. Si lo dejás vacío, el Director lo genera libre. Ejemplo: 'Una vez al año bajamos el precio. Hoy.'" />
        <FieldRow name="Objetivo" required desc="Objetivo táctico de marketing (ej. 'Captación de nuevos usuarios', 'Reactivación de churns', 'Cross-sell de producto premium'). Orienta el enfoque del Director." />
        <FieldRow name="Producto/Servicio" required desc="Qué se está comunicando en esta campaña. Puede ser un producto específico, un servicio, una propuesta estacional, etc." />
        <FieldRow name="Audiencia" required desc="Descripción del target. Cuanto más específica (edad, comportamiento, contexto, pain point), más afinados los ángulos creativos." />
        <FieldRow name="Brief / Tema" required desc="El encuadre creativo o contexto de la campaña. Puede ser una estación, un evento, un insight de mercado, una tensión cultural." />
        <FieldRow name="Keywords (Campaña)" desc="Palabras clave específicas de esta campaña. Se suman a las globales de la marca." />
        <FieldRow name="Prohibiciones (Campaña)" desc="Términos vetados específicos de este brief. Por ejemplo: no mencionar al competidor X, no usar el término 'gratis', etc." />
        <FieldRow name="CTA Principal" desc="La llamada a la acción preferida para esta campaña. El Writer la adopta como CTA hero (aunque puede variar por canal si el slot lo requiere)." />
        <FieldRow name="Guías de Voz / Propuesta de Valor" desc="Versión de campaña que sobreescribe la global. Útil si esta campaña tiene un tono diferente al habitual de la marca." />

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Ejemplos de entrenamiento (few-shot)</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Podés agregar ejemplos de copy aprobado anteriormente para que el Writer aprenda el estilo esperado. Cada ejemplo lleva la plataforma de origen y el texto. Mientras más ejemplos específicos y aprobados, mejor el calibrado.
        </p>
        <Tip>
          Los contenidos que aprobás en la Biblioteca se inyectan automáticamente como few-shot en la siguiente generación de esa marca (hasta 5 ejemplos más recientes). No necesitás agregarlos manualmente si ya los tenés en la biblioteca.
        </Tip>
      </Section>

      {/* ── 5. Generar contenido ── */}
      <Section id="generar" title="Paso 3 · Generar contenido" badge="Generate" open={open === 'generar'} onToggle={() => toggle('generar')}>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Con la marca y el perfil configurados, accedé a la pestaña <strong>Generate</strong>. El formulario tiene cuatro secciones:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              n: 1, title: 'Seleccioná la marca',
              desc: 'Elegí la marca del desplegable. Verás su logo, industria y si tiene Voice Fingerprint activo.',
            },
            {
              n: 2, title: 'Seleccioná el perfil de campaña',
              desc: 'Elegí el perfil (ADN) de campaña. Verás el concepto, objetivo y la cantidad de ejemplos de entrenamiento disponibles.',
            },
            {
              n: 3, title: 'Elegí la etapa del funnel',
              desc: 'Awareness → Consideration → Conversion → Retention. Esto cambia radicalmente el tono, los ángulos y los CTAs generados. Awareness usa lenguaje educativo/curioso; Conversion usa urgencia y manejo de objeción.',
            },
            {
              n: 4, title: 'Seleccioná los canales',
              desc: 'Marcá todos los canales que necesitás. Se pueden seleccionar hasta 14. Cada canal tiene su spec propia con slots y budgets distintos. Los canales se procesan en paralelo.',
            },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, background: '#F5F5F7' }}>
              <StepNumber n={s.n} active />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>{s.title}</div>
                <p style={{ margin: 0, fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>



        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Barra de progreso en tiempo real</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Mientras se genera, la interfaz muestra el estado de cada canal por separado (Pending → En progreso → Done / Error). El resultado de cada canal aparece en pantalla en cuanto está listo, sin esperar a que terminen los demás.
        </p>
        <Warning>
          Si un canal falla (ej. por timeout), los demás continúan normalmente. El canal con error se muestra con estado "Error" y un mensaje descriptivo. Podés regenerar solo ese canal luego.
        </Warning>
      </Section>

      {/* ── 6. Interpretar resultados ── */}
      <Section id="resultados" title="Paso 4 · Interpretar los resultados" badge="Generate" open={open === 'resultados'} onToggle={() => toggle('resultados')}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 10px' }}>Estructura de los resultados</h3>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Los resultados se organizan por canal y luego por <strong>slot</strong> (unidad mínima de copy). Cada slot puede tener múltiples variaciones de ángulos creativos distintos.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Score (1–10)', desc: 'Puntuación del Critic. Verde ≥ 8, Amarillo 6–7, Rojo < 6.' },
            { label: 'Rationale', desc: 'Una línea concreta del Critic explicando el puntaje. Cita palabras o recursos específicos.' },
            { label: 'Writer vs Editor', desc: 'Si ambos puntajes difieren, se muestran los dos. El Editor siempre es más estricto.' },
            { label: 'Budget indicator', desc: 'Verde: dentro del límite. Rojo: excedido. Los excedidos habrán sido corregidos por el Fixer.' },
            { label: 'Prohibiciones', desc: 'Badge ⚠ con la lista de términos vetados encontrados (si no los corrigió el Fixer).' },
            { label: 'Editor Flags', desc: 'Etiquetas de problemas: generic, tone-mismatch, agency-speak, weak-cta, etc.' },
            { label: 'Auto-fix 🔧', desc: 'Indica que la variación original rompió una regla y fue reescrita automáticamente.' },
            { label: 'Idea Visual', desc: 'Si el Writer incluyó una sugerencia de arte/imagen, aparece en un chip especial.' },
          ].map(i => (
            <div key={i.label} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>{i.label}</div>
              <p style={{ margin: 0, fontSize: 12, color: '#6E6E73', lineHeight: 1.4 }}>{i.desc}</p>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Reporte de Coherencia (SuperCritic)</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Cuando generás 2 o más canales, el SuperCritic analiza toda la campaña como un deck y emite un <strong>Coherence Score (1–10)</strong> con el veredicto general, los problemas detectados por par de canales y los flags de derive.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'concept-drift', desc: 'Un canal no refleja el concepto creativo central.' },
            { label: 'tone-drift', desc: 'El registro tonal varía demasiado entre canales.' },
            { label: 'message-conflict', desc: 'Dos canales transmiten mensajes contradictorios.' },
            { label: 'cta-misalignment', desc: 'Los CTAs no corresponden a la etapa del funnel.' },
            { label: 'channel-orphan', desc: 'Un canal parece de una campaña completamente distinta.' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <code style={{ fontSize: 11, color: '#C2410C', fontFamily: 'ui-monospace, monospace', flexShrink: 0, paddingTop: 2 }}>{f.label}</code>
              <span style={{ fontSize: 13, color: '#7C2D12' }}>{f.desc}</span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Acciones sobre las variaciones</h3>
        <FieldRow name="Bloquear 🔒" desc="Marca la variación para que no sea reemplazada si regenerás. Útil cuando encontrás una pieza que ya funciona bien pero querés mejorar las demás." />
        <FieldRow name="Feedback negativo 👎" desc="Marca la variación como contenido a evitar. Se guarda en la base de datos y se inyecta como ejemplo negativo en futuras generaciones de esa marca." />
        <FieldRow name="Editar ✏️" desc="Abre un textarea para editar el contenido directamente antes de guardarlo." />
        <FieldRow name="Guardar" desc="Agrega la variación a la biblioteca. Podés asignarla a un proyecto existente o crear uno nuevo." />
        <FieldRow name="Regenerar" desc="Vuelve a correr el motor para las variaciones no bloqueadas. Las bloqueadas se mantienen intactas." />
        <FieldRow name="Exportar Excel" desc="Descarga un archivo .xlsx con una hoja de resumen y una hoja por canal, incluyendo scores, rationale y flags." />
      </Section>

      {/* ── 7. Biblioteca ── */}
      <Section id="biblioteca" title="Paso 5 · Gestionar la biblioteca" badge="Content Selection" open={open === 'biblioteca'} onToggle={() => toggle('biblioteca')}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          La pestaña <strong>Content Selection</strong> es la biblioteca central de contenido aprobado. Acá conviven todo el copy guardado de todas las marcas, organizado por proyectos.
        </p>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 10px' }}>Filtros disponibles</h3>
        <FieldRow name="Canal" desc="Filtrar por plataforma (Instagram, Email, TikTok, etc.)." />
        <FieldRow name="Marca" desc="Ver el contenido de una sola marca. Solo disponible para admins." />
        <FieldRow name="Estado" desc="Todo · Aprobado · Pendiente de revisión." />
        <FieldRow name="Búsqueda" desc="Busca en el texto del contenido. La búsqueda es en tiempo real sobre los resultados ya filtrados." />

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Acciones disponibles</h3>
        <FieldRow name="Aprobar ✓" desc="Marca el contenido como aprobado. Los contenidos aprobados se inyectan como few-shot en próximas generaciones de esa marca (bucle de feedback)." />
        <FieldRow name="Editar" desc="Modifica el contenido directamente en la tabla. El cambio se guarda en la base de datos." />
        <FieldRow name="Eliminar" desc="Solo disponible en contenidos no aprobados. Para eliminar uno aprobado, primero desaprobalo." />

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Proyectos</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Los proyectos son carpetas organizativas. Al guardar una variación desde los resultados, podés asignarla a un proyecto existente o crear uno nuevo. Los proyectos se listan en la columna de estado de la biblioteca.
        </p>
        <Tip>
          Organizá los proyectos por campaña o mes de ejecución para mantener la biblioteca limpia. Ejemplo: "Campaña Verano 2026 — Terpel", "Black Friday — Club Colombia".
        </Tip>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '20px 0 10px' }}>Vista de cliente (rol CLIENT)</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          Los usuarios con rol CLIENT solo ven el contenido de su propia marca. No pueden ver marcas de otros clientes ni columnas sensibles. Pueden marcar contenido como aprobado/pendiente pero no pueden editarlo ni eliminarlo. Esta vista se llama <em>Control de marca</em>.
        </p>
      </Section>

      {/* ── 8. Configurar IA ── */}
      <Section id="ia" title="Paso 6 · Configurar tu proveedor de IA" badge="Settings" open={open === 'ia'} onToggle={() => toggle('ia')}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          En la pestaña <strong>Settings</strong> podés configurar tu propio proveedor y API key de IA. El sistema soporta tres proveedores, todos con modelos de calidad comparable.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { name: 'OpenAI', key: 'sk-...', writer: 'gpt-4o', mini: 'gpt-4o-mini', color: '#10B981' },
            { name: 'Anthropic', key: 'sk-ant-...', writer: 'claude-sonnet-4-6', mini: 'claude-haiku-4-5', color: '#6366F1' },
            { name: 'Google Gemini', key: 'AIza...', writer: 'gemini-2.0-flash', mini: 'gemini-2.0-flash', color: '#0EA5E9' },
          ].map(p => (
            <div key={p.name} style={{ padding: '14px', borderRadius: 12, border: `1.5px solid ${p.color}22`, background: p.color + '08' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#3D3D3F', lineHeight: 1.6 }}>
                <div><span style={{ color: '#6E6E73' }}>Key prefix:</span> <code>{p.key}</code></div>
                <div><span style={{ color: '#6E6E73' }}>Writer:</span> {p.writer}</div>
                <div><span style={{ color: '#6E6E73' }}>Critic/Fixer:</span> {p.mini}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 10px' }}>Cómo configurarla</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: 1, text: 'Ir a Settings en la barra lateral.' },
            { n: 2, text: 'Seleccionar el proveedor (OpenAI, Anthropic o Google Gemini).' },
            { n: 3, text: 'Pegar tu API key. El sistema valida que sea correcta antes de guardar.' },
            { n: 4, text: 'Opcionalmente, elegir un modelo específico del desplegable. Si lo dejás vacío, se usa el predeterminado.' },
            { n: 5, text: 'Guardar. A partir de ese momento, todas las generaciones del workspace usan tu key.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <StepNumber n={s.n} />
              <span style={{ fontSize: 13, color: '#3D3D3F', lineHeight: 1.5, paddingTop: 4 }}>{s.text}</span>
            </div>
          ))}
        </div>

        <Warning>
          La API key se almacena cifrada en la base de datos y nunca se devuelve al cliente en texto plano. Si sospechás que fue comprometida, generá una nueva en el portal del proveedor y actualizala aquí.
        </Warning>
        <Tip>
          Si tu workspace no tiene API key configurada, el sistema usa la clave del servidor (si el administrador de la plataforma la configuró). Verificá con el admin si la generación real está disponible.
        </Tip>
      </Section>

      {/* ── 9. Canales ── */}
      <Section id="canales" title="Referencia de canales" badge="14 canales" open={open === 'canales'} onToggle={() => toggle('canales')}>
        <p style={{ margin: '0 0 4px', fontSize: 14, color: '#3D3D3F', lineHeight: 1.65 }}>
          My Voice soporta 14 canales divididos en 4 grupos. Cada canal tiene slots propios con budgets de caracteres o palabras.
        </p>
        <ChannelGrid />
        <Tip>
          Para campañas de alto impacto, empezá con 3–4 canales clave para tu objetivo. Luego podés expandir a más canales en una segunda generación. Seleccionar los 14 a la vez es posible pero alarga el tiempo de generación.
        </Tip>
      </Section>

      {/* ── 10. Glosario ── */}
      <Section id="glosario" title="Glosario de términos" open={open === 'glosario'} onToggle={() => toggle('glosario')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {GLOSSARY.map(item => (
            <div key={item.term} style={{
              display: 'flex', gap: 20, padding: '12px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div style={{ minWidth: 180, flexShrink: 0 }}>
                <strong style={{ fontSize: 13, color: '#1D1D1F' }}>{item.term}</strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#3D3D3F', lineHeight: 1.55 }}>{item.def}</p>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ textAlign: 'center', padding: '32px 0 16px', color: '#86868B', fontSize: 12 }}>
        My Voice · Powered by LoBueno · {new Date().getFullYear()}
      </div>
    </div>
  );
}
