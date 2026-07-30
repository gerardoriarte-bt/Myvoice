import { CopyParameters, CopyVariation, CampaignSpine, CoherenceReport, UsageReport, Platform } from '../types';
import {
  LOBUENO_SPINE,
  LOBUENO_CHANNEL_COPY,
  LOBUENO_COHERENCE,
} from '../shared/lobuenoBrand';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let idCounter = 0;
const newId = () => `mock-${Date.now()}-${++idCounter}`;

const validateChars = (text: string, max?: number, unit: 'char' | 'word' = 'char'): { charCount: number; budgetOk: boolean } => {
  const count = unit === 'word' ? text.trim().split(/\s+/).filter(Boolean).length : text.length;
  return { charCount: count, budgetOk: max === undefined || count <= max };
};

const make = (
  platform: string,
  slot: string | undefined,
  variationIndex: number,
  type: string,
  content: string,
  budget?: number,
  unit: 'char' | 'word' = 'char',
  opts: Partial<CopyVariation> = {}
): CopyVariation => {
  const v = validateChars(content, budget, unit);
  return {
    id: newId(),
    platform: platform as Platform,
    slot,
    variationIndex,
    type,
    content,
    charCount: v.charCount,
    budget,
    budgetUnit: unit,
    budgetOk: v.budgetOk,
    score: 8 + Math.floor(Math.random() * 3), // 8-10
    scoreRationale: opts.scoreRationale || 'Voz coherente, ritmo respeta el largo medio del fingerprint.',
    ...opts,
  };
};

// ------ AVENA+ BLACK FRIDAY FIXTURE ------
const AVENA_SPINE: CampaignSpine = {
  concept: 'Una vez al año bajamos el precio. Hoy.',
  keyMessage: 'La única oferta del año en Avena+. 30% off durante 1 semana, después vuelve al precio justo.',
  tone: 'Confesional, ritmo entrecortado, repetición intencional, primera persona del plural',
  heroCTA: 'Aprovechá hasta el viernes',
  angles: [
    { name: 'Confesión Honesta',          premise: 'Otras marcas inflan precios para fingir descuentos. Acá no.', register: 'Frase corta declarativa, sin adornos' },
    { name: 'Antes/Después Implícito',    premise: 'Antes pagabas más por menos avena. Hoy lo arreglamos.',       register: 'Tono didáctico, foco en lectura de etiqueta' },
    { name: 'Costo de No Actuar',         premise: 'Si te lo perdés, no se repite hasta el próximo año.',          register: 'Urgencia genuina, no amenazante' },
  ],
};

