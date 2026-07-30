/**
 * LoBueno — cliente mockup completo.
 *
 * Definición canónica de la marca, compartida por:
 *   - services/mockGeneration.ts   (demo offline, sin backend ni API key)
 *   - server/prisma/seedLobueno.ts (seed de Postgres, generación real)
 *
 * Mantener este archivo libre de imports: lo consumen dos proyectos con
 * tsconfig distintos. Los tipos de abajo son locales a propósito.
 *
 * Registro: español colombiano con "usted" (ver server/src/services/localeRules.ts).
 * LoBueno NO pide voseo, así que checkVoseo queda en false y "tú" está prohibido.
 */

// ---------------------------------------------------------------- tipos locales

export interface LobuenoFingerprint {
  sampleSize: number;
  totalChars: number;
  avgSentenceLength: number;
  sentenceLengthRange: [number, number];
  punctuationDensity: { exclamation: number; question: number; dash: number; ellipsis: number };
  emojiDensity: number;
  uppercaseShouting: number;
  archetype: string;
  archetypeRationale: string;
  personaGramatical: string;
  toneSummary: string;
  linguisticTics: string[];
  favoriteWords: string[];
  avoidWords: string[];
  generatedAt: string;
}

export interface LobuenoDnaProfile {
  key: string;
  name: string;
  voice: string;
  goal: string;
  product: string;
  targetAudience: string;
  theme: string;
  keywords: string;
  brandVoiceGuidelines: string;
  valueProposition: string;
  primaryCTA: string;
  prohibitions: string;
  campaignConcept: string;
}

export interface LobuenoCopyItem {
  slot: string;
  variationIndex: number;
  type: string;
  content: string;
  /** hard limit del slot, según server/src/channels/specs/* */
  budget?: number;
  unit?: 'char' | 'word';
  score?: number;
  writerScore?: number;
  scoreRationale?: string;
  editorFlags?: string[];
  autofixed?: boolean;
}

// ---------------------------------------------------------------- la marca

export const LOBUENO_FINGERPRINT: LobuenoFingerprint = {
  sampleSize: 14,
  totalChars: 5240,
  avgSentenceLength: 8.4,
  sentenceLengthRange: [3, 17],
  punctuationDensity: { exclamation: 0.1, question: 1.4, dash: 2.8, ellipsis: 0.2 },
  emojiDensity: 0.0,
  uppercaseShouting: 0.0,
  archetype: 'El Sabio',
  archetypeRationale:
    'No promete resultados, los demuestra. Cada afirmación viene con una cifra o una prueba verificable.',
  personaGramatical: '2da formal ("usted") para el lector; 1ra plural ("nosotros") para la agencia',
  toneSummary:
    'Sobrio y directo. Afirma, no adorna. Usa el contraste como recurso central y cierra en seco.',
  linguisticTics: [
    'Abre con una afirmación que parece obvia y la desarma en la frase siguiente',
    'Pares de contraste con estructura paralela: "X lo hace cualquiera. Y, nadie."',
    'Remate de una sola frase corta, sin conector',
    'Cifra concreta en lugar de adjetivo ("40 piezas", no "muchas piezas")',
  ],
  favoriteWords: ['voz', 'suena', 'propio', 'medible', 'a escala', 'coherente', 'ADN', 'primero'],
  avoidWords: [
    'revolucionario',
    'disruptivo',
    'potenciar',
    'sinergia',
    'solución integral',
    'innovador',
    'líder del mercado',
  ],
  generatedAt: '2026-06-18T14:20:00.000Z',
};

export const LOBUENO_BRAND = {
  name: 'LoBueno',
  industry: 'Agencia creativa y de contenido',
  logoUrl: '',
  voice:
    'Sobria, directa y demostrativa. Habla de igual a igual con gente de marketing que ya escuchó todas las promesas. Usa "usted" — en Colombia es cercano, no distante.',
  valueProposition:
    'LoBueno no produce más copy: produce copy que sigue sonando a su marca cuando se multiplica por 14 canales.',
  brandVoiceGuidelines: [
    'Toda afirmación de capacidad va acompañada de una cifra o una prueba concreta. Nunca adjetivos solos.',
    'Usar el contraste como estructura: primero la creencia común, después el desarme.',
    'Prohibido el vocabulario de agencia genérica. Si la frase podría estar en el sitio de cualquier competidor, se reescribe.',
    'Nunca hablar de "la IA" como protagonista. El protagonista es la voz de la marca del cliente.',
    'Cerrar en seco. Sin conectores de relleno ni resúmenes de lo ya dicho.',
    'Registro colombiano con "usted". Prohibido "tú" y prohibido el voseo rioplatense.',
  ].join(' '),
  brandKeywords: 'ADN de marca, voz, copy a escala, coherencia, tono, canales, fingerprint',
  brandProhibitions:
    'revolucionario, disruptivo, potenciar, sinergia, solución integral, líder del mercado, innovador, de última generación',
  brandFingerprint: LOBUENO_FINGERPRINT,
  quotaLimit: 500,
};

