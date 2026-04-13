export const getBasePath = () => {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="base-path"]');
    return meta ? meta.getAttribute('content') || '' : '';
  }
  return '';
};

export const getApiBase = () => {
  const base = getBasePath();
  return `${base}/api`;
};

function getToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('disablarr_token');
  }
  return null;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const apiBase = getApiBase();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('disablarr_token');
    }
    const base = getBasePath();
    if (typeof window !== 'undefined') {
      window.location.href = `${base}/login`;
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: (password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  checkAuth: () => request('/auth/check'),

  // Integrations
  listIntegrations: () => request('/integrations'),
  createIntegration: (data: any) =>
    request('/integrations', { method: 'POST', body: JSON.stringify(data) }),
  updateIntegration: (id: number, data: any) =>
    request(`/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIntegration: (id: number) =>
    request(`/integrations/${id}`, { method: 'DELETE' }),
  testConnection: (url: string, apiKey: string) =>
    request('/integrations/test', {
      method: 'POST',
      body: JSON.stringify({ url, apiKey }),
    }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data: any) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Engine
  triggerEngine: () => request('/engine/trigger', { method: 'POST' }),
  getEngineStatus: () => request('/engine/status'),
};
