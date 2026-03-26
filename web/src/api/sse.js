import { useEffect, useRef, useCallback, useState } from 'react';
import { apiBase } from '../basePath';

/**
 * useSSE hook — connects to the SSE endpoint and dispatches events.
 * Returns { engineStatus, logs, settings, connected }
 */
export function useSSE() {
    const [engineStatus, setEngineStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [settings, setSettings] = useState(null);
    const [connected, setConnected] = useState(false);
    const esRef = useRef(null);

    const connect = useCallback(() => {
        const token = localStorage.getItem('disablarr_token');
        if (!token) return;

        // Close existing connection
        if (esRef.current) {
            esRef.current.close();
        }

        const es = new EventSource(`${apiBase()}/events?token=${encodeURIComponent(token)}`);
        esRef.current = es;

        es.onopen = () => setConnected(true);
        es.onerror = () => {
            setConnected(false);
            // EventSource auto-reconnects
        };

        es.addEventListener('engine-status', (e) => {
            try {
                setEngineStatus(JSON.parse(e.data));
            } catch { /* ignore parse errors */ }
        });

        es.addEventListener('logs', (e) => {
            try {
                const newEntries = JSON.parse(e.data);
                setLogs((prev) => [...prev, ...newEntries]);
            } catch { /* ignore parse errors */ }
        });

        es.addEventListener('settings', (e) => {
            try {
                setSettings(JSON.parse(e.data));
            } catch { /* ignore parse errors */ }
        });
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (esRef.current) {
                esRef.current.close();
            }
        };
    }, [connect]);

    const clearLogs = useCallback(() => setLogs([]), []);

    return { engineStatus, logs, settings, connected, clearLogs };
}