// ---------------------------------------------------------------- briefs (ADN)

export const LOBUENO_DNA_PROFILES: LobuenoDnaProfile[] = [
  {
    key: 'my-voice-lanzamiento',
    name: 'Lanzamiento My Voice — Conversión',
    voice: 'Sobria y demostrativa',
    goal: 'Conversión — agendar demos con directores de marca',
    product: 'My Voice, el motor de copy con ADN de marca de LoBueno',
    targetAudience:
      'Directores de marca y líderes de contenido en compañías con 5+ canales activos, 30-50 años, Bogotá y Medellín. Ya probaron herramientas de IA genéricas y quedaron insatisfechos con la homogeneidad del resultado.',
    theme:
      'Lanzamiento comercial de My Voice. El diferencial no es velocidad de escritura — es que 40 piezas en 14 canales sigan sonando a la misma marca.',
    keywords: 'ADN de marca, voz propia, copy a escala, coherencia entre canales, fingerprint de voz',
    brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
    valueProposition: LOBUENO_BRAND.valueProposition,
    primaryCTA: 'Pida una demo con su propia marca',
    prohibitions: LOBUENO_BRAND.brandProhibitions,
    campaignConcept: 'Rápido escribe cualquiera. Como usted, nadie.',
  },
  {
    key: 'costo-copy-generico',
    name: 'Autoridad de marca — El costo del copy genérico',
    voice: 'Analítica, con datos propios',
    goal: 'Awareness — posicionar a LoBueno como autoridad en voz de marca',
    product: 'Estudio propio de LoBueno sobre homogeneidad del copy generado con IA',
    targetAudience:
      'Comunidad de marketing en Colombia: CMOs, planners, creativos senior. Consumen contenido en LinkedIn y newsletters del sector.',
    theme:
      'Publicación de un estudio interno: 400 piezas generadas con herramientas genéricas, medidas contra el fingerprint de voz de cada marca. Resultado: 71% eran intercambiables entre marcas del mismo sector.',
    keywords: 'estudio, homogeneidad, voz de marca, medición, fingerprint, benchmark',
    brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
    valueProposition:
      'LoBueno mide lo que la industria trata como intangible: cuánto se parece su marca a su competencia cuando ambas escriben.',
    primaryCTA: 'Descargue el estudio',
    prohibitions: LOBUENO_BRAND.brandProhibitions,
    campaignConcept: 'El 71% de su copy podría ser de su competencia.',
  },
  {
    key: 'talento-2026',
    name: 'Reclutamiento creativo — Talento 2026',
    voice: 'Cercana y honesta, sin épica de agencia',
    goal: 'Consideración — atraer redactores y directores creativos senior',
    product: 'Vacantes de redacción creativa y dirección de arte en LoBueno',
    targetAudience:
      'Redactores y directores creativos con 4+ años de experiencia, cansados del modelo de agencia tradicional. 26-40 años, Bogotá y Medellín.',
    theme:
      'Convocatoria de talento. El ángulo honesto: en LoBueno la IA hace el volumen para que el creativo vuelva a hacer criterio, no al revés.',
    keywords: 'talento, redacción, criterio, oficio, equipo, vacantes',
    brandVoiceGuidelines: LOBUENO_BRAND.brandVoiceGuidelines,
    valueProposition:
      'En LoBueno la máquina hace el volumen. Usted hace el criterio. No se contrata a nadie para llenar plantillas.',
    primaryCTA: 'Mándenos su portafolio',
    prohibitions:
      LOBUENO_BRAND.brandProhibitions + ', familia, pasión por lo que hacemos, gran equipo humano',
    campaignConcept: 'Acá la máquina hace el volumen. Usted hace el criterio.',
  },
];

// ------------------------------------------------- ejemplos aprobados (few-shot)