const buildAvenaChannels = (): Record<string, CopyVariation[]> => ({
  'Email': [
    make('Email', 'subject', 1, 'Confesión Honesta',       'Una vez al año bajamos el precio. Hoy.', 50, 'char',
      { score: 10, scoreRationale: 'Concepto literal en el subject. Inconfundible Avena+.' }),
    make('Email', 'subject', 2, 'Antes/Después',           'La única oferta del año (no la repetimos)', 50, 'char',
      { score: 9, scoreRationale: 'Paréntesis confesional, tic característico de la marca.' }),
    make('Email', 'subject', 3, 'Urgencia',                '30% off — termina el viernes', 50, 'char',
      { score: 6, writerScore: 9, scoreRationale: 'Funcional pero genérico — podría ser cualquier marca con descuento.', editorFlags: ['generic'] }),
    make('Email', 'preheader', 1, 'Confesión Honesta',     'Pack 6×Avena+ Original. Sin repeticiones en diciembre.', 90),
    make('Email', 'preheader', 2, 'Antes/Después',         'Por una semana hacemos lo único que nunca hacemos.', 90),
    make('Email', 'preheader', 3, 'Urgencia',              'Lo único que nunca está rebajado. Hoy sí.', 90),
    make('Email', 'header', 1, 'Standard',                 '30% off, una vez al año. Hoy.', 80),
    make('Email', 'header', 2, 'Standard',                 'Hicimos algo que casi nunca hacemos.', 80),
    make('Email', 'header', 3, 'Standard',                 'Una semana. 30%. Sin segundas oportunidades.', 80),
    make('Email', 'body', 1, 'Confesión Honesta',
      'No inventamos descuentos para subirlos antes. Por eso el resto del año el precio es justo. Esta semana es la única excepción del año: 30% off en el pack 6×Avena+ Original. Si te lo perdés, no volvemos en diciembre.', 600),
    make('Email', 'body', 2, 'Antes/Después',
      'Cada vez que lees una etiqueta, hacés un cálculo. Avena, agua, sal. Nada raro, nada que no entiendas. Esta semana ese mismo pack baja 30%. Es la primera y última vez del año. Aprovechalo o esperá hasta el próximo.', 600),
    make('Email', 'body', 3, 'Urgencia',
      'El viernes a la medianoche el precio vuelve a ser el de siempre. No hay extensión, no hay segunda chance. 30% off real durante 4 días. Si lo dejás pasar, lo dejás pasar.', 600),
    make('Email', 'cta', 1, 'Standard',                    'Aprovechá hasta el viernes', 25),
    make('Email', 'cta', 2, 'Standard',                    'Llevátelo ahora', 25),
    make('Email', 'cta', 3, 'Standard',                    'Antes del viernes', 25),
  ],

  'Push Notification': [
    make('Push Notification', 'title', 1, 'Confesión Honesta',  '30% off. Hoy.', 25),
    make('Push Notification', 'title', 2, 'Antes/Después',      'La oferta del año', 25),
    make('Push Notification', 'title', 3, 'Urgencia',           'Una semana, después no', 25),
    make('Push Notification', 'title', 4, 'Standard',           'Avena+ con 30%', 25),
    make('Push Notification', 'title', 5, 'Standard',           'Ahora o el próximo año', 25),
    make('Push Notification', 'text', 1, 'Standard',            'Pack 6×Avena+ con 30% off', 40),
    make('Push Notification', 'text', 2, 'Standard',            'No repetimos en diciembre', 40, 'char',
      { autofixed: true, score: 9, scoreRationale: 'Auto-corregida (excedía budget). Concepto preservado.' }),
    make('Push Notification', 'text', 3, 'Standard',            'Hoy bajamos. Mañana sigue igual.', 40),
    make('Push Notification', 'text', 4, 'Standard',            'Termina el viernes. Sin promesas.', 40),
    make('Push Notification', 'text', 5, 'Standard',            'Aprovechá antes del cierre', 40),
  ],

  'Google Ads': [
    make('Google Ads', 'shortTitle', 1, 'Standard',             '30% off Avena+', 30),
    make('Google Ads', 'shortTitle', 2, 'Standard',             'Una vez al año', 30),
    make('Google Ads', 'shortTitle', 3, 'Standard',             'Pack 6 con descuento', 30),
    make('Google Ads', 'shortTitle', 4, 'Standard',             'Sin azúcar añadida', 30),
    make('Google Ads', 'shortTitle', 5, 'Standard',             'Avena+ Black Friday', 30),
    make('Google Ads', 'shortTitle', 6, 'Standard',             'Hoy bajamos el precio', 30),
    make('Google Ads', 'shortTitle', 7, 'Standard',             'Solo esta semana', 30),
    make('Google Ads', 'shortTitle', 8, 'Standard',             'Lo único rebajado', 30),
    make('Google Ads', 'shortTitle', 9, 'Standard',             'Aprovechá hasta viernes', 30),
    make('Google Ads', 'shortTitle', 10, 'Standard',            '30% off, sin trucos', 30),
    make('Google Ads', 'longTitle', 1, 'Confesión Honesta',     'Avena+ con 30% off — la única oferta del año, sin descuentos inflados', 90),
    make('Google Ads', 'longTitle', 2, 'Urgencia',              'Pack 6×Avena+ Original al 30%. Si te lo perdés, no volvemos en diciembre.', 90),
    make('Google Ads', 'longTitle', 3, 'Confesión Honesta',     'Una vez al año bajamos el precio. Hoy. Pack de 6 con 30%.', 90),
    make('Google Ads', 'longTitle', 4, 'Antes/Después',         'Avena casera, sin azúcar añadida. Esta semana con 30% off real.', 90),
    make('Google Ads', 'description', 1, 'Standard',            'Sin azúcar añadida, sin saborizantes raros. Pack 6 con 30% off hasta el viernes.', 90),
    make('Google Ads', 'description', 2, 'Standard',            'Hicimos algo que no hacemos: bajar el precio. Solo esta semana.', 90),
    make('Google Ads', 'description', 3, 'Standard',            'Pack 6×Avena+ con 30% off. La única oferta del año.', 90),
    make('Google Ads', 'description', 4, 'Standard',            '30% off en Avena+ Original. Una vez al año. Termina el viernes.', 90),
  ],

  'TikTok': [
    make('TikTok', 'verbalHook', 1, 'Confesión Honesta',        'Sí, bajamos el precio. Una vez al año. Hoy.', 80),
    make('TikTok', 'verbalHook', 2, 'Antes/Después',            'Esto va a sonar raro: no inventamos descuentos.', 80),
    make('TikTok', 'verbalHook', 3, 'Urgencia',                 'Te voy a mostrar lo único que rebajamos en todo el año.', 80),
    make('TikTok', 'narrative', 1, 'Standard',
      '0-2s: persona leyendo etiqueta de competidor (cara confundida). 2-5s: cambia a Avena+ (etiqueta clara, lectura rápida). 5-12s: "¿Sabías que la oferta de Avena+ pasa una vez al año?" 12-18s: 30% off Black Friday en pantalla. 18-22s: "Si te lo perdés, no volvemos en diciembre."'),
    make('TikTok', 'caption', 1, 'Confesión Honesta',           'Una vez al año bajamos el precio. Hoy. Sin segundas oportunidades.', 100),
    make('TikTok', 'caption', 2, 'Antes/Después',               'Esta es la única semana del año donde Avena+ está con 30% off.', 100, 'char',
      { score: 7, writerScore: 9, scoreRationale: 'No incluye el concepto literal — agregar "Una vez al año" ataría mejor.', editorFlags: ['concept-drift'] }),
    make('TikTok', 'caption', 3, 'Urgencia',                    'Pack 6×Avena+ con 30%. Termina viernes. No repetimos en diciembre.', 100),
    make('TikTok', 'cta', 1, 'Standard',                        'Aprovechá antes del viernes', 60),
  ],

  'Instagram Post': [
    make('Instagram Post', 'hook', 1, 'Confesión Honesta',      'Una vez al año bajamos el precio. Hoy.', 80),
    make('Instagram Post', 'hook', 2, 'Antes/Después',          'No inventamos descuentos. Por eso este es real.', 80),
    make('Instagram Post', 'hook', 3, 'Urgencia',               'Lo único que rebajamos en todo el año, hasta viernes.', 80),
    make('Instagram Post', 'body', 1, 'Confesión Honesta',
      'Otras marcas inflan precios en octubre para fingir descuentos en noviembre. Nosotros no. Por eso el resto del año el precio es justo y esta semana es la única excepción real: 30% off en pack 6×Avena+ Original. Una vez al año. Hoy.', 1500),
    make('Instagram Post', 'body', 2, 'Antes/Después',
      'Cada vez que leés una etiqueta hacés un cálculo: ¿esto vale lo que pago? Avena+ es agua, avena, sal. Nada raro. Esta semana, además, el precio baja 30%. La única vez del año.', 1500),
    make('Instagram Post', 'body', 3, 'Urgencia',
      'Termina el viernes a las 23:59. No hay extensión. No hay "última oportunidad" la semana que viene. Es la única vez del año. Después vuelve al precio justo.', 1500),
    make('Instagram Post', 'hashtags', 1, 'Standard',           '#Avena #Sin AzucarAñadida #BlackFriday #LeerLaEtiqueta'),
    make('Instagram Post', 'visualBrief', 1, 'Standard',
      'Bodegón cenital con el pack 6×Avena+ sobre fondo terracota mate. Una sola etiqueta visible al frente, las otras desenfocadas. Texto en mayúsculas pequeñas: "30% off · una semana".'),
  ],

  'WhatsApp': [
    make('WhatsApp', 'message', 1, 'Confesión Honesta',
      'Hola 👋 hoy hacemos algo que casi nunca hacemos: *bajamos el precio*. Pack 6×Avena+ con 30% off hasta el viernes. Después vuelve a estar como siempre.', 500),
    make('WhatsApp', 'message', 2, 'Antes/Después',
      'No te vamos a inflar precios para fingir descuentos. Lo único rebajado del año es esto: pack 6×Avena+ con 30% off. Termina el viernes 🌾', 500),
    make('WhatsApp', 'message', 3, 'Urgencia',
      'Última semana del año con Avena+ rebajado. *30% off* en el pack 6×Original. Si te lo perdés, no volvemos en diciembre.', 500),
    make('WhatsApp', 'cta', 1, 'Standard',                      'Comprar antes del viernes', 40),
    make('WhatsApp', 'cta', 2, 'Standard',                      'Llevarme el pack', 40),
    make('WhatsApp', 'cta', 3, 'Standard',                      'Ver oferta', 40),
  ],

  'Cuña de Radio': [
    make('Cuña de Radio', 'script', 1, 'Confesión Honesta',
      'Una vez al año, sólo una, bajamos el precio. Hoy. Pack seis de Avena+ Original con treinta por ciento off. Sin azúcar añadida, sin saborizantes raros. La misma avena casera de siempre, una semana al precio que nunca tendrá. Termina el viernes. Si te lo perdés, no se repite hasta el próximo año. Avena+: lo que tomás importa.',
      60, 'word'),
    make('Cuña de Radio', 'script', 2, 'Antes/Después',
      'Otras marcas inflan precios en octubre para descontarlos en noviembre. Avena+ no. El resto del año el precio es el justo. Esta semana, una vez al año, baja treinta por ciento. Pack de seis, Original, sin azúcar añadida. Termina el viernes. Después vuelve a su precio real. Avena+: lo que tomás importa.',
      60, 'word'),
    make('Cuña de Radio', 'script', 3, 'Urgencia',
      'Esta semana, sólo esta semana, el pack de seis Avena+ Original tiene treinta por ciento off. Es la única oferta del año, no la repetimos en diciembre, no hay extensión. Termina el viernes a las once cincuenta y nueve. Después vuelve al precio justo. Avena+: lo que tomás importa.',
      60, 'word'),
    make('Cuña de Radio', 'production', 1, 'Standard',
      'Locutor masculino, voz cálida, ritmo conversacional. Música de fondo: instrumental acústica suave, sin percusión. Sin efectos sonoros.'),
  ],
});

