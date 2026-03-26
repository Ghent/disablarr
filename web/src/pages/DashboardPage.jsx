import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Timer, Activity, Tv, Film, Clock, Power, Zap, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSSEData } from '../components/Layout';
import { api } from '../api/client';

const COLORS = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--status-warning)'];

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
    }, [value]); // eslint-disable-line
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
    hidden: { opacity: 0, y: 24 },
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
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Monitor and control your Disablarr engine</p>
            </div>

            <motion.div variants={stagger} initial="hidden" animate="show">

                {/* ─── Engine Status Hero ─── */}
                <motion.div
                    variants={fadeUp}
                    className="glass-card-glow"
                    style={{
                        padding: 'var(--space-xl)',
                        marginBottom: 'var(--space-lg)',
                        position: 'relative',
                    }}
                >
                    {/* Subtle inner glow */}
                    <div style={{
                        position: 'absolute',
                        top: -40,
                        right: -40,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${isRunning ? 'var(--accent-glow)' : 'transparent'}, transparent 70%)`,
                        filter: 'blur(40px)',
                        pointerEvents: 'none',
                        transition: 'background 500ms ease',
                    }} />

                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-lg)', alignItems: 'center' }}>
                        <div>
                            <div className="section-title">Engine Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                <motion.div
                                    animate={isRunning ? { rotate: 360 } : {}}
                                    transition={isRunning ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 'var(--radius-lg)',
                                        background: isRunning
                                            ? 'linear-gradient(135deg, rgba(6, 255, 165, 0.2), rgba(0, 212, 255, 0.2))'
                                            : 'var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isRunning ? '0 0 24px rgba(6, 255, 165, 0.2)' : 'none',
                                        transition: 'all 300ms ease',
                                    }}
                                >
                                    {isRunning
                                        ? <Zap size={26} style={{ color: 'var(--accent-3)' }} />
                                        : <Power size={26} style={{ color: 'var(--text-tertiary)' }} />
                                    }
                                </motion.div>
                                <div>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        color: isRunning ? 'var(--accent-3)' : 'var(--text-primary)',
                                    }}>
                                        {isRunning ? 'Running' : 'Idle'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--accent-1)', fontWeight: 600 }}>{engineStatus?.cycleCount || 0}</span> cycles completed
                                    </div>
                                </div>
                            </div>

                            {/* Timing chips */}
                            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                {[
                                    { icon: Clock, label: 'Last run', value: formatRelativeTime(engineStatus?.lastRunTime) },
                                    { icon: Timer, label: 'Next', value: formatRelativeTime(engineStatus?.nextRunTime) },
                                    { icon: Activity, label: 'Interval', value: `${settings?.intervalMinutes || '—'}m` },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 14px',
                                        background: 'var(--bg-primary)',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid var(--border-default)',
                                        fontSize: '0.8125rem',
                                    }}>
                                        <Icon size={13} style={{ color: 'var(--accent-1)' }} />
                                        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Run Now button */}
                        <motion.button
                            className="btn btn-primary"
                            onClick={handleTrigger}
                            disabled={triggering}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                            style={{ padding: '14px 28px', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)' }}
                        >
                            <Play size={18} />
                            {triggering ? 'Triggered!' : 'Run Now'}
                        </motion.button>
                    </div>
                </motion.div>

                {/* ─── Stats Row ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                    {[
                        { title: 'Integrations', value: enabledCount, sub: `${totalCount} total · ${enabledCount} active`, icon: TrendingUp, iconColor: 'var(--accent-1)' },
                        { title: 'Sonarr', value: sonarrCount, sub: 'TV show instances', icon: Tv, iconColor: 'var(--status-info)' },
                        { title: 'Radarr', value: radarrCount, sub: 'Movie instances', icon: Film, iconColor: 'var(--status-warning)' },
                    ].map((stat) => (
                        <motion.div key={stat.title} variants={fadeUp} className="glass-card stat-card">
                            <div className="section-title">{stat.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                                <stat.icon size={22} style={{ color: stat.iconColor, opacity: 0.8 }} />
                                <span className="stat-value"><AnimatedNumber value={stat.value} /></span>
                            </div>
                            <div className="stat-label">{stat.sub}</div>
                        </motion.div>
                    ))}
                </div>

                {/* ─── Bottom Row ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: chartData.length > 0 ? '280px 1fr' : '1fr', gap: 'var(--space-lg)' }}>

                    {/* Donut chart */}
                    {chartData.length > 0 && (
                        <motion.div variants={fadeUp} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                            <div className="section-title">Breakdown</div>
                            <div style={{ width: '100%', height: 160, marginTop: 'var(--space-sm)' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={65}
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
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                                {chartData.map((d, i) => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Activity */}
                    <motion.div variants={fadeUp} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                        <div className="section-title">Recent Activity</div>
                        <div className="terminal" style={{ maxHeight: 220, overflow: 'auto', marginTop: 'var(--space-sm)' }}>
                            {sseData?.logs?.length > 0
                                ? sseData.logs.slice(-20).map((line, i) => (
                                    <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</div>
                                ))
                                : <span style={{ color: 'var(--text-tertiary)' }}>Waiting for engine activity...</span>
                            }
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