export const LOBUENO_APPROVED_EXAMPLES: {
  platform: string;
  type: string;
  content: string;
  tags: string[];
  approvalNote: string;
}[] = [
  {
    platform: 'Email',
    type: 'Contraste',
    content: 'Su marca ya sabe hablar. Nosotros la escuchamos primero.',
    tags: ['voz', 'aprobado-cliente'],
    approvalNote: 'Tic de contraste + remate seco. Referencia tonal para toda la campaña.',
  },
  {
    platform: 'Instagram Post',
    type: 'Contraste',
    content: 'Rápido escribe cualquiera.',
    tags: ['hook', 'concepto-literal'],
    approvalNote: 'Hook de 26 caracteres que carga el concepto completo. Difícil de mejorar.',
  },
  {
    platform: 'Email',
    type: 'Prueba',
    content: 'Medimos 400 piezas. El 71% podía ser de otra marca del mismo sector.',
    tags: ['dato', 'autoridad'],
    approvalNote: 'Cifra concreta en lugar de adjetivo — tic central del fingerprint.',
  },
  {
    platform: 'Google Ads',
    type: 'Beneficio',
    content: '40 piezas. Una sola voz.',
    tags: ['performance', 'alto-ctr'],
    approvalNote: 'Mejor CTR histórico de la cuenta. Estructura de dos tiempos.',
  },
  {
    platform: 'WhatsApp',
    type: 'Confesión',
    content:
      'Durante años la industria produjo copy intercambiable. Nosotros también. Por eso construimos My Voice.',
    tags: ['confesion', 'humano'],
    approvalNote: 'Autocrítica creíble. Funciona porque admite antes de vender.',
  },
  {
    platform: 'TikTok',
    type: 'Prueba',
    content: 'Le voy a mostrar el fingerprint de voz de su marca. Da números, no opiniones.',
    tags: ['demostrativo'],
    approvalNote: 'Registro hablado sin perder la sobriedad de marca.',
  },
  {
    platform: 'Instagram Historia',
    type: 'Pregunta',
    content: '¿Su copy suena a su marca o a su categoría?',
    tags: ['engagement', 'pregunta'],
    approvalNote: 'Pregunta que incomoda sin agredir. Alto índice de respuesta en sticker.',
  },
  {
    platform: 'Push Notification',
    type: 'Urgencia',
    content: 'Su fingerprint está listo.',
    tags: ['retencion'],
    approvalNote: 'Sin signos de exclamación, sin urgencia falsa. Aun así abrió al 34%.',
  },
];

// --------------------------------------------------------- anti-ejemplos

export const LOBUENO_NEGATIVE_EXAMPLES: { platform: string; content: string; reason: string }[] = [
  {
    platform: 'Email',
    content: 'Potenciamos su marca con soluciones integrales de contenido impulsadas por IA.',
    reason:
      'Tres palabras prohibidas en una línea (potenciamos, soluciones integrales, impulsadas por IA). Podría ser cualquier agencia del país.',
  },
  {
    platform: 'Instagram Post',
    content: '¡Descubre la revolución del copywriting con inteligencia artificial! 🚀🔥',
    reason:
      'Usa "Descubre" (tuteo, prohibido en registro colombiano), palabra prohibida "revolución", emojis y exclamaciones que el fingerprint marca en ~0.',
  },
  {
    platform: 'Google Ads',
    content: 'La mejor agencia creativa de Colombia',
    reason:
      'Superlativo sin prueba. El ADN exige una cifra o evidencia concreta detrás de toda afirmación de capacidad.',
  },
  {
    platform: 'WhatsApp',
    content:
      'Estimado cliente, reciba un cordial saludo del equipo comercial de LoBueno. Adjuntamos nuestro portafolio de servicios.',
    reason:
      'WhatsApp es chat, no carta formal. Saludo de plantilla y firma corporativa: exactamente lo que la guía de canal prohíbe.',
  },
  {
    platform: 'TikTok',
    content: 'En LoBueno somos una gran familia apasionada por lo que hacemos ✨',
    reason:
      'Épica de agencia vacía. No dice nada verificable y contradice el tono demostrativo del arquetipo Sabio.',
  },
];

// ---------------------------------------------------- fixture de demo (offline)

export const LOBUENO_SPINE = {
  concept: 'Rápido escribe cualquiera. Como usted, nadie.',
  keyMessage:
    'El problema no era escribir más rápido. Era que lo escrito siguiera sonando a su marca.',
  tone: 'Sobrio y directo. Contraste como estructura, cifras en lugar de adjetivos, remate en seco.',
  heroCTA: 'Pida una demo con su propia marca',
  angles: [
    {
      name: 'Contraste velocidad/voz',
      premise:
        'Toda la categoría vende rapidez. El problema real que nadie nombra es que el resultado suena igual para todos.',
      register: 'Pares de oraciones paralelas, "usted", remate de una frase corta sin conector',
    },
    {
      name: 'Prueba de laboratorio',
      premise:
        'La voz de marca no es una opinión: es medible. Largo de oración, tics, léxico propio, densidad de signos.',
      register: 'Tono demostrativo, primera persona plural, una cifra concreta por pieza',
    },
    {
      name: 'Confesión de agencia',
      premise:
        'LoBueno admite que también produjo copy intercambiable durante años. Por eso construyó la herramienta.',
      register: 'Primera persona plural, apertura autocrítica, frases de tres tiempos',
    },
  ],
};

/**
 * Copy escrito a mano, respetando los límites reales de cada slot
 * (ver server/src/channels/specs/*). Incluye a propósito dos piezas
 * "imperfectas" para que la demo muestre el critic y el fixer trabajando:
 *   - Email/subject #3        → editorFlags: ['generic'], score bajado por el editor
 *   - Instagram Post/body #3  → autofixed tras exceder el budget
 */
