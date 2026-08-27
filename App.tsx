
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
import { CopyParameters, CopyVariation, Project, SavedVariation, BrandConfig, Client, User, WorkspaceMember, WorkspaceSummary, canManageWorkspace, ContentDNAProfile } from './types';
import { VOICES, GOALS } from './constants';
import HomePage from './components/HomePage';
import AISettings from './components/AISettings';
import HelpGuide from './components/HelpGuide';
import { generationApi, clientApi, libraryApi, authApi, workspaceApi, refineApi } from './services/api';

import CollaborationHub from './components/CollaborationHub';
import ReviewPortal from './components/ReviewPortal';
import Analytics from './components/Analytics';
import GenerationHistory from './components/GenerationHistory';
import ClientPortal from './components/ClientPortal';
import WorkflowHelpSidebar from './components/WorkflowHelpSidebar';
import { LOBUENO_DNA_PROFILES, LOBUENO_APPROVED_EXAMPLES } from './shared/lobuenoBrand';

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
  const [activeTab, setActiveTab] = React.useState<'generator' | 'saved' | 'clients' | 'users' | 'settings' | 'help' | 'collaboration' | 'analytics' | 'history'>('clients');
  const [reviewToken, setReviewToken] = React.useState(() => new URLSearchParams(window.location.search).get('review'));
  const [completedSessionsCount, setCompletedSessionsCount] = React.useState(0);
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
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [savedVariations, setSavedVariations] = React.useState<SavedVariation[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [dnaProfiles, setDnaProfiles] = React.useState<ContentDNAProfile[]>([]);
  const [users, setUsers] = React.useState<WorkspaceMember[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeClientId, setActiveClientId] = React.useState<string>('');
  const [customVoices, setCustomVoices] = React.useState<BrandConfig[]>([]);
  const [customGoals, setCustomGoals] = React.useState<BrandConfig[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDataReady, setIsDataReady] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingStep, setLoadingStep] = React.useState(0);

  // El rol ya no es global: es el rol del usuario EN EL WORKSPACE ACTIVO, y
  // cambia al cambiar de workspace.
  const isAdmin = canManageWorkspace(currentUser?.role);
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
      const [apiClients, apiSaved, apiProjects] = await Promise.all([
        clientApi.list(),
        libraryApi.listSaved(),
        libraryApi.listProjects(),
      ]);
      setClients(apiClients);
      setSavedVariations(apiSaved);
      setProjects(apiProjects);
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
        const [apiClients, apiSaved, apiProjects, apiUsers] = await Promise.all([
          clientApi.list(),
          libraryApi.listSaved(),
          libraryApi.listProjects(),
          isAdmin ? authApi.list() : Promise.resolve([])
        ]);

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
        
        setProjects(apiProjects.map((p: any) => ({
          ...p,
          createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt).getTime() : p.createdAt
        })));
        
        setUsers(apiUsers);
        
        // Extract and Normalize DNA profiles from clients
        const allDNA = normalizedClients.flatMap((c: Client) => (c.dnaProfiles || []).map((p: any) => ({
          ...p,
          createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt).getTime() : p.createdAt
        })));
        setDnaProfiles(allDNA);

        if (normalizedClients.length > 0) setActiveClientId(normalizedClients[0].id);

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
        addNotification('Copy refinado correctamente', 'success');
      }
    } catch {
      addNotification('Error al refinar el copy', 'error');
    }
  }, [variations, lastParams, addNotification]);

  const handleSaveDNAProfile = async (profile: Omit<ContentDNAProfile, 'id' | 'createdAt'>) => {
    try {
      const savedProfile = await clientApi.saveDNA({ ...profile, clientId: activeClientId });
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

  const createProject = async (name: string): Promise<string> => {
    try {
      const newProject = await libraryApi.createProject({ name });
      setProjects(prev => [newProject, ...prev]);
      addNotification(`Proyecto "${name}" creado`, 'success');
      return newProject.id;
    } catch (err) {
      addNotification('Error al crear proyecto', 'error');
      return '';
    }
  };

  const handleSaveVariation = async (variation: CopyVariation, projectId: string) => {
    try {
      const saved = await libraryApi.saveVariation({
        ...variation,
        projectId: projectId || null,
        clientId: activeClientId,
        tags: []
      });
      setSavedVariations(prev => [saved, ...prev]);
      addNotification('Contenido guardado en la biblioteca', 'success');
    } catch (err) {
      addNotification('Error al guardar contenido', 'error');
    }
  };

  const navItems = [
    { id: 'clients', label: 'Brand Voice', icon: '👥', adminOnly: true },
    { id: 'generator', label: 'Generate', icon: '⚡', adminOnly: true },
    { id: 'saved', label: 'Content Selection', icon: '📚', adminOnly: false },
    { id: 'analytics', label: 'Analytics', icon: '📊', adminOnly: true },
    { id: 'history', label: 'Historial', icon: '🕓', adminOnly: true },
    { id: 'collaboration', label: 'Collaboration', icon: '🤝', adminOnly: true },
    { id: 'users', label: 'Team', icon: '🛡️', adminOnly: true },
    { id: 'settings', label: 'Settings', icon: '⚙️', adminOnly: true },
    { id: 'help', label: 'Guía de uso', icon: '📖', adminOnly: false },
  ];

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

  if (isAuthenticated && currentUser && !isAdmin) {
    return (
      <>
        <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
        <ClientPortal
          currentUser={currentUser}
          savedVariations={savedVariations}
          clients={clients}
          onLogout={handleLogout}
          isLoading={!isDataReady}
        />
      </>
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

  const navIcons: Record<string, React.ReactNode> = {
    clients: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21v-6h6v6" />
      </svg>
    ),
    generator: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    saved: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    users: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    settings: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    help: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    history: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    analytics: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    collaboration: (
      <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F5F7' }}>
      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />

      {/* SIDEBAR — Apple macOS style */}
      <aside className="apple-sidebar w-[216px] fixed top-0 bottom-0 left-0 flex flex-col z-50">
        {/* App identity */}
        <div className="h-[52px] flex items-center px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[6px] bg-[#1D1D1F] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
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
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(tab => {
            if (tab.adminOnly && !isAdmin) return null;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-3 py-[7px] rounded-[8px] text-[13px] flex items-center gap-2.5 transition-all duration-100 ${
                  isActive
                    ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#1D1D1F] font-medium'
                    : 'text-[#6E6E73] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1D1D1F] font-normal'
                }`}
              >
                <span className={isActive ? 'text-[#1D1D1F]' : 'text-[#86868B]'}>
                  {navIcons[tab.id]}
                </span>
                <span className="flex-1">{tab.label}</span>
                {tab.id === 'collaboration' && completedSessionsCount > 0 && !isActive && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {completedSessionsCount > 9 ? '9+' : completedSessionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + Powered by */}
        <div className="shrink-0 border-t border-[rgba(0,0,0,0.07)]">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
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
            <span className="text-[9px] uppercase tracking-[0.12em] text-[#86868B] font-medium">Powered by</span>
            <img src="/LobuenoLogo.png" alt="LoBueno" className="h-[14px] w-auto opacity-50" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-[216px] flex flex-col min-h-screen">
        {/* HEADER */}
        <header className="apple-header h-[48px] sticky top-0 z-40 flex items-center px-7">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>
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
                  onNavigateToClients={() => setActiveTab('clients')}
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
                    projects={projects}
                    activeClient={activeClient}
                    onSave={handleSaveVariation}
                    onCreateProject={createProject}
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
                      for (const v of vars) { try { await handleSaveVariation(v, ""); count++; } catch {} }
                      if (count > 0) addNotification(count + " variaciones guardadas en la biblioteca", "success");
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
                              <span className="w-5 h-5 rounded-full bg-[#1D1D1F] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">{s.n}</span>
                              <span>{s.t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-50 to-orange-50 blur-2xl opacity-80 rounded-3xl" />
                          <div className="relative bg-[#1D1D1F] text-white rounded-2xl p-6 w-44 shadow-2xl">
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
                  const newClient = await clientApi.create(c);
                  setClients(prev => [...prev, newClient]);
                  addNotification('Marca registrada con éxito', 'success');
                } catch (err) {
                  addNotification('Error al registrar marca', 'error');
                }
              }} 
              onUpdate={async (id, u) => {
                try {
                  const updated = await clientApi.update(id, u);
                  setClients(prev => prev.map(c => c.id === id ? updated : c));
                  addNotification('Marca actualizada', 'success');
                } catch (err) {
                  addNotification('Error al actualizar marca', 'error');
                }
              }} 
              onRemove={async id => {
                if (window.confirm('¿Eliminar esta marca y todo su ADN asociado?')) {
                  try {
                    await clientApi.delete(id);
                    setClients(prev => prev.filter(c => c.id !== id));
                    addNotification('Marca eliminada', 'success');
                  } catch (err) {
                    addNotification('Error al eliminar marca', 'error');
                  }
                }
              }}
              savedVariations={savedVariations}
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
              workspaceName={currentUser?.workspaceName || 'este workspace'}
              currentUserId={currentUser?.id}
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
              projects={projects} 
              clients={clients} 
              onRemove={async id => {
                if (window.confirm('¿Eliminar este contenido de la biblioteca?')) {
                  try {
                    await libraryApi.deleteVariation(id);
                    setSavedVariations(prev => prev.filter(v => v.id !== id));
                    addNotification('Contenido eliminado', 'success');
                  } catch (err) {
                    addNotification('Error al eliminar contenido', 'error');
                  }
                }
              }} 
              onUpdate={async (id, u) => {
                try {
                  const updated = await libraryApi.updateVariation(id, u);
                  setSavedVariations(prev => prev.map(v => v.id === id ? updated : v));
                  addNotification('Contenido actualizado', 'success');
                } catch (err) {
                  addNotification('Error al actualizar contenido', 'error');
                }
              }} 
              onAddTag={() => {}} 
              onRemoveTag={() => {}} 
              onDeleteProject={async id => {
                if (window.confirm('¿Eliminar este proyecto? Los contenidos asociados permanecerán pero sin proyecto.')) {
                  try {
                    await libraryApi.deleteProject(id);
                    setProjects(prev => prev.filter(p => p.id !== id));
                    addNotification('Proyecto eliminado', 'success');
                  } catch (err) {
                    addNotification('Error al eliminar proyecto', 'error');
                  }
                }
              }} 
              onCreateProject={createProject}
              onRefreshSaved={async () => {
                try {
                  const apiSaved = await libraryApi.listSaved();
                  const normalized = apiSaved.map((v: any) => ({
                    ...v,
                    savedAt: typeof v.savedAt === 'string' ? new Date(v.savedAt).getTime() : v.savedAt
                  }));
                  setSavedVariations(normalized);
                } catch {}
              }}
              readOnly={!isAdmin}
            />
          )}
          {activeTab === 'history' && isAdmin && (
            <GenerationHistory
              clients={clients}
              dnaProfiles={dnaProfiles}
              onRestore={(log) => {
                if (log.spineJson) setSpine(log.spineJson);
                const restoredVars = Array.isArray(log.outputJson)
                  ? log.outputJson
                  : Array.isArray((log.outputJson as any)?.variations)
                    ? (log.outputJson as any).variations
                    : [];
                if (restoredVars.length > 0) setVariations(restoredVars);
                setLastParams({
                  clientId: log.clientId,
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
              savedVariations={savedVariations}
              clients={clients}
              addNotification={addNotification}
              onSessionsLoaded={s => setCompletedSessionsCount(s.filter(x => x.status === 'COMPLETED').length)}
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
        </main>
      </div>
    </div>
  );
};

export default App;
