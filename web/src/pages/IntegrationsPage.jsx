import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2, Tv, Film, X } from 'lucide-react';
import { api } from '../api/client';

const emptyForm = {
    name: '',
    type: 'sonarr',
    url: '',
    apiKey: '',
    enabled: true,
};

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function loadIntegrations() {
        try {
            const data = await api.listIntegrations();
            setIntegrations(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadIntegrations(); }, []);

    function openAdd() {
        setForm(emptyForm);
        setEditingId(null);
        setTestResult(null);
        setError('');
        setDialogOpen(true);
    }

    function openEdit(integ) {
        setForm({
            name: integ.name,
            type: integ.type,
            url: integ.url,
            apiKey: '', // user must re-enter
            enabled: integ.enabled,
        });
        setEditingId(integ.id);
        setTestResult(null);
        setError('');
        setDialogOpen(true);
    }

    async function handleDelete(id) {
        try {
            await api.deleteIntegration(id);
            loadIntegrations();
        } catch { /* ignore */ }
    }

    async function handleTest() {
        if (!form.url || !form.apiKey) return;
        setTesting(true);
        setTestResult(null);
        try {
            const res = await api.testConnection(form.url, form.apiKey);
            setTestResult(res.success ? 'success' : 'failure');
        } catch {
            setTestResult('failure');
        } finally {
            setTesting(false);
        }
    }

    async function handleSave() {
        if (!form.name || !form.url || !form.apiKey) {
            setError('Name, URL, and API Key are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editingId) {
                await api.updateIntegration(editingId, form);
            } else {
                await api.createIntegration(form);
            }
            setDialogOpen(false);
            loadIntegrations();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    };

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Integrations</h1>
                    <p className="page-subtitle">Connect your Sonarr and Radarr instances</p>
                </div>
                <motion.button
                    className="btn btn-primary"
                    onClick={openAdd}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus size={16} />
                    Add Integration
                </motion.button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
                    Loading integrations...
                </div>
            ) : integrations.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card"
                    style={{
                        padding: 'var(--space-2xl)',
                        textAlign: 'center',
                    }}
                >
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-md)' }}>
                        No integrations configured yet
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        Click "Add Integration" to connect your first Sonarr or Radarr instance
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    className="grid grid-2"
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                >
                    <AnimatePresence>
                        {integrations.map((integ) => (
                            <motion.div
                                key={integ.id}
                                className="glass-card"
                                style={{ padding: 'var(--space-lg)' }}
                                variants={cardVariants}
                                layout
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {integ.type === 'sonarr' ? (
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 'var(--radius-md)',
                                                background: 'rgba(88, 166, 255, 0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Tv size={18} style={{ color: 'var(--status-info)' }} />
                                            </div>
                                        ) : (
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 'var(--radius-md)',
                                                background: 'rgba(210, 153, 34, 0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Film size={18} style={{ color: 'var(--status-warning)' }} />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{integ.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                                {integ.type}
                                            </div>
                                        </div>
                                    </div>

                                    <span className={`badge ${integ.type === 'sonarr' ? 'badge-sonarr' : 'badge-radarr'}`}>
                                        {integ.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                </div>

                                {/* URL */}
                                <div style={{
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-primary)',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: 'var(--font-mono)',
                                    marginBottom: 'var(--space-md)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {integ.url}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(integ)}>
                                        <Pencil size={14} />
                                        Edit
                                    </button>
                                    <button className="btn btn-danger" onClick={() => handleDelete(integ.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                            <Dialog.Title className="dialog-title" style={{ margin: 0 }}>
                                {editingId ? 'Edit Integration' : 'Add Integration'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="btn btn-icon"><X size={18} /></button>
                            </Dialog.Close>
                        </div>

                        {error && (
                            <div style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'rgba(248, 81, 73, 0.1)',
                                border: '1px solid rgba(248, 81, 73, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--status-error)',
                                fontSize: '0.8125rem',
                                marginBottom: 'var(--space-md)',
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="label">Name</label>
                            <input
                                className="input"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="My Sonarr"
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Type</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                {['sonarr', 'radarr'].map((t) => (
                                    <button
                                        key={t}
                                        className={`btn ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setForm({ ...form, type: t })}
                                        style={{ flex: 1, textTransform: 'capitalize' }}
                                    >
                                        {t === 'sonarr' ? <Tv size={14} /> : <Film size={14} />}
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">URL</label>
                            <input
                                className="input"
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="http://sonarr:8989"
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">API Key</label>
                            <input
                                className="input"
                                type="password"
                                value={form.apiKey}
                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                placeholder={editingId ? 'Re-enter API key' : 'API key from Settings → General'}
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label className="label" style={{ margin: 0 }}>Enabled</label>
                            <button
                                className={`btn ${form.enabled ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setForm({ ...form, enabled: !form.enabled })}
                                style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                            >
                                {form.enabled ? 'Yes' : 'No'}
                            </button>
                        </div>

                        {/* Test connection result */}
                        {testResult && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: 'var(--space-sm) var(--space-md)',
                                background: testResult === 'success' ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
                                border: `1px solid ${testResult === 'success' ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.8125rem',
                                color: testResult === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                                marginBottom: 'var(--space-md)',
                            }}>
                                {testResult === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                {testResult === 'success' ? 'Connection successful!' : 'Connection failed'}
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={handleTest}
                                disabled={testing || !form.url || !form.apiKey}
                            >
                                {testing ? <Loader2 size={14} className="spin" /> : null}
                                Test Connection
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
