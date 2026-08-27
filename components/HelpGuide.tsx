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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>{children}</p>
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

const Step = ({ n, title, desc }: { n: number; title?: string; desc: string }) => (
  <div style={{ display: 'flex', gap: 14, padding: '12px 16px', borderRadius: 10, background: '#F5F5F7' }}>
    <StepNumber n={n} active />
    <div>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', marginBottom: 3 }}>{title}</div>}
      <p style={{ margin: 0, fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>{desc}</p>
    </div>
  </div>
);

const SectionHeader = ({ icon, title, what }: { icon: React.ReactNode; title: string; what: string }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1D1D1F' }}>{title}</h2>
    </div>
    <p style={{ margin: 0, fontSize: 14, color: '#3D3D3F', lineHeight: 1.6 }}>{what}</p>
  </div>
);

const SubHead = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', margin: '18px 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</h3>
);

/* ─── Accordion ───────────────────────────────────────────────────── */

const Section = ({ id, title, badge, badgeColor, children, open, onToggle }: {
  id: string; title: string; badge?: string; badgeColor?: string;
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
        {badge && <Badge color={badgeColor}>{badge}</Badge>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    {open && <div style={{ padding: '20px 24px', background: '#fff' }}>{children}</div>}
  </div>
);

/* ─── SVG Icons ───────────────────────────────────────────────────── */

const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconSliders = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBookmark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);
const IconAward = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

/* ─── Main component ──────────────────────────────────────────────── */

const ALL_SECTIONS = [
  'generador', 'presets', 'historial', 'biblioteca', 'collab', 'portal', 'analytics', 'scorecard', 'config', 'email',
];

export default function HelpGuide() {
  const [open, setOpen] = useState<string>('generador');
  const toggle = (id: string) => setOpen(prev => prev === id ? '' : id);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.025em' }}>
          Guia de uso · My Voice
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: '#6E6E73', lineHeight: 1.5 }}>
          Referencia completa de todas las funcionalidades de la plataforma.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Generador', color: '#6366F1' },
            { label: 'Biblioteca', color: '#10B981' },
            { label: 'Colaboracion', color: '#EC4899' },
            { label: 'Métricas', color: '#0071E3' },
          ].map(b => <span key={b.label}><Badge color={b.color}>{b.label}</Badge></span>)}
        </div>
      </div>

      {/* ── 1. Generador de copy ── */}
      <Section id="generador" title="1. Generar" badge="Core" badgeColor="#6366F1" open={open === 'generador'} onToggle={() => toggle('generador')}>
        <SectionHeader
          icon={<IconZap />}
          title="Generador de copy"
          what="El motor principal de la plataforma. Configura los parametros de tu campana y genera copy multicanal en tiempo real con 5 agentes IA en cadena."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Selecciona el cliente y perfil de ADN" desc="Elige el cliente del desplegable y luego el perfil de campana (ADN) que quieres usar. El perfil contiene el producto, audiencia, objetivo y brief de la campana." />
          <Step n={2} title="Configura los parametros" desc="Elige las plataformas que necesitas (hasta 14 canales), la etapa del funnel (Awareness / Consideration / Conversion / Retention), la voz de marca y el objetivo de la pieza." />
          <Step n={3} title="Genera" desc="Presiona Generar. La barra de progreso muestra el estado de cada canal en tiempo real. Las variaciones aparecen en pantalla en cuanto cada canal termina, sin esperar a los demas." />
          <Step n={4} title="Regenera todo o por canal" desc="El boton Regenerar vuelve a correr el motor para todos los canales no bloqueados. Cada tarjeta de canal tiene un icono de recarga pequeno que regenera solo ese canal de forma individual." />
          <Step n={5} title="Bloquea canales" desc="Presiona el icono de candado en cualquier variacion para bloquearla. Las variaciones bloqueadas no se sobreescriben al regenerar. Util cuando encontras una pieza que ya funciona y solo queres mejorar las demas." />
        </div>

        <Tip>
          Combina bloqueo y regeneracion parcial: bloquea las variaciones que ya te gustan, luego regenera para mejorar el resto. Podes iterar tantas veces como quieras sin perder lo que ya funciona.
        </Tip>
      </Section>

      {/* ── 2. Presets de parametros ── */}
      <Section id="presets" title="2. Presets de parametros" badge="Nuevo" badgeColor="#10B981" open={open === 'presets'} onToggle={() => toggle('presets')}>
        <SectionHeader
          icon={<IconSliders />}
          title="Presets de parametros"
          what="Guarda una configuracion completa del formulario como un preset con nombre. Cargalo en un clic para rellenar automaticamente todos los campos en futuras generaciones."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Configura el formulario" desc="Llena todos los parametros que quieres conservar: cliente, perfil de ADN, plataformas seleccionadas, etapa del funnel, voz de marca y objetivo." />
          <Step n={2} title="Guarda el preset" desc="Presiona el boton Guardar preset, asignale un nombre descriptivo (ej. 'Terpel — Awareness Social') y confirma. El preset queda disponible en el selector." />
          <Step n={3} title="Carga un preset" desc="Al inicio de una nueva sesion, abre el selector de presets y elige el que necesitas. Todos los campos del formulario se rellenan automaticamente." />
          <Step n={4} title="Elimina presets obsoletos" desc="Abre el selector, pasa el cursor sobre el preset que ya no necesitas y presiona el icono de basura para eliminarlo." />
        </div>

        <Tip>
          Los presets son especialmente utiles para campanas recurrentes del mismo cliente: no tenes que configurar todo desde cero cada vez que necesitas generar para el mismo brief.
        </Tip>
      </Section>

      {/* ── 3. Historial de generaciones ── */}
      <Section id="historial" title="3. Historial de generaciones" badge="Historial" badgeColor="#F59E0B" open={open === 'historial'} onToggle={() => toggle('historial')}>
        <SectionHeader
          icon={<IconClock />}
          title="Historial de generaciones"
          what="Registro cronologico de todas las generaciones realizadas. Podes consultar resultados anteriores, ver la espina de campana y restaurar cualquier generacion en el editor."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Accede al historial" desc="Abre la pestaña Historial. Las generaciones aparecen agrupadas por fecha, de la mas reciente a la mas antigua." />
          <Step n={2} title="Filtra por cliente" desc="Usa el filtro de cliente en la parte superior para ver solo las generaciones de una marca especifica." />
          <Step n={3} title="Expande una generacion" desc="Presiona en cualquier generacion para expandirla. Veras la espina de campana (concepto, angulos creativos, mensaje clave) y todas las variaciones generadas por canal." />
          <Step n={4} title="Restaura en el generador" desc="Presiona el boton Restaurar en el generador para cargar esa espina y sus variaciones de vuelta en el editor. Podes editarlas, bloquear partes y regenerar desde donde quedaste." />
        </div>

        <Tip>
          Usar Restaurar en el generador es ideal para retomar una campana anterior y extenderla a nuevos canales sin perder el concepto creativo original.
        </Tip>
      </Section>

      {/* ── 4. Biblioteca de copy ── */}
      <Section id="biblioteca" title="4. Biblioteca" badge="Biblioteca" badgeColor="#10B981" open={open === 'biblioteca'} onToggle={() => toggle('biblioteca')}>
        <SectionHeader
          icon={<IconBookmark />}
          title="Biblioteca"
          what="El repositorio central de todo el copy guardado. Organiza, filtra, etiqueta y gestiona las variaciones aprobadas de todos los clientes."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Guarda variaciones" desc="Desde los resultados del generador, presiona Guardar en cualquier variacion individual. Para guardarlas todas de una vez, usa el boton Guardar todas que aparece en la parte superior de los resultados." />
          <Step n={2} title="Filtra y busca" desc="Usa los filtros de plataforma, estado (aprobado / pendiente) y ordenamiento. La busqueda de texto es en tiempo real sobre el contenido de las variaciones. Tambien podes filtrar por etiquetas." />
          <Step n={3} title="Agrega etiquetas" desc="Abre cualquier variacion y agrega o quita etiquetas para organizarla. Las etiquetas son libres: podes crear las que necesites (ej. 'verano', 'promo', 'lanzamiento')." />
          <Step n={4} title="Operaciones en lote" desc="Selecciona multiples variaciones con los checkboxes. Aparecera una barra de acciones en lote con opciones para eliminar en masa o crear una sesion de revision con las seleccionadas." />
          <Step n={5} title="Exporta a PDF" desc="Presiona Exportar PDF para generar un documento imprimible con todas las variaciones visibles segun los filtros activos. Util para presentaciones al cliente." />
        </div>

        <Tip>
          Las variaciones que marcas como aprobadas se inyectan automaticamente como ejemplos few-shot en la proxima generacion de esa marca. Cuantas mas variaciones aprobadas tengas, mas afinado el estilo del output.
        </Tip>
      </Section>

      {/* ── 5. Revisiones ── */}
      <Section id="collab" title="5. Revisiones" badge="Colaboracion" badgeColor="#EC4899" open={open === 'collab'} onToggle={() => toggle('collab')}>
        <SectionHeader
          icon={<IconUsers />}
          title="Revisiones"
          what="Crea sesiones de revision para compartir variaciones con el cliente via un link publico. El cliente aprueba o rechaza con comentarios sin necesitar cuenta en la plataforma."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Crea una sesion de revision" desc="Desde la biblioteca, selecciona las variaciones que quieres enviar al cliente (checkbox), luego presiona Crear sesion de revision. Asignale un titulo y define la cantidad de dias de validez del link." />
          <Step n={2} title="Comparte el link publico" desc="Copia el link generado y enviaselo al cliente por el canal que prefieras (email, WhatsApp, Slack). El cliente puede acceder sin iniciar sesion." />
          <Step n={3} title="El cliente revisa" desc="El cliente ve cada variacion y puede aprobarla o rechazarla. Si rechaza, puede escribir un comentario explicando el motivo. Al terminar, ingresa su nombre para identificar quien reviso." />
          <Step n={4} title="Consulta los resultados" desc="En Revisiones, abre la sesion para ver el resumen: cuantas variaciones fueron aprobadas, cuantas rechazadas y los motivos de rechazo por variacion." />
          <Step n={5} title="Sincronizacion automatica con la biblioteca" desc="Las variaciones aprobadas por el cliente quedan marcadas automaticamente como aprobadas en la biblioteca central." />
        </div>

        <Tip>
          Usa titulos de sesion descriptivos como 'Campana verano — revision cliente Terpel 25 jun' para encontrar facilmente los resultados despues.
        </Tip>
      </Section>

      {/* ── 6. Portal del cliente ── */}
      <Section id="portal" title="6. Portal del cliente (rol CLIENT)" badge="CLIENT" badgeColor="#8B5CF6" open={open === 'portal'} onToggle={() => toggle('portal')}>
        <SectionHeader
          icon={<IconUser />}
          title="Portal del cliente"
          what="Vista dedicada para usuarios con rol CLIENT. Muestra unicamente el contenido de su propia marca con una interfaz limpia y sin opciones de administracion."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Acceso automatico" desc="Los usuarios con rol CLIENT ven directamente su biblioteca al iniciar sesion. No tienen acceso al generador ni a marcas de otros clientes." />
          <Step n={2} title="Filtra tu contenido" desc="Usa los filtros de busqueda por texto, plataforma y estado para encontrar rapidamente las variaciones que necesitas." />
          <Step n={3} title="Copia al portapapeles" desc="Presiona el icono de copia en cualquier variacion para copiar el texto al portapapeles con un clic. Util para pegar directamente en la herramienta de publicacion." />
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#F5F5F7', fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>
          <strong>Vista limpia:</strong> el portal del cliente no muestra el panel de administracion, scores del Critic, flags ni metadatos internos. Solo el contenido listo para usar.
        </div>
      </Section>

      {/* ── 7. Métricas ── */}
      <Section id="analytics" title="7. Métricas" badge="Métricas" badgeColor="#0071E3" open={open === 'analytics'} onToggle={() => toggle('analytics')}>
        <SectionHeader
          icon={<IconBarChart />}
          title="Métricas"
          what="Dashboard de metricas globales de produccion y aprobacion. Identifica que plataformas generan mas friccion y que clientes tienen mejor tasa de aprobacion."
        />

        <SubHead>Metricas disponibles</SubHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Total guardadas', desc: 'Variaciones guardadas en la biblioteca en todos los periodos.' },
            { label: 'Total aprobadas', desc: 'Variaciones marcadas como aprobadas (por admin o cliente).' },
            { label: 'Tasa de aprobacion', desc: 'Porcentaje global de aprobacion sobre el total guardado.' },
            { label: 'Rechazos por plataforma', desc: 'Identifica que canales concentran mas rechazos del cliente.' },
            { label: 'Guardadas por plataforma', desc: 'Distribucion de produccion entre todos los canales.' },
            { label: 'Tabla por cliente', desc: 'Guardadas, aprobadas y tasa de aprobacion individual de cada cliente.' },
          ].map(i => (
            <div key={i.label} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>{i.label}</div>
              <p style={{ margin: 0, fontSize: 12, color: '#6E6E73', lineHeight: 1.4 }}>{i.desc}</p>
            </div>
          ))}
        </div>

        <Tip>
          El grafico de rechazos por plataforma es el mas util para mejorar la calidad: si un canal tiene una tasa de rechazo alta, revisá el perfil de ADN, los ejemplos few-shot o el budget de caracteres configurado para ese canal.
        </Tip>
      </Section>

      {/* ── 8. Scorecard por cliente ── */}
      <Section id="scorecard" title="8. Scorecard por cliente" badge="Nuevo" badgeColor="#F59E0B" open={open === 'scorecard'} onToggle={() => toggle('scorecard')}>
        <SectionHeader
          icon={<IconAward />}
          title="Scorecard por cliente"
          what="Vista de metricas individuales de un cliente especifico, accesible desde el panel de gestion de clientes. Muestra el rendimiento del contenido generado para esa marca."
        />

        <SubHead>Como usarlo</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Abre ClientManager" desc="Ve al panel de gestion de clientes (ClientManager) desde la barra lateral o el menu de administracion." />
          <Step n={2} title="Abre la pestana Metricas" desc="Selecciona el cliente que quieres analizar y abre la pestana Metricas dentro de su ficha." />
          <Step n={3} title="Consulta el scorecard" desc="Veras el total de variaciones guardadas, aprobadas, tasa de aprobacion y rechazadas para ese cliente especifico. Tambien incluye un mini grafico de barras con las plataformas mas utilizadas para esa marca." />
        </div>

        <Tip>
          Usa el scorecard antes de una reunion de seguimiento con el cliente para tener numeros concretos sobre la produccion de contenido y el historial de aprobaciones.
        </Tip>
      </Section>

      {/* ── 9. Configuracion ── */}
      <Section id="config" title="9. Configuración" badge="Settings" badgeColor="#6E6E73" open={open === 'config'} onToggle={() => toggle('config')}>
        <SectionHeader
          icon={<IconSettings />}
          title="Configuracion"
          what="Personaliza voces de marca, objetivos y comportamientos por defecto del generador. Los cambios se guardan automaticamente."
        />

        <SubHead>Opciones disponibles</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Voces de marca personalizadas" desc="Agrega, edita o elimina voces de marca que apareceran como opciones en el selector del generador. Util para estandarizar los arquetipos que usa tu equipo." />
          <Step n={2} title="Objetivos personalizados" desc="Define objetivos recurrentes de tus campanas para que aparezcan como opciones rapidas en el formulario de generacion." />
          <Step n={3} title="Canales bloqueados por defecto" desc="Elige que canales arrancan bloqueados cada vez que haces una nueva generacion. Util si hay canales que siempre quieres controlar manualmente antes de regenerar." />
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#F5F5F7', fontSize: 13, color: '#3D3D3F', lineHeight: 1.5 }}>
          <strong>Guardado automatico:</strong> no hay un boton de guardar. Cada cambio en Configuracion se persiste automaticamente al salir del campo.
        </div>
      </Section>

      {/* ── 10. Notificaciones por email ── */}
      <Section id="email" title="10. Notificaciones por email" badge="Opcional" badgeColor="#10B981" open={open === 'email'} onToggle={() => toggle('email')}>
        <SectionHeader
          icon={<IconMail />}
          title="Notificaciones por email"
          what="Recibe un email automatico cuando un cliente completa una sesion de revision. Requiere configuracion de variables de entorno en el servidor."
        />

        <SubHead>Requisitos</SubHead>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F5F5F7', fontSize: 13, color: '#3D3D3F', lineHeight: 1.5, marginBottom: 12 }}>
          El administrador del servidor debe configurar dos variables de entorno:
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div><code style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', background: '#E5E5EA', padding: '2px 6px', borderRadius: 4 }}>RESEND_API_KEY</code> — API key de Resend (resend.com)</div>
            <div><code style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', background: '#E5E5EA', padding: '2px 6px', borderRadius: 4 }}>RESEND_TO_EMAIL</code> — Direccion de email donde se reciben las notificaciones</div>
          </div>
        </div>

        <SubHead>Que incluye el email</SubHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Step n={1} title="Resumen de la sesion" desc="Al completar una sesion de revision, se envia automaticamente un email con el titulo de la sesion, el nombre del revisor, la cantidad de variaciones aprobadas y rechazadas." />
          <Step n={2} title="Motivos de rechazo" desc="El email incluye los comentarios de rechazo para que el equipo de contenido pueda actuar rapidamente sin tener que entrar a la plataforma a consultar los resultados." />
        </div>

        <Tip>
          Si no configuras estas variables, la plataforma funciona normalmente pero sin enviar emails. Podes consultar los resultados de las sesiones de revision directamente en el Collaboration Hub.
        </Tip>
      </Section>

      <div style={{ textAlign: 'center', padding: '32px 0 16px', color: '#86868B', fontSize: 12 }}>
        My Voice · Powered by LoBueno · {new Date().getFullYear()}
      </div>
    </div>
  );
}
