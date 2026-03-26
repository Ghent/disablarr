import { createContext, useContext } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Plug, Settings, ScrollText,
    LogOut, Wifi, WifiOff, Power, Palette,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useSSE } from '../api/sse';
import { useTheme } from './ThemeContext';
import StatusBadge from './StatusBadge';

const SSEContext = createContext(null);
export function useSSEData() { return useContext(SSEContext); }

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/integrations', label: 'Integrations', icon: Plug },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/logs', label: 'Logs', icon: ScrollText },
];

export default function Layout() {
    const { logout } = useAuth();
    const location = useLocation();
    const sseData = useSSE();
    const { theme, setTheme, themes } = useTheme();

    function cycleTheme() {
        const idx = themes.findIndex((t) => t.id === theme);
        const next = themes[(idx + 1) % themes.length];
        setTheme(next.id);
    }

    return (
        <SSEContext.Provider value={sseData}>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                {/* Sidebar */}
                <aside style={{
                    width: 250,
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    zIndex: 50,
                    transition: 'background 400ms ease',
                }}>
                    {/* Brand */}
                    <div style={{
                        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
                        borderBottom: '1px solid var(--border-default)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <motion.div
                                animate={{ boxShadow: ['0 0 12px var(--accent-glow)', '0 0 24px var(--accent-glow)', '0 0 12px var(--accent-glow)'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--accent-1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Power size={18} color="var(--text-inverse)" strokeWidth={2.5} />
                            </motion.div>
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                color: 'var(--accent-1)',
                            }}>
                                Disablarr
                            </span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 'var(--space-sm)',
                            fontSize: '0.75rem',
                            color: sseData.connected ? 'var(--status-success)' : 'var(--text-tertiary)',
                        }}>
                            {sseData.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {sseData.connected ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <StatusBadge dryRun={sseData.settings?.dryRun} />
                    </div>

                    {/* Navigation */}
                    <nav style={{ flex: 1, padding: '0 var(--space-sm)' }}>
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)',
                                        padding: '10px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        color: isActive ? 'var(--accent-1)' : 'var(--text-secondary)',
                                        background: isActive ? 'rgba(168, 85, 247, 0.06)' : 'transparent',
                                        fontSize: '0.875rem',
                                        fontWeight: isActive ? 600 : 400,
                                        transition: 'all 150ms ease',
                                        marginBottom: 2,
                                        textDecoration: 'none',
                                        position: 'relative',
                                    }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-indicator"
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: 3,
                                                height: '60%',
                                                borderRadius: 'var(--radius-full)',
                                                background: 'var(--accent-1)',
                                                boxShadow: '0 0 8px var(--accent-glow)',
                                            }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    <Icon size={18} />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div style={{ borderTop: '1px solid var(--border-default)', padding: 'var(--space-sm) var(--space-md)' }}>
                        <button
                            onClick={cycleTheme}
                            className="btn btn-icon"
                            title={`Theme: ${themes.find((t) => t.id === theme)?.label}`}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                gap: 'var(--space-sm)',
                                color: 'var(--text-secondary)',
                                padding: '10px 16px',
                                fontSize: '0.8125rem',
                            }}
                        >
                            <Palette size={15} />
                            <span>{themes.find((t) => t.id === theme)?.label || 'Theme'}</span>
                        </button>
                        <button
                            onClick={logout}
                            className="btn btn-icon"
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                gap: 'var(--space-sm)',
                                color: 'var(--text-secondary)',
                                padding: '10px 16px',
                                fontSize: '0.8125rem',
                            }}
                        >
                            <LogOut size={15} />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, marginLeft: 250, position: 'relative' }}>
                    {/* Ambient background */}
                    <div className="ambient-bg">
                        <motion.div
                            className="ambient-orb"
                            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                top: '5%',
                                right: '10%',
                                width: 300,
                                height: 300,
                                background: `radial-gradient(circle, var(--accent-glow), transparent 70%)`,
                                opacity: 0.3,
                            }}
                        />
                        <motion.div
                            className="ambient-orb"
                            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                bottom: '10%',
                                left: '5%',
                                width: 350,
                                height: 350,
                                background: `radial-gradient(circle, rgba(168, 85, 247, 0.15), transparent 70%)`,
                                opacity: 0.3,
                            }}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            style={{ position: 'relative', zIndex: 1 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </SSEContext.Provider>
    );
}