export const LOBUENO_CHANNEL_COPY: Record<string, LobuenoCopyItem[]> = {
  Email: [
    { slot: 'subject', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 50,
      content: 'Rápido escribe cualquiera. Como usted, nadie.',
      score: 10, scoreRationale: 'Concepto literal en 45 caracteres. Imposible confundirlo con otra agencia.' },
    { slot: 'subject', variationIndex: 2, type: 'Prueba de laboratorio', budget: 50,
      content: 'Su marca ya tiene voz. ¿La está usando?',
      score: 9, scoreRationale: 'Pregunta que incomoda sin agredir; usa "está" en registro usted.' },
    { slot: 'subject', variationIndex: 3, type: 'Confesión de agencia', budget: 50,
      content: 'Contenido con inteligencia artificial',
      score: 4, writerScore: 8,
      scoreRationale: 'Podría ser el asunto de cualquier agencia del país — no hay marca acá.',
      editorFlags: ['generic', 'agency-speak'] },

    { slot: 'preheader', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 90,
      content: 'My Voice aprende el ADN de su marca antes de escribir la primera línea.',
      score: 9, scoreRationale: '"Antes de escribir la primera línea" extiende el asunto en vez de repetirlo.' },
    { slot: 'preheader', variationIndex: 2, type: 'Prueba de laboratorio', budget: 90,
      content: 'No es velocidad. Es que 40 piezas suenen a la misma marca.',
      score: 9, scoreRationale: 'Cifra concreta y estructura de contraste, ambos tics del fingerprint.' },
    { slot: 'preheader', variationIndex: 3, type: 'Confesión de agencia', budget: 90,
      content: 'Le mostramos el fingerprint de su voz en 15 minutos.',
      score: 8, scoreRationale: 'Promesa acotada y verificable: 15 minutos.' },

    { slot: 'header', variationIndex: 1, type: 'Standard', budget: 80,
      content: 'Su marca ya sabe hablar. Nosotros la escuchamos primero.',
      score: 10, scoreRationale: 'Par de contraste con remate seco — la línea más reconocible de la marca.' },
    { slot: 'header', variationIndex: 2, type: 'Standard', budget: 80,
      content: 'El problema no era escribir rápido.',
      score: 9, scoreRationale: 'Desarma la creencia común en siete palabras.' },
    { slot: 'header', variationIndex: 3, type: 'Standard', budget: 80,
      content: '40 piezas. Una sola voz.',
      score: 9, scoreRationale: 'Estructura de dos tiempos idéntica al ejemplo aprobado de mejor CTR.' },

    { slot: 'body', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 600,
      content:
        'Cualquier herramienta le escribe cuarenta piezas en una tarde. Ese dejó de ser el problema hace rato.\n\nEl problema aparece después: las cuarenta salen correctas y ninguna suena a su marca. Quedan bien escritas y quedan intercambiables.\n\nMy Voice arranca al revés. Primero mide la voz de su marca — largo de frase, palabras propias, tics de apertura y cierre. Después escribe. Por eso las cuarenta piezas suenan a usted y no a la categoría.',
      score: 10, scoreRationale: 'Los tres párrafos siguen el arco creencia → desarme → prueba sin una sola palabra de agencia.' },
    { slot: 'body', variationIndex: 2, type: 'Prueba de laboratorio', budget: 600,
      content:
        'Medimos 400 piezas hechas con herramientas genéricas. El 71% podía atribuirse a cualquier marca del mismo sector.\n\nNo es un defecto de redacción: es que ninguna de esas herramientas sabe cómo suena su marca cuando nadie la firma.\n\nMy Voice construye un fingerprint de voz con sus piezas aprobadas y escribe contra esa medida. Le mostramos el suyo en quince minutos, con su propio material.',
      score: 9, scoreRationale: 'Abre con el dato del estudio propio; cierra con una promesa acotada y verificable.' },
    { slot: 'body', variationIndex: 3, type: 'Confesión de agencia', budget: 600,
      content:
        'Durante años produjimos copy intercambiable. Nosotros también. No lo decimos por humildad, lo decimos porque fue el punto de partida.\n\nCuando revisamos nuestro propio archivo encontramos lo mismo que le encontramos a todo el mundo: piezas correctas, sin firma.\n\nMy Voice salió de ahí. Primero escucha, después escribe. Si quiere ver qué tan distinta suena su marca de su competencia, agende quince minutos.',
      score: 9, scoreRationale: 'La autocrítica inicial compra permiso para la venta del cierre.' },

    { slot: 'cta', variationIndex: 1, type: 'Standard', budget: 25, content: 'Pida una demo', score: 9,
      scoreRationale: 'Verbo en usted, tres palabras, sin relleno.' },
    { slot: 'cta', variationIndex: 2, type: 'Standard', budget: 25, content: 'Vea su fingerprint', score: 10,
      scoreRationale: 'Específico del producto: no sirve para ninguna otra agencia.' },
    { slot: 'cta', variationIndex: 3, type: 'Standard', budget: 25, content: 'Agende 15 minutos', score: 8,
      scoreRationale: 'El número acota el compromiso y baja la fricción.' },
  ],

  'Instagram Post': [
    { slot: 'hook', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 80,
      content: 'Rápido escribe cualquiera.',
      score: 10, scoreRationale: 'Veintiséis caracteres que cargan el concepto entero.' },
    { slot: 'hook', variationIndex: 2, type: 'Prueba de laboratorio', budget: 80,
      content: 'Le medimos la voz a su marca. Da números.',
      score: 9, scoreRationale: '"Da números" convierte lo intangible en verificable.' },
    { slot: 'hook', variationIndex: 3, type: 'Confesión de agencia', budget: 80,
      content: 'Su marca no necesita más copy. Necesita el suyo.',
      score: 9, scoreRationale: 'Contraste con repetición intencional de "necesita".' },

    { slot: 'body', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 124,
      content: 'Cuarenta piezas correctas y ninguna suya. My Voice mide su voz antes de escribir. Pida una demo con su marca.',
      score: 9, scoreRationale: 'Cierra con CTA explícito sin sonar a anuncio.' },
    { slot: 'body', variationIndex: 2, type: 'Prueba de laboratorio', budget: 124,
      content: 'Largo de frase, palabras propias, tics de cierre. Su voz es medible. Se la mostramos en 15 minutos.',
      score: 9, scoreRationale: 'Enumera las tres señales del fingerprint y aterriza en una promesa corta.' },
    { slot: 'body', variationIndex: 3, type: 'Confesión de agencia', budget: 124, autofixed: true,
      content: 'También hicimos copy intercambiable durante años. My Voice salió de ahí. Agende quince minutos.',
      score: 8, scoreRationale: 'Reescrito para entrar en 124 caracteres sin perder la confesión inicial.' },

    { slot: 'hashtags', variationIndex: 1, type: 'Standard',
      content: '#ADNdeMarca #VozDeMarca #MyVoice #LoBueno',
      score: 8, scoreRationale: 'Cuatro hashtags específicos, ninguno genérico de marketing.' },
    { slot: 'visualBrief', variationIndex: 1, type: 'Standard',
      content: 'Split screen vertical. Izquierda: seis titulares de marcas distintas del mismo sector, tipografía idéntica, gris. Derecha: el mismo mensaje en la tipografía y el color propios de la marca del cliente. Sin personas, sin stock.',
      score: 9, scoreRationale: 'El visual demuestra la homogeneidad en vez de describirla.' },
  ],

  'Instagram Carrusel': [
    { slot: 'slide1Hook', variationIndex: 1, type: 'Standard', budget: 80,
      content: 'Le mostramos seis titulares. Adivine cuál es de su marca.',
      score: 10, scoreRationale: 'Convierte el scroll en una prueba que el lector quiere resolver.' },

    { slot: 'slidesBody', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 120,
      content: 'Los seis son de marcas distintas. Del mismo sector. Del mismo mes.',
      score: 9, scoreRationale: 'Tres frases de longitud decreciente — ritmo característico de la marca.' },
    { slot: 'slidesBody', variationIndex: 2, type: 'Contraste velocidad/voz', budget: 120,
      content: 'Ninguno está mal escrito. Ese es justamente el problema.',
      score: 10, scoreRationale: 'Desarma la expectativa del lector en la mitad del carrusel.' },
    { slot: 'slidesBody', variationIndex: 3, type: 'Prueba de laboratorio', budget: 120,
      content: 'Medimos 400 piezas así. El 71% podía ser de cualquier competidor.',
      score: 9, scoreRationale: 'El dato llega cuando el lector ya vio la evidencia con sus ojos.' },
    { slot: 'slidesBody', variationIndex: 4, type: 'Prueba de laboratorio', budget: 120,
      content: 'Su voz sí tiene señales propias: largo de frase, léxico, tics de cierre.',
      score: 9, scoreRationale: 'Nombra las señales concretas en lugar de hablar de "identidad".' },
    { slot: 'slidesBody', variationIndex: 5, type: 'Confesión de agencia', budget: 120,
      content: 'My Voice las mide primero y escribe después. En ese orden.',
      score: 9, scoreRationale: '"En ese orden" es un remate seco que refuerza el diferencial.' },

    { slot: 'slideFinalCTA', variationIndex: 1, type: 'Standard', budget: 80,
      content: 'Traiga diez piezas suyas. Le devolvemos su fingerprint.',
      score: 10, scoreRationale: 'CTA con intercambio concreto, no "visite el link".' },

    { slot: 'caption', variationIndex: 1, type: 'Standard', budget: 800,
      content:
        'Hicimos el ejercicio con 400 piezas de marcas colombianas generadas con herramientas de IA genéricas.\n\nEl 71% podía atribuirse a cualquier competidor del mismo sector. No porque estuvieran mal escritas — estaban bien escritas. Estaban sin firma.\n\nLa voz de una marca deja señales medibles: largo promedio de frase, palabras que repite, cómo abre y cómo cierra. My Voice construye ese fingerprint con sus piezas aprobadas y escribe contra esa medida.\n\nSi quiere ver el suyo, mándenos diez piezas que ya haya aprobado. Se lo devolvemos en quince minutos.',
      score: 9, scoreRationale: 'Reconstruye el argumento del carrusel para quien llega por el caption.' },
  ],

  'Google Ads': [
    { slot: 'shortTitle', variationIndex: 1, type: 'Standard', budget: 30, content: 'Copy con el ADN de su marca', score: 9, scoreRationale: 'Diferencial explícito en 27 caracteres.' },
    { slot: 'shortTitle', variationIndex: 2, type: 'Standard', budget: 30, content: '40 piezas. Una sola voz.', score: 10, scoreRationale: 'Réplica de la estructura con mejor CTR histórico de la cuenta.' },
    { slot: 'shortTitle', variationIndex: 3, type: 'Standard', budget: 30, content: 'Su voz, a escala', score: 9, scoreRationale: 'Usa dos palabras del léxico favorito del fingerprint.' },
    { slot: 'shortTitle', variationIndex: 4, type: 'Standard', budget: 30, content: 'Demo con su propia marca', score: 9, scoreRationale: '"Su propia marca" baja la fricción del clic.' },
    { slot: 'shortTitle', variationIndex: 5, type: 'Standard', budget: 30, content: 'El copy que suena a usted', score: 9, scoreRationale: 'Registro usted, verbo "suena" del léxico propio.' },
    { slot: 'shortTitle', variationIndex: 6, type: 'Standard', budget: 30, content: 'Medimos la voz de su marca', score: 8, scoreRationale: 'Afirmación demostrativa, coherente con el arquetipo.' },
    { slot: 'shortTitle', variationIndex: 7, type: 'Standard', budget: 30, content: 'Coherencia en 14 canales', score: 8, scoreRationale: 'Cifra concreta en lugar de "todos los canales".' },
    { slot: 'shortTitle', variationIndex: 8, type: 'Standard', budget: 30, content: 'Menos plantilla, más marca', score: 8, scoreRationale: 'Contraste comprimido a cuatro palabras.' },
    { slot: 'shortTitle', variationIndex: 9, type: 'Standard', budget: 30, content: 'Su fingerprint en 15 min', score: 9, scoreRationale: 'Promesa acotada y medible.' },
    { slot: 'shortTitle', variationIndex: 10, type: 'Standard', budget: 30, content: 'Agende una demo hoy', score: 6, writerScore: 8, scoreRationale: 'CTA funcional pero podría ser de cualquier anunciante.', editorFlags: ['generic'] },

    { slot: 'longTitle', variationIndex: 1, type: 'Standard', budget: 90, content: 'Rápido escribe cualquiera. Como su marca, nadie.', score: 10, scoreRationale: 'Concepto literal adaptado al límite de título largo.' },
    { slot: 'longTitle', variationIndex: 2, type: 'Standard', budget: 90, content: 'My Voice mide la voz de su marca antes de escribir la primera línea', score: 9, scoreRationale: 'Explica el mecanismo, no solo el beneficio.' },
    { slot: 'longTitle', variationIndex: 3, type: 'Standard', budget: 90, content: '40 piezas en 14 canales que siguen sonando a la misma marca', score: 9, scoreRationale: 'Dos cifras concretas y el beneficio en una sola línea.' },
    { slot: 'longTitle', variationIndex: 4, type: 'Standard', budget: 90, content: 'El 71% del copy con IA podría ser de su competencia. El suyo no.', score: 10, scoreRationale: 'Dato incómodo más remate seco de tres palabras.' },

    { slot: 'description', variationIndex: 1, type: 'Standard', budget: 90, content: 'Construimos el fingerprint de voz de su marca y escribimos contra esa medida.', score: 9, scoreRationale: 'Describe el mecanismo real del producto.' },
    { slot: 'description', variationIndex: 2, type: 'Standard', budget: 90, content: 'Traiga diez piezas aprobadas. Le devolvemos su fingerprint en 15 minutos.', score: 10, scoreRationale: 'Intercambio concreto con tiempo acotado.' },
    { slot: 'description', variationIndex: 3, type: 'Standard', budget: 90, content: 'Medimos 400 piezas: el 71% era intercambiable entre marcas del sector.', score: 9, scoreRationale: 'Prueba propia en lugar de promesa.' },
    { slot: 'description', variationIndex: 4, type: 'Standard', budget: 90, content: 'Email, redes, performance y radio con una sola voz verificable.', score: 8, scoreRationale: 'Aterriza la coherencia en canales concretos.' },
  ],

  'Push Notification': [
    { slot: 'title', variationIndex: 1, type: 'Prueba de laboratorio', budget: 25, content: 'Su fingerprint está listo', score: 10, scoreRationale: 'Sin exclamaciones ni urgencia falsa, igual que el ejemplo aprobado.' },
    { slot: 'title', variationIndex: 2, type: 'Contraste velocidad/voz', budget: 25, content: 'Escuchamos su marca', score: 9, scoreRationale: 'Verbo del léxico propio en tres palabras.' },
    { slot: 'title', variationIndex: 3, type: 'Prueba de laboratorio', budget: 25, content: '400 piezas medidas', score: 8, scoreRationale: 'Cifra sola como gancho.' },
    { slot: 'title', variationIndex: 4, type: 'Confesión de agencia', budget: 25, content: 'Le tenemos un dato', score: 8, scoreRationale: 'Registro conversacional en usted, sin perder sobriedad.' },
    { slot: 'title', variationIndex: 5, type: 'Contraste velocidad/voz', budget: 25, content: 'Su voz, en números', score: 9, scoreRationale: 'Contraste comprimido al máximo del slot.' },

    { slot: 'text', variationIndex: 1, type: 'Prueba de laboratorio', budget: 40, content: 'Ábralo y vea cómo suena su marca.', score: 9, scoreRationale: 'Verbo en usted y beneficio en una línea.' },
    { slot: 'text', variationIndex: 2, type: 'Contraste velocidad/voz', budget: 40, content: 'Cuarenta piezas. Una sola voz.', score: 9, scoreRationale: 'Estructura de dos tiempos ya validada.' },
    { slot: 'text', variationIndex: 3, type: 'Prueba de laboratorio', budget: 40, content: 'El 71% era de cualquier marca.', score: 9, scoreRationale: 'Dato que genera curiosidad sin contexto previo.' },
    { slot: 'text', variationIndex: 4, type: 'Confesión de agencia', budget: 40, content: 'Nosotros también lo hacíamos mal.', score: 8, scoreRationale: 'Autocrítica que invita a abrir.' },
    { slot: 'text', variationIndex: 5, type: 'Contraste velocidad/voz', budget: 40, content: 'Quince minutos con su material.', score: 8, scoreRationale: 'Promesa acotada dentro del límite duro.' },
  ],

  WhatsApp: [
    { slot: 'message', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 500,
      content:
        'Hola, le escribo de LoBueno.\n\nHicimos un ejercicio con 400 piezas de marcas colombianas hechas con herramientas de IA. El *71%* podía ser de cualquier competidor del mismo sector.\n\nSi quiere ver dónde queda su marca, mándeme diez piezas que ya haya aprobado y le devuelvo el fingerprint de su voz.',
      score: 10, scoreRationale: 'Abre como chat real, una negrita, cero emojis — respeta el fingerprint.' },
    { slot: 'message', variationIndex: 2, type: 'Prueba de laboratorio', budget: 500,
      content:
        'Hola. Una pregunta corta: ¿su copy suena a su marca o a su categoría?\n\nLo preguntamos porque es medible. Largo de frase, palabras que repite, cómo abre y cómo cierra. Eso deja un rastro.\n\nLe armamos el suyo en quince minutos con material que usted ya tenga aprobado.',
      score: 9, scoreRationale: 'Pregunta de apertura tomada de un ejemplo aprobado con alta respuesta.' },
    { slot: 'message', variationIndex: 3, type: 'Confesión de agencia', budget: 500,
      content:
        'Hola, le escribo de LoBueno.\n\nDurante años produjimos copy intercambiable. Nosotros también. Cuando revisamos nuestro archivo encontramos lo mismo que le encontramos a todo el mundo: piezas correctas, sin firma.\n\nDe ahí salió *My Voice*. Si quiere ver cómo suena su marca medida contra su competencia, agendemos quince minutos.',
      score: 9, scoreRationale: 'La confesión funciona en chat porque no hay tono corporativo alrededor.' },

    { slot: 'cta', variationIndex: 1, type: 'Standard', budget: 40, content: 'Mándeme sus diez piezas', score: 9, scoreRationale: 'Acción concreta y de bajo esfuerzo.' },
    { slot: 'cta', variationIndex: 2, type: 'Standard', budget: 40, content: 'Agendemos quince minutos', score: 9, scoreRationale: 'Primera persona plural: mantiene el registro de chat.' },
    { slot: 'cta', variationIndex: 3, type: 'Standard', budget: 40, content: 'Le muestro su fingerprint', score: 10, scoreRationale: 'Específico del producto, imposible de reutilizar por otra agencia.' },
  ],

  TikTok: [
    { slot: 'verbalHook', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 80,
      content: 'Estos seis titulares son de seis marcas distintas. Adivine cuál es cuál.',
      score: 10, scoreRationale: 'Convierte al espectador en participante en los primeros dos segundos.' },
    { slot: 'verbalHook', variationIndex: 2, type: 'Prueba de laboratorio', budget: 80,
      content: 'Le voy a medir la voz a su marca. Da números, no opiniones.',
      score: 9, scoreRationale: 'Registro hablado sin perder la sobriedad de marca.' },
    { slot: 'verbalHook', variationIndex: 3, type: 'Confesión de agencia', budget: 80,
      content: 'Trabajo en una agencia y le voy a mostrar algo que nos dejó mal parados.',
      score: 9, scoreRationale: 'Autocrítica como gancho: promete una revelación incómoda.' },

    { slot: 'narrative', variationIndex: 1, type: 'Standard',
      content:
        '0-2s — Plano cerrado a pantalla con seis titulares en la misma tipografía gris.\nVoz en off: "Estos seis titulares son de seis marcas distintas. Adivine cuál es cuál."\n\n2-6s — Dedo hace scroll lento sobre los seis. Silencio.\nVoz: "Mismo sector. Mismo mes. Ninguno está mal escrito."\n\n6-11s — Corte a laptop con el panel de fingerprint. Barras de largo de frase y léxico.\nVoz: "Medimos cuatrocientas piezas así. El setenta y uno por ciento podía ser de cualquier competidor."\n\n11-16s — La pantalla reemplaza uno de los titulares por la versión en la voz real de la marca. Cambia tipografía y color.\nVoz: "Esta es la misma idea, escrita contra el fingerprint de la marca."\n\n16-20s — Plano a cámara.\nVoz: "Mándenos diez piezas suyas ya aprobadas. Le devolvemos el suyo."',
      score: 9, scoreRationale: 'La demostración visual carga el argumento; la voz en off solo la acompaña.' },

    { slot: 'caption', variationIndex: 1, type: 'Contraste velocidad/voz', budget: 100,
      content: 'Seis titulares, seis marcas, un solo tono. El ejercicio que nos dejó mal parados.',
      score: 9, scoreRationale: 'Entra en 79 caracteres y conserva la confesión.' },
    { slot: 'caption', variationIndex: 2, type: 'Prueba de laboratorio', budget: 100,
      content: 'Medimos 400 piezas de marcas colombianas. El 71% era intercambiable.',
      score: 9, scoreRationale: 'Dato solo, sin adjetivos — el tic central del fingerprint.' },
    { slot: 'caption', variationIndex: 3, type: 'Confesión de agencia', budget: 100,
      content: 'Nosotros también escribíamos así. Por eso construimos My Voice.',
      score: 8, scoreRationale: 'Dos frases, estructura causa-efecto, sin épica de agencia.' },

    { slot: 'cta', variationIndex: 1, type: 'Standard', budget: 60,
      content: 'Mándenos diez piezas suyas y le devolvemos su fingerprint.',
      score: 9, scoreRationale: 'Acción específica con contrapartida clara.' },
  ],

  'Instagram Historia': [
    { slot: 'copy', variationIndex: 1, type: 'Prueba de laboratorio', budget: 90,
      content: '¿Su copy suena a su marca o a su categoría?',
      score: 10, scoreRationale: 'Ejemplo aprobado con el mayor índice de respuesta en sticker.' },
    { slot: 'copy', variationIndex: 2, type: 'Contraste velocidad/voz', budget: 90,
      content: 'Cuarenta piezas correctas. Ninguna suya.',
      score: 9, scoreRationale: 'Dos frases, contraste puro, entra completo en pantalla.' },
    { slot: 'copy', variationIndex: 3, type: 'Confesión de agencia', budget: 90,
      content: 'Medimos 400 piezas. El 71% podía ser de su competencia.',
      score: 9, scoreRationale: 'El dato funciona solo, sin necesidad de contexto previo.' },

    { slot: 'interactive', variationIndex: 1, type: 'Standard',
      content: 'Sticker de encuesta con la pregunta "¿Su copy suena a su marca o a su categoría?" y las opciones "A mi marca" / "Uy… a mi categoría".',
      score: 9, scoreRationale: 'La segunda opción está redactada para que confesar sea cómodo.' },
    { slot: 'swipeCTA', variationIndex: 1, type: 'Standard', budget: 30,
      content: 'Vea su fingerprint',
      score: 9, scoreRationale: 'Mismo CTA de mejor desempeño en email; refuerza consistencia entre canales.' },
  ],
};

export const LOBUENO_COHERENCE = {
  coherenceScore: 9,
  summary:
    'El concepto aparece literal en Email, Instagram Post y Google Ads, y expandido con la misma lógica en Carrusel, TikTok y WhatsApp. Registro "usted" sostenido en los ocho canales y el dato del 71% funciona como prueba transversal.',
  issues: [
    {
      channels: ['Push Notification', 'Instagram Historia'],
      problem:
        'Ambos canales se apoyan en el dato del 71% pero ninguno menciona el concepto de campaña. En una secuencia donde el usuario solo vea estos dos, la campaña queda sin anclaje.',
      severity: 'low' as const,
    },
  ],
  flags: [] as string[],
};

/** Canales cubiertos por el fixture. El resto cae en el placeholder sintético. */
export const LOBUENO_DEMO_PLATFORMS = Object.keys(LOBUENO_CHANNEL_COPY);
