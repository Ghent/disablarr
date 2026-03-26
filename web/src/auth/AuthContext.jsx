import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('disablarr_token'));
    const [loading, setLoading] = useState(true);

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        api.checkAuth()
            .then(() => setLoading(false))
            .catch(() => {
                localStorage.removeItem('disablarr_token');
                setToken(null);
                setLoading(false);
            });
    }, [token]);

    const login = useCallback(async (password) => {
        const res = await api.login(password);
        localStorage.setItem('disablarr_token', res.token);
        setToken(res.token);
        return res;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('disablarr_token');
        setToken(null);
    }, []);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'var(--text-secondary)',
            }}>
                Loading...
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
