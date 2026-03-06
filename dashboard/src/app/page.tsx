'use client';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://analysis.seoh.ca/api';

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<any>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_token');
    if (saved) { setToken(saved); fetchAccount(saved); }
  }, []);

  const fetchAccount = async (t: string) => {
    const r = await fetch(`${API_BASE}/account/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) setAccount(await r.json());
    else { localStorage.removeItem('dashboard_token'); setToken(null); }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    });
    const data = await r.json();
    if (r.ok && data.token) {
      localStorage.setItem('dashboard_token', data.token);
      setToken(data.token);
      fetchAccount(data.token);
    } else setError(data.message || 'Login failed');
  };

  const generateKey = async () => {
    const r = await fetch(`${API_BASE}/account/keys`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newKeyLabel || 'API Key' }),
    });
    const data = await r.json();
    if (r.ok) { setNewKeyResult(data); fetchAccount(token!); }
    else setError(data.error || 'Failed to generate key');
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">SEO Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Agency Dashboard</p>
        </div>
        <form onSubmit={login} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Password</label>
            <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 rounded-lg py-2.5 font-medium transition-colors">Sign In</button>
          <p className="text-center text-xs text-gray-500">Don&apos;t have an account? <a href="mailto:alex@00raiser.com" className="text-teal-400">Contact us</a></p>
        </form>
      </div>
    </div>
  );

  const { agency, keys, tierFeatures } = account || {};
  const tierColors: Record<string, string> = { free: 'gray', starter: 'blue', pro: 'purple', agency: 'teal' };
  const tierColor = tierColors[agency?.tier] || 'gray';

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold">SEO Analytics</h1>
          <p className="text-gray-400 text-sm">{agency?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${tierColor}-950 text-${tierColor}-400 border border-${tierColor}-800 uppercase`}>
            {agency?.tier}
          </span>
          <button onClick={() => { localStorage.removeItem('dashboard_token'); setToken(null); setAccount(null); }}
            className="text-gray-400 hover:text-white text-sm">Sign out</button>
        </div>
      </div>

      {/* Usage KPIs */}
      {keys && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Keys', value: keys.filter((k: any) => k.active).length },
            { label: 'Used This Month', value: keys.reduce((s: number, k: any) => s + (k.usage_this_month || 0), 0) },
            { label: 'Monthly Limit', value: keys[0]?.monthly_limit || 0 },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-2xl font-mono font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* API Keys */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">API Keys</h2>
        
        {newKeyResult && (
          <div className="bg-green-950 border border-green-800 rounded-lg p-4 mb-4">
            <p className="text-green-400 text-sm font-semibold mb-2">Key generated — save it now, it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black rounded px-3 py-2 text-sm font-mono text-green-300 break-all">{newKeyResult.raw_key}</code>
              <button onClick={() => copy(newKeyResult.raw_key, 'new')}
                className="bg-green-800 hover:bg-green-700 px-3 py-2 rounded text-xs">
                {copied === 'new' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {keys?.filter((k: any) => k.active).map((key: any) => (
            <div key={key.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{key.label}</span>
                <span className="text-xs text-gray-500">{key.usage_this_month}/{key.monthly_limit} used</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-400 flex-1">{key.key_prefix}••••••••••••••••</code>
                <span className="text-xs text-gray-600">Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
              </div>
              {/* Usage bar */}
              <div className="mt-2 bg-gray-800 rounded-full h-1">
                <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${Math.min(100, (key.usage_this_month / key.monthly_limit) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="Key label (e.g. Production)"
            className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          <button onClick={generateKey} className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Generate Key
          </button>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Quick Start</h2>
        <div className="space-y-3">
          {[
            { label: 'SEO Crawl', code: `curl -X POST https://analysis.seoh.ca/api/crawl/analyze \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
            { label: 'GEO Score', code: `curl -X POST https://analysis.seoh.ca/api/geo/score \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
          ].map(ex => (
            <div key={ex.label}>
              <p className="text-xs text-gray-500 mb-1">{ex.label}</p>
              <div className="relative">
                <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto">{ex.code}</pre>
                <button onClick={() => copy(ex.code, ex.label)} className="absolute top-2 right-2 text-xs text-gray-500 hover:text-white">
                  {copied === ex.label ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Your Plan — {agency?.tier?.toUpperCase()}</h2>
        <div className="grid grid-cols-2 gap-2">
          {tierFeatures && Object.entries(tierFeatures).map(([feature, enabled]) => (
            <div key={feature} className={`flex items-center gap-2 text-sm ${enabled ? 'text-white' : 'text-gray-600'}`}>
              <span>{enabled ? '✓' : '✗'}</span>
              <span className="capitalize">{feature.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        {agency?.tier === 'free' && (
          <div className="mt-4 p-3 bg-teal-950 border border-teal-800 rounded-lg">
            <p className="text-teal-400 text-sm">Upgrade for more analyses and features — <a href="mailto:alex@00raiser.com" className="underline">contact us</a></p>
          </div>
        )}
      </div>
    </div>
  );
}
