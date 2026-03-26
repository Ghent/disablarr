import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Switch from '@radix-ui/react-switch';
import { Save, Loader2, Check, Palette } from 'lucide-react';
import { api } from '../api/client';
import { useTheme } from '../components/ThemeContext';

const TUI_THEMES = [
    { name: 'disablarr', label: 'Disablarr', colors: ['#ff79c6', '#bd93f9', '#0d1117'] },
    { name: 'charm', label: 'Charm', colors: ['#ff5faf', '#af87ff', '#1a1a2e'] },
    { name: 'dracula', label: 'Dracula', colors: ['#ff79c6', '#bd93f9', '#282a36'] },
    { name: 'catppuccin', label: 'Catppuccin', colors: ['#f5c2e7', '#cba6f7', '#1e1e2e'] },
    { name: 'base16', label: 'Base 16', colors: ['#6699cc', '#cc99cc', '#2d2d2d'] },
    { name: 'base', label: 'Base', colors: ['#00cc99', '#66ccff', '#1a1a1a'] },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [interval, setInterval] = useState('15');
    const [tuiTheme, setTuiTheme] = useState('disablarr');
    const [dryRun, setDryRun] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [loadError, setLoadError] = useState('');
    const { theme: webTheme, setTheme: setWebTheme, themes: webThemes } = useTheme();

    async function fetchSettings() {
        setLoadError('');
        try {
            const s = await api.getSettings();
            setSettings(s);
            setInterval(String(s.intervalMinutes));
            setTuiTheme(s.themeName);
            setDryRun(s.dryRun);
        } catch (err) {
            setLoadError(err.message || 'Failed to load settings. Is the server running?');
        }
    }

    useEffect(() => { fetchSettings(); }, []);

    async function handleSave() {
        const mins = parseInt(interval, 10);
        if (isNaN(mins) || mins < 1) {
            setError('Interval must be at least 1 minute');
            return;
        }

        setSaving(true);
        setError('');
        setSaved(false);

        try {
            await api.updateSettings({
                intervalMinutes: mins,
                themeName: tuiTheme,
                dryRun,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (!settings && !loadError) {
        return (
            <div className="page" style={{ textAlign: 'center', color: 'var(--text-tertiary)', paddingTop: 'var(--space-2xl)' }}>
                Loading settings...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: 'var(--space-2xl)' }}>
                <div style={{
                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)',
                    padding: 'var(--space-xl)', background: 'rgba(248, 113, 113, 0.08)',
                    border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: 'var(--radius-lg)',
                }}>
                    <p style={{ color: 'var(--status-error)', fontSize: '0.9375rem' }}>{loadError}</p>
                    <button className="btn btn-secondary" onClick={fetchSettings}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Configure engine behavior and appearance</p>
            </div>

            <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: 640 }}
            >
                {/* Interval */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                        Run Interval
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        How often the engine checks your integrations (in minutes)
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <input
                            className="input"
                            type="number"
                            min="1"
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            style={{ width: 120 }}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>minutes</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-xs)',
                        marginTop: 'var(--space-md)',
                    }}>
                        {[5, 10, 15, 30, 60].map((v) => (
                            <motion.button
                                key={v}
                                className={`btn ${String(v) === interval ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setInterval(String(v))}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {v}m
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Dry Run Toggle */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                Dry Run Mode
                            </h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                When enabled, the engine logs what it <em>would</em> do without making changes
                            </p>
                        </div>
                        <Switch.Root
                            className="switch-root"
                            checked={dryRun}
                            onCheckedChange={setDryRun}
                        >
                            <Switch.Thumb className="switch-thumb" />
                        </Switch.Root>
                    </div>
                </motion.div>

                {/* Web UI Theme */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                        <Palette size={18} style={{ color: 'var(--accent-1)' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Web UI Theme</h3>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Visual theme for the web interface (applied instantly)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                        {webThemes.map((t) => (
                            <motion.button
                                key={t.id}
                                onClick={() => setWebTheme(t.id)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '12px 8px',
                                    background: webTheme === t.id ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-primary)',
                                    border: `2px solid ${webTheme === t.id ? 'var(--accent-1)' : 'var(--border-default)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {t.preview.map((c, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: c,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: webTheme === t.id ? 'var(--accent-1)' : 'var(--text-secondary)',
                                    fontWeight: webTheme === t.id ? 600 : 400,
                                }}>
                                    {t.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* TUI Theme */}
                <motion.div variants={itemVariants} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                        SSH Theme
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Theme for the SSH terminal UI
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                        {TUI_THEMES.map((t) => (
                            <motion.button
                                key={t.name}
                                onClick={() => setTuiTheme(t.name)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '12px 8px',
                                    background: tuiTheme === t.name ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-primary)',
                                    border: `2px solid ${tuiTheme === t.name ? 'var(--accent-1)' : 'var(--border-default)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {t.colors.map((c, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: c,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: tuiTheme === t.name ? 'var(--accent-1)' : 'var(--text-secondary)',
                                    fontWeight: tuiTheme === t.name ? 600 : 400,
                                }}>
                                    {t.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Error + Save */}
                {error && (
                    <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'rgba(248, 113, 113, 0.1)',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--status-error)',
                        fontSize: '0.8125rem',
                    }}>
                        {error}
                    </div>
                )}

                <motion.button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ alignSelf: 'flex-start', padding: '10px 24px' }}
                >
                    {saving ? <Loader2 size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                </motion.button>
            </motion.div>
        </div>
    );
}
