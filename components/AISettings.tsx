import React, { useEffect, useState } from 'react';
import { workspaceApi } from '../services/api';

type Provider = 'openrouter' | 'openai' | 'anthropic' | 'gemini';

interface AIConfig {
  aiProvider: Provider | null;
  aiModel: string | null;
  hasApiKey: boolean;
}

// Mantener alineado con DEFAULT_MODELS / MINI_MODELS en
// server/src/services/aiClient.ts. Los slugs de OpenRouter están verificados
// contra https://openrouter.ai/api/v1/models.
const PROVIDERS: { id: Provider; label: string; placeholder: string; models: string[] }[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    placeholder: 'sk-or-...',
    models: [
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-sonnet-5',
      'anthropic/claude-opus-4.6',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    models: ['claude-sonnet-4-6', 'claude-sonnet-5', 'claude-opus-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  },
];

export default function AISettings() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    workspaceApi.getAIConfig().then((data: AIConfig) => {
      setConfig(data);
      if (data.aiProvider) setProvider(data.aiProvider);
      if (data.aiModel) setModel(data.aiModel);
    }).catch(() => {});
  }, []);

  const selectedProvider = PROVIDERS.find(p => p.id === provider)!;

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await workspaceApi.updateAIConfig({
        aiProvider: provider,
        aiApiKey: apiKey || undefined,
        // Always send aiModel (even "") so switching provider without picking a
        // model clears the old value server-side instead of leaving it stale —
        // `JSON.stringify` drops `undefined` keys, so `|| undefined` here would
        // silently skip the update and keep the previous provider's model string.
        aiModel: model,
      });
      setApiKey('');
      setConfig(prev => prev ? { ...prev, aiProvider: provider, aiModel: model || null, hasApiKey: true } : prev);
      setStatus({ ok: true, msg: 'Configuración guardada' });
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('¿Eliminar la API key? El sistema usará la clave del servidor.')) return;
    setSaving(true);
    try {
      await workspaceApi.updateAIConfig({ aiProvider: undefined, aiApiKey: '', aiModel: undefined });
      setConfig(prev => prev ? { ...prev, aiProvider: null, hasApiKey: false } : prev);
      setProvider('openai');
      setModel('');
      setStatus({ ok: true, msg: 'Configuración eliminada' });
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1D1D1F', margin: '0 0 6px' }}>
          Proveedor de IA
        </h2>
        <p style={{ fontSize: 14, color: '#6E6E73', margin: 0 }}>
          Configurá tu propia API key para controlar costos y modelo. Sin configuración, se usa la clave del servidor.
        </p>
      </div>

      {config?.hasApiKey && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 13,
          color: '#15803D',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          API key activa · proveedor: <strong>{config.aiProvider}</strong>
          {config.aiModel && <> · modelo: <strong>{config.aiModel}</strong></>}
          <button
            onClick={handleClear}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#6E6E73', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Eliminar
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Proveedor</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => { setProvider(p.id); setModel(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: provider === p.id ? '1.5px solid #0071E3' : '1px solid rgba(0,0,0,0.1)',
                  background: provider === p.id ? '#EFF6FF' : '#fff',
                  color: provider === p.id ? '#0071E3' : '#1D1D1F',
                  fontSize: 13,
                  fontWeight: provider === p.id ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>API Key</label>
          <input
            className="apple-input"
            type="password"
            placeholder={config?.hasApiKey ? '••••••••••••  (nueva clave para reemplazar)' : selectedProvider.placeholder}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 12, color: '#6E6E73', margin: '4px 0 0' }}>
            La clave se guarda cifrada y nunca se devuelve al cliente.
          </p>
        </div>

        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>
            Modelo <span style={{ fontWeight: 400, color: '#6E6E73' }}>(opcional — deja vacío para usar el predeterminado)</span>
          </label>
          <select
            className="apple-input"
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <option value="">Predeterminado</option>
            {selectedProvider.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {status && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: status.ok ? '#F0FDF4' : '#FFF1F2',
            border: `1px solid ${status.ok ? '#BBF7D0' : '#FECDD3'}`,
            color: status.ok ? '#15803D' : '#BE123C',
            fontSize: 13,
          }}>
            {status.msg}
          </div>
        )}

        <button
          className="apple-btn-primary"
          onClick={handleSave}
          disabled={saving || (!apiKey && !model)}
          style={{ alignSelf: 'flex-start' }}
        >
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: '#F5F5F7', borderRadius: 10, fontSize: 13, color: '#6E6E73' }}>
        <strong style={{ color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Modelos predeterminados</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>OpenRouter — Writer: <code>google/gemini-2.5-flash</code> · Critic/Fixer: <code>google/gemini-2.5-flash-lite</code></span>
          <span>OpenAI — Writer: <code>gpt-4o</code> · Critic/Fixer: <code>gpt-4o-mini</code></span>
          <span>Anthropic — Writer: <code>claude-sonnet-4-6</code> · Critic/Fixer: <code>claude-haiku-4-5</code></span>
          <span>Gemini — Writer: <code>gemini-2.5-flash</code> · Critic/Fixer: <code>gemini-2.5-flash-lite</code></span>
        </div>
      </div>
    </div>
  );
}
