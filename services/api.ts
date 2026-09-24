import type {
  Bandeja,
  Pieza,
  PiezaDetalle as _PiezaDetalle,
  PiezaAConfirmar,
  PiezaDetalle,
  PropuestaDePiezas,
} from '../types';


const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('vt_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem('vt_token');
      localStorage.removeItem('vt_user');
      // Dispatch a custom event so App.tsx can handle logout without a hard reload loop
      window.dispatchEvent(new CustomEvent('vt:session-expired'));
      throw new Error('Sesión expirada');
    }
    throw new Error(error.error || 'Error en la petición');
  }

  return response.json();
};

export const authApi = {
  login: (credentials: any) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  googleLogin: (credential: string, inviteToken?: string) => apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential, inviteToken }),
  }),
  register: (data: any) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  /** Refresca la sesión sin volver a loguearse (rol y workspaces al día). */
  me: () => apiRequest('/auth/me'),
  switchWorkspace: (workspaceId: string) => apiRequest('/auth/switch-workspace', {
    method: 'POST',
    body: JSON.stringify({ workspaceId }),
  }),
  list: () => apiRequest('/users'),
};

/**
 * Un workspace = una empresa. Miembros e invitaciones siempre operan sobre el
 * workspace ACTIVO de la sesión; no hace falta pasar su id.
 */
export const workspaceApi = {
  list: () => apiRequest('/workspaces'),
  create: (name: string, plan?: string) => apiRequest('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name, plan }),
  }),
  members: () => apiRequest('/workspace/members'),
  updateMemberRole: (userId: string, role: string) => apiRequest(`/workspace/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }),
  removeMember: (userId: string) => apiRequest(`/workspace/members/${userId}`, { method: 'DELETE' }),
  invites: () => apiRequest('/workspace/invites'),
  invite: (email: string, role: string) => apiRequest('/workspace/invites', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  }),
  revokeInvite: (id: string) => apiRequest(`/workspace/invites/${id}`, { method: 'DELETE' }),
  /** Lista vacía = se puede invitar a cualquier dominio, que es el estado normal. */
  dominios: (): Promise<{ dominios: string[] }> => apiRequest('/workspace/dominios'),
  guardarDominios: (dominios: string[]): Promise<{ dominios: string[] }> =>
    apiRequest('/workspace/dominios', { method: 'PUT', body: JSON.stringify({ dominios }) }),
  getAIConfig: () => apiRequest('/workspace/ai-config'),
  updateAIConfig: (data: { aiProvider?: string; aiApiKey?: string; aiModel?: string }) =>
    apiRequest('/workspace/ai-config', { method: 'PUT', body: JSON.stringify(data) }),
};

export const analyticsApi = {
  get: (clientId?: string) => apiRequest(`/analytics${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`),
  /** Consumo y costo del workspace. Solo OWNER/ADMIN: el backend responde 403 al resto. */
  getUsage: (params?: { from?: string; to?: string; clientId?: string; groupBy?: 'day' | 'week' | 'month' }) => {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([clave, valor]) => {
      if (valor) query.append(clave, valor);
    });
    const qs = query.toString();
    return apiRequest(`/analytics/usage${qs ? `?${qs}` : ''}`);
  },
};

export const generationApi = {
  generate: (dnaProfileId: string, params: any) => apiRequest('/generate', {
    method: 'POST',
    body: JSON.stringify({ dnaProfileId, params }),
  }),
  regenerateChannel: (dnaProfileId: string, platform: string, existingSpine: any, params: any) =>
    apiRequest('/generate/channel', {
      method: 'POST',
      body: JSON.stringify({ dnaProfileId, platform, existingSpine, params }),
    }),
  history: (clientId?: string) => apiRequest(`/generate/history${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`),
  generateStream: async (
    dnaProfileId: string,
    params: any,
    onEvent: (event: { type: string; payload?: any }) => void
  ) => {
    const token = localStorage.getItem('vt_token');
    const response = await fetch(`${API_URL}/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ dnaProfileId, params }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la generación');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let nlIdx;
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          onEvent(event);
        } catch {
          // ignore partial JSON
        }
      }
    }
  }
};