// ------ NEXUS FIXTURE (compact version) ------
const NEXUS_SPINE: CampaignSpine = {
  concept: 'Tu plata, sin descuentos misteriosos.',
  keyMessage: 'Cuenta sin comisiones, apertura en 4 minutos. Cada peso que ves es cada peso que tenés.',
  tone: 'Honesto, directo, segundo persona del singular, sin tecnicismos',
  heroCTA: 'Abrí tu cuenta',
  angles: [
    { name: 'Cero Letra Chica', premise: 'Mostrar lo que el banco tradicional no muestra.', register: 'Tono explicativo, lista comparativa implícita' },
    { name: 'Manejo de Objeción', premise: 'Si parece magia, te explicamos cómo funciona.', register: 'Voz de amigo, no de marketing' },
    { name: 'Velocidad Real', premise: '4 minutos no es eslogan, es dato.', register: 'Foco en hechos, sin adjetivos' },
  ],
};

const buildNexusChannels = (): Record<string, CopyVariation[]> => ({
  'Email': [
    make('Email', 'subject', 1, 'Cero Letra Chica', 'Tu plata, sin descuentos misteriosos.', 50),
    make('Email', 'subject', 2, 'Manejo de Objeción', '¿Cuenta sin costo? Te explicamos cómo.', 50),
    make('Email', 'subject', 3, 'Velocidad Real', 'Abrí tu cuenta en 4 minutos. En serio.', 50),
    make('Email', 'preheader', 1, 'Standard', 'Sin comisiones, sin ABM, sin sorpresas.', 90),
    make('Email', 'preheader', 2, 'Standard', 'Cada peso que ves es cada peso que tenés.', 90),
    make('Email', 'preheader', 3, 'Standard', 'Apertura 100% online. 4 minutos reales.', 90),
    make('Email', 'header', 1, 'Standard', 'Cuenta Nexus Free — sin letra chica', 80),
    make('Email', 'header', 2, 'Standard', 'Lo que ves es lo que tenés', 80),
    make('Email', 'header', 3, 'Standard', '4 minutos, no es marketing', 80),
    make('Email', 'body', 1, 'Cero Letra Chica',
      'Cuenta sin comisiones de mantenimiento. Sin costos por ABM. Sin "si superas X transferencias te cobramos". Lo único que pagás son las cosas que el banco no puede absorber, y te las mostramos antes de que pasen. Sin letra chica significa eso, literalmente.', 600),
    make('Email', 'body', 2, 'Manejo de Objeción',
      'Te entendemos si lo dudás: "¿gratis? algo va a tener". Te explicamos: ganamos dinero cuando vos invertís o usás tu tarjeta, igual que cualquier banco. La diferencia es que no te lo escondemos en ABM ni en comisiones por mover tu plata.', 600),
    make('Email', 'body', 3, 'Velocidad Real',
      '4 minutos no es metáfora. DNI, selfie, datos básicos, listo. Sin sucursales, sin papeles, sin llamadas de "verificación" que duran una hora. La cuenta queda activa al instante.', 600),
    make('Email', 'cta', 1, 'Standard', 'Abrí tu cuenta', 25),
    make('Email', 'cta', 2, 'Standard', 'Empezar ahora', 25),
    make('Email', 'cta', 3, 'Standard', 'Probarlo gratis', 25),
  ],
  'Push Notification': [
    make('Push Notification', 'title', 1, 'Standard', 'Tu plata, sin trucos', 25),
    make('Push Notification', 'title', 2, 'Standard', 'Sin comisiones', 25),
    make('Push Notification', 'title', 3, 'Standard', '4 minutos. Listo.', 25),
    make('Push Notification', 'title', 4, 'Standard', 'Cero letra chica', 25),
    make('Push Notification', 'title', 5, 'Standard', 'Cuenta Nexus Free', 25),
    make('Push Notification', 'text', 1, 'Standard', 'Apertura online en 4 minutos', 40),
    make('Push Notification', 'text', 2, 'Standard', 'Sin ABM, sin sorpresas', 40),
    make('Push Notification', 'text', 3, 'Standard', 'Lo que ves es lo que tenés', 40),
    make('Push Notification', 'text', 4, 'Standard', 'Sin papeles, sin sucursales', 40),
    make('Push Notification', 'text', 5, 'Standard', 'Activá tu cuenta hoy', 40),
  ],
  'Instagram Post': [
    make('Instagram Post', 'hook', 1, 'Cero Letra Chica', 'Tu plata, sin descuentos misteriosos.', 80),
    make('Instagram Post', 'hook', 2, 'Manejo de Objeción', 'Sí, sin comisiones. Te contamos cómo.', 80),
    make('Instagram Post', 'hook', 3, 'Velocidad Real', '4 minutos para abrir cuenta. Cronometralo.', 80),
    make('Instagram Post', 'body', 1, 'Cero Letra Chica',
      'Sin costo de mantenimiento. Sin ABM. Sin comisiones por mover tu plata. Cada peso que ves en pantalla es cada peso que tenés. Apertura 100% online, en 4 minutos. Sin sorpresas en el extracto.', 1500),
    make('Instagram Post', 'body', 2, 'Manejo de Objeción',
      'Si parece magia, te explicamos: ganamos cuando invertís o usás tu tarjeta, igual que cualquier banco. La diferencia es que no te cobramos por respirar.', 1500),
    make('Instagram Post', 'body', 3, 'Velocidad Real',
      'Sin sucursales, sin filas, sin papeles. DNI + selfie + datos. 4 minutos cronometrados, no 4 "minutos" del banco viejo.', 1500),
    make('Instagram Post', 'hashtags', 1, 'Standard', '#Banco #SinComisiones #Fintech #4Minutos'),
    make('Instagram Post', 'visualBrief', 1, 'Standard',
      'Mockup de la app Nexus en pantalla limpia. Cronómetro arriba: "00:04:00". Cuenta abierta visible. Tipografía sans-serif clean.'),
  ],
  'Rich Media': [
    make('Rich Media', 'title', 1, 'Standard', 'Sin letra chica', 25),
    make('Rich Media', 'title', 2, 'Standard', 'Cero comisiones', 25),
    make('Rich Media', 'title', 3, 'Standard', '4 minutos online', 25),
    make('Rich Media', 'title', 4, 'Standard', 'Tu plata, tu plata', 25),
    make('Rich Media', 'title', 5, 'Standard', 'Cuenta Nexus Free', 25),
    make('Rich Media', 'text', 1, 'Standard', 'Apertura online en 4 minutos', 40),
    make('Rich Media', 'text', 2, 'Standard', 'Sin ABM, sin papeles, sin trucos', 40),
    make('Rich Media', 'text', 3, 'Standard', 'Lo que ves es lo que tenés', 40),
    make('Rich Media', 'text', 4, 'Standard', 'Empezá hoy mismo', 40),
    make('Rich Media', 'text', 5, 'Standard', 'Tu banco, transparente', 40),
    make('Rich Media', 'cta', 1, 'Standard', 'Abrir cuenta', 18),
    make('Rich Media', 'cta', 2, 'Standard', 'Empezar', 18),
    make('Rich Media', 'cta', 3, 'Standard', 'Probarlo', 18),
    make('Rich Media', 'animationBrief', 1, 'Standard',
      'Cronómetro digital cuenta de 00:00 a 04:00 mientras se completan campos del onboarding. Final: cuenta activa con $0.00 destacado en verde "tus comisiones de hoy".'),
  ],
});

