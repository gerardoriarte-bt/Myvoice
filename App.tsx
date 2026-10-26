
import React from 'react';
import ParameterForm from './components/ParameterForm';
import ResultsTable from './components/ResultsTable';
import GenerationProgress from './components/GenerationProgress';
import FailedChannelsPanel, { CanalFallido } from './components/FailedChannelsPanel';
import { runMockGeneration } from './services/mockGeneration';
import SavedManager from './components/SavedManager';
import ClientManager from './components/ClientManager';
import UserManager from './components/UserManager';
import UserHeader from './components/UserHeader';
import NotificationSystem, { Notification, NotificationType } from './components/NotificationSystem';
import { CopyParameters, CopyVariation, ReviewSession, SavedVariation, BrandConfig, Client, User, WorkspaceMember, WorkspaceSummary, canManageWorkspace, ContentDNAProfile } from './types';
import TableroProduccion from './components/produccion/TableroProduccion';
import Bandeja, { DestinoAviso } from './components/Bandeja';
import { NAV_STAGES, SCREENS, ScreenId } from './screens';
import { VOICES, GOALS } from './constants';
import HomePage from './components/HomePage';
import AISettings from './components/AISettings';
import HelpGuide from './components/HelpGuide';
import SelectorDeMarca from './components/SelectorDeMarca';
import Novedades from './components/Novedades';
import AvisoDeNovedad from './components/AvisoDeNovedad';
import { Novedad, novedadPendiente } from './novedades';
import { generationApi, clientApi, libraryApi, authApi, workspaceApi, refineApi, reviewApi } from './services/api';

import CollaborationHub from './components/CollaborationHub';
import ReviewPortal from './components/ReviewPortal';
import Analytics from './components/Analytics';
import GenerationHistory from './components/GenerationHistory';
import WorkflowHelpSidebar from './components/WorkflowHelpSidebar';
import { LOBUENO_DNA_PROFILES, LOBUENO_APPROVED_EXAMPLES } from './shared/lobuenoBrand';
import Isotipo from './components/ui/Isotipo';

const MOCK_CLIENTS: Client[] = [
  { id: 'c-lobueno', name: 'LoBueno', industry: 'Agencia creativa y de contenido', logo: '', createdAt: Date.now() },
  { id: 'c-terpel', name: 'Terpel', industry: 'Energía y Combustibles', logo: '', createdAt: Date.now() },
  { id: 'c-huggies', name: 'Huggies', industry: 'Cuidado Infantil', logo: '', createdAt: Date.now() },
  { id: 'c-clubcol', name: 'Club Colombia', industry: 'Bebidas Premium', logo: '', createdAt: Date.now() },
  { id: 'c-bimbo', name: 'Bimbo', industry: 'Alimentos y Panadería', logo: '', createdAt: Date.now() },
  { id: 'c-vw', name: 'Volkswagen', industry: 'Automotriz', logo: '', createdAt: Date.now() },
];

