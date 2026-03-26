import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Power, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--space-lg)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated ambient orbs */}
            <div className="ambient-bg">
                <motion.div
                    className="ambient-orb"
                    animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        top: '15%',
                        left: '25%',
                        width: 400,
                        height: 400,
                        background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)',
                    }}
                />
                <motion.div
                    className="ambient-orb"
                    animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        bottom: '10%',
                        right: '15%',
                        width: 500,
                        height: 500,
                        background: `radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent 70%)`,
                    }}
                />
                <motion.div
                    className="ambient-orb"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 300,
                        height: 300,
                        background: `radial-gradient(circle, rgba(0, 229, 200, 0.08), transparent 70%)`,
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card-glow"
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    padding: 'var(--space-2xl)',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
                    style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}
                >
                    <motion.div
                        animate={{ boxShadow: ['0 0 20px var(--accent-glow)', '0 0 40px var(--accent-glow)', '0 0 20px var(--accent-glow)'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--accent-1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--space-md)',
                        }}
                    >
                        <Power size={32} color="var(--text-inverse)" strokeWidth={2.5} />
                    </motion.div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: 'var(--accent-1)',
                    }}>
                        Disablarr
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        marginTop: 'var(--space-xs)',
                    }}>
                        Sign in to manage your media automation
                    </p>
                </motion.div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'rgba(255, 56, 96, 0.1)',
                                border: '1px solid rgba(255, 56, 96, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--status-error)',
                                fontSize: '0.8125rem',
                                marginBottom: 'var(--space-md)',
                                boxShadow: '0 0 16px rgba(255, 56, 96, 0.1)',
                            }}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <div className="form-group">
                        <label className="label" htmlFor="password">
                            <Lock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Master Key
                        </label>
                        <input
                            id="password"
                            className="input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your DISABLARR_MASTER_KEY"
                            autoComplete="current-password"
                            autoFocus
                        />
                    </div>

                    <motion.button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: '0.9375rem',
                            marginTop: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        {loading ? (
                            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                ⟳
                            </motion.span>
                        ) : (
                            <>
                                <Power size={16} />
                                Sign In
                            </>
                        )}
                    </motion.button>
                </form>

                <p style={{
                    textAlign: 'center',
                    fontSize: '0.6875rem',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--space-lg)',
                    letterSpacing: '0.02em',
                }}>
                    Use your DISABLARR_MASTER_KEY as the password
                </p>
            </motion.div>
        </div>
    );
}