// Synthetic placeholder for channels not in the fixture
const synthesizePlaceholder = (platform: string, brand: string, concept: string): CopyVariation[] => {
  return [
    make(platform, 'placeholder', 1, 'Confesión Honesta',
      `[${platform}] ${concept} — pieza generada para ${brand}.`),
    make(platform, 'placeholder', 2, 'Antes/Después',
      `[${platform}] Otra ejecución de ${brand} sobre el mismo concepto.`),
    make(platform, 'placeholder', 3, 'Urgencia',
      `[${platform}] Tercera variación con ángulo de urgencia.`),
  ];
};

const AVENA_COHERENCE: CoherenceReport = {
  coherenceScore: 9,
  summary: 'El concepto literal aparece en Email, IG, TikTok y WhatsApp. Tono confesional consistente; CTAs alineados a urgencia genuina.',
  issues: [
    {
      channels: ['Cuña de Radio', 'TikTok'],
      problem: 'La radio cierra con tagline ("lo que tomás importa") que TikTok no recoge. Considerar una variación de TikTok con esa firma.',
      severity: 'low',
    },
  ],
  flags: [],
};

// ------ LOBUENO FIXTURE (definido en shared/lobuenoBrand.ts) ------
// El copy vive en shared/ para que la demo offline y el seed de Postgres
// (server/prisma/seedLobueno.ts) partan de la misma definición de marca.
const buildLobuenoChannels = (): Record<string, CopyVariation[]> => {
  const out: Record<string, CopyVariation[]> = {};
  for (const [platform, items] of Object.entries(LOBUENO_CHANNEL_COPY)) {
    out[platform] = items.map(it => {
      // Omitir claves undefined: make() hace `...opts` al final y un undefined
      // explícito pisaría los valores por defecto.
      const opts: Partial<CopyVariation> = {};
      if (it.score !== undefined) opts.score = it.score;
      if (it.writerScore !== undefined) opts.writerScore = it.writerScore;
      if (it.scoreRationale !== undefined) opts.scoreRationale = it.scoreRationale;
      if (it.editorFlags !== undefined) opts.editorFlags = it.editorFlags;
      if (it.autofixed !== undefined) opts.autofixed = it.autofixed;
      return make(platform, it.slot, it.variationIndex, it.type, it.content, it.budget, it.unit || 'char', opts);
    });
  }
  return out;
};