const MOCK_DNA: ContentDNAProfile[] = [
  ...LOBUENO_DNA_PROFILES.map(p => ({
    id: `dna-lobueno-${p.key}`,
    clientId: 'c-lobueno',
    name: p.name,
    voice: p.voice,
    goal: p.goal,
    product: p.product,
    targetAudience: p.targetAudience,
    theme: p.theme,
    keywords: p.keywords,
    brandVoiceGuidelines: p.brandVoiceGuidelines,
    valueProposition: p.valueProposition,
    primaryCTA: p.primaryCTA,
    prohibitions: p.prohibitions,
    campaignConcept: p.campaignConcept,
    feedbackExamples: LOBUENO_APPROVED_EXAMPLES.map(e => ({ platform: e.platform, content: e.content })),
    createdAt: Date.now(),
  })),
  {
    id: 'dna-terpel-1',
    clientId: 'c-terpel',
    name: 'Campaña Evolución Terpel',
    voice: 'Cercana y Amigable',
    goal: 'Fidelización (Retención)',
    product: 'Puntos Colombia / Gasolina Evo',
    targetAudience: 'Conductores urbanos y transportadores',
    theme: 'Redención de puntos por galonaje acumulado',
    keywords: 'rendimiento, ahorro, energía, Colombia',
    brandVoiceGuidelines: 'Ser serviciales, usar términos como "el combustible que nos mueve", evitar ser demasiado técnicos.',
    valueProposition: 'Terpel no solo vende combustible, es la energía que conecta a todo un país.',
    primaryCTA: 'Redime tus puntos aquí',
    feedbackExamples: [],
    createdAt: Date.now()
  }
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  // La lista de pantallas vive en screens.ts y en ningún otro lado: repetirla
  // acá como unión literal ya dejó una pantalla fuera al agregarla.
  const [activeTab, setActiveTab] = React.useState<ScreenId>('clients');
  /**
   * A qué pieza saltar cuando se abre un aviso de la bandeja. Vive acá porque
   * el que cambia de pestaña es este componente; el tablero lo consume una vez
   * y lo devuelve en null, así que volver a Producción a mano no reabre la
   * pieza de un aviso viejo.
   */
  const [destinoProduccion, setDestinoProduccion] = React.useState<DestinoAviso | null>(null);
  const [reviewToken, setReviewToken] = React.useState(() => new URLSearchParams(window.location.search).get('review'));
  /**
   * Respuestas del cliente que todavía no se vieron. Antes contaba TODAS las
   * revisiones completadas —un número que solo crecía— y además recién se
   * calculaba al entrar a Revisiones, así que el aviso nunca avisaba nada.
   */
  const [respuestasNuevas, setRespuestasNuevas] = React.useState(0);
  const contarRespuestasNuevas = (sesiones: ReviewSession[]) => {
    let vistas = 0;
    try { vistas = Number(localStorage.getItem('vt_revisiones_vistas') || 0); } catch { /* sin storage */ }
    setRespuestasNuevas(
      sesiones.filter(x => x.submission?.submittedAt && new Date(x.submission.submittedAt).getTime() > vistas).length
    );
  };
  const [variations, setVariations] = React.useState<CopyVariation[]>([]);
  const [coherence, setCoherence] = React.useState<any | null>(null);
  const [spine, setSpine] = React.useState<any | null>(null);
  const [usage, setUsage] = React.useState<any | null>(null);
  const [lastParams, setLastParams] = React.useState<CopyParameters | null>(null);
  const [progressPlatforms, setProgressPlatforms] = React.useState<string[]>([]);
  const [progressSpineDone, setProgressSpineDone] = React.useState(false);
  const [progressChannelStatus, setProgressChannelStatus] = React.useState<Record<string, 'pending' | 'active' | 'done' | 'error'>>({});
  const [progressCoherenceStatus, setProgressCoherenceStatus] = React.useState<'pending' | 'active' | 'done' | 'error'>('pending');
  const [progressChannelMeta, setProgressChannelMeta] = React.useState<Record<string, string>>({});
  const [failedChannels, setFailedChannels] = React.useState<Record<string, CanalFallido>>({});
  const [savedVariations, setSavedVariations] = React.useState<SavedVariation[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [dnaProfiles, setDnaProfiles] = React.useState<ContentDNAProfile[]>([]);
  const [users, setUsers] = React.useState<WorkspaceMember[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  /** Cerrado con Escape o afuera: no cuenta como visto, vuelve en la próxima sesión. */
  const [avisoCerradoEnSesion, setAvisoCerradoEnSesion] = React.useState(false);
  /** Abierto a mano desde Novedades, aunque ya se haya visto. */
  const [avisoReabierto, setAvisoReabierto] = React.useState<Novedad | null>(null);
  /**
   * La marca activa. Es UNA para toda la app y vive en el encabezado: antes
   * cada pantalla tenía su propio selector y cambiar en una no se arrastraba a
   * la siguiente. Se recuerda entre sesiones.
   */
  const [activeClientId, setActiveClientId] = React.useState<string>(() => {
    try { return localStorage.getItem('vt_marca_activa') || ''; } catch { return ''; }
  });
  React.useEffect(() => {
    try { if (activeClientId) localStorage.setItem('vt_marca_activa', activeClientId); } catch { /* sin storage */ }
  }, [activeClientId]);
  /** El inicio se decide una vez, cuando llegan los datos; después manda la persona. */
  const inicioElegido = React.useRef(false);
  const [customVoices, setCustomVoices] = React.useState<BrandConfig[]>([]);
  const [customGoals, setCustomGoals] = React.useState<BrandConfig[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDataReady, setIsDataReady] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingStep, setLoadingStep] = React.useState(0);

  // El rol ya no es global: es el rol del usuario EN EL WORKSPACE ACTIVO, y
  // cambia al cambiar de workspace.
  const isAdmin = canManageWorkspace(currentUser?.role);

  // Quien no administra entra a la misma herramienta, con el menú recortado por
  // `adminOnly`. Antes se lo desviaba entero a ClientPortal —una vista de solo
  // lectura de cuando MEMBER quería decir «cliente»—, y desde el H2 eso dejaba
  // al diseñador sin el tablero donde está su pieza. La pestaña de arranque
  // (Marcas) es de administración, así que se lo lleva a la primera suya.
  React.useEffect(() => {
    if (currentUser && !isAdmin && SCREENS[activeTab].adminOnly) setActiveTab('produccion');
  }, [currentUser, isAdmin, activeTab]);
  const workspaces: WorkspaceSummary[] = currentUser?.workspaces || [];
  const activeClient = clients.find(c => c.id === activeClientId);

  const loadingMessages = [
    "Sincronizando con el ADN estratégico...",
    "Consultando OpenAI GPT-4o...",
    "Entrenando motor con pilares de éxito...",
    "Redactando variaciones de alto impacto...",
    "Certificando coherencia de marca..."
  ];

  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('vt_token', token);
    localStorage.setItem('vt_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    addNotification(`Bienvenido, ${user.name}`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('vt_token');
    localStorage.removeItem('vt_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  /**
   * Cambiar de workspace emite un token nuevo: el workspace activo viaja
   * firmado y el backend lo vuelve a validar contra la membresía en cada
   * request. Después hay que recargar los datos, porque todo lo que está en
   * memoria pertenece al workspace anterior.
   */
  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === currentUser?.workspaceId) return;
    try {
      const session = await authApi.switchWorkspace(workspaceId);
      localStorage.setItem('vt_token', session.token);
      localStorage.setItem('vt_user', JSON.stringify(session.user));
      setCurrentUser(session.user);
      setVariations([]);
      setSpine(null);
      setCoherence(null);
      setActiveClientId('');
      setIsDataReady(false);
      const [apiClients, apiSaved] = await Promise.all([
        clientApi.list(),
        libraryApi.listSaved(),
      ]);
      setClients(apiClients);
      setSavedVariations(apiSaved);
      setActiveClientId(apiClients[0]?.id ?? '');
      setDnaProfiles(apiClients.flatMap((c: Client) => c.dnaProfiles || []));
      setIsDataReady(true);
      addNotification(`Ahora estás en ${session.user.workspaceName}`, 'success');
    } catch (err) {
      addNotification('No se pudo cambiar de workspace', 'error');
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem('vt_token');
    const storedUser = localStorage.getItem('vt_user');
    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        // La sesión guardada puede estar desactualizada (membresía revocada,
        // rol cambiado). El backend manda la versión vigente.
        authApi.me()
          .then(fresh => {
            localStorage.setItem('vt_token', fresh.token);
            localStorage.setItem('vt_user', JSON.stringify(fresh.user));
            setCurrentUser(fresh.user);
          })
          .catch(() => {/* apiRequest ya dispara vt:session-expired en 401 */});
      } catch {
        localStorage.removeItem('vt_token');
        localStorage.removeItem('vt_user');
      }
    }

    /**
     * El enlace del correo: `?pieza=<id>&marca=<clientId>`. Aterriza en la
     * pieza, no en la portada — un correo que te deja en la pantalla de inicio
     * te obliga a buscar justo lo que vino a avisarte.
     *
     * Se limpia la URL después de leerla para que un F5 no reabra la misma
     * pieza una semana más tarde.
     */
    const params = new URLSearchParams(window.location.search);
    const pieza = params.get('pieza');
    const marca = params.get('marca');
    if (marca) {
      setDestinoProduccion({ clientId: marca, piezaId: pieza });
      setActiveTab('produccion');
      params.delete('pieza');
      params.delete('marca');
      const limpia = params.toString();
      window.history.replaceState({}, '', limpia ? `${window.location.pathname}?${limpia}` : window.location.pathname);
    }

    const onSessionExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener('vt:session-expired', onSessionExpired);
    return () => window.removeEventListener('vt:session-expired', onSessionExpired);
  }, []);

  React.useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const addNotification = (message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismissNotification(id), 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [apiClients, apiSaved, apiUsers, apiSesiones] = await Promise.all([
          clientApi.list(),
          libraryApi.listSaved(),
          isAdmin ? authApi.list() : Promise.resolve([]),
          isAdmin ? reviewApi.list().catch(() => []) : Promise.resolve([]),
        ]);
        if (Array.isArray(apiSesiones)) contarRespuestasNuevas(apiSesiones);

        // Normalize Clients (logoUrl -> logo, Date -> number)
        const normalizedClients = apiClients.map((c: any) => ({
          ...c,
          logo: c.logoUrl || c.logo || '',
          createdAt: typeof c.createdAt === 'string' ? new Date(c.createdAt).getTime() : c.createdAt
        }));

        setClients(normalizedClients);
        
        // Normalize Saved Variations
        const normalizedSaved = apiSaved.map((v: any) => ({
          ...v,
          savedAt: typeof v.savedAt === 'string' ? new Date(v.savedAt).getTime() : v.savedAt
        }));
        setSavedVariations(normalizedSaved);
        
        setUsers(apiUsers);
        
        // Extract and Normalize DNA profiles from clients
        const allDNA = normalizedClients.flatMap((c: Client) => (c.dnaProfiles || []).map((p: any) => ({
          ...p,
          createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt).getTime() : p.createdAt
        })));
        setDnaProfiles(allDNA);

        // La marca recordada, si sigue existiendo en este workspace.
        setActiveClientId(prev =>
          normalizedClients.some((c: Client) => c.id === prev) ? prev : (normalizedClients[0]?.id ?? '')
        );

        // El inicio: quien administra entra a Copy —donde está lo que espera una
        // decisión—, o a Marcas si todavía no hay ninguna. Quien no administra
        // ya fue llevado a Producción. Un enlace de correo (?pieza=) ya eligió.
        if (!inicioElegido.current) {
          inicioElegido.current = true;
          if (isAdmin) setActiveTab(prev => (prev === 'clients' && normalizedClients.length > 0 ? 'saved' : prev));
        }

        addNotification('Datos sincronizados con éxito', 'success');
      } catch (err: any) {
        console.error('Fetch error:', err);
        addNotification('Error al sincronizar datos', 'error');
      } finally {
        setIsDataReady(true);
      }
    };

    fetchData();

    // Still keep basic settings in localStorage if needed (voices, goals)
    const storedVoices = localStorage.getItem('vt_custom_voices');
    const storedGoals = localStorage.getItem('vt_custom_goals');
    
    if (storedVoices) setCustomVoices(JSON.parse(storedVoices));
    else setCustomVoices(VOICES.map((v, i) => ({ id: `v${i}`, name: v })));

    if (storedGoals) setCustomGoals(JSON.parse(storedGoals));
    else setCustomGoals(GOALS.map((g, i) => ({ id: `g${i}`, name: g })));
  }, [isAuthenticated]);

  React.useEffect(() => { if (isAuthenticated) localStorage.setItem('vt_custom_voices', JSON.stringify(customVoices)); }, [customVoices, isAuthenticated]);
  React.useEffect(() => { if (isAuthenticated) localStorage.setItem('vt_custom_goals', JSON.stringify(customGoals)); }, [customGoals, isAuthenticated]);

  const handleGenerate = async (params: CopyParameters, lockedSnapshot?: CopyVariation[]) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setLastParams(params);
    setCoherence(null);
    setSpine(null);
    setUsage(null);

    const lockedByKey = new Map<string, CopyVariation>();
    (lockedSnapshot || []).forEach(v => {
      lockedByKey.set(`${v.platform}::${v.slot || '_default'}::${v.variationIndex ?? 0}`, v);
    });

    // Seed with locked variations so they stay visible during regeneration
    setVariations([...(lockedSnapshot || [])]);

    const platforms = (params.platforms || []) as unknown as string[];
    setProgressPlatforms(platforms);
    setProgressSpineDone(false);
    setProgressChannelStatus(Object.fromEntries(platforms.map(p => [p, 'pending'])));
    setProgressChannelMeta({});
    setFailedChannels({});
    setProgressCoherenceStatus(platforms.length >= 2 ? 'pending' : 'done');

    try {
      // Usar el brief que el formulario seleccionó explícitamente. El fallback
      // por clientId toma el PRIMER brief de la marca, que con marcas de varios
      // briefs no es el elegido — solo aplica a presets guardados antes de que
      // params llevara dnaProfileId.
      const profile =
        (params.dnaProfileId && dnaProfiles.find(p => p.id === params.dnaProfileId)) ||
        dnaProfiles.find(p => p.clientId === params.clientId);
      if (!profile) throw new Error("No se encontró el ADN de esta marca");

      // El formulario tiene su propio selector de marca, independiente del
      // global. Sin esta sincronización la espina muestra la marca anterior y,
      // peor, handleSaveVariation archiva el copy bajo la marca equivocada
      // (contaminando su bucle de feedback).
      if (params.clientId && params.clientId !== activeClientId) {
        setActiveClientId(params.clientId);
      }

      const collected: any[] = [...(lockedSnapshot || [])];

      await generationApi.generateStream(profile.id, params, (event) => {
        if (event.type === 'spine') {
          setSpine(event.payload);
          setProgressSpineDone(true);
          setProgressChannelStatus(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (next[k] === 'pending') next[k] = 'active'; });
            return next;
          });
        } else if (event.type === 'channel') {
          // Merge: for each new variation, if its key is locked, skip (we keep the old locked one)
          const fresh = event.payload.variations.filter((v: CopyVariation) => {
            const key = `${v.platform}::${v.slot || '_default'}::${v.variationIndex ?? 0}`;
            return !lockedByKey.has(key);
          });
          collected.push(...fresh);
          setVariations([...collected]);
          setProgressChannelStatus(prev => ({ ...prev, [event.payload.platform]: 'done' }));
          setProgressChannelMeta(prev => { const next = { ...prev }; delete next[event.payload.platform]; return next; });
        } else if (event.type === 'channel-error') {
          setProgressChannelStatus(prev => ({ ...prev, [event.payload.platform]: 'error' }));
          // El panel de canales fallidos sobrevive al fin de la generación; la
          // notificación se va sola y el canal quedaría invisible.
          setFailedChannels(prev => ({
            ...prev,
            [event.payload.platform]: {
              message: event.payload.message,
              terminal: Boolean(event.payload.terminal),
            },
          }));
          addNotification(`Error en ${event.payload.platform}: ${event.payload.message}`, 'error');
          if (event.payload.message.includes('ALERTA_CREDITOS')) {
            throw new Error(event.payload.message);
          }
        } else if (event.type === 'channel-retry') {
          setProgressChannelMeta(prev => ({
            ...prev,
            [event.payload.platform]: `Reintentando ${event.payload.intento}/${event.payload.intentosMax}…`,
          }));
        } else if (event.type === 'coherence') {
          setCoherence(event.payload);
          setProgressCoherenceStatus('done');
        } else if (event.type === 'usage') {
          setUsage(event.payload);
        }
      });

      // If coherence didn't fire (single channel), mark as done
      setProgressCoherenceStatus(prev => prev === 'pending' || prev === 'active' ? 'done' : prev);

      if (collected.length > 0) {
        const scored = collected.filter((v: any) => typeof v.score === 'number');
        if (scored.length > 0) {
          const avgScore = scored.reduce((acc: number, v: any) => acc + v.score, 0) / scored.length;
          addNotification(`Análisis completo. Coherencia estratégica: ${avgScore.toFixed(1)}/10`, avgScore > 8 ? 'success' : 'info');
        }
      }

      addNotification('Estrategia generada con éxito', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Error en el motor OpenAI';
      
      if (errorMessage.includes('ALERTA_CREDITOS')) {
        addNotification(errorMessage.replace('ALERTA_CREDITOS:', '').trim(), 'warning');
        alert("⚠️ CRÉDITOS IA AGOTADOS ⚠️\n\n" + errorMessage.replace('ALERTA_CREDITOS:', '').trim());
      } else {
        addNotification(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };



  const handleRegenerate = (lockedKeys: Set<string>) => {
    if (!lastParams) return;
    const lockedSnapshot = variations.filter(v => {
      const key = `${v.platform}::${v.slot || '_default'}::${v.variationIndex ?? 0}`;
      return lockedKeys.has(key);
    });
    handleGenerate(lastParams, lockedSnapshot);
  };

  const handleRegenerateChannel = async (platform: string) => {
    if (!lastParams || !spine) return;
    // Mismo criterio que handleGenerate: el brief elegido manda. El fallback por
    // clientId toma el PRIMER brief de la marca, y reintentar un canal contra el
    // brief equivocado es peor que no reintentarlo.
    const profile =
      (lastParams.dnaProfileId && dnaProfiles.find(p => p.id === lastParams.dnaProfileId)) ||
      dnaProfiles.find(p => p.clientId === lastParams.clientId);
    if (!profile) return;
    try {
      const result = await generationApi.regenerateChannel(profile.id, platform, spine, lastParams);
      if (result?.variations?.length) {
        setVariations(prev => [...prev.filter(v => v.platform !== platform), ...result.variations]);
        setFailedChannels(prev => { const next = { ...prev }; delete next[platform]; return next; });
        setProgressChannelStatus(prev => ({ ...prev, [platform]: 'done' }));
        addNotification(`Canal ${platform} regenerado`, 'success');
      } else {
        setFailedChannels(prev => ({
          ...prev,
          [platform]: { message: `${platform} volvió a no devolver copy.`, terminal: false },
        }));
      }
    } catch (err: any) {
      const mensaje = err?.message || `Error al regenerar ${platform}`;
      setFailedChannels(prev => ({ ...prev, [platform]: { message: mensaje, terminal: false } }));
      addNotification(mensaje, 'error');
    }
  };

  const handleRefine = React.useCallback(async (instruction: string) => {
    const clientId = lastParams?.clientId;
    if (!clientId || variations.length === 0) return;
    try {
      const result = await refineApi.refine({ variations, instruction, clientId });
      if (result?.variations?.length > 0) {
        setVariations(result.variations);
        const fallidos: string[] = result.failedPlatforms ?? [];
        if (fallidos.length > 0) {
          addNotification(`Copy refinado, salvo ${fallidos.join(', ')}: esos canales conservan el texto anterior`, 'info');
        } else {
          addNotification('Copy refinado correctamente', 'success');
        }
      }
    } catch (err: any) {
      addNotification(err?.message || 'Error al refinar el copy', 'error');
    }
  }, [variations, lastParams, addNotification]);

  /**
   * Después de crear, editar o borrar una marca se vuelve a pedir la lista: el
   * nombre repetido y los conteos los calcula el servidor sobre todas las
   * marcas, y la respuesta de una sola no los trae (docs/plan-marcas-relacionadas.md).
   */
  const recargarMarcas = async () => {
    const lista = await clientApi.list();
    setClients(
      (lista as any[]).map(c => ({
        ...c,
        logo: c.logoUrl || c.logo || '',
        createdAt: typeof c.createdAt === 'string' ? new Date(c.createdAt).getTime() : c.createdAt,
      }))
    );
  };

  const handleSaveDNAProfile = async (profile: Omit<ContentDNAProfile, 'id' | 'createdAt'>) => {
    try {
      // La marca del brief es la del formulario. Antes se pisaba con la marca
      // activa global, y un brief creado dentro de otra marca caía en la equivocada.
      const savedProfile = await clientApi.saveDNA({ ...profile, clientId: profile.clientId || activeClientId });
      setDnaProfiles(prev => [savedProfile, ...prev]);
      addNotification('ADN Estratégico guardado en DB', 'success');
    } catch (err) {
      addNotification('Error al guardar ADN', 'error');
    }
  };

  const handleUpdateDNAProfile = async (id: string, updates: Partial<ContentDNAProfile>) => {
    try {
      const updatedProfile = await clientApi.updateDNA(id, updates);
      setDnaProfiles(prev => prev.map(p => p.id === id ? updatedProfile : p));
      addNotification('ADN Estratégico actualizado', 'success');
    } catch (err) {
      addNotification('Error al actualizar ADN', 'error');
    }
  };

  const handleDeleteDNAProfile = async (id: string) => {
    if (window.confirm('¿Eliminar este perfil de ADN?')) {
      try {
        await clientApi.deleteDNA(id);
        setDnaProfiles(prev => prev.filter(p => p.id !== id));
        addNotification('Perfil de ADN eliminado', 'success');
      } catch (err) {
        addNotification('Error al eliminar ADN', 'error');
      }
    }
  };

  /**
   * Guardar el copy en SU campaña: la del brief con que se generó. La marca y
   * el brief salen de `lastParams` —lo que realmente se generó— y no de la
   * marca activa: si alguien cambia de marca arriba con resultados en pantalla,
   * o restaura una generación del Historial, el copy no puede caer en otra.
   */
  const handleSaveVariation = async (variation: CopyVariation, silencioso = false) => {
    const clientId = lastParams?.clientId || activeClientId;
    try {
      const saved = await libraryApi.saveVariation({
        ...variation,
        clientId,
        dnaProfileId: lastParams?.dnaProfileId,
        tags: []
      });
      setSavedVariations(prev => [{ ...saved, savedAt: new Date(saved.savedAt).getTime() }, ...prev]);
      if (!silencioso) addNotification('Guardado en la campaña, por aprobar', 'success');
      return true;
    } catch (err: any) {
      addNotification(err?.message || 'No se pudo guardar el copy', 'error');
      return false;
    }
  };

  const refrescarCopy = async () => {
    try {
      const apiSaved = await libraryApi.listSaved();
      setSavedVariations(apiSaved.map((v: any) => ({
        ...v,
        savedAt: typeof v.savedAt === 'string' ? new Date(v.savedAt).getTime() : v.savedAt
      })));
    } catch { /* la lista vieja sigue a la vista */ }
  };

  /** El nombre de la campaña donde cae lo que se guarda, para decirlo en pantalla. */
  const campanaDeLoGenerado = lastParams?.dnaProfileId
    ? dnaProfiles.find(p => p.id === lastParams.dnaProfileId)?.name
    : undefined;
  const marcaDeLoGenerado = clients.find(c => c.id === (lastParams?.clientId || activeClientId));

  const pantallaConMarca = !['clients', 'users', 'settings', 'help', 'analytics', 'novedades'].includes(activeTab);

  /*
   * La novedad a avisar al entrar. Se espera a que la sesión venga del
   * servidor (`novedadesVistas` definido): con el usuario viejo del
   * localStorage, alguien que ya la vio la vería de nuevo por un instante.
   */
  const pendiente =
    currentUser?.novedadesVistas !== undefined
      ? novedadPendiente(currentUser.novedadesVistas, currentUser.createdAt)
      : null;
  const avisoVisible = avisoReabierto ?? (avisoCerradoEnSesion ? null : pendiente);

  const marcarAvisoVisto = (novedad: Novedad, irA?: ScreenId) => {
    setAvisoReabierto(null);
    if (irA) setActiveTab(irA);
    if (!currentUser || currentUser.novedadesVistas?.includes(novedad.id)) return;
    const actualizado = { ...currentUser, novedadesVistas: [...(currentUser.novedadesVistas ?? []), novedad.id] };
    setCurrentUser(actualizado);
    localStorage.setItem('vt_user', JSON.stringify(actualizado));
    // Si falla, vuelve a aparecer en la próxima sesión: mejor eso que perderlo.
    authApi.marcarNovedadVista(novedad.id).catch(() => {});
  };

  if (reviewToken) {
    return (
      <ReviewPortal
        token={reviewToken}
        onBack={() => {
          setReviewToken(null);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
        <HomePage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }


  return (
    <div className="min-h-screen flex" style={{ background: '#F5F5F7' }}>
      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
      {avisoVisible && (
        <AvisoDeNovedad
          novedad={avisoVisible}
          administra={isAdmin}
          onVista={irA => marcarAvisoVisto(avisoVisible, irA)}
          onCerrar={() => {
            setAvisoReabierto(null);
            setAvisoCerradoEnSesion(true);
          }}
        />
      )}

      {/* SIDEBAR — Apple macOS style */}
      <aside className="apple-sidebar w-[216px] fixed top-0 bottom-0 left-0 flex flex-col z-50">
        {/* App identity */}
        <div className="h-[52px] flex items-center px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <Isotipo size={24} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em] leading-none">My Voice</div>
              {workspaces.length > 1 ? (
                <select
                  aria-label="Cambiar de workspace"
                  className="mt-0.5 -ml-1 max-w-[140px] truncate bg-transparent text-[10px] text-[#86868B] leading-none outline-none cursor-pointer hover:text-[#1D1D1F] focus-visible:ring-1 focus-visible:ring-[#1D1D1F] rounded"
                  value={currentUser?.workspaceId || ''}
                  onChange={e => handleSwitchWorkspace(e.target.value)}
                >
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-[10px] text-[#86868B] mt-0.5 leading-none truncate">
                  {currentUser?.workspaceName || 'Workspace'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {NAV_STAGES.map((etapa, i) => {
            const visibles = etapa.screens
              .map(id => SCREENS[id])
              .filter(s => !s.adminOnly || isAdmin);
            if (visibles.length === 0) return null;
            return (
              <div key={etapa.id} className={i === 0 ? 'space-y-0.5' : 'mt-4 space-y-0.5'}>
                {/* La etapa numerada convierte la lista de pantallas en la secuencia
                    del trabajo: preparar la marca, producir, aprobar, administrar. */}
                <div className="flex items-center gap-1.5 px-3 pb-1">
                  <span className="text-[9px] font-semibold text-[#86868B] tabular-nums">{i + 1}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">
                    {etapa.label}
                  </span>
                </div>
                {visibles.map(pantalla => {
                  const isActive = activeTab === pantalla.id;
                  const Icono = pantalla.icon;
                  return (
                    <button
                      key={pantalla.id}
                      onClick={() => setActiveTab(pantalla.id as any)}
                      className={`w-full text-left px-3 py-[7px] rounded-[8px] text-[13px] flex items-center gap-2.5 transition-all duration-100 ${
                        isActive
                          ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#1D1D1F] font-medium'
                          : 'text-[#6E6E73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F] font-normal'
                      }`}
                    >
                      <Icono className={`w-[15px] h-[15px] shrink-0 ${isActive ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`} strokeWidth={1.75} />
                      <span className="flex-1">{pantalla.name}</span>
                      {pantalla.id === 'collaboration' && respuestasNuevas > 0 && !isActive && (
                        <span
                          title="Respuestas del cliente sin ver"
                          className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shrink-0"
                        >
                          {respuestasNuevas > 9 ? '9+' : respuestasNuevas}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User + Powered by */}
        <div className="shrink-0 border-t border-[rgba(0,0,0,0.07)]">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
              {currentUser.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#1D1D1F] truncate leading-none">{currentUser.name}</div>
              <div className="text-[10px] text-[#86868B] truncate mt-0.5 leading-none">{currentUser.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-[#86868B] hover:text-[#1D1D1F] transition-colors p-1 rounded-md hover:bg-[rgba(0,0,0,0.06)] shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.05)] flex flex-col items-center gap-1.5">
            {/* Discreto a propósito: el registro está a mano, pero no es un paso del proceso. */}
            <button
              onClick={() => setActiveTab('novedades')}
              className={`mb-1 text-[10.5px] hover:text-[#1D1D1F] hover:underline ${
                activeTab === 'novedades' ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'
              }`}
            >
              {SCREENS.novedades.name}
              {pendiente && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />}
            </button>
            <span className="text-[9px] uppercase tracking-[0.12em] text-[#86868B] font-medium">Powered by</span>
            <img src="/LobuenoLogo.png" alt="LoBueno" className="h-[14px] w-auto opacity-50" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-[216px] flex flex-col min-h-screen">
        {/* HEADER */}
        <header className="apple-header h-[48px] sticky top-0 z-40 flex items-center justify-between px-7">
          <div className="flex items-center gap-3">
            {/*
              La marca activa, una para toda la app. No aparece donde no acota
              nada: el equipo, la configuración, la guía, el consumo del
              workspace, ni Marcas, que es donde se elige entrando a una.
            */}
            {pantallaConMarca && clients.length > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#86868B]">Marca</span>
                  <SelectorDeMarca
                    marcas={clients}
                    activa={activeClientId}
                    onElegir={setActiveClientId}
                    onRevisarRepetidos={isAdmin ? () => setActiveTab('clients') : undefined}
                  />
                </div>
                <span className="text-[#C7C7CC]">/</span>
              </>
            )}
            <span className="text-[13px] font-semibold text-[#1D1D1F]">{SCREENS[activeTab]?.name}</span>
          </div>
          {/* La campana vive en el header y no en la nav: el aviso no es una
              pantalla más, es algo que interrumpe estés donde estés. */}
          <Bandeja
            onIr={destino => {
              setDestinoProduccion(destino);
              setActiveTab('produccion');
            }}
            onIrAlTablero={() => setActiveTab('produccion')}
          />
        </header>

        <main className="flex-1 p-7">
          {activeTab === 'generator' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-3 lg:sticky lg:top-[76px]">
                <ParameterForm
                  onSubmit={handleGenerate}
                  isLoading={isLoading} 
                  clients={clients} 
                  dnaProfiles={dnaProfiles}
                  defaultClientId={activeClientId}
                  onClientChange={setActiveClientId}
                  onNavigateToClients={() => setActiveTab('clients')}
                  miembros={users}
                  puedeEditarAprobacion={isAdmin}
                  onError={m => addNotification(m, 'error')}
                />
              </div>
              <div className="lg:col-span-9 space-y-6">
                {isLoading && (
                  <GenerationProgress
                    selectedPlatforms={progressPlatforms}
                    spineDone={progressSpineDone}
                    channelStatus={progressChannelStatus}
                    channelMeta={progressChannelMeta}
                    coherenceStatus={
                      progressPlatforms.every(p => progressChannelStatus[p] === 'done' || progressChannelStatus[p] === 'error')
                        ? (coherence ? 'done' : 'active')
                        : 'pending'
                    }
                  />
                )}
                {Object.keys(failedChannels).length > 0 && (
                  <FailedChannelsPanel
                    canales={failedChannels}
                    onReintentar={handleRegenerateChannel}
                    disabled={isLoading || !spine}
                  />
                )}
                {variations.length > 0 ? (
                  <ResultsTable
                    variations={variations}
                    activeClient={marcaDeLoGenerado}
                    campanaNombre={campanaDeLoGenerado}
                    onSave={v => { void handleSaveVariation(v); }}
                    savedContentList={savedVariations.map(s => s.content)}
                    coherence={coherence}
                    spine={spine}
                    usage={usage}
                    onRegenerate={handleRegenerate}
                    onRegenerateChannel={spine ? handleRegenerateChannel : undefined}
                    onRefine={handleRefine}
                    isLoading={isLoading}
                    onBulkSave={async (vars) => {
                      let count = 0;
                      for (const v of vars) if (await handleSaveVariation(v, true)) count++;
                      if (count > 0) addNotification(`${count} guardado${count === 1 ? '' : 's'} en la campaña, por aprobar`, 'success');
                    }}
                  />
                ) : !isLoading ? (
                  <div className="apple-card overflow-hidden">
                    <div className="px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                      <div className="md:col-span-2 space-y-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-medium text-emerald-700 tracking-tight">Motor listo</span>
                        </div>
                        <h3 className="text-[22px] font-semibold text-[#1D1D1F] tracking-[-0.02em] leading-tight">
                          Generá una campaña en minutos.
                        </h3>
                        <p className="text-[13px] text-[#6E6E73] leading-relaxed max-w-md">
                          Seleccioná marca, campaña y canales. La IA orquesta director estratégico, especialistas por canal, editor y auditoría cross-channel — end-to-end.
                        </p>
                        <div className="grid grid-cols-2 gap-2.5 max-w-xs pt-1">
                          {[
                            { n: '1', t: 'Marca + ADN' },
                            { n: '2', t: 'Etapa del funnel' },
                            { n: '3', t: 'Canales (1-14)' },
                            { n: '4', t: 'Generar' },
                          ].map(s => (
                            <div key={s.n} className="flex items-center gap-2.5 text-[12px] text-[#1D1D1F]">
                              <span className="w-5 h-5 rounded-full bg-ink text-white text-[10px] font-semibold flex items-center justify-center shrink-0">{s.n}</span>
                              <span>{s.t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-50 to-orange-50 blur-2xl opacity-80 rounded-3xl" />
                          <div className="relative bg-ink text-white rounded-2xl p-6 w-44 shadow-2xl">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">Concepto</div>
                            <p className="text-[13px] font-medium leading-snug">"Una vez al año bajamos el precio. Hoy."</p>
                            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                              <span className="text-[10px] text-white/40">14 canales</span>
                              <span className="text-[11px] font-semibold text-emerald-400">9.2/10</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'clients' && isAdmin && (
            <ClientManager 
              clients={clients} 
              dnaProfiles={dnaProfiles}
              voices={customVoices}
              goals={customGoals}
              onUpdateVoices={setCustomVoices}
              onUpdateGoals={setCustomGoals}
              onResetDefaults={() => {
                setCustomVoices(VOICES.map((v, i) => ({ id: `v${i}`, name: v })));
                setCustomGoals(GOALS.map((g, i) => ({ id: `g${i}`, name: g })));
              }}
              onAdd={async c => {
                try {
                  await clientApi.create(c);
                  await recargarMarcas();
                  addNotification('Marca registrada con éxito', 'success');
                } catch (err) {
                  addNotification(err instanceof Error ? err.message : 'Error al registrar marca', 'error');
                }
              }} 
              onUpdate={async (id, u) => {
                try {
                  const updated = await clientApi.update(id, u);
                  // El nombre y la madre cambian lo que se calcula sobre todas las
                  // marcas; el resto (que se edita tecla a tecla) se aplica solo.
                  if ('name' in u || 'marcaMadreId' in u) await recargarMarcas();
                  else setClients(prev => prev.map(c => (c.id === id ? { ...c, ...updated, logo: updated.logoUrl || c.logo, createdAt: c.createdAt } : c)));
                  addNotification('Marca actualizada', 'success');
                } catch (err) {
                  // El motivo del servidor importa acá: «ya es parte de otra marca»
                  // dice qué hacer; «Error al actualizar» no.
                  addNotification(err instanceof Error ? err.message : 'Error al actualizar marca', 'error');
                }
              }} 
              onRemove={async id => {
                if (window.confirm('¿Eliminar esta marca y todo su ADN asociado?')) {
                  try {
                    await clientApi.delete(id);
                    await recargarMarcas();
                    addNotification('Marca eliminada', 'success');
                  } catch (err) {
                    addNotification('Error al eliminar marca', 'error');
                  }
                }
              }}
              savedVariations={savedVariations}
              onAbrirMarca={setActiveClientId}
              onSaveProfile={handleSaveDNAProfile}
              onUpdateProfile={handleUpdateDNAProfile}
              onDeleteProfile={handleDeleteDNAProfile}
              onDuplicateProfile={copy => {
                const normalized = {
                  ...copy,
                  createdAt: typeof copy.createdAt === 'string' ? new Date(copy.createdAt).getTime() : copy.createdAt,
                };
                setDnaProfiles(prev => [...prev, normalized]);
                setClients(prev => prev.map(c =>
                  c.id === copy.clientId
                    ? { ...c, dnaProfiles: [...(c.dnaProfiles || []), normalized] }
                    : c
                ));
              }}
            />
          )}
          {activeTab === 'users' && isAdmin && (
            <UserManager
              members={users}
              clients={clients}
              workspaceName={currentUser?.workspaceName || 'este workspace'}
              currentUserId={currentUser?.id}
              onRefresh={async () => setUsers(await workspaceApi.members())}
              addNotification={addNotification}
              onInvite={async (email, role) => {
                const result = await workspaceApi.invite(email, role);
                setUsers(await workspaceApi.members());
                addNotification(
                  result.added
                    ? `${email} ya tenía cuenta: quedó agregado al workspace`
                    : `Invitación enviada a ${email}`,
                  'success'
                );
              }}
              onChangeRole={async (userId, role) => {
                await workspaceApi.updateMemberRole(userId, role);
                setUsers(await workspaceApi.members());
                addNotification('Rol actualizado', 'success');
              }}
              onRemove={async userId => {
                if (!window.confirm('¿Quitar a esta persona del workspace?')) return;
                await workspaceApi.removeMember(userId);
                setUsers(await workspaceApi.members());
                addNotification('Miembro removido del workspace', 'success');
              }}
            />
          )}
          {activeTab === 'saved' && (
            <SavedManager
              saved={savedVariations}
              clients={clients}
              clientId={activeClientId}
              currentUserId={currentUser.id}
              isAdmin={isAdmin}
              miembros={users}
              onRemove={async id => {
                if (window.confirm('¿Eliminar este copy?')) {
                  try {
                    await libraryApi.deleteVariation(id);
                    setSavedVariations(prev => prev.filter(v => v.id !== id));
                    addNotification('Copy eliminado', 'success');
                  } catch (err: any) {
                    addNotification(err?.message || 'No se pudo eliminar el copy', 'error');
                  }
                }
              }}
              onUpdate={async (id, u) => {
                try {
                  await libraryApi.updateVariation(id, u);
                  // Se relee la lista en vez de parchear la fila: editar el texto
                  // de un aprobado lo devuelve a «por aprobar», y el paso de cada
                  // copy lo calcula el servidor.
                  await refrescarCopy();
                  addNotification('Copy actualizado', 'success');
                } catch (err: any) {
                  addNotification(err?.message || 'No se pudo actualizar el copy', 'error');
                }
              }}
              onRefreshSaved={refrescarCopy}
              addNotification={addNotification}
              onIrA={setActiveTab}
            />
          )}
          {activeTab === 'produccion' && (
            <TableroProduccion
              clients={clients}
              clientId={activeClientId}
              onCambiarMarca={setActiveClientId}
              addNotification={addNotification}
              destino={destinoProduccion}
              onDestinoAtendido={() => setDestinoProduccion(null)}
              onIrACopyAprobado={() => setActiveTab('saved')}
            />
          )}
          {activeTab === 'history' && isAdmin && (
            <GenerationHistory
              clients={clients}
              dnaProfiles={dnaProfiles}
              initialClientId={activeClientId}
              onRestore={(log) => {
                if (log.spineJson) setSpine(log.spineJson);
                const restoredVars = Array.isArray(log.outputJson)
                  ? log.outputJson
                  : Array.isArray((log.outputJson as any)?.variations)
                    ? (log.outputJson as any).variations
                    : [];
                if (restoredVars.length > 0) setVariations(restoredVars);
                // La marca de la generación pasa a ser la activa: antes se
                // restauraba el copy de una marca con otra seleccionada, y al
                // guardarlo caía en la equivocada.
                setActiveClientId(log.clientId);
                setLastParams({
                  clientId: log.clientId,
                  dnaProfileId: log.dnaProfileId,
                  platforms: log.platforms as any,
                  voice: '', goal: '', theme: '', product: '',
                  targetAudience: '', keywords: '', brandVoiceGuidelines: '',
                  valueProposition: '', primaryCTA: '',
                  funnelStage: log.funnelStage as any,
                });
                setActiveTab('generator');
                addNotification('Generación restaurada en el editor', 'success');
              }}
            />
          )}
          {activeTab === 'analytics' && isAdmin && <Analytics />}
          {activeTab === 'collaboration' && isAdmin && (
            <CollaborationHub
              clients={clients}
              clientId={activeClientId}
              addNotification={addNotification}
              onSessionsLoaded={() => {
                try { localStorage.setItem('vt_revisiones_vistas', String(Date.now())); } catch { /* sin storage */ }
                setRespuestasNuevas(0);
              }}
              onIrACopy={() => setActiveTab('saved')}
            />
          )}
          {activeTab === 'settings' && isAdmin && (
            <div className="apple-card p-8">
              <AISettings />
            </div>
          )}
          {activeTab === 'help' && (
            <div className="apple-card p-8">
              <HelpGuide />
            </div>
          )}
          {activeTab === 'novedades' && (
            <Novedades vistas={currentUser.novedadesVistas ?? []} onVerAviso={setAvisoReabierto} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
