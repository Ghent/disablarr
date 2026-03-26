import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ArrowDown, Pause, Play, Search } from 'lucide-react';
import { useSSEData } from '../components/Layout';

export default function LogsPage() {
    const sseData = useSSEData();
    const logs = sseData?.logs || [];
    const clearLogs = sseData?.clearLogs;
    const containerRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [filter, setFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    function handleScroll() {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
        setAutoScroll(isAtBottom);
    }

    const filteredLogs = logs.filter((line) => {
        if (filter && !line.toLowerCase().includes(filter.toLowerCase())) return false;
        if (levelFilter === 'error' && !line.toLowerCase().includes('"level":"error"') && !line.toLowerCase().includes('error')) return false;
        if (levelFilter === 'warn' && !line.toLowerCase().includes('"level":"warn"') && !line.toLowerCase().includes('warn')) return false;
        if (levelFilter === 'info' && !line.toLowerCase().includes('"level":"info"') && !line.toLowerCase().includes('info')) return false;
        return true;
    });

    function getLogClass(line) {
        const lower = line.toLowerCase();
        if (lower.includes('"level":"error"') || lower.includes('error')) return 'log-error';
        if (lower.includes('"level":"warn"') || lower.includes('warn')) return 'log-warn';
        return 'log-info';
    }

    return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)' }}>
            <div className="page-header" style={{ flexShrink: 0 }}>
                <h1 className="page-title">Logs</h1>
                <p className="page-subtitle">Real-time engine output via SSE streaming</p>
            </div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                    flexShrink: 0,
                    flexWrap: 'wrap',
                }}
            >
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={14} style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)',
                    }} />
                    <input
                        className="input"
                        placeholder="Filter logs..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ paddingLeft: 34 }}
                    />
                </div>

                {/* Level filter pills */}
                {['all', 'info', 'warn', 'error'].map((level) => (
                    <button
                        key={level}
                        className={`btn ${levelFilter === level ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setLevelFilter(level)}
                        style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                        {level}
                    </button>
                ))}

                {/* Auto-scroll toggle */}
                <button
                    className={`btn ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAutoScroll(!autoScroll)}
                    title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
                >
                    {autoScroll ? <ArrowDown size={14} /> : <Pause size={14} />}
                </button>

                {/* Clear */}
                <button
                    className="btn btn-danger"
                    onClick={clearLogs}
                    title="Clear logs"
                >
                    <Trash2 size={14} />
                </button>
            </motion.div>

            {/* Log viewer */}
            <div
                ref={containerRef}
                className="terminal"
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                }}
            >
                {filteredLogs.length === 0 ? (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                        {logs.length === 0
                            ? 'Waiting for log entries...'
                            : 'No logs match the current filter'}
                    </span>
                ) : (
                    filteredLogs.map((line, i) => (
                        <motion.div
                            key={i}
                            initial={i >= filteredLogs.length - 5 ? { opacity: 0, x: -8 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                            className={getLogClass(line)}
                            style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                paddingBottom: 1,
                                borderBottom: '1px solid rgba(48, 54, 61, 0.2)',
                            }}
                        >
                            {line}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Status bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-sm) 0',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                flexShrink: 0,
            }}>
                <span>{filteredLogs.length} / {logs.length} entries</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {autoScroll ? (
                        <>
                            <Play size={10} />
                            Auto-scroll
                        </>
                    ) : (
                        <>
                            <Pause size={10} />
                            Paused
                        </>
                    )}
                </span>
            </div>
        </div>
    );
}