const NEXUS_COHERENCE: CoherenceReport = {
  coherenceScore: 8,
  summary: 'Coherente: voz directa, segunda persona, sin tecnicismos en todos los canales. Push se beneficiaría de un poco más de calidez.',
  issues: [],
  flags: [],
};

// ------ MOCK USAGE (simulates a cache-warm second run) ------
const mockUsage = (channelCount: number): UsageReport => {
  const channelTokens = channelCount * 1850;
  const promptTokens = 1100 /* director */ + channelTokens + (channelCount * 1200) /* critics */ + 2400 /* supercritic */;
  const cachedTokens = Math.round(channelTokens * 0.71); // 71% cache hit rate
  const completionTokens = channelCount * 600 + 350 + (channelCount * 220) + 180;
  const inputCost  = ((promptTokens - cachedTokens) / 1_000_000) * 2.50 + (cachedTokens / 1_000_000) * 1.25;
  const cheapInputCost = (promptTokens * 0.7 / 1_000_000) * 0.075; // mini calls
  const outputCost = (completionTokens / 1_000_000) * 10;
  const cheapOutputCost = (completionTokens * 0.4 / 1_000_000) * 0.60;
  const costUsd = Number((inputCost + cheapInputCost + outputCost + cheapOutputCost).toFixed(4));

  const byStage: Record<string, { tokens: number; costUsd: number }> = {
    'director': { tokens: 1100 + 350, costUsd: 0.0008 },
    'supercritic': { tokens: 2400 + 180, costUsd: 0.0012 },
  };
  return {
    promptTokens,
    cachedTokens,
    completionTokens,
    costUsd,
    byStage,
  };
};

