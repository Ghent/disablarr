import { apiBase, BASE_PATH } from '../basePath';

const API_BASE = apiBase();

function getToken() {
    return localStorage.getItem('disablarr_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        localStorage.removeItem('disablarr_token');
        window.location.href = BASE_PATH + '/login';
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
    login: (password) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password }),
        }),

    checkAuth: () => request('/auth/check'),

    // Integrations
    listIntegrations: () => request('/integrations'),
    createIntegration: (data) =>
        request('/integrations', { method: 'POST', body: JSON.stringify(data) }),
    updateIntegration: (id, data) =>
        request(`/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteIntegration: (id) =>
        request(`/integrations/${id}`, { method: 'DELETE' }),
    testConnection: (url, apiKey) =>
        request('/integrations/test', {
            method: 'POST',
            body: JSON.stringify({ url, apiKey }),
        }),

    // Settings
    getSettings: () => request('/settings'),
    updateSettings: (data) =>
        request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

    // Engine
    triggerEngine: () => request('/engine/trigger', { method: 'POST' }),
    getEngineStatus: () => request('/engine/status'),
};
