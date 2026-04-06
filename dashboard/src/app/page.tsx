'use client';
import { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://analysis.seoh.ca/api';

// ─── Tier helpers ─────────────────────────────────────────────────────────────
const TIER_ORDER = ['free', 'starter', 'pro', 'agency'];
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Analysis:   { bg: 'bg-teal-950',   text: 'text-teal-400',   border: 'border-teal-800' },
  Monitoring: { bg: 'bg-orange-950', text: 'text-orange-400', border: 'border-orange-800' },
  Admin:      { bg: 'bg-red-950',    text: 'text-red-500 dark:text-red-400',    border: 'border-red-800' },
  Billing:    { bg: 'bg-purple-950', text: 'text-purple-400', border: 'border-purple-800' },
  Auth:       { bg: 'bg-blue-950',   text: 'text-blue-400',   border: 'border-blue-800' },
};
const CATEGORY_ICONS: Record<string, string> = {
  Analysis:   '🔍',
  Monitoring: '📡',
  Admin:      '⚙️',
  Billing:    '💳',
  Auth:       '🔐',
};
function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: 'bg-gray-900', text: 'text-[var(--text-secondary)]', border: 'border-gray-700' };
}
function tierLabel(tier: string) {
  if (!tier || tier === 'free') return 'Free+';
  if (tier === 'starter') return 'Starter+';
  if (tier === 'pro') return 'Pro+';
  if (tier === 'agency') return 'Agency only';
  return tier;
}
function tierColor(tier: string) {
  return {
    free:    'bg-gray-800 text-gray-300',
    starter: 'bg-blue-950 text-blue-300',
    pro:     'bg-purple-950 text-purple-300',
    agency:  'bg-teal-950 text-teal-300',
  }[tier] || 'bg-gray-800 text-gray-300';
}
function userCanAccess(featureTier: string, userTier: string) {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(featureTier || 'free');
}

// ─── Feature types ────────────────────────────────────────────────────────────
interface FeatureItem {
  name: string;
  description: string;
  category: string;
  tier: string;
  method: string;
  endpoint: string;
  curl_example: string;
  request_example?: any;
  response_example?: any;
  added_at?: string;
  tags?: string[];
}

