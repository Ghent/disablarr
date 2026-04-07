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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Animated mesh background for login page */}
            <div className="absolute inset-0 z-0">
                <div data-slot="page-header" className="absolute inset-0 opacity-80" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                data-slot="login-card"
                className="w-full max-w-[420px] p-8 sm:p-10 rounded-2xl bg-card border text-card-foreground relative z-10"
            >
                {/* Logo */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                        data-slot="login-icon"
                        className="w-16 h-16 rounded-[1.25rem] bg-primary mx-auto mb-6 flex items-center justify-center transition-shadow duration-300"
                    >
                        <Power size={32} strokeWidth={2.5} className="text-primary-foreground" />
                    </motion.div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
                        Disablarr
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in to manage your media automation
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg"
                        >
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5" htmlFor="password">
                            <Lock size={14} className="text-muted-foreground" />
                            Master Key
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your DISABLARR_MASTER_KEY"
                            autoComplete="current-password"
                            autoFocus
                            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <motion.button
                        type="submit"
                        data-slot="button"
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 mt-2 h-11 px-4 py-2 w-full text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                <Loader2 size={18} className="text-primary-foreground" />
                            </motion.div>
                        ) : (
                            <>
                                <Power size={18} />
                                Sign In
                            </>
                        )}
                    </motion.button>
                </form>

                <p className="text-center text-xs text-muted-foreground/80 mt-8 tracking-wide">
                    Use your DISABLARR_MASTER_KEY as the password
                </p>
            </motion.div>
        </div>
    );
}
