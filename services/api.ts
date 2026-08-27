
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
