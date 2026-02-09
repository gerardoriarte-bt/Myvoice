
import React from 'react';
import ParameterForm from './components/ParameterForm';
import ResultsTable from './components/ResultsTable';
import SavedManager from './components/SavedManager';
import ClientManager from './components/ClientManager';
import UserManager from './components/UserManager';
import UserHeader from './components/UserHeader';
import NotificationSystem, { Notification, NotificationType } from './components/NotificationSystem';
import { CopyParameters, CopyVariation, Project, SavedVariation, BrandConfig, Client, User, Role, ContentDNAProfile } from './types';
import { VOICES, GOALS } from './constants';
import Login from './components/Login';
import { generationApi, clientApi, libraryApi, authApi } from './services/api';

const MOCK_CLIENTS: Client[] = [
  { id: 'c-terpel', name: 'Terpel', industry: 'Energía y Combustibles', logo: '', createdAt: Date.now() },
  { id: 'c-huggies', name: 'Huggies', industry: 'Cuidado Infantil', logo: '', createdAt: Date.now() },
  { id: 'c-clubcol', name: 'Club Colombia', industry: 'Bebidas Premium', logo: '', createdAt: Date.now() },
  { id: 'c-bimbo', name: 'Bimbo', industry: 'Alimentos y Panadería', logo: '', createdAt: Date.now() },
  { id: 'c-vw', name: 'Volkswagen', industry: 'Automotriz', logo: '', createdAt: Date.now() },
];

