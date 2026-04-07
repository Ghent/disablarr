import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Switch from '@radix-ui/react-switch';
import { Save, Loader2, Check, Palette, Moon, Sun, Monitor } from 'lucide-react';
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

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
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
    const { theme: webTheme, setTheme: setWebTheme, colorMode, setColorMode, themes: webThemes } = useTheme();

    async function fetchSettings() {
        setLoadError('');
        try {
            const s = await api.getSettings();
            setSettings(s);
            setInterval(String(s.intervalMinutes));
            setTuiTheme(s.themeName);
            setDryRun(s.dryRun);
        } catch (err) {
            setLoadError(err.message || 'Failed to load settings.');
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
            await api.updateSettings({ intervalMinutes: mins, themeName: tuiTheme, dryRun });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (!settings && !loadError) {
        return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading settings...</div>;
    }

    if (loadError) {
        return (
            <div className="p-12 text-center">
                <div className="inline-flex flex-col items-center gap-4 p-6 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-destructive font-medium">{loadError}</p>
                    <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors" onClick={fetchSettings}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div data-slot="page-header" className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                <p className="text-muted-foreground">Configure engine behavior and appearance</p>
            </div>

            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

                {/* Interval */}
                <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                    <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">Run Interval</h3>
                    <p className="text-sm text-muted-foreground mb-6">How often the engine checks your integrations (in minutes)</p>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <input
                                className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min="1"
                                value={interval}
                                onChange={(e) => setInterval(e.target.value)}
                            />
                            <span className="text-sm text-muted-foreground">minutes</span>
                        </div>
                        <div className="flex gap-2">
                            {[5, 10, 15, 30, 60].map((v) => (
                                <button
                                    key={v}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        String(v) === interval
                                            ? 'bg-primary text-primary-foreground shadow-sm hover:brightness-105'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                    onClick={() => setInterval(String(v))}
                                >
                                    {v}m
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Dry Run Toggle */}
                <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">Dry Run Mode</h3>
                        <p className="text-sm text-muted-foreground">When enabled, the engine logs what it <em>would</em> do without making changes</p>
                    </div>
                    <Switch.Root
                        className="peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                        checked={dryRun}
                        onCheckedChange={setDryRun}
                    >
                        <Switch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
                    </Switch.Root>
                </motion.div>

                {/* Web UI Appearance (Light/Dark mode) */}
                <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                    <h3 className="text-lg font-semibold leading-none tracking-tight mb-2 flex items-center gap-2">
                        Appearance
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">Light or dark interface</p>
                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                        <button
                            onClick={() => setColorMode('light')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${colorMode === 'light' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-accent'}`}
                        >
                            <Sun className={`mb-2 ${colorMode === 'light' ? 'text-primary' : 'text-muted-foreground'}`} size={24} />
                            <span className={`text-sm font-medium ${colorMode === 'light' ? 'text-foreground' : 'text-muted-foreground'}`}>Light</span>
                        </button>
                        <button
                            onClick={() => setColorMode('dark')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${colorMode === 'dark' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-accent'}`}
                        >
                            <Moon className={`mb-2 ${colorMode === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} size={24} />
                            <span className={`text-sm font-medium ${colorMode === 'dark' ? 'text-foreground' : 'text-muted-foreground'}`}>Dark</span>
                        </button>
                    </div>
                </motion.div>

                {/* Web UI Theme Color */}
                <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                    <h3 className="text-lg font-semibold leading-none tracking-tight mb-2 flex items-center gap-2">
                        <Palette size={18} className="text-primary" /> Accent Color
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">Choose an accent color for the web interface</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {webThemes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setWebTheme(t.id)}
                                className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${webTheme === t.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-accent'}`}
                            >
                                <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: t.preview[0] }} />
                                <span className={`text-xs font-medium ${webTheme === t.id ? 'text-primary' : 'text-muted-foreground'}`}>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* TUI Theme */}
                <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                    <h3 className="text-lg font-semibold leading-none tracking-tight mb-2 flex items-center gap-2">
                        <Monitor size={18} className="text-primary" /> SSH Theme
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">Theme for the SSH terminal UI</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {TUI_THEMES.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setTuiTheme(t.name)}
                                className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${tuiTheme === t.name ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-accent'}`}
                            >
                                <div className="flex -space-x-1">
                                    {t.colors.map((c, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border border-background shadow-sm z-10" style={{ background: c }} />
                                    ))}
                                </div>
                                <span className={`text-xs font-medium ${tuiTheme === t.name ? 'text-primary' : 'text-muted-foreground'}`}>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Error Box */}
                {error && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg font-medium">
                        {error}
                    </motion.div>
                )}

                {/* Save Button */}
                <motion.button
                    data-slot="button"
                    className="inline-flex items-center justify-center gap-2 self-start px-6 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                </motion.button>
            </motion.div>
        </div>
    );
}