export const clientApi = {
  list: () => apiRequest('/clients'),
  create: (data: any) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/clients/${id}`, { method: 'DELETE' }),
  saveDNA: (data: any) => apiRequest('/dna-profiles', { method: 'POST', body: JSON.stringify(data) }),
  duplicateDNA: (id: string) => apiRequest(`/dna-profiles/${id}/duplicate`, { method: 'POST' }),
  updateDNA: (id: string, data: any) => apiRequest(`/dna-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDNA: (id: string) => apiRequest(`/dna-profiles/${id}`, { method: 'DELETE' }),
  getDNAInsights: (dnaProfileId: string) => apiRequest(`/dna-profiles/${dnaProfileId}/insights`),
  computeFingerprint: (id: string) =>
    apiRequest(`/clients/${id}/fingerprint`, { method: 'POST' }),
  uploadBrandGuideline: async (id: string, file: File) => {
    const token = localStorage.getItem('vt_token');
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await fetch(`${API_URL}/clients/${id}/brand-guideline`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Error subiendo el PDF');
    }
    return response.json();
  },

  /**
   * Borrar el manual es su propio endpoint, no un PUT con los campos en null:
   * el servidor tiene que borrar además el archivo del bucket, y
   * `brandGuidelinePdfUrl` no puede estar en la allow-list de actualización.
   */
  deleteBrandGuideline: (id: string) =>
    apiRequest(`/clients/${id}/brand-guideline`, { method: 'DELETE' }),
};

export const negativeFeedbackApi = {
  save: (data: { clientId: string; platform: string; content: string; reason: string }) =>
    apiRequest('/feedback/negative', { method: 'POST', body: JSON.stringify(data) }),
};