// ------ STREAMING SIMULATOR ------
export const runMockGeneration = async (
  params: CopyParameters,
  onEvent: (event: any) => void
): Promise<void> => {
  const name = (params.clientName || '').toLowerCase();
  const fixture =
    name.includes('lobueno') || name.includes('lo bueno')
      ? {
          spine: LOBUENO_SPINE as CampaignSpine,
          channels: buildLobuenoChannels,
          coherence: LOBUENO_COHERENCE as CoherenceReport,
          defaultBrand: 'LoBueno',
        }
      : name.includes('nexus')
      ? { spine: NEXUS_SPINE, channels: buildNexusChannels, coherence: NEXUS_COHERENCE, defaultBrand: 'Nexus Bank' }
      : { spine: AVENA_SPINE, channels: buildAvenaChannels, coherence: AVENA_COHERENCE, defaultBrand: 'Avena+' };

  const spine = fixture.spine;
  const allChannels = fixture.channels();
  const coherence = fixture.coherence;
  const brand = params.clientName || fixture.defaultBrand;

  // Director takes ~800ms
  await sleep(800);
  onEvent({ type: 'spine', payload: spine });

  // Channels arrive staggered (parallel-ish, 1.2-2.5s each)
  const platforms = (params.platforms || []) as unknown as string[];
  await Promise.all(platforms.map(async (platform, i) => {
    await sleep(900 + Math.random() * 1800 + i * 150);
    const variations = allChannels[platform] || synthesizePlaceholder(platform, brand, spine.concept);
    onEvent({ type: 'channel', payload: { platform, variations } });
  }));

  // Super-critic ~700ms after last channel
  if (platforms.length >= 2) {
    await sleep(700);
    onEvent({ type: 'coherence', payload: coherence });
  }

  await sleep(150);
  onEvent({ type: 'usage', payload: mockUsage(platforms.length) });
  onEvent({ type: 'done' });
};
