import { createContext, useContext, useState } from 'react';
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
    { path: '/', label: 'Dashboard' },
    { path: '/integrations', label: 'Integrations' },
    { path: '/settings', label: 'Settings' },
    { path: '/logs', label: 'Logs' },
];

export default function Layout() {
    const { logout } = useAuth();
    const location = useLocation();
    const sseData = useSSE();

    return (
        <SSEContext.Provider value={sseData}>
            <div data-slot="app-shell" className="min-h-screen bg-background text-foreground transition-colors duration-300">
                
                {/* Navbar */}
                <header data-slot="navbar" className="sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            
                            {/* Brand & Left Side */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2.5 group">
                                    <div data-slot="brand-icon" className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                        <Power className="w-4.5 h-4.5 text-primary-foreground text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold tracking-tight text-foreground leading-tight">
                                            Disablarr
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/50 leading-none font-mono mt-0.5 flex items-center gap-1">
                                            {sseData.connected ? <Wifi size={10} className="text-success" /> : <WifiOff size={10} className="text-muted-foreground" />}
                                            {sseData.connected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="hidden sm:block ml-2">
                                     <StatusBadge dryRun={sseData.settings?.dryRun} />
                                </div>
                            </div>

                            {/* Nav Links */}
                            <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                            }`}
                                            data-slot={isActive ? 'nav-link-active' : undefined}
                                        >
                                            {item.label}
                                        </NavLink>
                                    );
                                })}

                                <div className="w-px h-5 bg-border mx-2" />
                                
                                <button
                                    onClick={logout}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 flex items-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main data-slot="page-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
                    <Outlet />
                </main>
                
            </div>
        </SSEContext.Provider>
    );
}