const MOCK_DNA: ContentDNAProfile[] = [
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
  const [activeTab, setActiveTab] = React.useState<'generator' | 'saved' | 'clients' | 'users'>('clients');
  const [variations, setVariations] = React.useState<CopyVariation[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [savedVariations, setSavedVariations] = React.useState<SavedVariation[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [dnaProfiles, setDnaProfiles] = React.useState<ContentDNAProfile[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeClientId, setActiveClientId] = React.useState<string>('');
  const [customVoices, setCustomVoices] = React.useState<BrandConfig[]>([]);
  const [customGoals, setCustomGoals] = React.useState<BrandConfig[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loadingStep, setLoadingStep] = React.useState(0);

  const isAdmin = currentUser?.role === 'ADMIN';
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

  React.useEffect(() => {
    const token = localStorage.getItem('vt_token');
    const storedUser = localStorage.getItem('vt_user');
    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      // Ensure role is normalized even from older storage if necessary
      const normalizedUser = {
        ...user,
        role: user.role === 'ADMIN' ? 'Admin' : (user.role === 'CLIENT' ? 'Cliente' : user.role)
      };
      setCurrentUser(normalizedUser);
      setIsAuthenticated(true);
    }
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

        setClients(apiClients);
        setSavedVariations(apiSaved);
        setProjects(apiProjects);
        setUsers(apiUsers);
        
        // Extract DNA profiles from clients
        const allDNA = apiClients.flatMap((c: any) => c.dnaProfiles || []);
        setDnaProfiles(allDNA);

        if (apiClients.length > 0) setActiveClientId(apiClients[0].id);

        addNotification('Datos sincronizados con éxito', 'success');
      } catch (err: any) {
        addNotification('Error al sincronizar datos', 'error');
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

  const handleGenerate = async (params: CopyParameters) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setVariations([]);
    try {
      const profile = dnaProfiles.find(p => p.clientId === params.clientId);
      if (!profile) throw new Error("No se encontró el ADN de esta marca");

      const result = await generationApi.generate(profile.id, params);
      setVariations(result.variations);
      addNotification('Estrategia generada con OpenAI', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error en el motor OpenAI', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
    { id: 'clients', label: 'MARCAS', icon: '👥', adminOnly: true },
    { id: 'generator', label: 'IA ENGINE', icon: '⚡', adminOnly: true },
    { id: 'saved', label: 'BIBLIOTECA', icon: '📚', adminOnly: false },
    { id: 'users', label: 'EQUIPO', icon: '🛡️', adminOnly: true }
  ];

  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
        <Login onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <UserHeader currentUser={currentUser} onLogout={handleLogout} />
      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />
      
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase">
            MY <span className="text-gradient">VOICE</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">
            Strategic Copy Engine by Grupo LoBueno
          </p>
        </header>

        <div className="flex justify-center mb-20">
          <div className="bg-white p-2 rounded-3xl flex flex-wrap justify-center gap-1.5 shadow-md border border-slate-200">
            {navItems.map(tab => {
              if (tab.adminOnly && !isAdmin) return null;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-8 py-4 rounded-[1.25rem] text-[10px] font-black transition-all flex items-center gap-3 uppercase tracking-[0.2em] ${
                    isActive ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <main className="animate-in fade-in duration-1000">
          {activeTab === 'generator' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-4 lg:sticky lg:top-28">
                <ParameterForm 
                  onSubmit={handleGenerate} 
                  isLoading={isLoading} 
                  clients={clients} 
                  dnaProfiles={dnaProfiles}
                  defaultClientId={activeClientId}
                  onNavigateToClients={() => setActiveTab('clients')}
                />
              </div>
              <div className="lg:col-span-8">
                {isLoading ? (
                  <div className="h-[600px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="absolute inset-0 bg-slate-50 opacity-30 pointer-events-none"></div>
                    <div className="relative z-10 space-y-12">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-40 h-40 border-4 border-slate-100 rounded-full border-t-slate-900 animate-spin"></div>
                        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl animate-pulse relative">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">My Voice <span className="text-slate-400">Thinking</span></h3>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">IA Engine is processing...</p>
                        </div>
                        <div className="bg-slate-50 px-8 py-5 rounded-2xl border border-slate-200 inline-flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-700">
                           <div className="w-2 h-2 rounded-full bg-slate-900 animate-bounce"></div>
                           <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight italic">
                             "{loadingMessages[loadingStep]}"
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : variations.length > 0 ? (
                  <ResultsTable 
                    variations={variations} 
                    projects={projects} 
                    activeClient={activeClient} 
                    onSave={handleSaveVariation} 
                    onCreateProject={createProject} 
                    savedContentList={savedVariations.map(s => s.content)} 
                  />
                ) : (
                  <div className="h-[600px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] text-center shadow-sm">
                    <div className="bg-slate-50 p-10 rounded-full mb-8">
                      <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Motor Listo</h3>
                    <p className="max-w-xs text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Selecciona el ADN de tu marca para activar el motor estratégico.</p>
                  </div>
                )}
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
              onSaveProfile={handleSaveDNAProfile}
              onUpdateProfile={handleUpdateDNAProfile}
              onDeleteProfile={handleDeleteDNAProfile}
            />
          )}
          {activeTab === 'users' && isAdmin && (
            <UserManager 
              users={users} 
              clients={clients} 
              onAdd={async u => {
                try {
                  // We use register but it returns a simple message, we might want to refresh the list or the API should return the user
                  await authApi.register({ ...u, password: 'password123' }); // Default password for new members
                  const updatedUsers = await authApi.list();
                  setUsers(updatedUsers);
                  addNotification('Miembro del equipo añadido (con contraseña temporal)', 'success');
                } catch (err) {
                  addNotification('Error al añadir miembro', 'error');
                }
              }} 
              onUpdate={(id, u) => {
                // Update endpoint not implemented yet in backend for users, keeping local for now
                setUsers(prev => prev.map(usr => usr.id === id ? {...usr, ...u} : usr));
              }} 
              onRemove={async id => {
                if (window.confirm('¿Eliminar este acceso?')) {
                  try {
                    await authApi.delete(id);
                    setUsers(prev => prev.filter(usr => usr.id !== id));
                    addNotification('Acceso eliminado', 'success');
                  } catch (err) {
                    addNotification('Error al eliminar acceso', 'error');
                  }
                }
              }} 
            />
          )}
          {activeTab === 'saved' && (
            <SavedManager 
              saved={currentUser?.role === 'CLIENT' && currentUser?.clientId ? savedVariations.filter(v => v.clientId === currentUser?.clientId) : savedVariations} 
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
              readOnly={!isAdmin} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