// ─── Details Modal ────────────────────────────────────────────────────────────
function FeatureModal({ feature, onClose, apiKey }: { feature: FeatureItem; onClose: () => void; apiKey?: string }) {
  const [copied, setCopied] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };
  const catStyle = getCategoryColor(feature.category);
  const curlWithKey = feature.curl_example?.replace('YOUR_KEY', apiKey || 'YOUR_KEY');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CATEGORY_ICONS[feature.category] || '📌'}</span>
            <div>
              <h2 className="text-lg font-bold">{feature.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catStyle.bg} ${catStyle.text}`}>
                  {feature.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColor(feature.tier)}`}>
                  {tierLabel(feature.tier)}
                </span>
                {feature.added_at && new Date(feature.added_at) > new Date(Date.now() - 7 * 86400000) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-950 text-green-400 font-medium">New</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl leading-none mt-1">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-sm text-gray-300 leading-relaxed">{feature.description}</p>

          {/* Endpoint */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Endpoint</h3>
            <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-4 py-3">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${feature.method === 'GET' ? 'bg-teal-900 text-teal-400' : 'bg-orange-900 text-orange-400'}`}>
                {feature.method}
              </span>
              <code className="text-sm font-mono text-gray-300 flex-1">{feature.endpoint}</code>
            </div>
          </div>

          {/* Required headers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Required Headers</h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-4 py-3">
              <code className="text-sm font-mono text-gray-300">X-Api-Key: YOUR_KEY</code>
            </div>
          </div>

          {/* Curl */}
          {curlWithKey && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">cURL Example</h3>
              <div className="relative">
                <pre className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{curlWithKey}</pre>
                <button onClick={() => copy(curlWithKey, 'curl-modal')}
                  className="absolute top-2 right-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded">
                  {copied === 'curl-modal' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Request example */}
          {feature.request_example && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Request Body</h3>
              <div className="relative">
                <pre className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto">
                  {JSON.stringify(feature.request_example, null, 2)}
                </pre>
                <button onClick={() => copy(JSON.stringify(feature.request_example, null, 2), 'req')}
                  className="absolute top-2 right-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded">
                  {copied === 'req' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Response example */}
          {feature.response_example && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Response Example</h3>
              <div className="relative">
                <pre className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto">
                  {JSON.stringify(feature.response_example, null, 2)}
                </pre>
                <button onClick={() => copy(JSON.stringify(feature.response_example, null, 2), 'res')}
                  className="absolute top-2 right-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] px-2 py-1 rounded">
                  {copied === 'res' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Added date */}
          {feature.added_at && (
            <p className="text-xs text-gray-600">Added: {new Date(feature.added_at).toLocaleDateString('en-CA')}</p>
          )}

          {/* Docs link */}
          <div className="pt-2 border-t border-[var(--border-primary)]">
            <a href="https://docs.seoh.ca" target="_blank" rel="noopener noreferrer"
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
              View full documentation →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, onLearnMore, onCopy, copied, userTier, apiKey }: {
  feature: FeatureItem;
  onLearnMore: () => void;
  onCopy: (text: string, id: string) => void;
  copied: string;
  userTier: string;
  apiKey?: string;
}) {
  const catStyle = getCategoryColor(feature.category);
  const accessible = userCanAccess(feature.tier, userTier);
  const isNew = feature.added_at && new Date(feature.added_at) > new Date(Date.now() - 7 * 86400000);
  const curlId = `curl-${feature.endpoint}`;
  const curlText = feature.curl_example?.replace('YOUR_KEY', apiKey || 'YOUR_KEY') || '';

  return (
    <div className={`bg-[var(--bg-secondary)] border rounded-xl p-4 flex flex-col gap-3 transition-all ${accessible ? 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]' : 'border-[var(--border-primary)] opacity-60'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{CATEGORY_ICONS[feature.category] || '📌'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">{feature.name}</span>
            {isNew && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-950 text-green-400 font-medium whitespace-nowrap">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{feature.description}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
          {feature.category}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColor(feature.tier)}`}>
          {tierLabel(feature.tier)}
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${feature.method === 'GET' ? 'bg-teal-900/50 text-teal-400' : 'bg-orange-900/50 text-orange-400'}`}>
          {feature.method}
        </span>
      </div>

      {/* Curl snippet */}
      {curlText && (
        <div className="relative">
          <pre className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-2.5 text-[10px] font-mono text-[var(--text-secondary)] overflow-x-hidden whitespace-nowrap overflow-hidden text-ellipsis">
            {curlText.split('\n')[0]}
          </pre>
          <button
            onClick={() => onCopy(curlText, curlId)}
            className="absolute top-1.5 right-1.5 text-[10px] text-gray-600 hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded transition-colors">
            {copied === curlId ? '✓' : 'Copy'}
          </button>
        </div>
      )}

      {/* Added date */}
      {feature.added_at && (
        <p className="text-[10px] text-gray-600">Added: {new Date(feature.added_at).toLocaleDateString('en-CA')}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {accessible ? (
          <button
            onClick={onLearnMore}
            className="flex-1 bg-[var(--bg-secondary)] hover:bg-[#222] border border-[var(--border-secondary)] hover:border-teal-800 text-xs font-medium py-1.5 rounded-lg transition-colors">
            Learn More
          </button>
        ) : (
          <div className="flex-1 text-center text-[10px] text-gray-600 py-1.5">
            Requires {tierLabel(feature.tier)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
function FeaturesSection({ token, userTier, apiKey }: { token: string; userTier: string; apiKey?: string }) {
  const [features, setFeatures] = useState<FeatureItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [copied, setCopied] = useState('');
  const cacheRef = useRef<FeatureItem[] | null>(null);

  useEffect(() => {
    if (cacheRef.current) { setFeatures(cacheRef.current); return; }
    setLoading(true); setError('');
    fetch(`${API_BASE}/account/features`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'X-Api-Key': apiKey || '' },
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Unable to load features');
        const arr: FeatureItem[] = Array.isArray(d) ? d : (d.features || []);
        cacheRef.current = arr;
        setFeatures(arr);
      })
      .catch(e => setError(e.message || 'Unable to load features'))
      .finally(() => setLoading(false));
  }, [token, apiKey]);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  // Sort: by category alpha, then tier, then name
  const sorted = (features || []).slice().sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    const ta = TIER_ORDER.indexOf(a.tier); const tb = TIER_ORDER.indexOf(b.tier);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const filtered = sorted.filter(f => {
    const q = search.toLowerCase();
    if (q && !f.name.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q) && !f.endpoint.toLowerCase().includes(q)) return false;
    if (filterCat && f.category !== filterCat) return false;
    if (filterTier && f.tier !== filterTier) return false;
    return true;
  });

  const categories = Array.from(new Set((features || []).map(f => f.category))).sort();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">All Features</h2>
        {features && (
          <span className="text-xs text-gray-600">{filtered.length} of {features.length} APIs</span>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search APIs…"
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 font-mono"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-gray-300">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterTier}
          onChange={e => setFilterTier(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-gray-300">
          <option value="">All Tiers</option>
          {TIER_ORDER.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}
        </select>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center text-[var(--text-secondary)] text-sm">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Fetching your features...
        </div>
      )}
      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length === 0 && features !== null && (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          {search || filterCat || filterTier ? 'No APIs match your filters.' : 'No features available.'}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(f => (
            <FeatureCard
              key={f.endpoint}
              feature={f}
              onLearnMore={() => setSelectedFeature(f)}
              onCopy={copy}
              copied={copied}
              userTier={userTier}
              apiKey={apiKey}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedFeature && (
        <FeatureModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          apiKey={apiKey}
        />
      )}
    </div>
  );
}

function PricingCard({ tier, price, analyses, features, currentTier, onUpgrade }: {
  tier: string; price: string; analyses: string; features: string[];
  currentTier: string; onUpgrade: () => void;
}) {
  const isCurrent = tier === currentTier;
  const isDowngrade = ['free','starter','pro','agency'].indexOf(tier) < ['free','starter','pro','agency'].indexOf(currentTier);
  return (
    <div className={`bg-[var(--bg-secondary)] border rounded-xl p-5 ${isCurrent ? 'border-teal-500' : 'border-[var(--border-primary)]'}`}>
      {isCurrent && <div className="text-xs text-teal-400 font-semibold uppercase mb-2">Current Plan</div>}
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold">{price}</span>
        {price !== '$0' && <span className="text-[var(--text-secondary)] text-sm mb-1">/mo</span>}
      </div>
      <div className="text-sm font-medium capitalize mb-1">{tier}</div>
      <div className="text-xs text-[var(--text-secondary)] mb-4">{analyses} analyses/month</div>
      <ul className="space-y-1 mb-4">
        {features.map(f => <li key={f} className="text-xs text-[var(--text-secondary)]">✓ {f}</li>)}
      </ul>
      {!isCurrent && !isDowngrade && (
        <button onClick={onUpgrade} className="w-full bg-teal-600 hover:bg-teal-700 rounded-lg py-2 text-sm font-medium transition-colors">Upgrade</button>
      )}
      {isDowngrade && <div className="text-xs text-gray-600 text-center">Contact us to downgrade</div>}
    </div>
  );
}

function ScoreRing({ score, max = 100, color = '#14b8a6', size = 80 }: { score: number; max?: number; color?: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, (score / max) * 100);
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fill="white" fontSize={size > 70 ? "18" : "13"} fontWeight="bold">{score}</text>
    </svg>
  );
}

function AnalyzeSection({ token, userTier = "free" }: { token: string; userTier?: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [seo, setSeo] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [aeo, setAeo] = useState<any>(null);
  const [kw, setKw] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'seo'|'geo'|'aeo'|'keywords'|'social'|'competitors'|'airecs'>('seo');
  const [aiRecs, setAiRecs] = useState<any>(null);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecsError, setAiRecsError] = useState<string|null>(null);
  const [aiRecsUpgrade, setAiRecsUpgrade] = useState(false);
  const [social, setSocial] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string|null>(null);
  const [competitors, setCompetitors] = useState<any>(null);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [competitorsError, setCompetitorsError] = useState<string|null>(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(''); setSeo(null); setGeo(null); setAeo(null); setKw(null); setSocial(null); setCompetitors(null);
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const body = JSON.stringify({ url: url.trim() });
    try {
      const settled = await Promise.allSettled([
        fetch(`${API_BASE}/crawl/analyze`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/geo/score`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/keywords/analyze`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/aeo/score`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/social/score`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/ai-recommendations/analyze`, { method: 'POST', headers, body: JSON.stringify({ url: seo?.url || url, seo: seo || {}, geo: geo || {} }) }),
      ]);
      const getR = (i: number) => settled[i].status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<Response>).value : null;
      const [r1, r2, r3, r4, r5, r6] = [0,1,2,3,4,5].map(getR) as Response[];
      const safeJson = async (r: Response | null) => { if (!r) return null; try { return await r.json(); } catch { return null; } };
      const [d1, d2, d3, d4, d5, d6] = await Promise.all([safeJson(r1), safeJson(r2), safeJson(r3), safeJson(r4), safeJson(r5), safeJson(r6)]);
      if (!r1.ok) throw new Error(d1.error || 'SEO analysis failed');
      setSeo(d1); setGeo(d2); setKw(d3);
      if (r4?.ok) setAeo(d4);
      if (r5?.ok) setSocial(d5);
      if (r6?.ok) setAiRecs(d6);
      setTab('seo');
    } catch (e: any) { setError(e.message || 'Analysis failed'); }
    setLoading(false);
  };

  const geoColor = (g: string) => ({ A: '#22c55e', B: '#14b8a6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[g] || '#ef4444');
  const aeoColor = (g: string) => ({ A: '#22c55e', B: '#14b8a6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[g] || '#ef4444');
  const seoColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Analyze a Website</h2>
      <div className="flex gap-2 mb-4">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="https://example.com"
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 font-mono" />
        <button onClick={run} disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          {loading ? 'Analyzing…' : 'Run Analysis'}
        </button>
      </div>
      {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-3 py-2 mb-4">{error}</p>}
      {loading && (
        <div className="flex items-center gap-3 py-10 justify-center text-[var(--text-secondary)] text-sm">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Running SEO crawl, GEO scoring, AEO analysis, and keyword indexing…
        </div>
      )}
      {seo && geo && (
        <>
          {/* Score overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 flex items-center gap-4">
              <ScoreRing score={seo.seoScore} color={seoColor(seo.seoScore)} size={72} />
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">SEO Score</p>
                <p className="text-lg font-bold">{seo.seoScore >= 80 ? 'Good' : seo.seoScore >= 60 ? 'Fair' : 'Needs Work'}</p>
                <p className="text-xs text-[var(--text-muted)] truncate" title={seo.url}>{seo.url}</p>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 flex items-center gap-4">
              <ScoreRing score={geo.geoScore} color={geoColor(geo.grade)} size={72} />
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">GEO / AI Score</p>
                <p className="text-lg font-bold">Grade {geo.grade}</p>
                <p className="text-xs text-[var(--text-muted)]">{geo.grading}</p>
              </div>
            </div>
            {aeo && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 flex items-center gap-4">
                <ScoreRing score={aeo.aeoScore} color={aeoColor(aeo.grade)} size={72} />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">AEO Score</p>
                  <p className="text-lg font-bold">Grade {aeo.grade}</p>
                  <p className="text-xs text-[var(--text-muted)]">{aeo.grading}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 mb-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-1">
            {(['seo', 'geo', 'aeo', 'keywords', 'social', 'competitors', 'airecs'] as const).map(t => (
              <button key={t} onClick={() => {
                setTab(t);

              }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-teal-600 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                {t === 'geo' ? 'GEO / AI' : t === 'seo' ? 'SEO' : t === 'airecs' ? 'AI Recs' : t === 'aeo' ? 'AEO' : t === 'social' ? 'Social' : t === 'competitors' ? 'Competitors' : 'Keywords'}
              </button>
            ))}
          </div>

          {/* SEO tab */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Page Meta</h3>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Title <span className="text-gray-600">({seo.titleLength} chars)</span></p>
                  <p className="text-sm text-gray-200">{seo.title}</p>
                </div>
                {seo.metaDescription && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">
                      Meta Description&nbsp;
                      <span className={seo.metaDescriptionLength > 160 ? 'text-amber-400' : 'text-gray-600'}>
                        ({seo.metaDescriptionLength} chars{seo.metaDescriptionLength > 160 ? ' — too long' : ''})
                      </span>
                    </p>
                    <p className="text-sm text-gray-300 line-clamp-2">{seo.metaDescription}</p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 pt-1">
                  {[
                    { label: 'HTTPS', ok: seo.isHttps },
                    { label: 'Mobile', ok: seo.mobileOptimized },
                    { label: 'Canonical', ok: !!seo.canonical },
                  ].map(i => (
                    <div key={i.label} className="text-center">
                      <div className={`text-lg ${i.ok ? 'text-green-400' : 'text-red-500'}`}>{i.ok ? '✓' : '✗'}</div>
                      <div className="text-xs text-[var(--text-muted)]">{i.label}</div>
                    </div>
                  ))}
                  <div className="text-center">
                    <div className="text-lg text-[var(--text-muted)]">—</div>
                    <div className="text-xs text-[var(--text-muted)]">OG Image</div>
                    <div className="text-[10px] text-[var(--text-muted)] opacity-60">optional</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Word Count', value: seo.content?.wordCount || 0 },
                  { label: 'Internal Links', value: seo.links?.internal || 0 },
                  { label: 'External Links', value: seo.links?.external || 0 },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-3 text-center">
                    <p className="text-2xl font-mono font-bold">{s.value}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                  </div>
                ))}
              </div>

              {seo.images && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Images</h3>
                    <div className="flex gap-3 text-sm">
                      <span>{seo.images.total} total</span>
                      <span className="text-green-400">{seo.images.withAlt} with alt</span>
                      {seo.images.withoutAlt > 0 && <span className="text-amber-400">{seo.images.withoutAlt} missing alt</span>}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(seo.images.withAlt / Math.max(1, seo.images.total)) * 100}%` }} />
                  </div>
                </div>
              )}

              {seo.headings?.h1?.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Headings</h3>
                  <div className="space-y-1.5">
                    {seo.headings.h1?.slice(0,2).map((h: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-teal-400 font-mono text-xs w-6 mt-0.5 shrink-0">H1</span><span className="text-gray-200">{h}</span></div>
                    ))}
                    {seo.headings.h2?.slice(0,3).map((h: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-blue-400 font-mono text-xs w-6 mt-0.5 shrink-0">H2</span><span className="text-[var(--text-secondary)]">{h}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {seo.issues?.length > 0 && (
                  <div className="bg-[var(--bg-card)] border border-amber-900/40 rounded-lg p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">Issues</h3>
                    <ul className="space-y-1.5">
                      {seo.issues.map((i: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-300 flex gap-1.5"><span className="text-amber-400 shrink-0 mt-0.5">⚠</span>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {seo.strengths?.length > 0 && (
                  <div className="bg-[var(--bg-card)] border border-green-900/40 rounded-lg p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Strengths</h3>
                    <ul className="space-y-1.5">
                      {seo.strengths.map((s: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-300 flex gap-1.5"><span className="text-green-400 shrink-0 mt-0.5">✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GEO tab */}
          {tab === 'geo' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {geo.breakdown && Object.entries(geo.breakdown).map(([key, val]: [string, any]) => {
                    const pct = (val.score / val.max) * 100;
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const col = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--text-secondary)]">{label}</span>
                          <span className="font-mono" style={{ color: col }}>{val.score}/{val.max}</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {geo.signals && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">AI Visibility Signals</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Schema Types', value: geo.schemas?.join(', ') || 'None detected' },
                      { label: 'Rich Headings', value: geo.signals.richHeadings ? 'Present' : 'Missing' },
                      { label: 'Citations/Sources', value: geo.signals.hasCitations ? 'Present' : 'Missing' },
                      { label: 'Word Count', value: `${geo.wordCount || 0} words` },
                    ].map(s => (
                      <div key={s.label} className="bg-[var(--bg-secondary)] rounded-lg p-3">
                        <p className="text-xs text-[var(--text-muted)] mb-0.5">{s.label}</p>
                        <p className="text-sm font-medium">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {geo.recommendations?.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-teal-900/40 rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">Recommendations to Improve AI Visibility</h3>
                  <ul className="space-y-2">
                    {geo.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-teal-400 shrink-0 mt-0.5">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AEO tab */}
          {tab === 'aeo' && (
            <div className="space-y-4">
              {!aeo && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-6 text-center">
                  <p className="text-[var(--text-secondary)] text-sm">AEO data unavailable for this analysis.</p>
                </div>
              )}
              {aeo && (
                <>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4 flex items-center gap-5">
                    <ScoreRing score={aeo.aeoScore} color={aeoColor(aeo.grade)} size={84} />
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Answer Engine Optimization</p>
                      <p className="text-2xl font-bold" style={{ color: aeoColor(aeo.grade) }}>Grade {aeo.grade}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{aeo.grading}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Score Breakdown</h3>
                    <div className="space-y-3">
                      {aeo.breakdown && Object.entries(aeo.breakdown).map(([key, val]: [string, any]) => {
                        const pct = (val.score / val.max) * 100;
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                        const col = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--text-secondary)]">{label}</span>
                              <span className="font-mono" style={{ color: col }}>{val.score}/{val.max}</span>
                            </div>
                            <div className="bg-gray-800 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {aeo.recommendations?.length > 0 && (
                    <div className="bg-[var(--bg-card)] border border-teal-900/40 rounded-lg p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">Recommendations to Improve AEO</h3>
                      <ul className="space-y-2">
                        {aeo.recommendations.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className="text-teal-400 shrink-0 mt-0.5">→</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Agency AEO Breakdown */}
          {tab === 'aeo' && aeo && userTier === 'agency' && aeo.breakdown && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Agency Deep-Dive — Score Breakdown</p>
              {aeo.breakdown && (Object.entries(aeo.breakdown) as [string, number][]).map(([key, score]) => {
                const info: Record<string, {title:string;what:string;why:string;fix:string;impact:string}> = {
                  directAnswerBlocks:{title:"Direct Answer Blocks",what:"How well your content directly answers questions AI engines look for — clear Q&A patterns, definitions, answer-first formatting.",why:"AI engines like ChatGPT and Perplexity pull from pages that answer questions clearly. Buried answers get skipped entirely.",fix:"Add an FAQ section. Start paragraphs with the answer first. Use definition sentences. Target question-based keywords.",impact:"Sites that answer directly get cited in AI Overviews 3-5x more often — free visibility to users who never click a link."},
                  qaStructure:{title:"Q&A Structure",what:"Whether your content uses explicit Q&A formatting — FAQ sections, question-based headings with immediate answers below.",why:"Google PAA boxes, featured snippets, and AI engines all harvest Q&A content. Without structure, your expertise is invisible.",fix:"Add FAQ sections to every key page. Use H2/H3 headings as questions. Add FAQ JSON-LD schema. Keep answers under 50 words.",impact:"FAQ schema unlocks People Also Ask boxes — appearing on 43% of all Google searches at zero extra cost."},
                  featuredSnippetFormats:{title:"Featured Snippet Formats",what:"How well your content uses numbered lists, bullets, tables, and concise paragraphs — formats Google pulls into the answer box.",why:"Featured snippets get 35-40% of all clicks on a results page and directly feed AI answer engines as source material.",fix:"Use numbered lists for steps. Bullets for comparisons. Add definition sentences. Keep list items under 8 words.",impact:"Winning one featured snippet for a high-volume keyword can double organic traffic overnight and gets content cited by AI automatically."},
                  voiceSearchReadiness:{title:"Voice Search Readiness",what:"How well your content answers the conversational, long-tail questions people ask Siri, Google Assistant, and Alexa.",why:"30% of searches are voice queries. Voice assistants read ONE answer aloud — if you are not optimized, you are never mentioned.",fix:"Write at Grade 8-9 reading level. Target long-tail question keywords. Include local details. Add speakable schema markup.",impact:"Voice search dominates near-me and local queries — being the one answer a customer hears when searching for nearby services."},
                  contentStructure:{title:"Content Structure",what:"The overall organization of your page — heading hierarchy, logical flow, and how well it guides AI through the information.",why:"AI engines parse top-to-bottom. Poor structure means they cannot identify what is important — good structure means more citations.",fix:"One H1 per page. H2 for main sections, H3 for subsections. Paragraphs under 3 sentences. Put key content first.",impact:"Well-structured pages rank higher in traditional SEO AND get cited more in AI responses — a compounding double win."}
                };
                const d = info[key]; if (!d) return null;
                const pct = Math.round((score / 20) * 100);
                const col = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <details key={key} className="border border-[var(--border-primary)] rounded-xl overflow-hidden group">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors list-none">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{background:col}}/>
                        <span className="text-sm font-medium">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{width:`${pct}%`,background:col}}/>
                        </div>
                        <span className="text-xs font-mono font-bold" style={{color:col}}>{score}/20</span>
                        <svg className="w-4 h-4 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </summary>
                    <div className="border-t border-[var(--border-primary)] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[var(--bg-secondary)]">
                      <div><p className="text-xs font-semibold text-teal-400 uppercase mb-1">What it measures</p><p className="text-xs text-[var(--text-muted)]">{d.what}</p></div>
                      <div><p className="text-xs font-semibold text-yellow-400 uppercase mb-1">Why it matters</p><p className="text-xs text-[var(--text-muted)]">{d.why}</p></div>
                      <div><p className="text-xs font-semibold text-blue-400 uppercase mb-1">How to fix it</p><p className="text-xs text-[var(--text-muted)]">{d.fix}</p></div>
                      <div><p className="text-xs font-semibold text-green-400 uppercase mb-1">Business impact</p><p className="text-xs text-[var(--text-muted)]">{d.impact}</p></div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          {/* Keywords tab */}
          {tab === 'keywords' && kw && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Top Keywords <span className="text-gray-600 normal-case font-normal">— {kw.totalWords} words indexed</span>
              </h3>
              <div className="space-y-2.5">
                {kw.topKeywords?.slice(0, 15).map((k: any) => (
                  <div key={k.word} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-28 text-gray-300 truncate">{k.word}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, k.density * 12)}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] w-20 text-right">{k.count}× ({k.density}%)</span>
                    <div className="flex gap-1 w-16 justify-end">
                      {k.inTitle && <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">T</span>}
                      {k.inH1 && <span className="text-xs bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded">H1</span>}
                      {k.inMeta && <span className="text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">M</span>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">T = in title · H1 = in heading · M = in meta description</p>
            </div>
          )}

          {/* AI Recs tab */}
          
          {/* ─── SOCIAL TAB ─── */}
          {tab === 'social' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Social Media Presence</h3>
              {!social && !socialLoading && (
                <p className="text-[var(--text-muted)] text-sm">Social media analysis runs automatically with the main analysis.</p>
              )}
              {socialLoading && (
                <div className="flex items-center gap-3 py-8 justify-center text-[var(--text-secondary)] text-sm">
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Analyzing social presence...
                </div>
              )}
              {socialError && <p className="text-red-500 dark:text-red-400 text-sm">{socialError}</p>}
              {social && (
                <div className="space-y-4">
                  {/* Overall score */}
                  <div className="flex items-center gap-4 mb-4">
                    <ScoreRing score={social.overallScore} color={social.overallScore >= 70 ? '#10b981' : social.overallScore >= 40 ? '#f59e0b' : '#ef4444'} size={72} />
                    <div>
                      <p className="text-lg font-bold">Grade {social.grade}</p>
                      <p className="text-xs text-[var(--text-muted)]">{social.linksFound}/{social.totalPlatforms} platforms detected</p>
                    </div>
                  </div>
                  
                  {/* Platform grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {social.platforms && Object.entries(social.platforms).map(([platform, data]: [string, any]) => (
                      <div key={platform} className={`border rounded-lg p-3 ${data.found ? 'border-teal-800 bg-teal-950/20' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{platform === 'twitter' ? 'X (Twitter)' : platform}</span>
                          <span className={`text-xs font-mono ${data.score >= 60 ? 'text-green-400' : data.score >= 30 ? 'text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>{data.score}/100</span>
                        </div>
                        <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-1">
                          <div className={`h-1 rounded-full ${data.score >= 60 ? 'bg-green-500' : data.score >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${data.score}%`}} />
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{data.notes}</p>
                        {data.url && <a href={data.url} target="_blank" rel="noopener" className="text-xs text-teal-400 hover:underline mt-1 block truncate">{data.url}</a>}
                      </div>
                    ))}
                  </div>

                  {/* Social Meta Tags */}
                  {social.socialMetaTags && (
                    <div className="border border-[var(--border-primary)] rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Social Meta Tags</p>
                      <div className="flex gap-3">
                        <span className={`text-xs px-2 py-1 rounded ${social.socialMetaTags.openGraph ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-500 dark:text-red-400'}`}>OG Tags {social.socialMetaTags.openGraph ? '\u2713' : '\u2717'}</span>
                        <span className={`text-xs px-2 py-1 rounded ${social.socialMetaTags.twitterCards ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-500 dark:text-red-400'}`}>Twitter Cards {social.socialMetaTags.twitterCards ? '\u2713' : '\u2717'}</span>
                        <span className={`text-xs px-2 py-1 rounded ${social.socialMetaTags.schemaOrg ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-500 dark:text-red-400'}`}>Schema.org {social.socialMetaTags.schemaOrg ? '\u2713' : '\u2717'}</span>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {social.recommendations && social.recommendations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Recommendations</p>
                      <div className="space-y-2">
                        {social.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="border border-[var(--border-primary)] rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${rec.priority === 'high' ? 'bg-red-950 text-red-500 dark:text-red-400' : rec.priority === 'medium' ? 'bg-yellow-950 text-yellow-400' : 'bg-green-950 text-green-400'}`}>{rec.priority}</span>
                              <span className="text-xs font-medium capitalize">{rec.platform}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">{rec.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {social.summary && (
                    <p className="text-xs text-[var(--text-muted)] mt-3 italic">{social.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── COMPETITORS TAB ─── */}
          {tab === 'competitors' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Competitor Analysis</h3>
              {!competitors && !competitorsLoading && !competitorsError && (
                <div className="text-center py-8">
                  <p className="text-[var(--text-muted)] text-sm mb-3">Competitor analysis takes 30-60 seconds — scores each rival across SEO, GEO & AEO.</p>
                  <button
                    onClick={() => {
                      setCompetitorsLoading(true);
                      setCompetitorsError(null);
                      fetch(`${API_BASE}/competitors/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url: seo?.url || url, seo, geo, aeo }),
                      }).then(async r => {
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.error || 'Analysis failed');
                        setCompetitors(d);
                        setCompetitorsLoading(false);
                      }).catch(e => { setCompetitorsError(e.message); setCompetitorsLoading(false); });
                    }}
                    className="bg-teal-600 hover:bg-teal-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Run Competitor Analysis
                  </button>
                </div>
              )}
              {competitorsLoading && (
                <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-secondary)] text-sm">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p>Analyzing competitors... This may take 30-60 seconds.</p>
                  <p className="text-xs text-[var(--text-muted)]">Scoring each competitor across SEO, GEO, and AEO</p>
                </div>
              )}
              {competitorsError && <p className="text-red-500 dark:text-red-400 text-sm">{competitorsError}</p>}
              {competitors && (
                <div className="space-y-4">
                  {/* Business info */}
                  {competitors.business && (
                    <div className="border border-[var(--border-primary)] rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">{competitors.business.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{competitors.business.industry} &mdash; {competitors.business.location}</p>
                    </div>
                  )}

                  {/* Score comparison table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-primary)]">
                          <th className="text-left py-2 text-[var(--text-muted)] font-medium">Business</th>
                          <th className="text-center py-2 text-[var(--text-muted)] font-medium">SEO</th>
                          <th className="text-center py-2 text-[var(--text-muted)] font-medium">GEO</th>
                          <th className="text-center py-2 text-[var(--text-muted)] font-medium">AEO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Your scores */}
                        <tr className="border-b border-[var(--border-primary)] bg-teal-950/20">
                          <td className="py-2 font-medium text-teal-400">You ({seo?.url?.replace(/https?:\/\//, '').split('/')[0]})</td>
                          <td className="text-center py-2"><span className={`font-mono ${(competitors.yourScores?.seo || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>{competitors.yourScores?.seo || 0}</span></td>
                          <td className="text-center py-2"><span className={`font-mono ${(competitors.yourScores?.geo || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>{competitors.yourScores?.geo || 0}</span></td>
                          <td className="text-center py-2"><span className={`font-mono ${(competitors.yourScores?.aeo || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>{competitors.yourScores?.aeo || 0}</span></td>
                        </tr>
                        {/* Competitors */}
                        {competitors.competitors?.map((c: any, i: number) => (
                          <tr key={i} className="border-b border-[var(--border-primary)]">
                            <td className="py-2">
                              <p className="font-medium">{c.name}</p>
                              <a href={c.url} target="_blank" rel="noopener" className="text-teal-400 hover:underline truncate block max-w-[200px]">{c.url?.replace(/https?:\/\//, '')}</a>
                            </td>
                            <td className="text-center py-2"><span className={`font-mono ${(c.seo?.score || 0) > (competitors.yourScores?.seo || 0) ? 'text-red-500 dark:text-red-400' : 'text-green-400'}`}>{c.seo?.score ?? 'N/A'}</span></td>
                            <td className="text-center py-2"><span className={`font-mono ${(c.geo?.score || 0) > (competitors.yourScores?.geo || 0) ? 'text-red-500 dark:text-red-400' : 'text-green-400'}`}>{c.geo?.score ?? 'N/A'}</span></td>
                            <td className="text-center py-2"><span className={`font-mono ${(c.aeo?.score || 0) > (competitors.yourScores?.aeo || 0) ? 'text-red-500 dark:text-red-400' : 'text-green-400'}`}>{c.aeo?.score ?? 'N/A'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SWOT Insights */}
                  {competitors.insights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div className="border border-green-800 rounded-lg p-3 bg-green-950/20">
                        <p className="text-xs font-semibold text-green-400 uppercase mb-2">Strengths</p>
                        <ul className="space-y-1">{competitors.insights.strengths?.map((s: string, i: number) => <li key={i} className="text-xs text-[var(--text-muted)]">{s}</li>)}</ul>
                      </div>
                      <div className="border border-red-800 rounded-lg p-3 bg-red-950/20">
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase mb-2">Weaknesses</p>
                        <ul className="space-y-1">{competitors.insights.weaknesses?.map((s: string, i: number) => <li key={i} className="text-xs text-[var(--text-muted)]">{s}</li>)}</ul>
                      </div>
                      <div className="border border-blue-800 rounded-lg p-3 bg-blue-950/20">
                        <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Opportunities</p>
                        <ul className="space-y-1">{competitors.insights.opportunities?.map((s: string, i: number) => <li key={i} className="text-xs text-[var(--text-muted)]">{s}</li>)}</ul>
                      </div>
                      <div className="border border-orange-800 rounded-lg p-3 bg-orange-950/20">
                        <p className="text-xs font-semibold text-orange-400 uppercase mb-2">Threats</p>
                        <ul className="space-y-1">{competitors.insights.threats?.map((s: string, i: number) => <li key={i} className="text-xs text-[var(--text-muted)]">{s}</li>)}</ul>
                      </div>
                    </div>
                  )}

                  {competitors.insights?.summary && (
                    <p className="text-xs text-[var(--text-muted)] mt-3 italic">{competitors.insights.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'airecs' && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
              {aiRecsLoading && (
                <div className="flex items-center gap-3 py-10 justify-center text-[var(--text-secondary)] text-sm">
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Grok is analyzing your site...
                </div>
              )}
              {aiRecsUpgrade && (
                <div className="text-center py-10">
                  <p className="text-yellow-400 font-semibold mb-2">Starter Plan Required</p>
                  <p className="text-[var(--text-secondary)] text-sm mb-4">Upgrade to Starter plan for AI recommendations</p>
                  <a href="https://analysis.seoh.ca" className="bg-teal-600 hover:bg-teal-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors">Upgrade Now</a>
                </div>
              )}
              {aiRecsError && (
                <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-3 py-2">{aiRecsError}</p>
              )}
              {aiRecs && aiRecs.recommendations && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Grok AI Recommendations <span className="text-gray-600 normal-case font-normal">— {aiRecs.model}</span>
                  </h3>
                  {aiRecs.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="border border-[var(--border-secondary)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{rec.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${rec.impact === 'high' ? 'bg-red-900/50 text-red-500 dark:text-red-400' : rec.impact === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>
                          {rec.impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{rec.recommendation}</p>
                      {rec.why_it_matters && (
                        <p className="text-xs text-teal-400 border-t border-[var(--border-secondary)] pt-2 mt-2">
                          <span className="font-semibold">Why it matters: </span>{rec.why_it_matters}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ─── Password Reset Form ──────────────────────────────────────────────────────
function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length < 8) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  let score = 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "w-1/2" };
  return { label: "Strong", color: "bg-green-500", width: "w-full" };
}

function PasswordResetForm({ email, token, onSuccess }: { email: string; token: string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = password ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, new_password: password }),
      });
      const data = await r.json();
      if (r.ok) {
        setSuccess(true);
        setTimeout(() => onSuccess(), 2000);
      } else {
        setError(data.message || data.error || "Failed to reset password. Token may be expired.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">SEOh! Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Set New Password</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 space-y-4">
          {success ? (
            <div className="text-center py-4">
              <div className="text-green-400 text-4xl mb-3">✓</div>
              <p className="text-green-400 font-semibold text-sm">Password set!</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-3 py-2">{error}</p>
              )}
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500"
                />
                {strength && (
                  <div className="mt-2">
                    <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div className={`h-1 rounded-full transition-all ${strength.color} ${strength.width}`} />
                    </div>
                    <p className={`text-xs mt-1 ${strength.label === "Strong" ? "text-green-400" : strength.label === "Fair" ? "text-yellow-400" : "text-red-500 dark:text-red-400"}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg py-2.5 font-medium transition-colors text-sm"
              >
                {loading ? "Setting password…" : "Set Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<any>(null);
  const [copied, setCopied] = useState('');
  const [section, setSection] = useState<'analyze'|'keys'|'plans'|'features'>('analyze');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  // Theme
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('seoh-theme');
    if (saved === 'light') { setIsLight(true); document.body.classList.add('light'); }
  }, []);
  const toggleTheme = () => {
    setIsLight(prev => {
      const next = !prev;
      if (next) { document.body.classList.add('light'); localStorage.setItem('seoh-theme', 'light'); }
      else { document.body.classList.remove('light'); localStorage.setItem('seoh-theme', 'dark'); }
      return next;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_token');
    if (saved) { setToken(saved); fetchAccount(saved); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('token');
    const em = params.get('email');
    if (tok && em) {
      setShowPasswordReset(true);
      setResetToken(tok);
      setResetEmail(em);
    }
  }, []);

  const fetchAccount = async (t: string) => {
    const r = await fetch(`${API_BASE}/account/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) setAccount(await r.json());
    else { localStorage.removeItem('dashboard_token'); setToken(null); }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    });
    const data = await r.json();
    if (r.ok && data.token) {
      localStorage.setItem('dashboard_token', data.token);
      setToken(data.token); fetchAccount(data.token);
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
    navigator.clipboard.writeText(text); setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleUpgrade = async (tier: string) => {
    const r = await fetch(`${API_BASE}/billing/checkout/${tier}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank');
    else alert(data.message || 'Contact us at seoh.ca/contact to upgrade');
  };

  if (showPasswordReset) return (
    <PasswordResetForm
      email={resetEmail}
      token={resetToken}
      onSuccess={() => {
        setShowPasswordReset(false);
        setResetToken('');
        setResetEmail('');
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    />
  );

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">SEOh! Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Agency Dashboard</p>
          <button onClick={toggleTheme} className="mt-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors" title={isLight ? 'Dark mode' : 'Light mode'}>
            {isLight ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
        </div>
        <form onSubmit={login} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 space-y-4">
          {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Email</label>
            <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Password</label>
            <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 rounded-lg py-2.5 font-medium transition-colors">Sign In</button>
          <p className="text-center text-xs text-[var(--text-muted)]">Don&apos;t have an account? <a href="https://seoh.ca/contact" target="_blank" className="text-teal-400">Contact us</a></p>
        </form>
      </div>
    </div>
  );

  const { agency, keys, tierFeatures } = account || {};
  const tierColors: Record<string, string> = { free: 'gray', starter: 'blue', pro: 'purple', agency: 'teal' };
  const tierColor2 = tierColors[agency?.tier] || 'gray';

  // Get first active API key prefix for curl examples
  const firstKey = keys?.find((k: any) => k.active);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">SEOh! Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm">{agency?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${tierColor2}-950 text-${tierColor2}-400 border border-${tierColor2}-800 uppercase`}>
            {agency?.tier}
          </span>
          <button onClick={toggleTheme} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors" title={isLight ? 'Dark mode' : 'Light mode'}>
            {isLight ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          <button onClick={() => { localStorage.removeItem('dashboard_token'); setToken(null); setAccount(null); }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">Sign out</button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1">
        {([
          ['analyze', 'Analyze'],
          ['keys', 'API Keys'],
          ['features', 'All Features'],
          ['plans', 'Plans'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${section === id ? 'bg-teal-600 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Usage KPIs */}
      {keys && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Active Keys', value: keys.filter((k: any) => k.active).length },
            { label: 'Used This Month', value: keys.reduce((s: number, k: any) => s + (k.usage_this_month || 0), 0) },
            { label: 'Monthly Limit', value: keys.reduce((s: number, k: any) => s + (k.monthly_limit || 0), 0) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-2xl font-mono font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {section === 'analyze' && <AnalyzeSection token={token} userTier={agency?.tier || "free"} />}

      {section === 'features' && (
        <FeaturesSection
          token={token}
          userTier={agency?.tier || 'free'}
          apiKey={firstKey?.key_prefix}
        />
      )}

      {section === 'keys' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">API Keys</h2>
          {newKeyResult && (
            <div className="bg-green-950 border border-green-800 rounded-lg p-4 mb-4">
              <p className="text-green-400 text-sm font-semibold mb-2">Key generated — save it now, it won&apos;t be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black rounded px-3 py-2 text-sm font-mono text-green-300 break-all">{newKeyResult.raw_key}</code>
                <button onClick={() => copy(newKeyResult.raw_key, 'new')} className="bg-green-800 hover:bg-green-700 px-3 py-2 rounded text-xs">
                  {copied === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3 mb-4">
            {keys?.filter((k: any) => k.active).map((key: any) => (
              <div key={key.id} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{key.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">{key.usage_this_month}/{key.monthly_limit} used</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[var(--text-secondary)] flex-1">{key.key_prefix}••••••••••••••••</code>
                  <span className="text-xs text-gray-600">Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="mt-2 bg-gray-800 rounded-full h-1">
                  <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${Math.min(100, (key.usage_this_month / key.monthly_limit) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="Key label (e.g. Production)"
              className="flex-1 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            <button onClick={generateKey} className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Generate Key
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Quick Start</h3>
            {[
              { label: 'SEO Crawl', code: `curl -X POST https://analysis.seoh.ca/api/crawl/analyze \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
              { label: 'GEO Score', code: `curl -X POST https://analysis.seoh.ca/api/geo/score \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
              { label: 'AEO Score', code: `curl -X POST https://analysis.seoh.ca/api/aeo/score \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
            ].map(ex => (
              <div key={ex.label} className="mb-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{ex.label}</p>
                <div className="relative">
                  <pre className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto">{ex.code}</pre>
                  <button onClick={() => copy(ex.code, ex.label)} className="absolute top-2 right-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {copied === ex.label ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'plans' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Your Plan — {agency?.tier?.toUpperCase()}</h2>
          {tierFeatures && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {Object.entries(tierFeatures).map(([feature, enabled]) => (
                <div key={feature} className={`flex items-center gap-2 text-sm ${enabled ? 'text-[var(--text-primary)]' : 'text-gray-600'}`}>
                  <span>{enabled ? '✓' : '✗'}</span>
                  <span className="capitalize">{feature.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { tier: 'free', price: '$0', analyses: '50', features: ['SEO crawl', 'GEO score', 'Performance', 'Basic AEO snapshot'] },
              { tier: 'starter', price: '$59.99', analyses: '500', features: ['Everything in Free', 'Full AEO scoring', 'PDF reports', 'AI recommendations', 'Competitor compare'] },
              { tier: 'pro', price: '$109.99', analyses: '2,000', features: ['Everything in Starter', 'Bulk analysis (50 URLs)', 'Site monitoring', 'AEO performance tracking'] },
              { tier: 'agency', price: '$399.99', analyses: '10,000', features: ['Everything in Pro', 'Full site crawl', 'White-label reports', 'Priority support'] },
            ].map(p => (
              <PricingCard key={p.tier} {...p} currentTier={agency?.tier || 'free'} onUpgrade={() => handleUpgrade(p.tier)} />
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4 text-center">
            Manage your subscription → <a href="#" onClick={async (e) => { e.preventDefault(); const r = await fetch(`${API_BASE}/billing/portal`, { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (d.portalUrl) window.open(d.portalUrl, '_blank'); }} className="text-teal-400 hover:underline">Customer Portal</a>
          </p>
        </div>
      )}
    </div>
  );
}
