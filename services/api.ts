
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
    const error = await response.json();
    if (response.status === 401 || error.error === 'Token inválido o expirado' || error.error === 'Token no proporcionado') {
      localStorage.removeItem('vt_token');
      localStorage.removeItem('vt_user');
      window.location.reload();
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
  googleLogin: (credential: string) => apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  }),
  register: (data: any) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  list: () => apiRequest('/users'),
  delete: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
};

export const generationApi = {
  generate: (dnaProfileId: string, params: any) => apiRequest('/generate', {
    method: 'POST',
    body: JSON.stringify({ dnaProfileId, params }),
  }),
  generateStream: async (dnaProfileId: string, params: any, onChunk: (chunk: string) => void) => {
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
    let fullText = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              fullText += parsed.chunk;
              onChunk(fullText);
            }
          } catch (e) {
            // Partial JSON chunk, ignore and wait for next
          }
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
  updateDNA: (id: string, data: any) => apiRequest(`/dna-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDNA: (id: string) => apiRequest(`/dna-profiles/${id}`, { method: 'DELETE' }),
};

export const libraryApi = {
  listSaved: () => apiRequest('/saved'),
  saveVariation: (data: any) => apiRequest('/saved', { method: 'POST', body: JSON.stringify(data) }),
  updateVariation: (id: string, data: any) => apiRequest(`/saved/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVariation: (id: string) => apiRequest(`/saved/${id}`, { method: 'DELETE' }),
  listProjects: () => apiRequest('/projects'),
  createProject: (data: any) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
};