export const libraryApi = {
  listSaved: () => apiRequest('/saved'),
  saveVariation: (data: any) => apiRequest('/saved', { method: 'POST', body: JSON.stringify(data) }),
  updateVariation: (id: string, data: any) => apiRequest(`/saved/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVariation: (id: string) => apiRequest(`/saved/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) => apiRequest('/saved/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  listProjects: () => apiRequest('/projects'),
  createProject: (data: any) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
};

export const presetApi = {
  list: () => apiRequest('/presets'),
  create: (data: { name: string; clientId?: string; parameters: any }) =>
    apiRequest('/presets', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/presets/${id}`, { method: 'DELETE' }),
};

export const refineApi = {
  refine: (data: { variations: any[], instruction: string, clientId: string }) =>
    apiRequest('/copy/refine', { method: 'POST', body: JSON.stringify(data) }),
};

export const reviewApi = {
  list: () => apiRequest('/review-sessions'),
  getDetail: (id: string) => apiRequest(`/review-sessions/${id}`),
  create: (data: { title: string; variationIds: string[]; expiresInDays?: number }) =>
    apiRequest('/review-sessions', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/review-sessions/${id}`, { method: 'DELETE' }),
  // Rutas públicas: fetch directo sin Bearer token
  getByToken: (token: string) =>
    fetch(`${API_URL}/review/public/${token}`).then(r => r.json()),
  submit: (token: string, data: { reviewerName?: string; feedbacks: Array<{ savedVariationId: string; decision: string; comment?: string }> }) =>
    fetch(`${API_URL}/review/public/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};

/**
 * Tablero de producción (H2 fase 2).
 *
 * Es el único cliente tipado del archivo: `apiRequest` devuelve `any`, así que
 * cada método declara qué trae. Las transiciones son acciones con nombre y no
 * un PUT de `estado` — la máquina de estados vive en el servidor, y varias
 * acciones exigen un motivo escrito.
 */
export const funcionesApi = {
  /** `clientId` null = todas las marcas del workspace. */
  asignar: (userId: string, funcion: string, clientId?: string | null) =>
    apiRequest(`/workspace/members/${userId}/funciones`, {
      method: 'POST',
      body: JSON.stringify({ funcion, clientId: clientId ?? null }),
    }),
  quitar: (userId: string, funcionId: string) =>
    apiRequest(`/workspace/members/${userId}/funciones/${funcionId}`, { method: 'DELETE' }),
};

export const notificacionesApi = {
  /** Siempre la propia: no hay parámetro para pedir la de otro. */
  listar: (): Promise<Bandeja> => apiRequest('/notificaciones'),
  leida: (id: string): Promise<Bandeja> => apiRequest(`/notificaciones/${id}/leida`, { method: 'POST' }),
  todasLeidas: (): Promise<Bandeja> => apiRequest('/notificaciones/leidas', { method: 'POST' }),
};

export const piezasApi = {
  /** El tablero, por marca. */
  listar: (clientId: string): Promise<Pieza[]> =>
    apiRequest(`/piezas?clientId=${encodeURIComponent(clientId)}`),
  /** Mis piezas: cruza las marcas del workspace. */
  mias: (): Promise<Pieza[]> => apiRequest('/piezas/mias'),
  detalle: (id: string): Promise<PiezaDetalle> => apiRequest(`/piezas/${id}`),
  /** Solo lectura: se puede pedir cada vez que cambia la selección. */
  proponer: (savedVariationIds: string[]): Promise<PropuestaDePiezas> =>
    apiRequest('/piezas/propuesta', {
      method: 'POST',
      body: JSON.stringify({ savedVariationIds }),
    }),
  crear: (piezas: PiezaAConfirmar[]): Promise<Pieza[]> =>
    apiRequest('/piezas', { method: 'POST', body: JSON.stringify({ piezas }) }),
  renombrar: (id: string, titulo: string): Promise<Pieza> =>
    apiRequest(`/piezas/${id}`, { method: 'PATCH', body: JSON.stringify({ titulo }) }),
  asignar: (id: string, asignadaAId: string): Promise<Pieza> =>
    accion(id, 'asignar', { asignadaAId }),
  reasignar: (id: string, asignadaAId: string): Promise<Pieza> =>
    accion(id, 'reasignar', { asignadaAId }),
  entregar: (id: string, enlace: string): Promise<Pieza> => accion(id, 'entregar', { enlace }),
  aceptar: (id: string, nota?: string): Promise<Pieza> => accion(id, 'aceptar', { nota }),
  /**
   * El motivo va desglosado (H2.E · D7): lo de copy y lo de diseño tienen
   * destinatarios distintos. Al menos uno de los dos, y el servidor lo exige.
   */
  devolver: (id: string, motivos: { notaCopy?: string; notaDiseno?: string }): Promise<Pieza> =>
    accion(id, 'devolver', motivos),
  reabrir: (id: string, motivos: { notaCopy?: string; notaDiseno?: string }): Promise<Pieza> =>
    accion(id, 'reabrir', motivos),
  actualizarCopy: (id: string): Promise<Pieza> => accion(id, 'actualizar-copy', {}),
  /** Un comentario no mueve la pieza: queda en su historial. */
  comentar: (id: string, nota: string): Promise<Pieza> => accion(id, 'comentar', { nota }),
  /**
   * La entrega de un canal gráfico: el archivo, no un enlace. Va por fetch
   * directo y no por `apiRequest` porque este manda `Content-Type: json`, y un
   * multipart necesita que el navegador arme el boundary.
   */
  subirArchivo: async (id: string, archivo: File): Promise<Pieza> => {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    const token = localStorage.getItem('vt_token');
    const respuesta = await fetch(`${API_URL}/piezas/${id}/archivo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: cuerpo,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo subir la pieza');
    return datos;
  },
  /** NO_DISPONIBLE es una caída del proveedor, no un veredicto. */
  reauditar: (id: string): Promise<Pieza> => apiRequest(`/piezas/${id}/reauditar`, { method: 'POST' }),
  decidirHallazgo: (hallazgoId: string, decision: 'ACEPTADO' | 'CORREGIDO', nota?: string): Promise<Pieza> =>
    apiRequest(`/piezas/hallazgos/${hallazgoId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, nota }),
    }),
};

const accion = (id: string, nombre: string, datos: Record<string, unknown>): Promise<Pieza> =>
  apiRequest(`/piezas/${id}/${nombre}`, { method: 'POST', body: JSON.stringify(datos) });
