
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  if (response.status === 401) {
    localStorage.removeItem('vt_token');
    window.location.reload();
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la petición');
  }

  return response.json();
};

export const authApi = {
  login: (credentials: any) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (data: any) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const generationApi = {
  generate: (dnaProfileId: string, params: any) => apiRequest('/generate', {
    method: 'POST',
    body: JSON.stringify({ dnaProfileId, params }),
  }),
};

export const clientApi = {
  list: () => apiRequest('/clients'),
  create: (data: any) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(data) }),
  saveDNA: (data: any) => apiRequest('/dna-profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateDNA: (id: string, data: any) => apiRequest(`/dna-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const libraryApi = {
  listSaved: () => apiRequest('/saved'),
  saveVariation: (data: any) => apiRequest('/saved', { method: 'POST', body: JSON.stringify(data) }),
  listProjects: () => apiRequest('/projects'),
  createProject: (data: any) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(data) }),
};
