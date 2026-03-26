import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';

export default function StatusBadge({ dryRun, onToggle }) {
    const isDryRun = dryRun === true;
    const [toggling, setToggling] = useState(false);

    async function handleClick() {
        if (toggling) return;
        setToggling(true);
        try {
            await api.updateSettings({ dryRun: !isDryRun });
            if (onToggle) onToggle(!isDryRun);
        } catch {
            // SSE will sync state
        } finally {
            setTimeout(() => setToggling(false), 500);
        }
    }

    return (
        <motion.button
            layout
            onClick={handleClick}
            disabled={toggling}
            className={`badge ${isDryRun ? 'badge-dry-run' : 'badge-live'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 12px',
                cursor: 'pointer',
                opacity: toggling ? 0.6 : 1,
                transition: 'opacity 200ms ease',
                fontSize: '0.8125rem',
            }}
        >
            <motion.span
                className={`pulse-dot ${isDryRun ? 'pulse-dot-ok' : 'pulse-dot-live'}`}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {toggling ? '...' : isDryRun ? 'DRY RUN' : '● LIVE'}
        </motion.button>
    );
}
