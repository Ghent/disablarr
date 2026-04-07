import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Timer, Activity, Tv, Film, Clock, Power, Zap, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSSEData } from '../components/Layout';
import { api } from '../api/client';

const COLORS = ['var(--color-primary)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-warning)'];

function AnimatedNumber({ value, duration = 800 }) {
    const [displayed, setDisplayed] = useState(0);
    useEffect(() => {
        if (value === 0) { setDisplayed(0); return; }
        const start = Date.now();
        const from = displayed;
        function tick() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - (1 - progress) * (1 - progress);
            setDisplayed(Math.round(from + (value - from) * eased));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }, [value]);
    return <span>{displayed}</span>;
}

function formatRelativeTime(isoString) {
    if (!isoString) return '—';
    const diff = (new Date(isoString) - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return diff > 0 ? `in ${Math.round(abs)}s` : `${Math.round(abs)}s ago`;
    if (abs < 3600) return diff > 0 ? `in ${Math.round(abs / 60)}m` : `${Math.round(abs / 60)}m ago`;
    return diff > 0 ? `in ${Math.round(abs / 3600)}h` : `${Math.round(abs / 3600)}h ago`;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

export default function DashboardPage() {
    const sseData = useSSEData();
    const [integrations, setIntegrations] = useState([]);
    const [triggering, setTriggering] = useState(false);
    const engineStatus = sseData?.engineStatus;
    const settings = sseData?.settings;

    useEffect(() => { api.listIntegrations().then(setIntegrations).catch(() => { }); }, []);

    async function handleTrigger() {
        setTriggering(true);
        try { await api.triggerEngine(); } finally {
            setTimeout(() => setTriggering(false), 1500);
        }
    }

    const sonarrCount = integrations.filter((i) => i.type === 'sonarr').length;
    const radarrCount = integrations.filter((i) => i.type === 'radarr').length;
    const totalCount = integrations.length;
    const enabledCount = integrations.filter((i) => i.enabled).length;
    const isRunning = engineStatus?.isRunning;

    const chartData = [
        { name: 'Sonarr', value: sonarrCount || 0 },
        { name: 'Radarr', value: radarrCount || 0 },
    ].filter((d) => d.value > 0);

    return (
        <div className="flex flex-col gap-6">
            <div data-slot="page-header" className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Monitor and control your Disablarr engine</p>
            </div>

            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

                {/* ─── Engine Status Hero ─── */}
                <motion.div
                    variants={fadeUp}
                    data-slot="execution-mode-card"
                    data-active={isRunning}
                    className="relative overflow-hidden rounded-xl border bg-card text-card-foreground p-6 sm:p-8"
                >
                    {/* Subtle inner glow */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none transition-colors duration-500 blur-[40px]"
                         style={{ background: isRunning ? 'oklch(from var(--color-primary) l c h / 0.15)' : 'transparent' }} 
                    />

                    <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">Engine Status</h3>
                            <div className="flex items-center gap-4 mb-6">
                                <motion.div
                                    animate={isRunning ? { rotate: 360 } : {}}
                                    transition={isRunning ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
                                    className="flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300"
                                    style={{
                                        background: isRunning ? 'oklch(from var(--color-primary) l c h / 0.1)' : 'var(--color-muted)',
                                        boxShadow: isRunning ? '0 0 24px oklch(from var(--color-primary) l c h / 0.2)' : 'none',
                                    }}
                                >
                                    {isRunning
                                        ? <Zap size={28} className="text-primary" />
                                        : <Power size={28} className="text-muted-foreground" />
                                    }
                                </motion.div>
                                <div>
                                    <div className={`text-3xl font-extrabold tracking-tight ${isRunning ? 'text-primary' : 'text-foreground'}`}>
                                        {isRunning ? 'Running' : 'Idle'}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        <span className="font-semibold text-primary">{engineStatus?.cycleCount || 0}</span> cycles completed
                                    </div>
                                </div>
                            </div>

                            {/* Timing chips */}
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { icon: Clock, label: 'Last run', value: formatRelativeTime(engineStatus?.lastRunTime) },
                                    { icon: Timer, label: 'Next', value: formatRelativeTime(engineStatus?.nextRunTime) },
                                    { icon: Activity, label: 'Interval', value: `${settings?.intervalMinutes || '—'}m` },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center gap-2 px-3.5 py-1.5 bg-background rounded-full border text-xs font-medium">
                                        <Icon size={14} className="text-primary" />
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="text-foreground">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Run Now button */}
                        <button
                            data-slot="button"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground shadow-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                            onClick={handleTrigger}
                            disabled={triggering}
                        >
                            <Play size={18} />
                            {triggering ? 'Triggered!' : 'Run Now'}
                        </button>
                    </div>
                </motion.div>

                {/* ─── Stats Row ─── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Integrations', value: enabledCount, sub: `${totalCount} total · ${enabledCount} active`, icon: TrendingUp },
                        { title: 'Sonarr', value: sonarrCount, sub: 'TV show instances', icon: Tv },
                        { title: 'Radarr', value: radarrCount, sub: 'Movie instances', icon: Film },
                    ].map((stat) => (
                        <motion.div key={stat.title} variants={fadeUp} data-slot="card" className="relative p-6 rounded-xl border bg-card text-card-foreground">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium leading-none tracking-tight text-muted-foreground">{stat.title}</h3>
                                <div data-slot="stat-icon"><stat.icon size={16} /></div>
                            </div>
                            <div className="text-3xl font-bold tracking-tight mb-1">
                                <AnimatedNumber value={stat.value} />
                            </div>
                            <p className="text-xs text-muted-foreground">{stat.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ─── Bottom Row ─── */}
                <div className={`grid gap-6 ${chartData.length > 0 ? 'md:grid-cols-[320px_1fr]' : 'grid-cols-1'}`}>

                    {/* Donut chart */}
                    {chartData.length > 0 && (
                        <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                            <h3 className="text-sm font-medium leading-none tracking-tight mb-4">Breakdown</h3>
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="value"
                                            animationBegin={200}
                                            animationDuration={800}
                                        >
                                            {chartData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-6">
                                {chartData.map((d, i) => (
                                    <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Activity */}
                    <motion.div variants={fadeUp} data-slot="card" className="p-6 rounded-xl border bg-card text-card-foreground">
                        <h3 className="text-sm font-medium leading-none tracking-tight mb-4">Recent Activity</h3>
                        <div className="bg-background rounded-lg border p-4 max-h-[240px] overflow-auto font-mono text-[11px] sm:text-xs">
                            {sseData?.logs?.length > 0
                                ? sseData.logs.slice(-20).map((line, i) => (
                                    <div key={i} className="whitespace-pre-wrap break-all text-muted-foreground py-0.5">{line}</div>
                                ))
                                : <span className="text-muted-foreground/50 italic">Waiting for engine activity...</span>
                            }
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
